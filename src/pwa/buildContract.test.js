import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const { createShellEntries } = createRequire(import.meta.url)('../../scripts/doctorPwaManifest.cjs');

let output;
beforeEach(() => {
  output = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-pwa-manifest-'));
  fs.writeFileSync(path.join(output, 'index.html'), '<script src="/assets/index-buildhash.js"></script>');
  fs.writeFileSync(path.join(output, 'offline.html'), '<p>Offline version one</p>');
  fs.writeFileSync(path.join(output, 'logo192.png'), 'small icon bytes');
  fs.writeFileSync(path.join(output, 'logo512.png'), 'large icon bytes');
});
afterEach(() => {
  if (path.dirname(output) !== path.resolve(os.tmpdir()) || !path.basename(output).startsWith('doctor-pwa-manifest-')) throw new Error('Unexpected test directory.');
  fs.rmSync(output, { recursive: true, force: true });
});

test('mutable shell entries bind their actual bytes while hashed entry assets retain their URL identity', () => {
  const entries = createShellEntries(output);
  for (const url of ['/index.html', '/offline.html', '/logo192.png', '/logo512.png']) {
    const digest = createHash('sha256').update(fs.readFileSync(path.join(output, url.slice(1)))).digest('hex');
    expect(entries.find((entry) => entry.url === url)?.revision).toBe(digest);
  }
  expect(entries.find((entry) => entry.url === '/assets/index-buildhash.js')).toEqual({ url: '/assets/index-buildhash.js', revision: null });
});

test('an offline-page-only change changes the injected worker manifest without an entry-chunk change', () => {
  const before = createShellEntries(output);
  fs.writeFileSync(path.join(output, 'offline.html'), '<p>Offline version two</p>');
  const after = createShellEntries(output);
  expect(after.find((entry) => entry.url === '/offline.html').revision).not.toBe(before.find((entry) => entry.url === '/offline.html').revision);
  expect(after.filter((entry) => entry.url !== '/offline.html')).toEqual(before.filter((entry) => entry.url !== '/offline.html'));
});
