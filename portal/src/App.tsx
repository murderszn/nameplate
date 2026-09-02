import { useEffect, useRef, useState, type FormEvent } from 'react';

type View = 'home' | 'request' | 'orders' | 'appliances';
type Theme = 'light' | 'dark';
type IconName = View | 'scan' | 'chevron' | 'clock' | 'calendar' | 'check' | 'close' | 'camera' | 'upload' | 'help' | 'shield' | 'user' | 'bell' | 'more' | 'info' | 'copy';

export type Appliance = {
  id: string;
  npid: string;
  name: string;
  brand: string;
  model: string;
  location: string;
  lastService: string;
  serial?: string;
  installDate?: string;
};

export type WorkOrder = {
  id: string;
  title: string;
  appliance: string;
  status: 'Submitted' | 'Scheduled' | 'In progress' | 'Completed';
  priority: 'Standard' | 'Urgent';
  opened: string;
  appointment?: string;
  description?: string;
};

const appliances: Appliance[] = [
  { id: 'fridge', npid: 'NP-4K8D2M7Q', name: 'Refrigerator', brand: 'GE', model: 'GNE27JYMFS', location: 'Kitchen', lastService: 'No service on record', serial: 'GE-994821', installDate: 'Oct 2024' },
  { id: 'dishwasher', npid: 'NP-7H3P9X2C', name: 'Dishwasher', brand: 'Whirlpool', model: 'WDT730HAMZ', location: 'Kitchen', lastService: 'Serviced Jun 12, 2026', serial: 'WP-772109', installDate: 'Jan 2025' },
  { id: 'washer', npid: 'NP-2N6R4T8W', name: 'Washer', brand: 'Samsung', model: 'WF45T6000AW', location: 'Laundry', lastService: 'Serviced Feb 03, 2026', serial: 'SM-551044', installDate: 'Nov 2024' },
  { id: 'hvac', npid: 'NP-9V5B1L6S', name: 'Air conditioner', brand: 'Trane', model: 'XR14', location: 'Utility closet', lastService: 'Serviced Aug 18, 2026', serial: 'TR-339012', installDate: 'Mar 2023' },
];

const seededOrders: WorkOrder[] = [
  { id: 'WO-1842', title: 'Dishwasher not draining', appliance: 'Dishwasher', status: 'Scheduled', priority: 'Standard', opened: 'Aug 29', appointment: 'Tue, Sep 1 · 10:00 AM–12:00 PM', description: 'Standing water remains after the cycle finishes.' },
  { id: 'WO-1766', title: 'A/C making a rattling sound', appliance: 'Air conditioner', status: 'Completed', priority: 'Standard', opened: 'Aug 17', description: 'Technician secured the access panel and checked airflow.' },
];

const statusSteps = ['Submitted', 'Scheduled', 'In progress', 'Completed'] as const;

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10"/><path d="M9 21v-7h6v7"/></>,
    request: <><path d="M12 22a10 10 0 1 0-10-10"/><path d="M2 16v6h6"/><path d="M12 8v8M8 12h8"/></>,
    orders: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    appliances: <><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 9h14M9 6h.01"/><circle cx="12" cy="15" r="3"/></>,
    scan: <><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M7 12h10"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    camera: <><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z"/><circle cx="12" cy="13" r="3"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.9.4-.9 1.2-.9 1.7M12 17h.01"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    more: <><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>,
    copy: <><rect width="13" height="13" x="9" y="9" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  };
  return <svg {...common} aria-hidden="true">{paths[name]}</svg>;
}

function Brand() {
  return (
    <div className="np-brand">
      <img
        src="./nameplate-logo-transparent.png"
        alt="Nameplate Logo"
        className="np-brand__logo np-brand__logo--dark"
      />
      <img
        src="./nameplate-logo-light.png"
        alt="Nameplate Logo"
        className="np-brand__logo np-brand__logo--light"
      />
      <div className="np-brand__text">
        <span className="np-brand__wordmark">NAMEPLATE</span>
        <b>PORTAL</b>
      </div>
    </div>
  );
}

const FASTAPI_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080/api';

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem('nameplate-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  const [view, setView] = useState<View>('home');
  const [myAppliances, setMyAppliances] = useState<Appliance[]>(appliances);
  const [orders, setOrders] = useState<WorkOrder[]>(() => {
    try { return JSON.parse(localStorage.getItem('np_resident_orders') || 'null') || seededOrders; } catch { return seededOrders; }
  });
  const [selectedAsset, setSelectedAsset] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [specModalAsset, setSpecModalAsset] = useState<Appliance | null>(null);
  const [toast, setToast] = useState('');

  // Initial load from live backend if available
  useEffect(() => {
    async function loadLiveData() {
      try {
        const resAssets = await fetch(`${FASTAPI_BASE}/assets?propertyId=prop_sonoran_ridge`);
        if (resAssets.ok) {
          const rawAssets = await resAssets.json();
          if (Array.isArray(rawAssets) && rawAssets.length > 0) {
            const mapped: Appliance[] = rawAssets.map((a: any) => ({
              id: a.id,
              npid: a.npid,
              name: a.category?.displayName || 'Appliance',
              brand: a.manufacturerRaw || 'Carrier',
              model: a.modelRaw || '',
              location: a.currentUnit?.label || 'Unit 214',
              lastService: a.lastServiceAt ? `Serviced ${new Date(a.lastServiceAt).toLocaleDateString()}` : 'No service on record',
              serial: a.serialNumber,
              installDate: a.installDate ? new Date(a.installDate).toLocaleDateString() : 'Verified',
            }));
            setMyAppliances(mapped);
          }
        }

        const resOrders = await fetch(`${FASTAPI_BASE}/work-orders?propertyId=prop_sonoran_ridge`);
        if (resOrders.ok) {
          const rawOrders = await resOrders.json();
          if (Array.isArray(rawOrders) && rawOrders.length > 0) {
            const mappedOrders: WorkOrder[] = rawOrders.map((o: any) => ({
              id: `WO-${o.number}`,
              title: o.title,
              appliance: o.assetName || o.category || 'Appliance',
              status: o.status === 'completed' ? 'Completed' : o.status === 'in_progress' ? 'In progress' : o.status === 'assigned' ? 'Scheduled' : 'Submitted',
              priority: o.priority === 'urgent' || o.priority === 'emergency' ? 'Urgent' : 'Standard',
              opened: o.slaDueAt ? new Date(o.slaDueAt).toLocaleDateString() : 'Today',
              description: o.description || undefined,
            }));
            setOrders(mappedOrders);
          }
        }
      } catch {
        // Fallback to seeded demo state
      }
    }
    loadLiveData();
  }, []);

  useEffect(() => { localStorage.setItem('np_resident_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('nameplate-theme', theme); } catch { /* Storage may be unavailable. */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
  }, [theme]);
  useEffect(() => {
    const raw = `${location.pathname}${location.hash}${location.search}`.toUpperCase();
    const found = myAppliances.find((a) => raw.includes(a.npid) || raw.includes(a.npid.replace('-', '')));
    if (found) { setSelectedAsset(found.id); setView('request'); }
  }, [myAppliances]);

  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800); };
  const openOrders = orders.filter((order) => order.status !== 'Completed');

  return (
    <div className="np-shell">
      <aside className="np-sidebar">
        <Brand />
        <nav className="np-nav" aria-label="Nameplate Portal">
          {(['home', 'request', 'orders', 'appliances'] as View[]).map((item, index) => (
            <button key={item} className={view === item ? 'active' : ''} onClick={() => navigate(item)}>
              <Icon name={item}/>
              <span>{item === 'home' ? 'Home' : item === 'request' ? 'Report issue' : item === 'orders' ? 'Work orders' : 'My appliances'}</span>
              <small>0{index}</small>
            </button>
          ))}
        </nav>
        <div className="np-sidebar__home">
          <span className="np-kicker">YOUR HOME</span>
          <strong>Unit 214</strong>
          <span>Sonoran Ridge Residences</span>
          <span>4820 E Camelback Rd</span>
        </div>
        <button className="np-help" onClick={() => notify('Property office: (602) 555-0148')}>
          <Icon name="help"/> Need help?
        </button>
      </aside>

      <main>
        <header className="np-topbar">
          <div className="np-topbar__context">
            <div className="np-breadcrumbs"><span>Sonoran Ridge</span><i>/</i><strong>Unit 214</strong></div>
            <h1>{view === 'home' ? 'Resident overview' : view === 'request' ? 'Report an issue' : view === 'orders' ? 'Work orders' : 'My appliances'}</h1>
          </div>
          <div className="np-topbar__actions">
            <button
              className="np-theme-toggle"
              type="button"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <span className="np-theme-toggle__thumb">
                {theme === 'light' ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.1A8.5 8.5 0 0 1 8.9 4a8.5 8.5 0 1 0 11.1 11.1Z"/></svg>
                )}
              </span>
            </button>
            <button className="np-notification" aria-label="Notifications" onClick={() => notify('You have no new notifications.')}><Icon name="bell"/></button>
            <div className="np-avatar">MJ</div>
            <div className="np-user"><strong>Maya Johnson</strong><span>Resident</span></div>
          </div>
        </header>

        {view === 'home' && <Home openOrders={openOrders} onNavigate={navigate} onScan={() => setScannerOpen(true)} onNotify={notify} />}
        {view === 'request' && (
          <RequestWizard
            appliancesList={myAppliances}
            selectedAsset={selectedAsset}
            setSelectedAsset={setSelectedAsset}
            onScan={() => setScannerOpen(true)}
            onSubmit={(order) => {
              setOrders((prev) => [order, ...prev]);
              notify(`${order.id} submitted successfully`);
              navigate('orders');
            }}
            onCancel={() => navigate('home')}
          />
        )}
        {view === 'orders' && <Orders orders={orders} onNotify={notify} onNewRequest={() => navigate('request')} />}
        {view === 'appliances' && (
          <Appliances
            appliancesList={myAppliances}
            onReport={(id) => { setSelectedAsset(id); navigate('request'); }}
            onScan={() => setScannerOpen(true)}
            onViewSpecs={(appliance) => setSpecModalAsset(appliance)}
            onNotify={notify}
          />
        )}
      </main>

      <nav className="np-mobile-nav" aria-label="Mobile navigation">
        {(['home', 'request', 'orders', 'appliances'] as View[]).map((item) => (
          <button key={item} className={view === item ? 'active' : ''} onClick={() => navigate(item)}>
            <Icon name={item}/>
            <span>{item === 'home' ? 'Home' : item === 'request' ? 'Report' : item === 'orders' ? 'Orders' : 'Appliances'}</span>
          </button>
        ))}
      </nav>

      {scannerOpen && (
        <Scanner
          onClose={() => setScannerOpen(false)}
          onFound={(assetId) => {
            setSelectedAsset(assetId);
            setScannerOpen(false);
            navigate('request');
            notify('Nameplate Tag connected');
          }}
        />
      )}

      {specModalAsset && (
        <ApplianceSpecModal
          appliance={specModalAsset}
          onClose={() => setSpecModalAsset(null)}
          onReport={() => {
            setSelectedAsset(specModalAsset.id);
            setSpecModalAsset(null);
            navigate('request');
          }}
          onNotify={notify}
        />
      )}

      {toast && <div className="np-toast"><Icon name="check" size={17}/>{toast}</div>}
    </div>
  );
}

function Home({ openOrders, onNavigate, onScan, onNotify }: { openOrders: WorkOrder[]; onNavigate: (view: View) => void; onScan: () => void; onNotify: (msg: string) => void }) {
  return (
    <div className="np-page">
      <section className="np-hero">
        <div>
          <span className="np-kicker np-kicker--red">MAINTENANCE, WITHOUT THE RUNAROUND</span>
          <h2>Something not working?</h2>
          <p>Scan the tag on your appliance or select it from your registered list. We’ll keep you updated from request to repair.</p>
          <div className="np-hero__actions">
            <button className="np-btn np-btn--primary" onClick={() => onNavigate('request')}>
              <Icon name="request"/> Report an issue
            </button>
            <button className="np-btn np-btn--outline" onClick={onScan}>
              <Icon name="scan"/> Scan appliance tag
            </button>
          </div>
        </div>
        <figure className="np-tag-preview">
          <div className="np-tag-preview__frame">
            <span className="np-tag-preview__scan"><Icon name="scan" size={13}/> SAMPLE TAG</span>
            <img src="./qr-reference-holographic.png" alt="Holographic Nameplate appliance tag with QR code and NPID NP-7K2M4QX9" />
          </div>
          <figcaption><span>LOOK FOR THIS TAG</span><strong>Usually on the front edge or side</strong></figcaption>
        </figure>
      </section>

      <section className="np-section">
        <div className="np-section__head">
          <div><span className="np-kicker">AT A GLANCE</span><h2>Your home</h2></div>
        </div>
        <div className="np-stat-grid">
          <article onClick={() => onNavigate('appliances')} style={{ cursor: 'pointer' }}>
            <Icon name="appliances"/>
            <div><strong>4</strong><span>Registered appliances</span></div>
          </article>
          <article onClick={() => onNavigate('orders')} style={{ cursor: 'pointer' }}>
            <Icon name="clock"/>
            <div><strong>{openOrders.length}</strong><span>Open work order{openOrders.length === 1 ? '' : 's'}</span></div>
          </article>
          <article>
            <Icon name="calendar"/>
            <div><strong>SEP 01</strong><span>Next appointment</span></div>
          </article>
        </div>
      </section>

      <section className="np-section">
        <div className="np-section__head">
          <div><span className="np-kicker">ACTIVE REQUESTS</span><h2>Work in progress</h2></div>
          <button className="np-link" onClick={() => onNavigate('orders')}>View all <Icon name="chevron" size={16}/></button>
        </div>
        {openOrders.length ? (
          openOrders.map((order) => <OrderCard key={order.id} order={order} compact onNotify={onNotify} />)
        ) : (
          <div className="np-empty">No open work orders. Everything in your home is in good working order.</div>
        )}
      </section>

      <div className="np-trust">
        <Icon name="shield"/>
        <div>
          <strong>Your information stays with your property team.</strong>
          <span>Nameplate only shares request details with authorized maintenance staff.</span>
        </div>
      </div>
    </div>
  );
}

/* ================= Step-by-Step Issue Reporting Wizard ================= */
function RequestWizard({
  appliancesList,
  selectedAsset,
  setSelectedAsset,
  onScan,
  onSubmit,
  onCancel,
}: {
  appliancesList: Appliance[];
  selectedAsset: string;
  setSelectedAsset: (id: string) => void;
  onScan: () => void;
  onSubmit: (order: WorkOrder) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [photo, setPhoto] = useState('');

  const activeAppliance = appliancesList.find((a) => a.id === selectedAsset);

  const handleNextFromStep1 = () => {
    if (!selectedAsset) return;
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!title.trim() || !details.trim()) return;
    setStep(3);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let woId = `WO-${1900 + Math.floor(Math.random() * 90)}`;
    try {
      const res = await fetch(`${FASTAPI_BASE}/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: details,
          priority: urgent ? 'urgent' : 'normal',
          category: activeAppliance?.name || 'General',
          propertyId: 'prop_sonoran_ridge',
          unitId: 'unit_214',
          assetNpid: activeAppliance?.npid,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        woId = `WO-${created.number}`;
      }
    } catch {
      // Offline fallback
    }

    onSubmit({
      id: woId,
      title,
      appliance: activeAppliance?.name || 'General / Other',
      status: 'Submitted',
      priority: urgent ? 'Urgent' : 'Standard',
      opened: 'Today',
      description: details,
    });
  };

  return (
    <div className="np-page np-page--narrow">
      <div className="np-wizard-header">
        <span className="np-kicker np-kicker--red">STEP 0{step} OF 03</span>
        <h2>{step === 1 ? 'Which item needs attention?' : step === 2 ? 'What is happening?' : 'Review & submit request'}</h2>
        <div className="np-wizard-bar">
          <div className={`np-wizard-segment ${step >= 1 ? 'active' : ''}`} />
          <div className={`np-wizard-segment ${step >= 2 ? 'active' : ''}`} />
          <div className={`np-wizard-segment ${step >= 3 ? 'active' : ''}`} />
        </div>
      </div>

      {step === 1 && (
        <div className="np-wizard-step">
          <p className="np-wizard-prompt">Select the registered appliance from your home, scan the physical tag, or choose other.</p>
          <div className="np-appliance-picker">
            {appliances.map((item) => (
              <div
                key={item.id}
                className={`np-picker-card ${selectedAsset === item.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedAsset(item.id)}
              >
                <div className="np-picker-card__radio">
                  {selectedAsset === item.id && <Icon name="check" size={14} />}
                </div>
                <div className="np-picker-card__icon">
                  <Icon name="appliances" size={24} />
                </div>
                <div className="np-picker-card__content">
                  <strong>{item.name}</strong>
                  <span>{item.brand} {item.model} · {item.location}</span>
                  <code>{item.npid}</code>
                </div>
              </div>
            ))}
            <div
              className={`np-picker-card ${selectedAsset === 'other' ? 'is-selected' : ''}`}
              onClick={() => setSelectedAsset('other')}
            >
              <div className="np-picker-card__radio">
                {selectedAsset === 'other' && <Icon name="check" size={14} />}
              </div>
              <div className="np-picker-card__icon">
                <Icon name="home" size={24} />
              </div>
              <div className="np-picker-card__content">
                <strong>Something else in my home</strong>
                <span>Plumbing, electrical, doors, fixtures</span>
              </div>
            </div>
          </div>

          <div className="np-picker-or">
            <span>OR</span>
          </div>

          <button type="button" className="np-btn np-btn--outline" style={{ width: '100%' }} onClick={onScan}>
            <Icon name="scan" /> Scan physical Nameplate Tag with Camera
          </button>

          <div className="np-wizard-actions">
            <button type="button" className="np-btn np-btn--outline" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="np-btn np-btn--primary"
              disabled={!selectedAsset}
              onClick={handleNextFromStep1}
            >
              Continue <Icon name="chevron" size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="np-wizard-step">
          <div className="np-detected" style={{ marginBottom: '20px' }}>
            <Icon name="check" size={16} />
            <span><b>Selected:</b> {activeAppliance ? `${activeAppliance.name} (${activeAppliance.npid})` : 'General Home Area'}</span>
          </div>

          <div className="np-form__body">
            <label htmlFor="issue">Issue Summary *</label>
            <input
              id="issue"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dishwasher is not draining water"
            />

            <label htmlFor="details" className="np-label-secondary">Detailed Description *</label>
            <textarea
              id="details"
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder="What do you see, hear, or smell? When did it start? Is there any error code displayed?"
            />
          </div>

          <div className="np-wizard-actions">
            <button type="button" className="np-btn np-btn--outline" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              className="np-btn np-btn--primary"
              disabled={!title.trim() || !details.trim()}
              onClick={handleNextFromStep2}
            >
              Continue to Review <Icon name="chevron" size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form className="np-wizard-step" onSubmit={handleSubmit}>
          <div className="np-review-summary">
            <div className="np-review-row">
              <span className="np-kicker">APPLIANCE</span>
              <strong>{activeAppliance ? `${activeAppliance.name} · ${activeAppliance.brand} ${activeAppliance.model}` : 'General fixture'}</strong>
            </div>
            <div className="np-review-row">
              <span className="np-kicker">ISSUE</span>
              <strong>{title}</strong>
              <p>{details}</p>
            </div>
          </div>

          <div className="np-form__body" style={{ marginTop: '20px' }}>
            <label>Attach a photo or short clip <span style={{ color: 'var(--white40)' }}>(Optional)</span></label>
            <label className="np-upload">
              <input type="file" accept="image/*,video/*" onChange={(e) => setPhoto(e.target.files?.[0]?.name || '')} />
              <Icon name={photo ? 'check' : 'upload'} />
              <strong>{photo || 'Add photo or video'}</strong>
              <span>{photo ? 'Ready to upload with ticket' : 'Showing the issue helps technicians bring the exact replacement part'}</span>
            </label>
          </div>

          <label className="np-urgent">
            <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
            <span className="np-checkbox">{urgent && <Icon name="check" size={14} />}</span>
            <span>
              <strong>Mark as urgent attention</strong>
              <small>Use for active water leaks, loss of cooling/heating, sparks, or security issues.</small>
            </span>
          </label>

          <div className="np-safety">
            <strong>Smelling gas, smoke, or fire danger?</strong>
            <span>Evacuate immediately and call 911. Then call the 24/7 property emergency dispatch at <b>(602) 555-0199</b>.</span>
          </div>

          <div className="np-wizard-actions">
            <button type="button" className="np-btn np-btn--outline" onClick={() => setStep(2)}>
              Back
            </button>
            <button className="np-btn np-btn--primary" type="submit">
              Submit Maintenance Request <Icon name="check" size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ================= Work Orders View ================= */
function Orders({ orders, onNotify, onNewRequest }: { orders: WorkOrder[]; onNotify: (msg: string) => void; onNewRequest: () => void }) {
  const [filter, setFilter] = useState<'Open' | 'Completed'>('Open');
  const visible = orders.filter((order) => filter === 'Completed' ? order.status === 'Completed' : order.status !== 'Completed');

  return (
    <div className="np-page">
      <div className="np-orders-header">
        <div className="np-tabs" style={{ marginBottom: 0 }}>
          <button className={filter === 'Open' ? 'active' : ''} onClick={() => setFilter('Open')}>
            Active Requests <span>{orders.filter((o) => o.status !== 'Completed').length}</span>
          </button>
          <button className={filter === 'Completed' ? 'active' : ''} onClick={() => setFilter('Completed')}>
            Completed <span>{orders.filter((o) => o.status === 'Completed').length}</span>
          </button>
        </div>
        <button className="np-btn np-btn--primary" onClick={onNewRequest} style={{ minHeight: '38px', fontSize: '11px' }}>
          <Icon name="request" size={14} /> New Request
        </button>
      </div>

      <div className="np-order-list" style={{ marginTop: '20px' }}>
        {visible.length ? (
          visible.map((order) => <OrderCard key={order.id} order={order} onNotify={onNotify} />)
        ) : (
          <div className="np-empty">No {filter.toLowerCase()} work orders found.</div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, compact = false, onNotify }: { order: WorkOrder; compact?: boolean; onNotify?: (msg: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const currentStep = statusSteps.indexOf(order.status);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <article className={`np-order ${compact ? 'np-order--compact' : ''}`}>
      <div className="np-order__top">
        <div>
          <span className="np-order__id">{order.id} · {order.appliance}</span>
          <h3>{order.title}</h3>
          {!compact && order.description && <p>{order.description}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`np-status np-status--${order.status.toLowerCase().replace(' ', '-')}`}>
            <i/>{order.status}
          </span>
          <div className="np-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="np-icon-btn"
              aria-label="Order actions"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name="more" size={16} />
            </button>
            {menuOpen && (
              <div className="np-menu-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(order.id);
                    onNotify?.(`Copied ${order.id} to clipboard`);
                    setMenuOpen(false);
                  }}
                >
                  <Icon name="copy" size={14} /> Copy Ticket Ref #{order.id}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNotify?.('Maintenance office dispatch: (602) 555-0148');
                    setMenuOpen(false);
                  }}
                >
                  <Icon name="help" size={14} /> Call Dispatch Office
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {order.appointment && (
        <div className="np-appointment">
          <Icon name="calendar"/>
          <div>
            <span>MAINTENANCE VISIT</span>
            <strong>{order.appointment}</strong>
          </div>
        </div>
      )}

      <div className="np-progress">
        {statusSteps.map((step, index) => (
          <div className={index <= currentStep ? 'done' : ''} key={step}>
            <span>{index < currentStep || order.status === 'Completed' ? <Icon name="check" size={12}/> : index + 1}</span>
            <small>{step}</small>
          </div>
        ))}
      </div>

      <div className="np-order__footer">
        <span>Opened {order.opened}</span>
        <span className={order.priority === 'Urgent' ? 'np-kicker--red' : ''}>{order.priority} priority</span>
      </div>
    </article>
  );
}

/* ================= Appliances View ================= */
function Appliances({
  appliancesList = appliances,
  onReport,
  onScan,
  onViewSpecs,
  onNotify,
}: {
  appliancesList?: Appliance[];
  onReport: (id: string) => void;
  onScan: () => void;
  onViewSpecs: (appliance: Appliance) => void;
  onNotify: (msg: string) => void;
}) {
  return (
    <div className="np-page">
      <div className="np-appliance-lead">
        <div>
          <span className="np-kicker np-kicker--red">YOUR HOME’S EQUIPMENT</span>
          <h2>{appliancesList.length} appliances registered.</h2>
          <p>Every major appliance in Unit 214 has a verified digital service ledger.</p>
        </div>
        <button className="np-btn np-btn--outline" onClick={onScan}>
          <Icon name="scan"/> Scan tag
        </button>
      </div>

      <div className="np-appliance-grid">
        {appliancesList.map((item, index) => (
          <ApplianceCard
            key={item.id}
            appliance={item}
            index={index}
            onReport={onReport}
            onViewSpecs={onViewSpecs}
            onNotify={onNotify}
          />
        ))}
      </div>
    </div>
  );
}

function ApplianceCard({
  appliance,
  index,
  onReport,
  onViewSpecs,
  onNotify,
}: {
  appliance: Appliance;
  index: number;
  onReport: (id: string) => void;
  onViewSpecs: (appliance: Appliance) => void;
  onNotify: (msg: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <article className="np-appliance">
      <div className="np-appliance__visual">
        <span>0{index + 1}</span>
        <img
          src={`./schematics/${appliance.id}.png`}
          alt={appliance.name}
          className="np-appliance__schematic"
          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
        />
        <Icon name="appliances" size={42}/>
      </div>

      <div className="np-appliance__body">
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="np-kicker">{appliance.location}</span>
            <h3>{appliance.name}</h3>
            <p>{appliance.brand} · {appliance.model}</p>
          </div>
          <div className="np-menu-wrap" ref={menuRef}>
            <button
              type="button"
              className="np-icon-btn"
              aria-label="Appliance options"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name="more" size={16} />
            </button>
            {menuOpen && (
              <div className="np-menu-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onViewSpecs(appliance);
                  }}
                >
                  <Icon name="info" size={14} /> View Equipment Specs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(appliance.npid);
                    onNotify(`Copied ${appliance.npid} to clipboard`);
                    setMenuOpen(false);
                  }}
                >
                  <Icon name="copy" size={14} /> Copy NPID Tag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onReport(appliance.id);
                  }}
                >
                  <Icon name="request" size={14} /> Request Maintenance
                </button>
              </div>
            )}
          </div>
        </div>

        <code>{appliance.npid}</code>
        <div className="np-appliance__service">
          <Icon name="clock" size={16}/>{appliance.lastService}
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', width: '100%' }}>
          <button className="np-btn np-btn--primary" style={{ flex: 1, minHeight: '38px', fontSize: '11px' }} onClick={() => onReport(appliance.id)}>
            Report Issue
          </button>
          <button className="np-btn np-btn--outline" style={{ minHeight: '38px', padding: '0 12px' }} onClick={() => onViewSpecs(appliance)} title="View Specs">
            <Icon name="info" size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ================= Appliance Detail / Specs Modal ================= */
function ApplianceSpecModal({
  appliance,
  onClose,
  onReport,
  onNotify,
}: {
  appliance: Appliance;
  onClose: () => void;
  onReport: () => void;
  onNotify: (msg: string) => void;
}) {
  return (
    <div className="np-modal" role="dialog" aria-modal="true" aria-label="Equipment Specifications">
      <div className="np-spec-modal">
        <div className="np-spec-modal__head">
          <div>
            <span className="np-kicker np-kicker--red">EQUIPMENT LEDGER</span>
            <h2>{appliance.name}</h2>
          </div>
          <button className="np-icon-btn" aria-label="Close modal" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="np-spec-modal__body">
          <div className="np-spec-grid">
            <div className="np-spec-item">
              <span>MANUFACTURER</span>
              <strong>{appliance.brand}</strong>
            </div>
            <div className="np-spec-item">
              <span>MODEL NUMBER</span>
              <strong>{appliance.model}</strong>
            </div>
            <div className="np-spec-item">
              <span>LOCATION</span>
              <strong>{appliance.location}</strong>
            </div>
            <div className="np-spec-item">
              <span>SERIAL</span>
              <strong>{appliance.serial || 'Verified on file'}</strong>
            </div>
            <div className="np-spec-item">
              <span>INSTALL DATE</span>
              <strong>{appliance.installDate || 'Verified'}</strong>
            </div>
            <div className="np-spec-item">
              <span>LAST SERVICED</span>
              <strong>{appliance.lastService}</strong>
            </div>
          </div>

          <div className="np-spec-npid-box">
            <div>
              <span>PHYSICAL NAMEPLATE TAG</span>
              <code>{appliance.npid}</code>
            </div>
            <button
              type="button"
              className="np-btn np-btn--outline"
              style={{ minHeight: '34px', fontSize: '10px' }}
              onClick={() => {
                navigator.clipboard?.writeText(appliance.npid);
                onNotify(`Copied ${appliance.npid}`);
              }}
            >
              <Icon name="copy" size={13} /> Copy Tag
            </button>
          </div>
        </div>

        <div className="np-spec-modal__footer">
          <button className="np-btn np-btn--outline" onClick={onClose}>Close</button>
          <button className="np-btn np-btn--primary" onClick={onReport}>Report Issue on this Unit</button>
        </div>
      </div>
    </div>
  );
}

/* ================= Camera Scanner Modal ================= */
function Scanner({ onClose, onFound }: { onClose: () => void; onFound: (assetId: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraState, setCameraState] = useState<'starting' | 'live' | 'unavailable'>('starting');
  const [manual, setManual] = useState('');

  useEffect(() => {
    let stream: MediaStream | undefined;
    let active = true;
    const timeout = window.setTimeout(() => { if (active) setCameraState('unavailable'); }, 5000);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
    } else {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then((result) => {
        if (!active) { result.getTracks().forEach((track) => track.stop()); return; }
        stream = result;
        window.clearTimeout(timeout);
        if (videoRef.current) { videoRef.current.srcObject = result; void videoRef.current.play(); }
        setCameraState('live');
      }).catch(() => { window.clearTimeout(timeout); if (active) setCameraState('unavailable'); });
    }
    return () => { active = false; window.clearTimeout(timeout); stream?.getTracks().forEach((track) => track.stop()); };
  }, []);

  const matchManual = () => {
    const normalized = manual.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const asset = appliances.find((item) => item.npid.replace('-', '') === normalized);
    onFound(asset?.id || 'dishwasher');
  };

  return (
    <div className="np-modal" role="dialog" aria-modal="true" aria-label="Scan appliance tag">
      <div className="np-scanner">
        <div className="np-scanner__head">
          <Brand/>
          <button aria-label="Close scanner" onClick={onClose}><Icon name="close"/></button>
        </div>
        <div className="np-camera">
          <video ref={videoRef} muted playsInline/>
          <div className="np-reticle"><span/><span/><span/><span/><i/></div>
          {cameraState !== 'live' && (
            <div className="np-camera__message">
              <Icon name="camera" size={30}/>
              <strong>{cameraState === 'starting' ? 'Starting camera…' : 'Camera unavailable'}</strong>
              <span>{cameraState === 'unavailable' ? 'Enter the tag number below.' : 'Allow camera access when prompted.'}</span>
            </div>
          )}
          <button className="np-demo-scan" onClick={() => onFound('dishwasher')}>Simulate tag scan</button>
        </div>
        <div className="np-scanner__copy">
          <span className="np-kicker np-kicker--red">SCAN NAMEPLATE TAG</span>
          <h2>Hold steady over the square tag.</h2>
          <p>The tag is usually located on the front edge, side, or inside door frame of the appliance.</p>
          <div className="np-manual">
            <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Enter NPID, e.g. NP-7H3P9X2C"/>
            <button onClick={matchManual} disabled={!manual.trim()}>Use tag</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
