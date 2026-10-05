'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),http=require('http'),assert=require('assert');
const root='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report=path.join(root,'reports/maine-sld-case-lab-evidence-recovery-2026-10-04/integration');
const out=path.join(report,'source-preview');
const prior=path.join(root,'reports/maine-sld-case-lab-guide-revision-2026-10-03/integration/layout-review-correction/source-preview');
const freezeFile=path.join(root,'reports/maine-sld-case-lab-evidence-recovery-2026-10-04/frozen-activity.json');
const port=65063;
const hosts=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];
const modules=['maine_sld_practice_module.js','desktop/web-app/public/maine_sld_practice_module.js','desktop/app-build/maine_sld_practice_module.js','desktop/web-app/build/maine_sld_practice_module.js'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=rel=>fs.readFileSync(path.join(root,rel));
const hash=rel=>sha(bytes(rel));
const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
function writeNew(file,data){assert(!fs.existsSync(file),'Preserve existing evidence: '+file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data,{flag:'wx'});}
const writeJSON=(name,data)=>writeNew(path.join(report,name),JSON.stringify(data,null,2));
const loader=/loadModule\('MaineSldPractice', 'https:\/\/alloflow-cdn\.pages\.dev\/maine_sld_practice_module\.js\?v=([^']+)'\)/g;
function frozen(expected){
  assert(/^[a-f0-9]{64}$/.test(expected||''),'Supply exact reviewed module SHA256');
  const f=readJSON(freezeFile);assert.equal(f.moduleSha256,expected,'Root freeze identity');
  for(const file of modules)assert.equal(hash(file),expected,file+' frozen four-copy module');
  for(const [file,h] of Object.entries(f.sourceHashes||{}))assert.equal(hash(file),h,file+' frozen source');
  return f;
}
function prepare(expected){
  frozen(expected);assert(!fs.existsSync(out),'New preview folder only');
  const priorFiles=['index.html','host.css','tested-host.jsx','host.bundle.js','preview.json','runtime.json','maine_sld_practice_module.js','frozen-activity.json'];
  const preserved=priorFiles.map(file=>({file,sha256:sha(fs.readFileSync(path.join(prior,file)))}));
  for(const row of preserved){const source=fs.readFileSync(path.join(prior,row.file));assert.equal(sha(source),row.sha256,row.file+' prior guard');writeNew(path.join(report,'preparation/prior-preview',row.file),source);}
  const priorEvidence=[];
  const priorBase=path.dirname(prior);
  const names=['pin-verification.json','static-verification.json','served-verification.json','preview-switch.json','provisional-host02-observed-identity.json','managed-session.json'];
  for(const name of names){const file=path.join(priorBase,name);if(!fs.existsSync(file))continue;const source=fs.readFileSync(file);writeNew(path.join(report,'preparation/prior-integration-records',name),source);priorEvidence.push({file:path.relative(root,file).replace(/\\/g,'/'),sha256:sha(source)});}
  const captured=hosts.map(file=>{const source=bytes(file);writeNew(path.join(report,'preparation/current-hosts',file),source);return {file,sha256:sha(source),bytes:source.length};});
  const dirty=require('child_process').execFileSync('git',['--no-optional-locks','--work-tree='+root,'status','--porcelain=v1','--untracked-files=no'],{cwd:root,encoding:'utf8'});
  writeNew(path.join(report,'preparation/preexisting-dirty-paths.txt'),dirty);
  const observed=hosts.map(file=>({file,sha256:hash(file)}));
  for(const file of ['index.html','host.css'])writeNew(path.join(out,file),fs.readFileSync(path.join(prior,file)));
  writeJSON('setup.json',{preparedAt:new Date().toISOString(),port,baseUrl:'http://127.0.0.1:'+port,activityUrl:'http://127.0.0.1:'+port+'/app/?tool=maine-sld-practice',priorPreviewPath:prior,priorPreviewFiles:preserved,priorIntegrationRecords:priorEvidence,currentHostSnapshots:captured,observedHostHashesAfterCapture:observed,sourceDriftDuringPreparation:observed.some(row=>row.sha256!==captured.find(c=>c.file===row.file).sha256),preexistingDirtyPathsArchived:true,previousArtifactsPreserved:true,previewOnly:true,noSourceModuleOrHostMutations:true});
  console.log(JSON.stringify({prepared:true,report,out,port}));
}
function pin(expected){
  frozen(expected);assert(!fs.existsSync(path.join(report,'pin-verification.json')),'Preserve pin evidence');
  const pin=expected.slice(0,8),plans=[],records=[],base=hash(hosts[0]),prefix=path.resolve(root)+path.sep;
  for(const rel of hosts)assert.equal(hash(rel),base,rel+' immediate current host parity');
  for(const rel of hosts){
    const full=path.resolve(root,rel),before=fs.readFileSync(full),text=before.toString('utf8');
    assert(full.startsWith(prefix));assert(Buffer.from(text,'utf8').equals(before),rel+' lossless UTF-8');
    const matches=[...text.matchAll(loader)];assert.equal(matches.length,1,rel+' exactly one Maine loader');
    const oldPin=matches[0][1],oldLoader=matches[0][0];assert.equal(oldPin,'018f7f78',rel+' reviewed prior accepted pin');
    const newLoader=oldLoader.replace('?v='+oldPin,'?v='+pin),after=Buffer.from(text.replace(oldLoader,newLoader),'utf8');
    const snapshot=path.join(report,'pin-before',rel);writeNew(snapshot,before);assert(fs.readFileSync(snapshot).equals(before),rel+' archive readback');
    const temp=full+'.maine-sld-evidence-recovery-pin.tmp';assert(temp.startsWith(prefix));if(!before.equals(after))writeNew(temp,after);
    plans.push({rel,full,before,after,oldPin,oldLoader,newLoader,temp});
  }
  for(const row of plans)assert(fs.readFileSync(row.full).equals(row.before),row.rel+' full transaction guard');
  for(const row of plans){
    assert(fs.readFileSync(row.full).equals(row.before),row.rel+' atomic destination guard');
    if(!row.before.equals(row.after))fs.renameSync(row.temp,row.full);
    const reread=fs.readFileSync(row.full);assert(reread.equals(row.after),row.rel+' exact written readback');
    assert(Buffer.from(reread.toString('utf8').replace(row.newLoader,row.oldLoader),'utf8').equals(row.before),row.rel+' only pin changed');
    records.push({file:row.rel,beforePin:row.oldPin,finalPin:pin,beforeSha256:sha(row.before),afterSha256:sha(reread),unrelatedCurrentBytesPreserved:true});
  }
  const record={verifiedAt:new Date().toISOString(),moduleHash:expected,modulePin:pin,hosts:records,allImmediateBeforeCopiesVerifiedBeforeFirstWrite:true,atomicDestinationGuard:true,scope:'Only the exact Maine loader version pin in each of three latest shared hosts.'};
  writeJSON('pin-verification.json',record);console.log(JSON.stringify(record));
}
async function build(expected){
  const f=frozen(expected),source=bytes(hosts[2]),sourceHash=sha(source);
  for(const file of hosts)assert.equal(hash(file),sourceHash,file+' parity at bounded snapshot');
  const pin=expected.slice(0,8),matches=[...source.toString('utf8').matchAll(loader)];assert.equal(matches.length,1);assert.equal(matches[0][1],pin);
  writeNew(path.join(out,'tested-host.jsx'),source);writeNew(path.join(out,'maine_sld_practice_module.js'),bytes(modules[0]));writeNew(path.join(out,'frozen-activity.json'),fs.readFileSync(freezeFile));
  assert.equal(sha(fs.readFileSync(path.join(out,'maine_sld_practice_module.js'))),expected);
  assert(!fs.existsSync(path.join(out,'host.bundle.js')),'Compile bounded snapshot once');
  const esbuild=require(path.join(root,'node_modules/esbuild'));
  await esbuild.build({stdin:{contents:"import React from 'react'; import {createRoot} from 'react-dom/client'; import App from './tested-host.jsx'; createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode,null,React.createElement(App)));",resolveDir:out,loader:'jsx'},outfile:path.join(out,'host.bundle.js'),bundle:true,minify:true,platform:'browser',format:'iife',nodePaths:[path.join(root,'desktop/web-app/node_modules')],define:{'process.env.NODE_ENV':'"production"','process.env.PUBLIC_URL':'""'},logLevel:'warning'});
  const observed=hosts.map(file=>({file,sha256:hash(file)}));
  const meta={builtAt:new Date().toISOString(),baseUrl:'http://127.0.0.1:'+port,activityUrl:'http://127.0.0.1:'+port+'/app/?tool=maine-sld-practice',sourceSha256:sourceHash,bundleSha256:sha(fs.readFileSync(path.join(out,'host.bundle.js'))),moduleSha256:expected,modulePin:pin,sourceParityAtSnapshot:true,observedHostHashesAfterCompile:observed,sourceDriftDuringCompile:observed.some(row=>row.sha256!==sourceHash),previewOnlyTransforms:[],preservesProductionFiles:true,exactModuleSnapshotServed:true,localModuleResolution:'Unmodified host localhost /app/ resolution; exact frozen module snapshot supplied by preview HTTP server.',frozenSourceHashes:f.sourceHashes};
  writeNew(path.join(out,'preview.json'),JSON.stringify(meta,null,2));console.log(JSON.stringify(meta));
}
function verify(expected){
  frozen(expected);const parser=require(path.join(root,'node_modules/@babel/parser'));
  const pinMeta=readJSON(path.join(report,'pin-verification.json')),meta=readJSON(path.join(out,'preview.json'));
  assert.equal(pinMeta.moduleHash,expected);assert.equal(meta.moduleSha256,expected);
  assert.equal(sha(fs.readFileSync(path.join(out,'tested-host.jsx'))),meta.sourceSha256);assert.equal(sha(fs.readFileSync(path.join(out,'host.bundle.js'))),meta.bundleSha256);assert.equal(sha(fs.readFileSync(path.join(out,'maine_sld_practice_module.js'))),expected);
  parser.parse(fs.readFileSync(path.join(out,'tested-host.jsx'),'utf8'),{sourceType:'module',plugins:['jsx']});
  const observed=hosts.map(file=>{const content=bytes(file);parser.parse(content.toString('utf8'),{sourceType:'module',plugins:['jsx']});const matches=[...content.toString('utf8').matchAll(loader)];assert.equal(matches.length,1);assert.equal(matches[0][1],meta.modulePin);return {file,sha256:sha(content),matchesTestedSnapshot:sha(content)===meta.sourceSha256};});
  assert(observed.every(row=>row.sha256===observed[0].sha256),'Three latest host parity');
  const setup=readJSON(path.join(report,'setup.json'));for(const row of setup.priorPreviewFiles)assert.equal(sha(fs.readFileSync(path.join(prior,row.file))),row.sha256,'Prior preview preserved '+row.file);
  for(const row of setup.priorIntegrationRecords)assert.equal(hash(row.file),row.sha256,'Prior record preserved '+row.file);
  const record={verifiedAt:new Date().toISOString(),moduleHash:expected,modulePin:meta.modulePin,moduleFourCopyParity:true,currentHostThreeCopyParity:true,jsxSourcesParsed:3,testedHostSha256:meta.sourceSha256,observedHostHashes:observed,currentSourcesMatchTestedSnapshot:observed.every(row=>row.matchesTestedSnapshot),previewOnlyTransforms:[],previousAcceptedPreviewPreserved:true};
  writeJSON('static-verification.json',record);console.log(JSON.stringify(record));
}
function serve(expected){
  const meta=readJSON(path.join(out,'preview.json'));assert.equal(meta.moduleSha256,expected);
  const immutable=new Map();
  for(const file of ['index.html','host.css','host.bundle.js','maine_sld_practice_module.js'])immutable.set(file,fs.readFileSync(path.join(out,file)));
  assert.equal(sha(immutable.get('maine_sld_practice_module.js')),expected);assert.equal(sha(immutable.get('host.bundle.js')),meta.bundleSha256);assert.equal(sha(fs.readFileSync(path.join(out,'tested-host.jsx'))),meta.sourceSha256);
  const mime={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.wasm':'application/wasm','.pdf':'application/pdf'},prefix=path.resolve(root)+path.sep;
  const server=http.createServer((req,res)=>{
    let route;try{route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
    if(route==='/maine-sld-practice'){res.writeHead(302,{Location:'/app/?tool=maine-sld-practice'});return res.end();}
    let name;if(['/app/','/app','/'].includes(route))name='index.html';else if(['/app/maine_sld_practice_module.js','/maine_sld_practice_module.js'].includes(route))name='maine_sld_practice_module.js';else if(route==='/__sld_preview/host.bundle.js')name='host.bundle.js';else if(route==='/__sld_preview/host.css')name='host.css';
    if(name){const content=immutable.get(name);if(name==='maine_sld_practice_module.js'&&sha(content)!==expected){res.writeHead(409);return res.end('Frozen module snapshot drift');}res.writeHead(200,{'Content-Type':mime[path.extname(name)],'Cache-Control':'no-store'});return res.end(content);}
    const rel=route.replace(/^\/app\//,'/').replace(/^\//,'');let file=path.resolve(root,rel);if(!file.startsWith(prefix)){res.writeHead(403);return res.end();}if(!fs.existsSync(file))file=path.resolve(root,'desktop/web-app/public',rel);if(!file.startsWith(prefix)){res.writeHead(403);return res.end();}
    try{if(!fs.statSync(file).isFile())throw Error('Not file');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
  });
  server.listen(port,'127.0.0.1',()=>{const record={startedAt:new Date().toISOString(),pid:process.pid,baseUrl:meta.baseUrl,activityUrl:meta.activityUrl,moduleSha256:expected,bundleSha256:meta.bundleSha256,sourceSha256:meta.sourceSha256,pureHttpServe:true,immutablePrimaryAssetsPreloadedBeforeListen:true,preloadedAssets:[...immutable].map(([file,data])=>({file,sha256:sha(data),bytes:data.length})),ownedHelperPath:__filename,ownedHelperSha256:sha(fs.readFileSync(__filename)),launchArguments:process.argv.slice(2)};writeNew(path.join(out,'runtime.json'),JSON.stringify(record,null,2));console.log(JSON.stringify(record));});
}
function observe(expected){
  frozen(expected);const meta=readJSON(path.join(out,'preview.json'));
  const observed=hosts.map(file=>{const content=bytes(file),h=sha(content);return {file,sha256:h,matchesTestedSnapshot:h===meta.sourceSha256,observedMaineLoaderPins:[...content.toString('utf8').matchAll(loader)].map(row=>row[1])};});
  const record={observedAt:new Date().toISOString(),testedHostSha256:meta.sourceSha256,observedHostHashes:observed,currentHostThreeCopyParity:observed.every(row=>row.sha256===observed[0].sha256),currentHostsHaveReviewedLoaderPin:observed.every(row=>row.observedMaineLoaderPins.length===1&&row.observedMaineLoaderPins[0]===meta.modulePin),moduleHash:expected,moduleFourCopyParity:true,boundedSnapshotRetained:true,rebuildPerformed:false};
  writeJSON('final-observed-identity.json',record);console.log(JSON.stringify(record));
}
const [mode,expected]=process.argv.slice(2);
if(mode==='prepare')prepare(expected);else if(mode==='pin')pin(expected);else if(mode==='build')build(expected).catch(e=>{console.error(e);process.exitCode=1;});else if(mode==='verify')verify(expected);else if(mode==='serve')serve(expected);else if(mode==='observe')observe(expected);else throw Error('Mode: prepare | pin | build | verify | serve | observe SHA256');
