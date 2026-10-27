// @vitest-environment jsdom
import {afterEach,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),H=require('../stem_lab/kitchen_studio/recipe_lab_target_hint.js');
afterEach(()=>document.body.replaceChildren());
function mounted(){const scene=document.createElement('div');document.body.append(scene);return H.mount({container:scene});}
function docked(){
 const scene=document.createElement('div'),canvas=document.createElement('canvas'),below=document.createElement('div'),status=document.createElement('p'),outside=document.createElement('button');status.setAttribute('role','status');status.textContent='Existing cooking feedback';outside.textContent='Another activity';scene.append(canvas);below.append(status);document.body.append(scene,below,outside);const h=H.mount({container:scene,below});return {h,scene,canvas,below,status,outside};
}
const ready={name:'Garlic clove',detail:'Pull down, then lift to complete a pass.',ready:true};
describe('Readable, dismissible 3D object hints',()=>{
 it('starts hidden without a focus stop or duplicate live announcement',()=>{const h=mounted();expect(h.element.hidden).toBe(true);expect(h.element.getAttribute('aria-hidden')).toBe('true');expect(h.element.querySelector('[tabindex],[role=status],[aria-live]')).toBeNull();expect(h.element.tabIndex).toBe(-1);});
 it('keeps the hint while the pointer crosses empty canvas toward the card',()=>{const h=mounted();h.show('clove:0',ready);expect(h.show(null,null)).toBe(true);expect(h.element.hidden).toBe(false);expect(h.element.textContent).toContain(ready.detail);});
 it('dismisses without immediately reappearing on the same object',()=>{const h=mounted();h.show('clove:0',ready);expect(h.dismiss()).toBe(true);for(let n=0;n<3;n++)expect(h.show('clove:0',ready)).toBe(false);expect(h.element.hidden).toBe(true);expect(h.dismiss()).toBe(false);});
 it('uses object identity rather than shared text to rearm a dismissed hint',()=>{const h=mounted();h.show('clove:0',ready);h.dismiss();expect(h.show('clove:1',ready)).toBe(true);expect(h.element.hidden).toBe(false);});
 it('can rediscover the same object after leaving its hit area',()=>{const h=mounted();h.show('clove:0',ready);h.dismiss();h.show(null,null);expect(h.element.hidden).toBe(true);expect(h.show('clove:0',ready)).toBe(true);});
 it('can rediscover an object when its retained hint was dismissed over empty canvas',()=>{const h=mounted();h.show('clove:0',ready);h.show(null,null);expect(h.dismiss()).toBe(true);expect(h.show('clove:0',ready)).toBe(true);});
 it('clears stale guidance and suppression when the scene or cooking context changes',()=>{const h=mounted();h.show('clove:0',ready);h.dismiss();h.clear();expect(h.element.hidden).toBe(true);expect(h.show('clove:0',ready)).toBe(true);h.clear();h.show(null,null);expect(h.element.hidden).toBe(true);});
 it('updates prerequisite text without rewriting identical content',async()=>{const h=mounted();h.show('clove:0',ready);const mutations=[],observer=new MutationObserver(list=>mutations.push(...list));observer.observe(h.element,{subtree:true,childList:true});h.show('clove:0',ready);await Promise.resolve();expect(mutations).toHaveLength(0);h.show('clove:0',{...ready,ready:false,detail:'Wash hands first.'});expect(h.element.dataset.ready).toBe('false');expect(h.element.textContent).toContain('Wash hands first.');observer.disconnect();});
 it('inserts object descriptions as text and gives visible dismissal guidance',()=>{const h=mounted();h.show('object',{...ready,name:'<img src=x>',detail:'<b>description</b>'});expect(h.element.querySelector('img,b')).toBeNull();expect(h.element.textContent).toContain('<b>description</b>');expect(h.element.textContent).toContain('Esc to dismiss');});
 it('does not revive a disposed hint',()=>{const h=mounted();h.show('clove:0',ready);h.dispose();expect(h.element.isConnected).toBe(false);expect(h.show('clove:0',ready)).toBe(false);expect(h.dismiss()).toBe(false);h.clear();h.dispose();});
});

describe('Object hints dock outside the picking surface',()=>{
 it('keeps one hint before existing feedback while preserving the original canvas and scene nodes',()=>{
  const {h,scene,canvas,below,status}=docked(),hint=h.element,sceneParent=scene.parentNode;expect(hint.dataset.layout).toBe('below');expect(below.firstElementChild).toBe(hint);expect(scene.contains(hint)).toBe(false);expect(document.querySelectorAll('#sceneTargetHint')).toHaveLength(1);
  h.show('clove:0',ready);h.show(null,null);h.clear();h.show('clove:1',{...ready,name:'Another clove'});expect(h.element).toBe(hint);expect(below.firstElementChild).toBe(hint);expect(below.lastElementChild).toBe(status);expect(status.textContent).toBe('Existing cooking feedback');expect(scene.firstElementChild).toBe(canvas);expect(scene.parentNode).toBe(sceneParent);
 });
 it('treats scene, feedback padding and hint descendants as one region while a hint is visible',()=>{
  const {h,scene,canvas,below,status,outside}=docked();expect(h.contains(scene)).toBe(true);expect(h.contains(canvas)).toBe(true);expect(h.contains(below)).toBe(false);expect(h.contains(status)).toBe(false);h.show('clove:0',ready);
  for(const relatedTarget of [canvas,below,status,h.element,h.element.querySelector('strong'),scene])expect(h.contains(relatedTarget)).toBe(true);
  for(const relatedTarget of [outside,document.body,null,undefined,window,document.createElement('span')])expect(h.contains(relatedTarget)).toBe(false);
  expect(h.element.hidden).toBe(false);expect(h.element.textContent).toContain(ready.detail);
 });
 it('keeps the dock reachable after crossing empty canvas without adding focus stops or live content',()=>{
  const {h,below,outside,status}=docked();outside.focus();const observer=new MutationObserver(()=>{});observer.observe(status,{childList:true,characterData:true,subtree:true});h.show('clove:0',ready);expect(h.show(null,null)).toBe(true);expect(h.contains(below)).toBe(true);expect(h.contains(h.element.querySelector('span'))).toBe(true);expect(document.activeElement).toBe(outside);expect(observer.takeRecords()).toHaveLength(0);observer.disconnect();
  expect(h.element.getAttribute('aria-hidden')).toBe('true');expect(h.element.hasAttribute('role')).toBe(false);expect(h.element.hasAttribute('aria-live')).toBe(false);expect(h.element.querySelector('button,a,input,select,textarea,[tabindex],[aria-live],[role="status"]')).toBeNull();expect(h.element.tabIndex).toBe(-1);
 });
 it('stops treating feedback as part of the hover region after dismissal or clearing',()=>{
  const {h,scene,below,status}=docked();h.show('clove:0',ready);h.dismiss();expect(h.contains(scene)).toBe(true);expect(h.contains(below)).toBe(false);expect(h.contains(status)).toBe(false);expect(h.show('clove:0',ready)).toBe(false);expect(h.contains(below)).toBe(false);
  h.show('clove:1',ready);expect(h.contains(below)).toBe(true);h.clear();expect(h.contains(below)).toBe(false);h.show('clove:1',ready);expect(h.contains(below)).toBe(true);
 });
 it('rejects a detached former hint descendant as a pointer destination',()=>{
  const {h}=docked();h.show('clove:0',ready);const text=h.element.querySelector('strong');expect(h.contains(text)).toBe(true);text.remove();expect(text.isConnected).toBe(false);expect(h.contains(text)).toBe(false);
 });
 it('disposes both region membership and the hint without removing feedback, the canvas or external focus',()=>{
  const {h,scene,canvas,below,status,outside}=docked();h.show('clove:0',ready);outside.focus();const hint=h.element;h.dispose();for(const target of [scene,canvas,below,status,hint])expect(h.contains(target)).toBe(false);expect(hint.isConnected).toBe(false);expect(status.isConnected).toBe(true);expect(scene.firstElementChild).toBe(canvas);expect(document.activeElement).toBe(outside);expect(h.show('clove:0',ready)).toBe(false);h.dispose();
 });
 it('retains the legacy scene-only overlay when no reading area is supplied',()=>{
  const h=mounted(),scene=h.element.parentNode;expect(h.element.dataset.layout).toBe('overlay');h.show('clove:0',ready);expect(scene.contains(h.element)).toBe(true);expect(h.contains(h.element)).toBe(true);expect(h.contains(document.body)).toBe(false);h.clear();expect(h.contains(scene)).toBe(true);
 });
 it('rejects cross-document, nested or non-element reading areas',()=>{
  const scene=document.createElement('div'),inside=document.createElement('div');scene.append(inside);document.body.append(scene);const other=document.implementation.createHTMLDocument('Other kitchen');
  for(const below of [scene,inside,document.body,other.body,{},document.createTextNode('Not a reading area')])expect(()=>H.mount({container:scene,below})).toThrow(TypeError);
  expect(document.querySelector('#sceneTargetHint')).toBeNull();expect(scene.firstElementChild).toBe(inside);
 });
});
