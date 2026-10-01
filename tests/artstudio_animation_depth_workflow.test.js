import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;
let host,root,config,state,setData,setProfile,contexts,images,holdImages,marks,markIds,toast;
const canvas=()=>host.querySelector('#stereoAnimDrawCanvas');
const png=value=>'data:image/png;base64,'+Buffer.from(JSON.stringify(value)).toString('base64');
const parse=url=>JSON.parse(Buffer.from(url.split(',')[1],'base64').toString());
const event=(id,x,y,extra={})=>({pointerId:id,clientX:x,clientY:y,button:0,pointerType:'mouse',preventDefault(){},...extra});
const pointer=async(name,data)=>act(async()=>canvas()[name](data));
const key=async(key,extra={})=>act(async()=>canvas().dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra})));
const button=label=>[...host.querySelectorAll('button')].find(node=>node.getAttribute('aria-label')===label || node.textContent.trim()===label);
const click=async label=>{const node=button(label);expect(node).toBeTruthy();expect(node.disabled).toBe(false);await act(async()=>node.click());};
const undo=()=>click('Undo edit'),redo=()=>click('Redo edit');
function contextFor(node){
 if(!contexts.has(node)){
  const context={mark:'blank',arc:vi.fn(function(...args){this.arcPoint=args;}),moveTo:vi.fn(function(...args){this.start=args;}),lineTo:vi.fn(function(...args){this.end=args;}),
   fill(){this.mark+='|dab:'+this.fillStyle+':'+this.arcPoint.slice(0,3);},stroke(){this.mark+='|line:'+this.strokeStyle+':'+this.start+':'+this.end;},fillRect(){this.mark='blank';},
   createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
   getImageData(x,y,w,h){if(!markIds.has(this.mark)){const id=markIds.size+1;markIds.set(this.mark,id);marks.set(id,this.mark);}const data=new Uint8ClampedArray(w*h*4);for(let i=0;i<data.length;i+=4){data[i]=markIds.get(this.mark);data[i+3]=255;}return {width:w,height:h,data};},
   putImageData(image){this.mark=marks.get(image.data[0])||'legacy:'+image.data[0];},drawImage(image){this.mark=image.src?parse(image.src).mark:contextFor(image).mark;}};
  contexts.set(node,new Proxy(context,{get:(target,key)=>key in target?target[key]:()=>{}}));
 }return contexts.get(node);
}
async function mount(initial={}){
 function App(){const [data,updateData]=React.useState({artStudio:{tab:'stereogram',studioStarted:true,studioHome:false,stereoAnimMode:'animate',stereoAnimSource:'draw',...initial}}),[profile,updateProfile]=React.useState('a');state=data.artStudio;setData=updateData;setProfile=updateProfile;return config.render(makeCtx({toolData:data,setToolData:updateData,activeProfileId:profile,addToast:toast}));}
 await act(async()=>root.render(React.createElement(App)));
}
beforeEach(()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;resetStemLab();contexts=new WeakMap();images=[];holdImages=false;marks=new Map();markIds=new Map();toast=vi.fn();
 vi.stubGlobal('indexedDB',undefined);vi.stubGlobal('Image',class{set src(value){this._src=value;images.push(this);if(!holdImages)queueMicrotask(()=>this.onload&&this.onload());}get src(){return this._src;}});
 vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){return contextFor(this);});
 vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockImplementation(function(){return png({width:this.width,height:this.height,mark:contextFor(this).mark});});
 config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();delete globalThis.IS_REACT_ACT_ENVIRONMENT;});
describe('Animation depth drawing and editable keyframes',()=>{
 it('joins coalesced samples and the actual release in one gesture and recovers exact pixels with actual Undo/Redo buttons',async()=>{
  await mount();const blank=canvas().toDataURL();expect(button('Undo edit').disabled).toBe(true);await pointer('onpointerdown',event(1,100,100));await pointer('onpointermove',event(1,180,180,{getCoalescedEvents:()=>[event(1,120,120),event(1,140,140)]}));await pointer('onpointerup',event(1,220,230));expect(contextFor(canvas()).lineTo.mock.calls).toEqual([[120,120],[140,140],[180,180],[220,230]]);const drawn=canvas().toDataURL();expect(state.stereoAnimDepthSnapshot).toBe(drawn);await undo();expect(canvas().toDataURL()).toBe(blank);expect(button('Undo edit').disabled).toBe(true);await redo();expect(canvas().toDataURL()).toBe(drawn);
 });
 it('ignores foreign pointers and retains interrupted paint as one history step',async()=>{
  await mount();const blank=canvas().toDataURL();await pointer('onpointerdown',event(11,100,100));await pointer('onpointermove',event(11,200,200));const partial=canvas().toDataURL();await pointer('onpointerup',event(12,300,300));await pointer('onlostpointercapture',event(12,300,300));expect(canvas()._adStroke.id).toBe(11);await pointer('onlostpointercapture',event(11,300,300));expect(canvas().toDataURL()).toBe(partial);await undo();expect(canvas().toDataURL()).toBe(blank);await redo();expect(canvas().toDataURL()).toBe(partial);
 });
 it('makes Clear recoverable and rejects a late pointer-up after clearing an unfinished stroke',async()=>{
  await mount();const blank=canvas().toDataURL();await pointer('onpointerdown',event(1,100,100));await pointer('onpointermove',event(1,200,200));const partial=canvas().toDataURL();await click('Clear Canvas');await pointer('onpointerup',event(1,350,350));expect(canvas().toDataURL()).toBe(blank);await undo();expect(canvas().toDataURL()).toBe(partial);await undo();expect(canvas().toDataURL()).toBe(blank);
 });
 it('captures independent typed keyframes and undoes frame capture without losing the drawing',async()=>{
  await mount();await key('Enter');const drawing=canvas().toDataURL();await click('Capture Keyframe');const frame=state.stereoAnimKeyframes[0];expect(frame).toMatchObject({width:400,height:400});expect(frame.data).toBeInstanceOf(Uint8ClampedArray);const saved=new Uint8ClampedArray(frame.data);await key('ArrowRight',{shiftKey:true});expect(frame.data).toEqual(saved);await undo();expect(canvas().toDataURL()).toBe(drawing);await undo();expect(state.stereoAnimKeyframes).toHaveLength(0);expect(canvas().toDataURL()).toBe(drawing);await redo();expect(state.stereoAnimKeyframes[0]).toBe(frame);
 });
 it('loads a frame as a copy, explicitly replaces it, and recovers the original through Undo',async()=>{
  await mount();await key('Enter');const first=canvas().toDataURL();await click('Capture Keyframe');const frame=state.stereoAnimKeyframes[0];await key('ArrowRight',{shiftKey:true});const changed=canvas().toDataURL();await click('Load keyframe 1 into the drawing');expect(canvas().toDataURL()).toBe(first);expect(state.stereoAnimKeyframes[0]).toBe(frame);await undo();expect(canvas().toDataURL()).toBe(changed);await click('Replace keyframe 1 with the drawing');expect(state.stereoAnimKeyframes[0]).not.toBe(frame);expect(state.stereoAnimKeyframes).toHaveLength(1);await undo();expect(state.stereoAnimKeyframes[0]).toBe(frame);expect(canvas().toDataURL()).toBe(changed);
 });
 it('reorders, removes, and clears frames with full history and bounded arrangement controls',async()=>{
  await mount();await key('Enter');await click('Capture Keyframe');await key('ArrowRight',{shiftKey:true});await click('Capture Keyframe');const frames=state.stereoAnimKeyframes,drawing=canvas().toDataURL();expect(button('Move keyframe 1 earlier').disabled).toBe(true);expect(button('Move keyframe 2 later').disabled).toBe(true);await click('Move keyframe 2 earlier');expect(state.stereoAnimKeyframes).toEqual([frames[1],frames[0]]);expect(canvas().toDataURL()).toBe(drawing);await undo();expect(state.stereoAnimKeyframes).toEqual(frames);await click('Remove keyframe 1');expect(state.stereoAnimKeyframes).toEqual([frames[1]]);await undo();await click('❌ Clear All Frames');expect(state.stereoAnimKeyframes).toHaveLength(0);await undo();expect(state.stereoAnimKeyframes).toEqual(frames);
 });
 it('keeps the twelve-frame ceiling while allowing replacement at that ceiling',async()=>{
  const frames=Array.from({length:12},()=>({width:1,height:1,data:new Uint8ClampedArray([0,0,0,255])}));await mount({stereoAnimKeyframes:frames});await click('Capture Keyframe');expect(state.stereoAnimKeyframes).toBe(frames);expect(toast).toHaveBeenCalledWith('Keep up to 12 keyframes. Remove one before capturing another.','warning');await key('Enter');await click('Replace keyframe 12 with the drawing');expect(state.stereoAnimKeyframes).toHaveLength(12);expect(state.stereoAnimKeyframes[11]).not.toBe(frames[11]);
 });
 it('retains the depth PNG and history after switching away from Draw and returning',async()=>{
  await mount();await key('Enter');const drawing=canvas().toDataURL();await click('✨ Preset');expect(canvas()).toBeNull();await click('✏️ Draw');expect(canvas().toDataURL()).toBe(drawing);expect(button('Undo edit').disabled).toBe(false);await undo();expect(parse(canvas().toDataURL()).mark).toBe('blank');
 });
 it('supports keyboard history and announces a live cursor without moving painted pixels',async()=>{
  await mount();const node=canvas();await key('ArrowRight',{altKey:true});expect(node._animDepthKeyboardCursor).toEqual({x:201,y:200});expect(node.getAttribute('aria-label')).toContain('Keyboard cursor at x 201, y 200');await key('Enter');const drawing=node.toDataURL();await key('z',{ctrlKey:true});expect(parse(node.toDataURL()).mark).toBe('blank');await key('z',{ctrlKey:true,shiftKey:true});expect(node.toDataURL()).toBe(drawing);await key('Home');expect(node._animDepthKeyboardCursor).toEqual({x:200,y:200});
 });
 it('restores a new study with empty history and discards old queued image decodes',async()=>{
  holdImages=true;await mount({stereoAnimDepthSnapshot:png({mark:'old'})});const oldNode=canvas(),oldImage=images.at(-1);await act(async()=>setData(data=>({artStudio:{...data.artStudio,stereoRestoreToken:'fork',stereoAnimDepthSnapshot:png({mark:'new'})}})));expect(canvas()).not.toBe(oldNode);await act(async()=>oldImage.onload());expect(contextFor(canvas()).mark).toBe('blank');await act(async()=>images.at(-1).onload());expect(contextFor(canvas()).mark).toBe('new');expect(button('Undo edit').disabled).toBe(true);
 });
 it('invalidates pending work when changing learners and returning to the original learner',async()=>{
  holdImages=true;await mount({stereoAnimDepthSnapshot:png({mark:'a'})});const node=canvas(),old=images.at(-1);await act(async()=>setProfile('b'));await act(async()=>setProfile('a'));expect(canvas()).not.toBe(node);await act(async()=>old.onload());expect(contextFor(canvas()).mark).toBe('blank');expect(button('Undo edit').disabled).toBe(true);
 });
 it('blocks drawing and capture during restore and cancels a queued export when Clear invalidates the restore',async()=>{
  holdImages=true;await mount({stereoAnimDepthSnapshot:png({mark:'late'})});const old=images.at(-1);expect(button('Capture Keyframe').disabled).toBe(true);await pointer('onpointerdown',event(1,100,100));expect(canvas()._adStroke).toBeNull();const exported=canvas()._adExport();await click('Clear Canvas');expect(await exported).toBe('');await act(async()=>old.onload());expect(contextFor(canvas()).mark).toBe('blank');expect(button('Capture Keyframe').disabled).toBe(false);holdImages=false;await undo();expect(contextFor(canvas()).mark).toBe('late');
 });
 it('rejects stale gesture handlers after a learner change',async()=>{
  await mount();await pointer('onpointerdown',event(1,100,100));const old=canvas();await act(async()=>setProfile('b'));const blank=canvas().toDataURL();await act(async()=>old.onpointerup(event(1,200,200)));await act(async()=>old.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));expect(canvas().toDataURL()).toBe(blank);expect(button('Undo edit').disabled).toBe(true);expect(state.stereoAnimDepthSnapshot).toBeUndefined();
 });
 it('bounds history to twenty edits and leaves repeated empty Clear out of history',async()=>{
  await mount();await click('Clear Canvas');expect(button('Undo edit').disabled).toBe(true);for(let i=0;i<24;i++)await key('ArrowRight',{shiftKey:true});for(let i=0;i<20;i++)await undo();expect(button('Undo edit').disabled).toBe(true);expect(parse(canvas().toDataURL()).mark).toContain('|line:');
 });
 it('keeps the saved capture independent from cursor overlays and copies of keyframe buffers',async()=>{
  await mount();await key('Enter');await click('Capture Keyframe');const checkpoint=canvas()._captureArtStudioState();await key('ArrowRight');expect(canvas()._captureArtStudioState()).toEqual(checkpoint);expect(checkpoint.stereoAnimDepthSnapshot).toBe(state.stereoAnimDepthSnapshot);
 });
 it('disables drawing and capture when the canvas context is unavailable',async()=>{
  HTMLCanvasElement.prototype.getContext.mockReturnValue(null);await mount();expect(canvas().onpointerdown).toBeFalsy();expect(button('Capture Keyframe').disabled).toBe(true);expect(button('Undo edit').disabled).toBe(true);
 });
});
