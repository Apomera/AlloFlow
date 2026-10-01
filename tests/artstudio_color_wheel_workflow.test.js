import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let root,host,config,latest,snapshots,edit,profile,announce,raf;
beforeEach(()=>{
  resetStemLab();config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');announce=vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){return this._ctx||(this._ctx=new Proxy({fillRect:vi.fn(),arc:vi.fn(),drawImage:vi.fn(),createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),getImageData:()=>({data:new Uint8ClampedArray(4)})},{get:(target,key)=>key in target?target[key]:()=>{}}));});
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,d2hlZWw=');
  raf=vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
  host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
async function mount(initial={}){
  function App(){const[data,setData]=React.useState({artStudio:{tab:'colorWheel',studioStarted:true,studioHome:false,...initial}});const[saved,setSaved]=React.useState([]);const[owner,setOwner]=React.useState('wheel-a');latest=data.artStudio;snapshots=saved;profile=setOwner;edit=patch=>setData(previous=>({artStudio:{...previous.artStudio,...patch}}));return config.render(makeCtx({toolData:data,setToolData:setData,toolSnapshots:saved,setToolSnapshots:setSaved,activeProfileId:owner,announceToSR:announce}));}
  await act(async()=>root.render(React.createElement(App)));
}
const canvas=()=>host.querySelector('#colorWheelCanvas');
const capture=()=>canvas()._captureArtStudioState();
const field=()=>host.querySelector('[aria-label="Wheel hex color"]');
const button=text=>[...host.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
async function click(text){expect(button(text)).toBeTruthy();await act(async()=>button(text).click());}
async function input(selector,value){const node=host.querySelector(selector);expect(node).toBeTruthy();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));});return node;}
async function key(node,key,extra={}){await act(async()=>node.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra})));}
async function hex(value){await input('[aria-label="Wheel hex color"]',value);await key(field(),'Enter');}
async function pointer(type,hue,extra={}){
  const node=canvas();node.getBoundingClientRect=()=>({left:10,top:20,width:454,height:454});
  node.style.border='2px solid black';node.setPointerCapture=vi.fn();node.hasPointerCapture=()=>true;node.releasePointerCapture=vi.fn();
  const rad=(hue-90)*Math.PI/180,r=147,event=new MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:237+Math.cos(rad)*r,clientY:247+Math.sin(rad)*r,...extra});
  Object.defineProperty(event,'pointerId',{value:extra.pointerId??1});Object.defineProperty(event,'isPrimary',{value:extra.isPrimary??true});
  await act(async()=>node.dispatchEvent(event));
}

describe('Art Studio Color Wheel workflow',()=>{
  it('renders a large wheel, numbered matching swatches, and stays idle without requesting animation',async()=>{
    await mount({hue:30,harmony:'triadic'});expect(canvas().width).toBe(900);expect(canvas().height).toBe(900);expect(host.querySelectorAll('[data-artstudio-wheel-swatches] button')).toHaveLength(3);expect(raf).not.toHaveBeenCalled();
    const ring=canvas()._wheelRing;await input('#artstudio-color-hue',90);expect(canvas()._wheelRing).toBe(ring);await input('#artstudio-color-sat',40);expect(canvas()._wheelRing).not.toBe(ring);expect(raf).not.toHaveBeenCalled();
  });
  it('normalizes non-finite and out-of-range saved values and preserves meaningful zeros',async()=>{
    await mount({hue:Infinity,sat:-5,lit:120,harmony:'invalid'});expect(capture()).toEqual({hue:0,sat:0,lit:100,harmony:'complementary'});expect(field().value).toBe('#ffffff');
    await act(async()=>edit({hue:-725,sat:NaN,lit:0}));expect(capture()).toEqual({hue:355,sat:100,lit:0,harmony:'complementary'});expect(field().value).toBe('#000000');
  });
  it('commits exact three- and six-digit hex colors and rejects invalid drafts',async()=>{
    await mount();await hex('#abc');expect(field().value).toBe('#aabbcc');await hex('#123456');expect(field().value).toBe('#123456');const valid=capture();
    await hex('#error');expect(field().getAttribute('aria-invalid')).toBe('true');expect(capture()).toEqual(valid);await key(field(),'Escape');expect(field().value).toBe('#123456');
    await hex('#ABCDEF');expect(field().value).toBe('#abcdef');
  });
  it('retains the chosen hue when entering a neutral color',async()=>{
    await mount({hue:210});await hex('#808080');expect(capture().hue).toBe(210);expect(capture().sat).toBe(0);await input('#artstudio-color-sat',100);expect(capture().hue).toBe(210);
  });
  it('does not round the HSL recipe or add history when an unchanged hex field loses focus',async()=>{
    await mount({hue:30,sat:80,lit:45});const before=capture();await act(async()=>{field().focus();field().blur();});expect(capture()).toEqual(before);expect(button('Undo color edit').disabled).toBe(true);
    await hex('#cf7317');expect(capture()).toEqual(before);expect(button('Undo color edit').disabled).toBe(true);
  });
  it('ignores an old drag after an external color recipe replaces the current state',async()=>{
    await mount();await pointer('pointerdown',90);await act(async()=>edit({hue:45,sat:60}));const replacement=capture();await pointer('pointermove',180);await pointer('pointerup',270);expect(capture()).toEqual(replacement);expect(button('Undo color edit').disabled).toBe(true);
  });
  it('includes the release endpoint of a drag and undoes the entire gesture',async()=>{
    await mount();const before=capture(),node=canvas();await pointer('pointerdown',90);await pointer('pointermove',150);await pointer('pointerup',220);expect(canvas()).toBe(node);expect(capture().hue).toBe(220);
    await click('Undo color edit');expect(capture()).toEqual(before);expect(button('Undo color edit').disabled).toBe(true);await click('Redo color edit');expect(capture().hue).toBe(220);
  });
  it('ignores secondary pointers and center presses while honoring the captured pointer',async()=>{
    await mount();await pointer('pointerdown',90,{pointerId:2,isPrimary:false});expect(capture().hue).toBe(0);
    await pointer('pointerdown',90,{clientX:237,clientY:247});expect(capture().hue).toBe(0);await pointer('pointerdown',90);await pointer('pointermove',180,{pointerId:2});await pointer('pointerup',270,{pointerId:2});expect(capture().hue).toBe(90);await pointer('pointerup',180);expect(capture().hue).toBe(180);
  });
  it('ends cancelled and lost-capture gestures so the next edit has its own undo step',async()=>{
    await mount();await pointer('pointerdown',90);await pointer('pointercancel',120);expect(capture().hue).toBe(90);await pointer('pointerdown',180);await pointer('lostpointercapture',240);expect(capture().hue).toBe(180);
    await click('Undo color edit');expect(capture().hue).toBe(90);await click('Undo color edit');expect(capture().hue).toBe(0);
  });
  it('groups repeated slider changes while preserving keyboard history and clearing redo',async()=>{
    await mount();const slider=host.querySelector('#artstudio-color-sat');await act(async()=>slider.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true})));
    await input('#artstudio-color-sat',50);await input('#artstudio-color-sat',30);await act(async()=>slider.dispatchEvent(new MouseEvent('pointerup',{bubbles:true})));
    await key(canvas(),'z',{ctrlKey:true});expect(capture().sat).toBe(100);await key(canvas(),'y',{ctrlKey:true});expect(capture().sat).toBe(30);await click('Undo color edit');await click('triadic');expect(button('Redo color edit').disabled).toBe(true);
  });
  it('keeps native text undo separate from palette history',async()=>{
    await mount();await click('triadic');await input('[aria-label="Wheel hex color"]','#bad');await key(field(),'z',{ctrlKey:true});expect(capture().harmony).toBe('triadic');
  });
  it('rotates the base hue through each harmony without changing saturation or lightness',async()=>{
    await mount({hue:350,sat:72,lit:45});await click('analogous');const swatches=()=>[...host.querySelectorAll('[data-artstudio-wheel-swatches] button')];expect(swatches().map(node=>node.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('320°'),expect.stringContaining('350°'),expect.stringContaining('20°')]));
    await act(async()=>swatches()[2].click());expect(capture()).toMatchObject({hue:20,sat:72,lit:45});await click('Undo color edit');expect(capture().hue).toBe(350);
  });
  it('changes only lightness through the tone samples',async()=>{
    await mount({hue:210,sat:36,lit:50});await act(async()=>host.querySelector('button[aria-label^="Use 10% lightness"]').click());expect(capture()).toMatchObject({hue:210,sat:36,lit:10});await click('Undo color edit');expect(capture().lit).toBe(50);
  });
  it('exports a matching wheel PNG and standalone SVG containing all harmony colors',async()=>{
    await mount({hue:30,harmony:'triadic'});const download=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});await click('Export wheel PNG');expect(download.mock.instances[0].download).toBe('color-wheel-triadic.png');expect(download.mock.instances[0].href).toBe(canvas().toDataURL());
    await click('Export palette SVG');const svg=decodeURIComponent(download.mock.instances[1].href.split(',')[1]);const document=new DOMParser().parseFromString(svg,'image/svg+xml');expect(document.querySelector('parsererror')).toBeNull();expect([...document.querySelectorAll('rect[rx]')].map(node=>node.getAttribute('fill'))).toEqual(['#ff8000','#00ff80','#8000ff']);
  });
  it('stores the visible harmony in the current project Thread Kit',async()=>{
    await mount({hue:30,sat:80,lit:45,harmony:'triadic',studioFreeProjectId:'wheel-project',studioCurrentProjectRunId:'wheel-project'});await click('Save harmony to Thread Kit');const kit=latest.studioThreadKit.runs.find(entry=>entry.runId==='wheel-project');expect(kit.palette).toMatchObject({sourceTab:'colorWheel',harmony:'triadic',colors:[{h:30,s:80,l:45},{h:150,s:80,l:45},{h:270,s:80,l:45}]});
  });
  it('transfers the selected color to Watercolor without overwriting existing paint',async()=>{
    await mount({watercolorSnapshot:'existing',watercolorBrushSize:17});await hex('#13579b');await click('Paint with this color');expect(latest).toMatchObject({tab:'watercolor',watercolorColor:'#13579b',watercolorSnapshot:'existing',watercolorBrushSize:17});
  });
  it('preserves canvas identity in Focus view and restores colors on a tab round trip',async()=>{
    await mount();await hex('#13579b');const before=capture(),node=canvas();await click('Focus workspace');expect(canvas()).toBe(node);await act(async()=>edit({tab:'gradient'}));await act(async()=>edit({tab:'colorWheel'}));expect(capture()).toEqual(before);
  });
  it('saves normalized values and a preview, then starts fresh history when forking the study',async()=>{
    await mount();await hex('#123456');await click('triadic');const before=capture();await act(async()=>host.querySelector('[aria-label="Save current study"]').click());expect(snapshots[0].data).toMatchObject(before);expect(snapshots[0].artStudioStudy.previewSrc).toContain('data:image/');await click('analogous');
    await act(async()=>host.querySelector('#artstudio-process-button').click());await act(async()=>host.querySelector('button[aria-label^="Fork Color Wheel"]').click());expect(capture()).toEqual(before);expect(button('Undo color edit').disabled).toBe(true);
  });
  it('clears history and remounts the canvas on a learner change or external recipe replacement',async()=>{
    await mount();await click('triadic');const previous=canvas();await act(async()=>profile('wheel-b'));expect(canvas()).not.toBe(previous);expect(button('Undo color edit').disabled).toBe(true);
    await click('analogous');await act(async()=>edit({hue:120}));expect(button('Undo color edit').disabled).toBe(true);
  });
  it('keeps color controls usable if a canvas context is unavailable',async()=>{
    HTMLCanvasElement.prototype.getContext.mockReturnValue(null);await mount();await hex('#123456');expect(capture()).toMatchObject({harmony:'complementary'});expect(field().value).toBe('#123456');
  });
});
