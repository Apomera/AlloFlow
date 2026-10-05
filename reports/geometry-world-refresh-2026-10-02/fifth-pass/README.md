# Geometry World: Build-Preserving Transitions

Continued October 3, 2026, in America/New_York.

## Improvements

- Lesson and world replacement now checks the live Free Build save before changing geometry, camera/preview state, project identity, undo history, learning evidence, or the initiating view.
- Failed saves keep the workspace and open an accessible recovery dialog: Stay here, Download build JSON, Retry saving, or a separate confirmation to continue without saving. A download never automatically continues.
- Retry completes the whole original action, including its lesson identity, HUD, dialogs, and focus. Discard authorization is one-shot and bound to the exact engine, source workspace, destination, and confirmation token; intervening edits invalidate it.
- Home, practice, Reset/Replay/Next, My Lessons, lesson JSON/editor, generated lessons, peer worlds, saved projects, editable imports, and Print Lab return paths now respect rejected transitions. Pending imports and answer/editor drafts remain available.
- Autosave, variations, and live JSON export validate raw student blocks rather than silently rounding, defaulting, or dropping malformed cells. Stale/deleted project ownership remains protected; earlier saved projects are not overwritten during discard or peer import.
- The recovery surface has readable typography, compact icon-and-label controls, 44px minimum targets, focus trapping and return, and contrast/forced-color support. It takes priority above Home/activity/concept overlays and remains visible with controls hidden. World animation and gestures pause while it is open.
- Imported peer builds get the normal Free Build floor and framing. A generated lesson that was not applied has an explicit Open ready lesson action.

## Verification

Focused native test commands completed successfully:

| Evidence | Result |
| --- | --- |
| [Transition regressions](../fifth-pass-transition-tests.json) | 78/78, one requested and reported file, exit 0 |
| [Builder continuity/import/export](builder-continuity-results.json) | 94/94, four files, exit 0 |
| [Builder persistence/Home/workflow](builder-persistence-results.json) | 65/65, four files, exit 0 |
| [Repeated composed Home/import checks](builder-mounted-final.json) | 46/46, two files, exit 0; repeats cases above |
| [Core Home/practice/generation/question regressions](core-regressions.json) | 129/129, four files, exit 0; Home overlaps the builder batch |

The two builder batches cover 159 distinct cases. Results from overlapping or repeated batches are not added together. Some final runs overlapped CSS-only selector changes; behavioral source remained unchanged. See [builder notes](builder-notes.md) for exact run windows.

A combined transition/workshop JSON run exited 1 and omitted the transition file. It is not counted as clean. The transition file subsequently passed alone with both normal and JSON reporters; its isolated practice-completion case also passed with a 10-second test timeout. No complete repository-wide green suite is claimed.

[Real-browser evidence](browser-report.json): 52/52 checks passed, with zero violations in 16 scoped axe audits. The checks use local React, Three.js, and actual WebGL at 1280x800, 390x844, 320x568, and 844x390. They cover retained world/camera/history/evidence, composed modal visibility, target sizes, focus/Tab/Escape, live downloads, retry, confirmed discard, saved-project integrity, contrast, forced colors, hidden controls, and nonblank canvas pixels. Screenshots are beside that report. Earlier browser passes exposed and fixed background-inert and hidden-HUD layering issues; only the final report is the acceptance record.

[Native navigation follow-up](navigation-report.json): 4/4 viewport checks passed. Keyboard W and native canvas TouchEvents move the world again after Stay, release their movement state, and leave transition depth at zero. The initial fixed 500ms desktop probe was inconclusive; waiting for actual camera movement within a bounded 15 seconds passed without a source change.

Final syntax, scoped whitespace, and mirror parity checks passed.

- Core/source mirror SHA-256: `554F23F1EC0FFD22F148885EEB2DC4DA356BD7DB96127207763F58DC79759FCF`
- Builder/source mirror SHA-256: `A13858A7C05ECDE13E53D766FA6177B2CAA9CEDFB46572083EA57B9CEDB2A6BF`

Independent source review: [review notes](independent-review.md).

## Preview And Limits

[Geometry World preview](http://127.0.0.1:61309/?mode=home) is running locally (restarted hidden process 43048; final HTTP 200). This test host does not validate deployed services, real touch hardware, or WebXR. No deployment was performed.

The guard covers in-tool world replacement, not browser closing or host-driven tool teardown. Engine disposal must still complete even if its final best-effort flush fails; asynchronous dialogs cannot reliably prevent page closing. Host navigation recovery or a separate volatile recovery store remains a follow-up. Invalid live geometry may prevent export as well as save; no successful file is promised in that case.
