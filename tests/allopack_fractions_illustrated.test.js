import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const appRequire=createRequire(process.cwd()+'/desktop/web-app/package.json'),window={React:appRequire('react'),AlloModules:{}};
vm.runInNewContext(fs.readFileSync('alt_text_module.js','utf8'),{window,console});
const hash=window.AlloModules.AltText.hashImage;
// The 2026-11-02 collection pass re-encoded this edition's pictures (<=768 px WebP), so slots no longer byte-match the media files.
const webpSize=x=>{const b=Buffer.isBuffer(x)?x:Buffer.from(x.slice(x.indexOf(',')+1),'base64'),t=b.toString('ascii',12,16);if(t==='VP8 ')return[b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];if(t==='VP8L'){const v=b.readUInt32LE(21);return[(v&0x3fff)+1,((v>>14)&0x3fff)+1];}if(t==='VP8X')return[1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];return null;},fit=([w,h])=>Math.max(w,h)<=768?[w,h]:[Math.round(w*768/Math.max(w,h)),Math.round(h*768/Math.max(w,h))];
const glossarySource=fs.readFileSync('view_glossary_source.jsx','utf8');
const getAlt=new Function(glossarySource.slice(0,glossarySource.indexOf('// Lazy Lucide'))+'\nreturn getGlossaryImageAlt;')();
const slug='fractions_number_line_grade4',folder='allopacks/media/'+slug+'/',pack=read('allopacks/current/'+slug+'.allopack.json'),manifest=read(folder+'manifest.json');
const get=t=>pack.history.find(r=>r.type===t),refs=pack.history.filter(r=>/-visual-reference$/.test(r.id)),panels=pack.history.filter(r=>r.type==='image'&&!refs.includes(r)).flatMap(r=>r.data.visualPlan.panels);
const slots=[...get('glossary').data.map(g=>({url:g.image,alt:g.imageAlt,hash:g.imageAltHash})),...get('anchor-chart').data.sections.map(s=>({url:s.iconUrl,alt:s.iconAlt,hash:s.iconAltHash})),...get('concept-sort').data.items.map(s=>({url:s.image,alt:s.imageAlt,hash:s.imageAltHash})),...panels.map(p=>({url:p.imageUrl,alt:p.alt,hash:p.altHash}))];
describe('Fractions on the Number Line illustrated edition',()=>{
it('fills all 32 native slots with reviewed, portable, correctly described images',()=>{for(const g of get('glossary').data)expect(getAlt(g)).toBe(g.imageAlt);expect(slots).toHaveLength(32);expect(panels).toHaveLength(8);expect(get('anchor-chart').data.sections).toHaveLength(5);expect(get('concept-sort').data.items).toHaveLength(9);for(const s of slots){expect(s.url).toMatch(/^data:image\/webp;base64,/);expect(s.alt.length).toBeGreaterThan(20);expect(s.alt.length).toBeLessThanOrEqual(250);expect(s.hash).toBe(hash(s.url));}expect(pack.allopack.resourceIllustrations.pendingSortImages).toBe(0);expect(JSON.stringify(pack).length).toBeLessThan(2000000);});
it('embeds each reviewed file, re-encoded to at most 768 px, and retains an auditable manifest',()=>{const records=read(folder+'embedded-assets.json');expect(records).toHaveLength(32);expect(manifest.status).toBe('complete');for(const a of manifest.assets){expect(a.status).toBe('visual-review-passed');expect(a.prompt).toBeTruthy();expect(fs.existsSync(folder+a.file)).toBe(true);}for(const r of records){const want=fit(webpSize(fs.readFileSync(folder+r.file)));expect(slots.some(s=>s.alt===r.alt&&String(webpSize(s.url))===String(want)),r.id).toBe(true);}expect(Math.max(...slots.map(s=>Math.max(...webpSize(s.url))))).toBeLessThanOrEqual(768);});
it('keeps the source learning resources with valid answer keys, categories, and references',()=>{
// The text-only edition (allopacks/fractions_number_line_grade4.allopack.json) was retired 2026-11-02; its resource ids/types, glossary terms, sort categories and quiz length are pinned from git HEAD.
const source={"fr-directions":"directions","fr-reading":"simplified","fr-glossary":"glossary","fr-anchor":"anchor-chart","fr-memory":"memory-aid","fr-math":"math","fr-sort":"concept-sort","fr-quiz":"quiz","fr-frames":"sentence-frames","fr-faq":"faq","fr-challenge":"applied-challenge"};for(const[id,type]of Object.entries(source))expect(pack.history.find(x=>x.id===id)?.type,id).toBe(type);
const ids=pack.history.map(r=>r.id);expect(new Set(ids).size).toBe(ids.length);
expect(get('glossary').data.map(g=>g.term)).toEqual(["Fraction","Numerator","Denominator","Equivalent","Whole","Equal","Unit","Halves","Fourths","Compare"]);for(const g of get('glossary').data)expect(g.def,g.term).toBeTruthy();
const quiz=get('quiz').data.questions;expect(quiz).toHaveLength(7);for(const q of quiz){expect(q.question).toBeTruthy();if(q.type==='mcq'){expect(q.options.filter(x=>x===q.correctAnswer),q.question).toHaveLength(1);expect(new Set(q.options).size).toBe(q.options.length);}else expect(q.expectedAnswer,q.question).toBeTruthy();}
const sort=get('concept-sort').data,cats=["fr-less","fr-equal","fr-more"];expect(sort.categories.map(c=>c.id)).toEqual(cats);for(const i of sort.items)expect(cats,i.id).toContain(i.categoryId);for(const c of cats)expect(sort.items.some(i=>i.categoryId===c),c).toBe(true);
for(const s of get('anchor-chart').data.sections){expect(s.label).toBeTruthy();expect(s.bullets.length).toBeGreaterThan(0);}
const links=[...get('directions').data.objectives.map(o=>o.resourceRef),...pack.history.map(r=>r.data?.lessonRef?.resourceId)].filter(Boolean);expect(links.length).toBeGreaterThan(0);for(const l of links)expect(ids,l).toContain(l);
expect(panels.every(p=>p.caption&&p.title&&p.altSource==='vision')).toBe(true);expect(get('directions').data.body).not.toContain('Images are planned');});
it('adds conceptual visual-reference companions that resolve to their activity and stay pending review',()=>{
expect(refs.map(r=>r.id)).toEqual(["fr-memory-visual-reference","fr-challenge-visual-reference"]);expect(pack.allopack.resourceIllustrations.visibleConceptReferenceResources).toBe(refs.length);
const refPanels=refs.flatMap(r=>r.data.visualPlan.panels);
for(const r of refs){expect(pack.history.some(x=>x.id===r.id.replace(/-visual-reference$/,'')),r.id).toBe(true);expect(r.meta).toContain('educator review pending');}
for(const p of refPanels){expect(p.imageUrl).toMatch(/^data:image\/webp;base64,/);expect(p.altHash).toBe(hash(p.imageUrl));expect(p.alt.length).toBeGreaterThan(20);expect(p.alt.length).toBeLessThanOrEqual(250);expect(p.altSource).toBe('vision');expect(p.title).toBeTruthy();expect(p.caption).toMatch(/ only\. /);expect(p.labels).toBeUndefined();}
for(const c of get('memory-aid').data.cards.filter(c=>c.visualImage)){expect(c.visualNeedsReview).toBe(true);expect(refPanels.some(p=>p.imageUrl===c.visualImage&&p.alt===c.visualAlt)).toBe(true);}
const visual=get('applied-challenge').data.visual;if(visual){expect(visual.reviewed).toBe(false);expect(refPanels.some(p=>p.imageUrl===visual.image&&p.alt===visual.alt)).toBe(true);}});
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
expect(get('faq').data[1].answer).toContain('decimals that keep repeating');
expect(get('faq').data[1].answer).toContain('1/3');
expect(get('faq').data[4].question).toContain('strictly between');
const changes=read(folder+'content-refinements.json');
expect(changes.length).toBe(pack.allopack.contentRefinements.count);
// Text edition retired 2026-11-02: the "from" side is gone, so each logged refinement must still hold its "to" value (memory-cue pictures added 2026-11-02 ignored).
for(const c of changes){let now=pack.history.find(r=>r.id===c.resourceId);for(const key of c.path.split('.'))now=now[key];expect(c.to).not.toEqual(c.from);const art=n=>JSON.parse(JSON.stringify(n),(k,v)=>/^visual(Image|Alt|NeedsReview)/.test(k)||(c.stripArtwork&&/^(image|iconUrl|iconAlt)/.test(k))?undefined:v);expect(art(now),c.resourceId+' '+c.path).toEqual(art(c.to));}
});
});
