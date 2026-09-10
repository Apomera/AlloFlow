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
const slug='magnetism_grade6',folder='allopacks/media/'+slug+'/',pack=read('allopacks/illustrated/'+slug+'.allopack.json'),original=read('allopacks/'+slug+'.allopack.json'),manifest=read(folder+'manifest.json');
require('../dev-tools/magnetism_content_refinements.cjs').refine(original);
const get=t=>pack.history.find(r=>r.type===t),panels=pack.history.filter(r=>r.type==='image').flatMap(r=>r.data.visualPlan.panels);
const slots=[...get('glossary').data.map(g=>({url:g.image,alt:g.imageAlt,hash:g.imageAltHash})),...get('anchor-chart').data.sections.map(s=>({url:s.iconUrl,alt:s.iconAlt,hash:s.iconAltHash})),...get('concept-sort').data.items.map(s=>({url:s.image,alt:s.imageAlt,hash:s.imageAltHash})),...panels.map(p=>({url:p.imageUrl,alt:p.alt,hash:p.altHash}))];
describe('Magnetism illustrated edition',()=>{
it('fills all 34 native slots with reviewed, portable, correctly described images',()=>{for(const g of get('glossary').data)expect(getAlt(g)).toBe(g.imageAlt);expect(slots).toHaveLength(34);expect(panels).toHaveLength(8);expect(get('anchor-chart').data.sections).toHaveLength(5);expect(get('concept-sort').data.items).toHaveLength(10);for(const s of slots){expect(s.url).toMatch(/^data:image\/webp;base64,/);expect(s.alt.length).toBeGreaterThan(20);expect(s.alt.length).toBeLessThanOrEqual(250);expect(s.hash).toBe(hash(s.url));}expect(pack.allopack.resourceIllustrations.pendingSortImages).toBe(0);expect(JSON.stringify(pack).length).toBeLessThan(2000000);});
it('embeds the selected reviewed files and retains an auditable manifest',()=>{const records=read(folder+'embedded-assets.json');expect(records).toHaveLength(34);expect(manifest.status).toBe('complete');for(const a of manifest.assets){expect(a.status).toBe('visual-review-passed');expect(a.prompt).toBeTruthy();expect(fs.existsSync(folder+a.file)).toBe(true);}for(const r of records)expect(slots.some(s=>s.url==='data:image/webp;base64,'+fs.readFileSync(folder+r.file).toString('base64'))).toBe(true);});
it('preserves source learning content, answer keys, categories, and references',()=>{for(const r of original.history){const actual=pack.history.find(x=>x.id===r.id);expect(actual.type).toBe(r.type);if(['glossary','anchor-chart','concept-sort'].includes(r.type)){const clean=JSON.parse(JSON.stringify(actual),(key,value)=>/^(image|iconUrl|iconAlt)/.test(key)?undefined:value);expect(clean).toEqual(r);}else if(r.type==='directions')expect(actual.data.objectives).toEqual(r.data.objectives);else expect(actual).toEqual(r);}expect(new Set(pack.history.map(r=>r.id)).size).toBe(pack.history.length);expect(panels.every(p=>p.caption&&p.title&&p.altSource==='vision')).toBe(true);expect(get('directions').data.body).not.toContain('Images are planned');});
it('passes the production artifact envelope and keeps classroom claims bounded',()=>{const C=require('../agent_core_contracts_module.js');const result=C.validateArtifact({schemaVersion:C.SCHEMA_VERSION,artifactId:slug+'-illustrated',type:'allopack',title:pack.allopack.title,language:'en',data:pack});expect(result.ok,JSON.stringify(result.errors)).toBe(true);expect(pack.allopack.illustrations.review).toContain('educator review pending');expect(get('directions').data.body).toContain(manifest.note);});
});

describe('Magnetism model and lesson accuracy',()=>{
const svg=k=>fs.readFileSync(folder+manifest.assets.find(a=>a.sourceKey===k).vectorFile,'utf8');
it('matches facing poles to force arrows, field direction and switch state',()=>{
const poles=k=>[...svg(k).matchAll(/data-poles="([^"]+)"/g)].map(m=>m[1]);
expect(poles('attract')).toEqual(['NS','NS']);expect(poles('repel')).toEqual(['NS','SN']);expect(poles('split')).toEqual(['NS','NS','NS']);
for(const k of ['attract','repel']){
const arrows=[...svg(k).matchAll(/d="M(\d+) 340L(\d+) 340"/g)].map(m=>[+m[1],+m[2]]);
expect(arrows).toHaveLength(2);
const left=arrows.find(a=>a[0]<500),right=arrows.find(a=>a[0]>500);
expect(Math.sign(left[1]-left[0])).toBe(k==='attract'?1:-1);
expect(Math.sign(right[1]-right[0])).toBe(k==='attract'?-1:1);
}
const field=[...svg('field').matchAll(/d="M(\d+) (\d+)L(\d+) (\d+)"/g)].map(m=>m.slice(1).map(Number));
expect(field.filter(a=>a[1]!==500).every(a=>a[2]>a[0])).toBe(true);
expect(field.find(a=>a[1]===500)[2]).toBeLessThan(field.find(a=>a[1]===500)[0]);
expect(svg('on')).toContain('data-switch="closed"');expect(svg('off')).toContain('data-switch="open"');
expect(svg('off')).not.toContain('d="M400 240H600"');
expect(svg('off')).toContain('data-coil="continuous"');
expect(manifest.assets.find(a=>a.sourceKey==='off').caption).toContain('retain some magnetism');
});
it('keeps material, release and classroom claims consistent and audited',()=>{
expect(get('simplified').data).toContain('liquid outer');
expect(get('simplified').data).toContain('some stainless steels are not');
expect(get('simplified').data).toContain('mechanical release');
expect(get('concept-sort').data.items[4].content).toContain('75% copper and 25% nickel');
expect(get('concept-sort').data.items[7].content).toContain('unmagnetized cobalt');
expect(get('applied-challenge').data.brief.context).toContain('do not connect loose wire directly across a battery');
expect(get('applied-challenge').data.brief.constraints[1]).toContain('settings fixed');
for(const q of get('quiz').data.questions.filter(q=>q.type==='mcq'))expect(q.options).toContain(q.correctAnswer);
const changes=read(folder+'content-refinements.json'),pristine=read('allopacks/'+slug+'.allopack.json');
expect(changes.length).toBe(pack.allopack.contentRefinements.count);
for(const c of changes){let old=pristine.history.find(r=>r.id===c.resourceId),now=pack.history.find(r=>r.id===c.resourceId);for(const key of c.path.split('.')){old=old[key];now=now[key];}
if(c.resourceId==='mg-directions'&&c.path==='data.body')old+='\n\nPicture panels: '+manifest.groups.join('; ')+'. '+manifest.note;
expect(old).toEqual(c.from);expect(now).toEqual(c.to);}
});
});
