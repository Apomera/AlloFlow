import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const {act}=React;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const originalBench={mode:'parallel',voltage:7,components:[{id:40,type:'resistor',value:470}]};
const observations=[{before:originalBench,after:{...originalBench,voltage:14},delta:7/470,prediction:'My question',explanation:'Keep my notebook',changes:['Supply voltage'],controlled:true}];

describe('Circuit lesson navigation',()=>{
  let host,root,config,latest,frames,scrollOriginal,setLocale;
  const chooser=()=>host.querySelector('details.circuit-lesson-chooser');
  const button=text=>Array.from(host.querySelectorAll('button')).find(el=>el.textContent===text);
  const card=title=>Array.from(chooser().querySelectorAll('.circuit-lesson-cards button')).find(el=>el.querySelector('strong')?.textContent===title);
  const protectedState=()=>JSON.stringify({mode:latest._circuit.mode,voltage:latest._circuit.voltage,components:latest._circuit.components,undo:latest._circuit.undo,redo:latest._circuit.redo,prediction:latest._circuit.prediction,observations:latest._circuit.observations});
  async function flushFrames(){for(let i=0;i<5&&frames.length;i++)await act(async()=>frames.splice(0).forEach(fn=>fn(0)));}
  async function click(element){expect(element).toBeDefined();await act(async()=>element.click());await flushFrames();}
  async function toggleChooser(open){await act(async()=>{chooser().open=open;chooser().dispatchEvent(new Event('toggle'));});await flushFrames();}
  async function mount(circuit={}){
    const seed={_circuit:{...originalBench,pauseMotion:true,lessonOpen:true,prediction:'Keep my prediction',observations,undo:[],redo:[],...circuit},_circuitNetwork:{reflection:'Keep my network notes'}};
    function Harness(){const [toolData,setToolData]=React.useState(seed),[locale,updateLocale]=React.useState('');latest=toolData;setLocale=updateLocale;return config.render(makeCtx({toolData,setToolData,t:(_key,fallback)=>locale+fallback}));}
    await act(async()=>root.render(React.createElement(Harness)));await flushFrames();
  }
  beforeEach(()=>{
    const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:0})},{get:(obj,key)=>obj[key]||(()=>{})});
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
    frames=[];vi.stubGlobal('requestAnimationFrame',fn=>{frames.push(fn);return frames.length;});
    scrollOriginal=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=vi.fn();
    resetStemLab();config=loadTool('stem_lab/stem_tool_circuit.js','circuit');
    host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
  });
  afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();if(scrollOriginal)Element.prototype.scrollIntoView=scrollOriginal;else delete Element.prototype.scrollIntoView;});

  it('offers the chooser on a new bench without loading a circuit or moving focus',async()=>{
    await mount({components:[]});
    expect(chooser().open).toBe(true);expect(chooser().querySelectorAll('.circuit-lesson-cards button')).toHaveLength(3);
    expect(latest._circuit.components).toEqual([]);expect(latest._circuit.undo).toEqual([]);
    expect(host.contains(document.activeElement)).toBe(false);
    expect(host.querySelector('.circuit-lesson-progress').getAttribute('data-active')).not.toBe('true');
  });
  it('starts an existing lesson with a closed chooser, its title, and active progress',async()=>{
    await mount({lessonId:'loop',lessonChoice:1});
    expect(chooser().open).toBe(false);expect(chooser().querySelector('summary').textContent).toContain('Change experiment');
    expect(chooser().querySelector('summary small').textContent).toContain('Complete the loop');
    expect(host.querySelector('.circuit-lesson-progress').getAttribute('data-active')).toBe('true');
    expect(chooser().textContent).toContain('Your prediction, evidence, and explanation');
    expect(Array.from(host.querySelectorAll('.circuit-lessons > p')).some(el=>el.textContent.includes('Your prediction, evidence, and explanation'))).toBe(false);
  });
  it('opens and closes the chooser without changing any saved state',async()=>{
    await mount({lessonId:'loop',lessonChoice:1,lessonExplanation:'Keep this draft.'});
    const before=JSON.stringify(latest),reference=latest;
    await toggleChooser(true);expect(chooser().open).toBe(true);expect(JSON.stringify(latest)).toBe(before);expect(latest).toBe(reference);
    await toggleChooser(false);expect(chooser().open).toBe(false);expect(JSON.stringify(latest)).toBe(before);expect(latest).toBe(reference);
  });
  it('selects a new question, closes the chooser, and makes its baseline undoable',async()=>{
    await mount();const before=JSON.parse(protectedState());
    await click(card('Turn down the current'));
    expect(chooser().open).toBe(false);expect(document.activeElement.id).toBe('circuit-lesson-question');
    expect(latest._circuit).toMatchObject({lessonId:'resistance',mode:'series',voltage:9,components:[{type:'resistor',id:1,value:100}]});
    expect(latest._circuit.undo).toHaveLength(1);expect(latest._circuit.prediction).toBe(before.prediction);expect(latest._circuit.observations).toEqual(observations);
    await click(button('Undo'));expect(latest._circuit.mode).toBe(before.mode);expect(latest._circuit.voltage).toBe(before.voltage);expect(latest._circuit.components).toEqual(before.components);
  });
  it.each([false,true])('reselects the current lesson without replacing an edited bench (tested=%s)',async tested=>{
    const trial=tested?window.StemLab.circuitLessonResult('loop',1):null;
    await mount({lessonId:'loop',lessonChoice:1,lessonTrial:trial,lessonExplanation:'My saved explanation.',lessonRecords:{loop:{choice:1,trial,explanation:'My saved explanation.',tested}},undo:[{mode:'series',voltage:3,components:[{id:8,type:'resistor',value:220}]}]});
    const before=protectedState(),record=JSON.stringify(latest._circuit.lessonRecords);
    await toggleChooser(true);await click(card('Complete the loop'));
    expect(chooser().open).toBe(false);expect(document.activeElement.id).toBe(tested?'circuit-lesson-result':'circuit-lesson-question');
    expect(protectedState()).toBe(before);expect(latest._circuit.lessonChoice).toBe(1);expect(latest._circuit.lessonExplanation).toBe('My saved explanation.');
    expect(JSON.stringify(latest._circuit.lessonRecords)).toBe(record);
  });
  it('closes a native chooser before its deferred toggle event when reselecting the current lesson',async()=>{
    await mount({lessonId:'loop',lessonChoice:1});
    const before=protectedState();
    // Native details opens before its toggle event reaches React.
    chooser().open=true;
    await click(card('Complete the loop'));
    expect(chooser().open).toBe(false);
    expect(document.activeElement.id).toBe('circuit-lesson-question');
    expect(protectedState()).toBe(before);
    await act(async()=>chooser().dispatchEvent(new Event('toggle')));
    expect(chooser().open).toBe(false);
  });
  it('returns to saved evidence from another lesson without changing the live circuit',async()=>{
    const trial=window.StemLab.circuitLessonResult('resistance',2);
    await mount({lessonId:'paths',lessonChoice:1,lessonExplanation:'My paths draft.',lessonRecords:{resistance:{choice:2,trial,explanation:'Current fell from 90 to 45 mA.',tested:true}}});
    const before=protectedState();await toggleChooser(true);await click(card('Turn down the current'));
    expect(chooser().open).toBe(false);expect(document.activeElement.id).toBe('circuit-lesson-result');expect(protectedState()).toBe(before);
    expect(latest._circuit.lessonExplanation).toBe('Current fell from 90 to 45 mA.');expect(latest._circuit.lessonRecords.paths.explanation).toBe('My paths draft.');
    expect(host.querySelector('.circuit-evidence-bench-note').textContent).toContain('Saved experiment evidence');
  });
  it('starts from Quick start at the question with the chooser closed',async()=>{
    await mount({components:[],startGuideOpen:true});await click(button('Start with a bulb'));
    expect(latest._circuit.lessonId).toBe('loop');expect(chooser().open).toBe(false);expect(document.activeElement.id).toBe('circuit-lesson-question');
    expect(latest._circuit.components.map(part=>part.type)).toEqual(['bulb','switch']);expect(latest._circuit.components[1].closed).toBe(false);
    expect(latest._circuit.undo).toHaveLength(1);expect(latest._circuit.observations).toEqual(observations);
  });
  it.each([false,true])('resumes from Quick start at the appropriate saved step (tested=%s)',async tested=>{
    const trial=tested?window.StemLab.circuitLessonResult('loop',1):null;
    await mount({lessonId:'loop',lessonChoice:1,lessonTrial:trial,lessonExplanation:'My saved explanation.',lessonOpen:false,startGuideOpen:true,lessonRecords:{loop:{choice:1,trial,explanation:'My saved explanation.',tested}}});
    const before=protectedState(),records=JSON.stringify(latest._circuit.lessonRecords);
    await click(button('Resume my experiment'));
    expect(document.activeElement.id).toBe(tested?'circuit-lesson-result':'circuit-lesson-question');expect(chooser().open).toBe(false);
    expect(protectedState()).toBe(before);expect(JSON.stringify(latest._circuit.lessonRecords)).toBe(records);
    expect(latest._circuit.lessonExplanation).toBe('My saved explanation.');expect(latest._circuitNetwork.reflection).toBe('Keep my network notes');
  });
  it('keeps input focus and saved state when translations rerender the active lesson',async()=>{
    await mount({lessonId:'loop',lessonChoice:1,lessonExplanation:'Keep this draft.'});
    const input=host.querySelector('.circuit-component-editor input[type="number"]');expect(input).not.toBeNull();input.focus();
    const before=JSON.stringify(latest);await act(async()=>setLocale('FR: '));await flushFrames();
    expect(document.activeElement).toBe(input);expect(JSON.stringify(latest)).toBe(before);expect(chooser().open).toBe(false);
    expect(host.querySelector('[aria-label="FR: Back to tools"]')).not.toBeNull();
  });
  it('closes a newly opened native chooser when reselecting before its toggle event is delivered',async()=>{
    const trial=window.StemLab.circuitLessonResult('loop',1);
    await mount({lessonId:'loop',lessonChoice:1,lessonTrial:trial,lessonExplanation:'Keep the tested result.'});
    const before=protectedState();
    await act(async()=>{chooser().open=true;card('Complete the loop').click();});await flushFrames();
    expect(chooser().open).toBe(false);expect(document.activeElement.id).toBe('circuit-lesson-result');expect(protectedState()).toBe(before);
  });
});
