# Geometry World build-to-print audit

The audit found three concrete builder-flow inconsistencies. All three are corrected in the canonical builder and desktop mirror. Print Lab draft retention remains a documented recommendation; its source was not changed in this work.

## Confirmed and corrected

1. **Standalone STL download omitted the physical scale.** A one-cube DOM reproduction displayed **5 × 5 × 5 mm** but downloaded STL coordinate extents of **1 × 1 × 1** when Print Lab navigation was unavailable. The fallback now applies the retained/default millimeters per block to a copy of the vertex coordinates, keeps normals and the editable handoff unchanged, writes a millimeter header and filename, and tells the user to import at 100% scale. Source: [builder export](../../stem_lab/stem_tool_geometryworld_builder.js#L992), [millimeter conversion](../../stem_lab/stem_tool_geometryworld_builder.js#L1026).

2. **Deleting the last selected block left a stale inspector and actions.** After the normal 250 ms refresh, the reproduction had no retained selection but still showed Selected 1, Showcase, Explore measurements, and an incorrect ground/lesson warning. Invalidation now dismisses only a measurement whose block keys match the vanished selection. Measurements of other authored geometry or the ground stay visible. Partial removal and shape edits still update the selected creation's own inspector. Source: [selection result tracking](../../stem_lab/stem_tool_geometryworld_builder.js#L1195).

3. **Dock measurements could disagree with the model sent to Showcase/Print Lab.** Measuring the ground preserves the selected authored creation in the core, but the dock previously prioritized the inspector's ground result while Send/Showcase used the retained creation. The dock now prioritizes the same retained creation for count, envelope and caption; the core inspector remains independent. Ordinary M-key measurement of a different student build still changes retention to that build, as defined by the core. Source: [dock summary](../../stem_lab/stem_tool_geometryworld_builder.js#L1263), [handoff selection](../../stem_lab/stem_tool_geometryworld_builder.js#L992).

## Prioritized next step: retain the Print Lab draft across ordinary navigation

**P2 — Print Lab's loaded handoff is tied to the mounted component.** The pending payload is consumed on mount, while STL bytes and editable source exist only in React state. Ordinary navigation away and back initializes a recipe view without those bytes/source, even though title and scale defaults were persisted. The source card explicitly discloses that its editable recipe is held only in the open session.

An actionable next step is an in-memory, browser-session draft keyed by handoff/project ID, with clear Resume and Discard behavior. This can preserve a student's work across tool navigation without automatically writing large model files to persistent storage. The existing explicit **Revise in Geometry World** path already carries the source and matching project ID back for full workspace restoration.

Evidence: [format initialization](../../stem_lab/stem_tool_printlab.js#L921), [component-local bytes](../../stem_lab/stem_tool_printlab.js#L932), [component-local source](../../stem_lab/stem_tool_printlab.js#L945), [payload consumption/persistence policy](../../stem_lab/stem_tool_printlab.js#L989), [disclosure](../../stem_lab/stem_tool_printlab.js#L1543), [explicit return](../../stem_lab/stem_tool_printlab.js#L1153), [full project restoration](../../stem_lab/stem_tool_geometryworld_builder.js#L652).

## Verification and scope

- **14 focused cases passed** with a 30-second per-test timeout: retained-selection lifecycle (10), default/custom physical STL scale (2), and actual-geometry dock/export consistency (2).
- The scale tests inspect every exported coordinate and normal, and verify the pending handoff bytes, editable source and undo/redo history stay unchanged.
- The selection tests cover an open inspector, last-block deletion, partial removal, changed fractional shape, unrelated student/ground results, closed-inspector polling, and explicit selection changes.
- No browser was launched for this audit. Reproductions use a local DOM and the actual production builder/Three.js geometry. Current camera, focus and export guarantees from the prior actual WebGL pass were reviewed; this audit did not find an additional confirmed framing or keyboard defect.
- Canonical and desktop builder files are byte-identical. SHA256: `e29fe2cd80899a24aa939ae58d1d3d24c8d12266bc93919da32e5746d4137926`.

Evidence: [before-fix reproductions](flow-gap-results.json), [reproduction script](reproduce-flow-gaps.cjs), [final tests](builder-flow-fix-tests.json).
