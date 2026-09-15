const fs=require('fs'),crypto=require('crypto');const p='reports/wcag-audit-2026-09-12/remediation/';
const browser=JSON.parse(fs.readFileSync(p+'browser-audit.json')),workspace=JSON.parse(fs.readFileSync(p+'browser-label-check.json')),tests=JSON.parse(fs.readFileSync(p+'final-regressions.json'));
if(!browser.verification.passed||!Object.values(workspace.verification).every(Boolean)||tests.numFailedTests)throw Error('Verification not complete');
function ratio(a,b){function lum(s){const v=s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)});return v[0]*.2126+v[1]*.7152+v[2]*.0722}const x=lum(a),y=lum(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)}
const gradeRatio=ratio(workspace.collegeStyle.color,workspace.collegeStyle.background);
const rows=[...browser.states,...workspace.states].map(s=>'| '+s.name+' | '+s.viewport.width+' | '+(s.violations.map(v=>v.id).join(', ')||'0')+' | '+(s.incomplete.map(v=>v.id).join(', ')||'0')+' | '+s.scrollWidth+'/'+s.clientWidth+' |').join('\n');
const report=`# AlloFlow accessibility remediation — September 12, 2026

**All five confirmed audit findings were corrected and verified in the local working tree.** The [VPAT](../../../VPAT-2.5-WCAG-AlloFlow.md) remains interim: these repairs do not establish product-wide conformance. The [original audit](../README.md) and its raw results are retained as the baseline.

## Changes and evidence

| Finding | Correction | Verification |
|---|---|---|
| AUD-01 / 1.4.3 | Video Studio action buttons use #4f46e5 with white text; hover uses #4338ca. | Measured 6.29:1 in default/focus and 7.90:1 on hover, for all three identified controls. Nine control/state checks pass. Disabled controls remain disabled and are outside this contrast check. |
| AUD-02 / 4.1.2 | The named Video Studio preflight container now has role=region and retains aria-live=polite. | No aria-prohibited-attr violation at desktop, 320px, or 320px with text spacing. Actual populated announcements still need screen-reader verification. |
| AUD-03 / 2.5.8 | Catalog navigation uses wrapping flex layout, gaps, and minimum 24px link dimensions. | GitHub measures 40.70 × 24px at 320px; 50.06 × 24px with text spacing. All three links meet the 24px height. Target-size audit passes. |
| AUD-04 / 1.4.3 | Quick Start grade buttons use text-slate-700 rather than text-slate-600 for the unselected state. | After the conflicting shared stylesheet loads, College hover measures ${gradeRatio}:1 (#4338ca on #eef2ff), with no contrast violation in the four Quick Start samples. |
| AUD-05 / 2.5.3 | Removed overrides that replaced visible More information and AI Guide & Assistant labels. The guide button also exposes expansion state and hides decorative icons from its name. | Loaded workspace passes the explicitly enabled label-content-name-mismatch rule; More information retains its visible name. |
| INV-02 | The compact Start & setup text button takes its name from visible content. The expanded header's icon control keeps its descriptive label. | The earlier ampersand/word-expansion mismatch no longer appears in the explicit label check. |

The Quick Start issue depends on CSS arrival order. One preliminary follow-up did not reproduce it; a subsequent run captured the overriding rule .fixed.inset-0:not(.theme-dark):not(.theme-contrast) .text-slate-600 { color: #64748b !important; }. The final runner waits for this rule before testing hover. [Before-fix evidence](before-quickstart-fix.json) preserves that reproduction.

Canonical JSX was changed and the three affected modules rebuilt: HeaderBar, UDLGuideButton and QuickStartWizard. Their public mirrors and both Video Studio copies are synchronized. The catalog page exists in the public directory. No full release rebuild, commit, or deployment was performed.

## Verification

- **38/38 existing targeted tests pass**, across six test files. [Final results](final-regressions.json). An initial 5-second timeout in the Quick Start catalog test passed in isolation and in the final run with a 30-second limit; [initial results](regressions.json) and [isolated retest](quickstart-retest.json) remain available.
- **9/9 initial-page states pass axe A/AA and document-width checks**: app chooser, catalog shell and Video Studio at 1280px, 320px and 320px with text spacing. [Results and measurements](browser-audit.json).
- **All six targeted workspace gates pass**: source readiness, explicit label-in-name rule, Quick Start contrast, loaded workspace axe, AI settings focus containment over 45 Tabs, and Escape/focus restoration. [Results](browser-label-check.json).
- **9/9 Video Studio color checks pass** across default, hover and focus. [Measured control states](control-states.json).
- Catalog at 320px with text spacing was visually inspected; links wrap without overlap. Screenshots for all sampled states are stored in this directory.

| State | Width (CSS px) | axe violations | Incomplete rules | Document scroll/client width |
|---|---|---|---|---|
${rows}

Incomplete rules are retained for review and are not passes. The source-panel loading relationship, INV-01, remains observable; it resolves once tour-input-panel exists. Counts above concern selected states and rules, not a complete process or WCAG criterion.

## Remaining work

The original 97 regression failures were not globally rerun or declared resolved. Their [triage](../regression-triage.md) still requires follow-up on fixture fidelity, source contracts, timeouts, Nuclear Lab axe concurrency, tool-specific contrast and keyboard scrolling. INV-01 needs a stable panel relationship across the lazy-loading transition. The entire application build and hosted deployment remain unverified.

NVDA/VoiceOver, native 200%/400% browser zoom, authenticated and live workflows, video captions/audio description, populated preflight announcements, generated exports and full tool/state coverage remain outstanding. Catalog entries were still loading. Local tests block remote services and exercise no AI generation, camera/microphone capture, account changes or live classroom actions.

## Reproduce

From the repository root, run:

~~~powershell
node reports/wcag-audit-2026-09-12/remediation/run-browser.cjs
node reports/wcag-audit-2026-09-12/remediation/run-label-check.cjs
node reports/wcag-audit-2026-09-12/remediation/run-control-states.cjs
node node_modules/vitest/vitest.mjs run tests/header_controls_a11y.test.js tests/header_popovers_a11y.test.js tests/view_header_reflow_a11y.test.js tests/quickstart_wizard_a11y.test.js tests/quickstart_wizard_render.test.js tests/video_studio_dialog_a11y.test.js --maxWorkers=1 --testTimeout=30000
~~~

The browser runners return a nonzero exit code if their stated gates fail. Source hashes, mirror checks, documentation links and WCAG row counts are recorded in [validation](validation.json). The working tree contains substantial unrelated changes; results apply to the sampled local files and runtime documented here.
`;
fs.writeFileSync(p+'README.md',report);
let v=fs.readFileSync('VPAT-2.5-WCAG-AlloFlow.md','utf8');
v=v.replace('Confirmed browser findings include text contrast in Video Studio and teacher Quick Start, target spacing in the narrow catalog navigation, invalid ARIA on Video Studio\'s preflight container, and label-in-name mismatches in the loaded workspace.', 'The five confirmed browser findings have since been corrected and verified in the local working tree: Video Studio and Quick Start contrast, catalog target size, Video Studio preflight semantics, and workspace label-in-name mismatches. The [remediation report](reports/wcag-audit-2026-09-12/remediation/README.md) records 38/38 targeted tests passing, nine initial-page axe/reflow states passing, and explicit workspace verification. The original full-suite totals above are baseline evidence and were not globally rerun.');
const remarks={
'2.5.3':'AUD-05 corrected locally: More information and AI Guide & Assistant now derive accessible names from their visible content. The compact Start & setup control also uses its visible wording. The explicit axe label-content-name-mismatch check passes in the loaded desktop sample; speech input, other languages and all responsive states remain incompletely evaluated. See the remediation report.',
'4.1.2':'AUD-02 corrected locally: Video Studio #demoPreflightList now has a naming-permitted region role and retains polite announcements; axe passes in the sampled widths. Populated announcements require screen-reader verification. The Create tab still references an absent panel while source input loads, resolving after readiness (INV-01). Broader fixtures report Raptor Hunt input ARIA diagnostics pending real-tool/state verification. Dynamic and third-party controls remain incompletely evaluated.',
'1.4.3':`AUD-01 and AUD-04 corrected locally. The three Video Studio controls measure 6.29:1 in default/focus and 7.90:1 on hover. Quick Start College hover measures ${gradeRatio}:1 after the previously overriding shared stylesheet loads. Targeted browser contrast checks pass. The broader baseline fixtures flag other theme-dependent contrast, including Number Line and Titration, whose real-host/style parity remains to be checked. Other themes, states and generated output remain incompletely evaluated.`,
'2.5.8':'AUD-03 corrected locally: catalog navigation links have minimum 24px height and wrapping gaps. GitHub measures 40.70 by 24 CSS pixels at 320px width, and 50.06 by 24 with text spacing; axe target-size passes. These measurements and other rendered regressions do not cover every pointer target.'};
for(const [id,remark] of Object.entries(remarks)){const regex=new RegExp('(^\\| \\*\\*'+id.replace(/\./g,'\\.')+' [^*]+\\*\\* \\| Partially Supports \\| )[^\\r\\n]+','m');if(!regex.test(v))throw Error('Missing criterion '+id);v=v.replace(regex,(_,prefix)=>prefix+remark+' |');}
fs.writeFileSync('VPAT-2.5-WCAG-AlloFlow.md',v);
let current=fs.readFileSync('a11y-audit/WCAG-2.2-current-audit.md','utf8');current=current.replace('**Status:** Confirmed exceptions and incomplete product-wide verification.','**Status:** Five confirmed findings remediated and verified locally; incomplete product-wide verification.');current=current.replace('- Confirmed browser findings: Video Studio button contrast and invalid ARIA; narrow catalog navigation target spacing; Quick Start College button contrast; loaded-workspace label-in-name mismatches.','- **All five confirmed findings corrected locally:** Video Studio contrast and preflight semantics; catalog navigation target size; Quick Start hover contrast; loaded-workspace button names. The [remediation report](../reports/wcag-audit-2026-09-12/remediation/README.md) records 38/38 targeted tests passing, nine initial-page states passing axe/reflow, and the explicit workspace checks. The broad regression totals above remain the original baseline.');fs.writeFileSync('a11y-audit/WCAG-2.2-current-audit.md',current);
let audit=fs.readFileSync('reports/wcag-audit-2026-09-12/README.md','utf8');audit=audit.replace('## Result','> **Remediation update:** AUD-01 through AUD-05 are corrected and verified in the local working tree. See the [follow-up results](remediation/README.md). The findings, counts and rendered results below preserve the pre-remediation baseline.\n\n## Result');audit=audit.replace('Confirmed findings were documented; application code was not remediated in this audit.','Application code was unchanged during the baseline audit. The subsequent [remediation pass](remediation/README.md) corrects all five confirmed findings and retains the original evidence.');fs.writeFileSync('reports/wcag-audit-2026-09-12/README.md',audit);
fs.appendFileSync('docs/accessibility-manual-test-plan.md','\n\n### September 12, 2026 remediation follow-up\n\nThe [five-finding remediation report](../reports/wcag-audit-2026-09-12/remediation/README.md) records 38 passing targeted regressions and local browser verification. Remaining manual tasks include populated Video Studio preflight announcements, speech-input/AT naming across header layouts and languages, true browser zoom, media accessibility and complete authenticated/live/export workflows. These remain open; automated results do not complete this manual plan.\n');
console.log('Updated VPAT, current audit, baseline notice, manual plan and remediation report. Grade hover ratio: '+gradeRatio);
