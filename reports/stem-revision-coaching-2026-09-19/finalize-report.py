from pathlib import Path
import json
out=Path('reports/stem-revision-coaching-2026-09-19')
unit=json.loads((out/'unit-results.json').read_text(encoding='utf-8-sig'))
recovery=json.loads((out/'recovery-results.json').read_text(encoding='utf-8-sig'))
browser=json.loads((out/'browser-results.json').read_text(encoding='utf-8-sig'))
assert unit['success'] and unit['numPassedTests']==66
assert recovery['success'] and recovery['numPassedTests']==15
assert len(browser)==6 and all(row['ok'] and not row['a11y'] and not row['errors'] and all(size['scroll']<=size['width'] for size in row['sizes']) for row in browser)
for name in ['openbim','organismid']:
 assert Path('stem_lab/stem_tool_'+name+'.js').read_bytes()==Path('desktop/web-app/public/stem_lab/stem_tool_'+name+'.js').read_bytes()
summary={'testsPassed':66,'finalRecoveryTestsPassed':15,'browserWorkflowsPassed':6,'checkedPanelAccessibilityViolations':0,'mobileWidths':[375,320],'sourceMirrorParity':True,'syntaxAndScopedDiffChecks':'passed'}
(out/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
(out/'README.md').write_text('''# STEM revision coaching — 19 September 2026

## OpenBIM: specific design feedback

The workbench now checks each classroom target separately: floor area no greater than 60 m², work area at least 24 m², and a work rectangle that fits. Feedback gives the area excess or shortfall in square metres and any width/depth overflow in metres. Exact boundaries count as meeting the target. Checks continue to use applied dimensions while edits are pending, with an explicit reminder to apply changes.

These are dimension studies for classroom reasoning, not IFC geometry or accessibility clearance measurements.

## Taxonomy: compare and preserve observations

Saved revisions can expand a before-and-after comparison of the observation, tentative group, context, next evidence, key decisions, and requested evidence review. Key questions are matched by their text, so a change of branch shows which questions were no longer asked. A revision explanation alone does not falsely imply that the evidence changed.

Markdown exports include entry IDs and revision comparisons, making references to earlier entries traceable. Missing earlier entries are labeled as unavailable.

At 60 entries, saving now preserves all existing observations and the complete draft instead of silently dropping the oldest observation. Entries can be removed, and the most recent removal can be undone in its original position. A removed observation can also be exported separately. Undo is limited to the most recent removal; if the journal fills before undo, the recovery message explains how to export the removed entry before another removal replaces it.

## Validation

- 66 regression tests passed across the existing OpenBIM, Taxonomy, and investigation suites plus 15 new coaching/recovery tests.
- The 15 coaching/recovery tests passed again after the final recovery-export change.
- Six real-browser workflows passed: both tools in light, dark, and high-contrast themes, including comparison, removal, undo, and downloaded exports.
- No automated accessibility violations in the checked panels; no horizontal overflow at 375 or 320 pixels.
- Mobile screenshots were visually inspected. JavaScript syntax checks, scoped diff checks, and source/desktop-mirror parity passed.

See `unit-results.json`, `recovery-results.json`, `browser-results.json`, and `validation-summary.json`. The runnable browser fixture, screenshots, and exported notebooks are alongside this report.

The sim, circuit, and molecule shelves were outside this pass. Photo identification remains gated. No deployment was performed.
''',encoding='utf-8')
print(json.dumps(summary,indent=2))
