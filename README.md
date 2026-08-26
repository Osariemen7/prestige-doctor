# PrestigeHealth Provider Dashboard

Web dashboard for PrestigeHealth clinicians: manage medical reviews, patient
records, investigations, messaging, clinical services and the care-coordinator
queue. This is the **provider-facing** React app; patients use the separate
PrestigeHealth mobile app.

## Stack

- [React 19](https://react.dev) with [Create React App](https://create-react-app.dev) (react-scripts 5)
- [React Router v7](https://reactrouter.com) for routing (protected clinician routes)
- [MUI v6](https://mui.com) primary UI kit; [Chakra UI v2](https://chakra-ui.com) in some legacy screens; Tailwind CSS utilities
- [Agora RTC SDK NG](https://www.agora.io/en/products/video-call) for voice/video visits (server-issued tokens only)
- JWT auth: WhatsApp-OTP flow against `POST /api/tokenrefresh/` with automatic access-token refresh (`src/api.js`)
- [react-error-boundary](https://github.com/bvaughn/react-error-boundary) top-level crash fallback

## Getting started

```bash
npm install
cp .env.example .env        # fill in local values; never commit .env*
npm start                   # http://localhost:3000
```

### Environment variables

All client configuration is centralised in [`src/apiConfig.js`](src/apiConfig.js)
and sourced from `REACT_APP_*` environment variables — see
[`.env.example`](.env.example). Never commit real `.env` / `.env.production`
files.

Key variables:

| Variable | Purpose |
| --- | --- |
| `REACT_APP_BACKEND_BASE_URL` | API base (defaults to `https://api.prestigedelta.com`) |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google sign-in OAuth client |
| `REACT_APP_AGORA_APP_ID` | Display info only – live joins require the backend Agora token endpoint |

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Development server |
| `npm test` | Jest test suite (CI mode: `npm test -- --watchAll=false`) |
| `npm run build` | Production bundle in `build/` |

## Architecture notes

- `src/App.js` restores the session from the persisted refresh token on launch
  (branded splash while validating), then mounts routes. All clinician surfaces
  are wrapped in `ProtectedRoute`, which redirects unauthenticated visitors to
  `/login` while preserving the intended destination.
- Voice/video visits **fail closed**: the client fetches short-lived Agora
  credentials from `{API_BASE_URL}/agora/rtc-token/` for every join and never
  joins with a null token.
- A minimal service worker (`public/sw.js`) caches built static assets only;
  `/api` and API hosts are always network-first/never cached so clinical data is
  never served stale.

## Deployment

Deployed as a static build (Vercel config included):

1. Set production env vars in the hosting provider (`REACT_APP_*` are baked at
   build time).
2. `npm run build` → serve `build/` with SPA rewrites to `index.html`.
3. CI (`.github/workflows/release-smoke.yml`) runs the full test suite and a
   production build on pull requests and pushes to `main`.

## Support

Questions or issues? Contact [support@prestigedelta.com](mailto:support@prestigedelta.com).
See also [Terms](src/components/TermsPage.jsx) and
[Privacy](src/components/PrivacyPage.jsx) notices for the provider supplement
to the patient-app policies.
