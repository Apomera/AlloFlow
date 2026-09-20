'use strict';
// Actual saved-link helper + target memo + generated QR view, local assets only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'../..'),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const shell=fs.readFileSync(path.join(root,'AlloFlowANTI.txt'),'utf8');
function region(start,end){const from=shell.indexOf(start),to=shell.indexOf(end,from+start.length);assert(from>=0&&to>from,start);return shell.slice(from,to);}
const helperSource=region('function _alloBase64UrlEncode(value)','function _alloValidFirebaseConfig(config)');
const memoSource=region('  const qrShareMailbox = useMemo(() => {','  const [mbStatus, setMbStatus]');
const cssDir=path.join(root,'desktop/web-app/build/static/css'),cssName=fs.readdirSync(cssDir).filter(name=>/^main\..*\.css$/.test(name)).sort().at(-1);
const files=['view_share_session_surfaces_module.js','desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','desktop/web-app/build/static/css/'+cssName];
const bodies=Object.fromEntries(files.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]));
const hashes=Object.fromEntries(files.map(file=>[file,sha(bodies[file])]));hashes.mailboxHelperRegion=sha(helperSource);hashes.qrTargetMemoRegion=sha(memoSource);
const errors=[],externalRequests=[],scenarios=[];
async function main(){
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Saved mailbox target local check</title></head><body style="margin:0"><main id="root"></main></body></html>');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;let browser;
 try{
  browser=await chromium.launch({headless:true});
  for(const matching of [true,false]){
   const name=matching?'matching-mailbox-320':'different-mailbox-320',page=await browser.newPage({viewport:{width:320,height:900}});
   page.on('pageerror',error=>errors.push({name,message:error.message}));
   await page.route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();externalRequests.push(route.request().url());return route.abort();});
   await page.goto(origin,{waitUntil:'domcontentloaded'});await page.addStyleTag({content:bodies[files[3]]});
   for(const file of [files[1],files[2],files[0]])await page.addScriptTag({content:bodies[file]});
   await page.evaluate(({matching,helperSource,memoSource})=>{
    const boxA='https://script.google.com/macros/s/MAILBOX_A/exec',boxB='https://script.google.com/macros/s/MAILBOX_B/exec';
    const pack='PK-11111111-1111-4111-8111-111111111111',key='synthetic-pack-capability-0123456789';
    const helper=new Function('window','_alloGetConfiguredStudentBaseUrl','_alloShareHostIsNotStudentReachable',helperSource+'\nreturn { resolve: _alloResolveHostedShareMailbox, clean: _alloCleanMailboxUrl };')(window,()=>'',()=>false);
    const entry=btoa(JSON.stringify({u:boxA,id:pack,k:key})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
    const share={type:'assignment-pack-hosted',title:'Macbeth: discussion from the original class mailbox',resourceCount:1,packId:pack,packSecret:key,url:'https://student.example.invalid/?allo_mbp='+entry,expiresAt:'2099-01-01T00:00:00Z',aiPolicy:'off',sharedActivity:{activityId:'AC-11111111-1111-4111-8111-111111111111',type:'word_cloud',prompt:'How does the scene create uncertainty?'},noQr:true};
    const current={url:matching?boxA:boxB,admin:matching?'synthetic-admin-a':'synthetic-admin-b'};
    const target=new Function('useMemo','qrShareModal','mbConfig','_alloResolveHostedShareMailbox','_alloCleanMailboxUrl',memoSource+'\nreturn qrShareMailbox;')(fn=>fn(),share,current,helper.resolve,helper.clean);
    window.__target=target;window.__panels=[];
    const noop=()=>{},Icon=({size=16})=>React.createElement('svg',{width:size,height:size,viewBox:'0 0 24 24','aria-hidden':true},React.createElement('path',{d:'M6 4h12v16H6z',fill:'none',stroke:'currentColor'}));
    const props={...Object.fromEntries(['BookOpen','ClipboardList','Copy','ExternalLink','Printer','Share2','Trash2','X'].map(name=>[name,Icon])),
      SharedAssignmentActivityPanel:value=>{__panels.push({mailbox:value.mailbox,admin:value.admin});return React.createElement('p',{'data-local-teacher-panel':true},'Local activity panel fixture: validated original mailbox.');},
      addToast:noop,copyToClipboard:noop,createSelfContainedHomeworkLink:noop,homeworkQrDialogRef:React.createRef(),hostPackOnMailbox:noop,mbBusy:false,mbConfig:current,printQrSheet:noop,qrShareError:true,qrShareSvg:'',revokeHomeworkAssignment:noop,setQrShareModal:noop,t:()=>undefined,testHomeworkAsStudent:noop,qrShareModal:share,qrShareMailbox:target};
    window.__root=ReactDOM.createRoot(document.getElementById('root'));
    __root.render(React.createElement('div',{role:'dialog','aria-modal':true,'aria-labelledby':'alloflow-homework-qr-title',style:{position:'fixed',inset:0,padding:'12px',display:'flex',alignItems:'center',justifyContent:'center',background:'#e2e8f0'}},React.createElement(window.AlloModules.HomeworkQrDialogView,props)));
   },{matching,helperSource,memoSource});
   await page.getByRole('heading',{name:'Hosted homework assignment',exact:true}).waitFor();
   const summary=page.locator('summary').filter({hasText:'Manage shared'});await summary.click();
   const details=summary.locator('..');await details.scrollIntoViewIfNeeded();
   const state=await page.evaluate(()=>({target:__target,panels:__panels}));
   if(matching){assert.equal(state.panels.length,1);assert.equal(state.target.url,'https://script.google.com/macros/s/MAILBOX_A/exec');assert.equal(state.panels[0].admin,'synthetic-admin-a');assert.equal(state.panels[0].mailbox.url,state.target.url);}
   else{assert.equal(state.target,null);assert.deepEqual(state.panels,[]);assert.ok((await details.innerText()).includes('Reconnect the Class Mailbox used for this assignment'));}
   const text=await page.locator('body').innerText();assert.equal(text.includes('synthetic-admin-'),false);
   const layout=await page.evaluate(()=>{const panel=document.querySelector('[tabindex="-1"]'),bounds=panel.getBoundingClientRect();return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,panelWidth:panel.clientWidth,scrollWidth:panel.scrollWidth,left:bounds.left,right:bounds.right};});
   assert(layout.documentWidth<=320&&layout.scrollWidth<=layout.panelWidth+1&&layout.left>=0&&layout.right<=320,JSON.stringify(layout));
   await page.screenshot({path:path.join(__dirname,name+'.png')});
   scenarios.push({name,passed:true,panelInstantiated:state.panels.length===1,reconnectRequired:!matching,noAdminInDOM:true,layout});await page.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);
  for(const file of files)assert.equal(sha(fs.readFileSync(path.join(root,file),'utf8')),hashes[file],file+' changed');
  const finalShell=fs.readFileSync(path.join(root,'AlloFlowANTI.txt'),'utf8');
  for(const [start,end,expected] of [['function _alloBase64UrlEncode(value)','function _alloValidFirebaseConfig(config)',hashes.mailboxHelperRegion],['  const qrShareMailbox = useMemo(() => {','  const [mbStatus, setMbStatus]',hashes.qrTargetMemoRegion]]){const from=finalShell.indexOf(start),to=finalShell.indexOf(end,from+start.length);assert.equal(sha(finalShell.slice(from,to)),expected,'Shell region changed');}
  const result={status:'passed',checkedAt:new Date().toISOString(),browser:browser.version(),hashes,scenarios,errors,externalRequests,scope:'Actual canonical mailbox helper and target memo plus generated QR dialog; local React/CSS and a recording teacher-panel adapter. No full shell, actual activity-panel network behavior, mailbox service, authentication, upload, deployment or native screen-reader validation.'};
  fs.writeFileSync(path.join(__dirname,'target-browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{fs.writeFileSync(path.join(__dirname,'target-browser-results.json'),JSON.stringify({status:'failed',checkedAt:new Date().toISOString(),scenarios,errors,externalRequests,error:error.stack},null,2)+'\n');console.error(error);process.exitCode=1;});
