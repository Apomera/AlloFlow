'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
function hashImage(s){let h=0x811c9dc5;const mix=c=>{h^=c;h=Math.imul(h,0x01000193)>>>0;};String(s.length).split('').forEach(c=>mix(c.charCodeAt(0)));for(let i=0,step=Math.max(1,Math.floor(s.length/4096));i<s.length;i+=step)mix(s.charCodeAt(i));return 'img-'+s.length.toString(36)+'-'+h.toString(16).padStart(8,'0');}
function build(slug){
 assert(/^crew_[a-z]+_grade6_8$/.test(slug));
 const folder=path.join(root,'allopacks/media',slug),source=path.join(root,'allopacks',slug+'.allopack.json');
 const sourceBytes=fs.readFileSync(source),sourceHash=crypto.createHash('sha256').update(sourceBytes).digest('hex');
 const pack=read(source),manifest=read(path.join(folder,'manifest.json')),encoded=new Map();
 assert.equal(manifest.slug,slug);assert(manifest.assets.length>=9);
 for(const a of manifest.assets){
  assert(a.id&&a.file&&a.prompt&&a.status==='visual-review-passed');assert(a.alt&&a.alt.length<=250);
  const url='data:image/webp;base64,'+fs.readFileSync(path.join(folder,a.file)).toString('base64');
  encoded.set(a.id,{...a,url,hash:hashImage(url)});
 }
 const fields=(id,kind)=>{const a=encoded.get(id);assert(a,'Missing mapped asset '+id);return kind==='anchor'?{iconUrl:a.url,iconAlt:a.alt,iconAltSource:'vision',iconAltHash:a.hash}:{image:a.url,imageAlt:a.alt,imageAltSource:'vision',imageAltHash:a.hash,imageDecorative:false};};
 const get=t=>pack.history.find(r=>r.type===t),maps=manifest.nativeMappings||{};
 for(const item of get('glossary').data){const id=(maps.glossary||{})[item.term];if(id)Object.assign(item,fields(id,'term'));}
 get('anchor-chart').data.sections.forEach((item,i)=>{const id=(maps.anchor||{})[i];if(id)Object.assign(item,fields(id,'anchor'));});
 get('concept-sort').data.items.forEach(item=>{const id=(maps.sort||{})[item.id];if(id)Object.assign(item,fields(id,'sort'));});
 const lessons=manifest.assets.filter(a=>a.kind==='lesson');
 for(let i=0;i<lessons.length;i++){
  const a=encoded.get(lessons[i].id),after=a.afterType||['simplified','anchor-chart','faq'][i%3],at=pack.history.findIndex(r=>r.type===after);
  const panel={id:a.id,type:'image',title:a.title||a.id,imageUrl:a.url,alt:a.alt,altSource:'vision',altHash:a.hash,decorative:false,imagenPrompt:a.prompt,caption:a.caption||'',labels:a.labels||[]};
  assert(panel.caption);for(const l of panel.labels){assert(l.text);assert(l.anchorX>=0&&l.anchorX<=100&&l.anchorY>=0&&l.anchorY<=100);}
  pack.history.splice(at+1,0,{id:a.id+'-resource',type:'image',title:panel.title,timestamp:'2026-10-04T00:00:00.000Z',data:{visualPlan:{title:panel.title,layout:'single',panels:[panel]}}});
 }
 const anchor=get('anchor-chart').data.sections,sort=get('concept-sort').data.items;
 Object.assign(pack.allopack,{sourcePack:'allopacks/'+slug+'.allopack.json',sourceAuthor:pack.allopack.author,title:pack.allopack.title+' — Illustrated Edition',author:'AlloFlow; AI-assisted illustrated draft, educator review pending',imageStatus:'complete-reviewed',imageShotList:'allopacks/media/'+slug+'/manifest.json',illustrations:{version:1,style:manifest.style,imageCount:manifest.assets.length,provider:'Built-in image generation; authored concept diagrams where appropriate',review:'Visual review completed; educator review pending',textPolicy:'Text-free artwork with native editable captions and image-specific descriptions'},resourceIllustrations:{version:1,anchorSectionImages:anchor.filter(a=>a.iconUrl).length,conceptSortCardImages:sort.filter(a=>a.image).length,pendingSortImages:sort.filter(a=>!a.image).length,review:'Visually reviewed; educator review pending',textPolicy:'Original activity text stays editable; contextual illustrations are shared when the same context recurs'}});
 const json=JSON.stringify(pack,null,2)+'\n';assert(json.length<2000000,'Portable artifact size limit');
 const output=path.join(root,'allopacks/illustrated',slug+'.allopack.json');assert(!fs.existsSync(output)||read(output).allopack.sourcePack==='allopacks/'+slug+'.allopack.json');fs.writeFileSync(output,json);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),sourceHash);
 const record={slug,sourceSha256:sourceHash,assets:manifest.assets.length,generatedAssets:manifest.assets.filter(a=>a.provider==='Built-in image generation').length,resources:pack.history.length,characters:json.length,glossaryImages:get('glossary').data.filter(a=>a.image).length,anchorImages:anchor.filter(a=>a.iconUrl).length,sortImages:sort.filter(a=>a.image).length};
 fs.writeFileSync(path.join(folder,'build-report.json'),JSON.stringify(record,null,2)+'\n');return record;
}
module.exports={build,hashImage};if(require.main===module)console.log(JSON.stringify(process.argv.slice(2).map(build)));
