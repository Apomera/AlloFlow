import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let root,host,config,latest,snapshots,edit,profile,handoff,toast,setStudies;
beforeEach(()=>{
  resetStemLab();config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');handoff=vi.fn();toast=vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){if(!this._ctx)this._ctx=new Proxy({fillRect:vi.fn(),fillText:vi.fn(),drawImage:vi.fn(),createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),getImageData:()=>({data:new Uint8ClampedArray(4)})},{get:(target,key)=>key in target?target[key]:()=>{}});return this._ctx;});
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,bWl4');
  vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
  host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
async function mount(initial={}){
  function App(){const [data,setData]=React.useState({artStudio:{tab:'mixer',studioStarted:true,studioHome:false,...initial}});const[saved,setSaved]=React.useState([]);const[owner,setOwner]=React.useState('mix-a');latest=data.artStudio;snapshots=saved;setStudies=setSaved;profile=setOwner;edit=patch=>setData(previous=>({artStudio:{...previous.artStudio,...patch}}));return config.render(makeCtx({toolData:data,setToolData:setData,toolSnapshots:saved,setToolSnapshots:setSaved,activeProfileId:owner,onUseArtwork:handoff,addToast:toast}));}
  await act(async()=>root.render(React.createElement(App)));
}
const canvas=()=>host.querySelector('#mixerCanvas');
const result=()=>host.querySelector('#artstudio-mix-result').textContent;
const capture=()=>canvas()._captureArtStudioState();
async function click(text){const button=[...host.querySelectorAll('button')].find(node=>node.textContent.trim()===text);expect(button).toBeTruthy();await act(async()=>button.click());}
async function input(selector,value,eventType='input'){
  const node=host.querySelector(selector);expect(node).toBeTruthy();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event(eventType,{bubbles:true}));});return node;
}
async function key(node,value,extra={}){await act(async()=>node.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...extra})));}
async function hex(index,value){const node=await input('[aria-label="Color '+(index===1?'A':'B')+' Hex color"]',value);await key(node,'Enter');return node;}

describe('Art Studio mixer workflow',()=>{
  it('renders a large accessible mix sheet and distinguishes all four mixing rules',async()=>{
    await mount();expect(canvas().width).toBe(960);expect(canvas().height).toBe(520);expect(result()).toContain('#3D933E');expect(canvas().getAttribute('aria-label')).toContain('50% A + 50% B');
    for(const label of ['Linear light','RGB blend','Hue blend','Pigment']){await click(label);expect(result()).toContain(label);}
    expect(host.querySelectorAll('[data-artstudio-mixer-palette] button')).toHaveLength(7);
  });
  it('selects both pure endpoints and commits zero HSL values',async()=>{
    await mount({mix1H:0,mix1S:100,mix1L:50,mix2H:200,mix2S:90,mix2L:50});
    await input('#artstudio-mix-ratio',0);expect(capture().mixRatio).toBe(0);expect(result()).toContain('#FF0000');
    await input('[aria-label="Color A Lightness %"]',0);expect(capture().mix1L).toBe(0);expect(result()).toContain('#000000');
    await input('#artstudio-mix-ratio',100);expect(capture().mixRatio).toBe(1);expect(result()).not.toContain('#000000');
    await input('[aria-label="Color B Saturation %"]',0);expect(capture().mix2S).toBe(0);expect(result()).toContain('#808080');
  });
  it('supports exact hex input and keeps invalid drafts out of the artwork',async()=>{
    await mount();await hex(1,'#abc');await input('#artstudio-mix-ratio',0);expect(result()).toContain('#AABBCC');
    const before=capture(),field=await hex(1,'#hello');expect(field.getAttribute('aria-invalid')).toBe('true');expect(capture()).toEqual(before);
    await key(field,'Escape');expect(field.value).toBe('#aabbcc');expect(field.getAttribute('aria-invalid')).toBe('false');
  });
  it('swaps inputs and complements the ratio without changing the result',async()=>{
    await mount();await input('#artstudio-mix-ratio',20);const before=result(),state=capture();await click('Swap A and B');
    expect(capture().mix1H).toBe(state.mix2H);expect(capture().mixRatio).toBe(.8);expect(result()).toBe(before);
  });
  it('groups a continuous slider gesture into one undo and redo',async()=>{
    await mount();const before=capture(),slider=host.querySelector('#artstudio-mix-ratio');
    await act(async()=>slider.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true})));await input('#artstudio-mix-ratio',20);await input('#artstudio-mix-ratio',30);
    await act(async()=>slider.dispatchEvent(new MouseEvent('pointerup',{bubbles:true})));const after=capture();await click('Undo mixer edit');expect(capture()).toEqual(before);await click('Redo mixer edit');expect(capture()).toEqual(after);
  });
  it('supports keyboard history and clears redo after a new change',async()=>{
    await mount();const before=capture();await click('Black + white');const modified=capture();await key(host.querySelector('#artstudio-mix-ratio'),'z',{ctrlKey:true});expect(capture()).toEqual(before);
    await key(host.querySelector('#artstudio-mix-ratio'),'z',{ctrlKey:true,shiftKey:true});expect(capture()).toEqual(modified);
    await click('Undo mixer edit');await click('RGB blend');expect([...host.querySelectorAll('button')].find(node=>node.textContent==='Redo mixer edit').disabled).toBe(true);
  });
  it('reuses a result as a source color and undoes the complete change',async()=>{
    await mount();const before=capture();await click('Use result as Color A');await input('#artstudio-mix-ratio',0);expect(result()).toContain('#3D933E');
    await click('Undo mixer edit');await click('Undo mixer edit');expect(capture()).toEqual(before);
  });
  it('chooses an exact palette ratio and exports the current sheet',async()=>{
    await mount();await act(async()=>host.querySelectorAll('[data-artstudio-mixer-palette] button')[1].click());expect(capture().mixRatio).toBe(1/6);
    const clickLink=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});await click('Export mix sheet PNG');expect(clickLink).toHaveBeenCalledOnce();
    expect(clickLink.mock.instances[0].download).toBe('color-mix-pigment.png');expect(clickLink.mock.instances[0].href).toBe(canvas().toDataURL());
  });
  it('adds the seven mixture colors to the existing project Thread Kit',async()=>{
    await mount({studioFreeProjectId:'mix-project',studioCurrentProjectRunId:'mix-project'});await click('Add mix palette to Thread Kit');
    const kit=latest.studioThreadKit.runs.find(entry=>entry.runId==='mix-project');expect(kit.palette.sourceTab).toBe('mixer');expect(kit.palette.colors).toHaveLength(7);expect(kit.accessibilityTarget).toBe(4.5);
  });
  it('transfers the result to Watercolor without replacing existing paint metadata',async()=>{
    await mount({watercolorColor:'#123456',watercolorSnapshot:'existing-paint',watercolorBrushSize:17});await click('Paint with this mix');
    expect(latest.tab).toBe('watercolor');expect(latest.watercolorColor).toBe('#3d933e');expect(latest.watercolorSnapshot).toBe('existing-paint');expect(latest.watercolorBrushSize).toBe(17);
  });
  it('saves the normalized recipe, accurate summary, and preview, then forks it without carrying undo history',async()=>{
    await mount();await click('Black + white');await click('Linear light');await input('#artstudio-mix-ratio',0);
    await act(async()=>host.querySelector('[aria-label="Save current study"]').click());expect(snapshots).toHaveLength(1);const study=snapshots[0];expect(study.data.mixRatio).toBe(0);expect(study.data.mixMode).toBe('light');expect(study.artStudioStudy.summary).toContain('100% A + 0% B');expect(study.artStudioStudy.previewSrc).toContain('data:image/');
    await input('#artstudio-mix-ratio',90);await act(async()=>host.querySelector('#artstudio-process-button').click());await act(async()=>host.querySelector('button[aria-label^="Fork Color Mixer"]').click());
    expect(capture().mixRatio).toBe(0);expect([...host.querySelectorAll('button')].find(node=>node.textContent==='Undo mixer edit').disabled).toBe(true);
  });
  it('remounts the preview and clears history when the learner changes',async()=>{
    await mount();await click('RGB blend');const old=canvas();await act(async()=>profile('mix-b'));expect(canvas()).not.toBe(old);expect([...host.querySelectorAll('button')].find(node=>node.textContent==='Undo mixer edit').disabled).toBe(true);
  });
  it('restores untouched older studies to their original default hue mixture',async()=>{
    await mount();await act(async()=>host.querySelector('[aria-label="Save current study"]').click());
    const legacy={...snapshots[0],data:{tab:'mixer'}};await act(async()=>setStudies([legacy]));
    await act(async()=>host.querySelector('#artstudio-process-button').click());await act(async()=>host.querySelector('button[aria-label^="Fork Color Mixer"]').click());
    expect(capture()).toMatchObject({mixMode:'hsl',mix1H:0,mix1S:100,mix1L:50,mix2H:200,mix2S:100,mix2L:50,mixRatio:.5});expect(result()).toContain('#AA00FF');
  });
  it('exposes the mixer image to the existing artwork handoff',async()=>{
    await mount();const button=host.querySelector('button[title*="Page Designer"]');expect(button).toBeTruthy();await act(async()=>button.click());expect(handoff).toHaveBeenCalledOnce();expect(handoff.mock.calls[0][0]).toMatchObject({sourceTab:'mixer',src:'data:image/png;base64,bWl4'});
  });
});
