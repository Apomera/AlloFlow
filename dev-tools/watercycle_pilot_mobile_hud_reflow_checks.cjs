'use strict';
const fs = require('node:fs'), path = require('node:path');
module.exports = async function ({page, result, settle, audit, capture, source, assert, out, root}) {
  const verify = process.argv.includes('--verify');
  const r = result.mobileHud = {checks: [], layouts: [], keyboard: [], scope: 'Production DOM/CSS in the existing exact-source React/WebGL host, supported paused practice starts, and genuine original-kernel rain collection. Viewports measure CSS reflow, not physical browser zoom. No screen reader speech or complete WCAG conformance claim.'};
  const check = (name, ok, evidence) => {r.checks.push({name, ok, evidence}); console.log('CHECK ' + name + ' ' + ok); if (verify) assert(ok, name);};
  async function mount(width, compact = false, extra = {}) {
    await page.setViewportSize({width, height: 1000});
    await page.evaluate(({compact,extra}) => mountWater({wcMode: 'pilot', pilot: {onboardingComplete: true, paused: true, hudCompact: compact, pauseAtChanges: true, navigationAssist: false, ...extra}}, 'light'), {compact,extra});
    await page.waitForFunction(() => window.waterReviewData?.pilot?.snapshot && document.querySelector('#wcPilotCanvas'));
    await settle();
  }
  async function practice(name) {
    await page.locator('#wcPilotPractice').evaluate(e => {for (let p = e.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;});
    await page.locator('#wcPilotPractice').selectOption(name); await page.locator('#wcPilotPracticeStart').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(name => waterReviewData.pilot.snapshot?.practiceOrigin === name && waterReviewData.pilot.paused, name); await settle();
  }
  async function measure(label, verifyGeometry = true) {
    await page.locator('.wc-pilot-stage').scrollIntoViewIfNeeded(); await settle();
    const row = await page.evaluate(label => {
      const stage = document.querySelector('.wc-pilot-stage'), sr = stage.getBoundingClientRect(), box = e => {const b = e.getBoundingClientRect();return {x:b.x-sr.x,y:b.y-sr.y,width:b.width,height:b.height,right:b.right-sr.x,bottom:b.bottom-sr.y};};
      const visible = e => {const b=e.getBoundingClientRect(),s=getComputedStyle(e);return b.width>1 && b.height>1 && s.display!=='none' && s.visibility!=='hidden';};
      const groups = ['.wc-pilot-camera-switch','.wc-pilot-hud-left','.wc-pilot-hud-right','.wc-pilot-route','.wc-pilot-pad','.wc-pilot-ladder'].flatMap(selector => [...stage.querySelectorAll(selector)].filter(visible).map(e=>({selector,classes:e.className,text:e.textContent.trim(),box:box(e),position:getComputedStyle(e).position})));
      const children = ['.wc-pilot-hud-left','.wc-pilot-hud-right'].map(selector=>({selector,items:[...stage.querySelector(selector).children].filter(visible).map(e=>({classes:e.className,box:box(e)}))}));
      const intersects = (a,b) => Math.min(a.right,b.right)-Math.max(a.x,b.x)>.75 && Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>.75;
      const overlaps = []; for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++)if(intersects(groups[i].box,groups[j].box))overlaps.push([groups[i].classes,groups[j].classes]);
      const childOverlaps=[];for(const g of children)for(let i=0;i<g.items.length;i++)for(let j=i+1;j<g.items.length;j++)if(intersects(g.items[i].box,g.items[j].box))childOverlaps.push([g.items[i].classes,g.items[j].classes]);
      const clipped = groups.filter(g=>g.box.x<-.75 || g.box.right>sr.width+.75 || g.box.y<-.75 || g.box.bottom>sr.height+.75);
      return {label,viewport:{width:innerWidth,height:innerHeight},document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth},stage:{width:sr.width,height:sr.height,scrollWidth:stage.scrollWidth,clientWidth:stage.clientWidth},hud:stage.dataset.hud,form:waterReviewData.pilot.snapshot.form,practiceOrigin:waterReviewData.pilot.snapshot.practiceOrigin,groups,children,overlaps,childOverlaps,clipped};
    }, label);
    r.layouts.push(row); fs.writeFileSync(path.join(out,'layout-progress.json'),JSON.stringify(r,null,2));
    check(label+' has no horizontal page overflow',row.document.scrollWidth<=row.document.clientWidth+1,row.document);
    if(verifyGeometry) {
      check(label+' HUD sections and flight controls do not overlap',row.overlaps.length===0,row.overlaps);
      check(label+' water readouts, place and goal text occupy separate rows',row.childOverlaps.length===0,row.childOverlaps);
      check(label+' stage content stays inside the stage',row.clipped.length===0,row.clipped);
    }
    return row;
  }
  async function focusSample(label) {
    const row = await page.evaluate(label=>{const e=document.activeElement,b=e.getBoundingClientRect(),s=getComputedStyle(e),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return{label,name:e.getAttribute('aria-label')||e.textContent.trim(),id:e.id,classes:e.className,hit:!!hit&&(e===hit||e.contains(hit)),outline:s.outlineStyle,width:s.outlineWidth,rect:{x:b.x,y:b.y,width:b.width,height:b.height},inViewport:b.x>=0&&b.right<=innerWidth&&b.y>=0&&b.bottom<=innerHeight};},label);
    r.keyboard.push(row); check(label+' has visible unobscured keyboard focus',row.hit&&row.inViewport&&row.outline!=='none'&&parseFloat(row.width)>0,row);return row;
  }
  if(!process.argv.includes('--supplemental-visuals')) {
  for(const width of [320,390,640,1280]) {
    await mount(width,true); await measure(width+' compact surface',false);
    await page.locator('.wc-pilot-hud-toggle').focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await focusSample(width+' compact toggle');
    await page.keyboard.press('Enter'); await settle();
    check(width+' HUD toggle expands from the keyboard',await page.locator('.wc-pilot-stage').getAttribute('data-hud')==='full');
    await focusSample(width+' expanded toggle');
    await measure(width+' expanded surface',width<=700);
    if(width===640)await capture('640-expanded-surface');
    if(width===1280){await capture('desktop-expanded-surface');continue;}
    for(const name of ['cloud','rain','snow','soil','plant']) {
      await practice(name);const row=await measure(width+' expanded '+name);
      check(width+' '+name+' is a supported paused practice state',!!row.practiceOrigin&&row.practiceOrigin===name,{form:row.form,practice:row.practiceOrigin});
      if(width===320&&['rain','soil','plant'].includes(name))await capture('320-expanded-'+name);
    }
  }
  await mount(320,false); await practice('rain');
  await page.locator('#wcPilotLookToggle').focus(); await page.keyboard.press('Enter'); await settle();
  check('Keyboard opens Look controls',await page.locator('#wcPilotLookPanel').count()===1);
  const buttons=page.locator('#wcPilotLookPanel button:enabled'),count=await buttons.count();
  await buttons.first().focus(); await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
  for(let i=0;i<count;i++){if(i)await page.keyboard.press('Tab');await settle();await focusSample('320 Look target '+(i+1));}
  await capture('320-expanded-look');await page.keyboard.press('Escape');await settle();
  check('Escape closes Look and restores the toggle',await page.locator('#wcPilotLookPanel').count()===0&&await page.locator('#wcPilotLookToggle').evaluate(e=>e===document.activeElement));
  await focusSample('320 Look close return'); await audit('320-expanded-rain');
  }
  const fixture=require('./watercycle_pilot_rain_landing_motion_checks.cjs').fixture(source);r.fixtureScope=fixture.scope;
  await mount(390,false,{resumeCheckpoint:fixture.checkpoint,resumeToken:'mobile-hud-rain'});
  await page.waitForFunction(()=>waterReviewData.pilot.snapshot?.form==='rain');
  await page.locator('[data-control=pause]').click();
  await page.waitForFunction(()=>waterReviewData.pilot.paused&&waterReviewData.pilot.lastChange?.from==='rain'&&waterReviewData.pilot.lastChange?.to==='liquid',null,{timeout:90000});await settle();
  check('Genuine rain collection creates the learning notice',await page.locator('.wc-pilot-notice').count()===1&&await page.locator('#wcPilotLookPanel').count()===0);
  await page.locator('#wcPilotNoticeContinue').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await settle();await focusSample('390 collection Continue');
  await capture('390-collection-notice');await audit('390-collection-notice');
  await page.keyboard.press('Enter');await settle();
  if(!await page.evaluate(()=>waterReviewData.pilot.paused))await page.locator('[data-control=pause]').click();
  await page.setViewportSize({width:320,height:1000});await settle();
  r.completedCycle=await page.locator('.wc-pilot-cycle').evaluate(e=>{const b=e.getBoundingClientRect();return{text:e.textContent,rect:{x:b.x,y:b.y,width:b.width,height:b.height},lastCycle:waterReviewData.pilot.lastCycle,loops:waterReviewData.pilot.snapshot.loops};});
  check('Original-kernel collection exposes a completed-cycle debrief',r.completedCycle.loops===1&&r.completedCycle.lastCycle?.n===1,r.completedCycle);
  await page.locator('.wc-pilot-cycle-btn').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await settle();await focusSample('320 completed-cycle Keep flying');await capture('320-completed-cycle');
  await mount(320,false);await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await practice('plant');await measure('320 forced-colors expanded plant');await audit('320-forced-colors-expanded');await capture('320-forced-colors-plant');
  r.forcedColors=await page.evaluate(()=>({active:matchMedia('(forced-colors:active)').matches,rows:[...document.querySelectorAll('.wc-pilot-readouts dt,.wc-pilot-buoy,.wc-pilot-place span,.wc-pilot-place strong,.wc-pilot-gauge>span,.wc-pilot-gauge>small,.wc-pilot-micro>span,.wc-pilot-micro>strong,.wc-pilot-route-kicker,.wc-pilot-route>small')].map(e=>{const s=getComputedStyle(e);return{text:e.textContent,color:s.color,textFillColor:s.webkitTextFillColor,background:s.backgroundColor,forcedColorAdjust:s.forcedColorAdjust};})}));
  r.forcedColors.rawContrastFindings=result.audits.find(a=>a.label==='320-forced-colors-expanded').violations.filter(v=>v.id==='color-contrast');
  r.forcedColors.qualification='Raw axe contrast findings retained. Chromium forced-color painting uses system colors while axe may evaluate authored values; see https://github.com/dequelabs/axe-core/issues/3978 and https://www.w3.org/TR/css-color-adjust-1/. Full screenshot and computed text fill supply separate inspection evidence; color-contrast is not counted as passing in this forced-colors scan.';
  const baselinePath=path.join(root,'reports/watercycle-pilot-mobile-hud-reflow/baseline/results.json');
  if(verify&&fs.existsSync(baselinePath)) {
    const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8')).mobileHud.layouts;
    for(const row of r.layouts.filter(x=>x.label.includes('compact surface')||x.label==='1280 expanded surface')) {
      const before=baseline.find(x=>x.label===row.label);const compact=x=>({stage:x.stage,groups:x.groups.map(g=>({selector:g.selector,box:g.box,position:g.position})),children:x.children});
      check(row.label+' layout stays unchanged',!!before&&JSON.stringify(compact(before))===JSON.stringify(compact(row)),{before:before&&compact(before),after:compact(row)});
    }
  }
  if(verify)check('Scoped A/AA audits have no findings outside separately recorded forced-color contrast limitations',result.audits.every(a=>a.violations.every(v=>a.label==='320-forced-colors-expanded'&&v.id==='color-contrast')),result.audits.map(a=>({label:a.label,violations:a.violations.map(v=>v.id)})));
};
