const fs=require('fs'),path=require('path'),{chromium}=require('playwright'),{expect}=require('@playwright/test');
(async()=>{
 const wr=require('module').createRequire(path.resolve('desktop/web-app/package.json'));
 const css=await wr('postcss')([wr('tailwindcss')({...require(path.resolve('desktop/web-app/tailwind.config.js')),content:['./teacher_source.jsx','./ui_modals_source.jsx']})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined});
 const en=JSON.parse(fs.readFileSync('ui_strings.js','utf8'));
 const browser=await chromium.launch({headless:true}),pages=[],docs=new Map(),errors=[];
 const emit=async(p,data,removed=false)=>Promise.all(pages.map(page=>page.evaluate(({p,data,removed})=>window.fixtureEmit?.(p,data,removed),{p,data,removed})));
 const presets={feedback:{type:'freetext',prompt:'Explain how plants use sunlight',feedbackEnabled:true,feedbackCriteria:'Use accurate vocabulary and one concrete example.',afterSubmitMode:'wait'}};
 const roster=Object.fromEntries(['u','v','w'].map((uid,i)=>[uid,{uid,name:['Rowan','Sky','River'][i]}]));

 const questions=[{type:'mcq',question:'What gives plants energy?',options:['Sunlight','Stone'],correctAnswer:'Sunlight',explanation:'Plants use light energy to make sugars.'},{type:'mcq',itemType:'opinion-mcq',question:'Which example would you discuss?',options:['Garden','Forest']},{type:'mcq',question:'What do roots absorb?',options:['Water','Smoke'],correctAnswer:'Water',explanation:'Roots take in water and dissolved minerals from the soil.'}];
 let session={quizState:{isActive:true,activityId:'quiz:LIVE',roundId:'first',mode:'boss-battle',phase:'idle',currentQuestionIndex:0,responses:{},responseReceipts:{},teams:{},bossStats:{battleId:'original',name:'The Knowledge Keeper',difficulty:'normal',maxHP:1000,currentHP:1000,classMaxHP:100,classHP:100,battleLog:[],masteryStreak:0}},roster,groups:{}};
 let failNextPatch=false;
 const sync=()=>Promise.all(pages.map((page,i)=>{const uid=['teacher','u','v','w'][i];const view=JSON.parse(JSON.stringify(session));if(uid!=='teacher')view.quizState.responses=Object.hasOwn(view.quizState.responses,uid)?{[uid]:view.quizState.responses[uid]}:{};return page.evaluate(data=>window.setBattleFixture?.(data),view);}));
 const update=async(ref,patch)=>{if(ref.path!=='artifacts/app/public/data/sessions/LIVE')throw Error('Wrong quiz session path');if(failNextPatch){failNextPatch=false;throw Error('Simulated unavailable connection');}for(const[k,v]of Object.entries(patch)){const bits=k.split('.');let target=session;for(const bit of bits.slice(0,-1))target=target[bit]||(target[bit]={});target[bits.at(-1)]=v;}await sync();};
 const answer=async(uid,payload)=>{const q=session.quizState;if(q.phase!=='answering'||payload.pollId!=='boss:'+q.currentQuestionIndex+':'+q.roundId)return;q.responses[uid]=payload.response;await sync();};
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

   await page.addStyleTag({content:css.css});
   await page.exposeFunction('fixtureSessionWrite',update);
   await page.exposeFunction('fixtureAnswer',answer);
   await page.evaluate(en=>{window.fixtureT=(key,params={})=>{let value=key.split('.').reduce((o,k)=>o?.[k],en);if(typeof value!=='string')return params.defaultValue||key;for(const[k,v]of Object.entries(params))value=value.replaceAll('{'+k+'}',v);return value;};window.AlloLanguageContext=React.createContext({t:window.fixtureT});window.UiLanguageSelector=()=>null;window.__alloHooks={useFocusTrap(){}};window.__alloShared={db:{},warnLog(){}};window.__alloFirebase.updateDoc=window.fixtureSessionWrite;window._fbDoc=window.__alloFirebase.doc;window._fbUpdateDoc=window.fixtureSessionWrite;},en);
   for(const file of ['teacher_module.js','ui_modals_module.js','quiz_live_aggregators.js'])await page.addScriptTag({path:file});
   await page.evaluate(async({uid,session,questions,roster})=>{
    const LP=AlloModules.LivePolling;
    if(uid==='teacher'){window.fixtureHost=LP.createHost({sessionCode:'LIVE',onResponse:(uid,_name,payload)=>fixtureAnswer(uid,payload)});fixtureHost.setAllowedUids(Object.keys(roster));await fixtureHost.start();}
    else{window.fixtureGuest=LP.createGuest({sessionCode:'LIVE',userUid:uid,codename:roster[uid].name});window.__alloQuizChannelSend=(pollId,response)=>window.forceReceipt?false:fixtureGuest.sendResponse(pollId,response);fixtureGuest.join();}
    function Root(){const[data,setData]=React.useState(session);window.setBattleFixture=setData;window.fixtureState=data;const quiz=data.quizState;React.useEffect(()=>{if(uid==='teacher'&&quiz.phase==='answering')fixtureHost.broadcastPoll({id:'boss:'+quiz.currentQuestionIndex+':'+quiz.roundId,type:'mcq',options:questions[quiz.currentQuestionIndex].options});},[quiz.phase,quiz.roundId,quiz.currentQuestionIndex]);return React.createElement(AlloModules[uid==='teacher'?'TeacherLiveQuizControls':'StudentQuizOverlay'],{sessionData:data,generatedContent:{type:'quiz',data:{questions}},user:{uid},activeSessionCode:'LIVE',appId:'app',targetAppId:'app'});}
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Root));
   },{uid,session,questions,roster});
  }
  const[teacher,student,second,third]=pages;const out='docs/monster-battle-review';fs.mkdirSync(out,{recursive:true});
  await teacher.waitForFunction(()=>fixtureHost.peers.size===3&&[...fixtureHost.peers.values()].every(peer=>peer.dc?.readyState==='open'),undefined,{timeout:60000});
  await teacher.locator('[data-help-key="quiz_start_question_btn"]').click();
  await student.bringToFront();
  const overlap=await student.evaluate(()=>{const a=document.querySelector('#student-quiz-title').getBoundingClientRect(),b=document.querySelector('[aria-label="Leave live quiz view"]').getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;});if(overlap)throw Error('Mobile header overlaps minimize');
  await expect(student.locator('body')).not.toContainText('concept_quest.boss_phase_');
  await student.screenshot({path:out+'/mobile-answering.png',fullPage:true});
  await third.evaluate(()=>window.forceReceipt=true);
  for(const page of [student,second,third])await page.locator('[data-help-key="quiz_student_answer_option"]').first().click();
  await teacher.waitForFunction(()=>Object.keys(fixtureState.quizState.responses).length===2&&Object.keys(fixtureState.quizState.responseReceipts).length===1);
  await teacher.locator('[data-help-key="quiz_reveal_btn"]').click();
  if(session.quizState.bossStats.currentHP!==400||session.quizState.bossStats.classHP!==100)throw Error('Receipt-only answer changed battle fairness');
  await expect(third.getByText('Your teacher received participation only. This answer was not scored.')).toBeVisible();
  failNextPatch=true;await teacher.getByRole('button',{name:/Expose weakness/i}).click();await expect(teacher.getByRole('alert')).toContainText('could not be updated');
  await teacher.getByRole('button',{name:/Expose weakness/i}).click();if(session.quizState.bossStats.currentHP!==350)throw Error('Pacing retry failed');
  await teacher.screenshot({path:out+'/teacher-round-review.png',fullPage:true});
  await teacher.locator('[data-help-key="quiz_next_question_btn"]').click();await teacher.locator('[data-help-key="quiz_start_question_btn"]').click();await third.evaluate(()=>window.forceReceipt=false);
  for(const page of [student,second,third])await page.locator('[data-help-key="quiz_student_answer_option"]').first().click();
  await teacher.waitForFunction(()=>Object.keys(fixtureState.quizState.responses).length===3);await teacher.locator('[data-help-key="quiz_reveal_btn"]').click();
  if(session.quizState.bossStats.currentHP!==350||session.quizState.bossStats.classHP!==100||session.quizState.bossStats.lastDamage!==0)throw Error('Unscored poll changed health or left stale damage');
  await teacher.locator('[data-help-key="quiz_next_question_btn"]').click();await teacher.locator('[data-help-key="quiz_start_question_btn"]').click();
  await student.locator('[data-help-key="quiz_student_answer_option"]').first().click();for(const page of [second,third])await page.locator('[data-help-key="quiz_student_answer_option"]').nth(1).click();
  await teacher.waitForFunction(()=>Object.keys(fixtureState.quizState.responses).length===3);await teacher.locator('[data-help-key="quiz_reveal_btn"]').click();
  await expect(student.getByRole('region',{name:'Battle result'})).toContainText('Class victory!');
  await expect(student.getByRole('region',{name:'Answer review'})).toContainText('Roots take in water');
  await student.getByRole('region',{name:'Battle result'}).scrollIntoViewIfNeeded();await student.screenshot({path:out+'/mobile-battle-result.png',fullPage:true});
  await student.getByRole('region',{name:'Answer review'}).scrollIntoViewIfNeeded();await student.screenshot({path:out+'/mobile-answer-review.png',fullPage:true});
  await teacher.screenshot({path:out+'/teacher-battle-result.png',fullPage:true});
  for(const page of pages){if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal document overflow');const dialog=page.getByRole('dialog');if(await dialog.count()&&await dialog.evaluate(el=>el.scrollWidth>el.clientWidth))throw Error('Horizontal dialog overflow');}
  await teacher.getByRole('button',{name:'Restart battle',exact:true}).click();if(session.quizState.phase!=='idle'||session.quizState.currentQuestionIndex!==0||session.quizState.bossStats.battleLog.length||session.quizState.bossStats.currentHP!==session.quizState.bossStats.maxHP)throw Error('Restart did not reset battle');
  await expect(student.getByRole('region',{name:'Battle result'})).toHaveCount(0);
  const result={realWebRtc:true,students:3,peerAnswersReceived:8,receiptOnlyExcluded:true,pacingFailureRetried:true,unscoredPollNeutral:true,finalHealthComparison:true,answerReviewReachable:true,restartReset:true,mobileHeaderOverlap:false,horizontalOverflow:false,errors};fs.writeFileSync(out+'/browser-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(errors.length)throw Error('Browser errors');
 }catch(error){for(let i=0;i<pages.length;i++)try{console.error('PAGE '+i+' '+(await pages[i].locator('body').innerText()).slice(-5500));}catch{}throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
