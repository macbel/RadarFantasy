const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');

// API tests reuse the reviewed application entry point; no generated PHP files.
function createRouter() {
  return { filename: path.join(root, 'api', 'index.php'), cleanup() {} };
}
async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
function frontend(backendPort) {
  const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.wasm':'application/wasm','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'};
  return http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400); res.end(); return; }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      const proxy = http.request({hostname:'127.0.0.1',port:backendPort,path:req.url,method:req.method,headers:{...req.headers,connection:'close'},agent:false}, incoming => { res.writeHead(incoming.statusCode, incoming.headers); incoming.pipe(res); });
      proxy.on('error', () => { if (!res.headersSent) res.writeHead(502, {'Content-Type':'application/json'}); res.end('{"error":"local_backend_unavailable"}'); });
      req.on('aborted', () => proxy.destroy()); req.pipe(proxy); return;
    }
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    const filename = pathname === '/' ? 'index.html' : pathname.slice(1);
    const full = path.resolve(root, filename);
    if (!full.startsWith(root + path.sep) || filename.split(/[\\/]/).some(segment => segment.startsWith('.')) || !mime[path.extname(full)]) { res.writeHead(403); res.end(); return; }
    fs.realpath(full, (error, resolved) => {
      if (error || !resolved.startsWith(root + path.sep)) { res.writeHead(error ? 404 : 403); res.end(); return; }
      fs.readFile(resolved, (error, body) => { res.writeHead(error ? 404 : 200, {'Content-Type':mime[path.extname(full)],'Cache-Control':'no-store'}); res.end(error || req.method === 'HEAD' ? undefined : body); });
    });
  });
}
async function main() {
  const backendPort = await reservePort();
  const php = process.env.PHP_BINARY || path.join(root, '.tooling', 'php-audit', 'php.exe');
  const child = spawn(php, ['-c', path.join(root, 'php-local.ini'), '-S', `127.0.0.1:${backendPort}`, createRouter().filename], {cwd:root,stdio:'inherit',windowsHide:true});
  const server = frontend(backendPort);
  const shutdown = () => { child.kill(); server.close(); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  child.once('error', error => { console.error(error.message); shutdown(); process.exitCode=1; });
  child.once('exit', code => { server.close(); process.exitCode=code || 0; });
  server.once('error', error => { console.error(error.message); shutdown(); process.exitCode=1; });
  server.listen(5173, '127.0.0.1', () => console.log('Radar PHP development: http://127.0.0.1:5173 (existing API entry point, no temporary PHP router)'));
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode=1; });
module.exports = { createRouter, frontend };
