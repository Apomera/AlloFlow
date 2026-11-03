/* Exercise the actual pan workspace entry with native pointer, keyboard and phone inputs. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/kitchen-studio-pan-view'),key='alloflow-kitchen-studio-v1';
const clone=v=>JSON.parse(JSON.stringify(v));
function restored(before,after){for(const name of ['panCenter','spatula','dial','servingPlate','stirPoint0','stirPoint8'])for(const axis of ['x','y'])assert.ok(Math.abs(before[name][axis]-after[name][axis])<.0001,'Previous camera restored: '+name+'.'+axis);}
if(process.argv.includes('--selftest')){
  const p=Object.fromEntries(['panCenter','spatula','dial','servingPlate','stirPoint0','stirPoint8'].map((k,i)=>[k,{x:10+i,y:20+i}]));restored(p,clone(p));
  for(const name of Object.keys(p)){const bad=clone(p);bad[name].x+=1;assert.throws(()=>restored(p,bad));}
  console.log('PASS: camera restoration oracle rejects each deliberately moved target.');process.exit(0);
}
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}
    if(process.argv.includes('--mutant-restore')&&file.endsWith('kitchen_studio_pan_view.js'))data=Buffer.from(data.toString().replace('camera.zoom=saved.zoom;','camera.zoom=saved.zoom*1.5;'));
    res.setHeader('Content-Type',({'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');res.end(data);
  });
});
function controls(page){
  const canvas=page.locator('#scene canvas'),saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const current=async()=>{const s=await saved();return s.drafts[s.current];},heat=async()=>(await saved()).drafts.heat;
  const action=id=>page.locator('[data-action="'+id+'"]').click();
  async function targets(){return canvas.evaluate(el=>JSON.parse(el.dataset.targets));}
  async function points(){await canvas.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return canvas.evaluate(el=>{const b=el.getBoundingClientRect();return Object.fromEntries(Object.entries(JSON.parse(el.dataset.targets)).map(([k,v])=>[k,{x:b.left+v.x,y:b.top+v.y}]));});}
  async function station(id){await page.locator('[data-station="'+id+'"]').click();await page.locator('#focusView').click();}
  async function opened(){await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.panInspection==='true');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
  async function open(){await page.locator('#studioPanOpen').click();await opened();}
  async function angle(value){await page.locator('#studioPanAngle').fill(String(value));await page.locator('#studioPanAngle').dispatchEvent('input');}
  async function grab(){const p=await points();await page.mouse.move(p.spatula.x,p.spatula.y);await page.mouse.down();assert.equal(await canvas.getAttribute('data-held'),'spatula');return p;}
  async function held(){const p=await grab();await page.mouse.move(p.stirStart.x,p.stirStart.y,{steps:10});for(let i=1;i<=16;i++){const q=p['stirPoint'+i%16];await page.mouse.move(q.x,q.y);}await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.phase==='ready');}
  async function idle(){assert.equal(await canvas.getAttribute('data-held'),'');assert.equal(await canvas.getAttribute('data-stir-phase'),'idle');}
  async function visibleTools(){const p=await targets(),b=await canvas.boundingBox();for(const name of ['spatula','dial','servingPlate','stirPoint0','stirPoint8'])assert.ok(p[name].x>=0&&p[name].x<=b.width&&p[name].y>=0&&p[name].y<=b.height,name+' remains in reach');}
  return {canvas,saved,current,heat,action,targets,points,station,opened,open,angle,grab,held,idle,visibleTools};
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const report={checks:[],accessibility:[],screenshots:[],errors:[]};
  async function openPage(options={}){const p=await browser.newPage({viewport:{width:1360,height:1000},reducedMotion:'reduce',...options});p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='warning'&&m.text().startsWith('Kitchen Studio'))report.errors.push(m.text());});await p.goto('http://127.0.0.1:'+server.address().port+'/stem_lab/kitchen_studio/index.html');await p.locator('#scene canvas[data-targets]').waitFor();return p;}
  async function shot(p,name){if(await p.locator('#scene canvas').getAttribute('data-held'))await p.screenshot({path:path.join(out,name+'.png')});else await p.locator('.scene-card').screenshot({path:path.join(out,name+'.png'),style:'.taskbar{visibility:hidden!important}'});report.screenshots.push(name+'.png');}
  async function audit(p,label){await p.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const issues=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));report.accessibility.push({label,issues});assert.deepEqual(issues,[]);}
  try{
    const page=await openPage(),ui=controls(page);await ui.station('heat');await ui.points();let before=await ui.saved(),original=await ui.targets();
    const diameter=p=>Math.hypot(p.stirPoint8.x-p.stirPoint0.x,p.stirPoint8.y-p.stirPoint0.y),normalSize=diameter(original);
    await ui.open();assert.ok(diameter(await ui.targets())>normalSize*1.2,'Stir targets are visibly enlarged: '+JSON.stringify({normal:normalSize,closer:diameter(await ui.targets()),zoom:await ui.canvas.getAttribute('data-pan-view-zoom')}));
    for(const angle of [0,100,65]){await ui.angle(angle);await ui.visibleTools();assert.deepEqual(await ui.saved(),before);}
    await shot(page,'closer-pan-desktop');await page.locator('#studioPanClose').click();restored(original,await ui.targets());assert.equal(await page.locator('#studioPanOpen').evaluate(el=>el===document.activeElement),true);
    await ui.open();await page.locator('#studioPanAngle').focus();await page.keyboard.press('Home');assert.equal(await ui.canvas.getAttribute('data-pan-view-angle'),'0');await page.keyboard.press('End');assert.equal(await ui.canvas.getAttribute('data-pan-view-angle'),'100');await ui.angle(65);
    await page.locator('#studioInteractionMode').click();assert.equal(await ui.canvas.getAttribute('data-pan-inspection'),'false');restored(original,await ui.targets());
    await ui.open();assert.equal(await page.locator('#studioInteractionMode').getAttribute('aria-pressed'),'true');await page.locator('#studioPanOpen').click();assert.equal(await ui.canvas.getAttribute('data-pan-inspection'),'false');restored(original,await ui.targets());
    await ui.open();await page.locator('[data-studio-tool="spatula"]').click();await ui.opened();assert.deepEqual(await ui.saved(),before);
    report.checks.push('Closer view enlarges the guide, keeps utensils and serving plate visible at all angles, restores the previous camera, and supports keyboard angle changes without evidence changes.');
    let p=await ui.grab();await page.mouse.move(p.panCenter.x,p.panCenter.y,{steps:8});await page.mouse.up();assert.equal((await ui.current()).values.spread,false);await ui.opened();
    p=await ui.grab();await page.mouse.move(p.panEdge.x,p.panEdge.y,{steps:8});await page.mouse.up();assert.equal((await ui.current()).values.spread,true);await ui.action('dry');await ui.action('medium');await page.locator('#studioStirMode').click();
    before=await ui.current();await ui.held();assert.deepEqual(await ui.current(),before);await shot(page,'closer-stir-preview');await page.mouse.up();let after=await ui.current();assert.equal(after.log.length,before.log.length+1);assert.equal(after.log.at(-1).action,'advance');assert.equal(after.values.brown,1);await ui.opened();assert.match(await page.locator('#studioPanReadout').textContent(),/Beginning to brown.*30 simulated seconds/);
    report.checks.push('Physical arranging and a circular stir work inside the close-up; preview preserves evidence and the factual pan readout updates after release.');
    before=await ui.current();await ui.held();await ui.angle(100);await page.mouse.up();await ui.idle();await ui.opened();assert.deepEqual(await ui.current(),before);
    await ui.held();await page.keyboard.press('Escape');await page.mouse.up();await ui.opened();await ui.idle();assert.deepEqual(await ui.current(),before);await page.keyboard.press('Escape');assert.equal(await ui.canvas.getAttribute('data-pan-inspection'),'false');
    await ui.open();await ui.held();await page.setViewportSize({width:1100,height:900});await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.held==='');await page.mouse.up();await ui.opened();await ui.visibleTools();assert.deepEqual(await ui.current(),before);
    await page.locator('#viewToggle').click();assert.equal(await ui.canvas.getAttribute('data-pan-inspection'),'false');assert.deepEqual(await ui.current(),before);await page.locator('#viewToggle').click();
    await page.locator('#resetView').click();await ui.open();await page.locator('[data-station="knife"]').click();assert.equal(await ui.canvas.getAttribute('data-pan-inspection'),'false');assert.deepEqual(await ui.heat(),before);await ui.station('heat');
    report.checks.push('Angle changes, first-Escape cancellation, resize, text view and station changes cancel held previews safely; second Escape returns to the previous camera.');
    await ui.open();await ui.action('advance');await ui.action('advance');await ui.action('plate');assert.equal((await ui.current()).done,true);assert.match(await page.locator('#studioPanReadout').textContent(),/Golden.*Burner off.*90 simulated seconds/);
    await page.locator('input[name=reason][value="0"]').check();await page.locator('#submit').click();if(!(await page.locator('#replayPanel').evaluate(el=>el.open)))await page.locator('#replayPanel>summary').click();await page.locator('#replayStep').fill('0');await page.locator('#replayStep').dispatchEvent('input');
    await ui.opened();assert.match(await page.locator('#studioPanReadout').textContent(),/^Recorded pan: Pale.*Wet surface.*Burner off.*0 simulated seconds/);before=await ui.saved();await ui.angle(100);p=await ui.points();await page.mouse.click(p.spatula.x,p.spatula.y);assert.deepEqual(await ui.saved(),before);assert.equal(await page.locator('#studioStirStep').isDisabled(),true);
    await shot(page,'recorded-pan-inspection');await audit(page,'Desktop pan workspace and recorded view');await page.close();
    report.checks.push('Completed and historical pans remain inspectable, with recorded-state readouts and protected cooking evidence.');
    const phone=await openPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),mobile=controls(phone);await mobile.station('heat');await mobile.action('dry');await mobile.action('spread');await mobile.action('medium');await phone.locator('#studioStirMode').click();await mobile.open();await mobile.angle(100);await mobile.visibleTools();
    p=await mobile.points();before=await mobile.current();const scroll=await phone.evaluate(()=>scrollY),cdp=await phone.context().newCDPSession(phone);
    const touch=(type,q)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{id:1,x:q.x,y:q.y,radiusX:4,radiusY:4,force:1}]});
    await touch('touchStart',p.spatula);assert.equal(await mobile.canvas.getAttribute('data-held'),'spatula');for(let i=1;i<=12;i++)await touch('touchMove',{x:p.spatula.x+(p.stirStart.x-p.spatula.x)*i/12,y:p.spatula.y+(p.stirStart.y-p.spatula.y)*i/12});for(let i=1;i<=16;i++)await touch('touchMove',p['stirPoint'+i%16]);
    await phone.waitForFunction(()=>document.querySelector('#scene canvas').dataset.phase==='ready');assert.deepEqual(await mobile.current(),before);assert.equal(await phone.evaluate(()=>scrollY),scroll);await shot(phone,'closer-pan-phone-touch');await touch('touchEnd');after=await mobile.current();assert.equal(after.log.length,before.log.length+1);assert.equal(after.values.seconds,30);assert.equal(after.values.brown,1);await mobile.opened();
    await phone.setViewportSize({width:320,height:844});await mobile.visibleTools();await phone.locator('#studioStirStep').focus();await phone.keyboard.press('Enter');assert.equal((await mobile.current()).values.brown,2);assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot(phone,'closer-pan-320');await audit(phone,'320px closer pan workspace');await phone.close();
    report.checks.push('Native phone touch stirs in the enlarged overhead view without scrolling; the 320px workspace retains usable tools, keyboard steps and no overflow.');
    assert.deepEqual(report.errors,[]);report.pass=true;
  }catch(error){report.pass=false;report.failure=error.stack;process.exitCode=1;}
  finally{fs.writeFileSync(path.join(out,process.argv.includes('--mutant-restore')?'mutation-results.json':'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
})();
