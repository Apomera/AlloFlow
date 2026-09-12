import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_upstander.js'), 'utf8');
const caseData = JSON.parse(source.match(/var SCENARIOS = (\{[\s\S]*?\n\});/)[1]);
const strategies = JSON.parse(source.match(/var UPSTANDER_MOVES = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(caseData).flatMap(([band, items]) => items.map(item => ({ band, item })));
const reports = path.join(root, 'reports/sel-upstander-depth');
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
      const [data, setData] = R.useState({ upstander: { soundOn: false, activeTab: 'practice', ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = setBand;
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: null };
      return window.SelHub._registry.upstander.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Practice/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Upstander support practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.upstander.practiceCases?.[id], id);

describe('Upstander support depth', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Upstander support practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id supports both contextual routes and a review without scoring',async ({band,item}) => {
    await mount(band);
    await map().getByLabel('Choose an upstander scenario',{exact:true}).selectOption(item.id);
    for(const key of ['situation','known','unknown','needs']) expect(await map().innerText()).toContain(item[key]);
    await map().getByText('2. Compare approaches and their limits',{exact:true}).click();
    for(const option of item.options) {
      for(const key of ['response','fit','limit']) expect(await map().innerText()).toContain(option[key]);
      await map().getByRole('button',{name:'Explore: '+option.label,exact:true}).click();
      expect((await draft(band+':'+item.id)).choice).toBe(option.id);
    }
    await map().getByRole('button',{name:'Explore new information',exact:true}).click();
    expect(await map().innerText()).toContain(item.change);
    await map().getByText('Consider a follow-through check',{exact:true}).click();
    expect(await map().innerText()).toContain(item.review);
    expect((await draft(band+':'+item.id)).first).toBeUndefined();
    expect(await page.evaluate(()=>window.depthSnapshot.upstander.pracDone)).toBeUndefined();
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it.each(Object.keys(strategies))('exposes all six contextual strategy cards for %s',async band => {
    await mount(band,'light',1100,{activeTab:'moves'});
    const guide=page.getByRole('region',{name:'Contextual upstander strategies',exact:true});
    for(const [index,item] of strategies[band].entries()) {
      if(index!==0) await guide.getByText(item.move,{exact:true}).click();
      for(const key of ['desc','fit','limit']) expect(await guide.innerText()).toContain(item[key]);
    }
    expect(await guide.innerText()).not.toContain('Higher-risk moves');
    expect(await guide.locator('details').count()).toBe(6);
    expect(errors).toEqual([]);
  },120000);

  it('preserves independent first and revised routes and notes through case, band and serialized restoration',async () => {
    await mount();
    await map().getByLabel('Your first support plan (optional)',{exact:true}).fill('Ask an adult to help.\nOffer company only if wanted.');
    await map().getByText('2. Compare approaches and their limits',{exact:true}).click();
    await map().getByRole('button',{name:'Explore: Offer support while help is sought',exact:true}).click();
    await map().getByLabel('Who should help, and what do they need to know? (optional)',{exact:true}).fill('A nearby adult needs to know about the shove and location.');
    await map().getByRole('button',{name:'Explore new information',exact:true}).click();
    await map().getByLabel('A route after the change (optional)',{exact:true}).selectOption('a');
    await map().getByLabel('What would you keep or change, and why? (optional)',{exact:true}).fill('Get help to the student; do not move them myself.');
    await map().getByText('Consider a follow-through check',{exact:true}).click();
    await map().getByLabel('What would tell you that more support is needed? (optional)',{exact:true}).fill('No adult has arrived yet.');
    await map().getByLabel('Choose an upstander scenario',{exact:true}).selectOption('gym_mock');
    await map().getByLabel('Your first support plan (optional)',{exact:true}).fill('A separate gym plan.');
    await page.evaluate(()=>window.depthSetBand('elementary'));
    await map().getByLabel('Your first support plan (optional)',{exact:true}).fill('Ask before offering company at lunch.');
    await page.evaluate(()=>window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose an upstander scenario',{exact:true}).inputValue()).toBe('gym_mock');
    const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(window.depthSnapshot.upstander)));
    await mount('middle','light',1100,saved);
    await map().getByLabel('Choose an upstander scenario',{exact:true}).selectOption('locker_push');
    expect(await map().getByLabel('Your first support plan (optional)',{exact:true}).inputValue()).toBe('Ask an adult to help.\nOffer company only if wanted.');
    expect(await map().getByLabel('A route after the change (optional)',{exact:true}).inputValue()).toBe('a');
    expect(await map().getByLabel('What would you keep or change, and why? (optional)',{exact:true}).inputValue()).toContain('do not move');
    expect((await draft('middle:locker_push')).choice).toBe('b');
    expect((await draft('middle:locker_push')).followup).toContain('arrived');
    expect((await draft('elementary:lunch_alone')).first).toContain('Ask before');
    await map().getByText('2. Compare approaches and their limits',{exact:true}).click();
    await map().getByRole('button',{name:'Selected: Offer support while help is sought',exact:true}).click();
    expect((await draft('middle:locker_push')).choice).toBe('');
    expect((await draft('middle:locker_push')).revisedChoice).toBe('a');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('retains historical ratings without assigning old choices to different new routes',async () => {
    await mount('middle','light',1100,{pracIdx:2,pracChoice:3,pracDone:{gym_mock:3},earnedBadges:{practice_courage:{id:'practice_courage',ts:123}}});
    expect(await map().getByLabel('Choose an upstander scenario',{exact:true}).inputValue()).toBe('gym_mock');
    await map().getByText('Earlier practice records are retained',{exact:true}).click();
    expect(await map().innerText()).toContain('older rated answers are not assigned');
    await map().getByText('2. Compare approaches and their limits',{exact:true}).click();
    expect(await map().getByRole('button',{name:/^Selected: /}).count()).toBe(0);
    await map().getByRole('button',{name:'Explore: Ask the teacher to act',exact:true}).click();
    expect(await page.evaluate(()=>window.depthSnapshot.upstander)).toMatchObject({pracChoice:3,pracDone:{gym_mock:3},earnedBadges:{practice_courage:{ts:123}}});
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('respects saved tabs, keeps keyboard focus and falls back safely for malformed state',async () => {
    await mount('middle','light',1100,{activeTab:'moves'});
    expect(await page.getByRole('tab',{name:/Upstander Moves/}).getAttribute('aria-selected')).toBe('true');
    await mount('middle','light',1100,{pracIdx:-1,practiceSelections:{middle:'unknown'},practiceCases:{'middle:locker_push':{first:42,choice:'bad',revisedChoice:[]}}});
    expect(await map().getByLabel('Your first support plan (optional)',{exact:true}).inputValue()).toBe('');
    const picker=map().getByLabel('Choose an upstander scenario',{exact:true});
    await picker.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await picker.evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByText('2. Compare approaches and their limits',{exact:true}).click();
    await map().getByRole('button',{name:/^Explore: /}).first().focus();await page.keyboard.press('Enter');
    expect(await map().getByRole('button',{name:/^Selected: /}).evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByRole('button',{name:'Explore new information',exact:true}).focus();await page.keyboard.press('Enter');
    expect(await map().getByRole('button',{name:'New information shown',exact:true}).evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByLabel('A route after the change (optional)',{exact:true}).selectOption('different');
    expect(await map().getByLabel('A route after the change (optional)',{exact:true}).inputValue()).toBe('different');
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports readable phone practice and strategy guidance in %s',async theme => {
    await mount('high',theme,320);
    await map().getByLabel('Choose an upstander scenario',{exact:true}).selectOption('ally_target');
    await map().getByText('2. Compare approaches and their limits',{exact:true}).click();
    await map().locator('#up-practice-option-a').evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-comparison-phone.png')});
    await map().getByRole('button',{name:'Explore: Ask about support and privacy',exact:true}).click();
    await map().getByRole('button',{name:'Explore new information',exact:true}).click();
    await map().getByLabel('A route after the change (optional)',{exact:true}).selectOption('different');
    await map().getByLabel('What would you keep or change, and why? (optional)',{exact:true}).fill('Seek another trusted support route and explain the privacy and retaliation concerns.');
    await map().getByText('Consider a follow-through check',{exact:true}).click();
    await map().locator('#up-practice-change-title').evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-revision-phone.png')});
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    async function audit(region,name) {
      const violations=await region.evaluate(async node=>(await window.axe.run(node)).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));
      fs.writeFileSync(path.join(reports,theme+'-'+name+'-axe.json'),JSON.stringify(violations,null,2));
      expect(violations).toEqual([]);
      expect(await region.evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
      expect(await region.locator('button:visible,select:visible,summary:visible').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44))).toBe(true);
    }
    await audit(map(),'practice');
    await page.getByRole('tab',{name:/Upstander Moves/}).click();
    const guide=page.getByRole('region',{name:'Contextual upstander strategies',exact:true});
    for(const item of strategies.high.slice(1)) await guide.getByText(item.move,{exact:true}).click();
    await guide.getByText(strategies.high[0].move,{exact:true}).evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-strategies-phone.png')});
    await audit(guide,'strategies');
    expect(errors).toEqual([]);
  },120000);
});
