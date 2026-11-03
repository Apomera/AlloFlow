import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// React lives under desktop/web-app, not the repo root (same trick as tests/activities_resource.test.js).
const requireApp=createRequire(path.join(process.cwd(),'desktop','web-app','package.json'));
const React=requireApp('react');
const ReactDOMServer=requireApp('react-dom/server');
const babel=require('@babel/core');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const pack=read('allopacks/current/weather_vs_climate_grade5.allopack.json');
const glossary=pack.history.find(r=>r.type==='glossary').data;
const refs=pack.history.filter(r=>/-visual-reference$/.test(r.id));
const panels=pack.history.filter(r=>r.type==='image'&&!refs.includes(r)).flatMap(r=>r.data.visualPlan.panels);
// The 2026-11-02 collection pass re-encoded this pack's pictures (<=768 px WebP), so they no longer byte-match the media files.
const webpSize=x=>{const b=Buffer.isBuffer(x)?x:Buffer.from(x.slice(x.indexOf(',')+1),'base64'),t=b.toString('ascii',12,16);if(t==='VP8 ')return[b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];if(t==='VP8L'){const v=b.readUInt32LE(21);return[(v&0x3fff)+1,((v>>14)&0x3fff)+1];}if(t==='VP8X')return[1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];return null;};
const fit=([w,h])=>Math.max(w,h)<=768?[w,h]:[Math.round(w*768/Math.max(w,h)),Math.round(h*768/Math.max(w,h))];
const source=fs.readFileSync('view_glossary_source.jsx','utf8');
const helper=source.slice(0,source.indexOf('// Lazy Lucide'));
const getAlt=new Function(helper+'\nreturn getGlossaryImageAlt;')();
const window={React,AlloModules:{}};
vm.runInNewContext(fs.readFileSync('alt_text_module.js','utf8'),{window,console});
const {hashImage}=window.AlloModules.AltText;
describe('illustrated weather and climate accessibility and portability',()=>{
 it('contains ten glossary pictures and fourteen lesson panels with matching image-specific descriptions',()=>{
  expect(glossary).toHaveLength(10);expect(panels).toHaveLength(14);
  for(const item of glossary){expect(getAlt(item)).toBe(item.imageAlt);expect(item.imageAlt.length).toBeGreaterThan(20);expect(item.imageAlt.length).toBeLessThanOrEqual(250);expect(item.imageAltHash).toBe(hashImage(item.image));}
  for(const p of panels){expect(p.alt.length).toBeGreaterThan(20);expect(p.alt.length).toBeLessThanOrEqual(250);expect(p.altHash).toBe(hashImage(p.imageUrl));expect(p.altSource).toBe('vision');expect(p.decorative).toBe(false);}
 });
 it('never names the term inside its own picture description (flashcard quiz mode shows the image)',()=>{
  for(const item of glossary){expect(item.imageAlt.toLowerCase()).not.toContain(item.term.toLowerCase());}
 });
 it('embeds each reviewed file, re-encoded to at most 768 px, without network image dependencies',()=>{
  const manifest={assets:read('allopacks/media/weather_vs_climate_grade5/embedded-assets.json')};
  const slots=[...glossary.map(i=>({url:i.image,alt:i.imageAlt})),...panels.map(i=>({url:i.imageUrl,alt:i.alt}))];
  expect(manifest.assets).toHaveLength(24);expect(new Set(slots.map(s=>s.url)).size).toBe(24);
  for(const s of slots)expect(s.url).toMatch(/^data:image\/webp;base64,/);
  for(const a of manifest.assets){
   const want=fit(webpSize(fs.readFileSync('allopacks/media/weather_vs_climate_grade5/'+a.file)));
   expect(slots.some(s=>s.alt===a.alt&&String(webpSize(s.url))===String(want)),a.file).toBe(true);
  }
  expect(Math.max(...slots.map(s=>Math.max(...webpSize(s.url))))).toBeLessThanOrEqual(768);
 });
 it('adds conceptual visual-reference companions that resolve to their activity and stay pending review',()=>{
  expect(refs.map(r=>r.id)).toEqual(['wx-memory-visual-reference','wx-challenge-visual-reference']);
  const refPanels=refs.flatMap(r=>r.data.visualPlan.panels);
  for(const r of refs){expect(pack.history.some(x=>x.id===r.id.replace(/-visual-reference$/,'')),r.id).toBe(true);expect(r.meta).toContain('educator review pending');}
  for(const p of refPanels){expect(p.altHash).toBe(hashImage(p.imageUrl));expect(p.altSource).toBe('vision');expect(p.alt.length).toBeGreaterThan(20);expect(p.alt.length).toBeLessThanOrEqual(250);expect(p.caption).toMatch(/ only\. /);expect(p.labels).toBeUndefined();}
  for(const c of pack.history.find(r=>r.type==='memory-aid').data.cards.filter(c=>c.visualImage)){expect(c.visualNeedsReview).toBe(true);expect(refPanels.some(p=>p.imageUrl===c.visualImage&&p.alt===c.visualAlt)).toBe(true);}
  const visual=pack.history.find(r=>r.type==='applied-challenge').data.visual;expect(visual.reviewed).toBe(false);expect(refPanels.some(p=>p.imageUrl===visual.image&&p.alt===visual.alt)).toBe(true);
 });
 it('keeps native editable labels and captions separate from images',()=>{
  const labels=panels.flatMap(p=>p.labels);
  expect(labels.length).toBeGreaterThan(0);
  for(const l of labels){expect(l.text).toBeTruthy();expect(l.anchorX).toBeGreaterThanOrEqual(0);expect(l.anchorX).toBeLessThanOrEqual(100);expect(l.anchorY).toBeGreaterThanOrEqual(0);expect(l.anchorY).toBeLessThanOrEqual(100);}
  for(const p of panels)expect(p.caption).toBeTruthy();
 });
 it('meets the actual artifact contract',()=>{
  const Contracts=require('../agent_core_contracts_module.js');
  const report=Contracts.validateArtifact({schemaVersion:Contracts.SCHEMA_VERSION,artifactId:'allopack-water-cycle-grade6-illustrated',type:'allopack',title:pack.allopack.title,language:'en',data:pack});
  expect(report.ok,JSON.stringify(report.errors)).toBe(true);
 });
 it('does not announce stale or decorative glossary descriptions',()=>{
  const item=glossary[0];
  expect(getAlt({...item,image:glossary[1].image})).toBe('');
  expect(getAlt({...item,imageDecorative:true})).toBe('');
  expect(getAlt({image:item.image})).toBe('');
  expect(getAlt({...item,imageAlt:'   '})).toBe('');
 });
 it('renders descriptions in the actual table and both flashcard image tags',()=>{
  const tags=[...source.matchAll(/<img[\s\S]*?\/>/g)].map(m=>m[0]);
  expect(tags).toHaveLength(3);
  for(const tag of tags){
   const code=babel.transformSync('function Render(){return ('+tag+');}',{plugins:['@babel/plugin-transform-react-jsx'],babelrc:false,configFile:false}).code;
   const render=new Function('React','item','generatedContent','flashcardIndex','glossaryImageSize',helper+'\n'+code+'\nreturn Render;')(React,glossary[0],{data:glossary},0,150);
   const html=ReactDOMServer.renderToStaticMarkup(React.createElement(render));
   expect(html).toContain('alt="'+glossary[0].imageAlt+'"');
   expect(html).not.toContain('role="presentation"');
  }
 // Babel-transforms three JSX tags and server-renders each one. That is well over
 // vitest's 5s default on this OneDrive tree, where it failed intermittently.
 }, 30000);
 it('preserves images and alt text through JSON serialization',()=>{
  const restored=JSON.parse(JSON.stringify(pack));
  expect(restored.history).toEqual(pack.history);
 });
 it('preserves the original activity IDs and corrects key definitions',()=>{
  // The text-only edition was retired 2026-11-02; its activity ids/types are pinned from git HEAD.
  const source={"wx-directions":"directions","wx-reading":"simplified","wx-glossary":"glossary","wx-anchor":"anchor-chart","wx-memory":"memory-aid","wx-sort":"concept-sort","wx-quiz":"quiz","wx-frames":"sentence-frames","wx-faq":"faq","wx-notes":"note-taking","wx-challenge":"applied-challenge"};
  for(const [id,type] of Object.entries(source))expect(pack.history.some(p=>p.id===id&&p.type===type),id).toBe(true);
  const ids=pack.history.map(r=>r.id);expect(new Set(ids).size).toBe(ids.length);
  for(const l of [...pack.history.find(r=>r.type==='directions').data.objectives.map(o=>o.resourceRef),...pack.history.map(r=>r.data?.lessonRef?.resourceId)].filter(Boolean))expect(ids,l).toContain(l);
  expect(glossary.find(g=>g.term==='Atmosphere').def).toContain('troposphere');
  expect(glossary.find(g=>g.term==='Average').def).toContain('dividing');
 });
});
