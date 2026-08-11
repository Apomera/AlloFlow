# Source run — W3C BAD "CityLights" inaccessible SURVEY page (2026-08-11)

Second real-world run of the source-remediation pathway, chosen to push the
auditor into forms territory: the survey page scatters controls and their
visible labels across separate layout-table cells, the classic association
barrier. Same corpus and licensing posture as the home-page run.

## Scoreboard (42 patches, 5 occurrence-indexed)

| Measure | Before | After |
| --- | --- | --- |
| axe violation classes | 7 (incl. label ×11, select-name ×2) | **1** (region, disclosed) |
| Unlabeled form controls | **13** | **0** |
| Ungrouped radio/checkbox groups | 2 | 1 (title pair; disclosed remainder) |
| Keyboard-unreachable interactive elements | 45 of 59 | **0** |
| Images without alt | 24 | 0 |
| Rendered text | — | **unchanged** (0 declared, 0 observed) |
| Compare verdict | — | `improved`, 0 introduced |

The keyboard before-number is itself evidence of the blur carpet: with
`onFocus="blur();"` on the nav links, the Tab walk collapses after 14
elements because focus is thrown back to the body, so everything beyond
(including every form control) sat behind the wall.

## Forms strategy (the run's method contribution)

Label/`for` pairing and fieldsets are structurally impossible here without
rebuilding the layout tables, so the surgical form is: `aria-label` per
control, bound from column position and corroborated by the control's own
name/id (`em`, `n`, `ev`), plus `role=group` with the question text on the
enclosing layout table for the six park radios. The review notes flag the
inference explicitly for the page owner, and the one semantically muddy case
(the two title radios, whose only wrappable ancestor also contains unrelated
visible text) is an accepted, disclosed remainder rather than a forced group.

## Auditor growth this run motivated

- **Form evidence channel** (new): per-form control counts and submit
  presence, unlabeled-control targets, and radio/checkbox groups lacking
  fieldset+legend or ARIA group context.
- **E-SRC-4 (fixed):** the keyboard walk false-positived radio groups — Tab
  reaches ONE member of a same-name group by design; the walk is now
  radio-group aware, and the fixture proved the false positive before the fix.
- ARIA `role=group`/`radiogroup` with a label now satisfies the grouping
  check (the legitimate surgical form when fieldsets cannot wrap).

## Verification

Round-1 independent verification: see `verification-report.json`
(worksheet: one item per patch + 4 globals; the reader was instructed to
re-derive the label-to-control mappings from the layout itself).
