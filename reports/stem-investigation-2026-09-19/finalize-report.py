from pathlib import Path
import json
root=Path('reports/stem-investigation-2026-09-19')
refinement=json.loads((root/'refinement-results.json').read_text(encoding='utf-8-sig'))
unit=json.loads((root/'unit-results.json').read_text(encoding='utf-8-sig'))
browser=json.loads((root/'browser-results.json').read_text(encoding='utf-8-sig'))
tax=next(row for row in unit['testResults'] if row['name'].endswith('/stem_organism_id.test.js'))
assert refinement['success'] and refinement['numPassedTests']==19
assert len(tax['assertionResults'])==24 and all(row['status']=='passed' for row in tax['assertionResults'])
assert len(browser)==6 and all(row['ok'] and not row['a11y'] and not row['errors'] and all(size['scroll']<=size['width'] for size in row['sizes']) for row in browser)
summary={'refinementTestsPassed':19,'taxonomyRegressionTestsPassed':24,'openBimRegressionTestsPassed':8,'totalTestsPassed':51,'browserWorkflowsPassed':6,'accessibilityViolationsInCheckedPanels':0,'overflowWidthsChecked':[375,320],'sourceMirrorParity':True,'javascriptSyntaxChecks':'passed','openBimValidation':'Standalone vitest run with --testTimeout=60000: 8 passed, including generated Python syntax validation.'}
(root/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
p=root/'README.md';s=p.read_text(encoding='utf-8-sig')
s=s.replace('## Validation artifacts\n','## Validation artifacts\n\nFinal result: **51 tests passed**, plus **6 browser workflows**. The checked panels had no automated accessibility violations or horizontal overflow at the tested phone widths. The existing OpenBIM export suite passed all 8 tests in isolation with a 60-second test allowance for local Python startup. JavaScript syntax, scoped diff checks, and source/mirror parity passed. See `validation-summary.json`.\n')
p.write_text(s,encoding='utf-8')
print(json.dumps(summary,indent=2))
