import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require=createRequire(import.meta.url),{createRoot}=require(resolve(process.cwd(),'desktop/web-app/node_modules/react-dom/client'));
const act=React.act,image='data:image/png;base64,AA==';let Studio,root,host;
beforeAll(()=>{Studio=setupSymbolStudio().SymbolStudio;globalThis.IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;host?.remove();host=null;localStorage.clear();vi.restoreAllMocks();});
const put=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const bank=()=>JSON.parse(localStorage.getItem('alloSymbolGallery__a'));
const assets=()=>[{id:'apple',conceptId:'fruit',label:'Apple',image,category:'noun',locked:true,reviewStatus:'approved',topicTags:['food']},{id:'water',label:'水',image,category:'noun',topicTags:['daily living']}];
function control(name){const el=[...host.querySelectorAll('[aria-label]')].find(el=>el.getAttribute('aria-label')===name);expect(el,name).toBeTruthy();return el;}
async function click(name){await act(async()=>control(name).click());}
async function tab(name){const el=[...host.querySelectorAll('[role=tab]')].find(el=>el.textContent.includes(name));expect(el).toBeTruthy();await act(async()=>el.click());}
async function change(name,value){const el=control(name),proto=el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;await act(async()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
async function decide(text){const el=[...document.querySelectorAll('[role=alertdialog] button')].find(el=>el.textContent===text);expect(el,text).toBeTruthy();await act(async()=>el.click());}
async function mount(extra={}){
  put('alloStudentProfiles',[{id:'a',name:'Learner A'},{id:'b',name:'Learner B'}]);put('alloActiveProfileId','a');put('alloSymbolGallery__a',assets());put('alloSymbolGallery__b',[{id:'apple',label:'Other learner',image}]);
  put('alloActivitySets__a',[{id:'pack',title:'Pack',assetIds:['apple','water'],boardIds:[],scheduleIds:[]}]);
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
  await act(async()=>root.render(React.createElement(Studio,baseProps({initialTab:'symbols',draftStorage:{read:async()=>null,write:async()=>{},remove:async()=>{}},...extra}))));
}
function failBankWrites(){const original=Storage.prototype.setItem;return vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(key,value){if(key==='alloSymbolGallery__a')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value);});}
async function select(...labels){if(!host.querySelector('[aria-label="Finish organizing symbols"]'))await click('Organize symbols');for(const label of labels)await click('Include '+label+' in batch');}

describe('Symbol Bank durable saves and reversible removal',()=>{
  it('retains a failed favorite change visibly and retries the latest bank state',async()=>{
    const addToast=vi.fn();await mount({addToast});const failure=failBankWrites();
    await click('Add Apple to favorites');expect(bank()[0].isFavorite).not.toBe(true);
    expect(control('Remove Apple from favorites')).toBeTruthy();expect(host.textContent).toContain('Changes are only available in this session');
    await click('Add 水 to favorites');failure.mockRestore();await click('Retry saving Symbol Bank');
    expect(bank().every(a=>a.isFavorite)).toBe(true);expect(host.querySelector('[aria-label="Retry saving Symbol Bank"]')).toBeNull();
    expect(addToast).toHaveBeenCalledWith('Symbol Bank saved on this device.','success');
  });
  it('leaves the visible and persisted bank intact when Clear All cannot save',async()=>{
    const addToast=vi.fn();await mount({addToast});const before=bank();failBankWrites();
    await click('Clear all symbols from Symbol Bank');await decide('Clear all symbols');
    expect(bank()).toEqual(before);expect(control('Select symbol: Apple (locked)')).toBeTruthy();expect(host.querySelector('[aria-label="Undo last symbol removal"]')).toBeNull();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Symbol Bank is unchanged'),'error');
  });
  it('undoes a clear without losing symbols created afterward or pack membership',async()=>{
    await mount({onCallImagen:async()=>image});const original=bank(),pack=localStorage.getItem('alloActivitySets__a');
    await click('Clear all symbols from Symbol Bank');await decide('Clear all symbols');expect(bank()).toEqual([]);
    await change('Symbol label','New symbol');await click('Generate symbol');expect(bank()).toHaveLength(1);
    await click('Undo last symbol removal');expect(bank().slice(0,2)).toEqual(original);expect(bank().at(-1).label).toBe('New symbol');expect(localStorage.getItem('alloActivitySets__a')).toBe(pack);
  });
  it('undoes a single deletion with its original ID, image, metadata and pack references',async()=>{
    await mount();const original=bank()[0],pack=localStorage.getItem('alloActivitySets__a');
    await click('Select symbol: Apple (locked)');await click('Delete Apple symbol');expect(bank().map(a=>a.id)).toEqual(['water']);
    expect(localStorage.getItem('alloActivitySets__a')).toBe(pack);await click('Undo last symbol removal');expect(bank()[0]).toEqual(original);
  });
  it('retains an unsaved undo for this session and can persist it through Retry',async()=>{
    await mount();await click('Clear all symbols from Symbol Bank');await decide('Clear all symbols');const failure=failBankWrites();
    await click('Undo last symbol removal');expect(bank()).toEqual([]);expect(control('Select symbol: Apple (locked)')).toBeTruthy();
    failure.mockRestore();await click('Retry saving Symbol Bank');expect(bank()).toHaveLength(2);
  });
  it('does not clear a different learner after a confirmation was opened',async()=>{
    await mount();await click('Clear all symbols from Symbol Bank');await click('Profile: Learner B');await decide('Clear all symbols');
    expect(bank()).toHaveLength(2);expect(JSON.parse(localStorage.getItem('alloSymbolGallery__b'))).toHaveLength(1);
    expect(host.querySelector('[aria-label="Undo last symbol removal"]')).toBeNull();
  });
  it('does not clear a bank that changed while confirmation was pending',async()=>{
    const addToast=vi.fn();await mount({addToast});await click('Clear all symbols from Symbol Bank');await click('Add Apple to favorites');await decide('Clear all symbols');
    expect(bank()).toHaveLength(2);expect(bank()[0].isFavorite).toBe(true);expect(addToast).toHaveBeenCalledWith('The Symbol Bank changed. Review it before clearing.','info');
  });
  it('expires removal undo on learner switches',async()=>{
    await mount();await click('Select symbol: Apple (locked)');await click('Delete Apple symbol');await click('Profile: Learner B');await click('Profile: Learner A');
    expect(host.querySelector('[aria-label="Undo last symbol removal"]')).toBeNull();expect(bank()).toHaveLength(1);
  });
});

describe('Create board from Symbol Bank selection',()=>{
  it('includes hidden selections in selection order and preserves images, references and locks on save',async()=>{
    await mount();await select('水','Apple');await change('Filter Symbol Bank by topic','food');
    expect(host.textContent).toContain('2 selected (1 hidden by filters)');await click('Create board from selected symbols');
    expect(control('Board title').value).toBe('Selected symbols');await click('Save');
    const saved=JSON.parse(localStorage.getItem('alloSymbolBoards__a'));expect(saved).toHaveLength(1);
    expect(saved[0].words.map(w=>w.label)).toEqual(['水','Apple']);expect(saved[0].words[1]).toMatchObject({image,assetId:'apple',conceptId:'fruit',locked:true,category:'noun'});
    expect(new Set(saved[0].words.map(w=>w.id)).size).toBe(2);expect(localStorage.getItem('alloSymbolBoards__b')).toBeNull();
  });
  it('keeps an existing draft on Cancel and creates a new saved board on confirmation',async()=>{
    await mount();await select('Apple');await click('Create board from selected symbols');await change('Board title','Original board');await click('Save');
    const original=JSON.parse(localStorage.getItem('alloSymbolBoards__a'))[0];
    await tab('Symbol Bank');await click('Clear symbol selection');await click('Include 水 in batch');await click('Create board from selected symbols');await decide('Keep current draft');
    await tab('Board Builder');expect(control('Board title').value).toBe('Original board');
    await tab('Symbol Bank');await click('Create board from selected symbols');await decide('Create selected board');await click('Save');
    const saved=JSON.parse(localStorage.getItem('alloSymbolBoards__a'));expect(saved).toHaveLength(2);expect(saved.find(b=>b.id===original.id)).toEqual(original);expect(saved.find(b=>b.id!==original.id).words.map(w=>w.label)).toEqual(['水']);
  });
  it('discards a pending board replacement after switching learners',async()=>{
    await mount();await select('Apple');await click('Create board from selected symbols');await tab('Symbol Bank');await click('Create board from selected symbols');await click('Profile: Learner B');await decide('Create selected board');
    await tab('Board Builder');expect(host.querySelector('[aria-label="Board title"]')).toBeNull();expect(localStorage.getItem('alloSymbolBoards__b')).toBeNull();
  });
  it('disables empty selections and resets selection when changing learners',async()=>{
    await mount();await click('Organize symbols');expect(control('Create board from selected symbols').disabled).toBe(true);await click('Include Apple in batch');await click('Profile: Learner B');await click('Organize symbols');expect(control('Create board from selected symbols').disabled).toBe(true);
  });
});
