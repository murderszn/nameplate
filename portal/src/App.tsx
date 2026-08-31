import { useEffect, useRef, useState, type FormEvent } from 'react';

type View = 'home' | 'request' | 'orders' | 'appliances';
type Theme = 'light' | 'dark';
type IconName = View | 'scan' | 'chevron' | 'clock' | 'calendar' | 'check' | 'close' | 'camera' | 'upload' | 'help' | 'shield' | 'user' | 'bell';

type Appliance = {
  id: string;
  npid: string;
  name: string;
  brand: string;
  model: string;
  location: string;
  lastService: string;
};

type WorkOrder = {
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
  { id: 'fridge', npid: 'NP-4K8D2M7Q', name: 'Refrigerator', brand: 'GE', model: 'GNE27JYMFS', location: 'Kitchen', lastService: 'No service on record' },
  { id: 'dishwasher', npid: 'NP-7H3P9X2C', name: 'Dishwasher', brand: 'Whirlpool', model: 'WDT730HAMZ', location: 'Kitchen', lastService: 'Serviced Jun 12, 2026' },
  { id: 'washer', npid: 'NP-2N6R4T8W', name: 'Washer', brand: 'Samsung', model: 'WF45T6000AW', location: 'Laundry', lastService: 'Serviced Feb 03, 2026' },
  { id: 'hvac', npid: 'NP-9V5B1L6S', name: 'Air conditioner', brand: 'Trane', model: 'XR14', location: 'Utility closet', lastService: 'Serviced Aug 18, 2026' },
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

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return localStorage.getItem('nameplate-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  const [view, setView] = useState<View>('home');
  const [orders, setOrders] = useState<WorkOrder[]>(() => {
    try { return JSON.parse(localStorage.getItem('np_resident_orders') || 'null') || seededOrders; } catch { return seededOrders; }
  });
  const [selectedAsset, setSelectedAsset] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { localStorage.setItem('np_resident_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('nameplate-theme', theme); } catch { /* Storage may be unavailable. */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
  }, [theme]);
  useEffect(() => {
    const raw = `${location.pathname}${location.hash}${location.search}`.toUpperCase();
    const found = appliances.find((a) => raw.includes(a.npid) || raw.includes(a.npid.replace('-', '')));
    if (found) { setSelectedAsset(found.id); setView('request'); }
  }, []);

  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800); };
  const openOrders = orders.filter((order) => order.status !== 'Completed');

  return (
    <div className="np-shell">
      <aside className="np-sidebar">
        <Brand />
        <nav className="np-nav" aria-label="Nameplate Portal">
          {(['home', 'request', 'orders', 'appliances'] as View[]).map((item, index) => <button key={item} className={view === item ? 'active' : ''} onClick={() => navigate(item)}><Icon name={item}/><span>{item === 'home' ? 'Home' : item === 'request' ? 'Report an issue' : item === 'orders' ? 'Work orders' : 'My appliances'}</span><small>0{index}</small></button>)}
        </nav>
        <div className="np-sidebar__home"><span className="np-kicker">YOUR HOME</span><strong>Unit 214</strong><span>Sonoran Ridge Residences</span><span>4820 E Camelback Rd</span></div>
        <button className="np-help" onClick={() => notify('Property office: (602) 555-0148')}><Icon name="help"/> Need help?</button>
      </aside>

      <main>
        <header className="np-topbar">
          <div className="np-topbar__context">
            <div className="np-breadcrumbs"><span>Sonoran Ridge</span><i>/</i><strong>Unit 214</strong></div>
            <h1>{view === 'home' ? 'Resident overview' : view === 'request' ? 'Report an issue' : view === 'orders' ? 'Work orders' : 'My appliances'}</h1>
          </div>
          <div className="np-topbar__actions">
            <button className="np-theme-toggle" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-pressed={theme === 'dark'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><span className="np-theme-toggle__thumb">{theme === 'light' ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.1A8.5 8.5 0 0 1 8.9 4a8.5 8.5 0 1 0 11.1 11.1Z"/></svg>}</span></button>
            <button className="np-notification" aria-label="Notifications" onClick={() => notify('You have no new notifications.')}><Icon name="bell"/></button>
            <div className="np-avatar">MJ</div><div className="np-user"><strong>Maya Johnson</strong><span>Resident</span></div>
          </div>
        </header>

        {view === 'home' && <Home openOrders={openOrders} onNavigate={navigate} onScan={() => setScannerOpen(true)} />}
        {view === 'request' && <RequestForm selectedAsset={selectedAsset} setSelectedAsset={setSelectedAsset} onScan={() => setScannerOpen(true)} onSubmit={(order) => { setOrders((prev) => [order, ...prev]); notify(`${order.id} submitted`); navigate('orders'); }} />}
        {view === 'orders' && <Orders orders={orders} />}
        {view === 'appliances' && <Appliances onReport={(id) => { setSelectedAsset(id); navigate('request'); }} onScan={() => setScannerOpen(true)} />}
      </main>

      <nav className="np-mobile-nav" aria-label="Mobile navigation">{(['home', 'request', 'orders', 'appliances'] as View[]).map((item) => <button key={item} className={view === item ? 'active' : ''} onClick={() => navigate(item)}><Icon name={item}/><span>{item === 'home' ? 'Home' : item === 'request' ? 'Report' : item === 'orders' ? 'Orders' : 'Appliances'}</span></button>)}</nav>
      {scannerOpen && <Scanner onClose={() => setScannerOpen(false)} onFound={(assetId) => { setSelectedAsset(assetId); setScannerOpen(false); navigate('request'); notify('Nameplate Tag found'); }} />}
      {toast && <div className="np-toast"><Icon name="check" size={17}/>{toast}</div>}
    </div>
  );
}

function Home({ openOrders, onNavigate, onScan }: { openOrders: WorkOrder[]; onNavigate: (view: View) => void; onScan: () => void }) {
  return <div className="np-page">
    <section className="np-hero"><div><span className="np-kicker np-kicker--red">MAINTENANCE, WITHOUT THE RUNAROUND</span><h2>Something not working?</h2><p>Scan the tag on your appliance or tell us what’s wrong. We’ll keep you updated from request to repair.</p><div className="np-hero__actions"><button className="np-btn np-btn--primary" onClick={() => onNavigate('request')}><Icon name="request"/> Report an issue</button><button className="np-btn np-btn--outline" onClick={onScan}><Icon name="scan"/> Scan appliance tag</button></div></div><figure className="np-tag-preview"><div className="np-tag-preview__frame"><span className="np-tag-preview__scan"><Icon name="scan" size={13}/> SAMPLE TAG</span><img src="./qr-reference-holographic.png" alt="Holographic Nameplate appliance tag with QR code and NPID NP-7K2M4QX9" /></div><figcaption><span>LOOK FOR THIS TAG</span><strong>Usually on the front edge or side</strong></figcaption></figure></section>
    <section className="np-section"><div className="np-section__head"><div><span className="np-kicker">AT A GLANCE</span><h2>Your home</h2></div></div><div className="np-stat-grid"><article><Icon name="appliances"/><div><strong>4</strong><span>Registered appliances</span></div></article><article><Icon name="clock"/><div><strong>{openOrders.length}</strong><span>Open work order{openOrders.length === 1 ? '' : 's'}</span></div></article><article><Icon name="calendar"/><div><strong>SEP 01</strong><span>Next appointment</span></div></article></div></section>
    <section className="np-section"><div className="np-section__head"><div><span className="np-kicker">ACTIVE REQUESTS</span><h2>Work in progress</h2></div><button className="np-link" onClick={() => onNavigate('orders')}>View all <Icon name="chevron" size={16}/></button></div>{openOrders.length ? openOrders.map((order) => <OrderCard key={order.id} order={order} compact />) : <div className="np-empty">No open work orders.</div>}</section>
    <div className="np-trust"><Icon name="shield"/><div><strong>Your information stays with your property team.</strong><span>Nameplate only shares request details with authorized maintenance staff.</span></div></div>
  </div>;
}

function RequestForm({ selectedAsset, setSelectedAsset, onScan, onSubmit }: { selectedAsset: string; setSelectedAsset: (id: string) => void; onScan: () => void; onSubmit: (order: WorkOrder) => void }) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [photo, setPhoto] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const asset = appliances.find((item) => item.id === selectedAsset);
    onSubmit({ id: `WO-${1900 + Math.floor(Math.random() * 90)}`, title, appliance: asset?.name || 'Home / other', status: 'Submitted', priority: urgent ? 'Urgent' : 'Standard', opened: 'Today', description: details });
  };
  return <div className="np-page np-page--narrow"><div className="np-intro"><span className="np-kicker np-kicker--red">NEW MAINTENANCE REQUEST</span><h2>Tell us what’s happening.</h2><p>A clear description helps the maintenance team arrive with the right parts.</p></div><form className="np-form" onSubmit={submit}>
    <div className="np-form__section"><div className="np-form__number">01</div><div className="np-form__body"><label>Which appliance or area?</label><div className="np-select-row"><select required value={selectedAsset} onChange={(event) => setSelectedAsset(event.target.value)}><option value="">Choose an appliance</option>{appliances.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.location}</option>)}<option value="other">Something else in my home</option></select><button type="button" className="np-btn np-btn--outline" onClick={onScan}><Icon name="scan"/> Scan tag</button></div>{selectedAsset && selectedAsset !== 'other' && <div className="np-detected"><Icon name="check" size={16}/><span><b>Nameplate Tag connected</b> · {appliances.find((a) => a.id === selectedAsset)?.npid}</span></div>}</div></div>
    <div className="np-form__section"><div className="np-form__number">02</div><div className="np-form__body"><label htmlFor="issue">What’s wrong?</label><input id="issue" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: Dishwasher is not draining"/><label htmlFor="details" className="np-label-secondary">Add details</label><textarea id="details" required value={details} onChange={(event) => setDetails(event.target.value)} rows={5} placeholder="What do you see or hear? When did it start?"/></div></div>
    <div className="np-form__section"><div className="np-form__number">03</div><div className="np-form__body"><label>Photo or short video <span>Optional</span></label><label className="np-upload"><input type="file" accept="image/*,video/*" onChange={(event) => setPhoto(event.target.files?.[0]?.name || '')}/><Icon name={photo ? 'check' : 'upload'}/><strong>{photo || 'Add a photo or video'}</strong><span>{photo ? 'Ready to attach' : 'Show the issue or any error code'}</span></label></div></div>
    <label className="np-urgent"><input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)}/><span className="np-checkbox">{urgent && <Icon name="check" size={14}/>}</span><span><strong>This needs urgent attention</strong><small>Use for no cooling, active leaks, sparks, smoke, or loss of essential service.</small></span></label>
    <div className="np-safety"><strong>Gas smell, fire, or immediate danger?</strong><span>Leave the area and call 911. Then call the property emergency line at <b>(602) 555-0199</b>.</span></div>
    <button className="np-btn np-btn--primary np-btn--submit" type="submit">Submit request <Icon name="chevron"/></button>
  </form></div>;
}

function Orders({ orders }: { orders: WorkOrder[] }) {
  const [filter, setFilter] = useState<'Open' | 'Completed'>('Open');
  const visible = orders.filter((order) => filter === 'Completed' ? order.status === 'Completed' : order.status !== 'Completed');
  return <div className="np-page"><div className="np-tabs"><button className={filter === 'Open' ? 'active' : ''} onClick={() => setFilter('Open')}>Open <span>{orders.filter((o) => o.status !== 'Completed').length}</span></button><button className={filter === 'Completed' ? 'active' : ''} onClick={() => setFilter('Completed')}>Completed <span>{orders.filter((o) => o.status === 'Completed').length}</span></button></div><div className="np-order-list">{visible.map((order) => <OrderCard key={order.id} order={order}/>)}</div></div>;
}

function OrderCard({ order, compact = false }: { order: WorkOrder; compact?: boolean }) {
  const currentStep = statusSteps.indexOf(order.status);
  return <article className={`np-order ${compact ? 'np-order--compact' : ''}`}><div className="np-order__top"><div><span className="np-order__id">{order.id} · {order.appliance}</span><h3>{order.title}</h3>{!compact && order.description && <p>{order.description}</p>}</div><span className={`np-status np-status--${order.status.toLowerCase().replace(' ', '-')}`}><i/>{order.status}</span></div>{order.appointment && <div className="np-appointment"><Icon name="calendar"/><div><span>MAINTENANCE VISIT</span><strong>{order.appointment}</strong></div></div>}<div className="np-progress">{statusSteps.map((step, index) => <div className={index <= currentStep ? 'done' : ''} key={step}><span>{index < currentStep || order.status === 'Completed' ? <Icon name="check" size={12}/> : index + 1}</span><small>{step}</small></div>)}</div><div className="np-order__footer"><span>Opened {order.opened}</span><span>{order.priority} priority</span></div></article>;
}

function Appliances({ onReport, onScan }: { onReport: (id: string) => void; onScan: () => void }) {
  return <div className="np-page"><div className="np-appliance-lead"><div><span className="np-kicker np-kicker--red">YOUR HOME’S EQUIPMENT</span><h2>4 appliances are registered.</h2><p>Scanning a Nameplate Tag connects your request to the exact model and service history.</p></div><button className="np-btn np-btn--outline" onClick={onScan}><Icon name="scan"/> Scan a tag</button></div><div className="np-appliance-grid">{appliances.map((item, index) => <article className="np-appliance" key={item.id}><div className="np-appliance__visual"><span>0{index + 1}</span><img src={`./schematics/${item.id}.png`} alt={item.name} className="np-appliance__schematic" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} /><Icon name="appliances" size={42}/></div><div className="np-appliance__body"><span className="np-kicker">{item.location}</span><h3>{item.name}</h3><p>{item.brand} · {item.model}</p><code>{item.npid}</code><div className="np-appliance__service"><Icon name="clock" size={16}/>{item.lastService}</div><button className="np-link" onClick={() => onReport(item.id)}>Report an issue <Icon name="chevron" size={16}/></button></div></article>)}</div></div>;
}

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
  return <div className="np-modal" role="dialog" aria-modal="true" aria-label="Scan appliance tag"><div className="np-scanner"><div className="np-scanner__head"><Brand/><button aria-label="Close scanner" onClick={onClose}><Icon name="close"/></button></div><div className="np-camera"><video ref={videoRef} muted playsInline/><div className="np-reticle"><span/><span/><span/><span/><i/></div>{cameraState !== 'live' && <div className="np-camera__message"><Icon name="camera" size={30}/><strong>{cameraState === 'starting' ? 'Starting camera…' : 'Camera unavailable'}</strong><span>{cameraState === 'unavailable' ? 'Enter the tag number below.' : 'Allow camera access when prompted.'}</span></div>}<button className="np-demo-scan" onClick={() => onFound('dishwasher')}>Simulate tag in view</button></div><div className="np-scanner__copy"><span className="np-kicker np-kicker--red">SCAN NAMEPLATE TAG</span><h2>Hold steady over the square tag.</h2><p>The tag is usually on the front edge or side of the appliance.</p><div className="np-manual"><input value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Enter NPID, e.g. NP-7H3P9X2C"/><button onClick={matchManual} disabled={!manual.trim()}>Use tag</button></div></div></div></div>;
}

export default App;
