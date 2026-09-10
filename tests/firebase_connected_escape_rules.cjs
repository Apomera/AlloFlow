const fs=require('fs'),path=require('path');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('../desktop/web-app/node_modules/@firebase/rules-unit-testing');
const {doc,setDoc,updateDoc}=require('../desktop/web-app/node_modules/firebase/firestore');
(async()=>{
 const address=String(process.env.FIRESTORE_EMULATOR_HOST||'').split(':');if(address.length!==2)throw Error('Use the Firestore emulator.');
 const env=await initializeTestEnvironment({projectId:'demo-alloflow',firestore:{host:address[0],port:Number(address[1]),rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
 let checks=0;const pass=async p=>{await assertSucceeds(p);checks++;},deny=async p=>{await assertFails(p);checks++;};
 try{
  const p='artifacts/connected-test/public/data/sessions/ROOM1',host=doc(env.authenticatedContext('host').firestore(),p),u=doc(env.authenticatedContext('u').firestore(),p),v=doc(env.authenticatedContext('v').firestore(),p),outsider=doc(env.authenticatedContext('outsider').firestore(),p);
  const state={mode:'connected-room',isActive:true,isPaused:false,attemptId:'escape_current',teams:{},teamProgress:{All:{connectedActions:{},connected:{escape_current:{solved:{},hints:{},receipts:{}}}}}};
  await pass(setDoc(host,{hostId:'host',roster:{u:{uid:'u'},v:{uid:'v'}},escapeRoomState:state}));
  const a={attemptId:'escape_current',requestId:'action_1',nodeId:'lens',kind:'interact',value:''},key='escapeRoomState.teamProgress.All.connectedActions.u';
  await deny(updateDoc(u,{[key]:a}));await pass(updateDoc(u,{'escapeRoomState.teams.u':'All'}));await pass(updateDoc(v,{'escapeRoomState.teams.v':'All'}));await pass(updateDoc(u,{[key]:a}));
  for(const extra of [{attemptId:'old'},{requestId:'__proto__'},{nodeId:'constructor'},{kind:'solve'},{value:'answer'},{value:null},{extra:'text'},{nodeId:'a.b'},{requestId:'x'.repeat(161)}])await deny(updateDoc(u,{[key]:{...a,...extra}}));
  await deny(updateDoc(outsider,{'escapeRoomState.teams.outsider':'All'}));await deny(updateDoc(v,{[key]:{...a,requestId:'action_other'}}));
  for(const [key,value] of Object.entries({'escapeRoomState.teams.v':'Red','escapeRoomState.teamProgress.All.connected.escape_current.solved.lens':true,'escapeRoomState.teamProgress.All.connected.escape_current.receipts.action_fake':{accepted:true},'escapeRoomState.teamProgress':{},'escapeRoomState.isPaused':true,'escapeRoomState.attemptId':'changed','escapeRoomState.connectedRoom':{}}))await deny(updateDoc(u,{[key]:value}));
  await pass(updateDoc(host,{'escapeRoomState.teamProgress.All.connected.escape_current.solved.lens':true}));
  await pass(updateDoc(host,{'escapeRoomState.isPaused':true}));await deny(updateDoc(u,{[key]:{...a,requestId:'action_paused'}}));
  await pass(updateDoc(host,{'escapeRoomState.isPaused':false,'escapeRoomState.attemptId':'escape_restart'}));await deny(updateDoc(u,{[key]:{...a,requestId:'action_late'}}));await pass(updateDoc(u,{[key]:{...a,attemptId:'escape_restart',requestId:'action_new'}}));
  await pass(updateDoc(host,{'escapeRoomState.isActive':false}));await deny(updateDoc(u,{[key]:{...a,attemptId:'escape_restart',requestId:'action_ended'}}));
  console.log('Connected escape Firebase permissions: '+checks+' checks passed.');
 }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
