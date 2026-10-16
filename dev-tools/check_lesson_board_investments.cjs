const fs=require('fs'),path=require('path'),{chromium}=require('playwright'),{expect}=require('@playwright/test');
const out=path.resolve('reports/lesson-board-investment-2026-10-14');fs.mkdirSync(out,{recursive:true});
const html='<!doctype html><html lang="en"><head><title>Investment decisions verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
(async()=>{const browser=await chromium.launch({headless:true}),results=[],errors=[];try{
  for(const [width,plan,seed,kit] of [[1440,'balanced',17,'pathfinder'],[390,'research',304,'surveyor'],[320,'shortcut',998,'builder']]){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://tabletop.test/**',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('http://tabletop.test/');
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','lesson_board_module.js',require.resolve('axe-core/axe.min.js')])await page.addScriptTag({path:file});
    await page.evaluate(()=>{window.qaRoot=ReactDOM.createRoot(document.getElementById('root'));window.mount=()=>qaRoot.render(React.createElement(AlloModules.LessonBoardSetup,{inputText:'',appId:'expedition-qa',user:{uid:'u'},allowLive:false,t:key=>key,onClose(){},callGemini(){throw Error('No provider should be called');}}));window.saved=()=>{const title=document.querySelector('[data-board-play] h2')?.textContent;return Object.keys(localStorage).filter(key=>key.startsWith('allo-board-solo-v2:')).map(key=>JSON.parse(localStorage.getItem(key))).find(value=>JSON.parse(value.board).title===title);};window.snapshot=()=>{const value=saved(),board=JSON.parse(value.board),engine=AlloModules.LessonBoardEngine;return {board,run:value.run,p:engine.derive(board,value.run)};};mount();});
    const scans=[];const scan=async label=>{const violations=await page.evaluate(async()=>(await axe.run(document.getElementById('root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current')].some(node=>node.scrollWidth>node.clientWidth+1));expect(violations,label).toEqual([]);expect(overflow,label+' overflow').toBe(false);scans.push({label,violations,overflow});};
    await page.locator('[data-board-sample]').click();await page.locator('[data-expedition-plan='+plan+']').click();await page.locator('[data-expedition-seed]').fill(String(seed));
    await page.locator('[data-expedition-dealer]').scrollIntoViewIfNeeded();await scan('expedition dealer');await page.screenshot({path:path.join(out,width+'-dealer.png')});
    await page.locator('[data-expedition-deal]').click();await expect(page.locator('[data-board-blueprint] h3')).toContainText('Deal '+seed);
    await page.locator('[data-expedition-next]').click();await expect(page.locator('[data-board-blueprint] h3')).toContainText('Deal '+(seed%999+1));
    await page.locator('[data-board-undo]').click();await expect(page.locator('[data-expedition-seed]')).toHaveValue(String(seed));await expect(page.locator('[data-expedition-plan='+plan+']')).toHaveAttribute('aria-pressed','true');
    await page.locator('[data-expedition-kit-option='+kit+'] input').check();await page.locator('[data-board-chance]').uncheck();await page.locator('[data-board-play-solo]').click();
    await expect(page.locator('[data-expedition-brief]')).toBeVisible();await page.getByRole('button',{name:'Board view',exact:true}).click();await expect.poll(()=>page.evaluate(()=>!!saved())).toBe(true);
    const initial=await page.evaluate(()=>snapshot());await expect(page.locator('[data-party-position]')).toHaveAttribute('data-party-position',initial.board.starts[0]);await expect(page.locator('[data-expedition-brief]')).toBeVisible();
    await scan('2D supplies');await page.locator('[data-board-tabletop]').click();const unchanged=await page.evaluate(()=>saved().run);
    for(const angle of ['left','right','angle']){await page.locator('[data-tabletop-camera='+angle+']').click();await scan('3D '+angle);}
    expect(await page.evaluate(()=>saved().run)).toEqual(unchanged);await page.screenshot({path:path.join(out,width+'-3d.png')});await page.locator('[data-board-map]').screenshot({path:path.join(out,width+'-tabletop-board.png')});
    if(width===1440){await page.evaluate(()=>document.body.classList.add('dark'));await scan('dark tabletop');await page.screenshot({path:path.join(out,width+'-3d-dark.png')});await page.evaluate(()=>document.body.classList.remove('dark'));}

    await page.locator('[data-tabletop-close]').click();await expect(page.locator('[data-tabletop-viewport]')).toHaveAttribute('data-zoom','close');
    await page.locator('[data-tabletop-viewport]').focus();await page.keyboard.press('ArrowRight');await scan('close-up tabletop');
    await page.locator('[data-tabletop-center]').click();await page.locator('[data-spatial-board]').screenshot({path:path.join(out,width+'-close-up.png')});
    await page.locator('[data-tabletop-fit]').click();await expect(page.locator('[data-spatial-board]')).toHaveAttribute('data-zoom','fit');
    const beforePlans=await page.evaluate(()=>saved().run);
    await page.locator('[data-open-planning]').click();await page.locator('[data-sandbox-start]').click();
    const first=initial.board.starts[0];await page.locator('[data-sandbox-add="'+first+'"]').click();
    const second=await page.locator('[data-sandbox-add]').evaluateAll(nodes=>nodes.find(n=>!n.closest('[data-sandbox-construction]')).dataset.sandboxAdd);
    await page.locator('[data-sandbox-add="'+second+'"]').click();await page.locator('[data-sandbox-add="'+first+'"]').click();
    await expect(page.locator('[data-sandbox-step="'+first+'"] strong').last()).toContainText('Travel');
    await page.locator('[data-sandbox-copy]').click();await page.locator('[data-sandbox-plan="1"]').click();await page.locator('[data-sandbox-undo]').click();await page.locator('[data-sandbox-undo]').click();
    const alternative=await page.locator('[data-sandbox-add]').evaluateAll((nodes,second)=>nodes.find(n=>!n.closest('[data-sandbox-construction]')&&n.dataset.sandboxAdd!==second)?.dataset.sandboxAdd,second);
    if(alternative)await page.locator('[data-sandbox-add="'+alternative+'"]').click();
    await expect(page.locator('[data-plan-tradeoffs]')).toBeVisible();await scan('route comparison');
    await page.locator('[data-sandbox-route-comparison]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,width+'-route-comparison.png')});
    await page.locator('[data-plan-preview]>summary').click();await expect(page.locator('[data-plan-preview] [data-spatial-board]')).toHaveAttribute('data-spatial-view','tabletop');
    await page.locator('[data-plan-preview-position]').selectOption('0');await expect(page.locator('[data-plan-map] [data-plan-pin]').first()).toBeVisible();await scan('3D route preview');
    await page.locator('[data-plan-preview] [data-spatial-board]').screenshot({path:path.join(out,width+'-route-preview.png')});
    await page.locator('[data-plan-preview-list]').click();await scan('route list preview');
    await page.locator('[data-sandbox-inspect]').click();expect(await page.evaluate(()=>saved().run)).toEqual(beforePlans);
    await expect(page.locator('[data-board-map] [data-plan-pin]')).toHaveCount(0);
    const kinds=new Set(),moves=[],payments=[];let restored=false;
    for(let turn=0;turn<46;turn++){
      let current=await page.evaluate(()=>snapshot());if(current.p.complete)break;
      if(AllPhase(current.run)==='review')await page.locator('[data-board-next]').click();
      const target=await page.evaluate(exchanged=>{const {board,run,p}=snapshot(),e=AlloModules.LessonBoardEngine,targets=e.targets(board,run),fresh=targets.find(node=>!node.cost&&!p.visited.includes(node.id));
        if(p.objectiveReady){return targets.find(node=>node.id===board.starts[0])||targets.find(node=>!node.cost&&node.id!==p.position);}
        const unusedBridge=board.projects.find(project=>project.effect.kind==='path'&&p.built.includes(project.id)&&!p.usedProjects.includes(project.id));
        if(unusedBridge){const site=e.buildSite(board,unusedBridge);const cross=targets.find(node=>node.id===(p.position===site?unusedBridge.effect.targetId:site));if(cross)return cross;}
        const builds=targets.filter(node=>node.cost),exchange=builds.find(node=>e.constructionFunding(board,run,node.id).some(option=>option.id!=='standard'&&option.legal));
        if(!exchanged&&exchange)return exchange;if(exchanged&&builds.length)return builds[0];
        const funded=board.projects.find(project=>!p.built.includes(project.id)&&e.constructionFunding(board,run,project.id).some(option=>option.legal&&(exchanged||option.id!=='standard')));
        if(funded){const site=e.buildSite(board,funded),move=targets.find(node=>node.id===site);if(move)return move;}
        return fresh||builds[0];
      },payments.some(payment=>payment.funding!=='standard'));
      expect(target,'progress move').toBeTruthy();moves.push(target.id);
      await page.locator('[data-ready-move="'+target.id+'"]').click();
      if(target.cost){
        const options=await page.evaluate(id=>{const {board,run}=snapshot();return AlloModules.LessonBoardEngine.constructionFunding(board,run,id);},target.id),payment=options.find(option=>option.legal&&option.id!=='standard')||options.find(option=>option.legal);

        if(!payments.length){
          const real=await page.evaluate(()=>saved().run);
          await page.locator('.lb-current [data-funding-option="'+payment.id+'"] input').check();
          await page.locator('[data-construction-investment]>summary').click();await expect(page.locator('[data-investment-compare]')).toBeVisible();
          await scan('investment comparison');await page.locator('[data-construction-investment]').screenshot({path:path.join(out,width+'-investment-choice.png')});
          await page.locator('[data-investment-compare]').click();await expect(page.locator('[data-board-sandbox]')).toHaveAttribute('open','');
          await expect(page.locator('[data-sandbox-comparison="0"]')).toContainText('3 planned moves');await expect(page.locator('[data-sandbox-comparison="1"]')).toContainText('3 planned moves');
          await page.locator('[data-sandbox-plan="1"]').click();await expect(page.locator('[data-sandbox-step="'+target.id+'"]')).toHaveCount(1);
          await page.locator('[data-sandbox-plan="0"]').click();if(!await page.locator('[data-plan-preview]').evaluate(node=>node.open))await page.locator('[data-plan-preview]>summary').click();await page.locator('[data-plan-preview-position]').selectOption('1');
          await expect(page.locator('[data-plan-preview-selection]')).toContainText(target.name);await scan('construction payment preview');
          await page.locator('[data-sandbox-step="'+target.id+'"]').screenshot({path:path.join(out,width+'-planned-payment.png')});
          await page.locator('[data-sandbox-inspect]').click();expect(await page.evaluate(()=>saved().run)).toEqual(real);
          await expect(page.locator('.lb-current [data-funding-option="'+payment.id+'"] input')).toBeChecked();
        }
        const before=await page.evaluate(()=>saved().run);await page.locator('.lb-current [data-funding-option='+payment.id+'] input').check();expect(await page.evaluate(()=>saved().run)).toEqual(before);
        await page.locator('.lb-current [data-construction-funding]').scrollIntoViewIfNeeded();await scan('construction funding '+target.id);await page.screenshot({path:path.join(out,width+'-funding.png')});
        const prior=await page.evaluate(()=>snapshot().p);await page.locator('[data-board-move="'+target.id+'"]').click();const after=await page.evaluate(()=>snapshot().p),delta=after.balance.map((n,i)=>n-prior.balance[i]);
        expect(delta).toEqual(payment.cost.map((cost,i)=>-cost+(after.kitGains?.[i]||0)-(prior.kitGains?.[i]||0)));payments.push({id:target.id,funding:payment.id,cost:payment.cost});if(target.effect.kind==='path')await page.locator('[data-board-map]').screenshot({path:path.join(out,width+'-built-bridge.png')});
        if(payment.id!=='standard')await expect(page.locator('[data-funding-receipt]')).toBeVisible();
      }else{
        await page.locator('[data-board-move="'+target.id+'"]').click();
        if(AllPhase((await page.evaluate(()=>saved())).run)==='answer'){
          kinds.add(target.kind);
          if(['classify','place','connect'].includes(target.kind)){const answers=target.connections||target.placements;for(let i=0;i<answers.length;i++){await page.locator('[data-challenge-piece="'+i+'"]').click();await page.locator('[data-challenge-destination="'+answers[i]+'"]').click();}}
          else if(target.kind==='allocate'){for(let i=0;i<target.allocation.length;i++)for(let n=0;n<target.allocation[i];n++){await page.locator('[data-allocation-add="'+i+'"]').focus();await page.keyboard.press('Enter');}}
          else if(target.kind==='repair'){for(let i=0;i<target.repairs.length;i++)await page.locator('[data-repair-'+(target.repairs[i]?'mark':'keep')+'="'+i+'"]').click();}
          else if(target.kind==='choice')await page.locator('[data-board-choice]').selectOption(String(target.answer));
          else if(target.kind==='settings')for(let i=0;i<target.controls.length;i++)await page.locator('[data-board-control="'+i+'"]').selectOption(String(target.controls[i].answer));
          else for(let i=0;i<target.order.length;i++)while((await page.locator('.lb-order [data-board-up]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.boardUp)))).indexOf(target.order[i])>i)await page.locator('[data-board-up="'+target.order[i]+'"]').click();
          await scan(target.kind+' challenge');await page.locator('[data-board-submit]').click();
        }
      }
      if(!restored&&payments.some(payment=>payment.funding!=='standard')){const savedRun=await page.evaluate(()=>saved().run);await page.locator('[data-tabletop-game-menu]>summary').click();await page.getByRole('button',{name:'Back to board setup',exact:true}).click();await page.getByRole('button',{name:'Resume solo board',exact:true}).click();expect(await page.evaluate(()=>saved().run)).toEqual(savedRun);restored=true;}
    }
    const final=await page.evaluate(()=>snapshot());expect(final.p.complete).toBe(true);expect(kinds.size).toBe(8);expect(final.p.position).toBe(final.board.starts[0]);expect(final.p.completedContracts).toHaveLength(3);expect(payments.some(payment=>payment.funding!=='standard')).toBe(true);expect(restored).toBe(true);
    await scan('completed expedition');await page.screenshot({path:path.join(out,width+'-completed.png')});
    const finished=await page.evaluate(()=>saved().run);await page.locator('[data-tabletop-game-menu]>summary').click();await page.getByRole('button',{name:'Back to board setup',exact:true}).click();await page.locator('[data-expedition-next]').click();await page.locator('[data-board-play-solo]').click();await page.getByRole('button',{name:'Board view',exact:true}).click();expect((await page.evaluate(()=>saved().run)).turn).toBe(0);
    await page.locator('[data-tabletop-game-menu]>summary').click();await page.getByRole('button',{name:'Back to board setup',exact:true}).click();await page.locator('[data-board-undo]').click();await page.locator('[data-board-play-solo]').click();expect(await page.evaluate(()=>saved().run)).toEqual(finished);
    results.push({width,plan,seed,kit,challengeKinds:[...kinds],moves,payments,restored,investmentComparison:true,separateDealSave:true,completed:true,scans});await context.close();
  }
  expect(errors).toEqual([]);fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({passed:true,scope:'Local production bundle in Chromium. No live provider or service.',results,errors},null,2));console.log(JSON.stringify({passed:true,out,results}));
}catch(error){for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(out,'failure-'+page.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({message:error.stack,results,errors},null,2));throw error;}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
function AllPhase(run){return run.steps['t'+run.turn]?.phase||'choose';}
