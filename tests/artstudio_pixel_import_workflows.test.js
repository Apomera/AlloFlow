import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;
let host,root,config,state,setData,setProfile,readers,images,decoded,announce;
const read=()=>host.querySelector('#pixelCanvas')._captureArtStudioState();
const click=async selector=>{const node=host.querySelector(selector);expect(node).toBeTruthy();await act(async()=>node.click());};
const history=async text=>{await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent===text).click());};
const select=async(selector,value)=>{await act(async()=>{const node=host.querySelector(selector);node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));});};
const input=async(selector,value)=>{await act(async()=>{const node=host.querySelector(selector);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));});};
const layer=(id,options={})=>({id,name:id,visible:true,locked:false,pixels:{'0,0':'#00f'},...options});
async function mount(initial={}) {
 function App(){const [profile,updateProfile]=React.useState('a'),[data,updateData]=React.useState({artStudio:{tab:'pixel',studioStarted:true,studioHome:false,pixelGrid:8,...initial}});setData=updateData;setProfile=updateProfile;state=data.artStudio;return config.render(makeCtx({toolData:data,setToolData:updateData,activeProfileId:profile,announceToSR:announce}));}
 await act(async()=>root.render(React.createElement(App)));
}
async function choose(file=new File(['fixture'],'landscape.png',{type:'image/png'})) {
 await act(async()=>{const node=host.querySelector('#artstudio-pixel-import-file');Object.defineProperty(node,'files',{configurable:true,value:[file]});node.dispatchEvent(new Event('change',{bubbles:true}));});return readers.at(-1);
}
async function decode(reader=readers.at(-1),width=8,height=4) {
 await act(async()=>{reader.result='data:image/png;base64,Zml4dHVyZQ==';reader.onload();});const image=images.at(-1);
 await act(async()=>{image.naturalWidth=width;image.naturalHeight=height;image.onload();});return image;
}
beforeEach(()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;resetStemLab();readers=[];images=[];announce=vi.fn();decoded=Uint8ClampedArray.from(Array.from({length:32},(_,i)=>[i%8*30,Math.floor(i/8)*60,17,i===0?128:255]).flat());
 vi.stubGlobal('indexedDB',undefined);
 vi.stubGlobal('FileReader',class{constructor(){readers.push(this);}readAsDataURL(file){this.file=file;}});
 vi.stubGlobal('Image',class{constructor(){images.push(this);}set src(value){this._src=value;}get src(){return this._src;}});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},strokeRect(){},save(){},restore(){},drawImage(){},getImageData(){return {data:decoded};}}));
 config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();delete globalThis.IS_REACT_ACT_ENVIRONMENT;});
describe('Previewed image imports through actual controls',()=>{
 it('previews locally without changing artwork or creating Undo history',async()=>{
  await mount({pixelData:{'0,0':'#f00'}});const before=read();await choose();await decode();
  expect(read()).toEqual(before);expect(host.querySelector('#pixelImportPreview').width).toBe(8);expect(host.querySelector('#artstudio-pixel-import-name').value).toBe('landscape');expect(host.querySelector('#artstudio-pixel-import-count').textContent).toContain('32 painted cells');
  expect(Object.keys(state).some(key=>/pixelImport/.test(key))).toBe(false);expect([...host.querySelectorAll('button')].find(button=>button.textContent==='Undo').disabled).toBe(true);
 });
 it('imports as the top editable layer, keeps hidden/locked artwork, and restores the complete stack with Undo/Redo',async()=>{
  await mount({pixelLayers:[layer('base',{locked:true}),layer('sketch',{visible:false})],pixelActiveLayer:'base'});const before=read();await choose();await decode();await input('#artstudio-pixel-import-name','<b>Photo</b>');await click('#artstudio-pixel-import-apply');
  const imported=read();expect(imported.pixelLayers).toHaveLength(3);expect(imported.pixelLayers.slice(0,2)).toEqual(before.pixelLayers);expect(imported.pixelLayers[2]).toMatchObject({name:'<b>Photo</b>',visible:true,locked:false});expect(imported.pixelLayers[2].pixels['0,2']).toBe('#00001180');expect(imported.pixelData['0,0']).toBe('#00f');expect(host.querySelector('[data-pixel-layer-id] b')).toBeNull();expect(host.querySelector('#pixelImportPreview')).toBeNull();
  expect(announce).toHaveBeenCalledWith('Imported <b>Photo</b> as a new layer. Undo restores the previous artwork.');await history('Undo');expect(read()).toEqual(before);await history('Redo');expect(read()).toEqual(imported);
 });
 it('updates fitting and palette previews without painting until Import is chosen',async()=>{
  await mount();const before=read();await choose();await decode();await select('#artstudio-pixel-import-fit','cover');expect(host.querySelector('#artstudio-pixel-import-count').textContent).toContain('64 painted cells');await select('#artstudio-pixel-import-colors','8');expect(host.querySelector('#pixelImportPreview').getAttribute('aria-label')).toContain('8 RGB colors');expect(read()).toEqual(before);
  await select('#artstudio-pixel-import-fit','stretch');await click('#artstudio-pixel-import-apply');expect(Object.keys(read().pixelLayers.at(-1).pixels)).toHaveLength(64);expect(new Set(Object.values(read().pixelLayers.at(-1).pixels).map(color=>color.slice(0,7))).size).toBeLessThanOrEqual(8);expect(read().pixelLayers.at(-1).pixels['0,0'].slice(7)).toBe('80');
 });
 it('rebuilds the preview for a changed grid and imports at the displayed resolution',async()=>{
  await mount();await choose();await decode();await select('select[aria-label="Grid size"]','16');expect(host.querySelector('#pixelImportPreview').width).toBe(16);expect(host.querySelector('#artstudio-pixel-import-count').textContent).toContain('128 painted cells');const resized=read();await click('#artstudio-pixel-import-apply');expect(read().pixelGrid).toBe(16);expect(Object.keys(read().pixelLayers.at(-1).pixels)).toHaveLength(128);await history('Undo');expect(read()).toEqual(resized);
 });
 it('cancels previews and pending reads and allows choosing the same file again',async()=>{
  await mount();const before=read();await choose();await decode();await click('#artstudio-pixel-import-cancel');expect(host.querySelector('#pixelImportPreview')).toBeNull();expect(read()).toEqual(before);
  const pending=await choose();await click('#artstudio-pixel-import-cancel');await act(async()=>{pending.result='data:image/png;base64,WA==';pending.onload();});expect(images).toHaveLength(1);expect(host.querySelector('#pixelImportPreview')).toBeNull();expect(host.querySelector('#artstudio-pixel-import-file').value).toBe('');await choose();await decode();expect(host.querySelector('#pixelImportPreview')).toBeTruthy();
 });
 it('ignores an earlier decode when a newer file has been chosen',async()=>{
  await mount();const first=await choose();await act(async()=>{first.result='data:image/png;base64,WA==';first.onload();});const old=images.at(-1);await choose(new File(['next'],'new.webp',{type:'image/webp'}));await decode();await act(async()=>{old.naturalWidth=8;old.naturalHeight=4;old.onload();});expect(host.querySelector('#artstudio-pixel-import-name').value).toBe('new');
 });
 it('invalidates a queued decode across study restore, navigation, and returning to the same learner',async()=>{
  await mount();const request=await choose();await act(async()=>{request.result='data:image/png;base64,WA==';request.onload();});const pending=images.at(-1);
  await act(async()=>setData(data=>({artStudio:{...data.artStudio,pixelRestoreToken:'another-study'}})));await act(async()=>setData(data=>({artStudio:{...data.artStudio,tab:'spinArt'}})));await act(async()=>setData(data=>({artStudio:{...data.artStudio,tab:'pixel'}})));await act(async()=>setProfile('b'));await act(async()=>setProfile('a'));
  const before=read();await act(async()=>{pending.naturalWidth=8;pending.naturalHeight=4;pending.onload();});expect(host.querySelector('#pixelImportPreview')).toBeNull();expect(read()).toEqual(before);
 });
 it('respects the 16-layer ceiling and blocks empty transparent imports without adding history',async()=>{
  await mount({pixelLayers:Array.from({length:16},(_,i)=>layer('l'+i))});const before=read();await choose();await decode();expect(host.querySelector('#artstudio-pixel-import-apply').disabled).toBe(true);await click('#artstudio-pixel-import-apply');expect(read()).toEqual(before);
  await act(async()=>setData(data=>({artStudio:{...data.artStudio,pixelLayers:[layer('base')],pixelActiveLayer:'base'}})));decoded.fill(0);await choose();await decode();expect(host.querySelector('#artstudio-pixel-import-apply').disabled).toBe(true);expect(host.querySelector('#artstudio-pixel-import-count').textContent).toContain('0 painted cells');
 });
 it('rejects unsupported, oversized, and unreadable files while leaving artwork untouched',async()=>{
  await mount();const before=read();await choose(new File(['svg'],'drawing.svg',{type:'image/svg+xml'}));expect(host.querySelector('[role=alert]').textContent).toContain('PNG, JPEG, or WebP');expect(readers).toHaveLength(0);
  const large=new File(['x'],'huge.png',{type:'image/png'});Object.defineProperty(large,'size',{value:11*1024*1024});await choose(large);expect(host.querySelector('[role=alert]').textContent).toContain('10 MB');expect(readers).toHaveLength(0);
  await choose();await act(async()=>readers.at(-1).onerror());expect(host.querySelector('[role=alert]').textContent).toContain('could not be read');await choose();await act(async()=>{readers.at(-1).result='data:image/png;base64,WA==';readers.at(-1).onload();images.at(-1).onerror();});expect(read()).toEqual(before);expect(host.querySelector('#pixelImportPreview')).toBeNull();
 });
 it('rejects excessive decoded dimensions and handles missing canvas contexts',async()=>{
  await mount();const before=read();await choose();await decode(undefined,10000,5000);expect(host.querySelector('[role=alert]').textContent).toContain('40 megapixels');
  await choose();await act(async()=>{readers.at(-1).result='data:image/png;base64,WA==';readers.at(-1).onload();});HTMLCanvasElement.prototype.getContext.mockReturnValueOnce(null);await act(async()=>{images.at(-1).naturalWidth=8;images.at(-1).naturalHeight=4;images.at(-1).onload();});expect(host.querySelector('[role=alert]').textContent).toContain('could not be read');expect(read()).toEqual(before);
 });
});
