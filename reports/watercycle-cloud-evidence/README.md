# Cloud evidence

The Cloud field guide makes sketch names, height bands and selection state easier to read. Cloud detective keeps an observation and an uncertainty note for each comparison pair, with clear keyboard handoffs between the chosen sketch and its explanation.

- Container layouts adapt to the actual panel width. The 320px view keeps whole names and wraps Investigate onto a second row.
- The gallery is a named native accessibility group. Comparison feedback, observation hints and disclosure markers remain clear in light, dark and forced colors.
- Canonical pair keys keep drafts separate. Malformed imports are safely normalized; inherited draft fields and cyclic or BigInt cloud arrays are rejected without fabricated notes or serialization errors.

## Verification

| Evidence | Result |
| --- | --- |
| Main browser run | 864 passed checks; 265 cases; 104 native actions; 15 scoped audits; 24 captures |
| Focused forced-dark disclosure run | 30 passed checks; 14 cases; 4 native actions; 1 scoped audit; 1 capture |
| Focused unit tests | 34/34 in watercycle_cloud_evidence.test.js |
| Regression tests | 201/201: check_investigations 55, journey_chapters 39, precipitation_lab 24, process_compare 83 |
| Runtime preservation | 39 named production anchors, two quiz/myth score blocks and complete comparison/signal derivation ranges match the frozen baseline |
| Preview | Page and runtime HTTP 200; served runtime hash matches the tested source |

The browser reports contain 894 passed check instances. Removing the two generic checks repeated across runs leaves 892 instances. There are 852 unique label strings because six different malformed imports intentionally reuse eight assertion labels. The five test files contain 235 distinct passing test identities with no overlap.

Both isolated browsers and servers closed. Bound closure timestamps precede the focused and regression test start times. See [closure metadata](closure-metadata.json), [main browser results](results.json), [disclosure results](disclosure-results.json), [unit results](unit-results.json) and [regression results](regression-results.json).

All 14 measured initial/filled layouts passed the 44px control checks (0.2px geometry tolerance), 12px explanatory-text checks and clipping/overflow checks. The minimum recorded computed text contrast is 5.00:1 across 1092 measurements, including placeholders. Native depth-button text bounds also fit.

All 16 scoped axe audits report zero violations and zero incomplete rules/nodes. The region rule is disabled for this component audit. The native mounted query finds exactly one group named "Choose a cloud type"; the saved case records role=group and the matching accessible name. The gallery now has an explicit role, resolving the earlier generic-div naming ambiguity.

## Matched captures

| Context | Frozen baseline | Enhanced guide |
| --- | --- | --- |
| phone320 | [Before](before-phone320.png) | [After](after-phone320.png) |
| phone390 | [Before](before-phone390.png) | [After](after-phone390.png) |
| desktop | [Before](before-desktop.png) | [After](after-desktop.png) |
| host390 | [Before](before-host390.png) | [After](after-host390.png) |
| dark | [Before](before-dark.png) | [After](after-dark.png) |
| forced-phone | [Before](before-forced-phone.png) | [After](after-forced-phone.png) |
| forced-dark | [Before](before-forced-dark.png) | [After](after-forced-dark.png) |

### Filled observation comparison

The [baseline phone guide](before-phone320.png) shows the earlier sketch and classification controls. The [filled phone guide](after-phone320-filled.png) and [filled phone detective](after-phone320-detective.png) show readable selected-state cues, classification feedback, pair-owned notes and the next action. [Desktop guide](after-desktop-filled.png) and [desktop detective](after-desktop-detective.png) show the same filled evidence at a wider panel. The [open forced-dark hint](after-forced-dark-hint.png) verifies its native disclosure cue and text.

## State and engine scope

Native guide actions cover ten cloud types, all three depths, five comparison pairs, correct and wrong choices, returning from the chosen sketch, per-pair drafts and two-line keyboard writing. Paused storm inputs, saved experiment writing, outer state, mode, rewards and rendered pixels remain unchanged through these actions.

The [actual 3D capture](after-3d-guide.png) accompanies 16 3D state snapshots across 8 native actions. The harness directly retains the mounted WebGL canvas, its context, the native renderer returned by a temporary constructor wrapper, the scene/camera passed to render, and exposed Sync/Cleanup/ResetCamera/FocusCamera hooks. It compares those identities and paused canvas hashes after the actions. OrbitControls and other closed-over objects are uninspected; refreshed lifecycle/attach callbacks are outside the identity assertion.

Cloud taxonomy data and SVG drawing functions, precipitation defaults/presets/model/phase functions and handlers, canvas engines, process comparison, Journey chapters, Check investigations, quiz/myth scoring and full comparison/signal derivations are pinned in [artifact-summary.json](artifact-summary.json). The existing thunderstorm preset intentionally loads scenario settings through its unchanged handler; a sketch classification does not change weather inputs or award XP.

## Limits and reproduction

Checks use isolated Chromium viewport/forced-color emulation. Computed contrast composites text over ancestor background colors and accounts for placeholder opacity; it does not assess decorative cloud strokes/fills or every opacity/gradient combination. Scoped audits and source-range preservation do not replace a full application or physical-device audit.

The frozen baseline completed and closed with 28 passes and 15 historical target/text findings. It rendered the frozen a0 buffer; its separately observed live source/public metadata record candidate c346. The verifier binds the a0 buffer and all seven before captures independently from those live-host observations. Preflight, diagnostic, interrupted and live-run files remain outside the final manifest. The authorized learner preview is separate from the closed QA servers.

Run the saved-artifact verifier; it launches no browser or test suite and resolves inputs relative to the repository:

```sh
node reports/watercycle-cloud-evidence/verify.cjs
```

Final source/public/frozen browser runtime: `42eae634d0027b819ac0e5368801447780290c3d70e5da15aa402ff84d94314c`.

Baseline: `a0b86ac156e3045c52448226e518ed1ad4acd2b104c491d56efc7c1272b3579c`.

[Verification result](verification-summary.json) records hashes, PNG dimensions, unique test identities, loaded runtime/test bytes, preservation ranges, group semantics, zero incomplete items and closure ordering. Historical absolute paths in test reports are labels, not required local filesystem paths. The four mutable report outputs are excluded from their own artifact pins.
