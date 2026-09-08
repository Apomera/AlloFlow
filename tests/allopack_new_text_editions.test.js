import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const slugs=['sound_vibration_grade1','habitats_diversity_grade2','weathering_erosion_grade4','decimal_place_value_grade5','probability_models_grade7'];
const read=p=>JSON.parse(readFileSync(p,'utf8'));
for(const slug of slugs)describe(slug+' future illustration readiness',()=>{
const pack=read('allopacks/'+slug+'.allopack.json'),plan=read('allopacks/authoring/'+slug+'.images.json');
it('has a planned native image slot for every anchor section and sort item',()=>{
const targets=new Set(plan.assets.map(a=>a.target));
for(const r of pack.history){
if(r.type==='anchor-chart')r.data.sections.forEach((s,i)=>expect(targets.has(r.id+'.data.sections['+i+'].iconUrl')).toBe(true));
if(r.type==='concept-sort')r.data.items.forEach((s,i)=>expect(targets.has(r.id+'.data.items['+i+'].image')).toBe(true));
}
expect(targets.size).toBe(plan.assets.length);
});
it('is explicitly a text-only draft with no fake artwork or alt provenance',()=>{
expect(pack.allopack.imageStatus).toBe('planned-not-generated');expect(pack.allopack.reviewStatus).toContain('educator review pending');
expect(JSON.stringify(pack)).not.toMatch(/data:image\/|"imageAltHash"|"iconAltHash"/);
});
});
describe('decimal numerical correctness',()=>{
const pack=read('allopacks/decimal_place_value_grade5.allopack.json');
it('classifies every sort value relative to one half correctly',()=>{
const sort=pack.history.find(r=>r.type==='concept-sort').data;
for(const item of sort.items){const value=Number(item.content),label=value===0.5?'Equal to 0.5':value<0.5?'Less than 0.5':'Greater than 0.5';expect(sort.categories.find(c=>c.id===item.categoryId).label).toBe(label);}
});
it('names the actual first differing place in the worked comparison',()=>{
const a='3.407',b='3.470';const place=[...a].findIndex((x,i)=>x!==b[i]);expect(place).toBe(3);expect(a[place]).toBe('0');expect(b[place]).toBe('7');
const reading=pack.history.find(r=>r.type==='simplified').data;expect(reading).toContain('Zero hundredths are fewer than seven hundredths');expect(Number(a)).toBeLessThan(Number(b));
});
});
