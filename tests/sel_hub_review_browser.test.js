import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const modules = path.join(root, 'desktop/web-app/node_modules');
const hub = read('sel_hub/sel_hub_module.js');
const tools = fs.readdirSync(path.join(root, 'sel_hub')).filter(f => /^sel_tool_.*\.js$/.test(f));
const reports = path.join(root, 'reports/sel-hub-review');
let browser, page;
const errors = [];

async function mount(width = 1280, theme = '', fixture = null) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('http://sel-review.test/');
  await page.addStyleTag({ content: 'html,body{margin:0;font-family:system-ui,sans-serif}*{box-sizing:border-box}button,input,summary{font:inherit}button:focus-visible,summary:focus-visible,input:focus-visible{outline:3px solid #7c3aed;outline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}' });
  await page.addScriptTag({ path: path.join(modules, 'react/umd/react.development.js') });
  await page.addScriptTag({ path: path.join(modules, 'react-dom/umd/react-dom.development.js') });
  await page.evaluate(theme => {
    localStorage.clear(); sessionStorage.clear();
    document.documentElement.className = theme;
    document.body.className = theme;
    window.AlloModules = {};
    window.AlloIcons = new Proxy({}, { get: () => () => null });
  }, theme);
  if (fixture) await page.evaluate(seed => {
    localStorage.setItem('alloflow_sel_stations', JSON.stringify(seed.stations || []));
    localStorage.setItem('alloflow_sel_station_progress', JSON.stringify(seed.progress || {}));
  }, fixture);
  await page.addScriptTag({ content: hub });
  await page.addScriptTag({ content: read('sel_hub/sel_standards_alignment.js') });
  await page.addScriptTag({ content: tools.map(f => read('sel_hub/' + f)).join('\n;\n') });
  await page.evaluate(() => {
    const R = window.React, noop = () => {}, Icon = () => null;
    function ReviewApp() {
      const [tool, setTool] = R.useState(null);
      const [tab, setTab] = R.useState('explore');
      return R.createElement(window.AlloModules.SelHub, {
        showSelHub: true, setShowSelHub: noop, selHubTool: tool, setSelHubTool: setTool,
        selHubTab: tab, setSelHubTab: setTab, addToast: noop, gradeLevel: '8th Grade',
        callGemini: null, onSafetyFlag: noop, studentCodename: 'review', t: (key, fallback) => fallback || key,
        ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested: noop,
      });
    }
    window.reviewRoot = R.createElement(ReviewApp);
    window.ReactDOM.createRoot(document.getElementById('root')).render(window.reviewRoot);
  });
  await page.getByRole('button', { name: 'Got it, start using the SEL Hub' }).click();
  await page.locator('[data-sel-tool-card-id]').first().waitFor();
}

async function startPathway(name) {
  await page.getByText('SEL Pathways', { exact: false }).filter({ hasText: 'Curated Learning Sequences' }).click();
  await page.getByRole('button', { name: new RegExp('^' + name + ':') }).click();
  await page.getByRole('region', { name: 'Pathway practice guide' }).waitFor();
  await page.waitForFunction(() => document.activeElement?.id === 'sel-pathway-practice-guide');
}

describe('SEL hub reviewed learning flow in Chromium', () => {
  beforeAll(async () => {
    fs.mkdirSync(reports, { recursive: true });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('http://sel-review.test/')
      ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en"><head><title>SEL review</title></head><body><div id="root"></div></body></html>' })
      : route.abort());
  }, 60000);
  // Browser process shutdown can be slow on the shared Windows workstation.
  afterAll(async () => { await browser?.close(); }, 60000);

  it('offers an ungraded practice cycle and does not call opening completion', async () => {
    await mount();
    await page.screenshot({ path: path.join(reports, 'catalog-desktop.png') });
    await startPathway('Morning Check-In');
    const guide = page.getByRole('region', { name: 'Pathway practice guide' });
    expect(await guide.innerText()).toContain('0 of 4 tools opened');
    expect(await guide.innerText()).not.toContain('completed');
    expect(await page.locator('[data-sel-tool-card-id]').count()).toBe(4);
    expect(await page.locator('[data-sel-tool-card-id]').evaluateAll(cards => cards.map(c => c.dataset.selToolCardId))).toEqual(['zones', 'mindfulness', 'goals', 'journal']);
    await guide.getByRole('button', { name: /^Open next:/ }).click();
    expect(await guide.innerText()).toContain('1 of 4 tools opened');
    await guide.getByText('Model, practice, and reflect', { exact: true }).click();
    await guide.getByRole('button', { name: 'I need another way', exact: true }).click();
    expect(await guide.getByRole('status').innerText()).toContain('smaller step');
    await guide.getByRole('button', { name: 'Pass for now', exact: true }).click();
    expect(await guide.getByRole('button', { name: 'Pass for now' }).getAttribute('aria-pressed')).toBe('true');
    expect(await guide.getByRole('status').innerText()).toContain('Passing is a valid choice');
    await guide.getByRole('button', { name: /^Next option:/ }).click();
    expect(await guide.innerText()).toContain('2 of 4 tools opened');
    await guide.getByRole('button', { name: 'View pathway tools' }).click();
    expect(await page.locator('[data-sel-tool-card-id="zones"]').innerText()).toContain('Step 1 · Opened');
    await page.locator('[data-sel-tool-card-id="zones"]').focus();
    await page.keyboard.press('Enter');
    expect(await guide.innerText()).toContain('2 of 4 tools opened');
    await guide.getByText('Model, practice, and reflect', { exact: true }).click();
    expect(await guide.getByRole('button', { name: 'Pass for now' }).getAttribute('aria-pressed')).toBe('true');
    await guide.getByRole('button', { name: 'View pathway tools' }).click();
    await guide.getByRole('button', { name: 'Exit pathway mode' }).click();
    expect(await page.locator('[data-sel-tool-card-id]').count()).toBeGreaterThan(70);
    await startPathway('Morning Check-In');
    expect(await guide.innerText()).toContain('0 of 4 tools opened');
    await guide.getByRole('button', { name: /^Open next:/ }).click();
    await guide.getByText('Model, practice, and reflect', { exact: true }).click();
    expect(await guide.getByRole('button', { name: 'Pass for now' }).getAttribute('aria-pressed')).toBe('false');
    expect(errors).toEqual([]);
  }, 120000);

  it('keeps all eight pathways in their suggested order with explicit goals and transfer prompts', async () => {
    await mount();
    const sequences = [
      ['Morning Check-In', ['zones', 'mindfulness', 'goals', 'journal']],
      ['Calm Down Corner', ['zones', 'coping', 'mindfulness', 'somaticReset']],
      ['Conflict Resolution Unit', ['conflict', 'conflicttheater', 'perspective', 'social', 'restorativeCircle']],
      ['Empathy & Perspective Week', ['perspective', 'emotions', 'community', 'cultureExplorer']],
      ['Decision-Making Deep Dive', ['decisions', 'ethicalReasoning', 'safety']],
      ['Self-Discovery Journey', ['strengths', 'emotions', 'growthmindset', 'compassion', 'advocacy']],
      ['Friendship & Social Skills', ['social', 'friendship', 'teamwork', 'peersupport']],
      ['Navigating Change', ['transitions', 'coping', 'journal', 'goals']],
    ];
    for (const [name, ids] of sequences) {
      await startPathway(name);
      const guide = page.getByRole('region', { name: 'Pathway practice guide' });
      expect(await page.locator('[data-sel-tool-card-id]').evaluateAll(cards => cards.map(c => c.dataset.selToolCardId))).toEqual(ids);
      expect(await guide.innerText()).toContain('Practice goal:');
      await guide.getByText('Model, practice, and reflect', { exact: true }).click();
      expect(await guide.innerText()).toContain('Take it with you');
      expect(await guide.innerText()).toContain('Sharing is optional');
      await guide.getByRole('button', { name: 'Exit pathway mode' }).click();
    }
  }, 120000);

  it('keeps search, labels and guide usable on a 320px phone', async () => {
    await mount(320);
    await page.getByRole('textbox', { name: 'Search SEL tools' }).fill('friend');
    expect(await page.locator('[data-sel-tool-card-id]').count()).toBeGreaterThan(0);
    await page.screenshot({ path: path.join(reports, 'catalog-phone.png') });
    await page.getByRole('textbox', { name: 'Search SEL tools' }).fill('');
    await startPathway('Calm Down Corner');
    const guide = page.getByRole('region', { name: 'Pathway practice guide' });
    await guide.getByText('Model, practice, and reflect', { exact: true }).click();
    await page.screenshot({ path: path.join(reports, 'pathway-phone.png') });
    const layout = await guide.evaluate(el => ({ width: el.getBoundingClientRect().width, scroll: el.scrollWidth, client: el.clientWidth,
      buttons: [...el.querySelectorAll('button')].map(b => ({ height: b.getBoundingClientRect().height, width: b.getBoundingClientRect().width })) }));
    expect(layout.width).toBeLessThanOrEqual(320);
    expect(layout.scroll).toBeLessThanOrEqual(layout.client + 1);
    expect(layout.buttons.every(b => b.height >= 44)).toBe(true);
    await guide.getByRole('button', { name: /^Open next:/ }).focus();
    await page.keyboard.press('Enter');
    expect(await guide.innerText()).toContain('1 of 4 tools opened');
    expect(errors).toEqual([]);
  }, 120000);

  it('keeps station reflection voluntary, editable, reversible, and recoverable across tool switches and reloads', async () => {
    const station = { id: 'review-station', name: 'Review station', tools: ['journal', 'zones'], quests: [
      { qid: 'practice', type: 'manualComplete', toolId: 'journal', label: 'Try a small step', params: {} },
      { qid: 'reflect', type: 'freeResponse', label: 'Notice and adapt', params: { prompt: 'What helped or needs changing?', selfCheck: true } },
      { qid: 'legacy', type: 'freeResponse', label: 'Existing written task', params: { prompt: 'A saved writing prompt', minLength: 5 } },
    ] };
    await mount(1280, '', { stations: [station] });
    await page.getByRole('button', { name: 'Activate station Review station', exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.id === 'sel-active-station-guide');
    let guide = page.getByRole('region', { name: 'Active SEL Station: Review station', exact: true });
    expect(await page.locator('[data-sel-tool-card-id]').evaluateAll(cards => cards.map(c => c.dataset.selToolCardId))).toEqual(['journal', 'zones']);
    let reflection = guide.locator('[data-sel-quest-id="reflect"]');
    const complete = () => reflection.getByRole('button', { name: 'Mark "Notice and adapt" as complete', exact: true });
    await complete().click(); // no typing or forced disclosure is required
    expect(await complete().getAttribute('aria-pressed')).toBe('true');
    await complete().click();
    expect(await complete().getAttribute('aria-pressed')).toBe('false');
    const note = 'I tried a smaller step and would ask for an example next time.';
    await reflection.getByRole('textbox').fill(note);
    expect(await complete().getAttribute('aria-pressed')).toBe('false');
    await reflection.getByRole('button', { name: 'Pass for now', exact: true }).click();
    expect(await guide.innerText()).toContain('0 of 3 steps recorded · 1 passed for now');
    await guide.getByRole('button', { name: '1. Feelings Journal', exact: true }).click();
    await guide.getByText('Station steps and reflection', { exact: true }).click();
    expect(await reflection.getByRole('textbox').inputValue()).toBe(note);
    expect(await reflection.getByRole('button', { name: 'Pass for now' }).getAttribute('aria-pressed')).toBe('true');
    const legacy = guide.locator('[data-sel-quest-id="legacy"]');
    await legacy.getByRole('textbox').fill('A longer response');
    await page.waitForFunction(() => window.__alloflowSelProgress['review-station'].legacy.complete === true);
    expect(await legacy.getByRole('textbox').inputValue()).toBe('A longer response');
    await legacy.getByRole('textbox').fill('Revised response');
    expect(await legacy.getByRole('textbox').inputValue()).toBe('Revised response');
    const saved = await page.evaluate(() => ({ stations: JSON.parse(localStorage.getItem('alloflow_sel_stations')), progress: JSON.parse(localStorage.getItem('alloflow_sel_station_progress')) }));
    expect(saved.progress['review-station'].reflect.complete).toBe(false);
    expect(saved.progress['review-station'].reflect.passed).toBe(true);
    await mount(1280, '', saved);
    await page.getByRole('button', { name: 'Activate station Review station', exact: true }).click();
    guide = page.getByRole('region', { name: 'Active SEL Station: Review station', exact: true });
    reflection = guide.locator('[data-sel-quest-id="reflect"]');
    expect(await reflection.getByRole('textbox').inputValue()).toBe(note);
    expect(await reflection.getByRole('button', { name: 'Pass for now' }).getAttribute('aria-pressed')).toBe('true');
    await complete().focus();
    await page.keyboard.press('Enter');
    expect(await complete().getAttribute('aria-pressed')).toBe('true');
    expect(await reflection.getByRole('button', { name: 'Pass for now' }).getAttribute('aria-pressed')).toBe('false');
    expect(await guide.innerText()).toContain('2 of 3 steps recorded');
    expect(errors).toEqual([]);
  }, 120000);

  it('creates classroom routines with self-checked reflection rather than text quotas', async () => {
    await mount();
    for (const name of ['Morning advisory check-in', 'Post-conflict repair routine', 'Digital wellbeing mini-lesson']) {
      await page.locator('details[aria-label="Teacher launch routines"] > summary').click();
      await page.getByRole('button', { name: 'Load teacher launch plan: ' + name, exact: true }).click();
      await page.getByRole('button', { name: 'Save this station', exact: true }).click();
      const guide = page.getByRole('region', { name: 'Active SEL Station: ' + name, exact: true });
      await guide.waitFor();
      const saved = await page.evaluate(() => window.__alloflowSelStations.at(-1));
      const reflections = saved.quests.filter(q => q.type === 'freeResponse');
      expect(reflections.length).toBeGreaterThan(0);
      expect(reflections.every(q => q.params.selfCheck === true && q.params.minLength === undefined)).toBe(true);
      expect(await guide.innerText()).toContain('A written note is optional');
      await guide.getByRole('button', { name: 'Exit station mode', exact: true }).click();
    }
    expect(errors).toEqual([]);
  }, 120000);

  it('builds each custom preset around practice and reflection without XP or length quotas', async () => {
    await mount();
    for (const name of ['Daily Check-In', 'Reflection Deep Dive', 'Repair Pack']) {
      await page.locator('details[aria-label="Teacher launch routines"] > summary').click();
      await page.getByRole('button', { name: 'Load teacher launch plan: Morning advisory check-in', exact: true }).click();
      await page.getByRole('button', { name: 'Clear all quests', exact: true }).click();
      await page.getByRole('button', { name: new RegExp('^Apply preset: ' + name) }).click();
      await page.locator('#sel-station-name-input').fill('Preset ' + name);
      await page.getByRole('button', { name: 'Save this station', exact: true }).click();
      const guide = page.getByRole('region', { name: 'Active SEL Station: Preset ' + name, exact: true });
      await guide.waitFor();
      const saved = await page.evaluate(() => window.__alloflowSelStations.at(-1));
      expect(saved.quests).toHaveLength(3);
      expect(saved.quests.every(q => q.type === 'manualComplete' || (q.type === 'freeResponse' && q.params.selfCheck === true))).toBe(true);
      expect(saved.quests.some(q => q.type === 'xpThreshold' || q.type === 'timeSpent' || q.params.minLength)).toBe(false);
      expect(await guide.getByRole('textbox').count()).toBe(2);
      await guide.getByRole('button', { name: 'Exit station mode', exact: true }).click();
    }
    expect(errors).toEqual([]);
  }, 120000);

  it('adapts station copies without changing original prompts or learner records, and saves activity and step order', async () => {
    const station = { id: 'source', name: 'Original routine', tools: ['journal', 'zones'], teacherNote: 'Use a fictional example.', quests: [
      { qid: 'reflect', type: 'freeResponse', label: 'Original reflection', params: { prompt: 'Original prompt', selfCheck: true } },
      { qid: 'practice', type: 'manualComplete', label: 'Original practice', toolId: 'journal', params: {} },
    ] };
    const progress = { source: { reflect: { response: 'Private original note', complete: true, markedComplete: true } } };
    await mount(1280, '', { stations: [station], progress });
    const adapt = () => page.getByRole('button', { name: 'Adapt a copy of station Original routine', exact: true });
    await adapt().click();
    await page.waitForFunction(() => document.activeElement?.id === 'sel-station-name-input');
    const builder = page.getByRole('region', { name: 'Station Builder', exact: true });
    await builder.getByRole('textbox', { name: 'Station name', exact: true }).fill('Discarded draft');
    await builder.getByRole('button', { name: 'Cancel station builder', exact: true }).click();
    expect(await page.evaluate(() => window.__alloflowSelStations)).toEqual([station]);
    await adapt().click();
    await builder.getByRole('textbox', { name: 'Station name', exact: true }).fill('Adapted routine');
    await builder.getByRole('textbox', { name: 'Teacher note', exact: true }).fill('Model, then invite a chosen response.');
    const moveActivity = builder.getByRole('button', { name: 'Move activity Feelings Journal later', exact: true });
    await moveActivity.focus(); await page.keyboard.press('Enter');
    expect(await builder.locator('[data-builder-tool-id]').evaluateAll(nodes => nodes.map(n => n.dataset.builderToolId))).toEqual(['zones', 'journal']);
    let step = builder.locator('[data-builder-step-id]').first();
    await step.locator('summary').click();
    const reflectionId = await step.getAttribute('data-builder-step-id');
    await step.getByRole('textbox', { name: 'Step title', exact: true }).fill('Notice and choose');
    await step.getByRole('textbox', { name: 'Reflection prompt', exact: true }).fill('What could help in a new situation?');
    await step.getByRole('combobox', { name: 'Related activity' }).selectOption('zones');
    await step.getByRole('button', { name: 'Move step 1 later', exact: true }).focus();
    await page.keyboard.press('Enter');
    expect(await builder.locator('[data-builder-step-id]').last().getAttribute('data-builder-step-id')).toBe(reflectionId);
    expect(await builder.locator('[data-builder-step-id]').last().getByRole('textbox', { name: 'Reflection prompt' }).inputValue()).toBe('What could help in a new situation?');
    await builder.getByRole('button', { name: '+ Add practice step', exact: true }).click();
    step = builder.locator('[data-builder-step-id]').last();
    await step.getByRole('textbox', { name: 'Step title', exact: true }).fill('Model one example');
    await step.getByRole('button', { name: 'Move step 3 earlier', exact: true }).click();
    await builder.getByRole('button', { name: '+ Add reflection step', exact: true }).click();
    step = builder.locator('[data-builder-step-id]').last();
    await step.getByRole('button', { name: /^Remove quest/ }).click();
    expect(await builder.locator('[data-builder-step-id]').count()).toBe(3);
    await builder.getByRole('button', { name: 'Save this station', exact: true }).click();
    const guide = page.getByRole('region', { name: 'Active SEL Station: Adapted routine', exact: true });
    await guide.waitFor();
    const saved = await page.evaluate(() => ({ stations: window.__alloflowSelStations, progress: window.__alloflowSelProgress }));
    expect(saved.stations).toHaveLength(2);
    expect(saved.stations[0]).toEqual(station);
    expect(saved.progress.source).toEqual(progress.source);
    const copy = saved.stations[1];
    expect(copy.id).not.toBe(station.id);
    expect(copy.tools).toEqual(['zones', 'journal']);
    expect(copy.quests.map(q => q.label)).toEqual(['Original practice', 'Model one example', 'Notice and choose']);
    expect(copy.quests.every(q => !['reflect', 'practice'].includes(q.qid))).toBe(true);
    expect(copy.quests[2].params.prompt).toBe('What could help in a new situation?');
    expect(copy.quests[2].toolId).toBe('zones');
    expect(await guide.innerText()).toContain('0 of 3 steps recorded');
    expect(await guide.getByRole('textbox').inputValue()).toBe('');
    await mount(1280, '', saved);
    await page.getByRole('button', { name: 'Activate station Adapted routine', exact: true }).click();
    expect(await page.locator('[data-sel-tool-card-id]').evaluateAll(nodes => nodes.map(n => n.dataset.selToolCardId))).toEqual(['zones', 'journal']);
    expect(await page.getByRole('region', { name: 'Active SEL Station: Adapted routine', exact: true }).innerText()).toContain('What could help in a new situation?');
    expect(errors).toEqual([]);
  }, 120000);

  it('lets copied legacy steps become optional self-checks and prevents untargeted timed steps', async () => {
    const station = { id: 'legacy-copy', name: 'Legacy routine', tools: ['journal'], quests: [
      { qid: 'timed', type: 'timeSpent', label: 'Spend time', toolId: 'journal', params: { minutes: 3 } },
      { qid: 'written', type: 'freeResponse', label: 'Write', params: { minLength: 70, prompt: 'Original question' } },
    ] };
    await mount(1280, '', { stations: [station] });
    await page.getByRole('button', { name: 'Adapt a copy of station Legacy routine', exact: true }).click();
    const builder = page.getByRole('region', { name: 'Station Builder', exact: true });
    let step = builder.locator('[data-builder-step-id]').first();
    await step.locator('summary').click();
    await step.getByRole('combobox', { name: 'Related activity' }).selectOption('');
    expect(await builder.getByRole('button', { name: 'Save this station' }).isDisabled()).toBe(true);
    await step.getByRole('button', { name: 'Use learner self-check', exact: true }).click();
    expect(await builder.getByRole('button', { name: 'Save this station' }).isEnabled()).toBe(true);
    step = builder.locator('[data-builder-step-id]').last();
    await step.locator('summary').click();
    expect(await step.innerText()).toContain('70 characters');
    await step.getByRole('button', { name: 'Use learner self-check', exact: true }).click();
    await builder.getByRole('button', { name: 'Save this station', exact: true }).click();
    await page.getByRole('region', { name: 'Active SEL Station: Legacy routine — adapted', exact: true }).waitFor();
    const saved = await page.evaluate(() => window.__alloflowSelStations);
    expect(saved[0]).toEqual(station);
    expect(saved[1].quests[0].type).toBe('manualComplete');
    expect(saved[1].quests[1].params).toEqual({ prompt: 'Original question', selfCheck: true });
    expect(errors).toEqual([]);
  }, 120000);

  it.each(['', 'theme-dark', 'theme-contrast'])('keeps the station authoring controls accessible at 320px in %s', async theme => {
    await mount(320, theme, { stations: [{ id: 'builder-phone', name: 'A small practice', tools: ['journal', 'zones'], quests: [] }] });
    await page.getByRole('button', { name: 'Adapt a copy of station A small practice', exact: true }).click();
    const builder = page.getByRole('region', { name: 'Station Builder', exact: true });
    await builder.getByRole('button', { name: '+ Add reflection step', exact: true }).click();
    const layout = await builder.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth, buttons: [...el.querySelectorAll('button')].filter(b => b.getBoundingClientRect().height > 0).map(b => b.getBoundingClientRect().height) }));
    expect(layout.scroll).toBeLessThanOrEqual(layout.client + 1);
    expect(layout.buttons.every(height => height >= 44)).toBe(true);
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const audit = await page.evaluate(async () => {
      const result = await window.axe.run(document.querySelector('[aria-label="Station Builder"]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'select-name'] } });
      return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
    });
    fs.writeFileSync(path.join(reports, (theme || 'light') + '-builder-axe.json'), JSON.stringify(audit, null, 2));
    expect(audit).toEqual([]);
    await builder.locator('[data-builder-step-id]').last().evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(reports, (theme || 'light') + '-builder-phone.png') });
    expect(errors).toEqual([]);
  }, 120000);

  it.each(['', 'theme-dark', 'theme-contrast'])('keeps station reflection accessible at 320px in %s', async theme => {
    const station = { id: 'phone-station', name: 'One small practice', tools: ['zones', 'journal'], quests: [
      { qid: 'reflection', type: 'freeResponse', label: 'Choose a next step', params: { selfCheck: true, prompt: 'When could this help? What support could you ask for?' } },
    ] };
    await mount(320, theme, { stations: [station] });
    await page.getByRole('button', { name: 'Activate station One small practice', exact: true }).click();
    const guide = page.getByRole('region', { name: 'Active SEL Station: One small practice', exact: true });
    await guide.getByRole('button', { name: 'Mark "Choose a next step" as complete', exact: true }).click();
    const layout = await guide.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth, buttons: [...el.querySelectorAll('button')].map(b => b.getBoundingClientRect().height) }));
    expect(layout.scroll).toBeLessThanOrEqual(layout.client + 1);
    expect(layout.buttons.every(height => height >= 44)).toBe(true);
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const audit = await page.evaluate(async () => {
      const result = await window.axe.run(document.getElementById('sel-active-station-guide'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label'] } });
      return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
    });
    fs.writeFileSync(path.join(reports, (theme || 'light') + '-station-axe.json'), JSON.stringify(audit, null, 2));
    expect(audit).toEqual([]);
    await guide.evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(reports, (theme || 'light') + '-station-phone.png') });
    expect(errors).toEqual([]);
  }, 120000);

  it.each(['', 'theme-dark', 'theme-contrast'])('renders catalog and pathway with readable colors: %s', async theme => {
    await mount(1280, theme);
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const audit = await page.evaluate(async () => {
      const result = await window.axe.run(document.querySelector('[aria-label="SEL Hub tool selection"]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label'] } });
      return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
    });
    fs.writeFileSync(path.join(reports, (theme || 'light') + '-axe.json'), JSON.stringify(audit, null, 2));
    expect(audit).toEqual([]);
    await startPathway('Friendship & Social Skills');
    await page.getByText('Model, practice, and reflect', { exact: true }).click();
    const guideAudit = await page.evaluate(async () => {
      const result = await window.axe.run(document.querySelector('[aria-label="Pathway practice guide"]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name'] } });
      return result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }));
    });
    expect(guideAudit).toEqual([]);
    fs.writeFileSync(path.join(reports, (theme || 'light') + '-guide-axe.json'), JSON.stringify(guideAudit, null, 2));
    await page.screenshot({ path: path.join(reports, (theme || 'light') + '.png') });
    expect(errors).toEqual([]);
  }, 120000);
});
