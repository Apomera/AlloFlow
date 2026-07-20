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

  // Persona transcripts, reflections, summaries, and read-aloud session
  // artifacts are device-private learning records. They must never be
  // serialized into Firestore history/session resource payloads.
  const PRIVATE_PERSONA_HISTORY_TYPES = new Set([
    'persona-transcript',
    'persona-reflection',
    'persona-summary',
    'persona-session-read-aloud',
  ]);

  function isPrivatePersonaHistoryItem(item) {
    if (!item || typeof item !== 'object') return false;
    const candidateTypes = [
      item.type,
      item.artifactType,
      item.data && typeof item.data === 'object' ? item.data.type : '',
      item.data && typeof item.data === 'object' ? item.data.artifactType : '',
    ];
    return candidateTypes.some(candidate =>
      typeof candidate === 'string' && PRIVATE_PERSONA_HISTORY_TYPES.has(candidate.trim().toLowerCase())
    );
  }

  // Strip large/binary fields (image URLs, sceneImage blobs, avatars) from
  // history items before writing to Firestore. Keeps the rest of the item
  // intact so reload-from-cloud preserves structure even if visuals are
  // regenerated locally.
  function sanitizeHistoryForCloud(historyItems) {
    return historyItems.filter(item => !isPrivatePersonaHistoryItem(item)).map(item => {
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
                 const { avatarUrl, chatHistory, savedDialogue, ...rest } = p;
                 return rest;
             });
             return { ...item, data: cleanData };
        }
        if (item.type === 'fluency-record' && item.data && item.data.audioRecording) {
             // Strip the raw read-aloud voice clip before it reaches Firestore.
             // A child's recorded voice is biometric-class data and must never
             // auto-sync to the cloud; the scored result (metrics/wordData/
             // feedback) is kept so reload-from-cloud still shows the record.
             const { audioRecording, mimeType, ...rest } = item.data;
             return { ...item, data: rest };
        }
        return item;
    });
  }

  const SESSION_RESOURCE_SYNC_MAX_BYTES = 850 * 1024;
  const SESSION_RESOURCE_STRING_MAX_CHARS = 120000;
  const SESSION_BINARY_FIELD_RE = /(?:image|imageUrl|sceneImage|avatarUrl|audio|audioRecording|recording|blob|base64|dataUrl)$/i;

  function estimateJsonBytes(value) {
    try {
      const json = JSON.stringify(value == null ? null : value);
      if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(json).length;
      return json.length;
    } catch (e) {
      return Infinity;
    }
  }

  function trimSessionString(value) {
    if (typeof value !== 'string') return value;
    if (/^(data:|blob:)/i.test(value)) return null;
    if (value.length <= SESSION_RESOURCE_STRING_MAX_CHARS) return value;
    return value.slice(0, SESSION_RESOURCE_STRING_MAX_CHARS) + '\n\n[Trimmed for live session sync. Open the teacher pack for the full resource.]';
  }

  function sanitizeSessionValue(value, keyName) {
    if (value == null) return value;
    if (typeof value === 'string') {
      if (SESSION_BINARY_FIELD_RE.test(String(keyName || '')) && value.length > 512) return null;
      return trimSessionString(value);
    }
    if (Array.isArray(value)) return value.map(entry => sanitizeSessionValue(entry, keyName));
    if (typeof value === 'object' && !(value instanceof Date)) {
      const out = {};
      Object.keys(value).forEach(key => {
        const v = value[key];
        if (v === undefined) return;
        if (SESSION_BINARY_FIELD_RE.test(key) && (typeof v === 'string' || typeof v === 'object')) {
          out[key] = null;
          return;
        }
        out[key] = sanitizeSessionValue(v, key);
      });
      return out;
    }
    return value;
  }

  function compactSessionResource(item) {
    const data = item && item.data && typeof item.data === 'object' ? item.data : {};
    return stripUndefined({
      id: item && item.id,
      type: item && item.type,
      title: (item && item.title) || data.title || data.main || 'Shared resource',
      subtitle: (item && item.subtitle) || data.subtitle || data.gradeLevel || data.language || '',
      syncTruncated: true,
      syncNotice: 'This resource was too large for the live session document. Open the teacher device or exported pack for the full version.',
    });
  }

  function prepareSessionResourcesForWrite(resources, options) {
    const maxBytes = Math.max(1024, Number(options && options.maxBytes) || SESSION_RESOURCE_SYNC_MAX_BYTES);
    const source = Array.isArray(resources) ? resources : [];
    const cleaned = stripUndefined(sanitizeHistoryForCloud(source).map(item => sanitizeSessionValue(item, 'resource')));
    const kept = [];
    let droppedCount = 0;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      const candidate = [cleaned[i]].concat(kept);
      if (estimateJsonBytes(candidate) <= maxBytes || kept.length === 0) {
        kept.unshift(cleaned[i]);
      } else {
        droppedCount += 1;
      }
    }

    while (kept.length > 1 && estimateJsonBytes(kept) > maxBytes) {
      kept.shift();
      droppedCount += 1;
    }

    if (kept.length === 1 && estimateJsonBytes(kept) > maxBytes) {
      kept[0] = compactSessionResource(kept[0]);
    }

    if (estimateJsonBytes(kept) > maxBytes) {
      droppedCount += kept.length;
      kept.length = 0;
    }

    const byteLength = estimateJsonBytes(kept);
    return {
      resources: kept,
      originalCount: source.length,
      keptCount: kept.length,
      droppedCount,
      byteLength,
      maxBytes,
      overLimit: byteLength > maxBytes,
    };
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
  window.estimateJsonBytes = estimateJsonBytes;
  window.prepareSessionResourcesForWrite = prepareSessionResourcesForWrite;
  // Exposed for the student-pack serializer (mailbox/QR channels): packs must
  // apply the SAME binary-null + string-trim pass the Firebase session path
  // gets, instead of narrowing items to a five-field allowlist.
  window.sanitizeSessionValue = sanitizeSessionValue;

  // Trigger the monolith's swap-in of shim references.
  if (typeof window._upgradeFirestoreSync === 'function') {
    window._upgradeFirestoreSync();
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.FirestoreSync = true;
  console.log('[CDN] FirestoreSync loaded');
})();
