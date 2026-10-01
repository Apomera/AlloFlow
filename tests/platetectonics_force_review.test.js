import fs from 'node:fs';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
let React, ReactDOM;
const mounted=[];
beforeAll(()=>{
  window.StemLab={registerTool(){},makeBayViewer:()=>({})};
  window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createLinearGradient:()=>({addColorStop(){}}),measureText:()=>({width:40})},{get:(a,k)=>k in a?a[k]:()=>{}});
  window.ResizeObserver=globalThis.ResizeObserver=class{observe(){}disconnect(){}};
  window.requestAnimationFrame=globalThis.requestAnimationFrame=()=>1;
  window.cancelAnimationFrame=globalThis.cancelAnimationFrame=()=>{};
  for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','stem_lab/stem_tool_platetectonics.js'])(0,eval)(fs.readFileSync(file,'utf8'));
  React=window.React;ReactDOM=window.ReactDOM;
});
afterEach(()=>{while(mounted.length){const host=mounted.pop();ReactDOM.unmountComponentAtNode(host);host.remove();}});
function mount(component,data,extra={}){const host=document.createElement('div');document.body.appendChild(host);mounted.push(host);ReactDOM.render(React.createElement(component,{data,saved:data.ptForce,t:(_,f)=>f,...extra}),host);return host;}
function draft(kind){const f=window.__alloPtForces,w=f.make();let state={pending:null,choice:null,watch:null,probes:[],probeKm:'400',probeSide:'A'};
  if(kind==='prediction'){state.pending='cut';state.choice=2;}
  if(kind==='watch'){const v=w.vA;f.continent(w);state.watch={kind:'continent',choice:1,vBefore:v,vAfter:w.vA,t0:0};for(let i=0;i<20;i++)f.step(w,.05);}
  if(kind==='probe')state.probes=[{side:'A',dist:400,age:8.9,t:0}];
  return window.__alloPtForceDraft.capture(w,state);
}
const completed={a:'cut',vBefore:8.5,vAfter:1.25,t:3,choice:1,matched:true};
describe('Force review separates saved activity from completed outcomes',()=>{
  it('identifies an unfinished prediction without treating it as an observation',()=>{
    const host=mount(window.AlloTectonicsTeacherGuide,{ptForce:{draft:draft('prediction'),preds:[]}});
    const card=host.querySelector('[data-pt-teacher-card="forces"]');
    expect(card.querySelector('[data-pt-teacher-force-draft]').dataset.ptTeacherForceDraft).toBe('prediction');
    expect(card.textContent).toContain('this attempt has no observed outcome yet');
    expect(card.textContent).toContain('Completed observations retained: 0');
  });
  it('keeps an unfinished retry separate from its earlier completed evidence',()=>{
    const host=mount(window.AlloTectonicsTeacherGuide,{ptForce:{draft:draft('watch'),observations:[completed]}});
    const card=host.querySelector('[data-pt-teacher-card="forces"]');
    expect(card.querySelector('[data-pt-teacher-force-draft]').dataset.ptTeacherForceDraft).toBe('observation');
    expect(card.textContent).toContain('Saved test: A continent reaches the trench');
    expect(card.textContent).toContain('unfinished at model time 1.0 million years');
    expect(card.textContent).toContain('Completed observations retained: 1');
    expect(card.textContent).toContain('8.5 → 1.3 cm/yr');
  });
  it('describes probe-only exploration without fabricating a completed force test',()=>{
    const host=mount(window.AlloTectonicsTeacherGuide,{ptForce:{draft:draft('probe')}});
    const card=host.querySelector('[data-pt-teacher-card="forces"]');
    expect(card.querySelector('[data-pt-teacher-force-draft]').dataset.ptTeacherForceDraft).toBe('exploration');
    expect(card.textContent).toContain('Retained sea-floor measurements: 1');
    expect(card.textContent).toContain('separate from completed force-test outcomes');
    expect(card.textContent).toContain('Completed observations retained: 0');
  });
  it('rejects malformed saved exploration while retaining valid completed observations',()=>{
    const invalid=draft('watch');invalid.world.S=Infinity;
    const host=mount(window.AlloTectonicsTeacherGuide,{ptForce:{draft:invalid,observations:[completed]}});
    expect(host.querySelector('[data-pt-teacher-force-draft]')).toBeNull();
    expect(host.querySelector('[data-pt-teacher-card="forces"]').textContent).toContain('Completed observations retained: 1');
  });
  it('filters a malformed newer outcome so it cannot overwrite the last valid result',()=>{
    const host=mount(window.AlloTectonicsForces,{ptForce:{observations:[completed,{a:'cut',vBefore:1,vAfter:9,t:7}]}});
    const card=host.querySelector('[data-pt-forces-observation="cut"]');
    expect(card.querySelector('[data-pt-forces-before]').dataset.ptForcesBefore).toBe('8.5');
    expect(card.querySelector('[data-pt-forces-after]').dataset.ptForcesAfter).toBe('1.25');
    expect(card.textContent).toContain('Outcome recorded at model time 3.0 million years');
    expect(card.querySelector('[data-pt-forces-recorded-match]').dataset.ptForcesRecordedMatch).toBe('true');
  });
  it('uses the actual saved prediction choice and accepts older results without invented metadata',()=>{
    const host=mount(window.AlloTectonicsForces,{ptForce:{observations:[{...completed,choice:0,matched:true},{a:'continent',vBefore:7.5,vAfter:1.1,mountainKm:3.3,t:Infinity}]}});
    const cut=host.querySelector('[data-pt-forces-observation="cut"]'),continent=host.querySelector('[data-pt-forces-observation="continent"]');
    expect(cut.querySelector('[data-pt-forces-recorded-match]').dataset.ptForcesRecordedMatch).toBe('false');
    expect(cut.textContent).toContain('differed from your prediction');
    expect(continent.querySelector('[data-pt-forces-recorded-time]')).toBeNull();
    expect(continent.querySelector('[data-pt-forces-recorded-match]')).toBeNull();
    expect(continent.textContent).toContain('3.3 km');
  });
  it('opens teacher review without writing, rewarding or changing the saved investigation',()=>{
    const data={ptForce:{draft:draft('watch'),observations:[completed]}},original=JSON.stringify(data),onRecord=vi.fn(),awardXP=vi.fn(),beep=vi.fn();
    const host=mount(window.AlloTectonicsTeacherGuide,data,{onRecord,awardXP,beep});for(const node of host.querySelectorAll('summary'))node.click();
    expect(JSON.stringify(data)).toBe(original);expect(onRecord).not.toHaveBeenCalled();expect(awardXP).not.toHaveBeenCalled();expect(beep).not.toHaveBeenCalled();
  });
});
