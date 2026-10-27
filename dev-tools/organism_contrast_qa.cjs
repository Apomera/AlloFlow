'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=process.cwd(),arg=name=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3);
const label=arg('report')||'baseline';assert(/^[a-z0-9-]+$/.test(label));
const base=path.join(root,'reports/organism-contrast-wcag'),folder=path.join(base,label);fs.mkdirSync(folder,{recursive:true});
const sourcePath=path.resolve(arg('source')||path.join(base,'baseline-source.js')),source=fs.readFileSync(sourcePath,'utf8');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const cssFile=fs.readdirSync('app/static/css').find(file=>/^main\.[a-z0-9]+\.css$/i.test(file));assert(cssFile);
const html=String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Taxonomy Explorer accessibility review</title><link rel="stylesheet" href="/app/static/css/${cssFile}"><style>body{margin:0;background:#fff;color:#16201a;font-family:system-ui}#tool-root{max-width:1200px;margin:auto;box-sizing:border-box}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}</style></head><body><div id="styles"></div><div id="tool-root"></div><div id="qa-announcer" class="sr-only" role="status" aria-live="polite"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/app_styles_module.js"></script><script>window.StemLab={_registry:{},registerTool:function(id,tool){this._registry[id]=tool;}};</script><script src="/stem_lab/stem_tool_organismid.js"></script><script>
ReactDOM.render(React.createElement(AlloModules.AppStyles.AppStyles,{baseFontSize:16,lineHeight:1.5}),document.getElementById('styles'));
window.mountOrganism=function(seed,theme='light'){
 function Host(){const [data,setData]=React.useState({organismId:seed});window.oidData=data.organismId;window.oidSet=setData;return StemLab._registry.organismId.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',t:(key,fallback)=>fallback==null?key:fallback,announceToSR:message=>{window.oidAnnouncements.push(message);document.querySelector('#qa-announcer').textContent=message;}});}
 window.oidAnnouncements=[];document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('theme-contrast',theme==='contrast');document.body.style.background=theme==='contrast'?'#000':theme==='dark'?'#0f130e':'#f4f7f1';document.body.style.color=theme==='contrast'?'#fff':theme==='dark'?'#e6eadf':'#16201a';document.querySelector('#qa-announcer').textContent='';ReactDOM.unmountComponentAtNode(document.getElementById('tool-root'));ReactDOM.render(React.createElement(Host),document.getElementById('tool-root'));
};mountOrganism({activeView:'tree'});
</script></body></html>`;
const result={sourcePath:path.relative(root,sourcePath),sourceSha256:sha(source),scope:'Bounded Taxonomy Explorer tree, tier, lookalike, lesson and photo-information view reflow, semantics and four-theme automated checks using real React and compiled app CSS. Not full WCAG certification, browser zoom or spoken screen-reader testing.',checks:[],cases:[],focus:[],audits:[],captures:[],errors:[],networkFailures:[]};
result.inputs=['dev-tools/organism_contrast_qa.cjs','app/static/css/'+cssFile,'app_styles_module.js','desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','desktop/web-app/node_modules/axe-core/axe.min.js','tests/helpers/stem_focus_visibility_browser_checks.js','tests/helpers/stem_wcag_browser_checks.js'].map(file=>({path:file,sha256:sha(fs.readFileSync(file))}));
const verify=process.argv.includes('--verify'),save=()=>fs.writeFileSync(path.join(folder,'progress.json'),JSON.stringify(result,null,2));
function check(name,ok,evidence){ok=!!ok;result.checks.push({name,ok,evidence});console.log('CHECK '+name+' '+ok);save();}
const server=http.createServer((request,response)=>{const url=new URL(request.url,'http://localhost');
 if(url.pathname==='/'){response.setHeader('Content-Type','text/html');response.end(html);return;}
 if(url.pathname==='/stem_lab/stem_tool_organismid.js'){response.setHeader('Content-Type','text/javascript');response.end(source);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!['/app/static/css/','/app_styles_module.js','/desktop/web-app/node_modules/react/umd/','/desktop/web-app/node_modules/react-dom/umd/','/desktop/web-app/node_modules/axe-core/'].some(prefix=>url.pathname.startsWith(prefix))){response.writeHead(403);response.end();return;}
 fs.readFile(file,(error,bytes)=>{if(error){response.writeHead(404);response.end();return;}response.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');response.end(bytes);});});
let browser,temp;
(async()=>{await new Promise(resolve=>server.listen(process.argv.includes('--serve')?Number(arg('port')||8782):0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/';
 if(process.argv.includes('--serve')){console.log(JSON.stringify({preview:url,sourceSha256:sha(source),sourcePath}));return;}
 temp=fs.mkdtempSync(path.join(folder,'browser-temp-'));process.env.TEMP=process.env.TMP=temp;
 const browsers=path.join(process.env.USERPROFILE,'AppData/Local/ms-playwright');if(fs.existsSync(browsers))process.env.PLAYWRIGHT_BROWSERS_PATH=browsers;
 try{const {chromium}=require('playwright');browser=await chromium.launch({headless:true,args:['--disk-cache-size=1','--media-cache-size=1','--disable-background-networking']});
 const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});page.on('pageerror',error=>result.errors.push(String(error)));page.on('requestfailed',request=>result.networkFailures.push({url:request.url(),error:request.failure()}));
 await page.goto(url);await page.waitForFunction(()=>window.oidData);
 const settle=()=>page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await Promise.all(document.getAnimations().filter(animation=>Number.isFinite(animation.effect.getTiming().iterations)).map(animation=>animation.finished.catch(()=>{})));await new Promise(resolve=>requestAnimationFrame(resolve));});
 async function mount(seed={},width=1280,kind='normal',theme='light'){
  await page.setViewportSize({width,height:1000});await page.emulateMedia({forcedColors:theme==='forced-colors'?'active':'none'});await page.evaluate(({seed,theme})=>{document.querySelector('#qa-observe-fonts')?.remove();mountOrganism({activeView:'tree',...seed},theme==='forced-colors'?'light':theme);},{seed,theme});await settle();
  if(kind!=='normal')await page.evaluate(kind=>{const style=document.createElement('style');style.id='qa-observe-fonts';if(kind==='spacing')style.textContent='#tool-root,#tool-root *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}#tool-root p{margin-bottom:2em!important}';else{const fonts=[...document.querySelectorAll('#tool-root *')].map((el,index)=>{el.dataset.qaObserveFont=index;return{index,size:parseFloat(getComputedStyle(el).fontSize)};});style.textContent=fonts.map(row=>'#tool-root [data-qa-observe-font="'+row.index+'"]{font-size:'+row.size*2+'px!important}').join('');}document.head.appendChild(style);},kind);await settle();
 }
 async function activate(locator){await locator.focus();await page.keyboard.press('Enter');await settle();}
 async function capture(name,locator){await locator.scrollIntoViewIfNeeded();await settle();const file=path.join(folder,name+'.png');await locator.screenshot({path:file});result.captures.push({name,path:path.relative(root,file),sha256:sha(fs.readFileSync(file))});}


 result.scope='Rendered Taxonomy contrast checks for hero text, disclosure/comparison glyphs and selected/focused controls. Raw axe incompletes remain separate; no spoken screen-reader or full WCAG certification claim.';
 result.hero=[];result.glyphs=[];result.controls=[];
 function rgba(value){const match=value.match(/^rgba?\(([^)]+)\)$/);if(!match)throw Error('Unsupported color: '+value);const parts=match[1].split(/[ ,/]+/).filter(Boolean).map(Number);return[parts[0],parts[1],parts[2],parts.length>3?parts[3]:1];}
 function composite(f,b,alpha=1){const a=f[3]*alpha;return f.slice(0,3).map((v,i)=>v*a+b[i]*(1-a)).concat(1);}
 function luminance(c){return c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
 function ratio(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 function plainBackground(chain){let bg=[255,255,255,1];for(const s of chain.slice().reverse()){assert.equal(s.image,'none','Unexpected background image');bg=composite(rgba(s.background),bg);}return bg;}
 function noEffects(chain,allowOwnOpacity=false){return chain.every((s,i)=>(allowOwnOpacity&&i===0||Number(s.opacity)===1)&&s.filter==='none'&&s.backdrop==='none'&&s.blend==='normal'&&s.before==='none'&&s.after==='none');}
 function decodePng(bytes){let offset=8,width,height,type,depth,parts=[];while(offset<bytes.length){const length=bytes.readUInt32BE(offset),kind=bytes.toString('ascii',offset+4,offset+8),data=bytes.subarray(offset+8,offset+8+length);if(kind==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);depth=data[8];type=data[9];assert.equal(data[12],0);}if(kind==='IDAT')parts.push(data);offset+=length+12;}assert.equal(depth,8);assert([2,6].includes(type));const channels=type===6?4:3,stride=width*channels,raw=require('node:zlib').inflateSync(Buffer.concat(parts)),pixels=Buffer.alloc(height*stride);let n=0;const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};for(let y=0;y<height;y++){const filter=raw[n++];for(let x=0;x<stride;x++){const a=x>=channels?pixels[y*stride+x-channels]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;pixels[y*stride+x]=(raw[n++]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):NaN))&255;}}return{width,height,channels,pixels};}
 await page.evaluate(()=>{window.contrastStyle=function(el){const out=[];for(let node=el;node;node=node.parentElement){const s=getComputedStyle(node),before=getComputedStyle(node,'::before'),after=getComputedStyle(node,'::after');out.push({tag:node.tagName,id:node.id,class:node.className,color:s.color,background:s.backgroundColor,image:s.backgroundImage,opacity:s.opacity,filter:s.filter,backdrop:s.backdropFilter,blend:s.mixBlendMode,before:before.content,after:after.content,fontSize:s.fontSize,fontWeight:s.fontWeight,textShadow:s.textShadow,textFill:s.webkitTextFillColor,border:s.borderTopColor,borderWidth:s.borderTopWidth,outline:s.outlineColor,outlineWidth:s.outlineWidth,outlineStyle:s.outlineStyle,outlineOffset:s.outlineOffset});}return out;};});
 for(const theme of ['light','dark','contrast','forced-colors']){
  for(const width of [640,320]){
   await mount({activeView:'tree'},width,'normal',theme);
   const rows=await page.locator('.oid-hero-copy > *').evaluateAll(els=>els.map(el=>{const b=el.getBoundingClientRect(),hero=el.closest('.oid-hero').getBoundingClientRect();return{text:el.textContent,tag:el.tagName,box:{left:b.left-hero.left,right:b.right-hero.left,top:b.top-hero.top,bottom:b.bottom-hero.top},chain:contrastStyle(el)};}));
   const hero=await page.locator('.oid-hero').evaluate(el=>({chain:contrastStyle(el),box:{width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}}));
   const style=await page.addStyleTag({content:'.oid-hero > *{visibility:hidden!important}'});
   const png=await page.locator('.oid-hero').screenshot();await style.evaluate(el=>el.remove());
   const decoded=decodePng(png),min=[255,255,255],max=[0,0,0];
   // Sample the background under every text box, including blank space between glyphs.
   // This captures the browser's actual gradient interpolation rather than assuming sRGB.
   for(const row of rows)for(let y=Math.max(0,Math.floor(row.box.top));y<Math.min(decoded.height,Math.ceil(row.box.bottom));y++)for(let x=Math.max(0,Math.floor(row.box.left));x<Math.min(decoded.width,Math.ceil(row.box.right));x++){const p=(y*decoded.width+x)*decoded.channels;if(decoded.channels===4)assert.equal(decoded.pixels[p+3],255);for(let k=0;k<3;k++){min[k]=Math.min(min[k],decoded.pixels[p+k]);max[k]=Math.max(max[k],decoded.pixels[p+k]);}}
   const lower=min.map(v=>Math.max(0,v-1)),upper=max.map(v=>Math.min(255,v+1));
   const imageFile=path.join(folder,'hero-background-'+theme+'-'+width+'.png');fs.writeFileSync(imageFile,png);result.captures.push({name:'hero-background-'+theme+'-'+width,path:path.relative(root,imageFile),sha256:sha(png),diagnostic:true});
   for(const row of rows){const own=row.chain[0],fg=rgba(own.color),alpha=Number(own.opacity);const compositedLow=composite(fg,lower,alpha).map(Math.floor),compositedHigh=composite(fg,upper,alpha).map(Math.ceil);let bound;
    if(luminance(compositedLow)>=luminance(upper))bound=(luminance(compositedLow)+.05)/(luminance(upper)+.05);
    else if(luminance(compositedHigh)<=luminance(lower))bound=(luminance(lower)+.05)/(luminance(compositedHigh)+.05);
    else bound=null;
    const supported=noEffects(row.chain,true)&&own.textShadow==='none'&&own.textFill===own.color&&rows.length===3&&hero.chain[0].opacity==='1'&&row.chain.slice(0,2).every(s=>rgba(s.background)[3]===0&&s.image==='none');
    const evidence={theme,width,...row,gradient:hero.chain[0].image,backgroundMin:min,backgroundMax:max,roundedLower:lower,roundedUpper:upper,contrastLowerBound:bound,supported};result.hero.push(evidence);
    check('Hero '+row.tag+' '+row.text.slice(0,20)+' '+theme+' '+width+' contrast >=4.5',supported&&bound>=4.5,evidence);
   }
   if(process.argv.includes('--captures')&&width===640)await capture('hero-'+theme,page.locator('.oid-hero'));
  }
  for(const setup of [{view:'tree',selector:'.oid-caret:not(.oid-caret-empty)',state:'expanded'},{view:'tree',selector:'.oid-caret:not(.oid-caret-empty)',state:'collapsed-root',collapsed:{Life:true}},{view:'lookalikes',selector:'.oid-edge-arrow',state:'comparison'},{view:'learn',selector:'.oid-exp-toggle',state:'collapsed',openSection:-1},...Array.from({length:5},(_,i)=>({view:'learn',selector:'.oid-expcard:nth-child('+(i+1)+') .oid-exp-toggle',state:'expanded-'+i,openSection:i}))]){
   await mount({activeView:setup.view,collapsed:setup.collapsed,openSection:setup.openSection},640,'normal',theme);
   const rows=await page.locator(setup.selector).evaluateAll(els=>els.map(el=>({glyph:el.textContent,chain:contrastStyle(el)})));
   for(const row of rows){let bg,contrast;const supported=noEffects(row.chain,true);try{bg=plainBackground(row.chain);contrast=ratio(composite(rgba(row.chain[0].color),bg,Number(row.chain[0].opacity)),bg);}catch(error){row.unsupported=String(error);}result.glyphs.push({theme,view:setup.view,state:setup.state,...row,background:bg,contrast,supported});}
   const latest=result.glyphs.slice(-rows.length);check('Glyphs '+setup.view+' '+setup.state+' '+theme+' contrast >=3',rows.length>0&&latest.every(row=>row.supported&&row.contrast>=3),{count:rows.length,minimum:Math.min(...latest.map(row=>row.contrast||0)),unsupported:latest.filter(row=>!row.supported||row.unsupported)});
  }
  await mount({activeView:'tree'},640,'normal',theme);
  const controlSelectors=['.oid-tab.is-active','.oid-node.is-selected'];if(await page.locator('#oid-show-in-tree').count())controlSelectors.push('#oid-show-in-tree');
  for(const selector of controlSelectors){
   await page.keyboard.press('Tab');await page.locator(selector).focus();await settle();
   const row=await page.locator(selector).evaluate(el=>({selector:el.className,focused:document.activeElement===el,focusVisible:el.matches(':focus-visible'),chain:contrastStyle(el)}));
   const inside=plainBackground(row.chain),outside=plainBackground(row.chain.slice(1)),s=row.chain[0],border=rgba(s.border),outline=rgba(s.outline);const data={theme,...row,inside,outside,borderInside:ratio(border,inside),borderOutside:ratio(border,outside),focusOutside:ratio(outline,outside)};result.controls.push(data);
   check('Control border '+selector+' '+theme+' contrast >=3',noEffects(row.chain)&&parseFloat(s.borderWidth)>=1&&data.borderInside>=3&&data.borderOutside>=3,data);
   check('Focus outline '+selector+' '+theme+' contrast >=3',noEffects(row.chain)&&row.focused&&row.focusVisible&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>=2&&data.focusOutside>=3,data);
  }
 }
 check('No runtime or failed resource errors',!result.errors.length&&!result.networkFailures.length,{errors:result.errors,networkFailures:result.networkFailures});result.success=result.checks.every(row=>row.ok);if(verify&&!result.success)process.exitCode=1;
 }catch(error){result.success=false;result.harnessError=String(error);console.error(error);process.exitCode=1;}finally{if(browser){await browser.close();result.browserClosed=true;}server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));if(temp){const resolved=fs.realpathSync(temp),parent=fs.realpathSync(folder);assert(resolved.startsWith(parent+path.sep)&&path.basename(resolved).startsWith('browser-temp-'));fs.rmSync(resolved,{recursive:true,force:true});result.profileCleaned=true;}result.passed=result.checks.filter(row=>row.ok).length;result.failed=result.checks.filter(row=>!row.ok).length;fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({success:result.success,passed:result.passed,failed:result.failed,sourceSha256:result.sourceSha256}));}})();
