import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadTool, resetStemLab, makeCtx, newStore, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';
const ids = ['frontal','prefrontal','motor_cortex','parietal','temporal','occipital','cerebellum','brainstem'];
function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}
function session(region='frontal',extra={}) {
  const tool=loadTool('stem_lab/stem_tool_brainatlas.js','brainAtlas');
  const store=newStore({brainAtlas:{view:'lateral',selectedRegion:region,...extra}});
  const awardXP=vi.fn(), callGemini=vi.fn();
  const tree=()=>tool.render(makeCtx({awardXP,callGemini},store));
  const nodes=()=>flatten(tree());
  const get=(key,value='true')=>nodes().find(el=>el.props?.[key]===value);
  return {store,nodes,get,awardXP,callGemini,html:()=>ReactDOMServer.renderToStaticMarkup(tree()),open:()=>get('data-brainatlas-check-toggle').props.onClick(),answer:choice=>get('data-brainatlas-check-choice',choice).props.onClick()};
}
beforeEach(()=>{resetStemLab();vi.useFakeTimers();});
afterEach(()=>{vi.useRealTimers();document.getElementById('brainatlas-plain-check')?.remove();});
describe('Brain Atlas understanding checks',()=>{
  for(const id of ids) it('offers an optional, ungraded check for '+id,()=>{
    const s=session(id);
    expect(s.get('data-brainatlas-plain-check',id)).toBeUndefined();
    s.open();
    expect(s.get('data-brainatlas-check-toggle').props['aria-expanded']).toBe('true');
    expect(s.get('data-brainatlas-plain-check',id)).toBeTruthy();
    const order=s.nodes().filter(el=>el.props?.['data-brainatlas-check-choice']!==undefined).map(el=>el.props['data-brainatlas-check-choice']);
    expect(new Set(order).size).toBe(3);
    expect(s.nodes().filter(el=>el.props?.['data-brainatlas-check-choice']!==undefined).map(el=>el.props['data-brainatlas-check-choice'])).toEqual(order);
    s.answer(1);
    expect(s.get('data-correct','false')).toBeTruthy();
    const feedback=s.nodes().find(el=>el.props?.className==='brainatlas-plain-check-feedback');
    const wrongText=ReactDOMServer.renderToStaticMarkup(feedback);
    expect(wrongText.length).toBeGreaterThan(100);
    s.answer(0); // Answer is locked until retry.
    expect(s.store.toolData.brainAtlas.plainCheckAnswers[id]).toBe(1);
    s.get('data-brainatlas-check-reset').props.onClick();
    s.answer(0);
    expect(s.get('data-correct','true')).toBeTruthy();
    expect(ReactDOMServer.renderToStaticMarkup(s.nodes().find(el=>el.props?.className==='brainatlas-plain-check-feedback'))).not.toBe(wrongText);
    expect(s.html()).toContain('This is practice, not a grade.');
    expect(s.awardXP).not.toHaveBeenCalled();expect(s.callGemini).not.toHaveBeenCalled();
  });
  it('varies correct-answer position across regions',()=>{
    const positions=new Set();
    for(const id of ids){resetStemLab();const s=session(id);s.open();positions.add(s.nodes().filter(el=>el.props?.['data-brainatlas-check-choice']!==undefined).findIndex(el=>el.props['data-brainatlas-check-choice']===0));}
    expect([...positions].sort()).toEqual([0,1,2]);
  });
  it('restores an answer and clears only this region on reset',()=>{
    const s=session('frontal',{plainCheckRegion:'frontal',plainCheckAnswers:{frontal:0,brainstem:2}});
    expect(s.get('data-correct','true')).toBeTruthy();
    s.open();expect(s.get('data-brainatlas-plain-check','frontal')).toBeUndefined();
    s.open();expect(s.get('data-correct','true')).toBeTruthy();
    s.get('data-brainatlas-check-reset').props.onClick();
    expect(s.store.toolData.brainAtlas.plainCheckAnswers).toEqual({brainstem:2});
  });
  it('ignores malformed persisted answers and focuses the opened check',()=>{
    const s=session('frontal',{plainCheckAnswers:{frontal:99}});
    const target=document.createElement('section');target.id='brainatlas-plain-check';target.tabIndex=-1;target.scrollIntoView=vi.fn();document.body.appendChild(target);
    s.open();vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(target);expect(target.scrollIntoView).toHaveBeenCalled();
    expect(s.get('data-correct','false')).toBeUndefined();
    s.answer(2);expect(s.store.toolData.brainAtlas.plainCheckAnswers.frontal).toBe(2);
  });
  it('does not show another region answer after following a related-region link',()=>{
    const s=session();s.open();s.answer(0);
    s.get('data-brainatlas-plain-next','motor_cortex').props.onClick();
    expect(s.get('data-brainatlas-plain-check','motor_cortex')).toBeUndefined();
    s.open();expect(s.get('data-correct','true')).toBeUndefined();
    expect(s.store.toolData.brainAtlas.plainCheckAnswers.frontal).toBe(0);
  });
});
