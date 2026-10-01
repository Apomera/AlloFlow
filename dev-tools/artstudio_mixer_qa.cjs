// Color Mixer browser checks with actual controls, downloads, and canvas pixels.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=file=>fs.readFileSync(file,'utf8'),out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1].replace('var ctx = { React: React','window.__edit=pair[1];window.__state=pair[0];var ctx = { React: React');
(async()=>{
  const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('about:blank');await page.setContent('<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui;background:white}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
  const canvas=()=>page.locator('#mixerCanvas');
  const capture=()=>canvas().evaluate(node=>({model:node._captureArtStudioState(),png:node.toDataURL()}));
  const mode=label=>page.locator('[data-artstudio-mixer-controls]').getByRole('button',{name:label,exact:true}).click();
  const edit=values=>page.evaluate(values=>ReactDOM.flushSync(()=>__edit(previous=>({artStudio:{...previous.artStudio,...values}}))),values);
  async function hex(name,value){const field=page.getByLabel('Color '+name+' Hex color',{exact:true});await field.fill(value);await field.press('Enter');}
  async function ratio(value){const field=page.getByLabel('Color mix ratio',{exact:true});await field.focus();await field.press('Home');for(let i=0;i<value;i++)await field.press('ArrowRight');}
  async function pixelHex(x,y){return canvas().evaluate((node,[x,y])=>'#'+[...node.getContext('2d').getImageData(x,y,1,1).data].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join(''),[x,y]);}
  try{
    await page.addScriptTag({content:shell});await page.evaluate(()=>__mount('artStudio',false,{tab:'mixer',studioStarted:true,studioHome:false}));await canvas().waitFor();
    assert((await page.locator('#artstudio-mix-result').textContent()).includes('#3D933E'));assert.equal(await pixelHex(480,170),'#3d933e');
    await canvas().evaluate(node=>node.__same=true);await page.getByRole('button',{name:'Focus workspace',exact:true}).click();const desktop=await canvas().boundingBox();assert(desktop.width>1000);assert(await canvas().evaluate(node=>node.__same));
    checks.push({desktopCanvasWidth:desktop.width,pigmentReference:'#3d933e',focusPreservesCanvas:true});
    await page.getByRole('button',{name:'Black + white',exact:true}).click();await mode('RGB blend');assert.equal(await pixelHex(480,170),'#808080');await mode('Linear light');assert.equal(await pixelHex(480,170),'#bcbcbc');
    await ratio(0);assert.equal(await pixelHex(480,170),'#000000');await page.getByLabel('Color mix ratio',{exact:true}).press('End');assert.equal(await pixelHex(480,170),'#ffffff');
    await hex('A','#abc');await ratio(0);assert.equal(await pixelHex(480,170),'#aabbcc');const valid=await capture();await hex('A','#error');assert.equal(await page.getByLabel('Color A Hex color',{exact:true}).getAttribute('aria-invalid'),'true');assert.deepEqual(await capture(),valid);await page.getByLabel('Color A Hex color',{exact:true}).press('Escape');
    checks.push({rgbAverage:'#808080',linearLightAverage:'#bcbcbc',pureEndpoints:true,hexEntry:true,invalidHexPreservesPaint:true});
    await page.getByRole('button',{name:'Blue + yellow',exact:true}).click();await mode('Pigment');await ratio(20);const beforeSwap=await pixelHex(480,170);await page.getByRole('button',{name:'Swap A and B',exact:true}).click();assert.equal(await pixelHex(480,170),beforeSwap);assert.equal((await capture()).model.mixRatio,.8);
    await page.getByRole('button',{name:'Undo mixer edit',exact:true}).click();assert.equal((await capture()).model.mixRatio,.2);
    const start=await capture(),slider=page.getByLabel('Color mix ratio',{exact:true});await slider.scrollIntoViewIfNeeded();const box=await slider.boundingBox();await page.mouse.move(box.x+box.width*.3,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height/2,{steps:12});await page.mouse.up();const dragged=await capture();assert.notEqual(dragged.model.mixRatio,start.model.mixRatio);
    await page.getByRole('button',{name:'Undo mixer edit',exact:true}).click();assert.deepEqual(await capture(),start);await page.getByRole('button',{name:'Redo mixer edit',exact:true}).click();assert.deepEqual(await capture(),dragged);
    checks.push({swapPreservesResult:true,actualSliderDragOneUndo:true,redoRestoresExactPng:true});
    await page.getByRole('button',{name:'Blue + yellow',exact:true}).click();await mode('Pigment');await page.getByRole('button',{name:'Add mix palette to Thread Kit',exact:true}).click();assert.equal(await page.evaluate(()=>__state.artStudio.studioThreadKit.runs.at(-1).palette.colors.length),7);
    const beforeLeave=await capture();await page.getByLabel('Studio tool',{exact:true}).selectOption('gradient');await page.getByLabel('Studio tool',{exact:true}).selectOption('mixer');assert.deepEqual(await capture(),beforeLeave);
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export mix sheet PNG',exact:true}).click();const destination=path.join(out,'mixer-browser-export.png');await(await download).saveAs(destination);assert.equal(fs.readFileSync(destination).toString('base64'),beforeLeave.png.split(',')[1]);
    checks.push({threadKitSevenColors:true,tabRoundTrip:true,actualPngDownloadMatchesCanvas:true});
    await page.locator('[data-artstudio-mixer-controls]').evaluate(node=>node.scrollTop=0);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'mixer-pigment-focus.png'),animations:'disabled'});
    await page.getByRole('button',{name:'Black + white',exact:true}).click();await mode('Linear light');await page.locator('[data-artstudio-mixer-controls]').evaluate(node=>node.scrollTop=0);await page.screenshot({path:path.join(out,'mixer-light-focus.png'),animations:'disabled'});
    await page.getByRole('button',{name:'Blue + yellow',exact:true}).click();await mode('Pigment');await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
    const preview=await page.locator('[data-artstudio-mixer-preview]').boundingBox(),controls=await page.locator('[data-artstudio-mixer-controls]').boundingBox();assert(preview.y<controls.y);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390));
    const buttons=await page.locator('[data-artstudio-mixer-layout] button').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).map(node=>({height:node.getBoundingClientRect().height,overflow:node.scrollWidth>node.clientWidth})));assert(buttons.every(button=>button.height>=44&&!button.overflow));
    await page.screenshot({path:path.join(out,'mixer-phone-focus.png'),animations:'disabled'});checks.push({phonePreviewFirst:true,phoneNoOverflow:true,phoneTouchTargets:true});
    await page.getByRole('button',{name:'Paint with this mix',exact:true}).click();assert.equal(await page.evaluate(()=>__state.artStudio.watercolorColor),'#3d933e');await page.locator('#watercolorCanvas').waitFor();checks.push({watercolorTransfer:true});
    assert.deepEqual(errors,[]);const result={passed:true,checks,errors};fs.writeFileSync(path.join(out,'mixer-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
