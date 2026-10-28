import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = new Set([
  'index.html', 'condiciones.html', 'para-productores.html', 'perfil-productor.html',
  'privacidad.html', 'productores.html', 'productores-data.js', 'productores.js',
  'pwa.js', 'robots.txt', 'script.js', 'service-worker.js', 'styles.css', 'manifest.webmanifest',
]);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
};

export function createPreviewServer(directory = root) {
  return http.createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) throw new Error('unsupported_method');
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const name = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (name.split(/[\\/]/).some(part => part.startsWith('.') || !part)) throw new Error('private_path');
      if (!pages.has(name) && !(name.startsWith('assets/') && mime[extname(name)])) throw new Error('unlisted_path');
      const target = await realpath(resolve(directory, name));
      const relativePath = relative(await realpath(directory), target);
      if (relativePath === '..' || relativePath.startsWith('..' + sep)) throw new Error('outside_root');
      const content = await readFile(target);
      response.writeHead(200, {
        'Content-Type': mime[extname(name)] || 'application/octet-stream',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch {
      response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
      response.end('Not found');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 8000);
  createPreviewServer().listen(port, '127.0.0.1', () => {
    console.log(`AgroCanary local preview: http://127.0.0.1:${port}`);
  });
}
