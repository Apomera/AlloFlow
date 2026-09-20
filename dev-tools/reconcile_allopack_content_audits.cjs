'use strict';
// Rebuild exact original-to-illustrated text/provenance records after a reviewed content edit.
// Artwork is never changed or copied into these records. Historical image manifests stay intact.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,''));
const art=/^(image|iconUrl|iconAlt)/;
const withoutArtwork=n=>JSON.parse(JSON.stringify(n),(k,v)=>art.test(k)?undefined:v);
function differences(before,after,at,rows,resourceId){
 if(JSON.stringify(before)===JSON.stringify(after))return;
 const object=x=>x!==null&&typeof x==='object';
 if(object(before)&&object(after)&&Array.isArray(before)===Array.isArray(after)){
  const left=Object.keys(before).filter(k=>!art.test(k)),right=Object.keys(after).filter(k=>!art.test(k));
  if(left.length===right.length&&left.every(k=>right.includes(k))){for(const k of left)differences(before[k],after[k],at?at+'.'+k:k,rows,resourceId);return;}
 }
 assert(at&&before!==undefined&&after!==undefined,'Cannot record a missing path '+resourceId+':'+at);
 const stripArtwork=JSON.stringify([before,after]).includes('data:image/');
 rows.push({resourceId,path:at,from:stripArtwork?withoutArtwork(before):before,to:stripArtwork?withoutArtwork(after):after,...(stripArtwork?{stripArtwork:true}:{})});
}
function records(slug){
 const folder='allopacks/media/'+slug+'/',file='allopacks/illustrated/'+slug+'.allopack.json';
 const original=read('allopacks/'+slug+'.allopack.json'),pack=read(file),manifest=read(folder+'manifest.json'),rows=[],sourceOnlyResourceIds=[];
 for(const source of original.history){const actual=pack.history.find(r=>r.id===source.id);if(!actual){sourceOnlyResourceIds.push(source.id);continue;}
  const baseline=structuredClone(source);
  if(source.id.endsWith('-directions')&&typeof baseline.data?.body==='string'&&Array.isArray(manifest.groups))baseline.data.body+='\n\nPicture panels: '+manifest.groups.join('; ')+'. '+manifest.note;
  differences(baseline,actual,'',rows,source.id);
 }
 return {pack,file,folder,rows,sourceOnlyResourceIds};
}
if(require.main===module){let packs=0,total=0;for(const name of fs.readdirSync(path.join(root,'allopacks/illustrated')).filter(f=>f.endsWith('.allopack.json'))){const slug=name.slice(0,-14),r=records(slug);if(!r.pack.allopack.contentRefinements&&!r.rows.length)continue;
 fs.writeFileSync(path.join(root,r.folder,'content-refinements.json'),JSON.stringify(r.rows,null,2)+'\n');
 r.pack.allopack.contentRefinements={...r.pack.allopack.contentRefinements,count:r.rows.length,sourceOnlyResourceIds:r.sourceOnlyResourceIds,auditBasis:'Current text-only source to current illustrated edition; native picture-panel directions appended before comparison',updatedAt:'2026-09-19',log:r.folder+'content-refinements.json'};
 fs.writeFileSync(path.join(root,r.file),JSON.stringify(r.pack,null,2)+'\n');packs++;total+=r.rows.length;
 }console.log(JSON.stringify({packs,changeRecords:total}));}
module.exports={records};
