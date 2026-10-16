const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {chromium} = require('playwright'), {expect} = require('@playwright/test');
const {makeBoard, source} = require('./fixtures/lesson_board.cjs');
const out = path.resolve('reports/lesson-board-journeys-2026-10-14');
fs.mkdirSync(out, {recursive: true});
const bundle = fs.readFileSync('lesson_board_module.js', 'utf8');
const bundleSha256 = crypto.createHash('sha256').update(bundle).digest('hex');
const helpers = require('esbuild').buildSync({stdin: {
  contents: "export {saveBoard,saveSolo,readSolo,soloWorkspace} from './lesson_board_storage.js';", resolveDir: process.cwd()
}, bundle: true, write: false, format: 'iife', globalName: 'JourneyQA'}).outputFiles[0].text;
const html = '<!doctype html><html lang="en"><head><title>Destination journey verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
const cases = [{width:1440, theme:'river'}, {width:390, theme:'garden'}, {width:320, theme:'space'}];

(async () => {
  const browser = await chromium.launch({headless:true}), results = [], errors = [];
  try {
    for (const scenario of cases) {
      const {width, theme} = scenario, name = width + '-' + theme;
      const context = await browser.newContext({viewport:{width,height:1000}, reducedMotion:'reduce'}), page = await context.newPage();
      page.setDefaultTimeout(20000); page.on('pageerror', error => errors.push(error.message));
      await page.route('http://journeys.test/**', route => route.fulfill({contentType:'text/html', body:html}));
      await page.goto('http://journeys.test/');
      for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',require.resolve('axe-core/axe.min.js')]) await page.addScriptTag({path:file});
      await page.addScriptTag({content:bundle}); await page.addScriptTag({content:helpers});
      const fixture = makeBoard(), base = {...fixture,theme,playStyle:'tabletop',goal:'expedition',travelLimit:3,chance:true,edges:[...fixture.edges,['cloud','sequence']]};
      await page.evaluate(({base,source}) => {
        const e = AlloModules.LessonBoardEngine;
        Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:buffer => {buffer.fill(0);return buffer;}});
        window.qaBoard = e.prepareBoard(base,source); let run = e.emptyRun();
        // The extra real edge creates a genuine choice: two segments/two
        // investigations, or five segments/one investigation through cleared land.
        for (const [index,id] of ['heater','cloud','river','lake','cooler'].entries()) {
          run = e.merge(run,e.begin(qaBoard,run,id)); const node = qaBoard.locations.find(n => n.id === id);
          run = e.merge(run,e.processAction(qaBoard,run,{attemptId:'qa',turn:run.turn,requestId:e.requestId(run),kind:'answer',targetId:id,value:e.solution(node)},'solo',{attemptId:'qa',active:true}));
          if (index === 4) {
            const waiting = run;
            for (let die=1;die<=20;die++) {
              run = e.merge(waiting,e.resolve(qaBoard,waiting,{solo:{}},{dice:[die,1]}));
              if (e.fieldOpportunity(qaBoard,run)?.leads.some(lead => lead.targetId === 'sequence')) break;
            }
          } else {
            run = e.merge(run,e.resolve(qaBoard,run,{solo:{}},{dice:[1,1]}));
            if (e.fieldOpportunity(qaBoard,run)?.pending) run = e.merge(run,e.chooseFieldOpportunity(qaBoard,run,'collect'));
            run = e.merge(run,e.advance(qaBoard,run));
          }
        }
        JourneyQA.saveBoard(localStorage,source,'English',qaBoard);
        const saved = JourneyQA.saveSolo(localStorage,qaBoard,'journeys-qa','u',{run,workspace:JourneyQA.soloWorkspace(qaBoard,run)});
        if (saved.status !== 'saved') throw Error('Could not seed a legal saved encounter.');
        window.snapshot = () => {const run = JourneyQA.readSolo(localStorage,qaBoard,'journeys-qa','u').run;return {run,progress:e.derive(qaBoard,run),offer:e.fieldOpportunity(qaBoard,run)};};
        window.qaRoot = ReactDOM.createRoot(document.getElementById('root'));
        qaRoot.render(React.createElement(AlloModules.LessonBoardSetup,{inputText:source,appId:'journeys-qa',user:{uid:'u'},allowLive:false,t:key=>key,onClose(){},callGemini(){throw Error('QA must not call a provider.');}}));
      }, {base,source});
      const scans = [];
      const scan = async label => {
        const violations = await page.evaluate(async () => (await axe.run(document.getElementById('root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v => ({id:v.id,targets:v.nodes.map(n => n.target)})));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1 || [...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current,[data-journey],[data-field-panel]')].some(n => n.scrollWidth > n.clientWidth+1));
        expect(violations,label).toEqual([]); expect(overflow,label+' overflow').toBe(false); scans.push({label,violations,overflow});
      };
      const unchanged = async before => expect(await page.evaluate(() => snapshot())).toEqual(before);
      const resume = async () => {
        const before = await page.evaluate(() => snapshot()); await page.locator('[data-tabletop-game-menu]>summary').click();
        await page.getByRole('button',{name:'Back to board setup',exact:true}).click(); await page.locator('[data-board-play-solo]').click(); await unchanged(before);
      };
      const stats = async (planner, values) => {
        for (const [key,value] of Object.entries(values)) await expect(planner.locator('[data-journey-'+key+']')).toHaveText(String(value));
      };
      const shoot = async (locator,suffix) => {
        const height = Math.min(3400,Math.max(1200,Math.ceil((await locator.boundingBox()).height)+100));
        await page.setViewportSize({width,height});await locator.screenshot({path:path.join(out,name+'-'+suffix+'.png')});await page.setViewportSize({width,height:1000});
      };
      const inspectDestination = async () => {await page.locator('[data-inspect-tabletop-destination="sequence"]').click();await expect(page.locator('[data-journey-tabletop="sequence"]')).toBeVisible();};
      const boardPlanner = () => page.locator('[data-journey-tabletop="sequence"] [data-journey="sequence"]');
      const answer = async id => {
        const node = base.locations.find(n => n.id === id);
        if (node.kind === 'settings') for (const [index,control] of node.controls.entries()) await page.locator('.lb-current [data-board-control="'+index+'"]').selectOption(String(control.answer));
        else if (node.kind === 'order') for (const [index,item] of node.order.entries()) {
          let at = await page.locator('.lb-current .lb-order li').evaluateAll((rows,text) => rows.findIndex(li => li.querySelector('span').textContent.endsWith(text)),node.items[item]);
          while (at > index) {await page.locator('.lb-current [data-board-up="'+item+'"]').click();at--;}
        } else throw Error('Unexpected journey fixture challenge');
        await page.locator('[data-board-submit]').click();
      };
      await page.locator('[data-board-play-solo]').click(); await page.getByRole('button',{name:'Board view',exact:true}).click();
      const initial = await page.evaluate(() => snapshot());
      expect(initial.progress.visited).toHaveLength(5); expect(initial.progress.position).toBe('cooler');
      const offer = page.locator('[data-field-lead-offer]'), offeredPlanner = offer.locator('[data-journey="sequence"]');
      await stats(offeredPlanner,{segments:2,investigations:2,turns:2}); await expect(offeredPlanner.locator('[data-journey-next]')).toHaveAttribute('data-journey-next','weather');
      await offeredPlanner.locator('[data-journey-option="discovery"]').click(); await stats(offeredPlanner,{segments:5,investigations:1,turns:2});
      await expect(offeredPlanner.locator('[data-journey-next]')).toHaveAttribute('data-journey-next','heater');
      await offeredPlanner.locator('summary').click(); await expect(offeredPlanner.locator('[data-journey-stop]')).toHaveCount(6); await unchanged(initial);
      await scan('offered route comparison and itinerary leave saved game unchanged'); await shoot(offer,'journey-offer');
      await offeredPlanner.locator('[data-journey-inspect="heater"]').click(); await unchanged(initial);
      await expect(page.locator('[data-spatial-selection]')).toContainText('Heating station'); await expect(page.locator('[data-journey-overlay]')).toHaveCount(0);
      await page.locator('[data-field-lead-option="sequence"]').check(); await page.locator('[data-field-lead-commit]').click();
      const chosen = await page.evaluate(() => snapshot()); expect(chosen.progress.balance).toEqual(initial.progress.balance);expect(chosen.progress.fieldLead.targetId).toBe('sequence');
      await page.locator('[data-board-next]').click(); await page.getByRole('button',{name:'Board view',exact:true}).click(); await inspectDestination();
      const planning = await page.evaluate(() => snapshot()); await stats(boardPlanner(),{segments:2,investigations:2,turns:2});
      await expect(page.locator('[data-journey-overlay="sequence"]')).toHaveAttribute('data-journey-overlay-route','direct');
      await expect(page.locator('[data-journey-edge="cooler:weather"]')).toHaveAttribute('data-journey-current','true');await expect(page.locator('[data-journey-edge="weather:sequence"]')).toHaveAttribute('data-journey-current','false');
      await scan('2D map distinguishes next move from future journey');
      await boardPlanner().locator('[data-journey-option="discovery"]').click(); await stats(boardPlanner(),{segments:5,investigations:1,turns:2});
      await expect(page.locator('[data-journey-overlay="sequence"]')).toHaveAttribute('data-journey-overlay-route','discovery');
      await expect(page.locator('[data-journey-edge][data-journey-current="true"]')).toHaveCount(3);await expect(page.locator('[data-journey-edge][data-journey-current="false"]')).toHaveCount(2);
      await page.getByRole('button',{name:'Location list',exact:true}).click();await expect(page.locator('[data-location="heater"][data-journey-waypoint="true"]')).toContainText('Next journey waypoint'); await scan('list conveys the same journey waypoint');
      await page.locator('[data-board-tabletop]').click();
      for (const camera of ['left','right','angle']) {await page.locator('[data-tabletop-camera="'+camera+'"]').click();await expect(page.locator('[data-journey-overlay="sequence"]')).toHaveAttribute('data-journey-overlay-route','discovery');await scan('3D journey '+camera);}
      await shoot(page.locator('[data-spatial-board]'),'journey-tabletop');
      await page.evaluate(() => document.body.classList.add('dark'));await scan('dark journey map and controls');if(width===1440)await shoot(page.locator('[data-spatial-board]'),'dark-journey-tabletop');await page.evaluate(() => document.body.classList.remove('dark'));
      await page.emulateMedia({forcedColors:'active'});await scan('forced colors journey');await page.emulateMedia({forcedColors:'none'});
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);await unchanged(planning);
      await boardPlanner().locator('[data-journey-inspect="heater"]').click();await expect(page.locator('[data-journey-overlay]')).toHaveCount(0);await unchanged(planning);
      await inspectDestination();await resume();await page.getByRole('button',{name:'Board view',exact:true}).click();await inspectDestination();await unchanged(planning);
      // Advice is a reversible view choice; reselect the cleared-land route after resume.
      await boardPlanner().locator('[data-journey-option="discovery"]').click();await expect(boardPlanner().locator('[data-journey-next]')).toHaveAttribute('data-journey-next','heater');
      await page.locator('[data-ready-move="heater"]').click();await page.locator('[data-board-move="heater"]').click();await page.locator('[data-board-next]').click();
      const travelled = await page.evaluate(() => snapshot());expect(travelled.progress.position).toBe('heater');expect(travelled.progress.balance).toEqual(planning.progress.balance);expect(travelled.progress.fieldLead).toEqual(planning.progress.fieldLead);
      const reminder = page.locator('[data-field-lead] [data-journey="sequence"]');await stats(reminder,{segments:2,investigations:1,turns:1});await expect(reminder.locator('[data-journey-next]')).toHaveAttribute('data-journey-next','sequence');
      await inspectDestination();await stats(boardPlanner(),{segments:2,investigations:1,turns:1});await scan('journey recalculates after actual travel and retains lead');await shoot(page.locator('[data-journey-tabletop="sequence"]'),'journey-progress');
      await page.locator('[data-ready-move="sequence"]').click();await page.locator('[data-board-move="sequence"]').click();await answer('sequence');
      const delivered = await page.evaluate(() => snapshot());expect(delivered.progress.fieldLead).toBeNull();expect(delivered.progress.fieldDeliveries.filter(d => d.kind==='destination')).toHaveLength(1);
      await expect(page.locator('[data-journey-overlay],[data-journey-tabletop],[data-field-lead]')).toHaveCount(0);await scan('journey guidance clears when the destination is delivered');
      results.push({...scenario,offeredComparison:{direct:{segments:2,investigations:2,turns:2},discovery:{segments:5,investigations:1,turns:2}},planningLeavesRunUnchanged:true,inspectionLeavesRunUnchanged:true,overlayMatchesActualNextTraversal:true,listAndCameraParity:true,persistsLeadAcrossResume:true,recalculatesAfterTravel:true,clearsAfterDelivery:true,scans});await context.close();
    }
    expect(errors).toEqual([]);
    for(const file of ['browser-failure.json','failure-1440.png','failure-390.png','failure-320.png']) {const old = path.join(out,file);if(fs.existsSync(old))fs.unlinkSync(old);}
    fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({passed:true,scope:'Frozen production bundle with legal saved solo fixture. Real extra board edge allows shorter/two-investigation versus longer/one-investigation routes. Encounter, comparison, inspection, commitment, view/camera changes, resume, travel, investigation and payout use UI. Later dice fixed to 1. No live AI image, model or classroom services.',bundleSha256,bundleBytes:Buffer.byteLength(bundle),results,errors},null,2));
    console.log(JSON.stringify({passed:true,out,scenarios:results.length,scans:results.reduce((sum,result)=>sum+result.scans.length,0)}));
  } catch(error) {
    for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(out,'failure-'+page.viewportSize().width+'.png')}).catch(()=>{});
    fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({message:error.stack,results,errors},null,2));throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
