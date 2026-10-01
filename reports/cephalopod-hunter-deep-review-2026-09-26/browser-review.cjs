const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const dir=__dirname;
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(fs.readFileSync(path.join(dir,'review-url.txt'),'utf8'));
 await page.waitForSelector('canvas[role=application]');
 const canvas=page.locator('canvas[role=application]');
 const hud=()=>page.locator('[aria-label="Hunter Sim status: health, stamina, hunger, camouflage, score"]').innerText();
 const key=async(k,ms)=>{await canvas.focus();await page.keyboard.down(k);await page.waitForTimeout(ms);await page.keyboard.up(k);};
 const scene=()=>page.evaluate(()=>{const s=__glRecorder.records.find(r=>r.scene).scene; const player=s.children.find(o=>o.type==='Group'&&o.children.some(c=>c.geometry&&c.geometry.type==='SphereGeometry'&&c.geometry.parameters.radius===0.55)); return {player:player.position.toArray(),floor:s.children.find(o=>o.geometry?.type==='PlaneGeometry'&&o.geometry.parameters.width===200).position.toArray()};});
 await page.waitForTimeout(2500);
 await canvas.screenshot({path:path.join(dir,'01-reef-original.png')});
 const findings={baseline:{hud:await hud(),census:await page.evaluate(()=>__glScene()),scene:await scene()},errors};
 await canvas.focus();await page.keyboard.press('Escape');
 const beforePause=await hud();await page.waitForTimeout(2100);const afterPause=await hud();
 findings.pause={before:beforePause,after:afterPause};
 await page.keyboard.press('Escape');
 await key('q',1500);
 findings.ascent=await scene();
 // Hold W, move keyboard focus out, then release W. The canvas never receives keyup.
 await canvas.focus();await page.keyboard.down('w');await page.waitForTimeout(250);
 await page.locator('input[type=search]').focus();await page.keyboard.up('w');
 const blurStart=await scene();await page.waitForTimeout(900);const blurEnd=await scene();
 findings.blur={start:blurStart,end:blurEnd,hud:await hud()};
 await canvas.focus();await page.keyboard.press('w');
 await page.keyboard.press('Escape');
 findings.beforeSurface={leaderboard:await page.evaluate(()=>localStorage.getItem('allo.cephalopodlab.leaderboard.v1'))};
 await page.getByRole('button',{name:/End run/}).click();await page.waitForTimeout(500);
 findings.surface={storage:await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))),contexts:await page.evaluate(()=>__glContexts()),summaryVisible:await page.getByText('End of dive',{exact:true}).count()};
 await page.screenshot({path:path.join(dir,'02-launch-original.png'),fullPage:true});
 // Remount a fresh run, inspect topology on original geometry parameters, and frame mutation rate.
 await page.reload();await page.waitForSelector('canvas[role=application]');await page.waitForTimeout(700);
 findings.rockTopology=await page.evaluate(()=>{const g=new THREE.IcosahedronGeometry(1,2);const a=g.attributes.position.array;const p=new Set();for(let i=0;i<a.length;i+=3)p.add([a[i],a[i+1],a[i+2]].map(n=>n.toFixed(5)).join(','));return {indexed:!!g.index,vertices:a.length/3,uniquePositions:p.size};});
 findings.hudChurn=await page.evaluate(async()=>{const h=document.querySelector('[aria-label="Hunter Sim status: health, stamina, hunger, camouflage, score"]');let mutations=0,frames=0;const observer=new MutationObserver(m=>mutations+=m.filter(x=>x.type==='childList'&&x.target===h).length);observer.observe(h,{childList:true});let done=false;function tick(){if(!done){frames++;requestAnimationFrame(tick)}}requestAnimationFrame(tick);await new Promise(r=>setTimeout(r,1000));done=true;observer.disconnect();return {seconds:1,frames,hudReplacements:mutations};});
 // Move a real den under the player's x/z for a controlled vertical-range experiment.
 findings.denVertical=await page.evaluate(()=>{const s=__glRecorder.records.find(r=>r.scene).scene;const p=s.children.find(o=>o.type==='Group'&&o.children.some(c=>c.geometry?.parameters.radius===0.55));const den=s.children.find(o=>o.type==='Group'&&o.children.some(c=>c.geometry?.type==='RingGeometry'&&c.geometry.parameters.outerRadius===2));if(!den)return null;window.__reviewDen=den;return {den:den.position.toArray()};});
 // Navigate through ordinary input to the known den, avoiding any alteration of game state.
 if(findings.denVertical){
   const den=findings.denVertical.den; const pos=(await scene()).player; const angle=Math.atan2(den[0]-pos[0],den[2]-pos[2]);
   await key(angle>=0?'a':'d',Math.abs(angle)/2*1000);
   await key('w',Math.hypot(den[0]-pos[0],den[2]-pos[2])/2.6*1000);
   findings.denVertical.atGround={scene:await scene(),hud:await hud()};
   await key('q',2200);
   findings.denVertical.above={scene:await scene(),hud:await hud()};
 }
 await canvas.screenshot({path:path.join(dir,'03-above-den.png')});
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{document.getElementById('wrap').style.width='100%';});await page.waitForTimeout(500);
 findings.mobile=await page.evaluate(()=>{const c=document.querySelector('canvas[role=application]'),h=document.querySelector('[aria-label="Hunter Sim status: health, stamina, hunger, camouflage, score"]');return {viewport:innerWidth,canvas:c.getBoundingClientRect().toJSON(),hud:h.getBoundingClientRect().toJSON(),controls:[...c.parentElement.querySelectorAll('button')].length};});
 await canvas.screenshot({path:path.join(dir,'04-mobile-original.png')});
 fs.writeFileSync(path.join(dir,'observations.json'),JSON.stringify(findings,null,2));
 console.log(JSON.stringify(findings,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
