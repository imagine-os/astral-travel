# A memory you can recognize

Astral Travel v0.5.0 presents the same records as a world of objects, two branching graphs, visual cards, or a searchable list. Fresh preferences open **Objects 3D → Object bands**. Existing appearance and arrangement choices stay saved separately from workspace memory on this browser.

## Five views of the same knowledge

| View | What you see |
| --- | --- |
| **Objects 3D** | Seventeen recognizable object forms with saved-text previews, orbit controls, and draggable placement |
| **Skill tree** | Branching lanes, distinct node icons, and preview cards patterned on Graph Gallery’s Lanes Skill-tree |
| **Radial tree** | Connected branches around a central memory, patterned on Graph Gallery’s Radial Tree |
| **Cards** | Document-preview cards showing the same recorded relationships |
| **List** | Titles, excerpts, and small previews in a conventional list |

Skill tree and Radial tree are separate graph presentations. They draw supplied record links; the layout does not invent relationships to complete a tree. Disconnected records appear separately. The same search, raw/processed filter, selection, and inspector apply in every view.

## Five ways to arrange objects

| Arrangement | Behavior |
| --- | --- |
| **Object bands** | Separate clouds and portals, networks and services, databases, folders, sources, ideas, and characters into labeled depth bands |
| **Rooms** | Topic groups derived from existing tags; these are navigation groups, not new ontology facts |
| **Lanes** | Original sources on one side and processed interpretations on the other |
| **Radial** | The selected record at the center, direct neighbors on the inner ring, other visible records farther out |
| **Grid** | An even arrangement for scanning |

These controls arrange Objects 3D and Cards. The Radial object arrangement is distinct from the branching **Radial tree** view.

Changing a view, camera, or arrangement does not change a record, verify an interpretation, create a relationship, or rewrite a source. Search and the raw/processed filter remain active when selecting an already-visible memory. Following an inspector reference outside the current filter reveals that source by clearing the filter.

## Seventeen forms, visibly different

**Folders, networks, characters, databases, services, clouds, and portals** join document stacks, conversation bubbles, books, photo frames, video slates, audio cassettes, code terminals, research notebooks, experiment clipboards, and violet interpretation tablets.

The new native 3D forms have distinct volume: open tabbed folders, a friendly standing figure, a hub with connected satellites, stacked data cylinders, a server tower, clustered cloud spheres, and an open portal ring. Small plaques carry the actual saved-text preview. The inspector’s **Object form** selector changes a source’s appearance without rewriting the record. Interpretations keep their tablet form and review state.

A fresh example workspace contains **48 nodes: 38 original sources and 10 interpretations, with 68 recorded connections**. **Add examples** brings 30 additional nodes into a complete v0.4 example workspace. The operation fills missing examples without replacing memories, duplicating the collection, or resetting an existing review decision.

All public examples are fictional, text-only records. Characters describe people or roles; they are not running agents. Folders and networks describe collections and relationships; they do not provision storage or services. Audio, image, and video examples are transcripts, descriptions, and storyboards rather than uploaded or playable media.

## Arrange by hand

- Drag an object or its label to move it on the floor. Connected references follow it.
- Drag empty space to orbit. Right-drag pans; scroll/pinch zooms.
- Press Escape during a drag to cancel it. Click without dragging to inspect.
- Use the inspector’s four movement buttons for keyboard-accessible placement.
- **Undo** reverses the latest arrangement change; **Reset** restores the current automatic arrangement.

Each object arrangement has separate placements, saved on this device. Switching to Cards shows the same placement. Custom placement removes group boundary boxes because an object can now sit outside its original group. A hand-arranged radial view stays put as you inspect another object. Memory export includes the source workspace; appearance and placement preferences stay in this browser and are not included in that file. Undo history lasts for the current explorer session.

In Skill tree and Radial tree, drag the background to pan, scroll to zoom, and select a node to inspect it. Their branching layouts do not overwrite your object placements.

## Recognition before decoration

Each preview is drawn locally from the record’s saved title, text excerpt, type, and review status. The inspector shows the full saved text. Icons identify the presentation category without asserting an attachment exists.

PDF rendering, uploaded image previews, video posters, audio waveforms, custom thumbnails, and media proxy storage remain future work. Those previews should ultimately open the exact underlying file or time range.

## Navigation

**Fit** returns to an overview; **Focus** brings the selection closer. The memory picker and Cards/List controls provide a keyboard route to the same inspector. **Full view** expands the workspace across the browser window; Escape exits it without a fullscreen permission prompt.

All views page through **60 records** at a time. Search narrows the set before layout. Edges connect records visible on the current page; the inspector retains the full source trail. Three-dimensional selection highlights references without resetting the camera. Switching an object arrangement fits the new layout.

## Implementation and bounds

- `web/memory-model.mjs`: pure presentation metadata, deduplicated source edges, and deterministic object arrangements.
- `web/graph-layouts.mjs`: connected graph layout helpers, separate from stored evidence and object placements.
- `web/graph-styles.mjs` and `web/graph-styles.css`: Skill tree and Radial tree rendering, previews, pan/zoom controls, and themes.
- `web/explorer.mjs`: view controls, paged results, exact-text preview canvases, and inspector integration.
- `web/objects-3d.mjs`: local Three.js scene, volumetric objects, picking, cameras, themes, and graphics-resource disposal.
- `web/objects-css3d.mjs`: GPU-independent object presentation using the same camera and selection API.
- `web/spatial-state.mjs`: validated placement and form preferences kept outside the evidence schema.
- `lib/examples.mjs`: repeatable, additive fictional example collection.
- `web/vendor/three/`: pinned Three.js 0.186.0, OrbitControls, and CSS3DRenderer, distributed with their MIT license.

The browser loads these libraries from this site. Preview generation does not fetch source pages or send record content to a service. Preview work is bounded independently of source length. The 3D scene renders on interaction or a data change. If WebGL is unavailable, a labeled CSS 3D compatibility view preserves object recognition and navigation. Cards remains available if that also fails.

## Design references

The playground directly studies the graph styles Justin selected in [imagine-os/graph-gallery](https://github.com/imagine-os/graph-gallery):

- [Objects 3D](https://github.com/imagine-os/graph-gallery/tree/main/demos/three-objects-3d): physical object models, depth bands, preview plaques, and inspectable connections. Astral’s native models adapt the gallery’s primitive-model construction approach.
- [Lanes Skill-tree](https://github.com/imagine-os/graph-gallery/tree/main/demos/lanes-skilltree): branching lanes with recognizable nodes, now a separate Astral view.
- [Radial Tree](https://github.com/imagine-os/graph-gallery/tree/main/demos/radial-tree-d3): a clear center and connected branches, now a separate Astral view.
- [Object Cards](https://github.com/imagine-os/graph-gallery/tree/main/demos/g6-cards): previews, readable titles, and distinct record frames.

Astral connects these presentation patterns to its own records, provenance, inspector, and local placement controls. It does not import the gallery’s unrelated example data. Three.js is distributed under its own MIT license.
