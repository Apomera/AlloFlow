const fs=require('fs'),{chromium}=require('playwright'),{expect}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({headless:true}),pages=[],docs=new Map(),errors=[];
 const emit=async(p,data,removed=false)=>Promise.all(pages.map(page=>page.evaluate(({p,data,removed})=>window.fixtureEmit?.(p,data,removed),{p,data,removed})));
 const presets={feedback:{type:'freetext',prompt:'Explain how plants use sunlight',feedbackEnabled:true,feedbackCriteria:'Use accurate vocabulary and one concrete example.',afterSubmitMode:'wait'}};
 const roster=Object.fromEntries(['u','v','w'].map((uid,i)=>[uid,{uid,name:['Rowan','Sky','River'][i]}]));
 try{
  for(const uid of ['teacher','u','v','w']){
   const page=await browser.newPage({viewport:{width:uid==='u'?390:1280,height:uid==='u'?844:960}});pages.push(page);page.on('pageerror',e=>errors.push(uid+': '+e.message));
   await page.route('http://live-session.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f1f5f9;font-family:Arial,sans-serif}*{box-sizing:border-box}button,input,textarea,select{font:inherit}</style></head><body><div id="root"></div></body></html>'}));await page.goto('http://live-session.test/');
   await page.exposeFunction('fixtureRead',async ref=>[...docs].filter(([p])=>ref.kind==='collection'?p.startsWith(ref.path+'/')&&p.split('/').length===ref.path.split('/').length+1:p===ref.path));
   await page.exposeFunction('fixtureWrite',async(ref,value,merge)=>{const next=merge?{...(docs.get(ref.path)||{}),...value}:value;docs.set(ref.path,next);await emit(ref.path,next);});
   await page.exposeFunction('fixtureDelete',async ref=>{docs.delete(ref.path);await emit(ref.path,null,true);});
   await page.addScriptTag({path:'desktop/web-app/node_modules/react/umd/react.development.js'});await page.addScriptTag({path:'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'});
   await page.evaluate(()=>{const listeners=[];window.appId='fixture';window.__alloRtcConfig={iceServers:[]};window.AlloModules={};window.__alloWriteToSession=async()=>true;window.fixtureEmit=(p,data,removed)=>listeners.slice().forEach(l=>{if(l.ref.kind==='collection'&&p.startsWith(l.ref.path+'/')&&p.split('/').length===l.ref.path.split('/').length+1)l.cb({docChanges:()=>[{type:removed?'removed':'added',doc:{id:p.split('/').at(-1),ref:{path:p,kind:'doc'},data:()=>data}}]});else if(l.ref.kind==='doc'&&l.ref.path===p)l.cb({data:()=>data,exists:()=>!!data});});window.__alloFirebase={db:{},doc:(_db,...bits)=>({kind:'doc',path:bits.join('/')}),collection:(_db,...bits)=>({kind:'collection',path:bits.join('/')}),setDoc:(ref,data,opts)=>fixtureWrite(ref,data,!!opts?.merge),deleteDoc:fixtureDelete,onSnapshot:(ref,cb)=>{const l={ref,cb};listeners.push(l);fixtureRead(ref).then(rows=>{if(!listeners.includes(l))return;if(ref.kind==='collection')cb({docChanges:()=>rows.map(([p,data])=>({type:'added',doc:{id:p.split('/').at(-1),ref:{kind:'doc',path:p},data:()=>data}}))});else cb({data:()=>rows[0]?.[1]||null,exists:()=>!!rows.length});});return()=>{const i=listeners.indexOf(l);if(i>=0)listeners.splice(i,1);};}};});
   await page.addScriptTag({path:'live_polling_module.js'});
   await page.evaluate(({uid,preset,roster})=>{const LP=AlloModules.LivePolling;if(uid==='teacher'){const proto=Object.getPrototypeOf(LP.createHost({})),start=proto.start;proto.start=function(){window.fixtureHost=this;const receive=this.onResponse;window.fixtureResponses=[];this.onResponse=(...args)=>{fixtureResponses.push(args);return receive(...args);};return start.call(this);};}else{const proto=Object.getPrototypeOf(LP.createGuest({})),join=proto.join;proto.join=function(){window.fixtureJoinCount=(window.fixtureJoinCount||0)+1;window.fixtureGuest=this;const receive=this.onPollResults;this.onPollResults=packet=>{window.fixtureLastResults=packet;return receive(packet);};return join.call(this);};}window.fixturePreset=preset;function Root(){const[p,setP]=React.useState(preset);const[mountId,setMountId]=React.useState(0);window.fixtureRemount=()=>setMountId(n=>n+1);window.fixtureSetPreset=setP;return uid==='teacher'?React.createElement(LP.HostPanel,{sessionCode:'ACTIVITY',isOpen:true,onClose:()=>{},roster,sessionGroups:{},initialPoll:p}):React.createElement(LP.GuestOverlay,{key:mountId,sessionCode:'ACTIVITY',userUid:uid,codename:roster[uid].name,enabled:true,hostActive:true});}ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Root));},{uid,preset:presets.feedback,roster});
  }
  const[teacher,student,...others]=pages;
  const out='docs/live-response-confirmation';fs.mkdirSync(out,{recursive:true});
  await teacher.getByRole('button',{name:'Broadcast to 3 guests',exact:true}).click({timeout:120000});
  await teacher.evaluate(()=>{
    const send=fixtureHost._sendResponseReceipt.bind(fixtureHost);window.dropOneReceipt=true;
    fixtureHost._sendResponseReceipt=(uid,packet,type)=>{
      if(window.dropOneReceipt&&uid==='u'&&packet.status==='accepted'&&type!=='responseState'){window.dropOneReceipt=false;return false;}
      return send(uid,packet,type);
    };
  });
  await student.bringToFront();
  await student.getByRole('textbox',{name:'Your response',exact:true}).fill('Plants use sunlight to make sugars through photosynthesis.');
  await student.getByRole('button',{name:'Submit response',exact:true}).click();
  await expect(student.getByRole('region',{name:'Response delivery'})).toContainText('Receipt not confirmed',{timeout:30000});
  const pollId=await teacher.evaluate(()=>fixtureHost.activePoll.id);
  if(!(await student.evaluate(pollId=>AlloModules.LivePolling.readLivePollDraft('ACTIVITY','u',pollId)?.value,pollId)))throw Error('Unconfirmed draft was lost');
  await student.screenshot({path:out+'/mobile-unconfirmed.png',fullPage:true});
  await student.getByRole('button',{name:'Retry response',exact:true}).click();
  await expect(student.getByRole('dialog')).toContainText('Response received by teacher. Waiting for feedback.',{timeout:30000});
  if(await teacher.evaluate(()=>fixtureResponses.length)!==1)throw Error('A receipt retry counted the response twice');
  console.log('Dropped acknowledgement recovered over WebRTC without duplicate response.');

  await teacher.getByRole('textbox',{name:'Feedback for Rowan',exact:true}).fill('Good explanation. Add a concrete example of a plant storing sugar.');
  await teacher.getByRole('button',{name:'Review complete — send privately',exact:true}).click();
  await expect(student.getByRole('dialog')).toContainText('Add a concrete example',{timeout:30000});
  for(const page of others)await expect(page.locator('body')).not.toContainText('Good explanation. Add a concrete example');
  await teacher.screenshot({path:out+'/teacher-feedback.png',fullPage:true});
  await student.evaluate(()=>fixtureRemount());
  await student.waitForFunction(()=>window.fixtureJoinCount>=2&&fixtureGuest._connected,undefined,{timeout:30000});
  await expect(student.getByRole('dialog')).toContainText('Good explanation. Add a concrete example',{timeout:30000});
  await student.getByRole('button',{name:'Revise using this feedback',exact:true}).click();
  await expect(student.getByRole('textbox',{name:'Your response',exact:true})).toHaveValue('Plants use sunlight to make sugars through photosynthesis.');
  const revision='Plants use sunlight to make sugars through photosynthesis. A carrot stores some of these sugars in its root.';
  await student.getByRole('textbox',{name:'Your response',exact:true}).fill(revision);
  await student.context().setOffline(true);
  await expect(student.getByRole('dialog')).toContainText('You are offline.',{timeout:30000});
  await expect(student.getByRole('button',{name:'Download response for teacher',exact:true})).toBeEnabled();
  await student.screenshot({path:out+'/mobile-offline-draft.png',fullPage:true});
  await student.context().setOffline(false);
  await student.waitForFunction(()=>window.fixtureJoinCount>=3&&fixtureGuest._connected,{timeout:30000});
  await expect(student.getByRole('textbox',{name:'Your response',exact:true})).toHaveValue(revision,{timeout:30000});
  await student.getByRole('button',{name:'Submit revision',exact:true}).click();
  await expect(student.getByRole('dialog')).toContainText('Revision received by teacher. Waiting for feedback.',{timeout:30000});
  await expect(student.getByRole('dialog')).not.toContainText('Your teacher reviewed your response');
  if(await teacher.evaluate(()=>fixtureResponses.length)!==2)throw Error('Revision was not counted exactly once');
  await student.screenshot({path:out+'/mobile-confirmed.png',fullPage:true});
  console.log('Manual feedback, private reload recovery, offline draft, reconnect, and revision passed.');

  const checkIn=await teacher.evaluate(()=>fixtureHost.sendCheckIn('u',fixtureHost.activePoll.id));if(!checkIn)throw Error('Check-in send failed');
  await student.getByRole('button',{name:"I'm working",exact:true}).click();await teacher.waitForFunction(()=>!fixtureHost.pendingCheckIns.has('u'));
  await teacher.getByRole('button',{name:'End poll',exact:true}).click();const dialog=teacher.getByRole('alertdialog');await dialog.waitFor();await dialog.getByRole('button',{name:'End poll',exact:true}).click();
  await expect(student.getByRole('dialog')).toHaveCount(0,{timeout:30000});
  for(const page of pages)if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
  const result={realWebRtc:true,students:3,receiptRetryDeduplicated:true,privateFeedbackRestored:true,offlineDraftRetained:true,revisionConfirmed:true,manualTeacherFeedback:true,checkInAcknowledged:true,endPollCleared:true,mobileOverflow:false,errors};
  fs.writeFileSync(out+'/browser-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)throw Error('Browser errors');
 }catch(e){for(let i=0;i<pages.length;i++){try{console.error('PAGE '+i+' '+(await pages[i].locator('body').innerText()).slice(0,4200));}catch{}}throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
