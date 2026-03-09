import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { TodoForm } from '../components/TodoForm';
import { TodoList } from '../components/TodoList';
import { useTodoStore } from '../store/todo.store';

export const Route = createFileRoute('/')({
  component: TodoPage,
});

function TodoPage() {
  const fetchTodos = useTodoStore((s) => s.fetchTodos);
  const error = useTodoStore((s) => s.error);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  return (
    <div className="page-container">
      <h1 className="page-title">My Todos</h1>

      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}

      <TodoForm />
      <TodoList />
    </div>
  );
}
