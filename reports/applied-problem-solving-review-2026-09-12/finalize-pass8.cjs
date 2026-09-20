const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
const broad=read('pass8-regression.json'),final=read('pass8-final-recheck.json'),browser=read('pass8-browser-results.json');
if(!final.success||browser.errors.length||browser.states.some(state=>state.violations.length||state.width!==state.pageWidth))throw Error('Validation is incomplete');
const suites=new Map();for(const report of [broad,final])for(const suite of report.testResults)suites.set(path.basename(suite.name),suite);
const tests=[...suites.values()].flatMap(suite=>suite.assertionResults);
if(tests.some(test=>test.status!=='passed'))throw Error('Unresolved regression');
const mirrors=['applied_challenge_module.js','studio_response_module.js','doc_pipeline_module.js','ui_strings.js'].map(file=>({file,matches:fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(root,'desktop/web-app/public',file)))}));
if(mirrors.some(file=>!file.matches))throw Error('Mismatched shipped file');
const result={date:'2026-09-19',passed:tests.length,suites:suites.size,method:'Use each suite from the broad regression run, replacing the four rechecked suites with their final results. The final recheck adds full-export reference coverage and resolves the navigation assertion.',broad:{passed:broad.numPassedTests,failed:broad.numFailedTests},finalRecheck:{passed:final.numPassedTests,failed:final.numFailedTests},browserStates:browser.states.length,pageErrors:browser.errors.length,axeViolations:0,mirrors,liveAi:read('pass8-live-ai-readiness.json').readiness,learnerSessions:0};
fs.writeFileSync(path.join(__dirname,'pass8-validation-summary.json'),JSON.stringify(result,null,2)+'\n');
const initial=width=>browser.states.find(state=>state.label==='Initial '+width);
const report=`# Pass 8: reduce repeated writing and simplify the workspace

Implemented locally September 19, 2026. No deployment was performed.

## What changed

- **Point to existing reasoning.** The review now offers “I've explained this elsewhere” for lesson connections, checks, decisions, and transfer. Learners can identify a passage or location in their response, linked work with an explanation, or evidence notes. These are explicitly learner-created references, not verification or grades. Changes to the underlying text/link require rechecking. Saving and removing a reference preserve useful keyboard focus.
- **Keep references with the response.** References survive the shared learner-response boundary, text backup, restoration, typed submission, response/teacher print copies, and full HTML export. Blank task/paper presets omit them. The full-export fallback retains the location with a recheck notice. AI feedback receives the learner's location and freshness status, without gaining access to an external artifact.
- **Simpler mobile navigation.** Backup/restore controls sit in a work menu, with device-save status outside it and recovery controls expanded after a save error. Progress uses the same five stages as navigation. Lesson ideas, the situation, and requirements are accessible above the active work, with a return-to-writing control. Repeated context and identical prompt text take less space.
- **Search without the organizer.** Selected references append to ordinary evidence notes when the organizer is off. Existing writing is preserved; duplicate and capacity checks reject an addition without truncation. Source links can be reopened, and source-review prompts focus the notes. Citation metadata alone does not count as an explanation. Adding a source clears an earlier coaching hint.
- **Editable query starters.** Learners may start with a teacher-provided open question and edit it. No search runs until they explicitly press Search. The existing provider labeling, privacy boundary, and availability policy remain in effect.
- **Clearer setup and expression choices.** Available time appears beside the lesson target; customization is folded into one panel; a readable summary explains task depth and support. Build presents writing and linked sketch/model/recording options directly. Optional vocabulary help explains claim, assumption, tradeoff, and criterion.

## Validation

- **${tests.length} passing tests across ${suites.size} suites**, using the latest result for each suite. The broad run passed ${broad.numPassedTests} tests and exposed one navigation assertion tied to the previous progress UI; the final ${final.numPassedTests}-test recheck passed. An earlier shared test was updated to call the repository's already-extracted host handler. Application host code was not changed for that test correction.
- **${browser.states.length} browser states** across 1280px, 390px, and 320px, including reference save/edit/recheck, ordinary-notes source capture, and teacher setup. Zero page errors, horizontal overflow, or axe violations in the inspected states. This is automated accessibility coverage, not a complete accessibility certification.
- Reviewed mobile start and reference-review screenshots. At 390px, the authored starting page is **${initial(390).height}px tall**, down from 2139px (about 28% shorter). The first field starts at ${initial(390).firstField}px, down from 964px. At 320px it starts at ${initial(320).firstField}px, down from 1094px. These include the preview banner and toolbar and are fixture-specific measurements.
- Source freshness checked with the component builder; generated root/public bundles and catalogs match. Scoped whitespace checks passed.

Details: [validation summary](pass8-validation-summary.json), [final tests](pass8-final-recheck.json), [browser results](pass8-browser-results.json), [preview](current-preview.html?pass=8).

## Remaining evidence and later options

The preview uses an authored task and mocked AI/search. The September 19 live-AI readiness check still reports a missing credential in this execution environment; **zero model calls were made**. No learner sessions have been conducted. [Updated trial tasks](PASS8-TRIAL.md) cover reference discoverability, changed writing, ordinary-notes sources, expression choice, and teacher setup.

Structured citation records, teacher-selected source collections, and native recording/drawing integration remain later options to prioritize from trial observations. This pass adds editable query starters and consistent capture to the existing Google-backed search integration; it does not automatically search or generate answers.
`;
fs.writeFileSync(path.join(__dirname,'PASS8.md'),report);
console.log(JSON.stringify(result));
