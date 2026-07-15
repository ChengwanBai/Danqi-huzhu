import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const publicDir = join(dist, 'public');
const entries = [
  'index.html',
  'index.zh.html',
  'zh',
  'manifest.webmanifest',
  'sw.js',
  'PRIVACY.md',
  'icons',
  'assets',
  '.openai'
];

const routeFiles = [
  ['/', 'index.html', 'text/html; charset=utf-8', 'no-cache'],
  ['/index.html', 'index.html', 'text/html; charset=utf-8', 'no-cache'],
  ['/zh', 'index.zh.html', 'text/html; charset=utf-8', 'no-cache'],
  ['/zh/', 'index.zh.html', 'text/html; charset=utf-8', 'no-cache'],
  ['/index.zh.html', 'index.zh.html', 'text/html; charset=utf-8', 'no-cache'],
  ['/manifest.webmanifest', 'manifest.webmanifest', 'application/manifest+json; charset=utf-8', 'no-cache'],
  ['/sw.js', 'sw.js', 'text/javascript; charset=utf-8', 'no-cache'],
  ['/PRIVACY.md', 'PRIVACY.md', 'text/markdown; charset=utf-8', 'no-cache'],
  ['/icons/icon-192.png', 'icons/icon-192.png', 'image/png', 'public, max-age=31536000, immutable'],
  ['/icons/icon-512.png', 'icons/icon-512.png', 'image/png', 'public, max-age=31536000, immutable'],
  ['/icons/icon-maskable-512.png', 'icons/icon-maskable-512.png', 'image/png', 'public, max-age=31536000, immutable'],
  ['/icons/apple-touch-icon.png', 'icons/apple-touch-icon.png', 'image/png', 'public, max-age=31536000, immutable'],
  ['/assets/art/changban-battlefield.jpg', 'assets/art/changban-battlefield.jpg', 'image/jpeg', 'public, max-age=31536000, immutable']
];

const embeddedRoutes = Object.fromEntries(await Promise.all(routeFiles.map(async ([urlPath, filePath, contentType, cacheControl]) => {
  const body = await readFile(join(root, filePath));
  return [urlPath, { body: body.toString('base64'), contentType, cacheControl }];
})));

const serverEntry = `const ROUTES = ${JSON.stringify(embeddedRoutes)};
const decoded = new Map();
function routeBody(path) {
  if (!decoded.has(path)) {
    const raw = atob(ROUTES[path].body);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    decoded.set(path, bytes);
  }
  return decoded.get(path);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/') && path !== '/') path = path.slice(0, -1);
    const route = ROUTES[path] || (request.headers.get('accept') || '').includes('text/html') ? ROUTES[path] ? path : '/index.html' : null;
    if (route) {
      const item = ROUTES[route];
      return new Response(request.method === 'HEAD' ? null : routeBody(route), {
        headers: {
          'content-type': item.contentType,
          'cache-control': item.cacheControl
        }
      });
    }
    if (env?.ASSETS?.fetch) {
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404) return response;
    }
    return new Response('', { status: 404 });
  }
};
`;

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const entry of entries) {
  await cp(join(root, entry), join(dist, entry), { recursive: true });
}
await mkdir(publicDir, { recursive: true });
for (const entry of entries.filter(entry => entry !== '.openai')) {
  await cp(join(root, entry), join(publicDir, entry), { recursive: true });
}
await mkdir(join(dist, 'server'), { recursive: true });
await writeFile(join(dist, 'server', 'index.js'), serverEntry);
