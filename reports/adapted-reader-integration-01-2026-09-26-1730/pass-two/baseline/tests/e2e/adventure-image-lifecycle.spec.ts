import { test, expect } from '@playwright/test';
import path from 'node:path';

const local = (file: string) => path.resolve(__dirname, '../..', file);

async function load(page: any) {
  await page.setContent('<!doctype html><html lang="en"><title>Adventure image lifecycle</title><body><div id="root"></div></body></html>');
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js',
    'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'adventure_session_handlers_module.js']) {
    await page.addScriptTag({ path: local(file) });
  }
  await page.evaluate(() => {
    const w = window as any, R = w.React, api = w.AlloModules.AdventureSessionHandlers;
    const noop = () => {};
    const result = { scene: { text: 'The river crossing.', options: ['Cross'] }, feedback: 'Look for evidence.',
      evaluation: 'Look for evidence.', xpAwarded: 0, xpChange: 0, energyChange: 0, goldAwarded: 0 };
    w.__imageCalls = 0; w.__editCalls = 0; w.__saves = 0; w.__finish = [];
    const callImagen = () => { w.__imageCalls++; return new Promise(resolve => w.__finish.push(resolve)); };
    function Harness() {
      const [state, setAdventureState] = R.useState({ turnCount: 1, currentScene: { text: 'The forest path.', options: ['Explore'] },
        isLoading: false, characters: [], characterAppearance: 'A student in a blue jacket', imageCache: [], history: [],
        pendingChoice: 'Explore', stats: { successes: 0, failures: 0, decisions: 0, conceptsFound: [] },
        energy: 100, xp: 0, xpToNextLevel: 100, level: 1, gold: 0, inventory: [], systemResources: [],
        climax: { isActive: false, masteryScore: 0, attempts: 0 }, debatePhase: 'setup', debateMomentum: 50,
        activeXpMultiplier: 1, activeRollModifier: 0, activeGoldBuffTurns: 0, lastKeyItemTurn: 0 });
      const ref = R.useRef(state); ref.current = state;
      const values: any = { adventureState: state, pendingAdventureUpdate: result, setAdventureState,
        getAdventureState: () => ref.current, adventureDifficulty: 'Normal', adventureInputMode: 'choice',
        adventureChanceMode: false, adventureFreeResponseEnabled: false, adventureConsistentCharacters: false,
        isAdventureStoryMode: false, isSocialStoryMode: false, useLowQualityVisuals: false, adventureArtStyle: 'storybook',
        callImagen, callGeminiImageEdit: async () => { w.__editCalls++; return 'data:image/png;base64,FINAL'; },
        adventureImageDB: { storeImage: async () => { w.__saves++; } }, alloBotRef: { current: null }, t: (key: string) => key };
      const deps = new Proxy(values, { get: (target, key) => key in target ? target[key] : noop });
      values.generateAdventureImage = (text: string, turn: number) => api.generateAdventureImage(text, turn, deps);
      w.__deps = deps; w.__state = state;
      return R.createElement('main', {},
        R.createElement('button', { onClick: () => { api.handleDiceRollComplete(deps); api.handleDiceRollComplete(deps); } }, 'Next scene'),
        R.createElement('button', { onClick: () => {
          api.cancelAdventureSceneImage(setAdventureState);
          setAdventureState((prev: any) => ({ ...prev, turnCount: 1, currentScene: { text: 'The mountain path.' }, sceneImage: null }));
          values.generateAdventureImage('The mountain path.', 1);
        } }, 'New adventure'),
        R.createElement('output', {}, JSON.stringify({ turn: state.turnCount, text: state.currentScene.text, image: state.sceneImage })));
    }
    w.ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(R.StrictMode, {}, R.createElement(Harness)));
  });
  await expect(page.getByRole('button', { name: 'Next scene' })).toBeVisible();
}

test('Strict Mode and repeated completion produce one scene image and one save', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'Next scene' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__imageCalls)).toBe(1);
  await page.evaluate(() => (window as any).__finish[0]('data:image/png;base64,BASE'));
  await expect(page.locator('output')).toContainText('FINAL');
  expect(await page.evaluate(() => ({ images: (window as any).__imageCalls, edits: (window as any).__editCalls,
    saves: (window as any).__saves, turn: (window as any).__state.turnCount }))).toEqual({ images: 1, edits: 1, saves: 1, turn: 2 });
});

test('a late image from the previous adventure cannot replace the new opening', async ({ page }) => {
  await load(page);
  await page.evaluate(() => { const w = window as any; void w.__deps.generateAdventureImage('The forest path.', 1); });
  await expect.poll(() => page.evaluate(() => (window as any).__imageCalls)).toBe(1);
  await page.getByRole('button', { name: 'New adventure' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__imageCalls)).toBe(2);
  await page.evaluate(() => (window as any).__finish[1]('data:image/png;base64,NEW'));
  await expect(page.locator('output')).toContainText('FINAL');
  await page.evaluate(() => (window as any).__finish[0]('data:image/png;base64,STALE'));
  await expect(page.locator('output')).toContainText('The mountain path.');
  expect(await page.evaluate(() => ({ images: (window as any).__imageCalls, edits: (window as any).__editCalls,
    saves: (window as any).__saves, image: (window as any).__state.sceneImage }))).toEqual({ images: 2, edits: 1, saves: 1, image: 'data:image/png;base64,FINAL' });
});
