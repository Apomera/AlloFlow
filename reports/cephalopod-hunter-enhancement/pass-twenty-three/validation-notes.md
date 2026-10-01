# Pass 23 validation — authored, not run

Root completion: integration and validation are complete. See README.md and validation-summary.json for final 164 distinct unit cases,19 native cases,nine accepted natural views and measured costs. Original author proposals below are retained as historical planning records.

This document records authored checks and intended evidence. No candidate guard, CPU suite, browser test or GPU capture has been executed by the test author. Root owns serial execution, integration and final results. No runtime, mirror, index or Git mutation was made by the test author. The user's no-staging/no-commit instruction remains active, and previous uncommitted work is preserved.

The confirmed setup baseline is SHA256 `b34c982127743a9d1f47ed392d0d48d09fa6adba588560bb178ab5e180e5d369` in the canonical runtime and all three mirrors. Setup recorded HEAD `1e30b7451891b20980cd7301e1e407904d2fca3f` and an empty index for owned paths. These are starting-state facts, not validation results for pass 23.

## Bounded feedback correction

The current strike-contact path suppresses its failure message whenever `nearestClam` is non-null. That variable is computed from nearby live clam reach, height and cover even when the player never holds E or starts Forage. Clicking the actual Strike button only sets `clickRequested`, so an untouched reachable clam can hide a genuine miss at distant or rock-blocked selected prey.

The authored `apply-experience-finish.cjs` makes exactly three guarded substitutions:

1. Cache the existing complete clam-gathering predicate in `clamGatheringThisFrame`.
2. Use that same boolean for the existing drill branch.
3. Suppress failed-strike feedback only when that actual gathering branch runs, rather than from clam proximity alone.

The complete predicate retains held E or latched forage, non-detritus diet, an eligible nearest clam, no movement, and the strict post-hit delay greater than 250ms. It does not infer active gathering from stale `drillingClam` or decaying progress. Actual drilling, meals, captures, range/height/cover, 200ms contact, 650ms recovery, 1,800ms message lifetime and world RNG remain unchanged.

The guard supports `--check` and `--candidate`, requires unique exact source matches, reverses every substitution to prove all original bytes are restored, and checks protected timing and RNG anchors. It has been written but not run. Default apply mode is for root's authorized integration only.

## Authored CPU coverage

`tests/cephalopodlab_strike_feedback.test.js` contains five cases, with `CEPHALOPOD_MODEL_SOURCE` selecting a saved baseline or candidate. The suite executes the actual source's clam-selection/branch predicate, prey-readiness function, contact-feedback block and `updateMission` function against real Three positions and a real jsdom mission brief.

- Paired far-prey failures must produce the same visible brief and announcement with or without an untouched nearby clam.
- Actual cover-blocked and uncommitted strikes must retain their appropriate failure explanation.
- Held E and latched forage suppress spurious misses only if the complete original gathering gate runs. Movement, the exact hit-delay boundary, cover, missing food and detritus remain rejected gathering cases.
- Eligible prey remains capturable without a false miss, including the existing simultaneous held-E path.
- Contact remains pending before its scheduled time, and the actual DOM brief hides and clears at the unchanged message-expiry boundary.

The CPU fixture observes entry into the actual drill branch without executing its meal body. The full meal and removal are covered by the real-browser positive control. CPU DOM checks cover the production hidden/text state; they do not claim pixel-layout visibility, which is checked separately in native Chromium.

## Authored native coverage

`tests/e2e/cephalopod-strike-feedback.spec.ts` contains three cases. It serves the selected baseline/candidate via `CEPHALOPOD_MODEL_SOURCE`, uses actual seeded crab/clam/rock objects and ordinary input handlers, and advances the real simulation in counted 50ms frames. Execution is intended to be serial with one worker, zero retries, video off and trace off.

- A paired no-clam button-strike control must show the existing miss. The same far selected crab beside an untouched reachable clam must still show that miss, while both actors survive and gathering progress/valve rotation stay zero.
- A real camera ray is verified to hit the selected crab before the pointer click. A real repositioned/scaled rock blocks the prey path but not the nearby clam path. The actual target readout must confirm cover obstruction; the click then must show the failure explanation without capturing prey or starting a meal.
- Held E must still open exactly one real clam without a spurious miss. Afterward, an eligible Strike-button control must capture the real crab at the scheduled 200ms contact while another nearby clam stays untouched, and the original recovery interval must remain enforced.

Miss assertions require positive DOM bounds intersecting the viewport, no hidden ancestors, visible computed display/visibility/opacity, and the expected visible text. Snapshots retain raw text and hidden state separately so stale hidden DOM cannot masquerade as user feedback. The two failure cases attach real screenshots as well as structured evidence. Eligible captures and full clam meals are mandatory positive controls, not assumed from metadata.

These fixtures reposition existing actors and park incidental encounters for controlled reach/cover comparisons. They do not fabricate prey or bypass the gameplay capture/drilling handlers. The exact baseline expected failures and candidate outcomes are still pending root execution; no green count or reproduced failure is claimed yet.

## Visual regression boundaries

The proposed model change is confined to the Humboldt squid's named siphon subtree. Its existing limbs, 208 cups, fins, eyes, mantle, rig clock, directed club contact and all eleven other animal rigs remain protected. Any old whole-rig fingerprint migration must exclude only the intentionally changed named subtree and prove the narrowed baseline against the saved original source before updating expectations. The cuttle-surface suite additionally fingerprints Humboldt material/shader state and must retain protection outside the changed material.

The approved environment proposal appends four closed floats at existing kelp leaf bases. Existing kelp vertex/index prefixes, every seagrass byte, seeded placement, shader flex, resource ownership and pause/reduced-motion semantics remain regression boundaries. Model/environment authors own their dedicated new CPU tests; native visual cases and any old-test migrations require root's separate assignment and final contracts.
