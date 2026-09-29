# Micro Lab: returning to evidence

Micro Lab now has a saved-work overview, a guided Gram-stain investigation, and more control over reviewing and revising evidence. Changes are local to the source and desktop web mirror.

## What changed

- **Home:** Six activity cards show recorded reports, checked estimates, observed staining stages, saved growth trials, resistance snapshots, and quiz progress. They identify unfinished revisions and missing explanations. Shortcuts preserve work and move keyboard focus into the activity.
- **Gram staining:** Learners predict dye retention, observe illustrated stages, compare two cell-wall models, and record an explanation. Both models contain rods and spheres. Original predictions remain visible; saved explanations survive draft edits and restarting.
- **Resistance notebook:** Up to eight explicit snapshots retain original settings, predictions, counts, explanation feedback, and notes. Resetting the current run preserves saved snapshots. Text and CSV downloads retain undefined resistant shares after extinction.
- **Mystery revisions:** Working notes and recorded reports have separate views. Pending changes are identified by field. Folding observation panels preserves citations. Learners can open the next unrecorded case, and downloads distinguish recorded evidence from current revisions.
- **Restored data:** Incomplete quiz attempts preserve valid answers and return to unanswered questions. Microscope progress and exports reject checked results from unresolved, cropped, or too-small views while retaining valid drafts.

## Validation and artifacts

**162 focused tests passed across 11 suites.** Six suites required a separate run after worker-startup timeouts; two interaction tests then passed in a targeted rerun. The detailed reports retain the initial failures and final results.

**All 16 browser scenarios passed across the completed runs**, including all four new workflows. Earlier action and context-teardown timeouts required targeted reruns. The static review tests now use screenshot evidence with video recording disabled, and the print check restores screen media before cleanup. The final isolated print scenario passed in 11.2 seconds.

Final results are recorded in `validation-summary.json`, with detailed unit and browser results alongside it. Browser tests exercise the working-tree tool in the local GlHarness, including keyboard controls, downloads, JSON restoration, and 320–390 px layouts. Screenshots and example downloads are in this folder.

The interface audit verified **1,442 extracted translation keys**, with no missing keys or stale changed defaults. The runtime mirrors match byte for byte, syntax checks pass, and the scoped diff has no whitespace errors. Unrelated registry entries are preserved. Validation is scoped to Micro Lab; no repository-wide build or deployment is claimed.

## Evidence limits

Gram staining is presented as a conceptual illustration. Stain response alone cannot establish species or antibiotic susceptibility. Its envelope models and adjacent reference language were checked against the [ASM Gram-stain reference](https://asm.org/ASM/media/protocol-images/Gram-Stain-Protocols.pdf?ext=.pdf) and [OpenStax staining chapter](https://openstax.org/books/microbiology/pages/2-4-staining-microscopic-specimens).

Version-1 saved microscope contexts did not store historical focus. Restored checked results validate the readiness conditions recoverable from the saved context; live recording continues to require adequate focus.
