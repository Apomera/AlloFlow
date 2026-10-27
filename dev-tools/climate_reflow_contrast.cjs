'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=process.cwd(),arg=name=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3);
const label=arg('report')||'contrast';assert(/^[a-z0-9-]+$/.test(label));
const base=path.join(root,'reports/climate-reflow-wcag'),folder=path.join(base,label);fs.mkdirSync(folder,{recursive:true});
const sourcePath=path.resolve(arg('source')||path.join(base,'final-source.js')),source=fs.readFileSync(sourcePath,'utf8');
const bankSource=source.match(/var QUIZ = \[([\s\S]*?)\n      \];/);assert(bankSource);const questionCount=(bankSource[1].match(/\{ q:/g)||[]).length;assert(questionCount>1);
const inversionSource=source.match(/var INVERSION = \[([\s\S]*?)\n\s*\];/);assert(inversionSource);const inversionData=[...inversionSource[1].matchAll(/country:\s*'([^']+)'[^\n]*?perCapTons:\s*(\d+)[^\n]*?vuln:\s*(\d+)/g)].map(match=>({country:match[1],tons:Number(match[2]),vulnerability:Number(match[3])}));assert(inversionData.length>1);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const cssFile=fs.readdirSync('app/static/css').find(file=>/^main\.[a-z0-9]+\.css$/i.test(file));assert(cssFile);
const html=String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Climate Explorer responsive accessibility review</title><link rel="stylesheet" href="/app/static/css/${cssFile}"><style>body{margin:0;background:#fff;color:#16201a;font-family:system-ui}#tool-root{max-width:1200px;margin:auto;box-sizing:border-box}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}</style></head><body><div id="styles"></div><div id="tool-root" data-stem-tool-shell="climateExplorer"></div><div id="qa-announcer" class="sr-only" role="status" aria-live="polite"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/app_styles_module.js"></script><script>window.StemLab={_registry:{},registerTool:function(id,tool){this._registry[id]=tool;}};</script><script src="/stem_lab/stem_tool_climateExplorer.js"></script><script>
ReactDOM.render(React.createElement(AlloModules.AppStyles.AppStyles,{baseFontSize:16,lineHeight:1.5}),document.getElementById('styles'));
window.mountClimate=function(seed,theme='light'){
 function Host(){const [data,setData]=React.useState({climateExplorer:seed});window.climateData=data.climateExplorer;window.climateSet=setData;return StemLab._registry.climateExplorer.render({React,toolData:data,setToolData:setData,theme:theme==='dark'?'dark':'light',isDark:theme==='dark',isContrast:theme==='contrast',icons:{ArrowLeft:()=>null},gradeLevel:'6th Grade',setStemLabTool:()=>{},addToast:()=>{},getXP:()=>0,awardXP:(tool,n)=>{window.climateAwards.push({tool,n});},t:(key,fallback)=>fallback==null?key:fallback,announceToSR:message=>{window.climateAnnouncements.push(message);document.querySelector('#qa-announcer').textContent=message;}});}
 window.climateAnnouncements=[];window.climateAwards=[];document.documentElement.classList.toggle('theme-dark',theme==='dark');document.documentElement.classList.toggle('theme-contrast',theme==='contrast');document.body.style.background=theme==='contrast'?'#000':theme==='dark'?'#0f130e':'#f4f7f1';document.body.style.color=theme==='contrast'?'#fff':theme==='dark'?'#e6eadf':'#16201a';document.querySelector('#qa-announcer').textContent='';ReactDOM.unmountComponentAtNode(document.getElementById('tool-root'));ReactDOM.render(React.createElement(Host),document.getElementById('tool-root'));
};mountClimate({tab:'justice',heroMotionPaused:true,quizOpen:true});
</script></body></html>`;
const result={sourcePath:path.relative(root,sourcePath),sourceSha256:sha(source),scope:'Bounded full-tool Climate Explorer reflow checks across six core tabs, closed and open quiz states, 320px viewport, doubled computed fonts and WCAG text spacing. This is not full WCAG certification or spoken screen-reader testing.',checks:[],cases:[],focus:[],audits:[],captures:[],errors:[],networkFailures:[]};
result.inputs=['dev-tools/climate_reflow_contrast.cjs','app/static/css/'+cssFile,'app_styles_module.js','desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','desktop/web-app/node_modules/axe-core/axe.min.js','tests/helpers/stem_focus_visibility_browser_checks.js','tests/helpers/stem_wcag_browser_checks.js'].map(file=>({path:file,sha256:sha(fs.readFileSync(file))}));
const verify=process.argv.includes('--verify'),save=()=>fs.writeFileSync(path.join(folder,'progress.json'),JSON.stringify(result,null,2));
function check(name,ok,evidence){ok=!!ok;result.checks.push({name,ok,evidence});console.log('CHECK '+name+' '+ok);save();}
const server=http.createServer((request,response)=>{const url=new URL(request.url,'http://localhost');
 if(url.pathname==='/'){response.setHeader('Content-Type','text/html');response.end(html);return;}
 if(url.pathname==='/stem_lab/stem_tool_climateExplorer.js'){response.setHeader('Content-Type','text/javascript');response.end(source);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!['/app/static/css/','/app_styles_module.js','/desktop/web-app/node_modules/react/umd/','/desktop/web-app/node_modules/react-dom/umd/','/desktop/web-app/node_modules/axe-core/'].some(prefix=>url.pathname.startsWith(prefix))){response.writeHead(403);response.end();return;}
 fs.readFile(file,(error,bytes)=>{if(error){response.writeHead(404);response.end();return;}response.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');response.end(bytes);});});
let browser,temp;
(async()=>{await new Promise(resolve=>server.listen(process.argv.includes('--serve')?Number(arg('port')||8784):0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/';
 if(process.argv.includes('--serve')){console.log(JSON.stringify({preview:url,sourceSha256:sha(source),sourcePath}));return;}
 temp=fs.mkdtempSync(path.join(folder,'browser-temp-'));process.env.TEMP=process.env.TMP=temp;
 const browsers=path.join(process.env.USERPROFILE,'AppData/Local/ms-playwright');if(fs.existsSync(browsers))process.env.PLAYWRIGHT_BROWSERS_PATH=browsers;
 try{const {chromium}=require('playwright');browser=await chromium.launch({headless:true,args:['--disk-cache-size=1','--media-cache-size=1','--disable-background-networking']});
 const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});page.on('pageerror',error=>result.errors.push(String(error)));page.on('requestfailed',request=>result.networkFailures.push({url:request.url(),error:request.failure()}));
 await page.goto(url);await page.waitForFunction(()=>window.climateData);
 const settle=()=>page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await Promise.all(document.getAnimations().filter(animation=>Number.isFinite(animation.effect.getTiming().iterations)).map(animation=>animation.finished.catch(()=>{})));await new Promise(resolve=>requestAnimationFrame(resolve));});
 async function mount(seed={},width=1280,kind='normal',theme='light'){
  await page.setViewportSize({width,height:1000});await page.emulateMedia({forcedColors:theme==='forced-colors'?'active':'none'});await page.evaluate(({seed,theme})=>{document.querySelector('#qa-observe-fonts')?.remove();mountClimate({tab:'justice',heroMotionPaused:true,quizOpen:true,...seed},theme==='forced-colors'?'light':theme);},{seed,theme});await settle();
  if(kind!=='normal')await page.evaluate(kind=>{const style=document.createElement('style');style.id='qa-observe-fonts';if(kind==='spacing')style.textContent='#tool-root,#tool-root *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}#tool-root p{margin-bottom:2em!important}';else{const fonts=[...document.querySelectorAll('#tool-root *')].map((el,index)=>{el.dataset.qaObserveFont=index;return{index,size:parseFloat(getComputedStyle(el).fontSize)};});style.textContent=fonts.map(row=>'#tool-root [data-qa-observe-font="'+row.index+'"]{font-size:'+row.size*2+'px!important}').join('');}document.head.appendChild(style);},kind);await settle();
 }
 async function activate(locator){await locator.focus();await page.keyboard.press('Enter');await settle();}
 async function capture(name,locator){await locator.scrollIntoViewIfNeeded();await settle();const file=path.join(folder,name+'.png');await locator.screenshot({path:file});result.captures.push({name,path:path.relative(root,file),sha256:sha(fs.readFileSync(file))});}
 async function captureShell(name){await page.evaluate(()=>scrollTo(0,0));await settle();const clip=await page.evaluate(()=>{const root=document.querySelector('.ce-explorer-root').getBoundingClientRect(),panel=document.getElementById('ce-panel').getBoundingClientRect();return{x:Math.max(0,root.left),y:0,width:Math.min(innerWidth,root.width),height:Math.ceil(panel.top)};});const file=path.join(folder,name+'.png');await page.screenshot({path:file,clip});result.captures.push({name,path:path.relative(root,file),sha256:sha(fs.readFileSync(file))});}

 result.scope='Supplemental rendered contrast measurement for all 12 paired-chart country names and both metric labels (36 boxes per theme), plus the back-arrow glyph. The real host and source are unchanged. Text spans are temporarily visibility:hidden only during background raster capture, preserving their exact layout; raw axe incompletes remain in the separate final native report.';
 result.labels=[];result.glyphs=[];
 for(const file of ['dev-tools/climate_reflow_qa.cjs','dev-tools/organism_contrast_qa.cjs'])result.inputs.push({path:file,sha256:sha(fs.readFileSync(file))});
 const {PNG}=require('playwright-core/lib/utilsBundle');
 function rgba(value){const match=value.match(/^rgba?\(([^)]+)\)$/);if(!match)throw Error('Unsupported color: '+value);const parts=match[1].split(/[ ,/]+/).filter(Boolean).map(Number);return[parts[0],parts[1],parts[2],parts.length>3?parts[3]:1];}
 function composite(f,b,alpha=1){const a=f[3]*alpha;return f.slice(0,3).map((v,i)=>v*a+b[i]*(1-a)).concat(1);}
 function luminance(c){return c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
 function ratio(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 function noEffects(chain){return chain.every(s=>Number(s.opacity)===1&&s.filter==='none'&&s.backdrop==='none'&&s.blend==='normal'&&s.before==='none'&&s.after==='none');}
 await page.evaluate(()=>{window.contrastStyle=function(el){const out=[];for(let node=el;node;node=node.parentElement){const s=getComputedStyle(node);out.push({tag:node.tagName,id:node.id,class:node.className,color:s.color,background:s.backgroundColor,image:s.backgroundImage,opacity:s.opacity,filter:s.filter,backdrop:s.backdropFilter,blend:s.mixBlendMode,before:getComputedStyle(node,'::before').content,after:getComputedStyle(node,'::after').content,fontSize:s.fontSize,fontWeight:s.fontWeight,textShadow:s.textShadow,textFill:s.webkitTextFillColor});}return out;};});
 for(const theme of ['light','dark','contrast','forced-colors']){
  await mount({tab:'justice',quizOpen:false},320,'normal',theme);
  const chartRows=page.locator('.ce-inversion-row');assert.equal(await chartRows.count(),12);
  for(let index=0;index<12;index++){
   const row=chartRows.nth(index);await row.scrollIntoViewIfNeeded();await settle();
   const before=await row.evaluate(root=>{const b=root.getBoundingClientRect();return{rowBox:{width:b.width,height:b.height},labels:[...root.querySelectorAll('.ce-inversion-country > span:nth-child(2),.ce-inversion-caused > span,.ce-inversion-exposed > span')].map(el=>{const box=el.getBoundingClientRect();return{text:el.textContent,box:{left:box.left-b.left,right:box.right-b.left,top:box.top-b.top,bottom:box.bottom-b.top},chain:contrastStyle(el),descendants:[...el.querySelectorAll('*')].map(child=>contrastStyle(child)[0])};})};});
   assert.equal(before.labels.length,3);
   const hidden=await page.addStyleTag({content:'.ce-inversion-row span{visibility:hidden!important}'});
   const after=await row.evaluate(root=>{const b=root.getBoundingClientRect();return{rowBox:{width:b.width,height:b.height},labels:[...root.querySelectorAll('.ce-inversion-country > span:nth-child(2),.ce-inversion-caused > span,.ce-inversion-exposed > span')].map(el=>{const box=el.getBoundingClientRect();return{left:box.left-b.left,right:box.right-b.left,top:box.top-b.top,bottom:box.bottom-b.top};})};});
   const bytes=await row.screenshot();await hidden.evaluate(el=>el.remove());
   const png=PNG.sync.read(bytes),file=path.join(folder,'country-background-'+theme+'-'+index+'.png');fs.writeFileSync(file,bytes);const imageRow={name:'country-background-'+theme+'-'+index,path:path.relative(root,file),sha256:sha(bytes),diagnostic:true,width:png.width,height:png.height};result.captures.push(imageRow);
   const layoutPreserved=JSON.stringify(before.rowBox)===JSON.stringify(after.rowBox)&&JSON.stringify(before.labels.map(x=>x.box))===JSON.stringify(after.labels);
   for(const label of before.labels){
    const min=[255,255,255],max=[0,0,0],box=label.box;let pixels=0;
    const within=box.left>=-1&&box.top>=-1&&box.right<=png.width+1&&box.bottom<=png.height+1;
    for(let y=Math.max(0,Math.floor(box.top));y<Math.min(png.height,Math.ceil(box.bottom));y++)for(let x=Math.max(0,Math.floor(box.left));x<Math.min(png.width,Math.ceil(box.right));x++){const p=(y*png.width+x)*4;assert.equal(png.data[p+3],255);for(let c=0;c<3;c++){min[c]=Math.min(min[c],png.data[p+c]);max[c]=Math.max(max[c],png.data[p+c]);}pixels++;}
    const lower=min.map(v=>Math.max(0,v-1)),upper=max.map(v=>Math.min(255,v+1)),own=label.chain[0];
    // Chromium can expose a forced system color alongside an authored text-fill
    // value. Bound both candidates conservatively instead of assuming which paints.
    const inkBounds=[...new Set([own.color,own.textFill])].map(color=>{const ink=rgba(color),fgLow=composite(ink,lower).slice(0,3).map(Math.floor),fgHigh=composite(ink,upper).slice(0,3).map(Math.ceil);let bound=null;if(luminance(fgLow)>=luminance(upper))bound=(luminance(fgLow)+.05)/(luminance(upper)+.05);else if(luminance(fgHigh)<=luminance(lower))bound=(luminance(lower)+.05)/(luminance(fgHigh)+.05);return{color,contrastLowerBound:bound};});
    const bound=inkBounds.every(row=>row.contrastLowerBound!==null)?Math.min(...inkBounds.map(row=>row.contrastLowerBound)):null;
    const supported=within&&layoutPreserved&&pixels>0&&noEffects(label.chain)&&noEffects(label.descendants)&&own.textShadow==='none'&&rgba(own.background)[3]===0&&own.image==='none'&&label.descendants.every(child=>child.color===own.color&&child.textFill===own.textFill&&child.textShadow==='none'&&rgba(child.background)[3]===0&&child.image==='none');
    const evidence={theme,index,...label,image:imageRow,pixels,layoutPreserved,textBoxWithinRaster:within,backgroundMin:min,backgroundMax:max,roundedLower:lower,roundedUpper:upper,inkBounds,contrastLowerBound:bound,supported};result.labels.push(evidence);
    check('Chart '+theme+' '+index+' '+label.text.slice(0,32)+' contrast >=4.5',supported&&bound>=4.5,evidence);
   }
  }
  const arrow=await page.getByRole('button',{name:'Back to STEAM Lab',exact:true}).evaluate(el=>({text:el.textContent,chain:contrastStyle(el)}));let background=[255,255,255,1],own=arrow.chain[0],supported=noEffects(arrow.chain),contrast=null;
  const needed=[];for(const entry of arrow.chain){needed.push(entry);if(rgba(entry.background)[3]===1)break;}for(const entry of needed.slice().reverse()){if(entry.image!=='none')supported=false;background=composite(rgba(entry.background),background);}contrast=ratio(composite(rgba(own.color),background),background);const glyph={theme,...arrow,background,contrast,supported};result.glyphs.push(glyph);check('Back arrow '+theme+' computed contrast >=3',supported&&contrast>=3,glyph);
 }
 check('All 144 chart labels and four back glyphs were measured',result.labels.length===144&&result.glyphs.length===4);
 check('No runtime or failed resource errors',!result.errors.length&&!result.networkFailures.length,{errors:result.errors,networkFailures:result.networkFailures});result.success=result.checks.every(row=>row.ok);if(verify&&!result.success)process.exitCode=1;
 }catch(error){result.success=false;result.harnessError=String(error);console.error(error);process.exitCode=1;}finally{if(browser){await browser.close();result.browserClosed=true;}server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));if(temp){const resolved=fs.realpathSync(temp),parent=fs.realpathSync(folder);assert(resolved.startsWith(parent+path.sep)&&path.basename(resolved).startsWith('browser-temp-'));fs.rmSync(resolved,{recursive:true,force:true});result.profileCleaned=true;}result.passed=result.checks.filter(row=>row.ok).length;result.failed=result.checks.filter(row=>!row.ok).length;fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({success:result.success,passed:result.passed,failed:result.failed,sourceSha256:result.sourceSha256}));}})();

