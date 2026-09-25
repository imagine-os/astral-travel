import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Use a real child server with a private, synthetic project directory. Never
// touch the user's workspace or depend on their browser-local memory contents.
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'astral-server-'));
  await Promise.all(['web', 'lib', '.astral', 'web/.private'].map(path => mkdir(join(directory, path), { recursive: true })));
  await Promise.all([
    writeFile(join(directory, 'web/index.html'), '<!doctype html><title>Astral fixture</title>Public landing page'),
    writeFile(join(directory, 'lib/core.mjs'), 'export const fixture = "public-engine";'),
    writeFile(join(directory, 'package.json'), '{"secret":"PRIVATE_PACKAGE_MARKER"}'),
    writeFile(join(directory, '.astral/workspace.json'), '{"secret":"PRIVATE_MEMORY_MARKER"}'),
    writeFile(join(directory, 'web/.env'), 'PRIVATE_WEB_ENV_MARKER'),
    writeFile(join(directory, 'web/.private/token.txt'), 'PRIVATE_NESTED_MARKER'),
    writeFile(join(directory, 'lib/.env'), 'PRIVATE_LIB_ENV_MARKER'),
  ]);

  // Reserve an available loopback port, then give it to the unmodified server.
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve); });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  const serverScript = fileURLToPath(new URL('../scripts/serve.mjs', import.meta.url));
  const child = spawn(process.execPath, [serverScript], {
    cwd: directory,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill('SIGTERM');
      await exited;
    }
    await rm(directory, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Dev server failed to start: ${stderr}`)), 5000);
    const onExit = code => { clearTimeout(timeout); reject(new Error(`Dev server exited ${code}: ${stderr}`)); };
    child.once('exit', onExit);
    child.stdout.on('data', chunk => {
      if (String(chunk).includes('Astral Travel:')) {
        clearTimeout(timeout);
        child.off('exit', onExit);
        resolve();
      }
    });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
  });
  return port;
}

// node:http preserves encoded traversal request-targets. fetch/new URL can
// normalize dot segments before sending, which would mask these regressions.
function get(port, target) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, method: 'GET', path: target }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('real dev server serves public UI and engine while isolating project files', async t => {
  const port = await fixture(t);
  const landing = await get(port, '/');
  assert.equal(landing.status, 200);
  assert.match(landing.body, /Public landing page/);
  assert.match(landing.headers['content-type'], /text\/html/);
  const engine = await get(port, '/lib/core.mjs');
  assert.equal(engine.status, 200);
  assert.match(engine.body, /public-engine/);
  assert.match(engine.headers['content-type'], /javascript/);
  assert.equal(engine.headers['x-content-type-options'], 'nosniff');

  const blockedPaths = [
    '/package.json',
    '/.astral/workspace.json',
    '/lib/..%2Fpackage.json',
    '/lib/%2e%2e%2fpackage.json',
    '/lib/..%2F.astral%2Fworkspace.json',
    '/..%2Fpackage.json',
    '/%2e%2e%2f.astral%2fworkspace.json',
    '/lib/../../.astral/workspace.json',
    '/%00',
    '/%malformed',
  ];
  for (const target of blockedPaths) {
    const response = await get(port, target);
    assert.equal(response.status, 404, `${target} must not expose files outside its allowed public directory`);
    assert.doesNotMatch(response.body, /PRIVATE_.*_MARKER/);
  }
});

test('real dev server refuses hidden files and hidden directories even inside public roots', async t => {
  const port = await fixture(t);
  for (const target of ['/.env', '/%2eenv', '/.private/token.txt', '/%2eprivate%2ftoken.txt', '/lib/.env', '/lib/%2eenv']) {
    const response = await get(port, target);
    assert.equal(response.status, 404, `${target} must remain inaccessible`);
    assert.doesNotMatch(response.body, /PRIVATE_.*_MARKER/);
  }
});
