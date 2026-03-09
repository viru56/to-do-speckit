import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createTodoSchema, updateTodoSchema } from './todo.schema';

export function createTodoController(fastify: FastifyInstance) {
  return {
    // GET /api/todos — US1
    async getAll(request: FastifyRequest, reply: FastifyReply) {
      const userId = request.user.sub;

      const todos = await fastify.prisma.todo.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(
        todos.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
      );
    },

    // POST /api/todos — US2
    async create(request: FastifyRequest, reply: FastifyReply) {
      const result = createTodoSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({
          error: { message: result.error.errors[0].message, code: 'VALIDATION_ERROR' },
        });
      }

      const { text } = result.data;
      const userId = request.user.sub;

      const todo = await fastify.prisma.todo.create({
        data: { text, userId },
      });

      return reply.code(201).send({
        ...todo,
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString(),
      });
    },

    // PATCH /api/todos/:id — US3
    async update(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };
      const result = updateTodoSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({
          error: { message: result.error.errors[0].message, code: 'VALIDATION_ERROR' },
        });
      }

      const { completed } = result.data;
      const userId = request.user.sub;

      const updated = await fastify.prisma.todo.updateMany({
        where: { id, userId },
        data: { completed },
      });

      if (updated.count === 0) {
        return reply.code(404).send({
          error: { message: 'Todo not found', code: 'NOT_FOUND' },
        });
      }

      const todo = await fastify.prisma.todo.findUnique({ where: { id } });
      return reply.send({
        ...todo,
        createdAt: todo!.createdAt.toISOString(),
        updatedAt: todo!.updatedAt.toISOString(),
      });
    },

    // DELETE /api/todos/:id — US4
    async remove(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };
      const userId = request.user.sub;

      const deleted = await fastify.prisma.todo.deleteMany({
        where: { id, userId },
      });

      if (deleted.count === 0) {
        return reply.code(404).send({
          error: { message: 'Todo not found', code: 'NOT_FOUND' },
        });
      }

      return reply.code(204).send();
    },
  };
}
