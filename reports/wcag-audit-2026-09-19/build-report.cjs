const fs=require('fs'),path=require('path');const dir=__dirname,root=path.resolve(dir,'../..');const read=f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
const interactions=read('final-interactions.json'),math=read('math-theme-tests.json'),prior=read('prior-fixes-regressions.json'),video=read('video-dialog-test.json'),initial=read('browser-audit.json'),metrics=read('interaction-evidence.json');
const workspacePath=path.join(dir,'browser-label-check.json');const workspace=fs.existsSync(workspacePath)?read('browser-label-check.json'):null;
const completedWorkspace=workspace?.finishedAt&&workspace.verification;
const search=read('search-final.json'),sidebar=read('sidebar-tests.json');
const testLine=(j)=>`${j.numPassedTests} passed, ${j.numFailedTests} failed, ${j.numPendingTests} filtered/skipped`;
const table=initial.states.map(s=>`| ${s.name} | ${s.violations.map(v=>v.id).join(', ')||'0'} | ${s.incomplete.map(v=>v.id).join(', ')||'0'} | ${s.scrollWidth}/${s.clientWidth} |`).join('\n');
const scroll=metrics.filter(m=>m.before!=null).map(m=>`| ${m.name} | ${m.width} / ${m.scrollWidth} | ${m.before} → ${m.after} | Yes / Yes |`).join('\n');
const workspaceText=completedWorkspace
 ? `The current workspace runner completed. Its gates are: ${Object.entries(workspace.verification).map(([key,value])=>key+'='+value).join(', ')}. [Raw results](browser-label-check.json) retain violations, incomplete rules, page errors and readiness evidence.\n\n`+workspace.states.map(s=>`- ${s.name}: ${s.violations.map(v=>v.id).join(', ')||'no axe violations'}; width ${s.scrollWidth}/${s.clientWidth}.`).join('\n')
 : 'The separate loaded-workspace follow-up is not yet complete. Do not treat its earlier September 12 evidence as a new September 19 result.';
const report=`# AlloFlow WCAG follow-up — September 19, 2026

The v1.6 local working tree now includes keyboard access to three previously unreachable scroll regions, valid Raptor Hunt search relationships and higher-contrast quick-start numbers. The [VPAT](../../VPAT-2.5-WCAG-AlloFlow.md) is updated with dated evidence. It remains an interim assessment with 53 qualified Partially Supports rows and two Not Applicable rows; these samples do not establish full WCAG conformance.

## Corrections and fresh evidence

| ID / criteria | Change | Evidence and boundary |
|---|---|---|
| SEP19-01 / 2.1.1, 2.4.7 | Architecture Studio statistics, Circuit Builder schematic and Fire Ecology wide charts now have named region semantics and tabIndex=0. | Their rendered overview focus profiles pass. Native Chromium Tab, Shift+Tab and ArrowRight checks establish focus entry, horizontal movement and exit at 320px. This does not cover every interactive tool process. |
| SEP19-02 / 4.1.2 | Raptor Hunt search exposes aria-controls only when results are rendered, and its named results container has role=region. | Empty, matching and no-match state fixtures pass ARIA checks. The nonempty cases verify the named region exists, with buttons or a no-match message. The fixture does not test actual React typing/clearing handlers. |
| SEP19-03 / 1.4.3 | Raptor quick-start card numbers use #94a3b8 rather than low-opacity white. | The overview's prior large-text contrast diagnostic no longer occurs. These aria-hidden numbers are decorative sequencing cues; the report does not rely on this alone as proof of a product-level contrast failure. |
| SEP19-04 / audit fidelity | The nine themed foundational-math fixtures now include runtime AppStyles, the correct theme, and the production host's light card for dark mode or black surface for contrast mode. Unthemed fixtures keep their prior setup. | ${testLine(math)}; the selected cases are the nine theme variants and Number Line explore as a light-state control. Number Line needed no product code change. The former white/yellow-on-light finding came from an inconsistent fixture. |
| SEP19-05 / 1.4.3 | The sidebar tool-count badge now uses text-slate-700, avoiding a shared override that produced #64748b on #f1f5f9 at 4.34:1. | The rebuilt module passes the loaded 320px text-spacing axe check. [Before-fix evidence](workspace-before-badge-fix.json) and the final workspace results retain the measurements. |
| Existing Titration fix / 1.4.3 | Current source already uses appropriate Back-button ink. No Titration code was changed here. | The formerly failing titrate case passes in the [fresh baseline](baseline.json). Full Titration workflows and other themes are not covered by this single case. |

Four canonical STEM tool files and their public mirrors were updated. The sidebar JSX was also changed and its module/public mirror rebuilt. New scroll-region names retain English fallbacks when a translation key is missing. Existing concurrent edits, including unrelated Raptor flight feedback work, were retained. This pass did not commit, deploy or rebuild a complete release.

## Verification

- Native-scroll assertions in the fallback retest: **3 passed**; the same run also passed no-match search but timed out in two full-page search cases. The final focused search-navigation retest is **${testLine(search)}**, covering all three queries. These are six distinct regression cases with passing evidence across the scoped runs. [Scroll/fallback results](interaction-fallback-retest.json), [final search results](search-final.json), [measured scroll interactions](scroll-fallback-evidence.json), and screenshots in this folder.
- Four overview tools × three focus profiles: **12 distinct passing cases across targeted runs**. Architecture, Fire Ecology and Raptor pass in [tool retest](tool-retest.json); Circuit's three profiles pass in [follow-up](focus-theme-retest.json). Profiles include standard colors, emulated Windows forced colors and 760×320 landscape. An intermediate Circuit translation-helper error was corrected before its passing follow-up. These fixtures audit rendered markup and browser focus, not all tool event handlers.
- Math theme sample: **${testLine(math)}**. [Results](math-theme-tests.json). The 120 skipped entries are filtered-out cases, not new product failures or test executions.
- Previously repaired header/Quick Start regression files: **${testLine(prior)}**, across the five files recorded in [results](prior-fixes-regressions.json). The requested Video Studio dialog file was absent from that report and was run separately: **${testLine(video)}**, [result](video-dialog-test.json). Combined, these are 38 passing assertions in six files; no duplicated reruns are counted.
- Fresh chooser/catalog/Video Studio probes: **nine states pass** axe A/AA and document-width checks. [Raw results and dimensions](browser-audit.json). Catalog entries remain unloaded, and axe incomplete rules remain open.
- Rebuilt sidebar accessibility/catalog contracts: **${testLine(sidebar)}**. [Results](sidebar-tests.json).
- Source/mirror equality, syntax, WCAG row counts and local document links are checked in [validation](validation.json).

### Actual horizontal keyboard movement

These are measurements in CSS pixels from real browser key presses after sequential focus entry. Movement varies with the browser's scrolling animation; the test requires positive movement and normal Tab exit.

| Region | Client width / content width | scrollLeft before → after ArrowRight | Sequential focus / Tab exit |
|---|---|---|---|
${scroll}

### Initial-page browser sample

| State | axe violations | Incomplete rules | Document scroll/client width |
|---|---|---|---|
${table}

### Loaded workspace sample

${workspaceText}

## Runner limits and unresolved work

The initial selected baseline recorded **9 passed and 5 failed assertions**: three scroll regions, Raptor mixed ARIA/contrast diagnostics, and Number Line's inconsistent contrast fixture. These have the targeted outcomes above. The old September 12 total of 97 failures was not globally rerun or declared resolved.

The older workspace script needed its teacher selector scoped to the role card after a visible description was added; stale-selector attempts are retained separately. The final successful workspace run also verifies the new count-badge fix, measuring #334155 on #f1f5f9. A supplemental light-state run passed its one assertion but reported runner success=false; it is not counted as a clean suite pass (see math-light-control.json). Resource contention caused a no-match search timeout and a separate browser-startup hook timeout. An earlier six-case run passed, but a later fallback-verification rerun again timed out in two full-page search cases. The final scoped search run renders the complete navigation subtree (input and controlled results) without unrelated simulation panels or layout styles, retaining both ARIA rules and all three query states. This establishes search semantics only; the separate full tool focus profiles cover overview styling. The final search run is counted separately from the interrupted/timeout-prone full-page attempts. [Initial interaction results](interactions.json) and [isolated startup failure](search-isolated.json) remain as diagnostic evidence.

A full 130-case math run and a redundant combined focus rerun were deliberately stopped to reduce resource contention. Their [interrupted math status](math-suite-interrupted.json) and [interrupted focus status](final-tool-tests-interrupted.json) are retained. They have no completed-suite pass claim. The fixture correction was narrowed to the nine themed cases, all of which were then executed successfully.

Still open: the historical Create-tab lazy-loading relationship (INV-01), Nuclear Lab runner/axe concurrency, earlier untriaged source contracts and other tool diagnostics, Geometry Sandbox overlay warnings, SEL practiceJourneys baselines, skipped Coaster Lab cases, and the full [manual test plan](../../docs/accessibility-manual-test-plan.md). Screen readers, browser-native 200%/400% zoom, live and authenticated processes, media alternatives and generated exports remain unverified. Native scroll tests and emulated forced colors do not substitute for assistive-technology testing.

## Provenance and reproduction

Release metadata is **1.6**, September 13, 2026. Audit-start HEAD was 749347d7b6df976c920c89723fefd37b7612c9ba; this was a mutable shared working tree with other local work. Browser: Chromium ${initial.browser}; axe ${initial.axe}. Source hashes and mirror checks in validation identify the final files; they do not freeze other application dependencies during all earlier runs.

The initial-page runner serves the existing local compiled shell and canonical lazy modules, blocks remote services, and uses a fresh context with service workers disabled. Tool regressions render source-module fixtures with styles and run browser-native focus or scrolling. No hosted-release equivalence is claimed. The [September 12 v1.5 VPAT](../../docs/accessibility/archive/AlloFlow-ACR-v1.5-2026-09-12.md) is archived; the [earlier audit](../wcag-audit-2026-09-12/README.md) retains its baseline results.

Run from the repository root:

~~~powershell
node node_modules/vitest/vitest.mjs run tests/stem_scroll_search_wcag_browser.test.js --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000
node node_modules/vitest/vitest.mjs run tests/stem_focus_visibility_wcag_browser.test.js -t 'Circuit Builder overview|Fire Ecology overview|Raptor Hunt overview|Architecture Studio overview' --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000
node node_modules/vitest/vitest.mjs run tests/foundational_math_wcag_browser.test.js -t 'dark|contrast|number line explore' --maxWorkers=1 --testTimeout=60000 --hookTimeout=60000
node reports/wcag-audit-2026-09-19/run-browser.cjs
~~~
`;
fs.writeFileSync(path.join(dir,'README.md'),report);
const current=`# AlloFlow WCAG 2.2 A/AA Current Audit

**Updated:** September 19, 2026 (America/New_York)

**Product:** AlloFlow v1.6 web metadata; local working tree

**Status:** Additional keyboard and ARIA issues repaired; product-wide verification incomplete.

See the [September 19 follow-up](../reports/wcag-audit-2026-09-19/README.md) and [current VPAT](../VPAT-2.5-WCAG-AlloFlow.md).

- Repaired keyboard access to Architecture Studio statistics, Circuit Builder schematic and Fire Ecology wide charts. Native scrolling passes for all three regions, including sequential focus, actual arrow-key movement and Tab exit; a separate focused run passes all three search states. Full-page timeout results are retained in the report.
- Fixed the sidebar tool-count badge contrast under enlarged text spacing; the ready workspace passes desktop and mobile probes. Eighteen sidebar accessibility/catalog assertions pass.
- Repaired Raptor Hunt search ARIA in empty, matching and no-match states; improved decorative quick-start number contrast. Twelve distinct overview focus-profile cases pass across the targeted retests.
- Corrected themed math fixtures to match the production host. Nine theme cases plus one light-state control pass; Number Line required no product change. The earlier Titration titrate failure also passes on current code.
- Earlier fixes remain covered by 38 passing assertions across six files and nine current initial-page browser states with no axe A/AA violations. Incomplete rules and unloaded catalog content remain explicit limitations.
- The prior 6,926-test run (6,826 passed, 97 failed, 3 pending) and 49 source-scan candidates are **September 12 historical evidence**, not fresh v1.6 results. Broad runs interrupted this week are not counted as passes.

The [September 12 audit](../reports/wcag-audit-2026-09-12/README.md), [triage](../reports/wcag-audit-2026-09-12/regression-triage.md), and [archived v1.5 VPAT](../docs/accessibility/archive/AlloFlow-ACR-v1.5-2026-09-12.md) remain available.

Full conformance is not established. Continue the [manual test plan](../docs/accessibility-manual-test-plan.md), including screen-reader, native browser zoom, complete live/authenticated workflows, media alternatives and generated-output checks. The historical Create-tab loading relationship and other unresolved fixture/product diagnostics remain open.
`;
fs.writeFileSync(path.join(root,'a11y-audit/WCAG-2.2-current-audit.md'),current);
const manual=path.join(root,'docs/accessibility-manual-test-plan.md');let m=fs.readFileSync(manual,'utf8');const heading='### September 19, 2026 follow-up';if(!m.includes(heading))m+='\n\n'+heading+'\n\nSee the [v1.6 follow-up](../reports/wcag-audit-2026-09-19/README.md) for keyboard-scroll, search-state and themed-fixture evidence. Manual follow-up should verify the new named chart/statistics regions with a screen reader and the search relationship during real typing, clearing and navigation. Screen readers, native zoom, complete workflows and export/media checks remain open. The original full regression run has not been repeated for v1.6.\n';if (fs.readFileSync(manual,'utf8') !== m) fs.writeFileSync(manual,m);
console.log('Wrote dated evidence report, current audit and manual-plan update.');
