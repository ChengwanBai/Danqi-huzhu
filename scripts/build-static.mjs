import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const entries = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'PRIVACY.md',
  'icons',
  'assets',
  '.openai'
];

const serverEntry = `export default {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) {
      return new Response('Static asset binding is unavailable.', { status: 500 });
    }
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    if (request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html')) {
      const url = new URL(request.url);
      url.pathname = '/index.html';
      return env.ASSETS.fetch(new Request(url, request));
    }
    return response;
  }
};
`;

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const entry of entries) {
  await cp(join(root, entry), join(dist, entry), { recursive: true });
}
await mkdir(join(dist, 'server'), { recursive: true });
await writeFile(join(dist, 'server', 'index.js'), serverEntry);
