/* Native pointer evidence for deliberate stirring, without changing saved engine rules. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/kitchen-studio-stir'),key='alloflow-kitchen-studio-v1';
const clone=value=>JSON.parse(JSON.stringify(value));
function step(before,after){
  assert.equal(after.log.length,before.log.length+1,'Exactly one cooking decision');
  assert.equal(after.log.at(-1).action,'advance','Stir uses the existing advance action');
  assert.equal(after.values.seconds,(before.values.seconds||0)+30,'One 30-second simulated step');
  for(const name of ['dry','spread','heat'])assert.equal(after.values[name],before.values[name],name+' preserved');
  if(!before.values.dry||!before.values.spread||before.values.heat!=='medium'&&before.values.heat!=='high')assert.equal(after.values.brown||0,before.values.brown||0,'Stir cannot bypass pan conditions');
}
if(process.argv.includes('--selftest')){
  const before={log:[],values:{seconds:0,brown:0,heat:'medium',dry:false,spread:true}},after=clone(before);
  after.log.push({action:'advance'});after.values.seconds=30;step(before,after);
  for(const mutate of [s=>s.log.push({action:'advance'}),s=>s.log[0].action='spread',s=>s.values.seconds=60,s=>s.values.brown=1,s=>s.values.dry=true]){
    const bad=clone(after);mutate(bad);assert.throws(()=>step(before,bad));
  }
  console.log('PASS: one-step evidence oracle rejects duplicate, wrong-action, time, condition and browning mutations.');process.exit(0);
}
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404).end();return;}
    if(process.argv.includes('--mutant-action')&&file.endsWith('kitchen_studio_stir.js'))data=Buffer.from(data.toString().replace("action:'advance'","action:'spread'"));
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(data);
  });
});
function controls(page){
  const canvas=page.locator('#scene canvas');
  const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const current=async()=>{const s=await saved();return s.serviceActive?s.service.work:s.drafts[s.current];};
  const action=id=>page.locator('[data-action="'+id+'"]').click();
  async function points(){await canvas.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return canvas.evaluate(el=>{const b=el.getBoundingClientRect(),p=JSON.parse(el.dataset.targets);return Object.fromEntries(Object.entries(p).map(([k,v])=>[k,{x:v.x+b.left,y:v.y+b.top}]));});}
  async function station(id){await page.locator('[data-station="'+id+'"]').click();await page.locator('#focusView').click();}
  async function held(direction=1,count=16){
    const p=await points(),a=p.spatula,b=p.stirStart;
    await page.mouse.move(a.x,a.y);await page.mouse.down();assert.equal(await canvas.getAttribute('data-held'),'spatula');
    await page.mouse.move(b.x,b.y,{steps:12});
    for(let i=1;i<=count;i++){const q=p['stirPoint'+((direction*i%16+16)%16)];await page.mouse.move(q.x,q.y,{steps:4});}
    return p;
  }
  async function stir(direction=1){const before=await current();await held(direction);assert.equal(await canvas.getAttribute('data-phase'),'ready');assert.deepEqual(await current(),before,'Preview leaves evidence unchanged');await page.mouse.up();const after=await current();step(before,after);return after;}
  async function idle(){assert.equal(await canvas.getAttribute('data-held'),'');assert.equal(await canvas.getAttribute('data-stir-phase'),'idle');assert.equal(await page.locator('#studioPlacementHint').isVisible(),false);}
  return {canvas,saved,current,action,points,station,held,stir,idle};
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const result={checks:[],accessibility:[],screenshots:[],errors:[]};
  async function open(options={}){
    const p=await browser.newPage({viewport:{width:1360,height:1000},reducedMotion:'reduce',...options});p.setDefaultTimeout(20000);
    p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='warning'&&m.text().startsWith('Kitchen Studio'))result.errors.push(m.text());});
    await p.goto('http://127.0.0.1:'+server.address().port+'/stem_lab/kitchen_studio/index.html');await p.locator('#scene canvas[data-targets]').waitFor();return p;
  }
  async function shot(p,name){await p.locator('.scene-card').screenshot({path:path.join(out,name+'.png'),style:'.taskbar{visibility:hidden!important}'});result.screenshots.push(name+'.png');}
  async function audit(p,label){await p.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const issues=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));result.accessibility.push({label,issues});assert.deepEqual(issues,[]);}
  try{
    let before,p;
    if(!process.argv.includes('--phone-only')){
    const page=await open(),ui=controls(page);await ui.station('heat');
    assert.equal(await page.locator('#studioArrangeMode').getAttribute('aria-pressed'),'true');
    await page.locator('#studioStirMode').click();before=await ui.current();
    await ui.held(1,8);assert.deepEqual(await ui.current(),before);await page.mouse.up();await ui.idle();assert.deepEqual(await ui.current(),before);
    p=await ui.points();await page.mouse.click(p.spatula.x,p.spatula.y);assert.deepEqual(await ui.current(),before);
    result.checks.push('Arrange remains the default; taps and partial circles do not cook or change evidence.');
    await ui.action('spread');await ui.action('medium');before=await ui.current();
    await ui.held();assert.equal(await ui.canvas.getAttribute('data-phase'),'ready');assert.deepEqual(await ui.current(),before);await shot(page,'stir-ready-desktop');await page.mouse.up();step(before,await ui.current());
    await ui.canvas.dispatchEvent('pointerup',{pointerId:1,pointerType:'mouse',bubbles:true});assert.equal((await ui.current()).log.length,before.log.length+1);
    await ui.action('dry');await ui.action('crowd');await ui.stir(-1);assert.equal((await ui.current()).values.brown||0,0);
    result.checks.push('CW and CCW circles each commit exactly one existing advance on release; wet or crowded mushrooms stay pale. Duplicate release is inert.');
    for(const cancel of ['Escape','pointercancel','blur','outside','text','mode','station','resize']){
      before=await ui.current();await ui.held();
      if(cancel==='Escape')await page.keyboard.press('Escape');
      if(cancel==='pointercancel')await ui.canvas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true});
      if(cancel==='blur')await page.evaluate(()=>dispatchEvent(new Event('blur')));
      if(cancel==='outside'){const b=await ui.canvas.boundingBox();await page.mouse.move(b.x+b.width+20,b.y+20);}
      if(cancel==='text')await page.locator('#viewToggle').evaluate(el=>el.click());
      if(cancel==='mode')await page.locator('#studioArrangeMode').evaluate(el=>el.click());
      if(cancel==='station')await page.locator('[data-station="knife"]').evaluate(el=>el.click());
      if(cancel==='resize')await page.setViewportSize({width:1320,height:1000});
      await page.mouse.up();
      if(cancel==='text')await page.locator('#viewToggle').click();
      if(cancel==='station')await ui.station('heat');
      if(cancel==='resize')await page.setViewportSize({width:1360,height:1000});
      if(cancel==='mode')await page.locator('#studioStirMode').click();
      await ui.idle();assert.deepEqual(await ui.current(),before,cancel+' keeps evidence unchanged');
    }
    result.checks.push('Escape, pointer cancellation, blur, outside release, text view, technique/station changes and resize cancel a ready stir without recording it.');
    await page.locator('#retry').click();await ui.action('dry');await ui.action('spread');await ui.action('medium');
    for(let i=0;i<3;i++)await ui.stir(i%2?-1:1);
    let golden=await ui.current();assert.equal(golden.values.brown,3);assert.equal(golden.values.seconds,90);await shot(page,'stir-golden-desktop');
    await ui.action('plate');assert.equal((await ui.current()).done,true);assert.equal((await ui.current()).values.heat,null);
    assert.equal(await page.locator('#studioStirStep').isDisabled(),true);
    await page.locator('input[name=reason][value="0"]').check();await page.locator('#submit').click();
    if(!(await page.locator('#replayPanel').evaluate(el=>el.open)))await page.locator('#replayPanel>summary').click();
    await page.locator('#replayStep').fill('0');await page.locator('#replayStep').dispatchEvent('input');before=await ui.saved();
    assert.equal(await page.locator('#studioStirMode').isDisabled(),true);p=await ui.points();await page.mouse.click(p.spatula.x,p.spatula.y);await page.locator('#studioStirStep').evaluate(el=>el.click());assert.deepEqual(await ui.saved(),before);
    await page.locator('#returnLatest').click();await audit(page,'Desktop stirring and completed evidence');
    result.checks.push('Three dry, spaced, medium-heat stirs reach golden browning; plating switches off heat. Completion and historical replay reject stirring changes.');
    await page.close();
    }
    const phone=await open({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),mobile=controls(phone);await mobile.station('heat');
    await mobile.action('dry');await mobile.action('spread');await mobile.action('medium');await phone.locator('#studioStirMode').click();
    const cdp=await phone.context().newCDPSession(phone),touch=(type,at)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{id:1,x:at.x,y:at.y,radiusX:4,radiusY:4,force:1}]});
    p=await mobile.points();before=await mobile.current();const scroll=await phone.evaluate(()=>scrollY);await touch('touchStart',p.spatula);assert.equal(await mobile.canvas.getAttribute('data-held'),'spatula');
    for(let i=1;i<=12;i++)await touch('touchMove',{x:p.spatula.x+(p.stirStart.x-p.spatula.x)*i/12,y:p.spatula.y+(p.stirStart.y-p.spatula.y)*i/12});
    for(let i=1;i<=16;i++)await touch('touchMove',p['stirPoint'+i%16]);
    await phone.waitForFunction(()=>document.querySelector('#scene canvas').dataset.phase==='ready');
    assert.equal(await mobile.canvas.getAttribute('data-phase'),'ready',JSON.stringify({dataset:await mobile.canvas.evaluate(el=>({...el.dataset})),hint:await phone.locator('#studioTouchHint').textContent(),before}));assert.deepEqual(await mobile.current(),before);assert.equal(await phone.evaluate(()=>scrollY),scroll,'Touch movement does not scroll');await shot(phone,'stir-ready-phone');const releaseScroll=await phone.evaluate(()=>scrollY);await touch('touchEnd');step(before,await mobile.current());await mobile.idle();assert.equal(await phone.evaluate(()=>scrollY),releaseScroll,'Touch release does not scroll');
    result.checks.push('Native phone touch completes a full stir without scrolling or premature evidence; release advances once.');
    await phone.setViewportSize({width:320,height:844});await phone.locator('#studioStirStep').focus();await phone.keyboard.press('Enter');await phone.locator('#studioStirStep').focus();await phone.keyboard.press('Space');
    assert.equal((await mobile.current()).values.brown,3);assert.equal((await mobile.current()).values.seconds,90);assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await shot(phone,'stir-keyboard-320');await audit(phone,'320px stirring keyboard alternative');await phone.close();
    result.checks.push('The native keyboard alternative produces the same 30-second steps with Enter/Space at 320px, with no page overflow.');
    assert.deepEqual(result.errors,[]);result.pass=true;
  }catch(error){result.pass=false;result.failure=error.stack;process.exitCode=1;}
  finally{fs.writeFileSync(path.join(out,process.argv.includes('--mutant-action')?'mutation-results.json':'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
})();
