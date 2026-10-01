import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;
let host,root,config,state,setData,setProfile,contexts,images,observers;
const canvas=()=>host.querySelector('#symmetryCanvas');
const png=value=>'data:image/png;base64,'+Buffer.from(JSON.stringify(value)).toString('base64');
const parse=url=>JSON.parse(Buffer.from(url.split(',')[1],'base64').toString());
const event=(id,x,y,options={})=>({pointerId:id,clientX:x,clientY:y,button:0,pointerType:'mouse',preventDefault(){},...options});
const key=async(key,options={})=>act(async()=>canvas().dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options})));
const click=async selector=>{const button=host.querySelector(selector);expect(button).toBeTruthy();expect(button.disabled).toBe(false);await act(async()=>button.click());};
const pointer=async(name,data)=>act(async()=>canvas()[name](data));
function contextFor(node){
 if(!contexts.has(node)){
  const context={canvas:node,mark:'blank',setTransform:vi.fn(),clearRect(){this.mark='blank';},fillRect(){this.mark+='|paper:'+this.fillStyle;},fill(){this.mark+='|dab:'+this.fillStyle;},stroke:vi.fn(function(){this.mark+='|line:'+this.lineWidth;}),lineTo:vi.fn(),moveTo:vi.fn(),getImageData:vi.fn(function(x,y,width,height){return {width,height,data:new Uint8ClampedArray(4),mark:this.mark};}),putImageData(image){this.mark=image.mark;},drawImage(image){this.mark=image.src?parse(image.src).mark:contextFor(image).mark;}};
  contexts.set(node,new Proxy(context,{get:(target,key)=>key in target?target[key]:()=>{}}));
 }return contexts.get(node);
}
async function mount(initial={}){
 function App(){const [data,updateData]=React.useState({artStudio:{tab:'symmetry',studioStarted:true,studioHome:false,symBrushMode:'solid',symBackgroundMode:'transparent',symmetryFolds:2,...initial}}),[profile,updateProfile]=React.useState('a');state=data.artStudio;setData=updateData;setProfile=updateProfile;return config.render(makeCtx({toolData:data,setToolData:updateData,activeProfileId:profile}));}
 await act(async()=>root.render(React.createElement(App)));
}
beforeEach(()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;resetStemLab();contexts=new WeakMap();images=[];observers=[];
 vi.stubGlobal('indexedDB',undefined);vi.stubGlobal('ResizeObserver',class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){}});
 vi.stubGlobal('Image',class{set src(value){this._src=value;images.push(this);}get src(){return this._src;}});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){return contextFor(this);});
 vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockImplementation(function(){return png({width:this.width,height:this.height,mark:contextFor(this).mark});});
 config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();delete globalThis.IS_REACT_ACT_ENVIRONMENT;});
describe('Symmetry workspace and uninterrupted drawing',()=>{
 it('uses a 1024 backing store while keeping 512-unit geometry, keyboard positions, and full-resolution history',async()=>{
  await mount();expect(canvas().width).toBe(1024);expect(canvas().height).toBe(1024);expect(contextFor(canvas()).setTransform).toHaveBeenCalledWith(2,0,0,2,0,0);
  await key('ArrowRight',{altKey:true});expect(canvas()._symmetryKeyboardCursor).toEqual({x:257,y:256});await key('Enter');expect(contextFor(canvas()).getImageData).toHaveBeenCalledWith(0,0,1024,1024);expect(parse(state.symmetrySnapshot).width).toBe(1024);
 });
 it('keeps provisional lines out of saved captures and clean exports and cancels them with Escape',async()=>{
  await mount({symStrokeMode:'line'});const before=canvas().toDataURL();await pointer('onpointerdown',event(1,100,120));await pointer('onpointermove',event(1,220,240));expect(canvas().toDataURL()).not.toBe(before);
  expect(canvas()._captureArtStudioState().symmetrySnapshot).toBe(before);expect(canvas()._symExportAction()).toBe(before);expect(canvas()._symUndo).toEqual([]);
  await key('Escape');expect(parse(canvas().toDataURL())).toEqual(parse(before));expect(canvas()._symDrawing).toBe(false);expect(host.querySelector('#artstudio-sym-undo').disabled).toBe(true);
 });
 it('ignores unrelated pointers and commits exactly one line from the owning release',async()=>{
  await mount({symStrokeMode:'line'});await pointer('onpointerdown',event(11,100,100));const initial=canvas().toDataURL();await pointer('onpointerdown',event(12,400,400));await pointer('onpointermove',event(12,450,450));await pointer('onpointerup',event(12,450,450));expect(canvas().toDataURL()).toBe(initial);expect(canvas()._symDrawing).toBe(true);
  await pointer('onpointermove',event(11,200,200));await pointer('onpointerup',event(11,240,240));expect(canvas()._symDrawing).toBe(false);expect(canvas()._symUndo).toHaveLength(1);expect(contextFor(canvas()).lineTo.mock.calls.at(-2)).toEqual([240,240]);expect(state.symmetrySnapshot).toBe(canvas().toDataURL());expect(parse(state.symmetrySnapshot).mark).toContain('|line:');
 });
 it('consumes the dispatched endpoint after coalesced samples and flushes stabilized strokes to the release',async()=>{
  await mount({symStrokeMode:'freehand',symSmoothing:.5});await pointer('onpointerdown',event(1,100,100));await pointer('onpointermove',event(1,180,180,{getCoalescedEvents:()=>[event(1,120,120),event(1,140,140)]}));const points=contextFor(canvas()).lineTo.mock.calls;expect(points.at(-2)[0]).toBe(152.5);await pointer('onpointerup',event(1,220,220));expect(contextFor(canvas()).lineTo.mock.calls.at(-2)).toEqual([220,220]);expect(canvas()._symUndo).toHaveLength(1);
 });
 it('retains interrupted freehand paint as one recoverable gesture and ignores capture loss from another pointer',async()=>{
  await mount({symStrokeMode:'freehand'});const before=canvas().toDataURL();await pointer('onpointerdown',event(1,100,100));await pointer('onpointermove',event(1,200,200));const painted=canvas().toDataURL();await pointer('onlostpointercapture',event(2,300,300));expect(canvas()._symDrawing).toBe(true);await pointer('onlostpointercapture',event(1,300,300));expect(canvas().toDataURL()).toBe(painted);expect(canvas()._symUndo).toHaveLength(1);await click('#artstudio-sym-undo');expect(parse(canvas().toDataURL())).toEqual(parse(before));await click('#artstudio-sym-redo');expect(canvas().toDataURL()).toBe(painted);
 });
 it('keeps release pressure at the last valid pen load rather than widening a lifted stroke',async()=>{
  await mount({symStrokeMode:'freehand',symPressureEnabled:true,brushSize:4});await pointer('onpointerdown',event(1,100,100,{pointerType:'pen',pressure:.8}));await pointer('onpointerup',event(1,200,200,{pointerType:'pen',pressure:0}));expect(contextFor(canvas()).lineWidth).toBeCloseTo(10.16);expect(canvas()._symUndo).toHaveLength(1);
 });
 it('matches Undo/Redo button states to history and lets keyboard Undo cancel a preview before undoing committed paint',async()=>{
  await mount({symStrokeMode:'line'});expect(host.querySelector('#artstudio-sym-undo').disabled).toBe(true);expect(host.querySelector('#artstudio-sym-redo').disabled).toBe(true);const blank=canvas().toDataURL();await key('Enter');expect(host.querySelector('#artstudio-sym-undo').disabled).toBe(false);
  await pointer('onpointerdown',event(1,100,100));await pointer('onpointermove',event(1,200,200));expect(host.querySelector('#artstudio-sym-undo').disabled).toBe(true);await key('z',{ctrlKey:true});expect(canvas().toDataURL()).toBe(blank);expect(host.querySelector('#artstudio-sym-redo').disabled).toBe(false);await click('#artstudio-sym-redo');expect(parse(canvas().toDataURL())).not.toEqual(parse(blank));
 });
 it('cancels a line on pattern changes without remounting the canvas or creating an artwork history step',async()=>{
  await mount({symStrokeMode:'line'});const node=canvas(),before=node.toDataURL();await pointer('onpointerdown',event(1,100,100));await pointer('onpointermove',event(1,200,200));await click('button[aria-label="Kaleidoscope reflected symmetry pattern"]');expect(canvas()).toBe(node);expect(parse(canvas().toDataURL())).toEqual(parse(before));expect(canvas()._symDrawing).toBe(false);expect(canvas()._symUndo).toEqual([]);expect(state.symPatternMode).toBe('kaleidoscope');
 });
 it('clears a partial freehand gesture without letting its later pointer-up redraw old paint',async()=>{
  await mount({symStrokeMode:'freehand'});const blank=canvas().toDataURL();await pointer('onpointerdown',event(1,100,100));await pointer('onpointermove',event(1,200,200));const partial=canvas().toDataURL();const clear=[...host.querySelectorAll('.symmetry-actions button')].find(button=>button.textContent.includes('Clear'));await act(async()=>clear.click());expect(canvas().toDataURL()).toBe(blank);await pointer('onpointerup',event(1,400,400));expect(canvas().toDataURL()).toBe(blank);await click('#artstudio-sym-undo');expect(parse(canvas().toDataURL())).toEqual(parse(partial));await click('#artstudio-sym-undo');expect(canvas().toDataURL()).toBe(blank);
 });
 it('changes display size without replacing the backing canvas, pixels, or history',async()=>{
  await mount();await key('Enter');const node=canvas(),paint=node.toDataURL(),undo=node._symUndo.length,paper=host.querySelector('#symmetryCanvasContainer'),workspace=host.querySelector('#symmetryFullscreenWorkspace');
  Object.defineProperty(paper,'clientWidth',{configurable:true,value:700});Object.defineProperty(paper,'clientHeight',{configurable:true,value:600});Object.defineProperty(workspace,'clientWidth',{configurable:true,value:1200});await act(async()=>observers.at(-1).callback());expect(workspace.dataset.symmetryWide).toBe('true');expect(canvas()).toBe(node);expect(node.width).toBe(1024);expect(node.style.width).toBe('576px');expect(node.toDataURL()).toBe(paint);expect(node._symUndo).toHaveLength(undo);
 });
 it('restores a historical 512px snapshot into the same logical geometry and blocks drawing during its decode',async()=>{
  const old=png({width:512,height:512,mark:'historical'});await mount({symmetrySnapshot:old});const node=canvas();expect(node._symRestoring).toBe(true);await pointer('onpointerdown',event(1,100,100));expect(node._symDrawing).toBe(false);await act(async()=>images.at(-1).onload());expect(contextFor(node).mark).toBe('historical');expect(parse(node._captureArtStudioState().symmetrySnapshot)).toEqual({width:1024,height:1024,mark:'historical'});expect(node._symUndo).toEqual([]);
 });
 it('rejects older image decodes after a same-lab study fork and retains only the newest artwork',async()=>{
  await mount({symmetrySnapshot:png({mark:'old'})});const old=images.at(-1);await act(async()=>setData(data=>({artStudio:{...data.artStudio,symmetryRestoreToken:'new-study',symmetrySnapshot:png({mark:'new'})}})));const next=images.at(-1);await act(async()=>old.onload());expect(contextFor(canvas()).mark).toBe('blank');await act(async()=>next.onload());expect(contextFor(canvas()).mark).toBe('new');expect(canvas()._symUndo).toEqual([]);
 });
 it('invalidates pending restores and history across changing away and returning to the same learner',async()=>{
  await mount({symmetrySnapshot:png({mark:'a-old'})});const old=images.at(-1),generation=canvas()._symRestoreGeneration;await act(async()=>setProfile('b'));await act(async()=>setProfile('a'));expect(canvas()._symRestoreGeneration).toBeGreaterThan(generation);const latest=images.at(-1);await act(async()=>old.onload());expect(contextFor(canvas()).mark).toBe('blank');if(canvas()._symRestoring)await act(async()=>latest.onload());expect(canvas()._symUndo).toEqual([]);
 });
 it('cancels a queued export when Clear invalidates an unfinished image restore',async()=>{
  await mount({symmetrySnapshot:png({mark:'late'})});const old=images.at(-1),exported=canvas()._symExportAction();await act(async()=>canvas()._symClearAction());expect(await exported).toBe('');await act(async()=>old.onload());expect(contextFor(canvas()).mark).toBe('blank');expect(canvas()._symUndo).toEqual([]);
 });
 it('handles an unavailable drawing context without starting pointer gestures',async()=>{
  HTMLCanvasElement.prototype.getContext.mockReturnValue(null);await mount();expect(canvas().onpointerdown).toBeFalsy();expect(host.querySelector('#artstudio-sym-undo').disabled).toBe(true);
 });
});
