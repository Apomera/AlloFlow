# Radiation paths and compact predictions — 2026-09-29

The studio now has six introductions. The new activity, **What can paper stop?**, sits between distance and shielding. It compares alpha without paper, alpha with paper, and gamma with paper. Each setup runs with one click. Students observe all three before explaining why a blocked signal does not mean the source stopped emitting.

The diagram and observation table give qualitative outcomes, with no invented count rates. Short cards introduce an alpha particle and a gamma photon as learners encounter them. Model notes describe the close source, ideal detector, omitted background, and limits of the schematic. The penetration comparison follows [NRC radiation basics](https://www.nrc.gov/facilities-safety/radiation-protection/radiation-and-its-health-effects/radiation-basics).

Across all six activities, the prediction panel starts open and folds into a one-line summary after the first observation. Students can reopen it with a pointer or keyboard. It remains open if reopened during further testing; resetting the experiment opens it for a new prediction. Existing observations, earned discoveries, hints, and other lab state remain available.

## Verification

- **38 unit tests passed**, including all three radiation outcomes, repeated and malformed observations, incorrect explanations, progression to shielding, prediction summaries, all six reset paths, and earlier saved progress.
- **Nine Chromium tests passed** using the actual app stylesheet. Checks include keyboard interactions and focus, 320px/390px layouts with larger text, all six activities, light/dark themes, reduced motion, selected states in forced colors, and axe scans. The new activity also completes with no browser or React console errors.
- Visually reviewed the alpha-blocked desktop scene, the completed comparison on a 320px screen, and the initial light-theme scene.
- Two isolated mutations were rejected at their intended assertions: making paper stop gamma, and unlocking the explanation after only two setups. Production source was reread to confirm it was unchanged by those mutation runs.
- Four source mirrors and 233 active studio keys match. The integration verifier and its negative cases pass, including production loader mapping and preservation of the original lesson implementation.
- Scoped `git diff --check` passes. The earlier broad legacy-audit limitation remains documented in README.md.

The local installer now writes checked existing files through a read/write handle, then truncates to the exact UTF-8 byte length. This avoids a Windows/OneDrive truncate-on-open failure observed during this pass. The existing pre-write comparison and post-write equality checks remain in place.

All work remains local and uncommitted.
