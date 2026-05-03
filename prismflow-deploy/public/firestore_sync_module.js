/**
 * AlloFlow — Firestore Sync Module
 *
 * Pure history-data helpers that prepare items for cloud (Firestore) write
 * and rehydrate them on read. Extracted from AlloFlowANTI.txt as part of
 * the ongoing CDN modularization effort.
 *
 * Scope (intentional): pure functions only. Stateful Firestore I/O like
 * saveToCloud, fetchCloudHistory, loadLocalData stays in the monolith
 * for now because they hold hard React state dependencies; a follow-up
 * refactor can decouple them and land them here.
 *
 * Loaded by AlloFlowANTI.txt via loadModule('FirestoreSync', ...). The
 * monolith declares no-op shims at top of file and swaps them via
 * window._upgradeFirestoreSync() on module load.
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.FirestoreSync) {
    console.log('[CDN] FirestoreSyncModule already loaded, skipping');
    return;
  }

  // Recursive object sanitizer. Firestore rejects fields with `undefined`
  // values; this strips them (preserves `null`, dates, arrays).
  function stripUndefined(obj) {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(stripUndefined);
    if (typeof obj === 'object' && !(obj instanceof Date)) {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, stripUndefined(v)])
      );
    }
    return obj;
  }

  // Strip large/binary fields (image URLs, sceneImage blobs, avatars) from
  // history items before writing to Firestore. Keeps the rest of the item
  // intact so reload-from-cloud preserves structure even if visuals are
  // regenerated locally.
  function sanitizeHistoryForCloud(historyItems) {
    return historyItems.map(item => {
        if (item.type === 'glossary' && Array.isArray(item.data)) {
            const cleanData = item.data.map(gItem => {
                const { image, ...rest } = gItem;
                return rest;
            });
            return { ...item, data: cleanData };
        }
        if (item.type === 'image' && item.data && item.data.imageUrl) {
            const { imageUrl, ...rest } = item.data;
            return { ...item, data: { ...rest, imageUrl: null } };
        }
        if (item.type === 'adventure' && item.data) {
             const { sceneImage, ...rest } = item.data;
             let cleanInventory = rest.inventory;
             if (Array.isArray(cleanInventory)) {
                cleanInventory = cleanInventory.map(inv => {
                    const { image, ...iRest } = inv;
                    return iRest;
                });
             }
             let cleanSnapshot = null;
             if (rest.snapshot) {
                 cleanSnapshot = {
                     xp: rest.snapshot.xp,
                     gold: rest.snapshot.gold,
                     energy: rest.snapshot.energy,
                     level: rest.snapshot.level,
                     xpToNextLevel: rest.snapshot.xpToNextLevel,
                     stats: rest.snapshot.stats,
                     turnCount: rest.snapshot.turnCount,
                     climax: rest.snapshot.climax,
                     debateMomentum: rest.snapshot.debateMomentum,
                     missionReportDismissed: rest.snapshot.missionReportDismissed,
                     inventory: cleanInventory,
                 };
             }
             return { ...item, data: { ...rest, sceneImage: null, inventory: cleanInventory, snapshot: cleanSnapshot } };
        }
        if (item.type === 'persona' && Array.isArray(item.data)) {
             const cleanData = item.data.map(p => {
                 const { avatarUrl, ...rest } = p;
                 return rest;
             });
             return { ...item, data: cleanData };
        }
        return item;
    });
  }

  // Parse JSON-stringified `data` and `gameData` fields on history items
  // returning from cloud. Tolerates malformed input (filters non-object
  // items, swallows JSON parse errors). Uses the global warnLog (set up
  // earlier in monolith init) for the gameData parse-error path.
  function hydrateHistory(items) {
      if (!Array.isArray(items)) return [];
      return items.filter(item => item && typeof item === 'object').map(item => {
          let parsedData = item.data;
          if (typeof parsedData === 'string') {
              try {
                  const result = JSON.parse(parsedData);
                  parsedData = result;
              } catch (e) {
              }
          }
          let parsedGameData = item.gameData;
          if (typeof parsedGameData === 'string') {
              try {
                  parsedGameData = JSON.parse(parsedGameData);
              } catch(e) {
                  if (typeof window.warnLog === 'function') {
                      window.warnLog('Caught error:', e?.message || e);
                  }
              }
          }
          return {
              ...item,
              data: parsedData,
              gameData: parsedGameData || item.gameData
          };
      });
  }

  // Mirror to window.* so monolith's existing shim references can be
  // upgraded by _upgradeFirestoreSync().
  window.stripUndefined = stripUndefined;
  window.sanitizeHistoryForCloud = sanitizeHistoryForCloud;
  window.hydrateHistory = hydrateHistory;

  // Trigger the monolith's swap-in of shim references.
  if (typeof window._upgradeFirestoreSync === 'function') {
    window._upgradeFirestoreSync();
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.FirestoreSync = true;
  console.log('[CDN] FirestoreSync loaded');
})();
