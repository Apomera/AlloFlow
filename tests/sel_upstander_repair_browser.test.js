import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_upstander.js'), 'utf8');
const caseData = JSON.parse(source.match(/var REPAIR_CASES = (\{[\s\S]*?\n\});/)[1]);
const strategies = JSON.parse(source.match(/var REPAIR_STEPS = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(caseData).flatMap(([band, items]) => items.map(item => ({ band, item })));
const reports = path.join(root, 'reports/sel-upstander-repair');
let browser, page;
let errors = [];
async function mount(band = 'middle', theme = 'light', width = 1100, initial = {}, ai = false) {
  errors = [];
  await page.setViewportSize({ width, height: 900 });
  await page.goto('http://sel-depth.test/');
  await page.addStyleTag({ content: 'html,body{margin:0;font-family:system-ui,sans-serif}*{box-sizing:border-box}button,select,summary,textarea{font-family:inherit}button:focus-visible,select:focus-visible,summary:focus-visible,textarea:focus-visible{outline:3px solid #7c3aed;outline-offset:3px}' });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
  await page.addScriptTag({ path: path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
  await page.addScriptTag({ content: source });
  await page.evaluate(({ band, theme, initial, ai }) => {
    const R = window.React, noop = () => {}, Icon = () => null;
    window.depthXP = []; window.depthAnnouncements = []; window.repairRequests = [];
    function App() {
      const [data, setData] = R.useState({ upstander: { soundOn: false, activeTab: 'cycle', repairOpen: true, ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = setBand;
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: ai ? prompt => { window.repairRequests.push(prompt); return Promise.resolve("Check the contact boundary before considering any message."); } : null };
      return window.SelHub._registry.upstander.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial, ai });
  await page.getByRole('tab', { name: /Practice/ }).waitFor();
}
const guide=()=>page.getByRole('region',{name:'Repair planning practice',exact:true});
const trigger=()=>page.getByRole('button',{name:'Repair: choices, consent and follow-through',exact:true});
async function expand(band) {
  for(const step of strategies[band]) {
    const summary=guide().getByText(step.title,{exact:true});
    if(!(await summary.evaluate(node=>node.parentElement.open))) await summary.click();
  }
}

describe('Upstander repair depth', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Upstander support practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id supports every repair question without certifying repair',async({band,item})=>{
    await mount(band);
    await guide().getByLabel('Choose a repair situation',{exact:true}).selectOption(item.id);
    await expand(band);
    expect(await guide().innerText()).toContain(item.scenario);
    for(const [i,step] of strategies[band].entries()) {
      expect(await guide().innerText()).toContain(step.body);
      expect(await guide().innerText()).toContain(item.applications[i]);
      await guide().getByLabel(step.question,{exact:true}).fill('A plan for '+step.id);
    }
    const notes=await page.evaluate(key=>window.depthSnapshot.upstander.repairDrafts[key],band+':'+item.id);
    for(const step of strategies[band]) expect(notes[step.id]).toBe('A plan for '+step.id);
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(await page.evaluate(()=>window.depthSnapshot.upstander.earnedBadges?.repair_walked)).toBeUndefined();
    expect(errors).toEqual([]);
  },120000);

  it.each(Object.keys(caseData))('restores independent drafts, case choices and band state from %s',async band=>{
    await mount(band);
    await expand(band);
    for(const step of strategies[band]) await guide().getByLabel(step.question,{exact:true}).fill(band+' '+step.id+'\nKeep this line.');
    await guide().getByLabel('Choose a repair situation',{exact:true}).selectOption(caseData[band][1].id);
    await guide().getByLabel(strategies[band][0].question,{exact:true}).fill('Second case.');
    const other=band==='high'?'elementary':'high';
    await page.evaluate(other=>window.depthSetBand(other),other);
    expect(await guide().getByLabel(strategies[other][0].question,{exact:true}).inputValue()).toBe('');
    await guide().getByLabel(strategies[other][0].question,{exact:true}).fill('Other band.');
    await page.evaluate(band=>window.depthSetBand(band),band);
    expect(await guide().getByLabel('Choose a repair situation',{exact:true}).inputValue()).toBe(caseData[band][1].id);
    const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(window.depthSnapshot.upstander)));
    await mount(band,'light',1100,saved);
    expect(await guide().getByLabel(strategies[band][0].question,{exact:true}).inputValue()).toBe('Second case.');
    await guide().getByLabel('Choose a repair situation',{exact:true}).selectOption(caseData[band][0].id);
    await expand(band);
    for(const step of strategies[band]) expect(await guide().getByLabel(step.question,{exact:true}).inputValue()).toBe(band+' '+step.id+'\nKeep this line.');
    expect(saved.repairDrafts[other+':'+caseData[other][0].id].stop).toBe('Other band.');
    expect(errors).toEqual([]);
  },120000);

  it('handles invalid old steps and malformed drafts while preserving historical records',async()=>{
    const legacy={repairStep:-3,repairCaseSelections:{middle:'missing'},repairDrafts:{'middle:rumor':{stop:42}},earnedBadges:{repair_walked:{ts:123}},apHurt:'Earlier situation',apDraft:'Earlier draft',apFeedback:'Earlier feedback'};
    await mount('middle','light',1100,legacy);
    expect(await guide().getByLabel('Choose a repair situation',{exact:true}).inputValue()).toBe('rumor');
    expect(await guide().getByLabel(strategies.middle[0].question,{exact:true}).inputValue()).toBe('');
    await guide().getByLabel(strategies.middle[0].question,{exact:true}).fill('New optional plan.');
    expect(await page.evaluate(()=>window.depthSnapshot.upstander)).toMatchObject({repairStep:-3,earnedBadges:legacy.earnedBadges,apHurt:legacy.apHurt,apDraft:legacy.apDraft,apFeedback:legacy.apFeedback});
    await mount('middle','light',1100,{repairStep:3,repairCaseSelections:[],repairDrafts:[]});
    expect(await guide().getByText(strategies.middle[3].title,{exact:true}).evaluate(node=>node.parentElement.open)).toBe(true);
    expect(errors).toEqual([]);
  },120000);

  it('keeps keyboard focus and closes without awarding completion or losing notes',async()=>{
    await mount();
    const picker=guide().getByLabel('Choose a repair situation',{exact:true});
    await picker.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await picker.evaluate(node=>node===document.activeElement)).toBe(true);
    await guide().getByLabel(strategies.middle[0].question,{exact:true}).fill('Keep after close.');
    await guide().getByRole('button',{name:'Close repair guide',exact:true}).focus();await page.keyboard.press('Enter');
    expect(await trigger().getAttribute('aria-expanded')).toBe('false');
    expect(await trigger().evaluate(node=>node===document.activeElement)).toBe(true);
    await page.keyboard.press('Enter');
    expect(await guide().getByLabel(strategies.middle[0].question,{exact:true}).inputValue()).toBe('Keep after close.');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(await page.evaluate(()=>window.depthSnapshot.upstander.earnedBadges?.repair_walked)).toBeUndefined();
    expect(errors).toEqual([]);
  },120000);

  it('keeps AI feedback explicit and frames it as an unsent consent-aware draft without rewards',async()=>{
    await mount('high','light',1100,{},true);
    await page.getByRole('button',{name:/Rehearse your apology with AI feedback/}).click();
    await page.getByLabel('Fictional situation (omit identifying details)',{exact:true}).fill('A fictional peer asked for no contact.');
    await page.getByLabel('Optional apology draft for feedback',{exact:true}).fill('I shared information without permission.');
    expect(await page.evaluate(()=>window.repairRequests)).toEqual([]);
    expect(await page.getByText(/Requesting feedback sends the situation and draft/).innerText()).toContain('A draft can stay unsent');
    await page.getByRole('button',{name:'Get coach feedback',exact:true}).click();
    await page.getByText('Check the contact boundary before considering any message.',{exact:true}).waitFor();
    const requests=await page.evaluate(()=>window.repairRequests);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('Respect refusal, silence and no-contact directions');
    expect(requests[0]).toContain('Do not predict how the recipient will respond');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports readable phone repair planning in %s',async theme=>{
    await mount('high',theme,320);
    await expand('high');
    await guide().getByLabel(strategies.high[2].question,{exact:true}).fill('Respect no contact, including messages through friends.');
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await guide().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-repair-axe.json'),JSON.stringify(violations,null,2));
    expect(violations).toEqual([]);
    expect(await guide().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await guide().locator('button:visible,summary:visible,select:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    await guide().getByRole('heading',{level:2}).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-overview-phone.png')});
    await guide().getByText(strategies.high[2].title,{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-consent-phone.png')});
    expect(errors).toEqual([]);
  },120000);
});
