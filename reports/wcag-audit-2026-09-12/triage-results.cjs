const fs=require('fs');const path=require('path');const base='reports/wcag-audit-2026-09-12/';const x=JSON.parse(fs.readFileSync(base+'regressions.json'));const entries=[];const counts={};
for(const f of x.testResults)for(const t of f.assertionResults.filter(t=>t.status==='failed')){const m=t.failureMessages.join('\n');const category=m.includes('STACK_TRACE_ERROR')?'Opaque runner error':m.includes('Axe is already running')?'Cascading axe-busy error':m.includes('color-contrast')?'Contrast/mixed rendered diagnostics':m.includes('scrollable-region-focusable')?'Keyboard-scroll rendered diagnostics':m.includes('focus')&&m.includes('warnings')?'Focus/baseline rendered diagnostics':'Source or DOM contract assertion';counts[category]=(counts[category]||0)+1;entries.push({file:path.relative(process.cwd(),f.name).replaceAll('\\','/'),test:t.fullName,category,durationMs:t.duration,firstMessage:t.failureMessages[0].split('\n')[0]});}
const fileGroups={};for(const e of entries){const key=e.file.split('/').at(-1);(fileGroups[key]||=[]).push(e);}
const retest=JSON.parse(fs.readFileSync(base+'targeted-retest.json'));const rerun=retest.testResults.flatMap(f=>f.assertionResults.filter(t=>t.status!=='skipped').map(t=>({file:path.basename(f.name),test:t.fullName,status:t.status,message:t.failureMessages?.[0]?.split('\n')[0]})));
fs.writeFileSync(base+'regression-triage.json',JSON.stringify({method:'Initial diagnostic classification by retained error content; categories are mutually exclusive and are not product defect counts',counts,entries,isolatedRetest:rerun},null,2));
const fileRows=Object.entries(fileGroups).map(([file,rows])=>'| '+file+' | '+rows.length+' | '+[...new Set(rows.map(r=>r.category))].join('; ')+' |').join('\n');
const note=`# Regression triage — September 12, 2026

The complete run covered **808 files / 6,926 tests: 6,826 passed, 97 failed, 3 skipped (reported as pending by JSON)**. Nineteen files contain failed assertions. This is a test result, not a compliance percentage or a count of 97 product defects.

| Initial diagnostic group | Failed assertions | Interpretation |
|---|---:|---|
| Opaque runner errors (STACK_TRACE_ERROR) | 34 | JSON does not retain the underlying cause. Many durations coincide with test limits; do not label every one a timeout or a WCAG defect without a rerun. |
| Cascading axe-busy errors | 24 | Nuclear Lab had an earlier unfinished run, then later cases failed with axe already running. These cases did not provide independent accessibility measurements. |
| Rendered fixture diagnostics | 23 | 16 contain contrast/mixed axe findings, 3 keyboard-scroll findings, and 4 focus/baseline warnings. Theme/host fidelity and actual tool readiness must be checked before assigning a release-level defect. |
| Source or DOM contract assertions | 16 | Includes expected source strings, generated URL hashes, formatting structure, and live-quiz focus expectations. Stale assertions and real regressions both remain possible. |

Categories are mutually exclusive initial triage, not a final defect adjudication. Full entries are in [regression-triage.json](regression-triage.json); complete messages remain in [failed-regressions.json](failed-regressions.json).

## Isolated retest

Four selected cases were rerun with one worker. **1 passed and 3 failed**; the other 224 cases in those files were filtered out, not additional failures. See [targeted results](targeted-retest.json) and [readable log](targeted-retest.log).

- Geometry World ready workspace **passed** in isolation. Its original opaque failure should not be treated as a confirmed WCAG issue; other opaque failures remain unresolved.
- Number Line contrast **failed again**. The fixture measures white text on #f8fafc at 1.04:1 and yellow at 1.02:1. Verify the actual high-contrast host background before billing this to the released tool.
- Titration lab titrate **failed again** with a contrast diagnostic. Verify current source/compiled stylesheet parity and inspect the measured controls in the real tool.
- Live-quiz initial focus **failed again** because the test expects Alpha while focus is on Minimize. Focusing a useful dialog action can be valid; this assertion difference alone does not prove a WCAG 2.4.3 failure. Review the complete focus lifecycle.

## Additional fixture follow-up

Prioritize measured contrast in Chemistry/Titration/Molecule, Number Line/Multiplication/Unit Converter, Cell Explorer and Anatomy; keyboard access to scrollable regions in Architecture Studio, Circuit Builder and Fire Ecology; Raptor Hunt input ARIA diagnostics; the Geometry Sandbox short-landscape focus/overlay warning; and SEL practiceJourneys baselines with zero measured controls. Empty or incompletely mounted fixtures are not accessibility passes. Three Coaster Lab focus cases were explicitly skipped across standard, forced-color and short-landscape profiles.

| Failed file | Assertions | Initial classification |
|---|---:|---|
${fileRows}

Reproduce the isolated run from the repository root:

~~~powershell
node node_modules/vitest/vitest.mjs run tests/geometry_data_wcag_browser.test.js tests/foundational_math_wcag_browser.test.js tests/chemistry_particle_wcag_browser.test.js tests/ui_modals_runtime_a11y.test.js -t 'geometry world ready workspace|number line contrast|titration lab titrate|contains live-quiz focus' --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/wcag-audit-2026-09-12/targeted-retest.json
~~~
`;
fs.writeFileSync(base+'regression-triage.md',note);
let report=fs.readFileSync(base+'README.md','utf8');report=report.replace(/## Regression exceptions[\s\S]*?(?=## Reproduce and evidence)/,`## Regression exceptions

The **97 failed assertions span 19 files**. Initial triage separates **34 opaque runner errors**, **24 cascading axe-busy errors**, **23 rendered fixture diagnostics**, and **16 source/DOM contract assertions**. These are not 97 confirmed product defects.

An isolated four-case rerun passed Geometry World and reproduced the Number Line contrast, Titration contrast and live-quiz focus assertions. The focus expectation and theme-host fidelity still need review. The full-suite aggregate remains unchanged; the targeted rerun is reported separately.

See the [diagnostic breakdown, file inventory and retest interpretation](regression-triage.md), [complete failure messages](failed-regressions.json), and [raw full-suite results](regressions.json). Three Coaster Lab focus cases were skipped.

`);
fs.writeFileSync(base+'README.md',report);
let v=fs.readFileSync('VPAT-2.5-WCAG-AlloFlow.md','utf8');
v=v.replace('A passed test is evidence for its assertions and fixture only, not an entire WCAG criterion or product workflow.','A passed test is evidence for its assertions and fixture only, not an entire WCAG criterion or product workflow. The [regression triage](reports/wcag-audit-2026-09-12/regression-triage.md) separates runner/cascading errors from fixture and source-contract assertions; an isolated four-case retest passed Geometry World and reproduced three other assertions.');
v=v.replace('See AUD-01 and AUD-04 in the September audit.','See AUD-01 and AUD-04 in the September audit. The broader fixtures also flag theme-dependent contrast, with Number Line and Titration failures reproduced in isolation; real-host/style parity remains to be checked.');
v=v.replace('Existing accessibility regressions cover many other controls.','The broader fixtures flag keyboard access to scrollable regions in Architecture Studio, Circuit Builder and Fire Ecology, requiring real-tool confirmation. Existing accessibility regressions cover many other controls.');
v=v.replace('Representative complete teacher/student workflows and all nested layers remain to be tested.','The live-quiz initial-focus assertion also fails in isolation (expected Alpha; actual Minimize), which needs workflow review rather than automatic classification as a WCAG failure. Representative complete teacher/student workflows and all nested layers remain to be tested.');
v=v.replace('Manual confirmation across every theme, control state, and complex tool remains required.','Rendered fixtures flag Geometry Sandbox overlay/focus warnings and SEL practiceJourneys missing focus baselines; three Coaster Lab focus cases were skipped. Manual confirmation across every theme, control state, and complex tool remains required.');
v=v.replace('Dynamic and third-party controls remain incompletely evaluated.','Broader fixtures additionally report Raptor Hunt input ARIA diagnostics, pending real-tool/state verification. Dynamic and third-party controls remain incompletely evaluated.');
fs.writeFileSync('VPAT-2.5-WCAG-AlloFlow.md',v.replace(/\r\n/g,'\n'));
let current=fs.readFileSync('a11y-audit/WCAG-2.2-current-audit.md','utf8');current=current.replace('## Current results','See the [regression triage and isolated retest](../reports/wcag-audit-2026-09-12/regression-triage.md) for the distinction between runner errors, fixture diagnostics, and potential product defects.\n\n## Current results');fs.writeFileSync('a11y-audit/WCAG-2.2-current-audit.md',current);
console.log(JSON.stringify({counts,isolated:rerun.map(r=>({test:r.test,status:r.status}))},null,2));
