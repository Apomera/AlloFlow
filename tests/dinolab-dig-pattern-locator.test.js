import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
function block(name) { const start = '// DINO_VOXEL_' + name + '_START', end = '// DINO_VOXEL_' + name + '_END', a = source.indexOf(start), b = source.indexOf(end,a); if(a<0||b<a||source.indexOf(start,a+start.length)>=0) throw Error('Ambiguous locator seam'); return source.slice(a,b); }
const modelSource = block('CHECKPOINT_MODEL') + block('PATTERN_LOCATOR_MODEL');
const locate = new Function(modelSource + ';return digVoxelPatternLocator;')();
function survey(depths = Array.from({length:24},(_,i)=>i%5), focus = 7, seed = 1) {
  const columns = depths.map((removed,index)=>({index,row:Math.floor(index/6),col:index%6,coord:String.fromCharCode(65+index%6)+(Math.floor(index/6)+1),removed,remaining:4-removed,status:removed===4?'cleared':removed?'partial':'covered'}));
  return { seed,focus,columns,selected:columns[focus] };
}
const options = {enabled:true,seed:1,focus:7};
describe('Dino depth locator uses current public observations',()=>{
  it('locates all matching counts including the selected coordinate',()=>{
    const result=locate(survey(),options); expect(result).toMatchObject({active:true,removed:2,total:5,marked:5,focus:7});expect(result.columns.map(c=>c.index)).toEqual([2,7,12,17,22]);
  });
  it('limits 3D corners to the inspected row while preserving the whole-site count',()=>{
    const result=locate(survey(),{...options,inspect:true});expect(result.total).toBe(5);expect(result.marked).toBe(1);expect(result.columns.map(c=>c.index)).toEqual([7]);
  });
  it('requires explicit opt-in and matching valid seed and focus',()=>{
    for(const o of [null,{}, {...options,enabled:'true'},{...options,enabled:false},{...options,seed:2},{...options,focus:6},{...options,findMode:true}]) expect(locate(survey(),o)).toEqual({active:false,columns:[],total:0,marked:0});
    const bad=survey();bad.columns[0].remaining=0;expect(locate(bad,options).active).toBe(false);
  });
  it('tracks selection and excavation without retaining obsolete membership after Undo',()=>{
    const depths=Array(24).fill(0),first=locate(survey(depths),options);depths[7]=1;
    expect(locate(survey(depths),options).columns.map(c=>c.index)).toEqual([7]);expect(locate(survey(depths,8),{...options,focus:8}).marked).toBe(23);
    depths[7]=0;expect(locate(survey(depths),options)).toEqual(first);
  });
  it('bounds every depth group and handles zero and fully cleared surfaces',()=>{
    for(let depth=0;depth<=4;depth++){const result=locate(survey(Array(24).fill(depth)),options);expect(result.marked).toBe(24);expect(result.columns.every(c=>c.remaining===4-depth)).toBe(true);}
  });
  it('ignores find status and hidden anatomy when grouping equal depths and never mutates observations',()=>{
    const s=survey(Array(24).fill(2));s.columns[0].status='exposed';s.columns[1].status='contact';
    for(const o of [s,...s.columns]){for(const key of ['burial','hasBone','species','shape'])Object.defineProperty(o,key,{get(){throw Error('Hidden data');}});Object.freeze(o);}Object.freeze(s.columns);
    const result=locate(s,options);expect(result.marked).toBe(24);result.columns[0].remaining=0;expect(s.columns[0].remaining).toBe(2);expect(JSON.stringify(result)).not.toMatch(/species|burial|hasBone|shape|status/);
  });
});
const sandbox={module:{exports:{}},console};sandbox.exports=sandbox.module.exports;vm.runInNewContext(readFileSync('vendor/three-r128/three.min.js','utf8'),sandbox);const THREE=sandbox.module.exports;
function fixture(){const scene=new THREE.Scene(),geometries=[],materials=[];const api=new Function('window','scene','geometry','material','digVoxelPatternLocator','var patternLocatorGroup=null,patternLocatorCells=[];'+block('PATTERN_LOCATOR_ENGINE')+';return {sync:syncPatternLocator,get group(){return patternLocatorGroup;}};')({THREE},scene,g=>{geometries.push(g);return g;},m=>{materials.push(m);return m;},locate);return{api,scene,geometries,materials,p:{survey:survey(),site:{seed:1},focus:7,patternLocator:true}};}
function visible(f){return f.api.group?.visible?f.api.group.children.filter(c=>c.visible):[];}
describe('Dino surface corner renderer',()=>{
  it('allocates nothing while off or invalid, then shares one geometry and one material across all coordinates',()=>{
    const f=fixture();f.api.sync({...f.p,patternLocator:false});f.api.sync({...f.p,site:{seed:2}});expect(f.geometries).toHaveLength(0);expect(f.materials).toHaveLength(0);
    f.api.sync(f.p);expect(f.geometries).toHaveLength(1);expect(f.materials).toHaveLength(1);expect(f.api.group.children).toHaveLength(24);expect(f.api.group.children.every(c=>c.geometry===f.geometries[0]&&c.material===f.materials[0])).toBe(true);
  });
  it('places corners just above the current surface at each real map coordinate',()=>{
    const f=fixture();for(let depth=0;depth<=4;depth++){f.api.sync({...f.p,survey:survey(Array(24).fill(depth))});expect(visible(f)).toHaveLength(24);for(const c of visible(f)){const i=c.userData.index;expect(Array.from(c.position.toArray())).toEqual([(i%6-2.5)*1.08,(4-depth)*.52+.025,(Math.floor(i/6)-1.5)*1.08]);}}
  });
  it('keeps the center of each surface unobstructed and tests depth without altering picking',()=>{
    const f=fixture();f.api.sync(f.p);const positions=f.geometries[0].attributes.position;expect(positions.count).toBe(96);for(let i=0;i<positions.count;i++)expect(Math.max(Math.abs(positions.getX(i)),Math.abs(positions.getZ(i)))).toBeGreaterThan(.4);
    expect(f.materials[0].depthTest).toBe(true);expect(f.materials[0].depthWrite).toBe(false);expect(block('PATTERN_LOCATOR_ENGINE')).not.toMatch(/pickers\.push|floorPickers\.push|Raycaster/);
  });
  it('reuses objects during selection and Undo and clears all metadata in Find or when disabled',()=>{
    const f=fixture();f.api.sync(f.p);const ids=f.api.group.children.map(c=>c.uuid);f.api.sync({...f.p,inspect:true});expect(visible(f).map(c=>c.userData.index)).toEqual([7]);
    for(const extra of [{findMode:true},{patternLocator:false},{site:{seed:2}}]){f.api.sync({...f.p,...extra});expect(visible(f)).toEqual([]);expect(f.api.group.userData).toEqual({});expect(f.api.group.children.every(c=>Object.keys(c.userData).length===0)).toBe(true);}
    f.api.sync(f.p);expect(f.api.group.children.map(c=>c.uuid)).toEqual(ids);expect(f.geometries).toHaveLength(1);expect(f.materials).toHaveLength(1);
  });
  it('registers each owned resource once and needs no texture or hidden site fields',()=>{
    const f=fixture();Object.defineProperty(f.p,'state',{get(){throw Error('Private state');}});Object.defineProperty(f.p.site,'boneCells',{get(){throw Error('Hidden layout');}});f.api.sync(f.p);
    const counts=[];for(const resource of [...f.geometries,...f.materials]){const r={count:0};resource.addEventListener('dispose',()=>r.count++);counts.push(r);resource.dispose();}expect(counts.map(c=>c.count)).toEqual([1,1]);expect(f.materials[0].map).toBeNull();
  });
});
const React={createElement(type,props,...children){return{type,props:props||{},children};}},T={text:'#101828',panel:'#fff',border:'#667085'};
function nodes(t){return Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.children)]:[];}
function words(t){return Array.isArray(t)?t.map(words).join(' '):t&&typeof t==='object'?words(t.children):t==null?'':String(t);}
const ui=new Function(modelSource+block('PATTERN_LOCATOR_UI')+';return {control:renderDinoDigPatternLocatorControl,legend:renderDinoDigPatternLocatorLegend};')();
describe('Dino depth matching explanations',()=>{
  it('uses a native explained checkbox and changes only its boolean preference',()=>{
    const calls=[],tree=ui.control(React,{T,onPatternLocator:v=>calls.push(v)}),checkbox=nodes(tree).find(n=>n.type==='input');expect(checkbox.props.checked).toBe(false);expect(checkbox.props['aria-describedby']).toBe('dino-pattern-locator-hint');
    checkbox.props.onChange({target:{checked:true}});checkbox.props.onChange({target:{checked:'true'}});expect(calls).toEqual([true,false]);expect(words(tree)).toContain('Matching counts do not establish a fossil relationship');expect(ui.control(React,{T})).toBeNull();
  });
  it('keeps count and row scope in a persistent canvas legend and omits it in Find',()=>{
    const p={T,survey:survey(),site:{seed:1},focus:7,patternLocator:true,inspect:true};expect(words(ui.legend(React,p))).toContain('1 of 5 matching coordinates marked in this view');expect(ui.legend(React,{...p,findMode:true})).toBeNull();expect(ui.legend(React,{...p,patternLocator:false})).toBeNull();
  });
  it('registers all four new explanations in both English registries',()=>{
    const phrases=[...block('PATTERN_LOCATOR_UI').matchAll(/digPatternLocatorText\(props,'([^']+)','([^']+)'/g)];expect(phrases).toHaveLength(4);for(const file of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){const registry=JSON.parse(readFileSync(file,'utf8')).stem.dinolab;for(const m of phrases)expect(registry['locator_'+m[1]]).toBe(m[2]);}
  });
});
