import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let root,host,config,latest,snapshots,edit,profile;
beforeEach(()=>{
  resetStemLab();config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){return this._ctx||(this._ctx=new Proxy({createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),getImageData:()=>({data:new Uint8ClampedArray(4)})},{get:(target,key)=>key in target?target[key]:()=>{}}));});
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,cGFsZXR0ZQ==');vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
  host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
async function mount(initial={}){
  function App(){const[data,setData]=React.useState({artStudio:{tab:'harmonyHunt',studioStarted:true,studioHome:false,studioFreeProjectId:'project-a',studioCurrentProjectRunId:'project-a',...initial}});const[saved,setSaved]=React.useState([]);const[owner,setOwner]=React.useState('harmony-a');latest=data.artStudio;snapshots=saved;profile=setOwner;edit=patch=>setData(previous=>({artStudio:{...previous.artStudio,...patch}}));return config.render(makeCtx({toolData:data,setToolData:setData,toolSnapshots:saved,setToolSnapshots:setSaved,activeProfileId:owner}));}
  await act(async()=>root.render(React.createElement(App)));
}
const layout=()=>host.querySelector('[data-artstudio-harmony]');
const swatches=()=>[...host.querySelectorAll('[data-harmony-swatch]')];
const colors=()=>swatches().map(node=>node.textContent);
const button=text=>[...host.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
async function click(text){expect(button(text)).toBeTruthy();await act(async()=>button(text).click());}
async function input(selector,value){const node=host.querySelector(selector);expect(node).toBeTruthy();await act(async()=>{const proto=node.tagName==='SELECT'?HTMLSelectElement.prototype:node.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(node,String(value));node.dispatchEvent(new Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}));});return node;}
async function key(node,key,extra={}){await act(async()=>node.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra})));}
const scheme=value=>input('[data-harmony-controls] select',value);

describe('Art Studio Harmony Lab workflow',()=>{
  it('keeps legacy colors and corrects the low-saturation classification',async()=>{
    await mount({_harmonyHunt:{baseHue:0,satBlend:10,litVar:0,rotation:0,paletteSize:6}});expect(swatches()).toHaveLength(6);expect(host.querySelector('#hh-saturation').value).toBe('54');expect(host.querySelector('#hh-lightness').value).toBe('40');expect(host.querySelector('#artstudio-harmony-wheel').getAttribute('aria-label')).toContain('Evenly spaced');expect(colors()[0]).toContain('0°');
  });
  it('exposes actual neighboring hues, spread controls, and the correct fixed color counts',async()=>{
    await mount();await scheme('analogous');expect(swatches()).toHaveLength(3);expect(host.querySelector('#hh-paletteSize').disabled).toBe(true);expect(host.querySelector('#hh-spread').disabled).toBe(false);await input('#hh-spread',10);expect(swatches().map(node=>node.querySelector('span').textContent)).toEqual(['200°','190°','210°']);await scheme('complementary');expect(swatches()).toHaveLength(2);expect(host.querySelector('#hh-spread').disabled).toBe(true);
  });
  it('does not change the hue relationship when saturation or lightness changes',async()=>{
    await mount();await scheme('triadic');await input('#hh-saturation',0);await input('#hh-lightness',0);expect(swatches().every(node=>node.textContent.includes('#000000'))).toBe(true);expect(host.querySelector('#artstudio-harmony-wheel').getAttribute('aria-label')).toContain('Triadic');
  });
  it('groups slider drags into one undo action and supports keyboard redo',async()=>{
    await mount();const before=colors(),slider=host.querySelector('#hh-baseHue');await act(async()=>slider.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true})));await input('#hh-baseHue',20);await input('#hh-baseHue',60);await act(async()=>slider.dispatchEvent(new MouseEvent('pointerup',{bubbles:true})));await key(layout(),'z',{ctrlKey:true});expect(colors()).toEqual(before);expect(button('Undo harmony edit').disabled).toBe(true);await key(layout(),'z',{metaKey:true,shiftKey:true});expect(latest._harmonyHunt.baseHue).toBe(60);
  });
  it('ends cancelled gestures, bounds history and clears redo after a fresh edit',async()=>{
    await mount();const slider=host.querySelector('#hh-baseHue');await act(async()=>slider.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true})));await input('#hh-baseHue',30);await act(async()=>slider.dispatchEvent(new MouseEvent('pointercancel',{bubbles:true})));for(let i=1;i<=32;i++)await input('#hh-baseHue',i);for(let i=0;i<30;i++)await click('Undo harmony edit');expect(latest._harmonyHunt.baseHue).toBe(2);expect(button('Undo harmony edit').disabled).toBe(true);await scheme('split');expect(button('Redo harmony edit').disabled).toBe(true);
  });
  it('keeps observations and experiment history when resetting or undoing the palette',async()=>{
    await mount({_harmonyHunt:{baseHue:30,hypothesis:'Original note',explanation:'Original explanation',understood:true}});await click('Log palette experiment');await scheme('split');await input('[data-artstudio-harmony] textarea','New note');await click('Reset palette');expect(latest._harmonyHunt).toMatchObject({baseHue:200,hypothesis:'New note',explanation:'Original explanation'});expect(latest._harmonyHunt.log).toHaveLength(1);await click('Undo harmony edit');expect(latest._harmonyHunt.scheme).toBe('split');expect(latest._harmonyHunt.hypothesis).toBe('New note');await key(host.querySelector('textarea'),'z',{ctrlKey:true});expect(latest._harmonyHunt.scheme).toBe('split');
  });
  it('restores a complete logged experiment and allows undoing that restore',async()=>{
    await mount();await scheme('tetradic');await input('#hh-spread',48);await input('#hh-rotation',-120);const saved=colors();await click('Log palette experiment');await scheme('analogous');await input('#hh-lightness',25);const changed=colors();await act(async()=>host.querySelector('[aria-label="Restore experiment 1"]').click());expect(colors()).toEqual(saved);await click('Undo harmony edit');expect(colors()).toEqual(changed);
  });
  it('bounds experiment logs to the newest eight, including legacy logs',async()=>{
    await mount({_harmonyHunt:{log:[{h:30,s:70,l:50,r:10,n:3,t:'triadic'}]}});await act(async()=>host.querySelector('[aria-label="Restore experiment 1"]').click());expect(latest._harmonyHunt).toMatchObject({baseHue:30,rotation:10,saturation:78,lightness:55,paletteSize:3});for(let i=0;i<9;i++){await input('#hh-baseHue',i);await click('Log palette experiment');}expect(latest._harmonyHunt.log).toHaveLength(8);expect(latest._harmonyHunt.log[0].recipe.baseHue).toBe(1);
  });
  it('clears history for another learner, project, restored study or external palette',async()=>{
    await mount();for(const change of [()=>profile('harmony-b'),()=>edit({studioCurrentProjectRunId:'project-b'}),()=>edit({harmonyRestoreToken:'fork'}),()=>edit({_harmonyHunt:{baseHue:90,scheme:'triadic'}})]){await input('#hh-baseHue',30);await act(async()=>change());expect(button('Undo harmony edit').disabled).toBe(true);await input('#hh-baseHue',60);}
  });
  it('clamps the selected swatch when changing to a smaller palette',async()=>{
    await mount();await act(async()=>swatches()[5].click());await scheme('complementary');expect(swatches()).toHaveLength(2);expect(swatches()[1].getAttribute('aria-pressed')).toBe('true');
  });
  it('saves eight colors with clear labeling while keeping all twelve in exports',async()=>{
    await mount();await input('#hh-paletteSize',12);expect(button('Save first 8 colors to Thread Kit')).toBeTruthy();await click('Save first 8 colors to Thread Kit');expect(latest.studioThreadKit.runs[0].palette.colors).toHaveLength(8);expect(swatches()).toHaveLength(12);const download=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});await click('Download harmony CSS');expect(decodeURIComponent(download.mock.instances[0].href)).toContain('--harmony-12:');
  });
  it('exports SVG artwork containing every displayed hex label and valid XML',async()=>{
    await mount();await scheme('split');const labels=swatches().map(node=>node.textContent.match(/#[0-9A-F]{6}/)[0]);const download=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});await click('Download harmony SVG');expect(download.mock.instances[0].download).toBe('harmony-palette.svg');const svg=decodeURIComponent(download.mock.instances[0].href.split(',')[1]);labels.forEach(label=>expect(svg).toContain(label));const parsed=new DOMParser().parseFromString(svg,'image/svg+xml');expect(parsed.querySelector('parsererror')).toBeNull();expect(parsed.documentElement.getAttribute('viewBox')).toBe('0 0 600 790');
  });
  it('sends the selected color to Pixel Art without replacing painted cells',async()=>{
    await mount({pixelData:{'2,2':'red'}});await scheme('complementary');await act(async()=>swatches()[1].click());await click('Use in Pixel Art');expect(latest).toMatchObject({tab:'pixel',pixelHue:20,pixelSat:78,pixelLit:55,pixelData:{'2,2':'red'}});
  });
  it('sends the selected color to Watercolor without replacing existing paint',async()=>{
    await mount({watercolorSnapshot:'saved-paint',watercolorBrushSize:19});const expected=swatches()[2].textContent.match(/#[0-9A-F]{6}/)[0].toLowerCase();await act(async()=>swatches()[2].click());await click('Paint in Watercolor');expect(latest).toMatchObject({tab:'watercolor',watercolorColor:expected,watercolorSnapshot:'saved-paint',watercolorBrushSize:19});
  });
  it('captures normalized recipes, experiments and written notes in saved studies',async()=>{
    await mount({_harmonyHunt:{baseHue:0,satBlend:0,litVar:0,hypothesis:'A note',log:[{h:20,n:4}]}});await act(async()=>host.querySelector('[aria-label="Save current study"]').click());expect(snapshots).toHaveLength(1);expect(snapshots[0].data._harmonyHunt).toMatchObject({baseHue:0,saturation:50,lightness:40,hypothesis:'A note',scheme:'even'});expect(snapshots[0].data._harmonyHunt.log[0].recipe.paletteSize).toBe(4);expect(snapshots[0].artStudioStudy.summary).toContain('hue 0 degrees');
  });
});
