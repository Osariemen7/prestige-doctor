# PrestigeHealth Doctor PWA

The clinician app brings together review queues, patient progress, care messages, notifications and the diagnostic workspace. Patients and partners use their own role-specific PWAs.

## Run locally

```bash
npm ci --legacy-peer-deps
npm start
```

The development server listens on `http://127.0.0.1:3205`. `npm run preview` serves a production build on port 3206. The stack is React 19, React Router 6.26 and Vite 6, with Vitest for tests.

## Client configuration

The shared `src/apiOrigin.js` resolves the public API origin for authentication, core care and legacy services. It accepts `REACT_APP_QA_API_ORIGIN`, `REACT_APP_API_BASE_URL`, `REACT_APP_BACKEND_BASE_URL`, `VITE_API_ORIGIN` and `VITE_BACKEND_BASE_URL` in that order, after an explicit runtime override. The production default is `https://api.prestigedelta.com`; QA requires an explicit API origin. See `.env.example` for optional public integration settings. Never put secrets in client environment variables or commit real environment files.

Set `REACT_APP_BUILD_SHA` to the exact source commit when building locally. Vercel builds also accept `VERCEL_GIT_COMMIT_SHA`. Production builds disable synthetic fixtures.

## Verify and deploy

```bash
npm run test:ci
npm run build
```

Vite outputs `dist/`, including a build manifest and the injected `service-worker.js`. Deploy that directory with SPA rewrites to `index.html`; `vercel.json` provides the hosting configuration. The service worker caches public shell assets only. It does not cache clinical API responses or queue clinical changes offline.

Core routes load on demand, and authenticated destinations survive WhatsApp OTP. Notifications resolve an opaque ID through the authenticated API before navigation. Existing medical-review links retain their identity and use the canonical review adapter.

See [the Doctor PWA notes](docs/DOCTOR_PWA.md) for route contracts and the focused review results. A successful static build alone does not prove production authentication or end-to-end clinical delivery.
