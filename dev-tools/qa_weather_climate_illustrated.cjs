const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'scratch/weather-climate-qa');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const packPath='allopacks/illustrated/weather_vs_climate_grade5.allopack.json';
const pack=JSON.parse(read(packPath));
function assertPreserved(actual,expected){assert.equal(actual.length,expected.length);for(let i=0;i<expected.length;i++)for(const key of Object.keys(expected[i]))assert.deepEqual(actual[i][key],expected[i][key],expected[i].id+':'+key);}
async function main(){
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage({viewport:{width:1100,height:900},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const entry={slug:'weather_vs_climate_grade5_illustrated',title:pack.allopack.title,subject:'Science',grade_level:'5-6',tags:['weather','climate','illustrated'],license:'CC-BY-4.0',credit:pack.allopack.author,path:packPath};
await page.route('https://raw.githubusercontent.com/**',async route=>{
const url=route.request().url();
if(url.includes('catalog/index.json'))return route.fulfill({json:{schema_version:'1.0',entries:[entry]}});
if(url.includes(packPath))return route.fulfill({json:pack});
return route.abort();
});
await page.setContent('<html lang="en"><head><title>Weather AlloPack integration QA</title></head><body><div id="root"></div><div id="panels"></div></body></html>');
for(const f of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','firestore_sync_module.js','misc_handlers_module.js','catalog_module.js','alt_text_module.js','visual_panel_module.js'])await page.addScriptTag({path:path.join(root,f)});
const anti=read('AlloFlowANTI.txt');
const start=anti.indexOf('const loadProjectFromJson =');
const end=anti.indexOf('\n  // Reading Library',start);
assert(start>=0&&end>start,'Production catalog bridge not found');
await page.evaluate(bridge=>{
window.qa={history:[],loads:[],toasts:[]};
const noop=()=>{};
const deps=new Proxy({
hydrateHistory:window.hydrateHistory,
normalizeArtifactInstanceIds:undefined,
setHistory:items=>window.qa.history=items,
setGeneratedContent:item=>window.qa.current=item,
onProjectLoadComplete:result=>window.qa.loads.push(result),
projectFileInputRef:{current:{value:''}},
t:k=>k,addToast:(message,type)=>window.qa.toasts.push({message,type}),warnLog:(...args)=>window.qa.toasts.push({type:'error',message:args.join(' ')})
},{get:(o,k)=>k in o?o[k]:noop});
const handleLoadProject=e=>window.AlloModules.MiscHandlers.handleLoadProject(e,deps);
const addToast=deps.addToast,t=deps.t;
const load=new Function('handleLoadProject','addToast','t',bridge+'\nreturn loadProjectFromJson;')(handleLoadProject,addToast,t);
window.qa.load=load;
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(window.AlloModules.CommunityCatalog,{isOpen:true,onClose:noop,addToast,loadProjectFromJson:load}));
},anti.slice(start,end));
await page.getByRole('button',{name:'Load in AlloFlow',exact:true}).click();
await page.waitForFunction(()=>window.qa.loads.length===1);
const loaded=await page.evaluate(()=>({history:window.qa.history,loads:window.qa.loads,toasts:window.qa.toasts}));
assert(loaded.loads[0].success,JSON.stringify(loaded.toasts));
assertPreserved(loaded.history,pack.history);
const downloadPromise=page.waitForEvent('download');
await page.getByRole('button',{name:/Download JSON/i}).click();
const download=await downloadPromise;const saved=path.join(out,'weather-climate-downloaded.json');await download.saveAs(saved);
const downloaded=JSON.parse(fs.readFileSync(saved,'utf8'));
assert.deepEqual(downloaded.history,pack.history);
await page.context().setOffline(true);
await page.evaluate(p=>window.qa.load(p),downloaded);
await page.waitForFunction(()=>window.qa.loads.length===2);
assertPreserved(await page.evaluate(()=>window.qa.history),pack.history);
const decoded=await page.evaluate(async()=>{
const h=window.qa.history;
const urls=h.flatMap(r=>r.type==='glossary'?r.data.map(g=>g.image):r.type==='image'?r.data.visualPlan.panels.map(p=>p.imageUrl):[]);
await Promise.all(urls.map(async src=>{const img=new Image();img.src=src;await img.decode();if(!img.naturalWidth)throw Error('Image did not decode');}));
const noop=()=>{};
ReactDOM.createRoot(document.getElementById('panels')).render(React.createElement('div',null,h.filter(r=>r.type==='image').map(r=>React.createElement('section',{key:r.id},React.createElement('h2',null,r.title),React.createElement(window.AlloModules.VisualPanelGrid,{visualPlan:r.data.visualPlan,isTeacherMode:false,t:k=>k,onSpeak:noop,language:'en'})))));
return urls.length;
});
assert.equal(decoded,24);
await page.waitForFunction(()=>document.querySelectorAll('#panels img').length>=14);
const alts=await page.locator('#panels img').evaluateAll(imgs=>imgs.map(i=>i.alt));
for(const p of pack.history.filter(r=>r.type==='image').flatMap(r=>r.data.visualPlan.panels))assert(alts.includes(p.alt),'Missing native panel alt '+p.id);
await page.locator('#root').evaluate(el=>el.remove());
await page.screenshot({path:path.join(out,'native-panels-desktop.png'),fullPage:true});
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:path.join(out,'native-panels-mobile.png'),fullPage:true});
assert.deepEqual(errors,[]);
const report={passed:true,imagesDecodedOffline:decoded,lessonPanelAltsVerified:14,resources:pack.history.length,productionComponents:['CommunityCatalog','loadProjectFromJson bridge','MiscHandlers.handleLoadProject','hydrateHistory','VisualPanelGrid'],checks:['catalog load','actual catalog download','offline production-loader reopen','history byte/value preservation','all embedded image decoding','native panel alt attributes'],scope:'Component integration harness with local catalog responses; not a live deployment or full signed-in teacher session.'};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

