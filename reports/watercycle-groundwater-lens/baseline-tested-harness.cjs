'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/watercycle-groundwater-lens');
const BASELINE=process.argv.includes('--baseline'),PREFLIGHT=process.argv.includes('--preflight');
const mode=BASELINE?'baseline':PREFLIGHT?'browser-preflight':'browser';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const read=file=>fs.readFileSync(path.join(ROOT,file));
const expected=process.argv.find(arg=>/^[a-f0-9]{64}$/.test(arg));
const source=read(BASELINE?'reports/watercycle-groundwater-lens/baseline-runtime.js':'stem_lab/stem_tool_watercycle.js');
if(!expected||sha(source)!==expected)throw Error('Provide exact frozen ready SHA: actual '+sha(source));
fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(path.join(OUT,mode+'-tested-runtime.js'),source);
fs.writeFileSync(path.join(OUT,mode+'-tested-harness.cjs'),fs.readFileSync(__filename));
const quiz={q:'How does most groundwater move through soil and rock?',a:'Tiny connected pores and cracks',opts:['Tiny connected pores and cracks','Open underground rivers','Sealed clouds below the ground','It cannot move'],concept:'infiltration',wrongFeedback:{'Open underground rivers':'Most groundwater moves through pores and cracks, rather than open rivers.'},answered:true,chosen:'Open underground rivers',score:2};
const myth={idx:6,s:'Groundwater flows in big underground rivers and lakes.',t:false,why:'Almost all groundwater seeps through tiny pores in soil and rock, like water held in a sponge.',tryIt:'In Journey Mode, take the Infiltration path: the aquifer leg is the slowest part of the cycle.',answered:true,chosen:true};
const seed={wcMode:'explore',wcSection:'journey',activeStage:'infiltration',journeyView:'2d',journeyActive:true,journeyState:'aquifer_flow',journeyLastPath:'infiltrate',journeyPaused:true,wc2dPaused:true,journeySpeed:1,journeyLoops:2,journeyPaths:{runoff:1,infiltrate:1,plant:0},climSolar:1.2,climTemp:18,climWind:1.4,landRainIntensity:60,landSaturation:50,landPermeability:'medium',landSlope:'moderate',landCover:'grass',wcQuiz:quiz,wcMyth:myth,wcAttempts:4,wcStreak:0,quizCorrectCount:2,wcMythsDone:3,researchPoints:10,completedChallenges:['complete_journey','explore_all_stages','adjust_climate','quiz_pass','vocabulary_studied','stewardship_win','myth_buster','double_rainbow'],wcScenarioBaseline:{climSolar:1},wcProcessCompare:{notes:{'condensation|precipitation':'Existing learner writing'}},wcExperimentLog:[{key:'preserve-evidence',label:'Existing observation',notes:{explanation:'Existing saved explanation'}}],precipHunt:{paused:true,experiment:{prediction:'Keep storm prediction',explanation:'Keep storm explanation'}}};
fs.writeFileSync(path.join(OUT,mode+'-fixtures.json'),JSON.stringify({seed,quiz,myth},null,2));
const report={mode,pid:process.pid,startedAt:new Date().toISOString(),sourceSha256:sha(source),sourceBytes:source.length,publicHostSha256:sha(read('desktop/web-app/public/stem_lab/stem_tool_watercycle.js')),harnessSha256:sha(fs.readFileSync(__filename)),checks:[],cases:[],nativeActions:[],audits:[],captures:[],errors:[],consoleErrors:[],contrastReadings:[],completed:false,successful:false,browserClosed:false,serverUsed:false,serverClosed:true,serverClosedAt:null,resourcesClosed:false};
const save=()=>fs.writeFileSync(path.join(OUT,mode+'-results.json'),JSON.stringify(report,null,2));
const check=(label,passed,details)=>{report.checks.push({label,passed:!!passed,details});if(!passed)report.errors.push(label);save();};
const variants=[{name:'phone320',width:320},{name:'phone390',width:390},{name:'desktop',width:1280},{name:'host390',width:1280,host:390},{name:'dark',width:1280,dark:true},{name:'forced-phone',width:320,forced:true},{name:'forced-dark',width:1280,dark:true,forced:true}];
async function painted(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function capture(locator,name){const file=path.join(OUT,mode+'-'+name+'.png');await locator.screenshot({path:file,animations:'disabled',timeout:60000});const bytes=fs.readFileSync(file);report.captures.push({path:path.basename(file),sha256:sha(bytes),bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sourceSha256:report.sourceSha256,capturedAt:new Date().toISOString()});save();}
let browser;
(async()=>{
 try{
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});report.browserLaunchedAt=new Date().toISOString();save();
  const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(45000);
  page.on('pageerror',error=>{report.errors.push(String(error));save();});page.on('console',message=>{if(message.type()==='error'){report.consoleErrors.push(message.text());save();}});
  await page.setContent('<!doctype html><html lang="en"><head><title>Groundwater lens QA</title></head><body style="margin:0;font-family:system-ui;background:#eef2ed"><main id="slot" style="padding:12px"></main></body></html>');
  await page.addStyleTag({content:read('dev-tools/.cache/sweep-tailwind.css').toString('utf8')});
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js','vendor/three-r128/OrbitControls.js','stem_lab/stem_lab_module.js'])await page.addScriptTag({content:read(file).toString('utf8')});
  await page.addScriptTag({content:source.toString('utf8')});await page.addScriptTag({content:read('desktop/web-app/node_modules/axe-core/axe.min.js').toString('utf8')});
  await page.evaluate(()=>{
   const NativeRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(...args){const renderer=new NativeRenderer(...args),render=renderer.render;renderer.render=function(scene,camera){window.lensActualRenderer={renderer,scene,camera};return render.call(renderer,scene,camera);};return renderer;};
   const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});window.lensAwards=[];
   window.mountLens=function(data,variant){function Host(){const[state,setState]=React.useState({waterCycle:data,_threeLoaded:true});window.lensData=state.waterCycle;window.lensSet=setState;const noop=()=>{};return StemLab._registry.waterCycle.render({React,toolData:state,setToolData:setState,isDark:!!variant.dark,isContrast:false,gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:(...args)=>lensAwards.push(args),getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(key,fallback)=>fallback==null?key:fallback,props:{},srOnly:{},callGemini:null});}document.documentElement.classList.toggle('dark',!!variant.dark);document.body.style.background=variant.dark?'#081b21':'#eef2ed';const slot=document.getElementById('slot');slot.style.width=variant.host?variant.host+'px':'';slot.style.boxSizing='border-box';ReactDOM.unmountComponentAtNode(slot);ReactDOM.render(React.createElement(Host),slot);};
  });
  const mount=async(data,variant)=>{await page.setViewportSize({width:variant.width,height:1000});await page.emulateMedia({forcedColors:variant.forced?'active':'none',reducedMotion:'reduce'});await page.evaluate(({data,variant})=>mountLens(data,variant),{data,variant});await painted(page);const canvas=page.locator('#wcCanvas');if(await canvas.count())await canvas.evaluate(node=>{if(node._wcSetJourneyProgress)node._wcSetJourneyProgress(.42);});await painted(page);};
  if(BASELINE){
   for(const variant of variants){
    await mount(seed,variant);await page.locator('#wcJourneyChapterCard[data-chapter-id="land"]').waitFor({state:'visible'});check(variant.name+' baseline land chapter mounted',true);await capture(page.locator('#wcJourneyChapterCard'),'land-'+variant.name);await capture(page.locator('#wcCanvas'),'canvas-'+variant.name);report.cases.push({context:'land',variant:variant.name});
    await mount({...seed,wcSection:'check'},variant);await page.locator('#wcCheckInvestigateQuiz').click();report.nativeActions.push({context:'check',variant:variant.name,action:'open native groundwater investigation'});await page.locator('.wc-check-pores').waitFor({state:'visible'});check(variant.name+' baseline old pore figure mounted',true);await capture(page.locator('.wc-check-pores'),'check-'+variant.name);report.cases.push({context:'check',variant:variant.name});
   }
  }else{
   throw Error('New lens selectors pending root implementation; baseline mode is ready.');
  }
  report.completed=true;report.successful=report.errors.length===0;
 }catch(error){report.errors.push(error.stack||String(error));}
 finally{if(browser){await browser.close();report.browserClosed=true;report.browserClosedAt=new Date().toISOString();}report.resourcesClosed=true;report.completedAt=new Date().toISOString();save();console.log(JSON.stringify({mode,completed:report.completed,successful:report.successful,checks:report.checks.length,failed:report.checks.filter(item=>!item.passed).length,captures:report.captures.length,errors:report.errors,browserClosedAt:report.browserClosedAt}));if(!report.successful)process.exitCode=1;}
})();
