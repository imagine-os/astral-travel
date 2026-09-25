/**
 * Astral Travel 0.1 — a local-first, zero-dependency memory engine.
 * Runs unchanged in modern browsers and Node.js. No network or model calls.
 */
export const SCHEMA_VERSION = '0.1';
export const LIMITS = Object.freeze({ importBytes: 20 * 1024 * 1024, recordsPerCollection: 10000, textLength: 250000, titleLength: 300, dreamWindow: 300 });
export const LINK_TYPES = Object.freeze(['supports', 'contradicts', 'related', 'derived-from', 'part-of']);
const COLLECTIONS = ['raw', 'claims', 'links', 'dreams', 'scenarios', 'events', 'research'];
const STOP_WORDS = new Set('a an and are as at be been being but by can could did do does for from had has have how i if in into is it its may more most not of on or our should so than that the their them then there these they this those to too use used using was we were what when where which who will with would you your'.split(' '));
let sequence = 0;

function id(prefix) {
  const nonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${nonce}`;
}
function now() { return new Date().toISOString(); }
function ensure(condition, message) { if (!condition) throw new Error(message); }
function string(value, name, { max = LIMITS.textLength, optional = false, preserveWhitespace = false } = {}) {
  if (optional && (value === undefined || value === null || value === '')) return '';
  ensure(typeof value === 'string', `${name} must be a string.`);
  const cleaned = value.trim();
  ensure(cleaned.length > 0 && value.length <= max, `${name} must contain 1–${max} characters.`);
  return preserveWhitespace ? value : cleaned;
}
function title(value, fallback) { return string(value ?? fallback, 'title', { max: LIMITS.titleLength }); }
function date(value, name = 'date') {
  ensure(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)), `${name} must be an ISO timestamp.`);
  return new Date(value).toISOString();
}
function tags(values = []) {
  ensure(Array.isArray(values) && values.length <= 100, 'tags must be an array with at most 100 entries.');
  return [...new Set(values.map(value => string(value, 'tag', { max: 80 }).toLowerCase()))];
}
function source(value) {
  const result = string(value, 'sourceUrl', { max: 2048, optional: true });
  if (!result) return '';
  let url;
  try { url = new URL(result); } catch { throw new Error('sourceUrl must be an absolute HTTP or HTTPS URL.'); }
  ensure(['http:', 'https:'].includes(url.protocol), 'sourceUrl must use HTTP or HTTPS.');
  return url.href;
}
function refs(workspace, values, { required = true } = {}) {
  ensure(Array.isArray(values) && values.length <= 100, 'rawIds must be an array with at most 100 entries.');
  const result = [...new Set(values)];
  ensure(!required || result.length > 0, 'At least one original raw source is required.');
  ensure(result.every(value => typeof value === 'string' && workspace.raw.some(raw => raw.id === value)), 'rawIds must refer to existing original raw records. Simulations cannot be evidence.');
  return result;
}
function room(workspace, collection) { ensure(workspace[collection].length < LIMITS.recordsPerCollection, `${collection} has reached the v0.1 limit of ${LIMITS.recordsPerCollection} records.`); }
function event(workspace, action, entityId, detail = '') {
  // The bounded activity log is metadata, never evidence.
  if (workspace.events.length >= LIMITS.recordsPerCollection) workspace.events.shift();
  workspace.events.push({ id: id('event'), action, entityId, detail, createdAt: now() });
}
function fingerprint(value) {
  // FNV-1a is a convenience fingerprint, not an integrity/security guarantee.
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
function immutableRaw(record) { Object.freeze(record.tags); return Object.freeze(record); }
function tokens(value) { return [...new Set(value.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}_-]{1,}/gu) ?? [])].filter(token => token.length <= 80 && !STOP_WORDS.has(token)); }
function plainObject(value, name) { ensure(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} must be an object.`); }
function enumValue(value, allowed, name) { ensure(allowed.includes(value), `${name} must be one of: ${allowed.join(', ')}.`); return value; }
function optionalText(value, name = 'note') { return string(value, name, { optional: true, max: 10000 }); }

export function createWorkspace(seed = []) {
  const workspace = { schemaVersion: SCHEMA_VERSION, raw: [], claims: [], links: [], dreams: [], scenarios: [], events: [], research: [] };
  ensure(Array.isArray(seed), 'Workspace seed must be an array of raw record inputs.');
  for (const record of seed) ingest(workspace, record);
  return workspace;
}

/** Adds an immutable source. Exact title/text/source duplicates return the original. */
export function ingest(workspace, input) {
  plainObject(input, 'raw record');
  const record = { title: title(input.title), text: string(input.text, 'text', { preserveWhitespace: true }), sourceUrl: source(input.sourceUrl), tags: tags(input.tags) };
  const existing = workspace.raw.find(raw => raw.title === record.title && raw.text === record.text && raw.sourceUrl === record.sourceUrl);
  if (existing) return existing;
  room(workspace, 'raw');
  const raw = immutableRaw({ id: id('raw'), ...record, contentHash: fingerprint(JSON.stringify([record.title, record.text, record.sourceUrl])), createdAt: now() });
  workspace.raw.push(raw);
  event(workspace, 'raw.ingested', raw.id);
  return raw;
}

/** Source-backed interpretation starts as proposed; verification is a separate review. */
export function addClaim(workspace, input) {
  plainObject(input, 'claim');
  ensure(input.status === undefined || input.status === 'proposed', 'New claims start as proposed. Use verifyClaim for explicit human review.');
  const claim = { id: id('claim'), title: title(input.title), text: string(input.text, 'text'), rawIds: refs(workspace, input.rawIds), tags: tags(input.tags), status: 'proposed', kind: 'claim', createdAt: now() };
  room(workspace, 'claims');
  workspace.claims.push(claim);
  event(workspace, 'claim.proposed', claim.id);
  return claim;
}

/** "Verified" records a named human review, never independent proof of truth. */
export function verifyClaim(workspace, claimId, { reviewer, note = '' } = {}) {
  const claim = workspace.claims.find(value => value.id === claimId);
  ensure(claim, 'Claim not found.');
  const review = { reviewer: string(reviewer, 'reviewer', { max: 200 }), note: optionalText(note), reviewedAt: now() };
  refs(workspace, claim.rawIds);
  claim.status = 'verified';
  claim.review = review;
  event(workspace, 'claim.verified-by-human', claim.id, `Reviewed by ${review.reviewer}`);
  return claim;
}

export function addLink(workspace, input) {
  plainObject(input, 'link');
  const available = [...workspace.raw, ...workspace.claims];
  ensure(available.some(value => value.id === input.fromId) && available.some(value => value.id === input.toId), 'Links must connect raw records or claims. Scenario records are isolated.');
  ensure(input.fromId !== input.toId, 'A link must connect two different records.');
  const type = enumValue(input.type, LINK_TYPES, 'link type');
  const existing = workspace.links.find(link => link.fromId === input.fromId && link.toId === input.toId && link.type === type);
  if (existing) return existing;
  room(workspace, 'links');
  const link = { id: id('link'), fromId: input.fromId, toId: input.toId, type, label: optionalText(input.label, 'label'), createdAt: now() };
  workspace.links.push(link);
  event(workspace, 'link.created', link.id);
  return link;
}

/** Deterministic lexical retrieval; this is not vector/semantic search. */
export function search(workspace, query, { types = ['raw', 'claim', 'scenario'], limit = 30 } = {}) {
  ensure(typeof query === 'string' && query.length <= 10000, 'Search query must be a string with at most 10000 characters.');
  ensure(Array.isArray(types) && types.every(type => ['raw', 'claim', 'processed', 'scenario'].includes(type)), 'Invalid search types.');
  ensure(Number.isInteger(limit) && limit >= 1 && limit <= 1000, 'Search limit must be an integer from 1 to 1000.');
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];
  const needle = query.trim().toLowerCase();
  const pools = [['raw', workspace.raw], ['claim', workspace.claims], ['scenario', workspace.scenarios]];
  const results = [];
  for (const [type, records] of pools) {
    if (!types.includes(type) && !(type === 'claim' && types.includes('processed'))) continue;
    for (const record of records) {
      const heading = (record.title ?? record.prompt).toLowerCase();
      const content = (record.text ?? record.output ?? '').toLowerCase();
      const labels = (record.tags ?? []).join(' ').toLowerCase();
      const combined = `${heading} ${content} ${labels}`;
      const matchCount = queryTokens.filter(token => combined.includes(token)).length;
      if (!matchCount) continue;
      let score = queryTokens.reduce((sum, token) => sum + (heading.includes(token) ? 6 : 0) + (labels.includes(token) ? 4 : 0) + (content.includes(token) ? 1 : 0), 0);
      if (combined.includes(needle)) score += 4;
      if (matchCount === queryTokens.length) score += 5;
      results.push({ id: record.id, type, title: record.title ?? record.prompt, text: record.text ?? record.output, score, record });
    }
  }
  return results.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)).slice(0, limit);
}

/** Suggests connections by explicit tag/keyword overlap; no LLM is involved. */
export function dream(workspace, { limit = 8 } = {}) {
  ensure(Number.isInteger(limit) && limit >= 1 && limit <= 100, 'Dream limit must be an integer from 1 to 100.');
  const originals = workspace.raw.slice(-LIMITS.dreamWindow);
  const vocabulary = new Map(originals.map(raw => [raw.id, new Set(tokens(`${raw.title} ${raw.text}`).slice(0, 2000))]));
  const prior = new Set(workspace.dreams.map(proposal => [...proposal.rawIds].sort().join('|')));
  const candidates = [];
  for (let left = 0; left < originals.length; left++) {
    for (let right = left + 1; right < originals.length; right++) {
      const a = originals[left]; const b = originals[right];
      const rawIds = [a.id, b.id];
      if (prior.has([...rawIds].sort().join('|'))) continue;
      const sharedTags = a.tags.filter(tag => b.tags.includes(tag));
      const sharedKeywords = [...vocabulary.get(a.id)].filter(token => vocabulary.get(b.id).has(token)).sort().slice(0, 16);
      if (!sharedTags.length && sharedKeywords.length < 3) continue;
      const score = sharedTags.length * 4 + sharedKeywords.length;
      candidates.push({ a, b, rawIds, sharedTags, sharedKeywords, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.rawIds.join('|').localeCompare(b.rawIds.join('|')));
  const proposals = [];
  for (const candidate of candidates.slice(0, Math.min(limit, LIMITS.recordsPerCollection - workspace.dreams.length))) {
    const { a, b, rawIds, sharedTags, sharedKeywords, score } = candidate;
    const basis = [...sharedTags, ...sharedKeywords.filter(word => !sharedTags.includes(word))].slice(0, 6).join(', ');
    const text = `Possible connection between “${a.title}” and “${b.title}” around ${basis}. This is a lexical-overlap hypothesis. Review the original sources before using it.`;
    const proposal = { id: id('dream'), title: `Connection: ${a.title.slice(0, 90)} ↔ ${b.title.slice(0, 90)}`, text, rawIds, status: 'proposed', kind: 'connection', method: 'keyword-tag-overlap-v1', signals: { sharedTags, sharedKeywords, heuristicScore: score }, createdAt: now() };
    workspace.dreams.push(proposal);
    proposals.push(proposal);
    event(workspace, 'dream.proposed', proposal.id);
  }
  return proposals;
}
export const runDreamCycle = dream;

/** Acceptance preserves inferred status; it does not establish truth. */
export function review(workspace, proposalId, decision, { note = '' } = {}) {
  const proposal = workspace.dreams.find(value => value.id === proposalId);
  ensure(proposal, 'Dream proposal not found.');
  enumValue(decision, ['accept', 'reject'], 'decision');
  ensure(proposal.status === 'proposed', 'This proposal has already been reviewed.');
  const reviewNote = optionalText(note);
  if (decision === 'accept') {
    refs(workspace, proposal.rawIds);
    room(workspace, 'claims');
    ensure(workspace.links.length + proposal.rawIds.length <= LIMITS.recordsPerCollection, 'Not enough capacity to preserve source links.');
    const claim = { id: id('claim'), title: proposal.title, text: proposal.text, rawIds: [...proposal.rawIds], tags: [...proposal.signals.sharedTags], kind: 'connection', status: 'inferred', proposalId: proposal.id, createdAt: now() };
    workspace.claims.push(claim);
    proposal.claimId = claim.id;
    for (const rawId of proposal.rawIds) addLink(workspace, { fromId: claim.id, toId: rawId, type: 'derived-from' });
  }
  proposal.status = decision === 'accept' ? 'accepted' : 'rejected';
  proposal.reviewedAt = now();
  proposal.reviewNote = reviewNote;
  event(workspace, `dream.${proposal.status}`, proposal.id, reviewNote);
  return proposal;
}
export const reviewDream = review;

/** Isolated thought experiments. Grounded mode cites context, not predicted outcomes. */
export function createScenario(workspace, { prompt, mode = 'grounded' } = {}) {
  const question = string(prompt, 'prompt', { max: 10000 });
  enumValue(mode, ['grounded', 'speculative'], 'scenario mode');
  room(workspace, 'scenarios');
  const matches = search(workspace, question, { types: ['raw'], limit: 4 });
  const context = matches.map(match => ({ rawId: match.id, title: match.title, excerpt: match.text.slice(0, 360) }));
  const grounding = context.length ? context.map(value => `- [${value.rawId}] ${value.title}: ${value.excerpt}`).join('\n') : '- No relevant original source was found. Add sources before treating this as grounded analysis.';
  const output = mode === 'grounded'
    ? `GROUNDED SCENARIO WORKSHEET — template generated, not a prediction or model result.\n\nQuestion: ${question}\n\nRetrieved context (originals, not verified facts):\n${grounding}\n\n1. Baseline: What do the sources actually establish? List assumptions separately.\n2. Favorable branch: Suppose the idea works. What evidence and prerequisites would be needed?\n3. Adverse branch: Suppose the idea fails. Identify constraints, disconfirming evidence, and an exit condition.\n4. Reversible experiment: Define a small test, a measurable result, and a review date.\n\nNo scenario statement has been added to your knowledge base.`
    : `SPECULATIVE SCENARIO WORKSHEET — intentionally fictional, template generated, not a prediction or model result.\n\nPremise: ${question}\n\nOptional source inspiration (not evidence for the fiction):\n${grounding}\n\n1. Change a rule: Imagine distance, time, or resource constraints working differently.\n2. Explore a world: Describe what an observer would notice and what new possibilities appear.\n3. Find a surprising branch: Reverse an assumption or combine two unrelated roles.\n4. Return to reality: Extract a question worth testing. A real claim still requires original evidence and review.\n\nThis imagined world is isolated from factual memory.`;
  const scenario = { id: id('scenario'), title: question.slice(0, LIMITS.titleLength), prompt: question, mode, output, text: output, contextRawIds: context.map(value => value.rawId), method: 'scenario-worksheet-v1', status: 'simulation', createdAt: now() };
  workspace.scenarios.push(scenario);
  event(workspace, 'scenario.created', scenario.id, mode);
  return scenario;
}

export function backlinks(workspace, recordId) {
  return {
    claims: workspace.claims.filter(claim => claim.rawIds.includes(recordId)),
    incoming: workspace.links.filter(link => link.toId === recordId),
    outgoing: workspace.links.filter(link => link.fromId === recordId),
    dreams: workspace.dreams.filter(proposal => proposal.rawIds.includes(recordId)),
    scenarios: workspace.scenarios.filter(scenario => scenario.contextRawIds.includes(recordId)),
    research: workspace.research.filter(item => item.rawIds.includes(recordId)),
  };
}

export function scheduleResearch(workspace, { title: heading, query, rawIds = [], dueAt = now() } = {}) {
  const item = { id: id('research'), title: title(heading), query: string(query, 'query', { max: 10000 }), rawIds: refs(workspace, rawIds, { required: false }), dueAt: date(dueAt, 'dueAt'), status: 'pending', createdAt: now() };
  room(workspace, 'research');
  workspace.research.push(item);
  event(workspace, 'research.scheduled', item.id);
  return item;
}

export function getResearchQueue(workspace, { now: asOf = now(), includeCompleted = false } = {}) {
  const timestamp = Date.parse(date(asOf, 'now'));
  return workspace.research.filter(item => includeCompleted || item.status !== 'completed').map(item => ({ ...item, isDue: item.status === 'pending' && Date.parse(item.dueAt) <= timestamp, overdueMs: item.status === 'pending' ? Math.max(0, timestamp - Date.parse(item.dueAt)) : 0 })).sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id));
}

export function completeResearch(workspace, researchId, { note = '', nextDueAt } = {}) {
  const item = workspace.research.find(value => value.id === researchId);
  ensure(item, 'Research item not found.');
  const cleanNote = optionalText(note);
  const next = nextDueAt === undefined ? undefined : date(nextDueAt, 'nextDueAt');
  item.completedAt = now();
  item.note = cleanNote;
  item.status = next ? 'pending' : 'completed';
  if (next) item.dueAt = next;
  event(workspace, next ? 'research.rescheduled' : 'research.completed', item.id, cleanNote);
  return item;
}

function parsePayload(payload) {
  if (typeof payload === 'string') {
    ensure(new TextEncoder().encode(payload).length <= LIMITS.importBytes, 'Workspace exceeds the 20 MiB import limit. Store large media externally.');
    try { return JSON.parse(payload); } catch { throw new Error('Workspace is not valid JSON.'); }
  }
  plainObject(payload, 'workspace');
  let serialized;
  try { serialized = JSON.stringify(payload); } catch { throw new Error('Workspace must contain serializable JSON only.'); }
  ensure(new TextEncoder().encode(serialized).length <= LIMITS.importBytes, 'Workspace exceeds the 20 MiB import limit. Store large media externally.');
  return JSON.parse(serialized);
}

/** Structural validator for your own persisted workspace; not a trust boundary. */
export function validateWorkspace(payload) {
  const input = parsePayload(payload);
  plainObject(input, 'workspace');
  ensure(input.schemaVersion === SCHEMA_VERSION, `Unsupported schema version. Expected ${SCHEMA_VERSION}.`);
  const workspace = createWorkspace();
  const ids = new Set();
  for (const collection of COLLECTIONS) {
    ensure(Array.isArray(input[collection]) && input[collection].length <= LIMITS.recordsPerCollection, `${collection} must be an array with at most ${LIMITS.recordsPerCollection} records.`);
    for (const record of input[collection]) {
      plainObject(record, `${collection} record`);
      const recordId = string(record.id, 'id', { max: 150 });
      ensure(/^[a-z][a-z0-9_-]*$/i.test(recordId) && !ids.has(recordId), 'Record IDs must be unique, safe identifiers.');
      ids.add(recordId);
      date(record.createdAt, 'createdAt');
    }
  }
  for (const raw of input.raw) {
    const clean = { id: raw.id, title: title(raw.title), text: string(raw.text, 'text', { preserveWhitespace: true }), sourceUrl: source(raw.sourceUrl), tags: tags(raw.tags), createdAt: date(raw.createdAt) };
    clean.contentHash = fingerprint(JSON.stringify([clean.title, clean.text, clean.sourceUrl]));
    workspace.raw.push(immutableRaw(clean));
  }
  for (const record of input.claims) {
    const claim = { id: record.id, title: title(record.title), text: string(record.text, 'text'), rawIds: refs(workspace, record.rawIds), tags: tags(record.tags), status: enumValue(record.status, ['proposed', 'inferred', 'verified'], 'claim status'), kind: enumValue(record.kind, ['claim', 'connection'], 'claim kind'), createdAt: date(record.createdAt) };
    if (record.proposalId !== undefined) claim.proposalId = string(record.proposalId, 'proposalId', { max: 150 });
    if (claim.status === 'verified') {
      plainObject(record.review, 'human review');
      claim.review = { reviewer: string(record.review.reviewer, 'reviewer', { max: 200 }), note: optionalText(record.review.note), reviewedAt: date(record.review.reviewedAt) };
    }
    if (record.importNote) claim.importNote = optionalText(record.importNote);
    workspace.claims.push(claim);
  }
  const sourceIds = new Set([...workspace.raw, ...workspace.claims].map(record => record.id));
  for (const link of input.links) {
    ensure(sourceIds.has(link.fromId) && sourceIds.has(link.toId) && link.fromId !== link.toId, 'Links must reference distinct raw records or claims.');
    workspace.links.push({ id: link.id, fromId: link.fromId, toId: link.toId, type: enumValue(link.type, LINK_TYPES, 'link type'), label: optionalText(link.label, 'label'), createdAt: date(link.createdAt) });
  }
  for (const proposal of input.dreams) {
    plainObject(proposal.signals, 'dream signals');
    ensure(Number.isFinite(proposal.signals.heuristicScore) && proposal.signals.heuristicScore >= 0, 'Invalid heuristic score.');
    const clean = { id: proposal.id, title: title(proposal.title), text: string(proposal.text, 'text'), rawIds: refs(workspace, proposal.rawIds), kind: enumValue(proposal.kind, ['connection'], 'dream kind'), status: enumValue(proposal.status, ['proposed', 'accepted', 'rejected'], 'dream status'), method: enumValue(proposal.method, ['keyword-tag-overlap-v1'], 'dream method'), signals: { sharedTags: tags(proposal.signals.sharedTags), sharedKeywords: tags(proposal.signals.sharedKeywords), heuristicScore: proposal.signals.heuristicScore }, createdAt: date(proposal.createdAt) };
    if (proposal.claimId !== undefined) {
      ensure(workspace.claims.some(claim => claim.id === proposal.claimId && claim.proposalId === proposal.id), 'Dream claimId must reference its derived claim.');
      clean.claimId = proposal.claimId;
    }
    if (clean.status === 'accepted') ensure(clean.claimId, 'Accepted dreams must retain their derived claim.');
    if (proposal.reviewedAt !== undefined) clean.reviewedAt = date(proposal.reviewedAt);
    if (proposal.reviewNote !== undefined) clean.reviewNote = optionalText(proposal.reviewNote);
    workspace.dreams.push(clean);
  }
  for (const claim of workspace.claims) if (claim.proposalId) ensure(workspace.dreams.some(proposal => proposal.id === claim.proposalId && proposal.claimId === claim.id && proposal.status === 'accepted'), 'Claim proposalId must reference its accepted dream.');
  for (const record of input.scenarios) {
    const output = string(record.output, 'scenario output');
    ensure(record.text === output, 'Scenario text and output must match.');
    workspace.scenarios.push({ id: record.id, title: title(record.title), prompt: string(record.prompt, 'prompt', { max: 10000 }), mode: enumValue(record.mode, ['grounded', 'speculative'], 'scenario mode'), output, text: output, contextRawIds: refs(workspace, record.contextRawIds, { required: false }), method: enumValue(record.method, ['scenario-worksheet-v1'], 'scenario method'), status: enumValue(record.status, ['simulation'], 'scenario status'), createdAt: date(record.createdAt) });
  }
  for (const record of input.research) {
    const clean = { id: record.id, title: title(record.title), query: string(record.query, 'query', { max: 10000 }), rawIds: refs(workspace, record.rawIds, { required: false }), dueAt: date(record.dueAt), status: enumValue(record.status, ['pending', 'completed'], 'research status'), createdAt: date(record.createdAt) };
    if (record.completedAt !== undefined) clean.completedAt = date(record.completedAt);
    if (record.note !== undefined) clean.note = optionalText(record.note);
    workspace.research.push(clean);
  }
  const allEntityIds = new Set([...workspace.raw, ...workspace.claims, ...workspace.links, ...workspace.dreams, ...workspace.scenarios, ...workspace.research].map(record => record.id));
  for (const record of input.events) {
    ensure(record.entityId === 'workspace' || allEntityIds.has(record.entityId), 'Event must reference an existing entity or the workspace.');
    workspace.events.push({ id: record.id, action: string(record.action, 'event action', { max: 100 }), entityId: record.entityId, detail: optionalText(record.detail, 'detail'), createdAt: date(record.createdAt) });
  }
  return workspace;
}

export function exportWorkspace(workspace) { return JSON.stringify(validateWorkspace(workspace), null, 2); }

/** External import never inherits another person's verification as your own. */
export function importWorkspace(payload) {
  const workspace = validateWorkspace(payload);
  let downgraded = 0;
  for (const claim of workspace.claims) {
    if (claim.status === 'verified') {
      claim.status = 'proposed';
      claim.importNote = 'Imported verification was removed. Review the original sources locally before verifying.';
      delete claim.review;
      downgraded++;
    }
  }
  event(workspace, 'workspace.imported', 'workspace', `${downgraded} imported verification status(es) reset for local review. Imported activity is historical metadata, not proof.`);
  return workspace;
}

/** Fictional, shareable studio notes. No account data or external calls. */
export function createDemoWorkspace() {
  const workspace = createWorkspace([
    { title: 'Studio interview: approval friction', text: 'Fictional interview: Cedar Studio clients often delay artwork approval because feedback is scattered across email. A shared approval board could help clients respond to one clear request.', tags: ['studio', 'approval', 'client-experience'] },
    { title: 'Prototype test: one clear next step', text: 'Fictional prototype observation: five studio volunteers completed artwork approval faster when the approval board showed one clear request. This small informal sample does not establish a general result.', tags: ['studio', 'approval', 'experiment'] },
    { title: 'Research note: local-first memory', text: 'Fictional architecture note: keep original notes immutable, store interpretations separately, and connect every claim to its source. Local-first export supports portability and independent review.', tags: ['memory', 'provenance', 'local-first'] },
    { title: 'Design note: visible evidence', text: 'Fictional design note: a memory palace should expose source provenance and review state. An attractive graph is useful only when a reader can return to the original notes and inspect a claim.', tags: ['memory', 'provenance', 'design'] },
    { title: 'Freshness check: rendering libraries', text: 'Fictional research plan: rendering-library APIs and device performance change. Review official release notes before committing a production interface to a particular renderer.', tags: ['research', 'freshness', 'design'] },
    { title: 'Future media storage boundary', text: 'Fictional architecture note: video and audio should live in external object storage. Memory stores searchable transcripts, timestamps, content references, and access policies instead of large binary files.', tags: ['memory', 'media', 'architecture'] },
  ]);
  addClaim(workspace, { title: 'A focused approval board may reduce friction', text: 'Working hypothesis: a focused approval board could help Cedar Studio clients respond faster. Validate with a larger, measured pilot before treating this as a reliable outcome.', rawIds: [workspace.raw[0].id, workspace.raw[1].id], tags: ['studio', 'approval'] });
  addClaim(workspace, { title: 'Keep interpretation traceable to originals', text: 'Design proposal: present a direct source trail beside each interpretation so reviewers can inspect its basis.', rawIds: [workspace.raw[2].id, workspace.raw[3].id], tags: ['memory', 'provenance'] });
  addLink(workspace, { fromId: workspace.claims[0].id, toId: workspace.raw[0].id, type: 'derived-from' });
  addLink(workspace, { fromId: workspace.claims[1].id, toId: workspace.raw[2].id, type: 'derived-from' });
  scheduleResearch(workspace, { title: 'Review rendering-library release notes', query: 'Check official renderer release notes and benchmark the target devices.', rawIds: [workspace.raw[4].id], dueAt: now() });
  scheduleResearch(workspace, { title: 'Validate the approval-board hypothesis', query: 'Run a measured pilot and look for evidence that contradicts the initial five-person observation.', rawIds: [workspace.raw[0].id, workspace.raw[1].id], dueAt: new Date(Date.now() + 7 * 86400000).toISOString() });
  return workspace;
}
