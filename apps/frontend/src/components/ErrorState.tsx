interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="state-container state-container--centered" role="alert">
      <span className="error-state__icon" aria-hidden="true">⚠️</span>
      <p className="error-state__message">{message}</p>
      {onRetry && (
        <button className="btn btn--secondary btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
