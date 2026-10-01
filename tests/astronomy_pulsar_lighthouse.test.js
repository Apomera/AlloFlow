import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let model;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); model = window.__alloAstroPure.pulsarLighthouseModel; });
const doc = state => new window.DOMParser().parseFromString(renderTool('astronomy', { astronomy: { tab: 'galaxies', observingList: [], ...state } }), 'text/html');
// Independent construction through a rotation matrix and dot product.
function reference(tilt, observer, width, phase) {
  const a=tilt*Math.PI/180,z=observer*Math.PI/180,p=phase*2*Math.PI;
  const v=[Math.sin(a),0,Math.cos(a)];
  const rotated=[v[0]*Math.cos(p)-v[1]*Math.sin(p),v[0]*Math.sin(p)+v[1]*Math.cos(p),v[2]];
  const o=[Math.sin(z),0,Math.cos(z)],dot=rotated.reduce((s,x,i)=>s+x*o[i],0);
  const angle=Math.acos(Math.min(1,Math.abs(dot)))*180/Math.PI;
  return angle < width-1e-10 ? Math.cos(angle/width*Math.PI/2)**2 : 0;
}
describe('Pulsar beam geometry',()=>{
  it.each([undefined,null,false,true,'',{},[],NaN,Infinity].map(x=>[x]))('restores invalid controls (%s)',value=>{
    const m=model({pulsarTilt:value,pulsarObserver:value,pulsarWidth:value,pulsarPhase:value,pulsarSpin:value});
    expect([m.tilt,m.observer,m.width,m.phase,m.spin.id]).toEqual([45,45,12,0,'b1919']);
  });
  it('bounds finite inputs and accepts numeric strings',()=>{
    const m=model({pulsarTilt:120,pulsarObserver:-1,pulsarWidth:0,pulsarPhase:2});expect([m.tilt,m.observer,m.width,m.phase]).toEqual([90,0,1,1]);
    expect(model({pulsarTilt:'30',pulsarObserver:'180',pulsarWidth:'45',pulsarPhase:'.25'})).toMatchObject({tilt:30,observer:180,width:45,phase:.25});
  });
  it.each([[45,45,12,'one'],[90,90,12,'two'],[30,90,12,'none'],[0,5,12,'steady'],[5,0,12,'steady'],[5,5,12,'continuous']])('classifies tilt %s, observer %s, width %s as %s',(a,z,w,kind)=>{
    expect(model({pulsarTilt:a,pulsarObserver:z,pulsarWidth:w}).kind).toBe(kind);
  });
  it.each([[45,45,12],[90,90,1],[0,5,12],[30,90,45],[20,170,20],[15,10,30]])('matches a rotated-vector reference (%s,%s,%s)',(a,z,w)=>{
    const m=model({pulsarTilt:a,pulsarObserver:z,pulsarWidth:w});
    for(let i=0;i<=100;i++)expect(m.at(i/100).signal).toBeCloseTo(reference(a,z,w,i/100),10);
  });
  it('counts a wrapped endpoint pulse once and two opposite pulses twice',()=>{
    const one=model(),two=model({pulsarTilt:90,pulsarObserver:90});
    expect(one.windowsA).toHaveLength(2);expect(one.windowsB).toEqual([]);expect(two.windowsB).toHaveLength(1);
    expect(two.duty).toBeCloseTo(4*12/360,12);
    expect(two.at(0)).toMatchObject({signalA:1,signalB:0});
    expect(two.at(.5).signalB).toBeCloseTo(1,12);expect(two.at(.25).signal).toBe(0);
  });
  it('analytic visibility fractions match dense numerical angular sampling',()=>{
    for(const [a,z,w]of [[45,45,12],[90,90,12],[10,15,9],[67,104,45],[5,5,12],[0,5,12],[30,90,12]]){
      const m=model({pulsarTilt:a,pulsarObserver:z,pulsarWidth:w}),n=20000;
      let count=0;for(let i=0;i<n;i++)if(reference(a,z,w,(i+.5)/n)>0)count++;
      expect(Math.abs(count/n-m.duty)).toBeLessThan(2/n);
    }
  });
  it('has continuous zero signal at cone edges, including tangency',()=>{
    const m=model(),edge=m.windowsA[0][1];
    expect(m.at(edge).signal).toBeLessThan(1e-20);
    expect(m.at(edge+1e-8).signal).toBe(0);
    expect(m.at(edge-1e-8).signal).toBeLessThan(1e-10);
    const tangent=model({pulsarTilt:30,pulsarObserver:42,pulsarWidth:12});
    expect(tangent.kind).toBe('none');expect(tangent.at(0).signal).toBe(0);
  });
  it('keeps unit vectors, bounded strength and periodic symmetry over extreme geometry',()=>{
    for(const a of [0,1,45,89,90])for(const z of [0,1,45,90,135,179,180])for(const w of [1,12,45]){
      const m=model({pulsarTilt:a,pulsarObserver:z,pulsarWidth:w});
      for(const t of [0,.03,.25,.5,.79,1]){
        const f=m.at(t);expect(Math.hypot(...f.axis)).toBeCloseTo(1,12);
        expect(Number.isFinite(f.signal)).toBe(true);expect(f.signal).toBeGreaterThanOrEqual(0);expect(f.signal).toBeLessThanOrEqual(1);
        expect(f.signal).toBeCloseTo(m.at(1-t).signal,10);
      }
      expect(m.at(0).signal).toBeCloseTo(m.at(1).signal,12);
    }
  });
  it('produces a steady signal for an aligned beam and for an observer on the spin axis',()=>{
    for(const s of [{pulsarTilt:0,pulsarObserver:5},{pulsarTilt:5,pulsarObserver:0},{pulsarTilt:5,pulsarObserver:180}]){
      const m=model(s);expect(m.duty).toBe(1);
      for(const t of [0,.25,.5,.75,1])expect(m.at(t).signal).toBeCloseTo(m.at(0).signal,12);
    }
  });
});
describe('Published spin clocks and UI',()=>{
  it('uses a quoted original interval and a fixed published frequency',()=>{
    const first=model(),fast=model({pulsarSpin:'j1748'});
    expect(first.spin.periodMs).toBe(1337.30);expect(first.spin.frequencyHz*first.spin.periodMs).toBeCloseTo(1000,12);
    expect(fast.spin.frequencyHz).toBe(716);expect(fast.spin.periodMs).toBeCloseTo(1000/716,12);
    expect(first.spin.source).toContain('nasa.gov');expect(fast.spin.source).toBe('https://arxiv.org/abs/astro-ph/0601337');
  });
  it('changes only the physical clock when changing spin example',()=>{
    const state={pulsarTilt:74,pulsarObserver:103,pulsarWidth:39,pulsarPhase:.37};
    const a=model(state),b=model({...state,pulsarSpin:'j1748'});
    expect(b.current.signal).toBe(a.current.signal);expect(b.current.axis).toEqual(a.current.axis);expect(b.duty).toBe(a.duty);
    expect(a.current.timeMs/a.spin.periodMs).toBeCloseTo(.37,12);expect(b.current.timeMs/b.spin.periodMs).toBeCloseTo(.37,12);
  });
  it('recovers malformed state without invalid SVG coordinates or forged values',()=>{
    const dom=doc({pulsarTilt:{x:1},pulsarObserver:Infinity,pulsarWidth:[],pulsarPhase:true,pulsarSpin:{x:1},pulsarPlaying:'true'});
    const lab=dom.querySelector('#astronomy-pulsar-lab');expect(lab.textContent).not.toMatch(/NaN|Infinity|\[object Object\]/);
    for(const node of lab.querySelectorAll('svg *'))for(const attr of node.attributes)expect(attr.value).not.toMatch(/NaN|Infinity|\[object Object\]/);
    expect(lab.querySelector('#astr-pulsarTilt').value).toBe('45');expect(lab.querySelector('[data-pulsar-period]').dataset.pulsarPeriod).toBe('1337.3');
  });
  it('narrates projection, toy brightness and published data boundaries',()=>{
    const lab=doc({}).querySelector('#astronomy-pulsar-lab');
    expect(lab.textContent).toContain('separated in depth');expect(doc({pulsarTilt:90,pulsarObserver:90}).querySelector('#astronomy-pulsar-status').textContent).toContain('same pulse wrapping around');expect(lab.textContent).toContain('chosen smooth profile');
    expect(lab.textContent).toContain('not measured angles');expect(lab.textContent).toContain('not a current timing solution');
    expect(lab.querySelector('svg[role="img"]').getAttribute('aria-labelledby')).toBe('astronomy-pulsar-title astronomy-pulsar-desc');
    expect(lab.querySelector('svg[role="slider"]').getAttribute('aria-describedby')).toBe('astronomy-pulsar-help');
  });
  it('gives native controls names and touch-sized interaction targets',()=>{
    const lab=doc({}).querySelector('#astronomy-pulsar-lab');
    for(const input of lab.querySelectorAll('input')){expect(lab.querySelector('label[for="'+input.id+'"]')).toBeTruthy();expect(input.style.minHeight).toBe('44px');}
    for(const button of lab.querySelectorAll('button'))expect(button.style.minHeight).toBe('44px');
    expect(lab.querySelector('summary').style.minHeight).toBe('44px');
  });
});
