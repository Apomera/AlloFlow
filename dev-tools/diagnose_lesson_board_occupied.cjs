const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium}=require('playwright'),{expect}=require('@playwright/test');
const {makeBoard,source}=require('./fixtures/lesson_board.cjs');
const out=path.resolve('reports/lesson-board-relays-2026-10-15/occupied-diagnostic');fs.mkdirSync(out,{recursive:true});
const bundle=fs.readFileSync('lesson_board_module.js','utf8'),bundleSha256=crypto.createHash('sha256').update(bundle).digest('hex'),bundleBytes=Buffer.byteLength(bundle);
const helpers=require('esbuild').buildSync({stdin:{contents:"export {saveBoard,saveSolo,readSolo,soloWorkspace} from './lesson_board_storage.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'RelayQA'}).outputFiles[0].text;
const html='<!doctype html><html lang="en"><head><title>Two-stop relay verification</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f7fc;font-family:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><main id="root"></main></body></html>';
const scripts=['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',require.resolve('axe-core/axe.min.js')];
const filterWidth=Number(process.env.RELAY_WIDTH||0),scenarios=[{width:1440,theme:'river'},{width:390,theme:'garden'},{width:320,theme:'space'}].filter(item=>item.width===1440);
if(!scenarios.length)throw Error('RELAY_WIDTH must name a configured width: 1440, 390 or 320.');
(async()=>{
  const browser=await chromium.launch({headless:true}),results=[],errors=[];
  const checkpoint=status=>fs.writeFileSync(path.join(out,'browser-progress.json'),JSON.stringify({status,updatedAt:new Date().toISOString(),bundleSha256,bundleBytes,results,errors},null,2));
  try{
    for(const scenario of scenarios){
      const {width,theme}=scenario,name=width+'-'+theme;console.log('Checking two-stop relays '+name);checkpoint('running '+name);
      const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
      await page.route('http://relays.test/**',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('http://relays.test/');
      const addScripts=async()=>{for(const file of scripts)await page.addScriptTag({path:file});await page.addScriptTag({content:bundle});await page.addScriptTag({content:helpers});};await addScripts();
      const base={...makeBoard(),theme,playStyle:'tabletop',goal:'expedition',travelLimit:3,chance:true};base.edges=base.locations.slice(1).map((node,index)=>[base.locations[index].id,node.id]);
      await page.evaluate(({base,source})=>{
        const e=AlloModules.LessonBoardEngine;window.qaBoard=e.prepareBoard(base,source);let run=e.emptyRun();
        for(const [index,id]of ['heater','cloud','river','rain','lake'].entries()){
          if(index)run=e.merge(run,e.advance(qaBoard,run));run=e.merge(run,e.begin(qaBoard,run,id));if(e.stepOf(run).phase!=='answer')throw Error('Illegal relay fixture investigation: '+id);
          run=e.merge(run,e.processAction(qaBoard,run,{attemptId:'qa',turn:run.turn,requestId:e.requestId(run),kind:'answer',targetId:id,value:e.solution(qaBoard.locations.find(node=>node.id===id))},'solo',{attemptId:'qa',active:true}));run=e.merge(run,e.resolve(qaBoard,run,{solo:{}},{dice:[index===4?11:1,index===4?11:1]}));
          if(index<4&&e.fieldOpportunity(qaBoard,run)?.pending)run=e.merge(run,e.chooseFieldOpportunity(qaBoard,run,'collect'));
        }
        const card=e.fieldOpportunity(qaBoard,run);if(!card?.pending||card.relays?.length!==2)throw Error('Legal fixture did not produce two relay orders.');
        RelayQA.saveBoard(localStorage,source,'English',qaBoard);if(RelayQA.saveSolo(localStorage,qaBoard,'relay-qa','u',{run,workspace:RelayQA.soloWorkspace(qaBoard,run)}).status!=='saved')throw Error('Could not save relay fixture.');
      },{base,source});
      const mount=async()=>page.evaluate(({base,source})=>{
        const e=AlloModules.LessonBoardEngine;window.qaBoard=e.prepareBoard(base,source);window.snapshot=()=>{const run=RelayQA.readSolo(localStorage,qaBoard,'relay-qa','u').run;return{run,progress:e.derive(qaBoard,run)};};window.relayCard=()=>e.fieldOpportunity(qaBoard,snapshot().run);
        window.qaRoot=ReactDOM.createRoot(document.getElementById('root'));qaRoot.render(React.createElement(AlloModules.LessonBoardSetup,{inputText:source,appId:'relay-qa',user:{uid:'u'},allowLive:false,t:key=>key,onClose(){},callGemini(){throw Error('QA must not call a provider.');}}));
      },{base,source});await mount();
      const map=page.locator('[data-spatial-board]').first(),scans=[],read=()=>page.evaluate(()=>snapshot());
      const open=async()=>{await page.locator('[data-board-play-solo]').click();await page.locator('[data-board-tabletop]').click();};
      const unchanged=async before=>expect(await read()).toEqual(before);
      const scan=async label=>{
        const violations=await page.evaluate(async()=>(await axe.run(document.getElementById('root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(node=>node.target)})));
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('.lb-dialog,[data-spatial-board],.lb-current,[data-field-relay-offer],[data-field-relay-active],[data-tabletop-relay]')].some(node=>node.scrollWidth>node.clientWidth+1));
        const overlaps=await map.evaluate(board=>{if(board.dataset.spatialView==='list'||board.dataset.zoom!=='fit')return[];const locations=[...board.querySelectorAll('[data-location]')],projects=[...board.querySelectorAll('[data-map-construction]')];const pairs=locations.flatMap((item,index)=>locations.slice(index+1).map(other=>[item,other])).concat(projects.flatMap(item=>locations.map(other=>[item,other])));return pairs.flatMap(([first,second])=>{const a=first.getBoundingClientRect(),b=second.getBoundingClientRect(),width=Math.min(a.right,b.right)-Math.max(a.left,b.left),height=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);return width>1&&height>1?[{first:first.dataset.location||first.dataset.mapConstruction,second:second.dataset.location,width,height}]:[];});});
        expect(violations,label).toEqual([]);expect(overflow,label+' overflow').toBe(false);expect(overlaps,label+' tile overlap').toEqual([]);scans.push({label,violations,overflow,overlaps});
      };
      const shoot=async(locator,suffix)=>{const box=await locator.boundingBox();if(!box)throw Error('Screenshot target not visible: '+suffix);await page.setViewportSize({width,height:Math.min(4500,Math.max(1200,Math.ceil(box.height)+100))});await locator.screenshot({path:path.join(out,name+'-'+suffix+'.png')});await page.setViewportSize({width,height:1000});};
      const checkBalance=async values=>{for(const [index,value]of values.entries())await expect(page.locator('[data-board-mission] [data-resource-count="'+index+'"]').first()).toHaveText(String(value));};
      const travel=async targetId=>{await page.locator('[data-board-next]').click();await page.locator('[data-ready-move="'+targetId+'"]').click();await page.locator('[data-board-move="'+targetId+'"]').click();await expect(map.locator('[aria-current=location]')).toHaveAttribute('data-location',targetId);};
      const reload=async()=>{const before=await read();await page.reload();await addScripts();await mount();await open();await unchanged(before);};
      await open();const initial=await read(),card=await page.evaluate(()=>relayCard()),selected=card.relays[1],first=selected.stops[0],second=selected.stops[1];expect(card.id).toBe('passage');expect(initial.progress.position).toBe('lake');
      await page.locator('[data-field-approach=relay]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-field-relay-offer]')).toBeVisible();
      for(const offer of card.relays){await page.locator('[data-field-relay-option="'+offer.id+'"]').click();await expect(page.locator('[data-field-relay-preview]')).toHaveAttribute('data-field-relay-preview',offer.id);for(const stop of offer.stops)for(const [index,reward]of stop.reward.entries())if(reward)await expect(page.locator('[data-relay-stop="'+stop.targetId+'"]')).toContainText('+'+reward+' '+base.resources[index]);await unchanged(initial);}
      await page.locator('[data-field-approach=collect]').click();await unchanged(initial);await page.locator('[data-field-approach=relay]').click();await expect(page.locator('[data-field-relay-option="'+selected.id+'"]').first()).toBeChecked();await unchanged(initial);
      await page.locator('[data-field-relay-inspect="'+second.targetId+'"]').click();await unchanged(initial);await expect(page.locator('[data-field-relay-commit]')).toBeVisible();await checkBalance(initial.progress.balance);await scan('private route comparisons and station inspection leave the saved run unchanged');await shoot(page.locator('[data-field-relay-offer]'),'relay-offer');
      await page.locator('[data-field-relay-commit]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-field-relay-receipt]')).toBeVisible();await expect(page.locator('[data-field-receipt] h4')).toBeFocused();const accepted=await read();
      expect(accepted.progress.balance).toEqual(initial.progress.balance);expect(accepted.progress.position).toBe(initial.progress.position);expect(accepted.run.turn).toBe(initial.run.turn);expect(accepted.progress.fieldRelay).toMatchObject({stage:0,targetId:first.targetId,stops:selected.stops});expect(await page.evaluate(()=>AlloModules.LessonBoardEngine.stepOf(snapshot().run).result.dice)).toEqual(initial.run.steps['t'+initial.run.turn].result.dice);await checkBalance(initial.progress.balance);await scan('acceptance saves only the chosen order and focuses a no-payout receipt');

      const lake=map.locator('[data-location="lake"]');
      const before=await read();
      const details=async label=>({label,...await lake.evaluate(tile=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};const style=n=>{const s=getComputedStyle(n);return {node:n.tagName,class:n.className,rect:rect(n),display:s.display,visibility:s.visibility,opacity:s.opacity,transform:s.transform,transformStyle:s.transformStyle,zIndex:s.zIndex,background:s.backgroundColor,backface:s.backfaceVisibility,contain:s.contain,isolation:s.isolation,filter:s.filter,clipPath:s.clipPath}};const parents=[];for(let n=tile;n&&parents.length<6;n=n.parentElement)parents.push(style(n));const r=tile.getBoundingClientRect();return {tile:tile.outerHTML,parents,hit:document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2).slice(0,8).map(n=>({node:n.tagName,class:n.className,location:n.dataset.location}))}})});
      const evidence=[];await shoot(map,'baseline-stage-0');evidence.push(await details('baseline'));
      await page.evaluate(()=>{document.querySelector('[data-position-disc="lake"]').style.display='none'});await shoot(map,'disc-hidden');evidence.push(await details('disc hidden'));await page.evaluate(()=>{document.querySelector('[data-position-disc="lake"]').style.display=''});
      await lake.evaluate(tile=>tile.style.zIndex='1');await shoot(map,'button-z-index-1');evidence.push(await details('button z-index 1'));await lake.evaluate(tile=>tile.style.zIndex='');
      await lake.evaluate(tile=>tile.style.transform='translateZ(10px)');await shoot(map,'button-z-10');evidence.push(await details('button translateZ 10'));await lake.evaluate(tile=>tile.style.transform='');
      await lake.evaluate(tile=>tile.parentElement.style.transformStyle='flat');await shoot(map,'space-flat');evidence.push(await details('space flat'));await lake.evaluate(tile=>tile.parentElement.style.transformStyle='');
      await map.locator('[data-tabletop-camera=overhead]').click();await shoot(map,'overhead');evidence.push(await details('overhead'));await map.locator('[data-tabletop-camera=angle]').click();await shoot(map,'angled-again');evidence.push(await details('angled again'));
      await unchanged(before);fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({bundleSha256,evidence,errors},null,2));await context.close();console.log('Occupied tile diagnostic saved '+out);
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
