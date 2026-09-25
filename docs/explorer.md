# A memory you can recognize

Astral Travel v0.4.0 gives the same source records and interpretations several presentations. Your first view is Objects 3D; Cards and List offer direct, keyboard-accessible alternatives. The appearance and arrangement are saved separately from workspace memory on this browser.

## Views and arrangements

| Control | Behavior |
| --- | --- |
| Objects 3D | Distinct source objects and violet interpretation tablets, with actual text previews and selectable labels |
| Cards | Document-preview cards with the same recorded source relationships |
| List | Titles, excerpts, and small previews in a conventional list |
| Rooms | Topic groups derived from the existing tags; these are navigation groups, not new ontology facts |
| Lanes | Original sources on one side and processed interpretations on the other |
| Radial | The selected record at the center, direct neighbors on the inner ring, other visible records farther out |
| Grid | An even arrangement for scanning |

Changing a view, camera, or arrangement does not change a record, verify an interpretation, create a relationship, or rewrite a source. Search and the raw/processed filter remain active when selecting an already-visible memory. Following an inspector reference outside the current filter reveals that source by clearing the filter.

## Give each memory a recognizable form

Sources can appear as document stacks, conversation bubbles, books, photo frames, video slates, audio cassettes, code terminals, research notebooks, or experiment clipboards. Interpretations retain a violet tablet and their review state. The inspector's **Object form** selector changes a source's appearance without rewriting the record.

**Add examples** adds eight fictional source records and two source-backed proposals to the current workspace. Repeated clicks do not duplicate the collection or erase a later review. New browser sample workspaces include these examples. Audio, image, and video examples are saved transcripts, descriptions, and storyboards; they are not uploaded or playable media.

## Arrange by hand

- Drag an object or its label to move it on the floor. Connected references follow it.
- Drag empty space to orbit. Right-drag pans; scroll/pinch zooms.
- Press Escape during a drag to cancel it. Click without dragging to inspect.
- Use the inspector's four movement buttons for keyboard-accessible placement.
- **Undo** reverses the latest arrangement change; **Reset** restores the current automatic arrangement.

Each arrangement has separate placements, saved on this device. Switching to Cards shows the same placement. Custom placement removes topic boundary boxes because an object can now sit outside its original group. A hand-arranged radial view stays put as you inspect another object. Memory export includes the source workspace; appearance and placement preferences stay in this browser and are not included in that file. Undo history lasts for the current explorer session.

## Recognition before decoration

Each preview is drawn locally from the record's saved title, text excerpt, type, and review status. The inspector shows the full saved text. A small icon identifies a note's presentation category, such as a conversation, experiment, research note, or media-related note. It does not assert that a real audio/image/video attachment exists.

The current model contains text records. PDF rendering, uploaded image previews, video posters, audio waveforms, custom thumbnails, and media proxy storage remain future work. Those previews should ultimately open the exact underlying file or time range.

## Navigation

Drag empty space in the 3D stage to orbit, right-drag to pan, and scroll or pinch to zoom. Fit returns to an overview; Focus brings the selection closer. The native memory picker and Cards/List controls provide a keyboard route to the same inspector. Full view expands the workspace across the browser window; Escape exits it. It does not require a fullscreen permission prompt.

All views page through 30 records at a time. Search narrows the set before layout. Edges connect records visible on the current page; the inspector retains the full source trail. Three-dimensional selection highlights references without resetting the camera. Switching arrangement fits the new layout.

## Implementation and bounds

- `web/memory-model.mjs`: pure presentation metadata, deduplicated source edges, and deterministic layouts.
- `web/explorer.mjs`: accessible view controls, paged result sets, exact-text preview canvases, and inspector integration.
- `web/objects-3d.mjs`: local Three.js scene, object picking, cameras, themes, and graphics-resource disposal.
- `web/spatial-state.mjs`: bounded, validated placement and form preferences kept outside the evidence schema.
- `lib/examples.mjs`: repeatable, additive fictional example collection.
- `web/objects-css3d.mjs`: GPU-independent object presentation using the same camera and selection API.
- `web/vendor/three/`: pinned Three.js 0.186.0, OrbitControls, and CSS3DRenderer, distributed with their MIT license.

The browser loads these libraries from this site. Preview generation does not fetch source pages or send record content to a service. Preview work is bounded independently of source length. Rendering is requested on interaction or a data change, rather than running an idle scene forever. If WebGL is unavailable, a labeled compatibility view uses Three camera transforms over CSS 3D document objects. If that also fails, Cards remains available.

## Design references

Justin's favorites in [imagine-os/graph-gallery](https://github.com/imagine-os/graph-gallery) informed the interaction direction:

- [Objects 3D](https://github.com/imagine-os/graph-gallery/tree/main/demos/three-objects-3d): recognizable physical objects, actual document previews, and inspectable connections.
- [Lanes Skill-tree](https://github.com/imagine-os/graph-gallery/tree/main/demos/lanes-skilltree): spatial separation with readable group labels.
- [Radial Tree](https://github.com/imagine-os/graph-gallery/tree/main/demos/radial-tree-d3): a clear center and surrounding branches.
- [Object Cards](https://github.com/imagine-os/graph-gallery/tree/main/demos/g6-cards): previews, readable titles, and distinct record frames.

The Astral scene and layouts are original implementations. Gallery application code and its unrelated example data were not copied. The rendering dependency is separately licensed Three.js.
