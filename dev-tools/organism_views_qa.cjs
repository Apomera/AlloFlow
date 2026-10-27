'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=process.cwd(),arg=name=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3);
const label=arg('report')||'baseline';assert(/^[a-z0-9-]+$/.test(label));
const base=path.join(root,'reports/organism-views-wcag'),folder=path.join(base,label);fs.mkdirSync(folder,{recursive:true});
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
result.inputs=['dev-tools/organism_views_qa.cjs','app/static/css/'+cssFile,'app_styles_module.js','desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','desktop/web-app/node_modules/axe-core/axe.min.js','tests/helpers/stem_focus_visibility_browser_checks.js','tests/helpers/stem_wcag_browser_checks.js'].map(file=>({path:file,sha256:sha(fs.readFileSync(file))}));
const verify=process.argv.includes('--verify'),save=()=>fs.writeFileSync(path.join(folder,'progress.json'),JSON.stringify(result,null,2));
function check(name,ok,evidence){ok=!!ok;result.checks.push({name,ok,evidence});console.log('CHECK '+name+' '+ok);save();}
const server=http.createServer((request,response)=>{const url=new URL(request.url,'http://localhost');
 if(url.pathname==='/'){response.setHeader('Content-Type','text/html');response.end(html);return;}
 if(url.pathname==='/stem_lab/stem_tool_organismid.js'){response.setHeader('Content-Type','text/javascript');response.end(source);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)||!['/app/static/css/','/app_styles_module.js','/desktop/web-app/node_modules/react/umd/','/desktop/web-app/node_modules/react-dom/umd/','/desktop/web-app/node_modules/axe-core/'].some(prefix=>url.pathname.startsWith(prefix))){response.writeHead(403);response.end();return;}
 fs.readFile(file,(error,bytes)=>{if(error){response.writeHead(404);response.end();return;}response.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');response.end(bytes);});});
let browser,temp;
(async()=>{await new Promise(resolve=>server.listen(process.argv.includes('--serve')?Number(arg('port')||8781):0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/';
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

 const views=['tree','groups','lookalikes','learn','photo'];
 for(const view of views)for(const [width,kind] of [[320,'normal'],[320,'size200'],[320,'spacing'],[640,'size200']]){
  await mount({activeView:view},width,kind);
  const row=await page.evaluate(({view,kind})=>{
   const root=document.querySelector('#tool-root'),range=document.createRange(),outside=[],clipped=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
   while(node=walker.nextNode()){
    const el=node.parentElement;if(!node.textContent.trim()||!el.getClientRects().length||el.closest('.sr-only,[hidden],[aria-hidden=true],style,script,svg,option'))continue;
    range.selectNodeContents(node);const rects=[...range.getClientRects()].filter(b=>b.width&&b.height),box=el.getBoundingClientRect();
    if(/[\p{L}\p{N}]/u.test(node.textContent)&&rects.some(b=>b.left<box.left-2||b.right>box.right+2))outside.push({text:node.textContent.trim(),class:el.className,tag:el.tagName,box:{left:box.left,right:box.right},rects:rects.map(b=>({left:b.left,right:b.right}))});
    for(let p=el;p&&p!==root.parentElement;p=p.parentElement){const s=getComputedStyle(p),b=p.getBoundingClientRect();if(/hidden|clip/.test(s.overflow)&&rects.some(r=>r.left<b.left-2||r.right>b.right+2||r.top<b.top-2||r.bottom>b.bottom+2)){clipped.push({text:node.textContent.trim(),ancestor:p.className});break;}}
   }
   const scrollers=[...root.querySelectorAll('*')].filter(el=>el.clientWidth&&el.scrollWidth>el.clientWidth+2&&/auto|scroll/.test(getComputedStyle(el).overflowX)).map(el=>({class:el.className,client:el.clientWidth,scroll:el.scrollWidth}));
   return{view,width:innerWidth,kind,scroll:document.documentElement.scrollWidth,outside,clipped,scrollers};
  },{view,kind});
  result.cases.push(row);check(view+' '+width+' '+kind+' reflows without lost text or horizontal reading',row.scroll<=width+1&&!row.outside.length&&!row.clipped.length&&!row.scrollers.length,row);
  if(process.argv.includes('--captures')&&width===320&&kind==='size200'){
   await capture(view+'-320-size200',page.locator('#oid-view-panel'));
   if(view==='tree'){await page.locator('.oid-treewrap').evaluate(el=>el.scrollIntoView({block:'start'}));await settle();const file=path.join(folder,'tree-320-size200-viewport.png');await page.screenshot({path:file});result.captures.push({name:'tree-320-size200-viewport',path:path.relative(root,file),sha256:sha(fs.readFileSync(file))});}
  }
 }
 await mount({activeView:'tree'});
 if(typeof page.locator('[role=tree]').ariaSnapshot==='function'){
  const snapshot=await page.locator('[role=tree]').ariaSnapshot();const file=path.join(folder,'tree-aria-snapshot.yml');fs.writeFileSync(file,snapshot);result.treeSnapshot={path:path.relative(root,file),sha256:sha(snapshot)};
  const stack=[],ownership=[];for(const line of snapshot.split('\n')){const match=line.match(/^(\s*)- ['"]?(treeitem|group)\b/);if(!match)continue;const indent=match[1].length;while(stack.length&&stack.at(-1).indent>=indent)stack.pop();if(match[2]==='group')ownership.push({owner:stack.at(-1)?.role||null,line:line.trim()});stack.push({indent,role:match[2]});}
  result.treeSnapshot.groups=ownership;check('The browser accessibility tree places each child group beneath its tree item',ownership.length>0&&ownership.every(group=>group.owner==='treeitem'),ownership);
 }
 const groups=await page.locator('[role=tree]').evaluate(tree=>[...tree.querySelectorAll('[role=group]')].map(group=>{const owner=group.closest('[role=treeitem]')||[...tree.querySelectorAll('[role=treeitem][aria-owns]')].find(item=>(item.getAttribute('aria-owns')||'').split(/\s+/).includes(group.id));return{owner:owner?.id||null,groupId:group.id,childCount:group.querySelectorAll(':scope > [role=treeitem],:scope > li > [role=treeitem],:scope > li > div > [role=treeitem]').length};}));
 check('Nested tree groups belong to their tree item through nesting or ownership',groups.length>0&&groups.every(group=>group.owner),groups);
 check('The tree exposes its visible keyboard instructions as a description',await page.locator('[role=tree]').evaluate(tree=>{const help=document.getElementById('oid-tree-help');return!!help&&(tree.getAttribute('aria-describedby')||'').split(/\s+/).includes(help.id)&&help.getBoundingClientRect().height>0&&/Up.*Down/i.test(help.textContent)&&/Enter.*Space/i.test(help.textContent);}));
 const names=await page.locator('[role=treeitem]').evaluateAll(items=>items.map(item=>{const ids=(item.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean);return{id:item.id,labels:ids.map(id=>({id,text:document.getElementById(id)?.textContent,inside:item.contains(document.getElementById(id))})),position:Number(item.getAttribute('aria-posinset')),size:Number(item.getAttribute('aria-setsize'))};}));
 check('Tree items expose only their own labels and sibling position',names.length>0&&names.every(item=>item.labels.length>=2&&item.labels.every(label=>label.text&&label.inside)&&item.position>=1&&item.size>=item.position),names);
 const treeItems=await page.locator('[role=treeitem]').count();
 await page.locator('[role=treeitem][tabindex="0"]').focus();await page.keyboard.press('Home');await settle();
 let treeFocus=await page.evaluate(()=>({id:document.activeElement.id,text:document.activeElement.textContent,selected:oidData.selected,role:document.activeElement.getAttribute('role'),tabStops:document.querySelectorAll('[role=treeitem][tabindex="0"]').length}));
 check('Home focuses the first tree item with one sequential tree stop',treeFocus.role==='treeitem'&&treeFocus.tabStops===1&&/Life/.test(treeFocus.text),treeFocus);
 const selectionBefore=await page.locator('[role=treeitem][aria-selected="true"]').getAttribute('id');
 await page.keyboard.press('ArrowDown');await settle();
 treeFocus=await page.evaluate(()=>({id:document.activeElement.id,selectedId:document.querySelector('[role=treeitem][aria-selected="true"]')?.id,role:document.activeElement.getAttribute('role'),tabStops:document.querySelectorAll('[role=treeitem][tabindex="0"]').length}));
 check('Arrows move tree focus without changing selection',treeFocus.role==='treeitem'&&treeFocus.tabStops===1&&treeFocus.selectedId===selectionBefore,treeFocus);
 await page.keyboard.press('Enter');await settle();
 check('Enter selects the focused tree item without losing keyboard focus',await page.evaluate(()=>document.activeElement.getAttribute('role')==='treeitem'&&document.activeElement.getAttribute('aria-selected')==='true'));
 const selectedBeforeCaret=await page.locator('[role=treeitem][aria-selected="true"]').getAttribute('id');
 const selectedStateBeforeCaret=await page.evaluate(()=>oidData.selected);
 const caret=page.locator('.oid-caret').filter({hasText:'▾'}).first();
 await caret.click();await settle();
 check('Clicking a tree disclosure leaves focus on an exposed tree item',await page.evaluate(()=>document.activeElement.getAttribute('role')==='treeitem'&&!document.activeElement.closest('[aria-hidden=true]')));
 check('Pointer collapse preserves the selected organism and exposes the collapsed state',await page.evaluate(selected=>oidData.selected===selected,selectedStateBeforeCaret)&&await page.locator('[role=treeitem]').first().getAttribute('aria-expanded')==='false');
 await page.locator('.oid-caret').filter({hasText:'▸'}).first().click();await settle();
 check('Pointer expansion retains owner focus and restores the selected organism',await page.evaluate(selected=>document.activeElement.getAttribute('role')==='treeitem'&&document.activeElement.getAttribute('aria-expanded')==='true'&&document.querySelector('[role=treeitem][aria-selected=true]')?.id===selected,selectedBeforeCaret));
 await page.addScriptTag({url:url+'desktop/web-app/node_modules/axe-core/axe.min.js'});
 const {auditFocusVisibility}=await import('../tests/helpers/stem_focus_visibility_browser_checks.js');
 for(const theme of ['light','dark','contrast','forced-colors']){
  for(const view of views){
   await mount({activeView:view},640,'normal',theme);
   const audit=await page.evaluate(async({view,theme})=>{const data=await axe.run('#tool-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return{view,theme,violations:data.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary}))})),incomplete:data.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary}))}))};},{view,theme});
   result.audits.push(audit);check(view+' '+theme+' has no confirmed automated violations',!audit.violations.length,audit.violations);
  }
  for(const view of ['tree','learn']){
   await mount({activeView:view,openSection:-1},640,'normal',theme);const focus=await auditFocusVisibility(page,{maxSteps:120});result.focus.push({view,theme,...focus});check(view+' controls have visible sequential focus in '+theme,!focus.failures.length&&!focus.unreached.length,{traversed:focus.traversed,candidates:focus.candidates,failures:focus.failures,unreached:focus.unreached});
  }
 }
 check('No runtime or failed resource errors',!result.errors.length&&!result.networkFailures.length,{errors:result.errors,networkFailures:result.networkFailures});result.success=result.checks.every(row=>row.ok);if(verify&&!result.success)process.exitCode=1;
 }catch(error){result.success=false;result.harnessError=String(error);console.error(error);process.exitCode=1;}finally{if(browser){await browser.close();result.browserClosed=true;}server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));if(temp){const resolved=fs.realpathSync(temp),parent=fs.realpathSync(folder);assert(resolved.startsWith(parent+path.sep)&&path.basename(resolved).startsWith('browser-temp-'));fs.rmSync(resolved,{recursive:true,force:true});result.profileCleaned=true;}result.passed=result.checks.filter(row=>row.ok).length;result.failed=result.checks.filter(row=>!row.ok).length;fs.writeFileSync(path.join(folder,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({success:result.success,passed:result.passed,failed:result.failed,sourceSha256:result.sourceSha256}));}})();
