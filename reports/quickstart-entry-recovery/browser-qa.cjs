'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),crypto=require('crypto');
const {chromium}=require('@playwright/test');const esbuild=require('esbuild');
const root=path.resolve(__dirname,'../..');const before=process.argv.includes('--before');const phase=before?'before':'after';
const shell=fs.readFileSync(path.join(root,'AlloFlowANTI.txt'),'utf8');
function section(a,b){const x=shell.indexOf(a),y=shell.indexOf(b,x);if(x<0||y<0)throw Error('Missing '+a);return shell.slice(x,y);}
const fresh=before?fs.readFileSync(path.join(__dirname,'start-fresh-before.txt'),'utf8'):section('  const startFreshCanvasWorkspace = () => {','\n  const refreshStorageManagerInventory');
const role=section('  const executeRoleSelect = (role) => {','  // ── Family deep link');
const helpers=section('const ALLO_WORKSPACE_RECOVERY = (() => {','\n\nconst _alloGetCanvasDeviceStorage');
const adapter=esbuild.transformSync(section('// MODULE_GATE_WATCH_START','// Thin host adapters')+section('const QuickStartWizard = React.memo','const FocusReaderOverlay =')+'\nwindow.FreshWizardAdapter=QuickStartWizard;',{loader:'jsx',target:'es2020'}).code;
const assets={
 '/react.js':fs.readFileSync(path.join(root,'desktop/web-app/node_modules/react/umd/react.production.min.js')),
 '/react-dom.js':fs.readFileSync(path.join(root,'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js')),
 '/recovery.js':fs.readFileSync(path.join(root,'view_canvas_recovery_dialog_module.js')),
 '/wizard.js':fs.readFileSync(path.join(root,'quickstart_module.js')),
};
const cssFile=fs.readdirSync(path.join(root,'app/static/css')).find(n=>n.startsWith('main.')&&n.endsWith('.css'));
assets['/app.css']=fs.readFileSync(path.join(root,'app/static/css',cssFile));
(async()=>{
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://local').pathname;if(assets[p]){res.setHeader('Content-Type',p.endsWith('.css')?'text/css':'text/javascript');res.end(assets[p]);return;}res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fresh workspace Quick Start check</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div></body></html>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true});const results=[];
 try{
 for(const config of [{name:'completed-cached',width:1280},{name:'guided-cached',guided:true,width:1280},{name:'cold-mobile',cold:true,width:320},{name:'cold-role-selection',cold:true,needsRole:true,width:1280}]){
  const page=await browser.newPage({viewport:{width:config.width,height:900}});const errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();external.push(route.request().url());return route.abort();});
  await page.goto(origin);await page.addScriptTag({url:origin+'/react.js'});await page.addScriptTag({url:origin+'/react-dom.js'});
  await page.evaluate(()=>{window.AlloModules={};window.AlloLanguageContext=React.createContext({t:key=>({'common.next':'Next','common.close':'Close','common.finish':'Finish','wizard.title':'Quick Start','storage.start_fresh':'Start a fresh workspace'}[key]||'')});});
  await page.addScriptTag({url:origin+'/recovery.js'});await page.addScriptTag({content:adapter});
  if(!config.cold)await page.addScriptTag({url:origin+'/wizard.js'});
  await page.evaluate(({fresh,role,helpers,config})=>{
   const R=React;const recovery=Function(helpers+'\nreturn ALLO_WORKSPACE_RECOVERY;')();
   const saved={id:'saved-original',title:'Previous reading',savedAt:'2026-09-19T10:00:00Z',resourceCount:1,workspace:{history:[{id:'original',type:'source',data:{text:'Preserve this exact original reading.'}}]}};
   localStorage.setItem('allo_wizard_completed','true');window.__freshEvidence={requests:0,saved};window.__alloModuleRegistry={};
   window.__alloLazyQuickStartWizard=()=>{if(window.AlloModules.QuickStartWizard||window.__alloModuleRegistry.QuickStartWizard?.status==='pending')return;window.__freshEvidence.requests++;window.__alloModuleRegistry.QuickStartWizard={status:'pending'};const script=document.createElement('script');script.src='/wizard.js';script.onload=()=>{window.__alloModuleRegistry.QuickStartWizard={status:'loaded'};window.dispatchEvent(new Event('alloflow:module-registry-changed'));};setTimeout(()=>document.head.appendChild(script),250);};
   function Host(){
    const [showWizard,setShowWizard]=R.useState(false),[wizardInitialMode,setWizardInitialMode]=R.useState('search'),[guidedMode,setGuidedMode]=R.useState(!!config.guided),[hasSelectedRole,setHasSelectedRole]=R.useState(!config.needsRole),[isTeacherMode,setIsTeacherMode]=R.useState(true),[canvasRecoveryDialogMode,setCanvasRecoveryDialogMode]=R.useState('choice'),[canvasRecoveryDecisionMade,setCanvasRecoveryDecisionMade]=R.useState(false),[revision,setCanvasRecoveryRevision]=R.useState(0);
    const canvasRecoverySaveTokenRef=R.useRef(0),canvasRecoveryPendingSaveCountRef=R.useRef(1),canvasRecoveryCurrentIdRef=R.useRef('saved-original'),canvasRecoveryStoreRef=R.useRef({snapshots:[saved]});
    const noop=()=>{};const deps={canvasRecoverySaveTokenRef,canvasRecoveryPendingSaveCountRef,canvasRecoveryCurrentIdRef,canvasRecoveryStoreRef,ALLO_WORKSPACE_RECOVERY:recovery,clearCanvasWorkspaceState:()=>setGuidedMode(false),safeRemoveItem:key=>localStorage.removeItem(key),setWizardInitialMode,setShowWizard,setPendingSync:noop,setCanvasRecoveryError:noop,setCanvasRecoveryDecisionMade,setCanvasRecoveryDialogMode,setCanvasRecoverySaveStatus:noop,setLastSaved:noop,setCanvasRecoveryRevision,addToast:noop};
    const startFreshCanvasWorkspace=Function(...Object.keys(deps),fresh+'\nreturn startFreshCanvasWorkspace;')(...Object.values(deps));
    const rd={setIsTeacherMode,setHasSelectedRole,setShowWizard,setIsParentMode:noop,setIsIndependentMode:noop,setIsStudentLinkMode:noop,setShowStudentEntry:noop,setIsAdventureStoryMode:noop,setExpandedTools:noop,setGradeLevel:noop,addToast:noop,t:()=>''};
    const selectRole=Function(...Object.keys(rd),role+'\nreturn executeRoleSelect;')(...Object.values(rd));
    R.useEffect(()=>{if(guidedMode)setShowWizard(false);},[guidedMode]);
    window.__freshEvidence.state={showWizard,wizardInitialMode,guidedMode,hasSelectedRole,isTeacherMode,revision,snapshotCount:canvasRecoveryStoreRef.current.snapshots.length,oldText:canvasRecoveryStoreRef.current.snapshots[0].workspace.history[0].data.text};
    const t=key=>({'storage.start_fresh':'Start a fresh workspace'}[key]||'');
    return R.createElement(R.Fragment,null,
     canvasRecoveryDialogMode?R.createElement(window.AlloModules.CanvasRecoveryDialogView,{isCanvas:true,t,canvasRecoveryDialogMode,canvasRecoveryDecisionMade,canvasRecoveryDialogRef:R.createRef(),canvasRecoveryStore:canvasRecoveryStoreRef.current,canvasRecoveryVaultForm:{mode:''},canvasRecoveryVaultState:{enabled:false},canvasRecoveryBusyId:null,canvasRecoveryError:'',ALLO_WORKSPACE_RECOVERY:recovery,_alloFormatWorkspaceBytes:n=>n+' bytes',startFreshCanvasWorkspace,canvasRecoveryImportInputRef:R.createRef()}):null,
     !canvasRecoveryDialogMode&&!hasSelectedRole?R.createElement('button',{onClick:()=>selectRole('teacher')},'Choose Teacher'):null,
     R.createElement(window.FreshWizardAdapter,{isOpen:showWizard&&hasSelectedRole&&isTeacherMode,onClose:()=>{setShowWizard(false);setWizardInitialMode(null);},onComplete:noop,onUpload:noop,addToast:noop,setIsHelpMode:noop,isHelpMode:false,initialSourceMode:wizardInitialMode,onInitialModeConsumed:()=>setWizardInitialMode(null)}));
   }
   ReactDOM.createRoot(document.getElementById('root')).render(R.createElement(Host));
  },{fresh,role,helpers,config});
  await page.getByRole('button',{name:'Start a fresh workspace',exact:true}).click();
  if(config.needsRole)await page.getByRole('button',{name:'Choose Teacher',exact:true}).click();
  if(!before)await page.getByRole('button',{name:'Next',exact:true}).waitFor({timeout:8000});
  else await page.waitForTimeout(700);
  const state=await page.evaluate(()=>({...window.__freshEvidence,completed:localStorage.getItem('allo_wizard_completed'),dialogText:document.body.innerText.slice(0,1200),scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
  const visible=await page.getByRole('button',{name:'Next',exact:true}).isVisible();
  if(!before){assert.equal(visible,true,config.name);assert.equal(state.completed,null);assert.equal(state.state.wizardInitialMode,null);assert.equal(state.state.oldText,'Preserve this exact original reading.');assert.equal(state.state.snapshotCount,1);assert(state.scrollWidth<=state.width+1);await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByText('Find on the Web',{exact:true}).waitFor();}
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  await page.screenshot({path:path.join(__dirname,phase+'-'+config.name+'.png'),fullPage:false});
  results.push({name:config.name,visible,...state,errors,external});console.log(config.name+': '+(visible?'wizard opened':'wizard skipped'));
  await page.close();
 }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
 fs.writeFileSync(path.join(__dirname,phase+'-browser-results.json'),JSON.stringify({phase,checkedAt:new Date().toISOString(),freshHandlerSha256:crypto.createHash('sha256').update(fresh).digest('hex'),results},null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
