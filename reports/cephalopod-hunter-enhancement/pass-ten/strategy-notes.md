# Prey memory and readable intent

The school already checks rock cover, ink, depth and approach distance before raising its alarm. Its escape heading nevertheless used the player's current position while alarm decayed, so hidden movement still steered frightened fish. The HUD also called a partly alarmed school “unaware” despite its increased swimming speed and formation spread.

The proposed guarded patch fixes this narrow inconsistency. A school stores the horizontal position of the last visible threat and steers away from that snapshot after losing sight. Seeing the player again refreshes it; reaching zero alarm or the existing cuttlefish display interruption clears it. The school returns to its existing wandering behavior when alarm drops below the existing escape threshold.

## Scope and integration

- Run `node reports/cephalopod-hunter-enhancement/pass-ten/apply-prey-memory.cjs --check` to check four exact source guards, syntax and deterministic behavior without writing.
- Root runs the same command without `--check` once to integrate into `stem_lab/stem_tool_cephalopodlab.js`, then performs the established mirror synchronization.
- The script preserves source line endings and unrelated edits. It does not match a whole-file hash.
- New helper `advanceCLHuntSchoolThreat` holds the existing alarm and steering calculation. Its only behavioral difference is where the threat position comes from after sight is lost.
- Existing detection ranges, cover/ink/depth checks, camouflage factors, alarm growth/decay, steering factor, speed, spread, fish geometry, strike timing and capture rules stay unchanged. No new controls, meter, announcements or save state are introduced.

## Observable feedback

`school.lastThreatPosition` is a copied `{x,z}` value, never a reference to the player. Live fish expose `userData.awareness` and `userData.threatVisible`; `userData.alert` retains its existing threshold and semantics.

The selected target's existing action line appends:

| School state | Intent | Text |
| --- | --- | --- |
| Visible, alarm at or below 0.3 | `wary` | prey is wary · use cover |
| Visible, alarm above 0.3 | `fleeing` | prey is fleeing |
| Out of sight, alarm remains | `settling` | prey is settling · stay out of sight |
| Alarm is zero | `unaware` | prey is unaware |
| Individual fish affected by display | `distracted` | prey distracted by display |

Wary is deliberately brief because the existing alarm rises at 1.8/s; this pass does not lengthen the reaction window. Settling indicates declining alarm, including the initial continued escape. The existing crab intent wording and cuttlefish display behavior are preserved. These are gameplay states, not a calibrated scientific model.

## Validation boundaries

`tests/cephalopodlab_prey_memory.test.js` executes the integrated numeric helper extracted from canonical source. It checks the original alarm budget and threshold, copied memory, no reads of hidden player position, paired identical steering after different unseen movements, visible reacquisition, calm/display clearing, finite heading seams and wording.

The separately owned `tests/e2e/cephalopod-prey-memory.spec.ts` will use actual schools and rendered movement to validate visibility transitions, loss-of-sight steering and readable intent. Browser execution remains held until root releases the slot. Existing display/fish-tail/committed-strike regressions remain relevant; they must not be weakened for this change.

Source anchors: `spawnSchool`, `schoolSeesPlayer`, `updateTargets`, `preyReadiness`, and the `Fish school AI (flocking-lite)` loop in `stem_lab/stem_tool_cephalopodlab.js`. The only new state is transient, scalar/plain-object school data; it creates no GPU resources and needs no disposal hook.
