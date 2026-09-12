import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_decisions.js'), 'utf8');
const caseData = JSON.parse(source.match(/var CONSEQUENCE_SCENARIOS = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(caseData).flatMap(([band, items]) => items.map(item => ({ band, item })));
const reports = path.join(root, 'reports/sel-decision-depth');
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
      const [data, setData] = R.useState({ decisions: { soundEnabled: false, ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = setBand;
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: null };
      return window.SelHub._registry.decisions.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Consequence/ }).waitFor();
}
const map = () => page.getByRole('region', { name: 'Consequence reasoning map', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.decisions.mapDrafts?.[id], id);

describe('Decision consequence reasoning depth', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Consequence reasoning map</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id exposes conditional models, adjustments and review without compulsory writing', async ({ band, item }) => {
    await mount(band);
    await map().getByLabel('Choose a consequence scenario', { exact: true }).selectOption(item.id);
    expect(await map().innerText()).toContain(item.action);
    for (const person of item.affectedPeople) expect(await map().innerText()).toContain(person);
    await map().getByText('Compare possible effects and their limits', { exact: true }).click();
    for (const field of ['benefit','cost','depends']) expect(await map().innerText()).toContain(item[field]);
    await map().getByText('3. Adjust the plan and choose a review point', { exact: true }).click();
    await map().getByText('Compare an adjustment and review example', { exact: true }).click();
    expect(await map().innerText()).toContain(item.adjustment);
    expect(await map().innerText()).toContain(item.review);
    expect(await map().getByRole('button', { name: 'Keep this version for comparison', exact: true }).isDisabled()).toBe(true);
    await map().getByRole('button', { name: 'Explore a changed condition', exact: true }).click();
    expect(await map().innerText()).toContain(item.change);
    expect((await draft(item.id)).near).toBeUndefined();
    expect((await draft(item.id)).snapshot).toBeUndefined();
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(await page.evaluate(() => window.depthSnapshot.decisions.csCompleted)).toBeUndefined();
    expect(errors).toEqual([]);
  }, 120000);

  it('keeps an earlier version immutable while edits, case changes, bands and serialized restoration retain separate drafts', async () => {
    await mount();
    await map().getByLabel('A possible near-term effect (optional)', { exact: true }).fill('Initial possibility\nwith an important condition.');
    await map().getByRole('button', { name: 'Keep this version for comparison', exact: true }).click();
    const snapshot = (await draft('cs7')).snapshot;
    await map().getByLabel('A possible near-term effect (optional)', { exact: true }).fill('Updated possibility');
    await map().getByRole('button', { name: 'Earlier version kept', exact: true }).click();
    expect((await draft('cs7')).snapshot).toEqual(snapshot);
    await map().getByRole('button', { name: 'Explore a changed condition', exact: true }).click();
    await map().getByLabel('What would you keep or change, and why? (optional)', { exact: true }).fill('Use a supported route with factual evidence.');
    await map().getByLabel('Choose a consequence scenario', { exact: true }).selectOption('cs8');
    await map().getByLabel('A different possible path (optional)', { exact: true }).fill('Another case note.');
    await page.evaluate(() => window.depthSetBand('high'));
    await map().getByLabel('Choose a consequence scenario', { exact: true }).selectOption('cs16');
    await page.evaluate(() => window.depthSetBand('middle'));
    expect(await map().getByLabel('Choose a consequence scenario', { exact: true }).inputValue()).toBe('cs8');
    const saved = await page.evaluate(() => JSON.parse(JSON.stringify(window.depthSnapshot.decisions)));
    await mount('middle','light',1100,saved);
    await map().getByLabel('Choose a consequence scenario', { exact: true }).selectOption('cs7');
    expect(await map().getByLabel('A possible near-term effect (optional)', { exact: true }).inputValue()).toBe('Updated possibility');
    expect(await map().getByLabel('What would you keep or change, and why? (optional)', { exact: true }).inputValue()).toContain('supported route');
    expect((await draft('cs7')).snapshot).toEqual(snapshot);
    await map().getByText('Read the earlier version', { exact: true }).click();
    expect(await map().getByRole('region', { name: 'Earlier reasoning version', exact: true }).innerText()).toContain('Initial possibility\nwith an important condition.');
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  }, 120000);

  it('copies legacy notes only into blank fields and preserves legacy totals, badges and the original copy', async () => {
    await mount('middle','light',1100,{ csIdx:1, csShort:'Older near note', csMid:'Older medium note', csLong:'Older long note', csCompleted:6, earnedBadges:{first_consequence:123}, mapDrafts:{cs8:{near:'Current writing'}} });
    expect(await map().getByLabel('Choose a consequence scenario', { exact: true }).inputValue()).toBe('cs8');
    expect((await draft('cs8')).later).toBeUndefined();
    await map().getByText('An earlier unassigned map is available', { exact: true }).click();
    await map().getByRole('button', { name: 'Copy earlier notes into empty fields', exact: true }).click();
    expect(await draft('cs8')).toMatchObject({near:'Current writing',later:'Older medium note',long:'Older long note'});
    expect(await page.evaluate(() => window.depthSnapshot.decisions.csShort)).toBe('Older near note');
    expect(await page.evaluate(() => window.depthSnapshot.decisions.csCompleted)).toBe(6);
    expect(await page.evaluate(() => window.depthSnapshot.decisions.earnedBadges)).toEqual({first_consequence:123});
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  }, 120000);

  it('retains keyboard focus and handles unknown selections and malformed note values', async () => {
    await mount('middle','light',1100,{csIdx:-2,mapSelected:{middle:'unknown'},mapDrafts:{cs7:{near:5,snapshot:[]}}});
    expect(await map().getByLabel('A possible near-term effect (optional)', { exact:true }).inputValue()).toBe('');
    const picker = map().getByLabel('Choose a consequence scenario', {exact:true});
    await picker.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    expect(await picker.evaluate(node => node === document.activeElement)).toBe(true);
    await map().getByLabel('A possible near-term effect (optional)', {exact:true}).fill('A keyboard draft.');
    await map().getByRole('button',{name:'Keep this version for comparison',exact:true}).focus(); await page.keyboard.press('Enter');
    expect(await map().getByRole('button',{name:'Earlier version kept',exact:true}).evaluate(node => node === document.activeElement)).toBe(true);
    await map().getByRole('button',{name:'Explore a changed condition',exact:true}).focus(); await page.keyboard.press('Enter');
    expect(await map().getByRole('button',{name:'Changed condition shown',exact:true}).evaluate(node => node === document.activeElement)).toBe(true);
    expect(errors).toEqual([]);
  },120000);

  it.each(['light','dark','contrast'])('supports a readable phone map, earlier version and revision in %s', async theme => {
    await mount('high',theme,320);
    await map().getByLabel('Choose a consequence scenario',{exact:true}).selectOption('cs16');
    await map().getByText('Compare possible effects and their limits',{exact:true}).click();
    await map().locator('#dec-map-case-title').evaluate(node => node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-effects-phone.png')});
    await map().getByLabel('A possible near-term effect (optional)',{exact:true}).fill('The paid role might meet essential costs.\nWork conditions still matter.');
    await map().getByRole('button',{name:'Keep this version for comparison',exact:true}).click();
    await map().getByText('Read the earlier version',{exact:true}).click();
    await map().getByRole('button',{name:'Explore a changed condition',exact:true}).click();
    await map().getByLabel('What would you keep or change, and why? (optional)',{exact:true}).fill('Compare the updated funding and mentoring before deciding.');
    await map().locator('#dec-map-change-title').evaluate(node => node.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.join(reports,theme+'-revision-phone.png')});
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const violations = await map().evaluate(async node => (await window.axe.run(node)).violations.map(v => ({id:v.id,nodes:v.nodes.map(n => ({html:n.html,summary:n.failureSummary}))})));
    fs.writeFileSync(path.join(reports,theme+'-axe.json'),JSON.stringify(violations,null,2));
    expect(violations).toEqual([]);
    expect(await map().evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await map().locator('button:visible,select:visible,summary:visible').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >=44))).toBe(true);
    expect(errors).toEqual([]);
  },120000);
});
