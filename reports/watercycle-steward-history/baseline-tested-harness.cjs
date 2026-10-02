'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/watercycle-steward-history');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
const mode = process.argv.includes('--baseline') ? 'baseline' : process.argv.includes('--final') ? 'browser' : 'browser-preflight';
const baselineSha = '42eae634d0027b819ac0e5368801447780290c3d70e5da15aa402ff84d94314c';
const expected = process.argv.find(arg => /^[a-f0-9]{64}$/.test(arg));
const source = mode === 'baseline' ? read('reports/watercycle-steward-history/baseline-runtime.js') : mode === 'browser-preflight' ? read('reports/watercycle-steward-history/browser-preflight-runtime.js') : read('stem_lab/stem_tool_watercycle.js');
if (mode === 'baseline' && hash(source) !== baselineSha) throw Error('Baseline buffer mismatch');
if (expected && hash(source) !== expected) throw Error('Expected source mismatch: ' + hash(source));
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, mode + '-tested-runtime.js'), source);
fs.writeFileSync(path.join(out, mode + '-tested-harness.cjs'), fs.readFileSync(__filename));
function campaignApi(sourceText) {
  const names = ['wcWatershedCopy','localizeWatershedComponents','wcStewardCopy','applyStewardCopy','defaultStewardState','watershedComponents','getWatershedComponent','stewardRng','stewardClamp','startStewardCampaign','applyStewardTech','endStewardYear','advanceFromStewardReview'];
  const variables = ['MAINE_WATERSHED_COMPONENTS','STEWARD_TECHNIQUES','STEWARD_EVENTS','_wcById','STEWARD_FEEDBACK_RULES','STEWARD_CASCADE_HINTS','STEWARD_DIFFICULTIES','_wcT','_wcLocalizedCache','_wcLocalizedFor'];
  const found = new Map();
  traverse(parser.parse(sourceText, { sourceType: 'script' }), {
    FunctionDeclaration(p) { if (names.includes(p.node.id.name)) found.set(p.node.id.name, { start: p.node.start, text: sourceText.slice(p.node.start, p.node.end) }); },
    VariableDeclarator(p) { if (variables.includes(p.node.id.name)) found.set(p.node.id.name, { start: p.node.start, text: 'var ' + sourceText.slice(p.node.start, p.node.end) + ';' }); }
  });
  for (const name of names.concat(variables)) if (!found.has(name)) throw Error('Missing exact campaign declaration: ' + name);
  const body = [...found.values()].sort((a,b) => a.start - b.start).map(entry => entry.text).join('\n');
  return vm.runInNewContext('(function(){ const window={StemLab:{findById:(items,id)=>items.find(item=>item.id===id)}};const t=(key,fallback)=>fallback==null?key:fallback;const addToast=null,announceToSR=null,awardStemXP=null;const setTimeout=()=>{},checkWaterCycleChallenges=()=>{};let steward,d={};const setSteward=patch=>{steward=Object.assign({},steward,patch);};const upd=(key,value)=>{d[key]=value;};' + body + '\napplyStewardCopy(t);const copy=value=>JSON.parse(JSON.stringify(value));return {components:copy(watershedComponents()),techniques:copy(STEWARD_TECHNIQUES),start:opts=>{steward=defaultStewardState();startStewardCampaign(opts);return copy(steward);},apply:(state,tech,target)=>{steward=copy(state);applyStewardTech(tech,target);return copy(steward);},endYear:state=>{steward=copy(state);endStewardYear();return copy(steward);},continue:state=>{steward=copy(state);advanceFromStewardReview();return copy(steward);}};})()', {}, { timeout: 30000 });
}
const api = campaignApi(source.toString('utf8'));
let state = api.start({ seed: 'history-browser-2026', difficulty: 'coordinator' });
let firstReview, planning, review;
for (let year = 0; year < 10; year++) {
  state = api.apply(state, 'damRemoval', 'riverMainstem');
  state = api.endYear(state);
  if (year === 0) firstReview = JSON.parse(JSON.stringify(state));
  review = JSON.parse(JSON.stringify(state));
  state = api.continue(state);
  if (year === 0) planning = JSON.parse(JSON.stringify(state));
}
const fixture = { wcMode: 'steward', steward: state, sentinel: { evidence: ['keep'], prediction: 'keep this prediction' } };
fs.writeFileSync(path.join(out, mode + '-campaign-fixtures.json'), JSON.stringify({ fixture, review, firstReview, planning, components: api.components }, null, 2));
const report = { mode, pid: process.pid, startedAt: new Date().toISOString(), sourceSha256: hash(source), sourceBytes: source.length, publicSha256: hash(read('desktop/web-app/public/stem_lab/stem_tool_watercycle.js')), harnessSha256: hash(fs.readFileSync(__filename)), checks: [], nativeActions: [], audits: [], captures: [], errors: [], consoleErrors: [], cases: [], contrastReadings: [], completed: false, successful: false, resourcesClosed: false, browserClosed:false, serverUsed:false, serverClosed:true, serverClosedAt:null };
const save = () => fs.writeFileSync(path.join(out, mode + '-results.json'), JSON.stringify(report, null, 2));
const check = (label, condition, details) => { report.checks.push({ label, passed: !!condition, details }); if (!condition) report.errors.push(label); save(); };
const screenshot = async (page, locator, name) => {
  const target = path.join(out, mode + '-' + name + '.png');
  await locator.screenshot({ path: target });
  const bytes = fs.readFileSync(target);
  report.captures.push({ path: path.basename(target), sha256: hash(bytes), bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sourceSha256: report.sourceSha256, capturedAt: new Date().toISOString() }); save();
};
const variants = mode === 'baseline' ? [{name:'desktop',width:1280},{name:'phone320',width:320},{name:'phone390',width:390},{name:'dark',width:1280,dark:true},{name:'host390',width:1280,host:390},{name:'forced-phone',width:320,forced:true},{name:'forced-dark',width:320,dark:true,forced:true}] : [{name:'phone320',width:320},{name:'dark',width:1280,dark:true},{name:'forced-dark',width:320,dark:true,forced:true},{name:'host390',width:1280,host:390},{name:'phone390',width:390},{name:'desktop',width:1280},{name:'forced-phone',width:320,forced:true}];
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value==='object' ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])) : value;
const same = (a,b) => JSON.stringify(stable(a))===JSON.stringify(stable(b));
const rounded = value => { const next=Math.round(Math.abs(value)*10)/10*(value<0?-1:1);return next===0?0:next; };
const score = value => typeof value==='number'&&Number.isFinite(value)?String(rounded(value)):'Not recorded';
const signed = value => typeof value==='number'&&Number.isFinite(value)?(rounded(value)>0?'+':'')+score(value):'Not recorded';
const metricSpecs = [{key:'quality',shape:'circle',dash:'',label:'Quality'},{key:'connectivity',shape:'square',dash:'8 4',label:'Connectivity'},{key:'support',shape:'diamond',dash:'2 4',label:'Community support'}];
const raw = (list,id,metric) => {const match=(list||[]).find(item=>item.id===id);return match&&typeof match[metric]==='number'?match[metric]:null;};
const clone = value => JSON.parse(JSON.stringify(value));
async function contrastEvidence(region) {
  return region.evaluate(node=>{
    function parse(value){const match=value.match(/rgba?\(([^)]+)\)/);return match?match[1].split(',').map(Number):null;}
    function mix(top,bottom){const alpha=top[3]===undefined?1:top[3];return top.slice(0,3).map((value,index)=>value*alpha+bottom[index]*(1-alpha));}
    function luminance(rgb){return rgb.map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;}).reduce((total,value,index)=>total+value*[.2126,.7152,.0722][index],0);}
    function background(element){const ancestry=[];for(let p=element;p;p=p.parentElement)ancestry.push(p);let result=[255,255,255];for(const p of ancestry.reverse()){const color=parse(getComputedStyle(p).backgroundColor);if(color)result=mix(color,result);}return result;}
    const results=[],scope=node.getBoundingClientRect();
    for(const element of [node,...node.querySelectorAll('*')]){
      if(element.closest('svg')||['STYLE','SCRIPT','OPTION'].includes(element.tagName))continue;
      const style=getComputedStyle(element);if(style.display==='none'||style.visibility==='hidden'||!element.getClientRects().length)continue;
      const direct=[...element.childNodes].filter(part=>part.nodeType===Node.TEXT_NODE&&part.textContent.trim());
      if(!direct.length&&element.tagName!=='SELECT')continue;
      const range=document.createRange();range.selectNodeContents(element);const box=range.getBoundingClientRect();if(!box.width||!box.height)continue;
      const bg=background(element),color=parse(style.color);if(!color)continue;const foreground=mix(color,bg),levels=[luminance(foreground),luminance(bg)],ratio=(Math.max(...levels)+.05)/(Math.min(...levels)+.05);
      const selector=element.parentElement?.classList.contains('wc-history-x-axis')?'.wc-history-x-axis > span:nth-child('+([...element.parentElement.children].indexOf(element)+1)+')':null;
      results.push({selector,id:element.id,classes:element.className,text:(element.tagName==='SELECT'?element.selectedOptions[0].textContent:direct.map(part=>part.textContent).join('')).trim(),foreground:style.color,background:bg,ratio,fontSize:parseFloat(style.fontSize),fontWeight:style.fontWeight,html:element.outerHTML.slice(0,500),x:box.x,y:box.y,width:box.width,height:box.height,scopeBounds:{x:scope.x,y:scope.y,width:scope.width,height:scope.height},clipped:box.left<scope.left-1||box.right>scope.right+1||box.top<scope.top-1||box.bottom>scope.bottom+1});
    }
    return results;
  });
}
let browser;
(async () => {
  try {
    browser = await chromium.launch({ headless: true }); report.browserLaunchedAt = new Date().toISOString(); save();
    const page = await browser.newPage({ viewport: { width:1280, height:1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => { report.errors.push(String(error)); save(); });
    page.on('console', message => { if (message.type() === 'error') { report.consoleErrors.push(message.text()); save(); } });
    await page.setContent('<!doctype html><html lang="en"><head><title>Steward history browser QA</title></head><body style="margin:0;font-family:system-ui;background:#eef2ed"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css').toString('utf8') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js']) await page.addScriptTag({ content: read(file).toString('utf8') });
    await page.addScriptTag({ content: source.toString('utf8') });
    await page.addScriptTag({ content: read('desktop/web-app/node_modules/axe-core/axe.min.js').toString('utf8') });
    await page.evaluate(() => {
      const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden':true }) });
      window.historyQARewards = [];
      window.mountHistory = function(seed, variant) {
        function Host() {
          const [data,setData] = React.useState({ waterCycle:seed });
          window.historyQAData = data.waterCycle;
          window.historyQASet = setData;
          const noop = () => {};
          return StemLab._registry.waterCycle.render({ React, toolData:data, setToolData:setData, isDark:!!variant.dark, isContrast:false, gradeBand:'6-8', gradeLevel:'7th Grade', icons:Icons, setStemLabTool:noop, setStemLabTab:noop, setToolSnapshots:noop, toolSnapshots:[], addToast:noop, announceToSR:noop, awardXP: (...args) => historyQARewards.push(args), getXP:()=>0, beep:noop, celebrate:noop, canvasNarrate:noop, canvasA11yDesc:noop, a11yClick:f=>({onClick:f}), t:(key,fallback)=>fallback==null?key:fallback, props:{}, srOnly:{}, callGemini:null });
        }
        document.documentElement.classList.toggle('dark',!!variant.dark);
        document.body.style.background = variant.dark ? '#081b21' : '#eef2ed';
        const slot = document.getElementById('slot');
        slot.style.width = variant.host ? variant.host+'px' : '';
        slot.style.boxSizing = 'border-box';
        ReactDOM.unmountComponentAtNode(slot);
        ReactDOM.render(React.createElement(Host),slot);
      };
    });
    for (const variant of variants) {
      await page.setViewportSize({ width:variant.width,height:1000 });
      await page.emulateMedia({ forcedColors:variant.forced?'active':'none', reducedMotion:'reduce' });
      await page.evaluate(({fixture,variant}) => mountHistory(fixture,variant), {fixture,variant});
      const region = mode === 'baseline' ? page.getByLabel('Year-by-year quality trend chart by watershed component').locator('..') : page.locator('.wc-steward-history');
      await region.waitFor({state:'visible'});
      report.cases.push({name:variant.name,phase:state.phase});
      if (mode !== 'baseline') {
        await page.locator('#wcStewardHistoryInvestigation > summary').click(); report.nativeActions.push({action:'open investigation',variant:variant.name});
        await page.locator('#wcStewardHistoryTable').locator('..').locator('summary').click(); report.nativeActions.push({action:'open table',variant:variant.name});
        const geometry = await region.evaluate(node => {
          const bounds=node.getBoundingClientRect();
          return {width:bounds.width,overflow:node.scrollWidth>node.clientWidth+1,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,controls:[...node.querySelectorAll('select,button,summary')].map(el=>({tag:el.tagName,text:el.textContent.trim(),id:el.id,height:el.getBoundingClientRect().height,style:getComputedStyle(el).fontSize})),axes:[...node.querySelectorAll('.wc-history-x-axis span,.wc-history-y-axis span')].map(el=>({text:el.textContent,size:getComputedStyle(el).fontSize,box:el.getBoundingClientRect().toJSON()})),svgText:node.querySelectorAll('svg text').length};
        });
        check(variant.name+' scoped geometry fits',!geometry.overflow,geometry);
        check(variant.name+' controls at least44px',geometry.controls.every(control=>control.height>=43.99),geometry.controls);
        check(variant.name+' axes have fixed readable text',geometry.axes.every(axis=>parseFloat(axis.size)>=12)&&geometry.svgText===0,geometry.axes);
        const axe = await region.evaluate(async node => {
          const result=await axe.run(node,{rules:{region:{enabled:false}}});
          return {violations:result.violations.map(item=>({id:item.id,impact:item.impact,nodes:item.nodes.map(node=>({target:node.target,html:node.html,summary:node.failureSummary}))})),incomplete:result.incomplete.map(item=>({id:item.id,impact:item.impact,nodes:item.nodes.map(node=>({target:node.target,html:node.html,summary:node.failureSummary,any:node.any,all:node.all,none:node.none}))}))};
        });
        const contrast = await contrastEvidence(region);
        report.contrastReadings.push({variant:variant.name,readings:contrast});
        check(variant.name+' direct text contrast reaches4.5',contrast.length>0&&contrast.every(item=>item.ratio>=4.5),contrast.filter(item=>item.ratio<4.5));
        const incompleteTargets=axe.incomplete.flatMap(item=>item.nodes.map(node=>({rule:item.id,target:node.target,html:node.html})));
        const resolved=incompleteTargets.every(item=>item.rule==='color-contrast'&&item.target.length===1&&/^\.wc-history-x-axis > span:nth-child\(\d+\)$/.test(item.target[0]));
        const axisReadings=contrast.filter(item=>item.selector);
        report.audits.push({variant:variant.name,selector:'.wc-steward-history',...axe,incompleteResolution:{resolved:resolved&&contrast.every(item=>item.ratio>=4.5)&&axisReadings.every(item=>!item.clipped),method:'Computed inherited foreground and composed opaque background contrast for actual text, including zero-width year-label elements; positive text Range bounds and scoped clipping measurements retained for each exact axis target.',axisReadings}});
        check(variant.name+' all incomplete findings have retained contrast resolution',resolved&&contrast.every(item=>item.ratio>=4.5),incompleteTargets);
        check(variant.name+' scoped axe has zero violations',axe.violations.length===0,axe.violations);
      }
      await screenshot(page,region,variant.name);
    }
    if(mode==='browser') {
      const mount = async (seed,variant={name:'interaction',width:1280})=>{
        await page.setViewportSize({width:variant.width,height:1000});
        await page.emulateMedia({forcedColors:variant.forced?'active':'none',reducedMotion:'reduce'});
        await page.evaluate(({seed,variant})=>mountHistory(seed,variant),{seed,variant});
      };
      const data = ()=>page.evaluate(()=>JSON.parse(JSON.stringify(historyQAData)));
      const preservation = async (label,before)=>{
        const after=await data();const left=clone(before),right=clone(after);delete left.wcStewardHistory;delete right.wcStewardHistory;
        check(label+' retains full non-history tool data',same(left,right),{beforeSha256:hash(JSON.stringify(stable(left))),afterSha256:hash(JSON.stringify(stable(right)))});
        check(label+' retains exact full campaign state',same(before.steward,after.steward),{hours:after.steward.hoursLeft,year:after.steward.year,phase:after.steward.phase,logSha256:hash(JSON.stringify(after.steward.yearLog))});
        check(label+' awards no rewards',(await page.evaluate(()=>historyQARewards.length))===0);
      };
      const select = async (id,value)=>{await page.locator('#'+id).selectOption(String(value));report.nativeActions.push({action:'select',id,value});};
      const open = async (selector)=>{if(await page.locator(selector).getAttribute('open')===null){await page.locator(selector+' > summary').click();report.nativeActions.push({action:'open disclosure',selector});}};
      await mount(fixture);const initial=await data();
      await open('.wc-history-values');
      for(const component of api.components){
        await select('wcStewardHistoryComponent',component.id);
        for(const metric of metricSpecs){
          await select('wcStewardHistoryMetric',metric.key);
          const values=fixture.steward.yearLog.map(record=>raw(record.post,component.id,metric.key));
          const table=await page.locator('#wcStewardHistoryTable tbody tr').evaluateAll(rows=>rows.map(row=>[...row.children].map(cell=>cell.textContent)));
          check(component.id+' '+metric.key+' exact saved table',table.every((row,index)=>row[0]==='Year '+(index+1)&&row[1]===score(values[index])&&row[2]===signed(index?values[index]-values[index-1]:null)),table);
          check(component.id+' '+metric.key+' whole component name',await page.locator('.wc-history-chart figcaption').innerText()===component.name+' · '+metric.label);
          const points=await page.locator('.wc-history-plot .wc-history-point').evaluateAll(nodes=>nodes.map(node=>({year:Number(node.dataset.historyPointYear),shape:node.dataset.shape,left:parseFloat(node.style.left),top:parseFloat(node.style.top)})));
          check(component.id+' '+metric.key+' plot positions within CSS serialization precision and distinct shape',points.length===10&&points.every(point=>point.shape===metric.shape&&Math.abs(point.left-(point.year-1)/9*100)<1e-4&&Math.abs(point.top-(100-values[point.year-1]))<1e-4),{percentagePointTolerance:1e-4,points});
          check(component.id+' '+metric.key+' distinct line pattern',(await page.locator('.wc-history-series').first().getAttribute('stroke-dasharray'))===metric.dash);
          for(let year=1;year<=10;year++){
            await select('wcStewardHistoryYear',year);
            const shown=await page.locator('[data-history-selected-score]').innerText();
            const delta=await page.locator('[data-history-net-change]').innerText();
            check(component.id+' '+metric.key+' year'+year+' exact score',shown.replace(/\s*\/100$/,'')===score(values[year-1]),shown);
            check(component.id+' '+metric.key+' year'+year+' exact signed difference',delta.replace(/\s*points$/,'')===signed(year>1?values[year-1]-values[year-2]:null),delta);
            check(component.id+' '+metric.key+' year'+year+' selected point/table',await page.locator('.wc-history-plot [data-selected=true]').getAttribute('data-history-point-year')===String(year)&&await page.locator('#wcStewardHistoryTable tr[data-selected=true]').getAttribute('data-history-table-year')===String(year));
            report.cases.push({kind:'exact saved reading',component:component.id,metric:metric.key,year});
          }
          await preservation(component.id+' '+metric.key+' inspection',initial);
        }
      }
      for(const id of ['wcStewardHistoryComponent','wcStewardHistoryMetric','wcStewardHistoryYear']){
        await page.locator('#'+id).focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');report.nativeActions.push({action:'keyboard select',id,keys:['Home','ArrowDown']});
        check(id+' retains native keyboard focus',await page.evaluate(id=>document.activeElement.id===id,id));
        const focus=await page.locator('#'+id).evaluate(node=>({style:getComputedStyle(node).outlineStyle,width:parseFloat(getComputedStyle(node).outlineWidth)}));
        check(id+' has visible focus',focus.style!=='none'&&focus.width>=2,focus);
      }
      await preservation('Keyboard inspection',initial);
      await mount(fixture);await select('wcStewardHistoryYear',1);await open('#wcStewardHistoryInvestigation');
      const first=fixture.steward.yearLog[0],component='riverMainstem',metric='quality';
      const ordered=[raw(first.yearStart,component,metric),raw(first.pre,component,metric),...['drift','event','difficulty','cascade'].map(id=>raw(first.stages.find(stage=>stage.id===id).components,component,metric))];
      const stepIds=['start','actions','drift','event','difficulty','cascade'];
      const actualRows=await page.locator('.wc-history-stages li').evaluateAll(rows=>rows.map(row=>({id:row.dataset.historyStep,text:row.querySelector('.wc-history-step-score').textContent})));
      check('Real campaign step scores and raw signed deltas match saved record',actualRows.every((row,index)=>row.id===stepIds[index]&&row.text===score(ordered[index])+(index?signed(ordered[index]-ordered[index-1])+' points':'Starting score')),actualRows);
      const deltas=ordered.slice(1).map((value,index)=>rounded(value-ordered[index])),largest=Math.max(...deltas.map(Math.abs)),winners=stepIds.slice(1).filter((id,index)=>Math.abs(deltas[index])===largest),wrong=stepIds.slice(1).find((id,index)=>Math.abs(deltas[index])<largest);
      const questionBefore=await data();
      if(wrong){await page.locator('[data-history-answer="'+wrong+'"]').click();report.nativeActions.push({action:'answer wrong',id:wrong});await page.waitForFunction(()=>document.activeElement.id==='wcStewardHistoryFeedback');check('Wrong real-record answer invites reconsideration',await page.locator('.wc-history-feedback').getAttribute('data-history-result')==='retry');}
      await page.locator('[data-history-answer="'+winners[0]+'"]').click();report.nativeActions.push({action:'answer supported',id:winners[0]});await page.waitForFunction(()=>document.activeElement.id==='wcStewardHistoryFeedback');
      check('Supported real-record answer focuses feedback',await page.locator('.wc-history-feedback').getAttribute('data-history-result')==='supported');
      await screenshot(page,page.locator('.wc-steward-history'),'answered-real-record');
      await page.setViewportSize({width:320,height:1000});
      await screenshot(page,page.locator('.wc-steward-history'),'answered-real-record-phone320');
      const readyButtons=await page.locator('[data-history-answer]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.historyAnswer,height:node.getBoundingClientRect().height,fontSize:parseFloat(getComputedStyle(node).fontSize)})));
      check('Ready question answer targets fit phone and remain44px',readyButtons.length===5&&readyButtons.every(item=>item.height>=44&&item.fontSize>=14),readyButtons);
      const readyContrast=await contrastEvidence(page.locator('.wc-steward-history'));
      check('Ready feedback/button text contrast reaches4.5',readyContrast.every(item=>item.ratio>=4.5),readyContrast.filter(item=>item.ratio<4.5));
      report.contrastReadings.push({variant:'answered-real-record-phone320',readings:readyContrast});
      await page.setViewportSize({width:1280,height:1000});
      await preservation('Real record answers are unscored',questionBefore);
      const answered=await data();
      await select('wcStewardHistoryMetric','support');await open('#wcStewardHistoryInvestigation');check('Changing metric clears prior answer',!(await data()).wcStewardHistory.answer);
      await screenshot(page,page.locator('.wc-steward-history'),'support-year1');
      await select('wcStewardHistoryMetric','connectivity');await open('#wcStewardHistoryInvestigation');await screenshot(page,page.locator('.wc-steward-history'),'connectivity-year1');
      const scopeSeed=clone(answered);scopeSeed.steward.seed+='::another campaign';await mount(scopeSeed);await open('#wcStewardHistoryInvestigation');check('Changing campaign seed invalidates prior answer',await page.locator('.wc-history-feedback').getAttribute('data-history-result')==='waiting');
      const scopeRaw=clone(answered);scopeRaw.steward.yearLog[0].yearStart.find(item=>item.id===component).quality+=.001;await mount(scopeRaw);await open('#wcStewardHistoryInvestigation');check('Unrounded saved-value change invalidates prior answer',await page.locator('.wc-history-feedback').getAttribute('data-history-result')==='waiting');
      function stepFixture(values){const derived=clone(fixture),record=clone(first);record.year=1;record.yearStart.find(item=>item.id===component).quality=values[0];record.pre.find(item=>item.id===component).quality=values[1];for(let index=1;index<6;index++)record.stages.find(stage=>stage.id===stepIds[index]).components.find(item=>item.id===component).quality=values[index];record.post.find(item=>item.id===component).quality=values[5];derived.steward.yearLog=[record];derived.wcStewardHistory={component,metric,year:1};return derived;}
      const tied=stepFixture([40,45,40,42,42,43]);await mount(tied);await open('#wcStewardHistoryInvestigation');const tiedBefore=await data();
      for(const answer of ['actions','drift']){await page.locator('[data-history-answer="'+answer+'"]').click();report.nativeActions.push({action:'answer tied',id:answer});check('Tied '+answer+' signed-change choice accepted',await page.locator('.wc-history-feedback').getAttribute('data-history-result')==='supported');}
      await preservation('Tied reasoning remains unscored',tiedBefore);
      await screenshot(page,page.locator('.wc-steward-history'),'tied-record');
      for(const [name,values] of [['zero',[50,50,50,50,50,50]],['subprecision',[50,50.04,50.04,50.04,50.04,50.04]]]){const seed=stepFixture(values);await mount(seed);await open('#wcStewardHistoryInvestigation');check(name+' displayed-zero explanation',await page.locator('#wcStewardHistoryInvestigation').innerText().then(text=>text.includes('No step has a nonzero displayed change.'))&&await page.locator('[data-history-answer]').count()===0);report.cases.push({kind:'derived fixture',name});}
      const legacy=stepFixture([40,45,40,42,42,43]);delete legacy.steward.yearLog[0].yearStart;delete legacy.steward.yearLog[0].stages;await mount(legacy);await open('#wcStewardHistoryInvestigation');check('Legacy incomplete record retains endpoint and explains missing steps',(await page.locator('[data-history-selected-score]').innerText()).includes('43')&&(await page.locator('#wcStewardHistoryInvestigation').innerText()).includes('complete, consistent step record')&&await page.locator('[data-history-answer]').count()===0);await screenshot(page,page.locator('.wc-steward-history'),'legacy-record');
      const gap=clone(fixture);gap.steward.yearLog[4].post=gap.steward.yearLog[4].post.filter(item=>item.id!==component);gap.wcStewardHistory={component,metric,year:5};await mount(gap);await open('.wc-history-values');check('Missing component value is not rendered as zero',await page.locator('.wc-history-plot [data-history-point-year="5"]').count()===0&&(await page.locator('[data-history-selected-score]').innerText())==='Not recorded'&&(await page.locator('[data-history-table-year="5"]').innerText()).includes('Not recorded')&&await page.locator('.wc-history-series').count()===2);await screenshot(page,page.locator('.wc-steward-history'),'missing-component-gap');
      const missingYear=clone(fixture);missingYear.steward.yearLog=missingYear.steward.yearLog.filter(record=>record.year!==5);missingYear.wcStewardHistory={component,metric,year:6};await mount(missingYear);check('Missing year gap and nonconsecutive comparison are explicit',await page.locator('#wcStewardHistoryYear option').count()===9&&await page.locator('.wc-history-series').count()===2&&(await page.locator('.wc-steward-history').innerText()).includes('spans years 4 to 6'));
      const duplicate=clone(fixture);duplicate.steward.yearLog.push(clone(duplicate.steward.yearLog[2]));await mount(duplicate);check('Duplicate-year evidence is unavailable',await page.locator('#wcStewardHistoryYear option[value="3"]').count()===0&&await page.locator('.wc-history-plot [data-history-point-year="3"]').count()===0);
      for(const [phase,steward] of [['review',firstReview],['planning',planning]]){await mount({wcMode:'steward',steward:clone(steward),sentinel:clone(fixture.sentinel)});const phaseBefore=await data();await open('.wc-history-review');check(phase+' completed-history access opens native disclosure',await page.locator('.wc-steward-history').isVisible()&&await page.locator('#wcStewardHistoryYear option').count()===1);const ids=await page.locator('[id^="wcStewardHistory"]').evaluateAll(nodes=>nodes.map(node=>node.id));check(phase+' history IDs are unique',new Set(ids).size===ids.length,ids);await select('wcStewardHistoryMetric','support');await preservation(phase+' history access',phaseBefore);await screenshot(page,page.locator('.wc-steward-history'),phase+'-one-year');}
      report.derivedFixtureDescriptions=['Tie: selected raw steps40,45,40,42,42,43 with matching action/end snapshots','Displayed zero: all steps50','Subprecision:50 followed by50.04','Legacy: yearStart/stages removed','Gap: year5 component endpoint removed','Gap: year5 record removed','Duplicate: year3 record duplicated','Identity: campaign seed changed','Identity: raw starting value changed by0.001'];
      report.statePreservation={seededInitial:initial,initialSha256:hash(JSON.stringify(stable(initial))),finalRewards:await page.evaluate(()=>historyQARewards)};
      report.sourceAfterSha256=hash(read('stem_lab/stem_tool_watercycle.js'));report.publicAfterSha256=hash(read('desktop/web-app/public/stem_lab/stem_tool_watercycle.js'));
      check('Final run source/public bytes remained frozen',report.sourceAfterSha256===report.sourceSha256&&report.publicAfterSha256===report.sourceSha256);
    }
    report.completed=true;
    report.successful=report.errors.length===0;
  } catch(error) { report.errors.push(error.stack||String(error)); }
  finally {
    if(browser) {await browser.close();report.browserClosed=true;report.browserClosedAt=new Date().toISOString();}
    report.resourcesClosed=true;report.completedAt=new Date().toISOString();save();
    console.log(JSON.stringify({mode:report.mode,completed:report.completed,successful:report.successful,checks:report.checks.length,failed:report.checks.filter(item=>!item.passed).length,errors:report.errors,captures:report.captures.length,audits:report.audits.length,resourcesClosed:report.resourcesClosed}));
    if(!report.successful)process.exitCode=1;
  }
})();
