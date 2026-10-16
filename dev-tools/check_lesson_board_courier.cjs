const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium}=require('playwright'),{expect}=require('@playwright/test');
const {makeBoard,source}=require('./fixtures/lesson_board.cjs');
const out=path.resolve('reports/lesson-board-courier-2026-10-15');
fs.mkdirSync(out,{recursive:true});
const bundle=fs.readFileSync('lesson_board_module.js','utf8');
const bundleSha256=crypto.createHash('sha256').update(bundle).digest('hex');
const helpers=require('esbuild').buildSync({stdin:{contents:"export {saveBoard,saveSolo,readSolo,soloWorkspace} from './lesson_board_storage.js'; export {routeTo} from './lesson_board_spatial.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'CourierQA'}).outputFiles[0].text;
const html='<!doctype html><html lang="en"><head><title>Explored station delivery verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
const scenarios=[{width:1440,theme:'river',die:1},{width:390,theme:'garden',die:11},{width:320,theme:'space',die:3}];

(async()=>{
  const browser=await chromium.launch({headless:true}),results=[],errors=[];
  try{
    for(const scenario of scenarios){
      const {width,theme,die}=scenario,name=width+'-'+theme;
      console.log('Checking courier '+name);
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
      page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
      await page.route('http://courier.test/**',route=>route.fulfill({contentType:'text/html',body:html}));
      await page.goto('http://courier.test/');
      for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',require.resolve('axe-core/axe.min.js')])await page.addScriptTag({path:file});
      await page.addScriptTag({content:bundle});await page.addScriptTag({content:helpers});
      const fixture=makeBoard(),base={...fixture,theme,playStyle:'tabletop',goal:'expedition',travelLimit:3,chance:true};
      await page.evaluate(({base,source,die})=>{
        const e=AlloModules.LessonBoardEngine;
        Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:buffer=>{buffer.fill(0);return buffer;}});
        window.qaBoard=e.prepareBoard(base,source);let run=e.emptyRun();
        // Five successful investigations are played through real engine actions.
        // The second camp's encounter is collected; the fifth remains pending.
        for(const [index,id]of ['heater','cloud','rain','river','lake'].entries()){
          run=e.merge(run,e.begin(qaBoard,run,id));const node=qaBoard.locations.find(n=>n.id===id);
          if(e.stepOf(run).phase!=='answer')throw Error('Seed investigation was not legal: '+id);
          run=e.merge(run,e.processAction(qaBoard,run,{attemptId:'qa',turn:run.turn,requestId:e.requestId(run),kind:'answer',targetId:id,value:e.solution(node)},'solo',{attemptId:'qa',active:true}));
          run=e.merge(run,e.resolve(qaBoard,run,{solo:{}},{dice:[index===4?die:1,1]}));
          if(index<4){if(e.fieldOpportunity(qaBoard,run)?.pending)run=e.merge(run,e.chooseFieldOpportunity(qaBoard,run,'collect'));run=e.merge(run,e.advance(qaBoard,run));}
        }
        CourierQA.saveBoard(localStorage,source,'English',qaBoard);
        const saved=CourierQA.saveSolo(localStorage,qaBoard,'courier-qa','u',{run,workspace:CourierQA.soloWorkspace(qaBoard,run)});
        if(saved.status!=='saved')throw Error('Could not seed legal delivery encounter.');
        window.snapshot=()=>{const run=CourierQA.readSolo(localStorage,qaBoard,'courier-qa','u').run;return {run,progress:e.derive(qaBoard,run),offer:e.fieldOpportunity(qaBoard,run)};};
        window.qaRoot=ReactDOM.createRoot(document.getElementById('root'));
        qaRoot.render(React.createElement(AlloModules.LessonBoardSetup,{inputText:source,appId:'courier-qa',user:{uid:'u'},allowLive:false,t:key=>key,onClose(){},callGemini(){throw Error('QA must not call a provider.');}}));
      },{base,source,die});
      const scans=[],map=page.locator('[data-spatial-board]').first();
      const scan=async label=>{
        const violations=await page.evaluate(async()=>(await axe.run(document.getElementById('root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current,[data-tabletop-encounters],[data-field-panel],[data-field-delivery-offer]')].some(n=>n.scrollWidth>n.clientWidth+1));
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
      const move=async id=>{await page.locator('[data-ready-move="'+id+'"]').click();await page.locator('[data-board-move="'+id+'"]').click();};
      const deliveryRecords=snapshot=>snapshot.progress.fieldDeliveries.filter(item=>item.kind==='delivery');
      await page.locator('[data-board-play-solo]').click();await page.locator('[data-board-tabletop]').click();
      const initial=await page.evaluate(()=>snapshot());expect(initial.run.turn).toBe(4);expect(initial.progress.position).toBe('lake');expect(initial.offer.pending).toBe(true);expect(initial.offer.canDelivery).toBe(true);expect(['survey','passage']).toContain(initial.offer.id);expect(initial.offer.deliveries).toHaveLength(2);
      const deck=page.locator('[data-open-tabletop-deck]');await deck.focus();await page.keyboard.press(width===390?'Space':'Enter');await expect(page.locator('[data-field-panel]')).toBeFocused();await unchanged(initial);
      await page.locator('[data-field-delivery-offer]>summary').click();
      for(const option of initial.offer.deliveries){await page.locator('[data-field-delivery-option="'+option.targetId+'"]').check();await expect(page.locator('[data-field-delivery-preview="'+option.targetId+'"]')).toBeVisible();await page.locator('[data-field-delivery-inspect="'+option.targetId+'"]').click();await expect(page.locator('[data-board-inspection]')).toContainText(base.locations.find(node=>node.id===option.targetId).name);await unchanged(initial);}
      const itinerary=await page.evaluate(()=>{
        const state=snapshot();
        for(const delivery of state.offer.deliveries){for(const id of state.progress.visited){const path=CourierQA.routeTo(qaBoard,state.progress,id);if(id!==delivery.targetId&&id!==state.progress.position&&path?.length>2&&path.length<=4&&path.slice(1,-1).includes(delivery.targetId))return {delivery,passing:{id,path}};}}
        throw Error('Fixture lacks a legal route passing through an offered delivery.');
      });
      const {delivery,passing}=itinerary,target=delivery.targetId;
      await page.locator('[data-field-delivery-option="'+target+'"]').check();await unchanged(initial);
      const routeSegments=delivery.path.length-1,routeCopy=page.locator('[data-field-delivery-preview="'+target+'"] [data-delivery-route="'+target+'"]>p').first();
      await expect(routeCopy).toContainText(routeSegments+' route segment'+(routeSegments===1?'':'s')+' ·');
      await scan('delivery destination drafts and inspection leave saved run unchanged');await shoot(page.locator('[data-field-delivery-offer]'),'offer');
      await page.evaluate(()=>document.body.classList.add('dark'));await scan('dark delivery offers');if(width===1440)await shoot(page.locator('[data-field-delivery-offer]'),'dark-offer');await page.evaluate(()=>document.body.classList.remove('dark'));
      await page.emulateMedia({forcedColors:'active'});await scan('forced colors delivery choices');await page.emulateMedia({forcedColors:'none'});
      expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      await resume();await page.locator('[data-field-delivery-offer]>summary').click();await page.locator('[data-field-delivery-option="'+target+'"]').check();await unchanged(initial);
      await page.locator('[data-field-delivery-commit]').focus();await page.keyboard.press('Enter');
      const accepted=await page.evaluate(()=>snapshot());expect(accepted.run.turn).toBe(initial.run.turn);expect(accepted.progress.balance).toEqual(initial.progress.balance);expect(accepted.progress.position).toBe(initial.progress.position);expect(accepted.run.steps.t4.result.dice).toEqual(initial.run.steps.t4.result.dice);expect(accepted.run.steps.t4.result.fieldChoice).toBe('delivery:'+target);expect(accepted.progress.fieldDelivery).toMatchObject({targetId:target,reward:delivery.reward});expect(accepted.offer.selectedDelivery).toMatchObject({targetId:target,reward:delivery.reward});expect(deliveryRecords(accepted)).toHaveLength(0);
      await expect(page.locator('[data-field-delivery-receipt]')).toBeVisible();await expect(page.locator('[data-field-receipt]>h4')).toBeFocused();await expect(page.locator('[data-field-delivery-commit]')).toHaveCount(0);await scan('keyboard commitment saves cargo without spending a move or changing balance');await shoot(page.locator('[data-field-encounter]'),'receipt');
      await resume();await unchanged(accepted);
      await expect(map.locator('[data-tabletop-delivery-marker="'+target+'"]')).toHaveCount(1);await expect(page.locator('[data-tabletop-delivery="'+target+'"]')).toBeVisible();
      for(const view of ['Board view','Location list']){
        await page.getByRole('button',{name:view,exact:true}).click();await page.locator('[data-inspect-tabletop-delivery="'+target+'"]').click();await expect(map.locator('[data-delivery-detail="'+target+'"]')).toBeVisible();await expect(map.locator('[data-location="'+target+'"]')).toHaveAttribute('data-delivery-station','true');await expect(map.locator('[data-location="'+target+'"]')).toHaveAccessibleName(/delivery/i);
        if(view==='Location list'){await expect(map.locator('[data-delivery-list="'+target+'"]')).toBeVisible();await expect(map.locator('[data-location="'+target+'"]')).toContainText(routeSegments+' space'+(routeSegments===1?'':'s')+' away');}else await expect(map.locator('[data-tabletop-delivery-marker="'+target+'"]')).toHaveCount(1);
        await unchanged(accepted);await scan(view+' preserves readable cargo and inspection');
      }
      await page.locator('[data-board-tabletop]').click();await page.locator('[data-inspect-tabletop-delivery="'+target+'"]').click();await unchanged(accepted);await expect(map).toContainText(routeSegments+' space'+(routeSegments===1?'':'s')+' · Travel through explored territory');await scan('3D cargo miniature and explored target detail');await shoot(map,'active-tabletop');await shoot(page.locator('[data-tabletop-encounters]'),'active-rail');
      await page.evaluate(()=>document.body.classList.add('dark'));await scan('dark active cargo marker and rail');if(width===1440)await shoot(map,'dark-active-tabletop');await page.evaluate(()=>document.body.classList.remove('dark'));await page.emulateMedia({forcedColors:'active'});await scan('forced colors active cargo marker and rail');await page.emulateMedia({forcedColors:'none'});
      await next();await expect(page.locator('[data-field-delivery-active]')).toBeVisible();await move(passing.id);
      const passed=await page.evaluate(()=>snapshot());expect(passed.progress.position).toBe(passing.id);expect(passed.progress.balance).toEqual(accepted.progress.balance);expect(passed.progress.fieldDelivery).toEqual(accepted.progress.fieldDelivery);expect(deliveryRecords(passed)).toHaveLength(0);await scan('travelling through the station preserves cargo and pays nothing');await resume();await unchanged(passed);
      await next();await move(target);
      const settled=await page.evaluate(()=>snapshot());expect(settled.progress.position).toBe(target);expect(settled.progress.fieldDelivery).toBeUndefined();expect(settled.progress.balance).toEqual(accepted.progress.balance.map((amount,index)=>amount+delivery.reward[index]));expect(deliveryRecords(settled)).toHaveLength(1);expect(deliveryRecords(settled)[0]).toMatchObject({originTurn:4,targetId:target,gain:delivery.reward});await expect(page.locator('[data-field-delivery-kind="delivery"]')).toBeVisible();await expect(map.locator('[data-tabletop-delivery-marker]')).toHaveCount(0);await expect(page.locator('[data-field-delivery-active]')).toHaveCount(0);await scan('ending a later travel move delivers the one-time reward and clears cargo');await shoot(page.locator('[data-field-panel]'),'delivered');await resume();await unchanged(settled);
      await next();await move(passing.id);await next();await move(target);const repeated=await page.evaluate(()=>snapshot());expect(repeated.progress.balance).toEqual(settled.progress.balance);expect(deliveryRecords(repeated)).toEqual(deliveryRecords(settled));expect(repeated.progress.fieldDelivery).toBeUndefined();await scan('repeated visit cannot award delivery or printed base supplies again');await resume();await unchanged(repeated);
      results.push({...scenario,encounter:initial.offer.id,delivery,passing,routeSegments,routeGrammarVerified:true,initialBalance:initial.progress.balance,deliveredBalance:settled.progress.balance,keyboardDeckAndReceiptFocus:true,draftsAndInspectionNonmutating:true,acceptanceUsesNoMoveOrSupplies:true,activeMarkerInThreeViews:true,passingThroughNoPayout:true,exactEndpointPaysOnce:true,revisitDoesNotRepeat:true,persistedAcrossResume:true,scans});await context.close();
    }
    expect(errors).toEqual([]);
    for(const file of ['browser-failure.json','failure-1440.png','failure-390.png','failure-320.png']){const failure=path.join(out,file);if(fs.existsSync(failure))fs.unlinkSync(failure);}
    fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({passed:true,scope:'Frozen production bundle. Legal engine-played saved solo fixtures. Delivery drafts, route inspection, keyboard acceptance, three tabletop views, passing-through travel, exact endpoint payout, repeated travel, and save/resume use real UI. Later dice fixed to 1. No live AI or classroom services.',bundleSha256,bundleBytes:Buffer.byteLength(bundle),results,errors},null,2));
    console.log(JSON.stringify({passed:true,out,scenarios:results.length,scans:results.reduce((sum,result)=>sum+result.scans.length,0)}));
  }catch(error){for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(out,'failure-'+page.viewportSize().width+'.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({message:error.stack,results,errors},null,2));throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
