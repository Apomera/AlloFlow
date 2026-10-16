const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {chromium} = require('playwright'), {expect} = require('@playwright/test');
const {makeBoard, source} = require('./fixtures/lesson_board.cjs');

const out = path.resolve('reports/lesson-board-construction-impact-2026-10-15');
fs.mkdirSync(out, {recursive:true});
const bundle = fs.readFileSync('lesson_board_module.js', 'utf8');
const bundleSha256 = crypto.createHash('sha256').update(bundle).digest('hex');
const helpers = require('esbuild').buildSync({stdin:{
  contents:"export {saveBoard,saveSolo,readSolo,soloWorkspace} from './lesson_board_storage.js';",resolveDir:process.cwd()
},bundle:true,write:false,format:'iife',globalName:'ConstructionQA'}).outputFiles[0].text;
const html = '<!doctype html><html lang="en"><head><title>Construction impact verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
const scenarios = [{width:1440,theme:'river'}, {width:390,theme:'garden'}, {width:320,theme:'space'}];
const preflight = process.env.CONSTRUCTION_IMPACT_PREFLIGHT === '1';

(async () => {
  const browser = await chromium.launch({headless:true}), results = [], errors = [];
  try {
    for (const scenario of preflight ? scenarios.slice(0,1) : scenarios) {
      const {width,theme} = scenario, name = width+'-'+theme;
      console.log('Checking construction impact '+name);
      const context = await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}), page = await context.newPage();
      page.setDefaultTimeout(20000);page.on('pageerror',error => errors.push(error.message));
      await page.route('http://construction-impact.test/**',route => route.fulfill({contentType:'text/html',body:html}));
      await page.goto('http://construction-impact.test/');
      for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',require.resolve('axe-core/axe.min.js')]) await page.addScriptTag({path:file});
      await page.addScriptTag({content:bundle});await page.addScriptTag({content:helpers});
      const fixture = makeBoard(), base = {...fixture,theme,playStyle:'tabletop',goal:'expedition',travelLimit:3,
        locations:fixture.locations.map(node => ({...node,reward:[3,3]}))};
      await page.evaluate(({base,source}) => {
        const e = AlloModules.LessonBoardEngine;
        window.qaBoard=e.prepareBoard(base,source);let run=e.emptyRun();
        // Two solved camps and one real travel move put the party at the first
        // producer's construction site with earned supplies. No built projects
        // or fabricated history are injected into the save.
        for (const id of ['heater','cloud','heater']) {
          run=e.merge(run,e.begin(qaBoard,run,id));
          if (e.stepOf(run).phase==='answer') {
            const node=qaBoard.locations.find(n => n.id===id);
            run=e.merge(run,e.processAction(qaBoard,run,{attemptId:'qa',turn:run.turn,requestId:e.requestId(run),kind:'answer',targetId:id,value:e.solution(node)},'solo',{attemptId:'qa',active:true}));
            run=e.merge(run,e.resolve(qaBoard,run,{solo:{}}));
          }
          run=e.merge(run,e.advance(qaBoard,run));
        }
        ConstructionQA.saveBoard(localStorage,source,'English',qaBoard);
        const saved=ConstructionQA.saveSolo(localStorage,qaBoard,'construction-impact-qa','u',{run,workspace:ConstructionQA.soloWorkspace(qaBoard,run)});
        if(saved.status!=='saved')throw Error('Could not seed legal preconstruction save.');
        window.snapshot=()=>{const run=ConstructionQA.readSolo(localStorage,qaBoard,'construction-impact-qa','u').run;return {run,progress:e.derive(qaBoard,run)};};
        window.qaRoot=ReactDOM.createRoot(document.getElementById('root'));
        qaRoot.render(React.createElement(AlloModules.LessonBoardSetup,{inputText:source,appId:'construction-impact-qa',user:{uid:'u'},allowLive:false,t:key=>key,onClose(){},callGemini(){throw Error('QA must not call a provider.');}}));
      },{base,source});
      const scans=[], map=page.locator('[data-spatial-board]').first();
      const scan=async label=>{
        const violations=await page.evaluate(async()=>(await axe.run(document.getElementById('root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current,[data-construction-impact]')].some(n=>n.scrollWidth>n.clientWidth+1));
        const overlaps=await page.evaluate(()=>[...document.querySelectorAll('[data-spatial-board]')].filter(board=>board.dataset.spatialView!=='list'&&board.dataset.zoom==='fit'&&board.getBoundingClientRect().height>0).flatMap(board=>{
          const projects=[...board.querySelectorAll('[data-map-construction]')],locations=[...board.querySelectorAll('[data-location]')];
          const intersect=(a,b)=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return{width:Math.min(x.right,y.right)-Math.max(x.left,y.left),height:Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)};};
          return projects.flatMap(project=>locations.flatMap(location=>{const overlap=intersect(project,location);return overlap.width>1&&overlap.height>1?[{view:board.dataset.spatialView,project:project.dataset.mapConstruction,location:location.dataset.location,...overlap}]:[];}));
        }));
        expect(violations,label).toEqual([]);expect(overflow,label+' overflow').toBe(false);expect(overlaps,label+' project/location button overlap').toEqual([]);scans.push({label,violations,overflow,overlaps});
      };
      const unchanged=async before=>expect(await page.evaluate(()=>snapshot())).toEqual(before);
      const resume=async()=>{
        const before=await page.evaluate(()=>snapshot());await page.locator('[data-tabletop-game-menu]>summary').click();
        await page.getByRole('button',{name:'Back to board setup',exact:true}).click();await page.locator('[data-board-play-solo]').click();await unchanged(before);
      };
      const shoot=async(locator,suffix)=>{
        const height=Math.min(3400,Math.max(1200,Math.ceil((await locator.boundingBox()).height)+100));
        await page.setViewportSize({width,height});await locator.screenshot({path:path.join(out,name+'-'+suffix+'.png')});await page.setViewportSize({width,height:1000});
      };
      const move=async id=>{await page.locator('[data-ready-move="'+id+'"]').click();await page.locator('[data-board-move="'+id+'"]').click();};
      const next=async()=>await page.locator('[data-board-next]').click();
      const select=async id=>{const button=map.locator('[data-map-construction="'+id+'"]');await button.focus();await page.keyboard.press(width===390?'Space':'Enter');await expect(button).toHaveAttribute('aria-pressed','true');};
      const answer=async(id,correct=true)=>{
        const node=base.locations.find(n=>n.id===id);
        if(node.kind==='choice')await page.locator('.lb-current [data-board-choice]').selectOption(String(correct?node.answer:(node.answer+1)%node.options.length));
        else if(node.kind==='order')for(const [index,item]of node.order.entries()){
          let at=await page.locator('.lb-current .lb-order li').evaluateAll((rows,text)=>rows.findIndex(li=>li.querySelector('span').textContent.endsWith(text)),node.items[item]);
          while(at>index){await page.locator('.lb-current [data-board-up="'+item+'"]').click();at--;}
        } else throw Error('Unsupported construction QA response '+node.kind);
        await page.locator('[data-board-submit]').click();
      };
      const baseCaches=async()=>{
        const progress=(await page.evaluate(()=>snapshot())).progress;
        for(const node of base.locations){
          const cache=map.locator('[data-resource-cache="'+node.id+'"]');
          if(progress.visited.includes(node.id)){await expect(cache).toHaveCount(0);continue;}
          if((await map.getAttribute('data-spatial-view'))==='list')await expect(map.locator('[data-resource-summary="'+node.id+'"]')).toContainText('3 Observation tokens · 3 Connection tokens');
          else for(const index of [0,1])await expect(cache.locator('[data-resource-index="'+index+'"]')).toHaveAttribute('data-resource-amount','3');
        }
      };
      const production=async({id,count=null,scope='actual',root=map,fresh})=>{
        const resource=id==='research'?0:1,built=count!==null,view=await root.getAttribute('data-spatial-view');
        const detail=root.locator('[data-construction-impact="'+id+'"]');
        await expect(detail).toHaveAttribute('data-impact-scope',scope);
        await expect(detail.locator('[data-production-potential="'+id+'"]')).toHaveAttribute('data-production-maximum',String(fresh.length));
        await expect(root.locator('[data-production-caption="'+id+'"]')).toContainText('separate from each space’s printed base reward');
        await expect(root.locator('[data-production-caption="'+id+'"]')).toContainText(built?'From ':'After building ');
        if(built){
          await expect(detail.locator('[data-production-earned="'+id+'"]')).toContainText((scope==='projected'?'Projected total supplied: ':'Supplied so far: ')+count+' '+base.resources[resource]);
          if(view==='list')await expect(root.locator('[data-production-list-total="'+id+'"]')).toContainText('Supplied so far: '+count+' '+base.resources[resource]);
          else{
            const counter=root.locator('[data-production-total="'+id+'"]');
            await expect(counter).toHaveAttribute('data-production-count',String(count));await expect(counter).toHaveAttribute('data-production-resource',String(resource));await expect(counter).toHaveAttribute('data-production-scope',scope);
          }
        }else await expect(root.locator('[data-production-total="'+id+'"],[data-production-earned="'+id+'"]')).toHaveCount(0);
        const stampSelector=view==='list'?'[data-production-list-effect]':'[data-production-stamp]';
        const visibleIds=await root.locator(stampSelector).evaluateAll((nodes,list)=>nodes.map(node=>list?node.dataset.productionListEffect:node.dataset.productionStamp),view==='list');
        expect(visibleIds.sort()).toEqual([...fresh].sort());
        for(const nodeId of fresh){
          if(view==='list')await expect(root.locator('[data-production-list-effect="'+nodeId+'"]')).toContainText('+1 '+base.resources[resource]);
          else{
            const stamp=root.locator('[data-production-stamp="'+nodeId+'"]');
            await expect(stamp).toHaveAttribute('data-production-project',id);await expect(stamp).toHaveAttribute('data-production-resource',String(resource));await expect(stamp).toHaveAttribute('data-production-state',built?'built':'blueprint');await expect(stamp).toHaveAttribute('data-production-scope',scope);await expect(stamp).toHaveText('+1');
            await expect(root.locator('[data-location="'+nodeId+'"]')).toHaveAccessibleName(new RegExp('\\+1 '+base.resources[resource]));
          }
        }
      };
      const remaining=snapshot=>base.locations.filter(node=>!snapshot.progress.visited.includes(node.id)).map(node=>node.id);

      await page.locator('[data-board-play-solo]').click();await page.locator('[data-board-tabletop]').click();
      const initial=await page.evaluate(()=>snapshot());expect(initial.progress.balance).toEqual([6,6]);expect(initial.progress.built).toEqual([]);
      await select('research');await unchanged(initial);await baseCaches();
      await production({id:'research',fresh:remaining(initial)});
      await scan('unbuilt producer inspection and printed base supplies');await shoot(map,'producer-blueprint');

      // The plan uses UI actions and is inspected as a separate projected map.
      await page.locator('[data-open-planning]').click();await page.locator('[data-sandbox-start]').click();
      await page.locator('[data-sandbox-construction="research"] [data-funding-option="standard"] input').check();
      await page.locator('[data-sandbox-add="research"]').click();await page.locator('[data-sandbox-add="river"]').click();
      await page.locator('[data-plan-preview]>summary').click();
      const projected=page.locator('[data-plan-preview] [data-spatial-board]');
      await expect(projected).toHaveAttribute('aria-label','Projected exploration map');
      await projected.locator('[data-map-construction="research"]').focus();await page.keyboard.press('Enter');
      await production({id:'research',count:1,scope:'projected',root:projected,fresh:remaining(initial).filter(id=>id!=='river')});
      await expect(map.locator('[data-production-total]')).toHaveCount(0);
      await unchanged(initial);await scan('projected production is separate from the real save');
      await page.locator('[data-sandbox-inspect]').click();await unchanged(initial);
      await move('research');const built=await page.evaluate(()=>snapshot());
      expect(built.progress.built).toEqual(['research']);expect(built.progress.balance).toEqual([3,5]);
      await select('research');await baseCaches();await production({id:'research',count:0,fresh:remaining(built)});await scan('built producer is active before its first payout');await shoot(map,'producer-built');
      await resume();await unchanged(built);
      await next();await move('river');const opened=await page.evaluate(()=>snapshot());
      await answer('river',false);const failed=await page.evaluate(()=>snapshot());
      expect(failed.progress.balance).toEqual(built.progress.balance);expect(failed.progress.visited).not.toContain('river');
      expect(failed.run.turn).toBe(opened.run.turn);
      await select('research');await production({id:'research',count:0,fresh:remaining(failed)});
      await page.locator('[data-board-retry]').click();const retrying=await page.evaluate(()=>snapshot());
      expect(retrying.progress.balance).toEqual(built.progress.balance);expect(retrying.run.turn).toBe(failed.run.turn);
      await select('research');await production({id:'research',count:0,fresh:remaining(retrying)});
      await answer('river');const earned=await page.evaluate(()=>snapshot());
      expect(earned.progress.balance).toEqual([7,8]);expect(earned.progress.usedProjects).toEqual(['research']);
      await select('research');await baseCaches();await production({id:'research',count:1,fresh:remaining(earned)});await scan('successful retry records exactly one producer payout');await shoot(map,'producer-earned');
      await resume();await unchanged(earned);await next();await move('cloud');
      const travelled=await page.evaluate(()=>snapshot());expect(travelled.progress.balance).toEqual(earned.progress.balance);
      await select('research');await production({id:'research',count:1,fresh:remaining(travelled)});
      await next();await move('network');const both=await page.evaluate(()=>snapshot());expect(both.progress.balance).toEqual([6,5]);expect(both.progress.built).toEqual(['research','network']);
      await select('network');await baseCaches();await production({id:'network',count:0,fresh:remaining(both)});await scan('second producer starts with zero earned production');
      await next();await move('rain');await answer('rain');const twice=await page.evaluate(()=>snapshot());expect(twice.progress.balance).toEqual([10,9]);
      await select('network');await production({id:'network',count:1,fresh:remaining(twice)});await expect(map.locator('[data-production-total="research"]')).toHaveAttribute('data-production-count','2');await scan('two producers award their own resource on a new investigation');await shoot(map,'two-producers');
      await page.evaluate(()=>document.body.classList.add('dark'));await scan('dark production dashboard and stamps');if(width===1440)await shoot(map,'dark-two-producers');
      await page.evaluate(()=>document.body.classList.remove('dark'));await page.emulateMedia({forcedColors:'active'});await scan('forced colors production dashboard and stamps');await page.emulateMedia({forcedColors:'none'});
      expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      for(const view of ['Board view','Location list']){
        await page.getByRole('button',{name:view,exact:true}).click();await select('research');await unchanged(twice);await baseCaches();await production({id:'research',count:2,fresh:remaining(twice)});await scan(view+' production selection and keyboard access');
      }
      await page.locator('[data-board-tabletop]').click();await next();await move('heater');
      const bridgeTravel=await page.evaluate(()=>snapshot());expect(bridgeTravel.progress.balance).toEqual(twice.progress.balance);
      await next();const bridgeReady=await page.evaluate(()=>snapshot());await select('bridge');await unchanged(bridgeReady);
      await expect(map.locator('[data-construction-preview-label]')).toContainText('Not built yet');await expect(map.locator('[data-construction-impact-route]')).toHaveCount(0);await expect(map.locator('[data-production-stamp]')).toHaveCount(0);
      await scan('unbuilt shortcut remains a construction preview');
      await move('bridge');const bridged=await page.evaluate(()=>snapshot());expect(bridged.progress.balance).toEqual([8,7]);
      await select('bridge');await expect(map.locator('[data-built-route="bridge"]')).toHaveCount(1);await expect(map.locator('[data-construction-preview-label]')).toHaveCount(0);
      await expect(map.locator('[data-construction-impact-route="bridge"]')).toHaveCount(1);await expect(map.locator('[data-construction-impact="bridge"]')).toContainText('not been crossed yet');
      await scan('selected completed shortcut shows its real connection');await shoot(map,'built-shortcut');
      await resume();await unchanged(bridged);await next();await move('sequence');await answer('sequence');
      const crossed=await page.evaluate(()=>snapshot());expect(crossed.progress.balance).toEqual([12,11]);expect(crossed.progress.usedProjects).toContain('bridge');
      await select('bridge');await expect(map.locator('[data-construction-impact="bridge"]')).toContainText('has crossed this bridge');await expect(map.locator('[data-production-total="research"]')).toHaveAttribute('data-production-count','3');await expect(map.locator('[data-production-total="network"]')).toHaveAttribute('data-production-count','2');await scan('built shortcut crossing and production totals survive save resume');await resume();await unchanged(crossed);
      results.push({...scenario,initialBalance:initial.progress.balance,firstProducerBalance:earned.progress.balance,twoProducerBalance:twice.progress.balance,finalBalance:crossed.progress.balance,keyboardProjectSelection:true,baseCachesUnchanged:true,realConstructionPayments:true,failedAttemptNoPayout:true,retryPaysOnce:true,travelNoRepeatPayout:true,perProjectProductionCounters:true,blueprintAndBuiltStamps:true,bridgeSelectionShowsActualRoute:true,projectionLeavesGameUnchanged:true,savedAndResumed:true,scans});
      await context.close();
    }
    expect(errors).toEqual([]);
    fs.writeFileSync(path.join(out,preflight?'browser-preflight-verification.json':'browser-verification.json'),JSON.stringify({passed:true,preflight,scope:(preflight?'Provisional visual preflight. ':'Frozen production bundle. ')+'Legal engine-played saved camps. Construction, failure/retry, investigation, travel, planning projection, and resume use real solo UI. No live AI or classroom services.',bundleSha256,bundleBytes:Buffer.byteLength(bundle),results,errors},null,2));
    console.log(JSON.stringify({passed:true,preflight,out,scenarios:results.length,scans:results.reduce((sum,result)=>sum+result.scans.length,0)}));
  } catch(error){
    for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(out,'failure-'+page.viewportSize().width+'.png')}).catch(()=>{});
    fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({message:error.stack,results,errors},null,2));throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
