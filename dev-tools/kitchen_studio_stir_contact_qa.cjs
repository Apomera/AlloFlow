/* Observe real food meshes while native gestures drive the delivered studio. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/kitchen-studio-stir-contact'),key='alloflow-kitchen-studio-v1';
const helper=path.join(root,'stem_lab/kitchen_studio/kitchen_studio_stir_contact.js'),vendor=path.join(root,'vendor/three-r128/three.min.js');
const mutation=process.argv.includes('--mutant-no-contact'),clone=value=>JSON.parse(JSON.stringify(value));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function unchanged(before,after,label='A food-contact preview preserves every saved decision'){assert.deepEqual(after,before,label);}
function oneStep(before,after){assert.equal(after.log.length,before.log.length+1,'One complete stir records exactly one decision');assert.equal(after.log.at(-1).action,'advance');assert.equal(after.log.at(-1).accepted,true);assert.equal(after.values.seconds,(before.values.seconds||0)+30,'Only release advances30 simulated seconds');}
function arrays(snapshot){for(const name of ['caps','stems','drops'])assert.equal(snapshot[name].length,8,'The actual heat scene has eight '+name);}
function sameFood(before,after){arrays(before);arrays(after);for(const name of ['caps','stems','drops'])assert.deepEqual(after[name],before[name],'Cancellation restores the actual '+name+' exactly');}
function samePositions(before,after){arrays(before);arrays(after);for(const name of ['caps','stems','drops'])assert.deepEqual(after[name].map(p=>p.position),before[name].map(p=>p.position),'Released food has no persistent contact layout');}
function contact(actual,baseline){
  arrays(actual);arrays(baseline);const inputs=actual.inputs;assert.ok(inputs&&inputs.points.length===8,'The real preview invoked the delivered contact helper');
  assert.ok(Math.abs(inputs.travel)>.2,'Contact is observed during a deliberate circular movement');
  const shifts=[],near=[],far=[];
  for(let i=0;i<8;i++){
    const base=inputs.points[i],cap=actual.caps[i],p=cap.position,distance=Math.hypot(base.x-inputs.blade.x,base.z-inputs.blade.z),shift=Math.hypot(p[0]-base.x,p[2]-base.z);shifts.push(shift);
    assert.ok(Math.hypot(p[0],p[2])<=.335000001,'Actual cap centres remain inside the pan');assert.ok(shift<=.090000001,'Actual contact displacement stays small');
    if(distance<.195)near.push(shift);if(distance>.205)far.push(shift);
    for(const name of ['caps','stems','drops']){
      const part=actual[name][i],old=baseline[name][i];assert.ok(Math.abs(part.position[0]-p[0])<1e-12&&Math.abs(part.position[2]-p[2])<1e-12,'Cap, stem and droplet move together');
      assert.equal(part.position[1],old.position[1],'Contact preserves food height');
      for(const field of ['uuid','rotation','scale','color','visible','geometry'])assert.deepEqual(part[field],old[field],'Contact preserves '+name+' '+field);
    }
  }
  assert.ok(near.length&&far.length,'The observed blade has nearby and distant food');
  assert.ok(near.some(value=>value>.001),'Nearby actual food responds to spatula contact');
  assert.ok(far.every(value=>value<1e-10),'Distant actual food retains the original ring motion');
  assert.ok(Math.max(...shifts)-Math.min(...shifts)>.001,'Food movement is local rather than a uniform ring');
  return {near:near.length,far:far.length,maxShift:Math.max(...shifts),travel:inputs.travel};
}
function rendererObserver(){
  const T=window.THREE,Native=T.WebGLRenderer;let scene=null,camera=null,frames=0;
  function ObservedRenderer(...args){const renderer=new Native(...args),render=renderer.render.bind(renderer);renderer.render=function(nextScene,nextCamera){scene=nextScene;camera=nextCamera;frames++;return render(nextScene,nextCamera);};return renderer;}
  ObservedRenderer.prototype=Native.prototype;Object.setPrototypeOf(ObservedRenderer,Native);T.WebGLRenderer=ObservedRenderer;
  window.__stirFoodScene={snapshot(){
    if(!scene)throw new Error('The actual scene has not rendered');
    const foods={caps:[],stems:[],drops:[]};scene.traverse(object=>{
      if(!object.geometry||object.userData.mission!=='heat')return;const parameters=object.geometry.parameters||{},near=(a,b)=>typeof a==='number'&&Math.abs(a-b)<1e-12;
      const name=near(parameters.radius,.095)?'caps':near(parameters.radius,.024)?'drops':near(parameters.radiusTop,.033)&&near(parameters.radiusBottom,.038)?'stems':null;if(!name)return;
      foods[name].push({uuid:object.uuid,position:object.position.toArray(),rotation:[object.rotation.x,object.rotation.y,object.rotation.z,object.rotation.order],scale:object.scale.toArray(),color:object.material.color.getHexString(),visible:object.visible,geometry:object.geometry.type});
    });
    return {...foods,frames,camera:{position:camera.position.toArray(),zoom:camera.zoom},inputs:window.__stirContactInputs||null,calls:window.__stirContactCalls||0};
  }};
}
function helperObserver(noContact){
  const api=window.KitchenStudioStirContact;if(!api||typeof api.layout!=='function')throw new Error('The delivered stir-contact API is absent');
  if(noContact)api.layout=function(points){return points.map(point=>({x:point.x,z:point.z}));};
  const layout=api.layout;window.__stirContactCalls=0;
  api.layout=function(points,blade,travel){window.__stirContactInputs=JSON.parse(JSON.stringify({points,blade,travel}));window.__stirContactCalls++;return layout.apply(this,arguments);};
}
function instrument(source,kind,noContact=false){return source+'\n;('+String(kind==='renderer'?rendererObserver:helperObserver)+')('+String(noContact)+');\n';}
if(process.argv.includes('--selftest')){
  const points=Array.from({length:8},(_,i)=>({x:Math.cos(i*Math.PI/4)*.14,z:Math.sin(i*Math.PI/4)*.14}));
  const base={inputs:{points,blade:{x:.23,z:0},travel:1},caps:[],stems:[],drops:[]};
  for(const name of ['caps','stems','drops'])base[name]=points.map((p,i)=>({uuid:name+i,position:[p.x,name==='caps'?1.645:name==='stems'?1.59:1.69,p.z],rotation:[0,0,0,'XYZ'],scale:[1,1,1],color:'abcdef',visible:true,geometry:name}));
  const good=clone(base);for(let i=0;i<8;i++)if(Math.hypot(points[i].x-.23,points[i].z)<.195)for(const name of ['caps','stems','drops'])good[name][i].position[2]+=.02;
  contact(good,base);assert.throws(()=>contact(base,base));
  for(const change of [v=>v.stems[0].position[0]+=.01,v=>v.caps[0].position[1]+=.01,v=>v.caps[0].color='000000',v=>v.caps[4].position[2]+=.01,v=>v.caps[0].position[0]=.5]){const bad=clone(good);change(bad);assert.throws(()=>contact(bad,base));}
  sameFood(base,clone(base));const moved=clone(base);moved.caps[0].position[0]+=.01;assert.throws(()=>sameFood(base,moved));assert.throws(()=>samePositions(base,moved));
  const before={log:[],values:{seconds:0}},after={log:[{action:'advance',accepted:true}],values:{seconds:30}};oneStep(before,after);assert.throws(()=>oneStep(before,{...after,log:after.log.concat(after.log)}));assert.throws(()=>unchanged(before,after));
  const fresh={log:[],values:{}};oneStep(fresh,after);assert.throws(()=>oneStep(fresh,{...after,values:{seconds:60}}));assert.throws(()=>oneStep(fresh,{...after,values:{}}));
  assert.ok(instrument('/* original */','renderer').startsWith('/* original */'));assert.match(instrument('/* original */','helper',true),/\)\(true\)/);
  console.log('PASS: actual local mesh displacement, unchanged distant food, part alignment/height/materials, restoration, one-step evidence and response-only mutation oracles reject deliberate failures.');process.exit(0);
}
const sourceBefore=hash(helper);let helperResponses=0,vendorResponses=0,mutantResponses=0;
const server=http.createServer((request,response)=>{const file=path.resolve(root,'.'+new URL(request.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}if(file===vendor){data=Buffer.from(instrument(data.toString('utf8'),'renderer'));vendorResponses++;}if(file===helper){data=Buffer.from(instrument(data.toString('utf8'),'helper',mutation));helperResponses++;if(mutation)mutantResponses++;}response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'})[path.extname(file)]||'application/octet-stream');response.end(data);});});
function controls(page){
  const canvas=page.locator('#scene canvas'),saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),current=async()=>{const data=await saved();return data.serviceActive?data.service.work:data.drafts[data.current];};
  const action=id=>page.locator('[data-action="'+id+'"]').click(),scene=()=>page.evaluate(()=>window.__stirFoodScene.snapshot());
  async function frame(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
  async function points(){await canvas.scrollIntoViewIfNeeded();await frame();return canvas.evaluate(el=>{const b=el.getBoundingClientRect();return Object.fromEntries(Object.entries(JSON.parse(el.dataset.targets)).map(([id,p])=>[id,{x:b.left+p.x,y:b.top+p.y}]));});}
  async function station(){await page.locator('[data-station="heat"]').click();await page.locator('#focusView').click();await frame();}
  async function closeup(){await page.locator('#studioPanOpen').click();await page.waitForFunction(()=>document.querySelector('#scene canvas').dataset.panInspection==='true');await page.locator('#studioPanAngle').fill('100');await page.locator('#studioPanAngle').dispatchEvent('input');await points();}
  async function grab(){const p=await points();await page.mouse.move(p.spatula.x,p.spatula.y);await page.mouse.down();assert.equal(await canvas.getAttribute('data-held'),'spatula');await page.mouse.move(p.stirStart.x,p.stirStart.y,{steps:12});return p;}
  async function partial(){const p=await grab();for(let i=1;i<=4;i++)await page.mouse.move(p['stirPoint'+i].x,p['stirPoint'+i].y);await frame();return p;}
  async function finish(p){for(let i=5;i<=16;i++)await page.mouse.move(p['stirPoint'+i%16].x,p['stirPoint'+i%16].y);await frame();assert.equal(await canvas.getAttribute('data-phase'),'ready');}
  async function idle(){await frame();assert.equal(await canvas.getAttribute('data-held'),'');assert.equal(await canvas.getAttribute('data-stir-phase'),'idle');}
  return {canvas,saved,current,action,scene,frame,points,station,closeup,grab,partial,finish,idle};
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const report={checks:[],accessibility:[],screenshots:[],contacts:[],errors:[],mutation,sourceBefore};let activePage;
  async function open(options={}){const page=await browser.newPage({viewport:{width:1360,height:1000},reducedMotion:'reduce',...options});activePage=page;page.setDefaultTimeout(20000);page.on('pageerror',error=>report.errors.push(error.message));page.on('console',message=>{if(message.type()==='warning'&&message.text().startsWith('Kitchen Studio'))report.errors.push(message.text());});await page.goto('http://127.0.0.1:'+server.address().port+'/stem_lab/kitchen_studio/index.html');await page.locator('#scene canvas[data-targets]').waitFor();return page;}
  async function shot(page,name){await page.screenshot({path:path.join(out,name+'.png')});report.screenshots.push(name+'.png');}
  async function audit(page,label){await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const issues=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(issue=>({id:issue.id,targets:issue.nodes.map(node=>node.target)})));report.accessibility.push({label,issues});assert.deepEqual(issues,[],label);}
  try{
    const page=await open(),ui=controls(page);await ui.station();await ui.action('dry');await ui.action('medium');await page.locator('#studioStirMode').click();await ui.closeup();
    let before=await ui.current(),baseline=await ui.scene(),p=await ui.partial(),held=await ui.scene();report.contacts.push({label:'Crowded pan',...contact(held,baseline)});unchanged(before,await ui.current());
    await page.mouse.move(p.stirPoint4.x,p.stirPoint4.y);await ui.frame();sameFood(held,await ui.scene());unchanged(before,await ui.current());await shot(page,'local-contact-desktop');await page.keyboard.press('Escape');await page.mouse.up();await ui.idle();sameFood(baseline,await ui.scene());unchanged(before,await ui.current());assert.equal(await ui.canvas.getAttribute('data-pan-inspection'),'true');
    report.checks.push('Real crowded-pan meshes respond locally near the spatula, keep distant ring motion, stay inside the pan, and retain cap/stem/drop alignment, heights, materials and visibility. Repeated samples do not accumulate; Escape restores exactly without a decision.');

    for(const cancel of ['pointercancel','invalid']){
      before=await ui.current();baseline=await ui.scene();p=await ui.partial();contact(await ui.scene(),baseline);
      if(cancel==='pointercancel')await ui.canvas.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',isPrimary:true});else await page.mouse.move(p.panCenter.x,p.panCenter.y,{steps:5});
      await page.mouse.up();await ui.idle();sameFood(baseline,await ui.scene());unchanged(before,await ui.current(),cancel+' restores without cooking');
    }
    await ui.action('spread');before=await ui.current();baseline=await ui.scene();p=await ui.partial();report.contacts.push({label:'Spread pan',...contact(await ui.scene(),baseline)});unchanged(before,await ui.current());await ui.finish(p);unchanged(before,await ui.current());await page.mouse.up();await ui.idle();let after=await ui.current();oneStep(before,after);samePositions(baseline,await ui.scene());await page.mouse.up();unchanged(after,await ui.current());
    report.checks.push('Pointer cancellation and invalid movement restore actual food exactly. Spaced food also reacts locally; one successful full circle commits the original30-second advance once, then returns food to the resting layout.');

    const keyboard=page.locator('#studioKeyboard');if(!(await keyboard.evaluate(el=>el.open)))await keyboard.locator('summary').click();await page.locator('#studioKeyboardTool').selectOption('spatula');before=await ui.current();baseline=await ui.scene();await page.locator('#studioKeyboardGrab').click();await page.keyboard.press('t');await page.keyboard.press('f');await page.keyboard.press('ArrowUp');unchanged(before,await ui.current());await page.keyboard.press('Escape');await ui.idle();sameFood(baseline,await ui.scene());assert.equal(await page.locator('#studioKeyboardGrab').evaluate(el=>el===document.activeElement),true);unchanged(before,await ui.current());
    await ui.action('advance');await ui.action('advance');await ui.action('plate');assert.equal((await ui.current()).done,true);await page.locator('input[name=reason][value="0"]').check();await page.locator('#submit').click();if(!(await page.locator('#replayPanel').evaluate(el=>el.open)))await page.locator('#replayPanel>summary').click();await page.locator('#replayStep').fill('0');await page.locator('#replayStep').dispatchEvent('input');await ui.frame();
    before=await ui.saved();baseline=await ui.scene();const calls=baseline.calls;p=await ui.points();await page.mouse.click(p.spatula.x,p.spatula.y);await ui.frame();sameFood(baseline,await ui.scene());assert.equal((await ui.scene()).calls,calls,'Read-only inspection never invokes contact layout');unchanged(before,await ui.saved());assert.equal(await page.locator('#studioStirStep').isDisabled(),true);await audit(page,'Desktop local food contact and recorded view');await page.close();
    report.checks.push('Fine keyboard movement still cancels with restored food and focus. Recorded pans retain the original geometry and evidence; contact layout never runs for a read-only stir.');

    const phone=await open({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),mobile=controls(phone);await mobile.station();await mobile.action('dry');await mobile.action('spread');await mobile.action('medium');await phone.locator('#studioStirMode').click();await mobile.closeup();
    const cdp=await phone.context().newCDPSession(phone),touch=(type,q)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{id:1,x:q.x,y:q.y,radiusX:4,radiusY:4,force:1}]});
    async function touchPartial(){const at=await mobile.points();await touch('touchStart',at.spatula);assert.equal(await mobile.canvas.getAttribute('data-held'),'spatula');for(let i=1;i<=12;i++)await touch('touchMove',{x:at.spatula.x+(at.stirStart.x-at.spatula.x)*i/12,y:at.spatula.y+(at.stirStart.y-at.spatula.y)*i/12});for(let i=1;i<=4;i++)await touch('touchMove',at['stirPoint'+i]);await mobile.frame();return at;}
    before=await mobile.current();baseline=await mobile.scene();const scroll=await phone.evaluate(()=>scrollY);p=await touchPartial();report.contacts.push({label:'390px native touch',...contact(await mobile.scene(),baseline)});unchanged(before,await mobile.current());assert.equal(await phone.evaluate(()=>scrollY),scroll);await touch('touchCancel');await mobile.idle();sameFood(baseline,await mobile.scene());unchanged(before,await mobile.current());
    p=await touchPartial();for(let i=5;i<=16;i++)await touch('touchMove',p['stirPoint'+i%16]);await mobile.frame();assert.equal(await mobile.canvas.getAttribute('data-phase'),'ready');unchanged(before,await mobile.current());await touch('touchEnd');await mobile.idle();oneStep(before,await mobile.current());samePositions(baseline,await mobile.scene());
    await phone.setViewportSize({width:320,height:844});await mobile.points();before=await mobile.current();baseline=await mobile.scene();p=await touchPartial();report.contacts.push({label:'320px native touch',...contact(await mobile.scene(),baseline)});unchanged(before,await mobile.current());await shot(phone,'local-contact-320');await touch('touchCancel');await mobile.idle();sameFood(baseline,await mobile.scene());assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px workspace has no horizontal overflow');await audit(phone,'320px local food contact and native touch');await phone.close();
    report.checks.push('Native390px and320px touch moves nearby food without scrolling or recording previews. Touch cancellation restores exactly, a full circle advances once, controls fit320px and accessibility scans are clean.');
    assert.deepEqual(report.errors,[]);report.pass=true;
  }catch(error){report.pass=false;report.failure=error.stack;process.exitCode=1;if(activePage&&!activePage.isClosed()){report.canvas=await activePage.locator('#scene canvas').evaluate(el=>({...el.dataset})).catch(()=>null);report.scene=await activePage.evaluate(()=>window.__stirFoodScene.snapshot()).catch(()=>null);await activePage.screenshot({path:path.join(out,mutation?'mutation-failure.png':'failure.png')}).catch(()=>{});}}
  finally{report.helperResponses=helperResponses;report.vendorResponses=vendorResponses;report.mutantResponses=mutantResponses;report.sourceAfter=hash(helper);report.sourceUnchanged=report.sourceBefore===report.sourceAfter;if(!report.sourceUnchanged||!helperResponses||!vendorResponses||mutation&&!mutantResponses){report.pass=false;report.failure=(report.failure||'')+'\nSource/instrumentation response integrity failed.';process.exitCode=1;}fs.writeFileSync(path.join(out,mutation?'mutation-results.json':'browser-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
})();
