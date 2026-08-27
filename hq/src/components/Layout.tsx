import { NavLink, Outlet, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', index: '00' },
  { to: '/properties', label: 'Properties', index: '01' },
  { to: '/assets', label: 'Assets', index: '02' },
  { to: '/work-orders', label: 'Work Orders (Kanban)', index: '03' },
];

const PAGE: Record<string, { title: string; kicker: string }> = {
  '/': { title: 'Portfolio Dashboard', kicker: '00 / Portfolio' },
  '/properties': { title: 'Properties', kicker: '01 / Portfolio' },
  '/assets': { title: 'Asset Registry', kicker: '02 / Ledger' },
  '/work-orders': { title: 'CMMS Work Orders (Linear / Jira Kanban)', kicker: '03 / Field & Operations' },
};

export function Layout() {
  const location = useLocation();
  const page = location.pathname.includes('/units/')
    ? { title: 'Unit Record', kicker: '01 / Location' }
    : location.pathname.startsWith('/properties/')
      ? { title: 'Property Location', kicker: '01 / Location' }
      : location.pathname.startsWith('/assets/')
        ? { title: 'Asset Plate & Lineage', kicker: '02 / Ledger' }
        : (PAGE[location.pathname] ?? { title: 'Nameplate HQ', kicker: 'HQ' });

  return (
    <div className="np-app-shell">
      <aside className="np-sidebar">
        <div className="np-sidebar__brand">
          <span className="brand-dot" aria-hidden />
          <div>
            <div className="np-sidebar__wordmark">NAMEPLATE</div>
            <div className="np-sidebar__sub">HQ CONSOLE</div>
          </div>
        </div>
        <nav className="np-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <span className="np-nav__index">{item.index}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="np-sidebar__footer" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href="../"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#FF2A2A',
              fontSize: '0.82rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            ← Back to Marketing Site
          </a>
          <div>
            Nameplate Systems, Inc.<br />
            Full Interactive Demo
          </div>
        </div>
      </aside>

      <div className="np-main">
        <header className="np-topbar">
          <div>
            <div className="np-kicker">{page.kicker}</div>
            <h1 className="np-topbar__title">{page.title}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <a
              href="../"
              className="np-badge"
              style={{ textDecoration: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)' }}
            >
              ← Marketing Overview
            </a>
            <span className="np-badge np-badge--info">● Live Demo Mode</span>
          </div>
        </header>
        <main className="np-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
