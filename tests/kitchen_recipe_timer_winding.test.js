// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const C=require('../stem_lab/kitchen_studio/recipe_lab_clock.js');
const W=require('../stem_lab/kitchen_studio/recipe_lab_timer_winding.js');
const T=require('../vendor/three-r128/three.min.js');
const $=id=>document.getElementById(id);
const point=(degrees=0,radius=.4)=>({x:radius*Math.sin(degrees*Math.PI/180),y:radius*Math.cos(degrees*Math.PI/180)});
const noTimers=()=>({pot:null,pan:null});
let cleanups=[];

afterEach(()=>{
  cleanups.reverse().forEach(fn=>fn());
  cleanups=[];
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function wind(s,timers=noTimers(),station='pot',steps=1){
  let trace=W.start(s,timers,station,point(),false);
  for(let index=1;index<=steps;index++)trace=W.move(trace,point(index*60));
  return trace;
}

function mounted(s=R.start(),initialTimers=noTimers(),is3D=true){
  document.body.innerHTML='<div id="prior"></div>';
  let live=s,timers=initialTimers;
  const host={
    after:$('prior'),pause:vi.fn(),cancelNative:vi.fn(),openNative:vi.fn(),
    has3D:()=>is3D,getState:()=>live,getTimers:()=>timers,
    setTimer:vi.fn((station,seconds)=>{
      const next=C.create(live.time,seconds);
      if(!next)return false;
      timers={...timers,[station]:next};
      ui.render(live,timers,false,false);
      return true;
    }),
    clearTimer:vi.fn(station=>{
      timers={...timers,[station]:null};
      ui.render(live,timers,false,false);
      return true;
    }),
    inspect:vi.fn()
  };
  const ui=W.mount(host);
  ui.render(s,timers,false,true);
  cleanups.push(()=>ui.dispose());
  return {ui,host,state:()=>live,timers:()=>timers,setLive:next=>live=next,setTimers:next=>timers=next};
}

function press(key,repeat=false){
  $('timerWindControl').dispatchEvent(new KeyboardEvent('keydown',{key,repeat,bubbles:true,cancelable:true}));
}

function begin(ui,station='pot'){
  ui.open(station);
  $('timerWindBegin').click();
}

function decorated(s=R.start(),timers=noTimers(),historical=false){
  const world=new T.Group(),canvas=document.createElement('canvas');
  const context={
    fillRect:vi.fn(),clearRect:vi.fn(),strokeRect:vi.fn(),fillText:vi.fn(),
    beginPath:vi.fn(),arc:vi.fn(),stroke:vi.fn(),fill:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),
    save:vi.fn(),restore:vi.fn(),translate:vi.fn(),rotate:vi.fn(),closePath:vi.fn(),
    measureText:vi.fn(text=>({width:String(text).length*10}))
  };
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
  const mesh=(geometry,color,x,y,z,parent,extra)=>{
    const object=new T.Mesh(geometry,new T.MeshStandardMaterial({...extra,color}));
    object.position.set(x,y,z);
    (parent||world).add(object);
    return object;
  };
  const detail=W.decorate({THREE:T,world,canvas,mesh});
  detail.update(s,timers,historical);
  cleanups.push(()=>detail.dispose());
  return {detail,world,canvas,context};
}

describe('Deliberate winding of simulated check reminders',()=>{
  it('offers either station during ordinary or rescue cooking while preserving camera exploration',()=>{
    for(const s of [R.start(),R.start('tomato',4),R.startRescue('dry',0,'practice')]){
      for(const station of ['pot','pan']){
        expect(W.available(s,station,false)).toMatchObject({mode:'timer',cameraView:'timers',item:'check-timer',station,ready:true});
        for(const tool of ['timer','move','inspect','cut']){
          expect(W.pickup(s,noTimers(),{checkTimer:station},tool,false)).toMatchObject({station,ready:true,mode:'timer'});
          expect(W.pickup(s,noTimers(),{kitchenCheckTimer:station},tool,false)).toMatchObject({station,ready:true});
        }
        expect(W.pickup(s,noTimers(),{checkTimer:station},'camera',false)).toBeNull();
      }
    }
    for(const hit of [null,{pot:true},{item:'check-timer'},{checkTimer:'oven'}])expect(W.pickup(R.start(),noTimers(),hit,'timer',false)).toBeNull();
    expect(W.available(R.start(),'oven',false).ready).toBe(false);
  });

  it('locks historical, finished, exhausted and partially served cooks and permits returning all food before resuming',()=>{
    const s=R.start(),served={...s,pan:{...s.pan,combined:true,tasted:true},log:[{accepted:true,action:'servePortion',value:0}]};
    expect(R.serving(served).started).toBe(true);
    for(const blocked of [{...s,plated:true},{...s,submitted:true},{...s,time:3600},{...s,log:Array(1200).fill({})},served]){
      expect(W.available(blocked,'pot',false).ready).toBe(false);
      expect(W.start(blocked,noTimers(),'pot',point(),false)).toBeNull();
      expect(W.value(blocked,noTimers(),wind(s),false)).toBeNull();
    }
    expect(W.available(s,'pot',true).ready).toBe(false);
    expect(W.start(s,noTimers(),'pot',point(),true)).toBeNull();
    expect(W.value(s,noTimers(),wind(s),true)).toBeNull();
    const returned={...served,log:served.log.concat({accepted:true,action:'returnPortion',value:0})};
    expect(R.serving(returned).started).toBe(false);
    expect(W.available(returned,'pan',false).ready).toBe(true);
  });

  it('previews each duration without recording food, temperature, time, logs or timer state',()=>{
    for(const station of ['pot','pan'])for(let index=0;index<C.durations.length;index++){
      const s=R.start('tomato',4),timers={pot:C.create(0,120),pan:C.create(0,300)},before=JSON.stringify({s,timers});
      const trace=wind(s,timers,station,index+1);
      expect(W.value(s,timers,trace,false)).toEqual({station,seconds:C.durations[index]});
      expect(W.guidance(s,{trace},timers,false)).toMatchObject({phase:'release',tool:'timer-wind'});
      expect(JSON.stringify({s,timers})).toBe(before);
    }
  });

  it('starts at zero even when a reminder exists and rejects a tap or sub-slot movement',()=>{
    const s=R.start(),timers={pot:C.create(0,300),pan:null},trace=W.start(s,timers,'pot',point(),false);
    expect(W.value(s,timers,trace,false)).toBeNull();
    expect(W.value(s,timers,W.move(trace,point()),false)).toBeNull();
    expect(W.value(s,timers,W.move(trace,point(29.9)),false)).toBeNull();
    expect(W.value(s,timers,W.move(trace,point(30)),false)).toEqual({station:'pot',seconds:15});
    expect(W.value(s,timers,W.move(trace,point(60)),false)).toEqual({station:'pot',seconds:15});
  });

  it('unwraps across the back of the dial, reverses honestly, and clamps both endpoints',()=>{
    const s=R.start(),timers=noTimers();
    let trace=wind(s,timers,'pan',5);
    expect(W.value(s,timers,trace,false)).toEqual({station:'pan',seconds:300});
    trace=W.move(trace,point(360));
    trace=W.move(trace,point(420));
    expect(W.value(s,timers,trace,false)).toEqual({station:'pan',seconds:300});
    trace=W.move(trace,point(360));
    expect(W.value(s,timers,trace,false)).toEqual({station:'pan',seconds:120});
    let reverse=W.start(s,timers,'pot',point(),false);
    reverse=W.move(reverse,point(-60));
    reverse=W.move(reverse,point(-120));
    expect(W.value(s,timers,reverse,false)).toBeNull();
    reverse=W.move(reverse,point(-60));
    expect(W.value(s,timers,reverse,false)).toEqual({station:'pot',seconds:15});
  });

  it('ignores center travel for winding but requires a valid final release on the face',()=>{
    const s=R.start(),timers=noTimers();
    let trace=wind(s,timers,'pot',1);
    trace=W.move(trace,point(180,.05));
    expect(W.value(s,timers,trace,false)).toBeNull();
    trace=W.move(trace,point(60));
    expect(W.value(s,timers,trace,false)).toEqual({station:'pot',seconds:15});
    expect(W.value(s,timers,W.move(trace,point(60,.63)),false)).toBeNull();
  });

  it('rejects malformed points and angular jumps irreversibly, including at release',()=>{
    const s=R.start(),timers=noTimers(),done=wind(s,timers);
    for(const p of [null,{}, {x:NaN,y:0},{x:0,y:Infinity},{x:1,y:0}]){
      expect(W.start(s,timers,'pot',p,false)).toBeNull();
      const bad=W.move(done,p);
      expect(W.value(s,timers,bad,false)).toBeNull();
      expect(W.value(s,timers,W.move(bad,point(120)),false)).toBeNull();
    }
    const jumped=W.move(W.start(s,timers,'pot',point(),false),point(140));
    expect(W.value(s,timers,jumped,false)).toBeNull();
    expect(W.guidance(s,{trace:jumped},timers,false)).toMatchObject({phase:'retry'});
    expect(W.move(null,point())).toBeNull();
    expect(W.value(null,timers,null,false)).toBeNull();
    expect(W.guidance(s,null,timers,false)).toBeNull();
  });

  it('requires the exact source cook and the unchanged value stamp of both reminders',()=>{
    const s={...R.start(),time:100},timers={pot:C.create(0,120),pan:C.create(100,30)},trace=wind(s,timers,'pot');
    expect(W.value(s,{pot:{...timers.pot},pan:{...timers.pan}},trace,false)).toEqual({station:'pot',seconds:15});
    expect(W.value({...s},timers,trace,false)).toBeNull();
    expect(W.value(R.act(s,'wash'),timers,trace,false)).toBeNull();
    for(const station of ['pot','pan'])for(const field of ['setAt','dueAt','status']){
      const changed={pot:{...timers.pot},pan:{...timers.pan}};
      changed[station][field]=field==='status'?'elapsed':changed[station][field]+1;
      expect(W.value(s,changed,trace,false)).toBeNull();
    }
    expect(W.value(s,{...timers,pan:null},trace,false)).toBeNull();
    const mutable={pot:{...timers.pot},pan:{...timers.pan}},draft=wind(s,mutable,'pan');
    mutable.pot.dueAt++;
    expect(W.value(s,mutable,draft,false)).toBeNull();
  });

  it('also rejects in-place clock or log edits to the exact source cook',()=>{
    for(const field of ['time','log']){
      const s=R.start(),timers=noTimers(),trace=wind(s,timers);
      if(field==='time')s.time++;
      else s.log.push({accepted:true,action:'wash'});
      expect(W.value(s,timers,trace,false)).toBeNull();
      expect(W.guidance(s,{trace},timers,false)).toMatchObject({phase:'retry'});
    }
  });

  it('uses the Clock end cap for every offered interval instead of shortening a reminder',()=>{
    const s={...R.start(),time:3580},timers=noTimers();
    expect(W.available(s,'pot',false).ready).toBe(true);
    expect(W.value(s,timers,wind(s,timers,'pot',1),false)).toEqual({station:'pot',seconds:15});
    for(let steps=2;steps<=5;steps++)expect(W.value(s,timers,wind(s,timers,'pot',steps),false)).toBeNull();
    expect(W.available({...s,time:3590},'pot',false).ready).toBe(false);
    const exact={...s,time:3585};
    expect(W.value(exact,timers,wind(exact,timers,'pan',1),false)).toEqual({station:'pan',seconds:15});
  });
});

describe('Equivalent keyboard winding with live release guards',()=>{
  it('opens the lesson before focusing and requires Begin, winding and release to set once',()=>{
    const s=R.start(),before=JSON.stringify(s),{ui,host,timers}=mounted(s);
    ui.open('pot');
    expect($('timerWindingLesson').open).toBe(true);
    expect(document.activeElement).toBe($('timerWindControl'));
    expect(host.cancelNative).toHaveBeenCalledOnce();
    press('Enter');
    $('timerWindRelease').click();
    expect(host.setTimer).not.toHaveBeenCalled();
    $('timerWindBegin').click();
    press('Enter');
    expect(host.setTimer).not.toHaveBeenCalled();
    press('ArrowRight');
    press('Enter');
    expect(host.setTimer).toHaveBeenCalledOnce();
    expect(host.setTimer.mock.calls[0].slice(0,2)).toEqual(['pot',15]);
    expect(timers().pot).toEqual(C.create(0,15));
    press('Enter');
    expect(host.setTimer).toHaveBeenCalledOnce();
    expect(JSON.stringify(s)).toBe(before);
  });

  it('supports both arrow pairs, unwinding and equivalent buttons in text view',()=>{
    const {ui,host,timers}=mounted(R.start(),noTimers(),false);
    expect($('timerWindTry').hidden).toBe(true);
    begin(ui,'pan');
    press('ArrowUp');
    press('ArrowRight');
    press('ArrowDown');
    press('Enter');
    expect(host.setTimer.mock.calls[0].slice(0,2)).toEqual(['pan',15]);
    expect(timers().pan).toEqual(C.create(0,15));
    begin(ui,'pot');
    $('timerWindWind').click();
    $('timerWindWind').click();
    $('timerWindUnwind').click();
    $('timerWindRelease').click();
    expect(host.setTimer.mock.calls[1].slice(0,2)).toEqual(['pot',15]);
    expect(host.setTimer).toHaveBeenCalledTimes(2);
    expect(host.openNative).not.toHaveBeenCalled();
  });

  it('ignores repeated keys, zero net winding, Escape and Put back',()=>{
    const {ui,host}=mounted();
    begin(ui);press('ArrowRight',true);press('Enter');
    expect(host.setTimer).not.toHaveBeenCalled();
    press('ArrowRight');press('ArrowLeft');press('Enter');
    expect(host.setTimer).not.toHaveBeenCalled();
    press('ArrowRight');press('Escape');press('Enter');
    expect(host.setTimer).not.toHaveBeenCalled();
    begin(ui);press('ArrowRight');$('timerWindCancel').click();$('timerWindRelease').click();
    expect(host.setTimer).not.toHaveBeenCalled();
  });

  it('cancels when the station changes and keeps native launch separate from setting a reminder',()=>{
    const {ui,host}=mounted();
    begin(ui);press('ArrowRight');
    $('timerWindStation').value='pan';
    $('timerWindStation').dispatchEvent(new Event('change',{bubbles:true}));
    press('Enter');
    expect(host.setTimer).not.toHaveBeenCalled();
    $('timerWindTry').click();
    expect(host.openNative).toHaveBeenCalledOnce();
    expect(host.setTimer).not.toHaveBeenCalled();
    host.has3D=()=>false;ui.set3D();
    expect($('timerWindTry').hidden).toBe(true);
  });

  it('rejects a changed cook before render can cancel the keyboard draft',()=>{
    const s=R.start(),{ui,host,setLive}=mounted(s);
    begin(ui);press('ArrowRight');
    setLive(R.act(s,'wash'));
    press('Enter');
    expect(host.setTimer).not.toHaveBeenCalled();
    expect($('timerWindRelease').disabled).toBe(true);
  });

  it('rejects a change to either live reminder before render, including in-place timer edits',()=>{
    for(const changedStation of ['pot','pan']){
      const initial={pot:C.create(0,120),pan:C.create(0,300)},{ui,host,setTimers}=mounted(R.start(),initial);
      begin(ui,'pot');press('ArrowRight');
      setTimers({...initial,[changedStation]:C.create(0,60)});
      press('Enter');
      expect(host.setTimer).not.toHaveBeenCalled();
      ui.dispose();
    }
    const initial={pot:C.create(0,120),pan:C.create(0,300)},{ui,host}=mounted(R.start(),initial);
    begin(ui,'pan');press('ArrowRight');initial.pot.status='elapsed';press('Enter');
    expect(host.setTimer).not.toHaveBeenCalled();
  });

  it('locks new work in history or during serving and cancels drafts on render or a fresh cook',()=>{
    const s=R.start(),{ui,host,setLive}=mounted(s);
    begin(ui);press('ArrowRight');ui.render(s,noTimers(),true,false);press('Enter');
    expect(host.setTimer).not.toHaveBeenCalled();
    expect($('timerWindKeyboard').disabled).toBe(true);
    expect($('timerWindControl').getAttribute('aria-disabled')).toBe('true');
    const served={...s,pan:{...s.pan,combined:true,tasted:true},log:[{accepted:true,action:'servePortion',value:0}]};
    ui.render(served,noTimers(),false,false);
    expect($('timerWindTry').disabled).toBe(true);
    const rescue=R.startRescue('dry',0);setLive(rescue);ui.render(rescue,noTimers(),false,true);
    expect($('timerWindKeyboard').disabled).toBe(false);
    const fresh=R.start('tomato',4);setLive(fresh);ui.render(fresh,noTimers(),false,true);press('Enter');
    expect(host.setTimer).not.toHaveBeenCalled();
  });

  it('stops unfinished work on lifecycle interruption and removes listeners on disposal',()=>{
    const {ui,host}=mounted();
    for(const type of ['blur','resize','pagehide']){
      begin(ui);press('ArrowRight');window.dispatchEvent(new Event(type));press('Enter');
      expect(host.setTimer).not.toHaveBeenCalled();
    }
    begin(ui);press('ArrowRight');
    const hidden=Object.getOwnPropertyDescriptor(document,'hidden');
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));press('Enter');
    expect(host.setTimer).not.toHaveBeenCalled();
    if(hidden)Object.defineProperty(document,'hidden',hidden);else delete document.hidden;
    const native=$('timerWindTry'),keyboard=$('timerWindKeyboard'),control=$('timerWindControl');
    const cancellationCount=host.cancelNative.mock.calls.length;
    ui.dispose();ui.dispose();
    native.click();keyboard.click();
    control.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    window.dispatchEvent(new Event('resize'));
    expect(host.cancelNative).toHaveBeenCalledTimes(cancellationCount);
    expect(host.openNative).not.toHaveBeenCalled();
    expect(host.setTimer).not.toHaveBeenCalled();
    expect($('timerWindingLesson')).toBeNull();
  });

  it('reports external reminders honestly and describes elapsed or historical reminders without claiming readiness',()=>{
    const {ui,host}=mounted(),waiting={pot:C.create(0,30),pan:C.create(0,120)};
    ui.render(R.start(),waiting,false,false);
    expect($('timerWindReceipt').textContent).not.toMatch(/completed (keyboard|kitchen|native)|wound by (keyboard|hand)/i);
    const elapsedState={...R.start(),time:30};
    ui.render(elapsedState,C.settle(waiting,30),false,false);
    const text=$('timerWindingLesson').textContent;
    expect(text).toMatch(/look again|check time|inspect/i);
    expect(text).not.toMatch(/food is ready|cooked perfectly|ready to serve/i);
    ui.render(elapsedState,C.settle(waiting,30),true,false);
    expect($('timerWindTry').disabled).toBe(true);
    for(const id of ['timerWindPot','timerWindPan'])expect($(id).querySelector('.timer-wind-reading').textContent).toBe('VIEW ONLY');
    expect($('timerWindReceipt').textContent).not.toMatch(/completed (keyboard|kitchen|native)/i);
    expect(host.setTimer).not.toHaveBeenCalled();
  });

  it('routes inspection and clearing to the selected vessel without changing cooking evidence',()=>{
    const s=R.start(),initial={pot:C.create(0,15),pan:C.create(0,30)},before=JSON.stringify(s),{host,timers}=mounted(s,initial);
    $('timerWindPan').querySelector('[data-timer-inspect]').click();
    expect(host.inspect).toHaveBeenCalledWith('pan');
    expect(host.setTimer).not.toHaveBeenCalled();
    $('timerWindPot').querySelector('[data-timer-clear]').click();
    expect(host.clearTimer).toHaveBeenCalledWith('pot');
    expect(timers()).toEqual({pot:null,pan:initial.pan});
    expect(JSON.stringify(s)).toBe(before);
  });

  it('guards inspection and clearing against a reminder update that has not rendered yet',()=>{
    const s=R.start(),initial={pot:C.create(0,15),pan:C.create(0,30)},{host,setTimers}=mounted(s,initial);
    setTimers({...initial,pan:C.create(0,60)});
    $('timerWindPot').querySelector('[data-timer-inspect]').click();
    $('timerWindPot').querySelector('[data-timer-clear]').click();
    expect(host.inspect).not.toHaveBeenCalled();
    expect(host.clearTimer).not.toHaveBeenCalled();
  });

  it('restores truthful live status and usable winding after leaving the historical view',()=>{
    const s=R.start(),initial={pot:C.create(0,30),pan:null},{ui,host}=mounted(s,initial);
    ui.render({...s,log:[]},initial,true,false);
    expect($('timerWindStatus').textContent).toMatch(/winding is locked/i);
    ui.render(s,initial,false,false);
    expect($('timerWindStatus').textContent).toMatch(/preview until you release/i);
    expect($('timerWindStatus').textContent).not.toMatch(/locked|reminders are hidden/i);
    expect($('timerWindKeyboard').disabled).toBe(false);
    begin(ui,'pan');press('ArrowRight');press('Enter');
    expect(host.setTimer).toHaveBeenCalledWith('pan',15);
  });

  it('announces cancellation when rendering a changed cook or reminder invalidates an active preview',()=>{
    for(const reason of ['cook','reminder']){
      const s=R.start(),{ui,host,setLive,setTimers,timers}=mounted(s);
      begin(ui);press('ArrowRight');
      expect($('timerWindStatus').textContent).toMatch(/release to set/i);
      if(reason==='cook'){
        const next=R.act(s,'wash');setLive(next);ui.render(next,timers(),false,false);
      }else{
        const next={pot:null,pan:C.create(0,30)};setTimers(next);ui.render(s,next,false,false);
      }
      expect($('timerWindRelease').disabled).toBe(true);
      expect($('timerWindStatus').textContent).toMatch(/winding stopped.*kitchen or a reminder changed/i);
      expect($('timerWindStatus').textContent).not.toMatch(/release to set/i);
      expect(host.setTimer).not.toHaveBeenCalled();
    }
  });
});

describe('Physical timer faces and cached countdown decoration',()=>{
  it('places two faces at their declared stations and tags only physical face or rim hits',()=>{
    const {detail,world,canvas}=decorated();
    for(const [station,x] of [['pot',-.6],['pan',.6]]){
      expect(detail.sources[station]).toEqual({x,y:3.53,z:-1.81});
      const source=world.getObjectByName('check-timer-face-'+station).parent;
      expect(source.position.toArray()).toEqual([x,3.53,-1.81]);
      const tagged=[];source.traverse(object=>{if(object.userData.kitchenCheckTimer)tagged.push(object);});
      expect(tagged.length).toBeGreaterThanOrEqual(1);
      for(const object of tagged){expect(object.userData.kitchenCheckTimer).toBe(station);expect(object.name).toMatch(/face|rim/i);expect(object.userData.sceneDecoration).not.toBe(true);}
    }
    world.traverse(object=>{
      if(object.isMesh&&!object.userData.kitchenCheckTimer)expect(object.userData.sceneDecoration).toBe(true);
    });
    expect(canvas.dataset).toMatchObject({checkTimerPhase:'idle',checkTimerHeld:'',checkTimerStation:'',checkTimerSeconds:'0'});
  });

  it('keeps its board and labels in place while winding previews remain separate from saved reminders',()=>{
    const s=R.start(),timers={pot:C.create(0,120),pan:C.create(0,300)},before=JSON.stringify({s,timers}),{detail,world,canvas}=decorated(s,timers);
    const source=station=>world.getObjectByName('check-timer-face-'+station).parent;
    const positions=Object.fromEntries(['pot','pan'].map(station=>[station,source(station).position.toArray()]));
    detail.preview({trace:wind(s,timers,'pan',2)});
    expect(canvas.dataset).toMatchObject({checkTimerPhase:'release',checkTimerStation:'pan',checkTimerSeconds:'30'});
    for(const station of ['pot','pan'])expect(source(station).position.toArray()).toEqual(positions[station]);
    expect(JSON.stringify({s,timers})).toBe(before);
    detail.reset(s,timers,false);
    expect(canvas.dataset).toMatchObject({checkTimerPhase:'idle',checkTimerHeld:'',checkTimerStation:'',checkTimerSeconds:'0'});
  });

  it('reuses countdown textures and skips redraw when simulated values have not changed',()=>{
    const s=R.start(),timers={pot:C.create(0,30),pan:C.create(0,120)},{detail,world,context}=decorated(s,timers);
    const textureSet=()=>{const maps=new Set();world.traverse(object=>{for(const material of Array.isArray(object.material)?object.material:[object.material])if(material&&material.map)maps.add(material.map);});return maps;};
    const maps=textureSet(),draws=context.fillText.mock.calls.length;
    expect(maps.size).toBeGreaterThanOrEqual(2);
    detail.update(s,timers,false);
    detail.update(s,{pot:{...timers.pot},pan:{...timers.pan}},false);
    expect(context.fillText).toHaveBeenCalledTimes(draws);
    const next={...s,time:1};detail.update(next,C.settle(timers,1),false);
    expect(context.fillText.mock.calls.length).toBeGreaterThan(draws);
    expect(textureSet()).toEqual(maps);
    const after=context.fillText.mock.calls.length;detail.update(next,C.settle(timers,1),false);
    expect(context.fillText).toHaveBeenCalledTimes(after);
  });

  it('draws neutral elapsed and historical labels and cancels previews when history is displayed',()=>{
    const s=R.start(),timers={pot:C.create(0,15),pan:C.create(0,30)},{detail,canvas,context}=decorated(s,timers);
    detail.preview({trace:wind(s,timers,'pot')});
    const elapsed={...s,time:15};detail.update(elapsed,C.settle(timers,15),false);
    expect(context.fillText.mock.calls.map(call=>String(call[0])).join(' ')).toContain('LOOK AGAIN');
    detail.preview({trace:wind(elapsed,C.settle(timers,15),'pan')});
    detail.update(elapsed,C.settle(timers,15),true);
    expect(context.fillText.mock.calls.map(call=>String(call[0])).join(' ')).toContain('VIEW ONLY');
    expect(canvas.dataset).toMatchObject({checkTimerPhase:'idle',checkTimerHeld:'',checkTimerStation:'',checkTimerSeconds:'0'});
  });

  it('removes its objects and disposes every owned geometry, material and texture exactly once',()=>{
    const {detail,world}=decorated(),resources=new Set();
    world.traverse(object=>{
      if(object.geometry)resources.add(object.geometry);
      for(const material of Array.isArray(object.material)?object.material:[object.material])if(material){resources.add(material);if(material.map)resources.add(material.map);}
    });
    expect(resources.size).toBeGreaterThan(0);
    const spies=Array.from(resources,resource=>vi.spyOn(resource,'dispose'));
    detail.dispose();detail.dispose();
    expect(world.children).toHaveLength(0);
    for(const spy of spies)expect(spy).toHaveBeenCalledOnce();
  });
});
