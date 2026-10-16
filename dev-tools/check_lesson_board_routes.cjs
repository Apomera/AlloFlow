const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium}=require('playwright'),{expect}=require('@playwright/test');
const {makeBoard,source}=require('./fixtures/lesson_board.cjs');
const out=path.resolve('reports/lesson-board-routes-2026-10-15');
fs.mkdirSync(out,{recursive:true});
const bundle=fs.readFileSync('lesson_board_module.js','utf8'),bundleSha256=crypto.createHash('sha256').update(bundle).digest('hex');
const helpers=require('esbuild').buildSync({stdin:{contents:"export {saveBoard,saveSolo,readSolo,soloWorkspace} from './lesson_board_storage.js'; export {routeTo,travelRouteOptions} from './lesson_board_spatial.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'RoutesQA'}).outputFiles[0].text;
const html='<!doctype html><html lang="en"><head><title>Strategic route verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
const scenarios=[{width:1440,theme:'river'},{width:390,theme:'garden'},{width:320,theme:'space'},{width:1440,theme:'archive',home:true}];

(async()=>{
  const browser=await chromium.launch({headless:true}),results=[],errors=[];
  try{
    for(const scenario of scenarios){
      const {width,theme,home}=scenario,name=width+'-'+theme+(home?'-home':'');
      console.log('Checking strategic routes '+name);
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
      page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
      await page.route('http://routes.test/**',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('http://routes.test/');
      for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',require.resolve('axe-core/axe.min.js')])await page.addScriptTag({path:file});
      await page.addScriptTag({content:bundle});await page.addScriptTag({content:helpers});
      const base={...makeBoard(),theme,playStyle:'tabletop',goal:'expedition',travelLimit:3,chance:true,expeditionKit:'pathfinder'};
      await page.evaluate(({base,source,home})=>{
        const e=AlloModules.LessonBoardEngine;
        Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:buffer=>{buffer.fill(0);return buffer;}});
        window.qaBoard=e.prepareBoard(base,source);let run=e.emptyRun();
        const ids=home?['heater','cloud','rain','sequence','weather','cooler','lake','river','heater','research','bridge','cloud']:['heater','cloud','rain','sequence','cloud','river','heater','bridge'];
        for(const id of ids){
          run=e.merge(run,e.begin(qaBoard,run,id));const step=e.stepOf(run);
          if(!['answer','review'].includes(step.phase)||step.targetId!==id)throw Error('Seed action was not legal: '+id);
          if(step.phase==='answer'){
            const node=qaBoard.locations.find(n=>n.id===id);
            run=e.merge(run,e.processAction(qaBoard,run,{attemptId:'qa',turn:run.turn,requestId:e.requestId(run),kind:'answer',targetId:id,value:e.solution(node)},'solo',{attemptId:'qa',active:true}));
            run=e.merge(run,e.resolve(qaBoard,run,{solo:{}},{dice:[id==='river'&&!home?3:1,1]}));
          }
          const offer=e.fieldOpportunity(qaBoard,run);
          if(offer?.pending){const choice=id==='river'&&!home?'delivery:rain':'collect';run=e.merge(run,e.chooseFieldOpportunity(qaBoard,run,choice));if(e.fieldOpportunity(qaBoard,run)?.pending)throw Error('Seed encounter choice failed: '+choice);}
          run=e.merge(run,e.advance(qaBoard,run));
        }
        const progress=e.derive(qaBoard,run);
        if(progress.kitCount!==0||progress.usedProjects.length!==0||!progress.built.includes('bridge'))throw Error('Bridge must be built but unused in legal seed.');
        if(home&&!progress.requirementsMet)throw Error('Home fixture must have met all objective requirements.');
        if(!home&&progress.fieldDelivery?.targetId!=='rain')throw Error('Cargo must remain active for route comparison.');
        RoutesQA.saveBoard(localStorage,source,'English',qaBoard);
        const saved=RoutesQA.saveSolo(localStorage,qaBoard,'routes-qa','u',{run,workspace:RoutesQA.soloWorkspace(qaBoard,run)});if(saved.status!=='saved')throw Error('Could not seed legal route fixture.');
        window.snapshot=()=>{const run=RoutesQA.readSolo(localStorage,qaBoard,'routes-qa','u').run;return {run,progress:e.derive(qaBoard,run)};};
        window.qaRoot=ReactDOM.createRoot(document.getElementById('root'));
        qaRoot.render(React.createElement(AlloModules.LessonBoardSetup,{inputText:source,appId:'routes-qa',user:{uid:'u'},allowLive:false,t:key=>key,onClose(){},callGemini(){throw Error('QA must not call a provider.');}}));
      },{base,source,home:!!home});
      const scans=[],map=page.locator('[data-spatial-board]').first(),rail=page.locator('[data-tabletop-encounters]');
      const scan=async label=>{
        const violations=await page.evaluate(async()=>(await axe.run(document.getElementById('root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current,[data-tabletop-encounters],[data-route-choice]')].some(n=>n.scrollWidth>n.clientWidth+1));
        const overlaps=await page.evaluate(()=>[...document.querySelectorAll('[data-spatial-board]')].filter(board=>board.dataset.spatialView!=='list'&&board.dataset.zoom==='fit'&&board.getBoundingClientRect().height>0).flatMap(board=>{
          const projects=[...board.querySelectorAll('[data-map-construction]')],locations=[...board.querySelectorAll('[data-location]')];
          return projects.flatMap(project=>locations.flatMap(location=>{const a=project.getBoundingClientRect(),b=location.getBoundingClientRect(),width=Math.min(a.right,b.right)-Math.max(a.left,b.left),height=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);return width>1&&height>1?[{view:board.dataset.spatialView,project:project.dataset.mapConstruction,location:location.dataset.location,width,height}]:[];}));
        }));
        expect(violations,label).toEqual([]);expect(overflow,label+' overflow').toBe(false);expect(overlaps,label+' project/location overlap').toEqual([]);scans.push({label,violations,overflow,overlaps});
      };
      const unchanged=async before=>expect(await page.evaluate(()=>snapshot())).toEqual(before);
      const resume=async()=>{const before=await page.evaluate(()=>snapshot());await page.locator('[data-tabletop-game-menu]>summary').click();await page.getByRole('button',{name:'Back to board setup',exact:true}).click();await page.locator('[data-board-play-solo]').click();await unchanged(before);};
      const shoot=async(locator,suffix)=>{const height=Math.min(3400,Math.max(1200,Math.ceil((await locator.boundingBox()).height)+100));await page.setViewportSize({width,height});await locator.screenshot({path:path.join(out,name+'-'+suffix+'.png')});await page.setViewportSize({width,height:1000});};
      const next=async()=>await page.locator('[data-board-next]').click();
      const select=async id=>await page.locator('[data-ready-move="'+id+'"]').click();
      const choose=async(route)=>{await page.locator('[data-route-option="'+route+'"] input').focus();await page.keyboard.press('Space');await expect(page.locator('[data-route-option="'+route+'"] input')).toBeChecked();};
      const commit=async id=>{await page.locator('[data-board-move="'+id+'"]').focus();await page.keyboard.press('Enter');};
      const pathPreview=async ids=>{const expected=ids.slice(1).map((id,index)=>[ids[index],id].sort().join(':')).sort(),actual=await map.locator('.lb-spatial-route[data-route-preview=true]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.routeFrom,n.dataset.routeTo].sort().join(':')).sort());expect(actual).toEqual(expected);};
      const recap=async ids=>await expect(page.locator('[data-tabletop-travel-recap] .lb-tabletop-route')).toHaveText(ids.map(id=>base.locations.find(n=>n.id===id).name).join(' → '));
      await page.locator('[data-board-play-solo]').click();await page.locator('[data-board-tabletop]').click();
      const initial=await page.evaluate(()=>snapshot()),target=home?'heater':'rain',shortestPath=home?['cloud','heater']:['heater','cloud','rain'],bridgePath=home?['cloud','rain','sequence','heater']:['heater','sequence','rain'];
      await select(target);await expect(page.locator('[data-route-choice="'+target+'"]')).toBeVisible();await expect(page.locator('[data-route-option="shortest"] input')).toBeChecked();await expect(page.locator('[data-route-option="bridge:bridge"]')).toContainText('Observation bridge');await expect(page.locator('[data-route-option="bridge:bridge"] [data-route-first-use]')).toContainText('Observation bridge');await expect(page.locator('[data-route-option="bridge:bridge"] [data-route-kit]')).toContainText('+2 Observation tokens · +2 Connection tokens');await expect(page.locator('[data-route-option="shortest"] [data-route-kit]')).toHaveCount(0);await pathPreview(shortestPath);await unchanged(initial);
      if(home){await expect(page.locator('[data-route-option="bridge:bridge"] [data-route-finishes]')).toBeVisible();await expect(page.locator('[data-route-option="shortest"] [data-route-finishes]')).toHaveCount(0);}else{
        for(const route of ['shortest','bridge:bridge'])await expect(page.locator('[data-route-option="'+route+'"] [data-route-delivery]')).toBeVisible();
        await expect(rail).toHaveAttribute('data-encounter-compact','true');
        if(width<=600)await expect(rail).toHaveCSS('display','block');
        const commitmentDetails=rail.locator('[data-tabletop-commitment-details="delivery"]'),encounterDetails=rail.locator('[data-tabletop-encounter-details]');
        await expect(commitmentDetails).not.toHaveAttribute('open','');await expect(encounterDetails).not.toHaveAttribute('open','');
        const collapsedHeight=(await rail.boundingBox()).height;
        await commitmentDetails.locator(':scope>summary').focus();await page.keyboard.press('Enter');await expect(commitmentDetails).toHaveAttribute('open','');
        await encounterDetails.locator(':scope>summary').focus();await page.keyboard.press('Space');await expect(encounterDetails).toHaveAttribute('open','');
        expect((await rail.boundingBox()).height).toBeGreaterThan(collapsedHeight);await unchanged(initial);await scan('compact rail details expand with keyboard without changing progress');
        await commitmentDetails.locator(':scope>summary').click();await encounterDetails.locator(':scope>summary').click();await expect(commitmentDetails).not.toHaveAttribute('open','');await expect(encounterDetails).not.toHaveAttribute('open','');await unchanged(initial);
        await expect(page.locator('[data-inspect-tabletop-delivery="rain"]')).toBeVisible();await page.locator('[data-inspect-tabletop-delivery="rain"]').focus();await page.keyboard.press('Enter');await unchanged(initial);await expect(map.locator('[data-delivery-detail="rain"]')).toBeVisible();
      }
      await choose('bridge:bridge');await pathPreview(bridgePath);await expect(map.locator('[data-map-route-choice="bridge:bridge"]')).toHaveAttribute('data-map-route-path',bridgePath.join(','));await expect(map.locator('[data-selection-activity]')).toHaveAttribute('data-selection-activity','travel');await unchanged(initial);await scan('saved position unchanged while comparing bridge and shortest routes');await shoot(page.locator('[data-route-choice]'),'route-choice');await shoot(map,'bridge-preview');
      await page.evaluate(()=>document.body.classList.add('dark'));await scan('dark selected route and compact encounter rail');if(width===1440&&!home)await shoot(map,'dark-bridge-preview');await page.evaluate(()=>document.body.classList.remove('dark'));await page.emulateMedia({forcedColors:'active'});await scan('forced colors route comparison');await page.emulateMedia({forcedColors:'none'});expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      for(const view of ['Board view','Location list']){await page.getByRole('button',{name:view,exact:true}).click();await expect(page.locator('[data-route-option="bridge:bridge"] input')).toBeChecked();if(view==='Board view')await pathPreview(bridgePath);await unchanged(initial);await scan(view+' keeps selected route without committing');}
      await page.locator('[data-board-tabletop]').click();
      if(home){
        await commit('heater');const finished=await page.evaluate(()=>snapshot());expect(finished.run.steps['t'+initial.run.turn].route).toBe('bridge:bridge');expect(finished.progress.complete).toBe(true);expect(finished.progress.returned).toBe(true);expect(finished.progress.usedProjects).toEqual(['bridge']);expect(finished.progress.kitCount).toBe(1);expect(finished.progress.balance).toEqual(initial.progress.balance.map(n=>n+2));await scan('explicit first bridge use completes home delivery with kit payout');await resume();await unchanged(finished);results.push({...scenario,shortestPath,bridgePath,firstBridgeUseFinishPreview:true,explicitHomeRouteFinishes:true,restoredFinalRoute:true,scans});await context.close();continue;
      }
      const compactHeight=(await rail.boundingBox()).height;await shoot(rail,'compact-delivery-rail');
      await choose('shortest');await pathPreview(shortestPath);await unchanged(initial);await commit('rain');
      const bypassed=await page.evaluate(()=>snapshot());expect(bypassed.progress.position).toBe('rain');expect(bypassed.progress.kitCount).toBe(0);expect(bypassed.progress.usedProjects).toEqual([]);expect(bypassed.progress.balance).toEqual(initial.progress.balance.map((n,i)=>n+initial.progress.fieldDelivery.reward[i]));expect(bypassed.progress.fieldDelivery).toBeUndefined();expect(bypassed.progress.fieldDeliveries.filter(item=>item.kind==='delivery')).toHaveLength(1);await recap(shortestPath);await scan('shortest route bypasses bridge but settles destination cargo');await resume();await unchanged(bypassed);await recap(shortestPath);
      await next();await select('heater');await choose('shortest');await commit('heater');await next();const beforeBridge=await page.evaluate(()=>snapshot());await select('rain');await choose('bridge:bridge');await unchanged(beforeBridge);await commit('rain');
      const crossed=await page.evaluate(()=>snapshot());expect(crossed.run.steps['t'+beforeBridge.run.turn].route).toBe('bridge:bridge');expect(crossed.progress.position).toBe('rain');expect(crossed.progress.usedProjects).toEqual(['bridge']);expect(crossed.progress.kitCount).toBe(1);expect(crossed.progress.kitGains).toEqual([2,2]);expect(crossed.progress.balance).toEqual(bypassed.progress.balance.map(n=>n+2));expect(crossed.progress.fieldDeliveries.filter(item=>item.kind==='delivery')).toHaveLength(1);await recap(bridgePath);await scan('explicit saved bridge path pays Pathfinder exactly once');await shoot(map,'bridge-crossed');await shoot(page.locator('[data-tabletop-travel-recap]'),'travel-recap');await resume();await unchanged(crossed);await recap(bridgePath);
      await next();await select('heater');await choose('bridge:bridge');await expect(page.locator('[data-route-option="bridge:bridge"] [data-route-kit]')).toHaveCount(0);await expect(page.locator('[data-route-option="bridge:bridge"] [data-route-first-use]')).toHaveCount(0);await commit('heater');const repeated=await page.evaluate(()=>snapshot());expect(repeated.progress.balance).toEqual(crossed.progress.balance);expect(repeated.progress.kitCount).toBe(1);expect(repeated.progress.usedProjects).toEqual(['bridge']);await recap([...bridgePath].reverse());await scan('repeated bridge crossing does not repeat kit or delivery reward');await resume();await unchanged(repeated);
      results.push({...scenario,shortestPath,bridgePath,compactHeight,initialBalance:initial.progress.balance,bypassBalance:bypassed.progress.balance,bridgeBalance:crossed.progress.balance,draftsNonmutating:true,keyboardSelectionAndCommit:true,threeViewPreview:true,shortestBypassesBridge:true,deliveryIndependentOfRoute:true,bridgeFirstUsePaysOnce:true,savedRouteMatchesRecap:true,restoredRoute:true,scans});await context.close();
    }
    expect(errors).toEqual([]);for(const file of ['browser-failure.json','failure-1440.png','failure-390.png','failure-320.png']){const failure=path.join(out,file);if(fs.existsSync(failure))fs.unlinkSync(failure);}
    fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({passed:true,scope:'Frozen production bundle. Legal engine-played saved solo fixtures. Route drafts, map previews, keyboard commitment, shortest bypass, first bridge use, delivery, repeated traversal, home completion, and save/resume use real UI. No live AI or classroom services.',bundleSha256,bundleBytes:Buffer.byteLength(bundle),results,errors},null,2));console.log(JSON.stringify({passed:true,out,scenarios:results.length,scans:results.reduce((sum,result)=>sum+result.scans.length,0)}));
  }catch(error){for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(out,'failure-'+page.viewportSize().width+'.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({message:error.stack,results,errors},null,2));throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
