'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=async function({page,result,settle,warm,assert,root}){
 const r=result.desktopComparison={scope:'Same browser and viewport, identical paused surface seed, settled fonts and three native render frames; baseline/candidate alternated to diagnose the 4px pad variance from separately sequenced runs.',rows:[],checks:[],baselineSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'reports/watercycle-pilot-mobile-hud-reflow/baseline-source.js'))).digest('hex')},url=page.url().split('?')[0];
 for(let repetition=1;repetition<=2;repetition++)for(const baseline of [true,false]){
  await page.goto(url+(baseline?'?baseline=1':''));await page.waitForFunction(()=>window.pilotReview&&window.waterReviewData?.pilot?.snapshot);await page.evaluate(()=>{window.wcagRender=false;});
  for(const compact of [true,false]){
   await page.setViewportSize({width:1280,height:1000});
   await page.evaluate(compact=>mountWater({wcMode:'pilot',pilot:{onboardingComplete:true,paused:true,hudCompact:compact,pauseAtChanges:true,navigationAssist:false}},'light'),compact);
   await page.waitForFunction(()=>waterReviewData.pilot.snapshot);await page.evaluate(()=>document.fonts.ready);await settle();await warm();
   await page.mouse.move(0,0);await page.locator('.wc-pilot-hud-toggle').focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');await settle();
   const row=await page.evaluate(({baseline,repetition,compact})=>{const stage=document.querySelector('.wc-pilot-stage'),s=stage.getBoundingClientRect(),props=['width','height','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','paddingLeft','paddingRight','borderLeftWidth','borderRightWidth','gap','minWidth','boxSizing'],read=e=>{const b=e.getBoundingClientRect(),c=getComputedStyle(e);return{classes:e.className,text:e.textContent.trim(),rect:{x:b.x-s.x,y:b.y-s.y,width:b.width,height:b.height},styles:Object.fromEntries(props.map(k=>[k,c[k]])),pressed:e.getAttribute('aria-pressed')};};return{baseline,repetition,compact,fontStatus:document.fonts.status,stage:{width:s.width,height:s.height},groups:[...stage.querySelectorAll('.wc-pilot-hud-left,.wc-pilot-hud-right,.wc-pilot-pad')].map(read),pad:[...stage.querySelectorAll('.wc-pilot-pad *')].map(read),fontChecks:{system:document.fonts.check('900 12px system-ui'),emoji:document.fonts.check('900 12px "Segoe UI Emoji"')}};},{baseline,repetition,compact});
   r.rows.push(row);console.log('DESKTOP '+JSON.stringify({baseline,repetition,compact,pad:row.groups.find(g=>g.classes==='wc-pilot-pad').rect}));
  }
 }
 const comparison=x=>JSON.stringify({stage:x.stage,groups:x.groups,pad:x.pad,fontChecks:x.fontChecks});
 for(const repetition of [1,2])for(const compact of [true,false]){const rows=r.rows.filter(x=>x.repetition===repetition&&x.compact===compact),ok=comparison(rows[0])===comparison(rows[1]);r.checks.push({name:`Matched ${compact?'compact':'expanded'} desktop geometry and control CSS, repetition ${repetition}`,ok});assert(ok,r.checks.at(-1).name);}
};
