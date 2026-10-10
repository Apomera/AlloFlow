// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),runtime=process.env.KITCHEN_PAN_CARRY_RUNTIME||path.dirname(require.resolve('../stem_lab/kitchen_studio/recipe_lab_engine.js'));
const R=require(path.join(runtime,'recipe_lab_engine.js')),P=require(path.join(runtime,'recipe_lab_pan_carry.js')),$=id=>document.getElementById(id);
let ui,state,host,svg,captures;
function render(zone='pan',historical=false){ui.render(state,zone,historical);}
function click(id){$(id).click();}
function key(k,repeat=false){$('panPlacementHandle').dispatchEvent(new KeyboardEvent('keydown',{key:k,repeat,bubbles:true,cancelable:true}));}
function pointer(type,target,x=132,y=112,id=1,extra={}){let e=new Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,pointerId:id,isPrimary:true,button:0,...extra});target.dispatchEvent(e);}
function keyboardReady(){click('panPlacementToggle');click(R.panPosition(state).site==='burner'?'panPlacementToTrivet':'panPlacementToBurner');click('panPlacementLower');}
function dragReady(from='burner'){let x=from==='burner'?132:310,to=from==='burner'?310:132;pointer('pointerdown',$('panPlacementHandle'),x,112);pointer('pointermove',svg,x,72);pointer('pointermove',svg,to,112);pointer('pointermove',svg,to,152);}
function placements(){return state.log.filter(e=>e.action==='panPlace'&&e.accepted);}
beforeEach(()=>{
 document.body.innerHTML='<p id="handsDialHelp">Turn the burner dial.</p><button id="outsideControl">Elsewhere</button>';window.KitchenRecipes=R;window.KitchenPanCarry=P;
 window.eval(readFileSync(path.join(runtime,'recipe_lab_heat.js'),'utf8'));state=R.start('mushroom');state=R.act(state,'panHeat',3);state=R.act(state,'advance',60);
 host={getState:()=>state,pause:vi.fn(),ended:vi.fn(()=>false),apply:vi.fn((action,value,method)=>{state=R.act(state,action,value,method);render();})};ui=window.KitchenHeatTools.mount(host);svg=$('panPlacementSvg');
 svg.getBoundingClientRect=()=>({left:0,top:0,width:360,height:230,right:360,bottom:230});captures=new Set();svg.setPointerCapture=id=>captures.add(id);svg.hasPointerCapture=id=>captures.has(id);svg.releasePointerCapture=id=>captures.delete(id);$('panPlacementTools').scrollIntoView=vi.fn();
 const style=document.createElement('style');style.dataset.panCarryTest='true';style.textContent=readFileSync(path.join(runtime,'recipe_lab_pan_carry.css'),'utf8');document.head.append(style);render();$('panPlacementTools').open=true;
});
afterEach(()=>{ui.dispose();document.querySelectorAll('style[data-pan-carry-test]').forEach(el=>el.remove());document.body.replaceChildren();vi.restoreAllMocks();});

describe('The pan handle requires a complete equivalent carry',()=>{
 it('starts with a handle-only grip and explicit accessible steps without moving or pausing',()=>{
  expect($('panPlacementTools').dataset.panCarryPhase).toBe('idle');expect($('panPlacementHandle').getAttribute('role')).toBe('button');expect($('panPlacementPan').getAttribute('role')).toBeNull();expect($('panPlacementPan').querySelector('ellipse').closest('#panPlacementHandle')).toBeNull();expect($('panPlacementSvg').getAttribute('viewBox')).toBe('0 0 360 230');expect(host.pause).not.toHaveBeenCalled();expect(host.apply).not.toHaveBeenCalled();
  expect($('panPlacementToggle').disabled).toBe(false);for(const id of ['panPlacementToBurner','panPlacementToTrivet','panPlacementLower','panPlacementRelease','panPlacementCancel'])expect($(id).disabled).toBe(true);expect($('panPlacementKeyboard').textContent).toContain('Enter lowers');
 });
 it('keeps lift, carry and lower as previews; only Release records one placement',()=>{
  const before=JSON.stringify(state),temp=state.pan.temp,time=state.time;click('panPlacementToggle');expect($('panPlacementTools').dataset.panCarryPhase).toBe('carry');expect(host.pause).toHaveBeenCalledTimes(1);expect($('panPlacementToTrivet').disabled).toBe(false);expect($('panPlacementToBurner').disabled).toBe(true);expect($('panPlacementPan').getAttribute('transform')).toContain('-44.80');
  click('panPlacementToTrivet');expect($('panPlacementTools').dataset.panCarryPhase).toBe('lower');expect($('panPlacementLanding').getAttribute('visibility')).toBe('visible');click('panPlacementLower');expect($('panPlacementTools').dataset.panCarryPhase).toBe('done');expect($('panPlacementPan').getAttribute('transform')).toBe('translate(178.00 0.00)');expect($('panPlacementRelease').disabled).toBe(false);expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();
  click('panPlacementRelease');expect(host.apply).toHaveBeenCalledExactlyOnceWith('panPlace','trivet','pan-carry-keyboard');expect(placements()).toHaveLength(1);expect(R.panPosition(state).site).toBe('trivet');expect(state.pan.temp).toBe(temp);expect(state.pan.heat).toBe(3);expect(state.time).toBe(time);expect($('panPlacementTools').dataset.panCarryPhase).toBe('idle');click('panPlacementRelease');expect(host.apply).toHaveBeenCalledTimes(1);
 });
 it('returns from trivet to burner with another deliberate release',()=>{
  keyboardReady();click('panPlacementRelease');const first=state.log.length;keyboardReady();expect(state.log).toHaveLength(first);expect($('panPlacementToTrivet').disabled).toBe(true);click('panPlacementRelease');expect(R.panPosition(state).site).toBe('burner');expect(placements()).toHaveLength(2);expect(host.apply.mock.calls[1]).toEqual(['panPlace','burner','pan-carry-keyboard']);
 });
 it('cannot lower or release before choosing the other support',()=>{
  click('panPlacementLower');click('panPlacementRelease');key('ArrowRight');expect(host.apply).not.toHaveBeenCalled();expect($('panPlacementTools').dataset.panCarryPhase).toBe('idle');key('Enter');key('Enter');expect($('panPlacementTools').dataset.panCarryPhase).toBe('carry');expect($('panPlacementFeedback').textContent).toContain('Choose the other support');key('ArrowLeft');expect($('panPlacementTools').dataset.panCarryPhase).toBe('carry');expect(host.apply).not.toHaveBeenCalled();
 });
 it('supports handle Enter, arrows, Enter lower and Enter release without repeated-key actions',()=>{
  key('Enter');key('Enter',true);expect($('panPlacementTools').dataset.panCarryPhase).toBe('carry');key('ArrowRight');key('Enter');expect($('panPlacementTools').dataset.panCarryPhase).toBe('done');expect(host.apply).not.toHaveBeenCalled();key('Enter',true);expect(host.apply).not.toHaveBeenCalled();key('Enter');expect(placements()).toHaveLength(1);expect(host.apply).toHaveBeenCalledExactlyOnceWith('panPlace','trivet','pan-carry-keyboard');
 });
 it('supports Space and keeps focus stable while step buttons are used',()=>{
  $('panPlacementHandle').focus();key(' ');key('ArrowRight');key(' ');expect(host.apply).not.toHaveBeenCalled();key(' ');expect(placements()).toHaveLength(1);expect(document.activeElement).toBe($('panPlacementHandle'));
 });
 it('keeps residual heat and a still-on empty burner visible after the real move',()=>{
  keyboardReady();click('panPlacementRelease');expect($('panPlacementBurnerLabel').textContent).toBe('Burner · high · empty');expect($('panPlacementReading').textContent).toContain('Stored heat can keep cooking');expect($('panPlacementReading').textContent).toContain('did not switch it off');expect($('panPlacementTemperature').textContent).toBe(Math.round(state.pan.temp)+'°C');expect($('panPlacementHot').textContent).toBe('Hot pan · handle only');
 });
});

describe('Pointer carries share the same contract',()=>{
 it('does nothing when the pan bowl is pressed or the handle is merely clicked',()=>{
  pointer('pointerdown',$('panPlacementPan').querySelector('ellipse'));pointer('pointerup',svg);expect($('panPlacementTools').dataset.panCarryPhase).toBe('idle');expect(host.pause).not.toHaveBeenCalled();pointer('pointerdown',$('panPlacementHandle'));pointer('pointerup',svg);expect(host.apply).not.toHaveBeenCalled();expect($('panPlacementFeedback').textContent).toContain('No move recorded');expect(captures.size).toBe(0);
 });
 it('rejects a flat slide onto the trivet',()=>{
  const before=JSON.stringify(state);pointer('pointerdown',$('panPlacementHandle'));pointer('pointermove',svg,310,112);pointer('pointerup',svg,310,112);expect(host.apply).not.toHaveBeenCalled();expect(JSON.stringify(state)).toBe(before);expect($('panPlacementTools').dataset.panCarryPhase).toBe('idle');
 });
 it('shows a lifted pan, carry target and lowered preview before the native release',()=>{
  const before=JSON.stringify(state);dragReady();expect($('panPlacementTools').dataset.panCarryPhase).toBe('done');expect($('panPlacementPreviewLabel').textContent).toContain('no move recorded');expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();pointer('pointerup',svg,310,152);expect(host.apply).toHaveBeenCalledExactlyOnceWith('panPlace','trivet','pan-carry-svg');expect(placements()).toHaveLength(1);expect(captures.size).toBe(0);
 });
 it('requires lowering after a lift and carry, then permits a complete return',()=>{
  pointer('pointerdown',$('panPlacementHandle'));pointer('pointermove',svg,132,72);pointer('pointermove',svg,310,112);pointer('pointerup',svg,310,112);expect(host.apply).not.toHaveBeenCalled();dragReady();pointer('pointerup',svg,310,152);dragReady('trivet');pointer('pointerup',svg,132,152);expect(placements()).toHaveLength(2);expect(R.panPosition(state).site).toBe('burner');
 });
 it.each(['pointercancel','lostpointercapture'])('cancels a fully prepared carry on %s',type=>{
  const before=JSON.stringify(state);dragReady();pointer(type,svg,310,152);pointer('pointerup',svg,310,152);expect(host.apply).not.toHaveBeenCalled();expect(JSON.stringify(state)).toBe(before);expect(captures.size).toBe(0);expect($('panPlacementPan').getAttribute('transform')).toBe('translate(0.00 0.00)');
 });
 it('cancels when a second pointer touches the handle and ignores non-primary/right-button attempts',()=>{
  pointer('pointerdown',$('panPlacementHandle'),132,112,2,{isPrimary:false});pointer('pointerdown',$('panPlacementHandle'),132,112,2,{button:2});expect(host.pause).not.toHaveBeenCalled();dragReady();pointer('pointerdown',$('panPlacementHandle'),132,112,2);pointer('pointerup',svg,310,152);expect(host.apply).not.toHaveBeenCalled();expect(captures.size).toBe(0);
 });
});

describe('Lifecycle and observation preserve accepted cooking work',()=>{
 it.each(['Escape','cancel-button','api','blur','resize','pagehide','close'])('cancels an unfinished carry through %s without changing cooking state',reason=>{
  const before=JSON.stringify(state);keyboardReady();if(reason==='Escape')window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',cancelable:true}));else if(reason==='cancel-button')click('panPlacementCancel');else if(reason==='api')ui.cancel();else if(reason==='close'){$('panPlacementTools').open=false;$('panPlacementTools').dispatchEvent(new Event('toggle'));}else window.dispatchEvent(new Event(reason));expect($('panPlacementTools').dataset.panCarryPhase).toBe('idle');click('panPlacementRelease');expect(host.apply).not.toHaveBeenCalled();expect(JSON.stringify(state)).toBe(before);
 });
 it.each(['new-state','hidden-zone','replay','ended'])('cancels held work on %s',reason=>{
  keyboardReady();if(reason==='new-state')state=R.act(state,'panHeat',2);if(reason==='ended')host.ended.mockReturnValue(true);const before=JSON.stringify(state);render(reason==='hidden-zone'?'pot':'pan',reason==='replay');click('panPlacementRelease');expect($('panPlacementTools').dataset.panCarryPhase).toBe('idle');expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();if(reason==='hidden-zone'){expect($('panPlacementTools').hidden).toBe(true);click('panPlacementToggle');expect($('panPlacementTools').dataset.panCarryHeld).toBe('false');}
 });
 it('renders the recorded support, temperature and burner without enabling replay movement',()=>{
  keyboardReady();click('panPlacementRelease');host.apply.mockClear();render('pan',true);expect($('panPlacementSummary').textContent).toBe('On trivet');expect($('panPlacementToggle').disabled).toBe(true);expect($('panPlacementHandle').getAttribute('tabindex')).toBe('-1');expect($('panPlacementFeedback').textContent).toContain('Recorded pan position');key('Enter');click('panPlacementToggle');expect(host.apply).not.toHaveBeenCalled();
 });
 it('opens equivalent controls without an action and disposes all owned event listeners',()=>{
  const before=JSON.stringify(state);ui.open();expect($('panPlacementTools').open).toBe(true);expect(document.activeElement).toBe($('panPlacementHandle'));expect(host.pause).not.toHaveBeenCalled();expect(host.apply).not.toHaveBeenCalled();keyboardReady();const release=$('panPlacementRelease');ui.dispose();release.click();window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));expect($('panPlacementTools')).toBeNull();expect(host.apply).not.toHaveBeenCalled();expect(JSON.stringify(state)).toBe(before);ui.cancel();ui.dispose();
 });
 it('cancels a native preview only when an actual equivalent carry begins',()=>{
  host.cancelNative=vi.fn();render();ui.open();expect(host.cancelNative).not.toHaveBeenCalled();click('panPlacementToggle');expect(host.cancelNative).toHaveBeenCalledTimes(1);click('panPlacementToTrivet');click('panPlacementLower');ui.cancel();expect(host.cancelNative).toHaveBeenCalledTimes(1);pointer('pointerdown',$('panPlacementHandle'));expect(host.cancelNative).toHaveBeenCalledTimes(2);pointer('pointercancel',svg);render('pan',true);click('panPlacementToggle');expect(host.cancelNative).toHaveBeenCalledTimes(2);expect(host.apply).not.toHaveBeenCalled();
 });
 it('provides touch-sized step buttons and motion/forced-color styles',()=>{
  for(const id of ['panPlacementToggle','panPlacementToBurner','panPlacementToTrivet','panPlacementLower','panPlacementRelease','panPlacementCancel'])expect(getComputedStyle($(id)).minHeight).toBe('44px');const css=readFileSync(path.join(runtime,'recipe_lab_pan_carry.css'),'utf8');expect(css).toContain('prefers-reduced-motion:reduce');expect(css).toContain('forced-colors:active');expect(css).toContain('HighlightText');
 });
});
