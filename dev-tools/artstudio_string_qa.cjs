// String Art geometry, construction downloads, playback and responsive QA.
// Run: node dev-tools/artstudio_string_qa.cjs
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
    await page.evaluate(extra=>window.__mount('artStudio',false,{tab:'stringArt',studioHome:false,studioStarted:true,strPaused:true,strPaper:'transparent',...extra}),extra);
    await page.locator('#stringCanvas').waitFor();
  }
  try {
    for(const shape of ['circle','square','triangle','star']) {
      const rule=shape==='square'?'skip':'multiply';
      await mount({strShape:shape,strNails:60,strMult:13,strSkip:7,strOffset:2,strOpacity:45,strLineWidth:2,strRainbow:true,strLabelPins:true,strRule:rule});
      const result=await page.evaluate(async()=>{
        const live=document.querySelector('#stringCanvas'),canvas=live._strExportCanvas();
        const pixels=canvas.getContext('2d').getImageData(0,0,512,512).data;
        const svg=live._strSVG(),image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();
        const other=document.createElement('canvas');other.width=other.height=512;const ctx=other.getContext('2d');ctx.drawImage(image,0,0);
        const reference=ctx.getImageData(0,0,512,512).data;
        let difference=0,ink=0;
        for(let i=0;i<pixels.length;i+=4){if(pixels[i+3])ink++;for(let c=0;c<3;c++)difference+=Math.abs((pixels[i+c]*pixels[i+3]/255+255-pixels[i+3])-(reference[i+c]*reference[i+3]/255+255-reference[i+3]));}
        const parsed=new DOMParser().parseFromString(svg,'image/svg+xml');
        return {meanChannelDifference:difference/(512*512*3),ink,liveProgress:Number(live.dataset.strProgress),paths:parsed.querySelectorAll('path').length,pins:parsed.querySelectorAll('circle').length,labels:parsed.querySelectorAll('text').length,rows:[...document.querySelectorAll('[data-artstudio-string-guide] tbody tr')].map(row=>[...row.children].map(cell=>Number(cell.textContent)))};
      });
      assert(result.ink>1000);
      assert(result.meanChannelDifference<1.5,'SVG/PNG parity: '+JSON.stringify({shape,result}));
      assert.equal(result.liveProgress,0);
      assert.equal(result.pins,60);
      assert.equal(result.labels,30);
      assert.equal(result.paths,result.rows.length);
      for(const [from,to] of result.rows)assert.equal(to,(rule==='skip'?from+9:from*13+2)%60);
      measurements.push({shape,rule,...result,rows:result.rows.length});
    }
    await mount({strShape:'circle',strNails:80,strMult:2,strOffset:7,strRainbow:true,strLabelPins:true,strOpacity:70,strLineWidth:1.5,strPaper:'light'});
    await page.getByRole('button',{name:'Finish drawing',exact:true}).click();
    await page.getByRole('button',{name:'Focus workspace',exact:true}).click();
    const desktop=await page.locator('#stringCanvas').boundingBox();
    assert(desktop.width>=700);
    await page.screenshot({path:path.join(out,'string-construction-focus.png')});
    for(const format of ['PNG','SVG']) {
      const waiting=page.waitForEvent('download');
      await page.getByRole('button',{name:'Export string art as '+format,exact:true}).click();
      const download=await waiting;
      await download.saveAs(path.join(out,'string-browser-export.'+format.toLowerCase()));
    }
    await page.locator('[data-artstudio-string-guide] summary').click();
    const waiting=page.waitForEvent('download');
    await page.getByRole('button',{name:'Download connection guide (CSV)',exact:true}).click();
    const download=await waiting;
    const csvPath=path.join(out,'string-browser-connections.csv');await download.saveAs(csvPath);
    const rows=read(csvPath).trim().split(/\r?\n/);assert.equal(rows.shift(),'From pin,To pin');
    const visible=await page.locator('[data-artstudio-string-guide] tbody tr').evaluateAll(rows=>rows.map(row=>[...row.children].map(cell=>cell.textContent).join(',')));
    assert.deepEqual(rows,visible);
    await page.screenshot({path:path.join(out,'string-connection-guide.png')});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>scrollTo(0,0));
    const canvas=await page.locator('#stringCanvas').boundingBox(),controls=await page.locator('[data-artstudio-string-controls]').boundingBox();
    assert(canvas.y<controls.y&&canvas.width>330);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390));
    const buttons=await page.locator('[data-artstudio-string-layout] button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
    assert(buttons.every(height=>height>=44));
    await page.screenshot({path:path.join(out,'string-phone-focus.png')});
    measurements.push({desktopPreview:desktop.width,phonePreview:canvas.width,phonePreviewFirst:true,phoneTouchTargets:true,csvMatchesGuide:true,connections:rows.length});
    await page.setViewportSize({width:1440,height:1000});
    await mount({strNails:200,strPaused:true});
    await page.getByRole('button',{name:'Resume drawing',exact:true}).click();
    await page.waitForFunction(()=>Number(document.querySelector('#stringCanvas').dataset.strProgress)>0);
    await page.getByRole('button',{name:'Pause drawing',exact:true}).click();
    const paused=await page.locator('#stringCanvas').getAttribute('data-str-progress');
    await page.evaluate(()=>{window.__stringBefore=document.querySelector('#stringCanvas');return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    assert.equal(await page.locator('#stringCanvas').getAttribute('data-str-progress'),paused);
    await page.locator('#artstudio-strSpeed').fill('20');
    assert(await page.evaluate(()=>window.__stringBefore===document.querySelector('#stringCanvas')));
    await page.getByRole('button',{name:'Finish drawing',exact:true}).click();
    assert.equal(await page.locator('#artstudio-string-progress').evaluate(el=>el.value),100);
    // Returning from another lab restores the completed checkpoint.
    await page.getByRole('tab',{name:'Spirograph',exact:false}).click();
    await page.getByRole('tab',{name:'String Art',exact:false}).click();
    assert.equal(await page.locator('#artstudio-string-progress').evaluate(el=>el.value),100);
    measurements.push({pauseResume:true,speedPreservesCanvas:true,finish:true,tabRoundTripRestoresProgress:true});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'string-browser-results.json'),JSON.stringify({passed:true,measurements,errors},null,2));
    console.log(JSON.stringify({passed:true,measurements,errors},null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
