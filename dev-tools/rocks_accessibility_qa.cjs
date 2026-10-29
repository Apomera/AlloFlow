// Tool-level accessibility regression audit. Run from the repository root:
// node dev-tools/rocks_accessibility_qa.cjs --output=tmp/rocks-accessibility-audit
// Optional --only=flows|matrix or --quick (normal 320px matrix plus flows).
// Add --environments to keep forced-color/reduced-motion checks with --quick.
// Bound follow-up work with --view-filter=PATTERN and --flow-filter=PATTERN.
// --variants=baseline,text,spacing,forced-colors,reduced-motion selects matrix passes.
// --strict also fails on raw experimental Label in Name findings.
// Requires existing Playwright Chromium, axe-core, React UMD and app/static/css build.
// ROCKS_QA_BROWSER may name an installed Chromium executable.
// This is not a WCAG conformance certification or a full-host/screen-reader test.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {start,audit,layout,settle,cssFile}=require('./rocks_accessibility_harness.cjs');
const {views}=require('./rocks_accessibility_views.cjs');
const {runFlows}=require('./rocks_accessibility_flows.cjs');
const {runEnvironments}=require('./rocks_accessibility_environments.cjs');
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,...v]=a.replace(/^--/,'').split('=');return[k,v.length?v.join('='):true];}));
const selectedViews=args['view-filter']?views.filter(view=>new RegExp(args['view-filter'],'i').test(view.name)):views;
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function metrics(page){return page.evaluate(()=>{
 const visible=e=>!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const controls=[...document.querySelectorAll('button,input,select,textarea,a[href],summary,[role="button"],[tabindex="0"]')].filter(visible);
 const targets=controls.filter(e=>!e.disabled&&!e.classList.contains('rk-skip-link')).map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,id:e.id,attributes:[...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]),name:(e.getAttribute('aria-label')||e.innerText||e.textContent||'').slice(0,100),width:r.width,height:r.height};});
 const clipped=[...document.querySelectorAll('#root *')].filter(visible).filter(e=>!(e instanceof SVGElement)&&e.scrollHeight>e.clientHeight+2&&e.clientHeight>2&&getComputedStyle(e).overflowY==='hidden').map(e=>({tag:e.tagName,cls:e.className,id:e.id,text:e.textContent.slice(0,100),clientHeight:e.clientHeight,scrollHeight:e.scrollHeight}));
 return {smallTargetsForReview:targets.filter(t=>t.width<24||t.height<24),targetCount:targets.length,clipped};
});}
async function enlargeText(page){await page.evaluate(()=>{const entries=[...document.querySelectorAll('#root *')].filter(e=>!(e instanceof SVGElement)&&([...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||['INPUT','SELECT','TEXTAREA'].includes(e.tagName))).map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);entries.forEach(([e,size])=>e.style.fontSize=size*2+'px');});}
async function run(){
 const h=await start({output:args.output}),p=h.page,report={sourceHash:hash('stem_lab/stem_tool_rocks.js'),cssFile,cssHash:hash(cssFile),browserVersion:h.browser.version(),axeVersion:require('axe-core').version,rules:{tags:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'],explicitlyEnabled:['label-content-name-mismatch','target-size']},views:[],errors:h.errors,limitations:[
  'Isolated React tool with real compiled CSS. No full application host, third-party AI, loaded 3D viewer, or real assistive technology validation.',
  'Axe reports cannot establish WCAG conformance. SVG contrast, reading order, meaningful labels, status announcements, focus obscuration, and target-spacing exceptions need human review.',
  'Label in Name is an experimental axe rule and may flag decorative icons or supplemental card descriptions. Preserve and review its findings; do not silently suppress them.',
  'Text resizing doubles computed HTML text sizes; it is not native browser text-only zoom. SVG labels are additionally checked visually, not enlarged by this simulation.',
  'Finite entry animations are finished and infinite animations paused before axe and screenshots to avoid transient-opacity contrast artifacts.',
  'Small target measurements are review candidates. Label wrappers, spacing, inline text and equivalent-control exceptions must be assessed before calling them WCAG failures.'
 ]};
 const save=()=>fs.writeFileSync(path.join(h.output,'report.json'),JSON.stringify(report,null,2));
 try{
  if(args.only!=='matrix')report.flows=await runFlows(h,{filter:args['flow-filter']});
  if(args.only!=='flows'){
   const variants=args.variants?String(args.variants).split(','):args.quick?['baseline']:['baseline','desktop','text','spacing'];
   if(variants.some(v=>!['baseline','desktop','text','spacing','forced-colors','reduced-motion'].includes(v)))throw new Error('Unsupported matrix variant.');
   if(!selectedViews.length)throw new Error('The view filter selected no states.');
   for(const variant of variants)for(const view of selectedViews){
    await p.emulateMedia({forcedColors:variant==='forced-colors'?'active':'none',reducedMotion:variant==='reduced-motion'?'reduce':'no-preference'});
    await p.reload();await p.waitForFunction(()=>typeof window.__setState==='function');
    const width=['desktop','text'].includes(variant)?1280:320;
    await p.setViewportSize({width,height:1000});
    await p.evaluate(state=>window.__setState({rocks:state,rockCycle:{}}),view.state);
    await p.locator('[data-rocks-mode="'+view.state.mode+'"][aria-pressed=true]').waitFor();
    for(const selector of view.expand||[])await p.locator(selector).locator('summary').first().click();
    await p.waitForTimeout(100);await settle(p);
    if(variant==='text')await enlargeText(p);
    if(variant==='spacing')await p.addStyleTag({content:'#root *:not(svg):not(svg *){line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}#root p{margin-bottom:2em!important}'});
    const row={variant,name:view.name,layout:await layout(p),metrics:await metrics(p)};
    if(variant==='baseline')row.axe=await audit(p,'#root');
    await p.evaluate(()=>window.scrollTo(0,0));
    await (view.screenshotSelector?p.locator(view.screenshotSelector):p).screenshot({path:path.join(h.output,variant+'-'+view.name+'.png'),animations:'disabled'});
    report.views.push(row);save();
    console.log(JSON.stringify({variant,view:view.name,width:row.layout.width,axe:row.axe?.map(v=>[v.id,v.nodes.length]),clipped:row.metrics.clipped.length}));
   }
  }
  if((!args.quick||args.environments)&&args.only!=='matrix')report.environments=await runEnvironments(h);
  report.completed=true;report.finalSourceHash=hash('stem_lab/stem_tool_rocks.js');report.sourceChanged=report.sourceHash!==report.finalSourceHash;
  const axeFindings=report.views.flatMap(v=>v.axe||[]).concat(Object.values(report.flows?.axe||{}).flat());
  const labelNodes=axeFindings.filter(a=>a.id==='label-content-name-mismatch').flatMap(a=>a.nodes);
  const coreNodes=axeFindings.filter(a=>a.id!=='label-content-name-mismatch').reduce((sum,a)=>sum+a.nodes.length,0);
  report.summary={states:selectedViews.length,matrixChecks:report.views.length,flowChecks:report.flows?.checks.length||0,flowFailures:report.flows?.failures.length||0,axeViolationNodes:coreNodes+labelNodes.length,coreRuleViolationNodes:coreNodes,experimentalLabelReviewNodes:labelNodes.length,symbolPunctuationOnlyNodes:labelNodes.filter(n=>n.labelReview?.symbolPunctuationOnly).length,unresolvedLabelReviewNodes:labelNodes.filter(n=>!n.labelReview?.symbolPunctuationOnly).length,strict:!!args.strict,overflow:report.views.filter(v=>v.layout.width>v.layout.viewport+1).map(v=>v.variant+':'+v.name),errors:h.errors.length};
  // Core violations and unmatched visible-name strings are regression failures.
  // --strict additionally fails on raw experimental symbol/punctuation findings.
  if(report.sourceChanged||report.summary.flowFailures||report.summary.overflow.length||report.environments?.failures.length||h.errors.length||coreNodes||report.summary.unresolvedLabelReviewNodes||(args.strict&&labelNodes.length))process.exitCode=1;
  console.log(JSON.stringify(report.summary));
 }catch(error){report.error=error.stack;process.exitCode=1;console.error(error);}finally{save();await h.stop();}
}
run();
