// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),M=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js'),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),V=require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const source=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar.js','utf8'),catalogSource=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar_catalog.js','utf8');
const $=id=>document.getElementById(id),card=id=>document.querySelector('[data-avatar-catalog-activity="'+id+'"]'),read=id=>document.querySelector('[data-avatar-catalog-read="'+id+'"]'),filter=id=>document.querySelector('[data-avatar-catalog-filter="'+id+'"]'),localStatus=()=>document.querySelector('.avatar-catalog [role=status]'),preview=()=>document.querySelector('.avatar-catalog-preview');
let ui,frames,nextFrame;
const session=()=>ui.getSession(),stored=()=>JSON.stringify(localStorage),committed=()=>({state:session().state,record:session().record,activity:session().activity,mode:session().mode});
function choose(id,value){$(id).value=value;$(id).dispatchEvent(new Event('change',{bubbles:true}));}
function observe(node){const observer=new MutationObserver(()=>{});observer.observe(node,{childList:true,characterData:true,subtree:true});return observer;}
function prepare(){ $('avatarInspect').click();expect(session().pending).not.toBeNull(); }
function releaseInspection(){prepare();$('avatarPlayMovement').click();expect(session().pending.phase).toBe('ready');$('avatarCommit').click();expect(session().record.intents).toHaveLength(1);}
beforeEach(()=>{
  document.body.innerHTML='<div id="testHost"></div>';localStorage.clear();window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenAvatarStation=M;window.KitchenAvatarMotion=V;frames=new Map();nextFrame=0;
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{frames.set(++nextFrame,fn);return nextFrame;});vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));Object.defineProperty(window,'matchMedia',{configurable:true,value:()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})});Object.defineProperty(document,'hidden',{configurable:true,value:false});
  window.eval(catalogSource);window.eval(source);ui=window.KitchenAvatarUI.mount({container:$('testHost'),model:M});document.querySelector('.avatar-catalog').open=true;
});
afterEach(()=>{ui?.dispose();vi.restoreAllMocks();delete window.KitchenAvatarCatalog;localStorage.clear();document.body.replaceChildren();});

describe('Integrated activity discovery stages choices with one accurate announcement',()=>{
  it('synchronizes the catalogue with the current native activity on mount',()=>{
    expect(document.querySelector('.avatar-catalog').dataset.selected).toBe($('avatarActivity').value);expect(card(session().activity).getAttribute('aria-pressed')).toBe('true');expect(localStatus().textContent).toBe('');expect(session().record.intents).toHaveLength(0);
  });
  it('announces a changed card once locally without a synthetic native change or global duplicate',()=>{
    const before=committed(),saved=stored(),globalBefore=$('avatarStatus').textContent,local=observe(localStatus()),global=observe($('avatarStatus')),nativeChange=vi.fn();$('avatarActivity').addEventListener('change',nativeChange);filter('prepare').click();local.takeRecords();const button=card('pasta-weighing');button.focus();button.click();
    expect(local.takeRecords()).toHaveLength(1);expect(global.takeRecords()).toEqual([]);expect(nativeChange).not.toHaveBeenCalled();expect($('avatarStatus').textContent).toBe(globalBefore);expect(localStatus().textContent).toContain('Weigh');expect($('avatarActivity').value).toBe('pasta-weighing');expect(document.activeElement).toBe(button);expect(committed()).toEqual(before);expect(stored()).toBe(saved);expect($('avatarModeDraft').hidden).toBe(false);local.disconnect();global.disconnect();
  });
  it('accurately announces a canceled prepared movement while preserving committed evidence and storage',()=>{
    choose('avatarMode','independent');$('avatarStart').click();releaseInspection();prepare();const before=committed(),saved=stored(),local=observe(localStatus()),global=observe($('avatarStatus'));filter('prepare').click();local.takeRecords();card('garlic-preparation').click();
    expect(session().pending).toBeNull();expect(committed()).toEqual(before);expect(stored()).toBe(saved);expect(localStatus().textContent).toMatch(/preview|movement/i);expect(localStatus().textContent).toMatch(/cancel|put.{0,15}back/i);expect(local.takeRecords()).toHaveLength(1);expect(global.takeRecords()).toEqual([]);expect(frames.size).toBe(0);local.disconnect();global.disconnect();
  });
  it.each([['avatarActivity','pasta-weighing'],['avatarMode','independent']])('keeps a single accurate global notice for native %s changes', (id,value)=>{
    prepare();const before=committed(),saved=stored(),local=observe(localStatus()),global=observe($('avatarStatus'));$(id).focus();choose(id,value);
    expect(global.takeRecords()).toHaveLength(1);expect(local.takeRecords()).toEqual([]);expect($('avatarStatus').textContent).toMatch(/preview|movement/i);expect($('avatarStatus').textContent).toMatch(/cancel|put.{0,15}back/i);expect(session().pending).toBeNull();expect(committed()).toEqual(before);expect(stored()).toBe(saved);expect(document.activeElement).toBe($(id));local.disconnect();global.disconnect();
  });
  it('reads supplied setup and returns through another category without disturbing an active rehearsal',()=>{
    prepare();const before=session(),saved=stored(),global=observe($('avatarStatus'));read('avatar-sauce-rescue').focus();read('avatar-sauce-rescue').click();expect(document.activeElement).toBe(preview());expect(preview().querySelector('.avatar-catalog-setup').open).toBe(true);filter('prepare').click();const returning=document.querySelector('[data-avatar-catalog-return]');returning.focus();returning.click();expect(document.activeElement).toBe(card('avatar-sauce-rescue'));expect(filter('sauce').getAttribute('aria-pressed')).toBe('true');expect(localStatus().textContent).toContain('6 activities shown in Sauce.');expect(session()).toEqual(before);expect(stored()).toBe(saved);expect(global.takeRecords()).toEqual([]);global.disconnect();
  });
  it('reveals the preview heading only after focusing its named region, without changing the prepared session',()=>{
    prepare();const before=session(),saved=stored(),region=preview(),heading=region.querySelector('h3'),reader=read('avatar-sauce-rescue');
    const scroll=vi.fn(function(options){expect(this).toBe(heading);expect(document.activeElement).toBe(region);expect(region.getAttribute('aria-labelledby')).toBe(heading.id);expect(region.querySelector('.avatar-catalog-setup').open).toBe(true);expect(options).toEqual({block:'start',inline:'nearest'});});
    Object.defineProperty(heading,'scrollIntoView',{configurable:true,value:scroll});reader.focus();expect(scroll).not.toHaveBeenCalled();reader.click();expect(scroll).toHaveBeenCalledTimes(1);expect(document.activeElement).toBe(region);expect(session()).toEqual(before);expect(stored()).toBe(saved);
  });
  it('only starts the chosen activity after the explicit Start action, regardless of reading its setup',()=>{
    const before=committed();filter('prepare').click();card('garlic-preparation').click();read('garlic-preparation').click();expect(committed()).toEqual(before);expect(preview().querySelector('.avatar-catalog-setup>p').textContent).toBe(M.getActivity('garlic-preparation').initialSetup);$('avatarStart').click();expect(session().activity).toBe('garlic-preparation');expect(session().record.intents).toHaveLength(0);expect(session().state.time).toBe(0);expect($('avatarModeDraft').hidden).toBe(true);expect($('avatarStatus').textContent).toMatch(/fresh.*garlic/i);
  });
  it('does not cancel a later rehearsal or repeat announcements when the already selected draft is chosen again',()=>{
    card('tomato-texture').click();prepare();const before=session(),saved=stored(),local=observe(localStatus()),global=observe($('avatarStatus'));const button=card('tomato-texture');button.focus();for(let n=0;n<5;n++)button.click();expect(session()).toEqual(before);expect(stored()).toBe(saved);expect(document.activeElement).toBe(button);expect(local.takeRecords()).toEqual([]);expect(global.takeRecords()).toEqual([]);local.disconnect();global.disconnect();
  });
});
