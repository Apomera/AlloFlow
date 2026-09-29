import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const {act}=React;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let api,config,root,host,latest,update,awardXP,addToast;
const target={type:'current',target:2};
const resistor=(value=5)=>({id:1,type:'resistor',value});
const seed=(extra={})=>({mode:'series',voltage:10,components:[resistor()],pauseMotion:true,benchView:'schematic',...extra});

beforeEach(()=>{
  const canvas=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:0})},{get:(object,key)=>key in object?object[key]:()=>{}});
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(canvas);
  resetStemLab();config=loadTool('stem_lab/stem_tool_circuit.js','circuit');api=window.StemLab;
  awardXP=vi.fn();addToast=vi.fn();
});
afterEach(async()=>{
  if(root)await act(async()=>root.unmount());
  if(host)host.remove();root=null;host=null;vi.restoreAllMocks();
});

async function mount(state,strict=false){
  host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
  function Harness(){
    const [toolData,setToolData]=React.useState({_circuit:state});
    latest=toolData._circuit;update=setToolData;
    return config.render(makeCtx({toolData,setToolData,awardXP,addToast}));
  }
  await act(async()=>root.render(strict?React.createElement(React.StrictMode,null,React.createElement(Harness)):React.createElement(Harness)));
}
const panel=()=>host.querySelector('[aria-label="Active circuit target"]');
const select=index=>host.querySelector('[data-circuit-target="'+index+'"]');
const check=()=>Array.from(panel().querySelectorAll('button')).find(button=>button.textContent==='Check target');
const rewards=()=>awardXP.mock.calls.filter(call=>call[0]==='circuitChallenge');
const badgeRewards=()=>awardXP.mock.calls.filter(call=>call[0]==='circuitBadge'&&call[2]==='Challenge Champ');
async function change(patch){await act(async()=>update(prev=>({...prev,_circuit:{...prev._circuit,...patch}})));}

describe('Simple challenge grading and guidance',()=>{
  it('recognizes the old 0.1 A label by type and target, and rejects arbitrary targets',()=>{
    expect(api.circuitChallengeIndex({type:'current',target:.1,label:'Get exactly 0.1A'})).toBe(5);
    expect(api.circuitChallengeIndex({type:'current',target:0})).toBe(-1);
    expect(api.circuitChallengeReading(api.solveCircuit(seed()),{type:'power',target:2})).toBeNull();
  });
  it.each([[190,false],[190.01,true],[200,true],[209.99,true],[210,false]])('keeps the strict tolerance at %s Ω',(resistance,accepted)=>{
    const result=api.circuitChallengeReading(api.solveCircuit(seed({components:[resistor(resistance)]})),{type:'resistance',target:200});
    expect(result.onTarget).toBe(accepted);
    expect(result.lowerText).toBe('190 Ω');expect(result.upperText).toBe('210 Ω');
  });
  it('never grades an empty layout and keeps attempts pure',()=>{
    const state=seed({components:[],challengesDoneSet:{2:true}}),original=JSON.stringify(state);
    const result=api.circuitChallengeAttempt(state,0,1);
    expect(result.challengeCheck.outcome).toBe('retry');expect(result.challengesDoneSet).toEqual({2:true});
    expect(result.challengeCheck.message).toContain('Add a component');expect(JSON.stringify(state)).toBe(original);
  });
  it('gives actionable guidance for empty, open, zero supply, nonlinear and both tuning directions',()=>{
    const cases=[
      [seed({components:[]}),'Add a resistor'],
      [seed({components:[resistor(),{id:2,type:'switch',closed:false}]}),'Close the open switch'],
      [seed({components:[resistor(),{id:2,type:'capacitor',value:100}]}),'blocks steady DC'],
      [seed({voltage:0}),'Increase the supply above 0 V'],
      [seed({components:[resistor(500),{id:2,type:'led',ledColor:'#ef4444'}]}),'forward voltage drop'],
      [seed({components:[resistor(10)]}),'lower total resistance to increase'],
      [seed({components:[resistor(1)]}),'raise total resistance to reduce']
    ];
    for(const [state,hint] of cases){const solved=api.solveCircuit(state);expect(api.circuitChallengeHint(solved,api.circuitChallengeReading(solved,target))).toContain(hint);}
  });
});

describe('Simple challenge selection and checking',()=>{
  it('selects a target without rewarding a matching circuit, then saves one completion',async()=>{
    await mount(seed());
    await act(async()=>select(0).click());
    expect(latest.challenge.target).toBe(2);expect(rewards()).toHaveLength(0);
    expect(panel().querySelector('[data-target-live-status]').textContent).toContain('In range');
    expect(panel().querySelector('[data-target-saved-status]').textContent).toBe('Completion not saved yet.');
    expect(panel().querySelector('[data-target-range]').textContent).toContain('strictly between 1.900 A and 2.100 A');
    await act(async()=>check().click());
    expect(latest.challengesDoneSet).toEqual({0:true});expect(latest.challengesDone).toBe(1);
    expect(rewards()).toEqual([['circuitChallenge',10,'Get 2A current']]);
    expect(panel().querySelector('[role="status"]').textContent).toContain('Completion saved');
  });
  it('awards once for rapid repeated clicks, StrictMode effect checks and later rechecks',async()=>{
    await mount(seed(),true);
    await act(async()=>{check().click();check().click();check().click();});
    await act(async()=>check().click());
    expect(rewards()).toHaveLength(1);expect(latest.challengesDone).toBe(1);
    expect(panel().querySelector('[role="status"]').textContent).toContain('already completed');
  });
  it('does not replay a saved completion reward when the tool mounts again',async()=>{
    await mount(seed());await act(async()=>check().click());
    const saved=latest;
    await act(async()=>root.unmount());host.remove();root=null;host=null;
    await mount(saved,true);
    expect(rewards()).toHaveLength(1);
    await act(async()=>check().click());expect(rewards()).toHaveLength(1);
  });
  it('opens and focuses the first target from Try a Target without granting completion',async()=>{
    await mount(seed());
    const route=Array.from(host.querySelectorAll('button')).find(button=>button.textContent.includes('Try a Target'));
    expect(route).toBeTruthy();
    await act(async()=>{route.click();await new Promise(resolve=>setTimeout(resolve,5));});
    expect(document.activeElement).toBe(select(0));expect(latest.challenge.target).toBe(2);
    expect(rewards()).toHaveLength(0);
  });
  it('grades the latest electrical state even if a change and check share a React batch',async()=>{
    await mount(seed());
    await act(async()=>{
      update(prev=>({...prev,_circuit:{...prev._circuit,voltage:1}}));
      check().click();
    });
    expect(rewards()).toHaveLength(0);expect(latest.challengeCheck.outcome).toBe('retry');
    expect(panel().querySelector('[role="status"]').textContent).toContain('200.00 mA');
    await act(async()=>{
      update(prev=>({...prev,_circuit:{...prev._circuit,voltage:10}}));
      check().click();
    });
    expect(rewards()).toHaveLength(1);
  });
  it('keeps the saved achievement separate from a later off-target reading',async()=>{
    await mount(seed());await act(async()=>check().click());
    await change({voltage:1});
    expect(panel().querySelector('[data-target-live-status]').textContent).toContain('Below target');
    expect(panel().querySelector('[data-target-saved-status]').textContent).toContain('Completion saved');
    expect(select(0).textContent).toContain('Saved');
    await act(async()=>check().click());expect(rewards()).toHaveLength(1);
    expect(panel().querySelector('[role="status"]').textContent).toContain('Keep tuning');
  });
  it('retains tiny nonzero current and power readings in the card and failure feedback',async()=>{
    await mount(seed({voltage:9,components:[{id:1,type:'voltmeter'}]}));
    expect(panel().querySelector('[data-target-reading]').textContent).toBe('0.00900 µA');
    await act(async()=>check().click());expect(panel().querySelector('[role="status"]').textContent).toContain('0.00900 µA');
    await act(async()=>select(6).click());
    expect(panel().querySelector('[data-target-reading]').textContent).toBe('0.0810 µW');
    expect(panel().querySelector('[data-target-goal]').textContent).toBe('1.000 W');
    await act(async()=>check().click());expect(panel().querySelector('[role="status"]').textContent).toContain('0.0810 µW');
    expect(rewards()).toHaveLength(0);
  });
  it('restores a legacy selected target and disables checking an empty circuit',async()=>{
    await mount(seed({components:[],challenge:{type:'current',target:.1,label:'Get exactly 0.1A'}}));
    expect(select(5).getAttribute('aria-pressed')).toBe('true');
    expect(panel().textContent).toContain('Get 0.1 A current');expect(check().disabled).toBe(true);
    expect(panel().querySelector('[data-target-hint]').textContent).toContain('Add a resistor');
    await act(async()=>check().click());expect(rewards()).toHaveLength(0);
  });
  it('preserves the existing five-completion badge without repeat rewards',async()=>{
    await mount(seed({challengesDone:4,challengesDoneSet:{1:true,2:true,3:true,4:true}}));
    await act(async()=>{check().click();check().click();});
    await act(async()=>check().click());
    expect(latest.challengesDone).toBe(5);expect(latest.badges.challengeChamp).toBe(true);
    expect(rewards()).toHaveLength(1);expect(badgeRewards()).toHaveLength(1);
  });
});
