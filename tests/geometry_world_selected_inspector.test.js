import {afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let THREE,makeShape,api,mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{
  if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}
  vi.restoreAllMocks();vi.clearAllTimers();vi.useRealTimers();
  for(const key of ['__geoWorldEngine','__alloPrintLabPendingHandoff','__alloGeometryWorldReturnProject','__alloGeometryWorldPendingBuild'])delete window[key];
});
const key=p=>[p.x,p.y,p.z].join(',');
function fixtureEngine(){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,800/600,.1,200);scene.fog=new THREE.Fog(0xadc4ad,55,145);camera.position.set(3,5,9);
  const groups={a:[{x:0,y:1,z:0},{x:1,y:1,z:0}],b:[{x:8,y:1,z:0},{x:9,y:1,z:0},{x:8,y:2,z:0}],ground:[{x:0,y:0,z:0}]};
  const engine={scene,camera,blocks:{},_currentLesson:api.FREE_BUILD_LESSON,_undoStack:[{action:'place',x:1,y:1,z:0}],_redoStack:[{action:'remove',x:4,y:1,z:0}],blocksPlaced:47,_popBlocks:[],velocity:new THREE.Vector3(),euler:new THREE.Euler(),yaw:0,pitch:0,flyMode:true,incomplete:false,aimed:'b',getBlocksArr(){return Object.values(this.blocks);}};
  Object.entries(groups).forEach(([name,positions])=>positions.forEach((p,index)=>{
    const shape=name==='a'&&index===1?'quarter':'cube',rotation=shape==='quarter'?2:0,type=name==='ground'?'grass':name==='a'?'stone':'wood',mesh=new THREE.Mesh(makeShape(shape),new THREE.MeshStandardMaterial({color:0x71957b}));
    mesh.position.set(p.x+.5,p.y+(shape==='cube'?.5:0),p.z+.5);mesh.rotation.y=rotation*Math.PI/2;mesh.updateMatrixWorld(true);mesh.userData={gridPos:{...p},shape,rotation,blockType:type,volume:shape==='quarter'?.25:1,_measurementLayer:name==='ground'?'ground':'student',_lessonBlock:name==='ground'};engine.blocks[key(p)]=mesh;scene.add(mesh);
  }));
  function measurement(cells){const blocks=cells.filter(p=>engine.blocks[key(p)]);if(!blocks.length)return null;const extent=axis=>Math.max(...blocks.map(p=>p[axis]))-Math.min(...blocks.map(p=>p[axis]))+1;const shapeCounts={};let totalVolume=0;blocks.forEach(p=>{const data=engine.blocks[key(p)].userData;shapeCounts[data.shape]=(shapeCounts[data.shape]||0)+1;totalVolume+=data.volume;});return {blocks:blocks.map(p=>({...p})),count:blocks.length,isComplete:true,L:extent('x'),W:extent('z'),H:extent('y'),totalVolume,shapeCounts};}
  engine.measureStructure=(x,y,z,retained)=>{const cells=retained||Object.values(groups).find(list=>list.some(p=>p.x===x&&p.y===y&&p.z===z))||[];const result=measurement(cells);return result&&{...result,isComplete:!engine.incomplete};};
  engine.blockUnderCrosshair=()=>({object:engine.blocks[key(groups[engine.aimed][0])],face:{normal:new THREE.Vector3(0,1,0)}});window.__geoWorldEngine=engine;return {engine,groups,measurement};
}
function worldState(engine){return {blocks:Object.entries(engine.blocks).map(([cell,mesh])=>({cell,mesh,geometry:mesh.geometry,material:mesh.material,vertices:Array.from(mesh.geometry.attributes.position.array),position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray()})),undo:JSON.stringify(engine._undoStack),redo:JSON.stringify(engine._redoStack),camera:[engine.camera.position.toArray(),engine.camera.quaternion.toArray()],placed:engine.blocksPlaced};}
function mount({retained='a',fallback=null,incomplete=false}={}){
  const base=fixtureEngine(),{engine,groups,measurement}=base;engine.incomplete=incomplete;engine._builderSelection=retained?{blocks:retained==='missing'?[{x:60,y:60,z:60}]:groups[retained].map(p=>({...p}))}:null;
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host),navigate=vi.fn();let current,patch,ctx,revision=0;
  function Host(){
    const [toolData,setToolData]=React.useState({geometryWorld:{activeLesson:'builderSandbox',worldActive:true,sandboxDockCollapsed:false,builderPanel:'build',selectedBlock:0,selectedShape:0,blockRotation:0,builderPrintContext:{unitMm:12.5,aiUse:'NONE'},measureResult:fallback?measurement(groups[fallback]):null}});current=toolData.geometryWorld;patch=values=>setToolData(old=>({...old,geometryWorld:{...old.geometryWorld,...values}}));
    ctx={React,toolData,updateMulti:(tool,values)=>setToolData(old=>({...old,[tool]:{...old[tool],...values}})),update:(tool,name,value)=>setToolData(old=>({...old,[tool]:{...old[tool],[name]:value}})),setStemLabTool:navigate,addToast:vi.fn(),announceToSR:vi.fn()};return window.StemLab._registry.geometryWorld.render(ctx);
  }
  React.act(()=>root.render(React.createElement(Host)));mounted={root,host};
  return {...base,host,navigate,state:()=>current,ctx:()=>ctx,patch:values=>React.act(()=>patch(values)),button:text=>Array.from(host.querySelectorAll('button')).find(button=>button.textContent===text),click:node=>React.act(()=>node.click()),hero:()=>host.querySelector('.gwe-creation-summary[data-selected=true]'),input:()=>host.querySelector('.gwe-scale-editor input'),
    select(name,fallbackName){React.act(()=>{engine._builderSelection=name?{blocks:groups[name].map(p=>({...p}))}:null;const values={testRenderRevision:++revision};if(fallbackName!==undefined)values.measureResult=fallbackName?measurement(groups[fallbackName]):null;patch(values);});},
    draft(value){React.act(()=>{const input=host.querySelector('.gwe-scale-editor input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});}};
}
function precedes(a,b){expect(a).toBeTruthy();expect(b).toBeTruthy();expect(!!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);}
const SCOPE='Showcase and Print Lab use these blocks.';

describe('selected creation takes priority without conflating measurements or placement totals',()=>{
  it.each(['b','ground'])('describes retained A while the separate inspector contains %s',fallback=>{
    const app=mount({retained:'a',fallback}),hero=app.hero(),before=worldState(app.engine),originalMeasurement=app.state().measureResult;
    expect(hero).toBeTruthy();expect(hero.textContent).toContain('Selected creation');expect(hero.textContent).toContain('Outlined selection');expect(hero.textContent).toContain('Blocks selected');expect(hero.textContent).toContain('Block bounds');expect(hero.textContent).toContain(SCOPE);expect(hero.textContent).not.toContain('Placed');
    expect(Array.from(hero.querySelectorAll('.gwe-metric strong')).map(el=>el.textContent)).toEqual(['2','2×1×1']);expect(hero.querySelectorAll('.gwe-metric')).toHaveLength(2);
    const tools=app.host.querySelector('.gwe-current-tools');precedes(hero,tools);precedes(app.host.querySelector('[aria-label="Inspect selected creation"]'),tools);precedes(app.host.querySelector('.gwe-print-ready'),tools);precedes(app.host.querySelector('.gwe-connection-check'),tools);
    expect(app.host.querySelector('[aria-label="Select and measure aimed build"]').textContent).toBe('Select another build');expect(app.state().measureResult).toBe(originalMeasurement);expect(worldState(app.engine)).toEqual(before);
    expect(app.host.querySelector('.gwe-print-dimensions').textContent).toContain('25 × 12.5 × 12.5 mm');
  });
  it.each([{retained:null,fallback:'a'},{retained:null,fallback:'ground'},{retained:'missing',fallback:'a'},{retained:'a',fallback:'b',incomplete:true}])('keeps the default hierarchy and avoids a retained-scope claim for %j',options=>{
    const app=mount(options);expect(app.hero()).toBeNull();expect(app.host.textContent).not.toContain(SCOPE);expect(app.host.textContent).not.toContain('Outlined selection');
    const summary=app.host.querySelector('[aria-label="Build summary"]');expect(summary.querySelectorAll('.gwe-metric')).toHaveLength(3);expect(summary.textContent).toContain('47Placed');precedes(app.host.querySelector('.gwe-current-tools'),summary);expect(app.host.querySelector('[aria-label="Select and measure aimed build"]').textContent).toBe('Select build');
  });
  it('Clear selection restores ordinary building order and controls without editing either creation',()=>{
    const app=mount(),before=worldState(app.engine);app.click(app.button('Clear selection'));expect(app.engine._builderSelection).toBeNull();expect(app.state().measureResult).toBeNull();expect(app.hero()).toBeNull();expect(app.host.textContent).not.toContain(SCOPE);precedes(app.host.querySelector('.gwe-current-tools'),app.host.querySelector('[aria-label="Build summary"]'));expect(app.host.querySelector('[aria-label="Build summary"]').querySelectorAll('.gwe-metric')).toHaveLength(3);expect(app.host.querySelector('[aria-label="Select and measure aimed build"]').textContent).toBe('Select build');expect(worldState(app.engine)).toEqual(before);
  });
});

describe('selection changes keep useful editing state and export the displayed creation',()=>{
  it('keeps the scale draft, focus and input node through another retained selection and an unrelated render',()=>{
    const app=mount(),input=app.input(),form=input.closest('form'),details=form.closest('details'),before=worldState(app.engine);
    React.act(()=>{details.querySelector('summary').click();vi.advanceTimersByTime(1);});input.focus();app.draft('7.25');app.select('b');expect(app.input()).toBe(input);expect(app.input().closest('form')).toBe(form);expect(input.value).toBe('7.25');expect(document.activeElement).toBe(input);expect(details.open).toBe(true);expect(app.state().builderPrintContext.unitMm).toBe(12.5);expect(app.hero().textContent).toContain('3');
    app.patch({selectedBlock:2,blockRotation:1});expect(app.input()).toBe(input);expect(input.value).toBe('7.25');expect(document.activeElement).toBe(input);expect(worldState(app.engine)).toEqual(before);
  });
  it('retains the keyed scale form while changing between retained and fallback-only printable measurements',()=>{
    const app=mount(),input=app.input(),details=input.closest('details');React.act(()=>{details.querySelector('summary').click();vi.advanceTimersByTime(1);});input.focus();app.draft('8.5');app.select(null,'a');expect(app.hero()).toBeNull();expect(app.input()).toBe(input);expect(input.value).toBe('8.5');expect(document.activeElement).toBe(input);
    app.select('b','a');expect(app.hero()).toBeTruthy();expect(app.input()).toBe(input);expect(input.value).toBe('8.5');expect(document.activeElement).toBe(input);expect(details.open).toBe(true);
  });
  it('Select another build uses the existing action and the hero agrees with the exact selected STL handoff',()=>{
    const app=mount({fallback:'ground'}),before=worldState(app.engine),rawA=new Uint8Array(api.buildGeometryWorldStl(app.engine,app.groups.a).buffer),rawB=new Uint8Array(api.buildGeometryWorldStl(app.engine,app.groups.b).buffer);app.engine.aimed='b';
    app.click(app.host.querySelector('[aria-label="Select and measure aimed build"]'));expect(app.engine._builderSelection.blocks).toEqual(app.groups.b);expect(Array.from(app.hero().querySelectorAll('.gwe-metric strong')).map(el=>el.textContent)).toEqual(['3','2×1×2']);expect(worldState(app.engine)).toEqual(before);
    expect(new Uint8Array(api.buildGeometryWorldStl(app.engine,app.groups.a).buffer)).toEqual(rawA);expect(new Uint8Array(api.buildGeometryWorldStl(app.engine,app.groups.b).buffer)).toEqual(rawB);
    app.click(app.host.querySelector('[aria-label="Send selected build to Print Lab"]'));const handoff=window.__alloPrintLabPendingHandoff;expect(app.navigate).toHaveBeenCalledWith('printLab');expect(handoff.bytes).toEqual(rawB);expect(handoff.sourceModel.blocks).toHaveLength(3);expect(handoff.sourceModel.blocks.every(block=>block.type==='wood')).toBe(true);expect(handoff.unitMm).toBe(12.5);expect(worldState(app.engine)).toEqual(before);
  });
});
