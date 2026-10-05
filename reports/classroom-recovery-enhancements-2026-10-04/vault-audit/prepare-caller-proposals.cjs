'use strict';
// Report-local only. Twelve callers consume the new stale-sync return contract.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'candidate-host-handlers-source.jsx'),'utf8').replace(/\r\n/g,'\n');
const operations=[];
function change(name,replacements){const start='const '+name+' =',a=source.indexOf(start),b=source.indexOf('\nconst ',a+start.length);assert(a>=0&&b>a&&source.split(start).length===2,name);const before=source.slice(a,b);let after=before;for(const [old,next] of replacements){assert.equal(after.split(old).length,2,name+': '+old);after=after.replace(old,next);}operations.push({name:'sync-caller:'+name,before,after});}
change('refreshStorageManagerInventory',[
 ['adjustedStore = synced.store;','adjustedStore = synced.stale ? null : synced.store;']
]);
for(const name of ['commitCanvasRecoveryVaultEnable','recoverCanvasRecoveryVault'])change(name,[
 ['await __d.syncCanvasRecoveryVaultState(controller);','const synced = await __d.syncCanvasRecoveryVaultState(controller);\n          if (synced.stale) return;']
]);
change('confirmCanvasRecoveryCode',[
 ['await __d.syncCanvasRecoveryVaultState(controller, { loadPlaintext: false });','const synced = await __d.syncCanvasRecoveryVaultState(controller, { loadPlaintext: false });\n              if (synced.stale) return;']
]);
change('importCanvasRecoveryVaultBackup',[
 ['const { store } = await __d.syncCanvasRecoveryVaultState(controller);','const synced = await __d.syncCanvasRecoveryVaultState(controller);\n          if (synced.stale) return;\n          const { store } = synced;']
]);
change('setStorageRetentionPolicy',[
 ['return (await __d.syncCanvasRecoveryVaultState(controller)).store;','const synced = await __d.syncCanvasRecoveryVaultState(controller);\n                      return synced.stale ? null : synced.store;'],
 ['          __d.canvasRecoveryStoreRef.current = nextStore;','          if (!nextStore) return;\n          __d.canvasRecoveryStoreRef.current = nextStore;']
]);
change('setCanvasRecoverySnapshotPinned',[
 ['return (await __d.syncCanvasRecoveryVaultState(controller)).store;','const synced = await __d.syncCanvasRecoveryVaultState(controller);\n                  return synced.stale ? null : synced.store;'],
 ['          __d.canvasRecoveryStoreRef.current = nextStore;','          if (!nextStore) return;\n          __d.canvasRecoveryStoreRef.current = nextStore;']
]);
change('removeCanvasRecoverySnapshotMedia',[
 ["return { store: (await __d.syncCanvasRecoveryVaultState(controller)).store, applied: true, reason: 'media-removed' };","const synced = await __d.syncCanvasRecoveryVaultState(controller);\n                  if (synced.stale) return null;\n                  return { store: synced.store, applied: true, reason: 'media-removed' };"],
 ['          __d.canvasRecoveryStoreRef.current = mediaResult.store;','          if (!mediaResult) return;\n          __d.canvasRecoveryStoreRef.current = mediaResult.store;']
]);
change('retryCanvasRecoveryStorage',[
 ['const { store } = await __d.syncCanvasRecoveryVaultState(controller);','const synced = await __d.syncCanvasRecoveryVaultState(controller);\n                  if (synced.stale) return;\n                  const { store } = synced;']
]);
change('eraseCanvasRecoverySnapshot',[
 ['next = (await __d.syncCanvasRecoveryVaultState(controller)).store;','const synced = await __d.syncCanvasRecoveryVaultState(controller);\n                  next = synced.stale ? null : synced.store;'],
 ['          __d.canvasRecoveryStoreRef.current = nextStore;','          if (!nextStore) return;\n          __d.canvasRecoveryStoreRef.current = nextStore;']
]);
change('unlockCanvasRecoveryVault',[
 ['const { store } = await syncCanvasRecoveryVaultState(controller);','const synced = await syncCanvasRecoveryVaultState(controller);\n          if (synced.stale) return;\n          const { store } = synced;']
]);
change('removeCanvasRecoveryKey',[
 ['await syncCanvasRecoveryVaultState(controller, { loadPlaintext: false });','const synced = await syncCanvasRecoveryVaultState(controller, { loadPlaintext: false });\n          if (synced.stale) return;']
]);
let candidate=source;for(const op of operations){assert.equal(candidate.split(op.before).length,2,op.name);candidate=candidate.replace(op.before,op.after);}
fs.writeFileSync(path.join(__dirname,'caller-operations.json'),JSON.stringify(operations,null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'candidate-with-callers-source.jsx'),candidate);
console.log(JSON.stringify({operations:operations.map(o=>o.name),productionWritten:false}));
