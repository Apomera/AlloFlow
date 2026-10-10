const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const parser = require(path.join(repo, 'node_modules/@babel/parser'));
const baselinePath = path.join(__dirname, 'renderer-baseline.js');
const before = fs.readFileSync(fs.existsSync(baselinePath) ? baselinePath : path.join(repo, 'stem_lab/stem_tool_dissection.js'), 'utf8');
const priorCandidatePath = path.join(__dirname, 'renderer-next.js');
const priorCandidate = fs.existsSync(priorCandidatePath) ? fs.readFileSync(priorCandidatePath, 'utf8') : null;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
if (sha(before) !== '6b5c426f6e2f4d0545dfccce713b0a0457547b5384e33fb911e09a296f071354') throw Error('Source baseline changed');
const newline = before.includes('\r\n') ? '\r\n' : '\n';
const crlf = text => text.replace(/\r?\n/g, newline);
let next = before;
const edits = [];
function edit(name, oldText, newText) {
  oldText = crlf(oldText); newText = crlf(newText);
  if (next.split(oldText).length !== 2) throw Error('Nonunique edit: ' + name);
  next = next.replace(oldText, newText); edits.push({ name, before: oldText, after: newText });
}
edit('Private owner-scoped restart review state', '  var _disSaveOwnerCounter = 0;', '  var _disScenarioRestartReviews = Object.create(null);\n  var _disSaveOwnerCounter = 0;');
edit('Release restart review with disconnected owner', "      Object.keys(_disSaveQueue).forEach(function (slot) {\n        var pending = _disSaveQueue[slot];\n        if (!pending || pending.owner !== saveOwner) return;", "      delete _disScenarioRestartReviews[saveOwner];\n      Object.keys(_disSaveQueue).forEach(function (slot) {\n        var pending = _disSaveQueue[slot];\n        if (!pending || pending.owner !== saveOwner) return;");
edit('Distinguish timed technique challenge from Study identification', "{ id: 'timed-practical', label: 'Timed practical', difficulty: 'Challenge', prompt: 'Complete the specimen protocol within four minutes while maintaining safe decisions.' }", "{ id: 'timed-practical', label: '4-minute technique challenge', difficulty: 'Challenge', prompt: 'Complete the current layer protocol within four minutes. Safety safeguards and feedback remain active.' }");
const helpers = `          // Restart review is private presentation state, never saved lab data.
          function procedureScenarioRestartScope(data) {
            data = data || d;
            var scopeSpecimen = data.specimen || specimen;
            var scopeLayer = data.activeLayer || activeLayer;
            var scopeWorkspace = data.workspaceMode === 'advanced' || data.workspaceMode === 'essentials' ? data.workspaceMode : workspaceMode;
            return JSON.stringify({
              specimen: scopeSpecimen, layer: scopeLayer,
              scenario: data.procedureScenario || 'precision-access', startedAt: Number(data.scenarioStartedAt) || 0,
              workspace: scopeWorkspace, quiz: !!data.quizMode, practical: !!data.practicalMode, guided: !!data.guidedMode,
              procedure: data.procedureByLayer || {}, inspected: data.exploredOrgans || {},
              instrument: data.activeInstrument || 'probe', view: data.anatomicalView || 'dorsal',
              condition: data.specimenCondition || 'standard', variation: data.variationSeed == null ? 1 : data.variationSeed,
              techniqueMode: data.procedureMode || 'guided',
              revealed: !!((data.revealedLayers || {})[scopeLayer])
            });
          }
          function currentProcedureScenarioRestartReview() {
            var pending = _disScenarioRestartReviews[dissectionSaveOwner];
            if (pending && (!advancedWorkspace || d.quizMode || d.practicalMode || pending.scope !== procedureScenarioRestartScope(d))) {
              delete _disScenarioRestartReviews[dissectionSaveOwner];
              pending = null;
            }
            return pending || null;
          }
          function requestProcedureScenarioRestart() {
            if (!advancedWorkspace || d.quizMode || d.practicalMode) return;
            _disScenarioRestartReviews[dissectionSaveOwner] = { scope: procedureScenarioRestartScope(d) };
            updMany({});
            focusDissectionTarget('diss-scenario-restart-cancel');
          }
          function cancelProcedureScenarioRestart(review) {
            if (!review || _disScenarioRestartReviews[dissectionSaveOwner] !== review) return;
            delete _disScenarioRestartReviews[dissectionSaveOwner];
            updMany({});
            focusDissectionTarget('diss-scenario-restart');
          }
          function confirmProcedureScenarioRestart(review) {
            var pending = _disScenarioRestartReviews[dissectionSaveOwner];
            // A queued callback from an earlier review cannot confirm or dismiss
            // a replacement review, even when the attempt has the same scope.
            if (!review || pending !== review) return;
            var latestCanvas = queryDissectionNode('[data-diss-canvas]');
            var latest = latestCanvas && latestCanvas._drawD ? latestCanvas._drawD : d;
            var latestMode = latest.workspaceMode === 'advanced' || latest.workspaceMode === 'essentials' ? latest.workspaceMode : workspaceMode;
            if (latestMode !== 'advanced' || latest.quizMode || latest.practicalMode || pending.scope !== procedureScenarioRestartScope(d) || pending.scope !== procedureScenarioRestartScope(latest)) {
              delete _disScenarioRestartReviews[dissectionSaveOwner];
              updMany({});
              focusDissectionTarget('diss-scenario-restart');
              return;
            }
            activateProcedureScenario(currentScenarioDefinition(), true);
            focusDissectionTarget('diss-scenario-restart');
          }
          function handleProcedureScenarioRestartKey(event, review) {
            if (!review || _disScenarioRestartReviews[dissectionSaveOwner] !== review || event.key !== 'Escape' || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
            event.preventDefault(); event.stopPropagation(); cancelProcedureScenarioRestart(review);
          }
`;
edit('Guard inline restart review without persisted fields or hooks', '          function activateProcedureScenario(scenario, restartAttempt) {', helpers + '          function activateProcedureScenario(scenario, restartAttempt) {');
edit('Clear private review on actual scenario activation', "            scenario = scenario || ADVANCED_SCENARIOS[0];\n            var patch = {", "            scenario = scenario || ADVANCED_SCENARIOS[0];\n            delete _disScenarioRestartReviews[dissectionSaveOwner];\n            var patch = {");
const derivation = `          var scenarioDefinition = currentScenarioDefinition();
          var scenarioStatus = procedureScenarioStatus();
          var scenarioGuidance = procedureScenarioGuidance(scenarioStatus, currentProcedure);
          var scenarioIsTimed = scenarioDefinition.id === 'timed-practical';
          var scenarioDisplayState = scenarioIsTimed && !(Number(d.scenarioStartedAt) || 0)
            ? 'not-started'
            : (scenarioStatus.complete ? 'complete' : (scenarioStatus.expired || (scenarioIsTimed && timedProcedureScenarioExpired()) ? 'expired' : 'active'));
          var scenarioDisplayRemaining = scenarioDisplayState === 'expired' ? 0 : Math.max(0, Number(scenarioStatus.remaining) || 0);
          var scenarioDisplayDetail = scenarioIsTimed
            ? procedureStepIndex(currentProcedure) + '/' + Math.max(1, (procedureProtocol.order || []).length) + ' protocol steps complete'
            : scenarioStatus.detail;
          var scenarioDisplayGuidance = scenarioDisplayState === 'not-started'
            ? 'Start the timer on this attempt, or review Restart scenario for a fresh attempt.'
            : (scenarioDisplayState === 'expired'
              ? 'Technique actions are blocked. Review restart or choose another scenario to continue.'
              : scenarioGuidance);
          var scenarioSelectionEffects = scenarioIsTimed
            ? 'Choosing this challenge starts a four-minute timer on the current attempt. Technique and inspected structures are kept. The deadline continues while you use other activities.'
            : (scenarioDefinition.id === 'orientation-rescue'
              ? 'Choosing Orientation rescue starts in a different view and requires a fresh orientation observation. Existing technique evidence is kept.'
              : (scenarioDefinition.id === 'obscured-field'
                ? 'Choosing Obscured field recovery lowers clarity and stability and adds excess fluid to the current layer.'
                : (scenarioDefinition.id === 'relationship-pathway'
                  ? 'Choosing Relationship pathway enables relationship cues on the current attempt.'
                  : (scenarioDefinition.id === 'restricted-tray'
                    ? 'Choosing Restricted tray makes dropper and wick unavailable and selects an allowed instrument if needed.'
                    : 'Choosing a scenario applies its objective to the current attempt. Technique records and inspected structures are kept.'))));
          var scenarioRestartEffects = 'Restart resets the technique attempt for ' + currentLayerDef.name + ' and clears inspected-structure progress across the current ' + spec.name + ' specimen. Notes, confidence ratings, captured frames, and archived attempts remain.';
          var scenarioRestartReview = currentProcedureScenarioRestartReview();`;
edit('Derived truthful scenario display without changing status or deadline algorithms', "          var scenarioDefinition = currentScenarioDefinition();\n          var scenarioStatus = procedureScenarioStatus();\n          var scenarioGuidance = procedureScenarioGuidance(scenarioStatus, currentProcedure);", derivation);
edit('Expired technique routes to recovery after other activity priorities', "          } else if (!currentLayerDone && currentLearningGate.required && currentLearningGate.definition) {", "          } else if (!guidedMode && advancedWorkspace && scenarioIsTimed && scenarioDisplayState === 'expired') {\n            nextActionModel = { step: 3, tone: 'caution', phase: 'Technique challenge', title: 'The 4-minute technique challenge has expired', description: 'Technique actions are blocked. Review the challenge, then choose whether to restart or select another scenario. Your recorded work stays available.', label: 'Review challenge recovery', action: 'scenario-recovery' };\n          } else if (!currentLayerDone && currentLearningGate.required && currentLearningGate.definition) {");
edit('Recovery action opens controls and focuses review without resetting records', "            } else if (nextActionModel.action === 'learning') {", "            } else if (nextActionModel.action === 'scenario-recovery') {\n              upd('techniquePanelOpen', true);\n              focusDissectionTarget('diss-scenario-restart');\n            } else if (nextActionModel.action === 'learning') {");
// Existing selector and option handler expressions are kept byte-for-byte.
let consoleNode, primaryButton;
function walk(n) {
  if (!n || typeof n !== 'object') return;
  if (n.type === 'CallExpression' && n.arguments?.[1]?.type === 'ObjectExpression') {
    const props = n.arguments[1].properties;
    if (props.some(p => p.key?.name === 'className' && p.value?.value === 'diss-scenario-console')) { if (consoleNode) throw Error('Duplicate console'); consoleNode = n; }
    if (n.arguments[0]?.value === 'button' && props.some(p => p.key?.name === 'className' && p.value?.value === 'diss-next-action__primary')) { if (primaryButton) throw Error('Duplicate next primary'); primaryButton = n; }
  }
  for (const [key, value] of Object.entries(n)) { if (key === 'loc') continue; if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value); }
}
walk(parser.parse(next));
if (!consoleNode || !primaryButton) throw Error('Missing console or primary button');
let selectNode, optionNode;
function scan(n) {
  if (!n || typeof n !== 'object') return;
  if (n.type === 'CallExpression' && n.arguments[0]?.value === 'select') selectNode = n;
  for (const [key, value] of Object.entries(n)) { if (key === 'loc') continue; if (Array.isArray(value)) value.forEach(scan); else if (value && typeof value === 'object') scan(value); }
}
scan(consoleNode);
if (!selectNode) throw Error('Missing native scenario selector');
const nativeSelect = next.slice(selectNode.start, selectNode.end).replace('React.createElement("select", { ', 'React.createElement("select", { "aria-describedby": "diss-scenario-purpose diss-scenario-effects diss-scenario-objective", ');
const newConsole = `React.createElement("section", { id: "diss-scenario-console", className: "diss-scenario-console", role: "region", "aria-labelledby": "diss-scenario-title", "aria-describedby": "diss-scenario-purpose" },
                        React.createElement("div", { className: "diss-scenario-console__header" },
                          React.createElement("h4", { id: "diss-scenario-title" }, 'Scenario lab \\u00B7 ' + scenarioDefinition.label),
                          React.createElement("span", { id: "diss-scenario-state", className: "diss-scenario-console__state", "data-state": scenarioDisplayState, role: "status", "aria-live": "polite", "aria-atomic": "true" }, scenarioDisplayState === 'not-started' ? 'Not started' : (scenarioDisplayState === 'complete' ? '\\u2713 Complete' : (scenarioDisplayState === 'expired' ? 'Time expired' : scenarioDefinition.difficulty + ' \\u00B7 ' + scenarioStatus.progress + '%')))
                        ),
                        React.createElement("p", { id: "diss-scenario-purpose", className: "diss-scenario-console__purpose" }, 'Technique challenges apply to the current ' + currentLayerDef.name + ' layer. Study offers a separate two-minute identification check.'),
                        React.createElement("p", { id: "diss-scenario-objective", className: "diss-scenario-console__objective" }, scenarioDefinition.prompt),
                        React.createElement("div", { className: "diss-scenario-console__progress", role: "progressbar", "aria-label": scenarioDefinition.label + " progress", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": scenarioStatus.progress, "aria-valuetext": scenarioStatus.progress + ' percent. ' + scenarioDisplayDetail },
                          React.createElement("span", { style: { width: scenarioStatus.progress + '%' } })
                        ),
                        React.createElement("p", { className: "diss-scenario-console__detail" }, scenarioDisplayDetail + '. ' + scenarioDisplayGuidance),
                        scenarioIsTimed && scenarioDisplayState !== 'not-started' && React.createElement("output", { id: "diss-scenario-time", className: "diss-scenario-console__timer", role: "timer", "aria-live": "off", "aria-atomic": "true", "data-state": scenarioDisplayState }, (scenarioDisplayState === 'complete' ? 'Completed with ' : 'Challenge time: ') + formatAccessibleDuration(scenarioDisplayRemaining)),
                        React.createElement("div", { className: "diss-scenario-console__controls" },
                          React.createElement("label", null,
                            React.createElement("span", null, 'Choose scenario'),
                            React.createElement("span", { className: "diss-scenario-console__select-wrap" }, ${nativeSelect})
                          ),
                          scenarioIsTimed && scenarioDisplayState === 'not-started' && React.createElement("button", { id: "diss-scenario-start", type: "button", "aria-describedby": "diss-scenario-purpose diss-scenario-effects", onClick: function () { activateProcedureScenario(scenarioDefinition, false); } }, 'Start timer on current attempt'),
                          React.createElement("button", { id: "diss-scenario-restart", type: "button", onClick: requestProcedureScenarioRestart, "aria-label": "Restart scenario: review changes for " + scenarioDefinition.label, "aria-describedby": "diss-scenario-restart-help", "aria-expanded": !!scenarioRestartReview, "aria-controls": "diss-scenario-restart-review" }, '\\u21BB Restart scenario')
                        ),
                        React.createElement("p", { id: "diss-scenario-effects", className: "diss-scenario-console__help" }, scenarioSelectionEffects),
                        React.createElement("p", { id: "diss-scenario-restart-help", className: "diss-scenario-console__help" }, 'Restart opens a review of the changes before starting a fresh attempt.'),
                        scenarioRestartReview && React.createElement("div", { id: "diss-scenario-restart-review", className: "diss-scenario-console__restart-review", role: "group", tabIndex: -1, "aria-labelledby": "diss-scenario-restart-title", "aria-describedby": "diss-scenario-restart-effects", onKeyDown: function (event) { handleProcedureScenarioRestartKey(event, scenarioRestartReview); } },
                          React.createElement("h5", { id: "diss-scenario-restart-title" }, 'Restart ' + scenarioDefinition.label + '?'),
                          React.createElement("p", { id: "diss-scenario-restart-effects" }, scenarioRestartEffects),
                          React.createElement("div", { className: "diss-scenario-console__review-actions" },
                            React.createElement("button", { id: "diss-scenario-restart-confirm", type: "button", "data-confirm": "true", "aria-describedby": "diss-scenario-restart-effects", onClick: function () { confirmProcedureScenarioRestart(scenarioRestartReview); } }, 'Confirm restart'),
                            React.createElement("button", { id: "diss-scenario-restart-cancel", type: "button", onClick: function () { cancelProcedureScenarioRestart(scenarioRestartReview); } }, 'Keep current attempt')
                          )
                        )
                      )`;
edit('Readable scenario console with honest time and reviewed native restart', next.slice(consoleNode.start, consoleNode.end), newConsole);
const primarySource = next.includes('id: "diss-next-action-primary"') ? null : 'React.createElement("button", { type: "button", className: "diss-next-action__primary"';
if (!primarySource) throw Error('Unexpected preexisting primary id');
edit('Stable focus target for the primary next action', primarySource, 'React.createElement("button", { id: "diss-next-action-primary", type: "button", className: "diss-next-action__primary"');
const css = `
/* Make technique challenge purpose, countdown and restart review readable. */
[data-dissection-root] .diss-scenario-console { grid-column: 1 / -1; padding: 1rem; border-color: #7c3aed; background: #f5f3ff; color: #3b1d68; font-size: 1rem; }
[data-dissection-root] .diss-scenario-console :is(h4, h5, p, label, select, button, .diss-scenario-console__state, .diss-scenario-console__timer) { font-size: 1rem !important; line-height: 1.55; overflow-wrap: anywhere; }
[data-dissection-root] .diss-scenario-console :is(h4, h5) { margin: 0; color: #4c1d95; font-weight: 850; }
[data-dissection-root] .diss-scenario-console__header { align-items: start; gap: .75rem; }
[data-dissection-root] .diss-scenario-console__state { min-height: 2.5rem; padding: .35rem .65rem; white-space: normal; }
[data-dissection-root] .diss-scenario-console__state[data-state="not-started"] { border-style: dashed; }
[data-dissection-root] .diss-scenario-console :is(.diss-scenario-console__purpose, .diss-scenario-console__objective, .diss-scenario-console__help, .diss-scenario-console__detail) { margin: .75rem 0 0; color: #3b1d68; }
[data-dissection-root] .diss-scenario-console__objective { font-weight: 750; }
[data-dissection-root] .diss-scenario-console__progress { margin-top: .75rem; height: .8rem; }
[data-dissection-root] .diss-scenario-console__timer { display: block; margin-top: .75rem; padding: .65rem .75rem; border: 2px solid #7c3aed; border-radius: .55rem; background: #fff; color: #3b1d68; font-weight: 850; }
[data-dissection-root] .diss-scenario-console__timer[data-state="expired"] { border-style: dashed; border-color: #b91c1c; color: #991b1b; }
[data-dissection-root] .diss-scenario-console__controls, [data-dissection-root] .diss-scenario-console__review-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; gap: .65rem; margin-top: .85rem; }
[data-dissection-root] .diss-scenario-console__controls label { grid-column: 1 / -1; min-width: 0; margin: 0; gap: .35rem; }
[data-dissection-root] .diss-scenario-console :is(button, select) { width: 100%; min-width: 0; min-height: 3rem; margin: 0; padding: .6rem .75rem; border-width: 2px; white-space: normal; text-align: start; }
[data-dissection-root] .diss-scenario-console :is(button, select):is(:focus, :focus-visible) { outline: 3px solid #1766d2 !important; outline-offset: -5px !important; box-shadow: none !important; }
[data-dissection-root] .diss-scenario-console__select-wrap { position: relative; display: block; min-width: 0; }
[data-dissection-root] .diss-scenario-console__select-wrap::after { content: ""; display: none; position: absolute; pointer-events: none; right: .9rem; top: 50%; width: .5em; height: .5em; border-right: .15em solid currentColor; border-bottom: .15em solid currentColor; transform: translateY(-75%) rotate(45deg); }
[data-dissection-root] .diss-scenario-console__restart-review { margin-top: .85rem; padding: .85rem; border: 2px solid #b45309; border-radius: .65rem; background: #fffbeb; color: #78350f; }
[data-dissection-root] .diss-scenario-console__restart-review :is(h5, p) { color: #78350f; }
[data-dissection-root] .diss-scenario-console__restart-review p { margin: .65rem 0 0; }
[data-dissection-root] .diss-scenario-console__restart-review button[data-confirm="true"] { border-color: #b45309; color: #78350f; }
[data-dissection-root][data-text-size="large"] .diss-scenario-console :is(h4, h5, p, label, select, button, .diss-scenario-console__state, .diss-scenario-console__timer) { font-size: 1.125rem !important; }
[data-dissection-root][data-high-contrast="true"] .diss-scenario-console, [data-dissection-root][data-high-contrast="true"] .diss-scenario-console :is(h4, h5, p, label, select, button, .diss-scenario-console__state, .diss-scenario-console__timer, .diss-scenario-console__restart-review) { border-color: #111827; background: #fff; color: #000; }
[data-dissection-root][data-high-contrast="true"] .diss-scenario-console select { appearance: none; padding-right: 2.25rem !important; }
[data-dissection-root][data-high-contrast="true"] .diss-scenario-console__select-wrap::after { display: block; }
@container dissection (max-width: 640px) { [data-dissection-root] .diss-scenario-console { padding: .75rem; } [data-dissection-root] .diss-scenario-console__controls, [data-dissection-root] .diss-scenario-console__review-actions { grid-template-columns: minmax(0, 1fr); } }
@media (forced-colors: active) {
  [data-dissection-root] .diss-scenario-console, [data-dissection-root] .diss-scenario-console :is(h4, h5, p, label, select, button, .diss-scenario-console__state, .diss-scenario-console__timer, .diss-scenario-console__restart-review) { border-color: CanvasText !important; background: Canvas !important; color: CanvasText !important; }
  [data-dissection-root] .diss-scenario-console__progress > span { background: Highlight !important; }
  [data-dissection-root] .diss-scenario-console select { appearance: none !important; forced-color-adjust: none !important; padding-right: 2.25rem !important; }
  [data-dissection-root] .diss-scenario-console__select-wrap::after { display: block; }
  [data-dissection-root] .diss-scenario-console :is(button, select):is(:focus, :focus-visible) { outline-color: Highlight !important; }
}
@media print { [data-dissection-root] .diss-scenario-console { display: none !important; } }
`;
const cssAnchor = '@media (max-width: 520px) { .diss-scenario-console { grid-column: 1 / -1; } }';
edit('Cohesive scenario typography, controls, focus, wrapping, contrast and print', cssAnchor, cssAnchor + css);
edit('Scenario expiry feedback names technique challenge', "setProcedureFeedback('Timed practical expired. Restart the scenario before recording another action.', 'caution');", "setProcedureFeedback('The 4-minute technique challenge expired. Review Restart scenario before recording another action.', 'caution');");
edit('Scenario countdown expiry names technique challenge', "setProcedureFeedback('Timed practical expired. Restart the scenario to try again.', 'caution');", "setProcedureFeedback('The 4-minute technique challenge expired. Review Restart scenario to try again.', 'caution');");
edit('Scenario gesture cancellation names technique challenge', "cancelActiveCanvasGesture('Timed practical expired; active specimen contact was canceled and no action was recorded.', canvas);", "cancelActiveCanvasGesture('The 4-minute technique challenge expired; active specimen contact was canceled and no action was recorded.', canvas);");
new vm.Script(next);
if (newline === '\n' && next.includes('\r\n')) throw Error('Candidate changed original LF line endings');
let inverse = next;
for (const { before: oldText, after: newText, name } of edits.slice().reverse()) {
  if (inverse.split(newText).length !== 2) throw Error('Nonunique inverse: ' + name);
  inverse = inverse.replace(newText, oldText);
}
if (inverse !== before) throw Error('Candidate does not reverse exactly');
if (priorCandidate && sha(priorCandidate) === 'dbc43139c77c656c397ba3afa97fe5d006987c3b89cec6dcb66aa2ca67331e08') {
  const incrementalEdits = [
    { name: 'Bind Cancel to its own private review', before: '          function cancelProcedureScenarioRestart() {\n            delete _disScenarioRestartReviews[dissectionSaveOwner];', after: '          function cancelProcedureScenarioRestart(review) {\n            if (!review || _disScenarioRestartReviews[dissectionSaveOwner] !== review) return;\n            delete _disScenarioRestartReviews[dissectionSaveOwner];' },
    { name: 'Bind Escape to its own private review', before: "          function handleProcedureScenarioRestartKey(event) {\n            if (event.key !== 'Escape' || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;\n            event.preventDefault(); event.stopPropagation(); cancelProcedureScenarioRestart();", after: "          function handleProcedureScenarioRestartKey(event, review) {\n            if (!review || _disScenarioRestartReviews[dissectionSaveOwner] !== review || event.key !== 'Escape' || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;\n            event.preventDefault(); event.stopPropagation(); cancelProcedureScenarioRestart(review);" },
    { name: 'Capture rendered review in Escape callback', before: 'onKeyDown: handleProcedureScenarioRestartKey', after: 'onKeyDown: function (event) { handleProcedureScenarioRestartKey(event, scenarioRestartReview); }' },
    { name: 'Capture rendered review in Cancel callback', before: 'onClick: cancelProcedureScenarioRestart', after: 'onClick: function () { cancelProcedureScenarioRestart(scenarioRestartReview); }' },
  ].map(item => ({ ...item, before: crlf(item.before), after: crlf(item.after) }));
  let incremental = priorCandidate;
  for (const e of incrementalEdits) {
    if (incremental.split(e.before).length !== 2) throw Error('Incremental uniqueness: ' + e.name);
    incremental = incremental.replace(e.before, e.after);
  }
  if (incremental !== next) throw Error('Incremental edits differ from cumulative candidate');
  let incrementalInverse = next;
  for (const e of incrementalEdits.slice().reverse()) {
    if (incrementalInverse.split(e.after).length !== 2) throw Error('Incremental inverse uniqueness: ' + e.name);
    incrementalInverse = incrementalInverse.replace(e.after, e.before);
  }
  if (incrementalInverse !== priorCandidate) throw Error('Incremental reversal differs');
  fs.writeFileSync(path.join(__dirname, 'renderer-incremental-edits.json'), JSON.stringify({ beforeSha256: sha(priorCandidate), afterSha256: sha(next), edits: incrementalEdits, exactReversal: true, syntax: 'passed' }, null, 2));
}
if (priorCandidate && sha(priorCandidate) === '6b96c71e04bc42f4a5e6bc4ecfe6c61d96edf8f4d8fc02f296b99bcd41497de9') {
  const contrastEdits = [
    { name: 'Restore native scenario select arrow in high contrast', before: '[data-dissection-root][data-high-contrast="true"] .diss-scenario-console, [data-dissection-root][data-high-contrast="true"] .diss-scenario-console :is(h4, h5, p, label, select, button, .diss-scenario-console__state, .diss-scenario-console__timer, .diss-scenario-console__restart-review) { border-color: #111827; background: #fff; color: #000; }', after: '[data-dissection-root][data-high-contrast="true"] .diss-scenario-console, [data-dissection-root][data-high-contrast="true"] .diss-scenario-console :is(h4, h5, p, label, select, button, .diss-scenario-console__state, .diss-scenario-console__timer, .diss-scenario-console__restart-review) { border-color: #111827; background: #fff; color: #000; }\n[data-dissection-root][data-high-contrast="true"] .diss-scenario-console select { appearance: auto; }' },
    { name: 'Restore native scenario select arrow in forced colors', before: '  [data-dissection-root] .diss-scenario-console__progress > span { background: Highlight !important; }\n  [data-dissection-root] .diss-scenario-console :is(button, select):focus-visible { outline-color: Highlight !important; }', after: '  [data-dissection-root] .diss-scenario-console__progress > span { background: Highlight !important; }\n  [data-dissection-root] .diss-scenario-console select { appearance: auto; }\n  [data-dissection-root] .diss-scenario-console :is(button, select):focus-visible { outline-color: Highlight !important; }' },
  ].map(item => ({ ...item, before: crlf(item.before), after: crlf(item.after) }));
  let contrast = priorCandidate;
  for (const e of contrastEdits) {
    if (contrast.split(e.before).length !== 2) throw Error('Contrast uniqueness: ' + e.name);
    contrast = contrast.replace(e.before, e.after);
  }
  if (contrast !== next) throw Error('Contrast edits differ from cumulative candidate');
  let contrastInverse = next;
  for (const e of contrastEdits.slice().reverse()) {
    if (contrastInverse.split(e.after).length !== 2) throw Error('Contrast inverse uniqueness: ' + e.name);
    contrastInverse = contrastInverse.replace(e.after, e.before);
  }
  if (contrastInverse !== priorCandidate) throw Error('Contrast reversal differs');
  fs.writeFileSync(path.join(__dirname, 'renderer-contrast-edits.json'), JSON.stringify({ beforeSha256: sha(priorCandidate), afterSha256: sha(next), edits: contrastEdits, exactReversal: true, syntax: 'passed' }, null, 2));
}
if (priorCandidate && sha(priorCandidate) === 'ace3a133dd2720df60741a1242e0dbf9be05977677067429b1892318924223cf') {
  const visualEdits = [
    { name: 'Wrap native scenario selector for decorative contrast arrow', before: nativeSelect, after: 'React.createElement("span", { className: "diss-scenario-console__select-wrap" }, ' + nativeSelect + ')' },
    { name: 'Keep actual focus inset and define decorative selector wrapper', before: '[data-dissection-root] .diss-scenario-console :is(button, select):focus-visible { outline: 3px solid #1766d2; outline-offset: -5px; box-shadow: none; }', after: '[data-dissection-root] .diss-scenario-console :is(button, select):is(:focus, :focus-visible) { outline: 3px solid #1766d2 !important; outline-offset: -5px !important; box-shadow: none !important; }\n[data-dissection-root] .diss-scenario-console__select-wrap { position: relative; display: block; min-width: 0; }\n[data-dissection-root] .diss-scenario-console__select-wrap::after { content: ""; display: none; position: absolute; pointer-events: none; right: .9rem; top: 50%; width: .5em; height: .5em; border-right: .15em solid currentColor; border-bottom: .15em solid currentColor; transform: translateY(-75%) rotate(45deg); }' },
    { name: 'Keep high contrast scenario name wrapping with currentColor chevron', before: '[data-dissection-root][data-high-contrast="true"] .diss-scenario-console select { appearance: auto; }', after: '[data-dissection-root][data-high-contrast="true"] .diss-scenario-console select { appearance: none; padding-right: 2.25rem !important; }\n[data-dissection-root][data-high-contrast="true"] .diss-scenario-console__select-wrap::after { display: block; }' },
    { name: 'Keep forced color scenario name wrapping and actual focus cue', before: '  [data-dissection-root] .diss-scenario-console select { appearance: auto; }\n  [data-dissection-root] .diss-scenario-console :is(button, select):focus-visible { outline-color: Highlight !important; }', after: '  [data-dissection-root] .diss-scenario-console select { appearance: none; padding-right: 2.25rem !important; }\n  [data-dissection-root] .diss-scenario-console__select-wrap::after { display: block; }\n  [data-dissection-root] .diss-scenario-console :is(button, select):is(:focus, :focus-visible) { outline-color: Highlight !important; }' },
  ].map(item => ({ ...item, before: crlf(item.before), after: crlf(item.after) }));
  let visual = priorCandidate;
  for (const e of visualEdits) {
    if (visual.split(e.before).length !== 2) throw Error('Visual uniqueness: ' + e.name);
    visual = visual.replace(e.before, e.after);
  }
  if (visual !== next) throw Error('Visual edits differ from cumulative candidate');
  let visualInverse = next;
  for (const e of visualEdits.slice().reverse()) {
    if (visualInverse.split(e.after).length !== 2) throw Error('Visual inverse uniqueness: ' + e.name);
    visualInverse = visualInverse.replace(e.after, e.before);
  }
  if (visualInverse !== priorCandidate) throw Error('Visual reversal differs');
  fs.writeFileSync(path.join(__dirname, 'renderer-visual-edits.json'), JSON.stringify({ beforeSha256: sha(priorCandidate), afterSha256: sha(next), edits: visualEdits, exactReversal: true, syntax: 'passed' }, null, 2));
}
if (priorCandidate && sha(priorCandidate) === 'b959aea16e1580738efb2d21388b5173613fcf37a91cbede2d17dd36daa696c9') {
  const forcedPaintEdits = [{
    name: 'Prevent forced-color native menu paint while retaining explicit system colors',
    before: '  [data-dissection-root] .diss-scenario-console select { appearance: none; padding-right: 2.25rem !important; }',
    after: '  [data-dissection-root] .diss-scenario-console select { appearance: none !important; forced-color-adjust: none !important; padding-right: 2.25rem !important; }',
  }].map(item => ({ ...item, before: crlf(item.before), after: crlf(item.after) }));
  const e = forcedPaintEdits[0];
  if (priorCandidate.split(e.before).length !== 2) throw Error('Forced paint uniqueness');
  if (priorCandidate.replace(e.before, e.after) !== next) throw Error('Forced paint edit differs from cumulative candidate');
  if (next.split(e.after).length !== 2 || next.replace(e.after, e.before) !== priorCandidate) throw Error('Forced paint inverse differs');
  fs.writeFileSync(path.join(__dirname, 'renderer-forced-paint-edits.json'), JSON.stringify({ beforeSha256: sha(priorCandidate), afterSha256: sha(next), edits: forcedPaintEdits, exactReversal: true, syntax: 'passed' }, null, 2));
}
fs.writeFileSync(path.join(__dirname, 'renderer-baseline.js'), before);
fs.writeFileSync(path.join(__dirname, 'renderer-next.js'), next);
fs.writeFileSync(path.join(__dirname, 'renderer-edits.json'), JSON.stringify({ beforeSha256: sha(before), afterSha256: sha(next), edits, exactReversal: true, syntax: 'passed', lineEndings: newline === '\n' ? 'Original LF retained' : 'Original CRLF retained' }, null, 2));
console.log(JSON.stringify({ candidateSha256: sha(next), edits: edits.length, exactReversal: true, syntax: 'passed', repoWrites: false }));
