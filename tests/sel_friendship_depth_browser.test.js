import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_friendship.js'), 'utf8');
const caseData = JSON.parse(source.match(/var DIGITAL_DILEMMAS = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(caseData).flatMap(([band, items]) => items.map(item => ({ band, item })));
const reports = path.join(root, 'reports/sel-friendship-depth');
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
      const [data, setData] = R.useState({ friendship: { soundEnabled: false, ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = setBand;
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: null };
      return window.SelHub._registry.friendship.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Digital/ }).waitFor();
  if (!initial.activeTab) await page.getByRole('tab', { name: /Digital/ }).click();
}
const map = () => page.getByRole('region', { name: 'Digital friendship choices', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.friendship.digitalCases?.[id], id);

describe('Digital friendship depth', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Digital friendship choices</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id compares both responses and revisits context without compulsory writing',async ({band,item}) => {
    await mount(band);
    await map().getByLabel('Choose a digital friendship scenario',{exact:true}).selectOption(item.id);
    for(const key of ['situation','known','unknown','needs']) expect(await map().innerText()).toContain(item[key]);
    await map().getByText('2. Compare approaches and their limits',{exact:true}).click();
    for(const option of item.options) {
      for(const key of ['response','fit','limit']) expect(await map().innerText()).toContain(option[key]);
      await map().getByRole('button',{name:'Explore: '+option.label,exact:true}).click();
      expect((await draft(band+':'+item.id)).choice).toBe(option.id);
      expect(await map().getByRole('button',{name:'Selected: '+option.label,exact:true}).getAttribute('aria-pressed')).toBe('true');
    }
    await map().getByRole('button',{name:'Explore new information',exact:true}).click();
    expect(await map().innerText()).toContain(item.change);
    await map().getByText('Consider a follow-through check',{exact:true}).click();
    expect(await map().innerText()).toContain(item.review);
    expect((await draft(band+':'+item.id)).first).toBeUndefined();
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(await page.evaluate(()=>window.depthSnapshot.friendship.digitalDone)).toBeUndefined();
    expect(errors).toEqual([]);
  },120000);

  it('keeps separate first and revised choices, independent cases and bands, and restored drafts',async () => {
    await mount();
    await map().getByLabel('Your first response or no-contact plan (optional)',{exact:true}).fill('I can seek support elsewhere.\nI do not know why there is no reply.');
    await map().getByText('2. Compare approaches and their limits',{exact:true}).click();
    await map().getByRole('button',{name:'Explore: Send an optional check-in',exact:true}).click();
    await map().getByLabel('Who needs information, and what should stay private? (optional)',{exact:true}).fill('No forwarding the personal message to the group.');
    await map().getByRole('button',{name:'Explore new information',exact:true}).click();
    await map().getByLabel('A route after the change (optional)',{exact:true}).selectOption('b');
    await map().getByLabel('What would you keep or change, and why? (optional)',{exact:true}).fill('Respect the support limit and contact someone else.');
    await map().getByText('Consider a follow-through check',{exact:true}).click();
    await map().getByLabel('What would tell you that more support is needed? (optional)',{exact:true}).fill('My need for support continues.');
    expect((await draft('middle:left_on_read')).choice).toBe('a');
    await map().getByLabel('Choose a digital friendship scenario',{exact:true}).selectOption('screenshot');
    await map().getByLabel('Your first response or no-contact plan (optional)',{exact:true}).fill('A separate privacy case.');
    await page.evaluate(()=>window.depthSetBand('elementary'));
    await map().getByLabel('Your first response or no-contact plan (optional)',{exact:true}).fill('An elementary response.');
    await page.evaluate(()=>window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose a digital friendship scenario',{exact:true}).inputValue()).toBe('screenshot');
    const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(window.depthSnapshot.friendship)));
    await mount('middle','light',1100,saved);
    await map().getByLabel('Choose a digital friendship scenario',{exact:true}).selectOption('left_on_read');
    expect(await map().getByLabel('Your first response or no-contact plan (optional)',{exact:true}).inputValue()).toBe('I can seek support elsewhere.\nI do not know why there is no reply.');
    expect(await map().getByLabel('A route after the change (optional)',{exact:true}).inputValue()).toBe('b');
    expect(await map().getByLabel('What would you keep or change, and why? (optional)',{exact:true}).inputValue()).toContain('support limit');
    await map().getByText('2. Compare approaches and their limits',{exact:true}).click();
    expect(await map().getByLabel('Who needs information, and what should stay private? (optional)',{exact:true}).inputValue()).toContain('No forwarding');
    await map().getByRole('button',{name:'Selected: Send an optional check-in',exact:true}).click();
    expect((await draft('middle:left_on_read')).choice).toBe('');
    expect((await draft('middle:left_on_read')).revisedChoice).toBe('b');
    expect((await draft('middle:left_on_read')).followup).toContain('continues');
    expect((await draft('elementary:tone')).first).toBe('An elementary response.');
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('copies only into an empty response and preserves the original legacy draft and exploration totals',async () => {
    await mount('middle','light',1100,{digitalIdx:2,digitalDraft:'Older digital response',digitalDone:{screenshot:true},digitalCases:{'middle:screenshot':{first:'Current response'}}});
    expect(await map().getByLabel('Choose a digital friendship scenario',{exact:true}).inputValue()).toBe('screenshot');
    await map().getByText('An earlier unassigned digital draft is available',{exact:true}).click();
    const copy=map().getByRole('button',{name:'Copy earlier writing into an empty draft',exact:true});
    await copy.click();expect((await draft('middle:screenshot')).first).toBe('Current response');
    await map().getByLabel('Your first response or no-contact plan (optional)',{exact:true}).fill('');
    await copy.click();expect((await draft('middle:screenshot')).first).toBe('Older digital response');
    expect(await page.evaluate(()=>window.depthSnapshot.friendship)).toMatchObject({digitalDraft:'Older digital response',digitalDone:{screenshot:true}});
    expect(await page.evaluate(()=>window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  },120000);

  it('respects saved navigation, retains keyboard focus and safely handles malformed drafts',async () => {
    await mount('middle','light',1100,{activeTab:'compass'});
    expect(await page.getByRole('tab',{name:/Ways to Care/}).getAttribute('aria-selected')).toBe('true');
    await page.getByRole('tab',{name:/Digital/}).click();
    await mount('middle','light',1100,{digitalIdx:-1,digitalSelections:{middle:'unknown'},digitalCases:{'middle:left_on_read':{first:7,choice:'invalid',revisedChoice:[]}}});
    expect(await map().getByLabel('Your first response or no-contact plan (optional)',{exact:true}).inputValue()).toBe('');
    const picker=map().getByLabel('Choose a digital friendship scenario',{exact:true});
    await picker.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    expect(await picker.evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByText('2. Compare approaches and their limits',{exact:true}).click();
    const choice=map().getByRole('button',{name:/^Explore: /}).first();
    await choice.focus();await page.keyboard.press('Enter');
    expect(await map().getByRole('button',{name:/^Selected: /}).evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByRole('button',{name:'Explore new information',exact:true}).focus();await page.keyboard.press('Enter');
    expect(await map().getByRole('button',{name:'New information shown',exact:true}).evaluate(node=>node===document.activeElement)).toBe(true);
    await map().getByLabel('A route after the change (optional)',{exact:true}).selectOption('different');
    expect(await map().getByLabel('A route after the change (optional)',{exact:true}).inputValue()).toBe('different');
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports phone comparison and reflection in %s',async theme => {
    await mount('middle',theme,320);
    await map().getByLabel('Choose a digital friendship scenario',{exact:true}).selectOption('screenshot');
    await map().getByText('2. Compare approaches and their limits',{exact:true}).click();
    await map().locator('#fr-digital-option-a').evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-comparison-phone.png')});
    await map().getByRole('button',{name:'Explore: Help through a trusted route',exact:true}).click();
    await map().getByRole('button',{name:'Explore new information',exact:true}).click();
    await map().getByLabel('A route after the change (optional)',{exact:true}).selectOption('b');
    await map().getByLabel('What would you keep or change, and why? (optional)',{exact:true}).fill('Help them reach a trusted adult without sharing the screenshot around the group.');
    await map().getByText('Consider a follow-through check',{exact:true}).click();
    await map().locator('#fr-digital-change-title').evaluate(node=>node.scrollIntoView({block:'start'}));
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
