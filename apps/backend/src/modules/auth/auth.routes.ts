import { FastifyPluginAsync } from 'fastify';
import { createAuthController } from './auth.controller';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const controller = createAuthController(fastify);

  fastify.post('/register', controller.register.bind(controller));
  fastify.post('/login', controller.login.bind(controller));
};

export default authRoutes;
