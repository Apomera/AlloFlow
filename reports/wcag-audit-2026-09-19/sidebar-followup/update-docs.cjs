const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../../..'),dir=__dirname;process.chdir(root);
const read=f=>fs.readFileSync(f,'utf8');const json=f=>JSON.parse(read(path.join(dir,f)));
const browser=json('browser-results.json'),base=json('tests.json'),last=json('final-tests.json'),theme=json('history-theme-retest.json');
assert.equal(browser.error,undefined);assert.equal(browser.checks.length,6);assert.ok(browser.checks.every(c=>c.passed));assert.equal(browser.states.filter(s=>s.violations).length,4);assert.ok(browser.states.filter(s=>s.violations).every(s=>!s.violations.length&&s.width<=s.viewport));assert.equal(browser.pageErrors.length,0);
assert.equal(base.success,true);assert.equal(base.numPassedTests,18);assert.equal(theme.success,true);assert.equal(theme.numPassedTests,4);
for(const name of ['sidebar_tabs_navigation_a11y.test.js','history_panel_discovery_controls.test.js'])assert.equal(last.testResults.find(s=>s.name.endsWith(name))?.status,'passed');
const report=`# Sidebar accessibility follow-up — September 19, 2026

The Create-tab loading relationship (INV-01) is repaired and verified in a fresh local app preview. This follow-up extends the [September 19 audit](../README.md) and [current VPAT](../../../VPAT-2.5-WCAG-AlloFlow.md).

## Changes

- Create and History now control persistent, labelled tab panels. Their IDs exist during loading and while inactive; inactive content is hidden. Existing tour and source-input IDs remain intact. Desktop panels accept focus; mobile retains its outer workspace tab-panel relationship.
- Both arrow directions wrap between tabs. Home/End move focus; Enter/Space activate. Tab buttons use their visible translated names, have English fallbacks when translations are missing, and cannot submit a surrounding form.
- The desktop workspace has a named region role. The History resource count has a named, atomic status role and stronger text contrast. Its measured light-theme contrast improved from 4.34:1 to ${browser.historyBadge.ratio.toFixed(2)}:1 in the live preview.
- The History More menu supplies aria-controls while its popup exists. Keyboard opening focuses a menu item; Escape closes the menu and restores the trigger.

These relationships and keyboard behavior follow the [W3C tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). Pattern guidance supports implementation review; it is not itself a product-wide conformance determination.

## Verification

[Browser evidence](browser-results.json): **6 interaction checks pass**, with **zero axe A/AA violations and no document overflow in four sidebar states**: desktop loading Create, ready Create, ready History, and mobile Create at 320px. No page errors were captured. The source module's response was deliberately held until the loading and tab-switching checks finished. The runner uses current generated App.jsx, React, local canonical lazy modules, and an isolated esbuild development bundle with the existing compiled Tailwind sheet. It does not replace or certify the production /app/ release. Third-party requests were blocked; data are from a fresh unauthenticated session.

**34 distinct regression assertions pass across focused runs:** [18 existing sidebar assertions](tests.json), [5 navigation and 7 History discovery assertions](final-tests.json), and [4 History theme assertions](history-theme-retest.json). The final-tests file also retains one initial theme-test failure: its old selector searched for aria-controls while the popup was closed. The updated regression selects the menu button by its popup semantics and verifies the conditional relationship; all four theme tests then pass. The [initial navigation failure](navigation-before-fixture-fix.json) came from the isolated harness using the browser's native History constructor instead of the app's icon; the corrected fixture supplies that icon. The first combined run omitted the requested navigation file, so its 18-pass report is counted only for the two files actually present.

Generated navigation and History modules match their public mirrors. Local shell sources were regenerated with the development shell-only build. [Validation](validation.json) records source hashes, syntax checks, document links and the 55-row VPAT inventory. Changes are local; no publication occurred.

## Remaining limits

The final ready-History axe sample retains contrast review items for four nodes with gradients/background imagery: heading, saved status, filter select and empty-state message. They are incomplete checks, not asserted passes. The open menu retains axe's popup-target review item; the browser checks directly verified its target, focus and dismissal. Status announcements still need assistive-technology verification.

This is a sampled local browser audit. NVDA/VoiceOver, browser-native zoom, authenticated and complete workflows, generated outputs, other browsers, additional themes/forced colors in the complete app, and other tool findings remain open. The VPAT ratings remain qualified and unchanged.

## Reproduce

After regenerating current local sources and module mirrors, run:

\`\`\`powershell
node reports/wcag-audit-2026-09-19/sidebar-followup/run-browser.cjs
node node_modules/vitest/vitest.mjs run tests/sidebar_tabs_navigation_a11y.test.js tests/sidebar_shell_extraction.test.js tests/view_sidebar_panels_wcag_a11y.test.js tests/history_panel_discovery_controls.test.js tests/history_panel_theme.test.js --maxWorkers=1 --testTimeout=60000
\`\`\`
`;
fs.writeFileSync(path.join(dir,'README.md'),report);
function once(s,a,b){assert.equal(s.split(a).length,2,'Unique documentation anchor: '+a.slice(0,80));return s.replace(a,b);}
let f='VPAT-2.5-WCAG-AlloFlow.md',s=read(f);
s=once(s,'Existing compiled web shell and current module fixtures are separate evidence layers.','Existing compiled web shell, current module fixtures, and the September 19 fresh sidebar development preview are separate evidence layers.');
s=once(s,'source review and mirror checks. September 12 historical evidence:', 'source review and mirror checks; a fresh development preview additionally tests delayed sidebar loading, tab/menu keyboard interaction and 320px reflow. September 12 historical evidence:');
s=once(s,'The Create-tab loading relationship (INV-01) recurs in the September 19 desktop onboarding sample and remains open; it resolves in the ready workspace.','The earlier September 19 sample reproduced INV-01. The [sidebar follow-up](reports/wcag-audit-2026-09-19/sidebar-followup/README.md) repairs it with persistent labelled panels and verifies relationships while module loading is deliberately delayed, during switching and after readiness. The workspace region and History status/menu semantics were also corrected; assistive-technology behavior remains unverified.');
s=once(s,'| **2.1.1 Keyboard** | Partially Supports |','| **2.1.1 Keyboard** | Partially Supports | The September 19 sidebar follow-up verifies manual tab activation, arrow wrapping, Home/End, focusable panels and History-menu keyboard opening/Escape focus return in a fresh local app preview.');
s=once(s,'| **2.5.3 Label in Name** | Partially Supports |','| **2.5.3 Label in Name** | Partially Supports | The September 19 sidebar follow-up makes tab names derive from their visible localized labels and tests missing translations.');
s=once(s,'| **1.4.3 Contrast (Minimum)** | Partially Supports |','| **1.4.3 Contrast (Minimum)** | Partially Supports | The sidebar follow-up also corrects the History count badge (4.34:1 before; '+browser.historyBadge.ratio.toFixed(2)+':1 measured after); four History gradient/background contrast items still require review.');
fs.writeFileSync(f,s);
f='a11y-audit/WCAG-2.2-current-audit.md';s=read(f);s=once(s,'- Repaired keyboard access to Architecture', '- Closed the Create-tab loading finding INV-01 in a [fresh local sidebar preview](../reports/wcag-audit-2026-09-19/sidebar-followup/README.md): stable labelled panels, complete tab-key behavior, visible translated names, History count contrast/status semantics, and menu target/focus checks. Six browser interaction checks and four sidebar axe/reflow states pass; 34 distinct regression assertions pass across scoped runs. Gradient contrast and screen-reader checks remain open.\n- Repaired keyboard access to Architecture');s=once(s,'The historical Create-tab loading relationship and other unresolved fixture/product diagnostics remain open.','Other unresolved fixture/product diagnostics remain open; INV-01 is repaired in the current local source and preview.');fs.writeFileSync(f,s);
f='reports/wcag-audit-2026-09-19/README.md';s=read(f);s=once(s,'Still open: the historical Create-tab lazy-loading relationship (INV-01), Nuclear Lab','INV-01 was subsequently repaired and verified in the [sidebar follow-up](sidebar-followup/README.md), which adds a fresh development preview, History badge/ARIA repairs and tab/menu keyboard evidence. The earlier raw results above remain historical to that follow-up.\n\nStill open: Nuclear Lab');fs.writeFileSync(f,s);
f='docs/accessibility-manual-test-plan.md';s=read(f);s+='\n\n## September 19 sidebar follow-up\n\nSee the [local sidebar report](../reports/wcag-audit-2026-09-19/sidebar-followup/README.md). Browser checks now cover delayed loading, switching, manual activation, mobile panel labels and History-menu Escape focus return. Continue with NVDA/VoiceOver to confirm tab/panel announcements, atomic History count changes and loading/retry announcements. Review the four unresolved History gradient/background contrast nodes. Repeat full app theme, zoom, RTL and student-mode checks before treating this sample as release-level evidence.\n';fs.writeFileSync(f,s);
console.log('Updated VPAT, current audit, manual test plan and sidebar evidence report.');
