import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { parse } from '@babel/parser';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { buildAppStylesModule } = require('../_build_app_styles_module.js');
const stylesSource = readFileSync('app_styles_source.jsx','utf8');
const context = { window: { React }, console: { log() {} } };
vm.runInNewContext(buildAppStylesModule(stylesSource),context);
function styles(props={}) {
 const collect=node=>!node || typeof node!=='object' ? '' : node.type==='style' ? '<style>'+node.props.children+'</style>' : React.Children.toArray(node.props?.children).map(collect).join('');
 return collect(context.window.AlloModules.AppStyles.AppStyles.type(props));
}
const utilityCss=readFileSync('app/static/css/'+readdirSync('app/static/css').find(name=>/^main\.[a-z0-9]+\.css$/i.test(name)),'utf8');
let browser;
beforeAll(async()=>{browser=await chromium.launch({headless:true});},60000);
afterAll(async()=>{await browser?.close();},60000);
async function pageFor(html,props={},osReduce=false) {
 const page=await browser.newPage({viewport:{width:900,height:800},reducedMotion:osReduce?'reduce':'no-preference'});
 await page.route('**/*',route=>route.request().url()==='http://theme-motion.test/'?route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><style>'+utilityCss+'</style>'+styles(props)+'</head><body>'+html+'</body></html>'}):route.abort());
 await page.goto('http://theme-motion.test/'); return page;
}
const rgba=hex=>'rgb('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+')';
describe('header themes and motion in actual browser surfaces',()=>{
 it('keeps real chart paper, sections, icons and ink in the selected reading palette under every app theme',async()=>{
  const page=await pageFor('<div id="shell" class="theme-light"><div class="allo-docsuite"><div id="reading" data-reading-theme="default"><div id="chart"></div></div></div></div>');
  try {
   await page.addScriptTag({path:'desktop/web-app/node_modules/react/umd/react.development.js'});
   await page.addScriptTag({path:'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'});
   await page.addScriptTag({path:'anchor_charts_module.js'});
   await page.evaluate(()=>ReactDOM.createRoot(document.getElementById('chart')).render(React.createElement(window.AlloModules.AnchorChartView,{generatedContent:{id:'colors',type:'anchor-chart',data:{title:'Water cycle',sections:[{id:'one',label:'Evaporation',bullets:['Water becomes vapor']}]}},isTeacherMode:true,allowRuntimeAi:false,handleNoteUpdate:()=>{},t:(k,f)=>f||k})));
   await page.locator('.ac-section').waitFor();
   for(const app of ['light','dark','contrast']) for(const reading of ['default','warm','sepia','dark','highContrast','blue','green','rose','dyslexia','dim']) {
    await page.evaluate(({app,reading})=>{document.getElementById('shell').className='theme-'+app;document.getElementById('reading').dataset.readingTheme=reading;},{app,reading});
    const colors=await page.evaluate(()=>{
     const get=selector=>getComputedStyle(document.querySelector(selector));const reader=get('#reading');
     return {paper:get('.ac-paper').backgroundColor,section:get('.ac-section').backgroundColor,sectionImage:get('.ac-section').backgroundImage,icon:get('.ac-icon-slot').backgroundColor,title:get('.ac-title').color,body:get('.ac-bullets li span:last-child').color,bg:reader.getPropertyValue('--allo-rt-bg').trim(),surface:reader.getPropertyValue('--allo-rt-surface').trim(),fg:reader.getPropertyValue('--allo-rt-fg').trim()};
    });
    const hint=app+'/'+reading;
    if(reading==='default' && app==='light'){expect(colors.paper,hint).toBe(rgba('#fdfaf2'));continue;}
    const expected=reading!=='default'?{bg:colors.bg,surface:colors.surface,fg:colors.fg}:app==='dark'?{bg:'#0f172a',surface:'#1e293b',fg:'#e2e8f0'}:{bg:'#000000',surface:'#000000',fg:'#ffff00'};
    expect(colors.paper,hint).toBe(rgba(expected.bg));expect(colors.section,hint).toBe(rgba(expected.surface));expect(colors.icon,hint).toBe(rgba(expected.surface));expect(colors.sectionImage,hint).toBe('none');expect(colors.title,hint).toBe(rgba(expected.fg));expect(colors.body,hint).toBe(rgba(expected.fg));
   }
  }finally{await page.close();}
 },60000);
 it.each([[true,false],[false,true],[false,false]])('honors app reduction=%s and device reduction=%s for CSS motion and smooth scrolling',async(app,os)=>{
  const page=await pageFor('<style>@keyframes test-motion{to{transform:translateX(20px)}}#move,#move::before{animation:test-motion 2s infinite;transition:all 2s}#move::before{content:"moving"}#scroll{scroll-behavior:smooth;overflow:auto;height:100px}</style><div id="scroll"><div id="move">Resource</div></div>',{disableAnimations:app},os);
  try{
   const result=await page.evaluate(()=>{const el=document.getElementById('move');const motion=p=>{const s=getComputedStyle(el,p);return {name:s.animationName,duration:parseFloat(s.animationDuration),transition:parseFloat(s.transitionDuration)};};return {element:motion(null),pseudo:motion('::before'),scroll:getComputedStyle(document.getElementById('scroll')).scrollBehavior};});
   if(app||os){expect(result.scroll).toBe('auto');for(const sample of [result.element,result.pseudo]){expect(sample.name==='none'||sample.duration<=0.00001).toBe(true);expect(sample.transition).toBeLessThanOrEqual(0.00001);}}
   else{expect(result.scroll).toBe('smooth');expect(result.element.duration).toBe(2);expect(result.pseudo.duration).toBe(2);}
  }finally{await page.close();}
 });
});
function astNodes(source){const nodes=[];const visit=node=>{if(!node||typeof node!=='object')return;nodes.push(node);for(const val of Object.values(node))if(Array.isArray(val))val.forEach(visit);else if(val&&typeof val==='object')visit(val);};visit(parse(source,{sourceType:'script',plugins:['jsx']}));return nodes;}
const quiz=readFileSync('view_quiz_source.jsx','utf8'),audit=readFileSync('view_alignment_report_source.jsx','utf8'),preview=readFileSync('view_export_preview_source.jsx','utf8');
const quizFn=astNodes(quiz).find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='goToAssessmentQuestion');
const auditFn=astNodes(audit).find(n=>n.type==='FunctionExpression'&&n.params[0]?.name==='ev'&&audit.slice(n.start,n.end).includes("document.getElementById('audit-' + r.dimensionKey)"));
const previewNodes=astNodes(preview),helper=previewNodes.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='_builderPrefersReducedMotion');
const jump=previewNodes.find(n=>n.type==='VariableDeclarator'&&n.id?.name==='jumpToHeading').init.arguments[0];
describe('actual resource navigation handlers respect header motion',()=>{
 it.each([[false,false],[true,false],[false,true],[true,true]])('preserves navigation with app=%s and device=%s', (app,os)=>{
  const node={scrollIntoView:vi.fn(),focus:vi.fn(),style:{},isConnected:true};
  const doc={querySelector:()=>app?{}:null,getElementById:()=>node,createRange:()=>({selectNodeContents(){},collapse(){}}),defaultView:{getSelection:()=>({removeAllRanges(){},addRange(){}})}};
  const win={matchMedia:()=>({matches:os}),setTimeout:fn=>fn()};
  const common={document:doc,window:win,setTimeout:vi.fn(),r:{dimensionKey:'standards'}};
  vm.runInNewContext('('+audit.slice(auditFn.start,auditFn.end)+')',common)({preventDefault(){}});
  expect(node.scrollIntoView).toHaveBeenLastCalledWith({behavior:app||os?'auto':'smooth',block:'start'});
  expect(node.focus).toHaveBeenCalledWith({preventScroll:true});if(app||os)expect(node.style.boxShadow).toBeUndefined();
  vm.runInNewContext('('+quiz.slice(quizFn.start,quizFn.end)+')',{...common,assessmentData:{questions:[{},{}]},setCurrentQuestionIdx:vi.fn(),setQuizVoiceReflectionIdx:vi.fn(),setReviewOpen:vi.fn()})(1);
  expect(node.scrollIntoView).toHaveBeenLastCalledWith({behavior:app||os?'auto':'smooth',block:'start'});
  const reduce=vm.runInNewContext('('+preview.slice(helper.start,helper.end)+')',common);
  vm.runInNewContext('('+preview.slice(jump.start,jump.end)+')',{...common,_builderPrefersReducedMotion:reduce,exportPreviewRef:{current:{contentDocument:doc,focus(){}}},setActiveHeadingIndex:vi.fn(),refreshFormattingState:vi.fn()})({node,index:1});
  expect(node.scrollIntoView).toHaveBeenLastCalledWith({behavior:app||os?'instant':'smooth',block:'center'});
 });
});
