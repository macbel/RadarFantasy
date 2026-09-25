const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const php = process.env.PHP_BINARY || path.join(root, '.tooling', 'php-audit', 'php.exe');
const apiSource = fs.readFileSync(path.join(root, 'api', 'index.php'), 'utf8');

function assertMobileCorsContract() {
  const match = apiSource.match(/function apply_cors_headers\(\): void\s*\{([\s\S]*?)\n\}/);
  assert.ok(match, 'apply_cors_headers must be present');
  assert.match(match[1], /^\s*if \(auth_mobile_request\(\)\)\s*\{\s*auth_apply_mobile_cors\(\);\s*return;\s*\}/);
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(baseUrl, child) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`PHP test server exited with ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/mobile/healthz`);
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('PHP test server did not become ready');
}

async function run() {
  assertMobileCorsContract();
  if (!fs.existsSync(php)) {
    process.stdout.write('Mobile CORS source contract passed; PHP HTTP integration skipped (local PHP runtime unavailable).\n');
    return;
  }
  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(php, ['-c', path.join(root, 'php-local.ini'), '-S', `127.0.0.1:${port}`, 'local-app-router.php'], {
    cwd: root,
    env: { ...process.env, FMS_ALLOWED_ORIGINS: '', FMS_MOBILE_CORS_ORIGINS: '' },
    stdio: 'ignore',
    windowsHide: true,
  });

  try {
    await waitForServer(baseUrl, child);

    const preflight = async (origin) => fetch(`${baseUrl}/api/mobile/permission`, {
      method: 'OPTIONS',
      headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' },
    });

    const hostile = await preflight('https://evil.example');
    assert.equal(hostile.status, 204);
    assert.equal(hostile.headers.get('access-control-allow-origin'), null);
    assert.equal(hostile.headers.get('access-control-allow-credentials'), null);

    const native = await preflight('https://localhost');
    assert.equal(native.status, 204);
    assert.equal(native.headers.get('access-control-allow-origin'), 'https://localhost');
    assert.equal(native.headers.get('access-control-allow-credentials'), 'true');

    process.stdout.write('Mobile CORS integration passed: hostile origin denied; localhost allowed.\n');
  } finally {
    child.kill();
  }
}

run().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
