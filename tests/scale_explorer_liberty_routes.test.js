import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(process.env.SCALE_LIBERTY_SOURCE||'stem_lab/stem_tool_scaleexplorer.js','utf8');
const sandbox={window:{StemLab:{registerTool(){}}},console:{log(){}}};
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {", "  window.libertyChecks={sites:LIBERTY_SITES,route:LIBERTY_ROUTE,point:libertyPoint,view:libertyRouteView,index:libertyRouteIndex,number:libertyRouteNumber,details:atlasDetails,notes:readObservations,drafts:readObservationDrafts,backup:notebookBackup,parse:readNotebookBackup,items:ITEMS,limit:inspectionLimit};\n  window.StemLab.registerTool('scaleExplorer', {"),sandbox);
const p=sandbox.window.libertyChecks,plain=value=>JSON.parse(JSON.stringify(value));
const ids=['foundation','pedestal','terrace','feet','robe','tablet','face','crown','torch','flame'];
const details=()=>p.details('liberty',(_,fallback)=>fallback);

describe('Scale Explorer Statue of Liberty landmark study',()=>{
  it('provides ten cited native landmarks and keeps a 93 m monument reference with detached bounded cameras',()=>{
    expect(plain(p.route)).toEqual(ids);expect(p.items.find(i=>i.id==='liberty')).toMatchObject({size:93,dim:'tall'});expect(p.limit('liberty')).toBe(24);
    const original=plain(p.sites),all=details();expect(all).toHaveLength(10);expect(all.map(d=>d.id)).toEqual(ids);
    for(const [n,d] of all.entries()){expect(d.libertySite).toBe(true);expect(d.marker).toBe(false);expect(d.source).toMatch(/^https:\/\//);expect(d.at).toHaveLength(3);expect(d.at.every(Number.isFinite)).toBe(true);expect(Math.hypot(...d.view)).toBeCloseTo(1,9);expect(d.zoom).toBeGreaterThanOrEqual(1);expect(d.zoom).toBeLessThanOrEqual(24);const v=p.view(n+1);expect(v.id).toBe(ids[n]);expect(v.n).toBe(n+1);v.at[0]=99;v.view[1]=99;d.at[0]=99;d.view[1]=99;}
    const direct=p.point('crown');direct.at[2]=99;direct.view[0]=99;expect(plain(p.sites)).toEqual(original);expect(p.point('crown').at[2]).not.toBe(99);expect(details().find(d=>d.id==='face').at[0]).not.toBe(99);
    expect([0,1,2.4,2.5,10,99,-10].map(p.number)).toEqual([1,1,2,3,10,10,1]);expect([null,undefined,'10',NaN,Infinity,{},[]].map(p.number)).toEqual(Array(7).fill(1));expect(ids.map(p.index)).toEqual([1,2,3,4,5,6,7,8,9,10]);expect(['face ','FACE','torch-flame',null,{},7].map(p.index)).toEqual(Array(6).fill(0));expect(p.point('unknown-feature')).toBeNull();
  });

  it('round-trips every landmark through the notebook while retaining exact camera fields and rejecting unknown features',()=>{
    const raw=ids.map((id,n)=>({itemId:'liberty',detailId:id,cutaway:false,zoom:1+n*2.4,yaw:.73-n*.1,pitch:-.22+n*.02,note:'Inspect '+id}));raw.push({itemId:'liberty',detailId:'unknown-feature',cutaway:false,zoom:8,yaw:0,pitch:0,note:'Invalid'});
    const notes=plain(p.notes(raw));expect(notes).toHaveLength(10);for(let n=0;n<10;n++){expect(notes[n]).toMatchObject({itemId:raw[n].itemId,detailId:raw[n].detailId,cutaway:false,note:raw[n].note,size:93});for(const field of ['zoom','yaw','pitch'])expect(notes[n][field]).toBeCloseTo(raw[n][field],12);}
    const parsed=p.parse(p.backup({observations:notes}));expect(parsed.error).toBeUndefined();const recovered=plain(parsed.notebook.observations);expect(recovered).toHaveLength(notes.length);for(let n=0;n<notes.length;n++){const actual={...recovered[n]},expected={...notes[n]};for(const field of ['zoom','yaw','pitch']){expect(actual[field]).toBeCloseTo(expected[field],12);delete actual[field];delete expected[field];}expect(actual).toEqual(expected);}expect(plain(p.notes([{itemId:'liberty',detailId:'face',zoom:999}]))[0].zoom).toBe(24);
    const drafts={'liberty:face':'The face has sculpted eyelids.','liberty:flame':'The torch flame is gilded.','liberty:unknown-feature':'Invalid'};expect(plain(p.drafts(drafts))).toEqual({'liberty:face':'The face has sculpted eyelids.','liberty:flame':'The torch flame is gilded.'});
  });
});
