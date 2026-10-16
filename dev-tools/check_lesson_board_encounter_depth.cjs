const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {chromium} = require('playwright'), {expect} = require('@playwright/test');
const {makeBoard, source} = require('./fixtures/lesson_board.cjs');
const out = path.resolve('reports/lesson-board-encounter-depth-2026-10-14');
fs.mkdirSync(out, {recursive: true});
const bundle = fs.readFileSync('lesson_board_module.js', 'utf8');
const bundleSha256 = crypto.createHash('sha256').update(bundle).digest('hex');
const helpers = require('esbuild').buildSync({stdin: {
  contents: "export {saveBoard,saveSolo,readSolo,soloWorkspace} from './lesson_board_storage.js'; export {encounterStory} from './lesson_board_encounter_labels.js';",
  resolveDir: process.cwd()
}, bundle: true, write: false, format: 'iife', globalName: 'EncounterDepthQA'}).outputFiles[0].text;
const html = '<!doctype html><html lang="en"><head><title>Expedition encounter depth verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
const cases = [
  {width: 1440, die: 3, event: 'survey', theme: 'river', choice: 'crew'},
  {width: 390, die: 8, event: 'supplies', theme: 'garden', choice: 'crew'},
  {width: 320, die: 13, event: 'passage', theme: 'space', choice: 'crew'},
  {width: 1440, die: 18, event: 'rendezvous', theme: 'archive', choice: 'prepare'},
  {width: 320, die: 3, event: 'no-chance', choice: null}
];
const amounts = (board, values) => values.map((value, index) => value + ' ' + board.resources[index]).join(' · ');

(async () => {
  const browser = await chromium.launch({headless: true}), results = [], errors = [];
  let storyVariants = [];
  try {
    for (const scenario of cases) {
      const {width, die, event, choice} = scenario, name = width + '-' + event;
      const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => errors.push(error.message));
      await page.route('http://encounter-depth.test/**', route => route.fulfill({contentType: 'text/html', body: html}));
      await page.goto('http://encounter-depth.test/');
      for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', require.resolve('axe-core/axe.min.js')]) await page.addScriptTag({path: file});
      await page.addScriptTag({content: bundle});
      await page.addScriptTag({content: helpers});
      if (!storyVariants.length) {
        storyVariants = await page.evaluate(() => {
          const stories = [];
          for (const theme of ['river', 'garden', 'workshop', 'archive', 'space']) {
            for (const [family, id] of ['survey', 'supplies', 'passage', 'rendezvous'].entries()) {
              const variants = new Map();
              for (let offset = 0; offset < 5; offset++) {
                const die = family * 5 + offset + 1;
                const story = EncounterDepthQA.encounterStory({theme}, id, [die, 1], key => key);
                const replay = EncounterDepthQA.encounterStory({theme}, id, [die, 20], key => key);
                if (JSON.stringify(story) !== JSON.stringify(replay)) throw Error('Second die altered saved story.');
                if (!story.title || !story.text || story.variant !== offset % 3) throw Error('Malformed encounter story.');
                variants.set(story.variant, {...story, theme, family: id});
              }
              if (variants.size !== 3) throw Error('Expected three authored stories for each theme and family.');
              stories.push(...variants.values());
            }
          }
          return stories;
        });
        expect(storyVariants).toHaveLength(60);
        expect(new Set(storyVariants.map(story => story.title)).size).toBe(60);
      }
      const base = {...makeBoard(), theme: scenario.theme || 'river', playStyle: 'tabletop', goal: 'expedition', travelLimit: 3, ...(choice ? {chance: true} : {})};
      await page.evaluate(({base, source, die}) => {
        const e = AlloModules.LessonBoardEngine;
        if (typeof e.chooseFieldOpportunity !== 'function') throw Error('Release the encounter-depth bundle before running this harness.');
        // Fixed later rolls isolate actual payments from future fortune gains.
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
        EncounterDepthQA.saveBoard(localStorage, source, 'English', qaBoard);
        const seeded = EncounterDepthQA.saveSolo(localStorage, qaBoard, 'encounter-depth-qa', 'u', {run, workspace: EncounterDepthQA.soloWorkspace(qaBoard, run)});
        if (seeded.status !== 'saved') throw Error('Could not prepare legal saved encounter run.');
        window.saved = () => EncounterDepthQA.readSolo(localStorage, qaBoard, 'encounter-depth-qa', 'u');
        window.snapshot = () => {const run = saved().run; return {run, progress: e.derive(qaBoard, run), offer: e.fieldOpportunity(qaBoard, run)};};
        window.qaRoot = ReactDOM.createRoot(document.getElementById('root'));
        qaRoot.render(React.createElement(AlloModules.LessonBoardSetup, {inputText: source, appId: 'encounter-depth-qa', user: {uid: 'u'}, allowLive: false, t: key => key, onClose() {}, callGemini() {throw Error('QA must not call a provider.');}}));
      }, {base, source, die});
      const scans = [];
      const scan = async label => {
        const violations = await page.evaluate(async () => (await axe.run(document.getElementById('root'), {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})).violations.map(v => ({id: v.id, targets: v.nodes.map(n => n.target)})));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || [...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current,[data-tabletop-encounters],[data-field-panel]')].some(n => n.scrollWidth > n.clientWidth + 1));
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
      const openDeck = async expected => {
        const before = await page.evaluate(() => snapshot());
        await expect(page.locator('[data-tabletop-encounters]')).toHaveAttribute('data-encounter-state', expected);
        await page.locator('[data-open-tabletop-encounter]').click();
        await expect(page.locator('[data-field-panel]')).toBeFocused();
        expect(await page.evaluate(() => snapshot())).toEqual(before);
      };
      const shootBoard = async suffix => {
        await page.setViewportSize({width, height: 2300});
        await page.locator('[data-spatial-board]').screenshot({path: path.join(out, name + '-' + suffix + '.png')});
        await page.setViewportSize({width, height: 1000});
      };
      await page.locator('[data-board-play-solo]').click();
      await page.getByRole('button', {name: 'Board view', exact: true}).click();
      const initial = await page.evaluate(() => snapshot());
      expect(initial.progress.visited).toEqual(['heater', 'cloud']);
      if (!choice) {
        expect(initial.offer).toBeNull();
        await expect(page.locator('[data-field-encounter],[data-tabletop-encounters],[data-tabletop-encounter-token]')).toHaveCount(0);
        await expect(page.locator('[data-board-next]')).toBeEnabled();
        await page.locator('[data-board-tabletop]').click();
        await scan('fortune disabled 3D');
        await page.locator('[data-board-next]').click();
        await move('rain');
        await page.locator('.lb-current [data-board-choice]').selectOption('2');
        await page.locator('[data-board-submit]').click();
        const after = await page.evaluate(() => snapshot());
        expect(after.progress.balance).toEqual(initial.progress.balance.map((n, i) => n + base.locations.find(n => n.id === 'rain').reward[i]));
        expect(after.progress.fieldEvents).toBeUndefined();
        await expect(page.locator('[data-field-crew],[data-field-encounter],[data-tabletop-encounters]')).toHaveCount(0);
        await scan('fortune disabled investigation');
        await resume();
        results.push({...scenario, noChanceCompatible: true, scans});
        await context.close();
        continue;
      }
      expect(initial.offer).toMatchObject({id: event, pending: true});
      await expect(page.locator('[data-field-encounter="' + event + '"]')).toBeVisible();
      const expectedStory = await page.evaluate(({event, die}) => EncounterDepthQA.encounterStory(qaBoard, event, [die, 1], key => key), {event, die});
      await expect(page.locator('[data-field-encounter] h4')).toHaveText(expectedStory.title);
      await expect(page.locator('[data-field-encounter]')).toContainText(expectedStory.text);
      await expect(page.locator('[data-tabletop-encounters] h4')).toHaveText(expectedStory.title);
      await expect(page.locator('[data-field-choice]')).toHaveCount(3);
      await expect(page.locator('[data-board-next]')).toBeDisabled();
      await expect(page.locator('[data-encounter-milestone="2"]')).toHaveAttribute('data-milestone-state', 'pending');
      await openDeck('pending');
      await scan('pending encounter and deck 2D');
      await page.getByRole('button', {name: 'Location list', exact: true}).click();
      await openDeck('pending');
      await scan('pending encounter and deck list');
      await page.locator('[data-board-tabletop]').click();
      for (const camera of ['left', 'right', 'angle']) {
        await page.locator('[data-tabletop-camera=' + camera + ']').click();
        await expect(page.locator('[data-tabletop-encounter-token]')).toHaveAttribute('data-encounter-state', 'pending');
        await openDeck('pending');
        await scan('pending 3D deck ' + camera);
      }
      await shootBoard('tabletop');
      await page.locator('[data-field-panel]').screenshot({path: path.join(out, name + '-choices.png')});
      await page.evaluate(() => document.body.classList.add('dark'));
      await scan('dark pending encounter and deck');
      if (width === 1440) await shootBoard('dark-tabletop');
      await page.evaluate(() => document.body.classList.remove('dark'));
      await page.emulateMedia({forcedColors: 'active'});
      await scan('forced colors pending encounter and deck');
      await page.emulateMedia({forcedColors: 'none'});
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      expect(await page.evaluate(() => [...document.querySelectorAll('[data-tabletop-encounters], [data-tabletop-encounters] *, [data-tabletop-encounter-token], [data-tabletop-encounter-token] *')].every(node => getComputedStyle(node).animationName === 'none'))).toBe(true);
      await resume();
      await openDeck('pending');
      await page.locator('[data-field-choice="' + choice + '"]').focus();
      await page.keyboard.press('Enter');
      const chosen = await page.evaluate(() => snapshot());
      expect(chosen.run.steps.t1.result.fieldChoice).toBe(choice);
      expect(chosen.progress.balance).toEqual(initial.progress.balance);
      expect(chosen.progress.fieldEvents).toHaveLength(1);
      await expect(page.locator('[data-field-receipt]')).toBeVisible();
      expect(await page.evaluate(() => !!document.activeElement?.closest('[data-field-receipt]'))).toBe(true);
      await expect(page.locator('[data-board-next]')).toBeEnabled();
      await expect(page.locator('[data-encounter-milestone="2"]')).toHaveAttribute('data-milestone-state', 'resolved');
      await scan('chosen encounter receipt');
      await resume();
      await expect(page.locator('[data-field-choice]')).toHaveCount(0);
      await page.locator('[data-board-next]').click();
      const reservation = choice === 'crew' ? 'fieldCrew' : 'fieldPreparation';
      const reward = choice === 'crew' ? [1, 1] : initial.offer.prepared;
      expect(chosen.progress[reservation].reward).toEqual(reward);
      await expect(page.locator(choice === 'crew' ? '[data-field-crew]' : '[data-field-preparation]')).toBeVisible();
      await openDeck(choice === 'crew' ? 'crew' : 'prepared');
      await scan('reserved benefit and active deck');
      if (choice === 'crew' && chosen.progress.balance[1] < 3) {
        const before = await page.evaluate(() => snapshot());
        await page.locator('[data-ready-move="network"]').click();
        await expect(page.locator('.lb-current [data-funding-option="standard"] input')).toBeDisabled();
        await expect(page.locator('.lb-current [data-funding-option="standard"]')).toContainText('More supplies needed for this payment.');
        expect(await page.evaluate(() => snapshot())).toEqual(before);
        await scan('crew cannot make an unaffordable printed payment available');
      }
      await move('heater');
      const traveled = await page.evaluate(() => snapshot());
      expect(traveled.progress.balance).toEqual(chosen.progress.balance);
      expect(traveled.progress[reservation]).toEqual(chosen.progress[reservation]);
      await page.locator('[data-board-next]').click();
      if (choice === 'crew') {
        await move('river');
        await page.locator('.lb-current [data-board-choice]').selectOption('0');
        await page.locator('[data-board-submit]').click();
        const investigated = await page.evaluate(() => snapshot());
        expect(investigated.progress.balance).toEqual(traveled.progress.balance.map((n, i) => n + base.locations.find(n => n.id === 'river').reward[i]));
        expect(investigated.progress.fieldCrew).toEqual(chosen.progress.fieldCrew);
        expect(investigated.progress.fieldDeliveries).toHaveLength(0);
        await openDeck('crew');
        await scan('crew survives travel and investigation');
        await resume();
        await page.locator('[data-board-next]').click();
        await move('heater');
        await page.locator('[data-board-next]').click();
        const ready = await page.evaluate(() => snapshot());
        const project = base.projects.find(n => n.id === 'research');
        const expectedBalance = ready.progress.balance.map((n, i) => n - project.cost[i] + reward[i]);
        await page.locator('[data-ready-move="research"]').click();
        await expect(page.locator('.lb-current [data-funding-option="standard"]')).toContainText(amounts(base, project.cost));
        await expect(page.locator('[data-tabletop-forecast]')).toContainText(amounts(base, expectedBalance));
        await expect(page.locator('[data-forecast-crew]')).toBeVisible();
        expect(await page.evaluate(() => snapshot())).toEqual(ready);
        await scan('construction forecast includes refund after full payment');
        await page.locator('[data-planning-sandbox]>summary').click();
        await page.locator('[data-sandbox-start]').click();
        await page.locator('[data-sandbox-construction="research"] [data-funding-option="standard"] input').check();
        await page.locator('[data-sandbox-add="research"]').click();
        await expect(page.locator('[data-sandbox-step="research"]')).toContainText('Payment: ' + amounts(base, project.cost));
        await expect(page.locator('[data-sandbox-step="research"]')).toContainText('Supplies after this move: ' + amounts(base, expectedBalance));
        expect(await page.evaluate(() => snapshot())).toEqual(ready);
        await scan('planning includes crew refund without spending');
        await page.locator('[data-sandbox-inspect]').click();
        await page.locator('[data-board-move="research"]').click();
        const built = await page.evaluate(() => snapshot());
        expect(built.progress.balance).toEqual(expectedBalance);
        expect(built.progress.fieldCrew).toBeNull();
        expect(built.progress.fieldDeliveries).toHaveLength(1);
        expect(built.progress.fieldDeliveries[0]).toMatchObject({gain: reward, kind: 'construction', projectId: 'research'});
        expect(built.run.steps['t' + built.run.turn].funding || 'standard').toBe('standard');
        await expect(page.locator('[data-field-crew]')).toHaveCount(0);
        await expect(page.locator('[data-field-delivery]')).toBeVisible();
        await openDeck('delivered');
        await scan('crew refund paid exactly once after construction');
        await page.locator('[data-field-panel]').screenshot({path: path.join(out, name + '-construction-delivery.png')});
        await resume();
        const deliveredAgain = await page.evaluate(() => snapshot());
        expect(deliveredAgain).toEqual(built);
        await page.locator('[data-board-next]').click();
        await move('cloud');
        expect((await page.evaluate(() => snapshot())).progress.balance).toEqual(built.progress.balance);
        await page.locator('[data-board-next]').click();
        await move('heater');
        expect((await page.evaluate(() => snapshot())).progress.balance).toEqual(built.progress.balance);
        await page.locator('[data-board-next]').click();
        await move('bridge');
        const secondBuild = await page.evaluate(() => snapshot());
        expect(secondBuild.progress.balance).toEqual(built.progress.balance.map((n, i) => n - base.projects.find(n => n.id === 'bridge').cost[i]));
        expect(secondBuild.progress.fieldDeliveries).toHaveLength(1);
        await expect(page.locator('[data-field-delivery]')).toHaveCount(0);
        await scan('later construction cannot reclaim crew refund');
        results.push({...scenario, resumePending: true, resumeChoice: true, deckInspectionDoesNotSpend: true, crewSurvivesTravelAndInvestigation: true, printedPaymentUnchanged: true, forecastAndPlanMatched: true, refundExactlyOnce: true, balanceBefore: initial.progress.balance, balanceAfterRefund: built.progress.balance, scans});
      } else {
        await move('research');
        const built = await page.evaluate(() => snapshot());
        expect(built.progress.balance).toEqual(chosen.progress.balance.map((n, i) => n - base.projects.find(n => n.id === 'research').cost[i]));
        expect(built.progress.fieldPreparation).toEqual(chosen.progress.fieldPreparation);
        expect(built.progress.fieldDeliveries).toHaveLength(0);
        await openDeck('prepared');
        await page.locator('[data-board-next]').click();
        await move('rain');
        await page.locator('.lb-current [data-board-choice]').selectOption('0');
        await page.locator('[data-board-submit]').click();
        const failed = await page.evaluate(() => snapshot());
        expect(failed.progress.balance).toEqual(built.progress.balance);
        expect(failed.progress.fieldPreparation).toEqual(chosen.progress.fieldPreparation);
        await page.locator('[data-board-retry]').click();
        await page.locator('.lb-current [data-board-choice]').selectOption('2');
        await page.locator('[data-board-submit]').click();
        const delivered = await page.evaluate(() => snapshot());
        expect(delivered.progress.balance).toEqual(built.progress.balance.map((n, i) => n + base.locations.find(n => n.id === 'rain').reward[i] + built.progress.bonus[i] + reward[i]));
        expect(delivered.progress.fieldPreparation).toBeNull();
        expect(delivered.progress.fieldDeliveries).toHaveLength(1);
        await expect(page.locator('[data-field-delivery]')).toBeVisible();
        await openDeck('delivered');
        await scan('discovery preparation still pays after retry');
        await resume();
        results.push({...scenario, existingPreparationCompatible: true, preparationSurvivesTravelBuildAndFailure: true, preparedRewardExactlyOnce: true, scans});
      }
      await context.close();
    }
    expect(errors).toEqual([]);
    for (const file of ['browser-failure.json', 'failure-1440.png', 'failure-390.png', 'failure-320.png']) {
      const oldFailure = path.join(out, file);
      if (fs.existsSync(oldFailure)) fs.unlinkSync(oldFailure);
    }
    fs.writeFileSync(path.join(out, 'browser-verification.json'), JSON.stringify({passed: true, scope: 'Production bundle. A legal engine-played fixture seeds the save; all encounter choices, inspections, planning, travel, investigations, construction and resume actions use the UI. Later dice fixed to 1. The shared story resolver is additionally checked across all 60 authored variants. No live service.', bundleSha256, storyVariants, results, errors}, null, 2));
    console.log(JSON.stringify({passed: true, out, scenarios: results.length, scans: results.reduce((sum, r) => sum + r.scans.length, 0)}));
  } catch (error) {
    for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({path: path.join(out, 'failure-' + page.viewportSize().width + '.png'), fullPage: true}).catch(() => {});
    fs.writeFileSync(path.join(out, 'browser-failure.json'), JSON.stringify({message: error.stack, results, errors}, null, 2));
    throw error;
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
