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
const slug='moon_phases_grade6',folder='allopacks/media/'+slug+'/',pack=read('allopacks/illustrated/'+slug+'.allopack.json'),original=read('allopacks/'+slug+'.allopack.json'),manifest=read(folder+'manifest.json');
require('../dev-tools/moon_content_refinements.cjs').refine(original);
const get=t=>pack.history.find(r=>r.type===t),panels=pack.history.filter(r=>r.type==='image').flatMap(r=>r.data.visualPlan.panels);
const slots=[...get('glossary').data.map(g=>({url:g.image,alt:g.imageAlt,hash:g.imageAltHash})),...get('anchor-chart').data.sections.map(s=>({url:s.iconUrl,alt:s.iconAlt,hash:s.iconAltHash})),...get('concept-sort').data.items.map(s=>({url:s.image,alt:s.imageAlt,hash:s.imageAltHash})),...panels.map(p=>({url:p.imageUrl,alt:p.alt,hash:p.altHash}))];
describe('Moon phases illustrated edition',()=>{
it('fills all 33 native slots with reviewed, portable, correctly described images',()=>{for(const g of get('glossary').data)expect(getAlt(g)).toBe(g.imageAlt);expect(slots).toHaveLength(33);expect(panels).toHaveLength(8);expect(get('anchor-chart').data.sections).toHaveLength(5);expect(get('concept-sort').data.items).toHaveLength(10);for(const s of slots){expect(s.url).toMatch(/^data:image\/webp;base64,/);expect(s.alt.length).toBeGreaterThan(20);expect(s.alt.length).toBeLessThanOrEqual(250);expect(s.hash).toBe(hash(s.url));}expect(pack.allopack.resourceIllustrations.pendingSortImages).toBe(0);expect(JSON.stringify(pack).length).toBeLessThan(2000000);});
it('embeds the selected reviewed files and retains an auditable manifest',()=>{const records=read(folder+'embedded-assets.json');expect(records).toHaveLength(33);expect(manifest.status).toBe('complete');for(const a of manifest.assets){expect(a.status).toBe('visual-review-passed');expect(a.prompt).toBeTruthy();expect(fs.existsSync(folder+a.file)).toBe(true);}for(const r of records)expect(slots.some(s=>s.url==='data:image/webp;base64,'+fs.readFileSync(folder+r.file).toString('base64'))).toBe(true);});
it('preserves source learning content, answer keys, categories, and references',()=>{for(const r of original.history){const actual=pack.history.find(x=>x.id===r.id);expect(actual.type).toBe(r.type);if(['glossary','anchor-chart','concept-sort'].includes(r.type)){const clean=JSON.parse(JSON.stringify(actual),(key,value)=>/^(image|iconUrl|iconAlt)/.test(key)?undefined:value);expect(clean).toEqual(r);}else if(r.type==='directions')expect(actual.data.objectives).toEqual(r.data.objectives);else expect(actual).toEqual(r);}expect(new Set(pack.history.map(r=>r.id)).size).toBe(pack.history.length);expect(panels.every(p=>p.caption&&p.title&&p.altSource==='vision')).toBe(true);expect(get('directions').data.body).not.toContain('Images are planned');});
it('passes the production artifact envelope and keeps classroom claims bounded',()=>{const C=require('../agent_core_contracts_module.js');const result=C.validateArtifact({schemaVersion:C.SCHEMA_VERSION,artifactId:slug+'-illustrated',type:'allopack',title:pack.allopack.title,language:'en',data:pack});expect(result.ok,JSON.stringify(result.errors)).toBe(true);expect(pack.allopack.illustrations.review).toContain('educator review pending');expect(get('directions').data.body).toContain(manifest.note);});
});


describe('Moon scientific consistency',()=>{
it('shows the phase sequence and inward-facing tidal markers',()=>{
const svg=k=>fs.readFileSync(folder+manifest.assets.find(a=>a.sourceKey===k).vectorFile,'utf8');
expect([...svg('cycle').matchAll(/data-fraction="([^"]+)"/g)].map(m=>+m[1])).toEqual([0,.15,.5,.85,1,.85,.5,.15]);
expect([...svg('waxing').matchAll(/data-fraction="([^"]+)"/g)].map(m=>+m[1])).toEqual([.15,.5,.85]);
expect([...svg('waning').matchAll(/data-fraction="([^"]+)"/g)].map(m=>+m[1])).toEqual([.85,.5,.15]);
expect(manifest.note).toContain('not to scale');expect(manifest.note).toContain('head shadow');
});
it('audits corrections and retains valid answer keys',()=>{
expect(get('simplified').data).toContain('27.3');expect(get('simplified').data).toContain('29.5');expect(get('simplified').data).toContain('penumbral, partial or total');
for(const q of get('quiz').data.questions.filter(q=>q.type==='mcq'))expect(q.options).toContain(q.correctAnswer);
const pristine=read('allopacks/'+slug+'.allopack.json'),changes=read(folder+'content-refinements.json');expect(changes.length).toBe(pack.allopack.contentRefinements.count);
for(const c of changes){let old=pristine.history.find(r=>r.id===c.resourceId),now=pack.history.find(r=>r.id===c.resourceId);for(const key of c.path.split('.')){old=old[key];now=now[key];}if(c.resourceId==='mp-directions'&&c.path==='data.body')old+='\n\nPicture panels: '+manifest.groups.join('; ')+'. '+manifest.note;expect(old).toEqual(c.from);expect(now).toEqual(c.to);}
});});
