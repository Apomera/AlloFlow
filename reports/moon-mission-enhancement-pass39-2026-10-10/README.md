# Moon Mission enhancement pass 39 — October 10, 2026

## Result

Re-entry now shows a spherical Earth horizon derived from the capsule’s measured altitude. The horizon rises and flattens during descent in a fixed 60° vertical field. Clouds are clipped below the curved surface, and stars fade as the illustrative dawn palette brightens.

- The virtual camera has level axes and an off-center principal point at 72% of the image height. Its focal length solves the exact top-to-bottom field angle. Desktop and phone layouts retain the same physical center depression.
- Earth’s apparent limb follows sphere-ray tangency using the flight model’s Earth radius. Individual curve points can leave the viewport naturally. A closed surface path fills Earth and clips the cloud decoration.
- The existing green airglow cue uses a separate 100 km spherical shell when the observer is above it. It fades to zero at the shell boundary. NASA describes green oxygen airglow near 95–100 km in [Airglow Over the Indian Ocean](https://science.nasa.gov/earth/earth-observatory/airglow-over-the-indian-ocean-147367/).
- The entry instruments include geometric horizon dip. The scene description and model notes explain the camera field and which visual details are illustrative.
- An optional star opacity restores the entry scene’s intended night-to-dawn fade. Other scenes retain the existing default opacity.

This is straight-ray geometric projection on the model’s spherical Earth. Sky colors, cloud placement, glow intensity and width, capsule placement and size, and recovery scenery remain illustrative. The horizon projection applies before parachute deployment and during skip-out.

## Validation

**Final source:** 305fdc3bcffb0dd94f06fd5631bedf4dc6079c752c2318aa5ad0049a2b75bd0b, 1,461,720 bytes in both runtime copies.

- **51 unit cases passed** in five focused suites: new horizon geometry (8), entry physics (9), guidance (21), saved state (7), and trajectory (6). Final evidence is in unit-3.
- **Three final Chromium workflows passed**, using the real Playwright API and matchers with a local harness: direct-horizon-3, direct-guidance-2, and direct-recorder-1. These are direct workflow checks, not Playwright CLI suite results.
- The horizon workflow checks independent spherical tangency, exact field angle, surface/airglow raster masks, measured telemetry, 1100/320 px layouts, keyboard seeking, resize/pause, parachute boundaries, splashdown, reload, preserved receipts and rewards paid once, and genuine bank-zero skip-out.
- The rendered empty-sky region contains **51 bright neutral star pixels at entry and zero before drogue deployment** after the dawn fade. The corresponding images and pixel census are retained.
- **Two scoped axe scans reported zero violations.** Font size, touch targets and overflow assertions passed in desktop and phone entry workspaces.
- The existing guidance workflow verifies the flown plan through review, reload, final report and archive. The recorder workflow verifies measured chart units, touch/keyboard selection, live playback and completed evidence.
- **21 final PNG captures** retained: 14 horizon/workspace views, one guidance debrief, and six recorder views. All 21 images were independently reviewed with no introduced visual defects. See visual-review.json; the debrief image was captured during its existing entrance animation and establishes layout, with settled contrast outside this capture’s evidence.
- Both JavaScript runtime copies pass syntax checks. Scoped whitespace checks passed.

## Preservation

All 15 guarded edits reverse to the exact accepted pass38 source, SHA-256 0d89fb6277c1c6cb9ff4f0785f2d8be953c27f4bd613836367cf777625820778. All 136 prior test files and the scoped Git index are unchanged. Two new test files are recorded in owned-files.json.

Flight integration, physical profiles, guidance authority, entry receipts, saved results and rewards are preserved. No full application build, staging, commit, push or deployment was performed.

## Interrupted and superseded attempts

The first unit attempt exited with incomplete output while the system drive had zero free space. The disk-full condition also interrupted two private helper writes. The runtime copies remained intact. A recovered run passed all 51 cases; the final star-fade source then passed the same 51 cases in unit-3.

To regain space, eight old task-owned pass4 index snapshots were temporarily stored as gzip archives, with original hashes verified after decompression. After broader free space recovered, all eight snapshots were restored to their original paths and exact bytes; only the temporary gzip copies were removed. Historical screenshots and logs were preserved. The full audit is in storage-recovery.json.

The first browser attempt was denied access to its localhost harness. The focused checks subsequently ran with approved local-server access. The successful horizon-2 and guidance-1 runs preceded the dawn-star fix and are retained as superseded evidence. Only the three final runs above contribute to final browser totals.

## Evidence

The report directory contains verification.json, syntax.json, baseline.json, runtime-replacements.json, owned-files.json, final and interrupted process logs, measured geometry/pixel JSON, accessibility results and screenshots. The preserved run-workflow.cjs supports horizon, guidance and recorder modes; use a fresh MM_DESCENT_HUD_REPORT_DIR for each rerun.
