const fs=require('node:fs'),path=require('node:path');
const out=path.join(__dirname,'enhancement'),unit=JSON.parse(fs.readFileSync(path.join(out,'final-unit-results.json'))),browser=JSON.parse(fs.readFileSync(path.join(out,'browser-results.json'))),touch=JSON.parse(fs.readFileSync(path.join(out,'touch-results.json')));
if(!unit.success || unit.numFailedTests || !browser.passed || !touch.passed)throw new Error('Required validation is not green');
const root=process.cwd().replaceAll('\\','/'),report=root+'/reports/geometry-world-deep-dive-2026-09-08',base=report+'/enhancement';
const note=`# Geometry World enhancement results

Implemented the audit's build-to-print improvements in the local application and synchronized all three desktop public mirrors. Geometry World now keeps an explicit selection, preserves the workspace through Print Lab revision, exports correctly oriented geometry, and provides a single downloadable print package.

## Changes and verified behavior

| Area | Result |
|---|---|
| Selection | Select build, keyboard measurement, and touch measurement establish a persistent outlined selection. Looking at another creation does not change the export. Removing a connecting block retains both selected fragments and reports separate pieces. Newly connected blocks join the selection. |
| Visual clarity | The selected creation has a cyan outline; gaps or edge-contact issues use amber. Build and Measure panels coordinate their visibility. Text and primary controls are larger. Select and Send remain pinned while details scroll. |
| Touch building | The Build control no longer covers Measure. The action bar no longer covers touch actions. Undo keeps a stable position, and a synthesized click cannot activate a different action after a touch changes the layout. Position information is collapsible. |
| Geometry | STL coordinates convert Geometry World's Y-up scene into Z-up print geometry. Adjacent partial faces are clipped and matched, and split edges are stitched to close valid joins. Placement animation does not shrink exported geometry. |
| Continuity | Revising through Print Lab restores all creations at their original positions, selection, undo/redo history, camera position and orientation, and chosen print scale. Material and printer profile also survive the round trip. The complete workspace snapshot remains local to the open browser session. |
| Print Lab | The incoming Geometry World model has a direct Check this model action. Alternative creation tools sit in a closed Start a different model section. The preview camera fits the complete model across viewport shapes. |
| Export | Download print package produces model.stl in final millimeters, a SHA-256 manifest with dimensions/material/profile/preflight, block-source.json, an importable editable-world.json when within sandbox limits, and read-me instructions. The separate editable-source download also uses the format Open editable world accepts. |
| Consistent entry points | Geometry World's older settings-menu print action uses the same selected-build handoff when the builder is available. |

## Verification

- **${unit.numPassedTests} tests passed, zero failed**, across 12 targeted test files. Coverage includes core geometry, keyboard access, engine lifecycle, display, Print Lab, printable geometry, and the Architecture Studio and Art Studio bridges.
- The production-geometry test exercises **768 two-shape combinations** across all four block shapes, four rotations per shape, and three neighbor axes. Area-connected pairs retain expected volume and have no open edges, non-manifold edges, or inconsistent winding.
- A cube beside a half slab exports as one closed mesh at the expected 187.5 mm³ at 5 mm/block. A gap above a slab remains two pieces. A dense sculpture with real edge-only contacts retains its warning.
- The browser workflow used the actual React tools and WebGL engine in a local minimal host. A 24-block asymmetric creation plus another separate creation survived revision without block loss. Keyboard build/undo created real history; the browser restored ${browser.checks.before.undo} undo and ${browser.checks.before.redo} redo entries.
- Width × depth × height agrees between the source summary, preflight, exported STL, and manifest: **10 × 15 × 20 mm at 5 mm/block**, then **20 × 30 × 40 mm at 10 mm/block**.
- The downloaded package's SHA-256 matches its actual STL bytes; material **${browser.checks.package.manifest.material}** and printer-bed depth **${browser.checks.package.manifest.printerProfile.bedDepthMm} mm** persisted. Its editable file successfully reopened as 24 blocks through the real file picker and replacement confirmation.
- On an emulated touch phone at **390 × 844**, real taps place exactly one block and undo it. All six touch action buttons and the Build control remain reachable before and after measurement. Both browser scripts reported zero page errors.
- Source/public mirror hashes match exactly. Targeted git diff whitespace checks passed.

These are local browser and automated checks. They do not constitute a physical print, a deployed-app audit, or verification against a specific school printer. Existing jsdom canvas warnings appeared in the unit run; the real WebGL checks passed separately.

## Screenshots

Desktop Print Lab arrival:

![Print Lab focuses on the incoming model, correct dimensions, and preflight](${base}/05-print-design.png)

Touch builder with pinned primary actions:

![Phone builder with Select build and Send to Print Lab visible above the scrolling details](${base}/12-touch-build.png)

Touch measurement with reachable action buttons:

![Touch measurement and separate build and action controls](${base}/11-touch-measure.png)

## Files and repeatable checks

- [Geometry World engine](${root}/stem_lab/stem_tool_geometryworld.js)
- [Builder and STL preparation](${root}/stem_lab/stem_tool_geometryworld_builder.js)
- [Print Lab](${root}/stem_lab/stem_tool_printlab.js)
- [New geometry, continuity, and interaction regressions](${root}/tests/geometry_world_print_workflow.test.js)
- [Unit results](${base}/final-unit-results.json)
- [Browser results](${base}/browser-results.json)
- [Touch results](${base}/touch-results.json)
- [Full browser verification script](${report}/verify-enhancement.cjs)
- [Touch verification script](${report}/verify-touch.cjs)

Run the browser scripts with Node from the repository root. They serve local assets on an ephemeral loopback port and close the browser/server when finished.

## Remaining boundaries

The package prepares a model for the school's slicer and staff review; it does not slice G-code or control a printer. Real gaps and edge-only contacts remain visible instead of being silently filled. Very large selections can exceed the editable sandbox's import limits; their package still preserves block-source.json and explicitly identifies the missing importable file. Complete-project revision continuity currently lasts while the browser session remains open; Save editable world remains the durable file-based recovery path.
`;
fs.writeFileSync(path.join(out,'ENHANCEMENTS.md'),note);
console.log(JSON.stringify({tests:unit.numPassedTests,failed:unit.numFailedTests,browser:browser.passed,touch:touch.passed,undo:browser.checks.before.undo,redo:browser.checks.before.redo,material:browser.checks.package.manifest.material,bedDepth:browser.checks.package.manifest.printerProfile.bedDepthMm,report:path.join(out,'ENHANCEMENTS.md')},null,2));
