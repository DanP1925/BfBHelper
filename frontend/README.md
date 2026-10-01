# frontend

Next.js (App Router) + TypeScript client for BfbHelper's Hero Draft Picker.
Statically exported (`output: 'export'`) so the build is a plain static
bundle — no Node server required to host it.

See [`../plan/01_hero-draft-picker.md`](../plan/01_hero-draft-picker.md) for
the build plan and milestone checklist.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — static export to `out/`
- `npm test` — Vitest (draft logic + persistence)
- `npm run test:watch` — Vitest in watch mode
- `npm run lint` — ESLint

## Deployment

Live at **https://bf-b-helper.vercel.app/**. Hosted on Vercel, imported
from this repo with **Root Directory** set to `frontend`; Vercel
auto-detects Next.js and handles the static export (`output: 'export'`)
with no extra config. Every push to `main` redeploys automatically, and
every PR gets its own preview URL.
