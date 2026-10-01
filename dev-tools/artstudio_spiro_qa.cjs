// Real browser geometry, export, playback and responsive checks.
// Run: node dev-tools/artstudio_spiro_qa.cjs
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=file=>fs.readFileSync(file,'utf8');
const out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1];
(async()=>{
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  const errors=[],measurements=[];
  page.on('pageerror',error=>errors.push(error.message));
  async function mount(extra={}) {
    await page.goto('about:blank');
    await page.setContent('<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui;background:white}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
    await page.addScriptTag({content:shell});
    await page.evaluate(extra=>window.__mount('artStudio',false,{tab:'spirograph',studioHome:false,studioStarted:true,spiroPaused:true,spiroPaper:'transparent',...extra}),extra);
    await page.locator('#spiroCanvas').waitFor();
  }
  try {
    for(const curve of ['inside','outside']) {
      await mount({spiroCurve:curve,spiroR:200,spiror:11,spirop:120,spiroLineWidth:4,spiroRainbow:true});
      const result=await page.evaluate(async()=>{
        const live=document.querySelector('#spiroCanvas'),canvas=live._spiroExportCanvas();
        const rgba=canvas.getContext('2d').getImageData(0,0,512,512).data;
        let ink=0,minX=512,minY=512,maxX=0,maxY=0;
        for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(rgba[(y*512+x)*4+3]){ink++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
        const svg=live._spiroSVG(),image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();
        const other=document.createElement('canvas');other.width=other.height=512;const ctx=other.getContext('2d');ctx.drawImage(image,0,0);
        const reference=ctx.getImageData(0,0,512,512).data;
        let difference=0;
        // Compare over white so alpha-edge RGB does not distort the measure.
        for(let i=0;i<rgba.length;i+=4)for(let c=0;c<3;c++)difference+=Math.abs((rgba[i+c]*rgba[i+3]/255+255-rgba[i+3])-(reference[i+c]*reference[i+3]/255+255-reference[i+3]));
        return {ink,bounds:{minX,minY,maxX,maxY},meanChannelDifference:difference/(512*512*3),liveProgress:Number(live.dataset.spiroProgress),paths:(svg.match(/<path /g)||[]).length};
      });
      assert(result.ink>1000);
      assert(result.bounds.minX>=15&&result.bounds.minY>=15&&result.bounds.maxX<=496&&result.bounds.maxY<=496,'fitted ink stays within paper');
      assert(result.meanChannelDifference<2,'SVG and PNG should show the same curve');
      assert.equal(result.liveProgress,0,'export must not advance the paused preview');
      assert.equal(result.paths,360);
      measurements.push({curve,...result});
    }
    await mount({spiroR:150,spiror:50,spirop:80,spiroCurve:'outside',spiroLineWidth:3,spiroRainbow:true,spiroPaper:'dark'});
    await page.getByRole('button',{name:'Finish drawing',exact:true}).click();
    assert.equal(await page.locator('#artstudio-spiro-progress').evaluate(el=>el.value),100);
    await page.getByRole('button',{name:'Focus workspace',exact:true}).click();
    const desktop=await page.locator('#spiroCanvas').boundingBox();
    assert(desktop.width>=700);
    await page.screenshot({path:path.join(out,'spiro-outside-focus.png')});
    for(const format of ['PNG','SVG']) {
      const downloading=page.waitForEvent('download');
      await page.getByRole('button',{name:'Export spirograph as '+format,exact:true}).click();
      const download=await downloading;
      await download.saveAs(path.join(out,'spiro-browser-export.'+format.toLowerCase()));
    }
    await page.setViewportSize({width:390,height:844});
    const preview=await page.locator('#spiroCanvas').boundingBox(),controls=await page.locator('[data-artstudio-spiro-controls]').boundingBox();
    assert(preview.y<controls.y&&preview.width>330);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390));
    const buttons=await page.locator('[data-artstudio-spiro-layout] button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
    assert(buttons.every(height=>height>=44));
    await page.screenshot({path:path.join(out,'spiro-phone-focus.png')});
    measurements.push({desktopPreview:desktop.width,phonePreview:preview.width,phonePreviewFirst:true,phoneTouchTargets:true});
    await page.setViewportSize({width:1440,height:1000});
    await mount({spiroPaused:false,spiroSpeed:2});
    await page.getByRole('button',{name:'Pause drawing',exact:true}).click();
    const paused=await page.locator('#spiroCanvas').getAttribute('data-spiro-progress');
    await page.evaluate(()=>{window.__spiroBefore=document.querySelector('#spiroCanvas');return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    assert.equal(await page.locator('#spiroCanvas').getAttribute('data-spiro-progress'),paused);
    await page.locator('#artstudio-spiroSpeed').fill('20');
    assert(await page.evaluate(()=>window.__spiroBefore===document.querySelector('#spiroCanvas')));
    await page.getByRole('button',{name:'Resume drawing',exact:true}).click();
    await page.waitForFunction(previous=>Number(document.querySelector('#spiroCanvas').dataset.spiroProgress)>Number(previous),paused);
    await page.getByRole('button',{name:'Finish drawing',exact:true}).click();
    assert.equal(await page.locator('#artstudio-spiro-progress').evaluate(el=>el.value),100);
    measurements.push({pause:true,resume:true,speedPreservesCanvas:true,finish:true});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'spiro-browser-results.json'),JSON.stringify({passed:true,measurements,errors},null,2));
    console.log(JSON.stringify({passed:true,measurements,errors},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
