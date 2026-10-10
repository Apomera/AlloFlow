'use strict';
// Fresh native UI evidence. Only the runtime response is byte-routed; no runtime rewriting.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const REPO = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const { chromium } = require(path.join(REPO, 'node_modules/playwright'));
const option = name => (process.argv.find(arg => arg.startsWith('--' + name + '=')) || '').slice(name.length + 3);
const SOURCE = option('source'), EXPECTED = option('sha'), PREFIX = option('run');
const OUT = option('out') || path.join(__dirname, 'watercycle-cloud-pore-review');
const LIVE = process.argv.includes('--live');
if (!path.isAbsolute(SOURCE) || !path.isAbsolute(OUT) || !/^[a-f0-9]{64}$/.test(EXPECTED) || !/^[a-z0-9][a-z0-9-]{0,50}$/.test(PREFIX)) throw Error('Use --source=absolute-file --sha=exact-sha --run=fresh-prefix [--out=absolute-folder] [--live] [--full]');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = fs.readFileSync(SOURCE), source = bytes.toString('utf8');
if (hash(bytes) !== EXPECTED) throw Error('Pinned runtime hash mismatch');
fs.mkdirSync(OUT, { recursive: true });
if (fs.readdirSync(OUT).some(file => file.startsWith(PREFIX + '-'))) throw Error('Evidence prefix already exists');
fs.writeFileSync(path.join(OUT, PREFIX + '-tested-runtime.js'), bytes);
fs.writeFileSync(path.join(OUT, PREFIX + '-tested-harness.cjs'), fs.readFileSync(__filename));
const quiz = { q: 'Does water entering soil establish groundwater recharge?', a: 'No', opts: ['Yes', 'No'], answered: true, chosen: 'Yes', score: 2, concept: 'infiltration' };
const start = source.indexOf('  var WCCheckInvestigation = (function() {');
const end = source.indexOf('})();', start) + 5;
if (start < 0 || end < start) throw Error('Missing authored check investigation helper');
const CheckInvestigation = new Function(source.slice(start, end) + '\nreturn WCCheckInvestigation;')();
const expectedCheckSession = CheckInvestigation.createSession('quiz', quiz);
if (!expectedCheckSession) throw Error('Local answered infiltration quiz does not create an authored investigation');
const scopeText = 'This pore view is illustrative; soil saturation varies.';
const seed = {
  wcMode: 'explorer', wcSection: 'journey', journeyView: '2d', journeyActive: false,
  journeyState: 'ground_choice', journeyPaused: true, wc2dPaused: true, activeStage: 'infiltration',
  journeyLoops: 2, journeyPaths: { runoff: 1, infiltrate: 1, plant: 0 }, journeyLastPath: 'infiltrate', journeySpeed: 1,
  xp: 73, score: 4, researchPoints: 10, wcAttempts: 4, wcStreak: 1, quizCorrectCount: 2, wcMythsDone: 2,
  completedChallenges: ['complete_journey','adjust_climate','quiz_pass','vocabulary_studied','myth_buster'],
  climSolar: 1.2, climTemp: 18, climWind: 1.4, landRainIntensity: 60, landSaturation: 50, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass',
  wcScenarioBaseline: { climSolar: 1, climTemp: 15, climWind: 1, landRainIntensity: 55, landSaturation: 45, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass' },
  wcPrediction: 'infiltration', wcReplayedObservation: 'saved-record',
  wcExperimentLog: [{ key: 'saved-record', label: 'Existing learner evidence', notes: { explanation: 'Keep this saved observation.' } }],
  wcExperimentUndo: [{ index: 0, entry: { key: 'removed-record', label: 'Keep this removed observation.' } }],
  wcCheckReflections: { saved: { observation: 'Keep this learner explanation.' } },
  wcInvestigation: { version: 1, step: 'predict', prediction: 'runoff', reason: 'Keep my reason.', reflection: 'Keep my reflection.', storm: null, baseline: null, comparison: null },
  wcProcessCompare: { first: 'evaporation', second: 'transpiration', question: 'phase', answer: '', checked: false, notes: { 'evaporation|transpiration': 'Keep my process explanation.', 'infiltration|collection': 'Prior soil comparison explanation.' } },
  wcQuiz: quiz,
  wcMyth: { idx: 5, s: 'Water only evaporates when it is hot or boiling.', t: false, why: 'Evaporation happens at every temperature.', answered: true, chosen: true }
};
const cases = [
  { id: 'compare-light-phone320', consumer: 'compare', width: 320, theme: 'light' },
  { id: 'compare-light-desktop', consumer: 'compare', width: 1040, theme: 'light' },
  { id: 'compare-dark-phone390', consumer: 'compare', width: 390, theme: 'dark' },
  { id: 'compare-contrast-phone320', consumer: 'compare', width: 320, theme: 'contrast' },
  { id: 'compare-forced-phone390', consumer: 'compare', width: 390, theme: 'contrast', forcedColors: 'active' },
  { id: 'chapter-light-phone320', consumer: 'chapter', width: 320, theme: 'light' },
  { id: 'chapter-dark-desktop', consumer: 'chapter', width: 1040, theme: 'dark' },
  { id: 'check-light-phone390', consumer: 'check', width: 390, theme: 'light' }
].map(item => ({ forcedColors: 'none', ...item }));
if (LIVE && !process.argv.includes('--full')) cases.splice(0, cases.length, ...cases.filter(item => ['compare-light-phone320', 'chapter-dark-desktop', 'check-light-phone390'].includes(item.id)));
const report = {
  prefix: PREFIX, pid: process.pid, mode: LIVE ? 'live-delivery' : 'candidate', interceptionUsed: !LIVE,
  url: 'http://127.0.0.1:8770/?mode=explore', startedAt: new Date().toISOString(), sourcePath: SOURCE,
  sourceSha256: EXPECTED, sourceBytes: bytes.length, harnessSha256: hash(fs.readFileSync(__filename)),
  fixture: { quiz, expectedCheckSession }, checks: [], cases: [], captures: [], nativeActions: [], errors: [], consoleErrors: [],
  completed: false, successful: false, browserClosed: false, resourcesClosed: false, serverOwned: false
};
const save = () => fs.writeFileSync(path.join(OUT, PREFIX + '-results.json'), JSON.stringify(report, null, 2));
const check = (label, passed, details) => { report.checks.push({ label, passed: !!passed, details }); if (!passed) report.errors.push(label); };
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const protectedKeys = ['xp','score','researchPoints','wcAttempts','wcStreak','quizCorrectCount','wcMythsDone','completedChallenges','journeyLoops','journeyPaths','journeyLastPath','journeyState','journeySpeed','wcExperimentLog','wcExperimentUndo','wcScenarioBaseline','wcPrediction','wcReplayedObservation','wcInvestigation','wcCheckReflections','wcQuiz','wcMyth','climSolar','climTemp','climWind','landRainIntensity','landSaturation','landPermeability','landSlope','landCover'];
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function data(page) { return page.evaluate(() => JSON.parse(JSON.stringify(window.waterReviewData))); }
function protectedData(value) { return { ...Object.fromEntries(protectedKeys.filter(key => Object.prototype.hasOwnProperty.call(value,key)).map(key => [key,value[key]])), processNotes: value.wcProcessCompare?.notes }; }
async function keyboard(page, locator, key, label) {
  await locator.focus();
  const before = await locator.evaluate(element => ({ tag: element.tagName, id: element.id, focused: document.activeElement === element }));
  await locator.press(key); await settle(page);
  report.nativeActions.push({ label, key, before, afterFocus: await page.evaluate(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id })) });
  check(label + ' uses the focused native control', before.focused, before);
}
async function inspect(page, panel) {
  return panel.evaluate((element, scopeText) => {
    const svg = element.querySelector('svg[data-process-diagram="soil"]');
    if (!svg) return { hasSoil: false, text: element.innerText };
    const box = svg.getBoundingClientRect(), parentBox = element.getBoundingClientRect();
    const rootBounds = svg.getBBox();
    const grains = [...svg.querySelectorAll('[data-soil-material="grain"]')].map(group => {
      const ellipse = group.querySelector('ellipse'), hatch = group.querySelector('path');
      return { ellipse: { cx: +ellipse.getAttribute('cx'), cy: +ellipse.getAttribute('cy'), rx: +ellipse.getAttribute('rx'), ry: +ellipse.getAttribute('ry') }, hatch: hatch?.getAttribute('d'), fill: getComputedStyle(ellipse).fill, stroke: getComputedStyle(ellipse).stroke, fillOpacity: getComputedStyle(ellipse).fillOpacity };
    });
    const water = [...svg.querySelectorAll('[data-soil-material="water"]')].map(node => ({ d: node.getAttribute('d'), cue: node.dataset.diagramCue, phase: node.dataset.waterSymbol, fill: getComputedStyle(node).fill, opacity: getComputedStyle(node).opacity }));
    const ctx = document.createElement('canvas').getContext('2d');
    const air = [[24,20],[35,31],[24,40]].map(([x,y]) => {
      const waterFilled = water.some(item => ctx.isPointInPath(new Path2D(item.d), x, y));
      const grainFilled = grains.some(item => ((x-item.ellipse.cx)/item.ellipse.rx)**2 + ((y-item.ellipse.cy)/item.ellipse.ry)**2 <= 1);
      return {x,y,waterFilled,grainFilled};
    });
    const scope = [...element.querySelectorAll('p,small')].find(node => node.textContent.includes(scopeText));
    const scopeBox = scope?.getBoundingClientRect();
    return {
      hasSoil: true, text: element.innerText, scopeText: scope?.textContent, scopeVisible: !!scopeBox && scopeBox.width > 0 && scopeBox.height > 0,
      phaseFrom: element.querySelector('[data-chapter-phase-from]')?.textContent,
      phaseTo: element.querySelector('[data-chapter-phase-to]')?.textContent,
      svg: { x:box.x,y:box.y,width:box.width,height:box.height,viewBox:svg.getAttribute('viewBox'),ariaHidden:svg.getAttribute('aria-hidden'),focusable:svg.getAttribute('focusable'),bounds:{x:rootBounds.x,y:rootBounds.y,width:rootBounds.width,height:rootBounds.height},color:getComputedStyle(svg).color },
      panel: {x:parentBox.x,y:parentBox.y,width:parentBox.width,height:parentBox.height}, grains, water, air,
      entry: svg.querySelector('[data-diagram-cue="infiltration-entry"]')?.getAttribute('d'),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      media: { forcedColors:matchMedia('(forced-colors: active)').matches,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches }
    };
  }, scopeText);
}
async function capture(panel, label) {
  const file = PREFIX + '-' + label + '.png';
  await panel.screenshot({ path: path.join(OUT,file), animations:'disabled' });
  const contents = fs.readFileSync(path.join(OUT,file));
  report.captures.push({label,file,sha256:hash(contents),bytes:contents.length});
}
let browser;
(async () => {
  try {
    browser = await chromium.launch({ headless:true }); report.browserLaunchedAt = new Date().toISOString(); save();
    const page = await browser.newPage({ viewport:{width:1040,height:1100}, reducedMotion:'reduce' }); page.setDefaultTimeout(30000);
    page.on('pageerror', error => report.errors.push(String(error)));
    page.on('console', message => { if(message.type()==='error') report.consoleErrors.push(message.text()); });
    let routedCount=0;
    if(!LIVE) await page.route('**/stem_lab/stem_tool_watercycle.js', async route => {routedCount++;await route.fulfill({status:200,contentType:'text/javascript',body:bytes});});
    const loaded = page.waitForResponse(response => new URL(response.url()).pathname === '/stem_lab/stem_tool_watercycle.js').then(response=>({response}),error=>({error:String(error)}));
    await page.goto(report.url,{waitUntil:'load'});
    const response = await loaded; if(response.error) throw Error(response.error);
    const delivered = await response.response.body(); report.loadedRuntimeSha256=hash(delivered);report.loadedRuntimeBytes=delivered.length;
    check('Native browser loads exact pinned runtime bytes',report.loadedRuntimeSha256===EXPECTED && report.loadedRuntimeBytes===bytes.length && routedCount===(LIVE?0:1),{sha256:report.loadedRuntimeSha256,bytes:report.loadedRuntimeBytes,routedCount,interceptionUsed:!LIVE});
    await page.waitForFunction(()=>typeof window.mountWater==='function'&&typeof window.waterReviewData==='object');
    await page.evaluate(()=>{
      window.soilPoreNativeKeys=[];
      const observe=event=>window.soilPoreNativeKeys.push({key:event.key,code:event.code,trusted:event.isTrusted,tag:event.target?.tagName,id:event.target?.id,focused:document.activeElement===event.target});
      document.addEventListener('keydown',observe,true);
      window.stopSoilPoreKeys=()=>{document.removeEventListener('keydown',observe,true);delete window.stopSoilPoreKeys;return true;};
    });
    for(const item of cases){
      await page.setViewportSize({width:item.width,height:1100});await page.emulateMedia({reducedMotion:'reduce',forcedColors:item.forcedColors});
      await page.evaluate(({seed,item})=>mountWater({...seed,wcSection:item.consumer==='check'?'check':'journey',journeyActive:item.consumer==='chapter'},item.theme),{seed,item});
      await settle(page);await page.evaluate(()=>{window.soilPoreNativeKeys=[];});const before=await data(page);let panel;
      if(item.consumer==='compare'){
        const details=page.locator('details.wc-process-compare');
        await keyboard(page,details.locator('summary'),'Enter',item.id+' opens Compare');
        check(item.id+' disclosure opens',await details.evaluate(element=>element.open));
        await keyboard(page,page.locator('#wcProcessFirst'),'End',item.id+' selects infiltration');
        await page.waitForFunction(()=>waterReviewData.wcProcessCompare?.first==='infiltration');
        const second=page.locator('#wcProcessSecond');
        await second.focus();const secondBefore=await second.evaluate(element=>({id:element.id,tag:element.tagName,focused:document.activeElement===element}));
        await second.press('Home');await second.press('ArrowDown');await second.press('ArrowDown');await second.press('ArrowDown');await settle(page);
        report.nativeActions.push({label:item.id+' selects collection',keys:['Home','ArrowDown','ArrowDown','ArrowDown'],before:secondBefore});
        check(item.id+' collection selection uses focused native control',secondBefore.focused,secondBefore);
        check(item.id+' native selectors form infiltration and collection pair',await page.evaluate(()=>waterReviewData.wcProcessCompare?.first==='infiltration'&&waterReviewData.wcProcessCompare?.second==='collection'));
        await keyboard(page,details.locator('input[name="wcProcessAnswer"][value="neither"]'),'Space',item.id+' chooses no required phase change');
        await keyboard(page,details.locator('.wc-process-check'),'Enter',item.id+' checks process evidence');
        await page.waitForFunction(()=>document.activeElement?.id==='wcProcessFeedbackTitle');
        check(item.id+' check reports supported comparison and focus handoff',await details.locator('.wc-process-feedback').getAttribute('data-match')==='agree'&&await page.evaluate(()=>document.activeElement?.id==='wcProcessFeedbackTitle'));
        panel=details.locator('[data-process="infiltration"]');
      }else if(item.consumer==='chapter'){
        await keyboard(page,page.locator('#wcJourneyChapter-land'),'Enter',item.id+' inspects land chapter');
        await keyboard(page,page.locator('#wcJourneyLandStep-infiltrating'),'Enter',item.id+' inspects soil step');
        panel=page.locator('#wcJourneyChapterCard');
        check(item.id+' inspector selects soil without rerouting live parcel',await panel.getAttribute('data-chapter-state')==='infiltrating'&&await page.evaluate(()=>waterReviewData.journeyState==='ground_choice'&&waterReviewData.wcJourneyLandStep==='infiltrating'));
      }else{
        await keyboard(page,page.locator('#wcCheckInvestigateQuiz'),'Enter',item.id+' starts authored evidence investigation');
        await page.waitForSelector('[data-wc-check-process="infiltration"]');
        panel=page.locator('[data-wc-check-process="infiltration"]');
        check(item.id+' opens authored infiltration evidence',await page.evaluate(key=>waterReviewData.wcCheckInvestigation?.destinationKey===key,expectedCheckSession.destinationKey),{expected:expectedCheckSession.destinationKey});
      }
      await panel.scrollIntoViewIfNeeded();const observation=await inspect(page,panel),after=await data(page);
      const nativeKeys=await page.evaluate(()=>window.soilPoreNativeKeys);
      report.cases.push({item,observation,nativeKeys,beforeProtected:protectedData(before),afterProtected:protectedData(after)});
      check(item.id+' receives trusted focused native keyboard events',nativeKeys.length>0&&nativeKeys.every(event=>event.trusted&&event.focused),nativeKeys);
      check(item.id+' shows scoped illustrative pore copy',observation.scopeVisible&&observation.scopeText?.includes(scopeText),{scopeText:observation.scopeText,visible:observation.scopeVisible});
      check(item.id+' preserves liquid phase descriptions',observation.text?.includes('Liquid surface water')&&observation.text?.includes('Liquid soil pore water'),{text:observation.text});
      check(item.id+' distinguishes hatched grains from liquid pockets',observation.grains?.length===4&&observation.grains.every(grain=>grain.hatch&&grain.stroke!=='none')&&observation.water?.length===2&&observation.water.every(water=>water.phase==='liquid'&&water.fill!=='none'),{grains:observation.grains,water:observation.water});
      check(item.id+' keeps illustrative air gaps and shallow entry visible',observation.air?.every(point=>!point.waterFilled&&!point.grainFilled)&&observation.entry==='M24 6v10m-4-4 4 4 4-4',{air:observation.air,entry:observation.entry});
      check(item.id+' keeps decorative SVG and all geometry inside frame',observation.svg?.viewBox==='0 0 48 48'&&observation.svg.ariaHidden==='true'&&observation.svg.focusable==='false'&&observation.svg.bounds.x>=0&&observation.svg.bounds.y>=0&&observation.svg.bounds.x+observation.svg.bounds.width<=48.01&&observation.svg.bounds.y+observation.svg.bounds.height<=48.01,{svg:observation.svg});
      check(item.id+' fits the requested viewport and media',!observation.horizontalOverflow&&observation.panel.x>=-.6&&observation.panel.x+observation.panel.width<=item.width+.6&&observation.media.reducedMotion&&observation.media.forcedColors===(item.forcedColors==='active'),{panel:observation.panel,overflow:observation.horizontalOverflow,media:observation.media});
      check(item.id+' preserves saved learner work, model controls and scoring',same(protectedData(before),protectedData(after)),{before:protectedData(before),after:protectedData(after)});
      await capture(panel,item.id);save();
    }
    report.keyObserverRemoved=await page.evaluate(()=>window.stopSoilPoreKeys());
    check('Native key observer is removed without replacing runtime methods',report.keyObserverRemoved);
    report.completed=true;report.successful=report.errors.length===0;
  }catch(error){report.errors.push(String(error.stack||error));report.successful=false;process.exitCode=1;}
  finally{
    if(browser){await browser.close();report.browserClosed=true;}
    report.resourcesClosed=report.browserClosed;report.finishedAt=new Date().toISOString();
    report.successful=report.completed&&report.errors.length===0&&report.resourcesClosed;
    if(!report.successful)process.exitCode=1;
    report.processExitCode=process.exitCode||0;save();
    console.log(JSON.stringify({prefix:PREFIX,checks:report.checks.length,failed:report.checks.filter(item=>!item.passed).length,cases:report.cases.length,captures:report.captures.length,actions:report.nativeActions.length,completed:report.completed,successful:report.successful,resourcesClosed:report.resourcesClosed,errors:report.errors},null,2));
  }
})();
