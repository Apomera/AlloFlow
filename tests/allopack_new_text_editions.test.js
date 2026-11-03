import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const slugs=['sound_vibration_grade1','habitats_diversity_grade2','weathering_erosion_grade4','decimal_place_value_grade5','probability_models_grade7'];
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const altWindow={AlloModules:{},React:{}};vm.runInNewContext(readFileSync('alt_text_module.js','utf8'),{window:altWindow,console:{log(){}}});
const {hashImage}=altWindow.AlloModules.AltText;
// These five began as text-only drafts with an image plan. On 2026-11-02 the text drafts were retired and the
// single current edition is illustrated, so the plan is now checked as fulfilled rather than pending.
for(const slug of slugs)describe(slug+' planned illustrations',()=>{
const pack=read('allopacks/current/'+slug+'.allopack.json'),plan=read('allopacks/authoring/'+slug+'.images.json');
const slot=target=>{const m=target.match(/^([^.]+)\.data(?:\.(sections|items))?\[(\d+)\]\.(iconUrl|image)$/);if(!m)return null;const d=pack.history.find(r=>r.id===m[1]).data;const owner=(m[2]?d[m[2]]:d)[+m[3]];const icon=m[4]==='iconUrl';return {url:owner[m[4]],alt:icon?owner.iconAlt:owner.imageAlt,hash:icon?owner.iconAltHash:owner.imageAltHash,source:icon?owner.iconAltSource:owner.imageAltSource};};
const panelPlans=plan.assets.filter(a=>/^future native image resource panel \d+$/.test(a.target));
it('has a planned native image slot for every anchor section and sort item',()=>{
const targets=new Set(plan.assets.map(a=>a.target));
for(const r of pack.history){
if(r.type==='anchor-chart')r.data.sections.forEach((s,i)=>expect(targets.has(r.id+'.data.sections['+i+'].iconUrl')).toBe(true));
if(r.type==='concept-sort')r.data.items.forEach((s,i)=>expect(targets.has(r.id+'.data.items['+i+'].image')).toBe(true));
}
expect(targets.size).toBe(plan.assets.length);
expect(plan.assets.every(a=>slot(a.target)||panelPlans.includes(a))).toBe(true);
});
it('fills every planned slot with embedded artwork and vision-reviewed, hash-bound descriptions',()=>{
expect(pack.allopack.imageStatus).toBe('illustrated-draft-educator-review-pending');expect(pack.allopack.reviewStatus).toContain('educator review pending');
for(const a of plan.assets.filter(a=>!panelPlans.includes(a))){const s=slot(a.target);expect(s.url,a.target).toMatch(/^data:image\/webp;base64,/);expect(s.alt.length,a.target).toBeGreaterThan(20);expect(s.hash,a.target).toBe(hashImage(s.url));expect(s.source,a.target).toBe('vision');}
const panels=pack.history.filter(r=>r.type==='image'&&!/-visual-reference$/.test(r.id)).flatMap(r=>r.data.visualPlan.panels);
expect(panels).toHaveLength(panelPlans.length);for(const p of panels){expect(p.imageUrl).toMatch(/^data:image\/webp;base64,/);expect(p.altHash).toBe(hashImage(p.imageUrl));expect(p.altSource).toBe('vision');}
});
});
describe('decimal numerical correctness',()=>{
const pack=read('allopacks/current/decimal_place_value_grade5.allopack.json');
it('classifies every sort value relative to one half correctly',()=>{
const sort=pack.history.find(r=>r.type==='concept-sort').data;
for(const item of sort.items){const value=Number(item.content),label=value===0.5?'Equal to 0.5':value<0.5?'Less than 0.5':'Greater than 0.5';expect(sort.categories.find(c=>c.id===item.categoryId).label).toBe(label);}
});
it('names the actual first differing place in the worked comparison',()=>{
const a='3.407',b='3.470';const place=[...a].findIndex((x,i)=>x!==b[i]);expect(place).toBe(3);expect(a[place]).toBe('0');expect(b[place]).toBe('7');
const reading=pack.history.find(r=>r.type==='simplified').data;expect(reading).toContain('Zero hundredths are fewer than seven hundredths');expect(Number(a)).toBeLessThan(Number(b));
});
});
