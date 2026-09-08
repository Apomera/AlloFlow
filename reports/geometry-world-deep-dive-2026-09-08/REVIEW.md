**Geometry World: visuals, building, usability, and 3D Print Lab integration**

Review date: September 8, 2026. Scope: the current local Geometry World block-building tool, its builder enhancement, Print Lab, and the shared printable-model module. The separate Geometry Sandbox Stretch/Sculpt editors are outside this review.

Geometry World has a substantial educational building foundation and a working local Print Lab handoff. The highest-value next work is to make the model, selected creation, physical dimensions, and editing state consistent throughout that handoff. More rendering effects would contribute less than resolving those inconsistencies and reducing competing panels.

| Area | Assessment |
|---|---|
| World visuals | Recognizable, engaging block-world identity; useful shape and material differentiation. Small text and overlays weaken clarity. |
| Building | Functional keyboard and pointer paths, fractional blocks, quarter-turn rotation, measurements, and undo/redo. Preparing a particular creation remains dependent on camera aiming. |
| Desktop UI | Primary actions exist, but inventory, measurement, and builder panels compete for space and attention. |
| Phone UX | A confirmed panel collision can cover the collapse control. An expanded builder also covers the center of the world. |
| Print Lab handoff | Local STL transfer and editable block metadata work. Coordinate interpretation and revision continuity need correction. |
| Actual printing | This is a model-preparation and staff-review workflow. Slicing is external; available printer execution is a simulator. |

**Evidence and limitations**

The audit loads the actual local React tools, Three.js renderer, and printable-model implementation in a minimal browser host. It exercises the real production geometry/export code. It does not establish how the complete deployed application behaves, measure physical printer results, or test a hardware headset, screen reader, or touchscreen device. Phone findings use a 390 × 844 viewport; desktop captures use 1440 × 900. The round-trip fixture pins a known crosshair target to separate revision behavior from camera movement. A separate outbound browser run used the actual aiming and Send workflow.

No application source changes were made for this review. Audit scripts, measurements, screenshots, and an exported fixture are kept in this directory. Earlier audit attempts and their timeouts are retained; they are not counted as successful scenarios.

**1. Correct the shared coordinate convention — high priority, confirmed**

A 24-cube build with dimensions 2 wide × 3 deep × 4 high transfers at 5 mm per block. Print Lab's Design card says **10 × 15 × 20 mm**, explicitly labeling the order width × depth × height. Its Preflight report says **width 10, depth 20, height 15 mm** for the same bytes and scale.

Geometry World writes the current Y-up mesh coordinates directly into STL. Its Print Lab summary also treats Y as height. The shared STL reader interprets STL as Z-up and converts it into a Y-up scene. The disagreement therefore affects the displayed orientation, height/depth, fit calculations, and orientation advice. A cube does not expose it; an asymmetric model does.

Use one shared export boundary: preserve Y-up editable world coordinates, convert exported vertices and normals to the agreed slicer convention, and compute preview dimensions and fit from that same normalized mesh. Regressions should compare the Design card, Preflight, downloaded STL, and slicer interpretation of a 2 × 3 × 4 model. Test a non-square printer bed so swapped dimensions can change the fit result.

Sources: [Geometry World STL construction](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:376), [Print Lab source envelope](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_printlab.js:633), [STL axis conversion](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/printable_model_module.js:254), [browser measurements](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-deep-dive-2026-09-08/results.json).

**2. Treat revision as returning to a project — high priority**

The handoff preserves the selected blocks' shape, material label, and rotation. It does not carry the entire surrounding world. Returning invokes a blank sandbox load and reconstructs only those selected blocks, recentered above the floor. Other creations, their positions relative to the chosen creation, and editing history are not restored by this path.

The return announcement also says physical scale and AI disclosure travel with the model, but the return payload contains only the source model. Sending again sets the initial scale to the fixed 5 mm-per-block handoff default. Those semantics are unsuitable for an ordinary “Revise” action without clearer project preservation.

Keep a project snapshot before leaving Geometry World; identify the selected creation within it. Restore the same project and selection on revision, with a separate print context containing scale, material, printer profile, and disclosure. Geometry edits should invalidate preflight evidence while retaining those choices. Offer “Open as a new sandbox” as an explicit alternative.

Sources: [outbound handoff](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:556), [sandbox restoration](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:586), [Print Lab revision payload](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_printlab.js:1129). The dedicated round-trip script and results in this directory record the browser verification separately.

**3. Distinguish adjacent grid cells from physically joined shapes — high priority, confirmed**

The measurement flood-fill follows neighboring occupied cells. That is useful for block-world measurement, but does not prove that their solid surfaces touch.

| Fixture | World selection | Export inspection |
|---|---|---|
| One cube | 1 block | PASS; one closed component |
| Cube with a half slab on top | 2 blocks | PASS; one closed component |
| Cube beside a half slab | 2 blocks | WARN; one non-manifold edge |
| Half slab with a cube in the cell above | 2 blocks | WARN; two separate shells |

The last fixture leaves a half-block vertical gap, which is 2.5 mm at the default print scale. Calling it one connected creation creates the wrong expectation about the printed result.

Before transfer, analyze actual face contact and flag floating or separate pieces in the world. Distinguish “selected cells” from “joined printable pieces.” Highlight the affected blocks and provide a concrete action such as move down, add a support/base, or export separate parts.

Source: [cell-based measurement](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:4512).

**4. Complete the surface joining needed by the supported shapes — high priority, confirmed**

The existing exporter removes opposite coincident faces when neighboring shapes present the same polygon. This successfully handles a slab on a cube. It intentionally retains partially overlapping faces, such as the side of a half slab against a cube. The simple two-block fixture consequently triggers a non-manifold warning.

Print Lab's conservative repair cannot fix that class of problem: it welds nearby vertices and removes degenerate triangles, without doing a solid union. Students should not need an external mesh-editing detour for ordinary combinations of the shapes the builder supplies.

Add a deterministic solid-union path for cubes, slabs, diagonal halves, and quarter wedges, including partial face contacts and rotations. Preserve the editable block source separately. Check mixed-shape pairs, multi-block intersections, edge-only contacts, and genuinely disconnected pieces. Report a joining failure explicitly instead of presenting generic “repair” as the apparent solution.

Sources: [surface-joining implementation](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:281), [repair capabilities](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_printlab.js:1707).

**5. Give the phone one active work panel — high priority, confirmed**

At 390 × 844, the expanded Free Build dock measured 376 × 388 pixels and covered the center of the 3D viewport. After measurement, the measurement inspector appeared over it. In the initial run it intercepted attempts to press “Collapse Free Build Studio” for the full click timeout. This is an interaction obstruction, even though the page has no horizontal document overflow. Later captures varied as the measurement overlay changed; the initial screenshot and pointer-interception trace preserve the reproduction.

Use one shared panel controller for Build, Measure, and Print on phones. A bottom sheet should replace the previous sheet, keep its close/collapse control above its contents, and leave an unobstructed view of the model. Maintain visible movement/build controls outside that sheet. Show only a compact selected-build summary during normal building.

Evidence: [initial phone failure and hit testing](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-deep-dive-2026-09-08/initial-results.json), [phone capture](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-deep-dive-2026-09-08/04-phone-measured.png). Source: [builder overlay styles](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:668).

**6. Make selection persistent and visible — medium priority, code-confirmed**

“Measure aimed build” updates a displayed measurement, but “Send selected build” performs a new crosshair query. A student can measure creation A, look away or aim at B, and then send something different from the summary they were using. Aiming at empty space produces a prompt rather than using the displayed creation.

Add a persistent selection with an outline around the entire connected creation, a name, and a selected-block count. Send should use that selection. If edits change the selection's geometry, refresh the summary or explicitly require reselection. Keep “Use aimed build” as the selection action. A clickable build list would also help students who find first-person navigation difficult.

Source: [measurement and Send target resolution](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld_builder.js:531).

**7. Simplify the visual hierarchy without losing the world identity — medium priority**

Retain the block-world art direction, material differences, shaped-block previews, ghost placement, and undo feedback. These support the building task. The current desktop layout nevertheless allows the inventory and builder dock to overlap, and the phone adds the measurement inspector above both. Strong gradients, glowing borders, small uppercase labels, and many separate panels make secondary information compete with the model.

The builder CSS uses 8–11 px labels and body text in several places. Increase ordinary explanatory text to a comfortable reading size, use plain sentence case where possible, and reduce the number of facts shown simultaneously. Text size alone is not a WCAG failure finding; this is a readability and cognitive-load concern that should be validated with students, zoom, and assistive technology.

Provide a calm construction backdrop or grid option, a reliably framed selected model, and a clear separation between camera movement and editing. Make a small set of useful construction actions visible near selection: choose shape, rotate, place/remove, undo/redo, measure, and prepare print. Put optional inventories and learning explanations in disclosures. Evaluate precise placement, multi-block duplication, and base-building helpers against real student tasks before adding more toolbar buttons.

**8. Give incoming models a focused Print Lab landing state — medium priority, observed**

The imported model is correctly identified as “From Geometry World,” with a visible preview and scale presets. But the same page also presents an empty primitive recipe, AI modeling prompts, description starters, and local imports. “No primitive recipe yet” is technically accurate yet confusing beside an already loaded model. The main “Continue to Preflight” action is below the first desktop viewport in the captured layout.

For a connected-tool handoff, lead with the model, physical dimensions, selected printer, and one primary action: “Check this model.” Collapse alternative creation/import tools under “Start a different model.” Keep a concise revision link and editable backup available. Avoid implying that preview rotation applies a manufacturing orientation: store any true orientation change as model state used by fit, preflight, and export.

Evidence: [Print Lab landing capture](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-deep-dive-2026-09-08/06-print-design.png), [captured interface text](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-deep-dive-2026-09-08/results.json). Source: [preview controls](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_printlab.js:489).

**9. Unify the export routes and deliver one usable package — medium priority, code-confirmed**

Geometry World also has a “3D Print” button in its settings. It exports every non-grass block, rather than filtering to the selected student creation, and writes raw world coordinates. The selected-build handoff has a different scope and an explicit 5 mm-per-block scale; the subsequent Print Lab export bakes its chosen scale into geometry. Similar-sounding routes therefore have different inclusion and sizing semantics.

Route the primary print action through the shared preparation path. If an advanced whole-world export remains, label its scope and units explicitly and preview what it includes.

Print Lab's staff-review JSON does not embed the imported mesh, so the receiving workflow must pair the correct model file with its metadata and hash. Package the scaled STL, editable Geometry World source, and a readable/structured manifest in one download. The manifest should state units, dimensions, orientation, material, profile, preflight findings, and slicer-review status. Offer 3MF where interoperability has been tested; it can carry information that STL cannot, but importing a model file is still distinct from loading a slicer-specific project. [Prusa's explanation of 3MF](https://blog.prusa3d.com/3mf-file-format-and-why-its-great_30986/).

Sources: [alternate Geometry World export](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_geometryworld.js:8534), [staff-review package](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_printlab.js:1381), [scaled Print Lab export](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/stem_tool_printlab.js:1400).

**10. Describe the final printing step accurately and make it actionable**

The implementation supports local model inspection, printer-envelope planning, material information, external G-code comment metadata import, staff-review handoff preparation, and simulated printer jobs. It does not embed slicing or execute real printer jobs through the currently enabled adapters. “Send to Print Lab” successfully transfers a model into that preparation workflow; it does not produce a physical print on its own.

Use student-facing stages such as Build → Select → Size → Check → Prepare for school printing. After Check, give concrete actions tied to the actual finding: join these pieces, enlarge this feature, choose another orientation, or review supports in the school slicer. Put simulation and operational diagnostics in a staff-oriented area. Keep a clear distinction between fitting the printer's volume and being ready to print.

Source: [enabled slicer, geometry, and printer capabilities](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/printable_model_module.js:479).

**Recommended delivery order**

1. Unify coordinates and physical dimensions; preserve the project and print context across revision.
2. Fix mobile panel stacking and persistent selection.
3. Resolve ordinary mixed-block solid joining and show physical-contact problems directly in the world.
4. Streamline the incoming Print Lab page and unify the export package.
5. Refine typography, preview framing, and construction helpers through student task testing.

**Acceptance tasks**

- Build an asymmetric model, send it, and obtain identical width/depth/height in the world, Design, Preflight, and exported file.
- Keep two separate creations, print one, revise it, and return to the original two-creation workspace.
- Choose 10 mm per block, revise geometry, resend, and retain 10 mm while invalidating the old preflight result.
- Combine each supported fractional shape and rotation with cubes; distinguish joined surfaces, gaps, and edge-only contacts.
- Measure and close panels at phone width using taps, with all essential building controls reachable.
- Complete the select-to-export journey by keyboard, with a visible selected creation and understandable focus movement.
- Open the final package in the receiving school workflow and verify the model matches its manifest and physical scale.

These are practical completion criteria for a dependable classroom build-to-print workflow, rather than additional visual effects or a general claim of printer readiness.

**Verified round-trip and test results**

The completed browser round trip confirms loss of the surrounding creation and the scale reset. A 25-block workspace (a 24-cube creation plus a separate quarter wedge) returned with 24 blocks. The selected scale changed from 10 mm per block before revision to 5 mm after resending. The Design envelope changed from 20 × 30 × 40 mm to 10 × 15 × 20 mm. The final STL download succeeded. See [round-trip results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-deep-dive-2026-09-08/roundtrip-results.json).

The successful main browser run reached Design and Preflight without page errors. Its corrected keyboard probe used B to place a block and Ctrl+Z to undo: scene block totals were 626 → 627 → 626, including the sandbox floor. Five mesh fixtures exercised closed cubes, mixed contacts, gaps, and unequal dimensions. The successful dedicated round-trip run also had zero page errors and downloaded exported-geometry.stl.

The initial combined unit run was incomplete: 136 assertions passed, two failed, and 60 were pending, with a recorded setup-hook timeout. A longer-timeout rerun reported 192 assertions passed across six files and JSON success: true, but its command exited 1 and omitted the requested bridge file. The bridge was run separately and passed all 28 assertions with exit 0. This establishes 220 distinct passing assertions across those final results, **not a clean single seven-file suite run**. The combined-run process anomaly remains unexplained.

The reproduced browser and mesh defects remain valid despite those passing assertions. The existing tests do not establish agreement between Geometry World's size card and the shared STL reader, preservation of the full workspace and scale through revision, or unobstructed phone controls with both overlays open.

Evidence: [unit rerun JSON](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-deep-dive-2026-09-08/unit-results-retry.json), [main browser results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-deep-dive-2026-09-08/results.json), [round-trip results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-deep-dive-2026-09-08/roundtrip-results.json).
