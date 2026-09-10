import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let c;beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_semiconductor.js','semiconductor');c=window.__SemiconductorCore;});
const mats={silicon:{name:'Si',bandGap:1.12,ni:1.5e10}},solar={silicon:{name:'Si',eff:.22,Voc:.72}};
function entry(state={subtool:'bandgap'},options={}){const run=c.sweepRun(state,options,mats,solar);return {workspace:state.subtool,label:'Saved experiment',data:{parameterSweep:run}};}
describe('Saved sweep validation and fidelity',()=>{
it.each(['bandgap','pnjunction','transistor','solarcell'])('accepts stored runs for %s',subtool=>{const e=entry({subtool});expect(c.savedSweep(e).error).toBe('');expect(c.savedSweep(e).run).toEqual(e.data.parameterSweep);});
it('preserves old numeric readings without calculating them again',()=>{const e=entry();e.data.parameterSweep.points[3].y=.123456789;expect(c.savedSweep(e).run.points[3].y).toBe(.123456789);});
it('deep copies archived values',()=>{const e=entry(),r=c.savedSweep(e).run;r.points[0].y=99;r.settings.material='gaas';expect(e.data.parameterSweep.points[0].y).not.toBe(99);expect(e.data.parameterSweep.settings.material).toBe('silicon');});
it('accepts missing model outputs and zero solar power',()=>{const e=entry({subtool:'pnjunction'},{start:-1,end:1});expect(c.savedSweep(e).run.points.at(-1).y).toBeNull();expect(c.savedSweep(entry({subtool:'solarcell',solarOpen:true})).run.points.every(p=>p.y===0)).toBe(true);});
it.each([null,{}, {data:{}},{data:{parameterSweep:null}}])('quietly omits older non-sweep entries %j',e=>expect(c.savedSweep(e)).toEqual({run:null,error:''}));
it.each(['points','baseline','output','held','scope'])('rejects incomplete %s',key=>{const e=entry();delete e.data.parameterSweep[key];expect(c.savedSweep(e).run).toBeNull();expect(c.savedSweep(e).error).toContain('recorded notebook evidence');});
it('rejects mismatched lessons, unknown versions and unsupported fields',()=>{const e=entry();e.workspace='transistor';expect(c.savedSweep(e).run).toBeNull();e.workspace='bandgap';e.data.parameterSweep.version=99;expect(c.savedSweep(e).run).toBeNull();e.data.parameterSweep.version=1;e.data.parameterSweep.field='gateVoltage';expect(c.savedSweep(e).run).toBeNull();});
it('rejects special inherited keys without throwing',()=>{const e=entry();e.workspace='constructor';expect(c.savedSweep(e).run).toBeNull();});
it.each([NaN,Infinity,'1',{}])('rejects nonnumeric sample readings %j',y=>{const e=entry();e.data.parameterSweep.points[0].y=y;expect(c.savedSweep(e).run).toBeNull();});
it('rejects repeated or unsorted x coordinates and missing samples',()=>{const e=entry();e.data.parameterSweep.points[2].x=e.data.parameterSweep.points[1].x;expect(c.savedSweep(e).run).toBeNull();e.data.parameterSweep.points.pop();expect(c.savedSweep(e).run).toBeNull();});
it('rejects invalid logarithmic output without turning zero into a log',()=>{const e=entry({subtool:'bandgap'},{output:'intrinsic'});e.data.parameterSweep.points[0].y=0;expect(c.savedSweep(e).run).toBeNull();});
it('rejects missing solar reference readings',()=>{const e=entry({subtool:'solarcell'});delete e.data.parameterSweep.points[3].reference;expect(c.savedSweep(e).run).toBeNull();});
it('rejects non-text status data',()=>{const e=entry();e.data.parameterSweep.points[0].status={value:'bad'};expect(c.savedSweep(e).run).toBeNull();});
});
describe('Saved review surface',()=>{
function html(e){return renderTool('semiconductor',{semiconductor:{subtool:'memory'}},{toolSnapshots:[{tool:'semiconductor',label:e.label,data:{...e.data,subtool:e.workspace}}]});}
it('offers a saved curve and sample selector without changing the current lesson',()=>{const out=html(entry());expect(out).toContain('Review saved sweep plot');expect(out).toContain('Review sample');expect(out).toContain('does not change your live simulation');});
it('shows the stored sample pair and derives differences from stored readings',()=>{const e=entry();e.data.sweepComparison={aIndex:2,bIndex:8};expect(html(e)).toContain('A: sample 3');expect(html(e)).toContain('B: sample 9');expect(html(e)).toContain('not the current model');});
it('keeps incomplete old plot data readable through its notebook evidence',()=>{const e=entry();e.data.parameterSweep.points=[];e.data.recordedEvidence=[['Old value','1.23 eV']];const out=html(e);expect(out).toContain('1.23 eV');expect(out).toContain('incomplete or unsupported');});
it('does not fabricate a missing saved comparison pair',()=>{const e=entry();e.data.sweepComparison={aIndex:99,bIndex:0};expect(html(e)).toContain('saved comparison selection is unavailable');});
});
