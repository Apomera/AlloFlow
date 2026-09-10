import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const appRequire=createRequire(process.cwd()+'/desktop/web-app/package.json'),window={React:appRequire('react'),AlloModules:{}};
vm.runInNewContext(fs.readFileSync('alt_text_module.js','utf8'),{window,console});
const hash=window.AlloModules.AltText.hashImage;
const glossarySource=fs.readFileSync('view_glossary_source.jsx','utf8');
const getAlt=new Function(glossarySource.slice(0,glossarySource.indexOf('// Lazy Lucide'))+'\nreturn getGlossaryImageAlt;')();
const slug='fractions_number_line_grade4',folder='allopacks/media/'+slug+'/',pack=read('allopacks/illustrated/'+slug+'.allopack.json'),original=read('allopacks/'+slug+'.allopack.json'),manifest=read(folder+'manifest.json');
require('../dev-tools/fraction_content_refinements.cjs').refine(original);
const get=t=>pack.history.find(r=>r.type===t),panels=pack.history.filter(r=>r.type==='image').flatMap(r=>r.data.visualPlan.panels);
const slots=[...get('glossary').data.map(g=>({url:g.image,alt:g.imageAlt,hash:g.imageAltHash})),...get('anchor-chart').data.sections.map(s=>({url:s.iconUrl,alt:s.iconAlt,hash:s.iconAltHash})),...get('concept-sort').data.items.map(s=>({url:s.image,alt:s.imageAlt,hash:s.imageAltHash})),...panels.map(p=>({url:p.imageUrl,alt:p.alt,hash:p.altHash}))];
describe('Fractions on the Number Line illustrated edition',()=>{
it('fills all 32 native slots with reviewed, portable, correctly described images',()=>{for(const g of get('glossary').data)expect(getAlt(g)).toBe(g.imageAlt);expect(slots).toHaveLength(32);expect(panels).toHaveLength(8);expect(get('anchor-chart').data.sections).toHaveLength(5);expect(get('concept-sort').data.items).toHaveLength(9);for(const s of slots){expect(s.url).toMatch(/^data:image\/webp;base64,/);expect(s.alt.length).toBeGreaterThan(20);expect(s.alt.length).toBeLessThanOrEqual(250);expect(s.hash).toBe(hash(s.url));}expect(pack.allopack.resourceIllustrations.pendingSortImages).toBe(0);expect(JSON.stringify(pack).length).toBeLessThan(2000000);});
it('embeds the selected reviewed files and retains an auditable manifest',()=>{const records=read(folder+'embedded-assets.json');expect(records).toHaveLength(32);expect(manifest.status).toBe('complete');for(const a of manifest.assets){expect(a.status).toBe('visual-review-passed');expect(a.prompt).toBeTruthy();expect(fs.existsSync(folder+a.file)).toBe(true);}for(const r of records)expect(slots.some(s=>s.url==='data:image/webp;base64,'+fs.readFileSync(folder+r.file).toString('base64'))).toBe(true);});
it('preserves source learning content, answer keys, categories, and references',()=>{for(const r of original.history){const actual=pack.history.find(x=>x.id===r.id);expect(actual.type).toBe(r.type);if(['glossary','anchor-chart','concept-sort'].includes(r.type)){const clean=JSON.parse(JSON.stringify(actual),(key,value)=>/^(image|iconUrl|iconAlt)/.test(key)?undefined:value);expect(clean).toEqual(r);}else if(r.type==='directions')expect(actual.data.objectives).toEqual(r.data.objectives);else expect(actual).toEqual(r);}expect(new Set(pack.history.map(r=>r.id)).size).toBe(pack.history.length);expect(panels.every(p=>p.caption&&p.title&&p.altSource==='vision')).toBe(true);expect(get('directions').data.body).not.toContain('Images are planned');});
it('passes the production artifact envelope and keeps classroom claims bounded',()=>{const C=require('../agent_core_contracts_module.js');const result=C.validateArtifact({schemaVersion:C.SCHEMA_VERSION,artifactId:slug+'-illustrated',type:'allopack',title:pack.allopack.title,language:'en',data:pack});expect(result.ok,JSON.stringify(result.errors)).toBe(true);expect(pack.allopack.illustrations.review).toContain('educator review pending');expect(get('directions').data.body).toContain(manifest.note);});
});

describe('Fraction mathematics and model geometry',()=>{
it('matches sort fractions with equal cells, correct tick counts and exact dot positions',()=>{
for(const a of manifest.assets.filter(x=>x.kind==='sort')){
const card=get('concept-sort').data.items[a.index],[n,d]=card.content.split('/').map(Number),svg=fs.readFileSync(folder+a.vectorFile,'utf8');
expect([...svg.matchAll(/data-cell="/g)]).toHaveLength(d);
expect([...svg.matchAll(/data-tick="/g)]).toHaveLength(d+1);
const cells=[...svg.matchAll(/<rect x="([^"]+)" y="[^"]+" width="([^"]+)" height="80" fill="([^"]+)"[^>]*data-cell/g)];
expect(cells).toHaveLength(d);
cells.forEach((c,i)=>{expect(Number(c[1])).toBeCloseTo(140+i*720/d);expect(Number(c[2])).toBeCloseTo(720/d);expect(c[3]).toBe(i<n?'#408487':'#e4d8bd');});
const dot=svg.match(/<circle data-value="([^"]+)" cx="([^"]+)"/);
expect(dot[1]).toBe(card.content);expect(Number(dot[2])).toBeCloseTo(140+720*n/d);
expect(card.categoryId).toBe(n/d<.5?'fr-less':n/d===.5?'fr-equal':'fr-more');
}
const beyond=manifest.assets.find(a=>a.sourceKey==='beyond'),svg=fs.readFileSync(folder+beyond.vectorFile,'utf8');
expect([...svg.matchAll(/data-tick="/g)]).toHaveLength(9);
expect(svg).toContain('data-value="5/4" cx="590"');
const eq=fs.readFileSync(folder+manifest.assets.find(a=>a.sourceKey==='equiv').vectorFile,'utf8');
expect([...eq.matchAll(/<circle[^>]*cx="500"/g)]).toHaveLength(2);
});
it('corrects mathematical overgeneralizations and records exact source changes',()=>{
expect(get('simplified').data).toContain('farther to the right');
expect(get('simplified').data).toContain('same whole');
expect(get('faq').data[1].answer).toContain('terminating decimal');
expect(get('faq').data[1].answer).toContain('1/3');
expect(get('faq').data[4].question).toContain('strictly between');
const changes=read(folder+'content-refinements.json');
expect(changes.length).toBe(pack.allopack.contentRefinements.count);
const pristine=read('allopacks/'+slug+'.allopack.json');
for(const c of changes){let old=pristine.history.find(r=>r.id===c.resourceId),now=pack.history.find(r=>r.id===c.resourceId);for(const key of c.path.split('.')){old=old[key];now=now[key];}expect(old).toEqual(c.from);expect(now).toEqual(c.to);}
});
});
