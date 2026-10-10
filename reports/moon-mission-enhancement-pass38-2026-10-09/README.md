# Moon Mission pass 38: Earth return camera

Completed locally October 10, 2026. Work began October 9; the evidence directory keeps that start date. Changes remain uncommitted.

## Visuals and realism

- Added **Crew Earth view** beside the existing return views, with a fixed 80° circular field and angular ticks placed with a rectilinear tangent projection.
- Earth’s visible size comes from its measured distance. Finite-distance ray intersections determine visible surface normals, geographic perspective and sunlight from the fixed +Y Sun. This avoids applying a distant orthographic globe to a close observer.
- The existing coarse coastlines rotate in the stated model frame. Earth grows from 1.90° at departure to 157.75° at entry interface; the display explicitly says when it extends beyond the 80° field.
- A disclosed exposure lift and thin geometric limb guide keep the night-side view legible. The open-center reticle leaves the distant Earth visible. Brightness and geography remain illustrative; the camera does not reconstruct Apollo attitude or window geometry.
- Camera selection survives validated saves and reloads. The canvas description reports the changing angular diameter and clipping. Existing return physics, arrival receipts, flight controls and rewards remain unchanged.
- Surface rendering uses at most 320×320 pixels, restricts work to Earth’s projected bounds, rasterizes the atlas once and caches the last frame. Live near-Earth playback advances and pauses correctly. No frame-rate benchmark is claimed.

## Validation

- **41 focused Vitest cases passed; 1 known stale case skipped** in `unit-final-1`. The eight new geometry/camera cases all pass. Five relevant test files were exercised.
- **Three Chromium workflows passed** on the exact final runtime: new crew camera, existing physical return instruments, and receipt/reload/entry handoff. Run details are in `results.json`.
- The crew workflow covers 320px and 1100px layouts, four physical times per layout, exact diameter, clipping, day/night pixel contrast, deterministic paused frames, view changes preserving physical state, resize/reload, keyboard End, live playback/pause, and current version-2 entry state with matching initial altitude, speed and angle.
- A deterministic synthetic RAF/visibility check holds time while hidden, discards a large hidden-time jump on the first resumed frame, advances exactly 9.6 model seconds for a 16ms frame at 600×, and holds time when paused. This checks clock semantics, without claiming actual browser background throttling.
- Two scoped axe scans report zero violations. The accepted workflows produced **14 PNG captures**. Crew frames and workspace controls were visually reviewed.
- Both runtime mirrors match; JavaScript syntax and scoped Git diff checks pass. All 134 prior test files retain their starting hashes. The 19 guarded runtime changes reverse exactly to the accepted pass37 source. Scoped index entries remain unchanged; new files are unstaged.

### Existing test limitation

The unfiltered first unit run (`unit-1`) reported 41 passes and one failure. `tests/moonmission_return_saved_state.test.js:62` expects the old version-1 entry-save shape, while the starting implementation creates version 2 with a guided lift plan. Running that unchanged file against the exact private pass37 baseline (`baseline-unit-2`) reproduced the same failure: 8 passes, 1 failure. The prior test was preserved. Final unit validation excludes only this stale assertion; the new browser workflow explicitly validates the current version-2 entry payload and physical boundary.

### Retained attempts

- `baseline-unit-1` stopped in the launcher before tests ran; `baseline-unit-2` supplies the actual control result.
- `direct-crew-1` exposed a canvas data-attribute collision with the view select, which was corrected.
- `direct-crew-2` passed the earlier renderer; screenshot review prompted a clearer night-side exposure and limb guide.
- `direct-crew-3` exposed a browser assertion that observed an already-running entry clock and compared a computed angle with exact equality. The final spec remounts a paused boundary and checks the normalized saved angle; `direct-crew-4` passed, then `direct-crew-5` added deterministic clock coverage.
- `direct-visibility-1` passed its hidden hold, resume and pause checks, then failed a final elapsed-time bound: 160 model seconds versus a limit of 60. Browser startup alone took about 27 seconds and remote command delays could contribute to elapsed running time. The production clock code was unchanged. This timing-sensitive attempt is retained and excluded; the final crew workflow verifies no hidden-time catch-up with controlled timestamps.
- Initial cross-root Python writes returned `OSError: Invalid argument` without changing the runtime. Running the same guarded edits with the repository as working directory succeeded. Interrupted/failed attempts are excluded from final totals.

## Files and evidence

- Runtime: `stem_lab/stem_tool_moonmission.js` and its public desktop mirror.
- New tests: `tests/moonmission_return_crew.test.js`, `tests/e2e/moon-mission-return-crew.spec.ts`.
- Verification: `verification.json`, `runtime-replacements.json`, `runtime.patch`, protected test hashes in `baseline.json`, scoped index snapshots.
- Final SHA-256: `0d89fb6277c1c6cb9ff4f0785f2d8be953c27f4bd613836367cf777625820778`; **1,458,269 bytes** per runtime copy.

No full application build, staging, commit, push or deployment was performed. The validation is scoped to this camera and the return/entry boundary.
