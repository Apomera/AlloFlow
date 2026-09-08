const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const folder='allopacks/media/weather_vs_climate_grade5/';
const output='allopacks/illustrated/weather_vs_climate_grade5.allopack.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,''));
function save(p,data){for(let i=0;;i++){try{fs.writeFileSync(path.join(root,p),data);return;}catch(e){if(i===19)throw e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200);}}}
function hashImage(s){let h=0x811c9dc5;const mix=c=>{h^=c;h=Math.imul(h,0x01000193)>>>0;};String(s.length).split('').forEach(c=>mix(c.charCodeAt(0)));for(let i=0,step=Math.max(1,Math.floor(s.length/4096));i<s.length;i+=step)mix(s.charCodeAt(i));return 'img-'+s.length.toString(36)+'-'+h.toString(16).padStart(8,'0');}
const captions={
'wx-img-mood-personality':'Weather describes conditions over a short time. This illustration shows changing conditions at one place.',
'wx-img-observation-series':'Repeated measurements build a record. Three observations alone cannot describe a climate; scientists examine patterns over much longer periods.',
'wx-img-desert-rain':'A rainy day can occur in a dry region. One event does not establish or overturn its long-term climate.',
'wx-img-same-weather':'Different regions can both be sunny on the same day while having different long-term weather patterns.',
'wx-img-heat-wave':'This scene represents a hot day. A single image cannot establish a heat wave or a long-term warming trend.',
'wx-img-cold-day':'A cold day is one weather observation. Climate describes the broader pattern across many observations.',
'wx-img-climate-regions':'These representative landscapes illustrate contrasting environments. Climate descriptions require records, not a single view.',
'wx-img-valley-shade':'Sunlight and shade can contribute to local differences in conditions. Temperature differences need measurements.',
'wx-img-city-farm':'Paved and vegetated surfaces interact differently with sunlight and water. A temperature comparison requires measurements under comparable conditions.',
'wx-img-tree-rings':'Tree growth rings can preserve clues about past environmental conditions. Scientists interpret them alongside other evidence.',
'wx-img-ice-core':'Ice cores can preserve layers, trapped air, and other clues about past conditions. Scientists date and analyze the samples.',
'wx-img-weather-station':'Weather instruments collect observations. Keeping measurements consistent helps scientists compare conditions over time.',
'wx-img-forecast-observations':'A forecast helps people plan for possible conditions ahead. Forecasts describe expectations and uncertainty.',
'wx-img-many-records':'Scientists combine multiple kinds of observations to investigate long-term environmental patterns.'
};
const groups=[
{id:'wx-visual-daily',title:'Daily weather and longer patterns',after:'wx-reading',ids:['wx-img-mood-personality','wx-img-observation-series','wx-img-desert-rain','wx-img-same-weather']},
{id:'wx-visual-places',title:'Comparing conditions and places',after:'wx-glossary',ids:['wx-img-heat-wave','wx-img-cold-day','wx-img-climate-regions','wx-img-valley-shade']},
{id:'wx-visual-records',title:'Clues and measurements',after:'wx-sort',ids:['wx-img-city-farm','wx-img-tree-rings','wx-img-ice-core']},
{id:'wx-visual-evidence',title:'Observing, forecasting, and investigating',after:'wx-faq',ids:['wx-img-weather-station','wx-img-forecast-observations','wx-img-many-records']}
];
async function main(){
const manifest=read(folder+'manifest.json'),pack=read('allopacks/weather_vs_climate_grade5.allopack.json');
if(manifest.assets.length!==24)throw Error('All 24 reviewed assets are required.');
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage(),encoded=new Map(),records=[];
for(const a of manifest.assets){
if(a.status!=='visual-review-passed'||!a.alt||a.alt.length>250)throw Error('Unreviewed asset '+a.id);
const src='data:image/png;base64,'+fs.readFileSync(path.join(root,folder+a.file)).toString('base64');
const data=await page.evaluate(async({src,max})=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');const scale=Math.min(1,max/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return {url:c.toDataURL('image/webp',.72),width:c.width,height:c.height};},{src,max:a.kind==='panel'?840:480});
save(folder+a.id+'.webp',Buffer.from(data.url.split(',')[1],'base64'));
encoded.set(a.id,{...a,...data,hash:hashImage(data.url)});
records.push({id:a.id,file:a.id+'.webp',width:data.width,height:data.height,alt:a.alt,altHash:hashImage(data.url)});
}
const glossary=pack.history.find(r=>r.id==='wx-glossary');
for(const a of manifest.assets.filter(a=>a.kind!=='panel')){
const item=glossary.data[a.termIndex],data=encoded.get(a.id);if(item.term!==a.term)throw Error('Glossary mapping changed '+a.id);
Object.assign(item,{image:data.url,imageAlt:a.alt,imageAltSource:'vision',imageAltHash:data.hash,imageDecorative:false});
}
const defs={Climate:'The long-term pattern and range of weather in a place, often described using thirty-year records.',Average:'A value found by adding measurements and dividing by how many measurements there are.',Pattern:'A recognizable arrangement or repeated sequence; daily weather does not repeat exactly.',Trend:'An overall direction of change across many observations, even when individual values fluctuate.',Atmosphere:'The layer of gases surrounding Earth. Most weather occurs in its lowest layer, the troposphere.'};
for(const item of glossary.data)if(defs[item.term])item.def=defs[item.term];
const reading=pack.history.find(r=>r.id==='wx-reading');
reading.data=reading.data.replace('It is famously hard to predict more than about a week ahead, because the atmosphere is chaotic: tiny differences today become big differences next week.','Forecasts generally become less reliable farther into the future because small differences in atmospheric conditions can grow over time.');
const faq=pack.history.find(r=>r.id==='wx-faq');
faq.data[0]={question:'How can scientists study future climate when daily weather is hard to predict far ahead?',answer:'They ask different questions. A weather forecast estimates specific conditions ahead. Climate projections examine long-term patterns under stated conditions, such as different amounts of greenhouse gases. Both use physical science, and both include uncertainty.'};
for(const g of groups){
const panels=g.ids.map(id=>{const a=encoded.get(id);return {id,type:'image',title:a.title,imageUrl:a.url,alt:a.alt,altSource:'vision',altHash:a.hash,decorative:false,imagenPrompt:a.prompt,caption:captions[id],labels:id==='wx-img-same-weather'?[{text:'Dry landscape',position:'bottom-left',anchorX:25,anchorY:62},{text:'Forested landscape',position:'bottom-right',anchorX:77,anchorY:62}]:[]};});
const index=pack.history.findIndex(r=>r.id===g.after);if(index<0)throw Error('Placement missing '+g.after);
pack.history.splice(index+1,0,{id:g.id,type:'image',title:g.title,timestamp:'2026-09-06T00:00:00.000Z',data:{visualPlan:{title:g.title,layout:'comparison',panels}}});
}
pack.allopack.sourcePack='allopacks/weather_vs_climate_grade5.allopack.json';
pack.allopack.sourceAuthor=pack.allopack.author;
pack.allopack.author='AlloFlow; illustrated edition prepared with AI-generated artwork';
pack.allopack.title='Weather vs. Climate — Illustrated Edition';
pack.allopack.illustrations={version:1,imageCount:24,provider:'Built-in image generation',review:'AI visual review completed; educator review pending',textPolicy:'Text-free artwork with native editable labels, captions, and image-specific alt text'};
pack.allopack.contentSources=[{title:'NOAA: Weather vs. Climate',url:'https://www.ncei.noaa.gov/news/weather-vs-climate'}];
require('./refine_illustrated_quality.cjs')(pack,'weather_vs_climate_grade5');
require('./backfill_allopack_resource_images.cjs')(pack,'weather_vs_climate_grade5');
const serialized=JSON.stringify(pack,null,2)+'\n';
if(serialized.length>2000000)throw Error('Pack exceeds portable artifact limit: '+serialized.length);
fs.mkdirSync(path.join(root,'allopacks/illustrated'),{recursive:true});
save(output,serialized);save(folder+'embedded-assets.json',JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify({output,images:24,resources:pack.history.length,characters:serialized.length}));
}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

