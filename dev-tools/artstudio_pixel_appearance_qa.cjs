const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const out=path.resolve('reports/artstudio-workspace'),read=p=>fs.readFileSync(p,'utf8');
let shell=read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1];
shell=shell.replace('var pair = React.useState(init);','var pair = React.useState(init);var studies=React.useState([]),learner=React.useState("appearance-a");window.__edit=pair[1];window.__state=pair[0];window.__studies=studies[0];window.__learner=learner[1];')
 .replace('var ctx = { React: React','var ctx = { activeProfileId:learner[0],React: React').replace('setToolSnapshots: function(){},','setToolSnapshots:studies[1],').replace('toolSnapshots: [],','toolSnapshots:studies[0],');
(async()=>{
 const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const html='<html><head><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>';
  await page.route('http://localhost:47833/**',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('http://localhost:47833/');
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_artstudio.js'])await page.addScriptTag({content:read(file)});
  await page.addScriptTag({content:shell});
  const base={},glow={};
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
   const key=x+','+y;let color=y<18?['#182e52','#243c64','#36537a'][Math.min(2,Math.floor(y/6))]:['#1d4657','#245264','#316278'][Math.floor((y-18)/5)];
   if(y>=Math.round(13+Math.sin(x*.22)*3))color='#244758';
   if(y>=Math.round(17+Math.sin(x*.32+1)*2))color='#173744';
   if(y>=24)color='#49654c';if(y>=27)color='#2c4b3f';
   if(x>=19&&x<=27&&y>=13&&y<=21)color='#ad714b';
   if(y>=10&&y<=13&&x>=23-(y-10)*2&&x<=23+(y-10)*2)color='#413951';
   if(x>=22&&x<=24&&y>=16&&y<=19)color='#ffd48a';
   if(x>=26&&x<=27&&y>=15&&y<=17)color='#efd394';
   if(Math.hypot(x-7,y-6)<=2.2)color='#eee8cc';
   if(y<11&&((x*17+y*11)%83===2))color='#a3bed1';
   if(y>=22&&y<=25&&x>=21-y%3&&x<=27+y%2)color='#c7955e';
   base[key]=color;
   if(Math.hypot((x-23)*.8,y-17)<10)glow[key]=Math.hypot(x-23,y-17)<4?'#ffb655':'#a7613370';
  }
  const layers=[{id:'scene',name:'Moonlit cabin',visible:true,locked:true,pixels:base},{id:'glow',name:'Warm window glow',visible:true,locked:false,pixels:glow}];
  await page.evaluate(layers=>__mount('artStudio',false,{tab:'pixel',studioStarted:true,studioHome:false,pixelGrid:32,pixelLayers:layers,pixelActiveLayer:'glow'}),layers);
  const canvas=page.locator('#pixelCanvas'),workspace=page.locator('#pixelFullscreenWorkspace'),panel=page.locator('#artstudio-pixel-layers'),range=page.locator('#artstudio-pixel-layer-opacity'),blend=page.locator('#artstudio-pixel-layer-blend');
  const snapshot=()=>canvas.evaluate(c=>c._captureArtStudioState()),png=()=>canvas.evaluate(c=>c._pixelExportNative()),undo=()=>workspace.getByRole('button',{name:'Undo',exact:true}).click();
  const setOpacity=value=>range.evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await canvas.waitFor();await workspace.getByRole('button',{name:'Expand pixel canvas',exact:true}).click();await panel.evaluate(node=>{node.closest('[data-studio-compact-palette]').open=true;node.open=true;});
  await page.waitForFunction(()=>document.getElementById('pixelCanvas').getBoundingClientRect().width>750);checks.push({expandedGrid:await canvas.boundingBox()});
  const original=await snapshot();await range.scrollIntoViewIfNeeded();const bounds=await range.boundingBox();
  await page.mouse.move(bounds.x+bounds.width-8,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width*.55,bounds.y+bounds.height/2,{steps:8});await page.mouse.up();
  const faded=await snapshot();assert(faded.pixelLayers[1].opacity<75);assert.deepEqual(faded.pixelLayers[1].pixels,glow);await undo();assert.deepEqual(await snapshot(),original);assert(await workspace.getByRole('button',{name:'Undo',exact:true}).isDisabled());await workspace.getByRole('button',{name:'Redo',exact:true}).click();checks.push('An actual mouse drag fades the layer in one Undo/Redo step and retains its original cells');
  await setOpacity(60);
  const oracle=async()=>page.evaluate(async()=>{
   const drawing=document.getElementById('pixelCanvas'),state=drawing._captureArtStudioState(),native=document.createElement('canvas');native.width=native.height=state.pixelGrid;const ctx=native.getContext('2d');
   state.pixelLayers.forEach(layer=>{if(!layer.visible)return;ctx.globalAlpha=layer.opacity===undefined?1:layer.opacity/100;ctx.globalCompositeOperation=layer.blend==='multiply'||layer.blend==='screen'?layer.blend:'source-over';Object.entries(layer.pixels).forEach(([key,color])=>{const [x,y]=key.split(',').map(Number);ctx.fillStyle=color;ctx.fillRect(x,y,1,1);});});
   const image=new Image();image.src=drawing._pixelExportNative();await image.decode();const result=document.createElement('canvas');result.width=result.height=state.pixelGrid;const actual=result.getContext('2d');actual.drawImage(image,0,0);const a=actual.getImageData(0,0,state.pixelGrid,state.pixelGrid).data,b=ctx.getImageData(0,0,state.pixelGrid,state.pixelGrid).data;let premultipliedError=0,alphaError=0;
   for(let i=0;i<a.length;i+=4){alphaError=Math.max(alphaError,Math.abs(a[i+3]-b[i+3]));for(let c=0;c<3;c++)premultipliedError=Math.max(premultipliedError,Math.abs(a[i+c]*a[i+3]/255-b[i+c]*b[i+3]/255));}
   return {cells:state.pixelGrid*state.pixelGrid,premultipliedError,alphaError,blend:state.pixelLayers[1].blend||'normal',opacity:state.pixelLayers[1].opacity};
  });
  for(const mode of ['normal','multiply','screen']){await blend.selectOption(mode);const comparison=await oracle();assert(comparison.premultipliedError<=2,JSON.stringify(comparison));assert(comparison.alphaError<=1);checks.push({nativeCanvasOracle:comparison});}
  assert(await page.locator('#artstudio-pixel-layer-merge').isDisabled());const beforeReset=await snapshot();await page.locator('#artstudio-pixel-layer-reset-appearance').click();assert.equal((await snapshot()).pixelLayers[1].opacity,undefined);assert.equal((await snapshot()).pixelLayers[1].blend,undefined);await undo();assert.deepEqual(await snapshot(),beforeReset);
  const expectedPng=await canvas.evaluate(c=>c._pixelExport());const [download]=await Promise.all([page.waitForEvent('download'),workspace.getByRole('button',{name:/Export PNG$/}).click({timeout:10000})]);const target=path.join(out,'pixel-appearance-export.png');await download.saveAs(target);assert(fs.readFileSync(target).equals(Buffer.from(expectedPng.split(',')[1],'base64')));checks.push('Actual PNG download matches the clean composite export exactly');
  await page.getByRole('button',{name:'Exit expanded canvas (Esc)',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement&&!document.getElementById('pixelFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));await page.locator('summary[aria-label="Studio actions"]').click();const savedPng=await png();await page.getByRole('button',{name:'Save current study',exact:true}).click();await page.waitForFunction(()=>__studies.length===1);const saved=await page.evaluate(()=>JSON.stringify(__studies[0].data));await setOpacity(0);await blend.selectOption('multiply');if(await page.locator('#artstudio-process-button').getAttribute('aria-expanded')!=='true')await page.locator('#artstudio-process-button').click();await page.getByRole('button',{name:/^Fork Pixel Art/}).click();await page.waitForFunction(()=>document.getElementById('artstudio-pixel-layer-blend').value==='screen');assert.equal(await png(),savedPng);assert.deepEqual((await snapshot()).pixelLayers,beforeReset.pixelLayers);assert.equal(await page.evaluate(()=>JSON.stringify(__studies[0].data)),saved);checks.push('Save/Fork restores opacity, blend, and original pixels while keeping the saved original unchanged');
  await page.getByRole('button',{name:'Expand pixel canvas',exact:true}).click();await page.waitForFunction(()=>document.getElementById('pixelCanvas').getBoundingClientRect().width>750);await panel.evaluate(node=>node.parentElement.scrollTop=0);await page.screenshot({path:path.join(out,'pixel-appearance-desktop.png')});
  await page.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});if(!await page.locator('[data-studio-compact-palette="pixel"]').evaluate(node=>node.open))await page.locator('[data-studio-compact-palette="pixel"] > summary').click();await range.scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const targets=await panel.evaluate(node=>[...node.querySelectorAll('input[type=range],select,#artstudio-pixel-layer-reset-appearance')].map(n=>n.getBoundingClientRect().height));assert(targets.every(h=>h>=44));checks.push({phoneWidth:width,appearanceControlHeights:targets,noHorizontalOverflow:true});await page.screenshot({path:path.join(out,'pixel-appearance-phone-'+width+'.png')});}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'pixel-appearance-browser-results.json'),JSON.stringify({passed:true,checks,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,checks}));
 }catch(error){fs.writeFileSync(path.join(out,'pixel-appearance-browser-results.json'),JSON.stringify({passed:false,checks,errors,failure:String(error)},null,2)+'\n');await page.screenshot({path:path.join(out,'pixel-appearance-failure.png')});throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
