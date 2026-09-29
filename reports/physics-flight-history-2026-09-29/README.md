# Physics: inspect recent recorded flights

The simulator can now inspect any of its five retained flights. Choosing a run keeps the canvas, time controls, velocity graphs, measurement table, and full CSV export on that flight's original samples.

## Improvements

- A labeled flight chooser identifies each run, drag setting, angle, and launch speed. It supports keyboard selection and uses controls at least 44px tall.
- The experiment log opens retained flights directly. A link requires matching run number, model, launch parameters, impact time, range, and maximum height. A restored summary cannot open unrelated samples with the same run number.
- The selected trajectory gets the speed colors and strongest stroke. Other retained trajectories fade so paired vacuum and drag flights remain easy to distinguish. Live impact sparks stay hidden during recorded inspection.
- Apex and landing annotations use the selected flight's own recorded evidence. The exact apex is retained when the engine resolves it; the highest sampled point remains a separate inspection control.
- Scrubbing an older flight pauses the current simulation without moving its ball or changing its evidence. Resuming or stepping continues the current flight. Closing inspection returns the graphs and table to the newest flight.
- CSV export follows the inspected flight and includes every recorded point with its captured launch metadata.

## Retention

Original samples are available for the five most recent flights in the current mounted session. Clearing trails, unmounting, or exceeding that limit removes sample access. Older and restored log rows retain their summary measurements. The inspector never reconstructs a flight from a saved summary.

## Verification

- 159 unique physics unit checks passed across 13 files. A cold OneDrive scan and worker startup timed out initially; both affected files passed on rerun.
- The full browser suite passed all 46 scenarios with retries disabled. After the final export and provenance changes, all 13 history and sample-inspection scenarios passed again.
- Nine visual combinations passed. New text is at least 12px. Minimum measured contrast is 5.19:1 in the default theme, 6.79:1 in dark, and 15.30:1 in high contrast. Page overflow is zero, and canvas glyphs fit their bounds.
- Inspection preserved every original sample, captured parameter, live ball state, experiment record, and last-flight summary in the visual audit.
- Source and desktop mirror, physics English strings, JavaScript syntax, and whitespace checks passed.

The six new browser scenarios cover paired runs, synchronized measurements, keyboard scrubbing, CSV provenance, restored summaries, retention, paused playback, and 320px controls in all three themes. The physics CI workflow includes them.

## Visual review

The audit renders real React, application styles, and English strings at 1100px, 375px, and 320px in default, dark, and high contrast themes. It checks actual canvas glyph bounds, text contrast, page overflow, captured parameters, and unchanged flight evidence.

| Theme | Desktop canvas | Phone chooser | Phone inspector | Phone graphs |
| --- | --- | --- | --- | --- |
| Default | [Canvas](history-default-1100-canvas.png) | [Chooser](history-default-320-chooser.png) | [Inspector](history-default-320-inspector.png) | [Graphs](history-default-320-graphs.png) |
| Dark | [Canvas](history-dark-1100-canvas.png) | [Chooser](history-dark-320-chooser.png) | [Inspector](history-dark-320-inspector.png) | [Graphs](history-dark-320-graphs.png) |
| High contrast | [Canvas](history-contrast-1100-canvas.png) | [Chooser](history-contrast-320-chooser.png) | [Inspector](history-contrast-320-inspector.png) | [Graphs](history-contrast-320-graphs.png) |

Reproduce the visual audit from the repository root:

```powershell
node reports/physics-flight-history-2026-09-29/verify-history.cjs
```

The final audit writes [history-results.json](history-results.json), including the source hash, evidence hashes, measurements, screenshots, and failures.
