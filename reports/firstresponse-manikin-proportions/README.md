# First Response Lab: head proportions and palm clarity

The three mannequin heads now use representative proportions for their ages. The adult and child were oversized in the actual geometry, beyond the effect of the close-up camera. The infant's head also sat partly below the mat.

| Illustration | Before: body in head lengths | After |
| --- | ---: | ---: |
| adult | 5.33 | 7.02 |
| child | 4.46 | 5.99 |
| infant | 3.42 | 4.00 |

Measurements use exact transformed crown and shoe vertices in pose 0, without perspective. The head scale also controls the face, ears and cheek geometry. The posed cheek ray refits the supporting hand and its camera. Each resting head's back is now at Y 0.025, with 0.006 clearance above the mat. Independent triangle rays confirm the neck joins the skull and the hand retains its original cheek gap.

The adult and newborn targets follow [Montreal Children's Hospital's body-proportion reference](https://montrealchildrenshospital.ca/health-info/true-or-false-by-age-six-childrens-bodies-are-proportionately-not-very-different-from-those-of-adults/). The child is a representative illustration; [the 2024 anthropometry study](https://www.mdpi.com/2076-3417/14/16/7185) documents how children's ratios vary with age.

Palm and thumb creases now use narrow, tapered strips fitted to the rendered skin along both edges. This removes the broken, doubled appearance of tubes that crossed the palm between sparse anchor points. Their fitted centerline remains available for existing inspection checks.

## Validation

- Final source 16aceaa1b7d8bbd0ed869536b554451ddd2e5e3a832229e2e3322f8ad75f03e2; canonical and desktop copies are identical, 778717 bytes. Three unique production edits reverse exactly to accepted baseline 476c1562ef879cb20ac65efdbf290edff9b98fafde9dbd7866f3e612c5750935.
- The final candidate passed 11 geometry cases: 44 ribbons, 4,312 fitted vertices, 45 animation samples and 4,020 disposal events. Unrelated geometry and all materials remain exact when comparing the same head proportions. The independent head audit checked six age/pose cases for mat clearance, neck intersection and cheek contact; final head dimensions were also measured directly from the combined source.
- Three native Chromium workflows passed with one worker and zero retries: seven paired views and fourteen captures, all visually reviewed. These cover full figures for all ages, adult and infant near hands, and adult and child supporting hands. The checks confirm matching state/hierarchy, complete hand framing, cheek context, one canvas and renderer disposal.
- Five historical fixtures retain their recorded fingerprints through a strict reversible source adapter. Current supporting-hand camera, cheek and lifecycle checks still build the current source. The runtime, reusable checker and all five updated fixture files passed syntax parsing. Prior hash constants were preserved.
- Scope: geometry, camera framing and local browser rendering. Native rendering used ANGLE/SwiftShader. The full application build and complete test suite were not run.

## Preview

| View | Before | After |
| --- | --- | --- |
| Adult figure | [Before](native/adult-body-baseline.png) | [After](native/adult-body-candidate.png) |
| Adult palm | [Before](native/adult-near-baseline.png) | [After](native/adult-near-candidate.png) |
| Supporting hand | [Before](native/adult-support-baseline.png) | [After](native/adult-support-candidate.png) |
| Child figure | [Before](native/child-body-baseline.png) | [After](native/child-body-candidate.png) |
| Child cheek and hand | [Before](native/child-support-baseline.png) | [After](native/child-support-candidate.png) |
| Infant figure, 320 px | [Before](native/infant-body-baseline.png) | [After](native/infant-body-candidate.png) |
| Infant palm, 320 px | [Before](native/infant-near-baseline.png) | [After](native/infant-near-candidate.png) |

## Evidence and repeat checks

See [verification.json](verification.json), [geometry results](checks/results.json), [head dimensions](final-head-proportions.json), [head contact audit](head-rest-measurements.json), [browser results](native/browser-run.json) and [preservation.json](preservation.json).

From the project root, run: node dev-tools/firstresponse_manikin_refinement_check.cjs. This checks the current runtime against the preserved baseline and prints a summary; an optional fourth CLI argument saves the full results to a chosen file.

The initial browser attempt is retained in initial-native. It failed because the second mount initialized four empty saved-state maps that were absent in the first seed. The accepted run seeds those maps consistently. The checks were separated by age and given a 240-second budget per age based on the observed 133-second partial adult run. Results and assertions were preserved, with zero automatic retries. The original runner summary's stale workflow label is retained in native/summary-original.json; the corrected counter comes from the unchanged native test results.

An early numerical fixture assumed the entire scene was motionless during existing rescuer animation. That assertion was corrected to require stable crease buffers and transforms while comparing the remaining animation against its matching baseline. An intermediate assembly omitted the separate head-profile edit; it was caught before browser validation, its pending check was stopped, and the final source was rebuilt with all three guarded edits. The permission review timed out once during integration, then accepted the same scoped write on retry.

Clinical instructions, controls, saved progress and camera implementation remain unchanged. No staging, commit, push or deployment was performed.
