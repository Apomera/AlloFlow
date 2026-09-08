# Spatial guide and 2D/3D recommendation

Date: 2026-09-08

## Recommendation

Keep the 2D workspace as the default for dissection procedures and evidence collection. Add an optional 3D anatomy viewer as a later, focused pilot for spatial relationships.

The immediate value of 3D would be rotation, seeing what lies behind a structure, and exploring a validated cut plane. Full cutting and deformable-tissue simulation would be a separate engineering and anatomical-validation project.

| Learning task | Recommended approach |
| --- | --- |
| Precise cutting paths, preparation sequence, tool feedback, notes, quizzes | Existing 2D workspace |
| Understanding front/back, depth, adjacent structures, and orientation | Optional 3D study companion with linked 2D labels |
| Tissue deformation and realistic cutting | Later simulation project, after the model and interactions are validated |

This is a design recommendation for this application, not a claim that either display format always teaches better. A randomized study of glasses-free 3D anatomy materials found no significant overall performance difference between 2D and 3D groups. Another study examines how spatial ability and 3D model presentation affect anatomy learning. These studies involve medical education; the proposed feature should be evaluated with this tool's intended learners.

Sources:
- [Evaluation of glasses-free 3D anatomy learning materials through a randomized control study](https://pubmed.ncbi.nlm.nih.gov/40452128/)
- [Spatial ability and 3D model colour-coding affect anatomy performance](https://pubmed.ncbi.nlm.nih.gov/37188811/)
- [W3C: complex images and equivalent textual descriptions](https://www.w3.org/WAI/tutorials/images/complex/)

## Repository findings

- The dissection tool uses a 2D canvas with depth shading, procedural tissue feedback, view-specific landmark offsets, and curated visibility rules. These cues are not a measured 3D specimen model.
- A separate human anatomy tool already uses Three.js, optional GLTF loading, and a 2D fallback. That loading and recovery approach could inform a dissection pilot.
- The inspected anatomy assets include human heart and kidney GLB files and a brain atlas. No matching 3D assets for the seven dissection specimen types were found in the asset scan.
- Human reference meshes should retain their human identity; they would not establish the anatomy of a fetal pig or sheep.

## Implemented in this pass

- A collapsible **View & orientation** guide beside the specimen, with four direct view choices and a text-and-border selected state.
- Explicit 2D model scope and plain-language descriptions of dorsal, ventral, lateral, and internal presets.
- Specimen-specific axis diagrams with matching text descriptions and shape markers; horizontal ventral mirroring is described correctly.
- Isolated eye and heart presets explicitly distinguish an illustration view from rotation of a scanned organ.
- A direct return to the recommended preparation view.
- Clear explanation that changing viewpoint retains the layer and does not cut tissue, complete preparation, unlock layers, or award evidence.
- The sequence overlay now reads **Layer map** instead of **Layer cross-section**. Its state key remains compatible with existing saved records.
- The guide is absent during quizzes and timed practicals.
- Native keyboard controls, responsive layouts, and no added 3D runtime dependency.

## Proposed 3D pilot

Start with one compact specimen, such as the sheep eye, once an appropriately licensed and anatomically reviewed model is available.

1. Keep the existing structure IDs as the shared identity for labels and references. Give each mesh component explicit species, source, license, and review metadata.
2. Offer an optional study viewer with fixed anterior/posterior/side presets, reset framing, selective transparency, and a reviewed section view. Keep free rotation secondary to the presets.
3. Link selection to reference information. Viewing a mesh alone must not award dissection observation or assessment credit.
4. Reuse the existing lazy-loading approach. Handle WebGL failure and context loss, stop drawing while hidden, dispose resources, and preserve the 2D workflow on phones and devices without a working renderer.
5. Provide equivalent structure descriptions and keyboard view controls. Test orientation tasks with intended learners before expanding to additional specimens.
6. Evaluate 3D value through spatial identification and explanation tasks, plus keyboard/touch usability and device performance. Treat realistic cutting as a later project.

No 3D specimen simulator was introduced in this pass.

## Visual artifacts

- [Desktop spatial guide](spatial-guide-desktop.png)
- [Phone spatial guide](spatial-guide-mobile.png)



## Verification

- 269 unique unit checks passed across the runs, including all 70 focused reference/discovery/recall/spatial checks.
- The initial four-suite run had 268 passes and two failures: the previously identified shared-module parity mismatch and a five-second timeout in an existing stomach comparison render.
- The focused suite then passed 70/70 in isolation with a 15-second per-test allowance (4.03 seconds total). No application correction was required for the timing failure.
- The shared-module mismatch remains outside this change. Neither shared module was modified.
- Both new Chromium scenarios passed with no retries: keyboard view selection preserves layer locks/evidence, and the phone guide has equivalent mirrored text with no horizontal overflow.
- Axe found zero WCAG A/AA violations within the phone guide. This is scoped automated coverage.
- Visually inspected the phone screenshot.
- JavaScript syntax, scoped whitespace checks, and dissection bundle byte parity passed.

Logs: [initial unit run](spatial-unit.log), [focused rerun](spatial-focused.log), [browser checks](spatial-browser.log).


## Follow-up implementation

An optional authored 3D eye schematic has since been implemented as a concept pilot. It does not use a validated specimen scan. See [EYE_3D_PILOT.md](EYE_3D_PILOT.md) for current capabilities and limitations.
