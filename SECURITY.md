# Security Policy

## Supported versions

Nameplate is pre-1.0. Only the `main` branch receives security fixes.

| Version | Supported |
| ------- | --------- |
| `main`  | ✅        |
| Tagged pre-1.0 releases | ❌ |

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

Report privately through either channel:

1. **GitHub Security Advisories** — open a draft advisory at
   https://github.com/murderszn/nameplate/security/advisories/new
2. **Email** — joshua.johnson@beghou.com with `[nameplate-security]` in the subject.

Please include:

- A description of the issue and the impact you believe it has
- Steps to reproduce, or a proof of concept
- Affected component (`app/` Field, `hq/` HQ console, `backend/`, `website/`, Supabase policies)
- The commit SHA or deployed URL you tested against

## What to expect

- **Acknowledgement** within 3 business days.
- **Initial assessment** (severity, affected scope) within 10 business days.
- **Fix or mitigation plan** communicated before public disclosure.

Please give us 90 days to ship a fix before disclosing publicly. We will credit
reporters in the advisory unless you ask us not to.

## Scope

In scope: this repository's source, the deployed website and HQ console, the
backend API, and the Supabase schema and row-level-security policies.

Out of scope: denial of service through volumetric traffic, findings that
require a compromised device or physical access, social engineering, and
reports from automated scanners with no demonstrated impact.
