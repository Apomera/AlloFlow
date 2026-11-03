/* Inspect the delivered container view with native input and unchanged evidence. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/kitchen-studio-container-lids'),key='alloflow-kitchen-studio-v1';
const helper=path.join(root,'stem_lab/kitchen_studio/kitchen_studio_lid.js'),mutant=process.argv.includes('--mutant-view');
const names=['fridge','shallowTray','wasteBin','containerTarget'],clone=value=>JSON.parse(JSON.stringify(value));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function unchanged(before,after,label='Container inspection preserves all saved evidence'){assert.deepEqual(after,before,label);}
function restored(before,after){for(const name of names)for(const axis of ['x','y'])assert.ok(Number.isFinite(after[name][axis])&&Math.abs(before[name][axis]-after[name][axis])<.0001,'Previous camera restored: '+name+'.'+axis);}
function lidState(value,opening,preview=false){assert.ok(Number.isFinite(value.opening)&&Math.abs(value.opening-opening)<.000001,'Lid opening matches the displayed view');assert.equal(value.preview,String(preview),'Lid preview flag matches the interaction');if(!preview)assert.equal(value.open,String(opening===1),'Committed lid position matches the view');}
function material(value,cutaway){assert.equal(value.cutaway,String(cutaway),'Cutaway follows the lifted lids');if(cutaway){assert.ok(value.opacity>0&&value.opacity<1,'Container body becomes translucent for inspection');assert.equal(value.depthWrite,'false','Cutaway body does not obscure its food');}else{assert.equal(value.opacity,1,'Opaque container material is restored');assert.equal(value.depthWrite,'true','Container depth writing is restored');}}
function food(value,depth){assert.equal(value.depth,depth,'Food depth describes the current displayed state');assert.ok(Math.abs(value.height-(depth==='deep'?.18:depth==='shallow'?.09:0))<.000001,'Food height follows the actual container depth');}
function oneAction(before,after,action,accepted){assert.equal(after.log.length,before.log.length+1,'One storage decision on release');assert.equal(after.log.at(-1).action,action,'Existing storage action identity');assert.equal(after.log.at(-1).accepted,accepted,'Existing storage action acceptance');}
if(process.argv.includes('--selftest')){
  const state={values:{},log:[]};unchanged(state,clone(state));assert.throws(()=>unchanged(state,{values:{late:true},log:[{action:'wait'}]}));
  const p=Object.fromEntries(names.map((name,i)=>[name,{x:10+i,y:20+i}]));restored(p,clone(p));for(const name of names)for(const axis of ['x','y']){const bad=clone(p);bad[name][axis]+=1;assert.throws(()=>restored(p,bad));}
  const closed={opening:0,preview:'false',open:'false',cutaway:'false',opacity:1,depthWrite:'true',depth:'deep',height:.18};lidState(closed,0);material(closed,false);food(closed,'deep');
  for(const bad of [{...closed,opening:.1},{...closed,preview:'true'},{...closed,open:'true'}])assert.throws(()=>lidState(bad,0));
  for(const bad of [{...closed,cutaway:'true'},{...closed,opacity:.2},{...closed,depthWrite:'false'}])assert.throws(()=>material(bad,false));
  assert.throws(()=>food({...closed,height:.09},'deep'));assert.throws(()=>food({...closed,depth:'shallow'},'deep'));
  const opened={...closed,opening:1,open:'true',cutaway:'true',opacity:.25,depthWrite:'false'};lidState(opened,1);material(opened,true);
  assert.throws(()=>material({...opened,opacity:1},true));assert.throws(()=>material({...opened,depthWrite:'true'},true));
  oneAction(state,{values:{},log:[{action:'shallow',accepted:true}]},'shallow',true);assert.throws(()=>oneAction(state,{log:[]},'shallow',true));
  console.log('PASS: saved evidence, camera restoration, lid state, cutaway material and food-depth oracles reject deliberate mutations.');process.exit(0);
}
const sourceBefore=hash(helper);let mutantResponses=0;
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}
    if(mutant&&file===helper){const source=data.toString(),pattern="action:null,view:'lids'";assert.equal(source.split(pattern).length,2,'Unique view-only completion mutation target');data=Buffer.from(source.replace(pattern,"action:'wait'"));mutantResponses++;}
    res.setHeader('Content-Type',({'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(data);
  });
});
function controls(page){
  const canvas=page.locator('#scene canvas'),saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const current=async()=>{const s=await saved();return s.serviceActive?s.service.work:s.drafts[s.current];},chill=async()=>(await saved()).drafts.chill;
  const action=id=>page.locator('[data-action="'+id+'"]').click();
  async function frame(){await page.waitForFunction(()=>{const c=document.querySelector('#scene canvas'),b=c.getBoundingClientRect();return Number(c.dataset.targetWidth)===b.width&&Number(c.dataset.targetHeight)===b.height;});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
  async function targets(){await frame();return canvas.evaluate(el=>JSON.parse(el.dataset.targets));}
  async function points(){await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'auto'}));await frame();return canvas.evaluate(el=>{const b=el.getBoundingClientRect();return Object.fromEntries(Object.entries(JSON.parse(el.dataset.targets)).map(([name,p])=>[name,{x:b.left+p.x,y:b.top+p.y}]));});}
  async function unit(){const b=await canvas.boundingBox();return Math.max(.5,Math.min(2,b.height/420));}
  async function station(id){await page.locator('[data-station="'+id+'"]').click();await page.locator('#focusView').click();await frame();}
  async function opened(){await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.containerInspection==='true');await frame();}
  async function open(){if(await canvas.getAttribute('data-container-inspection')!=='true')await page.locator('#studioContainerInspect').click();await opened();}
  async function close(){await page.locator('#studioContainerClose').click();await frame();assert.equal(await canvas.getAttribute('data-container-inspection'),'false');}
  async function metadata(){return canvas.evaluate(el=>({inspection:el.dataset.containerInspection,opening:Number(el.dataset.lidOpening),open:el.dataset.lidsOpen,preview:el.dataset.lidPreview,cutaway:el.dataset.containerCutaway,depth:el.dataset.foodDepth,height:Number(el.dataset.foodHeight),opacity:Number(el.dataset.bodyOpacity),depthWrite:el.dataset.bodyDepthWrite}));}
  async function pose(open,preview=false){const value=await metadata();lidState(value,open?1:0,preview);if(!preview)material(value,open&&value.inspection==='true');return value;}
  async function idle(open=false){await frame();assert.equal(await canvas.getAttribute('data-held'),'');await pose(open);}
  async function grab(id='tub'){const p=await points(),at=p[id];await page.mouse.move(at.x,at.y);await page.mouse.down();assert.equal(await canvas.getAttribute('data-held'),id,id+' picked up');return {p,at,u:await unit()};}
  async function lid(open,amount=65,side=0){const held=await grab();await page.mouse.move(held.at.x+side*held.u,held.at.y+(open?-amount:amount)*held.u,{steps:10});await frame();return held;}
  async function toggle(){await page.locator('#studioLidToggle').click();await frame();}
  async function shut(){if((await metadata()).open==='true')await toggle();await idle(false);}
  async function tap(){const p=await points();await page.mouse.click(p.tub.x,p.tub.y);await frame();}
  async function drag(id,destination){const p=await points();await grab(id);await page.mouse.move(p[destination].x,p[destination].y,{steps:12});await page.mouse.up();await frame();}
  async function visibleContainer(){const p=await targets(),b=await canvas.boundingBox();assert.ok(p.tub.x>=0&&p.tub.x<=b.width&&p.tub.y>=0&&p.tub.y<=b.height,'Container lid remains reachable');}
  return {canvas,saved,current,chill,action,frame,targets,points,unit,station,opened,open,close,metadata,pose,idle,grab,lid,toggle,shut,tap,drag,visibleContainer};
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const report={checks:[],accessibility:[],screenshots:[],errors:[],mutation:mutant,sourceBefore};
  async function openPage(options={}){const p=await browser.newPage({viewport:{width:1360,height:1000},reducedMotion:'reduce',...options});p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='warning'&&m.text().startsWith('Kitchen Studio'))report.errors.push(m.text());});await p.goto('http://127.0.0.1:'+server.address().port+'/stem_lab/kitchen_studio/index.html');await p.locator('#scene canvas[data-targets]').waitFor();return p;}
  async function shot(p,name,held=false){if(held)await p.screenshot({path:path.join(out,name+'.png')});else await p.locator('.scene-card').screenshot({path:path.join(out,name+'.png'),style:'.taskbar{visibility:hidden!important}'});report.screenshots.push(name+'.png');}
  async function audit(p,label){await p.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const issues=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));report.accessibility.push({label,issues});assert.deepEqual(issues,[],label+' accessibility');}
  try{
    const page=await openPage(),ui=controls(page);await ui.station('chill');let before=await ui.saved(),original=await ui.targets();
    await ui.open();await ui.visibleContainer();assert.equal(await page.locator('#studioContainerPanel').isVisible(),true);assert.equal(await page.locator('#studioFridgeToggle').isDisabled(),true);await ui.idle();food(await ui.metadata(),'deep');unchanged(before,await ui.saved());
    await ui.lid(true,12);assert.equal(await ui.canvas.getAttribute('data-lid-preview'),'true');unchanged(before,await ui.saved());await page.mouse.up();await ui.idle(false);unchanged(before,await ui.saved());
    await ui.lid(true,65,56);assert.equal(await ui.canvas.getAttribute('data-phase'),'retry');await page.mouse.up();await ui.idle(false);unchanged(before,await ui.saved());
    await ui.lid(true);await ui.pose(true,true);unchanged(before,await ui.saved());await shot(page,'deep-container-lift-preview',true);await page.mouse.up();unchanged(before,await ui.saved(),'Opening a lid only changes the view');await ui.idle(true);food(await ui.metadata(),'deep');assert.match(await page.locator('#studioLidToggle').textContent(),/Close lids/i);
    await ui.tap();await ui.idle(false);unchanged(before,await ui.saved(),'Tapping the lifted lid closes only its view');await ui.tap();await ui.idle(true);unchanged(before,await ui.saved());
    await ui.lid(false,12);await page.mouse.up();await ui.idle(true);unchanged(before,await ui.saved(),'Partial lowering restores the committed open lid');
    await ui.lid(false);await ui.pose(false,true);await page.mouse.up();await ui.idle(false);unchanged(before,await ui.saved(),'Lowering a lid only changes the view');
    await ui.close();restored(original,await ui.targets());material(await ui.metadata(),false);assert.equal(await page.locator('#studioContainerInspect').evaluate(el=>el===document.activeElement),true);unchanged(before,await ui.saved());
    report.checks.push('A closer container view supports partial, sideways, full, tap and reverse lid gestures; deep food and cutaway materials match the view, saved evidence is unchanged, and closing restores the exact camera.');

    await ui.open();before=await ui.saved();await ui.lid(true);await page.keyboard.press('Escape');await page.mouse.up();await ui.idle(false);await ui.opened();unchanged(before,await ui.saved());await page.keyboard.press('Escape');assert.equal(await ui.canvas.getAttribute('data-container-inspection'),'false');unchanged(before,await ui.saved());await ui.open();
    await ui.toggle();await ui.idle(true);await ui.lid(false);await page.keyboard.press('Escape');await page.mouse.up();await ui.idle(true);unchanged(before,await ui.saved(),'Cancellation restores a previously committed open lid');await ui.toggle();
    async function cancelled(label,trigger,{closes=false,hidden=false}={}){await ui.open();await ui.shut();const state=await ui.saved();await ui.lid(true);await trigger();await page.mouse.up();if(hidden){const m=await ui.metadata();lidState(m,0);material(m,false);}else await ui.idle(false);assert.equal(await ui.canvas.getAttribute('data-container-inspection'),String(!closes),label+' inspection state');unchanged(hidden?{...state,textView:true}:state,await ui.saved(),label+' preserves all source evidence');}
    await cancelled('Pointer cancellation',()=>ui.canvas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true}));
    await cancelled('Window blur',()=>page.evaluate(()=>dispatchEvent(new Event('blur'))));
    await cancelled('Capture loss',async()=>{const p=await ui.points();await ui.canvas.evaluate(el=>el.releasePointerCapture(1));await page.mouse.move(p.tub.x+1,p.tub.y);await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.held==='');});
    await cancelled('Resize',async()=>{await page.setViewportSize({width:1100,height:900});await ui.frame();});await ui.visibleContainer();
    await cancelled('Camera focus',()=>page.locator('#focusView').evaluate(el=>el.click()),{closes:true});
    await cancelled('Camera rotation',()=>page.locator('#rotateRight').evaluate(el=>el.click()),{closes:true});await page.locator('#focusView').click();
    await cancelled('Look around',()=>page.locator('#studioInteractionMode').evaluate(el=>el.click()),{closes:true});await ui.open();assert.equal(await page.locator('#studioInteractionMode').getAttribute('aria-pressed'),'true');await ui.close();
    await cancelled('Text view',()=>page.locator('#viewToggle').evaluate(el=>el.click()),{closes:true,hidden:true});await page.locator('#viewToggle').click();
    await ui.open();before=await ui.chill();await ui.lid(true);await page.locator('[data-station="knife"]').evaluate(el=>el.click());await page.mouse.up();await ui.idle(false);assert.equal(await ui.canvas.getAttribute('data-container-inspection'),'false');unchanged(before,await ui.chill(),'Station change preserves the leftovers evidence');await ui.station('chill');
    report.checks.push('First Escape cancels held lids and second Escape closes inspection; cancellation, capture loss, blur, resize, camera, Look around, text view and station transitions restore view state without recording decisions.');

    before=await ui.current();await ui.drag('tub','fridge');let after=await ui.current();oneAction(before,after,'chill',false);assert.equal(after.values.chilled,undefined);before=after;
    await ui.drag('tub','shallowTray');after=await ui.current();oneAction(before,after,'shallow',true);assert.equal(after.values.shallow,true);await ui.open();await ui.toggle();await ui.idle(true);food(await ui.metadata(),'shallow');before=await ui.saved();await shot(page,'shallow-container-inspection');
    await ui.action('label');assert.equal(await ui.canvas.getAttribute('data-container-inspection'),'false','Evidence revisions leave the inspection view');await ui.idle(false);after=await ui.current();assert.equal(after.values.label,true);assert.equal(after.log.length,before.drafts.chill.log.length+1);before=after;
    await ui.drag('tub','fridge');after=await ui.current();oneAction(before,after,'chill',true);assert.equal(after.done,true);assert.equal(after.values.chilled,true);
    await page.locator('#studioFridgeToggle').click();assert.equal(await ui.canvas.getAttribute('data-fridge-open'),'false');before=await ui.saved();original=await ui.targets();await ui.open();assert.equal(await ui.canvas.getAttribute('data-fridge-open'),'true','Refrigerated containers are exposed for inspection');await ui.toggle();await ui.idle(true);food(await ui.metadata(),'shallow');await ui.close();assert.equal(await ui.canvas.getAttribute('data-fridge-open'),'false','Previous refrigerator door preference is restored');restored(original,await ui.targets());unchanged(before,await ui.saved());
    report.checks.push('Original carrying retains an early-refrigeration correction and shallow/label/chill decisions; shallow food is visibly thinner, revisions reset inspection, and refrigerated inspection restores the previous door preference.');

    await page.locator('input[name=reason][value="0"]').check();await page.locator('#submit').click();if(!(await page.locator('#replayPanel').evaluate(el=>el.open)))await page.locator('#replayPanel>summary').click();await page.locator('#replayStep').fill('0');await page.locator('#replayStep').dispatchEvent('input');await ui.frame();before=await ui.saved();await ui.open();assert.equal(await page.locator('#studioLidToggle').isDisabled(),false);await ui.tap();await ui.idle(true);food(await ui.metadata(),'deep');unchanged(before,await ui.saved(),'Historical deep containers remain view-only');await ui.close();
    await page.locator('#replayStep').fill('2');await page.locator('#replayStep').dispatchEvent('input');before=await ui.saved();await ui.open();await ui.lid(true);await page.mouse.up();await ui.idle(true);food(await ui.metadata(),'shallow');unchanged(before,await ui.saved(),'Historical shallow containers remain view-only');await shot(page,'recorded-container-inspection');await audit(page,'Desktop container inspection and historical evidence');await page.close();
    report.checks.push('Completed and historical containers allow view-only lid inspection, display the actual recorded deep or shallow geometry, and keep all saved evidence protected.');

    const picnicPage=await openPage(),picnic=controls(picnicPage);await picnic.station('chill');await picnicPage.locator('#scenario').selectOption('picnic');await picnic.open();before=await picnic.saved();await picnic.tap();await picnic.idle(true);food(await picnic.metadata(),'deep');unchanged(before,await picnic.saved());await picnic.close();before=await picnic.current();await picnic.drag('tub','wasteBin');after=await picnic.current();oneAction(before,after,'discard',true);assert.equal(after.values.discarded,true);assert.equal(after.done,true);assert.equal(await picnicPage.locator('#studioContainerInspect').isDisabled(),true);assert.equal(await picnic.canvas.getAttribute('data-container-inspection'),'false');food(await picnic.metadata(),'none');await picnicPage.close();
    report.checks.push('The alternate picnic challenge keeps inspection separate from the discard decision and disables inspection after the food has been discarded.');

    const phone=await openPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),mobile=controls(phone);await mobile.station('chill');await mobile.open();await mobile.visibleContainer();before=await mobile.saved();const cdp=await phone.context().newCDPSession(phone),touch=(type,q)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{id:1,x:q.x,y:q.y,radiusX:4,radiusY:4,force:1}]});
    let p=await mobile.points(),u=await mobile.unit(),scroll=await phone.evaluate(()=>scrollY);await touch('touchStart',p.tub);await touch('touchEnd');await mobile.frame();await mobile.idle(true);unchanged(before,await mobile.saved());
    p=await mobile.points();u=await mobile.unit();scroll=await phone.evaluate(()=>scrollY);await touch('touchStart',p.tub);for(let i=1;i<=10;i++)await touch('touchMove',{x:p.tub.x,y:p.tub.y+65*u*i/10});await mobile.frame();await mobile.pose(false,true);unchanged(before,await mobile.saved());assert.equal(await phone.evaluate(()=>scrollY),scroll);await touch('touchEnd');await mobile.idle(false);unchanged(before,await mobile.saved());
    p=await mobile.points();u=await mobile.unit();scroll=await phone.evaluate(()=>scrollY);await touch('touchStart',p.tub);for(let i=1;i<=10;i++)await touch('touchMove',{x:p.tub.x,y:p.tub.y-65*u*i/10});await mobile.frame();await mobile.pose(true,true);unchanged(before,await mobile.saved());assert.equal(await phone.evaluate(()=>scrollY),scroll);await shot(phone,'phone-lid-lift-preview',true);await touch('touchEnd');await mobile.idle(true);unchanged(before,await mobile.saved());
    await mobile.close();await phone.setViewportSize({width:320,height:844});await mobile.frame();await mobile.open();await mobile.visibleContainer();await phone.locator('#studioLidToggle').focus();await phone.keyboard.press('Enter');await mobile.idle(true);food(await mobile.metadata(),'deep');unchanged(before,await mobile.saved());assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px inspection has no horizontal overflow');await shot(phone,'container-inspection-320');await audit(phone,'320px container lids and keyboard alternatives');await phone.close();
    report.checks.push('Native phone taps and lift/lower gestures change lids without scrolling or evidence writes; the 320px view keeps the lid reachable, supports keyboard inspection and has no overflow.');
    assert.deepEqual(report.errors,[]);report.pass=true;
  }catch(error){report.pass=false;report.failure=error.stack;process.exitCode=1;}
  finally{report.mutantResponses=mutantResponses;report.sourceAfter=hash(helper);report.sourceUnchanged=report.sourceBefore===report.sourceAfter;if(!report.sourceUnchanged){report.pass=false;report.failure=(report.failure||'')+'\nSource helper changed during response-only mutation run.';process.exitCode=1;}if(mutant&&mutantResponses===0){report.pass=false;report.failure=(report.failure||'')+'\nMutation was not served.';process.exitCode=1;}fs.writeFileSync(path.join(out,mutant?'mutation-results.json':'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
})();
