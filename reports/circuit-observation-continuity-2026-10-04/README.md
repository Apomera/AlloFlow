Saved observation panels now stay attached to their own readings when another observation is removed or restored. An open note keeps its cursor selection, manual height and internal scroll position while its displayed observation number changes. Comparison-to-note shortcuts follow the renumbered field.

Previously, cards used their position in the list as their identity. Removing observation 1 could close observation 2 and give observation 3 its open panel and writing size. The notebook now shares the comparison's runtime identity rules, using the saved design reference and captured probe connections. These identities are local to the interface and are not added to saved JSON.

Distinct historical readings with equal settings remain separate. Note edits keep the current editor. Replacement imports start with fresh, closed editors. For older records that share the same design object and probe pair, changes in the number of those records reset the ambiguous editors and comparison selection. Unrelated cards keep their state, and authored notes remain intact.

Verification: **158 tests passed across 11 files**, including 13 new continuity cases. The regression suite covers removal, recovery, reordering, note edits, new recordings, equal readings, shared design references, replacement imports, renumbered links, live edits and portable data. Four native Chromium workflows cover keyboard removal/recovery on desktop and phone layouts, comparison-to-note navigation, a file import, and restoration of an ambiguous older record. All six final screenshots match the captures reviewed at original resolution byte for byte. Automated accessibility checks found no violations in the saved-observation list. The browser uses a local synthetic CircuitTool host. Final results are in [validation.json](validation.json).

- [Desktop before removal](desktop-before-removal.png), [after removal](desktop-after-removal.png), [after recovery](desktop-after-recovery.png)
- [Phone before removal](phone-before-removal.png), [after removal](phone-after-removal.png), [after recovery](phone-after-recovery.png)
- [Test execution receipt](regression-receipt.json)
- [Native browser measurements](browser-results.json)
- [Visual review](visual-review.json)
- [Source preservation](source-preservation.json)

Nine of the original twelve new cases failed against the unchanged source; that reproduction is retained in `baseline-tests.json`. The separate shared-design recovery case also failed before its correction (`legacy-recovery-reproduction.json`). Earlier attempts are preserved in three folders: `before-selection-fixture-correction` records two short-note selection assertions that needed to respect native cursor clamping; `before-disclosure-fixture-correction` records a browser setup that needed to open the comparison before choosing options; `before-legacy-recovery-correction` contains the intermediate source, reviewed browser run and a regression run stopped before the final recovery refinement. No result from the stopped run is counted as a final pass.

Source and desktop mirror match. The three recorded source fragments reverse byte for byte to the preceding verified version. Changes remain uncommitted and unstaged.
