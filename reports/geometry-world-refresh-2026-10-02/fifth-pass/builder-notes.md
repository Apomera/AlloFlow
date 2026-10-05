# Geometry World Builder Transition Safeguards

Date: 2026-10-03, America/New_York.

## Implemented Behavior

- Free Build launch, blank Creator launch, Home practice launch, My Worlds opening, editable imports, saved-draft resume, complete Print Lab return snapshots, and pending source-model returns use the shared synchronous `engine.transitionWorld(target, action)` boundary. Their success state, announcements, events, focus changes, and payload consumption remain inside the accepted action so Retry completes the full initiating workflow.
- `restoreProject` and `restoreDraft` distinguish a blocked replacement (`null`) from a missing resumable project (`false`). A blocked resume cannot fall through to an empty sandbox. A pending Print Lab intent remains handled but unconsumed while blocked, preventing the mount effect from replacing the retained workspace.
- Confirmed editable import keeps the checked preview and current HUD when save preflight fails. The queued action captures the checked candidate and read token; canceling or replacing the preview invalidates that action. Pending handoffs check their exact retained identity before executing.
- A strict live serializer now feeds autosave, intentional Save variation, and recovery JSON download. It validates every student construction cell's uncoerced position, material, shape, and rotation. Missing, unknown, non-finite, fractional, out-of-range, duplicate, unreadable, BigInt, or circular construction metadata cannot be silently omitted, rounded, or defaulted into a partial successful save. Ground and authored lesson blocks remain intentionally excluded. Blank draft semantics and stale/deleted project ownership checks remain intact.
- Recovery download has an explicit boolean result and catches both metadata and download failures. It reads the live engine rather than the stored shelf and never needs browser storage. Downloading does not authorize a transition or prove that a file was retained by the learner.
- `captureProject` still creates a complete in-memory snapshot when its best-effort durable flush throws. It skips a duplicate flush during an already accepted transition. Editable import's transactional `_workshopRestoreInProgress` exception, memory rollback, and `finally` cleanup remain supported.
- Pointer/orbit/transform Escape capture handlers defer to the save-recovery dialog while recovery is pending. Covered camera commands and gestures are paused. Transform cancellation does not clear the retained preview, and queued preview camera fits do not dispose the controller or move the retained camera while recovery is open.
- The composed core-plus-builder renderer gives the save-recovery backdrop priority. It remains uninert and exposed to accessibility APIs while every other non-style root child, including Home, activity, and concept backdrops, becomes inert and hidden. Closing recovery restores the same underlying surfaces and their original props.

## Final Focused Evidence

Two explicit four-file Vitest runs completed with native process exit code `0`. Each JSON report has `success: true`, all four requested files present, and zero failed assertions. These are focused regressions, not a full-repository suite claim.

| Report | Files | Passed | Failed | Exit Code |
| --- | ---: | ---: | ---: | ---: |
| `builder-continuity-results.json` | 4 | 94 | 0 | 0 |
| `builder-persistence-results.json` | 4 | 65 | 0 | 0 |
| Distinct total | 8 | 159 | 0 | Both 0 |

The mounted Home/import cases were then repeated in `builder-mounted-final.json`: **46/46 passed, two files, zero failures, native exit code `0`**. These are repeated assertions from the same 159 distinct cases, not 46 additional cases.

| Test File | Passed |
| --- | ---: |
| `geometry_world_import_transaction.test.js` | 19 |
| `geometry_world_preview_navigation.test.js` | 12 |
| `geometry_world_printlab_continuity.test.js` | 21 |
| `geometry_world_selected_files.test.js` | 42 |
| `geometry_world_home_chooser.test.js` | 27 |
| `geometry_world_print_workflow.test.js` | 14 |
| `geometry_world_variations.test.js` | 8 |
| `geometry_world_workshop.test.js` | 16 |

Runner: `node node_modules/vitest/vitest.mjs run <explicit files> --config vitest.config.js --pool=threads --maxWorkers=1 --testTimeout=60000 --hookTimeout=120000 --reporter=json --outputFile=<report>`.

The builder remained unchanged throughout these final runs, with source and served mirror SHA256 `A13858A7C05ECDE13E53D766FA6177B2CAA9CEDFB46572083EA57B9CEDB2A6BF`. The core source and served mirror matched at both observations, but changed during the run window: starting SHA256 `E8A95AE9EA961EDC7E48B70B8A3B945464DA1B09C9E2F49E79CD2089909E3478`, ending SHA256 `B292355E69B126AA48E5844CCDE4DCF54F42AE4C0AA9EB70E96F96058B63E517`. This table must not be read as all 159 assertions necessarily executing against the latter core revision; final core/browser evidence is tracked separately by the main fifth-pass report.

The final mounted rerun's observed core window was `B292355E69B126AA48E5844CCDE4DCF54F42AE4C0AA9EB70E96F96058B63E517` to `554F23F1EC0FFD22F148885EEB2DC4DA356BD7DB96127207763F58DC79759FCF`. The core owner confirmed that both late changes were CSS-only save-recovery visibility selector precedence adjustments for hidden HUDs, with no JavaScript, hooks, or caller behavior changes. The final stable core and served mirror both have SHA256 `554F23F1EC0FFD22F148885EEB2DC4DA356BD7DB96127207763F58DC79759FCF`; final builder parity remains the hash above. Browser visibility at that final CSS revision is verified separately in the main report.

The final builder script also passed `node --check`. A `git diff --no-index --check` against the preserved pre-pass builder produced no whitespace diagnostics; its exit code `1` indicates that the two files differ.

## Test Changes In This Builder Work

- `geometry_world_printlab_continuity.test.js`: explicit successful loader fixture, blocked versus missing resume semantics, retained pending intents/source, untouched Showcase on rejection, and complete memory capture despite storage failure.
- `geometry_world_selected_files.test.js`: complete live recovery export without shelf access, strict corrupted-metadata rejection, download/access error handling, and pending-recovery pointer/transform Escape and gesture preservation.
- `geometry_world_preview_navigation.test.js`: real Three.js preview controller remains mounted with the exact camera projection/pose while pending recovery blocks gestures and queued viewport refits.
- `geometry_world_import_transaction.test.js`: actual confirmed-import caller callback preserves preview/HUD when queued and completes success UI/events/focus on accepted Retry; cancellation invalidates the read token.
- `geometry_world_home_chooser.test.js`: actual core-plus-builder rendering keeps recovery accessible above Home, activity, and concept surfaces and restores the same underlying nodes on close. The existing DOM-only Three.js fixture omits decorative activity marker positions for these cases.

The separate transition-test work owns the core guard matrix and workshop loader fixture update. This note does not duplicate its counts or attribute those test edits to the builder work.

## Limits

- Browser rendering, real WebGL interaction, and accessibility audits are recorded in the main fifth-pass report, not claimed from these unit tests.
- Validated supported student geometry is exported exactly. Arbitrarily corrupted renderer internals are not promised to be losslessly recoverable; failed validation keeps the live world and does not create a partial file.
- General app navigation/unmount and browser closure are still a separate host-navigation persistence concern. These world-transition guards do not establish durable saving when the tool is torn down after a failed flush.

All commands launched for this builder verification completed. No active verification command remains.
