'use strict';
// Bounded SVG, comparison, and orientation-lens checks in an owned browser.
// Run: node dev-tools/watercycle_process_diagram_qa.cjs [--baseline]
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports/watercycle-process-diagrams');
const BASELINE=process.argv.includes('--baseline');
const MAIN=path.join(ROOT,'stem_lab/stem_tool_watercycle.js');
const PUBLIC=path.join(ROOT,'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const source=BASELINE?(()=>{const run=spawnSync('git',['show','78e13faae:stem_lab/stem_tool_watercycle.js'],{cwd:ROOT,maxBuffer:32*1024*1024});assert.equal(run.status,0,String(run.stderr));return run.stdout;})():fs.readFileSync(MAIN);
const report={title:'Water Cycle process diagrams and scene orientation',startedAt:new Date().toISOString(),sourceSha256:sha(source),publicSha256:sha(fs.readFileSync(PUBLIC)),baselineCommit:'78e13faae',baselineSourceSha256:'3b733011f6f4842a41572ac605e2db17b2b7791cbea724f9e81bf78c154e620b',
  visibleLayoutAssessment:'Visible HTML content is checked for clipping and overflow; each SVG is checked through its actual getBBox geometry. Intentionally clipped .sr-only connector spans are excluded from visible-layout bounds and remain included in the accessibility audit. The initial diagnostic in results-initial.json records the helper-span flags before this distinction was applied.',
  method:'Frozen runtime, owned ephemeral localhost server and isolated Chromium; native comparison controls and keyboard, real React journey fixtures, actual SVG geometry/text, scoped accessibility audits. No learner tabs, preview server, Git writes, or external publishing.',checks:[],cases:[],audits:[],failures:[],errors:[],completed:false,successful:false,browserClosed:false,serverClosed:false};
const check=(pass,label,detail)=>{report.checks.push({label,pass:!!pass,...(detail===undefined?{}:{detail})});if(!pass)report.failures.push(label);};
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Water Cycle diagram QA</title><link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;background:#eef2f2;font-family:system-ui}main{padding:12px;max-width:1500px;margin:auto}</style></head><body><main id="slot"></main><script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/vendor/three-r128/three.min.js"></script><script src="/vendor/three-r128/OrbitControls.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountDiagramReview=function(seed,theme){function Host(){const[data,setData]=React.useState({waterCycle:seed,_threeLoaded:true});window.diagramData=data.waterCycle;window.diagramSet=setData;const noop=()=>{};return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:()=>window.diagramXP++,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}window.diagramXP=0;document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':'#eef2f2';ReactDOM.unmountComponentAtNode(document.getElementById('slot'));ReactDOM.render(React.createElement(Host),document.getElementById('slot'));};
window.patchDiagramReview=fields=>diagramSet(previous=>({...previous,waterCycle:{...previous.waterCycle,...fields}}));
</script></body></html>`;
const mime={'.js':'text/javascript','.css':'text/css'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(html);}if(url.pathname==='/stem_lab/stem_tool_watercycle.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(source);}const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(error,bytes)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':bytes);});});
const phases={
  evaporation:['Liquid water','Water vapor'],condensation:['Water vapor','Liquid droplets'],
  precipitation:['Cloud water or ice','Falling liquid or solid water'],collection:['Liquid or solid water','Stored liquid water or ice'],
  transpiration:['Liquid plant water','Water vapor'],infiltration:['Liquid surface water','Liquid soil pore water'],
};
const pairs=[['evaporation','transpiration'],['condensation','precipitation'],['infiltration','collection']];
async function patch(page,fields){await page.evaluate(fields=>patchDiagramReview(fields),fields);await page.waitForTimeout(100);}
async function comparisonMetrics(page){
  return page.evaluate(()=>{
    const panel=document.querySelector('.wc-process-compare');
    const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
    const panels=rect(panel);
    const cards=[...panel.querySelectorAll('.wc-process-card')].map(card=>({id:card.dataset.process,slot:card.dataset.slot,title:card.querySelector('h4').innerText,rect:rect(card),caveat:card.querySelector('.wc-process-caveat').innerText,
      states:[...card.querySelectorAll('.wc-process-state')].map(state=>{const svg=state.querySelector('svg'),bounds=svg.getBBox(),style=getComputedStyle(state.querySelector('strong'));return{phase:state.querySelector('strong').innerText,label:state.querySelector('small').innerText,readingOrder:[...state.children].map(el=>el.tagName.toLowerCase()),rect:rect(state),textRect:rect(state.querySelector('strong')),font:parseFloat(style.fontSize),lineHeight:style.lineHeight,svgRect:rect(svg),viewBox:svg.getAttribute('viewBox'),svgHidden:svg.getAttribute('aria-hidden'),svgFocusable:svg.getAttribute('focusable'),waterSymbols:[...svg.querySelectorAll('[data-water-symbol]')].map(el=>el.dataset.waterSymbol),diagramCues:[...svg.querySelectorAll('[data-diagram-cue]')].map(el=>el.dataset.diagramCue),bounds:{x:bounds.x,y:bounds.y,w:bounds.width,h:bounds.height},geometry:[...svg.querySelectorAll('path,line,polyline,polygon,circle,ellipse,rect')].map(node=>({tag:node.tagName,...Object.fromEntries([...node.attributes].filter(a=>!a.name.startsWith('data-')&&a.name!=='class').map(a=>[a.name,a.value]))})),markup:svg.outerHTML};})
    }));
    const overflow=[...panel.querySelectorAll('*')].filter(el=>{if(el.tagName.toLowerCase()==='svg'||el.closest('svg')||el.closest('.sr-only'))return false;const r=rect(el),s=getComputedStyle(el);return r.w&&(r.x<panels.x-1||r.right>panels.right+1||el.scrollWidth>el.clientWidth+1&&s.overflow!=='visible');}).map(el=>({class:el.className,tag:el.tagName,text:el.innerText&&el.innerText.slice(0,100)}));
    const canvas=document.getElementById('wcCanvas');
    const state={...diagramData};delete state.wcProcessCompare;
    return{cards,overflow,panelRect:panels,viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,pair:{...diagramData.wcProcessCompare},outsideState:JSON.stringify(state),parcel:{state:canvas.dataset.journeyState,stage:canvas.dataset.activeStage,paused:canvas.dataset.journeyPaused,progress:Number(canvas.dataset.journeyProgress||0)},writing:panel.querySelector('#wcProcessExplain').value,xp:window.diagramXP};
  });
}
function assessPair(m,pair,label){
  report.cases.push({label,...m});
  check(m.cards.map(card=>card.id).join('|')===pair.join('|'),label+' native selection renders the requested pair',m.cards.map(card=>card.id));
  check(m.cards.every(card=>card.states.map(s=>s.phase).join('|')===phases[card.id].join('|')),label+' before/after text names physical water states',m.cards.map(card=>({id:card.id,states:card.states.map(s=>s.phase)})));
  check(m.cards.every(card=>card.states.map(s=>s.label).join('|')==='Before|After'&&card.states.every(s=>s.readingOrder.join('|')==='small|svg|strong')),label+' before/after captions precede figure and water-state text');
  check(m.cards.every(card=>JSON.stringify(card.states[0].geometry)!==JSON.stringify(card.states[1].geometry)),label+' each process has a visibly distinct before/after drawing');
  check(m.cards.every(card=>card.states.every(s=>s.svgHidden==='true'&&s.svgFocusable==='false'&&s.bounds.x>=0&&s.bounds.y>=0&&s.bounds.x+s.bounds.w<=48.1&&s.bounds.y+s.bounds.h<=48.1)),label+' SVG marks stay in bounds and visible text supplies meaning');
  check(m.cards.every(card=>card.states.every(s=>s.font>=12&&s.svgRect.w>=48&&s.svgRect.h>=48&&s.textRect.x>=s.rect.x-1&&s.textRect.right<=s.rect.right+1)),label+' figures and phase text remain readable',m.cards.map(card=>({id:card.id,states:card.states.map(s=>({font:s.font,svg:s.svgRect,text:s.textRect,card:s.rect}))})));
  check(m.overflow.length===0&&m.scrollWidth<=m.viewportWidth,label+' comparison fits viewport without clipping or horizontal page scroll',m.overflow);
  const mixed=m.cards.filter(card=>card.id==='precipitation'||card.id==='collection');
  if(mixed.length){check(mixed.every(card=>card.states.every(s=>s.waterSymbols.includes('liquid')&&s.waterSymbols.includes('solid'))),label+' precipitation and collection retain liquid and solid possibilities',mixed.map(card=>({id:card.id,symbols:card.states.map(s=>s.waterSymbols)})));check(mixed.every(card=>card.states.every(s=>s.diagramCues.length>0)),label+' process drawings include a cloud fall arrival or storage cue',mixed.map(card=>({id:card.id,cues:card.states.map(s=>s.diagramCues)})));}
}
async function captureCards(page,name){
  const cards=page.locator('.wc-process-cards');await cards.scrollIntoViewIfNeeded();
  await cards.screenshot({path:path.join(OUT,name),animations:'disabled',timeout:60000});
}
async function audit(page,selector,label){
  const violations=await page.evaluate(async selector=>(await axe.run(document.querySelector(selector),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})),selector);
  report.audits.push({label,violations});check(violations.length===0,label+' accessibility audit',violations);
}
async function lensSnapshot(page,label){
  const m=await page.evaluate(()=>{const lens=document.querySelector('.wc-scene-lens'),dock=document.querySelector('.wc-viewport-dock'),canvas=document.getElementById('wcJourney3d');return{label:lens.querySelector('.wc-scene-lens-main').innerText,axis:[...lens.querySelectorAll('.wc-scene-lens-axis .is-active')].map(el=>el.innerText),aria:lens.getAttribute('aria-label'),mode:lens.querySelector('.wc-scene-lens-mode').innerText,dock:dock.querySelector('.wc-viewport-state strong').innerText,dockDetail:dock.querySelector('.wc-viewport-state-detail').innerText,canvasAria:canvas.getAttribute('aria-label'),selectedStage:canvas.dataset.activeStage,journeyState:diagramData.journeyState,journeyActive:diagramData.journeyActive,viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth};});
  report.cases.push({case:label,...m});return m;
}
async function sceneChecks(page,prefix){
  await patch(page,{journeyActive:false,journeyPaused:true,wc2dPaused:true,activeStage:'evaporation',journeyState:'aquifer_flow'});
  await page.locator('.wc-view-segments button').filter({hasText:'Droplet Journey'}).click();
  await page.waitForFunction(()=>document.getElementById('wcJourney3d')?.dataset.engineState==='ready');
  const inactive=[
    ['evaporation','aquifer_flow','Atmosphere','Sky'],['condensation','river_runoff','Atmosphere','Sky'],['precipitation','plant_absorb','Atmosphere','Sky'],
    ['infiltration','precipitating','Soil pore space','Subsurface'],['collection','aquifer_flow','Landscape overview',null],['transpiration','ground_choice','Landscape overview',null],
  ];
  const inactiveResults=[];
  for(const [stage,remembered,label,axis]of inactive){await patch(page,{journeyActive:false,activeStage:stage,journeyState:remembered});const m=await lensSnapshot(page,prefix+' inactive '+stage);inactiveResults.push({stage,remembered,expected:{label,axis},actual:m});}
  check(inactiveResults.every(r=>r.actual.label===r.expected.label&&r.actual.axis.join('|')===(r.expected.axis||'')),prefix+' inactive lens follows all six selected processes despite remembered route',inactiveResults);
  check(inactiveResults.every(r=>r.actual.aria.includes(r.expected.label)&&r.actual.dock.includes('preview')&&!/aquifer_flow|ground_choice|river_runoff/.test(r.actual.dock)),prefix+' inactive lens and dock describe previews in learner language',inactiveResults);
  const active=[
    ['aquifer_flow','infiltration','Subsurface discharge','Subsurface','Aquifer flow'],['infiltrating','infiltration','Soil pore space','Subsurface','Infiltration'],
    ['river_runoff','collection','Surface routing','Surface','River runoff'],['ground_choice','collection','Surface routing','Surface','Land pathway choice'],
    ['condensing','condensation','Atmosphere','Sky','Condensation'],['plant_absorb','transpiration','Landscape overview',null,'Plant uptake'],
  ];
  const activeResults=[];
  for(const[state,stage,label,axis,dock]of active){await patch(page,{journeyActive:true,journeyPaused:true,journeyState:state,activeStage:stage});const m=await lensSnapshot(page,prefix+' active '+state);activeResults.push({state,expected:{label,axis,dock},actual:m});}
  check(activeResults.every(r=>r.actual.label===r.expected.label&&r.actual.axis.join('|')===(r.expected.axis||'')),prefix+' active lens follows atmosphere surface soil and groundwater routes',activeResults);
  check(activeResults.every(r=>r.actual.dock===r.expected.dock&&r.actual.dockDetail.includes(r.actual.mode)&&r.actual.canvasAria.includes(r.expected.dock)),prefix+' active dock and canvas use readable journey step labels',activeResults);
  check([...inactiveResults,...activeResults].every(r=>r.actual.scrollWidth<=r.actual.viewportWidth),prefix+' active and inactive scenes fit viewport');
  await audit(page,'.wc-scene-lens',prefix+' scene lens');
  await audit(page,'.wc-viewport-dock',prefix+' scene dock');
  if(prefix==='light-320'||prefix==='light-1280'){
    await page.locator('.wc-canvas-shell').screenshot({path:path.join(OUT,'plant-uptake-scene-'+prefix+'.png'),animations:'disabled',timeout:60000});
    await patch(page,{journeyActive:false,activeStage:'collection',journeyState:'aquifer_flow'});
    await page.locator('.wc-canvas-shell').screenshot({path:path.join(OUT,'collection-preview-'+prefix+'.png'),animations:'disabled',timeout:60000});
  }
}
async function main(){
  fs.mkdirSync(OUT,{recursive:true});if(BASELINE)assert.equal(report.sourceSha256,report.baselineSourceSha256,'Reproducible baseline source hash');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const configs=BASELINE?[{theme:'light',width:320},{theme:'light',width:1280}]:['light','dark','forced-colors'].flatMap(theme=>[320,1280].map(width=>({theme:theme==='forced-colors'?'contrast':theme,width,forced:theme==='forced-colors'})));
    for(const config of configs){
      const context=await browser.newContext({viewport:{width:config.width,height:1800},reducedMotion:'reduce',...(config.forced?{forcedColors:'active'}:{})});
      const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>report.errors.push(String(error)));
      await page.goto('http://127.0.0.1:'+server.address().port);
      await page.evaluate(({theme})=>mountDiagramReview({wcMode:'explore',wcSection:'explore',journeyView:'2d',journeyActive:true,journeyState:'river_runoff',journeyPaused:true,wc2dPaused:true,activeStage:'collection',journeyLoops:2,journeyLastPath:'runoff',journeyPaths:{runoff:2,infiltrate:1,plant:0},climTemp:15,climSolar:1,climWind:1},theme),config);
      await page.locator('.wc-process-compare').waitFor();await page.waitForTimeout(120);
      await page.locator('.wc-process-compare > summary').focus();await page.keyboard.press('Enter');
      const prefix=(config.forced?'forced-colors':config.theme)+'-'+config.width;
      if(BASELINE){for(const pair of pairs.slice(1)){await page.locator('button[data-wc-process-pair="'+pair.join('|')+'"]').click();await captureCards(page,'before-'+pair.join('-')+'-'+prefix+'.png');report.cases.push({label:'baseline '+prefix+' '+pair.join('|'),...await comparisonMetrics(page)});}await context.close();console.log('Baseline '+prefix);continue;}
      await page.locator('#wcCanvas').evaluate(el=>el._wcSetJourneyProgress(0.37));
      const initial=await comparisonMetrics(page),notes={};
      const drawings={};
      for(const pair of pairs){
        await page.locator('button[data-wc-process-pair="'+pair.join('|')+'"]').click();
        const m=await comparisonMetrics(page);assessPair(m,pair,prefix+' '+pair.join('|'));
        for(const card of m.cards)drawings[card.id]=card.states.map(state=>state.geometry);
        const note='Evidence for '+pair.join(' and ')+': compare water state, movement, and stores.';notes[pair.join('|')]=note;
        await page.locator('#wcProcessExplain').fill(note);
        if(config.theme==='light'&&pair[0]!=='evaporation')await captureCards(page,pair.join('-')+'-'+prefix+'.png');
      }
      check(JSON.stringify(drawings.precipitation[0])!==JSON.stringify(drawings.collection[0])&&JSON.stringify(drawings.precipitation[1])!==JSON.stringify(drawings.collection[1]),prefix+' falling transport and surface storage have distinct drawings');
      const returned=[];
      for(const pair of pairs){await page.locator('button[data-wc-process-pair="'+pair.join('|')+'"]').click();returned.push({key:pair.join('|'),writing:await page.locator('#wcProcessExplain').inputValue()});}
      check(returned.every(row=>row.writing===notes[row.key]),prefix+' native pair switching preserves each written explanation',returned);
      await page.locator('button[data-wc-process-pair="condensation|precipitation"]').click();
      await page.locator('input[name="wcProcessAnswer"][value="first"]').check();await page.locator('.wc-process-check').click();
      await page.waitForFunction(()=>document.activeElement.id==='wcProcessFeedbackTitle');
      const after=await comparisonMetrics(page);
      check(after.outsideState===initial.outsideState&&JSON.stringify(after.parcel)===JSON.stringify(initial.parcel),prefix+' comparison and feedback preserve the live paused parcel and other Explorer state',{before:initial.parcel,after:after.parcel});
      check(after.xp===0&&await page.locator('.wc-process-feedback').getAttribute('data-match')==='agree',prefix+' checked answer is supported by process evidence');
      await page.locator('#wcProcessFirst').focus();const focus=await page.locator('#wcProcessFirst').evaluate(el=>{const s=getComputedStyle(el);return{visible:el.matches(':focus-visible'),outline:s.outlineStyle,width:s.outlineWidth,height:el.getBoundingClientRect().height};});
      check(focus.visible&&focus.outline!=='none'&&parseFloat(focus.width)>=3&&focus.height>=44,prefix+' native comparison selector has visible keyboard focus and 44px target',focus);
      await page.addScriptTag({url:'/desktop/web-app/node_modules/axe-core/axe.min.js'});
      await audit(page,'.wc-process-compare',prefix+' comparison');
      await sceneChecks(page,prefix);
      await page.evaluate(()=>ReactDOM.unmountComponentAtNode(document.getElementById('slot')));await context.close();console.log('Checked '+prefix);
    }
    check(report.errors.length===0,'No browser runtime errors',report.errors);
    if(!BASELINE){report.finalSourceSha256=sha(fs.readFileSync(MAIN));report.finalPublicSha256=sha(fs.readFileSync(PUBLIC));check(report.sourceSha256===report.finalSourceSha256,'Frozen source stayed unchanged during QA');check(report.sourceSha256===report.finalPublicSha256,'Main and public mirror match the tested runtime');}
    report.completed=true;check(true,'Browser completes all requested comparisons and scene checks');
  }catch(error){report.completed=false;report.errors.push('Interrupted browser run: '+String(error.stack||error));check(false,'Browser completes all requested comparisons and scene checks',{error:String(error)});throw error;
  }finally{
    try{await browser.close();report.browserClosed=true;}catch(error){report.errors.push('Browser cleanup failed: '+String(error));check(false,'Owned browser closes successfully',{error:String(error)});}
    try{await new Promise(resolve=>server.close(resolve));report.serverClosed=true;}catch(error){report.errors.push('Server cleanup failed: '+String(error));check(false,'Owned server closes successfully',{error:String(error)});}
    report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(c=>c.pass).length;report.failed=report.checks.length-report.passed;report.successful=report.completed&&report.failed===0&&report.errors.length===0&&report.browserClosed&&report.serverClosed;fs.writeFileSync(path.join(OUT,BASELINE?'baseline-results.json':'results.json'),JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify({sourceSha256:report.sourceSha256,checks:report.checks.length,cases:report.cases.length,audits:report.audits.length,failures:report.failures,errors:report.errors,completed:report.completed,successful:report.successful,browserClosed:report.browserClosed,serverClosed:report.serverClosed},null,2));assert.deepEqual(report.failures,[]);assert.deepEqual(report.errors,[]);
}
main().catch(error=>{console.error(error);process.exitCode=1;server.close();});
