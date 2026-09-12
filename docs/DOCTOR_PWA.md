# Prestige Doctor PWA

Install from the committed lockfile with `npm ci --legacy-peer-deps` (the preserved CRA test dependency has older React peer ranges). The production entry is Vite (`npm run build`, output `dist-vite`). React and React Router versions are unchanged. The reviewed vNext workspace from candidate `292bdf3` is integrated with the diagnostic review controls preserved at `9b8397a`.

- Set `REACT_APP_BACKEND_BASE_URL` (or `VITE_API_ORIGIN`) to the Django origin. QA must explicitly set an isolated origin and `REACT_APP_QA_MODE=true`.
- Vercel supplies the frontend commit identity through `VERCEL_GIT_COMMIT_SHA`; an explicit `REACT_APP_BUILD_SHA` may override it.
- Production demos are disabled regardless of route, query, or demo flag. Clinical decisions retain the existing exact proposal hash and server claim checks.
- `/app/queue` is the entry; cases, messages, notifications and clinical documentation keep their IDs through WhatsApp OTP authentication. `/app/diagnostics` retains result review and clinical service work.
- Web Push reads `capabilities.web_push.{enabled,vapid_public_key}`. Subscription, inbox/read and preference clients use `/care/notifications` endpoints with `app=doctor`. Configure Django notification transport before claiming live device delivery.
- The service worker is generated once by Vite. Cache only public app assets. Offline navigation shows a private offline page; clinical records and actions are never stored or queued by it. Updates require an explicit reload choice.
- Browser installation uses the native prompt when supported, with Safari/Home Screen and in-app-browser guidance otherwise. Device notification permission is requested only by a button gesture. Logout unsubscribes the device.

Run focused tests with the direct CLI so PowerShell/npm cannot drop Jest flags:

```powershell
$env:CI='true'
node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand --testTimeout=30000 --runTestsByPath src/pwa/safePath.test.js src/pwa/serviceWorker.test.js src/pwa/notificationApi.test.js src/apiOrigin.test.js src/vnext/MessagesScreen.test.js src/vnext/api.http.test.js src/vnext/api.test.js src/vnext/contract.test.js src/vnext/documentation.test.js src/services/careConversationContract.test.js src/utils/doctorDecisionContract.test.js
npm run build
```

Integration verification must use the Django server for OTP, authorization, conversation replies and clinical decisions, plus a configured push transport for real device delivery. Mocked tests do not certify those deployed services.


## September 12 quality review

- Push clicks carry an opaque notification identifier. The authenticated app rechecks the notification projection and marks it read before opening the returned doctor route. A push opens separately from an existing clinical draft.
- Expired/rejected authentication refreshes once with the same mutation command. All doctor transports resolve the same configured API origin. Temporary refresh outages retain credentials for retry.
- Coverage-pool 403 responses display only the server-returned privacy preview until a successful claim. Inbox routing accepts backend review_route_mode/review_claim.route_mode; missing exact-hash authority fails closed.
- Route changes reset case-scoped drafts/confirmation/command state. Malformed links recover to the workspace. Existing conversation and clinical-service links retain their destination.
- Vite remains the production builder. Jest uses the real lucide CommonJS entry because the old test resolver otherwise selects its ESM entry. CRA is currently test tooling only; no framework upgrade was introduced during this fix.

Verification: 13 focused suites, 44 tests passed, and Vite production build passed. The optional cold full-login Jest smoke was stopped during workstation contention; it is not claimed as passed for this revision. No production frontend deployment was performed here.
