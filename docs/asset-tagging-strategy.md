# Nameplate — Asset Tagging & Identification Strategy

**Status:** Decided (V0). This is the single most consequential product decision in the system — it determines whether the asset registry is trustworthy, whether shrinkage detection works, and how fast a tech can onboard a unit.

---

## 1. The question

Do we identify assets by **what the manufacturer already put on them** (serial numbers, nameplates, existing barcodes/QR codes), backed by a lookup database — or do we **mint our own proprietary tags** (QR/NFC stickers) and treat manufacturer data as secondary?

## 2. Decision

> ### Hybrid, with a hard priority order.
>
> **Mint our own identifier — the Nameplate ID (NPID) — as the primary, scannable key for every asset. Capture the manufacturer serial and model as high-value *attributes* of that record, resolved against a self-built, crowd-populated asset-master catalog. Ship printed QR stickers in V0; add NFC as an optional premium tag in V1.**

Neither pure approach survives contact with an apartment maintenance closet. The serial-only approach fails on data quality; the proprietary-only approach throws away the manufacturer data that makes the analytics valuable. The hybrid is not a compromise — each half does a job the other can't.

---

## 3. Why manufacturer serials cannot be the primary key

This is the intuitive choice and it is wrong. Six independent reasons, each sufficient on its own:

**3.1 The plate is frequently unreadable.** In installed multifamily stock, a large fraction of data plates are inaccessible or degraded: behind a stacked dryer, on the back of a fridge wedged into an alcove, inside a dishwasher door frame that faces the cabinet, painted over during a unit repaint, corroded on a water heater in a humid closet, or on a rooftop condenser sun-bleached to blank silver. A tech can be standing in front of an asset, certain of what it is, and unable to read its serial. **A primary key you can't always read is not a primary key.**

**3.2 There is no universal serial-format standard.** GE, Whirlpool, Frigidaire (Electrolux), LG, Samsung, Bosch, Maytag, Amana, Rheem, A.O. Smith, Carrier, Goodman, and Trane each use different serial schemes — different lengths, different alphabets, different embedded date encodings, and different placement conventions. Some brands reuse serial sequences across product lines. Some appliance serials are not globally unique even within one manufacturer. A key that isn't guaranteed unique isn't a key.

**3.3 Transcription is error-prone in exactly the wrong way.** A serial is read by flashlight, at an awkward angle, and typed one-handed. `0/O`, `1/I/l`, `5/S`, `8/B`, `2/Z` confusions are constant. OCR helps and does not solve it. A typo in an attribute is a data-quality issue you fix later; a typo in the primary key silently creates a duplicate asset or, worse, merges two real assets. **Errors in the key are unrecoverable; errors in an attribute are correctable.**

**3.4 Some assets have no usable serial at all.** Garbage disposals, range hoods, older wall thermostats, and some builder-grade units carry only a model number, or nothing legible.

**3.5 The two concepts are genuinely different.** A manufacturer serial identifies *a product instance that left a factory*. We need to identify *a physical thing this portfolio is responsible for, right now*. Those diverge in real cases: a refrigerator whose door and compressor were both replaced is arguably a different object; a unit rebuilt from two dead ones has an ambiguous serial. More importantly, **our record must exist before the serial is known.** A tech walking a unit for the first time needs to create "the washer in 4B" in four seconds and enrich it later.

**3.6 The existing barcodes on appliances aren't for us.** Where manufacturers do print barcodes/QR on the plate, they're heterogeneous (Code 128, Data Matrix, sometimes QR), often encode internal SKU or production-lot data rather than a clean serial, are frequently positioned where a phone camera can't get a straight-on shot, and are printed on a substrate that ages badly. Scanning them opportunistically: yes. Depending on them: no.

---

## 4. There is no universal manufacturer serial lookup API — plan accordingly

**State this plainly because a plan built on the opposite assumption fails in week three:** there is **no free, public, universal API** that accepts a manufacturer + serial number for a residential appliance and returns model, specs, manufacture date, and warranty status across brands. This does not exist.

What actually exists, and what each is worth to us:

| Source | Reality | Usable? |
|---|---|---|
| Manufacturer warranty-lookup web pages (GE, Whirlpool, LG, etc.) | Per-brand, HTML, CAPTCHA/rate-limited, ToS-restricted, formats change without notice | **No.** Scraping is fragile and legally hostile. Do not build on this. |
| Manufacturer B2B/dealer APIs | Exist for authorized service networks and distributors, gated behind partnership agreements | **Later.** A real V2 business-development play, one brand at a time. Not a V0 dependency. |
| Parts distributors (Marcone, Reliable, Encompass, RepairClinic, PartSelect) | Excellent *model → parts* data; some have partner APIs | **V1 opportunity** for parts catalog enrichment, not for serial identification. |
| Serial date-code decoding | Well-documented public *rules* for many brands (letter/number position encodes month/year of manufacture) | **Yes — build this.** High value, low cost. See §6.3. |
| ENERGY STAR / AHAM product databases | Public model-level spec data for certified products, no serial resolution | **Yes, as seed data** for the model catalog. Model-level only. |
| Third-party aggregators | Thin coverage for residential appliances, expensive, oriented to retail commerce | **No.** |

**Conclusion:** we must build our own asset-master catalog, populated by the work our users are already doing. That is not a consolation prize — it is the moat (§6.4).

---

## 5. Why proprietary tags alone are also insufficient

If we only ever recorded NPIDs, we'd have a perfect registry of anonymous boxes. The manufacturer serial and model are what unlock:

- **Lifespan analytics by manufacturer/model** — the highest-value analytic in `metrics.md`, and impossible without model resolution.
- **Warranty capture** — knowing manufacture date and model tells you whether a repair should have been billed to the manufacturer. This alone often pays for the product.
- **Age inference for inherited assets** — serial date-code decoding gives an install-date estimate for the 80% of legacy assets whose real install date nobody recorded.
- **Correct parts** — a tech ordering a control board needs the model number, not our NPID.
- **Cross-org identity for theft detection** — a manufacturer serial is the one identifier a thief *can't* remove without destroying the plate. Our sticker peels off; the serial usually doesn't.
- **Recall exposure** — model-level recall matching (V1).

So: NPID for **operations**, serial + model for **intelligence**. Both, always, with different jobs.

---

## 6. The design

### 6.1 The Nameplate ID (NPID)

- **Format:** `NP-XXXXXXXX` — 8 characters, **Crockford Base32** (no `I`, `L`, `O`, `U`), last character a checksum. ~1 trillion values; effectively no collisions, and it never encodes org, property, or category (an ID that encodes location becomes a lie the first time the asset moves).
- **Globally unique across all customers.** Critical: an NPID scanned by *any* Nameplate user resolves to exactly one asset, which is what makes cross-portfolio recovery of walked-off assets possible.
- **Human-readable and human-typeable.** Crockford Base32 is unambiguous by construction and case-insensitive, and the checksum rejects a mistyped character immediately. A tech whose sticker is damaged can read the printed ID aloud over the phone.
- **Minted on record creation, client-side.** The Flutter app can generate and reserve NPIDs from a locally cached block (500 pre-allocated per device, refilled on sync) so a tech can tag assets all day with zero signal. Blocks are org-scoped and expire; unused IDs return to the pool.
- **Immutable for the life of the asset**, across every move, repair, and org transfer.

### 6.2 The physical Nameplate Tag

**V0: printed QR sticker.**

| Spec | Choice | Why |
|---|---|---|
| Symbology | QR Code, error correction level **H** (30%) | Survives a torn corner, a scratch, and lint-fuzz. Non-negotiable for a sticker on a dryer. |
| Payload | `https://np.app/a/NP7K2M4QX9` | A URL, not a bare code: a scan with the phone's native camera by a non-user (a vendor, a new tech, an owner) opens a public read-only asset stub and a prompt to install the app. Free distribution channel and a real recovery mechanism if a tagged asset turns up somewhere unexpected. In-app scanning parses the ID locally without any network call. |
| Human-readable | `NP-7K2M-4QX9` in IBM Plex Mono, 10pt, below the code | Fallback when the code is destroyed. |
| Also printed | `NAMEPLATE` wordmark + `Do not remove — property record` | Deters casual removal; identifies us to a stranger. |
| Size | 1.5" × 1" primary; 1" × 0.75" mini for tight placements | 1.5" scans reliably at arm's length in poor light. |
| Material | **Tamper-evident destructible vinyl** for the standard tag; polyester/polyimide for high-heat surfaces (water heaters, range/oven, dryer exhaust areas) | Destructible vinyl shreds on removal, leaving visible evidence — the theft-deterrent property. Heat-rated stock is mandatory near ovens and water heaters or the adhesive fails within a year. |
| Adhesive | High-tack acrylic, rated for low surface energy + temperature cycling | Painted steel, plastic control panels, and enameled surfaces all behave differently. |
| Placement standard | Documented per category (e.g. washer: front-right of the top panel, facing up; fridge: right side of the door frame at eye level; water heater: front of jacket above the label) | **Consistency is a speed feature.** A tech should never hunt for our tag. Encode this as an in-app placement guide with photos. |
| Fulfillment | Pre-printed sheets of 30, sequential, shipped to the property; plus in-app print-at-home PDF and support for the preferred Brady M611 field printer and other compatible thermal label printers | Pre-printed sheets are how a portfolio onboards 400 units in a week; on-site printing handles replacement tags and day-to-day additions without waiting for a shipment. |

**Sheets are pre-printed with unassigned NPIDs.** The tech peels a sticker, sticks it on the fridge, scans it, and the app claims that NPID and opens the "new asset" form pre-focused on category. This inverts the flow — sticker first, data second — and cuts per-asset onboarding to well under a minute. Unassigned NPIDs are inert until claimed.

#### Preferred property printer

The preferred on-site printer option is the [Brady M611 Bluetooth Label Printer Workstation with Product & Wire ID Software and Hard Case (M611-PWID)](https://www.bradyid.com/label-printers/portable/m611-bluetooth-label-printer-workstation-product-wire-id-software-hard-case-pid-m611-pwid). Plan for **at least one printer per property** so maintenance teams can print replacement tags and label newly added assets without depending on a central office or the next pre-printed batch shipment.

This is a procurement recommendation, not a platform lock-in requirement. Nameplate's generated label output should remain portable, and other printers may be supported when they can produce the required QR size, human-readable NPID, durable media, and adhesive specified above. Label-stock qualification for standard, tamper-evident, and high-heat use remains a separate implementation and procurement step.

**V1: NFC tags.** NTAG213/215 hard tags or on-metal labels encoding the same URL. Benefits: no line-of-sight (scan through a closed cabinet), no light needed, faster tap, and vastly harder to defeat by smearing paint. Costs: ~10–30× the unit price of a sticker, iOS background-read quirks, and metal detuning requiring on-metal ferrite tags. **Positioned as a premium add-on for high-value assets (HVAC, water heaters) and high-shrinkage properties**, never as the baseline. The NPID is identical, so QR and NFC are interchangeable — a single asset can carry both.

**Never:** BLE beacons or RFID gates for V0. Battery replacement across 20,000 assets and reader infrastructure per property destroy the economics.

### 6.3 Capturing manufacturer data — the enrichment ladder

The scan flow is designed so that **a tech can always proceed**, and data quality is recorded honestly rather than faked.

1. **Tag & category (required, ~10 seconds).** Sticker scanned, category chosen from a 16-icon grid. The asset now exists, is locatable, and is countable. `serial_confidence='absent'`.
2. **Nameplate photo (strongly prompted).** One photo of the data plate, stored with `role='nameplate'`. Even if nothing is transcribed, we now have permanent evidence and future OCR training data. This is the single highest-leverage prompt in the app: it converts a 3-second action into recoverable data forever.
3. **OCR pass.** On-device text recognition (ML Kit / Vision) extracts candidate manufacturer, model, and serial from the photo, pre-fills the fields, and the tech confirms or corrects. `serial_confidence='ocr'` until confirmed → `'typed'`. Where the plate has a scannable barcode, we read it opportunistically and mark `'scanned'`.
4. **Model resolution.** Fuzzy-match `manufacturer + model` against `asset_model` (trigram index, normalized forms). Three outcomes: exact match (link), near match (offer top 3, tech picks), no match (create a new `asset_model` with `verification_status='unverified'`). **The tech is never blocked** — an unmatched model still saves.
5. **Serial date decode.** If the resolved `asset_model` has a `serial_date_rule`, decode manufacture date from the serial automatically and set `manufacture_date_source='serial_decode'`. This is where legacy portfolios suddenly get an age curve they never had. Build rules incrementally, highest-volume brands first (Whirlpool, GE, Frigidaire, LG, Samsung, Rheem, A.O. Smith).
6. **Install date & cost.** Known, estimated, or unknown — recorded with `install_date_confidence` so lifespan analytics can exclude guesses instead of quietly averaging them in.

Every step after (1) is optional and can be completed later, by a different person, from HQ. **Completeness is a metric we surface** (`asset_data_completeness_pct` per property), not a gate.

### 6.4 The asset-master catalog is the compounding asset

`asset_model` is **shared across all customer organizations** (see `data-model.md` §3). When a tech at Copper Ridge identifies a `Whirlpool WTW5000DW`, every subsequent customer who encounters that model gets instant resolution, specs, expected life, and — once we have enough events — a real observed failure curve.

Governance:
- New models enter as `unverified` with `first_seen_org_id` and `observation_count=1`.
- Repeated independent observation promotes to `community` (threshold: 5 distinct orgs, or 20 assets).
- Staff curation (and eventual distributor data) promotes to `verified`.
- Near-duplicates are soft-merged via `merged_into_id`; lookups follow the pointer, so no historical asset ever breaks.
- **No customer-identifying data is shared** — only manufacturer, model, and specs. Cross-org aggregate statistics (mean lifespan by model) are published only above a k-anonymity threshold (≥5 orgs, ≥30 assets) and never attributed.

**Why this matters commercially:** after ~50,000 tagged assets, we can tell a prospect *"the Frigidaire dishwashers in your portfolio fail at 6.2 years; the Bosch units in comparable properties last 9.8"* — a claim no competitor and no manufacturer will make. That is a data product built entirely from work our users already do, and it is defensible in a way software features are not.

### 6.5 Handling the messy cases

| Case | Rule |
|---|---|
| Existing customer labels ("CR-W-112") | Recorded in `asset.alt_identifiers` and made **scannable/searchable**. Never force a customer to abandon their labels — it's the #1 migration objection. |
| Sticker destroyed / missing | Re-tag: new sticker scanned, tech confirms it's the same asset (via serial or unit context), old NPID recorded in `alt_identifiers`, `asset.id` unchanged. History preserved. |
| Duplicate suspected (same serial, two NPIDs) | Raises a `reconciliation_flag(kind='duplicate_asset_suspected')` for HQ. Merge is a deliberate admin action that preserves both histories, never automatic. |
| Untagged asset found during a turn | `turn_item.finding='unexpected_found'` → prompts immediate tagging → creates the asset with a `discovered` location row. |
| Asset with no serial at all | Perfectly valid. `serial_confidence='absent'`, model resolved from the model number alone if present, age estimated from property year_built as a last resort with `install_date_confidence='unknown'`. |
| Non-serialized small assets | `asset_category.is_serialized=false` — tracked by count per unit, not individually. |

---

## 7. How this powers shrinkage detection

The tagging strategy is not adjacent to theft prevention; it *is* the theft-prevention mechanism. Four properties do the work:

**7.1 A globally unique, portable identifier makes reappearance detectable.** Because NPIDs are unique across every customer, a washer that leaves Copper Ridge and turns up at a property managed by a *different Nameplate customer* is detected the moment anyone scans it — `asset_identifier_scan` records `resolution='out_of_scope'` with a property mismatch, and staff can broker recovery. This effect strengthens with every customer added: the network is the anti-theft system. No serial-only approach achieves this, because no one scans serials speculatively.

**7.2 Cheap scanning makes frequent confirmation possible, and frequency is the whole game.** The metric that catches shrinkage is not "was it stolen" but **`current_location_confirmed_at`** — when did a human last physically verify this thing exists where we think it does. A 2-second QR scan makes confirmation nearly free, so it happens on every service visit, every turn, and every walkthrough. A 45-second hunt for a corroded serial plate means confirmation *never* happens, and the registry silently rots into fiction. **The tag's real function is to make verification cheap enough to be habitual.** This is the entire argument for proprietary tags, and it is decisive.

**7.3 Tamper-evident material converts removal into a signal.** Destructible vinyl means a tag can't be quietly peeled and moved to another appliance. A missing tag on an asset that should have one is itself an event: the tech reports it, `asset_identifier_scan` logs no resolution, and an investigation opens. Silent substitution — the sophisticated version of this theft — becomes hard.

**7.4 The manufacturer serial is the backstop the thief can't remove.** Our sticker is removable in principle; the factory plate usually isn't. Because we store `serial_normalized` with a **global index but no cross-org unique constraint** (`data-model.md` §3), we can detect the same manufacturer serial surfacing under a second organization — a strong resale signal — and surface it to staff for human review. Untagged recovery is possible precisely because we captured the manufacturer data we didn't make primary.

**Together, these feed the shrinkage score in `metrics.md` §3.2:** days since confirmation, scan-location mismatches, turn "missing" findings, custody-ledger gaps (moves inferred rather than recorded), and cross-org serial collisions.

**Ethical guardrail, restated because it constrains the design:** all of this describes *assets*, never people. The product never ranks technicians by loss, never auto-accuses, and always applies the 30-day grace window before escalating a "missing" finding — because the overwhelmingly common explanation is a relocation nobody logged, not a theft. Techs who feel surveilled stop scanning, and if techs stop scanning the entire dataset dies. Adoption by the field is the precondition for every other feature, so the field's trust is a hard architectural constraint.

---

## 8. V0 implementation checklist

1. NPID generator with Crockford Base32 + checksum; block pre-allocation endpoint for offline minting.
2. `POST /v1/assets` accepting a client-generated id + claimed NPID.
3. `GET /v1/assets/lookup?code=` resolving NPID, manufacturer serial, and `alt_identifiers`, with offline-equivalent logic in the Flutter local store.
4. Flutter scan screen: QR via `mobile_scanner`, manual NPID entry with checksum validation, offline resolution, `asset_identifier_scan` logging on every scan including failures.
5. Nameplate-photo capture with `role='nameplate'` + on-device OCR pre-fill.
6. `asset_model` fuzzy search + create-if-missing flow.
7. Sticker artwork + print PDF generator (sheets of 30); source a tamper-evident vinyl supplier and a heat-rated variant.
8. In-app placement guide, one photo per category.
9. Serial date-decode rules for the top 6 manufacturers.
10. `alt_identifiers` import path for customers migrating off spreadsheets.

**Deferred to V1+:** NFC tags, server-side OCR refinement, distributor parts-API integration, recall matching, cross-org recovery brokering UI, manufacturer B2B API partnerships.
