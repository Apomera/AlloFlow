# Optional 3D eye study pilot

Date: 2026-09-08

## Result and entry point

Open **Sheep Eye → Study tools → 3D eye study**.

The dissection lab now includes a real WebGL reference viewer for six major eye structures. It is an authored schematic companion to the sheep-eye activity. It is not a scanned specimen, a validated anatomical reconstruction, a ray-tracing model, or a tissue-cutting simulator.

The 2D dissection remains the default workspace. No model download, new package dependency, or shared-module edit was required.

## Learner experience

- Rotatable 3D geometry with Overview, Anterior, Side, and Posterior presets.
- Whole-shell and opened-shell modes. The opened mode hides the upper scleral and retinal surfaces while leaving the cornea, iris, lens, and nerve whole.
- Six structure references: cornea, sclera, iris/pupil, lens, retina, and optic nerve.
- Direct surface picking and an equivalent button directory. Reference selection remains local to the viewer.
- Keyboard rotation with arrows, zoom with +/−, and Home to reset framing. Pointer dragging uses capture and cancellation handling.
- Mobile layout, descriptive reference text, and a Focus 3D view action for returning from a structure description to the model.
- An explicit distinction between light reaching the retina and neural signals leaving through the optic nerve.
- A comparison prompt asks the learner to identify the lens from multiple views and explain what changed on screen versus in the eye.
- A textual spatial description remains available if 3D cannot load.

## Anatomical scope

The gross sequence and relationships were checked against educational and research sources. Geometry proportions and tissue thicknesses are illustrative, and the model has not received independent anatomical review.

The sheep pupil is a simplified horizontal opening. The choroid, tapetum lucidum, ciliary body, zonular fibers, blood vessels, extraocular muscles, and fluid volumes are deliberately omitted and named in the interface. The apparent open space should not be interpreted as an empty living eye.

Sources consulted:

- [Exploratorium: light and the eye](https://annex.exploratorium.edu/learning_studio/cow_eye/light.html), explicitly labeled as a bovine comparison.
- [Why do animal eyes have pupils of different shapes?](https://pmc.ncbi.nlm.nih.gov/articles/PMC4643806/), including the sheep-eye model and horizontal pupil discussion.
- [Topography of ganglion cells and photoreceptors in the sheep retina](https://pubmed.ncbi.nlm.nih.gov/20437529/), for sheep-specific retinal and tapetal context.

This is a concept pilot that can be evaluated before investing in reviewed specimen meshes or physical dissection simulation.

## Engineering behavior

- A stable React child component owns its own camera, selection, status, and renderer lifecycle.
- The shared pinned Three.js loader runs only when the learner opens the viewer.
- Frames render on changes, resize, or return to visibility; there is no continuous 3D animation loop.
- Visibility handling consumes the most recent queued observer record, avoiding a stale image after rapid scrolling.
- Pixel ratio is capped; the renderer uses the low-power preference.
- Unmount disposes geometries, materials, the renderer and its graphics context, observers, timers, and pointer listeners.
- Late loader completion cannot construct a renderer after the viewer closes.
- Failure and context-loss states retain the reference descriptions and return to 2D, with retry and context restoration support.
- The viewer is excluded from quizzes and timed practicals. Starting other study routes, changing specimens, and resetting clears the viewer where appropriate.
- It does not write observed structures, evidence notes, confidence, revealed layers, or assessment scores.
- Canonical and desktop dissection files are byte-identical.

## Verification

- 279 passing checks in the four-suite dissection regression run; the only failure is the previously identified shared bridge copy mismatch outside this change.
- All 80 focused reference/discovery/recall/spatial/3D checks passed in the final focused run.
- All four final Chromium acceptance scenarios passed without retries:
  1. On-demand loading, actual surface picking, keyboard/pointer rotation, reference isolation, and resource release.
  2. Phone reflow, actual rendered camera-state checks, model-focus navigation, and accessibility.
  3. Loader rejection, retry, real graphics-context loss/restoration, and access to 2D.
  4. Closing while loading prevents later creation of a detached renderer.
- Axe reported zero WCAG A/AA violations within the phone study panel. This is scoped automated coverage.
- Visually inspected the overview, corrected anterior view, and complete mobile panel.
- Syntax, scoped whitespace checks, and dissection bundle parity passed.

The new pilot uses English interface copy. Full translation, physical touch-device testing, and independent anatomical review remain follow-up work.

## Artifacts

- [3D overview](eye-3d-overview.png)
- [Anterior view on phone](eye-3d-anterior-mobile.png)
- [Complete phone workflow](eye-3d-study-mobile.png)
- [Final browser acceptance log](eye-3d-release.log)
- [Final focused unit log](eye-3d-focused-final.log)
- [Broader regression log](eye-3d-regression.log)

