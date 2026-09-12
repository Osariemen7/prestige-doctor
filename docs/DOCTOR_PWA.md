# Doctor PWA

Install the committed lockfile with `npm ci --legacy-peer-deps`. Vite builds production into `dist`; Vitest is the only test runner. React and React Router retain their existing versions. Workbox and the Testing Library DOM peer are explicit development dependencies; CRA/Jest tooling is removed.

The app has one doctor manifest, install guidance and service worker. Only public build assets are cached; protected API responses and clinical writes are never cached or queued offline. A new worker activates through the visible update action. Push previews contain no clinical details. Push clicks open an opaque notification ID, then authenticated GET reauthorizes its destination before read acknowledgement and navigation. An existing clinical draft is not reloaded by a push click.

All auth, core and legacy transports resolve the same configured API origin. The default is `https://api.prestigedelta.com`; QA requires an explicit origin. Authenticated destinations survive WhatsApp OTP. Rejected access tokens refresh once; uncertain command retries preserve identity and temporary refresh outages retain credentials.

Core routes are lazy: review queue, exact-hash cases/documentation, care conversations, notifications and patient progress. The optional diagnostic workspace retains the canonical medical-review adapter and explicit diagnostic evidence panel. `/reviews/:publicId` preserves medical-review identity via `/app/diagnostics/reviews/:publicId`; it is not treated as a proposal UUID. The roster and legal pages from main remain reachable. There is no production synthetic-data path.

Coverage-pool 403 responses reveal only the authorized preview until a successful claim. Backend `review_route_mode` and `review_claim.route_mode` drive queue views. Missing explicit hash authority fails closed. Case navigation resets draft/confirmation/command state. Canonical information requests issue a single server command; uncertain retries reuse the exact payload/timestamp.

Run checks with one worker:

```powershell
npm run test:ci
node node_modules/vitest/vitest.mjs run src/AppRoutes.test.jsx src/pwa/NotificationDestination.test.jsx src/vnext/ClinicalCaseScreen.test.jsx src/vnext/documentation.test.js --maxWorkers=1 --no-file-parallelism
npm run build
```

The merge quality review passed all 29 test files / 127 tests across bounded shards, including the real lazy login route. Its test wait allows cold module transformation and is not a production timing budget. Production builds must be run against the final committed source with `REACT_APP_BUILD_SHA` set to its commit ID (Vercel supplies its own Git commit ID). Build receipts and final source identity are reported separately. A public health response alone does not prove a frontend deployment or an authenticated end-to-end clinical flow.
