import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.split('/').some(segment => segment.startsWith('.'))) throw new Error('Private path');
    const isLibrary = pathname.startsWith('/lib/');
    const directory = path.join(root, isLibrary ? 'lib' : 'web');
    const relativePath = isLibrary ? pathname.slice(4) : pathname;
    const file = path.resolve(directory, '.' + (relativePath === '/' ? '/index.html' : relativePath));
    if (!file.startsWith(directory + path.sep)) throw new Error('Invalid path');
    const resolved = await realpath(file);
    if (!resolved.startsWith(directory + path.sep)) throw new Error('Invalid resolved path');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(await readFile(file));
  } catch {res.writeHead(404, {'Content-Type':'text/plain'}); res.end('Not found');}
}).listen(port, '127.0.0.1', () => console.log(`Astral Travel: http://localhost:${port}`));
