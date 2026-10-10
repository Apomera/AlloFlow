// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),runtime=process.env.KITCHEN_LENS_RUNTIME||path.dirname(require.resolve('../stem_lab/kitchen_studio/recipe_lab_workspace.js'));
const R=require(path.join(runtime,'recipe_lab_engine.js'));window.KitchenRecipes=R;
const L=require(path.join(runtime,'recipe_lab_lens.js')),$=id=>document.getElementById(id);
function pan(id='mushroom',uneven=false){let s=R.start(id);for(const [a,v] of [['wash'],['rinse'],...(uneven?[['slice','0:5'],['finishCuts']]:[['cut']]),['dry'],['oil'],['produce']])s=R.act(s,a,v);return s;}
let ui,state,host,source,context;
beforeEach(()=>{
 document.body.innerHTML='<button id="outsideTool" type="button">Current tool</button><div id="recipeScene"><canvas width="800" height="520"></canvas></div><div class="camera-row"></div>';
 const style=document.createElement('style');style.textContent=readFileSync(path.join(runtime,'recipe_lab_lens_observation.css'),'utf8');document.body.append(style);
 context={clearRect:vi.fn(),drawImage:vi.fn(),putImageData:vi.fn()};vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
 source=$('recipeScene').firstElementChild;source.getBoundingClientRect=()=>({left:0,top:0,width:800,height:520});source.parentElement.getBoundingClientRect=()=>({left:0,top:0,width:800,height:520});
 host={pause:vi.fn(),apply:vi.fn()};ui=L.mount(host);$('foodLens').scrollIntoView=vi.fn();state=pan('mushroom',true);ui.render(state,false);
});
afterEach(()=>{if(ui)ui.dispose();vi.restoreAllMocks();document.body.replaceChildren();});
function scan(index=0,progress=.5){ui.scan(index,{clientX:350,clientY:200},source,undefined,progress);}
function next(action,value){state=R.act(state,action,value);ui.render(state,false);}
function heldReading(){return $('lensHeldReading').textContent;}
function normalizedSketch(o){const detached=document.createElement('div');detached.innerHTML=L.sketch(o);return detached.innerHTML;}

describe('Deliberate scans keep a shared Food lens observation',()=>{
 it('starts with one hidden, noninteractive scene card and the original canvas and controls intact',()=>{
  const card=$('sceneLensObservation');expect(document.querySelectorAll('#sceneLensObservation')).toHaveLength(1);expect(card.hidden).toBe(true);expect(ui.visible()).toBe(false);expect(card.getAttribute('aria-hidden')).toBe('true');expect(card.tabIndex).toBe(-1);expect(card.querySelector('button,input,select,a,[tabindex],[aria-live],[role="status"]')).toBeNull();expect(getComputedStyle(card).pointerEvents).toBe('none');expect($('recipeScene').firstElementChild).toBe(source);expect($('lensKeep').textContent).toBe('Keep this view');expect($('lensClear').textContent).toBe('Clear comparison');
 });
 it('keeps the first valid deliberate scan as a baseline without altering cooking evidence or moving focus',()=>{
  const before=JSON.stringify(state),scene=$('recipeScene'),parent=scene.parentNode,o=L.describe(state,0);$('outsideTool').focus();const result=ui.finishScan(0,true);
  expect(result).toEqual({captured:true,outcome:'kept',message:expect.stringContaining('View kept.')});expect(result.message).not.toContain('Action recorded');expect(ui.visible()).toBe(true);expect($('sceneLensOutcome').textContent).toBe('View kept');expect($('sceneLensObservation').dataset.mode).toBe('observation');expect($('sceneLensHeldTitle').textContent).toContain('Piece 1');expect($('sceneLensHeldTitle').textContent).toContain('Face '+(o.face+1));expect($('sceneLensHeldTitle').textContent).toContain('0:00');expect($('sceneLensCurrentTitle').textContent).toContain('Scanned');expect($('sceneLensCurrentArt').innerHTML).toBe(normalizedSketch(o));expect($('sceneLensHeldArt').innerHTML).toBe(normalizedSketch(o));expect($('sceneLensDifference').textContent).toBe(L.compare(o,o));expect($('sceneLensPrompt').textContent).toMatch(/change one.*scan again/i);expect($('lensClear').disabled).toBe(false);
  expect(document.activeElement).toBe($('outsideTool'));expect(scene.parentNode).toBe(parent);expect(scene.firstElementChild).toBe(source);expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();
 });
 it('retains the original baseline while comparing a later genuine cooking moment',()=>{
  const baseline=L.describe(state,0);ui.finishScan(0,true);const kept=heldReading(),art=$('sceneLensHeldArt').innerHTML;next('panHeat',2);next('advance',30);next('flipPiece',0);const current=L.describe(state,0),before=JSON.stringify(state),result=ui.finishScan(0,true);
  expect(result.captured).toBe(true);expect(result.outcome).toBe('compared');expect(result.message).toContain('Comparison ready.');expect(result.message).toContain(L.compare(baseline,current));expect($('lensComparison').textContent).toBe(result.message);expect(heldReading()).toBe(kept);expect($('sceneLensHeldArt').innerHTML).toBe(art);expect($('sceneLensDifference').textContent).toContain('other face');expect($('sceneLensDifference').textContent).not.toContain('simulated seconds');expect(result.message).toContain('30 simulated seconds later');expect($('sceneLensCurrentTitle').textContent).toContain('0:30');expect($('sceneLensCurrentArt').innerHTML).toBe(normalizedSketch(current));expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();
 });
 it('compares other pieces against the same baseline instead of silently replacing it',()=>{
  const baseline=L.describe(state,0);ui.finishScan(0,true);const kept=heldReading();for(const index of [7,3,9]){const result=ui.finishScan(index,true),full=L.compare(baseline,L.describe(state,index));expect(result.outcome).toBe('compared');expect(result.message).toContain(full);expect(heldReading()).toBe(kept);expect($('sceneLensHeldTitle').textContent).toContain('Piece 1');expect($('sceneLensCurrentTitle').textContent).toContain('Piece '+(index+1));const brief=$('sceneLensDifference').textContent;expect(brief).not.toContain('Comparing piece');expect(brief.length).toBeGreaterThan(0);if(!brief.startsWith('Compare the piece'))for(const sentence of brief.split('. ').filter(Boolean))expect(full).toContain(sentence);}
 });
 it('uses keep() and the existing Keep button to explicitly replace the shared baseline',()=>{
  ui.finishScan(0,true);ui.finishScan(7,true);const result=ui.keep(),current=L.describe(state,7);expect(result.outcome).toBe('kept');expect(result.captured).toBe(true);expect(heldReading()).toContain('Piece 8');expect($('sceneLensHeldTitle').textContent).toContain('Piece 8');expect($('sceneLensHeldArt').innerHTML).toBe(normalizedSketch(current));next('advance',15);$('lensKeep').focus();$('lensKeep').click();expect(heldReading()).toContain('0:15');expect($('sceneLensHeldTitle').textContent).toContain('0:15');expect($('sceneLensOutcome').textContent).toBe('View kept');expect(document.activeElement).toBe($('lensKeep'));expect(host.apply).not.toHaveBeenCalled();
 });
 it('lets the existing keyboard piece selector compare cuts without a gesture or a different baseline store',()=>{
  ui.keep();const kept=heldReading();ui.open(true);$('lensPiece').value='7';$('lensPiece').dispatchEvent(new Event('change'));expect(document.activeElement).toBe($('lensPiece'));expect($('lensLiveReading').textContent).toContain('35 mm');expect(heldReading()).toBe(kept);expect($('lensComparison').textContent).toBe(L.compare(L.describe(state,0),L.describe(state,7)));expect(ui.visible()).toBe(true);expect($('sceneLensCurrentTitle').textContent).toContain('Piece 8');expect($('sceneLensHeldTitle').textContent).toContain('Piece 1');expect($('sceneLensDifference').textContent).toContain('5 → 35 mm');expect($('sceneLensDifference').textContent).not.toContain('Comparing piece');$('lensKeep').click();expect(heldReading()).toContain('35 mm');expect($('sceneLensHeldTitle').textContent).toContain('Piece 8');
 });
 it('clears the scene card and baseline together through the existing Clear comparison control',()=>{
  ui.finishScan(0,true);$('lensClear').focus();$('lensClear').click();expect(ui.visible()).toBe(false);expect($('lensClear').disabled).toBe(true);expect(heldReading()).toContain('Keep a view');expect($('lensComparison').textContent).toContain('Kept view cleared');expect(document.activeElement).toBe($('lensClear'));expect(ui.finishScan(7,true).outcome).toBe('kept');expect($('sceneLensHeldTitle').textContent).toContain('Piece 8');
 });
 it('keeps keyboard selection without a baseline observational rather than inventing a comparison card',()=>{
  const before=JSON.stringify(state);ui.open(true);$('lensPiece').value='7';$('lensPiece').dispatchEvent(new Event('change'));expect($('lensLiveReading').textContent).toContain('Piece 8');expect(ui.visible()).toBe(false);expect($('lensClear').disabled).toBe(true);expect(document.activeElement).toBe($('lensPiece'));expect(JSON.stringify(state)).toBe(before);
 });
 it('summarizes a genuine multi-change tomato comparison without crowding the scene or losing full evidence',()=>{
  state=pan('tomato',true);state=R.act(state,'movePiece','0:0:0');ui.render(state,false);const baseline=L.describe(state,0);ui.finishScan(0,true);const kept=heldReading();state=R.act(state,'panHeat',2);for(let n=0;n<40&&!R.tomatoHandling(state).pieces[7].ready;n++)state=R.act(state,'advance',30);expect(R.tomatoHandling(state).pieces[7].ready).toBe(true);state=R.act(state,'crushTomato',7);state=R.act(state,'crushTomato',7);expect(R.tomatoHandling(state).pieces[7].texture).toBe('crushed');state=R.act(state,'movePiece','7:0:55');state=R.act(state,'panPlace','trivet');ui.render(state,false);
  const current=L.describe(state,7),full=L.compare(baseline,current),before=JSON.stringify(state),result=ui.finishScan(7,true),brief=$('sceneLensDifference').textContent;
  expect(full).toContain('Cut width:');expect(full).toContain('Upward color:');expect(full).toContain('Shape:');expect(full).toContain('Position:');expect(full).toContain('off its burner');expect(full).toContain('simulated seconds later');expect(brief).toBe('Upward color: '+baseline.color+' → '+current.color+'. Shape: '+baseline.texture+' → '+current.texture+'.');expect(brief.split('. ').length).toBe(2);expect(brief).not.toContain('Comparing piece');expect(brief).not.toContain('simulated seconds');expect(brief).not.toContain('No visible difference');expect($('sceneLensPrompt').textContent).toBe('Full comparison in Food lens.');expect(result.message).toContain(full);expect($('lensComparison').textContent).toBe(result.message);expect($('sceneLensCurrentTitle').textContent).toContain('Piece 8');expect($('sceneLensCurrentTitle').textContent).toContain(Math.floor(state.time/60)+':'+String(Math.floor(state.time%60)).padStart(2,'0'));expect(heldReading()).toBe(kept);expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();
 });
});

describe('Inspection practice remains observational and cancellable',()=>{
 it('selects a tapped piece without capturing a baseline or showing a completed card',()=>{
  const before=JSON.stringify(state),result=ui.finishScan(7,false);expect(result).toEqual({captured:false,outcome:'selected',message:expect.stringContaining('No new view kept. Sweep steadily')});expect($('lensPiece').value).toBe('7');expect($('lensLiveReading').textContent).toContain('Piece 8');expect($('lensClear').disabled).toBe(true);expect(ui.visible()).toBe(false);expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();
 });
 it('does not infer a deliberate release from a truthy value',()=>{
  expect(ui.finishScan(0,1).captured).toBe(false);expect(ui.finishScan(0,'true').captured).toBe(false);expect($('lensClear').disabled).toBe(true);expect(ui.visible()).toBe(false);
 });
 it.each([-1,14,NaN,.5,null])('rejects unavailable final piece %s without overwriting a valid baseline',index=>{
  ui.finishScan(0,true);const kept=heldReading(),before=JSON.stringify(state);const result=ui.finishScan(index,true);expect(result.captured).toBe(false);expect(result.message).toContain('No food view captured');expect(heldReading()).toBe(kept);expect(ui.visible()).toBe(false);expect(JSON.stringify(state)).toBe(before);expect(host.apply).not.toHaveBeenCalled();
 });
 it('keeps a cancelled active scan from replacing an earlier baseline',()=>{
  ui.finishScan(0,true);const kept=heldReading(),before=JSON.stringify(state);scan(7,1);expect(document.querySelector('.food-loupe').hidden).toBe(false);expect(document.querySelector('.food-loupe span').textContent).toContain('Release on food to compare');expect($('sceneLensObservation').dataset.mode).toBe('scan');ui.hide();expect(ui.visible()).toBe(false);expect(document.querySelector('.food-loupe').hidden).toBe(true);expect(heldReading()).toBe(kept);expect(JSON.stringify(state)).toBe(before);expect(ui.finishScan(7,true).outcome).toBe('compared');expect(heldReading()).toBe(kept);
 });
 it('shows only a compact sweep hint beside the active magnifier before release',()=>{
  const before=JSON.stringify(state);scan(0,.4);const card=$('sceneLensObservation');expect(ui.visible()).toBe(true);expect(card.dataset.mode).toBe('scan');expect($('sceneLensOutcome').textContent).toContain('40%');expect(getComputedStyle(card.querySelector('.scene-lens-pair')).display).toBe('none');expect(getComputedStyle($('sceneLensDifference')).display).toBe('none');expect($('sceneLensPrompt').textContent).toContain('Release on a visible piece');expect(document.querySelector('.food-loupe span').textContent).toContain('Keep sweeping');scan(0,1);expect($('sceneLensOutcome').textContent).toBe('Release on food');expect(document.querySelector('.food-loupe span').textContent).toContain('Release on food');expect($('lensClear').disabled).toBe(true);expect(JSON.stringify(state)).toBe(before);
 });
 it('does not write terminal announcements while sweeping between pieces or repainting magnification',()=>{
  ui.finishScan(0,true);const output=$('lensComparison'),message=output.textContent,observer=new MutationObserver(()=>{});observer.observe(output,{childList:true,subtree:true,characterData:true});for(const index of [0,7,3,9,0])scan(index,.5);expect(observer.takeRecords()).toHaveLength(0);observer.disconnect();expect(output.textContent).toBe(message);expect($('lensLiveReading').textContent).toContain('Piece 1');expect($('lensClear').disabled).toBe(false);
 });
 it('announces one settled comparison through the original lens status and deduplicates its identical repeat',()=>{
  ui.finishScan(0,true);const output=$('lensComparison'),observer=new MutationObserver(()=>{});observer.observe(output,{childList:true,subtree:true,characterData:true});const result=ui.finishScan(7,true);expect(output.getAttribute('aria-live')).toBe('polite');expect(output.textContent).toBe(result.message);expect(observer.takeRecords()).toHaveLength(1);ui.finishScan(7,true);expect(observer.takeRecords()).toHaveLength(0);observer.disconnect();expect(document.querySelectorAll('#lensComparison[role="status"]')).toHaveLength(1);expect($('sceneLensObservation').querySelector('[aria-live]')).toBeNull();
 });
 it('updates the ordinary live panel on a real state change without making cooking playback a live announcement',()=>{
  ui.finishScan(0,true);const kept=heldReading();next('advance',30);expect(heldReading()).toBe(kept);expect($('lensLiveReading').textContent).toContain('0:30');expect($('lensComparison').textContent).toContain('30 simulated seconds later');expect($('lensComparison').getAttribute('aria-live')).toBe('off');expect(ui.visible()).toBe(false);ui.finishScan(0,true);expect(ui.visible()).toBe(true);expect($('sceneLensCurrentTitle').textContent).toContain('0:30');expect($('lensComparison').textContent).toContain('30 simulated seconds later');expect($('sceneLensDifference').textContent).not.toContain('simulated seconds');
 });
});

describe('Temporary observation lifetime follows the original lens rules',()=>{
 it('retains a settled scene comparison on repeated renders of the exact same recipe state',()=>{
  ui.finishScan(0,true);ui.finishScan(7,true);const title=$('sceneLensCurrentTitle').textContent,difference=$('sceneLensDifference').textContent,kept=heldReading();for(let n=0;n<5;n++)ui.render(state,false);expect(ui.visible()).toBe(true);expect($('sceneLensCurrentTitle').textContent).toBe(title);expect($('sceneLensDifference').textContent).toBe(difference);expect(heldReading()).toBe(kept);
 });
 it('hides completed and active observations while retaining the baseline for later scans',()=>{
  ui.finishScan(0,true);const kept=heldReading();ui.hide();expect(ui.visible()).toBe(false);expect(heldReading()).toBe(kept);next('advance',15);expect(ui.visible()).toBe(false);const result=ui.finishScan(0,true);expect(result.outcome).toBe('compared');expect($('sceneLensCurrentTitle').textContent).toContain('0:15');expect(result.message).toContain('15 simulated seconds later');
 });
 it('clears a baseline for a fresh cook and hides unavailable or plated food',()=>{
  ui.finishScan(0,true);ui.render(R.start(),false);expect($('lensClear').disabled).toBe(true);expect(ui.visible()).toBe(false);expect($('lensPiece').disabled).toBe(true);expect(ui.finishScan(0,true).captured).toBe(false);ui.render(state,false);ui.finishScan(0,true);ui.render({...state,plated:true},false);expect(ui.visible()).toBe(false);expect(ui.finishScan(0,true).captured).toBe(false);
 });
 it('clears live observations at replay boundaries but supports separate read-only historical comparisons',()=>{
  ui.finishScan(0,true);ui.render(state,true);expect($('lensClear').disabled).toBe(true);expect(ui.visible()).toBe(false);const result=ui.finishScan(0,true);expect(result.outcome).toBe('kept');expect(result.message).toContain('Recorded');expect(result.message).toContain('Compare another recorded');expect($('sceneLensCurrentTitle').textContent).toContain('Recorded');expect($('sceneLensPrompt').textContent).toContain('Compare another recorded');const later=R.act(state,'advance',15);ui.render(later,true);const compared=ui.finishScan(0,true);expect(compared.outcome).toBe('compared');expect($('sceneLensCurrentTitle').textContent).toContain('0:15');expect(compared.message).toContain('15 simulated seconds later');ui.render(later,false);expect($('lensClear').disabled).toBe(true);expect(ui.visible()).toBe(false);expect(host.apply).not.toHaveBeenCalled();
 });
 it('clears a baseline when recipe or serving count changes',()=>{
  ui.finishScan(0,true);ui.render(pan('tomato'),false);expect($('lensClear').disabled).toBe(true);expect(ui.visible()).toBe(false);ui.finishScan(0,true);ui.render({...pan('tomato'),servings:4},false);expect($('lensClear').disabled).toBe(true);expect(ui.visible()).toBe(false);
 });
 it('removes its card, magnifier and listeners on dispose without moving the original canvas',()=>{
  ui.finishScan(0,true);ui.dispose();expect($('sceneLensObservation')).toBeNull();expect(document.querySelector('.food-loupe')).toBeNull();expect($('foodLens')).toBeNull();expect($('recipeScene').firstElementChild).toBe(source);expect(host.apply).not.toHaveBeenCalled();
 });
});
