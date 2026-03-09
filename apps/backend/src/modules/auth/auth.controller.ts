import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import bcrypt from 'bcryptjs';
import { registerSchema, loginSchema } from './auth.schema';

export function createAuthController(fastify: FastifyInstance) {
  return {
    async register(request: FastifyRequest, reply: FastifyReply) {
      const result = registerSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({
          error: { message: result.error.errors[0].message, code: 'VALIDATION_ERROR' },
        });
      }

      const { email, password } = result.data;

      const existing = await fastify.prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(409).send({
          error: { message: 'An account with this email already exists', code: 'EMAIL_TAKEN' },
        });
      }

      const hashed = await bcrypt.hash(password, 10);

      const user = await fastify.prisma.user.create({
        data: { email, password: hashed },
        select: { id: true, email: true, createdAt: true },
      });

      const token = fastify.jwt.sign(
        { sub: user.id, email: user.email },
        { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' },
      );

      return reply.code(201).send({
        token,
        user: { ...user, createdAt: user.createdAt.toISOString() },
      });
    },

    async login(request: FastifyRequest, reply: FastifyReply) {
      const result = loginSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({
          error: { message: result.error.errors[0].message, code: 'VALIDATION_ERROR' },
        });
      }

      const { email, password } = result.data;

      const user = await fastify.prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(401).send({
          error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
        });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return reply.code(401).send({
          error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
        });
      }

      const token = fastify.jwt.sign(
        { sub: user.id, email: user.email },
        { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' },
      );

      return reply.code(200).send({
        token,
        user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
      });
    },
  };
}
