import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let host,root,config,latest,edit,profile,saved,images,contexts,frames;
const pointer=(x,y,extra={})=>({clientX:x,clientY:y,pointerId:7,pointerType:'pen',button:0,preventDefault:vi.fn(),...extra});
beforeEach(()=>{
  resetStemLab();config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');images=[];frames=new Map();contexts=new WeakMap();
  vi.stubGlobal('Image',class{constructor(){images.push(this);}set src(value){this.source=value;}});
  let tick=0;vi.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{frames.set(++tick,fn);return tick;});vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){
    if(!contexts.has(this)){
      const node=this,c={marks:0,fill:vi.fn(()=>c.marks++),stroke:vi.fn(()=>c.marks++),fillRect:vi.fn(()=>c.marks=0),clearRect:vi.fn(()=>c.marks=0),drawImage:vi.fn(image=>c.marks=Number(atob(image.source.split(',')[1]))||0),createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),getImageData:vi.fn(()=>{const image=c.createImageData(node.width,node.height);image.data[0]=c.marks;return image;}),putImageData:vi.fn(image=>c.marks=image.data[0]),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})};
      contexts.set(node,new Proxy(c,{get:(target,key)=>key in target?target[key]:()=>{}}));
    }return contexts.get(this);
  });
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockImplementation(function(){return 'data:image/png;base64,'+btoa(String(this.getContext('2d').marks));});
  host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function mount(initial={}){
  function App(){const[state,setState]=React.useState({artStudio:{tab:'stereogram',studioHome:false,studioStarted:true,studioFreeProjectId:'stereo-a',studioCurrentProjectRunId:'stereo-a',...initial}});const[studies,setStudies]=React.useState([]);const[owner,setOwner]=React.useState('one');latest=state.artStudio;saved=studies;profile=setOwner;edit=patch=>setState(previous=>({artStudio:{...previous.artStudio,...patch}}));return config.render(makeCtx({toolData:state,setToolData:setState,toolSnapshots:studies,setToolSnapshots:setStudies,activeProfileId:owner}));}
  await act(async()=>root.render(React.createElement(App)));setupDepth();
}
function setupDepth(){const canvas=depth();if(!canvas)return;canvas.getBoundingClientRect=()=>({left:0,top:0,width:400,height:400});canvas.setPointerCapture=vi.fn();canvas.releasePointerCapture=vi.fn();return canvas;}
const depth=()=>host.querySelector('#depthMapCanvas'),output=()=>host.querySelector('#stereoCanvas'),marks=()=>depth().getContext('2d').marks;
async function click(name){const b=[...host.querySelectorAll('button')].find(node=>(node.getAttribute('aria-label')||node.textContent.trim())===name);expect(b,name).toBeTruthy();await act(async()=>b.click());}
async function stamp(){await act(async()=>depth().dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));}
describe('Static stereogram editing and persistence',()=>{
  it('joins the release endpoint to the stroke and undoes the whole gesture',async()=>{
    await mount();const c=depth(),ctx=c.getContext('2d');await act(async()=>{c.onpointerdown(pointer(10,20));c.onpointerup(pointer(350,20));});expect(ctx.stroke).toHaveBeenCalled();expect(c._dmHistory.undo).toHaveLength(1);expect(marks()).toBe(2);await click('Undo depth edit');expect(marks()).toBe(0);await click('Redo depth edit');expect(marks()).toBe(2);expect(latest.stereoDepthSnapshot).toBe(c.toDataURL());
  });
  it('keeps cancellation at the last sample and ignores unrelated pointer releases',async()=>{
    await mount();const c=depth();await act(async()=>{c.onpointerdown(pointer(10,20));c.onpointermove(pointer(60,20));c.onpointerup(pointer(200,20,{pointerId:99}));});expect(c._dmHistory.undo).toHaveLength(0);await act(async()=>c.onpointercancel(pointer(350,20)));expect(marks()).toBe(2);expect(c._dmHistory.undo).toHaveLength(1);c.onpointermove(pointer(380,20));expect(marks()).toBe(2);
  });
  it('includes coalesced samples and the dispatched endpoint',async()=>{
    await mount();const c=depth();await act(async()=>{c.onpointerdown(pointer(10,20));c.onpointermove(pointer(100,20,{getCoalescedEvents:()=>[pointer(40,20),pointer(70,20)]}));c.onpointerup(pointer(100,20));});expect(marks()).toBe(4);expect(c._dmHistory.undo).toHaveLength(1);
  });
  it('keeps clear and presets recoverable and clears redo on a new edit',async()=>{
    await mount();await stamp();await click('Clear');expect(marks()).toBe(0);await click('Undo depth edit');expect(marks()).toBe(1);await click('Use Sphere depth-map preset');expect(latest.stereoPreset).toBe('sphere');await click('Undo depth edit');expect(latest.stereoPreset).toBeNull();await stamp();expect(depth()._dmHistory.redo).toHaveLength(0);
  });
  it('bounds drawing history to twenty entries and ignores an unchanged clear',async()=>{
    await mount();await click('Clear');expect(depth()._dmHistory.undo).toHaveLength(0);for(let i=0;i<25;i++)await stamp();expect(depth()._dmHistory.undo).toHaveLength(20);for(let i=0;i<20;i++)await click('Undo depth edit');expect(marks()).toBe(5);
  });
  it('finishes every output row for export even when animation callbacks have not run',async()=>{
    await mount();expect(output().dataset.stereoRows).toBe('32');output()._stereoExportPNG();expect(output().dataset.stereoRows).toBe('512');expect(output().getAttribute('aria-busy')).toBe('false');const calls=output().getContext('2d').putImageData.mock.calls;const pixels=calls.at(-1)[0].data;expect(pixels.every((v,i)=>i%4!==3||v===255)).toBe(true);
  });
  it('updates output when settings change without remounting either canvas',async()=>{
    await mount();const d=depth(),o=output();o._stereoExportPNG();const before=o.getContext('2d').putImageData.mock.calls.at(-1)[0].data.slice();await act(async()=>edit({stereoSeed:999}));expect(depth()).toBe(d);expect(output()).toBe(o);o._stereoExportPNG();expect(o.getContext('2d').putImageData.mock.calls.at(-1)[0].data).not.toEqual(before);
  });
  it('cancels detached rendering work when leaving the static lab',async()=>{
    await mount();const o=output(),ctx=o.getContext('2d');const queued=[...frames.values()];await act(async()=>edit({tab:'harmonyHunt'}));expect(frames.size).toBe(0);const calls=ctx.putImageData.mock.calls.length;queued.forEach(fn=>fn());expect(ctx.putImageData).toHaveBeenCalledTimes(calls);
  });
  it('restores saved depth before drawing and ignores an obsolete image load',async()=>{
    const png='data:image/png;base64,'+btoa('8');await mount({stereoDepthSnapshot:png});const old=depth();expect(old._artStudioRestoring).toBe(true);old.onpointerdown(pointer(10,10));expect(marks()).toBe(0);await act(async()=>edit({stereoRestoreToken:'new-study',stereoDepthSnapshot:'data:image/png;base64,'+btoa('3')}));const current=setupDepth();expect(current).not.toBe(old);await act(async()=>images[0].onload());expect(marks()).toBe(0);await act(async()=>images[1].onload());expect(marks()).toBe(3);expect(current._artStudioRestoring).toBe(false);expect(output().dataset.stereoRows).toBe('32');
  });
  it('clears history for another learner or restored study',async()=>{
    await mount();await stamp();await act(async()=>profile('two'));setupDepth();expect(depth()._dmHistory.undo).toHaveLength(0);await act(async()=>images.at(-1).onload());await stamp();await act(async()=>edit({stereoRestoreToken:'restored'}));expect(depth()._dmHistory.undo).toHaveLength(0);
  });
  it('captures the painted depth and explicit rendering settings in studies',async()=>{
    await mount({stereoStrength:0,stereoSeed:0});await stamp();await click('Save current study');expect(saved).toHaveLength(1);expect(saved[0].data).toMatchObject({stereoDepthSnapshot:depth().toDataURL(),stereoStrength:0,stereoSeed:0,stereoDensity:100,stereoPattern:'bw'});expect(output().dataset.stereoRows).toBe('512');
  });
  it('waits for restored depth before capturing a saved study',async()=>{
    const snapshot='data:image/png;base64,'+btoa('8');await mount({stereoDepthSnapshot:snapshot});await click('Save current study');expect(saved).toHaveLength(0);await act(async()=>images[0].onload());expect(saved).toHaveLength(1);expect(saved[0].data.stereoDepthSnapshot).toBe(snapshot);expect(output().dataset.stereoRows).toBe('512');
  });
  it('cancels a waiting study capture when a different study replaces the canvas',async()=>{
    await mount({stereoDepthSnapshot:'data:image/png;base64,'+btoa('8')});await click('Save current study');await act(async()=>edit({stereoRestoreToken:'different'}));await act(async()=>images[0].onload());expect(saved).toHaveLength(0);
  });
  it('accepts late hydrated artwork and ignores superseded loads on the same canvas',async()=>{
    await mount();await stamp();const canvas=depth();await act(async()=>edit({stereoDepthSnapshot:'data:image/png;base64,'+btoa('5')}));expect(depth()).toBe(canvas);expect(canvas._dmHistory.undo).toHaveLength(0);await act(async()=>edit({stereoDepthSnapshot:'data:image/png;base64,'+btoa('9')}));await act(async()=>images[0].onload());expect(canvas._artStudioRestoring).toBe(true);expect(marks()).toBe(0);await act(async()=>images[1].onload());expect(marks()).toBe(9);expect(canvas._artStudioRestoring).toBe(false);
  });
});
