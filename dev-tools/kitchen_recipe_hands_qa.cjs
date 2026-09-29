/* Real-pointer and keyboard checks for the direct-manipulation recipe workflow. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test'),cook=require('./kitchen_recipe_fixture.cjs');
const url=process.env.KITCHEN_RECIPE_URL||'http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html';
const out=path.resolve(process.env.KITCHEN_QA_OUT||'reports/kitchen-hands-on-2026-09-26');fs.mkdirSync(out,{recursive:true});
const edgesOnly=process.argv.includes('--edges-only'),result={checks:[],accessibility:[],errors:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:1050},reducedMotion:'reduce'});page.on('pageerror',e=>result.errors.push(e.message));
  await page.goto(url);await page.locator('#recipeScene > canvas').waitFor();
  const current=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow-kitchen-recipes-v1')).current);
  async function station(zone){await page.locator('[data-bench='+zone+']').click();}
  async function transfer(item,target,method='drag'){
   const source=page.locator('[data-hand-item='+item+']'),dest=page.locator('[data-hand-target='+target+']');
   if(method==='keyboard'){await source.focus();await page.keyboard.press('Enter');await dest.focus();await page.keyboard.press('Enter');return;}
   await page.locator('.hands-workbench').evaluate(e=>e.scrollIntoView({block:'center'}));
   const a=await source.boundingBox(),b=await dest.boundingBox();assert.ok(a&&b);
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:14});await page.mouse.up();
  }
  async function stroke(x,finalX=x,endY=118){
   const board=page.locator('#cutBoardSvg');await board.scrollIntoViewIfNeeded();const b=await board.boundingBox();
   await page.mouse.move(b.x+x/460*b.width,b.y+20/155*b.height);await page.mouse.down();await page.mouse.move(b.x+finalX/460*b.width,b.y+endY/155*b.height,{steps:12});await page.mouse.up();
   if(process.env.DEBUG_KITCHEN)console.log('stroke',b,x,finalX,endY,await page.locator('#knifeGestureStatus').innerText(),(await current()).prep);
  }
  async function mix(){
   await page.locator('#showMixPan').click();const svg=page.locator('#mixSvg');await svg.scrollIntoViewIfNeeded();const b=await svg.boundingBox();
   const p=a=>({x:b.x+(145+65*Math.cos(a))/360*b.width,y:b.y+(130+65*Math.sin(a))/260*b.height});
   const first=p(0);await page.mouse.move(first.x,first.y);await page.mouse.down();for(let i=1;i<=38;i++){const q=p(i*Math.PI*2/36);await page.mouse.move(q.x,q.y);}await page.mouse.up();
  }
  async function pour(amount,keyboard=false){
   await page.locator('#showSavedWater').click();const start=await current(),before=start.pan.waterAdded,jug=page.locator('#handsJug');await jug.scrollIntoViewIfNeeded();
   if(keyboard){await jug.focus();await page.keyboard.down('Space');}
   else{const b=await jug.boundingBox();await page.mouse.move(b.x+b.width*.4,b.y+b.height*.45);await page.mouse.down();await page.mouse.move(b.x+b.width*.5,b.y+b.height*.45,{steps:8});}
   await page.waitForFunction(n=>JSON.parse(localStorage.getItem('alloflow-kitchen-recipes-v1')).current.pan.waterAdded>=n,before+amount,{polling:10,timeout:12000});
   if(keyboard)await page.keyboard.up('Space');else await page.mouse.up();
   // The browser may release just after another real-time dose. Check conservation
   // and stopped flow instead of assuming the automation has zero input latency.
   const stopped=await current(),transferred=stopped.pan.waterAdded-before;assert.ok(transferred>=amount);assert.equal(transferred%10,0);assert.equal(stopped.pot.reserve,start.pot.reserve-transferred);assert.equal(stopped.log.at(-1).interaction,'tilt');await page.waitForTimeout(250);assert.equal((await current()).pan.waterAdded,stopped.pan.waterAdded);
  }
  if(!edgesOnly){
  await station('pot');await transfer('water','pan');assert.equal((await current()).pot.water,0);assert.equal((await current()).log.length,0);
  await page.keyboard.press('Escape');await transfer('water','pot');assert.equal((await current()).pot.water,1200);assert.equal((await current()).log.at(-1).interaction,'drag');
  await transfer('pasta','pot');assert.equal((await current()).pot.pasta,false);assert.equal((await current()).log.at(-1).accepted,false);
  await page.locator('#handsDialpot').focus();await page.keyboard.press('End');assert.equal((await current()).pot.heat,3);assert.equal(await page.locator('#quickPotHeat').inputValue(),'3');
  await page.screenshot({path:path.join(out,'workbench-desktop.png')});
  result.checks.push('Real ingredient drags enforce destinations and recipe prerequisites; keyboard dials synchronize all burner controls.');
  await page.locator('#newCook').click();for(const a of ['wash','rinse'])await page.locator('[data-bench-action='+a+']').click();
  if(process.env.DEBUG_KITCHEN)await page.evaluate(()=>{for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','gotpointercapture'])document.getElementById('cutBoardSvg').addEventListener(type,e=>{console.log('pointer',type,e.target.tagName,e.clientX,e.clientY,document.getElementById('cutBoardSvg').hasPointerCapture(e.pointerId));},true);});
  if(process.env.DEBUG_KITCHEN)page.on('console',m=>console.log(m.text()));
  const beforeCut=(await current()).log.length;await stroke(80,140);await stroke(80,80,80);assert.equal((await current()).log.length,beforeCut);
  await stroke(80);assert.deepEqual((await current()).prep.cuts,[5,35]);assert.equal((await current()).log.at(-1).interaction,'knife-stroke');
  result.checks.push('Partial strokes and sideways scrubbing cannot cut; a downward stroke records the measured pieces.');
  const zones={wash:'prep',rinse:'prep',cut:'prep',dry:'prep',garlicPrep:'prep',measure:'prep',panSize:'prep',fill:'pot',potHeat:'pot',pasta:'pot',stirPot:'pot',sample:'pot',reserve:'pot',drain:'pot',panHeat:'pan',oil:'pan',produce:'pan',garlic:'pan',stirPan:'pan',water:'pan',combine:'finish',taste:'finish',plate:'finish'};
  const transfers={fill:['water','pot'],oil:['oil','pan'],produce:['produce','pan'],garlic:['garlic','pan'],pasta:['pasta','pot'],sample:['spoon','pot'],reserve:['cup','pot'],drain:['pot','colander'],combine:['cooked','pan'],taste:['spoon','pan'],plate:['pan','plate']};
  for(const [id,servings]of [['mushroom',2],['tomato',4]]){
   await page.locator('#newCook').click();await page.locator('#recipeChoice').selectOption(id);await page.locator('#servings').selectOption(String(servings));await page.locator('#learningMode').selectOption('demonstrate');
   for(const [a,v]of cook(id,servings).steps){
    if(a==='advance'){await page.locator('#advance').click();continue;}
    await station(zones[a]);
    if(a==='cut'){const target=id==='mushroom'?5:10;for(let offset=target;offset<40;offset+=target)await stroke(30+offset*10);assert.deepEqual((await current()).prep.cuts,Array(40/target).fill(target));await page.locator('#useCuts').click();continue;}
    if(a==='measure'){await page.locator('#showPrepScale').click();await page.locator('#scaleAmount').fill(String(v));await page.locator('#scaleConfirm').click();continue;}
    if(a==='panSize'){await page.locator('#benchFullControls').click();await page.locator('#panSize').selectOption(v);await page.locator('#fullControls>summary').click();continue;}
    if(a==='potHeat'||a==='panHeat'){const dial=page.locator('#handsDial'+a.slice(0,-4));await dial.focus();await page.keyboard.press('Home');for(let i=0;i<v;i++)await page.keyboard.press('ArrowRight');continue;}
    if(transfers[a]){await transfer(...transfers[a],id==='tomato'?'keyboard':'drag');continue;}
    if(a==='water'){await pour(50,id==='tomato');continue;}
    if(a==='stirPan'){await mix();continue;}
    if(a==='stirPot')await page.locator('#handsShortcuts').evaluate(e=>e.open=true);
    await page.locator('[data-bench-group='+zones[a]+'] [data-bench-action='+a+']').click();
   }
   assert.equal(await page.locator('#qualityList .met').count(),5);
   await page.locator('input[name=reason0][value="0"]').check();await page.locator('input[name=reason1][value="'+(id==='mushroom'?0:1)+'"]').check();await page.locator('#recordRecipe').click();
   assert.match(await page.locator('#recipeResult').innerText(),/completed independently/);const saved=await current();
   await page.reload();assert.deepEqual(await current(),saved);await page.locator('#openRecipeReplay').click();await station('pan');assert.equal(await page.locator('[data-hand-item=oil]').isDisabled(),true);assert.equal(await page.locator('#handsDialpan').getAttribute('aria-disabled'),'true');
   await page.locator('#handsDialpan').focus();await page.keyboard.press('End');assert.deepEqual(await current(),saved);await page.locator('#closeRecipeReplay').click();
   result.checks.push(id+' for '+servings+' completes with hand-drawn cuts, spatial transfers, continuous pouring, circular mixing, evidence restoration, and locked replay.');
  }
  }
  await page.locator('#rescueLauncher>summary').click();await page.locator('#rescuePrediction').selectOption('0');await page.locator('#rescueStartForm button[type=submit]').click();
  await pour(30,true);const stopped=(await current()).pan.waterAdded;await page.waitForTimeout(300);assert.equal((await current()).pan.waterAdded,stopped);
  await page.locator('#handsJug').focus();await page.keyboard.down('Space');await page.waitForTimeout(400);await page.locator('#showMixPan').focus();await page.keyboard.up('Space');const blurStop=(await current()).pan.waterAdded;await page.waitForTimeout(300);assert.equal((await current()).pan.waterAdded,blurStop);
  await page.locator('#handsJug').focus();await page.keyboard.down('Space');await page.locator('#newCook').click();await page.keyboard.up('Space');await page.waitForTimeout(300);assert.equal((await current()).pan.waterAdded,0);
  result.checks.push('Releasing, losing focus, and starting a new cook stop pouring without undoing doses or leaking into another attempt.');
  await page.addScriptTag({path:path.resolve('node_modules/axe-core/axe.min.js')});
  async function audit(label){const issues=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));result.accessibility.push({label,issues});assert.deepEqual(issues,[]);}
  await station('pan');await audit('Desktop workbench');
  await page.setViewportSize({width:320,height:844});await page.locator('#textView').click();await station('pot');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await audit('320px text view');
  await page.locator('.hands-workbench').screenshot({path:path.join(out,'workbench-mobile.png')});
  await page.emulateMedia({forcedColors:'active'});await audit('Forced colors');await page.locator('.hands-workbench').screenshot({path:path.join(out,'workbench-forced-colors.png')});
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>result.errors.push(e.message));await mobile.route('**/three.min.js',r=>r.abort());await mobile.goto(url);await mobile.locator('#recipeFallback').waitFor();await mobile.locator('[data-bench=pot]').tap();
  await mobile.locator('.hands-workbench').evaluate(e=>e.scrollIntoView({block:'center'}));const src=await mobile.locator('[data-hand-item=water]').boundingBox(),dst=await mobile.locator('[data-hand-target=pot]').boundingBox(),cdp=await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:src.x+src.width/2,y:src.y+src.height/2}]});
  for(let i=1;i<=12;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:src.x+src.width/2+(dst.x+dst.width/2-src.x-src.width/2)*i/12,y:src.y+src.height/2+(dst.y+dst.height/2-src.y-src.height/2)*i/12}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await mobile.evaluate(()=>JSON.parse(localStorage.getItem('alloflow-kitchen-recipes-v1')).current.pot.water),1200);
  result.checks.push('Touch dragging works without WebGL; narrow layouts, reduced motion, and forced colors retain accessible tools.');await mobile.close();
  assert.deepEqual(result.errors,[]);result.pass=true;
 }finally{fs.writeFileSync(path.join(out,edgesOnly?'browser-edges-results.json':'browser-results.json'),JSON.stringify(result,null,2));await browser.close();}
 console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
