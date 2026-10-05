'use strict';
// Owned, local browser proof for the Explorer's illustrated mountains and clouds.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/watercycle-illustrated-landscape');
const BASELINE=process.argv.includes('--baseline'),PREFLIGHT=process.argv.includes('--preflight');
const mode=BASELINE?'baseline':PREFLIGHT?'browser-preflight':'browser';
const prefix=(process.argv.find(arg=>arg.startsWith('--run='))||'').slice(6)||mode;
if(!/^[a-z0-9-]+$/.test(prefix))throw Error('Invalid report prefix');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const read=file=>fs.readFileSync(path.join(ROOT,file));
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const expected=process.argv.find(arg=>/^[a-f0-9]{64}$/.test(arg));
const source=read(BASELINE?'reports/watercycle-illustrated-landscape/baseline-runtime.js':'stem_lab/stem_tool_watercycle.js');
if(!expected||sha(source)!==expected)throw Error('Supply exact runtime SHA: '+sha(source));
fs.mkdirSync(OUT,{recursive:true});
if(fs.existsSync(path.join(OUT,prefix+'-results.json')))throw Error('Evidence exists; supply a fresh --run= prefix');
fs.writeFileSync(path.join(OUT,prefix+'-tested-runtime.js'),source);
fs.writeFileSync(path.join(OUT,prefix+'-tested-harness.cjs'),fs.readFileSync(__filename));
const seed={wcMode:'explore',wcSection:'journey',activeStage:'condensation',journeyView:'2d',journeyActive:true,journeyState:'condensing',journeyLastPath:'runoff',journeyPaused:true,wc2dPaused:true,journeySpeed:1,journeyLoops:2,journeyPaths:{runoff:1,infiltrate:1,plant:0},xp:73,score:4,researchPoints:10,completedChallenges:['complete_journey','adjust_climate'],climSolar:1.2,climTemp:18,climWind:1.4,landRainIntensity:60,landSaturation:50,landPermeability:'medium',landSlope:'moderate',landCover:'grass',wcExperimentLog:[{key:'saved-record',notes:{explanation:'Saved observation'}}],wcCheckReflections:{saved:{observation:'Saved learner explanation'}}};
const variants=[{name:'desktop',width:1280},{name:'phone320',width:320}];
const cases=[];
for(const variant of variants)for(const scene of[
 {name:'daylight-condensation',state:'condensing',stage:'condensation',solar:1.2},
 {name:'dark-precipitation',state:'precipitating',stage:'precipitation',solar:1.2,dark:true},
 {name:'low-solar-ground-choice',state:'ground_choice',stage:'precipitation',solar:.2}
])cases.push({...variant,...scene});
for(const cover of['forest','urban'])cases.push({...variants[0],name:cover+'-daylight-precipitation',state:'precipitating',stage:'precipitation',solar:1.2,cover});
const report={mode,prefix,pid:process.pid,startedAt:new Date().toISOString(),sourceSha256:sha(source),sourceBytes:source.length,currentMainAtStartSha256:sha(read('stem_lab/stem_tool_watercycle.js')),publicHostSha256:sha(read('desktop/web-app/public/stem_lab/stem_tool_watercycle.js')),harnessSha256:sha(fs.readFileSync(__filename)),checks:[],cases:[],nativeActions:[],captures:[],errors:[],consoleErrors:[],completed:false,successful:false,browserClosed:false,serverUsed:false,serverClosed:true,resourcesClosed:false};
function save(){fs.writeFileSync(path.join(OUT,prefix+'-results.json'),JSON.stringify(report,null,2));}
function check(label,passed,details){report.checks.push({label,passed:!!passed,details});if(!passed)report.errors.push(label);}
async function painted(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function snapshot(page){const value=await page.evaluate(()=>{const canvas=document.getElementById('wcCanvas'),pin=window.landscapePin;return{data:JSON.parse(JSON.stringify(landscapeData)),awards:JSON.parse(JSON.stringify(landscapeAwards)),image:canvas.toDataURL(),state:canvas.dataset.journeyState,progress:canvas.dataset.journeyProgress,paused:canvas.dataset.journeyPaused,engine:{canvasSame:canvas===pin.canvas,contextSame:canvas.getContext('2d')===pin.context,hooks:['_wcSetJourneyProgress','_wcRestartJourney','_wcRedraw'].map(name=>({name,type:typeof canvas[name],same:canvas[name]===pin.hooks[name]}))}};});value.canvasSha256=sha(value.image);delete value.image;return value;}
function retained(value){return value.engine.canvasSame&&value.engine.contextSame&&value.engine.hooks.every(item=>item.type==='function'&&item.same);}
async function recordScene(page,label){
 const evidence=await page.locator('#wcCanvas').evaluate(canvas=>{
  const ctx=canvas.getContext('2d'),proto=Object.getPrototypeOf(ctx),gradientProto=CanvasGradient.prototype;
  const methods=['save','restore','clip','beginPath','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','arc','ellipse','rect','closePath','fill','stroke','createLinearGradient','createRadialGradient'];
  const originals=Object.fromEntries(methods.map(name=>[name,proto[name]])),originalStop=gradientProto.addColorStop;
  const gradients=new WeakMap(),scopes={drawMountainRelief2d:{save:0,restore:0,clip:0,fill:0,stroke:0},drawCloud:{save:0,restore:0,clip:0,fill:0,stroke:0}};
  const before={data:JSON.stringify(landscapeData),awards:JSON.stringify(landscapeAwards),progress:canvas.dataset.journeyProgress};
  const receipt={width:canvas.width,height:canvas.height,scopes,paints:[],clips:[],gradients:[],methodsRestored:false,finiteCoordinates:true,balanced:true};
  let currentPath=[],depth=0;
  const callers=()=>{const stack=String(new Error().stack);return Object.keys(scopes).filter(name=>stack.includes(name));};
  const paintStyle=value=>gradients.get(value)||String(value);
  const point=(x,y)=>{const t=ctx.getTransform();return{x:t.a*x+t.c*y+t.e,y:t.b*x+t.d*y+t.f};};
  const attrs=()=>({alpha:ctx.globalAlpha,composite:ctx.globalCompositeOperation,lineWidth:ctx.lineWidth,transform:[ctx.getTransform().a,ctx.getTransform().b,ctx.getTransform().c,ctx.getTransform().d,ctx.getTransform().e,ctx.getTransform().f]});
  const initial=attrs();
  try{
   for(const name of methods)proto[name]=function(...args){
    const result=Reflect.apply(originals[name],this,args);if(this!==ctx)return result;
    const provenance=callers();
    if(name==='save')depth++;
    if(name==='restore'){depth--;if(depth<0)receipt.balanced=false;}
    for(const caller of provenance)if(Object.hasOwn(scopes[caller],name))scopes[caller][name]++;
    if(name==='beginPath')currentPath=[];
    else if(['moveTo','lineTo','quadraticCurveTo','bezierCurveTo','arc','ellipse','rect'].includes(name)){
     if(args.some(value=>typeof value==='number'&&!Number.isFinite(value)))receipt.finiteCoordinates=false;
     currentPath.push({operation:name,args:[...args],point:point(args[0],args[1])});
    }else if(name==='closePath')currentPath.push({operation:name});
    else if(name==='clip'&&provenance.length)receipt.clips.push({callers:provenance,path:JSON.parse(JSON.stringify(currentPath)),depth,...attrs()});
    else if((name==='fill'||name==='stroke')&&provenance.length)receipt.paints.push({operation:name,callers:provenance,color:paintStyle(name==='fill'?ctx.fillStyle:ctx.strokeStyle),path:JSON.parse(JSON.stringify(currentPath)),depth,...attrs()});
    else if(name==='createLinearGradient'||name==='createRadialGradient'){
     const value={kind:name,args:[...args],stops:[],callers:provenance};gradients.set(result,value);if(provenance.length)receipt.gradients.push(value);
    }
    return result;
   };
   gradientProto.addColorStop=function(position,color){const value=gradients.get(this);if(value)value.stops.push({position,color});return Reflect.apply(originalStop,this,[position,color]);};
   if(typeof canvas._wcRedraw!=='function')throw Error('Missing actual canvas redraw hook');
   canvas._wcRedraw();
   receipt.balanced=receipt.balanced&&depth===0;
   receipt.contextStateRestored=JSON.stringify(initial)===JSON.stringify(attrs());
  }finally{
   for(const name of methods)proto[name]=originals[name];gradientProto.addColorStop=originalStop;
   receipt.methodsRestored=methods.every(name=>proto[name]===originals[name])&&gradientProto.addColorStop===originalStop;
  }
  receipt.dataUnchanged=before.data===JSON.stringify(landscapeData);receipt.awardsUnchanged=before.awards===JSON.stringify(landscapeAwards);receipt.progressUnchanged=before.progress===canvas.dataset.journeyProgress;
  const sample=(x0,y0,x1,y1)=>{const x=Math.floor(canvas.width*x0),y=Math.floor(canvas.height*y0),width=Math.max(1,Math.floor(canvas.width*(x1-x0))),height=Math.max(1,Math.floor(canvas.height*(y1-y0))),pixels=ctx.getImageData(x,y,width,height).data,colors=new Set();let minimum=255,maximum=0,total=0,n=0;for(let i=0;i<pixels.length;i+=64){const r=pixels[i],g=pixels[i+1],b=pixels[i+2],light=.2126*r+.7152*g+.0722*b;colors.add([r>>3,g>>3,b>>3].join(','));minimum=Math.min(minimum,light);maximum=Math.max(maximum,light);total+=light;n++;}return{x,y,width,height,sampledColors:colors.size,minimumLuminance:minimum,maximumLuminance:maximum,meanLuminance:total/n};};
  receipt.pixels={mountains:sample(.60,.27,.98,.64),clouds:sample(.15,.045,.50,.26)};
  const box=canvas.getBoundingClientRect();receipt.bounds=box.toJSON();receipt.pageOverflow=document.documentElement.scrollWidth>innerWidth+1;receipt.ariaLabel=canvas.getAttribute('aria-label');
  return receipt;
 });
 report.cases.push({label,...evidence});
 check(label+' recorder restores native methods and canvas stack',evidence.methodsRestored&&evidence.balanced&&evidence.contextStateRestored,{restored:evidence.methodsRestored,balanced:evidence.balanced,context:evidence.contextStateRestored});
 check(label+' paint reads preserve learner data scores and progress',evidence.dataUnchanged&&evidence.awardsUnchanged&&evidence.progressUnchanged,{data:evidence.dataUnchanged,awards:evidence.awardsUnchanged,progress:evidence.progressUnchanged});
 check(label+' actual cloud paint and finite coordinates',evidence.scopes.drawCloud.fill>=3&&evidence.finiteCoordinates,evidence.scopes);
 check(label+' scene fits viewport and has accessible process label',!evidence.pageOverflow&&evidence.bounds.width>200&&!!evidence.ariaLabel,{bounds:evidence.bounds,overflow:evidence.pageOverflow,ariaLabel:evidence.ariaLabel});
 check(label+' mountain and cloud crops contain visible shading',evidence.pixels.mountains.sampledColors>6&&evidence.pixels.clouds.sampledColors>6,evidence.pixels);
 if(!BASELINE){
  check(label+' actual mountain helper paints both ridges',evidence.scopes.drawMountainRelief2d.fill>=2,evidence.scopes.drawMountainRelief2d);
  check(label+' relief and cloud paint are clipped and balanced',evidence.scopes.drawMountainRelief2d.clip>=2&&evidence.scopes.drawCloud.clip>=3&&Object.values(evidence.scopes).every(item=>item.save===item.restore&&item.save>0),evidence.scopes);
 }
 return evidence;
}
async function capture(page,label,item){const filename=prefix+'-'+label+'.png';await page.locator('#wcCanvas').screenshot({path:path.join(OUT,filename),animations:'disabled',timeout:60000});const bytes=fs.readFileSync(path.join(OUT,filename));report.captures.push({path:filename,sha256:sha(bytes),bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sourceSha256:report.sourceSha256,capturedAt:new Date().toISOString(),selector:'#wcCanvas',variant:item.name,widthCSS:item.width,state:item.state,landCover:item.cover||'grass',solar:item.solar,dark:!!item.dark});}
let browser;
(async()=>{try{
 browser=await chromium.launch({headless:true});report.browserLaunchedAt=new Date().toISOString();save();
 const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(30000);
 page.on('pageerror',error=>report.errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
 await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Explorer landscape owned QA</title></head><body style="margin:0;font-family:system-ui;background:#e8eef1"><main id="slot" style="padding:12px;box-sizing:border-box"></main></body></html>');
 await page.addStyleTag({content:read('dev-tools/.cache/sweep-tailwind.css').toString('utf8')});
 for(const file of['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js'])await page.addScriptTag({content:read(file).toString('utf8')});
 await page.addScriptTag({content:source.toString('utf8')});
 const loaded=await page.evaluate(()=>[...document.scripts].filter(script=>script.textContent.includes('var JOURNEY_MATTER_ENERGY_TRACE =')).map(script=>script.textContent));report.loadedRuntimeSha256=loaded.length===1?sha(loaded[0]):null;report.loadedRuntimeBytes=loaded.length===1?Buffer.byteLength(loaded[0]):null;
 check('Actual loaded script matches supplied frozen runtime',loaded.length===1&&report.loadedRuntimeSha256===report.sourceSha256&&report.loadedRuntimeBytes===report.sourceBytes,{count:loaded.length,sha256:report.loadedRuntimeSha256,bytes:report.loadedRuntimeBytes});
 await page.evaluate(()=>{const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});window.landscapeAwards=[];window.mountLandscape=function(seed,variant){function Host(){const[state,setState]=React.useState({waterCycle:seed,_threeLoaded:false});window.landscapeData=state.waterCycle;const noop=()=>{};return StemLab._registry.waterCycle.render({React,toolData:state,setToolData:setState,isDark:!!variant.dark,isContrast:false,gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:(...args)=>landscapeAwards.push(args),getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(key,fallback)=>fallback==null?key:fallback,props:{},srOnly:{},callGemini:null});}document.documentElement.classList.toggle('dark',!!variant.dark);document.body.style.background=variant.dark?'#081b21':'#e8eef1';const slot=document.getElementById('slot');ReactDOM.unmountComponentAtNode(slot);ReactDOM.render(React.createElement(Host),slot);};});
 const mount=async(item,motion='reduce')=>{await page.setViewportSize({width:item.width,height:1000});await page.emulateMedia({reducedMotion:motion});await page.evaluate(({seed,item})=>mountLandscape({...seed,journeyState:item.state,activeStage:item.stage,landCover:item.cover||'grass',climSolar:item.solar},item),{seed,item});await page.waitForSelector('#wcCanvas');await page.locator('#wcCanvas').evaluate((canvas,state)=>{canvas._wcSetJourneyProgress(state==='ground_choice'?0:.42);window.landscapePin={canvas,context:canvas.getContext('2d'),hooks:Object.fromEntries(['_wcSetJourneyProgress','_wcRestartJourney','_wcRedraw'].map(name=>[name,canvas[name]]))};},item.state);await painted(page);};
 for(const item of cases.filter(item=>!PREFLIGHT||item.name==='daylight-condensation')){
  const label=item.name+'-'+(item.width===320?'phone320':'desktop');await mount(item);
  const before=await snapshot(page);check(label+' real paused journey mounted',before.state===item.state&&before.paused==='true'&&before.data.journeyPaused===true&&retained(before),before);
  await recordScene(page,label);
  // The explicit instrumentation redraw may repaint legacy trails. Compare
  // passive screenshot stability only after that requested redraw has settled.
  const settled=await snapshot(page);await capture(page,label,item);const after=await snapshot(page);
  check(label+' passive captures retain settled paused pixels data and native engine',same(before.data,settled.data)&&same(before.data,after.data)&&same(before.awards,settled.awards)&&same(before.awards,after.awards)&&settled.canvasSha256===after.canvasSha256&&before.progress===settled.progress&&before.progress===after.progress&&retained(settled)&&retained(after),{beforeInstrumentation:before,afterRequestedRedraw:settled,afterPassiveCapture:after});save();
 }
 if(!BASELINE&&!PREFLIGHT){
  const item={...variants[0],name:'native-playback',state:'condensing',stage:'condensation',solar:1.2};await mount(item,'no-preference');const before=await snapshot(page);
  const originalPixels=await page.locator('#wcCanvas').evaluate(canvas=>canvas.toDataURL());
  await page.getByRole('button',{name:'Resume 2D water cycle animation',exact:true}).click();await page.waitForFunction(pixels=>document.getElementById('wcCanvas').toDataURL()!==pixels,originalPixels);
  await page.getByRole('button',{name:'Pause 2D water cycle animation',exact:true}).click();await painted(page);const after=await snapshot(page),fields=Object.keys({...before.data,...after.data}).filter(key=>!same(before.data[key],after.data[key]));
  report.nativeActions.push({label:'Native 2D scene resume then pause',kind:'native-playback',controls:['Resume 2D water cycle animation','Pause 2D water cycle animation'],before,after,changedFields:fields});
  check('Native scene playback advances and returns to paused state',before.canvasSha256!==after.canvasSha256&&after.data.wc2dPaused===true&&after.paused==='true'&&after.data.journeyPaused===true&&after.state==='condensing',{before:before.canvasSha256,after:after.canvasSha256,state:after.state});
  check('Native playback preserves engine scores and saved work',fields.length===0&&same(before.awards,after.awards)&&retained(after),{changedFields:fields,engine:after.engine,awards:after.awards});
  const settled=await snapshot(page);await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,160)));const still=await snapshot(page);check('Native pause freezes scene pixels and progress',settled.canvasSha256===still.canvasSha256&&settled.progress===still.progress,{settled:pickPause(settled),still:pickPause(still)});
 }
 check('Current source and public mirror remain unchanged during QA',sha(read('stem_lab/stem_tool_watercycle.js'))===report.currentMainAtStartSha256&&sha(read('desktop/web-app/public/stem_lab/stem_tool_watercycle.js'))===report.publicHostSha256);
 if(!BASELINE)check('Source and public mirror match the supplied candidate',report.currentMainAtStartSha256===report.sourceSha256&&report.publicHostSha256===report.sourceSha256);
 check('Browser emits no console errors',report.consoleErrors.length===0,report.consoleErrors);
 report.completed=true;report.successful=report.errors.length===0;
 }catch(error){report.errors.push(error.stack||String(error));}finally{if(browser){await browser.close();report.browserClosed=true;report.browserClosedAt=new Date().toISOString();}report.resourcesClosed=true;report.completedAt=new Date().toISOString();save();console.log(JSON.stringify({mode,prefix,pid:report.pid,completed:report.completed,successful:report.successful,checks:report.checks.length,captures:report.captures.length,errors:report.errors,browserClosedAt:report.browserClosedAt}));if(!report.successful)process.exitCode=1;}})();
function pickPause(value){return{progress:value.progress,canvasSha256:value.canvasSha256,paused:value.paused};}
