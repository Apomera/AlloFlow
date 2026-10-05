'use strict';
// Report-local only. Apply after caller-operations; no vault/CAS format changes.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'candidate-with-callers-source.jsx'),'utf8').replace(/\r\n/g,'\n');
const operations=[];
function replaceSection(name,next){const start='const '+name+' =',a=source.indexOf(start),b=source.indexOf('\nconst ',a+start.length);assert(a>=0&&b>a&&source.split(start).length===2);operations.push({name:'vault-action:'+name,before:source.slice(a,b),after:next.trim()});}
replaceSection('unlockCanvasRecoveryVault',String.raw`
const unlockCanvasRecoveryVault = async () => {
      const password = __d.canvasRecoveryVaultForm.password;
      if (!password) return;
      const request = {};
      __d.canvasRecoveryVaultActionRequestRef.current = request;
      __d.canvasRecoveryVaultSyncRequestRef.current = null;
      let controller = null;
      const ownsAction = () => __d.canvasRecoveryVaultActionRequestRef.current === request;
      const isCurrent = () => ownsAction()
          && (!controller || __d.canvasRecoveryVaultControllerRef.current === controller);
      __d.setCanvasRecoveryBusyId('vault-unlock');
      try {
          controller = await __d.getCanvasRecoveryVaultController();
          if (!isCurrent()) return;
          await controller.unlock(password);
          if (!isCurrent()) return;
          const synced = await syncCanvasRecoveryVaultState(controller);
          if (!isCurrent() || synced.stale) return;
          const { store } = synced;
          __d.clearCanvasRecoveryVaultSecrets('idle');
          __d.setCanvasRecoveryError('');
          __d.setCanvasRecoverySaveStatus(store?.snapshots?.length ? 'saved' : 'idle');
          if (!__d.canvasRecoveryDecisionMade && store?.snapshots?.length) __d.setCanvasRecoveryDialogMode('choice');
          else __d.setCanvasRecoveryDialogMode('manage');
      } catch (error) {
          if (!isCurrent()) return;
          __d.clearCanvasRecoveryVaultSecrets('unlock');
          __d.setCanvasRecoveryError('That password could not unlock the protected recovery workspaces.');
      } finally {
          if (ownsAction()) {
              __d.canvasRecoveryVaultActionRequestRef.current = null;
              __d.setCanvasRecoveryBusyId(null);
          }
      }
  };`);
replaceSection('recoverCanvasRecoveryVault',String.raw`
const recoverCanvasRecoveryVault = async () => {
      const form = __d.canvasRecoveryVaultForm;
      if (!form.recoveryInput || !form.newPassword || form.newPassword.length < 10) {
          __d.setCanvasRecoveryError('Enter the complete recovery key and a new password of at least 10 characters.');
          return;
      }
      if (form.newPassword !== form.confirmNewPassword) {
          __d.setCanvasRecoveryError('The new passwords do not match.');
          return;
      }
      const request = {};
      __d.canvasRecoveryVaultActionRequestRef.current = request;
      __d.canvasRecoveryVaultSyncRequestRef.current = null;
      let controller = null;
      const ownsAction = () => __d.canvasRecoveryVaultActionRequestRef.current === request;
      const isCurrent = () => ownsAction()
          && (!controller || __d.canvasRecoveryVaultControllerRef.current === controller);
      __d.setCanvasRecoveryBusyId('vault-recover');
      let committed = false;
      try {
          controller = await __d.getCanvasRecoveryVaultController();
          if (!isCurrent()) return;
          await controller.recoverWithKey(form.recoveryInput, form.newPassword);
          committed = true;
          if (!isCurrent()) return;
          const synced = await __d.syncCanvasRecoveryVaultState(controller);
          if (!isCurrent() || synced.stale) return;
          __d.clearCanvasRecoveryVaultSecrets('idle');
          __d.setCanvasRecoveryError('');
          __d.setCanvasRecoveryDialogMode('manage');
          __d.addToast((__d.t('storage.saved_work_password_replaced_the_existing') || 'Saved-work password replaced. The existing recovery key remains valid.'), 'success');
      } catch (error) {
          if (!isCurrent()) return;
          __d.clearCanvasRecoveryVaultSecrets(committed ? 'unlock' : 'recover');
          __d.setCanvasRecoveryError(committed
              ? 'The password was replaced, but saved work could not be reopened. Reload and use the new password.'
              : 'The recovery key is incorrect, damaged, or no recovery key was configured.');
      } finally {
          if (ownsAction()) {
              __d.canvasRecoveryVaultActionRequestRef.current = null;
              __d.setCanvasRecoveryBusyId(null);
          }
      }
  };`);
const lockStart='      __d.canvasRecoveryVaultSyncRequestRef.current = null;\n      __d.canvasRecoveryMutationInProgressRef.current = true;';
const start='const lockCanvasRecoveryVault =',a=source.indexOf(start),b=source.indexOf('\nconst ',a+start.length),before=source.slice(a,b);
assert.equal(before.split(lockStart).length,2);
operations.push({name:'vault-action:retire-before-explicit-lock',before,after:before.replace(lockStart,'      __d.canvasRecoveryVaultSyncRequestRef.current = null;\n      __d.canvasRecoveryVaultActionRequestRef.current = null;\n      __d.canvasRecoveryMutationInProgressRef.current = true;')});
let candidate=source;for(const op of operations){assert.equal(candidate.split(op.before).length,2,op.name);candidate=candidate.replace(op.before,op.after);}
fs.writeFileSync(path.join(__dirname,'action-operations.json'),JSON.stringify(operations,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'candidate-with-actions-source.jsx'),candidate);
console.log(JSON.stringify({operations:operations.map(o=>o.name),publishLockedPreservesCurrentAction:true,productionWritten:false}));
