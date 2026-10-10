import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),S=require('../stem_lab/kitchen_studio/recipe_lab_lens_scan.js');
const p=(x,y=0,unit=1,inside=true)=>({x,y,unit,inside});
function frozen(value){if(value&&typeof value==='object'){Object.values(value).forEach(frozen);Object.freeze(value);}return value;}
function scan(unit=1,index=0){let t=S.start(p(100,150,unit),index);[12,24,34].forEach(x=>{t=S.move(t,p(100+x*unit,150,unit),index);});return t;}
describe('A food lens scan recognizes observation without cooking evidence',()=>{
  it('accepts index zero and completes a deliberate on-food scan at its actual final piece',()=>{
    const t=scan();expect(S.complete(t,0)).toBe(true);expect(t.index).toBe(0);expect(t.travel).toBe(34);expect(t.reach).toBe(34);expect(S.progress(t)).toBe(1);
  });
  it('rejects a tap and repeated stationary samples',()=>{
    let t=S.start(p(0),0);for(let i=0;i<30;i++)t=S.move(t,p(0),0);expect(S.complete(t,0)).toBe(false);expect(S.progress(t)).toBe(0);expect(t.samples).toBe(0);
  });
  it('does not count a single press-to-release displacement as an observed scan',()=>{
    const t=S.move(S.start(p(0),0),p(34),0);expect(t.reach).toBe(34);expect(S.complete(t,0)).toBe(false);expect(S.progress(t)).toBe(.5);
  });
  it('requires at least 32 normalized pixels of reach',()=>{
    let t=S.start(p(0),0);t=S.move(t,p(15),0);t=S.move(t,p(31.9),0);expect(S.complete(t,0)).toBe(false);t=S.move(t,p(32),0);expect(S.complete(t,0)).toBe(true);
  });
  it.each([.5,1,2])('normalizes a scan with the fixed original unit %s',unit=>{
    const t=scan(unit);expect(S.complete(t,0)).toBe(true);expect(t.reach).toBe(34);expect(S.progress(t)).toBe(1);
  });
  it('keeps the original unit when subsequent samples report a different positive unit',()=>{
    let t=S.start(p(0,0,2),0);t=S.move(t,p(24,0,100),0);t=S.move(t,p(64,0,.1),0);expect(t.unit).toBe(2);expect(t.reach).toBe(32);expect(S.complete(t,0)).toBe(true);
  });
  it('rejects jitter oscillation despite a large cumulative path',()=>{
    let t=S.start(p(0),0);for(let i=0;i<50;i++)t=S.move(t,p(i%2?0:6),0);expect(t.travel).toBeGreaterThan(200);expect(t.reach).toBe(6);expect(S.complete(t,0)).toBe(false);expect(S.progress(t)).toBeLessThan(.2);
  });
  it('rejects tiny jitter whose cumulative travel exceeds the threshold',()=>{
    let t=S.start(p(0),0);for(let i=0;i<100;i++)t=S.move(t,p(i%2?0:.5),0);expect(t.travel).toBeGreaterThan(32);expect(t.samples).toBe(0);expect(S.complete(t,0)).toBe(false);expect(S.progress(t)).toBe(0);
  });
  it('recognizes diagonal deliberate movement by geometric distance',()=>{
    let t=S.start(p(0),0);t=S.move(t,p(12,12),0);t=S.move(t,p(24,24),0);expect(t.reach).toBeCloseTo(Math.hypot(24,24));expect(S.complete(t,0)).toBe(true);
  });
  it('allows a completed scan to return toward its origin while staying on food',()=>{
    let t=scan();t=S.move(t,p(110,150),0);expect(S.complete(t,0)).toBe(true);expect(t.reach).toBe(34);
  });
  it('does not bridge off-pan travel or count the re-entry jump',()=>{
    let t=S.start(p(0),0);t=S.move(t,p(20),0);t=S.move(t,p(100,0,1,false),null);t=S.move(t,p(200),1);expect(t.index).toBe(1);expect(t.reach).toBe(0);expect(t.travel).toBe(0);expect(t.samples).toBe(0);expect(S.complete(t,1)).toBe(false);
  });
  it('does not retain completion after leaving the pan or merely touching a piece on re-entry',()=>{
    let t=scan();t=S.move(t,p(140,150,1,false),null);expect(S.complete(t,null)).toBe(false);expect(S.progress(t)).toBe(0);t=S.move(t,p(160,150),1);expect(S.complete(t,1)).toBe(false);expect(S.progress(t)).toBe(0);
  });
  it('can begin a fresh valid scan after an ordinary off-pan gap',()=>{
    let t=scan();t=S.move(t,p(150,150,1,false),null);t=S.move(t,p(200,150),2);t=S.move(t,p(216,150),2);t=S.move(t,p(234,150),2);expect(S.complete(t,2)).toBe(true);expect(t.travel).toBe(34);
  });
  it('crosses narrow pieces and inside-pan gaps without requiring a 32-pixel path on one piece',()=>{
    let t=S.start(p(0),0);t=S.move(t,p(8),0);t=S.move(t,p(20),null);t=S.move(t,p(34),1);expect(t.reach).toBe(34);expect(t.samples).toBe(2);expect(S.complete(t,1)).toBe(true);
  });
  it('never counts inside-pan gap samples as food movements',()=>{
    let t=S.start(p(0),0);for(let i=1;i<=4;i++)t=S.move(t,p(i*10),null);expect(t.reach).toBe(40);expect(t.samples).toBe(0);expect(S.progress(t)).toBe(0);expect(S.complete(t,null)).toBe(false);
  });
  it('keeps a completed preview through a pan gap but requires a clean final food hit',()=>{
    let t=scan();t=S.move(t,p(140,150),null);expect(S.progress(t)).toBe(1);expect(S.complete(t,0)).toBe(false);expect(t.index).toBeNull();t=S.move(t,p(144,150),1);expect(S.complete(t,1)).toBe(true);
  });
  it('does not use a stationary re-entry food hit as a meaningful movement sample',()=>{
    let t=S.start(p(0),0);t=S.move(t,p(16),null);t=S.move(t,p(16),1);t=S.move(t,p(34),1);expect(t.samples).toBe(1);expect(S.complete(t,1)).toBe(false);
  });
  it('waits for an actual food hit to anchor a new run after leaving the pan',()=>{
    let t=scan();t=S.move(t,p(150,150,1,false),null);t=S.move(t,p(200,150),null);t=S.move(t,p(230,150),null);expect(t.active).toBe(false);expect(t.reach).toBe(0);t=S.move(t,p(260,150),2);expect(t.anchor.x).toBe(260);expect(t.reach).toBe(0);expect(t.samples).toBe(0);expect(S.complete(t,2)).toBe(false);
  });
  it('ignores a claimed food index outside the pan region',()=>{
    const t=S.move(scan(),p(140,150,1,false),1);expect(t.index).toBeNull();expect(t.onFood).toBe(false);expect(t.active).toBe(false);expect(S.complete(t,1)).toBe(false);
  });
  it('allows adjacent actual food indices during a continuous scan',()=>{
    let t=S.start(p(0),0);t=S.move(t,p(12),0);t=S.move(t,p(24),1);t=S.move(t,p(34),2);expect(S.complete(t,2)).toBe(true);expect(S.complete(t,1)).toBe(false);expect(t.index).toBe(2);
  });
  it('requires the actual final food hit to match the tracked piece',()=>{
    const t=scan(1,3);expect(S.complete(t,3)).toBe(true);expect(S.complete(t,2)).toBe(false);expect(S.complete(t,null)).toBe(false);expect(S.complete(t,undefined)).toBe(false);
  });
  it('cannot earn a scan by changing indices without meaningful movement',()=>{
    let t=S.start(p(0),0);for(let i=1;i<20;i++)t=S.move(t,p(i%2),i);expect(S.complete(t,19)).toBe(false);expect(t.reach).toBe(1);
  });
  it('invalidates a huge on-food teleport and cannot recover it within the same attempt',()=>{
    let t=S.start(p(0),0);t=S.move(t,p(49),1);expect(t.invalid).toBe(true);expect(S.progress(t)).toBe(0);t=S.move(t,p(65),1);t=S.move(t,p(82),1);expect(S.complete(t,1)).toBe(false);
  });
  it('normalizes the teleport limit with the original canvas scale',()=>{
    const t=S.move(S.start(p(0,0,.5),0),p(25,0,100),0);expect(t.invalid).toBe(true);expect(S.complete(t,0)).toBe(false);
  });
  it('rejects an oversized final movement even after a valid preview',()=>{
    const t=S.move(scan(),p(200,150),0);expect(t.invalid).toBe(true);expect(S.complete(t,0)).toBe(false);
  });
  it.each([null,p(NaN),p(0,Infinity),p(0,0,0),p(0,0,-1),p(0,0,Infinity),p(0,0,1,false),{x:0,y:0,unit:1}])('rejects invalid starting coordinates and pan region %j',input=>{
    expect(S.start(input,0)).toBeNull();
  });
  it.each([null,-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('rejects invalid starting index %s',index=>{
    expect(S.start(p(0),index)).toBeNull();
  });
  it('invalidates non-finite later coordinates without keeping a completion preview',()=>{
    const t=S.move(scan(),p(NaN),0);expect(t.invalid).toBe(true);expect(S.complete(t,0)).toBe(false);expect(S.progress(t)).toBe(0);expect(Number.isFinite(t.last.x)).toBe(true);
  });
  it('invalidates a malformed later index or scale',()=>{
    expect(S.move(scan(),p(135,150),-1).invalid).toBe(true);expect(S.move(scan(),p(135,150,0),0).invalid).toBe(true);
  });
  it('returns conservative fallbacks for absent or malformed traces',()=>{
    expect(S.move(null,p(0),0)).toBeNull();expect(S.complete(null,0)).toBe(false);expect(S.progress(null)).toBe(0);expect(S.progress({reach:Infinity})).toBe(0);
    expect(S.complete({...scan(),travel:Infinity},0)).toBe(false);expect(S.move({...scan(),unit:0},p(0),0)).toBeNull();
  });
  it('leaves deeply frozen input samples and traces unchanged',()=>{
    const initial=frozen(p(10,20,2)),started=S.start(initial,0),trace=frozen(started),sample=frozen(p(34,20,2)),before=JSON.stringify({initial,trace,sample}),next=S.move(trace,sample,1);
    expect(JSON.stringify({initial,trace,sample})).toBe(before);expect(next).not.toBe(trace);expect(next.last).not.toBe(trace.last);expect(next.anchor).not.toBe(trace.anchor);
    S.complete(trace,0);S.progress(trace);expect(JSON.stringify({initial,trace,sample})).toBe(before);
  });
  it('owns coordinate copies rather than retaining mutable caller samples',()=>{
    const original=p(0),t=S.start(original,0),nextSample=p(12),next=S.move(t,nextSample,0);original.x=500;nextSample.x=900;expect(t.last.x).toBe(0);expect(t.anchor.x).toBe(0);expect(next.last.x).toBe(12);expect(next.anchor.x).toBe(0);
  });
  it('keeps progress finite and bounded on long valid paths',()=>{
    let t=S.start(p(0),0);for(let i=1;i<20;i++)t=S.move(t,p(i*10),0);expect(S.progress(t)).toBe(1);expect(S.complete(t,0)).toBe(true);expect(Number.isFinite(S.progress(t))).toBe(true);
  });
});
