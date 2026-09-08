const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = process.cwd();
const out = path.join(root, 'reports/directions-resource-review-2026-09-07/after');
fs.mkdirSync(out,{recursive:true});
const assert=require('node:assert/strict');
const host = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const doc = fs.readFileSync('doc_pipeline_source.jsx', 'utf8');
const previewSource = host.slice(host.indexOf('function _alloParsePreviewMarkdown('), host.indexOf('function _alloBuildDirectionsResultAdapter('));
const preview = new Function(previewSource + '; return _alloParsePreviewMarkdown;')();
const parserStart = doc.indexOf('const parseMarkdownToHTML = (text) => {');
const parserEnd = doc.indexOf('const generateResourceHTML =', parserStart);
const full = new Function('isRtlLang','leveledTextLanguage',doc.slice(parserStart,parserEnd) + '; return parseMarkdownToHTML;')(() => false, 'English');
const helpers = host.slice(host.indexOf('function _alloNormalizeDirectionsData('), host.indexOf('let globalAudioCtx'));
const adapterSource = host.slice(host.indexOf('function _alloBuildDirectionsResultAdapter('), host.indexOf('let globalMuteEnabled'));
const adapter = new Function('_alloStudentSafeResources','sanitizeHtml',helpers + '\n' + adapterSource + '; return _alloBuildDirectionsResultAdapter;')(items => items.filter(x => x.type !== 'lesson-plan'), value => value);
const results = {};
const generatorStart = doc.indexOf('const generateResourceHTML =');
const generatorEnd = doc.indexOf('\n  };', generatorStart) + 6;
const generate = new Function('exportConfig', 'isRtlLang', 'leveledTextLanguage', 'getDefaultTitle', 't', previewSource + doc.slice(generatorStart, generatorEnd) + ';return generateResourceHTML;')({}, () => false, 'English', value => value, () => '');
results.export = {
 stringData: generate({id:'d1', type:'directions', title:'Directions', data:'Read the passage.'}, false),
 structuredData: generate({id:'d2', type:'directions', title:'Directions', data:{body:'Read the passage.', objectives:[{id:'g1', kind:'manual', label:'Explain your answer'}]}}, false)
};

const sample = '1. Read **the passage**.\n2. Answer the questions.';
results.parserComparison = { preview: preview(sample), directionsExport: generate({id:'sample',type:'directions',title:'Directions',data:sample},false) };
assert.ok(results.parserComparison.directionsExport.includes(preview(sample)));
assert.ok(results.export.stringData.includes('Read the passage.'));
assert.ok(results.export.structuredData.includes('Explain your answer'));
const resources = Array.from({length:13},(_,i)=>({id:'r'+i,type:'simplified',title:'Resource '+(i+1),data:'Reading'}));
const goals = Array.from({length:25},(_,i)=>({id:'g'+i,kind:'manual',label:'Goal '+(i+1)}));
const data = {body:'x'.repeat(20000)+' FINAL IMPORTANT INSTRUCTION', objectives:goals};
const model = adapter({item:{id:'d',type:'directions',data},history:resources,progress:{_visited:Object.fromEntries(resources.slice(0,12).map(x=>[x.id,true]))},parseMarkdownToHTML:preview,t:()=>''});
results.limits={savedResources:resources.length,visibleResources:model.viewProps.stationViews.length,omittedResource:resources[12].id,nextStation:model.viewProps.recommendationView.nextId,savedGoals:goals.length,visibleGoals:model.viewProps.goalViews.length,finalInstructionVisible:model.viewProps.bodyHtml.includes('FINAL IMPORTANT INSTRUCTION')};
assert.equal(results.limits.visibleResources,13);
assert.equal(results.limits.visibleGoals,25);
assert.equal(results.limits.nextStation,'r12');
assert.equal(results.limits.finalInstructionVisible,true);
const React = require(path.join(root,'desktop/web-app/node_modules/react'));
const {renderToStaticMarkup} = require(path.join(root,'desktop/web-app/node_modules/react-dom/server'));
const Icon = () => React.createElement('span',{'aria-hidden':true});
const ctx = {window:{React,AlloModules:{},AlloIcons:{ClipboardList:Icon,ArrowRight:Icon,CheckCircle2:Icon},sanitizeHtml:value=>value}};
vm.runInNewContext(fs.readFileSync('view_directions_result_module.js','utf8'),ctx);
vm.runInNewContext(fs.readFileSync('view_directions_composer_module.js','utf8'),ctx);
const View = ctx.window.AlloModules.DirectionsResult.DirectionsResultView;
const Composer = ctx.window.AlloModules.DirectionsComposer.DirectionsComposerView;
const mapProps={...model.viewProps,stationViews:model.viewProps.stationViews.slice(0,1),goalViews:model.viewProps.goalViews.slice(0,4),showQuestMap:true};
const mapHtml=renderToStaticMarkup(React.createElement(View,mapProps));
const props={ArrowRight:Icon,ClipboardList:Icon,Sparkles:Icon,X:Icon,_alloDirectionsGoalResources:[],_alloGoalOptionsForResource:()=>[],_alloStationStyle:()=>({}),_mbDirectionsChoiceDraftChoices:[],_mbDirectionsChoicePreviewItems:[],_mbDirectionsChoiceReady:false,_mbDirectionsChoiceStaleCount:0,addDirectionsToPack:()=>{},deriveDirectionsDraft:()=>{},directionsDeriving:false,generateUUID:()=>'',mbDirectionsDraft:{title:'Assignment Directions',body:'Read the passage.\nAnswer the questions.',objectives:goals.slice(0,10),choiceBoard:{enabled:false,choices:[]}},directionsPreviewHtml:preview('**Due:** Friday\n\n1. Read **the passage**.\n2. Explain your answer.'),mbDirectionsGoalRes:'',mbDirectionsGoalText:'',setMbDirectionsDraft:()=>{},setMbDirectionsGoalRes:()=>{},setMbDirectionsGoalText:()=>{},setShowDirectionsChoicePreview:()=>{},setShowDirectionsComposer:()=>{},showDirectionsChoicePreview:false,t:()=>''};
const composerHtml=renderToStaticMarkup(React.createElement(Composer,props));
const css=fs.readFileSync('app/static/css/'+fs.readdirSync('app/static/css').find(x=>x.endsWith('.css')),'utf8');
const {chromium} = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<html><head><style>'+css+'</style></head><body>'+composerHtml+'</body></html>');
 results.composerMobile=await page.evaluate(()=>{const d=document.querySelector('[role="dialog"]');const b=document.querySelector('[data-help-key="directions_add_pack"]');const r=d.getBoundingClientRect(),s=b.getBoundingClientRect();return {viewportHeight:innerHeight,dialogTop:r.top,dialogBottom:r.bottom,saveButtonTop:s.top,saveButtonBottom:s.bottom,dialogOverflowY:getComputedStyle(d).overflowY,overlayOverflowY:getComputedStyle(d.parentElement).overflowY,overlayPosition:getComputedStyle(d.parentElement).position};});

 assert.ok(results.composerMobile.dialogTop>=0);
 assert.ok(results.composerMobile.dialogBottom<=844);
 assert.ok(results.composerMobile.saveButtonTop>=0 && results.composerMobile.saveButtonBottom<=844);
 await page.locator('[data-directions-preview] summary').click();
 assert.equal(await page.locator('[data-directions-preview] li').count(),2);
 assert.equal(await page.locator('[data-directions-preview] strong').first().textContent(),'Due:');
 await page.screenshot({path:path.join(out,'composer-mobile.png')});
 await page.setViewportSize({width:320,height:568});
 results.composerSmall=await page.evaluate(()=>{const d=document.querySelector('[role="dialog"]');const b=document.querySelector('[data-help-key="directions_add_pack"]');const r=d.getBoundingClientRect(),s=b.getBoundingClientRect();const scroll=document.querySelector('[data-directions-scroll]');scroll.scrollTop=scroll.scrollHeight;return {top:r.top,bottom:r.bottom,saveTop:s.top,saveBottom:s.bottom,scrollTop:scroll.scrollTop,scrollHeight:scroll.scrollHeight,clientHeight:scroll.clientHeight};});
 assert.ok(results.composerSmall.top>=0 && results.composerSmall.bottom<=568);
 assert.ok(results.composerSmall.saveTop>=0 && results.composerSmall.saveBottom<=568);
 assert.ok(results.composerSmall.scrollTop>0);
 await page.screenshot({path:path.join(out,'composer-small.png')});

 await page.setViewportSize({width:1024,height:768});
 await page.setContent('<html><head><style>'+css+'</style></head><body>'+mapHtml+'</body></html>');
 results.questMap=await page.evaluate(()=>{const svg=document.querySelector('svg');const goals=[...svg.querySelectorAll('rect')].filter(x=>x.getAttribute('y')==='140');return {viewBoxWidth:svg.viewBox.baseVal.width,goalRightEdges:goals.map(x=>Number(x.getAttribute('x'))+Number(x.getAttribute('width'))),svgOverflow:getComputedStyle(svg).overflow};});
 assert.ok(results.questMap.goalRightEdges.every(x=>x<results.questMap.viewBoxWidth));
 await page.screenshot({path:path.join(out,'quest-map.png')});
 } finally {await browser.close();}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
