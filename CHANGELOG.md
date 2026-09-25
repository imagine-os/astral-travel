# Release history

The history of saved project releases. Features listed under a release describe that version; planned work belongs in the roadmap.

## 0.3.1 — 2026-09-25

- Automatically use DOM-backed 3D objects if WebGL cannot start; preserve previews, layout choices, camera controls, themes, and selection.
- Expand the workspace across the browser window without requiring native fullscreen support. Restore focus on exit and keep keyboard navigation inside the expanded workspace.

## 0.3.0 — 2026-09-25

- Open memory in a real 3D object view: original notes are physical page stacks; processed interpretations are violet tablets.
- Paint each object with a preview of its actual saved title and text. Cards, lists, and the source inspector use the same previews.
- Add independent Objects 3D / Cards / List presentations and Rooms / Lanes / Radial / Grid arrangements, with saved preferences.
- Add orbit, pan, zoom, focus, fit, a keyboard-accessible memory picker, and a full-view control where the browser supports fullscreen.
- Preserve the current search, layer filter, and selected record when changing arrangements or selecting a visible memory.
- Show recorded source relationships and page larger result sets in groups of 30.
- Keep geometry and coordinates separate from memory, provenance, and review state.
- Bundle Three.js locally with its MIT license; the core engine remains dependency-free. Provide a card fallback when 3D graphics are unavailable.
- Add layout/relationship tests covering identity, immutability, spacing, and source-edge deduplication.

## 0.2.0 — 2026-09-25

- Make light the default appearance and add a persistent, accessible light/dark switch across the complete website and playground.
- Add a white-background observatory hero, preserving the original dark artwork for dark mode.
- Explain capture, organization, dreaming, research, imagination, and future improvement in six original transparent illustrations.
- Give the website a numbered visual journey with examples and links into the working playground.
- Rebuild the README introduction around the same illustrations and a theme-aware banner.
- Keep future capabilities explicitly labeled: research uses review reminders, scenarios use worksheets, and outcome-driven improvement is planned.
- Adapt graph edges, node colors, labels, controls, forms, and dialogs to both appearances.

## 0.1.1 — 2026-09-25

- Version static asset URLs so browser caches keep the interface and Version History on the same release.
- Rank pending dream suggestions by shared evidence signals so stronger connections appear first.
- Preserve engine errors instead of overwriting them with an unrelated dream-success message.
- Add actual homepage and explorer screenshots, release verification notes, and a second visible Version History entry.

## 0.1.0 — 2026-09-25

First public alpha: the Astral Travel concept, a working browser lab, a local JavaScript memory engine, and a local MCP server.

### Added

- A visual project homepage and an interactive Lucid Lab.
- A distinction between original sources and processed knowledge, with provenance.
- Local lexical search and deterministic tag/keyword connection suggestions.
- A research reminder queue and separate grounded/speculative scenario templates.
- Browser persistence and workspace import/export.
- A local, file-backed CLI and sample data for a first walkthrough.
- A local stdio MCP server with five tools: search, add, dream, review, and scenario. MCP search excludes scenarios by default.
- A repository front door, contribution guide, issue templates, security policy, and MIT license.

### Release boundary

Model integration, autonomous research, remote MCP hosting, shared hosted storage, media understanding, and large-scale object storage are not included in this release. The browser lab has separate persistence; the CLI and local MCP server share a file-backed workspace.

This version establishes the data and review foundations for those later capabilities.
