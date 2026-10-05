'use strict';
// Actual crypto/controller and generated handlers; only a record decrypt is held.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const Crypto=require(path.join(root,'allo_crypto_module.js'));
const Vault=require(path.join(root,'allo_device_vault_module.js'));
const copy=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const sentinel='PRIVATE_WORK_MUST_STAY_HIDDEN_AFTER_LOCK';
const host=fs.readFileSync(path.join(root,'AlloFlowANTI.txt'),'utf8').replace(/\r\n/g,'\n');
const start='const ALLO_WORKSPACE_RECOVERY = (() => {',end='\n\nconst _alloGetCanvasDeviceStorage';
const a=host.indexOf(start),b=host.indexOf(end,a);assert(a>=0&&b>a&&host.split(start).length===2);
const Recovery=new Function('window',host.slice(a,b)+'\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const held=deferred(),started=deferred();let holdRecord=false;
const cryptoApi={...Crypto,async decryptRecord(payload,dek,aad){
  if(holdRecord&&aad.includes('workspace-private')){holdRecord=false;started.resolve();await held.promise;}
  return Crypto.decryptRecord(payload,dek,aad);
}};
const repo={revision:0,store:{version:1,retentionPolicy:'standard',effectiveRetentionPolicy:'standard',legacyMigrationComplete:true,removedSnapshotIds:{},snapshots:[{version:1,id:'workspace-private',title:sentinel,savedAt:new Date().toISOString(),createdAt:new Date().toISOString(),workspace:{sourceTopic:sentinel,history:[{id:'r-private',type:'leveled-text',content:sentinel}]}}]},
 async read(){return {revision:this.revision,store:copy(this.store)};},
 async compareAndSwap(revision,next){if(revision!==this.revision)return false;this.store=copy(next);this.revision++;return true;}
};
const controller=Vault.createRecoveryVaultController({repository:repo,crypto:cryptoApi,cryptoOptions:{iterations:10000}});
const events=[],state={vault:null,store:Recovery.emptyStore()};
let handlers;
const deps={
 canvasRecoveryVaultControllerRef:{current:controller},canvasRecoveryMutationInProgressRef:{current:false},canvasRecoverySaveTokenRef:{current:0},canvasRecoveryWriteQueueRef:{current:Promise.resolve()},canvasRecoveryPendingSaveCountRef:{current:0},
 history:[],units:[],profiles:[],studentResponses:{},inputText:'',sourceTopic:'',guidedPlanBrief:null,hasMeaningfulWordSoundsWorkspace:()=>false,canvasRecoveryDecisionMade:true,
 ALLO_WORKSPACE_RECOVERY:Recovery,canvasRecoveryStoreRef:{current:state.store},
 readUnlockedCanvasRecoveryVaultStore:async c=>Recovery.normalizeStore(await c.readPlainStore()),
 emptyCanvasRecoveryVaultView:status=>Recovery.normalizeStore({version:Recovery.VERSION,retentionPolicy:status.retentionPolicy,effectiveRetentionPolicy:status.effectiveRetentionPolicy,legacyMigrationComplete:true,snapshots:[]}),
 setCanvasRecoveryStore(value){state.store=value;events.push(['store',value.snapshots.map(s=>s.title)]);},
 setCanvasRecoveryStoreAuthoritative(){},setCanvasRecoveryVaultState(value){state.vault=value;events.push(['vault',value.locked]);},setCanvasRecoverySaveStatus(){},
 publishCanvasRecoveryVaultLockedState:status=>handlers.publishCanvasRecoveryVaultLockedState(status),
 setCanvasRecoveryBusyId(){},clearCanvasWorkspaceState(){events.push(['clear']);},setLastSaved(){},setPendingSync(){},clearCanvasRecoveryVaultSecrets(){},setCanvasRecoveryDialogMode(){},setCanvasRecoveryError(value){events.push(['error',value]);}
};
const window={React:{},AlloModules:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'host_handlers_module.js'),'utf8'),{window,console,structuredClone,setTimeout,clearTimeout,Date});
handlers=window.AlloModules.HostHandlers(deps);
(async()=>{
 await controller.enableProtection('this is a strong test password');
 holdRecord=true;
 const pending=handlers.syncCanvasRecoveryVaultState(controller);
 await started.promise;
 await handlers.lockCanvasRecoveryVault();
 assert.equal((await controller.getStatus()).locked,true);
 assert.equal(state.vault.locked,true);assert.equal(state.store.snapshots.length,0);
 held.resolve();await pending;
 const result={actualCrypto:true,actualVaultController:true,actualGeneratedSyncAndLock:true,controllerLocked:(await controller.getStatus()).locked,uiLocked:state.vault.locked,plaintextAfterLock:JSON.stringify(state.store).includes(sentinel),events};
 fs.writeFileSync(path.join(__dirname,'late-vault-sync.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
 assert.equal(result.controllerLocked,true);
 // Reproduction succeeds only while the defect is present.
 assert.equal(result.uiLocked,false);assert.equal(result.plaintextAfterLock,true);
})().catch(error=>{console.error(error);process.exitCode=1;});
