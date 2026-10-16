const fs = require('fs'), path = require('path'), {chromium} = require('playwright'), {expect} = require('@playwright/test');
const out = path.resolve('reports/lesson-board-strategy-depth-2026-10-14');
fs.mkdirSync(out, {recursive:true});
const html = '<!doctype html><html lang="en"><head><title>Tabletop expedition verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
(async () => {
  const browser = await chromium.launch({headless:true}), results = [], errors = [];
  try {
    for (const width of [1440,390,320]) {
      const context = await browser.newContext({viewport:{width,height:960}, reducedMotion:'reduce'}), page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => errors.push(error.message));
      await page.route('http://tabletop.test/**', route => route.fulfill({contentType:'text/html',body:html}));
      await page.goto('http://tabletop.test/');
      await page.addScriptTag({path:'desktop/web-app/node_modules/react/umd/react.development.js'});
      await page.addScriptTag({path:'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'});
      await page.addScriptTag({path:'lesson_board_module.js'});
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      await page.evaluate(() => {
        window.qaRoot = ReactDOM.createRoot(document.getElementById('root'));
        window.mount = () => qaRoot.render(React.createElement(AlloModules.LessonBoardSetup,{inputText:'',appId:'tabletop-qa',user:{uid:'u'},allowLive:false,t:key=>key,onClose(){},callGemini(){throw Error('Sample must not call an AI provider');}}));
        window.saved = () => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key=>key.startsWith('allo-board-solo-v2:'))));
        window.progress = () => {const value=saved();return AlloModules.LessonBoardEngine.derive(JSON.parse(value.board),value.run);};
        mount();
      });
      await page.locator('[data-board-sample]').click();
      const kit=width===1440?'pathfinder':width===390?'surveyor':'builder';
      await page.locator('[data-expedition-kit-option='+kit+'] input').check();
      await page.locator('[data-board-chance]').uncheck();
      await page.locator('[data-board-play-solo]').click();
      await expect(page.locator('[data-expedition-kit-hud]')).toHaveAttribute('data-expedition-kit-hud',kit);
      await expect(page.locator('[data-party-position]')).toHaveAttribute('data-party-position','camp');
      const scans=[];
      const scan=async label=>{
        const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})));
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current')].some(node=>node.scrollWidth>node.clientWidth+1));
        expect(violations,label).toEqual([]);expect(overflow,label+' overflow').toBe(false);scans.push({label,violations,overflow});
      };
      await scan('2D board');
      const boardTop=await page.locator('[data-board-map]').evaluate(node=>node.getBoundingClientRect().top);
      expect(boardTop).toBeLessThan(720);
      await page.screenshot({path:path.join(out,width+'-2d.png')});
      await page.locator('[data-board-tabletop]').click();
      await expect(page.locator('[data-spatial-view=tabletop]')).toBeVisible();
      await scan('3D board');
      const cameraRun=await page.evaluate(()=>saved().run);
      for(const camera of ['left','right','angle']){await page.locator('[data-tabletop-camera='+camera+']').click();await scan('3D camera '+camera);}
      expect(await page.evaluate(()=>saved().run)).toEqual(cameraRun);
      await page.screenshot({path:path.join(out,width+'-3d.png')});
      if(width===1440){
        await page.evaluate(()=>document.body.classList.add('dark'));
        await scan('dark 3D board');
        await page.screenshot({path:path.join(out,width+'-3d-dark.png')});
        await page.evaluate(()=>document.body.classList.remove('dark'));
      }
      const beforeViews=await page.evaluate(()=>saved().run);
      await page.getByRole('button',{name:'Location list',exact:true}).click();
      await expect(page.locator('[data-spatial-view=list]')).toBeVisible();
      expect(await page.evaluate(()=>saved().run)).toEqual(beforeViews);
      await page.getByRole('button',{name:'Board view',exact:true}).click();
      await page.locator('[data-open-contracts]').click();
      const contractGoal=await page.locator('[data-track-contract]').first().getAttribute('data-track-contract');
      await page.locator('[data-track-contract]').first().click();
      await expect(page.locator('[data-tracked-contract]')).toHaveAttribute('data-tracked-contract',contractGoal);
      expect(await page.evaluate(()=>saved().workspace.contractGoal)).toBe(contractGoal);
      await expect(page.locator('[data-contract-destination=true]')).toHaveCount(2);
      await scan('tracked contract cards');
      await page.screenshot({path:path.join(out,width+'-contracts.png')});
      await page.locator('[data-board-move=camp]').click();
      await expect(page.locator('[data-board-challenge=classify]')).toBeVisible();
      await page.locator('.lb-current > h3').evaluate(node=>node.scrollIntoView({block:'start'}));
      await page.screenshot({path:path.join(out,width+'-sorting.png')});
      const answers = [2,0,1,2];
      for(let index=0;index<answers.length;index++){
        await page.locator('[data-challenge-piece="'+index+'"]').click();
        await page.locator('[data-challenge-destination="'+answers[index]+'"]').focus();
        await page.keyboard.press('Enter');
      }
      await page.locator('[data-challenge-undo]').click();
      await expect(page.locator('.lb-placement-status')).toContainText('3/4');
      await page.locator('[data-challenge-piece="3"]').click();
      await page.locator('[data-challenge-destination="2"]').click();
      await page.locator('[data-challenge-clear]').click();
      await expect(page.locator('.lb-placement-status')).toContainText('0/4');
      await page.locator('[data-challenge-undo]').click();
      await expect(page.locator('.lb-placement-status')).toContainText('4/4');
      await scan('keyboard sorting challenge');
      await page.locator('[data-board-submit]').click();
      await expect(page.locator('[data-challenge-feedback]')).toContainText('4/4');
      const beforeResume=await page.evaluate(()=>saved().run);
      await page.locator('[data-tabletop-game-menu] > summary').click();
      await page.getByRole('button',{name:'Back to board setup',exact:true}).click();
      await page.getByRole('button',{name:'Resume solo board',exact:true}).click();
      expect(await page.evaluate(()=>saved().run)).toEqual(beforeResume);
      expect(await page.evaluate(()=>saved().workspace.contractGoal)).toBe(contractGoal);
      {
        const kinds=new Set(['classify']),moves=[];
        let motionChecked=false,rewardChecked=false;
        if(width===1440){
          await page.emulateMedia({reducedMotion:'no-preference'});
          await page.evaluate(()=>{window.motionSamples=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.matches('[data-party-pawn]'))motionSamples.push({frames,options});return original.call(this,frames,options);};});
        }
        for(let guard=0;guard<45;guard++){
          const current=await page.evaluate(()=>{const value=saved(),board=JSON.parse(value.board),e=AlloModules.LessonBoardEngine;return {board,run:value.run,p:e.derive(board,value.run)};});
          if(current.p.complete)break;
          await page.locator('[data-board-next]').click();
          const target=await page.evaluate(()=>{
            const value=saved(),board=JSON.parse(value.board),e=AlloModules.LessonBoardEngine,p=e.derive(board,value.run),targets=e.targets(board,value.run);
            if(p.objectiveReady)return targets.find(item=>item.id===board.starts[0]);
            const build=targets.find(item=>item.cost);if(build)return build;
            const funded=board.projects.find(item=>!p.built.includes(item.id)&&item.cost.every((n,i)=>n<=p.balance[i]));
            if(funded){const site=e.buildSite(board,funded),move=targets.find(item=>item.id===site);if(move)return move;}
            return targets.find(item=>!item.cost&&!p.visited.includes(item.id));
          });
          expect(target,'legal progress move').toBeTruthy();moves.push(target.id);
          await page.locator(target.cost?'[data-map-construction="'+target.id+'"]':'[data-location="'+target.id+'"]').click();
          await page.locator('[data-board-move="'+target.id+'"]').click();
          if(width===1440&&!motionChecked&&!target.cost&&current.p.position!==target.id){
            const motion=await page.evaluate(()=>motionSamples.at(-1));
            expect(motion.frames.length).toBeGreaterThan(1);
            expect(motion.options.duration).toBeLessThanOrEqual(1400);
            const route=(await page.locator('[data-party-pawn]').getAttribute('data-party-route')).split(',');
            expect(route[0]).toBe(current.p.position);expect(route.at(-1)).toBe(target.id);expect(motion.frames).toHaveLength(route.length);
            await page.emulateMedia({reducedMotion:'reduce'});
            await expect(page.locator('[data-party-pawn]')).toHaveAttribute('data-party-moving','false');
            motionChecked=true;
          }
          const active=await page.evaluate(()=>{const value=saved();return AlloModules.LessonBoardEngine.stepOf(value.run).phase==='answer';});
          if(active){
            kinds.add(target.kind);
            if(['classify','connect','place'].includes(target.kind)){
              const solution=target.connections||target.placements;
              for(let index=0;index<solution.length;index++){await page.locator('[data-challenge-piece="'+index+'"]').click();await page.locator('[data-challenge-destination="'+solution[index]+'"]').click();}
            }else if(target.kind==='allocate'){
              for(let index=0;index<target.allocation.length;index++)for(let count=0;count<target.allocation[index];count++){await page.locator('[data-allocation-add=\"'+index+'\"]').focus();await page.keyboard.press('Enter');}
              await expect(page.locator('[data-allocation-budget]')).toContainText('0 of 6');
              await page.locator('[data-puzzle-undo]').click();await expect(page.locator('[data-board-submit]')).toBeDisabled();
              await page.locator('[data-allocation-add=\"2\"]').click();
            }else if(target.kind==='repair'){
              await expect(page.locator('[data-board-submit]')).toBeDisabled();
              for(let index=0;index<target.repairs.length;index++)await page.locator('[data-repair-'+(target.repairs[index]?'mark':'keep')+'=\"'+index+'\"]').click();
              await expect(page.locator('[data-repair-correction]')).toHaveCount(0);
            }else if(target.kind==='choice')await page.locator('[data-board-choice]').selectOption(String(target.answer));
            else if(target.kind==='settings')for(let index=0;index<target.controls.length;index++)await page.locator('[data-board-control="'+index+'"]').selectOption(String(target.controls[index].answer));
            else for(let index=0;index<target.order.length;index++){
              const item=target.order[index];
              while((await page.locator('.lb-order [data-board-up]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.boardUp)))).indexOf(item)>index)await page.locator('[data-board-up="'+item+'"]').click();
            }
            if(['connect','place','allocate','repair'].includes(target.kind)){
              await page.locator('.lb-current > h3').evaluate(node=>node.scrollIntoView({block:'start'}));
              await scan(target.kind+' challenge');
              await page.screenshot({path:path.join(out,width+'-'+target.kind+'.png')});
            }
            await page.locator('[data-board-submit]').click();
          }
          if(!rewardChecked&&await page.locator('[data-contract-reward]').count()){
            await page.locator('[data-contract-reward]').scrollIntoViewIfNeeded();
            await scan('contract bonus awarded');
            await page.screenshot({path:path.join(out,width+'-contract-reward.png')});rewardChecked=true;
          }
          await expect(page.locator('[data-solo-save-status]')).toContainText('saved on this device');
        }
        expect(await page.evaluate(()=>progress().complete)).toBe(true);
        expect(kinds.size).toBe(8);
        expect((await page.evaluate(()=>progress().kitGains)).reduce((a,b)=>a+b,0)).toBe(4);
        expect((await page.evaluate(()=>progress().completedContracts)).length).toBe(3);
        expect((await page.evaluate(()=>progress().contractGains)).reduce((a,b)=>a+b,0)).toBeGreaterThan(0);
        expect(rewardChecked).toBe(true);if(width===1440)expect(motionChecked).toBe(true);
        expect((await page.evaluate(()=>progress().usedProjects)).length).toBeGreaterThan(0);
        await expect(page.locator('[data-party-position]')).toHaveAttribute('data-party-position','camp');
        await scan('completed expedition');
        await page.screenshot({path:path.join(out,width+'-completed.png')});
        const completedSave=await page.evaluate(()=>saved().run);
        await page.locator('[data-tabletop-game-menu] > summary').click();
        await page.getByRole('button',{name:'Back to board setup',exact:true}).click();
        await page.locator('[data-board-play-style]').selectOption('exploration');
        await expect(page.locator('[data-expedition-kit-picker]')).toHaveCount(0);
        await page.locator('[data-board-undo]').click();
        await expect(page.locator('[data-expedition-kit-option='+kit+'] input')).toBeChecked();
        await page.locator('[data-board-play-solo]').click();
        expect(await page.evaluate(()=>saved().run)).toEqual(completedSave);
        results.push({width,kit,boardTop,scans,moves,challengeKinds:[...kinds],completed:true,resume:true,rewardChecked,motionChecked});
      }
      await context.close();
    }
    expect(errors).toEqual([]);
    fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({passed:true,scope:'Production UI in local Chromium. No AI provider or live service used.',results,errors},null,2));
    console.log(JSON.stringify({passed:true,out,results}));
  }catch(error){
    for(const context of browser.contexts())for(const page of context.pages())await page.screenshot({path:path.join(out,'failure-'+page.viewportSize().width+'.png'),fullPage:true}).catch(()=>{});
    fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({message:error.stack,results,errors},null,2));throw error;
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
