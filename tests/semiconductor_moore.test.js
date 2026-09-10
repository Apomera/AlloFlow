import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let c;beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_semiconductor.js','semiconductor');c=window.__SemiconductorCore;});
describe('Doubling references and sourced observations',()=>{
it('anchors every doubling interval to the 4004 count',()=>{for(const period of [1,1.5,2,3,4])expect(c.doubling(1971,period)).toBe(2300);});
it('doubles exactly after the chosen interval',()=>{for(const period of [1,1.25,2,3,4])expect(c.doubling(2000+period,period)/c.doubling(2000,period)).toBeCloseTo(2,12);});
it('separates an exact reported product from the reference',()=>{const m=c.moore({mooreYear:2024});expect(m.selected.name).toBe('NVIDIA B200');expect(m.selected.transistors).toBe(208e9);expect(m.ratio).toBeCloseTo(208e9/m.reference,12);});
it('does not substitute a nearby product into an empty year',()=>{for(const year of [1965,1970,1980,2019,2023]){const m=c.moore({mooreYear:year});expect(m.selected).toBeNull();expect(m.ratio).toBeNull();expect(m.status).toBe('No product entry for this year');}});
it('does not present a future scenario as reported data',()=>{const m=c.moore({mooreYear:2030});expect(m.selected).toBeNull();expect(m.status).toContain('Scenario only');expect(m.points.every(p=>p.year<=2024)).toBe(true);});
it('keeps the 1965 history annotation out of product data',()=>{expect(c.milestones.some(p=>p.year===1965)).toBe(false);expect(c.moore({mooreYear:1965}).next.year).toBe(1971);});
it('filters two-die totals without changing their scope or inventing per-die counts',()=>{const m=c.moore({mooreYear:2022,mooreIncludeMulti:false});expect(m.points).toHaveLength(6);expect(m.points.every(p=>p.dies===1)).toBe(true);expect(m.selected.transistors).toBe(114e9);expect(m.included).toBe(false);expect(m.ratio).toBeNull();});
it('keeps axis bounds stable when hiding the reference or filtering dies',()=>{const a=c.moore({}),b=c.moore({mooreShowPred:false,mooreIncludeMulti:false});expect(a.linearMax).toBe(b.linearMax);expect(a.logMax).toBe(b.logMax);});
it('uses equal log distances for equal ratios',()=>{const m=c.moore({});expect(m.fraction(1e8)-m.fraction(1e7)).toBeCloseTo(m.fraction(1e7)-m.fraction(1e6),12);});
it('uses equal linear distances for equal differences',()=>{const m=c.moore({mooreLogScale:false});expect(m.fraction(0)).toBe(0);expect(m.fraction(2e9)-m.fraction(1e9)).toBeCloseTo(m.fraction(3e9)-m.fraction(2e9),12);});
it('keeps every product and scenario within the plotted upper bounds',()=>{for(const period of [1,1.5,2,2.5,3,4])for(const log of [true,false]){const m=c.moore({mooreDoubling:period,mooreLogScale:log});for(const p of m.points){expect(m.fraction(p.transistors)).toBeGreaterThanOrEqual(0);expect(m.fraction(p.transistors)).toBeLessThanOrEqual(1);}expect(m.fraction(c.doubling(1965,period))).toBeGreaterThanOrEqual(0);expect(m.fraction(c.doubling(2030,period))).toBeLessThanOrEqual(1);}});
it('normalizes malformed saved numeric settings',()=>{const m=c.moore({mooreYear:Infinity,mooreDoubling:NaN});expect(m.year).toBe(2024);expect(m.period).toBe(2);expect(c.moore({mooreYear:5000,mooreDoubling:0}).year).toBe(2030);expect(c.moore({mooreDoubling:0}).period).toBe(1);});
it('navigates only to real earlier and later entries',()=>{const m=c.moore({mooreYear:2010});expect(m.previous.year).toBe(1993);expect(m.next.year).toBe(2020);expect(c.moore({mooreYear:2030}).next).toBeNull();});
it('demonstrates M1 Ultra as two M1 Max die counts',()=>{const max=c.milestones.find(p=>p.year===2021),ultra=c.milestones.find(p=>p.year===2022);expect(ultra.transistors).toBe(2*max.transistors);expect(ultra.dies).toBe(2);expect(ultra.node).toBe(max.node);});
it('does not mutate source data when selecting a scope',()=>{const before=JSON.stringify(c.milestones);c.moore({mooreIncludeMulti:false});expect(JSON.stringify(c.milestones)).toBe(before);});
});
describe('Trend learning surfaces',()=>{
it('exposes linear scaling and reported counts in the chart description',()=>{const h=renderTool('semiconductor',{semiconductor:{subtool:'moorelaw',mooreLogScale:false}});expect(h).toContain('linear scale');expect(h).toContain('208 billion');expect(h).toContain('2 compute dies');});
it('explains the original and revised historical intervals',()=>{const h=renderTool('semiconductor',{semiconductor:{subtool:'moorelaw'}});expect(h).toContain('1965 projection used annual doubling');expect(h).toContain('1975 toward a two-year interval');expect(h).not.toContain('He was right for 60 years');});
it('keeps historical gaps and projected years explicit in evidence',()=>{const h=renderTool('semiconductor',{semiconductor:{subtool:'moorelaw',mooreYear:2030,guidedSetupSubtool:'moorelaw'}});expect(h).toContain('Scenario only');expect(h).toContain('No nearby product is substituted');expect(h).toContain('Not compared');});
it('advances the guided experiment when only the interval changes',()=>{const h=renderTool('semiconductor',{semiconductor:{subtool:'moorelaw',mooreDoubling:4,guidedSetupSubtool:'moorelaw'}});expect(h).toContain('semiconductor-guided-observation');expect(h).toContain('4 years');});
it('exposes a count-versus-density misconception check and sources',()=>{const h=renderTool('semiconductor',{semiconductor:{subtool:'moorelaw'}});expect(h).toContain('density need not change');expect(h).toContain('Source for Intel 4004');expect(h).toContain('57 + 57 = 114 billion');});
});

