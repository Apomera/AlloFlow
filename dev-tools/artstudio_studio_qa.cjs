// Studio-wide focus and real Canvas/CSS gradient parity checks.
// Run: node dev-tools/artstudio_studio_qa.cjs
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=file=>fs.readFileSync(file,'utf8');
const out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1];
const tabs=['artistExplorer','colorWheel','mixer','watercolor','pixel','symmetry','spirograph','generative','spinArt','stringArt','opArt','tessellation','fractal','gradient','stereogram','sculpt3d','contrast','harmonyHunt'];

(async()=>{
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[],measurements=[];
  page.on('pageerror',error=>errors.push(error.message));
  async function mount(tab,extra={},legacyConic=false) {
    await page.goto('about:blank');
    await page.setContent('<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui;background:#fff}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    const files=['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js'];
    if(tab==='sculpt3d')files.push('desktop/web-app/public/vendor/three-r128/three.min.js','desktop/web-app/public/vendor/three-r128/OrbitControls.js');
    files.push('stem_lab/stem_tool_artstudio.js');
    for(const file of files)await page.addScriptTag({content:read(file)});
    await page.addScriptTag({content:shell});
    if(legacyConic)await page.evaluate(()=>{CanvasRenderingContext2D.prototype.createConicGradient=undefined;});
    await page.evaluate(({tab,extra})=>window.__mount('artStudio',false,{tab,studioHome:false,studioStarted:true,genPaused:true,spinPaused:true,opPaused:true,spiroAnimate:false,stereoAnimPlaying:false,...extra}),{tab,extra});
    await page.locator('#artstudio-focus-toggle').waitFor();
  }
  try {
    for(const tab of tabs) {
      await mount(tab,{pixelData:{'2,3':'#ef4444'}});
      const before=await page.locator('[data-artstudio-stage]').boundingBox();
      await page.evaluate(()=>{window.__qaCanvas=document.querySelector('[data-artstudio-workspace] canvas');});
      await page.getByRole('button',{name:'Focus workspace',exact:true}).click();
      const after=await page.locator('[data-artstudio-stage]').boundingBox();
      assert(after.width>before.width+200,tab+' should gain workspace width');
      assert(await page.locator('[data-artstudio-grouped-nav]').isHidden());
      assert(await page.locator('[data-artstudio-inspector-shell]').isHidden());
      assert.equal(await page.getByRole('combobox',{name:'Studio tool',exact:true}).locator('option').count(),18);
      assert(await page.evaluate(()=>window.__qaCanvas===document.querySelector('[data-artstudio-workspace] canvas')),tab+' should retain its live canvas');
      if(tab==='gradient'||tab==='spirograph')await page.screenshot({path:path.join(out,'studio-focus-'+tab+'.png')});
      await page.locator('[data-artstudio-workspace]').focus();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('[data-artstudio-root]').getAttribute('data-artstudio-focus'),'false');
      assert(await page.locator('[data-artstudio-grouped-nav]').isVisible());
      measurements.push({tab,normalWidth:before.width,focusWidth:after.width,sameCanvas:true,escape:true});
    }
    const stops=[{hue:20,sat:100,lit:45,pos:0},{hue:140,sat:40,lit:80,pos:45},{hue:260,sat:75,lit:25,pos:100}];
    for(const scenario of [{type:'linear',angle:0},{type:'linear',angle:45},{type:'linear',angle:90},{type:'linear',angle:135},{type:'radial'},{type:'conic'},{type:'linear',angle:90,blend:'hard'},{type:'radial',blend:'hard'},{type:'conic',blend:'hard'},{type:'conic',legacy:true},{type:'conic',blend:'hard',legacy:true}]) {
      await mount('gradient',{gradType:scenario.type,gradAngle:scenario.angle||0,gradBlend:scenario.blend||'smooth',gradStops:stops},scenario.legacy);
      const native=await page.evaluate(()=>{
        const c=document.querySelector('#gradientCanvas'),data=c.getContext('2d').getImageData(0,0,512,512).data;
        const samples=[];
        for(let y=17;y<512;y+=47)for(let x=19;x<512;x+=43){const i=(y*512+x)*4;samples.push({x,y,rgb:Array.from(data.slice(i,i+3))});}
        const css=document.querySelector('#artstudio-gradient-css').textContent;
        const box=document.createElement('div');box.id='gradient-css-qa';Object.assign(box.style,{width:'512px',height:'512px',position:'fixed',top:0,left:0,zIndex:2147483647,background:css});document.body.append(box);
        if(!box.style.backgroundImage)throw new Error('Invalid gradient CSS: '+css);
        return {samples,css};
      });
      const screenshot=await page.locator('#gradient-css-qa').screenshot();
      const comparison=await page.evaluate(async({encoded,samples})=>{
        const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();
        const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
        const pixels=ctx.getImageData(0,0,512,512).data;
        const differences=samples.map(p=>{const i=(p.y*512+p.x)*4;return Math.max(...p.rgb.map((v,k)=>Math.abs(v-pixels[i+k])));});
        return {maximum:Math.max(...differences),average:differences.reduce((a,b)=>a+b,0)/differences.length};
      },{encoded:screenshot.toString('base64'),samples:native.samples});
      assert(comparison.maximum<=4,JSON.stringify({scenario,comparison,css:native.css}));
      measurements.push({gradient:scenario,channelDifference:comparison});
    }
    await mount('gradient',{gradStops:stops,gradType:'conic',gradBlend:'hard'});
    await page.getByRole('button',{name:'Focus workspace',exact:true}).click();
    await page.screenshot({path:path.join(out,'studio-gradient-bands.png')});
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('combobox',{name:'Studio tool',exact:true}).selectOption('gradient');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390),'Phone focus view must not overflow horizontally');
    const phoneCanvas=await page.locator('#gradientCanvas').boundingBox();
    const phoneControls=await page.locator('[data-artstudio-gradient-layout]>div').boundingBox();
    assert(phoneCanvas.y<phoneControls.y && phoneCanvas.width>330,'Phone focus view should put a large gradient preview before the controls');
    const hardEdge=await page.getByRole('button',{name:'Hard Edge',exact:true}).boundingBox();
    assert(hardEdge.height>=44,'Gradient buttons must retain finger-sized targets');
    await page.screenshot({path:path.join(out,'studio-focus-phone.png')});
    await page.getByRole('button',{name:'Open Thread Kit',exact:true}).click();
    await page.getByRole('dialog',{name:'Studio inspector',exact:true}).waitFor();
    assert.equal(await page.locator('[data-artstudio-root]').getAttribute('data-artstudio-focus'),'false');
    await page.getByRole('button',{name:'Back to artwork',exact:true}).click();
    measurements.push({phoneFocus:true,kitDialogRestored:true,noHorizontalOverflow:true,previewBeforeControls:true,previewWidth:phoneCanvas.width,gradientTouchTargetHeight:hardEdge.height});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'studio-focus-gradient-browser.json'),JSON.stringify({passed:true,measurements,errors},null,2));
    console.log(JSON.stringify({passed:true,measurements,errors},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
