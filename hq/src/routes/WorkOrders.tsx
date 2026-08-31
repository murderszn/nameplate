import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type WorkOrder } from '../api/client';

const COLUMNS = [
  { id: 'intake', statuses: ['open', 'assigned'], label: 'Backlog & Assigned', color: '#3B82F6' },
  { id: 'in_progress', statuses: ['in_progress'], label: 'In Progress', color: '#F59E0B' },
  { id: 'awaiting_parts', statuses: ['awaiting_parts'], label: 'Awaiting Parts', color: '#EF4444' },
  { id: 'completed', statuses: ['completed'], label: 'Completed', color: '#10B981' },
];

const PRIORITIES = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent', color: '#eb2b2b' },
  { value: 'high', label: 'High', color: '#F97316' },
  { value: 'normal', label: 'Normal', color: 'var(--white)' },
  { value: 'low', label: 'Low', color: '#71717A' },
];

export function WorkOrders() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWo, setSelectedWo] = useState<WorkOrder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Drag & Drop State
  const [draggedWoId, setDraggedWoId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // New Note State in Modal
  const [noteInput, setNoteInput] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('Lead Tech Morales');

  // New Work Order Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('HVAC');
  const [newPriority, setNewPriority] = useState('urgent');
  const [newUnit, setNewUnit] = useState('Unit 402');
  const [newAssetNpid, setNewAssetNpid] = useState('NP-1M4K9X23');
  const [newDescription, setNewDescription] = useState('');

  // Load Work Orders
  const loadData = async () => {
    try {
      const rows = await api.listWorkOrders();
      setWorkOrders(rows);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update Status
  const handleStatusChange = async (woId: string, newStatus: string) => {
    try {
      const updated = await api.updateWorkOrder(woId, { status: newStatus });
      setWorkOrders((prev) => prev.map((w) => (w.id === woId ? updated : w)));
      if (selectedWo && selectedWo.id === woId) {
        setSelectedWo(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Move Next / Prev in Kanban
  const handleMoveLane = async (wo: WorkOrder, direction: 'next' | 'prev') => {
    const colIdx = COLUMNS.findIndex((c) => c.statuses.includes(wo.status));
    if (colIdx === -1) return;
    const nextIdx = direction === 'next' ? colIdx + 1 : colIdx - 1;
    if (nextIdx < 0 || nextIdx >= COLUMNS.length) return;
    const targetStatus = COLUMNS[nextIdx].statuses[0];
    await handleStatusChange(wo.id, targetStatus);
  };

  // Add Comment / Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWo || !noteInput.trim()) return;
    try {
      const updated = await api.addWorkOrderNote(selectedWo.id, noteInput.trim(), noteAuthor);
      setSelectedWo(updated);
      setWorkOrders((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setNoteInput('');
    } catch (err) {
      console.error(err);
    }
  };

  // Create Work Order
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const created = await api.createWorkOrder({
        title: newTitle.trim(),
        category: newCategory,
        priority: newPriority,
        propertyId: 'prop_sonoran_ridge',
        propertyName: 'Sonoran Ridge Residences',
        unitId: 'unit_402',
        unitLabel: newUnit,
        assetId: 'asset_hvac_402',
        assetNpid: newAssetNpid,
        assetName: 'Carrier 2.5-Ton Variable Speed Air Handler',
        assignee: 'J. Morales (Lead Tech)',
        description: newDescription.trim() || 'Scheduled technician field inspection and component diagnostic sweep.',
        status: 'open',
        slaDueAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        completedAt: null,
        resolution: null,
        actualCost: 0,
        partsRequired: [],
        notesList: [
          {
            id: `note_${Date.now()}`,
            author: 'HQ Dispatch',
            createdAt: new Date().toISOString(),
            text: 'Work order opened via Nameplate HQ Console.',
          },
        ],
      });
      setWorkOrders((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered List
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((w) => {
      if (selectedPriority !== 'all' && w.priority !== selectedPriority) return false;
      if (selectedCategory !== 'all' && (w.category ?? '') !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = w.title.toLowerCase().includes(q);
        const matchNum = `wo-${w.number}`.toLowerCase().includes(q);
        const matchNpid = (w.assetNpid ?? '').toLowerCase().includes(q);
        const matchTech = (w.assignee ?? '').toLowerCase().includes(q);
        if (!matchTitle && !matchNum && !matchNpid && !matchTech) return false;
      }
      return true;
    });
  }, [workOrders, selectedPriority, selectedCategory, searchQuery]);

  const openCount = workOrders.filter((w) => w.status !== 'completed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Toolbar & Filter Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          background: 'var(--bg-card)',
          border: '1px solid rgba(var(--overlay-rgb), 0.08)',
          borderRadius: 2,
          padding: '12px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 240 }}>
            <input
              type="text"
              placeholder="Search WO #, NPID, Title, Tech…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: '1px solid rgba(var(--overlay-rgb), 0.12)',
                borderRadius: 2,
                padding: '7px 12px',
                color: 'var(--white)',
                fontSize: '0.84rem',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid rgba(var(--overlay-rgb), 0.12)',
              borderRadius: 2,
              padding: '7px 10px',
              color: 'var(--white)',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid rgba(var(--overlay-rgb), 0.12)',
              borderRadius: 2,
              padding: '7px 10px',
              color: 'var(--white)',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Categories</option>
            <option value="HVAC">HVAC</option>
            <option value="Appliance">Appliance</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Electrical">Electrical</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '0.78rem', color: '#A3A3A3', fontFamily: 'monospace' }}>
            {openCount} ACTIVE FIELD ORDERS
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: '#eb2b2b',
              color: 'var(--white)',
              border: 'none',
              borderRadius: 2,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>+</span> Create Work Order
          </button>
        </div>
      </div>

      {/* Jira / Linear 4-Lane Dispatch Swimlanes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 24,
        }}
      >
        {COLUMNS.map((col) => {
          const colItems = filteredWorkOrders.filter((w) => col.statuses.includes(w.status));
          const isDragOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.id);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => {
                if (draggedWoId) {
                  const targetStatus = col.statuses[0];
                  handleStatusChange(draggedWoId, targetStatus);
                }
                setDraggedWoId(null);
                setDragOverCol(null);
              }}
              style={{
                background: isDragOver ? 'rgba(235, 43, 43,0.06)' : '#0A0A0A',
                border: isDragOver ? '1px dashed #eb2b2b' : '1px solid rgba(var(--overlay-rgb), 0.07)',
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 620,
                transition: 'background 0.2s, border 0.2s',
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(var(--overlay-rgb), 0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 1,
                      background: col.color,
                      boxShadow: `0 0 6px ${col.color}`,
                    }}
                  />
                  <span style={{ fontSize: '0.84rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                    {col.label.toUpperCase()}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.74rem',
                    background: 'rgba(var(--overlay-rgb), 0.08)',
                    padding: '2px 8px',
                    borderRadius: 2,
                    color: 'var(--white)',
                    fontWeight: 700,
                  }}
                >
                  {colItems.length}
                </span>
              </div>

              {/* Column Cards Feed */}
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {colItems.map((wo) => {
                  const isUrgent = wo.priority === 'urgent';

                  return (
                    <div
                      key={wo.id}
                      draggable
                      onDragStart={() => setDraggedWoId(wo.id)}
                      onClick={() => setSelectedWo(wo)}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: isUrgent ? '1px solid rgba(235, 43, 43,0.4)' : '1px solid rgba(var(--overlay-rgb), 0.08)',
                        borderRadius: 2,
                        padding: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        transition: 'transform 0.15s, border-color 0.15s',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.borderColor = isUrgent ? '#eb2b2b' : '#FFFFFF';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.borderColor = isUrgent ? 'rgba(235, 43, 43,0.4)' : 'rgba(var(--overlay-rgb), 0.08)';
                      }}
                    >
                      {/* Card Topline: ID + Priority Chip + Category */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 800, color: '#eb2b2b' }}>
                          WO-{wo.number}
                        </span>

                        <div style={{ display: 'flex', gap: 5 }}>
                          {wo.category && (
                            <span
                              style={{
                                fontSize: '0.66rem',
                                background: 'rgba(var(--overlay-rgb), 0.06)',
                                border: '1px solid rgba(var(--overlay-rgb), 0.1)',
                                padding: '2px 5px',
                                borderRadius: 3,
                                color: '#D4D4D4',
                              }}
                            >
                              {wo.category}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              borderRadius: 3,
                              background: isUrgent ? 'rgba(235, 43, 43,0.2)' : 'rgba(var(--overlay-rgb), 0.08)',
                              color: isUrgent ? '#f44343' : '#D4D4D4',
                              border: isUrgent ? '1px solid rgba(235, 43, 43,0.4)' : 'none',
                            }}
                          >
                            {wo.priority}
                          </span>
                        </div>
                      </div>

                      {/* Card Title */}
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--white)', lineHeight: 1.35 }}>
                        {wo.title}
                      </div>

                      {/* Attached Asset NPID & Unit */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.72rem',
                          color: '#A3A3A3',
                          fontFamily: 'monospace',
                        }}
                      >
                        <span style={{ color: '#eb2b2b' }}>●</span>
                        <span>{wo.unitLabel ?? 'Unit 402'}</span>
                        <span>·</span>
                        <span style={{ color: 'var(--white)' }}>{wo.assetNpid ?? 'NP-ASSET'}</span>
                      </div>

                      {/* Card Footer: Assignee + Swimlane Mover Controls */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid rgba(var(--overlay-rgb), 0.06)',
                          paddingTop: 8,
                          marginTop: 2,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#A3A3A3' }}>
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: 'var(--bg-elevated)',
                              border: '1px solid rgba(var(--overlay-rgb), 0.2)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              color: 'var(--white)',
                            }}
                          >
                            {wo.assignee ? wo.assignee.charAt(0) : 'T'}
                          </span>
                          <span>{wo.assignee ? wo.assignee.split(' ')[0] : 'Unassigned'}</span>
                        </div>

                        {/* Fast Swimlane Shift Arrows */}
                        <div
                          style={{ display: 'flex', gap: 4 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            title="Move to Previous Column"
                            onClick={() => handleMoveLane(wo, 'prev')}
                            disabled={col.id === 'intake'}
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid rgba(var(--overlay-rgb), 0.1)',
                              color: 'var(--white)',
                              borderRadius: 4,
                              width: 22,
                              height: 22,
                              cursor: col.id === 'intake' ? 'default' : 'pointer',
                              opacity: col.id === 'intake' ? 0.3 : 1,
                              fontSize: '0.7rem',
                            }}
                          >
                            ←
                          </button>
                          <button
                            title="Move to Next Column"
                            onClick={() => handleMoveLane(wo, 'next')}
                            disabled={col.id === 'completed'}
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid rgba(var(--overlay-rgb), 0.1)',
                              color: 'var(--white)',
                              borderRadius: 4,
                              width: 22,
                              height: 22,
                              cursor: col.id === 'completed' ? 'default' : 'pointer',
                              opacity: col.id === 'completed' ? 0.3 : 1,
                              fontSize: '0.7rem',
                            }}
                          >
                            →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colItems.length === 0 && (
                  <div
                    style={{
                      padding: '36px 12px',
                      textAlign: 'center',
                      color: '#52525B',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    No tickets in lane
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= Linear / Jira Ticket Modal Drawer ================= */}
      {selectedWo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedWo(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 640,
              height: '100%',
              background: 'var(--bg-card)',
              borderLeft: '1px solid rgba(var(--overlay-rgb), 0.15)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.9)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(var(--overlay-rgb), 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-elevated)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#eb2b2b',
                  }}
                >
                  WO-{selectedWo.number}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'rgba(var(--overlay-rgb), 0.1)',
                    color: 'var(--white)',
                    fontWeight: 700,
                  }}
                >
                  {selectedWo.status.replace('_', ' ')}
                </span>
              </div>

              <button
                onClick={() => setSelectedWo(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A3A3A3',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
              {/* Title & Stage Controller */}
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--white)', marginBottom: 12 }}>
                  {selectedWo.title}
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#71717A', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      Kanban Lane / Status
                    </label>
                    <select
                      value={selectedWo.status}
                      onChange={(e) => handleStatusChange(selectedWo.id, e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-elevated)',
                        border: '1px solid rgba(var(--overlay-rgb), 0.15)',
                        borderRadius: 2,
                        padding: '8px 10px',
                        color: 'var(--white)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <option value="open">Backlog / Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="awaiting_parts">Awaiting Parts</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#71717A', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      Priority Level
                    </label>
                    <select
                      value={selectedWo.priority}
                      onChange={async (e) => {
                        const updated = await api.updateWorkOrder(selectedWo.id, { priority: e.target.value });
                        setSelectedWo(updated);
                        setWorkOrders((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
                      }}
                      style={{
                        width: '100%',
                        background: 'var(--bg-elevated)',
                        border: '1px solid rgba(var(--overlay-rgb), 0.15)',
                        borderRadius: 2,
                        padding: '8px 10px',
                        color: 'var(--white)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Asset & Spatial Context Box */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid rgba(var(--overlay-rgb), 0.1)',
                  borderRadius: 2,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Bound Physical Asset
                  </span>
                  <Link
                    to={`/assets/${selectedWo.assetId ?? 'asset_hvac_402'}`}
                    style={{ fontSize: '0.76rem', color: '#eb2b2b', fontWeight: 700 }}
                  >
                    View Asset Plate →
                  </Link>
                </div>

                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--white)' }}>
                  {selectedWo.assetName ?? 'Carrier 2.5-Ton Variable Speed Air Handler'}
                </div>

                <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: '#A3A3A3', fontFamily: 'monospace' }}>
                  <span>NPID: {selectedWo.assetNpid ?? 'NP-1M4K9X23'}</span>
                  <span>·</span>
                  <span>{selectedWo.propertyName ?? 'Sonoran Ridge'} ({selectedWo.unitLabel ?? 'Unit 402'})</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span style={{ fontSize: '0.72rem', color: '#71717A', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Field Diagnostics & Work Description
                </span>
                <div
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid rgba(var(--overlay-rgb), 0.08)',
                    borderRadius: 2,
                    padding: 14,
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    color: '#D4D4D4',
                  }}
                >
                  {selectedWo.description || 'No detailed instructions provided.'}
                </div>
              </div>

              {/* Parts Requisitioned */}
              <div>
                <span style={{ fontSize: '0.72rem', color: '#71717A', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Attached Parts & Requisitions
                </span>
                {selectedWo.partsRequired && selectedWo.partsRequired.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selectedWo.partsRequired.map((part, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(235, 43, 43,0.1)',
                          border: '1px solid rgba(235, 43, 43,0.3)',
                          color: '#FF8888',
                          padding: '4px 10px',
                          borderRadius: 2,
                          fontSize: '0.78rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#71717A' }}>No extra parts currently logged.</span>
                )}
              </div>

              {/* Activity & Comments Thread (Linear Style) */}
              <div style={{ borderTop: '1px solid rgba(var(--overlay-rgb), 0.1)', paddingTop: 20 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--white)', display: 'block', marginBottom: 14 }}>
                  Activity & Field Notes Thread
                </span>

                {/* Notes List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                  {selectedWo.notesList && selectedWo.notesList.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid rgba(var(--overlay-rgb), 0.06)',
                        borderRadius: 2,
                        padding: '10px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#71717A' }}>
                        <strong style={{ color: 'var(--white)' }}>{note.author}</strong>
                        <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: '#D4D4D4' }}>{note.text}</div>
                    </div>
                  ))}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    rows={3}
                    placeholder="Add technician update, resolution note, or parts requisition…"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-elevated)',
                      border: '1px solid rgba(var(--overlay-rgb), 0.15)',
                      borderRadius: 2,
                      padding: 12,
                      color: 'var(--white)',
                      fontSize: '0.86rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={noteAuthor}
                      onChange={(e) => setNoteAuthor(e.target.value)}
                      placeholder="Your Name"
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(var(--overlay-rgb), 0.1)',
                        borderRadius: 2,
                        padding: '4px 8px',
                        color: '#A3A3A3',
                        fontSize: '0.75rem',
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        background: '#FFF',
                        color: '#000',
                        border: 'none',
                        borderRadius: 2,
                        padding: '7px 16px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Post Note
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= Create New Work Order Modal ================= */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              background: 'var(--bg-card)',
              border: '1px solid rgba(var(--overlay-rgb), 0.15)',
              borderRadius: 2,
              padding: 28,
              boxShadow: '0 30px 80px rgba(0,0,0,0.95)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--white)' }}>Create Work Order</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#A3A3A3', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: '#A3A3A3', display: 'block', marginBottom: 4 }}>Work Order Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dishwasher Drain Pump Inspection"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-elevated)',
                    border: '1px solid rgba(var(--overlay-rgb), 0.15)',
                    borderRadius: 2,
                    padding: '10px 14px',
                    color: 'var(--white)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#A3A3A3', display: 'block', marginBottom: 4 }}>Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid rgba(var(--overlay-rgb), 0.15)', borderRadius: 2, padding: '9px 12px', color: 'var(--white)' }}
                  >
                    <option value="HVAC">HVAC</option>
                    <option value="Appliance">Appliance</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#A3A3A3', display: 'block', marginBottom: 4 }}>Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid rgba(var(--overlay-rgb), 0.15)', borderRadius: 2, padding: '9px 12px', color: 'var(--white)' }}
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#A3A3A3', display: 'block', marginBottom: 4 }}>Unit</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid rgba(var(--overlay-rgb), 0.15)', borderRadius: 2, padding: '9px 12px', color: 'var(--white)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#A3A3A3', display: 'block', marginBottom: 4 }}>Asset NPID</label>
                  <input
                    type="text"
                    value={newAssetNpid}
                    onChange={(e) => setNewAssetNpid(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid rgba(var(--overlay-rgb), 0.15)', borderRadius: 2, padding: '9px 12px', color: 'var(--white)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#A3A3A3', display: 'block', marginBottom: 4 }}>Description / Symptoms</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Field notes, failure symptoms, or required tools…"
                  style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid rgba(var(--overlay-rgb), 0.15)', borderRadius: 2, padding: '10px 14px', color: 'var(--white)', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: 'transparent', border: '1px solid rgba(var(--overlay-rgb), 0.15)', color: 'var(--white)', borderRadius: 2, padding: '9px 16px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: '#eb2b2b', border: 'none', color: 'var(--white)', borderRadius: 2, padding: '9px 20px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Create Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
