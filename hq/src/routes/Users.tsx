import { useEffect, useMemo, useState } from 'react';
import { ActionMenu } from '../components/ActionMenu';
import {
  api,
  type InviteMaintenanceUserInput,
  type MaintenanceUser,
  type Property,
} from '../api/client';

const ROLE_LABELS: Record<string, string> = {
  lead_tech: 'Lead technician',
  technician: 'Technician',
  property_manager: 'Property manager',
  viewer: 'Read-only viewer',
};

type UserForm = InviteMaintenanceUserInput & {
  status: 'invited' | 'active' | 'revoked';
};

const emptyForm = (): UserForm => ({
  fullName: '',
  email: '',
  phone: '',
  role: 'technician',
  employmentType: 'employee',
  hourlyLaborRate: 58,
  propertyIds: [],
  status: 'invited',
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatSeen(value: string | null) {
  if (!value) return 'Never signed in';
  const date = new Date(value);
  const diffHours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3_600_000));
  if (diffHours < 1) return 'Within the hour';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function Users() {
  const [users, setUsers] = useState<MaintenanceUser[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listUsers(), api.listProperties()])
      .then(([userRows, propertyRows]) => {
        if (cancelled) return;
        setUsers(userRows);
        setProperties(propertyRows);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesQuery =
        !normalized ||
        user.fullName.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized) ||
        (ROLE_LABELS[user.role] ?? user.role).toLowerCase().includes(normalized) ||
        user.properties.some((property) => property.name.toLowerCase().includes(normalized));
      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, users]);

  const metrics = useMemo(
    () => ({
      active: users.filter((user) => user.status === 'active').length,
      technicians: users.filter(
        (user) => user.status === 'active' && ['technician', 'lead_tech'].includes(user.role),
      ).length,
      invited: users.filter((user) => user.status === 'invited').length,
      unassigned: users.filter((user) => user.properties.length === 0).length,
    }),
    [users],
  );

  const openInvite = () => {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setPanelOpen(true);
  };

  const openEdit = (user: MaintenanceUser) => {
    setEditing(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      employmentType: user.employmentType ?? 'employee',
      hourlyLaborRate: Number(user.hourlyLaborRate ?? 0),
      propertyIds: user.properties.map((property) => property.id),
      status: user.status,
    });
    setError(null);
    setPanelOpen(true);
  };

  const closePanel = () => {
    if (!saving) setPanelOpen(false);
  };

  const toggleProperty = (propertyId: string) => {
    setForm((current) => ({
      ...current,
      propertyIds: current.propertyIds.includes(propertyId)
        ? current.propertyIds.filter((id) => id !== propertyId)
        : [...current.propertyIds, propertyId],
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.propertyIds.length) {
      setError('Assign at least one property before saving access.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const updated = await api.updateUser(editing.id, {
          role: form.role,
          employmentType: form.employmentType,
          hourlyLaborRate: Number(form.hourlyLaborRate ?? 0),
          propertyIds: form.propertyIds,
          status: form.status,
        });
        setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
        setNotice(`${updated.fullName}'s access was updated.`);
      } else {
        const created = await api.inviteUser({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          role: form.role,
          employmentType: form.employmentType,
          hourlyLaborRate: Number(form.hourlyLaborRate ?? 0),
          propertyIds: form.propertyIds,
        });
        setUsers((current) => [created, ...current]);
        setNotice(`Invitation sent to ${created.email}.`);
      }
      setPanelOpen(false);
      window.setTimeout(() => setNotice(null), 4000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  };

  const toggleAccess = async (user: MaintenanceUser) => {
    const status = user.status === 'revoked' ? 'active' : 'revoked';
    setError(null);
    try {
      const updated = await api.updateUser(user.id, { status });
      setUsers((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setNotice(status === 'active' ? `${user.fullName} can sign in again.` : `${user.fullName}'s access was suspended.`);
      window.setTimeout(() => setNotice(null), 4000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <div className="np-users-page">
      <section className="np-users-command">
        <div>
          <span className="np-kicker">06 / Workforce access</span>
          <h2>Maintenance Users</h2>
          <p>Invite field staff, control property scope, and manage operational access.</p>
        </div>
        <button type="button" className="np-btn np-btn--primary" onClick={openInvite}>
          + Invite maintenance user
        </button>
      </section>

      <section className="np-users-metrics" aria-label="User access summary">
        <article><span>Active users</span><strong>{metrics.active}</strong><small>Organization access</small></article>
        <article><span>Field technicians</span><strong>{metrics.technicians}</strong><small>Technician + lead roles</small></article>
        <article><span>Pending invites</span><strong>{metrics.invited}</strong><small>Awaiting acceptance</small></article>
        <article className={metrics.unassigned ? 'needs-attention' : ''}><span>Unassigned</span><strong>{metrics.unassigned}</strong><small>No property scope</small></article>
      </section>

      {(error || notice) && (
        <div className={`np-users-alert ${error ? 'is-error' : 'is-success'}`} role="status">
          {error ?? notice}
        </div>
      )}

      <section className="np-users-roster">
        <div className="np-users-toolbar">
          <div>
            <h3>User roster</h3>
            <span>{visibleUsers.length} of {users.length} users</span>
          </div>
          <div className="np-users-filters">
            <input
              className="np-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users, roles, or properties…"
              aria-label="Search maintenance users"
            />
            <select
              className="np-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter users by access status"
            >
              <option value="all">All access states</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="revoked">Suspended</option>
            </select>
          </div>
        </div>

        <div className="np-users-table-wrap">
          <table className="np-table np-users-table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Property scope</th><th>Labor rate</th><th>Last seen</th><th>Access</th><th></th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7}><div className="np-empty-state">Loading maintenance users…</div></td></tr>}
              {!loading && visibleUsers.length === 0 && <tr><td colSpan={7}><div className="np-empty-state">No maintenance users match this view.</div></td></tr>}
              {!loading && visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="np-user-identity">
                      <span className="np-user-avatar" aria-hidden="true">{initials(user.fullName)}</span>
                      <span><strong>{user.fullName}</strong><small>{user.email}</small></span>
                    </div>
                  </td>
                  <td><strong className="np-user-role">{ROLE_LABELS[user.role] ?? user.role}</strong><small className="np-user-subline">{user.employmentType ?? 'Not set'}</small></td>
                  <td>
                    <div className="np-property-chips">
                      {user.properties.slice(0, 2).map((property) => <span key={property.id}>{property.code ?? property.name}</span>)}
                      {user.properties.length > 2 && <span>+{user.properties.length - 2}</span>}
                      {!user.properties.length && <em>Not assigned</em>}
                    </div>
                  </td>
                  <td className="mono">{user.hourlyLaborRate == null ? '—' : `$${Number(user.hourlyLaborRate).toFixed(2)}`}</td>
                  <td><span className="np-user-last-seen">{formatSeen(user.lastSeenAt)}</span></td>
                  <td><span className={`np-badge np-badge--status-${user.status}`}>{user.status === 'revoked' ? 'Suspended' : user.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <ActionMenu
                        items={[
                          { label: 'Configure Scope & Rates', onClick: () => openEdit(user) },
                          {
                            label: 'Copy Work Email',
                            onClick: () => {
                              navigator.clipboard?.writeText(user.email);
                              setNotice(`Copied ${user.email}`);
                            },
                          },
                          ...(user.status !== 'invited'
                            ? [
                                {
                                  label: user.status === 'revoked' ? 'Restore Operational Access' : 'Suspend Access',
                                  variant: (user.status === 'revoked' ? 'default' : 'danger') as 'default' | 'danger',
                                  onClick: () => toggleAccess(user),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {panelOpen && (
        <div className="np-user-panel-backdrop" onMouseDown={closePanel}>
          <section className="np-user-panel" role="dialog" aria-modal="true" aria-labelledby="user-panel-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span className="np-kicker">Access configuration</span><h2 id="user-panel-title">{editing ? 'Configure user' : 'Invite maintenance user'}</h2></div>
              <button type="button" className="np-user-panel-close" onClick={closePanel} aria-label="Close user setup">×</button>
            </header>
            <form onSubmit={submit}>
              <div className="np-user-panel-body">
                <div className="np-user-form-section">
                  <h3>Identity</h3>
                  <div className="np-form-row">
                    <div className="np-form-group"><label htmlFor="user-name">Full name</label><input id="user-name" className="np-input" required disabled={Boolean(editing)} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></div>
                    <div className="np-form-group"><label htmlFor="user-email">Work email</label><input id="user-email" className="np-input" type="email" required disabled={Boolean(editing)} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
                  </div>
                  <div className="np-form-group"><label htmlFor="user-phone">Phone</label><input id="user-phone" className="np-input" disabled={Boolean(editing)} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Optional" /></div>
                </div>

                <div className="np-user-form-section">
                  <h3>Maintenance role</h3>
                  <div className="np-form-row">
                    <div className="np-form-group"><label htmlFor="user-role">Role</label><select id="user-role" className="np-input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="technician">Technician</option><option value="lead_tech">Lead technician</option><option value="property_manager">Property manager</option><option value="viewer">Read-only viewer</option></select></div>
                    <div className="np-form-group"><label htmlFor="employment-type">Employment type</label><select id="employment-type" className="np-input" value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value })}><option value="employee">Employee</option><option value="contractor">Contractor</option><option value="vendor">Vendor</option></select></div>
                  </div>
                  <div className="np-form-group"><label htmlFor="labor-rate">Loaded hourly labor rate</label><div className="np-input-prefix-wrap"><span className="np-input-prefix">$</span><input id="labor-rate" className="np-input np-input--with-prefix" type="number" min="0" step="0.01" value={form.hourlyLaborRate} onChange={(event) => setForm({ ...form, hourlyLaborRate: Number(event.target.value) })} /></div><span className="np-form-hint">Snapshotted into service events for labor-cost reporting.</span></div>
                  {editing && <div className="np-form-group"><label htmlFor="access-state">Access state</label><select id="access-state" className="np-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as UserForm['status'] })}><option value="invited">Invited</option><option value="active">Active</option><option value="revoked">Suspended</option></select></div>}
                </div>

                <div className="np-user-form-section">
                  <div className="np-user-form-heading"><div><h3>Property access</h3><p>Select the properties this user may view and service.</p></div><button type="button" onClick={() => setForm({ ...form, propertyIds: properties.map((property) => property.id) })}>Select all</button></div>
                  <div className="np-property-selector">
                    {properties.map((property) => (
                      <label key={property.id} className={form.propertyIds.includes(property.id) ? 'selected' : ''}>
                        <input type="checkbox" checked={form.propertyIds.includes(property.id)} onChange={() => toggleProperty(property.id)} />
                        <span><strong>{property.name}</strong><small>{property.code} · {property.city}, {property.state}</small></span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <footer><button type="button" className="np-btn np-user-cancel" onClick={closePanel}>Cancel</button><button type="submit" className="np-btn np-btn--primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save access' : 'Send invitation'}</button></footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
