const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm');
const root=path.resolve(__dirname,'../../..');process.chdir(root);const d=path.relative(root,__dirname).replaceAll('\\','/')+'/';const read=f=>fs.readFileSync(f,'utf8');const result=JSON.parse(read(d+'results.json')),tests=JSON.parse(read(d+'final-regressions.json'));
assert.equal(result.verification.passed,true);assert.equal(result.states.length,6);assert.equal(tests.success,true);assert.equal(tests.numPassedTests,17);
for(const s of result.states){assert.equal(s.violations.length,0);if(s.state==='populated'){assert.equal(s.mobile.length,2);assert.equal(s.colors.filter(c=>c.placeholder).length,2);assert.equal(s.hover.length,1);for(const m of s.mobile){assert.equal(m.titles.length,2);assert.ok(m.titles.every(t=>t.width>=100&&t.scrollWidth<=t.width&&t.scrollHeight<=t.height));}}}
function write(f,s){if(fs.existsSync(f)&&read(f)===s)return;try{fs.writeFileSync(f,s);}catch(e){const a=path.resolve(f);if(!a.startsWith(root+path.sep))throw e;const next=a+'.wcag-next-'+process.pid,old=a+'.wcag-previous-'+process.pid;fs.writeFileSync(next,s);fs.renameSync(a,old);try{fs.renameSync(next,a);}catch(err){fs.renameSync(old,a);throw err;}fs.unlinkSync(old);}}
function once(s,a,b){assert.equal(s.split(a).length,2,'Unique anchor: '+a.slice(0,90));return s.replace(a,b);}
write(d+'README.md',`# History contrast and reflow follow-up — September 19, 2026

This local follow-up fixes contrast in populated History states and mobile clipping in the new-unit form and resource titles. It extends the [sidebar audit](../sidebar-followup/README.md) and [current VPAT](../../../VPAT-2.5-WCAG-AlloFlow.md). No deployment occurred.

## Verified changes

| Text/control | Before | After |
| --- | ---: | ---: |
| Light search and unit-name placeholders | 2.56:1 | 4.76:1 |
| Light new-unit Cancel | 4.25:1 | 6.78:1 |
| Light resource-type badge | 4.34:1 | 6.92:1 |
| Dark Save, default | 4.47:1 | 4.70:1 |
| Dark Save, hovered | 2.98:1 | 7.04:1 |

Values are rounded for display; verification uses unrounded ratios. Light secondary and placeholder text are darker. Dark primary-button text now uses black against the existing purple backgrounds. High-contrast theme colors are retained. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) includes placeholders and hover text within the criterion's scope.

The new-unit row wraps when necessary. Previously Cancel extended to approximately 348px in light/dark and 357px in high-contrast at a 320px viewport. The repaired layout has a 320px scroll width and keeps every sampled control in view. Resource-card rows also wrap, titles use the available width and may break long words, and the two-line clamp is removed. Both sample resource titles remain fully visible at 320px with enlarged text spacing in all three themes.

## Evidence and scope

- [Final browser evidence](results.json): six empty/populated theme-state axe scans have no A/AA violations. Six mobile layout samples cover light, dark and high-contrast with normal and enlarged spacing; control bounds and title content dimensions pass. The spacing sample confirms 14px text with 21px line height, 1.68px letter spacing and 2.24px word spacing after transitions settle.
- [17 regression assertions](final-regressions.json) pass across History theme, discovery and keyboard reordering tests.
- [Initial contrast baseline](baseline.json), [pre-repair form bounds](before-reflow-fix.json), and [pre-title-repair evidence](before-title-reflow-fix.json) retain earlier observations. Screenshots alongside this report show the final render.
- The live React fixture uses the canonical History module, AppStyles, compiled Tailwind stylesheet, English UI strings and two representative resources. It sets the real theme context. Icons are stubbed, so icon rendering/contrast is outside this sample. Data-changing handlers are fixture callbacks; complete save, rename, authentication and persistence workflows were not tested. This is component-level evidence, separate from the earlier full-app preview.

For three prior gradient-backed text review items (heading, saved status and empty-state message), computed foreground colors and composited backgrounds now provide supporting contrast evidence. The sampler evaluates two-stop gradients at 101 positions and composites translucent layers; it flags unsupported images, opacity and painted pseudo-elements. Images covered by a subsequent opaque surface are excluded from the background calculation. These calculations do not certify every pixel or every app surface.

Axe incomplete results remain in the evidence, including native-select background images, conditional Move-to-unit popup targets and additional gradient-backed/short-content nodes. Assistive-technology announcements, native browser zoom, real icon rendering, longer/localized datasets and complete app workflows remain open. VPAT ratings are unchanged.

The audit harness initially had a non-unique selector ([error](selector-error.json)). Its first spacing assertion also accepted a nonnumeric computed value; the [diagnostic](spacing-transition-diagnostic.json) exposed the transition timing. The final gate requires numeric effective spacing and waits for it before measuring. Earlier apparent spacing passes are not relied upon.

## Reproduce

\`\`\`powershell
node reports/wcag-audit-2026-09-19/history-contrast/run-browser.cjs --verify
node node_modules/vitest/vitest.mjs run tests/history_panel_theme.test.js tests/history_panel_discovery_controls.test.js tests/history_panel_reorder_a11y.test.js --maxWorkers=1 --testTimeout=60000
\`\`\`

[Validation](validation.json) records source hashes, module mirror parity, syntax, document links and the VPAT criterion inventory.
`);
let f='VPAT-2.5-WCAG-AlloFlow.md',s=read(f);
s=once(s,'four History gradient/background contrast items still require review.','the later [History contrast/reflow follow-up](reports/wcag-audit-2026-09-19/history-contrast/README.md) repairs light placeholders, Cancel/type badges and dark Save text, with supporting color measurements for three earlier gradient-text review items. Six theme-state axe samples have no violations; select-image and other incomplete checks remain.');
s=once(s,'| **1.4.10 Reflow** | Partially Supports |','| **1.4.10 Reflow** | Partially Supports | The later History follow-up repairs the new-unit form and cramped resource titles; populated component samples fit at 320px across light, dark and high-contrast themes.');
s=once(s,'| **1.4.12 Text Spacing** | Partially Supports |','| **1.4.12 Text Spacing** | Partially Supports | The later History component sample verifies effective computed spacing after transitions and checks complete title visibility and control bounds at 320px across three themes.');write(f,s);
f='a11y-audit/WCAG-2.2-current-audit.md';s=read(f);s=once(s,'- Closed the Create-tab loading finding','- The [History contrast/reflow follow-up](../reports/wcag-audit-2026-09-19/history-contrast/README.md) fixes placeholder, secondary-label and dark Save contrast, plus mobile new-unit and resource-title clipping. Six theme-state axe samples and six mobile bounds/spacing samples pass; 17 targeted regression assertions pass. This uses a live component fixture; icons and complete workflows remain outside scope.\n- Closed the Create-tab loading finding');write(f,s);
f='docs/accessibility-manual-test-plan.md';s=read(f);s+='\n\n## September 19 History contrast and reflow follow-up\n\nSee the [History report](../reports/wcag-audit-2026-09-19/history-contrast/README.md). Placeholders, Cancel/type badges and dark Save colors now meet the measured text-contrast threshold in sampled states. The new-unit form and resource titles fit at 320px with verified effective spacing in three themes. Continue native select-image contrast review, Move-to-unit popup/AT checks, long and localized titles, actual icons, zoom, and complete create/rename/save workflows. Three earlier gradient-backed text samples have supporting computed color measurements; retain broader manual review.\n';write(f,s);
f='reports/wcag-audit-2026-09-19/README.md';s=read(f);s+='\n\n## Later History contrast and reflow checks\n\nThe [History follow-up](history-contrast/README.md) adds populated light/dark/high-contrast samples, repairs measured text-contrast failures and mobile form/title clipping, and records 17 passing regression assertions. It retains incomplete checks and distinguishes component fixtures from the earlier app preview.\n';write(f,s);
const validation={checkedAt:new Date().toISOString(),errors:[],sourceHashes:{},browserPass:result.verification.passed,regressionPass:tests.success,regressionAssertions:tests.numPassedTests};
for(const file of ['view_history_panel_source.jsx','view_history_panel_module.js',d+'run-browser.cjs',d+'results.json',d+'final-regressions.json'])validation.sourceHashes[file]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
new vm.Script(read('view_history_panel_module.js'));new vm.Script(read(d+'run-browser.cjs'));
validation.moduleMirror=read('view_history_panel_module.js')===read('desktop/web-app/public/view_history_panel_module.js');assert.ok(validation.moduleMirror);
const rows=[...read('VPAT-2.5-WCAG-AlloFlow.md').matchAll(/^\| \*\*(\d\.\d\.\d+)[^|]+\| ([^|]+) \|/gm)];validation.vpat={criteria:rows.length,unique:new Set(rows.map(r=>r[1])).size,ratings:rows.reduce((o,r)=>(o[r[2].trim()]=(o[r[2].trim()]||0)+1,o),{})};assert.equal(rows.length,55);assert.equal(validation.vpat.unique,55);
for(const file of [d+'README.md','VPAT-2.5-WCAG-AlloFlow.md','a11y-audit/WCAG-2.2-current-audit.md','docs/accessibility-manual-test-plan.md','reports/wcag-audit-2026-09-19/README.md'])for(const m of read(file).matchAll(/\]\(([^)]+)\)/g)){if(/^(https?:|#|mailto:)/.test(m[1]))continue;const p=path.resolve(path.dirname(file),m[1].split('#')[0]);if(p===path.resolve(d+'validation.json'))continue;if(!fs.existsSync(p))validation.errors.push({file,url:m[1]});}
write(d+'validation.json',JSON.stringify(validation,null,2));assert.equal(validation.errors.length,0);console.log(JSON.stringify({moduleMirror:validation.moduleMirror,vpat:validation.vpat,tests:validation.regressionAssertions,errors:validation.errors},null,2));
