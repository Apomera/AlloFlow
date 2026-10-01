# Water Cycle evidence notebook clarity

The notebook now puts the recorded method, claim status and signed changes at the top of each card. **Explain this observation** opens the saved claim, evidence summary, input changes, readings and writing prompts. **Replay settings** identifies its scope and moves keyboard focus to the comparison method, or to **Set baseline** when the saved record has no baseline.

## What changed

- Finite stored changes retain their exact values and signs. A real zero stays zero; missing or nonfinite changes say **Not recorded**.
- Claim status distinguishes agreement, disagreement and **Claim check not recorded**. It uses the recorded result.
- Table columns say **Saved baseline / Saved scenario**. Guidance explains that current controls do not rewrite or fill in saved evidence.
- Land changes use index points. Relative pathway shares have their own explanation inside the disclosure; independent readings do not form a water budget.
- Narrow embedded panels use one card column. Open explanations leave neighboring cards at their natural height. Buttons have consistent widths and large targets.
- New method, status and replay text uses the existing translation helper. Recorded learner labels and writing remain as saved.

## Visual review

| Check | Before | Final reviewed layout |
|---|---|---|
| Saved change text | 9px | 13px labels, 15px values |
| Phone table text | 11px | At least 12px |
| Embedded390 notebook | Two 146.5px cards | One 294px card |
| Phone Replay / Remove refinement | First candidate: right-aligned Replay above full-width Remove | Equal 97 × 54px targets |
| Embedded Replay / Remove | Cramped two-card layout | Equal 126 × 44px targets |
| Expanded desktop explanation | Neighbor stretched to 1069px | Neighbor keeps its closed height |
| Missing claim and changes | “Evidence differs” and fabricated zeroes | Unknown result and **Not recorded** |

Phone closed cards are larger than the old compressed layout because their readings have readable labels, units and scope. The final spacing refinement reduced the first candidate's 603–627px cards to 489–513px. The full claim and evidence statements remain in the disclosure.

### Matched captures

| View | Before | Updated |
|---|---|---|
| Phone notebook | [Before](folded-light-320.png) | [Updated](final-folded-light-320.png) |
| Narrow embedded notebook | [Before](folded-light-1280-host390.png) | [Updated](final-folded-light-1280-host390.png) |
| Desktop notebook | [Before](folded-light-1280.png) | [Updated](final-folded-light-1280.png) |
| Phone explanation | [Before](storm-open-light-320.png) | [Updated](final-storm-open-light-320.png) |

[Updated phone card](final-card-heavy-storm-folded-light-320.png) · [Updated phone evidence and writing](final-card-heavy-storm-open-light-320.png) · [Older missing record before enhancement](folded-legacy-light-320.png)

## Verification

The focused and regression runs passed **80 distinct tests** across seven files, with no skips: 20 new rendered notebook cases, 37 existing notebook/history/replay cases, and 23 comparison/claim/baseline regressions.

The final browser run passed **653 checks**, with **99 snapshots and 18 clean scoped accessibility audits**. Eight layout, theme and embedded-panel configurations cover open and folded notebooks; a ninth fixture checks missing and nonfinite records. All 34 captures and eight byte-checked downloads are present. The browser and its ephemeral server closed cleanly. See [browser results](results.json) and [geometry summary](final-browser-summary.json).

Thirty-four exact calculation and state anchors preserve the existing model, identity, save, replay, note editing, remove, undo and export code. The saved verifier also checks the full comparison and signal derivation ranges. Browser validation uses a frozen actual runtime, an owned ephemeral server and isolated Chromium; native interactions check recorded values, writing, replay, removal, undo, clear and downloads. The paused parcel and process writing are checked throughout. Learner tabs are not operated.

The baseline review recorded one dark plus forced-color contrast audit finding. The updated notebook explicitly uses system colors for its text and disclosure cue. Baseline and intermediate diagnostics remain alongside the final reports.

The existing text export remains unchanged. It labels absent values as **not recorded** and preserves recorded values. A nonfinite value supplied directly in an older in-memory record remains literal **NaN** or **Infinity** in that text export; the notebook displays **Not recorded**. Normal saved model values are finite.

### Saved verification command

From the repository root:

```powershell
node reports/watercycle-notebook-clarity/verify.cjs
```

The verifier checks pinned runtime, report and test hashes, exact preserved code, JavaScript syntax, scoped whitespace and the empty staged-file list. It writes [verification-summary.json](verification-summary.json). It stops if the source has since changed, so this review stays tied to the tested version.

Baseline runtime: `942198fca1f8aae4c530764920afa5ed2fbd10c29b4fee68d7e4be560814d776`

Final runtime and public mirror: `384eca9416719d616d50623847aa6fdabec346106967153f678cd76ee508be6c`

Changes remain uncommitted. The local [preview](http://127.0.0.1:8770/) was restored and verified to serve the final runtime exactly.
