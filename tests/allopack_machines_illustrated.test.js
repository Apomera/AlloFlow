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
const slug='simple_machines_grade5',folder='allopacks/media/'+slug+'/',pack=read('allopacks/illustrated/'+slug+'.allopack.json'),original=read('allopacks/'+slug+'.allopack.json'),manifest=read(folder+'manifest.json');
require('../dev-tools/machine_content_refinements.cjs').refine(original);
const get=t=>pack.history.find(r=>r.type===t),panels=pack.history.filter(r=>r.type==='image').flatMap(r=>r.data.visualPlan.panels);
const slots=[...get('glossary').data.map(g=>({url:g.image,alt:g.imageAlt,hash:g.imageAltHash})),...get('anchor-chart').data.sections.map(s=>({url:s.iconUrl,alt:s.iconAlt,hash:s.iconAltHash})),...get('concept-sort').data.items.map(s=>({url:s.image,alt:s.imageAlt,hash:s.imageAltHash})),...panels.map(p=>({url:p.imageUrl,alt:p.alt,hash:p.altHash}))];
describe('Simple Machines illustrated edition',()=>{
it('fills all 36 native slots with reviewed, portable, correctly described images',()=>{for(const g of get('glossary').data)expect(getAlt(g)).toBe(g.imageAlt);expect(slots).toHaveLength(36);expect(panels).toHaveLength(8);expect(get('anchor-chart').data.sections).toHaveLength(6);expect(get('concept-sort').data.items).toHaveLength(10);for(const s of slots){expect(s.url).toMatch(/^data:image\/webp;base64,/);expect(s.alt.length).toBeGreaterThan(20);expect(s.alt.length).toBeLessThanOrEqual(250);expect(s.hash).toBe(hash(s.url));}expect(pack.allopack.resourceIllustrations.pendingSortImages).toBe(0);expect(JSON.stringify(pack).length).toBeLessThan(2000000);});
it('embeds the selected reviewed files and retains an auditable manifest',()=>{const records=read(folder+'embedded-assets.json');expect(records).toHaveLength(36);expect(manifest.status).toBe('complete');for(const a of manifest.assets){expect(a.status).toBe('visual-review-passed');expect(a.prompt).toBeTruthy();expect(fs.existsSync(folder+a.file)).toBe(true);}for(const r of records)expect(slots.some(s=>s.url==='data:image/webp;base64,'+fs.readFileSync(folder+r.file).toString('base64'))).toBe(true);});
it('preserves resources and categories except the audited content refinements',()=>{for(const r of original.history){const actual=pack.history.find(x=>x.id===r.id);expect(actual.type).toBe(r.type);if(['glossary','anchor-chart','concept-sort'].includes(r.type)){const clean=JSON.parse(JSON.stringify(actual),(key,value)=>/^(image|iconUrl|iconAlt)/.test(key)?undefined:value);expect(clean).toEqual(r);}else if(r.type==='directions')expect(actual.data.objectives).toEqual(r.data.objectives);else expect(actual).toEqual(r);}expect(new Set(pack.history.map(r=>r.id)).size).toBe(pack.history.length);expect(panels.every(p=>p.caption&&p.title&&p.altSource==='vision')).toBe(true);expect(get('directions').data.body).not.toContain('Images are planned');});
it('passes the production artifact envelope and keeps classroom claims bounded',()=>{const C=require('../agent_core_contracts_module.js');const result=C.validateArtifact({schemaVersion:C.SCHEMA_VERSION,artifactId:slug+'-illustrated',type:'allopack',title:pack.allopack.title,language:'en',data:pack});expect(result.ok,JSON.stringify(result.errors)).toBe(true);expect(pack.allopack.illustrations.review).toContain('educator review pending');expect(get('directions').data.body).toContain(manifest.note);});
});

describe('Simple Machines model accuracy',()=>{
 it('uses exact ramp geometry and equal-work tile counts',()=>{
 const {JSDOM}=require('jsdom'),svg=key=>new JSDOM(fs.readFileSync(folder+manifest.assets.find(a=>a.sourceKey===key).vectorFile,'utf8'),{contentType:'image/svg+xml'}).window.document;
 const d=svg('rampDiagram').getElementById('ramp-face').getAttribute('d'),nums=d.match(/[0-9.]+/g).map(Number);
 const run=nums[2]-nums[0],rise=nums[1]-nums[3];expect(Math.hypot(run,rise)/rise).toBeCloseTo(2,8);
 const tiles=[...svg('trade').querySelectorAll('rect')].filter(e=>e.getAttribute('width')==='70');
 expect(tiles).toHaveLength(16);expect(tiles.filter(e=>e.getAttribute('fill')==='#65999d')).toHaveLength(8);
 expect(tiles.filter(e=>e.getAttribute('fill')==='#c9964e')).toHaveLength(8);
 });
 it('distinguishes pulley arrangements and bounds the model experiment',()=>{
 const fixed=manifest.assets.find(a=>a.kind==='lesson'&&a.sourceKey==='fixed'),moving=manifest.assets.find(a=>a.sourceKey==='movable');
 expect(fixed.caption).toContain('does not multiply force');expect(moving.caption).toContain('two rope segments');
 expect(get('anchor-chart').data.sections[4].bullets[2]).toContain('Supporting rope segments');
 const c=get('applied-challenge').data;
 expect(c.instructions).toContain('250 grams');expect(c.instructions).toContain('10 centimeters');
 expect(c.brief.context).toContain('newtons');expect(c.instructions).toContain('Do not lift a full');
 expect(get('quiz').data.questions[4].correctAnswer).toContain('thermal energy');
 expect(read(folder+'content-refinements.json').length).toBeGreaterThan(20);
 });
});
