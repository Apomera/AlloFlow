'use strict';
// Fresh evidence only. The mounted runtime is served byte-for-byte, never rewritten.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const REPO = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const { chromium } = require(path.join(REPO, 'node_modules/playwright'));
const option = name => (process.argv.find(arg => arg.startsWith('--' + name + '=')) || '').slice(name.length + 3);
const SOURCE = option('source'), PREFIX = option('run'), EXPECTED = option('sha');
const LIVE = process.argv.includes('--live'), BASELINE = process.argv.includes('--baseline');
const CASE_SELECTION = option('cases').split(',').filter(Boolean);
const HELPER = option('helper') || 'wcDrawStormCloudVolume2d';
if (!path.isAbsolute(SOURCE) || !/^[a-z0-9][a-z0-9-]{0,50}$/.test(PREFIX) || !/^[a-f0-9]{64}$/.test(EXPECTED)) {
  throw Error('Supply --source=absolute-file --sha=exact-sha256 --run=fresh-prefix; optional --baseline, --live, --compare=baseline-results, --helper=name, --out=absolute-directory');
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
const source = fs.readFileSync(SOURCE), sourceText = source.toString('utf8');
if (hash(source) !== EXPECTED) throw Error('Pinned source hash mismatch');
const outputOption = option('out'), compareOption = option('compare');
if (outputOption && !path.isAbsolute(outputOption)) throw Error('--out must be an absolute directory');
if (compareOption && !path.isAbsolute(compareOption)) throw Error('--compare must be an absolute results file');
const compare = compareOption ? JSON.parse(fs.readFileSync(compareOption, 'utf8')) : null;
if (compare && (!compare.completed || !compare.successful || !compare.resourcesClosed)) throw Error('Comparison receipt must be completed, successful and closed');
const OUT = outputOption || path.join(__dirname, 'storm-cloud-silhouette-review');
fs.mkdirSync(OUT, { recursive: true });
if (fs.readdirSync(OUT).some(file => file.startsWith(PREFIX + '-'))) throw Error('Evidence prefix exists; use a fresh --run');
fs.writeFileSync(path.join(OUT, PREFIX + '-tested-runtime.js'), source);
fs.writeFileSync(path.join(OUT, PREFIX + '-tested-harness.cjs'), fs.readFileSync(__filename));
const seed = {
  wcMode: 'precipHunt', xp: 73, score: 4, researchPoints: 10, wcAttempts: 4, wcStreak: 1,
  wcExperimentLog: [{ key: 'preserve-evidence', notes: 'Existing learner observation' }],
  completedChallenges: ['quiz_pass', 'vocabulary_studied'],
  precipHunt: { viewMode: '2d', paused: true, playing: false, stormAutoPlay: false, stormTime: 52,
    soundEnabled: false, showAirflow: true, showStormAnatomy: false, cameraFocus: 'storm',
    environment: 'forest', experiment: { prediction: 'Saved prediction stays', explanation: 'Saved explanation stays',
      saved: [{ id: 1, a: { humidity: 65 }, b: { humidity: 75 }, prediction: 'Pinned prediction', explanation: 'Pinned explanation' }] } }
};
const sleet = { moisture: 90, tempC: -10, midLevelTempC: 1, surfaceTempC: -4,
  lowLevelHumidity: 85, wind: 10, updraft: 70, cloudDepth: 9, terrain: 'plains' };
const cases = [
  { id: 'rain-desktop', preset: 'gentleRain', phase: 'rain', width: 1040 },
  { id: 'rain-phone320', preset: 'gentleRain', phase: 'rain', width: 320 },
  { id: 'rain-phone390', preset: 'gentleRain', phase: 'rain', width: 390 },
  { id: 'snow-desktop', preset: 'mountainSnow', phase: 'snow', width: 1040 },
  { id: 'snow-phone320', preset: 'mountainSnow', phase: 'snow', width: 320 },
  { id: 'sleet-desktop', extra: sleet, phase: 'sleet', width: 1040 },
  { id: 'sleet-phone390', extra: sleet, phase: 'sleet', width: 390 },
  { id: 'hail-anatomy-desktop', preset: 'hailstorm', phase: 'hail', extra: { showStormAnatomy: true }, width: 1040 },
  { id: 'hail-anatomy-phone320', preset: 'hailstorm', phase: 'hail', extra: { showStormAnatomy: true }, width: 320 },
  { id: 'hail-stepped-leader-desktop', preset: 'hailstorm', extra: { showStormAnatomy: true, lightningStudyStep: 'stepped-leader' }, width: 1040 },
  { id: 'hail-upward-streamer-phone320', preset: 'hailstorm', extra: { showStormAnatomy: true, lightningStudyStep: 'upward-streamer' }, width: 320 },
  { id: 'hail-return-stroke-phone390', preset: 'hailstorm', extra: { showStormAnatomy: true, lightningStudyStep: 'return-stroke' }, width: 390 },
  { id: 'virga-desktop', preset: 'virga', phase: 'virga', width: 1040 },
  { id: 'virga-phone320', preset: 'virga', phase: 'virga', width: 320 },
  { id: 'clear-desktop', extra: { moisture: 0, updraft: 0, cloudDepth: 1, wind: 0, terrain: 'plains' }, phase: 'clear', width: 1040 },
  { id: 'clear-phone320', extra: { moisture: 0, updraft: 0, cloudDepth: 1, wind: 0, terrain: 'plains' }, phase: 'clear', width: 320 },
  { id: 'summer-dark', preset: 'summerStorm', phase: 'rain', width: 1040, theme: 'dark' },
  { id: 'snow-dark-phone390', preset: 'mountainSnow', phase: 'snow', width: 390, theme: 'dark' },
  { id: 'hail-contrast-phone320', preset: 'hailstorm', phase: 'hail', width: 320, theme: 'contrast' },
  { id: 'rain-forced-phone390', preset: 'gentleRain', phase: 'rain', width: 390, theme: 'contrast', forcedColors: 'active' },
  { id: 'orographic-west-phone390', preset: 'mountainSnow', phase: 'snow', extra: { windDirection: 'west' }, width: 390 },
  { id: 'mountain-calm-phone320', preset: 'mountainSnow', phase: 'snow', extra: { wind: 0 }, width: 320 },
  { id: 'hail-developing', preset: 'hailstorm', extra: { stormTime: 15 }, width: 1040 },
  { id: 'hail-dissipating', preset: 'hailstorm', extra: { stormTime: 90 }, width: 1040 },
  { id: 'rain-paused-no-preference', preset: 'gentleRain', phase: 'rain', width: 390, motion: 'no-preference' }
].map(item => ({ theme: 'light', forcedColors: 'none', motion: 'reduce', ...item }));
if (LIVE) cases.splice(0, cases.length, ...cases.filter(item => ['rain-phone320', 'snow-dark-phone390', 'hail-anatomy-desktop'].includes(item.id)));
if (CASE_SELECTION.length) {
  if(CASE_SELECTION.some(id=>!cases.some(item=>item.id===id)))throw Error('Unknown --cases selection');
  cases.splice(0,cases.length,...cases.filter(item=>CASE_SELECTION.includes(item.id)));
}
const report = {
  mode: BASELINE ? 'baseline' : LIVE ? 'live-delivery' : 'candidate', interceptionUsed: !LIVE,
  prefix: PREFIX, pid: process.pid, startedAt: new Date().toISOString(), sourcePath: SOURCE,
  sourceSha256: EXPECTED, sourceBytes: source.length, harnessSha256: hash(fs.readFileSync(__filename)),
  helperName: HELPER, sceneSelection: CASE_SELECTION, comparisonPath: compareOption || null, comparisonSha256: compareOption ? hash(fs.readFileSync(compareOption)) : null,
  url: 'http://127.0.0.1:8770/?mode=storm', instrumentation: 'Native 2D canvas method observation of actual mounted source',
  checks: [], cases: [], captures: [], nativeActions: [], errors: [], consoleErrors: [],
  completed: false, successful: false, browserClosed: false, resourcesClosed: false, serverOwned: false
};
const save = () => fs.writeFileSync(path.join(OUT, PREFIX + '-results.json'), JSON.stringify(report, null, 2));
const check = (label, passed, details) => { report.checks.push({ label, passed: !!passed, details }); if (!passed) report.errors.push(label); };
const inside = (a, b, tolerance = .6) => a.x >= b.x - tolerance && a.y >= b.y - tolerance && a.right <= b.right + tolerance && a.bottom <= b.bottom + tolerance;
const intersects = (a, b, tolerance = .2) => Math.min(a.right, b.right) - Math.max(a.x, b.x) > tolerance && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > tolerance;
async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function installObserver(page) {
  await page.evaluate(helper => {
    if (window.stopStormCloudObserver) throw Error('Prior observer still installed');
    const proto = CanvasRenderingContext2D.prototype;
    const names = ['clearRect', 'beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'roundRect', 'rect', 'arc', 'ellipse', 'closePath', 'fill', 'stroke', 'clip', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'save', 'restore'];
    const native = Object.fromEntries(names.filter(name => typeof proto[name] === 'function').map(name => [name, proto[name]]));
    let currentPath = [], pendingLeader = null, currentCard = null, depth = 0;
    let receipt;
    const reset = () => { receipt = { frame: (receipt?.frame || 0) + 1, cards: [], texts: [], cloudOps: [], features: {}, minimumDepth: depth, startDepth: depth }; currentPath = []; pendingLeader = null; currentCard = null; };
    reset();
    const kind = stack => stack.includes('drawPrecipCaption2d') ? 'caption'
      : stack.includes(helper) || stack.includes('wcStormCloudSilhouette2d') || stack.includes('drawCloudPuff') ? 'cloud'
      : ['drawCloudFormationMicrophysics', 'drawStormChargeSeparation', 'drawPrecipThermalRail', 'strokeStormLightningPath', 'drawThunderWavefront', 'drawRainDrop', 'drawSnowflake', 'drawIcePellet', 'drawHydrometeor', 'drawArrow', 'terrainSurfaceYAt'].find(name => stack.includes(name)) || 'other';
    const bound = points => { const xs = points.map(p => p.x), ys = points.map(p => p.y); return { x: Math.min(...xs), y: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }; };
    for (const [name, original] of Object.entries(native)) proto[name] = function (...args) {
      if (this.canvas.id !== 'wcPrecipCanvas') return Reflect.apply(original, this, args);
      const css = this.canvas.getBoundingClientRect(), sx = this.canvas.width / css.width, sy = this.canvas.height / css.height;
      const transform = this.getTransform(), point = (x, y) => ({ x: (transform.a*x+transform.c*y+transform.e)/sx, y: (transform.b*x+transform.d*y+transform.f)/sy });
      const stack = String(new Error().stack), scope = kind(stack);
      if (name === 'clearRect' || name === 'fillRect' && args[0] === 0 && args[1] === 0 && args[2] >= css.width - .5 && args[3] >= css.height - .5) reset();
      if (name === 'save') depth++;
      if (name === 'restore') { depth--; receipt.minimumDepth = Math.min(receipt.minimumDepth, depth); }
      const op = { name, detail: stack.includes('wcStormScientificInk2d') ? 'scientific-ink' : stack.includes('wcStormCloudSilhouette2d') ? 'silhouette' : stack.includes('drawCloudPuff') ? 'puff' : scope,
        args: args.map(arg => typeof arg === 'number' ? arg : String(arg)), alpha: this.globalAlpha,
        composite: this.globalCompositeOperation, fill: String(this.fillStyle), stroke: String(this.strokeStyle), font:this.font,lineWidth: this.lineWidth, dash: this.getLineDash(), transform: [transform.a,transform.b,transform.c,transform.d,transform.e,transform.f] };
      if (scope === 'cloud') receipt.cloudOps.push(op);
      else if (scope !== 'other' && scope !== 'caption') (receipt.features[scope] ||= []).push(op);
      if (name === 'beginPath') currentPath = [];
      if (['moveTo','lineTo','quadraticCurveTo','bezierCurveTo'].includes(name)) for (let i=0;i<args.length;i+=2) currentPath.push(point(args[i],args[i+1]));
      if (name === 'roundRect' || name === 'rect') currentPath.push(point(args[0],args[1]),point(args[0]+args[2],args[1]+args[3]));
      if (scope === 'caption' && name === 'stroke' && currentPath.length === 2) pendingLeader = { anchor: currentPath[0], connector: currentPath[1], color: String(this.strokeStyle), alpha: this.globalAlpha };
      if (scope === 'caption' && name === 'fill' && this.fillStyle === '#071c2c' && currentPath.length > 3) {
        currentCard = { bounds: bound(currentPath), fill: String(this.fillStyle), alpha: this.globalAlpha, composite: this.globalCompositeOperation, leader: pendingLeader, texts: [] };
        receipt.cards.push(currentCard); pendingLeader = null;
      }
      if (name === 'fillText') {
        const m=this.measureText(String(args[0])), p=point(args[1],args[2]), factorX=Math.abs(transform.a)/sx, factorY=Math.abs(transform.d)/sy;
        const text={ text:String(args[0]), x:p.x,y:p.y,font:this.font,fontSize:Number((this.font.match(/([\d.]+)px/)||[0,0])[1])*factorY,
          fill:String(this.fillStyle),alpha:this.globalAlpha,argumentCount:args.length,scope,
          bounds:{x:p.x-m.actualBoundingBoxLeft*factorX,y:p.y-m.actualBoundingBoxAscent*factorY,right:p.x+m.actualBoundingBoxRight*factorX,bottom:p.y+m.actualBoundingBoxDescent*factorY} };
        receipt.texts.push(text); if(scope==='caption'&&currentCard)currentCard.texts.push(text);
      }
      return Reflect.apply(original,this,args);
    };
    window.readStormCloudObservation = () => ({ ...receipt, endDepth: depth });
    window.stopStormCloudObserver = () => {
      const result={...receipt,endDepth:depth}; for(const[name,original]of Object.entries(native))proto[name]=original;
      result.methodsRestored=Object.entries(native).every(([name,original])=>proto[name]===original);
      delete window.stopStormCloudObserver;delete window.readStormCloudObservation;return result;
    };
  }, HELPER);
}
async function snapshot(page) {
  const result = await page.evaluate(() => {
    const canvas = document.getElementById('wcPrecipCanvas'), pin = window.stormCloudPin;
    return { data: JSON.parse(JSON.stringify(window.waterReviewData)), pixels: canvas.toDataURL(), dataset: { ...canvas.dataset },
      engine: { canvasSame:canvas===pin.canvas,contextSame:canvas.getContext('2d')===pin.context,
        hooks:Object.keys(pin.hooks).map(name=>({name,type:typeof canvas[name],same:canvas[name]===pin.hooks[name]})) } };
  });
  result.canvasSha256 = hash(result.pixels); delete result.pixels; return result;
}
const retained = (value, allowLifecycleRebind = false) => value.engine.canvasSame && value.engine.contextSame && value.engine.hooks.every(hook => hook.type === 'function' && (hook.same || allowLifecycleRebind && hook.name === '_wcPrecipAdvanceLifecycle'));
async function mount(page, item) {
  await page.setViewportSize({ width:item.width,height:1100 });
  await page.emulateMedia({ reducedMotion:item.motion,forcedColors:item.forcedColors });
  await installObserver(page);
  await page.evaluate(({seed,item}) => {
    window.previousStormCloudCanvas=document.getElementById('wcPrecipCanvas');
    const setup={...WaterCyclePrecipitationKernel.presets[item.preset||'gentleRain'],...seed.precipHunt,preset:item.preset||'custom',...(item.extra||{})};
    window.mountWater({...seed,precipHunt:setup},item.theme);
  },{seed,item});
  await page.waitForSelector('#wcPrecipCanvas'); await settle(page);
  await page.evaluate(() => { const canvas=document.getElementById('wcPrecipCanvas');
    window.stormCloudPin={canvas,context:canvas.getContext('2d'),hooks:Object.fromEntries(['_wcPrecipSync','_wcPrecipCleanup','_wcPrecipAdvanceLifecycle'].filter(name=>typeof canvas[name]==='function').map(name=>[name,canvas[name]]))}; });
}
async function evidence(page) {
  return page.evaluate(() => {
    const canvas=document.getElementById('wcPrecipCanvas'),b=canvas.getBoundingClientRect(),old=window.previousStormCloudCanvas,t=canvas.getContext('2d').getTransform();
    const drawWidth=canvas.width/Math.abs(t.a),drawHeight=canvas.height/Math.abs(t.d);
    return { model:JSON.parse(JSON.stringify(WaterCyclePrecipitationKernel.compute(window.waterReviewData.precipHunt))),
      logicalWidth:b.width,logicalHeight:b.height,pixelWidth:canvas.width,pixelHeight:canvas.height,
      drawWidth,drawHeight,engineToClient:{xScale:b.width/drawWidth,yScale:b.height/drawHeight},
      pageOverflow:document.documentElement.scrollWidth>innerWidth+1,ariaLabel:canvas.getAttribute('aria-label'),dataset:{...canvas.dataset},
      actualMotionPreference:matchMedia('(prefers-reduced-motion: reduce)').matches,
      previousCanvasReleased:!old||old===canvas||(!old.isConnected&&old._wcPrecipSync==null&&old._wcPrecipCleanup==null) };
  });
}
function captionChecks(label, value) {
  const cards=value.paint.cards, text=card=>card.texts.map(item=>item.text).join(' ').replace(/\s+/g,' ').trim();
  check(label+' actual foreground plates retain readable native text',cards.length>=5&&cards.every(card=>card.fill==='#071c2c'&&card.alpha===1&&card.composite==='source-over'&&card.texts.length&&card.texts.every(line=>line.fontSize>=10.99&&line.argumentCount===3)),cards);
  check(label+' caption text stays inside its plate',cards.every(card=>card.texts.every(line=>inside(line.bounds,card.bounds))),cards);
  check(label+' caption plates stay inside actual canvas',cards.every(card=>inside(card.bounds,{x:0,y:0,right:value.logicalWidth,bottom:value.logicalHeight})),cards.map(card=>card.bounds));
  const collisions=[];for(let a=0;a<cards.length;a++)for(let b=a+1;b<cards.length;b++)if(intersects(cards[a].bounds,cards[b].bounds))collisions.push([a,b]);
  check(label+' caption plates retain mutual clearance',!collisions.length,collisions);
  const cloud=cards.find(card=>/^Cloud formation\b/i.test(text(card)));
  check(label+' cloud formation caption matches exact model phase',!!cloud&&text(cloud)==='Cloud formation '+value.model.cloudPhase,{expected:value.model.cloudPhase,actual:cloud&&text(cloud)});
  check(label+' lifecycle caption retains exact model stage and time',cards.some(card=>text(card)===value.model.lifecycle.stageLabel.toUpperCase()+' · T='+value.model.lifecycle.time),{expected:value.model.lifecycle.stageLabel.toUpperCase()+' · T='+value.model.lifecycle.time,actual:cards.map(text)});
  const model=value.model,w=value.drawWidth,h=value.drawHeight,ground=h*.82,base=h*.39,sign=model.config.windDirection==='west'?-1:1;
  const oro=model.config.showAirflow&&model.config.terrain==='mountains'&&model.config.wind>=2&&model.config.windDirection!=='calm';
  const shift=sign*model.config.wind/40*w*.08,center=oro?w*(sign>0?.56:.78)+shift*.08:w*.48+shift*.18;
  const proofs=[];
  const anchor=(card,x,y,id)=>{x*=value.engineToClient.xScale;y*=value.engineToClient.yScale;if(!card){proofs.push({id,passed:false,missing:true});return;}const bx=Math.max(card.bounds.x,Math.min(card.bounds.right,x)),by=Math.max(card.bounds.y,Math.min(card.bounds.bottom,y));
    const needs=Math.abs(bx-x)+Math.abs(by-y)>5,near=(a,b)=>Math.abs(a-b)<.001,leader=card.leader;
    proofs.push({id,expected:{x,y},leader,passed:needs?!!leader&&near(leader.anchor.x,x)&&near(leader.anchor.y,y)&&near(leader.connector.x,bx)&&near(leader.connector.y,by):!leader});};
  anchor(cloud,center,base,'cloud-formation');
  for(const[level,y]of[['CLOUD',Math.max(20,base-38)],['MIDDLE',base+(ground-base)*.52],['SURFACE',ground-15]])anchor(cards.find(card=>text(card).startsWith(level+' ')),10,y,level);
  const crossings=cards.filter(card=>/0\s*°C crossing/i.test(text(card)));
  check(label+' exact thermal crossing count survives',crossings.length===model.thermalLayers.crossings.length,{actual:crossings.map(text),expected:model.thermalLayers.crossings});
  model.thermalLayers.crossings.forEach((crossing,i)=>anchor(crossings[i],w-5,base+crossing.progress*(ground-base),'crossing-'+i));
  if(model.visualType==='virga'){const dryness=1-model.config.lowLevelHumidity/100,fall=h*(.68-dryness*.2);anchor(cards.find(card=>/^DRY LAYER\b/.test(text(card))),w-5,base+(fall-base)*Math.max(.3,.48-dryness*.14),'virga-dry-layer');}
  if(oro){anchor(cards.find(card=>/^WINDWARD\b/.test(text(card))),w*.66-sign*34,ground-h*.36+16,'windward');anchor(cards.find(card=>/^LEEWARD\b/.test(text(card))),w*.66+sign*48,ground-h*.36+24,'leeward');}
  const lightning=cards.filter(card=>/LIGHTNING PATHWAY|STEPPED LEADER|UPWARD STREAMER|RETURN STROKE/.test(text(card)));
  if(!BASELINE)lightning.forEach(card=>{const depth=(model.config.cloudDepth-1)/11,updraft=model.config.updraft/100*model.lifecycle.updraftFactor,cloudY=h*(.33-depth*.14-updraft*.045);anchor(card,center+sign*w*.04,cloudY+12,'lightning-path');});
  check(label+' captions retain original semantic scene anchors',proofs.every(proof=>proof.passed),proofs);
  const annotation=value.paint.texts.filter(line=>line.scope!=='caption'&&/CHARGE|LIGHTNING|STEPPED|STREAMER|RETURN STROKE|THUNDER/.test(line.text));
  const featureOverlaps=[];cards.forEach((card,i)=>annotation.forEach(line=>{if(intersects(card.bounds,line.bounds))featureOverlaps.push({card:i,text:line.text});}));
  check(label+' foreground captions preserve feature-label clearance',!featureOverlaps.length,featureOverlaps);
  if(!BASELINE){const glyphs=value.paint.texts.filter(line=>line.scope==='drawStormChargeSeparation'&&['+','−'].includes(line.text)),collisions=[];lightning.forEach(card=>glyphs.forEach(line=>{if(intersects(card.bounds,line.bounds))collisions.push({card:text(card),glyph:line.text,bounds:line.bounds});}));check(label+' new lightning plate keeps scientific charge glyphs clear',!collisions.length,collisions);}
}
function cloudGeometryChecks(label,value){
  const model=value.model,w=value.drawWidth,h=value.drawHeight,cfg=model.config;
  const depth=(cfg.cloudDepth-1)/11,updraft=cfg.updraft/100*model.lifecycle.updraftFactor,build=Math.min(1,depth*.52+updraft*.48);
  const cloudY=h*(.33-depth*.14-updraft*.045),sign=cfg.windDirection==='west'?-1:1,shift=sign*cfg.wind/40*w*.08;
  const oro=cfg.showAirflow&&cfg.terrain==='mountains'&&cfg.wind>=2&&cfg.windDirection!=='calm';
  const center=oro?w*(sign>0?.56:.78)+shift*.08:w*.48+shift*.18;
  const scale=(.82+cfg.moisture/100*.35+cfg.cloudDepth/12*.18)*model.lifecycle.cloudFactor,lobes=[];
  const lobe=(x,y,r)=>lobes.push({x,y:Math.max(r*.9+10,y),radius:r});
  if(build>.56)for(let i=0;i<Math.max(2,Math.round(2+build*3));i++)lobe(center-sign*10+Math.sin(i*1.7)*8,Math.max((24+i*4)*scale*.82+8,cloudY+18-i*(13+build*4)),(24+i*4)*scale);
  lobe(center-w*.16,cloudY+12,38*scale);lobe(center-w*.06,cloudY-5,52*scale);lobe(center+w*.07,cloudY,47*scale);lobe(center+w*.17,cloudY+15,35*scale);
  const arcs=value.paint.cloudOps.filter(op=>op.name==='arc'),near=(a,b)=>Math.abs(a-b)<.001;
  const proofs=lobes.map(expected=>({expected,observed:arcs.find(op=>near(op.args[0],expected.x)&&near(op.args[1],expected.y)&&near(op.args[2],expected.radius))||null}));
  check(label+' cloud crown anchors radii and tower count preserve original physical geometry',proofs.every(proof=>proof.observed),{center,cloudY,cloudBase:h*.39,scale,build,lobes:proofs});
  if(!BASELINE){const silhouette=arcs.filter(op=>op.detail==='silhouette');check(label+' one shared silhouette retains exactly the original cloud lobes',silhouette.length===lobes.length&&silhouette.every((op,i)=>near(op.args[0],lobes[i].x)&&near(op.args[1],lobes[i].y)&&near(op.args[2],lobes[i].radius)),{expected:lobes,actual:silhouette.map(op=>op.args.slice(0,3))});}
}
async function capture(page, item, value) {
  const filename=PREFIX+'-'+item.id+'.png'; await page.locator('#wcPrecipCanvas').screenshot({path:path.join(OUT,filename),animations:'disabled',timeout:60000});
  const bytes=fs.readFileSync(path.join(OUT,filename));report.captures.push({path:filename,sha256:hash(bytes),bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),sourceSha256:EXPECTED,item,cloudPhase:value.model.cloudPhase,surfacePhase:value.model.visualType,capturedAt:new Date().toISOString()});
}
function compareCase(label,value) {
  if(!compare)return;const original=compare.cases.find(candidate=>candidate.item.id===value.item.id);
  check(label+' comparison fixture exists',!!original,{comparison:compare.sourceSha256,id:value.item.id});if(!original)return;
  check(label+' full precipitation model is exactly preserved',same(original.model,value.model),{baseline:hash(JSON.stringify(stable(original.model))),candidate:hash(JSON.stringify(stable(value.model)))});
  const untouched=features=>Object.fromEntries(Object.entries(features).filter(([name])=>name!=='drawStormChargeSeparation'));
  check(label+' untouched noncloud microphysics and feature calls are exactly preserved',same(untouched(original.paint.features),untouched(value.paint.features)),{baseline:hash(JSON.stringify(stable(untouched(original.paint.features)))),candidate:hash(JSON.stringify(stable(untouched(value.paint.features)))),featureKeys:Object.keys(value.paint.features)});
  const chargeCore=features=>(features.drawStormChargeSeparation||[]).filter(op=>op.name!=='fillText'&&op.detail!=='scientific-ink').map(({detail,...op})=>op);
  const chargeText=features=>(features.drawStormChargeSeparation||[]).filter(op=>op.name==='fillText').map(op=>({args:op.args,fill:op.fill,alpha:op.alpha,font:op.font,transform:op.transform}));
  check(label+' original charge geometry and exact glyph paint arguments are preserved',same(chargeCore(original.paint.features),chargeCore(value.paint.features))&&same(chargeText(original.paint.features),chargeText(value.paint.features)),{baselineGlyphs:chargeText(original.paint.features),candidateGlyphs:chargeText(value.paint.features)});
  const cardText=card=>card.texts.map(line=>line.text).join(' ').replace(/\s+/g,' ').trim(),isLightning=text=>/LIGHTNING PATHWAY|STEPPED LEADER|UPWARD STREAMER|RETURN STROKE/.test(text);
  const expectedCards=original.paint.cards.map(cardText).sort(),actualCards=value.paint.cards.filter(card=>!isLightning(cardText(card))).map(cardText).sort();
  check(label+' original caption wording and semantic-anchor contract are preserved',same(expectedCards,actualCards),{baseline:expectedCards,candidate:actualCards});
  const originalLightning=original.paint.texts.filter(line=>line.scope!=='caption'&&isLightning(line.text)).map(line=>line.text).sort(),currentLightning=value.paint.cards.map(cardText).filter(isLightning).sort();
  check(label+' lightning caption preserves original STATIC or STUDY qualification',same(originalLightning,currentLightning),{baseline:originalLightning,candidate:currentLightning});
  const occlusions=caseValue=>{const glyphs=caseValue.paint.texts.filter(line=>line.scope==='drawStormChargeSeparation'&&['+','−'].includes(line.text)),rows=[];caseValue.paint.cards.filter(card=>!isLightning(cardText(card))).forEach(card=>glyphs.forEach(glyph=>{if(intersects(card.bounds,glyph.bounds))rows.push({card:cardText(card),glyph:glyph.text,bounds:glyph.bounds});}));return rows;};
  const originalOcclusions=occlusions(original),currentOcclusions=occlusions(value);
  check(label+' original caption plates introduce no new charge glyph occlusions',currentOcclusions.every(row=>originalOcclusions.some(old=>same(row,old))),{baseline:originalOcclusions,candidate:currentOcclusions});
  check(label+' surface/lifecycle/lightning datasets remain exact',same(original.before.dataset,value.before.dataset),{baseline:original.before.dataset,candidate:value.before.dataset});
}
function scientificInkChecks(label,value){
  if(BASELINE)return;const ops=value.paint.features.drawStormChargeSeparation||[],fills=ops.filter(op=>op.name==='fillText'&&['+','−'].includes(op.args[0])),strokes=ops.filter(op=>op.name==='strokeText');
  check(label+' native dark outline preserves every scientific charge sign',fills.length===strokes.length&&fills.every((fill,i)=>same(fill.args,strokes[i].args)&&same(fill.transform,strokes[i].transform)&&strokes[i].stroke==='#16364b'&&strokes[i].lineWidth===2.5&&strokes[i].alpha===1&&strokes[i].detail==='scientific-ink'),{glyphCount:fills.length,outlineCount:strokes.length,outlines:strokes.map(op=>({args:op.args,stroke:op.stroke,lineWidth:op.lineWidth,alpha:op.alpha}))});
}
let browser,page,observerOpen=false;
(async()=>{
  try {
    browser=await chromium.launch({headless:true});report.browserLaunchedAt=new Date().toISOString();save();
    page=await browser.newPage({viewport:{width:1040,height:1100},reducedMotion:'reduce'});page.setDefaultTimeout(30000);
    page.on('pageerror',error=>report.errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
    let routedCount=0;if(!LIVE)await page.route('**/stem_lab/stem_tool_watercycle.js',async route=>{routedCount++;await route.fulfill({status:200,contentType:'text/javascript',body:source});});
    const loaded=page.waitForResponse(response=>new URL(response.url()).pathname==='/stem_lab/stem_tool_watercycle.js',{timeout:60000}).then(async response=>{
      const bytes=await response.body();report.loadedRuntimeSha256=hash(bytes);report.loadedRuntimeBytes=bytes.length;return{response};
    },error=>({error:String(error)})).catch(error=>({error:String(error)}));
    await page.goto(report.url,{waitUntil:'domcontentloaded',timeout:60000});const receipt=await loaded;if(receipt.error)throw Error(receipt.error);
    check(LIVE?'Native browser received exact preview delivery without interception':'Native browser received exact pinned runtime',routedCount===(LIVE?0:1)&&report.loadedRuntimeSha256===EXPECTED&&report.loadedRuntimeBytes===source.length,{routedCount,sha256:report.loadedRuntimeSha256,bytes:report.loadedRuntimeBytes});
    await page.waitForFunction(()=>typeof mountWater==='function'&&typeof WaterCyclePrecipitationKernel==='object');
    if(!BASELINE)check('Candidate defines dedicated cloud silhouette helper',sourceText.includes('function '+HELPER+'('),{helper:HELPER});
    for(const item of cases){
      await mount(page,item);observerOpen=true;
      const before=await snapshot(page),value={item,before,...await evidence(page),paint:await page.evaluate(()=>stopStormCloudObserver())};observerOpen=false;report.cases.push(value);
      check(item.id+' native observation restored all methods',value.paint.methodsRestored&&value.paint.endDepth===value.paint.startDepth&&value.paint.minimumDepth>=0,{restored:value.paint.methodsRestored,startDepth:value.paint.startDepth,endDepth:value.paint.endDepth,minimumDepth:value.paint.minimumDepth});
      check(item.id+' cloud paint is finite and observed',value.paint.cloudOps.length>0&&value.paint.cloudOps.every(op=>op.args.every(arg=>typeof arg!=='number'||Number.isFinite(arg))),{operations:value.paint.cloudOps.length,clips:value.paint.cloudOps.filter(op=>op.name==='clip').length});
      if(!BASELINE)check(item.id+' cloud light fields share one native silhouette clip',value.paint.cloudOps.filter(op=>op.name==='clip').length===1,{clips:value.paint.cloudOps.filter(op=>op.name==='clip').length});
      if(item.phase)check(item.id+' intended surface phase matches actual kernel',value.model.visualType===item.phase,{expected:item.phase,actual:value.model.visualType});
      check(item.id+' scene dataset matches actual phase',before.dataset.precipitationType===value.model.visualType,before.dataset);
      check(item.id+' mounted media preference matches fixture',value.actualMotionPreference===(item.motion==='reduce'),{actual:value.actualMotionPreference,expected:item.motion,dataset:value.dataset});
      check(item.id+' no page horizontal overflow',!value.pageOverflow,{width:value.logicalWidth,height:value.logicalHeight});
      check(item.id+' prior owned canvas cleaned up on remount',value.previousCanvasReleased);
      cloudGeometryChecks(item.id,value);scientificInkChecks(item.id,value);captionChecks(item.id,value);compareCase(item.id,value);await capture(page,item,value);
      await page.waitForTimeout(150);const after=await snapshot(page);value.after=after;
      check(item.id+' passive paints preserve full learner state',same(before.data,after.data),{before:hash(JSON.stringify(stable(before.data))),after:hash(JSON.stringify(stable(after.data)))});
      check(item.id+' paused native canvas pixels stay fixed',before.canvasSha256===after.canvasSha256,{before:before.canvasSha256,after:after.canvasSha256});
      check(item.id+' native canvas context and hooks retained',retained(after),after.engine);save();
    }
    if(!CASE_SELECTION.length){
    const item={id:'native-wind-select',preset:'mountainSnow',phase:'snow',width:390,theme:'light',motion:'reduce',forcedColors:'none'};
    await mount(page,item);observerOpen=true;await page.evaluate(()=>stopStormCloudObserver());observerOpen=false;const before=await snapshot(page);
    await installObserver(page);observerOpen=true;await page.selectOption('#wcPrecipWindDirection','west');await settle(page);
    const after=await snapshot(page),value={item,before,after,...await evidence(page),paint:await page.evaluate(()=>stopStormCloudObserver())};observerOpen=false;report.nativeActions.push({label:'Original wind direction select',...value});
    const strip=value=>{const copy=JSON.parse(JSON.stringify(value));delete copy.precipHunt;return copy;};
    check('Original native wind control updates exact model direction',after.data.precipHunt.windDirection==='west'&&value.model.config.windDirection==='west'&&after.dataset.precipitationWindDirection==='west',{input:after.data.precipHunt.windDirection,model:value.model.config.windDirection,dataset:after.dataset.precipitationWindDirection});
    check('Original native wind control preserves saved records and XP',same(strip(before.data),strip(after.data))&&same(before.data.precipHunt.experiment,after.data.precipHunt.experiment),{before:strip(before.data),after:strip(after.data)});
    check('Original native wind control retains engine and restores observation',retained(after,true)&&value.paint.methodsRestored,after.engine);
    if(compare){const original=compare.nativeActions.find(action=>action.label==='Original wind direction select');check('Native wind config update preserves original model and hook rebind behavior',!!original&&same(original.model,value.model)&&same(original.after.engine,after.engine),{baseline:original&&original.after.engine,candidate:after.engine});}
    cloudGeometryChecks(item.id,value);scientificInkChecks(item.id,value);captionChecks(item.id,value);await capture(page,item,value);
    }
    check('Pinned source bytes remain unchanged',hash(fs.readFileSync(SOURCE))===EXPECTED);
    check('No runtime or console errors',report.errors.length===0&&report.consoleErrors.length===0,{consoleErrors:report.consoleErrors});
    report.completed=true;report.successful=report.errors.length===0&&report.consoleErrors.length===0;
  }catch(error){report.errors.push(error.stack||String(error));}
  finally{
    if(observerOpen&&page)try{report.observerCleanup=await page.evaluate(()=>window.stopStormCloudObserver?stopStormCloudObserver():null);}catch(error){report.errors.push('Observer cleanup: '+String(error));}
    if(browser)try{await browser.close();report.browserClosed=true;report.browserClosedAt=new Date().toISOString();}catch(error){report.errors.push('Browser closure: '+String(error));report.successful=false;}
    report.resourcesClosed=!browser||report.browserClosed;report.completedAt=new Date().toISOString();save();
    console.log(JSON.stringify({prefix:PREFIX,pid:report.pid,completed:report.completed,successful:report.successful,checks:report.checks.length,cases:report.cases.length,captures:report.captures.length,nativeActions:report.nativeActions.length,loadedRuntimeSha256:report.loadedRuntimeSha256,errors:report.errors,consoleErrors:report.consoleErrors,browserClosed:report.browserClosed,resourcesClosed:report.resourcesClosed}));
    if(!report.successful)process.exitCode=1;
  }
})();
