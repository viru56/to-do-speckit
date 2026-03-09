import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import prismaPlugin from './plugins/prisma';
import jwtPlugin from './plugins/jwt';
import authRoutes from './modules/auth/auth.routes';
import todoRoutes from './modules/todos/todo.routes';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
  });

  // CORS
  await fastify.register(cors, {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Plugins
  await fastify.register(prismaPlugin);
  await fastify.register(jwtPlugin);

  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (_err) {
      return reply.code(503).send({ status: 'error', message: 'Database connection unavailable' });
    }
  });

  // Routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(todoRoutes, { prefix: '/api/todos' });

  // Global error handler
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    fastify.log.error(error);

    if (error.statusCode === 401) {
      const isExpired = typeof error.message === 'string' && error.message.includes('expired');
      return reply.code(401).send({
        error: {
          message: error.message || 'Authentication required',
          code: isExpired ? 'EXPIRED_TOKEN' : 'UNAUTHORIZED',
        },
      });
    }

    const statusCode = error.statusCode ?? 500;
    return reply.code(statusCode).send({
      error: {
        message: statusCode === 500 ? 'Internal server error' : error.message,
        code: statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR',
      },
    });
  });

  return fastify;
}
