import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;
let host,root,config,state,setData,setProfile,saved;
const layer=(id,pixels,extra={})=>({id,name:id,pixels,visible:true,locked:false,...extra});
const read=()=>host.querySelector('#pixelCanvas')._captureArtStudioState();
const click=async selector=>{await act(async()=>host.querySelector(selector).click());};
const undo=async(redo=false)=>{await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent===(redo?'Redo':'Undo')).click());};
const opacity=()=>host.querySelector('#artstudio-pixel-layer-opacity');
const blend=()=>host.querySelector('#artstudio-pixel-layer-blend');
const input=async(value,node=opacity())=>{await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));});};
const select=async value=>{await act(async()=>{blend().value=value;blend().dispatchEvent(new Event('change',{bubbles:true}));});};
const gesture=async(type='pointerdown',key)=>{await act(async()=>{const event=type.startsWith('key')?new KeyboardEvent(type,{key,bubbles:true}):new MouseEvent(type,{button:0,bubbles:true});opacity().dispatchEvent(event);});};
async function mount(initial={}) {
 function App(){const [profile,updateProfile]=React.useState('a'),[data,updateData]=React.useState({artStudio:{tab:'pixel',studioStarted:true,studioHome:false,pixelGrid:8,...initial}}),[studies,setStudies]=React.useState([]);setData=updateData;setProfile=updateProfile;state=data.artStudio;saved=studies;return config.render(makeCtx({toolData:data,setToolData:updateData,activeProfileId:profile,toolSnapshots:studies,setToolSnapshots:setStudies}));}
 await act(async()=>root.render(React.createElement(App)));
}
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;resetStemLab();vi.stubGlobal('indexedDB',undefined);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){},save(){},restore(){}}));vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,cGl4ZWw=');config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();delete globalThis.IS_REACT_ACT_ENVIRONMENT;});
describe('Pixel layer appearance through actual controls',()=>{
 it('groups a continuous opacity drag into one Undo and keeps every original cell',async()=>{
  await mount({pixelLayers:[layer('base',{'0,0':'#00f'}),layer('front',{'0,0':'#f00'})],pixelActiveLayer:'front'});const original=read();
  expect(opacity().value).toBe('100');expect(opacity().getAttribute('aria-describedby')).toBe('artstudio-pixel-layer-appearance-help');
  await gesture();await input(85);await input(65);await input(50);await gesture('pointerup');
  expect(read().pixelData).toEqual({'0,0':'#800080'});expect(read().pixelLayers[1].pixels).toEqual({'0,0':'#f00'});
  await undo();expect(read()).toEqual(original);expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);await undo(true);expect(opacity().value).toBe('50');
 });
 it('groups repeated keyboard changes and starts a separate edit after key release',async()=>{
  await mount({pixelData:{'0,0':'#ff0000'}});await gesture('keydown','ArrowLeft');await input(99);await input(98);await gesture('keyup','ArrowLeft');await gesture('keydown','ArrowLeft');await input(97);await gesture('keyup','ArrowLeft');
  await undo();expect(opacity().value).toBe('98');await undo();expect(opacity().value).toBe('100');
 });
 it('updates blend output, resets appearance in one edit, and restores both settings',async()=>{
  await mount({pixelLayers:[layer('base',{'0,0':'#00f'}),layer('front',{'0,0':'#f00'})],pixelActiveLayer:'front'});await input(50);await select('multiply');expect(read().pixelData).toEqual({'0,0':'#000080'});expect(host.querySelector('#artstudio-pixel-layer-merge').disabled).toBe(true);
  await select('screen');expect(read().pixelData).toEqual({'0,0':'#8000ff'});const before=read();await click('#artstudio-pixel-layer-reset-appearance');expect(read().pixelData).toEqual({'0,0':'#f00'});await undo();expect(read()).toEqual(before);await undo(true);expect(blend().value).toBe('normal');
 });
 it('prevents appearance edits on a locked layer, including synthetic input events',async()=>{
  await mount({pixelLayers:[layer('front',{'0,0':'#f00'},{opacity:70,blend:'multiply',locked:true})]});const before=read();expect(opacity().disabled).toBe(true);expect(blend().disabled).toBe(true);
  await input(20);await select('screen');await click('#artstudio-pixel-layer-reset-appearance');expect(read()).toEqual(before);
 });
 it('duplicates appearance independently and bakes Normal opacity once when merging',async()=>{
  await mount({pixelLayers:[layer('base',{'0,0':'#00f'},{opacity:40}),layer('front',{'0,0':'#f00'},{opacity:50})],pixelActiveLayer:'front'});const before=read();await click('#artstudio-pixel-layer-merge');expect(read().pixelData).toEqual(before.pixelData);expect(read().pixelLayers[0].opacity).toBeUndefined();await undo();expect(read()).toEqual(before);
  await select('screen');await click('#artstudio-pixel-layer-duplicate');expect(read().pixelLayers[2]).toMatchObject({opacity:50,blend:'screen'});await input(20);expect(read().pixelLayers[1].opacity).toBe(50);expect(read().pixelLayers[2].opacity).toBe(20);
 });
 it('remounts the opacity control across learner and layer changes and ignores stale input',async()=>{
  await mount({pixelLayers:[layer('base',{'0,0':'#00f'}),layer('front',{'0,0':'#f00'})],pixelActiveLayer:'front'});const old=opacity();await gesture();await input(60);
  await act(async()=>setProfile('b'));expect(opacity()).not.toBe(old);const restored=read();await input(20,old);expect(read()).toEqual(restored);
  await click('[data-pixel-layer-id="base"]');expect(opacity().value).toBe('100');await input(35);expect(read().pixelLayers[1].opacity).toBe(60);await undo();expect(opacity().value).toBe('100');
 });
 it('saves and forks appearance with all original pixels and leaves the stored study unchanged',async()=>{
  await mount({pixelLayers:[layer('base',{'0,0':'#00f'}),layer('front',{'0,0':'#f00'},{opacity:55,blend:'multiply'})],pixelActiveLayer:'front'});const original=read();await click('button[aria-label="Save current study"]');const fingerprint=JSON.stringify(saved[0].data);expect(saved[0].data.pixelLayers).toEqual(original.pixelLayers);
  await input(0);await select('screen');await click('button[aria-label^="Fork Pixel Art"]');expect(read().pixelLayers).toEqual(original.pixelLayers);expect(read().pixelData).toEqual(original.pixelData);expect(JSON.stringify(saved[0].data)).toBe(fingerprint);expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
 });
 it('retains appearance through resolution changes and Undo restores the complete prior stack',async()=>{
  await mount({pixelLayers:[layer('front',{'1,1':'#f008'},{opacity:30,blend:'screen'})]});const before=read();await act(async()=>{const node=host.querySelector('select[aria-label="Grid size"]');node.value='16';node.dispatchEvent(new Event('change',{bubbles:true}));});expect(read().pixelLayers[0]).toMatchObject({opacity:30,blend:'screen'});await undo();expect(read()).toEqual(before);
 });
});
