import {describe,it,expect} from 'vitest';import fs from 'node:fs';import {createRequire} from 'node:module';
const {tagsFor,reconcileCapabilityTags,entryFromPack}=createRequire(import.meta.url)('../catalog/allopack_entry.js');
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
