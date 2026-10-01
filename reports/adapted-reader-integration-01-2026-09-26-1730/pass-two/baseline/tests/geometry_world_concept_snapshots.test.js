import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const source=readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8');
const image='data:image/jpeg;base64,/9j/AA==';
const lesson=(title='Unit cube laboratory')=>({title,structures:[{x:0,y:1,z:0,w:3,h:2,d:2}],npcs:[]});
let api,mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
beforeEach(()=>{
  vi.useFakeTimers();const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){const h=ctx.React.createElement,d=ctx.toolData.geometryWorld;return h('main',{id:'geoworld-fs-workspace'},h('div',{id:'geoworld-fs-wrap',tabIndex:0},'Live world'),d.showGameSettings && h('div',{className:'gw-settings-backdrop'},h('section',{role:'dialog','aria-label':'World menu'},h('button',{onClick:()=>window.__geoWorldEngine.openConceptSnapshots()},'Concept snapshots'))));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(source)();api=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}delete window.__geoWorldEngine;delete window.THREE;vi.unstubAllGlobals();vi.restoreAllMocks();vi.clearAllTimers();vi.useRealTimers();});
function moment(world,extra={}){return {id:'first',lessonKey:api.conceptLessonModel(world).key,capturedAt:'2026-09-19T16:00:00Z',caption:'Three equal layers',reasoning:'3 × 8 = 24 cubic units',image,...extra};}
function progress(world,items){return {[api.conceptLessonModel(world).key]:{moments:items,notes:{existing:'Keep my notes'}}};}

describe('Lesson-scoped concept snapshot records',()=>{
  it('works without activities and separates geometry and question identities',()=>{
    const one=lesson(),two=lesson('Second world'),saved=progress(one,[moment(one)]);
    expect(api.lessonConceptSnapshots(one,saved)).toHaveLength(1);expect(api.lessonConceptSnapshots(two,saved)).toEqual([]);
    expect(api.conceptLessonModel({...one,structures:[{x:9,y:0,z:0}]}).key).not.toBe(api.conceptLessonModel(one).key);
  });
  it('keeps existing journal notes and scopes concept moments to complete lesson content',()=>{
    const world={...lesson(),activities:[{title:'Count layers',challenge:'Build and count'}]};
    expect(api.conceptLessonModel(world).key).not.toBe(api.activityGuideModel(world).key);
    expect(api.conceptLessonModel({...world,npcs:[{question:'Find the volume.'}]}).key).not.toBe(api.conceptLessonModel({...world,npcs:[{question:'Find the height.'}]}).key);
    const initial=progress(world,[]),result=api.updateConceptSnapshots(initial,world,[moment(world)]);
    expect(result.ok).toBe(true);expect(result.value[api.conceptLessonModel(world).key].notes.existing).toBe('Keep my notes');expect(initial[api.conceptLessonModel(world).key].moments).toEqual([]);
  });
  it('rejects foreign lessons, remote images and executable images, bounds user text',()=>{
    const world=lesson();for(const value of ['https://example.com/picture.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/jpeg;base64,abc\" onerror=alert(1)','data:image/png;base64,'+'A'.repeat(240000)])expect(api.updateConceptSnapshots({},world,[moment(world,{image:value})]).ok).toBe(false);
    expect(api.updateConceptSnapshots({},world,[moment(lesson('Other'))]).ok).toBe(false);
    const value=api.lessonConceptSnapshots(world,progress(world,[moment(world,{caption:'x'.repeat(400),reasoning:'y'.repeat(5000)})]))[0];expect(value.caption).toHaveLength(240);expect(value.reasoning).toHaveLength(3000);
  });
  it('enforces per-lesson and total image budgets atomically while deletion frees capacity',()=>{
    const world=lesson(),items=Array.from({length:7},(_,i)=>moment(world,{id:String(i)}));expect(api.updateConceptSnapshots({},world,items).ok).toBe(false);
    const large='data:image/jpeg;base64,'+'A'.repeat(239972),other=lesson('Older'),initial={...progress(world,[moment(world,{image:large})]),...progress(other,Array.from({length:6},(_,i)=>moment(other,{id:String(i),image:large})))};
    const original=JSON.stringify(initial),result=api.updateConceptSnapshots(initial,world,[moment(world,{image:large}),moment(world,{id:'second',image:large})]);expect(result.ok).toBe(false);expect(JSON.stringify(initial)).toBe(original);
    const cleared=api.updateConceptSnapshots(initial,other,[]);expect(cleared.ok).toBe(true);expect(api.updateConceptSnapshots(cleared.value,world,[moment(world,{image:large}),moment(world,{id:'second',image:large})]).ok).toBe(true);
  });
  it('exports escaped images and reasoning with blank handwritten calculation space',()=>{
    const world=lesson('<script>title</script>'),saved=progress(world,[moment(world,{caption:'<img onerror="bad()">',reasoning:'4 × 3 = 12\nExplain <script>why</script>',selection:{blockCount:3,occupiedVolume:2,footprintArea:3,width:3,depth:1,height:1,unitCubesOnly:false}})]);
    const html=api.conceptSnapshotsHtml(world,saved);expect(html).not.toContain('<script>');expect(html).not.toContain('<img onerror');expect(html).toContain('&lt;img onerror=');expect(html).toContain(image);expect(html).toContain('My mathematical reasoning and calculations');expect(html).toContain('min-height:28mm');expect(html).toContain('not necessarily a filled rectangular prism');expect(html).toContain('Toolbar text');expect(html).not.toMatch(/https?:/);
  });
  it('rejects invalid derived selection facts without rejecting the real image',()=>{
    const world=lesson(),value=api.lessonConceptSnapshots(world,progress(world,[moment(world,{selection:{occupiedVolume:'<img>'}})]))[0];expect(value.selection).toBeNull();expect(value.image).toBe(image);
  });
});

class Vector{constructor(){this.x=640;this.y=360;}set(x,y){this.x=x;this.y=y;return this;}}
class Color{clone(){return this;}}
function fixtureEngine(){
  let encode;const canvas={toBlob:vi.fn(cb=>{encode=cb;})};
  const renderer={domElement:canvas,capabilities:{maxTextureSize:4096},getSize:v=>v.set(640,360),getPixelRatio:()=>1,getRenderTarget:()=>null,getViewport:v=>v,getScissor:v=>v,getScissorTest:()=>false,getClearColor:()=>new Color(),getClearAlpha:()=>1,setSize:vi.fn(),setPixelRatio:vi.fn(),setRenderTarget:vi.fn(),setScissorTest:vi.fn(),setViewport:vi.fn(),setScissor:vi.fn(),setClearColor:vi.fn(),render:vi.fn()};
  const engine={renderer,scene:{concept:'three equal layers'},camera:{position:[3,4,5]},_currentLesson:lesson(),blocks:{},_undoStack:[{place:1}],releaseInput:vi.fn()};
  window.THREE={Vector2:Vector,Vector4:Vector,Color};vi.stubGlobal('FileReader',class{readAsDataURL(){this.result=image;this.onload();}abort(){this.onabort?.();}});
  return {engine,encode:()=>encode(new Blob(['pixels'],{type:'image/jpeg'}))};
}
function mount(){
  const fixture=fixtureEngine();window.__geoWorldEngine=fixture.engine;const host=document.createElement('div');document.body.appendChild(host);let state,patch;
  function Host(){const [data,setData]=React.useState({geometryWorld:{activeLesson:'demo',worldActive:true,score:2}});state=data.geometryWorld;patch=values=>setData(old=>({...old,geometryWorld:{...old.geometryWorld,...values}}));return window.StemLab._registry.geometryWorld.render({React,toolData:data,updateMulti:(tool,values)=>setData(old=>({...old,[tool]:{...old[tool],...values}})),addToast:vi.fn(),announceToSR:vi.fn()});}
  const root=ReactDOMClient.createRoot(host);React.act(()=>root.render(React.createElement(Host)));mounted={root,host};
  return {...fixture,host,state:()=>state,patch:values=>React.act(()=>patch(values)),button:label=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent===label),click:button=>React.act(()=>button.click()),open:()=>React.act(()=>fixture.engine.openConceptSnapshots())};
}
async function completeCapture(app){await React.act(async()=>{app.encode();await Promise.resolve();await Promise.resolve();});}
function inputValue(node,value){const setter=Object.getOwnPropertyDescriptor(node.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;React.act(()=>{setter.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));});}

describe('Concept snapshots in the active world',()=>{
  it('closes the world menu and other competing panels before opening concept snapshots',()=>{
    const app=mount();app.patch({showGameSettings:true,objectivesOpen:true,showPredictionPanel:true,showHelp:true,hudPanel:'measure'});
    expect(app.host.querySelector('.gw-settings-backdrop [role=dialog]')).toBeTruthy();app.click(app.button('Concept snapshots'));
    expect(app.state()).toMatchObject({showGameSettings:false,objectivesOpen:false,showPredictionPanel:false,showHelp:false,hudPanel:''});
    expect(app.host.querySelector('.gw-settings-backdrop')).toBeNull();expect(app.host.querySelectorAll('[role=dialog]')).toHaveLength(1);expect(app.host.querySelector('[role=dialog]').getAttribute('aria-labelledby')).toBe('gwe-concept-title');expect(app.button('Capture current view').disabled).toBe(false);
  });

  it('captures the real renderer and current camera, permits manual reasoning, and preserves the world and score',async()=>{
    const app=mount(),before=JSON.stringify([app.engine.blocks,app.engine._undoStack,app.engine.camera]);app.open();expect(app.host.querySelector('[role=dialog]').getAttribute('aria-labelledby')).toBe('gwe-concept-title');app.click(app.button('Capture current view'));expect(app.engine.renderer.render).toHaveBeenCalledWith(app.engine.scene,app.engine.camera);expect(app.engine.renderer.domElement.toBlob).toHaveBeenCalledWith(expect.any(Function),'image/jpeg',.84);
    app.click(app.button('Capturing…'));expect(app.engine.renderer.domElement.toBlob).toHaveBeenCalledTimes(1);await completeCapture(app);
    expect(app.host.querySelector('.gwe-concept-card img').src).toBe(image);inputValue(app.host.querySelector('.gwe-concept-card input'),'Two layers of six');inputValue(app.host.querySelector('.gwe-concept-card textarea'),'6 + 6 = 12 cubic units.');
    const saved=api.lessonConceptSnapshots(app.engine._currentLesson,app.state().lessonActivityProgress);expect(saved[0]).toMatchObject({caption:'Two layers of six',reasoning:'6 + 6 = 12 cubic units.'});expect(app.state().score).toBe(2);expect(JSON.stringify([app.engine.blocks,app.engine._undoStack,app.engine.camera])).toBe(before);
  });
  it('discards an in-flight image when the world changes and hides prior saved moments',async()=>{
    const app=mount();app.open();app.click(app.button('Capture current view'));app.engine._currentLesson=lesson('New world');app.patch({activeLesson:'new'});await completeCapture(app);expect(app.state().lessonActivityProgress).toBeUndefined();app.open();expect(app.host.textContent).toContain('0 of 6 moments saved for New world');
  });
  it('roundtrips saved moments through state JSON, deletes only the chosen snapshot, and exports an offline record',async()=>{
    const app=mount();app.open();app.click(app.button('Capture current view'));await completeCapture(app);const stored=JSON.parse(JSON.stringify(app.state().lessonActivityProgress));app.patch({lessonActivityProgress:stored});expect(app.host.querySelectorAll('.gwe-concept-card')).toHaveLength(1);
    const downloads=[];vi.stubGlobal('URL',{createObjectURL:blob=>{downloads.push(blob);return 'blob:local-record';},revokeObjectURL:vi.fn()});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});app.click(app.button('Download printable snapshots'));expect(downloads[0].type).toBe('text/html;charset=utf-8');expect(downloads[0].size).toBeGreaterThan(500);
    app.click(app.button('Remove moment'));expect(api.lessonConceptSnapshots(app.engine._currentLesson,app.state().lessonActivityProgress)).toEqual([]);expect(app.state().score).toBe(2);expect(app.host.textContent).toContain('Snapshot removed');
  });
});
