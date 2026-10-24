// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),runtime=process.env.KITCHEN_WATCH_RUNTIME||path.dirname(require.resolve('../stem_lab/kitchen_studio/recipe_lab_engine.js'));
const R=require(path.join(runtime,'recipe_lab_engine.js')),H=require(path.join(runtime,'recipe_lab_hands.js')),T=require(path.join(runtime,'recipe_lab_thermometer.js')),$=id=>document.getElementById(id);
let state,ui,host,frames,listeners,dispose,elementFromPoint;
function load(file){new Function('window',readFileSync(path.join(runtime,file),'utf8'))(window);}
function pointer(node,type,id,x,y){const e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{pointerId:{value:id},isPrimary:{value:true},button:{value:0},clientX:{value:x},clientY:{value:y}});node.dispatchEvent(e);}
function capture(node,width,height){const ids=new Set();node.getBoundingClientRect=()=>({left:0,top:0,right:width,bottom:height,width,height});node.setPointerCapture=vi.fn(id=>ids.add(id));node.hasPointerCapture=id=>ids.has(id);node.releasePointerCapture=vi.fn(id=>{if(ids.delete(id))pointer(node,'lostpointercapture',id,0,0);});return ids;}
function key(node,key,code=key){node.dispatchEvent(new KeyboardEvent('keydown',{key,code,bubbles:true,cancelable:true}));}
function prepared(){let s=R.start('mushroom');for(const a of ['wash','rinse','cut','dry','oil','produce'])s=R.act(s,a);return s;}
// 91652c2fe: the hands jug is the mounted Jug Studio (SVG #handsJug, viewBox 400x300), active
// only while the saved-water tool is open (recipe_lab.js passes that as render's 4th argument).
function mountHands(s=R.startRescue('dry',0),jugActive=false){
 document.body.innerHTML='<div id="benchObservation"></div><section data-bench-group="prep"></section><section data-bench-group="pan"></section><div id="pourPanel"><div class="pour-heading"></div></div>';
 // Forward the input method like recipe_lab.js: the studio verifies each dose against R.act(..., 'tilt').
 state=s;host={pause:vi.fn(),ended:()=>false,getState:()=>state,apply:vi.fn((a,v,m)=>{state=R.act(state,a,v,m);ui.render(state,'pan',false,jugActive);})};load('recipe_lab_jug.js');load('recipe_lab_jug_studio.js');load('recipe_lab_hands_ui.js');ui=window.KitchenHandsUI.mount(host);ui.render(state,'pan',false,jugActive);capture($('handsDialpot'),160,130);capture($('handsDialpan'),160,130);capture($('handsJug'),400,300);
}
function mountProbe(){document.body.innerHTML='<section id="probeAnchor"></section>';state=R.act(R.start(),'fill');host={after:$('probeAnchor'),pause:vi.fn(),has3D:()=>false,cancelNative:vi.fn(),openNative:vi.fn(),observed:vi.fn()};ui=T.mount(host);dispose=()=>ui.dispose();ui.render(state,false,false);}
function readyProbe(){ui.open();for(let n=0;n<3;n++)$('thermometerLower').click();for(let n=0;n<3;n++)$('thermometerLift').click();expect($('thermometerCapture').disabled).toBe(false);}
function mountSurface(){document.body.innerHTML='<section id="mixPanel"></section>';state=prepared();host={pause:vi.fn(),ended:()=>false,getState:()=>state,apply:vi.fn((a,v)=>{state=R.act(state,a,v);ui.render(state,'pan',false);})};load('recipe_lab_turning.js');load('recipe_lab_skillet.js');load('recipe_lab_scene.js');ui=window.KitchenSceneTools.mountSurface(host);ui.render(state,'pan',false);capture($('panMap'),360,310);}
beforeEach(()=>{
 frames=new Map();listeners=[];dispose=null;window.KitchenRecipes=R;window.KitchenHands=H;elementFromPoint=document.elementFromPoint;document.elementFromPoint=vi.fn(()=>null);
 let nextFrame=0;vi.stubGlobal('requestAnimationFrame',fn=>{frames.set(++nextFrame,fn);return nextFrame;});vi.stubGlobal('cancelAnimationFrame',id=>frames.delete(id));
 for(const target of [window,document]){const original=target.addEventListener.bind(target);vi.spyOn(target,'addEventListener').mockImplementation((name,fn,options)=>{listeners.push([target,name,fn,options]);original(name,fn,options);});}
});
afterEach(()=>{if(dispose)dispose();else if(ui&&ui.cancel)ui.cancel();listeners.forEach(([target,name,fn,options])=>target.removeEventListener(name,fn,options));frames.clear();document.body.replaceChildren();if(elementFromPoint)document.elementFromPoint=elementFromPoint;else delete document.elementFromPoint;vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('Watch cancellation returns held hands tools without undoing real work',()=>{
 it.each(['pot','pan'])('ends a held %s burner dial without later heat changes',station=>{
  mountHands();const dial=$('handsDial'+station),before=state;pointer(dial,'pointerdown',0,45,100);pointer(dial,'pointermove',0,115,100);expect(state[station].heat).toBe(3);expect(dial.hasPointerCapture(0)).toBe(true);expect(state).not.toBe(before);
  // Rendering its own accepted heat change must not stop a deliberate dial turn.
  pointer(dial,'pointermove',0,80,16);expect(state[station].heat).toBe(2);const kept=state,snapshot=JSON.stringify(state),calls=host.apply.mock.calls.length;ui.cancel();expect(dial.hasPointerCapture(0)).toBe(false);pointer(dial,'pointermove',0,45,100);pointer(dial,'pointerup',0,45,100);ui.cancel();expect(host.apply).toHaveBeenCalledTimes(calls);expect(state).toBe(kept);expect(JSON.stringify(state)).toBe(snapshot);
 });
 it('releases both private dial captures when the workbench changes station',()=>{
  mountHands();pointer($('handsDialpot'),'pointerdown',11,80,65);pointer($('handsDialpan'),'pointerdown',12,80,65);expect($('handsDialpot').hasPointerCapture(11)).toBe(true);expect($('handsDialpan').hasPointerCapture(12)).toBe(true);ui.render(state,'pot',false);expect($('handsDialpot').hasPointerCapture(11)).toBe(false);expect($('handsDialpan').hasPointerCapture(12)).toBe(false);host.apply.mockClear();pointer($('handsDialpot'),'pointermove',11,115,100);pointer($('handsDialpan'),'pointermove',12,115,100);expect(host.apply).not.toHaveBeenCalled();
 });
 it('stops a jug capture and queued flow while retaining accepted water and ingredients',()=>{
  // Carry to the dotted pan target, pull down to tilt, then cancel mid-pour through the hands UI.
  mountHands(undefined,true);const jug=$('handsJug'),phase=()=>document.querySelector('.jug-studio').dataset.jugPhase;pointer(jug,'pointerdown',7,80,100);pointer(jug,'pointermove',7,275,125);pointer(jug,'pointermove',7,275,195);let time=0;while(state.pan.waterAdded===0&&time<3000){const item=frames.entries().next().value;expect(item).toBeDefined();frames.delete(item[0]);item[1](time+=100);}expect(state.pan.waterAdded).toBe(10);expect(phase()).toBe('pour');const kept=state,snapshot=JSON.stringify(state),amount=state.pot.reserve,calls=host.apply.mock.calls.length,queued=Array.from(frames.values());ui.cancel();expect(jug.hasPointerCapture(7)).toBe(false);expect(frames.size).toBe(0);queued.forEach(fn=>fn(time+100));pointer(jug,'pointermove',7,275,230);pointer(jug,'pointerup',7,275,230);expect(host.apply).toHaveBeenCalledTimes(calls);expect(state).toBe(kept);expect(state.pot.reserve).toBe(amount);expect(JSON.stringify(state)).toBe(snapshot);expect(phase()).toBe('idle');expect($('jugStudioStream').getAttribute('visibility')).toBe('hidden');
 });
 it('cancels a carried ingredient and its selection before an old release or destination click',()=>{
  mountHands(prepared());const source=document.querySelector('[data-hand-item="garlic"]');capture(source,100,100);pointer(source,'pointerdown',9,20,20);pointer(source,'pointermove',9,40,20);expect(source.hasPointerCapture(9)).toBe(true);const kept=state;ui.cancel();expect(source.hasPointerCapture(9)).toBe(false);pointer(source,'pointerup',9,40,20);document.querySelector('[data-hand-target="pan"]').click();expect(host.apply).not.toHaveBeenCalled();expect(state).toBe(kept);expect(document.querySelector('.hands-drag-ghost').hidden).toBe(true);
 });
});

describe('Watch cancellation discards only the current thermometer preview',()=>{
 it('rejects an old completed lower-and-lift preview after cancel',()=>{
  mountProbe();readyProbe();const snapshot=JSON.stringify(state),calls=host.observed.mock.calls.length;ui.cancel();expect($('thermometerCapture').disabled).toBe(true);expect($('thermometerPhase').textContent).toBe('Probe at rest');key($('thermometerControl'),'Enter');$('thermometerCapture').click();expect($('thermometerReadings').children).toHaveLength(0);expect(host.observed).toHaveBeenCalledTimes(calls);expect(JSON.stringify(state)).toBe(snapshot);expect(host.openNative).not.toHaveBeenCalled();
 });
 it('preserves an earlier accepted check while clearing a new ready preview',()=>{
  mountProbe();readyProbe();$('thermometerCapture').click();const cards=$('thermometerReadings').innerHTML,summary=$('thermometerSummary').textContent,reading=host.observed.mock.calls.at(-1)[0],calls=host.observed.mock.calls.length;readyProbe();ui.cancel();ui.cancel();key($('thermometerControl'),'Enter');expect($('thermometerReadings').innerHTML).toBe(cards);expect($('thermometerSummary').textContent).toBe(summary);expect(host.observed).toHaveBeenCalledTimes(calls);expect(reading.temp).toBe(state.pot.temp);expect($('thermometerCapture').disabled).toBe(true);readyProbe();$('thermometerCapture').click();expect($('thermometerReadings').children).toHaveLength(2);
 });
});

describe('Watch cancellation restores the pan map without a drop or turn',()=>{
 it('restores a dragged food piece and rejects its old release',()=>{
  mountSurface();const svg=$('panMap'),piece=document.querySelector('[data-pan-map-piece="0"]'),p=R.panSurface(state).pieces[0],x=180+p.x*185,y=155+p.z*185,original=piece.getAttribute('transform');pointer(piece,'pointerdown',2,x,y);pointer(svg,'pointermove',2,180,155);expect(svg.hasPointerCapture(2)).toBe(true);expect(piece.getAttribute('transform')).not.toBe(original);const kept=state,snapshot=JSON.stringify(state);ui.cancel();expect(svg.hasPointerCapture(2)).toBe(false);expect(piece.getAttribute('transform')).toBe(original);pointer(svg,'pointerup',2,180,155);ui.cancel();expect(host.apply).not.toHaveBeenCalled();expect(state).toBe(kept);expect(JSON.stringify(state)).toBe(snapshot);
 });
 it('does not turn a cancelled pending tap, and accepts a deliberate new tap afterward',()=>{
  mountSurface();const svg=$('panMap'),piece=document.querySelector('[data-pan-map-piece="0"]'),p=R.panSurface(state).pieces[0],x=180+p.x*185,y=155+p.z*185;pointer(piece,'pointerdown',4,x,y);ui.cancel();pointer(svg,'pointerup',4,x,y);expect(host.apply).not.toHaveBeenCalled();pointer(piece,'pointerdown',5,x,y);pointer(svg,'pointerup',5,x,y);expect(host.apply).toHaveBeenCalledTimes(1);expect(host.apply).toHaveBeenCalledWith('flipPiece',0,'pan-map');expect(state.log.at(-1).accepted).toBe(true);
 });
});
