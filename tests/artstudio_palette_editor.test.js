import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let host,root,config,latest,edit,profile,snapshots;
const baseColors=[{h:30,s:80,l:45},{h:150,s:80,l:45},{h:270,s:80,l:45}];
const palette=colors=>({sourceTab:'colorWheel',harmony:'triadic',colors:colors||baseColors});
const kit=colors=>({schemaVersion:2,runs:[{schemaVersion:1,runId:'project-a',accessibilityTarget:4.5,palette:palette(colors)}]});
beforeEach(()=>{
  resetStemLab();config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){return this._ctx||(this._ctx=new Proxy({createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),getImageData:()=>({data:new Uint8ClampedArray(4)})},{get:(target,key)=>key in target?target[key]:()=>{}}));});
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,cGFsZXR0ZQ==');
  vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
  host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
async function mount(initial={}){
  function App(){const[data,setData]=React.useState({artStudio:{tab:'colorWheel',studioStarted:true,studioHome:false,studioFreeProjectId:'project-a',studioCurrentProjectRunId:'project-a',studioThreadKit:kit(),...initial}});const[owner,setOwner]=React.useState('learner-a');const[saved,setSaved]=React.useState([]);latest=data.artStudio;snapshots=saved;profile=setOwner;edit=patch=>setData(previous=>({artStudio:{...previous.artStudio,...patch}}));return config.render(makeCtx({toolData:data,setToolData:setData,toolSnapshots:saved,setToolSnapshots:setSaved,activeProfileId:owner}));}
  await act(async()=>root.render(React.createElement(App)));
}
const editor=()=>host.querySelector('[data-artstudio-thread-kit]');
const swatches=()=>[...editor().querySelectorAll('[data-artstudio-kit-swatches] button')];
const selected=()=>swatches().findIndex(node=>node.getAttribute('aria-pressed')==='true');
const currentKit=()=>latest.studioThreadKit.runs.find(entry=>entry.runId===latest.studioCurrentProjectRunId);
const colors=()=>currentKit().palette?.colors||[];
const button=text=>[...editor().querySelectorAll('button')].find(node=>node.textContent.trim()===text);
async function click(text){expect(button(text)).toBeTruthy();await act(async()=>button(text).click());}
async function key(node,key,extra={}){await act(async()=>node.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,cancelable:true,key,...extra})));}
async function input(selector,value){const node=host.querySelector(selector);expect(node).toBeTruthy();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));});return node;}
async function hex(value){await input('#artstudio-kit-hex',value);await key(host.querySelector('#artstudio-kit-hex'),'Enter');}
async function select(index){await act(async()=>swatches()[index].click());}

describe('Art Studio project palette editor',()=>{
  it('shows numbered hex swatches and keeps editing separate from the active artwork',async()=>{
    await mount({hue:90,sat:70,lit:40,pixelData:{'0,0':'red'}});expect(swatches().map(node=>node.textContent)).toEqual(['1. #CF7317','2. #17CF73','3. #7317CF']);await select(1);await hex('#123456');
    expect(selected()).toBe(1);expect(swatches()[1].textContent).toContain('#123456');expect(latest).toMatchObject({hue:90,sat:70,lit:40,pixelData:{'0,0':'red'}});expect(currentKit().palette.harmony).toBe('custom');
  });
  it('preserves exact hex colors through Color Wheel capture and back',async()=>{
    await mount();const field=await input('[aria-label="Wheel hex color"]','#123456');await key(field,'Enter');const before=host.querySelector('#colorWheelCanvas')._captureArtStudioState();
    await click('Update palette in Thread Kit');expect(swatches()[0].textContent).toContain('#123456');expect(colors()[0]).toEqual({h:before.hue,s:before.sat,l:before.lit});
    await act(async()=>edit({hue:0,sat:100,lit:50}));await click('Use selected color in this tool');expect(host.querySelector('[aria-label="Wheel hex color"]').value).toBe('#123456');
  });
  it('retains valid zero/fractional channels, accepts legacy numeric strings, and filters malformed channels',async()=>{
    await mount({studioThreadKit:kit([{h:'359.75',s:'120',l:'0'},{h:-720.25,s:0,l:100},{h:null,s:50,l:50},{h:[],s:50,l:50},{h:true,s:50,l:50},{h:'',s:50,l:50},{h:Infinity,s:50,l:50}])});
    expect(swatches()).toHaveLength(2);await click('Use selected color in this tool');expect(latest).toMatchObject({hue:359.75,sat:100,lit:0});await select(1);await click('Use selected color in this tool');expect(latest).toMatchObject({hue:359.75,sat:0,lit:100});
  });
  it('keeps invalid drafts out of the palette and discards them with Escape',async()=>{
    await mount();const before=structuredClone(colors());await hex('#wrong');expect(host.querySelector('#artstudio-kit-hex').getAttribute('aria-invalid')).toBe('true');expect(colors()).toEqual(before);await key(host.querySelector('#artstudio-kit-hex'),'Escape');expect(host.querySelector('#artstudio-kit-hex').value).toBe('#cf7317');
  });
  it('does not round a recipe or add history when an unchanged hex field blurs',async()=>{
    await mount();await act(async()=>{host.querySelector('#artstudio-kit-hex').focus();host.querySelector('#artstudio-kit-hex').blur();});expect(colors()).toEqual(baseColors);expect(button('Undo palette edit').disabled).toBe(true);await hex('#cf7317');expect(button('Undo palette edit').disabled).toBe(true);
  });
  it('reorders the selected swatch and restores color order and scheme through undo/redo',async()=>{
    await mount();await select(1);await click('Move left');expect(colors().map(c=>c.h)).toEqual([150,30,270]);expect(selected()).toBe(0);expect(button('Move left').disabled).toBe(true);
    await click('Undo palette edit');expect(currentKit().palette).toEqual(palette());await click('Redo palette edit');expect(colors().map(c=>c.h)).toEqual([150,30,270]);await click('Move right');expect(colors().map(c=>c.h)).toEqual([30,150,270]);expect(selected()).toBe(1);
  });
  it('can remove the last swatch and restore the palette',async()=>{
    await mount({studioThreadKit:kit([baseColors[0]])});await click('Remove color');expect(colors()).toEqual([]);expect(host.querySelector('#artstudio-kit-hex')).toBeNull();await click('Undo palette edit');expect(colors()).toEqual([baseColors[0]]);await click('Redo palette edit');expect(colors()).toEqual([]);
  });
  it('retains first-edit undo when starting a palette creates a new project',async()=>{
    await mount({studioThreadKit:{},studioFreeProjectId:'',studioCurrentProjectRunId:'',hue:42.5,sat:70.25,lit:31.125});await click('Add current color');expect(latest.studioCurrentProjectRunId).toMatch(/^free-/);expect(colors()).toEqual([{h:42.5,s:70.25,l:31.125}]);expect(button('Undo palette edit').disabled).toBe(false);await click('Undo palette edit');expect(colors()).toEqual([]);await click('Redo palette edit');expect(colors()).toHaveLength(1);
  });
  it('bounds palettes at eight colors and undo history at thirty edits',async()=>{
    await mount({studioThreadKit:kit(Array.from({length:8},(_,i)=>({h:i*30,s:80,l:50})))});expect(button('Add current color').disabled).toBe(true);
    for(let i=0;i<32;i++)await hex('#1234'+i.toString(16).padStart(2,'0'));
    for(let i=0;i<30;i++)await click('Undo palette edit');expect(button('Undo palette edit').disabled).toBe(true);expect(swatches()[0].textContent).toContain('#123401');
  });
  it('supports keyboard undo, preserves native text undo, and clears redo after branching',async()=>{
    await mount();await hex('#123456');await key(editor(),'z',{ctrlKey:true});expect(colors()).toEqual(baseColors);await key(editor(),'z',{metaKey:true,shiftKey:true});expect(swatches()[0].textContent).toContain('#123456');
    await input('#artstudio-kit-hex','#abc');await key(host.querySelector('#artstudio-kit-hex'),'z',{ctrlKey:true});expect(swatches()[0].textContent).toContain('#123456');await key(host.querySelector('#artstudio-kit-hex'),'Escape');await click('Undo palette edit');await click('Remove color');expect(button('Redo palette edit').disabled).toBe(true);
  });
  it('keeps a changed contrast goal when undoing a palette edit',async()=>{
    await mount();await hex('#123456');await click('AAA 7:1');await click('Undo palette edit');expect(colors()).toEqual(baseColors);expect(currentKit().accessibilityTarget).toBe(7);
  });
  it('isolates palette edits, drafts and history by project and learner',async()=>{
    await mount({studioThreadKit:{schemaVersion:2,runs:[...kit().runs,{schemaVersion:1,runId:'project-b',accessibilityTarget:7,palette:palette([{h:200,s:40,l:60}])}]}});await hex('#123456');await input('#artstudio-kit-hex','#bad');await act(async()=>edit({studioCurrentProjectRunId:'project-b',studioFreeProjectId:'project-b'}));
    expect(colors()).toEqual([{h:200,s:40,l:60}]);expect(button('Undo palette edit').disabled).toBe(true);expect(host.querySelector('#artstudio-kit-hex').value).not.toBe('#bad');expect(latest.studioThreadKit.runs[0].palette.colors[0].l).not.toBe(45);
    await hex('#123456');await act(async()=>profile('learner-b'));expect(button('Undo palette edit').disabled).toBe(true);
  });
  it('clears palette history when a newly captured palette replaces it',async()=>{
    await mount();await hex('#123456');await click('Update palette in Thread Kit');expect(button('Undo palette edit').disabled).toBe(true);expect(colors()[0]).toEqual({h:0,s:100,l:50});
  });
  it('applies an exact color to the pixel brush and custom palette without recoloring saved cells',async()=>{
    await mount({tab:'pixel',pixelData:{'2,2':'red'},symHue:47});await hex('#123456');const color=structuredClone(colors()[0]);await click('Use palette in Pixel Art');expect(latest.pixelCustomPalette[0]).toEqual(color);expect(latest).toMatchObject({pixelHue:color.h,pixelSat:color.s,pixelLit:color.l,pixelData:{'2,2':'red'},symHue:47});
    await act(async()=>[...host.querySelectorAll('button')].find(node=>node.getAttribute('aria-label')==='Use Thread Kit color 1 for Custom pixel color').click());expect(latest).toMatchObject({pixelHue:color.h,pixelSat:color.s,pixelLit:color.l});
    const slider=await input('#artstudio-pixel-lightness','55');expect(slider.value).toBe('55');expect(latest.pixelSat).toBe(color.s);
  });
  it('round-trips fractional palette channels through Gradient Lab',async()=>{
    await mount({tab:'gradient'});await hex('#123456');const before=structuredClone(colors());await click('Use Thread Kit colors in Gradient');expect(latest.gradStops[0]).toMatchObject({hue:before[0].h,sat:before[0].s,lit:before[0].l});await click('Add gradient palette to Thread Kit');expect(colors()).toEqual(before);expect(swatches()[0].textContent).toContain('#123456');
  });
  it('applies an edited palette color to either mixer input and allows mixer undo',async()=>{
    await mount({tab:'mixer'});await hex('#123456');await click('Use selected color as Color A');expect(host.querySelector('[aria-label="Color A Hex color"]').value).toBe('#123456');await click('Use selected color as Color B');expect(host.querySelector('[aria-label="Color B Hex color"]').value).toBe('#123456');
    const undo=[...host.querySelectorAll('button')].find(node=>node.textContent==='Undo mixer edit');await act(async()=>undo.click());expect(host.querySelector('[aria-label="Color B Hex color"]').value).not.toBe('#123456');
  });
  it('applies an edited color to Watercolor without replacing existing paint or brush settings',async()=>{
    await mount({tab:'watercolor',watercolorSnapshot:'saved-paint',watercolorBrushSize:19});await hex('#123456');await click('Use selected color in this tool');expect(latest).toMatchObject({watercolorColor:'#123456',watercolorSnapshot:'saved-paint',watercolorBrushSize:19});
  });
  it('exports the displayed colors in their current order as valid CSS custom properties',async()=>{
    await mount();await hex('#123456');await click('Move right');const download=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});await click('Download palette CSS');expect(download.mock.instances[0].download).toBe('art-studio-palette.css');const css=decodeURIComponent(download.mock.instances[0].href.split(',')[1]);expect(css).toBe(':root {\n  --palette-1: #17cf73;\n  --palette-2: #123456;\n  --palette-3: #7317cf;\n}\n');
  });
  it('captures an applied fractional palette in a saved Pixel Art study',async()=>{
    await mount({tab:'pixel'});await hex('#123456');await click('Use palette in Pixel Art');await act(async()=>host.querySelector('[aria-label="Save current study"]').click());expect(snapshots).toHaveLength(1);expect(snapshots[0].data.pixelCustomPalette).toEqual(colors());
  });
});
