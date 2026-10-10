const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib'),assert=require('assert/strict'),vm=require('vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-adaptive-coaching-2026-10-09'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const baseline=JSON.parse(fs.readFileSync(path.join(report,'baseline.json'))),file=path.join(repo,'stem_lab/stem_tool_dissection.js');
let source=fs.readFileSync(file,'utf8');assert.equal(hash(source),baseline.source);const edits=[];
function replace(before,after){assert.equal(source.split(before).length,2,before.slice(0,120));source=source.replace(before,after);edits.push({before,after});}
const start=source.indexOf('          function adaptiveCoachingData() {'),end=source.indexOf('          function showProcedureDemonstration() {',start);
replace(source.slice(start,end),`          function adaptiveCoachingData() {
            var metrics = currentProcedure.extensionMetrics || currentProcedure.incisionMetrics;
            var liveTissue = normalizeTissueState(currentProcedure.tissueState);
            var cautions = currentProcedure.cautionLog || [];
            var latestCaution = cautions.length ? cautions[cautions.length - 1].message : '';
            var comparison = techniqueComparisonData();
            function coaching(focus, suggestion, label, target, panel) {
              return { focus: focus, suggestion: suggestion, label: label || 'Review technique controls', target: target || 'diss-procedure-panel', panel: panel || 'technique' };
            }
            if (liveTissue.moisture < 38) {
              if (currentScenarioDefinition().id === 'restricted-tray') return coaching('Surface moisture', 'Hydration tools are unavailable in this scenario. Review the dry field and permitted instruments before further handling.', 'Review tissue condition', 'diss-field-monitor-summary');
              return coaching('Surface moisture', 'Review the Dropper for one controlled saline dose before further traction or cutting.', 'Review Dropper', 'diss-instrument-dropper');
            }
            if (liveTissue.trauma > 42 || liveTissue.risk > 55) return coaching('Tissue preservation', 'Reduce contact pressure, stabilize the field, and avoid widening the current corridor.', 'Review tissue condition', 'diss-field-monitor-summary');
            if (liveTissue.tension > 82) return coaching('Retraction tension', 'Avoid additional traction; use well-spaced anchors and probe within the open field.', 'Review tissue condition', 'diss-field-monitor-summary');
            if ((currentProcedure.errors || 0) > instructorMaxCautions || latestCaution) {
              return coaching('Safety sequence', latestCaution || 'Slow down and verify the sequence before the next instrument action.');
            }
            if (!metrics) return coaching('Orientation', 'Inspect the layer, choose shallow depth, and preview the teaching corridor before drawing.');
            var liveObservation = observationFieldData(currentProcedure);
            if (liveObservation.quality < 55) return coaching(liveObservation.limiter, liveObservation.guidance, 'Review view controls', 'diss-view-tools', 'view');
            if ((d.inspectionLens || d.lensPinned) && sel) {
              var coachingInspection = opticalInspectionData(sel, lensFocusDepth, lensMagnification, lensPinned, currentProcedure);
              if (coachingInspection.quality < 70) return coaching('Optical focus', coachingInspection.suggestion, 'Review view controls', 'diss-view-tools', 'view');
            }
            var next = nextProcedureInfo();
            var nextCalibration = instrumentCalibrationAssessment(next.instrument, toolCalibration);
            if (nextCalibration.score < 85) {
              var nextTool = PROCEDURE_INSTRUMENTS.find(function (tool) { return tool.id === next.instrument; });
              return coaching('Instrument calibration', nextCalibration.detail, 'Review ' + (nextTool ? nextTool.label : 'instrument'), 'diss-instrument-' + next.instrument);
            }
            if (metrics.alignment < 75) return coaching('Path alignment', 'Keep the instrument tip centered on the access corridor from start to finish.');
            if (metrics.coverage < 70) return coaching('Path coverage', 'Begin closer to the first endpoint and carry the stroke through the second endpoint.');
            if ((metrics.angleControl || 0) < 72) return coaching('Instrument angle', 'Use steadier pointer pressure and a more consistent stroke direction.');
            if ((metrics.control || metrics.smoothness || 0) < 72) return coaching('Tool control', 'Use one continuous, even-paced motion instead of several abrupt corrections.');
            if (comparison && comparison.scoreDelta <= 0) return coaching('Strategy change', 'Review the saved comparison, then choose one deliberate correction for the next attempt.', 'Review saved comparison', 'diss-compare-replay-progress', 'comparison');
            return coaching('Independent refinement', 'Review independent mode or the instructor target before choosing your next challenge.');
          }
          function focusAdaptiveCoaching() {
            var coaching = adaptiveCoachingData();
            if (coaching.panel === 'view') upd('toolbarViewOpen', true);
            else if (coaching.panel === 'comparison') updMany({ techniquePanelOpen: true, compareTechniqueAttempts: true });
            else upd('techniquePanelOpen', true);
            focusDissectionTarget(coaching.target);
          }
`);
replace(`                      ),                      d.adaptiveGuidance !== false && React.createElement("div", { className: "diss-advanced-card" },
                        React.createElement("strong", null, 'Adaptive focus: ' + adaptiveCoach.focus),
                        React.createElement("p", null, adaptiveCoach.suggestion),
                        React.createElement("button", { type: "button", onClick: applyAdaptiveCoaching }, 'Apply coaching setup')
                      ),`, `                      ),                      d.adaptiveGuidance !== false && React.createElement("section", { id: "diss-adaptive-coaching", className: "diss-advanced-card diss-adaptive-coaching", "aria-labelledby": "diss-adaptive-coaching-title" },
                        React.createElement("div", { className: "diss-adaptive-coaching__body" },
                          React.createElement("p", { className: "diss-adaptive-coaching__eyebrow" }, 'Adaptive coaching'),
                          React.createElement("h4", { id: "diss-adaptive-coaching-title" }, adaptiveCoach.focus),
                          React.createElement("p", { id: "diss-adaptive-coaching-suggestion" }, adaptiveCoach.suggestion)
                        ),
                        React.createElement("div", { className: "diss-adaptive-coaching__action" },
                          React.createElement("button", { type: "button", "aria-controls": adaptiveCoach.target, "aria-describedby": "diss-adaptive-coaching-suggestion diss-adaptive-coaching-help", onClick: focusAdaptiveCoaching }, adaptiveCoach.label),
                          React.createElement("p", { id: "diss-adaptive-coaching-help" }, 'Opens controls for review.')
                        )
                      ),`);
const css=`
/* Keep the adaptive recommendation and its review action together. */
[data-dissection-root] .diss-adaptive-coaching { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid #86bcb4; border-inline-start: 4px solid #0f766e; background: #f0fdfa; color: #244d49; }
[data-dissection-root] .diss-adaptive-coaching__body { flex: 1 1 22rem; min-width: 0; }
[data-dissection-root] .diss-adaptive-coaching :is(h4, p, button) { font-size: 1rem; line-height: 1.55; overflow-wrap: anywhere; }
[data-dissection-root] .diss-adaptive-coaching h4 { margin: .15rem 0 .35rem; color: #134e4a; font-weight: 850; }
[data-dissection-root] .diss-adaptive-coaching .diss-adaptive-coaching__eyebrow { margin: 0; color: #315b58; font-weight: 700; }
[data-dissection-root] .diss-adaptive-coaching__action { flex: 0 1 15rem; min-width: 0; }
[data-dissection-root] .diss-adaptive-coaching button { width: 100%; min-height: 3rem; margin: 0; padding: .6rem .85rem; border: 2px solid #0f766e; background: #fff; color: #115e59; }
[data-dissection-root] .diss-adaptive-coaching button:focus-visible { outline: 3px solid #1766d2; outline-offset: 3px; }
[data-dissection-root] .diss-adaptive-coaching__action p { margin-top: .4rem; }
[data-dissection-root][data-text-size="large"] .diss-adaptive-coaching :is(h4, p, button) { font-size: 1.125rem !important; }
[data-dissection-root][data-high-contrast="true"] .diss-adaptive-coaching, [data-dissection-root][data-high-contrast="true"] .diss-adaptive-coaching :is(h4, p, button) { border-color: #111827; background: #fff; color: #000; }
@media (forced-colors: active) {
  [data-dissection-root] .diss-adaptive-coaching, [data-dissection-root] .diss-adaptive-coaching :is(h4, p, button) { border-color: CanvasText !important; background: Canvas !important; color: CanvasText !important; }
  [data-dissection-root] .diss-adaptive-coaching button:focus-visible { outline-color: Highlight !important; }
}
`;
replace('.diss-scenario-console { grid-column: span 2;',css+'.diss-scenario-console { grid-column: span 2;');
new vm.Script(source);
for(const rel of ['stem_lab/stem_tool_dissection.js','desktop/web-app/public/stem_lab/stem_tool_dissection.js']){const dest=path.join(repo,rel);assert.equal(hash(fs.readFileSync(dest)),baseline.source);fs.writeFileSync(dest,source);}
fs.writeFileSync(path.join(report,'edits/source-edits.json'),JSON.stringify({before:baseline.source,after:hash(source),edits},null,2));fs.writeFileSync(path.join(report,'edits/source-after.js.gz'),zlib.gzipSync(source));console.log(JSON.stringify({source:hash(source),edits:edits.length}));
