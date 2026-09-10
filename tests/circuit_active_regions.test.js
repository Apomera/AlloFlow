import {beforeEach,describe,expect,it} from 'vitest';
import {loadTool,resetStemLab,renderTool} from './helpers/stem_widgets_smoke_harness.js';
let regions,solve;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_circuit.js','circuit');regions=window.StemLab.circuitActiveRegions;solve=window.StemLab.solveActiveCircuit;});
const at=(d,map,value)=>solve({...d,[map.key]:value});
describe('continuous operating-region exploration',()=>{
 it('locates manual boundaries from the circuit equations rather than graph samples',()=>{
  const d={supply:7.25,baseResistance:12345.6,loadResistance:432.1,beta:88.5},m=regions(d);
  expect(m.onset).toBeCloseTo(.7,14);expect(m.saturation).toBeCloseTo(.7+d.baseResistance*(d.supply-.2)/(d.beta*d.loadResistance),12);
  expect(m.key).toBe('input');expect(m.max).toBe(5);expect(m.increasing).toBe(true);expect(m.bands.map(b=>b.region)).toEqual(['cutoff','active','saturated']);
 });
 it.each(['light','dark'])('matches independently inverted %s divider boundaries',project=>{
  const d={project,supply:5,baseResistance:12345,loadResistance:432,dividerResistance:12345,beta:88},m=regions(d),t=(d.supply-.2)/d.loadResistance/d.beta,F=d.dividerResistance,RB=d.baseResistance;
  const resistance=base=>project==='light'?F*(d.supply-.7-base*RB)/(.7+base*(F+RB)):F*(.7+base*RB)/(d.supply-.7-base*(F+RB));
  const light=r=>100*Math.log(100000/r)/Math.log(100);
  expect(m.onset).toBeCloseTo(light(resistance(0)),10);expect(m.saturation).toBeCloseTo(light(resistance(t)),10);
  expect(at(d,m,m.onset).theveninVoltage).toBeCloseTo(.7,12);
  expect(d.beta*at(d,m,m.saturation).baseCurrent).toBeCloseTo(at(d,m,m.saturation).loadLimit,12);
  expect(m.increasing).toBe(project==='light');expect(m.bands.map(b=>b.region)).toEqual(project==='light'?['cutoff','active','saturated']:['saturated','active','cutoff']);
 });
 it('finds an active interval much narrower than one plotted sample',()=>{
  const d={supply:3,baseResistance:1000,loadResistance:2000,beta:300},m=regions(d),r=m.regions.find(r=>r.id==='active');
  expect(r.available).toBe(true);expect(r.end-r.start).toBeLessThan(5/200);expect(at(d,m,r.example).region).toBe('active');expect(m.saturation).toBeCloseTo(.7+1000*2.8/(300*2000),13);
 });
 it('does not invent a saturation boundary beyond the available drive',()=>{
  const d={supply:12,baseResistance:100000,loadResistance:100,beta:20},m=regions(d);
  expect(m.saturation).toBeNull();expect(m.regions.find(r=>r.id==='saturated')).toEqual({id:'saturated',label:'Saturation',available:false,start:null,end:null,example:null});expect(at(d,m,5).region).toBe('active');
 });
 it.each(['light','dark'])('handles %s designs saturated throughout the control range',project=>{
  const d={project,supply:3,baseResistance:1000,loadResistance:2000,beta:300,dividerResistance:project==='light'?100000:1000},m=regions(d);
  expect(m.onset).toBeNull();expect(m.saturation).toBeNull();expect(m.bands).toHaveLength(1);expect(m.bands[0].region).toBe('saturated');expect(m.regions.filter(r=>r.available).map(r=>r.id)).toEqual(['saturated']);
 });
 it('retains a reachable endpoint without requiring a visibly wide graph band',()=>{
  const d={project:'manual',supply:10.2,baseResistance:4300,loadResistance:100,beta:100},m=regions(d),r=m.regions.find(r=>r.id==='saturated');
  expect(r.available).toBe(true);expect(m.saturation).toBeCloseTo(5,12);expect(at(d,m,r.example).region).toBe('saturated');
 });
 it.each(['manual','light','dark'])('partitions the full %s range with trustworthy region examples and continuous boundaries',project=>{
  for(const supply of [3,7.25,12])for(const beta of [20,88.5,300])for(const baseResistance of [1000,12345.6,100000])for(const loadResistance of [100,432.1,2000])for(const dividerResistance of [1000,12345.6,100000]){
   const d={project,supply,beta,baseResistance,loadResistance,dividerResistance},m=regions(d);
   expect(m.bands[0].start).toBe(0);expect(m.bands.at(-1).end).toBe(m.max);
   m.bands.forEach((b,i)=>{if(i)expect(b.start).toBe(m.bands[i-1].end);expect(b.end).toBeGreaterThan(b.start);expect(at(d,m,b.example).region).toBe(b.region);});
   for(const r of m.regions){if(r.available){expect(r.example).toBeGreaterThanOrEqual(0);expect(r.example).toBeLessThanOrEqual(m.max);expect(at(d,m,r.example).region).toBe(r.id);}else expect(r.example).toBeNull();}
   for(const control of [0,m.max*.1234,m.max*.5,m.max*.8765,m.max])expect(m.regions.find(r=>r.id===at(d,m,control).region).available).toBe(true);
   if(m.onset!=null)expect(at(d,m,m.onset).theveninVoltage).toBeCloseTo(.7,10);
   if(m.saturation!=null)expect(beta*at(d,m,m.saturation).baseCurrent).toBeCloseTo(at(d,m,m.saturation).loadLimit,10);
  }
 });
 it('does not mutate the circuit or depend on probes, history, notebook, or operating input',()=>{
  const d={project:'dark',light:25,reference:{version:1,design:{input:1}},observations:[{note:'Keep me'}],undo:[{input:0}],probeRed:'base'},copy=JSON.stringify(d),a=regions(d);
  expect(regions({...d,light:90,probeRed:'collector',view:'schematic'})).toEqual(a);expect(JSON.stringify(d)).toBe(copy);
 });
 it('recalculates the saturation point when a component changes',()=>{const a=regions({baseResistance:10000}),b=regions({baseResistance:15000});expect(b.onset).toBeCloseTo(a.onset,12);expect(b.saturation-.7).toBeCloseTo(1.5*(a.saturation-.7),12);});
 it('renders named graph bands, numerical boundaries, reachable actions, and the current limit explanation',()=>{
  const html=renderTool('circuit',{_circuit:{activeWorkbench:true},_circuitActive:{input:1.5}});
  expect(html).toContain('aria-label="Operating region explorer"');expect(html).toContain('circuit-active-region-band');expect(html).toContain('Now: Active region');expect(html).toContain('Explore cutoff');expect(html).toContain('Explore saturation');expect(html).toContain('Lamp current is the smaller value:');expect(html).toContain('8.00 mA');expect(html).toContain('Conduction boundary');
 });
 it('explains unavailable regions without offering a misleading preset',()=>{const html=renderTool('circuit',{_circuit:{activeWorkbench:true},_circuitActive:{baseResistance:100000,beta:20,loadResistance:100}});expect(html).toContain('Outside this input range');expect(html).toContain('circuit-region-unavailable-saturated');expect(html).toContain('Even the strongest input');expect(html).toMatch(/disabled="" aria-describedby="circuit-region-unavailable-saturated"/);});
});

describe('boundary-aware response curves',()=>{
 it.each(['manual','light','dark'])('plots calculated %s transition points while preserving the uniform CSV',project=>{
  const d={project,supply:3,baseResistance:1000,loadResistance:2000,beta:300},m=regions(d),uniform=window.StemLab.circuitActiveSweep(d),plot=window.StemLab.circuitActivePlotSweep(d);
  expect(uniform).toHaveLength(201);expect(plot.length).toBeGreaterThanOrEqual(201);expect(plot.length).toBeLessThanOrEqual(203);
  for(const boundary of [m.onset,m.saturation].filter(x=>x!=null))expect(plot.some(p=>p.control===boundary)).toBe(true);
  for(const row of uniform)expect(plot).toContainEqual(row);
  plot.forEach((row,i)=>{if(i)expect(row.control).toBeGreaterThan(plot[i-1].control);expect(row.collectorCurrent).toBeCloseTo(at(d,m,row.control).collectorCurrent,12);});
  expect(window.StemLab.circuitActiveCSV(d).split('\n')).toHaveLength(202);
 });
 it('renders the live and reference curves with their own transition points',()=>{
  const live={supply:3,baseResistance:1000,loadResistance:2000,beta:300},reference={...live,baseResistance:2000};
  const html=renderTool('circuit',{_circuit:{activeWorkbench:true},_circuitActive:{...live,reference:{version:1,design:reference}}});
  const livePath=html.match(/class="circuit-active-live-curve" d="([^"]+)"/)[1],referencePath=html.match(/class="circuit-active-reference-curve" d="([^"]+)"/)[1];
  const x=v=>(65+v/5*670).toFixed(2);
  expect(livePath).toContain('L'+x(regions(live).saturation)+' ');expect(referencePath).toContain('L'+x(regions(reference).saturation)+' ');
  const report=window.StemLab.circuitActiveReport({...live,reference:{version:1,design:reference}}),reportX=v=>(58+v/5*664).toFixed(2);
  expect(report).toContain('L'+reportX(regions(live).saturation)+' ');expect(report).toContain('L'+reportX(regions(reference).saturation)+' ');
 });
});
