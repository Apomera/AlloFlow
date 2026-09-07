import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const requireApp=createRequire(process.cwd()+'/desktop/web-app/package.json');
const window={React:requireApp('react'),AlloModules:{}};
vm.runInNewContext(fs.readFileSync('alt_text_module.js','utf8'),{window,console});
const {hashImage}=window.AlloModules.AltText;
const source=fs.readFileSync('view_glossary_source.jsx','utf8');
const helper=source.slice(0,source.indexOf('// Lazy Lucide'));
const getAlt=new Function(helper+'\nreturn getGlossaryImageAlt;')();
for(const [slug,terms,count] of [['forces_motion_grade3',10,14]]){
const pack=read('allopacks/illustrated/'+slug+'.allopack.json');
const glossary=pack.history.find(r=>r.type==='glossary').data;
const panels=pack.history.filter(r=>r.type==='image').flatMap(r=>r.data.visualPlan.panels);
describe(slug+' illustrated portability',()=>{
it('provides a reviewed, correctly hashed description for each of 24 images',()=>{
expect(glossary).toHaveLength(terms);expect(panels).toHaveLength(count);
for(const g of glossary){expect(g.imageAltHash).toBe(hashImage(g.image));expect(getAlt(g)).toBe(g.imageAlt);expect(g.imageAltSource).toBe('vision');expect(g.imageAlt.length).toBeGreaterThan(20);expect(g.imageAlt.length).toBeLessThanOrEqual(250);}
for(const p of panels){expect(p.altHash).toBe(hashImage(p.imageUrl));expect(p.altSource).toBe('vision');expect(p.alt.length).toBeGreaterThan(20);expect(p.alt.length).toBeLessThanOrEqual(250);}
});
it('embeds exactly the reviewed assets without remote image dependencies',()=>{
const records=read('allopacks/media/'+slug+'/embedded-assets.json'),urls=[...glossary.map(g=>g.image),...panels.map(p=>p.imageUrl)];
expect(records).toHaveLength(24);expect(new Set(urls).size).toBe(24);
for(const r of records)expect(urls).toContain('data:image/webp;base64,'+fs.readFileSync('allopacks/media/'+slug+'/'+r.file).toString('base64'));
const manifest=read('allopacks/media/'+slug+'/manifest.json');expect(manifest.assets.every(a=>a.status==='visual-review-passed'&&a.alt)).toBe(true);
});
it('preserves original resources and editable lesson text',()=>{
const original=read('allopacks/'+slug+'.allopack.json');
for(const r of original.history)expect(pack.history.some(x=>x.id===r.id&&x.type===r.type)).toBe(true);
expect(new Set(pack.history.map(r=>r.id)).size).toBe(pack.history.length);
expect(panels.every(p=>p.caption&&p.title)).toBe(true);
const labels=panels.flatMap(p=>p.labels);expect(labels.length).toBeGreaterThan(0);
for(const l of labels){expect(l.text).toBeTruthy();expect(l.anchorX).toBeGreaterThanOrEqual(0);expect(l.anchorX).toBeLessThanOrEqual(100);expect(l.anchorY).toBeGreaterThanOrEqual(0);expect(l.anchorY).toBeLessThanOrEqual(100);}
});
it('passes the production artifact contract and JSON round trip',()=>{
const C=require('../agent_core_contracts_module.js');
const report=C.validateArtifact({schemaVersion:C.SCHEMA_VERSION,artifactId:slug+'-illustrated',type:'allopack',title:pack.allopack.title,language:'en',data:pack});
expect(report.ok,JSON.stringify(report.errors)).toBe(true);
expect(JSON.parse(JSON.stringify(pack)).history).toEqual(pack.history);
});
it('suppresses stale or decorative alt descriptions',()=>{
expect(getAlt({...glossary[0],image:glossary[1].image})).toBe('');
expect(getAlt({...glossary[0],imageDecorative:true})).toBe('');
});
it('keeps quiz answers aligned with the science refinements',()=>{
const questions=pack.history.find(r=>r.type==='quiz').data.questions;
for(const q of questions.filter(q=>q.type==='mcq'))expect(q.options).toContain(q.correctAnswer);
expect(pack.history.find(r=>r.id==='fm-reading').data).toContain('same speed in a straight line');
expect(pack.history.find(r=>r.id==='fm-faq').data[4].answer).toContain('different objects');
expect(pack.history.find(r=>r.id==='fm-challenge').data.brief.seedDirection).toContain('without an extra push');
expect(pack.history.find(r=>r.id==='fm-sort').data.items.find(i=>i.id==='fm-i10').content).toContain('straight line');

});
});
}


