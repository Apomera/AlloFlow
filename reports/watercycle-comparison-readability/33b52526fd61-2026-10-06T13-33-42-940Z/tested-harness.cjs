'use strict';

// Native comparison controls and width-dependent presentation checks. This
// harness serves frozen bytes and never swaps the installed production runtime.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MAIN = path.join(ROOT, 'stem_lab/stem_tool_watercycle.js');
const PUBLIC = path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const BASELINE = path.join(ROOT, 'reports/watercycle-land-pathway-groups/candidate-runtime.js');
const BASELINE_SHA = '4fec040c2d54a0df8beedfcf0b8dc93ae332dcab37f9a96c18f82a2aafcced37';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const source = fs.readFileSync(MAIN);
const sourceHash = hash(source);
const expected = process.argv.find(arg => arg.startsWith('--expected-sha='))?.slice(15);
if (expected !== sourceHash) throw Error('Supply installed source with --expected-sha=' + sourceHash);
const harnessBytes = fs.readFileSync(__filename);
const baseline = fs.readFileSync(BASELINE);
if (hash(baseline) !== BASELINE_SHA) throw Error('Frozen comparison baseline changed');
const baselineText = baseline.toString('utf8');
function slice(text, start, end) {
  const first = text.indexOf(start), last = text.indexOf(end, first + start.length);
  if (first < 0 || last <= first) throw Error('Missing authored comparison anchor: ' + start);
  return text.slice(first, last);
}
const diagramHelper = slice(baselineText, '          function wcProcessDiagram(id, after) {', '          var wcJourneyChapter =');
const comparisonHelper = slice(baselineText, '  var WCProcessCompare = (function() {', '  // End process comparison helpers.');
const OUT = path.join(ROOT, 'reports/watercycle-comparison-readability', sourceHash.slice(0, 12) + '-' + new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(OUT, { recursive: true });
const report = {
  pid: process.pid, startedAt: new Date().toISOString(), sourceSha256: sourceHash,
  publicSourceSha256: hash(fs.readFileSync(PUBLIC)), baselineSha256: BASELINE_SHA, harnessSha256: hash(harnessBytes),
  checks: [], cases: [], nativeActions: [], captures: [], loadedSources: [], audits: [], errors: [],
  completed: false, successful: false, browserLaunched: false, browserClosed: false, serverListening: false, serverClosed: false,
};
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
function check(passed, label, detail) {
  report.checks.push({ passed: !!passed, label, ...(detail === undefined ? {} : { detail }) });
  if (!passed) console.log('FAIL ' + label);
}
function save() {
  const json = JSON.stringify(report, null, 2);
  if (Buffer.byteLength(json) > 1000000) throw Error('Compact report exceeded 1 MB');
  fs.writeFileSync(path.join(OUT, 'results.json'), json + '\n');
}
const PAIRS = [['evaporation', 'transpiration'], ['condensation', 'precipitation'], ['infiltration', 'collection']];
const seed = {
  wcMode: 'explorer', wcSection: 'journey', wcJourneyChapter: 'land', wcJourneyLandStep: 'infiltrating',
  activeStage: 'infiltration', journeyView: '2d', journeyActive: true,
  journeyState: 'aquifer_flow', journeyLastPath: 'infiltrate', journeyPaused: true, wc2dPaused: true,
  journeySpeed: 1, journeyLoops: 2, journeyReplayProgress: null,
  journeyPaths: { runoff: 1, infiltrate: 1, plant: 0 }, stagesViewed: { infiltration: true },
  xp: 73, score: 4, researchPoints: 10, wcAttempts: 4, wcStreak: 2, quizCorrectCount: 2, wcMythsDone: 3,
  completedChallenges: ['complete_journey', 'explore_all_stages', 'adjust_climate', 'quiz_pass', 'vocabulary_studied', 'stewardship_win', 'myth_buster', 'double_rainbow'],
  climSolar: 1.2, climTemp: 18, climWind: 1.4,
  landRainIntensity: 60, landSaturation: 50, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass',
  wcQuiz: { q: 'Where can groundwater move in an aquifer?', a: 'Connected pores and fractures', opts: ['Connected pores and fractures', 'Only an empty underground lake'], answered: true, chosen: 'Only an empty underground lake', score: 2, concept: 'aquifer' },
  wcScenarioBaseline: { climSolar: 1, climTemp: 15, climWind: 1 }, wcPrediction: 'infiltration',
  wcProcessCompare: { first: 'condensation', second: 'precipitation', question: 'phase', answer: '', checked: false,
    notes: { 'evaporation|transpiration': 'Keep my comparison explanation.', 'condensation|precipitation': 'Cloud formation and falling are different.' } },
  wcExperimentLog: [{ key: 'saved-record', label: 'Retain my observation', notes: { explanation: 'Keep the learner evidence.' } }],
  wcCheckReflections: { kept: { observation: 'Keep the learner Check reflection.' } },
  wcGroundwaterLens: { explorer: { version: 1, identity: 'groundwater-lens-v1', part: 'soil', answer: 'soil_storage' }, check: { version: 1, identity: 'retained-question', part: 'groundwater', answer: 'soil_storage' } },
  precipHunt: { experiment: { prediction: 'Keep my storm prediction.', explanation: 'Keep my storm explanation.' } },
};
function html(isBaseline) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comparison readability QA</title><link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;font-family:system-ui}main{box-sizing:border-box;padding:12px;max-width:1250px;margin:auto}</style></head><body><main id="slot"></main><script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="${isBaseline ? '/baseline-runtime.js' : '/stem_lab/stem_tool_watercycle.js'}"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.compareAwards=[];window.mountCompare=function(seed,theme){
 ReactDOM.unmountComponentAtNode(document.getElementById('slot'));window.compareAwards=[];
 function Host(){const[data,setData]=React.useState({waterCycle:seed});window.compareData=data.waterCycle;const noop=()=>{};
 return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:(...args)=>compareAwards.push(args),getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
 document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':'#eef2f2';ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
};
(function(){${diagramHelper}
window.compareExpectedSvg=function(id,after){const slot=document.createElement('div');ReactDOM.render(wcProcessDiagram(id,after),slot);const markup=slot.firstElementChild.outerHTML;ReactDOM.unmountComponentAtNode(slot);return markup;};})();
</script></body></html>`;
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/' || url.pathname === '/baseline') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(html(url.pathname === '/baseline')); }
  if (url.pathname === '/stem_lab/stem_tool_watercycle.js' || url.pathname === '/baseline-runtime.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(url.pathname === '/baseline-runtime.js' ? baseline : source);
  }
  const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
  const allowed = ['/stem_lab/', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/desktop/web-app/node_modules/axe-core/', '/dev-tools/.cache/sweep-tailwind.css'];
  if (!file.startsWith(ROOT + path.sep) || !allowed.some(prefix => url.pathname.startsWith(prefix))) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, bytes) => { res.writeHead(error ? 404 : 200, { 'Content-Type': file.endsWith('.css') ? 'text/css' : 'text/javascript' }); res.end(error ? 'Not found' : bytes); });
});
const paint = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function mount(page, config) {
  await page.evaluate(({ seed, config }) => {
    document.body.style.zoom = config.zoom || 1;
    document.getElementById('slot').style.maxWidth = (config.hostWidth || 1250) + 'px';
    mountCompare({ ...seed, wcProcessCompare: { ...seed.wcProcessCompare, first: config.pair[0], second: config.pair[1] } }, config.theme);
  }, { seed, config });
  await page.locator('.wc-process-compare-summary').waitFor({ state: 'visible' });
  await paint(page);
  await page.locator('.wc-process-compare-summary').click();
  await page.locator('.wc-process-cards').waitFor({ state: 'visible' });
  await paint(page);
  await page.locator('#wcCanvas').evaluate(canvas => { if (canvas._wcSetJourneyProgress) canvas._wcSetJourneyProgress(.42); });
  await paint(page);
}
async function snapshot(page) {
  await paint(page);
  return page.evaluate(() => {
    const canvas = document.querySelector('#wcCanvas');
    return { data: JSON.parse(JSON.stringify(compareData)), awards: JSON.parse(JSON.stringify(compareAwards)),
      parcel: { state: canvas?.dataset.journeyState, progress: canvas?.dataset.journeyProgress, paused: canvas?.dataset.journeyPaused },
      parcelLabel: document.querySelector('[data-wc-chapter-parcel]')?.textContent,
      markers: [...document.querySelectorAll('.wc-journey-timeline [data-current-parcel]')].map(el => ({ current: el.dataset.currentParcel, replay: el.dataset.replayFocus, label: el.querySelector('.wc-chapter-current')?.textContent || '', id: el.querySelector('button')?.id, currentAria: el.querySelector('button')?.getAttribute('aria-current') })) };
  });
}
async function diagrams(page, label) {
  const result = await page.evaluate(() => [...document.querySelectorAll('.wc-process-card')].map(card => {
    const svgs = [...card.querySelectorAll('.wc-process-state > svg')];
    return { process: card.dataset.process, count: svgs.length,
      matches: svgs.map((svg, i) => svg.outerHTML === compareExpectedSvg(card.dataset.process, i === 1)),
      decorative: svgs.every(svg => svg.getAttribute('aria-hidden') === 'true' && svg.getAttribute('focusable') === 'false' && !svg.querySelector('text')),
      svgMarkup: svgs.map(svg => svg.outerHTML) };
  }));
  check(result.length === 2 && result.every(card => card.count === 2 && card.matches.every(Boolean)), label + ' retains both scientific SVGs for each process byte for byte');
  check(result.every(card => card.decorative), label + ' retains decorative scientific SVG semantics');
  return result.map(({ process, svgMarkup }) => ({ process, sha256: hash(JSON.stringify(svgMarkup)) }));
}
async function metrics(page) {
  return page.locator('.wc-process-compare').evaluate(root => {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const contentWidth = element => { const s = getComputedStyle(element); return element.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight); };
    const columns = element => element.tagName === 'FIELDSET'
      ? new Set([...element.querySelectorAll(':scope > label')].map(label => Math.round(label.getBoundingClientRect().left))).size
      : getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length;
    const visible = element => !element.closest('.sr-only') && getComputedStyle(element).visibility !== 'hidden' && element.getClientRects().length > 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const text = []; let node;
    while ((node = walker.nextNode())) {
      const element = node.parentElement;
      if (!node.textContent.trim() || !visible(element) || element.closest('option,select,textarea,style,script')) continue;
      const range = document.createRange(); range.selectNodeContents(node); const r = range.getBoundingClientRect();
      const fragments = [...node.textContent.matchAll(/[\p{L}\p{N}]+/gu)].map(word => {
        const wordRange = document.createRange(); wordRange.setStart(node, word.index); wordRange.setEnd(node, word.index + word[0].length);
        return wordRange.getClientRects().length;
      });
      const style = getComputedStyle(element);
      const isKey = !!element.closest('.wc-process-facts dd,.wc-process-state strong,button');
      text.push({ text: node.textContent.trim(), tag: element.tagName, className: element.className, fontSize: parseFloat(style.fontSize), minFont: isKey ? 14 : 13,
        color: style.color, background: style.backgroundColor, rect: rect(element),
        textRect: { x: r.x, y: r.y, right: r.right, bottom: r.bottom }, fragments,
        scrollWidth: element.scrollWidth, clientWidth: element.clientWidth });
    }
    const luminance = color => { const rgb = (color.match(/[\d.]+/g) || []).slice(0, 3).map(value => { const s = Number(value) / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; };
    const contrast = (foreground, background) => { const a = luminance(foreground), b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
    const cards = [...root.querySelectorAll('.wc-process-card')].map(card => {
      const flow = card.querySelector('.wc-process-state-flow'), arrow = card.querySelector('.wc-process-state-arrow');
      const states = [...card.querySelectorAll('.wc-process-state')];
      return { process: card.dataset.process, slot: card.dataset.slot, rect: rect(card), contentWidth: contentWidth(card),
        containerName: getComputedStyle(card).containerName, containerType: getComputedStyle(card).containerType,
        flowColumns: columns(flow), arrow: rect(arrow), arrowTransform: getComputedStyle(arrow).transform,
        states: states.map(state => ({ rect: rect(state), phase: state.querySelector('strong')?.textContent, caption: state.querySelector('small')?.textContent,
          figureColor: getComputedStyle(state.querySelector('svg')).color, frameColor: getComputedStyle(state).backgroundColor,
          figureContrast: contrast(getComputedStyle(state.querySelector('svg')).color, getComputedStyle(state).backgroundColor) })),
        facts: [...card.querySelectorAll('.wc-process-facts > div')].map(row => ({ rect: rect(row), padding: getComputedStyle(row).padding, borderWidth: getComputedStyle(row).borderTopWidth, borderStyle: getComputedStyle(row).borderTopStyle,
          label: row.querySelector('dt')?.textContent, value: row.querySelector('dd')?.textContent })),
        energy: card.querySelector('.wc-process-energy')?.textContent || '', caveat: card.querySelector('.wc-process-caveat')?.textContent,
      };
    });
    const targets = [...root.querySelectorAll('summary,button,select,textarea,label')].filter(el => visible(el) && (el.tagName !== 'LABEL' || el.querySelector('input')))
      .map(el => ({ tag: el.tagName, id: el.id, text: el.textContent.trim(), rect: rect(el), fontSize: parseFloat(getComputedStyle(el).fontSize) }));
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    return { rect: rect(root), containerWidth: contentWidth(root), containerName: getComputedStyle(root).containerName, containerType: getComputedStyle(root).containerType,
      cardColumns: columns(root.querySelector('.wc-process-cards')), selectorColumns: columns(root.querySelector('.wc-process-selectors')),
      questionColumns: columns(root.querySelector('.wc-process-question-modes')), answerColumns: columns(root.querySelector('.wc-process-answer')),
      presetButtons: [...root.querySelectorAll('.wc-process-pairs button')].map(el => ({ text: el.textContent, rect: rect(el), flexBasis: getComputedStyle(el).flexBasis })),
      cards, targets, text, uniqueIds: new Set(ids).size === ids.length,
      scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      first: root.querySelector('#wcProcessFirst')?.value, second: root.querySelector('#wcProcessSecond')?.value,
      feedbackMatch: root.querySelector('.wc-process-feedback')?.dataset.match || '', checkedEnergyCount: root.querySelectorAll('.wc-process-energy').length,
    };
  });
}
async function inspect(page, config, label, baselineCase = false) {
  const metric = await metrics(page);
  const geometry = await diagrams(page, label);
  if (!baselineCase) {
    check(metric.containerName === 'wc-compare-panel' && metric.containerType === 'inline-size', label + ' measures the available comparison panel width');
    check(metric.cards.length === 2 && metric.cards.every(card => card.containerName === 'wc-compare-card' && card.containerType === 'inline-size'), label + ' measures each process card independently');
    check(metric.cardColumns === (metric.containerWidth >= 680 ? 2 : 1), label + ' gives two cards columns only above 680px available', { width: metric.containerWidth, columns: metric.cardColumns });
    check([metric.selectorColumns, metric.questionColumns, metric.answerColumns].every(count => count === (metric.containerWidth >= 440 ? 2 : 1)), label + ' keeps selectors and choices readable at the 440px panel breakpoint');
    check(metric.presetButtons.every(button => button.flexBasis === (metric.containerWidth >= 680 ? '180px' : '100%')), label + ' sizes suggested pairs using available panel width');
    check(metric.cards.every(card => card.flowColumns === (card.contentWidth >= 280 ? 3 : 1)), label + ' switches each before/after diagram at 280px card content width', metric.cards.map(card => ({ process: card.process, width: card.contentWidth, columns: card.flowColumns })));
    check(metric.cards.every(card => card.contentWidth >= 280
      ? card.arrowTransform === 'none' || /^matrix\(1, 0, 0, 1,/.test(card.arrowTransform)
      : /^matrix\(0, 1, -1, 0,/.test(card.arrowTransform)), label + ' turns the connector downward with stacked states');
    check(metric.cards.every(card => card.contentWidth >= 280
      ? card.states[1].rect.x >= card.states[0].rect.right - 1
      : card.states[1].rect.y >= card.states[0].rect.bottom - 1), label + ' places before and after states on the intended responsive axis');
    check(metric.cards.every(card => same(card.states.map(state => state.caption), ['Before', 'After'])), label + ' retains before and after captions');
    check(metric.cards.every(card => card.states.every(state => state.figureContrast >= 3)), label + ' keeps scientific figure strokes at least 3:1 against their frames', metric.cards.map(card => ({ process: card.process, contrast: card.states.map(state => state.figureContrast) })));
    check(metric.cards.every(card => card.facts.length === 3 && card.facts.every(row => parseFloat(row.padding) > 0 && parseFloat(row.borderWidth) > 0 && row.borderStyle === 'solid')), label + ' gives the three factual rows quiet boxed spacing');
    check(!metric.pageOverflow && metric.scrollWidth <= metric.clientWidth + 1, label + ' has no horizontal document or comparison overflow');
    check(metric.targets.every(target => target.rect.width >= 44 && target.rect.height >= 44), label + ' retains 44px native control targets');
    check(metric.text.every(item => item.fontSize >= item.minFont), label + ' keeps labels and facts at their readable minimum sizes', metric.text.filter(item => item.fontSize < item.minFont).map(item => ({ text: item.text, font: item.fontSize, minimum: item.minFont })));
    check(metric.text.every(item => item.fragments.every(count => count === 1)), label + ' wraps words without splitting their letters');
    check(metric.text.every(item => item.textRect.x >= item.rect.x - 1 && item.textRect.right <= item.rect.right + 1
      && item.textRect.y >= item.rect.y - 1 && item.textRect.bottom <= item.rect.bottom + 1), label + ' fits every visible text run inside its label or fact box');
    check(metric.uniqueIds, label + ' retains unique page IDs');
    const state = await snapshot(page);
    check(metric.first === state.data.wcProcessCompare.first && metric.second === state.data.wcProcessCompare.second
      && same(metric.cards.map(card => card.process), [metric.first, metric.second]), label + ' renders the original selected processes in order');
    check(metric.checkedEnergyCount === (state.data.wcProcessCompare.checked ? 2 : 0), label + ' shows paired latent heat evidence only after an explicit check');
  }
  report.cases.push({ label, config, baseline: baselineCase, ...metric, diagrams: geometry });
}
async function audit(page, label) {
  const result = await page.evaluate(async () => {
    const data = await axe.run(document.querySelector('.wc-process-compare'), { rules: { region: { enabled: false } } });
    return { violations: data.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })),
      incomplete: data.incomplete.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })) };
  });
  report.audits.push({ label, ...result });
  check(result.violations.length === 0, label + ' scoped accessibility and color contrast have zero violations', result.violations);
}
async function nativeAction(page, label, operation, assert) {
  const before = await snapshot(page);
  await operation(); await paint(page);
  const after = await snapshot(page);
  const changed = Object.keys({ ...before.data, ...after.data }).filter(field => !same(before.data[field], after.data[field]));
  report.nativeActions.push({ label, changedFields: changed, comparison: after.data.wcProcessCompare,
    beforeStateSha256: hash(JSON.stringify(stable(before.data))), afterStateSha256: hash(JSON.stringify(stable(after.data))), parcelBefore: before.parcel, parcelAfter: after.parcel });
  const omit = data => Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'wcProcessCompare'));
  check(changed.every(field => field === 'wcProcessCompare') && same(omit(before.data), omit(after.data)), label + ' preserves every noncomparison learner, record, model and score field', changed);
  check(same(before.awards, after.awards), label + ' adds no XP or score events');
  check(same(before.parcel, after.parcel) && same(before.markers, after.markers) && before.parcelLabel === after.parcelLabel, label + ' preserves the paused parcel and its chapter markers');
  check(after.data.journeyPaused === true && after.data.journeyState === 'aquifer_flow', label + ' keeps the groundwater parcel paused');
  const checked = after.data.wcProcessCompare.checked;
  check(await page.locator('.wc-process-energy').count() === (checked ? 2 : 0), label + ' gates paired latent heat evidence on checked state');
  if (checked) {
    const measured = await metrics(page);
    const evidence = measured.text.filter(item => typeof item.className === 'string' && item.className.includes('wc-process-energy') || measured.cards.some(card => card.energy.includes(item.text)));
    check(evidence.length > 0 && evidence.every(item => item.fontSize >= item.minFont), label + ' keeps checked energy evidence readable');
    check(measured.text.every(item => item.fragments.every(count => count === 1)), label + ' keeps checked explanations in whole words');
    check(measured.text.every(item => item.textRect.x >= item.rect.x - 1 && item.textRect.right <= item.rect.right + 1
      && item.textRect.y >= item.rect.y - 1 && item.textRect.bottom <= item.rect.bottom + 1), label + ' fits checked evidence and feedback inside their boxes');
  }
  if (assert) await assert(after.data.wcProcessCompare, before.data.wcProcessCompare);
  return after;
}
async function keyboard(page, locator) {
  const control = page.locator(locator); await control.focus(); await control.press('Space');
}
async function nativeChecks(page) {
  const saved = {};
  for (const pair of PAIRS) {
    const key = pair.join('|');
    await nativeAction(page, 'Suggested pair ' + key, async () => {
      const button = page.locator('[data-wc-process-pair="' + key + '"]'); await button.focus(); await button.press('Enter');
    }, async state => {
      check(state.first === pair[0] && state.second === pair[1], key + ' selects the native suggested pair');
      check(await page.locator('[data-wc-process-pair="' + key + '"]').getAttribute('aria-pressed') === 'true', key + ' keeps native selected pair semantics');
      check(await page.locator('[data-wc-process-pair="' + key + '"]').evaluate(el => document.activeElement === el), key + ' retains keyboard focus on its pair control');
    });
    await diagrams(page, 'Native suggested pair ' + key);
    for (const question of ['phase', 'energy']) {
      await nativeAction(page, key + ' question ' + question, () => keyboard(page, 'input[name="wcProcessQuestion"][value="' + question + '"]'), async state => {
        check(state.question === question, key + ' selects the native ' + question + ' question');
        check(await page.locator('input[name="wcProcessQuestion"][value="' + question + '"]').evaluate(el => document.activeElement === el), key + ' retains keyboard focus on its question');
      });
      const truth = new Set(question === 'phase' ? ['evaporation', 'condensation', 'transpiration'] : ['evaporation', 'transpiration']);
      const a = truth.has(pair[0]), b = truth.has(pair[1]);
      const correct = a ? (b ? 'both' : 'first') : (b ? 'second' : 'neither');
      for (const [answer, match] of [[correct === 'both' ? 'neither' : 'both', 'revisit'], [correct, 'agree']]) {
        await nativeAction(page, key + ' ' + question + ' answer ' + answer, () => keyboard(page, 'input[name="wcProcessAnswer"][value="' + answer + '"]'), async state => {
          check(state.answer === answer && state.checked === false, key + ' ' + question + ' stores a revised answer before checking');
          check(await page.locator('.wc-process-feedback').count() === 0, key + ' ' + question + ' clears feedback while reconsidering');
        });
        await nativeAction(page, key + ' ' + question + ' check ' + match, async () => {
          const button = page.locator('.wc-process-check'); await button.focus(); await button.press('Enter');
        }, async state => {
          check(state.checked === true, key + ' ' + question + ' records the explicit check');
          check(await page.locator('.wc-process-feedback').getAttribute('data-match') === match, key + ' ' + question + ' gives the original ' + match + ' feedback');
          await page.waitForFunction(() => document.activeElement?.id === 'wcProcessFeedbackTitle');
          check(await page.locator('#wcProcessFeedbackTitle').evaluate(el => document.activeElement === el), key + ' ' + question + ' retains native feedback heading focus');
          check(await page.locator('.wc-process-feedback li').count() === 2, key + ' ' + question + ' retains both process evidence explanations');
        });
      }
    }
    saved[key] = 'Evidence kept for ' + key + '.';
    await nativeAction(page, 'Write reflection ' + key, () => page.locator('#wcProcessExplain').fill(saved[key]), async (state, previous) => {
      check(state.notes[key] === saved[key] && state.checked === previous.checked, key + ' remembers writing without clearing checked evidence');
    });
  }
  await nativeAction(page, 'Process A native selector', async () => {
    await page.locator('#wcProcessFirst').focus(); await page.locator('#wcProcessFirst').selectOption('condensation');
  }, async state => {
    check(state.first === 'condensation' && state.second === 'collection' && state.answer === '' && !state.checked, 'Process A changes only its native pair selection and clears stale evidence');
    check(await page.locator('#wcProcessFirst').evaluate(el => document.activeElement === el), 'Process A retains native keyboard focus');
  });
  await nativeAction(page, 'Process B native selector', async () => {
    await page.locator('#wcProcessSecond').focus(); await page.locator('#wcProcessSecond').selectOption('precipitation');
  }, async state => {
    check(state.first === 'condensation' && state.second === 'precipitation', 'Process B changes its native selected process');
    check(await page.locator('#wcProcessSecond').evaluate(el => document.activeElement === el), 'Process B retains native keyboard focus');
    check(await page.locator('#wcProcessExplain').inputValue() === saved['condensation|precipitation'], 'Native selectors restore the writing saved with their ordered pair');
    check(await page.locator('#wcProcessFirst option[value="precipitation"]').isDisabled()
      && await page.locator('#wcProcessSecond option[value="condensation"]').isDisabled(), 'Native selectors retain distinct process choices');
  });
  for (const pair of [PAIRS[0], PAIRS[2]]) {
    const key = pair.join('|');
    await nativeAction(page, 'Return to written pair ' + key, async () => {
      const button = page.locator('[data-wc-process-pair="' + key + '"]'); await button.focus(); await button.press('Enter');
    }, async state => {
      check(await page.locator('#wcProcessExplain').inputValue() === saved[key], key + ' restores remembered reflection text');
      check(Object.entries(saved).every(([id, note]) => state.notes[id] === note), key + ' retains writing from all three comparisons');
    });
  }
  await audit(page, 'Native comparison controls after interactions');
}
async function capture(page, config, isBaseline) {
  const file = (isBaseline ? 'baseline-' : '') + config.label + '.png';
  const region = page.locator('.wc-process-cards');
  check(await region.count() === 1, file + ' captures the bounded paired process cards');
  await region.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
  const bytes = fs.readFileSync(path.join(OUT, file));
  report.captures.push({ file, baseline: isBaseline, sha256: hash(bytes), bytes: bytes.length, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sourceSha256: isBaseline ? BASELINE_SHA : sourceHash });
}
async function main() {
  let browser;
  try {
    check(report.publicSourceSha256 === sourceHash, 'source and public runtime start identical');
    check(source.toString('utf8').includes(diagramHelper), 'all six authored SVG process helpers remain byte identical to the frozen baseline');
    check(source.toString('utf8').includes(comparisonHelper), 'comparison science and learner state helper remain byte identical to the frozen baseline');
    const preview = await fetch('http://127.0.0.1:8770/stem_lab/stem_tool_watercycle.js', { signal: AbortSignal.timeout(20000) });
    report.nativePreview = { url: preview.url, status: preview.status, sha256: hash(Buffer.from(await preview.arrayBuffer())) };
    check(preview.ok && report.nativePreview.sha256 === sourceHash, 'native preview serves installed runtime', report.nativePreview);
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); report.serverListening = true;
    const url = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ headless: true }); report.browserLaunched = true;
    const configs = [
      { label: 'cloud-fall-1280-light', width: 1280, theme: 'light', pair: PAIRS[1] },
      { label: 'soil-store-1280-light', width: 1280, theme: 'light', pair: PAIRS[2] },
      { label: 'vapor-390-dark', width: 390, theme: 'dark', pair: PAIRS[0] },
      { label: 'soil-store-320-light', width: 320, theme: 'light', pair: PAIRS[2] },
      { label: 'cloud-fall-320-contrast', width: 320, theme: 'contrast', pair: PAIRS[1] },
      { label: 'cloud-fall-320-forced', width: 320, theme: 'contrast', pair: PAIRS[1], forced: true },
      { label: 'soil-store-390-zoom150', width: 390, theme: 'light', pair: PAIRS[2], zoom: 1.5 },
      { label: 'cloud-fall-host400', width: 1280, theme: 'light', pair: PAIRS[1], hostWidth: 400 },
    ];
    for (const entry of [...configs.map(config => ({ config, isBaseline: false })), ...[configs[6], configs[7]].map(config => ({ config, isBaseline: true }))]) {
      const { config, isBaseline } = entry;
      const label = (isBaseline ? 'baseline-' : '') + config.label;
      const context = await browser.newContext({ viewport: { width: config.width, height: 1000 }, reducedMotion: 'reduce', forcedColors: config.forced ? 'active' : 'none' });
      try {
        const page = await context.newPage(); page.setDefaultTimeout(30000);
        page.on('pageerror', error => report.errors.push(label + ': ' + String(error)));
        const scriptPath = isBaseline ? '/baseline-runtime.js' : '/stem_lab/stem_tool_watercycle.js';
        const pending = page.waitForResponse(response => response.url().endsWith(scriptPath));
        await page.goto(url + (isBaseline ? '/baseline' : '/')); const response = await pending; const loaded = hash(await response.body());
        report.loadedSources.push({ label, baseline: isBaseline, sha256: loaded });
        check(loaded === (isBaseline ? BASELINE_SHA : sourceHash), label + ' loads the intended frozen runtime bytes');
        await page.addScriptTag({ url: url + '/desktop/web-app/node_modules/axe-core/axe.min.js' });
        await mount(page, config);
        await inspect(page, config, label, isBaseline);
        if (!isBaseline) await audit(page, label);
        await capture(page, config, isBaseline);
        if (!isBaseline && config === configs[0]) await nativeChecks(page);
        await page.evaluate(() => ReactDOM.unmountComponentAtNode(document.getElementById('slot')));
        console.log('Verified ' + label); save();
      } finally { await context.close(); }
    }
    report.completed = true;
  } catch (error) { report.errors.push(error.stack || String(error)); process.exitCode = 1; }
  finally {
    if (browser) { try { await browser.close(); report.browserClosed = true; } catch (error) { report.errors.push('Browser cleanup: ' + String(error)); } }
    try { await new Promise((resolve, reject) => server.close(error => error && error.code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve())); report.serverClosed = true; }
    catch (error) { report.errors.push('Server cleanup: ' + String(error)); }
    report.finalSourceSha256 = hash(fs.readFileSync(MAIN)); report.finalPublicSourceSha256 = hash(fs.readFileSync(PUBLIC)); report.finalHarnessSha256 = hash(fs.readFileSync(__filename));
    check(report.finalSourceSha256 === sourceHash && report.finalPublicSourceSha256 === sourceHash, 'both installed runtime copies remain unchanged');
    check(report.finalHarnessSha256 === report.harnessSha256, 'QA harness remains unchanged');
    check(hash(fs.readFileSync(BASELINE)) === BASELINE_SHA, 'frozen comparison baseline remains unchanged');
    check(report.completed && report.captures.filter(capture => !capture.baseline).length === 8, 'all eight final comparison captures completed');
    check(report.captures.filter(capture => capture.baseline).length === 2, 'both matched baseline captures completed without a production swap');
    check(report.nativeActions.length === 40, 'all native pair, selector, question, answer, feedback and writing checks completed');
    check(report.browserLaunched && report.browserClosed && report.serverClosed, 'owned browser and HTTP server closed');
    report.passed = report.checks.filter(item => item.passed).length; report.failed = report.checks.length - report.passed;
    report.successful = report.completed && report.failed === 0 && report.errors.length === 0 && report.browserClosed && report.serverClosed;
    report.completedAt = new Date().toISOString(); save(); fs.writeFileSync(path.join(OUT, 'tested-harness.cjs'), harnessBytes);
    console.log(JSON.stringify({ out: OUT, sourceHash, passed: report.passed, failed: report.failed, captures: report.captures.length, nativeActions: report.nativeActions.length, errors: report.errors, browserClosed: report.browserClosed, serverClosed: report.serverClosed }));
    if (!report.successful) process.exitCode = 1;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
