/* Exercise the delivered board workspace with native pointer, keyboard and touch. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/kitchen-studio-board-view'),key='alloflow-kitchen-studio-v1';
const helper=path.join(root,'stem_lab/kitchen_studio/kitchen_studio_board_view.js'),mutant=process.argv.includes('--mutant-restore');
const names=['board','knife','grip','nonslipMat','boardMat'],clone=v=>JSON.parse(JSON.stringify(v));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function restored(before,after){for(const name of names)for(const axis of ['x','y'])assert.ok(Number.isFinite(after[name][axis])&&Math.abs(before[name][axis]-after[name][axis])<.0001,'Previous camera restored: '+name+'.'+axis);}
function oneAction(before,after,action,accepted){assert.equal(after.log.length,before.log.length+1,'Exactly one action on release');assert.equal(after.log.at(-1).action,action,'Released action identity');assert.equal(after.log.at(-1).accepted,accepted,'Released action acceptance');}
function readout(value,values,historical=false){
  const cut=values.cut==='large'?'Uniform large dice':values.cut==='even'?'Uniform small dice':values.cut==='uneven'?'Mixed-size pieces':'Whole carrot';
  assert.equal(value,(historical?'Recorded board':'Board')+': '+(values.secure?'Nonslip mat under the board':'Mat beside the board')+'. '+(values.claw?'Fingertips tucked in a claw grip':'Fingers extended')+'. '+cut+'.','Readout describes the current displayed evidence');
}
if(process.argv.includes('--selftest')){
  const p=Object.fromEntries(names.map((k,i)=>[k,{x:10+i,y:20+i}]));restored(p,clone(p));
  for(const name of names)for(const axis of ['x','y']){const bad=clone(p);bad[name][axis]+=1;assert.throws(()=>restored(p,bad));}
  const before={log:[]},after={log:[{action:'dice',accepted:false}]};oneAction(before,after,'dice',false);
  assert.throws(()=>oneAction(before,{log:after.log.concat(after.log)},'dice',false));assert.throws(()=>oneAction(before,after,'claw',false));assert.throws(()=>oneAction(before,after,'dice',true));
  readout('Recorded board: Mat beside the board. Fingers extended. Whole carrot.',{},true);
  assert.throws(()=>readout('Board: Nonslip mat under the board. Fingers extended. Whole carrot.',{},false));
  console.log('PASS: camera, exact action and displayed-evidence oracles reject deliberate mutations.');process.exit(0);
}
const sourceBefore=hash(helper);let mutantResponses=0;
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}
    if(mutant&&file===helper){const source=data.toString();assert.equal(source.split('camera.zoom=saved.zoom;').length,2,'Unique restore mutation target');data=Buffer.from(source.replace('camera.zoom=saved.zoom;','camera.zoom=saved.zoom*1.5;'));mutantResponses++;}
    res.setHeader('Content-Type',({'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(data);
  });
});
function controls(page){
  const canvas=page.locator('#scene canvas'),guide=page.locator('#studioCutGuide'),saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const current=async()=>{const s=await saved();return s.serviceActive?s.service.work:s.drafts[s.current];},knife=async()=>(await saved()).drafts.knife;
  const action=id=>page.locator('[data-action="'+id+'"]').click();
  async function frame(){await page.waitForFunction(()=>{const c=document.querySelector('#scene canvas'),b=c.getBoundingClientRect();return Number(c.dataset.targetWidth)===b.width&&Number(c.dataset.targetHeight)===b.height;});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
  async function targets(){await frame();return canvas.evaluate(el=>JSON.parse(el.dataset.targets));}
  async function points(){await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'auto'}));await frame();return canvas.evaluate(el=>{const b=el.getBoundingClientRect();return Object.fromEntries(Object.entries(JSON.parse(el.dataset.targets)).map(([k,v])=>[k,{x:b.left+v.x,y:b.top+v.y}]));});}
  async function unit(){const b=await canvas.boundingBox();return Math.max(.5,Math.min(2,b.height/420));}
  async function station(id){await page.locator('[data-station="'+id+'"]').click();await page.locator('#focusView').click();await frame();}
  async function opened(){await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.boardInspection==='true');await frame();}
  async function open(){if(await canvas.getAttribute('data-board-inspection')!=='true')await page.locator('#studioBoardOpen').click();await opened();}
  async function angle(value){await page.locator('#studioBoardAngle').evaluate((node,v)=>{node.value=String(v);node.dispatchEvent(new Event('input',{bubbles:true}));},value);await frame();}
  async function grab(id){const p=await points(),at=p[id];await page.mouse.move(at.x,at.y);await page.mouse.down();assert.equal(await canvas.getAttribute('data-held'),id,id+' picked up');return at;}
  async function carry(id,to){const p=await points();await grab(id);await page.mouse.move(p[to].x,p[to].y,{steps:10});}
  async function stroke(phase='ready'){
    const at=await grab('knife'),u=await unit();
    if(phase==='partial')await page.mouse.move(at.x,at.y+20*u,{steps:5});
    else{await page.mouse.move(at.x,at.y+50*u,{steps:8});if(phase==='ready')await page.mouse.move(at.x,at.y,{steps:8});}
    return at;
  }
  async function idle(){assert.equal(await canvas.getAttribute('data-held'),'');assert.equal(await canvas.getAttribute('data-cut-phase'),'idle');assert.equal(await guide.isHidden(),true);assert.equal(await canvas.getAttribute('data-cut-preview'),'0');}
  async function visibleTools(){const p=await targets(),b=await canvas.boundingBox();for(const name of names)assert.ok(p[name].x>=0&&p[name].x<=b.width&&p[name].y>=0&&p[name].y<=b.height,name+' remains in reach');}
  async function factual(historical=false,values){readout(await page.locator('#studioBoardReadout').textContent(),values||(await current()).values,historical);}
  return {canvas,guide,saved,current,knife,action,frame,targets,points,unit,station,opened,open,angle,grab,carry,stroke,idle,visibleTools,factual};
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const report={checks:[],accessibility:[],screenshots:[],errors:[],mutation:mutant,sourceBefore};
  async function openPage(options={}){
    const p=await browser.newPage({viewport:{width:1360,height:1000},reducedMotion:'reduce',...options});p.setDefaultTimeout(20000);
    p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='warning'&&m.text().startsWith('Kitchen Studio'))report.errors.push(m.text());});
    await p.goto('http://127.0.0.1:'+server.address().port+'/stem_lab/kitchen_studio/index.html');await p.locator('#scene canvas[data-targets]').waitFor();return p;
  }
  async function shot(p,name,held=false){
    if(held)await p.screenshot({path:path.join(out,name+'.png')});
    else await p.locator('.scene-card').screenshot({path:path.join(out,name+'.png'),style:'.taskbar{visibility:hidden!important}'});
    report.screenshots.push(name+'.png');
  }
  async function audit(p,label){await p.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const issues=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));report.accessibility.push({label,issues});assert.deepEqual(issues,[],label+' accessibility');}
  try{
    const page=await openPage(),ui=controls(page);await ui.station('knife');let before=await ui.saved(),original=await ui.targets();
    const span=p=>Math.hypot(p.knife.x-p.grip.x,p.knife.y-p.grip.y),normalSize=span(original);
    await ui.open();assert.ok(span(await ui.targets())>normalSize*1.2,'The knife and guide hand are visibly enlarged');
    for(const value of [0,100,65]){await ui.angle(value);await ui.visibleTools();await ui.factual();assert.deepEqual(await ui.saved(),before);}
    await shot(page,'closer-board-desktop');await page.locator('#studioBoardClose').click();restored(original,await ui.targets());assert.equal(await page.locator('#studioBoardOpen').evaluate(el=>el===document.activeElement),true);
    await ui.open();await page.locator('#studioBoardAngle').focus();await page.keyboard.press('Home');assert.equal(await ui.canvas.getAttribute('data-board-view-angle'),'0');await page.keyboard.press('End');assert.equal(await ui.canvas.getAttribute('data-board-view-angle'),'100');await ui.angle(65);
    await page.locator('[data-studio-tool="knife"]').click();await ui.opened();assert.deepEqual(await ui.saved(),before);
    await page.locator('#studioInteractionMode').click();assert.equal(await ui.canvas.getAttribute('data-board-inspection'),'false');restored(original,await ui.targets());
    await ui.open();assert.equal(await page.locator('#studioInteractionMode').getAttribute('aria-pressed'),'true');await page.locator('#studioBoardOpen').click();assert.equal(await ui.canvas.getAttribute('data-board-inspection'),'false');restored(original,await ui.targets());await ui.open();
    report.checks.push('Closer framing enlarges the knife and hand, keeps mat and board reachable at every angle, preserves evidence, supports keyboard angle controls and tool finding, and restores the exact previous camera.');

    before=await ui.current();await ui.stroke('partial');assert.equal(await ui.canvas.getAttribute('data-cut-phase'),'down');assert.equal(await ui.guide.isVisible(),true);assert.deepEqual(await ui.current(),before);await page.mouse.up();await ui.idle();assert.deepEqual(await ui.current(),before);
    await ui.stroke('up');assert.equal(await ui.canvas.getAttribute('data-cut-phase'),'up');assert.equal(await ui.canvas.getAttribute('data-cut-preview'),'0');await page.mouse.up();await ui.idle();assert.deepEqual(await ui.current(),before,'Down-only release does not record a cut');
    await ui.stroke();assert.equal(await ui.canvas.getAttribute('data-cut-phase'),'ready');assert.equal(await ui.canvas.getAttribute('data-cut-preview'),'0');assert.deepEqual(await ui.current(),before);await page.mouse.up();let after=await ui.current();oneAction(before,after,'dice',false);assert.equal(after.values.cut,undefined);assert.equal(after.done,false);await ui.factual();
    await page.locator('#retry').click();await ui.open();before=await ui.current();
    report.checks.push('Partial and down-only knife movements do not record; a completed unsafe stroke records exactly one rejected existing dice decision without creating cut pieces.');

    await ui.carry('nonslipMat','boardMat');assert.equal(await ui.canvas.getAttribute('data-mat-preview'),'true');assert.deepEqual(await ui.current(),before);await ui.factual();await page.keyboard.press('Escape');await page.mouse.up();await ui.opened();assert.equal(await ui.canvas.getAttribute('data-mat-preview'),'false');assert.deepEqual(await ui.current(),before);
    await ui.carry('nonslipMat','boardMat');await page.mouse.up();after=await ui.current();oneAction(before,after,'secure',true);assert.equal(after.values.secure,true);assert.equal(await page.locator('[data-studio-tool="nonslipMat"]').isDisabled(),true);before=after;
    let at=await ui.grab('grip'),u=await ui.unit();await page.mouse.move(at.x,at.y-40*u,{steps:8});assert.equal(await ui.canvas.getAttribute('data-grip-curl'),'100');assert.deepEqual(await ui.current(),before);await ui.factual();await page.mouse.up();after=await ui.current();oneAction(before,after,'claw',true);assert.equal(after.values.claw,true);await ui.factual();before=after;
    await ui.stroke('up');assert.equal(await ui.canvas.getAttribute('data-cut-preview'),'12');assert.equal(await ui.canvas.getAttribute('data-cut-phase'),'up');assert.deepEqual(await ui.current(),before);await ui.factual();await shot(page,'knife-down-preview',true);await page.keyboard.press('Escape');await page.mouse.up();await ui.idle();await ui.opened();assert.deepEqual(await ui.current(),before);
    report.checks.push('Native mat and claw-grip gestures commit once on release; secured cutting previews the pieces and down/up guide without changing factual readout or evidence.');

    async function cancelled(label,trigger,{open=true}={}){
      const state=await ui.current();await ui.stroke();assert.equal(await ui.canvas.getAttribute('data-cut-phase'),'ready');await trigger();await page.mouse.up();await ui.idle();assert.deepEqual(await ui.current(),state,label+' preserves source evidence');if(open)await ui.opened();
    }
    await cancelled('Angle change',()=>ui.angle(100));await ui.angle(65);
    await cancelled('First Escape',()=>page.keyboard.press('Escape'));await page.keyboard.press('Escape');assert.equal(await ui.canvas.getAttribute('data-board-inspection'),'false');await ui.open();
    await cancelled('Pointer cancellation',()=>ui.canvas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true}));
    await cancelled('Window blur',()=>page.evaluate(()=>dispatchEvent(new Event('blur'))));
    await cancelled('Cut-size change',()=>page.locator('#studioCutSize').dispatchEvent('change'));
    await cancelled('Resize',async()=>{await page.setViewportSize({width:1100,height:900});await ui.frame();});await ui.visibleTools();
    await cancelled('Text view',()=>page.locator('#viewToggle').evaluate(el=>el.click()),{open:false});assert.equal(await ui.canvas.getAttribute('data-board-inspection'),'false');await page.locator('#viewToggle').click();await ui.open();
    await cancelled('Look around',()=>page.locator('#studioInteractionMode').evaluate(el=>el.click()),{open:false});assert.equal(await ui.canvas.getAttribute('data-board-inspection'),'false');await ui.open();assert.equal(await page.locator('#studioInteractionMode').getAttribute('aria-pressed'),'true');
    await cancelled('Focus station',()=>page.locator('#focusView').evaluate(el=>el.click()),{open:false});await ui.open();
    before=await ui.current();await ui.stroke();await page.locator('[data-station="heat"]').evaluate(el=>el.click());await page.mouse.up();await ui.idle();assert.equal(await ui.canvas.getAttribute('data-board-inspection'),'false');assert.deepEqual(await ui.knife(),before);await ui.station('knife');await ui.open();
    report.checks.push('Angle, Escape, pointer cancellation, blur, cut selection, resize, text view, Look around, camera and station changes roll back held cutting previews without recording decisions.');

    before=await ui.current();await ui.stroke();assert.equal(await ui.canvas.getAttribute('data-cut-phase'),'ready');assert.deepEqual(await ui.current(),before);await shot(page,'knife-ready-preview',true);await page.mouse.up();after=await ui.current();oneAction(before,after,'dice',true);assert.equal(after.values.cut,'even');assert.equal(after.done,true);await ui.idle();await ui.opened();await ui.factual();
    await ui.canvas.dispatchEvent('pointerup',{pointerId:1,pointerType:'mouse',bubbles:true});assert.deepEqual(await ui.current(),after);assert.equal(await page.locator('#studioCutSize').isDisabled(),true);
    await page.locator('input[name=reason][value="2"]').check();await page.locator('#submit').click();if(!(await page.locator('#replayPanel').evaluate(el=>el.open)))await page.locator('#replayPanel>summary').click();await page.locator('#replayStep').fill('0');await page.locator('#replayStep').dispatchEvent('input');await ui.opened();await ui.factual(true,{});assert.equal(await ui.canvas.getAttribute('data-mat-secured'),'false');before=await ui.saved();
    await ui.angle(100);let p=await ui.points();await page.mouse.move(p.knife.x,p.knife.y);await page.mouse.down();u=await ui.unit();await page.mouse.move(p.knife.x,p.knife.y+50*u,{steps:8});await page.mouse.move(p.knife.x,p.knife.y,{steps:8});await page.mouse.up();await ui.idle();assert.deepEqual(await ui.saved(),before);assert.equal(await page.locator('#studioCutSize').isDisabled(),true);
    await page.locator('#replayStep').fill('2');await page.locator('#replayStep').dispatchEvent('input');await ui.factual(true,{secure:true,claw:true});await page.locator('#replayStep').fill('3');await page.locator('#replayStep').dispatchEvent('input');await ui.factual(true,{secure:true,claw:true,cut:'even'});await shot(page,'recorded-board-inspection');await audit(page,'Desktop closer board and recorded evidence');await page.close();
    report.checks.push('One completed safe stroke records uniform small dice; duplicate releases are inert, and completed/historical views remain inspectable with accurate stage readouts and protected evidence.');

    const stewPage=await openPage(),stew=controls(stewPage);await stew.station('knife');await stewPage.locator('#scenario').selectOption('stew');await stew.open();await stew.action('secure');await stew.action('claw');before=await stew.current();await stew.stroke();await stewPage.mouse.up();after=await stew.current();oneAction(before,after,'dice',false);assert.equal(after.values.cut,'even');assert.equal(after.done,false);await stew.factual();
    await stewPage.locator('#studioCutSize').selectOption('largeDice');before=after;await stew.stroke();await stewPage.mouse.up();after=await stew.current();oneAction(before,after,'largeDice',true);assert.equal(after.values.cut,'large');assert.equal(after.done,true);await stew.factual();await stewPage.close();
    report.checks.push('The stew challenge retains a recordable wrong-size small cut and accepts the selected uniform large dice through the same gesture gateway.');

    const phone=await openPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),mobile=controls(phone);await mobile.station('knife');await mobile.open();await mobile.angle(100);await mobile.visibleTools();
    const cdp=await phone.context().newCDPSession(phone),touch=(type,q)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{id:1,x:q.x,y:q.y,radiusX:4,radiusY:4,force:1}]});
    async function phoneStart(id){const pts=await mobile.points();before=await mobile.current();const scroll=await phone.evaluate(()=>scrollY);await touch('touchStart',pts[id]);assert.equal(await mobile.canvas.getAttribute('data-held'),id);return {pts,scroll};}
    let held=await phoneStart('nonslipMat');for(let i=1;i<=12;i++)await touch('touchMove',{x:held.pts.nonslipMat.x+(held.pts.boardMat.x-held.pts.nonslipMat.x)*i/12,y:held.pts.nonslipMat.y+(held.pts.boardMat.y-held.pts.nonslipMat.y)*i/12});await mobile.frame();assert.equal(await mobile.canvas.getAttribute('data-mat-preview'),'true');assert.deepEqual(await mobile.current(),before);assert.equal(await phone.evaluate(()=>scrollY),held.scroll);await touch('touchEnd');after=await mobile.current();oneAction(before,after,'secure',true);
    held=await phoneStart('grip');u=await mobile.unit();for(let i=1;i<=8;i++)await touch('touchMove',{x:held.pts.grip.x,y:held.pts.grip.y-40*u*i/8});await mobile.frame();assert.equal(await mobile.canvas.getAttribute('data-grip-curl'),'100');assert.deepEqual(await mobile.current(),before);assert.equal(await phone.evaluate(()=>scrollY),held.scroll);await touch('touchEnd');after=await mobile.current();oneAction(before,after,'claw',true);
    held=await phoneStart('knife');u=await mobile.unit();for(let i=1;i<=8;i++)await touch('touchMove',{x:held.pts.knife.x,y:held.pts.knife.y+50*u*i/8});await mobile.frame();assert.equal(await mobile.canvas.getAttribute('data-cut-phase'),'up');assert.equal(await mobile.canvas.getAttribute('data-cut-preview'),'12');assert.deepEqual(await mobile.current(),before);await mobile.factual();assert.equal(await phone.evaluate(()=>scrollY),held.scroll);await shot(phone,'phone-knife-down-preview',true);for(let i=7;i>=0;i--)await touch('touchMove',{x:held.pts.knife.x,y:held.pts.knife.y+50*u*i/8});await mobile.frame();assert.equal(await mobile.canvas.getAttribute('data-cut-phase'),'ready');assert.deepEqual(await mobile.current(),before);await touch('touchEnd');after=await mobile.current();oneAction(before,after,'dice',true);assert.equal(after.done,true);await mobile.idle();await mobile.opened();
    await phone.setViewportSize({width:320,height:844});await mobile.frame();await mobile.visibleTools();await phone.locator('#retry').click();await mobile.open();for(const id of ['secure','claw','dice']){await phone.locator('[data-action="'+id+'"]').focus();await phone.keyboard.press('Enter');}assert.equal((await mobile.current()).done,true);await mobile.factual();assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px workspace has no horizontal overflow');await shot(phone,'closer-board-320');await audit(phone,'320px closer board and keyboard alternatives');await phone.close();
    report.checks.push('Native phone touch places the mat, curls the hand and completes the guided knife stroke without scrolling or premature evidence; 320px controls retain keyboard alternatives and no overflow.');
    assert.deepEqual(report.errors,[]);report.pass=true;
  }catch(error){report.pass=false;report.failure=error.stack;process.exitCode=1;}
  finally{
    report.mutantResponses=mutantResponses;report.sourceAfter=hash(helper);report.sourceUnchanged=report.sourceBefore===report.sourceAfter;
    if(!report.sourceUnchanged){report.pass=false;report.failure=(report.failure||'')+'\nSource helper changed during response-only mutation run.';process.exitCode=1;}
    if(mutant&&mutantResponses===0){report.pass=false;report.failure=(report.failure||'')+'\nMutation was not served.';process.exitCode=1;}
    fs.writeFileSync(path.join(out,mutant?'mutation-results.json':'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));
  }
})();
