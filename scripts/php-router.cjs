const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function createRouter() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-php-router-'));
  const filename = path.join(directory, 'router.php');
  const projectRoot = root.replaceAll('\\', '/').replaceAll("'", "\\'");
  fs.writeFileSync(filename, `<?php
declare(strict_types=1);
$root = '${projectRoot}';
$requestPath = rawurldecode((string)(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/'));
if (strpos($requestPath, '/.fantasy-db') === 0 || strpos($requestPath, '/.git') === 0) {
    http_response_code(403);
    echo 'Forbidden';
    return true;
}
if ($requestPath === '/api' || strpos($requestPath, '/api/') === 0) {
    require $root . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'index.php';
    return true;
}
$candidate = realpath($root . DIRECTORY_SEPARATOR . ltrim(str_replace('/', DIRECTORY_SEPARATOR, $requestPath), DIRECTORY_SEPARATOR));
if ($candidate !== false && strpos($candidate, $root) === 0 && is_file($candidate)) return false;
if ($requestPath === '/' || $requestPath === '') {
    readfile($root . DIRECTORY_SEPARATOR . 'index.html');
    return true;
}
http_response_code(404);
echo 'Not found';
return true;
`, 'utf8');
  return { filename, cleanup: () => fs.rmSync(directory, { recursive: true, force: true }) };
}

if (require.main === module) {
  const router = createRouter();
  const php = process.env.PHP_BINARY || path.join(root, '.tooling', 'php-audit', 'php.exe');
  const server = spawn(php, ['-c', path.join(root, 'php-local.ini'), '-S', '127.0.0.1:5173', router.filename], {
    cwd: root, stdio: 'inherit', windowsHide: true,
  });
  const shutdown = () => { server.kill(); router.cleanup(); };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.once('exit', (code) => { router.cleanup(); process.exitCode = code || 0; });
}

module.exports = { createRouter };
