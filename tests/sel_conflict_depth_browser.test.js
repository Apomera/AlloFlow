import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_conflict.js'), 'utf8');
const caseData = JSON.parse(source.match(/var APOLOGY_SCENARIOS = (\{[\s\S]*?\n\});/)[1]);
const examples = Object.entries(caseData).flatMap(([band, items]) => items.map(item => ({ band, item })));
const reports = path.join(root, 'reports/sel-conflict-depth');
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
      const [data, setData] = R.useState({ conflict: { soundEnabled: false, ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = setBand;
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: null };
      return window.SelHub._registry.conflict.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: /Apology Lab/ }).waitFor();
}
const lab = () => page.getByRole('region', { name: 'Apology and repair practice', exact: true });
const draft = id => page.evaluate(id => window.depthSnapshot.conflict.apDrafts?.[id], id);
const fields = ['acknowledge', 'responsibility', 'empathy', 'repair', 'promise'];

describe('Conflict apology and repair depth', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Apology and repair practice</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id offers a complete model, boundary and follow-through without compulsory writing or completion', async ({ band, item }) => {
    await mount(band);
    await lab().getByLabel('Choose a repair scenario', { exact: true }).selectOption(item.id);
    expect(await lab().innerText()).toContain(item.boundary);
    await lab().getByText('2. Compare a model and its limits', { exact: true }).click();
    for (const field of fields) expect(await lab().innerText()).toContain(item[field]);
    await lab().getByRole('button', { name: 'Explore a response', exact: true }).click();
    expect(await lab().innerText()).toContain(item.response);
    await lab().getByText('Compare a follow-through example', { exact: true }).click();
    expect(await lab().innerText()).toContain(item.followUp);
    expect((await draft(item.id)).acknowledge).toBeUndefined();
    await lab().getByRole('button', { name: 'Practice without contacting anyone', exact: true }).click();
    await lab().getByText('3. Build a practice draft', { exact: true }).click();
    await lab().getByLabel('Offer a realistic repair (optional)', { exact: true }).fill('A repair-only draft for '+item.id+'\nNo message is sent.');
    expect(await lab().getByRole('region', { name: 'Practice draft preview', exact: true }).innerText()).toContain(item.id+'\nNo message is sent.');
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(await page.evaluate(() => window.depthSnapshot.conflict.apCompleted)).toBeUndefined();
    expect(errors).toEqual([]);
  }, 120000);

  it('preserves drafts across scenarios, routes, tabs, grade bands and serialized restoration', async () => {
    await mount();
    await lab().getByRole('button', { name: 'Rehearse an optional message', exact: true }).click();
    await lab().getByText('3. Build a practice draft', { exact: true }).click();
    await lab().getByLabel('Name the action (optional)', { exact: true }).fill('My action\nwithout a character label.');
    await lab().getByRole('button', { name: 'Pause and plan trusted support', exact: true }).click();
    await lab().getByLabel('A support route (optional)', { exact: true }).fill('Ask a trusted adult about a safe support route.');
    expect(await lab().getByLabel('Name the action (optional)', { exact: true }).inputValue()).toContain('My action');
    await lab().getByRole('button', { name: 'Explore a response', exact: true }).click();
    await lab().getByLabel('What would you do next? (optional)', { exact: true }).fill('Respect the request not to tag them.');
    const savedNote = await draft('ap5');
    await lab().getByLabel('Choose a repair scenario', { exact: true }).selectOption('ap6');
    await lab().getByText('3. Build a practice draft', { exact: true }).click();
    await lab().getByLabel('Name the action (optional)', { exact: true }).fill('A separate case draft.');
    await page.getByRole('tab', { name: /I-Statement/ }).click();
    await page.getByRole('tab', { name: /Apology Lab/ }).click();
    expect(await lab().getByLabel('Choose a repair scenario', { exact: true }).inputValue()).toBe('ap6');
    await page.evaluate(() => window.depthSetBand('high'));
    await lab().getByLabel('Choose a repair scenario', { exact: true }).selectOption('ap15');
    await page.evaluate(() => window.depthSetBand('middle'));
    expect(await lab().getByLabel('Choose a repair scenario', { exact: true }).inputValue()).toBe('ap6');
    const saved = await page.evaluate(() => JSON.parse(JSON.stringify(window.depthSnapshot.conflict)));
    await mount('middle', 'light', 1100, saved);
    await lab().getByLabel('Choose a repair scenario', { exact: true }).selectOption('ap5');
    expect(await draft('ap5')).toEqual(savedNote);
    expect(await lab().getByLabel('A support route (optional)', { exact: true }).inputValue()).toContain('trusted adult');
    expect(await lab().getByRole('button', { name: 'Response shown', exact: true }).getAttribute('aria-expanded')).toBe('true');
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  }, 120000);

  it('recovers an older unassigned draft without overwriting current writing or resetting historical totals', async () => {
    await mount('middle', 'light', 1100, { apIdx: 1, apCompleted: 7, apAcknowledge: 'Older action', apResponsibility: 'Older responsibility', apRepair: 'Older repair', apDrafts: { ap6: { acknowledge: 'Current action' } }, earnedBadges: { first_apology: 123 } });
    expect(await lab().getByLabel('Choose a repair scenario', { exact: true }).inputValue()).toBe('ap6');
    expect((await draft('ap6')).responsibility).toBeUndefined();
    await lab().getByText('An earlier unassigned draft is available', { exact: true }).click();
    await lab().getByRole('button', { name: 'Copy earlier draft into empty fields', exact: true }).click();
    expect(await draft('ap6')).toMatchObject({ acknowledge: 'Current action', responsibility: 'Older responsibility', repair: 'Older repair' });
    expect(await page.evaluate(() => window.depthSnapshot.conflict.apAcknowledge)).toBe('Older action');
    expect(await page.evaluate(() => window.depthSnapshot.conflict.apCompleted)).toBe(7);
    expect(await page.evaluate(() => window.depthSnapshot.conflict.earnedBadges)).toEqual({ first_apology: 123 });
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  }, 120000);

  it('retains keyboard focus and supports route deselection and unknown imported values', async () => {
    await mount('middle', 'light', 1100, { apIdx: -3, apSelected: { middle: 'unknown' }, apDrafts: { ap5: { route: 'unknown', acknowledge: 9 } } });
    expect(await lab().getByLabel('Choose a repair scenario', { exact: true }).inputValue()).toBe('ap5');
    const picker = lab().getByLabel('Choose a repair scenario', { exact: true });
    await picker.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    expect(await picker.evaluate(node => document.activeElement === node)).toBe(true);
    const route = lab().getByRole('button', { name: 'Practice without contacting anyone', exact: true });
    await route.focus(); await page.keyboard.press('Enter'); expect(await route.getAttribute('aria-pressed')).toBe('true');
    await page.keyboard.press('Enter'); expect(await route.getAttribute('aria-pressed')).toBe('false');
    await lab().getByRole('button', { name: 'Explore a response', exact: true }).focus(); await page.keyboard.press('Enter');
    expect(await lab().getByRole('button', { name: 'Response shown', exact: true }).evaluate(node => document.activeElement === node)).toBe(true);
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  }, 120000);

  it.each(['light', 'dark', 'contrast'])('supports phone drafting and support planning in %s', async theme => {
    await mount('high', theme, 320);
    await lab().getByLabel('Choose a repair scenario', { exact: true }).selectOption('ap15');
    await lab().getByRole('button', { name: 'Pause and plan trusted support', exact: true }).click();
    await lab().getByLabel('A support route (optional)', { exact: true }).fill('A trusted adult who can help me keep a boundary.');
    await lab().getByRole('group', { name: '1. Choose a way to practice (optional)', exact: true }).evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(reports, theme + '-support-phone.png') });
    await lab().getByText('3. Build a practice draft', { exact: true }).click();
    await lab().getByLabel('Offer a realistic repair (optional)', { exact: true }).fill('Practice privately.\nRespect a request for no contact.');
    await lab().getByRole('button', { name: 'Explore a response', exact: true }).click();
    await lab().getByLabel('What would you do next? (optional)', { exact: true }).fill('Stop messaging and seek support if needed.');
    await lab().getByText('Compare a follow-through example', { exact: true }).click();
    await lab().locator('#cfl-ap-follow-title').evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(reports, theme + '-follow-through-phone.png') });
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const violations = await lab().evaluate(async node => (await window.axe.run(node)).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) })));
    fs.writeFileSync(path.join(reports, theme + '-axe.json'), JSON.stringify(violations, null, 2));
    expect(violations).toEqual([]);
    expect(await lab().evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await lab().locator('button:visible, select:visible, summary:visible').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44))).toBe(true);
    expect(errors).toEqual([]);
  }, 120000);
});
