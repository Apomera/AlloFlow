import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
const source=fs.readFileSync('video_studio/video_studio.html','utf8');
const extract=name=>{const a=source.indexOf('  function '+name+'('),b=source.indexOf('\n  function ',a+5);if(a<0||b<0)throw Error(name);return source.slice(a,b);};
function harness(){
 const elements={},pending=[],$=id=>elements[id]||(elements[id]={removeAttribute(key){delete this[key];}});
 const start=source.indexOf('  function refreshThumbnailPreview('),end=source.indexOf('  function makeThumb(',start);
 const api=new Function('$','makeThumb','setStatus',`let lastExport={url:'first',thumb:'old'};let thumbnailRequest=0;const updateThumbTimeLabel=()=>{};const thumbnailOptions=()=>({});const renderFinishChecklist=()=>{};${source.slice(start,end)};return {refresh:refreshThumbnailPreview,setExport:value=>lastExport=value,getExport:()=>lastExport};`)($,url=>new Promise(resolve=>pending.push({url,resolve})),(el,text)=>el.textContent=text);
 return {...api,elements,pending};
}
describe('prepared thumbnail request ownership',()=>{
 it('keeps the newest preview when requests finish in reverse order',async()=>{const h=harness();const old=h.refresh(),newer=h.refresh();h.pending[1].resolve('new-thumbnail');expect(await newer).toBe('new-thumbnail');h.pending[0].resolve('old-thumbnail');expect(await old).toBeNull();expect(h.getExport().thumb).toBe('new-thumbnail');expect(h.elements.thumbPreview.src).toBe('new-thumbnail');});
 it('never attaches an old export thumbnail to a replacement export',async()=>{const h=harness();const old=h.refresh();const replacement={url:'second',thumb:null};h.setExport(replacement);h.pending[0].resolve('wrong-video');expect(await old).toBeNull();expect(replacement.thumb).toBeNull();expect(h.elements.thumbPreview.src).toBeUndefined();});
 it('clears the old cached thumbnail and leaves a recoverable failure',async()=>{const h=harness();const request=h.refresh();expect(h.getExport().thumb).toBeNull();h.pending[0].resolve(null);expect(await request).toBeNull();expect(h.elements.thumbStatus.textContent).toMatch(/Could not build/);});
});
describe('prepared captions',()=>{
 const cues=new Function('vsParseVtt','return ('+extract('preparedCaptionCues')+')')(text=>text?[{text}]:[]);
 it('honors an empty prepared caption snapshot instead of later source text',()=>expect(cues({captions:[],vtt:'old fallback'})).toEqual([]));
 it('uses the scene snapshot when no normal caption snapshot exists',()=>expect(cues({isScene:true,sceneCues:[{text:'scene'}]})).toEqual([{text:'scene'}]));
 it('supports older exports with only VTT and safely handles no export',()=>{expect(cues({vtt:'captions'})).toEqual([{text:'captions'}]);expect(cues(null)).toEqual([]);});
});
describe('thumbnail frame readiness',()=>{
 it('waits for the decoded seek result and releases the temporary video',async()=>{
  const listeners={},video={currentTime:0,duration:2,readyState:1,seeking:true,videoWidth:640,videoHeight:360,addEventListener:(event,handler)=>listeners[event]=handler,pause(){},removeAttribute(){this.src='';},load(){this.released=true;}};
  let draws=0,cleared=false;
  const doc={createElement:tag=>tag==='video'?video:{getContext:()=>({drawImage:()=>draws++}),toDataURL:()=> 'data:image/jpeg;base64,fixture'}};
  const a=source.indexOf('  function makeThumb('),b=source.indexOf("\n  if ($('thumbTime'))",a);
  const make=new Function('document','setTimeout','clearTimeout','drawThumbnailTitleOverlay','return ('+source.slice(a,b)+')')(doc,()=>7,()=>cleared=true,()=>{});
  let completed=false;const result=make('blob:fixture',{time:0.5,overlay:false}).then(value=>{completed=true;return value;});
  listeners.loadedmetadata();listeners.loadeddata();await Promise.resolve();expect(completed).toBe(false);expect(draws).toBe(0);
  video.seeking=false;video.readyState=2;listeners.seeked();expect(await result).toBe('data:image/jpeg;base64,fixture');expect(draws).toBe(1);expect(video.released).toBe(true);expect(cleared).toBe(true);
 });
});
describe('thumbnail download',()=>{
 it('creates a JPEG file from a generated preview and rejects non-image input',async()=>{
  const {Blob:NodeBlob}=await import('node:buffer');
  const convert=new Function('Blob','return ('+extract('thumbnailBlob')+')')(NodeBlob);
  const image=convert('data:image/jpeg;base64,/9j/2Q==');
  expect(image.type).toBe('image/jpeg');expect([...new Uint8Array(await image.arrayBuffer())]).toEqual([255,216,255,217]);
  expect(()=>convert('https://example.com/image.jpg')).toThrow(/not a JPEG/);
 });
});
