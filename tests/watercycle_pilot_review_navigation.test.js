import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
for(const file of ['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js']) {
 const source=readFileSync(file,'utf8'),host={};
 const start=source.indexOf('  var WC_PILOT_UNIT_M ='),end=source.indexOf('\n  };',source.indexOf('  window.WaterCyclePilotKernel = {'));
 new Function('window',source.slice(start,end+5))(host);
 const N=host.WaterCyclePilotNotebook;
 const change=(id,sequence,elapsed=sequence)=>({id,sequence,elapsed,scenario:'tropicalOcean',from:'liquid',to:'vapor',energy:1});
 describe(`recorded observation navigation: ${file}`,()=>{
  it('handles empty, missing, and single-record trails without invented neighbors',()=>{
   expect(N.reviewNeighbors(null,'x')).toBeNull();expect(N.reviewNeighbors({},'x')).toBeNull();
   expect(N.reviewNeighbors({lastChange:change('a',1)},'a')).toEqual({position:1,total:1,earlierId:'',laterId:''});
   expect(N.reviewNeighbors({lastChange:change('a',1)},'x')).toBeNull();
  });
  it('finds first, middle, and last observations in recorded order',()=>{
   const pilot={notebookChanges:['a','b','c'].map((id,i)=>change(id,i+1)),lastChange:change('c',3)};
   expect(N.reviewNeighbors(pilot,'a')).toEqual({position:1,total:3,earlierId:'',laterId:'b'});
   expect(N.reviewNeighbors(pilot,'b')).toEqual({position:2,total:3,earlierId:'a',laterId:'c'});
   expect(N.reviewNeighbors(pilot,'c')).toEqual({position:3,total:3,earlierId:'b',laterId:''});
  });
  it('does not reorder evidence when model time restarts in another climate',()=>{
   const pilot={notebookChanges:[change('old',1,90),{...change('new',2,2),scenario:'mountainWinter'}]};
   expect(N.reviewNeighbors(pilot,'new').earlierId).toBe('old');
   expect(N.selectChange(pilot,'old').elapsed).toBe(90);
  });
  it('includes an unlisted latest receipt once while retaining the history bound',()=>{
   const pilot={notebookChanges:Array.from({length:30},(_,i)=>change('event-'+i,i+1)),lastChange:change('latest',31)};
   expect(N.reviewNeighbors(pilot,'event-6')).toBeNull();
   expect(N.reviewNeighbors(pilot,'latest')).toEqual({position:24,total:24,earlierId:'event-29',laterId:''});
   pilot.notebookChanges.push(pilot.lastChange);
   expect(N.reviewNeighbors(pilot,'latest').total).toBe(24);
  });
  it('leaves the selected record and all live progress unchanged',()=>{
   const pilot={notebookChanges:[change('a',1),change('b',2)],snapshot:{form:'rain',elapsed:100},mission:{status:'active',events:[]},reviewChange:change('a',1),reviewReturnId:'original-button',paused:true};
   const before=JSON.stringify(pilot),neighbors=N.reviewNeighbors(pilot,'a');
   const next=N.selectChange(pilot,neighbors.laterId);next.energy=0;
   expect(JSON.stringify(pilot)).toBe(before);
  });
 });
}
