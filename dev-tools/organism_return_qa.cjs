'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=process.cwd(),arg=name=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3);
const label=arg('report')||'return-final';assert(/^[a-z0-9-]+$/.test(label));
const base=path.join(root,'reports/organism-contrast-wcag'),folder=path.join(base,label);fs.mkdirSync(folder,{recursive:true});
const sourcePath=path.resolve(arg('source')||path.join(base,'final-source.js')),source=fs.readFileSync(sourcePath,'utf8');
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
const result={sourcePath:path.relative(root,sourcePath),sourceSha256:sha(source),scope:'Bounded Taxonomy explicit detail-to-tree return, lesson relationships, native activation and focus checks. Not full WCAG certification or spoken screen-reader testing.',checks:[],cases:[],focus:[],audits:[],captures:[],errors:[],networkFailures:[]};
result.inputs=['dev-tools/organism_return_qa.cjs','app/static/css/'+cssFile,'app_styles_module.js','desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','desktop/web-app/node_modules/axe-core/axe.min.js','tests/helpers/stem_focus_visibility_browser_checks.js','tests/helpers/stem_wcag_browser_checks.js'].map(file=>({path:file,sha256:sha(fs.readFileSync(file))}));
const verify=process.argv.includes('--verify'),save=()=>fs.writeFileSync(path.join(folder,'progress.json'),JSON.stringify(result,null,2));
function check(name,ok,evidence){ok=!!ok;result.checks.push({name,ok,evidence});console.log('CHECK '+name+' '+ok);save();}
const server=http.createServer((request,response)=>{const url=new URL(request.url,'http://localhost');
 if(url.pathname==='/'){response.setHeader('Content-Type','text/html');response.end(html);return;}
 if(url.pathname==='/stem_lab/stem_tool_organismid.js'){response.setHeader('Content-Type','text/javascript');response.end(source);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!['/app/static/css/','/app_styles_module.js','/desktop/web-app/node_modules/react/umd/','/desktop/web-app/node_modules/react-dom/umd/','/desktop/web-app/node_modules/axe-core/'].some(prefix=>url.pathname.startsWith(prefix))){response.writeHead(403);response.end();return;}
 fs.readFile(file,(error,bytes)=>{if(error){response.writeHead(404);response.end();return;}response.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');response.end(bytes);});});
let browser,temp;
(async()=>{await new Promise(resolve=>server.listen(process.argv.includes('--serve')?Number(arg('port')||8783):0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/';
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


 async function focusState(selector){return page.locator(selector).evaluate(el=>{const s=getComputedStyle(el),b=el.getBoundingClientRect();return{id:el.id,focused:document.activeElement===el,role:el.getAttribute('role'),selected:el.getAttribute('aria-selected'),outline:s.outlineStyle,outlineWidth:parseFloat(s.outlineWidth),inViewport:b.top>=-1&&b.top<innerHeight&&b.left>=-1&&b.right<=innerWidth+1};});}
 function visibleFocus(row){return row.focused&&row.outline!=='none'&&row.outlineWidth>=2&&row.inViewport;}
 await mount({selected:'Amanita',treeFocus:'Life',collapsed:{Life:true,Fungi:true,Animalia:true},seen:{Amanita:true}});
 await activate(page.locator('#oid-show-in-tree'));
 let returned=await focusState('#oid-node-Amanita');
 check('Returning from details reveals the hidden selection and visibly focuses its tree item',visibleFocus(returned)&&returned.role==='treeitem'&&returned.selected==='true',returned);
 check('Returning expands only ancestors and does not select or credit another organism',await page.evaluate(()=>JSON.stringify(oidData.collapsed)===JSON.stringify({Animalia:true})&&oidData.selected==='Amanita'&&JSON.stringify(oidData.seen)===JSON.stringify({Amanita:true})&&oidData.treeFocus==='Amanita'));
 await mount({selected:'Agaricales',treeFocus:'Life',collapsed:{Life:true,Fungi:true,Basidiomycota:true,Agaricales:true,Animalia:true},seen:{Amanita:true}});
 await activate(page.locator('#oid-show-in-tree'));
 returned=await focusState('#oid-node-Agaricales');
 check('Returning to a parent preserves its own collapsed children and unrelated branches',visibleFocus(returned)&&await page.evaluate(()=>JSON.stringify(oidData.collapsed)===JSON.stringify({Agaricales:true,Animalia:true})&&document.querySelector('#oid-node-Agaricales').getAttribute('aria-expanded')==='false'&&JSON.stringify(oidData.seen)===JSON.stringify({Amanita:true})),returned);
 await mount({activeView:'learn',openSection:-1});
 check('Every lesson toggle controls a stable hidden region named by that toggle',await page.evaluate(()=>[...document.querySelectorAll('.oid-exp-head')].every((button,index)=>{const panel=document.getElementById(button.getAttribute('aria-controls'));return button.id==='oid-lesson-toggle-'+index&&button.getAttribute('aria-expanded')==='false'&&panel&&panel.hidden&&panel.getAttribute('role')==='region'&&panel.getAttribute('aria-labelledby')===button.id&&!panel.textContent;})));
 await page.evaluate(()=>window.oidFirstPanel=document.querySelector('#oid-lesson-panel-0'));
 const first=page.locator('#oid-lesson-toggle-0'),second=page.locator('#oid-lesson-toggle-1');
 await first.focus();await page.keyboard.press('Space');await settle();
 check('Native Space opens the lesson and retains focus on its toggle',await page.evaluate(()=>{const button=document.querySelector('#oid-lesson-toggle-0'),panel=document.querySelector('#oid-lesson-panel-0');return document.activeElement===button&&button.getAttribute('aria-expanded')==='true'&&!panel.hidden&&panel===oidFirstPanel&&panel.textContent.length>30;}));
 await page.keyboard.press('Enter');await settle();
 check('Native Enter closes the lesson while retaining its panel and focus',await page.evaluate(()=>{const button=document.querySelector('#oid-lesson-toggle-0'),panel=document.querySelector('#oid-lesson-panel-0');return document.activeElement===button&&button.getAttribute('aria-expanded')==='false'&&panel.hidden&&panel===oidFirstPanel&&!panel.textContent;}));
 await page.keyboard.press('Space');await settle();await activate(second);
 check('Switching lessons updates both controlled panels and keeps the new toggle focused',await page.evaluate(()=>{const a=document.querySelector('#oid-lesson-toggle-0'),b=document.querySelector('#oid-lesson-toggle-1'),pa=document.querySelector('#oid-lesson-panel-0'),pb=document.querySelector('#oid-lesson-panel-1');return oidData.openSection===1&&document.activeElement===b&&a.getAttribute('aria-expanded')==='false'&&pa.hidden&&!pa.textContent&&b.getAttribute('aria-expanded')==='true'&&!pb.hidden&&pb.textContent.length>30;}));
 const lessonSnapshot=await page.locator('#oid-lesson-panel-1').ariaSnapshot(),lessonTitle=await second.locator('.oid-exp-title').textContent();
 check('Only the open lesson is exposed as a named region in the accessibility tree',(await page.getByRole('region').count())===1&&lessonSnapshot.startsWith('- region')&&lessonSnapshot.includes(lessonTitle),{snapshot:lessonSnapshot});
 if(process.argv.includes('--captures'))await capture('lesson-open',page.locator('.oid-expcard').nth(1));
 for(const kind of ['size200','spacing']){
  await mount({selected:'Amanita'},320,kind);const detail=page.locator('.oid-detail');await detail.scrollIntoViewIfNeeded();await settle();
  const layout=await page.locator('#oid-show-in-tree').evaluate((button,kind)=>{const b=button.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(button);const text=[...range.getClientRects()];return{kind,width:innerWidth,pageWidth:document.documentElement.scrollWidth,button:{left:b.left,right:b.right,height:b.height},textFits:text.every(r=>r.left>=b.left-1&&r.right<=b.right+1&&r.top>=b.top-1&&r.bottom<=b.bottom+1)};},kind);
  result.cases.push(layout);check('The new return action fits at320 with '+kind,layout.pageWidth<=321&&layout.button.left>=0&&layout.button.right<=321&&layout.button.height>=44&&layout.textFits,layout);
  if(process.argv.includes('--captures')&&kind==='size200')await capture('return-detail-320-size200',detail);
 }
 for(const theme of ['light','dark','contrast','forced-colors']){
  await mount({selected:'Amanita',collapsed:{Fungi:true},seen:{Amanita:true}},640,'normal',theme);
  await page.locator('#oid-detail-heading').focus();await page.keyboard.press('Tab');await settle();
  const action=await focusState('#oid-show-in-tree');
  if(process.argv.includes('--captures')&&theme==='dark')await capture('return-action-dark-focus',page.locator('.oid-detail'));
  await page.keyboard.press('Enter');await settle();const item=await focusState('#oid-node-Amanita');
  result.focus.push({theme,action,item});check('Sequential Tab reaches the return action and Enter returns visible focus in '+theme,visibleFocus(action)&&visibleFocus(item)&&item.selected==='true',{action,item});
 }
 check('No runtime or failed resource errors',!result.errors.length&&!result.networkFailures.length,{errors:result.errors,networkFailures:result.networkFailures});result.success=result.checks.every(row=>row.ok);if(verify&&!result.success)process.exitCode=1;
 }catch(error){result.success=false;result.harnessError=String(error);console.error(error);process.exitCode=1;}finally{if(browser){await browser.close();result.browserClosed=true;}server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));if(temp){const resolved=fs.realpathSync(temp),parent=fs.realpathSync(folder);assert(resolved.startsWith(parent+path.sep)&&path.basename(resolved).startsWith('browser-temp-'));fs.rmSync(resolved,{recursive:true,force:true});result.profileCleaned=true;}result.passed=result.checks.filter(row=>row.ok).length;result.failed=result.checks.filter(row=>!row.ok).length;fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({success:result.success,passed:result.passed,failed:result.failed,sourceSha256:result.sourceSha256}));}})();
