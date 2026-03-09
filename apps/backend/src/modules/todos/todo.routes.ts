import { FastifyPluginAsync } from 'fastify';
import { createTodoController } from './todo.controller';

const todoRoutes: FastifyPluginAsync = async (fastify) => {
  const controller = createTodoController(fastify);

  fastify.get(
    '/',
    { onRequest: [fastify.authenticate] },
    controller.getAll.bind(controller),
  );

  fastify.post(
    '/',
    { onRequest: [fastify.authenticate] },
    controller.create.bind(controller),
  );

  fastify.patch(
    '/:id',
    { onRequest: [fastify.authenticate] },
    controller.update.bind(controller),
  );

  fastify.delete(
    '/:id',
    { onRequest: [fastify.authenticate] },
    controller.remove.bind(controller),
  );
};

export default todoRoutes;
