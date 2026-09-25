import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { once } from 'node:events';

const server = fileURLToPath(new URL('../bin/mcp.mjs', import.meta.url));
function client(file) {
  const child = spawn(process.execPath, [server, '--workspace', file], { stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = [];
  const messages = [];
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const lines = createInterface({ input: child.stdout });
  lines.on('line', line => {
    let parsed;
    try { parsed = JSON.parse(line); } catch { parsed = { invalidStdout: line }; }
    if (pending.length) pending.shift()(parsed); else messages.push(parsed);
  });
  const next = () => messages.length ? Promise.resolve(messages.shift()) : new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`MCP response timed out. ${stderr}`)), 5000);
    pending.push(value => { clearTimeout(timer); resolve(value); });
  });
  return {
    child,
    request: async (method, params = {}, id = 1) => {
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      return next();
    },
    raw: async line => { child.stdin.write(line + '\n'); return next(); },
    notify: method => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method }) + '\n'),
    async init(version = '2025-11-25') {
      const response = await this.request('initialize', { protocolVersion: version, capabilities: {}, clientInfo: { name: 'astral-tests', version: '1' } }, 'init');
      this.notify('notifications/initialized');
      return response;
    },
    async close() {
      const exit = once(child, 'exit');
      child.stdin.end();
      const [code] = await exit;
      assert.equal(code, 0, stderr);
      assert.equal(stderr, '');
      assert.equal(messages.length, 0, 'notifications must not emit responses');
    },
  };
}
function data(response) {
  assert.equal(response.result?.isError, false, JSON.stringify(response));
  return JSON.parse(response.result.content[0].text);
}

test('MCP lifecycle, memory persistence, proposals, decisions, and isolated scenarios', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'astral-mcp-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'workspace.json');
  const c = client(file);
  t.after(() => c.child.kill());
  const early = await c.request('tools/list', {}, 'early');
  assert.equal(early.error.code, -32002);
  const init = await c.init();
  assert.equal(init.id, 'init');
  assert.equal(init.result.protocolVersion, '2025-11-25');
  assert.deepEqual(init.result.capabilities, { tools: { listChanged: false } });
  const listing = await c.request('tools/list');
  assert.deepEqual(listing.result.tools.map(tool => tool.name), ['memory_search', 'memory_add', 'memory_dream', 'memory_review', 'memory_scenario']);
  assert.ok(listing.result.tools.every(tool => tool.inputSchema.additionalProperties === false));
  c.notify('notifications/cancelled');
  assert.deepEqual((await c.request('ping', {}, 0)).result, {});
  const a = data(await c.request('tools/call', { name: 'memory_add', arguments: { title: 'First workshop', text: 'Cedar studio artwork approval needs one clear request.', tags: ['approval'] } })).record;
  const b = data(await c.request('tools/call', { name: 'memory_add', arguments: { title: 'Second workshop', text: 'Cedar studio artwork approval uses a shared board.', tags: ['approval'] } })).record;
  const search = data(await c.request('tools/call', { name: 'memory_search', arguments: { query: 'approval' } }));
  assert.equal(search.results.length, 2);
  assert.ok(search.results.every(result => result.type === 'raw'));
  const proposals = data(await c.request('tools/call', { name: 'memory_dream', arguments: {} })).proposals;
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].status, 'proposed');
  let disk = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(disk.claims.length, 0, 'dreaming must not accept its own proposal');
  const reviewed = data(await c.request('tools/call', { name: 'memory_review', arguments: { proposalId: proposals[0].id, decision: 'accept', note: 'Reviewed the original sources.' } }));
  assert.equal(reviewed.proposal.status, 'accepted');
  disk = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(disk.claims[0].status, 'inferred');
  assert.deepEqual(disk.claims[0].rawIds.sort(), [a.id, b.id].sort());
  const scenario = data(await c.request('tools/call', { name: 'memory_scenario', arguments: { prompt: 'Teleporting approval board with unicorns', mode: 'speculative' } }));
  assert.equal(scenario.isolated, true);
  assert.equal(scenario.scenario.status, 'simulation');
  assert.equal(data(await c.request('tools/call', { name: 'memory_search', arguments: { query: 'unicorns' } })).results.length, 0);
  const withScenario = data(await c.request('tools/call', { name: 'memory_search', arguments: { query: 'unicorns', types: ['scenario'] } }));
  assert.equal(withScenario.results[0].status, 'simulation');
  disk = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(disk.raw.length, 2);
  assert.equal(disk.claims.length, 1);
  await c.close();
  const restored = client(file);
  t.after(() => restored.child.kill());
  await restored.init('2024-11-05');
  assert.equal(data(await restored.request('tools/call', { name: 'memory_search', arguments: { query: 'workshop' } })).results.length, 3);
  await restored.close();
});

test('MCP validates protocol and tool inputs without corrupting data', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'astral-mcp-errors-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'workspace.json');
  const c = client(file);
  t.after(() => c.child.kill());
  assert.equal((await c.raw('{')).error.code, -32700);
  assert.equal((await c.raw('[]')).error.code, -32600);
  const init = await c.init('2099-01-01');
  assert.equal(init.result.protocolVersion, '2025-11-25', 'offer supported protocol for negotiation');
  const missing = await c.request('tools/call', { name: 'missing', arguments: {} }, 'keep-this-id');
  assert.equal(missing.id, 'keep-this-id');
  assert.equal(missing.error.code, -32602);
  assert.equal((await c.request('not/a/method')).error.code, -32601);
  assert.equal((await c.request('tools/call', { name: 'memory_add', arguments: [] })).error.code, -32602);
  for (const args of [{ title: 'Note', text: 'A note', status: 'verified' }, { title: 'Note', text: 'A note', sourceUrl: 'file:///etc/passwd' }, { title: 'Note', text: 'A note', tags: 'bad' }]) {
    assert.equal((await c.request('tools/call', { name: 'memory_add', arguments: args })).result.isError, true);
  }
  assert.equal((await c.request('tools/call', { name: 'memory_search', arguments: { query: 'x', limit: 1000 } })).result.isError, true);
  assert.equal((await c.request('tools/call', { name: 'memory_review', arguments: { proposalId: 'scenario_fake', decision: 'accept' } })).result.isError, true);
  data(await c.request('tools/call', { name: 'memory_add', arguments: { title: 'Valid', text: 'A valid record.' } }));
  const original = await readFile(file, 'utf8');
  // A live lock fails visibly instead of overwriting another writer's work.
  await writeFile(`${file}.lock`, 'test lock');
  const locked = await c.request('tools/call', { name: 'memory_add', arguments: { title: 'Blocked', text: 'Do not lose updates.' } });
  assert.equal(locked.result.isError, true);
  assert.equal(await readFile(file, 'utf8'), original);
  await rm(`${file}.lock`);
  await c.close();
});

test('two MCP processes never silently lose successful writes to their shared workspace', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'astral-mcp-concurrent-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'workspace.json');
  const clients = [client(file), client(file)];
  t.after(() => clients.forEach(c => c.child.kill()));
  await Promise.all(clients.map(c => c.init()));
  const responses = await Promise.all(clients.map((c, index) => c.request('tools/call', { name: 'memory_add', arguments: { title: `Writer ${index}`, text: `Concurrent record from writer ${index}.` } })));
  const succeeded = responses.filter(response => response.result.isError === false).map(response => data(response).record.id);
  assert.ok(succeeded.length >= 1);
  const disk = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(disk.raw.map(record => record.id).sort(), succeeded.sort());
  for (let index = 0; index < clients.length; index++) {
    if (responses[index].result.isError) data(await clients[index].request('tools/call', { name: 'memory_add', arguments: { title: `Writer ${index}`, text: `Concurrent record from writer ${index}.` } }));
  }
  assert.equal(JSON.parse(await readFile(file, 'utf8')).raw.length, 2);
  await Promise.all(clients.map(c => c.close()));
});
