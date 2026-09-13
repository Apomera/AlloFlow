# Board game follow-through enhancements

Completed locally on September 12, 2026. Not deployed.

## Available in the board game

- **Save or export learning results:** save up to 12 reports per account and application on this device, reopen them from board setup, and download CSV or full JSON. Saving again updates the same playthrough; a restart creates a separate report. Quota failures and unreadable records preserve existing data. Removing a report requires confirmation.
- **Suggested practice:** a learner can revisit missed or unanswered reviewed locations, and reinforce improvements after a retry. Practice preserves the recorded game, resources, and first/latest responses. Ongoing play only suggests activities that have already been reviewed.
- **Assessment coverage:** search and page through the full original assessment, including items beyond 100. Exact source-excerpt links are identified separately from unlinked items. These links show shared evidence, not equivalent assessment questions or proof of mastery. Downloaded reports retain totals and a bounded list of linked items; the full list stays in setup.
- **Optional rotating roles:** Navigator, Evidence Reader, and Builder rotate at new moves and stay stable through retries. Late joiners enter the next move's rotation. All learners can propose and answer, and may share or pass responsibilities. Teacher and learner views use the same saved participant list even when learner rosters are filtered for privacy.

Open **Saved learning reports** in board setup to inspect previous reports. During play, open **Learning trail** to find recommended practice. Turn classroom roles on in setup or from the teacher's classroom-role panel.

## Verification

- `regression-tests.json`: 330 passing tests across 20 board-game and assessment suites.
- `final-focused-tests.json`: 32 passing focused tests after the final role-panel and filtered-roster fixes, including the additional regressions.
- `browser-verification.json`: production components exercised at 1280, 390, and 320 pixels. Coverage item 251, actual CSV downloads, report recovery, nested Escape handling, targeted practice without writes, role toggling, and learner privacy passed. No detected accessibility violations or horizontal overflow in the tested screens.
- `classroom-live/verification.json`: four browsers using the production Class Mailbox adapter and a local Code.gs sandbox. 33 writes, 18 accessibility/layout scans, late joins, delayed/failed writes, pause/resume, completion, restart, role permissions, and classroom report saving passed. This was a simulated classroom, not a learner pilot.
- `integrity.json`: matching root/desktop board bundles, all three board loader URLs, and board localization. The bundle also matches the source build. Other concurrently edited modules were outside this integrity check.

The final live check found and fixed role assignment from privacy-filtered learner rosters. A browser check also found and fixed the role switch collapsing out of view when disabled. The live test now scopes current-move response controls separately from independent-practice controls.

## Ready for the next external step

[PILOT.md](PILOT.md) contains a 20-minute teacher-run pilot and observation sheet. A classroom pilot has not been conducted.

`dev-tools/validate_lesson_board_generation.cjs` prepares real provider checks for primary fractions, middle-school ecosystems, and secondary evidence evaluation, across all three missions. Automated playability and source-link checks are supplemented by pending educator review for accuracy, clarity, and age fit. Provider use is capped at six generation calls and six HTTP attempts.

The attempted real run is recorded in `ai-validation/validation.json`: **blocked by a missing credential, zero provider calls**. The browser connection was also unavailable to this task. The runner's automated tests use fixtures and do not substitute for real AI generation. Run it with a configured provider as described in the pilot guide.
