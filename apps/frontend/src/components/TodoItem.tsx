import { useState } from 'react';
import type { Todo } from '@todo-app/types';
import { useTodoStore } from '../store/todo.store';

interface TodoItemProps {
  todo: Todo;
}

export function TodoItem({ todo }: TodoItemProps) {
  const toggleTodo = useTodoStore((s) => s.toggleTodo);
  const deleteTodo = useTodoStore((s) => s.deleteTodo);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    try {
      await toggleTodo(todo.id, !todo.completed);
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteTodo(todo.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <li className={`todo-item${todo.completed ? ' todo-item--completed' : ''}`}>
      <button
        className="todo-item__toggle"
        onClick={handleToggle}
        disabled={toggling}
        aria-label={todo.completed ? 'Mark as active' : 'Mark as complete'}
        aria-pressed={todo.completed}
      >
        <span className="todo-item__checkbox" aria-hidden="true">
          {todo.completed ? '✓' : ''}
        </span>
      </button>

      <span className="todo-item__text">{todo.text}</span>

      <button
        className="todo-item__delete"
        onClick={handleDelete}
        disabled={deleting}
        aria-label="Delete todo"
      >
        {deleting ? '…' : '×'}
      </button>
    </li>
  );
}
