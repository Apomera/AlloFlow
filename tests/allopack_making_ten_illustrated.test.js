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
const slug='making_ten_grade1',folder='allopacks/media/'+slug+'/',pack=read('allopacks/illustrated/'+slug+'.allopack.json'),original=read('allopacks/'+slug+'.allopack.json'),manifest=read(folder+'manifest.json');
require('../dev-tools/making_ten_content_refinements.cjs').refine(original);
require('../dev-tools/lib/allopack_quality_refinements_20260919.cjs').apply(original,slug,{targetEnvelope:pack.allopack});
const get=t=>pack.history.find(r=>r.type===t),panels=pack.history.filter(r=>r.type==='image').flatMap(r=>r.data.visualPlan.panels);
const slots=[...get('glossary').data.map(g=>({url:g.image,alt:g.imageAlt,hash:g.imageAltHash})),...get('anchor-chart').data.sections.map(s=>({url:s.iconUrl,alt:s.iconAlt,hash:s.iconAltHash})),...get('concept-sort').data.items.map(s=>({url:s.image,alt:s.imageAlt,hash:s.imageAltHash})),...panels.map(p=>({url:p.imageUrl,alt:p.alt,hash:p.altHash}))];
describe('making_ten_grade1 illustrated edition',()=>{
it('fills all 31 native slots with reviewed, portable, correctly described images',()=>{for(const g of get('glossary').data)expect(getAlt(g)).toBe(g.imageAlt);expect(slots).toHaveLength(31);expect(panels).toHaveLength(8);expect(get('anchor-chart').data.sections).toHaveLength(4);expect(get('concept-sort').data.items).toHaveLength(9);for(const s of slots){expect(s.url).toMatch(/^data:image\/webp;base64,/);expect(s.alt.length).toBeGreaterThan(20);expect(s.alt.length).toBeLessThanOrEqual(250);expect(s.hash).toBe(hash(s.url));}expect(pack.allopack.resourceIllustrations.pendingSortImages).toBe(0);expect(JSON.stringify(pack).length).toBeLessThan(2000000);});
it('embeds the selected reviewed files and retains an auditable manifest',()=>{const records=read(folder+'embedded-assets.json');expect(records).toHaveLength(31);expect(manifest.status).toBe('complete');for(const a of manifest.assets){expect(a.status).toBe('visual-review-passed');expect(a.prompt).toBeTruthy();expect(fs.existsSync(folder+a.file)).toBe(true);}for(const r of records)expect(slots.some(s=>s.url==='data:image/webp;base64,'+fs.readFileSync(folder+r.file).toString('base64'))).toBe(true);});
it('preserves source learning content, answer keys, categories, and references',()=>{for(const r of original.history){const actual=pack.history.find(x=>x.id===r.id);expect(actual.type).toBe(r.type);if(['glossary','anchor-chart','concept-sort'].includes(r.type)){const clean=JSON.parse(JSON.stringify(actual),(key,value)=>/^(image|iconUrl|iconAlt)/.test(key)?undefined:value);expect(clean).toEqual(r);}else if(r.type==='directions')expect(actual.data.objectives).toEqual(r.data.objectives);else expect(actual).toEqual(r);}expect(new Set(pack.history.map(r=>r.id)).size).toBe(pack.history.length);expect(panels.every(p=>p.caption&&p.title&&p.altSource==='vision')).toBe(true);expect(get('directions').data.body).not.toContain('Images are planned');});
it('passes the production artifact envelope and keeps classroom claims bounded',()=>{const C=require('../agent_core_contracts_module.js');const result=C.validateArtifact({schemaVersion:C.SCHEMA_VERSION,artifactId:slug+'-illustrated',type:'allopack',title:pack.allopack.title,language:'en',data:pack});expect(result.ok,JSON.stringify(result.errors)).toBe(true);expect(pack.allopack.illustrations.review).toContain('educator review pending');expect(get('directions').data.body).toContain(manifest.note);});
});



describe('Scientific diagram and content audit',()=>{
it('keeps directions and molecular or motion conventions consistent',()=>{
const svg=k=>fs.readFileSync(folder+manifest.assets.find(a=>a.sourceKey===k).vectorFile,'utf8');
for(const a of manifest.assets.filter(a=>a.kind==='sort')){const nums=a.sourceKey.slice(4).split('').map(Number);const s=svg(a.sourceKey);expect((s.match(/data-counter="true"/g)||[]).length).toBe(nums[0]+nums[1]);expect(get('concept-sort').data.items[a.index].categoryId).toBe(nums[0]+nums[1]===10?'mn-yes':'mn-no');}for(const [key,total]of [['after13',13],['after15',15],['frame8',8]])expect((svg(key).match(/data-counter="true"/g)||[]).length).toBe(total);expect(svg('frame8')).toContain('data-frame-capacity="10"');expect(get('simplified').data).toContain('zero to ten');expect(get('math').data.problems.map(p=>p.answer)).toEqual(['13','15','12','4','12']);
});
it('records every changed field and retains valid answer keys',()=>{
for(const q of get('quiz').data.questions.filter(q=>q.type==='mcq'))expect(q.options).toContain(q.correctAnswer);
const pristine=read('allopacks/'+slug+'.allopack.json'),changes=read(folder+'content-refinements.json');expect(changes.length).toBe(pack.allopack.contentRefinements.count);
for(const c of changes){let old=pristine.history.find(r=>r.id===c.resourceId),now=pack.history.find(r=>r.id===c.resourceId);for(const key of c.path.split('.')){old=old[key];now=now[key];}if(c.resourceId.endsWith('-directions')&&c.path==='data.body')old+='\n\nPicture panels: '+manifest.groups.join('; ')+'. '+manifest.note;if(c.stripArtwork){const clean=n=>JSON.parse(JSON.stringify(n),(k,v)=>/^(image|iconUrl|iconAlt)/.test(k)?undefined:v);old=clean(old);now=clean(now);}expect(old).toEqual(c.from);expect(now).toEqual(c.to);}
});});
