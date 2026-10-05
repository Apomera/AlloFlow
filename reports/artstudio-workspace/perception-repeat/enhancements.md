# Perception Lab: repeated matching studies

Updated October 3, 2026. Changes are left uncommitted.

Brightness, circle-size, and line-length matching now support a three-match study. The reference and surroundings stay fixed while the comparison starts at three different positions. Each match needs an explicit impression and keeps its own note. Recording the next match clears the previous impression and note.

The drawing values stay hidden until all three matches are recorded and the learner chooses **Reveal study results**. The results show the reference, starting positions, three matches, their median, minimum and maximum, range, and signed median difference. Brightness differences use RGB-code steps; geometric differences also include a percentage of the reference. These are descriptions of a small set of drawing matches, not a score or calibrated display measurement.

## Saved observations

- Each recorded match carries a study identifier, trial number, and starting value in the existing notebook and JSON export. Legacy observations retain their original shape.
- **Review study** gathers the three saved matches. A saved study has its own reveal action, which preserves the current drawing and pinned comparison.
- **Repeat these settings** starts a fresh study from a saved matching observation, opens the controls, and moves focus to the comparison slider.
- Missing matches, duplicate trial numbers, and conflicting settings cannot produce a combined summary. Delete and Undo preserve study associations and order.
- The notebook retains its latest 24 observations. An active study is local to the mounted tool; recorded matches remain saved if the study ends, the tool reloads, or the profile changes.

## Interaction and reliability

During collection, context controls are locked and previously revealed notebook and pinned drawings are temporarily hidden. Those views return after the third match or after ending the study. Every match begins with a fresh impression; repeated activation cannot create duplicate trials.

The final recorded match moves keyboard focus to Reveal, revealing moves focus to the results heading, and ending returns focus to the comparison slider. Starting from a saved observation also works when the controls were collapsed. Settings or notebook replacement ends the active block. Deleting one of its recorded matches removes the cached live summary, and stale Reveal actions expire without restoring deleted records or retaining a success announcement.

The results table explicitly uses the theme's foreground and background colors. Trial badges appear on their own line, and narrow layouts stack the summary cards. The visual stimulus keeps its fixed white background in dark and forced-color themes.

## Verification

The detailed counts and source hashes are in [validation.json](validation.json). The final regression evidence combines each test file's latest passing run and retains the initial catalog failure alongside its isolated successful retry.

- 212 distinct tests passed across 11 files: 92 existing Perception tests, 69 new repeated-study/notebook tests, and 51 catalog, routing, and Optics integration tests.
- 47 Chromium groups passed: 17 new repeated-study groups, 14 existing matching groups, and 16 existing Observe groups.
- The new browser suite checks all three studies, hidden results, keyboard focus, per-trial notes, saved review and repeat, Delete/Undo, stale batched actions, profile changes, double activation, JSON and SVG downloads, and 320/390/768/1280/1600-pixel layouts.
- Automated accessibility checks found no WCAG-tagged axe violations in the tested collection and summary views, including dark theme. Large-text reflow and forced-color stimulus preservation passed. Desktop, phone, and dark previews were visually reviewed.
- Root and desktop plugin copies are identical. All 214 Perception English entries and experiment labels are synchronized. Discovery checks preserve all 150 previous catalog records and the 151-tool index; routing and loaders still resolve Perception Lab.

The initial combined regression run passed 142 of 143 tests. Its catalog-generator test reported a generic `STACK_TRACE_ERROR`; the complete catalog test file then passed 11 of 11 in isolation. No test assertions were relaxed. This is recorded in the validation evidence rather than presented as one clean combined run.

## Previews

- [Three-match line-length results](repeat-mullerLyer.png)
- [Saved-study review on a phone](repeat-review-390.png)
- [Dark-theme review](repeat-dark.png)
- [200% text](repeat-large-text.png)
- [Exported notebook](repeat-notebook.json)
- [Revealed line-length drawing](repeat-revealed.svg)

Implementation: `stem_lab/stem_tool_perception.js` and its desktop mirror. Tests: `tests/perception_lab_repeat_study.test.js`, `tests/perception_lab_repeat_notebook.test.js`, and `dev-tools/perception_lab_repeat_qa.cjs`. The existing six experiments and free matching workflows remain available.
