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
const _alloAacText = (value, max = 240) => String(value == null ? String() : value)
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max);
const _alloAacInteger = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
};
const _alloAacHash = (value) => {
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
const _alloAacLocale = (value) => {
  const locale = _alloAacText(value, 40);
  return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8}){0,2}$/.test(locale) ? locale : 'en-US';
};
const _alloAacIsRtlLocale = (locale) => /^(?:ar|fa|he|ur|ps|sd|ug)(?:-|$)/i.test(locale);
const _alloAacTimestamp = (value) => {
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
    const unsafe = /<\s*(?:script|foreignObject|iframe|object|embed|link|style|image|audio|video)\b/i.test(svg)
      || /<!\s*(?:DOCTYPE|ENTITY)\b|<\?xml-stylesheet\b/i.test(svg)
      || /\son[a-z]+\s*=/i.test(svg)
      || /(?:href|xlink:href)\s*=\s*['"]\s*(?:https?:|\/\/|blob:|data:|javascript:)/i.test(svg)
      || /(?:url\s*\(|@import|javascript:|expression\s*\()/i.test(svg);
    return unsafe ? null : value;
  } catch (_) {
    return null;
  }
};
const _alloAacSafeAudio = (audio, remaining, preparedOnly, perItemLimit = ALLO_AAC_MAX_AUDIO_CHARS) => {
  if (!audio || typeof audio !== 'object' || Array.isArray(audio)) return null;
  const kind = audio.kind === 'prepared' ? 'prepared' : audio.kind === 'custom' ? 'custom' : null;
  if (!kind || (preparedOnly && kind !== 'prepared')) return null;
  const data = typeof audio.data === 'string' ? audio.data : String();
  if (!data || data.length > perItemLimit || data.length > remaining) return null;
  const match = data.match(/^data:(audio\/(?:mpeg|mp3|mp4|aac|ogg|wav|webm|flac|x-wav));base64,[A-Za-z0-9+/]*={0,2}$/i);
  if (!match) return null;
  const mime = _alloAacText(audio.mime, 80).toLowerCase();
  if (!mime || mime !== match[1].toLowerCase()) return null;
  const clean = { kind, mime, data };
  if (audio.profile && typeof audio.profile === 'object' && !Array.isArray(audio.profile)) {
    const profile = {};
    ['voice', 'language', 'provider', 'engine', 'model', 'voiceResolverVersion'].forEach((key) => {
      const text = _alloAacText(audio.profile[key], 80);
      if (text) profile[key] = text;
    });
    const rate = Number(audio.profile.synthesisRate);
    if (Number.isFinite(rate)) profile.synthesisRate = Math.max(0.25, Math.min(4, rate));
    if (Object.keys(profile).length) clean.profile = profile;
  }
  return clean;
};
const _alloAacLegacyPackage = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const type = raw.type === 'board' ? 'board' : (raw.type === 'schedule' || raw.type === 'sequence') ? 'schedule' : null;
  if (!type) return null;
  const title = _alloAacText(raw.title, 160) || (type === 'board' ? 'AAC Board' : 'Visual Sequence');
  const pageSources = type === 'board'
    ? (Array.isArray(raw.pages) && raw.pages.length ? raw.pages : [{ id: 'page-1', title, cols: raw.cols, words: raw.words }])
    : [{ id: 'page-1', title, cols: 1, words: raw.items }];
  return {
    format: ALLO_AAC_BOARD_FORMAT,
    version: ALLO_AAC_BOARD_VERSION,
    exportedAt: new Date(_alloAacTimestamp(raw.timestamp) || Date.now()).toISOString(),
    board: { id: _alloAacId(raw.id, 'legacy-board'), title, locale: _alloAacLocale(raw.locale), direction: raw.direction },
    pages: pageSources.map((page, pageIndex) => ({
      id: _alloAacId(page && page.id, 'page-' + (pageIndex + 1)),
      title: _alloAacText(page && page.title, 160) || title,
      cols: type === 'schedule' ? 1 : _alloAacInteger(page && page.cols, 1, 12, _alloAacInteger(raw.cols, 1, 12, 4)),
      cells: (Array.isArray(page && page.cells) ? page.cells : Array.isArray(page && page.words) ? page.words : []).map((cell, cellIndex) => {
        const source = cell && typeof cell === 'object' ? cell : { word: cell };
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
      privacy: { customAudioIncluded: false, preparedAudioIncluded: false },
      omittedNonportableImages: 0,
      omittedCustomAudio: 0,
      omittedPreparedAudio: 0,
      warnings: ['Opened from a legacy visual support.']
    }
  };
};
const _alloNormalizePortableAacBoardPackage = (value, options = {}) => {
  const isVersioned = !!(value && value.format === ALLO_AAC_BOARD_FORMAT && Number(value.version) === ALLO_AAC_BOARD_VERSION);
  const source = isVersioned
    ? value
    : options.allowLegacy ? _alloAacLegacyPackage(value) : null;
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
      if (safeImage) remainingImages -= safeImage.length;
      else if (cell.image) omittedImages += 1;
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
  }).filter((page) => isVersioned || page.cells.length);
  if (!pages.length) return null;
  const locale = _alloAacLocale(source.board.locale);
  const warnings = (Array.isArray(source.metadata && source.metadata.warnings) ? source.metadata.warnings : [])
    .slice(0, 20)
    .map((warning) => _alloAacText(warning, 240))
    .filter(Boolean);
  return {
    format: ALLO_AAC_BOARD_FORMAT,
    version: ALLO_AAC_BOARD_VERSION,
    exportedAt: _alloAacText(source.exportedAt, 80),
    board: {
      id: _alloAacId(source.board.id, 'board'),
      title: _alloAacText(source.board.title, 160) || 'AAC Board',
      locale,
      direction: source.board.direction === 'rtl' || (source.board.direction !== 'ltr' && _alloAacIsRtlLocale(locale)) ? 'rtl' : 'ltr'
    },
    pages,
    metadata: {
      privacy: { customAudioIncluded: customIncluded, preparedAudioIncluded: preparedIncluded },
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
const LiveAacBoardDialog = ({ payload, onDismiss, onSpeak }) => {
  const portable = payload && payload.package;
  const pages = portable && Array.isArray(portable.pages) ? portable.pages : [];
  const [pageIndex, setPageIndex] = useState(0);
  const [sentence, setSentence] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const safePageIndex = Math.max(0, Math.min(pageIndex, Math.max(0, pages.length - 1)));
  const page = pages[safePageIndex] || { title: 'AAC Board', cols: 4, cells: [] };
  const cells = Array.isArray(page.cells) ? page.cells : [];
  const interactiveCells = cells.filter((cell) => !!(cell && (cell.displayLabel || cell.vocalLabel || cell.originalLabel || cell.image)));
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
  const activateCell = React.useCallback((cell) => {
    if (!cell) return;
    const phrase = cell.vocalLabel || cell.displayLabel || cell.originalLabel;
    if (!phrase) return;
    setSentence((previous) => previous.concat([_alloAacText(cell.displayLabel || phrase, 160)]).slice(-24));
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
      try { dialogRef.current && dialogRef.current.focus(); } catch (_) {}
    }, 0);
    return () => clearTimeout(timer);
  }, [payload && payload.payloadId]);
  useEffect(() => {
    if (!scanning || interactiveCells.length < 1) return undefined;
    const timer = setInterval(() => setScanIndex((current) => (current + 1) % interactiveCells.length), 1400);
    return () => clearInterval(timer);
  }, [scanning, interactiveCells.length, safePageIndex]);
  useEffect(() => {
    setScanIndex(0);
  }, [safePageIndex]);
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Tab') {
        const focusable = dialogRef.current ? Array.from(dialogRef.current.querySelectorAll('button:not([disabled]), [href]')) : [];
        if (!focusable.length) {
          event.preventDefault();
          try { dialogRef.current && dialogRef.current.focus(); } catch (_) {}
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
        setSentence((previous) => previous.slice(0, -1));
        return;
      }
      if (event.key === 'ArrowLeft' && pages.length > 1) {
        event.preventDefault();
        setPageIndex((current) => Math.max(0, current - 1));
        return;
      }
      if (event.key === 'ArrowRight' && pages.length > 1) {
        event.preventDefault();
        setPageIndex((current) => Math.min(pages.length - 1, current + 1));
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
  const cellColors = { noun: '#fef9c3', verb: '#dcfce7', adjective: '#dbeafe', other: '#f3f4f6' };
  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='AAC Board from Teacher'
      lang={locale}
      dir={direction}
      ref={dialogRef}
      tabIndex={-1}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.58)', padding: 12 }}
    >
      <div onClick={(event) => event.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: 'min(900px,96vw)', maxHeight: '94vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.24)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h2 style={{ margin: 0, color: '#3730a3', fontSize: 20 }}>{portable && portable.board ? portable.board.title : 'AAC Board'}</h2>
            <div style={{ color: '#64748b', fontSize: 12 }}>Shared by Teacher</div>
          </div>
          <button type='button' onClick={onDismiss} aria-label='Close AAC Board' style={{ border: 0, borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18 }}>x</button>
        </div>
        <div style={{ padding: '14px 18px' }}>
          {pages.length > 1 && (
            <div aria-label='AAC Board pages' style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <button type='button' onClick={() => setPageIndex((current) => Math.max(0, current - 1))} disabled={safePageIndex === 0}>Previous page</button>
              <strong>{page.title} ({safePageIndex + 1} of {pages.length})</strong>
              <button type='button' onClick={() => setPageIndex((current) => Math.min(pages.length - 1, current + 1))} disabled={safePageIndex === pages.length - 1}>Next page</button>
            </div>
          )}
          <div role='status' aria-live='polite' aria-label='Sentence strip' style={{ minHeight: 48, border: '2px solid #c7d2fe', borderRadius: 12, padding: 10, marginBottom: 10, background: '#eef2ff', fontWeight: 700 }}>
            {sentenceText || 'Select symbols to build a sentence.'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            <button type='button' onClick={() => speak(sentenceText)} disabled={!sentenceText} aria-keyshortcuts='Enter'>Speak sentence</button>
            <button type='button' onClick={() => setSentence((previous) => previous.slice(0, -1))} disabled={!sentence.length} aria-keyshortcuts='Backspace'>Undo</button>
            <button type='button' onClick={() => setSentence([])} disabled={!sentence.length}>Clear</button>
            <button type='button' aria-pressed={scanning} onClick={() => setScanning((current) => !current)}>{scanning ? 'Stop scanning' : 'Start scanning'}</button>
          </div>
          <div role='grid' aria-label={page.title || 'AAC Board symbols'} style={{ display: 'grid', gridTemplateColumns: 'repeat(' + Math.max(1, Math.min(12, page.cols || 4)) + ', minmax(76px,1fr))', gap: 9 }}>
            {cells.map((cell, index) => {
              const isScanning = scanning && cell === interactiveCells[scanIndex % Math.max(1, interactiveCells.length)];
              const category = cell.category && cellColors[cell.category] ? cell.category : 'other';
              const isBlank = !(cell.displayLabel || cell.vocalLabel || cell.originalLabel || cell.image);
              return (
                <button
                  type='button'
                  role='gridcell'
                  key={cell.id || index}
                  onClick={() => activateCell(cell)}
                  disabled={isBlank}
                  aria-label={isBlank ? 'Empty AAC slot' : (cell.displayLabel || cell.vocalLabel || 'Symbol') + (index < 9 ? ', shortcut ' + (index + 1) : String())}
                  aria-current={isScanning ? 'true' : undefined}
                  style={{ minHeight: 104, border: isScanning ? '4px solid #7c3aed' : '2px solid rgba(15,23,42,0.15)', borderRadius: 12, background: cellColors[category], padding: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: isScanning ? '0 0 0 3px #ddd6fe' : 'none' }}
                >
                  {cell.image ? <img src={cell.image} alt={String()} style={{ width: 64, height: 64, objectFit: 'contain' }} /> : <span aria-hidden='true' style={{ fontSize: 28 }}>Aa</span>}
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', overflowWrap: 'anywhere' }}>{cell.displayLabel || cell.vocalLabel}</span>
                </button>
              );
            })}
          </div>
          {scanning && <p style={{ margin: '12px 0 0', color: '#5b21b6', fontWeight: 700 }}>Press Enter or Space to choose the highlighted symbol.</p>}
        </div>
      </div>
    </div>
  );
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
  LiveAacBoardDialog
};
