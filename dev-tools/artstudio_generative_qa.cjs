// Real-browser Generative Art checks: canvas layout, playback, seeded experiments, input, and PNGs.
// Run: node dev-tools/artstudio_generative_qa.cjs
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=file=>fs.readFileSync(file,'utf8'),out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1].replace('var ctx = { React: React','window.__edit=pair[1];window.__state=pair[0];var ctx = { React: React');
(async()=>{
  const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
  page.on('pageerror',error=>errors.push(error.message));
  async function mount(extra={}){
    await page.goto('about:blank');await page.setContent('<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui;background:white}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
    await page.addScriptTag({content:shell});await page.evaluate(extra=>__mount('artStudio',false,{tab:'generative',studioHome:false,studioStarted:true,genPaused:true,genSeed:29417,genDensity:200,genHue:190,genSat:90,genLit:60,...extra}),extra);await page.locator('#genCanvas').waitFor();
  }
  const canvas=()=>page.locator('#genCanvas');
  const capture=()=>canvas().evaluate(node=>node._captureArtStudioState());
  const edit=values=>page.evaluate(values=>ReactDOM.flushSync(()=>__edit(previous=>({artStudio:{...previous.artStudio,...values}}))),values);
  async function step(count){await page.getByRole('button',{name:'Pause and advance '+count+' simulation steps',exact:true}).click();}
  async function checkpointReady(){await page.waitForFunction(()=>document.getElementById('genCanvas').dataset.genRestoring==='0');}
  try{
    await mount();const beforeFocus=await canvas().boundingBox();await canvas().evaluate(node=>node.__sameCanvas=true);
    await page.getByRole('button',{name:'Focus workspace',exact:true}).click();const desktop=await canvas().boundingBox();assert(desktop.width>=850);assert(await canvas().evaluate(node=>node.__sameCanvas));
    for(let i=0;i<3;i++)await step(100);const seeded=await capture();assert.equal(seeded.genFrame,300);
    await page.getByRole('button',{name:'Same seed',exact:true}).click();for(let i=0;i<3;i++)await step(100);assert.deepEqual(await capture(),seeded);
    checks.push({desktopCanvas:desktop.width,previousCanvas:beforeFocus.width,focusPreservesCanvas:true,repeatedSeedExactPng:true});
    await canvas().evaluate(node=>node.__sameCanvas=true);await page.getByLabel('Playback speed',{exact:true}).selectOption('2');
    assert(await canvas().evaluate(node=>node.__sameCanvas));assert.equal((await capture()).genSnapshot,seeded.genSnapshot);
    await page.getByRole('button',{name:'Resume generative animation',exact:true}).click();await page.waitForFunction(()=>document.getElementById('genCanvas')._captureArtStudioState().genFrame>310);
    await page.getByRole('button',{name:'Pause generative animation',exact:true}).click();const paused=await capture();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.deepEqual(await capture(),paused);assert.equal(await canvas().evaluate(node=>node._genAnim),null);
    await step(1);await step(10);assert.equal((await capture()).genFrame,paused.genFrame+11);
    checks.push({speedPreservesPaint:true,oneClickPlayback:true,pauseHasNoPendingFrame:true,preciseStepControls:true});
    await page.getByLabel('Particles per burst',{exact:true}).focus();await page.keyboard.press('End');assert.equal((await capture()).genBurstSize,100);
    const old=await capture();await canvas().scrollIntoViewIfNeeded();const box=await canvas().boundingBox();
    await page.mouse.click(box.x+2+(box.width-4)*.75,box.y+2+(box.height-4)*.25);const burst=await capture();
    assert.equal(burst.genState.particles.length,old.genState.particles.length+100);assert.equal(burst.genFrame,old.genFrame);assert(Math.abs(burst.genState.particles.at(-1).x-480)<1);assert(Math.abs(burst.genState.particles.at(-1).y-120)<1);assert.notEqual(burst.genSnapshot,old.genSnapshot);
    await canvas().focus();await page.keyboard.press('Home');await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Enter');
    assert.equal((await capture()).genState.burstCount,3);const cursorPaint=await capture();assert(await page.locator('[data-generative-keyboard-cursor]').isVisible());
    await canvas().blur();assert.equal((await capture()).genSnapshot,cursorPaint.genSnapshot);
    checks.push({scaledPointerAccurate:true,burstSizeLive:true,pausedBurstVisible:true,keyboardBurst:true,cursorExcludedFromPng:true});
    await page.getByLabel('Studio tool',{exact:true}).selectOption('watercolor');await page.getByLabel('Studio tool',{exact:true}).selectOption('generative');await checkpointReady();assert.deepEqual(await capture(),cursorPaint);
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export PNG',exact:true}).click();const pngPath=path.join(out,'generative-browser-export.png');await(await download).saveAs(pngPath);
    assert.equal(fs.readFileSync(pngPath).toString('base64'),cursorPaint.genSnapshot.split(',')[1]);checks.push({tabRoundTripExact:true,actualPngDownloadMatchesCanvas:true});
    await page.getByLabel('Trail fade',{exact:true}).focus();await page.keyboard.press('Home');assert.equal((await capture()).genFrame,0);assert.equal((await capture()).genTrailFade,1);
    await page.getByRole('button',{name:'Use Flow Field generative style',exact:true}).click();for(let i=0;i<3;i++)await step(100);
    await page.locator('[data-artstudio-generative-controls]').evaluate(node=>node.scrollTop=0);await page.screenshot({path:path.join(out,'generative-flow-focus.png'),animations:'disabled'});
    for(const [style,label,hue]of[['rain','Particle Rain',220],['stars','Starfield',35],['aurora','Aurora',145]]){
      await page.getByRole('button',{name:'Use '+label+' generative style',exact:true}).click();await edit({genHue:hue});for(let i=0;i<3;i++)await step(100);
      const state=await capture();assert.equal(state.genFrame,300);assert.equal(state.genState.settings.style,style);
      const pixels=await canvas().evaluate(node=>{const data=node.getContext('2d').getImageData(0,0,node.width,node.height).data;let colored=0;for(let i=0;i<data.length;i+=4)if(data[i]+data[i+1]+data[i+2]>90)colored++;return colored;});assert(pixels>2000);
      checks.push({style,step:300,coloredPixels:pixels});
    }
    await page.locator('[data-artstudio-generative-controls]').evaluate(node=>node.scrollTop=0);await page.screenshot({path:path.join(out,'generative-aurora-focus.png'),animations:'disabled'});
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
    const preview=await page.locator('[data-artstudio-generative-preview]').boundingBox(),controls=await page.locator('[data-artstudio-generative-controls]').boundingBox();assert(preview.y<controls.y);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390));
    const buttons=await page.locator('[data-artstudio-generative-layout] button').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).map(node=>({height:node.getBoundingClientRect().height,overflow:node.scrollWidth>node.clientWidth})));assert(buttons.every(button=>button.height>=44&&!button.overflow));
    await page.screenshot({path:path.join(out,'generative-phone-focus.png'),animations:'disabled'});checks.push({phonePreviewFirst:true,phoneNoOverflow:true,phoneTouchTargets:true});
    assert.deepEqual(errors,[]);const result={passed:true,checks,errors};fs.writeFileSync(path.join(out,'generative-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
