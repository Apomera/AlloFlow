# Groundwater inspection workspace

The selected observation now sits beside its selectors and before the cutaway and pore view. Selecting a zone keeps native keyboard focus and scroll position. The full authored explanation is available under **Understand this zone**; the existing unscored practice remains below it.

The Explorer lens spans the chapter grid. Both figures share one row when space allows and stack on narrow screens. Smaller gutters and an SVG that follows its aspect ratio reduce unused mobile space. Very narrow containers give the layer labels their own row so enlarged text remains readable.

## Verification

- 82 passing regression tests across groundwater workspace, groundwater lens, land cutaway and conditions clarity suites.
- 282 passing native browser checks in eight configurations: Explorer and Check, 1280/390/320px, light/dark/contrast/forced colors, and 150% CSS zoom.
- Native keyboard focus and scroll retention, disclosure persistence, original practice feedback focus, independent learner records, scores and paused parcel progress were checked.
- Both SVG call trees are byte-identical to the preceding runtime. Reversing the two presentation slices exactly restores baseline 3931756397bb4943e201fe8b7761dc9d83facac7421d013d9ddb6d0e7db6c875.
- Both installed runtime copies matched f5f50bac94b15e51a47c2cd9af88feed37469820e452cd48ba933ba5f140ac83 before and after verification. The local preview served the same bytes. Owned QA browser contexts and its server closed.

The existing groundwater test updates its expected selection focus. Its first run also exposed a stale comparison with an older diagram baseline: four 2D drawing anchors had already changed before this pass. Those four now match raw AST slices in the pinned preceding runtime; the remaining 59 anchors still match the original historical runtime. Scoring checks and the pore-paint and Check-adapter validators remain intact. The exact test changes, original test, raw anchor hashes, initial failed run and final passing run are retained.

## Evidence

- [Desktop workspace](f5f50bac94b1-2026-10-05T23-43-51-050Z/explorer-1280-light.png)
- [Narrow workspace](f5f50bac94b1-2026-10-05T23-43-51-050Z/explorer-320-light.png)
- [Enlarged text](f5f50bac94b1-2026-10-05T23-43-51-050Z/explorer-390-zoom150.png)
- [Browser results](f5f50bac94b1-2026-10-05T23-43-51-050Z/results.json)
- [Regression receipt](unit-receipt.json)
- [Presentation slices](presentation-changes.json)

Run `node reports/watercycle-groundwater-workspace/verify.cjs` from the repository to check frozen evidence and current inputs. Use `--snapshot-only` after later enhancements to verify this archived result. The preceding land-cutaway report supplies the frozen baseline and is preserved unchanged.

Changes remain uncommitted. Earlier failed or interrupted verification runs are retained in the task scratch directory and do not count as passing evidence.
