# Nuclear Lab: guided first discovery

Verified October 1, 2026. Changes remain uncommitted.

## Learner experience

- Fresh studio state opens **Move a detector. Make a discovery.** Existing selected experiments, recorded work, notes, and advanced activity data preserve the previous studio entry. Existing learners can open the guide from a collapsed invitation.
- Four visible steps show what is done, current, and next: predict, read at 1 m, read at 2 m, and explain. Each step offers one main action. A prediction alone leaves the readings unrecorded.
- Taking a reading records the actual model result. The first result is 100%; the second is 25%. The detector continues showing the saved first reading until the second action runs.
- Both readings appear on a common 0–100% scale before the explanation. A retry names the fixed source and the two readings. A correct explanation records the distance discovery and offers the radiation-path experiment next.
- The guide and free distance experiment share the saved distance data and the same inverse-square calculation. Switching views, opening free exploration, and browsing another experiment preserve readings, predictions, notes, and unrelated work.
- Restart clears the active comparison and keeps an earned discovery and takeaway. Invalid data cannot display a complete comparison or award completion automatically. Mounting the guide leaves saved state and keyboard focus unchanged.
- Choosing a prediction or recording a reading focuses the next step heading. Retries keep focus on the answer. Opening the experiment chooser focuses its summary.

## Verification

- **139 unit checks passed**, including nineteen new checks for first-time entry, predictions, actual measurements, grading, focus, saved routes, shared evidence, restart, malformed data, and translation.
- **All 37 unique studio browser checks were verified across the full run and focused rerun.** The initial full run passed 35 checks, found a forced-color caption issue in the new mobile guide, and skipped the final serial check. After adding an explicit system-color override, all three guide checks passed, including the previously skipped saved-work check. Existing half-life fixtures now explicitly select half-life; the new checks exercise fresh entry.
- Guide browser checks cover desktop and 320 × 844 px layouts, larger text, reduced motion, the light palette, forced colors, keyboard actions, visible next actions, 44 px minimum controls, and horizontal overflow. Completing the guide and restarting it preserve the earned discovery.
- Automated WCAG 2 A/AA and WCAG 2.1 AA audits passed in the final tested guide states, including the forced-color reading and evidence stages. Captions and diagram colors use system colors in that mode.
- Inspected screenshots: `first-discovery-desktop-start.png`, `first-discovery-mobile-start-light.png`, `first-discovery-mobile-reading-light.png`, and `first-discovery-mobile-evidence-forced.png`. Desktop evidence is also captured in `first-discovery-desktop-evidence.png`.
- Isolated mutation `first-model` replaced the inverse-square calculation with inverse distance. The browser assertion rejected 50% in place of 25%.
- Isolated mutation `first-evidence` displayed the two-reading chart after only one recorded reading. The browser assertion rejected one chart in place of zero.
- Isolated mutation `first-saved-route` forced the guide over an existing selected experiment. The browser assertion rejected one guide in place of zero. All three checks confirmed that production source remained unchanged.
- All four module copies match and parse. All **482 active studio translation keys** match across four registries; this pass adds 33 keys. Production loader wiring and negative static self-tests passed.
- Code outside the studio fragment matches `first-discovery-before.js`. Nucleus Builder, Signal detective, counting, and radiation-path functions match the baseline. The standard starter function changes only its distance formula wrapper to call the shared calculation. Scoped whitespace checks passed.

## Artifacts

Authoring: `scratch/nuclear-engagement/first-discovery.js`, `studio.js`, and `install.cjs`. The installer includes the new component and synchronizes the source, three mirrors, and translation registries.

Results: `first-discovery-unit.json`, `first-discovery-browser-results`, and `first-discovery-final-browser-results`. The initial unit fixture failures are preserved in `first-discovery-unit-initial.json`; the initial browser contrast failure and trace remain in the full-run artifact folder.

Negative-check logs: `mutation-first-model.txt`, `mutation-first-evidence.txt`, and `mutation-first-saved-route.txt`.

[Open the guided introduction](http://127.0.0.1:61057/__harness?intro=20).
