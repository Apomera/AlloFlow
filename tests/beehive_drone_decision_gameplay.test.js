import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, latest, frames, cfg;
function live() { return window.__testHooks.beehive.droneStateRef.current; }
async function click(selector) { const el = host.querySelector(selector); expect(el, selector).toBeTruthy(); await act(async () => { el.click(); await Promise.resolve(); }); }
async function launch() { await click('[data-mobile-rail="drone-difficulty"] button'); }
async function maneuver(id) { await click('input[name="bee-flight-decision"][value="'+id+'"]'); await click('[data-flight-advance-decision]'); }
async function mount() {
  function App() { const [data,setData] = React.useState({ beehive: { viewMode: 'drone', honey: 80, workers: 10000, queenHealth: 100, morale: 90, varroaLevel: 2, soundOn: false,
    drone: { active: false, difficulty: 'easy', pacing: 'steps', courseSeed: 20260904 } } }); latest=data; return cfg.render(makeCtx({ toolData:data,setToolData:setData })); }
  await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  await launch();
}
beforeEach(async () => {
  resetStemLab(); window.__testHooks={}; window.__RR_TEST_EXPORTS__={};
  cfg=loadTool('stem_lab/stem_tool_beehive.js','beehive');
  const gradient={addColorStop:vi.fn()}; const context=new Proxy({measureText:t=>({width:String(t).length*6}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(t,p)=>p in t?t[p]:(t[p]=vi.fn()),set:(t,p,v)=>(t[p]=v,true)});
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
  frames=[];vi.stubGlobal('requestAnimationFrame',cb=>(frames.push(cb),frames.length));vi.stubGlobal('cancelAnimationFrame',vi.fn());
  host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);await mount();
});
afterEach(()=>{act(()=>root.unmount());host.remove();delete window.__testHooks;delete window.__RR_TEST_EXPORTS__;vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('Drone pause-and-plan gameplay',()=>{
  it('does not spend simulation time while reading or during paused render frames',async()=>{
    const s=live(), before={x:s.x,y:s.y,z:s.z,timer:s.timer,energy:s.energy};
    const frame=frames.shift();if(frame) await act(async()=>{frame(performance.now()+40000);});
    expect(live()).toMatchObject(before);expect(latest.beehive.drone.paused).toBe(true);
    expect(host.querySelector('[data-flight-decision-panel]')).toBeTruthy();
  });
  it('runs a bounded powered maneuver, records evidence, and returns to pause',async()=>{
    const before=live().energy;await maneuver('forward');
    expect(live().simulationClock).toBeCloseTo(1,8);expect(live().energy).toBeLessThan(before);expect(live().distance).toBeGreaterThan(0);
    expect(live().paused).toBe(true);expect(live().decisionLog).toHaveLength(1);
    expect(live().decisionLog[0]).toMatchObject({action:'Powered forward',seconds:1});
    expect(host.querySelector('[data-flight-decision-feedback]').textContent).toContain('Maneuver 1');
  });
  it('uses shorter turn corrections and no free energy while easing thrust',async()=>{
    const before=live().energy;await maneuver('left');expect(live().yaw).toBeLessThan(0);expect(live().simulationClock).toBeCloseTo(.2,8);
    await maneuver('coast');expect(live().simulationClock).toBeCloseTo(1.2,8);expect(live().energy).toBeLessThan(before);
  });
  it('recreates the same starting course when retrying',async()=>{
    const signature=s=>({obstacles:s.obstacles,wind:s.wind,queens:s.nearQueens,energy:s.energy});
    const initial=structuredClone(signature(live()));await maneuver('climb');
    await click('button[aria-label="End flight"]');expect(latest.beehive.drone.lastRun.decisionLog).toHaveLength(1);await launch();expect(signature(live())).toEqual(initial);
    await maneuver('climb');const a=structuredClone({x:live().x,y:live().y,z:live().z,energy:live().energy});
    await click('button[aria-label="End flight"]');await launch();await maneuver('climb');
    expect({x:live().x,y:live().y,z:live().z,energy:live().energy}).toEqual(a);
  });
  it('allows flapping-lift control to climb at low forward speed',async()=>{
    const s=live(); Object.assign(s,{phase:'congregation',reachedDca:true,x:0,y:80,z:0,vx:0,vy:0,vz:0,speed:0,controlPitch:0,controlThrust:0,wind:{x:0,z:0,phase:0},obstacles:[],drones:[],birds:[],thermals:[],nearQueens:[{x:0,y:180,z:0,caught:false}]});
    await maneuver('navigate');expect(live().y).toBeGreaterThan(80);expect(live().speed).toBeLessThan(1.2);expect(live().energy).toBeLessThan(125);
  });
  it('completes the actual DCA and queen gates using optional navigation assistance',async()=>{
    for(let i=0;i<78 && live().phase!=='end';i++) await click('[data-flight-advance-decision]');
    expect({phase:live().phase,reachedDca:live().reachedDca,reachedQueen:live().reachedQueen,position:[live().x,live().y,live().z],timer:live().timer,energy:live().energy}, JSON.stringify({x:live().x,y:live().y,z:live().z,phase:live().phase,reachedDca:live().reachedDca,log:live().decisionLog.slice(-4)})).toMatchObject({phase:'end',reachedDca:true,reachedQueen:true});
    expect(latest.beehive.drone.lastRun).toMatchObject({success:true,pacing:'steps',courseSeed:20260904});
    expect(latest.beehive.drone.lastRun.decisionLog.length).toBeGreaterThan(2);
  },60000);
  it('lets a learner stop and retain the flight evidence without succeeding',async()=>{
    await maneuver('climb');const finish=[...host.querySelectorAll('button')].find(x=>x.textContent==='Record flight and debrief');
    await act(async()=>{finish.click();await Promise.resolve();});
    expect(latest.beehive.drone.lastRun).toMatchObject({success:false,pacing:'steps'});expect(latest.beehive.drone.lastRun.decisionLog).toHaveLength(1);
    expect(host.textContent).toContain('Your flight decisions'); expect(document.activeElement).toBe(host.querySelector('[data-flight-decision-debrief]')); expect(latest.beehive.drone.paused).toBe(true);
  });
  it('explains real hovering and the human navigation aids without unsupported mating odds',()=>{
    expect(host.textContent).toContain('Real honey bees use flapping wings and can hover');
    expect(host.textContent).toContain('not calibrated biological measurements');
    expect(host.textContent).not.toContain('Only 1 in 1,000');
  });
});
