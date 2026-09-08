import http from 'node:http';

const port = Number(process.env.MOCK_DOCTOR_API_PORT || 4318);
const localToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJleHAiOjQxMDI0NDQ4MDAsInN1YiI6InN5bnRoZXRpYy1kb2N0b3IifQ.local';

const json = (response, status, payload) => {
  response.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(payload));
};

const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
};

const session = {
  access: localToken,
  refresh: localToken,
  user: {
    id: 8201,
    full_name: 'Synthetic Internal Doctor',
    email: 'doctor@example.test',
    is_doctor: true,
    is_provider: true,
  },
};

const allowedOrigins = new Set([
  'http://127.0.0.1:3205',
  'http://localhost:3205',
]);

const applyCors = (request, response) => {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('access-control-allow-origin', origin);
    response.setHeader('access-control-allow-credentials', 'true');
    response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    response.setHeader('access-control-allow-headers', 'Authorization, Content-Type');
    response.setHeader('vary', 'Origin');
  }
  return origin;
};

const allowedGetRoutes = new Set([
  '/provider/',
  '/providerdashboard/',
  '/provider/all-patients/',
  '/provider-reviews/',
  '/providermessages/',
  '/providermessages/organization-threads/',
  '/provider-investigations/default_listings/',
  '/provider-investigations/pending_investigations/',
  '/investigation-orders/',
  '/investigations/',
  '/investigation-requests/',
  '/medical/encounters/',
]);

const allowedWriteRoutes = new Set([
  '/appointments/create-patient/',
  '/providermessages/preview-template-message/',
  '/providermessages/send-template-message/',
  '/providermessages/send-message/',
  '/provider-investigations/manage/',
  '/ai-processing/upload-file/',
  '/patients/',
]);

const isExplicitRoute = (method, pathname) => {
  if (method === 'GET') {
    return allowedGetRoutes.has(pathname)
      || /^\/providerdashboard\/[^/]+\/$/.test(pathname)
      || /^\/providermessages\/[^/]+\/$/.test(pathname)
      || /^\/investigation-orders\/[^/]+\/$/.test(pathname);
  }
  if (method === 'POST') {
    return allowedWriteRoutes.has(pathname)
      || /^\/gptthreads\/[^/]+\/switch-responder\/$/.test(pathname);
  }
  return false;
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  process.stdout.write(`${request.method} ${url.pathname}\n`);
  const origin = applyCors(request, response);

  if (request.method === 'OPTIONS') {
    return json(response, origin && !allowedOrigins.has(origin) ? 403 : 204, {});
  }

  if (request.method === 'POST' && url.pathname === '/login/') {
    const payload = await readJson(request);
    if (payload.email !== 'doctor@example.test' || payload.password !== 'local-only-password') {
      return json(response, 400, { non_field_errors: ['Use the synthetic local doctor credentials.'] });
    }
    return json(response, 200, session);
  }

  if (request.method === 'POST' && url.pathname === '/api/tokenrefresh/') {
    return json(response, 200, { access: localToken, refresh: localToken });
  }

  if (isExplicitRoute(request.method, url.pathname)) {
    if (request.method === 'POST') await readJson(request);
    return json(response, 200, { results: [], count: 0, data: [] });
  }

  return json(response, 404, { detail: `Unmocked route: ${request.method} ${url.pathname}` });
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Synthetic doctor frontend API listening on http://127.0.0.1:${port}\n`);
});
