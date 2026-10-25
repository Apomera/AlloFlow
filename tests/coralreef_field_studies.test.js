import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [], studies = {
  study_rays: ['ocellated_eagle_ray', 'bluespotted_stingray', 'reef_manta'],
  study_roundfish: ['blackspotted_puffer', 'porcupinefish', 'yellow_boxfish'],
  study_shells: ['textile_cone', 'giant_triton', 'giant_clam'],
  study_polyps: ['orange_cup_coral', 'cauliflower_coral', 'magnificent_anemone'],
  study_long_swimmers: ['banded_sea_krait', 'giant_moray', 'ribbon_eel'],
  study_crustaceans: ['white_spotted_hermit_crab', 'porcelain_anemone_crab', 'peacock_mantis_shrimp'],
  study_banners: ['longfin_bannerfish', 'moorish_idol', 'threadfin_butterflyfish'],
  study_cephalopods: ['bigfin_reef_squid', 'broadclub_cuttlefish', 'day_octopus']
};
let X;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  vi.spyOn(Date, 'now').mockReturnValue(1720000000000);
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => { while (mounted.length) { const t=mounted.pop(); await React.act(async()=>t.root.unmount()); t.host.remove(); } vi.restoreAllMocks(); });
const q=(t,s)=>t.host.querySelector(s);
async function click(el){expect(el).toBeTruthy();await React.act(async()=>{el.focus();el.click()});}
async function select(el,value){await React.act(async()=>{el.focus();el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}))});}
const id=t=>q(t,'.cr-dxp-portrait img').src.split('/').pop().replace(/\.webp.*$/,'');
const choices=t=>[...t.host.querySelectorAll('[data-practice-choice]')].map(el=>el.dataset.practiceChoice);
const records=t=>JSON.stringify({saved:t.data.speciesBookmarks,notes:t.data.speciesFieldNotes,log:t.data.speciesLog});
async function mount(study){const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host);let state;
 function Shell(){const[data,setData]=React.useState({coralReef:{section:'guide',speciesBookmarks:{clownfish:true},speciesFieldNotes:{clownfish:'Keep this observation'},speciesLog:{green_turtle:{firstSeen:1}}}});state=data;return window.StemLab._registry.coralReef.render({React,toolData:data,setToolData:setData,t:(k,f)=>f,reduceMotion:true})}
 const t={host,root,get data(){return state.coralReef}};mounted.push(t);await React.act(async()=>root.render(React.createElement(Shell)));await click(q(t,'[data-start-practice]'));if(study)await select(q(t,'[data-practice-collection-select]'),study);return t;
}
async function answer(t,correct=true){const current=id(t),choice=choices(t).find(candidate=>(candidate===current)===correct);await click(q(t,'[data-practice-choice="'+choice+'"]'));await click(q(t,'[data-practice-next]'));return current;}

describe('focused marine field studies',()=>{
 it.each(Object.keys(studies))('previews and practices the three %s organisms with bounded alternatives',async study=>{
  const t=await mount(study),before=records(t),expected=studies[study];
  expect(q(t,'[data-practice-field-study]').dataset.practiceFieldStudy).toBe(study);
  expect([...t.host.querySelectorAll('[data-practice-study-organism]')].map(el=>el.dataset.practiceStudyOrganism)).toEqual(expected);
  expect(q(t,'[data-practice-count]').dataset.practiceCount).toBe('3');
  expect(q(t,'[data-practice-count]').textContent).toContain('Answer choices stay within this study.');
  await click(q(t,'[data-practice-start]'));expect(q(t,'[data-practice-field-study]')).toBeNull();const seen=[];
  for(let i=0;i<3;i++){expect(choices(t).sort()).toEqual([...expected].sort());expect(q(t,'.cr-dxp-heading').textContent).toBe(`Organism ${i+1} of 3`);seen.push(await answer(t));}
  expect(seen.sort()).toEqual([...expected].sort());expect(t.data.speciesPractice).toMatchObject({rounds:1,answered:3,correct:3,last:{total:3,skipped:0,hinted:0}});expect(records(t)).toBe(before);
 });

 it.each(Object.keys(studies))('supports two-name %s questions without introducing unrelated candidates',async study=>{
  const t=await mount(study);await select(q(t,'[data-practice-name-count]'),'2');await click(q(t,'[data-practice-mode="marks"]'));await click(q(t,'[data-practice-start]'));
  for(let i=0;i<3;i++){const options=choices(t);expect(options).toHaveLength(2);expect(options.every(candidate=>studies[study].includes(candidate))).toBe(true);
   // Written-clue mode does not expose the answer in an accessible image label.
   expect(q(t,'.cr-dxp-mystery')).toBeTruthy();const first=options[0];await click(q(t,'[data-practice-choice="'+first+'"]'));await click(q(t,'[data-practice-next]'));
  }
  expect(t.data.speciesPractice.last.total).toBe(3);
 });

 it.each(Object.keys(studies))('keeps %s retries focused on the missed organism and preserves the first review',async study=>{
  const t=await mount(study),before=records(t);await click(q(t,'[data-practice-start]'));const missed=await answer(t,false);await answer(t);await answer(t);
  expect(t.data.speciesPractice.last).toMatchObject({total:3,correct:2,missedIds:[missed]});await click(q(t,'[data-practice-second-look]'));
  expect(id(t)).toBe(missed);expect(choices(t).sort()).toEqual([...studies[study]].sort());expect(q(t,'.cr-dxp-heading').textContent).toBe('Organism 1 of 1');await answer(t);
  expect(t.data.speciesPractice).toMatchObject({rounds:2,answered:4,correct:3,last:{total:1,correct:1}});expect(t.host.querySelectorAll('[data-practice-earlier-organism]')).toHaveLength(3);expect(records(t)).toBe(before);
 });

 it.each(Object.keys(studies))('lets learners study each %s profile before a round and returns focus to its preparation button',async study=>{
  const t=await mount(study),before=records(t);await select(q(t,'[data-practice-name-count]'),'2');await click(q(t,'[data-practice-mode="marks"]'));
  for(const specimen of studies[study]){
   const button=q(t,'[data-practice-study-profile="'+specimen+'"]');expect(q(t,'[data-practice-study-mark="'+specimen+'"]').textContent.length).toBeGreaterThan(12);
   expect(button.getAttribute('aria-label')).toContain(X.speciesText((k,f)=>f)[specimen].name);await click(button);
   const profile=q(t,'[data-marine-profile="'+specimen+'"]');expect(profile).toBeTruthy();expect(profile.contains(document.activeElement)).toBe(true);
   expect(q(t,'[data-marine-practice]').closest('[hidden]')).toBeTruthy();expect(t.data.speciesPractice).toBeUndefined();
   await click(q(t,'[data-open-study]'));expect(q(t,'[data-study-specimen-toggle]')).toBeTruthy();
   await click(q(t,'[data-close-study]'));
   await click(q(t,'[data-close-profile]'));expect(document.activeElement).toBe(q(t,'[data-practice-study-profile="'+specimen+'"]'));
   await click(q(t,'[data-practice-study-profile="'+specimen+'"]'));await click(q(t,'[data-profile-footer-back]'));expect(document.activeElement).toBe(q(t,'[data-practice-study-profile="'+specimen+'"]'));
   expect(q(t,'[data-practice-collection-select]').value).toBe(study);expect(q(t,'[data-practice-name-count]').value).toBe('2');expect(q(t,'[data-practice-mode="marks"]').checked).toBe(true);
  }
  expect(records(t)).toBe(before);await click(q(t,'[data-practice-start]'));expect(choices(t)).toHaveLength(2);expect(q(t,'.cr-dxp-mystery')).toBeTruthy();
 });

 it('keeps preparation access separate from a profile opened during an answered question',async()=>{
  const t=await mount('study_long_swimmers');await click(q(t,'[data-practice-study-profile=banded_sea_krait]'));await click(q(t,'[data-open-study]'));expect(q(t,'[data-study-specimen-toggle]')).toBeTruthy();await click(q(t,'[data-close-study]'));await click(q(t,'[data-close-profile]'));await click(q(t,'[data-practice-start]'));
  const current=id(t);await click(q(t,'[data-practice-choice="'+current+'"]'));const study=[...t.host.querySelectorAll('button')].find(el=>el.textContent==='Study profile');await click(study);await click(q(t,'[data-open-study]'));expect(q(t,'[data-study-specimen-toggle]')).toBeNull();
  await click(q(t,'[data-close-study]'));await click(q(t,'[data-close-profile]'));expect(id(t)).toBe(current);expect(q(t,'[data-practice-feedback]')).toBeTruthy();expect(t.data.speciesPractice).toBeUndefined();
 });

 it.each(['study_banners','study_cephalopods'])('offers a private name-recall warm-up for %s without changing scores or hint use',async study=>{
  const t=await mount(study),before=records(t),expected=studies[study],names=X.speciesText((k,f)=>f);
  const cover=q(t,'[data-study-cover-names]');expect(cover.checked).toBe(false);expect(q(t,'[data-study-show-name]')).toBeNull();
  await click(cover);expect(document.activeElement).toBe(cover);expect(cover.checked).toBe(true);
  for(const [index,specimen] of expected.entries()){
   const card=q(t,'[data-practice-study-organism="'+specimen+'"]'),name=q(t,'[data-study-organism-name="'+specimen+'"]');
   expect(name.textContent).toBe('Organism '+(index+1));expect(card.textContent).not.toContain(names[specimen].name);
   expect(card.querySelector('img').alt).toBe('');expect(card.querySelector('[data-practice-study-profile]').getAttribute('aria-label')).toBe('Study profile: Organism '+(index+1));
   const show=card.querySelector('[data-study-show-name]');expect(show.getAttribute('aria-controls')).toBe(name.id);expect(show.getAttribute('aria-pressed')).toBe('false');
   await click(show);expect(document.activeElement).toBe(show);expect(show.getAttribute('aria-pressed')).toBe('true');expect(name.textContent).toBe(names[specimen].name);expect(q(t,'[data-study-recall-status]').textContent).toContain(names[specimen].name);
   await click(show);expect(show.getAttribute('aria-pressed')).toBe('false');expect(name.textContent).toBe('Organism '+(index+1));expect(q(t,'[data-study-recall-status]').textContent).not.toContain(names[specimen].name);
  }
  expect(q(t,'[data-study-recall-status]').getAttribute('aria-live')).toBe('polite');expect(t.data.speciesPractice).toBeUndefined();expect(records(t)).toBe(before);
  await click(q(t,'[data-practice-start]'));expect(q(t,'[data-study-recall-status]')).toBeNull();for(let i=0;i<3;i++)await answer(t);
  expect(t.data.speciesPractice.last).toMatchObject({total:3,correct:3,hinted:0});expect(JSON.stringify(t.data)).not.toContain('covered');expect(records(t)).toBe(before);
 });

 it('preserves covered names across a preparation profile visit and resets the warm-up for another collection',async()=>{
  const t=await mount('study_banners');await select(q(t,'[data-practice-name-count]'),'2');await click(q(t,'[data-practice-mode="marks"]'));await click(q(t,'[data-study-cover-names]'));await click(q(t,'[data-study-show-name=moorish_idol]'));
  await click(q(t,'[data-practice-study-profile=longfin_bannerfish]'));await click(q(t,'[data-open-study]'));expect(q(t,'[data-study-specimen-toggle]')).toBeTruthy();await click(q(t,'[data-close-study]'));await click(q(t,'[data-profile-footer-back]'));
  expect(document.activeElement).toBe(q(t,'[data-practice-study-profile=longfin_bannerfish]'));expect(q(t,'[data-study-cover-names]').checked).toBe(true);expect(q(t,'[data-study-show-name=moorish_idol]').getAttribute('aria-pressed')).toBe('true');expect(q(t,'[data-study-organism-name=longfin_bannerfish]').textContent).toBe('Organism 1');
  await select(q(t,'[data-practice-collection-select]'),'study_cephalopods');expect(q(t,'[data-study-cover-names]').checked).toBe(false);expect(q(t,'[data-study-show-name]')).toBeNull();expect(q(t,'[data-study-recall-status]').textContent).toBe('');
  expect(q(t,'[data-practice-name-count]').value).toBe('2');expect(q(t,'[data-practice-mode="marks"]').checked).toBe(true);expect(t.data.speciesPractice).toBeUndefined();
  await select(q(t,'[data-practice-collection-select]'),'study_banners');expect(q(t,'[data-study-cover-names]').checked).toBe(false);
 });

 it('reveals all preparation names on request and starts a fresh cover without retaining previous reveals',async()=>{
  const t=await mount('study_cephalopods');await click(q(t,'[data-study-cover-names]'));await click(q(t,'[data-study-show-name=bigfin_reef_squid]'));await click(q(t,'[data-study-cover-names]'));
  expect(q(t,'[data-study-show-name]')).toBeNull();expect(q(t,'[data-study-organism-name=day_octopus]').textContent).toContain('Day octopus');expect(q(t,'[data-study-recall-status]').textContent).toBe('All names are visible.');
  await click(q(t,'[data-study-cover-names]'));expect([...t.host.querySelectorAll('[data-study-show-name]')].every(button=>button.getAttribute('aria-pressed')==='false')).toBe(true);
  await select(q(t,'[data-practice-collection-select]'),'all');expect(q(t,'[data-study-cover-names]')).toBeNull();expect(q(t,'[data-practice-field-study]')).toBeNull();
 });

 it('keeps ordinary mixed collections and unfinished progress unchanged',async()=>{
  const t=await mount();expect(q(t,'[data-practice-collection-select]').value).toBe('all');expect(q(t,'[data-practice-count]').dataset.practiceCount).toBe(String(X.SPECIES_META.filter(m=>m.group!=='structure').length));
  await select(q(t,'[data-practice-collection-select]'),'study_rays');await click(q(t,'[data-practice-start]'));const back=[...t.host.querySelectorAll('button')].find(el=>el.textContent==='Back to the field guide');await click(back);
  expect(t.data.speciesPractice).toBeUndefined();expect(q(t,'[data-open-profile=ocellated_eagle_ray]')).toBeTruthy();expect(q(t,'[data-open-profile=blackspotted_puffer]')).toBeTruthy();
 });
});
