# CircuitTool: useful guidance before a second observation

The notebook now compares the live circuit with its sole saved observation and gives a next step that fits the difference.

| Live circuit versus observation 1 | Guidance |
| --- | --- |
| Settings and probes match | Choose one change |
| One setting differs; probes match | Ready for a second reading |
| One setting and probes differ | Check the probe connections; recording remains available |
| Only probes differ | Explore another measurement |
| Several settings differ | Document the combination or repeat with one change |
| Several settings and probes differ | Return to the saved setting/probe combination for a test of one cause |
| Circuit type differs | Save a separate circuit observation |

The guidance uses normalized settings and ordered probe connections, so changing an inactive control or a note does not create a new experiment. Distinct inputs still count as a change when saturation produces the same lamp current. A legacy observation that cannot be compared keeps the existing general guidance.

The existing recording button, saved notes, comparisons and focus behavior remain intact. The cue appears with exactly one observation; the existing comparison takes over once a second observation is saved. It uses the current render and adds no stored state or live announcements.

## Verification

All **80 tests across five files** passed, including 18 focused guidance cases. Coverage includes all guidance states, equal-current saturation, inactive controls, normalization, duplicate and second recording, import/removal/restore, translation, and writing continuity.

All **eight browser views** passed and were inspected by both reviewers. They cover desktop and phone layouts, actual doubled text, forced colors, and translated right-to-left reading. Seven native cue states, two recording transitions, two keyboard disclosure actions, and sixteen focus checks passed.

Both source copies match. Reversing the two recorded changes reproduces the previous verified source byte for byte. No solver, persistence, report format, history, lesson or AI request code changed.

An earlier incomplete test invocation is [archived with an unknown outcome](incomplete-attempt.json) and contributes no verified coverage. The 80 tests above come from the fresh completed run with unchanged inputs and flags.

The first browser run is also retained: its fixture reset the wrong notice key after a successful second recording. Pixel review withheld approval because that old notice contradicted the one-point fixture. The [exact fixture correction](harness-correction.json) and corrected eight-view run preserve the product source and all other audit assertions.

- [Regression results](regression-raw.json)
- [Native regression receipt](regression-receipt.json)
- [Browser measurements](browser-results.json)
- [Visual review](visual-review.json)
- [Root screenshot review](root-visual-review.json)
- [Independent source review](independent-review.json)
- [Source preservation](source-preservation.json)

Changes remain uncommitted and unstaged.
