
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
const resistor={type:'resistor',value:100,id:1};
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');api=window.StemLab;});
describe('Guided circuit investigations',()=>{
  it.each([['resistance',0,.09,.045],['paths',2,.09,.18],['loop',0,0,9/100.001]])('uses the actual single-variable model for %s',(id,choice,before,after)=>{
    const trial=api.circuitLessonResult(id,choice);
    expect(trial.correct).toBe(true);
    expect(api.solveCircuit(trial.before).current).toBeCloseTo(before,10);
    expect(api.solveCircuit(trial.after).current).toBeCloseTo(after,10);
    expect(api.circuitExperimentDiff(trial.before,trial.after).controlled).toBe(true);
  });
  it('retains wrong predictions for feedback and rejects invalid choices',()=>{
    expect(api.circuitLessonResult('resistance',2).correct).toBe(false);
    for(const [id,choice] of [['unknown',0],['loop',-1],['loop',3],['loop',null],['loop',.5]])expect(api.circuitLessonResult(id,choice)).toBeNull();
  });
  it('isolates saved evidence from later edits and from the lesson templates',()=>{
    const first=api.circuitLessonResult('resistance',0);first.after.components[0].value=999;
    expect(api.circuitLessonResult('resistance',0).after.components[0].value).toBe(200);
    expect(first.before.components[0].value).toBe(100);
  });
  it('explains an inactive source without calling it a broken loop',()=>{
    expect(api.circuitCoach({voltage:0,components:[resistor]}).id).toBe('off');
  });
  it('distinguishes series blockers and tiny meter current',()=>{
    for(const [part,id] of [[{type:'switch',closed:false},'switch-open'],[{type:'led',reversed:true},'led-reversed'],[{type:'capacitor'},'capacitor'],[{type:'voltmeter'},'meter']]){
      const result=api.circuitCoach({components:[resistor,part]});expect(result.id).toBe(id);expect(result.index).toBe(1);
    }
  });
  it('does not describe an open parallel branch as a globally broken circuit',()=>{
    const r=api.circuitCoach({mode:'parallel',components:[resistor,{type:'switch',closed:false}]});
    expect(api.circuitCoach({mode:'parallel',components:[{type:'led',reversed:true}]}).id).toBe('branch');
    expect(r.id).toBe('branch');expect(r.body).toContain('not the whole parallel circuit');
  });
  it('prioritizes low-resistance and LED overcurrent paths',()=>{
    expect(api.circuitCoach({mode:'parallel',components:[resistor,{type:'ammeter'}]}).id).toBe('short');
    expect(api.circuitCoach({mode:'parallel',components:[resistor,{type:'led'}]}).id).toBe('led-high');
  });
  it('keeps parts and supply controls before the schematic and its inspector',()=>{
    const html=renderTool('circuit',{_circuit:{components:[resistor]}});
    expect(html.indexOf('class="circuit-parts-shelf"')).toBeLessThan(html.indexOf('aria-label="Interactive series'));
    expect(html.indexOf('aria-label="Interactive series')).toBeLessThan(html.indexOf('id="circuit-inspect-part"'));
    expect(html).toContain('min="0" max="24"');
    expect(html).toContain('Read the circuit: voltage');
  });
});
