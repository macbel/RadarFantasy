const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const local = path.join(__dirname, '..', '.tooling', 'php-audit', process.platform === 'win32' ? 'php.exe' : 'php');
const php = fs.existsSync(local) ? local : 'php';
const result = spawnSync(php, [path.join(__dirname, 'fixture-backend.test.php')], { encoding: 'utf8' });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'PHP backend test failed');
process.stdout.write(result.stdout);
