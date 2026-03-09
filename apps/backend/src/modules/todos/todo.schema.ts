import { z } from 'zod';

export const createTodoSchema = z.object({
  text: z
    .string({ required_error: 'Todo text is required' })
    .trim()
    .min(1, 'Todo text is required')
    .max(500, 'Todo text must be 500 characters or fewer'),
});

export const updateTodoSchema = z.object({
  completed: z.boolean({ required_error: 'Completed must be a boolean value' }),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
