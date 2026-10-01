// Project palette browser checks: exact exported pixels, transfers, downloads and reflow.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=file=>fs.readFileSync(file,'utf8'),out=path.resolve('reports/artstudio-workspace');
const shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1].replace('var ctx = { React: React','window.__edit=pair[1];window.__state=pair[0];var ctx = { React: React');
(async()=>{
  const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
  page.on('pageerror',error=>errors.push(error.message));
  const kit=()=>page.locator('[data-artstudio-thread-kit]');
  const click=name=>kit().getByRole('button',{name,exact:true}).click();
  const field=()=>page.getByLabel('Selected palette hex color',{exact:true});
  const colors=()=>page.evaluate(()=>__state.artStudio.studioThreadKit.runs[0].palette.colors);
  async function hex(value){await field().fill(value);await field().press('Enter');}
  async function openKit(){await page.getByRole('button',{name:'Open Thread Kit',exact:true}).click();}
  async function tab(value){await page.getByRole('button',{name:value==='pixel'?/Digital & generative/:/Paint & color/}).click();await page.locator('#artstudio-tab-'+value).click();await openKit();}
  try{
    await page.goto('about:blank');await page.setContent('<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui;background:white}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
    await page.addScriptTag({content:shell});await page.evaluate(()=>__mount('artStudio',false,{tab:'pixel',studioStarted:true,studioHome:false,pixelGrid:16,pixelData:{'2,2':'red'},studioFreeProjectId:'palette-project',studioCurrentProjectRunId:'palette-project',studioThreadKit:{schemaVersion:2,runs:[{schemaVersion:1,runId:'palette-project',accessibilityTarget:4.5,palette:{sourceTab:'colorWheel',harmony:'triadic',colors:[{h:30,s:80,l:45},{h:150,s:80,l:45},{h:270,s:80,l:45}]}}]}}));
    await openKit();await hex('#123456');const exact=await colors();await click('Move right');assert.deepEqual(await colors(),[exact[1],exact[0],exact[2]]);
    await kit().getByRole('button',{name:'Move left',exact:true}).focus();await page.keyboard.press('Control+z');assert.deepEqual(await colors(),exact);await page.keyboard.press('Control+Shift+z');assert.deepEqual(await colors(),[exact[1],exact[0],exact[2]]);await click('Move left');
    await hex('#oops');assert.equal(await field().getAttribute('aria-invalid'),'true');assert.deepEqual(await colors(),exact);await field().press('Escape');assert.equal(await field().inputValue(),'#123456');assert.deepEqual(await page.evaluate(()=>document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData),{'2,2':'red'});checks.push({exactHexEdit:true,reorderKeyboardUndoRedo:true,invalidDraftPreservesArtwork:true});
    const download=page.waitForEvent('download');await click('Download palette CSS');const cssPath=path.join(out,'palette-browser-export.css');await(await download).saveAs(cssPath);assert.equal(read(cssPath),':root {\n  --palette-1: #123456;\n  --palette-2: #17cf73;\n  --palette-3: #7317cf;\n}\n');checks.push({cssDownloadExact:true});
    await click('Use palette in Pixel Art');const pixel=page.locator('#pixelCanvas');await pixel.focus();await pixel.press('Home');await pixel.press('Enter');
    const sprite=await pixel.evaluate(async node=>{const img=new Image();img.src=node._pixelExportNative();await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return {png:img.src,width:img.width,painted:[...ctx.getImageData(0,0,1,1).data],existing:[...ctx.getImageData(2,2,1,1).data],empty:[...ctx.getImageData(1,0,1,1).data]};});
    assert.equal(sprite.width,16);assert.deepEqual(sprite.painted,[18,52,86,255]);assert.deepEqual(sprite.existing,[255,0,0,255]);assert.equal(sprite.empty[3],0);fs.writeFileSync(path.join(out,'palette-pixel-sprite.png'),Buffer.from(sprite.png.split(',')[1],'base64'));checks.push({pixelExportExactRgb:sprite.painted,existingArtworkPreserved:true,transparentSprite:true});
    await openKit();await kit().screenshot({path:path.join(out,'palette-desktop-editor.png'),animations:'disabled'});
    await tab('gradient');await click('Use Thread Kit colors in Gradient');assert.deepEqual(await page.evaluate(()=>__state.artStudio.gradStops.map(stop=>({h:stop.hue,s:stop.sat,l:stop.lit}))),exact);await click('Add gradient palette to Thread Kit');assert.deepEqual(await colors(),exact);checks.push({gradientRoundTripExact:true});
    await tab('mixer');await click('Use selected color as Color A');assert.equal(await page.getByLabel('Color A Hex color',{exact:true}).inputValue(),'#123456');await click('Use selected color as Color B');assert.equal(await page.getByLabel('Color B Hex color',{exact:true}).inputValue(),'#123456');checks.push({mixerBothInputsExact:true});
    await tab('watercolor');await click('Use selected color in this tool');assert.equal(await page.evaluate(()=>__state.artStudio.watercolorColor),'#123456');checks.push({watercolorPigmentExact:true});
    await tab('pixel');await page.setViewportSize({width:390,height:844});await openKit();await kit().evaluate(node=>node.scrollIntoView({block:'start'}));
    const sizes=await kit().locator('button,input').evaluateAll(nodes=>nodes.map(node=>({height:node.getBoundingClientRect().height,width:node.getBoundingClientRect().width,overflow:node.scrollWidth>node.clientWidth+1})));
    assert(sizes.every(size=>size.height>=44&&size.width>=44&&!size.overflow),JSON.stringify(sizes));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390));assert(await page.locator('dialog[data-artstudio-inspector-shell]').evaluate(node=>node.scrollWidth<=node.clientWidth+1));
    await page.screenshot({path:path.join(out,'palette-phone-editor.png'),animations:'disabled'});checks.push({phoneNoOverflow:true,phoneTouchTargets44:true});
    await click('Remove color');await click('Remove color');await click('Remove color');await page.waitForFunction(()=>document.activeElement.id==='artstudio-kit-add');await click('Undo palette edit');assert.equal(await kit().locator('[data-artstudio-kit-swatches] button').count(),1);checks.push({lastRemovalFocusRetained:true,lastRemovalUndo:true});
    assert.deepEqual(errors,[]);const result={passed:true,checks,errors};fs.writeFileSync(path.join(out,'palette-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
