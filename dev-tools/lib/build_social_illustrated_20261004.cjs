'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {hashImage}=require('./build_crew_illustrated_20261004.cjs');
const root=path.resolve(__dirname,'../..');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
function build(slug){
 const folder=path.join(root,'allopacks/media',slug),source=path.join(root,'allopacks',slug+'.allopack.json');
 const bytes=fs.readFileSync(source),sourceSha256=crypto.createHash('sha256').update(bytes).digest('hex'),pack=read(source),m=read(path.join(folder,'manifest.json'));
 assert.equal(m.slug,slug);const encoded=new Map();
 for(const a of m.assets){assert(a.alt&&a.alt.length<=250);assert.equal(a.status,'visual-review-passed');assert(a.prompt);const url='data:image/webp;base64,'+fs.readFileSync(path.join(folder,a.webpFile||a.id+'.webp')).toString('base64');encoded.set(a.id,{...a,url,hash:hashImage(url)});}
 const get=t=>pack.history.find(r=>r.type===t),maps=m.nativeMappings;
 function fields(id,anchor=false){const a=encoded.get(id);assert(a,'Missing asset '+id);return anchor?{iconUrl:a.url,iconAlt:a.alt,iconAltSource:'vision',iconAltHash:a.hash}:{image:a.url,imageAlt:a.alt,imageAltSource:'vision',imageAltHash:a.hash,imageDecorative:false};}
 get('glossary').data.forEach(x=>{assert(maps.glossary[x.term],'Unmapped glossary '+x.term);Object.assign(x,fields(maps.glossary[x.term]));});
 get('anchor-chart').data.sections.forEach((x,i)=>{assert(maps.anchor[i],'Unmapped anchor '+i);Object.assign(x,fields(maps.anchor[i],true));});
 get('concept-sort').data.items.forEach(x=>{assert(maps.sort[x.id],'Unmapped sort '+x.id);Object.assign(x,fields(maps.sort[x.id]));});
 for(const a of m.assets.filter(a=>a.kind==='lesson')){const e=encoded.get(a.id);const panel={id:a.id,type:'image',title:a.title,imageUrl:e.url,alt:e.alt,altSource:'vision',altHash:e.hash,decorative:false,imagenPrompt:a.prompt,caption:a.caption,labels:a.labels||[]};assert(panel.caption);const at=pack.history.findIndex(r=>r.type===(a.afterType||'simplified'));pack.history.splice(at+1,0,{id:a.id+'-resource',type:'image',title:a.title,timestamp:'2026-10-04T00:00:00.000Z',data:{visualPlan:{title:a.title,layout:'single',panels:[panel]}}});}
 Object.assign(pack.allopack,{sourcePack:'allopacks/'+slug+'.allopack.json',sourceAuthor:pack.allopack.author,title:pack.allopack.title+' — Illustrated Edition',author:'AlloFlow; AI-assisted illustrated draft, educator review pending',imageStatus:'complete-reviewed',imageShotList:'allopacks/media/'+slug+'/manifest.json',illustrations:{version:1,style:m.style,imageCount:m.assets.length,provider:'Built-in image generation; authored diagrams',review:'Visual review completed; educator review pending',textPolicy:'Text-free artwork with native editable captions and image-specific descriptions'},resourceIllustrations:{version:1,anchorSectionImages:get('anchor-chart').data.sections.length,conceptSortCardImages:get('concept-sort').data.items.length,pendingSortImages:0,review:'Visually reviewed; educator review pending',textPolicy:'Original activity text stays editable; contextual illustrations recur only where appropriate'}});
 const json=JSON.stringify(pack,null,2)+'\n';assert(json.length<2000000,'Portable artifact size limit');fs.writeFileSync(path.join(root,'allopacks/illustrated',slug+'.allopack.json'),json);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),sourceSha256);
 const report={slug,sourceSha256,assets:m.assets.length,characters:json.length,glossaryImages:get('glossary').data.length,anchorImages:get('anchor-chart').data.sections.length,sortImages:get('concept-sort').data.items.length,lessonPanels:m.assets.filter(a=>a.kind==='lesson').length};fs.writeFileSync(path.join(folder,'build-report.json'),JSON.stringify(report,null,2)+'\n');return report;
}
module.exports={build};if(require.main===module)console.log(JSON.stringify(process.argv.slice(2).map(build),null,2));
