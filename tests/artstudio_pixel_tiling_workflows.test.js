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

const canvas=()=>host.querySelector('#pixelCanvas'),raw=()=>read().pixelLayers.find(l=>l.id===read().pixelActiveLayer).pixels;
const offset=axis=>click('#artstudio-pixel-tile-offset-'+axis),wrap=()=>click('#artstudio-pixel-wrap-edges');
const change=async values=>{await act(async()=>setData(old=>({...old,artStudio:{...old.artStudio,...values}})));};
function point(x,y,type='pointerdown'){const size=read().pixelGrid;return {type,pointerId:1,pointerType:'mouse',button:0,clientX:(x+.5)*80/size,clientY:(y+.5)*80/size,preventDefault(){}};}
async function tap(x,y){const node=canvas();node.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});await act(async()=>node.onpointerdown(point(x,y)));await act(async()=>node.onpointerup(point(x,y,'pointerup')));}
async function key(name){await act(async()=>canvas().onkeydown({key:name,preventDefault(){}}));}
const filled=size=>Object.fromEntries(Array.from({length:size*size},(_,i)=>[(i%size)+','+Math.floor(i/size),'#aBc8']));

describe('Seamless Pixel tile editing',()=>{
 it('preserves ordinary clipped drawing until wrapping is explicitly enabled',async()=>{
  await mount({pixelBrushSize:3});expect(host.querySelector('#artstudio-pixel-wrap-edges').checked).toBe(false);await tap(0,0);expect(Object.keys(raw()).sort()).toEqual(['0,0','0,1','1,0','1,1']);
 });
 it('wraps a corner brush onto all four corners in one reversible pointer stroke',async()=>{
  await mount({pixelBrushSize:3});const before=read();await wrap();expect(state.pixelWrapEdges).toBe(true);expect(host.querySelector('#artstudio-pixel-wrap-edges').getAttribute('aria-describedby')).toBe('artstudio-pixel-tiling-help');await tap(0,0);
  expect(Object.keys(raw()).sort()).toEqual(['0,0','0,1','0,7','1,0','1,1','1,7','7,0','7,1','7,7']);const after=read();await undo();expect(read()).toEqual(before);expect(state.pixelWrapEdges).toBe(true);expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);await undo(true);expect(read()).toEqual(after);
 });
 it('keeps a round tip intact across corners when painted with the keyboard',async()=>{
  await mount({pixelBrushSize:4,pixelBrushShape:'round',pixelWrapEdges:true});for(let n=0;n<4;n++){await key('ArrowRight');await key('ArrowDown');}await key('Enter');const interior=raw();expect(Object.keys(interior)).toHaveLength(12);await undo();await key('Home');await key('Enter');
  const shifted={};for(const [cell,color]of Object.entries(interior)){const [x,y]=cell.split(',').map(Number);shifted[((x+4)%8)+','+((y+4)%8)]=color;}expect(raw()).toEqual(shifted);
 });
 it.each([25,50,75])('anchors %i percent dithering to wrapped artwork cells rather than brush dabs',async pattern=>{
  await mount({pixelBrushSize:4,pixelBrushPattern:pattern,pixelWrapEdges:true});await tap(0,0);expect(Object.keys(raw())).toHaveLength(16*pattern/100);for(const cell of Object.keys(raw())){const [x,y]=cell.split(',').map(Number);expect([[0,2],[3,1]][y%2][x%2]).toBeLessThan(pattern/25);}const first=raw();await tap(0,0);expect(raw()).toEqual(first);
 });
 it('combines wrapping and both mirror axes without creating off-grid pixels',async()=>{
  await mount({pixelBrushSize:3,pixelMirrorX:true,pixelMirrorY:true,pixelWrapEdges:true});await tap(0,0);const cells=raw();expect(Object.keys(cells)).toHaveLength(16);for(const [cell,color]of Object.entries(cells)){const [x,y]=cell.split(',').map(Number);expect(cells[(7-x)+','+y]).toBe(color);expect(cells[x+','+(7-y)]).toBe(color);}
 });
 it('erases across edges while preserving lower layers, other cells, and full-stack Undo',async()=>{
  const layers=[layer('base',{'0,0':'#123','7,7':'#abc'}),layer('paint',filled(8),{opacity:65,blend:'screen'})];await mount({pixelLayers:layers,pixelActiveLayer:'paint',pixelWrapEdges:true,pixelTool:'eraser',pixelBrushSize:3});const before=read();await tap(0,0);expect(Object.keys(raw())).toHaveLength(55);expect(read().pixelLayers[0]).toEqual(before.pixelLayers[0]);expect(read().pixelLayers[1].opacity).toBe(65);expect(read().pixelLayers[1].blend).toBe('screen');expect(raw()['4,4']).toBe('#aBc8');expect(raw()['7,7']).toBeUndefined();await undo();expect(read()).toEqual(before);
 });
 it.each([['0,3','7,3',0,3],['3,0','3,7',3,0]])('joins equivalent Fill colors across the %s / %s seam only when enabled',async(a,b,x,y)=>{
  await mount({pixelTool:'fill',pixelHue:120,pixelSat:100,pixelLit:50,pixelData:{[a]:'#ff0000',[b]:'rgb(255,0,0)','5,5':'#ff0000'}});await tap(x,y);expect(raw()[b]).toBe('rgb(255,0,0)');await undo();await wrap();await tap(x,y);expect(raw()[a]).toBe(raw()[b]);expect(raw()[a]).not.toBe('#ff0000');expect(raw()['5,5']).toBe('#ff0000');
 });
 it('terminates a wrapped 64×64 empty Fill and never produces duplicate or invalid coordinates',async()=>{
  await mount({pixelGrid:64,pixelTool:'fill',pixelWrapEdges:true});await tap(0,0);expect(Object.keys(raw())).toHaveLength(4096);expect(Object.keys(raw()).every(k=>{const [x,y]=k.split(',').map(Number);return x>=0&&y>=0&&x<64&&y<64;})).toBe(true);await undo();expect(raw()).toEqual({});
 });
 it.each([['x',{'4,0':'#aBc8','3,7':'hsl(27.5,58%,43%)','6,3':'#ff008080'}],['y',{'0,4':'#aBc8','7,3':'hsl(27.5,58%,43%)','2,7':'#ff008080'}],['both',{'4,4':'#aBc8','3,3':'hsl(27.5,58%,43%)','6,7':'#ff008080'}]])('centers %s seams using exact cells and keeps layer appearance and one-step Undo',async(axis,expected)=>{
  const pixels={'0,0':'#aBc8','7,7':'hsl(27.5,58%,43%)','2,3':'#ff008080'},layers=[layer('base',{'4,4':'#0055ff'}),layer('paint',pixels,{opacity:75,blend:'multiply'})];await mount({pixelLayers:layers,pixelActiveLayer:'paint'});const before=read();await offset(axis);expect(raw()).toEqual(expected);expect(read().pixelLayers[0]).toEqual(before.pixelLayers[0]);expect(read().pixelLayers[1].opacity).toBe(75);expect(read().pixelLayers[1].blend).toBe('multiply');await undo();expect(read()).toEqual(before);expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);await undo(true);expect(raw()).toEqual(expected);await offset(axis);expect(raw()).toEqual(pixels);
 });
 it.each([8,16,24,32,48,64])('restores exact position and transparency after two half-tile shifts at %i cells',async size=>{
  const pixels={'0,0':'#abCd','1,2':'rgba(1,2,3,0.3)',[(size-1)+','+(size-1)]:'hsl(10.2,70%,41%)'};await mount({pixelGrid:size,pixelData:pixels});const before=read();await offset('both');expect(Object.keys(raw())).toHaveLength(3);await offset('both');expect(read()).toEqual(before);
 });
 it.each([{locked:true},{visible:false},{pixels:{}}])('protects a locked, hidden, or empty active layer from seam shifts: %j',async extra=>{
  await mount({pixelLayers:[layer('paint',{'0,0':'#abc'},extra)]});const before=read();for(const axis of ['x','y','both']){expect(host.querySelector('#artstudio-pixel-tile-offset-'+axis).disabled).toBe(true);await offset(axis);}expect(read()).toEqual(before);expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
 });
 it('does not consume Undo for an unchanged periodic pattern',async()=>{
  await mount({pixelData:{'0,0':'#abc','4,0':'#abc'}});const before=read();await offset('x');expect(read()).toEqual(before);expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);
 });
 it('finishes wrapping-mode changes safely when a pointer stroke is in progress',async()=>{
  await mount({pixelWrapEdges:true,pixelBrushSize:3});const node=canvas();node.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});await act(async()=>node.onpointerdown(point(0,0)));const started=read();await wrap();await act(async()=>canvas().onpointerup(point(4,4,'pointerup')));expect(read()).toEqual(started);expect(state.pixelWrapEdges).toBe(false);await undo();expect(raw()).toEqual({});
 });
 it('keeps a seam shift separate from an interrupted stroke and rejects its late release',async()=>{
  await mount({pixelWrapEdges:true,pixelBrushSize:3});const node=canvas();node.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});await act(async()=>node.onpointerdown(point(0,0)));const stroke=read();await offset('both');const shifted=read();await act(async()=>canvas().onpointerup(point(4,4,'pointerup')));expect(read()).toEqual(shifted);await undo();expect(read()).toEqual(stroke);await undo();expect(raw()).toEqual({});
 });
 it('recovers wrapped edits and seam placement through Save and Fork without modifying the original study',async()=>{
  await mount({pixelWrapEdges:true,pixelBrushSize:3});await tap(0,0);await offset('both');const before=read();await click('button[aria-label="Save current study"]');expect(saved).toHaveLength(1);const stored=JSON.stringify(saved[0].data);expect(saved[0].data.pixelWrapEdges).toBe(true);await click('button[aria-label="Clear active layer"]');await wrap();await click('button[aria-label^="Fork Pixel Art"]');expect(read()).toEqual(before);expect(host.querySelector('#artstudio-pixel-wrap-edges').checked).toBe(true);expect(JSON.stringify(saved[0].data)).toBe(stored);
 });
 it('resets edit history on learner changes and treats malformed wrapping settings as disabled',async()=>{
  await mount({pixelWrapEdges:'true',pixelBrushSize:3});await tap(0,0);expect(Object.keys(raw())).toHaveLength(4);await offset('x');await act(async()=>setProfile('b'));expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Undo').disabled).toBe(true);expect(canvas()._pixelDrawing).toBe(false);
 });
});
