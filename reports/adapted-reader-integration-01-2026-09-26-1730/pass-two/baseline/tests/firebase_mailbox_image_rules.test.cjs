'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('../desktop/web-app/node_modules/@firebase/rules-unit-testing');
const {doc,setDoc,updateDoc,getDoc}=require('../desktop/web-app/node_modules/firebase/firestore');
const [host,port]=String(process.env.FIRESTORE_EMULATOR_HOST||'').split(':');
if(!host||!port)throw Error('Run through the local Firestore emulator.');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-alloflow-images',firestore:{host,port:Number(port),rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
 try{
  const teacher=env.authenticatedContext('teacher').firestore(),learner=env.authenticatedContext('learner').firestore(),peer=env.authenticatedContext('peer').firestore();
  const route='artifacts/image-tests/public/data/sessions/ABC23';
  await assertSucceeds(setDoc(doc(teacher,route),{hostId:'teacher',roster:{learner:{uid:'learner'},peer:{uid:'peer'}}}));
  const ref=doc(learner,route),receipt={version:1,resourceId:'picture',status:'ready',loaded:2,total:2,omitted:0,assignmentAt:100,at:200};
  await assertSucceeds(updateDoc(ref,{'roster.learner.imageDelivery':receipt}));
  const activity={version:1,activityId:'quiz',kind:'quiz',status:'complete',completed:1,total:1,at:300};
  await assertSucceeds(updateDoc(ref,{'roster.learner.activityProgress':activity}));
  assert.deepEqual((await getDoc(ref)).data().roster.learner.imageDelivery,receipt);
  await assertSucceeds(updateDoc(ref,{'roster.learner.imageDelivery':{...receipt,status:'failed',loaded:1,omitted:1,at:400}}));
  assert.deepEqual((await getDoc(ref)).data().roster.learner.activityProgress,activity);
  await assertFails(updateDoc(doc(peer,route),{'roster.learner.imageDelivery':receipt}));
  await assertFails(updateDoc(doc(env.unauthenticatedContext().firestore(),route),{'roster.learner.imageDelivery':receipt}));
  for(const change of [{url:'https://private.test'},{total:100001},{loaded:3},{omitted:1},{at:0},{assignmentAt:-1},{resourceId:'bad.id'},{version:2},{status:'complete'}])await assertFails(updateDoc(ref,{'roster.learner.imageDelivery':{...receipt,...change}}));
  console.log('Image-delivery security checks passed: scoped writes, independent activity receipts, and malformed receipt rejection.');
 }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1;});
