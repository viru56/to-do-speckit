import { useTodoStore } from '../store/todo.store';
import { TodoItem } from './TodoItem';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

export function TodoList() {
  const todos = useTodoStore((s) => s.todos);
  const status = useTodoStore((s) => s.status);
  const error = useTodoStore((s) => s.error);
  const fetchTodos = useTodoStore((s) => s.fetchTodos);

  if (status === 'loading') return <LoadingState />;
  if (status === 'error') return <ErrorState message={error ?? 'Something went wrong'} onRetry={fetchTodos} />;
  if (todos.length === 0) return <EmptyState />;

  return (
    <ul className="todo-list" aria-label="Todo list">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
