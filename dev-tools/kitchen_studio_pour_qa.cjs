/* Native carry/tip/upright/release evidence for the optional 50 mL carton technique. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/kitchen-studio-pour'),key='alloflow-kitchen-studio-v1';
const clone=x=>JSON.parse(JSON.stringify(x));
function onePour(before,after){assert.equal(after.log.length,before.log.length+1,'One decision per release');assert.equal(after.log.at(-1).action,'add50','Controlled pour uses add50');assert.equal(after.values.ml,Math.min(1000,(before.values.ml||0)+50),'One capped 50 mL measure');}
if(process.argv.includes('--selftest')){
  const a={values:{ml:150},log:[]},b={values:{ml:200},log:[{action:'add50'}]};onePour(a,b);
  for(const mutate of [s=>s.log.push({action:'add50'}),s=>s.log[0].action='add150',s=>s.values.ml=300]){const bad=clone(b);mutate(bad);assert.throws(()=>onePour(a,bad));}
  onePour({values:{ml:1000},log:[]},{values:{ml:1000},log:[{action:'add50'}]});console.log('PASS: pour oracle rejects duplicate, wrong-action and wrong-quantity mutations.');process.exit(0);
}
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}
    if(process.argv.includes('--mutant-amount')&&file.endsWith('kitchen_studio_pour.js'))data=Buffer.from(data.toString().replace("action:'add50'","action:'add150'"));
    res.setHeader('Content-Type',({'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(data);
  });
});
function controls(page){
  const canvas=page.locator('#scene canvas'),saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const current=async()=>{const s=await saved();return s.serviceActive?s.service.work:s.drafts[s.current];};
  const action=id=>page.locator('[data-action="'+id+'"]').click();
  async function station(id){await page.locator('[data-station="'+id+'"]').click();await page.locator('#focusView').click();}
  async function points(){await canvas.evaluate(el=>el.scrollIntoView({block:'center',behavior:'auto'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.waitForFunction(()=>{const el=document.querySelector('#scene canvas'),b=el.getBoundingClientRect();return Math.abs(Number(el.dataset.targetWidth)-b.width)<.1&&Math.abs(Number(el.dataset.targetHeight)-b.height)<.1;});return canvas.evaluate(el=>{const b=el.getBoundingClientRect();return Object.fromEntries(Object.entries(JSON.parse(el.dataset.targets)).map(([k,v])=>[k,{x:b.left+v.x,y:b.top+v.y}]));});}
  async function aim(){const p=await points();await page.mouse.move(p.stockCarton.x,p.stockCarton.y);await page.mouse.down();await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.held==='stockCarton').catch(async e=>{throw new Error(e.message+' '+JSON.stringify({held:await canvas.getAttribute('data-held'),status:await page.locator('#studioTouchStatus').textContent(),at:p.stockCarton,element:await page.evaluate(q=>{const el=document.elementFromPoint(q.x,q.y);return el?{tag:el.tagName,id:el.id}:null;},p.stockCarton)}));});await page.mouse.move(p.jugFill.x,p.jugFill.y,{steps:12});await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.pourPhase==='tilt');return {anchor:JSON.parse(await canvas.getAttribute('data-pour-anchor')),unit:(await canvas.boundingBox()).height/420};}
  async function tilted(){const g=await aim();await page.mouse.move(g.anchor.x,g.anchor.y+44*g.unit,{steps:8});await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.pourPhase==='return');return g;}
  async function ready(){const g=await tilted();await page.mouse.move(g.anchor.x,g.anchor.y,{steps:8});await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.pourPhase==='ready');return g;}
  async function idle(){assert.equal(await canvas.getAttribute('data-held'),'');assert.equal(await canvas.getAttribute('data-pour-phase'),'idle');assert.equal(await canvas.getAttribute('data-stock-stream'),'false');assert.equal(await canvas.getAttribute('data-measure-preview'),'');assert.equal(await page.locator('#studioPourGuide').isVisible(),false);}
  return {canvas,saved,current,action,station,points,aim,tilted,ready,idle};
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const report={checks:[],accessibility:[],screenshots:[],errors:[]};
  async function open(options={}){const p=await browser.newPage({viewport:{width:1360,height:1000},reducedMotion:'reduce',...options});p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='warning'&&m.text().startsWith('Kitchen Studio'))report.errors.push(m.text());});await p.goto('http://127.0.0.1:'+server.address().port+'/stem_lab/kitchen_studio/index.html');await p.locator('#scene canvas[data-targets]').waitFor();return p;}
  async function shot(p,name,held=false){await p.locator(held?'.scene-viewport':'.scene-card').screenshot({path:path.join(out,name+'.png'),style:'.taskbar{visibility:hidden!important}'});report.screenshots.push(name+'.png');}
  async function audit(p,label){await p.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const issues=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));report.accessibility.push({label,issues});assert.deepEqual(issues,[]);}
  try{
    let before,after,g,p;
    if(!process.argv.includes('--phone-only')){
      const page=await open(),ui=controls(page);await ui.station('measure');assert.equal(await page.locator('#studioPortionPour').getAttribute('aria-pressed'),'true');await page.locator('#studioControlledPour').click();before=await ui.current();
      await ui.aim();await page.mouse.up();await ui.idle();assert.deepEqual(await ui.current(),before,'A carry alone does not pour in controlled mode');
      g=await ui.aim();await page.mouse.move(g.anchor.x,g.anchor.y+25*g.unit,{steps:8});assert.equal(await ui.canvas.getAttribute('data-stock-stream'),'true');assert.equal(await ui.canvas.getAttribute('data-measure-preview'),'0');await page.mouse.up();await ui.idle();assert.deepEqual(await ui.current(),before,'Partial tip does not pour');
      await ui.tilted();assert.equal(await ui.canvas.getAttribute('data-measure-preview'),'50');await shot(page,'carton-tipped-preview',true);await page.mouse.up();await ui.idle();assert.deepEqual(await ui.current(),before,'Tilted release does not pour');
      report.checks.push('Controlled mode requires tip and upright return; carrying, partial tipping and releasing while tilted never change the measured record.');
      g=await ui.ready();assert.equal(await ui.canvas.getAttribute('data-measure-preview'),'50');assert.equal(await ui.canvas.getAttribute('data-stock-stream'),'false');assert.deepEqual(await ui.current(),before);await shot(page,'carton-upright-preview',true);await page.mouse.up();after=await ui.current();onePour(before,after);await ui.idle();await ui.canvas.dispatchEvent('pointerup',{pointerId:1,pointerType:'mouse',bubbles:true});assert.deepEqual(await ui.current(),after);
      report.checks.push('The 50 mL preview remains when upright, its stream stops, and release records exactly one add50; duplicate release is inert.');
      for(const cancel of ['Escape','pointercancel','blur','offmouth','outside','mode','inspection','resize','text','camera','look','lostcapture']){
        before=await ui.current();try{g=await ui.ready();}catch(e){throw new Error('Cancellation case '+cancel+': '+e.message);}
        if(cancel==='Escape')await page.keyboard.press('Escape');
        if(cancel==='pointercancel')await ui.canvas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true});
        if(cancel==='blur')await page.evaluate(()=>dispatchEvent(new Event('blur')));
        if(cancel==='offmouth')await page.mouse.move(g.anchor.x+40*g.unit,g.anchor.y);
        if(cancel==='outside'){const b=await ui.canvas.boundingBox();await page.mouse.move(b.x+b.width+20,b.y+20);}
        if(cancel==='mode')await page.locator('#studioPortionPour').evaluate(el=>el.click());
        if(cancel==='inspection')await page.locator('#studioMeasureOpen').evaluate(el=>el.click());
        if(cancel==='resize')await page.setViewportSize({width:1200,height:950});
        if(cancel==='text')await page.locator('#viewToggle').evaluate(el=>el.click());
        if(cancel==='camera')await page.locator('#rotateRight').evaluate(el=>el.click());
        if(cancel==='lostcapture'){await ui.canvas.evaluate(el=>el.releasePointerCapture(1));await page.mouse.move(g.anchor.x+1,g.anchor.y);await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.held==='');}
        if(cancel==='look')await page.locator('#studioInteractionMode').evaluate(el=>el.click());
        await page.mouse.up();await ui.idle();assert.deepEqual(await ui.current(),before,cancel+' preserves state');
        if(cancel==='mode'||cancel==='look')await page.locator('#studioControlledPour').click();
        if(cancel==='inspection')await page.locator('#studioMeasureClose').click();
        if(cancel==='resize'){await page.setViewportSize({width:1360,height:1000});await page.locator('#focusView').click();}
        if(cancel==='text')await page.locator('#viewToggle').click();
        if(cancel==='camera')await page.locator('#focusView').click();
      }
      before=await ui.current();await ui.ready();await ui.canvas.dispatchEvent('lostpointercapture',{pointerId:1,pointerType:'mouse',bubbles:true});assert.equal(await ui.canvas.getAttribute('data-held'),'stockCarton','Stale capture notification leaves current capture intact');await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual(await ui.current(),before);
      before=await ui.current();await ui.ready();await page.locator('[data-station="heat"]').evaluate(el=>el.click());await page.mouse.up();assert.deepEqual((await ui.saved()).drafts.measure,before);await ui.station('measure');
      await ui.ready();await page.locator('#retry').evaluate(el=>el.click());await page.mouse.up();assert.equal((await ui.current()).log.length,0);await ui.idle();
      report.checks.push('Ready pours cancel cleanly on release off mouth/outside, Escape, pointer cancellation, blur, technique/inspection/view/station/retry changes, resize and Look around.');
      await page.locator('#mode').selectOption('demonstrate');assert.ok(!/450\s*mL/.test(await page.locator('#goal').textContent()));before=await ui.current();await ui.ready();await page.mouse.up();onePour(before,await ui.current());
      for(let i=0;i<8;i++){await page.locator('#studioPourStep').focus();await page.keyboard.press(i%2?'Space':'Enter');}assert.equal((await ui.current()).values.ml,450);assert.equal((await ui.current()).done,false);
      await page.locator('#studioMeasureOpen').click();await page.locator('#studioMeasureAlign').click();await page.locator('#studioMeasureCheck').click();assert.equal((await ui.current()).done,true);assert.equal(await page.locator('#studioPourStep').isDisabled(),true);
      await page.locator('input[name=reason][value="1"]').check();await page.locator('#submit').click();if(!(await page.locator('#replayPanel').evaluate(el=>el.open)))await page.locator('#replayPanel>summary').click();await page.locator('#replayStep').fill('1');await page.locator('#replayStep').dispatchEvent('input');before=await ui.saved();assert.equal(await ui.canvas.getAttribute('data-measure-ml'),'50');
      await page.locator('#studioPourStep').evaluate(el=>el.click());assert.deepEqual(await ui.saved(),before);assert.equal(await page.locator('#studioControlledPour').isDisabled(),true);await audit(page,'Desktop controlled pours and recorded amount');await page.locator('#returnLatest').click();await page.locator('#retry').click();await page.locator('#studioControlledPour').click();
      for(let i=0;i<6;i++)await ui.action('add150');await ui.action('add50');await ui.action('add50');before=await ui.current();await ui.tilted();assert.equal(await ui.canvas.getAttribute('data-stock-stream'),'false');p=JSON.parse(await ui.canvas.getAttribute('data-pour-anchor'));await page.mouse.move(p.x,p.y,{steps:8});await page.mouse.up();onePour(before,await ui.current());assert.equal((await ui.current()).values.ml,1000);await ui.idle();await page.close();
      report.checks.push('Keyboard pours remain explicit, demonstration gives no target answer, eye-level check is deliberate, replay is locked, and a full jug never streams or exceeds 1000 mL.');
    }
    const phone=await open({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),mobile=controls(phone);await mobile.station('measure');await phone.locator('#studioControlledPour').click();p=await mobile.points();before=await mobile.current();const scroll=await phone.evaluate(()=>scrollY),cdp=await phone.context().newCDPSession(phone);
    const touch=(type,q)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x:q.x,y:q.y,radiusX:4,radiusY:4,force:1}]});
    await touch('touchStart',p.stockCarton);await phone.waitForFunction(()=>document.querySelector('#scene canvas').dataset.held==='stockCarton');for(let i=1;i<=12;i++)await touch('touchMove',{x:p.stockCarton.x+(p.jugFill.x-p.stockCarton.x)*i/12,y:p.stockCarton.y+(p.jugFill.y-p.stockCarton.y)*i/12});await phone.waitForFunction(()=>document.querySelector('#scene canvas').dataset.pourPhase==='tilt');
    g={anchor:JSON.parse(await mobile.canvas.getAttribute('data-pour-anchor')),unit:(await mobile.canvas.boundingBox()).height/420};for(let i=1;i<=8;i++)await touch('touchMove',{x:g.anchor.x,y:g.anchor.y+44*g.unit*i/8});await phone.waitForFunction(()=>document.querySelector('#scene canvas').dataset.pourPhase==='return');assert.equal(await mobile.canvas.getAttribute('data-stock-stream'),'true');assert.deepEqual(await mobile.current(),before);await shot(phone,'phone-tipped-pour',true);
    for(let i=7;i>=0;i--)await touch('touchMove',{x:g.anchor.x,y:g.anchor.y+44*g.unit*i/8});await phone.waitForFunction(()=>document.querySelector('#scene canvas').dataset.pourPhase==='ready');assert.equal(await mobile.canvas.getAttribute('data-stock-stream'),'false');assert.deepEqual(await mobile.current(),before);assert.equal(await phone.evaluate(()=>scrollY),scroll);await touch('touchEnd');onePour(before,await mobile.current());await mobile.idle();
    await phone.setViewportSize({width:320,height:844});await phone.locator('#studioPourStep').focus();await phone.keyboard.press('Enter');assert.equal((await mobile.current()).values.ml,100);assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot(phone,'controlled-pour-320');await audit(phone,'320px controlled pouring');await phone.close();
    report.checks.push('Native phone touch tips and returns the carton without scrolling or premature additions; release and the 320px keyboard alternative each add one 50 mL measure.');assert.deepEqual(report.errors,[]);report.pass=true;
  }catch(error){report.pass=false;report.failure=error.stack;process.exitCode=1;}
  finally{fs.writeFileSync(path.join(out,process.argv.includes('--mutant-amount')?'mutation-results.json':'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
})();
