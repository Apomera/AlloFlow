const fs = require('fs');
const path = require('path');

const sourcePath = path.resolve('stem_lab/stem_tool_weathersystems.js');
let source = fs.readFileSync(sourcePath, 'utf8');

function replaceOnce(label, oldText, newText) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(label + ' expected once, found ' + count);
  source = source.replace(oldText, newText);
}

if (source.includes('function immersiveTourHandoffText(data)')) throw new Error('Guided handoff patch already present');

const handoffHelper = String.raw`  function immersiveTourHandoffText(data) {
    var d = data || {};
    var run = immersiveTourProgress(d);
    var scenario = scenarioById(d.scenario || 'coldFront');
    var mode = d.immersiveSceneMode === 'geographic' ? 'Geographic terrain' : 'Conceptual 3D';
    var source = d.immersiveDataSource === 'live' ? 'Live weather' : 'Teaching model';
    var includeLocation = d.immersiveShareIncludeLocation === true;
    var location = includeLocation ? (d.liveLocationQuery || d.liveLocationCity || 'Selected location') : 'Excluded by default for privacy';
    var lines = [
      'Weather Systems Guided Investigation Brief',
      'Scenario: ' + scenario.name,
      'Scene: ' + mode + ' | ' + source,
      'Location: ' + location,
      'Active step: ' + (run.activeStep.index + 1) + '/' + run.total + ' | ' + run.activeStep.label,
      'Progress: ' + run.completedCount + '/' + run.total + ' steps complete',
      '',
      'GUIDED STEPS'
    ];
    run.steps.forEach(function (step, index) {
      lines.push((step.complete ? '[x] ' : '[ ] ') + (index + 1) + '. ' + step.label + ' | ' + step.captureCount + ' evidence capture' + (step.captureCount === 1 ? '' : 's'));
      lines.push('    Prompt: ' + step.prompt);
      lines.push('    Evidence cue: ' + step.evidence);
    });
    var reflection = String(d.immersiveReflection || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
    if (reflection) lines.push('', 'LEARNER REFLECTION', reflection);
    lines.push('', 'FACILITATOR NOTE', 'Review this brief before sharing. Keep student names and sensitive personal information out of the reflection or notes. The 3D scene is a teaching representation; use the evidence labels and numeric views to discuss model limits.');
    return lines.join('\n');
  }

`;
replaceOnce('guided handoff helper anchor', '  function immersiveSessionSharePayload(data, options) {', handoffHelper + '  function immersiveSessionSharePayload(data, options) {');

replaceOnce('guided handoff kernel export', '    immersiveTourProgress: immersiveTourProgress,\n', '    immersiveTourProgress: immersiveTourProgress,\n    immersiveTourHandoffText: immersiveTourHandoffText,\n');

const actionHelpers = String.raw`      function copyImmersiveTourHandoff() {
        var handoff = immersiveTourHandoffText(d);
        copyToClipboard(handoff, function (ok) {
          var status = ok ? 'Guided investigation brief copied.' : 'Guided investigation brief could not be copied.';
          update({ immersiveTourStatus: status });
          if (addToast) addToast(status, ok ? 'success' : 'warning');
          if (announce) announce(status);
        });
      }

      function downloadImmersiveTourHandoff() {
        var handoff = immersiveTourHandoffText(d);
        var ok = downloadWeatherText('weather-guided-investigation-' + new Date().toISOString().slice(0, 10) + '.txt', handoff, 'text/plain;charset=utf-8');
        var status = ok ? 'Guided investigation brief downloaded.' : 'Guided investigation brief download was blocked by the browser.';
        update({ immersiveTourStatus: status });
        if (addToast) addToast(status, ok ? 'success' : 'warning');
        if (announce) announce(status);
      }

`;
replaceOnce('guided handoff action anchor', '      function saveImmersiveLessonPreset() {', actionHelpers + '      function saveImmersiveLessonPreset() {');

const handoffUi = String.raw`                  teacherMode && h('div', { className: 'mt-3 rounded-lg border border-violet-300/25 bg-violet-300/10 p-3', 'data-weather-tour-handoff': true, 'aria-labelledby': 'weather-tour-handoff-title' },
                    h('p', { id: 'weather-tour-handoff-title', className: 'text-[10px] font-black uppercase tracking-wide text-violet-200' }, 'Teacher run brief'),
                    h('p', { className: 'mt-1 text-[10px] leading-relaxed text-slate-300' }, 'Copy or download the current scene, prompts, completion, evidence counts, and reflection for lesson plans or team handoff. Location stays excluded unless the sharing preference is enabled.'),
                    h('div', { className: 'mt-2 grid gap-2 sm:grid-cols-2' },
                      h('button', { type: 'button', onClick: copyImmersiveTourHandoff, className: 'min-h-11 rounded-lg border border-violet-300/35 bg-violet-300/10 px-3 py-2 text-[10px] font-black text-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200' }, 'Copy teacher brief'),
                      h('button', { type: 'button', onClick: downloadImmersiveTourHandoff, className: 'min-h-11 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-black text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white' }, 'Download teacher brief')
                    )
                  ),
`;
replaceOnce('guided handoff ui anchor', "                  h('label', { htmlFor: 'weather-immersive-reflection', className: 'mt-3 block text-[11px] font-black text-cyan-200' }, '3D evidence note',", handoffUi + "                  h('label', { htmlFor: 'weather-immersive-reflection', className: 'mt-3 block text-[11px] font-black text-cyan-200' }, '3D evidence note',");

const temp = path.resolve('stem_lab/stem_tool_weathersystems.guided-handoff.tmp.js');
fs.writeFileSync(temp, source, 'utf8');
console.log(JSON.stringify({ temp, bytes: Buffer.byteLength(source) }));
