# Board game focused play and learning review

Completed locally on September 12, 2026. Not deployed.

## What changed

- **Focus on current move:** a compact mission summary and a single activity column reduce the amount shown during play. Available locations and affordable constructions remain selectable. Learners can complete a whole mission in this view, switch back to the map whenever needed, and keep unfinished responses. Solo saves and learner-tab workspaces remember the selected view.
- **Change answer order:** independent practice can rearrange choices, configuration options, and ordering items while retaining the authored answer key. Common wording that depends on choice positions, such as "all of the above," keeps the original order. Each practice visit has its own correct/checked totals. These checks leave game results, resources, and saved reports unchanged.
- **Concept review:** classroom reviews and saved report previews now compare first and latest responses and identify three useful next steps: review a latest error, collect a missing response, or reinforce an improvement. Groups name the relevant activities. Unseen concepts are not automatically treated as missing responses, and retries do not inflate the comparison totals.

Choose **Focus on current move** from the board presentation controls. Open **Learning trail**, then practice, to find **Change answer order**. Open **Class learning review** or a saved learning report for the concept groups.

## Verification

`validation-summary.json` combines the latest results from the broad regression run and targeted reruns: **353 passing test cases across 22 suites**. The first run encountered a setup-hook timeout and three worker-start timeouts on the busy host. All affected suites passed when rerun with a longer setup allowance and a single thread worker. Raw reports retain that history.

`browser-verification.json` records completed missions at 1280, 390, and 320 pixels, including:

- A whole mission completed in focus view, with location responses and project construction.
- Focus preference and unfinished response restored after reload.
- Mixed-choice practice checked against the correct answer meaning, with no browser-save changes.
- Saved concept reviews and classroom groups for latest errors, missing responses, and improvements.
- No detected accessibility violations or horizontal overflow in the tested screens, including forced colors.

`classroom-live/verification.json` records a four-browser cooperative playthrough using the production Class Mailbox adapter and local Code.gs sandbox. The run passed 18 accessibility/layout scans, including late joins, failed/delayed requests, pause/resume, learner privacy, role permissions, completion, saved reports, and restart.

`integrity.json` verifies matching root/desktop board bundles, all three board loader URLs, and board localization. The source build check passed. Other concurrently edited modules were outside this integrity check.

The browser and classroom checks used authored fixtures. This pass did not conduct a real learner pilot or make external AI calls.
