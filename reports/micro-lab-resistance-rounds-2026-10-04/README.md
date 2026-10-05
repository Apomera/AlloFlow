# Micro Lab: inspect saved Resistance rounds

Learners can choose any round observed in both saved snapshots, including round 0, and return to the latest shared round. The comparison table, text report, CSV and download filename use the selected round. Each snapshot’s saved endpoint, original prediction and full history stay separate from the comparison counts.

An explicit round survives JSON reload. Changing either snapshot resets the choice to the latest shared round. Missing or identical snapshots disable comparison, and malformed imported round preferences display the latest available counts. The core rejects explicit unobserved, fractional and nonnumeric rounds. Extinct populations retain an undefined resistant share.

Snapshot and round controls apply their intent to the latest raw state. They preserve imported metadata, long notes, recovery records and unrelated activity data, reject replaced imports and later choices, and repair only the explicitly selected record’s ID. A delayed clear cannot affect an unresolved record that became valid while the update waited. Inspection and download leave the live culture, RNG and XP unchanged.

## Validation

- **1,027 unit checks passed across 27 files**, including 86 new checks.
- **78 Chromium scenarios passed across 12 specs in one complete run**, including eight new scenarios. No retries, skips or flaky results.
- Desktop, 320px phone and 400% zoom screenshots were inspected. Controls and tables remain usable, with visible keyboard focus.
- Runtime mirrors agree. All 1,901 source-used interface labels have registry coverage; both Micro Lab namespaces match.

The first focused browser attempt found that a native disabled button dropped focus after “Return to latest” was activated. The shortcut now retains focus and announces its inactive state with `aria-disabled`. That earlier 6/8 report remains alongside the final passing suite. The earlier 82-case focused unit report also remains; the final suite includes the later ownership fixes and four additional regressions.

[Validation summary](validation-summary.json) binds the final source hash to runner receipts, raw results and captured test/support inputs. Supplementary PNG-helper evidence is explicitly labeled as an observation after the browser run and checked against its earlier modification time and parent Git blob.

## Local save

The prepared tree continues verified Micro Lab commit `36d70aaa` on a new local branch. It includes Micro Lab runtime changes, the two new test files, these validation artifacts and eight comparison interface labels. Translation registry blobs are built from the parent with only those eight labels changed, excluding unrelated working registry edits. Private Git indexes preserve the shared checkout and staging. The independent commit verifier checks every owned blob, inherited tracked validation input, registry patch and save receipt.
