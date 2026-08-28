# Branding

**Status:** Decided (V0). Owner: Product Architecture.

---

## 1. Naming brief

The name has to do four jobs at once:

1. Read credibly on an invoice sent to a regional property-management company.
2. Read credibly on a sticker slapped on the side of a 12-year-old Whirlpool dryer.
3. Survive being said out loud by a maintenance tech in a stairwell ("did you Nameplate it?").
4. Extend to two sub-products (field app + HQ console) without inventing two more brands.

Category words to avoid overusing: *Asset*, *Track*, *Manage*, *Pro*, *Hub*, *Ops*. They are crowded, trademark-hostile, and make the product sound like a 2009 CMMS.

---

## 2. Name candidates

### 2.1 Nameplate — **RECOMMENDED**

Every major appliance ships with a physical **nameplate**: the stamped or printed metal/adhesive plate carrying manufacturer, model number, serial number, voltage, and date code. It is the single artifact every technician already knows to look for, and it is literally where our data collection begins.

**Why it wins:**

- **Perfect domain fit, zero explanation required.** The first thing a tech does on-site is find the nameplate. Our product turns that plate into a permanent digital record. The metaphor and the workflow are the same action.
- **It names the physical product too.** Our proprietary QR/NFC sticker (see `asset-tagging-strategy.md`) is a *nameplate* — the one we control, that doesn't fade, doesn't get painted over, and doesn't require a tech to contort behind a fridge with a flashlight. The brand and the hardware artifact are the same noun. That is a rare, valuable alignment.
- **Concrete, not abstract.** One word, two syllables and a half, unambiguous spelling, no vowel-drop cuteness ("Assetly", "Trackr"), no invented Latin.
- **Verbs well.** "Nameplate the unit." "Is it nameplated?" Verbing is a strong retention signal in field tools.
- **Extends cleanly.** Nameplate Field / Nameplate HQ / Nameplate Tags / Nameplate ID. No sub-brand invention needed.
- **Institutional tone.** Sounds like infrastructure, not a startup toy. Matters when selling to property managers who buy conservatively.

**Risks to flag (verify before filing):** "Nameplate" is a common English noun and appears as a generic descriptor in manufacturing, automotive ("nameplate" = a car model line), and *media/publishing* ("nameplate" = a newspaper masthead). Expect it to be **descriptively weak in Class 9/42 unless used as a full mark** — file as `NAMEPLATE` for SaaS asset-management software plus a distinctive logo, and be prepared to use a compound (`Nameplate Systems`, `getnameplate.com`, `nameplate.app`) for domain. The bare `.com` is almost certainly taken and expensive; plan on `nameplate.app` or `usenameplate.com` for V0. This is a domain problem, not a name problem.

### 2.2 Latchkey

Apartment-native, warm, memorable. "Latchkey Systems" reads well; "Latchkey Field" is a good app name.

**Why it loses:** the dominant cultural association is "latchkey kid" — unsupervised children of the 1980s. Slightly melancholy, and it points at *doors and keys*, i.e. access control. We would be permanently mistaken for a smart-lock company, which is a crowded, well-funded category (Latch, SmartRent, Brivo). Actively confusing in exactly our buyer's mental map. **Flagged as problematic.**

### 2.3 Turnstile

Puns on the apartment **turn** (turnover walkthrough) — the central workflow of the product — and on a physical gate that counts things passing through, which is precisely our shrinkage/chain-of-custody story.

**Why it loses:** `Turnstile` is a well-known Cloudflare product (CAPTCHA replacement) and a prominent hardcore band. Search results are unwinnable and the Cloudflare mark is live in software classes. Great concept, unusable name. **Flagged as problematic.**

### 2.4 Chattel

The legal term of art for *movable personal property* — exactly what distinguishes an appliance from a fixture, and exactly why appliances "grow legs" and a wall oven doesn't. Sophisticated, precise, ownable.

**Why it loses:** the word's strongest association for most Americans is "chattel slavery." Non-starter for a brand that will be printed on stickers and said in front of customers. **Flagged as problematic — do not use.**

### 2.5 Serial

Short, clean, and points at the serial number as the atomic unit of truth. Would allow "Serial ID", "Serial Field".

**Why it loses:** hopelessly generic for search (serial ports, serial killers, serialized fiction, Serial the podcast), impossible to trademark, and it over-indexes on manufacturer serials, which our tagging strategy deliberately demotes to a secondary attribute. The name would fight the architecture.

### 2.6 Ledgerline (runner-up)

Compound of *ledger* (the immutable chain-of-custody record that is our real technical moat) and *line* (the line of custody, and the musical ledger line). "Ledgerline" is distinctive, ownable, and almost certainly available.

**Why it loses to Nameplate:** it describes our *backend* (an append-only event log) rather than the user's *job*. Technicians don't care about ledgers. Also carries faint fintech/crypto scent, which is the wrong pond. Keep as the backup if `Nameplate` hits an unexpected trademark wall.

---

## 3. Decision

> ## Primary name: **Nameplate**
>
> Legal entity: **Nameplate Systems, Inc.**
> Domain plan: `nameplate.app` (primary), `usenameplate.com` (redirect), `getnameplate.com` (redirect).
> Backup name if blocked: **Ledgerline**.

### Sub-product names

| Product | Name | Usage |
|---|---|---|
| Flutter field app (iOS/Android) | **Nameplate Field** | App Store / Play listing name: `Nameplate Field`. Home-screen label: `Nameplate`. Spoken as "Field." |
| Web console for HQ/managers | **Nameplate HQ** | Reached at `hq.nameplate.app`. Spoken as "HQ." Never call it "the admin panel" in customer-facing copy. |
| Marketing site | **nameplate.app** | Not a named sub-product. |
| Our proprietary QR/NFC sticker | **Nameplate Tag** | Physical SKU. The scannable ID it carries is the **Nameplate ID (NPID)**. |
| The primary asset record | **The Plate** (informal) / Asset Record (formal) | "Pull up the plate on that fridge." Encourage but don't force. |

Deliberately: the HQ console is *not* called "Dashboard," "Portal," or "Admin." "HQ" mirrors how the buyer already describes themselves ("I'm running all of this from Arizona") and frames the remote manager as a commander, not a bureaucrat.

---

## 4. Taglines

**Primary (use on the homepage hero):**

> **Every appliance accounted for.**

Six syllables, states the outcome, quietly implies the shrinkage problem without accusing anyone's staff of stealing. Works on a website, a trade-show banner, and a sticker sheet.

**Alternates, by context:**

| Context | Line |
|---|---|
| Homepage subhead / long form | *Know what's in every unit, what it cost, and where it went.* |
| Shrinkage / theft angle (sales deck) | *Appliances stop growing legs.* |
| Field app store listing | *Scan the plate. See the history. Log the fix.* |
| HQ console positioning | *Run every property from one screen.* |
| Turnover workflow feature page | *Walk the unit once. Everything else is already written down.* |
| Data/ROI angle (later-stage) | *Repair or replace, decided by your own numbers.* |
| Elevator / one-liner | *Nameplate is the asset record for apartment maintenance.* |

Do not ship: anything with "revolutionize," "seamless," "AI-powered" (V0 has no model), or "for the modern property manager."

---

## 5. Brand voice

**Personality:** the competent shop foreman. Has done the job, knows where the shutoff valve is, does not waste your time, does not condescend, does not perform enthusiasm.

**Principles:**

1. **Plain nouns over abstractions.** "Fridge," "dryer," "unit 4B" — not "asset class," "spatial entity," "resource." The data model can be abstract; the copy cannot.
2. **Short declaratives.** Average sentence under 14 words in UI copy. Field app strings under 6 words where possible — they are read one-handed, in a hallway, in bad light.
3. **State facts, not feelings.** "Last serviced 14 months ago. Compressor replaced." Not "This appliance may need your attention!"
4. **Never blame the tech.** Shrinkage copy is about *records*, not *suspects*. Say "unaccounted for," "location unconfirmed," "chain of custody incomplete." Never "missing/stolen" in the UI, never a person's name next to a loss figure without a human in the loop. This is both an ethical and a sales-cycle requirement: techs who feel surveilled will not adopt the app, and adoption by techs is the whole business.
5. **Numbers earn trust.** Wherever we make a claim in marketing, attach a unit: dollars, months, percent. "The average in-unit appliance we track is 9 years old" beats "unlock insights."
6. **Respect the field.** No gamification, no confetti, no streaks. A tech finishing a turn walkthrough gets a checkmark and a count, and gets out of the app.

**Voice comparison — same message, three registers:**

| | |
|---|---|
| ❌ Too corporate | *Leverage portfolio-wide asset intelligence to optimize capital expenditure.* |
| ❌ Too casual | *Yo, your fridges are old af 🥶* |
| ✅ Nameplate | *31 refrigerators are past 12 years. Replacing them costs $27,900. Repairs on them cost $9,400 last year.* |

**Vocabulary standards:**

| Use | Not |
|---|---|
| Unit | Apartment, dwelling, premises |
| Turn / turnover | Make-ready, move-out prep |
| Asset | Appliance (in structured UI — assets include HVAC and water heaters, which aren't appliances) |
| Service event | Ticket, job, intervention |
| Work order | Task, request |
| Unaccounted for | Missing, stolen |
| Tech | Technician (formal docs), maintenance guy (never) |

---

## 6. Color palette

Grounded in the physical environment: brushed metal, dark utility-room slate, and safety-signal accents. High contrast is a functional requirement — the field app is used in poorly lit laundry closets and in direct Arizona sun.

### Core

| Token | Hex | Role |
|---|---|---|
| `--np-ink` | `#0E1620` | Primary text on light; darkest ground. Near-black with a cool cast. |
| `--np-slate-900` | `#16212E` | App chrome, HQ sidebar, dark-mode surface. |
| `--np-slate-700` | `#2B3A4C` | Secondary dark surface, elevated cards in dark mode. |
| `--np-steel-500` | `#61748C` | Secondary text, borders, disabled states, icon strokes. |
| `--np-mist-200` | `#DDE3EA` | Dividers, table rules, input borders. |
| `--np-mist-100` | `#EFF3F7` | Light surface / page background sections. |
| `--np-paper` | `#FAFCFD` | Base light background. Not pure white — reduces glare outdoors. |

### Brand & action

| Token | Hex | Role |
|---|---|---|
| `--np-plate-600` | `#0B5D8A` | **Primary brand color.** Buttons, links, active nav, logo mark. Deep industrial blue — reads as "utility infrastructure," not "consumer app." |
| `--np-plate-700` | `#084A6E` | Hover/pressed state for primary. |
| `--np-plate-100` | `#DCEDF6` | Tinted backgrounds, selected rows, info callouts. |
| `--np-signal-500` | `#F0A028` | **Accent / attention.** Safety amber. Turn-inspection prompts, "needs decision," scan target reticle, marketing highlights. Borrowed straight from PPE and equipment tags. |
| `--np-signal-100` | `#FDF0DA` | Warning callout background. |

### Status semantics (fixed meanings — do not reuse for decoration)

| Token | Hex | Meaning in product |
|---|---|---|
| `--np-verified-600` | `#137A5B` | Asset present & confirmed; work order closed; scan succeeded. |
| `--np-verified-100` | `#DCF1E9` | Verified row/badge background. |
| `--np-caution-600` | `#B4700C` | Aging asset, overdue service, SLA at risk. (Text-safe darkened amber — `--np-signal-500` fails contrast as text.) |
| `--np-fault-600` | `#C23B3B` | Broken, unaccounted for, SLA breached, sync failure. |
| `--np-fault-100` | `#FBE4E4` | Fault row/badge background. |
| `--np-offline-500` | `#7A5AA8` | **Offline / pending sync.** A distinct violet, deliberately not a status color — a queued record is neither good nor bad, and the tech must never confuse "not synced" with "broken." |

### Data-visualization ramp (HQ charts)

Categorical, in order: `#0B5D8A`, `#F0A028`, `#137A5B`, `#7A5AA8`, `#C23B3B`, `#61748C`.
Sequential (cost/age heat): `#DCEDF6` → `#9BC6DD` → `#3E86AE` → `#0B5D8A` → `#063D5C`.

### Rules

- Body text is `--np-ink` on `--np-paper` (≥ 15:1). Never place `--np-steel-500` on `--np-mist-100` for anything smaller than 16px.
- `--np-signal-500` is **never** a text color — background/stroke/fill only. Use `--np-caution-600` for amber text.
- Never encode status by color alone: every status carries an icon and a word. Techs work in sunlight, and color-vision deficiency is common in this workforce.
- Dark mode is required for the field app (utility rooms, night calls) and optional for HQ. Dark surface `--np-slate-900`, text `--np-mist-100`, primary lightens to `#3E9BC9`.

---

## 7. Logo concept

**Concept: the plate and the rivets.**

The mark is a **rounded-rectangle metal plate in landscape orientation (5:3)** — the silhouette of a real appliance data plate. Two elements make it ours:

1. **Two rivets.** Small filled circles at the top-left and bottom-right corners, inset from the edge. They read instantly as "fastened to something physical," which is the entire brand promise: this record is *attached* to that object. Two, diagonal — not four — so the mark stays light and asymmetric.
2. **The engraved N.** Inside the plate, three horizontal bars of stamped "data" (as on a real nameplate, where model/serial/voltage sit on stacked lines) where the **middle bar breaks diagonally** to connect the top bar's right end to the bottom bar's left end — forming an implied **N** out of what still reads as rows of text. At small sizes it reads as a nameplate; at large sizes the N resolves. The diagonal is the only non-orthogonal line in the system, which makes it the memorable feature.
3. **The scan notch.** The bottom-right corner of the plate is *squared off* while the other three are rounded — a QR-code finder-notch cue. Optional at ≤24px; drop it in the favicon.

**Construction (for a designer):** 24×24 grid. Plate occupies x:1–23, y:4–20, corner radius 3 (bottom-right radius 0). Rivets: r=1.25 at (4,7) and (20,17). Bars: 2px stroke, rounded caps, at y=9, y=12 (diagonal), y=15, inset 5px from plate edges. Stroke and plate outline share 2px weight for a stamped, uniform look.

**Color treatments:**

- **Primary:** plate outline + bars in `--np-plate-600`, rivets in `--np-signal-500` on `--np-paper`.
- **Reversed:** plate + bars in `--np-mist-100`, rivets in `--np-signal-500` on `--np-slate-900`.
- **Monochrome:** all `--np-ink` — required for the physical Nameplate Tag stickers, which are thermal-printed single-color.
- **Favicon / app icon:** solid `--np-plate-600` rounded square, plate mark knocked out in `--np-paper`, rivets in `--np-signal-500`. Drop the bars to two at 16px.

**Wordmark:** `Nameplate` set in **Inter SemiBold**, tracking `-0.02em`, lowercase-height matched to the plate's inner bars. Lockup: mark left, 0.5× mark-width gap, wordmark right, optically centered. Sub-product lockups append a hairline vertical rule + `Field` / `HQ` in Inter Medium `--np-steel-500`.

**Typography system:**

| Role | Face | Notes |
|---|---|---|
| UI + marketing | **Inter** | Variable; weights 400/500/600/700. Excellent at small sizes on Android. |
| Serials, model numbers, NPIDs, part numbers | **IBM Plex Mono** | Mandatory for any alphanumeric identifier anywhere in the product. Disambiguated 0/O and 1/l/I is a correctness requirement when a tech is hand-keying a serial off a smudged plate. |
| Marketing display (optional) | Inter Display 700, tight tracking | No secondary display face. Restraint is the aesthetic. |

**Motion:** one signature moment only — a successful scan snaps the reticle into the plate silhouette and the rivets pulse once (120ms, ease-out). Nothing else animates in the field app beyond standard transitions.

---

## 8. Applied examples

- **App Store subtitle (Nameplate Field):** *Scan the plate. See the history.*
- **HQ empty state:** *No assets yet. Print a sheet of Nameplate Tags and walk a unit — it takes about four minutes.*
- **Sticker copy (physical tag):** `NAMEPLATE` wordmark, QR block, NPID in IBM Plex Mono, and `Do not remove — property record`.
- **Sales one-liner:** *Nameplate is the asset record for apartment maintenance. Every washer, dryer, range, HVAC unit and water heater in your portfolio — tagged, dated, costed, and accounted for.*
