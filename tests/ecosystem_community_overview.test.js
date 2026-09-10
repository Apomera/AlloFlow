import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_ecosystem.js', 'ecosystem'); api=window.StemLab.ecosystemFoodWeb; });
describe('community overview insights', () => {
  it('reports no differences for a control or a no-op cover event', () => {
    for (const config of [{ event: 'none' }, { event: 'clearCover', cover: 0 }]) {
      expect(api.insights(api.compare(config))).toEqual(api.species.map(sp => ({ id: sp.id, peak: null, firstVisible: null })));
    }
  });
  it('finds actual peak and first threshold samples without changing the data', () => {
    const pair=api.compare({ event: 'restoreCover', cover: 10 }), saved=JSON.stringify(pair);
    for (const info of api.insights(pair)) {
      const deltas=pair.experiment.map((row,i) => row.values[info.id]-pair.baseline[i].values[info.id]);
      const peak=Math.max(...deltas.map(Math.abs));
      if (peak===0) { expect(info.peak).toBeNull(); expect(info.firstVisible).toBeNull(); continue; }
      expect(Math.abs(info.peak.delta)).toBe(peak);
      expect(info.peak.step).toBe(deltas.findIndex(d => Math.abs(d)===peak));
      expect(info.firstVisible?.step ?? -1).toBe(deltas.findIndex(d => Math.abs(d)>=0.1));
      expect(info.peak.step).toBeGreaterThan(80);
    }
    expect(JSON.stringify(pair)).toBe(saved);
  });
  it('uses absolute differences, earliest ties, and keeps tiny differences distinct from zero', () => {
    const values=Object.fromEntries(api.species.map(sp => [sp.id,10]));
    const baseline=[0,1,2,3].map(step => ({ step, values:{...values} }));
    const experiment=baseline.map(row => ({ step: row.step, values:{...row.values} }));
    experiment[1].values.rabbits=8; experiment[2].values.rabbits=12;
    experiment[3].values.voles=10.001;
    const info=api.insights({baseline,experiment});
    expect(info.find(x=>x.id==='rabbits').peak).toEqual({step:1,delta:-2});
    expect(info.find(x=>x.id==='voles').peak.step).toBe(3);
    expect(info.find(x=>x.id==='voles').firstVisible).toBeNull();
  });
  it('keeps excluded groups free of invented milestones', () => {
    const info=api.insights(api.compare({ enabled:{owls:false,voles:false} }));
    for (const id of ['owls','voles']) expect(info.find(x=>x.id===id)).toEqual({id,peak:null,firstVisible:null});
  });
});
