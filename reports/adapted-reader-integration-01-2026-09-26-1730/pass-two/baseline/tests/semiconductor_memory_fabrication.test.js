import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let c;beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_semiconductor.js','semiconductor');c=window.__SemiconductorCore;});
const step=(t,b,a,o={})=>c.memoryStep(t,b,a,{address:0,writeEnable:true,...o});
describe('Memory preserves information honestly',()=>{
it('initializes known teaching states and normalizes invalid bits',()=>{expect(c.memory('sram').bits).toEqual(Array(16).fill(0));expect(c.memory('flash').bits).toEqual(Array(16).fill(1));expect(c.memory('unknown').type).toBe('sram');expect(c.memory('sram',{bits:[7]}).bits).toEqual(Array(16).fill(null));});
it('blocks writes and erase without write enable',()=>{const b=c.memory('flash');expect(step('flash',b,'write0',{writeEnable:false}).bits).toEqual(b.bits);const z=step('flash',b,'write0');expect(step('flash',z,'erase',{writeEnable:false}).bits[0]).toBe(0);});
it('changes only the addressed cell',()=>{const b=step('sram',c.memory('sram'),'write1',{address:5});expect(b.bits[5]).toBe(1);expect(b.bits.filter(v=>v===1)).toHaveLength(1);});
it('loses volatile contents on power loss without inventing zeros on restart',()=>{for(const t of ['sram','dram']){let b=step(t,c.memory(t),'write1');b=step(t,b,'power');expect(b.bits.every(v=>v===null)).toBe(true);b=step(t,b,'power');expect(b.bits.every(v=>v===null)).toBe(true);b=step(t,b,'write1');expect(b.bits[0]).toBe(1);expect(b.bits[1]).toBeNull();}});
it('retains nonvolatile data across power cycles',()=>{for(const t of ['flash','nand','feram']){let b=step(t,c.memory(t),'write0',{address:3}),bits=b.bits.slice();b=step(t,b,'power');expect(b.bits).toEqual(bits);b=step(t,b,'power');expect(b.bits).toEqual(bits);}});
it('blocks memory operations while unpowered',()=>{const b=step('flash',c.memory('flash'),'power');for(const a of ['read','write0','erase','advance']){const n=step('flash',b,a);expect(n.bits).toEqual(b.bits);expect(n.clock).toBe(b.clock);expect(n.lastRead).toBeNull();}});
it('enforces flash program-to-zero and block erase-to-one',()=>{for(const t of ['flash','nand']){let b=step(t,c.memory(t),'write0');b=step(t,b,'write0',{address:7});expect(step(t,b,'write1').bits[0]).toBe(0);expect(step(t,b,'erase').bits).toEqual(Array(16).fill(1));}});
it('allows both FeRAM states without flash erase',()=>{let b=step('feram',c.memory('feram'),'write1');expect(b.bits[0]).toBe(1);expect(step('feram',b,'write0').bits[0]).toBe(0);});
it('makes both DRAM zeros and ones unknown at six lesson steps',()=>{let b=step('dram',c.memory('dram'),'write1');b=step('dram',b,'advance',{steps:5});expect(b.bits[0]).toBe(1);expect(b.bits[1]).toBe(0);expect(step('dram',b,'advance').bits.every(v=>v===null)).toBe(true);});
it('refreshes valid cells before information is lost',()=>{let b=step('dram',c.memory('dram'),'advance',{steps:5});b=step('dram',b,'refresh');expect(b.ages.every(v=>v===0)).toBe(true);expect(step('dram',b,'advance',{steps:5}).bits.every(v=>v===0)).toBe(true);});
it('cannot reconstruct lost bits by refreshing later',()=>{let b=step('dram',c.memory('dram'),'advance',{steps:6});b=step('dram',b,'refresh');expect(b.bits.every(v=>v===null)).toBe(true);expect(step('dram',b,'advance',{steps:6,autoRefresh:true}).bits.every(v=>v===null)).toBe(true);});
it('preserves valid DRAM bits with automatic refresh',()=>{let b=step('dram',c.memory('dram'),'write1');b=step('dram',b,'advance',{steps:12,autoRefresh:true});expect(b.bits[0]).toBe(1);expect(b.bits[1]).toBe(0);expect(Math.max(...b.ages)).toBeLessThan(2);});
it('restores only the selected valid DRAM cell after a read',()=>{let b=step('dram',c.memory('dram'),'advance',{steps:5});b=step('dram',b,'read',{address:2});expect(b.lastRead).toEqual({address:2,value:0});expect(b.ages[2]).toBe(0);expect(b.ages[1]).toBe(5);b=step('dram',b,'advance');expect(b.bits[2]).toBe(0);expect(b.bits[1]).toBeNull();});
it('retains SRAM over lesson steps without refresh',()=>{let b=step('sram',c.memory('sram'),'write1');expect(step('sram',b,'advance',{steps:12}).bits[0]).toBe(1);});
it('is deterministic and does not mutate notebook states',()=>{const b=c.memory('dram'),copy=JSON.stringify(b);expect(step('dram',b,'advance',{steps:4})).toEqual(step('dram',b,'advance',{steps:4}));expect(JSON.stringify(b)).toBe(copy);});
it('bounds history and resets explicitly',()=>{let b=c.memory('sram',{log:[null,{message:{}}]});for(let i=0;i<20;i++)b=step('sram',b,'read');expect(b.log).toHaveLength(12);b=step('sram',b,'reset');expect(b.bits).toEqual(Array(16).fill(0));expect(b.clock).toBe(0);expect(b.log).toHaveLength(1);});
});
describe('Relative oxidation',()=>{
it('recovers the defined baseline and zero endpoint',()=>{expect(c.oxidation(1000,30).index).toBeCloseTo(1,12);for(const T of [800,1000,1200])expect(c.oxidation(T,0).index).toBe(0);});
it('satisfies the normalized linear-parabolic equation',()=>{for(const T of [800,1000,1200])for(const t of [5,30,120]){const o=c.oxidation(T,t);expect(o.raw*o.raw+o.A*o.raw).toBeCloseTo(o.B*t/60,10);}});
it('grows faster when hotter but slows as the layer grows',()=>{expect(c.oxidation(1100,30).index).toBeGreaterThan(c.oxidation(1000,30).index);const a=c.oxidation(1000,30).index,b=c.oxidation(1000,60).index,d=c.oxidation(1000,90).index;expect(b).toBeGreaterThan(a);expect(d-b).toBeLessThan(b-a);});
it('keeps malformed inputs finite',()=>{for(const T of [null,NaN,Infinity,-10,5000]){const o=c.oxidation(T,NaN);expect(Number.isFinite(o.index)).toBe(true);expect(o.index).toBeGreaterThan(0);}});
});
describe('Memory and fabrication learning surfaces',()=>{
it('keeps the observation step available after reading a written memory cell',()=>{const bank=step('sram',step('sram',c.memory('sram'),'write1'),'read');const h=renderTool('semiconductor',{semiconductor:{mode:'explore',subtool:'memory',guidedSetupSubtool:'memory',memBanks:{sram:bank},memLastAction:'read'}});expect(h).toContain('semiconductor-guided-observation');});

it('describes FeRAM polarization without a flash erase control',()=>{const h=renderTool('semiconductor',{semiconductor:{subtool:'memory',memType:'feram'}});expect(h).toContain('Remanent ferroelectric polarization');expect(h).toContain('Address 15: 0');expect(h).not.toContain('Erase teaching block to 1');});
it('exposes unknown volatile state to assistive technology',()=>{const h=renderTool('semiconductor',{semiconductor:{subtool:'memory',memBanks:{sram:{bits:Array(16).fill(1),power:false}}}});expect(h).toContain('Stored model state: Unknown');expect(h).toContain('Address 0: unknown');});
it('prevents completion from jumping straight to the last stage',()=>{const h=renderTool('semiconductor',{semiconductor:{subtool:'waferfab',fabStage:7}});expect(h).toContain('Review remaining stages');expect(h).not.toContain('Finish walkthrough ✓');});
it('allows completion after visiting all stages',()=>{const h=renderTool('semiconductor',{semiconductor:{subtool:'waferfab',fabStage:7,fabVisited:[0,1,2,3,4,5,6,7]}});expect(h).toContain('Finish walkthrough ✓');});
it('identifies oxidation as relative growth, not calibrated thickness',()=>{const h=renderTool('semiconductor',{semiconductor:{subtool:'waferfab',fabStage:2,fabTime:0}});expect(h).toContain('0.00 × baseline');expect(h).toContain('not oxide thickness in nm');});
it('separates implant dose, energy and activation',()=>{const h=renderTool('semiconductor',{semiconductor:{subtool:'waferfab',fabStage:5,fabDoseLog:15,fabEnergy:100,fabAnnealed:true}});expect(h).toContain('1.00e+15 ions/cm²');expect(h).toContain('Implant energy');expect(h).toContain('Activation illustrated');expect(h).not.toContain('Implant time');});
});

