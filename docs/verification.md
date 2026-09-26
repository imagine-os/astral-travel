# Release verification

September 26, 2026.

## v0.6.0 — Larger example worlds

**75 automated tests pass**, plus syntax checks and the static build. The new collections contain **48/96/144** records with **68/148/223** recorded connections. Tests check all 17 forms, connected graphs, source-backed proposed interpretations, exact counts, independent creation, and unchanged source content. Both tree views preserve every node and real edge across overview, source focus, and interpretation focus, with finite bounds and separated cards. Dense 3D radial arrangements remain inside placement bounds at 144/160 nodes.

Spatial-storage checks preserve the legacy personal arrangement, isolate example resets and forms, restore each collection after reload, and retain separate session state when browser storage is unavailable. Reading corrupt example preferences leaves the stored bytes and personal state intact. Native GPU and mobile-device visual verification remain outside the automated coverage.

Live desktop checks confirmed the direct 144-node link, all 144 records in the 3D, Skill Tree, Radial Tree, Cards, and List DOM, and all 17 object forms in compatibility 3D. Search showed 16 matches out of 144; switching collections cleared filters. A new note in Research survived reload at 97 records while My memories remained 48; resetting that example restored 96. Studio opened 48 records. Light/dark switching and full-view controls were checked. Larger compatibility-scene paint performance is being checked separately before the final release handoff.

## v0.5.0–v0.5.1 — A world of objects

The example upgrade preserves all original v0.4 source text, identities, tags, and review decisions. Fresh samples contain **48 records, 68 recorded relationships, and 17 object forms**. **59 tests pass**, covering additive upgrades, connectivity, presentation classification, object-band spacing, placement persistence, and graph layouts with cycles and disconnected nodes. The 48-node sample has no overlapping tree-view cards in the layout checks. Syntax checks and the static build pass.

Live desktop checks showed all 48 objects and all 17 forms in compatibility 3D. An actual pointer drag moved a character and its connection lines without changing the camera; Undo restored its position. Repeating Add examples kept the count at 48. Both tree views rendered 48 nodes and 68 edges, preserved the camera during selection, shared the inspector, supported search, and worked in both themes. Radial Focus rerooted the graph around the selected character. The oversized compatibility floor found during testing was bounded to visible records; the compatibility renderer also avoids repeated damping and decorative shadows in dense scenes. Its event-driven updates commit the DOM without waiting for animation frames, and use simple shaded round surfaces in place of expensive spherical CSS meshes. The native renderer retains its volumetric geometry.

[Objects · light](assets/objects-v05-light.jpg) · [Objects · dark](assets/objects-v05-dark.jpg) · [Skill Tree](assets/skilltree-v05-light.jpg) · [Radial Tree](assets/radial-v05-dark.jpg)

A native geometry harness built all seventeen forms and checked finite vertices, floor clearance, model dimensions, and world-independent bounds. Native GPU visual verification still requires a hardware-accelerated browser. Public examples remain fictional text records; no live service, attachment playback, or agent capability is implied by their shapes.

## v0.4.0 — Object forms and manual placement

**49 tests pass**, including example idempotence, unchanged original records and reviews, presentation classification, immutable placement helpers, layout isolation, invalid preference handling, and bounded saved state. Syntax checks, static build, and GitHub Pages deployment pass.

The live desktop compatibility 3D view showed all ten object forms and 18 sample records, with decoded saved-text previews. Adding examples a second time left the count unchanged. An actual pointer drag moved an audio object while the camera transform stayed unchanged. Connected reference geometry changed with movement. Undo restored the original coordinates; the keyboard movement controls, per-arrangement isolation, Reset, and undoing Reset also worked. A customized form and moved position survived page reload. Background orbit continued to work after dragging objects.

[Light object collection](assets/objects-v04-light.jpg) · [Dark object collection](assets/objects-v04-dark.jpg)

The browser has WebGL disabled, so pointer and visual checks exercised the compatibility renderer. The native renderer has the same movement contract and passes syntax checks; GPU visual and pointer verification, touch-device testing, and active-drag Escape cancellation still need dedicated hardware/input checks. Placement is a browser preference, separate from memory export; no media attachment or playback capability is implied by the new forms.

## v0.3.0–v0.3.2 — Recognizable memory objects

All **37 tests** pass. The added presentation tests cover finite and deterministic layouts for 1, 8, and 30 records, source-edge deduplication, radial neighbor order, evidence lanes, bounded topic grouping, and unchanged record identities. Syntax checks and the static build pass.

Live desktop checks on GitHub Pages exercised actual saved-text previews, object selection and the full source inspector, all four arrangements, Cards and List, filter/search preservation, drag-to-orbit, camera controls, light/dark switching, saved view/layout preferences, and expanded-workspace exit and focus restoration. The test browser disables WebGL; this directly exercised the automatic compatibility 3D renderer. The native GPU renderer is implemented and syntax-checked, but a hardware-accelerated visual check remains outstanding.

[Objects in light mode](assets/objects-light.jpg) · [Objects in dark mode](assets/objects-dark.jpg) · [Card arrangement](assets/cards-light.jpg)

Desktop layout was inspected live. Narrow layouts were reviewed in code; mobile-device and assistive-technology checks remain outstanding. No model, research-automation, attachment, or large-storage capabilities were added in this release.

## v0.2.0 — Visual storytelling and appearance

The public deployment for commit `2601942` passed GitHub Actions. All 19 existing tests, syntax checks, and the static build pass.

Live desktop browser checks confirmed a white/light default, dark switching, and saved dark and light preferences after reload. Both graph palettes render correctly. Search, story-to-workspace navigation, capture and help dialogs, research and scenario panes, and the v0.2.0 Version History entry were checked. All six story images load; their transparent backgrounds were visually inspected on both appearances. The README's six illustrated cards were also inspected on the live GitHub page.

[Light homepage](assets/homepage-light.jpg) · [Numbered visual guide](assets/story-light.jpg)

A static responsive review tightened the narrow header, search flex sizing, and small-screen caption sizes. Live browser inspection for this release was at a desktop viewport; dedicated mobile-device and assistive-technology checks remain outstanding. The visual release adds no new model or research automation capabilities.

## Foundation release — v0.1.0

## Automated checks

`npm test`: **19 passing tests** across core, CLI, MCP, and local server. Checks exercise original-text preservation, source provenance, human-review metadata, inferred dream acceptance, rejection, scenario isolation, Unicode search, research due dates, untrusted imports, round-trip snapshots, atomic writes, competing writers, actual MCP process lifecycle, and public/private path isolation.

`npm run check` and `npm run build` pass. The GitHub Pages Actions build also passed for the first published release.

## Live browser checks

The published site was opened in the browser. Verified the homepage artwork loaded, the playground initialized, a dream cycle proposed six reviewable connections, acceptance retained inferred status, a grounded scenario remained a clearly labeled worksheet, and a newly captured source was searchable and survived a reload. Research due dates and the Version History dialog displayed correctly. The sample was reset after checks.

[Homepage capture](assets/homepage.jpg) · [Working explorer capture](assets/playground.jpg)

Responsive breakpoints are implemented for phone, tablet, and desktop. The recorded visual/browser verification was performed at desktop size; a dedicated mobile-device and assistive-technology matrix remains to be completed. MCP tests exercise the protocol through actual processes; they do not prove every client's UI configuration.

## Product limits

This release uses deterministic lexical connections and scenario templates, not a language model or predictive simulation. Live web research, a scheduler, outcome-driven optimization, remote authentication, rich ontology editing, and terabyte storage are not implemented. These are tracked with acceptance criteria in [the roadmap](roadmap.md).
