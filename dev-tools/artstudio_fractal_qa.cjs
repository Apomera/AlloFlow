// Browser verification for Fractal Explorer rendering, navigation and exports.
// Run: node dev-tools/artstudio_fractal_qa.cjs
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=file=>fs.readFileSync(file,'utf8'),out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1].replace('var ctx = { React: React','window.__edit = pair[1];window.__state = pair[0];var ctx = { React: React');
(async()=>{
  const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[],measurements=[];page.on('pageerror',error=>errors.push(error.message));
  async function mount(extra={}){
    await page.goto('about:blank');
    await page.setContent('<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui;background:white}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
    await page.addScriptTag({content:shell});
    await page.evaluate(extra=>window.__mount('artStudio',false,{tab:'fractal',studioHome:false,studioStarted:true,...extra}),extra);
    await page.locator('#fractalCanvas').waitFor();
  }
  async function ready(){await page.waitForFunction(()=>document.querySelector('#fractalCanvas')?.getAttribute('aria-busy')==='false');}
  async function state(){return page.locator('#fractalCanvas').evaluate(c=>c._captureArtStudioState());}
  const center=s=>[(s.fractalType==='mandelbrot'?-.5:s.fractalType==='burningShip'?-.4:0)-s.fractalPanX/50,(s.fractalType==='burningShip'?-.5:0)-s.fractalPanY/50];
  const point=(s,u,v)=>center(s).map((value,i)=>value+([u,v][i]-.5)*3/s.fractalZoom);
  try{
    for(const type of ['mandelbrot','julia','burningShip','sierpinski']){
      await mount({fractalType:type,fractalColor:type==='sierpinski'?'ocean':'classic'});await ready();
      const result=await page.locator('#fractalCanvas').evaluate(c=>{
        const pixels=c.getContext('2d').getImageData(0,0,512,512).data,colors=new Set();let transparent=0;
        for(let i=0;i<pixels.length;i+=4){colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);if(pixels[i+3]!==255)transparent++;}
        return {distinctColors:colors.size,transparentPixels:transparent,exportMatches:c._fractalExportPNG()===c.toDataURL('image/png'),rows:Number(c.dataset.fractalRows)};
      });
      assert(result.distinctColors>100);assert.equal(result.transparentPixels,0);assert(result.exportMatches);assert.equal(result.rows,512);
      measurements.push({type,...result});
      if(type==='sierpinski'){
        const first=await page.locator('#fractalCanvas').evaluate(c=>c.toDataURL());
        await page.evaluate(()=>ReactDOM.flushSync(()=>__edit(prev=>({artStudio:{...prev.artStudio,tab:'tessellation'}}))));
        await page.evaluate(()=>ReactDOM.flushSync(()=>__edit(prev=>({artStudio:{...prev.artStudio,tab:'fractal'}}))));await ready();
        assert.equal(await page.locator('#fractalCanvas').evaluate(c=>c.toDataURL()),first);
      }
    }
    await mount();
    const exportDuringRender=await page.evaluate(()=>{
      ReactDOM.flushSync(()=>__edit(prev=>({artStudio:{...prev.artStudio,fractalIter:350}})));
      const canvas=document.querySelector('#fractalCanvas'),before=canvas.dataset.fractalRows,start=performance.now(),png=canvas._fractalExportPNG();
      window.__earlyExport=png;return {rowsBefore:Number(before),rowsAfter:Number(canvas.dataset.fractalRows),exportTimeMs:performance.now()-start};
    });
    assert.equal(exportDuringRender.rowsBefore,0);assert.equal(exportDuringRender.rowsAfter,0);await ready();
    assert(await page.evaluate(()=>document.querySelector('#fractalCanvas').toDataURL()===window.__earlyExport));
    measurements.push({partialRenderExportComplete:true,...exportDuringRender});
    const box=await page.locator('#fractalCanvas').boundingBox(),u=.7,v=.35,before=await state();
    await page.locator('#fractalCanvas').evaluate(c=>{for(const kind of ['wheel','dblclick'])c.addEventListener(kind,event=>{const r=c.getBoundingClientRect();window.__pointer=[(event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height];},true);});
    await page.mouse.move(box.x+u*box.width,box.y+v*box.height);await page.mouse.wheel(0,-100);
    await page.waitForFunction(()=>__state.artStudio.fractalZoom>1);
    const zoomed=await state(),wheelPoint=await page.evaluate(()=>window.__pointer),anchor=point(before,...wheelPoint);assert.equal(zoomed.fractalZoom,1.3);point(zoomed,...wheelPoint).forEach((value,i)=>assert(Math.abs(value-anchor[i])<1e-12));
    await page.locator('#artstudio-fractal-back').click();assert.equal((await state()).fractalZoom,1);
    await page.evaluate(()=>{window.__fractalCanvas=document.querySelector('#fractalCanvas');ReactDOM.flushSync(()=>__edit(prev=>({artStudio:{...prev.artStudio,fractalZoom:200,fractalPanX:12.34567,fractalPanY:-5.12345}})));});
    const deep=await state();
    await page.mouse.dblclick(box.x+.75*box.width,box.y+.25*box.height);
    const centered=await state(),target=point(deep,...await page.evaluate(()=>window.__pointer));assert.equal(centered.fractalZoom,400);center(centered).forEach((value,i)=>assert(Math.abs(value-target[i])<1e-12));
    await page.keyboard.press('+');assert.equal((await state()).fractalZoom,500);
    await page.keyboard.press('Control+z');assert.equal((await state()).fractalZoom,400);
    assert(await page.evaluate(()=>document.activeElement===window.__fractalCanvas&&document.querySelector('#fractalCanvas')===window.__fractalCanvas));
    measurements.push({pointerAnchoredWheel:true,deepDoubleClickCenter:true,keyboardZoomHistory:true,canvasAndFocusPreserved:true,sierpinskiDeterministic:true});
    await page.getByRole('button',{name:'Load Seahorse Valley fractal preset',exact:true}).click();await ready();
    const sea=await state();assert.deepEqual(center(sea),[-.75,.1]);
    await page.getByRole('button',{name:'Focus workspace',exact:true}).click();
    const desktop=await page.locator('#fractalCanvas').boundingBox();assert(desktop.width>=700);
    assert(await page.locator('[aria-labelledby="artstudio-fractal-color-label"] button').evaluateAll(nodes=>nodes.every(node=>node.scrollWidth<=node.clientWidth)));
    await page.screenshot({path:path.join(out,'fractal-seahorse-focus.png')});
    const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Export fractal as PNG',exact:true}).click();await (await waiting).saveAs(path.join(out,'fractal-browser-export.png'));
    await page.getByRole('button',{name:'Load Elephant Valley fractal preset',exact:true}).click();await ready();
    const elephant=await state();assert(Math.abs(center(elephant)[0]-.3)<1e-12);
    await page.screenshot({path:path.join(out,'fractal-elephant-focus.png')});
    await page.getByRole('button',{name:'△ Sierpinski',exact:true}).click();await ready();
    await page.screenshot({path:path.join(out,'fractal-sierpinski-focus.png')});
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
    const preview=await page.locator('[data-artstudio-fractal-preview]').boundingBox(),controls=await page.locator('[data-artstudio-fractal-controls]').boundingBox();
    assert(preview.y<controls.y);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390));
    const heights=await page.locator('[data-artstudio-fractal-layout] button').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>n.getBoundingClientRect().height));assert(heights.every(height=>height>=44));
    await page.screenshot({path:path.join(out,'fractal-phone-focus.png')});
    measurements.push({desktopPreview:desktop.width,phonePreviewFirst:true,phoneNoOverflow:true,phoneTouchTargets:true,landmarkCentersCorrect:true,actualPngDownload:true});
    assert.deepEqual(errors,[]);const result={passed:true,measurements,errors};fs.writeFileSync(path.join(out,'fractal-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
