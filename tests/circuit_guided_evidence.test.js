import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const {act}=React;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let host,root,config,latest,update,awardXP;
const lessonCases=[
  {id:'loop',title:'Complete the loop',choice:'It starts flowing',widths:[0,100],readings:['0 A','90.00 mA'],full:'90.00 mA'},
  {id:'resistance',title:'Turn down the current',choice:'It halves',widths:[100,50],readings:['90.00 mA','45.00 mA'],full:'90.00 mA'},
  {id:'paths',title:'Give charge another path',choice:'It doubles',widths:[50,100],readings:['90.00 mA','180.00 mA'],full:'180.00 mA'}
];

beforeEach(()=>{
  const canvas=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:0})},{get:(target,key)=>key in target?target[key]:()=>{}});
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(canvas);
  resetStemLab();config=loadTool('stem_lab/stem_tool_circuit.js','circuit');awardXP=vi.fn();
  host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});

async function mount(seed={}){
  function Harness(){
    const [toolData,setToolData]=React.useState({_circuit:{mode:'series',voltage:6,components:[{id:8,type:'resistor',value:470}],pauseMotion:true,lessonOpen:true,...seed}});
    latest=toolData._circuit;update=setToolData;
    return config.render(makeCtx({toolData,setToolData,awardXP}));
  }
  await act(async()=>root.render(React.createElement(Harness)));
}
const panel=()=>host.querySelector('.circuit-lessons');
const button=label=>[...panel().querySelectorAll('button')].find(element=>element.textContent===label);
const card=title=>[...panel().querySelectorAll('.circuit-lesson-cards button')].find(element=>element.querySelector('strong').textContent===title);
const chart=()=>panel().querySelector('.circuit-evidence-chart');
const scaleCaption=()=>document.getElementById(chart().getAttribute('aria-describedby'));
const widths=()=>['before','after'].map(stage=>parseFloat(chart().querySelector('[data-stage="'+stage+'"] .circuit-evidence-track > span').style.width));
const readings=()=>[...panel().querySelectorAll('.circuit-comparison strong')].slice(0,2).map(element=>element.textContent);
const electrical=state=>({mode:state.mode,voltage:state.voltage,components:state.components});
const historySize=()=>latest.undo?.length||0;
const preserved=()=>JSON.parse(JSON.stringify({lessonChoice:latest.lessonChoice,lessonTrial:latest.lessonTrial,lessonExplanation:latest.lessonExplanation,lessonRecords:latest.lessonRecords,observations:latest.observations,experimentBaseline:latest.experimentBaseline}));
async function click(element){expect(element).toBeTruthy();await act(async()=>element.click());}
async function explain(text){
  const field=panel().querySelector('#circuit-lesson-explanation');field.focus();
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,text);field.dispatchEvent(new Event('input',{bubbles:true}));});
  return field;
}
async function start(testCase,choice=testCase.choice){await click(card(testCase.title));await click(button(choice));}

describe('Guided evidence comparison',()=>{
  it.each(lessonCases)('shows $id before/after currents on a shared scale only after testing',async testCase=>{
    await mount();
    expect(chart()).toBeNull();
    await start(testCase);
    expect(chart()).toBeNull();
    await click(button('Test my prediction'));
    expect(readings()).toEqual(testCase.readings);
    widths().forEach((width,index)=>expect(width).toBeCloseTo(testCase.widths[index],8));
    if(testCase.widths[0]===0){
      const zero=chart().querySelector('[data-stage="before"] .circuit-evidence-track > span');
      expect(parseFloat(getComputedStyle(zero).minWidth)||0).toBe(0);
    }
    expect(scaleCaption()).not.toBeNull();
    expect(scaleCaption().textContent).toContain('Both bars use the same scale. Full width = '+testCase.full);
    expect(chart().getAttribute('aria-hidden')).not.toBe('true');
    expect(chart().querySelectorAll('.circuit-evidence-track')).toHaveLength(2);
    for(const track of chart().querySelectorAll('.circuit-evidence-track'))expect(track.getAttribute('aria-hidden')).toBe('true');
    expect(panel().querySelector('.circuit-evidence-saved-prediction').textContent).toContain(testCase.choice);
    expect(latest.lessonTrial.choice).toBe(latest.lessonChoice);
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('keeps a wrong original prediction visible when evidence disagrees and after revisiting',async()=>{
    await mount();await start(lessonCases[1],'It doubles');await click(button('Test my prediction'));
    expect(latest.lessonTrial.correct).toBe(false);
    expect(panel().querySelector('.circuit-evidence-saved-prediction').textContent).toContain('It doubles');
    expect(panel().textContent).toContain('Use this result to revise your prediction.');
    await explain('I expected more; 90 mA became 45 mA because resistance doubled.');
    await click(card('Give charge another path'));
    const live=JSON.stringify(electrical(latest));
    const previous=card('Turn down the current');previous.focus();await click(previous);
    expect(JSON.stringify(electrical(latest))).toBe(live);
    expect(document.activeElement).toBe(panel().querySelector('#circuit-lesson-result'));
    expect(panel().querySelector('.circuit-evidence-saved-prediction').textContent).toContain('It doubles');
    expect(panel().querySelector('textarea').value).toContain('90 mA became 45 mA');
    expect(readings()).toEqual(['90.00 mA','45.00 mA']);expect(widths()).toEqual([100,50]);
    expect(button('Load experiment baseline').getAttribute('aria-pressed')).toBe('false');
    expect(button('Load this experiment result').getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps saved evidence measurements independent of subsequent bench edits',async()=>{
    await mount();await start(lessonCases[2]);await click(button('Test my prediction'));
    const trial=JSON.stringify(latest.lessonTrial);
    await act(async()=>update(prev=>({...prev,_circuit:{...prev._circuit,mode:'series',voltage:0,components:[]}})));
    expect(JSON.stringify(latest.lessonTrial)).toBe(trial);
    expect(readings()).toEqual(['90.00 mA','180.00 mA']);expect(widths()).toEqual([50,100]);
    expect(scaleCaption().textContent).toContain('Full width = 180.00 mA');
    expect(panel().textContent).toContain('Saved experiment evidence. Your live bench has changed since this test.');
    expect(button('Load experiment baseline').getAttribute('aria-pressed')).toBe('false');
    expect(button('Load this experiment result').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('Guided evidence replay and focus',()=>{
  it('loads cloned baseline/result snapshots as undoable edits while keeping all evidence and notes',async()=>{
    const baseline={mode:'series',voltage:6,components:[{id:8,type:'resistor',value:470}]};
    const observations=[{before:baseline,after:{...baseline,voltage:12},delta:6/470,explanation:'My separate investigation',changes:['Supply voltage'],controlled:true}];
    await mount({observations,experimentBaseline:{circuit:baseline,prediction:'Keep my own baseline'}});
    await start(lessonCases[1],'It doubles');await click(button('Test my prediction'));
    await explain('The same voltage across twice the resistance gives half the current.');
    const evidence=preserved(),count=historySize(),progress=panel().querySelector('progress').value;
    expect(button('Load this experiment result').getAttribute('aria-pressed')).toBe('true');
    await click(button('Load this experiment result'));expect(historySize()).toBe(count);

    const loadBefore=button('Load experiment baseline');loadBefore.focus();await click(loadBefore);
    expect(document.activeElement).toBe(loadBefore);
    expect(electrical(latest)).toEqual(evidence.lessonTrial.before);expect(historySize()).toBe(count+1);
    expect(latest.components).not.toBe(latest.lessonTrial.before.components);
    expect(latest.components[0]).not.toBe(latest.lessonTrial.before.components[0]);
    expect(button('Load experiment baseline').getAttribute('aria-pressed')).toBe('true');
    expect(button('Load this experiment result').getAttribute('aria-pressed')).toBe('false');
    expect(panel().textContent).toContain('The experiment baseline is now on your bench.');
    expect(preserved()).toEqual(evidence);
    await click(button('Load experiment baseline'));expect(historySize()).toBe(count+1);

    const loadAfter=button('Load this experiment result');loadAfter.focus();await click(loadAfter);
    expect(document.activeElement).toBe(loadAfter);
    expect(electrical(latest)).toEqual(evidence.lessonTrial.after);expect(historySize()).toBe(count+2);
    expect(latest.components).not.toBe(latest.lessonTrial.after.components);
    expect(latest.components[0]).not.toBe(latest.lessonTrial.after.components[0]);
    expect(preserved()).toEqual(evidence);
    expect(panel().querySelector('progress').value).toBe(progress);
    expect(awardXP).not.toHaveBeenCalled();

    const undo=[...host.querySelectorAll('button')].find(element=>element.textContent==='Undo');await click(undo);
    expect(electrical(latest)).toEqual(evidence.lessonTrial.before);
    expect(button('Load experiment baseline').getAttribute('aria-pressed')).toBe('true');
    expect(preserved()).toEqual(evidence);
  });

  it('focuses the result after Test once, then leaves typing and replay focus in place',async()=>{
    await mount();await start(lessonCases[0]);
    const test=button('Test my prediction');test.focus();await click(test);
    const result=panel().querySelector('h3#circuit-lesson-result');
    expect(result).not.toBeNull();expect(document.activeElement).toBe(result);
    const field=await explain('Closing the switch makes one complete path through both parts.');
    expect(document.activeElement).toBe(field);
    const before=button('Load experiment baseline');before.focus();await click(before);
    expect(document.activeElement).toBe(before);expect(latest.components.find(p=>p.type==='switch').closed).toBe(false);
    const after=button('Load this experiment result');after.focus();await click(after);
    expect(document.activeElement).toBe(after);expect(latest.components.find(p=>p.type==='switch').closed).toBe(true);
    expect(panel().querySelector('textarea').value).toContain('one complete path');
  });
});
