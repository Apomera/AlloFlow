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
  // The shared Firestore sanitizer must stay conservative because session
  // documents have a strict size ceiling. Mailbox/P2P packs are already
  // chunked, so restore only the quiz media fields that the existing visual
  // quiz model owns. Fail closed to HTTPS or non-SVG base64 images, and keep
  // enough headroom for the mailbox host's 8 MB assembled-pack ceiling.
  if (item.type === 'quiz' && Array.isArray(item?.data?.questions) && Array.isArray(cleaned?.data?.questions)) {
    let remainingQuizImageChars = 5 * 1024 * 1024;
    const safeQuizImageSource = value => {
      if (typeof value !== 'string') return null;
      const source = value.trim();
      if (!source || source.length > remainingQuizImageChars) return null;
      const isHttps = source.length <= 4096 && /^https:\/\/[^\s]+$/i.test(source);
      const isSafeInline = /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=\r\n]+$/i.test(source);
      if (!isHttps && !isSafeInline) return null;
      remainingQuizImageChars -= source.length;
      return source;
    };
    item.data.questions.forEach((sourceQuestion, questionIndex) => {
      const packedQuestion = cleaned.data.questions[questionIndex];
      if (!sourceQuestion || !packedQuestion || typeof packedQuestion !== 'object') return;
      packedQuestion.imageUrl = safeQuizImageSource(sourceQuestion.imageUrl);
      if (Array.isArray(sourceQuestion.optionImageUrls)) {
        packedQuestion.optionImageUrls = sourceQuestion.optionImageUrls.map(safeQuizImageSource);
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
  const {
    karaokeStudentAudio,
    ...safe
  } = cleaned || {};
  return stripUndefined(safe);
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
  LiveAacBoardDialog
};
console.log('[CDN] LiveAac loaded');
})();
