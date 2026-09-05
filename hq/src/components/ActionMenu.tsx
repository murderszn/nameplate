import { useEffect, useRef, useState, type ReactNode } from 'react';

export type ActionMenuItem = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'accent';
  disabled?: boolean;
};

export function ActionMenu({
  items,
  buttonLabel,
  align = 'right',
  size = 'sm',
}: {
  items: ActionMenuItem[];
  buttonLabel?: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Actions"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          background: open ? 'rgba(var(--overlay-rgb), 0.12)' : 'var(--bg-elevated)',
          border: '1px solid rgba(var(--overlay-rgb), 0.12)',
          color: open ? 'var(--white)' : 'var(--gray-400)',
          borderRadius: 2,
          padding: buttonLabel ? '5px 10px' : size === 'sm' ? '4px 7px' : '7px 12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(var(--overlay-rgb), 0.25)';
          e.currentTarget.style.color = 'var(--white)';
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.borderColor = 'rgba(var(--overlay-rgb), 0.12)';
            e.currentTarget.style.color = 'var(--gray-400)';
          }
        }}
      >
        {buttonLabel ? (
          <>
            <span>{buttonLabel}</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▾</span>
          </>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            [align]: 0,
            marginTop: 4,
            minWidth: 180,
            background: 'var(--bg-card)',
            border: '1px solid rgba(var(--overlay-rgb), 0.16)',
            borderRadius: 2,
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            padding: '4px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {items.map((item, idx) => {
            const isDanger = item.variant === 'danger';
            return (
              <button
                key={idx}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '7px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 2,
                  color: isDanger ? 'var(--red)' : item.disabled ? 'var(--gray-600)' : 'var(--white)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (!item.disabled) {
                    e.currentTarget.style.background = isDanger
                      ? 'rgba(197, 31, 45, 0.12)'
                      : 'rgba(var(--overlay-rgb), 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {item.icon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{item.icon}</span>}
                <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
