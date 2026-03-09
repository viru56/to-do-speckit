export function LoadingState() {
  return (
    <div className="state-container" aria-label="Loading todos" aria-live="polite">
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-item" aria-hidden="true" />
      ))}
    </div>
  );
}
