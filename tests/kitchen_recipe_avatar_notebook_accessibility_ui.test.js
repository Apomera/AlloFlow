// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';

const require=createRequire(import.meta.url),M=require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js');
const source=readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar_notebook.js','utf8');
let notebook,session,readTimeline,readAction;
const part=key=>document.querySelector('[data-avatar-notebook="'+key+'"]');
const state=()=>JSON.stringify(session);
function action(kind,options={}){const prior=session;let next=M.begin(session,kind,options);expect(next,kind+' prepares').not.toBe(prior);while(next.pending.phase!=='ready')next=M.advance(next,next.pending.token);session=M.commit(next,next.pending.token);}
function mount(overrides={}){notebook=window.KitchenAvatarNotebook.mount({container:document.getElementById('host'),readTimeline,readAction,...overrides});notebook.update({attemptKey:'one'});}
function update(key='one'){notebook.update({attemptKey:key});}
function choose(index){part('select').value=String(index);part('select').dispatchEvent(new Event('change',{bubbles:true}));}
function stack(){const checkbox=part('stack-quantities');expect(checkbox).not.toBeNull();if(!checkbox.checked)checkbox.click();}
function threeActions(){action('inspect');action('pour',{source:'plain',amountMl:30});action('fold');}
function visible(node){return !!node&&!node.closest('[hidden]');}
function described(node,attribute){return (node.getAttribute(attribute)||'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id));}

beforeEach(()=>{
  document.body.innerHTML='<div id="host"></div>';localStorage.clear();sessionStorage.clear();
  session=M.create({mode:'independent'});readTimeline=vi.fn(()=>M.actionTimeline(session));readAction=vi.fn(index=>M.actionReview(session,index));
  window.eval(source);
});
afterEach(()=>{notebook?.destroy();vi.restoreAllMocks();document.body.replaceChildren();localStorage.clear();sessionStorage.clear();});

describe('Historical evidence has explicit reading and single-column quantity alternatives',()=>{
  it('announces the requested historical result and its recorded kitchen time, without replacing it with the latest result',()=>{
    threeActions();action('inspect');mount();choose(1);
    const review=M.actionReview(session,1),status=part('status').textContent;
    expect(status).toContain('action 1 of 4');expect(status).toContain(review.observation.label);expect(status).toContain(review.observation.description);
    expect(status).toContain('0:00');expect(status).toMatch(/recorded|historical|at this action/i);
    expect(part('observation-label').textContent).toBe(review.observation.label);
    expect(part('status').getAttribute('role')).toBe('status');expect(part('status').getAttribute('aria-live')).toBe('polite');
  });

  it('announces only the recorded mushroom face when reviewing an earlier turn',()=>{
    session=M.create({activity:'mushroom-turning',mode:'independent'});action('turnMushroom',{piece:2});action('turnMushroom',{piece:2});mount();choose(1);
    const review=M.actionReview(session,1),turn=session.receipts[0].mushroomTurn,other=turn.revealedFace===0?'B':'A';
    expect(part('status').textContent).toContain(review.observation.label);expect(part('status').textContent).toContain(review.observation.description);
    expect(part('status').textContent).not.toMatch(new RegExp('face\\s+'+other+'\\s*[·:]','i'));
    expect(part('panel').dataset.selected).toBe('1');
  });

  it('identifies actions without a new check instead of announcing an earlier observation as current',()=>{
    threeActions();mount();choose(1);const sample=M.actionReview(session,1).observation;choose(2);
    expect(part('status').textContent).toMatch(/No new observation/i);expect(part('status').textContent).not.toContain(sample.description);
    expect(part('observation').dataset.recorded).toBe('false');
  });

  it('keeps historical status and a ready preview unchanged during repeated owner renders',()=>{
    threeActions();mount();choose(1);session=M.begin(session,'inspect',{method:'keyboard'});while(session.pending.phase!=='ready')session=M.advance(session,session.pending.token);
    const before=state(),message=part('status').textContent,calls=readAction.mock.calls.length,observer=new MutationObserver(()=>{});observer.observe(part('status'),{childList:true,subtree:true,characterData:true});
    for(let n=0;n<20;n++)update();
    expect(state()).toBe(before);expect(part('status').textContent).toBe(message);expect(readAction).toHaveBeenCalledTimes(calls);expect(observer.takeRecords()).toEqual([]);observer.disconnect();
  });

  it('offers a named native checkbox while retaining the semantic table by default',()=>{
    threeActions();mount();const checkbox=part('stack-quantities');expect(checkbox.tagName).toBe('INPUT');expect(checkbox.type).toBe('checkbox');expect(checkbox.checked).toBe(false);
    expect([...checkbox.labels].map(n=>n.textContent).join(' ')).toMatch(/Read quantities as stacked summaries/i);
    expect(visible(part('quantities-scroll'))).toBe(true);expect(visible(part('quantity-summaries'))).toBe(false);
    expect(part('quantities').querySelector('caption').textContent).toBe('Modeled quantities at this action');
    expect([...part('quantities').querySelectorAll('thead th')].every(n=>n.scope==='col')).toBe(true);
  });

  it('presents the same before, after, and change values in readable stacked summaries',()=>{
    threeActions();mount();choose(2);const before=state(),rows=[...part('quantities').querySelectorAll('tbody tr')].map(row=>({label:row.querySelector('th').textContent,values:[...row.querySelectorAll('td')].map(cell=>cell.textContent)}));stack();
    expect(visible(part('quantities-scroll'))).toBe(false);expect(visible(part('quantity-summaries'))).toBe(true);expect(visible(part('scroll-help'))).toBe(false);
    const items=[...part('quantity-summaries').children];expect(items).toHaveLength(rows.length);
    for(let index=0;index<items.length;index++){expect(items[index].querySelector('h6').textContent).toBe(rows[index].label);expect([...items[index].querySelectorAll('dt')].map(n=>n.textContent)).toEqual(['Before','After','Change']);expect([...items[index].querySelectorAll('dd')].map(n=>n.textContent)).toEqual(rows[index].values);}
    expect(state()).toBe(before);expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);
  });

  it('preserves unavailable values and positive and negative traces in both quantity views',()=>{
    const review={actionNumber:1,label:'Recorded transfer',actor:'learner',method:'keyboard',startedAt:0,endedAt:0,durationSeconds:0,quantities:[{id:'unknown',label:'Unmeasured tap water',unit:'mL',before:null,after:null,delta:null,changed:false},{id:'trace',label:'Water trace',unit:'mL',before:.001,after:0,delta:-.001,changed:true},{id:'starch',label:'Starch trace',unit:'g',before:0,after:.0001,delta:.0001,changed:true}],details:[],observation:null};
    mount({readTimeline:()=>({count:1,entries:[review]}),readAction:()=>review});stack();
    const rows=[...part('quantity-summaries').children].map(item=>[...item.querySelectorAll('dd')].map(n=>n.textContent));
    expect(rows).toEqual([['Not available','Not available','Not available'],['trace (< 0.01 mL)','0 mL','−trace (< 0.01 mL)'],['0 g','trace (< 0.001 g)','+trace (< 0.001 g)']]);
    expect(part('quantity-summaries').querySelector('script,img')).toBeNull();
  });

  it('keeps the preferred quantity view while navigating, committing, and changing attempts',()=>{
    threeActions();mount();stack();choose(1);expect(part('stack-quantities').checked).toBe(true);action('inspect');update();expect(part('stack-quantities').checked).toBe(true);expect(part('panel').dataset.selected).toBe('1');
    session=M.create({activity:'garlic-preparation',mode:'independent'});action('mince',{clove:0});update('garlic');
    expect(part('stack-quantities').checked).toBe(true);expect(visible(part('quantity-summaries'))).toBe(true);expect(visible(part('quantities-scroll'))).toBe(false);expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);
  });

  it('hides the quantity alternatives and reading action for an empty attempt without losing the view preference',()=>{
    threeActions();mount();stack();session=M.create({mode:'independent'});update('empty');
    expect(visible(part('stack-quantities'))).toBe(false);expect(visible(part('quantity-summaries'))).toBe(false);expect(visible(part('read-detail'))).toBe(false);
    action('inspect');update('empty');expect(part('stack-quantities').checked).toBe(true);expect(visible(part('quantity-summaries'))).toBe(true);
  });

  it('moves focus to named action details only when the reading action is explicitly activated',()=>{
    threeActions();mount();choose(1);const button=part('read-detail'),detail=part('detail'),before=state();button.focus();expect(document.activeElement).toBe(button);button.click();
    expect(document.activeElement).toBe(detail);expect(detail.getAttribute('role')).toBe('region');expect(detail.tabIndex).toBe(-1);expect(described(detail,'aria-labelledby')).toContain(part('action'));expect(described(detail,'aria-describedby')).toContain(part('position'));expect(button.getAttribute('aria-controls')).toBe(detail.id);expect(state()).toBe(before);
  });

  it('repairs focused details safely when a new empty attempt hides them',()=>{
    threeActions();mount();part('read-detail').click();expect(document.activeElement).toBe(part('detail'));
    session=M.create({mode:'independent'});update('empty-after-reading');expect(part('detail').hidden).toBe(true);expect(document.activeElement).toBe(part('title'));
    expect(part('title').getAttribute('tabindex')).toBe('-1');
  });

  it('keeps an unavailable historical action safe and restores the chosen quantity view on a valid selection',()=>{
    threeActions();const actual=readAction;mount({readAction:index=>index===1?null:actual(index)});stack();choose(1);
    expect(part('detail').hidden).toBe(true);expect(visible(part('read-detail'))).toBe(false);expect(part('status').textContent).toMatch(/unavailable/);
    choose(2);expect(part('detail').hidden).toBe(false);expect(part('stack-quantities').checked).toBe(true);expect(visible(part('quantity-summaries'))).toBe(true);
  });

  it('resets the display preference after destruction and remounting without touching saved state',()=>{
    threeActions();mount();stack();const before=state();notebook.destroy();mount();expect(part('stack-quantities').checked).toBe(false);expect(visible(part('quantities-scroll'))).toBe(true);expect(state()).toBe(before);expect(localStorage.length).toBe(0);expect(sessionStorage.length).toBe(0);
  });
});
