/**
 * Pure presentation helpers. These views never change a memory's content,
 * evidence status, source references, or persisted schema.
 */
const SPACING = 4;
const ROOM_PADDING = 3;
const palette = Object.freeze({
  chat: '#558bcc', experiment: '#cf9636', document: '#7b72c4',
  research: '#3c9a9b', media: '#b774ad', connection: '#9070d0',
  book: '#bc8554', image: '#b774ad', video: '#c76d70', audio: '#459e99', code: '#5278b4', claim: '#9070d0',
  folder: '#d09b37', network: '#3a9f91', character: '#d17b91', database: '#548fc2',
  service: '#6979b8', cloud: '#72a9c8', portal: '#9b76ca',
});

function compare(a, b) {
  const left = String(a ?? '');
  const right = String(b ?? '');
  return left < right ? -1 : left > right ? 1 : 0;
}

function nodeOrder(a, b) {
  return compare(a.title, b.title) || compare(a.id, b.id);
}

function displayCategory(tags) {
  // These labels are navigational groupings, not an inferred ontology.
  const keys = new Set(tags.map(tag => tag.toLowerCase()));
  if (['studio', 'customer', 'customers', 'client', 'client-experience'].some(key => keys.has(key))) return 'Studio';
  if (['memory', 'provenance', 'knowledge', 'local-first'].some(key => keys.has(key))) return 'Memory';
  if (['research', 'freshness'].some(key => keys.has(key))) return 'Research';
  if (['media', 'video', 'audio', 'image'].some(key => keys.has(key))) return 'Media';
  if (['experiment', 'experiments', 'testing'].some(key => keys.has(key))) return 'Experiments';
  const first = tags[0]?.trim().replace(/[-_]+/g, ' ');
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : 'Notes';
}

/** Object shapes describe the saved material; they do not imply an attachment. */
export const OBJECT_TYPES = Object.freeze([
  { id: 'document', label: 'Document', icon: '▤', description: 'Notes, plans, and checklists' },
  { id: 'chat', label: 'Conversation', icon: '❞', description: 'Interviews, messages, and feedback' },
  { id: 'book', label: 'Book', icon: '▥', description: 'Reading notes and chapter summaries' },
  { id: 'image', label: 'Image notes', icon: '▧', description: 'Written image and moodboard descriptions' },
  { id: 'video', label: 'Video notes', icon: '▶', description: 'Storyboards and video transcripts' },
  { id: 'audio', label: 'Audio notes', icon: '♫', description: 'Transcripts and listening notes' },
  { id: 'code', label: 'Code', icon: '⌘', description: 'Saved snippets and implementation notes' },
  { id: 'research', label: 'Research', icon: '⌕', description: 'Research briefs and source reviews' },
  { id: 'experiment', label: 'Experiment', icon: '△', description: 'Test plans and recorded observations' },
  { id: 'folder', label: 'Folder', icon: '▱', description: 'Collection outlines and linked note indexes' },
  { id: 'network', label: 'Network', icon: '⌬', description: 'Relationship maps and connection plans' },
  { id: 'character', label: 'Character', icon: '♟', description: 'People, personas, and fictional role profiles' },
  { id: 'database', label: 'Database', icon: '▰', description: 'Dataset descriptions and schema notes' },
  { id: 'service', label: 'Service', icon: '⚙', description: 'Tool descriptions and service blueprints' },
  { id: 'cloud', label: 'Cloud', icon: '☁', description: 'Storage plans and infrastructure notes' },
  { id: 'portal', label: 'Portal', icon: '◎', description: 'Navigation gateways and scenario entry points' },
  { id: 'claim', label: 'Interpretation', icon: '✧', description: 'Source-backed proposals and inferences' },
].map(value => Object.freeze(value)));

function objectTypeFor(record, type, tags) {
  // Evidence type wins over any topical title or tag: a claim stays a claim.
  if (type === 'claim') return 'claim';
  const heading = `${record.title ?? ''} ${tags.join(' ')}`.toLowerCase();
  // Explicit format tags win over descriptive language in a title. For example,
  // an audio transcript of an interview should be an audio object, not a chat.
  const formats = new Set(OBJECT_TYPES.filter(item => item.id !== 'claim').map(item => item.id));
  const normalizedTags = tags.map(tag => tag.trim().toLowerCase());
  // A format: hint is unambiguous even when topic tags also name object types.
  const formatHint = normalizedTags.find(tag => tag.startsWith('format:') && formats.has(tag.slice(7)));
  if (formatHint) return formatHint.slice(7);
  // Legacy simple format tags remain supported; their first occurrence wins.
  const taggedFormat = normalizedTags.find(tag => formats.has(tag));
  if (taggedFormat) return taggedFormat;
  if (/\b(folder|collection|binder)\b/u.test(heading)) return 'folder';
  if (/\b(network|topology|relationship map)\b/u.test(heading)) return 'network';
  if (/\b(character|persona|profile|avatar)\b/u.test(heading)) return 'character';
  if (/\b(database|dataset|schema)\b/u.test(heading)) return 'database';
  if (/\b(service|connector|endpoint)\b/u.test(heading)) return 'service';
  if (/\b(cloud|storage bucket)\b/u.test(heading)) return 'cloud';
  if (/\b(portal|gateway)\b/u.test(heading)) return 'portal';
  if (/\b(code|javascript|typescript|python|snippet|function)\b/u.test(heading)) return 'code';
  if (/\b(book|reading|chapter|novel)\b/u.test(heading)) return 'book';
  if (/\b(image|photo|photograph|moodboard|illustration)\b/u.test(heading)) return 'image';
  if (/\b(video|film|storyboard|movie)\b/u.test(heading)) return 'video';
  if (/\b(audio|podcast|listening|sound|voice)\b/u.test(heading)) return 'audio';
  if (/\b(interview|conversation|chat|feedback|email)\b/u.test(heading)) return 'chat';
  if (/\b(experiment|prototype|test|pilot)\b/u.test(heading)) return 'experiment';
  if (/\b(research|freshness|review|study|bookmark)\b/u.test(heading)) return 'research';
  return 'document';
}

/** Return display metadata without mutating or silently verifying the record. */
export function describeMemory(record, type) {
  const memoryType = type === 'claim' ? 'claim' : 'raw';
  const tags = (record.tags ?? []).filter(tag => typeof tag === 'string').slice();
  const objectType = objectTypeFor(record, memoryType, tags);
  const icon = memoryType === 'claim' && record.kind === 'connection' ? 'connection' : objectType;
  return {
    id: record.id,
    title: record.title ?? 'Untitled memory',
    text: record.text ?? '',
    type: memoryType,
    objectType,
    status: memoryType === 'raw' ? 'original' : (record.status ?? 'proposed'),
    tags,
    category: displayCategory(tags),
    icon,
    color: palette[icon],
  };
}

function isClaim(record) {
  return record.type === 'claim' || record.kind === 'claim' || Array.isArray(record.rawIds);
}

/**
 * Visible edges, with source → interpretation direction for provenance.
 * Accept canonical records here: describeMemory deliberately omits rawIds.
 */
export function memoryEdges(records, links = []) {
  const visible = new Map(records.map(record => [record.id, record]));
  const edges = new Map();
  function add(from, to, type) {
    if (!visible.has(from) || !visible.has(to) || from === to) return;
    if (type === 'derived-from') {
      const left = visible.get(from);
      const right = visible.get(to);
      if (isClaim(left) && !isClaim(right)) [from, to] = [to, from];
      // Other same-type provenance links have no inferable source direction;
      // use a stable ordering for display only to collapse reversed duplicates.
      else if (isClaim(left) === isClaim(right) && compare(from, to) > 0) [from, to] = [to, from];
    } else if (type === 'related' && compare(from, to) > 0) [from, to] = [to, from];
    const key = JSON.stringify([from, to, type]);
    if (!edges.has(key)) edges.set(key, { from, to, type });
  }
  for (const record of records) {
    for (const rawId of record.rawIds ?? []) add(rawId, record.id, 'derived-from');
  }
  for (const link of links) add(link.fromId ?? link.from, link.toId ?? link.to, link.type ?? 'related');
  return [...edges.values()].sort((a, b) => compare(a.from, b.from) || compare(a.to, b.to) || compare(a.type, b.type));
}

function gridShape(count, ratio = 1) {
  const columns = Math.max(1, Math.round(Math.sqrt(count * ratio)));
  return { columns, rows: Math.ceil(count / columns), width: (columns - 1) * SPACING + ROOM_PADDING, depth: (Math.ceil(count / columns) - 1) * SPACING + ROOM_PADDING };
}

function putGrid(positions, nodes, shape, x = 0, z = 0) {
  nodes.forEach((node, index) => {
    positions.set(node.id, {
      x: x + (index % shape.columns - (shape.columns - 1) / 2) * SPACING,
      y: 0,
      z: z + (Math.floor(index / shape.columns) - (shape.rows - 1) / 2) * SPACING,
    });
  });
}

function rooms(nodes, positions) {
  const categories = new Map();
  for (const node of nodes) {
    const category = node.category || 'Notes';
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category).push(node);
  }
  if (categories.size > 4) {
    const keep = new Set([...categories.entries()]
      .filter(([label]) => label !== 'Notes')
      .sort((a, b) => b[1].length - a[1].length || compare(a[0], b[0]))
      .slice(0, 3).map(([label]) => label));
    const other = [];
    for (const [label, members] of categories) {
      if (!keep.has(label)) { other.push(...members); categories.delete(label); }
    }
    categories.set('Notes', other.sort(nodeOrder));
  }
  const clusters = [...categories.entries()]
    .sort((a, b) => (a[0] === 'Notes') - (b[0] === 'Notes') || b[1].length - a[1].length || compare(a[0], b[0]))
    .map(([label, members]) => ({ label, nodes: members, ...gridShape(members.length, 1.35) }));
  const gap = 1.2;
  const rows = [];
  for (let start = 0; start < clusters.length; start += 2) {
    const cells = clusters.slice(start, start + 2);
    rows.push({ cells, width: cells.reduce((sum, cell) => sum + cell.width, 0) + (cells.length - 1) * gap, depth: Math.max(...cells.map(cell => cell.depth)) });
  }
  const totalDepth = rows.reduce((sum, row) => sum + row.depth, 0) + (rows.length - 1) * gap;
  let top = -totalDepth / 2;
  const groups = [];
  for (const row of rows) {
    let left = -row.width / 2;
    for (const cell of row.cells) {
      const x = left + cell.width / 2;
      const z = top + row.depth / 2;
      putGrid(positions, cell.nodes, cell, x, z);
      groups.push({ label: cell.label, x, z, width: cell.width, depth: cell.depth });
      left += cell.width + gap;
    }
    top += row.depth + gap;
  }
  return groups;
}

function lanes(nodes, positions) {
  const source = nodes.filter(node => node.type !== 'claim');
  const processed = nodes.filter(node => node.type === 'claim');
  const cells = [
    { label: 'Original sources', nodes: source },
    { label: 'Processed knowledge', nodes: processed },
  ].filter(cell => cell.nodes.length).map(cell => ({ ...cell, ...gridShape(cell.nodes.length, 0.8) }));
  const gap = 3;
  const totalWidth = cells.reduce((sum, cell) => sum + cell.width, 0) + (cells.length - 1) * gap;
  let left = -totalWidth / 2;
  return cells.map(cell => {
    const x = left + cell.width / 2;
    putGrid(positions, cell.nodes, cell, x);
    left += cell.width + gap;
    return { label: cell.label, x, z: 0, width: cell.width, depth: cell.depth };
  });
}

/** Depth bands echo a physical object gallery while keeping stable record IDs. */
function bands(nodes, positions) {
  const definitions = [
    { label: 'Clouds & portals', types: ['cloud', 'portal'] },
    { label: 'Networks & services', types: ['network', 'service'] },
    { label: 'Datastores', types: ['database'] },
    { label: 'Folders', types: ['folder'] },
    { label: 'Sources', types: ['document', 'chat', 'book', 'image', 'video', 'audio', 'code', 'research', 'experiment'] },
    { label: 'Ideas', types: ['claim'] },
    { label: 'Characters', types: ['character'] },
  ];
  const byType = new Map(definitions.flatMap((band, index) => band.types.map(type => [type, index])));
  const buckets = definitions.map(() => []);
  for (const node of nodes) {
    const type = node.type === 'claim' ? 'claim' : node.objectType;
    buckets[byType.get(type) ?? 4].push(node);
  }
  const populated = definitions.map((definition, index) => {
    const members = buckets[index];
    const columns = Math.min(10, Math.max(1, members.length));
    const rows = Math.ceil(members.length / columns);
    return { label: definition.label, members, columns, rows, width: (columns - 1) * SPACING + ROOM_PADDING, depth: (rows - 1) * SPACING + ROOM_PADDING };
  }).filter(band => band.members.length);
  const gap = 1.8;
  const totalDepth = populated.reduce((sum, band) => sum + band.depth, 0) + Math.max(0, populated.length - 1) * gap;
  let top = -totalDepth / 2;
  return populated.map(band => {
    const z = top + band.depth / 2;
    putGrid(positions, band.members, band, 0, z);
    top += band.depth + gap;
    return { label: band.label, x: 0, z, width: band.width, depth: band.depth };
  });
}

function distance(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

function ringPoints(count, radius, offset = 0, stretch = 1) {
  return Array.from({ length: count }, (_, index) => {
    const angle = offset + index * Math.PI * 2 / count;
    return { x: Math.cos(angle) * radius * stretch, y: 0, z: Math.sin(angle) * radius };
  });
}

function circleRadius(count) { return count > 1 ? Math.max(SPACING, SPACING / (2 * Math.sin(Math.PI / count))) : SPACING; }

function putRadialRings(nodes, positions, startRadius) {
  let offset = 0, radius = startRadius;
  while (offset < nodes.length) {
    // Bound each ring by its chord spacing; adjacent rings remain four units apart.
    const capacity = Math.max(1, Math.floor(Math.PI / Math.asin(SPACING / (2 * radius)) + 1e-9));
    const count = Math.min(capacity, nodes.length - offset);
    ringPoints(count, radius).forEach((point, index) => positions.set(nodes[offset + index].id, point));
    offset += count;
    radius += SPACING;
  }
  return radius;
}

function radial(nodes, edges, positions, selectedId) {
  const visible = new Set(nodes.map(node => node.id));
  const adjacency = new Map(nodes.map(node => [node.id, new Set()]));
  for (const edge of edges) {
    if (!visible.has(edge.from) || !visible.has(edge.to) || edge.from === edge.to) continue;
    adjacency.get(edge.from).add(edge.to);
    adjacency.get(edge.to).add(edge.from);
  }
  const center = nodes.find(node => node.id === selectedId) ?? [...nodes]
    .sort((a, b) => adjacency.get(b.id).size - adjacency.get(a.id).size || nodeOrder(a, b))[0];
  positions.set(center.id, { x: 0, y: 0, z: 0 });
  const neighbors = nodes.filter(node => adjacency.get(center.id).has(node.id));
  const outer = nodes.filter(node => node.id !== center.id && !adjacency.get(center.id).has(node.id));
  if (nodes.length > 60) {
    // Larger collections use compact rings instead of a single distant ellipse.
    // Finish the direct-neighbor rings before placing any unrelated record.
    const outerRadius = putRadialRings(neighbors, positions, SPACING);
    putRadialRings(outer, positions, outerRadius);
    return [];
  }
  const innerRadius = circleRadius(neighbors.length);
  ringPoints(neighbors.length, innerRadius).forEach((point, index) => positions.set(neighbors[index].id, point));
  if (!outer.length) return [];

  // Try rotations before increasing the outer ellipse. This keeps small
  // workspaces compact while ensuring cards never overlap a nearby ring.
  let radius = Math.max(5, neighbors.length ? innerRadius + 1 : SPACING, circleRadius(outer.length));
  let candidates;
  for (;;) {
    for (let turn = 0; turn < 48; turn++) {
      const points = ringPoints(outer.length, radius, turn * Math.PI / 24, nodes.length <= 12 ? 1.6 : 1.3);
      if (points.every(point => [...positions.values()].every(existing => distance(point, existing) >= SPACING - 1e-8))) {
        candidates = points;
        break;
      }
    }
    if (candidates) break;
    radius += 0.4;
  }
  candidates.forEach((point, index) => positions.set(outer[index].id, point));
  return [];
}

function getBounds(positions, groups) {
  const points = [...positions.values()];
  if (!points.length) return { minX: -2, maxX: 2, minZ: -2, maxZ: 2, width: 4, depth: 4, center: { x: 0, y: 0, z: 0 } };
  const minX = Math.min(...points.map(point => point.x - ROOM_PADDING / 2), ...groups.map(group => group.x - group.width / 2));
  const maxX = Math.max(...points.map(point => point.x + ROOM_PADDING / 2), ...groups.map(group => group.x + group.width / 2));
  const minZ = Math.min(...points.map(point => point.z - ROOM_PADDING / 2), ...groups.map(group => group.z - group.depth / 2));
  const maxZ = Math.max(...points.map(point => point.z + ROOM_PADDING / 2), ...groups.map(group => group.z + group.depth / 2));
  return { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ, center: { x: (minX + maxX) / 2, y: 0, z: (minZ + maxZ) / 2 } };
}

/** Arrange stable IDs in rooms, object bands, evidence lanes, radial, or grid views. */
export function arrangeMemories(nodes, edges = [], layout = 'rooms', selectedId) {
  const ordered = [...new Map(nodes.map(node => [node.id, node])).values()].sort(nodeOrder);
  const positions = new Map();
  let groups = [];
  if (ordered.length) {
    if (layout === 'bands') groups = bands(ordered, positions);
    else if (layout === 'lanes') groups = lanes(ordered, positions);
    else if (layout === 'radial') groups = radial(ordered, edges, positions, selectedId);
    else if (layout === 'grid') putGrid(positions, ordered, gridShape(ordered.length, 1.5));
    else groups = rooms(ordered, positions);
  }
  return { positions, groups, bounds: getBounds(positions, groups) };
}
