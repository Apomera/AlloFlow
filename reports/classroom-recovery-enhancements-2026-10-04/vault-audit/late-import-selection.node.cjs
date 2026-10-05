'use strict';
// Actual generated FileReader handler, real backup validation, held loader only.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const Crypto=require(path.join(root,'allo_crypto_module.js'));
const Vault=require(path.join(root,'allo_device_vault_module.js'));
const copy=value=>JSON.parse(JSON.stringify(value));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const readers=[],loads=[],events=[];
class ControlledReader{constructor(){readers.push(this);}readAsText(file){this.file=file;}complete(){return this.onload({target:{result:this.file.text}});}}
const state={backup:null,form:{mode:'idle'},busy:null};
const importRef={get current(){return state.backup;},set current(value){state.backup=value;events.push(['backup',value?.label||null]);}};
const deps={
 canvasRecoveryVaultImportRef:importRef,canvasRecoveryVaultState:{enabled:true,locked:true},
 _alloGetRecoveryVaultStack(){const load=deferred();loads.push(load);return load.promise;},
 setCanvasRecoveryBusyId(value){state.busy=value;events.push(['busy',value]);},
 setCanvasRecoveryVaultForm(fn){state.form=fn(state.form);},setCanvasRecoveryError(){},setCanvasRecoveryDialogMode(){},setCanvasRecoverySaveStatus(){},
};
const window={React:{},AlloModules:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'host_handlers_module.js'),'utf8'),{window,console,FileReader:ControlledReader,structuredClone,setTimeout,clearTimeout,Date});
const handlers=window.AlloModules.HostHandlers(deps);
(async()=>{
 const repo={revision:0,store:{version:1,retentionPolicy:'standard',effectiveRetentionPolicy:'standard',legacyMigrationComplete:true,removedSnapshotIds:{},snapshots:[]},async read(){return {revision:this.revision,store:copy(this.store)};},async compareAndSwap(revision,next){if(revision!==this.revision)return false;this.store=copy(next);this.revision++;return true;}};
 const vault=Vault.createRecoveryVaultController({repository:repo,crypto:Crypto,cryptoOptions:{iterations:10000}});
 await vault.enableProtection('this is a strong test password');
 const stack={vault:Vault};
 const makeInput=label=>({files:[{text:JSON.stringify({kind:Vault.BACKUP_KIND,label,vault:copy(repo.store)})}],value:label});
 const inputA=makeInput('A'),inputB=makeInput('B');
 handlers.handleCanvasRecoveryImport({currentTarget:inputA});const pendingA=readers[0].complete();
 handlers.handleCanvasRecoveryImport({currentTarget:inputB});const pendingB=readers[1].complete();
 loads[1].resolve(stack);await pendingB;
 assert.equal(state.backup.label,'B');
 loads[0].resolve(stack);await pendingA;
 const result={actualGeneratedImportHandler:true,actualCryptoAndBackupValidation:true,latestSelected:'B',finalSelected:state.backup.label,olderSelectionOverwroteNewer:state.backup.label==='A',events};
 fs.writeFileSync(path.join(__dirname,'late-import-selection.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 assert.equal(result.olderSelectionOverwroteNewer,true);
})().catch(error=>{console.error(error);process.exitCode=1;});
