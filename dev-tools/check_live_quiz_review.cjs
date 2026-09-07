const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const wr=require('module').createRequire(path.resolve('desktop/web-app/package.json'));
(async()=>{
 const css=await wr('postcss')([wr('tailwindcss')({...require(path.resolve('desktop/web-app/tailwind.config.js')),content:['./teacher_source.jsx','./ui_modals_source.jsx']})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined});
 const browser=await chromium.launch({headless:true});const errors=[];const pages=[];
 const puzzles=[{id:'p1',type:'sequence',linkedObjectId:'o1',question:'Order the stages of a plant.',items:['Seed','Plant'],correctOrder:[0,1],shuffledItems:[1,0],hint:'Start with the seed.'},{id:'p2',type:'matching',linkedObjectId:'o2',question:'Match each source to its resource.',pairs:[{left:'Sun',right:'Light'},{left:'Cloud',right:'Water'}],hint:'Clouds bring rain.'},{id:'p3',type:'fillin',linkedObjectId:'o3',question:'Complete the sentence.',sentence:'Plants need _____ to grow.',answer:'water',hint:'Rain provides it.'}];
 let state={escapeRoomState:{isActive:true,startedAt:100,endsAt:Date.now()+300000,timeRemaining:300,room:{theme:'The Botanical Archive',description:'Work together to unlock the archive. Each solved puzzle helps your team.'},puzzles,objects:[{id:'o1',name:'Seed Journal',emoji:'📖'},{id:'o2',name:'Weather Map',emoji:'🌦️'},{id:'o3',name:'Watering Can',emoji:'💧'}],teams:{u:'Red'},teamProgress:{Red:{progressVersion:2,maxLives:3,maxHints:3,solved:{},misses:{},revealedHints:{}}}},roster:{u:{uid:'u'}},groups:{}};
 const content={type:'quiz',data:{questions:[{type:'mcq',question:'What gives plants energy?',options:['Sunlight','Stone'],correctAnswer:'Sunlight'},{type:'mcq',question:'What do roots absorb?',options:['Water','Smoke'],correctAnswer:'Water'}]}};
 const update=async(ref,patch)=>{if(ref!=='artifacts/app/public/data/sessions/LIVE')throw Error('Incorrect session path '+ref);for(const[k,v]of Object.entries(patch)){const bits=k.split('.');let o=state;for(const part of bits.slice(0,-1))o=o[part]||(o[part]={});o[bits.at(-1)]=v;}await Promise.all(pages.map(p=>p.evaluate(s=>window.setFixtureState?.(s),state)));};
 try{
  for(const role of ['teacher','student']){
   const page=await browser.newPage({viewport:{width:role==='teacher'?1280:390,height:role==='teacher'?900:844}});pages.push(page);page.on('pageerror',e=>errors.push(role+': '+e.message));
   await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eef2ff;padding:16px"><main id="root"></main></body></html>');await page.addStyleTag({content:css.css});
   await page.addScriptTag({path:'desktop/web-app/node_modules/react/umd/react.development.js'});await page.addScriptTag({path:'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'});
   await page.exposeFunction('writeFixture',update);
   await page.evaluate(en=>{
    window.fixtureT=(key,params={})=>{let v=key.split('.').reduce((o,k)=>o?.[k],en);if(typeof v!=='string')return params.defaultValue||key;for(const[k,p]of Object.entries(params))v=v.replace('{'+k+'}',p);return v;};
    window.AlloModules={};window.AlloIcons={X:()=>React.createElement('span',{'aria-hidden':true},'×')};window.AlloLanguageContext=React.createContext({t:window.fixtureT});window.UiLanguageSelector=()=>null;window.__alloHooks={useFocusTrap(){}};window.__alloShared={db:{}};
    window.__alloFirebase={doc:(_db,...parts)=>parts.join('/'),updateDoc:window.writeFixture};window._fbDoc=window.__alloFirebase.doc;window._fbUpdateDoc=window.writeFixture;
   },JSON.parse(fs.readFileSync('ui_strings.js','utf8')));
   for(const file of ['teacher_module.js','ui_modals_module.js','quiz_live_aggregators.js'])await page.addScriptTag({path:file});
   await page.evaluate(({role,state,content})=>{function App(){const[data,setData]=React.useState(state);window.setFixtureState=setData;const quiz=!!data.quizState?.isActive;const Component=window.AlloModules[role==='teacher'?(quiz?'TeacherLiveQuizControls':'EscapeRoomTeacherControls'):(quiz?'StudentQuizOverlay':'StudentEscapeRoomOverlay')];return React.createElement(Component,{sessionData:data,generatedContent:content,user:{uid:'u'},activeSessionCode:'LIVE',appId:'app',targetAppId:'app',t:window.fixtureT});}ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));},{role,state,content});
  }
  const [teacher,student]=pages;
  await student.locator('[data-help-key="escape_room_object"]').first().click();if(!await student.getByRole('dialog').getByText('Plant',{exact:true}).count())throw Error('Sequence shows indices');if(await student.getByRole('dialog').getByText(puzzles[0].hint,{exact:true}).count())throw Error('Hint leak');
  await student.getByRole('button',{name:/Move up: Seed/}).click();await student.getByRole('button',{name:'Check Sequence',exact:true}).click();
  await student.locator('[data-help-key="escape_room_object"]').nth(1).click();
  await student.getByRole('button',{name:'Sun',exact:true}).click();await student.getByRole('button',{name:'Water',exact:true}).click();await student.getByRole('button',{name:'Cloud',exact:true}).click();await student.getByRole('button',{name:'Light',exact:true}).click();await student.getByRole('button',{name:'Submit Answer',exact:true}).click();
  if(Object.keys(state.escapeRoomState.teamProgress.Red.misses).length!==1)throw Error('Wrong matches accepted');
  for(let i=0;i<2;i++)await student.getByRole('button',{name:/Remove:/}).first().click();
  await student.getByRole('button',{name:'Sun',exact:true}).click();await student.getByRole('button',{name:'Light',exact:true}).click();await student.getByRole('button',{name:'Cloud',exact:true}).click();await student.getByRole('button',{name:'Water',exact:true}).click();await student.getByRole('button',{name:'Submit Answer',exact:true}).click();
  await student.locator('[data-help-key="escape_room_object"]').nth(2).click();await student.getByRole('textbox').fill('wat');
  await teacher.getByRole('button',{name:/Pause/}).click();await student.getByRole('alertdialog').waitFor();const frozen=state.escapeRoomState.timeRemaining;await student.waitForTimeout(1100);if(state.escapeRoomState.timeRemaining!==frozen)throw Error('Pause failed');
  await teacher.getByRole('button',{name:/Resume/}).click();await student.getByRole('dialog').waitFor();if(await student.getByRole('textbox').inputValue()!=='wat')throw Error('Draft lost');
  if(!await student.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)))throw Error('Resume focus left dialog');
  await student.screenshot({path:'docs/escape-room-review/live-mobile-puzzle.png',fullPage:true});
  const overflow=await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.querySelector('[role="dialog"]').scrollWidth>document.querySelector('[role="dialog"]').clientWidth);if(overflow)throw Error('Mobile overflow');
  await student.getByRole('textbox').fill('water');await student.getByRole('button',{name:'Submit Answer',exact:true}).click();await student.getByRole('heading',{name:/First to Escape/}).waitFor();
  await teacher.screenshot({path:'docs/escape-room-review/live-teacher-room.png',fullPage:true});
  state.quizState={isActive:true,activityId:'quiz:LIVE',roundId:'r1',mode:'live-pulse',phase:'answering',currentQuestionIndex:0,responses:{},teams:{},responseReceipts:{}};await update('artifacts/app/public/data/sessions/LIVE',{'escapeRoomState.isActive':false});
  await student.locator('[data-help-key="quiz_student_answer_option"]').first().click();await student.getByText(/Participation recorded/).waitFor();
  if(!await teacher.locator('[data-help-key="quiz_next_question_btn"]').isDisabled())throw Error('Navigation open while answering');
  await teacher.locator('[data-help-key="quiz_reveal_btn"]').click();await teacher.locator('[data-help-key="quiz_start_question_btn"]').click();await student.locator('[data-help-key="quiz_student_answer_option"]').first().waitFor();if(await student.locator('[data-help-key="quiz_student_answer_option"]').first().isDisabled())throw Error('Restart stayed locked');
  await teacher.screenshot({path:'docs/escape-room-review/live-quiz-teacher.png',fullPage:true});
  await update('artifacts/app/public/data/sessions/LIVE',{'quizState.mode':'boss-battle','quizState.bossStats':{name:'Keeper',image:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="purple"/></svg>',maxHP:100,currentHP:100,classHP:100,classMaxHP:100}});
  for(const page of pages)await page.locator('img').first().waitFor();
  console.log(JSON.stringify({bossImages:true,escape:{solved:3,wrongMatchRejected:true,teamSync:true,pauseResume:true,draftAndFocus:true},quiz:{receiptExplained:true,navigationProtected:true,restart:true},mobileOverflow:overflow,errors}));if(errors.length)throw Error('Browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
