/* Exercise controlled plating through the delivered studio entry and native input. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/kitchen-studio-plating'),key='alloflow-kitchen-studio-v1';
const helper=path.join(root,'stem_lab/kitchen_studio/kitchen_studio_plating.js'),mutant=process.argv.includes('--mutant-action');
const clone=value=>JSON.parse(JSON.stringify(value)),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function unchanged(before,after,label='Held plating preserves cooking evidence'){assert.deepEqual(after,before,label);}
function onePlate(before,after,accepted){
  assert.equal(after.log.length,before.log.length+1,'Exactly one plating decision on release');
  assert.equal(after.log.at(-1).action,'plate','Controlled plating uses existing plate action');
  assert.equal(after.log.at(-1).accepted,accepted,'Plate acceptance follows the existing cooking conditions');
  assert.equal(after.values.heat,null,'Every plate decision switches the burner off');
  assert.equal(after.values.seconds||0,before.values.seconds||0,'Plating does not advance cooking time');
  assert.equal(after.done,accepted,'Only an accepted plate completes this attempt');
}
function idleMetadata(value){assert.deepEqual(value,{held:'',phase:'idle',tilt:0,anchor:'',preview:'false',transfer:0,count:0,angle:0},'Plating preview and transforms reset completely');}
if(process.argv.includes('--selftest')){
  const before={values:{heat:'medium',seconds:90},log:[]},after={values:{heat:null,seconds:90},log:[{action:'plate',accepted:true}],done:true};
  onePlate(before,after,true);unchanged(before,clone(before));assert.throws(()=>unchanged(before,after));
  for(const change of [s=>s.log.push({action:'plate',accepted:true}),s=>s.log[0].action='advance',s=>s.log[0].accepted=false,s=>s.values.heat='medium',s=>s.values.seconds=120,s=>s.done=false]){const bad=clone(after);change(bad);assert.throws(()=>onePlate(before,bad,true));}
  onePlate(before,{values:{heat:null,seconds:90},log:[{action:'plate',accepted:false}],done:false},false);
  const idle={held:'',phase:'idle',tilt:0,anchor:'',preview:'false',transfer:0,count:0,angle:0};idleMetadata(idle);
  for(const field of Object.keys(idle)){const bad={...idle,[field]:typeof idle[field]==='number'?1:'wrong'};assert.throws(()=>idleMetadata(bad));}
  console.log('PASS: plating identity, exact count, burner, clock, evidence and rollback oracles reject deliberate mutations.');process.exit(0);
}
const sourceBefore=hash(helper);let mutantResponses=0;
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}
    if(mutant&&file===helper){const source=data.toString(),pattern=/action\s*:\s*(['"])plate\1/g;assert.equal([...source.matchAll(pattern)].length,1,'Unique completed plating action mutation target');data=Buffer.from(source.replace(pattern,"action:'advance'"));mutantResponses++;}
    res.setHeader('Content-Type',({'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(data);
  });
});
function controls(page){
  const canvas=page.locator('#scene canvas'),guide=page.locator('#studioPlatingGuide'),saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const current=async()=>{const s=await saved();return s.serviceActive?s.service.work:s.drafts[s.current];},heat=async()=>(await saved()).drafts.heat;
  const action=id=>page.locator('[data-action="'+id+'"]').click();
  async function frame(){await page.waitForFunction(()=>{const c=document.querySelector('#scene canvas'),b=c.getBoundingClientRect();return Math.abs(Number(c.dataset.targetWidth)-b.width)<.1&&Math.abs(Number(c.dataset.targetHeight)-b.height)<.1;});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
  async function targets(){await frame();return canvas.evaluate(el=>JSON.parse(el.dataset.targets));}
  async function points(){await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'auto'}));await frame();return canvas.evaluate(el=>{const b=el.getBoundingClientRect();return Object.fromEntries(Object.entries(JSON.parse(el.dataset.targets)).map(([name,p])=>[name,{x:b.left+p.x,y:b.top+p.y}]));});}
  async function unit(){return (await canvas.boundingBox()).height/420;}
  async function station(id){await page.locator('[data-station="'+id+'"]').click();await page.locator('#focusView').click();await frame();}
  async function controlled(){if(await page.locator('#studioControlledPlate').getAttribute('aria-pressed')!=='true')await page.locator('#studioControlledPlate').click();await frame();}
  async function quick(){if(await page.locator('#studioQuickPlate').getAttribute('aria-pressed')!=='true')await page.locator('#studioQuickPlate').click();await frame();}
  async function closeup(){if(await canvas.getAttribute('data-pan-inspection')!=='true')await page.locator('#studioPanOpen').click();await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.panInspection==='true');await frame();}
  async function angle(value){await page.locator('#studioPanAngle').evaluate((node,v)=>{node.value=String(v);node.dispatchEvent(new Event('input',{bubbles:true}));},value);await frame();}
  async function metadata(){return canvas.evaluate(el=>({held:el.dataset.held,phase:el.dataset.platingPhase,tilt:Number(el.dataset.platingTilt),anchor:el.dataset.platingAnchor,preview:el.dataset.platingPreview,transfer:Number(el.dataset.platingTransfer),count:Number(el.dataset.platingFoodCount),angle:Number(el.dataset.panPreviewAngle)}));}
  async function idle(hidden=false){if(!hidden)await frame();idleMetadata(await metadata());assert.equal(await guide.isVisible(),false);}
  async function grab(){const p=await points();await page.mouse.move(p.pan.x,p.pan.y);await page.mouse.down();assert.equal(await canvas.getAttribute('data-held'),'pan','Pan handle picked up');return p;}
  async function aim(){const p=await grab();await page.mouse.move(p.servingPlate.x,p.servingPlate.y,{steps:12});await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.platingPhase==='tilt');await frame();return {p,anchor:JSON.parse(await canvas.getAttribute('data-plating-anchor')),unit:await unit()};}
  async function tipped(){const g=await aim();await page.mouse.move(g.anchor.x,g.anchor.y+44*g.unit,{steps:10});await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.platingPhase==='return');await frame();return g;}
  async function ready(){const g=await tipped();await page.mouse.move(g.anchor.x,g.anchor.y,{steps:10});await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.platingPhase==='ready');await frame();return g;}
  async function gold(){for(const id of ['dry','spread','medium','advance','advance','advance'])await action(id);const s=await current();assert.equal(s.values.brown,3);assert.equal(s.done,false);}
  async function visible(){const p=await targets(),b=await canvas.boundingBox();for(const name of ['pan','servingPlate'])assert.ok(p[name].x>=0&&p[name].x<=b.width&&p[name].y>=0&&p[name].y<=b.height,name+' remains in reach');}
  async function dragQuick(){const p=await grab();await page.mouse.move(p.servingPlate.x,p.servingPlate.y,{steps:12});await page.mouse.up();await frame();}
  async function colors(){const value=await canvas.getAttribute('data-plating-food-colors');assert.ok(value&&value.split(',').length===8,'Actual preview mushroom colours are exposed');return value;}
  return {canvas,guide,saved,current,heat,action,frame,targets,points,unit,station,controlled,quick,closeup,angle,metadata,idle,grab,aim,tipped,ready,gold,visible,dragQuick,colors};
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const report={checks:[],accessibility:[],screenshots:[],errors:[],mutation:mutant,sourceBefore};
  async function openPage(options={}){const p=await browser.newPage({viewport:{width:1360,height:1000},reducedMotion:'reduce',...options});p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='warning'&&m.text().startsWith('Kitchen Studio'))report.errors.push(m.text());});await p.goto('http://127.0.0.1:'+server.address().port+'/stem_lab/kitchen_studio/index.html');await p.locator('#scene canvas[data-targets]').waitFor();return p;}
  async function shot(p,name,held=false){if(held)await p.screenshot({path:path.join(out,name+'.png')});else await p.locator('.scene-card').screenshot({path:path.join(out,name+'.png'),style:'.taskbar{visibility:hidden!important}'});report.screenshots.push(name+'.png');}
  async function audit(p,label){await p.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const issues=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));report.accessibility.push({label,issues});assert.deepEqual(issues,[],label+' accessibility');}
  try{
    const page=await openPage(),ui=controls(page);await ui.station('heat');assert.equal(await page.locator('#studioQuickPlate').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#studioPlatingStep').isHidden(),true);await ui.controlled();let before=await ui.current();
    await ui.aim();assert.equal(await ui.guide.isVisible(),true);await page.mouse.up();await ui.idle();unchanged(before,await ui.current(),'Carrying alone cannot complete controlled plating');
    let g=await ui.aim(),originalColors=await ui.colors();await page.mouse.move(g.anchor.x,g.anchor.y+25*g.unit,{steps:10});await ui.frame();assert.ok((await ui.metadata()).transfer<1);assert.equal(await ui.colors(),originalColors);unchanged(before,await ui.current());await page.mouse.up();await ui.idle();unchanged(before,await ui.current(),'A partial tip cannot plate');
    await ui.tipped();let m=await ui.metadata();assert.equal(m.transfer,1);assert.equal(m.count,8);assert.ok(m.angle>.9&&m.angle<1);assert.equal(await ui.colors(),originalColors);unchanged(before,await ui.current());await shot(page,'pan-tipped-preview',true);await page.mouse.up();await ui.idle();unchanged(before,await ui.current(),'Releasing a tilted pan cannot plate');
    report.checks.push('Controlled plating requires carry, full tip and level return; carry-only, partial and tilted releases restore all previews without changing cooking evidence or food colours.');

    await ui.action('medium');before=await ui.current();g=await ui.ready();m=await ui.metadata();assert.equal(m.transfer,1);assert.equal(m.count,8);assert.ok(Math.abs(m.angle)<1e-5,'Pan returned level');assert.equal(await ui.colors(),originalColors);unchanged(before,await ui.current());await shot(page,'pan-level-preview',true);await page.mouse.up();let after=await ui.current();onePlate(before,after,false);assert.equal(after.values.brown,undefined);await ui.idle();await ui.canvas.dispatchEvent('pointerup',{pointerId:1,pointerType:'mouse',bubbles:true});unchanged(after,await ui.current(),'Duplicate release is inert');
    await page.locator('#retry').click();await ui.controlled();for(const id of ['dry','spread','high','advance','advance','advance'])await ui.action(id);before=await ui.current();assert.equal(before.values.brown,6);g=await ui.aim();originalColors=await ui.colors();await page.mouse.move(g.anchor.x,g.anchor.y+44*g.unit,{steps:10});await page.mouse.move(g.anchor.x,g.anchor.y,{steps:10});await ui.frame();assert.equal(await ui.colors(),originalColors);unchanged(before,await ui.current());await page.mouse.up();onePlate(before,await ui.current(),false);assert.equal((await ui.current()).values.brown,6);await ui.idle();
    report.checks.push('Early and burned plating remain recordable rejected plate decisions, each switches the burner off without advancing time, and visual previews preserve the actual pale or burned colours.');

    await page.locator('#retry').click();await ui.controlled();await ui.gold();
    async function cancelled(label,trigger,restore,hidden=false){const state=await ui.current(),gesture=await ui.ready();await trigger(gesture);await page.mouse.up();await ui.idle(hidden);unchanged(state,await ui.current(),label+' preserves source cooking evidence');if(restore)await restore();if(hidden)await ui.frame();}
    await cancelled('Escape',()=>page.keyboard.press('Escape'));
    await cancelled('Pointer cancellation',()=>ui.canvas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true}));
    await cancelled('Window blur',()=>page.evaluate(()=>dispatchEvent(new Event('blur'))));
    await cancelled('Capture loss',async gesture=>{await ui.canvas.evaluate(el=>el.releasePointerCapture(1));await page.mouse.move(gesture.anchor.x+1,gesture.anchor.y);await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.held==='');});
    await cancelled('Off-plate release',gesture=>page.mouse.move(gesture.anchor.x+40*gesture.unit,gesture.anchor.y));
    await cancelled('Outside release',async()=>{const b=await ui.canvas.boundingBox();await page.mouse.move(b.x+b.width+20,b.y+20);});
    await cancelled('Plating technique',()=>page.locator('#studioQuickPlate').evaluate(el=>el.click()),()=>ui.controlled());
    await cancelled('Spatula technique',()=>page.locator('#studioStirMode').evaluate(el=>el.click()),()=>page.locator('#studioArrangeMode').click());
    await cancelled('Resize',async()=>{await page.setViewportSize({width:1100,height:900});await ui.frame();},async()=>{await page.setViewportSize({width:1360,height:1000});await ui.frame();await page.locator('#focusView').click();});
    await cancelled('Camera focus',()=>page.locator('#focusView').evaluate(el=>el.click()));
    await cancelled('Camera rotation',()=>page.locator('#rotateRight').evaluate(el=>el.click()),()=>page.locator('#focusView').click());
    await cancelled('Look around',()=>page.locator('#studioInteractionMode').evaluate(el=>el.click()),async()=>{await ui.quick();await ui.controlled();});
    await cancelled('Text view',()=>page.locator('#viewToggle').evaluate(el=>el.click()),()=>page.locator('#viewToggle').click(),true);
    await ui.closeup();await cancelled('Close-up angle',()=>ui.angle(100));await ui.angle(65);await ui.closeup();
    for(const angle of [0,100,65]){await ui.angle(angle);await ui.visible();before=await ui.current();await ui.ready();await ui.visible();await page.keyboard.press('Escape');await page.mouse.up();await ui.idle();unchanged(before,await ui.current());}
    before=await ui.heat();await ui.ready();await page.locator('[data-station="knife"]').evaluate(el=>el.click());await page.mouse.up();await ui.idle();unchanged(before,await ui.heat(),'Changing stations preserves the prior pan');await ui.station('heat');await ui.controlled();
    before=await ui.current();await ui.ready();await page.locator('#retry').evaluate(el=>el.click());await page.mouse.up();await ui.idle();assert.deepEqual((await ui.current()).log,[]);assert.deepEqual((await ui.saved()).attempts.at(-1),before,'Retry archives only committed cooking evidence');
    report.checks.push('Escape, cancellation, capture loss, off-plate/outside release, both technique choices, resize, camera/angle, Look around, text, station and retry transitions cancel held previews safely; controlled close-up targets remain reachable at all angles.');

    await ui.controlled();await ui.gold();await ui.closeup();before=await ui.current();await ui.ready();unchanged(before,await ui.current());await page.mouse.up();after=await ui.current();onePlate(before,after,true);await ui.idle();assert.equal(after.values.brown,3);assert.equal(await page.locator('#studioControlledPlate').isDisabled(),true);assert.equal(await page.locator('#studioQuickPlate').isDisabled(),true);assert.equal(await page.locator('#studioPlatingStep').isDisabled(),true);
    await page.locator('input[name=reason][value="0"]').check();await page.locator('#submit').click();if(!(await page.locator('#replayPanel').evaluate(el=>el.open)))await page.locator('#replayPanel>summary').click();await page.locator('#replayStep').fill('0');await page.locator('#replayStep').dispatchEvent('input');before=await ui.saved();await page.locator('#studioPlatingStep').evaluate(el=>el.click());await page.locator('#studioQuickPlate').evaluate(el=>el.click());const p=await ui.points();await page.mouse.move(p.pan.x,p.pan.y);await page.mouse.down();await page.mouse.move(p.servingPlate.x,p.servingPlate.y,{steps:10});await page.mouse.move(p.servingPlate.x,p.servingPlate.y+44*(await ui.unit()),{steps:8});await page.mouse.move(p.servingPlate.x,p.servingPlate.y,{steps:8});await page.mouse.up();await ui.idle();unchanged(before,await ui.saved(),'Historical plating and technique controls are read-only');await shot(page,'recorded-pan-plating');await audit(page,'Desktop controlled plating and recorded evidence');await page.close();
    report.checks.push('A golden controlled plate commits one accepted plate with no clock change; completed and historical modes protect evidence while the pan remains inspectable.');

    const quickPage=await openPage(),quick=controls(quickPage);await quick.station('heat');assert.equal(await quickPage.locator('#studioQuickPlate').getAttribute('aria-pressed'),'true');await quick.gold();before=await quick.current();await quick.dragQuick();onePlate(before,await quick.current(),true);await quick.idle();await quickPage.close();
    const keyboardPage=await openPage(),keyboard=controls(keyboardPage);await keyboard.station('heat');await keyboardPage.locator('#mode').selectOption('demonstrate');await keyboard.gold();await keyboard.controlled();before=await keyboard.current();await keyboardPage.locator('#studioPlatingStep').focus();await keyboardPage.keyboard.press('Enter');after=await keyboard.current();onePlate(before,after,true);assert.equal(after.mode,'demonstrate');assert.equal(after.hints,0);assert.deepEqual(after.hintLog,[]);assert.equal(await keyboardPage.locator('#hintText').isVisible(),false);await keyboardPage.close();
    report.checks.push('Default quick-drop plating remains available, and the explicit keyboard alternative preserves demonstration accounting without hidden coaching or automatic cooking time.');

    const phone=await openPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),mobile=controls(phone);await mobile.station('heat');await mobile.gold();await mobile.controlled();await mobile.closeup();for(const angle of [0,100,65]){await mobile.angle(angle);await mobile.visible();}
    const cdp=await phone.context().newCDPSession(phone),touch=(type,q)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{id:1,x:q.x,y:q.y,radiusX:4,radiusY:4,force:1}]});
    let points=await mobile.points(),unit=await mobile.unit();before=await mobile.current();const scroll=await phone.evaluate(()=>scrollY);await touch('touchStart',points.pan);await mobile.frame();assert.equal(await mobile.canvas.getAttribute('data-held'),'pan');for(let i=1;i<=12;i++)await touch('touchMove',{x:points.pan.x+(points.servingPlate.x-points.pan.x)*i/12,y:points.pan.y+(points.servingPlate.y-points.pan.y)*i/12});await mobile.frame();assert.equal(await mobile.canvas.getAttribute('data-plating-phase'),'tilt');const anchor=JSON.parse(await mobile.canvas.getAttribute('data-plating-anchor'));
    for(let i=1;i<=10;i++)await touch('touchMove',{x:anchor.x,y:anchor.y+44*unit*i/10});await mobile.frame();m=await mobile.metadata();assert.equal(m.phase,'return');assert.equal(m.transfer,1);assert.equal(m.count,8);assert.ok(m.angle>.9&&m.angle<1);unchanged(before,await mobile.current());assert.equal(await phone.evaluate(()=>scrollY),scroll);await mobile.visible();await shot(phone,'phone-pan-transfer-preview',true);
    for(let i=9;i>=0;i--)await touch('touchMove',{x:anchor.x,y:anchor.y+44*unit*i/10});await mobile.frame();m=await mobile.metadata();assert.equal(m.phase,'ready');assert.ok(Math.abs(m.angle)<1e-5,'Pan returned level');assert.equal(m.transfer,1);assert.equal(m.count,8);unchanged(before,await mobile.current());assert.equal(await phone.evaluate(()=>scrollY),scroll);await touch('touchEnd');await mobile.idle();onePlate(before,await mobile.current(),true);
    await phone.locator('#retry').click();await mobile.gold();await phone.setViewportSize({width:320,height:844});await mobile.frame();await mobile.controlled();await mobile.closeup();for(const angle of [0,65,100]){await mobile.angle(angle);await mobile.visible();}before=await mobile.current();await phone.locator('#studioPlatingStep').focus();await phone.keyboard.press('Space');after=await mobile.current();onePlate(before,after,true);assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px plating controls have no horizontal overflow');await shot(phone,'controlled-plating-320');await audit(phone,'320px controlled plating and keyboard alternatives');await phone.close();
    report.checks.push('Native phone touch carries, tips and levels the pan without scrolling or premature decisions; raised-pan close-up framing and keyboard plating remain usable at 320px with no overflow.');
    assert.deepEqual(report.errors,[]);report.pass=true;
  }catch(error){report.pass=false;report.failure=error.stack;process.exitCode=1;}
  finally{report.mutantResponses=mutantResponses;report.sourceAfter=hash(helper);report.sourceUnchanged=report.sourceBefore===report.sourceAfter;if(!report.sourceUnchanged){report.pass=false;report.failure=(report.failure||'')+'\nSource helper changed during response-only mutation run.';process.exitCode=1;}if(mutant&&mutantResponses===0){report.pass=false;report.failure=(report.failure||'')+'\nMutation was not served.';process.exitCode=1;}fs.writeFileSync(path.join(out,mutant?'mutation-results.json':'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
})();
