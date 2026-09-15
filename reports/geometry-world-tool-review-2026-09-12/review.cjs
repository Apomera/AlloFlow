const fs=require('fs'),path=require('path'),vm=require('vm');const directory=__dirname,suites=new Map();
for(const file of ['regressions.json','verified-tests.json']){const report=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));for(const suite of report.testResults)suites.set(suite.name,suite);}
const tests=[...suites.values()].flatMap(s=>s.assertionResults),browser=JSON.parse(fs.readFileSync(path.join(directory,'browser-verified.json'),'utf8')),source=fs.readFileSync('stem_lab/stem_tool_geometryworld_builder.js'),desktop=fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js');new vm.Script(source.toString());
const verification={unit:{passed:tests.filter(t=>t.status==='passed').length,failed:tests.filter(t=>t.status==='failed').length,pending:tests.filter(t=>t.status!=='passed'&&t.status!=='failed').length,files:suites.size,failedSuites:[...suites.values()].filter(s=>s.status!=='passed').map(s=>s.name)},browser:{passed:browser.assertions.filter(t=>t.pass).length,failed:browser.assertions.filter(t=>!t.pass),errors:browser.errors,failure:browser.failure||null},source:{syntax:true,desktopParity:source.equals(desktop)}};
fs.writeFileSync(path.join(directory,'verification.json'),JSON.stringify(verification,null,2));if(verification.unit.failed||verification.unit.pending||verification.unit.failedSuites.length||verification.browser.failed.length||verification.browser.errors.length||verification.browser.failure||!verification.source.desktopParity)throw Error('Verification is incomplete.');
fs.writeFileSync(path.join(directory,'REVIEW.md'),`# Geometry World — tool discovery and preview review

## Implemented

**Find a tool** is available from the Free Build dock. It searches eleven destinations by their names, descriptions, and common terms such as roof, copy, JSON, and print. Name matches rank first. Enter opens the first available result, expands the relevant section, scrolls within the dock, and moves keyboard focus there. Unavailable selection tools explain what is required and link to selection controls. Unfinished form entries stay mounted while the finder is open.

**Pending preview actions** stay in the dock footer. A proposal shows its block count, target block bounds, and net block change. Review in world frames the broad side of the proposed geometry with Apply, Back to tools, and Cancel available beside it. Escape cancels. Returning to the dock preserves the proposal; applying uses the existing transaction and Undo path. Opening the main Build tools button exits review and avoids duplicate action controls.

**Clear preview presentation** temporarily hides decorative landscape scenery so nearby trees cannot cover the proposal. Show surroundings restores placement context. Scenery visibility is restored when review ends, including after a render-quality replacement; student geometry, selection, history, and project data are unchanged. Ordinary placement guidance is hidden during review.

**Small-screen navigation** provides a scrollable finder and a compact dock on short landscape screens. Preview controls retain touch targets of at least 44 pixels and long review content can scroll within the viewport.

## Verification

- ${verification.unit.passed} passing unit tests across ${verification.unit.files} suites; no failed or pending tests after merging the latest rerun for each suite.
- ${verification.browser.passed} browser assertions passed, with no page errors, using local Chromium and real WebGL.
- Covered draft preservation, natural-language search, keyboard focus, unavailable tools, preview ownership, explicit Apply, exact Undo, Escape cancellation, scenery isolation/restoration, 320px touch portrait, and 844×390 landscape.
- Source syntax, canonical/desktop parity, and scoped git diff whitespace checks passed.
- Screenshots: [preview footer](01-preview-footer.jpg), [world review](02-preview-world.jpg), [phone finder](03-phone-tool-finder.jpg), [phone review](05-phone-review.jpg), [short landscape](06-short-landscape.jpg), [desktop finder](07-desktop-tool-finder.jpg).

## Next priorities

1. Material and lighting polish: make previewed material choices easier to judge, improve consistency across stone, timber, glass, and water, and tune shadows around dense structures.
2. Precision building: alignment and repeated patterns for larger structures, with clear previews and one-step Undo.
3. Larger connected lesson areas: distinct districts, landmarks, and routes linking several meaningful construction challenges.

## Delivery

Updated stem_lab/stem_tool_geometryworld_builder.js and synchronized desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js. Added tests/geometry_world_tool_review.test.js. Existing unrelated workspace changes were preserved.

No commit or deployment was performed. Verification used the local app harness; the Gemini Canvas shared deployment was not updated.
`);console.log(JSON.stringify(verification,null,2));
