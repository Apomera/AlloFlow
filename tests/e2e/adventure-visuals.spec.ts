import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const local = (file: string) => path.resolve(__dirname, '../..', file);
const source = fs.readFileSync(local('view_adventure_source.jsx'), 'utf8');
let css: string;
test.beforeAll(async () => {
  const postcss = require(local('desktop/web-app/node_modules/postcss'));
  const tailwind = require(local('desktop/web-app/node_modules/tailwindcss'));
  css = (await postcss([tailwind({ content: [local('view_adventure_source.jsx')], corePlugins: { preflight: true } })])
    .process('@tailwind base; @tailwind utilities;', { from: undefined })).css;
});
async function load(page: any, theme: string) {
  await page.setContent('<!doctype html><html lang="en"><head><title>Adventure visual review</title></head><body><main id="root" style="max-width:900px;margin:auto;padding:16px"></main></body></html>');
  await page.evaluate(theme => { document.body.style.background = theme === 'light' ? '#eef3f8' : theme === 'dark' ? '#0b1120' : '#000'; }, theme);
  await page.addStyleTag({ content: css });
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: local(file) });
  // Only leaf icon/components are stubbed. The shipped Adventure renderer and all its layout are real.
  const tags = Array.from(new Set(Array.from(source.matchAll(/<([A-Z][A-Za-z0-9]*)/g), m => m[1])));
  await page.evaluate(tags => { const w = window as any; for (const tag of tags) {
    if (tag === 'Fragment' || tag === 'React' || tag === 'Map') continue;
    w[tag] = (p: any) => w.React.createElement('svg', { width: p.size || 16, height: p.size || 16, viewBox: '0 0 16 16', 'aria-hidden': true, className: p.className }, w.React.createElement('circle', { cx: 8, cy: 8, r: 5, fill: 'none', stroke: 'currentColor' }));
  } }, tags);
  await page.addScriptTag({ content: fs.readFileSync(local('view_adventure_module.js'), 'utf8').replace('window.AlloModules.AdventureView = AdventureView;', 'window.AlloModules.AdventureView = AdventureView; window.__Card = AdventureConsequenceCard;') });
  await page.addScriptTag({ path: local('desktop/web-app/public/vendor/axe-core/axe.min.js') });
}
async function axe(page: any, selector = 'main') {
  expect(await page.evaluate(async selector => (await (window as any).axe.run(document.querySelector(selector), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })), selector)).toEqual([]);
}
for (const theme of ['light', 'dark', 'contrast']) {
  test('profiles and debrief reflow in ' + theme, async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await load(page, theme);
    await page.evaluate(theme => {
      const w = window as any, R = w.React;
      function Fixture() {
        const [state, setState] = R.useState({ episodeTurnLimit: 12, choiceCount: 4, learningProfile: 'systems', enableAutoClimax: true });
        const [mode, setMode] = R.useState('system');
        const props = { theme, adventureState: state, setAdventureState: setState, isTeacherMode: true, t: (k: string) => k,
          adventureInputMode: mode, setAdventureInputMode: setMode, adventureDifficulty: 'Normal', adventureFreeResponseEnabled: false, adventureChanceMode: false,
          isAdventureStoryMode: true, isSocialStoryMode: false, enableFactionResources: true,
          setAdventureDifficulty: () => {}, setAdventureFreeResponseEnabled: () => {}, setAdventureChanceMode: () => {},
          setIsAdventureStoryMode: () => {}, setIsSocialStoryMode: () => {}, setEnableFactionResources: () => {}, setFactionResourceMode: () => {} };
        return R.createElement(R.Fragment, null,
          R.createElement(w.AlloModules.AdventureLearningProfiles, props),
          R.createElement(w.AlloModules.AdventureEpisodeSettings, { state, onChange: setState, t: props.t, theme }),
          R.createElement(w.__Card, { theme, t: props.t, consequence: { version: 1, mode: 'system', reasoning: 'strategic_success',
            choice: 'Protect the wetland while improving the water supply.', explanation: 'Your plan connects habitat protection with cleaner water.',
            changes: [{ key: 'resource:Quality', label: 'Water quality', before: 95, after: 100, unit: '%' }, { key: 'resource:Budget', label: 'Budget', before: 1250, after: 1100, unit: 'credits' }],
            learningFeedback: { immediate: 'Water quality improves in this scenario.', delayed: 'Habitat may recover if the conditions persist.', tradeoff: 'Monitoring needs staff time and funding.' }
          } }));
      }
      w.ReactDOM.createRoot(document.querySelector('#root')).render(R.createElement(Fixture));
    }, theme);
    await expect(page.getByRole('button', { name: /Systems Challenge/ })).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: /Guided Story/ })).toBeFocused();
    await page.getByText('Review your decision', { exact: true }).click();
    for (const width of [320, 375, 1200]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await axe(page);
      await page.screenshot({ path: info.outputPath('profiles-' + theme + '-' + width + '.png'), fullPage: true });
    }
    expect(await page.locator('[aria-label="Learning profiles"] svg').first().getAttribute('aria-hidden')).toBe('true');
  });

  test('active scene stays spacious and readable in ' + theme, async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 1100 }); await load(page, theme);
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const propNames = Array.from(new Set(Array.from(source.matchAll(/var \w+ = props\.(\w+)/g), m => m[1])));
    await page.evaluate(({ theme, propNames }) => {
      const w = window as any, R = w.React, noop = () => {};
      const props: any = {};
      for (const name of propNames) props[name] = /^(set|handle|open|toggle|stop|prewarm|save|execute)/.test(name) ? noop : /^[A-Z]/.test(name) ? w[name] || (() => null) : /Ref$/.test(name) ? { current: null } : false;
      const scene = 'A river crosses the valley below the town. Compare the water measurements before deciding where to restore habitat.';
      Object.assign(props, {
        theme, t: (key: string) => ({ 'adventure.current_scene': 'Current scene', 'common.adjust_image_size': 'Scene image size', 'adventure.read_aloud_title': 'Read aloud' } as any)[key] || key.split('.').at(-1).replaceAll('_', ' '),
        activeView: 'adventure', adventureImageSize: 200, adventureInputMode: 'choice', adventureLanguageMode: 'English', adventureDifficulty: 'Normal',
        adventureArtStyle: 'auto', adventureTextInput: '', adventureCustomInstructions: '', adventureCustomArtStyle: '', universalImageStyle: '',
        selectedLanguages: [], editingOptionsBuffer: [], studentProjectSettings: {}, sessionData: null, playbackState: {}, adventureEffects: [],
        globalPoints: 0, isTeacherMode: false, isZenMode: true, showNewGameSetup: false,
        ErrorBoundary: (p: any) => R.createElement(R.Fragment, null, p.children),
        AnimatedNumber: (p: any) => R.createElement('span', null, p.value), AdventureAmbience: () => null, ClimaxProgressBar: () => null,
        renderFormattedText: (s: any) => s, formatInteractiveText: (s: any) => s, splitTextToSentences: (s: string) => [s],
        adventureState: { currentScene: { text: scene, options: ['Compare the measurements', 'Inspect the wetland'] }, history: [], inventory: [], systemResources: [], imageCache: [],
          level: 1, xp: 25, xpToNextLevel: 100, energy: 90, gold: 10, turnCount: 2, episodeTurnLimit: 6, climax: { isActive: false }, stats: { decisions: 1, conceptsFound: [] },
          sceneImage: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 300"><rect width="900" height="300" fill="#d8edf0"/><circle cx="730" cy="65" r="36" fill="#fff1ba"/><path d="M0 200 160 65 290 190 470 75 700 210 900 135V300H0Z" fill="#659897"/><path d="M0 270Q230 160 490 245T900 205V300H0Z" fill="#315e60"/><path d="M480 200Q340 250 555 300H700Q490 240 520 200" fill="#9ad5dc"/></svg>')
        }
      });
      w.ReactDOM.createRoot(document.querySelector('#root')).render(R.createElement(w.AlloModules.AdventureView, props));
    }, { theme, propNames });
    const region = page.getByRole('region', { name: 'Current scene' });
    await expect(region).toBeVisible();
    for (const width of [320, 1200]) {
      await page.setViewportSize({ width, height: 1100 });
      await region.scrollIntoViewIfNeeded();
      await region.getByRole('button', { name: /Read aloud/ }).hover();
      await axe(page, '[aria-labelledby="adventure-current-scene-heading"]');
      const box = await region.boundingBox();
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      await region.screenshot({ path: info.outputPath('scene-' + theme + '-' + width + '.png') });
    }
    expect(errors).toEqual([]);
  });
}
