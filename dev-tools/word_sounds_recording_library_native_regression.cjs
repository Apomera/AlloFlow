// Real Chromium IndexedDB tests of the production reviewed-recording library.
// The audio fixture verifies persistence/schema only; no playback or microphone.
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),crypto=require('crypto');
const integrated=process.argv.includes('--repo');
const repo=integrated?process.cwd():'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const {chromium}=require(path.join(repo,'node_modules/playwright'));
let core=fs.readFileSync(path.join(repo,'word_sounds_core.js'),'utf8');
if(!integrated)core=require('../next-language/transform.cjs').core(core);
const runtime=fs.readFileSync(path.join(repo,'word_sounds_module.js'),'utf8');
const helper=integrated?runtime.slice(runtime.indexOf('// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY'),runtime.indexOf('// END WORD SOUNDS REVIEWED RECORDING LIBRARY')):fs.readFileSync(path.join(__dirname,'library-helper.txt'),'utf8');
assert.match(helper,/function createWordSoundsReviewedLibrary/);
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Reviewed library persistence test</title>');});
const checks=[];let browser,page;
async function install(){await page.addScriptTag({content:core+'\n'+helper+'\nwindow.core=createWordSoundsCore();window.library=createWordSoundsReviewedLibrary(core,indexedDB);'});await page.evaluate(()=>{
window.assert=(condition,message)=>{if(!condition)throw Error(message);};
window.dbName='allo-word-sounds-reviewed-recordings-v1';
window.fixture=(word='banana',language='en',revision=1)=>{const bytes=new Uint8Array(100);[...'RIFF'].forEach((c,i)=>bytes[i]=c.charCodeAt(0));[...'WAVE'].forEach((c,i)=>bytes[i+8]=c.charCodeAt(0));const asset={mime:'audio/wav',base64:btoa(String.fromCharCode(...bytes)),durationSeconds:.4,decoded:true,source:'teacher_recording'};return core.createReviewedSyllableTask({targetWord:word,language,revision,syllables:['ba','na','na'],assets:[asset,asset,asset],reviewed:true});};
window.editDb=run=>new Promise((resolve,reject)=>{const request=indexedDB.open(dbName,1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction(['recordings','catalog'],'readwrite');tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>{db.close();reject(tx.error);};run(tx.objectStore('recordings'),tx.objectStore('catalog'),tx);};});
window.expectCode=async(operation,code)=>{try{await operation();throw Error('Expected '+code);}catch(error){assert(error.code===code,'Expected '+code+', got '+error.code+': '+error.message);}};
});}
async function check(name,fn){await page.evaluate(fn);checks.push(name);console.log('PASS '+name);}
async function run(){
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({headless:true,timeout:120000});page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);await install();
await check('empty library, explicit save and whitelisted instructional data',async()=>{
assert(!(await library.load('banana','en')).task,'starts empty');const task=fixture();task.options=['private choice'];task.privateStudentRecording='secret';task.audioUnits[0].asset.original='undo-only';const result=await library.save('banana','en',task);assert(result.task.audioUnits.length===3,'three clips');assert(!('options'in result.task)&&!('privateStudentRecording'in result.task)&&!('original'in result.task.audioUnits[0].asset),'strict whitelist');task.syllables[0]='changed';assert((await library.load('banana','en')).task.syllables[0]==='ba','immutable stored copy');
});
await page.reload();await install();
await check('native IndexedDB survives page reload and friendly English aliases',async()=>{
const entry=await library.load('  BANANA ','English');assert(entry.task&&entry.token,'reload preserved reviewed task');assert(core.resolveSyllableTask('banana',entry.task,'English').supported,'lesson accepts loaded task');
});
await check('concurrent replacements are atomic and stale removal preserves the winner',async()=>{
const before=await library.load('banana','en');const attempts=await Promise.allSettled([library.save('banana','en',fixture('banana','en',2),{expectedToken:before.token}),library.save('banana','en',fixture('banana','en',3),{expectedToken:before.token})]);assert(attempts.filter(x=>x.status==='fulfilled').length===1,'one replacement wins');assert(attempts.filter(x=>x.status==='rejected'&&x.reason.code==='conflict').length===1,'stale replacement rejected');await expectCode(()=>library.remove('banana','en',{expectedToken:before.token}),'conflict');assert((await library.load('banana','en')).task,'stale remove did not erase');
});
await check('exact regional/dialect context stays separate while German aliases reuse safely',async()=>{
await library.save('banana','en-GB',fixture('banana','en-GB'));assert((await library.load('banana','en-GB')).task,'regional entry saved');assert(!(await library.load('banana','en-AU')).task,'other region not reused');await library.save('banana','English\u241fen-US\u241fsouthern',fixture('banana','English\u241fen-US\u241fsouthern'));assert(!(await library.load('banana','English\u241fen-US\u241fnorthern')).task,'dialects remain separate');await library.save('banane','German',fixture('banane','German'));const aliased=await library.load('banane','de');assert(aliased.task&&core.resolveSyllableTask('banane',aliased.task,'de').supported,'German/de adapts exact sequence');assert(!(await library.load('banane','de-AT')).task,'Austrian locale stays separate');
});
await check('Unicode-equivalent word spellings share the same reviewed entry',async()=>{
await library.save('café','French',fixture('café','French'));const result=await library.load('cafe\u0301','fr');assert(result.task?.targetWord==='café','NFC alias load');assert(core.resolveSyllableTask('cafe\u0301',result.task,'fr').supported,'alias accepted by lesson');
});
await check('tampered review and another word are rejected before persistence',async()=>{
const altered=fixture();altered.audioUnits[0].asset.durationSeconds=.5;await expectCode(()=>library.save('banana','en',altered),'invalid');await expectCode(()=>library.save('tomato','en',fixture()),'invalid');await expectCode(()=>library.save('banane','French',fixture('banane','German')),'invalid');
});
await check('corrupt stored data is visible as unusable and removable with its current token',async()=>{
const key=library.identity('broken','en').key;await editDb((records,catalog)=>{records.put({version:1,key,targetWord:'broken',languageKey:'en-us',token:'broken1',task:fixture('other')});catalog.put({key,bytes:1});});const broken=await library.load('broken','en');assert(!broken.task&&broken.corrupt&&broken.token==='broken1','corruption reported honestly');await library.remove('broken','en',{expectedToken:broken.token});assert(!(await library.load('broken','en')).corrupt,'corrupt item removed');
});
await check('transaction failure rolls back both clip and catalog writes',async()=>{
const before=await library.load('banana','en');
const failedDb={open(...args){const request=indexedDB.open(...args);const wrapper={};for(const key of ['onupgradeneeded','onblocked','onerror'])Object.defineProperty(wrapper,key,{set(fn){request[key]=fn;}});Object.defineProperty(wrapper,'onsuccess',{set(fn){request.onsuccess=()=>fn();}});Object.defineProperties(wrapper,{error:{get:()=>request.error},transaction:{get:()=>request.transaction},result:{get:()=>new Proxy(request.result,{get(db,key){if(key==='transaction')return(...args)=>{const tx=db.transaction(...args);return new Proxy(tx,{get(target,prop){if(prop==='objectStore')return name=>{const store=target.objectStore(name);if(name!=='catalog')return store;return new Proxy(store,{get(s,k){if(k==='put')return()=>{throw new DOMException('Quota test','QuotaExceededError');};return typeof s[k]==='function'?s[k].bind(s):s[k];}});};return typeof target[prop]==='function'?target[prop].bind(target):target[prop];},set(target,key,value){target[key]=value;return true;}});};return typeof db[key]==='function'?db[key].bind(db):db[key];},set(db,key,value){db[key]=value;return true;}})}});return wrapper;}};
try{await createWordSoundsReviewedLibrary(core,failedDb).save('banana','en',fixture('banana','en',8),{expectedToken:before.token});throw Error('must fail');}catch(error){assert(error.name==='QuotaExceededError','quota propagated');assert(library.message(error).includes('storage is full'),'helpful quota feedback');}const after=await library.load('banana','en');assert(after.token===before.token,'previous transaction retained');
});
await check('unavailable, blocked, timeout and pre-aborted storage produce actionable outcomes',async()=>{
await expectCode(()=>createWordSoundsReviewedLibrary(core,null).load('banana','en'),'unavailable');const aborted=new AbortController();aborted.abort();await expectCode(()=>library.load('banana','en',{signal:aborted.signal}),'cancelled');const blocked={open(){const request={};queueMicrotask(()=>request.onblocked?.());return request;}};await expectCode(()=>createWordSoundsReviewedLibrary(core,blocked).load('banana','en'),'blocked');const original=window.setTimeout;window.setTimeout=(fn,ms)=>original(fn,ms===10000?0:ms);try{await expectCode(()=>createWordSoundsReviewedLibrary(core,{open:()=>({})}).load('banana','en'),'timeout');}finally{window.setTimeout=original;}
});
await check('cancellation during an actual pending transaction leaves prior clips intact',async()=>{
const before=await library.load('banana','en'),abort=new AbortController();const op=library.save('banana','en',fixture('banana','en',9),{expectedToken:before.token,signal:abort.signal});abort.abort();await expectCode(()=>op,'cancelled');assert((await library.load('banana','en')).token===before.token,'cancelled write kept previous clips');
});
await check('library has bounded entry capacity, replacement at capacity and reusable removal',async()=>{
await editDb((records,catalog)=>{records.clear();catalog.clear();});for(let i=0;i<128;i++)await library.save('word'+i,'en',fixture('word'+i));await expectCode(()=>library.save('overflow','en',fixture('overflow')),'full');const one=await library.load('word0','en');const replacement=await library.save('word0','en',fixture('word0','en',2),{expectedToken:one.token});assert(replacement.task.revision===2,'replace at capacity');await library.remove('word0','en',{expectedToken:replacement.token});assert(!(await library.load('word0','en')).task,'explicit removal');await library.save('overflow','en',fixture('overflow'));
});
await check('byte budget and corrupt accounting fail atomically without evicting recordings',async()=>{
await editDb((records,catalog)=>{records.clear();catalog.clear();catalog.put({key:'space',bytes:library.limits.bytes});});await expectCode(()=>library.save('banana','en',fixture()),'full');assert(!(await library.load('banana','en')).task,'oversize not written');await editDb((records,catalog)=>{catalog.put({key:'space',bytes:-1});});await expectCode(()=>library.save('banana','en',fixture()),'invalid');assert(!(await library.load('banana','en')).task,'corrupt catalog not written');
});
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();const output=process.env.WORD_SOUNDS_LIBRARY_REPORT||path.join(__dirname,'native-test-results.json');fs.writeFileSync(output,JSON.stringify({passed:!process.exitCode,checks,coreSha:crypto.createHash('sha256').update(core).digest('hex'),helperSha:crypto.createHash('sha256').update(helper).digest('hex'),limits:'Real browser IndexedDB and production helper; schema audio fixture only, no playback, microphone, cloud or pronunciation evaluation.'},null,2));});
