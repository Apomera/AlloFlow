'use strict';
// Actual callers, with controlled sync replies. Generated local calls execute
// the actual sync handler and retire its owner during status completion.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),label=process.argv[2]||'current';
const read=file=>fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const sourcePath=process.env.VAULT_CALLER_SOURCE||path.join(label==='candidate'?__dirname:root,label==='candidate'?'candidate-with-callers-source.jsx':'host_handlers_source.jsx');
const source=read(sourcePath);
let modulePath=process.env.VAULT_CALLER_MODULE||path.join(root,'host_handlers_module.js'),generated;
if(label==='candidate'&&!process.env.VAULT_CALLER_MODULE){generated=require(path.join(root,'_build_first_wave_view_modules.js')).buildFirstWaveModule('HostHandlers',source);modulePath=path.join(__dirname,'candidate-with-callers-module.js');fs.writeFileSync(modulePath,generated);}else generated=read(modulePath);
const Crypto=require(path.join(root,'allo_crypto_module.js')),Vault=require(path.join(root,'allo_device_vault_module.js'));
const host=read(path.join(root,'AlloFlowANTI.txt')),start='const ALLO_WORKSPACE_RECOVERY = (() => {',a=host.indexOf(start),b=host.indexOf('\n\nconst _alloGetCanvasDeviceStorage',a);assert(a>=0&&b>a&&host.split(start).length===2);
const Recovery=new Function('window',host.slice(a,b)+'\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const copy=x=>x==null?x:JSON.parse(JSON.stringify(x));
const names=['refreshStorageManagerInventory','commitCanvasRecoveryVaultEnable','confirmCanvasRecoveryCode','recoverCanvasRecoveryVault','importCanvasRecoveryVaultBackup','setStorageRetentionPolicy','setCanvasRecoverySnapshotPinned','removeCanvasRecoverySnapshotMedia','retryCanvasRecoveryStorage','eraseCanvasRecoverySnapshot','unlockCanvasRecoveryVault','removeCanvasRecoveryKey'];
function section(name){const start='const '+name+' =',a=source.indexOf(start),b=source.indexOf('\nconst ',a+start.length);assert(a>=0&&b>a&&source.split(start).length===2,name);return source.slice(a,b);}
function plain(title='stored'){return Recovery.normalizeStore({version:1,retentionPolicy:'standard',effectiveRetentionPolicy:'standard',legacyMigrationComplete:true,snapshots:[{version:1,id:'workspace-private',title,createdAt:new Date().toISOString(),savedAt:new Date().toISOString(),workspace:{sourceTopic:title,history:[{id:'r',type:'leveled-text',content:'retained text'}],wordSoundsState:{audioLibrary:{demo:'data:audio/wav;base64,QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFB'}}}}]});}
let seed;
function make(mode,name,retired){
 const initial=plain('initial'),syncedStore=plain('current synced'),events=[];
 const state={errors:[],toasts:[],secrets:[],dialogs:[],stores:[],clears:0,revisions:0,prefs:[],inventory:{loading:false},statuses:[]};
 const deps={canvasRecoveryMutationInProgressRef:{current:false},canvasRecoveryVaultSyncRequestRef:{current:null},canvasRecoveryVaultActionRequestRef:{current:null},canvasRecoveryVaultControllerRef:{current:null},canvasRecoverySaveTokenRef:{current:0},canvasRecoveryWriteQueueRef:{current:Promise.resolve()},canvasRecoveryPendingSaveCountRef:{current:0},canvasRecoveryCurrentIdRef:{current:'workspace-private'},canvasRecoveryStoreRef:{current:initial},canvasRecoveryDecisionMade:false,
 canvasRecoveryVaultState:{enabled:true,locked:false},canvasRecoveryVaultPendingActionRef:{current:{action:'rotate'}},canvasRecoveryVaultImportRef:{current:{kind:Vault.BACKUP_KIND,vault:copy(seed)}},canvasRecoveryVaultForm:{password:'strong test password',currentPassword:'strong test password',recoveryInput:'recovery-input',newPassword:'new password longer than ten',confirmNewPassword:'new password longer than ten',recoveryCode:'code',recoveryConfirmation:'code',backupUseRecoveryKey:false},
 ALLO_WORKSPACE_RECOVERY:Recovery,ALLO_WORKSPACE_RECOVERY_NAMESPACE:'workspace-recovery',ALLO_WORKSPACE_RECOVERY_KEY:'store',ALLO_STORAGE_RETENTION_POLICY_KEY:'retention-policy',
 history:[],isCanvas:true,storageManagerRefreshTokenRef:{current:0},storageManagerInventory:{deviceEstimate:{usage:1023,quota:1024},origin:{usage:1023,quota:1024}},
 refreshAlloModelStatus(){},ALLO_PDF_REMEDIATION_CACHE:{listSummaries:()=>[]},setPdfRemediationCacheEntries(){},
 ALLO_STORAGE_INVENTORY:{collectOriginFacts:async()=>({usage:1023,quota:1024}),collectLocalStorage:()=>({}),collectIdbKeyval:async()=>({}),mergeSummaries:()=>({})},
 queueCanvasRecoveryStorage:async operation=>operation(),
 syncCanvasRecoveryVaultState:async()=>retired?{status:null,store:null,stale:true}:{status:{enabled:true,locked:false,snapshotCount:1},store:syncedStore},
 readUnlockedCanvasRecoveryVaultStore:async()=>syncedStore,
 setCanvasRecoveryBusyId:value=>events.push(['busy',value]),setCanvasRecoveryError:value=>state.errors.push(value),setCanvasRecoveryErrorCode(){},setCanvasRecoverySaveStatus:value=>state.statuses.push(value),
 setCanvasRecoveryStore:value=>state.stores.push(value),setCanvasRecoveryStoreAuthoritative(){},setCanvasRecoveryVaultState(){},setCanvasRecoveryDecisionMade:value=>events.push(['decision',value]),
 setCanvasRecoveryDialogMode:value=>state.dialogs.push(value),setCanvasRecoveryRevision:fn=>{state.revisions=fn(state.revisions);},setStorageManagerInventory:value=>{state.inventory=typeof value==='function'?value(state.inventory):value;},
 setCanvasRecoveryEraseId(){},setCanvasRecoveryRemoveMediaId(){},setLastSaved(){},setPendingSync(){},
 clearCanvasRecoveryVaultSecrets:value=>state.secrets.push(value),addToast:(message,type)=>state.toasts.push([message,type]),clearCanvasWorkspaceState:()=>{state.clears++;},warnLog(){},t:()=>'',
 storageDB:{del:async()=>{}},emptyCanvasRecoveryVaultView:()=>Recovery.emptyStore(),publishCanvasRecoveryVaultLockedState:()=>{throw Error('unexpected lock');},
 };
 const controller={locks:0,async getStatus(){if(retired&&(name==='unlockCanvasRecoveryVault'||name==='removeCanvasRecoveryKey'))deps.canvasRecoveryVaultSyncRequestRef.current=null;return {enabled:true,locked:false,snapshotCount:1,retentionPolicy:'standard',effectiveRetentionPolicy:'standard'};},lock(){this.locks++;},
 enableProtection:async()=>({enabled:true}),recoverWithKey:async()=>({recovered:true}),unlock:async()=>({unlocked:true}),confirmRecoveryCode:()=>true,rotateRecoveryKey:async()=>({rotated:true}),importEncryptedBackup:async()=>({imported:true}),
 setPolicy:async()=>({changed:true}),setPinned:async()=>({changed:true}),restoreSnapshot:async()=>copy(initial.snapshots[0]),upsertSnapshot:async()=>({saved:true}),deleteSnapshot:async()=>({deleted:true}),removeRecoveryKey:async()=>({removed:true})};
 deps.canvasRecoveryVaultControllerRef.current=controller;deps.getCanvasRecoveryVaultController=async()=>controller;
 deps._alloGetRecoveryVaultStack=async()=>({vault:Vault});
 deps._alloGetCanvasDeviceStorage=async()=>({get:async()=>copy(seed),namespaces:async()=>[],estimate:async()=>({usage:1023,quota:1024}),remove:async()=>{}});
 if(name==='refreshStorageManagerInventory'){initial.retentionPolicy='automatic';initial.effectiveRetentionPolicy='standard';}
 const window={React:{},AlloModules:{},confirm:()=>true,idbKeyval:{}};
 const localStorage={setItem:(key,value)=>state.prefs.push([key,value])};
 let handlers;
 if(mode==='source'){
  const stubs="const syncCanvasRecoveryVaultState=__d.syncCanvasRecoveryVaultState;\n"+(name==='refreshStorageManagerInventory'?'':'const refreshStorageManagerInventory=async()=>{};\n')+(name==='confirmCanvasRecoveryCode'?'const commitCanvasRecoveryVaultEnable=async()=>{};\n':'');
  handlers=new Function('__d','window','localStorage','navigator',stubs+section(name)+'\nreturn {'+name+'};')(deps,window,localStorage,{});
 }else{vm.runInNewContext(generated,{window,console:{log(){},error:console.error},localStorage,navigator:{},structuredClone,setTimeout,clearTimeout,Date});handlers=window.AlloModules.HostHandlers(deps);}
 return {deps,state,handlers,controller,initial,syncedStore,events};
}
function args(name){return name==='commitCanvasRecoveryVaultEnable'?['strong test password',null]:name==='setStorageRetentionPolicy'?['standard']:name==='setCanvasRecoverySnapshotPinned'?['workspace-private',true]:['removeCanvasRecoverySnapshotMedia','eraseCanvasRecoverySnapshot'].includes(name)?['workspace-private']:[];}
function verifyCurrent(h,name){
 assert.equal(h.state.errors.filter(Boolean).length,0,'no current error');
 if(['commitCanvasRecoveryVaultEnable','confirmCanvasRecoveryCode','recoverCanvasRecoveryVault','importCanvasRecoveryVaultBackup','setStorageRetentionPolicy','setCanvasRecoverySnapshotPinned','removeCanvasRecoverySnapshotMedia','eraseCanvasRecoverySnapshot','removeCanvasRecoveryKey'].includes(name))assert(h.state.toasts.length>0,'current success feedback');
 if(['setStorageRetentionPolicy','setCanvasRecoverySnapshotPinned','removeCanvasRecoverySnapshotMedia','eraseCanvasRecoverySnapshot'].includes(name)){assert.equal(h.deps.canvasRecoveryStoreRef.current,h.syncedStore,'current store published');assert(h.state.stores.length>0);}
 if(name==='unlockCanvasRecoveryVault'){assert.equal(h.state.dialogs.at(-1),'choice');assert.equal(h.state.secrets.at(-1),'idle');}
 if(name==='retryCanvasRecoveryStorage'){assert.equal(h.state.statuses.at(-1),'saved');assert.equal(h.state.dialogs.at(-1),'choice');}
 if(name==='eraseCanvasRecoverySnapshot')assert.equal(h.state.clears,1,'current active erase clears workspace');
 if(name==='confirmCanvasRecoveryCode')assert.equal(h.deps.canvasRecoveryVaultPendingActionRef.current,null);
 if(name==='importCanvasRecoveryVaultBackup')assert.equal(h.deps.canvasRecoveryVaultImportRef.current,null);
 if(name==='refreshStorageManagerInventory'){assert.equal(h.state.inventory.loading,false);assert.equal(h.deps.canvasRecoveryStoreRef.current,h.syncedStore);assert.equal(h.state.revisions,1);}
}
(async()=>{
 const repo={revision:0,store:plain('seed'),async read(){return {revision:this.revision,store:copy(this.store)};},async compareAndSwap(revision,next){if(revision!==this.revision)return false;this.store=copy(next);this.revision++;return true;}};
 await Vault.createRecoveryVaultController({repository:repo,crypto:Crypto,cryptoOptions:{iterations:10000}}).enableProtection('strong test password');seed=copy(repo.store);
 const results=[];
 for(const mode of ['source','generated'])for(const name of names)for(const retired of [true,false]){
  const h=make(mode,name,retired);
  try{await h.handlers[name](...args(name));await new Promise(setImmediate);
   if(retired){assert.equal(h.deps.canvasRecoveryStoreRef.current,h.initial,'retired sync preserves current store');assert.equal(h.state.errors.filter(Boolean).length,0,'retired sync does not become a current error');assert.equal(h.state.toasts.length,0,'retired sync cannot publish success');assert.equal(h.state.dialogs.length,0,'retired sync cannot reopen a dialog');assert.equal(h.state.secrets.length,0,'retired sync cannot clear newer secrets');assert.equal(h.state.clears,0,'retired sync cannot clear active workspace');assert.equal(h.state.revisions,0,'retired sync cannot publish a revision');assert.equal(h.state.prefs.length,0,'retired sync cannot publish a preference');if(name==='refreshStorageManagerInventory')assert.equal(h.state.inventory.loading,false,'inventory still completes');}
   else verifyCurrent(h,name);
   results.push({mode,name,retired,passed:true});
  }catch(error){results.push({mode,name,retired,passed:false,error:String(error.stack||error)});}
 }
 const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),failed=results.filter(r=>!r.passed);
 const report={label,completedAt:new Date().toISOString(),passed:failed.length===0,total:results.length,failed:failed.length,sourcePath,modulePath,sourceSha256:hash(sourcePath),moduleSha256:hash(modulePath),actualCallerBodies:true,allSyncCallSitesCovered:names,controlledBoundaries:['sync result or status-time retirement','controller/storage acknowledgements','inventory facts'],results};
 fs.writeFileSync(path.join(__dirname,label+'-callers.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({label,total:report.total,failed:report.failed,failedNames:failed.map(r=>r.mode+': '+r.name+' '+(r.retired?'retired':'current'))}));if(failed.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
