const fs=require('fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('../desktop/web-app/node_modules/@firebase/rules-unit-testing');
const {doc,setDoc,updateDoc}=require('../desktop/web-app/node_modules/firebase/firestore');
(async()=>{
 const address=String(process.env.FIRESTORE_EMULATOR_HOST||'').split(':');if(address.length!==2)throw Error('Use the Firestore emulator.');
 const env=await initializeTestEnvironment({projectId:'demo-alloflow-board',firestore:{host:address[0],port:Number(address[1]),rules:fs.readFileSync('firestore.rules','utf8')}});let checks=0;
 const pass=async promise=>{await assertSucceeds(promise);checks++;},deny=async promise=>{await assertFails(promise);checks++;};
 try{
 const path='artifacts/board-test/public/data/sessions/BOARD',host=doc(env.authenticatedContext('host').firestore(),path),u=doc(env.authenticatedContext('u').firestore(),path),v=doc(env.authenticatedContext('v').firestore(),path),outsider=doc(env.authenticatedContext('outsider').firestore(),path);
 const state={mode:'lesson-board',isActive:true,isPaused:false,attemptId:'attempt',teams:{},teamProgress:{All:{boardActions:{},boardRuns:{attempt:{turn:0,steps:{t0:{phase:'choose',targetId:''}}}}}}};
 const action={attemptId:'attempt',turn:0,requestId:'a1',kind:'vote',targetId:'heater',value:''},key='escapeRoomState.teamProgress.All.boardActions.u';
 await pass(setDoc(host,{hostId:'host',roster:{u:{},v:{}},escapeRoomState:state}));await deny(updateDoc(u,{[key]:action}));await pass(updateDoc(u,{'escapeRoomState.teams.u':'All'}));await pass(updateDoc(v,{'escapeRoomState.teams.v':'All'}));await pass(updateDoc(u,{[key]:action}));
 for(const extra of [{turn:1},{turn:0.5},{attemptId:'old'},{requestId:'__proto__'},{targetId:'constructor'},{targetId:'a.b'},{kind:'build'},{value:123},{extra:true},{requestId:'x'.repeat(129)}])await deny(updateDoc(u,{[key]:{...action,...extra}}));
 await deny(updateDoc(v,{[key]:{...action,requestId:'forged'}}));await deny(updateDoc(outsider,{'escapeRoomState.teams.outsider':'All'}));
 for(const [key,value] of Object.entries({'escapeRoomState.teamProgress.All.boardRuns.attempt.steps.t0.result':{success:true},'escapeRoomState.teamProgress.All.boardRuns.attempt.turn':8,'escapeRoomState.teamProgress.All':{},'escapeRoomState.teamProgress':{},'escapeRoomState.board':{},'escapeRoomState.isPaused':true,'escapeRoomState.teams.v':'Red'}))await deny(updateDoc(u,{[key]:value}));
 await pass(updateDoc(host,{'escapeRoomState.teamProgress.All.boardRuns.attempt.steps.t0.phase':'answer','escapeRoomState.teamProgress.All.boardRuns.attempt.steps.t0.targetId':'heater'}));
 await deny(updateDoc(u,{[key]:{...action,requestId:'late-vote'}}));await pass(updateDoc(u,{[key]:{...action,kind:'answer',value:'1',requestId:'response'}}));await deny(updateDoc(u,{[key]:{...action,kind:'answer',targetId:'cloud',value:'1',requestId:'wrong-location'}}));
 await pass(updateDoc(host,{'escapeRoomState.isPaused':true}));await deny(updateDoc(u,{[key]:{...action,kind:'answer',value:'1',requestId:'paused'}}));
 await pass(updateDoc(host,{'escapeRoomState.isPaused':false,'escapeRoomState.teamProgress.All.boardRuns.attempt.steps.t0.phase':'review'}));await deny(updateDoc(u,{[key]:{...action,kind:'answer',value:'1',requestId:'late'}}));
 await pass(updateDoc(host,{'escapeRoomState.isActive':false}));await deny(updateDoc(u,{[key]:{...action,requestId:'after-end'}}));
 console.log('Lesson board Firestore permissions: '+checks+' checks passed.');
 }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
