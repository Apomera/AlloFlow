import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),apply=require('../dev-tools/backfill_allopack_resource_images.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const maps=read('allopacks/media/resource_backfill/mappings.json'),encoded=read('allopacks/media/resource_backfill/encoded.json');
for(const [slug,map]of Object.entries(maps))describe(slug+' native resource images',()=>{
const pack=read('allopacks/illustrated/'+slug+'.allopack.json'),anchor=pack.history.find(r=>r.type==='anchor-chart'),sort=pack.history.find(r=>r.type==='concept-sort');
it('fills every anchor and sort mapping in native fields',()=>{expect(encoded[slug].sort.every(Boolean)).toBe(true);expect(pack.allopack.resourceIllustrations.pendingSortImages).toBe(0);expect(anchor.data.sections).toHaveLength(map.anchor.length);anchor.data.sections.forEach((s,i)=>{expect(s.iconUrl).toBe(encoded[slug].anchor[i].url);expect(s.iconAlt).toBeTruthy();});sort.data.items.forEach((s,i)=>{const a=encoded[slug].sort[i];if(a){expect(s.image).toBe(a.url);expect(s.imageAlt).toBe(a.alt);expect(s.imageAltHash).toBe(a.hash);}else expect(s.image).toBeFalsy();});expect(pack.allopack.resourceIllustrations.pendingSortImages).toBe(encoded[slug].sort.filter(a=>!a).length);});
it('preserves text and images when the build hook is reapplied',()=>{const before=JSON.stringify(pack);expect(JSON.stringify(apply(structuredClone(pack),slug))).toBe(before);const stripped=structuredClone(pack);for(const r of stripped.history){if(r.type==='anchor-chart')for(const s of r.data.sections)delete s.iconUrl;if(r.type==='concept-sort')for(const s of r.data.items)delete s.image;}expect(apply(stripped,slug)).toEqual(pack);expect(JSON.stringify(pack).length).toBeLessThan(2000000);});
});
