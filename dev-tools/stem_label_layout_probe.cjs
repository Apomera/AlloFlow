// Measures the actual shared viewer's projection/label code with real DOM and Three.js.
// This isolates label layout; it does not benchmark GPU rendering or whole-app vitals.
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..');
async function run(){
  const browser=await chromium.launch({headless:true}); const results=[];
  try {
    for(const mode of ['before','after']) {
      const source=fs.readFileSync(path.join(root,mode==='before'?'scratch/browser-performance/stem_lab_module.before.js':'stem_lab/stem_lab_module.js'),'utf8');
      const a=source.indexOf('          function project('),b=source.indexOf('          // Rendering pauses',a);
      const c=source.indexOf('            // Label chips. Focused chip'),d=source.indexOf('\n          function bind()',c);
      assert.ok(a>=0&&b>a&&c>=0&&d>c);
      const labelBlock=source.slice(c,d).replace(/\s*}\s*$/, '');
      const page=await browser.newPage({viewport:{width:1000,height:700}});
      await page.setContent('<!doctype html><html lang="en"><title>Shared STEM label layout</title><div id="bay" style="position:relative;width:900px;height:600px"><canvas width="900" height="600" style="width:900px;height:600px"></canvas></div></html>');
      await page.addScriptTag({path:path.join(root,'vendor/three-r128/three.min.js')});
      await page.evaluate(()=>{
        const bay=document.getElementById('bay');
        window.props={showAllLabels:true};window.sel=null; window.cfg={parts:[]};
        window.S={THREE,meshes:{},labels:{},hovered:null,renderer:{domElement:bay.querySelector('canvas')},camera:new THREE.PerspectiveCamera(42,1.5,0.1,100),
          chipCss:strong=>'position:absolute;padding:3px 8px;font:'+(strong?'700':'400')+' 12px system-ui;border:1px solid black;white-space:nowrap;transform:translate(-50%,-50%);opacity:0;'};
        S.camera.position.set(0,3,8);S.camera.lookAt(0,0,0);S.camera.updateMatrixWorld();
        for(let i=0;i<24;i++){
          const id='part'+i;cfg.parts.push({id,label:'Part '+i});
          const g=new THREE.Group();g.position.set((i%6-2.5)*0.7,Math.floor(i/6)*0.5-0.6,0);g.updateMatrixWorld();S.meshes[id]=g;
          const el=document.createElement('div');el.textContent='Part '+i;el.style.cssText=S.chipCss(false);bay.appendChild(el);S.labels[id]=el;
        }
        document.body.offsetWidth;
      });
      await page.addScriptTag({content:'window.drawLabels=function(){'+source.slice(a,b)+'\n'+labelBlock+'\n};'});
      const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
      const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
      const before=await metrics();
      const positions=await page.evaluate(()=>{drawLabels();return Object.values(S.labels).map(el=>({left:el.style.left,top:el.style.top,opacity:el.style.opacity,width:el.offsetWidth,height:el.offsetHeight}));});
      const after=await metrics();
      const selected=await page.evaluate(()=>{sel='part3';props.showAllLabels=false;drawLabels();return Object.values(S.labels).filter(el=>el.style.opacity==='1').map(el=>el.textContent);});
      assert.deepEqual(selected,['Part 3']);
      results.push({mode,parts:24,layoutCount:after.LayoutCount-before.LayoutCount,styleCount:after.RecalcStyleCount-before.RecalcStyleCount,styleMs:(after.RecalcStyleDuration-before.RecalcStyleDuration)*1000,layoutMs:(after.LayoutDuration-before.LayoutDuration)*1000,positions});
      await page.close();
    }
    assert.deepEqual(results[1].positions,results[0].positions,'Label positions and dimensions must be preserved');
    assert.ok(results[1].styleCount<results[0].styleCount,'Style recalculations should improve');
    fs.mkdirSync(path.join(root,'reports/browser-performance'),{recursive:true});
    fs.writeFileSync(path.join(root,'reports/browser-performance/label-layout.json'),JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify(results.map(({positions,...r})=>r),null,2));
  } finally {await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
