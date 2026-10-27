import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {node,freshTool,mountState,unmountState,click,change,pointer} from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(()=>{
 freshTool();
 vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);
 vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){
  return new Proxy({canvas:this},{get(target,key){if(key in target)return target[key];if(key==='measureText')return()=>({width:20});if(/create.*Gradient/.test(String(key)))return()=>({addColorStop(){}});return()=>{};}});
 });
 vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
});
afterEach(async()=>{await unmountState();outside?.remove();outside=null;vi.restoreAllMocks();vi.unstubAllGlobals();});
const q=s=>node().querySelector(s),all=s=>[...node().querySelectorAll(s)];
const byText=text=>all('button').find(button=>button.textContent.trim().startsWith(text));
const core=()=>window.__WeldLabCore;
const panel=()=>q('[data-hunt-review]'),reading=()=>q('#hunt6-review-reading');
const pick=id=>q('[data-hunt-review-pick="'+id+'"]');
const nav=direction=>q('[data-hunt-review-'+direction+']');
const surface=()=>q('[aria-roledescription="inspection surface"]');
const retained={car2_reflect:'Keep this reflection.',qp_ans:{0:1},weldBadges:{ppeSafety:true}};
const state={...retained,view:'defectHunt'};
function outsideFocus(){outside=document.createElement('button');outside.textContent='Outside focus';document.body.append(outside);outside.focus();}
async function probe(id,sample='sampleA'){
 const geom=core().DH_SAMPLE_GEOM[sample],mark=geom.marks.find(m=>m.id===id),canvas=surface().querySelector('canvas');
 const frame=core().dhFrame(geom,canvas._logicalW||canvas.width||900,canvas._logicalH||canvas.height||280),at=core().dhToPx(frame,mark.u,mark.v);
 await pointer(canvas,'click',{clientX:at.x,clientY:at.y});
}
async function classify(cls){
 const radios=all('[aria-label="Classify the selected spot"] button[role="radio"]'),index=cls==='ok'?core().DH_DEFECT_TYPES.length:core().DH_DEFECT_TYPES.indexOf(cls);
 expect(index).toBeGreaterThanOrEqual(0);await click(radios[index]);await click(byText('Confirm classification'));
}
async function commit(id,cls,sample='sampleA'){await probe(id,sample);await classify(cls);}
async function commitThree(){await commit('A1','undercut');await commit('A5','undercut');await commit('A2','undercut');}
function snapshot(app){return{saved:structuredClone(app.latest()),writes:app.writes.length,stats:surface().querySelector('canvas').getAttribute('aria-label')};}
function unchanged(app,before){expect(app.latest()).toEqual(before.saved);expect(app.latest()).toMatchObject(retained);expect(app.writes).toHaveLength(before.writes);expect(surface().querySelector('canvas').getAttribute('aria-label')).toBe(before.stats);}
function verifyReading(){
 const result=reading();expect(result).toBeTruthy();expect(result.tagName).toBe('DL');expect(result.getAttribute('aria-live')).toBe('polite');expect(result.getAttribute('aria-atomic')).toBe('true');
 expect(all('#hunt6-review-reading')).toHaveLength(1);expect(result.querySelector('canvas,svg,input,button,select')).toBeNull();expect(result.querySelectorAll('dt')).toHaveLength(4);expect(result.querySelectorAll('dd')).toHaveLength(4);
 for(const control of [...all('[data-hunt-review-pick]'),nav('prev'),nav('next')])expect(control.getAttribute('aria-controls')).toBe(result.id);
 const selected=q('[data-hunt-review-pick][aria-pressed="true"]');expect(result.querySelector('[data-hunt-review-truth]').textContent).toBe(selected.textContent);
 return result;
}

describe('Defect Hunt committed notebook keyboard and textual feedback',()=>{
 it.each([false,true])('keeps initial and pending findings out of the live region without taking focus (contrast=%s)',async contrast=>{
  outsideFocus();const app=await mountState(state,contrast);expect(document.activeElement).toBe(outside);expect(panel().dataset.huntReview).toBe('empty');expect(reading()).toBeNull();expect(app.writes).toHaveLength(0);
  await probe('A1');expect(q('#dh2-cls-h')).toBeTruthy();expect(reading()).toBeNull();expect(all('[data-hunt-review-pick]')).toHaveLength(0);
  await click(byText('Cancel'));await click(byText('👁️ Reveal all'));expect(reading()).toBeNull();expect(all('[data-hunt-review-pick]')).toHaveLength(0);expect(app.latest().defectCatalog).toBeUndefined();
 });

 it.each([false,true])('moves focus from disabled boundary navigation to the selected native finding while preserving mistaken calls and scores (contrast=%s)',async contrast=>{
  const app=await mountState(state,contrast);await commit('A1','undercut');await commit('A5','undercut');const before=snapshot(app),result=verifyReading();
  expect(q('[data-hunt-review-first-call]').dataset.huntReviewFirstCall).toBe('undercut');expect(q('[data-hunt-review-truth]').dataset.huntReviewTruth).toBe('ok');
  nav('prev').focus();await click(nav('prev'));expect(nav('prev').disabled).toBe(true);expect(document.activeElement).toBe(pick('A1'));expect(pick('A1').getAttribute('aria-pressed')).toBe('true');expect(verifyReading()).toBe(result);
  expect(q('[data-hunt-review-first-call]').dataset.huntReviewFirstCall).toBe('undercut');expect(q('[data-hunt-review-truth]').dataset.huntReviewTruth).toBe('porosity');
  await click(nav('prev'));expect(document.activeElement).toBe(pick('A1'));expect(panel().dataset.huntReview).toBe('A1');
  nav('next').focus();await click(nav('next'));expect(nav('next').disabled).toBe(true);expect(document.activeElement).toBe(pick('A5'));expect(verifyReading()).toBe(result);
  await click(nav('next'));expect(document.activeElement).toBe(pick('A5'));unchanged(app,before);
 });

 it.each([false,true])('retains operable interior navigation focus and updates the same text-only result (contrast=%s)',async contrast=>{
  const app=await mountState(state,contrast);await commitThree();const before=snapshot(app),result=verifyReading(),lastText=result.textContent;const announcer=document.getElementById('allo-live-weldlab');announcer.textContent='Unchanged announcement';
  nav('prev').focus();await click(nav('prev'));expect(panel().dataset.huntReview).toBe('A5');expect(nav('prev').disabled).toBe(false);expect(document.activeElement).toBe(nav('prev'));expect(verifyReading()).toBe(result);expect(result.textContent).not.toBe(lastText);
  await click(pick('A1'));nav('next').focus();await click(nav('next'));expect(panel().dataset.huntReview).toBe('A5');expect(nav('next').disabled).toBe(false);expect(document.activeElement).toBe(nav('next'));expect(verifyReading()).toBe(result);
  expect(announcer.textContent).toBe('Unchanged announcement');unchanged(app,before);
 });

 it.each([false,true])('direct finding choices retain their own focus and expose the committed number and first call (contrast=%s)',async contrast=>{
  const app=await mountState(state,contrast);await commitThree();const before=snapshot(app),result=verifyReading(),mutations=[];const observer=new MutationObserver(items=>mutations.push(...items));observer.observe(result,{childList:true,characterData:true,subtree:true});
  try{for(const[id,num,type]of [['A1',1,'porosity'],['A5',2,'ok'],['A2',3,'undercut']]){
   pick(id).focus();await click(pick(id));expect(document.activeElement).toBe(pick(id));expect(verifyReading()).toBe(result);expect(q('[data-hunt-review-truth]').textContent).toMatch(new RegExp('^'+num+'\\. '));expect(q('[data-hunt-review-truth]').dataset.huntReviewTruth).toBe(type);expect(q('[data-hunt-review-first-call]').dataset.huntReviewFirstCall).toBe('undercut');
  }mutations.push(...observer.takeRecords());expect(mutations.length).toBeGreaterThan(0);}finally{observer.disconnect();}unchanged(app,before);
 });

 it.each([false,true])('consumes the endpoint focus request once across lighting and live-inspection changes (contrast=%s)',async contrast=>{
  const app=await mountState(state,contrast);await commitThree();await click(pick('A5'));nav('prev').focus();await click(nav('prev'));expect(document.activeElement).toBe(pick('A1'));
  const before=snapshot(app),result=verifyReading(),text=result.textContent,mode=q('[data-hunt-review-view="lighting"]');mode.focus();await click(mode);expect(document.activeElement).toBe(mode);expect(panel().dataset.reviewMode).toBe('lighting');expect(verifyReading()).toBe(result);expect(result.textContent).toBe(text);unchanged(app,before);
  const light=q('input[aria-label="Light angle"]');light.focus();await change(light,'25');expect(document.activeElement).toBe(light);expect(verifyReading()).toBe(result);expect(result.textContent).toBe(text);expect(app.latest()).toEqual({...before.saved,dh2_light:25});
  const newMode=q('[data-hunt-review-view="surface"]');newMode.focus();await click(newMode);expect(document.activeElement).toBe(newMode);expect(result.textContent).toBe(text);
 });

 it.each([false,true])('resets local review and does not replay an old focus request after sample changes (contrast=%s)',async contrast=>{
  const app=await mountState(state,contrast);await commit('A1','porosity');await commit('A5','ok');nav('prev').focus();await click(nav('prev'));expect(document.activeElement).toBe(pick('A1'));const catalog=structuredClone(app.latest().defectCatalog);
  const reveal=byText('👁️ Reveal all');reveal.focus();await click(reveal);expect(document.activeElement).toBe(byText('🔄 Reset sample'));await click(byText('🔄 Reset sample'));expect(reading()).toBeNull();expect(panel().dataset.huntReview).toBe('empty');expect(app.latest().defectCatalog).toEqual(catalog);
  await commit('A1','porosity');expect(document.activeElement).toBe(q('#dh2-fb-h').closest('section'));
  const sample=all('[aria-label="Select sample to inspect"] button')[1];sample.focus();await click(sample);expect(reading()).toBeNull();expect(panel().dataset.huntReview).toBe('empty');expect(document.activeElement).toBe(sample);expect(app.latest().dh_sampleIdx).toBe(1);
 });

 it.each([false,true])('keeps pending and reveal-only answers outside an existing live notebook (contrast=%s)',async contrast=>{
  const app=await mountState(state,contrast);await commit('A1','porosity');const before=snapshot(app),result=verifyReading(),text=result.textContent;
  await probe('A5');expect(q('#dh2-cls-h')).toBeTruthy();expect(verifyReading()).toBe(result);expect(result.textContent).toBe(text);expect(all('[data-hunt-review-pick]')).toHaveLength(1);await click(byText('Cancel'));
  await click(byText('👁️ Reveal all'));expect(verifyReading()).toBe(result);expect(result.textContent).toBe(text);expect(all('[data-hunt-review-pick]')).toHaveLength(1);expect(app.latest().defectCatalog).toEqual(before.saved.defectCatalog);
 });

 it.each([false,true])('keeps the existing open-review action focused on the notebook region (contrast=%s)',async contrast=>{
  const app=await mountState(state,contrast);await commitThree();await click(pick('A1'));const before=snapshot(app),result=verifyReading();const open=q('[data-hunt-review-open]');open.focus();await click(open);expect(document.activeElement).toBe(panel());expect(panel().dataset.huntReview).toBe('A2');expect(verifyReading()).toBe(result);unchanged(app,before);
 });
});
