import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const local = (file: string) => path.resolve(__dirname, '../..', file);
let css: string;
test.beforeAll(async () => {
  const postcss = require(local('desktop/web-app/node_modules/postcss'));
  const tailwind = require(local('desktop/web-app/node_modules/tailwindcss'));
  css = (await postcss([tailwind({ content: [local('view_adventure_source.jsx')], corePlugins: { preflight: true } })])
    .process('@tailwind base; @tailwind utilities;', { from: undefined })).css;
});
async function load(page: any) {
  await page.setContent('<!doctype html><html lang="en"><head><title>Adventure learning settings</title></head><body style="background:#f1f5f9"><main id="root" style="max-width:780px;margin:auto;padding:16px"></main></body></html>');
  await page.addStyleTag({ content: css });
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: local(file) });
  const source = fs.readFileSync(local('view_adventure_module.js'), 'utf8');
  await page.addScriptTag({ content: source.replace('window.AlloModules.AdventureView = AdventureView;', 'window.AlloModules.AdventureView = AdventureView; window.__Card = AdventureConsequenceCard;') });
  await page.addScriptTag({ path: local('desktop/web-app/public/vendor/axe-core/axe.min.js') });
}
async function check(page: any) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })))).toEqual([]);
}
async function mountProfiles(page: any, locked = false, teacher = true) {
  await page.evaluate(({ locked, teacher }) => {
    const w = window as any, R = w.React;
    function Fixture() {
      const [state, setState] = R.useState({ isLoading: locked, currentScene: null, enableAutoClimax: false, systemResources: [{ name: 'Budget', quantity: 900, unit: 'credits' }] });
      const [settings, setSettings] = R.useState({ adventureInputMode: 'choice', adventureDifficulty: 'Normal', adventureFreeResponseEnabled: false, adventureChanceMode: true, isAdventureStoryMode: false, isSocialStoryMode: false, enableFactionResources: false, factionResourceMode: 'manual' });
      const props: any = { ...settings, adventureState: state, setAdventureState: setState, isTeacherMode: teacher, t: (key: string) => key };
      for (const key of Object.keys(settings)) props['set' + key[0].toUpperCase() + key.slice(1)] = (value: any) => setSettings((prev: any) => ({ ...prev, [key]: value }));
      w.__settings = { state, ...settings };
      return R.createElement(R.Fragment, null,
        R.createElement(w.AlloModules.AdventureLearningProfiles, props),
        R.createElement(w.AlloModules.AdventureEpisodeSettings, { state, onChange: setState, t: props.t, locked: locked || !teacher }));
    }
    R.createElement && w.ReactDOM.createRoot(document.querySelector('#root')).render(R.createElement(Fixture));
  }, { locked, teacher });
}

test('learning profiles are editable and accessible on phone and desktop', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 900 }); await load(page); await mountProfiles(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /Guided Story/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /Guided Story/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Episode length')).toHaveValue('12');
  await expect(page.getByLabel('Choices per decision')).toHaveValue('3');
  for (const [name, mode, turns, choices, free, social] of [
    ['Evidence Debate', 'debate', 12, 3, true, false],
    ['Systems Challenge', 'system', 20, 4, false, false],
    ['Social Practice', 'choice', 12, 4, false, true]
  ]) {
    await page.getByRole('button', { name: new RegExp(String(name)) }).click();
    expect(await page.evaluate(() => (window as any).__settings)).toMatchObject({
      adventureInputMode: mode, adventureFreeResponseEnabled: free, isSocialStoryMode: social,
      adventureChanceMode: false, isAdventureStoryMode: true,
      state: { episodeTurnLimit: turns, choiceCount: choices, enableAutoClimax: true }
    });
  }
  await check(page);
  await page.screenshot({ path: info.outputPath('settings-phone.png'), fullPage: true });
  await page.getByLabel('Episode length').selectOption('open');
  await page.getByLabel('Choices per decision').selectOption('2');
  expect(await page.evaluate(() => (window as any).__settings.state)).toMatchObject({ episodeTurnLimit: null, choiceCount: 2, enableAutoClimax: true });
  await expect(page.getByRole('button', { pressed: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /Social Practice/ })).toContainText('Customized');
  await page.setViewportSize({ width: 1200, height: 900 }); await check(page);
  await page.screenshot({ path: info.outputPath('settings-desktop.png'), fullPage: true });
});

test('locked settings cannot change and student profiles are hidden', async ({ page }) => {
  await load(page); await mountProfiles(page, true);
  for (const control of await page.locator('button, select').all()) await expect(control).toBeDisabled();
  await load(page); await mountProfiles(page, false, false);
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.getByLabel('Episode length')).toBeDisabled();
});

for (const mode of ['debate', 'system']) {
  test(mode + ' feedback is expandable, safe text and readable', async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 900 }); await load(page);
    await page.evaluate(({ mode }) => {
      const w = window as any;
      w.ReactDOM.createRoot(document.querySelector('#root')).render(w.React.createElement(w.__Card, {
        t: (key: string) => key, consequence: { version: 1, mode, reasoning: 'strategic_success',
          choice: 'Compare the lesson evidence before choosing a plan.',
          explanation: 'Your evidence supports the decision. Check what the scenario leaves uncertain.',
          changes: [{ key: 'resource:Water', label: 'Water quality', before: 95, after: 100, unit: '%' }],
          learningFeedback: mode === 'debate'
            ? { evidence: 'You cited the lesson observation.', reasoning: '<script>window.injected = true</script>', counterpoint: 'Consider a case where the claim may not hold.' }
            : { immediate: 'Quality reaches 100% in this scenario.', delayed: 'This may reduce cleanup later if demand stays stable.', tradeoff: 'Monitoring uses staff time.' }
        }
      }));
    }, { mode });
    await expect(page.getByText(mode === 'debate' ? 'You cited the lesson observation.' : 'Quality reaches 100% in this scenario.')).not.toBeVisible();
    await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
    await expect(page.getByText(mode === 'debate' ? 'You cited the lesson observation.' : 'Quality reaches 100% in this scenario.')).toBeVisible();
    if (mode === 'system') await expect(page.getByText(/Delayed effects are predictions, not scheduled changes/)).toBeVisible();
    expect(await page.evaluate(() => (window as any).injected)).toBeUndefined();
    await check(page);
    await page.screenshot({ path: info.outputPath(mode + '-feedback-phone.png'), fullPage: true });
    await page.setViewportSize({ width: 1200, height: 900 }); await check(page);
  });
}


test('reapplying Systems Challenge preserves manually authored resources', async ({ page }) => {
  await load(page); await mountProfiles(page);
  await page.getByRole('button', { name: /Systems Challenge/ }).click();
  expect(await page.evaluate(() => (window as any).__settings)).toMatchObject({
    factionResourceMode: 'manual', state: { episodeTurnLimit: 20, systemResources: [{ name: 'Budget', quantity: 900, unit: 'credits' }] }
  });
});
