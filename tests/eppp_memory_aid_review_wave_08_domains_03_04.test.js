import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const read=(p)=>JSON.parse(fs.readFileSync(resolve(process.cwd(),p),'utf8'));
describe('EPPP memory-aid Wave 08 Domains 3-4',()=>{
  const catalogById=new Map(read('test_prep/eppp_learning_library.json').memoryAids.map(x=>[x.id,x]));
  for(const [domainId,count] of [[3,15],[4,16]]){
    it(`completely and explicitly reviews Domain ${domainId}`,()=>{
      const module=read(`dev-tools/eppp_memory_aid_wave08/domain_0${domainId}.json`);
      expect(module.items.every(x=>catalogById.get(x.legacyId)?.domainId===domainId)).toBe(true);
      expect(module.items).toHaveLength(count);
      expect(new Set(module.items.map(x=>x.legacyId)).size).toBe(count);
      for(const item of module.items){
        expect(item.content.length).toBeGreaterThan(260);
        expect(item.content).not.toMatch(/[\p{Extended_Pictographic}\uFE0F]|&(?:mdash|ndash|nbsp);|â€”|â€“|â†’|Â /u);
        expect(item.references).toEqual(item.sourceDetails.map(x=>x.url));
        expect(item.sourceDetails.every(x=>x.whyReputable.length>100)).toBe(true);
        expect(item.reviewStatus).toBe('source-reviewed-editorial-pass');
        expect(item.independentExpertStatus).toBe('not-started');
        expect(item.productionStatus).toBe('not-production-validated');
      }
    });
  }
  it('uses item-aligned provenance rather than a single domain fallback',()=>{
    const items=[...read('dev-tools/eppp_memory_aid_wave08/domain_03.json').items,...read('dev-tools/eppp_memory_aid_wave08/domain_04.json').items];
    expect(new Set(items.flatMap(x=>x.references)).size).toBeGreaterThanOrEqual(20);
    expect(items.find(x=>x.legacyId==='memory-aid-07776f320105d254').references[0]).toContain('law.cornell.edu');
    expect(items.find(x=>x.legacyId==='memory-aid-d8d0bdcc53d6d2de').references[0]).toContain('10.1016/0010-0277');
  });
});
