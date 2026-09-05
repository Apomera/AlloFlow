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
const pack=read('allopacks/illustrated/water_cycle_grade6.allopack.json');
const glossary=pack.history.find(r=>r.type==='glossary').data;
const panels=pack.history.filter(r=>r.type==='image').flatMap(r=>r.data.visualPlan.panels);
const source=fs.readFileSync('view_glossary_source.jsx','utf8');
const helper=source.slice(0,source.indexOf('// Lazy Lucide'));
const getAlt=new Function(helper+'\nreturn getGlossaryImageAlt;')();
const window={React,AlloModules:{}};
vm.runInNewContext(fs.readFileSync('alt_text_module.js','utf8'),{window,console});
const {hashImage}=window.AlloModules.AltText;
describe('illustrated water cycle accessibility and portability',()=>{
 it('contains ten glossary pictures and fourteen lesson panels with matching image-specific descriptions',()=>{
  expect(glossary).toHaveLength(10);expect(panels).toHaveLength(14);
  for(const item of glossary){expect(getAlt(item)).toBe(item.imageAlt);expect(item.imageAlt.length).toBeGreaterThan(20);expect(item.imageAlt.length).toBeLessThanOrEqual(250);expect(item.imageAltHash).toBe(hashImage(item.image));}
  for(const p of panels){expect(p.alt.length).toBeGreaterThan(20);expect(p.alt.length).toBeLessThanOrEqual(250);expect(p.altHash).toBe(hashImage(p.imageUrl));expect(p.altSource).toBe('vision');expect(p.decorative).toBe(false);}
 });
 it('never names the term inside its own picture description (flashcard quiz mode shows the image)',()=>{
  for(const item of glossary){expect(item.imageAlt.toLowerCase()).not.toContain(item.term.toLowerCase());}
 });
 it('embeds exactly the reviewed files without network image dependencies',()=>{
  const manifest=read('allopacks/media/water_cycle_grade6/manifest.json');
  const urls=[...glossary.map(i=>i.image),...panels.map(i=>i.imageUrl)];
  expect(new Set(urls).size).toBe(24);
  for(const a of manifest.assets){
   const expected='data:image/webp;base64,'+fs.readFileSync('allopacks/media/water_cycle_grade6/'+a.file).toString('base64');
   expect(urls).toContain(expected);
  }
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
 });
 it('preserves images and alt text through JSON serialization',()=>{
  const restored=JSON.parse(JSON.stringify(pack));
  expect(restored.history).toEqual(pack.history);
 });
 it('keeps the original catalog entry and adds a distinct grade-six pilot',()=>{
  const catalog=read('catalog/index.json');
  expect(catalog.entries.find(e=>e.slug==='water_cycle').path).toBe('catalog/approved/water_cycle.json');
  expect(catalog.entries.find(e=>e.slug==='water_cycle_grade6_illustrated').path).toBe('allopacks/illustrated/water_cycle_grade6.allopack.json');
 });
});

