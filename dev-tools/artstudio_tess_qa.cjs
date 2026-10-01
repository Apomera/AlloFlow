// Tessellation coverage, warped picking, exports, history and responsive QA.
// Run: node dev-tools/artstudio_tess_qa.cjs
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=file=>fs.readFileSync(file,'utf8');
const out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1];
(async()=>{
  const browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[],measurements=[];page.on('pageerror',error=>errors.push(error.message));
  async function mount(extra={}) {
    await page.goto('about:blank');
    await page.setContent('<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui;background:white}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
    await page.addScriptTag({content:shell});
    await page.evaluate(extra=>window.__mount('artStudio',false,{tab:'tessellation',studioHome:false,studioStarted:true,...extra}),extra);
    await page.locator('#tessCanvas').waitFor();
  }
  async function pixelClick(x,y){const box=await page.locator('#tessCanvas').boundingBox();await page.mouse.click(box.x+x/512*box.width,box.y+y/512*box.height);}
  try {
    for(const shape of ['triangle','square','hexagon'])for(const scenario of [{grid:2,rotation:45,warp:50},{grid:6,rotation:0,warp:0},{grid:6,rotation:123,warp:35},{grid:20,rotation:45,warp:50}]) {
      await mount({tessShape:shape,tessGrid:scenario.grid,tessRotation:scenario.rotation,tessWarpAmt:scenario.warp});
      const result=await page.evaluate(async()=>{
        const canvas=document.querySelector('#tessCanvas'),svg=canvas._tessSVG(),parsed=new DOMParser().parseFromString(svg,'image/svg+xml');
        const polygons=[...parsed.querySelectorAll('polygon')].map(node=>{
          const points=node.getAttribute('points').split(' ').map(pair=>pair.split(',').map(Number));
          const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {points,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
        });
        function contains(points,x,y){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
        let samples=0,holes=0,overlaps=0;const failures=[];
        for(let y=1.317;y<512;y+=11.173)for(let x=2.719;x<512;x+=11.291){let count=0;for(const poly of polygons)if(x>=poly.minX&&x<=poly.maxX&&y>=poly.minY&&y<=poly.maxY&&contains(poly.points,x,y))count++;samples++;if(count===0)holes++;if(count>1)overlaps++;if(count!==1&&failures.length<3)failures.push({x,y,count});}
        const pixels=canvas.getContext('2d').getImageData(0,0,512,512).data;
        let uncoveredPixels=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]===15&&pixels[i+1]===23&&pixels[i+2]===42)uncoveredPixels++;
        const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();
        const comparison=document.createElement('canvas');comparison.width=comparison.height=512;const ctx=comparison.getContext('2d');ctx.drawImage(image,0,0);const reference=ctx.getImageData(0,0,512,512).data;
        let difference=0;for(let i=0;i<pixels.length;i++)if(i%4!==3)difference+=Math.abs(pixels[i]-reference[i]);
        return {tiles:polygons.length,samples,holes,overlaps,failures,uncoveredPixels,svgMeanChannelDifference:difference/(512*512*3)};
      });
      assert.equal(result.holes,0,JSON.stringify({shape,scenario,result}));
      assert.equal(result.overlaps,0,JSON.stringify({shape,scenario,result}));
      assert.equal(result.uncoveredPixels,0,JSON.stringify({shape,scenario,result}));
      assert(result.svgMeanChannelDifference<1.5);
      measurements.push({shape,...scenario,...result});
    }
    await mount({tessShape:'square',tessGrid:4,tessRotation:90,tessWarpAmt:50});
    const before=await page.locator('#tessCanvas').evaluate(c=>c.toDataURL());
    await page.getByRole('button',{name:'Paint tiles blue',exact:true}).click();
    await pixelClick(480,123);
    const capture=await page.locator('#tessCanvas').evaluate(c=>({data:c._captureArtStudioState().tessClickData,pixel:Array.from(c.getContext('2d').getImageData(480,123,1,1).data),png:c.toDataURL()}));
    assert.deepEqual(capture.data,{'square:0:1':4});
    assert.deepEqual(capture.pixel,[32,159,223,255]);
    await page.keyboard.press('Control+z');
    assert.equal(await page.locator('#tessCanvas').evaluate(c=>c.toDataURL()),before);
    await page.keyboard.press('Control+y');
    assert.equal(await page.locator('#tessCanvas').evaluate(c=>c.toDataURL()),capture.png);
    measurements.push({warpedRotatedHit:true,pickedPixel:capture.pixel,undoExact:true,redoExact:true});
    await mount({tessShape:'hexagon',tessGrid:8,tessRotation:25,tessWarpAmt:40,tessScheme:'cool'});
    await page.getByRole('button',{name:'Focus workspace',exact:true}).click();
    const desktop=await page.locator('#tessCanvas').boundingBox();assert(desktop.width>=700);
    await page.screenshot({path:path.join(out,'tess-warp-focus.png')});
    for(const format of ['PNG','SVG']){
      const waiting=page.waitForEvent('download');
      await page.getByRole('button',{name:format==='PNG'?'Export PNG':'Export tessellation as SVG',exact:true}).click();
      const download=await waiting;await download.saveAs(path.join(out,'tess-browser-export.'+format.toLowerCase()));
    }
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
    const preview=await page.locator('[data-artstudio-tess-preview]').boundingBox(),controls=await page.locator('[data-artstudio-tess-controls]').boundingBox();
    assert(preview.y<controls.y);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390));
    const visibleButtons=await page.locator('[data-artstudio-tess-layout] button').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>n.getBoundingClientRect().height));
    assert(visibleButtons.every(height=>height>=44));
    await page.screenshot({path:path.join(out,'tess-phone-focus.png')});
    measurements.push({desktopPreview:desktop.width,phonePreviewFirst:true,phoneNoOverflow:true,phoneTouchTargets:true});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'tess-browser-results.json'),JSON.stringify({passed:true,measurements,errors},null,2));console.log(JSON.stringify({passed:true,measurements,errors},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
