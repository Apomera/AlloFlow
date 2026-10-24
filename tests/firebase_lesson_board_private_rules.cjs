const fs=require('fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('../desktop/web-app/node_modules/@firebase/rules-unit-testing');
const {doc,setDoc,updateDoc,getDoc,getDocs,collection,deleteDoc}=require('../desktop/web-app/node_modules/firebase/firestore');
// Lesson Board private answers: learners write only their own answer document, only they and the host read
// it, accepted values live in a host-only document, and the shared slot refuses answers once private answers are on.
(async()=>{
 const address=String(process.env.FIRESTORE_EMULATOR_HOST||'').split(':');if(address.length!==2)throw Error('Use the Firestore emulator.');
 const env=await initializeTestEnvironment({projectId:'demo-alloflow-board-private',firestore:{host:address[0],port:Number(address[1]),rules:fs.readFileSync('firestore.rules','utf8')}});let checks=0;
 const pass=async promise=>{await assertSucceeds(promise);checks++;},deny=async promise=>{await assertFails(promise);checks++;};
 try{
  const base='artifacts/board-test/public/data/sessions/PRIV',as=uid=>env.authenticatedContext(uid).firestore();
  const session=uid=>doc(as(uid),base),answer=(uid,owner)=>doc(as(uid),base+'/boardAnswers/'+owner),hostDoc=uid=>doc(as(uid),base+'/boardHost/attempt');
  const state={mode:'lesson-board',isActive:true,isPaused:false,attemptId:'attempt',teams:{u:'All',v:'All'},teamProgress:{All:{boardActions:{},boardRuns:{attempt:{turn:0,steps:{t0:{phase:'answer',targetId:'heater'}}}}}}};
  const action={attemptId:'attempt',turn:0,requestId:'a1',kind:'answer',targetId:'heater',value:'1'};
  await pass(setDoc(session('host'),{hostId:'host',roster:{u:{},v:{},w:{}},escapeRoomState:state}));
  await deny(setDoc(answer('u','u'),action));
  await pass(setDoc(hostDoc('host'),{attemptId:'attempt',ready:true},{merge:true}));
  await pass(getDocs(collection(as('host'),base+'/boardAnswers')));
  await pass(updateDoc(session('host'),{'escapeRoomState.privateAnswers':true}));
  await pass(setDoc(answer('u','u'),action));
  await pass(setDoc(answer('u','u'),{...action,requestId:'a2',value:'0'}));
  await deny(setDoc(answer('v','u'),{...action,requestId:'forged'}));
  await pass(getDoc(answer('u','u')));await deny(getDoc(answer('v','u')));await pass(getDoc(answer('host','u')));
  await deny(getDocs(collection(as('v'),base+'/boardAnswers')));
  for(const extra of [{turn:1},{turn:0.5},{attemptId:'old'},{requestId:'__proto__'},{requestId:'x'.repeat(129)},{targetId:'cloud'},{kind:'vote',value:''},{value:'1a'},{value:123},{extra:true}])await deny(setDoc(answer('u','u'),{...action,...extra}));
  await deny(setDoc(answer('w','w'),{...action,requestId:'w1'}));
  await deny(updateDoc(session('u'),{'escapeRoomState.teamProgress.All.boardActions.u':{...action,requestId:'shared'}}));
  await pass(getDoc(hostDoc('host')));await pass(setDoc(hostDoc('host'),{answers:{t0r0:{u:{value:'1',correct:true}}}},{merge:true}));
  await deny(getDoc(hostDoc('u')));await deny(setDoc(hostDoc('u'),{answers:{}},{merge:true}));
  await pass(updateDoc(session('host'),{'escapeRoomState.teamProgress.All.boardRuns.attempt.steps.t0.retryRound':1}));
  await deny(setDoc(answer('u','u'),{...action,requestId:'a3'}));await pass(setDoc(answer('u','u'),{...action,requestId:'r1_retry'}));
  await pass(updateDoc(session('host'),{'escapeRoomState.isPaused':true}));await deny(setDoc(answer('u','u'),{...action,requestId:'r1_paused'}));
  await pass(updateDoc(session('host'),{'escapeRoomState.isPaused':false,'escapeRoomState.teamProgress.All.boardRuns.attempt.steps.t0.phase':'choose','escapeRoomState.teamProgress.All.boardRuns.attempt.steps.t0.targetId':''}));
  await pass(updateDoc(session('u'),{'escapeRoomState.teamProgress.All.boardActions.u':{attemptId:'attempt',turn:0,requestId:'r1_vote',kind:'vote',targetId:'heater',value:''}}));
  await deny(setDoc(answer('u','u'),{...action,requestId:'r1_late'}));
  await deny(updateDoc(answer('host','u'),{value:'2'}));
  await deny(deleteDoc(answer('u','u')));await deny(deleteDoc(hostDoc('u')));await pass(deleteDoc(answer('host','u')));await pass(deleteDoc(hostDoc('host')));
  console.log('Lesson board private-answer permissions: '+checks+' checks passed.');
 }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
