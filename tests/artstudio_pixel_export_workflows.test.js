import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;
const PNG='data:image/png;base64,cGl4ZWw=';
let host,root,config,state,setData,saved,contexts,exports,downloads,toast;
const layer=(id,pixels,extra={})=>({id,name:id,pixels,visible:true,locked:false,...extra});
const canvas=()=>host.querySelector('#pixelCanvas'),read=()=>canvas()._captureArtStudioState();
const scale=()=>host.querySelector('#artstudio-pixel-export-scale'),repeat=()=>host.querySelector('#artstudio-pixel-export-repeat');
const click=async selector=>{await act(async()=>host.querySelector(selector).click());};
const select=async(node,value)=>{await act(async()=>{node.value=String(value);node.dispatchEvent(new Event('change',{bubbles:true}));});};
const update=async values=>{await act(async()=>setData(old=>({...old,artStudio:{...old.artStudio,...values}})));};
const undo=async(redo=false)=>{await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent===(redo?'Redo':'Undo')).click());};
const history=()=>['Undo','Redo'].map(label=>[...host.querySelectorAll('button')].find(b=>b.textContent===label).disabled);
const exported=()=>exports.at(-1);
function snapshot(node){const context=contexts.get(node);return {canvas:node,width:node.width,height:node.height,fills:context?context.fills.map(c=>({...c})):[],strokes:context?context.strokes:0,smoothing:context&&context.imageSmoothingEnabled};}
function makeContext(){return {fills:[],strokes:0,imageSmoothingEnabled:true,clearRect(){this.fills=[];this.strokes=0;},fillRect(x,y,w,h){this.fills.push({x,y,w,h,color:this.fillStyle});},beginPath(){},moveTo(){},lineTo(){},stroke(){this.strokes++;},strokeRect(){this.strokes++;},save(){},restore(){}};}
async function mount(initial={}){
 function App(){const [data,updateData]=React.useState({artStudio:{tab:'pixel',studioStarted:true,studioHome:false,pixelGrid:8,...initial}}),[studies,setStudies]=React.useState([]);state=data.artStudio;setData=updateData;saved=studies;return config.render(makeCtx({toolData:data,setToolData:updateData,activeProfileId:'a',toolSnapshots:studies,setToolSnapshots:setStudies,addToast:toast}));}
 await act(async()=>root.render(React.createElement(App)));
}
function event(x,y,type='pointerdown'){return {type,pointerId:1,pointerType:'mouse',button:0,clientX:x*10+5,clientY:y*10+5,preventDefault(){}};}
function paper(){const node=canvas();node.getBoundingClientRect=()=>({left:0,top:0,width:80,height:80});return node;}
async function tap(x,y){const node=paper();await act(async()=>node.onpointerdown(event(x,y)));await act(async()=>node.onpointerup(event(x,y,'pointerup')));}
async function exportPNG(){exports=[];downloads=[];await click('#artstudio-pixel-export-sprite');return exported();}
beforeEach(()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;resetStemLab();vi.stubGlobal('indexedDB',undefined);contexts=new WeakMap();exports=[];downloads=[];toast=vi.fn();
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){if(!contexts.has(this))contexts.set(this,makeContext());return contexts.get(this);});
 vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockImplementation(function(){exports.push(snapshot(this));return PNG;});
 vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){downloads.push({download:this.download,href:this.href});});
 config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();delete globalThis.IS_REACT_ACT_ENVIRONMENT;});

describe('Pixel sprite and tile export through actual controls',()=>{
 it('exposes associated labels, announced dimensions, and native defaults',async()=>{
  await mount({pixelData:{'0,0':'#f00'}});expect(scale().value).toBe('1');expect(repeat().value).toBe('1');expect(host.querySelector('label[for="artstudio-pixel-export-scale"]').textContent).toBe('Pixel scale');expect(host.querySelector('label[for="artstudio-pixel-export-repeat"]').textContent).toBe('Tile arrangement');
  expect(scale().getAttribute('aria-describedby')).toBe('artstudio-pixel-export-help');expect(repeat().getAttribute('aria-describedby')).toBe('artstudio-pixel-export-help');expect(host.querySelector('#artstudio-pixel-export-size').getAttribute('aria-live')).toBe('polite');expect(host.querySelector('#artstudio-pixel-export-size').textContent).toBe('PNG: 8 × 8 pixels');
  expect(host.querySelector('#artstudio-pixel-export-sprite').textContent).toBe('Export transparent sprite (8×8)');expect(host.querySelector('#artstudio-pixel-export-options').tagName).toBe('FIELDSET');
 });
 it('exports native defaults separately from the on-screen decorated canvas',async()=>{
  await mount({pixelData:{'0,0':'#f008','7,7':'#00f'}});const before=read(),output=await exportPNG();expect(output.canvas).not.toBe(canvas());expect([output.width,output.height]).toEqual([8,8]);expect(output.fills).toEqual([{x:0,y:0,w:1,h:1,color:'#f008'},{x:7,y:7,w:1,h:1,color:'#00f'}]);expect(output.strokes).toBe(0);expect(output.smoothing).toBe(false);expect(downloads).toEqual([{download:'pixel-sprite-8x8.png',href:PNG}]);expect(read()).toEqual(before);expect(history()).toEqual([true,true]);expect(toast).toHaveBeenLastCalledWith(expect.stringContaining('PNG exported'),'success');
 });
 it('updates preferences and dimensions without creating artwork edits or history',async()=>{
  await mount({pixelData:{'0,0':'#f00'}});const before=read();await select(scale(),4);await select(repeat(),3);expect(state.pixelExportScale).toBe(4);expect(state.pixelExportRepeat).toBe(3);expect(host.querySelector('#artstudio-pixel-export-size').textContent).toBe('PNG: 96 × 96 pixels');expect(read()).toEqual(before);expect(history()).toEqual([true,true]);const output=await exportPNG();expect([output.width,output.height]).toEqual([96,96]);expect(output.fills).toHaveLength(9);expect(output.fills.every(c=>c.w===4&&c.h===4)).toBe(true);expect(downloads[0].download).toBe('pixel-tile-96x96.png');
 });
 it('preserves both artwork history directions when export preferences change',async()=>{
  await mount();await tap(1,1);const painted=read();await undo();expect(history()).toEqual([true,false]);await select(scale(),8);await select(repeat(),2);expect(history()).toEqual([true,false]);await undo(true);expect(read()).toEqual(painted);expect(scale().value).toBe('8');expect(repeat().value).toBe('2');await exportPNG();expect(history()).toEqual([false,true]);await undo();expect(read().pixelData).toEqual({});expect(scale().value).toBe('8');
 });
 it('keeps the no-argument native API independent of saved export preferences',async()=>{
  await mount({pixelGrid:24,pixelExportScale:16,pixelExportRepeat:3,pixelData:{'23,23':'#f00'}});expect(canvas()._pixelExportNative()).toBe(PNG);expect([exported().width,exported().height]).toEqual([24,24]);expect(exported().fills).toEqual([{x:23,y:23,w:1,h:1,color:'#f00'}]);canvas()._pixelExportNative(2,2);expect(exported().width).toBe(96);expect(exported().fills).toHaveLength(4);expect(exported().fills.at(-1)).toEqual({x:94,y:94,w:2,h:2,color:'#f00'});
 });
 it('preserves fractional and modern saved CSS in native and enlarged output',async()=>{
  const pixels={'0,0':'hsl(27.123,58.456%,43.789%)','1,0':'rgba(41.4,62.7,19.3,0.4137)','2,0':'color(srgb 0.1234 0.4567 0.7891)'};await mount({pixelData:pixels,pixelExportScale:16});canvas()._pixelExportNative();expect(exported().fills.map(c=>c.color)).toEqual(Object.values(pixels));const enlarged=await exportPNG();expect(enlarged.fills.map(c=>c.color)).toEqual(Object.values(pixels));expect(enlarged.fills.map(c=>[c.x,c.y,c.w,c.h])).toEqual([[0,0,16,16],[16,0,16,16],[32,0,16,16]]);expect(read().pixelLayers[0].pixels).toEqual(pixels);
 });
 it.each([8,16,24,32,48,64])('derives selected export dimensions from the current %i-cell grid',async size=>{
  await mount({pixelGrid:size,pixelExportScale:2,pixelExportRepeat:3,pixelData:{'0,0':'#abc'}});expect(host.querySelector('#artstudio-pixel-export-size').textContent).toBe('PNG: '+size*6+' × '+size*6+' pixels');const output=await exportPNG();expect([output.width,output.height]).toEqual([size*6,size*6]);expect(downloads[0].download).toBe('pixel-tile-'+size*6+'x'+size*6+'.png');
 });
 it('tracks a resolution edit and its Undo without treating preferences as painting',async()=>{
  await mount({pixelData:{'0,0':'#f00'},pixelExportScale:4,pixelExportRepeat:2});const before=read();await select(host.querySelector('select[aria-label="Grid size"]'),16);expect(host.querySelector('#artstudio-pixel-export-size').textContent).toBe('PNG: 128 × 128 pixels');await undo();expect(read()).toEqual(before);expect(host.querySelector('#artstudio-pixel-export-size').textContent).toBe('PNG: 64 × 64 pixels');
 });
 it.each([['normal','#800080'],['multiply','#000080'],['screen','#8000ff']])('combines visible %s layer appearance and leaves protected original cells intact',async(blend,color)=>{
  const layers=[layer('base',{'0,0':'#00f','7,7':'#1234'},{locked:true}),layer('front',{'0,0':'#f00'},{opacity:50,blend}),layer('hidden',{'0,0':'#fff','1,1':'#fff'},{visible:false,locked:true})];await mount({pixelLayers:layers,pixelActiveLayer:'hidden',pixelExportScale:2});const before=read(),output=await exportPNG();expect(output.fills).toEqual([{x:0,y:0,w:2,h:2,color},{x:14,y:14,w:2,h:2,color:'#1234'}]);expect(read()).toEqual(before);expect(history()).toEqual([true,true]);
 });
 it('exports a fully hidden stack as transparent while preserving its saved paint',async()=>{
  await mount({pixelLayers:[layer('paint',{'0,0':'#f00'},{visible:false,locked:true})],pixelExportScale:16,pixelExportRepeat:3});const before=read(),output=await exportPNG();expect(output.width).toBe(384);expect(output.fills).toEqual([]);expect(read()).toEqual(before);expect(downloads).toHaveLength(1);
 });
 it('excludes preview backgrounds, the keyboard cursor, and selection bounds',async()=>{
  await mount({pixelData:{'0,0':'#f008','7,7':'#00f'},pixelTool:'select',pixelPreviewMode:'tile',pixelPreviewPaper:'dark',pixelExportScale:2});await click('#artstudio-pixel-selection-all');await act(async()=>canvas().focus());const selected=canvas()._pixelSelection,before=read(),output=await exportPNG();expect(output.fills).toEqual([{x:0,y:0,w:2,h:2,color:'#f008'},{x:14,y:14,w:2,h:2,color:'#00f'}]);expect(output.strokes).toBe(0);expect(read()).toEqual(before);expect(canvas()._pixelSelection).toEqual(selected);expect(history()).toEqual([true,true]);
 });
 it('exports committed cells rather than an unfinished shape preview',async()=>{
  await mount({pixelData:{'7,7':'#00f'},pixelTool:'line'});const node=paper();await act(async()=>{node.onpointerdown(event(0,0));node.onpointermove(event(5,5,'pointermove'));});const before=read();expect(before.pixelData).toEqual({'7,7':'#00f'});node._pixelExportNative(4,1);expect(exported().fills).toEqual([{x:28,y:28,w:4,h:4,color:'#00f'}]);expect(read()).toEqual(before);await act(async()=>node.onpointercancel(event(5,5,'pointercancel')));expect(read()).toEqual(before);
 });
 it('exports the original cells while a selection move is only a preview',async()=>{
  await mount({pixelData:{'0,0':'#f00'},pixelTool:'select'});const node=paper();await click('#artstudio-pixel-selection-all');await act(async()=>{node.onpointerdown(event(0,0));node.onpointermove(event(2,2,'pointermove'));});expect(node._pixelSelectionPreview).not.toBeNull();const before=read();node._pixelExportNative(2,2);expect(exported().fills).toEqual([{x:0,y:0,w:2,h:2,color:'#f00'},{x:16,y:0,w:2,h:2,color:'#f00'},{x:0,y:16,w:2,h:2,color:'#f00'},{x:16,y:16,w:2,h:2,color:'#f00'}]);expect(read()).toEqual(before);await act(async()=>node.onpointercancel(event(2,2,'pointercancel')));expect(read()).toEqual(before);
 });
 it('saves and forks export preferences with exact artwork without changing the saved study',async()=>{
  await mount({pixelLayers:[layer('base',{'0,0':'#1234'},{locked:true}),layer('front',{'7,7':'#f008'},{opacity:60,blend:'screen'})],pixelActiveLayer:'front'});await select(scale(),8);await select(repeat(),3);const before=read();await click('button[aria-label="Save current study"]');expect(saved).toHaveLength(1);expect(saved[0].data).toMatchObject({pixelExportScale:8,pixelExportRepeat:3});const stored=JSON.stringify(saved[0].data);await select(scale(),2);await select(repeat(),1);await click('button[aria-label="Clear active layer"]');await click('button[aria-label^="Fork Pixel Art"]');expect(read()).toEqual(before);expect(scale().value).toBe('8');expect(repeat().value).toBe('3');expect(JSON.stringify(saved[0].data)).toBe(stored);expect(history()).toEqual([true,true]);const output=await exportPNG();expect(output.width).toBe(192);
 });
 it('normalizes malformed saved export preferences without rewriting paint',async()=>{
  await mount({pixelData:{'1,1':'#aBc8'},pixelExportScale:[16],pixelExportRepeat:{valueOf(){return 3;}}});const before=read();expect(scale().value).toBe('1');expect(repeat().value).toBe('1');const output=await exportPNG();expect(output.width).toBe(8);expect(output.fills).toEqual([{x:1,y:1,w:1,h:1,color:'#aBc8'}]);expect(read()).toEqual(before);expect(history()).toEqual([true,true]);
 });
 it('rejects PNG serialization failures with a useful error and no download or edit',async()=>{
  await mount({pixelData:{'0,0':'#f00'}});const before=read();HTMLCanvasElement.prototype.toDataURL.mockImplementation(()=>{throw new Error('SecurityError');});await exportPNG();expect(downloads).toEqual([]);expect(toast).toHaveBeenLastCalledWith('The PNG could not be created. Try exporting again.','error');expect(read()).toEqual(before);expect(history()).toEqual([true,true]);
 });
 it('rejects an unavailable export context with no blank download',async()=>{
  await mount({pixelData:{'0,0':'#f00'}});const before=read();HTMLCanvasElement.prototype.getContext.mockImplementation(function(){return this.id==='pixelCanvas'?contexts.get(this):null;});await exportPNG();expect(downloads).toEqual([]);expect(exports).toEqual([]);expect(toast).toHaveBeenLastCalledWith('The PNG could not be created. Try exporting again.','error');expect(read()).toEqual(before);expect(history()).toEqual([true,true]);
 });
 it('treats an empty serialized PNG as failure and allows a later successful retry',async()=>{
  await mount({pixelData:{'0,0':'#f00'}});HTMLCanvasElement.prototype.toDataURL.mockReturnValueOnce('');await exportPNG();expect(downloads).toEqual([]);expect(toast).toHaveBeenLastCalledWith('The PNG could not be created. Try exporting again.','error');const output=await exportPNG();expect(output.width).toBe(8);expect(downloads).toHaveLength(1);expect(toast).toHaveBeenLastCalledWith(expect.stringContaining('PNG exported'),'success');
 });
});
