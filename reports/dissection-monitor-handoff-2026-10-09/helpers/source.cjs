const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),vm=require('vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-monitor-handoff-2026-10-09'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js'),'utf8'),baseline=JSON.parse(fs.readFileSync(path.join(report,'baseline.json')));assert.equal(hash(before),baseline.source);
let text=before;const edits=[];function edit(name,a,b){assert.equal(text.split(a).length,2,name);text=text.replace(a,b);edits.push({name,before:a,after:b});}
edit('Derive Simple steps after the learning gate is available',`          var activeInstrumentState = procedureInstrumentStatus(activeInstrument);
          if (simplifiedInstructions) {
            activeInstrumentState = Object.assign({}, activeInstrumentState, { instruction: procedureNext.action === 'complete' ? 'Done. Complete this layer.' : 'Next: ' + procedureNext.label + '.' });
          }
`,`          var activeInstrumentState = procedureInstrumentStatus(activeInstrument);
`);
edit('Use the learning phase for technique status and concise guidance',
`          var studyRoute = d.practicalMode ? 'study' : (d.guidedMode ? 'guided' : (d.quizMode ? 'quiz' : ((d.eyeStudyMode || d.flashcardMode || d.compareMode || d.toolbarStudyOpen) ? 'study' : 'explore')));`,
`          var studyRoute = d.practicalMode ? 'study' : (d.guidedMode ? 'guided' : (d.quizMode ? 'quiz' : ((d.eyeStudyMode || d.flashcardMode || d.compareMode || d.toolbarStudyOpen) ? 'study' : 'explore')));
          var currentLearningStep = PROCEDURE_STEPS.find(function (step) { return step.id === currentLearningGate.action; });
          var currentLearningActionLabel = currentLearningStep ? currentLearningStep.label : procedureActionLabel(currentLearningGate.action);
          var techniquePracticePhase = currentLayerDone ? 'Layer revealed'
            : currentLearningGate.required ? (currentLearningGate.phase === 'reflect' ? 'Explanation needed' : 'Plan needed')
            : layerTechniqueComplete ? 'Technique complete' : 'Step ' + (procedureStageIdx + 1) + ' of ' + PROCEDURE_STEPS.length;
          var techniquePracticeSummary = currentLayerDone || layerTechniqueComplete ? techniquePracticePhase
            : currentLearningGate.required ? techniquePracticePhase + ': ' + currentLearningActionLabel : procedureNext.label;
          if (simplifiedInstructions) {
            var simplifiedTechniqueCue = d._incisionAnim && d._incisionAnim.active ? 'Wait for the current technique to finish.'
              : currentLayerDone || layerTechniqueComplete ? techniquePracticePhase + '. Review specimen evidence.'
              : currentLearningGate.required ? (currentLearningGate.phase === 'reflect' ? 'Next: explain the observed result.' : 'Next: choose a safe plan.')
              : 'Next: ' + procedureNext.label + '.';
            activeInstrumentState = Object.assign({}, activeInstrumentState, { instruction: simplifiedTechniqueCue });
          }`);
edit('Give the monitor an honest checkpoint or preparation action',`          var nextActionModel;`,
`          var monitorTechniqueActionDisabled = !!(d._incisionAnim && d._incisionAnim.active) || currentLayerDone || layerTechniqueComplete || (currentLearningGate.required && !equivalentProcedureCheckpointAvailable);
          var monitorTechniqueActionLabel = currentLayerDone ? 'Layer revealed'
            : d._incisionAnim && d._incisionAnim.active ? 'Technique in progress...'
            : currentLearningGate.required ? (currentLearningGate.phase === 'reflect' ? 'Explain result' : 'Review plan')
            : layerTechniqueComplete ? 'Technique complete' : 'Prepare next';
          var monitorTechniqueActionDescription = monitorTechniqueActionDisabled ? monitorTechniqueActionLabel
            : equivalentProcedureCheckpointAvailable ? monitorTechniqueActionLabel + ': ' + currentLearningActionLabel
            : 'Prepare next technique step: ' + procedureNext.label;
          var nextActionModel;`);
edit('Route monitor checkpoints through focus only and retain native preparation',
`                      React.createElement("button", {
                        type: "button",
                        className: "diss-stage__telemetry-prepare",
                        disabled: currentLayerDone || procedureNext.action === 'complete',
                        onClick: prepareNextProcedureStep,
                        "aria-label": procedureNext.action === 'complete' ? 'Current layer protocol complete' : 'Prepare next technique step: ' + procedureNext.label
                      }, procedureNext.action === 'complete' ? 'Protocol complete' : 'Prepare next')`,
`                      studyRoute === 'explore' && React.createElement("button", {
                        type: "button",
                        className: "diss-stage__telemetry-prepare",
                        disabled: monitorTechniqueActionDisabled,
                        onClick: equivalentProcedureCheckpointAvailable ? function () { focusDissectionTarget('diss-learning-check-title'); } : prepareNextProcedureStep,
                        "aria-controls": equivalentProcedureCheckpointAvailable ? 'diss-learning-checkpoint' : undefined,
                        "aria-label": monitorTechniqueActionDescription
                      }, monitorTechniqueActionLabel)`);
edit('Technique summary describes the current learning decision',`                      React.createElement("span", null, layerTechniqueComplete ? 'Protocol complete' : procedureNext.label)`,`                      React.createElement("span", null, techniquePracticeSummary)`);
edit('Technique heading waits for the explanation before claiming completion',`                        React.createElement("h4", { id: "diss-procedure-title" }, 'Technique practice \\u00B7 ' + (procedureStageIdx >= PROCEDURE_STEPS.length ? 'ready to complete' : 'step ' + (procedureStageIdx + 1) + ' of ' + PROCEDURE_STEPS.length)),`,`                        React.createElement("h4", { id: "diss-procedure-title" }, 'Technique practice \\u00B7 ' + techniquePracticePhase),`);
edit('Name the physical action strip separately from verified learning',`                    React.createElement("div", { className: "diss-procedure__steps", "aria-label": procedureStageIdx + ' of ' + PROCEDURE_STEPS.length + ' technique steps complete' },`,`                    React.createElement("div", { className: "diss-procedure__steps", role: "group", "aria-label": procedureStageIdx + ' of ' + PROCEDURE_STEPS.length + ' actions performed' },`);
edit('Readable responsive monitor action and technique status',`.diss-stage__telemetry-prepare { min-height: 2.75rem; font-size: .75rem; }`,
`[data-dissection-root] .diss-stage__telemetry-prepare { min-height: 3rem !important; min-width: 0; max-width: 100%; padding: .65rem .85rem; font-size: 1rem; line-height: 1.45; white-space: normal; overflow-wrap: anywhere; }
[data-dissection-root] .diss-stage__telemetry-prepare:focus-visible { outline: 3px solid #1766d2; outline-offset: -4px; }
.diss-procedure__summary { min-height: 3rem; flex-wrap: wrap; }
.diss-procedure__summary span { min-width: 0; overflow-wrap: anywhere; }
[data-dissection-root] .diss-procedure__summary :is(strong, span), [data-dissection-root] #diss-procedure-title, [data-dissection-root] #diss-active-tool-help { font-size: 1rem; line-height: 1.5; }
[data-dissection-root][data-text-size="large"] :is(.diss-stage__telemetry-prepare, #diss-procedure-title, #diss-active-tool-help), [data-dissection-root][data-text-size="large"] .diss-procedure__summary :is(strong, span) { font-size: 1.125rem !important; }
[data-dissection-root][data-text-size="large"] .diss-instrument-preparation #diss-active-tool-help { font-size: 1.125rem !important; }
[data-dissection-root][data-high-contrast="true"] .diss-stage__telemetry-prepare { color: #000; background: #fff; border-color: #111827; }
[data-dissection-root][data-high-contrast="true"] :is(.diss-procedure__summary, .diss-procedure__summary span, #diss-procedure-title) { color: #000; }
@container dissection (max-width: 640px) {
  .diss-procedure__summary { align-items: flex-start; flex-direction: column; gap: .3rem; }
  .diss-procedure__summary span { text-align: start; }
}
@media (forced-colors: active) {
  [data-dissection-root] .diss-stage__telemetry-prepare { color: ButtonText; background: ButtonFace; border-color: ButtonText; }
  [data-dissection-root] .diss-stage__telemetry-prepare:disabled { color: GrayText; border-color: GrayText; }
  [data-dissection-root] .diss-stage__telemetry-prepare:focus-visible { outline-color: Highlight; }
}`);
new vm.Script(text);let reversed=text;for(const e of [...edits].reverse()){assert.equal(reversed.split(e.after).length,2);reversed=reversed.replace(e.after,e.before);}assert.equal(reversed,before);
const disk=fs.statfsSync(repo);assert(disk.bavail*disk.bsize>256*1048576);
fs.writeFileSync(path.join(__dirname,'source-next.js'),text);fs.writeFileSync(path.join(report,'edits/source-edits.json'),JSON.stringify({before:hash(before),after:hash(text),edits},null,2));console.log(JSON.stringify({candidate:hash(text),edits:edits.length}));
