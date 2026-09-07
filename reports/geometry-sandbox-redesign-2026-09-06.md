# Geometry Sandbox redesign

Implemented locally on September 6, 2026. No commit or deployment was made. Existing unrelated workspace changes were preserved.

## What the review found

The sandbox's three geometry engines were easy to confuse with its learning activities. Free building, predictions, missions, challenges, editing, display options, and research controls shared a long sidebar. The canvas repeated much of the sidebar's math, and the shortcut banner occupied the same corner as fullscreen. The companion Stretch Lab also kept lesson targets active without a clear way to choose free building.

## Main workspace

- A prominent **Free build / Lesson sequence** switch separates learning intent from the **Single shape / Stretch mode / Sculpt** tools. Switching preserves the current construction and previously earned progress. Free build also exits a temporary geometry challenge correctly.
- **Build / Learn / Settings** tabs keep editing, investigations, and preferences in predictable places. The panels remain mounted to preserve form state. Arrow keys, Home, and End move between tabs and update focus. Mode navigation stays available inside fullscreen.
- Lessons show one active task, a lesson chooser, progress, contextual hints, and Previous/Next controls. Only the current lesson earns completion during the lesson sequence. Free building does not silently earn lesson stars. Learners may revisit or skip ahead without clearing their model.
- A larger canvas, calmer surfaces and borders, consistent SVG shape thumbnails, subtle floor grid, and compact measurement strip replace the competing panels and overlays. Build challenges and optional AI creation use disclosures. Badges, export, AI tutoring, and the immersive launch live in **More tools**.
- **Focus view** hides the sidebar and restores the previously selected panel when closed. **Fit** works in every geometry mode; portrait resizing also supports the fallback where OrbitControls is unavailable.
- Settings include Slate/Midnight/Paper canvas backgrounds, grid visibility, optional canvas measurements, navigation hints, automatic rotation, comfortable/compact controls, and reset-display controls. Rotation respects reduced-motion changes and stops when the user drags.
- Single-shape dimensions support exact numeric entry alongside sliders, with a custom color picker in Settings. Existing precise sculpt controls, materials, grouping, transforms, save/import/export, investigations, and notebooks are retained.
- Canvas labels and large sculpt/stretch math overlays are optional. Core single-shape measures remain compact and respect the measurement visibility preference and selected unit label.

## Companion Stretch Lab

The immersive companion now provides its own persistent **Free build / Lesson sequence** switch and **Build / Settings / Help** navigation. Scene appearance, measurements, headset/performance controls, playback, and teaching/sharing controls are grouped into disclosures. Backdrop, ground grid, and floating formula card visibility can be customized.

Free building pauses mission targets, snapping, and hints without changing geometry or undo history. Saved lessons and explicit shared-link settings remain supported. Main-workspace launches pass the chosen learning path, including launches without a transferable selected shape. Display and mode preferences survive reloads. New Free build sessions use the calmer Explore view with the floating formula card off; saved choices and explicit shared-link settings retain their preferred views.

Mobile controls remain collapsible and scrollable, leaving room for the model. Existing camera framing, geometry calculations, and XR/controller operations are preserved.

## Validation

- **342 focused unit checks passed across the initial and targeted final runs.** The initial run passed 336 checks. Four failures were expectations for intentionally changed navigation/hint defaults; those were updated without removing the underlying assertions. One immersive behavior check exceeded its default five-second budget under Windows load, then passed alone and in the final targeted run. The 72-check final follow-up passed completely, and one additional companion default-preservation regression was added and verified in its final pass.
- **22 existing browser scenarios and 5 new navigation regressions passed** across combined and targeted runs. These cover geometry visibility, construction, selection, cross-sections, undo/redo, asynchronous AI replacement with a local stub, challenge isolation, preserved lessons/preferences, tab keyboard behavior, and phone overflow/focus mode. The intermediate AI test needed to open the new disclosure; its final rerun passed.
- A final desktop/phone capture also verified actual projected sculpture bounds after **Fit**, including near/far depth and every bounding-box corner inside the viewport.
- The companion's real A-Frame smoke checked mode switching, exact geometry preservation, target clearing, scene preferences, reloads, workspace-only launch intent, and desktop/mobile layouts without page errors. At 390 × 844, the open HUD was 379 px high and collapsed to 56 px.
- Source and desktop/public geometry copies are synchronized. All **54 new English interface strings** are registered consistently in the source/public dictionaries and geometry English registry, preserving unrelated data.

Main unit evidence: `scratch/geometry-design-2026-09-06/unit-results.json` and `unit-followup.json`. Browser regression source: `tests/e2e/geosandbox-navigation.spec.ts`, `geosandbox-workbench.spec.ts`, and `19-geosandbox-gl.spec.ts`. Screenshots are in `scratch/geometry-design-2026-09-06/` and `reports/geometry-sandbox-refresh-2026-09-06/`.

Physical headsets/controllers, actual screen-reader sessions, production deployment, and external AI services were not exercised. Browser checks use real WebGL through software rendering and locally served dependencies; the interactive preview uses the actual sandbox source with a lightweight host.

## Local preview

With `node scratch/geometry-design-2026-09-06/preview.cjs` running from the repository root, open:

`http://127.0.0.1:4177/scratch/geometry-design-2026-09-06/geometry-preview.html`

The preview includes OrbitControls and keeps its own model/preferences in local browser storage. It does not modify an existing AlloFlow workspace session.
