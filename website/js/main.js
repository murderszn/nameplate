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
        { type: 'red', text: '<strong>Heating Element & Sensors (Red)</strong> — Critical thermal safety control, monitored for burnout cycles.' },
        { type: 'red', text: '<strong>Compressor & Thermostat Bus</strong> — High-CapEx failure risk; captures OEM warranty eligibility.' },
        { type: 'white', text: '<strong>Blower & Condenser Fan</strong> — Mechanical airflow system logged during semi-annual PM audits.' }
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
        { type: 'red', text: '<strong>Water Inlet Valve & Drain Pump (Red)</strong> — High flood-risk points; tracked for solenoid wear.' },
        { type: 'red', text: '<strong>Internal Water Heater & Control Panel</strong> — Monitored for power surges and electronic logic faults.' },
        { type: 'white', text: '<strong>Drive Motor & Outer Drum Casing</strong> — Structural balance and bearing integrity verification.' }
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
        { type: 'red', text: '<strong>Hermetic Sealed Compressor (Red)</strong> — Primary refrigeration power; core warranty recovery asset.' },
        { type: 'red', text: '<strong>Evaporator Coils & Defrost Loop</strong> — Cold-wall freeze risk; tracked for refrigerant efficiency.' },
        { type: 'white', text: '<strong>Thermostat & Magnetic Door Seals</strong> — Air-tight envelope monitoring preventing frost buildup.' }
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
        { type: 'red', text: '<strong>High-Density Heating Element (Red)</strong> — Critical fire-safety checkpoint; resistance certified at turns.' },
        { type: 'white', text: '<strong>Centrifugal Exhaust Blower & Lint Screen</strong> — Airflow backpressure tested to prevent lint accumulation.' },
        { type: 'white', text: '<strong>Drum Drive Belt & Idler Pulley</strong> — Mechanical rotation verified during make-ready turns.' }
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
        { type: 'red', text: '<strong>Internal Water Booster Heater (Red)</strong> — High-temperature sanitation verification.' },
        { type: 'white', text: '<strong>Float Switch & Circulation Pump</strong> — Sub-floor leak mitigation sensors tested annually.' },
        { type: 'white', text: '<strong>Upper/Lower Spray Arms & Racks</strong> — Mechanical wash integrity checked during turnover audits.' }
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
        { type: 'red', text: '<strong>HVAC Relay Bus & Control Panel (Red)</strong> — 24V signaling protection against power surges.' },
        { type: 'white', text: '<strong>Digital LCD Display & User Interface</strong> — Hardware status telemetry reporting.' },
        { type: 'white', text: '<strong>Precision Temperature Sensor</strong> — Thermal calibration audit logged across seasons.' }
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
        { type: 'red', text: '<strong>Magnetron & High-Voltage Tube (Red)</strong> — Core microwave radiation generator.' },
        { type: 'white', text: '<strong>Dual Interlock Safety Door Latches</strong> — Door closure sensor preventing open-door operation.' },
        { type: 'white', text: '<strong>Waveguide Chamber & Exhaust Fan</strong> — Energy dissipation and kitchen grease ventilation.' }
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
        { type: 'red', text: '<strong>Upper/Lower Titanium Heating Elements (Red)</strong> — Dual dry-fire protected thermal resistors.' },
        { type: 'white', text: '<strong>Sacrificial Magnesium Anode Rod</strong> — Corrosion barrier inspected during annual turn audit.' },
        { type: 'white', text: '<strong>Temperature & Pressure Relief Valve</strong> — Safety pressure discharge rated to 150 PSI.' }
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
    var simImg = document.getElementById('simSidebarSchematicImg');
    var simName = document.getElementById('simAssetName');
    var simCat = document.getElementById('simAssetCategory');
    var simOwner = document.getElementById('simAssetOwner');
    var simProp = document.getElementById('simAssetProperty');
    var simRoom = document.getElementById('simAssetRoom');
    var simAddr = document.getElementById('simAssetAddress');
    var simGps = document.getElementById('simAssetGps');

    if (simHdrNpid) simHdrNpid.textContent = 'NPID: ' + data.npid;
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

    // 4. Lineage Table Rows
    var tableBody = document.getElementById('simLineageTableBody');
    if (tableBody) {
      var tHtml = '';
      data.lineage.forEach(function (row) {
        tHtml += '<tr>' +
          '<td class="mono">' + esc(row.date) + '</td>' +
          '<td><strong>' + esc(row.part) + '</strong></td>' +
          '<td class="mono" style="color: var(--gray-400);">' + esc(row.oem) + '</td>' +
          '<td>' + esc(row.tech) + '</td>' +
          '<td><span class="sim-part-badge ' + esc(row.statusClass) + '">' + esc(row.status) + '</span></td>' +
          '</tr>';
      });
      tableBody.innerHTML = tHtml;
    }
  }

  // ================= 3. Interactive Schematics Viewer Tabs =================
  function initSchematicsViewer() {
    var tabs = document.querySelectorAll('#schematicTabs .schematic-tab-btn');
    var trioCards = document.querySelectorAll('.schematic-card-mini');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('is-active'); });
        tab.classList.add('is-active');
        var key = tab.getAttribute('data-sch');
        renderLiveAppRecord(key);
      });
    });

    trioCards.forEach(function (card) {
      card.addEventListener('click', function () {
        var key = card.getAttribute('data-select-sch');
        tabs.forEach(function (t) {
          if (t.getAttribute('data-sch') === key) t.classList.add('is-active');
          else t.classList.remove('is-active');
        });
        renderLiveAppRecord(key);
        var simEl = document.getElementById('appSimulatorView');
        if (simEl) simEl.scrollIntoView({ behavior: 'smooth' });
      });
    });
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
    var btnScan = document.getElementById('btnTriggerLaserScan');
    var laser = document.getElementById('laserScanline');

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
      });
    }

    if (btnScan) {
      btnScan.addEventListener('click', function () {
        if (laser) {
          laser.classList.add('is-active');
        }
        // Detach the original label + icon nodes so they can be restored
        // verbatim, without round-tripping the button through innerHTML.
        var origNodes = Array.prototype.slice.call(btnScan.childNodes);
        btnScan.textContent = 'Scanning Tag...';

        setTimeout(function () {
          if (laser) laser.classList.remove('is-active');
          btnScan.textContent = '✓ Physical Asset Resolved (0.4s)';
          btnScan.style.background = '#FFFFFF';
          btnScan.style.color = '#000000';

          setTimeout(function () {
            btnScan.replaceChildren.apply(btnScan, origNodes);
            btnScan.style.background = '';
            btnScan.style.color = '';
          }, 2400);
        }, 1200);
      });
    }

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
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
    }

    if (nav && toggle) {
      toggle.addEventListener('click', function () {
        var isOpen = toggle.getAttribute('aria-expanded') === 'true';
        nav.classList.toggle('is-open', !isOpen);
        toggle.setAttribute('aria-expanded', String(!isOpen));
        toggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
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
      if (window.scrollY > 10) {
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
      mainSlide.src = 'images/deck/web/slide_' + padIdx + '.webp';
      slideCounter.textContent = 'SLIDE ' + padIdx + ' / ' + (totalSlides < 10 ? '0' : '') + totalSlides;

      thumbs.forEach(function (thumb) {
        if (parseInt(thumb.getAttribute('data-slide'), 10) === currentSlide) {
          thumb.classList.add('is-active');
          thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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

    // Keyboard Arrow Navigation
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        updateSlide(currentSlide - 1);
      } else if (e.key === 'ArrowRight') {
        updateSlide(currentSlide + 1);
      }
    });
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initHeader();
      initOversizedQrStudio();
      initSchematicsViewer();
      initScreensFilter();
      initInvestorAudioPlayer();
      initSlideDeckViewer();
      renderLiveAppRecord('hvac');
    });
  } else {
    initHeader();
    initOversizedQrStudio();
    initSchematicsViewer();
    initScreensFilter();
    initInvestorAudioPlayer();
    initSlideDeckViewer();
    renderLiveAppRecord('hvac');
  }

})();
