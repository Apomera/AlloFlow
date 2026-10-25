import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted=[];
let X;
beforeEach(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','coralReef');X=window.__RR_TEST_EXPORTS__.coralReef;});
afterEach(async()=>{while(mounted.length){const t=mounted.pop();await React.act(async()=>t.root.unmount());t.host.remove();}});
async function click(el){expect(el,'control exists').toBeTruthy();await React.act(async()=>{el.focus();el.click();await Promise.resolve();});}
async function select(el,value){await React.act(async()=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));});}
async function write(el,value){await React.act(async()=>{Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
const ids=t=>[...t.host.querySelectorAll('[data-species]')].map(e=>e.dataset.species);
const collection=t=>t.host.querySelector('[data-guide-collection="notes"]');
const search=t=>t.host.querySelector('input[type="search"]');
async function mount(seed={}){
  let data={coralReef:{section:'guide',speciesBookmarks:{blue_tang:true},speciesLog:{green_turtle:{firstSeen:1}},speciesFieldNotes:{blue_tang:'Private observation 31.',green_turtle:'  Private turtle note.  ',cleaner_shrimp:'Cleaned the fish.',reef_star:'A structure note.'},...seed}};
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host),cfg=window.StemLab._registry.coralReef;
  function Shell(){const[state,setState]=React.useState(data);data=state;return cfg.render({React,toolData:state,setToolData:setState,t:(key,fallback)=>fallback||key});}
  const t={host,root,get data(){return data.coralReef;}};mounted.push(t);await React.act(async()=>root.render(React.createElement(Shell)));return t;
}
describe('field-note collection retrieval',()=>{
  it('includes only known nonblank own strings and signals note presence without exposing prose',async()=>{
    const getter=vi.fn(()=>{throw Error('must not read accessor');});
    const notes=Object.create({green_turtle:'Inherited note'});Object.defineProperties(notes,{clownfish:{value:'  Original whitespace retained.  ',enumerable:true},blue_tang:{get:getter,enumerable:true},cleaner_shrimp:{value:' \n\t ',enumerable:true},reef_star:{value:'Structure observation',enumerable:true},anthias:{value:17,enumerable:true},made_up:{value:'Ignore unknown',enumerable:true}});
    const t=await mount({speciesFieldNotes:notes});
    expect([...t.host.querySelectorAll('[data-guide-note-indicator]')].map(e=>e.dataset.guideNoteIndicator)).toEqual(['clownfish','reef_star']);
    await click(collection(t));expect(ids(t)).toEqual(['clownfish','reef_star']);expect(collection(t).getAttribute('aria-pressed')).toBe('true');
    expect(t.host.querySelector('[data-guide-result-count]').textContent).toBe('Showing 2 of 2.');
    expect(t.host.textContent).not.toContain('Original whitespace retained');expect(t.host.textContent).not.toContain('Structure observation');
    expect(t.data.speciesFieldNotes).toBe(notes);expect(notes.clownfish).toBe('  Original whitespace retained.  ');expect(getter).not.toHaveBeenCalled();
    expect(t.data.speciesBookmarks).toEqual({blue_tang:true});expect(t.data.speciesLog).toEqual({green_turtle:{firstSeen:1}});expect(t.data.speciesPractice).toBeUndefined();
  });
  it('intersects notes with group, role and sourced search without searching personal prose',async()=>{
    const t=await mount();await click(collection(t));expect(ids(t)).toHaveLength(4);
    await select(t.host.querySelector('[data-guide-group-filter]'),'fish');expect(ids(t)).toEqual(['blue_tang']);
    await select(t.host.querySelector('[data-guide-role]'),'plankton');await select(t.host.querySelector('[data-guide-search-mode]'),'description');await write(search(t),'yellow tail');expect(ids(t)).toEqual(['blue_tang']);
    await write(search(t),'Private observation');expect(ids(t)).toEqual([]);
    await write(search(t),'blue');await select(t.host.querySelector('[data-guide-role]'),'cleaners');expect(t.host.querySelector('[data-guide-role-empty]')).toBeTruthy();
    await click(t.host.querySelector('[data-guide-clear-role]'));expect(ids(t)).toEqual(['blue_tang']);expect(search(t).value).toBe('blue');expect(t.data.guideFilter).toBe('notes');
    await click(t.host.querySelector('[data-guide-reset]'));expect(ids(t)).toHaveLength(X.SPECIES_META.length);expect(search(t).value).toBe('');expect(t.data.guideFilter).toBe('all');
  });
  it('keeps the captured note-reading route after a note is cleared, then refreshes the returned collection',async()=>{
    const t=await mount({speciesFieldNotes:{blue_tang:'First note',green_turtle:'Second note'}});await click(collection(t));await click(t.host.querySelector('[data-open-profile="blue_tang"]'));
    expect(t.host.querySelector('[data-profile-selection-position]').textContent).toBe('Entry 1 of 2 in this selection');
    await write(t.host.querySelector('[data-species-field-notes="blue_tang"]'),'');
    await click(t.host.querySelector('[data-profile-next]'));expect(t.host.querySelector('[data-marine-profile]').dataset.marineProfile).toBe('green_turtle');
    await click(t.host.querySelector('[data-profile-next]'));expect(t.host.querySelector('[data-marine-profile]').dataset.marineProfile).toBe('blue_tang');
    expect(t.host.querySelector('[data-species-field-notes="blue_tang"]').value).toBe('');
    await click(t.host.querySelector('[data-close-profile]'));expect(ids(t)).toEqual(['green_turtle']);expect(document.activeElement).toBe(search(t));expect(t.data.guideFilter).toBe('notes');
    await click(t.host.querySelector('[data-open-profile="green_turtle"]'));expect(t.host.querySelector('[data-profile-selection-position]').textContent).toBe('Entry 1 of 1 in this selection');
    await write(t.host.querySelector('[data-species-field-notes="green_turtle"]'),'  \n ');await click(t.host.querySelector('[data-close-profile]'));
    expect(ids(t)).toEqual([]);expect(t.data.speciesFieldNotes.green_turtle).toBe('  \n ');expect(t.host.querySelector('[data-guide-collection-empty="notes"]').textContent).toContain('No field notes yet.');expect(document.activeElement).toBe(search(t));
  });
  it('explains an empty collection and opens the full guide without changing observations or discoveries',async()=>{
    const t=await mount({guideFilter:'notes',guideGroupFilter:'fish',speciesFieldNotes:{clownfish:'  \n '}});
    const empty=t.host.querySelector('[data-guide-collection-empty="notes"]');expect(empty.textContent).toContain('write in Your field notes');expect(empty.textContent).not.toContain('discoveries start with a dive');
    await click(empty.querySelector('button'));expect(ids(t)).toHaveLength(X.SPECIES_META.length);expect(t.data).toMatchObject({guideFilter:'all',guideGroupFilter:'all',speciesFieldNotes:{clownfish:'  \n '},speciesLog:{green_turtle:{firstSeen:1}}});expect(document.activeElement).toBe(search(t));
    await click(t.host.querySelector('[data-open-profile="clownfish"]'));await write(t.host.querySelector('[data-species-field-notes="clownfish"]'),'New firsthand note');await click(t.host.querySelector('[data-close-profile]'));
    await click(collection(t));expect(ids(t)).toEqual(['clownfish']);expect(t.host.querySelector('[data-guide-note-indicator="clownfish"]')).toBeTruthy();
    const reopened=await mount(t.data);expect(ids(reopened)).toEqual(['clownfish']);expect(collection(reopened).getAttribute('aria-pressed')).toBe('true');
  });
  it('keeps the note collection separate from unanswered practice and preserves it on return',async()=>{
    const t=await mount();await click(collection(t));await click(t.host.querySelector('[data-start-practice]'));
    expect(t.host.querySelector('[data-practice-collection-select]').value).toBe('selection');
    expect(t.host.querySelector('[data-practice-count]').dataset.practiceCount).toBe('3'); // living organisms with notes; reef_star is a structure
    await select(t.host.querySelector('[data-practice-collection-select]'),'all');
    expect(t.host.querySelector('[data-practice-count]').dataset.practiceCount).toBe(String(X.SPECIES_META.filter(m=>m.group!=='structure').length));
    await click(t.host.querySelector('[data-practice-start]'));expect(t.host.querySelector('[data-guide-note-indicator]')).toBeNull();expect(t.host.textContent).not.toContain('Private observation 31');
    const back=[...t.host.querySelectorAll('button')].find(b=>b.textContent==='Back to the field guide');await click(back);expect(collection(t).getAttribute('aria-pressed')).toBe('true');expect(ids(t)).toHaveLength(4);expect(t.data.speciesPractice).toBeUndefined();
  });
});
