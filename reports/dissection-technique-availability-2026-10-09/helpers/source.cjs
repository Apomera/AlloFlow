const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-technique-availability-2026-10-09'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const before=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_dissection.js'),'utf8'),baseline=JSON.parse(fs.readFileSync(path.join(report,'baseline.json')));if(hash(before)!==baseline.source)throw Error('Source baseline drift');
let text=before;const edits=[];function edit(name,a,b){if(text.split(a).length!==2)throw Error('Nonunique '+name);text=text.replace(a,b);edits.push({name,before:a,after:b});}
const oldStart=text.indexOf('          var equivalentProcedureActionLabel;'),oldEnd=text.indexOf('          var nextActionModel;',oldStart);if(oldStart<0||oldEnd<0)throw Error('Missing action model');
edit('Make current availability explicit and give pending learning precedence over completion',text.slice(oldStart,oldEnd),`          var equivalentProcedureActionLabel;
          var equivalentProcedureActionHint;
          var equivalentProcedureCheckpointAvailable = !(d._incisionAnim && d._incisionAnim.active) && currentLearningGate.required && !d.practicalMode && procedureLearningCheckpointVisible();
          if (d._incisionAnim && d._incisionAnim.active) {
            equivalentProcedureActionLabel = 'Motor-neutral equivalent unavailable while the current technique animation finishes.';
            equivalentProcedureActionHint = 'Wait for the current technique animation to finish.';
          } else if (currentLearningGate.required) {
            equivalentProcedureActionLabel = 'Motor-neutral equivalent: ' + procedureNext.label + '. Complete the ' + (currentLearningGate.phase === 'reflect' ? 'reflection' : 'planning') + ' checkpoint first.';
            equivalentProcedureActionHint = equivalentProcedureCheckpointAvailable
              ? (currentLearningGate.phase === 'reflect' ? 'Explain the observed result in the learning checkpoint before continuing.' : 'Choose a safe plan in the learning checkpoint before performing this technique.')
              : 'Return to procedure practice to complete the ' + (currentLearningGate.phase === 'reflect' ? 'reflection' : 'planning') + ' checkpoint.';
          } else if (procedureNext.action === 'complete') {
            equivalentProcedureActionLabel = 'Technique protocol complete; use the Next best action card to inspect and record evidence';
            equivalentProcedureActionHint = 'Technique actions and explanations are complete. Follow Next best action to inspect and record evidence.';
          } else if (activeInstrument !== procedureNext.instrument) {
            equivalentProcedureActionLabel = 'Motor-neutral equivalent: ' + procedureNext.label + '. Select ' + nextToolDefinition.label + ' first.';
            equivalentProcedureActionHint = 'Select ' + nextToolDefinition.label + ' in the instrument tray before using the equivalent action.';
          } else if (!nextToolReadiness || !nextToolReadiness.safeToAct) {
            equivalentProcedureActionLabel = 'Motor-neutral equivalent: ' + procedureNext.label + '. ' + (nextToolReadiness ? nextToolReadiness.cue : 'Complete the readiness checks first.');
            equivalentProcedureActionHint = 'Prepare the field before using the equivalent action. ' + (nextToolReadiness ? nextToolReadiness.cue : 'Review the readiness checks.');
          } else {
            equivalentProcedureActionLabel = 'Motor-neutral equivalent: ' + procedureNext.label + '. Ready to record the equivalent technique action.';
            equivalentProcedureActionHint = 'Ready. This records a supported technique action; you still need to explain the result.';
          }
`);
edit('Keep the explanation and checkpoint route beside the existing equivalent action',
`                      React.createElement("button", { type: "button", className: "diss-procedure__next", disabled: equivalentProcedureActionDisabled, onClick: performNextProcedureStep, "aria-describedby": "diss-equivalent-technique-note", "aria-label": equivalentProcedureActionLabel }, procedureNext.action === 'complete' ? 'Technique complete' : ('Motor-neutral: ' + procedureNext.label)),
                      React.createElement("span", { id: "diss-equivalent-technique-note", className: "diss-sr-only" }, 'This control provides a motor-neutral equivalent after you choose the plan and prepare the field. It records supported technique and still requires an explanation before the next step.'),`,
`                      React.createElement("div", { className: "diss-equivalent-action" },
                        React.createElement("button", { type: "button", className: "diss-procedure__next", disabled: equivalentProcedureActionDisabled, onClick: performNextProcedureStep, "aria-describedby": "diss-equivalent-technique-note", "aria-label": equivalentProcedureActionLabel }, procedureNext.action === 'complete' ? (currentLearningGate.required && currentLearningGate.phase === 'reflect' ? 'Final explanation needed' : 'Technique complete') : ('Motor-neutral: ' + procedureNext.label)),
                        React.createElement("p", { id: "diss-equivalent-technique-note", className: "diss-equivalent-action__hint" }, equivalentProcedureActionHint),
                        equivalentProcedureCheckpointAvailable && React.createElement("button", { id: "diss-equivalent-checkpoint-link", type: "button", "aria-controls": "diss-learning-checkpoint", "aria-describedby": "diss-equivalent-technique-note", onClick: function () { focusDissectionTarget('diss-learning-check-title'); } }, currentLearningGate.phase === 'reflect' ? 'Explain result' : 'Review plan')
                      ),`);
edit('Readable compact equivalent-action group with responsive and contrast support',
`.diss-procedure__controls button:disabled { cursor: not-allowed; opacity: .55; }`,
`.diss-procedure__controls button:disabled { cursor: not-allowed; opacity: .55; }
.diss-equivalent-action { flex: 1 0 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: .6rem; min-width: 0; margin-bottom: .35rem; }
.diss-equivalent-action .diss-procedure__next { grid-column: 1 / -1; }
.diss-equivalent-action__hint { margin: 0; min-width: 0; color: #244744; line-height: 1.55; }
[data-dissection-root] .diss-equivalent-action :is(p, button) { font-size: 1rem; }
[data-dissection-root] .diss-equivalent-action button { min-height: 3rem !important; white-space: normal; line-height: 1.45; }
[data-dissection-root] .diss-equivalent-action button:focus-visible { outline: 3px solid #1766d2; outline-offset: -4px; }
[data-dissection-root][data-text-size="large"] .diss-equivalent-action :is(p, button) { font-size: 1.125rem !important; }
[data-dissection-root][data-high-contrast="true"] .diss-equivalent-action :is(p, button) { color: #000; background: #fff; border-color: #111827; }
@container dissection (max-width: 640px) { .diss-equivalent-action { grid-template-columns: minmax(0, 1fr); } }
@media (forced-colors: active) {
  [data-dissection-root] .diss-equivalent-action :is(p, button) { color: CanvasText; background: Canvas; border-color: CanvasText; }
  [data-dissection-root] .diss-equivalent-action button:focus-visible { outline-color: Highlight; }
}`);
new vm.Script(text);let reverse=text;for(const e of [...edits].reverse()){if(reverse.split(e.after).length!==2)throw Error('Nonunique inverse');reverse=reverse.replace(e.after,e.before);}if(reverse!==before)throw Error('Inverse failed');
fs.writeFileSync(path.join(__dirname,'source-next.js'),text);fs.writeFileSync(path.join(report,'edits/source-edits.json'),JSON.stringify({before:hash(before),after:hash(text),edits},null,2));console.log(JSON.stringify({candidate:hash(text),edits:edits.length}));
