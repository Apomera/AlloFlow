const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium}=require('playwright'),{expect}=require('@playwright/test');
const {makeBoard,source}=require('./fixtures/lesson_board.cjs');
const out=path.resolve('reports/lesson-board-decisions-2026-10-15');fs.mkdirSync(out,{recursive:true});
const bundle=fs.readFileSync('lesson_board_module.js','utf8'),bundleSha256=crypto.createHash('sha256').update(bundle).digest('hex'),bundleBytes=Buffer.byteLength(bundle);
const helpers=require('esbuild').buildSync({stdin:{contents:"export {saveBoard,saveSolo,readSolo,soloWorkspace} from './lesson_board_storage.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'DecisionQA'}).outputFiles[0].text;
const html='<!doctype html><html lang="en"><head><title>Encounter decisions and tabletop review verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
const scripts=['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',require.resolve('axe-core/axe.min.js')];
const scenarios=[{width:1440,theme:'river',die:6,commitKind:'trade'},{width:390,theme:'garden',die:11,commitKind:'delivery'},{width:320,theme:'space',die:16,commitKind:'commission'}];

(async()=>{
  const browser=await chromium.launch({headless:true}),results=[],errors=[];
  const checkpoint=status=>fs.writeFileSync(path.join(out,'browser-progress.json'),JSON.stringify({status,updatedAt:new Date().toISOString(),bundleSha256,bundleBytes,results,errors},null,2));
  try{
    for(const scenario of scenarios){
      const {width,theme,die,commitKind}=scenario,name=width+'-'+theme;
      console.log('Checking encounter decisions '+name);checkpoint('running '+name);
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
      await page.route('http://decisions.test/**',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('http://decisions.test/');
      const addScripts=async()=>{for(const file of scripts)await page.addScriptTag({path:file});await page.addScriptTag({content:bundle});await page.addScriptTag({content:helpers});};await addScripts();
      const base={...makeBoard(),theme,playStyle:'tabletop',goal:'expedition',travelLimit:3,chance:true,expeditionKit:'builder'};
      await page.evaluate(({base,source,die})=>{
        const e=AlloModules.LessonBoardEngine;Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:buffer=>{buffer.fill(0);return buffer;}});window.qaBoard=e.prepareBoard(base,source);let run=e.emptyRun();
        const moves=['heater','cloud','rain','sequence','cloud','river'];
        for(const [index,id]of moves.entries()){
          run=e.merge(run,e.begin(qaBoard,run,id));const step=e.stepOf(run);if(!['answer','review'].includes(step.phase)||step.targetId!==id)throw Error('Illegal seeded action: '+id);
          if(step.phase==='answer'){run=e.merge(run,e.processAction(qaBoard,run,{attemptId:'qa',turn:run.turn,requestId:e.requestId(run),kind:'answer',targetId:id,value:e.solution(qaBoard.locations.find(node=>node.id===id))},'solo',{attemptId:'qa',active:true}));run=e.merge(run,e.resolve(qaBoard,run,{solo:{}},{dice:[index===moves.length-1?die:1,1]}));}
          if(index<moves.length-1){if(e.fieldOpportunity(qaBoard,run)?.pending)run=e.merge(run,e.chooseFieldOpportunity(qaBoard,run,'collect'));run=e.merge(run,e.advance(qaBoard,run));}
        }
        if(!e.fieldOpportunity(qaBoard,run)?.pending||e.derive(qaBoard,run).visited.length!==5)throw Error('Legal decision fixture missing.');
        DecisionQA.saveBoard(localStorage,source,'English',qaBoard);const saved=DecisionQA.saveSolo(localStorage,qaBoard,'decision-qa','u',{run,workspace:DecisionQA.soloWorkspace(qaBoard,run)});if(saved.status!=='saved')throw Error('Could not save decision fixture.');
      },{base,source,die});
      const mount=async()=>page.evaluate(({base,source})=>{
        const e=AlloModules.LessonBoardEngine;window.qaBoard=e.prepareBoard(base,source);window.snapshot=()=>{const run=DecisionQA.readSolo(localStorage,qaBoard,'decision-qa','u').run;return{run,progress:e.derive(qaBoard,run),offer:e.fieldOpportunity(qaBoard,run)};};
        window.qaWrites=[];const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===localStorage)qaWrites.push({key,value});return original.call(this,key,value);};
        window.qaRoot=ReactDOM.createRoot(document.getElementById('root'));qaRoot.render(React.createElement(AlloModules.LessonBoardSetup,{inputText:source,appId:'decision-qa',user:{uid:'u'},allowLive:false,t:key=>key,onClose(){},callGemini(){throw Error('QA must not call a provider.');}}));
      },{base,source});await mount();
      const scans=[],comparisons=[],dockChecks=[],map=page.locator('[data-spatial-board]').first();
      const read=()=>page.evaluate(()=>snapshot()),unchanged=async before=>expect(await read()).toEqual(before);
      const open=async()=>{await page.locator('[data-board-play-solo]').click();await page.locator('[data-board-tabletop]').click();};
      const reload=async()=>{const before=await read();await page.reload();await addScripts();await mount();await open();await unchanged(before);};
      const resetWrites=()=>page.evaluate(()=>{qaWrites=[];}),noWrites=async()=>expect(await page.evaluate(()=>qaWrites)).toEqual([]);
      const scan=async label=>{
        const violations=await page.evaluate(async()=>(await axe.run(document.getElementById('root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current,[data-field-panel],[data-encounter-decision],[data-decision-approach],[data-field-decision-preview],[data-tabletop-review-dock]')].some(node=>node.scrollWidth>node.clientWidth+1));
        const overlaps=await page.evaluate(()=>[...document.querySelectorAll('[data-spatial-board]')].filter(board=>board.dataset.spatialView!=='list'&&board.dataset.zoom==='fit'&&board.getBoundingClientRect().height>0).flatMap(board=>[...board.querySelectorAll('[data-map-construction]')].flatMap(project=>[...board.querySelectorAll('[data-location]')].flatMap(location=>{const a=project.getBoundingClientRect(),b=location.getBoundingClientRect(),width=Math.min(a.right,b.right)-Math.max(a.left,b.left),height=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);return width>1&&height>1?[{project:project.dataset.mapConstruction,location:location.dataset.location,width,height}]:[];}))));
        expect(violations,label).toEqual([]);expect(overflow,label+' overflow').toBe(false);expect(overlaps,label+' map overlap').toEqual([]);scans.push({label,violations,overflow,overlaps});
      };
      const shoot=async(locator,suffix)=>{const height=Math.min(4500,Math.max(1200,Math.ceil((await locator.boundingBox()).height)+100));await page.setViewportSize({width,height});await locator.screenshot({path:path.join(out,name+'-'+suffix+'.png')});await page.setViewportSize({width,height:1000});};
      const counters=async values=>{for(const [i,value]of values.entries())await expect(page.locator('[data-board-mission] [data-resource-count="'+i+'"]')).toHaveText(String(value));};
      const next=async()=>page.locator('[data-board-next]').click();
      await open();const initial=await read();await counters(initial.progress.balance);await expect(page.locator('[data-field-approach=collect]')).toHaveAttribute('aria-pressed','true');
      const printedCacheGeometry=await map.locator('[data-resource-cache] [data-resource-index]').evaluateAll(nodes=>nodes.map(node=>{const style=getComputedStyle(node);return{width:parseFloat(style.width),height:parseFloat(style.height)};}));expect(printedCacheGeometry.length).toBeGreaterThan(0);expect(printedCacheGeometry.every(size=>size.width<=24&&size.height<=18)).toBe(true);
      await map.locator('[data-location=river]').click();await map.locator('[data-tabletop-review-move=river]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-field-panel]')).toBeFocused();await expect(page.locator('[data-board-next]')).toBeDisabled();await unchanged(initial);dockChecks.push({phase:'pending encounter',kind:'current',id:'river',focus:'field panel'});await scan('pending encounter dock focuses the real choice panel and cannot skip the decision');
      const choices=[{id:'collect',kind:'collect',reward:initial.offer.immediate},{id:'prepare',kind:'prepare',reward:initial.offer.prepared},{id:'crew',kind:'crew',reward:initial.offer.crew},...(initial.offer.commissions||[]).map(item=>({id:'commission:'+item.projectId,kind:'commission',target:item.projectId,reward:item.reward})),...(initial.offer.trades||[]).filter(item=>item.legal).map(item=>({id:item.id,kind:'trade',reward:item.gain,spent:item.cost})),...(initial.offer.deliveries||[]).map(item=>({id:'delivery:'+item.targetId,kind:'delivery',target:item.targetId,reward:item.reward})),...(initial.offer.leads||[]).map(item=>({id:'lead:'+item.targetId,kind:'lead',target:item.targetId,reward:item.reward}))];
      const kinds=[...new Set(choices.map(choice=>choice.kind))],remembered={};
      const afterFor=choice=>initial.progress.balance.map((n,i)=>n+(choice.kind==='collect'||choice.kind==='trade'?choice.reward[i]-(choice.spent?.[i]||0):0));
      const preview=async choice=>{
        const panel=page.locator('[data-field-decision-preview]');await expect(panel).toHaveAttribute('data-choice',choice.id);
        for(const [i,value]of afterFor(choice).entries()){await expect(panel.locator('[data-decision-before="'+i+'"]')).toHaveText(String(initial.progress.balance[i]));await expect(panel.locator('[data-decision-after="'+i+'"]')).toHaveText(String(value));}
        const deferred=!['collect','trade'].includes(choice.kind);await expect(panel.locator('[data-decision-reserved]')).toHaveCount(deferred?1:0);
        if(deferred)for(const [i,value]of choice.reward.entries())if(value)await expect(panel.locator('[data-decision-reserved]')).toContainText('+'+value+' '+base.resources[i]);
        await expect(page.locator('[data-field-choice]')).toHaveCount(1);await counters(initial.progress.balance);await unchanged(initial);
      };
      const approach=async kind=>{await resetWrites();const button=page.locator('[data-field-approach="'+kind+'"]');await button.focus();await page.keyboard.press('Enter');await expect(button).toHaveAttribute('aria-pressed','true');await noWrites();};
      await preview(choices[0]);
      for(const kind of kinds){
        await approach(kind);
        const group=choices.filter(choice=>choice.kind===kind);
        for(const choice of group){
          if(group.length>1){const value=kind==='trade'?choice.id:choice.target,radio=page.locator('[data-field-'+kind+'-option="'+value+'"]');await resetWrites();await radio.focus();await page.keyboard.press('Space');await expect(radio).toBeChecked();}
          await preview(choice);await noWrites();comparisons.push({choice:choice.id,before:initial.progress.balance,after:afterFor(choice),reserved:!['collect','trade'].includes(kind)?choice.reward:null});
        }
        remembered[kind]=group.at(-1);await scan(kind+' approach and target comparisons do not save, spend or move');
      }
      for(const kind of kinds){await approach(kind);await preview(remembered[kind]);await noWrites();}
      const selected=remembered[commitKind];await approach(commitKind);await preview(selected);await scan('each approach remembers its selected target within the same encounter');
      if(selected.target){const inspect=commitKind==='commission'?'[data-commission-inspect="'+selected.target+'"]':'[data-field-delivery-inspect="'+selected.target+'"]';await page.locator(inspect).click();await expect(page.locator('[data-board-inspection]')).toContainText([...base.locations,...base.projects].find(node=>node.id===selected.target).name);await unchanged(initial);await preview(selected);await scan('selected approach target inspection keeps the local choice and real game state intact');}
      await shoot(page.locator('.lb-approaches'),'approach-cards');await shoot(page.locator('[data-field-decision-preview]'),'decision-preview');await shoot(page.locator('[data-decision-approach]'),'selected-approach');
      await page.evaluate(()=>document.body.classList.add('dark'));await scan('dark decision cards and exact consequences');if(width===1440)await shoot(page.locator('[data-decision-approach]'),'dark-selected-approach');await page.evaluate(()=>document.body.classList.remove('dark'));
      await page.emulateMedia({forcedColors:'active'});await scan('forced colors decision selection and consequence labels');await page.emulateMedia({forcedColors:'none'});
      expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);expect(await page.locator('[data-field-approach][aria-pressed=true]').evaluate(node=>getComputedStyle(node).transform)).toBe('none');
      await reload();await expect(page.locator('[data-field-approach=collect]')).toHaveAttribute('aria-pressed','true');await unchanged(initial);await scan('reloading restores the pending encounter and resets private comparisons');
      await approach(commitKind);if(choices.filter(choice=>choice.kind===commitKind).length>1)await page.locator('[data-field-'+commitKind+'-option="'+(commitKind==='trade'?selected.id:selected.target)+'"]').check();await preview(selected);
      await page.locator('[data-field-'+commitKind+'-commit]').focus();await page.keyboard.press('Enter');
      const accepted=await read();expect(accepted.run.turn).toBe(initial.run.turn);expect(accepted.progress.position).toBe(initial.progress.position);expect(accepted.progress.balance).toEqual(afterFor(selected));expect(accepted.run.steps['t'+initial.run.turn].result.dice).toEqual(initial.run.steps['t'+initial.run.turn].result.dice);expect(accepted.run.steps['t'+initial.run.turn].result.fieldChoice).toBe(selected.id);expect(accepted.progress.fieldEvents.filter(event=>event.turn===initial.run.turn)).toHaveLength(1);
      await expect(page.locator('[data-field-receipt]>h4')).toBeFocused();await expect(page.locator('[data-field-choice]')).toHaveCount(0);await scan('one explicit confirmation saves only the chosen benefit and focuses its receipt');await shoot(page.locator('[data-field-receipt]'),'confirmed-receipt');
      await reload();await unchanged(accepted);await counters(accepted.progress.balance);await expect(page.locator('[data-field-receipt]')).toBeVisible();await scan('full reload preserves the actual confirmed receipt and supply balance');

      // The tabletop dock only returns to the existing action controls. It does
      // not commit moves, bypass a review, or turn inspection into movement.
      await map.locator('[data-location=cloud]').click();await expect(map.locator('[data-tabletop-review-dock]')).toHaveCount(0);await unchanged(accepted);
      await map.locator('[data-location=river]').click();await expect(map.locator('[data-tabletop-review-move=river]')).toHaveAttribute('data-review-kind','current');
      await map.locator('[data-tabletop-review-move=river]').focus();await page.keyboard.press('Enter');await expect(page.locator('.lb-current>h3')).toBeFocused();await unchanged(accepted);dockChecks.push({phase:'review',kind:'current',id:'river',focus:'current move heading'});await scan('current review dock focuses the existing move panel without advancing');
      await next();const choosing=await read();
      for(const view of ['3D tabletop','Board view','Location list']){
        if(view==='3D tabletop')await page.locator('[data-board-tabletop]').click();else await page.getByRole('button',{name:view,exact:true}).click();
        await map.locator('[data-location=heater]').click();const dock=map.locator('[data-tabletop-review-move=heater]');await expect(dock).toHaveAttribute('data-review-kind','travel');await dock.focus();await page.keyboard.press('Enter');await expect(page.locator('.lb-current>h3')).toBeFocused();await expect(page.locator('[data-board-move=heater]')).toBeVisible();await unchanged(choosing);await counters(choosing.progress.balance);dockChecks.push({phase:'choose',kind:'travel',view,id:'heater',focus:'current move heading'});await scan(view+' dock focuses the real travel review panel without committing');
      }
      await page.locator('[data-board-tabletop]').click();await shoot(map.locator('[data-tabletop-review-dock]'),'travel-review-dock');await shoot(map,'tabletop-review');
      await page.locator('[data-board-move=heater]').focus();await page.keyboard.press('Enter');const home=await read();expect(home.progress.position).toBe('heater');expect(home.run.turn).toBe(choosing.run.turn);await next();const atHome=await read();
      await map.locator('[data-map-construction=research]').click();await expect(map.locator('[data-tabletop-review-move=research]')).toHaveAttribute('data-review-kind','construction');await map.locator('[data-tabletop-review-move=research]').focus();await page.keyboard.press('Enter');await expect(page.locator('.lb-current>h3')).toBeFocused();await expect(page.locator('[data-board-move=research]')).toBeVisible();await unchanged(atHome);dockChecks.push({phase:'choose',kind:'construction',id:'research',focus:'current move heading'});await scan('construction dock focuses actual payment and build review without spending');await shoot(map.locator('[data-tabletop-review-dock]'),'construction-review-dock');
      await map.locator('[data-location=lake]').click();await expect(map.locator('[data-tabletop-review-move=lake]')).toHaveAttribute('data-review-kind','investigation');await map.locator('[data-tabletop-review-move=lake]').focus();await page.keyboard.press('Enter');await expect(page.locator('.lb-current>h3')).toBeFocused();await expect(page.locator('[data-board-move=lake]')).toBeVisible();await unchanged(atHome);dockChecks.push({phase:'choose',kind:'investigation',id:'lake',focus:'current move heading'});await scan('new investigation dock previews its actual action without opening it');
      await page.locator('[data-board-move=lake]').focus();await page.keyboard.press('Enter');const answering=await read();expect(answering.progress.position).toBe('lake');expect(answering.run.steps['t'+answering.run.turn].phase).toBe('answer');
      await map.locator('[data-location=cloud]').click();await expect(map.locator('[data-tabletop-review-dock]')).toHaveCount(0);await map.locator('[data-location=lake]').click();await expect(map.locator('[data-tabletop-review-move=lake]')).toHaveAttribute('data-review-kind','current');await map.locator('[data-tabletop-review-move=lake]').focus();await page.keyboard.press('Enter');
      await expect(page.locator('.lb-current>h3')).toBeFocused();await unchanged(answering);dockChecks.push({phase:'answer',kind:'current',id:'lake',focus:'current move heading'});await scan('active investigation dock returns to the current activity without answering');await reload();await unchanged(answering);
      results.push({...scenario,selectedChoice:selected.id,comparisons,allApproachDraftsWriteNothing:true,targetMemoryVerified:true,privateDraftsResetOnReload:true,oneCommitAndReceiptVerified:true,diceAndMoveUnchangedOnChoice:true,actualReceiptRestored:true,dockChecks,printedCacheGeometry,scans});checkpoint('completed '+name);await context.close();
    }
    expect(errors).toEqual([]);for(const file of ['browser-failure.json','failure-1440.png','failure-390.png','failure-320.png']){const filename=path.join(out,file);if(fs.existsSync(filename))fs.unlinkSync(filename);}
    fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({passed:true,scope:'Frozen production bundle with legal engine-played solo fixtures. Local encounter approach and target comparisons, exact immediate/deferred consequences, one explicit confirmation, reload, and tabletop navigation to existing action controls use real UI. No live AI or classroom services exercised.',bundleSha256,bundleBytes,results,errors},null,2));checkpoint('passed');console.log(JSON.stringify({passed:true,out,bundleSha256,bundleBytes,scenarios:results.length,scans:results.reduce((n,result)=>n+result.scans.length,0)}));
  }catch(error){for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(out,'failure-'+page.viewportSize().width+'.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({message:error.stack,bundleSha256,bundleBytes,results,errors},null,2));checkpoint('failed');throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
