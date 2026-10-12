# Machine Lab: efficiency-aware effort and travel planning — October 12, 2026

The Efficiency & calculation lab now contains an optional “Plan effort and travel with efficiency” view. It connects the existing Design within limits inputs with an assumed efficiency and shows why increasing mechanical advantage helps effort but costs hand travel. The original design search continues to use its ideal model.

Three aligned rows show the effort condition, travel condition and their overlap on one linear MA scale. Solid, striped and crossed fills distinguish the rows without relying only on color. A dashed marker locates the current machine in every row. A reversed interval has no overlap fill; exact equality has a separate point marker and a zero-width interval. Tiny intervals have no artificial minimum width. Precise endpoint values accompany the decorative bars.

The diagram explicitly describes an exact calculated interval. Existing fit checks retain their small numerical tolerance, so the explanation distinguishes those checks from exact interval endpoints. The axis includes the current MA and both endpoints; the effort condition continues beyond the displayed axis. The chart, four metric cards and practice support narrow screens, dark mode and forced colors.

Four new skills are available on each of the six stations:

| Skill | Calculation | Unit |
| --- | --- | --- |
| Minimum MA for effort | Load ÷ (efficiency as a decimal × effort limit) | × |
| Maximum MA for travel | Total hand-travel limit ÷ load movement | × |
| Efficiency at current MA | Load ÷ (current MA × effort limit) × 100 | % |
| Efficiency for a continuous MA interval | Load × movement ÷ (effort limit × travel limit) × 100 | % |

For a 400 N load moving 0.5 m, limits of 100 N effort and 3 m hand travel, and 80% efficiency, the minimum MA is 5 and the maximum is 6. A current MA of 2 needs 200% efficiency to meet the effort limit, which is impossible through efficiency alone. A theoretical different MA needs at least 66.666…% efficiency to permit an interval. The two efficiency thresholds answer different questions: improving efficiency cannot fix excessive travel at the current geometry.

The calculated continuous interval does not guarantee a legal station setting. Pulley segments must be whole numbers, ramp geometry has constraints, and controls have ranges. This feature does not apply settings or alter design suggestions. It assumes constant efficiency and does not check strength, starting friction or acceleration. Thresholds below 1% and above 100% remain visible instead of being clamped to the efficiency control range. New targets retain full precision in their cards, worked solutions and exported records.

Each station now offers eleven efficiency skills: the existing seven plus four planning skills, making 66 station/skill combinations. The existing practice workflow supplies unit checks, two progressive hints, worked solutions, Next skill and explicit saving. Each station keeps its latest saved efficiency calculation; saving replaces that station's previous efficiency work. There are no points or mastery claims.

New version-3 records snapshot numeric effort and travel limits alongside the task, geometry, efficiency, answer and hint/solution provenance. Validation reconstructs the calculations from those snapshots. Changes to live limits invalidate a planning draft and stale handlers, but do not rewrite saved work. Version-1 and version-2 records retain their existing format and grading. Invalid design limits leave the original seven skills available; selecting a planning skill shows a clear notice and keeps its selector available for recovery.

## Verification and scope

Frozen canonical/public SHA-256: `e10d476980428471e6ddd5d31f193da4d071f259d10cca7a275f8e34ae126b0c`.

The source proof against commit `86d2b7fc6` confines production edits to one added `efficiencyEnvelope` helper and the efficiency helpers/panel. Existing physical math, design search, power and compound labs, defaults, other views and export callers are byte-identical. Existing efficiency question calculations, answer grading and the guarded change callback are unchanged. The existing expanded-efficiency test updates only its expected skill inventory and two descriptive counts; every prior case remains.

Independent review checked mathematical dimensions, exact overlap/point/gap behavior, legacy signatures and records, immutable numeric limits, unavailable-question recovery and delayed-action guards. No implementation blockers remained before freezing the source. Final counts and source/test/screenshot hashes are recorded in `validation-summary.json` and its native process receipts.

All **569 cases across nine files and 26 observed successful native processes** pass: 96 new cases in five groups and 473 existing regressions in 21 groups. The final verifier reconstructs native assertion inventories and confirms that every case executed exactly once, with unchanged source/mirror/test hashes. Existing coverage includes work records, read-aloud, localization, grade bands, accessibility, station views and the earlier efficiency skills.

Native Chromium passes **907 checks across 12 scenarios**, with zero errors and an observed successful process exit. Five screenshots were visually inspected by both the browser author and primary agent. Checks include all four new skills at all six stations, exact point/tiny interval/tiny gap geometry, current MA outside either boundary, percentages outside the control range, invalid-limit recovery, legacy and new records, keyboard focus, narrow controls, dark/forced-color layouts and an actual downloaded work record.

- [Desktop planning view](browser/run-01/desktop-efficiency-envelope.png)
- [Dark phone planning view](browser/run-01/dark-phone-efficiency-envelope.png)
- [Dark phone calculation practice](browser/run-01/dark-phone-envelope-practice.png)
- [Forced-color planning view](browser/run-01/forced-colors-efficiency-envelope.png)
- [Forced-color calculation practice](browser/run-01/forced-colors-envelope-practice.png)

Use fresh output directories for reproduction and run heavy checks serially:

```powershell
node reports/machinelab-efficiency-envelope-2026-10-12/run-new-tests.cjs reports/machinelab-efficiency-envelope-2026-10-12/new-tests/rerun
node reports/machinelab-efficiency-envelope-2026-10-12/run-regressions.cjs reports/machinelab-efficiency-envelope-2026-10-12/regression-rerun
node reports/machinelab-efficiency-envelope-2026-10-12/browser/run-native.cjs reports/machinelab-efficiency-envelope-2026-10-12/browser-rerun
```

Passing claims require both native receipts and observed child exits. The report excludes generated browser HTML, temporary profiles and duplicate downloads from the commit. Validation is scoped to these suites and a native local React/THREE browser host; it is not a full application build, physical assistive-technology session, performance benchmark or deployment.
