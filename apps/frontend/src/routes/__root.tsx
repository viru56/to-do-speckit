import { createRootRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '../store/auth.store';
import '../styles/index.css';

export const Route = createRootRoute({
  beforeLoad({ location }) {
    const { isAuthenticated, loadFromStorage } = useAuthStore.getState();
    loadFromStorage();

    const publicPaths = ['/login', '/register'];
    const isPublic = publicPaths.includes(location.pathname);

    if (!useAuthStore.getState().isAuthenticated && !isPublic) {
      throw redirect({ to: '/login' });
    }

    if (useAuthStore.getState().isAuthenticated && isPublic) {
      throw redirect({ to: '/' });
    }
  },
  component: RootLayout,
});

function RootLayout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate({ to: '/login' });
  }

  return (
    <div className="app-shell">
      {isAuthenticated && (
        <header className="app-header">
          <span className="app-header__brand">✓ Todos</span>
          <div className="app-header__user">
            <span className="app-header__email">{user?.email}</span>
            <button className="btn btn--ghost btn--sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>
      )}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
