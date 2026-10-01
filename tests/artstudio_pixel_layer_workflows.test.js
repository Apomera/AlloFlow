import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;
let host,root,config,state,announce;
const layer=(id,pixels,options={})=>({id,name:id,visible:true,locked:false,pixels,...options});
const read=()=>host.querySelector('#pixelCanvas')._captureArtStudioState();
const click=async selector=>{const node=host.querySelector(selector);expect(node).toBeTruthy();await act(async()=>node.click());};
const history=async text=>{await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent===text).click());};
const key=async value=>{await act(async()=>host.querySelector('#pixelCanvas').dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true})));};
async function textInput(selector,value){await act(async()=>{const input=host.querySelector(selector);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
async function mount(initial){function App(){const [data,setData]=React.useState({artStudio:{tab:'pixel',studioStarted:true,studioHome:false,pixelGrid:8,...initial}});state=data.artStudio;return config.render(makeCtx({toolData:data,setToolData:setData,announceToSR:announce}));}await act(async()=>root.render(React.createElement(App)));}
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;resetStemLab();config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');announce=vi.fn();vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){},save(){},restore(){}}));host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();delete globalThis.IS_REACT_ACT_ENVIRONMENT;});
describe('Pixel layer editing through real controls',()=>{
 it('adds a drawing layer, paints over a legacy background, and erases to reveal it with gesture Undo',async()=>{
  await mount({pixelData:{'0,0':'#00f'},pixelHue:0,pixelSat:100,pixelLit:50});
  await click('#artstudio-pixel-layer-add');await key('Enter');
  expect(state.pixelLayers).toHaveLength(2);expect(state.pixelLayers[0].pixels).toEqual({'0,0':'#00f'});expect(state.pixelLayers[1].pixels['0,0']).toBe('hsl(0,100%,50%)');
  expect(read().pixelData['0,0']).toBe('hsl(0,100%,50%)');
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Eraser').click());await key('Enter');
  expect(read().pixelData['0,0']).toBe('#00f');expect(state.pixelLayers[0].pixels).toEqual({'0,0':'#00f'});
  await history('Undo');expect(read().pixelData['0,0']).toBe('hsl(0,100%,50%)');await history('Redo');expect(read().pixelData['0,0']).toBe('#00f');
 });
 it.each(['brush','eraser','fill','line','rectangle','ellipse'])('blocks keyboard and pointer edits on a locked layer with %s',async tool=>{
  await mount({pixelTool:tool,pixelLayers:[layer('base',{'0,0':'#f00'}),layer('front',{'0,0':'#00f'},{locked:true})],pixelActiveLayer:'front'});
  const before=read();await key('Enter');await key('ArrowRight');await key('Enter');
  const canvas=host.querySelector('#pixelCanvas');canvas.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});
  await act(async()=>canvas.onpointerdown({type:'pointerdown',pointerId:1,button:0,pointerType:'mouse',clientX:5,clientY:5,preventDefault(){}}));
  expect(read()).toEqual(before);expect(canvas._pixelLineStart).toBeNull();expect(canvas._pixelReplaceColor('#00f','#fff')).toBe(0);
  expect(host.querySelector('#artstudio-pixel-layer-delete').disabled).toBe(true);expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
  expect(announce).toHaveBeenCalledWith('The active layer is hidden or locked. Show and unlock it to edit.');
 });
 it('protects hidden paint, preserves it in checkpoints, and reveals it again when shown',async()=>{
  await mount({pixelLayers:[layer('base',{'0,0':'#f00'}),layer('front',{'0,0':'#00f'},{visible:false})],pixelActiveLayer:'front'});
  await key('Enter');expect(read().pixelData).toEqual({'0,0':'#f00'});expect(read().pixelLayers[1].pixels).toEqual({'0,0':'#00f'});
  await click('#artstudio-pixel-layer-visible');expect(read().pixelData).toEqual({'0,0':'#00f'});await history('Undo');expect(read().pixelData).toEqual({'0,0':'#f00'});
 });
 it('copies pixels from a locked layer into a new layer without sharing or modifying source data',async()=>{
  await mount({pixelTool:'select',pixelLayers:[layer('base',{'1,1':'#f00'},{locked:true})],pixelActiveLayer:'base'});
  await click('#artstudio-pixel-selection-all');await click('#artstudio-pixel-selection-copy');const clipboard=host.querySelector('#pixelCanvas')._pixelClipboard;
  await click('#artstudio-pixel-layer-add');expect(host.querySelector('#pixelCanvas')._pixelSelection).toBeNull();expect(host.querySelector('#pixelCanvas')._pixelClipboard).toEqual(clipboard);
  await click('#artstudio-pixel-selection-paste');expect(read().pixelLayers[0].pixels).toEqual({'1,1':'#f00'});expect(read().pixelLayers[1].pixels).toEqual({'1,1':'#f00'});
  await click('#artstudio-pixel-selection-delete');expect(read().pixelLayers[1].pixels).toEqual({});expect(read().pixelLayers[0].pixels).toEqual({'1,1':'#f00'});
 });
 it('recolors only the active layer and keeps identical colors on other layers untouched',async()=>{
  await mount({pixelLayers:[layer('base',{'0,0':'#f00','1,0':'#f00'},{locked:true}),layer('front',{'0,0':'#f00'})],pixelActiveLayer:'front'});
  await textInput('#artstudio-pixel-replacement-hex','#123456');await click('#artstudio-pixel-replace-color');
  expect(read().pixelLayers[0].pixels).toEqual({'0,0':'#f00','1,0':'#f00'});expect(read().pixelLayers[1].pixels).toEqual({'0,0':'#123456'});
  await history('Undo');expect(read().pixelLayers[1].pixels).toEqual({'0,0':'#f00'});
 });
 it('duplicates independent pixels, changes stacking, merges, deletes, and restores the exact stack with Undo',async()=>{
  await mount({pixelLayers:[layer('base',{'0,0':'#f00','1,0':'#fff'}),layer('front',{'0,0':'#00f'})],pixelActiveLayer:'front'});
  await click('#artstudio-pixel-layer-down');expect(read().pixelData['0,0']).toBe('#f00');await history('Undo');expect(read().pixelData['0,0']).toBe('#00f');
  const before=read();await click('#artstudio-pixel-layer-merge');expect(read().pixelLayers).toHaveLength(1);expect(read().pixelData).toEqual(before.pixelData);await history('Undo');expect(read()).toEqual(before);
  await click('#artstudio-pixel-layer-duplicate');expect(read().pixelLayers).toHaveLength(3);expect(read().pixelLayers[2].name).toBe('front copy');
  await click('[aria-label="Clear active layer"]');expect(read().pixelLayers[2].pixels).toEqual({});expect(read().pixelLayers[1].pixels).toEqual({'0,0':'#00f'});
  const beforeDelete=read();await click('#artstudio-pixel-layer-delete');expect(read().pixelLayers).toHaveLength(2);await history('Undo');expect(read()).toEqual(beforeDelete);
 });
 it('resamples every hidden/locked layer and undoes resolution and all original cells together',async()=>{
  const original={pixelLayers:[layer('base',{'2,3':'#f00'},{locked:true}),layer('front',{'7,7':'#00f'},{visible:false})],pixelActiveLayer:'front'};await mount(original);
  const before=read(),select=host.querySelector('select[aria-label="Grid size"]');await act(async()=>{select.value='16';select.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(read().pixelLayers[0].pixels).toEqual({'4,6':'#f00','5,6':'#f00','4,7':'#f00','5,7':'#f00'});expect(Object.keys(read().pixelLayers[1].pixels)).toHaveLength(4);
  await history('Undo');expect(read()).toEqual(before);
 });
 it('renames in one Undo step on blur, handles literal markup safely, and keeps Escape recoverable',async()=>{
  await mount({pixelData:{'0,0':'#f00'}});const original=read();const input=host.querySelector('#artstudio-pixel-layer-name');await act(async()=>input.focus());
  await textInput('#artstudio-pixel-layer-name','<b>Foreground</b>');await act(async()=>input.blur());
  expect(read().pixelLayers[0].name).toBe('<b>Foreground</b>');expect(host.querySelector('[data-pixel-layer-id] b')).toBeNull();await history('Undo');expect(read()).toEqual(original);
  await act(async()=>input.focus());await textInput('#artstudio-pixel-layer-name','Discard me');await act(async()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));await act(async()=>input.blur());expect(read()).toEqual(original);
 });
 it('cancels unfinished shapes when changing layers and keeps the internal clipboard scoped to the artwork',async()=>{
  await mount({pixelTool:'line',pixelLayers:[layer('base',{'1,1':'#f00'}),layer('front',{})],pixelActiveLayer:'front'});
  await key('Enter');const canvas=host.querySelector('#pixelCanvas');expect(canvas._pixelLineStart).toEqual([0,0]);
  await click('[data-pixel-layer-id="base"]');expect(canvas._pixelLineStart).toBeNull();expect(read().pixelLayers[1].pixels).toEqual({});expect(read().pixelData).toEqual({'1,1':'#f00'});
 });
 it('limits the stack and disables the final layer removal through actual controls',async()=>{
  await mount({pixelLayers:Array.from({length:16},(_,i)=>layer('l'+i,{}))});expect(host.querySelector('#artstudio-pixel-layer-add').disabled).toBe(true);expect(host.querySelector('#artstudio-pixel-layer-duplicate').disabled).toBe(true);
 });
});
