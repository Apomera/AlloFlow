const assert=require('node:assert/strict');const fs=require('fs'),path=require('path');
const output=path.resolve('reports/visual-organizer-review-2026-09-19');
process.env.ALLOFLOW_DESKTOP_HOME=fs.mkdtempSync(path.resolve('.tmp/organizer-lan-'));
const runtime=require('../../desktop/runtime/alloflow-desktop-runtime.cjs');
(async()=>{const server=runtime.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let share;const checks=[];let controller;
 const teacher='http://127.0.0.1:'+server.address().port;
 const req=async(base,route,method='GET',body,token)=>{const r=await fetch(base+route,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});let data;try{data=await r.json();}catch{}return {status:r.status,data};};
 const ok=(name,value)=>{assert.ok(value,name);checks.push(name);};
 try{
  const resource={id:'kwl-lan-1',type:'outline',data:{structureType:'KWL Chart',main:'Water',branches:[{title:'Know',items:[]},{title:'Want',items:[]},{title:'Learned',items:[]}]}};
  const remote={type:'reflection',activityId:'organizer:kwl-lan-1:reflection:100',resourceId:resource.id,structureType:'KWL Chart',armedAt:Date.now()};
  let r=await req(teacher,'/api/lan-sessions','POST',{code:'ORGANIZER1',session:{mode:'sync',isActive:true,resources:[resource],roster:{},interactiveOrganizer:remote}});ok('Teacher creates isolated organizer session',r.status===200);
  share=await runtime.startLanShare({...runtime.readConfig(),liveSession:{mode:'schoolbox-lan',lan:{shareHost:'127.0.0.1',sharePort:0,pin:'ORGANIZER-TEST'}}});const student='http://127.0.0.1:'+share.port;
  const join=async uid=>{const auth=await req(student,'/api/lan-auth','POST',{sessionCode:'ORGANIZER1',pin:'ORGANIZER-TEST'});assert.equal(auth.status,200);const token=auth.data.token;const joined=await req(student,'/api/lan-sessions/ORGANIZER1','PATCH',{updates:{['roster.'+uid]:{uid,name:uid,status:'active',joinedAt:new Date().toISOString()}}},token);assert.equal(joined.status,200,JSON.stringify(joined));return token;};
  const token=await join('student1'),other=await join('student2');ok('Two separately authorized students join',!!token&&!!other);
  r=await req(student,'/api/lan-sessions/ORGANIZER1','GET',null,token);const session=r.data.session.data;ok('Student receives matching diagram and activity',session?.interactiveOrganizer?.activityId===remote.activityId&&session.resources[0].id===resource.id);ok('Student projection hides peer roster',session.roster.student1&&!session.roster.student2);
  const progress={activityId:remote.activityId,type:'reflection',gameType:null,status:'loading',score:0,correct:0,total:3,attempts:0,at:Date.now()};
  for(const status of ['loading','ready','complete']){r=await req(student,'/api/lan-sessions/ORGANIZER1','PATCH',{updates:{'roster.student1.organizerProgress':{...progress,status},'roster.student1.activityProgress':{version:1,activityId:remote.activityId,kind:'visual_organizer',status:status==='complete'?'submitted':status,completed:status==='complete'?1:0,total:3,at:Date.now()},'roster.student1.viewingResourceStatus':'ready','roster.student1.lastSeen':Date.now()}},token);ok('Student '+status+' receipt accepted',r.status===200);}
  r=await req(teacher,'/api/lan-sessions/ORGANIZER1');ok('Teacher sees submitted receipt without raw writing',r.data.session.data.roster.student1.organizerProgress.status==='complete'&&!JSON.stringify(r.data.session.data.roster).includes('organizerReflection'));
  const attacks=[{'roster.student2.organizerProgress':progress},{'interactiveOrganizer':remote},{'roster.student1.organizerProgress':{...progress,text:'private draft'}},{'roster.student1.organizerProgress':{...progress,total:-1}},{'roster.student1.activityProgress':{version:1,activityId:remote.activityId,kind:'visual_organizer',status:'submitted',completed:4,total:3,at:Date.now()}}];
  for(let i=0;i<attacks.length;i++){r=await req(student,'/api/lan-sessions/ORGANIZER1','PATCH',{updates:attacks[i]},token);ok('Reject invalid or unauthorized participant write '+(i+1),r.status>=400);}
  controller=new AbortController();const stream=await fetch(teacher+'/api/lan-sessions/ORGANIZER1/events',{signal:controller.signal});assert.equal(stream.status,200);const reader=stream.body.getReader();let streamText='';const collect=(async()=>{try{while(true){const {done,value}=await reader.read();if(done)break;streamText+=Buffer.from(value).toString();}}catch{}})();
  r=await req(teacher,'/api/lan-sessions/ORGANIZER1','PATCH',{updates:{interactiveOrganizer:{...remote,retryAt:Date.now(),retryUids:['student1']}}});ok('Teacher targets retry without changing activity identity',r.status===200);
  r=await req(student,'/api/lan-sessions/ORGANIZER1','GET',null,token);ok('Reconnected student receives targeted retry',r.data.session.data.interactiveOrganizer.retryUids[0]==='student1'&&r.data.session.data.interactiveOrganizer.activityId===remote.activityId);
  r=await req(student,'/api/lan-sessions/ORGANIZER1','PATCH',{updates:{'roster.student1.organizerProgress':{...progress,status:'ready',at:Date.now()}}},token);ok('Reconnected student can acknowledge activity',r.status===200);
  await req(teacher,'/api/lan-sessions/ORGANIZER1','PATCH',{updates:{interactiveOrganizer:null}});r=await req(student,'/api/lan-sessions/ORGANIZER1','GET',null,token);ok('Teacher stop reaches student',r.data.session.data.interactiveOrganizer===null);
  await new Promise(r=>setTimeout(r,80));controller.abort();await collect;ok('Live SSE carries retry, ready, and stop updates',streamText.includes('retryUids')&&streamText.includes('"interactiveOrganizer":null'));
  fs.writeFileSync(path.join(output,'followup-lan-results.json'),JSON.stringify({checks,passed:checks.length,scope:'Real isolated Desktop LAN HTTP and SSE listeners; teacher private API and two participant tokens; no external classroom changed.'},null,2));console.log(JSON.stringify({passed:checks.length,checks}));
 }finally{controller?.abort();await runtime.stopLanShare();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

