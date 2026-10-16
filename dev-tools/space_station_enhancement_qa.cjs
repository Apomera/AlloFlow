#!/usr/bin/env node
'use strict';

// Working-tree preview and browser QA for the Space Station tool.
//   node dev-tools/space_station_enhancement_qa.cjs --serve --port=4179
//   node dev-tools/space_station_enhancement_qa.cjs --capture
//   node dev-tools/space_station_enhancement_qa.cjs --capture --out=reports/my-run --tabs=map,interior --widths=1440,390
//   node dev-tools/space_station_enhancement_qa.cjs --capture --tabs=orbit --orbit-labs=drag --accessibility
// Local React/Three assets only; no bundled release or authenticated shell needed.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const argument = (name, fallback) => {
  const match = args.find((arg) => arg.startsWith(name + '='));
  return match ? match.slice(name.length + 1) : fallback;
};
const SEED = {
  tab: 'map', selModule: 'zarya', dayIdx: 0, sysIdx: 0, orbitAlt: 420,
  seenModules: {}, seenHours: {}, mapView: 'overview', mapCutaway: false,
  quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false,
  interiorView: '3d', interiorRoom: 'harmony', interiorDone: {},
  interiorSeen: { harmony: true }, interiorChoices: {}, interiorInspected: {},
  interiorAttempts: {}, interiorDiscovery: null, interiorLog: [], interiorGuided: true,
  interiorNav: { hatches: {}, collisions: 0, railGrabs: 0, railPushOffs: 0,
    looseHits: 0, cargoCatches: 0, cargoSecures: 0, routeStep: 0 },
  lowGImpulse: 10, lowGResult: null, cabinStow: {}, cupolaTarget: 'day',
  cupolaCaptured: false, cupolaShutters: false,
};
const MIME = { '.js': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.css': 'text/css' };

async function createPreview(port = 0) {
  const spec = await fs.readFile(path.join(ROOT, 'tests/e2e/18-space-station-gl.spec.ts'), 'utf8');
  const match = spec.match(/const HARNESS = `([\s\S]*?)`;/);
  assert(match, 'Could not locate the established Space Station host shim');
  let harness = match[1]
    .replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">')
    .replace(/#wrap\{[^}]+\}/, '#wrap{width:100%;max-width:1440px;min-height:100vh;margin:0 auto;position:relative}html,body{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}')
    .replace('var toolData = st[0], setToolData = st[1];', 'var toolData = st[0], setToolData = st[1]; window.__toolData = toolData; window.__setToolData = setToolData;');
  const boot = `<script>window.AlloPostFXEnabled=false;</script>
<script src="/stem_lab/stem_tool_spacestation.js"></script>
<script>
  var query = new URLSearchParams(location.search);
  var seed = ${JSON.stringify(SEED)};
  seed.tab = query.get('tab') || seed.tab;
  seed.opsMode = query.get('mode') || 'integrated';
  seed.opsEclssLab = query.get('lab') || 'air';
  seed.opsDebrisScanMetric = query.get('scan') || 'energy';
  seed.opsDebrisScanScale = query.get('scale') || 'linear';
  seed.opsDebrisApertureStudy = query.get('aperture') === 'compare';
  seed.interiorRoom = query.get('room') || seed.interiorRoom;
  seed.interiorSeen[seed.interiorRoom] = true;
  window.__mount(seed);
</script>`;
  harness = harness.replace('</body>', boot + '</body>');
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      if (url.pathname === '/' || url.pathname === '/__harness') {
        res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
        res.end(harness); return;
      }
      const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
        res.writeHead(403); res.end('Forbidden'); return;
      }
      const body = await fs.readFile(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch (_) { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function captureApertureStudy(base,output){
  const {chromium}=require('playwright');await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true}),results=[];
  try{for(const width of argument('--widths','1440,820,390').split(',').map(Number)){
    const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/?tab=operations&mode=debris&scan=expansion&scale=softlog&aperture=compare#iss-debris-aperture-study-title');
    const study=page.locator('[data-debris-aperture-study]'),toggle=study.locator('[data-debris-aperture-toggle]');await study.locator('[data-debris-aperture-chart]').waitFor();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    const markers=await study.locator('[data-debris-aperture-maximum]').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return{width:r.width,height:r.height};}));assert.equal(markers.length,3);assert(markers.every(m=>m.width===8&&m.height===8));
    const stage=study.locator('[data-debris-aperture-stage]'),offset=study.locator('#iss-debris-aperture-offset'),match=study.locator('[data-debris-aperture-match]');
    await page.locator('[data-debris-position-mark]').click();await page.locator('[data-debris-peak-inspect]').click();await page.locator('[data-debris-event="cloud"]').click();
    const before=await page.evaluate(()=>{const d=window.__toolData.spaceStation;return{main:d.opsDebrisDetectorOffset,time:d.opsDebrisTime,mark:JSON.stringify(d.opsDebrisPositionA),saved:JSON.stringify(d.opsDebrisBaseline)};});
    const paths=await study.locator('[data-debris-aperture-curve]').evaluateAll(ns=>ns.map(n=>n.getAttribute('d')));
    const footprint=study.locator('[data-debris-aperture-map]'),footprintSvg=footprint.locator('svg');assert.equal(await footprint.getAttribute('role'),'slider');assert.equal(await footprint.getAttribute('data-field'),'radial');
    const footprintGeometry=()=>footprintSvg.evaluate(svg=>{const cloud=svg.querySelector('[data-debris-aperture-cloud]'),clip=svg.querySelector('#iss-debris-aperture-cloud-clip circle');return{viewBox:svg.getAttribute('viewBox'),scale:Number(svg.dataset.debrisApertureMapScale),cx:Number(svg.dataset.debrisApertureMapCx),cloud:{cx:Number(cloud.getAttribute('cx')),cy:Number(cloud.getAttribute('cy')),r:Number(cloud.getAttribute('r'))},clip:{cx:Number(clip.getAttribute('cx')),cy:Number(clip.getAttribute('cy')),r:Number(clip.getAttribute('r'))},rings:Array.from(svg.querySelectorAll('[data-debris-aperture-ring]'),n=>{const b=n.getBoundingClientRect();return{kind:n.dataset.debrisApertureRing,cx:Number(n.getAttribute('cx')),cy:Number(n.getAttribute('cy')),r:Number(n.getAttribute('r')),width:b.width,height:b.height};})};});
    const physicalGeometry=g=>({...g,rings:g.rings.map(({width,height,...ring})=>ring)});
    const mapInitial=await footprintGeometry();assert.equal(mapInitial.viewBox,'0 0 600 280');assert(mapInitial.scale>0&&Number.isFinite(mapInitial.scale));assert.deepEqual(mapInitial.clip,mapInitial.cloud);assert.equal(await footprint.locator('[data-debris-aperture-overlap]').getAttribute('clip-path'),'url(#iss-debris-aperture-cloud-clip)');
    const sizeRadii=await study.locator('[data-debris-aperture-option]').evaluateAll(ns=>ns.map(n=>({kind:n.dataset.debrisApertureOption,radius:Number(n.dataset.radius)})));assert.equal(mapInitial.rings.length,sizeRadii.length);
    for(const ring of mapInitial.rings){assert(Math.abs(ring.width-ring.height)<0.001);assert.equal(ring.cy,140);assert(Math.abs(ring.r/(sizeRadii.find(c=>c.kind===ring.kind).radius*mapInitial.scale)-1)<1e-12);}
    await study.locator('[data-debris-aperture-preset="center"]').click();assert.equal(await offset.inputValue(),'0');
    await study.locator('[data-debris-aperture-preset="rim"]').click();const rimOffset=mapInitial.cloud.r/mapInitial.scale*1000;assert(Math.abs(Number(await offset.inputValue())-rimOffset)<1e-10);assert.equal(await footprint.getAttribute('aria-valuenow'),await stage.getAttribute('aria-valuenow'));
    await study.locator('[data-debris-aperture-preset="outside"]').click();assert(Math.abs(Number(await offset.inputValue())-Number(await stage.getAttribute('aria-valuemax')))<1e-10);assert.equal(await page.evaluate(()=>window.__toolData.spaceStation.opsDebrisApertureOffset),Number(await stage.getAttribute('aria-valuemax')));assert((await study.locator('[data-debris-aperture-reading]').allTextContents()).every(t=>t==='0 J'));
    const mapOutside=await footprintGeometry();for(const ring of mapOutside.rings){assert(ring.cx-ring.r>=-1e-10&&ring.cx+ring.r<=600+1e-10);assert(ring.cy-ring.r>=-1e-10&&ring.cy+ring.r<=280+1e-10);}
    await footprint.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');assert.equal(await offset.inputValue(),'0.5');await page.keyboard.press('PageUp');assert.equal(await offset.inputValue(),'5.5');await page.keyboard.press('End');assert(Math.abs(Number(await offset.inputValue())-Number(await stage.getAttribute('aria-valuemax')))<1e-10);assert.equal(await page.evaluate(()=>window.__toolData.spaceStation.opsDebrisApertureOffset),Number(await stage.getAttribute('aria-valuemax')));await page.keyboard.press('Home');assert.equal(await offset.inputValue(),'0');
    await footprint.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));const mapBox=await footprintSvg.boundingBox(),mapX=mm=>mapBox.x+(mapInitial.cx+mm/1000*mapInitial.scale)/600*mapBox.width,mapY=mapBox.y+mapBox.height/2;
    if(width<500){const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mapX(10),y:mapY,id:0}]});for(const mm of [15,20,25])await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:mapX(mm),y:mapY,id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
    else{await page.mouse.move(mapX(10),mapY);await page.mouse.down();await page.mouse.move(mapX(25),mapY,{steps:5});await page.mouse.up();}
    assert.equal(await offset.inputValue(),'25');assert.equal(await footprint.getAttribute('aria-valuenow'),'25');assert.equal(await footprint.getAttribute('data-dragging'),null);assert.equal(await stage.getAttribute('aria-valuenow'),'25');
    const mapAtProbe=await footprintGeometry();assert(mapAtProbe.rings.every(r=>Math.abs(r.cx-(mapInitial.cx+0.025*mapInitial.scale))<1e-10));assert.deepEqual(await study.locator('[data-debris-aperture-curve]').evaluateAll(ns=>ns.map(n=>n.getAttribute('d'))),paths);
    const contactView=study.locator('[data-debris-aperture-view="contact"]'),clockView=study.locator('[data-debris-aperture-view="clock"]'),localTime=study.locator('#iss-debris-aperture-time'),globalTime=page.locator('#iss-debris-time');
    const clockTime=()=>page.evaluate(()=>window.__toolData.spaceStation.opsDebrisTime),predictionSnapshot=()=>study.evaluate(n=>({paths:Array.from(n.querySelectorAll('[data-debris-aperture-curve]'),e=>e.getAttribute('d')),readings:Array.from(n.querySelectorAll('[data-debris-aperture-reading], [data-debris-aperture-point], [data-debris-aperture-peak], [data-debris-aperture-span], [data-debris-aperture-coverage]'),e=>e.getAttribute('data-value'))}));
    const predictionsAtProbe=await predictionSnapshot(),arrival=Number(await globalTime.getAttribute('max')),fixedApertures=g=>{const {viewBox,scale,cx,rings}=physicalGeometry(g);return{viewBox,scale,cx,rings};};
    assert.equal(await footprint.getAttribute('data-view'),'contact');assert.equal(await contactView.getAttribute('aria-pressed'),'true');assert.equal(await localTime.count(),0);assert.equal(await page.locator('[data-iss-playback="debris"]').count(),1);
    const side=study.locator('[data-debris-aperture-side]'),sideSvg=side.locator('svg'),sideGeometry=()=>sideSvg.evaluate(svg=>{function line(selector){const n=svg.querySelector(selector);return n?Object.fromEntries(['x1','x2','y1','y2'].map(k=>[k,Number(n.getAttribute(k))])):null;}const p=svg.querySelector('[data-debris-side-particle]');return{viewBox:svg.getAttribute('viewBox'),scale:Number(svg.dataset.debrisSideScale),bx:Number(svg.dataset.debrisSideBx),cy:Number(svg.dataset.debrisSideCy),bumper:line('[data-debris-side-bumper]'),wall:line('[data-debris-side-wall]'),aperture:line('[data-debris-side-aperture]'),cloud:line('[data-debris-side-cloud]'),particle:p?Object.fromEntries(['cx','cy','r'].map(k=>[k,Number(p.getAttribute(k))])):null,envelope:svg.querySelector('[data-debris-side-envelope]')?.getAttribute('d')};});
    const contactSide=await sideGeometry(),fixedSide=g=>({viewBox:g.viewBox,scale:g.scale,bx:g.bx,cy:g.cy,bumper:g.bumper,wall:g.wall,aperture:g.aperture,envelope:g.envelope});assert.equal(await side.getAttribute('role'),'img');assert.equal(await side.getAttribute('data-mode'),'contact');assert.equal(await side.getAttribute('tabindex'),null);for(const name of ['aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext'])assert.equal(await side.getAttribute(name),null);
    assert.equal(contactSide.viewBox,'0 0 600 260');assert(contactSide.scale>0);assert.equal(contactSide.bumper.x1,contactSide.bx);assert.equal(contactSide.bumper.x2,contactSide.bx);assert.equal(contactSide.wall.x1,contactSide.wall.x2);assert.equal(contactSide.aperture.x1,contactSide.wall.x1);assert.equal(contactSide.aperture.x2,contactSide.wall.x1);assert.equal(contactSide.cloud.x1,contactSide.wall.x1);assert.equal(contactSide.cloud.x2,contactSide.wall.x1);assert.equal(contactSide.particle,null);assert(contactSide.envelope&&!/NaN|Infinity/.test(contactSide.envelope));
    assert(Math.abs((contactSide.wall.x1-contactSide.bx)/contactSide.scale-Number(await page.locator('#iss-shield-gap').inputValue())/100)<1e-12);assert(Math.abs((contactSide.wall.y2-contactSide.wall.y1)/2/contactSide.scale-mapAtProbe.cloud.r/mapAtProbe.scale)<1e-12);assert(Math.abs((contactSide.aperture.y2-contactSide.aperture.y1)/2/contactSide.scale-sizeRadii.find(r=>r.kind==='current').radius)<1e-12);assert(Math.abs(Math.abs((contactSide.aperture.y1+contactSide.aperture.y2)/2-contactSide.cy)/contactSide.scale-.025)<1e-12);
    const sideBox=await sideSvg.boundingBox(),sidePixels=Math.min(sideBox.width/600,sideBox.height/260),renderedSide=await sideSvg.evaluate(svg=>{const b=svg.querySelector('[data-debris-side-bumper]').getBoundingClientRect(),w=svg.querySelector('[data-debris-side-wall]').getBoundingClientRect();return{gap:w.x-b.x,diameter:w.height};});assert(Math.abs(renderedSide.gap-(contactSide.wall.x1-contactSide.bx)*sidePixels)<0.001);assert(Math.abs(renderedSide.diameter-(contactSide.wall.y2-contactSide.wall.y1)*sidePixels)<0.001);await side.click();assert.equal(await clockTime(),before.time);
    await page.locator('[data-debris-event="impact"]').click();const impact=await clockTime();assert.deepEqual(physicalGeometry(await footprintGeometry()),physicalGeometry(mapAtProbe));await page.locator('[data-debris-event="cloud"]').click();assert.equal(await clockTime(),before.time);
    await clockView.click();assert.equal(await footprint.getAttribute('data-view'),'clock');assert.equal(await clockView.getAttribute('aria-pressed'),'true');assert.equal(await clockTime(),before.time);assert.equal(await footprint.getAttribute('data-phase'),'cloud');assert.match(await footprint.getAttribute('aria-valuetext'),/^First-contact predictions; /);assert.match(await study.locator('[data-debris-aperture-arrival-note]').textContent(),/projection/i);assert.match(await study.locator('[data-debris-aperture-arrival-note]').textContent(),/first.contact/i);assert.deepEqual(await predictionSnapshot(),predictionsAtProbe);
    assert.equal(await side.getAttribute('role'),'slider');assert.equal(await side.getAttribute('data-mode'),'clock');assert.equal(await side.getAttribute('tabindex'),'0');assert.equal(Number(await side.getAttribute('aria-valuenow')),before.time);
    const flightRadii={},sidePositions={};
    for(const [event,phase,expected] of [['start','approach',0],['impact','impact',impact],['cloud','cloud',before.time],['wall','contact',arrival]]){
      await study.locator('[data-debris-aperture-event="'+event+'"]').click();assert.equal(await clockTime(),expected);assert(Math.abs(Number(await localTime.inputValue())-expected)<1e-10);assert(Math.abs(Number(await globalTime.inputValue())-expected)<1e-10);assert.equal(await footprint.getAttribute('data-phase'),phase);
      const geometry=await footprintGeometry();flightRadii[phase]=geometry.cloud.r;assert.deepEqual(fixedApertures(geometry),fixedApertures(mapAtProbe));assert.deepEqual(await predictionSnapshot(),predictionsAtProbe);
      const sideNow=await sideGeometry();assert.equal(await side.getAttribute('data-phase'),phase);assert.equal(Number(await side.getAttribute('aria-valuenow')),expected);assert.deepEqual(fixedSide(sideNow),fixedSide(contactSide));
      if(phase==='approach'){assert.equal(sideNow.cloud,null);assert(sideNow.particle);sidePositions[phase]=sideNow.particle.cx;assert.equal(sideNow.particle.cy,contactSide.cy);assert(Math.abs(sideNow.particle.r/sideNow.scale-geometry.cloud.r/geometry.scale)<1e-12);}
      else{assert.equal(sideNow.particle,null);assert(sideNow.cloud);sidePositions[phase]=sideNow.cloud.x1;assert.equal(sideNow.cloud.x1,sideNow.cloud.x2);assert(Math.abs((sideNow.cloud.y2-sideNow.cloud.y1)/2/sideNow.scale-geometry.cloud.r/geometry.scale)<1e-12);assert(Math.abs(sideNow.cloud.x1-(phase==='impact'?contactSide.bx:phase==='contact'?contactSide.wall.x1:(contactSide.bx+contactSide.wall.x1)/2))<1e-10);}
      if(phase==='contact'){assert.equal(await footprint.locator('[data-debris-aperture-envelope]').count(),0);assert.equal(await footprint.locator('[data-debris-aperture-overlap]').count(),1);assert.notEqual(await study.locator('[data-debris-aperture-map-coverage]').getAttribute('data-debris-aperture-map-coverage'),'pending');assert.deepEqual(physicalGeometry(geometry),physicalGeometry(mapAtProbe));}
      else{assert.equal(await footprint.locator('[data-debris-aperture-overlap]').count(),0);assert.equal(Number(await footprint.locator('[data-debris-aperture-envelope]').getAttribute('r')),mapAtProbe.cloud.r);assert.equal(await study.locator('[data-debris-aperture-map-coverage]').getAttribute('data-debris-aperture-map-coverage'),'pending');}
      assert.equal(await footprint.getAttribute('data-field'),phase==='approach'?'incoming':'radial');
    }
    assert(flightRadii.approach>0&&flightRadii.approach===flightRadii.impact);assert(flightRadii.cloud>flightRadii.impact&&flightRadii.cloud<flightRadii.contact);assert(Math.abs(flightRadii.cloud-(flightRadii.impact+flightRadii.contact)/2)<1e-10);
    await localTime.focus();for(const [key,expected] of [['Home',0],['ArrowRight',.05],['PageUp',.55],['ArrowLeft',.5],['PageDown',0],['End',arrival]]){await page.keyboard.press(key);assert.equal(await clockTime(),expected);assert(Math.abs(Number(await localTime.inputValue())-expected)<1e-10);assert(Math.abs(Number(await globalTime.inputValue())-expected)<1e-10);}
    await side.focus();for(const [key,expected] of [['Home',0],['ArrowRight',.05],['PageUp',.55],['ArrowLeft',.5],['PageDown',0],['End',arrival]]){await page.keyboard.press(key);assert.equal(await clockTime(),expected);assert.equal(Number(await side.getAttribute('aria-valuenow')),expected);assert(Math.abs(Number(await localTime.inputValue())-expected)<1e-10);}
    await side.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));const trajectoryBox=await sideSvg.boundingBox(),trajectoryPixels=Math.min(trajectoryBox.width/600,trajectoryBox.height/260),trajectoryLeft=trajectoryBox.x+(trajectoryBox.width-600*trajectoryPixels)/2,trajectoryTop=trajectoryBox.y+(trajectoryBox.height-260*trajectoryPixels)/2,sideX=x=>trajectoryLeft+x*trajectoryPixels,sideY=trajectoryTop+contactSide.cy*trajectoryPixels;
    for(const [branch,from,to,expected] of [['incoming',sidePositions.approach,(sidePositions.approach+contactSide.bx)/2,impact/2],['cloud',contactSide.bx,(contactSide.bx+contactSide.wall.x1)/2,before.time],['start',contactSide.bx,sidePositions.approach-8,0],['wall',contactSide.bx,contactSide.wall.x1+8,arrival]]){
      if(width<500){const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sideX(from),y:sideY,id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sideX(to),y:sideY,id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
      else{await page.mouse.move(sideX(from),sideY);await page.mouse.down();await page.mouse.move(sideX(to),sideY,{steps:5});await page.mouse.up();}
      const got=await clockTime();if(branch==='start'||branch==='wall')assert.equal(got,expected);else{const timePerPixel=(branch==='incoming'?impact/(contactSide.bx-sidePositions.approach):(arrival-impact)/(contactSide.wall.x1-contactSide.bx))/trajectoryPixels;assert(Math.abs(got-expected)<timePerPixel*1.25,branch+' drag maps to physical flight time within pointer pixel precision');}assert.equal(await side.getAttribute('data-dragging'),null);assert(Math.abs(Number(await localTime.inputValue())-got)<1e-10);assert.equal(await offset.inputValue(),'25');assert.deepEqual(fixedSide(await sideGeometry()),fixedSide(contactSide));assert.deepEqual(await predictionSnapshot(),predictionsAtProbe);
    }
    await contactView.click();assert.equal(await localTime.count(),0);assert.equal(await clockTime(),arrival);await clockView.click();assert.equal(await clockTime(),arrival);await study.locator('[data-debris-aperture-event="cloud"]').click();assert.equal(await clockTime(),before.time);await contactView.click();assert.equal(await clockTime(),before.time);assert.deepEqual(physicalGeometry(await footprintGeometry()),physicalGeometry(mapAtProbe));assert.deepEqual(await predictionSnapshot(),predictionsAtProbe);
    await stage.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));const box=await stage.locator('svg').boundingBox(),max=Number(await stage.getAttribute('aria-valuemax')),x=mm=>box.x+(12+mm/max*576)/600*box.width,y=box.y+box.height/2;
    if(width<500){const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x(10),y,id:0}]});for(const mm of [15,20,25])await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x(mm),y,id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
    else{await page.mouse.move(x(10),y);await page.mouse.down();await page.mouse.move(x(25),y,{steps:5});await page.mouse.up();}
    assert.equal(await offset.inputValue(),'25');assert.equal(await stage.getAttribute('aria-valuenow'),'25');assert.equal(await stage.getAttribute('data-dragging'),null);assert.deepEqual(await study.locator('[data-debris-aperture-curve]').evaluateAll(ns=>ns.map(n=>n.getAttribute('d'))),paths);
    const readings=await study.locator('[data-debris-aperture-reading]').evaluateAll(ns=>ns.map(n=>({kind:n.dataset.debrisApertureReading,value:Number(n.dataset.value)})));assert(readings[0].value<readings[1].value&&readings[1].value<readings[2].value);
    for(const r of readings)assert.equal(Number(await study.locator('[data-debris-aperture-point="'+r.kind+'"]').getAttribute('data-value')),r.value);
    const totalSizes=await study.locator('[data-debris-aperture-option]').evaluateAll(ns=>ns.map(n=>({kind:n.dataset.debrisApertureOption,area:Number(n.dataset.areaCm2),peak:Number(n.querySelector('[data-debris-aperture-peak]').dataset.value),span:Number(n.querySelector('[data-debris-aperture-span]').dataset.value)})));
    const areaButton=study.locator('[data-debris-aperture-basis="area"]'),totalButton=study.locator('[data-debris-aperture-basis="total"]');await areaButton.focus();await page.keyboard.press('Enter');assert.equal(await study.getAttribute('data-basis'),'area');assert.equal(await areaButton.getAttribute('aria-pressed'),'true');assert.match(await stage.getAttribute('aria-valuetext'),/J\/cm²/);assert.equal(await offset.inputValue(),'25');assert.deepEqual(physicalGeometry(await footprintGeometry()),physicalGeometry(mapAtProbe));assert.match(await footprint.getAttribute('aria-valuetext'),/J\/cm²/);
    const areaReadings=[];for(let i=0;i<readings.length;i++){const r=readings[i],c=totalSizes[i],value=Number(await study.locator('[data-debris-aperture-reading="'+r.kind+'"]').getAttribute('data-value'));assert(Math.abs(value/(r.value/c.area)-1)<1e-12);assert(Math.abs(Number(await study.locator('[data-debris-aperture-peak="'+r.kind+'"]').getAttribute('data-value'))/(c.peak/c.area)-1)<1e-12);assert.equal(Number(await study.locator('[data-debris-aperture-span="'+r.kind+'"]').getAttribute('data-value')),c.span);assert.equal(Number(await study.locator('[data-debris-aperture-point="'+r.kind+'"]').getAttribute('data-value')),value);areaReadings.push({kind:r.kind,value,area:c.area});}
    await totalButton.click();assert.equal(await study.getAttribute('data-basis'),'total');assert.deepEqual(await study.locator('[data-debris-aperture-curve]').evaluateAll(ns=>ns.map(n=>n.getAttribute('d'))),paths);
    await stage.focus();await page.keyboard.press('ArrowRight');assert.equal(await offset.inputValue(),'25.5');await page.keyboard.press('PageUp');assert.equal(await offset.inputValue(),'30.5');await page.keyboard.press('End');assert.equal(Number(await stage.getAttribute('aria-valuenow')),max);assert((await study.locator('[data-debris-aperture-reading]').allTextContents()).every(t=>t==='0 J'));
    await page.keyboard.press('Home');assert.equal(await offset.inputValue(),'0');await match.click();assert.equal(await page.evaluate(()=>window.__toolData.spaceStation.opsDebrisApertureOffset),before.main);assert(Math.abs(Number(await study.locator('[data-debris-aperture-reading="current"]').getAttribute('data-value'))/Number(await page.locator('[data-debris-scan-point="current"]').getAttribute('data-value'))-1)<1e-12);
    const after=await page.evaluate(()=>{const d=window.__toolData.spaceStation;return{main:d.opsDebrisDetectorOffset,time:d.opsDebrisTime,mark:JSON.stringify(d.opsDebrisPositionA),saved:JSON.stringify(d.opsDebrisBaseline)};});assert.deepEqual(after,before);
    await areaButton.click();await page.locator('[data-debris-scan-metric="mass"]').click();assert.equal(await footprint.getAttribute('data-field'),'uniform');assert((await study.locator('[data-debris-aperture-reading]').allTextContents()).every(t=>t.includes('mg/cm²')));const massMap=await footprintGeometry();await page.locator('[data-debris-scan-metric="expansion"]').click();assert.equal(await study.getAttribute('data-basis'),'area');assert.equal(await footprint.getAttribute('data-field'),'radial');assert.deepEqual(physicalGeometry(await footprintGeometry()),physicalGeometry(massMap));
    await offset.focus();await page.keyboard.press('Home');for(let i=0;i<5;i++)await page.keyboard.press('PageUp');await clockView.click();assert.equal(await footprint.getAttribute('data-phase'),'cloud');await page.evaluate(()=>document.activeElement?.blur());
    await page.addScriptTag({path:path.join(ROOT,'desktop/web-app/node_modules/axe-core/axe.min.js')});const a11y=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[data-debris-aperture-study]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:r.passes.length,violations:r.violations.map(v=>v.id)};});assert.deepEqual(a11y.violations,[]);
    await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});const studyClip=await study.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});await page.screenshot({path:path.join(output,'aperture-sizes-'+width+'.png'),clip:studyClip,fullPage:true,animations:'disabled'});
    const positionPanel=study.locator('[data-debris-flight-panel="position"]'),speedPanelButton=study.locator('[data-debris-flight-panel="speed"]'),flightInspector=study.locator('[data-debris-flight-inspector]'),speedPanel=study.locator('[data-debris-speed-panel]'),speedStage=study.locator('[data-debris-speed-stage]');
    const flightSnapshot=()=>page.evaluate(()=>{const d=window.__toolData.spaceStation;return{time:d.opsDebrisTime,main:d.opsDebrisDetectorOffset,comparison:d.opsDebrisApertureOffset,mark:JSON.stringify(d.opsDebrisPositionA),saved:JSON.stringify(d.opsDebrisBaseline)};}),beforeSpeed=await flightSnapshot(),speedPredictions=await predictionSnapshot();assert.equal(await positionPanel.getAttribute('aria-pressed'),'true');assert.equal(await speedPanel.count(),0);
    await speedPanelButton.click();assert.equal(await side.count(),0);assert.equal(await speedPanel.count(),1);assert.equal(await speedPanelButton.getAttribute('aria-pressed'),'true');assert.equal(await speedStage.getAttribute('role'),'slider');assert.deepEqual(await flightSnapshot(),beforeSpeed);assert.deepEqual(await predictionSnapshot(),speedPredictions);assert.equal(await page.locator('[data-iss-playback="debris"]').count(),1);
    const flightSeconds=(arrival-impact)/1e6,speedExpected={axial:{before:(contactSide.bx-sidePositions.approach)/contactSide.scale/(impact/1e6),after:(contactSide.wall.x1-contactSide.bx)/contactSide.scale/flightSeconds},radial:{before:0,after:(flightRadii.contact-flightRadii.impact)/mapAtProbe.scale/flightSeconds}},speedHigh=Number(await speedStage.getAttribute('data-debris-speed-high')),impactX=12+impact/arrival*576;
    const speedTraces={};for(const component of ['axial','radial']){const d=await speedStage.locator('[data-debris-speed-trace="'+component+'"]').getAttribute('d'),values=d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number),expected=[12,170-speedExpected[component].before/speedHigh*156,impactX,impactX,170-speedExpected[component].after/speedHigh*156,588];assert.equal(d.replace(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi,'').replace(/\s/g,''),'MHMH');assert.equal(values.length,expected.length);values.forEach((value,i)=>assert(Math.abs(value-expected[i])<1e-8));speedTraces[component]=d;for(const boundary of ['before','after']){const reading=Number(await speedStage.locator('[data-debris-speed-boundary="'+boundary+'"][data-speed-component="'+component+'"]').getAttribute('data-value'));assert(Math.abs(reading-speedExpected[component][boundary])<1e-8);}}
    for(const [event,phase] of [['start','approach'],['impact','impact'],['cloud','cloud'],['wall','contact']]){await study.locator('[data-debris-aperture-event="'+event+'"]').click();assert.equal(await speedStage.getAttribute('data-phase'),phase);for(const component of ['axial','radial']){const expected=speedExpected[component][event==='start'?'before':'after'];assert(Math.abs(Number(await speedPanel.locator('[data-debris-speed-reading="'+component+'"]').getAttribute('data-value'))-expected)<1e-8);assert(Math.abs(Number(await speedStage.locator('[data-debris-speed-point="'+component+'"]').getAttribute('data-value'))-expected)<1e-8);assert.match(await speedPanel.locator('[data-debris-speed-reading="'+component+'"]').textContent(),/km\/s/);assert.equal(await speedStage.locator('[data-debris-speed-trace="'+component+'"]').getAttribute('d'),speedTraces[component]);}assert.equal(Number(await speedStage.locator('[data-debris-speed-cursor]').getAttribute('data-debris-speed-cursor')),await clockTime());assert.deepEqual(await predictionSnapshot(),speedPredictions);}
    await speedStage.focus();for(const [key,expected] of [['Home',0],['ArrowRight',.05],['PageUp',.55],['ArrowLeft',.5],['PageDown',0],['End',arrival]]){await page.keyboard.press(key);assert.equal(await clockTime(),expected);assert.equal(Number(await speedStage.getAttribute('aria-valuenow')),expected);assert(Math.abs(Number(await localTime.inputValue())-expected)<1e-10);}
    await speedStage.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));const speedBox=await speedStage.locator('svg').boundingBox(),speedX=t=>speedBox.x+(12+t/arrival*576)/600*speedBox.width,speedY=speedBox.y+speedBox.height/2;
    for(const [point,from,to,expected] of [['incoming',0,impact/2,impact/2],['cloud',impact,before.time,before.time],['start',impact,-arrival/20,0],['wall',impact,arrival*1.05,arrival]]){if(width<500){const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:speedX(from),y:speedY,id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:speedX(to),y:speedY,id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}else{await page.mouse.move(speedX(from),speedY);await page.mouse.down();await page.mouse.move(speedX(to),speedY,{steps:5});await page.mouse.up();}const got=await clockTime();if(point==='start'||point==='wall')assert.equal(got,expected);else assert(Math.abs(got-expected)<arrival/(speedBox.width*576/600)*1.25);assert.equal(await speedStage.getAttribute('data-dragging'),null);assert(Math.abs(Number(await localTime.inputValue())-got)<1e-10);assert.deepEqual(await predictionSnapshot(),speedPredictions);}
    await study.locator('[data-debris-aperture-event="cloud"]').click();assert.deepEqual(await flightSnapshot(),beforeSpeed);await contactView.click();assert.equal(await speedStage.getAttribute('role'),'img');assert.equal(await speedStage.getAttribute('tabindex'),null);for(const name of ['aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext'])assert.equal(await speedStage.getAttribute(name),null);await speedStage.click();assert.deepEqual(await flightSnapshot(),beforeSpeed);await clockView.click();assert.equal(await speedStage.getAttribute('role'),'slider');assert.deepEqual(await flightSnapshot(),beforeSpeed);
    const speedA11y=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[data-debris-flight-inspector]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:r.passes.length,violations:r.violations.map(v=>v.id)};});assert.deepEqual(speedA11y.violations,[]);await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});const speedClip=await flightInspector.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});await page.screenshot({path:path.join(output,'aperture-speed-'+width+'.png'),clip:speedClip,fullPage:true,animations:'disabled'});
    const balanceButton=study.locator('[data-debris-flight-panel="balance"]'),budget=study.locator('[data-debris-budget-panel]');await balanceButton.click();assert.equal(await side.count(),0);assert.equal(await speedPanel.count(),0);assert.equal(await budget.count(),1);assert.equal(await balanceButton.getAttribute('aria-pressed'),'true');assert.deepEqual(await flightSnapshot(),beforeSpeed);assert.deepEqual(await predictionSnapshot(),speedPredictions);assert.equal(await budget.locator('[data-debris-budget-focus="forward"]').getAttribute('aria-pressed'),'true');
    const budgetConfig={diameter:Number(await page.locator('#iss-debris-size').inputValue()),bumper:Number(await page.locator('#iss-debris-bumper').inputValue()),speed:Number(await page.locator('#iss-debris-speed').inputValue()),spread:Number(await page.locator('#iss-debris-spread').inputValue()),material:await page.locator('#iss-debris-material').inputValue()},budgetRadius=budgetConfig.diameter/2000,budgetMass=4/3*Math.PI*budgetRadius**3*({aluminum:2700,glass:2500,steel:7800}[budgetConfig.material]),budgetPlug=Math.PI*budgetRadius**2*budgetConfig.bumper/1000*2700,budgetCloudMass=budgetMass+budgetPlug,budgetIncomingSpeed=budgetConfig.speed*1000,budgetMomentum=budgetMass*budgetIncomingSpeed,budgetAxial=budgetMomentum/budgetCloudMass,budgetIncoming=.5*budgetMass*budgetIncomingSpeed**2,budgetForward=.5*budgetCloudMass*budgetAxial**2,budgetRadial=(budgetIncoming-budgetForward)*budgetConfig.spread/100,budgetInternal=budgetIncoming-budgetForward-budgetRadial,budgetEnergy={incoming:budgetIncoming,total:budgetIncoming,forward:budgetForward,radial:budgetRadial,internal:budgetInternal};
    const budgetNumber=async(name,key)=>Number(await budget.locator('[data-debris-budget-'+name+'="'+key+'"]').getAttribute('data-value')),nearBudget=(actual,expected)=>assert(Math.abs(actual-expected)<=Math.max(1e-15,Math.abs(expected)*1e-12));
    for(const [state,mass,speed] of [['before',budgetMass,budgetIncomingSpeed],['after',budgetCloudMass,budgetAxial]]){nearBudget(await budgetNumber('mass',state),mass);nearBudget(await budgetNumber('speed',state),speed);nearBudget(await budgetNumber('momentum',state),budgetMomentum);nearBudget((await budgetNumber('mass',state))*(await budgetNumber('speed',state)),budgetMomentum);}
    for(const [component,value] of Object.entries(budgetEnergy))nearBudget(await budgetNumber('energy',component),value);
    const budgetFractions={};for(const component of ['forward','radial','internal']){const segment=budget.locator('[data-debris-budget-segment="'+component+'"]'),fraction=Number(await segment.getAttribute('data-fraction'));nearBudget(fraction,budgetEnergy[component]/budgetIncoming);nearBudget(Number(await segment.getAttribute('data-value')),budgetEnergy[component]);assert(Math.abs(await segment.evaluate(n=>parseFloat(n.style.width)/100)-fraction)<1e-6);budgetFractions[component]=fraction;}nearBudget(Object.values(budgetFractions).reduce((a,b)=>a+b,0),1);
    const budgetValues=()=>budget.locator('[data-debris-budget-mass], [data-debris-budget-speed], [data-debris-budget-momentum], [data-debris-budget-energy], [data-debris-budget-segment]').evaluateAll(ns=>ns.map(n=>({value:n.getAttribute('data-value'),fraction:n.getAttribute('data-fraction')}))),budgetInitialValues=await budgetValues();
    await budget.locator('[data-debris-budget-focus="radial"]').click();assert.equal(await budget.locator('[data-debris-budget-detail]').getAttribute('data-debris-budget-detail'),'radial');const internalButton=budget.locator('[data-debris-budget-focus="internal"]');await internalButton.focus();await page.keyboard.press('Enter');assert.equal(await internalButton.getAttribute('aria-pressed'),'true');assert.equal(await budget.locator('[data-debris-budget-detail]').getAttribute('data-debris-budget-detail'),'internal');assert(await internalButton.evaluate(n=>n===document.activeElement));assert.deepEqual(await flightSnapshot(),beforeSpeed);assert.deepEqual(await predictionSnapshot(),speedPredictions);assert.deepEqual(await budgetValues(),budgetInitialValues);
    const budgetTargets=await budget.locator('[data-debris-budget-focus]').evaluateAll(ns=>ns.map(n=>({component:n.dataset.debrisBudgetFocus,height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})));if(width<500)assert(budgetTargets.every(t=>t.height>=44&&t.width>=44));
    await totalButton.click();assert.deepEqual(await budgetValues(),budgetInitialValues);await areaButton.click();assert.deepEqual(await budgetValues(),budgetInitialValues);assert.deepEqual(await predictionSnapshot(),speedPredictions);
    await study.locator('[data-debris-aperture-event="start"]').click();assert.equal(await budget.getAttribute('data-phase'),'approach');assert.equal(await budget.getAttribute('data-after'),'false');assert.equal(await budget.locator('[data-debris-budget-state="before"]').getAttribute('data-active'),'true');assert.equal(await budget.locator('[data-debris-budget-state="after"]').getAttribute('data-predicted'),'true');assert.deepEqual(await budgetValues(),budgetInitialValues);
    await study.locator('[data-debris-aperture-event="impact"]').click();assert.equal(await clockTime(),impact);assert.equal(await budget.getAttribute('data-phase'),'impact');assert.equal(await budget.getAttribute('data-after'),'true');assert.equal(await budget.locator('[data-debris-budget-state="after"]').getAttribute('data-active'),'true');assert.equal(await budget.locator('[data-debris-budget-state="after"]').getAttribute('data-predicted'),'false');assert.deepEqual(await budgetValues(),budgetInitialValues);
    await study.locator('[data-debris-aperture-event="cloud"]').click();assert.deepEqual(await flightSnapshot(),beforeSpeed);await contactView.click();assert.equal(await budget.getAttribute('data-after'),'true');assert.equal(await budget.getAttribute('data-phase'),'contact');assert.deepEqual(await flightSnapshot(),beforeSpeed);await clockView.click();assert.equal(await budget.getAttribute('data-phase'),'cloud');assert.deepEqual(await predictionSnapshot(),speedPredictions);
    const measureBudgetText=()=>budget.locator('[data-debris-budget-focus]').evaluateAll(buttons=>buttons.map(button=>{const box=button.getBoundingClientRect();return{component:button.dataset.debrisBudgetFocus,buttonWidth:box.width,scrollWidth:button.scrollWidth,clientWidth:button.clientWidth,children:Array.from(button.children,child=>{const range=document.createRange();range.selectNodeContents(child);const rect=range.getBoundingClientRect();return{text:child.textContent,fontSize:getComputedStyle(child).fontSize,left:rect.left-box.left,right:rect.right-box.left,top:rect.top-box.top,bottom:rect.bottom-box.top,height:box.height};})};})),assertBudgetTextFits=measurements=>{for(const button of measurements){assert(button.scrollWidth<=button.clientWidth+1,button.component+' button has no horizontal overflow');for(const child of button.children){assert(child.left>=-.5&&child.right<=button.buttonWidth+.5,button.component+' text fits button width: '+child.text);assert(child.top>=-.5&&child.bottom<=child.height+.5,button.component+' text fits button height: '+child.text);}}};
    const budgetTextFit=await measureBudgetText();assertBudgetTextFits(budgetTextFit);
    const budgetAlignment=width<500?await budget.evaluate(panel=>{const rows={};for(const kind of ['mass','speed','momentum'])rows[kind]=['before','after'].map(side=>panel.querySelector('[data-debris-budget-'+kind+'="'+side+'"]').getBoundingClientRect().top);rows.bars=['before','after'].map(side=>panel.querySelector('[data-debris-budget-state="'+side+'"] .iss-debris-impact-bar').getBoundingClientRect().top);return rows;}):null;if(budgetAlignment)for(const [row,tops] of Object.entries(budgetAlignment))assert(Math.abs(tops[0]-tops[1])<=1,'paired budget '+row+' align on phone');
    const budgetA11y=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[data-debris-flight-inspector]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:r.passes.length,violations:r.violations.map(v=>v.id)};});assert.deepEqual(budgetA11y.violations,[]);await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});const budgetClip=await flightInspector.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});await page.screenshot({path:path.join(output,'aperture-budget-'+width+'.png'),clip:budgetClip,fullPage:true,animations:'disabled'});
    const motionButton=study.locator('[data-debris-flight-panel="motion"]'),motion=study.locator('[data-debris-motion-panel]'),motionField=motion.locator('[data-debris-motion-field]'),motionVector=motion.locator('[data-debris-motion-vector-chart]'),motionRadius=motion.locator('#iss-debris-motion-radius'),motionReading=async key=>Number(await motion.locator('[data-debris-motion-reading="'+key+'"]').getAttribute('data-value'));
    await motionButton.click();assert.equal(await side.count(),0);assert.equal(await speedPanel.count(),0);assert.equal(await budget.count(),0);assert.equal(await motion.count(),1);assert.equal(await motionButton.getAttribute('aria-pressed'),'true');assert.equal(await motionRadius.inputValue(),'50');assert.equal(await motionField.getAttribute('role'),'slider');assert.equal(await motionField.getAttribute('tabindex'),'0');assert.equal(await motionField.getAttribute('aria-orientation'),'vertical');assert.deepEqual(await flightSnapshot(),beforeSpeed);assert.deepEqual(await predictionSnapshot(),speedPredictions);
    const motionScale=Number(await motionField.locator('svg').getAttribute('data-debris-motion-scale')),motionHigh=Number(await motionVector.getAttribute('data-high'));nearBudget(motionScale,80/(mapAtProbe.cloud.r/mapAtProbe.scale));assert.equal(motionHigh,Math.ceil(Math.max(speedExpected.axial.before,speedExpected.radial.after)/2000)*2000);
    const assertMotion=async(fraction,phase,cloudRadius)=>{const after=phase!=='approach',forward=after?budgetAxial:budgetIncomingSpeed,radial=after?speedExpected.radial.after*fraction:0,speed=Math.hypot(forward,radial),angle=Math.atan2(radial,forward)*180/Math.PI;assert.equal(await motionField.getAttribute('role'),after?'slider':'img');assert.equal(await motionField.getAttribute('tabindex'),after?'0':null);for(const [key,value] of [['aria-valuemin','0'],['aria-valuemax','100'],['aria-valuenow',String(fraction*100)],['aria-orientation','vertical']])assert.equal(await motionField.getAttribute(key),after?value:null);assert.equal(await motion.getAttribute('data-phase'),phase);assert.equal(await motion.getAttribute('data-after'),String(after));nearBudget(await motionReading('forward'),forward);nearBudget(await motionReading('radial'),radial);nearBudget(await motionReading('speed'),speed);nearBudget(await motionReading('angle'),angle);assert.equal(Number(await motionField.locator('svg').getAttribute('data-debris-motion-scale')),motionScale);nearBudget(Number(await motionField.locator('[data-debris-motion-cloud]').getAttribute('r')),cloudRadius*motionScale);
      const markers=await motion.locator('[data-debris-motion-sample]').evaluateAll(ns=>ns.map(n=>({kind:n.dataset.debrisMotionSample,radius:Number(n.dataset.radius),top:parseFloat(n.style.top),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));assert.equal(markers.length,after?(fraction===0?1:2):0);if(after){nearBudget(await motionReading('radius'),fraction*cloudRadius);for(const marker of markers){nearBudget(Math.abs(marker.radius),fraction*cloudRadius);assert(Math.abs(marker.width-marker.height)<.001);assert(Math.abs(marker.top-(120-marker.radius*motionScale)/240*100)<1e-4); // CSS serializes percentages to limited decimal precision.
}if(markers.length===2){nearBudget(markers[0].radius,-markers[1].radius);assert(Math.abs(markers[0].top+markers[1].top-100)<2e-4);}}else assert.equal(await motion.locator('[data-debris-motion-reading="radius"]').getAttribute('data-value'),'pending');
      assert.equal(await motion.locator('[data-debris-motion-radial]').count(),after&&radial>0?2:0);const end=[42+forward*160/motionHigh,200-radial*160/motionHigh];for(const [component,expected] of [['forward',[42,200,end[0],200]],['resultant',[42,200,end[0],end[1]]],...(radial>0?[['radial',[end[0],200,end[0],end[1]]]]:[])]){const d=await motionVector.locator('[data-debris-motion-vector="'+component+'"]').getAttribute('d'),values=d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);assert(values.length>=4);expected.forEach((value,i)=>nearBudget(values[i],value));}assert.equal(await motionVector.locator('[data-debris-motion-vector="radial"]').count(),radial>0?1:0);return{fraction,phase,forward,radial,speed,angle,radius:after?fraction*cloudRadius:null,markers};};
    const motionStates=[];motionStates.push(await assertMotion(.5,'cloud',flightRadii.cloud/mapAtProbe.scale));for(const [preset,fraction] of [['center',0],['middle',.5],['rim',1]]){await motion.locator('[data-debris-motion-preset="'+preset+'"]').click();assert.equal(Number(await motionRadius.inputValue()),fraction*100);assert.equal(await page.evaluate(()=>window.__toolData.spaceStation.opsDebrisMotionRadius),fraction*100);motionStates.push(await assertMotion(fraction,'cloud',flightRadii.cloud/mapAtProbe.scale));assert.deepEqual(await flightSnapshot(),beforeSpeed);assert.deepEqual(await predictionSnapshot(),speedPredictions);}
    await motionRadius.focus();for(const [key,value] of [['Home',0],['ArrowRight',1],['PageUp',11],['ArrowLeft',10],['PageDown',0],['End',100]]){await page.keyboard.press(key);assert.equal(Number(await motionRadius.inputValue()),value);assert.equal(await page.evaluate(()=>window.__toolData.spaceStation.opsDebrisMotionRadius),value);await assertMotion(value/100,'cloud',flightRadii.cloud/mapAtProbe.scale);assert.deepEqual(await flightSnapshot(),beforeSpeed);}await motion.locator('[data-debris-motion-preset="middle"]').click();
    for(const [event,phase] of [['start','approach'],['impact','impact'],['cloud','cloud'],['wall','contact']]){await study.locator('[data-debris-aperture-event="'+event+'"]').click();motionStates.push(await assertMotion(.5,phase,flightRadii[phase]/mapAtProbe.scale));assert.equal(await motionRadius.inputValue(),'50');assert.deepEqual(await predictionSnapshot(),speedPredictions);}await study.locator('[data-debris-aperture-event="cloud"]').click();assert.deepEqual(await flightSnapshot(),beforeSpeed);await contactView.click();await assertMotion(.5,'contact',flightRadii.contact/mapAtProbe.scale);assert.deepEqual(await flightSnapshot(),beforeSpeed);await clockView.click();await assertMotion(.5,'cloud',flightRadii.cloud/mapAtProbe.scale);assert.deepEqual(await flightSnapshot(),beforeSpeed);
    const motionA11y=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[data-debris-flight-inspector]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:r.passes.length,violations:r.violations.map(v=>v.id)};});assert.deepEqual(motionA11y.violations,[]);assert(await motion.evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});const motionClip=await flightInspector.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});await page.screenshot({path:path.join(output,'aperture-motion-'+width+'.png'),clip:motionClip,fullPage:true,animations:'disabled'});
    // Select material directly in the live cloud. Pixel precision includes touch-coordinate rounding.
    await motionField.focus();for(const [key,value] of [['Home',0],['ArrowUp',1],['PageUp',11],['ArrowDown',10],['PageDown',0],['End',100]]){await page.keyboard.press(key);assert.equal(Number(await motionRadius.inputValue()),value);assert.equal(Number(await motionField.getAttribute('aria-valuenow')),value);assert.deepEqual(await flightSnapshot(),beforeSpeed);assert.deepEqual(await predictionSnapshot(),speedPredictions);}
    const motionDrags=[];
    const dragMotion=async(fromFraction,toFraction,outside=false)=>{await motionField.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));const box=await motionField.locator('svg').boundingBox(),pixels=Math.min(box.width/300,box.height/240),top=box.y+(box.height-240*pixels)/2,left=box.x+(box.width-300*pixels)/2,radius=Number(await motionField.locator('[data-debris-motion-cloud]').getAttribute('r')),x=left+150*pixels,y=f=>top+(120-f*radius)*pixels,toX=outside?box.x+box.width+20:x;
      if(width<500){const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y(fromFraction),id:0}]});assert.equal(await motionField.getAttribute('data-dragging'),'true');await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:toX,y:y(toFraction),id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
      else{await page.mouse.move(x,y(fromFraction));await page.mouse.down();assert.equal(await motionField.getAttribute('data-dragging'),'true');await page.mouse.move(toX,y(toFraction),{steps:5});await page.mouse.up();}
      const actual=Number(await motionRadius.inputValue()),expected=Math.min(100,Math.round(Math.abs(toFraction)*100)),tolerance=1+1.25/(radius*pixels)*100;assert(Math.abs(actual-expected)<=tolerance,'live material radius maps to pointer position');if(expected===100)assert.equal(actual,100);assert.equal(await motionField.getAttribute('data-dragging'),null);assert.equal(Number(await motionField.getAttribute('aria-valuenow')),actual);assert.deepEqual(await flightSnapshot(),beforeSpeed);assert.deepEqual(await predictionSnapshot(),speedPredictions);motionDrags.push({fromFraction,toFraction,actual,expected,outside});return actual;};
    for(const [from,to,outside] of [[0,.75,false],[.75,-.25,false],[-.25,1.4,true],[.5,0,false]])await dragMotion(from,to,outside);
    await motion.locator('[data-debris-motion-preset="middle"]').click();
    const velocityButton=motion.locator('[data-debris-motion-diagram="velocity"]'),pathButton=motion.locator('[data-debris-motion-diagram="path"]'),materialPath=motion.locator('[data-debris-motion-path]'),pathSvg=materialPath.locator('svg'),wallRadius=mapAtProbe.cloud.r/mapAtProbe.scale,gap=Number(await page.locator('#iss-shield-gap').inputValue())/100,pathScale=Math.min(220/gap,160/(2*wallRadius)),pathBumper=(300-gap*pathScale)/2,pathWall=pathBumper+gap*pathScale;
    assert.equal(await velocityButton.getAttribute('aria-pressed'),'true');assert.equal(await materialPath.count(),0);await pathButton.focus();await page.keyboard.press('Enter');assert.equal(await pathButton.getAttribute('aria-pressed'),'true');assert.equal(await motionVector.count(),0);assert.equal(await materialPath.count(),1);assert.equal(await materialPath.getAttribute('role'),'slider');assert.equal(await materialPath.getAttribute('tabindex'),'0');assert.equal(await materialPath.getAttribute('aria-orientation'),'horizontal');assert.deepEqual(await flightSnapshot(),beforeSpeed);assert.deepEqual(await predictionSnapshot(),speedPredictions);
    const assertMaterialPath=async(fraction,phase,cloudRadius,time)=>{const after=phase!=='approach',keys=fraction===0?['center']:['positive','negative'],x=after?(phase==='contact'?gap:Math.min(gap,budgetAxial*(time-impact)/1e6)):null;assert.equal(await materialPath.getAttribute('data-phase'),phase);const follows=(await clockView.getAttribute('aria-pressed'))==='true';assert.equal(await materialPath.getAttribute('role'),follows?'slider':'img');assert.equal(await materialPath.getAttribute('tabindex'),follows?'0':null);for(const [name,value] of [['aria-valuemin','0'],['aria-valuemax',String(arrival)],['aria-valuenow',String(time)],['aria-orientation','horizontal']])assert.equal(await materialPath.getAttribute(name),follows?value:null);nearBudget(Number(await motion.locator('[data-debris-material-time]').getAttribute('data-value')),time);const cursor=materialPath.locator('[data-debris-material-cursor]');assert.equal(await cursor.count(),after?1:0);if(after){nearBudget(Number(await cursor.getAttribute('x1')),pathBumper+x*pathScale);nearBudget(Number(await cursor.getAttribute('x2')),pathBumper+x*pathScale);}nearBudget(Number(await motionField.locator('[data-debris-motion-cloud]').getAttribute('r')),cloudRadius*motionScale);nearBudget(Number(await pathSvg.getAttribute('data-debris-material-scale')),pathScale);nearBudget(Number(await pathSvg.getAttribute('data-debris-material-bumper-x')),pathBumper);nearBudget(Number(await pathSvg.getAttribute('data-debris-material-wall-x')),pathWall);assert.equal(await materialPath.locator('[data-debris-material-track]').count(),keys.length);assert.equal(await materialPath.locator('[data-debris-material-travelled]').count(),after?keys.length:0);assert.equal(await materialPath.locator('[data-debris-material-point]').count(),after?keys.length:0);assert.equal(await materialPath.locator('[data-debris-material-landing]').count(),keys.length);
      for(const key of keys){const sign=key==='negative'?-1:1,r0=sign*fraction*budgetRadius,r1=sign*fraction*wallRadius,values=(await materialPath.locator('[data-debris-material-track="'+key+'"]').getAttribute('d')).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);[pathBumper,120-r0*pathScale,pathWall,120-r1*pathScale].forEach((v,i)=>nearBudget(values[i],v));const landing=materialPath.locator('[data-debris-material-landing="'+key+'"]');nearBudget(Number(await landing.getAttribute('data-radius')),r1);const landingSize=await landing.boundingBox();assert(Math.abs(landingSize.width-landingSize.height)<.001);assert(Math.abs(landingSize.width-12)<.001);
        if(after){const point=materialPath.locator('[data-debris-material-point="'+key+'"]'),r=sign*fraction*cloudRadius;nearBudget(Number(await point.getAttribute('data-x')),x);nearBudget(Number(await point.getAttribute('data-radius')),r);const pointSize=await point.boundingBox();assert(Math.abs(pointSize.width-pointSize.height)<.001);assert(Math.abs(pointSize.width-8)<.001);const travelled=(await materialPath.locator('[data-debris-material-travelled="'+key+'"]').getAttribute('d')).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);[pathBumper,120-r0*pathScale,pathBumper+x*pathScale,120-r*pathScale].forEach((v,i)=>nearBudget(travelled[i],v));}}
      nearBudget(Number(await motion.locator('[data-debris-material-reading="landing"]').getAttribute('data-value')),fraction*wallRadius);for(const [key,value] of [['remainingTime',Math.max(0,arrival-time)],['remainingDistance',after?Math.hypot(gap-x,fraction*(wallRadius-cloudRadius)):null]]){const actual=await motion.locator('[data-debris-material-reading="'+key+'"]').getAttribute('data-value');if(after)nearBudget(Number(actual),value);else assert.equal(actual,'pending');}assert.deepEqual(await predictionSnapshot(),speedPredictions);return{fraction,phase,time,x,scale:pathScale};};
    const pathStates=[];pathStates.push(await assertMaterialPath(.5,'cloud',flightRadii.cloud/mapAtProbe.scale,before.time));
    for(const [event,phase,time] of [['start','approach',0],['impact','impact',impact],['cloud','cloud',before.time],['wall','contact',arrival]]){await study.locator('[data-debris-aperture-event="'+event+'"]').click();pathStates.push(await assertMaterialPath(.5,phase,flightRadii[phase]/mapAtProbe.scale,time));if(phase==='approach'){assert.equal(await motionField.getAttribute('role'),'img');assert.equal(await motionField.getAttribute('aria-valuenow'),null);await motionField.click();assert.equal(await motionRadius.inputValue(),'50');assert.equal(await clockTime(),0);}}
    await study.locator('[data-debris-aperture-event="cloud"]').click();for(const [preset,fraction] of [['center',0],['rim',1],['middle',.5]]){await motion.locator('[data-debris-motion-preset="'+preset+'"]').click();pathStates.push(await assertMaterialPath(fraction,'cloud',flightRadii.cloud/mapAtProbe.scale,before.time));assert.deepEqual(await flightSnapshot(),beforeSpeed);}
    await contactView.click();pathStates.push(await assertMaterialPath(.5,'contact',wallRadius,arrival));assert.deepEqual(await flightSnapshot(),beforeSpeed);await materialPath.click();assert.deepEqual(await flightSnapshot(),beforeSpeed);assert.equal(await materialPath.getAttribute('aria-valuetext'),null);await clockView.click();await assertMaterialPath(.5,'cloud',flightRadii.cloud/mapAtProbe.scale,before.time);
    const materialRuler=materialPath.locator('[data-debris-material-ruler]'),rulerMeters=Number(await materialRuler.getAttribute('data-meters')),rulerX1=Number(await materialRuler.getAttribute('x1')),rulerX2=Number(await materialRuler.getAttribute('x2')),rulerPixels=rulerX2-rulerX1;
    assert.equal(rulerX1,22);assert.equal(Number(await materialRuler.getAttribute('y1')),226);assert.equal(Number(await materialRuler.getAttribute('y2')),226);nearBudget(rulerPixels,rulerMeters*pathScale);assert(rulerPixels>=32-1e-10&&rulerPixels<=80+1e-10);const rulerMantissa=rulerMeters/10**Math.floor(Math.log10(rulerMeters));assert([1,2,5].some(n=>Math.abs(rulerMantissa-n)<1e-12));const rulerLabel=await motion.locator('[data-debris-material-ruler-label]').textContent();assert.match(rulerLabel,/mm/);nearBudget(Number(rulerLabel.replace(/,/g,'').match(/([\d.]+)\s*mm/)[1]),rulerMeters*1000);const rulerSvgBox=await pathSvg.boundingBox(),rulerBox=await materialRuler.evaluate(n=>{const m=n.getScreenCTM();return{width:(n.x2.baseVal.value-n.x1.baseVal.value)*Math.hypot(m.a,m.b)};}),rulerRenderScale=Math.min(rulerSvgBox.width/300,rulerSvgBox.height/240);assert(Math.abs(rulerBox.width-rulerPixels*rulerRenderScale)<.001,JSON.stringify({width,rulerBox,rulerSvgBox,rulerPixels,rulerRenderScale,expected:rulerPixels*rulerRenderScale}));
    const pathSeekStates=[],protectPath=({time,...rest})=>rest,assertPathTime=async expected=>{const time=await clockTime();nearBudget(time,expected);assert.equal(Number(await materialPath.getAttribute('aria-valuenow')),time);assert(Math.abs(Number(await localTime.inputValue())-time)<1e-10);assert(Math.abs(Number(await globalTime.inputValue())-time)<1e-10);assert.equal(await motionRadius.inputValue(),'50');assert.deepEqual(protectPath(await flightSnapshot()),protectPath(beforeSpeed));assert.deepEqual(await predictionSnapshot(),speedPredictions);const phase=time<impact?'approach':time===impact?'impact':time===arrival?'contact':'cloud',cloudRadius=phase==='contact'?wallRadius:budgetRadius+Math.max(0,time-impact)/1e6*speedExpected.radial.after;pathSeekStates.push(await assertMaterialPath(.5,phase,cloudRadius,time));};
    await materialPath.focus();for(const [key,time] of [['Home',0],['ArrowRight',.05],['PageUp',.55],['ArrowLeft',.5],['PageDown',0],['End',arrival]]){await page.keyboard.press(key);await assertPathTime(time);}await study.locator('[data-debris-aperture-event="cloud"]').click();
    const pathPointerStates=[];await materialPath.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));const pathBox=await pathSvg.boundingBox(),pathPixels=Math.min(pathBox.width/300,pathBox.height/240),pathLeft=pathBox.x+(pathBox.width-300*pathPixels)/2,pathTop=pathBox.y+(pathBox.height-240*pathPixels)/2,pathY=pathTop+120*pathPixels,pathMid=pathLeft+(pathBumper+pathWall)/2*pathPixels;
    for(const [kind,toX,expected] of [['quarter',pathLeft+(pathBumper+.25*(pathWall-pathBumper))*pathPixels,impact+.25*(arrival-impact)],['left',pathBox.x-20,impact],['right',pathBox.x+pathBox.width+20,arrival]]){
      if(width<500){const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pathMid,y:pathY,id:0}]});assert.equal(await materialPath.getAttribute('data-dragging'),'true');await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:toX,y:pathY,id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
      else{await page.mouse.move(pathMid,pathY);await page.mouse.down();assert.equal(await materialPath.getAttribute('data-dragging'),'true');await page.mouse.move(toX,pathY,{steps:5});await page.mouse.up();}
      const actual=await clockTime();if(kind==='quarter')assert(Math.abs(actual-expected)<1.25*(arrival-impact)/((pathWall-pathBumper)*pathPixels));else assert.equal(actual,expected);assert.equal(await materialPath.getAttribute('data-dragging'),null);await assertPathTime(actual);pathPointerStates.push({kind,actual,expected});}
    await study.locator('[data-debris-aperture-event="cloud"]').click();const debrisPlay=page.locator('[data-iss-playback-toggle="debris"]'),debrisRate=page.locator('[data-iss-playback-speed="debris"]'),previousDebrisRate=await debrisRate.inputValue();await debrisRate.selectOption('5');await materialPath.focus();await debrisPlay.evaluate(n=>n.click());assert.equal(await debrisPlay.getAttribute('aria-pressed'),'true');await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('[data-iss-playback-toggle="debris"]').getAttribute('aria-pressed')==='false',null,{timeout:2000});await assertPathTime(0);await debrisRate.selectOption(previousDebrisRate);await study.locator('[data-debris-aperture-event="cloud"]').click();assert.deepEqual(await flightSnapshot(),beforeSpeed);await assertMaterialPath(.5,'cloud',flightRadii.cloud/mapAtProbe.scale,before.time);
    const markSave=motion.locator('[data-debris-motion-mark="save"]'),markReturn=motion.locator('[data-debris-motion-mark="return"]'),markClear=motion.locator('[data-debris-motion-mark="clear"]'),motionReference=motion.locator('[data-debris-motion-reference]'),readMotionMark=()=>page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisMotionMark)),referenceStates=[];
    assert.equal(await motionReference.count(),0);assert(await markReturn.isDisabled());assert(await markClear.isDisabled());
    const assertMotionReference=async(markedTime,currentTime,fraction)=>{const after=currentTime>=impact,markX=Math.min(gap,budgetAxial*(markedTime-impact)/1e6),markR=budgetRadius+speedExpected.radial.after*(markedTime-impact)/1e6,dt=currentTime-markedTime,forward=budgetAxial*dt/1e6,outward=fraction*speedExpected.radial.after*dt/1e6,separation=Math.hypot(forward,outward);assert.equal(await motionReference.count(),1);assert.equal(await motionReference.getAttribute('data-active'),String(after));assert.equal(await markSave.isDisabled(),!after);assert.equal(await markReturn.isDisabled(),false);assert.equal(await markClear.isDisabled(),false);
      for(const [key,expected] of [['time',dt],['forward',forward],['outward',outward],['separation',separation]]){const actual=await motion.locator('[data-debris-motion-delta="'+key+'"]').getAttribute('data-value');if(after)nearBudget(Number(actual),expected);else assert.equal(actual,'pending');}
      const currentX=after?Math.min(gap,budgetAxial*(currentTime-impact)/1e6):null,currentR=after?budgetRadius+speedExpected.radial.after*(currentTime-impact)/1e6:null,from=[pathBumper+markX*pathScale,120-fraction*markR*pathScale],to=after?[pathBumper+currentX*pathScale,120-fraction*currentR*pathScale]:null,corner=after?[to[0],from[1]]:null,triangleVisible=after&&separation>0;
      const triangleExpected=[['forward',forward,from,corner],['outward',outward,corner,to],['resultant',separation,from,to]];let triangleCount=0;for(const [component,value,start,end] of triangleExpected){const arrow=materialPath.locator('[data-debris-displacement="'+component+'"]'),visible=triangleVisible&&value!==0;assert.equal(await arrow.count(),visible?1:0);if(visible){triangleCount++;nearBudget(Number(await arrow.getAttribute('data-value')),value);const coords=(await arrow.getAttribute('d')).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);assert(coords.length>=4);[...start,...end].forEach((v,i)=>nearBudget(coords[i],v));if(component==='resultant'){assert(Number(await arrow.getAttribute('data-value'))>0);assert(await arrow.getAttribute('stroke-dasharray'));}}}assert.equal(await materialPath.locator('[data-debris-displacement]').count(),triangleCount);
      const referenceCloud=motionField.locator('[data-debris-motion-reference-cloud]'),referenceCursor=materialPath.locator('[data-debris-material-reference-cursor]'),keys=after?(fraction===0?['center']:['positive','negative']):[];assert.equal(await referenceCloud.count(),after?1:0);assert.equal(await referenceCursor.count(),after?1:0);assert.equal(await motionField.locator('[data-debris-motion-reference-point]').count(),keys.length);assert.equal(await materialPath.locator('[data-debris-material-reference-point]').count(),keys.length);
      if(after){nearBudget(Number(await referenceCloud.getAttribute('r')),markR*motionScale);nearBudget(Number(await referenceCursor.getAttribute('x1')),pathBumper+markX*pathScale);nearBudget(Number(await referenceCursor.getAttribute('x2')),pathBumper+markX*pathScale);for(const key of keys){const signed=(key==='negative'?-1:1)*fraction*markR,fieldPoint=motionField.locator('[data-debris-motion-reference-point="'+key+'"]'),pathPoint=materialPath.locator('[data-debris-material-reference-point="'+key+'"]');nearBudget(Number(await fieldPoint.getAttribute('data-radius')),signed);nearBudget(Number(await pathPoint.getAttribute('data-radius')),signed);nearBudget(Number(await pathPoint.getAttribute('data-x')),markX);for(const point of [fieldPoint,pathPoint]){const metrics=await point.evaluate(n=>{const b=n.getBoundingClientRect(),s=getComputedStyle(n);return{width:parseFloat(s.width),height:parseFloat(s.height),renderedWidth:b.width,renderedHeight:b.height};});assert.equal(metrics.width,10);assert.equal(metrics.height,10);assert(Math.abs(metrics.renderedWidth-metrics.renderedHeight)<.001);assert(Math.abs(metrics.renderedWidth-10*Math.SQRT2)<.001);}}}
      assert.deepEqual(protectPath(await flightSnapshot()),protectPath(beforeSpeed));assert.deepEqual(await predictionSnapshot(),speedPredictions);return{markedTime,currentTime,fraction,after,dt:after?dt:null,separation:after?separation:null,triangleCount};};
    await study.locator('[data-debris-aperture-event="impact"]').click();const beforeFirstMark=await flightSnapshot();await markSave.focus();await page.keyboard.press('Enter');assert.deepEqual(await flightSnapshot(),beforeFirstMark);const impactMotionMark=await readMotionMark();referenceStates.push(await assertMotionReference(impact,impact,.5));
    await study.locator('[data-debris-aperture-event="cloud"]').click();referenceStates.push(await assertMotionReference(impact,before.time,.5));for(const [preset,fraction] of [['rim',1],['center',0],['middle',.5]]){await motion.locator('[data-debris-motion-preset="'+preset+'"]').click();referenceStates.push(await assertMotionReference(impact,before.time,fraction));assert.equal(await readMotionMark(),impactMotionMark);}
    await velocityButton.click();assert.equal(await materialPath.count(),0);assert.equal(await motionField.locator('[data-debris-motion-reference-cloud]').count(),1);assert.equal(await readMotionMark(),impactMotionMark);await pathButton.click();await positionPanel.click();await motionButton.click();assert.equal(await pathButton.getAttribute('aria-pressed'),'true');assert.equal(await readMotionMark(),impactMotionMark);await assertMotionReference(impact,before.time,.5);
    const beforeReplacement=await flightSnapshot();await markSave.click();assert.deepEqual(await flightSnapshot(),beforeReplacement);referenceStates.push(await assertMotionReference(before.time,before.time,.5));await study.locator('[data-debris-aperture-event="impact"]').click();referenceStates.push(await assertMotionReference(before.time,impact,.5));await study.locator('[data-debris-aperture-event="start"]').click();referenceStates.push(await assertMotionReference(before.time,0,.5));const savedBeforeContact=await readMotionMark();await contactView.click();referenceStates.push(await assertMotionReference(before.time,arrival,.5));assert.equal(await clockTime(),0);assert.equal(await readMotionMark(),savedBeforeContact);await markReturn.click();assert.equal(await clockView.getAttribute('aria-pressed'),'true');assert.equal(await clockTime(),before.time);await page.waitForFunction(()=>document.querySelector('[data-iss-playback-toggle="debris"]').getAttribute('aria-pressed')==='false',null,{timeout:2000});referenceStates.push(await assertMotionReference(before.time,before.time,.5));
    const pickPathFraction=async fraction=>{await materialPath.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));const box=await pathSvg.boundingBox(),pixels=Math.min(box.width/300,box.height/240),left=box.x+(box.width-300*pixels)/2,top=box.y+(box.height-240*pixels)/2,x=left+(pathBumper+(pathWall-pathBumper)*fraction)*pixels,y=top+120*pixels;if(width<500)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);return await clockTime();};
    const markedQuarter=await pickPathFraction(.25);await markSave.click();const currentThreeQuarter=await pickPathFraction(.75);referenceStates.push(await assertMotionReference(markedQuarter,currentThreeQuarter,.5));assert(currentThreeQuarter>markedQuarter);const referenceLayout=await motionReference.evaluate(n=>({columns:getComputedStyle(n).gridTemplateColumns.split(/\s+/).length,cards:Array.from(n.children,e=>({width:e.getBoundingClientRect().width,scroll:e.scrollWidth,client:e.clientWidth}))}));assert.equal(referenceLayout.cards.length,4);assert.equal(referenceLayout.columns,width<500?1:4);assert(referenceLayout.cards.every(c=>c.scroll<=c.client+1));const referenceA11y=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[data-debris-flight-inspector]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:r.passes.length,violations:r.violations.map(v=>v.id)};});assert.deepEqual(referenceA11y.violations,[]);assert(await motion.evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});const referenceClip=await flightInspector.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});await page.screenshot({path:path.join(output,'aperture-material-displacement-'+width+'.png'),clip:referenceClip,fullPage:true,animations:'disabled'});
    const stepsToggle=motion.locator('[data-debris-material-steps-toggle]'),stepsPanel=motion.locator('[data-debris-material-steps]'),stepButtons=motion.locator('[data-debris-material-step]');assert.equal(await stepsToggle.getAttribute('aria-controls'),'iss-debris-material-steps');assert.equal(await stepsToggle.getAttribute('aria-expanded'),'false');assert.equal(await stepsPanel.count(),1);assert.equal(await stepsPanel.isVisible(),false);assert.equal(await stepButtons.count(),0);assert.equal(await materialPath.locator('[data-debris-material-step-point]').count(),0);
    const beforeGuide=await flightSnapshot(),guideInitialMark=await readMotionMark();await stepsToggle.focus();await page.keyboard.press('Enter');assert.equal(await stepsToggle.getAttribute('aria-expanded'),'true');assert.equal(await stepsPanel.isVisible(),true);assert.equal(await stepButtons.count(),5);assert.deepEqual(await flightSnapshot(),beforeGuide);assert.equal(await readMotionMark(),guideInitialMark);nearBudget(Number(await motion.locator('[data-debris-material-step-interval]').getAttribute('data-value')),(arrival-impact)/4);assert.match(await stepsPanel.textContent(),/µs/);const stepTimes=await stepButtons.evaluateAll(ns=>ns.map(n=>Number(n.dataset.time))),stepTargets=await stepButtons.evaluateAll(ns=>ns.map(n=>{const b=n.getBoundingClientRect();return{width:b.width,height:b.height};}));if(width<500)assert(stepTargets.every(b=>b.width>=44&&b.height>=44));for(let i=0;i<5;i++)nearBudget(stepTimes[i],i===0?impact:i===4?arrival:impact+(arrival-impact)*i/4);assert.equal(stepTimes[0],impact);assert.equal(stepTimes[4],arrival);
    const guideStates=[],assertSteps=async(currentTime,fraction)=>{const sides=fraction===0?['center']:['positive','negative'];assert.equal(await materialPath.locator('[data-debris-material-step-point]').count(),5*sides.length);for(let i=0;i<5;i++){const button=motion.locator('[data-debris-material-step="'+i+'"]'),expectedTime=stepTimes[i],x=gap*i/4,radius=fraction*(budgetRadius+(wallRadius-budgetRadius)*i/4);assert.equal(await button.getAttribute('aria-pressed'),String(currentTime===expectedTime));nearBudget(Number(await button.getAttribute('data-time')),expectedTime);for(const side of sides){const point=materialPath.locator('[data-debris-material-step-point="'+i+'"][data-side="'+side+'"]'),sign=side==='negative'?-1:1;nearBudget(Number(await point.getAttribute('data-time')),expectedTime);nearBudget(Number(await point.getAttribute('data-x')),x);nearBudget(Number(await point.getAttribute('data-radius')),sign*radius);assert.equal(await point.getAttribute('data-reached'),String(currentTime>=expectedTime));const metrics=await point.evaluate(n=>{const b=n.getBoundingClientRect();return{width:b.width,height:b.height,left:parseFloat(n.style.left),top:parseFloat(n.style.top)};});assert(Math.abs(metrics.width-6)<.001&&Math.abs(metrics.height-6)<.001);assert(Math.abs(metrics.left-(pathBumper+x*pathScale)/300*100)<1e-4);assert(Math.abs(metrics.top-(120-sign*radius*pathScale)/240*100)<1e-4);}}
      assert.deepEqual(protectPath(await flightSnapshot()),protectPath(beforeSpeed));assert.deepEqual(await predictionSnapshot(),speedPredictions);guideStates.push({time:currentTime,fraction,reached:stepTimes.filter(t=>currentTime>=t).length,selected:stepTimes.indexOf(currentTime)});};
    await assertSteps(currentThreeQuarter,.5);for(let i=0;i<5;i++){const button=motion.locator('[data-debris-material-step="'+i+'"]');await button.focus();await page.keyboard.press('Enter');assert.equal(await clockView.getAttribute('aria-pressed'),'true');assert.equal(await clockTime(),stepTimes[i]);await assertSteps(stepTimes[i],.5);assert.equal(await readMotionMark(),guideInitialMark);assert.equal(await motionRadius.inputValue(),'50');}
    await study.locator('[data-debris-aperture-event="start"]').click();await assertSteps(0,.5);assert.equal(await materialPath.locator('[data-debris-material-step-point][data-reached="true"]').count(),0);await contactView.click();await assertSteps(arrival,.5);assert.equal(await clockTime(),0);await motion.locator('[data-debris-material-step="2"]').click();assert.equal(await clockView.getAttribute('aria-pressed'),'true');assert.equal(await clockTime(),stepTimes[2]);await assertSteps(stepTimes[2],.5);assert.equal(await readMotionMark(),guideInitialMark);
    for(const [preset,fraction] of [['center',0],['rim',1],['middle',.5]]){await motion.locator('[data-debris-motion-preset="'+preset+'"]').click();await assertSteps(stepTimes[2],fraction);assert.equal(await readMotionMark(),guideInitialMark);}
    await materialPath.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));const guideBox=await pathSvg.boundingBox(),guidePixels=Math.min(guideBox.width/300,guideBox.height/240),guideLeft=guideBox.x+(guideBox.width-300*guidePixels)/2,guideTop=guideBox.y+(guideBox.height-240*guidePixels)/2,guideY=guideTop+120*guidePixels,guideX=f=>guideLeft+(pathBumper+(pathWall-pathBumper)*f)*guidePixels;
    if(width<500){const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:guideX(.25),y:guideY,id:0}]});assert.equal(await materialPath.getAttribute('data-dragging'),'true');await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:guideX(.625),y:guideY,id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}else{await page.mouse.move(guideX(.25),guideY);await page.mouse.down();assert.equal(await materialPath.getAttribute('data-dragging'),'true');await page.mouse.move(guideX(.625),guideY,{steps:5});await page.mouse.up();}assert.equal(await materialPath.getAttribute('data-dragging'),null);const guideScrubTime=await clockTime();assert(guideScrubTime>stepTimes[2]&&guideScrubTime<stepTimes[3]);await assertSteps(guideScrubTime,.5);assert.equal(await materialPath.locator('[data-debris-material-step-point][data-reached="true"]').count(),6);assert.equal(await motion.locator('[data-debris-material-step][aria-pressed="true"]').count(),0);assert.equal(await readMotionMark(),guideInitialMark);
    const beforeGuideToggle=await flightSnapshot();await stepsToggle.click();assert.equal(await stepsToggle.getAttribute('aria-expanded'),'false');assert.equal(await stepsPanel.isVisible(),false);assert.equal(await stepButtons.count(),0);assert.equal(await materialPath.locator('[data-debris-material-step-point]').count(),0);assert.deepEqual(await flightSnapshot(),beforeGuideToggle);assert.equal(await readMotionMark(),guideInitialMark);await stepsToggle.click();await velocityButton.click();assert.equal(await materialPath.count(),0);await pathButton.click();assert.equal(await stepsToggle.getAttribute('aria-expanded'),'true');assert.deepEqual(await flightSnapshot(),beforeGuideToggle);assert.equal(await readMotionMark(),guideInitialMark);await assertSteps(guideScrubTime,.5);
    await motion.locator('[data-debris-material-step="1"]').click();await markSave.click();const guideSavedMark=await readMotionMark();await motion.locator('[data-debris-material-step="3"]').click();assert.equal(await readMotionMark(),guideSavedMark);await assertSteps(stepTimes[3],.5);referenceStates.push(await assertMotionReference(stepTimes[1],stepTimes[3],.5));const guideA11y=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[data-debris-flight-inspector]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:r.passes.length,violations:r.violations.map(v=>v.id)};});assert.deepEqual(guideA11y.violations,[]);assert(await motion.evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});const guideClip=await flightInspector.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});await page.screenshot({path:path.join(output,'aperture-material-steps-'+width+'.png'),clip:guideClip,fullPage:true,animations:'disabled'});const beforeFinalGuideToggle=await flightSnapshot();await stepsToggle.click();assert.equal(await stepsToggle.getAttribute('aria-expanded'),'false');assert.deepEqual(await flightSnapshot(),beforeFinalGuideToggle);assert.equal(await readMotionMark(),guideSavedMark);
    const beforeClear=await flightSnapshot();await markClear.focus();await page.keyboard.press('Enter');assert.deepEqual(await flightSnapshot(),beforeClear);assert.equal(await motionReference.count(),0);assert.equal(await motionField.locator('[data-debris-motion-reference-cloud], [data-debris-motion-reference-point]').count(),0);assert.equal(await materialPath.locator('[data-debris-material-reference-cursor], [data-debris-material-reference-point], [data-debris-displacement]').count(),0);assert(await markReturn.isDisabled());assert(await markClear.isDisabled());await page.waitForFunction(()=>document.activeElement?.id==='iss-debris-motion-radius',null,{timeout:2000});await study.locator('[data-debris-aperture-event="cloud"]').click();assert.deepEqual(await flightSnapshot(),beforeSpeed);assert.equal(await motionRadius.inputValue(),'50');
    const pathA11y=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[data-debris-flight-inspector]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:r.passes.length,violations:r.violations.map(v=>v.id)};});assert.deepEqual(pathA11y.violations,[]);assert(await motion.evaluate(n=>n.scrollWidth<=n.clientWidth+1));await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});const pathClip=await flightInspector.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});await page.screenshot({path:path.join(output,'aperture-material-path-'+width+'.png'),clip:pathClip,fullPage:true,animations:'disabled'});
    await velocityButton.click();assert.equal(await materialPath.count(),0);assert.equal(await motionVector.count(),1);assert.equal(await velocityButton.getAttribute('aria-pressed'),'true');assert.deepEqual(await flightSnapshot(),beforeSpeed);
    await positionPanel.click();assert.equal(await side.count(),1);assert.equal(await speedPanel.count(),0);assert.equal(await budget.count(),0);assert.equal(await motion.count(),0);assert.deepEqual(await flightSnapshot(),beforeSpeed);assert.deepEqual(await predictionSnapshot(),speedPredictions);await contactView.click();
    await page.locator('[data-debris-pin]').click();await page.locator('[data-debris-preset="compact"]').click();await page.locator('[data-debris-detector-preset="outside"]').click();assert(await match.isDisabled());assert.match(await study.locator('#iss-debris-aperture-match-note').textContent(),/beyond/);
    const radius=page.locator('#iss-debris-detector-radius');await radius.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');assert.equal(await radius.inputValue(),'1');await study.locator('[data-debris-aperture-use="smaller"]').click();assert.equal(await radius.inputValue(),'0.5');assert.equal(await study.locator('[data-debris-aperture-option="smaller"]').count(),0);assert(await toggle.evaluate(n=>n===document.activeElement));
    await page.locator('#iss-debris-spread').focus();await page.keyboard.press('Home');assert.equal(await footprint.getAttribute('data-field'),'zero');assert.equal(await study.locator('[data-debris-aperture-maximum]').count(),0);assert((await study.locator('[data-debris-aperture-span]').allTextContents()).every(s=>s==='—'));await stage.focus();await page.keyboard.press('Home');assert((await study.locator('[data-debris-aperture-reading]').allTextContents()).every(s=>s==='0 J/cm²'));assert((await study.locator('[data-debris-aperture-coverage]').evaluateAll(ns=>ns.map(n=>Number(n.dataset.value)))).every(v=>v>0));
    const zeroBudgetState=await flightSnapshot();await balanceButton.click();assert.equal(await budget.locator('[data-debris-budget-focus="internal"]').getAttribute('aria-pressed'),'true');assert.equal(await budgetNumber('energy','radial'),0);const zeroRadial=budget.locator('[data-debris-budget-segment="radial"]');assert.equal(Number(await zeroRadial.getAttribute('data-fraction')),0);assert.equal(await zeroRadial.evaluate(n=>parseFloat(n.style.width)),0);assert((await zeroRadial.boundingBox()).width<.001);await budget.locator('[data-debris-budget-focus="radial"]').click();assert.equal(await budget.locator('[data-debris-budget-detail]').getAttribute('data-debris-budget-detail'),'radial');nearBudget(await budgetNumber('energy','total'),await budgetNumber('energy','incoming'));nearBudget((await budgetNumber('energy','forward'))+(await budgetNumber('energy','internal')),await budgetNumber('energy','incoming'));assert.deepEqual(await flightSnapshot(),zeroBudgetState);const zeroBudgetTextFit=await measureBudgetText();assertBudgetTextFits(zeroBudgetTextFit);await motionButton.click();assert.equal(await budget.count(),0);assert.equal(await motionRadius.inputValue(),'50');await motion.locator('[data-debris-motion-preset="rim"]').click();assert.equal(await motionReading('radial'),0);assert.equal(await motionReading('angle'),0);nearBudget(await motionReading('speed'),await motionReading('forward'));assert.equal(await motionVector.locator('[data-debris-motion-vector="radial"]').count(),0);assert.equal(await motion.locator('[data-debris-motion-radial]').count(),0);assert.equal(await motion.locator('[data-debris-motion-sample]').count(),2);assert.deepEqual(await flightSnapshot(),zeroBudgetState);
    await pathButton.click();assert.equal(await motionVector.count(),0);assert.equal(await materialPath.getAttribute('data-phase'),'contact');const zeroPathRadius=Number(await page.locator('#iss-debris-size').inputValue())/2000;for(const key of ['positive','negative']){const sign=key==='positive'?1:-1,values=(await materialPath.locator('[data-debris-material-track="'+key+'"]').getAttribute('d')).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);nearBudget(values[1],values[3]);nearBudget(Number(await materialPath.locator('[data-debris-material-landing="'+key+'"]').getAttribute('data-radius')),sign*zeroPathRadius);nearBudget(Number(await materialPath.locator('[data-debris-material-point="'+key+'"]').getAttribute('data-radius')),sign*zeroPathRadius);}assert.equal(await motion.locator('[data-debris-material-reading="remainingTime"]').getAttribute('data-value'),'0');assert.equal(await motion.locator('[data-debris-material-reading="remainingDistance"]').getAttribute('data-value'),'0');await motionField.focus();await page.keyboard.press('Home');assert.equal(await motionRadius.inputValue(),'0');assert.equal(await materialPath.locator('[data-debris-material-track="center"]').count(),1);await page.keyboard.press('End');assert.equal(await motionRadius.inputValue(),'100');assert.equal(await materialPath.locator('[data-debris-material-track]').count(),2);assert.deepEqual(await flightSnapshot(),zeroBudgetState);await motion.locator('[data-debris-motion-preset="middle"]').click();await velocityButton.click();await positionPanel.click();assert.equal(await motion.count(),0);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);results.push({width,markers,readings,areaReadings,footprint:{scale:mapInitial.scale,rimOffset,rings:mapInitial.rings,exactPresets:true,linkedControls:true,equalScale:true},flight:{radii:flightRadii,impact,arrival,linkedClock:true,predictionInvariance:true,side:{positions:sidePositions,scale:contactSide.scale,equalScale:true,pointerBranches:true,keyboard:true},speed:{expected:speedExpected,high:speedHigh,exactJump:true,linearTimeScrub:true,preservedPredictions:true,a11y:speedA11y},budget:{energy:budgetEnergy,fractions:budgetFractions,momentum:budgetMomentum,targets:budgetTargets,textFit:budgetTextFit,zeroTextFit:zeroBudgetTextFit,alignment:budgetAlignment,zeroSpread:true,preservedPredictions:true,a11y:budgetA11y},motion:{scale:motionScale,high:motionHigh,states:motionStates,directSelection:motionDrags,path:{scale:pathScale,states:pathStates,seeking:pathSeekStates,pointer:pathPointerStates,ruler:{meters:rulerMeters,pixels:rulerPixels,label:rulerLabel},pauseOnSeek:true,reference:{states:referenceStates,layout:referenceLayout,a11y:referenceA11y},steps:{times:stepTimes,states:guideStates,targets:stepTargets,a11y:guideA11y},a11y:pathA11y},zeroSpread:true,preservedPredictions:true,a11y:motionA11y}},a11y,overflow:false,errors,limitFocus:true,independentProbe:true});await page.close();console.log('Spatial map, flight panels, conserved budget, material vectors and shared clock passed at '+width+'px');
  }await fs.writeFile(path.join(output,'results.json'),JSON.stringify({ok:true,results},null,2));}finally{await browser.close();}
}

async function captureDebrisSideways(base,output){
  const {chromium}=require('playwright');await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch({headless:true}),results=[];
  try{
    for(const width of argument('--widths','1440,820,390').split(',').map(Number)){
      const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'/?tab=operations&mode=debris',{waitUntil:'load'});
      const lab=page.locator('[data-iss-debris-lab]'),detector=lab.locator('[data-debris-detector]'),scan=detector.locator('[data-debris-scan]');await detector.waitFor();
      await page.addScriptTag({path:path.join(ROOT,'desktop/web-app/node_modules/axe-core/axe.min.js')});
      const checkA11y=async()=>await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[data-debris-detector]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:r.passes.length,violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))};});
      const time=()=>page.evaluate(()=>window.__toolData.spaceStation.opsDebrisTime||0);
      const lateral=()=>detector.locator('[data-debris-detector-expansion="current"]').textContent();
      async function shot(name){await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});const clip=await detector.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});await page.screenshot({path:path.join(output,'sideways-'+name+'-'+width+'.png'),clip,fullPage:true,animations:'disabled'});}
      await lab.locator('[data-debris-preset="compact"]').click();await lab.locator('[data-debris-pin]').click();await lab.locator('[data-debris-preset="spaced"]').click();
      await lab.locator('[data-debris-event="cloud"]').click();const inspected=await time(),saved=await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline));
      await scan.locator('[data-debris-scan-metric="expansion"]').click();assert.equal(await detector.locator('[data-debris-motion-vector]').count(),16);
      const center=Number(await scan.locator('[data-debris-scan-point="current"]').getAttribute('data-value')),mass=await detector.locator('[data-debris-detector-mass="current"]').textContent(),forward=await detector.locator('[data-debris-detector-energy="current"]').textContent();
      const linearTop=await scan.locator('[data-debris-scan-point="current"]').evaluate(n=>parseFloat(n.style.top)),initialHigh=await scan.getAttribute('data-high');
      await scan.locator('[data-debris-scan-scale="softlog"]').click();assert.equal(await scan.getAttribute('data-scale'),'softlog');
      const compressedTop=await scan.locator('[data-debris-scan-point="current"]').evaluate(n=>parseFloat(n.style.top));assert(compressedTop<linearTop-15);
      assert.equal(Number(await scan.locator('[data-debris-scan-point="current"]').getAttribute('data-value')),center);assert.equal(await scan.getAttribute('data-high'),initialHigh);assert.equal(await time(),inspected);
      const ticks=await scan.locator('[data-debris-scan-tick]').evaluateAll(nodes=>nodes.map(n=>({value:Number(n.dataset.debrisScanTick),width:n.getBoundingClientRect().width,gutter:n.parentElement.getBoundingClientRect().width})));
      assert.equal(ticks[0].value,0);assert.equal(ticks.at(-1).value,Number(initialHigh));assert(ticks.every(t=>t.width<=t.gutter+1));
      assert(Number(await scan.locator('[data-debris-scan-difference]').getAttribute('data-debris-scan-difference'))<0);
      await scan.locator('[data-debris-scan-scale="linear"]').click();assert.equal(await scan.locator('[data-debris-scan-point="current"]').evaluate(n=>parseFloat(n.style.top)),linearTop);
      await scan.locator('[data-debris-scan-scale="softlog"]').click();
      await detector.locator('[data-debris-position-mark]').click();const mark=await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisPositionA));
      assert.equal(Number(await detector.locator('[data-debris-position-reading="a"]').getAttribute('data-value')),center);
      assert.equal(await detector.locator('[data-debris-position-reading="delta"]').textContent(),'0 J');assert.equal(await detector.locator('[data-debris-position-aperture]').count(),1);
      const tags=await detector.locator('.iss-debris-detector-stage .iss-debris-position-tag').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{top:r.top,bottom:r.bottom};}));assert(tags[0].bottom<tags[1].top);
      assert(await detector.locator('.iss-debris-aperture-key').evaluate(n=>getComputedStyle(n).color==='rgb(167, 206, 255)'));
      const chartTags=await scan.locator('.iss-debris-position-tag').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect(),svg=n.parentElement.querySelector('svg').getBoundingClientRect();return{bottom:b.bottom,plotTop:svg.top+svg.height*14/240};}));assert(chartTags.every(t=>t.bottom<=t.plotTop+1));
      await shot('center');await detector.locator('[data-debris-detector-preset="inner"]').click();
      const rim=Number(await scan.locator('[data-debris-scan-point="current"]').getAttribute('data-value'));
      assert(rim>center*5);assert.match(await scan.locator('[data-debris-scan-ratio]').textContent(),/Reference is zero/);assert.equal(await detector.locator('[data-debris-detector-mass="current"]').textContent(),mass);assert.equal(await detector.locator('[data-debris-detector-energy="current"]').textContent(),forward);
      assert.equal(await scan.locator('[data-debris-scan-reading="current"]').textContent(),await lateral());assert.equal(await time(),inspected);
      assert.equal(Number(await detector.locator('[data-debris-position-reading="a"]').getAttribute('data-value')),center);
      assert.equal(Number(await detector.locator('[data-debris-position-reading="b"]').getAttribute('data-value')),rim);
      assert.equal(Number(await detector.locator('[data-debris-position-reading="delta"]').getAttribute('data-value')),rim-center);await shot('rim');
      const peak=scan.locator('[data-debris-peak]'),maximum=Number(await peak.getAttribute('data-value')),maximumOffset=Number(await peak.getAttribute('data-offset'));
      assert.equal(await peak.getAttribute('data-debris-peak'),'peak');assert(maximum>rim*1.02);assert(maximumOffset*1000>Number(await detector.locator('#iss-debris-detector-offset').inputValue()));
      await scan.locator('[data-debris-peak-inspect]').click();assert(Math.abs(Number(await detector.locator('#iss-debris-detector-offset').inputValue())-maximumOffset*1000)<1e-10);assert.equal(await page.evaluate(()=>window.__toolData.spaceStation.opsDebrisDetectorOffset),maximumOffset*1000);
      assert(Math.abs(Number(await scan.locator('[data-debris-scan-point="current"]').getAttribute('data-value'))/maximum-1)<1e-12);
      assert.equal(await time(),inspected);assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisPositionA)),mark);await shot('maximum');
      const halfPanel=scan.locator('[data-debris-half]'),half=await halfPanel.evaluate(n=>({value:Number(n.dataset.value),from:Number(n.dataset.from),to:Number(n.dataset.to),span:Number(n.dataset.span)}));
      assert.equal(half.value,maximum/2);assert(half.from>0&&half.from<maximumOffset&&half.to>maximumOffset);assert.equal(half.span,half.to-half.from);
      const line=scan.locator('[data-debris-half-range] line'),halfY=Number(await line.getAttribute('y1'));assert(Math.abs(halfY-(222-208*Math.log1p(1000*half.value/Number(initialHigh))/Math.log1p(1000)))<1e-10);
      for(const edge of ['inner','outer']){await scan.locator('[data-debris-half-inspect="'+edge+'"]').click();assert.equal(await page.evaluate(()=>window.__toolData.spaceStation.opsDebrisDetectorOffset),half[edge==='inner'?'from':'to']*1000);assert(Math.abs(Number(await scan.locator('[data-debris-scan-point="current"]').getAttribute('data-value'))/half.value-1)<1e-8);}
      assert.equal(await time(),inspected);assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisPositionA)),mark);assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),saved);
      await shot('half-maximum');await scan.locator('[data-debris-scan-scale="linear"]').click();assert.equal(Number(await line.getAttribute('y1')),222-208*half.value/Number(initialHigh));assert.equal(Number(await halfPanel.getAttribute('data-from')),half.from);
      await scan.locator('[data-debris-scan-scale="softlog"]').click();
      const positionA11y=await checkA11y();assert.deepEqual(positionA11y.violations,[]);
      const stage=scan.locator('[data-debris-scan-stage]'),high=await scan.getAttribute('data-high');await stage.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));
      const box=await stage.locator('svg').boundingBox(),max=Number(await stage.getAttribute('aria-valuemax')),x=mm=>box.x+(12+mm/max*576)/600*box.width,y=box.y+box.height/2;
      if(width<500){const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x(10),y,id:0}]});for(const mm of [15,20,25])await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x(mm),y,id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
      else{await page.mouse.move(x(10),y);await page.mouse.down();await page.mouse.move(x(25),y,{steps:5});await page.mouse.up();}
      assert.equal(await detector.locator('#iss-debris-detector-offset').inputValue(),'25');assert.equal(await stage.getAttribute('data-dragging'),null);assert.equal(await scan.getAttribute('data-high'),high);
      assert.equal(await scan.locator('[data-debris-scan-reading="current"]').textContent(),await lateral());assert.equal(await time(),inspected);
      await stage.focus();await page.keyboard.press('ArrowRight');assert.equal(await detector.locator('#iss-debris-detector-offset').inputValue(),'25.5');await page.keyboard.press('End');assert.equal(await lateral(),'0 J');assert.equal(await detector.locator('[data-debris-detector-rms="current"]').textContent(),'—');
      assert.equal(await scan.locator('[data-debris-scan-delta]').textContent(),'0 J');assert.equal(await scan.locator('[data-debris-scan-ratio]').textContent(),'Both readings are zero here.');
      await page.keyboard.press('Home');assert.equal(await scan.locator('[data-debris-scan-point="current"]').getAttribute('data-value'),String(center));
      await detector.locator('[data-debris-position-return]').click();assert.equal(await detector.locator('#iss-debris-detector-offset').inputValue(),'0');
      await detector.locator('[data-debris-position-clear]').click();assert.equal(await detector.locator('[data-debris-position-aperture]').count(),0);assert(await detector.locator('[data-debris-position-mark]').evaluate(n=>n===document.activeElement));
      await detector.locator('[data-debris-position-mark]').click();
      await lab.locator('[data-debris-compare]').click();assert.equal(await scan.getAttribute('data-high'),high);assert.equal(await scan.locator('[data-debris-scan-difference]').count(),0);assert.equal(await detector.locator('[data-debris-position-reading="a"]').count(),1);assert.equal(await scan.getAttribute('data-scale'),'softlog');await lab.locator('[data-debris-compare]').click();
      await scan.locator('[data-debris-scan-metric="mass"]').click();assert.equal(await detector.locator('[data-debris-velocity-field]').count(),0);
      assert.equal(await peak.getAttribute('data-debris-peak'),'plateau');assert.equal(await scan.locator('[data-debris-peak-range]').count(),1);await scan.locator('[data-debris-peak-inspect]').click();assert.equal(await detector.locator('#iss-debris-detector-offset').inputValue(),'0');
      assert.equal(await scan.locator('[data-debris-half-inspect="inner"]').textContent(),'Inspect center');assert.equal(Number(await halfPanel.getAttribute('data-from')),0);await scan.locator('[data-debris-half-inspect="outer"]').click();assert(Math.abs(Number(await scan.locator('[data-debris-scan-point="current"]').getAttribute('data-value'))/Number(await halfPanel.getAttribute('data-value'))-1)<1e-8);await scan.locator('[data-debris-half-inspect="inner"]').click();
      await scan.locator('[data-debris-scan-metric="expansion"]').click();assert.equal(await detector.locator('[data-debris-motion-vector]').count(),16);
      assert.equal(await time(),inspected);assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),saved);assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisPositionA)),mark);
      await lab.locator('#iss-debris-spread').focus();await page.keyboard.press('Home');assert.equal(await detector.locator('[data-debris-velocity-field]').count(),0);assert.equal(await scan.getAttribute('data-empty'),'false');assert.equal(await detector.locator('[data-debris-position-aperture]').count(),0);assert.match(await detector.locator('[data-debris-position-notice]').textContent(),/setup or aperture size changed/);assert.equal(await peak.getAttribute('data-debris-peak'),'zero');assert(await scan.locator('[data-debris-peak-inspect]').isDisabled());assert.equal(await scan.locator('[data-debris-peak-point]').count(),0);
      assert.equal(await halfPanel.getAttribute('data-empty'),'true');assert.equal(await scan.locator('[data-debris-half-range]').count(),0);assert.equal(await scan.locator('[data-debris-half-inspect]').count(),0);
      await lab.locator('[data-debris-pin]').click();assert.equal(await scan.getAttribute('data-empty'),'true');assert.equal(await lateral(),'0 J');assert.equal(await detector.locator('[data-debris-detector-rms="current"]').textContent(),'0 km/s');await shot('zero');
      await lab.locator('[data-debris-preset="compact"]').click();await lab.locator('[data-debris-pin]').click();await lab.locator('[data-debris-preset="spaced"]').click();await detector.locator('[data-debris-detector-preset="inner"]').click();await shot('ready');
      for(const [id,key] of [['iss-debris-size','Home'],['iss-debris-bumper','End'],['iss-debris-spread','End'],['iss-shield-gap','End'],['iss-debris-detector-radius','Home']]){await lab.locator('#'+id).focus();await page.keyboard.press(key);}
      await lab.locator('[data-debris-pin]').click();await detector.locator('[data-debris-detector-preset="center"]').click();
      const scientificTicks=await scan.locator('[data-debris-scan-tick]').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,width:n.getBoundingClientRect().width,gutter:n.parentElement.getBoundingClientRect().width})));
      assert(scientificTicks.some(t=>t.text.includes('e-')));assert(scientificTicks.every(t=>t.width<=t.gutter+1));
      assert.equal(await scan.locator('[data-debris-scan-delta]').textContent(),'0 J');assert.equal(Number(await scan.locator('[data-debris-scan-ratio]').getAttribute('data-debris-scan-ratio')),1);
      await shot('tiny');
      await lab.locator('[data-debris-preset="compact"]').click();await lab.locator('[data-debris-pin]').click();await lab.locator('[data-debris-preset="spaced"]').click();
      await detector.locator('#iss-debris-detector-radius').focus();await page.keyboard.press('Home');for(let i=0;i<19;i++)await page.keyboard.press('ArrowRight');
      await detector.locator('[data-debris-detector-preset="center"]').click();await detector.locator('[data-debris-position-mark]').click();await lab.locator('[data-debris-event="cloud"]').click();
      const study=detector.locator('[data-debris-aperture-study]'),toggle=study.locator('[data-debris-aperture-toggle]'),studyTime=await time(),studySaved=await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline));
      assert.equal(await study.locator('[data-debris-aperture-chart]').count(),0);await toggle.focus();await page.keyboard.press('Enter');assert.equal(await toggle.getAttribute('aria-expanded'),'true');
      const sizes=await study.locator('[data-debris-aperture-option]').evaluateAll(ns=>ns.map(n=>({kind:n.dataset.debrisApertureOption,radius:Number(n.dataset.radius),peak:Number(n.querySelector('[data-debris-aperture-peak]').dataset.value),span:Number(n.querySelector('[data-debris-aperture-span]').dataset.value)})));
      assert.deepEqual(sizes.map(s=>s.radius),[.005,.01,.02]);assert(sizes[0].peak<sizes[1].peak&&sizes[1].peak<sizes[2].peak);assert(await study.locator('[data-debris-aperture-use="current"]').isDisabled());
      const studyPaths=await study.locator('[data-debris-aperture-curve]').evaluateAll(ns=>ns.map(n=>n.getAttribute('d')));assert(studyPaths.every(d=>!d.match(/NaN|Infinity/)));await lab.locator('[data-debris-compare]').click();assert.deepEqual(await study.locator('[data-debris-aperture-curve]').evaluateAll(ns=>ns.map(n=>n.getAttribute('d'))),studyPaths);await lab.locator('[data-debris-compare]').click();
      const studyA11y=await checkA11y();assert.deepEqual(studyA11y.violations,[]);await study.screenshot({path:path.join(output,'aperture-sizes-'+width+'.png'),animations:'disabled'});
      await study.locator('[data-debris-aperture-use="smaller"]').focus();await page.keyboard.press('Enter');assert.equal(await detector.locator('#iss-debris-detector-radius').inputValue(),'5');assert.equal(await detector.locator('[data-debris-position-aperture]').count(),0);assert.match(await detector.locator('[data-debris-position-notice]').textContent(),/setup or aperture size changed/);assert.equal(await time(),studyTime);assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),studySaved);
      await scan.locator('[data-debris-scan-metric="mass"]').click();assert.match(await study.locator('[data-debris-aperture-peak="current"]').textContent(),/mg/);await scan.locator('[data-debris-scan-metric="expansion"]').click();
      await detector.locator('#iss-debris-detector-radius').focus();await page.keyboard.press('Home');assert.equal(await study.locator('[data-debris-aperture-option]').count(),2);await page.keyboard.press('End');assert.equal(await study.locator('[data-debris-aperture-option]').count(),2);assert.equal(await study.locator('[data-debris-aperture-option="larger"]').count(),0);
      await lab.locator('#iss-debris-spread').focus();await page.keyboard.press('Home');assert((await study.locator('[data-debris-aperture-span]').allTextContents()).every(s=>s==='—'));assert((await study.locator('[data-debris-aperture-peak]').allTextContents()).every(s=>s==='0 J'));
      await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await study.locator('[data-debris-aperture-chart]').count(),0);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);

      const a11y=await checkA11y();assert.deepEqual(a11y.violations,[]);
      results.push({width,center,rim,maximum,maximumOffset,half,sizes,studyA11y,energyRatio:rim/center,linearTop,compressedTop,ticks,scientificTicks,overflow:false,errors,positionA11y,a11y});console.log('Aperture sizes, shared axes, half-maximum edges, A/B and pointer/touch passed at '+width+'px');await page.close();
    }
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({ok:true,results},null,2));console.log(JSON.stringify({ok:true,output,checks:results.length}));
  }finally{await browser.close();}
}

async function capture(base, output) {
  if(args.includes('--aperture-study-only'))return captureApertureStudy(base,output);
  if(args.includes('--debris-sideways-only'))return captureDebrisSideways(base,output);
  const accessibilityOnly = args.includes('--accessibility-only');
  const orbitLabs = argument('--orbit-labs', 'transfer,drag').split(',');
  const missionLabs = argument('--mission-labs', 'docking,eva').split(',');
  const operationLabs = argument('--operation-labs', 'power,thermal,attitude,air,water,pressure,debris').split(',');
  const captureTabs = argument('--tabs', 'map,interior,orbit,missions').split(',');
  const { chromium } = require('playwright');
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    args: captureTabs.some(tab => tab === 'map' || tab === 'interior') ? ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [] });
  const results = [];
  try {
    const widths = argument('--widths', '1440,390').split(',').map(Number);
    const tabs = captureTabs;
    for (const width of widths) {
      const viewport = { width, height: width < 500 ? 844 : 1080 };
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1,
        isMobile: viewport.width < 500, hasTouch: viewport.width < 500, reducedMotion: 'reduce' });
      page.setDefaultTimeout(60000);
      const errors = [];
      page.on('pageerror', (error) => {
        const detail = error.stack || error.message;
        errors.push(detail);
        console.error(`Browser error at ${viewport.width}px: ${detail}`);
      });
      for (const tab of tabs) {
        console.log(`Checking ${tab} at ${viewport.width}px`);
        await page.goto(`${base}/?tab=${tab}`, { waitUntil: 'load' });
        await page.locator('.iss-root').waitFor();
        if (tab === 'map' || tab === 'interior') {
          await page.waitForFunction(() => {
            const canvas = document.querySelector('#wrap canvas');
            return canvas && (canvas._issInit || canvas.getAttribute('data-iss-webgl') === 'ready');
          }, null, { timeout: 45000 });
        }
        await page.waitForTimeout(700);
        const layout = await page.evaluate(() => ({
          width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
          selected: document.querySelector('[role="tab"][aria-selected="true"]')?.id,
          canvases: document.querySelectorAll('canvas').length,
          heading: document.querySelector('.iss-title')?.textContent,
        }));
        assert(layout.scrollWidth <= viewport.width + 1, `${tab} overflows at ${viewport.width}px: ${layout.scrollWidth}px`);
        assert.equal(layout.selected, `iss-tab-${tab}`);
        const filename = `${tab}-${viewport.width}.png`;
        let dockingInspector = null;
        if (!accessibilityOnly) await page.screenshot({ path: path.join(output, filename), fullPage: true });
        if (tab === 'map' && !accessibilityOnly) {
          const canvas = page.locator('canvas').first();
          await canvas.screenshot({ path: path.join(output, `map-canvas-${viewport.width}.png`) });
          const before = await canvas.screenshot();
          const box = await canvas.boundingBox();
          await page.mouse.move(box.x + box.width * .45, box.y + box.height * .55);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width * .70, box.y + box.height * .42, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(250);
          assert.notEqual(Buffer.compare(before, await canvas.screenshot()), 0, 'Map drag should change rendered station view');
          await page.locator('#iss-tab-map').focus();
          await page.keyboard.press('End');
          assert.equal(await page.locator('#iss-tab-quiz').getAttribute('aria-selected'), 'true', 'End should select final tab');
          await page.keyboard.press('Home');
          assert.equal(await page.locator('#iss-tab-map').getAttribute('aria-selected'), 'true', 'Home should select first tab');
        }
        if (tab === 'interior' && !accessibilityOnly) {
          await page.locator('[data-iss-interior-canvas]').screenshot({ path: path.join(output, `interior-canvas-${viewport.width}.png`) });
          await page.locator('.iss-route-button').nth(2).click();
          await page.waitForFunction(() => document.querySelector('[data-iss-interior-canvas]')?._issInteriorState?.room === 'unity');
          await page.locator('[data-iss-interior-view="diagram"]').click();
          assert.equal(await page.locator('[data-iss-interior-canvas]').count(), 0);
          await page.locator('[data-iss-interior-view="3d"]').click();
          await page.waitForFunction(() => document.querySelector('[data-iss-interior-canvas]')?._issInteriorState?.room === 'unity');
          if (await page.locator('[data-iss-momentum-bench]').count()) {
            const bench = page.locator('[data-iss-momentum-bench]');
            const benchBounds = await bench.boundingBox();
            assert(benchBounds.x >= 0 && benchBounds.x + benchBounds.width <= viewport.width + 1, 'Momentum bench must fit inside the viewport, including its grid column');
            const trackBounds = await bench.locator('.iss-momentum-stage svg').boundingBox();
            assert(trackBounds.x >= 0 && trackBounds.x + trackBounds.width <= viewport.width + 1, 'The entire motion track must remain visible during playback');
            const mass = page.locator('#iss-momentum-mass');
            const initialMass = Number(await mass.inputValue());
            await mass.focus();
            await page.keyboard.press('ArrowRight');
            assert.equal(Number(await mass.inputValue()), initialMass + 5, 'Keyboard should change experiment mass');
            const initialMomentum = await bench.locator('.iss-flight-reading strong').nth(0).textContent();
            await page.locator('[data-iss-momentum-contact]').click();
            assert.equal(await page.locator('[data-iss-momentum-phase]').getAttribute('data-iss-momentum-phase'), 'contact');
            assert.equal(await bench.locator('.iss-flight-reading strong').nth(0).textContent(), initialMomentum, 'Catching cargo should conserve total momentum');
            const catchHeat = parseFloat(await bench.locator('.iss-flight-reading strong').nth(2).textContent());
            assert(catchHeat > 0, 'An inelastic catch should dissipate kinetic energy');
            await page.locator('[data-iss-momentum-mode="elastic"]').click();
            await page.locator('[data-iss-momentum-contact]').click();
            assert.equal(parseFloat(await bench.locator('.iss-flight-reading strong').nth(2).textContent()), 0, 'Ideal elastic contact should conserve kinetic energy');
            await page.locator('[data-iss-momentum-mode="cushioned"]').click();
            const restitution = page.locator('#iss-momentum-restitution');
            assert.equal(Number(await restitution.inputValue()), 0.5, 'A cushioned bounce should begin at half relative rebound speed');
            assert.equal(await bench.locator('[data-iss-momentum-report]').getAttribute('data-iss-momentum-report'), 'predicted');
            await page.locator('[data-iss-momentum-contact]').click();
            const partialHeat = parseFloat(await bench.locator('.iss-flight-reading strong').nth(2).textContent());
            assert(Math.abs(partialHeat - catchHeat * 0.75) < 0.001, 'Half rebound speed should dissipate 75% of the energy lost in a catch');
            assert.equal(await bench.locator('.iss-flight-reading strong').nth(0).textContent(), initialMomentum, 'A partial rebound must conserve the same signed momentum');
            const crewImpulse = parseFloat(await bench.locator('[data-iss-momentum-crew-impulse] strong').textContent());
            const cargoImpulse = parseFloat(await bench.locator('[data-iss-momentum-cargo-impulse] strong').textContent());
            assert(crewImpulse < 0 && cargoImpulse > 0 && crewImpulse + cargoImpulse === 0, 'Contact report must show equal opposite impulses');
            assert.equal(await bench.locator('[data-iss-momentum-report]').getAttribute('data-iss-momentum-report'), 'measured');
            await page.locator('[data-iss-momentum-before]').click();
            assert.equal(await page.locator('[data-iss-momentum-phase]').getAttribute('data-iss-momentum-phase'), 'coast');
            assert.equal(parseFloat(await bench.locator('.iss-flight-reading strong').nth(2).textContent()), 0, 'Seeking before contact must restore undissipated energy');
            const centerBefore = Number(await bench.locator('[data-iss-momentum-center]').getAttribute('data-iss-momentum-center'));
            await page.locator('[data-iss-momentum-after]').click();
            assert.equal(await page.locator('[data-iss-momentum-phase]').getAttribute('data-iss-momentum-phase'), 'contact');
            assert(Number(await bench.locator('[data-iss-momentum-center]').getAttribute('data-iss-momentum-center')) > centerBefore, 'Center of mass must continue coasting after contact');
            await bench.getByRole('button', { name: 'Reset time', exact: true }).click();
            const momentumPlay = bench.locator('[data-iss-playback-toggle="momentum"]');
            await momentumPlay.click();
            await page.waitForFunction(() => Number(document.querySelector('#iss-momentum-time').value) > 0.1);
            await momentumPlay.click();
            const pausedTime = await page.locator('#iss-momentum-time').inputValue();
            await page.waitForTimeout(250);
            assert.equal(await page.locator('#iss-momentum-time').inputValue(), pausedTime, 'Pause must hold the experiment time');
            await momentumPlay.click();
            await mass.focus();
            await page.keyboard.press('ArrowRight');
            await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="momentum"]').getAttribute('aria-pressed') === 'false');
            assert.equal(Number(await mass.inputValue()), initialMass + 10, 'Mass should remain adjustable during playback');
            assert.equal(await momentumPlay.getAttribute('aria-pressed'), 'false', 'Changing a mass must pause playback');
            assert.equal(Number(await page.locator('#iss-momentum-time').inputValue()), 0, 'Changing the setup must restart the experiment timeline');
            await momentumPlay.click();
            await page.waitForFunction(() => Number(document.querySelector('#iss-momentum-time').value) > 0.1);
            await restitution.focus();
            await page.keyboard.press('ArrowRight');
            assert.equal(Number(await restitution.inputValue()), 0.55, 'Rebound ratio must be adjustable by keyboard');
            await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="momentum"]').getAttribute('aria-pressed') === 'false');
            assert.equal(await momentumPlay.getAttribute('aria-pressed'), 'false', 'Changing rebound must pause playback');
            assert.equal(Number(await page.locator('#iss-momentum-time').inputValue()), 0, 'Changing rebound must reset the trial');
            await page.waitForTimeout(250);
            assert.equal(Number(await page.locator('#iss-momentum-time').inputValue()), 0, 'The reset clock must remain stopped after a rebound change');
            await page.locator('[data-iss-momentum-after]').click();
            await bench.screenshot({ path: path.join(output, `momentum-${viewport.width}.png`) });
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
            assert.equal(overflow, false, 'Momentum experiment should fit the viewport');
            await mass.focus();
            await page.keyboard.press('End');
            await page.locator('#iss-momentum-impulse').focus();
            await page.keyboard.press('Home');
            await page.locator('#iss-momentum-drift').focus();
            await page.keyboard.press('End');
            assert.equal(await bench.locator('[data-iss-momentum-report]').getAttribute('data-iss-momentum-report'), 'unreachable');
            assert.equal(await page.locator('[data-iss-momentum-contact]').isDisabled(), true, 'Receding cargo must not offer an invented contact');
            assert.equal(await page.locator('[data-iss-momentum-before]').isDisabled(), true);
            assert.equal(await page.locator('[data-iss-momentum-after]').isDisabled(), true);
            await mass.focus();
            await page.keyboard.press('Home');
            await page.locator('#iss-momentum-impulse').focus();
            await page.keyboard.press('End');
            await page.locator('[data-iss-momentum-contact]').click();
            if (viewport.width < 620) {
              const trajectory = page.locator('[data-iss-lowg-trajectory]');
              await trajectory.focus();
              await page.keyboard.press('ArrowRight');
              await page.waitForFunction(() => document.querySelector('[data-iss-lowg-trajectory]').scrollLeft > 0);
              assert.equal(await trajectory.evaluate(node => document.activeElement === node), true, 'The Unity trajectory diagram must be keyboard scrollable');
            }
          }
        }
        if (tab === 'orbit' && !accessibilityOnly && orbitLabs.includes('transfer')) {
          const transferBounds = await page.locator('.iss-transfer-visual svg').boundingBox();
          assert(transferBounds.x >= 0 && transferBounds.x + transferBounds.width <= viewport.width + 1, 'The complete transfer diagram must fit inside the viewport');
          await page.locator('[data-iss-transfer-action="inject"]').click();
          assert.equal(await page.locator('[data-iss-transfer-stage]').getAttribute('data-iss-transfer-stage'), '1');
          const transferPlay = page.locator('[data-iss-playback-toggle="transfer"]');
          await page.locator('[data-iss-playback-speed="transfer"]').selectOption('300');
          await transferPlay.click();
          await page.waitForFunction(() => Number(document.querySelector('#iss-transfer-time').value) > 0);
          await transferPlay.click();
          const coastPaused = await page.locator('#iss-transfer-time').inputValue();
          await page.waitForTimeout(250);
          assert.equal(await page.locator('#iss-transfer-time').inputValue(), coastPaused, 'Orbital playback must pause without drifting');
          const timeSlider = page.locator('#iss-transfer-time');
          const profile = page.locator('[data-iss-transfer-profile="altitude"]');
          await profile.scrollIntoViewIfNeeded();
          const profileBounds = await profile.boundingBox();
          assert(profileBounds.x >= 0 && profileBounds.x + profileBounds.width <= viewport.width + 1, 'Flight profile must fit the viewport');
          await transferPlay.click();
          await profile.scrollIntoViewIfNeeded();
          const dragBounds = await profile.boundingBox();
          const profileX = fraction => dragBounds.x + dragBounds.width * (8 + fraction * 584) / 600;
          if (viewport.width < 500) {
            await page.touchscreen.tap(profileX(.5), dragBounds.y + dragBounds.height / 2);
          } else {
            await page.mouse.move(profileX(.25), dragBounds.y + dragBounds.height / 2);
            await page.mouse.down();
            await page.mouse.move(profileX(.5), dragBounds.y + dragBounds.height / 2, { steps: 8 });
            await page.mouse.up();
          }
          assert(Math.abs(Number(await timeSlider.inputValue()) - 500) <= 2, 'Profile inspection must seek by elapsed time');
          assert.equal(await transferPlay.getAttribute('aria-pressed'), 'false', 'Inspecting the profile must pause playback');
          const inspected = await timeSlider.inputValue();
          await page.waitForTimeout(250);
          assert.equal(await timeSlider.inputValue(), inspected, 'The inspected state must remain paused');
          await timeSlider.focus();
          await page.keyboard.press('ArrowRight');
          assert.equal(Number(await timeSlider.inputValue()), Number(inspected) + 1, 'The keyboard time slider must inspect the same flight');
          const inspectedKeyboard = await timeSlider.inputValue();
          const velocity = page.locator('[data-iss-transfer-vector="velocity"]');
          assert.equal(await velocity.count(), 1);
          await page.locator('[data-iss-transfer-overlay="vectors"]').click();
          assert.equal(await velocity.count(), 0);
          await page.locator('[data-iss-transfer-overlay="vectors"]').click();
          await page.locator('[data-iss-transfer-overlay="marks"]').click();
          assert.equal(await page.locator('[data-iss-transfer-time-marks]').count(), 0);
          await page.locator('[data-iss-transfer-overlay="marks"]').click();
          assert.equal(await page.locator('[data-iss-transfer-time-marks] circle').count(), 9);
          assert.equal(await timeSlider.inputValue(), inspectedKeyboard, 'Diagram overlays must not alter elapsed time');
          assert(parseFloat(await page.locator('[data-iss-transfer-reading="radial"] strong').textContent()) > 0, 'A raising coast must show outward radial speed');
          await page.locator('[data-iss-transfer-stage]').screenshot({ path: path.join(output, `transfer-profile-${viewport.width}.png`) });
          await page.locator('[data-iss-transfer-action="coast"]').click();
          assert(Number(await page.locator('#iss-transfer-time').inputValue()) > 0, 'Coast should advance elapsed transfer time');
          await page.locator('[data-iss-transfer-action="arrive"]').click();
          assert.equal(await page.locator('#iss-transfer-time').inputValue(), '1000');
          await page.locator('[data-iss-transfer-action="circularize"]').click();
          assert.equal(await page.locator('[data-iss-transfer-stage]').getAttribute('data-iss-transfer-stage'), '2');
          await page.locator('[data-iss-transfer-stage]').screenshot({ path: path.join(output, `transfer-${viewport.width}.png`) });
          await page.getByRole('button', { name: 'Lower 100 km', exact: true }).click();
          await page.locator('[data-iss-transfer-action="inject"]').click();
          await timeSlider.focus();
          await page.keyboard.press('End');
          await page.keyboard.press('Home');
          assert.equal(await timeSlider.inputValue(), '0');
          await page.locator('[data-iss-transfer-action="coast"]').click();
          assert.match(await page.locator('[data-iss-transfer-reading="radial"] strong').textContent(), /^−/, 'A lowering coast must show inward radial speed');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Flight instruments must not create horizontal overflow');
          if (viewport.width < 500) {
            for (const selector of ['.iss-orbit-visual', '[data-iss-ground-track]']) {
              await page.locator(selector).focus();
              await page.keyboard.press('ArrowRight');
              await page.waitForFunction(selector => document.querySelector(selector).scrollLeft > 0, selector);
            }
          }
        }
        if (tab === 'orbit' && !accessibilityOnly && orbitLabs.includes('drag')) {
          const dragLab = page.locator('#iss-drag-lab');
          const dragDay = page.locator('#iss-drag-day');
          const dragPlay = page.locator('[data-iss-playback-toggle="drag"]');
          const dragAction = name => page.locator('[data-iss-drag-action="' + name + '"]');
          const dragReading = async name => parseFloat(await page.locator('[data-iss-drag-reading="' + name + '"] strong').textContent());
          await dragAction('before').click();
          assert.equal(await dragDay.inputValue(), '20');
          assert.equal(await dragReading('fuel'), 0);
          const beforeRaise = await dragReading('altitude');
          await dragAction('after').click();
          assert.equal(await dragDay.inputValue(), '20');
          assert(Math.abs(await dragReading('altitude') - beforeRaise - 5) < .001, 'Before/after must inspect the exact reboost discontinuity');
          assert(await dragReading('fuel') > 0, 'Completed burns must account for propellant');
          await page.locator('[data-iss-drag-reference-toggle]').click();
          assert.equal(await page.locator('[data-iss-drag-reference]').count(), 0);
          assert.equal(await dragDay.inputValue(), '20', 'The comparison overlay must not change time');
          await page.locator('[data-iss-drag-reference-toggle]').click();
          await dragAction('reset').click();
          await page.locator('[data-iss-playback-speed="drag"]').selectOption('432000');
          await dragPlay.click();
          await page.waitForFunction(() => Number(document.querySelector('#iss-drag-day').value) > 0);
          const dragPlot = page.locator('[data-iss-drag-plot]');
          await dragPlot.scrollIntoViewIfNeeded();
          const plotBounds = await dragPlot.boundingBox();
          assert(plotBounds.x >= 0 && plotBounds.x + plotBounds.width <= viewport.width + 1, 'The drag chart must fit the viewport');
          if (viewport.width < 500) {
            await page.touchscreen.tap(plotBounds.x + plotBounds.width / 2, plotBounds.y + plotBounds.height / 2);
          } else {
            await page.mouse.move(plotBounds.x + plotBounds.width / 4, plotBounds.y + plotBounds.height / 2);
            await page.mouse.down();
            await page.mouse.move(plotBounds.x + plotBounds.width / 2, plotBounds.y + plotBounds.height / 2, { steps: 8 });
            await page.mouse.up();
          }
          assert(Math.abs(Number(await dragDay.inputValue()) - 15) < .1, 'Pointer inspection must use the plotted time scale');
          if (viewport.width >= 500) assert.equal(await page.evaluate(() => String(window.getSelection())), '', 'Graph inspection must not select page text');
          assert.equal(await dragPlay.getAttribute('aria-pressed'), 'false');
          const dayInspected = Number(await dragDay.inputValue());
          await dragDay.focus();
          await page.keyboard.press('ArrowRight');
          assert(Number(await dragDay.inputValue()) > dayInspected, 'Keyboard inspection must advance the drag lab');
          for (const selector of ['#iss-drag-mass', '#iss-drag-gain']) {
            await dragPlay.click();
            await page.locator(selector).focus();
            await page.keyboard.press('End');
            // The parent resets time first; wait for the child's pause effect.
            await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="drag"]').getAttribute('aria-pressed') === 'false');
            assert.equal(await dragDay.inputValue(), '0', 'A changed setup must reset the drag experiment');
            assert.equal(await dragPlay.getAttribute('aria-pressed'), 'false', 'A changed setup must pause drag playback');
            assert.equal(await dragReading('fuel'), 0);
          }
          await dragAction('after').click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          await dragLab.screenshot({ path: path.join(output, `drag-lab-${viewport.width}.png`) });
          await page.locator('[data-iss-reboost-plan="0"]').click();
          assert.equal(await dragAction('before').isDisabled(), true);
          assert.equal(await dragAction('after').isDisabled(), true);
          assert.equal(await page.locator('#iss-drag-gain').isDisabled(), true);
          await page.locator('[data-iss-reboost-plan="20"]').click();
          await page.locator('#iss-orbit-alt').focus();
          await page.keyboard.press('Home');
          await page.locator('[data-iss-solar-mode="high"]').click();
          await page.locator('#iss-drag-frontal-area').focus();
          await page.keyboard.press('End');
          await page.locator('#iss-drag-mass').focus();
          await page.keyboard.press('Home');
          assert(Number(await dragDay.getAttribute('max')) < 20, 'The time control must end before an unreachable burn');
          await dragAction('end').click();
          assert.equal(await dragReading('altitude'), 180);
          assert.equal(await dragReading('fuel'), 0);
          assert.equal(await dragAction('after').isDisabled(), true);
          assert.equal(await dragPlay.isDisabled(), true);
          assert.match(await dragLab.textContent(), /Model limit reached/);
          await dragLab.screenshot({ path: path.join(output, `drag-limit-${viewport.width}.png`) });
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('power')) {
          console.log('Checking the finite-capacity power lab at ' + viewport.width + 'px');
          await page.locator('[data-flight-rule="power"]').click();
          const lab = page.locator('[data-iss-power-lab]');
          const clock = lab.locator('#iss-power-time');
          const playing = lab.locator('[data-iss-playback-toggle="power"]');
          const reading = name => lab.locator('[data-power-reading="' + name + '"]').textContent();
          const time = () => page.evaluate(() => window.__toolData.spaceStation.opsOrbitMinute || 0);
          const event = id => lab.locator('[data-power-event="' + id + '"]').click();
          async function capturePower(name) {
            await lab.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'start', behavior: 'instant' }); });
            const clip = await lab.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
            await page.screenshot({ path: path.join(output, 'power-' + name + '-' + viewport.width + '.png'), fullPage: true, clip, animations: 'disabled' });
          }
          await lab.locator('[data-power-preset="balanced"]').click();
          await event('full');
          assert.match(await reading('stored'), /210.0 kWh/);
          assert.match(await reading('battery-flow'), /0.0 kW/);
          const fullTime = await time();
          assert(fullTime > 0 && fullTime < 57);
          await capturePower('full');
          await event('eclipse');
          assert.equal(await time(), 57);
          assert.equal(await lab.locator('[data-power-phase]').getAttribute('data-power-phase'), 'eclipse');
          assert.match(await reading('solar'), /0.0 kW/);
          assert.match(await reading('battery-flow'), /Out of the battery.*92.4 kW/);
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute > 57.3);
          assert.equal(await playing.getAttribute('aria-pressed'), 'true');
          await playing.click();
          const paused = await time();
          await lab.locator('[data-power-reference]').click();
          assert.equal(await time(), paused);
          assert.equal(await lab.locator('[data-power-reference-path]').count(), 0);
          await lab.locator('[data-power-reference]').click();
          const plot = lab.locator('[data-power-plot]');
          await plot.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'center', behavior: 'instant' }); });
          const bounds = await plot.boundingBox();
          if (viewport.width < 500) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          else {
            await page.mouse.move(bounds.x + bounds.width * .4, bounds.y + bounds.height / 2);
            await page.mouse.down();
            await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 6 });
            await page.mouse.up();
          }
          assert(Math.abs(await time() - 46) <= .2, 'Plot inspection uses the plotted time scale');
          assert.equal(await playing.getAttribute('aria-pressed'), 'false');
          await event('eclipse');
          await clock.focus();
          await page.keyboard.press('ArrowRight');
          assert.equal(await time(), 57.1);
          await playing.click();
          await lab.locator('#iss-power-angle').focus();
          await page.keyboard.press('ArrowLeft');
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle=\"power\"]').getAttribute('aria-pressed') === 'false');
          assert.equal(await time(), 0);
          assert.equal(await playing.getAttribute('aria-pressed'), 'false');
          assert.equal(await lab.locator('[data-power-arrays]').getAttribute('data-power-arrays'), '85');
          await lab.locator('[data-power-preset="full"]').click();
          await event('end');
          assert.match(await reading('stored'), /153.3 kWh/);
          await capturePower('eclipse');
          await lab.locator('[data-power-preset="low"]').click();
          assert.equal(await lab.locator('[data-power-outcome]').getAttribute('data-power-outcome'), 'shortfall');
          await event('empty');
          assert.match(await reading('stored'), /0.0 kWh/);
          assert.match(await reading('battery-flow'), /0.0 kW/);
          assert.match(await reading('load'), /cannot be supplied/);
          await event('end');
          assert(!/\b0.0 kWh/.test(await reading('unserved')), 'An empty battery must record unmet energy demand');
          await capturePower('shortfall');
          await lab.locator('[data-power-preset="balanced"]').click();
          await event('eclipse');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Power lab stays within the viewport');
          console.log('Power events, playback, pointer, keyboard and energy readings passed at ' + viewport.width + 'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('thermal')) {
          console.log('Checking the coupled thermal lab at ' + viewport.width + 'px');
          await page.locator('[data-flight-rule="thermal"]').click();
          const lab = page.locator('[data-iss-thermal-lab]');
          const clock = lab.locator('#iss-thermal-time');
          const playing = lab.locator('[data-iss-playback-toggle="thermal"]');
          const reading = async name => parseFloat((await lab.locator('[data-thermal-reading="' + name + '"] strong').textContent()).replace('−','-'));
          const time = () => page.evaluate(() => window.__toolData.spaceStation.opsOrbitMinute || 0);
          const event = id => lab.locator('[data-thermal-event="' + id + '"]').click();
          const flow = () => lab.locator('[data-thermal-hot-flow]').getAttribute('stroke-dashoffset');
          async function captureThermal(name) {
            await lab.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'start', behavior: 'instant' }); });
            const clip = await lab.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
            await page.screenshot({ path: path.join(output, 'thermal-' + name + '-' + viewport.width + '.png'), fullPage: true, clip, animations: 'disabled' });
          }
          await lab.locator('[data-thermal-preset="balanced"]').click();
          assert.equal(await reading('cabin'), 22);
          assert.equal(await reading('radiator'), 4);
          assert.equal(await lab.locator('[data-thermal-event="limit"]').isDisabled(), true);
          await event('end');
          assert((await reading('cabin')) >= 18 && (await reading('cabin')) <= 27);
          assert.equal(await lab.locator('[data-thermal-outcome]').getAttribute('data-thermal-outcome'), 'comfortable');
          await event('eclipse');
          assert.equal(await time(), 57);
          assert.equal(await lab.locator('[data-thermal-phase]').getAttribute('data-thermal-phase'), 'eclipse');
          assert((await reading('radiated')) > 0, 'The radiator still emits heat in eclipse');
          const eclipseTemperature = await reading('cabin'), eclipseFlow = await flow();
          await clock.focus();
          await page.keyboard.press('ArrowLeft');
          assert.equal(await time(), 56.9);
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute > 57.3);
          assert.equal(await playing.getAttribute('aria-pressed'), 'true');
          assert.notEqual(await flow(), eclipseFlow);
          assert(Math.abs((await reading('cabin')) - eclipseTemperature) < .1, 'Temperatures must not jump at eclipse');
          await playing.click();
          const paused = await time(), pausedFlow = await flow();
          await lab.locator('[data-thermal-reference]').click();
          assert.equal(await time(), paused);
          assert.equal(await lab.locator('[data-thermal-reference-path]').count(), 0);
          await lab.locator('[data-thermal-reference]').click();
          await lab.locator('[data-thermal-part="radiator"]').click();
          assert.equal(await time(), paused);
          assert.match(await lab.locator('[data-thermal-part-note]').textContent(), /fourth-power/);
          assert.equal(await flow(), pausedFlow, 'Coolant markers share the paused simulation clock');
          const plot = lab.locator('[data-thermal-plot]');
          await plot.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'center', behavior: 'instant' }); });
          const bounds = await plot.boundingBox();
          if (viewport.width < 500) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          else {
            await page.mouse.move(bounds.x + bounds.width * .4, bounds.y + bounds.height / 2);
            await page.mouse.down();
            await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 6 });
            await page.mouse.up();
          }
          assert(Math.abs(await time() - 46) <= .2, 'Graph inspection must share the time axis');
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="thermal"]').getAttribute('aria-pressed') === 'false');
          await event('eclipse');
          await clock.focus();
          await page.keyboard.press('ArrowRight');
          assert.equal(await time(), 57.1);
          await playing.click();
          await lab.locator('#iss-thermal-flow').focus();
          await page.keyboard.press('ArrowLeft');
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="thermal"]').getAttribute('aria-pressed') === 'false');
          assert.equal(await time(), 0);
          assert.equal(await reading('cabin'), 22);
          await lab.locator('[data-thermal-preset="balanced"]').click();
          await event('eclipse');
          await captureThermal('balanced');
          await lab.locator('[data-thermal-preset="restricted"]').click();
          await event('limit');
          assert.equal(await reading('cabin'), 27);
          assert((await time()) > 47 && (await time()) < 49);
          await event('end');
          assert((await reading('cabin')) > 31);
          assert.equal(await lab.locator('[data-thermal-outcome]').getAttribute('data-thermal-outcome'), 'outside');
          const generated = await reading('generated-energy'), absorbed = await reading('absorbed-energy');
          const emitted = await reading('radiated-energy'), stored = await reading('stored-energy');
          assert(Math.abs(generated + absorbed - emitted - stored) <= .21, 'Rounded heat ledger must balance');
          await captureThermal('restricted');
          await lab.locator('[data-thermal-preset="strong"]').click();
          await event('limit');
          assert.equal(await reading('cabin'), 18);
          await event('end');
          assert((await reading('cabin')) < 18);
          await captureThermal('strong');
          await lab.locator('[data-thermal-preset="balanced"]').click();
          await event('eclipse');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Thermal lab stays within the viewport');
          console.log('Thermal events, heat budget, playback, pointer and keyboard passed at ' + viewport.width + 'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('air')) {
          console.log('Checking the two-zone cabin-air lab at ' + viewport.width + 'px');
          await page.locator('[data-flight-rule="eclss"]').first().click();
          const lab = page.locator('[data-iss-air-lab]');
          const time = () => page.evaluate(() => window.__toolData.spaceStation.opsOrbitMinute || 0);
          const reading = async id => parseFloat(await lab.locator('[data-air-reading="' + id + '"] strong').textContent());
          const event = id => lab.locator('[data-air-event="' + id + '"]').click();
          const playing = lab.locator('[data-iss-playback-toggle="air"]');
          async function captureAir(name) {
            await lab.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block:'start', behavior:'instant' }); });
            const clip = await lab.evaluate(node => { const b=node.getBoundingClientRect(); return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height}; });
            await page.screenshot({path:path.join(output,'air-'+name+'-'+viewport.width+'.png'),fullPage:true,clip,animations:'disabled'});
          }
          await lab.locator('[data-air-preset="pocket"]').click();
          assert.equal(await reading('local'),2600);
          await event('limit');
          assert.equal(await reading('local'),4000);
          assert((await time())>48 && (await time())<49);
          const restrictedFan = await lab.locator('[data-air-fan]').getAttribute('transform');
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute>49);
          await playing.click();
          assert((await reading('local'))>4000);
          assert.notEqual(await lab.locator('[data-air-fan]').getAttribute('transform'),restrictedFan,'The fan follows circulated air during playback');
          await event('end');
          assert.equal(await reading('local'),5042);
          assert.equal(await reading('cabin'),2539);
          assert((await reading('average'))<2700);
          assert.equal(await lab.locator('[data-air-outcome]').getAttribute('data-air-outcome'),'crossed');
          await captureAir('pocket');
          await lab.locator('[data-air-preset="restore"]').click();
          await event('restore');
          assert.equal(await time(),45);
          assert.equal(await reading('flow'),90);
          assert.equal(await reading('local'),3914);
          assert.equal(await lab.locator('[data-air-phase]').getAttribute('data-air-phase'),'restored');
          await captureAir('recovery');
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute>45.4);
          await lab.locator('[data-air-part="fan"]').click();
          assert.equal(await playing.getAttribute('aria-pressed'),'true');
          await playing.click();
          const paused=await time();
          await lab.locator('[data-air-reference]').click();
          assert.equal(await time(),paused);
          assert.equal(await lab.locator('[data-air-reference-path]').count(),0);
          await lab.locator('[data-air-reference]').click();
          await event('after');
          assert.equal(await time(),50);
          assert((await reading('local'))<3914);
          await event('end');
          assert.equal(await reading('local'),2860);
          const sum=await reading('initial')+await reading('exhaled')-await reading('removed')-await reading('remaining');
          assert(Math.abs(sum)<=.21,'Displayed CO2 mass ledger must balance within rounding');
          await captureAir('cleared');
          const plot=lab.locator('[data-air-plot]');
          await plot.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'center',behavior:'instant'});});
          const bounds=await plot.boundingBox();
          if(viewport.width<500) await page.touchscreen.tap(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
          else { await page.mouse.move(bounds.x+bounds.width*.4,bounds.y+bounds.height/2); await page.mouse.down(); await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2,{steps:6}); await page.mouse.up(); }
          assert(Math.abs(await time()-46)<=.2,'Air chart pointer/touch inspection uses the shared clock');
          await event('restore');
          await lab.locator('#iss-air-time').focus(); await page.keyboard.press('ArrowRight');
          assert.equal(await time(),45.1);
          await playing.click();
          await lab.locator('#iss-air-activity').focus(); await page.keyboard.press('ArrowRight');
          await page.waitForFunction(()=>document.querySelector('[data-iss-playback-toggle="air"]').getAttribute('aria-pressed')==='false');
          assert.equal(await time(),0);
          assert.equal(await lab.locator('#iss-air-activity').getAttribute('aria-valuetext'),'1.25 × baseline');
          await lab.locator('[data-air-restore-toggle]').click();
          assert.equal(await lab.locator('#iss-air-restore-time').isDisabled(),true);
          assert.equal(await lab.locator('[data-air-event="restore"]').isDisabled(),true);
          await lab.locator('#iss-air-flow').focus(); await page.keyboard.press('Home');
          assert.equal(await reading('flow'),0);
          assert.equal(await lab.locator('[data-air-flow-markers]').count(),0);
          await page.locator('[data-flight-rule="power"]').click();
          await page.locator('#iss-power-angle').focus(); await page.keyboard.press('Home');
          await page.locator('#iss-power-battery').focus(); await page.keyboard.press('Home');
          await page.locator('[data-flight-rule="eclss"]').first().click();
          assert.equal(await lab.locator('[data-air-phase]').getAttribute('data-air-phase'),'unpowered');
          assert.equal(await reading('removal'),0);
          const unpoweredFan = await lab.locator('[data-air-fan]').getAttribute('transform');
          await event('end');
          assert.equal(await reading('removed'),0);
          assert.equal(await lab.locator('[data-air-fan]').getAttribute('transform'),unpoweredFan,'An unpowered fan remains stationary');
          await captureAir('unpowered');
          await lab.locator('[data-air-preset="restore"]').click();
          await event('restore');
          await captureAir('ready');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Air lab stays within the viewport');
          console.log('Air mass budget, local pockets, recovery, power loss, playback, pointer and keyboard passed at '+viewport.width+'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('water')) {
          console.log('Checking finite water reserves at '+viewport.width+'px');
          await page.locator('[data-iss-scenario="nominal"]').click();
          await page.locator('[data-flight-rule="eclss"]').filter({hasText:'Water loop'}).click();
          const lab=page.locator('[data-iss-water-lab]');
          const time=()=>page.evaluate(()=>window.__toolData.spaceStation.opsWaterDay||0);
          const reading=async id=>parseFloat(await lab.locator('[data-water-reading="'+id+'"] strong').textContent());
          const event=id=>lab.locator('[data-water-event="'+id+'"]').click();
          const playing=lab.locator('[data-iss-playback-toggle="water"]');
          async function captureWater(name) {
            await lab.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'start',behavior:'instant'});});
            const clip=await lab.evaluate(node=>{const b=node.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});
            await page.screenshot({path:path.join(output,'water-'+name+'-'+viewport.width+'.png'),fullPage:true,clip,animations:'disabled'});
          }
          assert.equal(await reading('clean'),120);
          await lab.locator('[data-water-preset="outage"]').click();
          await event('empty');assert.equal(await reading('clean'),0);
          assert((await time())>13 && (await time())<14);
          assert.equal(await reading('process'),0);
          const stoppedRotor=await lab.locator('[data-water-rotor]').getAttribute('transform');
          await playing.click();await page.waitForFunction(()=>window.__toolData.spaceStation.opsWaterDay>14);await playing.click();
          assert.equal(await lab.locator('[data-water-rotor]').getAttribute('transform'),stoppedRotor,'Offline processor motion stays frozen');
          assert.equal(await lab.locator('[data-water-flow="return"]').count(),0);
          await event('end');assert.equal(await reading('unmet'),75.1);
          assert.equal(await lab.locator('[data-water-outcome]').getAttribute('data-water-outcome'),'shortfall');
          await captureWater('shortage');
          await lab.locator('[data-water-preset="bridge"]').click();
          await event('before');const before=await reading('clean');assert.equal(await reading('accepted'),0);
          assert.equal(await time(),12);await captureWater('before-delivery');
          await event('after');assert(Math.abs(await reading('clean')-before-100)<.11);
          assert.equal(await reading('accepted'),100);assert.equal(await time(),12);
          await captureWater('delivery');
          await event('overflow');assert.equal(await reading('waste'),100);
          assert.equal(await lab.locator('[data-water-phase]').getAttribute('data-water-phase'),'overflow');
          await event('end');assert.equal(await reading('unmet'),0);assert.equal(await reading('overflow'),59.6);
          assert.equal(await lab.locator('[data-water-outcome]').getAttribute('data-water-outcome'),'overflow');
          const balance=await reading('initial')+await reading('accepted')-await reading('remaining')-await reading('loss')-await reading('overflow');
          assert(Math.abs(balance)<.26,'Rounded water inventory accounts for input, tanks and all losses');
          await event('repair');const rotor=await lab.locator('[data-water-rotor]').getAttribute('transform');
          await playing.click();await page.waitForFunction(()=>window.__toolData.spaceStation.opsWaterDay>16.2);
          await lab.locator('[data-water-part="processor"]').click();
          assert.equal(await playing.getAttribute('aria-pressed'),'true');await playing.click();
          assert.notEqual(await lab.locator('[data-water-rotor]').getAttribute('transform'),rotor,'Treatment volume drives processor motion');
          const paused=await time();await lab.locator('[data-water-reference]').click();assert.equal(await time(),paused);
          assert.equal(await lab.locator('[data-water-reference-path]').count(),0);await lab.locator('[data-water-reference]').click();
          const plot=lab.locator('[data-water-plot]');
          await plot.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'center',behavior:'instant'});});
          const bounds=await plot.boundingBox();
          if(viewport.width<500)await page.touchscreen.tap(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
          else {await page.mouse.move(bounds.x+bounds.width*.4,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2,{steps:6});await page.mouse.up();}
          assert(Math.abs(await time()-15)<=.2,'Water graph supports pointer and touch inspection');
          await event('after');await lab.locator('#iss-water-time').focus();await page.keyboard.press('ArrowRight');assert.equal(await time(),12.1);
          await playing.click();await lab.locator('#iss-water-throughput').focus();await page.keyboard.press('ArrowRight');
          await page.waitForFunction(()=>document.querySelector('[data-iss-playback-toggle="water"]').getAttribute('aria-pressed')==='false');assert.equal(await time(),0);
          await lab.locator('[data-water-outage-toggle]').click();assert.equal(await lab.locator('#iss-water-outage-start').isDisabled(),true);
          await lab.locator('[data-water-delivery-toggle]').click();assert.equal(await lab.locator('#iss-water-delivery-day').isDisabled(),true);
          assert.equal(await lab.locator('[data-water-event="before"]').isDisabled(),true);
          await lab.locator('[data-water-preset="steady"]').click();
          await lab.locator('#iss-water-clean').focus();await page.keyboard.press('End');
          await lab.locator('#iss-water-waste').focus();await page.keyboard.press('End');
          await lab.locator('[data-water-delivery-toggle]').click();await event('after');
          assert.equal(await reading('clean'),300);assert.equal(await reading('accepted'),0);
          assert.match(await lab.locator('[data-water-receipt]').textContent(),/100.0 L stays aboard/);
          await captureWater('full-tank');
          await playing.click();await page.locator('[data-eclss-lab="air"]').click();const waterDay=await time();
          await page.waitForTimeout(200);assert.equal(await time(),waterDay);
          await page.locator('[data-open-water-lab]').click();assert.equal(await playing.getAttribute('aria-pressed'),'false');
          await lab.locator('[data-water-preset="bridge"]').click();await event('after');await captureWater('ready');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Water lab stays within the viewport');
          console.log('Water inventory, outages, deliveries, tank limits, playback, mouse/touch and keyboard passed at '+viewport.width+'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('pressure')) {
          console.log('Checking the airlock pressure lab at '+viewport.width+'px');
          await page.locator('[data-flight-rule="eclss"]').first().click();
          await page.locator('[data-eclss-lab="pressure"]').click();
          const lab=page.locator('[data-iss-pressure-lab]');
          const time=()=>page.evaluate(()=>window.__toolData.spaceStation.opsPressureMinute||0);
          const reading=async id=>parseFloat(await lab.locator('[data-pressure-reading="'+id+'"] strong').textContent());
          const event=id=>lab.locator('[data-pressure-event="'+id+'"]').click();
          const playing=lab.locator('[data-iss-playback-toggle="pressure"]');
          async function capturePressure(name) {
            await lab.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'start',behavior:'instant'});});
            const clip=await lab.evaluate(node=>{const b=node.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});
            await page.screenshot({path:path.join(output,'pressure-'+name+'-'+viewport.width+'.png'),fullPage:true,clip,animations:'disabled'});
          }
          assert.equal(await reading('lock'),101.3);
          await event('vent-end');assert.equal(await time(),6);assert.equal(await reading('vent'),0);
          assert.equal(await lab.locator('[data-pressure-phase]').getAttribute('data-pressure-phase'),'hold');
          const held=await reading('lock');await event('fill-start');assert.equal(await reading('lock'),held);
          assert.match(await lab.locator('[data-pressure-reading="transfer"]').textContent(),/sonic limit/);
          await capturePressure('refill');
          await event('subsonic');assert((await time())>11 && (await time())<12);
          await event('equal');assert.equal(await reading('inner-force'),.05);
          await event('end');assert.equal(await reading('transfer'),0);assert((await reading('outer-force'))>99);
          const balance=await reading('initial')-await reading('cabin-mass')-await reading('lock-mass')-await reading('vented');
          assert(Math.abs(balance)<.0021,'Rounded gas inventory conserves both reservoirs and vented mass');
          await capturePressure('equalized');
          await lab.locator('[data-pressure-preset="leak"]').click();
          const plot=lab.locator('[data-pressure-plot]');
          await plot.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'center',behavior:'instant'});});
          const bounds=await plot.boundingBox();
          if(viewport.width<500)await page.touchscreen.tap(bounds.x+bounds.width*.2,bounds.y+bounds.height/2);
          else {await page.mouse.move(bounds.x+bounds.width*.1,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.2,bounds.y+bounds.height/2,{steps:6});await page.mouse.up();}
          assert(Math.abs(await time()-4)<=.1,'Pressure graph supports mouse and touch inspection');
          const cabin=await reading('cabin'),lock=await reading('lock'),vented=await reading('vented');
          await lab.locator('[data-pressure-isolate]').click();assert.equal(await playing.getAttribute('aria-pressed'),'false');
          assert.equal(await reading('cabin'),cabin);assert.equal(await reading('lock'),lock);assert.equal(await reading('vented'),vented);
          assert.equal(await reading('transfer'),0);assert((await reading('vent'))>0);
          assert.equal(await lab.locator('[data-pressure-flow="equalize"]').count(),0);
          assert.equal(await lab.locator('[data-pressure-valve]').getAttribute('data-pressure-valve'),'closed');
          await capturePressure('isolate');
          await event('end');assert.equal(await reading('cabin'),cabin);assert((await reading('lock'))<lock);
          assert.equal(await lab.locator('[data-pressure-outcome]').getAttribute('data-pressure-outcome'),'isolated');
          await capturePressure('protected');
          await event('isolate');await lab.locator('#iss-pressure-time').focus();await page.keyboard.press('ArrowRight');
          assert(Math.abs(await time()-4.1)<.11);
          await playing.click();await page.waitForFunction(()=>window.__toolData.spaceStation.opsPressureMinute>4.3);
          const hotspot=lab.locator('[data-pressure-hotspot="outer"]');
          await hotspot.scrollIntoViewIfNeeded();
          if(viewport.width<500)await hotspot.tap();
          else {
            const beforeHover=await hotspot.boundingBox();await hotspot.hover();
            const afterHover=await hotspot.boundingBox();
            assert(Math.abs(afterHover.x-beforeHover.x)<.5&&Math.abs(afterHover.y-beforeHover.y)<.5,'Hardware inspection target must stay under the pointer');
            await hotspot.click();
          }
          await page.waitForFunction(()=>document.querySelector('[data-pressure-part="outer"]').getAttribute('aria-pressed')==='true');
          assert.equal(await playing.getAttribute('aria-pressed'),'true');
          assert.equal(await lab.locator('[data-pressure-part="outer"]').getAttribute('aria-pressed'),'true');
          await playing.click();const paused=await time();await lab.locator('[data-pressure-reference]').click();assert.equal(await time(),paused);
          assert.equal(await lab.locator('[data-pressure-reference-path]').count(),0);
          await lab.locator('[data-pressure-clear-isolation]').click();assert.equal(await time(),0);
          await playing.click();await lab.locator('#iss-pressure-fill').focus();await page.keyboard.press('ArrowRight');
          await page.waitForFunction(()=>document.querySelector('[data-iss-playback-toggle="pressure"]').getAttribute('aria-pressed')==='false');assert.equal(await time(),0);
          await lab.locator('#iss-pressure-start').focus();await page.keyboard.press('End');
          assert.match(await lab.locator('[data-pressure-reading="transfer"]').textContent(),/Airlock → cabin/);
          await capturePressure('reverse');
          await playing.click();await page.locator('[data-eclss-lab="water"]').click();const previousTime=await time();await page.waitForTimeout(200);assert.equal(await time(),previousTime);
          await page.locator('[data-eclss-lab="pressure"]').click();assert.equal(await playing.getAttribute('aria-pressed'),'false');
          await lab.locator('[data-pressure-preset="cycle"]').click();await event('fill-start');await capturePressure('ready');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Airlock lab stays within the viewport');
          console.log('Pressure cycles, gas budget, hatch loads, live isolation, reversed flow, playback, hardware hotspots, touch and keyboard passed at '+viewport.width+'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('debris') && !args.includes('--debris-detector-only')) {
          console.log('Checking the hypervelocity shield lab at '+viewport.width+'px');
          await page.locator('.iss-ops-mode').filter({hasText:'Debris'}).click();
          const lab=page.locator('[data-iss-debris-lab]');
          const time=()=>page.evaluate(()=>window.__toolData.spaceStation.opsDebrisTime||0);
          const reading=async id=>parseFloat(await lab.locator('[data-debris-reading="'+id+'"] strong').textContent());
          const event=id=>lab.locator('[data-debris-event="'+id+'"]').click();
          const playing=lab.locator('[data-iss-playback-toggle="debris"]');
          async function captureDebris(name){
            await lab.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'start',behavior:'instant'});});
            const clip=await lab.evaluate(node=>{const b=node.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});
            await page.screenshot({path:path.join(output,'debris-'+name+'-'+viewport.width+'.png'),fullPage:true,clip,animations:'disabled'});
          }
          assert.equal(await reading('mass'),1.414);assert.equal(await reading('incoming'),101.8);
          await event('impact');assert.equal(await lab.locator('[data-debris-phase]').getAttribute('data-debris-phase'),'impact');
          assert.equal(await reading('incoming'),0);assert.equal(await reading('translation'),58.2);
          const sum=await reading('translation')+await reading('expansion')+await reading('internal');
          assert(Math.abs(sum-await reading('energy'))<.2,'Rounded energy partition balances');
          await event('wall');const arrival=await time();assert(await playing.isDisabled());
          await captureDebris('contact');
          await event('start');const plot=lab.locator('[data-debris-plot]');
          await plot.evaluate(node=>{document.activeElement?.blur();node.scrollIntoView({block:'center',behavior:'instant'});});
          const bounds=await plot.boundingBox();
          if(viewport.width<500)await page.touchscreen.tap(bounds.x+bounds.width*.6,bounds.y+bounds.height/2);
          else {await page.mouse.move(bounds.x+bounds.width*.3,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.6,bounds.y+bounds.height/2,{steps:6});await page.mouse.up();}
          assert(Math.abs(await time()-arrival*.6)<arrival*.01,'Graph supports mouse and touch inspection');
          const selected=await time();await lab.locator('#iss-debris-time').focus();await page.keyboard.press('ArrowRight');assert(Math.abs(await time()-selected-.05)<1e-8);
          await captureDebris('cloud');
          await lab.locator('[data-debris-preset="compact"]').click();assert.equal(await time(),0);
          assert.match(await lab.locator('[data-debris-comparison]').textContent(),/1.00× the area; 0.0%/);
          await event('wall');await captureDebris('compact');
          await lab.locator('[data-debris-preset="dense"]').click();assert.equal(await lab.locator('#iss-debris-material').inputValue(),'steel');assert((await reading('mass'))>30);
          await lab.locator('#iss-debris-size').focus();await page.keyboard.press('Home');
          await lab.locator('#iss-debris-bumper').focus();await page.keyboard.press('End');
          await lab.locator('#iss-shield-gap').focus();await page.keyboard.press('End');
          await lab.locator('#iss-debris-material').selectOption('aluminum');
          await playing.click();await page.waitForFunction(()=>window.__toolData.spaceStation.opsDebrisTime>.5);
          const inspector=lab.locator('[data-debris-part="wall"]');if(viewport.width<500)await inspector.tap();else await inspector.click();
          await page.waitForFunction(()=>document.querySelector('[data-debris-part="wall"]').getAttribute('aria-pressed')==='true');
          assert.equal(await playing.getAttribute('aria-pressed'),'true');await playing.click();
          const paused=await time();await lab.locator('[data-debris-compare]').click();assert.equal(await time(),paused);assert.equal(await lab.locator('[data-debris-reference-footprint]').count(),0);
          await playing.click();await lab.locator('#iss-debris-spread').focus();await page.keyboard.press('Home');
          await page.waitForFunction(()=>document.querySelector('[data-iss-playback-toggle="debris"]').getAttribute('aria-pressed')==='false');
          assert.equal(await time(),0);assert.equal(await playing.getAttribute('aria-pressed'),'false');
          await event('wall');assert.equal(await reading('spread'),0);await captureDebris('no-spread');
          await event('start');await playing.click();await page.locator('[data-flight-rule="power"]').click();const leaving=await time();await page.waitForTimeout(200);assert.equal(await time(),leaving);
          await page.locator('.iss-ops-mode').filter({hasText:'Debris'}).click();assert.equal(await playing.getAttribute('aria-pressed'),'false');
          await lab.locator('[data-debris-preset="spaced"]').click();await lab.locator('[data-debris-compare]').click();
          const handle=lab.locator('[data-debris-wall-handle]');
          await handle.focus();await page.keyboard.press('Home');assert.equal(await handle.getAttribute('aria-valuenow'),'2');
          const near=await handle.boundingBox();await page.keyboard.press('End');const far=await handle.boundingBox();
          assert.equal(await handle.getAttribute('aria-valuenow'),'20');
          const perCm=(far.x-near.x)/18;assert(perCm>0,'Wall changes position on a stable spatial scale');
          await lab.locator('[data-debris-preset="spaced"]').click();
          await handle.evaluate(node=>{node.scrollIntoView({block:'center',behavior:'instant'});});
          const before=await handle.boundingBox(),x=before.x+before.width/2,y=before.y+before.height/2;
          if(viewport.width<500){
            const touch=await page.context().newCDPSession(page);
            await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});
            for(let step=1;step<=4;step++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+perCm*step,y,id:0}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
          }else{
            await handle.hover();const hovered=await handle.boundingBox();assert(Math.abs(hovered.x-before.x)<.5,'Drag handle stays under the pointer on hover');
            await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+perCm*4,y,{steps:8});await page.mouse.up();
          }
          await page.waitForFunction(()=>window.__toolData.spaceStation.opsShieldGap===14);
          assert.equal(await handle.getAttribute('aria-valuenow'),'14');assert.equal(await lab.locator('#iss-shield-gap').inputValue(),'14');
          assert.equal(await time(),0);assert.equal(await handle.getAttribute('data-dragging'),null);
          const moved=await handle.boundingBox();assert(Math.abs(moved.x-before.x-perCm*4)<1,'Captured dragging tracks pointer displacement');
          await handle.focus();await page.keyboard.press('ArrowRight');assert.equal(await handle.getAttribute('aria-valuenow'),'15');
          await page.keyboard.press('ArrowLeft');assert.equal(await handle.getAttribute('aria-valuenow'),'14');
          await event('cloud');await playing.click();await lab.locator('[data-debris-pin]').click();
          assert.equal(await playing.getAttribute('aria-pressed'),'true');await playing.click();
          const pinned=await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline));
          assert.match(await lab.locator('[data-debris-reference-status]').textContent(),/14 cm gap/);
          const inspected=await time();await lab.locator('[data-debris-vectors-toggle]').click();assert.equal(await time(),inspected);assert.equal(await lab.locator('[data-debris-vectors]').count(),0);
          await lab.locator('[data-debris-vectors-toggle]').click();assert.equal(await lab.locator('[data-debris-vector="radial-up"]').count(),1);
          await lab.locator('#iss-debris-speed').focus();await page.keyboard.press('End');
          await lab.locator('#iss-shield-gap').focus();await page.keyboard.press('End');
          assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),pinned);
          assert.equal(await lab.locator('[data-debris-setting][data-changed="true"]').count(),2);
          assert.equal(await lab.locator('[data-debris-setting="speed"] td').last().textContent(),'12 km/s');
          assert.equal(await lab.locator('[data-debris-setting="gap"] td').last().textContent(),'14 cm');
          await event('cloud');
          const probe=lab.locator('[data-debris-probe]'),probeStage=lab.locator('[data-debris-probe-stage]');
          const probeClock=await time(),probeMass=await reading('probe-mass');
          assert.equal(await probe.locator('[data-debris-tracer]').count(),64,'The transverse view samples the same live cloud');
          assert.match(await probe.locator('[data-debris-probe-insight]').textContent(),/75.00% of the mass carries 93.75%/);
          const fixedRadius=Number(await probe.locator('[data-debris-probe-cloud]').getAttribute('r'));
          await probe.locator('[data-debris-probe-magnify]').click();
          assert.equal(Number(await probe.locator('[data-debris-probe-cloud]').getAttribute('r')),110);
          assert.equal(await reading('probe-mass'),probeMass);assert.equal(await time(),probeClock);
          await probeStage.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
          const probeBox=await probeStage.locator('svg').boundingBox(),pcx=probeBox.x+probeBox.width/2,pcy=probeBox.y+probeBox.height/2,pr=110*probeBox.width/320;
          if(viewport.width<500){
            const touch=await page.context().newCDPSession(page);
            await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pcx+pr*.25,y:pcy,id:0}]});
            for(let i=1;i<=4;i++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pcx+pr*(.25+i*.125),y:pcy,id:0}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
          }else{
            await page.mouse.move(pcx+pr*.25,pcy);await page.mouse.down();await page.mouse.move(pcx+pr*.75,pcy,{steps:8});await page.mouse.up();
          }
          assert.equal(await probeStage.getAttribute('aria-valuenow'),'75');
          assert.equal(await probe.locator('#iss-debris-probe-radius').inputValue(),'75');
          assert.equal(await time(),probeClock);assert.equal(await probeStage.getAttribute('data-dragging'),null);
          await probeStage.focus();await page.keyboard.press('Home');assert.equal(await reading('probe-mass'),0);
          await page.keyboard.press('End');assert.equal(await probeStage.getAttribute('aria-valuenow'),'100');
          await probe.locator('[data-debris-probe-preset="core"]').click();
          await probe.locator('#iss-debris-probe-radius').focus();await page.keyboard.press('ArrowRight');assert.equal(await probeStage.getAttribute('aria-valuenow'),'51');
          await page.keyboard.press('ArrowLeft');assert.equal(await probeStage.getAttribute('aria-valuenow'),'50');
          await probe.locator('[data-debris-probe-magnify]').click();
          assert.equal(Number(await probe.locator('[data-debris-probe-cloud]').getAttribute('r')),fixedRadius);
          assert.equal(await time(),probeClock);assert.equal(await reading('probe-mass'),probeMass);
          await probe.locator('[data-debris-probe-event="wall"]').click();assert.equal(await time(),Number(await lab.locator('#iss-debris-time').getAttribute('max')));
          assert.equal(await playing.isDisabled(),true);assert.equal(await reading('probe-mass'),probeMass);
          await probe.locator('[data-debris-probe-event="cloud"]').click();await probe.locator('[data-debris-probe-magnify]').click();
          await probe.screenshot({path:path.join(output,'debris-probe-'+viewport.width+'.png'),animations:'disabled'});
          const sweep=lab.locator('[data-debris-sweep]'),sweepPlot=sweep.locator('[data-debris-sweep-plot]');
          const sweepTime=await time(),value=()=>sweep.locator('[data-debris-sweep-selected] strong').textContent();
          const energyValue=await value();
          await sweep.locator('[data-debris-sweep-metric="flight"]').click();
          assert(Math.abs(parseFloat(await value())-await reading('flight'))<.01);assert.equal(await time(),sweepTime);
          await sweep.locator('[data-debris-sweep-metric="diameter"]').click();assert.match(await value(),/mm/);assert.equal(await time(),sweepTime);
          await sweep.locator('[data-debris-sweep-metric="fluence"]').click();await sweep.locator('[data-debris-sweep-scale]').click();
          assert.equal(await sweep.getAttribute('data-log'),'false');assert.equal(await value(),energyValue);assert.equal(await time(),sweepTime);
          await sweep.locator('[data-debris-sweep-scale]').click();assert.equal(await sweep.getAttribute('data-log'),'true');
          const savedCurve=await sweep.locator('[data-debris-sweep-reference-curve]').getAttribute('d');
          await sweepPlot.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
          const sweepBox=await sweepPlot.locator('svg').boundingBox(),sx=gap=>sweepBox.x+(16+(gap-2)/18*688)/720*sweepBox.width,sy=sweepBox.y+sweepBox.height/2;
          if(viewport.width<500){
            const touch=await page.context().newCDPSession(page);
            await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx(6),y:sy,id:0}]});
            for(let gap=8;gap<=14;gap+=2)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx(gap),y:sy,id:0}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
          }else{
            await page.mouse.move(sx(6),sy);await page.mouse.down();await page.mouse.move(sx(14),sy,{steps:8});await page.mouse.up();
          }
          assert.equal(await sweepPlot.getAttribute('aria-valuenow'),'14');assert.equal(await lab.locator('#iss-shield-gap').inputValue(),'14');assert.equal(await time(),0);
          assert.equal(await sweepPlot.getAttribute('data-dragging'),null);assert.equal(await sweep.locator('[data-debris-sweep-reference-curve]').getAttribute('d'),savedCurve);
          assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),pinned);
          await sweepPlot.focus();await page.keyboard.press('Home');assert.equal(await sweepPlot.getAttribute('aria-valuenow'),'2');
          await page.keyboard.press('End');assert.equal(await sweepPlot.getAttribute('aria-valuenow'),'20');
          await sweep.locator('#iss-debris-sweep-gap').focus();await page.keyboard.press('ArrowLeft');assert.equal(await lab.locator('#iss-shield-gap').inputValue(),'19');
          await lab.locator('#iss-debris-spread').focus();await page.keyboard.press('Home');
          const flatValue=await value();await sweep.locator('#iss-debris-sweep-gap').focus();await page.keyboard.press('Home');assert.equal(await value(),flatValue);
          assert.match(await sweep.locator('[data-debris-sweep-note]').textContent(),/leaves cloud diameter and energy per area unchanged/);
          await sweep.screenshot({path:path.join(output,'debris-sweep-zero-spread-'+viewport.width+'.png'),animations:'disabled'});
          await lab.locator('[data-debris-preset="spaced"]').click();
          await lab.locator('#iss-debris-bumper').focus();await page.keyboard.press('End');
          await sweep.locator('#iss-debris-sweep-gap').focus();await page.keyboard.press('End');for(let i=0;i<4;i++)await page.keyboard.press('ArrowLeft');
          await event('cloud');
          await sweep.screenshot({path:path.join(output,'debris-sweep-'+viewport.width+'.png'),animations:'disabled'});
          const pair=lab.locator('[data-debris-pair]'),pairCurrent=lab.locator('[data-debris-pair-shot="current"]'),pairRef=lab.locator('[data-debris-pair-shot="reference"]');
          assert.equal(await pair.getAttribute('data-mode'),'contact');
          assert.equal(await pairCurrent.getAttribute('data-phase'),'contact');assert.equal(await pairRef.getAttribute('data-phase'),'contact');
          assert.notEqual(await pairCurrent.getAttribute('data-time'),await pairRef.getAttribute('data-time'));
          assert.equal(await pair.locator('[data-debris-pair-scene="current"]').getAttribute('data-scale'),await pair.locator('[data-debris-pair-scene="reference"]').getAttribute('data-scale'));
          const pairClock=await time(),navigation=lab.locator('[data-debris-nav]');
          for(const target of ['setup','probe-title','sweep-title','compare-title']){
            const link=navigation.locator('a[href="#iss-debris-'+target+'"]');
            if(viewport.width<500)await link.tap();else{await link.focus();await page.keyboard.press('Enter');}
            assert.equal(await page.evaluate(()=>document.activeElement.id),'iss-debris-'+target);
            assert.equal(await time(),pairClock,'Section navigation must preserve the shot clock');
            const head=await lab.locator('#iss-debris-'+target).boundingBox(),navBox=await navigation.boundingBox();
            assert(head.y>=navBox.y+navBox.height-1,'Navigation must not cover the destination');
          }
          await pair.locator('[data-debris-pair-mode="clock"]').click();assert.equal(await time(),pairClock);
          assert.equal(Number(await pairCurrent.getAttribute('data-time')),pairClock);
          assert.equal(await pairRef.getAttribute('data-held'),'true');assert.match(await pair.locator('[data-debris-pair-phase="reference"]').textContent(),/held/);
          const pairTime=pair.locator('#iss-debris-pair-time');
          await pairTime.focus();await page.keyboard.press('ArrowRight');assert(Math.abs(await time()-pairClock-.05)<1e-8);
          assert.equal(Number(await lab.locator('#iss-debris-time').inputValue()),await time());
          await pair.locator('[data-debris-pair-event="start"]').click();assert.equal(await time(),0);
          assert.equal(await pairCurrent.getAttribute('data-phase'),'approach');assert.equal(await pairRef.getAttribute('data-phase'),'approach');
          await pair.locator('[data-debris-pair-event="impact"]').click();assert.equal(await pairCurrent.getAttribute('data-phase'),'impact');
          await pairTime.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
          const pairBox=await pairTime.boundingBox();
          if(viewport.width<500)await page.touchscreen.tap(pairBox.x+pairBox.width*.65,pairBox.y+pairBox.height/2);
          else{await page.mouse.move(pairBox.x+pairBox.width*.25,pairBox.y+pairBox.height/2);await page.mouse.down();await page.mouse.move(pairBox.x+pairBox.width*.65,pairBox.y+pairBox.height/2,{steps:5});await page.mouse.up();}
          assert(await time()>Number(await pairTime.getAttribute('max'))*.6&&await time()<Number(await pairTime.getAttribute('max'))*.7);
          assert.equal(Number(await pairCurrent.getAttribute('data-time')),await time());assert.equal(await playing.getAttribute('aria-pressed'),'false');
          assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),pinned);
          async function capturePair(name){
            await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
            const clip=await pair.evaluate(node=>{const b=node.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});
            await page.screenshot({path:path.join(output,'debris-pair-'+name+'-'+viewport.width+'.png'),clip,fullPage:true,animations:'disabled'});
          }
          await capturePair('clock');
          await pair.locator('[data-debris-pair-mode="contact"]').click();await capturePair('contact');
          await captureDebris('ready');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Debris lab stays within the viewport');
          console.log('Impact phases, energy budget, captured wall dragging, saved references, velocity vectors, live cloud probing, magnification, standoff sweeps, reference curves, paired physical-time comparisons, section navigation, playback, mouse/touch and keyboard passed at '+viewport.width+'px');
        }
        if(tab==='operations'&&!accessibilityOnly&&operationLabs.includes('debris')){
          console.log('Checking the virtual footprint aperture at '+viewport.width+'px');
          await page.locator('.iss-ops-mode').filter({hasText:'Debris'}).click();
          const lab=page.locator('[data-iss-debris-lab]'),detector=lab.locator('[data-debris-detector]'),stage=detector.locator('[data-debris-detector-stage]');
          const time=()=>page.evaluate(()=>window.__toolData.spaceStation.opsDebrisTime||0);
          const energy=id=>detector.locator('[data-debris-detector-energy="'+id+'"]').textContent();
          async function captureAperture(name){
            await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
            const clip=await detector.evaluate(n=>{const b=n.getBoundingClientRect();return{x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height};});
            await page.screenshot({path:path.join(output,'debris-aperture-'+name+'-'+viewport.width+'.png'),clip,fullPage:true,animations:'disabled'});
          }
          await lab.locator('[data-debris-preset="compact"]').click();await lab.locator('[data-debris-pin]').click();
          await lab.locator('[data-debris-preset="spaced"]').click();
          await lab.locator('[data-debris-event="cloud"]').click();const inspected=await time();
          const saved=await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline));
          await detector.locator('[data-debris-detector-preset="center"]').click();
          const center=await energy('current');assert(parseFloat(center)>0);assert.equal(await detector.locator('[data-debris-detector-status="current"]').textContent(),'Aperture fully inside');
          assert.equal(await detector.locator('[data-debris-detector-status="reference"]').textContent(),'Entire footprint sampled');
          await captureAperture('center');
          await detector.locator('[data-debris-detector-preset="current"]').click();assert.equal(await time(),inspected);
          assert(parseFloat(await energy('current'))<parseFloat(center));assert.equal(await energy('reference'),'0 J');
          assert.equal(await detector.locator('[data-debris-detector-status="current"]').textContent(),'Partial overlap');
          await captureAperture('edge');
          await stage.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));
          const box=await stage.locator('svg').boundingBox(),scale=Number(await stage.locator('svg').getAttribute('data-debris-detector-scale'));
          const sx=mm=>box.x+(180+mm/1000*scale)/550*box.width,sy=box.y+190/380*box.height;
          if(viewport.width<500){
            const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx(5),y:sy,id:0}]});
            for(let mm=10;mm<=25;mm+=5)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx(mm),y:sy,id:0}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
          }else{await page.mouse.move(sx(5),sy);await page.mouse.down();await page.mouse.move(sx(25),sy,{steps:8});await page.mouse.up();}
          assert.equal(Number(await stage.getAttribute('aria-valuenow')),25);assert.equal(await stage.getAttribute('data-dragging'),null);assert.equal(await time(),inspected);
          assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),saved);
          await stage.focus();await page.keyboard.press('ArrowRight');assert.equal(Number(await stage.getAttribute('aria-valuenow')),25.5);
          await page.keyboard.press('PageUp');assert.equal(Number(await stage.getAttribute('aria-valuenow')),30.5);
          await page.keyboard.press('End');assert.equal(await energy('current'),'0 J');assert.equal(await energy('reference'),'0 J');
          await page.keyboard.press('Home');assert.equal(await energy('current'),center);
          const profile=detector.locator('[data-debris-scan]'),scanStage=profile.locator('[data-debris-scan-stage]');
          assert.equal(await profile.locator('[data-debris-scan-reading="current"]').textContent(),await energy('current'));
          const scanHigh=await profile.getAttribute('data-high'),scanCurve=await profile.locator('[data-debris-scan-curve="current"]').getAttribute('d');
          await profile.locator('[data-debris-scan-metric="mass"]').click();
          assert.equal(await profile.getAttribute('data-metric'),'mass');assert((await scanStage.getAttribute('aria-valuetext')).includes('mg'));
          assert.equal(await profile.locator('[data-debris-scan-reading="current"]').textContent(),await detector.locator('[data-debris-detector-mass="current"]').textContent());
          await captureAperture('scan-mass');await profile.locator('[data-debris-scan-metric="energy"]').click();
          await scanStage.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));
          const scanBox=await scanStage.locator('svg').boundingBox(),maxOffset=Number(await scanStage.getAttribute('aria-valuemax'));
          const scanX=mm=>scanBox.x+(12+mm/maxOffset*576)/600*scanBox.width,scanY=scanBox.y+scanBox.height/2;
          if(viewport.width<500){
            const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:scanX(12),y:scanY,id:0}]});
            for(let mm=15;mm<=35;mm+=5)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:scanX(mm),y:scanY,id:0}]});
            await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
          }else{await page.mouse.move(scanX(12),scanY);await page.mouse.down();await page.mouse.move(scanX(35),scanY,{steps:8});await page.mouse.up();}
          assert.equal(Number(await scanStage.getAttribute('aria-valuenow')),35);assert.equal(Number(await stage.getAttribute('aria-valuenow')),35);assert.equal(await detector.locator('#iss-debris-detector-offset').inputValue(),'35');
          assert.equal(await scanStage.getAttribute('data-dragging'),null);assert.equal(await profile.getAttribute('data-high'),scanHigh);
          assert.equal(await profile.locator('[data-debris-scan-curve="current"]').getAttribute('d'),scanCurve);
          assert.equal(await profile.locator('[data-debris-scan-reading="current"]').textContent(),await energy('current'));assert.equal(await time(),inspected);
          assert.equal(await page.evaluate(()=>JSON.stringify(window.__toolData.spaceStation.opsDebrisBaseline)),saved);
          await scanStage.focus();await page.keyboard.press('ArrowRight');assert.equal(Number(await stage.getAttribute('aria-valuenow')),35.5);
          await page.keyboard.press('PageDown');assert.equal(Number(await stage.getAttribute('aria-valuenow')),30.5);
          await captureAperture('scan-energy');await scanStage.focus();await page.keyboard.press('End');assert.equal(await energy('current'),'0 J');assert.equal(await energy('reference'),'0 J');
          assert.equal(await profile.locator('[data-debris-scan-reading="current"]').textContent(),'0 J');await page.keyboard.press('Home');assert.equal(await energy('current'),center);
          const radius=detector.locator('#iss-debris-detector-radius');await radius.focus();await page.keyboard.press('Home');assert.equal(await radius.inputValue(),'0.5');
          assert(parseFloat(await energy('current'))>0);assert.equal(await time(),inspected);
          const smallScanHigh=await profile.getAttribute('data-high');
          await lab.locator('[data-debris-compare]').click();assert.equal(await detector.locator('[data-debris-detector-result="reference"]').count(),0);
          assert.equal(await profile.getAttribute('data-high'),smallScanHigh);assert.equal(await profile.locator('[data-debris-scan-curve="reference"]').count(),0);
          assert.equal(Number(await stage.locator('svg').getAttribute('data-debris-detector-scale')),scale);
          await lab.locator('[data-debris-compare]').click();assert.equal(await detector.locator('[data-debris-detector-result="reference"]').count(),1);
          await radius.focus();await page.keyboard.press('End');assert.equal(await radius.inputValue(),'30');
          await lab.locator('#iss-debris-spread').focus();await page.keyboard.press('Home');
          assert.equal(await detector.locator('[data-debris-detector-status="current"]').textContent(),'Entire footprint sampled');
          await captureAperture('whole-cloud');
          await lab.locator('[data-debris-pin]').click();await radius.focus();await page.keyboard.press('Home');
          const ruler=Number(await detector.locator('[data-debris-detector-ruler]').getAttribute('data-length'));
          const rulerScale=Number(await stage.locator('svg').getAttribute('data-debris-detector-scale'));
          assert(ruler*1000<1);assert(430+ruler*rulerScale<550);assert(Math.abs(parseFloat(await detector.locator('.iss-debris-map-label.is-ruler').textContent())/1000-ruler)<ruler*1e-12);
          await captureAperture('small-scale');
          await lab.locator('[data-debris-preset="compact"]').click();await lab.locator('[data-debris-pin]').click();
          await lab.locator('[data-debris-preset="spaced"]').click();
          await radius.focus();await page.keyboard.press('Home');for(let i=0;i<19;i++)await page.keyboard.press('ArrowRight');
          await detector.locator('[data-debris-detector-preset="current"]').click();await captureAperture('ready');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Aperture lab fits viewport');
          console.log('Aperture overlap, linked radial energy/mass profiles, stable common axes, first-contact readings, captured pointer/touch movement, keyboard limits, independent clock, reference preservation and small-footprint states passed at '+viewport.width+'px');
        }
        if (tab === 'operations' && !accessibilityOnly && operationLabs.includes('attitude')) {
          console.log('Checking the momentum-management lab at ' + viewport.width + 'px');
          await page.locator('[data-flight-rule="attitude"]').click();
          const lab = page.locator('[data-iss-attitude-lab]');
          const clock = lab.locator('#iss-attitude-time');
          const playing = lab.locator('[data-iss-playback-toggle="attitude"]');
          const time = () => page.evaluate(() => window.__toolData.spaceStation.opsOrbitMinute || 0);
          const reading = async name => parseFloat((await lab.locator('[data-attitude-reading="' + name + '"] strong').textContent()).replace('−','-'));
          const event = id => lab.locator('[data-attitude-event="' + id + '"]').click();
          async function captureAttitude(name) {
            await lab.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'start', behavior: 'instant' }); });
            const clip = await lab.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
            await page.screenshot({ path: path.join(output, 'attitude-' + name + '-' + viewport.width + '.png'), fullPage: true, clip, animations: 'disabled' });
          }
          await lab.locator('[data-attitude-preset="hold"]').click();
          assert.equal(await lab.locator('#iss-attitude-torque').getAttribute('aria-valuetext'), '0.35 N·m');
          await event('end');
          assert.equal(await reading('angle'), 0);
          assert.equal(await reading('fuel'), 0);
          assert.equal(await lab.locator('[data-attitude-event="capacity"]').isDisabled(), true);
          await lab.locator('[data-attitude-preset="drift"]').click();
          await event('capacity');
          assert(Math.abs((await time()) - 19.7916666667) < 1e-6);
          assert.equal(await reading('angle'), 0);
          const beforeRotation = await lab.locator('[data-attitude-station]').getAttribute('transform');
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute > 20.1);
          assert.equal(await playing.getAttribute('aria-pressed'), 'true');
          assert.notEqual(await lab.locator('[data-attitude-station]').getAttribute('transform'), beforeRotation);
          await playing.click();
          const paused = await time();
          await lab.locator('[data-attitude-part="gyros"]').click();
          assert.equal(await time(), paused);
          assert.match(await lab.locator('[data-attitude-part-note]').textContent(), /constant-speed rotors/);
          await event('end');
          assert((await reading('angle')) > 16 && (await reading('angle')) < 17);
          assert((await reading('rate')) > 0);
          assert.equal(await lab.locator('[data-attitude-phase]').getAttribute('data-attitude-phase'), 'drifting');
          const transform = await lab.locator('[data-attitude-station]').getAttribute('transform');
          const angle = Number(transform.match(/rotate\(([^)]+)\)/)[1]);
          assert(Math.abs(angle - await reading('angle')) < .0051, 'Station orientation must use the actual displayed angle');
          await captureAttitude('drift');
          for (const [control,key] of [['#iss-cmg-load','End'],['#iss-attitude-torque','End'],['#iss-attitude-inertia','Home']]) {
            await lab.locator(control).focus();
            await page.keyboard.press(key);
          }
          await lab.locator('[data-attitude-part="station"]').click();
          await event('end');
          assert((await reading('angle')) > 80, 'The full allowed drift angle remains available');
          const wideAngle = await lab.locator('[data-attitude-station]').getAttribute('transform');
          assert(Math.abs(Number(wideAngle.match(/rotate\(([^)]+)\)/)[1]) - await reading('angle')) < .0051, 'Camera fit must preserve actual orientation');
          for (const part of ['station','gyros','thrusters']) {
            await lab.locator('[data-attitude-part="' + part + '"]').click();
            const frame = await lab.locator('.iss-attitude-scene > svg').boundingBox();
            const hardware = await lab.locator('[data-attitude-station]').boundingBox();
            assert(hardware.x >= frame.x && hardware.y >= frame.y && hardware.x + hardware.width <= frame.x + frame.width && hardware.y + hardware.height <= frame.y + frame.height, 'The rotating station must fit inside the scene at maximum drift');
          }
          await captureAttitude('wide-drift');
          await lab.locator('[data-attitude-preset="unload"]').click();
          await event('burn-start');
          assert.equal(await time(), 10);
          assert.equal(await lab.locator('[data-attitude-plumes]').count(), 1);
          assert.equal(await reading('fuel'), 0);
          assert.equal(await reading('thruster-torque'), -80);
          await playing.click();
          await page.waitForFunction(() => window.__toolData.spaceStation.opsOrbitMinute > 10.4);
          await playing.click();
          assert((await reading('fuel')) > 0);
          const during = await time();
          await lab.locator('[data-attitude-reference]').click();
          assert.equal(await time(), during);
          assert.equal(await lab.locator('[data-attitude-reference-path]').count(), 0);
          await lab.locator('[data-attitude-reference]').click();
          await captureAttitude('unloading');
          await event('burn-end');
          assert.equal(await lab.locator('[data-attitude-load]').textContent(), '8.0%');
          assert.equal(await lab.locator('[data-attitude-plumes]').count(), 0);
          const used = await reading('fuel');
          await event('end');
          assert.equal(await reading('fuel'), used);
          assert.equal(await reading('angle'), 0);
          assert.equal(await lab.locator('[data-attitude-outcome]').getAttribute('data-attitude-outcome'), 'held');
          for (const id of ['momentum','angle']) {
            const plot = lab.locator('[data-attitude-plot="' + id + '"]');
            await plot.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'center', behavior: 'instant' }); });
            const bounds = await plot.boundingBox();
            if (viewport.width < 500) await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
            else {
              await page.mouse.move(bounds.x + bounds.width * .4, bounds.y + bounds.height / 2);
              await page.mouse.down();
              await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 6 });
              await page.mouse.up();
            }
            assert(Math.abs(await time() - 46) <= .2, 'Both charts must share the inspection time');
          }
          await event('burn-start');
          await clock.focus();
          await page.keyboard.press('ArrowRight');
          assert.equal(await time(), 10.1);
          await playing.click();
          await lab.locator('#iss-attitude-inertia').focus();
          await page.keyboard.press('ArrowRight');
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="attitude"]').getAttribute('aria-pressed') === 'false');
          assert.equal(await time(), 0);
          assert.equal(await lab.locator('#iss-attitude-inertia').inputValue(), '90');
          await lab.locator('#iss-attitude-fuel').focus();
          await page.keyboard.press('Home');
          await page.keyboard.press('ArrowRight');
          await page.keyboard.press('ArrowRight');
          assert.equal(await lab.locator('#iss-attitude-fuel').inputValue(), '0.1');
          await event('burn-end');
          assert.equal(await reading('fuel'), .1);
          assert.equal(await lab.locator('[data-attitude-plumes]').count(), 0);
          assert.match(await lab.locator('[data-attitude-burn-note]').textContent(), /propellant runs out/);
          await event('end');
          assert.equal(await lab.locator('[data-attitude-outcome]').getAttribute('data-attitude-outcome'), 'drifting');
          await captureAttitude('fuel-limited');
          await lab.locator('[data-attitude-preset="drift"]').click();
          await lab.locator('[data-attitude-burn-toggle]').click();
          await event('burn-start');
          assert.equal(await reading('cmg-torque'), 0, 'A late burn brakes the body before gyro storage falls');
          assert((await reading('rate')) > 0);
          await event('burn-end');
          assert.equal(await reading('rate'), 0);
          assert((await reading('angle')) > 2);
          assert.equal(await lab.locator('[data-attitude-outcome]').getAttribute('data-attitude-outcome'), 'offset');
          await lab.locator('[data-attitude-preset="unload"]').click();
          await lab.locator('#iss-attitude-burn-time').focus();
          await page.keyboard.press('Home');
          await page.keyboard.press('ArrowRight');
          await lab.locator('[data-attitude-burn-toggle]').click();
          assert.equal(await lab.locator('#iss-attitude-fuel').isDisabled(), true);
          assert.equal(await lab.locator('[data-attitude-event="burn-start"]').isDisabled(), true);
          await lab.locator('[data-attitude-preset="unload"]').click();
          await event('burn-start');
          await captureAttitude('ready');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Attitude lab stays within the viewport');
          console.log('Attitude drift, finite burns, fuel, comparison, playback, pointer and keyboard passed at ' + viewport.width + 'px');
        }
        if (tab === 'missions' && !accessibilityOnly && missionLabs.includes('docking')) {
          const dockCanvasBounds = await page.locator('[data-dock-canvas]').boundingBox();
          const thrusterBounds = await page.locator('[data-dock-thrusters]').boundingBox();
          assert(thrusterBounds.y >= dockCanvasBounds.y + dockCanvasBounds.height && thrusterBounds.y - dockCanvasBounds.y - dockCanvasBounds.height <= 12, 'Thrusters must stay directly below the flight display');
          const state = () => page.locator('[data-dock-canvas]').evaluate((canvas) => {
            const s = canvas._dockState;
            return { t: s.t, x: s.x, y: s.y, vx: s.vx, vy: s.vy, propellant: s.propellant, paused: s.paused, precision: s.precision, damp: s.damp };
          });
          await page.locator('[data-dock-pause]').click();
          const paused = await state();
          await page.waitForTimeout(350);
          assert.deepEqual(await state(), paused, 'Pause must freeze position, velocity, clock and propellant');
          await page.locator('[data-dock-precision]').click();
          assert.equal((await state()).precision, true);
          assert.equal(await page.locator('[data-dock-precision]').getAttribute('aria-pressed'), 'true');
          await page.locator('[data-dock-precision]').click();
          await page.getByRole('combobox', { name: 'Docking simulation clock speed' }).selectOption('1');
          await page.locator('[data-dock-pause]').click();
          const beforeThrust = await state();
          await page.getByRole('button', { name: 'Thrust Forward.', exact: false }).focus();
          await page.keyboard.down('Space');
          await page.waitForFunction(time => document.querySelector('[data-dock-canvas]')._dockState.t >= time + .25, beforeThrust.t, { timeout: 15000 });
          await page.keyboard.up('Space');
          const afterThrust = await state();
          assert(afterThrust.propellant < beforeThrust.propellant, 'Held keyboard thrust must consume propellant');
          assert(afterThrust.vy > beforeThrust.vy, 'Forward thrust must increase along-track velocity');
          await page.locator('[data-dock-damp]').click();
          const beforeHold = await state();
          await page.waitForFunction(time => document.querySelector('[data-dock-canvas]')._dockState.t >= time + .25, beforeHold.t, { timeout: 15000 });
          const afterHold = await state();
          assert.equal(afterHold.damp, true);
          assert(afterHold.propellant < beforeHold.propellant, 'Rate hold must consume propellant');
          assert(Math.hypot(afterHold.vx, afterHold.vy) < Math.hypot(beforeHold.vx, beforeHold.vy), 'Rate hold must reduce relative speed');
          await page.locator('[data-dock-pause]').click();
          await page.locator('[data-dock-canvas]').screenshot({ path: path.join(output, `docking-${viewport.width}.png`) });
          const forecastPanel = page.locator('[data-dock-forecast-panel]');
          await page.locator('[data-dock-scenario="final"]').focus();
          await page.keyboard.press('Enter');
          assert.equal((await state()).paused, true, 'Practice starts must open paused');
          assert.equal((await state()).y, -25);
          assert.equal((await state()).propellant, 80, 'Practice starts must restore fuel');
          assert.equal(await page.locator('[data-dock-scenario="final"]').getAttribute('aria-pressed'), 'true');
          await page.locator('[data-dock-horizon]').selectOption('30');
          assert.equal(await forecastPanel.getAttribute('data-dock-forecast-kind'), 'coast');
          assert.equal(await forecastPanel.locator('[data-dock-forecast-reading="time"]').textContent(), '+30.0 s');
          const beforeForecast = await state();
          await page.locator('[data-dock-horizon]').selectOption('120');
          assert.equal(await forecastPanel.getAttribute('data-dock-forecast-kind'), 'capture');
          assert.match(await forecastPanel.getAttribute('aria-label'), /Soft capture forecast.*all thrusters off/i);
          assert.deepEqual(await state(), beforeForecast, 'Forecast controls must not move the spacecraft or spend fuel');
          assert(parseFloat(await forecastPanel.locator('[data-dock-forecast-reading="time"]').textContent()) < 120, 'Forecast must stop at first contact');
          assert(parseFloat(await forecastPanel.locator('[data-dock-forecast-reading="speed"]').textContent()) <= .6);
          assert(parseFloat(await forecastPanel.locator('[data-dock-forecast-reading="offset"]').textContent()) < 2.5);
          const forecastBounds = await forecastPanel.boundingBox();
          assert(forecastBounds.x >= 0 && forecastBounds.x + forecastBounds.width <= viewport.width + 1, 'Forecast must fit on screen');
          await page.locator('[data-iss-dock-panel]').screenshot({ path: path.join(output, `docking-forecast-${viewport.width}.png`) });
          const closeCanvas = page.locator('[data-dock-canvas]');
          const closeView = await closeCanvas.screenshot();
          const beforeCamera = await state();
          await page.locator('[data-dock-camera="wide"]').click();
          assert.equal(await page.locator('[data-dock-camera="wide"]').getAttribute('aria-pressed'), 'true');
          assert.notEqual(Buffer.compare(closeView, await closeCanvas.screenshot()), 0, 'Wide camera must change the actual rendered geometry');
          await page.locator('[data-dock-camera="approach"]').click();
          assert.deepEqual(await state(), beforeCamera, 'Changing cameras must not change the flight state');
          const meterView = await closeCanvas.evaluate(canvas => canvas._dockViewSnapshot());
          assert(meterView.scale > 6, 'Close approach must magnify the docking opening');
          await closeCanvas.screenshot({ path: path.join(output, `docking-camera-${viewport.width}.png`) });
          const forecastTime = forecastPanel.locator('#iss-dock-forecast-time'), forecastNow = forecastPanel.locator('[data-dock-forecast-pick="now"]'), forecastEnd = forecastPanel.locator('[data-dock-forecast-pick="end"]');
          const inspectForecast = () => closeCanvas.evaluate(canvas => canvas._dockForecastInspection());
          // Read one coherent browser snapshot instead of a protocol round-trip per card.
          const readForecastInspection = seconds => closeCanvas.evaluate((canvas, time) => {
            const panel=canvas.ownerDocument.querySelector('[data-dock-forecast-panel]'), range=panel.querySelector('[data-dock-forecast-time]'), live=canvas._dockState, inspected=canvas._dockForecastInspection(), readings={};
            for(const node of panel.querySelectorAll('[data-dock-forecast-reading]'))readings[node.dataset.dockForecastReading]={text:node.textContent,value:node.getAttribute('data-value')};
            return {inspected,sample:canvas._dockForecastSample(time===undefined?inspected.time:time),readings,kind:panel.getAttribute('data-dock-forecast-kind'),
              range:{value:range.value,min:range.getAttribute('min'),max:range.getAttribute('max'),step:range.getAttribute('step'),disabled:range.disabled},
              nowDisabled:panel.querySelector('[data-dock-forecast-pick="now"]').disabled,endDisabled:panel.querySelector('[data-dock-forecast-pick="end"]').disabled,
              over:live.over,live:{t:live.t,x:live.x,y:live.y,vx:live.vx,vy:live.vy,propellant:live.propellant,paused:live.paused,precision:live.precision,damp:live.damp}};
          }, seconds);
          console.log('Checking docking forecast inspector at '+viewport.width+'px');
          const defaultSnapshot=await readForecastInspection(),defaultInspection=defaultSnapshot.inspected,forecastDuration=defaultInspection.duration,forecastKind=defaultSnapshot.kind,forecastStatus=defaultSnapshot.readings.status.text,forecastEndpoint=defaultSnapshot.readings.endpoint.text;
          assert.equal(forecastKind, 'capture');assert(forecastDuration > 0 && forecastDuration < 120);assert.equal(defaultInspection.followingEnd, true);assert.equal(defaultInspection.time, forecastDuration);assert.equal(defaultSnapshot.range.min,'0');assert.equal(Number(defaultSnapshot.range.max),forecastDuration);assert.equal(defaultSnapshot.range.step,'any');
          const forecastInspections = [], forecastNear = (actual, expected) => assert(Math.abs(actual-expected) <= Math.max(1e-10, Math.abs(expected)*1e-11), 'Forecast value '+actual+' differs from expected '+expected);
          const verifyInspection = async (time, follows) => {
            const snapshot=await readForecastInspection(time),inspected=snapshot.inspected,sample=snapshot.sample;
            forecastNear(inspected.time, time);if(follows!==undefined)assert.equal(inspected.followingEnd, follows);assert.equal(inspected.duration, forecastDuration);forecastNear(Number(snapshot.range.value), time);
            for(const key of ['x','y','vx','vy','time'])forecastNear(inspected[key], sample[key]);forecastNear(inspected.range, Math.hypot(inspected.x, inspected.y));forecastNear(inspected.offset, Math.abs(inspected.x));forecastNear(inspected.speed, Math.hypot(inspected.vx, inspected.vy));forecastNear(inspected.closing, inspected.range>0?-(inspected.x*inspected.vx+inspected.y*inspected.vy)/inspected.range:0);assert.equal(inspected.interval,20);assert.deepEqual(inspected.ticks,defaultInspection.ticks);assert(inspected.ticks.every((tick,index)=>tick.time===(index+1)*inspected.interval&&tick.time<forecastDuration));
            for(const [key,value] of [['time',inspected.time],['range',inspected.range],['offset',inspected.offset],['speed',inspected.speed],['radial',inspected.vx],['along',inspected.vy]])forecastNear(Number(snapshot.readings[key].value), value);
            assert.deepEqual(snapshot.live, beforeCamera, 'Inspecting a forecast must preserve live flight, controls and propellant');assert.equal(snapshot.kind,forecastKind);assert.equal(snapshot.readings.status.text,forecastStatus);assert.equal(snapshot.readings.endpoint.text,forecastEndpoint);forecastInspections.push(inspected);return inspected;
          };
          await verifyInspection(forecastDuration, true);const forecastEndCanvas = await closeCanvas.screenshot();await forecastNow.focus();await page.keyboard.press('Enter');const atNow = await verifyInspection(0, false);forecastNear(atNow.x, beforeCamera.x);forecastNear(atNow.y, beforeCamera.y);forecastNear(atNow.vx, beforeCamera.vx);forecastNear(atNow.vy, beforeCamera.vy);assert.notEqual(Buffer.compare(forecastEndCanvas, await closeCanvas.screenshot()), 0, 'Selected forecast ghost must move when inspecting Now');
          await forecastTime.focus();for(const [key,time,followingEnd] of [['Home',0,false],['ArrowRight',.5,false],['PageUp',5.5,false],['ArrowLeft',5,false],['PageDown',0,false],['End',forecastDuration,true]]){await page.keyboard.press(key);await verifyInspection(time, followingEnd);}assert.equal((await inspectForecast()).time, forecastDuration, 'End must retain the exact fractional terminal time');console.log('Docking inspector keyboard passed at '+viewport.width+'px');
          await forecastTime.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));const forecastRangeBox = await forecastTime.boundingBox(), forecastRangeY = forecastRangeBox.y+forecastRangeBox.height/2, forecastPointerX = f=>forecastRangeBox.x+forecastRangeBox.width*f;
          if(viewport.width<500){const touch=await page.context().newCDPSession(page);await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:forecastPointerX(.25),y:forecastRangeY,id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:forecastPointerX(.6),y:forecastRangeY,id:0}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();}
          else{await page.mouse.move(forecastPointerX(.25),forecastRangeY);await page.mouse.down();await page.mouse.move(forecastPointerX(.6),forecastRangeY,{steps:5});await page.mouse.up();}
          const pointerInspection = await inspectForecast();assert(pointerInspection.time>forecastDuration*.5&&pointerInspection.time<forecastDuration*.7, 'Native pointer range selects an intermediate forecast snapshot');await verifyInspection(pointerInspection.time, false);assert.notEqual(Buffer.compare(forecastEndCanvas, await closeCanvas.screenshot()), 0, 'Intermediate forecast must alter the canvas ghost');
          await closeCanvas.evaluate((canvas, seconds)=>canvas._dockSetForecastTime(seconds), forecastDuration/2);await verifyInspection(forecastDuration/2, false);console.log('Docking inspector pointer and ghost passed at '+viewport.width+'px');
          const inspectorFit = await forecastPanel.evaluate(panel=>({overflow:panel.scrollWidth>panel.clientWidth+1,cards:Array.from(panel.querySelectorAll('.iss-flight-reading'),card=>{const b=card.getBoundingClientRect();return{width:b.width,scroll:card.scrollWidth,client:card.clientWidth};})}));assert.equal(inspectorFit.overflow,false);assert(inspectorFit.cards.every(card=>card.scroll<=card.client+1), 'Forecast cards fit their cells');assert(await forecastTime.evaluate(n=>{const b=n.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1;}));
          if(!await page.evaluate(()=>Boolean(window.axe)))await page.addScriptTag({path:path.join(ROOT,'desktop/web-app/node_modules/axe-core/axe.min.js')});const inspectorA11y=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('[data-dock-forecast-panel]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:result.passes.length,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))};});assert.deepEqual(inspectorA11y.violations,[]);console.log('Docking inspector layout and accessibility passed at '+viewport.width+'px');
          await closeCanvas.screenshot({path:path.join(output,'docking-inspector-canvas-'+viewport.width+'.png')});await forecastPanel.screenshot({path:path.join(output,'docking-inspector-'+viewport.width+'.png'),animations:'disabled'});
          await forecastEnd.click();assert.equal((await inspectForecast()).time, forecastDuration);await verifyInspection(forecastDuration,true);await forecastNow.click();await page.locator('[data-dock-scenario="final"]').click();const resetInspection=await inspectForecast();assert.equal(resetInspection.followingEnd,true);assert.equal(resetInspection.time,resetInspection.duration);await verifyInspection(forecastDuration,true);await forecastTime.focus();await page.keyboard.press('End');
          const forecastCamera=page.locator('[data-dock-camera="forecast"]'),approachCamera=page.locator('[data-dock-camera="approach"]');
          const readPathCamera=()=>closeCanvas.evaluate(canvas=>{const view=canvas._dockViewSnapshot(),forecast=canvas._dockForecast();return{view,points:forecast.points.map(point=>({time:point.time,x:view.ox+point.y*view.scale,y:view.oy-point.x*view.scale})),port:[-2.5,2.5].map(radial=>({x:view.ox-5*view.scale,y:view.oy-radial*view.scale}))};});
          const assertPathFits=geometry=>{assert(Number.isFinite(geometry.view.scale)&&geometry.view.scale>0);for(const point of geometry.points.concat(geometry.port)){assert(point.x>=48-1e-8&&point.x<=560+1e-8,'Forecast camera keeps along-track coordinates inside flight area');assert(point.y>=150-1e-8&&point.y<=296+1e-8,'Forecast camera keeps radial coordinates inside flight area');}forecastNear(geometry.view.portX,geometry.port[0].x);};
          await forecastCamera.click();assert.equal(await forecastCamera.getAttribute('aria-pressed'),'true');const finalPathCamera=await readPathCamera();assertPathFits(finalPathCamera);await verifyInspection(forecastDuration,true);await forecastNow.click();await verifyInspection(0,false);assert.deepEqual((await readPathCamera()).view,finalPathCamera.view,'Scrubbing Now must not shift the fitted forecast camera');await forecastEnd.click();await verifyInspection(forecastDuration,true);assert.deepEqual((await readPathCamera()).view,finalPathCamera.view,'Following End must not shift the fitted forecast camera');
          await closeCanvas.evaluate(canvas=>canvas.scrollIntoView({block:'center',behavior:'instant'}));
          const forecastPick=await closeCanvas.evaluate(canvas=>{const box=canvas.getBoundingClientRect(),rect={left:box.left,top:box.top,width:box.width,height:box.height};if(canvas.offsetWidth>0&&canvas.offsetHeight>0){const sx=box.width/canvas.offsetWidth,sy=box.height/canvas.offsetHeight;rect.left+=canvas.clientLeft*sx;rect.top+=canvas.clientTop*sy;rect.width=canvas.clientWidth*sx;rect.height=canvas.clientHeight*sy;}const view=canvas._dockViewSnapshot(),sample=canvas._dockForecastSample(20),clientX=rect.left+(view.ox+sample.y*view.scale)/640*rect.width,clientY=rect.top+(view.oy-sample.x*view.scale)/360*rect.height,speedPixels=Math.hypot(sample.vy*view.scale*rect.width/640,sample.vx*view.scale*rect.height/360);return{sample,clientX,clientY,speedPixels,hit:canvas._dockForecastHitTest(clientX,clientY,rect)};});
          assert(forecastPick.hit);forecastNear(forecastPick.hit.time,20);assert(forecastPick.hit.distance<1e-7);assert(forecastPick.speedPixels>0);if(viewport.width<500)await page.touchscreen.tap(forecastPick.clientX,forecastPick.clientY);else await page.mouse.click(forecastPick.clientX,forecastPick.clientY);const canvasPicked=await inspectForecast();assert(Math.abs(canvasPicked.time-20)<=2/forecastPick.speedPixels+1e-7,'Canvas picks the forecast knot within native pointer pixel precision');await verifyInspection(canvasPicked.time,false);assert.deepEqual((await readPathCamera()).view,finalPathCamera.view);
          const emptyPick=await closeCanvas.evaluate(canvas=>{const box=canvas.getBoundingClientRect(),rect={left:box.left,top:box.top,width:box.width,height:box.height};if(canvas.offsetWidth>0&&canvas.offsetHeight>0){const sx=box.width/canvas.offsetWidth,sy=box.height/canvas.offsetHeight;rect.left+=canvas.clientLeft*sx;rect.top+=canvas.clientTop*sy;rect.width=canvas.clientWidth*sx;rect.height=canvas.clientHeight*sy;}const clientX=rect.left+rect.width*.5,clientY=rect.top+rect.height/6;return{clientX,clientY,hit:canvas._dockForecastHitTest(clientX,clientY,rect)};});assert.equal(emptyPick.hit,null);if(viewport.width<500)await page.touchscreen.tap(emptyPick.clientX,emptyPick.clientY);else await page.mouse.click(emptyPick.clientX,emptyPick.clientY);assert.equal((await inspectForecast()).time,canvasPicked.time,'Empty HUD click must not change the selected time');await verifyInspection(canvasPicked.time,false);await closeCanvas.screenshot({path:path.join(output,'docking-path-pick-'+viewport.width+'.png')});
          await approachCamera.click();await forecastEnd.click();await verifyInspection(forecastDuration,true);console.log('Docking fitted path camera and canvas pick passed at '+viewport.width+'px');
          dockingInspector={duration:forecastDuration,inspections:forecastInspections,pointerTime:pointerInspection.time,fit:inspectorFit,a11y:inspectorA11y,resetFollowsEnd:true,pathCamera:{final:finalPathCamera,pick:{expectedTime:20,actualTime:canvasPicked.time,hit:forecastPick.hit,pixelSpeed:forecastPick.speedPixels},emptyHudUnchanged:true}};
          const closestPanel=page.locator('[data-dock-closest-panel]'),closestButton=page.locator('[data-dock-closest-inspect]');
          const readClosestInspection=()=>closeCanvas.evaluate(canvas=>{const panel=canvas.ownerDocument.querySelector('[data-dock-closest-panel]'),forecastPanel=canvas.ownerDocument.querySelector('[data-dock-forecast-panel]'),live=canvas._dockState,closest=canvas._dockClosestApproach(),forecast=canvas._dockForecast(),readings={};for(const node of panel.querySelectorAll('[data-dock-closest-reading]'))readings[node.dataset.dockClosestReading]={text:node.textContent,value:node.getAttribute('data-value')};return{closest,sample:canvas._dockForecastSample(closest.time),inspected:canvas._dockForecastInspection(),view:canvas._dockViewSnapshot(),camera:live.camera,disabled:panel.querySelector('[data-dock-closest-inspect]').disabled,readings,kind:forecastPanel.getAttribute('data-dock-forecast-kind'),status:forecastPanel.querySelector('[data-dock-forecast-reading="status"]').textContent,endpoint:forecastPanel.querySelector('[data-dock-forecast-reading="endpoint"]').textContent,startRange:Math.hypot(forecast.points[0].x,forecast.points[0].y),endRange:Math.hypot(forecast.endpoint.x,forecast.endpoint.y),live:{t:live.t,x:live.x,y:live.y,vx:live.vx,vy:live.vy,propellant:live.propellant,paused:live.paused,precision:live.precision,damp:live.damp}};});
          const verifyClosestReading=snapshot=>{const closest=snapshot.closest;for(const key of ['time','range','x','y','vx','vy'])assert(Number.isFinite(closest[key]),'Closest approach '+key+' stays finite');for(const key of ['time','x','y','vx','vy'])forecastNear(closest[key],snapshot.sample[key]);forecastNear(closest.range,Math.hypot(closest.x,closest.y));forecastNear(Number(snapshot.readings.time.value),closest.time);forecastNear(Number(snapshot.readings.range.value),closest.range);assert(snapshot.readings.note.text.trim().length>0);assert.equal(snapshot.disabled,snapshot.inspected.duration===0);};
          const captureClosest=await readClosestInspection();verifyClosestReading(captureClosest);assert.equal(captureClosest.closest.boundary,'end');forecastNear(captureClosest.closest.time,forecastDuration);assert.equal(captureClosest.disabled,false);await closestButton.focus();await page.keyboard.press('Enter');const inspectedCaptureClosest=await readClosestInspection();verifyClosestReading(inspectedCaptureClosest);await verifyInspection(captureClosest.closest.time,false);assert.equal(inspectedCaptureClosest.camera,'forecast');assert.deepEqual(inspectedCaptureClosest.live,captureClosest.live);assertPathFits(await readPathCamera());
          await page.locator('[data-dock-scenario="flyby"]').click();await page.locator('[data-dock-horizon]').selectOption('120');const flybyClosest=await readClosestInspection();verifyClosestReading(flybyClosest);assert.equal(flybyClosest.live.paused,true);assert.equal(flybyClosest.live.t,0);assert.equal(flybyClosest.live.x,85);assert.equal(flybyClosest.live.y,-55);assert.equal(flybyClosest.live.vx,-.1);assert.equal(flybyClosest.live.vy,1.2);assert.equal(flybyClosest.closest.boundary,'interior');assert(flybyClosest.closest.time>0&&flybyClosest.closest.time<flybyClosest.inspected.duration);assert(flybyClosest.closest.range<flybyClosest.startRange&&flybyClosest.closest.range<flybyClosest.endRange,'Flyby closest approach must precede increasing separation');assert.equal(flybyClosest.inspected.followingEnd,true);const flybyEndCanvas=await closeCanvas.screenshot();
          if(viewport.width<500)await closestButton.tap();else{await closestButton.focus();await page.keyboard.press('Enter');}const selectedClosest=await readClosestInspection();verifyClosestReading(selectedClosest);forecastNear(selectedClosest.inspected.time,flybyClosest.closest.time);for(const key of ['x','y','vx','vy','range'])forecastNear(selectedClosest.inspected[key],flybyClosest.closest[key]);assert.equal(selectedClosest.inspected.followingEnd,false);assert.equal(selectedClosest.camera,'forecast');assert.deepEqual(selectedClosest.live,flybyClosest.live);assert.deepEqual(selectedClosest.closest,flybyClosest.closest);assert.equal(selectedClosest.kind,flybyClosest.kind);assert.equal(selectedClosest.status,flybyClosest.status);assert.equal(selectedClosest.endpoint,flybyClosest.endpoint);const flybyPathCamera=await readPathCamera();assertPathFits(flybyPathCamera);assert.notEqual(Buffer.compare(flybyEndCanvas,await closeCanvas.screenshot()),0,'Inspect closest must move the selected ghost and reveal its range guide');
          await forecastNow.click();const scrubbedClosest=await readClosestInspection();verifyClosestReading(scrubbedClosest);assert.equal(scrubbedClosest.inspected.time,0);assert.deepEqual(scrubbedClosest.closest,flybyClosest.closest,'Closest approach remains a property of the whole forecast while scrubbing');assert.deepEqual(scrubbedClosest.live,flybyClosest.live);assert.deepEqual(scrubbedClosest.view,selectedClosest.view);assert.equal(scrubbedClosest.status,flybyClosest.status);assert.equal(scrubbedClosest.endpoint,flybyClosest.endpoint);if(viewport.width<500)await closestButton.tap();else await closestButton.click();
          const closestFit=await closestPanel.evaluate(panel=>{const bounds=panel.getBoundingClientRect();return{left:bounds.left,right:bounds.right,viewport:innerWidth,overflow:panel.scrollWidth>panel.clientWidth+1,children:Array.from(panel.querySelectorAll('[data-dock-closest-reading],button'),node=>({scroll:node.scrollWidth,client:node.clientWidth}))};});assert(closestFit.left>=0&&closestFit.right<=closestFit.viewport+1);assert.equal(closestFit.overflow,false);assert(closestFit.children.every(node=>node.scroll<=node.client+1),'Closest-approach controls and readings fit their cells');const closestA11y=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('[data-dock-closest-panel]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:result.passes.length,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))};});assert.deepEqual(closestA11y.violations,[]);await closeCanvas.screenshot({path:path.join(output,'docking-closest-canvas-'+viewport.width+'.png')});await closestPanel.screenshot({path:path.join(output,'docking-closest-inspector-'+viewport.width+'.png'),animations:'disabled'});dockingInspector.closest={capture:captureClosest.closest,flyby:flybyClosest.closest,selected:selectedClosest.inspected,fit:closestFit,a11y:closestA11y};
          const rangePanel=page.locator('[data-dock-range-panel]'),rangeTimeline=page.locator('[data-dock-range-timeline]');
          const readRangeTimeline=()=>closeCanvas.evaluate(canvas=>{
            const doc=canvas.ownerDocument,panel=doc.querySelector('[data-dock-range-panel]'),svg=panel.querySelector('[data-dock-range-timeline]'),box=svg.getBoundingClientRect(),viewBox=svg.viewBox.baseVal,geometry=canvas._dockRangeTimeline(viewBox.width),live=canvas._dockState,readings={};
            for(const node of panel.querySelectorAll('[data-dock-range-reading]'))readings[node.dataset.dockRangeReading]={text:node.textContent,value:node.getAttribute('data-value')};
            const cursor=svg.querySelector('[data-dock-range-cursor]'),dot=svg.querySelector('[data-dock-range-dot]'),diamond=svg.querySelector('[data-dock-range-closest]').getBBox(),forecastPanel=doc.querySelector('[data-dock-forecast-panel]');
            return{geometry,knots:canvas._dockForecast().points.map(point=>({time:point.time,range:Math.hypot(point.x,point.y)})),inspected:canvas._dockForecastInspection(),sample:canvas._dockForecastSample(geometry.selected.time),closest:canvas._dockClosestApproach(),view:canvas._dockViewSnapshot(),readings,
              live:{t:live.t,x:live.x,y:live.y,vx:live.vx,vy:live.vy,propellant:live.propellant,paused:live.paused,precision:live.precision,damp:live.damp,thrust:Object.assign({},live.thrust),camera:live.camera},
              status:forecastPanel.querySelector('[data-dock-forecast-reading="status"]').textContent,endpoint:forecastPanel.querySelector('[data-dock-forecast-reading="endpoint"]').textContent,inputValue:Number(doc.querySelector('[data-dock-forecast-time]').value),
              rect:{left:box.left,top:box.top,width:box.width,height:box.height},viewBox:{width:viewBox.width,height:viewBox.height},role:svg.getAttribute('role'),tabIndex:svg.getAttribute('tabindex'),disabled:svg.getAttribute('aria-disabled'),min:svg.getAttribute('aria-valuemin'),max:svg.getAttribute('aria-valuemax'),now:svg.getAttribute('aria-valuenow'),label:svg.getAttribute('aria-label'),
              curve:svg.querySelector('[data-dock-range-curve]').getAttribute('d'),cursor:{x1:Number(cursor.getAttribute('x1')),x2:Number(cursor.getAttribute('x2')),y1:Number(cursor.getAttribute('y1')),y2:Number(cursor.getAttribute('y2'))},dot:{cx:Number(dot.getAttribute('cx')),cy:Number(dot.getAttribute('cy'))},diamond:{cx:diamond.x+diamond.width/2,cy:diamond.y+diamond.height/2,width:diamond.width,height:diamond.height},
              captured:svg._qaRangePointerId===undefined?null:svg.hasPointerCapture(svg._qaRangePointerId)};
          });
          const rangePixelNear=(actual,expected)=>assert(Math.abs(actual-expected)<=.15,'Rendered range-timeline coordinate matches its physical scale');
          const verifyRangeGeometry=snapshot=>{
            const g=snapshot.geometry;assert.equal(g.height,184);assert.equal(g.left,50);assert.equal(g.right,g.width-18);assert.equal(g.top,22);assert.equal(g.bottom,142);assert.equal(snapshot.viewBox.height,184);forecastNear(snapshot.viewBox.width,g.width);assert(Math.abs(snapshot.rect.width-g.width)<=1);assert(Math.abs(snapshot.rect.height-184)<=1);assert(g.rangeMax>0&&Number.isFinite(g.rangeMax));assert.equal(g.duration,snapshot.inspected.duration);assert.equal(snapshot.role,'slider');assert(snapshot.label&&snapshot.label.trim());assert.equal(Number(snapshot.min),0);forecastNear(Number(snapshot.max),g.duration);forecastNear(Number(snapshot.now),g.selected.time);forecastNear(snapshot.inputValue,g.selected.time);
            for(const point of g.points.concat([g.selected,g.closest])){forecastNear(point.px,g.left+(g.duration?point.time/g.duration:0)*(g.right-g.left));forecastNear(point.py,g.bottom-point.range/g.rangeMax*(g.bottom-g.top));assert(point.range>=0&&point.range<=g.rangeMax);assert(point.py>=g.top-1e-7&&point.py<=g.bottom+1e-7);}
            assert.equal(g.points[0].time,0);forecastNear(g.points[g.points.length-1].time,g.duration);if(g.duration>0)forecastNear(g.points[g.points.length-1].px,g.right);for(const knot of snapshot.knots){const plotted=g.points.find(point=>point.time===knot.time);assert(plotted,'The curve includes every forecast knot');forecastNear(plotted.range,knot.range);}
            for(const key of ['time','range','x','y','vx','vy','closing']){forecastNear(g.selected[key],snapshot.inspected[key]);forecastNear(g.selected[key],snapshot.sample[key]);forecastNear(g.closest[key],snapshot.closest[key]);}
            forecastNear(g.selected.range,Math.hypot(g.selected.x,g.selected.y));forecastNear(g.selected.closing,g.selected.range?-(g.selected.x*g.selected.vx+g.selected.y*g.selected.vy)/g.selected.range:0);
            for(const key of ['time','range','closing'])forecastNear(Number(snapshot.readings[key].value),g.selected[key]);assert(snapshot.readings.motion.text.trim());
            rangePixelNear(snapshot.cursor.x1,g.selected.px);rangePixelNear(snapshot.cursor.x2,g.selected.px);rangePixelNear(snapshot.cursor.y1,g.top);rangePixelNear(snapshot.cursor.y2,g.bottom);rangePixelNear(snapshot.dot.cx,g.selected.px);rangePixelNear(snapshot.dot.cy,g.selected.py);rangePixelNear(snapshot.diamond.cx,g.closest.px);rangePixelNear(snapshot.diamond.cy,g.closest.py);assert(snapshot.diamond.width>0&&snapshot.diamond.height>0);
            const curveNumbers=(snapshot.curve.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number);assert.equal(curveNumbers.length,g.points.length*2);g.points.forEach((point,index)=>{rangePixelNear(curveNumbers[index*2],point.px);rangePixelNear(curveNumbers[index*2+1],point.py);});
          };
          const initialRange=await readRangeTimeline();verifyRangeGeometry(initialRange);assert.equal(initialRange.disabled,'false');assert.equal(initialRange.tabIndex,'0');const rangeChecks=[];
          const verifyRangeSelection=async(time,followingEnd,tolerance=1e-10)=>{
            // Native touchmove delivery can trail its protocol acknowledgement.
            // Wait for the requested seek, then inspect one coherent snapshot.
            try{await page.waitForFunction(({expected,tolerance})=>{const canvas=document.querySelector('[data-dock-canvas]');return canvas&&Math.abs(canvas._dockForecastInspection().time-expected)<=tolerance;},{expected:time,tolerance},{timeout:15000,polling:100});}
            catch(error){const pending=await closeCanvas.evaluate(canvas=>{const svg=canvas.ownerDocument.querySelector('[data-dock-range-timeline]'),box=svg.getBoundingClientRect();return{actual:canvas._dockForecastInspection().time,ariaNow:svg.getAttribute('aria-valuenow'),pointerId:svg._qaRangePointerId,captured:svg._qaRangePointerId===undefined?null:svg.hasPointerCapture(svg._qaRangePointerId),rect:{left:box.left,top:box.top,width:box.width,height:box.height},paused:canvas._dockState.paused};});throw new Error('Timeline seek did not arrive within 15 seconds: '+JSON.stringify({expected:time,tolerance,...pending}),{cause:error});}
            const snapshot=await readRangeTimeline();verifyRangeGeometry(snapshot);assert(Math.abs(snapshot.inspected.time-time)<=tolerance,'Timeline selects the requested forecast time');if(followingEnd!==undefined)assert.equal(snapshot.inspected.followingEnd,followingEnd);assert.deepEqual(snapshot.live,initialRange.live,'Range inspection must preserve live flight, fuel, thrust and controls');assert.deepEqual(snapshot.closest,initialRange.closest);assert.deepEqual(snapshot.view,initialRange.view);assert.deepEqual(snapshot.knots,initialRange.knots);for(const key of ['left','right','top','bottom','width','height','duration','rangeMax'])assert.equal(snapshot.geometry[key],initialRange.geometry[key],'Scrubbing preserves timeline '+key);assert.equal(snapshot.status,initialRange.status);assert.equal(snapshot.endpoint,initialRange.endpoint);rangeChecks.push({time:snapshot.inspected.time,range:snapshot.inspected.range,closing:snapshot.inspected.closing,followingEnd:snapshot.inspected.followingEnd});return snapshot;
          };
          await rangeTimeline.focus();for(const [key,time,followingEnd] of [['Home',0,false],['ArrowRight',.5,false],['PageUp',5.5,false],['ArrowLeft',5,false],['PageDown',0,false],['End',initialRange.geometry.duration,true]]){await page.keyboard.press(key);await verifyRangeSelection(time,followingEnd);}assert.match((await readRangeTimeline()).readings.motion.text,/Opening/i);console.log('Docking range timeline keyboard passed at '+viewport.width+'px');
          await rangeTimeline.evaluate(svg=>{svg.scrollIntoView({block:'center',behavior:'instant'});svg.addEventListener('pointerdown',event=>{svg._qaRangePointerId=event.pointerId;},{once:true});});const rangePointer=await readRangeTimeline(),rg=rangePointer.geometry,rr=rangePointer.rect,rangeClientX=f=>rr.left+(rg.left+f*(rg.right-rg.left))/rg.width*rr.width,rangeClientY=rr.top+(rg.top+rg.bottom)/2/rg.height*rr.height,rangeTolerance=2*rg.duration/(rg.right-rg.left)*rg.width/rr.width+1e-7;
          const rangeOutsideRight={x:rr.left+(rg.right+10)/rg.width*rr.width,y:rr.top+rr.height+10},rangeOutsideLeft={x:rr.left+(rg.left-10)/rg.width*rr.width,y:rr.top-10};
          let rangeTouch=null;if(viewport.width<500){rangeTouch=await page.context().newCDPSession(page);await rangeTouch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rangeClientX(.25),y:rangeClientY,id:0}]});}else{await page.mouse.move(rangeClientX(.25),rangeClientY);await page.mouse.down();}await verifyRangeSelection(rg.duration*.25,false,rangeTolerance);
          if(rangeTouch)await rangeTouch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rangeClientX(.6),y:rangeClientY,id:0}]});else await page.mouse.move(rangeClientX(.6),rangeClientY);await verifyRangeSelection(rg.duration*.6,false,rangeTolerance);
          if(rangeTouch)await rangeTouch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rangeOutsideRight.x,y:rangeOutsideRight.y,id:0}]});else await page.mouse.move(rangeOutsideRight.x,rangeOutsideRight.y);const rightRangeClamp=await verifyRangeSelection(rg.duration,false);assert.equal(rightRangeClamp.captured,true,'Timeline keeps pointer capture while seeking outside its vertical bounds');
          if(rangeTouch)await rangeTouch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rangeOutsideLeft.x,y:rangeOutsideLeft.y,id:0}]});else await page.mouse.move(rangeOutsideLeft.x,rangeOutsideLeft.y);const leftRangeClamp=await verifyRangeSelection(0,false);assert.equal(leftRangeClamp.captured,true);assert.match(leftRangeClamp.readings.motion.text,/Closing/i);
          if(rangeTouch){await rangeTouch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await rangeTouch.detach();}else await page.mouse.up();const releasedRange=await verifyRangeSelection(0,false);assert.equal(releasedRange.captured,false,'Pointer release or cancellation clears timeline capture');await page.mouse.move(rangeClientX(.6),rangeClientY);await verifyRangeSelection(0,false);if(viewport.width<500)await page.touchscreen.tap(rangeClientX(.6),rangeClientY);else await page.mouse.click(rangeClientX(.6),rangeClientY);await verifyRangeSelection(rg.duration*.6,false,rangeTolerance);
          await forecastNow.click();const timelineNow=await verifyRangeSelection(0,false);assert.match(timelineNow.readings.motion.text,/Closing/i);await forecastEnd.click();const timelineEnd=await verifyRangeSelection(rg.duration,true);assert.match(timelineEnd.readings.motion.text,/Opening/i);await closestButton.click();const timelineClosest=await verifyRangeSelection(initialRange.closest.time,false);assert.match(timelineClosest.readings.motion.text,/Nearly steady range|Range steady/i);console.log('Docking range timeline captured pointer and synchronized controls passed at '+viewport.width+'px');
          const rangeFit=await rangePanel.evaluate(panel=>{const svg=panel.querySelector('[data-dock-range-timeline]'),box=panel.getBoundingClientRect(),view=svg.viewBox.baseVal;return{left:box.left,right:box.right,viewport:innerWidth,overflow:panel.scrollWidth>panel.clientWidth+1,children:Array.from(panel.querySelectorAll('[data-dock-range-reading]'),node=>({scroll:node.scrollWidth,client:node.clientWidth})),texts:Array.from(svg.querySelectorAll('text'),node=>{const b=node.getBBox();return{text:node.textContent,fontSize:parseFloat(getComputedStyle(node).fontSize),left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height};}),width:view.width,height:view.height};});assert(rangeFit.left>=0&&rangeFit.right<=rangeFit.viewport+1);assert.equal(rangeFit.overflow,false);assert(rangeFit.children.every(node=>node.scroll<=node.client+1));assert(rangeFit.texts.length>0);for(const label of rangeFit.texts){assert(label.fontSize>=10,'Timeline labels retain readable CSS-pixel text size');assert(label.left>=-.5&&label.right<=rangeFit.width+.5&&label.top>=-.5&&label.bottom<=rangeFit.height+.5,'Timeline labels fit the SVG at each viewport');}
          const rangeA11y=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('[data-dock-range-panel]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:result.passes.length,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))};});assert.deepEqual(rangeA11y.violations,[]);await rangePanel.screenshot({path:path.join(output,'docking-range-timeline-'+viewport.width+'.png'),animations:'disabled'});await closeCanvas.screenshot({path:path.join(output,'docking-range-canvas-'+viewport.width+'.png')});dockingInspector.rangeTimeline={duration:rg.duration,checks:rangeChecks,fit:rangeFit,a11y:rangeA11y,capturedClamp:true,cancellation:viewport.width<500};
          const referencePanel=page.locator('[data-dock-reference-panel]'),referenceSave=page.locator('[data-dock-reference-save]'),referenceClear=page.locator('[data-dock-reference-clear]'),referenceShared=page.locator('[data-dock-reference-shared]');
          const activateReference=async control=>{if(viewport.width<500)await control.tap();else{await control.focus();await page.keyboard.press('Enter');}};
          const waitReferenceTime=time=>page.waitForFunction(expected=>Math.abs(document.querySelector('[data-dock-canvas]')._dockForecastInspection().time-expected)<1e-7,time,{timeout:5000});
          const readSavedCoast=()=>closeCanvas.evaluate(canvas=>{
            const doc=canvas.ownerDocument,panel=doc.querySelector('[data-dock-reference-panel]'),svg=doc.querySelector('[data-dock-range-timeline]'),live=canvas._dockState,readings={};for(const node of panel.querySelectorAll('[data-dock-reference-reading]'))readings[node.dataset.dockReferenceReading]={text:node.textContent,value:node.getAttribute('data-value')};
            const path=svg.querySelector('[data-dock-range-reference]'),dot=svg.querySelector('[data-dock-range-reference-dot]'),end=svg.querySelector('[data-dock-range-reference-end]'),forecastPanel=doc.querySelector('[data-dock-forecast-panel]');
            return{reference:canvas._dockCoastReference(),comparison:canvas._dockCoastComparison(),geometry:canvas._dockRangeTimeline(svg.viewBox.baseVal.width),inspection:canvas._dockForecastInspection(),forecast:canvas._dockForecast(),view:canvas._dockViewSnapshot(),readings,
              live:{t:live.t,x:live.x,y:live.y,vx:live.vx,vy:live.vy,propellant:live.propellant,paused:live.paused,precision:live.precision,damp:live.damp,camera:live.camera,timeScale:live.timeScale,pulseSeconds:live.pulseSeconds,deltaV:live.deltaV,thrust:Object.assign({},live.thrust),firing:Object.assign({},live.firing),lastManeuver:live.lastManeuver},
              status:forecastPanel.querySelector('[data-dock-forecast-reading="status"]').textContent,endpoint:forecastPanel.querySelector('[data-dock-forecast-reading="endpoint"]').textContent,
              buttons:{save:panel.querySelector('[data-dock-reference-save]').disabled,saveText:panel.querySelector('[data-dock-reference-save]').textContent,clear:panel.querySelector('[data-dock-reference-clear]').disabled,shared:panel.querySelector('[data-dock-reference-shared]').disabled},
              curve:{d:path.getAttribute('d'),visibility:path.getAttribute('visibility'),dash:getComputedStyle(path).strokeDasharray},dot:{cx:Number(dot.getAttribute('cx')),cy:Number(dot.getAttribute('cy')),visibility:dot.getAttribute('visibility')},end:{cx:Number(end.getAttribute('cx')),cy:Number(end.getAttribute('cy')),visibility:end.getAttribute('visibility')},legendHidden:doc.querySelector('[data-dock-reference-key]').hidden,detailsHidden:panel.querySelector('[data-dock-reference-values]').hidden};
          });
          const verifySavedCoast=snapshot=>{
            const c=snapshot.comparison,g=snapshot.geometry,reference=snapshot.reference;assert.equal(c.active,Boolean(reference));assert.equal(c.available,Boolean(c.reference));forecastNear(c.missionTime,snapshot.live.t+snapshot.inspection.time);for(const key of ['time','range','speed','x','y','vx','vy'])forecastNear(c.current[key],snapshot.inspection[key]);assert.equal(snapshot.buttons.save,snapshot.inspection.duration===0);assert.equal(snapshot.buttons.clear,!reference);assert.equal(snapshot.buttons.shared,c.sharedEnd===null||snapshot.inspection.duration===0);assert.equal(snapshot.legendHidden,!reference);assert.equal(snapshot.detailsHidden,!reference);assert(snapshot.readings.status.text.trim());assert(snapshot.readings.epoch.text.trim());
            const projected=g.referencePoints.concat(g.referenceSelected?[g.referenceSelected]:[],g.referenceEnd?[g.referenceEnd]:[]);for(const point of projected){forecastNear(point.px,g.left+(g.duration?point.time/g.duration:0)*(g.right-g.left));if(g.metric==='closing'){forecastNear(point.value,point.closing);forecastNear(point.py,g.bottom-(point.value-g.valueMin)/(g.valueMax-g.valueMin)*(g.bottom-g.top));assert(point.value>=g.valueMin&&point.value<=g.valueMax);}else{forecastNear(point.py,g.bottom-point.range/g.rangeMax*(g.bottom-g.top));assert(point.range<=g.rangeMax);}forecastNear(point.range,Math.hypot(point.x,point.y));forecastNear(point.closing,point.range?-(point.x*point.vx+point.y*point.vy)/point.range:0);forecastNear(point.savedTime,snapshot.live.t+point.time-reference.epoch);assert(point.time>=-1e-8&&point.time<=g.duration+1e-8);assert(point.range>=0);assert(point.savedTime>=-1e-8&&point.savedTime<=reference.forecast.endpoint.time+1e-8);}
            if(reference&&c.sharedEnd!==null)for(const knot of reference.forecast.points){const lookAhead=reference.epoch+knot.time-snapshot.live.t;if(lookAhead<c.sharedStart-1e-8||lookAhead>c.sharedEnd+1e-8)continue;const plotted=g.referencePoints.find(point=>Math.abs(point.savedTime-knot.time)<1e-8);assert(plotted,'The saved curve retains each visible saved forecast knot');for(const key of ['x','y','vx','vy'])forecastNear(plotted[key],knot[key]);forecastNear(plotted.range,Math.hypot(knot.x,knot.y));}
            const numbers=(snapshot.curve.d.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number);assert.equal(numbers.length,g.referencePoints.length*2);g.referencePoints.forEach((point,index)=>{rangePixelNear(numbers[index*2],point.px);rangePixelNear(numbers[index*2+1],point.py);});assert.equal(snapshot.curve.visibility,g.referencePoints.length?'visible':'hidden');if(g.referencePoints.length){assert.notEqual(snapshot.curve.dash,'none');assert(snapshot.curve.dash.match(/[1-9]/));forecastNear(g.referencePoints[0].time,c.sharedStart);forecastNear(g.referencePoints[g.referencePoints.length-1].time,c.sharedEnd);assert(g.referenceEnd);forecastNear(g.referenceEnd.time,c.sharedEnd);rangePixelNear(snapshot.end.cx,g.referenceEnd.px);rangePixelNear(snapshot.end.cy,g.referenceEnd.py);assert.equal(snapshot.end.visibility,'visible');}else{assert.equal(snapshot.curve.d,'');assert.equal(g.referenceEnd,null);assert.equal(snapshot.end.visibility,'hidden');}
            if(c.available){assert(reference);assert(g.referenceSelected);forecastNear(c.epoch,reference.epoch);forecastNear(c.reference.time,c.missionTime-reference.epoch);forecastNear(c.deltaRange,c.current.range-c.reference.range);forecastNear(c.deltaSpeed,c.current.speed-c.reference.speed);forecastNear(c.deltaClosing,c.current.closing-c.reference.closing);forecastNear(Number(snapshot.readings.range.value),g.metric==='closing'?c.reference.closing:c.reference.range);forecastNear(Number(snapshot.readings.delta.value),g.metric==='closing'?c.deltaClosing:c.deltaRange);forecastNear(g.referenceSelected.time,snapshot.inspection.time);forecastNear(g.referenceSelected.savedTime,c.reference.time);forecastNear(g.referenceSelected.range,c.reference.range);rangePixelNear(snapshot.dot.cx,g.referenceSelected.px);rangePixelNear(snapshot.dot.cy,g.referenceSelected.py);assert.equal(snapshot.dot.visibility,'visible');}
            else{assert.equal(c.reference,null);assert.equal(c.deltaRange,null);assert.equal(c.deltaSpeed,null);assert.equal(c.deltaClosing,null);assert.equal(g.referenceSelected,null);assert.equal(snapshot.dot.visibility,'hidden');for(const key of ['range','delta']){assert.equal(snapshot.readings[key].value,null);assert.equal(snapshot.readings[key].text.trim(),'—');}}
          };
          const verifyOriginalSavedSample=(actual,expected)=>{for(const key of ['time','x','y','vx','vy','range','speed','closing'])forecastNear(actual[key],expected[key]);};
          await closeCanvas.evaluate(canvas=>canvas._dockSetForecastTime(30));await waitReferenceTime(30);const beforeSave=await readSavedCoast();verifySavedCoast(beforeSave);assert.equal(beforeSave.reference,null);const originalSavedSamples=await closeCanvas.evaluate(canvas=>({at2:canvas._dockForecastSample(2),at7:canvas._dockForecastSample(7),at30:canvas._dockForecastSample(30),at32:canvas._dockForecastSample(32),at37:canvas._dockForecastSample(37)}));
          await activateReference(referenceSave);await page.waitForFunction(()=>document.querySelector('[data-dock-canvas]')._dockCoastReference()!==null,null,{timeout:5000});const savedCoast=await readSavedCoast();verifySavedCoast(savedCoast);assert.deepEqual(savedCoast.live,beforeSave.live,'Saving a coast preserves the entire flight and controls');assert.deepEqual(savedCoast.inspection,beforeSave.inspection);assert.deepEqual(savedCoast.forecast,beforeSave.forecast);forecastNear(savedCoast.reference.epoch,savedCoast.live.t);assert.deepEqual(savedCoast.reference.forecast,beforeSave.forecast);assert.match(savedCoast.buttons.saveText,/Replace saved coast/i);assert.match(savedCoast.readings.epoch.text,/Saved at MET 0\.00 s/i);forecastNear(savedCoast.comparison.deltaRange,0);forecastNear(savedCoast.comparison.deltaSpeed,0);verifyOriginalSavedSample(savedCoast.comparison.reference,originalSavedSamples.at30);
          await page.locator('[data-dock-pulse-seconds]').selectOption('2');const beforeReferencePulse=await readSavedCoast();await activateReference(page.locator('[data-dock-maneuver="back"]'));await page.waitForFunction(time=>document.querySelector('[data-dock-canvas]')._dockState.t>=time+1.9999,beforeReferencePulse.live.t,{timeout:5000});const pulsedReference=await readSavedCoast();verifySavedCoast(pulsedReference);forecastNear(pulsedReference.live.t-beforeReferencePulse.live.t,2);assert(pulsedReference.live.propellant<beforeReferencePulse.live.propellant);assert(pulsedReference.live.vy<beforeReferencePulse.live.vy);assert.equal(pulsedReference.live.paused,true);assert.deepEqual(pulsedReference.reference,savedCoast.reference,'The saved coast survives a real braking pulse unchanged');forecastNear(pulsedReference.inspection.time,30);verifyOriginalSavedSample(pulsedReference.comparison.reference,originalSavedSamples.at32);assert(Math.abs(pulsedReference.comparison.deltaRange)>1e-4,'A real pulse separates the current and saved coast predictions');for(const key of ['x','y','vx','vy','range'])forecastNear(pulsedReference.geometry.referencePoints[0][key],originalSavedSamples.at2[key]);
          await activateReference(page.locator('[data-dock-maneuver="coast"]'));await page.waitForFunction(time=>document.querySelector('[data-dock-canvas]')._dockState.t>=time+4.9999,pulsedReference.live.t,{timeout:5000});const coastedReference=await readSavedCoast();verifySavedCoast(coastedReference);forecastNear(coastedReference.live.t-pulsedReference.live.t,5);assert.equal(coastedReference.live.propellant,pulsedReference.live.propellant);assert.deepEqual(coastedReference.reference,savedCoast.reference);verifyOriginalSavedSample(coastedReference.comparison.reference,originalSavedSamples.at37);forecastNear(coastedReference.geometry.referencePoints[0].time,0);for(const key of ['x','y','vx','vy','range'])forecastNear(coastedReference.geometry.referencePoints[0][key],originalSavedSamples.at7[key]);forecastNear(coastedReference.comparison.sharedEnd,savedCoast.reference.epoch+savedCoast.reference.forecast.endpoint.time-coastedReference.live.t);assert(coastedReference.inspection.duration>coastedReference.comparison.sharedEnd);
          const coastWindowAxes=Object.fromEntries(['left','right','top','bottom','width','height','duration','rangeMax'].map(key=>[key,coastedReference.geometry[key]]));const verifyReferenceInspection=snapshot=>{verifySavedCoast(snapshot);assert.deepEqual(snapshot.live,coastedReference.live,'Comparing the saved coast does not burn fuel or move the spacecraft');assert.deepEqual(snapshot.reference,savedCoast.reference);assert.deepEqual(snapshot.forecast,coastedReference.forecast);assert.deepEqual(snapshot.view,coastedReference.view);assert.deepEqual(snapshot.geometry.referenceEnd,coastedReference.geometry.referenceEnd);for(const point of snapshot.geometry.referencePoints){const sameTime=coastedReference.geometry.referencePoints.find(previous=>Math.abs(previous.savedTime-point.savedTime)<1e-8);if(sameTime)for(const key of ['time','savedTime','x','y','vx','vy','range','px','py'])forecastNear(point[key],sameTime[key]);}for(const [key,value] of Object.entries(coastWindowAxes))assert.equal(snapshot.geometry[key],value);assert.equal(snapshot.status,coastedReference.status);assert.equal(snapshot.endpoint,coastedReference.endpoint);};
          await activateReference(referenceShared);await waitReferenceTime(coastedReference.comparison.sharedEnd);const sharedReference=await readSavedCoast();verifyReferenceInspection(sharedReference);assert.equal(sharedReference.inspection.followingEnd,false);forecastNear(sharedReference.comparison.reference.time,savedCoast.reference.forecast.endpoint.time);forecastNear(sharedReference.comparison.missionTime,savedCoast.reference.epoch+savedCoast.reference.forecast.endpoint.time);for(const key of ['x','y','vx','vy'])forecastNear(sharedReference.comparison.reference[key],savedCoast.reference.forecast.endpoint[key]);
          await forecastEnd.click();await waitReferenceTime(coastedReference.inspection.duration);const beyondReference=await readSavedCoast();verifyReferenceInspection(beyondReference);assert.equal(beyondReference.comparison.available,false);assert.equal(beyondReference.buttons.shared,false);assert.match(beyondReference.readings.status.text,/beyond the saved coast/i);assert.equal(beyondReference.curve.visibility,'visible');assert.equal(beyondReference.end.visibility,'visible');
          await activateReference(referenceShared);await waitReferenceTime(coastedReference.comparison.sharedEnd);const referenceScreenshot=await readSavedCoast();verifyReferenceInspection(referenceScreenshot);verifyRangeGeometry(await readRangeTimeline());const comparisonFit=await readPathCamera();assertPathFits(comparisonFit);for(const point of referenceScreenshot.geometry.referencePoints){const x=referenceScreenshot.view.ox+point.y*referenceScreenshot.view.scale,y=referenceScreenshot.view.oy-point.x*referenceScreenshot.view.scale;assert(x>=48-1e-8&&x<=560+1e-8&&y>=150-1e-8&&y<=296+1e-8,'The fitted camera includes the remaining saved coast');}
          const savedFit=await referencePanel.evaluate(panel=>{const box=panel.getBoundingClientRect();return{left:box.left,right:box.right,viewport:innerWidth,overflow:panel.scrollWidth>panel.clientWidth+1,children:Array.from(panel.querySelectorAll('[data-dock-reference-reading],button'),node=>({scroll:node.scrollWidth,client:node.clientWidth}))};});assert(savedFit.left>=0&&savedFit.right<=savedFit.viewport+1);assert.equal(savedFit.overflow,false);assert(savedFit.children.every(node=>node.scroll<=node.client+1),'Saved-coast metadata, controls and readings fit their cells');const savedA11y=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('[data-dock-reference-panel]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:result.passes.length,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))};});assert.deepEqual(savedA11y.violations,[]);await closeCanvas.screenshot({path:path.join(output,'docking-saved-coast-canvas-'+viewport.width+'.png')});await rangeTimeline.screenshot({path:path.join(output,'docking-saved-coast-timeline-'+viewport.width+'.png'),animations:'disabled'});await referencePanel.screenshot({path:path.join(output,'docking-saved-coast-panel-'+viewport.width+'.png'),animations:'disabled'});
          const closingMetricButton=page.locator('[data-dock-timeline-metric="closing"]'),rangeMetricButton=page.locator('[data-dock-timeline-metric="range"]');
          const waitTimelineMetric=metric=>page.waitForFunction(expected=>document.querySelector('[data-dock-canvas]')._dockTimelineMetric()===expected,metric,{timeout:5000});
          const readMetricTimeline=async()=>{const [snapshot,presentation]=await Promise.all([readSavedCoast(),closeCanvas.evaluate(canvas=>{
            const doc=canvas.ownerDocument,svg=doc.querySelector('[data-dock-range-timeline]'),panel=doc.querySelector('[data-dock-range-panel]'),g=canvas._dockRangeTimeline(svg.viewBox.baseVal.width),zero=svg.querySelector('[data-dock-range-zero]'),readings={},labels={};
            for(const node of panel.querySelectorAll('[data-dock-range-reading]'))readings[node.dataset.dockRangeReading]={text:node.textContent,value:node.getAttribute('data-value')};for(const node of panel.querySelectorAll('[data-dock-reference-label]'))labels[node.dataset.dockReferenceLabel]=node.textContent;
            return{metric:canvas._dockTimelineMetric(),title:doc.querySelector('#iss-dock-range-title').textContent,label:svg.getAttribute('aria-label'),units:svg.querySelector('[data-dock-range-units]').textContent,help:panel.querySelector('[data-dock-range-mode-help]').textContent,
              pressed:{range:panel.querySelector('[data-dock-timeline-metric="range"]').getAttribute('aria-pressed'),closing:panel.querySelector('[data-dock-timeline-metric="closing"]').getAttribute('aria-pressed')},readings,labels,
              zero:{x1:Number(zero.getAttribute('x1')),x2:Number(zero.getAttribute('x2')),y1:Number(zero.getAttribute('y1')),y2:Number(zero.getAttribute('y2')),width:parseFloat(getComputedStyle(zero).strokeWidth),visibility:getComputedStyle(zero).visibility},
              curve:svg.querySelector('[data-dock-range-curve]').getAttribute('d'),fill:svg.querySelector('[data-dock-range-fill]').getAttribute('d'),dot:{cx:Number(svg.querySelector('[data-dock-range-dot]').getAttribute('cx')),cy:Number(svg.querySelector('[data-dock-range-dot]').getAttribute('cy'))},
              samples:g.points.map(point=>canvas._dockForecastSample(point.time)),ticks:Array.from(svg.querySelectorAll('[data-dock-range-y-tick]'),node=>({index:Number(node.dataset.dockRangeYTick),text:node.textContent,x:Number(node.getAttribute('x')),y:Number(node.getAttribute('y'))})),captured:svg._qaMetricPointerId===undefined?false:svg.hasPointerCapture(svg._qaMetricPointerId)};
          })]);return{...snapshot,presentation};};
          const verifyClosingGeometry=snapshot=>{
            verifySavedCoast(snapshot);const g=snapshot.geometry,p=snapshot.presentation;assert.equal(g.metric,'closing');assert.equal(p.metric,'closing');assert.equal(p.pressed.closing,'true');assert.equal(p.pressed.range,'false');assert.match(p.title,/Closing rate through the coast/i);assert.match(p.label,/closing[- ]rate/i);assert.match(p.units,/m\/s/);assert(p.help.trim());assert.match(p.labels.range,/Saved closing rate/i);assert.match(p.labels.delta,/Closing.rate change/i);assert(g.valueMin<0&&g.valueMax>0);forecastNear(g.valueMin,-g.valueMax);forecastNear(g.zeroY,(g.top+g.bottom)/2);rangePixelNear(p.zero.x1,g.left);rangePixelNear(p.zero.x2,g.right);rangePixelNear(p.zero.y1,g.zeroY);rangePixelNear(p.zero.y2,g.zeroY);assert.equal(p.zero.visibility,'visible');assert(p.zero.width>=1.2,'Closing-rate zero line remains visually distinct');assert.equal(p.ticks.length,3);for(const tick of p.ticks){const value=g.valueMin+(g.valueMax-g.valueMin)*tick.index/2;forecastNear(Number(tick.text),value);rangePixelNear(tick.x,g.left-8);rangePixelNear(tick.y,g.bottom-tick.index/2*(g.bottom-g.top)+4);if(value>0)assert.match(tick.text,/^\+/);if(value<0)assert.match(tick.text,/^-/);}
            const allPoints=g.points.concat([g.selected,g.closest],g.referencePoints,g.referenceSelected?[g.referenceSelected]:[],g.referenceEnd?[g.referenceEnd]:[]);for(const point of allPoints){forecastNear(point.value,point.closing);forecastNear(point.px,g.left+(g.duration?point.time/g.duration:0)*(g.right-g.left));forecastNear(point.py,g.bottom-(point.value-g.valueMin)/(g.valueMax-g.valueMin)*(g.bottom-g.top));assert(point.value>=g.valueMin-1e-10&&point.value<=g.valueMax+1e-10);}
            g.points.forEach((point,index)=>{const sample=p.samples[index];forecastNear(point.time,sample.time);forecastNear(point.range,sample.range);forecastNear(point.closing,sample.range?-(sample.x*sample.vx+sample.y*sample.vy)/sample.range:0);});forecastNear(g.selected.closing,snapshot.inspection.closing);forecastNear(Number(p.readings.closing.value),snapshot.inspection.closing);forecastNear(Number(p.readings.time.value),snapshot.inspection.time);forecastNear(Number(p.readings.range.value),snapshot.inspection.range);rangePixelNear(p.dot.cx,g.selected.px);rangePixelNear(p.dot.cy,g.selected.py);
            const numbers=pathData=>(pathData.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number),curve=numbers(p.curve),fill=numbers(p.fill);assert.equal(curve.length,g.points.length*2);g.points.forEach((point,index)=>{rangePixelNear(curve[index*2],point.px);rangePixelNear(curve[index*2+1],point.py);});assert.equal(fill.length,curve.length+4);curve.forEach((coordinate,index)=>rangePixelNear(fill[index],coordinate));rangePixelNear(fill[fill.length-4],g.points[g.points.length-1].px);rangePixelNear(fill[fill.length-3],g.zeroY);rangePixelNear(fill[fill.length-2],g.left);rangePixelNear(fill[fill.length-1],g.zeroY);
            if(snapshot.comparison.available){assert.match(snapshot.readings.range.text,/m\/s/);assert.match(snapshot.readings.delta.text,/m\/s/);forecastNear(snapshot.comparison.deltaClosing,snapshot.comparison.current.closing-snapshot.comparison.reference.closing);}
          };
          const beforeClosing=await readSavedCoast();assert.equal(beforeClosing.geometry.metric,'range');await activateReference(closingMetricButton);await waitTimelineMetric('closing');const closingInitial=await readMetricTimeline();verifyClosingGeometry(closingInitial);for(const key of ['live','inspection','comparison','reference','forecast','view'])assert.deepEqual(closingInitial[key],beforeClosing[key],'Changing timeline metric preserves '+key);const closingAxes=Object.fromEntries(['width','height','left','right','top','bottom','duration','valueMin','valueMax','zeroY'].map(key=>[key,closingInitial.geometry[key]]));const closingChecks=[];
          const verifyClosingInspection=async(time,followingEnd)=>{await waitReferenceTime(time);const snapshot=await readMetricTimeline();verifyClosingGeometry(snapshot);forecastNear(snapshot.inspection.time,time);if(followingEnd!==undefined)assert.equal(snapshot.inspection.followingEnd,followingEnd);for(const key of ['live','reference','forecast','view'])assert.deepEqual(snapshot[key],closingInitial[key],'Closing-rate inspection preserves '+key);for(const [key,value] of Object.entries(closingAxes))assert.equal(snapshot.geometry[key],value,'Closing-rate scale remains fixed while seeking');assert.equal(snapshot.status,closingInitial.status);assert.equal(snapshot.endpoint,closingInitial.endpoint);closingChecks.push({time:snapshot.inspection.time,closing:snapshot.inspection.closing,available:snapshot.comparison.available,deltaClosing:snapshot.comparison.deltaClosing});return snapshot;};
          await forecastNow.click();const closingNow=await verifyClosingInspection(0,false);assert(closingNow.inspection.closing>0);assert(closingNow.geometry.selected.py<closingNow.geometry.zeroY);assert.match(closingNow.presentation.readings.motion.text,/Closing/i);verifyOriginalSavedSample(closingNow.comparison.reference,originalSavedSamples.at7);
          await forecastEnd.click();const closingEnd=await verifyClosingInspection(closingInitial.inspection.duration,true);assert(closingEnd.inspection.closing<0);assert(closingEnd.geometry.selected.py>closingEnd.geometry.zeroY);assert.match(closingEnd.presentation.readings.motion.text,/Opening/i);assert.equal(closingEnd.comparison.available,false);assert.equal(closingEnd.dot.visibility,'hidden');assert.equal(closingEnd.curve.visibility,'visible');assert.match(closingEnd.readings.status.text,/beyond the saved coast/i);
          await closestButton.click();const closingClosest=await verifyClosingInspection(closingInitial.geometry.closest.time,false);assert(Math.abs(closingClosest.inspection.closing)<1e-7);rangePixelNear(closingClosest.geometry.selected.py,closingClosest.geometry.zeroY);assert.match(closingClosest.presentation.readings.motion.text,/Nearly steady range|Range steady/i);
          await activateReference(referenceShared);const closingShared=await verifyClosingInspection(closingInitial.comparison.sharedEnd,false);assert.equal(closingShared.comparison.available,true);forecastNear(closingShared.comparison.reference.time,savedCoast.reference.forecast.endpoint.time);forecastNear(closingShared.comparison.missionTime,savedCoast.reference.epoch+savedCoast.reference.forecast.endpoint.time);assert(Math.abs(closingShared.comparison.deltaClosing)>1e-5,'The braking pulse changes the same-time closing rate');
          const closingFit=await rangePanel.evaluate(panel=>{const svg=panel.querySelector('[data-dock-range-timeline]'),box=panel.getBoundingClientRect(),view=svg.viewBox.baseVal;return{left:box.left,right:box.right,viewport:innerWidth,overflow:panel.scrollWidth>panel.clientWidth+1,children:Array.from(panel.querySelectorAll('[data-dock-range-reading],[data-dock-reference-reading],[data-dock-reference-label],[data-dock-timeline-metric]'),node=>({scroll:node.scrollWidth,client:node.clientWidth})),labels:Array.from(svg.querySelectorAll('text'),node=>{const b=node.getBBox();return{text:node.textContent,font:parseFloat(getComputedStyle(node).fontSize),left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height};}),width:view.width,height:view.height};});assert(closingFit.left>=0&&closingFit.right<=closingFit.viewport+1);assert.equal(closingFit.overflow,false);assert(closingFit.children.every(node=>node.scroll<=node.client+1),'Closing-rate labels and readings fit their cells');for(const label of closingFit.labels){assert(label.font>=10);assert(label.left>=-.5&&label.right<=closingFit.width+.5&&label.top>=-.5&&label.bottom<=closingFit.height+.5,'Signed closing-rate axes remain readable at each viewport');}
          const closingA11y=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('[data-dock-range-panel]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:result.passes.length,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))};});assert.deepEqual(closingA11y.violations,[]);await rangePanel.screenshot({path:path.join(output,'docking-closing-rate-panel-'+viewport.width+'.png'),animations:'disabled'});await rangeTimeline.screenshot({path:path.join(output,'docking-closing-rate-timeline-'+viewport.width+'.png'),animations:'disabled'});await referencePanel.screenshot({path:path.join(output,'docking-closing-rate-reference-'+viewport.width+'.png'),animations:'disabled'});
          await rangeTimeline.evaluate(svg=>{svg.scrollIntoView({block:'center',behavior:'instant'});svg.addEventListener('pointerdown',event=>{svg._qaMetricPointerId=event.pointerId;},{once:true});});const metricPointerBox=await rangeTimeline.boundingBox(),metricPointerX=f=>metricPointerBox.x+(closingInitial.geometry.left+f*(closingInitial.geometry.right-closingInitial.geometry.left))/closingInitial.geometry.width*metricPointerBox.width,metricPointerY=metricPointerBox.y+metricPointerBox.height*.5;let metricTouch=null;if(viewport.width<500){metricTouch=await page.context().newCDPSession(page);await metricTouch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:metricPointerX(.4),y:metricPointerY,id:0}]});}else{await page.mouse.move(metricPointerX(.4),metricPointerY);await page.mouse.down();}await page.waitForFunction(()=>{const svg=document.querySelector('[data-dock-range-timeline]');return svg._qaMetricPointerId!==undefined&&svg.hasPointerCapture(svg._qaMetricPointerId);},null,{timeout:5000});const beforeMetricCancel=await readMetricTimeline();verifyClosingGeometry(beforeMetricCancel);assert(beforeMetricCancel.presentation.captured);await closeCanvas.evaluate(canvas=>canvas._dockSetTimelineMetric('range'));await waitTimelineMetric('range');await page.waitForFunction(()=>{const svg=document.querySelector('[data-dock-range-timeline]');return !svg.hasPointerCapture(svg._qaMetricPointerId);},null,{timeout:5000});const cancelledMetric=await readMetricTimeline();verifySavedCoast(cancelledMetric);for(const key of ['live','inspection','comparison','reference','forecast','view'])assert.deepEqual(cancelledMetric[key],beforeMetricCancel[key],'Metric switch cancels the gesture without changing '+key);
          if(metricTouch){await metricTouch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:metricPointerX(.7),y:metricPointerY,id:0}]});await metricTouch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await metricTouch.detach();}else{await page.mouse.move(metricPointerX(.7),metricPointerY);await page.mouse.up();}const afterMetricCancel=await readMetricTimeline();assert.equal(afterMetricCancel.presentation.captured,false);assert.deepEqual(afterMetricCancel.inspection,cancelledMetric.inspection,'A cancelled timeline drag cannot continue seeking');
          await activateReference(closingMetricButton);await waitTimelineMetric('closing');await activateReference(referenceShared);await verifyClosingInspection(closingInitial.comparison.sharedEnd,false);await activateReference(rangeMetricButton);await waitTimelineMetric('range');const restoredMetric=await readSavedCoast();verifyReferenceInspection(restoredMetric);assert.deepEqual(restoredMetric.inspection,beforeClosing.inspection);assert.deepEqual(restoredMetric.geometry,beforeClosing.geometry,'Range geometry returns unchanged after closing-rate inspection');dockingInspector.closingRate={checks:closingChecks,axes:closingAxes,fit:closingFit,a11y:closingA11y,cancelledGesture:true,restoredRange:true};console.log('Docking closing-rate metric, saved comparison and gesture cancellation passed at '+viewport.width+'px');
          const velocityPanel=page.locator('[data-dock-velocity-panel]'),velocityMap=page.locator('[data-dock-velocity-map]'),velocityComponents=page.locator('[data-dock-velocity-components]');
          const readVelocityMap=async()=>{const [saved,presentation]=await Promise.all([readSavedCoast(),closeCanvas.evaluate(canvas=>{
            const doc=canvas.ownerDocument,panel=doc.querySelector('[data-dock-velocity-panel]'),svg=panel.querySelector('[data-dock-velocity-map]'),box=svg.getBoundingClientRect(),viewBox=svg.viewBox.baseVal,geometry=canvas._dockVelocityMap(viewBox.width),readings={};for(const node of panel.querySelectorAll('[data-dock-velocity-reading]'))readings[node.dataset.dockVelocityReading]={text:node.textContent,value:node.getAttribute('data-value')};
            const line=selector=>{const n=svg.querySelector(selector);return{x1:Number(n.getAttribute('x1')),y1:Number(n.getAttribute('y1')),x2:Number(n.getAttribute('x2')),y2:Number(n.getAttribute('y2')),visibility:getComputedStyle(n).visibility};},dot=selector=>{const n=svg.querySelector(selector);return{cx:Number(n.getAttribute('cx')),cy:Number(n.getAttribute('cy')),visibility:getComputedStyle(n).visibility};},path=selector=>{const n=svg.querySelector(selector);return{d:n.getAttribute('d'),visibility:getComputedStyle(n).visibility};},near=svg.querySelector('[data-dock-velocity-closest]').getBBox();
            return{geometry,readings,components:canvas._dockVelocityComponents(),pressed:panel.querySelector('[data-dock-velocity-components]').getAttribute('aria-pressed'),componentPath:path('[data-dock-velocity-components-lines]'),current:line('[data-dock-velocity-current]'),currentDot:dot('[data-dock-velocity-current-dot]'),reference:line('[data-dock-velocity-reference]'),referenceDot:dot('[data-dock-velocity-reference-dot]'),curve:path('[data-dock-velocity-path]'),referenceCurve:path('[data-dock-velocity-reference-path]'),closest:{cx:near.x+near.width/2,cy:near.y+near.height/2,width:near.width,height:near.height},
              role:svg.getAttribute('role'),tabIndex:svg.getAttribute('tabindex'),disabled:svg.getAttribute('aria-disabled'),min:Number(svg.getAttribute('aria-valuemin')),max:Number(svg.getAttribute('aria-valuemax')),now:Number(svg.getAttribute('aria-valuenow')),pickable:svg.getAttribute('data-pickable'),label:svg.getAttribute('aria-label'),help:panel.querySelector('[data-dock-velocity-help]').textContent,
              width:viewBox.width,height:viewBox.height,rect:{left:box.left,top:box.top,width:box.width,height:box.height},xTicks:Array.from(svg.querySelectorAll('[data-dock-velocity-x-tick]'),n=>({index:Number(n.dataset.dockVelocityXTick),text:n.textContent,x:Number(n.getAttribute('x')),y:Number(n.getAttribute('y'))})),yTicks:Array.from(svg.querySelectorAll('[data-dock-velocity-y-tick]'),n=>({index:Number(n.dataset.dockVelocityYTick),text:n.textContent,x:Number(n.getAttribute('x')),y:Number(n.getAttribute('y'))})),samples:geometry.points.map(point=>canvas._dockForecastSample(point.time))};
          })]);return{...saved,velocity:presentation};};
          const verifyVelocityMap=snapshot=>{
            verifySavedCoast(snapshot);const p=snapshot.velocity,g=p.geometry;assert.equal(p.role,'slider');assert.equal(p.tabIndex,'0');assert.equal(p.disabled,String(g.duration===0));assert.equal(p.pickable,String(g.pickable));assert.equal(p.min,0);forecastNear(p.max,g.duration);forecastNear(p.now,g.selected.time);assert(p.label&&p.help.trim());assert.equal(g.height,260);assert.equal(p.height,260);forecastNear(p.width,g.width);assert(Math.abs(p.rect.width-g.width)<=1);assert(Math.abs(p.rect.height-260)<=1);forecastNear(g.cx,g.width/2);assert.equal(g.cy,128);forecastNear(g.radius,Math.min(90,Math.max(1,(g.width-96)/2)));assert(g.limit>0&&Number.isFinite(g.limit));forecastNear(g.scale,g.radius/g.limit);forecastNear(g.left,g.cx-g.radius);forecastNear(g.right,g.cx+g.radius);forecastNear(g.top,g.cy-g.radius);forecastNear(g.bottom,g.cy+g.radius);forecastNear(g.duration,snapshot.inspection.duration);
            const points=g.points.concat(g.pickPoints,[g.selected,g.closest],g.referencePoints,g.referenceSelected?[g.referenceSelected]:[]);for(const point of points){forecastNear(point.px,g.cx+point.vy*g.scale);forecastNear(point.py,g.cy-point.vx*g.scale);forecastNear(point.speed,Math.hypot(point.vx,point.vy));assert(Math.hypot(point.px-g.cx,point.py-g.cy)<=g.radius+1e-7,'The velocity scale contains both complete forecasts');}assert.equal(g.pickPoints.length,snapshot.forecast.points.length);g.pickPoints.forEach((point,index)=>{const original=snapshot.forecast.points[index];for(const key of ['time','vx','vy'])forecastNear(point[key],original[key]);});g.points.forEach((point,index)=>{for(const key of ['time','x','y','vx','vy','speed','range'])forecastNear(point[key],p.samples[index][key]);});for(const key of ['time','x','y','vx','vy','speed','range'])forecastNear(g.selected[key],snapshot.inspection[key]);forecastNear(Number(p.readings.time.value),snapshot.inspection.time);forecastNear(Number(p.readings.speed.value),snapshot.inspection.speed);assert(p.readings.motion.text.trim());
            const checkLine=(line,point)=>{rangePixelNear(line.x1,g.cx);rangePixelNear(line.y1,g.cy);rangePixelNear(line.x2,point.px);rangePixelNear(line.y2,point.py);},checkDot=(dot,point)=>{rangePixelNear(dot.cx,point.px);rangePixelNear(dot.cy,point.py);},pathNumbers=value=>(value.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number),checkPath=(path,points)=>{const numbers=pathNumbers(path.d);assert.equal(numbers.length,points.length*2);points.forEach((point,index)=>{rangePixelNear(numbers[index*2],point.px);rangePixelNear(numbers[index*2+1],point.py);});};
            checkLine(p.current,g.selected);checkDot(p.currentDot,g.selected);assert.equal(p.current.visibility,'visible');assert.equal(p.currentDot.visibility,'visible');checkPath(p.curve,g.points);checkPath(p.referenceCurve,g.referencePoints);assert.equal(p.referenceCurve.visibility,g.referencePoints.length?'visible':'hidden');rangePixelNear(p.closest.cx,g.closest.px);rangePixelNear(p.closest.cy,g.closest.py);assert(p.closest.width>0&&p.closest.height>0);assert.equal(p.pressed,String(p.components));assert.equal(p.componentPath.visibility,p.components?'visible':'hidden');const components=pathNumbers(p.componentPath.d);assert.equal(components.length,4);[g.cx,g.cy,g.selected.px,g.selected.py].forEach((value,index)=>rangePixelNear(components[index],value));
            if(snapshot.comparison.available){assert(g.referenceSelected);for(const key of ['x','y','vx','vy','speed','range'])forecastNear(g.referenceSelected[key],snapshot.comparison.reference[key]);forecastNear(g.referenceSelected.time,snapshot.inspection.time);forecastNear(g.referenceSelected.savedTime,snapshot.comparison.reference.time);checkLine(p.reference,g.referenceSelected);checkDot(p.referenceDot,g.referenceSelected);assert.equal(p.reference.visibility,'visible');assert.equal(p.referenceDot.visibility,'visible');}else{assert.equal(g.referenceSelected,null);assert.equal(p.reference.visibility,'hidden');assert.equal(p.referenceDot.visibility,'hidden');}
            for(const point of g.referencePoints){forecastNear(point.savedTime,snapshot.live.t+point.time-snapshot.reference.epoch);assert(point.savedTime>=-1e-8&&point.savedTime<=snapshot.reference.forecast.endpoint.time+1e-8);}assert.equal(p.xTicks.length,3);assert.equal(p.yTicks.length,3);for(const tick of p.xTicks.concat(p.yTicks)){forecastNear(Number(tick.text),tick.index*g.limit);if(tick.index>0)assert.match(tick.text,/^\+/);if(tick.index<0)assert.match(tick.text,/^-/);}for(const tick of p.xTicks){rangePixelNear(tick.x,g.cx+tick.index*g.radius);rangePixelNear(tick.y,g.bottom+17);}for(const tick of p.yTicks){rangePixelNear(tick.x,g.left-8);rangePixelNear(tick.y,g.cy-tick.index*g.radius+4);}
          };
          const velocityInitial=await readVelocityMap();verifyVelocityMap(velocityInitial);assert.equal(velocityInitial.velocity.components,true);assert.equal(velocityInitial.velocity.geometry.pickable,true);const velocityAxes=Object.fromEntries(['width','height','cx','cy','radius','limit','scale','left','right','top','bottom','duration'].map(key=>[key,velocityInitial.velocity.geometry[key]])),velocityChecks=[];
          const verifyVelocitySelection=async(time,followingEnd)=>{await waitReferenceTime(time);const snapshot=await readVelocityMap();verifyVelocityMap(snapshot);forecastNear(snapshot.inspection.time,time);if(followingEnd!==undefined)assert.equal(snapshot.inspection.followingEnd,followingEnd);for(const key of ['live','reference','forecast','view'])assert.deepEqual(snapshot[key],velocityInitial[key],'Velocity-map inspection preserves '+key);for(const [key,value] of Object.entries(velocityAxes))assert.equal(snapshot.velocity.geometry[key],value,'Velocity axes remain fixed during inspection');assert.equal(snapshot.status,velocityInitial.status);assert.equal(snapshot.endpoint,velocityInitial.endpoint);velocityChecks.push({time:snapshot.inspection.time,vx:snapshot.inspection.vx,vy:snapshot.inspection.vy,speed:snapshot.inspection.speed,referenceAvailable:snapshot.comparison.available});return snapshot;};
          await velocityMap.focus();for(const [key,time,followingEnd] of [['Home',0,false],['ArrowRight',.5,false],['PageUp',5.5,false],['ArrowLeft',5,false],['PageDown',0,false],['End',velocityInitial.inspection.duration,true]]){await page.keyboard.press(key);await verifyVelocitySelection(time,followingEnd);}const velocityExpired=await readVelocityMap();assert.equal(velocityExpired.comparison.available,false);assert.equal(velocityExpired.velocity.reference.visibility,'hidden');assert.equal(velocityExpired.velocity.referenceCurve.visibility,'visible');await closestButton.click();const velocityAtClosest=await verifyVelocitySelection(velocityInitial.velocity.geometry.closest.time,false);assert(Math.abs(velocityAtClosest.inspection.closing)<1e-7);assert(velocityAtClosest.inspection.speed>.01,'Closest range can retain substantial sideways velocity');assert.match(velocityAtClosest.velocity.readings.motion.text,/Almost steady range; motion remains/i);await activateReference(referenceShared);await verifyVelocitySelection(velocityInitial.comparison.sharedEnd,false);
          const nativeVelocityTarget=async kind=>{
            await velocityMap.hover({timeout:5000});
            const target=await velocityMap.evaluate((svg,kind)=>{const canvas=svg.closest('[data-iss-dock-panel]').querySelector('[data-dock-canvas]'),rect=svg.getBoundingClientRect(),g=canvas._dockVelocityMap(rect.width),point=kind==='origin'?{px:g.cx,py:g.cy}:kind==='selected'?g.selected:g.pickPoints.find(point=>point.time===20);if(!point)throw new Error('Expected the 20-second velocity knot');const x=rect.left+point.px/g.width*rect.width,y=rect.top+point.py/g.height*rect.height,node=document.elementFromPoint(x,y);svg._qaVelocityNative=null;svg.addEventListener('click',event=>{const box=svg.getBoundingClientRect();svg._qaVelocityNative={x:event.clientX,y:event.clientY,hit:canvas._dockVelocityHitTest(event.clientX,event.clientY,box)};},{once:true,capture:true});let pixelSpeed=null;if(kind==='knot'){const index=g.pickPoints.indexOf(point),a=g.pickPoints[Math.max(0,index-1)],b=g.pickPoints[Math.min(g.pickPoints.length-1,index+1)];pixelSpeed=Math.hypot((b.px-a.px)*rect.width/g.width,(b.py-a.py)*rect.height/g.height)/(b.time-a.time);}return{x,y,inside:!!node&&svg.contains(node),point,pixelSpeed,hit:canvas._dockVelocityHitTest(x,y,rect)};},kind);
            assert(target.inside,'Native velocity input targets the settled SVG');if(viewport.width<500)await page.touchscreen.tap(target.x,target.y);else await page.mouse.click(target.x,target.y);await page.waitForFunction(()=>document.querySelector('[data-dock-velocity-map]')._qaVelocityNative!==null,null,{timeout:5000});const event=await velocityMap.evaluate(svg=>svg._qaVelocityNative);if(event.hit)await waitReferenceTime(event.hit.time);return{target,event};
          };
          const velocityPick=await nativeVelocityTarget('knot');assert(velocityPick.target.hit);forecastNear(velocityPick.target.hit.time,20);assert(velocityPick.target.hit.distance<1e-7);assert(velocityPick.event.hit);assert(velocityPick.target.pixelSpeed>0);assert(Math.abs(velocityPick.event.hit.time-20)<=2/velocityPick.target.pixelSpeed+1e-7,'Native velocity pick stays within pointer pixel precision');const velocityPicked=await verifyVelocitySelection(velocityPick.event.hit.time,false);const velocityEmpty=await nativeVelocityTarget('origin');assert.equal(velocityEmpty.target.hit,null);assert.equal(velocityEmpty.event.hit,null);await verifyVelocitySelection(velocityPicked.inspection.time,false);
          const beforeComponents=await readVelocityMap();await activateReference(velocityComponents);await page.waitForFunction(()=>document.querySelector('[data-dock-canvas]')._dockVelocityComponents()===false,null,{timeout:5000});const hiddenComponents=await readVelocityMap();verifyVelocityMap(hiddenComponents);assert.equal(hiddenComponents.velocity.components,false);for(const key of ['live','inspection','comparison','reference','forecast','view'])assert.deepEqual(hiddenComponents[key],beforeComponents[key],'Component display does not alter '+key);assert.deepEqual(hiddenComponents.velocity.geometry,beforeComponents.velocity.geometry);await activateReference(velocityComponents);await page.waitForFunction(()=>document.querySelector('[data-dock-canvas]')._dockVelocityComponents()===true,null,{timeout:5000});await activateReference(referenceShared);const velocityShared=await verifyVelocitySelection(velocityInitial.comparison.sharedEnd,false);assert.equal(velocityShared.velocity.components,true);assert.equal(velocityShared.comparison.available,true);forecastNear(velocityShared.velocity.geometry.referenceSelected.savedTime,savedCoast.reference.forecast.endpoint.time);
          const velocityFit=await velocityPanel.evaluate(panel=>{const svg=panel.querySelector('[data-dock-velocity-map]'),box=panel.getBoundingClientRect(),view=svg.viewBox.baseVal;return{left:box.left,right:box.right,viewport:innerWidth,overflow:panel.scrollWidth>panel.clientWidth+1,children:Array.from(panel.querySelectorAll('[data-dock-velocity-reading],button'),node=>({scroll:node.scrollWidth,client:node.clientWidth})),labels:Array.from(svg.querySelectorAll('text'),node=>{const b=node.getBBox();return{text:node.textContent,font:parseFloat(getComputedStyle(node).fontSize),left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height};}),width:view.width,height:view.height};});assert(velocityFit.left>=0&&velocityFit.right<=velocityFit.viewport+1);assert.equal(velocityFit.overflow,false);assert(velocityFit.children.every(node=>node.scroll<=node.client+1));for(const label of velocityFit.labels){assert(label.font>=10,'Velocity labels retain native readable text sizes');assert(label.left>=-.5&&label.right<=velocityFit.width+.5&&label.top>=-.5&&label.bottom<=velocityFit.height+.5,'Velocity axes fit on each viewport');}const velocityA11y=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('[data-dock-velocity-panel]'),{rules:{'color-contrast':{enabled:false},region:{enabled:false}}});return{passes:result.passes.length,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))};});assert.deepEqual(velocityA11y.violations,[]);await velocityPanel.screenshot({path:path.join(output,'docking-velocity-map-'+viewport.width+'.png'),animations:'disabled'});await closeCanvas.screenshot({path:path.join(output,'docking-velocity-canvas-'+viewport.width+'.png')});dockingInspector.velocityMap={checks:velocityChecks,pick:{expected:20,actual:velocityPicked.inspection.time,native:velocityPick.event.hit},emptyPickUnchanged:true,componentsPreserveState:true,fit:velocityFit,a11y:velocityA11y};assert.deepEqual(velocityShared.inspection,velocityInitial.inspection);assert.deepEqual(velocityShared.geometry,velocityInitial.geometry);console.log('Docking velocity map geometry, native picks and components passed at '+viewport.width+'px');
          await page.locator('[data-dock-horizon]').selectOption('30');await waitReferenceTime(30);const shortenedReference=await readSavedCoast();verifySavedCoast(shortenedReference);assert.deepEqual(shortenedReference.reference,savedCoast.reference,'Changing the current horizon preserves the complete saved prediction');assert.deepEqual(shortenedReference.live,coastedReference.live);assert.equal(shortenedReference.inspection.duration,30);assert.equal(shortenedReference.comparison.sharedEnd,30);assert.equal(shortenedReference.geometry.referenceEnd.time,30);verifyOriginalSavedSample(shortenedReference.comparison.reference,originalSavedSamples.at37);forecastNear(shortenedReference.geometry.referenceEnd.savedTime,37);
          await activateReference(referenceSave);await page.waitForFunction(()=>{const canvas=document.querySelector('[data-dock-canvas]'),reference=canvas._dockCoastReference();return reference&&reference.epoch===canvas._dockState.t&&reference.forecast.horizon===30;},null,{timeout:5000});const replacedReference=await readSavedCoast();verifySavedCoast(replacedReference);assert.deepEqual(replacedReference.live,shortenedReference.live);assert.deepEqual(replacedReference.inspection,shortenedReference.inspection);forecastNear(replacedReference.reference.epoch,7);assert.deepEqual(replacedReference.reference.forecast,shortenedReference.forecast);forecastNear(replacedReference.comparison.deltaRange,0);forecastNear(replacedReference.comparison.deltaSpeed,0);
          await activateReference(referenceClear);await page.waitForFunction(()=>document.querySelector('[data-dock-canvas]')._dockCoastReference()===null,null,{timeout:5000});const clearedReference=await readSavedCoast();verifySavedCoast(clearedReference);assert.deepEqual(clearedReference.live,replacedReference.live);assert.deepEqual(clearedReference.inspection,replacedReference.inspection);assert.deepEqual(clearedReference.forecast,replacedReference.forecast);assert.equal(clearedReference.reference,null);assert.equal(clearedReference.comparison.active,false);assert.equal(clearedReference.geometry.referencePoints.length,0);assert.match(clearedReference.buttons.saveText,/^Save coast$/i);
          await activateReference(referenceSave);await page.waitForFunction(()=>document.querySelector('[data-dock-canvas]')._dockCoastReference()!==null,null,{timeout:5000});dockingInspector.savedCoast={epoch:savedCoast.reference.epoch,pulse:pulsedReference.comparison,coast:coastedReference.comparison,shared:sharedReference.comparison,unavailableAtEnd:true,horizonPreserved:true,replacedEpoch:replacedReference.reference.epoch,clearPreservedState:true,fit:savedFit,a11y:savedA11y};
          await closeCanvas.evaluate(canvas=>{canvas._dockReset(false,'final',true);canvas._dockSetForecastTime(5);});await waitReferenceTime(5);const constantVelocity=await readVelocityMap();verifyVelocityMap(constantVelocity);assert.equal(constantVelocity.reference,null,'The paused inertial practice reset clears the saved coast');assert.equal(constantVelocity.velocity.geometry.pickable,false);assert.equal(constantVelocity.velocity.disabled,'false');assert.match(constantVelocity.velocity.help,/constant/i);for(const point of constantVelocity.velocity.geometry.points){forecastNear(point.vx,constantVelocity.live.vx);forecastNear(point.vy,constantVelocity.live.vy);}const constantVelocityPick=await nativeVelocityTarget('selected');assert.equal(constantVelocityPick.target.hit,null);assert.equal(constantVelocityPick.event.hit,null);const unchangedConstantVelocity=await readVelocityMap();verifyVelocityMap(unchangedConstantVelocity);for(const key of ['inspection','live','forecast','view','reference'])assert.deepEqual(unchangedConstantVelocity[key],constantVelocity[key],'Clicking a constant velocity point must preserve '+key);await velocityMap.focus();await page.keyboard.press('Home');await waitReferenceTime(0);await page.keyboard.press('ArrowRight');await waitReferenceTime(.5);const constantKeyboard=await readVelocityMap();verifyVelocityMap(constantKeyboard);assert.deepEqual(constantKeyboard.live,constantVelocity.live,'Time keys still inspect a constant-velocity coast without thrust');assert.equal(constantKeyboard.inspection.followingEnd,false);dockingInspector.velocityMap.constantVelocity={pickable:false,nativeClickUnchanged:true,keyboardTime:constantKeyboard.inspection.time};await closeCanvas.evaluate(canvas=>canvas._dockReset(true,'final',true));
          await activateReference(closingMetricButton);await waitTimelineMetric('closing');await page.locator('[data-dock-scenario="final"]').click();assert.equal(await closeCanvas.evaluate(canvas=>canvas._dockTimelineMetric()),'closing','The chosen timeline metric persists through a practice reset');await activateReference(rangeMetricButton);await waitTimelineMetric('range');await approachCamera.click();await page.locator('[data-dock-horizon]').selectOption('120');await page.locator('[data-dock-pulse-seconds]').selectOption('0.5');await forecastEnd.click();await verifyInspection(forecastDuration,true);const restoredRange=await readRangeTimeline();verifyRangeGeometry(restoredRange);assert.equal(restoredRange.disabled,'false');assert.equal(restoredRange.inspected.followingEnd,true);assert.equal(restoredRange.inspected.time,forecastDuration);const resetSavedCoast=await readSavedCoast();verifySavedCoast(resetSavedCoast);assert.equal(resetSavedCoast.reference,null,'A practice reset clears the saved coast');dockingInspector.savedCoast.resetClearsReference=true;dockingInspector.closingRate.resetPreservesMetric=true;console.log('Docking saved-coast alignment, controls and restoration passed at '+viewport.width+'px');
          assert.equal(await page.locator('[data-dock-pulse-seconds]').inputValue(), '0.5', 'Displayed default must match the model pulse duration');
          await page.locator('[data-dock-pulse-seconds]').selectOption('0.25');
          const beforePulse = await state();
          await page.locator('[data-dock-maneuver="fwd"]').focus();
          await page.keyboard.press('Enter');
          const afterPulse = await state();
          assert.equal(afterPulse.paused, true);
          assert(Math.abs(afterPulse.t - beforePulse.t - .25) < 1e-8, 'A pulse must advance exactly the selected simulation time');
          assert(afterPulse.vy > beforePulse.vy);
          const fullPulseFuel = beforePulse.propellant - afterPulse.propellant;
          assert(fullPulseFuel > 0);
          assert.equal(await page.locator('[data-dock-maneuver-reading="elapsed"]').textContent(), '0.25 s');
          assert.equal(await page.locator('[data-dock-maneuver-report]').isVisible(), true);
          await page.locator('[data-dock-precision]').click();
          const beforeFine = await state();
          await page.locator('[data-dock-maneuver="fwd"]').click();
          const fineFuel = beforeFine.propellant - (await state()).propellant;
          assert(Math.abs(fineFuel * 4 - fullPulseFuel) < 1e-9, 'Precision pulses must use quarter thrust and propellant');
          const beforeCoast = await state();
          await page.locator('[data-dock-maneuver="coast"]').click();
          const afterCoast = await state();
          assert(Math.abs(afterCoast.t - beforeCoast.t - 5) < 1e-8);
          assert.equal(afterCoast.propellant, beforeCoast.propellant);
          assert.equal(await page.locator('[data-dock-maneuver-reading="fuel"]').textContent(), '0.000 kg');
          await page.waitForTimeout(250);
          assert.deepEqual(await state(), afterCoast, 'Stepped maneuvers must stay paused without residual thrust');
          const maneuverBounds = await page.locator('[data-dock-maneuver-panel]').boundingBox();
          assert(maneuverBounds.x >= 0 && maneuverBounds.x + maneuverBounds.width <= viewport.width + 1, 'Maneuver controls and readings must fit on screen');
          await page.locator('[data-iss-dock-panel]').screenshot({ path: path.join(output, `docking-maneuver-${viewport.width}.png`) });
          await page.locator('[data-dock-scenario="drift"]').click();
          assert.equal(await page.locator('[data-dock-maneuver-report]').isVisible(), false, 'A practice reset must clear the previous step');
          assert.equal((await state()).paused, true);
          assert.equal(await forecastPanel.getAttribute('data-dock-forecast-kind'), 'contact');
          const driftInspection=await closeCanvas.evaluate(canvas=>canvas._dockForecastInspection());assert.equal(driftInspection.followingEnd,true);assert.equal(driftInspection.time,driftInspection.duration);
          assert(parseFloat(await forecastPanel.locator('[data-dock-forecast-reading="offset"]').textContent()) >= 2.5, 'Cross-drift practice must reveal the missed alignment');
          await closeCanvas.screenshot({path:path.join(output,'docking-inspector-drift-'+viewport.width+'.png')});
          const beforeDriftCamera=await readForecastInspection();await forecastCamera.click();assert.equal(await forecastCamera.getAttribute('aria-pressed'),'true');const driftPathCamera=await readPathCamera();assertPathFits(driftPathCamera);await forecastNow.click();assert.deepEqual((await readPathCamera()).view,driftPathCamera.view);await forecastEnd.click();const afterDriftCamera=await readForecastInspection();assert.deepEqual(afterDriftCamera.live,beforeDriftCamera.live);assert.equal(afterDriftCamera.kind,beforeDriftCamera.kind);assert.equal(afterDriftCamera.readings.status.text,beforeDriftCamera.readings.status.text);assert.equal(afterDriftCamera.readings.endpoint.text,beforeDriftCamera.readings.endpoint.text);assert.equal(afterDriftCamera.inspected.followingEnd,true);assert.deepEqual((await readPathCamera()).view,driftPathCamera.view);await closeCanvas.screenshot({path:path.join(output,'docking-path-camera-'+viewport.width+'.png')});dockingInspector.pathCamera.drift=driftPathCamera;await approachCamera.click();await forecastEnd.click();assert.deepEqual((await readForecastInspection()).live,beforeDriftCamera.live);

          let terminalCoastSteps=0;while(terminalCoastSteps<30&&!await closeCanvas.evaluate(canvas=>canvas._dockState.over)){await page.locator('[data-dock-maneuver="coast"]').click();terminalCoastSteps++;}
          const terminalSnapshot=await readForecastInspection();assert.equal(terminalSnapshot.over,true,'Bounded drift coasts must reach first contact');const terminalInspection=terminalSnapshot.inspected;assert.equal(terminalInspection.duration,0);assert.equal(terminalInspection.time,0);assert.equal(terminalSnapshot.kind,'complete');assert(terminalSnapshot.range.disabled);assert(terminalSnapshot.nowDisabled);assert(terminalSnapshot.endDisabled);assert.equal(Number(terminalSnapshot.range.max),0);for(const key of ['x','y','vx','vy','time','range','offset','speed','closing','duration','interval'])assert(Number.isFinite(terminalInspection[key]),'Completed inspection '+key+' stays finite');for(const key of ['time','range','offset','speed','radial','along'])assert(Number.isFinite(Number(terminalSnapshot.readings[key].value)));await closeCanvas.screenshot({path:path.join(output,'docking-inspector-complete-'+viewport.width+'.png')});console.log('Docking inspector terminal passed after '+terminalCoastSteps+' coast steps at '+viewport.width+'px');
          const terminalClosest=await readClosestInspection();verifyClosestReading(terminalClosest);assert.equal(terminalClosest.disabled,true);assert.equal(terminalClosest.closest.time,0);await closeCanvas.evaluate(canvas=>canvas._dockInspectClosest());assert.deepEqual(await readClosestInspection(),terminalClosest,'Completed closest inspection must leave camera, forecast and live state unchanged');dockingInspector.closest.completed={disabled:true,closest:terminalClosest.closest};
          const completedVelocity=await readVelocityMap();verifyVelocityMap(completedVelocity);assert.equal(completedVelocity.velocity.disabled,'true');assert.equal(completedVelocity.velocity.geometry.duration,0);assert.equal(completedVelocity.velocity.geometry.pickable,false);dockingInspector.velocityMap.completed={disabled:true,pickable:false};
          await rangeTimeline.evaluate(svg=>svg.scrollIntoView({block:'center',behavior:'instant'}));const completedRange=await readRangeTimeline();verifyRangeGeometry(completedRange);assert.equal(completedRange.disabled,'true');assert.equal(completedRange.geometry.duration,0);assert.match(completedRange.readings.motion.text,/No future coast/i);await rangeTimeline.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await page.keyboard.press('End');await rangeTimeline.evaluate(svg=>svg.scrollIntoView({block:'center',behavior:'instant'}));const disabledRangeClick=await readRangeTimeline(),completeRangePosition={x:disabledRangeClick.rect.width*.6,y:disabledRangeClick.rect.height*.5};
          // Hover checks visibility, hit targeting and stability without requiring
          // this deliberately disabled slider to become enabled before input.
          await rangeTimeline.hover({position:completeRangePosition,timeout:5000});
          const completeRangeTarget=await rangeTimeline.evaluate(svg=>{const rect=svg.getBoundingClientRect(),x=rect.left+rect.width*.6,y=rect.top+rect.height*.5,target=document.elementFromPoint(x,y);svg._qaCompletedInput=false;svg.addEventListener('pointerup',()=>{svg._qaCompletedInput=true;},{once:true});return{x,y,inside:!!target&&svg.contains(target)};});assert(completeRangeTarget.inside,'Completed-timeline input targets the settled SVG');
          if(viewport.width<500)await page.touchscreen.tap(completeRangeTarget.x,completeRangeTarget.y);else await page.mouse.click(completeRangeTarget.x,completeRangeTarget.y);await page.waitForFunction(()=>document.querySelector('[data-dock-range-timeline]')._qaCompletedInput===true,null,{timeout:5000});const unchangedCompletedRange=await readRangeTimeline();assert.deepEqual(unchangedCompletedRange.live,completedRange.live,'A native click on the disabled timeline must preserve the completed flight');verifyRangeGeometry(unchangedCompletedRange);for(const key of ['geometry','inspected','live','view','readings','status','endpoint'])assert.deepEqual(unchangedCompletedRange[key],completedRange[key],'Completed timeline input preserves '+key);assert.equal(unchangedCompletedRange.captured,false);await rangePanel.screenshot({path:path.join(output,'docking-range-complete-'+viewport.width+'.png'),animations:'disabled'});dockingInspector.rangeTimeline.completed={disabled:true,unchanged:true};
          await page.getByRole('button', { name: 'New approach', exact: false }).click();
          assert.equal((await state()).paused, false, 'A retry should start the selected practice');
          assert.equal(await page.locator('[data-dock-scenario="drift"]').getAttribute('aria-pressed'), 'true');
          const retryInspection=await inspectForecast();assert.equal(retryInspection.followingEnd,true);assert.equal(retryInspection.time,retryInspection.duration);assert(retryInspection.duration>0);assert.equal(await forecastTime.isDisabled(),false);assert.equal(await forecastNow.isDisabled(),false);assert.equal(await forecastEnd.isDisabled(),false);dockingInspector.terminal={coastSteps:terminalCoastSteps,inspection:terminalInspection,retryFollowsEnd:true,retryControlsEnabled:true};
          await page.locator('[data-dock-pause]').click();
          const retryRange=await readRangeTimeline();verifyRangeGeometry(retryRange);assert.equal(retryRange.disabled,'false');assert(retryRange.geometry.duration>0);assert.equal(retryRange.inspected.followingEnd,true);dockingInspector.rangeTimeline.retryEnabled=true;
        }
        if (tab === 'missions' && !accessibilityOnly && missionLabs.includes('eva')) {
          const dockingPaused = await page.locator('[data-dock-canvas]').evaluate(canvas => canvas._dockState.paused);
          if (!dockingPaused) await page.locator('[data-dock-pause]').click();
          const eva = page.locator('[data-iss-eva-mechanics]');
          // Capture document coordinates directly: element screenshots can
          // repeatedly auto-scroll a tall lab around its focused control.
          const captureEva = async filename => {
            await eva.evaluate(node => { document.activeElement?.blur(); node.scrollIntoView({ block: 'start', behavior: 'instant' }); });
            const clip = await eva.evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; });
            await page.screenshot({ path: path.join(output, filename), fullPage: true, clip, animations: 'disabled' });
          };
          const rate = async () => parseFloat(await eva.locator('[data-eva-angular-rate] strong').textContent());
          if (!args.includes('--eva-posture-only')) {
            await eva.getByRole('button', { name: 'Foot restraint locked', exact: false }).click();
            assert.equal(await rate(), 0, 'Releasing a restraint alone must not create rotation');
            await eva.locator('[data-eva-pulse-action="pulse-end"]').click();
            const freeRate = await rate();
            const cutoffAngle = Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle'));
            assert(freeRate > 0, 'An unrestrained torque pulse must produce angular velocity');
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            assert.equal(await rate(), freeRate, 'The astronaut must keep the same angular velocity during the coast');
            assert(Math.abs(Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle'))) > Math.abs(cutoffAngle), 'Rotation must continue while the wrench is off');
            assert.equal(parseFloat(await eva.locator('[data-eva-net-torque] strong').textContent()), 0, 'Coasting must apply no net body torque');
            await eva.locator('#iss-eva-torque').focus();
            await page.keyboard.press('ArrowRight');
            assert.equal(Number(await eva.locator('#iss-eva-time').inputValue()), 0, 'Changing torque starts a fresh trial');
            await eva.locator('[data-eva-pulse-action="pulse-end"]').click();
            const higherRate = await rate();
            assert(higherRate > freeRate, 'More tool torque must increase reaction angular velocity');
            await eva.locator('#iss-eva-inertia').focus();
            await page.keyboard.press('ArrowRight');
            await eva.locator('[data-eva-pulse-action="pulse-end"]').click();
            assert((await rate()) < higherRate, 'Higher rotational inertia must lower the response to the same torque');
            await eva.locator('[data-eva-pulse-action="reset"]').click();
            await eva.locator('[data-iss-playback-toggle="eva"]').click();
            await page.waitForFunction(() => Number(document.querySelector('#iss-eva-time').value) > 0.1);
            await eva.locator('[data-iss-playback-toggle="eva"]').click();
            const pausedPulse = await eva.locator('#iss-eva-time').inputValue();
            await page.waitForTimeout(250);
            assert.equal(await eva.locator('#iss-eva-time').inputValue(), pausedPulse, 'EVA playback must pause its clock');
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            const evaBounds = await eva.boundingBox();
            assert(evaBounds.x >= 0 && evaBounds.x + evaBounds.width <= viewport.width + 1, 'The reaction lab must fit on screen');
            await captureEva(`eva-${viewport.width}.png`);
            await eva.getByRole('button', { name: 'Astronaut unrestrained', exact: false }).click();
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            assert.equal(await rate(), 0, 'A locked foot restraint must transfer reaction to the station');
            await eva.locator('[data-eva-counter-preset="stop"]').focus();
            await page.keyboard.press('Enter');
            assert.equal(await eva.locator('#iss-eva-time').inputValue(), '0', 'A counterpulse preset must reset the trial');
            assert.equal(await eva.locator('#iss-eva-counter-ratio').inputValue(), '100');
            assert.equal(await eva.getByRole('button', { name: 'Astronaut unrestrained', exact: false }).getAttribute('aria-pressed'), 'false', 'Counterpulse presets must release the model restraint');
            await eva.locator('[data-eva-pulse-action="counter-end"]').click();
            const stoppedAngle = Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle'));
            assert.equal(await rate(), 0, 'Matched opposite impulses must cancel spin');
            assert(Math.abs(stoppedAngle) > 1, 'Stopping spin must not restore the initial orientation');
            assert.equal(await eva.locator('[data-eva-spin-direction]').getAttribute('data-eva-spin-direction'), 'stopped');
            assert.match(await eva.locator('[data-eva-angular-momentum] strong').textContent(), /^0\.0 /);
            assert.match(await eva.locator('[data-eva-rotational-energy]').textContent(), /0\.000 J/);
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            assert.equal(Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle')), stoppedAngle, 'The stopped astronaut must hold the new orientation');
            await captureEva(`eva-stopped-${viewport.width}.png`);
            await eva.locator('[data-eva-counter-preset="reverse"]').click();
            await eva.locator('[data-eva-pulse-action="counter-end"]').click();
            const reversedAngle = Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle'));
            const reverseRate = await rate();
            assert(reverseRate > 0);
            assert.equal(await eva.locator('[data-eva-spin-direction]').getAttribute('data-eva-spin-direction'), 'reverse');
            assert.match(await eva.locator('[data-eva-angular-momentum] strong').textContent(), /^\+/);
            assert.equal(await eva.locator('[data-eva-free-coast-path]').count(), 1, 'A counterpulse must show the free-coast comparison');
            assert(Number(await eva.locator('[data-eva-rate-plot] circle').getAttribute('cy')) < 100, 'Reversed angular velocity must plot above the zero line');
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            assert.equal(await rate(), reverseRate);
            assert(Number(await eva.locator('[data-eva-body-angle]').getAttribute('data-eva-body-angle')) > reversedAngle, 'Reverse spin must rotate the drawn body in the new direction');
            await captureEva(`eva-reversed-${viewport.width}.png`);
            await eva.locator('[data-eva-pulse-action="reset"]').click();
            await eva.locator('[data-iss-playback-toggle="eva"]').click();
            await page.waitForFunction(() => Number(document.querySelector('#iss-eva-time').value) > .1);
            await eva.locator('#iss-eva-counter-ratio').focus();
            await page.keyboard.press('Home');
            for (let step = 0; step < 5; step++) await page.keyboard.press('ArrowRight');
            assert.equal(await eva.locator('#iss-eva-counter-ratio').inputValue(), '50');
            assert.equal(await eva.locator('#iss-eva-time').inputValue(), '0', 'Changing counter torque must reset time');
            assert.equal(await eva.locator('[data-iss-playback-toggle="eva"]').getAttribute('aria-pressed'), 'false', 'Changing counter torque must stop playback');
            await page.waitForTimeout(250);
            assert.equal(await eva.locator('#iss-eva-time').inputValue(), '0');
            await eva.locator('[data-eva-pulse-action="coast-end"]').click();
            assert.equal(await eva.locator('[data-eva-spin-direction]').getAttribute('data-eva-spin-direction'), 'original', 'An underpowered counterpulse must leave original spin');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'EVA controls must not create horizontal overflow');
          }
          console.log(`Checking EVA posture at ${viewport.width}px`);
          await eva.locator('[data-eva-counter-preset="coast"]').click();
          await eva.locator('[data-eva-posture-preset="tuck"]').click();
          await eva.locator('[data-eva-pulse-action="posture-start"]').click();
          const postureStartRate = await rate();
          const postureStartInertia = parseFloat(await eva.locator('[data-eva-current-inertia] strong').textContent());
          const postureMomentum = await eva.locator('[data-eva-angular-momentum] strong').textContent();
          const extendedLimbs = await eva.locator('[data-eva-limbs]').getAttribute('d');
          await eva.locator('[data-eva-pulse-action="posture-end"]').click();
          assert.equal(await eva.locator('#iss-eva-time').inputValue(), '1.25');
          assert.equal(parseFloat(await eva.locator('[data-eva-current-inertia] strong').textContent()), 16);
          assert.equal(await eva.locator('[data-eva-angular-momentum] strong').textContent(), postureMomentum, 'A posture change must conserve angular momentum');
          assert(Math.abs(await rate() / postureStartRate - postureStartInertia / 16) < .02, 'Tucking must change spin inversely with inertia');
          assert(parseFloat(await eva.locator('[data-eva-posture-work] strong').textContent()) > 0, 'Tucking must account for added rotational energy');
          assert.equal(parseFloat(await eva.locator('[data-eva-net-torque] strong').textContent()), 0);
          assert.notEqual(await eva.locator('[data-eva-limbs]').getAttribute('d'), extendedLimbs, 'Changing posture must change the rendered limbs');
          await eva.locator('[data-eva-posture-compare]').click();
          assert.equal(await eva.locator('[data-eva-held-posture-path]').count(), 0);
          assert.equal(await eva.locator('#iss-eva-time').inputValue(), '1.25');
          await eva.locator('[data-eva-posture-compare]').click();
          await eva.locator('[data-eva-pulse-action="reset"]').click();
          await eva.locator('[data-iss-playback-toggle="eva"]').click();
          await page.waitForFunction(() => Number(document.querySelector('#iss-eva-time').value) > 1.25);
          const ratePlot = eva.locator('[data-eva-rate-plot]');
          await ratePlot.scrollIntoViewIfNeeded();
          const rateBox = await ratePlot.boundingBox();
          const inspectX = seconds => rateBox.x + rateBox.width * (4 + seconds / 2.5 * 335) / 343;
          if (viewport.width < 500) {
            await page.touchscreen.tap(inspectX(1), rateBox.y + rateBox.height / 2);
          } else {
            await page.mouse.move(inspectX(.8), rateBox.y + rateBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(inspectX(1), rateBox.y + rateBox.height / 2, { steps: 6 });
            await page.mouse.up();
          }
          assert(Math.abs(Number(await eva.locator('#iss-eva-time').inputValue()) - 1) < .02, 'The graph must inspect the selected posture time');
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="eva"]').getAttribute('aria-pressed') === 'false');
          const inspectedTime = Number(await eva.locator('#iss-eva-time').inputValue());
          await eva.locator('#iss-eva-time').focus();
          await page.keyboard.press('ArrowRight');
          assert(Math.abs(Number(await eva.locator('#iss-eva-time').inputValue()) - inspectedTime - .01) < 1e-8);
          await eva.locator('[data-eva-pulse-action="posture-end"]').click();
          await captureEva(`eva-posture-tuck-${viewport.width}.png`);
          console.log(`Captured tucked posture at ${viewport.width}px`);
          await eva.locator('[data-eva-pulse-action="reset"]').click();
          await eva.locator('[data-iss-playback-toggle="eva"]').click();
          await page.waitForFunction(() => Number(document.querySelector('#iss-eva-time').value) > .1);
          await eva.locator('[data-eva-posture-preset="extend"]').click();
          await page.waitForFunction(() => document.querySelector('[data-iss-playback-toggle="eva"]').getAttribute('aria-pressed') === 'false');
          assert.equal(await eva.locator('#iss-eva-time').inputValue(), '0');
          await eva.locator('#iss-eva-posture-inertia').focus();
          await page.keyboard.press('ArrowLeft');
          assert.equal(await eva.locator('#iss-eva-posture-inertia').inputValue(), '60');
          await page.keyboard.press('End');
          await eva.locator('[data-eva-pulse-action="posture-end"]').click();
          assert((await rate()) < postureStartRate, 'Extending must slow the spin');
          assert.match(await eva.locator('[data-eva-posture-work] strong').textContent(), /^−/);
          await captureEva(`eva-posture-extend-${viewport.width}.png`);
          await eva.locator('[data-eva-counter-preset="stop"]').click();
          await eva.locator('[data-eva-pulse-action="counter-end"]').click();
          assert.equal(await rate(), 0, 'Equal opposite pulses must still stop a changed posture');
          assert.equal(parseFloat(await eva.locator('[data-eva-rotational-energy] strong').textContent()), 0);
          await captureEva(`eva-posture-stop-${viewport.width}.png`);
          console.log(`Checked posture and counterpulse at ${viewport.width}px`);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
          if (viewport.width < 620) {
            const route = page.locator('.iss-eva-visual');
            await route.focus();
            await page.keyboard.press('ArrowRight');
            await page.waitForFunction(() => document.querySelector('.iss-eva-visual').scrollLeft > 0);
            assert.equal(await route.evaluate(node => document.activeElement === node), true, 'The scrollable route must be keyboard reachable');
          }
        }
        const accessibility = [];
        if (args.includes('--accessibility') || accessibilityOnly) {
          if (accessibilityOnly && tab === 'interior') {
            await page.locator('.iss-route-button').nth(2).click();
            await page.locator('[data-iss-momentum-bench]').waitFor();
          }
          await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/axe-core/axe.min.js') });
          async function audit(label) {
            const result = await page.evaluate(async () => {
              const scan = await window.axe.run(document.querySelector('.iss-root'), {
                rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
              });
              return { passes: scan.passes.length, violations: scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) };
            });
            assert.deepEqual(result.violations, [], `${label} structural accessibility violations`);
            accessibility.push({ state: label, ...result });
          }
          await audit(tab);
          if (tab === 'quiz') {
            await page.locator('[data-iss-quiz-option="0"]').click();
            await page.waitForFunction(() => document.activeElement === document.querySelector('[data-iss-quiz-next]'));
            await audit('quiz answered');
            await page.locator('[data-iss-quiz-next]').click();
            await page.waitForFunction(() => document.activeElement === document.querySelector('#iss-quiz-option-1-0'));
          }
        }
        results.push({ tab, viewport: viewport.width, ...layout, ...(!accessibilityOnly ? { screenshot: filename } : {}), ...(dockingInspector ? { dockingInspector } : {}), ...(accessibility.length ? { accessibility } : {}) });
        await page.evaluate(() => window.__destroy?.());
      }
      assert.deepEqual(errors, [], `Browser errors at ${viewport.width}px`);
      await page.close();
    }
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ ok: true, results }, null, 2));
    console.log(JSON.stringify({ ok: true, output, checks: results.length, screenshots: results.map((r) => r.screenshot).filter(Boolean) }, null, 2));
  } finally { await browser.close(); }
}

async function main() {
  const port = Number(argument('--port', args.includes('--serve') ? 4179 : 0));
  const { server, base } = await createPreview(port);
  console.log(`Space Station working-tree preview: ${base}`);
  if (args.includes('--serve')) {
    process.on('SIGINT', () => server.close(() => process.exit(0)));
    process.on('SIGTERM', () => server.close(() => process.exit(0)));
    return;
  }
  try { await capture(base, path.resolve(ROOT, argument('--out', 'reports/space-station-enhancement-qa'))); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { createPreview, capture };
