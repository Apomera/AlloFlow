import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'sel_hub/sel_tool_perspective.js'), 'utf8');
const caseData = JSON.parse(source.match(/var PERSPECTIVE_CASES = (\{[\s\S]*?\});\s*var SCENARIOS/)[1]);
const examples = Object.entries(caseData).flatMap(([band, items]) => items.map(item => ({ band, item })));
const reports = path.join(root, 'reports/sel-perspective-depth');
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
      const [data, setData] = R.useState({ perspective: { soundEnabled: false, ...initial } });
      const [gradeBand, setBand] = R.useState(band);
      window.depthSnapshot = data; window.depthSetBand = setBand;
      const updateMulti = (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
      const ctx = { React: R, icons: new Proxy({}, { get: () => Icon }), toolData: data, gradeBand,
        update: (id, key, value) => updateMulti(id, { [key]: value }), updateMulti,
        theme: { isDark: theme === 'dark', isContrast: theme === 'contrast' },
        addToast: noop, awardXP: value => window.depthXP.push(value), announceToSR: text => window.depthAnnouncements.push(text),
        a11yClick: fn => ({ onClick: fn }), celebrate: noop, callGemini: null };
      return window.SelHub._registry.perspective.render(ctx);
    }
    window.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(App));
  }, { band, theme, initial });
  await page.getByRole('tab', { name: 'Case studies', exact: true }).waitFor();
}
const study = () => page.getByRole('region', { name: 'Perspective case study', exact: true });
const first = () => study().getByRole('group', { name: 'Your first response (optional)', exact: true });
const revised = () => study().getByRole('group', { name: 'Your response with this context (optional)', exact: true });
const note = id => page.evaluate(id => window.depthSnapshot.perspective.caseStudyNotes?.[id], id);

describe('Perspective case-study depth', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-depth.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>Perspective case studies</title></head><body><div id="root"></div></body></html>' }) : route.abort());
  }, 60000);
  afterAll(async () => { await browser?.close(); }, 180000);

  it.each(examples)('$band / $item.id compares tradeoffs and revises with new context without points', async ({ band, item }) => {
    await mount(band);
    await study().getByLabel('Choose a case study', { exact: true }).selectOption(item.id);
    expect(await study().getByRole('heading', { name: item.title, exact: true }).isVisible()).toBe(true);
    expect(await study().locator('#psp-case-context').isVisible()).toBe(false);
    expect(await study().innerText()).toContain(item.role);
    await study().getByText('Compare with an observation model', { exact: true }).click();
    for (const fact of item.facts) expect(await study().innerText()).toContain(fact);
    await study().getByText('Compare possible perspectives', { exact: true }).click();
    for (const voice of item.voices) expect(await study().innerText()).toContain(voice.view);
    for (const option of item.options) {
      await first().getByRole('button', { name: option.label, exact: true }).click();
      expect(await first().innerText()).toContain(option.benefit);
      expect(await first().innerText()).toContain(option.limit);
    }
    await study().getByRole('button', { name: 'Reveal new context', exact: true }).click();
    expect(await study().locator('#psp-case-context').innerText()).toContain(item.context);
    expect(await first().getByRole('button').count()).toBe(0);
    for (const option of item.options) {
      await revised().getByRole('button', { name: option.label, exact: true }).click();
      expect(await revised().innerText()).toContain(option.after);
    }
    await study().getByText('Change one condition', { exact: true }).click();
    expect(await study().innerText()).toContain(item.pivot);
    expect((await note(item.id)).initialChoice).toBe(item.options[2].id);
    expect((await note(item.id)).revisedChoice).toBe(item.options[2].id);
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(await page.evaluate(() => window.depthSnapshot.perspective.scenCompleted)).toBeUndefined();
    expect(errors).toEqual([]);
  }, 120000);

  it('keeps case-specific notes, independent first/revised choices, and band selections through serialized restore', async () => {
    await mount();
    await study().getByLabel('What do we know? (optional)', { exact: true }).fill('Morgan missed the update.\nA motive is still uncertain.');
    await first().getByRole('button').first().click();
    await study().getByRole('button', { name: 'Reveal new context', exact: true }).click();
    await revised().getByRole('button').nth(1).click();
    await study().getByLabel('What would you keep or change, and why? (optional)', { exact: true }).fill('Move task decisions to a shared channel.');
    const original = await note('chat-boundary');
    await study().getByLabel('Choose a case study', { exact: true }).selectOption('message-delay');
    await study().getByLabel('What do we know? (optional)', { exact: true }).fill('A different case draft.');
    await page.evaluate(() => window.depthSetBand('high'));
    await study().getByLabel('Choose a case study', { exact: true }).selectOption('project-credit');
    await page.evaluate(() => window.depthSetBand('middle'));
    expect(await study().getByLabel('Choose a case study', { exact: true }).inputValue()).toBe('message-delay');
    const saved = await page.evaluate(() => JSON.parse(JSON.stringify(window.depthSnapshot.perspective)));
    await mount('middle', 'light', 1100, saved);
    await study().getByLabel('Choose a case study', { exact: true }).selectOption('chat-boundary');
    expect(await note('chat-boundary')).toEqual(original);
    expect(await study().getByLabel('What do we know? (optional)', { exact: true }).inputValue()).toContain('\n');
    expect(await study().getByRole('button', { name: 'New context shown', exact: true }).getAttribute('aria-expanded')).toBe('true');
    expect(await revised().getByRole('button').nth(1).getAttribute('aria-pressed')).toBe('true');
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  }, 120000);

  it('supports keyboard exploration, deselection, skipping writing, and retained select/reveal focus', async () => {
    await mount();
    const picker = study().getByLabel('Choose a case study', { exact: true });
    await picker.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    expect(await picker.evaluate(node => document.activeElement === node)).toBe(true);
    await study().getByText('Compare with an observation model', { exact: true }).focus(); await page.keyboard.press('Enter');
    const option = first().getByRole('button').first();
    await option.focus(); await page.keyboard.press('Enter');
    expect(await option.getAttribute('aria-pressed')).toBe('true');
    await page.keyboard.press('Enter'); expect(await option.getAttribute('aria-pressed')).toBe('false');
    const reveal = study().getByRole('button', { name: 'Reveal new context', exact: true });
    await reveal.focus(); await page.keyboard.press('Enter');
    expect(await study().getByRole('button', { name: 'New context shown', exact: true }).evaluate(node => document.activeElement === node)).toBe(true);
    expect(await first().innerText()).toContain('No first response recorded');
    expect((await note('message-delay')).observation).toBeUndefined();
    expect(await page.evaluate(() => window.depthXP)).toEqual([]);
    expect(errors).toEqual([]);
  }, 120000);

  it('preserves legacy records and navigation and recovers from unknown case/choice ids', async () => {
    await mount('middle', 'light', 1100, { activeTab: 'scenarios', scenCompleted: 4, earnedBadges: { first_scenario: 123 }, caseStudyIds: { middle: 'missing' }, caseStudyNotes: { 'chat-boundary': { initialChoice: 'missing', contextSeen: true, observation: 12 } } });
    expect(await study().count()).toBe(0);
    await page.getByRole('tab', { name: 'Case studies', exact: true }).click();
    expect(await study().getByLabel('Choose a case study', { exact: true }).inputValue()).toBe('chat-boundary');
    expect(await first().innerText()).toContain('No first response recorded');
    expect(await study().getByLabel('What do we know? (optional)', { exact: true }).inputValue()).toBe('');
    expect(await page.evaluate(() => window.depthSnapshot.perspective.scenCompleted)).toBe(4);
    expect(await page.evaluate(() => window.depthSnapshot.perspective.earnedBadges)).toEqual({ first_scenario: 123 });
    expect(errors).toEqual([]);
  }, 120000);

  it.each(['light', 'dark', 'contrast'])('supports 320px readable case decisions and revision in %s', async theme => {
    await mount('high', theme, 320);
    await study().getByLabel('Choose a case study', { exact: true }).selectOption('project-credit');
    await first().getByRole('button').first().click();
    await study().locator('#psp-response-title').evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(reports, theme + '-response-phone.png') });
    await study().getByRole('button', { name: 'Reveal new context', exact: true }).click();
    await revised().getByRole('button').nth(1).click();
    await study().getByLabel('What would you keep or change, and why? (optional)', { exact: true }).fill('Include research and rewriting.\nAgree on an accessible handoff.');
    await study().getByText('Change one condition', { exact: true }).click();
    await study().locator('#psp-context-title').evaluate(node => node.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(reports, theme + '-revision-phone.png') });
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const violations = await study().evaluate(async node => (await window.axe.run(node)).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) })));
    fs.writeFileSync(path.join(reports, theme + '-axe.json'), JSON.stringify(violations, null, 2));
    expect(violations).toEqual([]);
    expect(await study().evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await study().locator('button:visible, select:visible, summary:visible').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44))).toBe(true);
    expect(errors).toEqual([]);
  }, 120000);
});
