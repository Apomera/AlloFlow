# Water Cycle: clearer comparisons and evidence choices

The comparison workspace now helps learners manage a baseline, inspect signed model changes, check a claim, and save the observation. Narrow panels give each step room, and keyboard focus follows the revealed result.

## What changed

- Explicit baseline action names and linked help explain Restore, Save current, and Clear.
- Full reading names, Baseline/Current values, solid/patterned lanes, circle/square markers, and plain change labels replace abbreviated legends and duplicate compact readings.
- A scope guide defines signed change and independent teaching indices. Partial legacy baselines identify missing-input display defaults.
- A native Pathway mix disclosure separates relative branch shares from the three independent teaching readings.
- Named containers adapt reading cards and claim choices to the tool's actual width. The prior 390px embedded host squeezed three cards into about 91px each; the corrected preflight gave each card about 298px.
- Full claim labels and visible names in accessible action names support clear choices and speech control.
- Deferred focus follows claim selection, Choose again, Save observation, Restore and Clear. The existing isolation focus behavior is preserved.
- Dark text contrast and forced-color text, bar patterns and disclosure cues are verified.

These changes retain all existing model formulas, thresholds, scenario handlers, stored observation values, undo behavior, and writing. The native disclosure is folded initially and remains available when learners want to inspect the relative pathway view.

## Visual review

| View | Baseline | Final |
| --- | --- | --- |
| Phone reading cards | [Before](one-change-light-320.png) | [After](final-light-320-one-input-comparison.png) |
| Desktop comparison | [Before](one-change-light-1280.png) | [After](final-light-1280-one-input-comparison.png) |
| Narrow embedded readings | [Before](one-change-light-1280-host390.png) | [After](final-light-1280-host390-one-input-comparison.png) |
| Narrow embedded claim choices | [Before](claim-options-light-1280-host390.png) | [After](final-light-1280-host390-one-input-claim.png) |

The baseline audit found that claim selection, Choose again and Clear sent keyboard focus to BODY. The first complete candidate also exposed the same loss after Save became disabled. Final checks verify a persistent destination for each handoff. Both baseline and current bar lanes remain visible throughout.

## Final verification

- **129 distinct tests passed:** 25 focused semantic/visual/prediction/baseline tests and 104 notebook, auto-baseline, next-test, trail and replay regressions across nine files. No skipped tests.
- **788/788 browser checks passed**, with 137 snapshots across eight configurations.
- **16 scoped axe audits passed** across Scenario Compare and claim interpretation. This review does not audit every tool mode.
- Native Enter/Tab flow, all baseline actions, one/many input isolation, exact model readings, independent scales, disclosure behavior, legacy defaults, saved evidence and responsive geometry were checked.
- The paused infiltrating parcel stayed at progress 0.37. Prior evidence and writing survived the workflow; a newly saved observation remained intact during resize.
- Twenty-four Acorn calculation/state slices and two full derivation ranges match the frozen baseline after CRLF normalization. Source, public mirror and frozen final runtime match.
- Syntax, scoped whitespace and empty staged-file checks passed. Owned QA browsers and servers closed. All changes remain uncommitted.

Final runtime SHA-256: `942198fca1f8aae4c530764920afa5ed2fbd10c29b4fee68d7e4be560814d776`.

Frozen baseline SHA-256: `239edf53b437848623cec592f72644ee69e6eb000b887e113175e09740b16003`.

Recheck saved evidence from the repository root:

```sh
node reports/watercycle-comparison-clarity/verify.cjs
```

Reports: [verification summary](verification-summary.json), [browser results](results.json), [focused results](unit-results.json), [regressions](regression-results.json), [baseline findings](baseline-findings.md).

## Method and diagnostics

Reviews use the actual frozen runtime in isolated Chromium on owned ephemeral localhost servers. The existing learner preview and tabs are separate from QA. Readings are checked against the production model; formulas are not duplicated in the harness.

The 60c candidate preflight passed 418 checks across phone, desktop and embedded views. The completed b85 diagnostic then identified two contrast audit failures: neutral change text was 4.47:1 in dark mode, and the changed-input span retained a pale color in dark with forced colors. Its after-save snapshots also proved focus fell to BODY. Scoped CSS and a Save focus wrapper corrected these before the final complete rerun. Earlier reports and captures remain separate from final counts.

The first focused test run had a first-render duration timeout. A later new assertion counted an aria-hidden emoji as visible claim wording. The host timeout and label extraction were corrected, then all 25 final tests passed. The initial regressions had two stale source assertions: the intentionally changed Save name and an older clear-trail literal that omitted its existing undo field. The latter was already absent from the frozen baseline; its assertion now permits additional fields while checking the cleared observation/replay state. Diagnostics and baseline proof are preserved.
