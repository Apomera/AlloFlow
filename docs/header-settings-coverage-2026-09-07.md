# Header settings: coverage and refinements

Date: September 7, 2026. Scope: header preferences and their propagation through the 24 main resource entries in the current local working tree. This follows the [main-resource quality and typography review](main24-quality-typography-2026-09-07.md).

## Implemented improvements

| Setting or control | Coverage and refinement |
| --- | --- |
| App theme | Cycling Light, Dark and High Contrast now saves the resolved value. Reloads and component remounts restore the latest choice. The control exposes its current theme to assistive technology. |
| Reading theme | Existing learner, group, class and device preference resolution is retained. Anchor Chart custom paper, sections and icon backgrounds now follow the app/reading palette, fixing pale text on pale paper. All 30 app-theme × reading-theme combinations were checked in Chromium. |
| Typography | The preceding font/size/spacing improvements remain. The reset action now says **Reset size & spacing**, accurately describing its scope without resetting separate font, reading or audio choices. |
| Bionic reading | The choice now persists and the button exposes its pressed state. Its description states that it applies to supported reading passages. Shared interactive prose correctly renders bold/italic markup with Bionic on or off. |
| Reading focus | Keyboard-focused paragraphs and response inputs in ordinary/bilingual adapted reading stay visible while Line Focus is enabled. Disabling it removes the additional paragraph tab stops. This is a related reading-toolbar support, distinct from Bionic. |
| Voice, speed and volume | Shared read-aloud applies header volume, including zero, and live media speed/volume changes. Flashcard sequences use current preferences, stop on mute, discard canceled synthesis and recover from rejected playback. DBQ no longer forces 0.9× speed. Teacher group speed remains an explicit override. |
| Browser voice fallback | The shared player honors opt-out and provider Off. An explicitly selected Browser provider still works. The header restores the checkbox and reports an error if its choice cannot be saved. |
| On-device voice setup | Failed, rejected or synchronously throwing Kokoro downloads clear pending flags, allow retry and report failure. Repeated selection shares a pending download. |
| Voice input engine | Inspected the existing Auto, private Whisper, browser service, Gemini and Off paths. Canonical preference propagation and recording behavior passed existing regression checks; no new engine-policy defect was established. |
| Reduce animations | CSS transitions/animations and navigation scrolling honor the app or device preference. Audit, Assess and Document Builder jumps were repaired. The header exposes its own pressed state and explains that device reduction also applies. |
| Color overlay | Existing viewport-wide, pointer-transparent portal and saved choice retained. Its accessible name now includes the selected color. It does not alter saved text or exported output. |
| Interface language | The header now supplies the existing confirmation dialog for translation regeneration. Custom language selection focuses its input; the same corrected translation file can be imported again. UI language remains separate from generated resource language. |
| Help and assistant visibility | Toggle states are exposed to assistive technology. Existing contextual-help and bot visibility behavior is retained. |

The Anchor Chart title under the Dark reading palette measured **1.18:1 contrast before** and **13.84:1 after** the palette correction.

## Coverage boundaries and follow-ups

- **Bionic is intentionally not a global text rewrite.** It reaches shared prose renderers in adapted reading, FAQ, activities, interview, adventure, assessments and planning, among others. Direct JSX, editable fields, math, cloze interactions and diagram/canvas text have separate rendering rules. The [reading-support report](header-reading-support-coverage-2026-09-07.md) maps every main resource. Broader Bionic coverage would need deliberate per-renderer work.
- **Immersive reading and export have separate controls.** Immersive playback retains its own speed control; authored/exported documents retain their own typography and theme. Flashcard sequences still require generated audio URLs and do not implement an independent browser-utterance fallback. Existing prepared recordings retain their recorded voice.
- **Independent interactive tools remain a separate audit.** Shared CSS reduction does not establish coverage for every STEAM simulation, canvas/WebGL scene, animated asset or game-specific motion system.
- **Help mode explains click actions.** Typing or changing a slider/select with arrow keys can still edit values. Broader input interception and localized fallback help are future refinements.
- **Reading Ruler needs a separate toolbar fix.** Its saved enabled state starts at y=0 and follows mouse movement only. Centering its initial position and supporting keyboard/touch are documented follow-ups outside this header pass.
- New header text uses the normal English fallback; this pass did not regenerate or assess every translated language pack. Session, sharing, role and AI-backend launchers were not treated as global resource-formatting settings.

## Verification

- Header controls: 68 distinct passing checks across seven suites, including the final theme-remount regression.
- Audio and input compatibility: 94 passing checks across eleven suites, including 15 new runtime checks.
- Reading support and language picker: 62 passing checks across nine suites.
- Theme and motion: 116 passing checks across six suites, including the 30-combination Chromium palette matrix and actual navigation callbacks.
- Final combined integration: **47 passing checks across five suites**, including nine Chromium typography tests, eight theme/motion checks, sixteen settings runtime checks, seven shared-player regressions and seven overlay contracts. The overlay suite passed its focused rerun; the other four passed in the combined run. Latest per-suite outcomes: `scratch/header-settings-final-summary-2026-09-07.json`.
- Local development build completed and copied 483 module/plugin files plus 18 companion asset folders. All ten runtime modules changed in this header pass and the English string catalog match their desktop public mirrors; generated App.jsx parses and both generated host copies agree. Header preference bindings are present in the built host.
- CSS template scan: 486 files, zero stray backticks. View-prop scan: 65 views, zero parse failures or missing-prop risks. Scoped source/test whitespace checks passed.

Two older source-contract checks were updated to follow the actual shipped code: input-panel actions now live in SidebarPanels, and development builds intentionally rewrite CDN URLs. The overlay comparison now checks its complete render implementation rather than requiring the entire source and development shell to be byte-identical.

These groups overlap and must not be added as a whole-project test count. Validation uses source checks, actual React components, controlled audio/provider substitutes and Chromium rendering. No live microphone/provider session, physical listening test, manual screen-reader session, physical print validation, deployment or commit was performed. Existing unrelated changes in the shared checkout were preserved.

Details: [Audio](header-audio-settings-coverage-2026-09-07.md), [Reading support and language](header-reading-support-coverage-2026-09-07.md), [Themes and motion](header-theme-motion-coverage-2026-09-07.md).
