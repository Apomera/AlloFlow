// Read-only characterization probes: evaluates copies of existing component functions.
// Run: node reports/behavior-lens-deep-review-2026-09-12/analytics-probes.cjs
const fs = require('node:fs');
const assert = require('node:assert/strict');
const src = fs.readFileSync('behavior_lens_module.js', 'utf8');
global.window = { AlloModules: {} };
new Function(fs.readFileSync('behavior_lens_workspace_module.js', 'utf8'))();
const runtime = window.AlloModules.BehaviorLensWorkspace;
const results = [];
global.uid = () => 'probe-id';
global.X = 'svg';
global.Save = 'svg';
global.fmtDuration = seconds => String(seconds);
function harness(name, props) {
  const start = src.indexOf('    const ' + name + ' =');
  const end = src.indexOf('\n    };', start) + '\n    };'.length;
  assert(start >= 0 && end > start);
  const states = []; let cursor = 0; const effects = [];
  const state = initial => {
    const idx = cursor++;
    if (!(idx in states)) states[idx] = typeof initial === 'function' ? initial() : initial;
    return [states[idx], val => { states[idx] = typeof val === 'function' ? val(states[idx]) : val; }];
  };
  const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(c => c !== null && c !== undefined && c !== false) });
  const component = new Function('h', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'tt', 'getBehaviorLensWorkspaceRuntime', 'ABA_GRAPH_COLORS', 'JABA_GRAPH_COLORS', src.slice(start, end) + '\nreturn ' + name)(h, state, f => effects.push(f), v => state({ current:v })[0], f => f(), f => f, (key, fallback) => fallback, () => runtime, ['#6366f1'], ['#000']);
  let tree;
  function render(runEffects = false) { cursor = 0; effects.length = 0; tree = component(props); if (runEffects) effects.forEach(f => f()); return tree; }
  function all(predicate, node = tree, out = []) { if (node && typeof node === 'object') { if (predicate(node)) out.push(node); node.children.forEach(c => all(predicate, c, out)); } return out; }
  function label(label) { const found=all(n => n.props['aria-label'] === label); assert(found.length, 'Missing label '+label); return found[0]; }
  function text(node) { return node && typeof node === 'object' ? node.children.map(text).join('') : String(node ?? ''); }
  function button(fragment) { const found=all(n => n.type === 'button' && text(n).includes(fragment)); assert(found.length,'Missing button '+fragment); return found[0]; }
  render();
  return {render, all, label, button, states, text};
}
function probe(name, fn) { fn(); results.push({name, reproduced:true}); }
const t = () => undefined;
probe('Graph auto mode reverses real chronological progress', () => {
  let graph;
  harness('ABAGraphEngine', {t, phases:[], sessionHistory:[{date:'2026-09-03',behavior:'Calling out',count:1},{date:'2026-09-02',behavior:'Calling out',count:5},{date:'2026-09-01',behavior:'Calling out',count:10}], onExportData:v=>graph=v}).render(true);
  assert.deepEqual(graph.dataSeries.map(x=>x.value), [1,5,10]);
  assert(graph.phaseAnalysis[0].trendSlope > 0);
});
probe('Graph documented two-column CSV imports session numbers instead of values', () => {
  let graph; const q=harness('ABAGraphEngine',{t,phases:[],sessionHistory:[],onExportData:v=>graph=v});
  q.button('Manual Entry').props.onClick(); q.render();
  q.label('Toggle show csv import').props.onClick(); q.render();
  q.label('Session data CSV input').props.onChange({target:{value:'1,12\n2,8\n3,4'}}); q.render();
  q.label('Import Data').props.onClick(); q.render(true);
  assert.deepEqual(graph.dataSeries.map(x=>x.value), [1,2,3]);
});
probe('Graph percentage targets plot correct count instead of percent', () => {
  let graph;
  harness('ABAGraphEngine',{t,phases:[],sessionHistory:[{date:'2026-09-01',targets:[{name:'Task',type:'percentage',count:3,total:4}]}],onExportData:v=>graph=v}).render(true);
  assert.equal(graph.dataSeries[0].value,3); // Correct value would be 75%.
});
probe('Removing middle tracker target then adding duplicates IDs and edits both targets', () => {
  const q=harness('SessionDataTracker',{t,abcEntries:[]});
  q.label('+ Add').props.onClick();q.render();q.label('+ Add').props.onClick();q.render();
  q.all(n=>n.props['aria-label']==='Remove target')[1].props.onClick();q.render();
  q.label('+ Add').props.onClick();q.render();
  const inputs=q.all(n=>n.props['aria-label']==='Target behavior name');
  inputs[2].props.onChange({target:{value:'Changed only last field'}});q.render();
  assert.deepEqual(q.states[0].map(x=>x.id),['b1','b3','b3']);
  assert.equal(q.states[0][1].name,'Changed only last field');
});
probe('Ending tracker session discards active duration and retains timer into next session', () => {
  let saved; const q=harness('SessionDataTracker',{t,abcEntries:[],onSaveSession:v=>saved=v});
  q.label('Target behavior name').props.onChange({target:{value:'Task'}});q.render();
  q.label('Data collection type for Task').props.onChange({target:{value:'duration'}});q.render();
  q.button('Start Session').props.onClick();q.render();
  q.label('Toggle Duration').props.onClick();q.render();
  q.states[3]=5;q.render();q.label('End Session & Save').props.onClick();q.render();
  assert.deepEqual(saved.targets[0].durations,[]);assert.equal(saved.targets[0].count,0);
  q.button('Start Session').props.onClick();q.render();
  assert(q.text(q.label('Toggle Duration')).includes('Stop'));
});
probe('Progress Monitor ignores goal date and suppresses zero goals', () => {
  const q=harness('ProgressMonitorDashboard',{t,abcEntries:[{timestamp:'2026-09-01T12:00:00Z'},{timestamp:'2026-09-02T12:00:00Z'}]});
  q.label('Goal count per day').props.onChange({target:{value:'1'}});q.render();
  const svgBefore=JSON.stringify(q.all(n=>n.type==='svg')[0]);
  q.label('Goal target date').props.onChange({target:{value:'2026-12-01'}});q.render();
  assert.equal(JSON.stringify(q.all(n=>n.type==='svg')[0]),svgBefore);
  q.label('Goal count per day').props.onChange({target:{value:'0'}});q.render();
  assert.equal(q.all(n=>n.type==='line' && n.props.stroke==='#22c55e').length,0);
});
probe('Unassigned phase borrows denominator from named-phase observations', () => {
  const summary=runtime.summarizePhases([{id:'a',phase:null,intensity:2}],[{duration:3600,phase:'baseline'}]);
  assert.equal(summary[0].rate.perObservedHour,1);
  assert.equal(summary[0].rate.denominatorAvailable,true);
});
probe('Zero-incident observed phase is omitted entirely from phase summaries', () => {
  const summary=runtime.summarizePhases([{id:'a',phase:'baseline',intensity:2}],[{duration:3600,phase:'baseline'},{duration:3600,phase:'intervention'}]);
  assert.deepEqual(summary.map(x=>x.phase),['baseline']);
});
probe('AI freshness fingerprint ignores narrative and setting edits', () => {
  const entries=runtime.normalizeAbcEntries([{id:'a',timestamp:'2026-09-01T12:00:00Z',antecedent:'Instruction',behavior:'Hit',consequence:'Break',intensity:2,setting:'Classroom',notes:'Initial'}]).items;
  const analysis={provenance:runtime.createAnalysisProvenance(entries)};
  const changed=runtime.normalizeAbcEntries([{...entries[0],antecedent:'No instruction',behavior:'Asked for help',consequence:'Praise',setting:'Playground',notes:'Corrected description'}]).items;
  assert.equal(runtime.isAnalysisStale(analysis,changed),false);
});
probe('Data quality reports too few incomplete entries when omissions affect different rows', () => {
  const entries=[{id:'a',timestamp:'2026-09-01',antecedent:'',behavior:'Hit',consequence:'Break'},{id:'b',timestamp:'2026-09-01',antecedent:'Instruction',behavior:'Hit',consequence:''}];
  assert.equal(runtime.inspectAbcData(entries,[],[]).incompleteAbcCount,1);
});
probe('Unknown timezone becomes UTC after repeated workspace normalization', () => {
  const once=runtime.normalizeAbcEntries([{id:'a',timestamp:'2026-09-02T01:00:00Z',antecedent:'A',behavior:'B',consequence:'C'}]).items;
  const twice=runtime.normalizeAbcEntries(once).items;
  assert.equal(once[0].timezoneOffset,null);
  assert.equal(twice[0].timezoneOffset,0);
});
probe('Frequency Counter rejects zero events even after valid observation time', () => {
  let saved = null; let closed = false;
  const q=harness('FrequencyCounter',{t,onSaveSession:v=>saved=v,onClose:()=>closed=true});
  q.states[2]=60;q.render();
  const save=q.button('Save');assert(!save.props.disabled);
  save.props.onClick();assert.equal(saved,null);assert.equal(closed,false);
});
console.log(JSON.stringify(results,null,2));

