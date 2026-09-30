# Micro Lab notebook recovery and evidence comparisons

September 30, 2026

## Changes

- **Resistance recovery:** removing a saved snapshot keeps one recoverable record with its original ID, list position, counts, prediction, notes, and later reflection. Restore returns it to the notebook; Keep removal clears recovery. A distinct successful save or another removal replaces recovery. Duplicate and unsuccessful saves preserve it.
- **Home recovery:** Home shows the removed record without counting it as saved or unreflected evidence. Its shortcut opens recovery without restoring or changing the notebook. Full imported notebooks focus the recovery panel and explain why restoration is unavailable.
- **Microscope CSV:** download current checks, previous checks, and pending drafts in specimen order. Every row uses its own viewing calibration. Drafts retain their text and units without reference scores; invalid numeric input has no conversion. Formula-prefixed text is protected and quoted multiline fields are preserved. Download feedback clears when evidence changes, including changes that are later reversed.
- **Mystery report comparison:** review the fields that differ between current and previous saved reports, including observations cited by only one version. Each side includes the original cited observation text. Restoration swaps the saved versions and preserves working notes and presentation settings.
- **Keyboard navigation:** deferred focus respects subsequent local actions, navigation, and remounts. Home activity cards now sit within the panel linked to the selected Home tab.

## Validation

| Check | Result |
| --- | --- |
| Focused unit regressions | 401 passed across 13 files; 45 added this round |
| Chromium scenarios | 24 passed; five new and 19 retained; no retries or skips |
| Translation audit | 1,666 extracted keys; no missing keys or changed established fallbacks |
| Runtime copies | Canonical and desktop source match byte for byte |
| Phone review | Recovery shortcut, removed evidence, measurement notebook, and saved-report comparison reviewed at 320 px; no page overflow |

The browser checks use the local working tree. They exercise recovery, comparison membership, active-only exports, full imports, download failure and retry, saved calibration, unscored drafts, JSON reload, report swaps, and retained notebook and navigation workflows. Unit checks additionally cover malformed inputs, ID repair, evidence immutability, playback and XP preservation, and interrupted focus requests.

The initial unit run passed 400 checks and failed a new test that used `growth` instead of the actual `growthLab` tab ID. The initial browser run passed 23 scenarios and failed a new test whose imported citations were listed outside their canonical order. Both fixture issues were corrected; the complete focused suites were rerun. Initial reports and browser failure artifacts remain available for inspection.

## Evidence

- [Validation summary](validation-summary.json), [unit results](unit-results.json), [browser results](browser-results.json), and [translation audit](translation-audit.json).
- [Home recovery](resistance-recovery-home-phone.png), [removed snapshot](resistance-removed-evidence-phone.png), [microscope draft](microscope-csv-drafts-phone.png), and [Mystery comparison](mystery-history-comparison-phone.png).
- [Active Resistance CSV after removal](resistance-active-after-removal.csv).
- [Microscope checks and drafts CSV](microscope-checks-and-drafts.csv), [restored export](microscope-checks-and-drafts-restored.csv), and [pending-only CSV](microscope-pending-only.csv).

## Limits

Recovery stores one removed Resistance record. An imported notebook with eight active snapshots retains recovery but cannot restore it until there is capacity; removing another record replaces the recovery slot. Removed evidence remains excluded from counts, comparisons, and downloads until restored. Restoring a snapshot does not reselect it in a comparison.

Microscope CSV rows describe the calibrated teaching drawing. Draft readiness is not confirmed, and historical focus is not stored. Drafts receive no reference score. The existing text notebook continues to export checked results only.

Mystery keeps one previous report per case. A new changed report replaces that previous version. Current and previous labels identify saved roles; restoration can swap them repeatedly.

The commit helper includes Micro Lab files, its translation namespace, focused tests, and these artifacts. It preserves unrelated working changes and staging, and runs the installed commit checks. No deployment or remote publication is part of this change.
