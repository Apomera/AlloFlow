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

  // Memory Aid practice/retrieval attempts are private student learning
  // evidence. Older resource versions embedded them in cards (and some
  // imported payloads wrapped those cards more deeply), so boundary cleanup
  // must be recursive rather than tied to one legacy schema shape.
  const PRIVATE_MEMORY_AID_EVIDENCE_KEYS = new Set([
    'practiceAttempts',
    'retrievalAttempts',
  ]);

  // Teacher working data on Memory Aid cards: the advisory web-search fact
  // check (verdicts, correction prose, source URLs) and the AI visual critique.
  // It is stripped at the LIVE-SESSION boundary only, so students never receive
  // it, but it stays in the teacher's own cloud history (sanitizeHistoryForCloud
  // must NOT call this, or the teacher loses their check on another device).
  const TEACHER_ONLY_MEMORY_AID_CARD_KEYS = ['factCheck', 'visualCheck'];
  function stripMemoryAidTeacherWorkingData(item) {
    if (!isMemoryAidBoundaryNode(item)) return item;
    const data = item.data;
    if (!data || typeof data !== 'object' || !Array.isArray(data.cards)) return item;
    let changed = false;
    const cards = data.cards.map(card => {
      if (!card || typeof card !== 'object' || Array.isArray(card)) return card;
      if (!TEACHER_ONLY_MEMORY_AID_CARD_KEYS.some(key => Object.prototype.hasOwnProperty.call(card, key))) return card;
      changed = true;
      const next = { ...card };
      TEACHER_ONLY_MEMORY_AID_CARD_KEYS.forEach(key => { delete next[key]; });
      return next;
    });
    return changed ? { ...item, data: { ...data, cards } } : item;
  }

  function stripMemoryAidPracticeEvidence(value, seen) {
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value;
    const visited = seen || new WeakMap();
    if (visited.has(value)) return visited.get(value);
    const cleaned = Array.isArray(value) ? [] : {};
    visited.set(value, cleaned);
    Object.entries(value).forEach(([key, nestedValue]) => {
      if (PRIVATE_MEMORY_AID_EVIDENCE_KEYS.has(key)) return;
      cleaned[key] = stripMemoryAidPracticeEvidence(nestedValue, visited);
    });
    return cleaned;
  }

  function isMemoryAidBoundaryNode(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return [value.type, value.artifactType].some(candidate =>
      typeof candidate === 'string'
      && candidate.trim().toLowerCase().replace(/[\s_]+/g, '-') === 'memory-aid'
    );
  }

  // A Memory Aid can travel either as the history item itself or nested in a
  // lesson/import envelope. Walk neutral containers without treating their
  // similarly named fields as private, then strip the complete subtree only
  // after a resource node identifies itself as a Memory Aid.
  function sanitizeMemoryAidResourceForBoundary(value, seen) {
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value;
    if (isMemoryAidBoundaryNode(value)) return stripMemoryAidPracticeEvidence(value);
    const visited = seen || new WeakMap();
    if (visited.has(value)) return visited.get(value);
    const cleaned = Array.isArray(value) ? [] : {};
    visited.set(value, cleaned);
    Object.entries(value).forEach(([key, nestedValue]) => {
      cleaned[key] = sanitizeMemoryAidResourceForBoundary(nestedValue, visited);
    });
    return cleaned;
  }

  // Strip large/binary fields (image URLs, sceneImage blobs, avatars) from
  // history items before writing to Firestore. Keeps the rest of the item
  // intact so reload-from-cloud preserves structure even if visuals are
  // regenerated locally.
  function sanitizeHistoryForCloud(historyItems) {
    const cleaned = historyItems.filter(item => !isPrivatePersonaHistoryItem(item)).map(rawItem => {
        const item = sanitizeMemoryAidResourceForBoundary(rawItem);
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
    return fitArtworkToBudget(cleaned);
  }

  // ── Generated artwork vs the Firestore document cap ──────────────────────
  // Firestore rejects a document over 1 MiB. Generated artwork is stored inline
  // as base64 data URLs and dwarfs everything else in a history item: measured
  // through the real optimizeImage path (400px, q0.7 JPEG), one furnished
  // 16-locus Memory Palace is ~425 KB, or ~850 KB with Relief depth maps on. Two
  // or three saved palaces therefore push a teacher's history past the cap and
  // the whole sync write fails — taking the mnemonics, mastery schedule and
  // student-built loci down with the pictures.
  //
  // Generated artwork is regenerable; uploaded Memory Aid originals are not.
  // When the payload will not fit, shed generated/legacy art oldest-first, then
  // uploaded originals only if still necessary. Uploaded omissions keep a small
  // local-only provenance marker. The authored lesson and learning data remain.
  const CLOUD_ART_BUDGET_BYTES = 850 * 1024;

  const MEMORY_AID_UPLOADED_VISUAL_OMISSION = Object.freeze({
    schemaVersion: 1,
    asset: 'visual',
    reason: 'cloud-artwork-budget',
    originalSource: 'uploaded',
    availability: 'originating-device-only',
    message: 'Uploaded visual omitted from cloud sync; the local original was not changed.'
  });

  // Generated art is shed FIRST because it can be recreated. Say so in the
  // copy itself: previously it vanished with only a console warning, so a
  // teacher on a second device saw pictureless cards and no explanation.
  const MEMORY_AID_REGENERABLE_VISUAL_OMISSION = Object.freeze({
    schemaVersion: 1,
    asset: 'visual',
    reason: 'cloud-artwork-budget',
    originalSource: 'ai-generated',
    availability: 'regenerable',
    message: 'AI visual omitted from this cloud copy to fit artwork storage limits. Regenerate it here, or open the device where it was created.'
  });

  function stripMemoryAidCardArtwork(cards, mode) {
    if (!Array.isArray(cards)) return { value: cards, changed: false };
    let changed = false;
    const value = cards.map(card => {
      if (!card || typeof card !== 'object' || Array.isArray(card)) return card;
      const hasVisualImage = typeof card.visualImage === 'string' && !!card.visualImage;
      const hasLegacyImage = typeof card.imageUrl === 'string' && !!card.imageUrl;
      if (!hasVisualImage && !hasLegacyImage) return card;
      const uploaded = String(card.visualSource || '').trim().toLowerCase() === 'uploaded';
      if ((mode === 'regenerable' && uploaded) || (mode === 'uploaded' && !uploaded)) return card;
      const next = { ...card };
      if (hasVisualImage) delete next.visualImage;
      if (hasLegacyImage) delete next.imageUrl;
      next.visualSyncOmission = uploaded
        ? { ...MEMORY_AID_UPLOADED_VISUAL_OMISSION }
        : { ...MEMORY_AID_REGENERABLE_VISUAL_OMISSION };
      // The description named a picture this copy no longer carries.
      if (!uploaded) { delete next.visualAlt; delete next.visualAltSource; }
      changed = true;
      return next;
    });
    return { value: changed ? value : cards, changed };
  }

  function stripMemoryAidArtworkInEnvelopes(value, mode, insideMemoryAid) {
    if (!value || typeof value !== 'object' || value instanceof Date) {
      return { value, changed: false };
    }
    if (Array.isArray(value)) {
      let changed = false;
      const next = value.map(entry => {
        const result = stripMemoryAidArtworkInEnvelopes(entry, mode, insideMemoryAid);
        changed = changed || result.changed;
        return result.value;
      });
      return { value: changed ? next : value, changed };
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return { value, changed: false };
    const explicitlyTyped = typeof value.type === 'string' || typeof value.artifactType === 'string';
    const inMemoryAid = isMemoryAidBoundaryNode(value)
      ? true
      : (explicitlyTyped ? false : insideMemoryAid === true);
    let next = value;
    let changed = false;
    Object.keys(value).forEach(key => {
      const result = inMemoryAid && key === 'cards'
        ? stripMemoryAidCardArtwork(value[key], mode)
        : stripMemoryAidArtworkInEnvelopes(value[key], mode, inMemoryAid);
      if (!result.changed) return;
      if (!changed) next = { ...value };
      next[key] = result.value;
      changed = true;
    });
    return { value: next, changed };
  }

  // Whole-store artwork that lives beside its own metadata. Removing the store's
  // image maps leaves labels, mnemonics, mastery, themes and student-built rooms
  // and loci untouched — a palace that reloads without pictures still walks, and
  // the frames fall back to their numbered cards. Memory Aid nodes may be nested
  // in lesson/resource envelopes, so their card art is found through the same
  // type/artifactType boundary used by the privacy sanitizer.
  function stripHeavyArtwork(item, options) {
    const config = options && typeof options === 'object' ? options : {};
    const memoryAidMode = ['regenerable', 'uploaded'].includes(config.memoryAidMode)
      ? config.memoryAidMode
      : 'all';
    const stripGenericArtwork = config.stripGenericArtwork !== false;
    const data = item && item.data;
    if (!item || typeof item !== 'object') return item;
    let touched = false;
    let nextItem = item;
    let next = data;
    const palace = data && typeof data === 'object' && !Array.isArray(data)
      ? data.memoryPalace
      : null;
    // `covered` holds the illustration a decorative stamp is sitting on, so it is
    // base64 too and has to go with the rest of the artwork.
    if (stripGenericArtwork && palace && typeof palace === 'object' && (palace.images || palace.depths || palace.covered)) {
      if (!touched) next = { ...data };
      const { images, depths, covered, ...keep } = palace;
      next.memoryPalace = keep;
      touched = true;
    }
    if (stripGenericArtwork && data && typeof data === 'object' && !Array.isArray(data) && data.conceptArt) {
      if (!touched) next = { ...data };
      delete next.conceptArt;
      touched = true;
    }
    if (touched) nextItem = { ...item, data: next };
    const memoryResult = stripMemoryAidArtworkInEnvelopes(nextItem, memoryAidMode, false);
    return memoryResult.changed ? memoryResult.value : nextItem;
  }

  function fitArtworkToBudget(items) {
    if (!Array.isArray(items)) return items;
    let size = estimateJsonBytes(items);
    if (size <= CLOUD_ART_BUDGET_BYTES) return items;
    const out = items.slice();
    const droppedIndexes = new Set();
    const stripPass = (memoryAidMode, stripGenericArtwork) => {
      // History is appended, so index 0 is the oldest within each priority.
      for (let i = 0; i < out.length && size > CLOUD_ART_BUDGET_BYTES; i++) {
        const lighter = stripHeavyArtwork(out[i], { memoryAidMode, stripGenericArtwork });
        if (lighter === out[i]) continue;
        out[i] = lighter;
        droppedIndexes.add(i);
        size = estimateJsonBytes(out);
      }
    };
    // AI-generated, AI-refined, and legacy/unknown visuals can be recreated.
    // Remove those (and the existing generic artwork stores) before touching a
    // learner or teacher's uploaded original.
    stripPass('regenerable', true);
    if (size > CLOUD_ART_BUDGET_BYTES) stripPass('uploaded', false);
    if (droppedIndexes.size) {
      try {
        window.__alloLastCloudArtDrop = { items: droppedIndexes.size, bytesAfter: size };
        if (typeof window.warnLog === 'function') {
          window.warnLog(`[FirestoreSync] Cloud payload over budget — omitted artwork from ${droppedIndexes.size} history item(s) to fit. Uploaded Memory Aid omissions retain local-only provenance.`);
        }
      } catch (e) { /* diagnostics only */ }
    }
    return out;
  }

  // This is a budget for the resource manifest, not the Firestore hard cap.
  // Media and full resource bodies live in session_assets; leave substantial
  // headroom for roster, poll, group, and presence fields in the session doc.
  const SESSION_RESOURCE_SYNC_MAX_BYTES = 256 * 1024;
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

  function normalizePersistedInstructionalText(item) {
    if (!item || typeof item !== 'object') return null;
    const config = item.config && typeof item.config === 'object' ? item.config : {};
    const raw = item.instructionalText || config.instructionalText || item.textProfile || config.textProfile || null;
    const isTextArtifact = item.type === 'analysis' || item.type === 'simplified';
    if (!raw && !isTextArtifact) return null;
    const inferredForm = item.type === 'simplified' ? 'adapted' : 'original';
    let value = raw;
    try {
      const api = window.AlloModules && window.AlloModules.InstructionalContext;
      if (raw && api && typeof api.normalizeInstructionalText === 'function') value = api.normalizeInstructionalText(raw, { defaultForm: inferredForm });
    } catch (e) { value = raw; }
    value = value && typeof value === 'object' ? value : {};
    const role = ['primary', 'supplemental', 'unspecified'].includes(value.role) ? value.role : 'unspecified';
    const form = ['original', 'same-text-supported', 'adapted'].includes(value.form) ? value.form : inferredForm;
    const auth = value.replacementAuthorization && typeof value.replacementAuthorization === 'object'
      ? value.replacementAuthorization : {};
    const authorized = auth.authorized === true && auth.source === 'educator';
    const complexity = value.complexity && typeof value.complexity === 'object' ? value.complexity : {};
    return stripUndefined({
      schemaVersion: 1,
      role,
      form,
      sourceArtifactId: value.sourceArtifactId == null ? null : String(value.sourceArtifactId),
      primaryArtifactId: value.primaryArtifactId == null ? null : String(value.primaryArtifactId),
      designationSource: ['educator', 'workflow-default', 'legacy-inferred'].includes(value.designationSource)
        ? value.designationSource : 'legacy-inferred',
      replacementAuthorization: { authorized, source: authorized ? 'educator' : 'none' },
      complexity: {
        requestedGrade: complexity.requestedGrade || item.targetGradeLevel || config.grade || '',
        calibrationTarget: complexity.calibrationTarget || '',
        measuredGrade: complexity.measuredGrade != null
          ? complexity.measuredGrade
          : (item.localStats && item.localStats.gradeLevel != null ? item.localStats.gradeLevel : null),
        method: complexity.method || (item.localStats ? 'flesch-kincaid' : ''),
        status: complexity.status || '',
        contentFingerprint: complexity.contentFingerprint || '',
        measuredAt: complexity.measuredAt || null,
        language: complexity.language || config.language || '',
      },
    });
  }

  function compactSessionResource(item) {
    const data = item && item.data && typeof item.data === 'object' ? item.data : {};
    const instructionalText = normalizePersistedInstructionalText(item);
    const itemConfig = item && item.config && typeof item.config === 'object' ? item.config : {};
    return stripUndefined({
      id: item && item.id,
      type: item && item.type,
      title: (item && item.title) || data.title || data.main || 'Shared resource',
      subtitle: (item && item.subtitle) || data.subtitle || data.gradeLevel || data.language || '',
      config: Object.keys(itemConfig).length ? {
        grade: itemConfig.grade,
        language: itemConfig.language,
        standards: itemConfig.standards,
        standardsContext: itemConfig.standardsContext,
        instructionalContext: itemConfig.instructionalContext,
      } : undefined,
      instructionalContext: item && (item.instructionalContext || itemConfig.instructionalContext),
      standardsContext: item && item.standardsContext,
      instructionalText: instructionalText || undefined,
      localStats: item && item.localStats,
      targetGradeLevel: item && item.targetGradeLevel,
      sourceProvenance: item && item.sourceProvenance,
      syncTruncated: true,
      syncNotice: 'This resource was too large for the live session document. Open the teacher device or exported pack for the full version.',
    });
  }

  function prepareSessionResourcesForWrite(resources, options) {
    const maxBytes = Math.max(1024, Number(options && options.maxBytes) || SESSION_RESOURCE_SYNC_MAX_BYTES);
    const source = Array.isArray(resources) ? resources : [];
    const cleaned = stripUndefined(sanitizeHistoryForCloud(source).map(item => sanitizeSessionValue(stripMemoryAidTeacherWorkingData(item), 'resource')));
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
          const hydratedItem = {
              ...item,
              data: parsedData,
              gameData: parsedGameData || item.gameData
          };
          const boundarySafeItem = sanitizeMemoryAidResourceForBoundary(hydratedItem);
          const instructionalText = normalizePersistedInstructionalText(boundarySafeItem);
          return instructionalText ? { ...boundarySafeItem, instructionalText } : boundarySafeItem;
      });
  }

  // Mirror to window.* so monolith's existing shim references can be
  // upgraded by _upgradeFirestoreSync().
  window.stripUndefined = stripUndefined;
  window.stripMemoryAidPracticeEvidence = stripMemoryAidPracticeEvidence;
  window.sanitizeMemoryAidResourceForBoundary = sanitizeMemoryAidResourceForBoundary;
  window.sanitizeHistoryForCloud = sanitizeHistoryForCloud;
  window.hydrateHistory = hydrateHistory;
  window.estimateJsonBytes = estimateJsonBytes;
  window.stripHeavyArtwork = stripHeavyArtwork;
  window.fitArtworkToBudget = fitArtworkToBudget;
  window.prepareSessionResourcesForWrite = prepareSessionResourcesForWrite;
  window.normalizePersistedInstructionalText = normalizePersistedInstructionalText;
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
