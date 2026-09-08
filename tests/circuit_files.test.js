
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
const base=()=>({format:'circuit-design-v1',circuit:{mode:'series',voltage:9,components:[{type:'resistor',value:470},{type:'led',ledColor:'#ef4444',reversed:false}]}});
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');api=window.StemLab;});
describe('Portable circuit designs',()=>{
  it('round-trips electrical behavior without exporting notebook or tool state',()=>{
    const state={...base().circuit,prediction:'Private note',tick:50,undo:[{}]};
    const doc=api.circuitDesignDocument(state),read=api.parseCircuitDesign(JSON.stringify(doc));
    expect(Object.keys(doc)).toEqual(['format','circuit']);
    expect(JSON.stringify(doc)).not.toContain('Private note');
    expect(api.solveCircuit(read).current).toBe(api.solveCircuit(state).current);
    expect(api.circuitExperimentDiff(read,state).unchanged).toBe(true);
  });
  it('preserves every supported component setting and a 0 V source',()=>{
    const state={mode:'parallel',voltage:0,components:[{type:'resistor',value:3.3},{type:'bulb',value:60},{type:'capacitor',value:470},{type:'switch',closed:false},{type:'led',ledColor:'#3b82f6',reversed:true},{type:'ammeter'},{type:'voltmeter'}]};
    const read=api.parseCircuitDesign(JSON.stringify(api.circuitDesignDocument(state)));
    expect(api.circuitExperimentDiff(read,state).unchanged).toBe(true);
    expect(read.components.map(c=>c.id)).toEqual([1,2,3,4,5,6,7]);
  });
  it('allows empty designs and exactly eight valid parts',()=>{
    for(const length of [0,8]){
      const doc=base();doc.circuit.components=Array.from({length},()=>({type:'resistor',value:100}));
      expect(api.parseCircuitDesign(JSON.stringify(doc)).components).toHaveLength(length);
    }
  });
  it.each([
    ['voltage',-1],['voltage',25],['voltage','9'],['mode','mixed'],['components',null],
    ['components',Array.from({length:9},()=>({type:'resistor',value:100}))]
  ])('rejects invalid %s settings',(field,value)=>{
    const doc=base();doc.circuit[field]=value;
    expect(()=>api.parseCircuitDesign(JSON.stringify(doc))).toThrow();
  });
  it.each([
    {type:'resistor',value:0},{type:'bulb',value:10001},{type:'capacitor',value:'100'},
    {type:'switch',closed:'false'},{type:'led',ledColor:'#ef4444'},{type:'led',reversed:false,ledColor:'url(fake)'},{type:'script'},null
  ])('rejects malformed component %#',part=>{
    const doc=base();doc.circuit.components=[part];
    expect(()=>api.parseCircuitDesign(JSON.stringify(doc))).toThrow();
  });
  it('discards extra state and regenerates IDs rather than restoring file objects',()=>{
    const doc=base();doc.circuit.components[0].id='duplicate';doc.circuit.components[0].onClick='arbitrary';doc.circuit.undo=[{}];
    const read=api.parseCircuitDesign(JSON.stringify(doc));
    expect(read.components[0]).toEqual({type:'resistor',id:1,value:470});
    expect(read.undo).toBeUndefined();
  });
  it('rejects wrong formats, malformed JSON, and oversized content',()=>{
    for(const text of ['null','{','{"format":"circuit-evidence-v1"}',' '.repeat(65537)])expect(()=>api.parseCircuitDesign(text)).toThrow();
  });
});
describe('Power reading precision',()=>{
  it('distinguishes meter loading from exactly zero transferred power',()=>{
    expect(api.circuitPowerText(0)).toBe('0 W');
    expect(api.circuitPowerText(.000000081)).toBe('0.0810 µW');
    expect(api.circuitPowerText(.13125)).toBe('131.25 mW');
    expect(api.circuitPowerText(2)).toBe('2.000 W');
  });
});
