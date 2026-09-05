import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'np_sidebar_collapsed';
const THEME_STORAGE_KEY = 'nameplate-theme';
type Theme = 'light' | 'dark';

interface NavItem {
  to: string;
  label: string;
  index: string;
  icon: 'dashboard' | 'properties' | 'assets' | 'work-orders' | 'analytics' | 'sync' | 'users' | 'settings';
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', index: '00', icon: 'dashboard' },
  { to: '/properties', label: 'Properties', index: '01', icon: 'properties' },
  { to: '/assets', label: 'Asset Registry', index: '02', icon: 'assets' },
  { to: '/work-orders', label: 'Work Orders', index: '03', icon: 'work-orders' },
  { to: '/analytics', label: 'Fleet Analytics', index: '04', icon: 'analytics' },
  { to: '/sync', label: 'Sync & Tag Ops', index: '05', icon: 'sync' },
  { to: '/users', label: 'Users', index: '06', icon: 'users' },
  { to: '/settings', label: 'Settings', index: '07', icon: 'settings' },
];

function renderNavIcon(type: NavItem['icon']) {
  switch (type) {
    case 'dashboard':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      );
    case 'properties':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
          <path d="M10 6h4" />
          <path d="M10 10h4" />
          <path d="M10 14h4" />
          <path d="M10 18h4" />
        </svg>
      );
    case 'assets':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect width="16" height="16" x="4" y="4" rx="2" />
          <rect width="6" height="6" x="9" y="9" rx="1" />
          <path d="M15 2v2" />
          <path d="M15 20v2" />
          <path d="M2 15h2" />
          <path d="M2 9h2" />
          <path d="M20 15h2" />
          <path d="M20 9h2" />
          <path d="M9 2v2" />
          <path d="M9 20v2" />
        </svg>
      );
    case 'work-orders':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      );
    case 'analytics':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      );
    case 'sync':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
          <path d="m16 5 5 5-5 5" />
          <path d="M21 10H9" />
        </svg>
      );
    case 'users':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'settings':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#ffffff' : '#000000');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  // 1. Collapsed state saved to localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);
  };

  const focusSearch = () => {
    document.querySelector<HTMLInputElement>('.np-command-search input')?.focus();
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore storage errors
    }
  }, [collapsed]);

  // 2. Keyboard shortcut: Cmd+B, Ctrl+B, or '['
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);

      if ((e.key === 'b' || e.key === 'B') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      } else if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        focusSearch();
      } else if (e.key === 'Escape') {
        setMobileNavOpen(false);
        (document.activeElement as HTMLElement | null)?.blur();
      } else if (e.key === '[' && !isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Breadcrumbs and Header context
  const path = location.pathname;
  const { title, breadcrumbs } = useMemo(() => {
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 0) {
      return {
        title: 'Portfolio Dashboard',
        breadcrumbs: [{ label: 'Portfolio' }, { label: 'Overview' }],
      };
    }

    if (segments[0] === 'properties') {
      if (segments.length === 1) {
        return {
          title: 'Properties',
          breadcrumbs: [{ label: 'Portfolio' }, { label: 'Properties' }],
        };
      }
      const propId = segments[1];
      const propName = propId.replace(/^prop_/, '').replace(/_/g, ' ');

      if (segments.length === 2) {
        return {
          title: propName,
          breadcrumbs: [
            { label: 'Properties', to: '/properties' },
            { label: propName },
          ],
        };
      }

      if (segments[2] === 'units' && segments[3]) {
        const unitId = segments[3].replace('unit_', 'Unit ');
        return {
          title: `${propName} · ${unitId}`,
          breadcrumbs: [
            { label: 'Properties', to: '/properties' },
            { label: propName, to: `/properties/${propId}` },
            { label: unitId },
          ],
        };
      }
    }

    if (segments[0] === 'assets') {
      if (segments.length === 1) {
        return {
          title: 'Asset Registry',
          breadcrumbs: [{ label: 'Ledger' }, { label: 'Asset Registry' }],
        };
      }
      const assetId = segments[1].toUpperCase();
      return {
        title: assetId,
        breadcrumbs: [
          { label: 'Asset Registry', to: '/assets' },
          { label: assetId },
        ],
      };
    }

    if (segments[0] === 'work-orders') {
      return {
        title: 'Work Orders',
        breadcrumbs: [{ label: 'Operations' }, { label: 'Kanban Dispatch' }],
      };
    }

    if (segments[0] === 'analytics') {
      return {
        title: 'Fleet Analytics',
        breadcrumbs: [{ label: 'Fleet Intelligence' }, { label: 'Reliability & Life' }],
      };
    }

    if (segments[0] === 'settings') {
      return {
        title: 'Settings',
        breadcrumbs: [{ label: 'Configuration' }, { label: 'Portfolio Governance' }],
      };
    }

    if (segments[0] === 'users') {
      return {
        title: 'Maintenance Users',
        breadcrumbs: [{ label: 'Workforce' }, { label: 'Access & Assignments' }],
      };
    }

    if (segments[0] === 'architecture') {
      return {
        title: 'Data Architecture',
        breadcrumbs: [{ label: 'System Design' }, { label: 'Table Relationships' }],
      };
    }

    return {
      title: 'Nameplate HQ',
      breadcrumbs: [{ label: 'HQ' }, { label: segments[0] }],
    };
  }, [path]);

  return (
    <div className={`np-app-shell ${collapsed ? 'np-app-shell--collapsed' : ''} ${mobileNavOpen ? 'np-app-shell--mobile-open' : ''}`}>
      <button className="np-nav-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />
      <aside className={`np-sidebar ${collapsed ? 'np-sidebar--collapsed' : ''}`} aria-label="Primary navigation">
        <div className="np-sidebar__header">
          <div className="np-sidebar__brand">
            <img
              src="./images/nameplate-logo-transparent.png"
              alt="Nameplate"
              className="np-sidebar__logo-img"
            />
            {!collapsed && (
              <div className="np-sidebar__brand-text">
                <div className="np-sidebar__wordmark">NAMEPLATE</div>
                <div className="np-sidebar__sub">HQ</div>
              </div>
            )}
          </div>
        </div>

        <nav className="np-nav" aria-label="HQ sections">
          <div className="np-nav__group">
            <span className="np-nav__group-label">Workspace</span>
            {NAV_ITEMS.slice(0, 5).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `np-nav__item ${isActive ? 'active' : ''}`
                }
                onClick={() => setMobileNavOpen(false)}
                title={collapsed ? `${item.index} · ${item.label}` : undefined}
              >
                <span className="np-nav__icon">{renderNavIcon(item.icon)}</span>
                {!collapsed && <span className="np-nav__label">{item.label}</span>}
                {!collapsed && <span className="np-nav__index">{item.index}</span>}
              </NavLink>
            ))}
          </div>

          <div className="np-nav__group">
            <span className="np-nav__group-label">Administration</span>
            {NAV_ITEMS.slice(5).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `np-nav__item ${isActive ? 'active' : ''}`}
                title={collapsed ? `${item.index} · ${item.label}` : undefined}
                onClick={() => setMobileNavOpen(false)}
              >
                <span className="np-nav__icon">{renderNavIcon(item.icon)}</span>
                {!collapsed && <span className="np-nav__label">{item.label}</span>}
                {!collapsed && <span className="np-nav__index">{item.index}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Minimalist Pinned Actions (Marketing Site & Data Architecture) */}
        <div className="np-sidebar__actions-pinned">
          <NavLink
            to="/architecture"
            className={({ isActive }) => `np-sidebar__back-link ${isActive ? 'active' : ''}`}
            title="Data Schema & Architecture"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="np-sidebar__back-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </span>
            {!collapsed && <span>Data Architecture</span>}
          </NavLink>
          <a
            href="../"
            className="np-sidebar__back-link"
            title="Return to Public Marketing Site"
          >
            <span className="np-sidebar__back-icon">←</span>
            {!collapsed && <span>Marketing Site</span>}
          </a>
        </div>

        {/* User Profile Card */}
        <div className="np-sidebar__footer">
          <div className="np-sidebar__user" title="Marcus Vance · Portfolio Director">
            <div className="np-sidebar__user-avatar">
              MV
              <span className="np-sidebar__user-status" />
            </div>
            {!collapsed ? (
              <div className="np-sidebar__user-meta">
                <div className="np-sidebar__user-name">Marcus Vance</div>
                <div className="np-sidebar__user-role">Portfolio Director</div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="np-main">
        {/* Apple/Google Minimalist Topbar */}
        <header className="np-topbar">
          <div className="np-topbar__left">
            <button
              type="button"
              className="np-topbar__toggle-btn"
              onClick={toggleSidebar}
              title={collapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
              aria-label="Toggle sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>
            <button type="button" className="np-mobile-menu-btn" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <div className="np-topbar__heading">
              <div className="np-breadcrumbs" role="navigation" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, idx) => (
                  <span key={idx} className="np-breadcrumbs__item">
                    {crumb.to ? (
                      <NavLink to={crumb.to} className="np-breadcrumbs__link">
                        {crumb.label}
                      </NavLink>
                    ) : (
                      <span className="np-breadcrumbs__curr">{crumb.label}</span>
                    )}
                    {idx < breadcrumbs.length - 1 && <span className="np-breadcrumbs__sep">/</span>}
                  </span>
                ))}
              </div>
              <h1 className="np-topbar__title">{title}</h1>
            </div>
          </div>

          <div className="np-topbar__right">
            {/* Global quick search input */}
            <form
              className="np-command-search"
              onSubmit={(event) => {
                event.preventDefault();
                if (query.trim()) navigate(`/assets?q=${encodeURIComponent(query.trim())}`);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                aria-label="Quick search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search portfolio…"
              />
              <kbd>⌘K</kbd>
            </form>

            {/* Alternating Sun / Moon theme button */}
            <button
              type="button"
              className="np-theme-btn"
              onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              )}
            </button>

            {/* Clean, un-squashed user pill */}
            <div className="np-topbar-user" title="Logged in as Marcus Vance · Portfolio Director">
              <span className="np-topbar-user__avatar">MV</span>
              <span className="np-topbar-user__name">Marcus Vance</span>
            </div>
          </div>
        </header>

        <main className="np-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
