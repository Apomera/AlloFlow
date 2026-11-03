import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),apply=require('../dev-tools/backfill_allopack_resource_images.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^﻿/,''));
const window={AlloModules:{},React:{}};vm.runInNewContext(fs.readFileSync('alt_text_module.js','utf8'),{window,console:{log(){}}});
const {hashImage}=window.AlloModules.AltText;
const maps=read('allopacks/media/resource_backfill/mappings.json'),encoded=read('allopacks/media/resource_backfill/encoded.json');
// The 2026-11-02 collection pass re-encoded these packs' pictures to <=768 px WebP, so their anchor/sort bytes no longer equal encoded.json.
const reencoded=['water_cycle_grade6','weather_vs_climate_grade5'];
const webpSize=x=>{const b=Buffer.from(x.slice(x.indexOf(',')+1),'base64'),t=b.toString('ascii',12,16);if(t==='VP8 ')return[b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];if(t==='VP8L'){const v=b.readUInt32LE(21);return[(v&0x3fff)+1,((v>>14)&0x3fff)+1];}if(t==='VP8X')return[1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];return null;};
const fit=([w,h])=>Math.max(w,h)<=768?[w,h]:[Math.round(w*768/Math.max(w,h)),Math.round(h*768/Math.max(w,h))];
// Anchor/sort image bytes and their hashes are the only fields a re-encode may change.
const text=x=>JSON.parse(JSON.stringify(x),(k,v)=>/^(iconUrl|iconAltHash|image|imageAltHash)$/.test(k)?undefined:v);
for(const [slug,map]of Object.entries(maps))describe(slug+' native resource images',()=>{
const pack=read('allopacks/current/'+slug+'.allopack.json'),anchor=pack.history.find(r=>r.type==='anchor-chart'),sort=pack.history.find(r=>r.type==='concept-sort');
const exact=!reencoded.includes(slug),matches=(url,a)=>exact?url===a.url:/^data:image\/webp;base64,/.test(url)&&String(webpSize(url))===String(fit(webpSize(a.url)));
it('fills every anchor and sort mapping in native fields',()=>{expect(encoded[slug].sort.every(Boolean)).toBe(true);expect(pack.allopack.resourceIllustrations.pendingSortImages).toBe(0);expect(anchor.data.sections).toHaveLength(map.anchor.length);anchor.data.sections.forEach((s,i)=>{expect(matches(s.iconUrl,encoded[slug].anchor[i]),'anchor '+i).toBe(true);expect(s.iconAlt).toBeTruthy();if(!exact)expect(s.iconAltHash).toBe(hashImage(s.iconUrl));});sort.data.items.forEach((s,i)=>{const a=encoded[slug].sort[i];if(a){expect(matches(s.image,a),s.id).toBe(true);expect(s.imageAlt).toBe(a.alt);expect(s.imageAltHash).toBe(exact?a.hash:hashImage(s.image));}else expect(s.image).toBeFalsy();});expect(pack.allopack.resourceIllustrations.pendingSortImages).toBe(encoded[slug].sort.filter(a=>!a).length);});
it('preserves text and images when the build hook is reapplied',()=>{
// The collection pass also extended resourceIllustrations (glossary/memory/challenge counts, review note); the hook still owns only these fields.
const own=['version','anchorSectionImages','conceptSortCardImages','pendingSortImages','textPolicy'];
const rebuilt=apply(structuredClone(pack),slug);for(const k of own)expect(rebuilt.allopack.resourceIllustrations[k],k).toBe(pack.allopack.resourceIllustrations[k]);
if(exact)expect(rebuilt.history).toEqual(pack.history);else expect(text(rebuilt.history)).toEqual(text(pack.history));
const stripped=structuredClone(pack);for(const r of stripped.history){if(r.type==='anchor-chart')for(const s of r.data.sections)delete s.iconUrl;if(r.type==='concept-sort')for(const s of r.data.items)delete s.image;}
const refilled=apply(stripped,slug);if(exact)expect(refilled.history).toEqual(pack.history);else expect(text(refilled.history)).toEqual(text(pack.history));
expect(refilled.history.find(r=>r.type==='anchor-chart').data.sections.every(s=>s.iconUrl)).toBe(true);expect(refilled.history.find(r=>r.type==='concept-sort').data.items.every(s=>s.image)).toBe(true);
expect(JSON.stringify(pack).length).toBeLessThan(2000000);});
});
