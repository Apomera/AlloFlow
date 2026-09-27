# Cephalopod Hunter: sixth enhancement pass

Work log (2026-09-27): COMPLETE locally. Scope: canonical Cephalopod module and its three exact desktop mirrors; new focused tests; this pass-six report folder. Root integrated the changes and reviewed the captures; delegated reviewers supplied guarded surface/tracking patches and regression tests. Shared handoff and unrelated work remain with their owners. No deployment or push.

Delivery status: this pass is included in the combined pass-six/seven change set. Earlier normal commit attempts encountered unrelated content-engine mirror drift during concurrent work; those files and the hook were left untouched. See the pass-seven validation record and Git history for the final scoped delivery.

Focus: improve squid eyes and skin, stabilize pursuit, and make guidance agree with the action the player can actually take.

## Work log

- Created a scoped work log before product edits, reviewed the existing rig and capture rules, then integrated independent guarded patches.
- Review found and corrected three feedback conflicts: queued selections replacing the displayed committed target after inspection, Observe hiding subsequent strike results, and a nearby unselected crab producing a misleading pounce hint.
- Initial captures prompted finer, softer skin pigment and a narrower, darker iris. Final images cover both eyes, desktop/phone inspection and live pursuit.

## Implementation

- Automatic targeting keeps a live prey through small neighbor changes. It acquires within 12 m, retains out to 14 m, and switches only when another prey is both at least 20% and 0.75 m closer. Explicit selection remains under player control.
- The target ring and strike feedback stay on the committed prey during the 200 ms wind-up, even when T queues another target. Inspection restores that same committed target, including the no-target case. Contact validation, capture thresholds and cooldown duration remain unchanged.
- The mission card separates prey identity/distance/bearing/depth guidance from action status and prey intent. Crab distance matches its horizontal capture rule; fish distance remains three dimensional. Rise/Dive appears when the height difference exceeds the relevant capture tolerance. Text and color both convey state.
- T and strike input interrupt the temporary Observe message so recovery and miss feedback are visible. Bottom hints use the actual selected prey, reach, cover, depth and cooldown; clam hints use the same forage readiness check as the action.
- Squid eyes now use curved silver iris caps, domed dark pupils and upper skin folds. A restrained view-dependent shader reflection suggests the water/surface above; it is stylized, not a captured environment map. The head and collar are reshaped in existing geometry.
- Squid skin uses fine red pigment variation, a softer broad red field and a paler underside. Animal-space coordinates keep the pattern aligned across mantle, head, arms and fins as the squid turns. Shader program keys separate the squid path from other species. No flashing or time-animated reflection is added.
- Other species retain their existing eye/material path. The squid still uses 28 meshes, with no extra draw calls or textures; the replacement eyes reduce the rig's geometry by about 808 vertices. The skin retains three noise evaluations per fragment and adds one inverse root matrix update per simulation frame. There are no new RNG draws.

## Validation

- 194/194 unit checks across nine files passed before final surface and wording refinement; four canvas/accessibility/parity checks passed again on refined source.
- All four new pursuit scenarios passed first run: both automatic switch margins and 13 m retention; committed-target ownership through T and paused inspection; signed depth guidance, Observe interruption and correct miss/hint feedback; and phone layout with larger text, inspection and target loss. These ran before the final material-only refinement.
- All eight existing hunting scenarios passed: seven foraging/strike cases and the explicit-selection/repeated-capture regression. Low/balanced rendering passed, checking actual pixels, shader/runtime errors, finite geometry and scene-texture disposal. The rig/context scenario also passed across all twelve species. This pass has fourteen distinct passing browser scenarios, all on their first run.
- Seven final captures were reviewed at 1280x1100 and 390x844, with zero runtime/console errors. They use normal game and inspection controls; no actor, mesh or material positions are overridden for the images.
- Browser suites run serially, with one worker and zero retries. Raw logs, JSON and traces remain local and ignored; the validation summary is tracked.
- The actual GPU-compiled Three r128 pupil fragment contains the reflection and its final light contribution, compiled successfully and produced no browser errors. This verifies that the shader hook is active, beyond JavaScript/string checks.
- Syntax, whitespace and four-copy parity pass. Source SHA256: `9c953559a167f2e95389bcc4bf0ae71cb3b33c08edd05c483eff32baf61186f6`.

## Review images

- [Squid profile](squid-profile.png)
- [Three-quarter view](squid-three-quarter.png)
- [Eye close-up](squid-eye-detail.png)
- [Opposite eye](squid-opposite-eye.png)
- [Phone inspection](phone-inspection.png)
- [Desktop pursuit](pursuit-desktop.png)
- [Phone pursuit](pursuit-phone.png)
- [Validation record](validation-summary.json)

Run `node reports/cephalopod-hunter-enhancement/serve-preview.cjs` and open its address with `?species=humboldtSquid&mode=observe`. Press **F** to inspect. `visual-review.cjs` reproduces the review images.

## Visual references and limits

The red and pale palette draws on [MBARI's Humboldt squid observations](https://www.mbari.org/news/deciphering-the-visual-language-of-humboldt-squid/) and [Stanford Gilly Lab's description of Humboldt chromatophores](https://gillylab.stanford.edu/chromatophores). This is an illustrative procedural rendering, not a calibrated reconstruction or a simulation of the animal's signaling language. No imagery or textures from those sources are bundled into the simulator.

Software-rendered WebGL checks do not establish a physical-device frame-rate target. No release build, push or deployment was performed.
