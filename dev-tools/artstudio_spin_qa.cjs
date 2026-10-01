// Spin Art browser checks: actual input, history, playback, exports and layout.
// Run: node dev-tools/artstudio_spin_qa.cjs
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
    await page.addScriptTag({content:shell});await page.evaluate(extra=>__mount('artStudio',false,{tab:'spinArt',studioHome:false,studioStarted:true,spinPaused:true,...extra}),extra);await page.locator('#spinCanvas').waitFor();
  }
  const capture=()=>page.locator('#spinCanvas').evaluate(canvas=>({state:canvas._captureArtStudioState(),png:canvas.toDataURL()}));
  const edit=values=>page.evaluate(values=>ReactDOM.flushSync(()=>__edit(previous=>({artStudio:{...previous.artStudio,...values}}))),values);
  async function drag(from,to,steps=8){
    const box=await page.locator('#spinCanvas').boundingBox();const point=coords=>({x:box.x+4+coords[0]/512*(box.width-8),y:box.y+4+coords[1]/512*(box.height-8)});
    const start=point(from),end=point(to);await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps});await page.mouse.up();
  }
  try{
    await mount({spinBrush:14,spinHue:330,spinSat:90,spinLit:55,spinDark:true});
    await page.getByRole('button',{name:'Focus workspace',exact:true}).click();const desktop=await page.locator('#spinCanvas').boundingBox();assert(desktop.width>=700);
    const blank=await capture();await drag([290,220],[390,285],1);const stroke=await capture();assert.notEqual(stroke.png,blank.png);assert(stroke.state.spinDrips.length>10);
    await page.getByRole('button',{name:'Undo spin art change',exact:true}).click();assert.equal((await capture()).png,blank.png);
    await page.getByRole('button',{name:'Redo spin art change',exact:true}).click();assert.deepEqual((await capture()).state,stroke.state);
    await page.locator('#artstudio-spin-clear').click();assert.equal((await capture()).png,blank.png);
    await page.getByRole('button',{name:'Undo spin art change',exact:true}).click();assert.deepEqual((await capture()).state,stroke.state);
    await page.getByRole('button',{name:'Resume spin art animation',exact:true}).click();
    await page.waitForFunction(()=>document.getElementById('spinCanvas')._captureArtStudioState().spinAngle!==0);
    await page.getByRole('button',{name:'Pause spin art animation',exact:true}).click();const paused=await capture();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal((await capture()).png,paused.png);
    await page.getByLabel('Studio tool',{exact:true}).selectOption('pixel');await page.getByLabel('Studio tool',{exact:true}).selectOption('spinArt');await page.locator('#spinCanvas').evaluate(canvas=>canvas._artStudioReady);assert.deepEqual((await capture()).state,paused.state);
    checks.push({desktopCanvas:desktop.width,pausedPaint:true,wholeStrokeUndoRedo:true,clearUndo:true,oneClickResume:true,pausePreservesFrame:true,tabRoundTrip:true});

    // Build a layered preview using the real keyboard paint and playback controls.
    await page.locator('#artstudio-spin-clear').click();
    for(const [index,hue] of [330,185,45,275,15].entries()){
      await edit({spinHue:hue,spinSat:90,spinLit:60,spinBrush:10+index*2,spinViscosity:20+index*15,spinSplatter:index%2===0,spinDirection:index%2?-1:1});
      const canvas=page.locator('#spinCanvas');await canvas.focus();await page.keyboard.press('Home');
      for(let i=0;i<index+2;i++)await page.keyboard.press('ArrowRight');
      for(let i=0;i<4;i++)await page.keyboard.press('Shift+ArrowDown');
      await page.getByRole('button',{name:'Resume spin art animation',exact:true}).click();
      await page.waitForFunction(()=>document.getElementById('spinCanvas')._captureArtStudioState().spinDrips.length===0);
      await page.getByRole('button',{name:'Pause spin art animation',exact:true}).click();
    }
    const edgePainting=await capture();
    await page.getByLabel('Studio tool',{exact:true}).selectOption('pixel');await page.getByLabel('Studio tool',{exact:true}).selectOption('spinArt');await page.locator('#spinCanvas').evaluate(canvas=>canvas._artStudioReady);
    assert.deepEqual((await capture()).state,edgePainting.state);checks.push({translucentRimRoundTripExact:true});
    await page.locator('[data-artstudio-spin-controls]').evaluate(node=>node.scrollTop=0);await page.locator('#spinCanvas').blur();
    await page.screenshot({path:path.join(out,'spin-focus.png')});
    const exports=await page.locator('#spinCanvas').evaluate(async canvas=>{
      async function pixels(src){const image=new Image();image.src=src;await image.decode();const scratch=document.createElement('canvas');scratch.width=scratch.height=512;const ctx=scratch.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,512,512).data;}
      const transparent=await pixels(canvas._spinExportAction(true)),opaque=await pixels(canvas._spinExportAction()),original=canvas.getContext('2d').getImageData(0,0,512,512).data;
      let marks=0,outside=0,opaqueCount=0,paintDifference=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4;if(transparent[i+3])marks++;if(Math.hypot(x+.5-256,y+.5-256)>257&&transparent[i+3])outside++;if(opaque[i+3]===255)opaqueCount++;for(let c=0;c<4;c++)paintDifference+=Math.abs(transparent[i+c]-original[i+c]);}
      return {marks,outside,opaqueCount,paintDifference,transparentCorner:transparent[3]};
    });
    assert(exports.marks>5000);assert.equal(exports.outside,0);assert.equal(exports.opaqueCount,512*512);assert.equal(exports.paintDifference,0);assert.equal(exports.transparentCorner,0);checks.push(exports);
    for(const [label,name] of [['Export PNG','spin-browser-export.png'],['Export spin art as transparent PNG','spin-browser-transparent.png']]){
      const download=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();await (await download).saveAs(path.join(out,name));
    }
    const beforePaper=(await capture()).png;await edit({spinDark:false});assert.equal((await capture()).png,beforePaper);await edit({spinDark:true});
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
    const preview=await page.locator('[data-artstudio-spin-preview]').boundingBox(),controls=await page.locator('[data-artstudio-spin-controls]').boundingBox();assert(preview.y<controls.y);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390));
    const buttons=await page.locator('[data-artstudio-spin-layout] button').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).map(node=>({height:node.getBoundingClientRect().height,overflow:node.scrollWidth>node.clientWidth})));assert(buttons.every(button=>button.height>=44&&!button.overflow));
    await page.screenshot({path:path.join(out,'spin-phone-focus.png')});checks.push({actualPngDownloads:true,paperPreservesPaint:true,phonePreviewFirst:true,phoneNoOverflow:true,phoneTouchTargets:true});
    assert.deepEqual(errors,[]);const result={passed:true,checks,errors};fs.writeFileSync(path.join(out,'spin-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
