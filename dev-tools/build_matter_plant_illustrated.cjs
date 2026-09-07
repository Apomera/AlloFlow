const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const refine=require('./refine_matter_plant_content.cjs'),root=path.resolve(__dirname,'..');
const slug=process.argv[2],options={
states_of_matter_grade4:{prefix:'sm',title:'States of Matter — Illustrated Edition',counts:[4,3,3,3],titles:['Observing solids, liquids, and gases','Changes in closed containers','Models of tiny particles','Water moving between states'],sources:[{title:'ACS: Melting',url:'https://www.acs.org/middleschoolchemistry/lessonplans/chapter2/lesson5.html'},{title:'ACS: Conservation of mass',url:'https://www.acs.org/education/resources/k-8/inquiryinaction/fifth-grade/chapter-4/conservation-of-mass.html'}]},
plant_needs_grade3:{prefix:'pl',title:'What Plants Need — Illustrated Edition',counts:[4,4,3,3],titles:['From seed to seedling','Parts, light, and water','Space, nutrients, and care','Food-making and continued growth'],sources:[{title:'University of Minnesota: Seed physiology',url:'https://open.lib.umn.edu/horticulture/chapter/9-2-seed-physiology/'},{title:'University of Minnesota: Seedling issues',url:'https://blog-fruit-vegetable-ipm.extension.umn.edu/2020/04/troubleshooting-seedling-issues.html'},{title:'University of Minnesota: Soybean germination',url:'https://blog-nwcrops.extension.umn.edu/2023/05/its-magic-neat-process-of-soybean.html'}]}
};
if(!options[slug])throw Error('Provide an approved pack slug');
const opt=options[slug],folder='allopacks/media/'+slug+'/',output='allopacks/illustrated/'+slug+'.allopack.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
function save(p,data){for(let i=0;;i++){try{fs.writeFileSync(path.join(root,p),data);return;}catch(e){if(i===19)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);}}}
function hashImage(s){let h=0x811c9dc5;const mix=c=>{h^=c;h=Math.imul(h,0x01000193)>>>0;};String(s.length).split('').forEach(c=>mix(c.charCodeAt(0)));for(let i=0,step=Math.max(1,Math.floor(s.length/4096));i<s.length;i+=step)mix(s.charCodeAt(i));return 'img-'+s.length.toString(36)+'-'+h.toString(16).padStart(8,'0');}
const labels={
'sm-img-solid-shape':[{text:'Keeps its shape',position:'top-left',anchorX:20,anchorY:63}],
'sm-img-trapped-air':[{text:'More space',position:'top-right',anchorX:63,anchorY:30},{text:'Compressed air',position:'center-right',anchorX:69,anchorY:71}],
'pl-img-plant-parts':[{text:'Roots',position:'center-left',anchorX:50,anchorY:77},{text:'Stem',position:'top-left',anchorX:49,anchorY:48},{text:'Leaves',position:'top-right',anchorX:61,anchorY:18}],
'pl-img-leaf-gases':[{text:'Carbon dioxide in',position:'top-left',anchorX:24,anchorY:38},{text:'Oxygen out',position:'center-right',anchorX:88,anchorY:60}]
};
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
const order=['solid-shape','liquid-shape','trapped-air','inflating-balloon','melting-jar','freezing-tray','closed-system','solid-particles','liquid-particles','gas-particles','drying-puddle','cold-glass','vapor-gap'];
const panels=manifest.assets.filter(a=>a.kind==='panel');if(slug==='states_of_matter_grade4')panels.sort((a,b)=>order.indexOf(a.id.slice(7))-order.indexOf(b.id.slice(7)));let offset=0;
for(let i=0;i<opt.counts.length;i++){
const title=opt.titles[i],items=panels.slice(offset,offset+=opt.counts[i]).map(a=>{
const e=encoded.get(a.id);return {id:a.id,type:'image',title:a.title,imageUrl:e.url,alt:a.alt,altSource:'vision',altHash:e.hash,decorative:false,imagenPrompt:a.prompt,caption:a.caption,labels:labels[a.id]||[]};
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
const serialized=JSON.stringify(pack,null,2)+'\n';if(serialized.length>2000000)throw Error('Pack exceeds portable artifact limit: '+serialized.length);
fs.mkdirSync(path.join(root,'allopacks/illustrated'),{recursive:true});save(output,serialized);save(folder+'embedded-assets.json',JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify({output,images:24,resources:pack.history.length,characters:serialized.length}));
}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

