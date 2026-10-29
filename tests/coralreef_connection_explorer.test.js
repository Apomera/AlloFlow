import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef'); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function mount(extra = {}, theme = 'light') {
  let data = { coralReef: { section:'guide', guideGroupFilter:'fish', speciesBookmarks:{clownfish:true}, speciesFieldNotes:{clownfish:'Three bands'}, speciesLog:{green_turtle:{firstSeen:1}}, ...extra } };
  const host=document.createElement('div');document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host), cfg=window.StemLab._registry.coralReef;
  function Shell(){const [state,setState]=React.useState(data);data=state;return cfg.render({React,toolData:state,setToolData:setState,t:(key,fallback)=>fallback||key,reduceMotion:true,theme});}
  const t={host,root,get data(){return data.coralReef;}};mounted.push(t);
  await React.act(async()=>root.render(React.createElement(Shell)));return t;
}
async function click(el){expect(el).toBeTruthy();await React.act(async()=>{el.focus();el.click();await new Promise(resolve=>setTimeout(resolve,35));});}
async function select(el,value){await React.act(async()=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));});}
const backToGuide=t=>[...t.host.querySelectorAll('button')].find(b=>b.textContent==='Back to the field guide');
const learnerWork=t=>JSON.stringify([t.data.speciesBookmarks,t.data.speciesFieldNotes,t.data.speciesLog]);

describe('visual reef connection explorer',()=>{
  it('opens five sourced portrait pairs on demand, without creating WebGL canvases',async()=>{
    const t=await mount(), before=learnerWork(t);
    expect(t.host.querySelector('[data-connection-explorer]').open).toBe(false);
    expect(t.host.querySelectorAll('[data-connection-pair]')).toHaveLength(0);
    await click(t.host.querySelector('[data-guide-open-connections]'));
    const explorer=t.host.querySelector('[data-connection-explorer]');
    expect(explorer.open).toBe(true);expect(document.activeElement).toBe(explorer.querySelector('summary'));
    expect(explorer.querySelectorAll('[data-connection-pair]')).toHaveLength(5);
    expect(explorer.querySelectorAll('[data-connection-study]')).toHaveLength(10);
    expect(explorer.querySelectorAll('[data-connection-compare]')).toHaveLength(5);
    for(const button of explorer.querySelectorAll('button')) expect(button.getAttribute('aria-label')).toContain(button.textContent);
    expect(explorer.textContent).toContain('in captivity');
    expect(explorer.textContent).toContain('represents this branching coral group');
    for(const a of explorer.querySelectorAll('a')){expect(a.href).toMatch(/^https:/);expect(a.rel).toContain('noopener');}
    expect(t.host.querySelector('canvas')).toBeNull();expect(learnerWork(t)).toBe(before);
  });

  it('reads either partner and returns focus to the originating pair without clearing guide filters',async()=>{
    const t=await mount(), before=learnerWork(t);
    await click(t.host.querySelector('[data-guide-open-connections]'));
    await click(t.host.querySelector('[data-connection-pair="clownfish-anemone"] [data-connection-study="magnificent_anemone"]'));
    expect(t.host.querySelector('[data-marine-profile="magnificent_anemone"]')).toBeTruthy();
    expect(document.activeElement.tagName).toBe('H3');
    await click(backToGuide(t));
    const button=t.host.querySelector('[data-connection-pair="clownfish-anemone"] [data-connection-study="magnificent_anemone"]');
    expect(document.activeElement).toBe(button);
    expect(t.host.querySelector('[data-connection-explorer]').open).toBe(true);
    expect(t.host.querySelector('[data-guide-group-filter]').value).toBe('fish');
    expect(learnerWork(t)).toBe(before);
  });

  it('shows only an exact pair relationship in comparison and restores the pair button',async()=>{
    const t=await mount(), before=learnerWork(t);
    await click(t.host.querySelector('[data-guide-open-connections]'));
    await click(t.host.querySelector('[data-connection-compare="triton-crown"]'));
    expect(t.host.querySelector('[data-marine-comparison]').dataset.marineComparison).toBe('giant_triton:crown_of_thorns');
    expect(t.host.querySelector('[data-comparison-connection="triton-crown"]').textContent).toContain('hunt and eat crown-of-thorns');
    expect(t.host.querySelector('[data-close-comparison]').textContent).toBe('Back to reef connections');
    await select(t.host.querySelector('[data-compare-select="1"]'),'green_turtle');
    expect(t.host.querySelector('[data-comparison-connection]')).toBeNull();
    await click(t.host.querySelector('[data-close-comparison]'));
    expect(document.activeElement).toBe(t.host.querySelector('[data-connection-compare="triton-crown"]'));
    expect(t.data.guideSpeciesId).toBeNull();expect(learnerWork(t)).toBe(before);
  });

  it('contrasts supported animal body plans and retains the normal profile return path',async()=>{
    const t=await mount({guideSpeciesId:'goldmouth_sea_squirt'});
    await click(t.host.querySelector('[data-compare-with="barrel_sponge"]'));
    const row=t.host.querySelector('[data-comparison-animal-groups]');
    expect(row).toBeTruthy();expect(row.textContent).toContain('chordate without a backbone');expect(row.textContent).toContain('pore-bearing animal');
    expect(row.querySelectorAll('a')).toHaveLength(2);
    await select(t.host.querySelector('[data-compare-select="1"]'),'green_turtle');
    expect(t.host.querySelector('[data-comparison-animal-groups]')).toBeNull();
    await click(t.host.querySelector('[data-close-comparison]'));
    expect(t.host.querySelector('[data-marine-profile="goldmouth_sea_squirt"]')).toBeTruthy();
    expect(document.activeElement).toBe(t.host.querySelector('[data-compare-with="barrel_sponge"]'));
  });

  it('keeps the expanded gallery accessible in each theme',async()=>{
    for(const theme of ['light','dark','contrast']){
      const t=await mount({},theme);await click(t.host.querySelector('[data-guide-open-connections]'));
      const result=await runIsolatedAxe(t.host.querySelector('[data-connection-explorer]').outerHTML);
      expect(result.violations.map(v=>v.id),theme).toEqual([]);
    }
  },60000);
});
