import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
function capture(id=1){const cfg={cover:10,event:'restoreCover'};return api.capture(cfg,api.compare(cfg),80,'voles','More cover may help prey.','Cover changed before biomass.',id);}
describe('food-web field notebook',()=>{
  it('captures independent setup and paired evidence snapshots',()=>{
    const cfg=api.normalize({cover:10,event:'restoreCover'}), pair=api.compare(cfg);
    const note=api.capture(cfg,pair,80,'voles','prediction','explanation',1);
    const original=JSON.stringify(note);
    cfg.initial.voles=0;pair.experiment[80].values.voles=999;pair.baseline[80].cover=77;
    expect(JSON.stringify(note)).toBe(original);
    expect(note.baseline.cover).toBe(10);expect(note.experiment.cover).toBe(50);
    expect(note.baseline.values).toEqual(note.experiment.values);
  });
  it('preserves original evidence when normalizing saved notes, without recomputing it',()=>{
    const note=capture();note.experiment.values.voles=0.00000001234;
    const restored=api.notebook(JSON.parse(JSON.stringify([note])));
    expect(restored).toEqual([note]);
    restored[0].config.initial.voles=0;restored[0].experiment.values.voles=0;
    expect(note.config.initial.voles).toBe(28);expect(note.experiment.values.voles).toBeGreaterThan(0);
  });
  it('rejects corrupt, unsupported and duplicate notes and limits retained entries',()=>{
    const note=capture();
    const bad=[null,{}, {...note,version:2}, {...note,step:300}, {...note,id:-1}, {...note,experiment:{...note.experiment,values:{...note.experiment.values,voles:NaN}}}];
    expect(api.notebook(bad)).toEqual([]);expect(api.notebook('bad')).toEqual([]);
    expect(api.notebook([note,note])).toHaveLength(1);
    expect(api.notebook(Array.from({length:15},(_,i)=>({...note,id:i+1})))).toHaveLength(12);
  });
  it('normalizes optional strings and focus without losing valid evidence',()=>{
    const note=capture();note.focus='unknown';note.prediction='x'.repeat(2000);note.explanation='y'.repeat(3000);
    const restored=api.notebook([note])[0];
    expect(restored.focus).toBe('plants');expect(restored.prediction).toHaveLength(1200);expect(restored.explanation).toHaveLength(2000);
  });
  it('exports setup, all species, exact snapshot context and tiny positive values',()=>{
    const note=capture();note.experiment.values.voles=1.234e-8;note.explanation='<script>plain text</script>\nSecond line.';
    const txt=api.notebookText([note]);
    expect(txt).toContain('OBSERVATION 1');expect(txt).toContain('Restore refuge cover by 40 percentage points');expect(txt).toContain('1.2340000e-8');
    expect(txt).toContain('baseline 10%; experiment 50%');expect(txt).toContain(note.explanation);
    for(const sp of api.species)expect(txt).toContain(sp.name+' |');
  });
});
