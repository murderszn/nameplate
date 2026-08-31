# Nameplate Resident Portal — Backend Integration Plan

**Status:** Required product surface; UI scaffold exists in `portal/`. This plan
defines the API, database, auth, storage, and notification work needed to make it
production-ready without weakening Nameplate's tenant isolation.

## 1. Product boundary

Nameplate Resident is the authenticated interface for people currently living
in a unit. A resident can:

- see the property, unit, and resident-safe appliance roster for their home;
- resolve a Nameplate Tag and start a request against the exact asset;
- create a maintenance request with urgency, description, and media;
- see resident-safe work-order status, appointment windows, and public notes;
- add comments or media to their request;
- manage notification preferences and access instructions.

The portal must never expose owner costs, technician notes, custody history,
serial numbers, other units, other residents, internal SLA calculations, vendor
contracts, or asset records outside the resident's active occupancy.

## 2. Identity and authorization

Residents use Supabase Auth, but they are not staff `membership` rows. Staff
RBAC and resident access are separate authorization paths.

Add:

- `resident_profile`: one row per authenticated person and organization;
- `resident_occupancy`: the time-bounded grant linking a resident to one unit;
- `resident_invitation`: single-use, expiring invitation or property-system
  claim used to establish an occupancy;
- request context `{user_id, org_id, resident_occupancy_id, unit_id}` for
  resident routes.

Every resident query must start from an active `resident_occupancy`, then join
outward to the unit. A client-supplied `unit_id`, `property_id`, or `org_id` is
never trusted for authorization. Ended occupancies immediately lose access;
historical requests remain visible only when the property explicitly enables a
short post-move-out access window.

Recommended session policy:

- 15-minute access token and rotating refresh token;
- email magic link for V0, optional phone OTP later;
- invitation expires after 72 hours and is single-use;
- rate-limit login, tag resolution, request creation, and comment creation;
- no resident service-role credentials or direct PostgREST access.

## 3. Database changes

### `resident_profile`

`id, org_id, user_id, full_name, email, phone, preferred_channel,
language_code, status, created_at, updated_at, deleted_at`

- unique active row on `(org_id, user_id)`;
- status: `invited | active | suspended`;
- phone/email are PII and excluded from operational exports by default.

### `resident_occupancy`

`id, org_id, resident_profile_id, property_id, unit_id, starts_at, ends_at,
is_primary, access_ends_at, verified_at, verified_by, created_at, updated_at`

- index `(org_id, unit_id, ends_at)`;
- prevent overlapping duplicate occupancy grants for the same resident/unit;
- authorization requires `starts_at <= now()` and
  `coalesce(access_ends_at, ends_at, 'infinity') > now()`;
- multiple residents may share a unit and may see the unit's resident-visible
  work orders, but never one another's profile fields.

### `resident_invitation`

`id, org_id, property_id, unit_id, email_hash, token_hash, expires_at,
accepted_at, revoked_at, created_by, created_at`

Store only a token hash. Acceptance atomically creates or links the profile and
occupancy, marks the invitation used, and writes an audit event.

### Work-order extensions

Add nullable `requested_by_resident_occupancy_id` and
`resident_visibility` (`visible | hidden`) to `work_order`. Keep
`source='tenant_request'`. The server derives property/unit from the occupancy;
the portal cannot override them. Store the original resident request as an
immutable `work_order_activity` entry so later title/status edits do not erase
what was reported.

### `work_order_activity`

`id, org_id, work_order_id, actor_type, actor_user_id,
resident_occupancy_id, kind, body, visibility, occurred_at, recorded_at,
created_by`

- append-only timeline for comments, status changes, appointment changes, and
  resident-visible updates;
- `visibility`: `internal | resident`;
- a resident can insert `comment` only on an order visible through their active
  occupancy; staff chooses visibility for staff-authored notes;
- never project `internal` activities into resident responses.

### Appointment and access fields

Add `scheduled_window_start`, `scheduled_window_end`,
`resident_presence_preference`, `permission_to_enter`, and
`access_instructions` to the work-order workflow. Access instructions are
sensitive operational data: encrypt at rest at the application layer, omit from
logs, and clear or archive them when the order closes.

### Media and notifications

Reuse `media` and `media_attachment` with roles `resident_issue` and
`resident_follow_up`. Add `uploaded_by_resident_occupancy_id`; resident upload
intents are restricted to their own visible work order, allowed MIME types,
size limits, malware scanning, and private object-storage paths.

Add `notification_preference` and `notification_delivery` for email/SMS/push
opt-in, template, provider message ID, delivery state, and retry history. These
are worker-owned records, not synchronous request side effects.

## 4. Resident API surface

All routes below use the resident auth guard and return resident-safe DTOs.

```text
POST   /v1/resident/auth/accept-invitation
GET    /v1/resident/me
GET    /v1/resident/home
GET    /v1/resident/appliances
GET    /v1/resident/appliances/:npid

GET    /v1/resident/work-orders
POST   /v1/resident/work-orders
GET    /v1/resident/work-orders/:id
POST   /v1/resident/work-orders/:id/comments
POST   /v1/resident/work-orders/:id/access-preference

POST   /v1/resident/media/upload-url
POST   /v1/resident/media/:id/attach

GET    /v1/resident/notification-preferences
PATCH  /v1/resident/notification-preferences
```

`GET /v1/resident/home` is a portal bootstrap endpoint: property display data,
unit label, appliance summary, open resident-visible orders, next appointment,
and emergency contact policy in one response.

`POST /v1/resident/work-orders` accepts only:

```json
{
  "asset_npid": "NP-7H3P9X2C",
  "title": "Dishwasher not draining",
  "description": "Standing water remains after the cycle.",
  "urgency_signal": "urgent",
  "permission_to_enter": "contact_first",
  "media_ids": []
}
```

The API resolves the occupancy, unit, property, asset, source, normalized
priority, SLA, and human work-order number. `urgency_signal` is a resident
signal—not permission to set internal emergency priority. Server-side triage
rules promote it and flag safety keywords for property staff.

## 5. Nameplate Tag deep links

The physical tag URL may open the portal with an NPID, but an NPID alone never
grants asset access.

1. Parse and checksum the NPID client-side for fast feedback.
2. Authenticate or accept a valid resident invitation.
3. Resolve through `/v1/resident/appliances/:npid`.
4. The API verifies the asset is currently assigned to the resident's unit.
5. On mismatch, return a generic `tag_not_available` problem response and log
   the attempt without disclosing the asset's true property or unit.

Public unauthenticated tag resolution may return only brand-safe instructions
and an auth handoff. It must not return model, serial, location, history, or
work-order data.

## 6. Status and notification projection

Internal work-order states are projected into stable resident states:

| Internal state | Resident state |
|---|---|
| `open` | Submitted |
| `assigned`, `awaiting_approval` | Received |
| scheduled window present | Scheduled |
| `in_progress` | In progress |
| `awaiting_parts` | Waiting on parts |
| `completed` | Completed |
| `cancelled` | Closed |

The worker emits notifications from committed domain events, never directly
inside the API transaction. Initial events: request received, appointment set
or changed, technician en route (later), waiting on parts, completed, and staff
comment visible to resident.

## 7. Delivery sequence

1. Add resident tables, work-order/activity extensions, indexes, RLS policies,
   and deterministic seed residents.
2. Add resident JWT context, occupancy guard, problem responses, rate limits,
   and authorization integration tests.
3. Implement bootstrap, appliance, work-order create/list/detail endpoints with
   idempotency.
4. Implement private media upload intents, validation, scanning, and attachment.
5. Add the activity timeline, scheduling/access preferences, worker events, and
   notification preferences.
6. Replace `portal/` demo data and `localStorage` with the generated TypeScript
   client, guarded routes, loading/error states, and optimistic request receipt.
7. Add HQ resident-request indicators and visibility controls for comments.

## 8. Required acceptance tests

- Resident A cannot enumerate or access Resident B's unit, assets, work orders,
  media, comments, or contact data—even in the same organization.
- A tag from another unit returns the same generic response as an unknown tag.
- An ended or revoked occupancy loses access immediately.
- Replaying request creation with the same idempotency key creates one order.
- A resident cannot set assignee, internal priority, status, cost, SLA, property,
  unit, source, or note visibility.
- Internal notes and costs never appear in resident serializers or OpenAPI DTOs.
- Media upload URLs are short-lived, private, size/type limited, and bind only to
  the resident's own visible request.
- Status and appointment changes commit before notification jobs are enqueued.
- Every invitation acceptance, request, comment, access preference, and failed
  cross-unit lookup writes an audit event without logging sensitive free text.

