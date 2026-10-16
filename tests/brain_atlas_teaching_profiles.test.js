import { beforeEach, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const file='stem_lab/stem_tool_brainatlas.js';
const source=readFileSync(file,'utf8');
const block=source.split('// BEGIN BRAIN ATLAS STRUCTURE PROFILES')[1].split('// END BRAIN ATLAS STRUCTURE PROFILES')[0];
const {profiles,sources}=Function(block+';return {profiles:BRAIN_ATLAS_TEACHING_PROFILES,sources:BRAIN_ATLAS_PROFILE_SOURCES}')();
const start=source.indexOf('var VIEWS = {'),end=source.indexOf('\n          };',start)+14;
const views=Function('t',source.slice(start,end)+';return VIEWS')((key,fallback)=>fallback);
const mainViews=['lateral','medial','superior','inferior'];
const topics=Object.entries(views).filter(([view])=>!mainViews.includes(view)).flatMap(([view,data])=>data.regions.map(r=>({view,id:r.id})));
const fields=['functionText','connectionsText','clinicalText'];
beforeEach(resetStemLab);

describe('specific explanations throughout the teaching diagrams',()=>{
 it('covers every selectable teaching topic with distinct complete content and resolved sources',()=>{
  expect(topics).toHaveLength(167);
  expect(Object.keys(profiles).sort()).toEqual(topics.map(r=>r.id).sort());
  const unique=new Set();
  for(const {id}of topics){
   const p=profiles[id];
   for(const field of fields){
    expect(p[field].length,id+' '+field).toBeGreaterThan(200);
    expect(p[field]).not.toMatch(/Use neighboring structures|This is a named anatomical part|Its learning value comes from|\.{3}$|…$/);
   }
   unique.add(fields.map(f=>p[f]).join('|'));
   expect(p.sourceIds.length,id+' sources').toBeGreaterThan(0);
   const urls=p.sourceIds.map(sid=>{
    expect(sources[sid],id+' '+sid).toBeTruthy();
    expect(sources[sid].title.length).toBeGreaterThan(10);
    expect(new URL(sources[sid].url).protocol).toBe('https:');
    return sources[sid].url;
   });
   expect(new Set(urls).size,id+' duplicate URLs').toBe(urls.length);
  }
  expect(unique.size).toBe(topics.length);
 });

 it.each(Object.entries(views).filter(([view])=>!mainViews.includes(view)))('renders every complete topic in %s, with appropriate disclosure and references',(view,data)=>{
  loadTool(file,'brainAtlas');
  const host=document.createElement('div');
  for(const {id}of data.regions){
  for(const detailMode of ['plain','advanced']){
   host.innerHTML=renderTool('brainAtlas',{brainAtlas:{view,selectedRegion:id,detailMode,atlasDisplayMode:'diagram'}});
   const disclosure=host.querySelector('[data-brainatlas-region-profile="'+id+'"]');
   expect(disclosure,id+' '+detailMode).not.toBeNull();
   expect(disclosure.tagName).toBe('DETAILS');
   expect(disclosure.open).toBe(detailMode==='advanced');
   expect(disclosure.querySelector('summary strong').textContent).toBe('Topic in depth');
   for(const field of fields)expect(disclosure.querySelector('[data-brainatlas-region-profile-field="'+field+'"]').textContent,id+' '+field).toBe(profiles[id][field]);
   const links=[...disclosure.querySelectorAll('a')];
   expect(links.map(a=>a.getAttribute('href'))).toEqual(profiles[id].sourceIds.map(sid=>sources[sid].url));
   expect(links.every(a=>a.target==='_blank'&&a.rel.includes('noopener')&&a.rel.includes('noreferrer'))).toBe(true);
   expect(disclosure.textContent).toContain('Connected systems');
   expect(disclosure.textContent).toContain('Clinical context');
   expect(disclosure.textContent).toContain(view==='neuromyths'?'What the evidence shows':'Function & role');
   host.replaceChildren();
  }
  }
 },60000);
});
