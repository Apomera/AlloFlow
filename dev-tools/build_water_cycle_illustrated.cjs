const fs = require('fs');
const path = require('path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
function save(p,s){for(let i=0;;i++){try{fs.writeFileSync(path.join(root,p),s);break;}catch(e){if(i===19)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);}}}
function hashImage(s){let h=0x811c9dc5;const mix=c=>{h^=c;h=Math.imul(h,0x01000193)>>>0;};String(s.length).split('').forEach(ch=>mix(ch.charCodeAt(0)));const step=Math.max(1,Math.floor(s.length/4096));for(let i=0;i<s.length;i+=step)mix(s.charCodeAt(i));return 'img-'+s.length.toString(36)+'-'+h.toString(16).padStart(8,'0');}
async function build(){
const media='allopacks/media/water_cycle_grade6/';
const prior=fs.existsSync(path.join(root,media+'manifest.json')) ? read(media+'manifest.json') : null;
const plan=prior ? {jobs:prior.assets} : read('scratch/allopack-images-2026-09-04/water-cycle-manifest.json');
const ledger=prior ? prior.assets : read('scratch/allopack-images-2026-09-04/generated-assets.json');
const alts=read(media+'alt-text.json');
const pack=read('allopacks/water_cycle_grade6.allopack.json');
const browser=await chromium.launch({headless:true});
try {
const page=await browser.newPage();
const assets=[];
for(const job of plan.jobs){
 const review=ledger.filter(a=>a.id===job.id&&a.status==='visual-review-passed').at(-1);
 if(!review)throw Error('Unreviewed image '+job.id);
 const src='data:image/png;base64,'+fs.readFileSync(path.join(root,media+job.id+'.png')).toString('base64');
 const encoded=await page.evaluate(async ({src,max})=>{
  const img=new Image();img.src=src;await img.decode();
  const scale=Math.min(1,max/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  return {data:canvas.toDataURL('image/webp',0.74),width:canvas.width,height:canvas.height};
 },{src,max:job.kind==='glossary'?480:900});
 const alt=alts[job.id];if(!alt||alt.length>250)throw Error('Invalid alt '+job.id);
 save(media+job.id+'.webp',Buffer.from(encoded.data.split(',')[1],'base64'));
 assets.push({...job,prompt:review.prompt,alt,altSource:'vision',altHash:hashImage(encoded.data),status:'visual-review-passed',width:encoded.width,height:encoded.height,file:job.id+'.webp',imageUrl:encoded.data});
}
const glossary=pack.history.find(r=>r.id==='wc-glossary');
for(const asset of assets.filter(a=>a.kind==='glossary')){
 const entry=glossary.data[asset.termIndex];if(entry.term!==asset.term)throw Error('Term mismatch');
 Object.assign(entry,{image:asset.imageUrl,imageAlt:asset.alt,imageAltSource:'vision',imageAltHash:asset.altHash,imageDecorative:false});
}
const panels=assets.filter(a=>a.kind==='panel');
const groups=[
 {id:'wc-visual-pathways',title:'Water pathways and storage',after:'wc-reading',ids:['wc-img-cycle-diagram','wc-img-reservoirs','wc-img-groundwater','wc-img-surface-ground']},
 {id:'wc-visual-changes',title:'Water changes we can observe',after:'wc-glossary',ids:['wc-img-puddle-time','wc-img-glass-condensation','wc-img-rain-snow','wc-img-breath-fog']},
 {id:'wc-visual-drivers',title:'Plants, sunlight, and gravity',after:'wc-anchor',ids:['wc-img-root-leaf','wc-img-sun-gravity','wc-img-salt-remains']},
 {id:'wc-visual-clouds',title:'Clouds, vapor, and tiny particles',after:'wc-faq',ids:['wc-img-cloud-droplets','wc-img-kettle-gap','wc-img-cloud-ice']}
];
const captions={
 'wc-img-cycle-diagram':'This model shows several connected water pathways. Water can take different routes; it does not always follow one fixed sequence.',
 'wc-img-reservoirs':'Water is stored in oceans, lakes, rivers, ice, and the ground. The illustration does not show their relative quantities.',
 'wc-img-groundwater':'Groundwater fills connected pores and cracks below the water table. The blue areas represent water between solid materials.',
 'wc-img-surface-ground':'After rain, some water flows over the surface as runoff and some enters the soil by infiltration.',
 'wc-img-puddle-time':'Liquid water evaporates from the puddle into invisible water vapor. These are three stages of the same scene.',
 'wc-img-glass-condensation':'Water vapor in the surrounding air condenses into liquid droplets on the cold outside of the glass.',
 'wc-img-rain-snow':'Rain is liquid precipitation. Snow consists of ice crystals. The inset is enlarged and not to scale.',
 'wc-img-breath-fog':'The visible mist consists of tiny condensed droplets. Water vapor itself is invisible.',
 'wc-img-root-leaf':'Water moves through the roots and stem. Water vapor exits through leaf pores during transpiration. Arrows show direction; the pore is greatly enlarged.',
 'wc-img-sun-gravity':'Solar energy supports evaporation. Gravity pulls rain downward and drives water flow downhill.',
 'wc-img-salt-remains':'As water evaporates, salt stays in the dish. The crystals become more exposed as the water level falls.',
 'wc-img-cloud-droplets':'A cloud contains tiny liquid droplets, ice crystals, or both. This enlarged model focuses on liquid droplets.',
 'wc-img-kettle-gap':'The clear region near the spout contains invisible water vapor. Farther away, cooling produces the visible mist of liquid droplets.',
 'wc-img-cloud-ice':'Some cold clouds contain both supercooled liquid droplets and ice crystals. The enlarged particles are a model, not to scale.'
};
const labels={
 'wc-img-cycle-diagram':[{text:'Evaporation',position:'bottom-left',anchorX:26,anchorY:49},{text:'Precipitation',position:'top-right',anchorX:72,anchorY:40}],
 'wc-img-root-leaf':[{text:'Roots',position:'bottom-left',anchorX:24,anchorY:82},{text:'Leaf pore',position:'bottom-right',anchorX:76,anchorY:46}],
 'wc-img-surface-ground':[{text:'Runoff',position:'top-center',anchorX:52,anchorY:42},{text:'Infiltration',position:'bottom-left',anchorX:25,anchorY:60}]
};
for(const group of groups){
 const resource={id:group.id,type:'image',title:group.title,timestamp:'2026-09-04T00:00:00.000Z',data:{visualPlan:{layout:'comparison',title:group.title,panels:group.ids.map(id=>{
 const a=panels.find(p=>p.id===id);if(!a)throw Error('Missing panel '+id);
 return {id,type:'image',title:a.title,imagenPrompt:a.prompt,caption:captions[id],imageUrl:a.imageUrl,alt:a.alt,altSource:'vision',altHash:a.altHash,decorative:false,labels:labels[id]||[]};
 })}}};
 const index=pack.history.findIndex(r=>r.id===group.after);if(index<0)throw Error('Missing location '+group.after);
 pack.history.splice(index+1,0,resource);
}
pack.allopack.sourcePack='allopacks/water_cycle_grade6.allopack.json';
pack.allopack.sourceAuthor=pack.allopack.author;
pack.allopack.author='AlloFlow flagship; illustrated pilot prepared with AI-generated artwork';
pack.allopack.title += ' — Illustrated Pilot';
pack.allopack.illustrations={version:1,createdAt:'2026-09-04',provider:'Built-in image generation',imageCount:24,review:'AI visual review completed; educator review pending',textPolicy:'Text-free artwork; native editable labels and captions',altText:'Image-specific descriptions embedded for all 24 images'};
const output=JSON.stringify(pack,null,2)+'\n';
if(output.length>2000000)throw Error('Pack exceeds 2M-character artifact contract: '+output.length);
fs.mkdirSync(path.join(root,'allopacks/illustrated'),{recursive:true});
save('allopacks/illustrated/water_cycle_grade6.allopack.json',output);
save(media+'manifest.json',JSON.stringify({version:1,sourcePack:pack.allopack.sourcePack,imageCount:24,assets:assets.map(({imageUrl,...a})=>a)},null,2)+'\n');
console.log(JSON.stringify({images:assets.length,resources:pack.history.length,characters:output.length}));
} finally {await browser.close();}
}
build().catch(e=>{console.error(e);process.exitCode=1;});

