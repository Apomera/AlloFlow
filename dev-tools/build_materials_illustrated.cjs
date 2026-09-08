const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const refine=require('./refine_materials_content.cjs'),root=path.resolve(__dirname,'..');
const slug='materials_grade2',options={materials_grade2:{prefix:'mt',title:'Why Windows Are Not Wool — Illustrated Edition',counts:[3,4,5,2],titles:['Materials fit a job','Look closely at properties','Make a fair comparison','Materials around us'],sources:[{title:'NGSS: Grade 2 structure and properties of matter',url:'https://www.nextgenscience.org/topic-arrangement/2structure-and-properties-matter'},{title:'ACS: Second grade properties investigations',url:'https://www.acs.org/education/resources/k-8/inquiryinaction/second-grade.html'},{title:'Science History Institute: History of plastics',url:'https://www.sciencehistory.org/education/classroom-activities/role-playing-games/case-of-plastics/history-and-future-of-plastics/'}]}};
if(!options[slug])throw Error('Provide an approved pack slug');
const opt=options[slug],folder='allopacks/media/'+slug+'/',output='allopacks/illustrated/'+slug+'.allopack.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
function save(p,data){for(let i=0;;i++){try{fs.writeFileSync(path.join(root,p),data);return;}catch(e){if(i===19)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);}}}
function hashImage(s){let h=0x811c9dc5;const mix=c=>{h^=c;h=Math.imul(h,0x01000193)>>>0;};String(s.length).split('').forEach(c=>mix(c.charCodeAt(0)));for(let i=0,step=Math.max(1,Math.floor(s.length/4096));i<s.length;i+=step)mix(s.charCodeAt(i));return 'img-'+s.length.toString(36)+'-'+h.toString(16).padStart(8,'0');}
async function main(){
const manifest=read(folder+'manifest.json');let pack=refine(read('allopacks/'+slug+'.allopack.json'),slug);
if(manifest.assets.length!==24)throw Error('All 24 assets required');
for(const a of manifest.assets)if(a.reusedFrom){
const [s,id]=a.reusedFrom,old=read('allopacks/media/'+s+'/manifest.json').assets.find(x=>x.id===id);
if(!old)throw Error('Missing reusable asset '+id);a.file=a.id+path.extname(old.file);
const bytes=fs.readFileSync(path.join(root,'allopacks/media/'+s+'/'+old.file));
save(folder+a.file,bytes);
a.alt=old.alt;a.prompt=old.prompt;a.provenance='Reused reviewed artwork from '+s+'/'+id;
}
save(folder+'manifest.json',JSON.stringify(manifest,null,2)+'\n');
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage(),encoded=new Map(),records=[];
for(const a of manifest.assets){
if(a.status!=='visual-review-passed'||!a.alt||a.alt.length>250)throw Error('Unreviewed asset '+a.id);
const mime=a.file.endsWith('.webp')?'webp':'png';
const src='data:image/'+mime+';base64,'+fs.readFileSync(path.join(root,folder+a.file)).toString('base64');
const data=await page.evaluate(async({src,max})=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas'),scale=Math.min(1,max/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return {url:c.toDataURL('image/webp',.72),width:c.width,height:c.height};},{src,max:a.kind==='panel'?840:480});
save(folder+a.id+'.webp',Buffer.from(data.url.split(',')[1],'base64'));
encoded.set(a.id,{...a,...data,hash:hashImage(data.url)});
records.push({id:a.id,file:a.id+'.webp',width:data.width,height:data.height,alt:a.alt,altHash:hashImage(data.url)});
}
const glossary=pack.history.find(r=>r.id===opt.prefix+'-glossary');
for(const a of manifest.assets.filter(a=>a.kind!=='panel')){
const item=glossary.data[a.termIndex],data=encoded.get(a.id);if(item.term!==a.term)throw Error('Glossary mapping changed '+a.id);
Object.assign(item,{image:data.url,imageAlt:a.alt,imageAltSource:'vision',imageAltHash:data.hash,imageDecorative:false});
}
const order=['window-sweater','two-water-jobs','wrong-material','bend-stretch','hard-fragile','texture-pair','clear-cloudy','fair-test','same-size','spill-results','repeat','record','look-around','reuse'];
const panels=order.map(id=>manifest.assets.find(a=>a.id==='mt-img-'+id));if(panels.some(p=>!p))throw Error('Missing ordered panel');let offset=0;
for(let i=0;i<opt.counts.length;i++){
const title=opt.titles[i],items=panels.slice(offset,offset+=opt.counts[i]).map(a=>{
const e=encoded.get(a.id);return {id:a.id,type:'image',title:a.title,imageUrl:e.url,alt:a.alt,altSource:'vision',altHash:e.hash,decorative:false,imagenPrompt:a.prompt,caption:a.caption,labels:a.labels||[]};
});
const after=opt.prefix+'-'+['reading','glossary','anchor','faq'][i],index=pack.history.findIndex(r=>r.id===after);
if(index<0)throw Error('Missing placement '+after);
pack.history.splice(index+1,0,{id:opt.prefix+'-visual-'+(i+1),type:'image',title,timestamp:'2026-09-07T00:00:00.000Z',data:{visualPlan:{title,layout:'comparison',panels:items}}});
}
pack.allopack.sourcePack='allopacks/'+slug+'.allopack.json';pack.allopack.sourceAuthor=pack.allopack.author;
pack.allopack.author='AlloFlow; illustrated edition prepared with AI-generated artwork';
pack.allopack.title=opt.title;pack.allopack.contentSources=opt.sources;
pack.allopack.illustrations={version:1,imageCount:24,provider:'Built-in image generation',review:'AI visual and content review completed; educator review pending',textPolicy:'Text-free artwork with native editable labels, captions, and image-specific alt text'};
delete pack.allopack.imageShotList;
for(const r of pack.history)delete r.imageSlot;
require('./refine_illustrated_quality.cjs')(pack,slug);
require('./backfill_allopack_resource_images.cjs')(pack,slug);
const serialized=JSON.stringify(pack,null,2)+'\n';if(serialized.length>2000000)throw Error('Pack exceeds portable artifact limit: '+serialized.length);
fs.mkdirSync(path.join(root,'allopacks/illustrated'),{recursive:true});save(output,serialized);save(folder+'embedded-assets.json',JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify({output,images:24,resources:pack.history.length,characters:serialized.length}));
}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

