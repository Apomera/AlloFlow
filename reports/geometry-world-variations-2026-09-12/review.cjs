const fs=require('fs'),vm=require('vm'),path=require('path');const directory=__dirname;
const reports=['regressions.json','final-tests.json'],suites=new Map();for(const file of reports){const report=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));for(const suite of report.testResults)suites.set(suite.name,suite);}
const tests=[...suites.values()].flatMap(s=>s.assertionResults),browser=JSON.parse(fs.readFileSync(path.join(directory,'browser-final.json'),'utf8'));
const source=fs.readFileSync('stem_lab/stem_tool_geometryworld_builder.js'),desktop=fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js');new vm.Script(source.toString());
const verification={unit:{passed:tests.filter(t=>t.status==='passed').length,failed:tests.filter(t=>t.status==='failed').length,pending:tests.filter(t=>t.status!=='passed'&&t.status!=='failed').length,files:suites.size,failedSuites:[...suites.values()].filter(s=>s.status!=='passed').map(s=>({name:s.name,status:s.status,message:s.message}))},browser:{passed:browser.assertions.filter(t=>t.pass).length,failed:browser.assertions.filter(t=>!t.pass),errors:browser.errors,failure:browser.failure||null},source:{syntax:true,desktopParity:source.equals(desktop)}};
fs.writeFileSync(path.join(directory,'verification.json'),JSON.stringify(verification,null,2));
if(verification.unit.failed||verification.unit.pending||verification.unit.failedSuites.length||verification.browser.failed.length||verification.browser.errors.length||verification.browser.failure||!verification.source.desktopParity)throw Error('Verification is incomplete.');
const review=`# Geometry World — project variations and print inspection

## Changes

- **Save as new variation:** fork the current editable geometry into a distinct local project and continue editing that copy. The previous saved version is preserved, including when recovering unsaved edits from a stale tab. Failed writes leave storage and the active project identity unchanged.
- **Duplicate project:** copy a saved design in My Worlds without opening it. Unique names, a Current project badge, compact cards, and keyboard focus on the new card make project navigation clearer.
- **Custom connecting bases:** choose a margin of 0–4 blocks, thickness of 1–4 blocks, and stone, wood, or brick appearance. Preview the complete plate and support columns, then apply them as one reversible edit. Capacity, bounds, collisions, and stale previews are checked before committing.
- **Inspect print regions:** focus the camera on a separate mesh piece or oversized region while keeping the full export selection intact. Gold corner brackets emphasize the inspected region; the surrounding printer guide is dimmed. Return camera restores the previous view. Piece lists paginate after eight cards.
- **Reopened-project fix:** clearing a print check while reopening identical geometry now invalidates the result cache. The refreshed check is reused during idle polling, including an unchanged export error.

## Verification

- ${verification.unit.passed} passing unit tests across ${verification.unit.files} suites; no failed or pending tests. The final focused rerun is merged by suite rather than double-counted.
- ${verification.browser.passed} browser assertions passed, with no page errors, in local Chromium using real WebGL.
- Browser workflows cover entry navigation, project copying/opening, keyboard focus, region inspection, camera return, custom brick bases, exact Undo, oversized models, 320px phone controls, and paginated piece lists.
- Source syntax and desktop mirror parity verified. Scoped git diff whitespace check passed.
- Screenshots: [My Worlds](01-project-variations.png), [print pieces](02-print-pieces.png), [focused region](03-focused-piece.png), [phone base settings](04-phone-base-controls.png), [phone inspection](05-phone-focused-piece.png).

## Delivery and limits

Implemented in stem_lab/stem_tool_geometryworld_builder.js and synchronized to desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js. New tests are geometry_world_variations.test.js, geometry_world_print_focus.test.js, and geometry_world_reopened_print_check.test.js.

The local shelf retains its existing limits: eight projects, 10,000 total saved blocks, and a 1.5 MiB serialized size. Editable JSON remains the portable backup. Base materials control appearance; physical filament and final mesh/support review belong in Print Lab or the slicer. Inspection does not automatically repair internal gaps or surfaces.

No commit or deployment was performed in this pass. The Gemini Canvas shared deployment was not changed or verified.
`;
fs.writeFileSync(path.join(directory,'REVIEW.md'),review);console.log(JSON.stringify(verification,null,2));
