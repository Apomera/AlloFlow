const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {chromium} = require('playwright'), {expect} = require('@playwright/test');
const {makeBoard, source} = require('./fixtures/lesson_board.cjs');
const out = path.resolve('reports/lesson-board-encounters-2026-10-14');
fs.mkdirSync(out, {recursive: true});
const bundle = fs.readFileSync('lesson_board_module.js', 'utf8');
const bundleSha256 = crypto.createHash('sha256').update(bundle).digest('hex');
const helpers = require('esbuild').buildSync({stdin: {
  contents: "export {saveBoard,saveSolo,readSolo,soloWorkspace} from './lesson_board_storage.js';",
  resolveDir: process.cwd()
}, bundle: true, write: false, format: 'iife', globalName: 'EncounterQA'}).outputFiles[0].text;
const html = '<!doctype html><html lang="en"><head><title>Field opportunities verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
const cases = [
  {width: 1440, die: 3, event: 'survey', choice: 'prepare'},
  {width: 390, die: 8, event: 'supplies', choice: 'prepare'},
  {width: 320, die: 13, event: 'passage', choice: 'prepare'},
  {width: 1440, die: 18, event: 'rendezvous', choice: 'collect'},
  {width: 320, die: 3, event: 'no-chance', choice: null}
];

(async () => {
  const browser = await chromium.launch({headless: true}), results = [], errors = [];
  try {
    for (const scenario of cases) {
      const {width, die, event, choice} = scenario, name = width + '-' + event;
      const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => errors.push(error.message));
      await page.route('http://encounters.test/**', route => route.fulfill({contentType: 'text/html', body: html}));
      await page.goto('http://encounters.test/');
      for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', require.resolve('axe-core/axe.min.js')]) await page.addScriptTag({path: file});
      await page.addScriptTag({content: bundle});
      await page.addScriptTag({content: helpers});
      const base = {...makeBoard(), playStyle: 'tabletop', goal: 'expedition', travelLimit: 3, ...(choice ? {chance: true} : {})};
      await page.evaluate(({base, source, die}) => {
        const e = AlloModules.LessonBoardEngine;
        if (typeof e.fieldOpportunity !== 'function') throw Error('Release the encounter bundle before running this harness.');
        // The browser path uses a fixed, honest d20 value of 1 for later answers.
        Object.defineProperty(crypto, 'getRandomValues', {configurable: true, value: buffer => {buffer.fill(0); return buffer;}});
        window.qaBoard = e.prepareBoard(base, source);
        let run = e.emptyRun();
        for (const [index, id] of ['heater', 'cloud'].entries()) {
          run = e.merge(run, e.begin(qaBoard, run, id));
          const node = qaBoard.locations.find(n => n.id === id);
          run = e.merge(run, e.processAction(qaBoard, run, {attemptId: 'qa', turn: run.turn, requestId: e.requestId(run), kind: 'answer', targetId: id, value: e.solution(node)}, 'solo', {attemptId: 'qa', active: true}));
          run = e.merge(run, e.resolve(qaBoard, run, {solo: {}}, {dice: [index ? die : 1, 1]}));
          if (index === 0) run = e.merge(run, e.advance(qaBoard, run));
        }
        EncounterQA.saveBoard(localStorage, source, 'English', qaBoard);
        const seeded = EncounterQA.saveSolo(localStorage, qaBoard, 'encounter-qa', 'u', {run, workspace: EncounterQA.soloWorkspace(qaBoard, run)});
        if (seeded.status !== 'saved') throw Error('Could not prepare legal field encounter run.');
        window.saved = () => EncounterQA.readSolo(localStorage, qaBoard, 'encounter-qa', 'u');
        window.snapshot = () => {const run = saved().run; return {run, progress: e.derive(qaBoard, run), offer: e.fieldOpportunity(qaBoard, run)};};
        window.qaRoot = ReactDOM.createRoot(document.getElementById('root'));
        window.mount = () => qaRoot.render(React.createElement(AlloModules.LessonBoardSetup, {inputText: source, appId: 'encounter-qa', user: {uid: 'u'}, allowLive: false, t: key => key, onClose() {}, callGemini() {throw Error('QA must not call a provider.');}}));
        mount();
      }, {base, source, die});
      const scans = [];
      const scan = async label => {
        const violations = await page.evaluate(async () => (await axe.run(document.getElementById('root'), {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})).violations.map(v => ({id: v.id, targets: v.nodes.map(n => n.target)})));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || [...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current')].some(n => n.scrollWidth > n.clientWidth + 1));
        expect(violations, label).toEqual([]);
        expect(overflow, label + ' overflow').toBe(false);
        scans.push({label, violations, overflow});
      };
      const resume = async () => {
        const before = await page.evaluate(() => snapshot());
        await page.locator('[data-tabletop-game-menu]>summary').click();
        await page.getByRole('button', {name: 'Back to board setup', exact: true}).click();
        await page.locator('[data-board-play-solo]').click();
        expect(await page.evaluate(() => snapshot())).toEqual(before);
      };
      const move = async id => {
        await page.locator('[data-ready-move="' + id + '"]').click();
        await page.locator('[data-board-move="' + id + '"]').click();
      };
      await page.locator('[data-board-play-solo]').click();
      await page.getByRole('button', {name: 'Board view', exact: true}).click();
      const initial = await page.evaluate(() => snapshot());
      expect(initial.progress.visited).toEqual(['heater', 'cloud']);
      if (!choice) {
        expect(initial.offer).toBeNull();
        await expect(page.locator('[data-field-encounter]')).toHaveCount(0);
        await expect(page.locator('[data-board-next]')).toBeEnabled();
        await scan('fortune disabled review');
        await page.locator('[data-board-next]').click();
        await move('rain');
        await page.locator('.lb-current [data-board-choice]').selectOption('2');
        await page.locator('[data-board-submit]').click();
        const after = await page.evaluate(() => snapshot());
        expect(after.progress.balance).toEqual(initial.progress.balance.map((n, i) => n + base.locations.find(n => n.id === 'rain').reward[i]));
        expect(after.progress.fieldEvents).toBeUndefined();
        await expect(page.locator('[data-field-encounter]')).toHaveCount(0);
        await scan('fortune disabled investigation');
        await resume();
        results.push({...scenario, noChanceCompatible: true, scans});
        await context.close();
        continue;
      }
      expect(initial.offer).toMatchObject({id: event, pending: true});
      await expect(page.locator('[data-field-encounter="' + event + '"]')).toBeVisible();
      await expect(page.locator('[data-board-next]')).toBeDisabled();
      await scan('pending encounter 2D');
      await page.locator('[data-board-tabletop]').click();
      await scan('pending encounter 3D');
      await page.locator('[data-field-encounter]').screenshot({path: path.join(out, name + '-opportunity.png')});
      await page.evaluate(() => document.body.classList.add('dark'));
      await scan('dark pending encounter');
      await page.locator('[data-field-encounter]').screenshot({path: path.join(out, name + '-dark-opportunity.png')});
      await page.evaluate(() => document.body.classList.remove('dark'));
      await page.emulateMedia({forcedColors: 'active'});
      await scan('forced colors pending encounter');
      await page.emulateMedia({forcedColors: 'none'});
      await resume();
      await expect(page.locator('[data-field-encounter="' + event + '"]')).toBeVisible();
      await expect(page.locator('[data-board-next]')).toBeDisabled();
      await page.locator('[data-field-choice="' + choice + '"]').focus();
      await page.keyboard.press('Enter');
      const chosen = await page.evaluate(() => snapshot());
      expect(chosen.run.steps.t1.result.fieldChoice).toBe(choice);
      expect(chosen.progress.balance).toEqual(initial.progress.balance.map((n, i) => n + (choice === 'collect' ? initial.offer.immediate[i] : 0)));
      expect(chosen.progress.fieldEvents).toHaveLength(1);
      await expect(page.locator('[data-field-receipt]')).toBeVisible();
      expect(await page.evaluate(() => !!document.activeElement?.closest('[data-field-receipt]'))).toBe(true);
      await expect(page.locator('[data-board-next]')).toBeEnabled();
      await scan('choice receipt');
      await expect(page.locator('[data-next-project="research"]')).toBeVisible();
      await page.locator('[data-next-project="research"]').click();
      await expect(page.locator('[data-board-inspection]')).toContainText('Research station');
      expect(await page.evaluate(() => snapshot())).toEqual(chosen);
      await scan('newly affordable construction inspected without spending');
      await page.getByRole('button', {name: 'Return to current move', exact: true}).click();
      await resume();
      await expect(page.locator('[data-field-choice]')).toHaveCount(0);
      if (choice === 'collect') {
        expect(chosen.progress.fieldPreparation).toBeNull();
        await page.locator('[data-board-next]').click();
        await move('rain');
        await page.locator('.lb-current [data-board-choice]').selectOption('2');
        await page.locator('[data-board-submit]').click();
        const after = await page.evaluate(() => snapshot());
        expect(after.progress.balance).toEqual(chosen.progress.balance.map((n, i) => n + base.locations.find(n => n.id === 'rain').reward[i]));
        expect(after.progress.fieldDeliveries).toHaveLength(0);
        await scan('immediate reward remains single');
        results.push({...scenario, resumePending: true, resumeChoice: true, immediateExactlyOnce: true, scans});
        await context.close();
        continue;
      }
      expect(chosen.progress.fieldPreparation.reward).toEqual(initial.offer.prepared);
      await page.locator('[data-board-next]').click();
      await expect(page.locator('[data-field-preparation]')).toBeVisible();
      await scan('prepared opportunity active');
      await move('heater');
      const traveled = await page.evaluate(() => snapshot());
      expect(traveled.progress.balance).toEqual(chosen.progress.balance);
      expect(traveled.progress.fieldPreparation).toEqual(chosen.progress.fieldPreparation);
      await expect(page.locator('[data-field-preparation]')).toBeVisible();
      await page.locator('[data-board-next]').click();
      await move('research');
      const built = await page.evaluate(() => snapshot());
      expect(built.progress.balance).toEqual(chosen.progress.balance.map((n, i) => n - base.projects.find(n => n.id === 'research').cost[i]));
      expect(built.progress.fieldPreparation).toEqual(chosen.progress.fieldPreparation);
      expect(built.progress.fieldDeliveries).toHaveLength(0);
      await expect(page.locator('[data-field-preparation]')).toBeVisible();
      await scan('preparation survives travel and construction');
      await resume();
      await page.locator('[data-board-next]').click();
      await move('river');
      // An unsuccessful investigation should preserve the prepared reward.
      await page.locator('.lb-current [data-board-choice]').selectOption('1');
      await page.locator('[data-board-submit]').click();
      const failed = await page.evaluate(() => snapshot());
      expect(failed.progress.balance).toEqual(built.progress.balance);
      expect(failed.progress.fieldPreparation).toEqual(chosen.progress.fieldPreparation);
      expect(failed.progress.fieldDeliveries).toHaveLength(0);
      await expect(page.locator('[data-field-preparation]')).toBeVisible();
      await expect(page.locator('[data-field-delivery]')).toHaveCount(0);
      await page.locator('[data-board-retry]').click();
      await page.locator('.lb-current [data-board-choice]').selectOption('0');
      await page.locator('[data-board-submit]').click();
      const delivered = await page.evaluate(() => snapshot());
      expect(delivered.progress.balance).toEqual(built.progress.balance.map((n, i) => n + base.locations.find(n => n.id === 'river').reward[i] + built.progress.bonus[i] + initial.offer.prepared[i]));
      expect(delivered.progress.fieldPreparation).toBeNull();
      expect(delivered.progress.fieldDeliveries).toHaveLength(1);
      expect(delivered.progress.fieldDeliveries[0].gain).toEqual(initial.offer.prepared);
      await expect(page.locator('[data-field-delivery]')).toBeVisible();
      await scan('prepared reward delivered after retry');
      await page.locator('[data-field-delivery]').screenshot({path: path.join(out, name + '-delivery.png')});
      await resume();
      await page.locator('[data-board-next]').click();
      await move('heater');
      const returned = await page.evaluate(() => snapshot());
      expect(returned.progress.balance).toEqual(delivered.progress.balance);
      expect(returned.progress.fieldDeliveries).toHaveLength(1);
      await scan('delivered reward is not repeated');
      results.push({...scenario, resumePending: true, resumeChoice: true, preparationSurvivesTravelBuildFailure: true, delayedRewardExactlyOnce: true, balanceBefore: initial.progress.balance, balanceDelivered: delivered.progress.balance, scans});
      await context.close();
    }
    expect(errors).toEqual([]);
    fs.writeFileSync(path.join(out, 'browser-verification.json'), JSON.stringify({passed: true, scope: 'Production bundle. Legal engine-played fixture seeds the saved game; all encounter decisions, travel, construction, retry and resume actions use the UI. Later d20 rolls fixed to 1. No live service.', bundleSha256, results, errors}, null, 2));
    console.log(JSON.stringify({passed: true, out, scenarios: results.length, scans: results.reduce((sum, r) => sum + r.scans.length, 0)}));
  } catch (error) {
    for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({path: path.join(out, 'failure-' + page.viewportSize().width + '.png'), fullPage: true}).catch(() => {});
    fs.writeFileSync(path.join(out, 'browser-failure.json'), JSON.stringify({message: error.stack, results, errors}, null, 2));
    throw error;
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
