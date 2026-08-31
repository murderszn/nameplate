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

const PROPERTY_NAMES: Record<string, string> = {
  prop_sonoran_ridge: 'Sonoran Ridge Residences',
  prop_camelback_vista: 'Camelback Vista Commons',
  prop_desert_palm: 'Desert Palm Towers',
};

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
      const propName = PROPERTY_NAMES[propId] || propId;

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

    return {
      title: 'Nameplate HQ',
      breadcrumbs: [{ label: 'HQ' }, { label: segments[0] }],
    };
  }, [path]);

  return (
    <div className={`np-app-shell ${collapsed ? 'np-app-shell--collapsed' : ''}`}>
      {/* Sleek Minimalist Sidebar */}
      <aside className={`np-sidebar ${collapsed ? 'np-sidebar--collapsed' : ''}`}>
        <div className="np-sidebar__header">
          <div className="np-sidebar__brand">
            <img
              src={theme === 'light' ? './images/nameplate-logo-light.png' : './images/nameplate-logo-transparent.png'}
              alt="Nameplate"
              className="np-sidebar__logo"
            />
            {!collapsed && (
              <div className="np-sidebar__brand-text">
                <div className="np-sidebar__wordmark">NAMEPLATE</div>
                <div className="np-sidebar__sub">HQ</div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="np-sidebar__collapse-btn"
            onClick={toggleSidebar}
            title={collapsed ? 'Expand (⌘B)' : 'Collapse (⌘B)'}
            aria-label="Toggle sidebar"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {collapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>
        </div>

        {/* Clean Primary Navigation */}
        <nav className="np-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `np-nav__item ${isActive ? 'active' : ''}`
              }
              title={collapsed ? `${item.index} · ${item.label}` : undefined}
            >
              <span className="np-nav__icon">{renderNavIcon(item.icon)}</span>
              {!collapsed && <span className="np-nav__label">{item.label}</span>}
              {!collapsed && <span className="np-nav__index">{item.index}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Minimalist Pinned Action */}
        <div className="np-sidebar__actions-pinned">
          <a
            href="../"
            className="np-sidebar__back-link"
            title="Return to Public Marketing Site"
          >
            <span className="np-sidebar__back-icon">←</span>
            {!collapsed && <span>Marketing Site</span>}
          </a>
        </div>

        {/* Clean Footer */}
        <div className="np-sidebar__footer">
          {!collapsed ? (
            <div className="np-sidebar__footer-meta">
              <div className="np-sidebar__org-name">Sonoran Portfolio</div>
            </div>
          ) : (
            <div className="np-sidebar__footer-dot" title="Sonoran Portfolio" />
          )}
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

            <div className="np-topbar__heading">
              <div className="np-breadcrumbs">
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
                if (query.trim()) navigate(`/assets?search=${encodeURIComponent(query.trim())}`);
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

            <button
              type="button"
              className="np-theme-toggle"
              onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
              aria-label={`Use ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Use ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <svg className="np-theme-toggle__icon np-theme-toggle__icon--moon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 15.2A8.2 8.2 0 0 1 8.8 4a8.2 8.2 0 1 0 11.2 11.2Z" />
              </svg>
              <svg className="np-theme-toggle__icon np-theme-toggle__icon--sun" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3.5" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
              </svg>
            </button>

            <a
              href={window.location.port === '5173' ? 'http://localhost:8080' : '../field/index.html'}
              target="_blank"
              rel="noopener noreferrer"
              className="np-topbar-btn"
              title="Open Nameplate Field App (Tablet View)"
            >
              <span>Field App</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
          </div>
        </header>

        <main className="np-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
