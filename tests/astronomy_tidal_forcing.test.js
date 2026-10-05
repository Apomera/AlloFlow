import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const OUT='reports/sky-lab-tidal-forcing-2026-10-01';
let model;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_astronomy.js','astronomy');model=window.__alloAstroPure.tidalForcingModel;});
const state=(phase=0,hours=0,distance=384400,sun=true)=>({tidePhaseStart:phase,tideHours:hours,tideDistanceKm:distance,tideIncludeSun:sun});
const doc=saved=>new window.DOMParser().parseFromString(renderTool('astronomy',{astronomy:{tab:'moon',observingList:[],...saved}}),'text/html');

describe('Published tidal inputs',()=>{
 it('pins four primary source snapshots with normalized checksums',()=>{
  const records=JSON.parse(readFileSync(OUT+'/download-provenance.json','utf8'));expect(records).toHaveLength(4);
  for(const p of records){expect(p.status).toBe(200);expect(createHash('sha256').update(readFileSync(OUT+'/'+p.file,'utf8').replace(/\r\n/g,'\n')).digest('hex')).toBe(p.normalizedSha256);}
 });
 it('uses JPL DE440 parameters with consistent cubic-kilometre units',()=>{
  const m=model({}),html=readFileSync(OUT+'/jpl-parameters.html','utf8');
  expect(html).toContain('4902.800118');expect(html).toContain('1.32712440041279419');
  expect(m.reference.moonGMKm3s2).toBe(4902.800118);
  expect(m.reference.sunGMKm3s2).toBe(Number('1.32712440041279419e20')/1e9);
  expect(m.sunStrength).toBeCloseTo(m.reference.sunGMKm3s2/m.reference.moonGMKm3s2*(384400/149597870.7)**3,14);
  expect(m.sunStrength).toBeGreaterThan(.45);expect(m.sunStrength).toBeLessThan(.47);
 });
 it('retains the NASA mean distance definitions rather than extreme orbit claims',()=>{
  const m=model({}),p=JSON.parse(readFileSync(OUT+'/data-provenance.json','utf8'));
  expect([m.reference.meanPerigeeKm,m.reference.meanMoonDistanceKm,m.reference.meanApogeeKm]).toEqual([363300,384400,405500]);
  expect(p.inputNotes.lunarDistances).toContain('not the full range');expect(p.inputNotes.synodicPeriod).toContain('rounds');
  expect(m.reference.sunDistanceKm).toBe(149597870.7);expect(m.reference.synodicDays).toBe(29.53059);
 });
 it('returns independent reference objects',()=>{
  const first=model({});first.reference.moonGMKm3s2=0;first.points[0].total=99;first.surface[0].total=99;
  expect(model({}).reference.moonGMKm3s2).toBe(4902.800118);expect(model({}).current.total).toBeLessThan(2);
 });
});

describe('Tidal harmonics and linked geometry',()=>{
 it.each([0,.5,1])('reinforces lunar and solar terms at starting phase %s',phase=>{
  const m=model(state(phase));expect(m.regime).toBe('spring');expect(m.current.amplitude).toBeCloseTo(m.moonStrength+m.sunStrength,13);
  expect(m.current.total).toBeCloseTo(m.current.amplitude,13);
 });
 it.each([.25,.75])('partly cancels at quarter phase %s',phase=>{
  const m=model(state(phase));expect(m.regime).toBe('neap');expect(m.current.amplitude).toBeCloseTo(m.moonStrength-m.sunStrength,13);
  expect(m.current.total).toBeCloseTo(-m.current.amplitude,13);expect(m.current.amplitude).toBeGreaterThan(0);
 });
 it.each([[0,0],[.25,.5],[.5,1],[.75,.5]])('shows Earth-view illumination for phase %s',(phase,fraction)=>{
  expect(model(state(phase)).illumination).toBeCloseTo(fraction,13);
 });
 it('uses inverse-cube lunar forcing while solar forcing is independent of lunar distance',()=>{
  const near=model(state(0,0,363300)),mean=model({}),far=model(state(0,0,405500));
  expect(near.moonStrength/far.moonStrength).toBeCloseTo((405500/363300)**3,13);
  expect(near.moonStrength).toBeGreaterThan(mean.moonStrength);expect(far.moonStrength).toBeLessThan(mean.moonStrength);expect(mean.moonStrength).toBe(1);
  expect(near.sunStrength).toBe(far.sunStrength);expect(near.current.amplitude).toBeGreaterThan(far.current.amplitude);
 });
 it('keeps different solar and lunar periods and advances the Moon over 48 hours',()=>{
  const m=model(state(.2,48));
  const lunarDay=24/(1-1/29.53059);
  expect(m.lunarDayHours).toBeCloseTo(lunarDay,13);expect(m.moonHalfPeriodHours).toBeCloseTo(lunarDay/2,13);
  expect(m.moonHalfPeriodHours).toBeGreaterThan(12.4);expect(m.moonHalfPeriodHours).toBeLessThan(12.5);
  expect(m.current.phase).toBeCloseTo(.2+2/29.53059,13);expect(m.current.observerAngle).toBeCloseTo(4*Math.PI,13);
  expect(model(state(0,lunarDay/2,384400,false)).current.total).toBeCloseTo(1,13);
  expect(model(state(0,12)).current.sun).toBeCloseTo(m.sunStrength,13);
 });
 it('conserves the two contributions in all plotted time and spatial samples',()=>{
  const m=model(state(.123,23.456,363300));
  expect(m.points).toHaveLength(193);expect(m.points[0].hours).toBe(0);expect(m.points.at(-1).hours).toBe(48);
  expect(m.surface).toHaveLength(181);
  for(const p of [...m.points,...m.surface])expect(p.total).toBeCloseTo(p.moon+p.sun,14);
  const p=m.current,theta=p.observerAngle;
  expect(p.total).toBeCloseTo(m.moonStrength*Math.cos(2*(theta-p.angle))+m.sunStrength*Math.cos(2*theta),13);
 });
 it('gives the same two-lobe pattern at opposite spatial angles',()=>{
  const m=model(state(.137,8));
  for(let i=0;i<=90;i++)expect(m.surface[i].total).toBeCloseTo(m.surface[i+90].total,12);
  const angle=m.current.bulgeAngle,q=m.moonStrength*Math.cos(2*(angle-m.current.angle))+m.sunStrength*Math.cos(2*angle);
  expect(q).toBeCloseTo(m.current.amplitude,12);
 });
 it('omits the solar contribution throughout a Moon-only experiment',()=>{
  const m=model(state(.25,7,405500,false));expect(m.regime).toBe('moonOnly');expect(m.sunStrength).toBe(0);
  expect(m.current.amplitude).toBeCloseTo(m.moonStrength,13);
  for(const p of [...m.points,...m.surface]){expect(Math.abs(p.sun)).toBe(0);expect(p.total).toBe(p.moon);}
 });
 it('keeps all permitted cases inside a fixed scale and exaggerated shapes outside Earth',()=>{
  for(const phase of[0,.125,.25,.5,.75,1])for(const hours of[0,24,48])for(const distance of[363300,405500]){
   const m=model(state(phase,hours,distance));expect(m.plotLimit).toBe(1.8);
   for(const p of [...m.points,...m.surface]){
    for(const field of['moon','sun','total']){expect(Number.isFinite(p[field])).toBe(true);expect(Math.abs(p[field])).toBeLessThan(1.8);expect(55+10*p[field]).toBeGreaterThan(37);}
   }
  }
 });
});

describe('Saved input recovery and clear UI semantics',()=>{
 it.each([null,true,false,[],{},'', ' ', 'bad',NaN,Infinity,-Infinity])('recovers malformed numeric scalars %j',value=>{
  const m=model({tidePhaseStart:value,tideHours:value,tideDistanceKm:value});
  expect([m.phaseStart,m.hours,m.distanceKm]).toEqual([0,0,384400]);
 });
 it('accepts finite numeric strings and clamps only numeric outliers',()=>{
  const m=model({tidePhaseStart:'.25',tideHours:'12.345',tideDistanceKm:'363300'});
  expect([m.phaseStart,m.hours,m.distanceKm]).toEqual([.25,12.345,363300]);
  expect([model(state(-1,-1,0)).phaseStart,model(state(-1,-1,0)).hours,model(state(-1,-1,0)).distanceKm]).toEqual([0,0,363300]);
  const hi=model(state(9,99,999999));expect([hi.phaseStart,hi.hours,hi.distanceKm]).toEqual([1,48,405500]);
 });
 it('requires a boolean solar toggle and leaves saved investigations unchanged',()=>{
  const saved={...state(.25,8,363300,false),moonAgeDays:4,hzDistanceAu:2,hrHunt:{hypothesis:'Keep me'}},before=JSON.stringify(saved);
  model(saved);expect(JSON.stringify(saved)).toBe(before);expect(model(saved).includeSun).toBe(false);
  for(const invalid of[null,0,1,'false',[],{}])expect(model({tideIncludeSun:invalid}).includeSun).toBe(true);
 });
 it('exposes three labeled native sliders, a graph slider and a live alignment status',()=>{
  const root=doc(state(.25)).querySelector('#astronomy-tidal-forcing-lab');
  expect(root.querySelectorAll('input[type="range"][step="any"]')).toHaveLength(3);
  for(const n of root.querySelectorAll('input')){expect(root.querySelector('label[for="'+n.id+'"]')).toBeTruthy();expect(n.getAttribute('aria-valuetext')).toBeTruthy();}
  const chart=root.querySelector('#astronomy-tf-chart');expect(chart.getAttribute('role')).toBe('slider');expect(chart.getAttribute('tabindex')).toBe('0');expect(chart.getAttribute('aria-valuemax')).toBe('48');
  expect(root.querySelector('[role="status"]').getAttribute('data-regime')).toBe('neap');
 });
 it('links metric and selected chart values to the same evaluated model',()=>{
  const s=state(.137,23.456,363300),m=model(s),root=doc(s).querySelector('#astronomy-tidal-forcing-lab');
  for(const el of root.querySelectorAll('[data-tf-metric]')){
   const k=el.getAttribute('data-tf-metric');expect(Number(el.getAttribute('data-value'))).toBe(k==='amplitude'?m.current.amplitude:m[k]);
  }
  const selected=root.querySelector('[data-tf-selected]');expect(Number(selected.getAttribute('data-hours'))).toBe(m.hours);expect(Number(selected.getAttribute('data-value'))).toBe(m.current.total);
 });
 it('provides semantic published inputs, primary sources and clear limits',()=>{
  const root=doc({}).querySelector('#astronomy-tidal-forcing-lab');
  expect(root.querySelectorAll('thead th[scope="col"]')).toHaveLength(2);expect(root.querySelectorAll('tbody th[scope="row"]')).toHaveLength(6);
  expect(root.textContent).toContain('Both are converted to km³/s²');expect(root.textContent).toContain('they do not show local sea level');
  expect(root.textContent).toContain('Inclination, eccentricity');expect(root.textContent).toContain('fixed vertical scale');
  expect(root.querySelectorAll('details a')).toHaveLength(4);expect(root.querySelector('a[href="https://tidesandcurrents.noaa.gov/map/"]')).toBeTruthy();
  const reset=Array.from(root.querySelectorAll('button')).find(b=>b.textContent==='Reset tide explorer');expect(reset.getAttribute('aria-pressed')).toBeNull();
 });
 it('preserves the original tide topics and corrects the universal two-tides claim',()=>{
  const page=doc({});expect(page.body.textContent).toContain('two unequal');expect(page.body.textContent).not.toContain('every point on the equator passes through two tidal highs');
  expect(page.querySelector('a[href="#astronomy-tidal-forcing-lab"]')).toBeTruthy();
  const topics=Array.from(page.querySelectorAll('button')).map(b=>b.textContent.trim());
  for(const name of['Why TWO tides per day','Spring vs neap tides','Tidal locking','The Moon is leaving','Tides on other worlds'])expect(topics).toContain(name);
 });
});

describe('Offscreen Moon GPU work',()=>{
 const source=readFileSync('stem_lab/stem_tool_astronomy.js','utf8'),start=source.indexOf('    function frame() {',source.indexOf('  var AstroMoonGL'));
 const code=source.slice(start,source.indexOf('    function build(THREE, host)',start)).trim();
 function run(options={}){
  let renders=0,scheduled=0,updates=[];
  const rectangle={width:200,height:100,top:100,bottom:200,left:100,right:300,...options.rectangle};
  const S={renderer:{domElement:{isConnected:options.connected!==false,getBoundingClientRect:()=>rectangle},render:()=>{renders++;}},contextLost:false};
  const frame=new Function('S','pending','document','window','requestAnimationFrame','updateModel','sig','return ('+code+');')(
   S,options.pending||null,{hidden:!!options.hidden},{innerWidth:320,innerHeight:900},()=>{scheduled++;return 17;},next=>updates.push(next),'old');
  frame();return{renders,scheduled,updates,S};
 }
 it.each([
  ['hidden page',{hidden:true}],['detached canvas',{connected:false}],
  ['zero width',{rectangle:{width:0}}],['zero height',{rectangle:{height:0}}],
  ['above viewport',{rectangle:{top:-100,bottom:0}}],['below viewport',{rectangle:{top:900,bottom:1000}}],
  ['left of viewport',{rectangle:{left:-200,right:0}}],['right of viewport',{rectangle:{left:320,right:520}}]
 ])('skips GPU work for a %s and retains the next frame callback',(_,options)=>{
  const result=run(options);expect(result.renders).toBe(0);expect(result.scheduled).toBe(1);expect(result.S.raf).toBe(17);
 });
 it('keeps the latest model input while the canvas is outside the viewport',()=>{
  const pending={sig:'new',rotY:25,rotX:12,zoom:1.2,northUp:false},result=run({rectangle:{top:900,bottom:1000},pending});
  expect(result.updates).toEqual([pending]);expect(result.renders).toBe(0);expect(result.S.rotY).toBe(25);expect(result.S.zoom).toBe(1.2);expect(result.S.northUp).toBe(false);
 });
});

describe('Standard pointer movement',()=>{
 it('accepts a held primary pointer move whose button transition value is minus one',()=>{
  const helper=readFileSync('reports/sky-lab-tidal-forcing-2026-10-01/helper-insertion.js','utf8');
  const start=helper.indexOf('        function scrub(e) {'),code=helper.slice(start,helper.indexOf('        var controls =',start)).trim();
  let selected=null;const scrub=new Function('hours','return ('+code+');')(value=>{selected=value;});
  scrub({button:-1,buttons:1,clientX:299,currentTarget:{getBoundingClientRect:()=>({left:100,width:360})}});
  expect(selected).toBe(24);
 });
});
