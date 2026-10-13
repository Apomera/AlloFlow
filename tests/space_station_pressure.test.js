import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const numberFn = source.slice(source.indexOf('  function issFlightNumber('), source.indexOf('  function issTransferPlan('));
const modelFn = source.slice(source.indexOf('  function issPressureFlow('), source.indexOf('  var _issRefOrbit'));
const { run, inspect, flow } = new Function(numberFn + modelFn + '\nreturn {run:issPressureRun,inspect:issPressureInspect,flow:issPressureFlow};')();
const require = createRequire(import.meta.url);
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { Simulate } = require(resolve(modules, 'react-dom/test-utils'));
const { act } = React;
const leaking = { cycle:false, start:35, leakArea:.6 };

describe('space station compressible airlock physics', () => {
  it('matches sonic mass flux, linear area scaling and the critical pressure ratio', () => {
    const gamma=1.4, r=287.05, t=295.15, p=101325;
    const critical=(2/(gamma+1))**(gamma/(gamma-1));
    const sonic=.72*1e-4*p*Math.sqrt(gamma/(r*t))*(2/(gamma+1))**((gamma+1)/(2*(gamma-1)));
    expect(flow(p,0,1,t).rate).toBeCloseTo(sonic,12);
    expect(flow(p,.4*p,1,t).rate).toBeCloseTo(sonic,12);
    expect(flow(p,critical*p,1,t).rate).toBeCloseTo(sonic,12);
    expect(flow(p,critical*p+1e-4,1,t).regime).toBe('subsonic');
    expect(flow(p,.8*p,1,t).rate).toBeLessThan(sonic);
    expect(flow(p,.95*p,1,t).rate).toBeLessThan(flow(p,.8*p,1,t).rate);
    expect(flow(p,0,2,t).rate).toBeCloseTo(2*sonic,12);
    expect(flow(p,0,1,4*t).rate).toBeCloseTo(sonic/2,12);
    expect(flow(p,p,1,t).rate).toBe(0);
    expect(flow(p,0,0,t).regime).toBe('closed');
  });

  it.each([0, .37, 4.125, 6, 10, 12.25, 20])('conserves total gas and each reservoir at %s minutes', minute => {
    for(const options of [{},leaking,{...leaking,isolate:true,isolateMinute:4.125},{cycle:false,start:110},{start:0,fillArea:0}]){
      const model=run(options),v=inspect(model,minute),c=model.config,rt=c.gasR*c.temperature;
      expect(model.initial).toBeCloseTo(v.cabin+v.lock+v.vented,8);
      expect(c.cabinStart*1000*c.cabinVolume/rt-v.transferred).toBeCloseTo(v.cabin,8);
      expect(c.start*1000*c.volume/rt+v.transferred-v.vented).toBeCloseTo(v.lock,8);
      expect(v.cabinKPa).toBeCloseTo(v.cabin*rt/c.cabinVolume/1000,10);
      expect(v.lockKPa).toBeCloseTo(v.lock*rt/c.volume/1000,10);
    }
  });

  it('matches the analytic isothermal reservoir decay and stops venting exactly on schedule', () => {
    const model=run({fillArea:0,ventMinutes:10}),c=model.config;
    const coefficient=.72*c.ventArea*1e-4/c.volume*Math.sqrt(1.4*c.gasR*c.temperature)*(2/2.4)**3;
    for(const minute of [.25,2,8,10,15,20]){
      const v=inspect(model,minute);
      expect(v.lockKPa).toBeCloseTo(c.start*Math.exp(-coefficient*Math.min(minute,10)*60),8);
      expect(v.cabinKPa).toBeCloseTo(101.325,10);
    }
    expect(inspect(model,10-1e-8).ventOpen).toBe(true);
    expect(inspect(model,10).ventOpen).toBe(false);
    expect(inspect(model,10).ventRate).toBe(0);
  });

  it('reaches the finite-volume weighted equilibrium without inventing replacement gas', () => {
    const model=run({cycle:false,start:35});
    const expected=(388*101.325+12*35)/400;
    expect(model.end.cabinKPa).toBeCloseTo(expected,9);
    expect(model.end.lockKPa).toBeCloseTo(expected,9);
    expect(model.end.vented).toBe(0);
    expect(model.end.transferRate).toBe(0);
    expect(model.subsonicMinute).toBeGreaterThan(.8);
    expect(model.subsonicMinute).toBeLessThan(.9);
    const transition=inspect(model,model.subsonicMinute);
    expect(transition.lockKPa/transition.cabinKPa).toBeCloseTo((2/2.4)**3.5,7);
    expect(inspect(model,model.nearEqualMinute).differenceKPa).toBeCloseTo(.05,6);
    expect(model.end.cabinKPa).toBeLessThan(101.325);
    for(const point of model.samples)expect(point.cabin/388-point.lock/12).toBeGreaterThanOrEqual(-1e-10);
  });

  it('reverses the flow for a higher airlock pressure and gives pressure-difference hatch loads', () => {
    const model=run({cycle:false,start:110}),v=inspect(model,0);
    expect(v.transferRate).toBeLessThan(0);
    expect(v.differenceKPa).toBeCloseTo(-8.675,9);
    expect(v.innerForceKN).toBeCloseTo(8.675,9);
    expect(v.outerForceKN).toBeCloseTo(110,9);
    expect(model.end.transferred).toBeLessThan(0);
    expect(model.end.cabinKPa).toBeCloseTo((388*101.325+12*110)/400,9);
    expect(model.end.innerForceKN).toBeCloseTo(0,9);
    expect(model.end.outerForceKN).toBeGreaterThan(100);
  });

  it('preserves history at isolation and keeps the external leak physically separate', () => {
    const baseline=run(leaking),model=run({...leaking,isolate:true,isolateMinute:4.125});
    for(const minute of [0,.5,2.75,4.125]){
      const before=inspect(baseline,minute),after=inspect(model,minute);
      expect(after.cabin).toBeCloseTo(before.cabin,6);
      expect(after.lock).toBeCloseTo(before.lock,6);
      expect(after.vented).toBeCloseTo(before.vented,6);
    }
    const isolated=inspect(model,4.125),later=inspect(model,20);
    expect(isolated.transferRate).toBe(0);
    expect(isolated.ventRate).toBeGreaterThan(0);
    expect(isolated.commandVentRate).toBe(0);
    expect(isolated.leakRate).toBe(isolated.ventRate);
    expect(later.leaked).toBeCloseTo(later.vented,10);
    expect(later.cabin).toBe(isolated.cabin);
    expect(later.lock).toBeLessThan(isolated.lock);
    expect(later.vented).toBeGreaterThan(isolated.vented);
    expect(later.cabin).toBeGreaterThan(baseline.end.cabin);
    expect(model.samples.some(v=>v.minute===4.125)).toBe(true);
    expect(model.plotPoints.some(v=>v.minute===4.125)).toBe(true);
  });

  it('holds both pressure and accumulated motion when all paths are closed', () => {
    const model=run({isolate:true,isolateMinute:3.73});
    const at=inspect(model,3.73),later=inspect(model,20);
    for(const field of ['cabin','lock','vented','transferred','circulated'])expect(later[field]).toBe(at[field]);
    expect(later.ventRate).toBe(0);expect(later.transferRate).toBe(0);
    const powerless=run({start:0,ventArea:0,fillArea:0});
    expect(powerless.end.lock).toBe(0);expect(powerless.end.vented).toBe(0);
  });

  it('converges under finer integration including fast flow, reverse flow and simultaneous leakage', () => {
    for(const options of [{}, {...leaking,isolate:true,isolateMinute:4.125},{cycle:false,start:0,volume:6,fillArea:10,leakArea:2},{cycle:false,start:110,volume:24,fillArea:10,leakArea:2}]){
      const model=run(options),fine=run({...options,stepSeconds:.05});
      for(const minute of [.011,.15,.7,1,1.3,2,3,4.125,5.4,10,12,14,20]){
        const a=inspect(model,minute),b=inspect(fine,minute);
        expect(Math.abs(a.lockKPa-b.lockKPa)).toBeLessThan(.005);
        expect(Math.abs(a.cabinKPa-b.cabinKPa)).toBeLessThan(.001);
        expect(Math.abs(a.vented-b.vented)).toBeLessThan(.001);
      }
    }
  });

  it('bounds malformed saved values and keeps backward inspection deterministic', () => {
    for(const value of [NaN,Infinity,null,'broken',-1e6,1e6]){
      const model=run({volume:value,start:value,ventArea:value,fillArea:value,leakArea:value,ventMinutes:value,holdMinutes:value,isolate:true,isolateMinute:value});
      for(const minute of [value,0,7,20]){
        const v=inspect(model,minute);
        for(const [key,number] of Object.entries(v))if(typeof number==='number')expect(Number.isFinite(number),key).toBe(true);
        expect(v.cabin).toBeGreaterThanOrEqual(0);expect(v.lock).toBeGreaterThanOrEqual(0);expect(v.vented).toBeGreaterThanOrEqual(0);
      }
    }
    const model=run(leaking),snapshot=JSON.stringify(model),last=inspect(model,20);
    inspect(model,0);inspect(model,7.7);inspect(model,2);
    expect(inspect(model,20)).toEqual(last);expect(JSON.stringify(model)).toBe(snapshot);
  });
});

let cleanups,frames,nextFrame,clock;
function advance(seconds){
  for(let i=0;i<=Math.round(seconds*50);i++){
    if(i)clock+=20;
    const callbacks=[...frames.values()];frames.clear();
    act(()=>callbacks.forEach(callback=>callback(clock)));
  }
}
function mountPressure(seed={}){
  const cfg=window.StemLab._registry.spaceStation,host=document.createElement('div');
  document.body.appendChild(host);const root=createRoot(host);let data,setData;
  function Harness(){
    const [toolData,setToolData]=React.useState({spaceStation:{tab:'operations',opsMode:'eclss',opsEclssLab:'pressure',...seed}});
    data=toolData.spaceStation;setData=setToolData;
    return cfg.render({React,toolData,setToolData,update(){},updateMulti(){},addToast(){},announceToSR(){},awardXP(){},setStemLabTool(){},aiHintsEnabled:false,gradeLevel:'7th Grade',t:(key,fallback)=>fallback??key});
  }
  act(()=>root.render(React.createElement(Harness)));
  cleanups.push(()=>{act(()=>root.unmount());host.remove();});
  return {host,get time(){return data.opsPressureMinute||0;},get data(){return data;},
    get playing(){return host.querySelector('[data-iss-playback-toggle="pressure"]').getAttribute('aria-pressed')==='true';},
    patch(patch){act(()=>setData(prev=>({...prev,spaceStation:{...prev.spaceStation,...patch}})));},
    click(selector){act(()=>host.querySelector(selector).click());},
    change(id,value){act(()=>Simulate.change(host.querySelector('#'+id),{target:{value:String(value)}}));},
    read(id){return host.querySelector('[data-pressure-reading="'+id+'"] strong').textContent;}
  };
}

describe('space station interactive airlock',()=>{
  beforeEach(()=>{
    resetStemLab();loadTool('stem_lab/stem_tool_spacestation.js','spaceStation');
    cleanups=[];frames=new Map();nextFrame=0;clock=0;
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
    vi.stubGlobal('requestAnimationFrame',callback=>{const id=++nextFrame;frames.set(id,callback);return id;});
    vi.stubGlobal('cancelAnimationFrame',id=>frames.delete(id));
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
    Object.defineProperty(document,'hidden',{configurable:true,value:false});
  });
  afterEach(()=>{cleanups.forEach(fn=>fn());vi.restoreAllMocks();vi.unstubAllGlobals();});

  it('shows real phase changes, slowing flow and residual outer-hatch force',()=>{
    const view=mountPressure();expect(view.read('lock')).toBe('101.30 kPa');
    view.click('[data-pressure-event="vent-end"]');expect(view.time).toBe(6);
    expect(view.read('vent')).toBe('0.0 g/s');
    expect(view.host.querySelector('[data-pressure-phase]').getAttribute('data-pressure-phase')).toBe('hold');
    view.click('[data-pressure-event="fill-start"]');expect(view.time).toBe(10);
    expect(view.host.querySelector('[data-pressure-reading="transfer"]').textContent).toContain('sonic limit');
    view.click('[data-pressure-event="subsonic"]');expect(view.time).toBeCloseTo(run({}).subsonicMinute,7);
    view.click('[data-pressure-event="equal"]');expect(view.read('inner-force')).toBe('0.05 kN');
    view.click('[data-pressure-event="end"]');expect(view.read('transfer')).toBe('0.0 g/s');
    expect(parseFloat(view.read('outer-force'))).toBeGreaterThan(99);
  });

  it('isolates at the cursor without refilling or changing earlier history, while the leak continues',()=>{
    const view=mountPressure();view.click('[data-pressure-preset="leak"]');view.change('iss-pressure-time',4);
    const cabin=view.read('cabin'),lock=view.read('lock'),lost=view.read('vented');
    view.click('[data-iss-playback-toggle="pressure"]');view.click('[data-pressure-isolate]');
    expect(view.time).toBe(4);expect(view.playing).toBe(false);expect(view.data.opsPressureIsolateMinute).toBe(4);
    expect(view.read('cabin')).toBe(cabin);expect(view.read('lock')).toBe(lock);expect(view.read('vented')).toBe(lost);
    expect(view.read('transfer')).toBe('0.0 g/s');expect(parseFloat(view.read('vent'))).toBeGreaterThan(0);
    expect(view.host.querySelector('[data-pressure-valve]').getAttribute('data-pressure-valve')).toBe('closed');
    expect(view.host.querySelector('[data-pressure-flow="exhaust"]')).toBeNull();
    expect(view.host.querySelector('[data-pressure-flow="leak"]')).not.toBeNull();
    expect(view.host.querySelector('[data-pressure-reference-path]')).not.toBeNull();
    view.click('[data-pressure-event="end"]');expect(view.read('cabin')).toBe(cabin);
    expect(parseFloat(view.read('lock'))).toBeLessThan(parseFloat(lock));
    expect(view.host.querySelector('[data-pressure-isolation-note]').textContent).toContain('keeps escaping');
    view.click('[data-pressure-clear-isolation]');expect(view.time).toBe(0);expect(view.data.opsPressureIsolate).toBe(false);
  });

  it('preserves playback for diagram hotspots and comparison, and resets for setup changes',()=>{
    const view=mountPressure({opsPressureIsolate:true,opsPressureIsolateMinute:12});
    view.click('[data-iss-playback-toggle="pressure"]');advance(.4);const time=view.time;expect(time).toBeGreaterThan(0);
    view.click('[data-pressure-hotspot="outer"]');view.click('[data-pressure-reference]');
    expect(view.time).toBe(time);expect(view.playing).toBe(true);
    expect(view.host.querySelector('[data-pressure-part="outer"]').getAttribute('aria-pressed')).toBe('true');
    expect(view.host.querySelector('[data-pressure-part-note]').textContent).toContain('do not unload this outer hatch');
    expect(view.host.querySelector('[data-pressure-reference-path]')).toBeNull();
    for(const [id,value] of [['iss-pressure-volume',16],['iss-pressure-start',50],['iss-pressure-fill',4],['iss-pressure-vent',2],['iss-pressure-leak',.8],['iss-pressure-vent-time',5],['iss-pressure-hold-time',2]]){
      view.click('[data-pressure-event="end"]');view.change(id,value);
      expect(view.time).toBe(0);expect(view.playing).toBe(false);expect(view.data.opsPressureIsolate).toBe(false);
    }
    view.click('[data-pressure-cycle-toggle]');expect(view.host.querySelector('#iss-pressure-vent-time').closest('fieldset').disabled).toBe(true);
  });

  it('supports captured chart inspection, cancellation and an accessible time slider',()=>{
    const view=mountPressure(),plot=view.host.querySelector('[data-pressure-plot]');
    vi.spyOn(plot,'getBoundingClientRect').mockReturnValue({left:20,width:400});
    let captured=false;plot.setPointerCapture=()=>{captured=true;};plot.hasPointerCapture=()=>captured;plot.releasePointerCapture=()=>{captured=false;};
    act(()=>Simulate.pointerDown(plot,{button:0,isPrimary:true,pointerId:1,clientX:220}));expect(view.time).toBe(10);
    act(()=>Simulate.pointerMove(plot,{pointerId:1,clientX:320}));expect(view.time).toBe(15);
    act(()=>Simulate.pointerCancel(plot,{pointerId:1}));act(()=>Simulate.pointerMove(plot,{pointerId:1,clientX:420}));expect(view.time).toBe(15);
    view.click('[data-iss-playback-toggle="pressure"]');view.change('iss-pressure-time',15.1);
    expect(view.time).toBe(15.1);expect(view.playing).toBe(false);
    expect(view.host.querySelector('#iss-pressure-time').getAttribute('aria-valuetext')).toContain('kilopascals');
  });

  it('starts paused, cancels on a same-time seek or lab switch, and resets with mission presets',()=>{
    const view=mountPressure({opsPressureMinute:10,opsPressurePlaying:true});expect(view.playing).toBe(false);
    view.click('[data-iss-playback-toggle="pressure"]');view.click('[data-pressure-event="fill-start"]');expect(view.playing).toBe(false);
    view.click('[data-iss-playback-toggle="pressure"]');advance(.2);
    view.click('[data-eclss-lab="water"]');const time=view.time;advance(.2);expect(view.time).toBe(time);
    view.click('[data-eclss-lab="pressure"]');expect(view.playing).toBe(false);
    view.click('[data-pressure-preset="leak"]');view.click('[data-pressure-isolate]');
    view.click('[data-iss-scenario="nominal"]');view.patch({opsMode:'eclss',opsEclssLab:'pressure'});
    expect(view.time).toBe(0);expect(view.data.opsPressureIsolate).toBe(false);expect(view.data.opsPressureLeak).toBe(0);
  });
});
