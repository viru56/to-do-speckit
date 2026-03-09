export function EmptyState() {
  return (
    <div className="state-container state-container--centered">
      <span className="empty-state__icon" aria-hidden="true">📋</span>
      <p className="empty-state__message">No todos yet</p>
      <p className="empty-state__hint">Add your first task above to get started</p>
    </div>
  );
}
