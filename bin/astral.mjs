#!/usr/bin/env node
/** Local workspace CLI and shared atomic storage helpers. Node.js >= 20. */
import { mkdir, open, readFile, rename, stat, unlink } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  LIMITS, createWorkspace, createDemoWorkspace, ingest, search, dream, review,
  createScenario, scheduleResearch, getResearchQueue, completeResearch,
  exportWorkspace, importWorkspace, validateWorkspace,
} from '../lib/core.mjs';

export function resolveWorkspacePath(candidate) { return resolve(candidate ?? '.astral/workspace.json'); }

export async function loadWorkspace(filePath = resolveWorkspacePath(), { createIfMissing = false } = {}) {
  try {
    const info = await stat(filePath);
    if (info.size > LIMITS.importBytes) throw new Error('Workspace exceeds the 20 MiB snapshot limit.');
    return validateWorkspace(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && createIfMissing) return createWorkspace();
    if (error.code === 'ENOENT') throw new Error(`Workspace not found at ${filePath}. Run: astral init --demo`);
    throw error;
  }
}
export const readWorkspace = loadWorkspace;

async function atomicWrite(filePath, text) {
  await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(text, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporary, filePath);
  } finally {
    if (handle) await handle.close();
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}

export async function saveWorkspace(filePath, workspace) { await atomicWrite(filePath, `${exportWorkspace(workspace)}\n`); }

/** Exclusive fail-fast lock. Locks are never stolen from another process. */
export async function withWorkspaceLock(filePath, callback) {
  await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
  const lockPath = `${filePath}.lock`;
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Workspace is locked by another writer: ${lockPath}. Retry after it completes. If a process crashed, confirm it has stopped before removing the lock file.`);
    throw error;
  }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    return await callback();
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

/** Shared CLI/MCP read-modify-write transaction; callback can be asynchronous. */
export async function updateWorkspace(filePath, callback, { createIfMissing = false } = {}) {
  return withWorkspaceLock(filePath, async () => {
    const workspace = await loadWorkspace(filePath, { createIfMissing });
    const result = await callback(workspace);
    await saveWorkspace(filePath, workspace);
    return result;
  });
}

const HELP = `Astral Travel — local-first memory that keeps its receipts.

Usage: astral <command> [options] [--workspace path/to/workspace.json]

  init [--demo]                 Create a blank or fictional demo workspace
  add --title T --text TEXT     Preserve an original note
      [--tags a,b] [--source-url https://...]
  search "query" [--limit 30]  Search raw, processed, and labeled scenarios
  dream [--limit 8]             Propose source-backed lexical connections
  review ID --accept|--reject   Review a dream; accepted ideas stay inferred
      [--note TEXT]
  simulate --prompt TEXT       Create an isolated scenario worksheet
      [--mode grounded|speculative]
  research                     List freshness tasks (does not browse the web)
  research add --title T --query Q [--due ISO_TIMESTAMP] [--raw-ids ID,ID]
  research complete ID [--note TEXT] [--next-due ISO_TIMESTAMP]
  export --out FILE            Export a portable JSON snapshot
  import FILE [--replace]      Import; external verification resets for review

Default storage: .astral/workspace.json in the current directory.
Local heuristics and templates only. No accounts, API keys, models, or telemetry.
`;

function parseArguments(argv) {
  const flags = Object.create(null);
  const positional = [];
  const booleans = new Set(['demo', 'accept', 'reject', 'replace', 'help']);
  const known = new Set([...booleans, 'workspace', 'title', 'text', 'tags', 'source-url', 'limit', 'note', 'prompt', 'mode', 'query', 'due', 'raw-ids', 'next-due', 'out']);
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];
    if (value === '-h') { flags.help = true; continue; }
    if (!value.startsWith('--')) { positional.push(value); continue; }
    const key = value.slice(2);
    if (!known.has(key)) throw new Error(`Unknown option: --${key}`);
    if (Object.hasOwn(flags, key)) throw new Error(`Option repeated: --${key}`);
    if (booleans.has(key)) flags[key] = true;
    else {
      const next = argv[++index];
      if (next === undefined || next.startsWith('--')) throw new Error(`--${key} requires a value.`);
      flags[key] = next;
    }
  }
  return { flags, positional };
}
function required(flags, key) { if (!flags[key]) throw new Error(`--${key} is required.`); return flags[key]; }
function list(value) { return value ? value.split(',').map(item => item.trim()).filter(Boolean) : []; }
function count(value, fallback) { return value === undefined ? fallback : Number(value); }
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
async function exists(file) { try { await stat(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }

export async function main(argv = process.argv.slice(2)) {
  const { flags, positional } = parseArguments(argv);
  const [command, ...args] = positional;
  if (flags.help || !command || command === 'help') { process.stdout.write(HELP); return; }
  const filePath = resolveWorkspacePath(flags.workspace);
  const validFlags = {
    init: ['demo'], add: ['title', 'text', 'tags', 'source-url'], search: ['limit'], dream: ['limit'], review: ['accept', 'reject', 'note'],
    simulate: ['prompt', 'mode'], research: ['title', 'query', 'due', 'raw-ids', 'note', 'next-due'], export: ['out'], import: ['replace'],
  };
  if (!validFlags[command]) throw new Error(`Unknown command: ${command}. Run astral --help.`);
  for (const key of Object.keys(flags)) if (key !== 'workspace' && !validFlags[command].includes(key)) throw new Error(`--${key} is not supported by ${command}.`);
  if (!['search', 'review', 'research', 'import'].includes(command) && args.length) throw new Error(`Unexpected argument: ${args[0]}`);
  if (['review', 'import'].includes(command) && args.length !== 1) throw new Error(`${command} requires exactly one ${command === 'review' ? 'proposal ID' : 'file path'}.`);

  if (command === 'init') {
    await withWorkspaceLock(filePath, async () => {
      if (await exists(filePath)) throw new Error('A workspace already exists. Use a different --workspace path to create another.');
      const workspace = flags.demo ? createDemoWorkspace() : createWorkspace();
      await saveWorkspace(filePath, workspace);
      print({ workspace: filePath, rawRecords: workspace.raw.length, demo: Boolean(flags.demo) });
    });
  } else if (command === 'search') {
    if (!args.length) throw new Error('search requires a query.');
    print(search(await loadWorkspace(filePath), args.join(' '), { limit: count(flags.limit, 30) }));
  } else if (command === 'export') {
    const target = resolve(required(flags, 'out'));
    if (target === filePath) throw new Error('Export to a separate snapshot file, not the active workspace.');
    await atomicWrite(target, `${exportWorkspace(await loadWorkspace(filePath))}\n`);
    print({ exported: target });
  } else if (command === 'import') {
    const sourcePath = resolve(args[0]);
    if ((await stat(sourcePath)).size > LIMITS.importBytes) throw new Error('Snapshot exceeds the 20 MiB import limit.');
    const imported = importWorkspace(await readFile(sourcePath, 'utf8'));
    await withWorkspaceLock(filePath, async () => {
      if (await exists(filePath) && !flags.replace) throw new Error('A workspace already exists. Export a backup, then add --replace to explicitly replace it.');
      await saveWorkspace(filePath, imported);
      print({ imported: sourcePath, workspace: filePath, rawRecords: imported.raw.length, note: 'Imported verification requires local review.' });
    });
  } else if (command === 'research' && args.length === 0) {
    if (Object.keys(flags).some(key => key !== 'workspace')) throw new Error('Use research add or research complete when supplying task options.');
    print(getResearchQueue(await loadWorkspace(filePath)));
  } else {
    const result = await updateWorkspace(filePath, workspace => {
      if (command === 'add') return ingest(workspace, { title: required(flags, 'title'), text: required(flags, 'text'), sourceUrl: flags['source-url'], tags: list(flags.tags) });
      if (command === 'dream') return dream(workspace, { limit: count(flags.limit, 8) });
      if (command === 'review') {
        if (Boolean(flags.accept) === Boolean(flags.reject)) throw new Error('Choose exactly one of --accept or --reject.');
        return review(workspace, args[0], flags.accept ? 'accept' : 'reject', { note: flags.note });
      }
      if (command === 'simulate') return createScenario(workspace, { prompt: required(flags, 'prompt'), mode: flags.mode });
      if (command === 'research') {
        if (args[0] === 'add' && args.length === 1) {
          if (flags.note || flags['next-due']) throw new Error('research add does not accept --note or --next-due.');
          return scheduleResearch(workspace, { title: required(flags, 'title'), query: required(flags, 'query'), dueAt: flags.due, rawIds: list(flags['raw-ids']) });
        }
        if (args[0] === 'complete' && args.length === 2) {
          if (flags.title || flags.query || flags.due || flags['raw-ids']) throw new Error('research complete accepts --note and --next-due only.');
          return completeResearch(workspace, args[1], { note: flags.note, nextDueAt: flags['next-due'] });
        }
        throw new Error('Use research, research add, or research complete ID.');
      }
    });
    print(result);
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(`Astral: ${error.message}\n`); process.exitCode = 1; });
}
