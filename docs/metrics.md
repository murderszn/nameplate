# Nameplate — Metrics & Analytics

Two distinct products live in this document and must not be confused:

- **§1–3: HQ dashboard metrics** — deterministic aggregations over `data-model.md` tables. Explainable, drillable, auditable. Every one is a SQL query. These ship in V0/V1 and are what the customer buys.
- **§4: Data-science opportunities** — models that require accumulated data, carry uncertainty, and must be presented as estimates. These are V2+ and are what makes the product defensible.

Field references below use `table.column` from `data-model.md`.

**Global conventions:** all cost metrics exclude `service_event.cost_borne_by IN ('tenant','warranty','insurance')` by default, with a toggle — otherwise a warranty-heavy property looks artificially expensive. All lifespan metrics exclude assets with `install_date_confidence='unknown'` by default. All metrics respect `service_event.corrected_by_event_id IS NULL`. Every number in HQ is clickable through to the underlying rows; a metric a manager can't drill into is a metric they won't trust.

---

## 1. HQ dashboard — portfolio overview

The landing screen for the person in Arizona. Six tiles, nothing more. If it doesn't change a decision this week, it isn't on this screen.

| # | Metric | Definition | Fields |
|---|---|---|---|
| 1.1 | **Assets under management** | Count of `asset` where `status NOT IN ('retired','disposed')`, split by category | `asset.status`, `asset.category_id`, `asset.org_id` |
| 1.2 | **Maintenance spend, trailing 12 months** | `SUM(service_event.total_cost)` over 12m, with prior-period delta | `service_event.total_cost`, `.occurred_at`, `.cost_borne_by` |
| 1.3 | **Open work orders / at-risk** | Count by `status`, plus count where `sla_due_at < now()` and not completed | `work_order.status`, `.sla_due_at`, `.completed_at` |
| 1.4 | **Assets unaccounted for** | Count where `status='unaccounted_for'`, plus count "not confirmed in 180d" | `asset.status`, `asset.current_location_confirmed_at` |
| 1.5 | **Turns in progress** | Count `turn.status='in_progress'` + median days-to-complete | `turn.status`, `.started_at`, `.completed_at` |
| 1.6 | **Assets past expected life** | Count where `age_months > COALESCE(asset.expected_life_months, asset_model.expected_life_months, asset_category.default_useful_life_months)` | `asset.install_date`, `.manufacture_date`, the three life fields |

---

## 2. HQ dashboard — operational metrics

### 2.1 Cost

| Metric | Definition | Fields | Why it matters |
|---|---|---|---|
| **Cost per asset (lifetime)** | `asset.lifetime_service_cost`; also as % of `purchase_cost` or `asset_model.typical_replacement_cost` | `asset.lifetime_service_cost`, `.purchase_cost`, `asset_model.typical_replacement_cost` | The atomic repair-vs-replace input. Crossing ~60% of replacement cost is the classic replace trigger (`organization.settings.replace_threshold_pct`). |
| **Cost per asset per year of life** | `lifetime_service_cost / age_years` | + `asset.install_date`, `.manufacture_date` | Normalizes old vs. new assets. The honest version of "which appliances are expensive." |
| **Cost per unit (period)** | `SUM(service_event.total_cost) GROUP BY service_event.unit_id` | `service_event.unit_id`, `.total_cost`, `.occurred_at` | Uses the **snapshotted** `unit_id` on the event, not the asset's current unit — costs belong to where the work happened. |
| **Cost per property / per unit-per-month** | Property total ÷ `property.unit_count_declared` ÷ months | `service_event.property_id`, `property.unit_count_declared` | The number a regional manager is judged on. Enables property benchmarking. |
| **Cost by category** | Group by `asset.category_id` | `asset.category_id`, `service_event.total_cost` | "HVAC is 41% of our spend" reframes budgeting. |
| **Cost by manufacturer / model** | Group by `asset_model.manufacturer`, `.model_number` | `asset.asset_model_id`, `asset_model.*` | **The purchasing-decision metric.** Directly changes what the customer buys next. |
| **Labor vs. parts split** | `SUM(labor_cost)` vs `SUM(parts_cost)` vs `SUM(other_cost)` | `service_event.labor_cost`, `.parts_cost`, `.other_cost` | Labor-heavy categories are candidates for vendor outsourcing; parts-heavy for stocking. |
| **Warranty recovery / leakage** | `SUM(total_cost)` where `is_warranty_claim=true`; **leakage** = cost of repairs on assets where `occurred_at < warranty_expires_on` but `is_warranty_claim=false` | `service_event.is_warranty_claim`, `.occurred_at`, `asset.warranty_expires_on` | **Often pays for the product outright.** Money spent on repairs the manufacturer owed. |
| **Cost avoided via parts reuse** | `SUM(part.imputed_value)` where `origin='salvaged'` and installed in period | `part.origin`, `.imputed_value`, `part_usage.action`, `.occurred_at` | Makes the salvage discipline visible and rewards it. |
| **Deferred maintenance exposure** | `SUM(service_event.estimated_repair_cost_if_deferred)` where `repair_vs_replace_decision='deferred'` and unresolved | `service_event.estimated_repair_cost_if_deferred`, `.repair_vs_replace_decision` | The liability nobody tracks. Turns "we saved money" into "we postponed $34k." |
| **Capex forecast, next 12/24/36 months** | Count × replacement cost of assets projected past end-of-life in window | `asset.install_date`, life fields, `asset_model.typical_replacement_cost` | The budgeting artifact that gets this product renewed. |

### 2.2 Lifespan & reliability

| Metric | Definition | Fields |
|---|---|---|
| **Mean/median age of installed base** | By category, property, model | `asset.install_date`, `.manufacture_date`, `.category_id`, `.current_property_id` |
| **Realized lifespan** | For retired assets: `retired_at - install_date`, grouped by manufacturer/model/category. Excludes `retired_reason IN ('stolen','lost','damaged')` — those aren't wear-out | `asset.retired_at`, `.install_date`, `.retired_reason`, `asset_model.manufacturer` |
| **Survival curve (Kaplan–Meier)** | Proper survival analysis treating still-active assets as right-censored, by model/category | same + `asset.status` | Naive mean-of-retired-assets is badly biased toward early failures; K-M is the correct estimator and is still a deterministic query, not a model. |
| **Service frequency** | Events per asset per year, by category/model | `service_event.asset_id`, `.occurred_at`, `.event_type` |
| **Mean time between service (MTBS)** | Window function `LAG(occurred_at)` per asset | `service_event.asset_id`, `.occurred_at` |
| **First-failure age** | Age at first `event_type IN ('repair','part_replacement')` | `asset.install_date`, `service_event.occurred_at`, `.event_type` |
| **Repeat-failure rate** | % of assets with ≥2 events sharing a `symptom_code` within 90 days | `service_event.symptom_codes`, `.asset_id`, `.occurred_at` | Direct proxy for rework quality. |
| **Component failure profile** | Frequency by `part_catalog.component_type` per `asset_model` | `part_usage.part_catalog_id`, `part_catalog.component_type`, `asset.asset_model_id` | "LG dryers: 60% of failures are the heating element" → stock the part. |
| **Data completeness** | % of assets with resolved model / known install date / nameplate photo | `asset.asset_model_id`, `.install_date_confidence`, `.serial_confidence`, `media_attachment.role='nameplate'` | Gates every other metric's credibility. Surface it, don't hide it. |

### 2.3 Work orders & field operations

| Metric | Definition | Fields |
|---|---|---|
| **SLA attainment** | % where `completed_at <= sla_due_at`, by priority | `work_order.sla_due_at`, `.completed_at`, `.sla_met`, `.priority` |
| **Time to first response** | `first_response_at - created_at`, p50/p90 | `work_order.first_response_at`, `.created_at` |
| **Time to resolution** | `completed_at - created_at`, p50/p90, by priority and category | `work_order.completed_at`, `.created_at`, `.priority` |
| **Open aging buckets** | Counts at 0–2 / 3–7 / 8–14 / 15+ days | `work_order.created_at`, `.status` |
| **Awaiting-parts dwell time** | Time in `status='awaiting_parts'` | `work_order.status` + `audit_log` transitions | The most common hidden SLA killer. |
| **First-time fix rate** | % of work orders closed with exactly one `service_event` and no follow-up within 30 days | `work_order.id`, `service_event.work_order_id`, `.follow_up_required` |
| **Rework rate** | % of assets with a second event, same `symptom_code`, ≤30 days | `service_event.symptom_codes`, `.asset_id`, `.occurred_at` |
| **Work order volume by source** | Group by `source` | `work_order.source` | Rising `tenant_request` share vs. `preventive` signals a reactive-maintenance spiral. |
| **Turn cycle time** | `turn.completed_at - started_at`, p50/p90 by property | `turn.started_at`, `.completed_at`, `.property_id` | Vacancy days are the largest cost in multifamily; this metric connects maintenance to revenue. |
| **Turn findings profile** | Distribution of `turn_item.finding` and `.decision` | `turn_item.finding`, `.decision` |
| **Scan verification rate** | % of `turn_item` with `verified_by_scan=true`; % of service events with a preceding scan | `turn_item.verified_by_scan`, `asset_identifier_scan` | **Adoption health.** If this falls, every downstream metric degrades. Watch it above all others in the first 90 days. |
| **Sync health** | Outbox depth, oldest unsynced op age, push failure rate by device | `device.last_sync_at`, `sync_op.status` | Internal/ops metric. Page on it. |

> **Team-level metrics are deliberately constrained.** Per-technician throughput and cost are computable (`service_event.technician_id`) and are exposed to `property_manager`+ **at the aggregate level only**, framed as workload and capacity, never as a leaderboard, and never joined to loss/shrinkage figures in any UI. See `branding.md` §5 and `asset-tagging-strategy.md` §7.

### 2.4 Repair-vs-replace economics

The analytic that most directly changes customer behavior.

| Metric | Definition | Fields |
|---|---|---|
| **Repair-to-replace ratio** | Count `resolution='repaired'` vs `'replaced'`, by category/model | `work_order.resolution`, `service_event.repair_vs_replace_decision` |
| **Cumulative repair cost vs. replacement cost** | Per asset: `lifetime_service_cost / typical_replacement_cost` — flag assets over the org threshold | `asset.lifetime_service_cost`, `asset_model.typical_replacement_cost`, `organization.settings.replace_threshold_pct` |
| **Post-repair survival** | Median time from a `repair` event to the next failure, by category and repair cost band | `service_event.occurred_at`, `.event_type`, `.total_cost` | Answers "does repairing a 12-year-old washer actually buy time?" — usually the answer is *not much*, and having the number ends the argument. |
| **Decision-quality review** | For repaired assets, % that were replaced within 12 months anyway → the money wasted | `service_event.repair_vs_replace_decision`, `asset.retired_at`, `.replaced_by_asset_id` | Retrospective scoring of past decisions. The most persuasive report we can produce. |
| **Replacement chain depth** | Count of hops via `asset.replaced_by_asset_id` per unit | `asset.replaced_by_asset_id`, `.current_unit_id` | "This unit has consumed four washers in six years" → the problem may be the unit, the tenant profile, or the plumbing, not the appliance. |
| **Model-level total cost of ownership** | `(purchase_cost + lifetime_service_cost) / realized_life_years`, grouped by `asset_model` | `asset.purchase_cost`, `.lifetime_service_cost`, life fields | **The procurement recommendation.** The single most valuable number in the product. |

### 2.5 Shrinkage & chain of custody (deterministic)

| Metric | Definition | Fields |
|---|---|---|
| **Unconfirmed assets** | Count/list where `current_location_confirmed_at < now() - N days` (N configurable, default 180) | `asset.current_location_confirmed_at`, `.status` |
| **Unaccounted-for count & value** | `status='unaccounted_for'`, valued at `typical_replacement_cost` | `asset.status`, `asset_model.typical_replacement_cost` |
| **Shrinkage rate** | Assets unaccounted-for per 100 units per year, by property | `asset.status`, `property.unit_count_declared` | The benchmarkable headline number. |
| **Custody gap rate** | % of `asset_location` rows with `movement_kind IN ('inferred','discovered')` rather than `'recorded'` | `asset_location.movement_kind` | Measures *process* discipline, which predicts loss better than loss itself. |
| **Location mismatches** | Scans where `expected_property_id <> actual_property_id` | `asset_identifier_scan.expected_property_id`, `.actual_property_id`, `.resolution` |
| **Out-of-scope scans** | `asset_identifier_scan.resolution='out_of_scope'` | same | The reappearance signal, including cross-org. |
| **Cross-org serial collisions** | Same `asset.serial_normalized` under two `org_id`s | `asset.serial_normalized`, `.org_id` | Staff-reviewed only. Never auto-surfaced as an accusation. |
| **Turn-detected missing rate** | `turn_item.finding='missing'` ÷ `turn_item` total, by property | `turn_item.finding`, `turn.property_id` |
| **Grace-window resolution rate** | % of `missing` findings auto-resolved as relocations within 30 days | `turn_item.finding`, `asset_location.movement_kind='inferred'` | **The false-positive guard.** If this is high, our alerts are noise and thresholds need tuning. |
| **Recovery rate & time** | % of unaccounted assets returned to `active`; median days | `asset.status` transitions in `audit_log` |

### 2.6 Parts & reuse

| Metric | Fields |
|---|---|
| Salvaged parts in stock (count & imputed value) | `part.status='in_stock'`, `.origin='salvaged'`, `.imputed_value` |
| Salvage-to-install conversion rate & median dwell time | `part.salvaged_at`, `part_usage.occurred_at`, `.action='installed'` |
| Reuse failure rate — do salvaged parts fail sooner than new? | `part.origin`, `part.installed_in_asset_id`, subsequent `service_event.symptom_codes` |
| Parts spend by `component_type` and by `asset_model` | `part_usage.total_cost`, `part_catalog.component_type`, `asset.asset_model_id` |
| Cost-estimate quality | `part_usage.cost_source` distribution |
| **Full lineage trace** (not a metric, a report) | `part.source_asset_id` → `part.source_service_event_id` → `part_usage.action='installed'` → `part.installed_in_asset_id` |

---

## 3. Dashboard composition

**HQ Admin home:** the six tiles from §1, plus a portfolio map, a property league table (cost/unit/month, SLA %, shrinkage rate, avg asset age), the at-risk work order queue, and unresolved `reconciliation_flag`s.

**Property Manager home:** scoped versions of §2.1 (cost/unit), §2.3 (SLA, turn cycle time), §2.5 (unconfirmed assets at their property), plus their open work orders and in-flight turns.

**Technician (in Field app):** **almost none of this.** A tech sees their work order queue, today's turns, and per-asset history. No cost dashboards, no performance metrics, no shrinkage screens. Metrics are a management tool; putting them in the field app adds cognitive load and erodes trust.

**Reporting infrastructure:** §1 tiles are computed live against the read replica (cached 60s). §2 metrics are precomputed nightly into `metric_snapshot` at `org`/`property`/`unit`/`asset_model`/`category` scope, with a day/week/month grain — this keeps HQ instant at portfolio scale and gives us historical trend series for free, which live queries cannot reconstruct once definitions change.

---

## 4. Data-science & modeling opportunities

**Preconditions.** None of these ship before we have roughly **2+ years of history across 20k+ assets and 100k+ service events**, with `data_completeness > 70%`. Shipping a model on thin data produces confident nonsense, and one bad prediction destroys more trust than ten good ones build. Until then, the deterministic metrics above are the product. Every model below must ship with (a) a stated confidence interval, (b) an explanation in plain language, (c) a human-in-the-loop action rather than an automated one, and (d) a measured baseline it must beat.

### 4.1 Lifespan / survival modeling — **highest value, do first**

**Goal:** for a given asset, estimate remaining useful life and the probability of failure in the next 12 months.

- **Method:** start with Kaplan–Meier survival curves per `asset_model` and per category (non-parametric, interpretable, handles right-censoring correctly). Graduate to **Cox proportional hazards** or a **gradient-boosted survival model** to incorporate covariates.
- **Features:** `asset.manufacture_date`, `install_date`, `asset_model.manufacturer/model_number`, `asset_category.key`, prior `service_event` count and `symptom_codes`, `part_usage` history, `unit.bedrooms` (proxy for household size and duty cycle), `property.year_built`, climate zone from `property.latitude/longitude`, `condition` trajectory across events, `acquisition_type` (new vs. inherited).
- **Output:** per-asset survival probability curve → **capex forecast that is probabilistic rather than a naive age cutoff**, and per-model benchmarking sold as procurement guidance.
- **Watch for:** survivorship bias in inherited assets (an inherited 14-year-old fridge is a *survivor* and biases the curve optimistically — model `acquisition_type` explicitly); and left-truncation, since we only observe assets from the date they were tagged.
- **Baseline to beat:** category default useful life. If the model can't beat a lookup table, don't ship it.

### 4.2 Predictive maintenance / failure triage

**Goal:** flag assets likely to fail imminently, and predict likely failure mode to pre-stage parts.

- **Method:** gradient-boosted classifier (XGBoost/LightGBM) on a 90-day forward-failure label. Multi-class variant predicting `symptom_code`.
- **Features:** §4.1 features + recency/frequency of events, repeat-symptom flags, `condition_after` trend, seasonality (AC failures cluster in the first heat wave — `property.latitude` + month), time since last preventive event.
- **Value:** a tech dispatched with the right part on the truck converts two visits into one. Directly improves first-time-fix rate and SLA attainment.
- **Realistic caveat:** without IoT telemetry we have only service history, so precision will be modest. **Frame it as "pre-stage this part," not "this will fail."** The honest V2 version of this is *parts pre-staging*, which is valuable even at 40% precision, rather than *failure prediction*, which is not valuable at 40% precision.

### 4.3 Shrinkage detection scoring

**Goal:** rank assets by likelihood of being genuinely lost rather than merely unlogged.

- **Method:** **start with a transparent weighted rule-based score, not a model.** In this domain an unexplainable accusation is worse than no signal. Signals and indicative weights:

| Signal | Field | Weight |
|---|---|---|
| Days since `current_location_confirmed_at` (log-scaled) | `asset.current_location_confirmed_at` | high |
| Turn finding `missing`, unresolved past grace window | `turn_item.finding` | high |
| Location changed with `movement_kind='inferred'` (no logged move) | `asset_location.movement_kind` | medium |
| Scan property mismatch | `asset_identifier_scan.expected/actual_property_id` | high |
| Tag reported missing/damaged | `asset_identifier_scan.resolution='not_found'` + tech report | medium |
| Asset is portable and high-value (window AC, microwave, small fridge) | `asset_category.key`, `asset_model.typical_replacement_cost` | medium |
| Unit vacant during the unconfirmed window | `unit.occupancy_status` history | medium |
| Custody-ledger gap > 12 months | `asset_location` row spacing | low |
| Cross-org serial collision | `asset.serial_normalized` | very high (staff review only) |

- **Upgrade path:** once we have labeled outcomes (recovered vs. confirmed lost, from `asset.retired_reason`), train a calibrated classifier and use **anomaly detection at the property level** (isolation forest over property-month feature vectors) to catch systemic patterns rather than individual assets. Property-level anomaly detection is both more actionable and less accusatory than per-asset scoring.
- **Hard constraints:** never model or score individual technicians. Output is always "asset X needs verification," never "person Y is suspected." Every high score routes to a **verification work order**, not an alert — the action is *go look*, which resolves most cases benignly and generates the label we need.

### 4.4 Cost anomaly detection

**Goal:** catch billing errors, scope creep, and unusual spend before the month closes.

- **Method:** robust z-score / IQR against a peer cohort — same `asset_model` + `event_type` + `symptom_code` + region — flagging `service_event.total_cost` outliers. Add seasonal decomposition on property-month spend series for trend anomalies.
- **Features:** `service_event.total_cost`, `labor_minutes`, `parts_cost`, `part_usage.unit_cost` vs `part_catalog.typical_cost`, `vendor_id`, `cost_borne_by`.
- **Concrete wins:** a vendor charging 3× cohort median for the same board; labor minutes on a filter swap that imply a four-hour visit; the same part billed twice within a week.
- **Also flag the reverse:** suspiciously *low*/zero-cost events, which usually indicate missing data rather than efficiency.

### 4.5 Model resolution & OCR extraction

**Goal:** raise `data_completeness` without adding tech effort. **This is the highest-ROI ML work in the near term** because it improves every other metric.

- Fine-tuned OCR + a sequence labeler over nameplate photos (`media_attachment.role='nameplate'`) to extract manufacturer/model/serial. We accumulate a perfectly labeled corpus for free: the photo plus whatever the tech confirmed.
- Fuzzy entity resolution over `asset_model` (learned string similarity + `serial_format_regex` validation) to auto-merge the inevitable `WTW5000DW` / `WTW-5000DW2` / `Whirlpool WTW5000DW` variants.
- Serial date-code decoding as learned rules per manufacturer, validated against known `install_date`s.

### 4.6 Replace-vs-repair decision optimization

**Goal:** given an asset and a diagnosed fault, recommend repair or replace with an expected-cost justification.

- **Method:** expected-value calculation on top of §4.1's survival model — compare (repair cost + expected future repair costs over the remaining survival curve, discounted) against (replacement cost + expected costs of a new asset). Not a black box; an explicit, explainable decision model whose only learned input is the survival curve.
- **Output in the field app:** *"Repair est. $180. This model's median remaining life at 11 years is 1.8 years and its expected repair spend over that period is $310. Replacement: $640. **Recommend replace.**"* — with the numbers shown, so the tech and manager can disagree with it.
- **Validation:** backtest against §2.4's decision-quality metric before shipping.

### 4.7 Longer-horizon opportunities

- **Portfolio benchmarking as a data product** — anonymized cross-customer cost/lifespan percentiles ("your dishwasher spend is in the 78th percentile for properties of your vintage"). Requires k-anonymity (≥5 orgs, ≥30 assets per cell) and explicit customer consent. Likely a standalone revenue line.
- **Turn cost & duration prediction** from unit history and asset ages, feeding vacancy forecasting.
- **Optimal parts stocking** per property from predicted failure mix (a newsvendor problem over §4.2 outputs).
- **Duty-cycle inference** — estimate appliance utilization from failure and service patterns to identify units or tenant profiles that consume assets abnormally fast.
- **IoT telemetry ingestion** (smart thermostats, leak sensors, water-heater sensors) as a genuine step-change in predictive power. Deliberately out of scope until the manual record is complete and trusted — sensor data on top of a bad registry is worthless.

---

## 5. Instrumentation requirements

Metrics are only as good as the capture discipline, so these are product requirements, not analytics wishes:

1. **`symptom_codes` must be a required, single-tap controlled vocabulary** on every repair event. Free-text `findings` is for humans; without codes, §4.2 and §2.2's component profile are impossible. This is the one place we should accept minor field friction.
2. **`occurred_at` vs `recorded_at` must never be conflated** — every time-based metric uses `occurred_at`; every sync/latency metric uses both.
3. **Cost must be captured even when estimated**, with `part_usage.cost_source` marking quality. Missing cost data is worse than estimated cost data.
4. **`install_date_confidence` and `serial_confidence` must be respected in every query.** Silently averaging guesses into a lifespan figure is how an analytics product loses credibility permanently.
5. **Every scan is logged, including failures** (`asset_identifier_scan`). Failed and out-of-scope scans are the most informative rows in the database for §4.3.
6. **Track the metrics' own health**: data completeness, scan verification rate, and grace-window resolution rate are the three leading indicators of whether anything else here can be believed.
