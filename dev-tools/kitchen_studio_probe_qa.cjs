/* Native placement, cutaway and fresh-reading evidence using the real studio entry. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/kitchen-studio-probe'),key='alloflow-kitchen-studio-v1';
function tip(actual,placement){const expected={x:placement==='surface'?1.9605:1.65,y:1.56,z:-.85};for(const axis of ['x','y','z'])assert.ok(Math.abs(actual[axis]-expected[axis])<.00001,'Sensing tip matches '+placement+' '+axis);}
if(process.argv.includes('--selftest')){
  for(const kind of ['thick','surface']){const p={x:kind==='surface'?1.9605:1.65,y:1.56,z:-.85};tip(p,kind);for(const axis of ['x','y','z'])assert.throws(()=>tip({...p,[axis]:p[axis]+.07},kind));}
  console.log('PASS: sensing-tip oracle rejects displaced core and surface endpoints.');process.exit(0);
}
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}
    if(process.argv.includes('--mutant-tip')&&file.endsWith('kitchen_studio_probe.js'))data=Buffer.from(data.toString().replace('tip.y+axisY*.22','tip.y+axisY*.32'));
    res.setHeader('Content-Type',({'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(data);
  });
});
function controls(page){
  const canvas=page.locator('#scene canvas'),saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const current=async()=>{const s=await saved();return s.drafts[s.current];};
  const action=id=>page.locator('[data-action="'+id+'"]').click();
  async function station(id){await page.locator('[data-station="'+id+'"]').click();await page.locator('#focusView').click();}
  async function points(){await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'auto'}));await page.waitForFunction(()=>{const c=document.querySelector('#scene canvas'),b=c.getBoundingClientRect();return Math.abs(Number(c.dataset.targetWidth)-b.width)<.1&&Math.abs(Number(c.dataset.targetHeight)-b.height)<.1;});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return canvas.evaluate(el=>{const b=el.getBoundingClientRect();return Object.fromEntries(Object.entries(JSON.parse(el.dataset.targets)).map(([k,v])=>[k,{x:b.left+v.x,y:b.top+v.y}]));});}
  async function carry(to){const p=await points();await page.mouse.move(p.probe.x,p.probe.y);await page.mouse.down();await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.held==='probe');assert.equal(await canvas.getAttribute('data-held'),'probe',JSON.stringify({at:p.probe,element:await page.evaluate(q=>{const el=document.elementFromPoint(q.x,q.y);return el?{tag:el.tagName,id:el.id}:null;},p.probe),status:await page.locator('#studioTouchStatus').textContent()}));await page.mouse.move(p[to].x,p[to].y,{steps:12});}
  async function drop(to){await carry(to);await page.mouse.up();}
  const actualTip=async()=>JSON.parse(await canvas.getAttribute('data-probe-tip'));
  async function idle(){assert.equal(await canvas.getAttribute('data-held'),'');assert.equal(await canvas.getAttribute('data-probe-preview'),'');assert.equal(await page.locator('#studioPlacementHint').isVisible(),false);}
  return {canvas,saved,current,action,station,points,carry,drop,actualTip,idle};
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const report={checks:[],accessibility:[],screenshots:[],errors:[]};
  async function open(options={}){const p=await browser.newPage({viewport:{width:1360,height:1000},reducedMotion:'reduce',...options});p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='warning'&&m.text().startsWith('Kitchen Studio'))report.errors.push(m.text());});await p.goto('http://127.0.0.1:'+server.address().port+'/stem_lab/kitchen_studio/index.html');await p.locator('#scene canvas[data-targets]').waitFor();return p;}
  async function shot(p,name,view=false){await p.locator(view?'.scene-viewport':'.scene-card').screenshot({path:path.join(out,name+'.png'),style:'.taskbar{visibility:hidden!important}'});report.screenshots.push(name+'.png');}
  async function audit(p,label){await p.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const issues=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));report.accessibility.push({label,issues});assert.deepEqual(issues,[]);}
  try{
    let before,after,p;
    if(!process.argv.includes('--phone-only')){
    const page=await open(),ui=controls(page);await ui.station('probe');before=await ui.saved();
    assert.equal(await page.locator('#studioProbeRead').isDisabled(),true);await page.locator('#studioProbeCutaway').click();assert.equal(await ui.canvas.getAttribute('data-probe-cutaway'),'true');assert.deepEqual(await ui.saved(),before);
    await ui.carry('probeCenter');assert.equal(await ui.canvas.getAttribute('data-probe-preview'),'thick');tip(await ui.actualTip(),'thick');assert.equal(await ui.canvas.getAttribute('data-probe-badge'),'preview');assert.equal(await page.locator('#stationLens').isVisible(),false);assert.deepEqual(await ui.saved(),before);await shot(page,'core-tip-preview');
    await page.keyboard.press('Escape');await page.mouse.up();await ui.idle();assert.deepEqual(await ui.saved(),before);assert.equal(await ui.canvas.getAttribute('data-probe-badge'),'unread');
    report.checks.push('Cutaway is view-only; core preview snaps the actual sensing tip to the centre, hides old readings, and cancels without evidence.');
    before=await ui.current();await ui.drop('probeCenter');after=await ui.current();assert.equal(after.log.length,before.log.length+1);assert.equal(after.log.at(-1).action,'thick');assert.equal(after.values.reading,null);tip(await ui.actualTip(),'thick');assert.ok(!/\d+°F/.test(await page.locator('#studioProbeReadout').textContent()));
    await page.locator('#studioProbeRead').click();assert.equal((await ui.current()).values.reading,150);assert.equal(await ui.canvas.getAttribute('data-probe-badge'),'internal');
    await page.locator('#studioProbeCutaway').click();before=await ui.saved();const priorTip=await ui.actualTip();
    for(const cancel of ['Escape','pointercancel','blur','outside','resize','text','toggle']){
      try{await ui.carry('probeSurface');}catch(e){throw new Error('Cancellation case '+cancel+': '+e.message);}tip(await ui.actualTip(),'surface');assert.equal(await ui.canvas.getAttribute('data-probe-badge'),'preview');assert.deepEqual(await ui.saved(),before);assert.equal(await page.locator('#studioProbeRead').isDisabled(),true);
      if(cancel==='Escape')await page.keyboard.press('Escape');
      if(cancel==='pointercancel')await ui.canvas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true});
      if(cancel==='blur')await page.evaluate(()=>dispatchEvent(new Event('blur')));
      if(cancel==='outside'){const b=await ui.canvas.boundingBox();await page.mouse.move(b.x+b.width+20,b.y+20);}
      if(cancel==='resize')await page.setViewportSize({width:1300,height:950});
      if(cancel==='text')await page.locator('#viewToggle').evaluate(el=>el.click());
      if(cancel==='toggle')await page.locator('#studioProbeCutaway').evaluate(el=>el.click());
      await page.mouse.up();if(cancel==='resize')await page.setViewportSize({width:1360,height:1000});if(cancel==='text')await page.locator('#viewToggle').click();await ui.idle();assert.deepEqual(await ui.saved(),before);assert.deepEqual(await ui.actualTip(),priorTip);assert.equal(await ui.canvas.getAttribute('data-probe-placement'),'thick');assert.equal(await ui.canvas.getAttribute('data-probe-badge'),'internal');assert.match(await page.locator('#studioProbeReadout').textContent(),/150°F/);
      if(cancel!=='toggle')assert.equal(await ui.canvas.getAttribute('data-probe-cutaway'),'false');
    }
    const beforeStation=await ui.current();await ui.station('heat');assert.equal(await page.locator('#studioProbeControls').isVisible(),false);await ui.station('probe');assert.deepEqual(await ui.current(),beforeStation);assert.equal(await ui.canvas.getAttribute('data-probe-cutaway'),'false');
    report.checks.push('Moving a previously read probe displays PREVIEW; Escape, cancellation, blur, outside release and view changes restore its exact tip, reading and cutaway preference.');
    await ui.drop('probeSurface');tip(await ui.actualTip(),'surface');assert.equal((await ui.current()).values.reading,null);await page.locator('#studioProbeRead').click();assert.equal((await ui.current()).values.reading,180);assert.match(await page.locator('#studioProbeReadout').textContent(),/surface.*180°F/);await shot(page,'surface-tip-reading');
    await ui.action('serve');assert.equal((await ui.current()).done,false);await ui.drop('probeCenter');assert.equal((await ui.current()).values.reading,null);await page.locator('#studioProbeRead').click();assert.equal((await ui.current()).values.reading,150);
    await ui.action('cook');assert.equal((await ui.current()).values.reading,null);await page.locator('#studioProbeRead').click();assert.equal((await ui.current()).values.reading,155);await ui.action('cook');await ui.action('cook');assert.equal((await ui.current()).values.reading,null);await page.locator('#studioProbeRead').click();assert.equal((await ui.current()).values.reading,165);
    before=await ui.current();let movingPlate=await ui.points();await page.mouse.move(movingPlate.chickenPlate.x,movingPlate.chickenPlate.y);await page.mouse.down();assert.equal(await ui.canvas.getAttribute('data-held'),'chickenPlate');await page.mouse.move(movingPlate.ovenDrop.x,movingPlate.ovenDrop.y,{steps:12});assert.match(await page.locator('#studioProbeReadout').textContent(),/^Chicken movement preview/);assert.equal(await page.locator('#studioProbeRead').isDisabled(),true);assert.deepEqual(await ui.current(),before);await page.keyboard.press('Escape');await page.mouse.up();assert.match(await page.locator('#studioProbeReadout').textContent(),/165°F/);assert.equal(await ui.canvas.getAttribute('data-probe-placement'),'thick');assert.deepEqual(await ui.current(),before);
    before=await ui.current();await ui.action('serve');assert.equal((await ui.current()).done,true);assert.equal((await ui.current()).log.length,before.log.length+1);assert.match(await page.locator('#studioProbeReadout').textContent(),/Food served; thermometer at rest/);assert.equal(await page.locator('#studioProbeRead').isDisabled(),true);
    report.checks.push('Exact surface and core poses retain distinct explicit readings; repositioning/cooking invalidate readings and serving still requires the engine’s fresh internal evidence.');
    await page.locator('input[name=reason][value="1"]').check();await page.locator('#submit').click();const recorded=await ui.current(),surfaceStep=recorded.log.findIndex(e=>e.action==='read'&&e.values.reading===180)+1;
    if(!(await page.locator('#replayPanel').evaluate(el=>el.open)))await page.locator('#replayPanel>summary').click();await page.locator('#replayStep').fill(String(surfaceStep));await page.locator('#replayStep').dispatchEvent('input');before=await ui.saved();
    tip(await ui.actualTip(),'surface');assert.match(await page.locator('#studioProbeReadout').textContent(),/^Recorded thermometer:.*surface.*180°F/);assert.equal(await page.locator('#studioProbeCutaway').isDisabled(),false);await page.locator('#studioProbeCutaway').click();await page.locator('#studioProbeCutaway').click();
    p=await ui.points();await page.mouse.move(p.probe.x,p.probe.y);await page.mouse.down();await page.mouse.move(p.probeCenter.x,p.probeCenter.y);await page.mouse.up();await page.locator('#studioProbeRead').evaluate(el=>el.click());assert.deepEqual(await ui.saved(),before);
    await shot(page,'recorded-probe-inspection');await audit(page,'Desktop probe cutaway and historical reading');await page.close();
    report.checks.push('Historical cutaway follows the displayed placement/reading and remains inspectable while all new cooking input stays locked.');
    }
    const phone=await open({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),mobile=controls(phone);await mobile.station('probe');await phone.locator('#studioProbeCutaway').click();p=await mobile.points();before=await mobile.current();const scroll=await phone.evaluate(()=>scrollY),cdp=await phone.context().newCDPSession(phone);
    const touch=(type,q)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x:q.x,y:q.y,radiusX:4,radiusY:4,force:1}]});
    await touch('touchStart',p.probe);await phone.waitForFunction(()=>document.querySelector('#scene canvas').dataset.held==='probe');assert.equal(await mobile.canvas.getAttribute('data-held'),'probe');for(let i=1;i<=12;i++)await touch('touchMove',{x:p.probe.x+(p.probeCenter.x-p.probe.x)*i/12,y:p.probe.y+(p.probeCenter.y-p.probe.y)*i/12});await phone.waitForFunction(()=>document.querySelector('#scene canvas').dataset.probePreview==='thick');
    tip(await mobile.actualTip(),'thick');assert.deepEqual(await mobile.current(),before);assert.equal(await phone.evaluate(()=>scrollY),scroll);await shot(phone,'phone-probe-preview',true);await touch('touchEnd');after=await mobile.current();assert.equal(after.log.length,before.log.length+1,await phone.locator('#studioTouchStatus').textContent());assert.equal(after.log.at(-1).action,'thick');assert.equal(after.values.reading,null);
    await phone.locator('#studioProbeRead').focus();await phone.keyboard.press('Enter');assert.equal((await mobile.current()).values.reading,150);await phone.setViewportSize({width:320,height:844});await phone.locator('[data-action="surface"]').focus();await phone.keyboard.press('Enter');await phone.locator('#studioProbeRead').focus();await phone.keyboard.press('Space');assert.equal((await mobile.current()).values.reading,180);assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await shot(phone,'probe-keyboard-320');await audit(phone,'320px thermometer controls');await phone.close();report.checks.push('Native phone placement commits once on release without scrolling; keyboard placement and fresh reading work at 320px without overflow.');
    assert.deepEqual(report.errors,[]);report.pass=true;
  }catch(error){report.pass=false;report.failure=error.stack;process.exitCode=1;}
  finally{fs.writeFileSync(path.join(out,process.argv.includes('--mutant-tip')?'mutation-results.json':'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
})();
