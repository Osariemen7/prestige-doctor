const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function createShellEntries(output) {
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  const initialAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
  const urls = [...new Set(['/index.html', '/offline.html', '/logo192.png', '/logo512.png', ...initialAssets])];
  return urls.map((url) => ({
    url,
    revision: url.startsWith('/assets/') ? null : createHash('sha256')
      .update(fs.readFileSync(path.join(output, url.slice(1))))
      .digest('hex'),
  }));
}

module.exports = { createShellEntries };
