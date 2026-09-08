# Video Studio portable project reliability

Completed September 8, 2026. Updated the standalone Video Studio and its identical desktop mirror. No deployment.

## Changes

- Fixed media being written to the wrong ZIP entry after insertion of project_readme.txt. Binary entries now carry their own source Blob, so metadata ordering cannot replace the README with video bytes or leave the named video empty.
- Added source-only editor_state.json with the take name, fractional trim, zooms, title, and export settings. Imports validate the schema and clamp timings against the actual probed video. Older bundles remain supported.
- Preserved precise source duration in metadata and supported the older durationSec field while reading existing bundles.
- Saving a project shelf row uses that draft's own title and settings, independently of the selected video.
- Distinguished the finished-video bundle button from editable source saves. Rendered bundles omit source editor state and embedded background music, narration, and clips; already-rendered music is not reapplied on import.
- Added restore-summary chips, a Review export settings shortcut, and visible metadata warnings.
- Added recovery for the previous archive-layout bug when recognizable WebM or MP4 bytes occupy the README entry and the named video is empty. Re-saving produces a normal archive. This does not reconstruct genuinely missing video bytes or repair arbitrary corrupted archives.

## Validation

- 228 Vitest checks across Video Studio, dialog accessibility, export refinements, and five new portable editor-state validation cases.
- Real Chromium bundle downloads and imports: byte-for-byte source video/audio preservation, readable README, trim/zoom/caption/settings roundtrip, shelf-row ownership, local recovery after bundle import, and a real rendered video/bundle comparison.
- Reproduced the former archive-layout defect, recovered the video, and verified a repaired re-save. Empty video plus ordinary README text is rejected.
- Legacy bundles and unsupported future editor-state versions tested.
- Mobile fit checked at 390px; restored-mobile.png visually inspected. No browser page errors.
- Scoped git diff whitespace check passed; both HTML copies match.

See results.json and vitest.log for evidence, verify-browser.cjs for the browser regression, and tests/video_studio_project_roundtrip.test.js for payload validation tests.

Source SHA-256: 875aacdf7708bb819a8cd7fd1d2eca7d25080dabdb14fc043b152dac3c352d41
