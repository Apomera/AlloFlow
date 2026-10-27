// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Review=require('../stem_lab/kitchen_studio/recipe_lab_movement_review.js');
const instances=[];
const result=(extra={})=>({tool:'stir',title:'Stir and fold',outcome:'completed',label:'Action recorded',instruction:'One completed mix recorded.',detail:'Compare the sauce coating before adding more water.',phase:'release',...extra});
function mount(){
  const container=document.getElementById('feedback'),reviewContainer=document.getElementById('reviewActions');
  const ui=Review.mount({container,reviewContainer});instances.push(ui);
  const details=container.lastElementChild,button=reviewContainer.querySelectorAll('[data-movement-review="button"]');
  return {ui,container,reviewContainer,details,button:button[button.length-1],summary:details.querySelector('summary'),time:details.querySelector('.kitchen-movement-review-time'),evidence:details.querySelector('.kitchen-movement-review-evidence'),detail:details.querySelector('.kitchen-movement-review-detail')};
}
beforeEach(()=>{
  document.body.innerHTML='<div id="sceneToolTray"><div class="kitchen-tool-actions" id="reviewActions"><button id="sceneChooseTool">Change tool</button></div></div><div id="feedback"><p id="existingStatus" role="status">Existing announcement</p></div><button id="outside">Other action</button>';
});
afterEach(()=>{instances.splice(0).forEach(ui=>ui.dispose());vi.restoreAllMocks();document.body.replaceChildren();});

describe('Quiet movement review',()=>{
  it('provides a native, named review button with unavailable help before the first result',()=>{
    const m=mount();
    expect(m.button.type).toBe('button');
    expect(m.button.textContent).toBe('Review movement');
    expect(m.button.getAttribute('aria-disabled')).toBe('true');
    expect(m.button.disabled).toBe(false);
    expect(m.button.tabIndex).toBe(0);
    expect(m.details.tagName).toBe('DETAILS');
    expect(m.details.hidden).toBe(true);
    expect(m.button.getAttribute('aria-controls')).toBe(m.details.id);
    expect(document.getElementById(m.button.getAttribute('aria-describedby')).textContent).toContain('No movement result yet');
    m.button.focus();m.button.click();
    expect(document.activeElement).toBe(m.button);
    expect(m.ui.open()).toBe(false);
    expect(m.details.open).toBe(false);
    expect(document.getElementById('existingStatus').textContent).toBe('Existing announcement');
  });

  it.each([
    ['completed','Action recorded'],['unfinished','Try the movement again'],
    ['stopped','Movement stopped'],['kept','Work kept']
  ])('displays the supplied %s result and guidance without a live region', (outcome,label)=>{
    const m=mount(),info=Object.freeze(result({outcome,label}));
    expect(m.ui.record(info,{time:125})).toBe(true);
    expect(m.details.hidden).toBe(false);
    expect(m.details.open).toBe(false);
    expect(m.details.dataset.outcome).toBe(outcome);
    expect(m.summary.textContent).toBe('Last movement · '+label);
    expect(m.details.querySelector('h3').textContent).toBe(info.title);
    expect(m.evidence.textContent).toBe(info.instruction);
    expect(m.detail.textContent).toBe(info.detail);
    expect(m.time.textContent).toBe('Kitchen time · 2:05');
    expect(m.button.getAttribute('aria-disabled')).toBe('false');
    expect(m.details.matches('[aria-live],[role="status"],[role="alert"]')).toBe(false);
    expect(m.details.querySelector('[aria-live],[role="status"],[role="alert"]')).toBeNull();
    expect(m.reviewContainer.querySelector('[aria-live],[role="status"],[role="alert"]')).toBeNull();
    expect(document.getElementById('existingStatus').textContent).toBe('Existing announcement');
  });

  it('never opens, focuses or scrolls when a new result arrives',()=>{
    const m=mount(),outside=document.getElementById('outside');outside.focus();
    m.summary.scrollIntoView=vi.fn();const focus=vi.spyOn(m.summary,'focus');
    m.ui.record(result(),{time:10});
    expect(document.activeElement).toBe(outside);
    expect(focus).not.toHaveBeenCalled();
    expect(m.summary.scrollIntoView).not.toHaveBeenCalled();
    expect(m.details.open).toBe(false);
  });

  it('opens and focuses the summary only when explicitly requested',()=>{
    const m=mount();m.ui.record(result(),{time:10});m.summary.scrollIntoView=vi.fn();
    m.button.focus();m.button.click();
    expect(m.details.open).toBe(true);
    expect(document.activeElement).toBe(m.summary);
    expect(m.summary.scrollIntoView).toHaveBeenCalledExactlyOnceWith({block:'nearest'});
    expect(document.getElementById('existingStatus').textContent).toBe('Existing announcement');
    m.details.open=false;
    expect(m.ui.open()).toBe(true);
    expect(document.activeElement).toBe(m.summary);
  });

  it('retains an open disclosure and current focus when its result is replaced',()=>{
    const m=mount();m.ui.record(result(),{time:10});m.ui.open();
    m.summary.scrollIntoView=vi.fn();
    m.ui.record(result({outcome:'kept',label:'Work kept',instruction:'30 mL remains in the sauce.'}),{time:20});
    expect(m.details.open).toBe(true);
    expect(document.activeElement).toBe(m.summary);
    expect(m.summary.scrollIntoView).not.toHaveBeenCalled();
    expect(m.evidence.textContent).toBe('30 mL remains in the sauce.');
    expect(m.time.textContent).toBe('Kitchen time · 0:20');
  });

  it('does not rewrite identical results or unrelated live announcements',()=>{
    const m=mount(),info=result();m.ui.record(info,{time:125.8});
    const observer=new MutationObserver(()=>{});observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true});
    for(let i=0;i<20;i++)expect(m.ui.record({...info},{time:125.9})).toBe(false);
    expect(observer.takeRecords()).toEqual([]);observer.disconnect();
    expect(document.getElementById('existingStatus').textContent).toBe('Existing announcement');
  });

  it('shows real differences in evidence and time instead of suppressing later results',()=>{
    const m=mount();m.ui.record(result(),{time:125});
    expect(m.ui.record(result({instruction:'40 mL remains in the sauce.'}),{time:125})).toBe(true);
    expect(m.evidence.textContent).toBe('40 mL remains in the sauce.');
    expect(m.ui.record(result({instruction:'40 mL remains in the sauce.'}),{time:130})).toBe(true);
    expect(m.time.textContent).toBe('Kitchen time · 2:10');
  });

  it('omits missing time and optional guidance, and accepts zero kitchen time',()=>{
    const m=mount();m.ui.record(result({detail:''}));
    expect(m.time.hidden).toBe(true);expect(m.time.textContent).toBe('');
    expect(m.detail.hidden).toBe(true);expect(m.detail.textContent).toBe('');
    m.ui.record(result(),{time:0});
    expect(m.time.hidden).toBe(false);expect(m.time.textContent).toBe('Kitchen time · 0:00');
    expect(m.detail.hidden).toBe(false);
    for(const time of [NaN,Infinity,-1,'10']){
      m.ui.record(result(),{time});expect(m.time.hidden).toBe(true);expect(m.time.textContent).toBe('');
    }
  });

  it('renders caller text as text and safely labels unknown outcomes',()=>{
    const m=mount();m.ui.record(result({title:'<img src=x onerror=alert(1)>',instruction:'<script>doSomething()</script>',outcome:'custom',label:''}));
    expect(m.details.querySelector('img,script')).toBeNull();
    expect(m.evidence.textContent).toBe('<script>doSomething()</script>');
    expect(m.summary.textContent).toBe('Last movement · Movement result');
    expect(m.details.dataset.outcome).toBe('result');
  });

  it('leaves an existing result intact when given incomplete input',()=>{
    const m=mount();m.ui.record(result(),{time:5});const before=m.details.outerHTML;
    for(const info of [null,undefined,{},'result',{instruction:42},{instruction:'  '}])expect(m.ui.record(info)).toBe(false);
    expect(m.details.outerHTML).toBe(before);
  });

  it('does not mutate the result or access browser storage',()=>{
    const m=mount(),info=Object.freeze(result()),meta=Object.freeze({time:45});
    const before=JSON.stringify({info,meta}),storage=vi.spyOn(Storage.prototype,'setItem');
    m.ui.record(info,meta);m.ui.open();m.ui.clear();
    expect(JSON.stringify({info,meta})).toBe(before);
    expect(storage).not.toHaveBeenCalled();
  });
});

describe('Movement review focus lifecycle',()=>{
  it('moves focus from a cleared result to its still-focusable review button',()=>{
    const m=mount();m.ui.record(result());m.ui.open();m.ui.clear();
    expect(document.activeElement).toBe(m.button);
    expect(m.details.hidden).toBe(true);expect(m.details.open).toBe(false);
    expect(m.details.hasAttribute('data-outcome')).toBe(false);
    expect(m.button.getAttribute('aria-disabled')).toBe('true');expect(m.button.disabled).toBe(false);
    expect(m.evidence.textContent).toBe('');expect(m.detail.textContent).toBe('');
    expect(m.ui.open()).toBe(false);
    m.ui.record(result({instruction:'A new movement result.'}));
    expect(m.details.open).toBe(false);expect(document.activeElement).toBe(m.button);
  });

  it('also repairs focus from a descendant without disturbing outside focus',()=>{
    const m=mount();m.ui.record(result());m.ui.open();
    const inside=document.createElement('button');inside.textContent='Nested review content';m.details.append(inside);inside.focus();m.ui.clear();
    expect(document.activeElement).toBe(m.button);
    m.ui.record(result());document.getElementById('outside').focus();m.ui.clear();
    expect(document.activeElement.id).toBe('outside');
  });

  it('clears idempotently without producing repeated DOM mutations',()=>{
    const m=mount();m.ui.record(result());m.ui.clear();
    const observer=new MutationObserver(()=>{});observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true});
    m.ui.clear();m.ui.clear();expect(observer.takeRecords()).toEqual([]);observer.disconnect();
  });

  it('uses unique relationships for multiple review instances and preserves sibling nodes',()=>{
    const a=mount(),b=mount(),ids=[...document.querySelectorAll('[id]')].map(node=>node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(a.button.getAttribute('aria-controls')).not.toBe(b.button.getAttribute('aria-controls'));
    a.ui.record(result());b.ui.record(result({instruction:'Another result.'}));a.ui.dispose();
    expect(b.details.isConnected).toBe(true);expect(b.button.isConnected).toBe(true);
    expect(b.evidence.textContent).toBe('Another result.');
    expect(document.getElementById('existingStatus').textContent).toBe('Existing announcement');
    expect(document.getElementById('sceneChooseTool').isConnected).toBe(true);
  });

  it.each(['summary','button'])('restores internal %s focus to Change tool on disposal',target=>{
    const m=mount();m.ui.record(result());m.ui.open();m[target].focus();m.ui.dispose();
    expect(document.activeElement.id).toBe('sceneChooseTool');
    expect(m.details.isConnected).toBe(false);expect(m.button.isConnected).toBe(false);
    expect(document.getElementById(m.button.getAttribute('aria-describedby'))).toBeNull();
  });

  it.each(['hidden','disabled'])('does not focus an unavailable Change tool button (%s)',property=>{
    const m=mount(),target=document.getElementById('sceneChooseTool');target[property]=true;
    const focus=vi.spyOn(target,'focus');m.button.focus();m.ui.dispose();expect(focus).not.toHaveBeenCalled();
  });

  it('preserves external focus and makes detached controls inert after disposal',()=>{
    const m=mount();m.ui.record(result());m.summary.scrollIntoView=vi.fn();document.getElementById('outside').focus();
    m.ui.dispose();m.ui.dispose();m.button.click();m.ui.clear();
    expect(m.ui.open()).toBe(false);expect(m.ui.record(result())).toBe(false);
    expect(document.activeElement.id).toBe('outside');expect(m.summary.scrollIntoView).not.toHaveBeenCalled();
  });

  it('rejects missing containers or containers from different documents',()=>{
    expect(()=>Review.mount()).toThrow(TypeError);
    expect(()=>Review.mount({container:document.getElementById('feedback')})).toThrow(TypeError);
    const other=document.implementation.createHTMLDocument('Other document');
    expect(()=>Review.mount({container:document.getElementById('feedback'),reviewContainer:other.body})).toThrow(TypeError);
  });
});
