const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {chromium} = require('playwright'), {expect} = require('@playwright/test');
const {makeBoard, source} = require('./fixtures/lesson_board.cjs');
const out = path.resolve('reports/lesson-board-destinations-2026-10-14');
fs.mkdirSync(out, {recursive: true});
const bundle = fs.readFileSync('lesson_board_module.js', 'utf8');
const bundleSha256 = crypto.createHash('sha256').update(bundle).digest('hex');
const helpers = require('esbuild').buildSync({stdin: {
  contents: "export {saveBoard,saveSolo,readSolo,soloWorkspace} from './lesson_board_storage.js';", resolveDir: process.cwd()
}, bundle: true, write: false, format: 'iife', globalName: 'DestinationQA'}).outputFiles[0].text;
const html = '<!doctype html><html lang="en"><head><title>Expedition destinations verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
const cases = [{width: 1440, die: 3, theme: 'river'}, {width: 390, die: 8, theme: 'garden'}, {width: 320, die: 13, theme: 'space'}, {width: 320, die: 3, theme: 'archive', noChance: true}];
const focusOnly = process.env.DESTINATION_FOCUS_ONLY === '1';
const amounts = (board, values) => values.map((value, index) => value + ' ' + board.resources[index]).join(' · ');

(async () => {
  const browser = await chromium.launch({headless: true}), results = [], errors = [];
  try {
    for (const scenario of focusOnly ? cases.slice(0, 1) : cases) {
      const {width, die} = scenario, name = width + '-' + scenario.theme;
      const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => errors.push(error.message));
      await page.route('http://destinations.test/**', route => route.fulfill({contentType: 'text/html', body: html}));
      await page.goto('http://destinations.test/');
      for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', require.resolve('axe-core/axe.min.js')]) await page.addScriptTag({path: file});
      await page.addScriptTag({content: bundle}); await page.addScriptTag({content: helpers});
      const base = {...makeBoard(), theme: scenario.theme, playStyle: 'tabletop', goal: 'expedition', travelLimit: 3, ...(!scenario.noChance ? {chance: true} : {})};
      await page.evaluate(({base, source, die}) => {
        const e = AlloModules.LessonBoardEngine;
        // Later rolls isolate destination rewards from future fortune gains.
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
        DestinationQA.saveBoard(localStorage, source, 'English', qaBoard);
        const seeded = DestinationQA.saveSolo(localStorage, qaBoard, 'destinations-qa', 'u', {run, workspace: DestinationQA.soloWorkspace(qaBoard, run)});
        if (seeded.status !== 'saved') throw Error('Could not seed a legal saved encounter run.');
        window.saved = () => DestinationQA.readSolo(localStorage, qaBoard, 'destinations-qa', 'u');
        window.snapshot = () => {const run = saved().run; return {run, progress: e.derive(qaBoard, run), offer: e.fieldOpportunity(qaBoard, run)};};
        window.qaRoot = ReactDOM.createRoot(document.getElementById('root'));
        qaRoot.render(React.createElement(AlloModules.LessonBoardSetup, {inputText: source, appId: 'destinations-qa', user: {uid: 'u'}, allowLive: false, t: key => key, onClose() {}, callGemini() {throw Error('QA must not call a provider.');}}));
      }, {base, source, die});
      const scans = [];
      const scan = async label => {
        const violations = await page.evaluate(async () => (await axe.run(document.getElementById('root'), {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})).violations.map(v => ({id: v.id, targets: v.nodes.map(n => n.target)})));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || [...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current,[data-tabletop-encounters],[data-field-panel]')].some(n => n.scrollWidth > n.clientWidth + 1));
        expect(violations, label).toEqual([]); expect(overflow, label + ' overflow').toBe(false); scans.push({label, violations, overflow});
      };
      const resume = async () => {
        const before = await page.evaluate(() => snapshot());
        await page.locator('[data-tabletop-game-menu]>summary').click();
        await page.getByRole('button', {name: 'Back to board setup', exact: true}).click(); await page.locator('[data-board-play-solo]').click();
        expect(await page.evaluate(() => snapshot())).toEqual(before);
      };
      const move = async id => {await page.locator('[data-ready-move="' + id + '"]').click(); await page.locator('[data-board-move="' + id + '"]').click();};
      const answer = async (id, wrong = false) => {
        const node = base.locations.find(n => n.id === id);
        if (node.kind === 'choice') await page.locator('.lb-current [data-board-choice]').selectOption(String(wrong ? (node.answer + 1) % node.options.length : node.answer));
        else if (node.kind === 'settings') for (const [index, control] of node.controls.entries()) await page.locator('.lb-current [data-board-control="' + index + '"]').selectOption(String(wrong ? (control.answer + 1) % control.options.length : control.answer));
        else if (node.kind === 'order') {
          for (const [index, item] of (wrong ? [...node.order].reverse() : node.order).entries()) {
            let at = await page.locator('.lb-current .lb-order li').evaluateAll((rows, text) => rows.findIndex(li => li.querySelector('span').textContent.endsWith(text)), node.items[item]);
            while (at > index) {await page.locator('.lb-current [data-board-up="' + at + '"]').click(); at--;}
          }
        } else throw Error('Unsupported QA response ' + node.kind);
        await page.locator('[data-board-submit]').click();
      };
      const next = async () => {
        if ((await page.evaluate(() => snapshot())).offer?.pending) await page.locator('[data-field-choice="collect"]').click();
        await page.locator('[data-board-next]').click();
      };
      const shootBoard = async suffix => {await page.setViewportSize({width, height: 2300}); await page.locator('[data-spatial-board]').screenshot({path: path.join(out, name + '-' + suffix + '.png')}); await page.setViewportSize({width, height: 1000});};
      await page.locator('[data-board-play-solo]').click(); await page.getByRole('button', {name: 'Board view', exact: true}).click();
      const initial = await page.evaluate(() => snapshot());
      if (scenario.noChance) {
        expect(initial.offer).toBeNull(); await page.locator('[data-board-tabletop]').click();
        await expect(page.locator('[data-field-lead-option],[data-field-lead],[data-tabletop-destination],[data-expedition-destination-marker]')).toHaveCount(0);
        await scan('fortune disabled 3D'); await next(); await move('rain'); await answer('rain');
        expect((await page.evaluate(() => snapshot())).progress.balance).toEqual(initial.progress.balance.map((n, i) => n + base.locations.find(n => n.id === 'rain').reward[i]));
        await resume(); await scan('fortune disabled exploration and resume');
        results.push({...scenario, noChanceCompatible: true, scans}); await context.close(); continue;
      }
      expect(initial.offer.canLead).toBe(true); expect(initial.offer.leads.length).toBeGreaterThan(0);
      const lead = initial.offer.leads.find(candidate => ['river', 'rain'].includes(candidate.targetId)) || initial.offer.leads.find(candidate => base.locations.find(n => n.id === candidate.targetId).kind === 'choice') || initial.offer.leads[0];
      const target = base.locations.find(node => node.id === lead.targetId), otherLead = initial.offer.leads.find(candidate => candidate.targetId !== lead.targetId);
      await expect(page.locator('[data-field-lead-option]')).toHaveCount(initial.offer.leads.length);
      // The highlighted default is only a draft: even inspection never commits it.
      if (otherLead) {await page.locator('[data-field-lead-option="' + otherLead.targetId + '"]').check(); expect(await page.evaluate(() => snapshot())).toEqual(initial);}
      await page.locator('[data-field-lead-option="' + lead.targetId + '"]').check(); expect(await page.evaluate(() => snapshot())).toEqual(initial);
      if (width === 1440) {await page.locator('[data-board-focus]').click(); await expect(page.locator('[data-spatial-board]')).toHaveCount(0);}
      await page.locator('[data-field-lead-inspect="' + lead.targetId + '"]').click(); expect(await page.evaluate(() => snapshot())).toEqual(initial);
      if (width === 1440) {await expect(page.locator('[data-board-tabletop]')).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-spatial-board]')).toBeVisible();}
      await expect(page.locator('[data-field-lead-commit]')).toBeEnabled();
      await scan('candidate selection and inspection do not spend or advance');
      await page.setViewportSize({width, height: 2300});
      await page.locator('[data-field-lead-offer]').screenshot({path: path.join(out, name + '-destination-offer.png')});
      await page.locator('[data-field-panel]').screenshot({path: path.join(out, name + '-destination-choices.png')});
      await page.setViewportSize({width, height: 1000});
      if (focusOnly) {results.push({...scenario, focusInspectionShows3D: true, draftAndInspectionLeaveRunUnchanged: true, scans}); await context.close(); continue;}
      await resume(); await page.locator('[data-field-lead-option="' + lead.targetId + '"]').check();
      await page.locator('[data-field-lead-commit]').focus(); await page.keyboard.press('Enter');
      const chosen = await page.evaluate(() => snapshot());
      expect(chosen.run.steps.t1.result.fieldChoice).toBe('lead:' + lead.targetId); expect(chosen.progress.balance).toEqual(initial.progress.balance);
      expect(chosen.progress.fieldLead).toMatchObject({targetId: lead.targetId, reward: lead.reward});
      await expect(page.locator('[data-field-lead-receipt]')).toBeVisible(); await expect(page.locator('[data-board-next]')).toBeEnabled();
      await scan('explicit destination commitment receipt'); await resume(); await next();
      await expect(page.locator('[data-field-lead]')).toBeVisible();
      await page.getByRole('button', {name: 'Board view', exact: true}).click();
      const inspectDestination = async label => {
        const before = await page.evaluate(() => snapshot()); await page.locator('[data-inspect-tabletop-destination="' + lead.targetId + '"]').click();
        await expect(page.locator('[data-destination-detail="' + lead.targetId + '"]')).toBeVisible(); expect(await page.evaluate(() => snapshot())).toEqual(before); await scan(label);
      };
      await inspectDestination('active destination rail and 2D inspection');
      await expect(page.locator('[data-expedition-destination-marker="' + lead.targetId + '"]')).toHaveCount(1);
      await page.getByRole('button', {name: 'Location list', exact: true}).click();
      await expect(page.locator('[data-destination-list="' + lead.targetId + '"]')).toBeVisible(); await inspectDestination('active destination in location list');
      await page.locator('[data-board-tabletop]').click();
      for (const camera of ['left', 'right', 'angle']) {await page.locator('[data-tabletop-camera=' + camera + ']').click(); await expect(page.locator('[data-expedition-destination-marker="' + lead.targetId + '"]')).toHaveCount(1); await inspectDestination('active 3D destination ' + camera);}
      await shootBoard('destination-tabletop'); await page.evaluate(() => document.body.classList.add('dark')); await scan('dark destination pieces and rail');
      if (width === 1440) await shootBoard('dark-destination-tabletop');
      await page.evaluate(() => document.body.classList.remove('dark')); await page.emulateMedia({forcedColors: 'active'}); await scan('forced colors destination'); await page.emulateMedia({forcedColors: 'none'});
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      expect(await page.evaluate(() => [...document.querySelectorAll('[data-expedition-destination-marker], [data-expedition-destination-marker] *')].every(node => getComputedStyle(node).animationName === 'none'))).toBe(true);
      await move('heater'); expect((await page.evaluate(() => snapshot())).progress.fieldLead).toEqual(chosen.progress.fieldLead);
      await next(); await move('research');
      const built = await page.evaluate(() => snapshot());
      expect(built.progress.fieldLead).toEqual(chosen.progress.fieldLead); expect(built.progress.fieldDeliveries).toHaveLength(0);
      expect(built.progress.balance).toEqual(initial.progress.balance.map((n, i) => n - base.projects.find(p => p.id === 'research').cost[i]));
      await next(); const offTarget = lead.targetId === 'river' ? 'rain' : 'river', beforeOther = await page.evaluate(() => snapshot());
      await page.locator('[data-ready-move="' + offTarget + '"]').click(); await expect(page.locator('[data-forecast-lead]')).toHaveCount(0);
      await page.locator('[data-board-move="' + offTarget + '"]').click(); await answer(offTarget);
      const afterOther = await page.evaluate(() => snapshot());
      expect(afterOther.progress.balance).toEqual(beforeOther.progress.balance.map((n, i) => n + base.locations.find(item => item.id === offTarget).reward[i] + beforeOther.progress.bonus[i]));
      expect(afterOther.progress.fieldLead).toEqual(chosen.progress.fieldLead); expect(afterOther.progress.fieldDeliveries).toHaveLength(0);
      await scan('destination survives travel construction and another investigation'); await resume(); await next();
      // Follow real edges and clear intervening spaces until the destination is one legal move away.
      for (let count = 0; count < 14; count++) {
        const route = await page.evaluate(targetId => {
          const e = AlloModules.LessonBoardEngine, progress = snapshot().progress, legal = e.routeTo(qaBoard, progress, targetId);
          if (legal && legal.length <= 4) return {ready: true};
          const queue = [[progress.position]], seen = new Set([progress.position]);
          for (const full of queue) {
            if (full.at(-1) === targetId) {
              const firstNew = full.slice(1).find(id => !progress.visited.includes(id)), nextPath = e.routeTo(qaBoard, progress, firstNew || targetId), id = nextPath[Math.min(3, nextPath.length - 1)];
              return {ready: false, id, travel: progress.visited.includes(id)};
            }
            for (const [a, b] of qaBoard.edges) {const id = a === full.at(-1) ? b : b === full.at(-1) ? a : null; if (id && !seen.has(id)) {seen.add(id); queue.push([...full, id]);}}
          }
          throw Error('No graph route to promised destination.');
        }, lead.targetId);
        if (route.ready) break;
        await move(route.id); if (!route.travel) await answer(route.id);
        expect((await page.evaluate(() => snapshot())).progress.fieldLead).toEqual(chosen.progress.fieldLead); await next();
        if (count === 13) throw Error('Destination routing did not converge.');
      }
      const ready = await page.evaluate(() => snapshot()), expected = ready.progress.balance.map((n, i) => n + target.reward[i] + ready.progress.bonus[i] + lead.reward[i]);
      await page.locator('[data-ready-move="' + lead.targetId + '"]').click(); await expect(page.locator('[data-forecast-lead]')).toBeVisible();
      await expect(page.locator('[data-tabletop-forecast]')).toContainText(amounts(base, expected)); expect(await page.evaluate(() => snapshot())).toEqual(ready);
      await page.locator('[data-planning-sandbox]>summary').click(); await page.locator('[data-sandbox-start]').click(); await page.locator('[data-sandbox-add="' + lead.targetId + '"]').click();
      await expect(page.locator('[data-sandbox-step="' + lead.targetId + '"]')).toContainText('Supplies after this move: ' + amounts(base, expected)); expect(await page.evaluate(() => snapshot())).toEqual(ready);
      await scan('destination forecast and sandbox agree without awarding future chance'); await page.locator('[data-sandbox-inspect]').click();
      await page.locator('[data-board-move="' + lead.targetId + '"]').click(); await answer(lead.targetId, true);
      const failed = await page.evaluate(() => snapshot());
      expect(failed.progress.balance).toEqual(ready.progress.balance); expect(failed.progress.fieldLead).toEqual(chosen.progress.fieldLead); expect(failed.progress.fieldDeliveries).toHaveLength(0);
      await resume(); await page.locator('[data-board-retry]').click(); await answer(lead.targetId);
      const delivered = await page.evaluate(() => snapshot());
      expect(delivered.progress.balance).toEqual(expected); expect(delivered.progress.fieldLead).toBeNull(); expect(delivered.progress.fieldDeliveries).toHaveLength(1);
      expect(delivered.progress.fieldDeliveries[0]).toMatchObject({gain: lead.reward, kind: 'destination', targetId: lead.targetId});
      await expect(page.locator('[data-field-delivery]')).toContainText(target.name); await expect(page.locator('[data-expedition-destination-marker],[data-tabletop-destination]')).toHaveCount(0);
      await scan('target retry pays reserved destination reward once'); await page.locator('[data-field-panel]').screenshot({path: path.join(out, name + '-destination-delivery.png')});
      await resume(); expect(await page.evaluate(() => snapshot())).toEqual(delivered); await next();
      const beforeTravel = await page.evaluate(() => snapshot()), travelId = await page.evaluate(() => {const e = AlloModules.LessonBoardEngine, progress = snapshot().progress; return progress.visited.find(id => id !== progress.position && e.routeTo(qaBoard, progress, id)?.length <= 4);});
      await move(travelId); const later = await page.evaluate(() => snapshot());
      expect(later.progress.balance).toEqual(beforeTravel.progress.balance); expect(later.progress.fieldDeliveries).toHaveLength(1); await expect(page.locator('[data-field-delivery]')).toHaveCount(0);
      await scan('later travel cannot reclaim destination reward');
      results.push({...scenario, candidates: initial.offer.leads, selected: lead, candidateSelectionAndInspectionAreReadOnly: true, explicitCommitment: true, persistedAcrossResume: true, survivesTravelBuildOtherInvestigationAndFailure: true, targetForecastAndSandboxMatch: true, targetRewardExactlyOnce: true, balanceAfterDelivery: delivered.progress.balance, scans}); await context.close();
    }
    expect(errors).toEqual([]);
    for (const file of ['browser-failure.json', 'failure-1440.png', 'failure-390.png', 'failure-320.png']) {const oldFailure = path.join(out, file); if (fs.existsSync(oldFailure)) fs.unlinkSync(oldFailure);}
    fs.writeFileSync(path.join(out, focusOnly ? 'browser-focus-verification.json' : 'browser-verification.json'), JSON.stringify({passed: true, scope: focusOnly ? 'Production bundle. Focus-view destination inspection exposes the 3D tabletop without committing the draft or changing the run. No live service.' : 'Production bundle. A legal engine-played fixture seeds the save; destination selection, inspection, commitment, planning, travel, investigations, construction, retry and resume use the UI. Later dice fixed to 1. No live service.', bundleSha256, results, errors}, null, 2));
    console.log(JSON.stringify({passed: true, out, scenarios: results.length, scans: results.reduce((sum, r) => sum + r.scans.length, 0)}));
  } catch (error) {
    for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({path: path.join(out, 'failure-' + page.viewportSize().width + '.png'), fullPage: true}).catch(() => {});
    fs.writeFileSync(path.join(out, 'browser-failure.json'), JSON.stringify({message: error.stack, results, errors}, null, 2)); throw error;
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
