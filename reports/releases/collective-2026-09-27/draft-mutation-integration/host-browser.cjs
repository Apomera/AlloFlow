// Disposable browser profile. Exercises production host/storage functions, not the full app shell.
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../../..');
const crypto = require('crypto');
const monitoredFiles = ['AlloFlowANTI.txt', 'view_simplified_source.jsx', 'reader_support_drafts.js', 'view_simplified_module.js', 'instructional_context_module.js', 'host_handlers_module.js', 'utils_pure_module.js', 'firestore_sync_module.js'];
const inputHashes = () => Object.fromEntries(monitoredFiles.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const inputsBefore = inputHashes();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('AlloFlowANTI.txt').replace(/\r\n/g, '\n');
function between(from, to) {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert(start >= 0 && end > start);
  return source.slice(start, end);
}
const edit = between('  const handleUpdateReadingSupports =', '  const handleGenerateReadingSupports =');
const serializer = between('        const serializeItems = (items, stripImages) => {', '        const publishMediaReceipt =');
const script = body => '<script>' + body.replace(/<\/script/gi, '<\\/script') + '</script>';
const html = '<!doctype html><meta charset="utf-8"><title>Isolated host persistence check</title>' +
  script('window.warnLog=()=>{};window.debugLog=()=>{};window.React={};') +
  ['instructional_context_module.js', 'host_handlers_module.js', 'utils_pure_module.js', 'firestore_sync_module.js'].map(file => script(read(file))).join('') +
  script(`
const dbReady = new Promise((resolve,reject)=>{const r=indexedDB.open('track04-fixture',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const access = async(mode,key,value)=>{const db=await dbReady;return new Promise((resolve,reject)=>{const tx=db.transaction('kv',mode==='get'?'readonly':'readwrite');const req=mode==='get'?tx.objectStore('kv').get(key):tx.objectStore('kv').put(value,key);tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});};
window.idbKeyval={get:key=>access('get',key),set:(key,value)=>access('set',key,value)};
const api=window.AlloModules.InstructionalContext;
const storage=window.AlloModules.UtilsPure;
const state={history:[],generatedContent:null,isTeacherMode:true};
const _resourceMutationStateRef={current:state};
const assign=key=>update=>{state[key]=typeof update==='function'?update(state[key]):update;};
const {onUpdateResource}=window.AlloModules.createHostHandlers({_resourceMutationStateRef,setHistory:assign('history'),setGeneratedContent:assign('generatedContent')});
${edit}
${serializer}
const key='track04-isolated-history';
window.fixture={state,api,storage,key,
  async load(){const saved=await storage.storageDB.get(key,{throwOnError:true,localOnly:true});state.history=saved?window.hydrateHistory(saved.items):[];state.generatedContent=state.history[0]||null;return state.history;},
  edit(id,action){return handleUpdateReadingSupports(state.history.find(row=>row.id===id),action);},
  persist(strip=false){return storage.writeVerifiedStorageSnapshot(storage.storageDB,key,{items:serializeItems(state.history,strip)});}
};
window.ready=fixture.load();
`);
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage(), errors=[], results=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',route=>route.request().url()==='http://127.0.0.1:48741/'?route.fulfill({contentType:'text/html',body:html}):route.abort());
  const reload=async()=>{await page.goto('http://127.0.0.1:48741/');assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>!!window.ready),true);await page.evaluate(()=>window.ready);};
  try {
    await reload();
    await page.evaluate(()=>{
      const f=fixture, original=f.api.createSupportedReading('The heron stood in the water.',{id:'original'});
      const adapted={id:'adapted',type:'simplified',data:'The heron stood in water.',instructionalText:{form:'adapted',role:'supplemental'},sourceSnapshot:original.sourceSnapshot,sourceFamilyId:original.sourceFamilyId,config:{language:'English',grade:'3'}};
      f.state.history=[original,adapted];f.state.generatedContent=adapted;
      for(const id of ['original','adapted']) f.edit(id,{type:'upsert',annotation:{id:'heron',start:4,end:9,quote:'heron',text:'A tall water bird.',image:{src:'data:image/png;base64,QUJD',alt:'A heron.'}}});
      return f.persist();
    });
    await reload();
    for(const id of ['original','adapted']) {
      const saved=await page.evaluate(id=>{const row=fixture.state.history.find(row=>row.id===id);return row.readingSupports||row.adaptedReadingSupports;},id);
      assert.equal(saved.annotations[0].text,'A tall water bird.');assert.equal(saved.annotations[0].image.src,'data:image/png;base64,QUJD');
      results.push(id+': explanation and picture survive actual host mutation, serializer, verified IndexedDB write, hydration and reload');
    }
    await page.evaluate(async()=>{for(const id of ['original','adapted']) fixture.edit(id,{type:'pin',id:'heron',pinned:true});return fixture.persist();});
    await reload();
    assert.equal(await page.evaluate(()=>fixture.state.history.every(row=>(row.readingSupports||row.adaptedReadingSupports).annotations[0].pinned)),true);
    results.push('Original and adapted pin changes survive verified storage and reload');
    await page.evaluate(async()=>{for(const id of ['original','adapted']) {const row=fixture.state.history.find(row=>row.id===id), entry=(row.readingSupports||row.adaptedReadingSupports).annotations[0];fixture.edit(id,{type:'upsert',annotation:{...entry,image:{...entry.image,src:'data:image/png;base64,REVG'}}});}return fixture.persist();});
    await reload();
    assert.equal(await page.evaluate(()=>fixture.state.history.every(row=>(row.readingSupports||row.adaptedReadingSupports).annotations[0].image.src==='data:image/png;base64,REVG')),true);
    results.push('Equal-length replacement pictures with identical alt text survive reload for both reading types');
    const failure=await page.evaluate(async()=>{const before=await fixture.storage.storageDB.get(fixture.key,{throwOnError:true,localOnly:true}), set=window.idbKeyval.set;window.idbKeyval.set=async()=>{throw new DOMException('Fixture quota failure','QuotaExceededError');};fixture.edit('original',{type:'pin',id:'heron',pinned:false});let error;try{await fixture.persist();}catch(e){error=e.name;}finally{window.idbKeyval.set=set;}return {error,unchanged:JSON.stringify(before)===JSON.stringify(await fixture.storage.storageDB.get(fixture.key,{throwOnError:true,localOnly:true}))};});
    assert.deepEqual(failure,{error:'QuotaExceededError',unchanged:true});
    assert.equal((await page.evaluate(()=>fixture.persist())).verified,true);await reload();
    assert.equal(await page.evaluate(()=>fixture.state.history[0].readingSupports.annotations[0].pinned),false);
    results.push('Injected quota rejection preserves previous durable bytes; a successful verified retry restores the newer pin state');
    await page.evaluate(async()=>{for(const id of ['original','adapted']) fixture.edit(id,{type:'remove',id:'heron'});return fixture.persist();});
    await reload();
    for(const id of ['original','adapted']) {
      const saved=await page.evaluate(id=>{const row=fixture.state.history.find(row=>row.id===id);return row.readingSupports||row.adaptedReadingSupports;},id);
      assert.equal(saved.annotations.length,0);assert(saved.suppressedAnnotations.some(entry=>entry.quote==='heron'&&entry.start===4&&entry.end===9));
      results.push(id+': confirmed removal and exact-occurrence suppression survive verified storage and reload');
    }
    assert.deepEqual(errors,[]);
    const report={browser:await browser.version(),results,pageErrors:errors,limitation:'Production host callback, resource handler, serializer, storage wrapper, verifier and hydrator are exercised in a disposable fixture. Full application autosave scheduling, cloud sync and deployed release are not exercised.'};
    const inputsAfter = inputHashes(); assert.deepEqual(inputsAfter, inputsBefore, 'Current shared runtime changed during browser validation'); report.inputsBefore = inputsBefore; report.inputsAfter = inputsAfter;
    fs.writeFileSync(path.join(__dirname,'host-browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
