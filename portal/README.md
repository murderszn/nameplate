# Nameplate Portal

The resident-facing web portal for maintenance requests and appliance history.
It is a separate React + TypeScript + Vite surface, matching the deployment
pattern used by `hq/` and the black / white / red Nameplate component system.

## Run locally

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:5174`. A production build is
written to `website/portal/`.

## Included flows

- Resident home dashboard and open-work summary
- Guided issue submission with urgency and file attachment inputs
- Nameplate Tag camera entry, manual NPID fallback, and scan simulation
- Work-order timeline and appointment visibility
- Registered appliance list with direct issue reporting
- Responsive desktop navigation and mobile bottom navigation

Demo work orders submitted in the browser are stored in `localStorage`.
