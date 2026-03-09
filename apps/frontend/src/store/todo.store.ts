import { create } from 'zustand';
import type { Todo } from '@todo-app/types';
import { api } from '../services/api';

type Status = 'idle' | 'loading' | 'error';

interface TodoState {
  todos: Todo[];
  status: Status;
  error: string | null;
  fetchTodos: () => Promise<void>;
  addTodo: (text: string) => Promise<void>;
  toggleTodo: (id: string, completed: boolean) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>()((set, get) => ({
  todos: [],
  status: 'idle',
  error: null,

  async fetchTodos() {
    set({ status: 'loading', error: null });
    try {
      const todos = await api.get<Todo[]>('/todos');
      set({ todos, status: 'idle' });
    } catch (err) {
      set({ status: 'error', error: err instanceof Error ? err.message : 'Failed to load todos' });
    }
  },

  async addTodo(text) {
    const todo = await api.post<Todo>('/todos', { text });
    set((s) => ({ todos: [todo, ...s.todos] }));
  },

  async toggleTodo(id, completed) {
    const prev = get().todos;
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, completed } : t)),
    }));
    try {
      const updated = await api.patch<Todo>(`/todos/${id}`, { completed });
      set((s) => ({
        todos: s.todos.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (err) {
      set({ todos: prev, error: err instanceof Error ? err.message : 'Failed to update todo' });
    }
  },

  async deleteTodo(id) {
    const prev = get().todos;
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) }));
    try {
      await api.delete(`/todos/${id}`);
    } catch (err) {
      set({ todos: prev, error: err instanceof Error ? err.message : 'Failed to delete todo' });
    }
  },
}));
