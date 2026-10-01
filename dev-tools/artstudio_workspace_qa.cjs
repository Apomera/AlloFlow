// Local browser regression and visual evidence for the pixel/watercolor workspace.
// Run: node dev-tools/artstudio_workspace_qa.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const out = path.resolve('reports/artstudio-workspace');
const read = p => fs.readFileSync(p, 'utf8');
const probe = read('dev-tools/pixel_contrast_probe.cjs');
const shell = probe.match(/const SHELL = `([\s\S]+?)`;/)[1];

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const measurements = [];
  async function mount(tab, extra = {}) {
    await page.goto('about:blank');
    await page.setContent('<html><head><style>' + read('dev-tools/.cache/sweep-tailwind.css') + '</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_artstudio.js']) {
      await page.addScriptTag({ content: read(file) });
    }
    await page.addScriptTag({ content: shell });
    await page.evaluate(({tab, extra}) => window.__mount('artStudio', false, {tab, studioStarted:true, studioHome:false, ...extra}), {tab, extra});
    await page.locator(tab === 'pixel' ? '#pixelCanvas' : '#watercolorCanvas').waitFor();
  }
  try {
    if(!['selection','editing'].includes(process.env.ARTSTUDIO_QA_ONLY)) {
    await mount('pixel', {pixelGrid:32});
    await page.getByRole('button', {name:'Expand pixel canvas', exact:true}).click();
    await page.waitForFunction(() => !!document.fullscreenElement || document.querySelector('#pixelFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await page.waitForTimeout(150);
    const box = await page.locator('#pixelCanvas').boundingBox();
    const viewport = await page.evaluate(() => ({w:innerWidth,h:innerHeight}));
    measurements.push({name:'desktop-expanded',box,viewport});
    await page.screenshot({path:path.join(out,'pixel-expanded-desktop.png')});
    assert(box.height > viewport.h * .75, 'Expanded grid should occupy most of the viewport height');
    assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.w + 1 && box.y + box.height <= viewport.h + 1);
    await page.mouse.move(box.x + box.width / 64, box.y + box.height / 64);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 31.5 / 32, box.y + box.height * 31.5 / 32);
    await page.mouse.up();
    let cells = await page.evaluate(() => document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData);
    assert.equal(Object.keys(cells).length, 32, 'Fast diagonal must cover all 32 cells');
    await page.getByRole('button', {name:'Undo',exact:true}).click();
    assert.equal(await page.evaluate(() => Object.keys(document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData).length), 0);
    await page.getByRole('button', {name:'Redo',exact:true}).click();
    await page.getByRole('combobox', {name:'Grid size',exact:true}).selectOption('64');
    assert.equal(await page.evaluate(() => Object.keys(document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData).length), 128);
    await page.getByRole('button', {name:'Undo',exact:true}).click();
    assert.equal(await page.getByRole('combobox', {name:'Grid size',exact:true}).inputValue(), '32');
    await page.screenshot({path:path.join(out,'pixel-expanded-desktop.png')});
    const viewCenter = () => page.evaluate(() => {
      const c=document.querySelector('#pixelCanvas').getBoundingClientRect();
      const viewport=document.querySelector('.artstudio-pixel-viewport'),v=viewport.getBoundingClientRect();
      return {x:(v.left+viewport.clientWidth/2-c.left)/c.width,y:(v.top+viewport.clientHeight/2-c.top)/c.height,left:viewport.scrollLeft,top:viewport.scrollTop};
    });
    const fitCenter=await viewCenter();
    await page.getByRole('combobox', {name:'Canvas zoom',exact:true}).selectOption('2');
    assert((await page.locator('#pixelCanvas').boundingBox()).width > box.width * 1.9);
    let zoomCenter=await viewCenter();
    assert(Math.abs(fitCenter.x-zoomCenter.x)<.01 && Math.abs(fitCenter.y-zoomCenter.y)<.01,'Zoom must preserve the visible center');
    await page.getByRole('button',{name:'Pan canvas',exact:true}).click();
    const viewBox=await page.locator('.artstudio-pixel-viewport').boundingBox();
    await page.mouse.move(viewBox.x+viewBox.width/2,viewBox.y+viewBox.height/2);
    await page.mouse.down();await page.mouse.move(viewBox.x+viewBox.width/2+60,viewBox.y+viewBox.height/2+50);await page.mouse.up();
    let panned=await viewCenter();
    assert(Math.abs(panned.left-(zoomCenter.left-60))<2 && Math.abs(panned.top-(zoomCenter.top-50))<2,'Hand tool should drag the zoomed artwork');
    await page.keyboard.press('ArrowRight');
    assert(Math.abs((await viewCenter()).left-panned.left-48)<2,'Hand tool supports keyboard panning');
    panned=await viewCenter();
    await page.getByRole('combobox',{name:'Canvas zoom',exact:true}).selectOption('3');
    zoomCenter=await viewCenter();
    assert(Math.abs(panned.x-zoomCenter.x)<.01 && Math.abs(panned.y-zoomCenter.y)<.01,'Zoom after panning must retain the viewed region');
    await page.getByRole('button',{name:'Brush',exact:true}).click();
    await page.locator('#pixelCanvas').focus();await page.keyboard.press('End');
    const cursorVisible=await page.evaluate(()=>{
      const c=document.querySelector('#pixelCanvas').getBoundingClientRect(),v=document.querySelector('.artstudio-pixel-viewport').getBoundingClientRect();
      return c.right<=v.right && c.bottom<=v.bottom && c.right>v.left && c.bottom>v.top;
    });
    assert(cursorVisible,'Keyboard End must reveal the lower-right cell while zoomed');
    assert.equal(await page.evaluate(()=>Object.keys(document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData).length),32,'Panning and navigation must not paint');
    await page.getByRole('combobox', {name:'Canvas zoom',exact:true}).selectOption('1');
    await page.getByText('Transform artwork',{exact:true}).click();
    await page.getByRole('button',{name:'Rotate 90°',exact:true}).click();
    assert(await page.evaluate(()=>!!document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData['31,0']));
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    await page.getByText('Transform artwork',{exact:true}).click();
    measurements.push({name:'pixel-navigation',centeredZoom:true,pointerPan:true,keyboardPan:true,keyboardCursorRevealed:true,rotateUndo:true});
    await page.getByRole('button', {name:'Exit expanded canvas (Esc)',exact:true}).click();
    await page.waitForFunction(() => !document.fullscreenElement && !document.querySelector('#pixelFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(150);
    const mobile = await page.locator('#pixelCanvas').boundingBox();
    measurements.push({name:'mobile',box:mobile});
    assert(mobile.width <= 390, 'Mobile fit must not overflow horizontally');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.locator('#pixelCanvas').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'pixel-phone.png')});
    // Force the embedded-browser fallback and verify Escape keeps the artwork.
    await page.evaluate(() => { document.querySelector('#pixelFullscreenWorkspace').requestFullscreen = () => Promise.reject(new Error('embed')); });
    await page.getByRole('button', {name:'Expand pixel canvas',exact:true}).click();
    await page.waitForFunction(() => document.querySelector('#pixelFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => Object.keys(document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData).length), 32);

    // Native sprite export has one image pixel per cell and no opaque backdrop.
    const sprite = await page.evaluate(async () => {
      const data = document.querySelector('#pixelCanvas')._pixelExportNative();
      const img = new Image(); img.src = data; await img.decode();
      const c = document.createElement('canvas'); c.width=img.width;c.height=img.height;
      const context=c.getContext('2d');context.drawImage(img,0,0);
      return {width:img.width,height:img.height,painted:[...context.getImageData(0,0,1,1).data],empty:[...context.getImageData(1,0,1,1).data]};
    });
    assert.equal(sprite.width,32);assert.equal(sprite.height,32);
    assert.equal(sprite.painted[3],255);assert.equal(sprite.empty[3],0);
    measurements.push({name:'native-transparent-sprite',...sprite});

    await page.setViewportSize({width:1440,height:1000});
    await page.getByRole('combobox',{name:'Shape tool',exact:true}).selectOption('line');
    await page.locator('#pixelCanvas').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const lineBox=await page.locator('#pixelCanvas').boundingBox();
    await page.mouse.move(lineBox.x+lineBox.width*2.5/32,lineBox.y+lineBox.height*24.5/32);
    await page.mouse.down();
    await page.mouse.move(lineBox.x+lineBox.width*29.5/32,lineBox.y+lineBox.height*24.5/32);
    assert.equal(await page.evaluate(()=>Object.keys(document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData).length),32);
    await page.mouse.up();
    assert.equal(await page.evaluate(()=>Object.keys(document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData).length),59);
    await page.getByRole('button',{name:'Pick color',exact:true}).click();
    await page.locator('#pixelCanvas').scrollIntoViewIfNeeded();
    const pickBox=await page.locator('#pixelCanvas').boundingBox();
    await page.mouse.click(pickBox.x+pickBox.width*2.5/32,pickBox.y+pickBox.height*24.5/32);
    assert.equal(await page.getByRole('button',{name:'Brush',exact:true}).getAttribute('aria-pressed'),'true');

    await mount('pixel',{pixelGrid:16,pixelTool:'rectangle',pixelShapeFilled:true});
    await page.locator('#pixelCanvas').scrollIntoViewIfNeeded();
    const shapeBox=await page.locator('#pixelCanvas').boundingBox();
    await page.mouse.move(shapeBox.x+shapeBox.width*2.5/16,shapeBox.y+shapeBox.height*3.5/16);
    await page.mouse.down();await page.mouse.move(shapeBox.x+shapeBox.width*9.5/16,shapeBox.y+shapeBox.height*8.5/16);
    assert.equal(await page.evaluate(()=>Object.keys(document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData).length),0);
    await page.mouse.up();
    assert.equal(await page.evaluate(()=>Object.keys(document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData).length),48);
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    await page.getByRole('combobox',{name:'Shape tool',exact:true}).selectOption('ellipse');
    await page.getByRole('checkbox',{name:'Fill shape',exact:true}).uncheck();
    await page.locator('#pixelCanvas').focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');await page.keyboard.press('End');await page.keyboard.press('Enter');
    const ellipse=await page.evaluate(()=>document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData);
    assert(ellipse['0,7']);assert(!ellipse['0,0']);assert(!ellipse['7,7']);
    await page.getByRole('button',{name:'Expand pixel canvas',exact:true}).click();
    await page.waitForFunction(() => !!document.fullscreenElement || document.querySelector('#pixelFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await page.waitForTimeout(150);
    const expandedShapeBox=await page.locator('#pixelCanvas').boundingBox();
    assert(expandedShapeBox.x >= 0 && expandedShapeBox.y >= 0 && expandedShapeBox.x + expandedShapeBox.width <= 1441 && expandedShapeBox.y + expandedShapeBox.height <= 1001, 'Expanded shapes should remain completely visible after keyboard drawing');
    await page.screenshot({path:path.join(out,'pixel-shapes.png')});
    await page.keyboard.press('Escape');
    measurements.push({name:'pixel-shapes',filledRectangleCells:48,previewNotSaved:true,keyboardEllipse:true,undo:true});

    await mount('pixel',{pixelGrid:32});
    await page.getByRole('button',{name:'Expand pixel canvas',exact:true}).click();
    await page.waitForFunction(()=>!!document.fullscreenElement || document.querySelector('#pixelFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await page.waitForTimeout(150);
    await page.getByText('Brush settings · 1 px',{exact:true}).click();
    await page.getByRole('combobox',{name:'Brush size in cells',exact:true}).selectOption('8');
    const brushBox=await page.locator('#pixelCanvas').boundingBox();
    for(const [index,coverage] of [25,50,75,100].entries()) {
      await page.getByRole('combobox',{name:'Brush coverage',exact:true}).selectOption(String(coverage));
      await page.mouse.click(brushBox.x+brushBox.width*(4.5+index*8)/32,brushBox.y+brushBox.height*16.5/32);
    }
    assert.equal(await page.evaluate(()=>Object.keys(document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData).length),160);
    await page.getByRole('combobox',{name:'Brush size in cells',exact:true}).selectOption('4');
    await page.getByRole('combobox',{name:'Brush tip',exact:true}).selectOption('round');
    await page.getByRole('button',{name:'Eraser',exact:true}).click();
    await page.mouse.click(brushBox.x+brushBox.width*28.5/32,brushBox.y+brushBox.height*16.5/32);
    assert.equal(await page.evaluate(()=>Object.keys(document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData).length),148);
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    await page.getByRole('button',{name:'Brush',exact:true}).click();
    await page.mouse.move(brushBox.x+brushBox.width*.65,brushBox.y+brushBox.height*.62);
    await page.screenshot({path:path.join(out,'pixel-brushes.png')});
    measurements.push({name:'pixel-brushes',coverageCells:160,roundEraserCells:12,undo:true});
    await page.keyboard.press('Escape');

    await page.setViewportSize({width:1440,height:1000});
    await mount('watercolor', {watercolorSize:44,watercolorWater:80,watercolorPigment:70});
    const watercolorHandle=await page.locator('#watercolorCanvas').elementHandle();
    await page.getByRole('button',{name:'Expand watercolor canvas',exact:true}).click();
    await page.waitForFunction(()=>!!document.fullscreenElement || document.querySelector('#watercolorFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await page.waitForTimeout(200);
    const expandedPaper=await page.locator('#watercolorCanvas').boundingBox();
    assert(expandedPaper.height>750,'Expanded watercolor paper should occupy most of the viewport height');
    assert(expandedPaper.x>=0 && expandedPaper.y>=0 && expandedPaper.x+expandedPaper.width<=1441 && expandedPaper.y+expandedPaper.height<=1001);
    assert(await watercolorHandle.evaluate(canvas=>canvas===document.querySelector('#watercolorCanvas')),'Expansion must retain the live paint engine');
    assert.equal(await page.locator('#watercolorFullscreenWorkspace').getByRole('slider',{name:'Brush size',exact:true}).count(),1);
    measurements.push({name:'watercolor-expanded',box:expandedPaper,sameCanvas:true});
    await page.mouse.click(expandedPaper.x+expandedPaper.width*.4,expandedPaper.y+expandedPaper.height*.5);
    const paintMass=()=>page.evaluate(()=>{const s=document.querySelector('#watercolorCanvas')._watercolorEngine.captureState();return s.pigmentDensity.reduce((n,v)=>n+v,0)+s.stainDensity.reduce((n,v)=>n+v,0);});
    assert(await paintMass()>0);
    await page.locator('#artstudio-watercolor-undo').click();assert.equal(await paintMass(),0);
    await page.locator('#artstudio-watercolor-redo').click();assert(await paintMass()>0);
    await page.evaluate(()=>document.querySelector('#watercolorCanvas')._watercolorEngine.clear());
    measurements.push({name:'watercolor-history-buttons',undo:true,redo:true});
    const timing = await page.evaluate(() => {
      const canvas = document.querySelector('#watercolorCanvas');
      const engine = canvas._watercolorEngine;
      engine.togglePause();
      const params = {color:{r:.18,g:.43,b:.69},brush:'round',surface:'wet',flowDirection:'none',showWetness:false,showFlow:false,size:34,water:.8,pigment:.7,paper:.55,granulation:.78,bleed:.75,absorption:.45,drying:.4,flowStrength:0,staining:.34,opacity:.28,mobility:.62,separation:.7,rewetting:.48,humidity:.5,airflow:.2,sizing:.58,bloomSensitivity:.7};
      engine.configure(params);
      engine.wetPaper();
      for(let x=32;x<150;x+=3) engine.dabAt(x,58+Math.sin(x/26)*14,.7);
      const t = performance.now(); engine.advanceSimulation(16); const elapsed=performance.now()-t;
      engine.dry();
      engine.configure({...params,color:{r:.76,g:.54,b:.16},brush:'mop',granulation:.56,opacity:.5});
      for(let x=42;x<160;x+=4) engine.dabAt(x,87+Math.sin(x/21)*14,.7);
      engine.advanceSimulation(12);
      engine.configure({...params,color:{r:.7,g:.13,b:.22},brush:'dry',surface:'dry',water:.18,granulation:.3});
      for(let x=40;x<150;x+=3) engine.dabAt(x,134+Math.sin(x/22)*8,.65);
      engine.advanceSimulation(8);
      return {simulationSteps:16,elapsedMs:elapsed,perStepMs:elapsed/16,snapshot:engine.captureExport()};
    });
    const cleanSnapshot=timing.snapshot;
    const exported = Buffer.from(cleanSnapshot.split(',')[1],'base64');
    assert.equal(exported.readUInt32BE(16),1024);
    assert.equal(exported.readUInt32BE(20),1024);
    fs.writeFileSync(path.join(out,'watercolor-washes.png'),exported);
    delete timing.snapshot;
    measurements.push(timing);
    await page.locator('#watercolorCanvas').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'watercolor-desktop.png')});
    const paintBox=await page.locator('#watercolorCanvas').boundingBox();
    await page.mouse.move(paintBox.x+paintBox.width*.52,paintBox.y+paintBox.height*.56);
    await page.locator('#artstudio-watercolor-cursor').waitFor({state:'visible'});
    // Compare in one browser task so autosave's React update cannot change
    // these programmatically configured QA settings between captures.
    const guideDoesNotPaint=await page.evaluate(()=>{
      const canvas=document.querySelector('#watercolorCanvas'),engine=canvas._watercolorEngine,rect=canvas.getBoundingClientRect();
      const before=engine.captureExport();
      canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:rect.left+rect.width*.52,clientY:rect.top+rect.height*.56,pointerType:'mouse'}));
      return engine.captureExport()===before;
    });
    assert(guideDoesNotPaint,'The visible brush guide must never enter the PNG');
    await page.screenshot({path:path.join(out,'watercolor-brush-guide.png')});
    await page.screenshot({path:path.join(out,'watercolor-expanded.png')});
    measurements.push({name:'watercolor-brush-guide',visible:true,exportUnchanged:true});
    const salt=await page.evaluate(()=>{
      const engine=document.querySelector('#watercolorCanvas')._watercolorEngine;
      engine.clear();
      const params={color:{r:.18,g:.43,b:.69},brush:'mop',surface:'wet',flowDirection:'none',showWetness:false,showFlow:false,size:60,water:.6,pigment:.7,paper:.55,granulation:.55,bleed:.75,absorption:.45,drying:.4,flowStrength:0,staining:.34,opacity:.28,mobility:.62,separation:.7,rewetting:.48,humidity:.5,airflow:.2,sizing:.58,bloomSensitivity:.7};
      engine.configure(params);
      for(const x of [55,137])for(let i=0;i<3;i++){engine.reload();engine.dabAt(x,96,1);}
      const state=engine.captureState();
      for(let i=0;i<state.water.length;i++)if(state.pigmentDensity[i]>0)state.water[i]=.45;
      engine.restoreState(state);
      const before=engine.captureState();
      engine.configure({...params,brush:'salt',size:80});
      for(let i=0;i<4;i++)engine.dabAt(137,96,1);
      const after=engine.captureState();
      const sum=a=>a.reduce((n,v)=>n+v,0);
      const result={beforeMass:sum(before.pigmentDensity),afterMass:sum(after.pigmentDensity),palerCells:0,darkerCells:0};
      for(let i=0;i<after.pigmentDensity.length;i++){if(after.pigmentDensity[i]<before.pigmentDensity[i]-.001)result.palerCells++;if(after.pigmentDensity[i]>before.pigmentDensity[i]+.001)result.darkerCells++;}
      result.snapshot=engine.captureExport();return result;
    });
    assert(Math.abs(salt.beforeMass-salt.afterMass)<.001,'Salt should conserve pigment while creating texture');
    assert(salt.palerCells>50 && salt.darkerCells>50,'Salt should create visible pale crystal centers and dark rims');
    fs.writeFileSync(path.join(out,'watercolor-salt.png'),Buffer.from(salt.snapshot.split(',')[1],'base64'));
    delete salt.snapshot;measurements.push({name:'watercolor-salt',...salt});
    await page.getByRole('button',{name:'Exit expanded watercolor canvas (Esc)',exact:true}).click();
    await page.waitForFunction(()=>!document.fullscreenElement && !document.querySelector('#watercolorFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    assert(await watercolorHandle.evaluate(canvas=>canvas===document.querySelector('#watercolorCanvas')));
    const saltAfterExit=await page.evaluate(()=>document.querySelector('#watercolorCanvas')._watercolorEngine.captureState().pigmentDensity.reduce((n,v)=>n+v,0));
    assert(Math.abs(saltAfterExit-salt.afterMass)<.001,'Exiting expanded mode must preserve paint');
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{document.querySelector('#watercolorFullscreenWorkspace').requestFullscreen=()=>Promise.reject(new Error('embedded browser'));});
    await page.getByRole('button',{name:'Expand watercolor canvas',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#watercolorFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await page.waitForTimeout(200);
    const phonePaper=await page.locator('#watercolorCanvas').boundingBox();
    assert(phonePaper.width<=390 && phonePaper.width>300);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert(await watercolorHandle.evaluate(canvas=>canvas===document.querySelector('#watercolorCanvas')));
    assert(Math.abs((await page.evaluate(()=>document.querySelector('#watercolorCanvas')._watercolorEngine.captureState().pigmentDensity.reduce((n,v)=>n+v,0)))-salt.afterMass)<.001);
    const phoneColorBar=await page.locator('.artstudio-watercolor-colors').boundingBox();
    assert(phoneColorBar.height>90,'Phone color controls must keep their natural height without being squeezed');
    await page.getByRole('button',{name:'Draw with a finger',exact:true}).click();
    assert.equal(await page.locator('#watercolorCanvas').evaluate(c=>c.style.touchAction),'none');
    assert.equal(await page.getByRole('button',{name:'Draw with a finger',exact:true}).getAttribute('aria-pressed'),'true');
    await page.locator('#watercolorCanvas').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,'watercolor-phone.png')});
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#watercolorFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    measurements.push({name:'watercolor-phone-fallback',box:phonePaper,escape:true,paintRetained:true});

    }
    await page.setViewportSize({width:1440,height:1000});
    await mount('pixel',{pixelGrid:16,pixelTool:'select',pixelData:{'2,3':'red','3,3':'blue','2,4':'green','5,6':'gold','10,10':'purple'}});
    await page.getByRole('button',{name:'Expand pixel canvas',exact:true}).click();
    await page.waitForFunction(()=>!!document.fullscreenElement || document.querySelector('#pixelFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await page.waitForTimeout(150);
    const selectionBox=await page.locator('#pixelCanvas').boundingBox();
    const point=(x,y)=>({x:selectionBox.x+selectionBox.width*(x+.5)/16,y:selectionBox.y+selectionBox.height*(y+.5)/16});
    async function drag(from,to,release=true) {await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y);if(release)await page.mouse.up();}
    await drag(point(2,3),point(5,6));
    await page.getByRole('button',{name:'Copy pixels',exact:true}).waitFor({state:'visible'});
    const beforeMove=await page.evaluate(()=>document.querySelector('#pixelCanvas')._pixelExport());
    await drag(point(2,3),point(4,4),false);
    assert.equal(await page.evaluate(()=>document.querySelector('#pixelCanvas')._pixelExport()),beforeMove,'Move previews must stay out of exports');
    await page.mouse.up();
    assert.equal(await page.evaluate(()=>document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData['4,4']),'red');
    await page.getByRole('button',{name:'Copy pixels',exact:true}).click();
    const copied=await page.evaluate(()=>{const c=document.querySelector('#pixelCanvas');return {clipboard:c._pixelClipboard,selection:c._pixelSelection,drag:c._pixelSelectionDrag,owner:c._pixelOwner};});
    assert(copied.clipboard,'Copy button must populate the internal clipboard: '+JSON.stringify(copied));
    const destination=point(9,9);await page.mouse.click(destination.x,destination.y);
    const destinationState=await page.evaluate(()=>{const c=document.querySelector('#pixelCanvas');return {clipboard:c._pixelClipboard,selection:c._pixelSelection,drag:c._pixelSelectionDrag,owner:c._pixelOwner};});
    assert(destinationState.clipboard,'Choosing a destination must retain the internal clipboard: '+JSON.stringify(destinationState));
    await page.getByRole('button',{name:'Paste pixels',exact:true}).click();
    const pasted=await page.evaluate(()=>document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData);
    assert.equal(pasted['9,9'],'red');assert.equal(pasted['12,12'],'gold');assert.equal(pasted['10,10'],'purple');
    await page.screenshot({path:path.join(out,'pixel-selection.png')});
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData['9,9']),undefined);
    measurements.push({name:'pixel-selection',previewExcludedFromExport:true,overlapMove:true,copyPaste:true,transparentHoles:true,undo:true});

    const transformSeed={'13,5':'#e11d48','15,5':'#2563eb','13,9':'#16a34a','14,8':'#eab308','2,2':'#9333ea','11,7':'#f9a8d4'};
    await mount('pixel',{pixelGrid:16,pixelTool:'select',pixelData:transformSeed});
    await page.getByRole('button',{name:'Expand pixel canvas',exact:true}).click();
    await page.waitForFunction(()=>!!document.fullscreenElement || document.querySelector('#pixelFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await page.waitForTimeout(150);
    const transformBox=await page.locator('#pixelCanvas').boundingBox();
    const tp=(x,y)=>({x:transformBox.x+transformBox.width*(x+.5)/16,y:transformBox.y+transformBox.height*(y+.5)/16});
    await drag(tp(13,5),tp(15,9));
    await page.locator('#artstudio-pixel-selection-rotate').click();
    const rotated=await page.evaluate(()=>{const c=document.querySelector('#pixelCanvas');return {pixels:c._captureArtStudioState().pixelData,bounds:c._pixelSelection};});
    assert.deepEqual(rotated.bounds,{x:11,y:5,w:5,h:3});
    assert.equal(rotated.pixels['15,5'],transformSeed['13,5']);
    assert.equal(rotated.pixels['15,7'],transformSeed['15,5']);
    assert.equal(rotated.pixels['11,5'],transformSeed['13,9']);
    assert.equal(rotated.pixels['12,6'],transformSeed['14,8']);
    assert.equal(rotated.pixels['2,2'],transformSeed['2,2']);
    assert.equal(rotated.pixels['11,7'],transformSeed['11,7']);
    await page.screenshot({path:path.join(out,'pixel-selection-transforms.png')});
    await page.locator('#artstudio-pixel-selection-flip-x').click();
    assert.equal(await page.evaluate(()=>document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData['11,5']),transformSeed['13,5']);
    await page.locator('#artstudio-pixel-selection-flip-y').click();
    assert.equal(await page.evaluate(()=>document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData['11,7']),transformSeed['13,5']);
    for(let i=0;i<3;i++)await page.getByRole('button',{name:'Undo',exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>document.querySelector('#pixelCanvas')._captureArtStudioState().pixelData),transformSeed);
    measurements.push({name:'pixel-selection-transforms',rotatedBounds:rotated.bounds,unselectedPaintRetained:true,transparentDestinationRetained:true,flips:true,undo:true,gridPx:transformBox.width});

    await page.getByRole('button',{name:'Exit expanded canvas (Esc)',exact:true}).click();
    await page.waitForFunction(()=>!document.fullscreenElement && !document.querySelector('#pixelFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await page.waitForTimeout(150);
    await page.setViewportSize({width:390,height:844});
    await mount('pixel',{pixelGrid:16,pixelTool:'select',pixelData:transformSeed});
    await page.evaluate(()=>{document.querySelector('#pixelFullscreenWorkspace').requestFullscreen=()=>Promise.reject(new Error('embedded browser'));});
    await page.getByRole('button',{name:'Expand pixel canvas',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#pixelFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    const palette=page.locator('[data-studio-compact-palette="pixel"]');
    if(!await palette.evaluate(e=>e.open))await palette.locator('summary').first().click();
    await page.locator('#artstudio-pixel-selection-all').click();
    for(const action of ['rotate','flip-x','flip-y']) {
      const button=page.locator('#artstudio-pixel-selection-'+action);
      await button.scrollIntoViewIfNeeded();
      const bounds=await button.boundingBox();
      assert(bounds.x>=0 && bounds.x+bounds.width<=390 && bounds.height>=44,'Selection actions must fit on the phone and retain touch targets');
      assert(await button.isEnabled());
    }
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=390));
    await page.locator('#artstudio-pixel-selection-rotate').click();
    const phoneContrast=await page.evaluate(()=>{
      const light=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
      return ['Undo','Grid lines'].map(label=>{
        const button=[...document.querySelectorAll('#pixelFullscreenWorkspace button')].find(b=>b.textContent===label);
        const style=getComputedStyle(button),fg=light(style.color),bg=light(style.backgroundColor);
        return {label,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05),background:style.backgroundColor,enabled:!button.disabled};
      });
    });
    for(const control of phoneContrast)assert(control.enabled && control.ratio>=4.5 && !control.background.includes('rgba'),'Active toolbar controls must remain legible on the fullscreen fallback: '+JSON.stringify(control));
    await page.screenshot({path:path.join(out,'pixel-selection-phone.png')});
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#pixelFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    measurements.push({name:'pixel-selection-phone',viewportWidth:390,transformTouchTargets:true,noHorizontalOverflow:true,escape:true,toolbarContrast:phoneContrast});
    await page.setViewportSize({width:1440,height:1000});

    if(process.env.ARTSTUDIO_QA_ONLY!=='selection') {
      await mount('watercolor',{watercolorSize:28});
      const strokeCheck=await page.evaluate(()=>{
        const canvas=document.querySelector('#watercolorCanvas'),engine=canvas._watercolorEngine;
        engine.togglePause();
        const rect=canvas.getBoundingClientRect();
        const params={color:{r:.18,g:.43,b:.69},brush:'flat',surface:'dry',flowDirection:'none',showWetness:false,showFlow:false,size:36,water:0,pigment:.65,paper:.48,granulation:.6,bleed:.65,absorption:.45,drying:.4,flowStrength:0,staining:.34,opacity:.28,mobility:.62,separation:.7,rewetting:.48,humidity:.5,airflow:.2,sizing:.58,bloomSensitivity:.7};
        const event=(x,y,timeStamp,extra={})=>({clientX:rect.left+x*rect.width/192,clientY:rect.top+y*rect.height/192,timeStamp,pointerId:1,pointerType:'pen',pressure:.7,button:0,preventDefault(){},...extra});
        engine.configure(params);
        canvas.onpointerdown(event(32,38,0,{pressure:.1,tiltX:-60,tiltY:1}));
        canvas.onpointerup(event(160,38,220,{type:'pointerup',pressure:.1,tiltX:-60,tiltY:-1}));
        const wrap=engine.captureState();
        const stray=wrap.pigmentDensity.reduce((n,v,i)=>n+(Math.abs(Math.floor(i/192)-38)>6?v:0),0);
        engine.configure({...params,brush:'rigger',size:80,color:{r:.62,g:.20,b:.44}});
        canvas.onpointerdown(event(32,76,300,{pressure:.05,tiltY:85}));
        canvas.onpointerup(event(160,76,620,{type:'pointerup',pressure:.05,tiltY:85}));
        engine.configure({...params,brush:'round',size:25,water:.55,color:{r:.13,g:.48,b:.36}});
        canvas.onpointerdown(event(32,113,700,{pressure:.05}));
        for(let x=36;x<=160;x+=4)canvas.onpointermove(event(x,113+Math.sin((x-32)/128*Math.PI*2)*5,700+(x-32)*3,{pressure:.05+.8*Math.sin((x-32)/128*Math.PI)}));
        canvas.onpointerup(event(160,113,1100,{type:'pointerup',pressure:0}));
        engine.configure({...params,brush:'dry',size:32,water:.15,color:{r:.7,g:.3,b:.12}});
        canvas.onpointerdown(event(32,154,1200,{pressure:.5}));
        canvas.onpointerup(event(160,154,1600,{type:'pointerup',pressure:.5}));
        engine.advanceSimulation(12);
        return {angleWrapStrayPigment:stray,snapshot:engine.captureExport()};
      });
      assert.equal(strokeCheck.angleWrapStrayPigment,0);
      fs.writeFileSync(path.join(out,'watercolor-strokes.png'),Buffer.from(strokeCheck.snapshot.split(',')[1],'base64'));
      delete strokeCheck.snapshot;
      measurements.push({name:'watercolor-stroke-gallery',...strokeCheck,exportPx:1024});
    }
    assert.deepEqual(errors, []);
    const reportName=process.env.ARTSTUDIO_QA_ONLY==='selection'?'selection-browser-results.json':(process.env.ARTSTUDIO_QA_ONLY==='editing'?'editing-browser-results.json':'browser-results.json');
    fs.writeFileSync(path.join(out,reportName),JSON.stringify({passed:true,measurements,errors},null,2));
    console.log(JSON.stringify({passed:true,measurements,errors},null,2));
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
