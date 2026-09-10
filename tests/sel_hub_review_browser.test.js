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
    if (seed.draft) localStorage.setItem('alloflow_sel_builder_draft', JSON.stringify(seed.draft));
    window.reviewGrade = seed.grade || '8th Grade';
    window.reviewSession = seed.session || null;
    window.reviewBlockedWrites = seed.blockWrites || [];
    window.reviewExportFails = !!seed.exportFails;
    window.reviewBlockedRemovals = seed.blockRemovals || [];
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) {
      if (window.reviewBlockedRemovals.includes(key)) throw new DOMException('Storage unavailable', 'SecurityError');
      return remove.call(this, key);
    };
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (window.reviewBlockedWrites.includes(key)) throw new DOMException('Storage full', 'QuotaExceededError');
      return write.call(this, key, value);
    };
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
        selHubTab: tab, setSelHubTab: setTab, addToast: noop, gradeLevel: window.reviewGrade || '8th Grade', activeSessionCode: window.reviewSession || null,
        callGemini: null, onSafetyFlag: noop, studentCodename: 'review', t: (key, fallback) => fallback || key,
        ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested: () => { if (window.reviewExportFails) throw new Error('Save unavailable'); if (window.reviewExportRejects) return Promise.reject(new Error('Save rejected')); window.reviewExportRequests = (window.reviewExportRequests || 0) + 1; },
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
  afterAll(async () => { await browser?.close(); }, 180000);

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

  it('recovers an interrupted draft and undoes removals without overwriting later edits', async () => {
    await mount();
    await page.locator('details[aria-label="Teacher launch routines"] > summary').click();
    await page.getByRole('button', { name: 'Load teacher launch plan: Morning advisory check-in', exact: true }).click();
    let builder = page.getByRole('region', { name: 'Station Builder', exact: true });
    await builder.getByRole('textbox', { name: 'Station name', exact: true }).fill('Recover this draft');
    const before = await builder.locator('[data-builder-step-id]').count();
    await builder.getByRole('button', { name: 'Clear all quests', exact: true }).click();
    await builder.getByRole('button', { name: '+ Add practice step', exact: true }).click();
    await builder.getByRole('textbox', { name: 'Step title', exact: true }).fill('A later addition');
    await builder.getByRole('button', { name: 'Undo removed steps', exact: true }).click();
    expect(await builder.locator('[data-builder-step-id]').count()).toBe(before + 1);
    expect(await builder.getByRole('textbox', { name: 'Step title', exact: true }).inputValue()).toBe('A later addition');
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('alloflow_sel_builder_draft')));
    expect(draft.quests.at(-1).label).toBe('A later addition');
    await mount(1280, '', { draft });
    await page.getByRole('button', { name: 'Resume station draft', exact: true }).click();
    builder = page.getByRole('region', { name: 'Station Builder', exact: true });
    expect(await builder.getByRole('textbox', { name: 'Station name', exact: true }).inputValue()).toBe('Recover this draft');
    expect(await builder.locator('[data-builder-step-id]').count()).toBe(before + 1);
    await builder.getByRole('button', { name: 'Save this station', exact: true }).click();
    await page.getByRole('region', { name: 'Active SEL Station: Recover this draft', exact: true }).waitFor();
    expect(await page.evaluate(() => localStorage.getItem('alloflow_sel_builder_draft'))).toBe(null);
    const saved = await page.evaluate(() => window.__alloflowSelStations.at(-1));
    expect(saved.quests.at(-1).label).toBe('A later addition');
    expect(errors).toEqual([]);
  }, 120000);

  it('undoes multiple station deletions with original records intact', async () => {
    const stations = ['First', 'Second'].map((name, index) => ({ id: 'undo-' + index, name, tools: ['journal'], quests: [] }));
    const progress = { 'undo-0': { old: { response: 'Keep this original note', complete: true } } };
    await mount(1280, '', { stations, progress });
    for (const name of ['First', 'Second']) await page.getByRole('button', { name: 'Delete station ' + name, exact: true }).click();
    expect(await page.getByRole('button', { name: /^Undo removal:/ }).count()).toBe(2);
    await page.getByRole('button', { name: 'Undo removal: First', exact: true }).click();
    await page.getByRole('button', { name: 'Undo removal: Second', exact: true }).focus();
    await page.keyboard.press('Enter');
    const saved = await page.evaluate(() => ({ stations: window.__alloflowSelStations, progress: window.__alloflowSelProgress }));
    expect(saved.stations).toEqual(stations);
    expect(saved.progress).toEqual(progress);
    expect(await page.getByRole('region', { name: 'Removed stations', exact: true }).count()).toBe(0);
    expect(errors).toEqual([]);
  }, 120000);

  it('reports local saving failures, retries, and distinguishes requested from completed project saves', async () => {
    const station = { id: 'save-failure', name: 'Save failure', tools: ['journal'], quests: [] };
    await mount(1280, '', { stations: [station], blockWrites: ['alloflow_sel_stations', 'alloflow_sel_station_progress'], exportFails: true });
    const saving = page.getByRole('region', { name: 'SEL saving and sharing', exact: true });
    expect(await saving.getByRole('alert').innerText()).toContain('could not be saved');
    await saving.locator('summary').click();
    await saving.getByRole('button', { name: 'Request project save', exact: true }).click();
    expect(await saving.getByRole('status').innerText()).toContain('request failed');
    await page.evaluate(() => { window.reviewBlockedWrites = []; window.reviewExportFails = false; });
    await saving.getByRole('button', { name: 'Retry local saving', exact: true }).click();
    expect(await saving.getByRole('alert').count()).toBe(0);
    await saving.getByRole('button', { name: 'Request project save', exact: true }).click();
    expect(await saving.getByRole('status').innerText()).toContain('a saved file has not been confirmed');
    expect(await page.evaluate(() => window.reviewExportRequests)).toBe(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('alloflow_sel_stations')))).toEqual([station]);
    expect(errors).toEqual([]);
  }, 120000);

  it('matches stated goals, time and response choices and explains empty matches', async () => {
    await mount();
    const chooser = page.locator('details[aria-label="Help me choose an activity"]');
    await chooser.locator('summary').click();
    await chooser.getByRole('combobox', { name: 'What would help?' }).selectOption('conversation');
    await chooser.getByRole('combobox', { name: 'Time for a first step' }).selectOption('2');
    expect(await chooser.getByRole('status').innerText()).toContain('No starting option');
    await chooser.getByRole('combobox', { name: 'Time for a first step' }).selectOption('5');
    await chooser.getByRole('combobox', { name: 'How would you like to respond?' }).selectOption('offline');
    expect(await chooser.locator('article').count()).toBe(1);
    expect(await chooser.locator('article').innerText()).toContain('Why this option: prepare a conversation');
    expect(await chooser.locator('article').innerText()).toContain('without typing');
    await chooser.getByRole('button', { name: /^Open / }).focus(); await page.keyboard.press('Enter');
    const support = page.locator('details[aria-label="Practice support"]');
    await support.locator(':scope > summary').click();
    expect(await support.innerText()).toContain('do not fill or submit');
    await support.getByRole('button', { name: 'Return to activities', exact: true }).click();
    expect(await page.locator('[data-sel-tool-card-id]').count()).toBeGreaterThan(70);
    expect(await page.evaluate(() => Object.keys(localStorage).some(key => /chooseNeed|chooseTime|chooseResponse/.test(key)))).toBe(false);
    expect(errors).toEqual([]);
  }, 120000);

  it('offers all 24 pathway examples and defaults to the configured grade without locking learner choice', async () => {
    await mount(1280, '', { grade: '2nd Grade' });
    for (const name of ['Morning Check-In', 'Calm Down Corner', 'Conflict Resolution Unit', 'Empathy & Perspective Week', 'Decision-Making Deep Dive', 'Self-Discovery Journey', 'Friendship & Social Skills', 'Navigating Change']) {
      await startPathway(name);
      const guide = page.getByRole('region', { name: 'Pathway practice guide' });
      await guide.getByText('Model, practice, and reflect', { exact: true }).click();
      const examples = guide.getByRole('region', { name: 'Adaptable practice example' });
      const texts = [];
      for (const level of ['elementary', 'middle', 'high']) {
        await examples.getByRole('combobox').selectOption(level);
        texts.push(await examples.locator('p').first().innerText());
      }
      expect(new Set(texts).size).toBe(3);
      expect(texts.every(text => text.includes('Model:'))).toBe(true);
      await guide.getByRole('button', { name: 'Exit pathway mode' }).click();
    }
    await mount(1280, '', { grade: '2nd Grade' });
    await startPathway('Morning Check-In');
    await page.getByText('Model, practice, and reflect', { exact: true }).click();
    expect(await page.getByRole('combobox', { name: 'Choose an example level' }).inputValue()).toBe('elementary');
    expect(errors).toEqual([]);
  }, 120000);

  it('keeps research qualifications visible and live-session sharing status accurate', async () => {
    await mount(1280, '', { session: 'REVIEW' });
    const saving = page.getByRole('region', { name: 'SEL saving and sharing', exact: true });
    await saving.locator('summary').click();
    expect(await saving.innerText()).toContain('A live session is connected');
    expect(await saving.innerText()).toContain('may send progress or safety signals');
    const research = page.locator('details[aria-label="About research labels"]');
    await research.locator('summary').click();
    expect(await research.innerText()).toContain('does not establish that this digital activity has the same effects');
    expect(await page.getByText('Strong evidence', { exact: true }).count()).toBe(0);
    expect(await page.getByText('Research-informed approach', { exact: true }).count()).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  }, 120000);

  it('retries a failed draft discard without silently recreating that draft', async () => {
    const draft = { version: 1, name: 'Discard me', note: '', tools: { journal: true }, quests: [] };
    await mount(1280, '', { draft, blockRemovals: ['alloflow_sel_builder_draft'] });
    await page.getByRole('button', { name: 'Discard station draft', exact: true }).click();
    const saving = page.getByRole('region', { name: 'SEL saving and sharing', exact: true });
    expect(await saving.getByRole('alert').count()).toBe(1);
    expect(await page.getByRole('button', { name: 'Resume station draft', exact: true }).count()).toBe(1);
    await page.evaluate(() => { window.reviewBlockedRemovals = []; });
    await saving.locator(':scope > details > summary').click();
    await saving.getByRole('button', { name: 'Retry local saving', exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem('alloflow_sel_builder_draft'))).toBe(null);
    expect(await page.getByRole('button', { name: 'Resume station draft', exact: true }).count()).toBe(0);
    expect(await saving.getByRole('alert').count()).toBe(0);
    expect(errors).toEqual([]);
  }, 120000);

  it('uses honest feedback from existing save controls and only confirms on a host acknowledgement', async () => {
    await mount(1280, '', { exportFails: true });
    await page.getByRole('button', { name: 'Save or export SEL work now', exact: true }).click();
    const saving = page.getByRole('region', { name: 'SEL saving and sharing', exact: true });
    expect(await saving.getByRole('status').innerText()).toContain('request failed');
    await page.evaluate(() => { window.reviewExportFails = false; window.reviewExportRejects = true; });
    await saving.getByRole('button', { name: 'Request project save', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('[aria-label="SEL saving and sharing"] [role="status"]').textContent.includes('request failed'));
    await page.evaluate(() => { window.reviewExportRejects = false; });
    await page.locator('[data-sel-tool-card-id="journal"]').click();
    await page.getByRole('button', { name: 'Export SEL project file now', exact: true }).click();
    expect(await saving.getByRole('status').innerText()).toContain('a saved file has not been confirmed');
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('alloflow-project-saved')));
    expect(await saving.getByRole('status').innerText()).toContain('host reported a completed project save');
    expect(errors).toEqual([]);
  }, 120000);

  it('clears recovery state with a full SEL data reset', async () => {
    const draft = { version: 1, name: 'Draft to clear', note: 'Fictional authoring note', tools: { journal: true }, quests: [{ qid: 'clear', type: 'manualComplete', label: 'Example', params: {} }] };
    await mount(1280, '', { draft, stations: [{ id: 'clear-station', name: 'Clear station', tools: ['journal'], quests: [] }] });
    await page.getByRole('button', { name: 'Delete station Clear station', exact: true }).click();
    await page.getByRole('button', { name: 'Resume station draft', exact: true }).click();
    await page.getByRole('button', { name: 'Clear all quests', exact: true }).click();
    await page.getByRole('button', { name: 'For Educators: how to use this Hub responsibly', exact: true }).click();
    await page.locator('#sel-clear-all-data-button').click();
    await page.getByRole('button', { name: 'Permanently delete all SEL data', exact: true }).click();
    expect(await page.getByRole('button', { name: /^Undo removal:/ }).count()).toBe(0);
    expect(await page.getByRole('button', { name: 'Undo removed steps', exact: true }).count()).toBe(0);
    expect(await page.getByRole('button', { name: 'Resume station draft', exact: true }).count()).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem('alloflow_sel_builder_draft'))).toBe(null);
    expect(await page.evaluate(() => window.__alloflowSelStations || [])).toEqual([]);
    expect(errors).toEqual([]);
  }, 120000);

  async function openJournal(data = {}, width = 1280, theme = '') {
    await mount(width, theme);
    await page.evaluate(data => {
      window.__alloflowSelToolData = { journal: { activeTab: 'journal', soundEnabled: false, earnedBadges: { first_journal: true }, ...data } };
      window.dispatchEvent(new Event('alloflow-sel-tooldata-restored'));
    }, data);
    await page.locator('[data-sel-tool-card-id="journal"]').click();
    return page.getByRole('region', { name: 'Journal writing and saved entries', exact: true });
  }

  async function openGoalReview(data = {}, width = 1280, theme = '') {
    await mount(width, theme);
    await page.evaluate(data => {
      window.__alloflowSelToolData = { goals_tool: { tab: 'checkin', ...data } };
      window.dispatchEvent(new Event('alloflow-sel-tooldata-restored'));
    }, data);
    await page.locator('[data-sel-tool-card-id="goals"]').click();
    return page.getByRole('region', { name: 'Weekly goal review', exact: true });
  }

  const completedNoteGoal = (id, text) => ({ id, text, category: 'academic', completed: true, progress: 100, createdAt: Date.now() - 86400000, completedAt: Date.now(), steps: [{ text: 'Try a model', done: true }], reflections: [], customField: 'keep me' });
  const noteState = () => page.evaluate(() => window.__alloflowSelToolData.goals_tool);
  const noteRegion = name => page.getByRole('region', { name, exact: true });
  const noteButton = (root, name) => root.getByRole('button', { name, exact: true });
  const noteField = (root, name) => root.getByRole('textbox', { name, exact: true });

  it('goal notes keep separate drafts across goals, tabs and project restore', async () => {
    await openGoalReview({ tab: 'goals', goals: [completedNoteGoal('note-a', 'First practice'), completedNoteGoal('note-b', 'Second practice')], goalNotesDrafts: { 'note-a': { whatLearned: 'An unfinished completion note.' } } });
    await noteButton(page, 'Reflect on First practice').click();
    let form = noteRegion('Reflection for First practice');
    await page.waitForFunction(() => document.activeElement?.id === 'goal-note-note-a-whatWorked');
    await noteField(form, 'What helped? (optional)').fill('A model.\nMore time.');
    await noteField(form, 'What might come next? (optional)').fill('A break, then another try.');
    await noteButton(page, 'Reflect on Second practice').click();
    const second = noteRegion('Reflection for Second practice');
    expect(await noteField(second, 'What helped? (optional)').inputValue()).toBe('');
    await noteField(second, 'What helped? (optional)').fill('A different example.');
    await page.locator('#goal-tab-checkin').click(); await page.locator('#goal-tab-goals').click();
    expect(await noteField(second, 'What helped? (optional)').inputValue()).toBe('A different example.');
    await openGoalReview(JSON.parse(JSON.stringify(await noteState())));
    await noteButton(page, 'Reflect on First practice').click();
    form = noteRegion('Reflection for First practice');
    expect(await noteField(form, 'What helped? (optional)').inputValue()).toBe('A model.\nMore time.');
    await noteButton(form, 'Save reflection').click();
    await page.waitForFunction(() => document.activeElement?.id === 'goal-completed-note-a');
    const data = await noteState();
    expect(data.goals[0].reflections[0]).toMatchObject({ whatWorked: 'A model.\nMore time.', nextGoal: 'A break, then another try.', hardestPart: '', doDifferently: '' });
    expect(data.goalNotesDrafts).toEqual({ 'note-a': { whatLearned: 'An unfinished completion note.' }, 'note-b': { whatWorked: 'A different example.' } });
    expect(data.goals[0].customField).toBe('keep me');
    const card = noteRegion('Completed goal: First practice');
    await card.getByText('Saved reflections (1)', { exact: true }).click();
    expect(await card.getByRole('article').innerText()).toContain('A model.\nMore time.');
  }, 120000);

  it('goal notes pause and restore completion writing without erasing reflection drafts', async () => {
    await openGoalReview({ tab: 'goals', goals: [completedNoteGoal('note-c', 'Try a short section')], goalNotesDrafts: { 'note-c': { whatWorked: 'An unfinished reflection.' } } });
    await noteButton(page, 'Completion note for Try a short section').click();
    let form = noteRegion('Completion note for Try a short section');
    await page.waitForFunction(() => document.activeElement?.id === 'goal-note-note-c-whatLearned');
    await form.getByRole('textbox').fill('The audio version helped.\nI can use it again.');
    await noteButton(form, 'Pause for now').click();
    await page.waitForFunction(() => document.activeElement?.id === 'goal-completed-note-c');
    expect(await page.getByText(/Completion note paused/).count()).toBe(1);
    await noteButton(page, 'Completion note for Try a short section').click();
    await page.locator('#goal-tab-vision').click(); await page.locator('#goal-tab-goals').click();
    expect(await form.getByRole('textbox').inputValue()).toContain('The audio version helped.');
    await openGoalReview(JSON.parse(JSON.stringify(await noteState())));
    form = noteRegion('Completion note for Try a short section');
    expect(await form.getByRole('textbox').inputValue()).toBe('The audio version helped.\nI can use it again.');
    await noteButton(form, 'Save completion note').click();
    await page.waitForFunction(() => document.activeElement?.id === 'goal-completed-note-c');
    const data = await noteState();
    expect(data.goalNotesDrafts).toEqual({ 'note-c': { whatWorked: 'An unfinished reflection.' } });
    expect(data.goals[0].completionJournal.whatLearned).toBe('The audio version helped.\nI can use it again.');
    expect(data.goals[0].customField).toBe('keep me');
  }, 120000);

  it('goal notes allow blank responses and pausing without creating another goal', async () => {
    await openGoalReview({ tab: 'goals', goals: [completedNoteGoal('note-d', 'Pause and reflect')] });
    await noteButton(page, 'Reflect on Pause and reflect').click();
    let form = noteRegion('Reflection for Pause and reflect');
    await noteField(form, 'What got in the way? (optional)').fill('A draft barrier.');
    await noteButton(form, 'Pause for now').click();
    await page.waitForFunction(() => document.activeElement?.id === 'goal-completed-note-d');
    await noteButton(page, 'Reflect on Pause and reflect').click();
    form = noteRegion('Reflection for Pause and reflect');
    expect(await noteField(form, 'What got in the way? (optional)').inputValue()).toBe('A draft barrier.');
    await noteField(form, 'What got in the way? (optional)').fill('');
    await noteButton(form, 'Save reflection').click();
    await noteButton(page, 'Completion note for Pause and reflect').click();
    await noteButton(noteRegion('Completion note for Pause and reflect'), 'Save completion note').click();
    const data = await noteState();
    expect(data.goals).toHaveLength(1);
    expect(data.goals[0].reflections[0]).toMatchObject({ whatWorked: '', hardestPart: '', doDifferently: '', nextGoal: '' });
    expect(data.goals[0].completionJournal.whatLearned).toBe('');
    expect(data.goalNotesDrafts).toEqual({});
    expect(await page.getByText('No written note recorded.', { exact: true }).count()).toBe(1);
    await page.getByText('Saved reflections (1)', { exact: true }).click();
    expect(await page.getByText('No written responses recorded.', { exact: true }).count()).toBe(1);
  }, 120000);

  it('goal notes are removed with their goal without clearing another goal draft', async () => {
    const goal = { ...completedNoteGoal('remove-note', 'Remove this goal'), completed: false, progress: 0 };
    await openGoalReview({ tab: 'goals', goals: [goal, completedNoteGoal('keep-note', 'Keep this goal')], goalNotesDrafts: { 'remove-note': { whatWorked: 'Remove with goal.' }, 'keep-note': { whatLearned: 'Keep with goal.' } } });
    await noteButton(page, 'Delete goal: Remove this goal').click();
    const data = await noteState();
    expect(data.goals.map(goal => goal.id)).toEqual(['keep-note']);
    expect(data.goalNotesDrafts).toEqual({ 'keep-note': { whatLearned: 'Keep with goal.' } });
  }, 120000);

  it('goal notes receive keyboard focus when the final step completes', async () => {
    const goal = { ...completedNoteGoal('last-step', 'Finish one practice'), completed: false, progress: 0, completedAt: null, steps: [{ text: 'Try a model', done: false }] };
    await openGoalReview({ tab: 'goals', goals: [goal], expandedGoalId: goal.id });
    await noteButton(page, 'Mark complete: Try a model').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement?.id === 'goal-completion-review-last-step');
    const form = noteRegion('Completion note for Finish one practice');
    expect(await form.innerText()).toContain('does not require a written reflection or another goal');
    await noteButton(form, 'Pause for now').click();
    await page.waitForFunction(() => document.activeElement?.id === 'goal-completed-last-step');
    expect((await noteState()).goals[0].completed).toBe(true);
  }, 120000);

  it('goal notes retain legacy reflections and describe missing dates honestly', async () => {
    const goal = { ...completedNoteGoal('legacy-note', 'An earlier practice'), completionJournal: { whatLearned: 'An earlier note.', savedAt: 1234, customNote: true }, reflections: [{ whatWorked: 'A familiar tool.', hardestPart: 'The time limit.', customReflection: true }] };
    await openGoalReview({ tab: 'goals', goals: [goal] });
    const card = noteRegion('Completed goal: An earlier practice');
    expect(await card.innerText()).toContain('An earlier note.');
    await card.getByText('Saved reflections (1)', { exact: true }).click();
    expect(await card.getByRole('article').innerText()).toContain('Saved reflection (date not recorded)');
    expect(await card.getByRole('article').innerText()).toContain('A familiar tool.');
    expect(await card.getByRole('article').innerText()).toContain('The time limit.');
    expect((await noteState()).goals[0]).toEqual(goal);
  }, 120000);

  it.each(['', 'theme-dark', 'theme-contrast'])('goal notes fit a phone and have accessible labels in %s', async theme => {
    await openGoalReview({ tab: 'goals', goals: [completedNoteGoal('phone-note', 'Practice with an example and choose a helpful support')] }, 320, theme);
    await noteButton(page, 'Reflect on Practice with an example and choose a helpful support').click();
    const reflection = noteRegion('Reflection for Practice with an example and choose a helpful support');
    await noteField(reflection, 'What helped? (optional)').fill('A model and more time.');
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    async function auditNote(region, kind) {
      const violations = await region.evaluate(async node => {
        const result = await window.axe.run(node, { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'select-name', 'label-content-name-mismatch'] } });
        return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) }));
      });
      fs.writeFileSync(path.join(reports, (theme || 'light') + '-goal-' + kind + '-axe.json'), JSON.stringify(violations, null, 2));
      expect(violations).toEqual([]);
      expect(await region.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
      expect(await region.locator('button:visible, textarea:visible').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44))).toBe(true);
      await noteButton(region, 'Pause for now').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(reports, (theme || 'light') + '-goal-' + kind + '-phone.png') });
    }
    await auditNote(reflection, 'reflection');
    await noteButton(reflection, 'Pause for now').click();
    await noteButton(page, 'Completion note for Practice with an example and choose a helpful support').click();
    const completion = noteRegion('Completion note for Practice with an example and choose a helpful support');
    await completion.getByRole('textbox').fill('A short section was a useful place to start.');
    await auditNote(completion, 'completion');
    expect(errors).toEqual([]);
  }, 120000);

  it('goal review saves without a rating and preserves support and dated snapshots on restore', async () => {
    const now = Date.now();
    const goal = { id: 'review-goal', text: 'Read a short section', category: 'academic', steps: [{ text: 'Earlier step', done: true }, { text: 'Recent step', done: true, completedAt: now - 1000 }], progress: 100, completed: true };
    const region = await openGoalReview({ goals: [goal] });
    expect(await region.getByRole('region', { name: 'Goal step records' }).innerText()).toContain('1 step dated in the last 7 days; 2 of 2 steps checked overall.');
    await region.getByRole('textbox', { name: 'What got in the way? (optional)', exact: true }).fill('The fictional room was noisy.');
    await region.getByRole('textbox', { name: 'What helped, or what support could help? (optional)', exact: true }).fill('Try an audio version in a quieter space.');
    await region.getByRole('textbox', { name: 'What might I try or change next? (optional)', exact: true }).fill('Try a shorter section.');
    await region.getByRole('button', { name: 'Save weekly review', exact: true }).click();
    expect(await region.getByRole('status').innerText()).toContain('Review added');
    const saved = await page.evaluate(() => window.__alloflowSelToolData.goals_tool);
    expect(saved.weeklyCheckins).toHaveLength(1);
    expect(saved.weeklyCheckins[0]).toMatchObject({ rating: null, support: 'Try an audio version in a quieter space.', summaryVersion: 2 });
    expect(saved.weeklyCheckins[0].periodEnd - saved.weeklyCheckins[0].periodStart).toBe(7 * 86400000);
    expect(saved.weeklyCheckins[0].progressSummary[0]).toMatchObject({ stepsComplete: 1, undatedComplete: 1 });
    expect(saved.goals[0].steps[0].completedAt).toBeUndefined();
    await openGoalReview(JSON.parse(JSON.stringify(saved)));
    const history = page.locator('details[aria-label="Saved weekly goal reviews"]');
    await history.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
    expect(await history.innerText()).toContain('Rating: Not recorded');
    expect(await history.innerText()).toContain('Try an audio version in a quieter space.');
  }, 120000);

  it('goal review records and clears step dates through keyboard completion', async () => {
    await openGoalReview({ tab: 'goals', expandedGoalId: 'dates', goals: [{ id: 'dates', text: 'Try two steps', category: 'personal', steps: [{ text: 'Try an example', done: false }, { text: 'Reflect later', done: false }], progress: 0, completed: false }] });
    const step = page.getByRole('button', { name: 'Mark complete: Try an example', exact: true });
    await step.focus(); await page.keyboard.press('Enter');
    let data = await page.evaluate(() => window.__alloflowSelToolData.goals_tool);
    expect(data.goals[0].steps[0].completedAt).toBeGreaterThan(0);
    await page.locator('#goal-tab-checkin').click();
    expect(await page.getByRole('region', { name: 'Goal step records' }).innerText()).toContain('1 step dated in the last 7 days');
    await page.locator('#goal-tab-goals').click();
    await page.getByRole('button', { name: 'Mark incomplete: Try an example', exact: true }).click();
    data = await page.evaluate(() => window.__alloflowSelToolData.goals_tool);
    expect(data.goals[0].steps[0]).toMatchObject({ done: false, completedAt: null });
    await page.locator('#goal-tab-checkin').click();
    expect(await page.getByRole('region', { name: 'Goal step records' }).innerText()).toContain('0 steps dated in the last 7 days');
  }, 120000);

  it('goal review retains legacy snapshots and excludes missing ratings from both averages', async () => {
    const region = await openGoalReview({ weeklyCheckins: [{ id: 'old', date: Date.now(), rating: 4, progressSummary: [{ text: 'Older goal', progress: 50 }] }, { id: 'missing', date: Date.now(), rating: 0 }] });
    await region.getByRole('combobox').selectOption('2');
    await region.getByRole('button', { name: 'Save weekly review', exact: true }).click();
    const history = region.locator('details[aria-label="Saved weekly goal reviews"]');
    await history.locator(':scope > summary').click();
    expect(await history.innerText()).toContain('3.0/5 from 2 rated check-ins');
    expect(await history.innerText()).toContain('completion dates were not tracked');
    expect(await history.innerText()).toContain('50% overall progress recorded at that time.');
    await page.locator('#goal-tab-progress').click();
    expect(await page.getByText(/Average recorded rating: 3.0/).count()).toBe(1);
    expect(errors).toEqual([]);
  }, 120000);

  it.each(['', 'theme-dark', 'theme-contrast'])('goal review and saved history fit a phone in %s', async theme => {
    const region = await openGoalReview({ goals: [{ id: 'phone-goal', text: 'A fictional learner practices with an example', steps: [{ done: true }] }] }, 320, theme);
    await region.getByRole('textbox', { name: 'What helped, or what support could help? (optional)', exact: true }).fill('A model and more time.');
    await region.getByRole('button', { name: 'Save weekly review', exact: true }).click();
    await region.locator('details[aria-label="Saved weekly goal reviews"] > summary').click();
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const audit = await region.evaluate(async node => {
      const result = await window.axe.run(node, { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'select-name', 'label-content-name-mismatch'] } });
      return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) }));
    });
    fs.writeFileSync(path.join(reports, (theme || 'light') + '-goal-review-axe.json'), JSON.stringify(audit, null, 2));
    expect(audit).toEqual([]);
    expect(await region.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await region.locator('button:visible, summary:visible, select:visible').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44))).toBe(true);
    await region.getByRole('textbox', { name: 'What helped, or what support could help? (optional)', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(reports, (theme || 'light') + '-goal-review-phone.png') });
    await region.locator('details[aria-label="Saved weekly goal reviews"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(reports, (theme || 'light') + '-goal-history-phone.png') });
  }, 120000);

  it('calendar keeps dates visible, reads individual records, and handles year boundaries', async () => {
    await openJournal({ activeTab: 'calendar', calYear: 2025, calMonth: 11, earnedBadges: { calendar_viewer: true, weekly_reviewer: true }, checkIns: [
      { timestamp: new Date(2025, 11, 7, 9).getTime(), mood: 1, energy: null, thoughts: 'Private detail not in the calendar list' },
      { timestamp: new Date(2025, 11, 7, 15).getTime(), mood: 5, energy: 4 }
    ] });
    const region = page.getByRole('region', { name: 'Journal calendar and summaries', exact: true });
    const day = region.getByRole('cell', { name: 'December 7, 2025: 2 recorded check-ins', exact: true });
    expect(await day.innerText()).toContain('7');
    expect(await day.innerText()).toContain('2');
    expect(await region.getByRole('cell', { name: 'December 8, 2025: No check-in recorded', exact: true }).innerText()).toBe('8');
    const daily = region.locator('details[aria-label="Daily check-in records"]');
    await daily.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
    expect(await daily.innerText()).toContain('Mood: Struggling. Energy: Not recorded.');
    expect(await daily.innerText()).toContain('Mood: Great. Energy: 4 / 5.');
    expect(await daily.innerText()).not.toContain('Private detail');
    expect(await daily.locator('li').count()).toBe(2);
    await region.getByRole('button', { name: 'Next month', exact: true }).click();
    expect(await region.getByRole('status').innerText()).toBe('January 2026');
    expect(await region.getByRole('table', { name: 'Check-ins for January 2026', exact: true }).count()).toBe(1);
    expect(await daily.innerText()).toContain('No check-ins recorded in this month.');
    await region.getByRole('button', { name: 'Previous month', exact: true }).click();
    expect(await region.getByRole('status').innerText()).toBe('December 2025');
    await region.getByRole('button', { name: 'Current month', exact: true }).click();
    expect(await region.locator('[aria-current="date"]').count()).toBe(1);
    expect(errors).toEqual([]);
  }, 120000);

  it('calendar labels the current-week period independently of the browsed month', async () => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    await openJournal({ activeTab: 'calendar', calYear: 2020, calMonth: 0, earnedBadges: { calendar_viewer: true, weekly_reviewer: true }, checkIns: [
      { timestamp: now.getTime() + 3000, mood: 5 }, { timestamp: now.getTime() + 1000, mood: 1 }, { timestamp: now.getTime() + 2000, mood: 3 }
    ] });
    const region = page.getByRole('region', { name: 'Journal calendar and summaries', exact: true });
    expect(await region.getByRole('status').innerText()).toBe('January 2020');
    expect(await region.innerText()).toContain('This period stays on the current week');
    expect(await region.innerText()).toContain('Higher later ratings');
    expect(await region.innerText()).toContain('not a grade');
    await page.evaluate(() => { window.SelHub.printDoc = data => { window.reviewPrint = data; }; });
    await region.getByRole('button', { name: 'Print my weekly summary', exact: true }).click();
    const payload = await page.evaluate(() => window.reviewPrint);
    expect(payload.sections[0].heading).toMatch(/^Current week: /);
    expect(JSON.stringify(payload)).toContain('Rating comparison: Higher later ratings');
    expect(payload.subtitle).toContain('You choose whether');
    expect(JSON.stringify(payload)).not.toContain('improving');
  }, 120000);

  it.each(['', 'theme-dark', 'theme-contrast'])('calendar dates and records fit a phone in %s', async theme => {
    const now = new Date();
    await openJournal({ activeTab: 'calendar', earnedBadges: { calendar_viewer: true, weekly_reviewer: true }, checkIns: [1, 3, 5].map((mood, index) => ({ timestamp: new Date(now.getFullYear(), now.getMonth(), 1 + index, 10).getTime(), mood, energy: null })) }, 320, theme);
    const region = page.getByRole('region', { name: 'Journal calendar and summaries', exact: true });
    await region.locator('details[aria-label="Daily check-in records"] > summary').click();
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const audit = await region.evaluate(async node => {
      const result = await window.axe.run(node, { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'td-headers-attr', 'th-has-data-cells'] } });
      return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) }));
    });
    fs.writeFileSync(path.join(reports, (theme || 'light') + '-calendar-axe.json'), JSON.stringify(audit, null, 2));
    expect(audit).toEqual([]);
    expect(await region.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await region.locator('button:visible, summary:visible').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44))).toBe(true);
    await region.getByRole('table').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(reports, (theme || 'light') + '-calendar-phone.png') });
    await region.locator('details[aria-label="Daily check-in records"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(reports, (theme || 'light') + '-calendar-records-phone.png') });
  }, 120000);

  it('check-in keeps the overview optional and its shortcuts keyboard accessible', async () => {
    await openJournal({ activeTab: 'checkin', jViewingPast: true, jText: 'Unfinished fictional reflection', journalEntries: [{ timestamp: 1000, prompt: 'A fictional prompt', text: 'Earlier fictional reflection' }] }, 320);
    const overview = page.locator('details[aria-label="Journal overview and shortcuts"]');
    expect(await overview.evaluate(node => node.open)).toBe(false);
    const summary = overview.locator(':scope > summary');
    expect((await summary.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await summary.focus(); await page.keyboard.press('Enter');
    expect(await overview.evaluate(node => node.open)).toBe(true);
    await overview.getByRole('button', { name: /^Open journal:/i }).click();
    await page.waitForFunction(() => document.activeElement.id === 'sel-journal-entry');
    expect(await page.evaluate(() => window.__alloflowSelToolData.journal.checkIns || [])).toEqual([]);
    expect(await page.getByRole('textbox', { name: 'Journal entry', exact: true }).inputValue()).toBe('Unfinished fictional reflection');
    expect(await page.evaluate(() => window.__alloflowSelToolData.journal.journalEntries)).toHaveLength(1);
    await page.getByRole('tab', { name: /Check-In$/ }).click();
    expect(await overview.evaluate(node => node.open)).toBe(false);
    await page.getByRole('region', { name: 'Mood check-in', exact: true }).locator('h3').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(reports, 'checkin-overview-collapsed-phone.png') });
  }, 120000);

  it('check-in skips without creating a record and preserves unfinished choices', async () => {
    await openJournal({ activeTab: 'checkin', ciThoughts: 'A fictional unfinished thought', ciMood: 4 });
    const region = page.getByRole('region', { name: 'Mood check-in', exact: true });
    await region.getByRole('button', { name: 'Skip check-in and write', exact: true }).click();
    await page.waitForFunction(() => document.activeElement.id === 'sel-journal-entry');
    const data = await page.evaluate(() => window.__alloflowSelToolData.journal);
    expect(data.checkIns || []).toEqual([]);
    expect(data.ciThoughts).toBe('A fictional unfinished thought');
    expect(data.ciMood).toBe(4);
    expect(await page.getByRole('region', { name: 'Journal writing and saved entries' }).getByRole('status').innerText()).toContain('No entry was added');
    await page.getByRole('tab', { name: /Check-In$/ }).click();
    expect(await region.getByRole('button', { name: 'Good', exact: true }).getAttribute('aria-pressed')).toBe('true');
    expect(await region.getByRole('combobox', { name: 'Energy level (optional)', exact: true }).inputValue()).toBe('');
  }, 120000);

  it('check-in clears dependent emotion words and supports deselecting a mood', async () => {
    await openJournal({ activeTab: 'checkin', ciMood: 5, ciSubEmotion: 'Excited', ciExpandedEmotion: 'Elated' });
    const region = page.getByRole('region', { name: 'Mood check-in', exact: true });
    await region.getByRole('button', { name: 'Good', exact: true }).click();
    expect(await page.evaluate(() => window.__alloflowSelToolData.journal)).toMatchObject({ ciMood: 4, ciSubEmotion: null, ciExpandedEmotion: null });
    await region.getByRole('button', { name: 'Peaceful', exact: true }).click();
    const expanded = region.getByRole('button', { name: 'Good', exact: true });
    expect(await expanded.getAttribute('aria-pressed')).toBe('true');
    await region.getByRole('button', { name: 'Good', exact: true }).click();
    expect(await page.evaluate(() => window.__alloflowSelToolData.journal)).toMatchObject({ ciMood: null, ciSubEmotion: null, ciExpandedEmotion: null });
    expect(await region.getByRole('button', { name: /Save Check-In/ }).isDisabled()).toBe(true);
  }, 120000);

  it('check-in saves missing energy honestly and prints the correct weekly denominator', async () => {
    const now = Date.now();
    await openJournal({ activeTab: 'checkin', earnedBadges: { first_checkin: true, calendar_viewer: true, weekly_reviewer: true }, checkIns: [
      { timestamp: now, mood: 3, energy: null }, { timestamp: now, mood: 3, energy: 4 }
    ] });
    const region = page.getByRole('region', { name: 'Mood check-in', exact: true });
    await region.getByRole('button', { name: 'Okay', exact: true }).click();
    await region.getByRole('button', { name: /Save Check-In/ }).click();
    const data = await page.evaluate(() => window.__alloflowSelToolData.journal);
    expect(data.checkIns).toHaveLength(3);
    expect(data.checkIns[2]).toMatchObject({ mood: 3, energy: null, thoughts: '', gratitude: '', triggers: [] });
    expect(await region.getByRole('status').innerText()).toContain('Check-in added');
    await region.getByRole('button', { name: 'Hide suggested activities', exact: true }).click();
    await region.getByRole('button', { name: 'Good', exact: true }).click();
    await region.getByRole('combobox', { name: 'Energy level (optional)', exact: true }).selectOption('2');
    await region.locator('details[aria-label="Optional check-in context"] > summary').click();
    await region.getByRole('textbox', { name: 'Check-in thoughts', exact: true }).fill('A fictional learner tries a quieter space.');
    await region.getByRole('button', { name: 'School', exact: true }).click();
    expect(await region.getByRole('button', { name: 'School', exact: true }).getAttribute('aria-pressed')).toBe('true');
    await region.locator('details[aria-label="Optional check-in context"] > summary').click();
    await region.getByRole('button', { name: /Save Check-In/ }).click();
    expect(await page.evaluate(() => window.__alloflowSelToolData.journal.checkIns[3])).toMatchObject({ energy: 2, thoughts: 'A fictional learner tries a quieter space.', triggers: ['School'] });
    expect(await region.getByRole('combobox', { name: 'Energy level (optional)', exact: true }).inputValue()).toBe('');
    await page.evaluate(() => { window.SelHub.printDoc = payload => { window.reviewPrint = payload; }; });
    await page.getByRole('tab', { name: /Calendar$/ }).click();
    expect(await page.getByText('From 2 recorded ratings', { exact: true }).count()).toBe(1);
    await page.getByRole('button', { name: 'Print my weekly summary', exact: true }).click();
    const printed = await page.evaluate(() => JSON.stringify(window.reviewPrint));
    expect(printed).toContain('Average energy: 3.0 / 5 (2 recorded ratings)');
    expect(printed).toContain('Check-ins this week: 4');
    expect(errors).toEqual([]);
  }, 120000);

  it('check-in summaries display and print an entirely unrecorded energy week', async () => {
    await openJournal({ activeTab: 'calendar', earnedBadges: { calendar_viewer: true, weekly_reviewer: true }, checkIns: [
      { timestamp: Date.now(), mood: 3, energy: null }, { timestamp: Date.now(), mood: 3 }, { timestamp: Date.now(), mood: 3, energy: null }
    ] });
    expect(await page.getByText('Not recorded', { exact: true }).count()).toBe(1);
    expect(await page.getByText('From 0 recorded ratings', { exact: true }).count()).toBe(1);
    await page.evaluate(() => { window.SelHub.printDoc = payload => { window.reviewPrint = payload; }; });
    await page.getByRole('button', { name: 'Print my weekly summary', exact: true }).click();
    const printed = await page.evaluate(() => JSON.stringify(window.reviewPrint));
    expect(printed).toContain('Average energy: Not recorded (0 recorded ratings)');
    expect(printed).toContain('Check-ins this week: 3');
  }, 120000);

  it.each(['', 'theme-dark', 'theme-contrast'])('check-in controls and optional context fit a phone in %s', async theme => {
    await openJournal({ activeTab: 'checkin', earnedBadges: { first_checkin: true } }, 320, theme);
    const region = page.getByRole('region', { name: 'Mood check-in', exact: true });
    await region.getByRole('button', { name: 'Not Great', exact: true }).click();
    await region.getByRole('button', { name: 'Worried', exact: true }).click();
    await region.locator('details[aria-label="Optional check-in context"] > summary').click();
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const audit = await region.evaluate(async node => {
      const result = await window.axe.run(node, { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'select-name'] } });
      return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) }));
    });
    fs.writeFileSync(path.join(reports, (theme || 'light') + '-checkin-axe.json'), JSON.stringify(audit, null, 2));
    expect(audit).toEqual([]);
    expect(await region.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await region.locator('button:visible, summary:visible, select:visible').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44))).toBe(true);
    await region.locator('h3').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(reports, (theme || 'light') + '-checkin-phone.png') });
    await region.getByRole('combobox', { name: 'Energy level (optional)', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(reports, (theme || 'light') + '-checkin-context-phone.png') });
    await region.getByRole('button', { name: /Save Check-In/ }).click();
    const tried = region.getByRole('button', { name: /^I tried:/ }).first();
    await tried.click();
    expect(await tried.getAttribute('aria-pressed')).toBe('true');
    const postAudit = await region.evaluate(async node => {
      const result = await window.axe.run(node, { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'select-name'] } });
      return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) }));
    });
    fs.writeFileSync(path.join(reports, (theme || 'light') + '-checkin-saved-axe.json'), JSON.stringify(postAudit, null, 2));
    expect(postAudit).toEqual([]);
    expect(await region.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await region.locator('button:visible, summary:visible, select:visible').evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44))).toBe(true);
    await tried.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(reports, (theme || 'light') + '-checkin-saved-phone.png') });
  }, 120000);

  it('journal keeps draft prompt attribution when browsing and allows an explicit change', async () => {
    const region = await openJournal();
    const prompt = (await page.locator('#sel-journal-prompt').innerText()).slice(1, -1);
    await region.getByRole('textbox', { name: 'Journal entry', exact: true }).fill('A fictional learner asks for a practice turn.');
    await region.getByRole('button', { name: 'Next writing prompt', exact: true }).click();
    expect(await region.innerText()).toContain('Your draft is still linked to: ' + prompt);
    await region.getByRole('button', { name: 'Save Entry', exact: true }).click();
    expect(await page.evaluate(() => window.__alloflowSelToolData.journal.journalEntries[0].prompt)).toBe(prompt);
    await region.getByRole('textbox', { name: 'Journal entry', exact: true }).fill('Another fictional reflection.');
    await region.getByRole('button', { name: 'Next writing prompt', exact: true }).click();
    const replacement = (await page.locator('#sel-journal-prompt').innerText()).slice(1, -1);
    await region.getByRole('button', { name: 'Use this prompt for my draft', exact: true }).click();
    expect(await region.getByRole('textbox', { name: 'Journal entry', exact: true }).inputValue()).toBe('Another fictional reflection.');
    await region.getByRole('button', { name: 'Save Entry', exact: true }).click();
    expect(await page.evaluate(() => window.__alloflowSelToolData.journal.journalEntries[1].prompt)).toBe(replacement);
  }, 120000);

  it('journal revisions preserve separate drafts, support cancel, and restore keyboard focus', async () => {
    const original = { timestamp: 1000, prompt: 'A made-up situation', text: 'Original fictional reflection', extraField: 'preserved' };
    const region = await openJournal({ journalEntries: [original], jText: 'Separate unfinished draft', jDraftPrompt: 'Draft prompt' });
    const history = region.getByRole('button', { name: 'View saved journal entries (1)', exact: true });
    await history.focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement.id === 'sel-journal-history-title');
    await region.getByRole('button', { name: 'Revise journal entry 1', exact: true }).click();
    await page.waitForFunction(() => document.activeElement.id === 'sel-journal-edit-0-text');
    await region.getByRole('textbox', { name: 'Revise entry 1', exact: true }).fill('Canceled revision');
    await region.getByRole('button', { name: 'Cancel revision', exact: true }).click();
    await page.waitForFunction(() => document.activeElement.id === 'sel-journal-edit-0');
    expect(await page.evaluate(() => window.__alloflowSelToolData.journal.journalEntries[0])).toEqual(original);
    await region.getByRole('button', { name: 'Revise journal entry 1', exact: true }).click();
    await region.getByRole('textbox', { name: 'Revise entry 1', exact: true }).fill('   ');
    expect(await region.getByRole('button', { name: 'Save revision', exact: true }).isDisabled()).toBe(true);
    await region.getByRole('textbox', { name: 'Revise entry 1', exact: true }).fill('A revised fictional reflection');
    await region.getByRole('button', { name: 'Back to journal writing', exact: true }).click();
    await page.waitForFunction(() => document.activeElement.id === 'sel-journal-history-button');
    expect(await region.getByRole('textbox', { name: 'Journal entry', exact: true }).inputValue()).toBe('Separate unfinished draft');
    await history.click();
    expect(await region.getByRole('textbox', { name: 'Revise entry 1', exact: true }).inputValue()).toBe('A revised fictional reflection');
    await region.getByRole('button', { name: 'Save revision', exact: true }).click();
    await page.waitForFunction(() => document.activeElement.id === 'sel-journal-edit-0');
    const saved = await page.evaluate(() => window.__alloflowSelToolData.journal);
    expect(saved.journalEntries).toHaveLength(1);
    expect(saved.journalEntries[0]).toMatchObject({ ...original, text: 'A revised fictional reflection' });
    expect(saved.journalEntries[0].updatedAt).toBeGreaterThan(1000);
    expect(saved.jText).toBe('Separate unfinished draft');
    expect(saved.jDraftPrompt).toBe('Draft prompt');
    expect(saved.earnedBadges).toEqual({ first_journal: true });
    await openJournal(JSON.parse(JSON.stringify(saved)));
    expect(await page.getByText('A revised fictional reflection', { exact: true }).count()).toBe(1);
    expect(errors).toEqual([]);
  }, 120000);

  it('journal protects restored legacy drafts and does not overwrite a changed saved entry', async () => {
    const region = await openJournal({ jText: 'Legacy draft without a stored prompt', journalEntries: [{ timestamp: 1000, prompt: 'Original prompt', text: 'Changed by another restore' }], jRevision: { index: 0, timestamp: 1000, originalText: 'Older text', text: 'Unsaved revision' } });
    const prompt = (await page.locator('#sel-journal-prompt').innerText()).slice(1, -1);
    await region.getByRole('button', { name: 'Next writing prompt', exact: true }).click();
    await region.getByRole('button', { name: 'Next writing prompt', exact: true }).click();
    expect(await page.evaluate(() => window.__alloflowSelToolData.journal.jDraftPrompt)).toBe(prompt);
    await region.getByRole('button', { name: 'View saved journal entries (1)', exact: true }).click();
    await region.getByRole('button', { name: 'Save revision', exact: true }).click();
    expect(await region.getByRole('status').innerText()).toContain('This entry changed');
    expect(await page.evaluate(() => window.__alloflowSelToolData.journal.journalEntries[0].text)).toBe('Changed by another restore');
    expect(await region.getByRole('textbox', { name: 'Revise entry 1', exact: true }).inputValue()).toBe('Unsaved revision');
  }, 120000);

  it.each(['', 'theme-dark', 'theme-contrast'])('journal editing and reflection support fit a phone in %s', async theme => {
    const region = await openJournal({ journalEntries: [{ timestamp: 1000, prompt: 'A fictional prompt', text: 'A learner asks for an example.' }] }, 320, theme);
    await region.locator('details[aria-label="Help with reflection"] > summary').click();
    expect(await region.innerText()).toContain('Made-up example:');
    expect(await region.innerText()).toContain('You do not need to answer every question');
    expect(await region.getByRole('textbox', { name: 'Journal entry', exact: true }).inputValue()).toBe('');
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    async function audit(stage) {
      const result = await region.evaluate(async node => {
        const result = await window.axe.run(node, { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label'] } });
        return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) }));
      });
      fs.writeFileSync(path.join(reports, (theme || 'light') + '-journal-' + stage + '-axe.json'), JSON.stringify(result, null, 2));
      expect(result).toEqual([]);
      expect(await region.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
      const heights = await region.locator('button:visible, summary:visible').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      expect(heights.every(height => height >= 44)).toBe(true);
      // The hub intentionally gives journal a dark shell in light/dark host themes.
      const field = region.getByRole('textbox').first();
      const expectedBackground = theme === 'theme-contrast' ? 'rgb(0, 0, 0)' : (stage === 'writing' ? 'rgb(15, 23, 42)' : 'rgb(30, 41, 59)');
      expect(await field.evaluate(node => getComputedStyle(node).backgroundColor)).toBe(expectedBackground);
      if (stage === 'writing') await region.locator('details[aria-label="Help with reflection"] > summary').click();
      await field.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(reports, (theme || 'light') + '-journal-' + stage + '-phone.png') });
    }
    await audit('writing');
    await region.getByRole('button', { name: 'View saved journal entries (1)', exact: true }).click();
    await region.getByRole('button', { name: 'Revise journal entry 1', exact: true }).click();
    await audit('revision');
  }, 120000);

  it('keeps a real journal entry through save and reopening the activity', async () => {
    await mount();
    await page.locator('[data-sel-tool-card-id="journal"]').click();
    await page.getByRole('tab', { name: /Journal$/ }).click();
    const entry = 'A fictional learner asks for an example before trying a new task.';
    await page.getByRole('textbox', { name: 'Journal entry', exact: true }).fill(entry);
    await page.getByRole('button', { name: 'Save Entry', exact: true }).click();
    expect(await page.getByRole('textbox', { name: 'Journal entry', exact: true }).inputValue()).toBe('');
    await page.getByRole('alertdialog', { name: /^Badge earned:/ }).getByRole('button', { name: 'Nice', exact: true }).click();
    const support = page.locator('details[aria-label="Practice support"]');
    await support.locator(':scope > summary').click();
    await support.getByRole('button', { name: 'Return to activities', exact: true }).click();
    await page.locator('[data-sel-tool-card-id="journal"]').click();
    await page.getByRole('tab', { name: /Journal$/ }).click();
    const savedEntries = page.getByRole('button', { name: 'View saved journal entries (1)', exact: true });
    expect((await savedEntries.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await savedEntries.focus(); await page.keyboard.press('Enter');
    expect(await page.getByText(entry, { exact: true }).count()).toBe(1);
    await page.getByText(entry, { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(reports, 'journal-saved-entry.png') });
    await page.getByRole('button', { name: 'Back to journal writing', exact: true }).click();
    expect(await page.getByRole('textbox', { name: 'Journal entry', exact: true }).inputValue()).toBe('');
    expect(errors).toEqual([]);
  }, 120000);

  it.each(['', 'theme-dark', 'theme-contrast'])('keeps discovery and saving feedback usable at 320px in %s', async theme => {
    await mount(320, theme);
    const chooser = page.locator('details[aria-label="Help me choose an activity"]');
    await chooser.locator('summary').click();
    const layout = await chooser.evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth, controls: [...el.querySelectorAll('button,select')].map(c => c.getBoundingClientRect().height) }));
    expect(layout.scroll).toBeLessThanOrEqual(layout.client + 1);
    expect(layout.controls.every(height => height >= 44)).toBe(true);
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const audit = await page.evaluate(async () => {
      const result = await window.axe.run(document.querySelector('details[aria-label="Help me choose an activity"]'), { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'select-name'] } });
      return result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
    });
    fs.writeFileSync(path.join(reports, (theme || 'light') + '-chooser-axe.json'), JSON.stringify(audit, null, 2));
    expect(audit).toEqual([]);
    await chooser.evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(reports, (theme || 'light') + '-chooser-phone.png') });
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
