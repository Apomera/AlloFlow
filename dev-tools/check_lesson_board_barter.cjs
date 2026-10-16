const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {chromium} = require('playwright'), {expect} = require('@playwright/test');
const {makeBoard, source} = require('./fixtures/lesson_board.cjs');
const out = path.resolve('reports/lesson-board-barter-2026-10-14');
fs.mkdirSync(out, {recursive:true});
const bundle = fs.readFileSync('lesson_board_module.js', 'utf8');
const bundleSha256 = crypto.createHash('sha256').update(bundle).digest('hex');
const helpers = require('esbuild').buildSync({stdin:{
  contents:"export {saveBoard,saveSolo,readSolo,soloWorkspace} from './lesson_board_storage.js';",resolveDir:process.cwd()
},bundle:true,write:false,format:'iife',globalName:'BarterQA'}).outputFiles[0].text;
const html = '<!doctype html><html lang="en"><head><title>Expedition barter verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
const cases = [
  {width:1440,theme:'river',die:8,trade:'trade:0',project:'network'},
  {width:390,theme:'garden',die:18,trade:'trade:1',project:'research'},
  {width:320,theme:'space',die:8,trade:'trade:0',project:'network'},
  {width:390,theme:'workshop',die:7,trade:'trade:1',insufficient:true},
  {width:320,theme:'archive',die:3,noTrade:true},
  {width:320,theme:'workshop',die:13,noTrade:true},
  {width:320,theme:'archive',die:8,noChance:true}
];
const preflight = process.env.BARTER_PREFLIGHT === '1';

(async () => {
  const browser = await chromium.launch({headless:true}), results = [], errors = [];
  try {
    for (const scenario of preflight ? cases.slice(0,1) : cases) {
      const {width,theme,die} = scenario, name = width+'-'+theme+(scenario.insufficient?'-limited':'');
      console.log('Checking '+name+' (die '+die+')');
      const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}), page = await context.newPage();
      page.setDefaultTimeout(20000);page.on('pageerror',error => errors.push(error.message));
      await page.route('http://barter.test/**',route => route.fulfill({contentType:'text/html',body:html}));
      await page.goto('http://barter.test/');
      for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',require.resolve('axe-core/axe.min.js')]) await page.addScriptTag({path:file});
      await page.addScriptTag({content:bundle});await page.addScriptTag({content:helpers});
      const fixture = makeBoard(), base = {...fixture,theme,playStyle:'tabletop',goal:'expedition',travelLimit:3,...(!scenario.noChance?{chance:true}:{}),
        // Both the printed cost and existing construction substitutions are
        // unaffordable until the selected barter direction is committed.
        projects:fixture.projects.map(project => project.id==='research'?{...project,cost:[6,2]}:project.id==='network'?{...project,cost:[3,4]}:project),
        locations:fixture.locations.map(node => scenario.insufficient&&['heater','cloud'].includes(node.id)?{...node,reward:[0,1]}:node)};
      await page.evaluate(({base,source,die}) => {
        const e = AlloModules.LessonBoardEngine;
        Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:buffer => {buffer.fill(0);return buffer;}});
        window.qaBoard=e.prepareBoard(base,source);let run=e.emptyRun();
        for (const [index,id] of ['heater','cloud'].entries()) {
          run=e.merge(run,e.begin(qaBoard,run,id));const node=qaBoard.locations.find(n => n.id===id);
          run=e.merge(run,e.processAction(qaBoard,run,{attemptId:'qa',turn:run.turn,requestId:e.requestId(run),kind:'answer',targetId:id,value:e.solution(node)},'solo',{attemptId:'qa',active:true}));
          run=e.merge(run,e.resolve(qaBoard,run,{solo:{}},{dice:[index?die:1,1]}));
          if (!index) run=e.merge(run,e.advance(qaBoard,run));
        }
        BarterQA.saveBoard(localStorage,source,'English',qaBoard);
        const saved=BarterQA.saveSolo(localStorage,qaBoard,'barter-qa','u',{run,workspace:BarterQA.soloWorkspace(qaBoard,run)});
        if (saved.status!=='saved') throw Error('Could not seed a legal saved barter encounter.');
        window.snapshot=() => {const run=BarterQA.readSolo(localStorage,qaBoard,'barter-qa','u').run;return {run,progress:e.derive(qaBoard,run),offer:e.fieldOpportunity(qaBoard,run)};};
        window.qaRoot=ReactDOM.createRoot(document.getElementById('root'));
        qaRoot.render(React.createElement(AlloModules.LessonBoardSetup,{inputText:source,appId:'barter-qa',user:{uid:'u'},allowLive:false,t:key=>key,onClose(){},callGemini(){throw Error('QA must not call a provider.');}}));
      },{base,source,die});
      const scans=[];
      const scan=async label => {
        const violations=await page.evaluate(async () => (await axe.run(document.getElementById('root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v => ({id:v.id,targets:v.nodes.map(n => n.target)})));
        const overflow=await page.evaluate(() => document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current,[data-tabletop-encounters],[data-field-panel],[data-field-trade-offer]')].some(n => n.scrollWidth>n.clientWidth+1));
        expect(violations,label).toEqual([]);expect(overflow,label+' overflow').toBe(false);scans.push({label,violations,overflow});
      };
      const unchanged=async before => expect(await page.evaluate(() => snapshot())).toEqual(before);
      const resume=async () => {
        const before=await page.evaluate(() => snapshot());await page.locator('[data-tabletop-game-menu]>summary').click();
        await page.getByRole('button',{name:'Back to board setup',exact:true}).click();await page.locator('[data-board-play-solo]').click();await unchanged(before);
      };
      const shoot=async (locator,suffix) => {
        const height=Math.min(3400,Math.max(1200,Math.ceil((await locator.boundingBox()).height)+100));
        await page.setViewportSize({width,height});await locator.screenshot({path:path.join(out,name+'-'+suffix+'.png')});await page.setViewportSize({width,height:1000});
      };
      const move=async id => {await page.locator('[data-ready-move="'+id+'"]').click();await page.locator('[data-board-move="'+id+'"]').click();};
      const answer=async id => {
        const node=base.locations.find(n => n.id===id);
        if (node.kind==='choice') await page.locator('.lb-current [data-board-choice]').selectOption(String(node.answer));
        else if (node.kind==='settings') for (const [index,control] of node.controls.entries()) await page.locator('.lb-current [data-board-control="'+index+'"]').selectOption(String(control.answer));
        else if (node.kind==='order') for (const [index,item] of node.order.entries()) {
          let at=await page.locator('.lb-current .lb-order li').evaluateAll((rows,text) => rows.findIndex(li => li.querySelector('span').textContent.endsWith(text)),node.items[item]);
          while (at>index) {await page.locator('.lb-current [data-board-up="'+item+'"]').click();at--;}
        } else throw Error('Unsupported barter QA response '+node.kind);
        await page.locator('[data-board-submit]').click();
      };
      await page.locator('[data-board-play-solo]').click();await page.locator('[data-board-tabletop]').click();
      const initial=await page.evaluate(() => snapshot());
      if (scenario.noChance) {
        expect(initial.offer).toBeNull();await expect(page.locator('[data-field-trade-offer],[data-field-trade-receipt],[data-tabletop-trade],[data-tabletop-encounters]')).toHaveCount(0);
        await scan('fortune disabled keeps barter and deck absent');await resume();await scan('fortune disabled resume');
        results.push({...scenario,noChanceCompatible:true,scans});await context.close();continue;
      }
      await expect(page.locator('[data-field-encounter]')).toBeVisible();
      const deck=page.locator('[data-open-tabletop-deck]');
      await expect(deck).toHaveRole('button');await deck.focus();await page.keyboard.press(width===390?'Space':'Enter');
      await expect(page.locator('[data-field-panel]')).toBeFocused();await unchanged(initial);
      await scan('physical encounter deck opens saved card with keyboard focus');
      if (width===1440) {
        for (const view of ['Board view','Location list']) {
          await page.getByRole('button',{name:view,exact:true}).click();await deck.focus();await page.keyboard.press('Enter');
          await expect(page.locator('[data-field-panel]')).toBeFocused();await unchanged(initial);await scan(view+' keeps encounter deck and readable barter availability');
        }
        await page.locator('[data-board-tabletop]').click();
      }
      if (scenario.noTrade) {
        expect(initial.offer.trades||[]).toHaveLength(0);await expect(page.locator('[data-field-trade-offer],[data-tabletop-trade]')).toHaveCount(0);
        await page.locator('[data-field-choice="collect"]').click();await resume();await scan('non barter family keeps ordinary saved choice');
        results.push({...scenario,barterAbsentOutsideThemedFamilies:true,keyboardDeckFocus:true,scans});await context.close();continue;
      }
      expect(['supplies','rendezvous']).toContain(initial.offer.id);expect(initial.offer.trades).toHaveLength(2);
      await page.locator('[data-field-trade-offer]>summary').click();
      await expect(page.locator('[data-field-trade-option]')).toHaveCount(2);
      for (const trade of initial.offer.trades) {
        const radio=page.locator('[data-field-trade-option="'+trade.id+'"]');
        if (!trade.legal) {await expect(radio).toBeDisabled();continue;}
        await radio.check();await unchanged(initial);
        for (const [index,value] of trade.after.entries()) await expect(page.locator('[data-field-trade-preview] [data-trade-after="'+index+'"]').first()).toHaveText(String(value));
      }
      if (scenario.insufficient) {expect(initial.progress.balance[0]).toBe(0);expect(initial.offer.trades.find(item => item.id==='trade:0').reason).toBe('insufficient');}
      const trade=initial.offer.trades.find(item => item.id===scenario.trade);expect(trade.legal).toBe(true);
      await page.locator('[data-field-trade-option="'+trade.id+'"]').check();await unchanged(initial);
      if (scenario.project) {
        await page.locator('[data-trade-project="'+scenario.project+'"]').click();
        await expect(page.locator('[data-board-inspection]')).toContainText(base.projects.find(project => project.id===scenario.project).name);
        await unchanged(initial);
      }
      await scan('both resource directions preview without payment');await shoot(page.locator('[data-field-trade-offer]'),'barter-offer');
      await shoot(page.locator('[data-tabletop-encounters]'),'barter-deck');
      await page.evaluate(() => document.body.classList.add('dark'));await scan('dark barter choices and tactile deck');
      if (width===1440) await shoot(page.locator('[data-field-trade-offer]'),'dark-barter-offer');
      await page.evaluate(() => document.body.classList.remove('dark'));await page.emulateMedia({forcedColors:'active'});await scan('forced colors barter choices and tactile deck');await page.emulateMedia({forcedColors:'none'});
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      await resume();await page.locator('[data-field-trade-offer]>summary').click();await page.locator('[data-field-trade-option="'+trade.id+'"]').check();await unchanged(initial);
      if (scenario.project) expect(await page.evaluate(id => AlloModules.LessonBoardEngine.constructionFunding(qaBoard,snapshot().run,id).some(option => option.legal),scenario.project)).toBe(false);
      await page.locator('[data-field-trade-commit]').focus();await page.keyboard.press('Enter');
      const traded=await page.evaluate(() => snapshot());
      expect(traded.run.turn).toBe(initial.run.turn);expect(traded.progress.position).toBe(initial.progress.position);
      expect(traded.run.steps.t1.result.dice).toEqual(initial.run.steps.t1.result.dice);
      expect(traded.run.steps.t1.result.fieldChoice).toBe(trade.id);expect(traded.progress.balance).toEqual(trade.after);
      expect(traded.progress.balance).toEqual(initial.progress.balance.map((value,index) => value-trade.cost[index]+trade.gain[index]));
      expect(traded.progress.built).toEqual([]);expect(traded.offer.pending).toBe(false);expect(traded.offer.selectedTrade).toBeTruthy();
      await expect(page.locator('[data-field-trade-receipt]')).toBeVisible();await expect(page.locator('[data-field-receipt]>h4')).toBeFocused();
      await expect(page.locator('[data-field-trade-commit],[data-field-choice]')).toHaveCount(0);
      await scan('explicit barter changes supplies once and focuses receipt');await shoot(page.locator('[data-field-encounter]'),'barter-receipt');
      if (scenario.project) {
        expect(await page.evaluate(id => AlloModules.LessonBoardEngine.constructionFunding(qaBoard,snapshot().run,id).some(option => option.legal),scenario.project)).toBe(true);
        await page.locator('[data-next-project="'+scenario.project+'"]').click();await expect(page.locator('[data-board-inspection]')).toContainText(base.projects.find(project => project.id===scenario.project).name);await unchanged(traded);
        await scan('new construction is inspectable without building or paying');
      }
      await resume();await unchanged(traded);await page.locator('[data-board-next]').click();await move('heater');
      expect((await page.evaluate(() => snapshot())).progress.balance).toEqual(trade.after);
      await page.locator('[data-board-next]').click();await move('river');await answer('river');
      const later=await page.evaluate(() => snapshot());expect(later.progress.balance).toEqual(trade.after.map((value,index) => value+base.locations.find(node => node.id==='river').reward[index]));
      expect(later.progress.fieldEvents.filter(event => event.choice===trade.id)).toHaveLength(1);
      await resume();await scan('resume travel and investigation cannot repeat barter');
      results.push({...scenario,encounter:initial.offer.id,initialBalance:initial.progress.balance,trade,balanceAfter:traded.progress.balance,draftsLeaveRunUnchanged:true,keyboardDeckFocus:true,explicitCommitmentUsesNoMove:true,receiptFocus:true,paymentAndGainExactlyOnce:true,newConstructionInspectOnly:!!scenario.project,persistedAcrossResume:true,scans});
      await context.close();
    }
    expect(errors).toEqual([]);
    for (const file of ['browser-failure.json','failure-1440.png','failure-390.png','failure-320.png']) {const failure=path.join(out,file);if(fs.existsSync(failure))fs.unlinkSync(failure);}
    fs.writeFileSync(path.join(out,preflight?'browser-preflight-verification.json':'browser-verification.json'),JSON.stringify({passed:true,preflight,scope:(preflight?'Provisional desktop visual preflight. Final frozen-bundle verification remains pending. ':'Frozen production bundle. ')+'Legal engine-played saved solo fixtures. Resource direction previews, keyboard deck and commitment, construction inspection, save/resume, travel and investigation use real UI. Later dice fixed to 1. No live AI or classroom services.',bundleSha256,bundleBytes:Buffer.byteLength(bundle),results,errors},null,2));
    console.log(JSON.stringify({passed:true,preflight,out,scenarios:results.length,scans:results.reduce((sum,result) => sum+result.scans.length,0)}));
  } catch (error) {
    for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({path:path.join(out,'failure-'+page.viewportSize().width+'.png')}).catch(() => {});
    fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({message:error.stack,results,errors},null,2));throw error;
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
