import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_strengths.js'), 'utf8');
const cases = JSON.parse(source.match(/var OBSERVATION_CASES = (\[[\s\S]*?\n\]);/)[1]);
const examples = ['elementary','middle','high'].flatMap(band=>cases.map(item=>({band,id:item.id,item})));
const reports = path.join(root, 'reports/sel-strengths-spot');
let browser, page;
let errors = [];
async function mount(band = 'middle', theme = 'light', width = 1100, initial = {}) {
  errors = [];
  await page.setViewportSize({ width, height: 900 });
  await page.goto('http://sel-depth.test/');
  await page.addStyleTag({ content: 'html,body{margin:0;font-family:system-ui,sans-serif}*{box-sizing:border-box}button,select,summary,textarea{font-family:inherit}button:focus-visible,select:focus-visible,summary:focus-visible,textarea:focus-visible{outline:3px solid #7c3aed;outline-offset:3px}' });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
  await page.addScriptTag({ content: source });
  await page.evaluate(({ band, theme, initial }) => {
    const R = window.React, noop = () => {}, Icon = () => null;
    window.speechCalls = []; window.coachFlags = []; window.coachMode = 'ok'; window.depthXP = []; window.depthAnnouncements = []; window.depthCoachCalls = [];
    function App() {
      const [data, setData] = R.useState({ strengths: { tab: 'quiz', ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = next => window.ReactDOM.flushSync(() => setBand(next));
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, setToolData: setData, gradeLevel: {elementary:'4',middle:'7',high:'11'}[gradeBand] || '7',
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        callTTS: text=>{window.speechCalls.push(text);return Promise.resolve(null);}, onSafetyFlag: flag => window.coachFlags.push(flag), addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: initial.offline ? null : prompt => { window.depthCoachCalls.push(prompt); if(window.coachMode==='throw')throw new Error('Mock failure'); if(window.coachMode==='reject')return Promise.reject(new Error('Mock failure')); if(window.coachMode==='empty')return Promise.resolve('  '); if(window.coachMode==='pending')return new Promise(resolve=>{window.resolveCoach=resolve;}); return Promise.resolve('A mocked coach response.'); } };
      return window.SelHub._registry.strengths.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Spot Strengths/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Spot Strengths evidence practice', exact: true });

describe('Spot Strengths evidence practice', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Spot Strengths practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);










  const select=()=>map().getByLabel('Choose an observation to explore',{exact:true});
  const state=()=>page.evaluate(()=>window.depthSnapshot.strengths);
  const open=text=>map().getByText(text,{exact:true}).click();
  const labels=['What did I observe, and what strength language might fit?','What else would I need to ask or observe?'];
  const group=claim=>map().getByRole('group',{name:claim.text,exact:true});
  const choose=async(claim,kind)=>{await group(claim).getByRole('combobox').selectOption(kind);await group(claim).getByRole('button',{name:'Compare my reasoning',exact:true}).click();};

  it.each(examples)('$band / $id supports evidence, interpretation and reconsideration without scoring',async({band,id,item})=>{
    await mount(band);await select().selectOption(id);expect(await map().innerText()).toContain(item.setup[band]);
    for(const claim of item.claims){expect(await group(claim).getByRole('button').isDisabled()).toBe(true);await choose(claim,claim.kind);expect(await group(claim).getByRole('status').innerText()).toContain('This matches the authored interpretation.');expect(await group(claim).getByRole('status').innerText()).toContain(claim.why);}
    await open('Ask and reconsider');for(const text of [item.question,item.changed,item.review])expect(await map().innerText()).toContain(text);
    const saved=await state();for(const key of ['quizScore','quizBest','quizDone','selectedStrengths'])expect(saved[key]).toBeUndefined();expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('explains another distinction and clears stale feedback when the choice changes',async()=>{
    await mount();const claim=cases[0].claims[0];await choose(claim,'unknown');expect(await group(claim).getByRole('status').innerText()).toContain('Consider a different distinction.');expect(await group(claim).getByRole('status').innerText()).toContain(claim.why);await group(claim).getByRole('combobox').selectOption('shown');expect(await group(claim).getByRole('status').count()).toBe(0);await group(claim).getByRole('button').click();expect(await group(claim).getByRole('status').innerText()).toContain('This matches');await group(claim).getByRole('combobox').selectOption('');expect(await group(claim).getByRole('button').isDisabled()).toBe(true);expect(await group(claim).getByRole('status').count()).toBe(0);expect(errors).toEqual([]);
  },120000);

  it('keeps case and grade answers and optional notes separate through remount',async()=>{
    await mount();await choose(cases[0].claims[0],'shown');await open('Try an observation of my own (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('My observation\nSecond line');await select().selectOption('effort');expect(await group(cases[1].claims[0]).getByRole('combobox').inputValue()).toBe('');await open('Try an observation of my own (optional)');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await select().selectOption('own');expect(await map().locator('div[role="group"]').count()).toBe(0);await open('Try an observation of my own (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Own only');await page.evaluate(()=>window.depthSetBand('high'));await open('Try an observation of my own (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('High only');await page.evaluate(()=>window.depthSetBand('middle'));expect(await select().inputValue()).toBe('own');await select().selectOption('help');await mount('middle','light',1100,await state());expect(await group(cases[0].claims[0]).getByRole('status').innerText()).toContain('This matches');await open('Review my observation notes');const preview=map().getByLabel('Observation notes to review or copy',{exact:true});expect(await preview.getAttribute('readonly')).not.toBeNull();expect(await preview.inputValue()).toContain('My observation\nSecond line');expect(await preview.inputValue()).not.toMatch(/Own only|High only/);expect(errors).toEqual([]);
  },120000);

  it('preserves legacy quiz records, selected strengths and awards',async()=>{
    const legacy={quizActive:true,quizIdx:3,quizScore:4,quizBest:8,quizDone:true,quizFeedback:{correct:true},_quizOptions:['kind','brave'],selectedStrengths:[{id:'kind',label:'Kindness',category:'character'}],badges:{firstCard:true,firstQuiz:true,perfectQuiz:true}};await mount('middle','light',1100,legacy);await open('Earlier quiz activity');expect(await map().innerText()).toContain('Earlier quiz progress, answers, scores and awards remain stored.');await choose(cases[0].claims[0],'shown');const saved=await state();for(const [key,value]of Object.entries(legacy))expect(saved[key]).toEqual(value);expect(await page.evaluate(()=>window.depthXP)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it('recovers malformed records, preserves unknown properties and supports keyboard controls',async()=>{
    await mount('middle','light',1100,{observationSelections:{middle:'__proto__'},observationDrafts:{'middle:help':{evidence:42,extra:'keep',answers:{asked:{choice:'__proto__',reviewed:'__proto__',extra:'retain'}}}}});expect(await select().inputValue()).toBe('help');const claim=cases[0].claims[0];expect(await group(claim).getByRole('combobox').inputValue()).toBe('');expect(await group(claim).getByRole('status').count()).toBe(0);await group(claim).getByRole('combobox').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');await page.keyboard.press('Enter');expect(await group(claim).getByRole('status').count()).toBe(1);await map().getByText('Try an observation of my own (optional)',{exact:true}).focus();await page.keyboard.press('Enter');expect(await map().getByLabel(labels[0]+' (optional)',{exact:true}).inputValue()).toBe('');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('Observed');const saved=(await state()).observationDrafts['middle:help'];expect(saved.extra).toBe('keep');expect(saved.answers.asked.extra).toBe('retain');await mount('middle','light',1100,{observationSelections:[],observationDrafts:[]});await choose(claim,'shown');expect((await state()).observationDrafts['middle:help'].answers.asked.reviewed).toBe('shown');expect(errors).toEqual([]);
  },120000);

  it('narrates only the selected example and does not send notes to a coach',async()=>{
    await mount();await select().selectOption('listen');await open('Try an observation of my own (optional)');await map().getByLabel(labels[0]+' (optional)',{exact:true}).fill('PRIVATE_NOTE');await map().getByRole('button',{name:'Read observation aloud',exact:true}).click();expect(await page.evaluate(()=>window.speechCalls)).toEqual([cases.find(c=>c.id==='listen').setup.middle]);expect(await page.evaluate(()=>window.depthCoachCalls)).toEqual([]);expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('keeps reasoning and notes accessible at 320px in %s',async theme=>{
    await mount('high',theme,320);await select().selectOption('fairness');await choose(cases[3].claims[0],'unknown');for(const title of ['Ask and reconsider','Try an observation of my own (optional)','Review my observation notes'])await open(title);await map().getByLabel(labels[1]+' (optional)',{exact:true}).fill('Ask what format would help.');await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));expect(violations).toEqual([]);expect(await map().evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);expect(await map().locator('select:visible,button:visible,summary:visible,textarea:visible').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44))).toBe(true);for(const [text,name]of [['Notice actions and consider meaning','context'],[cases[3].claims[0].text,'reasoning'],['Try an observation of my own (optional)','notes']]){await map().getByText(text,{exact:true}).evaluate(n=>n.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(reports,theme+'-'+name+'-phone.png')});}expect(errors).toEqual([]);
  },120000);
});
