import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const {act}=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let root,host,config,latest,snapshots,edit,profile;
beforeEach(()=>{resetStemLab();config=loadTool('stem_lab/stem_tool_artstudio.js','artStudio');host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
async function mount(initial={}){
  function App(){const[data,setData]=React.useState({artStudio:{tab:'contrast',studioStarted:true,studioHome:false,...initial}});const[saved,setSaved]=React.useState([]);const[owner,setOwner]=React.useState('contrast-a');latest=data.artStudio;snapshots=saved;profile=setOwner;edit=patch=>setData(previous=>({artStudio:{...previous.artStudio,...patch}}));return config.render(makeCtx({toolData:data,setToolData:setData,toolSnapshots:saved,setToolSnapshots:setSaved,activeProfileId:owner}));}
  await act(async()=>root.render(React.createElement(App)));
}
const layout=()=>host.querySelector('[data-artstudio-contrast-layout]');
const field=role=>host.querySelector('#artstudio-contrast-'+role+'-hex');
const ratio=()=>Number(host.querySelector('[data-artstudio-contrast-ratio]').dataset.artstudioContrastRatio);
const button=text=>[...host.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
async function click(text){expect(button(text)).toBeTruthy();await act(async()=>button(text).click());}
async function input(selector,value){const node=host.querySelector(selector);expect(node).toBeTruthy();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));});return node;}
async function key(node,key,extra={}){await act(async()=>node.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra})));}
async function hex(role,value){await input('#artstudio-contrast-'+role+'-hex',value);await key(field(role),'Enter');}

describe('Art Studio Contrast Lab workflow',()=>{
  it('accepts exact hex colors, preserves neutral hue and rejects invalid drafts',async()=>{
    await mount({fgH:210});await hex('fg','#123456');expect(field('fg').value).toBe('#123456');await hex('bg','#abc');expect(field('bg').value).toBe('#aabbcc');const before=ratio();await hex('fg','#wrong');expect(field('fg').getAttribute('aria-invalid')).toBe('true');expect(ratio()).toBe(before);await key(field('fg'),'Escape');expect(field('fg').value).toBe('#123456');await hex('fg','#808080');expect(latest.fgH).toBe(210);expect(latest.fgS).toBe(0);
  });
  it('keeps an unchanged hex field from rounding the underlying HSL recipe',async()=>{
    await mount({fgH:30.25,fgS:80.5,fgL:45.125});const before=ratio();await act(async()=>{field('fg').focus();field('fg').blur();});expect(latest.fgL).toBe(45.125);expect(ratio()).toBe(before);expect(button('Undo contrast edit').disabled).toBe(true);
  });
  it('swaps exact roles without changing the ratio and supports undo/redo',async()=>{
    await mount();await hex('fg','#123456');await hex('bg','#abcdef');const before=ratio();await click('Swap colors');expect(field('fg').value).toBe('#abcdef');expect(field('bg').value).toBe('#123456');expect(ratio()).toBe(before);await click('Undo contrast edit');expect(field('fg').value).toBe('#123456');await click('Redo contrast edit');expect(field('bg').value).toBe('#123456');
  });
  it('groups a slider drag into one undo entry and preserves native text undo',async()=>{
    await mount();const slider=host.querySelector('#artstudio-contrast-fgL');await act(async()=>slider.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true})));await input('#artstudio-contrast-fgL',20);await input('#artstudio-contrast-fgL',40);await act(async()=>slider.dispatchEvent(new MouseEvent('pointerup',{bubbles:true})));await key(layout(),'z',{ctrlKey:true});expect(latest.fgL).toBe(0);expect(button('Undo contrast edit').disabled).toBe(true);await key(layout(),'z',{metaKey:true,shiftKey:true});expect(latest.fgL).toBe(40);await input('#artstudio-contrast-fg-hex','#abc');await key(field('fg'),'z',{ctrlKey:true});expect(latest.fgL).toBe(40);
  });
  it('ends cancelled drags and clears redo after a new edit',async()=>{
    await mount();const slider=host.querySelector('#artstudio-contrast-fgL');await act(async()=>slider.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true})));await input('#artstudio-contrast-fgL',20);await act(async()=>slider.dispatchEvent(new MouseEvent('pointercancel',{bubbles:true})));await input('#artstudio-contrast-fgL',40);await click('Undo contrast edit');expect(latest.fgL).toBe(20);await click('AAA normal text');expect(button('Redo contrast edit').disabled).toBe(true);
  });
  it('bounds undo history at thirty edits',async()=>{
    await mount();for(let i=1;i<=32;i++)await input('#artstudio-contrast-fgH',i);for(let i=0;i<30;i++)await click('Undo contrast edit');expect(latest.fgH).toBe(2);expect(button('Undo contrast edit').disabled).toBe(true);
  });
  it('finds a passing text color without changing background and undoes it',async()=>{
    await mount({fgHex:'#777777',bgHex:'#ffffff'});expect(ratio()).toBeLessThan(4.5);await click('Find passing text color');expect(field('fg').value).toBe('#767676');expect(field('bg').value).toBe('#ffffff');expect(ratio()).toBeGreaterThanOrEqual(4.5);expect(button('Find passing text color').disabled).toBe(true);await click('Undo contrast edit');expect(field('fg').value).toBe('#777777');
  });
  it('explains an unreachable AAA goal and can suggest a background for another pair',async()=>{
    await mount({fgL:50,bgL:50,contrastAccessibilityTarget:7});expect(button('Find passing text color').disabled).toBe(true);expect(host.textContent).toContain('Changing this color alone cannot reach');await hex('fg','#eeeeee');await hex('bg','#ffffff');await click('Find passing background');expect(ratio()).toBeGreaterThanOrEqual(7);expect(field('fg').value).toBe('#eeeeee');
  });
  it('never rounds a near-threshold failing ratio into a pass',async()=>{
    const v=1.055*((1.05/4.499-.05)**(1/2.4))-.055;await mount({fgL:v*100,bgL:100});expect(ratio()).toBeCloseTo(4.499,10);expect(host.querySelector('[data-artstudio-contrast-ratio]').textContent).toBe('4.50:1');expect(host.querySelector('#artstudio-contrast-goal-result').textContent).toContain('Does not meet');
  });
  it('resets history and drafts on project, learner, restore, and external recipe changes',async()=>{
    await mount();for(const change of [()=>edit({studioCurrentProjectRunId:'project-b'}),()=>profile('contrast-b'),()=>edit({contrastRestoreToken:'fork'}),()=>edit({fgH:170,fgL:25})]){await hex('fg','#123456');await input('#artstudio-contrast-bg-hex','#bad');await act(async()=>change());expect(button('Undo contrast edit').disabled).toBe(true);expect(field('bg').value).not.toBe('#bad');await hex('fg','#abcdef');}
  });
  it('retains exact palette colors in either role and can undo a full Thread Kit transfer',async()=>{
    await mount({studioFreeProjectId:'a',studioCurrentProjectRunId:'a',studioThreadKit:{schemaVersion:2,runs:[{schemaVersion:1,runId:'a',accessibilityTarget:7,palette:{sourceTab:'colorWheel',harmony:'custom',colors:[{h:210,s:65.3846153846154,l:20.392156862745097},{h:0,s:0,l:100}]}}]}});
    await act(async()=>host.querySelector('[aria-label="Use palette color 1 as Background"]').click());expect(field('bg').value).toBe('#123456');await click('Use palette + AAA goal in Contrast');expect(field('fg').value).toBe('#123456');expect(field('bg').value).toBe('#ffffff');expect(latest.contrastThreadKitApplied).toBe(true);await click('Undo contrast edit');expect(field('bg').value).toBe('#123456');expect(latest.contrastAccessibilityTarget).toBe(4.5);
  });
  it('saves both roles and the chosen goal in Thread Kit without changing unrelated art',async()=>{
    await mount({pixelData:{'2,2':'red'}});await hex('fg','#123456');await click('AAA normal text');await click('Save color pair to Thread Kit');const saved=latest.studioThreadKit.runs[0];expect(saved.accessibilityTarget).toBe(7);expect(saved.palette.colors).toEqual([{h:latest.fgH,s:latest.fgS,l:latest.fgL},{h:0,s:0,l:100}]);expect(latest.pixelData).toEqual({'2,2':'red'});
  });
  it('exports the exact preview HSL values as usable CSS',async()=>{
    await mount({fgH:30.25,fgS:80.5,fgL:45.125});const download=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});await click('Download contrast CSS');expect(download.mock.instances[0].download).toBe('contrast-pair.css');const css=decodeURIComponent(download.mock.instances[0].href.split(',')[1]);expect(css).toContain('color: hsl(30.25, 80.5%, 45.125%);');expect(css).toContain('background-color: hsl(0, 0%, 100%);');expect(css).toContain(ratio().toFixed(4)+':1');
  });
  it('keeps custom sample text as text and captures normalized default colors in studies',async()=>{
    await mount({fgH:Infinity,fgL:NaN,contrastSampleText:'<script>alert(1)</script>'});expect(host.querySelector('[data-artstudio-contrast-sample]').textContent).toContain('<script>');expect(host.querySelector('[data-artstudio-contrast-sample] script')).toBeNull();expect(ratio()).toBe(21);await act(async()=>host.querySelector('[aria-label="Save current study"]').click());expect(snapshots[0].data).toMatchObject({fgH:0,fgS:0,fgL:0,bgL:100,contrastAccessibilityTarget:4.5,contrastSampleText:'<script>alert(1)</script>'});
  });
});
