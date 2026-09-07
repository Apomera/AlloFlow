const fs=require('fs'),path=require('path'),{chromium}=require('playwright'),engine=require('../concept_quest_engine.js');
const wr=require('module').createRequire(path.resolve('desktop/web-app/package.json'));
(async()=>{
 const css=await wr('postcss')([wr('tailwindcss')({...require(path.resolve('desktop/web-app/tailwind.config.js')),content:['./teacher_source.jsx','./concept_quest_teacher_source.jsx']})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined});
 const browser=await chromium.launch({headless:true}),pages=[],errors=[];
 const questions=[{question:'What do roots absorb?',options:['Water','Smoke'],correctIndex:0,concept:'Roots',explanation:'Roots absorb water from the soil.'},{question:'What gives plants energy?',options:['Sunlight','Stone'],correctIndex:0,concept:'Light energy',explanation:'Plants use energy from sunlight.'},{question:'Which observation is evidence of growth?',options:['A measured increase in height','A guess'],correctIndex:0,concept:'Evidence',explanation:'Measurements can support a claim.'}];
 let state={escapeRoomState:{isActive:true,isPaused:false,mode:'concept-quest',conceptQuest:engine.createSession({title:'The Botanical Expedition',questions}),teams:{u:'All',v:'All'},teamProgress:{All:{questActions:{},questVotes:{},questVoteTurns:{},questRoles:{u:'analyst',v:'explainer'}}}},roster:{u:{name:'Rowan'},v:{name:'Sky'}},groups:{}};
 let failAction=false;
 const update=async(ref,patch)=>{
  if(ref!=='artifacts/app/public/data/sessions/QUEST')throw Error('Wrong session path');
  if(failAction&&Object.keys(patch).some(k=>k.includes('.questActions.'))){failAction=false;throw Error('Simulated offline send');}
  for(const[k,v]of Object.entries(patch)){const bits=k.split('.');let o=state;for(const part of bits.slice(0,-1))o=o[part]||(o[part]={});o[bits.at(-1)]=v;}
  await Promise.all(pages.map(page=>page.evaluate(value=>window.setQuestFixture?.(value),state)));
 };
 const apply=patch=>update('artifacts/app/public/data/sessions/QUEST',patch);
 try{
  for(const role of ['teacher','u','v']){
   const page=await browser.newPage({viewport:{width:role==='u'?390:1280,height:role==='u'?844:960}});pages.push(page);page.on('pageerror',e=>errors.push(role+': '+e.message));
   await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eef2ff;padding:16px"><div id="root"></div></body></html>');await page.addStyleTag({content:css.css});
   await page.addScriptTag({path:'desktop/web-app/node_modules/react/umd/react.development.js'});await page.addScriptTag({path:'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'});await page.exposeFunction('questFixtureWrite',update);
   await page.evaluate(strings=>{window.fixtureT=(key,params={})=>{let value=key.split('.').reduce((o,k)=>o?.[k],strings);if(typeof value!=='string')return params.defaultValue||key;for(const[k,v]of Object.entries(params))value=value.split('{'+k+'}').join(v);return value;};window.AlloModules={};window.AlloLanguageContext=React.createContext({t:window.fixtureT});window.__alloShared={db:{}};window.__alloFirebase={doc:(_db,...bits)=>bits.join('/'),updateDoc:window.questFixtureWrite};},JSON.parse(fs.readFileSync('ui_strings.js','utf8')));
   for(const file of ['concept_quest_engine.js','teacher_module.js','concept_quest_teacher_module.js'])await page.addScriptTag({path:file});
   await page.evaluate(({role,state})=>{function App(){const[data,setData]=React.useState(state);window.setQuestFixture=setData;return React.createElement(window.AlloModules[role==='teacher'?'ConceptQuestTeacherControls':'StudentEscapeRoomOverlay'],{sessionData:data,user:{uid:role},activeSessionCode:'QUEST',appId:'app',targetAppId:'app',t:window.fixtureT});}ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));},{role,state});
  }
  const[teacher,student,peer]=pages;fs.mkdirSync('docs/concept-quest-review',{recursive:true});
  await student.locator('button[aria-label*="battle"]:not([disabled])').first().click();
  const progress=state.escapeRoomState.teamProgress.All;if(progress.questVoteTurns.u!==engine.getTurnKey(state.escapeRoomState.conceptQuest))throw Error('Vote lacks current turn identity');
  const mapTextColor=await student.locator('button[aria-current="location"]').evaluate(el=>getComputedStyle(el).color);if(mapTextColor==='rgb(255, 255, 255)')throw Error('Current map room lacks dark text contrast');
  await student.screenshot({path:'docs/concept-quest-review/mobile-map.png',fullPage:true});
  if(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile map overflows');
  await teacher.getByRole('button',{name:/Light energy.*1 vote/i}).click();
  await student.getByRole('radio',{name:'Sunlight',exact:true}).check();await teacher.getByRole('button',{name:'Pause',exact:true}).click();await student.getByText(/Quest paused/).waitFor();
  if(!await student.getByRole('radio',{name:'Sunlight',exact:true}).isDisabled())throw Error('Paused choice remained interactive');await teacher.getByRole('button',{name:'Resume',exact:true}).click();if(!await student.getByRole('radio',{name:'Sunlight',exact:true}).isChecked())throw Error('Pause lost answer');
  await student.getByRole('button',{name:/^🛡️ Guard/}).click();await student.getByRole('combobox',{name:/Teammate/}).selectOption('v');
  await peer.getByRole('radio',{name:'Stone',exact:true}).check();await Promise.all([student.getByRole('button',{name:'Commit turn',exact:true}).click(),peer.getByRole('button',{name:'Commit turn',exact:true}).click()]);
  await teacher.getByRole('button',{name:'Resolve 2 actions',exact:true}).click();
  if(state.escapeRoomState.conceptQuest.lastRound.total!==2||state.escapeRoomState.conceptQuest.lastRound.assistedCount!==1)throw Error('Cooperative actions were not combined');
  await teacher.getByRole('combobox',{name:/^Type/}).selectOption('challenge');await teacher.getByRole('button',{name:'Manual draft',exact:true}).click();
  await teacher.getByRole('textbox',{name:/^Question/}).fill('Which observation can support a claim?');await teacher.getByLabel('Choice 1',{exact:true}).fill('Measured growth');await teacher.getByLabel('Choice 2',{exact:true}).fill('A guess');await teacher.getByLabel('Correct answer: choice 1',{exact:true}).check();await teacher.getByRole('textbox',{name:/^Explanation/}).fill('Measurements are evidence that classmates can check.');
  await teacher.screenshot({path:'docs/concept-quest-review/teacher-gm-preview.png',fullPage:true});await teacher.getByRole('button',{name:'Publish to class',exact:true}).click();
  failAction=true;await student.getByRole('radio',{name:'Measured growth',exact:true}).check();await student.getByRole('button',{name:'Commit turn',exact:true}).click();await student.getByText(/Your choice could not be saved/).waitFor();if(!await student.getByRole('radio',{name:'Measured growth',exact:true}).isChecked())throw Error('Failed send lost answer');
  await student.getByRole('button',{name:'Commit turn',exact:true}).click();await teacher.getByRole('button',{name:'Resolve 1 action',exact:true}).click();
  const active=state.escapeRoomState.conceptQuest;if(engine.getRoom(active,active.currentRoomId).challenge.prompt!=='Which observation can support a claim?')throw Error('GM question reverted');
  await student.screenshot({path:'docs/concept-quest-review/mobile-battle.png',fullPage:true});
  if(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Battle overflows on a phone');
  let defeated=engine.resolveTravel({...active,phase:'explore'},{},'room-3').quest;defeated={...defeated,phase:'defeat',party:{...defeated.party,hp:0}};await apply({'escapeRoomState.conceptQuest':defeated,'escapeRoomState.teamProgress.All.questActions':{}});
  await teacher.getByRole('button',{name:'Rally +3 HP',exact:true}).click();if(state.escapeRoomState.conceptQuest.phase!=='battle')throw Error('Rally did not resume encounter');
  await teacher.getByRole('combobox',{name:/^Type/}).selectOption('item');await teacher.getByRole('combobox',{name:/^Item effect/}).selectOption('heal');await teacher.getByRole('button',{name:'Manual draft',exact:true}).click();const hp=state.escapeRoomState.conceptQuest.party.hp;
  await teacher.getByRole('button',{name:'Publish to class',exact:true}).click();if(state.escapeRoomState.conceptQuest.party.hp!==hp)throw Error('Item effect applied on publication');
  await teacher.getByText('Quest log and shared inventory',{exact:true}).click();await teacher.getByRole('button',{name:'Use',exact:true}).click();if(state.escapeRoomState.conceptQuest.party.hp!==hp+2||state.escapeRoomState.conceptQuest.inventory.length)throw Error('Item was not consumed once');
  await teacher.getByRole('button',{name:'End quest',exact:true}).click();await teacher.getByRole('alertdialog').getByRole('button',{name:'Keep playing',exact:true}).click();
  await teacher.getByRole('button',{name:'End quest',exact:true}).click();await teacher.getByRole('alertdialog').getByRole('button',{name:'End quest',exact:true}).click();await student.locator('[aria-labelledby="concept-quest-title"]').waitFor({state:'detached'});
  console.log(JSON.stringify({votes:true,cooperativeActions:2,peerAssist:true,pauseDraft:true,editableChallenge:true,failedSendRetry:true,gmChallengePersists:true,recovery:true,itemConsumedOnce:true,endDialog:true,mobileOverflow:false,errors}));if(errors.length)throw Error('Browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
