// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),M=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js');
const source=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar_catalog.js','utf8');
let catalog,choose;
const host=()=>document.getElementById('catalogHost'),card=id=>host().querySelector('[data-avatar-catalog-activity="'+id+'"]'),read=id=>host().querySelector('[data-avatar-catalog-read="'+id+'"]'),filter=id=>host().querySelector('[data-avatar-catalog-filter="'+id+'"]'),preview=()=>host().querySelector('.avatar-catalog-preview'),back=()=>host().querySelector('[data-avatar-catalog-return]');
const visible=node=>!!node&&!node.hidden&&!node.closest('[hidden]');
function mount(selected='avatar-sauce-rescue',extra={}){catalog=window.KitchenAvatarCatalog.mount({container:host(),catalogue:M.activities,onChoose:choose,getSelected:()=>selected,...extra});catalog.element.open=true;return catalog;}
function status(){return host().querySelector('[role=status]');}
function observe(node){const observer=new MutationObserver(()=>{});observer.observe(node,{childList:true,characterData:true,subtree:true});return observer;}
beforeEach(()=>{document.body.innerHTML='<button id="outside">Outside</button><div id="catalogHost"></div>';localStorage.clear();sessionStorage.clear();choose=vi.fn();window.eval(source);});
afterEach(()=>{catalog?.destroy();vi.restoreAllMocks();document.body.replaceChildren();});

describe('Chef activity discovery gives explicit keyboard access to the supplied setup',()=>{
  it('offers one separate native read control for the selected card without nesting buttons',()=>{
    mount();filter('all').click();
    for(const entry of M.activities){const action=card(entry.id),reading=read(entry.id),item=action.closest('.avatar-catalog-item');expect(item).not.toBeNull();expect(reading.parentElement).toBe(item);expect(action.contains(reading)).toBe(false);expect(reading.tagName).toBe('BUTTON');expect(reading.type).toBe('button');expect(reading.textContent).toContain('Read activity details');expect(reading.hasAttribute('aria-pressed')).toBe(false);expect(visible(reading)).toBe(entry.id==='avatar-sauce-rescue');expect(reading.getAttribute('aria-controls')).toBe(preview().id);}
  });
  it('keeps selection focus until Read is requested, then focuses a named region and opens its actual setup',()=>{
    mount();filter('prepare').click();const button=card('pasta-weighing');button.focus();button.click();expect(document.activeElement).toBe(button);expect(choose).toHaveBeenCalledTimes(1);
    const before=JSON.stringify(M.activities),reader=read('pasta-weighing');reader.focus();reader.click();const region=preview(),title=document.getElementById(region.getAttribute('aria-labelledby'));
    expect(document.activeElement).toBe(region);expect(region.tabIndex).toBe(-1);expect(title.textContent).toBe(M.getActivity('pasta-weighing').title);expect(region.querySelector('.avatar-catalog-setup').open).toBe(true);expect(region.querySelector('.avatar-catalog-setup>p').textContent).toBe(M.getActivity('pasta-weighing').initialSetup);expect(choose).toHaveBeenCalledTimes(1);expect(JSON.stringify(M.activities)).toBe(before);expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);
  });
  it('returns directly to the selected early card while preserving the All filter',()=>{
    mount('cook-save-and-drain-pasta');filter('all').click();read('cook-save-and-drain-pasta').click();back().focus();back().click();expect(document.activeElement).toBe(card('cook-save-and-drain-pasta'));expect(filter('all').getAttribute('aria-pressed')).toBe('true');expect([...host().querySelectorAll('[data-avatar-catalog-activity]')].filter(visible)).toHaveLength(21);expect(choose).not.toHaveBeenCalled();
  });
  it('reveals a selected card hidden by another category before returning focus',()=>{
    mount('hold-and-recheck-sauce');filter('prepare').click();expect(visible(card('hold-and-recheck-sauce'))).toBe(false);expect(status().textContent).toContain('5 activities shown in Prepare.');back().focus();back().click();expect(filter('sauce').getAttribute('aria-pressed')).toBe('true');expect(visible(card('hold-and-recheck-sauce'))).toBe(true);expect(document.activeElement).toBe(card('hold-and-recheck-sauce'));expect(catalog.getSelected()).toBe('hold-and-recheck-sauce');expect(status().textContent).toContain('6 activities shown in Sauce.');expect(status().textContent).toContain('selected activity is visible');expect(status().textContent).not.toContain('Prepare');expect(choose).not.toHaveBeenCalled();
  });
  it('repairs focus when parent synchronization hides the old selected read control',()=>{
    mount();read('avatar-sauce-rescue').focus();catalog.setSelected('pasta-weighing');expect(visible(read('avatar-sauce-rescue'))).toBe(false);expect(document.activeElement).toBe(card('pasta-weighing'));expect(visible(document.activeElement)).toBe(true);expect(choose).not.toHaveBeenCalled();
  });
  it('preserves an open focused preview across repeated unchanged owner renders',()=>{
    mount();read('avatar-sauce-rescue').click();const region=preview(),setup=region.querySelector('.avatar-catalog-setup'),observer=observe(status());
    for(let n=0;n<20;n++)catalog.setSelected('avatar-sauce-rescue');expect(document.activeElement).toBe(region);expect(setup.open).toBe(true);expect(preview()).toBe(region);expect(observer.takeRecords()).toEqual([]);observer.disconnect();
  });
  it('combines a plain-text owner cancellation notice into one local update and keeps repeated selection quiet',()=>{
    const notice='Prepared preview canceled. <b>No action was recorded.</b>';choose.mockReturnValue(notice);mount();const observer=observe(status()),target=card('tomato-texture');target.focus();target.click();expect(observer.takeRecords()).toHaveLength(1);expect(status().textContent).toContain(notice);expect(status().querySelector('b')).toBeNull();expect(document.activeElement).toBe(target);expect(choose).toHaveBeenCalledTimes(1);
    for(let n=0;n<5;n++)target.click();expect(observer.takeRecords()).toEqual([]);expect(choose).toHaveBeenCalledTimes(1);expect(status().textContent).toContain(notice);observer.disconnect();
  });
  it('keeps selection feedback useful when the owner returns no additional notice',()=>{
    mount();card('tomato-texture').click();expect(status().textContent).toContain('Tomato texture');expect(status().textContent).toContain('Start a fresh attempt');expect(status().textContent).not.toMatch(/undefined|null|\[object Object\]/);
  });
  it('handles entries without starting setup and empty catalogues without dead reading targets',()=>{
    mount('future',{catalogue:[{id:'future',title:'Future activity',description:'A plain description.'}]});read('future').click();expect(document.activeElement).toBe(preview());expect(preview().textContent).toContain('A plain description.');expect(preview().querySelector('.avatar-catalog-setup').hidden).toBe(true);catalog.destroy();mount(null,{catalogue:[]});expect(preview().hidden).toBe(true);expect([...host().querySelectorAll('[data-avatar-catalog-read],[data-avatar-catalog-return]')].filter(visible)).toEqual([]);expect(choose).not.toHaveBeenCalled();
  });
  it('disconnects retained read and return buttons on destroy',()=>{
    mount();const oldRead=read('avatar-sauce-rescue'),oldBack=back(),outside=document.getElementById('outside');catalog.destroy();outside.focus();oldRead.click();oldBack.click();expect(document.activeElement).toBe(outside);expect(choose).not.toHaveBeenCalled();expect(host().children).toHaveLength(0);
  });
});
