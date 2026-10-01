const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({headless:true});try{
 const p=await b.newPage({viewport:{width:1100,height:1000}}),url=fs.readFileSync(path.join(__dirname,'review-url.txt'),'utf8');
 await p.goto(url);await p.waitForSelector('canvas[role=application]');await p.waitForTimeout(800);
 const c=p.locator('canvas[role=application]'); const hud=()=>p.locator('[aria-label="Hunter Sim status: health, stamina, hunger, camouflage, score"]').innerText();
 const setup=()=>p.evaluate(()=>{const s=__glRecorder.records.find(r=>r.scene).scene;window.__p=s.children.find(o=>o.type==='Group'&&o.children.some(c=>c.geometry?.type==='SphereGeometry'&&c.geometry.parameters.radius===0.55));window.__s=s;});await setup();
 const den=await p.evaluate(()=>{const den=__s.children.find(o=>o.type==='Group'&&o.children.some(c=>c.geometry?.type==='RingGeometry'&&c.geometry.parameters.outerRadius===2));__p.position.x=den.position.x;__p.position.z=den.position.z;return den.position.toArray()});
 await p.waitForTimeout(200);const before=await hud();await c.focus();await p.keyboard.down('q');await p.waitForTimeout(1800);await p.keyboard.up('q');const after=await hud();
 const results={controlledDen:{den,before,after,player:await p.evaluate(()=>__p.position.toArray())}};
 await c.screenshot({path:path.join(__dirname,'05-den-height-confirmed.png')});
 await p.reload();await p.waitForSelector('canvas[role=application]');await p.waitForTimeout(800);await setup();
 // Place an existing live crab at reachable x/z and use the real click handler, twice.
 const catches=[];for(let i=0;i<2;i++){
  const found=await p.evaluate(()=>{const prey=__s.children.find(o=>o.userData?.alive&&o.userData?.cfg);if(!prey)return false;prey.position.set(__p.position.x,__p.position.y,__p.position.z);return true;});
  if(!found)throw new Error('No live crab');await c.click({position:{x:600,y:400}});await p.waitForTimeout(150);catches.push({hud:await hud(),saved:await p.evaluate(()=>__toolData.cephalopodLab.huntsSuccessful)});
 }results.catches=catches;
 await p.getByRole('button',{name:/End run/}).click();await p.waitForTimeout(200);
 results.afterExit={contexts:await p.evaluate(()=>__glContexts()),leaderboard:await p.evaluate(()=>localStorage.getItem('allo.cephalopodlab.leaderboard.v1'))};
 fs.writeFileSync(path.join(__dirname,'controlled-observations.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
