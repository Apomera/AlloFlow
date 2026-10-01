// Isolated Chromium acceptance: intercepted fixture origin, no app server or live data.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const docs=new Map(),results=[],errors=[];
const host=read('AlloFlowANTI.txt');
const cut=(from,to)=>{const a=host.indexOf(from),b=host.indexOf(to,a);assert(a>=0&&b>a);return host.slice(a,b);};
const codec=cut('function _alloBase64UrlEncode(value)','function _alloValidFirebaseConfig(config)');
const loader=cut('          const loadAssignment = async () => {','          loadAssignment();');
const receiver=cut('  const applyMbDownPayload = useCallback(', '  const createHomeworkAssignmentLink = useCallback(');
const assets={
 '/react.js':read('desktop/web-app/node_modules/react/umd/react.development.js'),
 '/react-dom.js':read('desktop/web-app/node_modules/react-dom/umd/react-dom.development.js')
};
for(const name of ['instructional_context_module.js','firestore_sync_module.js','text_pipeline_helpers_module.js','session_transport_module.js','live_aac_module.js','shared_activity_module.js','module_scope_extras_module.js','karaoke_audio_store_module.js'])assets['/'+name]=read(name);
const scriptTags=Object.keys(assets).map(src=>'<script src="'+src+'"></script>').join('');
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;margin:16px}details{padding:12px;border:1px solid #94a3b8}p{margin:8px 0}summary{cursor:pointer}</style></head><body><main id="root"></main>'+scriptTags+'</body></html>';
let browser;
async function context(locale='english'){
 const c=await browser.newContext({viewport:{width:360,height:780}});
 let disconnected=false;
 await c.exposeFunction('fixtureSet',async(ref,value)=>{docs.set(ref,structuredClone(value));});
 await c.exposeFunction('fixtureGet',async ref=>{if(disconnected)throw Error('Fixture offline');return docs.has(ref)?structuredClone(docs.get(ref)):null;});
 await c.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='delivery.test')return route.abort();
   if(assets[u.pathname])return route.fulfill({contentType:'text/javascript',body:assets[u.pathname]});
   return route.fulfill({contentType:'text/html',body:html});
 });
 await c.addInitScript(({codec,loader,receiver,values})=>{
  window.fixtureCodecs=()=>new Function(codec+';return {encode:_alloEncodeAlloPack,decode:_alloDecodeAlloPack,collect:_alloCollectResChunk,finish:_alloFinishResChunk};')();
  window.fixtureLoaderSource=loader;window.fixtureReceiverSource=receiver;window.fixtureValues=values;
  window.doc=(_db,...parts)=>parts.join('/');window.db={};
  window.setDoc=(ref,data)=>fixtureSet(ref,data);
  window.getDoc=async ref=>{const data=await fixtureGet(ref);return{exists:()=>data!==null,data:()=>data};};
  window.__alloFirebase={auth:{currentUser:{uid:'fixture-teacher'}}};
 },{codec,loader,receiver,values:locale==='english'?JSON.parse(read('reports/connected-delivery-track13/delivery-locales.json')).english:JSON.parse(read('lang/'+locale+'.js')).share_collect});
 return{c,offline:()=>{disconnected=true;}};
}
async function pageIn(c,url='https://delivery.test/'){
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await installPage(p);return p;
}
async function installPage(p){
 await p.evaluate(()=>{
  window.fixtureRender=resources=>{
   window.received=resources;
   window.fixtureRoot ||= ReactDOM.createRoot(document.getElementById('root'));
   fixtureRoot.render(React.createElement(AlloModules.SharedActivity.ReceivedReadingDelivery,{resources,currentResourceId:resources.find(r=>r.id==='adapted')?.id||resources[0]?.id,enabled:true,t:key=>fixtureValues[key.replace('share_collect.','')]||key}));
  };
  window.fixtureOpenPack=async()=>{const raw=new URLSearchParams(location.hash.slice(1)).get('allo_pack');const packet=JSON.parse(await fixtureCodecs().decode(raw));const received=AlloModules.SessionTransport.studentSafeResources(packet.resources,['analysis']);fixtureRender(received);return AlloModules.SharedActivity.describeAssignmentDelivery(received,packet.currentResourceId,null,{received:true});};
  window.fixtureReceiveResource=async encoded=>{
    const codecs=fixtureCodecs(),store={current:{parts:{},applied:new Set()}};let received=[],evidence=[];
    const deps={useCallback:fn=>fn,mbChunkStoreRef:store,mbStudentCursorRef:{current:0},hydratedHistoryRef:{current:[]},
      _alloCollectResChunk:codecs.collect,_alloFinishResChunk:codecs.finish,_alloDecodeAlloPack:codecs.decode,
      _alloStudentSafeResources:items=>AlloModules.SessionTransport.studentSafeResources(items,['analysis']),
      setReceivedDeliveryResources:update=>{evidence=update(evidence);},setHistory:update=>{received=update(received);},setPendingQrAssignmentResource:()=>{},setMbResourceReceiveError:()=>{},addToast:()=>{},warnLog:()=>{}};
    const apply=new Function(...Object.keys(deps),fixtureReceiverSource+';return applyMbDownPayload;')(...Object.values(deps));
    await apply({kind:'res',rid:'fixture-resource',part:1,of:1,data:encoded});fixtureRender(evidence);
    return AlloModules.SharedActivity.describeAssignmentDelivery(evidence,'adapted',null,{received:true});
  };
  window.fixtureOpenAssignment=async packet=>{
    window.fixtureToasts=[];window.received=null;
    const deps={_alloEnsureAuthenticatedUser:async()=>({uid:'fixture-student'}),setUser:()=>{},doc,db,hostId:'fixture',assignmentId:'HW-fixture',
      getDoc:async()=>({exists:()=>true,data:()=>packet}),_alloApplyAuthoritativeStudentAiPolicy:()=>{},_alloAssignmentIsExpired:()=>false,
      hydrateSessionAssets,cancelled:false,setHistory:resources=>{window.received=resources;},setReceivedDeliveryResources:resources=>fixtureRender(resources),setPendingQrAssignmentResource:()=>{},addToast:(...args)=>fixtureToasts.push(args),warnLog:()=>{}};
    const load=new Function(...Object.keys(deps),fixtureLoaderSource+';return loadAssignment;')(...Object.values(deps));await load();return{received:window.received,toasts:fixtureToasts};
  };
 });
}
(async()=>{try{
 browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 const teacher=await context(),tp=await pageIn(teacher.c);
 const audioBuffer=Buffer.alloc(1644,128);audioBuffer.write('RIFF');audioBuffer.writeUInt32LE(1636,4);audioBuffer.write('WAVE',8);audioBuffer.write('fmt ',12);audioBuffer.writeUInt32LE(16,16);audioBuffer.writeUInt16LE(1,20);audioBuffer.writeUInt16LE(1,22);audioBuffer.writeUInt32LE(8000,24);audioBuffer.writeUInt32LE(8000,28);audioBuffer.writeUInt16LE(1,32);audioBuffer.writeUInt16LE(8,34);audioBuffer.write('data',36);audioBuffer.writeUInt32LE(1600,40);
 const picture='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="green"/></svg>').toString('base64');
 const fixture=await tp.evaluate(async({picture,audio})=>{
   const api=AlloModules.InstructionalContext,original=api.createSupportedReading('A source.',{id:'original',sourceFamilyId:'family',unitId:'unit'});
   original.readingSupports=api.validateReadingSupports(original,{annotations:[{id:'word',start:2,end:8,quote:'source',text:'A beginning',origin:'educator',pinned:true,image:{src:picture,alt:'Green square'}}]});
   const adapted={id:'adapted',type:'simplified',title:'A received reading',data:'A beginning.',sourceSnapshot:original.sourceSnapshot,sourceFamilyId:'family',unitId:'unit',instructionalText:{form:'adapted',role:'supplemental'},karaokeStudentAudio:{recording:'PRIVATE_STUDENT_AUDIO'}};
   const identity={identityVersion:4,adapterId:'alloflow.simplified.read-aloud',adapterVersion:1,scopeId:'main',segmentId:'body/0/sentence/0',spokenFingerprint:'fixture-source',spokenText:adapted.data};
   const store=AlloModules.KaraokeAudioStore.createStore();if(!store.put(identity,audio,'audio/wav','ai-generated'))throw Error('Fixture audio rejected');adapted.karaokeAudio=store.serialize();store.clear();
   const resources=[adapted,original];
   const serialize=item=>AlloModules.LiveAac.serializeResourceForStudentPack(item,{sanitizeHistoryForCloud,stripUndefined});
   const built=await AlloModules.SharedActivity.buildAssignmentPackEncoded({resourceIds:['adapted']},{resolveAssignmentResources:()=>resources,serializeResourceForStudentPack:serialize,stripUndefined,generateUUID:()=> 'fixture',encodeAlloPack:fixtureCodecs().encode});
   const saved=await uploadSessionAssets('fixture',resources.map(serialize),'SAVED');
   let live;
   const sender=AlloModules.SessionTransport.createFirebaseTransport({teacherOnlyTypes:['analysis'],uploadAssets:items=>uploadSessionAssets('fixture',items,'LIVE'),prepareResources:prepareSessionResourcesForWrite,write:async value=>{live=value.resources;}});
   await sender.publishResources(resources);
   const damaged={...adapted,data:'{"broken":',dataEncoding:'json-text/v1'};
   const damagedResources=hydrateHistory([damaged]).map(serialize);
   const damagedEncoded=await fixtureCodecs().encode(JSON.stringify({resources:damagedResources,currentResourceId:'adapted'}));
   const damagedSaved=await uploadSessionAssets('fixture',damagedResources,'DAMAGED');
   return{damagedEncoded,damagedSaved,encoded:built.encoded,resourceEncoded:await fixtureCodecs().encode(JSON.stringify(serialize(adapted))),saved,live,identity};
 },{picture,audio:audioBuffer.toString('base64')});
 await teacher.c.close();
 const recipient=await context(),page=await pageIn(recipient.c,'https://delivery.test/#allo_pack='+fixture.encoded);
 for(const label of ['first-open','refresh','offline-reopen']){
   if(label==='refresh')await page.reload();
   if(label==='offline-reopen')recipient.offline();
   // Reinstall only fixture UI functions after reload; actual payload stays in URL.
   if(label==='refresh'){
     await installPage(page);
     const s=await page.evaluate(()=>fixtureOpenPack());assert.equal(s.readings[0].capabilities.referenceAudio.inclusion,'omitted');
     results.push({case:label,passed:true});continue;
   }
   const p=label==='first-open'?page:await pageIn(recipient.c,'https://delivery.test/#allo_pack='+fixture.encoded);
   const summary=await p.evaluate(()=>fixtureOpenPack());assert.equal(summary.readings[0].capabilities.referenceAudio.inclusion,'omitted');assert.equal(summary.readings[0].capabilities.originalSupports.activeCount,1);
   const image=await p.evaluate(async()=>AlloModules.LiveAac.checkMailboxImages(AlloModules.LiveAac.mailboxResourceImages(received.find(r=>r.id==='original'))));assert.equal(image.status,'ready');
   results.push({case:label,passed:true});if(label!=='first-open')await p.close();
 }
 const pairing=await page.evaluate(()=>{
   const adapted={...received.find(r=>r.id==='adapted'),readingSourceAvailability:{status:'unavailable',reason:'source-unavailable'},sourceInstructionalText:{form:'original',role:'primary'}};
   const previous=received.find(r=>r.id==='original'),original={...previous,instructionalText:{...previous.instructionalText,role:'supplemental',designationSource:'educator'}};
   window.fixturePair={adapted,original};fixtureRender([adapted]);return{adaptedId:adapted.id,originalId:original.id};
 });
 await page.getByText('Matching original unavailable in this link.',{exact:true}).waitFor({state:'attached'});
 const pairedSummary=await page.evaluate(()=>{fixtureRender([fixturePair.adapted,fixturePair.original]);return AlloModules.SharedActivity.describeAssignmentDelivery(received,fixturePair.adapted.id,null,{received:true});});
 const pairedRow=pairedSummary.readings.find(r=>r.id===pairing.adaptedId);
 assert.equal(pairedRow.capabilities.originalText.resourceId,pairing.originalId);assert.equal(pairedRow.capabilities.originalSupports.activeCount,1);assert.equal(pairedRow.capabilities.instructionalRoles.original,'supplemental');
 await page.getByText('Original text received.',{exact:true}).waitFor({state:'attached'});
 assert(!(await page.locator('main').textContent()).includes('Matching original unavailable'));
 await page.evaluate(()=>fixtureRender([fixturePair.adapted]));
 await page.getByText('Matching original unavailable in this link.',{exact:true}).waitFor({state:'attached'});
 assert(!(await page.locator('main').textContent()).includes('Original text received.'));
 results.push({case:'received-original-arrival-role-and-removal',passed:true});
 await recipient.c.close();
 const mailboxCtx=await context(),mailboxPage=await pageIn(mailboxCtx.c);
 const mailbox=await mailboxPage.evaluate(encoded=>fixtureReceiveResource(encoded),fixture.resourceEncoded);
 assert.equal(mailbox.readings[0].id,'adapted');assert.equal(mailbox.readings[0].capabilities.referenceAudio.inclusion,'omitted');results.push({case:'mailbox-resource-cold-recipient',passed:true});await mailboxCtx.c.close();
 const savedCtx=await context(),savedPage=await pageIn(savedCtx.c);
 const savedResult=await savedPage.evaluate(packet=>fixtureOpenAssignment(packet),{resources:fixture.saved,currentResourceId:'adapted'});assert(savedResult.received);assert(!JSON.stringify(savedResult).includes('PRIVATE_STUDENT_AUDIO'));results.push({case:'saved-assignment-hydration',passed:true});
 savedCtx.offline();const failed=await savedPage.evaluate(packet=>fixtureOpenAssignment(packet),{resources:fixture.saved,currentResourceId:'adapted'});assert.equal(failed.received,null);assert(failed.toasts.some(t=>t[1]==='error'));assert(!failed.toasts.some(t=>t[1]==='success'));results.push({case:'saved-assignment-offline-failure',passed:true});await savedCtx.c.close();
 const damagedCtx=await context(),damagedPage=await pageIn(damagedCtx.c,'https://delivery.test/#allo_pack='+fixture.damagedEncoded);
 for(const label of ['damaged-received-reshare','damaged-refresh','damaged-offline-reopen']){
   let p=damagedPage;
   if(label==='damaged-refresh'){await p.reload();await installPage(p);}
   if(label==='damaged-offline-reopen'){damagedCtx.offline();p=await pageIn(damagedCtx.c,'https://delivery.test/#allo_pack='+fixture.damagedEncoded);}
   const summary=await p.evaluate(async()=>{await fixtureOpenPack();fixtureRender(hydrateHistory(received));return AlloModules.SharedActivity.describeAssignmentDelivery(received,'adapted',null,{received:true});});
   const damagedRow=summary.readings.find(r=>r.id==='adapted');assert.equal(damagedRow.bodyStatus,'unavailable');assert.equal(damagedRow.bodyReason,'invalid-text-envelope');
   await p.locator('summary').click();await p.locator('[data-reading-body-unavailable]').waitFor({state:'visible'});
   assert(!(await p.locator('main').textContent()).includes('"broken"'));
   results.push({case:label,passed:true});if(p!==damagedPage)await p.close();
 }
 await damagedCtx.c.close();
 const damagedSavedCtx=await context(),damagedSavedPage=await pageIn(damagedSavedCtx.c);
 const damagedSavedResult=await damagedSavedPage.evaluate(async packet=>{const result=await fixtureOpenAssignment(packet);fixtureRender(hydrateHistory(result.received));return AlloModules.SharedActivity.describeAssignmentDelivery(received,'adapted',null,{received:true});},{resources:fixture.damagedSaved,currentResourceId:'adapted'});
 assert.equal(damagedSavedResult.readings.find(r=>r.id==='adapted').bodyReason,'invalid-text-envelope');await damagedSavedPage.locator('summary').click();await damagedSavedPage.locator('[data-reading-body-unavailable]').waitFor({state:'visible'});
 results.push({case:'damaged-saved-asset-hydration',passed:true});await damagedSavedCtx.c.close();
 const liveCtx=await context(),livePage=await pageIn(liveCtx.c);
 const playback=await livePage.evaluate(async fixture=>{
   const received=await hydrateSessionAssets('fixture',fixture.live),resource=received.find(r=>r.id==='adapted');
   const reader=AlloModules.KaraokeAudioStore.createStore();const count=reader.hydrate(resource.karaokeAudio);const url=reader.get(fixture.identity);if(!url)throw Error('No received clip');
   const audio=new Audio(url);audio.muted=true;await audio.play();await new Promise((resolve,reject)=>{audio.onended=resolve;audio.onerror=()=>reject(Error('Decode failed'));setTimeout(()=>reject(Error('Playback timeout')),5000);});
   const summary=AlloModules.SharedActivity.describeAssignmentDelivery(received,'adapted',null,{received:true});reader.clear();
   return{count,audio:summary.readings[0].capabilities.referenceAudio};
 },fixture);assert.equal(playback.count,1);assert.equal(playback.audio.availability,'unverified');results.push({case:'fresh-live-store-chromium-decode-and-play',passed:true});await liveCtx.c.close();
 const sceneCtx=await context(),scenePage=await pageIn(sceneCtx.c);
 const sceneResult=await scenePage.evaluate(async()=>{
   const api=AlloModules.LiveAac,good='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=';
   const prepare=async picture=>(await api.prepareMailboxResource({id:'scene',type:'adventure',data:{scene:'A woodland path',sceneImage:picture}},{sanitizeHistoryForCloud,stripUndefined})).resource;
   const first=api.mailboxResourceImages(await prepare(good)),changed=api.mailboxResourceImages(await prepare('data:image/png;base64,AAAA'));
   const loaded=await api.checkMailboxImages(first),failed=await api.checkMailboxImages(changed);
   const old={version:1,resourceId:api.mailboxImageReceiptId('scene',first.revision),status:loaded.status,loaded:loaded.ready,total:loaded.total,omitted:loaded.omitted,assignmentAt:100,at:200};
   return{loaded,failed,retry:api.mailboxImageFailure(failed).retry,changedStatus:api.mailboxImageReceiptState({entry:{imageDelivery:old},resourceId:'scene',resourceAt:100,mediaRevision:changed.revision}).status};
 });
 assert.deepEqual(sceneResult.loaded,{status:'ready',ready:1,total:1,omitted:0});results.push({case:'scene-image-decode-success',passed:true});
 assert.deepEqual(sceneResult.failed,{status:'failed',ready:0,total:1,omitted:0});assert.equal(sceneResult.retry,true);assert.equal(sceneResult.changedStatus,'waiting');results.push({case:'changed-scene-image-decode-failure',passed:true});await sceneCtx.c.close();
 for(const locale of ['spanish_latin_america','arabic','chinese_simplified','thai']){
   const localized=await context(locale),p=await pageIn(localized.c,'https://delivery.test/#allo_pack='+fixture.encoded);await p.evaluate(()=>fixtureOpenPack());
   await p.locator('summary').click();await p.evaluate(locale=>{document.documentElement.dir=locale==='arabic'?'rtl':'ltr';},locale);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   assert(!(await p.locator('main').textContent()).includes('share_collect.'));
   if(locale==='arabic')await p.screenshot({path:path.join(__dirname,'recipient-arabic.png'),fullPage:true});
   results.push({case:'narrow-'+locale,passed:true});await localized.c.close();
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify({scope:'Isolated fixture origin; real codecs/modules/Chromium. No live backend or deployed app.',results,errors},null,2)+'\n');
 console.log(JSON.stringify({passed:results.length,errors}));
}catch(error){console.error(error);process.exitCode=1;}finally{await browser?.close();}})();
