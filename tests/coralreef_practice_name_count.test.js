import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X;
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; vi.spyOn(Date, 'now').mockReturnValue(1720000000000); });
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } vi.restoreAllMocks(); });
const query = (t, selector) => t.host.querySelector(selector);
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); }
async function select(el, value) { expect(el).toBeTruthy(); await React.act(async () => { el.value = String(value); el.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function mount(extra = {}) {
  let data = { coralReef: { section: 'guide', speciesBookmarks: { clownfish: true, banded_pipefish: true }, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } }, ...extra } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (k, v) => v || k }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  if (!extra.guideSpeciesId) await click(query(t, '[data-start-practice]')); return t;
}
function ids(t) { return [...t.host.querySelectorAll('[data-practice-choice]')].map(e => e.dataset.practiceChoice); }
function truthAt(t, length, scope, priority = [], previous, sequence = 1) {
  const index = Number(query(t, '[data-practice-question]').dataset.practiceQuestion);
  return X.buildMarinePracticeRound(X.SPECIES_META, 1720000000000 + sequence, scope, priority, previous, length)[index].id;
}


const names=t=>query(t,'[data-practice-name-count]');
const named=(t,text)=>[...t.host.querySelectorAll('button')].find(b=>b.textContent===text);
async function start(t,count=2,scope='saved') {await select(names(t),count);await select(query(t,'[data-practice-collection-select]'),scope);await click(query(t,'[data-practice-start]'));}
async function advance(t,choice) {await click(query(t,'[data-practice-choice="'+choice+'"]'));await click(query(t,'[data-practice-next]'));}
const stable=t=>JSON.stringify({log:t.data.speciesLog,bookmarks:t.data.speciesBookmarks,notes:t.data.speciesFieldNotes});
describe('optional number of identification names',()=>{
  it('defaults to three names, with a labelled setup control, and preserves generated question order and choices',async()=>{
    const t=await mount();expect(names(t).value).toBe('3');expect(t.host.querySelector('label[for="'+names(t).id+'"]').textContent).toBe('Names per question');
    expect(document.getElementById(names(t).getAttribute('aria-describedby')).textContent).toContain('two names');
    await select(query(t,'[data-practice-length]'),3);await click(query(t,'[data-practice-start]'));
    const round=X.buildMarinePracticeRound(X.SPECIES_META,1720000000001,undefined,[],undefined,3);
    for(const item of round){expect(ids(t)).toEqual(item.choices);expect(names(t)).toBeNull();await advance(t,item.id);}
    expect(t.data.speciesPractice.last).toMatchObject({total:3,correct:3,hinted:0});
    await click(named(t,'Choose another group'));await select(names(t),'invalid');expect(names(t).value).toBe('3');
  });
  it('keeps the same targets and shuffled order with exactly two unique names, preferring an available guide contrast',async()=>{
    const scope=['green_turtle','hawksbill_turtle','porcupinefish','yellow_boxfish','blue_tang'];
    const t=await mount({speciesBookmarks:Object.fromEntries(scope.map(id=>[id,true]))}),record=stable(t);await start(t);
    const round=X.buildMarinePracticeRound(X.SPECIES_META,1720000000001,scope,[],undefined,5);
    for(const item of round){
      const choices=ids(t);expect(choices).toHaveLength(2);expect(new Set(choices).size).toBe(2);expect(choices).toContain(item.id);expect(choices).toEqual(item.choices.filter(id=>choices.includes(id)));
      const related=X.SPECIES_META.find(m=>m.id===item.id).lookalikes,available=item.choices.filter(id=>related.includes(id));if(available.length)expect(available).toContain(choices.find(id=>id!==item.id));
      await advance(t,item.id);
    }
    expect(t.data.speciesPractice).toMatchObject({rounds:1,answered:5,correct:5,last:{total:5,correct:5,hinted:0}});expect(stable(t)).toBe(record);expect(JSON.stringify(t.data)).not.toMatch(/nameCount|choiceCount/);
    await click(named(t,'Choose another group'));expect(names(t).value).toBe('2');await select(names(t),3);await click(query(t,'[data-practice-start]'));expect(ids(t)).toHaveLength(3);
  });
  it('retains the exact wrong name on a focused second look while skips remain ungraded',async()=>{
    const scope=['clownfish','banded_pipefish','porcupinefish'];const t=await mount({speciesBookmarks:Object.fromEntries(scope.map(id=>[id,true]))});await start(t);const record=stable(t);
    const initial=X.buildMarinePracticeRound(X.SPECIES_META,1720000000001,scope,[],undefined,5),previous=[];
    for(const [index,item] of initial.entries()){
      if(index===1){await click(query(t,'[data-practice-skip]'));previous.push({id:item.id,choice:null,correct:false,skipped:true});await click(query(t,'[data-practice-next]'));}
      else {const choice=ids(t).find(id=>id!==item.id);previous.push({id:item.id,choice,correct:false,skipped:false});await advance(t,choice);}
    }
    expect(t.data.speciesPractice.last).toMatchObject({total:3,correct:0,skipped:1});await click(query(t,'[data-practice-second-look]'));
    const targets=initial.map(q=>q.id),retry=X.buildMarinePracticeRound(X.SPECIES_META,1720000000002,targets,targets,previous,5);
    for(const item of retry){expect(ids(t)).toHaveLength(2);const before=previous.find(a=>a.id===item.id);if(!before.skipped)expect(ids(t)).toContain(before.choice);await advance(t,item.id);}
    expect(t.data.speciesPractice).toMatchObject({rounds:2,answered:5,correct:3,last:{total:3,correct:3,missedIds:[]}});expect(stable(t)).toBe(record);
  });
  it.each(['picture','marks'])('keeps candidate comparison, profile return, clues and answer lock consistent in %s mode',async mode=>{
    const t=await mount({speciesBookmarks:{porcupinefish:true}}),record=stable(t);if(mode==='marks')await click(query(t,'[data-practice-mode="marks"]'));await start(t);
    const original=ids(t);expect(original).toHaveLength(2);await click(query(t,'[data-practice-compare-toggle]'));
    expect([...t.host.querySelectorAll('[data-practice-candidate]')].map(e=>e.dataset.practiceCandidate)).toEqual(original);
    const wrong=original.find(id=>id!=='porcupinefish');await click(query(t,'[data-practice-candidate-choose="'+wrong+'"]'));
    const feedback=query(t,'[data-practice-feedback]').textContent;await click(named(t,'Study profile'));await click(query(t,'[data-close-profile]'));expect(ids(t)).toEqual(original);expect(query(t,'[data-practice-feedback]').textContent).toBe(feedback);
    await click(query(t,'[data-practice-choice="porcupinefish"]'));expect(query(t,'[data-practice-feedback]').textContent).toBe(feedback);await click(query(t,'[data-practice-next]'));
    expect(t.data.speciesPractice.last).toMatchObject({total:1,correct:0,hinted:1});expect(stable(t)).toBe(record);
  });
  it('keeps comparison pairs fixed at two names and restores the setup control outside the pair',async()=>{
    const t=await mount({guideSpeciesId:'green_turtle'});await click(query(t,'[data-start-comparison]'));await click(query(t,'[data-practice-comparison-pair]'));
    expect(query(t,'[data-practice-collection-select]').value).toBe('pair');expect(names(t)).toBeNull();await select(query(t,'[data-practice-collection-select]'),'all');expect(names(t).value).toBe('3');await select(names(t),2);await select(query(t,'[data-practice-collection-select]'),'pair');expect(names(t)).toBeNull();await click(query(t,'[data-practice-start]'));
    for(let i=0;i<2;i++){expect(ids(t).slice().sort()).toEqual(['green_turtle','hawksbill_turtle']);await click(query(t,'[data-practice-skip]'));await click(query(t,'[data-practice-next]'));}
    expect(t.data.speciesPractice.last).toMatchObject({total:2,skipped:2});
  });
});
