import { useRef, useState } from 'react';
import { useTodoStore } from '../store/todo.store';

export function TodoForm() {
  const addTodo = useTodoStore((s) => s.addTodo);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = text.trim();
    if (!trimmed) {
      setError('Todo text is required');
      inputRef.current?.focus();
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await addTodo(trimmed);
      setText('');
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add todo');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="todo-form" onSubmit={handleSubmit} noValidate>
      <div className="todo-form__row">
        <input
          ref={inputRef}
          type="text"
          className={`form-input todo-form__input${error ? ' form-input--error' : ''}`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError('');
          }}
          placeholder="Add a new todo…"
          maxLength={500}
          disabled={submitting}
          aria-label="New todo text"
          aria-describedby={error ? 'todo-form-error' : undefined}
        />
        <button
          type="submit"
          className="btn btn--primary todo-form__submit"
          disabled={submitting}
          aria-label="Add todo"
        >
          {submitting ? '…' : 'Add'}
        </button>
      </div>
      {error && (
        <p id="todo-form-error" className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
