import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const start=source.indexOf('function targetRangeLabel('),end=source.indexOf('        function targetMarkerLabel(',start);
const label=Function('return ('+source.slice(start,end).trim()+')')();
describe('Raptor displayed strike range',()=>{
  it('never rounds an out-of-reach distance down to the normal or diving strike limit',()=>{
    for(const reach of [5,7]){
      expect(Number.parseFloat(label(reach))).toBe(reach);
      for(const extra of [.000001,.01,.05,.099,.1,.2])expect(Number.parseFloat(label(reach+extra))).toBeGreaterThan(reach);
    }
  });
  it('stays monotonic and within a tenth of a metre throughout close approaches',()=>{
    let previous=0;
    for(let i=0;i<=1000;i++){
      const distance=i/100,shown=Number.parseFloat(label(distance));
      expect(shown).toBeGreaterThanOrEqual(previous);expect(shown+1e-9).toBeGreaterThanOrEqual(distance);expect(shown-distance).toBeLessThanOrEqual(.100000001);previous=shown;
    }
    expect(label(-1)).toBe('0.0 m');expect(label(Infinity)).toBe('—');
  });
  it('marks coarse distant estimates as approximate',()=>{
    for(const distance of [50.01,62.8,103.7,499,1249]){
      const result=label(distance);expect(result.startsWith('~')).toBe(true);
      expect(Math.abs(Number.parseFloat(result.slice(1))-distance)).toBeLessThanOrEqual(2.5);
    }
    expect(label(10.1)).toBe('11 m');expect(label(50)).toBe('50 m');
  });
});
