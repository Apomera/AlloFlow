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
  await page.evaluate(() => { (window as any).react = (window as any).React; });
  await page.addScriptTag({ path: local('desktop/web-app/node_modules/lucide-react/dist/umd/lucide-react.js') });
  await page.evaluate(() => { (window as any).AlloIcons = (window as any).LucideReact; });
  // Use real icons and the shipped Adventure renderer; stub unrelated leaf components.
  const tags = Array.from(new Set(Array.from(source.matchAll(/<([A-Z][A-Za-z0-9]*)/g), m => m[1])));
  await page.evaluate(tags => { const w = window as any; for (const tag of tags) {
    if (tag === 'Fragment' || tag === 'React' || tag === 'Map') continue;
    w[tag] = w.LucideReact[tag] || ((p: any) => w.React.createElement('svg', { width: p.size || 16, height: p.size || 16, viewBox: '0 0 16 16', 'aria-hidden': true, className: p.className }, w.React.createElement('circle', { cx: 8, cy: 8, r: 5, fill: 'none', stroke: 'currentColor' })));
  } }, tags);
  await page.addScriptTag({ content: fs.readFileSync(local('view_adventure_module.js'), 'utf8').replace('window.AlloModules.AdventureView = AdventureView;', 'window.AlloModules.AdventureView = AdventureView; window.__Card = AdventureConsequenceCard;') });
  await page.addScriptTag({ path: local('desktop/web-app/public/vendor/axe-core/axe.min.js') });
}
async function axe(page: any, selector = 'main') {
  expect(await page.evaluate(async selector => (await (window as any).axe.run(document.querySelector(selector), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] } })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })), selector)).toEqual([]);
}
async function mountActiveAdventure(page: any, theme: string, config: any = {}) {
    const propNames = Array.from(new Set(Array.from(source.matchAll(/var \w+ = props\.(\w+)/g), m => m[1])));
    await page.evaluate(({ theme, propNames, config }) => {
      const w = window as any, R = w.React, noop = () => {};
      // Adventure fills the available app panel, including in immersive view.
      (document.querySelector('#root') as HTMLElement).style.height = '100vh';
      const props: any = {};
      for (const name of propNames) props[name] = /^(set|handle|open|toggle|stop|prewarm|save|execute)/.test(name) ? noop : /^[A-Z]/.test(name) ? w[name] || (() => null) : /Ref$/.test(name) ? { current: null } : false;
      const scene = 'A river crosses the valley below the town. Compare the water measurements before deciding where to restore habitat.';
      Object.assign(props, {
        theme, t: (key: string, values?: any) => key === 'adventure.vote_status' ? values.count + (values.count === 1 ? ' vote' : ' votes') + ' · ' + values.percent + '%' : ({ 'adventure.current_scene': 'Current scene', 'common.adjust_image_size': 'Scene image size', 'adventure.read_aloud_title': 'Read aloud', 'common.listen': 'Listen', 'adventure.return_to_story': 'Return to story', 'adventure.make_a_choice': 'Make a choice' } as any)[key] || ((key.startsWith('adventure.learning_settings.') || key.startsWith('adventure.debrief.')) ? key : key.split('.').at(-1).replaceAll('_', ' ')),
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

      Object.assign(props, config.props || {});
      Object.assign(props.adventureState, config.state || {});
      w.__calls = { choices: [], speech: [], audio: [] };
      w.Audio = function (url: string) { this.play = () => { w.__calls.audio.push(url); return Promise.resolve(); }; };
      const root = w.ReactDOM.createRoot(document.querySelector('#root'));
      w.__adventureProps = props;
      w.__updateAdventure = (next: any) => {
        const { adventureState, ...rest } = next;
        Object.assign(props, rest);
        if (adventureState) Object.assign(props.adventureState, adventureState);
        root.render(R.createElement(w.AlloModules.AdventureView, { ...props }));
      };
      props.handleAdventureChoice = (opt: any) => w.__calls.choices.push(opt);
      props.handleSpeak = (text: string, id: string) => { w.__calls.speech.push([text, id]); w.__updateAdventure({ isPlaying: true, playingContentId: id }); };
      props.handleExitAdventureImmersive = () => w.__updateAdventure({ adventureState: { isImmersiveMode: false } });
      props.handleToggleImmersiveShowChoices = () => w.__updateAdventure({ immersiveShowChoices: !props.immersiveShowChoices });
      w.__updateAdventure({});

    }, { theme, propNames, config });
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
    await mountActiveAdventure(page, theme);
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

for (const immersive of [false, true]) {
  test('choice listening, votes and loading remain separate in ' + (immersive ? 'immersive' : 'standard') + ' view', async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 850 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await load(page, 'dark');
    const action = 'Compare the upstream and downstream measurements before deciding where to restore the wetland habitat.';
    const second = { action: 'Ask the town team to explain its evidence.', audio: 'fixture-recording.mp3' };
    await mountActiveAdventure(page, 'dark', {
      props: { immersiveShowChoices: true, currentUserUid: 'learner', sessionData: { democracy: { isActive: true, votes: { learner: action, other: action, third: second.action } } } },
      state: { isImmersiveMode: immersive, currentScene: { text: 'The river has changed after the storm.', options: [action, second] } }
    });
    const region = page.locator('[data-adventure-actions]');
    const choices = region.locator('[data-help-key="adventure_choice_btn"]');
    await expect(choices).toHaveCount(2);
    await expect(choices.first()).toHaveAttribute('aria-pressed', 'true');
    await expect(region.getByText('Your vote', { exact: true })).toHaveCount(1);
    await expect(region.getByText(/\d+ votes? ·/)).toHaveCount(0);
    await region.getByRole('button', { name: 'Listen: ' + action, exact: true }).click();
    expect(await page.evaluate(() => (window as any).__calls)).toEqual({ choices: [], speech: [[action, 'adventure-option-0']], audio: [] });
    await expect(region.locator('[data-reading="true"]')).toHaveCount(1);
    await expect(region.getByText('Listening', { exact: true })).toBeVisible();
    await region.getByRole('button', { name: 'Listen: ' + second.action, exact: true }).click();
    expect(await page.evaluate(() => (window as any).__calls.audio)).toEqual(['fixture-recording.mp3']);
    await choices.nth(1).click();
    expect(await page.evaluate(() => (window as any).__calls.choices)).toEqual([second]);
    await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { isLoading: true } }));
    await expect(choices.first()).toBeDisabled();
    await expect(choices.nth(1)).toBeDisabled();
    await page.evaluate(() => (window as any).__updateAdventure({ isTeacherMode: true, adventureState: { isLoading: false } }));
    await expect(region.getByText('2 votes · 67%', { exact: true })).toBeVisible();
    await expect(region.getByText('1 vote · 33%', { exact: true })).toBeVisible();
    await expect(region.getByText('Your vote', { exact: true })).toHaveCount(0);
    await axe(page, '[data-adventure-actions]');
    await region.screenshot({ path: info.outputPath('choice-votes-' + (immersive ? 'immersive' : 'standard') + '.png') });
  });

  for (const theme of ['light', 'dark', 'contrast']) {
    test('long choices scroll and keep touch targets in ' + theme + ' ' + (immersive ? 'immersive' : 'standard'), async ({ page }, info) => {
      await page.setViewportSize({ width: 320, height: 740 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await load(page, theme);
      const options = Array.from({ length: 6 }, (_, n) => 'Plan ' + (n + 1) + ': Compare the water measurements with the needs of the town, and explain which evidence supports restoring this part of the wetland.');
      await mountActiveAdventure(page, theme, { props: { immersiveShowChoices: true }, state: { isImmersiveMode: immersive, currentScene: { text: 'Study the river before choosing your next step.', options } } });
      const region = page.locator('[data-adventure-actions]');
      await expect(region.locator('[data-adventure-choice]')).toHaveCount(6);
      expect(await region.evaluate((el: HTMLElement) => el.scrollHeight > el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const textBox = await region.locator('[data-help-key="adventure_choice_btn"] > span').nth(1).boundingBox();
      expect(textBox!.width).toBeGreaterThanOrEqual(135);
      const last = region.locator('[data-help-key="adventure_choice_btn"]').last();
      await last.focus();
      await page.keyboard.press('Tab');
      await expect(region.locator('[data-adventure-listen]').last()).toBeFocused();
      const target = await region.locator('[data-adventure-listen]').last().boundingBox();
      const box = await region.boundingBox();
      expect(target!.height).toBeGreaterThanOrEqual(44); expect(target!.width).toBeGreaterThanOrEqual(44);
      expect(target!.y).toBeGreaterThanOrEqual(box!.y); expect(target!.y + target!.height).toBeLessThanOrEqual(box!.y + box!.height + 1);
      await page.keyboard.press('Enter');
      expect(await page.evaluate(() => (window as any).__calls.choices)).toEqual([]);
      await region.evaluate((el: HTMLElement) => { el.scrollTop = 0; });
      await axe(page, '[data-adventure-actions]');
      if (immersive) {
        const toggle = page.locator('[data-help-key="adventure_choice_toggle"]');
        await expect(toggle).toBeInViewport();
        await toggle.click();
        await expect(region).toHaveCount(0);
        await toggle.click();
        await expect(region).toBeVisible();
      }
      await region.screenshot({ path: info.outputPath('choices-' + theme + '-' + (immersive ? 'immersive' : 'standard') + '-320.png') });
      await page.screenshot({ path: info.outputPath('context-' + theme + '-' + (immersive ? 'immersive' : 'standard') + '-320.png') });
      await page.setViewportSize({ width: 1200, height: 1000 });
      await region.screenshot({ path: info.outputPath('choices-' + theme + '-' + (immersive ? 'immersive' : 'standard') + '-1200.png') });
      if (immersive) {
        await page.setViewportSize({ width: 320, height: 740 });
        const exit = page.locator('[data-help-key="adventure_immersive_exit"]');
        const exitBox = await exit.boundingBox();
        expect(exitBox!.x).toBeGreaterThanOrEqual(0); expect(exitBox!.x + exitBox!.width).toBeLessThanOrEqual(304);
        await exit.click();
        await expect(page.locator('[data-adventure-actions="standard"]')).toBeVisible();
      }
    });
  }
}

test('episode progress counts completed decisions and supports legacy and open-ended saves', async ({ page }) => {
  await load(page, 'light');
  await mountActiveAdventure(page, 'light', { state: { turnCount: 1, stats: { decisions: 0 } } });
  const progress = page.getByRole('progressbar', { name: 'Episode progress' });
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  await expect(progress).toHaveAttribute('aria-valuetext', '0 completed · 6 remaining');
  await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { turnCount: 5, stats: { decisions: 3 } } }));
  await expect(progress).toHaveAttribute('aria-valuenow', '3');
  await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { stats: undefined, turnCount: 3 } }));
  await expect(progress).toHaveAttribute('aria-valuenow', '2');
  await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { episodeTurnLimit: null } }));
  await expect(progress).toHaveCount(0);
  await expect(page.locator('[data-adventure-progress]')).toContainText('2 completed · Open-ended');
  await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { episodeTurnLimit: 3, stats: { decisions: 8 } } }));
  await expect(progress).toHaveAttribute('aria-valuenow', '3');
  await expect(progress).toHaveAttribute('aria-valuetext', '8 completed · 0 remaining');
  await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { isGameOver: true } }));
  await expect(progress).toHaveAttribute('aria-valuetext', '8 completed · Episode ended');
  await page.evaluate(() => { const w = window as any; delete w.__adventureProps.adventureState.episodeTurnLimit; w.__updateAdventure({ adventureState: { enableAutoClimax: false, climaxMinTurns: 12, turnCount: 4, stats: undefined, isGameOver: false } }); });
  await expect(progress).toHaveAttribute('aria-valuemax', '12'); await expect(progress).toHaveAttribute('aria-valuenow', '3');
  await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { enableAutoClimax: true } }));
  await expect(progress).toHaveCount(0);
  await expect(page.locator('[data-adventure-progress]')).toContainText('3 completed · Open-ended');
});

function notebookHistory() {
  return [
    { type: 'scene', text: 'The team first surveys the riverbank.' },
    { type: 'choice', text: 'Measure the water before proposing changes.', source: 'option' },
    { type: 'feedback', text: 'The measurements provide a useful baseline.' },
    { type: 'scene', text: 'The measurements reveal a change downstream.' },
    { type: 'choice', text: 'Compare the wetland samples with the upstream baseline.', source: 'freetext' },
    { type: 'feedback', text: 'The comparison supports your plan.', consequence: {
      version: 1, mode: 'system', choice: 'Compare the wetland samples with the upstream baseline.',
      reasoning: 'strategic_success', explanation: 'Your plan connects the measurements with habitat protection.',
      changes: [{ key: 'resource:Quality', label: 'Water quality', before: 70, after: 78, unit: '%' }],
      concepts: ['Water quality', 'Habitat'],
      learningFeedback: { immediate: 'The team has a clearer picture of the river.', delayed: 'Habitat may recover if the conditions persist.', tradeoff: 'Monitoring needs time and resources.' }
    } }
  ];
}
for (const theme of ['light', 'dark', 'contrast']) {
  test('journey notebook preserves history and keeps recent learning visible in ' + theme, async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await load(page, theme);
    const history = notebookHistory();
    await mountActiveAdventure(page, theme, { state: { history, stats: { decisions: 2 }, turnCount: 3 } });
    const notebook = page.locator('[data-adventure-notebook]');
    const summary = notebook.locator(':scope > summary').first();
    await expect(summary).toContainText('Journey notebook');
    await expect(summary).toContainText('Recorded decisions: 2');
    await expect(notebook).not.toHaveAttribute('open');
    await expect(notebook.getByRole('listitem')).toHaveCount(0);
    await expect(page.locator('[data-adventure-recent]')).toHaveCount(2);
    await expect(page.locator('[data-adventure-recent]').first()).toContainText(history[4].text);
    await expect(page.getByRole('region', { name: 'Decision debrief', exact: true })).toBeVisible();
    await expect(page.getByText(history[0].text, { exact: true })).toHaveCount(0);
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(notebook).toHaveAttribute('open', '');
    await expect(notebook.getByRole('listitem')).toHaveCount(6);
    await expect(notebook.getByText(history[0].text, { exact: true })).toBeVisible();
    await expect(notebook.getByRole('article', { name: 'Your decision', exact: true })).toHaveCount(2);
    await notebook.getByText('Review your decision', { exact: true }).click();
    await expect(notebook.getByText('Monitoring needs time and resources.', { exact: true })).toBeVisible();
    for (const width of [320, 1200]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await axe(page, '[data-adventure-notebook]');
      await summary.scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath('notebook-' + theme + '-' + width + '.png') });
    }
    await notebook.getByRole('button', { name: 'Close notebook', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(notebook).not.toHaveAttribute('open');
    await expect(summary).toBeFocused();
    await expect(notebook.getByRole('listitem')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('journey-' + theme + '-1200.png') });
    expect(await page.evaluate(() => (window as any).__adventureProps.adventureState.history)).toEqual(history);
    expect(await page.evaluate(() => (window as any).__calls)).toEqual({ choices: [], speech: [], audio: [] });

    const assisted = [...history, { type: 'scene', text: 'A new problem appears upstream.' },
      { type: 'assist', text: 'Guiding Hand offers a sample comparison.', source: 'guiding_hand' },
      { type: 'feedback', text: 'Check how the two samples differ.', assisted: true }];
    await page.evaluate(history => (window as any).__updateAdventure({ adventureState: { history } }), assisted);
    await expect(summary).toContainText('Recorded decisions: 2');
    await expect(page.locator('[data-adventure-recent]')).toHaveCount(2);
    await expect(page.getByRole('article', { name: 'Guiding Hand support', exact: true })).toContainText('Guiding Hand offers a sample comparison.');
    await expect(notebook).not.toHaveAttribute('open');
    await summary.click();
    await expect(notebook.getByRole('listitem')).toHaveCount(9);
    // A restart while the notebook is open must reset its disclosure state.
    await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { history: [] } }));
    await expect(notebook).toHaveCount(0);
    await expect(page.locator('[data-adventure-recent]')).toHaveCount(0);
    await page.evaluate(history => (window as any).__updateAdventure({ adventureState: { history } }), history);
    await expect(notebook).not.toHaveAttribute('open');
    await expect(notebook.getByRole('listitem')).toHaveCount(0);
    await expect(summary).toContainText('+');
  });

  test('immersive reading and expanded notebook stay reachable in ' + theme, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await load(page, theme);
    const history = notebookHistory();
    const paragraphs = Array.from({ length: 8 }, (_, n) => 'Observation ' + (n + 1) + ': Compare the river measurements with the needs of the town. Explain which evidence supports restoring this wetland.');
    await mountActiveAdventure(page, theme, { props: { immersiveShowChoices: false },
      state: { isImmersiveMode: true, history, currentScene: { text: paragraphs.join('\n\n'), options: ['Compare the samples', 'Review the measurements'] } } });
    const reader = page.getByRole('region', { name: 'Story and feedback', exact: true });
    const notebook = reader.locator('[data-adventure-notebook]');
    const toggle = page.locator('[data-help-key="adventure_choice_toggle"]');
    await expect(reader).toBeVisible();
    await expect(toggle).toBeInViewport();
    expect(await reader.evaluate((el: HTMLElement) => el.scrollHeight > el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
    await reader.getByText('Review your decision', { exact: true }).click();
    await expect(reader.getByText('Monitoring needs time and resources.', { exact: true })).toBeVisible();
    const lastSentence = reader.getByRole('region', { name: 'Current scene', exact: true }).getByRole('button').last();
    await lastSentence.focus(); await page.keyboard.press('Enter');
    expect((await page.evaluate(() => (window as any).__calls.speech))[0][1]).toBe('adventure-active');
    await notebook.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
    await expect(notebook.getByRole('listitem')).toHaveCount(6);
    await notebook.getByRole('button', { name: 'Close notebook', exact: true }).click();
    await expect(notebook.locator(':scope > summary')).toBeFocused();
    await reader.evaluate((el: HTMLElement) => { el.scrollTop = 0; });
    await axe(page, '[data-adventure-reader]');
    await page.screenshot({ path: info.outputPath('reader-' + theme + '-320.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await toggle.click();
    await expect(page.locator('[data-adventure-actions="immersive"]')).toBeVisible();
    await toggle.click();
    await expect(reader).toBeVisible();
    expect(await page.evaluate(() => (window as any).__adventureProps.adventureState.history)).toEqual(history);
    expect(await page.evaluate(() => (window as any).__calls.choices)).toEqual([]);
  });
}
