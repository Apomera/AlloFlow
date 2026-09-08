'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
async function main(){
const files=['allopacks','allopacks/illustrated'].flatMap(dir=>fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.allopack.json')).sort().map(f=>dir+'/'+f));
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.setContent('<html><body>AlloPack import verification</body></html>');
for(const f of ['desktop/web-app/node_modules/react/umd/react.development.js','firestore_sync_module.js','misc_handlers_module.js'])await page.addScriptTag({path:path.join(root,f)});
const anti=fs.readFileSync(path.join(root,'AlloFlowANTI.txt'),'utf8'),start=anti.indexOf('const loadProjectFromJson ='),end=anti.indexOf('\n  // Reading Library',start);assert(start>=0&&end>start);
await page.evaluate(bridge=>{
window.qa={history:[],loads:[],toasts:[]};const noop=()=>{};
const deps=new Proxy({hydrateHistory:window.hydrateHistory,normalizeArtifactInstanceIds:undefined,setHistory:items=>window.qa.history=items,setGeneratedContent:item=>window.qa.current=item,onProjectLoadComplete:result=>window.qa.loads.push(result),projectFileInputRef:{current:{value:''}},t:k=>k,addToast:(message,type)=>window.qa.toasts.push({message,type}),warnLog:(...args)=>window.qa.toasts.push({type:'error',message:args.join(' ')})},{get:(o,k)=>k in o?o[k]:noop});
const handleLoadProject=e=>window.AlloModules.MiscHandlers.handleLoadProject(e,deps);
window.qa.load=new Function('handleLoadProject','addToast','t',bridge+'\nreturn loadProjectFromJson;')(handleLoadProject,deps.addToast,deps.t);
},anti.slice(start,end));
await page.context().setOffline(true);
const rows=[];
for(const file of files){
const pack=JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,''));
await page.evaluate(p=>{window.qa.history=[];window.qa.loads=[];window.qa.toasts=[];window.qa.load(p);},pack);
await page.waitForFunction(()=>window.qa.loads.length>0);
const result=await page.evaluate(()=>({history:window.qa.history,loads:window.qa.loads,toasts:window.qa.toasts}));
assert(result.loads[0].success,file+': '+JSON.stringify(result.toasts));assert.equal(result.history.length,pack.history.length,file);
for(let i=0;i<pack.history.length;i++)for(const key of Object.keys(pack.history[i]))assert.deepEqual(result.history[i][key],pack.history[i][key],file+': '+pack.history[i].id+': '+key);
rows.push({file,resources:pack.history.length,status:'passed'});
}
assert.deepEqual(errors,[]);const report={date:'2026-09-08',scope:'Offline production JSON bridge, MiscHandlers and history hydration; original resource fields preserved. Not a signed-in community-library or full-view rendering test.',files:rows.length,resources:rows.reduce((n,r)=>n+r.resources,0),results:rows};
fs.mkdirSync(path.join(root,'docs','allopack-quality-2026-09-08'),{recursive:true});fs.writeFileSync(path.join(root,'docs','allopack-quality-2026-09-08','imports.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({files:report.files,resources:report.resources,status:'passed'}));
}finally{await browser.close();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
