'use strict';
// Real Chromium WebRTC, codec and backpressure helper; loopback mailbox replies
// and image preparation are controlled. This does not boot the complete app.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),http=require('node:http');
const root=path.resolve(__dirname,'../..'),file=path.resolve(root,process.argv[2]||'AlloFlowANTI.txt'),raw=fs.readFileSync(file),source=raw.toString().replace(/\r\n/g,'\n');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a,start);return source.slice(a,b);}
function fn(name){let a=source.indexOf('function '+name+'(');assert(a>=0,name);if(source.slice(a-6,a)==='async ')a-=6;const b=source.indexOf('\n}',a)+2;assert(b>a);return source.slice(a,b);}
const payload={teacher:section("  useEffect(() => {\n      if (!mbLive || !mbConfig?.url) return undefined;",'  useEffect(() => {\n      let cancelled = false;\n      if (!mbLive?.joinUrl)'),studentPoll:section('  // Mailbox student loop: announce presence','  // Real-time upgrade: the student offers'),studentRtc:section('  // Real-time upgrade: the student offers','  // Mailbox-hosted homework entry'),helpers:['_alloWaitIceComplete','_alloDcSendDrained','_alloSplitPackChunks','_alloEncodeAlloPack','_alloDecodeAlloPack','_alloBytesToBase64Url','_alloBase64UrlToBytes','_alloBase64UrlEncode','_alloBase64UrlDecode'].map(fn).join('\n'),chunkChars:Number(source.match(/const ALLO_MB_CHUNK_CHARS\s*=\s*(\d+)/)?.[1]),text:crypto.randomBytes(180000).toString('base64')};
assert(payload.chunkChars>0);
const errors=[];
(async()=>{
 let browser,server;
 try{
  server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><title>Classroom native RTC acceptance</title><p>Local connection test</p>');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {chromium}=require(path.join(root,'node_modules/playwright'));browser=await chromium.launch({headless:true,executablePath:'C:/Users/cabba/AppData/Local/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-win64/chrome-headless-shell.exe'});const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);
  const result=await page.evaluate(async payload=>{
   const helpers=new Function('ALLO_MB_CHUNK_CHARS',payload.helpers+';return {_alloWaitIceComplete,_alloDcSendDrained,_alloSplitPackChunks,_alloEncodeAlloPack,_alloDecodeAlloPack};')(payload.chunkChars);
   const NativeRTC=window.RTCPeerConnection;const rooms={},allPeers=[],packets=[],chunks=[],failures=[];
   const assert=(condition,message)=>{if(!condition)throw new Error(message);};
   const until=async(predicate,message)=>{const end=Date.now()+20000;while(!predicate()){if(Date.now()>end)throw new Error('Timed out: '+message+' '+JSON.stringify({peers:allPeers.map(p=>({connection:p.connectionState,ice:p.iceConnectionState,signaling:p.signalingState,local:!!p.localDescription,remote:!!p.remoteDescription})),rooms:Object.fromEntries(Object.entries(rooms).map(([key,value])=>[key,{up:value.up.map(e=>e[1].v.kind),down:value.down.map(e=>e[1].v.kind)}])),receives,chunks:chunks.length,packets:packets.length,failures}));await new Promise(r=>setTimeout(r,20));}};
   let heldStudentRecv=null,releaseStudentRecv=null;const receives={};
   function mount(code,uid){
    rooms[code]={up:[],down:[]};const room=rooms[code],roster={},evidence={},receivedParts={},refs={mbPeersRef:{current:{}},mbUpCursorRef:{current:0},mbRtcRef:{current:null},mbStudentCursorRef:{current:0},mbStudentConnectedRef:{current:false},mbNicknameRef:{current:'Local learner '+uid},mbHandRef:{current:false},mbAnnounceRef:{current:null},mbPollNowRef:{current:null},mbPackItemsRef:{current:[{id:'resource-'+code,type:'leveled-text',title:'Local fixture',data:{content:payload.text}}]}};
    const cleanups=[];let nudge=null;const metrics={studentActive:0,studentMax:0,teacherActive:0,teacherMax:0};
    async function mailbox(url,p){
     if(p.a==='send'){const q=room[p.box];q.push([q.length+1,{v:p.v,t:Date.now()}]);return{ok:true};}
     const role=p.box==='down'?'student':'teacher',key=role+'Active';metrics[key]++;metrics[role+'Max']=Math.max(metrics[role+'Max'],metrics[key]);receives[code+'-'+role]=(receives[code+'-'+role]||0)+1;
     try{if(role==='student'&&heldStudentRecv===code){heldStudentRecv=null;await new Promise(r=>{releaseStudentRecv=r;});}const q=room[p.box];return{t:Date.now(),docs:[],b:{[p.box]:{n:q.length,latest:q.length,m:q.filter(e=>e[0]>Number(p.since||0))}}};}finally{metrics[key]--;}
    }
    const env={...helpers,...refs,mbLive:{code},mbConfig:{url:'loopback',admin:'local-test'},mbStudent:{url:'loopback',uid,participant:'local-test',code},ALLO_MB_POLL_MS:30,document,window,setTimeout:(fn,delay)=>window.setTimeout(fn,delay),clearTimeout:id=>window.clearTimeout(id),
     useEffect(fn){cleanups.push(fn());},RTCPeerConnection:function(config){const pc=new NativeRTC(config);allPeers.push(pc);return pc;},_alloMailboxRtcConfig:()=>({iceServers:[]}),
     _alloMailboxCall:mailbox,_alloMailboxCallWithRetry:mailbox,_alloMbRecvDocPs:()=>[],_alloMbRecvDocsDelivered(){},_alloNextPollDelay:()=>30,_alloMbStallTracker:()=>({ok:()=>false,fail:()=>true}),
     _alloMbSetNudgeSender(fn){nudge=fn;},_alloMbNudge(){},warnLog(...args){failures.push(args.map(String));},addToast(){},setMbNow(){},setMbStudentStalled(){},setMbLive(){},setMbStudent(){},setMbJoinError(){},setMbJoinRetryable(){},setMbStatus(){},ALLO_MB_LIVE_KEY:'test',localStorage,
     setMbRoster(update){const next=typeof update==='function'?update(roster):update;if(next===roster)return;Object.keys(roster).forEach(k=>delete roster[k]);Object.assign(roster,next);},
     setMbHwEvidence(update){const next=update(evidence);Object.keys(evidence).forEach(k=>delete evidence[k]);Object.assign(evidence,next);},
     async prepareMailboxResourceImages(item){return item;},
     async applyMbDownPayload(v){if(v.kind!=='res')return;chunks.push({code,rid:v.rid,part:v.part});const slot=receivedParts[v.rid]||(receivedParts[v.rid]={parts:[],of:v.of});slot.parts[v.part-1]=v.data;if(slot.parts.filter(p=>typeof p==='string').length===slot.of&&!slot.done){slot.done=true;packets.push({code,resource:JSON.parse(await helpers._alloDecodeAlloPack(slot.parts.join('')))});}},
     _mbCloseTeacherPeers(){const peers=refs.mbPeersRef.current;refs.mbPeersRef.current={};Object.values(peers).forEach(p=>{p.dc?.close();p.pc?.close();});}
    };
    for(const effect of [payload.teacher,payload.studentPoll,payload.studentRtc])new Function('deps','with(deps){'+effect+'}')(env);
    return{refs,roster,evidence,room,metrics,get nudge(){return nudge;},dispose(){cleanups.reverse().forEach(fn=>fn?.());}};
   }
   const first=mount('FIRST','learner-1');await until(()=>first.refs.mbRtcRef.current?.dc?.readyState==='open'&&packets.some(p=>p.code==='FIRST'),'initial native welcome');
   assert(first.roster['learner-1']?.rtc===true,'teacher sees native RTC presence');assert(packets.find(p=>p.code==='FIRST').resource.data.content===payload.text,'actual codec reconstructs all native resource chunks');assert(chunks.filter(c=>c.code==='FIRST').length>1,'native welcome spans several chunks');
   const oldStudent=first.refs.mbRtcRef.current,oldTeacher=first.refs.mbPeersRef.current['learner-1'],oldCallbacks={message:oldStudent.dc.onmessage,open:oldStudent.dc.onopen,close:oldStudent.dc.onclose,teacherMessage:oldTeacher.dc.onmessage,teacherClose:oldTeacher.dc.onclose,signal:oldStudent.onSignal};first.dispose();
   const beforeChunks=chunks.length,second=mount('SECOND','learner-2');
   oldCallbacks.message({data:JSON.stringify({kind:'res',rid:'late-native',part:1,of:1,data:'0.'})});oldCallbacks.open();oldCallbacks.close();oldCallbacks.teacherMessage({data:JSON.stringify({kind:'hw-evidence',uid:'retired-learner',directionsId:'retired-directions'})});oldCallbacks.teacherClose();
   assert(chunks.length===beforeChunks,'retired native callback cannot reach replacement receiver');assert(Object.keys(first.evidence).length===0,'retired native teacher callback cannot add evidence');
   await until(()=>second.refs.mbRtcRef.current?.dc?.readyState==='open'&&packets.some(p=>p.code==='SECOND'),'native reconnect welcome');assert(second.roster['learner-2']?.rtc===true,'new learner RTC remains connected');assert(packets.find(p=>p.code==='SECOND').resource.data.content===payload.text,'reconnect resource remains intact');
   const offer=second.room.up.find(e=>e[1].v.kind==='rtc')[1].v,answer=second.room.down.find(e=>e[1].v.kind==='rtc')[1].v;assert(offer.offerId&&answer.offerId===offer.offerId,'real signaling echoes matching attempt token');
   heldStudentRecv='SECOND';second.refs.mbPollNowRef.current();await until(()=>releaseStudentRecv,'held native poll');const before=receives['SECOND-student'];for(let i=0;i<5;i++){window.dispatchEvent(new Event('online'));document.dispatchEvent(new Event('visibilitychange'));second.refs.mbPollNowRef.current();}await new Promise(r=>setTimeout(r,120));assert(receives['SECOND-student']===before,'wake storm does not overlap held receive');assert(second.metrics.studentMax===1,'native student receives stay serial');assert(second.metrics.teacherMax===1,'native teacher receives stay serial');releaseStudentRecv();await until(()=>receives['SECOND-student']>before,'coalesced follow-up');
   second.dispose();assert(allPeers.every(p=>p.connectionState==='closed'),'all native peers close after cleanup');
   return{passed:true,resources:packets.map(p=>({code:p.code,id:p.resource.id,exactContent:p.resource.data.content===payload.text})),nativeChunks:chunks.length,peerCount:allPeers.length,offerCorrelation:true,reconnect:true,staleCallbacksRejected:true,coalescedWake:true,studentMaxReceive:second.metrics.studentMax,teacherMaxReceive:second.metrics.teacherMax,closedPeers:true,warnings:failures};
  },payload);
  assert.equal(errors.length,0,'Browser page errors');assert.equal(result.passed,true);assert.equal(result.warnings.length,0,'Native negotiation/transfer warnings');
  const report={...result,completedAt:new Date().toISOString(),sourceFile:file,sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),pageErrors:errors,scope:'Actual teacher/student effects, production ICE/drain/chunk/codec helpers and native Chromium peer connections; loopback mailbox/image boundary and received-resource recorder. Full app, remote mailbox, WAN/TURN and assistive technology outside scope.'};fs.writeFileSync(path.join(__dirname,'native-rtc.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser?.close();await new Promise(resolve=>server?server.close(resolve):resolve());}
})().catch(error=>{fs.writeFileSync(path.join(__dirname,'native-rtc-error.json'),JSON.stringify({passed:false,error:error.stack,pageErrors:errors},null,2)+'\n');console.error(error);process.exitCode=1;});
