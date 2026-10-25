import {describe,it,expect,vi} from 'vitest';import fs from 'node:fs';import {createRequire} from 'node:module';
const {tagsFor,reconcileCapabilityTags,entryFromPack,resourceDetails,catalogLicense}=createRequire(import.meta.url)('../catalog/allopack_entry.js');
const pack={allopack:{standards:'NGSS'},history:[{id:'r',type:'simplified',data:'Read'},{id:'m',type:'memory-aid',data:{}},{id:'g',type:'glossary',data:[{image:'data:image/webp;base64,AAAA'}]}]};
describe('catalog tags reflect current pack contents',()=>{
 it('detects inline illustrations without a standalone image resource',()=>{expect(tagsFor(pack,'water_grade6')).toContain('illustrated');expect(tagsFor(pack,'water_grade6')).not.toContain('text-only');});
 it('keeps custom topical tags while correcting stale capability tags',()=>{expect(reconcileCapabilityTags(pack,['water','Text-Only','applied-challenge','pilot','memory-aid','MEMORY-AID'])).toEqual(['water','pilot','memory-aid','illustrated']);});
 it('does not advertise planned images',()=>{expect(tagsFor({history:[{type:'image',data:{imagenPrompt:'Please draw water',imageUrl:'pending'}}]},'water_grade6')).toContain('text-only');});
 it('updates tags after a resource is added or removed',()=>{const p=structuredClone(pack);p.history.push({type:'applied-challenge',data:{}});expect(reconcileCapabilityTags(p,['water'])).toContain('applied-challenge');p.history=p.history.filter(r=>r.type!=='memory-aid');expect(reconcileCapabilityTags(p,['memory-aid'])).not.toContain('memory-aid');});
 it('does not let an entry override conceal or invent capabilities',()=>{const entry=entryFromPack(process.cwd(),{path:'allopacks/illustrated/water_cycle_grade6.allopack.json',title:'Curated title',tags:['water','text-only']});expect(entry.title).toBe('Curated title');expect(entry.tags).toEqual(['water','memory-aid','applied-challenge','illustrated']);});
 it('keeps every published entry accurate',()=>{const index=JSON.parse(fs.readFileSync('catalog/index.json','utf8'));for(const e of index.entries.filter(e=>e.path.endsWith('.allopack.json'))){const p=JSON.parse(fs.readFileSync(e.path,'utf8'));expect(e.tags).toEqual(reconcileCapabilityTags(p,e.tags));}});
});

it('recognizes remote and repository image references',()=>{for(const image of ['https://images.example.test/asset/1','media/lesson.webp'])expect(tagsFor({history:[{type:'glossary',data:[{image}]}]},'lesson_grade3')).toContain('illustrated');});

describe('public library version details',()=>{
 it('counts only unique core IDs that actually exist in this version',()=>{
  const detail=resourceDetails({allopack:{workflowRevision:{coreResourceIds:['a','a','b','missing',null,12]}},history:[{id:'a',type:'directions'},{id:'b',type:'quiz'},{id:'support',type:'glossary'}]});
  expect(detail.core_resource_count).toBe(2); expect(detail.resource_count).toBe(3);
 });
 it('does not invent a core route without usable workflow metadata',()=>{
  for(const workflowRevision of [undefined,{}, {coreResourceIds:'a'}, {coreResourceIds:[]}, {coreResourceIds:['missing',null]}]) {
   expect(resourceDetails({allopack:{workflowRevision},history:[{id:'a',type:'directions'}]})).not.toHaveProperty('core_resource_count');
  }
  expect(entryFromPack(process.cwd(),{path:'allopacks/illustrated/water_cycle_grade6.allopack.json',core_resource_count:9000})).not.toHaveProperty('core_resource_count');
 });
 it('counts actual resources and does not invent an update date',()=>{
  const detail=resourceDetails({allopack:{createdAt:'2026-09-04'},history:[{type:'quiz'},{type:'quiz'},{type:'glossary'}]});
  expect(detail.resource_count).toBe(3);
  expect(detail.resource_types).toEqual([{type:'glossary',count:1},{type:'quiz',count:2}]);
  expect(detail.created_at).toBe('2026-09-04T00:00:00.000Z'); expect(detail.updated_at).toBeNull();
 });
 it('keeps safe source attribution while omitting executable or credential-bearing links',()=>{
  const detail=resourceDetails({allopack:{sourceBasis:{articleUrl:'https://example.test/article',sources:[{url:'javascript:alert(1)'},{url:'https://secret:password@example.test/'},{url:'https://example.test/article',title:'Duplicate'},{url:'https://example.test/other',title:'Second source',author:'Author'}]}},history:[]});
  expect(detail.source_links).toEqual([{url:'https://example.test/article',title:'Original blog post'},{url:'https://example.test/other',title:'Second source',author:'Author'}]);
 });
 it('does not allow curated overrides to report counts from a different edition',()=>{
  const e=entryFromPack(process.cwd(),{path:'allopacks/illustrated/water_cycle_grade6.allopack.json',resource_count:9000,updated_at:'2035-01-01'});
  expect(e.resource_count).toBeLessThan(9000); expect(e.updated_at).not.toBe('2035-01-01');
 });
});

describe('public review status and reuse terms',()=>{
 function entry(meta={}, published={}) {
  const read=vi.spyOn(fs,'readFileSync').mockReturnValueOnce(JSON.stringify({allopack:{title:'Sample',...meta},history:[]}));
  try { return entryFromPack(process.cwd(),{path:'allopacks/sample.allopack.json',...published}); }
  finally {read.mockRestore();}
 }
 it('does not invent Creative Commons terms when a pack omits its license',()=>{
  expect(entry().license).toBe('Not specified');
  expect(entry().review_status).toBeNull();
 });
 it('moves a legacy review placeholder into review metadata without granting reuse rights',()=>{
  const e=entry({license:'Teacher review required'});
  expect(e.license).toBe('Not specified');expect(e.review_status).toBe('Educator review pending');
 });
 it('preserves explicit pack and curated license terms separately from the pack review status',()=>{
  expect(entry({license:'CC-BY-4.0'}).license).toBe('CC-BY-4.0');
  const e=entry({license:'Not specified',reviewStatus:'Educator review pending'},{license:'CC-BY-SA-4.0',review_status:'Approved'});
  expect(e.license).toBe('CC-BY-SA-4.0');expect(e.review_status).toBe('Educator review pending');
 });
 it('recognizes only exact placeholders and preserves other supplied terms',()=>{
  for(const value of [undefined,'','Not specified',' unspecified ','Educator review required'])expect(catalogLicense(value)).toBe('Not specified');
  for(const value of ['All rights reserved','See author’s reuse terms','CC-BY-4.0'])expect(catalogLicense(value)).toBe(value);
 });
});
