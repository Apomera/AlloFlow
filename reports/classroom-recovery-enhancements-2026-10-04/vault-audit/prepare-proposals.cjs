'use strict';
// Writes report-local candidate and exact operations only. Never writes production.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const source=fs.readFileSync(path.join(root,'host_handlers_source.jsx'),'utf8').replace(/\r\n/g,'\n');
const operations=[];
function replaceSection(name,next){const start='const '+name+' =',a=source.indexOf(start),b=source.indexOf('\nconst ',a+start.length);assert(a>=0&&b>a&&source.split(start).length===2);operations.push({name,before:source.slice(a,b),after:next.trim()});}
replaceSection('syncCanvasRecoveryVaultState',String.raw`
const syncCanvasRecoveryVaultState = async (controller, options = {}) => {
      const request = {};
      __d.canvasRecoveryVaultSyncRequestRef.current = request;
      const isCurrent = () => __d.canvasRecoveryVaultSyncRequestRef.current === request
          && __d.canvasRecoveryVaultControllerRef.current === controller;
      const stale = () => ({ status: null, store: null, stale: true });
      let status;
      try {
          status = await controller.getStatus();
      } catch (error) {
          if (!isCurrent()) return stale();
          throw error;
      }
      if (!isCurrent()) return stale();
      if (status.enabled && !status.locked && options.loadPlaintext !== false) {
          try {
              const store = await __d.readUnlockedCanvasRecoveryVaultStore(controller);
              if (!isCurrent()) return stale();
              const latestStatus = await controller.getStatus();
              if (!isCurrent()) return stale();
              if (!latestStatus.enabled || latestStatus.locked) {
                  if (latestStatus.enabled && latestStatus.locked) __d.publishCanvasRecoveryVaultLockedState(latestStatus);
                  return { status: latestStatus, store: null, stale: true };
              }
              __d.canvasRecoveryStoreRef.current = store;
              __d.setCanvasRecoveryStore(store);
              __d.setCanvasRecoveryStoreAuthoritative(true);
              __d.setCanvasRecoveryVaultState({ available: true, ...latestStatus });
              return { status: latestStatus, store };
          } catch (error) {
              if (!isCurrent()) return stale();
              controller.lock();
              __d.publishCanvasRecoveryVaultLockedState({ ...status, locked: true });
              throw error;
          }
      }
      if (!isCurrent()) return stale();
      if (status.enabled && status.locked) __d.publishCanvasRecoveryVaultLockedState(status);
      else __d.setCanvasRecoveryVaultState({ available: true, ...status });
      return { status, store: null };
  };`);
replaceSection('handleCanvasRecoveryImport',String.raw`
const handleCanvasRecoveryImport = (event) => {
      const input = event?.currentTarget || event?.target;
      const file = input?.files?.[0];
      if (!file) return;
      const request = { input, file, generation: __d.workspaceReplacementGenerationRef.current };
      __d.canvasRecoveryImportRequestRef.current = request;
      const isCurrent = () => __d.canvasRecoveryImportRequestRef.current === request
          && __d.workspaceReplacementGenerationRef.current === request.generation
          && input?.files?.[0] === file;
      const finish = () => {
          if (!isCurrent()) return;
          __d.canvasRecoveryImportRequestRef.current = null;
          __d.setCanvasRecoveryBusyId(null);
          if (input) input.value = '';
      };
      const fail = (error) => {
          if (!isCurrent()) return;
          __d.setCanvasRecoveryError(String(error?.message || 'The project file could not be read.'));
          __d.setCanvasRecoverySaveStatus('error');
          finish();
      };
      __d.setCanvasRecoveryBusyId('import-read');
      let reader;
      try {
          reader = new FileReader();
          reader.onload = async (loadEvent) => {
              if (!isCurrent()) return;
              try {
                  const parsed = JSON.parse(String(loadEvent?.target?.result || ''));
                  const vaultStack = await __d._alloGetRecoveryVaultStack();
                  if (!isCurrent()) return;
                  if (parsed && parsed.kind === vaultStack.vault.BACKUP_KIND) {
                      vaultStack.vault.validateVaultStore(parsed.vault);
                      __d.canvasRecoveryVaultImportRef.current = parsed;
                      __d.setCanvasRecoveryVaultForm(current => ({
                          ...current, mode: 'import-backup', password: '', recoveryInput: '',
                          newPassword: '', confirmNewPassword: '', backupUseRecoveryKey: false
                      }));
                      __d.setCanvasRecoveryError('');
                      __d.setCanvasRecoveryDialogMode(__d.canvasRecoveryVaultState.locked ? 'vault-locked' : 'manage');
                      return;
                  }
                  if (__d.canvasRecoveryVaultState.enabled && __d.canvasRecoveryVaultState.locked) {
                      throw new Error('Unlock protected recovery workspaces before importing a readable project file.');
                  }
                  if (parsed && Object.prototype.hasOwnProperty.call(parsed, 'workspaceRecovery')) {
                      if (!__d.ALLO_WORKSPACE_RECOVERY.isSupportedPayload(parsed.workspaceRecovery)) {
                          throw new Error('This recovery file was created by a newer AlloFlow version.');
                      }
                      const recovered = __d.ALLO_WORKSPACE_RECOVERY.normalizeSnapshot(parsed.workspaceRecovery);
                      if (!recovered) throw new Error('This recovery file does not contain a valid workspace.');
                      const imported = {
                          ...recovered,
                          id: __d.ALLO_WORKSPACE_RECOVERY.newId(),
                          title: (recovered.title + ' (imported)').slice(0, 160),
                          createdAt: new Date().toISOString(),
                          savedAt: new Date().toISOString()
                      };
                      // Hand ownership to the restore before it advances the workspace generation.
                      finish();
                      await restoreCanvasWorkspaceSnapshot(imported);
                      return;
                  }
                  // Older teacher/student project files use the established importer.
                  finish();
                  __d.handleLoadProject({ target: { files: [file] } });
              } catch (error) {
                  if (!isCurrent()) return;
                  __d.setCanvasRecoveryError(String(error?.message || 'The project file could not be imported.'));
                  __d.setCanvasRecoverySaveStatus('error');
              } finally {
                  finish();
              }
          };
          reader.onerror = () => fail(new Error('The project file could not be read.'));
          reader.readAsText(file);
      } catch (error) {
          fail(error);
      }
  };`);
const lockStart='const lockCanvasRecoveryVault = async () => {\n      const controller = __d.canvasRecoveryVaultControllerRef.current;\n      if (!controller || __d.canvasRecoveryMutationInProgressRef.current) return;';
operations.push({name:'retire-sync-before-lock',before:lockStart,after:lockStart+'\n      __d.canvasRecoveryVaultSyncRequestRef.current = null;'});
const publishStart='const publishCanvasRecoveryVaultLockedState = (status = {}) => {';
operations.push({name:'retire-sync-on-locked-publish',before:publishStart,after:publishStart+'\n      __d.canvasRecoveryVaultSyncRequestRef.current = null;'});
let candidate=source;
for(const op of operations){assert.equal(candidate.split(op.before).length,2,op.name);candidate=candidate.replace(op.before,op.after);}
fs.writeFileSync(path.join(__dirname,'operations.json'),JSON.stringify(operations,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'candidate-host-handlers-source.jsx'),candidate);
console.log(JSON.stringify({operations:operations.map(o=>o.name),productionWritten:false}));
