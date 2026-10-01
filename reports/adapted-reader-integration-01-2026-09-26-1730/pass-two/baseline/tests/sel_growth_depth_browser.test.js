import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_growthmindset.js'), 'utf8');
const caseData = JSON.parse(source.match(/var REFRAMES = (\{[\s\S]*?\n\});/)[1]);
const learningIdeas = JSON.parse(source.match(/var BRAIN_FACTS = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(caseData).flatMap(([band, items]) => items.map(item => ({ band, item })));
const reports = path.join(root, 'reports/sel-growth-depth');
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
    window.depthXP = []; window.depthAnnouncements = [];
    function App() {
      const [data, setData] = R.useState({ growthmindset: { soundEnabled: false, ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = setBand;
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: null };
      return window.SelHub._registry.growthmindset.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Reframe It/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Grounded reframe practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.growthmindset.practiceDrafts?.[id], id);

describe('Grounded reframe depth', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Grounded reframe practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id supports evidence, a model, support and changed context without compulsory writing', async ({band,item}) => {
    await mount(band);
    await map().getByLabel('Choose a reframe scenario',{exact:true}).selectOption(item.id);
    for (const key of ['context','thought','valid','check']) expect(await map().innerText()).toContain(item[key]);
    await map().getByRole('button',{name:'Compare a grounded example',exact:true}).click();
    expect(await map().innerText()).toContain(item.model);
    await map().getByText('2. Choose a strategy, support or pause',{exact:true}).click();
    await map().getByText('Explore a step and support for this case',{exact:true}).click();
    for (const key of ['step','support','review']) expect(await map().innerText()).toContain(item[key]);
    await map().getByRole('button',{name:'Explore a changed situation',exact:true}).click();
    expect(await map().innerText()).toContain(item.change);
    expect((await draft(item.id)).first).toBeUndefined();
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(await page.evaluate(() => window.depthSnapshot.growthmindset.reframeScore)).toBeUndefined();
    expect(errors).toEqual([]);
  },120000);

  it('preserves first and revised writing, independent cases and bands, routes and serialized restoration',async () => {
    await mount();
    await map().getByLabel('Choose a reframe scenario',{exact:true}).selectOption('m3');
    await map().getByLabel('A fair response to the thought (optional)',{exact:true}).fill('Ask which criterion was used.\nKeep the valid concern.');
    await map().getByRole('button',{name:'Compare a grounded example',exact:true}).click();
    await map().getByText('2. Choose a strategy, support or pause',{exact:true}).click();
    const routes = map().getByLabel('A route to explore (optional)',{exact:true});
    for (const value of ['adjust','support','pause','change']) {
      await routes.selectOption(value);
      expect((await draft('m3')).route).toBe(value);
      expect(await map().getByRole('status').innerText()).not.toContain('More than one route');
    }
    await map().getByLabel('A step or support that fits (optional)',{exact:true}).fill('Ask a trusted adult to help review the rubric.');
    await map().getByRole('button',{name:'Explore a changed situation',exact:true}).click();
    await map().getByLabel('What would you keep or change now? (optional)',{exact:true}).fill('Use the valid correction and still ask about the unexplained concern.');
    await map().getByLabel('Choose a reframe scenario',{exact:true}).selectOption('m4');
    await map().getByLabel('A fair response to the thought (optional)',{exact:true}).fill('A separate case.');
    await page.evaluate(() => window.depthSetBand('high'));
    await map().getByLabel('Choose a reframe scenario',{exact:true}).selectOption('h6');
    await page.evaluate(() => window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose a reframe scenario',{exact:true}).inputValue()).toBe('m4');
    const saved=await page.evaluate(() => JSON.parse(JSON.stringify(window.depthSnapshot.growthmindset)));
    await mount('middle','light',1100,saved);
    await map().getByLabel('Choose a reframe scenario',{exact:true}).selectOption('m3');
    expect(await map().getByLabel('A fair response to the thought (optional)',{exact:true}).inputValue()).toBe('Ask which criterion was used.\nKeep the valid concern.');
    expect(await map().getByLabel('What would you keep or change now? (optional)',{exact:true}).inputValue()).toContain('unexplained concern');
    await map().getByText('2. Choose a strategy, support or pause',{exact:true}).click();
    expect(await routes.inputValue()).toBe('change');
    expect(await map().getByLabel('A step or support that fits (optional)',{exact:true}).inputValue()).toContain('trusted adult');
    await routes.selectOption(''); expect((await draft('m3')).route).toBe('');
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('recovers unassigned legacy notes without replacing current writing or historic totals',async () => {
    await mount('middle','light',1100,{reframeIdx:2,reframeInput:'Older response',reframeScore:4,reframeTotal:5,practiceDrafts:{m3:{first:'Current response'}}});
    expect(await map().getByLabel('Choose a reframe scenario',{exact:true}).inputValue()).toBe('m3');
    await map().getByText('An earlier unassigned response is available',{exact:true}).click();
    await map().getByRole('button',{name:'Copy earlier response into an empty draft',exact:true}).click();
    expect((await draft('m3')).first).toBe('Current response');
    await map().getByLabel('A fair response to the thought (optional)',{exact:true}).fill('');
    await map().getByRole('button',{name:'Copy earlier response into an empty draft',exact:true}).click();
    expect((await draft('m3')).first).toBe('Older response');
    expect(await page.evaluate(() => window.depthSnapshot.growthmindset)).toMatchObject({reframeInput:'Older response',reframeScore:4,reframeTotal:5});
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('retains keyboard focus, saved tab selection and safe fallbacks for malformed drafts',async () => {
    await mount('middle','light',1100,{activeTab:'brain'});
    expect(await page.getByRole('heading',{name:'Conditions for learning',exact:true}).isVisible()).toBe(true);
    await page.getByRole('tab',{name:/Reframe It/}).click();
    await mount('middle','light',1100,{reframeIdx:-1,practiceSelected:{middle:'unknown'},practiceDrafts:{m1:{first:7,route:'bad'}}});
    expect(await map().getByLabel('A fair response to the thought (optional)',{exact:true}).inputValue()).toBe('');
    const picker=map().getByLabel('Choose a reframe scenario',{exact:true});
    await picker.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    expect(await picker.evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByRole('button',{name:'Compare a grounded example',exact:true}).focus(); await page.keyboard.press('Enter');
    expect(await map().getByRole('button',{name:'Example is open',exact:true}).evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByRole('button',{name:'Explore a changed situation',exact:true}).focus(); await page.keyboard.press('Enter');
    expect(await map().getByRole('button',{name:'Changed situation shown',exact:true}).evaluate(node=>node===document.activeElement)).toBe(true);
    expect(errors).toEqual([]);
  },120000);

  it.each(Object.keys(learningIdeas))('renders all five corrected learning ideas for %s',async band => {
    await mount(band,'light',1100,{activeTab:'brain'});
    for (const idea of learningIdeas[band]) {
      expect(await page.getByRole('heading',{name:idea.title,exact:true}).isVisible()).toBe(true);
      expect(await page.getByText(idea.text,{exact:true}).isVisible()).toBe(true);
      await page.getByRole('button',{name:'Next →',exact:true}).click();
    }
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports phone reading, optional plans and revision in %s',async theme => {
    await mount('middle',theme,320);
    await map().getByLabel('Choose a reframe scenario',{exact:true}).selectOption('m3');
    await map().getByRole('button',{name:'Compare a grounded example',exact:true}).click();
    await map().locator('#gm-practice-case-title').evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-evidence-phone.png')});
    await map().getByLabel('A fair response to the thought (optional)',{exact:true}).fill('I can ask for a specific example.');
    await map().getByText('2. Choose a strategy, support or pause',{exact:true}).click();
    await map().getByText('Explore a step and support for this case',{exact:true}).click();
    await map().getByLabel('A route to explore (optional)',{exact:true}).selectOption('support');
    await map().getByRole('button',{name:'Explore a changed situation',exact:true}).click();
    await map().getByLabel('What would you keep or change now? (optional)',{exact:true}).fill('Use the correction and ask for clarification about the other concern.');
    await map().locator('#gm-practice-change-title').evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-revision-phone.png')});
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations=await map().evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));
    expect(violations).toEqual([]);
    expect(await map().evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
    expect(await map().locator('button:visible,select:visible,summary:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    expect(errors).toEqual([]);
  },120000);
});
