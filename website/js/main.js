/**
 * Nameplate — Minimalist Interactive Engine
 * Live Scanned Asset Record Simulator & Component Lineage
 */
(function () {
  'use strict';

  // Escape a value before it is interpolated into an innerHTML template.
  // Record data is static today, but the templates below are the only place
  // untrusted content could reach the DOM if that ever changes.
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ================= Theme =================
  function initTheme() {
    var root = document.documentElement;
    var buttons = document.querySelectorAll('.theme-btn, .footer-theme-btn, #footerThemeToggle, .theme-toggle');
    var themeColor = document.querySelector('meta[name="theme-color"]');
    var media = window.matchMedia('(prefers-color-scheme: light)');

    function savedTheme() {
      try { return localStorage.getItem('nameplate-theme'); } catch (error) { return null; }
    }

    function applyTheme(theme, persist) {
      root.setAttribute('data-theme', theme);
      if (persist) {
        try { localStorage.setItem('nameplate-theme', theme); } catch (error) {}
      }
      if (themeColor) themeColor.setAttribute('content', theme === 'light' ? '#ffffff' : '#000000');
      var nextTheme = theme === 'light' ? 'dark' : 'light';
      var label = 'Switch to ' + nextTheme + ' mode';
      buttons.forEach(function (button) {
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
      });
      var footerLabel = document.getElementById('footerThemeLabel');
      if (footerLabel) {
        footerLabel.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
      }
    }

    applyTheme(root.getAttribute('data-theme') || (media.matches ? 'light' : 'dark'), false);

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        applyTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
      });
    });

    function followSystem(event) {
      if (!savedTheme()) applyTheme(event.matches ? 'light' : 'dark', false);
    }
    if (media.addEventListener) media.addEventListener('change', followSystem);
    else if (media.addListener) media.addListener(followSystem);
  }

  // ================= 1. Master Schematics & Live Asset Data =================
  var ASSET_RECORDS = {
    hvac: {
      key: 'hvac',
      title: 'Carrier 2.5-Ton Variable Speed Air Handler',
      shortTitle: 'HVAC (AC & Furnace)',
      category: 'Model: FE4ANF002 · Serial: 4821A90124 (OCR Stamped)',
      tag: 'HVAC & MECHANICAL · SPEC 01',
      npid: 'NP-1M4K9X23',
      img: 'images/schematics/hvac.png',
      desc: 'Dual-stage forced-air heating and split condenser system. Tracks refrigerant lines, blower motor amperage, heating element resistance, and thermostat telemetry.',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      property: 'Sonoran Ridge Residences — Building 4',
      room: 'Unit 402 · Utility / Mechanical Closet',
      address: '4820 E Camelback Rd, Phoenix, AZ 85018',
      gps: '33.5092° N, 111.9783° W',
      dates: 'PURCHASED: 2021-10-18 · INSTALLED: 2021-11-05',
      age: '4.8 Yrs',
      warranty: 'OEM Active (2031)',
      warrantySub: '10-Yr Compressor Warranty',
      cost: '$3,800.00',
      spend: '$38.00 (1.0%)',
      parts: [
        { type: 'red', text: '<strong>Heating Element &amp; Sensors</strong> — Monitored for burnout cycles.' },
        { type: 'red', text: '<strong>Compressor &amp; Thermostat Bus</strong> — Covered under OEM warranty.' },
        { type: 'white', text: '<strong>Blower &amp; Condenser Fan</strong> — Logged during semi-annual PM audits.' }
      ],
      lineage: [
        { date: '2026-03-20', part: 'Blower Motor Amperage Certified (2.8A)', oem: 'OEM-CAR-BLW48', tech: 'Tech J. Morales · WO-1014', status: 'PM Passed', statusClass: 'standard-service' },
        { date: '2025-08-11', part: 'Run Capacitor 45/5 uF Replaced', oem: 'CAP-45-5-370V', tech: 'Tech J. Morales · WO-0819', status: 'Standard Service ($38.00)', statusClass: 'standard-service' },
        { date: '2021-11-05', part: 'Initial Hardware Tag Minted & Bound', oem: 'NPID-SYSTEM', tech: 'Commissioning Team', status: 'Onboarded', statusClass: 'standard-service' }
      ]
    },
    washer: {
      key: 'washer',
      title: 'Speed Queen Commercial Front-Load Washer',
      shortTitle: 'Commercial Washer',
      category: 'Model: FF7005WN · Serial: 250608914 (OCR Verified)',
      tag: 'LAUNDRY SYSTEMS · SPEC 02',
      npid: 'NP-3W9Q5R71',
      img: 'images/schematics/washer.png',
      desc: 'High-efficiency direct-drive commercial washing unit. Tracks water inlet valves, drain pump health, heater elements, and spin drum vibration.',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      property: 'Sonoran Ridge Residences — Building 4',
      room: 'Unit 402 · Laundry Closet',
      address: '4820 E Camelback Rd, Phoenix, AZ 85018',
      gps: '33.5092° N, 111.9783° W',
      dates: 'PURCHASED: 2025-06-10 · INSTALLED: 2025-06-22',
      age: '1.2 Yrs',
      warranty: 'OEM Active (2030)',
      warrantySub: '5-Yr Commercial Warranty',
      cost: '$1,320.00',
      spend: '$0.00 (0.0%)',
      parts: [
        { type: 'red', text: '<strong>Water Inlet Valve &amp; Drain Pump</strong> — Tracked for solenoid wear.' },
        { type: 'red', text: '<strong>Internal Water Heater &amp; Control Board</strong> — Monitored for logic and power faults.' },
        { type: 'white', text: '<strong>Drive Motor &amp; Drum Casing</strong> — Bearing integrity verification.' }
      ],
      lineage: [
        { date: '2026-05-14', part: 'Door Gasket Sanitization & Balance Test', oem: 'GSK-SQ-F70', tech: 'Tech D. Vance · Turn Audit', status: 'Verified Healthy', statusClass: 'warranty-covered' },
        { date: '2025-06-22', part: 'Unit Upgrade Installed & Affixed NPID', oem: 'NPID-SYSTEM', tech: 'Tech J. Morales', status: 'Commissioned', statusClass: 'standard-service' }
      ]
    },
    fridge: {
      key: 'fridge',
      title: 'Whirlpool 36" French Door Refrigerator',
      shortTitle: 'Refrigerator & Freezer',
      category: 'Model: WRF535SWHZ · Serial: W10874291 (OCR Stamped)',
      tag: 'KITCHEN SYSTEMS · SPEC 03',
      npid: 'NP-7K2M4QX9',
      img: 'images/schematics/fridge.png',
      desc: 'Multi-zone refrigeration system with hermetic compressor and dual evaporator coils. Tracks compressor cycles, defrost cycles, and door seal integrity.',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      property: 'Sonoran Ridge Residences — Building 4',
      room: 'Unit 402 · Gourmet Kitchen (North Alcove)',
      address: '4820 E Camelback Rd, Phoenix, AZ 85018',
      gps: '33.5092° N, 111.9783° W',
      dates: 'PURCHASED: 2023-03-15 · INSTALLED: 2023-04-10',
      age: '3.4 Yrs',
      warranty: 'OEM Active (2028)',
      warrantySub: '10-Yr Sealed System Warranty',
      cost: '$1,450.00',
      spend: '$64.20 (4.4%)',
      parts: [
        { type: 'red', text: '<strong>Hermetic Sealed Compressor</strong> — Core warranty recovery asset.' },
        { type: 'red', text: '<strong>Evaporator Coils &amp; Defrost Loop</strong> — Cold-wall freeze risk.' },
        { type: 'white', text: '<strong>Thermostat &amp; Door Gaskets</strong> — Air-tight seal monitoring.' }
      ],
      lineage: [
        { date: '2026-06-12', part: 'Defrost Bi-Metal Thermostat Replaced', oem: 'WPW10225581', tech: 'Tech J. Morales · WO-1048', status: 'OEM Warranty ($0.00)', statusClass: 'warranty-covered' },
        { date: '2026-02-18', part: 'Make-Ready Turnover Audit & Seal Check', oem: 'SEAL-WP-FR535', tech: 'Tech D. Vance', status: 'Verified Present', statusClass: 'standard-service' },
        { date: '2024-11-04', part: 'Dual Water Inlet Solenoid Valve Swapped', oem: 'W10498990', tech: 'Tech D. Vance · WO-0612', status: 'Maintenance ($38.50)', statusClass: 'standard-service' },
        { date: '2023-04-10', part: 'Initial Tag Minted & Claimed in Unit 402', oem: 'NPID-SYSTEM', tech: 'Onboarding Team', status: 'Commissioned', statusClass: 'standard-service' }
      ]
    },
    dryer: {
      key: 'dryer',
      title: 'Speed Queen Electric Heavy Duty Dryer',
      shortTitle: 'Electric Dryer',
      category: 'Model: DF7000WE · Serial: 250609318 (OCR Stamped)',
      tag: 'LAUNDRY SYSTEMS · SPEC 04',
      npid: 'NP-6K8L2P44',
      img: 'images/schematics/dryer.png',
      desc: 'Commercial electric drying unit. Tracks ceramic heating element, centrifugal blower fan, thermal cutoffs, and exhaust duct airflow backpressure.',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      property: 'Sonoran Ridge Residences — Building 4',
      room: 'Unit 402 · Laundry Closet',
      address: '4820 E Camelback Rd, Phoenix, AZ 85018',
      gps: '33.5092° N, 111.9783° W',
      dates: 'PURCHASED: 2025-06-10 · INSTALLED: 2025-06-22',
      age: '1.2 Yrs',
      warranty: 'OEM Active (2030)',
      warrantySub: '5-Yr Commercial Warranty',
      cost: '$1,250.00',
      spend: '$0.00 (0.0%)',
      parts: [
        { type: 'red', text: '<strong>High-Density Heating Element</strong> — Resistance verified at make-ready turns.' },
        { type: 'white', text: '<strong>Exhaust Blower &amp; Lint Screen</strong> — Airflow backpressure tested.' },
        { type: 'white', text: '<strong>Drum Drive Belt &amp; Idler Pulley</strong> — Mechanical rotation verified.' }
      ],
      lineage: [
        { date: '2026-05-14', part: 'Exhaust Duct Airflow Certified 480 CFM', oem: 'DUCT-CFM-TEST', tech: 'Tech D. Vance · Turn Walk', status: 'Airflow Certified', statusClass: 'warranty-covered' },
        { date: '2025-06-22', part: 'Unit Installed & Affixed NPID Hardware', oem: 'NPID-SYSTEM', tech: 'Tech J. Morales', status: 'Commissioned', statusClass: 'standard-service' }
      ]
    },
    dishwasher: {
      key: 'dishwasher',
      title: 'GE Profile Top Control Dishwasher',
      shortTitle: 'Integrated Dishwasher',
      category: 'Model: PDT715SYNFS · Serial: 340918471 (Scanned Barcode)',
      tag: 'KITCHEN SYSTEMS · SPEC 05',
      npid: 'NP-8V3Z6K19',
      img: 'images/schematics/dishwasher.png',
      desc: 'High-pressure wash system with heating boost element, multi-tier spray arms, float switch flood protection, and dual detergent solenoid actuators.',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      property: 'Sonoran Ridge Residences — Building 4',
      room: 'Unit 402 · Gourmet Kitchen',
      address: '4820 E Camelback Rd, Phoenix, AZ 85018',
      gps: '33.5092° N, 111.9783° W',
      dates: 'PURCHASED: 2023-03-15 · INSTALLED: 2023-04-10',
      age: '3.4 Yrs',
      warranty: 'OEM Active (2028)',
      warrantySub: '5-Yr Tub & Electronics Warranty',
      cost: '$899.00',
      spend: '$24.00 (2.6%)',
      parts: [
        { type: 'red', text: '<strong>Water Booster Heater</strong> — High-temperature sanitation verification.' },
        { type: 'white', text: '<strong>Float Switch &amp; Circulation Pump</strong> — Sub-floor leak mitigation sensors.' },
        { type: 'white', text: '<strong>Upper/Lower Spray Arms</strong> — Mechanical wash integrity checked.' }
      ],
      lineage: [
        { date: '2026-01-09', part: 'Drain Pump Filter Cleared & Calibrated', oem: 'PUMP-GE-PDT7', tech: 'Tech D. Vance · WO-0932', status: 'Maintenance ($24.00)', statusClass: 'standard-service' },
        { date: '2023-04-10', part: 'Initial Tag Affixed & Claimed in Unit 402', oem: 'NPID-SYSTEM', tech: 'Onboarding Team', status: 'Commissioned', statusClass: 'standard-service' }
      ]
    },
    thermostat: {
      key: 'thermostat',
      title: 'Honeywell Home T9 Smart Environmental Thermostat',
      shortTitle: 'Smart Thermostat',
      category: 'Model: RCHT9610WFW · MAC: 00:D0:2D:63:F1:8A',
      tag: 'CLIMATE & CONTROLS · SPEC 06',
      npid: 'NP-2N7V9X65',
      img: 'images/schematics/thermostat.png',
      desc: 'Solid-state digital climate control bus. Interfaces with HVAC 24V relay board, ambient temperature sensors, and multi-zone remote room pucks.',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      property: 'Sonoran Ridge Residences — Building 4',
      room: 'Unit 402 · Central Hallway',
      address: '4820 E Camelback Rd, Phoenix, AZ 85018',
      gps: '33.5092° N, 111.9783° W',
      dates: 'PURCHASED: 2024-02-01 · INSTALLED: 2024-02-18',
      age: '2.5 Yrs',
      warranty: 'OEM Active (2027)',
      warrantySub: '3-Yr Honeywell Pro Warranty',
      cost: '$180.00',
      spend: '$0.00 (0.0%)',
      parts: [
        { type: 'red', text: '<strong>HVAC Relay Bus &amp; Control Panel</strong> — 24V signaling protection.' },
        { type: 'white', text: '<strong>Digital LCD Display</strong> — Hardware status telemetry reporting.' },
        { type: 'white', text: '<strong>Precision Temperature Sensor</strong> — Thermal calibration audit.' }
      ],
      lineage: [
        { date: '2024-02-18', part: 'Remote Room Sensor Paired & Commissioned', oem: 'RCHTSENSOR-V1', tech: 'Tech J. Morales', status: 'Commissioned', statusClass: 'standard-service' }
      ]
    },
    microwave: {
      key: 'microwave',
      title: 'GE Profile Over-the-Range Microwave & Vent',
      shortTitle: 'Microwave & Vent',
      category: 'Model: PVM9005SJSS · Serial: 81920481 (OCR Stamped)',
      tag: 'KITCHEN APPLIANCES · SPEC 07',
      npid: 'NP-5K9L1P88',
      img: 'images/schematics/microwave.png',
      desc: 'High-voltage cavity heating and exhaust ventilation unit. Tracks magnetron tube emission, high-voltage diode transformer, waveguide, and safety door interlocks.',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      property: 'Sonoran Ridge Residences — Building 4',
      room: 'Unit 402 · Gourmet Kitchen (Above Range)',
      address: '4820 E Camelback Rd, Phoenix, AZ 85018',
      gps: '33.5092° N, 111.9783° W',
      dates: 'PURCHASED: 2024-07-02 · INSTALLED: 2024-07-15',
      age: '2.1 Yrs',
      warranty: 'OEM Active (2029)',
      warrantySub: '5-Yr Magnetron Tube Warranty',
      cost: '$540.00',
      spend: '$0.00 (0.0%)',
      parts: [
        { type: 'red', text: '<strong>Magnetron Tube</strong> — Microwave radiation generator.' },
        { type: 'white', text: '<strong>Interlock Safety Door Latches</strong> — Closure sensor.' },
        { type: 'white', text: '<strong>Waveguide Chamber &amp; Exhaust Fan</strong> — Ventilation integrity.' }
      ],
      lineage: [
        { date: '2024-07-15', part: 'Initial Tag Affixed & Range Hood Paired', oem: 'NPID-SYSTEM', tech: 'Tech J. Morales', status: 'Commissioned', statusClass: 'standard-service' }
      ]
    },
    wh: {
      key: 'wh',
      title: 'Rheem Performance Platinum 50-Gal Hybrid Water Heater',
      shortTitle: 'Water Heater',
      category: 'Model: PROPH50 · Serial: RH88201941 (OCR Stamped)',
      tag: 'PLUMBING & HEATING · SPEC 08',
      npid: 'NP-8K3M9P11',
      img: 'images/schematics/hvac.png',
      desc: 'High-efficiency heat pump water heating unit. Tracks upper/lower titanium heating elements, sacrificial anode rod depletion, TPR relief valve, and ambient heat pump compressor.',
      owner: 'Sonoran Portfolio Partners LLC · Fund IV',
      property: 'Sonoran Ridge Residences — Building 4',
      room: 'Unit 402 · Mech / Utility Closet',
      address: '4820 E Camelback Rd, Phoenix, AZ 85018',
      gps: '33.5092° N, 111.9783° W',
      dates: 'PURCHASED: 2023-01-14 · INSTALLED: 2023-01-20',
      age: '3.6 Yrs',
      warranty: 'OEM Active (2033)',
      warrantySub: '10-Yr Tank & Parts Warranty',
      cost: '$1,650.00',
      spend: '$0.00 (0.0%)',
      parts: [
        { type: 'red', text: '<strong>Titanium Heating Elements</strong> — Dual thermal resistors.' },
        { type: 'white', text: '<strong>Sacrificial Magnesium Anode Rod</strong> — Corrosion barrier.' },
        { type: 'white', text: '<strong>Temperature &amp; Pressure Relief Valve</strong> — Safety discharge rated to 150 PSI.' }
      ],
      lineage: [
        { date: '2025-06-18', part: 'Anode Rod Depletion Inspection (92% Life)', oem: 'RH-ANODE-MG', tech: 'Tech J. Morales · WO-0740', status: 'PM Passed', statusClass: 'warranty-covered' },
        { date: '2023-01-20', part: 'Initial Tag Affixed & Pressure Test Certified', oem: 'NPID-SYSTEM', tech: 'Commissioning Team', status: 'Commissioned', statusClass: 'standard-service' }
      ]
    }
  };

  var currentActiveKey = 'hvac';
  var currentSimMode = 'field'; // 'field' | 'hq'

  // ================= 2. Render Functions for Schematics & Live App Simulator =================
  function renderLiveAppRecord(key) {
    var data = ASSET_RECORDS[key];
    if (!data) return;
    currentActiveKey = key;

    // 1. Featured Schematics Frame
    var featImg = document.getElementById('featuredSchematicImg');
    var schTag = document.getElementById('schIntelTag');
    var schTitle = document.getElementById('schIntelTitle');
    var schDesc = document.getElementById('schIntelDesc');
    var schParts = document.getElementById('schPartsList');

    if (featImg) {
      featImg.style.opacity = '0.3';
      setTimeout(function () {
        featImg.src = data.img;
        featImg.alt = data.title;
        featImg.style.opacity = '1';
      }, 100);
    }
    if (schTag) schTag.textContent = data.tag;
    if (schTitle) schTitle.textContent = data.shortTitle;
    if (schDesc) schDesc.textContent = data.desc;

    if (schParts) {
      var pHtml = '';
      data.parts.forEach(function (p) {
        var dotClass = p.type === 'red' ? 'part-dot-red' : 'part-dot-white';
        // `p.text` is authored copy that carries intentional <strong> emphasis,
        // so it is inserted as markup. Keep it authored in this file only.
        pHtml += '<div class="part-row">' +
          '<span class="' + dotClass + '"></span>' +
          '<div>' + p.text + '</div>' +
          '</div>';
      });
      schParts.innerHTML = pHtml;
    }

    // 2. Live Simulator Header & Sidebar
    var simHdrNpid = document.getElementById('simHeaderNpid');
    var simLoc = document.getElementById('simAssetLocationTag');
    var simImg = document.getElementById('simSidebarSchematicImg');
    var simName = document.getElementById('simAssetName');
    var simCat = document.getElementById('simAssetCategory');
    var simOwner = document.getElementById('simAssetOwner');
    var simProp = document.getElementById('simAssetProperty');
    var simRoom = document.getElementById('simAssetRoom');
    var simAddr = document.getElementById('simAssetAddress');
    var simGps = document.getElementById('simAssetGps');

    if (simHdrNpid) simHdrNpid.textContent = data.npid;
    if (simLoc) simLoc.textContent = data.property + ' · ' + data.room;
    if (simImg) simImg.src = data.img;
    if (simName) simName.textContent = data.title;
    if (simCat) simCat.textContent = data.category;
    if (simOwner) simOwner.textContent = data.owner;
    if (simProp) simProp.textContent = data.property;
    if (simRoom) simRoom.textContent = data.room;
    if (simAddr) simAddr.textContent = data.address;
    if (simGps) simGps.textContent = data.gps;

    // 3. Stat Chips
    var statAge = document.getElementById('simStatAge');
    var statWarr = document.getElementById('simStatWarranty');
    var statWarrSub = document.getElementById('simStatWarrantySub');
    var statCost = document.getElementById('simStatCost');
    var statSpend = document.getElementById('simStatSpend');
    var dateInst = document.getElementById('simDateInstalled');

    if (statAge) statAge.textContent = data.age;
    if (statWarr) statWarr.textContent = data.warranty;
    if (statWarrSub) statWarrSub.textContent = data.warrantySub || 'OEM Warranty Status';
    if (statCost) statCost.textContent = data.cost;
    if (statSpend) statSpend.textContent = data.spend;
    if (dateInst) dateInst.textContent = data.dates;

    // 4. Lineage Event Stream
    var tableBody = document.getElementById('simLineageTableBody');
    if (tableBody) {
      var tHtml = '';
      data.lineage.forEach(function (row) {
        tHtml += '<div class="lineage-event-row">' +
          '<div class="lineage-event-main">' +
          '<span class="lineage-date mono">' + esc(row.date) + '</span>' +
          '<div class="lineage-desc">' +
          '<strong>' + esc(row.part) + '</strong>' +
          '<span class="lineage-meta mono">' + esc(row.oem) + ' · ' + esc(row.tech) + '</span>' +
          '</div>' +
          '</div>' +
          '<span class="sim-part-badge ' + esc(row.statusClass) + '">' + esc(row.status) + '</span>' +
          '</div>';
      });
      tableBody.innerHTML = tHtml;
    }
  }

  // ================= 3. Interactive Portfolio HQ Yield & Dossier Gallery =================
  var HQ_YIELD_DATA = {
    'report-depreciation': {
      type: 'PRINTABLE PDF AUDIT',
      id: 'NP-AUDIT-CAPEX-2026',
      scope: 'Sonoran Portfolio · 1,840 Assets',
      title: 'Equipment Depreciation & CapEx Replacement Forecast',
      desc: '10-year straight-line depreciation schedule across 1,840 fleet appliances, forecasting $241,800 in 2026 replacement liability with serial-level confidence. Identifies equipment crossing 85% of useful lifespan before catastrophic failure occurs.',
      img: 'images/reports/report_depreciation_audit.png',
      stat1Val: '$241,800',
      stat1Lbl: '2026 CAPEX EXPOSURE',
      stat2Val: '182 Units',
      stat2Lbl: 'IMPENDING FAILURE (>85% LIFE)',
      stat2Alert: true,
      stat3Val: '4.8 Yrs',
      stat3Lbl: 'AVG OPERATING AGE',
      tags: ['Straight-Line Depreciation', 'Reserve Planning', 'Boardroom Ready'],
      primaryBtn: { text: 'Open Printable PDF Dossier', url: 'reports/depreciation_audit.html', target: '_blank' },
      secondaryBtn: { text: 'Launch in HQ Console', url: 'hq/index.html#/analytics', target: '_self' }
    },
    'report-lemon': {
      type: 'PRINTABLE PDF AUDIT',
      id: 'NP-AUDIT-LEMON-2026',
      scope: 'Sonoran Portfolio · OEM Analysis',
      title: 'Appliance Brand & Failure Rate Benchmark Matrix',
      desc: 'Statistical MTBF and warranty claims analysis across OEM brands. Flags Whirlpool compressor failure rate at 8.4% (vs 2.1% fleet benchmark) as a portfolio lemon outlier requiring manufacturer warranty recovery.',
      img: 'images/reports/report_failure_rate_matrix.png',
      stat1Val: '8.4%',
      stat1Lbl: 'WHIRLPOOL DEFECT RATE (ANOMALY)',
      stat1Alert: true,
      stat2Val: '16 Units',
      stat2Lbl: 'QUARANTINED LEMON UNITS',
      stat2Alert: true,
      stat3Val: '$14,200',
      stat3Lbl: 'RECOVERABLE OEM CLAIMS',
      tags: ['OEM Failure Benchmark', 'Lemon Quarantine', 'Warranty Recovery'],
      primaryBtn: { text: 'Open Printable PDF Dossier', url: 'reports/failure_rate_matrix.html', target: '_blank' },
      secondaryBtn: { text: 'Inspect Lemons in HQ', url: 'hq/index.html#/analytics', target: '_self' }
    },
    'report-sla': {
      type: 'PRINTABLE PDF AUDIT',
      id: 'NP-AUDIT-SLA-2026',
      scope: 'Sonoran Portfolio · 6 Properties',
      title: 'Work Order SLA Performance & Operations Velocity Audit',
      desc: 'Audits technician first-time fix rates (94.2%), average repair resolution velocity (1.8 hours), and 100% on-time preventive maintenance compliance across all 6 properties in Sonoran Portfolio.',
      img: 'images/reports/report_sla_operations_audit.png',
      stat1Val: '94.2%',
      stat1Lbl: 'FIRST-TIME FIX VELOCITY',
      stat2Val: '1.8 Hrs',
      stat2Lbl: 'AVERAGE REPAIR DURATION',
      stat3Val: '100%',
      stat3Lbl: 'ON-TIME PM AUDIT VELOCITY',
      tags: ['Technician Performance', 'SLA Velocity', 'PM Compliance'],
      primaryBtn: { text: 'Open Printable PDF Dossier', url: 'reports/sla_operations_audit.html', target: '_blank' },
      secondaryBtn: { text: 'View Field Stream in HQ', url: 'hq/index.html#/work-orders', target: '_self' }
    },
    'hq-capex': {
      type: 'LIVE HQ CONSOLE',
      id: 'HQ-MODULE // CAPEX FORECASTER',
      scope: 'Sonoran Portfolio · Multi-Property Rollup',
      title: 'CapEx Replacement Engine & Reserve Planner',
      desc: 'Multi-property CapEx budget forecaster projecting quarterly asset retirement dates, replacement costs, and inflation adjustments across all 6 properties over a 12-quarter predictive horizon.',
      img: 'images/reports/hq_capex_forecaster.png',
      stat1Val: '$4.2M',
      stat1Lbl: 'TOTAL FLEET REPLACEMENT VALUE',
      stat2Val: '1,840',
      stat2Lbl: 'ACTIVE MANAGED APPLIANCES',
      stat3Val: '12 Qtrs',
      stat3Lbl: 'PREDICTIVE HORIZON',
      tags: ['Interactive Forecasting', 'Reserve Modeling', 'Capital Planning'],
      primaryBtn: { text: 'Launch CapEx in HQ', url: 'hq/index.html#/analytics', target: '_self' },
      secondaryBtn: { text: 'View CapEx Audit PDF', url: 'reports/depreciation_audit.html', target: '_blank' }
    },
    'hq-lemon': {
      type: 'LIVE HQ CONSOLE',
      id: 'HQ-MODULE // DEFECT ENGINE',
      scope: 'Sonoran Portfolio · OEM Analysis',
      title: 'Lemon Defect Radar & Serial Batch Anomaly Matrix',
      desc: 'Algorithmic lemon detector highlighting serial batches with recurring burnouts, premature capacitor failures, and vendor installation errors across properties.',
      img: 'images/reports/hq_lemon_detection.png',
      stat1Val: '3 Clusters',
      stat1Lbl: 'FLAGGED UNDER OEM WARRANTY',
      stat1Alert: true,
      stat2Val: '100%',
      stat2Lbl: 'SERIAL-TO-UNIT TRACEABILITY',
      stat3Val: '$28,400',
      stat3Lbl: 'ACTIVE CLAIM PIPELINE',
      tags: ['Anomaly Detection', 'Serial Batching', 'Chargeback Defense'],
      primaryBtn: { text: 'Launch Lemon Radar in HQ', url: 'hq/index.html#/analytics', target: '_self' },
      secondaryBtn: { text: 'View Failure Matrix PDF', url: 'reports/failure_rate_matrix.html', target: '_blank' }
    },
    'hq-macro': {
      type: 'LIVE HQ CONSOLE',
      id: 'HQ-MODULE // EXECUTIVE MACRO',
      scope: 'Sonoran Portfolio · Executive Suite',
      title: 'Executive Portfolio Overview & Health Scorecards',
      desc: 'High-altitude macro view tracking $4.2M in total fleet asset value, health indices, warranty recovery pipeline, and property-by-property work order velocity.',
      img: 'images/reports/hq_executive_overview.png',
      stat1Val: '98.6%',
      stat1Lbl: 'FLEET OPERATIONAL UPTIME',
      stat2Val: '6 Props',
      stat2Lbl: 'MANAGED APARTMENT ASSETS',
      stat3Val: '94.2%',
      stat3Lbl: 'SLA ATTAINMENT RATE',
      tags: ['Executive Scorecards', 'Fleet Uptime', 'Portfolio Health'],
      primaryBtn: { text: 'Launch Executive HQ', url: 'hq/index.html', target: '_self' },
      secondaryBtn: { text: 'View SLA Audit PDF', url: 'reports/sla_operations_audit.html', target: '_blank' }
    },
    'hq-telemetry': {
      type: 'LIVE HQ CONSOLE',
      id: 'HQ-MODULE // TELEMETRY STREAM',
      scope: 'Field Network · Real-Time Edge Ledger',
      title: 'Field Operations Telemetry & Audit Stream',
      desc: 'Real-time cryptographic ledger recording every hardware tag minted, OCR serial scan performed, and maintenance checklist completed across the portfolio.',
      img: 'images/reports/hq_telemetry_audit.png',
      stat1Val: 'Real-Time',
      stat1Lbl: 'CRYPTOGRAPHIC EVENT STREAM',
      stat2Val: 'Zero-Loss',
      stat2Lbl: 'OFFLINE-FIRST EDGE PROTOCOL',
      stat3Val: '100%',
      stat3Lbl: 'IMMUTABLE AUDIT TRAIL',
      tags: ['Event Ledger', 'Zero Signal Sync', 'Tamper Evident'],
      primaryBtn: { text: 'Inspect Live Stream in HQ', url: 'hq/index.html#/work-orders', target: '_self' },
      secondaryBtn: { text: 'Launch Field Scanner', url: 'field/', target: '_self' }
    }
  };

  var currentSelectedYieldId = 'report-depreciation';

  function updateFeaturedStage(id) {
    var data = HQ_YIELD_DATA[id];
    if (!data) return;
    currentSelectedYieldId = id;

    var badge = document.getElementById('stageTypeBadge');
    var docId = document.getElementById('stageDocId');
    var scope = document.getElementById('stageDocScope');
    var title = document.getElementById('stageDocTitle');
    var desc = document.getElementById('stageDocDesc');
    var img = document.getElementById('stageFeaturedImg');
    var stat1Val = document.getElementById('stageStat1Val');
    var stat1Lbl = document.getElementById('stageStat1Lbl');
    var stat2Val = document.getElementById('stageStat2Val');
    var stat2Lbl = document.getElementById('stageStat2Lbl');
    var stat3Val = document.getElementById('stageStat3Val');
    var stat3Lbl = document.getElementById('stageStat3Lbl');
    var tagsRow = document.getElementById('stageTagsRow');
    var primaryBtn = document.getElementById('stagePrimaryBtn');
    var secondaryBtn = document.getElementById('stageSecondaryBtn');

    if (badge) badge.textContent = data.type;
    if (docId) docId.textContent = data.id;
    if (scope) scope.textContent = data.scope;
    if (title) title.textContent = data.title;
    if (desc) desc.textContent = data.desc;

    if (stat1Val) stat1Val.textContent = data.stat1Val;
    if (stat1Lbl) stat1Lbl.textContent = data.stat1Lbl;
    if (stat2Val) stat2Val.textContent = data.stat2Val;
    if (stat2Lbl) stat2Lbl.textContent = data.stat2Lbl;
    if (stat3Val) stat3Val.textContent = data.stat3Val;
    if (stat3Lbl) stat3Lbl.textContent = data.stat3Lbl;

    var stat2Tile = stat2Val ? stat2Val.closest('.stage-metric-tile') : null;
    if (stat2Tile) {
      if (data.stat2Alert) stat2Tile.classList.add('stage-metric-alert');
      else stat2Tile.classList.remove('stage-metric-alert');
    }

    if (tagsRow && data.tags) {
      tagsRow.innerHTML = data.tags.map(function (t) {
        return '<span class="stage-tag mono">' + t + '</span>';
      }).join('');
    }

    if (primaryBtn) {
      primaryBtn.href = data.primaryBtn.url;
      primaryBtn.target = data.primaryBtn.target;
      primaryBtn.innerHTML = '<span>' + data.primaryBtn.text + '</span><span class="btn-arrow" aria-hidden="true">↗</span>';
    }

    if (secondaryBtn) {
      secondaryBtn.href = data.secondaryBtn.url;
      secondaryBtn.target = data.secondaryBtn.target;
      secondaryBtn.innerHTML = '<span>' + data.secondaryBtn.text + '</span><span class="btn-arrow" aria-hidden="true">↗</span>';
    }

    if (img) {
      img.style.opacity = '0.3';
      setTimeout(function () {
        img.src = data.img;
        img.alt = data.title;
        img.style.opacity = '1';
      }, 120);
    }

    document.querySelectorAll('.hq-yield-card').forEach(function (card) {
      if (card.getAttribute('data-id') === id) card.classList.add('is-active');
      else card.classList.remove('is-active');
    });
  }

  function openHqLightbox(id) {
    var data = HQ_YIELD_DATA[id || currentSelectedYieldId];
    if (!data) return;
    var modal = document.getElementById('hqYieldLightboxModal');
    var lbBadge = document.getElementById('lbModalBadge');
    var lbTitle = document.getElementById('lbModalTitle');
    var lbSub = document.getElementById('lbModalSub');
    var lbImg = document.getElementById('lbModalImg');
    var lbAction = document.getElementById('lbModalActionBtn');

    if (lbBadge) lbBadge.textContent = data.type;
    if (lbTitle) lbTitle.textContent = data.title;
    if (lbSub) lbSub.textContent = 'DOC ID: ' + data.id + ' · SCOPE: ' + data.scope.toUpperCase();
    if (lbImg) {
      lbImg.src = data.img;
      lbImg.alt = data.title;
    }
    if (lbAction) {
      lbAction.href = data.primaryBtn.url;
      lbAction.target = data.primaryBtn.target;
      lbAction.innerHTML = '<span>' + data.primaryBtn.text + ' ↗</span>';
    }
    if (modal) {
      modal.classList.add('is-active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeHqLightbox() {
    var modal = document.getElementById('hqYieldLightboxModal');
    if (modal) {
      modal.classList.remove('is-active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  function initHqYieldGallery() {
    var cards = document.querySelectorAll('.hq-yield-card');
    cards.forEach(function (card) {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          card.click();
        }
      });
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-id');
        updateFeaturedStage(id);
        var stage = document.getElementById('hqFeaturedStage');
        if (stage && window.innerWidth < 800) {
          stage.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    var filterPills = document.querySelectorAll('#hqYieldFilterTabs .hq-filter-pill');
    var countDisplay = document.getElementById('galleryCountDisplay');

    filterPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        filterPills.forEach(function (p) { p.classList.remove('is-active'); });
        pill.classList.add('is-active');
        var filter = pill.getAttribute('data-filter');

        var visibleCount = 0;
        cards.forEach(function (card) {
          var cats = (card.getAttribute('data-category') || '').split(' ');
          var isMatch = (filter === 'all') || (cats.indexOf(filter) !== -1);
          if (isMatch) {
            card.classList.remove('is-filtered-out');
            visibleCount++;
          } else {
            card.classList.add('is-filtered-out');
          }
        });

        if (countDisplay) {
          countDisplay.textContent = 'SHOWING ' + visibleCount + ' OF ' + cards.length + ' ARTIFACTS';
        }
      });
    });

    var btnEnlarge = document.getElementById('btnEnlargeFeatured');
    var imgWrapper = document.getElementById('stageImgWrapper');
    if (btnEnlarge) {
      btnEnlarge.addEventListener('click', function (e) {
        e.stopPropagation();
        openHqLightbox(currentSelectedYieldId);
      });
    }
    if (imgWrapper) {
      imgWrapper.addEventListener('click', function () {
        openHqLightbox(currentSelectedYieldId);
      });
      imgWrapper.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openHqLightbox(currentSelectedYieldId);
        }
      });
    }

    var closeBtn = document.getElementById('closeHqLightboxBtn');
    var modal = document.getElementById('hqYieldLightboxModal');
    if (closeBtn) closeBtn.addEventListener('click', closeHqLightbox);
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeHqLightbox();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeHqLightbox();
    });

    updateFeaturedStage('report-depreciation');
  }



  // ================= 5. Oversized QR Generator Studio =================
  function generateBase32Npid() {
    var chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    var res = 'NP-';
    for (var i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  function renderOversizedQr(npid) {
    var container = document.getElementById('liveOversizedQrContainer');
    var display = document.getElementById('liveOversizedNpid');
    if (!container) return;

    var cleanNpid = npid.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    var payload = 'https://np.app/a/' + cleanNpid;

    if (window.NameplateQR && window.NameplateQR.createSvg) {
      var svg = window.NameplateQR.createSvg(payload, {
        margin: 0,
        dark: '#000000',
        light: '#FFFFFF',
        ecLevel: 'H'
      });
      // Intentional markup sink: `svg` is generated locally by NameplateQR from
      // `cleanNpid`, which is stripped to [A-Za-z0-9] above. Not escapable — the
      // value *is* the SVG document.
      container.innerHTML = svg;
    }

    if (display) display.textContent = npid;
  }

  function initOversizedQrStudio() {
    var input = document.getElementById('liveStudioNpidInput');
    var btnRand = document.getElementById('btnRandomizeOversized');
    var qrBox = document.getElementById('giantQrBox');
    var npidDisplay = document.getElementById('liveOversizedNpid');
    var fineprint = document.querySelector('.tag-large-fineprint');
    var rivets = document.querySelectorAll('.hex-rivet');
    var slits = document.querySelectorAll('.tamper-slit');
    var tagCard = document.getElementById('oversizedTagCard');
    var chips = document.querySelectorAll('.anatomy-callout-chip');

    function triggerMintFlash() {
      if (npidDisplay) {
        npidDisplay.classList.remove('mint-flash');
        void npidDisplay.offsetWidth;
        npidDisplay.classList.add('mint-flash');
      }
      if (qrBox) {
        qrBox.classList.remove('mint-flash');
        void qrBox.offsetWidth;
        qrBox.classList.add('mint-flash');
      }
    }

    if (input) {
      input.addEventListener('input', function () {
        var val = input.value.trim().toUpperCase();
        renderOversizedQr(val);
      });
    }

    if (btnRand) {
      btnRand.addEventListener('click', function () {
        var newId = generateBase32Npid();
        if (input) input.value = newId;
        renderOversizedQr(newId);
        triggerMintFlash();
      });
    }

    // Interactive callout hover connections — slits now highlights refined card edging (no hash marks)
    chips.forEach(function (chip) {
      var pointer = chip.getAttribute('data-pointer');

      chip.addEventListener('mouseenter', function () {
        chip.classList.add('is-active');
        if (pointer === 'finder' || pointer === 'ecc') {
          if (qrBox) qrBox.classList.add('is-highlighted');
        } else if (pointer === 'slits') {
          if (tagCard) tagCard.classList.add('is-highlighted');
          slits.forEach(function (s) { s.classList.add('is-highlighted'); });
        } else if (pointer === 'rivets') {
          rivets.forEach(function (r) { r.classList.add('is-highlighted'); });
        } else if (pointer === 'npid') {
          if (npidDisplay) npidDisplay.classList.add('is-highlighted');
        } else if (pointer === 'telemetry') {
          if (fineprint) fineprint.classList.add('is-highlighted');
        }
      });

      chip.addEventListener('mouseleave', function () {
        chip.classList.remove('is-active');
        if (qrBox) qrBox.classList.remove('is-highlighted');
        if (tagCard) tagCard.classList.remove('is-highlighted');
        slits.forEach(function (s) { s.classList.remove('is-highlighted'); });
        rivets.forEach(function (r) { r.classList.remove('is-highlighted'); });
        if (npidDisplay) npidDisplay.classList.remove('is-highlighted');
        if (fineprint) fineprint.classList.remove('is-highlighted');
      });
    });

    // Initial render
    renderOversizedQr('NP-7K2M4QX9');
  }

  // ================= Header Navigation =================
  function initHeader() {
    var header = document.querySelector('.site-header');
    var nav = document.querySelector('.site-nav');
    var toggle = document.querySelector('.nav-toggle');

    function closeNavigation() {
      if (!nav || !toggle) return;
      nav.classList.remove('is-open');
      if (header) header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
      onScroll();
    }

    if (nav && toggle) {
      toggle.addEventListener('click', function () {
        var isOpen = toggle.getAttribute('aria-expanded') === 'true';
        nav.classList.toggle('is-open', !isOpen);
        if (header) header.classList.toggle('nav-open', !isOpen);
        toggle.setAttribute('aria-expanded', String(!isOpen));
        toggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
        onScroll();
      });

      nav.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', closeNavigation);
      });

      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeNavigation();
          toggle.focus();
        }
      });

      window.addEventListener('resize', function () {
        if (window.innerWidth > 820) closeNavigation();
      });
    }

    function onScroll() {
      if (!header) return;
      if (window.scrollY > 180 || header.classList.contains('nav-open')) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ================= 8. Canonical App Screens Gallery Filter =================
  function initScreensFilter() {
    var pills = document.querySelectorAll('.filter-pill');
    var cards = document.querySelectorAll('.screen-card');

    if (!pills.length || !cards.length) return;

    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var filter = pill.getAttribute('data-filter');

        pills.forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');

        cards.forEach(function (card) {
          var cat = card.getAttribute('data-category');
          if (filter === 'all' || cat === filter) {
            card.classList.remove('is-hidden');
            card.style.display = 'flex';
          } else {
            card.classList.add('is-hidden');
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // ================= 6. Investor Podcast Audio Player =================
  function initInvestorAudioPlayer() {
    var audio = document.getElementById('nameplatePodcastAudio');
    var playBtn = document.getElementById('audioPlayBtn');
    var playIcon = document.getElementById('playIcon');
    var pauseIcon = document.getElementById('pauseIcon');
    var scrubber = document.getElementById('audioScrubber');
    var currentTimeEl = document.getElementById('audioCurrentTime');
    var totalDurationEl = document.getElementById('audioTotalDuration');
    var speedToggle = document.getElementById('audioSpeedToggle');
    var waveform = document.getElementById('waveformContainer');
    var chapters = document.querySelectorAll('.chapter-item');

    if (!audio || !playBtn) return;

    var speeds = [1.0, 1.25, 1.5, 2.0];
    var currentSpeedIndex = 0;

    function ensureAudioSource() {
      if (audio.getAttribute('src')) return;
      var source = audio.getAttribute('data-src');
      if (source) {
        audio.src = source;
        audio.load();
      }
    }

    function formatTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return '00:00';
      var m = Math.floor(seconds / 60);
      var s = Math.floor(seconds % 60);
      var hrs = Math.floor(m / 60);
      m = m % 60;
      if (hrs > 0) {
        return (hrs < 10 ? '0' + hrs : hrs) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
      }
      return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    }

    function highlightActiveChapter(currTime) {
      var activeIdx = -1;
      chapters.forEach(function (chap, i) {
        var s = parseFloat(chap.getAttribute('data-seek')) || 0;
        if (currTime >= s) {
          activeIdx = i;
        }
      });
      chapters.forEach(function (chap, i) {
        if (i === activeIdx) {
          chap.classList.add('is-active-chapter');
        } else {
          chap.classList.remove('is-active-chapter');
        }
      });
    }

    playBtn.addEventListener('click', function () {
      if (audio.paused) {
        ensureAudioSource();
        audio.play().then(function () {
          playIcon.classList.add('hidden');
          pauseIcon.classList.remove('hidden');
          if (waveform) waveform.classList.add('is-playing');
        }).catch(function (err) {
          console.warn('Audio playback error:', err);
        });
      } else {
        audio.pause();
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        if (waveform) waveform.classList.remove('is-playing');
      }
    });

    audio.addEventListener('timeupdate', function () {
      if (!audio.duration) return;
      var progress = (audio.currentTime / audio.duration) * 100;
      if (scrubber) scrubber.value = progress;
      if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
      highlightActiveChapter(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', function () {
      if (totalDurationEl && audio.duration) {
        totalDurationEl.textContent = formatTime(audio.duration);
      }
    });

    audio.addEventListener('ended', function () {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
      if (waveform) waveform.classList.remove('is-playing');
      if (scrubber) scrubber.value = 0;
    });

    if (scrubber) {
      scrubber.addEventListener('input', function () {
        if (!audio.duration) return;
        var seekTo = (scrubber.value / 100) * audio.duration;
        audio.currentTime = seekTo;
        highlightActiveChapter(seekTo);
      });
    }

    // Clickable Chapter List Items
    chapters.forEach(function (chap) {
      chap.addEventListener('click', function () {
        var seek = parseFloat(chap.getAttribute('data-seek'));
        if (isNaN(seek)) return;
        ensureAudioSource();
        audio.currentTime = seek;
        audio.play().then(function () {
          playIcon.classList.add('hidden');
          pauseIcon.classList.remove('hidden');
          if (waveform) waveform.classList.add('is-playing');
        }).catch(function (err) {
          console.warn('Playback error:', err);
        });
        highlightActiveChapter(seek);
      });
    });

    if (speedToggle) {
      speedToggle.addEventListener('click', function () {
        currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
        var newSpeed = speeds[currentSpeedIndex];
        audio.playbackRate = newSpeed;
        speedToggle.textContent = newSpeed.toFixed(1) + 'x';
      });
    }
  }

  // ================= 7. Interactive Slide Deck Viewer =================
  function initSlideDeckViewer() {
    var mainSlide = document.getElementById('deckMainSlide');
    var slideCounter = document.getElementById('deckSlideCounter');
    var prevBtn = document.getElementById('deckPrevBtn');
    var nextBtn = document.getElementById('deckNextBtn');
    var thumbsTrack = document.getElementById('deckThumbsTrack');
    if (!mainSlide || !slideCounter) return;

    var currentSlide = 1;
    var totalSlides = 15;
    var thumbs = document.querySelectorAll('.deck-thumb');

    function updateSlide(idx) {
      if (idx < 1) idx = totalSlides;
      if (idx > totalSlides) idx = 1;
      currentSlide = idx;

      var padIdx = (currentSlide < 10 ? '0' : '') + currentSlide;
      mainSlide.src = 'images/deck/web/slide_' + padIdx + '.webp?v=3';
      mainSlide.alt = 'Nameplate presentation, slide ' + currentSlide + ' of ' + totalSlides;
      slideCounter.textContent = 'SLIDE ' + padIdx + ' / ' + (totalSlides < 10 ? '0' : '') + totalSlides;

      thumbs.forEach(function (thumb) {
        thumb.setAttribute('aria-pressed', String(parseInt(thumb.getAttribute('data-slide'), 10) === currentSlide));
        if (parseInt(thumb.getAttribute('data-slide'), 10) === currentSlide) {
          thumb.classList.add('is-active');
          // Scroll only the thumbnail strip, never the page or slide viewport.
          thumbsTrack.scrollTo({ left: thumb.offsetLeft - thumbsTrack.offsetLeft - (thumbsTrack.clientWidth - thumb.clientWidth) / 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        } else {
          thumb.classList.remove('is-active');
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        updateSlide(currentSlide - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        updateSlide(currentSlide + 1);
      });
    }

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var s = parseInt(this.getAttribute('data-slide'), 10);
        updateSlide(s);
      });
    });

    thumbs.forEach(function (thumb) {
      thumb.setAttribute('aria-pressed', String(thumb.classList.contains('is-active')));
    });

    // Keep arrow navigation inside the deck so other controls retain their keys.
    mainSlide.closest('.deck-viewer-container').addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateSlide(currentSlide - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateSlide(currentSlide + 1);
      }
    });
  }

  // ================= 8. Contact Us / Information Modal =================
  function initContactModal() {
    var modal = document.getElementById('contactModal');
    var openTriggers = document.querySelectorAll('.open-contact-modal-trigger');
    var closeBtn = document.getElementById('closeContactModalBtn');
    var doneBtn = document.getElementById('contactDoneBtn');
    var form = document.getElementById('contactModalForm');
    var formContainer = document.getElementById('contactFormContainer');
    var successState = document.getElementById('contactSuccessState');
    var submitBtn = document.getElementById('contactSubmitBtn');
    var lastFocusedEl = null;

    if (!modal) return;

    function openModal(e) {
      if (e) e.preventDefault();
      lastFocusedEl = document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var firstInput = modal.querySelector('input:not([type=hidden]), textarea');
      if (firstInput) {
        setTimeout(function () { firstInput.focus(); }, 100);
      }
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
        lastFocusedEl.focus();
      }
    }

    openTriggers.forEach(function (btn) {
      btn.addEventListener('click', openModal);
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    if (doneBtn) {
      doneBtn.addEventListener('click', function () {
        closeModal();
        setTimeout(function () {
          if (form) form.reset();
          if (formContainer) formContainer.style.display = '';
          if (successState) successState.style.display = 'none';
          if (submitBtn) {
            submitBtn.classList.remove('is-loading');
            submitBtn.disabled = false;
          }
        }, 300);
      });
    }

    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (submitBtn) {
          submitBtn.classList.add('is-loading');
          submitBtn.disabled = true;
        }

        // Smooth simulated submission with immediate confirmation
        setTimeout(function () {
          if (formContainer) formContainer.style.display = 'none';
          if (successState) successState.style.display = 'block';
        }, 500);
      });
    }
  }

  // ================= 9. Hero Iso Carousel — single large dramatic iso, cycling =================
  function initHeroIsoCarousel() {
    var img = document.getElementById('heroIsoImg');
    var label = document.getElementById('heroIsoLabel');
    var count = document.getElementById('heroIsoCount');
    var dots = document.getElementById('heroIsoDots');
    var stage = document.getElementById('heroIsoStage');
    if (!img || !label || !count || !dots) return;

    var items = [
      { src: 'images/iso/hvac.svg', label: 'HVAC — Air Handler' },
      { src: 'images/iso/condenser.svg', label: 'Condenser — Split System' },
      { src: 'images/iso/fridge.svg', label: 'Refrigerator — French Door' },
      { src: 'images/iso/range.svg', label: 'Range — Electric' },
      { src: 'images/iso/dishwasher.svg', label: 'Dishwasher — Built-In' },
      { src: 'images/iso/washer.svg', label: 'Washer — Front Load' },
      { src: 'images/iso/dryer.svg', label: 'Dryer — Electric' },
      { src: 'images/iso/water-heater.svg', label: 'Water Heater — Hybrid' },
      { src: 'images/iso/microwave.svg', label: 'Microwave — OTR' },
      { src: 'images/iso/thermostat.svg', label: 'Thermostat — Smart' }
    ];

    var index = 0;
    var timer = null;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };

    // Build dots
    items.forEach(function (_, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-label', items[i].label);
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      if (i === 0) btn.classList.add('is-active');
      btn.addEventListener('click', function () { goTo(i, true); });
      dots.appendChild(btn);
    });
    var dotBtns = dots.querySelectorAll('button');

    function render(i) {
      var item = items[i];
      img.classList.add('is-switching');
      setTimeout(function () {
        img.src = item.src;
        img.alt = item.label;
        label.textContent = item.label;
        count.textContent = pad(i + 1) + ' / ' + pad(items.length);
        dotBtns.forEach(function (b, idx) {
          b.classList.toggle('is-active', idx === i);
          b.setAttribute('aria-selected', idx === i ? 'true' : 'false');
        });
        img.classList.remove('is-switching');
      }, 140);
    }

    function goTo(i, user) {
      index = (i + items.length) % items.length;
      render(index);
      if (user) restart();
    }

    function next() { goTo(index + 1, false); }

    function start() {
      if (timer) return;
      timer = setInterval(next, 2600);
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function restart() {
      stop();
      start();
    }

    if (stage) {
      stage.addEventListener('mouseenter', stop);
      stage.addEventListener('mouseleave', start);
    }
    dots.addEventListener('mouseenter', stop);
    dots.addEventListener('mouseleave', start);

    // Pause when tab hidden
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    // Keyboard: when carousel focused, arrow keys
    var carousel = document.querySelector('.hero-iso-carousel');
    if (carousel) {
      carousel.setAttribute('tabindex', '0');
      carousel.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1, true); }
        if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1, true); }
      });
    }

    render(0);
    start();
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initHeader();
      initTheme();
      initHeroIsoCarousel();
      initOversizedQrStudio();
      initHqYieldGallery();
      initScreensFilter();
      initInvestorAudioPlayer();
      initSlideDeckViewer();
      initContactModal();
    });
  } else {
    initHeader();
    initTheme();
    initHeroIsoCarousel();
    initOversizedQrStudio();
    initHqYieldGallery();
    initScreensFilter();
    initInvestorAudioPlayer();
    initSlideDeckViewer();
    initContactModal();
  }

})();
