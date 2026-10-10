# Enhancement 72 — Scenic viewpoints and finer nebula emission

Landmark cards now contain expandable scenic viewpoints with larger previews, authored names and descriptions, and an explicit Open paused view action. Opening records the current camera and settings; Back restores the prior pose, lens, counters, destination, pace and arrival setting. Neighborhood previews explain that their images show dust on while opened views keep the current dust setting. Failed preview images retain the viewpoint action. These are authored camera presets in a generated teaching scene.

Nearby nebula surfaces gain a static fine emission layer. It fades in with the physical pixel budget of enlarged local surfaces. Broad emission, source positions and existing motion remain intact; the fine layer is illustrative styling and does not simulate gas dynamics or additional dust extinction.

Validation: 71 focused tests; 30 UI browser workflows; 7 accessibility checks with zero violations; 38 rendering workflows and 12 baseline/final comparisons. Paused repeated captures and returning camera poses are deterministic. Unresolved/distant scenes are checked against baseline pixels, along with both relativity samples and galaxy/cosmic scenes. Browser checks cover authored view matching, exact normalized Back restoration, failed opening, preview failure, dust settings, flyby detours, keyboard focus, phone/fullscreen/high contrast/landscape and control reachability. Rendering used Chromium SwiftShader; hardware GPU behavior across devices was not tested.

All 18 scenic previews were regenerated from the final renderer and verified against the manifest and desktop mirror. Source mirrors and syntax checks pass. Nothing staged or committed.
