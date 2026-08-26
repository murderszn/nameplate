import { NavLink, Outlet, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/properties', label: 'Properties' },
  { to: '/assets', label: 'Assets' },
  { to: '/work-orders', label: 'Work Orders' },
];

const TITLES: Record<string, string> = {
  '/': 'Portfolio Dashboard',
  '/properties': 'Properties',
  '/assets': 'Asset Registry',
  '/work-orders': 'Work Orders',
};

/**
 * Nameplate HQ shell — sidebar nav + top bar + routed page content.
 * Route set matches v0-scope.md §1.2 (a subset for this V0 scaffold);
 * additional routes (turns, parts, reports, shrinkage, settings, audit
 * log) hang off the same shell as they're built out.
 */
export function Layout() {
  const location = useLocation();
  const title = TITLES[location.pathname] ?? 'Nameplate HQ';

  return (
    <div className="np-app-shell">
      <aside className="np-sidebar">
        <div className="np-sidebar__brand">
          <span className="np-sidebar__brand-mark" aria-hidden />
          Nameplate HQ
        </div>
        <nav className="np-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="np-sidebar__footer">
          Nameplate Systems, Inc.
          <br />
          V0 scaffold
        </div>
      </aside>

      <div className="np-main">
        <header className="np-topbar">
          <span className="np-topbar__title">{title}</span>
          <span className="np-badge np-badge--info">Demo Portfolio</span>
        </header>
        <main className="np-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
