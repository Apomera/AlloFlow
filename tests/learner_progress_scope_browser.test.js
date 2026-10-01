import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const artifacts = resolve(process.env.ALLO_PROGRESS_ARTIFACTS || 'reports/deep-classroom-enhancements-2026-09-29/browser-artifacts');
const bank = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const manifest = JSON.parse(readFileSync('app/asset-manifest.json', 'utf8'));
const css = readFileSync(resolve('app', manifest.files['main.css'].replace(/^\//, '')), 'utf8');
let browser, page;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); mkdirSync(artifacts, { recursive: true }); }, 120000);
afterEach(async () => { await page?.close(); page = null; });
afterAll(async () => { await browser?.close(); });
async function mount(props = {}, { width = 1280, locale = 'en', theme = 'light' } = {}) {
  page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const errors = []; page.on('pageerror', error => errors.push(String(error)));
  await page.setContent('<!doctype html><html><head><title>Progress check</title></head><body><h1 class="sr-only">AlloFlow</h1><main aria-label="Learning progress" id="root"></main></body></html>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ path: resolve(root, 'desktop/web-app/node_modules/react/umd/react.development.js') });
  await page.addScriptTag({ path: resolve(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
  const pack = locale === 'en' ? {} : JSON.parse(readFileSync('lang/' + locale + '.js', 'utf8'));
  await page.evaluate(({ bank, pack, theme, locale }) => {
    const text = { ...bank, ...pack };
    window.__alloT = key => key.split('.').reduce((value, part) => value?.[part], text) || key;
    window.AlloLanguageContext = React.createContext({ t: window.__alloT });
    window.AlloIcons = new Proxy({}, { get: () => props => React.createElement('svg', { 'aria-hidden': true, width: props.size || 16, height: props.size || 16 }) });
    document.documentElement.lang = locale === 'arabic' ? 'ar' : locale === 'french' ? 'fr' : 'en';
    document.documentElement.dir = locale === 'arabic' ? 'rtl' : 'ltr';
    document.getElementById('root').className = 'allo-docsuite theme-' + theme;
  }, { bank, pack, theme, locale });
  await page.addScriptTag({ path: resolve(root, 'app_styles_module.js') });
  await page.addScriptTag({ path: resolve(process.env.ALLO_TEACHER_CANDIDATE || 'teacher_module.js') });
  await page.evaluate(props => {
    window.__closed = 0; window.__downloaded = 0;
    window.__renderProgress = props => ReactDOM.render(React.createElement(React.Fragment, null,
      React.createElement(window.AlloModules.AppStyles.AppStyles, { disableAnimations: true }),
      React.createElement(window.AlloModules.LearnerProgressView, { isParentMode: true, isTeacherMode: true, t: window.__alloT, onClose: () => window.__closed++, onShareWithTeacher: () => window.__downloaded++, ...props })), document.getElementById('root'));
    window.__renderProgress(props);
  }, props);
  await page.locator('[data-help-key="learner_progress_panel"]').waitFor();
  expect(errors).toEqual([]);
  return page;
}
const roster = { students: { 'Red Fox': 'g1', 'Blue Owl': 'g1', 'Empty Finch': 'g2' }, progressHistory: {
  'Red Fox': [{ sessionId: 'red1', timestamp: '2026-09-27T12:00:00Z', responseCount: 2, resourcesOpened: 3 }],
  'Blue Owl': [{ sessionId: 'blue1', timestamp: '2026-09-28T12:00:00Z', responseCount: 9, resourcesOpened: 1 }],
} };

describe('family progress in the built teacher module', () => {
  it('selects real child sessions and labels aggregate totals honestly', async () => {
    await mount({ rosterKey: roster, globalPoints: 123 });
    const saved = page.locator('[data-help-key="learner_progress_saved_sessions"]');
    expect(await saved.locator('li').count()).toBe(2);
    const red = page.getByRole('group', { name: 'Family members' }).getByRole('button', { name: /Red Fox/ });
    await red.focus(); await page.keyboard.press('Space');
    expect(await red.getAttribute('aria-pressed')).toBe('true');
    expect(await saved.locator('li').count()).toBe(1);
    expect(await saved.innerText()).toContain('Responses: 2');
    expect(await saved.innerText()).not.toContain('Responses: 9');
    await page.getByRole('button', { name: /Blue Owl/ }).click();
    expect(await saved.innerText()).toContain('Responses: 9');
    expect(await saved.innerText()).not.toContain('Responses: 2');
    await page.getByRole('button', { name: /Empty Finch/ }).click();
    expect(await saved.innerText()).toContain('No saved sessions');
    expect(await page.getByRole('heading', { name: 'Activity on this device', exact: true }).count()).toBe(1);
    expect(await page.getByRole('heading', { name: 'Family Dashboard', exact: true }).count()).toBe(1);
    expect(await page.locator('[data-help-key="learner_progress_panel"]').innerText()).toContain('123');
  }, 60000);
  it('handles damaged sessions and escapes family names', async () => {
    const name = '<img src=x onerror=alert(1)>';
    await mount({ rosterKey: { students: { [name]: 'g1', 'Broken': 'g2' }, progressHistory: { [name]: [null, [], { sessionId: 'bad', timestamp: 'invalid', responseCount: 'made-up', resourcesOpened: -3 }], Broken: {} } } });
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    const saved = page.locator('[data-help-key="learner_progress_saved_sessions"]');
    expect(await saved.locator('li').count()).toBe(1);
    expect(await saved.innerText()).toContain('Responses: —');
    expect(await saved.innerText()).toContain('Resources opened: —');
    expect(await saved.locator('time').count()).toBe(0);
  }, 60000);
  it('pages long histories and resets selection when a family member is removed', async () => {
    const sessions = Array.from({ length: 15 }, (_, index) => ({ sessionId: 'repeated', timestamp: '2026-09-28T12:00:00Z', responseCount: index, resourcesOpened: 1 }));
    await mount({ rosterKey: { students: { 'Red Fox': 'g1', 'Empty Finch': 'g2' }, progressHistory: { 'Red Fox': sessions } } });
    const saved = page.locator('[data-help-key="learner_progress_saved_sessions"]');
    expect(await saved.locator('li').count()).toBe(10);
    await saved.getByRole('button', { name: bank.common.show_more || 'Show more', exact: true }).click();
    expect(await saved.locator('li').count()).toBe(15);
    await page.getByRole('button', { name: /Red Fox/ }).click();
    await page.waitForFunction(() => document.querySelectorAll('[data-help-key="learner_progress_saved_sessions"] li').length === 10);
    await page.evaluate(() => window.__renderProgress({ rosterKey: { students: { 'Empty Finch': 'g2' }, progressHistory: {} } }));
    await page.waitForFunction(() => document.querySelector('[data-help-key="learner_progress_family_filter"] button').getAttribute('aria-pressed') === 'true');
    expect(await saved.locator('li').count()).toBe(0);
    expect(await page.getByRole('button', { name: /Red Fox/ }).count()).toBe(0);
  }, 60000);
  it('focuses its heading and supports details and close from the keyboard', async () => {
    await mount();
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('H2');
    const toggle = page.locator('[data-help-key="learner_progress_details_toggle"]');
    expect(await toggle.getAttribute('aria-expanded')).toBe('false');
    const id = await toggle.getAttribute('aria-controls');
    expect(await page.locator('[id=' + JSON.stringify(id) + ']').isVisible()).toBe(false);
    await toggle.focus(); await page.keyboard.press('Enter');
    expect(await toggle.getAttribute('aria-expanded')).toBe('true');
    expect(await page.locator('[id=' + JSON.stringify(id) + ']').isVisible()).toBe(true);
    await page.getByRole('button', { name: bank.common.close || 'Close progress dashboard', exact: true }).focus(); await page.keyboard.press('Enter');
    expect(await page.evaluate(() => window.__closed)).toBe(1);
    await page.locator('[data-help-key="learner_progress_share_teacher_btn"]').click();
    expect(await page.evaluate(() => window.__downloaded)).toBe(1);
    expect(await page.locator('[data-help-key="learner_progress_share_teacher_btn"]').innerText()).toContain('Download');
  }, 60000);
  it.each(['mixed', 'practice-only', 'future'])('keeps weekly accuracy honest (%s)', async kind => {
    const now = new Date().toISOString(), future = new Date(Date.now() + 86400000).toISOString();
    const rows = kind === 'future' ? [{ timestamp: future, correct: true }] : [
      ...Array.from({ length: 8 }, () => ({ timestamp: now, correct: true, activity: 'letter_tracing' })),
      { timestamp: now, correct: true, practiceOnly: true },
      ...(kind === 'mixed' ? [{ timestamp: now, correct: false, activity: 'word_blending' }] : []),
    ];
    await mount({ wordSoundsHistory: rows, pointHistory: [{ timestamp: now, points: 1 }] });
    const heading = page.getByRole('heading', { name: "This Week's Progress", exact: true });
    const weekly = heading.locator('..');
    const tile = weekly.locator('.grid > div').nth(3);
    expect(await tile.locator(':scope > div').first().innerText()).toBe(kind === 'mixed' ? '0%' : '—');
    expect(await weekly.locator('.grid > div').nth(2).locator(':scope > div').first().innerText()).toBe(kind === 'future' ? '0' : String(rows.length));
  }, 60000);
  it.each([
    { width: 320, theme: 'light', locale: 'en' }, { width: 320, theme: 'dark', locale: 'en' }, { width: 320, theme: 'contrast', locale: 'en' },
    { width: 1280, theme: 'light', locale: 'en' }, { width: 1280, theme: 'dark', locale: 'french' }, { width: 320, theme: 'contrast', locale: 'arabic' },
  ])('fits and passes axe at $width px in $theme ($locale)', async settings => {
    await mount({ rosterKey: roster }, settings);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const controls = await page.locator('[data-help-key="learner_progress_family_filter"] button').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
    expect(controls.every(height => height >= 44)).toBe(true);
    await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => (await axe.run(document.getElementById('root'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
    expect(violations).toEqual([]);
    await page.screenshot({ path: resolve(artifacts, settings.theme + '-' + settings.width + '-' + settings.locale + '.png'), fullPage: true });
  }, 60000);
});
