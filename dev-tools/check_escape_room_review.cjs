const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const webRequire = require('module').createRequire(path.resolve('desktop/web-app/package.json'));
const postcss = webRequire('postcss');
const tailwind = webRequire('tailwindcss');
(async () => {
 const css = await postcss([tailwind({ ...require(path.resolve('desktop/web-app/tailwind.config.js')), content: ['./escape_room_module.js'] })]).process('@tailwind base; @tailwind components; @tailwind utilities;', { from: undefined });
 const browser = await chromium.launch({ headless: true });
 try {
 const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
 const errors=[];page.on('pageerror', e=>errors.push(e.message));
 await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#0f172a;padding:16px"><main id="root"></main></body></html>');
 await page.addStyleTag({ content: css.css });
 await page.addScriptTag({ path: 'desktop/web-app/node_modules/react/umd/react.development.js' });
 await page.addScriptTag({ path: 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js' });
 await page.evaluate(() => { window.AlloIcons={ X:()=>React.createElement('span',{'aria-hidden':true},'×') }; });
 await page.addScriptTag({ path: 'escape_room_module.js' });
 await page.evaluate(en => {
 const t=(key,params={})=>{let v=key.split('.').reduce((o,k)=>o&&o[k],en);if(typeof v!=='string')return undefined;for(const[k,p]of Object.entries(params))v=v.replace('{'+k+'}',p);return v;};
 const puzzles=[
 {id:'mcq',type:'mcq',question:'What gives plants energy?',options:['Sunlight','Stone','Snow','Sand'],correctIndex:0},
 {id:'sequence',type:'sequence',question:'Order the stages of a plant.',items:['Seed','Plant'],correctOrder:[0,1],shuffledItems:[1,0]},
 {id:'matching',type:'matching',question:'Match each source to its resource.',pairs:[{left:'Sun',right:'Light'},{left:'Cloud',right:'Water'}]},
 {id:'cipher',type:'cipher',question:'Solve the riddle.',encodedText:'I shine in the sky and help plants grow.',answer:'sunlight',wordbank:['sunlight','rain']},
 {id:'scramble',type:'scramble',question:'Unscramble the resource.',scrambledWord:'RETWA',answer:'WATER'},
 {id:'fillin',type:'fillin',question:'Complete the sentence.',sentence:'Plants need _____ to make food.',answer:'sunlight'}
 ].map(p=>({...p,linkedObjectId:p.id,hint:'Think about what plants need.'}));
 const objects=puzzles.map(p=>({id:p.id,name:p.type,description:'Inspect this object.',emoji:'📖'}));
 let state; const completedActivities=new Map(); const noop=()=>{}; window.fixtureCredits=0;
 function App(){
 const [room,setRoom]=React.useState({isActive:true,room:{theme:'The Botanical Archive',description:'Restore the greenhouse by solving six puzzles about plants.'},puzzles,objects,totalPuzzles:6,solvedPuzzles:new Set(),discoveredClues:{},textInput:'',timeRemaining:300,maxTime:300,difficulty:'normal',hintsRemaining:3,finalDoorPuzzle:{sentence:'What process lets plants turn sunlight into food?',answer:'photosynthesis',acceptableAnswers:['photo synthesis']}});
 const [time,setTime]=React.useState(300);const [running,setRunning]=React.useState(true);state={escapeRoomState:room,escapeTimeLeft:time,isEscapeTimerRunning:running,completedActivities};
 window.fixtureState=state;window.setRoomState=setRoom;window.setEscapeFixtureTime=setTime;
 window.AlloModules.useEscapeRoomTimer({escapeRoomState:room,escapeTimeLeft:time,isEscapeTimerRunning:running,setEscapeRoomState:setRoom,setEscapeTimeLeft:setTime,setIsEscapeTimerRunning:setRunning,t,addToast:noop});
 const handlers=window.AlloModules.createEscapeRoomEngine({getState:()=>state,setState:{setEscapeRoomState:setRoom,setEscapeTimeLeft:setTime,setIsEscapeTimerRunning:setRunning},t,callGemini:()=>{},addToast:()=>{},playSound:()=>{},handleScoreUpdate:(points,_name,id)=>{const old=completedActivities.get(id)||0;window.fixtureCredits+=Math.max(0,points-old);completedActivities.set(id,Math.max(old,points));},setGlobalPoints:()=>{}});
 return React.createElement(window.AlloModules.EscapeRoomGameplay,{escapeRoomState:room,setEscapeRoomState:setRoom,escapeTimeLeft:time,isEscapeTimerRunning:running,setIsEscapeTimerRunning:setRunning,handlers,t,soundEnabled:false,setSoundEnabled:()=>{},playSound:()=>{}});
 }
 ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
 },JSON.parse(fs.readFileSync('ui_strings.js','utf8')));
 await page.getByRole('button',{name:'📖 mcq',exact:true}).click();
 await page.getByRole('radio',{name:/Sunlight/}).click();
 await page.getByRole('button',{name:'📖 sequence',exact:true}).click();
 await page.getByRole('button',{name:/Move up/}).last().click();
 await page.getByRole('button',{name:'Check Sequence',exact:true}).click();
 await page.getByRole('button',{name:'📖 matching',exact:true}).click();
 await page.getByRole('option',{name:'Sun',exact:true}).click();await page.getByRole('option',{name:'Light',exact:true}).click();
 await page.getByRole('option',{name:'Cloud',exact:true}).click();await page.getByRole('option',{name:'Water',exact:true}).click();
 await page.getByRole('button',{name:'📖 cipher',exact:true}).click();await page.getByRole('button',{name:'sunlight',exact:true}).click();await page.getByRole('button',{name:'Submit Answer',exact:true}).click();
 await page.getByRole('button',{name:'📖 scramble',exact:true}).click();await page.getByRole('textbox').fill('water');await page.getByRole('button',{name:'Check Word',exact:true}).click();
 await page.getByRole('button',{name:'📖 fillin',exact:true}).click();await page.getByRole('textbox').fill('sun');
 await page.getByRole('dialog').getByRole('button',{name:'Pause',exact:true}).click();
 if(await page.getByRole('dialog').count())throw Error('Pause left a puzzle open');
 if(!await page.getByRole('button',{name:'Resume',exact:true}).evaluate(el=>el===document.activeElement))throw Error('Pause did not focus Resume');
 const pausedTime=await page.evaluate(()=>window.fixtureState.escapeTimeLeft);
 await page.waitForTimeout(1100);
 if(await page.evaluate(()=>window.fixtureState.escapeTimeLeft)!==pausedTime)throw Error('Paused clock changed');
 await page.getByRole('button',{name:'Resume',exact:true}).click();
 await page.getByRole('button',{name:'📖 fillin',exact:true}).click();
 if(await page.getByRole('textbox').inputValue()!=='sun')throw Error('Pause lost the draft');
 await page.getByRole('textbox').fill('sunlight');
 await page.setViewportSize({width:390,height:844});
 const overflows=await page.evaluate(()=>({page:document.documentElement.scrollWidth>innerWidth,dialog:document.querySelector('[role=dialog]').getBoundingClientRect().height>innerHeight}));
 fs.mkdirSync('docs/escape-room-review',{recursive:true});await page.screenshot({path:'docs/escape-room-review/mobile-puzzle.png',fullPage:true});
 await page.getByRole('button',{name:'Submit Answer',exact:true}).click();
 await page.getByRole('button',{name:'Approach the Exit Door',exact:true}).click();
 await page.getByRole('textbox').fill('photo');await page.getByRole('button',{name:'Unlock the Door',exact:true}).click();
 if(await page.evaluate(()=>window.fixtureState.escapeRoomState.isEscaped))throw Error('Partial answer escaped');
 await page.getByRole('textbox').fill('photosynthesis');await page.getByRole('button',{name:'Unlock the Door',exact:true}).click();
 await page.getByText('You solved all the puzzles and escaped the room!',{exact:true}).waitFor();
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'docs/escape-room-review/completed-room.png',fullPage:true});
 const solved=await page.evaluate(()=>window.fixtureState.escapeRoomState.solvedPuzzles.size);
 const score=await page.evaluate(()=>({earned:window.fixtureState.escapeRoomState.xpEarned,credits:window.fixtureCredits,runScore:window.fixtureState.escapeRoomState.runScore}));
 if(score.earned!==score.credits)throw Error('XP display disagrees with awards');
 await page.getByRole('button',{name:'Play Again',exact:true}).click();
 if(await page.evaluate(()=>window.fixtureState.escapeRoomState.solvedPuzzles.size!==0||window.fixtureState.isEscapeTimerRunning))throw Error('Replay did not reset to ready');
 if(!await page.getByRole('button',{name:'Start Escape Room',exact:true}).evaluate(el=>el===document.activeElement))throw Error('Replay did not focus Start');
 await page.getByRole('button',{name:'Start Escape Room',exact:true}).click();
 await page.evaluate(()=>window.setEscapeFixtureTime(1));
 await page.getByRole('heading',{name:/Time.*Up/}).waitFor();
 if(await page.evaluate(()=>window.fixtureState.escapeRoomState.gameOverReason)!=='time')throw Error('Missing timeout result');
 await page.getByRole('button',{name:'Play Again',exact:true}).click();
 if(!await page.getByRole('button',{name:'Start Escape Room',exact:true}).evaluate(el=>el===document.activeElement))throw Error('Replay did not focus Start');
 await page.getByRole('button',{name:'Start Escape Room',exact:true}).click();
 await page.getByRole('button',{name:'📖 mcq',exact:true}).click();
 for(let i=0;i<3;i++)await page.getByRole('radio',{name:/Stone/}).click();
 await page.getByRole('heading',{name:'Game Over! You ran out of lives.',exact:true}).waitFor();
 if(await page.evaluate(()=>window.fixtureState.escapeRoomState.lives)!==0)throw Error('Lives did not expire');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/escape-room-review/retry-room.png',fullPage:true});
 const retryOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 if(retryOverflow)throw Error('Retry screen overflows');
 console.log(JSON.stringify({solved,escaped:true,score,pauseResume:true,draftPreserved:true,replay:true,timeOut:true,livesExhausted:true,overflows,errors}));if(errors.length||overflows.page||overflows.dialog)throw Error('Browser checks failed');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});