const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),parser=require('@babel/parser');
const root=__dirname,read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const full=read('all-anatomy-tests.json'),targeted=read('final-focused-tests-v2.json'),browser=read('browser-results.json'),finalBrowser=read('final-browser-results.json');
assert.equal(full.success,true);assert.equal(targeted.success,true);assert.deepEqual(browser.errors,[]);assert.deepEqual(finalBrowser.errors,[]);assert.deepEqual(finalBrowser.axe.violations,[]);assert.ok(finalBrowser.predictionFocus&&finalBrowser.resultFocus);
const latest=new Map();for(const report of [full,targeted])for(const suite of report.testResults)latest.set(suite.name,suite);
const assertions=[...latest.values()].flatMap(s=>s.assertionResults);assert.ok(assertions.every(a=>a.status==='passed'));
const source=fs.readFileSync('stem_lab/stem_tool_anatomy.js'),mirror=fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_anatomy.js');assert.ok(source.equals(mirror));parser.parse(source.toString(),{sourceType:'script'});
const table=JSON.parse(fs.readFileSync('dev-tools/i18n/handtl_anatomy_continuity_20260912.json','utf8')),english=read('english-new.json'),registry=JSON.parse(fs.readFileSync('dev-tools/i18n/stem_anatomy_en.json','utf8'));let verified=0;
for(const [lang,strings]of Object.entries(table)){assert.deepEqual(Object.keys(strings).sort(),Object.keys(english).sort());for(const prefix of ['','desktop/web-app/public/']){const pack=JSON.parse(fs.readFileSync(prefix+'lang/'+lang+'.js','utf8')).stem.anatomy;for(const[key,value]of Object.entries(strings)){assert.equal(pack[key],value);assert.equal(registry[key],english[key]);}verified++;}}
const result={date:new Date().toISOString(),sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),sourceMirrorIdentical:true,syntaxValid:true,fullRun:{passed:full.numPassedTests,failed:full.numFailedTests,files:full.testResults.length},finalTargetedRun:{passed:targeted.numPassedTests,failed:targeted.numFailedTests,files:targeted.testResults.length},latestVerifiedChecks:assertions.length,latestVerifiedFiles:latest.size,newTranslationKeys:Object.keys(english).length,verifiedLanguagePacks:verified,browser:{scenarios:browser.scenarios.map(s=>s.id),phoneWidths:[320,390],languages:browser.translations,exportAndReimport:browser.export&&browser.reimportStable,resumeImportedWriting:browser.resumeImportedWriting,errors:finalBrowser.errors,axe:finalBrowser.axe,focus:{activity:finalBrowser.activityFocus,prediction:finalBrowser.predictionFocus,result:finalBrowser.resultFocus},constantActinLength:finalBrowser.filaments}};
fs.writeFileSync(path.join(root,'validation-summary.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
const report=`# Anatomy: connected learning and scientific refinements

This enhancement pass connects study evidence across repeated organ entries, extends four existing guided scenarios into prediction and transfer activities, and brings learners’ explanations into the study sheet and portable record. The active web source and desktop mirror contain identical changes.

## What changed

- **Shared organ evidence.** The diaphragm, adrenal glands, ovaries, and testes now share confidence, review dates, and scored recall counts across their collection entries. Existing dated evidence resolves to the newest valid rating; undated ties use the more cautious rating. Notes remain attached to the individual entry, and context buttons open the related entry on the correct diagram. Pancreatic islets remain separate from the whole pancreas; the hypothalamus remains separate from the broader hypothalamic–pituitary axis.
- **Four guided learning sequences.** Exercise, meal absorption, wound repair, and fluid balance now have explicit objectives, a prediction before revealing the disruption, an explanation with a self-review checklist, and a new situation requiring transfer. Choices receive explanatory feedback. Writing is saved for reflection and is not automatically graded or converted into a mastery score.
- **A working quadriceps mechanism link.** The exercise scenario now opens the cellular muscle mechanism. Its caption identifies the diagram as a representative skeletal-muscle fiber schematic. The sarcomere preserves actin filament length as its Z discs move closer, and bounded arrowheads keep the filaments visible.
- **Portable explanations and practice.** The study sheet, copied/downloaded text, and JSON record include scenario explanations, transfer comparisons, and the temperature-feedback explanation. Recall counts appear separately from confidence. The sheet can return to the relevant activity, including imported writing before a new prediction is made.
- **Phone and accessibility refinements.** The native activity chooser includes Guided scenarios. The guided lesson takes precedence over the separate structure summary and introductory tips. Focus moves to the newly opened question and then the result. A measured pathway-label contrast failure was corrected. New fields support dark themes, Arabic right-to-left layout, visible focus, 44-pixel controls, and 16-pixel textarea text.
- **Localization.** All ${Object.keys(english).length} new strings were added to French, Latin American Spanish, and Arabic in both distributions.

## Scientific checks

The revised muscle copy distinguishes tension from shortening. The added transfer question covers an isometric hold, while the illustration shows a shortening phase. These distinctions are supported by [OpenStax on muscle tension](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-4-nervous-system-control-of-muscle-tension) and [sliding-filament contraction](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-3-muscle-fiber-contraction-and-relaxation).

The meal question specifies chylomicrons carrying absorbed long-chain dietary fats into lymph, distinguishing that route from the blood-capillary route used by sugars and amino acids. See [OpenStax on digestion and absorption](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-7-chemical-digestion-and-absorption-a-closer-look).

The wound question distinguishes surface closure from continued collagen remodeling, supported by [OpenStax on wound-healing phases](https://openstax.org/books/medical-surgical-nursing/pages/28-1-cellular-response-and-adaptation-in-wound-healing). The kidney question distinguishes filtration volume from barrier selectivity; see [OpenStax on kidney microanatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/25-4-microscopic-anatomy-of-the-kidney).

These references support the changed concepts. The diagrams remain teaching schematics; this pass does not establish clinical validity for every existing claim in the tool.

## Import behavior and limits

The existing version-1 format accepts optional recall counts and learning notes, so earlier exports remain readable. Imported data is validated against known IDs, field types, and size/count bounds. Current notes and explanations are retained when incoming writing conflicts. Active quiz answers, scenario choices, clinical display settings, and grade profiles are excluded from exports.

Practice records contain cumulative totals, not individually identifiable attempts. Imports therefore retain the larger complete record, keeping the local record when totals tie. They do not add snapshots together. This makes repeated imports stable but cannot combine independent practice histories from two devices without possible overlap. New scored answers consolidate legacy alias counts once.

## Verification

- Full anatomy run: **${full.numPassedTests}/${full.numTotalTests} passed** across ${full.testResults.length} files.
- After the final visual and focus changes: **${targeted.numPassedTests}/${targeted.numTotalTests} passed** in ${targeted.testResults.length} affected files, including four new filament-geometry checks.
- Combining each file’s latest result: **${assertions.length} passing checks across ${latest.size} files**. An intermediate focused run had two setup-hook failures under concurrent load; the final targeted run uses a longer setup allowance.
- Browser checks completed all four scenarios, keyboard prediction controls, wrong/correct transfer feedback, writing persistence, JSON download/import, stable repeated import, and activity return. Layouts were checked at 1280, 390, and 320 pixels, with no horizontal overflow in the sampled states.
- French, Spanish, Arabic, and Arabic dark-theme reflections were inspected. The final 320-pixel check verified that the revealed result lies within the viewport and receives focus.
- The sampled final axe scan reported **0 violations**. It left ${finalBrowser.axe.incomplete.map(r=>r.count+' '+r.id+' checks').join(' and ')} for manual review; this is not an accessibility-conformance claim. No browser JavaScript errors were recorded.
- Source and desktop mirror match byte for byte; syntax and ${verified} language catalogs passed validation.

Source SHA-256: \`${result.sourceSha256}\`.

## Evidence

- [Validation summary](validation-summary.json)
- [Browser flow results](browser-results.json) and [final geometry/focus results](final-browser-results.json)
- [Corrected sarcomere](quadriceps-final-step-3.png)
- [Phone prediction after focus](phone-focused-prediction.png) and [revealed result](phone-focused-result.png)
- [Arabic dark-theme reflection](phone-arabic-dark-reflection.png)
- [Study reflections](desktop-study-reflections.png)
`;
fs.writeFileSync(path.join(root,'README.md'),report);console.log('Review notes written.');
