const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib'),vm=require('vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated', report=path.join(repo,'reports/dissection-action-handoff-2026-10-09'), hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourcePath=path.join(repo,'stem_lab/stem_tool_dissection.js'),mirrorPath=path.join(repo,'desktop/web-app/public/stem_lab/stem_tool_dissection.js');
const bytes=fs.readFileSync(sourcePath), baseline=JSON.parse(fs.readFileSync(path.join(report,'baseline.json')));
if(hash(bytes)!==baseline.source||!bytes.equals(fs.readFileSync(mirrorPath)))throw Error('Baseline drift');
let source=bytes.toString('utf8'); const edits=[];
function edit(name,before,after){if(source.split(before).length!==2)throw Error('Nonunique edit: '+name);source=source.replace(before,after);edits.push({name,before,after});}
edit('Resolve next technique from the supplied post-action state',
`          function nextProcedureInfo() {
            var idx = procedureStepIndex(currentProcedure);`,
`          function nextProcedureInfo(state) {
            state = state || currentProcedure;
            var idx = procedureStepIndex(state);`);
edit('Resolve the next pin from the supplied state',
`            if (action === 'pin') label = (currentProcedure.pins || []).length ? procedureProtocol.pinSecond : procedureProtocol.pinFirst;`,
`            if (action === 'pin') label = (state.pins || []).length ? procedureProtocol.pinSecond : procedureProtocol.pinFirst;`);
edit('Use the supplied state for generic scenario guidance',
`            return nextProcedureInfo().action === 'complete' ? 'Review the score and preservation evidence.' : 'Next checkpoint: ' + nextProcedureInfo().label + '.';`,
`            var next = nextProcedureInfo(procedureState);
            return next.action === 'complete' ? 'Review the score and preservation evidence.' : 'Next checkpoint: ' + next.label + '.';`);
edit('Describe the actual next learning decision after a curriculum action',
`          function updateProcedure(patch, message, action, tone) {`,
`          function procedureActionContinuation(action, state) {
            if ((procedureProtocol.order || []).indexOf(action) < 0) return '';
            var next = nextProcedureInfo(state);
            var gate = procedureLearningGateFor(next.action, state);
            if (gate.required) return gate.phase === 'reflect'
              ? 'Next: explain what changed in the learning checkpoint before another technique action.'
              : 'Next: use the learning checkpoint to plan this step: ' + next.label + '.';
            if (next.action === 'complete') return 'Next: review your observations and the remaining layer evidence.';
            return 'Next: ' + next.label + '.';
          }
          function updateProcedure(patch, message, action, tone) {`);
edit('Keep outcome and scenario facts together before the next learning step',
`            var enrichedMessage = message + (action ? ' Scenario checkpoint: ' + scenarioCheckpoint.progress + '%. ' + procedureScenarioGuidance(scenarioCheckpoint, next) : '') + (justCompletedScenario ? ' Objective complete.' : '');`,
`            var continuation = action ? procedureActionContinuation(action, next) : '';
            var enrichedMessage = message + (action ? ' Scenario checkpoint: ' + scenarioCheckpoint.progress + '%.' : '') + (justCompletedScenario ? ' Objective complete.' : '') + (action ? ' ' + (continuation || procedureScenarioGuidance(scenarioCheckpoint, next)) : '');`);
edit('Remove the stale inspect-to-tool assumption',
`              var inspectNextAction = (procedureProtocol.order || [])[1] || 'scalpel';
              var inspectNextTool = (PROCEDURE_INSTRUMENTS.find(function (tool) { return tool.id === procedureInstrumentForAction(inspectNextAction); }) || {}).label || inspectNextAction;
              updateProcedure({ inspected: true, orientationRecheckRequired: false, orientationObservedAt: Date.now(), inputType: payload.inputType || 'pointer' }, 'Orientation recorded for ' + procedureProtocol.title + '. Use ' + inspectNextTool + ' next: ' + (procedureProtocol.actions[1] || procedureActionLabel(inspectNextAction)) + '.', 'inspect'); return { ok: true };`,
`              updateProcedure({ inspected: true, orientationRecheckRequired: false, orientationObservedAt: Date.now(), inputType: payload.inputType || 'pointer' }, 'Orientation recorded for ' + procedureProtocol.title + '.', 'inspect'); return { ok: true };`);
edit('Remove the premature scalpel continuation', `+ procedureCoachingCue(cutMetrics) + ' Switch to scissors.', 'scalpel');`, `+ procedureCoachingCue(cutMetrics), 'scalpel');`);
edit('Remove the premature scissors continuation', `+ procedureCoachingCue(extensionMetrics) + ' Use forceps next.', 'scissors');`, `+ procedureCoachingCue(extensionMetrics), 'scissors');`);
edit('Remove the protocol-specific forceps assumption', `+ forcepsTechnique + ' Place two well-spaced pins.', 'forceps');`, `+ forcepsTechnique, 'forceps');`);
edit('Remove the duplicated pin continuation calculation',
`              var pinHandoff = pins.length < 2 ? procedureProtocol.pinSecond : ((procedureProtocol.order || [])[procedureStepIndex(Object.assign({}, currentProcedure, { pins: pins }))] || 'probe');\n`, '');
edit('Keep pin outcome factual and let the next-state helper give directions',
`(pins.length < 2 ? 'First stabilizer placed. ' + procedureProtocol.pinSecond + '.' : 'Specimen secured with two well-spaced stabilizers. Next protocol action: ' + procedureActionLabel(pinHandoff) + '.')`,
`(pins.length < 2 ? 'First stabilizer placed.' : 'Specimen secured with two well-spaced stabilizers.')`);
edit('Remove the premature layer-completion instruction', `+ probeTechnique + ' Record evidence or complete the layer.', 'probe');`, `+ probeTechnique, 'probe');`);
edit('Make specimen and live status feedback readable at normal and large text sizes',
`.diss-procedure__feedback[data-tone="caution"]`,
`[data-dissection-root] :is(.diss-stage__gesture, .diss-procedure__feedback) { font-size: 1rem; font-weight: 600; line-height: 1.55; }
[data-dissection-root][data-text-size="large"] :is(.diss-stage__gesture, .diss-procedure__feedback) { font-size: 1.125rem !important; }
.diss-procedure__feedback[data-tone="caution"]`);
new vm.Script(source);
let reversed=source; for(const e of [...edits].reverse()) {if(!e.after){reversed=reversed.replace("              var pinTechnique =",e.before+"              var pinTechnique =");}else{if(reversed.split(e.after).length!==2)throw Error('Nonunique inverse: '+e.name);reversed=reversed.replace(e.after,e.before);}}
if(reversed!==bytes.toString('utf8'))throw Error('Inverse failed');
fs.writeFileSync(path.join(__dirname,'source-next.js'),source);
fs.writeFileSync(path.join(report,'edits/source-edits.json'),JSON.stringify({before:hash(bytes),after:hash(source),edits},null,2));
console.log(JSON.stringify({prepared:true,edits:edits.length,hash:hash(source)}));
