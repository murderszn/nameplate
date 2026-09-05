import { useEffect, useRef, useState, type FormEvent } from 'react';

type View = 'home' | 'request' | 'orders';
type Theme = 'light' | 'dark';
type IconName = View | 'appliances' | 'scan' | 'chevron' | 'clock' | 'calendar' | 'check' | 'close' | 'camera' | 'upload' | 'help' | 'shield' | 'user' | 'bell' | 'more' | 'info' | 'copy' | 'chat' | 'send';

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

/* Isometric line-art illustrations (portal/public/iso). Same set the
   marketing site uses; strokes are dark so they sit on a light tile. */
const APPLIANCE_ISO_BY_ID: Record<string, string> = {
  fridge: 'fridge.svg',
  dishwasher: 'dishwasher.svg',
  washer: 'washer.svg',
  dryer: 'dryer.svg',
  hvac: 'hvac.svg',
  microwave: 'microwave.svg',
  thermostat: 'thermostat.svg',
};

function applianceIsoSrc(id: string, name: string): string | null {
  if (APPLIANCE_ISO_BY_ID[id]) return APPLIANCE_ISO_BY_ID[id];
  const key = `${id} ${name}`.toLowerCase();
  if (key.includes('fridge') || key.includes('refrigerat')) return 'fridge.svg';
  if (key.includes('dish')) return 'dishwasher.svg';
  if (key.includes('dryer')) return 'dryer.svg';
  if (key.includes('wash')) return 'washer.svg';
  if (key.includes('micro')) return 'microwave.svg';
  if (key.includes('thermo')) return 'thermostat.svg';
  if (key.includes('range') || key.includes('stove') || key.includes('oven')) return 'range.svg';
  if (key.includes('water') || key.includes('heater')) return 'water-heater.svg';
  if (key.includes('condens')) return 'condenser.svg';
  const words = key.split(/[^a-z]+/);
  if (key.includes('hvac') || words.includes('air') || key.includes('cool') || key.includes('heat') || key.includes('a/c')) return 'hvac.svg';
  if (words.includes('ac')) return 'hvac.svg';
  return null;
}

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
    chat: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
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
  const [chatOpen, setChatOpen] = useState(false);
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
          {(['home', 'request', 'orders'] as View[]).map((item, index) => (
            <button key={item} className={view === item ? 'active' : ''} onClick={() => navigate(item)}>
              <Icon name={item}/>
              <span>{item === 'home' ? 'Home' : item === 'request' ? 'Report issue' : 'Work orders'}</span>
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
        <button className="np-dispatch" onClick={() => setChatOpen(true)}>
          <Icon name="chat"/> Message dispatch
        </button>
        <button className="np-help" onClick={() => notify('Property office: (602) 555-0148')}>
          <Icon name="help"/> Need help?
        </button>
      </aside>

      <main>
        <header className="np-topbar">
          <div className="np-topbar__context">
            <div className="np-breadcrumbs"><span>Sonoran Ridge</span><i>/</i><strong>Unit 214</strong></div>
            <h1>{view === 'home' ? 'Resident overview' : view === 'request' ? 'Report an issue' : 'Work orders'}</h1>
          </div>
          <div className="np-topbar__actions">
            <button
              className="np-theme-btn"
              type="button"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              aria-pressed={theme === 'dark'}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
              )}
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
            onNotify={notify}
          />
        )}
        {view === 'orders' && <Orders orders={orders} onNotify={notify} onNewRequest={() => navigate('request')} />}
      </main>

      <nav className="np-mobile-nav" aria-label="Mobile navigation">
        {(['home', 'request', 'orders'] as View[]).map((item) => (
          <button key={item} className={view === item ? 'active' : ''} onClick={() => navigate(item)}>
            <Icon name={item}/>
            <span>{item === 'home' ? 'Home' : item === 'request' ? 'Report' : 'Orders'}</span>
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

      {chatOpen && (
        <DispatchChat
          orders={orders}
          onClose={() => setChatOpen(false)}
          onNewRequest={() => {
            setChatOpen(false);
            navigate('request');
          }}
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
          <article onClick={() => onNavigate('request')} style={{ cursor: 'pointer' }}>
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
  onNotify,
}: {
  appliancesList: Appliance[];
  selectedAsset: string;
  setSelectedAsset: (id: string) => void;
  onScan: () => void;
  onSubmit: (order: WorkOrder) => void;
  onCancel: () => void;
  onNotify: (msg: string) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [photo, setPhoto] = useState('');
  const [specAsset, setSpecAsset] = useState<Appliance | null>(null);

  const selectAndContinue = (id: string) => {
    setSelectedAsset(id);
    setStep(2);
    window.scrollTo({ top: 0 });
  };

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
          <div className="np-appliance-grid">
            {appliancesList.map((item, index) => (
              <ApplianceCard
                key={item.id}
                appliance={item}
                index={index}
                onReport={selectAndContinue}
                onViewSpecs={setSpecAsset}
                onNotify={onNotify}
              />
            ))}
          </div>

          <div
            className={`np-picker-card ${selectedAsset === 'other' ? 'is-selected' : ''}`}
            onClick={() => setSelectedAsset('other')}
            style={{ marginTop: '10px' }}
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

      {specAsset && (
        <ApplianceSpecModal
          appliance={specAsset}
          onClose={() => setSpecAsset(null)}
          onReport={() => {
            const id = specAsset.id;
            setSpecAsset(null);
            selectAndContinue(id);
          }}
          onNotify={onNotify}
        />
      )}
    </div>
  );
}

/* ================= Work Orders View ================= */
const TRACK_STEPS = [
  { key: 'Submitted', blurb: 'Request received. The property team has your ticket.' },
  { key: 'Scheduled', blurb: 'A visit window is set. We’ll notify you of any change.' },
  { key: 'In progress', blurb: 'A technician is actively working on it.' },
  { key: 'Completed', blurb: 'Fixed and signed off.' },
] as const;

function StatusChain({ order }: { order: WorkOrder }) {
  const currentStep = statusSteps.indexOf(order.status);
  const settled = order.status === 'Completed';

  return (
    <ol className="np-timeline">
      {TRACK_STEPS.map((step, index) => {
        const state = settled || index < currentStep ? 'done' : index === currentStep ? 'current' : 'next';
        return (
          <li key={step.key} className={`np-timeline__step is-${state}`}>
            <span className="np-timeline__marker">
              {state === 'done' ? <Icon name="check" size={12} /> : state === 'current' ? <i /> : null}
            </span>
            <div className="np-timeline__body">
              <strong>{step.key}{state === 'current' && <em> · Current</em>}</strong>
              <span>
                {step.key === 'Scheduled' && !order.appointment
                  ? 'Waiting on a visit window — we’ll notify you as soon as one is set.'
                  : step.blurb}
              </span>
              {step.key === 'Scheduled' && order.appointment && (
                <div className="np-appointment">
                  <Icon name="calendar" />
                  <div>
                    <span>MAINTENANCE VISIT</span>
                    <strong>{order.appointment}</strong>
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TrackingHero({ order, onNotify }: { order: WorkOrder; onNotify?: (msg: string) => void }) {
  return (
    <article className="np-track">
      <div className="np-track__head">
        <div>
          <span className="np-kicker np-kicker--red">NOW TRACKING</span>
          <span className="np-order__id">{order.id} · {order.appliance}</span>
          <h2>{order.title}</h2>
          {order.description && <p>{order.description}</p>}
        </div>
        <span className={`np-status np-status--${order.status.toLowerCase().replace(' ', '-')}`}>
          <i />{order.status}
        </span>
      </div>

      <StatusChain order={order} />

      <div className="np-order__footer">
        <span>Opened {order.opened}</span>
        <span className={order.priority === 'Urgent' ? 'np-kicker--red' : ''}>{order.priority} priority</span>
        <button
          type="button"
          className="np-link"
          onClick={() => {
            navigator.clipboard?.writeText(order.id);
            onNotify?.(`Copied ${order.id} to clipboard`);
          }}
        >
          Copy ticket ref <Icon name="copy" size={14} />
        </button>
      </div>
    </article>
  );
}

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

      {filter === 'Open' && visible.length > 0 ? (
        <>
          <TrackingHero order={visible[0]} onNotify={onNotify} />
          {visible.length > 1 && (
            <section className="np-section">
              <div className="np-section__head">
                <div><span className="np-kicker">QUEUED</span><h2>Also in progress</h2></div>
              </div>
              {visible.slice(1).map((order) => <OrderCard key={order.id} order={order} compact onNotify={onNotify} />)}
            </section>
          )}
        </>
      ) : (
        <div className="np-order-list" style={{ marginTop: '20px' }}>
          {visible.length ? (
            visible.map((order) => <OrderCard key={order.id} order={order} onNotify={onNotify} />)
          ) : (
            <div className="np-empty">No {filter.toLowerCase()} work orders found.</div>
          )}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, compact = false, onNotify }: { order: WorkOrder; compact?: boolean; onNotify?: (msg: string) => void }) {
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

      {!compact && <StatusChain order={order} />}

      <div className="np-order__footer">
        <span>Opened {order.opened}</span>
        <span className={order.priority === 'Urgent' ? 'np-kicker--red' : ''}>{order.priority} priority</span>
      </div>
    </article>
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

  const isoSrc = applianceIsoSrc(appliance.id, appliance.name);

  return (
    <article className="np-appliance">
      <div className="np-appliance__visual">
        <span>0{index + 1}</span>
        {isoSrc && (
          <img
            src={`./iso/${isoSrc}`}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="np-appliance__schematic"
            onError={(e) => { e.currentTarget.remove(); }}
          />
        )}
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
  const isoSrc = applianceIsoSrc(appliance.id, appliance.name);

  return (
    <div className="np-modal" role="dialog" aria-modal="true" aria-label="Equipment Specifications">
      <div className="np-spec-modal">
        <div className="np-spec-modal__head">
          {isoSrc && (
            <img
              src={`./iso/${isoSrc}`}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="np-spec-modal__iso"
              onError={(e) => { e.currentTarget.remove(); }}
            />
          )}
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

/* ================= Dispatch Help-Desk Chat ================= */
type ChatMessage = { id: number; from: 'dispatch' | 'me'; text: string };

const DISPATCH_PHONE = '(602) 555-0148';
const DISPATCH_EMERGENCY = '(602) 555-0199';

export function dispatchReply(text: string, orders: WorkOrder[]): { text: string; action?: 'report' } {
  const raw = text.toLowerCase();
  const open = orders.filter((o) => o.status !== 'Completed');
  const refMatch = text.toUpperCase().match(/WO-\d+/);
  const referenced = refMatch ? orders.find((o) => o.id.toUpperCase() === refMatch[0]) : undefined;

  const describe = (o: WorkOrder) => {
    const appt = o.appointment ? ` Visit: ${o.appointment}.` : ' No visit window set yet — we’ll notify you.';
    return `${o.id} (${o.appliance}) is ${o.status.toLowerCase()}.${appt} Opened ${o.opened}.`;
  };

  if (/(^|\W)(hi|hey|hello|yo|good (morning|afternoon|evening))(\W|$)/.test(raw)) {
    return {
      text: open.length
        ? `Hi Maya — dispatch here. You have ${open.length} open request${open.length === 1 ? '' : 's'} right now. Ask me for a status update, your next visit, or to report something new.`
        : 'Hi Maya — dispatch here. No open requests on your home right now. Anything I can help with?',
    };
  }
  if (/(gas|smoke|fire|flood|burst|spark|shock|leak|urgent|emergency|no heat|no cool|carbon)/.test(raw)) {
    if (/(gas|smoke|fire|carbon)/.test(raw)) {
      return { text: `If anyone is unsafe, evacuate and call 911 first. Then reach our 24/7 emergency line at ${DISPATCH_EMERGENCY}.` };
    }
    return { text: `That sounds urgent — call our 24/7 emergency dispatch at ${DISPATCH_EMERGENCY} so a tech can be sent right away. Anything non-urgent can go to ${DISPATCH_PHONE}.` };
  }
  if (/(human|agent|person|someone|real|call|phone|number|talk)/.test(raw)) {
    return { text: `You can reach the dispatch office at ${DISPATCH_PHONE}, or 24/7 emergencies at ${DISPATCH_EMERGENCY}. A dispatcher also reviews every message here.` };
  }
  if (refMatch) {
    return {
      text: referenced
        ? describe(referenced)
        : `I can’t find ${refMatch[0]} on your home. Your open request${open.length === 1 ? ' is' : 's are'}${open.length ? ` ${open.map((o) => o.id).join(', ')}` : ' none — everything is closed out'}.`,
    };
  }
  if (/(appointment|schedule|visit|reschedul|when.*(come|visit|arrive|tech|fix))/i.test(text)) {
    const withAppt = open.filter((o) => o.appointment);
    if (withAppt.length) {
      return { text: `Next visit: ${withAppt[0].appointment} for ${withAppt[0].id} (${withAppt[0].title}). Reply here if you need to move it.` };
    }
    return { text: open.length ? 'No visit window is set on your open requests yet — we’ll notify you as soon as one is scheduled.' : 'No open requests, so nothing is scheduled. Want to report an issue?' };
  }
  if (/(status|where|update|progress|track)/.test(raw)) {
    if (!open.length) return { text: 'Nothing open right now — all of your requests are completed. Want to report something new?' };
    if (open.length === 1) return { text: describe(open[0]) };
    return { text: `Here’s where everything stands: ${open.map(describe).join(' ')}` };
  }
  if (/(report|new issue|broken|broke|fix|not working|won't|doesn't|noise|rattle|drip)/.test(raw)) {
    return { text: 'I can start that now — opening the report form for you.', action: 'report' };
  }
  if (/(thank|thx|great|perfect|awesome|appreciated)/.test(raw)) {
    return { text: 'You’re welcome — that’s what we’re here for. Anything else on your home?' };
  }
  return { text: 'Thanks — I’ve logged that for the dispatch team, and they’ll follow up here if they need anything. Meanwhile I can check a request status, your next visit, or start a new report.' };
}

function DispatchChat({ orders, onClose, onNewRequest }: { orders: WorkOrder[]; onClose: () => void; onNewRequest: () => void }) {
  const openCount = orders.filter((o) => o.status !== 'Completed').length;
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      from: 'dispatch',
      text: openCount
        ? `Hi Maya — dispatch here. You have ${openCount} open request${openCount === 1 ? '' : 's'}. Ask me for a status update or your next visit.`
        : 'Hi Maya — dispatch here. No open requests right now. How can I help?',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const idRef = useRef(1);
  const timerRef = useRef<number | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, typing]);

  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    setMessages((prev) => [...prev, { id: idRef.current++, from: 'me', text }]);
    setDraft('');
    setTyping(true);
    timerRef.current = window.setTimeout(() => {
      const reply = dispatchReply(text, orders);
      setMessages((prev) => [...prev, { id: idRef.current++, from: 'dispatch', text: reply.text }]);
      setTyping(false);
      if (reply.action === 'report') {
        timerRef.current = window.setTimeout(() => onNewRequest(), 650);
      }
    }, 900);
  };

  const chips = ["Where's my request?", 'When is my visit?', 'Report a new issue', 'Call dispatch'];

  return (
    <div className="np-modal" role="dialog" aria-modal="true" aria-label="Message property dispatch">
      <div className="np-chat">
        <div className="np-chat__head">
          <span className="np-chat__avatar"><Icon name="chat" size={18} /></span>
          <div className="np-chat__meta">
            <strong>Property Dispatch</strong>
            <span className="np-chat__status"><i />Online · typically replies in minutes</span>
          </div>
          <a className="np-chat__call" href="tel:+16025550148">Call</a>
          <button type="button" className="np-icon-btn" aria-label="Close chat" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="np-chat__body" ref={bodyRef}>
          {messages.map((m) => (
            <div key={m.id} className={`np-bubble np-bubble--${m.from === 'me' ? 'out' : 'in'}`}>{m.text}</div>
          ))}
          {typing && (
            <div className="np-bubble np-bubble--in np-typing" aria-label="Dispatch is typing"><span /><span /><span /></div>
          )}
        </div>

        <div className="np-chips">
          {chips.map((c) => (
            <button key={c} type="button" className="np-chip" onClick={() => send(c)}>{c}</button>
          ))}
        </div>

        <form className="np-chat__composer" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message dispatch…"
            aria-label="Message dispatch"
            autoFocus
          />
          <button type="submit" className="np-chat__send" aria-label="Send message" disabled={!draft.trim()}>
            <Icon name="send" size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
