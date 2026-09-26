/** Pure layouts for the graph-gallery-inspired views. A visual tree chooses a
 * spanning set from existing relationships; it never creates knowledge links. */
const order = (a, b) => String(a.title || a.id).localeCompare(String(b.title || b.id)) || String(a.id).localeCompare(String(b.id));
const keyOf = edge => JSON.stringify([edge.from, edge.to, edge.type || 'related']);

export function graphForest(nodes, edges, selectedId) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const adjacency = new Map(nodes.map(node => [node.id, []]));
  const validEdges = [];
  const seen = new Set();
  for (const edge of edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to) || edge.from === edge.to || seen.has(keyOf(edge))) continue;
    seen.add(keyOf(edge)); validEdges.push({ ...edge });
    adjacency.get(edge.from).push({ id: edge.to, edge });
    adjacency.get(edge.to).push({ id: edge.from, edge });
  }
  for (const list of adjacency.values()) list.sort((a, b) => order(byId.get(a.id), byId.get(b.id)));
  const candidates = [...nodes].sort((a, b) =>
    Number(b.id === selectedId) - Number(a.id === selectedId) ||
    Number(b.objectType === 'network') - Number(a.objectType === 'network') ||
    adjacency.get(b.id).length - adjacency.get(a.id).length || order(a, b));
  const visited = new Set(), components = [], treeEdgeKeys = new Set();
  for (const seed of candidates) {
    if (visited.has(seed.id)) continue;
    const root = { id: seed.id, depth: 0, parent: null, children: [], node: seed };
    const members = [root], queue = [root]; visited.add(seed.id);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const parent = queue[cursor];
      for (const neighbor of adjacency.get(parent.id)) {
        if (visited.has(neighbor.id)) continue;
        visited.add(neighbor.id); treeEdgeKeys.add(keyOf(neighbor.edge));
        const child = { id: neighbor.id, depth: parent.depth + 1, parent: parent.id, children: [], node: byId.get(neighbor.id) };
        parent.children.push(child); members.push(child); queue.push(child);
      }
    }
    components.push({ root, members });
  }
  return { components, edges: validEdges.map(edge => ({ ...edge, tree: treeEdgeKeys.has(keyOf(edge)) })) };
}

function boundsFor(positions, groups = []) {
  const values = [...positions.values()];
  if (!values.length) return { x: 0, y: 0, width: 480, height: 320 };
  const minX = Math.min(...values.map(p => p.x - 90), ...groups.map(g => g.x));
  const maxX = Math.max(...values.map(p => p.x + 90), ...groups.map(g => g.x + g.width));
  const minY = Math.min(...values.map(p => p.y - 60), ...groups.map(g => g.y));
  const maxY = Math.max(...values.map(p => p.y + 60), ...groups.map(g => g.y + g.height));
  return { x: minX - 22, y: minY - 22, width: maxX - minX + 44, height: maxY - minY + 44 };
}

/** Root → branch → leaf swimlanes. Terminal siblings pack into short rows,
 * like the reference's compact skills, while every visible wire stays real. */
export function skillTreeLayout(nodes, edges, selectedId) {
  const forest = graphForest(nodes, edges, selectedId);
  const positions = new Map(), groups = [], roots = new Set();
  let cursor = 36;
  for (const component of forest.components.filter(c => c.members.length > 1)) {
    const { root } = component; roots.add(root.id);
    const componentTop = cursor;
    const place = (entry, top) => {
      const x = 110 + entry.depth * 218;
      if (!entry.children.length) { positions.set(entry.id, { x, y: top + 34, depth: entry.depth, root: root.id }); return 68; }
      if (entry.children.length >= 3 && entry.children.every(child => !child.children.length)) {
        const columns = Math.min(3, Math.ceil(Math.sqrt(entry.children.length)));
        const rows = Math.ceil(entry.children.length / columns);
        entry.children.forEach((child, i) => positions.set(child.id, {
          x: x + 218 + (i % columns) * 168, y: top + 34 + Math.floor(i / columns) * 68, depth: child.depth, root: root.id,
        }));
        const height = rows * 68;
        positions.set(entry.id, { x, y: top + height / 2, depth: entry.depth, root: root.id }); return height;
      }
      let offset = top;
      for (const child of entry.children) offset += place(child, offset);
      const height = Math.max(68, offset - top);
      positions.set(entry.id, { x, y: top + height / 2, depth: entry.depth, root: root.id }); return height;
    };
    for (const branch of root.children) {
      const height = Math.max(106, place(branch, cursor + 32) + 48);
      groups.push({ kind: 'lane', label: branch.node.title, color: branch.node.color || '#9070d0', x: 208, y: cursor, width: 0, height });
      cursor += height + 10;
    }
    positions.set(root.id, { x: 90, y: (componentTop + cursor - 10) / 2, depth: 0, root: root.id });
    cursor += 42;
  }
  const connectedWidth = Math.max(850, ...[...positions.values()].map(p => p.x + 100));
  for (const group of groups) group.width = connectedWidth - group.x;
  const singles = forest.components.filter(c => c.members.length === 1);
  if (singles.length) {
    const columns = Math.max(2, Math.floor((connectedWidth - 60) / 170));
    const height = Math.ceil(singles.length / columns) * 74 + 54;
    groups.push({ kind: 'islands', label: 'Unconnected memories · no relationships recorded', x: 10, y: cursor, width: connectedWidth - 10, height, color: '#8a8797' });
    singles.forEach((c, i) => positions.set(c.root.id, { x: 100 + i % columns * 170, y: cursor + 70 + Math.floor(i / columns) * 74, depth: 1, root: c.root.id }));
  }
  return { positions, groups, sectors: [], rings: [], roots, edges: forest.edges, bounds: boundsFor(positions, groups) };
}

/** Radial spanning forest. Ring depth is visual distance through existing
 * links, not semantic hierarchy. Crosslinks remain visible and distinguishable. */
export function radialTreeLayout(nodes, edges, selectedId) {
  const forest = graphForest(nodes, edges, selectedId);
  const positions = new Map(), groups = [], sectors = [], rings = [], roots = new Set();
  const connected = forest.components.filter(c => c.members.length > 1);
  let rowTop = 30, rowHeight = 0, columnX = 30;
  const totalWidth = 1700;
  for (let ci = 0; ci < connected.length; ci++) {
    const component = connected[ci], { root } = component; roots.add(root.id);
    const depths = new Map();
    for (const entry of component.members) depths.set(entry.depth, (depths.get(entry.depth) || 0) + 1);
    const maxDepth = Math.max(...depths.keys());
    const step = Math.max(164, ...[...depths].filter(([d]) => d > 0).map(([d, count]) => count * 150 / (Math.PI * 2 * d)));
    const radius = maxDepth * step;
    const size = radius * 2 + 240;
    if (ci > 0 && columnX + size > totalWidth) { rowTop += rowHeight + 65; rowHeight = 0; columnX = 30; }
    const cx = columnX + size / 2, cy = rowTop + size / 2;
    positions.set(root.id, { x: cx, y: cy, depth: 0, root: root.id });
    const weight = entry => entry.weight = entry.children.length ? entry.children.reduce((sum, child) => sum + weight(child), 0) : 1;
    weight(root);
    const assign = (entry, start, end) => {
      const angle = (start + end) / 2;
      positions.set(entry.id, { x: cx + Math.cos(angle) * entry.depth * step, y: cy + Math.sin(angle) * entry.depth * step, depth: entry.depth, angle, root: root.id });
      let cursor = start;
      for (const child of entry.children) { const next = cursor + (end - start) * child.weight / entry.weight; assign(child, cursor, next); cursor = next; }
    };
    const gap = root.children.length > 1 ? Math.min(.15, .7 / root.children.length) : 0;
    const available = Math.PI * 2 - gap * root.children.length;
    let angle = -Math.PI / 2;
    for (const branch of root.children) {
      const span = available * branch.weight / root.weight;
      assign(branch, angle + gap / 2, angle + span + gap / 2);
      sectors.push({ cx, cy, inner: step * .52, radius: radius + 72, start: angle, end: angle + span, color: branch.node.color || '#9070d0', label: branch.node.title });
      angle += span + gap;
    }
    for (let depth = 1; depth <= maxDepth; depth++) rings.push({ cx, cy, radius: depth * step });
    groups.push({ kind: 'cluster', label: ci === 0 ? 'Connected memories' : 'Separate connected group', x: columnX, y: rowTop, width: size, height: size, color: '#9070d0' });
    columnX += size + 50; rowHeight = Math.max(rowHeight, size);
  }
  const singles = forest.components.filter(c => c.members.length === 1);
  if (singles.length) {
    const width = Math.max(780, Math.min(1600, connected.length ? Math.max(...groups.map(g => g.x + g.width)) : 1000));
    const top = connected.length ? rowTop + rowHeight + 45 : 30;
    const columns = Math.max(3, Math.floor((width - 60) / 170));
    const height = Math.ceil(singles.length / columns) * 82 + 68;
    groups.push({ kind: 'islands', label: 'Unconnected memories · no relationships recorded', x: 30, y: top, width, height, color: '#8a8797' });
    singles.forEach((c, i) => positions.set(c.root.id, { x: 125 + i % columns * 170, y: top + 82 + Math.floor(i / columns) * 82, depth: 1, root: c.root.id }));
  }
  // Small label collision pass preserves radial neighborhoods without forcing
  // unusually sparse rings just because one branch has many descendants.
  const placed = [...positions.entries()];
  for (let pass = 0; pass < 48; pass++) {
    let moved = false;
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
      const [idA, a] = placed[i], [idB, b] = placed[j];
      if (a.root !== b.root) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const gapX = 148 - Math.abs(dx), gapY = 62 - Math.abs(dy);
      if (gapX <= 0 || gapY <= 0) continue;
      const fixedA = roots.has(idA), fixedB = roots.has(idB);
      if (fixedA && fixedB) continue;
      const shareA = fixedA ? 0 : fixedB ? 1 : .5;
      const shareB = fixedB ? 0 : fixedA ? 1 : .5;
      if (gapX < gapY) {
        const shift = (gapX + .1) * (dx < 0 ? -1 : 1);
        a.x -= shift * shareA; b.x += shift * shareB;
      } else {
        const shift = (gapY + .1) * (dy < 0 ? -1 : 1);
        a.y -= shift * shareA; b.y += shift * shareB;
      }
      moved = true;
    }
    if (!moved) break;
  }
  return { positions, groups, sectors, rings, roots, edges: forest.edges, bounds: boundsFor(positions, groups) };
}
