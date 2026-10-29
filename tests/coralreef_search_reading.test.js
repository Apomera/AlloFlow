import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted=[];
beforeEach(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_coralreef.js','coralReef');});
afterEach(async()=>{while(mounted.length){const t=mounted.pop();await React.act(async()=>t.root.unmount());t.host.remove();}});
async function mount(extra={}){
  let data={coralReef:{section:'guide',guideSearchMode:'description',speciesFieldNotes:{clownfish:'Bands'},speciesBookmarks:{clownfish:true},speciesLog:{green_turtle:{firstSeen:1}},...extra}};
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host),cfg=window.StemLab._registry.coralReef;
  function Shell(){const[state,setState]=React.useState(data);data=state;return cfg.render({React,toolData:state,setToolData:setState,t:(k,f)=>f,reduceMotion:true});}
  const t={host,root,get data(){return data.coralReef;}};mounted.push(t);await React.act(async()=>root.render(React.createElement(Shell)));return t;
}
async function click(el){expect(el).toBeTruthy();await React.act(async()=>{el.focus();el.click();await new Promise(r=>setTimeout(r,30));});}
async function change(el,value){await React.act(async()=>{el.focus();Object.getOwnPropertyDescriptor(el.tagName==='INPUT'?HTMLInputElement.prototype:HTMLSelectElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='INPUT'?'input':'change',{bubbles:true}));});}
const query=(t,value)=>change(t.host.querySelector('input[type=search]'),value);
const work=t=>JSON.stringify([t.data.speciesLog,t.data.speciesBookmarks,t.data.speciesFieldNotes]);

describe('reading from expanded guide search',()=>{
  it.each([
    ['notochord','goldmouth_sea_squirt','fact'],
    ['bivalve','giant_clam','animalGroup'],
    ['captivity','harlequin_shrimp','connection']
  ])('finds %s and returns focus to its matching excerpt',async(word,id,field)=>{
    const t=await mount(),before=work(t);await query(t,word);
    const selector='[data-species="'+id+'"] [data-read-match="'+field+'"]';
    const button=t.host.querySelector(selector);expect(button).toBeTruthy();expect(button.getAttribute('aria-label')).toContain(button.textContent);
    expect(t.host.querySelector('[data-guide-match="'+id+'"]').textContent).not.toContain('undefined');
    await click(button);
    expect(document.activeElement).toBe(t.host.querySelector('[data-profile-reading="'+field+'"]'));
    await click(t.host.querySelector('[data-close-profile]'));
    expect(t.host.querySelector('input[type=search]').value).toBe(word);expect(document.activeElement).toBe(t.host.querySelector(selector));expect(work(t)).toBe(before);
  });
  it('preserves a diet reading action without duplicating the featured role excerpt',async()=>{
    const t=await mount();await change(t.host.querySelector('[data-guide-role]'),'plankton');await query(t,'filtering pharynx');
    const card=t.host.querySelector('[data-species="goldmouth_sea_squirt"]'),note=card.querySelector('[data-guide-role-note]');
    const button=note.querySelector('[data-read-match="diet"]');expect(button).toBeTruthy();expect(card.textContent.match(/filtering pharynx/g)).toHaveLength(1);
    await click(button);expect(document.activeElement).toBe(t.host.querySelector('[data-profile-reading="diet"]'));
    await click(t.host.querySelector('[data-close-profile]'));expect(document.activeElement).toBe(t.host.querySelector('[data-guide-role-note="goldmouth_sea_squirt"] [data-read-match="diet"]'));
  });
  it('returns to the exact excerpt when two matches belong to the same section',async()=>{
    const t=await mount();await query(t,'triton wrasse');
    const selector='[data-species="crown_of_thorns"] [data-read-match="connection"]';
    expect(t.host.querySelectorAll(selector)).toHaveLength(2);
    for(const index of [0,1]){
      await click(t.host.querySelectorAll(selector)[index]);
      expect(document.activeElement).toBe(t.host.querySelector('[data-profile-reading="connection"]'));
      await click(t.host.querySelector('[data-close-profile]'));
      expect(document.activeElement).toBe(t.host.querySelectorAll(selector)[index]);
    }
  });
  it('search ideas opt into descriptions while retaining active filters and input focus',async()=>{
    const t=await mount({guideSearchMode:'names',guideGroupFilter:'invertebrate'});await change(t.host.querySelector('[data-guide-role]'),'plankton');
    await click(t.host.querySelector('[data-search-ideas] summary'));await click(t.host.querySelector('[data-search-idea="siphons"]'));
    const input=t.host.querySelector('input[type=search]');expect(input.value).toBe('siphons');expect(document.activeElement).toBe(input);
    expect(t.data.guideSearchMode).toBe('description');expect(t.data.guideGroupFilter).toBe('invertebrate');expect(t.host.querySelector('[data-guide-role]').value).toBe('plankton');expect(t.host.querySelector('[data-search-ideas]').open).toBe(true);
    expect(t.host.querySelector('[data-species="goldmouth_sea_squirt"]')).toBeTruthy();
    const result=await runIsolatedAxe(t.host.querySelector('[data-guide-match="goldmouth_sea_squirt"]').outerHTML);expect(result.violations.map(v=>v.id)).toEqual([]);
  },60000);
  it('related profile navigation clears reading intent and comparison return retains its button',async()=>{
    const t=await mount();await query(t,'notochord');await click(t.host.querySelector('[data-species="goldmouth_sea_squirt"] [data-read-match="fact"]'));
    await click(t.host.querySelector('[data-compare-with="barrel_sponge"]'));await click(t.host.querySelector('[data-close-comparison]'));
    expect(document.activeElement).toBe(t.host.querySelector('[data-compare-with="barrel_sponge"]'));
    await click(t.host.querySelector('[data-profile-related="barrel_sponge"]'));
    expect(document.activeElement).toBe(t.host.querySelector('[data-marine-profile="barrel_sponge"] h3'));
    await click(t.host.querySelector('[data-close-profile]'));
    expect(document.activeElement).toBe(t.host.querySelector('[data-species="goldmouth_sea_squirt"] [data-read-match="fact"]'));
  });
});
