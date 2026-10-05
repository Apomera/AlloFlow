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
const report = { mode, pid: process.pid, startedAt: new Date().toISOString(), sourceSha256: hash(source), sourceBytes: source.length, publicSha256: hash(read('desktop/web-app/public/stem_lab/stem_tool_watercycle.js')), harnessSha256: hash(fs.readFileSync(__filename)), checks: [], nativeActions: [], audits: [], captures: [], errors: [], consoleErrors: [], cases: [], completed: false, successful: false, resourcesClosed: false };
const save = () => fs.writeFileSync(path.join(out, mode + '-results.json'), JSON.stringify(report, null, 2));
const check = (label, condition, details) => { report.checks.push({ label, passed: !!condition, details }); if (!condition) report.errors.push(label); save(); };
const screenshot = async (page, locator, name) => {
  const target = path.join(out, mode + '-' + name + '.png');
  await locator.screenshot({ path: target });
  const bytes = fs.readFileSync(target);
  report.captures.push({ path: path.basename(target), sha256: hash(bytes), bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sourceSha256: report.sourceSha256, capturedAt: new Date().toISOString() }); save();
};
const variants = mode === 'baseline' ? [{name:'desktop',width:1280},{name:'phone320',width:320},{name:'phone390',width:390},{name:'dark',width:1280,dark:true}] : [{name:'phone320',width:320},{name:'dark',width:1280,dark:true},{name:'forced-dark',width:320,dark:true,forced:true},{name:'host390',width:1280,host:390},{name:'phone390',width:390},{name:'desktop',width:1280}];
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
        report.audits.push({variant:variant.name,selector:'.wc-steward-history',...axe});
        check(variant.name+' scoped axe has zero violations',axe.violations.length===0,axe.violations);
      }
      await screenshot(page,region,variant.name);
    }
    report.completed=true;
    report.successful=report.errors.length===0;
  } catch(error) { report.errors.push(error.stack||String(error)); }
  finally {
    if(browser) {await browser.close();report.browserClosedAt=new Date().toISOString();}
    report.resourcesClosed=true;report.completedAt=new Date().toISOString();save();
    console.log(JSON.stringify({mode:report.mode,completed:report.completed,successful:report.successful,checks:report.checks.length,failed:report.checks.filter(item=>!item.passed).length,errors:report.errors,captures:report.captures.length,audits:report.audits.length,resourcesClosed:report.resourcesClosed}));
    if(!report.successful)process.exitCode=1;
  }
})();
