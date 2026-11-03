import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require=createRequire(import.meta.url);
const K=require('../stem_lab/kitchen_studio/kitchen_studio_engine.js');
const G=require('../stem_lab/kitchen_studio/kitchen_studio_gestures.js');
const Dials=require('../stem_lab/kitchen_studio/recipe_lab_burners.js');
const Feedback=require('../stem_lab/kitchen_studio/kitchen_studio_feedback.js');
const touchSource=readFileSync('stem_lab/kitchen_studio/kitchen_studio_touch.js','utf8');
const body=readFileSync('stem_lab/kitchen_studio/index.html','utf8').match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];
const mounted=[],copy=value=>JSON.parse(JSON.stringify(value)),levels=['off','low','medium','high'];
const tick=async()=>{await Promise.resolve();await Promise.resolve();};

function fixture({initial=0,rim=false,height=420,kind='dial'}={}){
  document.body.innerHTML=body;window.KitchenStudio=K;window.KitchenStudioGestures=G;window.KitchenBurnerDials=Dials;
  vm.runInNewContext(touchSource,{window});
  const canvas=document.createElement('canvas');document.getElementById('scene').append(canvas);
  const rect={left:100,top:80,width:600,height},bounds=()=>({...rect,right:rect.left+rect.width,bottom:rect.top+rect.height});
  const centre={x:rect.left+rect.width/2,y:rect.top+height/2},captures=new Set(),events=[],cues=[];
  let state=K.start('heat'),hidden=false,blocked=false,visible=true,previewHook=null,adapter;
  if(initial)state=K.act(state,levels[initial]);
  const documentHidden=vi.spyOn(document,'hidden','get').mockReturnValue(false);
  canvas.getBoundingClientRect=bounds;canvas.getClientRects=()=>visible?[bounds()]:[];
  canvas.setPointerCapture=vi.fn(id=>captures.add(id));canvas.hasPointerCapture=vi.fn(id=>captures.has(id));canvas.releasePointerCapture=vi.fn(id=>captures.delete(id));
  const tool={id:kind==='dial'?'dial':'spatula',name:kind==='dial'?'heat dial':'spatula',station:'heat',kind,objects:[{visible:true}],hint:'Move and release.'};
  const sourceLevel=()=>['low','medium','high'].indexOf(state.values.heat)+1;
  const host={canvas,orbit:{enabled:true},getState:()=>state,hidden:()=>hidden,locked:()=>hidden||blocked||state.done||state.submitted,
    pick:()=>tool,inputTool:info=>info,point:e=>({x:e.clientX,y:1.65,z:e.clientY}),
    dialPoint:e=>rim?{x:(e.clientX-centre.x)/80,z:(e.clientY-centre.y)/80}:{x:0,z:0},
    capture:()=>[],highlight:vi.fn(),draw:vi.fn(()=>events.push('draw:'+canvas.dataset.dialPreview)),
    preview:vi.fn(g=>{
      const trace=g&&g.trace;
      canvas.dataset.dialPreview=String(trace&&trace.phase==='ready'&&!trace.invalid?trace.level:sourceLevel());
      events.push((g?'preview:':'clear:')+canvas.dataset.dialPreview);
      if(g&&previewHook)previewHook(g);
    }),
    feedback:vi.fn(signal=>{events.push('cue:'+signal.type);cues.push({signal:{...signal},rendered:Number(canvas.dataset.dialPreview),held:canvas.dataset.held,state:copy(state)});}),
    tools:()=>[tool],available:id=>id===tool.id,reveal:()=>true,keyboardPoint:()=>({...centre}),keyboardTargets:()=>[],
    destination:g=>({action:g.moved>=8?'spread':null,message:'Move to arrange.'}),
    act:vi.fn(action=>{events.push('act:'+action);state=K.act(state,action);}),
    view:vi.fn(),inspect:vi.fn(),select:vi.fn(),interactionMode:vi.fn(),fridgeOpen:()=>false,
    dialCloseup:()=>false,panCloseup:()=>false,boardCloseup:()=>false,probeCloseup:()=>false,containerCloseup:()=>false,
    measureInspecting:()=>false,panMode:()=>'arrange',platingMode:()=>'quick',pourMode:()=>'portion',probeDepth:()=>0,lidsOpen:()=>false};
  adapter=window.KitchenStudioTouch.mount(host);mounted.push(adapter);events.length=0;
  return {adapter,canvas,host,rect,centre,events,cues,documentHidden,state:()=>state,types:()=>cues.map(c=>c.signal.type),
    detents:()=>cues.filter(c=>c.signal.type==='detent'),setState:next=>{state=next;},setHidden:next=>{hidden=next;},
    setBlocked:next=>{blocked=next;},setVisible:next=>{visible=next;},setPreviewHook:next=>{previewHook=next;}};
}
function pointer(f,type,dy=0,id=77,dx=0){
  const event=new MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:f.centre.x+dx,clientY:f.centre.y+dy});
  Object.defineProperties(event,{pointerId:{value:id},pointerType:{value:'mouse'},isPrimary:{value:true}});f.canvas.dispatchEvent(event);
}
function rimPointer(f,type,steps=0,id=77){const angle=steps*Math.PI/2;pointer(f,type,-Math.cos(angle)*80,id,Math.sin(angle)*80);}
function oneAction(f,before,setting){
  expect(f.state().log).toHaveLength(before.log.length+1);expect(f.state().log.at(-1)).toMatchObject({action:setting,accepted:true});
  expect(f.state().values.heat).toBe(setting==='off'?null:setting);expect({...f.state().values,heat:null}).toEqual({...before.values,heat:null});
  expect(f.host.act).toHaveBeenCalledExactlyOnceWith(setting);
}
function audioFixture({audio=true,touch=true,state='running',deferred=false}={}){
  document.body.innerHTML=body;const contexts=[],oscillators=[],gains=[],pending=[];
  const param=()=>({setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()});
  const Constructor=vi.fn(function(){const context={state,currentTime:12,destination:{},
    createOscillator:vi.fn(()=>{const value={frequency:param(),type:'',connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};oscillators.push(value);return value;}),
    createGain:vi.fn(()=>{const value={gain:param(),connect:vi.fn(),disconnect:vi.fn()};gains.push(value);return value;}),
    resume:vi.fn(()=>deferred?new Promise((resolve,reject)=>pending.push({resolve:()=>{context.state='running';resolve();},reject})):(context.state='running',Promise.resolve())),
    close:vi.fn(()=>{context.state='closed';return Promise.resolve();})};contexts.push(context);return context;});
  Object.defineProperty(window,'AudioContext',{configurable:true,value:audio?Constructor:undefined});
  Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
  const vibrate=vi.fn(()=>true);Object.defineProperty(navigator,'vibrate',{configurable:true,value:touch?vibrate:undefined});
  const canvas=document.createElement('canvas');document.getElementById('scene').append(canvas);const view=Feedback.mount({canvas});mounted.push(view);
  return {view,contexts,oscillators,gains,pending,Constructor,vibrate,sounds:document.getElementById('studioToolSounds'),pulses:document.getElementById('studioTouchPulses')};
}
function select(input,on=true){input.checked=on;input.dispatchEvent(new Event('change'));}
const positives=f=>f.vibrate.mock.calls.map(call=>call[0]).filter(value=>value>0);
const detent=f=>f.view.cue({type:'detent',id:'dial',kind:'dial',keyboard:false});
afterEach(()=>{mounted.splice(0).forEach(view=>view.dispose());vi.restoreAllMocks();delete window.AudioContext;delete window.webkitAudioContext;delete navigator.vibrate;document.body.innerHTML='';});

describe('Rendered burner detents through the shared adapter',()=>{
  it.each([0,1,2,3])('seeds the actual setting %i without a detent at pickup',initial=>{
    const f=fixture({initial}),before=copy(f.state());pointer(f,'pointerdown');expect(f.types()).toEqual(['pickup']);expect(f.state()).toEqual(before);
    pointer(f,'pointermove');expect(f.types()).toEqual(['pickup']);expect(f.host.act).not.toHaveBeenCalled();
  });
  it('clicks only when the rendered centre setting changes, after preview and drawing',()=>{
    const f=fixture(),before=copy(f.state());f.adapter.subscribeKeyboard(()=>f.events.push('publish'));pointer(f,'pointerdown');
    for(const dy of [-1,-9,-10,-11])pointer(f,'pointermove',dy);
    expect(f.detents()).toEqual([]);expect(f.canvas.dataset.dialPreview).toBe('0');
    pointer(f,'pointermove',-12);expect(f.detents().map(c=>c.rendered)).toEqual([1]);
    expect(f.events.slice(-4)).toEqual(['preview:1','draw:1','publish','cue:detent']);
    for(const dy of [-13,-14,-20,-29])pointer(f,'pointermove',dy);
    expect(f.detents()).toHaveLength(1);expect(f.types()).not.toContain('ready');expect(f.state()).toEqual(before);
    expect(f.detents()[0]).toMatchObject({signal:{type:'detent',id:'dial',kind:'dial',keyboard:false},held:'dial',state:before});
  });
  it('follows all displayed settings forward and back, including the original Off',()=>{
    const f=fixture(),before=copy(f.state());pointer(f,'pointerdown');
    for(const dy of [-12,-31,-51,-31,-12,0])pointer(f,'pointermove',dy);
    expect(f.detents().map(c=>c.rendered)).toEqual([1,2,3,2,1,0]);expect(f.state()).toEqual(before);
    pointer(f,'pointerup');expect(f.types()).toEqual(['pickup',...Array(6).fill('detent'),'cancel']);expect(f.host.act).not.toHaveBeenCalled();expect(f.state()).toEqual(before);
  });
  it.each([[0,80],[3,-80]])('stays quiet while pushing outward at end stop %i',(initial,dy)=>{
    const f=fixture({initial}),before=copy(f.state());pointer(f,'pointerdown');
    for(const distance of [dy/4,dy/2,dy,dy+Math.sign(dy)*5])pointer(f,'pointermove',distance);
    expect(f.types()).toEqual(['pickup']);pointer(f,'pointerup',dy);expect(f.types()).toEqual(['pickup','cancel']);expect(f.state()).toEqual(before);
  });
  it('emits one click for a coalesced jump to High and no repeated click on release',()=>{
    const f=fixture(),before=copy(f.state());pointer(f,'pointerdown');pointer(f,'pointermove',-70);
    expect(f.detents().map(c=>c.rendered)).toEqual([3]);expect(f.state()).toEqual(before);pointer(f,'pointerup',-70);
    expect(f.types()).toEqual(['pickup','detent','release']);oneAction(f,before,'high');pointer(f,'pointerup',-70);expect(f.types()).toEqual(['pickup','detent','release']);
  });
  it('includes the final release sample once before its one heat decision',()=>{
    const f=fixture({initial:1}),before=copy(f.state());pointer(f,'pointerdown');pointer(f,'pointerup',12);
    expect(f.types()).toEqual(['pickup','detent','release']);expect(f.detents()[0].rendered).toBe(0);oneAction(f,before,'off');
    expect(f.events.indexOf('cue:detent')).toBeLessThan(f.events.indexOf('act:off'));expect(f.events.indexOf('act:off')).toBeLessThan(f.events.indexOf('cue:release'));
  });
  it.each([[210,6],[420,12],[840,24]])('uses the same displayed threshold at height %i',(height,pixels)=>{
    const f=fixture({height});pointer(f,'pointerdown');pointer(f,'pointermove',-pixels*.9);expect(f.detents()).toHaveLength(0);
    pointer(f,'pointermove',-pixels);expect(f.detents().map(c=>c.rendered)).toEqual([1]);
  });
  it('uses identical discrete changes through keyboard movement without pointer capture',()=>{
    const f=fixture({initial:2}),before=copy(f.state());expect(f.adapter.keyboardBegin('dial')).toBe(true);
    for(const dy of [-20,-1,-1,22,20])f.adapter.keyboardMove(0,dy);
    expect(f.detents().map(c=>c.rendered)).toEqual([3,2,1]);expect(f.detents().every(c=>c.signal.keyboard)).toBe(true);expect(f.state()).toEqual(before);
    f.adapter.keyboardRelease();oneAction(f,before,'low');expect(f.types()).toEqual(['pickup','detent','detent','detent','release']);expect(f.canvas.setPointerCapture).not.toHaveBeenCalled();
  });
  it('ignores unrelated pointer movements and releases during a held preview',()=>{
    const f=fixture();pointer(f,'pointerdown');pointer(f,'pointermove',-60,99);pointer(f,'pointerup',-60,99);
    expect(f.types()).toEqual(['pickup']);expect(f.canvas.dataset.held).toBe('dial');pointer(f,'pointermove',-12);expect(f.detents()).toHaveLength(1);
  });
  it('does not publish a late detent when a preview callback cancels the hold',()=>{
    const f=fixture(),before=copy(f.state());pointer(f,'pointerdown');f.setPreviewHook(()=>f.adapter.cancel('Stop before feedback.'));pointer(f,'pointermove',-12);
    expect(f.types()).toEqual(['pickup','cancel']);expect(f.canvas.dataset.held).toBe('');expect(f.state()).toEqual(before);
  });
  it.each(['Escape','pointercancel','blur','hidden','blocked','invisible','source','dispose'])('cancels after a detent without recording heat on %s',reason=>{
    const f=fixture({initial:1});pointer(f,'pointerdown');pointer(f,'pointermove',12);const before=copy(f.state());
    if(reason==='Escape')document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    if(reason==='pointercancel')pointer(f,'pointercancel');if(reason==='blur')window.dispatchEvent(new Event('blur'));
    if(reason==='hidden'){f.setHidden(true);f.adapter.update();}if(reason==='blocked'){f.setBlocked(true);f.adapter.update();}
    if(reason==='invisible'){f.setVisible(false);f.adapter.update();}if(reason==='source'){f.setState(copy(f.state()));f.adapter.update();}if(reason==='dispose')f.adapter.dispose();
    pointer(f,'pointerup',12);expect(f.types()).toEqual(['pickup','detent','cancel']);expect(f.state()).toEqual(before);expect(f.host.act).not.toHaveBeenCalled();
  });
  it.each(['blocked','done','submitted','document-hidden'])('keeps a locked %s dial silent',lock=>{
    const f=fixture();if(lock==='blocked')f.setBlocked(true);else if(lock==='document-hidden')f.documentHidden.mockReturnValue(true);else f.setState({...f.state(),[lock]:true});
    pointer(f,'pointerdown');pointer(f,'pointermove',-60);pointer(f,'pointerup',-60);expect(f.cues).toEqual([]);expect(f.host.act).not.toHaveBeenCalled();
  });
  it('retains the first-ready cue for an ordinary spatula carry',()=>{
    const f=fixture({kind:'spatula'});pointer(f,'pointerdown');for(const dy of [10,20,30])pointer(f,'pointermove',dy);pointer(f,'pointerup',30);
    expect(f.types()).toEqual(['pickup','ready','release']);
  });
});

describe('Rim detent contact with the real burner turn model',()=>{
  it('uses the actual Off turn initial until a displayed detent is reached',()=>{
    const f=fixture({rim:true}),before=copy(f.state());rimPointer(f,'pointerdown');
    for(const step of [.1,.2,.4,.49])rimPointer(f,'pointermove',step);
    expect(f.canvas.dataset.dialPreview).toBe('0');expect(f.types()).toEqual(['pickup']);
    rimPointer(f,'pointermove',.6);expect(f.detents().map(c=>c.rendered)).toEqual([1]);rimPointer(f,'pointermove',.2);
    expect(f.detents().map(c=>c.rendered)).toEqual([1,0]);expect(f.state()).toEqual(before);rimPointer(f,'pointerup',.2);expect(f.host.act).not.toHaveBeenCalled();
  });
  it('clicks each newly displayed rim setting while end-stop motion stays quiet',()=>{
    const f=fixture({rim:true}),before=copy(f.state());rimPointer(f,'pointerdown');
    for(const step of [.6,1.6,2.6,3.1,3.3,3.1,2.6,1.6,.6,0])rimPointer(f,'pointermove',step);
    expect(f.detents().map(c=>c.rendered)).toEqual([1,2,3,2,1,0]);expect(f.state()).toEqual(before);
    rimPointer(f,'pointerup');expect(f.types().at(-1)).toBe('cancel');expect(f.host.act).not.toHaveBeenCalled();
  });
  it('keeps a High rim end stop quiet from pickup through release',()=>{
    const f=fixture({rim:true,initial:3}),before=copy(f.state());rimPointer(f,'pointerdown');
    for(const step of [.2,.6,1.1,1.5])rimPointer(f,'pointermove',step);rimPointer(f,'pointerup',1.5);
    expect(f.types()).toEqual(['pickup','cancel']);expect(f.state()).toEqual(before);
  });
  it('resets invalid rim contact silently and cannot revive its old detent',()=>{
    const f=fixture({rim:true}),before=copy(f.state());rimPointer(f,'pointerdown');rimPointer(f,'pointermove',.6);
    expect(f.detents().map(c=>c.rendered)).toEqual([1]);pointer(f,'pointermove',0);expect(f.canvas.dataset.phase).toBe('retry');
    expect(f.canvas.dataset.dialPreview).toBe('0');rimPointer(f,'pointermove',1.6);rimPointer(f,'pointerup',1.6);
    expect(f.types()).toEqual(['pickup','detent','cancel']);expect(f.state()).toEqual(before);expect(f.host.act).not.toHaveBeenCalled();
  });
  it('keeps a discontinuous angular jump silent instead of clicking a guessed level',()=>{
    const f=fixture({rim:true});rimPointer(f,'pointerdown');rimPointer(f,'pointermove',1.8);expect(f.canvas.dataset.phase).toBe('retry');expect(f.types()).toEqual(['pickup']);
  });
});

describe('Optional neutral burner click output',()=>{
  it('starts silent and allocates no audio or pulse resources for detents',()=>{
    const f=audioFixture();expect(detent(f)).toBe(false);expect(f.Constructor).not.toHaveBeenCalled();expect(f.vibrate).not.toHaveBeenCalled();
  });
  it('uses one quiet triangle click and brief pulse with a bounded envelope',()=>{
    const f=audioFixture();select(f.sounds);select(f.pulses);expect(detent(f)).toBe(true);
    expect(f.oscillators).toHaveLength(1);const oscillator=f.oscillators[0],gain=f.gains[0];
    expect(oscillator.type).toBe('triangle');expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(480,12);
    expect(oscillator.start).toHaveBeenCalledExactlyOnceWith(12);expect(oscillator.stop).toHaveBeenCalledExactlyOnceWith(12.022);
    expect(gain.gain.linearRampToValueAtTime.mock.calls).toEqual([[.035,12.004],[0,12.022]]);expect(positives(f)).toEqual([6]);
    expect(oscillator.connect).toHaveBeenCalledWith(gain);expect(gain.connect).toHaveBeenCalledWith(f.contexts[0].destination);
  });
  it.each(['sounds','pulses'])('works with only %s enabled',option=>{
    const f=audioFixture();select(f[option]);detent(f);expect(f.oscillators).toHaveLength(option==='sounds'?1:0);expect(positives(f)).toEqual(option==='pulses'?[6]:[]);
  });
  it('keeps one live voice when multiple settings change',()=>{
    const f=audioFixture();select(f.sounds);select(f.pulses);detent(f);const old=f.oscillators[0];detent(f);
    expect(old.stop).toHaveBeenCalledTimes(2);expect(old.disconnect).toHaveBeenCalledTimes(1);expect(f.oscillators).toHaveLength(2);expect(positives(f)).toEqual([6,6]);
  });
  it('uses the same detent regardless of keyboard or judgement metadata',()=>{
    const f=audioFixture();select(f.sounds);select(f.pulses);detent(f);f.view.cue({type:'detent',id:'dial',kind:'dial',keyboard:true,accepted:false});
    expect(f.oscillators.map(value=>value.frequency.setValueAtTime.mock.calls[0][0])).toEqual([480,480]);expect(positives(f)).toEqual([6,6]);
  });
  it('cancels the latest click without adding a cancellation sound or pulse',()=>{
    const f=audioFixture();select(f.sounds);select(f.pulses);detent(f);f.view.cue({type:'cancel'});
    expect(f.oscillators).toHaveLength(1);expect(f.oscillators[0].disconnect).toHaveBeenCalledTimes(1);expect(positives(f)).toEqual([6]);expect(f.vibrate).toHaveBeenLastCalledWith(0);
  });
  it.each(['cancel','off','hide','blur','dispose'])('does not play a pending detent after %s',async reason=>{
    const f=audioFixture({state:'suspended',deferred:true});select(f.sounds);detent(f);
    if(reason==='cancel')f.view.cue({type:'cancel'});if(reason==='off')select(f.sounds,false);if(reason==='hide')f.view.update({visible:false});
    if(reason==='blur')window.dispatchEvent(new Event('blur'));if(reason==='dispose')f.view.dispose();f.pending.forEach(value=>value.resolve());await tick();expect(f.oscillators).toHaveLength(0);
  });
  it('drops an older pending setting and plays only the newest detent',async()=>{
    const f=audioFixture({state:'suspended',deferred:true});select(f.sounds);detent(f);detent(f);f.pending.forEach(value=>value.resolve());await tick();
    expect(f.oscillators).toHaveLength(1);expect(f.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(480,12);
  });
  it('keeps unsupported optional hardware silent',()=>{
    const f=audioFixture({audio:false,touch:false});select(f.sounds);select(f.pulses);expect(detent(f)).toBe(false);expect(f.Constructor).not.toHaveBeenCalled();expect(f.vibrate).not.toHaveBeenCalled();
  });
  it('does not emit a new detent while the document is hidden',()=>{
    const f=audioFixture();select(f.sounds);select(f.pulses);vi.spyOn(document,'hidden','get').mockReturnValue(true);expect(detent(f)).toBe(false);expect(f.oscillators).toHaveLength(0);expect(f.vibrate).not.toHaveBeenCalled();
  });
});
