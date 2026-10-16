const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {chromium} = require('playwright'), {expect} = require('@playwright/test');
const {makeBoard, source} = require('./fixtures/lesson_board.cjs');

const out = path.resolve('reports/lesson-board-commissions-2026-10-15');
fs.mkdirSync(out, {recursive: true});
const bundle = fs.readFileSync('lesson_board_module.js', 'utf8');
const bundleSha256 = crypto.createHash('sha256').update(bundle).digest('hex');
const bundleBytes = Buffer.byteLength(bundle);
const helpers = require('esbuild').buildSync({stdin: {
  contents: "export {saveBoard,saveSolo,readSolo,soloWorkspace} from './lesson_board_storage.js';",
  resolveDir: process.cwd(),
}, bundle: true, write: false, format: 'iife', globalName: 'CommissionQA'}).outputFiles[0].text;
const html = '<!doctype html><html lang="en"><head><title>Construction commissions verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
const scripts = ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', require.resolve('axe-core/axe.min.js')];
const scenarios = [
  {width: 1440, theme: 'river', die: 6, target: 'research', wrongBuild: 'bridge'},
  {width: 390, theme: 'garden', die: 16, target: 'bridge'},
  {width: 320, theme: 'space', die: 6, target: 'bridge', wrongBuild: 'research'},
];

(async () => {
  const browser = await chromium.launch({headless: true}), results = [], errors = [];
  const checkpoint = status => fs.writeFileSync(path.join(out, 'browser-progress.json'), JSON.stringify({status, updatedAt: new Date().toISOString(), bundleSha256, bundleBytes, results, errors}, null, 2));
  try {
    for (const scenario of scenarios) {
      const {width, theme, die, target, wrongBuild} = scenario, name = width + '-' + theme;
      console.log('Checking construction commission ' + name);
      checkpoint('running ' + name);
      const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => errors.push(error.message));
      await page.route('http://commissions.test/**', route => route.fulfill({contentType: 'text/html', body: html}));
      await page.goto('http://commissions.test/');
      const addScripts = async () => {
        for (const file of scripts) await page.addScriptTag({path: file});
        await page.addScriptTag({content: bundle});
        await page.addScriptTag({content: helpers});
      };
      await addScripts();
      const base = {...makeBoard(), theme, playStyle: 'tabletop', goal: 'expedition', travelLimit: 3, chance: true, expeditionKit: 'builder'};
      await page.evaluate(({base, source, die}) => {
        const e = AlloModules.LessonBoardEngine;
        Object.defineProperty(crypto, 'getRandomValues', {configurable: true, value: buffer => {buffer.fill(0); return buffer;}});
        window.qaBoard = e.prepareBoard(base, source);
        let run = e.emptyRun();
        const moves = ['heater', 'cloud', 'rain', 'sequence', 'cloud', 'river'];
        for (const [index, id] of moves.entries()) {
          run = e.merge(run, e.begin(qaBoard, run, id));
          const step = e.stepOf(run);
          if (!['answer', 'review'].includes(step.phase) || step.targetId !== id) throw Error('Illegal seeded action: ' + id);
          if (step.phase === 'answer') {
            const node = qaBoard.locations.find(node => node.id === id);
            run = e.merge(run, e.processAction(qaBoard, run, {attemptId: 'qa', turn: run.turn, requestId: e.requestId(run), kind: 'answer', targetId: id, value: e.solution(node)}, 'solo', {attemptId: 'qa', active: true}));
            run = e.merge(run, e.resolve(qaBoard, run, {solo: {}}, {dice: [index === moves.length - 1 ? die : 1, 1]}));
          }
          if (index < moves.length - 1) {
            if (e.fieldOpportunity(qaBoard, run)?.pending) run = e.merge(run, e.chooseFieldOpportunity(qaBoard, run, 'crew'));
            run = e.merge(run, e.advance(qaBoard, run));
          }
        }
        const p = e.derive(qaBoard, run), offer = e.fieldOpportunity(qaBoard, run);
        if (p.visited.length !== 5 || p.built.length || p.position !== 'river' || p.kitCount || !p.fieldCrew || !offer?.pending || !offer.canCommission) throw Error('Legal commission fixture did not reach its intended state.');
        CommissionQA.saveBoard(localStorage, source, 'English', qaBoard);
        const saved = CommissionQA.saveSolo(localStorage, qaBoard, 'commission-qa', 'u', {run, workspace: CommissionQA.soloWorkspace(qaBoard, run)});
        if (saved.status !== 'saved') throw Error('Could not seed legal commission encounter.');
      }, {base, source, die});
      const mount = async () => page.evaluate(({base, source}) => {
        const e = AlloModules.LessonBoardEngine;
        window.qaBoard = e.prepareBoard(base, source);
        window.snapshot = () => {
          const run = CommissionQA.readSolo(localStorage, qaBoard, 'commission-qa', 'u').run;
          return {run, progress: e.derive(qaBoard, run), offer: e.fieldOpportunity(qaBoard, run)};
        };
        window.qaRoot = ReactDOM.createRoot(document.getElementById('root'));
        qaRoot.render(React.createElement(AlloModules.LessonBoardSetup, {inputText: source, appId: 'commission-qa', user: {uid: 'u'}, allowLive: false, t: key => key, onClose() {}, callGemini() {throw Error('QA must not call a provider.');}}));
      }, {base, source});
      await mount();
      const scans = [], builds = [], map = page.locator('[data-spatial-board]').first();
      const read = () => page.evaluate(() => snapshot());
      const unchanged = async before => expect(await read()).toEqual(before);
      const open = async () => {await page.locator('[data-board-play-solo]').click(); await page.locator('[data-board-tabletop]').click();};
      const reload = async () => {
        const before = await read();
        await page.reload(); await addScripts(); await mount(); await open(); await unchanged(before);
      };
      const scan = async label => {
        const violations = await page.evaluate(async () => (await axe.run(document.getElementById('root'), {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}})).violations.map(v => ({id: v.id, targets: v.nodes.map(n => n.target)})));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || [...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current,[data-field-panel],[data-field-commission-offer],[data-tabletop-encounters],[data-tabletop-forecast]')].some(n => n.scrollWidth > n.clientWidth + 1));
        const overlaps = await page.evaluate(() => [...document.querySelectorAll('[data-spatial-board]')].filter(board => board.dataset.spatialView !== 'list' && board.dataset.zoom === 'fit' && board.getBoundingClientRect().height > 0).flatMap(board => {
          const projects = [...board.querySelectorAll('[data-map-construction]')], locations = [...board.querySelectorAll('[data-location]')];
          return projects.flatMap(project => locations.flatMap(location => {
            const a = project.getBoundingClientRect(), b = location.getBoundingClientRect(), width = Math.min(a.right, b.right) - Math.max(a.left, b.left), height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
            return width > 1 && height > 1 ? [{view: board.dataset.spatialView, project: project.dataset.mapConstruction, location: location.dataset.location, width, height}] : [];
          }));
        }));
        expect(violations, label).toEqual([]); expect(overflow, label + ' overflow').toBe(false); expect(overlaps, label + ' project/location overlap').toEqual([]);
        scans.push({label, violations, overflow, overlaps});
      };
      const shoot = async (locator, suffix) => {
        const height = Math.min(3400, Math.max(1200, Math.ceil((await locator.boundingBox()).height) + 100));
        await page.setViewportSize({width, height});
        await locator.screenshot({path: path.join(out, name + '-' + suffix + '.png')});
        await page.setViewportSize({width, height: 1000});
      };
      const counters = async values => {
        for (const [i, value] of values.entries()) {
          const counter = page.locator('[data-board-mission] [data-resource-counter="' + i + '"]');
          await expect(counter.locator('[data-resource-count="' + i + '"]')).toHaveText(String(value));
          await expect(counter.locator('[data-resource-stack="' + i + '"]')).toHaveAttribute('data-stack-pieces', String(Math.min(4, value)));
        }
      };
      const select = async id => page.locator('[data-ready-move="' + id + '"]').click();
      const commit = async id => {await page.locator('[data-board-move="' + id + '"]').focus(); await page.keyboard.press('Enter');};
      const next = async () => page.locator('[data-board-next]').click();
      const records = state => state.progress.fieldDeliveries.filter(item => item.kind === 'commission');
      const forecast = async (before, spent, gain, after) => {
        for (const [i, amount] of before.entries()) {
          const row = page.locator('.lb-current [data-tabletop-forecast] [data-resource-forecast-row="' + i + '"]');
          await expect(row.locator('[data-resource-before="' + i + '"]')).toHaveText(String(amount));
          await expect(row.locator('[data-resource-after="' + i + '"]')).toHaveText(String(after[i]));
          await expect(row.locator('[data-resource-cost="' + i + '"]')).toHaveText('Pay first −' + spent[i]);
          if (gain[i]) await expect(row.locator('[data-resource-gain="' + i + '"]')).toHaveText('Receive after payment +' + gain[i]);
          else await expect(row.locator('[data-resource-gain="' + i + '"]')).toHaveCount(0);
        }
      };

      await open();
      const initial = await read();
      expect(initial.offer.id).toBe(die === 6 ? 'supplies' : 'rendezvous');
      expect(initial.offer.commissions).toHaveLength(2);
      const commission = initial.offer.commissions.find(option => option.projectId === target);
      expect(commission).toBeTruthy();
      expect(commission.reward.reduce((sum, n) => sum + n, 0)).toBe(4);
      await counters(initial.progress.balance);
      const printedCacheGeometry = await map.locator('[data-resource-cache] [data-resource-index]').evaluateAll(nodes => nodes.map(node => {const style = getComputedStyle(node); return {width: parseFloat(style.width), height: parseFloat(style.height)};}));
      expect(printedCacheGeometry.length).toBeGreaterThan(0);
      expect(printedCacheGeometry.every(size => size.width <= 24 && size.height <= 18)).toBe(true);
      await reload(); await unchanged(initial);
      await scan('full reload preserves pending commission offers and existing crew');

      const deck = page.locator('[data-open-tabletop-deck]');
      await deck.focus(); await page.keyboard.press('Enter');
      await expect(page.locator('[data-field-panel]')).toBeFocused();
      await page.locator('[data-field-commission-offer]>summary').click();
      for (const option of initial.offer.commissions) {
        const radio = page.locator('[data-field-commission-option="' + option.projectId + '"]');
        await radio.focus(); await page.keyboard.press('Space'); await expect(radio).toBeChecked();
        await expect(page.locator('[data-field-commission-preview="' + option.projectId + '"]')).toBeVisible();
        await page.locator('[data-field-commission-preview="' + option.projectId + '"] [data-commission-inspect="' + option.projectId + '"]').click();
        await expect(page.locator('[data-board-inspection]')).toContainText(base.projects.find(project => project.id === option.projectId).name);
        await unchanged(initial);
      }
      await page.locator('[data-field-commission-option="' + target + '"]').check();
      await expect(page.locator('[data-field-commission-preview="' + target + '"] [data-commission-position]')).toHaveAttribute('data-commission-position', 'travel');
      await expect(page.locator('[data-field-commission-preview="' + target + '"] [data-commission-crew]')).toBeVisible();
      const rewardAmountGeometry = await page.locator('[data-field-commission-offer] .lb-commission-options .lb-token').evaluateAll(tokens => tokens.map(token => {
        const nodes = [...token.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        const rects = nodes.flatMap(node => {const range = document.createRange(); range.selectNodeContents(node); return [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);});
        const lines = [];
        for (const rect of rects) if (!lines.some(top => Math.abs(top - rect.top) <= 1)) lines.push(rect.top);
        return {amount: nodes.map(node => node.textContent.trim()).join(''), lineCount: lines.length};
      }));
      expect(rewardAmountGeometry).toHaveLength(initial.offer.commissions.length * 2);
      expect(rewardAmountGeometry.every(amount => /^\+\d+$/.test(amount.amount) && amount.lineCount === 1), 'each commission reward sign and number share one rendered line').toBe(true);
      await scan('keyboard project drafts and inspection leave saved state and supplies unchanged');
      await shoot(page.locator('[data-field-commission-offer]'), 'offer');
      await page.evaluate(() => document.body.classList.add('dark')); await scan('dark commission offers');
      if (width === 1440) await shoot(page.locator('[data-field-commission-offer]'), 'dark-offer');
      await page.evaluate(() => document.body.classList.remove('dark'));
      await page.emulateMedia({forcedColors: 'active'}); await scan('forced colors commission choices'); await page.emulateMedia({forcedColors: 'none'});
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      await unchanged(initial);
      await page.locator('[data-field-commission-commit]').focus(); await page.keyboard.press('Enter');
      const accepted = await read();
      expect(accepted.run.turn).toBe(initial.run.turn);
      expect(accepted.progress.balance).toEqual(initial.progress.balance);
      expect(accepted.progress.position).toBe(initial.progress.position);
      expect(accepted.progress.fieldCrew).toEqual(initial.progress.fieldCrew);
      expect(accepted.run.steps['t' + initial.run.turn].result.dice).toEqual(initial.run.steps['t' + initial.run.turn].result.dice);
      expect(accepted.run.steps['t' + initial.run.turn].result.fieldChoice).toBe('commission:' + target);
      expect(accepted.offer.selectedCommission).toEqual(commission);
      expect(accepted.progress.fieldCommission).toMatchObject({turn: initial.run.turn, id: initial.offer.id, projectId: target, reward: commission.reward});
      expect(records(accepted)).toEqual([]);
      await expect(page.locator('[data-field-commission-receipt]')).toBeVisible();
      await expect(page.locator('[data-field-receipt]>h4')).toBeFocused();
      await expect(page.locator('[data-field-commission-commit]')).toHaveCount(0);
      await scan('explicit acceptance saves a commission without a move, payment, reward, or reroll');
      await shoot(page.locator('[data-field-commission-receipt]'), 'accepted');
      await reload(); await unchanged(accepted);
      await scan('full reload preserves active commission and its acceptance receipt');

      const marker = () => map.locator('[data-commission-marker="' + target + '"]');
      const activeRail = page.locator('[data-tabletop-commission="' + target + '"]');
      await expect(marker()).toHaveCount(1); await expect(activeRail).toBeVisible();
      await expect(page.locator('[data-tabletop-encounters]')).toHaveAttribute('data-encounter-compact', 'true');
      await expect(activeRail.locator('[data-tabletop-commitment-details="commission"]')).not.toHaveAttribute('open', '');
      await expect(activeRail.locator('[data-inspect-tabletop-commission="' + target + '"]')).toBeVisible();
      if (width <= 600) expect(await page.locator('[data-tabletop-encounters]').evaluate(node => getComputedStyle(node).display)).toBe('block');
      for (const view of ['Board view', 'Location list']) {
        await page.getByRole('button', {name: view, exact: true}).click();
        await page.locator('[data-inspect-tabletop-commission="' + target + '"]').click();
        const project = map.locator('[data-map-construction="' + target + '"]');
        await expect(project).toHaveAttribute('data-commission-project', 'true');
        await expect(project).toHaveAccessibleName(/commission/i);
        await expect(map.locator('[data-commission-detail="' + target + '"]')).toBeVisible();
        if (view === 'Location list') await expect(map.locator('[data-commission-list="' + target + '"]')).toBeVisible();
        else await expect(marker()).toHaveCount(1);
        await unchanged(accepted); await scan(view + ' identifies the commissioned project without moving');
      }
      await page.locator('[data-board-tabletop]').click();
      await page.locator('[data-inspect-tabletop-commission="' + target + '"]').focus(); await page.keyboard.press('Enter');
      await expect(marker()).toHaveCount(1); await unchanged(accepted);
      await scan('3D project seal and compact commitment rail keep inspection accessible');
      await shoot(map, 'commissioned-tabletop'); await shoot(page.locator('[data-tabletop-encounters]'), 'active-rail');
      await page.evaluate(() => document.body.classList.add('dark')); await scan('dark commissioned project and rail');
      if (width === 1440) await shoot(map, 'dark-commissioned-tabletop');
      await page.evaluate(() => document.body.classList.remove('dark'));
      await page.emulateMedia({forcedColors: 'active'}); await scan('forced colors commission seal and rail'); await page.emulateMedia({forcedColors: 'none'});
      await next();
      await expect(page.locator('[data-field-commission-reminder]')).toBeVisible();
      await select('heater'); await commit('heater');
      const home = await read();
      expect(home.progress.position).toBe('heater'); expect(home.progress.balance).toEqual(accepted.progress.balance);
      expect(home.progress.fieldCommission).toEqual(accepted.progress.fieldCommission); expect(records(home)).toEqual([]);
      await next();

      const build = async (id, paysCommission, suffix) => {
        const before = await read(), project = base.projects.find(project => project.id === id);
        await select(id); await page.locator('.lb-current [data-funding-option="standard"] input').check();
        if (project.effect.kind === 'yield') {
          const stamps = map.locator('[data-location] [data-production-stamp]');
          expect(await stamps.count()).toBeGreaterThan(0);
          const sizes = await stamps.evaluateAll(nodes => nodes.map(node => {const style = getComputedStyle(node); return {width: parseFloat(style.width), height: parseFloat(style.height)};}));
          expect(sizes.every(size => size.width <= 40 && size.height <= 25), 'inline production stamps retain their existing compact geometry').toBe(true);
        }
        const crewGain = before.progress.fieldCrew?.reward || [0, 0], kitGain = before.progress.kitCount < 2 ? [0, 2] : [0, 0];
        const gain = crewGain.map((amount, i) => amount + kitGain[i] + (paysCommission ? commission.reward[i] : 0));
        const after = before.progress.balance.map((amount, i) => amount - project.cost[i] + gain[i]);
        await forecast(before.progress.balance, project.cost, gain, after);
        if (paysCommission) await expect(page.locator('.lb-current [data-forecast-commission]')).toBeVisible();
        else await expect(page.locator('.lb-current [data-forecast-commission]')).toHaveCount(0);
        await unchanged(before); await scan(suffix + ' forecast keeps full payment separate from eligible rewards');
        await shoot(page.locator('.lb-current [data-tabletop-forecast]'), suffix + '-forecast');
        await commit(id);
        const built = await read();
        expect(built.progress.balance).toEqual(after); expect(built.progress.built).toContain(id);
        expect(built.progress.position).toBe('heater'); expect(built.progress.fieldCrew).toBeNull();
        expect(built.progress.kitCount).toBe(Math.min(2, before.progress.kitCount + 1));
        await counters(after);
        builds.push({id, spent: project.cost, crewGain, kitGain, commissionGain: paysCommission ? commission.reward : [0, 0], before: before.progress.balance, after});
        return built;
      };
      if (wrongBuild) {
        const different = await build(wrongBuild, false, 'different-project');
        expect(different.progress.fieldCommission).toEqual(accepted.progress.fieldCommission);
        expect(records(different)).toEqual([]); await expect(marker()).toHaveCount(1);
        await scan('another construction consumes its crew and kit bonus but preserves the named commission');
        await reload(); await unchanged(different); await next();
      }
      const paid = await build(target, true, 'commissioned-project');
      expect(paid.progress.fieldCommission).toBeUndefined(); expect(records(paid)).toHaveLength(1);
      expect(records(paid)[0]).toMatchObject({originTurn: initial.run.turn, kind: 'commission', projectId: target, gain: commission.reward});
      await expect(page.locator('[data-field-delivery-kind="commission"]')).toBeVisible();
      await expect(map.locator('[data-commission-marker]')).toHaveCount(0);
      await expect(page.locator('[data-field-commission-reminder]')).toHaveCount(0);
      await expect(page.locator('[data-tabletop-commission]')).toHaveCount(0);
      await scan('matching paid construction awards the commission once and clears its active seal');
      await shoot(page.locator('[data-field-panel]'), 'commission-paid');
      await shoot(page.locator('[data-board-mission]'), 'actual-after-build');
      await reload(); await unchanged(paid); await counters(paid.progress.balance);
      await expect(page.locator('[data-field-delivery-kind="commission"]')).toBeVisible();
      await scan('full reload preserves paid commission history without repeating its reward');
      await next(); await select('cloud'); await commit('cloud'); await next(); await select('heater'); await commit('heater');
      const later = await read();
      expect(later.progress.balance).toEqual(paid.progress.balance); expect(records(later)).toEqual(records(paid));
      expect(later.progress.fieldCommission).toBeUndefined(); await counters(later.progress.balance);
      await scan('later travel cannot repay the commission or recollect printed supplies');
      await reload(); await unchanged(later);
      results.push({...scenario, encounter: initial.offer.id, commission, initialBalance: initial.progress.balance, paidBalance: paid.progress.balance, draftsAndInspectionNonmutating: true, acceptanceUsesNoMoveOrSupplies: true, savedPendingActiveAndPaid: true, projectMarkerInThreeViews: true, wrongBuildPreservesCommission: wrongBuild ? true : null, matchingPaymentAndStackedRewardsVerified: true, commissionPaidOnce: true, rewardAmountsStayTogether: true, rewardAmountGeometry, printedCacheGeometry, builds, scans});
      checkpoint('completed ' + name);
      await context.close();
    }
    expect(errors).toEqual([]);
    for (const file of ['browser-failure.json', 'failure-1440.png', 'failure-390.png', 'failure-320.png']) {
      const failure = path.join(out, file); if (fs.existsSync(failure)) fs.unlinkSync(failure);
    }
    const report = {passed: true, scope: 'Frozen production bundle. Legal engine-played saved solo fixtures. Pending commission choices, inspection, explicit acceptance, three map views, existing crew and Builder bonuses, full construction payments, unrelated builds, one-time payouts, later travel and full reload use the real UI. No live AI or classroom services exercised.', bundleSha256, bundleBytes, results, errors};
    fs.writeFileSync(path.join(out, 'browser-verification.json'), JSON.stringify(report, null, 2));
    checkpoint('passed');
    console.log(JSON.stringify({passed: true, out, bundleSha256, bundleBytes, scenarios: results.length, scans: results.reduce((sum, result) => sum + result.scans.length, 0)}));
  } catch (error) {
    for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({path: path.join(out, 'failure-' + page.viewportSize().width + '.png')}).catch(() => {});
    fs.writeFileSync(path.join(out, 'browser-failure.json'), JSON.stringify({message: error.stack, bundleSha256, bundleBytes, results, errors}, null, 2));
    checkpoint('failed');
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
