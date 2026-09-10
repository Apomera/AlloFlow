# Geometry World welcome screen

Geometry World now opens with **“What would you like to do?”**, introducing four paths before asking the learner to start a lesson.

| Path | Destination |
|---|---|
| Learn | Browse built-in and saved lessons, preview their descriptions and objectives, and start the chosen lesson. |
| Build | Introduce Free Build, Showcase, editable saves, STL, and Print Lab; open a blank sandbox or a saved creation. |
| Explore | Enter the Geometry Garden, with no questions or score. |
| Create a lesson | Add characters and questions to the current workspace or begin a blank lesson; open the AI lesson builder when available. |

**Open a saved build** validates an editable Geometry World JSON file and presents a preview before replacement. Invalid files and cancellation preserve the current workspace. Starting a different world explains the replacement and provides a student-build download action. Editable build files preserve block shapes, materials and rotations; they are not full lesson backups.

**Continue your workspace** is offered after the learner has entered a world. Browsing Home and lesson previews preserves the actual geometry, retained selection, undo/redo history, camera and print scale. The Geometry World title is a Home button; Home also remains available with the game bar collapsed and in fullscreen. Returning to Home does not create a new workspace.

The full-screen chooser uses four soft color families, consistent line illustrations, generous card targets, and a responsive single-column layout on phones. Touch devices start through the same welcome screen with touch controls ready. High contrast and reduced-motion preferences are respected. The hidden 3D scene pauses beneath the opaque chooser and resumes when a path is opened. Existing WebGL recovery remains accessible if initialization fails.

## Validation

- **193 assertions passed across 8 existing regression suites**, covering keyboard access, lifecycle, input transitions, selection, import rollback, creation cameras, and the Print Lab bridge.
- **47 real-browser Home checks passed**, including fresh entry, every primary path, preview and cancellation, creator focus, keyboard trapping, exact workspace preservation, rendering pause/resume, collapsed-toolbar access, native fullscreen, and a fresh touch-phone session.
- The selected-build browser regression passed at five inspector sizes, ten toolbar states, high contrast, and native fullscreen. Its Print Lab round trip restored the selected 60-block fixture at 12.5 mm per block and the complete surrounding workspace.
- No page or console errors were recorded by either successful browser run. Production scripts parse and match the desktop mirrors and browser source hashes. Print Lab source is unchanged.

The browser harness uses real local application scripts and software WebGL. The Print Lab geometry fixture uses controlled picking. These checks validate digital workflows; no physical print or AI generation was performed. The existing lifecycle unit tests use a partial WebGL stub and can log its initialization failure while their assertions pass; that is separate from the clean real-browser runs.

## Preview

![Geometry World welcome screen](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-home-2026-09-10/home-1440x1000.png)

![Fresh touch-phone welcome screen](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-home-2026-09-10/home-fresh-touch.png)

![Free Build introduction](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-home-2026-09-10/build.png)

## Evidence

[Verification and source hashes](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-home-2026-09-10/verification.json) · [Home browser checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-home-2026-09-10/home-browser.json) · [Regression tests](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-home-2026-09-10/regressions.json) · [Print Lab browser checks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-home-2026-09-10/after-browser.json)
