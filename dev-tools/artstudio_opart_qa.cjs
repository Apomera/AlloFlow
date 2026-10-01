// Op Art geometry, frame continuity, exports and responsive browser checks.
// Run: node dev-tools/artstudio_opart_qa.cjs
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=file=>fs.readFileSync(file,'utf8'),out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1].replace('var ctx = { React: React','window.__edit=pair[1];window.__state=pair[0];var ctx = { React: React');
(async()=>{
  const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],measurements=[];
  page.on('pageerror',error=>errors.push(error.message));
  async function mount(extra={}){
    await page.goto('about:blank');
    await page.setContent('<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui;background:white}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
    await page.addScriptTag({content:shell});await page.evaluate(extra=>__mount('artStudio',false,{tab:'opArt',studioHome:false,studioStarted:true,opPaused:true,...extra}),extra);await page.locator('#opArtCanvas').waitFor();
  }
  const capture=()=>page.locator('#opArtCanvas').evaluate(canvas=>({state:canvas._captureArtStudioState(),png:canvas.toDataURL(),svg:canvas._opSVG()}));
  try{
    for(const style of ['concentric','checkerboard','moire','vibrating'])for(const scenario of [{opDensity:3,opPhase:359,opRotation:45,opWarp:100},{opDensity:20,opPhase:137,opRotation:23,opWarp:60},{opDensity:60,opPhase:91,opRotation:90,opWarp:100}]){
      await mount({opStyle:style,...scenario});
      const result=await page.locator('#opArtCanvas').evaluate(async canvas=>{
        const svg=canvas._opSVG(),pixels=canvas.getContext('2d').getImageData(0,0,512,512).data;let transparent=0;
        for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255)transparent++;
        const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();
        const output=document.createElement('canvas');output.width=output.height=512;const context=output.getContext('2d');context.drawImage(image,0,0);const reference=context.getImageData(0,0,512,512).data;
        let difference=0;for(let i=0;i<pixels.length;i++)if(i%4!==3)difference+=Math.abs(pixels[i]-reference[i]);
        const parsed=new DOMParser().parseFromString(svg,'image/svg+xml'),polygons=[...parsed.querySelectorAll('polygon')].map(node=>{
          const points=node.getAttribute('points').split(' ').map(pair=>pair.split(',').map(Number));const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {points,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
        });
        function contains(points,x,y){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
        let samples=0,holes=0,overlaps=0;
        if(polygons.length)for(let y=1.317;y<512;y+=17.173)for(let x=2.719;x<512;x+=17.291){let count=0;for(const polygon of polygons)if(x>=polygon.minX&&x<=polygon.maxX&&y>=polygon.minY&&y<=polygon.maxY&&contains(polygon.points,x,y))count++;samples++;if(!count)holes++;if(count>1)overlaps++;}
        return {transparentPixels:transparent,svgMeanChannelDifference:difference/(512*512*3),exportMatches:canvas._opExportPNG()===canvas.toDataURL(),polygons:polygons.length,samples,holes,overlaps};
      });
      assert.equal(result.transparentPixels,0);assert(result.svgMeanChannelDifference<1.5);assert(result.exportMatches);assert.equal(result.holes,0);assert.equal(result.overlaps,0);measurements.push({style,...scenario,...result});
    }
    await mount({opStyle:'moire',opHueA:0,opHueB:0,opPhase:42});
    assert(await page.locator('#opArtCanvas').evaluate(c=>{const pixels=c.getContext('2d').getImageData(0,0,512,512).data;let dark=0,light=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]<100)dark++;if(pixels[i]>200)light++;}return dark>1000&&light>1000;}));
    await mount({opStyle:'checkerboard',opPhase:53.4,opPaused:false});
    await page.waitForFunction(()=>Number(document.querySelector('#opArtCanvas').dataset.opPhase)>53.4);
    const pauseResult=await page.evaluate(()=>{const canvas=document.querySelector('#opArtCanvas'),before=canvas.toDataURL(),phase=canvas._captureArtStudioState().opPhase;document.querySelector('[aria-label="Pause Op Art animation"]').click();window.__opCanvas=canvas;return {sameImage:before===canvas.toDataURL(),samePhase:phase===canvas._captureArtStudioState().opPhase};});
    assert(pauseResult.sameImage&&pauseResult.samePhase);const paused=await capture();
    await page.evaluate(()=>ReactDOM.flushSync(()=>__edit(previous=>({artStudio:{...previous.artStudio,opSpeed:15}}))));assert.equal((await capture()).png,paused.png);
    await page.getByRole('button',{name:'Resume Op Art animation',exact:true}).click();
    await page.waitForFunction(phase=>Number(document.querySelector('#opArtCanvas').dataset.opPhase)>phase,paused.state.opPhase);
    await page.getByRole('button',{name:'Pause Op Art animation',exact:true}).click();
    await page.getByRole('button',{name:'Focus workspace',exact:true}).click();
    const beforeTrip=await capture();await page.getByLabel('Studio tool',{exact:true}).selectOption('tessellation');await page.getByLabel('Studio tool',{exact:true}).selectOption('opArt');
    const afterTrip=await capture();assert.equal(afterTrip.png,beforeTrip.png);assert.equal(afterTrip.state.opPhase,beforeTrip.state.opPhase);
    await page.locator('#artstudio-op-step').click();assert.notEqual((await capture()).png,afterTrip.png);
    measurements.push({pausePreservesExactFrame:true,speedPreservesExactFrame:true,resumeContinues:true,tabRoundTripRestoresExactFrame:true,manualStepChangesFrame:true,monochromeMoireVisible:true});
    await mount({opStyle:'checkerboard',opPhase:127,opRotation:18,opWarp:95,opDensity:14,opHueA:282,opSatA:65,opLitA:32,opHueB:40,opSatB:80,opLitB:87});
    await page.getByRole('button',{name:'Focus workspace',exact:true}).click();const desktop=await page.locator('#opArtCanvas').boundingBox();assert(desktop.width>=700);
    await page.screenshot({path:path.join(out,'op-checker-focus.png')});
    for(const format of ['PNG','SVG']){const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Export Op Art as '+format,exact:true}).click();await (await waiting).saveAs(path.join(out,'op-browser-export.'+format.toLowerCase()));}
    await page.evaluate(()=>ReactDOM.flushSync(()=>__edit(previous=>({artStudio:{...previous.artStudio,opStyle:'vibrating',opDensity:20,opRotation:38,opWarp:100}}))));
    await page.screenshot({path:path.join(out,'op-waves-focus.png')});
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
    const preview=await page.locator('[data-artstudio-op-preview]').boundingBox(),controls=await page.locator('[data-artstudio-op-controls]').boundingBox();assert(preview.y<controls.y);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390));
    const buttons=await page.locator('[data-artstudio-op-layout] button').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).map(node=>({height:node.getBoundingClientRect().height,overflow:node.scrollWidth>node.clientWidth})));assert(buttons.every(button=>button.height>=44&&!button.overflow));
    await page.screenshot({path:path.join(out,'op-phone-focus.png')});
    measurements.push({desktopPreview:desktop.width,phonePreviewFirst:true,phoneNoOverflow:true,phoneTouchTargets:true,buttonLabelsFit:true,actualPngAndSvgDownloads:true});
    assert.deepEqual(errors,[]);const result={passed:true,measurements,errors};fs.writeFileSync(path.join(out,'op-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
