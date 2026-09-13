const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/mailbox-image-improvements');fs.mkdirSync(out,{recursive:true});
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const source=read('AlloFlowANTI.txt');
const slice=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const tests=read('tests/class_mailbox.test.js');
const sandbox=tests.slice(tests.indexOf('function makeGsSandbox()'),tests.indexOf("describe('Code.gs protocol"));
const {call}=new Function('gsSource',sandbox+';return makeGsSandbox();')(read('apps_script/session_mailbox/Code.gs'));
const admin=call({a:'claim'}).admin,code='ABC23',secret='local_test_secret_123456';
assert.equal(call({a:'open',admin,c:code,k:secret}).ok,true);
const joined=call({a:'join',c:code,k:secret});
assert.equal(call({a:'dset',admin,c:code,p:'s',d:{mode:'sync',roster:{[joined.uid]:{uid:joined.uid,name:'Local learner'}}}}).ok,true);
const compiled=require('../_build_live_aac_module.js').buildLiveAacModule(read('live_aac_source.jsx'));
const helperSource=slice('function _alloBase64UrlEncode(value)','function _alloValidFirebaseConfig(config)');
const sender=slice('const _mbPushOneResource = useCallback(', 'const pushResourceToMailbox = useCallback(');
const retrySource=slice('const retryMailboxImagesForStudent = async', 'const toggleMbHand = useCallback(');
const receiver=slice('const applyMbDownPayload = useCallback(', 'const createHomeworkAssignmentLink = useCallback(');
const reporter=slice('const reportMailboxImageProgress = useCallback(', 'const retryMailboxImagesForStudent = async');
const assets={'/react.js':read('desktop/web-app/node_modules/react/umd/react.development.js'),'/react-dom.js':read('desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'),'/sync.js':read('firestore_sync_module.js'),'/media.js':compiled};
const url='https://script.google.com/macros/s/LOCAL_TEST/exec';
let mediaGood=false,browser;const receipts=[],errors=[],connections=new Map();
const save=(name,value)=>{const p=path.join(out,name),tmp=p+'.mailbox-next';fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');fs.renameSync(tmp,p);};
const until=async(predicate)=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,50));}assert(predicate(),'expected mailbox receipt');};
const getEntry=uid=>call({a:'dget',admin,c:code,ps:[{p:'s'}]}).docs[0].d.roster[uid];
async function createContext(viewport){
 const context=await browser.newContext({viewport}),connection={offline:false,aborts:0};connections.set(context,connection);
 await context.route('**/*',async route=>{
   const request=route.request(),u=new URL(request.url());
   if(u.hostname==='script.google.com'){
     if(connection.offline){connection.aborts++;return route.abort('internetdisconnected');}
     const payload=JSON.parse(request.postData()||'{}'),result=call(payload);
     const value=payload.u?.['roster.'+payload.uid+'.imageDelivery'];if(value&&result.ok)receipts.push({uid:payload.uid,...value});
     return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result),headers:{'Access-Control-Allow-Origin':'*'}});
   }
   if(u.hostname==='media.test')return route.fulfill({status:mediaGood?200:404,contentType:'image/jpeg',body:mediaGood?fs.readFileSync(path.join(root,'profile-image.jpg')):Buffer.from('missing')});
   if(assets[u.pathname])return route.fulfill({status:200,contentType:'text/javascript',body:assets[u.pathname]});
   if(u.hostname==='local.test')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Local mailbox image test</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;margin:24px;color:#0f172a}button{font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #2563eb;outline-offset:3px}#preview img{max-width:280px}</style></head><body><main><h1>Local mailbox image test</h1><div id="preview"></div><div id="status"></div></main><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/sync.js"></script><script src="/media.js"></script></body></html>'});
   return route.abort();
 });return context;
}
async function createPage(context){const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto('http://local.test/mailbox');return page;}
async function installStudent(page,participant,failDecode=false){
 await page.evaluate(({helperSource,receiver,reporter,participant,code,url,failDecode})=>{
  const H=new Function(helperSource+';return {_alloMailboxCallWithRetry,_alloCollectResChunk,_alloFinishResChunk,_alloDecodeAlloPack};')();
  window.historyItems=[];window.receiveError=false;window.assignmentAt=0;window.decodeCount=0;window.appliedCount=0;let failOnce=failDecode;
  const store={current:{parts:{},applied:new Set()}};
  const deps={useCallback:fn=>fn,mbChunkStoreRef:store,mbStudentCursorRef:{current:0},...H,_alloDecodeAlloPack:async text=>{decodeCount++;if(failOnce){failOnce=false;throw Error('Simulated transient decode failure');}return H._alloDecodeAlloPack(text);},_alloStudentSafeResources:r=>r,setHistory:fn=>{appliedCount++;historyItems=fn(historyItems);},hydratedHistoryRef:{current:[]},setPendingQrAssignmentResource:()=>{},setMbResourceReceiveError:v=>{receiveError=v;},addToast:()=>{},warnLog:()=>{}};
  const apply=new Function(...Object.keys(deps),receiver+';return applyMbDownPayload;')(...Object.values(deps));
  window.poll=async({partial=false,reverse=false,duplicate=false}={})=>{
    const box=await H._alloMailboxCallWithRetry(url,{a:'recv',c:code,uid:participant.uid,pt:participant.pt,box:'down',since:'0'},2,40);
    let messages=box.b.down.m.map(([,message])=>message.v);if(partial)messages=messages.slice(0,1);if(reverse)messages.reverse();
    for(const message of messages){await apply(message);if(duplicate)await apply(message);}return historyItems.length;
  };
  const reportDeps={useCallback:fn=>fn,mbStudent:{code},isTeacherMode:false,activeSessionCode:code,user:{uid:participant.uid},activeSessionAppId:'test',appId:'test',canWriteMailboxImageDelivery:()=>true,normalizeMailboxImageDelivery:AlloModules.LiveAac.normalizeMailboxImageDelivery,doc:()=>({}),db:{},writeToSession:async(_,u)=>H._alloMailboxCallWithRetry(url,{a:'dpatch',c:code,uid:participant.uid,pt:participant.pt,p:'s',u},2,40)};
  const report=new Function(...Object.keys(reportDeps),reporter+';return reportMailboxImageProgress;')(...Object.values(reportDeps));
  window.studentRoot=ReactDOM.createRoot(document.getElementById('status'));
  window.draw=()=>{
    studentRoot.render(React.createElement(AlloModules.LiveAac.MailboxImageDeliveryMonitor,{resource:historyItems[0],enabled:true,sessionKey:code,assignmentAt,onReceipt:report,receiveError}));
    if(historyItems[0]){document.getElementById('preview').innerHTML='<h2>Student picture</h2><img alt="Synthetic colorful pattern">';document.querySelector('#preview img').src=historyItems[0].data.imageUrl;}
  };
 },{helperSource,receiver,reporter,participant,code,url,failDecode});
}
(async()=>{try{
 browser=await chromium.launch({headless:true});
 const teacher=await createContext({width:1100,height:760}),student=await createContext({width:390,height:844});
 const [t,s]=await Promise.all([createPage(teacher),createPage(student)]);
 const stats=await t.evaluate(async({helperSource,sender,admin,code,url})=>{
  const H=new Function(helperSource+';return {_alloMailboxCallWithRetry,_alloSplitPackChunks,_alloEncodeAlloPack};')();
  const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1500;const ctx=canvas.getContext('2d'),data=ctx.createImageData(canvas.width,canvas.height);let seed=123456789;
  for(let i=0;i<data.data.length;i+=4){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data.data[i]=seed&255;data.data[i+1]=(seed>>>8)&255;data.data[i+2]=(seed>>>16)&255;data.data[i+3]=255;}ctx.putImageData(data,0,0);
  window.original={id:'picture',type:'image',title:'Local large picture',data:{imageUrl:canvas.toDataURL('image/png'),altText:'Synthetic colorful pattern',visualPlan:{panels:[{imageUrl:'https://media.test/retry.jpg',caption:'Retry picture'}]}}};
  const before=original.data.imageUrl.length;
  window.prepared=await AlloModules.LiveAac.prepareMailboxResource(original,window);
  let chunks=0;
  const deps={useCallback:fn=>fn,mbLive:{code},mbConfig:{url,admin},mbPeersRef:{current:{}},prepareMailboxResourceImages:async()=>prepared.resource,...H,_alloDcSendDrained:async()=>{},warnLog:console.warn};
  const send=deps._alloMailboxCallWithRetry;deps._alloMailboxCallWithRetry=async(...args)=>{chunks++;return send(...args);};
  window.push=new Function(...Object.keys(deps),sender+';return _mbPushOneResource;')(...Object.values(deps));await push(original,{open:false,quiet:true});
  window.teacherRoot=ReactDOM.createRoot(document.getElementById('status'));window.drawStatus=(entry,onRetry)=>teacherRoot.render(React.createElement(AlloModules.LiveAac.MailboxImageStatus,{entry,resourceId:'picture',resourceAt:entry.resourceAt||0,onRetry,now:Date.now(),mailboxVersion:23}));drawStatus({name:'Local learner'},async()=>{});
  return {originalChars:before,preparedChars:prepared.resource.data.imageUrl.length,report:prepared.report,chunks,originalUnchanged:before===original.data.imageUrl.length};
 },{helperSource,sender,admin,code,url});
 assert(stats.originalChars>5*1024*1024);assert(stats.preparedChars<750*1024);assert(stats.originalUnchanged);assert(stats.chunks>1);assert.equal(stats.report.resized,1);
 await installStudent(s,joined,true);
 await s.evaluate(async()=>{await poll();window.failedBeforeReplay=receiveError&&historyItems.length===0;await poll({reverse:true,duplicate:true});window.recoveredAfterReplay=!receiveError&&historyItems.length===1;draw();});
 await s.getByRole('button',{name:'Retry images',exact:true}).waitFor();assert(await s.evaluate(()=>failedBeforeReplay&&recoveredAfterReplay));
 await s.screenshot({path:path.join(out,'student-missing-390.png')});
 await until(()=>getEntry(joined.uid).imageDelivery?.status==='failed');
 await t.evaluate(entry=>drawStatus(entry,async()=>{}),getEntry(joined.uid));await t.getByText('Images missing 1/2').waitFor();await t.screenshot({path:path.join(out,'teacher-missing.png')});
 mediaGood=true;await s.getByRole('button',{name:'Retry images',exact:true}).click();await s.getByRole('button',{name:'Retry images',exact:true}).waitFor({state:'hidden'});
 await until(()=>getEntry(joined.uid).imageDelivery?.status==='ready');
 const imageBeforeActivity=getEntry(joined.uid).imageDelivery;
 const activity={version:1,activityId:'quiz-local',kind:'quiz',status:'complete',completed:3,total:3,at:Date.now()};
 assert.equal(call({a:'dpatch',c:code,uid:joined.uid,pt:joined.pt,p:'s',u:{['roster.'+joined.uid+'.activityProgress']:activity}}).ok,true);
 assert.deepEqual(getEntry(joined.uid).imageDelivery,imageBeforeActivity);
 await t.evaluate(entry=>drawStatus(entry,async()=>{}),getEntry(joined.uid));await t.getByText('Images loaded 2/2').waitFor();await t.screenshot({path:path.join(out,'teacher-loaded.png')});
 mediaGood=false;await s.evaluate(()=>{assignmentAt=Date.now();draw();});await s.getByRole('button',{name:'Retry images',exact:true}).waitFor();await until(()=>getEntry(joined.uid).imageDelivery?.status==='failed');
 await t.exposeFunction('refreshStudentAssignment',async()=>{await s.evaluate(async({url,joined,code})=>{const result=await fetch(url,{method:'POST',body:JSON.stringify({a:'dget',c:code,uid:joined.uid,pt:joined.pt,ps:[{p:'s'}]})}).then(r=>r.json());assignmentAt=result.docs[0].d.roster[joined.uid].resourceAt;await poll();draw();},{url,joined,code});});
 await t.evaluate(({entry,retrySource,admin,code,url,uid})=>{
  const deps={mbLive:{code},isTeacherMode:true,history:[original],_mbPushOneResource:push,handleSetStudentResource:async(uid,resourceId)=>{const result=await fetch(url,{method:'POST',body:JSON.stringify({a:'dpatch',admin,c:code,p:'s',u:{['roster.'+uid+'.resourceId']:resourceId,['roster.'+uid+'.resourceAt']:Date.now()}})}).then(r=>r.json());return {failed:result.ok?0:1};}};
  const retry=new Function(...Object.keys(deps),retrySource+';return retryMailboxImagesForStudent;')(...Object.values(deps));drawStatus({...entry,resourceAt:entry.imageDelivery.assignmentAt},async()=>{await retry(uid,'picture');await refreshStudentAssignment();});
 },{entry:getEntry(joined.uid),retrySource,admin,code,url,uid:joined.uid});
 mediaGood=true;await t.getByRole('button',{name:'Retry images for Local learner'}).click();await s.getByRole('button',{name:'Retry images',exact:true}).waitFor({state:'hidden'});await until(()=>getEntry(joined.uid).imageDelivery?.status==='ready');
 assert.deepEqual(getEntry(joined.uid).activityProgress,activity);
 // Late joiners use separate browser storage and participant credentials. One loses its connection mid-transfer.
 const late=call({a:'join',c:code,k:secret}),interrupted=call({a:'join',c:code,k:secret});
 for(const [person,name]of [[late,'Late learner'],[interrupted,'Reconnecting learner']])assert.equal(call({a:'dpatch',admin,c:code,p:'s',u:{['roster.'+person.uid]:{uid:person.uid,name}}}).ok,true);
 const lateContext=await createContext({width:390,height:844}),interruptedContext=await createContext({width:390,height:844});
 const [latePage,interruptedPage]=await Promise.all([createPage(lateContext),createPage(interruptedContext)]);
 await Promise.all([installStudent(latePage,late),installStudent(interruptedPage,interrupted)]);
 assert.equal(await interruptedPage.evaluate(()=>poll({partial:true})),0);
 connections.get(interruptedContext).offline=true;
 assert.equal(await interruptedPage.evaluate(async()=>{try{await poll();return false;}catch(_){return historyItems.length===0;}}),true);
 assert.equal(connections.get(interruptedContext).aborts,2);connections.get(interruptedContext).offline=false;
 await Promise.all([latePage.evaluate(async()=>{await poll({reverse:true,duplicate:true});draw();}),interruptedPage.evaluate(async()=>{await poll({reverse:true,duplicate:true});draw();}),s.evaluate(async()=>{await poll({duplicate:true});draw();})]);
 await until(()=>[joined,late,interrupted].every(p=>getEntry(p.uid).imageDelivery?.status==='ready'));
 for(const page of [latePage,interruptedPage]){const before=await page.evaluate(()=>appliedCount);await page.evaluate(()=>poll({reverse:true,duplicate:true}));assert.equal(await page.evaluate(()=>appliedCount),before);assert.equal(await page.evaluate(()=>historyItems.length),1);}
 assert.deepEqual(getEntry(joined.uid).activityProgress,activity);
 // An omission cannot be repaired by downloading the same pack again.
 await s.setViewportSize({width:320,height:640});await s.evaluate(()=>{historyItems[0]={...historyItems[0],mailboxImageReport:{omitted:1}};draw();});await s.getByRole('alert').filter({hasText:'not included in the teacher pack'}).waitFor();assert.equal(await s.getByRole('button',{name:'Retry images',exact:true}).count(),0);await s.screenshot({path:path.join(out,'student-omitted-320.png')});
 await until(()=>getEntry(joined.uid).imageDelivery?.omitted===1);await t.evaluate(entry=>drawStatus(entry,async()=>{}),getEntry(joined.uid));await t.getByText('1 omitted: replace or resize in the pack').waitFor();assert.equal(await t.getByRole('button',{name:'Retry images for Local learner'}).count(),0);await t.screenshot({path:path.join(out,'teacher-omitted.png')});
 mediaGood=false;await s.evaluate(()=>{assignmentAt++;draw();});await s.getByRole('button',{name:'Retry images',exact:true}).waitFor();assert(await s.getByRole('alert').textContent().then(text=>text.includes('Check your connection')&&text.includes('not included')));await s.screenshot({path:path.join(out,'student-mixed-320.png')});
 assert(await s.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(errors.length,0,errors.join('\n'));
 save('browser-results.json',{passed:true,...stats,decodeRecovery:true,studentRetry:true,teacherRetry:true,independentImageReceipts:true,activityProgressPreserved:true,lateJoin:true,disconnectReconnect:true,duplicateAndOutOfOrderChunks:true,concurrentStudents:3,omissionOnlyHasNoRetry:true,mixedFailuresHaveRetry:true,mobileNoOverflow:true,pageErrors:errors});
 console.log(JSON.stringify({passed:true,concurrentStudents:3,receiptWrites:receipts.length,...stats}));
 }finally{if(browser)await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
