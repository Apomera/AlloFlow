# Dissection Lab: clear structure actions and reliable progress

The structure directory now states what activating each row will do. Existing records open the missing field or the saved record, and newly inspected structures count toward the current layer’s scenario objective.

## Improvements

| Structure state | Action shown in its row |
| --- | --- |
| Visible and uninspected | Inspect structure |
| Hidden and uninspected | Show recovery guidance |
| Inspected, missing a note | Write evidence note |
| Inspected, missing confidence | Choose confidence |
| Inspected, missing both fields | Open observation record |
| Completed record | Review saved record |
| Visible current Guided target, already inspected | Open guided check |

Names, record status, exposure badges and action cues have separate visual roles. The footer wraps on narrow screens and supports large text, high contrast and forced colors. Each row remains one button. Its accessible name includes the action, and its description states the record status.

When both evidence fields are missing, the directory and observation review now say **Note and confidence needed**. Opening an incomplete prior record focuses the corresponding note or confidence input. Search and filters remain available when returning to the directory, and next-structure navigation retains its control focus.

Reviewing a previously inspected structure preserves inspection credit and scenario completion metadata, including an absent completion time. A visible current Guided target still opens its evidence checkpoint; hidden prior records retain their existing review behavior.

New inspections count only catalog structures in the current layer. Old keys from other layers, specimens, or unknown structures cannot complete its objective. The first completion time survives subsequent inspections, ordinary canvas clicks, relationship tracing, and procedure updates. Probe feedback includes the structure just inspected, so its checkpoint percentage matches the current layer’s actual progress.

## Verification

| Checks | Result |
| --- | --- |
| New layout, keyboard, record review, Guided, threshold, probe, relationship and canvas cases | 19 passed |
| Previous directory guidance, clarity and record completion cases | 50 passed |
| Total browser checks | 69 passed |
| Canvas, workspace, reference and lab unit regressions | 349 passed |
| New scoped directory accessibility audits | Five audits, zero violations |

The five layouts are phone, tablet, desktop, embedded large text/high contrast, and forced colors. Metrics show no horizontal overflow or horizontal text clipping. Text is at least 14 px, or 16 px with large text. Rows exceed 106 px in height. Additional scrolling assertions and captures confirm that the final action is reachable in the narrow directory. Independent source and visual reviews found no actionable defect.

Browser checks use the local working-tree harness in Chromium. The next-action card uses static positioning during screenshots. Accessibility audits cover the directory scope.

The forced-color audit retains one incomplete contrast rule for three index numbers. Computed styles report white on white, while the capture renders black numbers on white with visible outlines. Manual visual review found readable numbers, actions and focus rings; the automated contrast result remains marked incomplete.

## Verification history

The first browser session ended without a final result after nine observed passes. Its five layout captures and audits are preserved in new-interrupted. The full suite was restarted after confirming that its runner was no longer active.

The first completed new run passed 16 cases and failed three fixture setups. Relationship fixtures needed the technique panel open. The probe fixture needed the recommended ventral view and the actual boundary-tracing action label. The two already-passing pointer cases also received the supported hidden-label value and a control assertion. The corrected full run passed all 19 cases. Product source and test deadlines stayed unchanged during those corrections; initial results and failure artifacts are retained.

The first previous-case run passed 49 of 50 cases. Its inspection shortcut assertion expected an inactive scenario’s absent timestamp to become zero. It now checks that the entire existing scenario array is preserved alongside the expected selection and inspection changes. The corrected full run passed all 50 cases. Initial results are retained.

The reference workbench unit assertion now expects the new both-fields-missing wording. The first lab run passed 88 of 91 cases. Two assertions expected the old scenario function signature and title focus for an incomplete record. They now check the optional inspection map and focus on the missing note input. The third failure exposed a stale flat desktop shared module: it lacked four existing Perception Lab registrations. A guarded comparison proved those were its only differences before synchronizing it with the canonical and nested copies. Those two copies remained unchanged. The final core run passed 258 cases and the lab rerun passed 91 cases. Initial unit results and the [mirror repair details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-actions-2026-10-03/shared-mirror-repair.json) are retained.

[Verification details](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-actions-2026-10-03/verification.json) · [Browser spec](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/dissection-directory-actions.spec.ts)

## Screenshots

[Phone](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-actions-2026-10-03/phone-actions.png) · [Phone final row](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-actions-2026-10-03/phone-actions-end.png) · [Tablet](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-actions-2026-10-03/tablet-actions.png) · [Desktop](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-actions-2026-10-03/desktop-actions.png) · [Large text and high contrast](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-actions-2026-10-03/embedded-large-actions.png) · [Large text final row](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-actions-2026-10-03/embedded-large-actions-end.png) · [Forced colors](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/dissection-directory-actions-2026-10-03/forced-colors-actions-end.png)

## Source integrity

Both renderer copies are byte-identical, parse successfully, and retain LF line endings. Scoped whitespace checks passed and the modified source and test files are unstaged. Temporary regression copies were removed.

The three shared runtime module copies also match and parse successfully. Their SHA-256 is `13e8858f654a81eec2cb5a64801908ddf7419b4f0eb6caaaa96e5856c93a8a94`.

Final SHA-256: `1b63741ffd900b432aa874e8e684cbde09192ca4ab84e83cd2e236e595531572`

Changes remain uncommitted.
