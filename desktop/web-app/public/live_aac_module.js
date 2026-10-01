(function() {
'use strict';
if (window.AlloModules && window.AlloModules.LiveAac) { console.log('[CDN] LiveAac already loaded, skipping'); return; }
var React = window.React;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
const ALLO_AAC_BOARD_FORMAT = 'alloflow.aac-board';
const ALLO_AAC_BOARD_VERSION = 1;
const ALLO_LIVE_AAC_SCHEMA = 'alloflow.live-aac';
const ALLO_LIVE_AAC_VERSION = 2;
const ALLO_LIVE_AAC_TTL_MS = 15 * 60 * 1000;
const ALLO_AAC_MAX_PAGES = 12;
const ALLO_AAC_MAX_CELLS_PER_PAGE = 64;
const ALLO_AAC_MAX_CELLS = 256;
const ALLO_AAC_MAX_IMAGE_CHARS = 128 * 1024;
const ALLO_AAC_LIVE_IMAGE_ITEM_CHARS = 256 * 1024;
const ALLO_AAC_PACK_IMAGE_ITEM_CHARS = 2 * 1024 * 1024;
const ALLO_AAC_LIVE_IMAGE_CHARS = 480 * 1024;
const ALLO_AAC_PACK_IMAGE_CHARS = 4 * 1024 * 1024;
const ALLO_AAC_MAX_AUDIO_CHARS = 256 * 1024;
const ALLO_AAC_PACK_AUDIO_ITEM_CHARS = 1024 * 1024;
const ALLO_AAC_PACK_AUDIO_CHARS = 1024 * 1024;
const _alloAacText = (value, max = 240) => String(value == null ? String() : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const _alloAacInteger = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
};
const _alloAacHash = value => {
  const text = typeof value === 'string' ? value : JSON.stringify(value || null);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};
const _alloAacId = (value, fallback) => {
  const clean = _alloAacText(value, 96).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return clean || fallback;
};
const _alloAacLocale = value => {
  const locale = _alloAacText(value, 40);
  return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(locale) ? locale : 'en-US';
};
const _alloAacIsRtlLocale = locale => /^(?:ar|fa|he|ur|ps|sd|ug)(?:-|$)/i.test(locale);
const _alloAacTimestamp = value => {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toMillis === 'function') return Number(value.toMillis());
  const number = Number(value);
  if (Number.isFinite(number)) return number;
  const parsed = Date.parse(String(value || String()));
  return Number.isFinite(parsed) ? parsed : 0;
};
// A picture's credit (Mulberry is CC BY-SA, Commons photos their own licence)
// travels with the picture it names; text only, links only when https.
const _alloAacCredit = value => {
  if (!value || typeof value !== 'object' || typeof value.license !== 'string' || !value.license.trim()) return null;
  const credit = {
    license: _alloAacText(value.license, 120)
  };
  ['set', 'author', 'via'].forEach(key => {
    const text = _alloAacText(value[key], 160);
    if (text) credit[key] = text;
  });
  const title = _alloAacText(value.title, 160);
  if (title) credit.title = title;
  ['url', 'licenseUrl'].forEach(key => {
    const link = _alloAacText(value[key], 500);
    if (/^https:\/\/[^\s]+$/i.test(link)) credit[key] = link;
  });
  if (value.modified === true) credit.modified = true;
  return credit;
};
const _alloAacSafeImage = (value, remaining, perItemLimit = ALLO_AAC_MAX_IMAGE_CHARS) => {
  if (typeof value !== 'string' || value.length > perItemLimit || value.length > remaining) return null;
  if (/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/]*={0,2}$/i.test(value)) return value;
  const match = value.match(/^data:image\/svg\+xml;base64,([A-Za-z0-9+/]*={0,2})$/i);
  if (!match || typeof atob !== 'function') return null;
  try {
    const svg = atob(match[1]);
    if (svg.length > perItemLimit || !/<svg(?:\s|>)/i.test(svg)) return null;
    const unsafe = /<\s*(?:script|foreignObject|iframe|object|embed|link|style|image|audio|video)\b/i.test(svg) || /<!\s*(?:DOCTYPE|ENTITY)\b|<\?xml-stylesheet\b/i.test(svg) || /\son[a-z]+\s*=/i.test(svg) || /(?:href|xlink:href)\s*=\s*['"]\s*(?:https?:|\/\/|blob:|data:|javascript:)/i.test(svg) || /(?:url\s*\(|@import|javascript:|expression\s*\()/i.test(svg);
    return unsafe ? null : value;
  } catch (_) {
    return null;
  }
};
const _alloAacSafeAudio = (audio, remaining, preparedOnly, perItemLimit = ALLO_AAC_MAX_AUDIO_CHARS) => {
  if (!audio || typeof audio !== 'object' || Array.isArray(audio)) return null;
  const kind = audio.kind === 'prepared' ? 'prepared' : audio.kind === 'custom' ? 'custom' : null;
  if (!kind || preparedOnly && kind !== 'prepared') return null;
  const data = typeof audio.data === 'string' ? audio.data : String();
  if (!data || data.length > perItemLimit || data.length > remaining) return null;
  const match = data.match(/^data:(audio\/(?:mpeg|mp3|mp4|aac|ogg|wav|webm|flac|x-wav));base64,[A-Za-z0-9+/]*={0,2}$/i);
  if (!match) return null;
  const mime = _alloAacText(audio.mime, 80).toLowerCase();
  if (!mime || mime !== match[1].toLowerCase()) return null;
  const clean = {
    kind,
    mime,
    data
  };
  if (audio.profile && typeof audio.profile === 'object' && !Array.isArray(audio.profile)) {
    const profile = {};
    ['voice', 'language', 'provider', 'engine', 'model', 'voiceResolverVersion'].forEach(key => {
      const text = _alloAacText(audio.profile[key], 80);
      if (text) profile[key] = text;
    });
    const rate = Number(audio.profile.synthesisRate);
    if (Number.isFinite(rate)) profile.synthesisRate = Math.max(0.25, Math.min(4, rate));
    if (Object.keys(profile).length) clean.profile = profile;
  }
  return clean;
};
const _alloAacLegacyPackage = raw => {
  if (!raw || typeof raw !== 'object') return null;
  const type = raw.type === 'board' ? 'board' : raw.type === 'schedule' || raw.type === 'sequence' ? 'schedule' : null;
  if (!type) return null;
  const title = _alloAacText(raw.title, 160) || (type === 'board' ? 'AAC Board' : 'Visual Sequence');
  const pageSources = type === 'board' ? Array.isArray(raw.pages) && raw.pages.length ? raw.pages : [{
    id: 'page-1',
    title,
    cols: raw.cols,
    words: raw.words
  }] : [{
    id: 'page-1',
    title,
    cols: 1,
    words: raw.items
  }];
  return {
    format: ALLO_AAC_BOARD_FORMAT,
    version: ALLO_AAC_BOARD_VERSION,
    exportedAt: new Date(_alloAacTimestamp(raw.timestamp) || Date.now()).toISOString(),
    board: {
      id: _alloAacId(raw.id, 'legacy-board'),
      title,
      locale: _alloAacLocale(raw.locale),
      direction: raw.direction
    },
    pages: pageSources.map((page, pageIndex) => ({
      id: _alloAacId(page && page.id, 'page-' + (pageIndex + 1)),
      title: _alloAacText(page && page.title, 160) || title,
      cols: type === 'schedule' ? 1 : _alloAacInteger(page && page.cols, 1, 12, _alloAacInteger(raw.cols, 1, 12, 4)),
      cells: (Array.isArray(page && page.cells) ? page.cells : Array.isArray(page && page.words) ? page.words : []).map((cell, cellIndex) => {
        const source = cell && typeof cell === 'object' ? cell : {
          word: cell
        };
        const label = _alloAacText(source.displayLabel || source.label || source.word, 160);
        const cols = Math.max(1, Number(page && page.cols) || Number(raw.cols) || 4);
        return {
          id: _alloAacId(source.id, 'cell-' + (pageIndex + 1) + '-' + (cellIndex + 1)),
          index: cellIndex,
          row: type === 'schedule' ? cellIndex : Math.floor(cellIndex / cols),
          col: type === 'schedule' ? 0 : cellIndex % cols,
          displayLabel: label,
          vocalLabel: _alloAacText(source.vocalLabel || source.word || source.label, 240) || label,
          originalLabel: _alloAacText(source.originalLabel || source.label || source.word, 160) || label,
          description: _alloAacText(source.description, 400),
          category: _alloAacText(source.category || source.wordType, 80),
          image: source.image || null
        };
      })
    })),
    metadata: {
      privacy: {
        customAudioIncluded: false,
        preparedAudioIncluded: false
      },
      omittedNonportableImages: 0,
      omittedCustomAudio: 0,
      omittedPreparedAudio: 0,
      warnings: ['Opened from a legacy visual support.']
    }
  };
};
const _alloNormalizePortableAacBoardPackage = (value, options = {}) => {
  const isVersioned = !!(value && value.format === ALLO_AAC_BOARD_FORMAT && Number(value.version) === ALLO_AAC_BOARD_VERSION);
  const source = isVersioned ? value : options.allowLegacy ? _alloAacLegacyPackage(value) : null;
  if (!source || !source.board || !Array.isArray(source.pages)) return null;
  const allowAudio = options.allowAudio === true;
  const preparedOnly = options.preparedOnly === true;
  const privacy = source.metadata && source.metadata.privacy && typeof source.metadata.privacy === 'object' ? source.metadata.privacy : {};
  let remainingImages = Math.max(0, Number(options.maxImageChars) || ALLO_AAC_PACK_IMAGE_CHARS);
  let remainingAudio = Math.max(0, Number(options.maxAudioChars) || ALLO_AAC_PACK_AUDIO_CHARS);
  const imageItemLimit = Math.max(1, Number(options.maxImageItemChars) || ALLO_AAC_MAX_IMAGE_CHARS);
  const audioItemLimit = Math.max(1, Number(options.maxAudioItemChars) || ALLO_AAC_MAX_AUDIO_CHARS);
  let cellCount = 0;
  let customIncluded = false;
  let preparedIncluded = false;
  let omittedImages = Math.max(0, _alloAacInteger(source.metadata && source.metadata.omittedNonportableImages, 0, 100000, 0));
  let omittedCustom = Math.max(0, _alloAacInteger(source.metadata && source.metadata.omittedCustomAudio, 0, 100000, 0));
  let omittedPrepared = Math.max(0, _alloAacInteger(source.metadata && source.metadata.omittedPreparedAudio, 0, 100000, 0));
  const pages = source.pages.slice(0, ALLO_AAC_MAX_PAGES).map((page, pageIndex) => {
    const sourceCells = Array.isArray(page && page.cells) ? page.cells : [];
    const columns = _alloAacInteger(page && page.cols, 1, 12, 4);
    const cells = sourceCells.slice(0, ALLO_AAC_MAX_CELLS_PER_PAGE).flatMap((cell, cellIndex) => {
      if (!cell || typeof cell !== 'object' || cellCount >= ALLO_AAC_MAX_CELLS) return [];
      cellCount += 1;
      const displayLabel = _alloAacText(cell.displayLabel || cell.vocalLabel || cell.originalLabel, 160);
      const vocalLabel = _alloAacText(cell.vocalLabel || cell.displayLabel || cell.originalLabel, 240) || displayLabel;
      const safeImage = _alloAacSafeImage(cell.image, remainingImages, imageItemLimit);
      if (safeImage) remainingImages -= safeImage.length;else if (cell.image) omittedImages += 1;
      const clean = {
        id: _alloAacId(cell.id, 'cell-' + (pageIndex + 1) + '-' + (cellIndex + 1)),
        index: _alloAacInteger(cell.index, 0, 999, cellIndex),
        row: _alloAacInteger(cell.row, 0, 99, Math.floor(cellIndex / columns)),
        col: _alloAacInteger(cell.col, 0, 99, cellIndex % columns),
        displayLabel,
        vocalLabel,
        originalLabel: _alloAacText(cell.originalLabel || cell.displayLabel || cell.vocalLabel, 160) || displayLabel,
        description: _alloAacText(cell.description, 400),
        category: _alloAacText(cell.category, 80),
        image: safeImage
      };
      const credit = safeImage ? _alloAacCredit(cell.credit) : null;
      if (credit) clean.credit = credit;
      if (cell.audio && cell.audio.kind === 'custom') {
        if (allowAudio && !preparedOnly && privacy.customAudioIncluded === true) {
          const audio = _alloAacSafeAudio(cell.audio, remainingAudio, false, audioItemLimit);
          if (audio && audio.kind === 'custom') {
            clean.audio = audio;
            remainingAudio -= audio.data.length;
            customIncluded = true;
          } else {
            omittedCustom += 1;
          }
        } else {
          omittedCustom += 1;
        }
      } else if (cell.audio && cell.audio.kind === 'prepared') {
        if (allowAudio && privacy.preparedAudioIncluded === true) {
          const audio = _alloAacSafeAudio(cell.audio, remainingAudio, preparedOnly, audioItemLimit);
          if (audio && audio.kind === 'prepared') {
            clean.audio = audio;
            remainingAudio -= audio.data.length;
            preparedIncluded = true;
          } else {
            omittedPrepared += 1;
          }
        } else {
          omittedPrepared += 1;
        }
      }
      return isVersioned || displayLabel || vocalLabel || safeImage ? [clean] : [];
    });
    return {
      id: _alloAacId(page && page.id, 'page-' + (pageIndex + 1)),
      title: _alloAacText(page && page.title, 160) || 'Page ' + (pageIndex + 1),
      cols: columns,
      cells
    };
  }).filter(page => isVersioned || page.cells.length);
  if (!pages.length) return null;
  const locale = _alloAacLocale(source.board.locale);
  const warnings = (Array.isArray(source.metadata && source.metadata.warnings) ? source.metadata.warnings : []).slice(0, 20).map(warning => _alloAacText(warning, 240)).filter(Boolean);
  return {
    format: ALLO_AAC_BOARD_FORMAT,
    version: ALLO_AAC_BOARD_VERSION,
    exportedAt: _alloAacText(source.exportedAt, 80),
    board: {
      id: _alloAacId(source.board.id, 'board'),
      title: _alloAacText(source.board.title, 160) || 'AAC Board',
      locale,
      direction: source.board.direction === 'rtl' || source.board.direction !== 'ltr' && _alloAacIsRtlLocale(locale) ? 'rtl' : 'ltr'
    },
    pages,
    metadata: {
      privacy: {
        customAudioIncluded: customIncluded,
        preparedAudioIncluded: preparedIncluded
      },
      omittedNonportableImages: omittedImages,
      omittedCustomAudio: omittedCustom,
      omittedPreparedAudio: omittedPrepared,
      warnings
    }
  };
};
const _alloBuildLiveAacPayload = (raw, now = Date.now()) => {
  const portable = _alloNormalizePortableAacBoardPackage(raw, {
    allowLegacy: true,
    allowAudio: false,
    maxImageChars: ALLO_AAC_LIVE_IMAGE_CHARS,
    maxImageItemChars: ALLO_AAC_LIVE_IMAGE_ITEM_CHARS
  });
  if (!portable) return null;
  const timestamp = Math.round(Number(now) || Date.now());
  const hash = _alloAacHash(portable);
  return {
    schema: ALLO_LIVE_AAC_SCHEMA,
    version: ALLO_LIVE_AAC_VERSION,
    payloadId: 'aac-' + timestamp.toString(36) + '-' + hash,
    timestamp,
    expiresAt: timestamp + ALLO_LIVE_AAC_TTL_MS,
    sender: 'Teacher',
    package: portable
  };
};
const _alloReadLiveAacPayload = (raw, now = Date.now()) => {
  if (!raw || typeof raw !== 'object') return null;
  const current = Number(now) || Date.now();
  const isVersioned = raw.schema === ALLO_LIVE_AAC_SCHEMA && Number(raw.version) === ALLO_LIVE_AAC_VERSION;
  const timestamp = _alloAacTimestamp(raw.timestamp);
  const expiresAt = isVersioned ? _alloAacTimestamp(raw.expiresAt) : timestamp + ALLO_LIVE_AAC_TTL_MS;
  if (!timestamp || timestamp > current + 5 * 60 * 1000 || expiresAt <= current || expiresAt <= timestamp || expiresAt > timestamp + 60 * 60 * 1000) return null;
  const portable = _alloNormalizePortableAacBoardPackage(isVersioned ? raw.package : raw, {
    allowLegacy: !isVersioned,
    allowAudio: false,
    maxImageChars: ALLO_AAC_LIVE_IMAGE_CHARS,
    maxImageItemChars: ALLO_AAC_LIVE_IMAGE_ITEM_CHARS
  });
  if (!portable) return null;
  return {
    schema: ALLO_LIVE_AAC_SCHEMA,
    version: ALLO_LIVE_AAC_VERSION,
    payloadId: _alloAacId(isVersioned ? raw.payloadId : null, 'aac-' + timestamp.toString(36) + '-' + _alloAacHash(portable)),
    timestamp,
    expiresAt,
    sender: 'Teacher',
    package: portable
  };
};
const _alloBuildLocalAacPayload = (raw, resourceId, now = Date.now()) => {
  const portable = _alloNormalizePortableAacBoardPackage(raw, {
    allowAudio: true,
    maxImageChars: ALLO_AAC_PACK_IMAGE_CHARS,
    maxImageItemChars: ALLO_AAC_PACK_IMAGE_ITEM_CHARS,
    maxAudioChars: ALLO_AAC_PACK_AUDIO_CHARS,
    maxAudioItemChars: ALLO_AAC_PACK_AUDIO_ITEM_CHARS
  });
  if (!portable) return null;
  const timestamp = Math.round(Number(now) || Date.now());
  return {
    schema: ALLO_LIVE_AAC_SCHEMA,
    version: ALLO_LIVE_AAC_VERSION,
    payloadId: 'history-' + _alloAacId(resourceId, _alloAacHash(portable)) + '-' + timestamp.toString(36),
    timestamp,
    expiresAt: timestamp + 24 * 60 * 60 * 1000,
    sender: 'Teacher',
    localOnly: true,
    package: portable
  };
};
// Student homework/QR packs share the same portable AAC media contract as
// live delivery. Generic resources receive the host Firestore sanitizers;
// pack-only quiz images and prepared Word Sounds audio remain tightly bounded.
const _alloSerializeResourceForStudentPack = (item, deps = {}) => {
  const sanitizeHistoryForCloud = deps && deps.sanitizeHistoryForCloud;
  const stripUndefined = deps && deps.stripUndefined;
  if (!item || typeof item !== 'object' || !item.id || !item.type) return null;
  // An imported submission copy is the teacher's review record, never a student resource.
  if (item.data && typeof item.data === 'object' && item.data.submissionCopy) return null;
  // A Study or Family Guide travels only as its learner projection.
  const guideTransport = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.SessionTransport;
  if (item.type === 'lesson-plan' && typeof guideTransport?.isStudentDeliverableGuide === 'function' && guideTransport.isStudentDeliverableGuide(item)) {
    item = guideTransport.projectStudentGuide(item) || item;
  }
  const referenceAudioSource = item;
  // Hydrated or not, explicit reading text is decoded exactly once. Invalid
  // envelopes retain their marker so packing cannot turn them into ready prose.
  if (item.type === 'simplified' && item.dataEncoding === 'json-text/v1') {
    try {
      const decoded = typeof item.data === 'string' ? JSON.parse(item.data) : null;
      if (typeof decoded === 'string') item = {
        ...item,
        data: decoded,
        dataEncoding: 'text/v1'
      };
    } catch (_) {/* retain the invalid explicit envelope through sanitization */}
  }
  // Student packs are an independent egress boundary. A lesson or import
  // can wrap Memory Aids several levels down, so both the shared helper and
  // this fail-closed local gate inspect the entire resource graph. Evidence
  // fields on neutral sibling resources remain untouched.
  const sharedMemoryAidSanitizer = deps && deps.sanitizeMemoryAidResourceForBoundary || typeof window !== 'undefined' && window.sanitizeMemoryAidResourceForBoundary;
  if (typeof sharedMemoryAidSanitizer === 'function') {
    try {
      const sharedSafeItem = sharedMemoryAidSanitizer(item);
      if (sharedSafeItem && typeof sharedSafeItem === 'object') item = sharedSafeItem;
    } catch (_) {}
  }
  // Always run the local pass as the last gate: a stale/identity helper must
  // not silently turn offline, QR, or mailbox delivery into a pass-through.
  const privateEvidenceKeys = new Set(['practiceAttempts', 'retrievalAttempts']);
  const isMemoryAidNode = value => value && typeof value === 'object' && !Array.isArray(value) && [value.type, value.artifactType].some(candidate => typeof candidate === 'string' && candidate.trim().toLowerCase().replace(/[\s_]+/g, '-') === 'memory-aid');
  const sanitizeNestedMemoryAidEvidence = (value, inMemoryAid, seen) => {
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value;
    const memoryAidScope = !!inMemoryAid || isMemoryAidNode(value);
    const visited = seen || {
      neutral: new WeakMap(),
      memoryAid: new WeakMap()
    };
    const cache = memoryAidScope ? visited.memoryAid : visited.neutral;
    if (cache.has(value)) return cache.get(value);
    const safeValue = Array.isArray(value) ? [] : {};
    cache.set(value, safeValue);
    Object.entries(value).forEach(([key, nestedValue]) => {
      if (memoryAidScope && privateEvidenceKeys.has(key)) return;
      safeValue[key] = sanitizeNestedMemoryAidEvidence(nestedValue, memoryAidScope, visited);
    });
    return safeValue;
  };
  item = sanitizeNestedMemoryAidEvidence(item, false);
  // Source excerpts belong to the teacher project, including nested challenges.
  const stripAppliedSources = (value, scoped = false, seen = {
    neutral: new WeakMap(),
    applied: new WeakMap()
  }) => {
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value;
    const active = scoped || [value.type, value.artifactType].some(type => typeof type === 'string' && type.trim().toLowerCase().replace(/[\s_]+/g, '-') === 'applied-challenge');
    const cache = active ? seen.applied : seen.neutral;
    if (cache.has(value)) return cache.get(value);
    const result = Array.isArray(value) ? [] : {};
    cache.set(value, result);
    Object.entries(value).forEach(([key, nested]) => {
      if (!(active && ['sourceExcerpt', 'qualityReview'].includes(key))) result[key] = stripAppliedSources(nested, active, seen);
    });
    return result;
  };
  item = stripAppliedSources(item);
  // AAC homework and QR packs use an explicit portable-media contract.
  // The package privacy flag is the teacher's per-export consent boundary:
  // prepared speech may travel only when that flag is true. Custom voice
  // recordings are never serialized to a student pack.
  if (item.type === 'aac-board') {
    const portable = _alloNormalizePortableAacBoardPackage(item.data, {
      allowAudio: true,
      preparedOnly: true,
      maxImageChars: ALLO_AAC_PACK_IMAGE_CHARS,
      maxImageItemChars: ALLO_AAC_PACK_IMAGE_ITEM_CHARS,
      maxAudioChars: ALLO_AAC_PACK_AUDIO_CHARS,
      maxAudioItemChars: ALLO_AAC_PACK_AUDIO_ITEM_CHARS
    });
    if (!portable) return null;
    portable.pages.forEach(page => {
      page.cells.forEach(cell => {
        if (cell.audio) {
          cell.audio = {
            kind: cell.audio.kind,
            mime: cell.audio.mime,
            data: cell.audio.data
          };
        }
      });
    });
    const timestamp = _alloAacTimestamp(item.timestamp);
    const meta = typeof item.meta === 'string' ? _alloAacText(item.meta, 240) : String();
    const source = typeof item.source === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(item.source.trim()) ? item.source.trim() : String();
    return stripUndefined({
      id: _alloAacId(item.id, 'aac-board-' + _alloAacHash(portable)),
      type: 'aac-board',
      title: _alloAacText(item.title, 160) || portable.board.title || 'AAC Board',
      data: portable,
      meta: meta || undefined,
      timestamp: timestamp > 0 ? timestamp : undefined,
      source: source || undefined
    });
  }
  let cleaned = item;
  try {
    const viaCloud = sanitizeHistoryForCloud([item]);
    if (!Array.isArray(viaCloud) || viaCloud.length === 0) return null; // private item — never packs
    cleaned = viaCloud[0] || item;
  } catch (_) {}
  try {
    if (typeof window !== 'undefined' && typeof window.sanitizeSessionValue === 'function') {
      cleaned = window.sanitizeSessionValue(cleaned, 'resource');
    }
  } catch (_) {}
  // Chunked packs retain only validated reading leaves after BOTH privacy
  // sanitizers run. All other sanitized fields, including audio, stay as-is.
  const readingContract = typeof window !== 'undefined' && window.AlloModules?.InstructionalContext;
  const readingSnapshot = item.type === 'simplified' && typeof item.data === 'string' && item.dataEncoding !== 'json-text/v1' && readingContract?.getSourceSnapshot?.(item);
  if (readingSnapshot && cleaned && typeof cleaned === 'object') {
    cleaned.data = item.data;
    cleaned.dataEncoding = 'text/v1';
    cleaned.sourceSnapshot = readingSnapshot;
    if (item.sourceInstructionalText && readingContract.normalizeSourceInstructionalText) {
      cleaned.sourceInstructionalText = readingContract.normalizeSourceInstructionalText(item.sourceInstructionalText);
    }
    if (item.readingSupports && readingContract.validateReadingSupports) {
      cleaned.readingSupports = readingContract.validateReadingSupports(item, item.readingSupports);
    }
    // A complete input can recover its normalized role after live-budget
    // cleanup downgraded it; never upgrade an already incomplete input.
    const inputProfile = readingContract.getInstructionalText(item);
    if (item.syncTruncated !== true && (inputProfile.form !== 'same-text-supported' || readingContract.isSupportedOriginal(item))) {
      cleaned.instructionalText = readingContract.normalizeInstructionalText(inputProfile, {
        defaultForm: 'adapted'
      });
      if (cleaned.config && typeof cleaned.config === 'object') cleaned.config.instructionalText = {
        ...cleaned.instructionalText
      };
      delete cleaned.readingSourceAvailability;
      delete cleaned.readingPreservation;
      delete cleaned.syncTruncated;
      delete cleaned.syncNotice;
    }
  }
  // Adapted word help is anchored to the adapted text itself, so it is restored
  // whether or not the reading has a captured original. Students receive only
  // help the teacher has shown; hidden or stale help (unreviewed AI text
  // included) stays on the teacher's copy, and fails closed without a validator.
  let adaptedHelpWithheld = null;
  if (cleaned && typeof cleaned === 'object') {
    const studentHelp = item.adaptedReadingSupports && typeof readingContract?.studentAdaptedReadingSupports === 'function' ? readingContract.studentAdaptedReadingSupports(item, item.adaptedReadingSupports) : null;
    if (studentHelp) cleaned.adaptedReadingSupports = studentHelp;else {
      delete cleaned.adaptedReadingSupports;
      const teacherHelp = item.adaptedReadingSupports && typeof readingContract?.validateAdaptedReadingSupports === 'function' ? readingContract.validateAdaptedReadingSupports(item, item.adaptedReadingSupports) : null;
      if (teacherHelp?.status === 'stale') adaptedHelpWithheld = 'stale';else if (teacherHelp?.annotations?.length && teacherHelp.shown !== true) adaptedHelpWithheld = 'hidden';
    }
  }
  // The shared Firestore sanitizer must stay conservative because session
  // documents have a strict size ceiling. Mailbox/P2P packs are already
  // chunked, so restore the instructional image fields after sanitization.
  // This includes single pictures, glossary/timeline illustrations, visual
  // panels and quiz choices, including those inside lesson resources. Use
  // one image budget per resource and leave audio/privacy gates intact.
  let remainingImageChars = 5 * 1024 * 1024;
  const safePackImageSource = value => {
    if (typeof value !== 'string') return null;
    const original = value.trim();
    if (!original) return null;
    if (typeof deps.onImageSource === 'function') deps.onImageSource(original);
    const source = deps.imageOverrides?.get(original) || original;
    const omitted = reason => {
      if (typeof deps.onImageOmitted === 'function') deps.onImageOmitted(reason);
      return null;
    };
    if (source.length > remainingImageChars) return omitted('too-large');
    const isHttps = source.length <= 4096 && /^https:\/\/[^\s]+$/i.test(source);
    const isSafeInline = /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=\r\n]+$/i.test(source);
    if (!isHttps && !isSafeInline) return omitted('unsupported');
    remainingImageChars -= source.length;
    return source;
  };
  const restorePackImages = (source, target, seen = new WeakSet()) => {
    if (!source || !target || typeof source !== 'object' || typeof target !== 'object' || seen.has(target)) return;
    seen.add(target);
    // Only image leaves may be restored. Never recreate a removed parent
    // such as a recording, original-image backup, or private evidence.
    // sceneImage is the Adventure scene's art. It was missing from this list,
    // which is the whole reason glossary images reached mailbox students and
    // adventure art did not: every egress path here restores by KEY NAME,
    // and adventure happens to use a different key. It goes through the same
    // safePackImageSource budget as the others, so a large scene is dropped
    // on the byte cap rather than blowing up the pack.
    for (const key of ['image', 'imageUrl', 'sceneImage']) {
      // A word-support picture is an object, restored validated above; nulling it here dropped it.
      if (Object.prototype.hasOwnProperty.call(source, key) && !(source[key] && typeof source[key] === 'object')) target[key] = safePackImageSource(source[key]);
    }
    if (Array.isArray(source.optionImageUrls) && Array.isArray(target.optionImageUrls)) {
      target.optionImageUrls = source.optionImageUrls.map(safePackImageSource);
    }
    // Animated visual panels need their still frames for pause/step and
    // reduced-motion viewing as well as the composed GIF in imageUrl.
    if (Array.isArray(source.frames) && Array.isArray(target.frames) && typeof source.imageUrl === 'string') {
      target.frames = source.frames.map(safePackImageSource);
    }
    Object.keys(target).forEach(key => restorePackImages(source[key], target[key], seen));
  };
  restorePackImages(item, cleaned);
  // Memory Aid cards carry one visual each and the description that names it.
  // Restore both together through the module's shared deliverable predicate,
  // so a student never receives a description of a picture that was dropped.
  if (item.type === 'memory-aid' && Array.isArray(item?.data?.cards) && Array.isArray(cleaned?.data?.cards)) {
    const memoryAidRules = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.MemoryAid && window.AlloModules.MemoryAid.exportRules || null;
    const safeMemoryAidImageSource = value => {
      if (typeof value !== 'string') return null;
      const source = value.trim();
      if (!source) return null;
      const deliverable = memoryAidRules && typeof memoryAidRules.isDeliverableVisual === 'function' ? memoryAidRules.isDeliverableVisual(source) : source.length <= 4096 && /^https:\/\/[^\s]+$/i.test(source) || /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=\r\n]+$/i.test(source);
      if (!deliverable) {
        if (typeof deps.onImageSource === 'function') deps.onImageSource(source);
        if (typeof deps.onImageOmitted === 'function') deps.onImageOmitted('unsupported');
        return null;
      }
      return safePackImageSource(source);
    };
    item.data.cards.forEach((sourceCard, cardIndex) => {
      const packedCard = cleaned.data.cards[cardIndex];
      if (!sourceCard || !packedCard || typeof packedCard !== 'object') return;
      const restored = safeMemoryAidImageSource(sourceCard.visualImage);
      packedCard.visualImage = restored;
      // A description without its picture is worse than neither: it tells a
      // screen-reader student about something nobody else can see.
      if (!restored) {
        packedCard.visualAlt = '';
        packedCard.visualAltSource = '';
      }
    });
  }
  // Word Sounds packs are chunked, so they may carry teacher-prepared
  // speech. The shared session sanitizer removes nested `base64` fields;
  // restore only this tool-owned, tightly validated audio map. Microphone
  // recordings and arbitrary resource audio remain excluded.
  if (item.type === 'word-sounds' && Array.isArray(item?.data) && Array.isArray(cleaned?.data)) {
    let remainingAudioChars = 6 * 1024 * 1024;
    let remainingAudioItems = 512;
    const safePortableTtsAssets = value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      const safeAssets = {};
      for (const [rawKey, rawAsset] of Object.entries(value)) {
        if (remainingAudioItems <= 0 || remainingAudioChars <= 0) break;
        const key = String(rawKey || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240);
        if (!key || !rawAsset || typeof rawAsset !== 'object' || Array.isArray(rawAsset)) continue;
        const mime = String(rawAsset.mime || '').trim().toLowerCase();
        const base64 = typeof rawAsset.base64 === 'string' ? rawAsset.base64.replace(/\s+/g, '') : '';
        if (!/^audio\/[a-z0-9.+-]{1,48}$/i.test(mime)) continue;
        if (!base64 || base64.length > 512 * 1024 || base64.length > remainingAudioChars) continue;
        if (!/^[a-z0-9+/]+={0,2}$/i.test(base64)) continue;
        safeAssets[key] = {
          mime,
          base64
        };
        remainingAudioChars -= base64.length;
        remainingAudioItems -= 1;
      }
      return Object.keys(safeAssets).length > 0 ? safeAssets : null;
    };
    const safeRequiredTtsKeys = value => {
      if (!Array.isArray(value)) return null;
      const keys = Array.from(new Set(value.map(rawKey => String(rawKey || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 240)).filter(Boolean))).slice(0, 1024);
      return keys.length > 0 ? keys : null;
    };
    item.data.forEach((sourceWord, wordIndex) => {
      const packedWord = cleaned.data[wordIndex];
      if (!sourceWord || !packedWord || typeof packedWord !== 'object') return;
      const safeAssets = safePortableTtsAssets(sourceWord._ttsAssets);
      if (safeAssets) packedWord._ttsAssets = safeAssets;else delete packedWord._ttsAssets;
      const requiredKeys = safeRequiredTtsKeys(sourceWord._ttsRequiredKeys);
      if (requiredKeys) packedWord._ttsRequiredKeys = requiredKeys;else delete packedWord._ttsRequiredKeys;
    });
  }
  const readAloud = typeof window !== 'undefined' && window.AlloModules?.ResourceReadAloud;
  const audioChannel = ['qr', 'live', 'student-pack'].includes(deps.audioChannel) ? deps.audioChannel : 'student-pack';
  let audioBudget = readAloud?.deliveryLimits?.[audioChannel] || 0;
  const restoreReferenceAudio = (source, target, seen = new WeakSet()) => {
    if (!source || !target || typeof source !== 'object' || typeof target !== 'object' || seen.has(target)) return;
    seen.add(target);
    if (['memory-aid', 'applied-challenge'].includes(source.type)) {
      const audio = readAloud?.portableAudio(source, audioChannel, audioBudget);
      delete target.karaokeStudentAudio;
      delete target.karaokeAudio;
      if (audio) {
        target.karaokeAudio = audio;
        audioBudget -= Object.values(audio.entries).reduce((sum, entry) => sum + Math.ceil(entry.audio.length * 3 / 4), 0);
      }
    }
    Object.keys(target).forEach(key => {
      if (key !== 'karaokeAudio') restoreReferenceAudio(source[key], target[key], seen);
    });
  };
  restoreReferenceAudio(referenceAudioSource, cleaned);
  if (item.type === 'simplified' && cleaned && typeof cleaned === 'object') {
    // This route does not yet have an approved portable reading-audio
    // contract. Record the omission, never infer delivery from a host cache.
    const omittedAudio = !!item.karaokeAudio || item.readingDelivery?.referenceAudio?.reason === 'route-unsupported';
    const priorPictureKeys = new Set(item.readingDelivery?.version === 1 && Array.isArray(item.readingDelivery.pictures?.omittedSupportKeys) ? item.readingDelivery.pictures.omittedSupportKeys.filter(key => typeof key === 'string' && /^[a-z0-9]{1,16}$/.test(key)).slice(0, 10000) : []);
    const omittedPictureKeys = new Set();
    const pictureKey = (scope, envelope, note) => {
      // Identity only: no gloss or media bytes in delivery metadata.
      const identity = JSON.stringify([scope, envelope?.sourceFingerprint, envelope?.sourceFamilyId, envelope?.unitId, note.id, note.start, note.end, note.quote]);
      let hash = 2166136261;
      for (let i = 0; i < identity.length; i += 1) hash = Math.imul(hash ^ identity.charCodeAt(i), 16777619);
      return (hash >>> 0).toString(36);
    };
    for (const key of ['readingSupports', 'adaptedReadingSupports']) {
      const accepted = Array.isArray(cleaned[key]?.annotations) ? cleaned[key].annotations : [];
      const annotations = Array.isArray(item[key]?.annotations) ? item[key].annotations : [];
      for (const kept of accepted) {
        if (kept.origin !== 'educator' || kept.image) continue;
        const identity = pictureKey(key, cleaned[key], kept);
        const entry = annotations.find(note => note && note.start === kept.start && note.end === kept.end && note.quote === kept.quote);
        // Retain omissions only for unchanged surviving supports without art.
        if (entry?.image || priorPictureKeys.has(identity)) omittedPictureKeys.add(identity);
      }
    }
    const omittedSupportKeys = [...omittedPictureKeys].slice(0, 10000);
    cleaned.readingDelivery = {
      version: 1,
      referenceAudio: {
        inclusion: 'omitted',
        reason: omittedAudio ? 'route-unsupported' : 'not-provided'
      },
      pictures: {
        omittedCount: omittedSupportKeys.length,
        omittedSupportKeys
      },
      // State only, never the help itself: lets the sharing teacher see why none was sent.
      ...(adaptedHelpWithheld ? {
        adaptedWordHelp: adaptedHelpWithheld
      } : {})
    };
  }
  // Teacher working data never reaches a student copy. A quiz fact check stays
  // only when the student view could already show it as an explanation (not
  // disputed or stale); keyCheck shrinks to a bare confirmation. Mirrors
  // stripTeacherOnlyResourceFields in firestore_sync_module.js.
  const teacherOnlyKeys = ['teacherNotes', 'facilitationNotes', 'visualCheck', 'distractorQuality', 'distractorReview'];
  const studentFactCheck = node => {
    const text = typeof node.factCheck === 'string' ? node.factCheck : '';
    if (!text.trim() || typeof node.question !== 'string') return '';
    const quality = typeof window !== 'undefined' && window.AlloModules?.QuizView?.keyQuality;
    if (typeof quality?.studentExplanation === 'function') {
      try {
        return quality.studentExplanation(node, true) ? text : '';
      } catch (_) {
        return '';
      }
    }
    const check = node.keyCheck && typeof node.keyCheck === 'object' ? node.keyCheck : null;
    if (check && (!['confirmed', 'unclear'].includes(check.status) || String(check.checkedKey ?? '') !== String(node.correctAnswer ?? ''))) return '';
    return /\[\[\s*KEY\s*:\s*DISPUTED|CORRECTION\s*\/\s*WARNING|Actual Correct Answer/i.test(text) ? '' : text;
  };
  const stripTeacherOnlyFields = (value, memoryAid = false, seen = new WeakMap()) => {
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value;
    if (seen.has(value)) return seen.get(value);
    const scope = memoryAid || !Array.isArray(value) && isMemoryAidNode(value);
    const out = Array.isArray(value) ? [] : {};
    seen.set(value, out);
    const explanation = !Array.isArray(value) && !scope && Object.prototype.hasOwnProperty.call(value, 'factCheck') ? studentFactCheck(value) : '';
    Object.entries(value).forEach(([key, nested]) => {
      if (teacherOnlyKeys.includes(key)) return;
      if (key === 'factCheck') {
        if (explanation) out.factCheck = explanation;
        return;
      }
      if (key === 'keyCheck') {
        if (explanation && nested && nested.status === 'confirmed' && String(nested.checkedKey ?? '') === String(value.correctAnswer ?? '')) out.keyCheck = {
          status: 'confirmed',
          checkedKey: nested.checkedKey
        };
        return;
      }
      out[key] = stripTeacherOnlyFields(nested, scope, seen);
    });
    return out;
  };
  // A quiz the teacher marked graded travels without its key: answers,
  // per-option correctness, explanations, answer guides, fact checks and
  // rubrics stay on the teacher's copy, which live quizzes grade against.
  // Mirrors withholdGradedQuizKeys in firestore_sync_module.js.
  const gradedKeyFields = ['correctAnswer', 'correctAnswers', 'correctEvidence', 'correctValue', 'tolerance', 'acceptableUnits', 'expectedAnswer', 'expectedFill', 'acceptableAlternatives', 'rubric', 'sampleAnswer', 'exemplarAnswer', 'modelAnswer', 'answer', 'answerKey', 'explanation', 'answerExplanation', 'rationale', 'feedback', 'optionFeedback', 'factCheck', 'keyCheck', 'distractorQuality', 'intentionallyWrongIndex', 'orderingPrinciple', 'wrongPairIndex', 'correctPartnerForWrong', 'correctOrder', 'correctSequence'];
  const gradedOptionFields = ['isCorrect', 'correct', 'isAnswer', 'feedback', 'explanation', 'rationale'];
  const withholdGradedQuizKeys = resource => {
    const data = resource && resource.type === 'quiz' && resource.data && typeof resource.data === 'object' && !Array.isArray(resource.data) ? resource.data : null;
    if (!data || !data.deliverySettings || data.deliverySettings.feedbackTiming !== 'teacher-graded') return resource;
    const omit = (value, fields) => Object.fromEntries(Object.entries(value).filter(([key]) => !fields.includes(key)));
    const questions = Array.isArray(data.questions) ? data.questions.map(question => {
      if (!question || typeof question !== 'object' || Array.isArray(question)) return question;
      const kept = omit(question, gradedKeyFields);
      ['options', 'answerOptions', 'evidenceOptions'].forEach(field => {
        if (Array.isArray(kept[field])) kept[field] = kept[field].map(option => option && typeof option === 'object' && !Array.isArray(option) ? omit(option, gradedOptionFields) : option);
      });
      return kept;
    }) : data.questions;
    return {
      ...resource,
      data: {
        ...omit(data, ['answerKey', 'distractorReview']),
        questions,
        answerKeysWithheld: true
      }
    };
  };
  const {
    karaokeStudentAudio,
    ...safe
  } = cleaned || {};
  return stripUndefined(withholdGradedQuizKeys(stripTeacherOnlyFields(safe)));
};

// Mailbox media preparation is separate from the synchronous privacy serializer.
// Only inline still pictures are resized; remote URLs are never fetched here,
// and animated GIFs retain their animation. Teacher originals are not modified.
const _alloResizeMailboxImage = (source, maxChars, options = {}) => new Promise(resolve => {
  const ImageClass = options.Image || (typeof Image === 'function' ? Image : null);
  const createCanvas = options.createCanvas || (() => document.createElement('canvas'));
  if (!ImageClass || !/^data:image\/(?:png|jpe?g|webp|avif);base64,/i.test(source) || source.length > 20 * 1024 * 1024) return resolve(null);
  const image = new ImageClass();
  let done = false;
  const finish = value => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    image.onload = image.onerror = null;
    resolve(value);
  };
  const timer = setTimeout(() => finish(null), 8000);
  image.onerror = () => finish(null);
  image.onload = () => {
    try {
      const width = image.naturalWidth,
        height = image.naturalHeight;
      if (!width || !height || width * height > 40000000) return finish(null);
      for (const [edge, quality] of [[1600, 0.85], [1200, 0.78], [800, 0.72], [480, 0.65]]) {
        const scale = Math.min(1, edge / Math.max(width, height));
        const canvas = createCanvas();
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        if (!context) break;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const result = canvas.toDataURL('image/webp', quality);
        if (/^data:image\/(?:webp|png);base64,/i.test(result) && result.length <= maxChars && result.length < source.length) return finish(result);
      }
    } catch (_) {}
    finish(null);
  };
  image.src = source;
});
function _alloValidMailboxImageDelivery(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  var allowed = ['version', 'resourceId', 'status', 'loaded', 'total', 'omitted', 'assignmentAt', 'at'];
  var keys = Object.keys(value);
  if (keys.length !== 8 || keys.some(function (key) {
    return allowed.indexOf(key) < 0;
  })) return false;
  if (value.version !== 1 || typeof value.resourceId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/.test(value.resourceId)) return false;
  if (['loading', 'ready', 'failed'].indexOf(value.status) < 0) return false;
  var validCount = function (n, max) {
    return typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n >= 0 && n <= max;
  };
  if (!validCount(value.total, 100000) || value.total < 1 || !validCount(value.loaded, value.total) || !validCount(value.omitted, value.total - value.loaded)) return false;
  if (value.status === 'ready' && value.loaded !== value.total) return false;
  return validCount(value.assignmentAt, 999999999999999) && validCount(value.at, 999999999999999) && value.at > 0;
}
const _alloNormalizeMailboxImageDelivery = value => _alloValidMailboxImageDelivery(value) ? {
  ...value
} : null;
const _alloMailboxImageFailure = ({
  ready,
  total,
  omitted = 0
}) => {
  const missing = Math.max(0, total - ready - omitted);
  const omittedText = omitted ? omitted + (omitted === 1 ? ' image was' : ' images were') + ' not included in the teacher pack. Ask your teacher to replace or resize ' + (omitted === 1 ? 'it.' : 'them.') : '';
  const missingText = missing ? missing + (missing === 1 ? ' image could' : ' images could') + ' not load. Check your connection, then retry.' : '';
  return {
    retry: missing > 0,
    text: [missingText, omittedText].filter(Boolean).join(' ')
  };
};
const _alloPrepareMailboxResource = async (item, deps = {}) => {
  const sources = [];
  const base = _alloSerializeResourceForStudentPack(item, {
    ...deps,
    onImageSource: source => sources.push(source)
  });
  if (!base) return {
    resource: null,
    report: {
      total: 0,
      omitted: 0,
      resized: 0
    }
  };
  const overrides = new Map();
  const inline = sources.filter(source => /^data:image\//i.test(source));
  const totalChars = inline.reduce((total, source) => total + source.length, 0);
  const fairShare = Math.max(1024, Math.floor(4.8 * 1024 * 1024 / Math.max(1, inline.length)));
  const targetChars = totalChars > 5 * 1024 * 1024 ? Math.min(750 * 1024, fairShare) : 750 * 1024;
  const resize = deps.resizeImage || _alloResizeMailboxImage;
  for (const source of new Set(inline)) {
    if (source.length <= targetChars) continue;
    try {
      const resized = await resize(source, targetChars);
      if (typeof resized === 'string' && resized.length < source.length) overrides.set(source, resized);
    } catch (_) {/* keep the source; the serializer reports any omission */}
  }
  const report = {
    total: sources.length,
    omitted: 0,
    resized: sources.filter(source => overrides.has(source)).length,
    tooLarge: 0,
    unsupported: 0
  };
  const resource = _alloSerializeResourceForStudentPack(item, {
    ...deps,
    imageOverrides: overrides,
    onImageOmitted: reason => {
      report.omitted += 1;
      if (reason === 'too-large') report.tooLarge += 1;else report.unsupported += 1;
    }
  });
  if (resource && report.total) resource.mailboxImageReport = {
    version: 1,
    ...report
  };
  return {
    resource,
    report
  };
};
const _alloMailboxResourceImages = resource => {
  const sources = new Set();
  const seen = new WeakSet();
  let omittedReadingPictures = 0;
  const add = value => {
    if (typeof value === 'string' && /^(?:https:\/\/|data:image\/)/i.test(value)) sources.add(value);
  };
  const visit = value => {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (value.type === 'simplified' && value.readingDelivery?.version === 1) {
      omittedReadingPictures += Math.max(0, Math.min(10000, Math.trunc(Number(value.readingDelivery.pictures?.omittedCount) || 0)));
    }
    for (const key of ['image', 'imageUrl', 'visualImage', 'sceneImage']) add(value[key]);
    // Reading word-support pictures are objects with a validated src leaf.
    // They need the same recipient load check as string-valued pictures.
    if (value.image && typeof value.image === 'object') add(value.image.src);
    if (Array.isArray(value.optionImageUrls)) value.optionImageUrls.forEach(add);
    if (typeof value.imageUrl === 'string' && Array.isArray(value.frames)) value.frames.forEach(add);
    Object.keys(value).forEach(key => {
      if (!/^(?:originalImage|karaokeAudio|karaokeStudentAudio|audioRecording|recording|practiceAttempts|retrievalAttempts)$/.test(key)) visit(value[key]);
    });
  };
  visit(resource);
  const omitted = Math.min(10000, omittedReadingPictures + Math.max(0, Math.min(10000, Math.trunc(Number(resource?.mailboxImageReport?.omitted) || 0))));
  const list = [...sources];
  // A compact signature keeps React effects stable when non-image resource
  // fields change, without putting image data in roster receipts or logs.
  let hash = 2166136261;
  // Sort and frame each source so object order and concatenation cannot make
  // two different image sets look like the same delivered revision.
  list.sort().forEach(source => {
    const framed = source.length + ':' + source;
    for (let i = 0; i < framed.length; i += 1) hash = Math.imul(hash ^ framed.charCodeAt(i), 16777619);
  });
  const revision = (hash >>> 0).toString(36) + '-' + list.length + '-' + omitted;
  return {
    sources: list,
    omitted,
    revision,
    key: String(resource?.id || '') + ':' + revision
  };
};
// Version the resource identity inside the existing bounded receipt field.
// This is an equality token, not authentication or proof of decoding.
const _alloMailboxImageReceiptId = (resourceId, revision) => {
  if (typeof revision !== 'string' || !/^[a-z0-9-]{1,48}$/.test(revision)) return null;
  const raw = String(resourceId || '');
  if (!raw) return null;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619);
  const id = raw.trim().replace(/[^A-Za-z0-9:_-]/g, '-').slice(0, 80).replace(/^[^A-Za-z0-9]+/, '') || 'resource';
  return id + ':images:' + (hash >>> 0).toString(36) + ':' + revision;
};
const _alloLoadMailboxImage = (source, signal) => new Promise(resolve => {
  if (typeof Image !== 'function' || signal?.aborted) return resolve(false);
  const image = new Image();
  let done = false;
  const finish = ready => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    image.onload = image.onerror = null;
    signal?.removeEventListener('abort', abort);
    if (!ready) image.removeAttribute('src');
    resolve(ready);
  };
  const abort = () => finish(false);
  const timer = setTimeout(() => finish(false), 12000);
  signal?.addEventListener('abort', abort, {
    once: true
  });
  image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
  image.onerror = () => finish(false);
  image.src = source;
});
const _alloCheckMailboxImages = async (manifest, options = {}) => {
  const sources = manifest.sources || [];
  const omitted = manifest.omitted || 0;
  const total = sources.length + omitted;
  let next = 0,
    ready = 0;
  const load = options.loadImage || _alloLoadMailboxImage;
  const snapshot = status => ({
    status,
    ready,
    total,
    omitted
  });
  options.onProgress?.(snapshot(total ? 'loading' : 'idle'));
  await Promise.all(Array.from({
    length: Math.min(3, sources.length)
  }, async () => {
    while (next < sources.length && !options.signal?.aborted) {
      const source = sources[next++];
      try {
        if (await load(source, options.signal)) ready += 1;
      } catch (_) {}
      if (!options.signal?.aborted) options.onProgress?.(snapshot('loading'));
    }
  }));
  return snapshot(!total ? 'idle' : ready === total ? 'ready' : 'failed');
};
const _alloUseMailboxImageDelivery = ({
  resource,
  enabled,
  sessionKey,
  assignmentAt,
  retryEpoch
}) => {
  const manifest = React.useMemo(() => _alloMailboxResourceImages(enabled ? resource : null), [resource, enabled]);
  const key = enabled ? [sessionKey, manifest.key, assignmentAt || 0, retryEpoch || 0].join('|') : '';
  const [state, setState] = useState({
    key: '',
    status: 'idle',
    ready: 0,
    total: 0,
    omitted: 0
  });
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const update = value => {
      if (!controller.signal.aborted) setState({
        ...value,
        key
      });
    };
    _alloCheckMailboxImages(manifest, {
      signal: controller.signal,
      onProgress: update
    }).then(update);
    return () => controller.abort();
  }, [key]);
  return {
    ...(state.key === key ? state : {
      key,
      status: enabled && (manifest.sources.length || manifest.omitted) ? 'loading' : 'idle',
      ready: 0,
      total: manifest.sources.length + manifest.omitted,
      omitted: manifest.omitted
    }),
    revision: manifest.revision
  };
};
const LiveAacBoardDialog = ({
  payload,
  onDismiss,
  onSpeak
}) => {
  const portable = payload && payload.package;
  const pages = portable && Array.isArray(portable.pages) ? portable.pages : [];
  const [pageIndex, setPageIndex] = useState(0);
  const [sentence, setSentence] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const safePageIndex = Math.max(0, Math.min(pageIndex, Math.max(0, pages.length - 1)));
  const page = pages[safePageIndex] || {
    title: 'AAC Board',
    cols: 4,
    cells: []
  };
  const cells = Array.isArray(page.cells) ? page.cells : [];
  const interactiveCells = cells.filter(cell => !!(cell && (cell.displayLabel || cell.vocalLabel || cell.originalLabel || cell.image)));
  const locale = portable && portable.board ? portable.board.locale : 'en-US';
  const direction = portable && portable.board && portable.board.direction === 'rtl' ? 'rtl' : 'ltr';
  const speak = React.useCallback((text, cell) => {
    const phrase = _alloAacText(text, 2000);
    if (!phrase || typeof onSpeak !== 'function') return;
    try {
      const result = onSpeak(phrase, cell || null);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (_) {}
  }, [onSpeak]);
  const activateCell = React.useCallback(cell => {
    if (!cell) return;
    const phrase = cell.vocalLabel || cell.displayLabel || cell.originalLabel;
    if (!phrase) return;
    setSentence(previous => previous.concat([_alloAacText(cell.displayLabel || phrase, 160)]).slice(-24));
    speak(phrase, cell);
  }, [speak]);
  useEffect(() => {
    openerRef.current = document.activeElement;
    return () => {
      const opener = openerRef.current;
      try {
        if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
      } catch (_) {}
    };
  }, []);
  useEffect(() => {
    setPageIndex(0);
    setSentence([]);
    setScanning(false);
    setScanIndex(0);
    const timer = setTimeout(() => {
      try {
        dialogRef.current && dialogRef.current.focus();
      } catch (_) {}
    }, 0);
    return () => clearTimeout(timer);
  }, [payload && payload.payloadId]);
  useEffect(() => {
    if (!scanning || interactiveCells.length < 1) return undefined;
    const timer = setInterval(() => setScanIndex(current => (current + 1) % interactiveCells.length), 1400);
    return () => clearInterval(timer);
  }, [scanning, interactiveCells.length, safePageIndex]);
  useEffect(() => {
    setScanIndex(0);
  }, [safePageIndex]);
  useEffect(() => {
    const handleKey = event => {
      if (event.key === 'Tab') {
        const focusable = dialogRef.current ? Array.from(dialogRef.current.querySelectorAll('button:not([disabled]), [href]')) : [];
        if (!focusable.length) {
          event.preventDefault();
          try {
            dialogRef.current && dialogRef.current.focus();
          } catch (_) {}
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        setSentence(previous => previous.slice(0, -1));
        return;
      }
      if (event.key === 'ArrowLeft' && pages.length > 1) {
        event.preventDefault();
        setPageIndex(current => Math.max(0, current - 1));
        return;
      }
      if (event.key === 'ArrowRight' && pages.length > 1) {
        event.preventDefault();
        setPageIndex(current => Math.min(pages.length - 1, current + 1));
        return;
      }
      if (scanning && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        activateCell(interactiveCells[scanIndex % Math.max(1, interactiveCells.length)]);
        return;
      }
      if (/^[1-9]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (interactiveCells[index]) {
          event.preventDefault();
          activateCell(interactiveCells[index]);
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [activateCell, interactiveCells, scanIndex, scanning, pages.length, onDismiss]);
  const sentenceText = sentence.join(' ');
  const cellColors = {
    noun: '#fef9c3',
    verb: '#dcfce7',
    adjective: '#dbeafe',
    other: '#f3f4f6'
  };
  return /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "AAC Board from Teacher",
    lang: locale,
    dir: direction,
    ref: dialogRef,
    tabIndex: -1,
    onClick: event => {
      if (event.target === event.currentTarget) onDismiss();
    },
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 99998,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.58)',
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: event => event.stopPropagation(),
    style: {
      background: '#fff',
      borderRadius: 20,
      width: 'min(900px,96vw)',
      maxHeight: '94vh',
      overflowY: 'auto',
      boxShadow: '0 25px 60px rgba(0,0,0,0.24)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '14px 18px',
      borderBottom: '1px solid #e2e8f0'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      color: '#3730a3',
      fontSize: 20
    }
  }, portable && portable.board ? portable.board.title : 'AAC Board'), /*#__PURE__*/React.createElement("div", {
    style: {
      color: '#64748b',
      fontSize: 12
    }
  }, "Shared by Teacher")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onDismiss,
    "aria-label": "Close AAC Board",
    style: {
      border: 0,
      borderRadius: 10,
      width: 36,
      height: 36,
      cursor: 'pointer',
      fontSize: 18
    }
  }, "x")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 18px'
    }
  }, pages.length > 1 && /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": "AAC Board pages",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setPageIndex(current => Math.max(0, current - 1)),
    disabled: safePageIndex === 0
  }, "Previous page"), /*#__PURE__*/React.createElement("strong", null, page.title, " (", safePageIndex + 1, " of ", pages.length, ")"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setPageIndex(current => Math.min(pages.length - 1, current + 1)),
    disabled: safePageIndex === pages.length - 1
  }, "Next page")), /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-label": "Sentence strip",
    style: {
      minHeight: 48,
      border: '2px solid #c7d2fe',
      borderRadius: 12,
      padding: 10,
      marginBottom: 10,
      background: '#eef2ff',
      fontWeight: 700
    }
  }, sentenceText || 'Select symbols to build a sentence.'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => speak(sentenceText),
    disabled: !sentenceText,
    "aria-keyshortcuts": "Enter"
  }, "Speak sentence"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setSentence(previous => previous.slice(0, -1)),
    disabled: !sentence.length,
    "aria-keyshortcuts": "Backspace"
  }, "Undo"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setSentence([]),
    disabled: !sentence.length
  }, "Clear"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": scanning,
    onClick: () => setScanning(current => !current)
  }, scanning ? 'Stop scanning' : 'Start scanning')), /*#__PURE__*/React.createElement("div", {
    role: "grid",
    "aria-label": page.title || 'AAC Board symbols',
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + Math.max(1, Math.min(12, page.cols || 4)) + ', minmax(76px,1fr))',
      gap: 9
    }
  }, cells.map((cell, index) => {
    const isScanning = scanning && cell === interactiveCells[scanIndex % Math.max(1, interactiveCells.length)];
    const category = cell.category && cellColors[cell.category] ? cell.category : 'other';
    const isBlank = !(cell.displayLabel || cell.vocalLabel || cell.originalLabel || cell.image);
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      role: "gridcell",
      key: cell.id || index,
      onClick: () => activateCell(cell),
      disabled: isBlank,
      "aria-label": isBlank ? 'Empty AAC slot' : (cell.displayLabel || cell.vocalLabel || 'Symbol') + (index < 9 ? ', shortcut ' + (index + 1) : String()),
      "aria-current": isScanning ? 'true' : undefined,
      style: {
        minHeight: 104,
        border: isScanning ? '4px solid #7c3aed' : '2px solid rgba(15,23,42,0.15)',
        borderRadius: 12,
        background: cellColors[category],
        padding: 8,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        boxShadow: isScanning ? '0 0 0 3px #ddd6fe' : 'none'
      }
    }, cell.image ? /*#__PURE__*/React.createElement("img", {
      src: cell.image,
      alt: String(),
      style: {
        width: 64,
        height: 64,
        objectFit: 'contain'
      }
    }) : /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        fontSize: 28
      }
    }, "Aa"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontWeight: 800,
        color: '#0f172a',
        overflowWrap: 'anywhere'
      }
    }, cell.displayLabel || cell.vocalLabel));
  })), scanning && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 0',
      color: '#5b21b6',
      fontWeight: 700
    }
  }, "Press Enter or Space to choose the highlighted symbol."))));
};
const MailboxImageDeliveryMonitor = ({
  resource,
  enabled,
  sessionKey,
  assignmentAt,
  onReceipt,
  receiveError,
  onRetryResource,
  revisionReceipts = false
}) => {
  const [retryEpoch, setRetryEpoch] = useState(0);
  const state = _alloUseMailboxImageDelivery({
    resource,
    enabled,
    sessionKey,
    assignmentAt,
    retryEpoch
  });
  const receiptRef = useRef(onReceipt);
  const receiptQueue = useRef(Promise.resolve());
  receiptRef.current = onReceipt;
  const completed = state.status === 'loading' ? 0 : state.ready;
  useEffect(() => {
    if (!enabled || !resource?.id || !state.total) return undefined;
    let cancelled = false,
      timer;
    const publish = async attempt => {
      try {
        const work = receiptQueue.current.catch(() => {}).then(() => {
          if (!cancelled) return receiptRef.current?.({
            resourceId: revisionReceipts ? _alloMailboxImageReceiptId(resource.id, state.revision) : resource.id,
            status: state.status,
            ready: completed,
            total: state.total,
            omitted: state.omitted,
            assignmentAt: Number(assignmentAt) || 0
          });
        });
        receiptQueue.current = work;
        await work;
      } catch (_) {
        if (!cancelled && attempt < 3) timer = setTimeout(() => publish(attempt + 1), 600 * attempt);
      }
    };
    publish(1);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, state.key, state.status, completed, state.total, state.omitted, revisionReceipts]);
  if (!enabled || !receiveError && (state.status === 'idle' || state.status === 'ready')) return null;
  const failed = receiveError || state.status === 'failed';
  const failure = _alloMailboxImageFailure(state);
  return /*#__PURE__*/React.createElement("div", {
    role: failed ? 'alert' : 'status',
    "aria-live": "polite",
    className: "no-print",
    style: {
      position: 'fixed',
      bottom: 92,
      left: 12,
      zIndex: 145,
      width: 'min(430px, calc(100vw - 24px))',
      boxSizing: 'border-box',
      padding: 12,
      borderRadius: 10,
      border: '1px solid ' + (failed ? '#be123c' : '#0369a1'),
      background: failed ? '#fff1f2' : '#f0f9ff',
      color: failed ? '#881337' : '#075985',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("span", null, receiveError ? 'A class resource could not be opened. Retry to download it again.' : failed ? failure.text : 'Loading class images: ' + state.ready + ' of ' + state.total + '.'), (receiveError || failed && failure.retry) && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (receiveError) onRetryResource?.();
      setRetryEpoch(value => value + 1);
    },
    style: {
      minHeight: 44,
      marginTop: 8,
      padding: '8px 12px',
      display: 'block',
      border: '1px solid #9f1239',
      borderRadius: 6,
      background: 'white',
      color: '#881337',
      fontWeight: 700
    }
  }, receiveError ? 'Retry resource' : 'Retry images'));
};
const _alloMailboxImageReceiptState = ({
  entry,
  resourceId,
  resourceAt,
  mediaRevision,
  now = Date.now(),
  mailboxVersion = 23
}) => {
  if (mailboxVersion < 23) return {
    status: 'unavailable',
    label: mailboxVersion ? 'Image status needs a mailbox update' : 'Image status unavailable',
    retry: false
  };
  const receipt = _alloNormalizeMailboxImageDelivery(entry?.imageDelivery);
  const id = mediaRevision === undefined ? String(resourceId || '').trim().replace(/[^A-Za-z0-9:_-]/g, '-').slice(0, 160) : _alloMailboxImageReceiptId(resourceId, mediaRevision);
  if (!id || !receipt || receipt.resourceId !== id || receipt.assignmentAt !== (Number(resourceAt) || 0)) return {
    status: 'waiting',
    label: 'Images: awaiting device',
    retry: true
  };
  if (receipt.status === 'loading' && now - receipt.at > 30000) return {
    status: 'waiting',
    label: 'Images: no recent response',
    retry: true
  };
  if (receipt.status === 'ready') return {
    status: 'ready',
    label: 'Images loaded ' + receipt.loaded + '/' + receipt.total,
    retry: false
  };
  if (receipt.status === 'loading') return {
    status: 'loading',
    label: 'Images loading',
    retry: false
  };
  const missing = receipt.total - receipt.loaded - receipt.omitted;
  const omittedLabel = receipt.omitted ? receipt.omitted + ' omitted: replace or resize in the pack' : '';
  return {
    status: 'failed',
    label: [missing ? 'Images missing ' + missing + '/' + receipt.total : '', omittedLabel].filter(Boolean).join('. '),
    retry: missing > 0
  };
};
// Retry feedback belongs to a delivery target, not to the lifetime of a roster row.
// A keyed child also retires pending callbacks across an A -> B -> A transition.
const MailboxImageStatus = props => {
  const {
    entry,
    resourceId,
    resourceAt,
    mediaRevision,
    mailboxVersion,
    sessionKey,
    recipientId
  } = props;
  const status = _alloMailboxImageReceiptState(props);
  const retryKey = JSON.stringify([sessionKey || '', recipientId || entry?.uid || '', resourceId || '', Number(resourceAt) || 0, [mediaRevision !== undefined, mediaRevision ?? null], mailboxVersion ?? 23, status.retry]);
  return /*#__PURE__*/React.createElement(MailboxImageStatusFeedback, {
    key: retryKey,
    entry: entry,
    status: status,
    onRetry: props.onRetry
  });
};
const MailboxImageStatusFeedback = ({
  entry,
  status,
  onRetry
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pendingRef = useRef(null);
  useEffect(() => () => {
    pendingRef.current = null;
  }, []);
  const retry = async () => {
    // React state may not have rendered between two activation events.
    if (pendingRef.current || !status.retry) return;
    const attempt = {};
    pendingRef.current = attempt;
    setBusy(true);
    setError('');
    try {
      await onRetry();
    } catch (_) {
      if (pendingRef.current === attempt) setError('Could not resend. Try again.');
    } finally {
      if (pendingRef.current === attempt) {
        pendingRef.current = null;
        setBusy(false);
      }
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 4,
      fontSize: 12,
      color: status.status === 'ready' ? '#166534' : status.status === 'failed' ? '#9f1239' : '#075985'
    }
  }, /*#__PURE__*/React.createElement("span", null, status.label), status.retry && /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: busy,
    "aria-label": 'Retry images for ' + (entry?.name || 'student'),
    onClick: retry,
    style: {
      minHeight: 44,
      padding: '4px 8px',
      background: 'white',
      color: '#075985',
      border: '1px solid #0369a1',
      borderRadius: 6,
      fontWeight: 700
    }
  }, busy ? 'Resending images…' : 'Retry images'), error && /*#__PURE__*/React.createElement("span", {
    role: "alert"
  }, error));
};
window.AlloModules = window.AlloModules || {};
window.AlloModules.LiveAac = {
  normalizePortable: _alloNormalizePortableAacBoardPackage,
  buildLive: _alloBuildLiveAacPayload,
  readLive: _alloReadLiveAacPayload,
  buildLocal: _alloBuildLocalAacPayload,
  text: _alloAacText,
  integer: _alloAacInteger,
  hash: _alloAacHash,
  id: _alloAacId,
  locale: _alloAacLocale,
  timestamp: _alloAacTimestamp,
  serializeResourceForStudentPack: _alloSerializeResourceForStudentPack,
  normalizeMailboxImageDelivery: _alloNormalizeMailboxImageDelivery,
  mailboxImageFailure: _alloMailboxImageFailure,
  prepareMailboxResource: _alloPrepareMailboxResource,
  resizeMailboxImage: _alloResizeMailboxImage,
  mailboxResourceImages: _alloMailboxResourceImages,
  mailboxImageReceiptId: _alloMailboxImageReceiptId,
  checkMailboxImages: _alloCheckMailboxImages,
  useMailboxImageDelivery: _alloUseMailboxImageDelivery,
  mailboxImageReceiptState: _alloMailboxImageReceiptState,
  MailboxImageDeliveryMonitor,
  MailboxImageStatus,
  LiveAacBoardDialog
};
console.log('[CDN] LiveAac loaded');
})();
