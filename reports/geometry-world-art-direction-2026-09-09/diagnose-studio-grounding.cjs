const fs=require('fs');
const previous=fs.readFileSync('reports/geometry-world-graphics-2026-09-08/verify-showcase.cjs','utf8');
const fixtureBody=previous.match(/results\.checks\.fixture = await page\.evaluate\(\(\) => \{([\s\S]*?)\n    \}\);\n    await page\.waitForTimeout\(800\);/)[1];
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness+='('+(async function(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1180,height:860},deviceScaleFactor:1});page.setDefaultTimeout(90000);
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.__geoWorldEngine);
  await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();await page.waitForFunction(()=>__geoWorldEngine._currentLesson?.sandbox===true);
  await page.evaluate(new Function(fixtureBody));await page.evaluate(()=>{const e=__geoWorldEngine;e.applyRenderQuality('balanced');__ctx.updateMulti('geometryWorld',{renderQuality:'balanced'});__aimAt(-2,1,2);e.camera.updateMatrixWorld(true);});
  await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.getByRole('button',{name:'Studio',exact:true}).click();
  const details=await page.evaluate(()=>{const s=__geoWorldEngine._showcase.studio,c=s.group.getObjectByName('gwe-studio-contact-shadow'),p=s.group.getObjectByName('gwe-studio-light-pool');return [c,p].map(o=>{const canvas=o.material.map.image,x=canvas.getContext('2d'),d=x.getImageData(0,0,canvas.width,canvas.height).data;let minX=Infinity,minY=Infinity,maxX=-1,maxY=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(d[(y*canvas.width+x)*4+3]>2){minX=Math.min(x,minX);minY=Math.min(y,minY);maxX=Math.max(x,maxX);maxY=Math.max(y,maxY);}return {name:o.name,size:[canvas.width,canvas.height],alphaBounds:[minX,minY,maxX,maxY],corners:[d[3],d[(canvas.width-1)*4+3],d[d.length-1]],opacity:o.material.opacity,filter:o.material.map.minFilter};});});console.log(JSON.stringify(details));
  for(const mode of ['both','contact-hidden','pool-hidden']){
   await page.evaluate(mode=>{const s=__geoWorldEngine._showcase.studio;s.group.getObjectByName('gwe-studio-contact-shadow').visible=mode!=='contact-hidden';s.group.getObjectByName('gwe-studio-light-pool').visible=mode!=='pool-hidden';},mode);await page.waitForTimeout(150);await page.screenshot({path:path.join(out,'grounding-'+mode+'.png'),timeout:60000});
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}).toString()+')();';eval(harness);
