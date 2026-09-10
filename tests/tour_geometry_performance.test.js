import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
const sources = ['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'].map(file => readFileSync(file,'utf8'));
function blocks(source) {
  const slice = (a,b) => { const from=source.indexOf(a),to=source.indexOf(b,from); if(from<0||to<0)throw Error('Missing tour block'); return source.slice(from,to); };
  return { metrics:slice('  const _findTourStepIndex =','  const ensureToolVisible ='), effect:slice('  // TOUR_GEOMETRY_TRACKING_START','  // TOUR_GEOMETRY_TRACKING_END') };
}
let cleanup;
afterEach(() => { cleanup?.(); cleanup=null; vi.restoreAllMocks(); vi.useRealTimers(); });
function fixture({ active=true, spotlight=null, visible=true }={}) {
  vi.useFakeTimers();
  let frameId=0, rect=null, bot=null, rectCommits=0, botCommits=0;
  const frames=new Map();
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{frames.set(++frameId,fn);return frameId;});
  vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));
  const geometry={top:80,left:20,right:200,bottom:180,width:180,height:100};
  const target={scrollIntoView:vi.fn(),getBoundingClientRect:vi.fn(()=>({...geometry}))};
  const onEnter=vi.fn(), moveTo=vi.fn(), context={current:{}}, setStep=vi.fn();
  const ctx={runTour:active,spotlightMessage:spotlight,tourSteps:[{id:'target',onEnter}],tourStep:0,customTourSteps:null,
    _tourRunContextRef:context,_tourTravelDirectionRef:{current:1},_resolveTourEl:()=>visible?target:null,DOM_TO_TOOL_ID_MAP:{},
    alloBotRef:{current:{moveTo}},setTourStep:setStep,setRunTour:vi.fn(),setCustomTourSteps:vi.fn(),
    setTourRect:next=>{const value=typeof next==='function'?next(rect):next;if(value!==rect)rectCommits++;rect=value;},
    setBotSpotlightPos:next=>{const value=typeof next==='function'?next(bot):next;if(value!==bot)botCommits++;bot=value;}};
  const {metrics,effect}=blocks(sources[0]);
  const api=Function('ctx',`const {${Object.keys(ctx).join(',')}}=ctx; const useCallback=fn=>fn; let dispose; const useEffect=fn=>{dispose=fn();}; ${metrics}\n${effect}\nreturn {measure:updateTourMetrics,dispose};`)(ctx);
  cleanup=api.dispose;
  return {...api,target,onEnter,moveTo,geometry,frames,context,setStep,ctx,
    frame:()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());},
    state:()=>({rect,bot,rectCommits,botCommits})};
}
describe('guided tour geometry scheduling',()=>{
  it('coalesces scroll and resize bursts and never re-enters or re-scrolls the step',()=>{
    const h=fixture(); vi.advanceTimersByTime(600);
    expect(h.onEnter).toHaveBeenCalledTimes(1); expect(h.target.scrollIntoView).toHaveBeenCalledTimes(1);
    for(let i=0;i<100;i++){window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('scroll'));}
    expect(h.frames.size).toBe(1); expect(h.target.getBoundingClientRect).toHaveBeenCalledTimes(1);
    h.geometry.top=95;h.geometry.bottom=195;h.frame();
    expect(h.target.getBoundingClientRect).toHaveBeenCalledTimes(2);expect(h.state().rect.top).toBe(95);
    vi.advanceTimersByTime(1000);
    expect(h.onEnter).toHaveBeenCalledTimes(1);expect(h.target.scrollIntoView).toHaveBeenCalledTimes(1);
  });
  it('retains state identity when geometry is unchanged',()=>{
    const h=fixture();vi.advanceTimersByTime(600);const prior=h.state();
    window.dispatchEvent(new Event('scroll'));h.frame();
    expect(h.state()).toEqual(prior);expect(h.state().rect).toBe(prior.rect);expect(h.state().bot).toBe(prior.bot);
  });
  it('cancels both the entry timer and pending frame on cleanup',()=>{
    const h=fixture();window.dispatchEvent(new Event('resize'));h.dispose();cleanup=null;
    expect(h.frames.size).toBe(0);vi.runAllTimers();expect(h.target.getBoundingClientRect).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('scroll'));expect(h.frames.size).toBe(0);
  });
  it.each([{active:false},{spotlight:'help message'}])('does not track geometry while inactive: %j',options=>{
    const h=fixture(options);window.dispatchEvent(new Event('scroll'));window.dispatchEvent(new Event('resize'));
    expect(h.frames.size).toBe(0);vi.runAllTimers();expect(h.onEnter).not.toHaveBeenCalled();expect(h.target.getBoundingClientRect).not.toHaveBeenCalled();
  });
  it('does not skip a temporarily missing target during layout tracking',()=>{
    const h=fixture({visible:false});h.measure(false);expect(h.setStep).not.toHaveBeenCalled();expect(h.ctx.setRunTour).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);expect(h.ctx.setRunTour).toHaveBeenCalledWith(false);
  });
  it('preserves the stale-entry guard when the tour context changes',()=>{
    const h=fixture();h.context.current={};vi.advanceTimersByTime(600);expect(h.target.getBoundingClientRect).not.toHaveBeenCalled();
  });
  it('keeps the three shell implementations identical',()=>{
    const reference=blocks(sources[0]);for(const source of sources.slice(1))expect(blocks(source)).toEqual(reference);
  });
});
