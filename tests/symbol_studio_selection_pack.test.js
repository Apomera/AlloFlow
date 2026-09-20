import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require=createRequire(import.meta.url),{createRoot}=require(resolve(process.cwd(),'desktop/web-app/node_modules/react-dom/client'));
const act=React.act,image='data:image/png;base64,AA==';let Studio,root,host;
beforeAll(()=>{Studio=setupSymbolStudio().SymbolStudio;globalThis.IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;host?.remove();host=null;localStorage.clear();vi.restoreAllMocks();});
const put=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const packs=()=>JSON.parse(localStorage.getItem('alloActivitySets__a'));
function control(name){const el=[...host.querySelectorAll('[aria-label]')].find(el=>el.getAttribute('aria-label')===name);expect(el,name).toBeTruthy();return el;}
async function click(name){await act(async()=>control(name).click());}
async function change(name,value){const el=control(name),proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;await act(async()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
async function mount(){
  put('alloStudentProfiles',[{id:'a',name:'Learner A'},{id:'b',name:'Learner B'}]);put('alloActiveProfileId','a');
  put('alloSymbolGallery__a',[{id:'apple',label:'Apple',image,category:'noun',reviewStatus:'approved',topicTags:['food'],locked:true},{id:'water',label:'水',image,category:'noun',topicTags:['daily living']}]);
  put('alloSymbolGallery__b',[{id:'apple',label:'Other learner apple',image}]);
  put('alloActivitySets__a',[{id:'pack',title:'Existing supports',profileId:'a',description:'Keep me',boardIds:['board'],scheduleIds:['sequence'],assetIds:['water','missing'],updatedAt:123},{id:'foreign',title:'Foreign assigned pack',profileId:'b',assetIds:[]}]);
  put('alloActivitySets__b',[{id:'pack',title:'B supports',profileId:'b',assetIds:[]}]);
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
  await act(async()=>root.render(React.createElement(Studio,baseProps({initialTab:'symbols',draftStorage:{read:async()=>null,write:async()=>{},remove:async()=>{}}}))));
}
async function select(){await click('Organize symbols');await click('Include 水 in batch');await click('Include Apple in batch');await click('Add selected symbols to a Visual Pack');}
function failWrites(key){const original=Storage.prototype.setItem;return vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(k,value){if(k===key)throw new DOMException('Full','QuotaExceededError');return original.call(this,k,value);});}

describe('Symbol Bank selection to Visual Pack',()=>{
  it('previews duplicates and hidden selections, appends new assets and preserves all existing content',async()=>{
    await mount();const before=packs()[0],gallery=localStorage.getItem('alloSymbolGallery__a');await select();await change('Filter Symbol Bank by topic','food');await change('Destination Visual Pack','pack:pack');
    expect(host.textContent).toContain('2 selected (1 hidden by filters)');expect(host.textContent).toContain('1 to add · 1 already included');
    await click('Save selected symbols to Visual Pack');expect(packs()[0]).toMatchObject({...before,assetIds:['water','missing','apple'],updatedAt:expect.any(Number)});expect(localStorage.getItem('alloSymbolGallery__a')).toBe(gallery);
    expect(host.textContent).toContain('Added to "Existing supports": 1 symbol. 1 already included.');
    expect(control('Include Apple in batch').checked).toBe(true);await click('Open updated Visual Pack');expect(host.querySelector('#ss-pack-heading').textContent).toBe('Existing supports');
  });
  it('creates one named pack in selection order even when submitted twice before rerender',async()=>{
    await mount();await select();await change('Destination Visual Pack','new');expect(control('Save selected symbols to Visual Pack').disabled).toBe(true);
    await change('Name for selected-symbol Visual Pack','  School words  ');const save=control('Save selected symbols to Visual Pack');await act(async()=>{save.click();save.click();});
    expect(packs()).toHaveLength(3);expect(packs()[0]).toMatchObject({title:'School words',profileId:'a',assetIds:['water','apple'],boardIds:[],scheduleIds:[]});expect(packs()[0].id).not.toBe('pack');
    expect(host.textContent).toContain('Created "School words" with 2 symbols.');
  });
  it('leaves a pack unchanged when every selected symbol is already included',async()=>{
    await mount();await select();await change('Destination Visual Pack','pack:pack');await click('Save selected symbols to Visual Pack');const before=packs();
    await change('Destination Visual Pack','pack:pack');const store=vi.spyOn(Storage.prototype,'setItem');await click('Save selected symbols to Visual Pack');
    expect(packs()).toEqual(before);expect(store.mock.calls.filter(([key])=>key==='alloActivitySets__a')).toEqual([]);expect(host.textContent).toContain('0 symbols. 2 already included.');
  });
  it('preserves selection and pack contents on save failure and supports retry',async()=>{
    await mount();await select();await change('Destination Visual Pack','pack:pack');const before=packs(),failure=failWrites('alloActivitySets__a');
    await click('Save selected symbols to Visual Pack');expect(packs()).toEqual(before);expect(host.textContent).toContain('Could not save this Visual Pack.');expect(control('Destination Visual Pack').value).toBe('pack:pack');expect(control('Include Apple in batch').checked).toBe(true);expect(host.querySelector('[aria-label="Open updated Visual Pack"]')).toBeNull();
    failure.mockRestore();await click('Save selected symbols to Visual Pack');expect(packs()[0].assetIds).toEqual(['water','missing','apple']);
  });
  it('retains a new pack name after a failed save without creating an empty pack',async()=>{
    await mount();await select();await change('Destination Visual Pack','new');await change('Name for selected-symbol Visual Pack','My pack');const before=packs(),failure=failWrites('alloActivitySets__a');
    await click('Save selected symbols to Visual Pack');expect(packs()).toEqual(before);expect(control('Name for selected-symbol Visual Pack').value).toBe('My pack');
    failure.mockRestore();await click('Save selected symbols to Visual Pack');expect(packs()[0]).toMatchObject({title:'My pack',assetIds:['water','apple']});
  });
  it('blocks pack creation while bank changes are unsaved, then allows it after Retry save',async()=>{
    await mount();await select();await change('Destination Visual Pack','new');await change('Name for selected-symbol Visual Pack','Saved symbols');const failure=failWrites('alloSymbolGallery__a');await click('Add Apple to favorites');
    expect(control('Save selected symbols to Visual Pack').disabled).toBe(true);expect(host.textContent).toContain('Save your Symbol Bank changes first');
    failure.mockRestore();await click('Retry saving Symbol Bank');expect(control('Save selected symbols to Visual Pack').disabled).toBe(false);await click('Save selected symbols to Visual Pack');expect(packs()[0].title).toBe('Saved symbols');
  });
  it('hides foreign-assigned destinations and resets choices across learner switches',async()=>{
    await mount();await select();expect([...control('Destination Visual Pack').options].map(o=>o.text)).not.toContain('Foreign assigned pack');
    await change('Destination Visual Pack','new');await change('Name for selected-symbol Visual Pack','Private A name');await click('Profile: Learner B');await click('Organize symbols');await click('Include Other learner apple in batch');await click('Add selected symbols to a Visual Pack');
    expect(control('Destination Visual Pack').value).toBe('');expect(host.textContent).not.toContain('Private A name');expect([...control('Destination Visual Pack').options].map(o=>o.text)).toContain('B supports');
    await change('Destination Visual Pack','pack:pack');await click('Save selected symbols to Visual Pack');expect(JSON.parse(localStorage.getItem('alloActivitySets__b'))[0].assetIds).toEqual(['apple']);expect(packs()[0].assetIds).toEqual(['water','missing']);
  });
  it('closes pack options without writing or clearing the symbol selection',async()=>{
    await mount();await select();await change('Destination Visual Pack','new');await change('Name for selected-symbol Visual Pack','Uncommitted');const before=packs();await click('Close selected-symbol pack options');
    expect(packs()).toEqual(before);expect(control('Include Apple in batch').checked).toBe(true);expect(host.querySelector('#ss-selection-pack')).toBeNull();
  });
  it('disables transfer for empty selections and disables submission after clearing them',async()=>{
    await mount();await click('Organize symbols');expect(control('Add selected symbols to a Visual Pack').disabled).toBe(true);await click('Include Apple in batch');await click('Add selected symbols to a Visual Pack');await change('Destination Visual Pack','pack:pack');await click('Clear symbol selection');expect(control('Save selected symbols to Visual Pack').disabled).toBe(true);
  });
});
