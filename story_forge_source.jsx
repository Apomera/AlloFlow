// ═══════════════════════════════════════════════════════════════
// StoryForge — Scaffolded Creative Writing with AI Illustration,
// Narration, Grading, and Storybook Export
// ═══════════════════════════════════════════════════════════════

// ── WCAG 2.4.7 Focus Visible — inject scoped focus-ring CSS once per page ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-sf-focus-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-sf-focus-css';
  st.textContent = '.sf-modal-root :is(button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])):focus-visible{outline:3px solid #fff!important;outline-offset:2px!important;box-shadow:0 0 0 5px #0f172a!important;border-radius:6px}@media (forced-colors:active){.sf-modal-root :is(button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])):focus-visible{outline-color:Highlight!important;box-shadow:none!important}}';
  if (document.head) document.head.appendChild(st);
})();

// ── WCAG 4.1.3 Status Messages — debounced polite-announcer for ephemeral status text ──
let _sfAnnounceTimer = null;
function sfAnnounce(text) {
  if (typeof document === 'undefined') return;
  const lr = document.getElementById('allo-live-storyforge');
  if (!lr) return;
  if (_sfAnnounceTimer) clearTimeout(_sfAnnounceTimer);
  lr.textContent = '';
  _sfAnnounceTimer = setTimeout(() => {
    lr.textContent = String(text || '');
    _sfAnnounceTimer = null;
  }, 25);
}

// ── Utilities ──
const cleanJson = (str) => {
  if (!str) return '{}';
  let s = str.trim();
  const fenceStart = s.indexOf('```');
  if (fenceStart !== -1) {
    const afterFence = s.indexOf('\n', fenceStart);
    const fenceEnd = s.lastIndexOf('```');
    if (afterFence !== -1 && fenceEnd > afterFence) {
      s = s.substring(afterFence + 1, fenceEnd).trim();
    }
  }
  const jsonStart = s.search(/[\[{]/);
  const jsonEndBracket = s.lastIndexOf(']');
  const jsonEndBrace = s.lastIndexOf('}');
  const jsonEnd = Math.max(jsonEndBracket, jsonEndBrace);
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    s = s.substring(jsonStart, jsonEnd + 1);
  }
  return s;
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

// Word-boundary-aware truncation for compact previews — cuts at the last space before `max`
// (never mid-word) and appends an ellipsis. Used only for the on-screen comic-panel preview;
// exports keep the full text so no student writing is lost.
const smartTruncate = (str, max = 200) => {
  const s = String(str || '');
  if (s.length <= max) return s;
  const slice = s.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
};

// ── Defensive normalizers for UNTRUSTED draft data (imported .json files + restored
//    localStorage). Prevents render crashes from malformed paragraph shapes and closes
//    the stored-XSS vector where imported image URLs are interpolated into export HTML. ──
const MAX_DRAFT_PARAGRAPHS = 8; // mirrors the in-app maxParagraphs cap
const COMIC_SHOT_OPTIONS = [
  { value: '', label: 'Shot' },
  { value: 'wide', label: 'Wide' },
  { value: 'medium', label: 'Medium' },
  { value: 'close-up', label: 'Close-up' },
  { value: 'over-shoulder', label: 'Over shoulder' },
  { value: 'reaction', label: 'Reaction' },
  { value: 'detail', label: 'Detail' },
];
const COMIC_ANGLE_OPTIONS = [
  { value: '', label: 'Angle' },
  { value: 'eye-level', label: 'Eye-level' },
  { value: 'low', label: 'Low angle' },
  { value: 'high', label: 'High angle' },
  { value: 'birds-eye', label: "Bird's-eye" },
  { value: 'worms-eye', label: "Worm's-eye" },
  { value: 'tilted', label: 'Tilted' },
];
const COMIC_MOOD_OPTIONS = [
  { value: '', label: 'Mood' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'tense', label: 'Tense' },
  { value: 'wonder', label: 'Wonder' },
  { value: 'funny', label: 'Funny' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'quiet', label: 'Quiet' },
];
const COMIC_TRANSITION_OPTIONS = [
  { value: '', label: 'Move' },
  { value: 'establish', label: 'Establish' },
  { value: 'action', label: 'Action' },
  { value: 'reaction', label: 'Reaction' },
  { value: 'reveal', label: 'Reveal' },
  { value: 'turn', label: 'Turn' },
  { value: 'quiet', label: 'Quiet Beat' },
  { value: 'resolve', label: 'Resolve' },
];
const COMIC_LETTERING_SPACE_OPTIONS = [
  { value: '', label: 'Lettering space' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left side' },
  { value: 'right', label: 'Right side' },
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'none', label: 'No bubble area' },
];
const COMIC_PANELS_PER_PAGE_OPTIONS = [2, 3, 4, 6];
const COMIC_PAGE_TURN_OPTIONS = [
  { value: '', label: 'Page turn' },
  { value: 'continue', label: 'Continue' },
  { value: 'reveal', label: 'Reveal' },
  { value: 'cliffhanger', label: 'Cliffhanger' },
  { value: 'quiet', label: 'Quiet pause' },
  { value: 'action', label: 'Action surge' },
  { value: 'resolve', label: 'Resolve' },
];
const COMIC_PRINT_FORMATS = {
  digital: { label: 'Digital', trim: 'Screen', safe: 'Flexible safe area' },
  letter: { label: 'Letter Print', trim: '8.5 x 11 in', safe: '0.5 in safe text zone' },
  comic: { label: 'Comic Trim', trim: '6.625 x 10.25 in', safe: '0.25 in safe text zone' },
};
const COMIC_PRINT_GUTTERS = {
  none: { label: 'No gutter', width: 'none' },
  standard: { label: 'Standard gutter', width: '0.25 in' },
  wide: { label: 'Wide gutter', width: '0.375 in' },
};
const COMIC_PANEL_FRAME_OPTIONS = [
  { value: '', label: 'Auto' },
  { value: 'wide', label: 'Wide' },
  { value: 'tall', label: 'Tall' },
  { value: 'full', label: 'Full' },
  { value: 'inset', label: 'Inset' },
];
const COMIC_BUBBLE_WORD_WARNING = 20;
const COMIC_BUBBLE_WORD_LIMIT = 28;
const COMIC_DIRECTION_OPTIONS = {
  shot: COMIC_SHOT_OPTIONS,
  angle: COMIC_ANGLE_OPTIONS,
  mood: COMIC_MOOD_OPTIONS,
  transition: COMIC_TRANSITION_OPTIONS,
};
const normalizeComicDirectionValue = (field, value) => {
  const options = COMIC_DIRECTION_OPTIONS[field] || [];
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const normalized = raw.replace(/['.]/g, '').replace(/\s+/g, '-').replace(/_+/g, '-');
  const match = options.find((opt) => {
    if (!opt.value) return false;
    const labelKey = String(opt.label || '').trim().toLowerCase().replace(/['.]/g, '').replace(/\s+/g, '-').replace(/_+/g, '-');
    return opt.value === normalized || labelKey === normalized;
  });
  return match ? match.value : '';
};
const getComicDirectionLabel = (field, value) => {
  const clean = normalizeComicDirectionValue(field, value);
  const match = (COMIC_DIRECTION_OPTIONS[field] || []).find(opt => opt.value === clean);
  return match ? match.label : '';
};
const normalizeComicLetteringSpace = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/_+/g, '-');
  return COMIC_LETTERING_SPACE_OPTIONS.some(opt => opt.value && opt.value === raw) ? raw : '';
};
const getComicLetteringSpaceLabel = (value) => {
  const clean = normalizeComicLetteringSpace(value);
  const match = COMIC_LETTERING_SPACE_OPTIONS.find(opt => opt.value === clean);
  return match ? match.label : '';
};
const getComicLetteringSpaceClass = (value) => {
  const clean = normalizeComicLetteringSpace(value);
  return clean ? `lettering-space-${clean}` : 'lettering-space-unset';
};
const getComicLetteringPreviewFlexClass = (value) => {
  const clean = normalizeComicLetteringSpace(value);
  const map = {
    top: 'items-start justify-center',
    bottom: 'items-end justify-center',
    left: 'items-center justify-start',
    right: 'items-center justify-end',
    'top-left': 'items-start justify-start',
    'top-right': 'items-start justify-end',
    'bottom-left': 'items-end justify-start',
    'bottom-right': 'items-end justify-end',
  };
  return map[clean] || 'items-start justify-center';
};
const clampComicLetteringPercent = (value, fallback = 50) => {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : fallback;
  return Math.max(8, Math.min(92, Math.round(safe * 10) / 10));
};
const clampComicLetteringWidth = (value, fallback = 72) => {
  const n = value === null || value === '' ? NaN : Number(value);
  const safe = Number.isFinite(n) ? n : fallback;
  return Math.max(28, Math.min(86, Math.round(safe * 10) / 10));
};
const isFiniteComicLetteringValue = (value) => value !== null && value !== '' && Number.isFinite(Number(value));
const hasComicLetteringPosition = (rough = {}) => isFiniteComicLetteringValue(rough.letteringX) && isFiniteComicLetteringValue(rough.letteringY);
const hasComicLetteringWidth = (rough = {}) => isFiniteComicLetteringValue(rough.letteringWidth);
const getComicLetteringPosition = (rough = {}, space = 'top') => {
  if (hasComicLetteringPosition(rough)) {
    return {
      x: clampComicLetteringPercent(rough.letteringX),
      y: clampComicLetteringPercent(rough.letteringY),
    };
  }
  const clean = normalizeComicLetteringSpace(space);
  const anchors = {
    top: { x: 50, y: 18 },
    bottom: { x: 50, y: 82 },
    left: { x: 22, y: 50 },
    right: { x: 78, y: 50 },
    'top-left': { x: 24, y: 22 },
    'top-right': { x: 76, y: 22 },
    'bottom-left': { x: 24, y: 78 },
    'bottom-right': { x: 76, y: 78 },
  };
  return anchors[clean] || anchors.top;
};
const getComicLetteringPositionStyle = (rough = {}, space = 'top') => {
  const pos = getComicLetteringPosition(rough, space);
  return { left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' };
};
const getComicLetteringPositionStyleText = (rough = {}, space = 'top') => {
  const pos = getComicLetteringPosition(rough, space);
  return `left:${pos.x}%;top:${pos.y}%;transform:translate(-50%,-50%);`;
};
const getComicLetteringWidthStyle = (rough = {}) => hasComicLetteringWidth(rough)
  ? { width: `${clampComicLetteringWidth(rough.letteringWidth)}%`, maxWidth: `${clampComicLetteringWidth(rough.letteringWidth)}%` }
  : {};
const getComicLetteringWidthStyleText = (rough = {}) => hasComicLetteringWidth(rough)
  ? `width:${clampComicLetteringWidth(rough.letteringWidth)}%;max-width:${clampComicLetteringWidth(rough.letteringWidth)}%;`
  : '';
const getComicReadingOrderLabel = (layout) => layout === 'manga' ? 'Read right-to-left' : 'Read left-to-right';
const normalizeComicPageTurn = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/_+/g, '-');
  return COMIC_PAGE_TURN_OPTIONS.some(opt => opt.value && opt.value === raw) ? raw : '';
};
const getComicPageTurnLabel = (value) => {
  const clean = normalizeComicPageTurn(value);
  const match = COMIC_PAGE_TURN_OPTIONS.find(opt => opt.value === clean);
  return match ? match.label : '';
};
const sanitizeComicPrintSafety = (obj) => {
  const source = (obj && typeof obj === 'object') ? obj : {};
  const format = COMIC_PRINT_FORMATS[source.format] ? source.format : 'letter';
  const gutter = COMIC_PRINT_GUTTERS[source.gutter] ? source.gutter : (format === 'digital' ? 'none' : 'standard');
  return {
    format,
    gutter: format === 'digital' ? 'none' : gutter,
    showGuides: source.showGuides !== false,
    includeBleed: format !== 'digital' && source.includeBleed !== false,
  };
};
const getComicPrintFormatLabel = (format) => COMIC_PRINT_FORMATS[format]?.label || COMIC_PRINT_FORMATS.letter.label;
const getComicPrintGutterLabel = (gutter) => COMIC_PRINT_GUTTERS[gutter]?.label || COMIC_PRINT_GUTTERS.standard.label;
const getComicPageGutterSide = (pageNo, layout, printSafety) => {
  const safety = sanitizeComicPrintSafety(printSafety);
  if (safety.format === 'digital' || safety.gutter === 'none') return '';
  const mangaFlow = layout === 'manga';
  if (mangaFlow) return pageNo % 2 === 1 ? 'right' : 'left';
  return pageNo % 2 === 1 ? 'left' : 'right';
};
const letteringTouchesSide = (space, side) => {
  const clean = normalizeComicLetteringSpace(space);
  if (!clean || !side || clean === 'none') return false;
  return clean === side || clean.endsWith(`-${side}`);
};
const normalizeComicPanelFrame = (value) => {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/_+/g, '-');
  return COMIC_PANEL_FRAME_OPTIONS.some(opt => opt.value && opt.value === raw) ? raw : '';
};
const getComicPanelFrameLabel = (value) => {
  const clean = normalizeComicPanelFrame(value);
  const match = COMIC_PANEL_FRAME_OPTIONS.find(opt => opt.value === clean);
  return match ? match.label : 'Auto';
};
const getComicPanelFrameClass = (value) => {
  const clean = normalizeComicPanelFrame(value);
  return clean ? `panel-frame-${clean}` : 'panel-frame-auto';
};
const getComicPanelFramePreviewClass = (value) => {
  const clean = normalizeComicPanelFrame(value);
  if (clean === 'wide' || clean === 'full') return 'col-span-2';
  if (clean === 'tall') return 'row-span-2';
  if (clean === 'inset') return 'm-3';
  return '';
};
const clampComicPanelSpan = (value) => Math.max(1, Math.min(2, Number(value) || 1));
const getComicPanelLayoutSpans = (panelLayout = {}, pageLayout = 'grid', idx = 0) => {
  const layout = (panelLayout && typeof panelLayout === 'object') ? panelLayout : {};
  const frame = normalizeComicPanelFrame(layout.frame);
  const hasCustomCol = layout.colSpan !== undefined && layout.colSpan !== null;
  const hasCustomRow = layout.rowSpan !== undefined && layout.rowSpan !== null;
  let colSpan = frame === 'wide' || frame === 'full' ? 2 : 1;
  let rowSpan = frame === 'tall' || frame === 'full' ? 2 : 1;
  if (!frame && pageLayout === 'splash' && idx === 0) colSpan = 2;
  if (hasCustomCol) colSpan = clampComicPanelSpan(layout.colSpan);
  if (hasCustomRow) rowSpan = clampComicPanelSpan(layout.rowSpan);
  if (pageLayout === 'strip') colSpan = 1;
  return { colSpan, rowSpan };
};
const getComicPanelGridStyle = (panelLayout = {}, pageLayout = 'grid', idx = 0) => {
  const { colSpan, rowSpan } = getComicPanelLayoutSpans(panelLayout, pageLayout, idx);
  return { gridColumn: `span ${colSpan}`, gridRow: `span ${rowSpan}` };
};
const getComicPanelGridStyleText = (panelLayout = {}, pageLayout = 'grid', idx = 0) => {
  const { colSpan, rowSpan } = getComicPanelLayoutSpans(panelLayout, pageLayout, idx);
  return `grid-column:span ${colSpan};grid-row:span ${rowSpan};`;
};
const getComicPanelSpanLabel = (panelLayout = {}, pageLayout = 'grid', idx = 0) => {
  const { colSpan, rowSpan } = getComicPanelLayoutSpans(panelLayout, pageLayout, idx);
  return `${colSpan}x${rowSpan}`;
};
const isComicPanelWideFrame = (panelLayout = {}, layout, idx) => {
  const spans = getComicPanelLayoutSpans(panelLayout, layout, idx);
  return spans.colSpan > 1 || layout === 'strip';
};
const countWords = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;
const getComicLetteringStats = (dialogue = {}) => {
  const speechWords = countWords(dialogue.speech);
  const thoughtWords = countWords(dialogue.thought);
  const sfxWords = countWords(dialogue.sfx);
  const words = speechWords + thoughtWords + sfxWords;
  const level = words > COMIC_BUBBLE_WORD_LIMIT ? 'crowded' : words > COMIC_BUBBLE_WORD_WARNING ? 'watch' : 'clear';
  const label = level === 'crowded' ? 'Crowded' : level === 'watch' ? 'Watch' : 'Clear';
  const detail = level === 'crowded'
    ? 'Trim or split this panel so the lettering stays readable.'
    : level === 'watch'
      ? 'Readable, but close to the panel lettering limit.'
      : 'Good breathing room for bubbles and art.';
  return { words, speechWords, thoughtWords, sfxWords, level, label, detail, limit: COMIC_BUBBLE_WORD_LIMIT };
};
const comicDialogueHasBubbles = (dialogue = {}) => Boolean(
  String(dialogue.speech || '').trim() ||
  String(dialogue.thought || '').trim() ||
  String(dialogue.sfx || '').trim()
);
const getComicAutoLetteringSpace = (pageLayout = 'grid', pageIndex = 0, gutterSide = '') => {
  const patterns = {
    grid: ['top', 'bottom', 'top-right', 'bottom-left', 'top-left', 'bottom-right'],
    splash: ['top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
    strip: ['top', 'bottom', 'top-right', 'bottom-left', 'top-left', 'bottom-right'],
    manga: ['top-right', 'bottom-right', 'top', 'bottom', 'top-left', 'bottom-left'],
  };
  const options = patterns[pageLayout] || patterns.grid;
  const preferred = options[Math.max(0, Number(pageIndex) || 0) % options.length];
  if (!letteringTouchesSide(preferred, gutterSide)) return preferred;
  return options.find(space => !letteringTouchesSide(space, gutterSide)) || 'top';
};
const getComicPageProductionStats = (page = {}, context = {}) => {
  const panels = Array.isArray(page.panels) ? page.panels : [];
  const total = panels.length;
  const printSafety = sanitizeComicPrintSafety(context.comicPrintSafety);
  const gutterSide = getComicPageGutterSide(page.page, page.layout, printSafety);
  const stats = {
    total,
    artPanels: 0,
    bubblePanels: 0,
    placedBubbles: 0,
    crowdedBubbles: 0,
    unplacedBubbles: 0,
    gutterRiskPanels: 0,
    emptyPanels: 0,
    customLayouts: 0,
    attention: 0,
    status: 'Setup',
  };
  panels.forEach(({ paragraph }) => {
    const id = paragraph?.id;
    const dialogue = (context.panelDialogue || {})[id] || {};
    const thumbnail = (context.panelThumbnails || {})[id] || {};
    const layout = (context.panelLayouts || {})[id] || {};
    const image = (context.illustrations || {})[id] || {};
    const lettering = getComicLetteringStats(dialogue);
    const space = normalizeComicLetteringSpace(thumbnail.letteringSpace);
    const hasBubbles = comicDialogueHasBubbles(dialogue);
    const hasText = String(paragraph?.text || paragraph?.scaffoldFrame || '').trim();
    if (image.imageUrl) stats.artPanels += 1;
    if (hasBubbles) stats.bubblePanels += 1;
    if (hasBubbles && space && space !== 'none') stats.placedBubbles += 1;
    if (hasBubbles && (!space || space === 'none')) stats.unplacedBubbles += 1;
    if (hasBubbles && letteringTouchesSide(space, gutterSide)) stats.gutterRiskPanels += 1;
    if (lettering.level === 'crowded') stats.crowdedBubbles += 1;
    if (!hasText) stats.emptyPanels += 1;
    if (layout.frame || layout.colSpan !== undefined || layout.rowSpan !== undefined) stats.customLayouts += 1;
  });
  stats.attention = stats.unplacedBubbles + stats.gutterRiskPanels + stats.crowdedBubbles + stats.emptyPanels;
  stats.status = stats.attention > 0 ? 'Review' : stats.artPanels === total && total > 0 ? 'Ready' : 'Clean';
  return stats;
};
const sanitizeParagraphs = (arr) => {
  if (!Array.isArray(arr)) return null;
  const cleaned = arr.slice(0, MAX_DRAFT_PARAGRAPHS).map((p, i) => ({
    id: (p && typeof p.id === 'string' && p.id) ? p.id : `p-${i}`,
    text: (p && typeof p.text === 'string') ? p.text : '',
    scaffoldFrame: (p && typeof p.scaffoldFrame === 'string') ? p.scaffoldFrame : '',
    plotBeat: (p && typeof p.plotBeat === 'string') ? p.plotBeat : '',
  }));
  return cleaned.length > 0 ? cleaned : [{ id: 'p-0', text: '', scaffoldFrame: '', plotBeat: '' }];
};
// Only inline data-image URIs or http(s) URLs are allowed; everything else (javascript:,
// quote-bearing breakout attempts, etc.) becomes '' so it can't poison the export <img src>.
const safeImageUrl = (u) => (typeof u === 'string' && /^(data:image\/|https?:\/\/)/i.test(u)) ? u : '';
const sanitizeIllustrations = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (!v || typeof v !== 'object') return;
    const url = safeImageUrl(v.imageUrl);
    if (url) out[k] = { imageUrl: url, prompt: typeof v.prompt === 'string' ? v.prompt : '' };
  });
  return out;
};
const sanitizeVocabTerms = (arr) => Array.isArray(arr)
  ? arr.filter((v) => v && typeof v.term === 'string').map((v) => ({ term: v.term, definition: typeof v.definition === 'string' ? v.definition : '' }))
  : null;

const sanitizePanelDialogue = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  Object.keys(obj).slice(0, MAX_DRAFT_PARAGRAPHS).forEach((k) => {
    const key = String(k || '').slice(0, 64);
    const v = obj[k];
    if (!key || !v || typeof v !== 'object') return;
    const clean = {};
    if (typeof v.speaker === 'string' && v.speaker.trim()) clean.speaker = v.speaker.slice(0, 80);
    if (typeof v.speech === 'string' && v.speech.trim()) clean.speech = v.speech.slice(0, 500);
    if (typeof v.thought === 'string' && v.thought.trim()) clean.thought = v.thought.slice(0, 500);
    if (typeof v.sfx === 'string' && v.sfx.trim()) clean.sfx = v.sfx.slice(0, 32);
    if (Object.keys(clean).length) out[key] = clean;
  });
  return out;
};

const sanitizePanelDirections = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  Object.keys(obj).slice(0, MAX_DRAFT_PARAGRAPHS).forEach((k) => {
    const key = String(k || '').slice(0, 64);
    const v = obj[k];
    if (!key || !v || typeof v !== 'object') return;
    const clean = {};
    ['shot', 'angle', 'mood', 'transition'].forEach((field) => {
      const value = normalizeComicDirectionValue(field, v[field]);
      if (value) clean[field] = value;
    });
    if (Object.keys(clean).length) out[key] = clean;
  });
  return out;
};

const sanitizeComicContinuity = (obj) => {
  if (!obj || typeof obj !== 'object') return { cast: '', setting: '', palette: '', styleNotes: '' };
  return {
    cast: typeof obj.cast === 'string' ? obj.cast.slice(0, 900) : '',
    setting: typeof obj.setting === 'string' ? obj.setting.slice(0, 600) : '',
    palette: typeof obj.palette === 'string' ? obj.palette.slice(0, 300) : '',
    styleNotes: typeof obj.styleNotes === 'string' ? obj.styleNotes.slice(0, 600) : '',
  };
};

const sanitizePanelThumbnails = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  Object.keys(obj).slice(0, MAX_DRAFT_PARAGRAPHS).forEach((k) => {
    const key = String(k || '').slice(0, 64);
    const v = obj[k];
    if (!key || !v || typeof v !== 'object') return;
    const clean = {};
    if (typeof v.focalPoint === 'string' && v.focalPoint.trim()) clean.focalPoint = v.focalPoint.slice(0, 180);
    if (typeof v.composition === 'string' && v.composition.trim()) clean.composition = v.composition.slice(0, 240);
    if (typeof v.sketchNote === 'string' && v.sketchNote.trim()) clean.sketchNote = v.sketchNote.slice(0, 260);
    const space = normalizeComicLetteringSpace(v.letteringSpace);
    if (space) clean.letteringSpace = space;
    if (isFiniteComicLetteringValue(v.letteringWidth)) clean.letteringWidth = clampComicLetteringWidth(v.letteringWidth);
    if (isFiniteComicLetteringValue(v.letteringX) && isFiniteComicLetteringValue(v.letteringY)) {
      clean.letteringX = clampComicLetteringPercent(v.letteringX);
      clean.letteringY = clampComicLetteringPercent(v.letteringY);
    }
    if (Object.keys(clean).length) out[key] = clean;
  });
  return out;
};

const sanitizePanelStickers = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  Object.keys(obj).slice(0, MAX_DRAFT_PARAGRAPHS).forEach((k) => {
    const key = String(k || '').slice(0, 64);
    const value = obj[k];
    if (!key || typeof value !== 'string' || !value.trim()) return;
    out[key] = value.slice(0, 16);
  });
  return out;
};

// ── Vocab term detection with word-boundary awareness ──
// True if `term` appears as a whole word (not a substring) in `text`, case-insensitive —
// so "cat" no longer matches "category". Term is regex-escaped first.
const sanitizePanelLayouts = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  Object.keys(obj).slice(0, MAX_DRAFT_PARAGRAPHS).forEach((k) => {
    const key = String(k || '').slice(0, 64);
    const value = obj[k];
    if (!key || !value || typeof value !== 'object') return;
    const clean = {};
    const frame = normalizeComicPanelFrame(value.frame);
    if (frame) clean.frame = frame;
    if (value.colSpan !== undefined && value.colSpan !== null) clean.colSpan = clampComicPanelSpan(value.colSpan);
    if (value.rowSpan !== undefined && value.rowSpan !== null) clean.rowSpan = clampComicPanelSpan(value.rowSpan);
    if (Object.keys(clean).length) out[key] = clean;
  });
  return out;
};

const sanitizeComicPageComposer = (obj) => {
  const source = (obj && typeof obj === 'object') ? obj : {};
  const rawPanelsPerPage = Number(source.panelsPerPage);
  const panelsPerPage = COMIC_PANELS_PER_PAGE_OPTIONS.includes(rawPanelsPerPage) ? rawPanelsPerPage : 4;
  const sourcePages = (source.pages && typeof source.pages === 'object') ? source.pages : {};
  const pages = {};
  Object.keys(sourcePages).slice(0, MAX_DRAFT_PARAGRAPHS).forEach((k) => {
    const pageNo = Math.max(1, Math.min(MAX_DRAFT_PARAGRAPHS, parseInt(k, 10) || 0));
    const value = sourcePages[k];
    if (!pageNo || !value || typeof value !== 'object') return;
    const clean = {};
    if (COMIC_PAGE_LAYOUTS[value.layout]) clean.layout = value.layout;
    const turn = normalizeComicPageTurn(value.turn);
    if (turn) clean.turn = turn;
    if (typeof value.note === 'string' && value.note.trim()) clean.note = value.note.slice(0, 260);
    if (Object.keys(clean).length) pages[String(pageNo)] = clean;
  });
  return { panelsPerPage, pages };
};

const termUsed = (text, term) => {
  if (!text || !term) return false;
  const escaped = String(term).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!escaped) return false;
  try { return new RegExp(`\\b${escaped}\\b`, 'i').test(text); }
  catch (e) { return text.toLowerCase().includes(String(term).toLowerCase()); }
};

// RTL writing-system detection for export <html dir> (only Arabic is selectable in
// LANG_OPTIONS, but a custom 'other' language could be RTL too).
const isRtl = (langCode) => {
  const code = String(langCode || '').split('-')[0].toLowerCase();
  return ['ar', 'he', 'fa', 'ps', 'ur', 'sd', 'ug', 'yi'].includes(code);
};

const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const sharedResultPromiseRef = useRef(null); // Phase 3v.MR — shared-path result promise
  const chunksRef = useRef([]);
  const startRecording = async () => {
    // Phase 3v.MR — shared module path with inline fallback. The shared
    // controller exposes result as a Promise that resolves on stop().
    // We store the promise on a ref so stopRecording can await it.
    if (window.AlloFlowVoice && typeof window.AlloFlowVoice.recordAudioBlob === 'function') {
      const ctrl = window.AlloFlowVoice.recordAudioBlob({
        // No maxDurationMs — caller drives stop. The shared default
        // (60s) would change behavior for callers that expect arbitrary
        // length recording. Use a generous 10-minute cap as a safety net.
        maxDurationMs: 10 * 60 * 1000,
        preferredMimeType: 'audio/webm;codecs=opus',
        onError: (err) => {
          console.warn('Microphone access denied:', err);
          setIsRecording(false);
        }
      });
      if (!ctrl.supported) {
        console.warn('MediaRecorder not supported');
        return;
      }
      mediaRecorderRef.current = ctrl;
      sharedResultPromiseRef.current = ctrl.result;
      setIsRecording(true);
      return;
    }
    // Inline fallback (pre-3v.MR behavior, identical)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      sharedResultPromiseRef.current = null;
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access denied:', err);
    }
  };
  const stopRecording = () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) return resolve(null);
      // Shared-module path: controller has isRecording() + .result Promise
      if (sharedResultPromiseRef.current && typeof mediaRecorderRef.current.isRecording === 'function') {
        const ctrl = mediaRecorderRef.current;
        const promise = sharedResultPromiseRef.current;
        try { ctrl.stop(); } catch (e) { /* ignore */ }
        promise.then(async (rec) => {
          if (!rec || !rec.base64) { setIsRecording(false); return resolve(null); }
          const dataUri = rec.base64;
          const bare = dataUri.split(',')[1] || dataUri;
          const mimeType = rec.mimeType || 'audio/webm';
          // Reconstruct a Blob URL via fetch() so callers that revoke
          // it later (or pipe it into <audio src=blob:...>) get the
          // same blob-URL flavor the legacy path produced.
          let url;
          try {
            const blob = await fetch(dataUri).then((r) => r.blob());
            url = URL.createObjectURL(blob);
          } catch (e) {
            // If fetch on a data URI fails for any reason, the data URI
            // itself works as <audio src> in modern browsers.
            url = dataUri;
          }
          setIsRecording(false);
          resolve({ url, base64: bare, mimeType });
        }).catch(() => {
          setIsRecording(false);
          resolve(null);
        });
        return;
      }
      // Inline-fallback path
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve({ url, base64, mimeType: 'audio/webm' });
        };
        setIsRecording(false);
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.stop();
    });
  };
  return { isRecording, startRecording, stopRecording };
};

// ── Speech-to-text dictation hook ──
const useDictation = (onTranscript, lang) => {
  const [isDictating, setIsDictating] = useState(false);
  const isDictatingRef = useRef(false);
  const recognitionRef = useRef(null);
  const startDictation = () => {
    // Phase 3v.M — shared module path with inline fallback. The shared
    // path uses restartOnEnd:true so the recursive restart (legacy
    // line: recognitionRef.current.start() in onend) is handled inside
    // the controller. The onRichResult callback forwards only final
    // text via onTranscript, matching the original useDictation
    // contract that callers rely on.
    if (window.AlloFlowVoice && typeof window.AlloFlowVoice.initWebSpeechCapture === 'function') {
      // Note: NOT using restartOnEnd:true here — that would restart even
      // after user-initiated stop. We replicate the legacy manual-restart
      // pattern: on natural end (browser silence timeout) we re-start
      // ourselves only if the user hasn't called stopDictation; on user
      // stop we let the controller stay stopped.
      let ctrlRef = null;
      const handleEnd = () => {
        if (ctrlRef && recognitionRef.current === ctrlRef && isDictatingRef.current) {
          try { ctrlRef.start(); }
          catch (e) {
            isDictatingRef.current = false;
            setIsDictating(false);
          }
        }
      };
      const ctrl = window.AlloFlowVoice.initWebSpeechCapture({
        lang: lang || 'en-US',
        continuous: true,
        interimResults: true,
        onRichResult: ({ final }) => {
          if (final && onTranscript) onTranscript(final);
        },
        onError: () => {
          isDictatingRef.current = false;
          setIsDictating(false);
        },
        onEnd: handleEnd
      });
      if (!ctrl.supported) return;
      ctrlRef = ctrl;
      if (ctrl.start()) {
        recognitionRef.current = ctrl;
        isDictatingRef.current = true;
        setIsDictating(true);
      }
      return;
    }
    // Inline fallback (pre-3v.M behavior, identical)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang || 'en-US';
    recognition.onresult = (event) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
      }
      if (final && onTranscript) onTranscript(final);
    };
    recognition.onerror = () => { isDictatingRef.current = false; setIsDictating(false); };
    recognition.onend = () => {
      if (recognitionRef.current && isDictatingRef.current) {
        try { recognitionRef.current.start(); } catch(e) { isDictatingRef.current = false; setIsDictating(false); }
      }
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch(e) { /* already started */ }
    isDictatingRef.current = true;
    setIsDictating(true);
  };
  const stopDictation = () => {
    isDictatingRef.current = false;
    if (recognitionRef.current) {
      // The shared-module controller handles its own end cleanup;
      // the inline-fallback rec needs the legacy onend-clearing trick
      // to prevent the restart-on-end recursion from re-entering.
      if (recognitionRef.current.onend !== undefined) {
        try { recognitionRef.current.onend = null; } catch (e) { /* shared ctrl: noop */ }
      }
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsDictating(false);
  };
  return { isDictating, startDictation, stopDictation };
};

// ── Reduced motion detection ──
const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (mq) {
      setPrefersReduced(mq.matches);
      const handler = (e) => setPrefersReduced(e.matches);
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    }
  }, []);
  return prefersReduced;
};

// ── Host theme mirror ──
// StoryForge renders OUTSIDE the host app's themed <main id="main-content"> (it is a
// sibling modal), so the host's `.theme-dark` / `.theme-contrast` descendant CSS rules
// never cascade into it. We read the host's active theme off #main-content's class list
// and mirror it onto our own modal root, so those existing global rules style StoryForge
// too. A MutationObserver re-reads on change (e.g. the in-modal theme toggle) so the
// module restyles live, without needing a `theme` prop threaded from the host.
const readHostTheme = () => {
  try {
    if (typeof document === 'undefined') return 'default';
    const el = document.getElementById('main-content') || document.body;
    const cls = (el && el.className) || '';
    if (/\btheme-contrast\b/.test(cls)) return 'contrast';
    if (/\btheme-dark\b/.test(cls)) return 'dark';
  } catch (e) { /* SSR / locked-down DOM — fall through to default */ }
  return 'default';
};
const useHostTheme = () => {
  const [hostTheme, setHostTheme] = useState(readHostTheme);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const update = () => setHostTheme(readHostTheme());
    update();
    const target = document.getElementById('main-content') || document.body;
    if (!target || typeof MutationObserver === 'undefined') return undefined;
    const mo = new MutationObserver(update);
    mo.observe(target, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return hostTheme;
};

const LAYOUT_MODES = {
  'prose': { label: 'Prose', emoji: '📄', desc: 'Traditional paragraph layout', writeBg: 'bg-white', writeBorder: 'border-slate-200', accent: 'rose' },
  'comic': { label: 'Comic', emoji: '💬', desc: 'Panel grid with speech bubbles', writeBg: 'bg-slate-50', writeBorder: 'border-slate-800', accent: 'blue' },
  'journal': { label: 'Journal', emoji: '📓', desc: 'Lined notebook diary style', writeBg: 'bg-amber-50', writeBorder: 'border-amber-300', accent: 'amber' },
  'dark': { label: 'Dark', emoji: '🌙', desc: 'Dark mode cyberpunk aesthetic', writeBg: 'bg-slate-900', writeBorder: 'border-slate-600', accent: 'cyan' },
};

const COMIC_PAGE_LAYOUTS = {
  grid: { label: 'Grid', desc: 'Balanced two-column page for most short comics.' },
  strip: { label: 'Strip', desc: 'One panel per row for newspaper-strip pacing.' },
  splash: { label: 'Splash Lead', desc: 'Large opening panel followed by smaller story beats.' },
  manga: { label: 'Manga Flow', desc: 'Right-to-left panel flow for manga-style reading practice.' },
};
const getComicPageLayoutLabel = (layout) => (COMIC_PAGE_LAYOUTS[layout]?.label || COMIC_PAGE_LAYOUTS.grid.label);
const buildComicPageGroups = (paragraphs = [], composer = {}, fallbackLayout = 'grid') => {
  const clean = sanitizeComicPageComposer(composer);
  const safeLayout = COMIC_PAGE_LAYOUTS[fallbackLayout] ? fallbackLayout : 'grid';
  const panelsPerPage = Math.max(1, clean.panelsPerPage || 4);
  const groups = [];
  for (let start = 0; start < paragraphs.length; start += panelsPerPage) {
    const pageNo = groups.length + 1;
    const pageMeta = clean.pages[String(pageNo)] || {};
    const layout = COMIC_PAGE_LAYOUTS[pageMeta.layout] ? pageMeta.layout : safeLayout;
    const items = paragraphs.slice(start, start + panelsPerPage).map((paragraph, offset) => ({
      paragraph,
      idx: start + offset,
    }));
    groups.push({
      page: pageNo,
      startPanel: start + 1,
      endPanel: start + items.length,
      panels: items,
      layout,
      turn: normalizeComicPageTurn(pageMeta.turn),
      note: pageMeta.note || '',
    });
  }
  return groups;
};

const VOICE_POOL = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr'];

const ART_STYLE_MAP = {
  'storybook': 'Soft watercolor storybook illustration, rounded shapes, warm palette, family-friendly, whimsical',
  'pixel': '16-bit pixel art retro game style, vibrant colors, clean sprites, nostalgic',
  'cinematic': 'Cinematic digital painting, dramatic lighting, widescreen composition, photorealistic',
  'anime': 'Anime-style illustration, clean linework, expressive characters, vibrant colors, manga-inspired',
  'crayon': "Children's hand-drawn crayon illustration, simple and colorful, playful, sketchy lines",
};

const GENRE_TEMPLATES = {
  'free': { label: 'Free Write', emoji: '✏️', scaffoldHint: '' },
  'adventure': { label: 'Adventure', emoji: '🗺️ºï¸', scaffoldHint: 'an exciting adventure story with a quest, obstacles, and a triumphant ending' },
  'mystery': { label: 'Mystery', emoji: '🔍', scaffoldHint: 'a mystery story with clues, a suspect, suspense, and a surprising reveal' },
  'fairy-tale': { label: 'Fairy Tale', emoji: '🏰°', scaffoldHint: 'a fairy tale with magical elements, a hero, a villain, and a moral lesson' },
  'sci-fi': { label: 'Sci-Fi', emoji: '🚀', scaffoldHint: 'a science fiction story set in the future or space with technology and discovery' },
  'historical': { label: 'Historical', emoji: '📜', scaffoldHint: 'a historical fiction story set in a real time period with accurate details and a fictional character' },
  'persuasive': { label: 'Persuasive Narrative', emoji: '💬', scaffoldHint: 'a persuasive narrative that argues a point through a character\'s experience and storytelling' },
};

const SAVE_KEY_BASE = 'alloflow_storyforge_draft';

// Narrative beat options for the per-paragraph Plot Structure dropdown.
// Empty value means "unset" — students can leave blank.
const PLOT_BEATS = [
  { value: '', label: '— Choose beat —' },
  { value: 'setup', label: 'Setup' },
  { value: 'inciting', label: 'Inciting Incident' },
  { value: 'rising', label: 'Rising Action' },
  { value: 'climax', label: 'Climax' },
  { value: 'falling', label: 'Falling Action' },
  { value: 'resolution', label: 'Resolution' },
];

// ── Story Shapes (Kurt Vonnegut's "Shapes of Stories" — fortune plotted over time) ──
// A craft LENS, not a fixed taxonomy. The six below align with both Vonnegut's shapes and
// the six emotional arcs Reagan et al. (2016) found empirically across ~1,300 stories.
// `curve` is a 0-1 fortune sparkline (low→high); `scaffoldHint` steers the AI scaffold prompt.
const STORY_SHAPES = {
  manInHole:      { label: 'Man in a Hole', emoji: '🕳️³ï¸', desc: 'Things are okay — then trouble — then the hero climbs out stronger.', curve: [0.65, 0.45, 0.15, 0.5, 0.85], scaffoldHint: 'an emotional shape where the character starts in an okay place, falls into real trouble in the middle, then climbs out better off than they began (a fall, then a rise)' },
  cinderella:     { label: 'Cinderella', emoji: '👑', desc: 'Up, then a sudden setback, then better than ever.', curve: [0.25, 0.55, 0.8, 0.2, 0.95], scaffoldHint: 'a rise–fall–rise shape: things improve, a sudden setback dashes hopes, then a turnaround ends higher than ever' },
  boyMeetsGirl:   { label: 'Boy Meets Girl', emoji: '💞', desc: 'Find something wonderful, lose it, then win it back.', curve: [0.45, 0.85, 0.2, 0.9], scaffoldHint: 'the character gains something wonderful, loses it, and finally gets it back (up, down, up)' },
  ragsToRiches:   { label: 'Rags to Riches', emoji: '📈', desc: 'A steady climb — things keep getting better.', curve: [0.15, 0.4, 0.65, 0.9], scaffoldHint: 'a steady rise from a hard or low start to a happy, successful ending (mostly upward)' },
  icarus:         { label: 'Icarus', emoji: '🪽', desc: 'A great rise — then a fall. A cautionary tale.', curve: [0.2, 0.55, 0.9, 0.5, 0.15], scaffoldHint: 'a rise then a fall: things soar, but risk or mistakes bring a downturn by the end (up, then down)' },
  fromBadToWorse: { label: 'From Bad to Worse', emoji: '🌧️§ï¸', desc: 'A hard start that gets harder — ending on a hard-won lesson.', curve: [0.55, 0.4, 0.25, 0.12], scaffoldHint: 'a downward shape where the situation steadily worsens; end on a reflective, hard-won lesson rather than a tidy happy ending' },
};

// Resample a 0-1 curve to K points via linear interpolation (so curves of different
// lengths can be compared point-for-point).
const _resampleCurve = (curve, K) => {
  if (!curve || curve.length === 0) return new Array(K).fill(0.5);
  if (curve.length === 1) return new Array(K).fill(curve[0]);
  const out = [];
  for (let i = 0; i < K; i++) {
    const t = (i / (K - 1)) * (curve.length - 1);
    const lo = Math.floor(t), hi = Math.ceil(t), frac = t - lo;
    out.push(curve[lo] * (1 - frac) + curve[hi] * frac);
  }
  return out;
};
// Match a student's fortune curve (values normalized 0-1) to the nearest named shape.
// Returns null if too short to judge; flags `weak` when the match is only loose.
const closestStoryShape = (norm) => {
  if (!norm || norm.length < 3) return null;
  const K = 24;
  const s = _resampleCurve(norm, K);
  let best = null;
  Object.entries(STORY_SHAPES).forEach(([key, sh]) => {
    const r = _resampleCurve(sh.curve, K);
    const mse = s.reduce((acc, v, i) => acc + Math.pow(v - r[i], 2), 0) / K;
    if (!best || mse < best.mse) best = { key, label: sh.label, emoji: sh.emoji, mse };
  });
  if (!best) return null;
  return best.mse <= 0.06 ? best : { ...best, weak: true }; // RMSE ~0.24 cutoff for a confident match
};

const STORY_STARTERS = {
  'adventure': [
    'The map had been hidden in the library for a hundred years — until today.',
    'Nobody believed the old bridge led anywhere, but I had to find out.',
    'The compass needle spun wildly, then pointed somewhere no compass should point.',
  ],
  'mystery': [
    'The classroom was empty, but someone had left a coded message on the whiteboard.',
    'Every night at exactly 8:13 PM, the light in the abandoned house flickered on.',
    'The package arrived with no return address — and it was addressed to someone who didn\'t exist.',
  ],
  'fairy-tale': [
    'In a kingdom where music was forbidden, one child hummed a melody that changed everything.',
    'The old tree in the garden spoke only to those who asked the right question.',
    'Once upon a time, a girl found a door in the forest that only appeared on rainy days.',
  ],
  'sci-fi': [
    'The new student at school wasn\'t from another country — they were from another century.',
    'When the power grid went dark, the robots didn\'t shut down. They woke up.',
    'The telescope showed a planet that wasn\'t on any map — and it was getting closer.',
  ],
  'historical': [
    'The year was 1776, and a young apprentice overheard something that could change history.',
    'The ship had been at sea for forty days when they spotted land no explorer had charted.',
    'In the heart of the ancient city, a child discovered a scroll that rewrote everything scholars believed.',
  ],
  'persuasive': [
    'Everyone told Maya her idea was impossible — but she had evidence they hadn\'t seen.',
    'The town council was about to make a decision that would affect every student, and one voice rose to speak.',
    'After what happened at recess, I knew I had to convince my classmates that things needed to change.',
  ],
};

// ── Reading level calculation ──
const computeReadingLevel = (text) => {
  if (!text || text.trim().length < 20) return null;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((sum, word) => {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return sum + 1;
    let count = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').match(/[aeiouy]{1,2}/g);
    return sum + Math.max(1, count ? count.length : 1);
  }, 0);
  if (sentences.length === 0 || words.length === 0) return null;
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  const fkGrade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  return {
    grade: Math.max(0, Math.min(18, Math.round(fkGrade * 10) / 10)), // clamp to [0,18]; FK is meaningless past ~grade 18 (matches doc_pipeline)
    sentences: sentences.length,
    words: words.length,
    syllables,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
  };
};

// Map a grade-level LABEL (e.g. 'Kindergarten', 'K', 'Pre-K', '5th Grade', 'Grade 5', 'College')
// to a numeric grade for comparison. Returns null when the label can't be interpreted, so
// callers can omit an on/above-target verdict rather than show a misleading one.
// (parseInt('Kindergarten') is NaN, which silently broke the old comparison → always "above target".)
const gradeLevelToNumber = (label) => {
  if (typeof label !== 'string') return null;
  const s = label.trim().toLowerCase();
  if (s.startsWith('pre')) return 0;                 // Pre-K
  if (s === 'k' || s.startsWith('kinder')) return 0; // Kindergarten
  if (s.includes('college')) return 13;
  const m = s.match(/\d+/);                          // '5th Grade', 'Grade 5', '5'
  return m ? parseInt(m[0], 10) : null;
};

// ── Penmanship triangulation ──────────────────────────────────────────────
// Re-applies the document builder's multi-auditor pattern (doc_pipeline_module.js) to
// handwriting: run N independent vision reviews under different lenses, re-derive each
// total from its four 0-25 sub-scores (not the model's gestalt number), then report the
// MEAN with an honest uncertainty band. We deliberately AVOID the labels "SEM"/"ICC"/
// "Cronbach's α" — agreement across AI re-reads of one sample is not a normed psychometric
// instrument. This is a formative AI estimate, not a graded/normed measure.
const PENMANSHIP_LENSES = [
  'You are an encouraging elementary teacher giving kind, grade-appropriate handwriting feedback.',
  'You are a pediatric occupational therapist assessing fine-motor handwriting features.',
  'You are a literacy specialist focused on legibility and correct letter formation.',
];
const PENMANSHIP_DIMS = ['letterFormation', 'spacing', 'alignment', 'neatness'];
const aggregatePenmanship = (penmanshipObjs) => {
  const valid = (penmanshipObjs || []).filter(a => a && typeof a === 'object');
  if (valid.length === 0) return null;
  const clamp25 = (v) => Math.max(0, Math.min(25, Math.round(Number(v) || 0)));
  // Re-derive each reviewer's total from its four sub-scores (0-100); ignore any self-reported total.
  const totals = valid.map(a => PENMANSHIP_DIMS.reduce((s, d) => s + clamp25(a[d]), 0));
  const n = totals.length;
  const mean = totals.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(totals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1)) : 0;
  const seMean = n > 1 ? sd / Math.sqrt(n) : 0; // standard error of the MEAN across reviewers (NOT CTT SEM)
  const dimMeans = {};
  PENMANSHIP_DIMS.forEach(d => { dimMeans[d] = Math.round(valid.reduce((s, a) => s + clamp25(a[d]), 0) / n); });
  const pickStr = (k) => { const hit = valid.map(a => a[k]).find(v => typeof v === 'string' && v.trim()); return hit || ''; };
  return {
    score: Math.round(mean),                 // kept for backward-compat (e.g. toast)
    auditorCount: n,
    sd: Math.round(sd * 10) / 10,
    ci: [Math.max(0, Math.round(mean - 1.96 * seMean)), Math.min(100, Math.round(mean + 1.96 * seMean))],
    agreement: n < 2 ? 'single' : sd <= 4 ? 'high' : sd <= 9 ? 'moderate' : 'low',
    band: mean >= 80 ? 'Strong' : mean >= 60 ? 'On track' : mean >= 40 ? 'Developing' : 'Emerging',
    letterFormation: dimMeans.letterFormation,
    spacing: dimMeans.spacing,
    alignment: dimMeans.alignment,
    neatness: dimMeans.neatness,
    strengths: pickStr('strengths'),
    tips: pickStr('tips'),
    legibility: pickStr('legibility'),
  };
};

const PHASES = ['configure', 'write', 'illustrate', 'narrate', 'review', 'export'];
const PHASE_LABELS = ['Setup', 'Write', 'Illustrate', 'Narrate', 'Review', 'Export'];
const LANG_OPTIONS = [
  { code: 'en', label: 'English', bcp47: 'en-US' },
  { code: 'es', label: 'Español', bcp47: 'es-ES' },
  { code: 'fr', label: 'Français', bcp47: 'fr-FR' },
  { code: 'de', label: 'Deutsch', bcp47: 'de-DE' },
  { code: 'pt', label: 'Português', bcp47: 'pt-BR' },
  { code: 'zh', label: '中文', bcp47: 'zh-CN' },
  { code: 'ja', label: '日本語', bcp47: 'ja-JP' },
  { code: 'ko', label: '한국어', bcp47: 'ko-KR' },
  { code: 'ar', label: 'العربية', bcp47: 'ar-SA' },
  { code: 'hi', label: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'vi', label: 'Tiếng Việt', bcp47: 'vi-VN' },
  { code: 'tl', label: 'Filipino', bcp47: 'tl-PH' },
  { code: 'uk', label: 'Українська', bcp47: 'uk-UA' },
  { code: 'ru', label: 'Русский', bcp47: 'ru-RU' },
  { code: 'it', label: 'Italiano', bcp47: 'it-IT' },
  { code: 'pl', label: 'Polski', bcp47: 'pl-PL' },
  { code: 'tr', label: 'Türkçe', bcp47: 'tr-TR' },
  { code: 'th', label: 'ไทย', bcp47: 'th-TH' },
  { code: 'other', label: 'Other…', bcp47: 'en-US' },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const _storyForgeUseFocusTrap = (typeof window !== 'undefined' && window.__alloHooks && window.__alloHooks.useFocusTrap) || function(){};

const StoryForge = React.memo(({
  isOpen,
  onClose,
  onCallImagen,
  onCallGeminiImageEdit,
  onCallGemini,
  onCallTTS,
  onCallGeminiVision,
  selectedVoice,
  gradeLevel,
  sourceTopic,
  glossaryTerms,
  addToast,
  t: tFunc,
  isCanvasEnv,
  liveSession,
  // ── Resource integration props ──
  initialConfig,        // Pre-loaded storyforge-config from teacher assignment
  onSaveConfig,         // Callback to save config as resource: (configObj) => void
  onSaveSubmission,     // Callback to save completed story as resource: (submissionObj) => void
  lessonResources,      // Array of available lesson resources for "Import from Lesson"
  codename,             // Student codename (e.g., "Bright Tiger") — used instead of real name
  onAnalyzeFluency,     // Optional: (audioBase64, mimeType, referenceText) => Promise<result> — ORF analysis
}) => {
  // ── Safe translate ──
  const t = tFunc || ((k) => k);

  // ── Phase state ──
  const [phase, setPhase] = useState('configure');
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Configure state ──
  const [storyTitle, setStoryTitle] = useState('');
  const authorName = codename || 'Creative Writer';
  // Per-student draft key — namespaced by codename so a shared classroom device doesn't
  // surface another student's in-progress draft (was one global key → cross-student leak).
  const SAVE_KEY = SAVE_KEY_BASE + '_' + (String(codename || 'anon').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'anon');
  const [genre, setGenre] = useState('free');
  const [storyShape, setStoryShape] = useState(''); // optional Vonnegut-style emotional shape (scaffolding lens)
  const [valenceByPara, setValenceByPara] = useState({}); // emotional fortune per paragraph id (-5..+5) for the Story Arc curve
  const [valenceLoading, setValenceLoading] = useState(false);
  const [vocabTerms, setVocabTerms] = useState([]);
  const [artStyle, setArtStyle] = useState('storybook');
  const [customArtStyle, setCustomArtStyle] = useState('');
  const [storyPrompt, setStoryPrompt] = useState('');
  const [rubricText, setRubricText] = useState('');
  const [minParagraphs] = useState(3);
  const [maxParagraphs] = useState(8);

  // ── Write state ──
  const [paragraphs, setParagraphs] = useState([{ id: 'p-0', text: '', scaffoldFrame: '', plotBeat: '' }]);
  const [scaffoldsGenerated, setScaffoldsGenerated] = useState(false);
  const [helpMeResult, setHelpMeResult] = useState(null);
  const [helpMeParagraphIdx, setHelpMeParagraphIdx] = useState(-1);
  const [layoutMode, setLayoutMode] = useState('prose');
  const [comicPageLayout, setComicPageLayout] = useState('grid');
  const [dictatingParagraphIdx, setDictatingParagraphIdx] = useState(-1);
  const [focusMode, setFocusMode] = useState(false);
  const [focusParagraphIdx, setFocusParagraphIdx] = useState(0);
  const [language, setLanguage] = useState('en');
  const [customLanguage, setCustomLanguage] = useState('');
  const [hasExported, setHasExported] = useState(false);

  // ── Writing timer ──
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDuration, setTimerDuration] = useState(300); // 5 min default
  const timerRef = useRef(null);

  // ── Revision tracking ──
  const [revisionSnapshot, setRevisionSnapshot] = useState(null);

  // ── Grammar/style checker ──
  const [grammarResults, setGrammarResults] = useState({}); // keyed by paragraph id
  const [grammarLoading, setGrammarLoading] = useState(false);

  // ── XP & Streaks ──
  const XP_KEY = 'alloflow_storyforge_xp';
  const LEVELS = [
    { name: 'Apprentice', min: 0, emoji: '✏️' },
    { name: 'Storyteller', min: 50, emoji: '📖' },
    { name: 'Author', min: 150, emoji: '📚' },
    { name: 'Master Author', min: 300, emoji: '🏅…' },
    { name: 'Legend', min: 500, emoji: '👑' },
  ];
  const [xpData, setXpData] = useState(() => {
    try {
      const saved = localStorage.getItem(XP_KEY);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return { totalXP: 0, streak: 0, lastWriteDate: null, xpLog: [] };
  });

  // Local calendar day as YYYY-MM-DD (NOT UTC) — so evening sessions don't land on the wrong day.
  const getLocalDayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const awardXP = (amount, reason) => {
    setXpData(prev => {
      const today = getLocalDayKey(new Date());
      const yesterday = getLocalDayKey(new Date(Date.now() - 86400000));
      let streak = prev.streak;
      if (prev.lastWriteDate === yesterday) streak += 1;
      else if (prev.lastWriteDate !== today) streak = 1;
      const updated = { totalXP: prev.totalXP + amount, streak, lastWriteDate: today, xpLog: [...(prev.xpLog || []).slice(-20), { amount, reason, date: today }] };
      try { localStorage.setItem(XP_KEY, JSON.stringify(updated)); } catch(e) {}
      return updated;
    });
  };

  const currentLevel = useMemo(() => {
    const lvl = [...LEVELS].reverse().find(l => xpData.totalXP >= l.min);
    return lvl || LEVELS[0];
  }, [xpData.totalXP]);

  const nextLevel = useMemo(() => {
    const idx = LEVELS.findIndex(l => l.name === currentLevel.name);
    return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  }, [currentLevel]);

  // ── Image refinement ──
  const [imageEditState, setImageEditState] = useState(null); // { paragraphId, prompt }

  // ── Comic panel stickers + dialogue/thought/narration per panel ──
  const [panelStickers, setPanelStickers] = useState({});
  const [panelDialogue, setPanelDialogue] = useState({}); // keyed by paragraph id: { speaker, speech, thought, sfx }
  const [panelDirections, setPanelDirections] = useState({}); // keyed by paragraph id: { shot, angle, mood, transition }
  const [panelThumbnails, setPanelThumbnails] = useState({}); // keyed by paragraph id: { focalPoint, composition, letteringSpace, letteringX, letteringY, letteringWidth, sketchNote }
  const [panelLayouts, setPanelLayouts] = useState({}); // keyed by paragraph id: { frame, colSpan, rowSpan }
  const [panelResizeDrag, setPanelResizeDrag] = useState(null);
  const [bubbleDrag, setBubbleDrag] = useState(null);
  const [comicContinuity, setComicContinuity] = useState({ cast: '', setting: '', palette: '', styleNotes: '' });
  const [comicPageComposer, setComicPageComposer] = useState({ panelsPerPage: 4, pages: {} });
  const [comicPrintSafety, setComicPrintSafety] = useState({ format: 'letter', gutter: 'standard', showGuides: true, includeBleed: true });
  const updatePanelDialogue = (pId, field, value) => {
    setPanelDialogue(prev => ({ ...prev, [pId]: { ...(prev[pId] || {}), [field]: value } }));
  };
  const updatePanelDirection = (pId, field, value) => {
    setPanelDirections(prev => {
      const next = { ...prev };
      const cleanValue = normalizeComicDirectionValue(field, value);
      const current = { ...(next[pId] || {}) };
      if (cleanValue) current[field] = cleanValue;
      else delete current[field];
      if (Object.keys(current).length) next[pId] = current;
      else delete next[pId];
      return next;
    });
  };
  const updatePanelThumbnail = (pId, field, value) => {
    setPanelThumbnails(prev => {
      const next = { ...prev };
      const current = { ...(next[pId] || {}) };
      if (field === 'letteringSpace') {
        const cleanValue = normalizeComicLetteringSpace(value);
        const previousSpace = current.letteringSpace || '';
        if (cleanValue) current.letteringSpace = cleanValue;
        else delete current.letteringSpace;
        if (previousSpace !== cleanValue) {
          delete current.letteringX;
          delete current.letteringY;
        }
      } else if (field === 'letteringX' || field === 'letteringY') {
        if (Number.isFinite(Number(value))) current[field] = clampComicLetteringPercent(value);
        else delete current[field];
      } else if (field === 'letteringWidth') {
        if (isFiniteComicLetteringValue(value)) current.letteringWidth = clampComicLetteringWidth(value);
        else delete current.letteringWidth;
      } else if (field === 'resetLetteringPosition') {
        delete current.letteringX;
        delete current.letteringY;
      } else if (field === 'resetLetteringWidth') {
        delete current.letteringWidth;
      } else {
        const cleanValue = String(value || '').slice(0, 260);
        if (cleanValue) current[field] = cleanValue;
        else delete current[field];
      }
      if (Object.keys(current).length) next[pId] = current;
      else delete next[pId];
      return next;
    });
    if (!isDirty) setIsDirty(true);
  };
  const updatePanelLayout = (pId, field, value) => {
    setPanelLayouts(prev => {
      const next = { ...prev };
      const current = { ...(next[pId] || {}) };
      if (field === 'frame') {
        const frame = normalizeComicPanelFrame(value);
        delete current.colSpan;
        delete current.rowSpan;
        if (frame) current.frame = frame;
        else delete current.frame;
      } else if (field === 'colSpan' || field === 'rowSpan') {
        current[field] = clampComicPanelSpan(value);
      } else if (field === 'resetSpans') {
        delete current.colSpan;
        delete current.rowSpan;
      }
      if (Object.keys(current).length) next[pId] = current;
      else delete next[pId];
      return next;
    });
    if (!isDirty) setIsDirty(true);
  };
  const startPanelResizeDrag = (event, pId, idx, pageLayout = comicPageLayout, pageIndex = idx) => {
    event.preventDefault();
    event.stopPropagation();
    const spans = getComicPanelLayoutSpans(panelLayouts[pId] || {}, pageLayout, pageIndex);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPanelResizeDrag({
      pId,
      idx,
      pageLayout,
      pageIndex,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startColSpan: spans.colSpan,
      startRowSpan: spans.rowSpan,
    });
  };
  const updatePanelResizeDrag = (event) => {
    if (!panelResizeDrag || event.pointerId !== panelResizeDrag.pointerId) return;
    event.preventDefault();
    const dragLayout = panelResizeDrag.pageLayout || comicPageLayout;
    const nextColSpan = dragLayout === 'strip'
      ? 1
      : clampComicPanelSpan(panelResizeDrag.startColSpan + (event.clientX - panelResizeDrag.startX > 42 ? 1 : event.clientX - panelResizeDrag.startX < -42 ? -1 : 0));
    const nextRowSpan = clampComicPanelSpan(panelResizeDrag.startRowSpan + (event.clientY - panelResizeDrag.startY > 42 ? 1 : event.clientY - panelResizeDrag.startY < -42 ? -1 : 0));
    updatePanelLayout(panelResizeDrag.pId, 'colSpan', nextColSpan);
    updatePanelLayout(panelResizeDrag.pId, 'rowSpan', nextRowSpan);
  };
  const endPanelResizeDrag = (event) => {
    if (!panelResizeDrag || event.pointerId !== panelResizeDrag.pointerId) return;
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setPanelResizeDrag(null);
  };
  const getBubblePositionFromPointer = (rect, event, offsetX = 0, offsetY = 0) => ({
    x: clampComicLetteringPercent((((event.clientX - offsetX) - rect.left) / Math.max(1, rect.width)) * 100),
    y: clampComicLetteringPercent((((event.clientY - offsetY) - rect.top) / Math.max(1, rect.height)) * 100),
  });
  const updatePanelLetteringPosition = (pId, position) => {
    setPanelThumbnails(prev => {
      const next = { ...prev };
      const current = { ...(next[pId] || {}) };
      if (!normalizeComicLetteringSpace(current.letteringSpace)) current.letteringSpace = 'top';
      current.letteringX = clampComicLetteringPercent(position.x);
      current.letteringY = clampComicLetteringPercent(position.y);
      next[pId] = current;
      return next;
    });
    if (!isDirty) setIsDirty(true);
  };
  const updatePanelLetteringWidth = (pId, width) => {
    setPanelThumbnails(prev => {
      const next = { ...prev };
      const current = { ...(next[pId] || {}) };
      if (!normalizeComicLetteringSpace(current.letteringSpace)) current.letteringSpace = 'top';
      current.letteringWidth = clampComicLetteringWidth(width);
      next[pId] = current;
      return next;
    });
    if (!isDirty) setIsDirty(true);
  };
  const getBubbleResizeBehavior = (rough = {}, space = 'top') => {
    const cleanSpace = normalizeComicLetteringSpace(space);
    const resizeFromLeft = !hasComicLetteringPosition(rough) && (cleanSpace === 'right' || cleanSpace.endsWith('-right'));
    const centered = hasComicLetteringPosition(rough) || cleanSpace === 'top' || cleanSpace === 'bottom' || !cleanSpace;
    return {
      resizeFromLeft,
      resizeDirection: resizeFromLeft ? -1 : 1,
      resizeScale: centered ? 2 : 1,
    };
  };
  const startBubbleDrag = (event, pId) => {
    event.preventDefault();
    event.stopPropagation();
    const artLayer = event.currentTarget.closest('[data-sf-comic-art-layer="true"]');
    const bubbleTarget = event.currentTarget.closest('.sf-bubble-drag-target');
    const rect = artLayer?.getBoundingClientRect?.();
    const bubbleRect = bubbleTarget?.getBoundingClientRect?.();
    if (!rect || !bubbleRect) return;
    const dragRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setBubbleDrag({
      mode: 'move',
      pId,
      pointerId: event.pointerId,
      rect: dragRect,
      offsetX: event.clientX - (bubbleRect.left + (bubbleRect.width / 2)),
      offsetY: event.clientY - (bubbleRect.top + (bubbleRect.height / 2)),
    });
  };
  const updateBubbleDrag = (event) => {
    if (!bubbleDrag || bubbleDrag.mode !== 'move' || event.pointerId !== bubbleDrag.pointerId) return;
    event.preventDefault();
    updatePanelLetteringPosition(
      bubbleDrag.pId,
      getBubblePositionFromPointer(bubbleDrag.rect, event, bubbleDrag.offsetX, bubbleDrag.offsetY),
    );
  };
  const endBubbleDrag = (event) => {
    if (!bubbleDrag || bubbleDrag.mode !== 'move' || event.pointerId !== bubbleDrag.pointerId) return;
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setBubbleDrag(null);
    sfAnnounce('Speech bubble position updated');
  };
  const startBubbleResize = (event, pId) => {
    event.preventDefault();
    event.stopPropagation();
    const artLayer = event.currentTarget.closest('[data-sf-comic-art-layer="true"]');
    const bubbleTarget = event.currentTarget.closest('.sf-bubble-drag-target');
    const rect = artLayer?.getBoundingClientRect?.();
    const bubbleRect = bubbleTarget?.getBoundingClientRect?.();
    if (!rect || !bubbleRect) return;
    const rough = panelThumbnails[pId] || {};
    const behavior = getBubbleResizeBehavior(rough, rough.letteringSpace);
    const measuredWidth = (bubbleRect.width / Math.max(1, rect.width)) * 100;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setBubbleDrag({
      mode: 'resize',
      pId,
      pointerId: event.pointerId,
      rect: { width: rect.width },
      startX: event.clientX,
      startWidth: hasComicLetteringWidth(rough) ? clampComicLetteringWidth(rough.letteringWidth) : clampComicLetteringWidth(measuredWidth),
      resizeDirection: behavior.resizeDirection,
      resizeScale: behavior.resizeScale,
    });
  };
  const updateBubbleResize = (event) => {
    if (!bubbleDrag || bubbleDrag.mode !== 'resize' || event.pointerId !== bubbleDrag.pointerId) return;
    event.preventDefault();
    const deltaPercent = ((event.clientX - bubbleDrag.startX) / Math.max(1, bubbleDrag.rect.width))
      * 100 * bubbleDrag.resizeDirection * bubbleDrag.resizeScale;
    updatePanelLetteringWidth(bubbleDrag.pId, bubbleDrag.startWidth + deltaPercent);
  };
  const endBubbleResize = (event) => {
    if (!bubbleDrag || bubbleDrag.mode !== 'resize' || event.pointerId !== bubbleDrag.pointerId) return;
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setBubbleDrag(null);
    sfAnnounce('Speech bubble width updated');
  };
  const handleBubbleControlKeyDown = (event, pId, mode) => {
    const moveKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    const resizeKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (mode === 'resize' ? !resizeKeys.includes(event.key) : !moveKeys.includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const rough = panelThumbnails[pId] || {};
    const step = event.shiftKey ? 5 : 2;
    if (mode === 'resize') {
      const currentWidth = hasComicLetteringWidth(rough) ? clampComicLetteringWidth(rough.letteringWidth) : 72;
      const nextWidth = event.key === 'Home'
        ? 28
        : event.key === 'End'
          ? 86
          : currentWidth + (event.key === 'ArrowRight' ? step : -step);
      const width = clampComicLetteringWidth(nextWidth);
      updatePanelLetteringWidth(pId, width);
      sfAnnounce(`Speech bubble width ${width} percent`);
      return;
    }
    const currentPosition = getComicLetteringPosition(rough, rough.letteringSpace);
    const nextPosition = { ...currentPosition };
    if (event.key === 'ArrowLeft') nextPosition.x -= step;
    if (event.key === 'ArrowRight') nextPosition.x += step;
    if (event.key === 'ArrowUp') nextPosition.y -= step;
    if (event.key === 'ArrowDown') nextPosition.y += step;
    updatePanelLetteringPosition(pId, nextPosition);
    sfAnnounce(`Speech bubble position ${Math.round(nextPosition.x)}, ${Math.round(nextPosition.y)} percent`);
  };
  const updateComicContinuity = (field, value) => {
    setComicContinuity(prev => sanitizeComicContinuity({ ...prev, [field]: value }));
  };
  const updateComicPanelsPerPage = (value) => {
    const panelsPerPage = COMIC_PANELS_PER_PAGE_OPTIONS.includes(Number(value)) ? Number(value) : 4;
    setComicPageComposer(prev => sanitizeComicPageComposer({ ...prev, panelsPerPage }));
  };
  const updateComicPageMeta = (pageNo, field, value) => {
    setComicPageComposer(prev => {
      const clean = sanitizeComicPageComposer(prev);
      const key = String(Math.max(1, Math.min(MAX_DRAFT_PARAGRAPHS, Number(pageNo) || 1)));
      const current = { ...(clean.pages[key] || {}) };
      if (field === 'layout') {
        if (COMIC_PAGE_LAYOUTS[value]) current.layout = value;
        else delete current.layout;
      } else if (field === 'turn') {
        const turn = normalizeComicPageTurn(value);
        if (turn) current.turn = turn;
        else delete current.turn;
      } else if (field === 'note') {
        const note = String(value || '').slice(0, 260);
        if (note.trim()) current.note = note;
        else delete current.note;
      }
      const pages = { ...clean.pages };
      if (Object.keys(current).length) pages[key] = current;
      else delete pages[key];
      return sanitizeComicPageComposer({ ...clean, pages });
    });
  };
  const updateComicPrintSafety = (field, value) => {
    setComicPrintSafety(prev => {
      const next = { ...sanitizeComicPrintSafety(prev) };
      if (field === 'format') {
        const previousFormat = next.format;
        next.format = COMIC_PRINT_FORMATS[value] ? value : 'letter';
        if (next.format === 'digital') next.gutter = 'none';
        else if (previousFormat === 'digital' || next.gutter === 'none') {
          next.gutter = 'standard';
          next.includeBleed = true;
        }
      }
      else if (field === 'gutter') next.gutter = COMIC_PRINT_GUTTERS[value] ? value : 'standard';
      else if (field === 'showGuides') next.showGuides = Boolean(value);
      else if (field === 'includeBleed') next.includeBleed = Boolean(value);
      return sanitizeComicPrintSafety(next);
    });
  };
  const comicPageGroups = useMemo(() => buildComicPageGroups(paragraphs, comicPageComposer, comicPageLayout), [paragraphs, comicPageComposer, comicPageLayout]);
  const applyComicLetteringPlacement = (pages, scopeLabel = 'comic') => {
    const pageList = Array.isArray(pages) ? pages.filter(Boolean) : [pages].filter(Boolean);
    const assignments = {};
    let bubblePanels = 0;
    pageList.forEach((page) => {
      const printSafety = sanitizeComicPrintSafety(comicPrintSafety);
      const gutterSide = getComicPageGutterSide(page.page, page.layout, printSafety);
      (page.panels || []).forEach(({ paragraph }, pageIndex) => {
        const id = paragraph?.id;
        if (!id) return;
        const dialogue = panelDialogue[id] || {};
        if (!comicDialogueHasBubbles(dialogue)) return;
        bubblePanels += 1;
        const currentSpace = normalizeComicLetteringSpace((panelThumbnails[id] || {}).letteringSpace);
        if (currentSpace && currentSpace !== 'none' && !letteringTouchesSide(currentSpace, gutterSide)) return;
        assignments[id] = getComicAutoLetteringSpace(page.layout, pageIndex, gutterSide);
      });
    });
    const ids = Object.keys(assignments);
    if (!bubblePanels) {
      if (addToast) addToast('Add bubble text before auto-placing lettering.', 'info');
      sfAnnounce('No comic bubbles to place yet');
      return;
    }
    if (!ids.length) {
      if (addToast) addToast(`${scopeLabel} lettering already has safe anchors.`, 'info');
      sfAnnounce('Comic lettering anchors already safe');
      return;
    }
    setPanelThumbnails(prev => {
      const next = { ...(prev || {}) };
      ids.forEach((id) => {
        next[id] = { ...(next[id] || {}), letteringSpace: assignments[id] };
      });
      return next;
    });
    if (!isDirty) setIsDirty(true);
    if (addToast) addToast(`Placed lettering anchors on ${ids.length} panel${ids.length === 1 ? '' : 's'}.`, 'success');
    sfAnnounce(`Placed lettering anchors on ${ids.length} comic panels`);
  };
  const createDraftSnapshot = () => ({
    storyTitle, genre, vocabTerms, artStyle, customArtStyle, storyPrompt, rubricText,
    paragraphs, scaffoldsGenerated, draftCount, phase, language, storyShape, valenceByPara,
    layoutMode, comicPageLayout,
    comicPageComposer: sanitizeComicPageComposer(comicPageComposer),
    comicPrintSafety: sanitizeComicPrintSafety(comicPrintSafety),
    comicContinuity: sanitizeComicContinuity(comicContinuity),
    panelDialogue: sanitizePanelDialogue(panelDialogue),
    panelDirections: sanitizePanelDirections(panelDirections),
    panelThumbnails: sanitizePanelThumbnails(panelThumbnails),
    panelLayouts: sanitizePanelLayouts(panelLayouts),
    panelStickers: sanitizePanelStickers(panelStickers),
  });

  // ── Illustrate state ──
  const [illustrations, setIllustrations] = useState({});
  const [coverArt, setCoverArt] = useState(null);
  const [coverArtLoading, setCoverArtLoading] = useState(false);
  const characterPortraitRef = useRef(null);

  // ── Ref for async loops (prevents stale closure over paragraphs) ──
  const paragraphsRef = useRef(paragraphs);
  useEffect(() => { paragraphsRef.current = paragraphs; }, [paragraphs]);

  // ── Narrate state ──
  const [characters, setCharacters] = useState([]);
  const [audioSegments, setAudioSegments] = useState({});
  // Live mirror of audioSegments so the unmount cleanup (which must keep [] deps to run
  // only on unmount) can revoke the CURRENT blob URLs instead of the stale initial {}.
  const audioSegmentsRef = useRef(audioSegments);
  useEffect(() => { audioSegmentsRef.current = audioSegments; }, [audioSegments]);
  const [playbackIdx, setPlaybackIdx] = useState(-1);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const audioRef = useRef(null);
  const recorder = useAudioRecorder();
  const [recordingParagraphId, setRecordingParagraphId] = useState(null);

  // ── Sentence splitter for karaoke narration ──
  const splitSentences = (text) => {
    if (!text) return [''];
    // Split on sentence-ending punctuation followed by space or end of string
    // Handles: "Dr. Smith said hello." correctly by not splitting on "Dr."
    const raw = text.match(/[^.!?]*[.!?]+[\s]?|[^.!?]+$/g);
    if (!raw) return [text.trim()];
    return raw.map(s => s.trim()).filter(s => s.length > 0);
  };

  // ── Narration voice ──
  const [narratorVoice, setNarratorVoice] = useState(selectedVoice || 'Puck');

  // ── ORF Fluency Reading ──
  const [fluencyReadingId, setFluencyReadingId] = useState(null);
  const [fluencyResult, setFluencyResult] = useState(null);
  const [fluencyRecording, setFluencyRecording] = useState(false);
  const fluencyRecorderRef = useRef(null);
  const fluencyChunksRef = useRef([]);

  const startFluencyReading = async (paragraphId) => {
    if (!onAnalyzeFluency) { if (addToast) addToast(t('toasts.fluency_analysis_available_mode'), 'info'); return; }
    setFluencyReadingId(paragraphId);
    setFluencyResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      fluencyRecorderRef.current = new MediaRecorder(stream);
      fluencyChunksRef.current = [];
      fluencyRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) fluencyChunksRef.current.push(e.data); };
      fluencyRecorderRef.current.start();
      setFluencyRecording(true);
    } catch (err) {
      console.warn('Microphone access denied:', err);
      setFluencyReadingId(null);
    }
  };

  const stopFluencyReading = async (paragraphId, text) => {
    if (!fluencyRecorderRef.current) return;
    setFluencyRecording(false);
    return new Promise((resolve) => {
      fluencyRecorderRef.current.onstop = async () => {
        const blob = new Blob(fluencyChunksRef.current, { type: 'audio/webm' });
        fluencyRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          if (addToast) addToast(t('toasts.analyzing_reading'), 'info');
          try {
            const result = await onAnalyzeFluency(base64, 'audio/webm', text);
            if (result) {
              setFluencyResult({ paragraphId, ...result });
              awardXP(8, 'Fluency practice');
              if (result.confidence?.overall >= 7 && addToast) addToast(t('toasts.great_reading_check_results_below'), 'success');
            }
          } catch (err) {
            console.warn('Fluency analysis failed:', err);
            if (addToast) addToast(t('toasts.analysis_failed_try_again_with'), 'error');
          }
          setFluencyReadingId(null);
          resolve();
        };
      };
      fluencyRecorderRef.current.stop();
    });
  };

  // ── Handwriting Capture ──
  const [hwPenmanshipOn, setHwPenmanshipOn] = useState(false);
  const [hwLoading, setHwLoading] = useState(false);
  const [hwResult, setHwResult] = useState(null);
  const [hwTargetParagraph, setHwTargetParagraph] = useState(null); // which paragraph index to fill

  const handleHandwritingCapture = (e, paragraphIdx) => {
    const file = e.target.files?.[0];
    if (!file || !onCallGeminiVision) return;
    e.target.value = '';
    setHwLoading(true);
    setHwTargetParagraph(paragraphIdx);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const mimeType = file.type || 'image/png';
      const showPenmanship = hwPenmanshipOn;
      const gl = gradeLevel || '5th Grade';

      const transcribeTask = 'TASK 1 — TRANSCRIBE: Extract ALL handwritten text from this document exactly as written. ' +
        'Preserve the student\'s original wording, spelling, and punctuation — do NOT correct anything. ' +
        'If text is unclear, make your best guess and note uncertainty with [?].\n\n';
      const penmanshipTask = 'TASK 2 — PENMANSHIP EVALUATION:\n' +
        'This student is in ' + gl + '.\n' +
        'CRITICAL: Score relative to what is EXPECTED at ' + gl + ' level, NOT against adult writing.\n' +
        'Score each area 0-25 (do NOT report a total — it is computed from these):\n' +
        '- LETTER FORMATION (0-25): Are letters shaped correctly for this grade level?\n' +
        '- SPACING (0-25): Appropriate space between words?\n' +
        '- ALIGNMENT (0-25): Writing follows the line? Consistent baseline?\n' +
        '- NEATNESS (0-25): Overall legibility? Clean strokes?\n\n' +
        'Be encouraging and grade-appropriate.\n\n' +
        'Return ONLY JSON:\n' +
        '{"text":"the transcribed handwriting exactly as written",' +
        '"penmanship":{"letterFormation":0-25,"spacing":0-25,"alignment":0-25,"neatness":0-25,' +
        '"strengths":"1-2 specific things done well",' +
        '"tips":"1-2 encouraging suggestions for improvement",' +
        '"legibility":"easy|moderate|difficult"}}';
      const parseVision = (raw) => { try { return JSON.parse(cleanJson(raw)); } catch { return { text: (raw || '').trim() }; } };

      try {
        if (!showPenmanship) {
          // Single transcription pass — penmanship feedback not requested.
          const result = await onCallGeminiVision('You are an expert at reading student handwriting.\n\n' + transcribeTask + 'Return ONLY JSON:\n{"text":"the transcribed handwriting exactly as written"}', base64, mimeType);
          const parsed = parseVision(result);
          if (parsed.text && paragraphIdx != null) updateParagraph(paragraphIdx, parsed.text);
          setHwResult({ text: parsed.text || '' });
          setHwLoading(false);
          if (addToast) addToast(t('toasts.handwriting_converted'), 'success');
          return;
        }
        // ── Penmanship requested: triangulate across N independent reviewer lenses ──
        // (mirrors the document-builder multi-auditor pattern to cut single-pass variance).
        const reviews = (await Promise.all(
          PENMANSHIP_LENSES.map(lens =>
            onCallGeminiVision(lens + '\n\n' + transcribeTask + penmanshipTask, base64, mimeType)
              .then(parseVision).catch(() => null)
          )
        )).filter(Boolean);
        if (reviews.length === 0) throw new Error('all penmanship reviews failed');
        const transcription = (reviews.find(r => r.text && r.text.trim()) || {}).text || '';
        const penmanship = aggregatePenmanship(reviews.map(r => r.penmanship));
        if (transcription && paragraphIdx != null) updateParagraph(paragraphIdx, transcription);
        setHwResult({ text: transcription, penmanship });
        setHwLoading(false);
        if (addToast) {
          const suffix = penmanship
            ? ` Penmanship: ${penmanship.band}` + (penmanship.auditorCount > 1 ? ` (~${penmanship.score}/100 across ${penmanship.auditorCount} reviewers)` : ` (~${penmanship.score}/100)`)
            : '';
          addToast(t('toasts.handwriting_converted') + suffix, 'success');
        }
      } catch {
        setHwLoading(false);
        if (addToast) addToast(t('toasts.could_read_handwriting_try_clearer'), 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Unsaved changes guard ──
  const [isDirty, setIsDirty] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const closeConfirmDialogRef = useRef(null);
  const restorePromptDialogRef = useRef(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [exportConsent, setExportConsent] = useState(null);
  const exportConsentDialogRef = useRef(null);
  const exportConsentResolveRef = useRef(null);
  const requestExportConsent = (options) => new Promise(resolve => {
    exportConsentResolveRef.current = resolve;
    setExportConsent(options);
  });
  const finishExportConsent = (accepted) => {
    const resolve = exportConsentResolveRef.current;
    exportConsentResolveRef.current = null;
    setExportConsent(null);
    if (resolve) resolve(accepted);
  };
  const safeClose = () => {
    if (isDirty && paragraphs.some(p => p.text.trim().length > 0)) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // ── Advanced config collapse ──
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // ── Image prompt preview/edit state ──
  const [promptPreview, setPromptPreview] = useState(null); // { paragraphId, text, idx, prompt }

  // ── Phase content ref for focus management ──
  const phaseContentRef = useRef(null);

  // ── Modal focus-management refs (focus trap + restore) ──
  const modalRootRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  // ── Accessibility ──
  const prefersReducedMotion = useReducedMotion();
  const animClass = prefersReducedMotion ? '' : 'animate-in fade-in duration-300';

  // ── Theme: mirror the host app's dark / high-contrast theme onto our own modal root,
  //    so the host's existing `.theme-dark .bg-white {…}` / `.theme-contrast …` rules apply. ──
  const hostTheme = useHostTheme();

  // ── Cleanup on unmount — stop capture and revoke any blob: URLs we created ──
  // NB: deps MUST stay [] so this runs only on unmount. We read live state via
  // audioSegmentsRef because a [] closure would otherwise capture the initial empty {}.
  useEffect(() => {
    return () => {
      // Stop any active dictation / recording
      if (dictation.isDictating) dictation.stopDictation();
      if (recorder.isRecording) recorder.stopRecording();
      // Release the ORF fluency microphone if a reading is still in progress
      try { fluencyRecorderRef.current?.stream?.getTracks().forEach(tr => tr.stop()); } catch (e) {}
      // Revoke every blob: URL held in audioSegments — student recordings AND AI/TTS
      // narration (legacy aiAudioUrl + the per-sentence sentenceAudios array). These
      // accumulate across a long writing session and never get freed otherwise.
      const revoke = (u) => { if (typeof u === 'string' && u.startsWith('blob:')) { try { URL.revokeObjectURL(u); } catch (e) {} } };
      Object.values(audioSegmentsRef.current || {}).forEach(seg => {
        if (!seg) return;
        revoke(seg.studentAudioUrl);
        revoke(seg.aiAudioUrl);
        if (Array.isArray(seg.sentenceAudios)) seg.sentenceAudios.forEach(revoke);
      });
    };
  }, []);

  // ── Dictation ──
  const langLabel = language === 'other' ? customLanguage : (LANG_OPTIONS.find(l => l.code === language)?.label || 'English');
  const langBcp47 = language === 'other' ? 'en-US' : (LANG_OPTIONS.find(l => l.code === language)?.bcp47 || 'en-US');
  const langInstruction = language !== 'en' ? `\nIMPORTANT: Respond entirely in ${langLabel}. All text output must be in ${langLabel}.` : '';

  const dictation = useDictation((transcript) => {
    if (dictatingParagraphIdx >= 0 && dictatingParagraphIdx < paragraphs.length) {
      setParagraphs(prev => prev.map((p, i) => {
        if (i !== dictatingParagraphIdx) return p;
        const spacer = p.text.length > 0 && !p.text.endsWith(' ') ? ' ' : '';
        return { ...p, text: p.text + spacer + transcript };
      }));
    }
  }, langBcp47);

  const toggleDictation = (idx) => {
    if (dictation.isDictating) {
      dictation.stopDictation();
      setDictatingParagraphIdx(-1);
      sfAnnounce('Dictation stopped');
    } else {
      setDictatingParagraphIdx(idx);
      dictation.startDictation();
      sfAnnounce(`Dictation started for paragraph ${idx + 1}`);
    }
  };

  // ── Review state ──
  const [gradingResult, setGradingResult] = useState(null);
  // Senses Check (sensory imagery audit, ported from PoetTree)
  const [sensesResult, setSensesResult] = useState(null);
  const [sensesLoading, setSensesLoading] = useState(false);
  // Pre-grade Self-Assessment — student rates self before AI grade for metacognition
  const [selfAssessment, setSelfAssessment] = useState({});
  const [selfAssessmentSubmitted, setSelfAssessmentSubmitted] = useState(false);
  // Mentor Match — Serper-grounded recommendation of a public-domain short-story excerpt
  const [mentorMatch, setMentorMatch] = useState(null);
  const [mentorLoading, setMentorLoading] = useState(false);
  // Show-Don't-Tell coach — flags sentences that name emotion/state outright
  const [showTellResult, setShowTellResult] = useState(null);
  const [showTellLoading, setShowTellLoading] = useState(false);
  // Character Arc Tracker — per-character introduction/want/change/resolution audit
  const [arcReport, setArcReport] = useState(null);
  const [arcLoading, setArcLoading] = useState(false);
  // Revision Plan — synthesizes whichever helpers ran into one prioritized to-do list
  const [revisionPlan, setRevisionPlan] = useState(null);
  const [revisionPlanLoading, setRevisionPlanLoading] = useState(false);
  // Dialogue Tag Tune-Up — counts tag usage, flags overuse of "said", proposes context-aware swaps
  const [dialogueReport, setDialogueReport] = useState(null);
  const [dialogueLoading, setDialogueLoading] = useState(false);
  // Comic Flow Audit — checks panel pacing, visual readiness, lettering load, and shot variety
  const [comicFlowReport, setComicFlowReport] = useState(null);
  const [comicFlowLoading, setComicFlowLoading] = useState(false);
  const [draftCount, setDraftCount] = useState(1);

  // ── Init vocab from glossary ──
  useEffect(() => {
    if (glossaryTerms && glossaryTerms.length > 0 && vocabTerms.length === 0) {
      setVocabTerms(glossaryTerms.map(g => ({
        term: g.term || g.word || '',
        definition: g.def || g.definition || '',
      })).filter(v => v.term));
    }
  }, [glossaryTerms]);

  // ── Vocab usage tracking ──
  const vocabUsage = useMemo(() => {
    const fullText = paragraphs.map(p => p.text).join(' ');
    const usage = {};
    vocabTerms.forEach(v => {
      usage[v.term] = termUsed(fullText, v.term);
    });
    return usage;
  }, [paragraphs, vocabTerms]);

  const vocabUsedCount = useMemo(() => Object.values(vocabUsage).filter(Boolean).length, [vocabUsage]);
  const totalWords = useMemo(() => paragraphs.reduce((sum, p) => sum + p.text.trim().split(/\s+/).filter(Boolean).length, 0), [paragraphs]);

  // ── Reading level ──
  const readingLevel = useMemo(() => {
    const fullText = paragraphs.map(p => p.text).join(' ');
    return computeReadingLevel(fullText);
  }, [paragraphs]);

  // ── Per-paragraph stats ──
  const paragraphStats = useMemo(() => paragraphs.map(p => {
    const words = p.text.trim().split(/\s+/).filter(Boolean);
    const sentences = p.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const pVocab = vocabTerms.filter(v => termUsed(p.text, v.term));
    return { wordCount: words.length, sentenceCount: sentences.length, vocabUsed: pVocab.length };
  }), [paragraphs, vocabTerms]);

  // ── Word frequency analysis (for Review phase) ──
  const wordFrequency = useMemo(() => {
    const fullText = paragraphs.map(p => p.text).join(' ');
    const words = fullText.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/).filter(w => w.length > 3);
    const stopWords = new Set(['that','this','with','from','your','have','they','been','their','were','will','would','could','should','about','which','there','these','those','than','what','when','then','into','also','very','just','more','some','only','over','such','after','other','like','most','each','made','them','does','many','much','well','back','even','here','come','make','good','know','take','said','much']);
    const freq = {};
    words.forEach(w => { if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [paragraphs]);

  const overusedWords = useMemo(() => wordFrequency.filter(([, count]) => count >= 4).map(([word]) => word), [wordFrequency]);

  // ── Sentence variety analysis ──
  const sentenceVariety = useMemo(() => paragraphs.map(p => {
    const sentences = p.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 3) return { varied: true, issues: [] };
    const issues = [];
    // Check repeated sentence starters
    const starters = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase());
    const starterCounts = {};
    starters.forEach(s => { if (s) starterCounts[s] = (starterCounts[s] || 0) + 1; });
    const repeated = Object.entries(starterCounts).filter(([, c]) => c >= 3).map(([w]) => w);
    if (repeated.length > 0) issues.push(`Sentences often start with "${repeated[0]}" — try varying your openings`);
    // Check sentence length uniformity
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const allSimilar = lengths.every(l => Math.abs(l - avgLen) < 3);
    if (allSimilar && sentences.length >= 3) issues.push('Sentences are similar length — mix short punchy ones with longer descriptive ones');
    return { varied: issues.length === 0, issues };
  }), [paragraphs]);

  // ── Character name consistency check ──
  const characterIssues = useMemo(() => {
    if (characters.length === 0) return [];
    const issues = [];
    const fullText = paragraphs.map(p => p.text).join(' ');
    const words = fullText.split(/\s+/);
    const charNames = characters.map(c => c.name.toLowerCase());
    // Find capitalized words that are close to character names but not exact
    const capitalWords = [...new Set(words.filter(w => w[0] && w[0] === w[0].toUpperCase() && w.length > 2).map(w => w.replace(/[^a-zA-Z]/g, '')))];
    capitalWords.forEach(word => {
      if (!word || word.length < 3) return;
      const wLower = word.toLowerCase();
      charNames.forEach(name => {
        if (wLower === name) return; // exact match, fine
        if (wLower.length < 3 || name.length < 3) return;
        // Simple Levenshtein-ish: same first letter, similar length, off by 1-2 chars
        if (wLower[0] === name[0] && Math.abs(wLower.length - name.length) <= 2) {
          let diff = 0;
          for (let i = 0; i < Math.min(wLower.length, name.length); i++) {
            if (wLower[i] !== name[i]) diff++;
          }
          diff += Math.abs(wLower.length - name.length);
          if (diff > 0 && diff <= 2) {
            issues.push({ found: word, expected: characters.find(c => c.name.toLowerCase() === name)?.name, });
          }
        }
      });
    });
    return issues;
  }, [paragraphs, characters]);

  // ── Transition words ──
  const TRANSITIONS = ['Furthermore,', 'Meanwhile,', 'However,', 'Suddenly,', 'After that,', 'In addition,', 'As a result,', 'Eventually,', 'On the other hand,', 'Despite this,', 'Soon after,', 'At the same time,', 'In contrast,', 'Therefore,', 'Finally,'];
  const suggestTransition = (idx) => {
    if (idx === 0) return null;
    const prevText = paragraphs[idx - 1]?.text || '';
    const currText = paragraphs[idx]?.text || '';
    if (currText.length > 0) return null; // don't suggest if already writing
    const hasConflict = prevText.toLowerCase().match(/but|however|though|although|yet/);
    const hasAction = prevText.toLowerCase().match(/ran|jumped|shouted|grabbed|rushed|fell|crashed/);
    if (hasAction) return 'Suddenly,';
    if (hasConflict) return 'Despite this,';
    if (idx === paragraphs.length - 1) return 'Finally,';
    return TRANSITIONS[idx % TRANSITIONS.length];
  };

  // ── Writing timer ──
  useEffect(() => {
    if (timerActive && timerSeconds < timerDuration) {
      timerRef.current = setTimeout(() => setTimerSeconds(s => s + 1), 1000);
      return () => clearTimeout(timerRef.current);
    } else if (timerSeconds >= timerDuration && timerActive) {
      setTimerActive(false);
      if (addToast) addToast(t('toasts.writing_sprint_complete'), 'success');
    }
  }, [timerActive, timerSeconds, timerDuration]);

  const startTimer = (minutes) => {
    setTimerDuration(minutes * 60);
    setTimerSeconds(0);
    setTimerActive(true);
  };

  const formatTime = (secs) => {
    const remaining = Math.max(0, timerDuration - secs);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (exportConsent) finishExportConsent(false);
        else if (showCloseConfirm) setShowCloseConfirm(false);
        else if (showRestorePrompt) setShowRestorePrompt(false);
        else safeClose();
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isOpen) {
        e.preventDefault();
        try {
          const draft = createDraftSnapshot();
          localStorage.setItem(SAVE_KEY, JSON.stringify(draft));
          setIsDirty(false);
          if (addToast) addToast(t('toasts.draft_saved'), 'success');
        } catch(err) {
          if (addToast) addToast(t('toasts.could_save_draft_u2014_browser'), 'error');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, exportConsent, showCloseConfirm, showRestorePrompt, storyTitle, genre, vocabTerms, artStyle, customArtStyle, storyPrompt, rubricText, paragraphs, scaffoldsGenerated, draftCount, phase, language, storyShape, valenceByPara, layoutMode, comicPageLayout, comicPageComposer, comicPrintSafety, comicContinuity, panelDialogue, panelDirections, panelThumbnails, panelLayouts, panelStickers]);

  // ── Focus management: move focus into the dialog on open, trap Tab inside it, and
  //    restore focus to the trigger on close (WCAG 2.4.3 Focus Order / 2.1.2 No Keyboard Trap escape). ──
  useEffect(() => {
    if (!isOpen) return undefined;
    const root = modalRootRef.current;
    if (!root || typeof document === 'undefined') return undefined;
    // Remember what had focus so we can restore it when the dialog closes.
    previouslyFocusedRef.current = document.activeElement;
    const FOCUSABLE = 'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(root.querySelectorAll(FOCUSABLE)).filter(el => el.getClientRects().length > 0);
    // Defer so the first render is committed before we move focus in.
    const focusTimer = setTimeout(() => {
      const f = getFocusable();
      (f[0] || root).focus();
    }, 0);
    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const f = getFocusable();
      if (f.length === 0) { e.preventDefault(); root.focus(); return; }
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) { e.preventDefault(); last.focus(); }
      } else {
        if (active === last || !root.contains(active)) { e.preventDefault(); first.focus(); }
      }
    };
    root.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      root.removeEventListener('keydown', onKeyDown);
      const prev = previouslyFocusedRef.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
        try { prev.focus(); } catch (e) { /* element gone — nothing to restore to */ }
      }
    };
  }, [isOpen]);

  // ── Auto-save to localStorage ──
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const draft = createDraftSnapshot();
        localStorage.setItem(SAVE_KEY, JSON.stringify(draft));
      } catch (e) { /* localStorage full or unavailable */ }
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [storyTitle, genre, vocabTerms, artStyle, customArtStyle, storyPrompt, rubricText, paragraphs, scaffoldsGenerated, phase, draftCount, language, storyShape, valenceByPara, layoutMode, comicPageLayout, comicPageComposer, comicPrintSafety, comicContinuity, panelDialogue, panelDirections, panelThumbnails, panelLayouts, panelStickers]);

  // ── Load saved draft on mount ──
  const savedDraftRef = useRef(null);
  _storyForgeUseFocusTrap(restorePromptDialogRef, showRestorePrompt, () => setShowRestorePrompt(false));
  _storyForgeUseFocusTrap(closeConfirmDialogRef, showCloseConfirm, () => setShowCloseConfirm(false));
  _storyForgeUseFocusTrap(exportConsentDialogRef, !!exportConsent, () => finishExportConsent(false));
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data.paragraphs) && data.paragraphs.some(p => p && (
          (typeof p.text === 'string' && p.text.trim().length > 0) ||
          (typeof p.scaffoldFrame === 'string' && p.scaffoldFrame.trim().length > 0)
        ))) {
          savedDraftRef.current = data;
          setShowRestorePrompt(true);
        }
      }
    } catch (e) { /* ignore */ }
  }, []);

  const restoreDraft = () => {
    const d = savedDraftRef.current;
    if (!d) return;
    if (d.storyTitle) setStoryTitle(d.storyTitle);
    if (d.genre) setGenre(d.genre);
    if (d.vocabTerms) setVocabTerms(d.vocabTerms);
    if (d.artStyle) setArtStyle(d.artStyle);
    if (d.customArtStyle) setCustomArtStyle(d.customArtStyle);
    if (d.storyPrompt) setStoryPrompt(d.storyPrompt);
    if (d.rubricText) setRubricText(d.rubricText);
    if (d.paragraphs) { const cp = sanitizeParagraphs(d.paragraphs); if (cp) setParagraphs(cp); }
    if (d.scaffoldsGenerated) setScaffoldsGenerated(true);
    if (d.draftCount) setDraftCount(d.draftCount);
    if (d.phase) setPhase(d.phase);
    if (d.language) setLanguage(d.language);
    if (d.storyShape) setStoryShape(d.storyShape);
    if (d.valenceByPara && typeof d.valenceByPara === 'object') setValenceByPara(d.valenceByPara);
    if (d.layoutMode && LAYOUT_MODES[d.layoutMode]) setLayoutMode(d.layoutMode);
    if (d.comicPageLayout && COMIC_PAGE_LAYOUTS[d.comicPageLayout]) setComicPageLayout(d.comicPageLayout);
    setComicPageComposer(sanitizeComicPageComposer(d.comicPageComposer));
    setComicPrintSafety(sanitizeComicPrintSafety(d.comicPrintSafety));
    setComicContinuity(sanitizeComicContinuity(d.comicContinuity));
    setPanelDialogue(sanitizePanelDialogue(d.panelDialogue));
    setPanelDirections(sanitizePanelDirections(d.panelDirections));
    setPanelThumbnails(sanitizePanelThumbnails(d.panelThumbnails));
    setPanelLayouts(sanitizePanelLayouts(d.panelLayouts));
    setPanelStickers(sanitizePanelStickers(d.panelStickers));
    setShowRestorePrompt(false);
    if (addToast) addToast(t('toasts.draft_restored_2'), 'success');
    sfAnnounce('Draft restored');
  };

  const discardDraft = () => {
    localStorage.removeItem(SAVE_KEY);
    savedDraftRef.current = null;
    setShowRestorePrompt(false);
  };

  // ── Load initial config from teacher assignment ──
  useEffect(() => {
    if (initialConfig && initialConfig.vocabTerms) {
      if (initialConfig.storyTitle) setStoryTitle(initialConfig.storyTitle);
      if (initialConfig.genre) setGenre(initialConfig.genre);
      if (initialConfig.vocabTerms) setVocabTerms(initialConfig.vocabTerms);
      if (initialConfig.artStyle) setArtStyle(initialConfig.artStyle);
      if (initialConfig.customArtStyle) setCustomArtStyle(initialConfig.customArtStyle);
      if (initialConfig.storyPrompt) setStoryPrompt(initialConfig.storyPrompt);
      if (initialConfig.rubricText) setRubricText(initialConfig.rubricText);
      if (initialConfig.language) setLanguage(initialConfig.language);
      if (initialConfig.layoutMode && LAYOUT_MODES[initialConfig.layoutMode]) setLayoutMode(initialConfig.layoutMode);
      if (initialConfig.comicPageLayout && COMIC_PAGE_LAYOUTS[initialConfig.comicPageLayout]) setComicPageLayout(initialConfig.comicPageLayout);
      if (initialConfig.comicPageComposer) setComicPageComposer(sanitizeComicPageComposer(initialConfig.comicPageComposer));
      if (initialConfig.comicPrintSafety) setComicPrintSafety(sanitizeComicPrintSafety(initialConfig.comicPrintSafety));
      if (initialConfig.comicContinuity) setComicContinuity(sanitizeComicContinuity(initialConfig.comicContinuity));
      if (initialConfig.panelDirections) setPanelDirections(sanitizePanelDirections(initialConfig.panelDirections));
      if (initialConfig.panelThumbnails) setPanelThumbnails(sanitizePanelThumbnails(initialConfig.panelThumbnails));
      if (initialConfig.panelLayouts) setPanelLayouts(sanitizePanelLayouts(initialConfig.panelLayouts));
      if (initialConfig.minParagraphs) {
        setParagraphs(Array.from({ length: initialConfig.minParagraphs }, (_, i) => ({ id: `p-${i}`, text: '', scaffoldFrame: '', plotBeat: '' })));
      }
      if (addToast) addToast(t('toasts.assignment_loaded_from_teacher'), 'success');
    }
  }, [initialConfig]);

  // ── Save as teacher assignment (config resource) ──
  const saveAsConfig = () => {
    if (!onSaveConfig) return;
    const config = {
      storyTitle: storyTitle || sourceTopic || 'Story Assignment',
      genre, vocabTerms, artStyle, customArtStyle, storyPrompt, rubricText, language,
      layoutMode, comicPageLayout,
      comicPageComposer: sanitizeComicPageComposer(comicPageComposer),
      comicPrintSafety: sanitizeComicPrintSafety(comicPrintSafety),
      comicContinuity: sanitizeComicContinuity(comicContinuity),
      panelDirections: sanitizePanelDirections(panelDirections),
      panelThumbnails: sanitizePanelThumbnails(panelThumbnails),
      panelLayouts: sanitizePanelLayouts(panelLayouts),
      minParagraphs: paragraphs.length,
      maxParagraphs: 8,
      scaffoldsGenerated,
      scaffoldFrames: scaffoldsGenerated ? paragraphs.map(p => p.scaffoldFrame).filter(Boolean) : [],
    };
    onSaveConfig(config);
    if (addToast) addToast(t('toasts.storyforge_assignment_saved_lesson'), 'success');
  };

  const saveStoryForgeArtifactToAlloHaven = (submission) => {
    if (!submission) return;
    try {
      const ts = Date.now();
      const createdAt = new Date(ts).toISOString();
      const paragraphsForShelf = Array.isArray(submission.paragraphs) ? submission.paragraphs : [];
      const words = submission.analytics?.totalWords || 0;
      const items = paragraphsForShelf
        .map((p, idx) => ({
          id: p.id || `storyforge-paragraph-${idx}`,
          title: `Paragraph ${idx + 1}`,
          text: p.text || '',
          toolLabel: 'StoryForge',
          privacy: 'full',
        }))
        .filter(item => item.text.trim());
      const artifact = {
        id: `storyforge-${ts}`,
        type: 'storyforge-submission',
        source: 'storyforge',
        sourceLabel: 'StoryForge',
        kindLabel: 'StoryForge Story',
        title: submission.storyTitle || 'My Story',
        summary: `Student-controlled StoryForge story with ${words} words across ${paragraphsForShelf.length} paragraph${paragraphsForShelf.length === 1 ? '' : 's'}`,
        privacy: 'student-controlled',
        privacySummary: 'Student-controlled. Full story text is saved on this device for the AlloHaven Portfolio.',
        sourceSummary: 'Saved from StoryForge',
        lifecycleStatus: 'saved',
        version: 1,
        createdAt,
        updatedAt: createdAt,
        itemCount: items.length,
        items,
        artifact: submission,
      };
      const artifactStore = window.AlloModules && window.AlloModules.StudentArtifactStore;
      if (artifactStore && typeof artifactStore.save === 'function') {
        const next = artifactStore.save(artifact, { source: 'storyforge', limit: 80 });
        return { action: 'saved', artifact, count: Array.isArray(next) ? next.length : 0 };
      }
      let existing = [];
      if (Array.isArray(window.__alloflowStudentArtifacts)) {
        existing = window.__alloflowStudentArtifacts;
      } else {
        try { existing = JSON.parse(localStorage.getItem('alloflow_student_artifacts') || '[]'); } catch (_) { existing = []; }
      }
      const next = [artifact].concat(Array.isArray(existing) ? existing : []).slice(0, 80);
      window.__alloflowStudentArtifacts = next;
      localStorage.setItem('alloflow_student_artifacts', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('alloflow-student-artifacts-changed', {
        detail: { source: 'storyforge', sourceLabel: 'StoryForge', kindLabel: 'StoryForge Story', privacy: 'student-controlled', title: artifact.title, action: 'saved', artifact, count: next.length }
      }));
      return { action: 'saved', artifact, count: next.length };
    } catch (_) {}
    return null;
  };

  // ── Save completed story as submission resource ──
  const saveAsSubmission = () => {
    if (!onSaveSubmission) return;
    const submission = {
      storyTitle: storyTitle || 'My Story',
      authorName: authorName || 'Student',
      genre, language, vocabTerms,
      layoutMode, comicPageLayout,
      comicPageComposer: sanitizeComicPageComposer(comicPageComposer),
      comicPrintSafety: sanitizeComicPrintSafety(comicPrintSafety),
      comicContinuity: sanitizeComicContinuity(comicContinuity),
      comicFlowReport: layoutMode === 'comic' ? comicFlowReport : null,
      panelDialogue: sanitizePanelDialogue(panelDialogue),
      panelDirections: sanitizePanelDirections(panelDirections),
      panelThumbnails: sanitizePanelThumbnails(panelThumbnails),
      panelLayouts: sanitizePanelLayouts(panelLayouts),
      panelStickers: sanitizePanelStickers(panelStickers),
      paragraphs: paragraphs.map(p => ({ id: p.id, text: p.text, scaffoldFrame: p.scaffoldFrame, plotBeat: p.plotBeat || '' })),
      illustrations: Object.fromEntries(
        Object.entries(illustrations).filter(([, v]) => v?.imageUrl).map(([k, v]) => [k, { imageUrl: v.imageUrl }])
      ),
      coverArt,
      gradingResult,
      analytics: {
        totalWords, vocabUsedCount, vocabTotal: vocabTerms.length,
        readingLevel: readingLevel ? { grade: readingLevel.grade } : null,
        draftCount,
      },
      achievements: achievements.filter(a => a.earned).map(a => a.name),
      xp: { totalXP: xpData.totalXP, level: currentLevel.name },
    };
    onSaveSubmission(submission);
    const receipt = saveStoryForgeArtifactToAlloHaven(submission);
    const receiptText = receipt
      ? 'Saved new student-controlled StoryForge story to AlloHaven Portfolio. Open AlloHaven > Portfolio to view it.'
      : t('toasts.story_saved_portfolio');
    if (addToast) addToast(receiptText, 'success');
    sfAnnounce(receiptText);
    awardXP(10, 'Saved story to portfolio');
  };

  // ── Import from lesson resources ──
  const importFromResource = (resource) => {
    if (!resource) return;
    if (resource.type === 'glossary') {
      const terms = resource.data?.terms || resource.data || [];
      if (Array.isArray(terms) && terms.length > 0) {
        setVocabTerms(terms.map(g => ({ term: g.term || g.word || '', definition: g.def || g.definition || '' })).filter(v => v.term));
        if (addToast) addToast(`Imported ${terms.length} glossary terms!`, 'success');
      }
    } else if (resource.type === 'simplified') {
      const text = typeof resource.data === 'string' ? resource.data : resource.data?.originalText || '';
      if (text) {
        setStoryPrompt('Write a creative story inspired by this text: ' + text.substring(0, 300));
        if (addToast) addToast(t('toasts.imported_topic_from_reading_passage'), 'success');
      }
    } else if (resource.type === 'sentence-frames') {
      const frames = typeof resource.data === 'string' ? resource.data.split('\n').filter(Boolean) : [];
      if (frames.length > 0) {
        setParagraphs(frames.slice(0, 8).map((f, i) => ({ id: `p-${i}`, text: '', scaffoldFrame: f.replace(/^[\d.)\-\s]+/, '').trim(), plotBeat: '' })));
        setScaffoldsGenerated(true);
        if (addToast) addToast(`Imported ${frames.length} scaffold frames!`, 'success');
      }
    } else if (resource.type === 'lesson-plan') {
      const planText = typeof resource.data === 'string' ? resource.data : '';
      if (planText) {
        setStoryPrompt(planText.substring(0, 500));
        if (addToast) addToast(t('toasts.imported_lesson_plan_as_story'), 'success');
      }
    } else if (resource.type === 'timeline') {
      const timelineText = typeof resource.data === 'string' ? resource.data : '';
      if (timelineText) {
        const events = timelineText.split('\n').filter(l => l.trim().length > 10).slice(0, 8);
        setParagraphs(events.map((e, i) => ({ id: `p-${i}`, text: '', scaffoldFrame: e.trim(), plotBeat: '' })));
        setScaffoldsGenerated(true);
        if (addToast) addToast(`Imported ${events.length} timeline events as scaffolds!`, 'success');
      }
    }
  };

  // ── Phase navigation with focus management ──
  const phaseIdx = PHASES.indexOf(phase);
  const canGoNext = () => {
    if (phase === 'configure') return vocabTerms.length > 0;
    if (phase === 'write') return paragraphs.some(p => p.text.trim().length >= 20);
    return true;
  };
  const changePhase = (newPhase) => {
    setPhase(newPhase);
    // Move focus to phase content area for screen readers
    setTimeout(() => {
      if (phaseContentRef.current) {
        phaseContentRef.current.focus();
        phaseContentRef.current.scrollTop = 0;
      }
    }, 100);
  };
  const goNext = () => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) changePhase(PHASES[idx + 1]);
  };
  const goBack = () => {
    const idx = PHASES.indexOf(phase);
    if (idx > 0) changePhase(PHASES[idx - 1]);
  };

  // ═══════════════════════════════════════════════════════════
  // CONFIGURE PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const [newTerm, setNewTerm] = useState('');
  const [newDef, setNewDef] = useState('');

  const addVocabTerm = () => {
    if (!newTerm.trim()) return;
    const t = newTerm.trim();
    setVocabTerms(prev => [...prev, { term: t, definition: newDef.trim() }]);
    setNewTerm('');
    setNewDef('');
    sfAnnounce(`Term added: ${t}`);
  };

  const removeVocabTerm = (idx) => {
    const removed = vocabTerms[idx];
    setVocabTerms(prev => prev.filter((_, i) => i !== idx));
    if (removed) sfAnnounce(`Term removed: ${removed.term}`);
  };

  // ═══════════════════════════════════════════════════════════
  // WRITE PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const updateParagraph = (idx, text) => {
    setParagraphs(prev => prev.map((p, i) => i === idx ? { ...p, text } : p));
    if (!isDirty) setIsDirty(true);
  };

  const updateParagraphBeat = (idx, beat) => {
    setParagraphs(prev => prev.map((p, i) => i === idx ? { ...p, plotBeat: beat } : p));
    if (!isDirty) setIsDirty(true);
  };

  const addParagraph = () => {
    if (paragraphs.length >= maxParagraphs) return;
    const newId = `p-${Date.now()}`;
    setParagraphs(prev => [...prev, { id: newId, text: '', scaffoldFrame: '', plotBeat: '' }]);
    if (!isDirty) setIsDirty(true);
    // Auto-scroll to new paragraph after render
    setTimeout(() => {
      const el = document.getElementById('sf-para-' + newId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const duplicatePanelAfter = (idx) => {
    if (paragraphs.length >= maxParagraphs) {
      sfAnnounce(`Panel limit reached: ${maxParagraphs} panels`);
      return;
    }
    const source = paragraphs[idx];
    if (!source) return;
    const newId = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cloneMapValue = (setter, sourceId, transform = value => value) => {
      setter(prev => {
        if (!Object.prototype.hasOwnProperty.call(prev || {}, sourceId)) return prev;
        const value = prev[sourceId];
        const cloned = value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : value;
        return { ...prev, [newId]: transform(cloned) };
      });
    };
    setParagraphs(prev => {
      const current = prev[idx];
      if (!current) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, { ...current, id: newId });
      return next;
    });
    cloneMapValue(setPanelDialogue, source.id);
    cloneMapValue(setPanelDirections, source.id);
    cloneMapValue(setPanelThumbnails, source.id);
    cloneMapValue(setPanelLayouts, source.id);
    cloneMapValue(setPanelStickers, source.id);
    cloneMapValue(setValenceByPara, source.id);
    cloneMapValue(setIllustrations, source.id, value => value && typeof value === 'object'
      ? { ...value, isLoading: false, error: '' }
      : value);
    setFocusParagraphIdx(idx + 1);
    if (!isDirty) setIsDirty(true);
    sfAnnounce(`Panel ${idx + 1} duplicated as panel ${idx + 2}`);
    setTimeout(() => {
      const el = document.getElementById('sf-para-' + newId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const removeParagraph = (idx) => {
    if (paragraphs.length <= 1) return;
    const removedId = paragraphs[idx]?.id;
    if (removedId) {
      // Revoke this paragraph's audio blob: URLs (same pattern as the unmount cleanup)…
      const revoke = (u) => { if (typeof u === 'string' && u.startsWith('blob:')) { try { URL.revokeObjectURL(u); } catch (e) {} } };
      const seg = audioSegments[removedId];
      if (seg) { revoke(seg.studentAudioUrl); revoke(seg.aiAudioUrl); if (Array.isArray(seg.sentenceAudios)) seg.sentenceAudios.forEach(revoke); }
      // …then prune every per-paragraph keyed map so deleted data isn't kept or re-serialized.
      setAudioSegments(prev => { const n = { ...prev }; delete n[removedId]; return n; });
      setIllustrations(prev => { const n = { ...prev }; delete n[removedId]; return n; });
      setPanelDialogue(prev => { const n = { ...prev }; delete n[removedId]; return n; });
      setPanelDirections(prev => { const n = { ...prev }; delete n[removedId]; return n; });
      setPanelThumbnails(prev => { const n = { ...prev }; delete n[removedId]; return n; });
      setPanelLayouts(prev => { const n = { ...prev }; delete n[removedId]; return n; });
      setPanelStickers(prev => { const n = { ...prev }; delete n[removedId]; return n; });
      setGrammarResults(prev => { const n = { ...prev }; delete n[removedId]; return n; });
      setValenceByPara(prev => { const n = { ...prev }; delete n[removedId]; return n; });
    }
    setParagraphs(prev => prev.filter((_, i) => i !== idx));
  };

  const moveParagraph = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= paragraphs.length) return;
    setParagraphs(prev => {
      const arr = [...prev];
      const temp = arr[idx];
      arr[idx] = arr[newIdx];
      arr[newIdx] = temp;
      return arr;
    });
    setFocusParagraphIdx(prev => {
      if (prev === idx) return newIdx;
      if (prev === newIdx) return idx;
      return prev;
    });
    if (!isDirty) setIsDirty(true);
    sfAnnounce(`${layoutMode === 'comic' ? 'Panel' : 'Paragraph'} ${idx + 1} moved to position ${newIdx + 1}`);
  };

  const generateScaffolds = async () => {
    if (!onCallGemini) return;
    setIsProcessing(true);
    try {
      const genreHint = GENRE_TEMPLATES[genre]?.scaffoldHint;
      const shapeHint = STORY_SHAPES[storyShape]?.scaffoldHint;
      const frameCount = Math.max(minParagraphs, paragraphs.length);
      const isComicMode = layoutMode === 'comic';
      const prompt = isComicMode ? `You are helping a ${gradeLevel || '5th grade'} student plan a short comic about "${sourceTopic || 'a topic of their choice'}".
Required vocabulary terms the student must use: ${vocabTerms.map(v => v.term).join(', ')}.
${storyPrompt ? `Story theme/prompt: "${storyPrompt}"` : ''}
${genreHint ? `Genre: Use the structure of ${genreHint}.` : ''}
${shapeHint ? `Story shape: Trace the emotional arc as ${shapeHint}. Spread this rise and fall across the panels from beginning to end.` : ''}
Page layout: ${COMIC_PAGE_LAYOUTS[comicPageLayout]?.label || 'Grid'} — ${COMIC_PAGE_LAYOUTS[comicPageLayout]?.desc || COMIC_PAGE_LAYOUTS.grid.desc}
Issue plan: ${comicPageGroups.length} page${comicPageGroups.length === 1 ? '' : 's'}, ${sanitizeComicPageComposer(comicPageComposer).panelsPerPage} panel${sanitizeComicPageComposer(comicPageComposer).panelsPerPage === 1 ? '' : 's'} per page. Use page turns as natural reveals, pauses, or payoffs when the story needs them.
Print profile: ${getComicPrintFormatLabel(sanitizeComicPrintSafety(comicPrintSafety).format)} with ${getComicPrintGutterLabel(sanitizeComicPrintSafety(comicPrintSafety).gutter).toLowerCase()}. Keep speech bubbles inside safe text zones and away from binding gutters.

Generate exactly ${frameCount} comic panel plans.
Each panel needs:
- caption: a short narration-caption scaffold that guides the student's panel writing
- beat: one of setup, inciting, rising, climax, falling, resolution
- speaker: short speaker name or ""
- speech: one brief speech bubble or ""
- thought: one brief thought bubble or ""
- sfx: one short sound effect or ""
- shot: one of ${COMIC_SHOT_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')} or ""
- angle: one of ${COMIC_ANGLE_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')} or ""
- mood: one of ${COMIC_MOOD_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')} or ""
- transition: one of ${COMIC_TRANSITION_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')} or ""

Use 1-2 vocabulary terms naturally across each panel caption or bubble where possible.
Panel 1 should set the scene. Middle panels should build action/conflict. The last panel should resolve the story.
${langInstruction}
Return ONLY JSON: { "panels": [{ "caption": "Panel caption scaffold...", "beat": "setup", "speaker": "", "speech": "", "thought": "", "sfx": "", "shot": "wide", "angle": "eye-level", "mood": "neutral", "transition": "establish" }] }`
      : `You are helping a ${gradeLevel || '5th grade'} student write a creative story about "${sourceTopic || 'a topic of their choice'}".
Required vocabulary terms the student must use: ${vocabTerms.map(v => v.term).join(', ')}.
${storyPrompt ? `Story theme/prompt: "${storyPrompt}"` : ''}
${genreHint ? `Genre: Write ${genreHint}.` : ''}
${shapeHint ? `Story shape: Trace the emotional arc as ${shapeHint}. Spread this rise and fall across the frames from beginning to end.` : ''}

Generate exactly ${frameCount} paragraph scaffold frames (opening sentences that guide the student through a narrative arc: beginning, middle, end).
Each frame should naturally encourage using 1-2 of the vocabulary terms.
Frame 1 should set the scene. The middle frames should develop conflict/action. The last frame should resolve the story.
${langInstruction}
Return ONLY JSON: { "frames": ["Frame 1 text...", "Frame 2 text...", ...] }`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      if (isComicMode && Array.isArray(data.panels)) {
        const validBeats = new Set(PLOT_BEATS.map(b => b.value).filter(Boolean));
        const panels = data.panels.slice(0, maxParagraphs);
        const newParagraphs = panels.map((panel, i) => {
          const previous = paragraphs[i] || {};
          const caption = panel && typeof panel.caption === 'string'
            ? panel.caption
            : (panel && typeof panel.scaffoldFrame === 'string' ? panel.scaffoldFrame : '');
          const beat = panel && typeof panel.beat === 'string' ? panel.beat : '';
          return {
            id: previous.id || `p-${Date.now()}-${i}`,
            text: previous.text || '',
            scaffoldFrame: caption,
            plotBeat: validBeats.has(beat) ? beat : (previous.plotBeat || ''),
          };
        });
        const bubbleUpdates = {};
        const directionUpdates = {};
        panels.forEach((panel, i) => {
          if (!panel || typeof panel !== 'object') return;
          const id = newParagraphs[i]?.id;
          if (!id) return;
          const clean = sanitizePanelDialogue({ [id]: {
            speaker: typeof panel.speaker === 'string' ? panel.speaker : '',
            speech: typeof panel.speech === 'string' ? panel.speech : '',
            thought: typeof panel.thought === 'string' ? panel.thought : '',
            sfx: typeof panel.sfx === 'string' ? panel.sfx : '',
          } })[id];
          if (clean) bubbleUpdates[id] = clean;
          const cleanDirection = sanitizePanelDirections({ [id]: {
            shot: typeof panel.shot === 'string' ? panel.shot : '',
            angle: typeof panel.angle === 'string' ? panel.angle : '',
            mood: typeof panel.mood === 'string' ? panel.mood : '',
            transition: typeof panel.transition === 'string' ? panel.transition : '',
          } })[id];
          if (cleanDirection) directionUpdates[id] = cleanDirection;
        });
        setParagraphs(newParagraphs);
        if (Object.keys(bubbleUpdates).length > 0) {
          setPanelDialogue(prev => {
            const next = { ...prev };
            Object.keys(bubbleUpdates).forEach((id) => { next[id] = { ...(next[id] || {}), ...bubbleUpdates[id] }; });
            return next;
          });
        }
        if (Object.keys(directionUpdates).length > 0) {
          setPanelDirections(prev => {
            const next = { ...prev };
            Object.keys(directionUpdates).forEach((id) => { next[id] = { ...(next[id] || {}), ...directionUpdates[id] }; });
            return next;
          });
        }
        setScaffoldsGenerated(true);
        if (addToast) addToast('Comic panel plan generated.', 'success');
        awardXP(5, 'Generated comic panel plan');
      } else if (data.frames && Array.isArray(data.frames)) {
        const newParagraphs = data.frames.map((frame, i) => ({
          id: paragraphs[i]?.id || `p-${Date.now()}-${i}`,
          text: paragraphs[i]?.text || '',
          scaffoldFrame: frame,
          plotBeat: paragraphs[i]?.plotBeat || '',
        }));
        setParagraphs(newParagraphs);
        setScaffoldsGenerated(true);
        if (addToast) addToast(t('toasts.scaffold_frames_generated'), 'success');
        awardXP(5, 'Generated scaffolds');
      }
    } catch (err) {
      console.warn('Scaffold generation failed:', err);
      if (addToast) addToast(t('toasts.failed_generate_scaffolds'), 'error');
    }
    setIsProcessing(false);
  };

  // ── Help Me Write — AI coaching per paragraph ──
  const helpMeWrite = async (idx) => {
    if (!onCallGemini) return;
    setHelpMeParagraphIdx(idx);
    setHelpMeResult(null);
    const p = paragraphs[idx];
    const prevContext = paragraphs.slice(0, idx).map(pp => pp.text).join('\n');
    const unusedTerms = vocabTerms.filter(v => !vocabUsage[v.term]).map(v => v.term);
    try {
      const prompt = `You are a helpful writing coach for a ${gradeLevel || '5th grade'} student.
They are writing paragraph ${idx + 1} of a creative story about "${sourceTopic || 'their topic'}".
${GENRE_TEMPLATES[genre]?.scaffoldHint ? `Genre: ${GENRE_TEMPLATES[genre].label}` : ''}
${p.scaffoldFrame ? `Scaffold frame: "${p.scaffoldFrame}"` : ''}
${prevContext ? `Story so far:\n"""${prevContext.substring(0, 800)}"""` : ''}
${p.text ? `Their current draft for this paragraph:\n"""${p.text}"""` : 'They have not started this paragraph yet.'}
${unusedTerms.length > 0 ? `Unused vocabulary they still need to include: ${unusedTerms.join(', ')}` : 'All vocabulary terms have been used.'}

Give 3 brief, encouraging suggestions to help them write or improve this paragraph. Each should be 1-2 sentences max. Be specific and actionable, not generic. If they haven't started, help them get started. If they have text, help them make it stronger.
${langInstruction}
Return ONLY JSON: { "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"] }`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      setHelpMeResult(data.suggestions || []);
    } catch (err) {
      console.warn('Help Me Write failed:', err);
      setHelpMeResult(['Try starting with a strong action verb.', 'Describe what the character sees, hears, or feels.', `Try using the word "${unusedTerms[0] || vocabTerms[0]?.term || 'your vocabulary term'}" in this paragraph.`]);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // GRAMMAR / STYLE CHECKER + SHOW DON'T TELL
  // ═══════════════════════════════════════════════════════════

  const draftComicBubbles = async (targetIdx = null) => {
    if (!onCallGemini) return;
    const selectedPanels = paragraphs
      .map((p, idx) => ({ p, idx }))
      .filter(({ p, idx }) => (targetIdx === null || idx === targetIdx) && ((p.text || p.scaffoldFrame || '').trim().length > 0));
    if (selectedPanels.length === 0) {
      if (addToast) addToast('Add a narration caption before drafting comic bubbles.', 'info');
      return;
    }
    setIsProcessing(true);
    try {
      const panelBrief = selectedPanels.map(({ p, idx }) => ({
        panel: idx + 1,
        narration: (p.text || p.scaffoldFrame || '').slice(0, 700),
        current: panelDialogue[p.id] || {},
        currentDirection: panelDirections[p.id] || {},
      }));
      const prompt = `You are helping a ${gradeLevel || '5th grade'} student turn story narration into comic panels.
For each panel, draft concise comic bubble content from the narration.
Rules:
- Do not rewrite the narration caption.
- Use one short speech bubble only when a character would naturally say something.
- Use one short thought bubble only when inner feeling or realization matters.
- Use one SFX only when there is a clear action sound; keep it to 1-2 words.
- Keep total speech + thought + SFX under ${COMIC_BUBBLE_WORD_LIMIT} words when possible.
- Speaker names should be short. Leave fields as "" when not needed.
- Also suggest simple visual direction when the narration implies it:
  shot: one of ${COMIC_SHOT_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')} or ""
  angle: one of ${COMIC_ANGLE_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')} or ""
  mood: one of ${COMIC_MOOD_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')} or ""
  transition: one of ${COMIC_TRANSITION_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')} or ""
- Keep language appropriate for school and for the student's grade level.
${langInstruction}

Panels:
${JSON.stringify(panelBrief, null, 2)}

Return ONLY JSON:
{
  "panels": [
    { "panel": 1, "speaker": "", "speech": "", "thought": "", "sfx": "", "shot": "", "angle": "", "mood": "", "transition": "" }
  ]
}`;
      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      const generated = Array.isArray(data.panels) ? data.panels : [];
      const byPanel = new Map(generated.map(item => [Number(item.panel), item]));
      const updates = {};
      const directionUpdates = {};
      selectedPanels.forEach(({ p, idx }) => {
        const raw = byPanel.get(idx + 1);
        if (!raw || typeof raw !== 'object') return;
        const normalized = {
          speaker: typeof raw.speaker === 'string' ? raw.speaker : '',
          speech: typeof raw.speech === 'string' ? raw.speech : (typeof raw.dialogue === 'string' ? raw.dialogue : ''),
          thought: typeof raw.thought === 'string' ? raw.thought : '',
          sfx: typeof raw.sfx === 'string' ? raw.sfx : (typeof raw.soundEffect === 'string' ? raw.soundEffect : ''),
        };
        const clean = sanitizePanelDialogue({ [p.id]: normalized })[p.id];
        if (clean) updates[p.id] = clean;
        const cleanDirection = sanitizePanelDirections({ [p.id]: {
          shot: typeof raw.shot === 'string' ? raw.shot : '',
          angle: typeof raw.angle === 'string' ? raw.angle : '',
          mood: typeof raw.mood === 'string' ? raw.mood : '',
          transition: typeof raw.transition === 'string' ? raw.transition : '',
        } })[p.id];
        if (cleanDirection) directionUpdates[p.id] = cleanDirection;
      });
      const dialogueApplied = Object.keys(updates).length;
      const directionApplied = Object.keys(directionUpdates).length;
      if (dialogueApplied > 0) {
        setPanelDialogue(prev => {
          const next = { ...prev };
          Object.keys(updates).forEach((id) => { next[id] = { ...(next[id] || {}), ...updates[id] }; });
          return next;
        });
      }
      if (directionApplied > 0) {
        setPanelDirections(prev => {
          const next = { ...prev };
          Object.keys(directionUpdates).forEach((id) => { next[id] = { ...(next[id] || {}), ...directionUpdates[id] }; });
          return next;
        });
      }
      if (dialogueApplied > 0 || directionApplied > 0) {
        setIsDirty(true);
        awardXP(5, 'Drafted comic bubbles');
        if (addToast) addToast(targetIdx === null ? 'Comic bubbles and direction drafted.' : `Panel ${targetIdx + 1} comic notes drafted.`, 'success');
        sfAnnounce('Comic notes drafted');
      } else if (addToast) {
        addToast('No comic bubbles were generated. Try adding more panel narration.', 'info');
      }
    } catch (err) {
      console.warn('Comic bubble drafting failed:', err);
      if (addToast) addToast('Comic bubble drafting failed. Try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const tightenComicBubbles = async (targetIdx = null) => {
    if (!onCallGemini) return;
    const selectedPanels = paragraphs
      .map((p, idx) => {
        const dialogue = panelDialogue[p.id] || {};
        return { p, idx, dialogue, lettering: getComicLetteringStats(dialogue) };
      })
      .filter(({ idx, lettering }) => {
        if (typeof targetIdx === 'number') return idx === targetIdx && lettering.words > 0;
        return lettering.words > COMIC_BUBBLE_WORD_WARNING;
      });
    if (selectedPanels.length === 0) {
      if (addToast) addToast(typeof targetIdx === 'number' ? 'Add bubble text before tightening this panel.' : 'No crowded comic bubbles to tighten.', 'info');
      return;
    }
    setIsProcessing(true);
    try {
      const panelBrief = selectedPanels.map(({ p, idx, dialogue, lettering }) => ({
        panel: idx + 1,
        narration: (p.text || p.scaffoldFrame || '').slice(0, 700),
        current: dialogue,
        lettering: {
          words: lettering.words,
          speechWords: lettering.speechWords,
          thoughtWords: lettering.thoughtWords,
          sfxWords: lettering.sfxWords,
          limit: lettering.limit,
        },
        currentDirection: panelDirections[p.id] || {},
      }));
      const prompt = `You are a comic lettering editor helping a ${gradeLevel || '5th grade'} student tighten crowded panels.
Rewrite only the comic bubble fields: speaker, speech, thought, and sfx.
Rules:
- Preserve the panel's meaning, voice, and school-appropriate tone.
- Do not rewrite narration captions or visual direction.
- Keep each panel's total speech + thought + SFX under ${COMIC_BUBBLE_WORD_LIMIT} words when possible.
- Prefer shorter natural phrasing over summaries.
- Keep SFX to 1-2 punchy words.
- Leave a field as "" only when it is no longer needed.
${langInstruction}

Panels:
${JSON.stringify(panelBrief, null, 2)}

Return ONLY JSON:
{
  "panels": [
    { "panel": 1, "speaker": "", "speech": "", "thought": "", "sfx": "" }
  ]
}`;
      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      const generated = Array.isArray(data.panels) ? data.panels : [];
      const byPanel = new Map(generated.map(item => [Number(item.panel), item]));
      const updates = {};
      selectedPanels.forEach(({ p, idx, dialogue }) => {
        const raw = byPanel.get(idx + 1);
        if (!raw || typeof raw !== 'object') return;
        const hasRaw = (key) => Object.prototype.hasOwnProperty.call(raw, key);
        const hasRewrite = ['speaker', 'speech', 'dialogue', 'thought', 'sfx', 'soundEffect'].some(hasRaw);
        if (!hasRewrite) return;
        const normalized = {
          speaker: hasRaw('speaker') && typeof raw.speaker === 'string' ? raw.speaker : (dialogue.speaker || ''),
          speech: hasRaw('speech') && typeof raw.speech === 'string'
            ? raw.speech
            : (hasRaw('dialogue') && typeof raw.dialogue === 'string' ? raw.dialogue : (dialogue.speech || '')),
          thought: hasRaw('thought') && typeof raw.thought === 'string' ? raw.thought : (dialogue.thought || ''),
          sfx: hasRaw('sfx') && typeof raw.sfx === 'string'
            ? raw.sfx
            : (hasRaw('soundEffect') && typeof raw.soundEffect === 'string' ? raw.soundEffect : (dialogue.sfx || '')),
        };
        updates[p.id] = sanitizePanelDialogue({ [p.id]: normalized })[p.id] || {};
      });
      const applied = Object.keys(updates).length;
      if (applied > 0) {
        setPanelDialogue(prev => {
          const next = { ...prev };
          Object.keys(updates).forEach((id) => {
            if (Object.keys(updates[id]).length) next[id] = updates[id];
            else delete next[id];
          });
          return next;
        });
        setIsDirty(true);
        awardXP(4, 'Tightened comic bubbles');
        if (addToast) addToast(targetIdx === null ? `Tightened ${applied} crowded comic panel${applied === 1 ? '' : 's'}.` : `Panel ${targetIdx + 1} bubbles tightened.`, 'success');
        sfAnnounce('Comic bubbles tightened');
      } else if (addToast) {
        addToast('No bubble tightening edits were returned. Try again with more dialogue.', 'info');
      }
    } catch (err) {
      console.warn('Comic bubble tightening failed:', err);
      if (addToast) addToast('Comic bubble tightening failed. Try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const draftComicCameraPass = async (targetIdx = null) => {
    if (!onCallGemini) return;
    const selectedPanels = paragraphs
      .map((p, idx) => ({ p, idx }))
      .filter(({ p, idx }) => (typeof targetIdx === 'number' ? idx === targetIdx : true) && ((p.text || p.scaffoldFrame || '').trim().length > 0));
    if (selectedPanels.length === 0) {
      if (addToast) addToast(typeof targetIdx === 'number' ? 'Add a caption before directing this panel.' : 'Add panel captions before running a camera pass.', 'info');
      return;
    }
    setIsProcessing(true);
    try {
      const panelBrief = selectedPanels.map(({ p, idx }) => {
        const dialogue = panelDialogue[p.id] || {};
        const lettering = getComicLetteringStats(dialogue);
        return {
          panel: idx + 1,
          caption: (p.text || p.scaffoldFrame || '').slice(0, 700),
          dialogue,
          bubbleWords: lettering.words,
          currentDirection: panelDirections[p.id] || {},
          beat: p.plotBeat || '',
        };
      });
      const prompt = `You are a comic storyboard artist planning camera rhythm for a ${gradeLevel || '5th grade'} student's short comic.
Revise only visual direction: shot, angle, mood, and transition.
Rules:
- Do not rewrite captions, dialogue, thoughts, or SFX.
- Choose clear, drawable directions that match each panel's story beat.
- Across the sequence, create visual variety: establish place, push action, show reactions, reveal important details, and resolve cleanly.
- Use close shots for emotion, wide shots for setting, detail shots for clues/objects, and reaction shots for consequences.
- Keep the choices school-appropriate and easy for an image generator or student artist to follow.
- If a current direction is already strong, you may keep it.
- Return one direction set per panel.
Allowed values:
  shot: ${COMIC_SHOT_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')}
  angle: ${COMIC_ANGLE_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')}
  mood: ${COMIC_MOOD_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')}
  transition: ${COMIC_TRANSITION_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')}
${langInstruction}

Panels:
${JSON.stringify(panelBrief, null, 2)}

Return ONLY JSON:
{
  "panels": [
    { "panel": 1, "shot": "", "angle": "", "mood": "", "transition": "" }
  ]
}`;
      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      const generated = Array.isArray(data.panels) ? data.panels : [];
      const byPanel = new Map(generated.map(item => [Number(item.panel), item]));
      const directionUpdates = {};
      selectedPanels.forEach(({ p, idx }) => {
        const raw = byPanel.get(idx + 1);
        if (!raw || typeof raw !== 'object') return;
        const cleanDirection = sanitizePanelDirections({ [p.id]: {
          shot: typeof raw.shot === 'string' ? raw.shot : (typeof raw.cameraShot === 'string' ? raw.cameraShot : ''),
          angle: typeof raw.angle === 'string' ? raw.angle : (typeof raw.cameraAngle === 'string' ? raw.cameraAngle : ''),
          mood: typeof raw.mood === 'string' ? raw.mood : (typeof raw.tone === 'string' ? raw.tone : ''),
          transition: typeof raw.transition === 'string' ? raw.transition : (typeof raw.move === 'string' ? raw.move : ''),
        } })[p.id];
        if (cleanDirection) directionUpdates[p.id] = cleanDirection;
      });
      const applied = Object.keys(directionUpdates).length;
      if (applied > 0) {
        setPanelDirections(prev => {
          const next = { ...prev };
          Object.keys(directionUpdates).forEach((id) => { next[id] = { ...(next[id] || {}), ...directionUpdates[id] }; });
          return next;
        });
        setComicFlowReport(null);
        setIsDirty(true);
        awardXP(5, 'Ran comic camera pass');
        if (addToast) addToast(targetIdx === null ? `Camera pass updated ${applied} comic panel${applied === 1 ? '' : 's'}.` : `Panel ${targetIdx + 1} direction updated.`, 'success');
        sfAnnounce('Comic camera pass applied');
      } else if (addToast) {
        addToast('No camera direction edits were returned. Try adding clearer captions.', 'info');
      }
    } catch (err) {
      console.warn('Comic camera pass failed:', err);
      if (addToast) addToast('Comic camera pass failed. Try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const draftComicThumbnailPass = async (targetIdx = null) => {
    if (!onCallGemini) return;
    const selectedPanels = paragraphs
      .map((p, idx) => ({ p, idx }))
      .filter(({ p, idx }) => (typeof targetIdx === 'number' ? idx === targetIdx : true) && ((p.text || p.scaffoldFrame || '').trim().length > 0));
    if (selectedPanels.length === 0) {
      if (addToast) addToast(typeof targetIdx === 'number' ? 'Add a caption before roughing this panel.' : 'Add panel captions before running thumbnail roughs.', 'info');
      return;
    }
    setIsProcessing(true);
    try {
      const panelBrief = selectedPanels.map(({ p, idx }) => {
        const dialogue = panelDialogue[p.id] || {};
        const lettering = getComicLetteringStats(dialogue);
        return {
          panel: idx + 1,
          caption: (p.text || p.scaffoldFrame || '').slice(0, 700),
          dialogue,
          bubbleWords: lettering.words,
          direction: panelDirections[p.id] || {},
          currentRough: panelThumbnails[p.id] || {},
        };
      });
      const result = await onCallGemini(
        `You are a comic layout artist making thumbnail rough notes for a student comic.
Create a quick composition plan for each panel before final art.

Rules:
- Do not rewrite captions, dialogue, or camera direction.
- Pick one clear focal point the reader should notice first.
- Describe the composition in practical visual terms: foreground/background, character placement, silhouette, motion, or negative space.
- Reserve lettering space so speech/thought/SFX can fit without covering the focal point.
- Keep sketch notes concise, drawable, and school-appropriate.
- Use "none" for letteringSpace only if there are no bubbles or SFX.
- Return one rough note per panel.

Allowed letteringSpace values:
${COMIC_LETTERING_SPACE_OPTIONS.filter(o => o.value).map(o => o.value).join(', ')}
${langInstruction}

Panels:
${JSON.stringify(panelBrief, null, 2)}

Return ONLY JSON:
{
  "panels": [
    { "panel": 1, "focalPoint": "", "composition": "", "letteringSpace": "", "sketchNote": "" }
  ]
}`,
        true
      );
      const data = JSON.parse(cleanJson(result));
      const generated = Array.isArray(data.panels) ? data.panels : [];
      const byPanel = new Map(generated.map(item => [Number(item.panel), item]));
      const roughUpdates = {};
      selectedPanels.forEach(({ p, idx }) => {
        const raw = byPanel.get(idx + 1);
        if (!raw || typeof raw !== 'object') return;
        const clean = sanitizePanelThumbnails({ [p.id]: {
          focalPoint: typeof raw.focalPoint === 'string' ? raw.focalPoint : (typeof raw.focus === 'string' ? raw.focus : ''),
          composition: typeof raw.composition === 'string' ? raw.composition : (typeof raw.layout === 'string' ? raw.layout : ''),
          letteringSpace: typeof raw.letteringSpace === 'string' ? raw.letteringSpace : (typeof raw.bubbleSpace === 'string' ? raw.bubbleSpace : ''),
          sketchNote: typeof raw.sketchNote === 'string' ? raw.sketchNote : (typeof raw.note === 'string' ? raw.note : ''),
        } })[p.id];
        if (clean) roughUpdates[p.id] = clean;
      });
      const applied = Object.keys(roughUpdates).length;
      if (applied > 0) {
        setPanelThumbnails(prev => {
          const next = { ...prev };
          Object.keys(roughUpdates).forEach((id) => { next[id] = { ...(next[id] || {}), ...roughUpdates[id] }; });
          return next;
        });
        setComicFlowReport(null);
        setIsDirty(true);
        awardXP(5, 'Ran comic thumbnail roughs');
        if (addToast) addToast(targetIdx === null ? `Thumbnail roughs updated ${applied} panel${applied === 1 ? '' : 's'}.` : `Panel ${targetIdx + 1} thumbnail rough updated.`, 'success');
        sfAnnounce('Comic thumbnail roughs applied');
      } else if (addToast) {
        addToast('No thumbnail roughs were returned. Try adding clearer panel captions.', 'info');
      }
    } catch (err) {
      console.warn('Comic thumbnail rough pass failed:', err);
      if (addToast) addToast('Comic thumbnail rough pass failed. Try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const checkGrammarAndStyle = async () => {
    if (!onCallGemini) return;
    setGrammarLoading(true);
    try {
      const fullText = paragraphs.map((p, i) => `[P${i + 1}] ${p.text}`).join('\n\n');
      const prompt = `You are an expert writing coach for a ${gradeLevel || '5th grade'} student. Analyze this creative story for:
1. Grammar and spelling errors
2. Weak or vague verbs (e.g., "walked" → "strolled", "said" → "whispered")
3. Passive voice that could be active
4. "Telling" instead of "showing" (e.g., "She was sad" → "Her shoulders slumped and she stared at the floor")
5. Sentence variety issues (repeated starters, monotonous rhythm)

Story:
"""
${fullText}
"""
${langInstruction}
For each issue found, specify which paragraph it's in. Be encouraging — frame suggestions positively. Max 3 issues per paragraph, max 15 total. Only flag genuine improvements, not style preferences.

Return ONLY JSON:
{
  "paragraphs": {
    "P1": [{"type": "grammar|weak_verb|passive|show_dont_tell|variety", "original": "the problematic phrase", "suggestion": "improved version", "tip": "brief friendly explanation"}],
    "P2": [...]
  },
  "overallTip": "One encouraging overall writing tip"
}`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      const results = {};
      if (data.paragraphs) {
        paragraphs.forEach((p, i) => {
          const key = `P${i + 1}`;
          if (data.paragraphs[key] && data.paragraphs[key].length > 0) {
            results[p.id] = data.paragraphs[key];
          }
        });
      }
      setGrammarResults({ ...results, _overallTip: data.overallTip || '' });
      awardXP(5, 'Checked writing style');
      if (addToast) addToast(t('toasts.writing_check_complete'), 'success');
    } catch (err) {
      console.warn('Grammar check failed:', err);
      if (addToast) addToast(t('toasts.writing_check_failed_try_again'), 'error');
    }
    setGrammarLoading(false);
  };

  // ═══════════════════════════════════════════════════════════
  // ILLUSTRATE PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const getStyleDesc = () => {
    if (artStyle === 'custom' && customArtStyle) return customArtStyle;
    return ART_STYLE_MAP[artStyle] || ART_STYLE_MAP['storybook'];
  };

  const getComicContinuityPrompt = () => {
    if (layoutMode !== 'comic') return '';
    const notes = sanitizeComicContinuity(comicContinuity);
    const lines = [];
    if (notes.cast.trim()) lines.push(`Cast continuity: ${notes.cast.trim()}`);
    if (notes.setting.trim()) lines.push(`Setting continuity: ${notes.setting.trim()}`);
    if (notes.palette.trim()) lines.push(`Color palette: ${notes.palette.trim()}`);
    if (notes.styleNotes.trim()) lines.push(`Style rules: ${notes.styleNotes.trim()}`);
    return lines.join('\n');
  };

  const finalizeImagePrompt = (prompt) => {
    const base = String(prompt || '').trim();
    if (!base) return '';
    return /NO TEXT/i.test(base) && /NO WORDS/i.test(base)
      ? base
      : `${base} STRICTLY NO TEXT, NO LABELS, NO WORDS IN THE IMAGE.`;
  };

  const draftComicContinuity = async () => {
    if (!onCallGemini) return;
    const panelBrief = paragraphs
      .map((p, idx) => ({
        panel: idx + 1,
        caption: (p.text || p.scaffoldFrame || '').slice(0, 500),
        dialogue: panelDialogue[p.id] || {},
        direction: panelDirections[p.id] || {},
      }))
      .filter(item => item.caption.trim().length > 0);
    if (panelBrief.length === 0) {
      if (addToast) addToast('Add panel captions before drafting continuity notes.', 'info');
      return;
    }
    setIsProcessing(true);
    try {
      const currentNotes = sanitizeComicContinuity(comicContinuity);
      const result = await onCallGemini(
        `You are helping a student make a comic book production continuity sheet.
Use the panel plans to create concise visual notes that keep AI-generated panels consistent.

Panels:
${JSON.stringify(panelBrief, null, 2)}

Current continuity notes:
${JSON.stringify(currentNotes, null, 2)}

Rules:
- Keep notes specific and visual.
- Describe recurring characters by stable visual traits, outfit, proportions, and role.
- Describe recurring setting details and props.
- Give a compact color palette.
- Add style rules that help keep the comic visually consistent.
- Do not invent unsafe or inappropriate content.
${langInstruction}

Return ONLY JSON:
{ "cast": "character model notes", "setting": "setting and prop continuity", "palette": "color palette", "styleNotes": "linework, lighting, panel consistency rules" }`,
        true
      );
      const data = JSON.parse(cleanJson(result));
      const compact = (value) => Array.isArray(value)
        ? value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('; ')
        : (typeof value === 'string' ? value : '');
      const clean = sanitizeComicContinuity({
        cast: compact(data.cast || data.characters || data.characterNotes),
        setting: compact(data.setting || data.world || data.props),
        palette: compact(data.palette || data.colors),
        styleNotes: compact(data.styleNotes || data.style || data.rules),
      });
      setComicContinuity(clean);
      setIsDirty(true);
      awardXP(5, 'Drafted comic continuity sheet');
      if (addToast) addToast('Comic continuity notes drafted.', 'success');
      sfAnnounce('Comic continuity notes drafted');
    } catch (err) {
      console.warn('Comic continuity drafting failed:', err);
      if (addToast) addToast('Comic continuity drafting failed. Try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getIllustrationSourceText = (paragraph) => {
    if (!paragraph) return '';
    const base = (paragraph.text || paragraph.scaffoldFrame || '').trim();
    if (layoutMode !== 'comic') return base;
    const bubble = panelDialogue[paragraph.id] || {};
    const direction = panelDirections[paragraph.id] || {};
    const rough = panelThumbnails[paragraph.id] || {};
    const layoutFrame = panelLayouts[paragraph.id] || {};
    const bubbleLines = [];
    const directionBits = [
      direction.shot ? `Shot: ${getComicDirectionLabel('shot', direction.shot)}` : '',
      direction.angle ? `Angle: ${getComicDirectionLabel('angle', direction.angle)}` : '',
      direction.mood ? `Mood: ${getComicDirectionLabel('mood', direction.mood)}` : '',
      direction.transition ? `Transition: ${getComicDirectionLabel('transition', direction.transition)}` : '',
    ].filter(Boolean);
    if (bubble.speaker || bubble.speech) bubbleLines.push(`Speech bubble: ${bubble.speaker ? bubble.speaker + ': ' : ''}${bubble.speech || ''}`.trim());
    if (bubble.thought) bubbleLines.push(`Thought bubble: ${bubble.thought}`);
    if (bubble.sfx) bubbleLines.push(`Sound effect: ${bubble.sfx}`);
    if (directionBits.length) bubbleLines.push(`Visual direction: ${directionBits.join(', ')}`);
    const roughBits = [
      layoutFrame.frame || layoutFrame.colSpan || layoutFrame.rowSpan ? `Panel frame: ${getComicPanelFrameLabel(layoutFrame.frame)} (${getComicPanelSpanLabel(layoutFrame, comicPageLayout, 0)})` : '',
      rough.focalPoint ? `Focal point: ${rough.focalPoint}` : '',
      rough.composition ? `Composition: ${rough.composition}` : '',
      rough.letteringSpace ? `Reserve lettering space: ${getComicLetteringSpaceLabel(rough.letteringSpace)}` : '',
      rough.sketchNote ? `Thumbnail note: ${rough.sketchNote}` : '',
    ].filter(Boolean);
    if (roughBits.length) bubbleLines.push(`Thumbnail rough: ${roughBits.join('; ')}`);
    return [base, ...bubbleLines, getComicContinuityPrompt()].filter(Boolean).join('\n');
  };

  const generateImagePrompt = async (paragraphId, text, idx) => {
    const panel = paragraphs.find(p => p.id === paragraphId);
    const sourceText = (text || '').trim() || getIllustrationSourceText(panel);
    if (!sourceText) return;
    const savedPrompt = finalizeImagePrompt(illustrations[paragraphId]?.prompt);
    if (savedPrompt) {
      setPromptPreview({ paragraphId, text: sourceText, idx, prompt: savedPrompt });
      return;
    }
    if (!onCallGemini) return;
    const style = getStyleDesc();
    const sourceLimit = layoutMode === 'comic' ? 1100 : 700;
    const promptResult = await onCallGemini(
      `Given this ${layoutMode === 'comic' ? 'comic panel plan' : 'paragraph'} from a student's creative story:\n"${sourceText.substring(0, sourceLimit)}"\n\nWrite a concise image generation prompt (max 80 words) that captures the key visual scene described. Focus on the setting, characters, and action. Do NOT include any text, words, or letters in the image.\nArt style: ${style}.\nReturn ONLY the image prompt text, nothing else.`
    );
    const imgPrompt = finalizeImagePrompt(promptResult);
    setPromptPreview({ paragraphId, text: sourceText, idx, prompt: imgPrompt });
  };

  const draftComicArtPrompts = async (targetIdx = null) => {
    if (layoutMode !== 'comic' || !onCallGemini) return;
    const selectedPanels = paragraphs
      .map((p, idx) => ({ p, idx, sourceText: getIllustrationSourceText(p) }))
      .filter(({ idx, sourceText }) => (typeof targetIdx === 'number' ? idx === targetIdx : true) && sourceText.trim().length >= 20);
    if (selectedPanels.length === 0) {
      if (addToast) addToast(typeof targetIdx === 'number' ? 'Add more panel detail before drafting an art prompt.' : 'Add panel captions before drafting art prompts.', 'info');
      return;
    }
    setIsProcessing(true);
    try {
      const style = getStyleDesc();
      const panelBrief = selectedPanels.map(({ p, idx, sourceText }) => ({
        panel: idx + 1,
        artBrief: sourceText.slice(0, 1100),
        currentPrompt: illustrations[p.id]?.prompt || '',
        hasImage: Boolean(illustrations[p.id]?.imageUrl),
      }));
      const result = await onCallGemini(
        `You are an art director preparing consistent image-generation prompts for a short student comic.
Write one concise, self-contained prompt for each panel.

Art style:
${style}

Comic continuity:
${getComicContinuityPrompt() || 'No continuity notes yet; infer only from the panels.'}

Rules:
- Max 80 words per prompt.
- Focus on visible setting, characters, action, emotion, camera shot, angle, and lighting.
- Use the provided camera direction and continuity notes when present.
- Keep recurring characters and locations visually consistent across panels.
- Do not include speech bubble text, captions, labels, letters, logos, signs, or readable words in the image.
- Keep prompts school-appropriate.
- If a current prompt is already strong, improve it only lightly.
${langInstruction}

Panels:
${JSON.stringify(panelBrief, null, 2)}

Return ONLY JSON:
{
  "panels": [
    { "panel": 1, "prompt": "" }
  ]
}`,
        true
      );
      const data = JSON.parse(cleanJson(result));
      const generated = Array.isArray(data.panels) ? data.panels : [];
      const byPanel = new Map(generated.map(item => [Number(item.panel), item]));
      const promptUpdates = {};
      selectedPanels.forEach(({ p, idx }) => {
        const raw = byPanel.get(idx + 1);
        const prompt = typeof raw?.prompt === 'string' ? finalizeImagePrompt(raw.prompt) : '';
        if (prompt) promptUpdates[p.id] = prompt;
      });
      const applied = Object.keys(promptUpdates).length;
      if (applied > 0) {
        setIllustrations(prev => {
          const next = { ...prev };
          Object.keys(promptUpdates).forEach((id) => {
            next[id] = { ...(next[id] || {}), prompt: promptUpdates[id], error: false };
          });
          return next;
        });
        setIsDirty(true);
        awardXP(5, 'Drafted comic art prompts');
        if (addToast) addToast(targetIdx === null ? `Art prompts drafted for ${applied} panel${applied === 1 ? '' : 's'}.` : `Panel ${targetIdx + 1} art prompt drafted.`, 'success');
        sfAnnounce('Comic art prompts drafted');
      } else if (addToast) {
        addToast('No art prompts were returned. Try adding more visual direction.', 'info');
      }
    } catch (err) {
      console.warn('Comic art prompt pass failed:', err);
      if (addToast) addToast('Comic art prompt pass failed. Try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmIllustration = async (customPrompt) => {
    if (!promptPreview || !onCallImagen) return;
    const { paragraphId, idx } = promptPreview;
    const imgPrompt = finalizeImagePrompt(customPrompt || promptPreview.prompt);
    setPromptPreview(null);
    setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: true } }));
    try {
      const style = getStyleDesc();
      let imageUrl = await onCallImagen(imgPrompt, 400, 0.8);

      if (imageUrl && characterPortraitRef.current && idx > 0 && onCallGeminiImageEdit) {
        try {
          const rawBase64 = imageUrl.split(',')[1];
          const refined = await onCallGeminiImageEdit(
            `Refine this illustration to maintain consistent character appearance with the reference. ${style}. Remove any text or labels.`,
            rawBase64, 400, 0.8, characterPortraitRef.current
          );
          if (refined) imageUrl = refined;
        } catch (e) { /* consistency pass is best-effort */ }
      }

      if (imageUrl && idx === 0 && !characterPortraitRef.current) {
        characterPortraitRef.current = imageUrl.split(',')[1];
      }

      setIllustrations(prev => ({ ...prev, [paragraphId]: { imageUrl, prompt: imgPrompt, isLoading: false } }));
    } catch (err) {
      console.warn('Illustration failed:', err);
      setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: false, error: true } }));
      if (addToast) addToast(t('toasts.illustration_generation_failed'), 'error');
    }
  };

  const illustrateParagraph = async (paragraphId, text, idx) => {
    if (!onCallImagen) return;
    setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: true } }));
    try {
      const style = getStyleDesc();
      const panel = paragraphs.find(p => p.id === paragraphId);
      const sourceText = (text || '').trim() || getIllustrationSourceText(panel);
      if (!sourceText) throw new Error('No illustration source text');
      let imgPrompt = finalizeImagePrompt(illustrations[paragraphId]?.prompt);
      if (!imgPrompt) {
        if (!onCallGemini) throw new Error('No prompt writer available');
        const sourceLimit = layoutMode === 'comic' ? 1100 : 700;
        const promptResult = await onCallGemini(
          `Given this ${layoutMode === 'comic' ? 'comic panel plan' : 'paragraph'} from a student's creative story:\n"${sourceText.substring(0, sourceLimit)}"\n\nWrite a concise image generation prompt (max 80 words) that captures the key visual scene described. Focus on the setting, characters, and action. Do NOT include any text, words, or letters in the image.\nArt style: ${style}.\nReturn ONLY the image prompt text, nothing else.`
        );
        imgPrompt = finalizeImagePrompt(promptResult);
      }
      let imageUrl = await onCallImagen(imgPrompt, 400, 0.8);

      if (imageUrl && characterPortraitRef.current && idx > 0 && onCallGeminiImageEdit) {
        try {
          const rawBase64 = imageUrl.split(',')[1];
          const refined = await onCallGeminiImageEdit(
            `Refine this illustration to maintain consistent character appearance with the reference. ${style}. Remove any text or labels.`,
            rawBase64, 400, 0.8, characterPortraitRef.current
          );
          if (refined) imageUrl = refined;
        } catch (e) { /* consistency pass is best-effort */ }
      }

      if (imageUrl && idx === 0 && !characterPortraitRef.current) {
        characterPortraitRef.current = imageUrl.split(',')[1];
      }

      setIllustrations(prev => ({ ...prev, [paragraphId]: { imageUrl, prompt: imgPrompt, isLoading: false } }));
    } catch (err) {
      console.warn('Illustration failed:', err);
      setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: false, error: true } }));
      if (addToast) addToast(t('toasts.illustration_generation_failed'), 'error');
    }
  };

  const illustrateAll = async () => {
    setIsProcessing(true);
    const current = paragraphsRef.current;
    for (let i = 0; i < current.length; i++) {
      const p = current[i];
      const sourceText = getIllustrationSourceText(p);
      if (sourceText.trim().length >= 20 && !illustrations[p.id]?.imageUrl) {
        await illustrateParagraph(p.id, sourceText, i);
        if (i < current.length - 1) await new Promise(r => setTimeout(r, 500));
      }
    }
    setIsProcessing(false);
    if (addToast) addToast(t('toasts.all_illustrations_generated'), 'success');
    awardXP(10, 'Illustrated all paragraphs');
  };

  const regenerateIllustration = async (paragraphId, text, idx) => {
    // Save previous image for undo
    setIllustrations(prev => ({
      ...prev,
      [paragraphId]: { ...prev[paragraphId], previousImageUrl: prev[paragraphId]?.imageUrl }
    }));
    setIllustrations(prev => ({ ...prev, [paragraphId]: { previousImageUrl: prev[paragraphId]?.previousImageUrl, isLoading: true } }));
    await illustrateParagraph(paragraphId, text, idx);
  };

  const undoIllustration = (paragraphId) => {
    setIllustrations(prev => {
      const current = prev[paragraphId];
      if (!current?.previousImageUrl) return prev;
      return { ...prev, [paragraphId]: { ...current, imageUrl: current.previousImageUrl, previousImageUrl: null } };
    });
  };

  // ── Student-directed image refinement ──
  const refineIllustration = async (paragraphId, editPrompt) => {
    if (!onCallGeminiImageEdit) { if (addToast) addToast(t('toasts.image_editing_available'), 'error'); return; }
    const current = illustrations[paragraphId];
    if (!current?.imageUrl) return;
    setImageEditState(null);
    setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], previousImageUrl: prev[paragraphId]?.imageUrl, isLoading: true } }));
    try {
      const rawBase64 = current.imageUrl.split(',')[1];
      const style = getStyleDesc();
      const refined = await onCallGeminiImageEdit(
        `${editPrompt}. Maintain the ${style} art style. Do NOT add any text, words, or labels to the image.`,
        rawBase64, 400, 0.8
      );
      if (refined) {
        setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], imageUrl: refined, prompt: editPrompt, isLoading: false } }));
        awardXP(3, 'Refined illustration');
      } else {
        setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: false } }));
        if (addToast) addToast(t('toasts.refinement_didn_produce_changes_try'), 'error');
      }
    } catch (err) {
      console.warn('Image refinement failed:', err);
      setIllustrations(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], isLoading: false } }));
      if (addToast) addToast(t('toasts.image_refinement_failed'), 'error');
    }
  };

  const generateCoverArt = async () => {
    if (!onCallImagen || !onCallGemini) return;
    setCoverArtLoading(true);
    try {
      const style = getStyleDesc();
      const title = storyTitle || sourceTopic || 'My Story';
      const storySnippet = paragraphs.map(p => p.text).join(' ').substring(0, 300);
      const promptResult = await onCallGemini(
        `Create a book cover image prompt for a story titled "${title}". Story excerpt: "${storySnippet}". Art style: ${style}. The image should be a dramatic, eye-catching book cover scene that captures the story's essence. Do NOT include any text, title, or words in the image — just the visual scene. Max 80 words. Return ONLY the image prompt text.`
      );
      const imgPrompt = promptResult.trim() + ' STRICTLY NO TEXT, NO TITLE, NO WORDS IN THE IMAGE. Book cover composition.';
      const imageUrl = await onCallImagen(imgPrompt, 400, 0.9);
      if (imageUrl) setCoverArt(imageUrl);
    } catch (err) {
      console.warn('Cover art generation failed:', err);
      if (addToast) addToast(t('toasts.cover_art_generation_failed'), 'error');
    }
    setCoverArtLoading(false);
  };

  // ═══════════════════════════════════════════════════════════
  // NARRATE PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const detectCharacters = async () => {
    if (!onCallGemini) return;
    setIsProcessing(true);
    try {
      const fullText = paragraphs.map(p => p.text).join('\n\n');
      const result = await onCallGemini(
        `Analyze this student story and identify all named characters (not "the narrator" or generic pronouns). If there are no named characters, return an empty array.\nStory:\n"""${fullText}"""${langInstruction}\nReturn ONLY JSON: { "characters": [{"name": "CharName", "description": "brief 5-word personality/role description"}] }`,
        true
      );
      const data = JSON.parse(cleanJson(result));
      const chars = (data.characters || []).map(c => {
        const hash = c.name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        return { ...c, voice: VOICE_POOL[hash % VOICE_POOL.length] };
      });
      setCharacters(chars);
    } catch (err) {
      console.warn('Character detection failed:', err);
    }
    setIsProcessing(false);
  };

  const narrateParagraph = async (paragraphId, text) => {
    if (!onCallTTS) return;
    setAudioSegments(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], aiLoading: true } }));
    try {
      const nVoice = narratorVoice || selectedVoice || 'Puck';
      const sentences = splitSentences(text);
      const sentenceAudios = [];

      // Generate TTS for each sentence individually
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        if (sentence.trim().length === 0) { sentenceAudios.push(null); continue; }
        try {
          const audioUrl = await onCallTTS(sentence, nVoice, 0.9);
          sentenceAudios.push(audioUrl);
        } catch (e) {
          console.warn('Sentence TTS failed for:', sentence, e);
          sentenceAudios.push(null);
        }
      }

      // Store sentence-level audio + first sentence as the legacy aiAudioUrl for backward compat
      setAudioSegments(prev => ({
        ...prev,
        [paragraphId]: {
          ...prev[paragraphId],
          aiAudioUrl: sentenceAudios[0] || null,
          sentenceAudios: sentenceAudios,
          sentences: sentences,
          aiLoading: false
        }
      }));
    } catch (err) {
      console.warn('Narration failed:', err);
      setAudioSegments(prev => ({ ...prev, [paragraphId]: { ...prev[paragraphId], aiLoading: false } }));
    }
  };

  const narrateAll = async () => {
    setIsProcessing(true);
    const current = paragraphsRef.current;
    for (const p of current) {
      if (p.text.trim().length > 0 && !audioSegments[p.id]?.aiAudioUrl) {
        await narrateParagraph(p.id, p.text);
      }
    }
    setIsProcessing(false);
    if (addToast) addToast(t('toasts.narration_complete'), 'success');
    awardXP(10, 'Narrated story');
  };

  const startRecordingParagraph = async (paragraphId) => {
    setRecordingParagraphId(paragraphId);
    await recorder.startRecording();
  };

  const stopRecordingParagraph = async () => {
    const result = await recorder.stopRecording();
    if (result && recordingParagraphId) {
      setAudioSegments(prev => ({
        ...prev,
        [recordingParagraphId]: {
          ...prev[recordingParagraphId],
          studentAudioUrl: result.url,
          studentAudioBase64: result.base64,
        }
      }));
    }
    setRecordingParagraphId(null);
  };

  // ── Playback (sentence-level with paragraph chaining) ──
  useEffect(() => {
    if (playbackIdx < 0 || playbackIdx >= paragraphs.length) return;
    const pid = paragraphs[playbackIdx].id;
    const seg = audioSegments[pid];

    // Sentence-level audio available?
    if (seg?.sentenceAudios && seg.sentenceAudios.length > 0) {
      const safeIdx = Math.min(sentenceIdx, seg.sentenceAudios.length - 1);
      const src = seg.sentenceAudios[safeIdx];
      if (src && audioRef.current) {
        audioRef.current.src = src;
        audioRef.current.play().catch(() => {});
        return;
      }
      // This sentence has no audio — skip to next
      if (safeIdx < seg.sentenceAudios.length - 1) {
        setSentenceIdx(safeIdx + 1);
      } else {
        // End of paragraph — advance
        if (playbackIdx < paragraphs.length - 1) { setPlaybackIdx(playbackIdx + 1); setSentenceIdx(0); }
        else { setPlaybackIdx(-1); setSentenceIdx(0); }
      }
      return;
    }

    // Fallback: student recording or single paragraph audio
    const src = seg?.studentAudioUrl || seg?.aiAudioUrl;
    if (src && audioRef.current) {
      audioRef.current.src = src;
      audioRef.current.play().catch(() => {});
    } else {
      // No audio for this paragraph — skip
      if (playbackIdx < paragraphs.length - 1) { setPlaybackIdx(playbackIdx + 1); setSentenceIdx(0); }
      else { setPlaybackIdx(-1); setSentenceIdx(0); }
    }
  }, [playbackIdx, sentenceIdx, paragraphs, audioSegments]);

  const handleAudioEnded = () => {
    if (playbackIdx < 0 || playbackIdx >= paragraphs.length) { setPlaybackIdx(-1); setSentenceIdx(0); return; }
    const pid = paragraphs[playbackIdx].id;
    const seg = audioSegments[pid];

    // If sentence-level audio: advance to next sentence within paragraph
    if (seg?.sentenceAudios && seg.sentenceAudios.length > 0) {
      if (sentenceIdx < seg.sentenceAudios.length - 1) {
        setSentenceIdx(sentenceIdx + 1);
        return;
      }
    }
    // End of paragraph — advance to next paragraph
    if (playbackIdx < paragraphs.length - 1) { setPlaybackIdx(playbackIdx + 1); setSentenceIdx(0); }
    else { setPlaybackIdx(-1); setSentenceIdx(0); }
  };

  // ═══════════════════════════════════════════════════════════
  // REVIEW PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const gradeStory = async () => {
    if (!onCallGemini) return;
    setIsProcessing(true);
    try {
      const fullText = paragraphs.map((p, i) => `[Paragraph ${i + 1}] ${p.text}`).join('\n\n');
      const vocabReport = vocabTerms.map(v => {
        const ft = paragraphs.map(p => p.text).join(' ');
        const used = termUsed(ft, v.term);
        const sample = paragraphs.find(p => termUsed(p.text, v.term))?.text.substring(0, 100) || null;
        return { term: v.term, used, contextSample: sample };
      });

      const defaultRubric = `| Criteria | 1 - Beginning | 3 - Developing | 5 - Exemplary |
|----------|---------------|----------------|---------------|
| Vocabulary Usage | Few required terms used | Some terms used correctly | All terms used accurately in context |
| Story Structure | No clear beginning/middle/end | Partial narrative arc | Complete narrative arc with resolution |
| Creativity & Detail | Minimal description | Some descriptive language | Vivid, engaging descriptions |
| Grammar & Mechanics | Many errors | Some errors | Few or no errors |`;

      const prompt = `You are a fair and encouraging teacher grading a creative writing assignment.
Target Audience: ${gradeLevel || '5th grade'} students.
Topic: "${sourceTopic || 'Creative Story'}"
This is draft #${draftCount}.

Required Vocabulary Terms: ${vocabTerms.map(v => `${v.term} (${v.definition})`).join('; ')}
Vocabulary Usage Report: ${JSON.stringify(vocabReport)}

Rubric:
"""
${rubricText || defaultRubric}
"""

Student Story:
"""
${fullText}
"""

Task:
1. Evaluate against each rubric criterion. Assign a score for each (X/5).
2. Check that required vocabulary terms are used correctly in context (not just mentioned randomly).
3. Give a total score.
4. Provide 2 specific Glow compliments and 1 specific Grow suggestion. Be encouraging.
${langInstruction}
Return ONLY JSON:
{
  "scores": [{"criteria": "Name", "score": "X/5", "comment": "Brief justification"}],
  "totalScore": "X/20",
  "vocabScores": [{"term": "word", "status": "correct|partial|missing", "comment": "How it was used or what's missing"}],
  "feedback": {"glow": "Two specific compliments...", "grow": "One specific suggestion..."}
}`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      setGradingResult(data);
      if (addToast) addToast(t('toasts.feedback_ready'), 'success');
      awardXP(15, 'Got AI feedback');
    } catch (err) {
      console.warn('Grading failed:', err);
      if (addToast) addToast(t('toasts.grading_failed_try_again'), 'error');
    }
    setIsProcessing(false);
  };

  const reviseStory = () => {
    // Save snapshot of current draft for delta comparison
    setRevisionSnapshot({ words: totalWords, vocabUsed: vocabUsedCount, paragraphCount: paragraphs.length, grade: readingLevel?.grade || null });
    setDraftCount(d => d + 1);
    setGradingResult(null);
    setSelfAssessment({});
    setSelfAssessmentSubmitted(false);
    setSensesResult(null);
    setMentorMatch(null);
    setShowTellResult(null);
    setArcReport(null);
    setRevisionPlan(null);
    setDialogueReport(null);
    setComicFlowReport(null);
    changePhase('write');
  };

  // ── Mentor Match: pair the student's story with a public-domain master excerpt ──
  // Same proven pattern as PoetTree (commit 574767a):
  //   1. Gemini extracts 3-5 keywords from the student's draft
  //   2. WebSearchProvider (Serper → SearXNG → DDG) fetches real PD candidates
  //   3. Gemini picks the best mentor, anchored to a real sourceUrl
  // Anti-fabrication: hard-restricts to authors-died-pre-1929 + traditional/anonymous;
  // uncertain flag asks Gemini to skip text rather than invent.
  const findMentorStory = async () => {
    if (!onCallGemini) return;
    const fullText = paragraphs.map(p => p.text.trim()).filter(Boolean).join('\n\n');
    if (fullText.length < 80) {
      if (addToast) addToast(t('toasts.write_bit_more_before_finding'), 'info');
      return;
    }
    setMentorLoading(true);
    setMentorMatch(null);
    try {
      // Stage 1 — extract keywords
      let keywords = '';
      try {
        const queryPrompt = `Extract 3-5 keywords from this story draft that would help find a similar PUBLIC-DOMAIN master short story online. Focus on concrete images, themes, setting, character archetype, and emotional tone, not function words. Return JSON: {"keywords":["...","..."]}\n\nStory:\n"""\n${fullText.slice(0, 2400)}\n"""`;
        const queryResult = await onCallGemini(queryPrompt, true);
        const queryParsed = JSON.parse(cleanJson(queryResult));
        keywords = (queryParsed.keywords || []).slice(0, 5).join(' ');
      } catch (e) { console.warn('Mentor keyword extract failed:', e && e.message); }

      // Stage 2 — Serper-grounded web search for real PD short fiction
      let searchContext = '';
      let searchResults = [];
      if (window.WebSearchProvider && keywords) {
        try {
          const genreLabel = GENRE_TEMPLATES[genre]?.label || '';
          const searchQuery = `${keywords} ${genreLabel ? genreLabel + ' ' : ''}famous public domain short story excerpt gutenberg`;
          sfAnnounce('Searching for similar master stories…');
          const searchResult = await window.WebSearchProvider.search(searchQuery, 8);
          if (searchResult && searchResult.results && searchResult.results.length > 0) {
            searchResults = searchResult.results.slice(0, 8);
            searchContext = '\n\nWeb search results for similar public-domain short fiction. Treat these as your candidate set — strongly prefer suggesting a story from this list because the URL anchors the recommendation in something the student can actually read. Reject results that are clearly behind a paywall, modern (post-1929), or not actually fiction (e.g. study guides, summaries).\n\n'
              + searchResults.map((r, i) =>
                `${i + 1}. ${r.title || 'Untitled'}\n   URL: ${r.url || r.link || ''}\n   ${String(r.snippet || '').slice(0, 220)}`
              ).join('\n\n');
          }
        } catch (e) {
          console.warn('Mentor web search failed, falling back to Gemini-only:', e && e.message);
        }
      }

      // Stage 3 — Gemini picks the best mentor, ideally from the real results
      const genreLabel = GENRE_TEMPLATES[genre]?.label || 'creative';
      const targetGrade = gradeLevel || '5th grade';
      const prompt = `You are a writing mentor for a ${targetGrade} student. Pair their story with ONE public-domain master short-story excerpt that they could study alongside their own work.

Student story (${genreLabel}):
"""
${fullText}
"""${searchContext}

CRITICAL anti-fabrication rules:
- ONLY suggest authors who died before 1929 (US PD-safe), anonymous traditional folk tales, or canonical translations of pre-modern works (Aesop, Grimm Brothers, Hans Christian Andersen, Andrew Lang fairy tale collections, etc.).
- Safe bets by genre: Adventure → Twain, Stevenson, Conan Doyle (early), Kipling (early). Mystery → Poe, Conan Doyle (early). Fairy tale → Grimms, Andersen, Lang. Sci-fi → H.G. Wells, Jules Verne. Historical → Hawthorne, Dickens. Persuasive → Aesop's fables.
${searchContext ? '- Strongly prefer one of the search results above. Include its URL in "sourceUrl".\n' : ''}- Choose ONE short, vivid excerpt (40-150 words), not a summary. If you cannot supply an exact attributed excerpt, set "uncertain":true and LEAVE THE TEXT FIELD BLANK — describe the story in prose. Never fabricate.

Return JSON:
{
  "mentor": {
    "title": "<title>",
    "author": "<author>",
    "year": <number or null>,
    "text": "<exact excerpt with line breaks as \\\\n; BLANK if uncertain>",
    "sourceUrl": "<URL from search results, or null>",
    "uncertain": false
  },
  "sharedTheme": "<one sentence on what your two stories share — image, conflict, character type, mood>",
  "craftToBorrow": "<one specific craft move from the master worth trying — sentence rhythm, dialogue tag, sensory detail, etc.>",
  "studentEcho": "<where the student is already doing something similar, with a quoted phrase from their own story>"
}

Match register and reading level to a ${targetGrade} student. Be specific, be honest, never invent.`;

      const result = await onCallGemini(prompt, true);
      const parsed = JSON.parse(cleanJson(result));
      parsed._grounding = { searchUsed: searchResults.length > 0, resultCount: searchResults.length, keywords: keywords };
      setMentorMatch(parsed);
      if (addToast) addToast(t('toasts.mentor_story_found'), 'success');
      sfAnnounce('Mentor story found: ' + (parsed.mentor && parsed.mentor.title) + ' by ' + (parsed.mentor && parsed.mentor.author) + (searchResults.length > 0 ? ' — verified via web search.' : '.'));
      awardXP(8, 'Studied a mentor text');
    } catch (err) {
      console.warn('Mentor match failed:', err && err.message);
      setMentorMatch({ error: "Couldn't find a mentor story right now. Try again in a moment." });
      if (addToast) addToast(t('toasts.mentor_search_failed_try_again'), 'error');
    }
    setMentorLoading(false);
  };

  // ── Senses & Imagery Checker (ported from PoetTree, retargeted for prose) ──
  // ── AI-suggest the emotional fortune of each paragraph (Story Arc curve) ──
  const suggestValenceArc = async () => {
    if (!onCallGemini) return;
    const written = paragraphs.filter(p => p.text.trim().length > 0);
    if (written.length < 2) { if (addToast) addToast(t('toasts.write_bit_more_before_checking') || 'Write a bit more first.', 'info'); return; }
    setValenceLoading(true);
    try {
      const numbered = paragraphs.map((p, i) => `[${i + 1}] ${p.text.trim() || '(empty)'}`).join('\n\n');
      const prompt = `For each numbered paragraph below, rate the main character's FORTUNE / emotional tone on an integer scale from -5 (very bad — lowest point) to +5 (very good — triumphant). Judge the emotional ups and downs of the story, NOT the writing quality.\n\nParagraphs:\n${numbered}\n\nReturn ONLY JSON: {"valence":[n1, n2, ...]} with exactly ${paragraphs.length} integers from -5 to 5, in paragraph order.`;
      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      if (Array.isArray(data.valence)) {
        const next = {};
        paragraphs.forEach((p, i) => { const v = Number(data.valence[i]); if (!Number.isNaN(v)) next[p.id] = Math.max(-5, Math.min(5, Math.round(v))); });
        setValenceByPara(next);
        if (addToast) addToast('Emotional arc suggested — drag any point to match your story.', 'success');
        sfAnnounce('Emotional arc suggested.');
      }
    } catch (e) {
      if (addToast) addToast('Could not suggest an arc — try again.', 'error');
    }
    setValenceLoading(false);
  };

  const checkSenses = async () => {
    if (!onCallGemini) return;
    const fullText = paragraphs.map(p => p.text.trim()).filter(Boolean).join('\n\n');
    if (fullText.length < 30) {
      if (addToast) addToast(t('toasts.write_bit_more_before_checking'), 'info');
      return;
    }
    setSensesLoading(true);
    try {
      const prompt = `You are a writing coach analyzing sensory imagery in a student's story.

Story:
"""
${fullText}
"""

Count concrete sensory details across all paragraphs combined for each of these categories:
- sight (visual descriptions: color, shape, light)
- sound (heard things: noises, voices, music, silence)
- smell (scents, odors)
- taste (flavors, textures in the mouth)
- touch (physical textures, temperature, pressure on skin)
- motion (movement, kinesthetic action)
- emotion (named feelings: fear, joy, embarrassment)

Then identify the strongest sense (most-used) and the weakest/missing sense (under-used).
Offer ONE specific, kind, concrete revision suggestion that names a paragraph and a sense ("In paragraph 3, what does the bedroom actually smell like?").

Return ONLY JSON in this shape:
{
  "counts": {"sight": N, "sound": N, "smell": N, "taste": N, "touch": N, "motion": N, "emotion": N},
  "strongest": "sight",
  "missing": "smell",
  "suggestion": "Specific, concrete revision tip naming a paragraph and a sense."
}`;
      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      setSensesResult(data);
      if (addToast) addToast(t('toasts.senses_check_ready'), 'success');
      sfAnnounce('Senses check complete. Strongest sense: ' + (data.strongest || 'unknown') + '. Missing: ' + (data.missing || 'unknown'));
      awardXP(5, 'Used senses checker');
    } catch (err) {
      console.warn('Senses check failed:', err);
      if (addToast) addToast(t('toasts.senses_check_failed_try_again'), 'error');
    }
    setSensesLoading(false);
  };

  // ── Show, Don't Tell coach ──
  // Flags sentences that name an emotion/state outright ("she was scared")
  // and offers a concrete sensory/action revision ("she pressed her back to
  // the wall, holding her breath"). Foundational craft move for grades 4-8.
  const analyzeShowTell = async () => {
    if (!onCallGemini) return;
    const fullText = paragraphs.map(p => p.text.trim()).filter(Boolean).join('\n\n');
    if (fullText.length < 60) {
      if (addToast) addToast(t('toasts.write_bit_more_before_checking_2'), 'info');
      return;
    }
    setShowTellLoading(true);
    try {
      const targetGrade = gradeLevel || '5th grade';
      const prompt = `You are a writing coach for a ${targetGrade} student. Analyze their story for "telling" sentences that could be revised into "showing" sentences.

A "telling" sentence names an emotion, state, or trait outright (e.g. "She was scared", "He felt happy", "It was cold").
A "showing" sentence reveals the same idea through sensory details, action, or dialogue (e.g. "Her knuckles whitened on the doorframe", "He spun on the spot, arms wide", "Frost crackled across the window pane").

Story:
"""
${fullText}
"""

Find up to 4 of the most fixable "telling" sentences. For each, propose ONE concrete "showing" revision that fits the story's tone and the student's grade level. If the story is already strong on showing, return an empty list and a celebratory note.

Return ONLY JSON:
{
  "tellings": [
    { "telling": "<exact telling sentence from the student>", "showing": "<concrete sensory/action revision>", "why": "<one short sentence on what changed>" }
  ],
  "summary": "<one short sentence — encouraging if list is empty, gentle if not>"
}`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      setShowTellResult(data);
      if (addToast) addToast(t('toasts.show_vs_tell_ready'), 'success');
      const count = (data.tellings || []).length;
      sfAnnounce(count === 0 ? 'Show vs tell check: no telling sentences found.' : `Show vs tell check: ${count} sentence${count === 1 ? '' : 's'} could become more vivid.`);
      awardXP(5, 'Used show-don\'t-tell coach');
    } catch (err) {
      console.warn('Show-don\'t-tell failed:', err);
      if (addToast) addToast(t('toasts.show_vs_tell_failed_try'), 'error');
    }
    setShowTellLoading(false);
  };

  // ── Character Arc Tracker ──
  // Builds on detectCharacters: evaluates each named character on the four-beat
  // arc (introduction → want/conflict → change → resolution) and surfaces one
  // specific revision suggestion per character. Skips arc analysis for stories
  // with no named characters (returns an encouraging note instead).
  const analyzeCharacterArcs = async () => {
    if (!onCallGemini) return;
    const fullText = paragraphs.map((p, i) => `[Paragraph ${i + 1}] ${p.text.trim()}`).filter(Boolean).join('\n\n');
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    if (wordCount < 80) {
      if (addToast) addToast(t('toasts.write_bit_more_before_tracking'), 'info');
      return;
    }
    setArcLoading(true);
    try {
      const targetGrade = gradeLevel || '5th grade';
      const prompt = `You are a writing coach analyzing character arcs for a ${targetGrade} student.

A complete narrative character arc has four beats:
1. INTRODUCTION — the character is established (name, role, defining trait).
2. WANT — what the character wants, fears, or has at stake (the engine of the story for them).
3. CHANGE — how the character is tested, learns, or shifts because of the story's events.
4. RESOLUTION — how their arc lands (succeed, fail, transform, hold steady on purpose).

Story:
"""
${fullText}
"""

Identify up to 3 named characters who are *important enough* to deserve an arc (skip walk-on names). For each, score the four beats as "strong" / "partial" / "missing", quote one paragraph reference for each beat that exists, and propose ONE specific revision suggestion that would strengthen the weakest beat at this student's grade level. If the story has no named characters at all, return an empty array and an encouraging note.

Return ONLY JSON:
{
  "characters": [
    {
      "name": "<character name>",
      "role": "<protagonist | supporting | antagonist | other>",
      "beats": {
        "introduction": { "status": "strong|partial|missing", "evidence": "<paragraph N quote or empty>" },
        "want":         { "status": "strong|partial|missing", "evidence": "<paragraph N quote or empty>" },
        "change":       { "status": "strong|partial|missing", "evidence": "<paragraph N quote or empty>" },
        "resolution":   { "status": "strong|partial|missing", "evidence": "<paragraph N quote or empty>" }
      },
      "suggestion": "<one specific, kind, concrete revision idea>"
    }
  ],
  "summary": "<one short overall sentence>"
}`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      data.characters = (data.characters || []).slice(0, 3);
      setArcReport(data);
      const count = data.characters.length;
      if (addToast) addToast(t('toasts.character_arcs_analyzed'), 'success');
      sfAnnounce(count === 0 ? 'No named characters found in the story.' : `Character arc tracker: ${count} character${count === 1 ? '' : 's'} analyzed.`);
      awardXP(8, 'Tracked character arcs');
    } catch (err) {
      console.warn('Character arc analysis failed:', err);
      if (addToast) addToast(t('toasts.arc_tracker_failed_try_again'), 'error');
    }
    setArcLoading(false);
  };

  // ── Dialogue Tag Tune-Up ──
  // Surfaces dialogue mechanics issues that middle-school writers commonly miss:
  // overuse of a single tag (especially "said"), untagged dialogue where the
  // speaker is unclear, and lack of action beats around long exchanges.
  // Returns concrete in-context tag replacements rather than a generic word list.
  const analyzeDialogue = async () => {
    if (!onCallGemini) return;
    const fullText = paragraphs.map((p, i) => `[Paragraph ${i + 1}] ${p.text.trim()}`).filter(Boolean).join('\n\n');
    if (!fullText.includes('"') && !fullText.includes('“') && !fullText.includes('”')) {
      if (addToast) addToast(t('toasts.dialogue_detected_try_adding_quoted'), 'info');
      setDialogueReport({ tagCounts: {}, overusedTag: null, issues: [], summary: 'No dialogue found yet.' });
      return;
    }
    setDialogueLoading(true);
    try {
      const targetGrade = gradeLevel || '5th grade';
      const prompt = `You are a writing coach analyzing dialogue mechanics for a ${targetGrade} student.

Story:
"""
${fullText}
"""

Tasks:
1. Count occurrences of each dialogue tag verb (said, asked, replied, whispered, shouted, etc.). Treat "said" specially — it's invisible and grade-appropriate, but using it more than ~70% of the time signals overuse. List counts in descending order.
2. Identify up to 3 specific dialogue lines where the tag could be more precise (offer ONE concrete in-context swap per line — match tone, don't go thesaurus-purple). Include the original line verbatim and the proposed revision.
3. Flag up to 2 lines where the speaker is unclear (untagged dialogue with no nearby attribution).
4. If there is no dialogue at all, return empty arrays and an encouraging note that adding even one line of dialogue can make characters come alive.

Return ONLY JSON:
{
  "tagCounts": { "<tag verb>": <count>, ... },
  "overusedTag": "<tag string or null>",
  "issues": [
    { "type": "tag-swap", "line": "<exact dialogue line>", "suggestion": "<replacement with new tag>", "why": "<short reason>" },
    { "type": "missing-tag", "line": "<exact dialogue line>", "suggestion": "<add tag/action beat>", "why": "<short reason>" }
  ],
  "summary": "<one short sentence — encouraging if dialogue is strong, gentle if not>"
}`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      setDialogueReport(data);
      if (addToast) addToast(t('toasts.dialogue_tune_up_ready'), 'success');
      const issueCount = (data.issues || []).length;
      sfAnnounce(issueCount === 0 ? 'Dialogue mechanics check: no issues found.' : `Dialogue mechanics check: ${issueCount} suggestion${issueCount === 1 ? '' : 's'}.`);
      awardXP(5, 'Tuned up dialogue');
    } catch (err) {
      console.warn('Dialogue analysis failed:', err);
      if (addToast) addToast(t('toasts.dialogue_tune_up_failed_try'), 'error');
    }
    setDialogueLoading(false);
  };

  // ── Revision Plan synthesizer ──
  // Pulls together whichever helpers have run (Senses, Show-vs-Tell, Character
  // Arcs, Mentor Match, Self-Assessment) into a single prioritized 3-item
  // revision plan. Pedagogical aim: teach synthesis as its own meta-skill.
  // Only available when ≥2 helpers have produced output (not before).
  const buildComicFlowSnapshot = () => {
    const continuity = sanitizeComicContinuity(comicContinuity);
    const printSafety = sanitizeComicPrintSafety(comicPrintSafety);
    const continuityFields = ['cast', 'setting', 'palette', 'styleNotes'].filter(k => continuity[k] && continuity[k].trim()).length;
    const panelRows = paragraphs.map((p, idx) => {
      const bubble = panelDialogue[p.id] || {};
      const direction = panelDirections[p.id] || {};
      const rough = panelThumbnails[p.id] || {};
      const layoutFrame = panelLayouts[p.id] || {};
      const caption = (p.text || p.scaffoldFrame || '').trim();
      const lettering = getComicLetteringStats(bubble);
      return {
        id: p.id,
        panel: idx + 1,
        caption: caption.slice(0, 360),
        hasCaption: caption.length > 0,
        hasImage: Boolean(illustrations[p.id]?.imageUrl),
        hasBubble: Boolean(bubble.speech || bubble.thought || bubble.sfx),
        bubbleWords: lettering.words,
        letteringLevel: lettering.level,
        shot: direction.shot || '',
        angle: direction.angle || '',
        mood: direction.mood || '',
        transition: direction.transition || '',
        hasDirection: Boolean(direction.shot && direction.angle && direction.mood),
        hasTransition: Boolean(direction.transition),
        hasThumbnailRough: Boolean(rough.focalPoint && rough.composition && rough.letteringSpace),
        hasSafeLetteringSpace: Boolean(rough.letteringSpace && rough.letteringSpace !== 'none'),
        focalPoint: rough.focalPoint || '',
        letteringSpace: rough.letteringSpace || '',
        frame: layoutFrame.frame || '',
        frameLabel: `${getComicPanelFrameLabel(layoutFrame.frame)} · ${getComicPanelSpanLabel(layoutFrame, comicPageLayout, idx)}`,
        layoutSpan: getComicPanelSpanLabel(layoutFrame, comicPageLayout, idx),
        hasCustomLayout: Boolean(layoutFrame.frame || layoutFrame.colSpan || layoutFrame.rowSpan),
        beat: p.plotBeat || '',
      };
    });
    const pageGroups = buildComicPageGroups(paragraphs, comicPageComposer, comicPageLayout);
    const panelPageMap = {};
    pageGroups.forEach((page) => {
      page.panels.forEach(({ idx }) => { panelPageMap[idx + 1] = page; });
    });
    const pageRows = pageGroups.map((page) => ({
      page: page.page,
      panels: page.panels.map(({ idx }) => idx + 1),
      layout: page.layout,
      layoutLabel: getComicPageLayoutLabel(page.layout),
      gutterSide: getComicPageGutterSide(page.page, page.layout, printSafety),
      turn: page.turn || '',
      turnLabel: getComicPageTurnLabel(page.turn),
      note: page.note || '',
    }));
    const total = Math.max(1, panelRows.length);
    const pageTotal = Math.max(1, pageRows.length);
    const count = (predicate) => panelRows.filter(predicate).length;
    const shotSet = new Set(panelRows.map(p => p.shot).filter(Boolean));
    const transitionSet = new Set(panelRows.map(p => p.transition).filter(Boolean));
    const heavyBubblePanels = panelRows.filter(p => p.bubbleWords > COMIC_BUBBLE_WORD_LIMIT).map(p => p.panel);
    const missingCaptionPanels = panelRows.filter(p => !p.hasCaption).map(p => p.panel);
    const missingDirectionPanels = panelRows.filter(p => !p.hasDirection).map(p => p.panel);
    const missingTransitionPanels = panelRows.filter(p => !p.hasTransition).map(p => p.panel);
    const missingThumbnailPanels = panelRows.filter(p => !p.hasThumbnailRough).map(p => p.panel);
    const missingImagePanels = panelRows.filter(p => !p.hasImage).map(p => p.panel);
    const framedPanels = panelRows.filter(p => p.hasCustomLayout).map(p => p.panel);
    const missingPageTurns = pageRows.filter(p => p.page < pageRows.length && !p.turn).map(p => p.page);
    const pagesWithNotes = pageRows.filter(p => p.note.trim()).length;
    const unsafeLetteringPanels = panelRows.filter(p => p.hasBubble && !p.hasSafeLetteringSpace).map(p => p.panel);
    const gutterRiskPanels = panelRows.filter((p) => {
      if (!p.hasBubble) return false;
      const page = panelPageMap[p.panel];
      if (!page) return false;
      const side = getComicPageGutterSide(page.page, page.layout, printSafety);
      return letteringTouchesSide(p.letteringSpace, side);
    }).map(p => p.panel);
    const bleedReady = printSafety.format === 'digital' || printSafety.includeBleed;
    const checks = [
      {
        key: 'captions',
        label: 'Panel captions',
        value: `${count(p => p.hasCaption)}/${total}`,
        status: missingCaptionPanels.length === 0 ? 'strong' : 'needs-work',
        detail: missingCaptionPanels.length ? `Panels ${missingCaptionPanels.join(', ')} need a caption or scaffold.` : 'Every panel has a readable story beat.',
      },
      {
        key: 'direction',
        label: 'Visual direction',
        value: `${count(p => p.hasDirection)}/${total}`,
        status: missingDirectionPanels.length === 0 ? 'strong' : missingDirectionPanels.length <= 2 ? 'watch' : 'needs-work',
        detail: missingDirectionPanels.length ? `Add shot, angle, and mood to panels ${missingDirectionPanels.slice(0, 6).join(', ')}.` : 'Every panel has shot, angle, and mood.',
      },
      {
        key: 'shots',
        label: 'Shot variety',
        value: `${shotSet.size} type${shotSet.size === 1 ? '' : 's'}`,
        status: shotSet.size >= Math.min(3, total) ? 'strong' : shotSet.size >= 2 ? 'watch' : 'needs-work',
        detail: shotSet.size >= Math.min(3, total) ? 'The page has useful camera variety.' : 'Try mixing wide, medium, close-up, reaction, or detail shots.',
      },
      {
        key: 'transitions',
        label: 'Pacing moves',
        value: `${count(p => p.hasTransition)}/${total}`,
        status: missingTransitionPanels.length === 0 && transitionSet.size >= Math.min(3, total) ? 'strong' : missingTransitionPanels.length <= 2 ? 'watch' : 'needs-work',
        detail: missingTransitionPanels.length ? `Choose pacing moves for panels ${missingTransitionPanels.slice(0, 6).join(', ')}.` : `The page uses ${transitionSet.size} transition type${transitionSet.size === 1 ? '' : 's'}.`,
      },
      {
        key: 'roughs',
        label: 'Thumbnail roughs',
        value: `${count(p => p.hasThumbnailRough)}/${total}`,
        status: missingThumbnailPanels.length === 0 ? 'strong' : missingThumbnailPanels.length <= 2 ? 'watch' : 'needs-work',
        detail: missingThumbnailPanels.length ? `Add focal point, composition, and lettering space to panels ${missingThumbnailPanels.slice(0, 6).join(', ')}.` : 'Every panel has a thumbnail composition plan.',
      },
      {
        key: 'pages',
        label: 'Page composer',
        value: `${pageTotal} page${pageTotal === 1 ? '' : 's'}`,
        status: pageTotal <= 1 || missingPageTurns.length === 0 ? 'strong' : missingPageTurns.length <= 1 ? 'watch' : 'needs-work',
        detail: pageTotal <= 1
          ? 'Single-page comic plan is ready.'
          : missingPageTurns.length
            ? `Add page-turn intent to page${missingPageTurns.length === 1 ? '' : 's'} ${missingPageTurns.join(', ')}.`
            : `Every page break has a clear turn, reveal, pause, or payoff. ${pagesWithNotes ? `${pagesWithNotes} page note${pagesWithNotes === 1 ? '' : 's'} included.` : ''}`,
      },
      {
        key: 'safe-lettering',
        label: 'Safe lettering zones',
        value: unsafeLetteringPanels.length ? `${unsafeLetteringPanels.length} risk` : 'clear',
        status: unsafeLetteringPanels.length === 0 ? 'strong' : unsafeLetteringPanels.length <= 2 ? 'watch' : 'needs-work',
        detail: unsafeLetteringPanels.length ? `Panels ${unsafeLetteringPanels.slice(0, 6).join(', ')} have bubbles without a reserved safe lettering area.` : 'Bubble text has a planned safe area.',
      },
      {
        key: 'gutter',
        label: 'Gutter safety',
        value: printSafety.gutter === 'none' ? 'none' : (gutterRiskPanels.length ? `${gutterRiskPanels.length} risk` : 'clear'),
        status: gutterRiskPanels.length === 0 ? 'strong' : gutterRiskPanels.length <= 2 ? 'watch' : 'needs-work',
        detail: printSafety.gutter === 'none'
          ? 'No binding gutter is applied for this format.'
          : gutterRiskPanels.length
            ? `Move bubbles away from the binding edge on panels ${gutterRiskPanels.slice(0, 6).join(', ')}.`
            : `Lettering avoids the ${getComicPrintGutterLabel(printSafety.gutter).toLowerCase()}.`,
      },
      {
        key: 'bleed',
        label: 'Trim and bleed',
        value: getComicPrintFormatLabel(printSafety.format),
        status: bleedReady ? 'strong' : 'watch',
        detail: printSafety.format === 'digital'
          ? 'Digital export does not need print bleed.'
          : bleedReady
            ? `${COMIC_PRINT_FORMATS[printSafety.format]?.trim || 'Print'} format includes bleed guidance.`
            : 'Turn on bleed marks before sending this comic to print.',
      },
      {
        key: 'lettering',
        label: 'Lettering load',
        value: heavyBubblePanels.length ? `${heavyBubblePanels.length} heavy` : 'clear',
        status: heavyBubblePanels.length === 0 ? 'strong' : heavyBubblePanels.length <= 2 ? 'watch' : 'needs-work',
        detail: heavyBubblePanels.length ? `Panels ${heavyBubblePanels.join(', ')} may have too many bubble words for clean lettering.` : 'Bubble text is likely readable at panel size.',
      },
      {
        key: 'visuals',
        label: 'Illustration coverage',
        value: `${count(p => p.hasImage)}/${total}`,
        status: missingImagePanels.length === 0 ? 'strong' : missingImagePanels.length <= 2 ? 'watch' : 'needs-work',
        detail: missingImagePanels.length ? `Panels ${missingImagePanels.slice(0, 6).join(', ')} still need art.` : 'Every panel has generated art.',
      },
      {
        key: 'continuity',
        label: 'Continuity sheet',
        value: `${continuityFields}/4`,
        status: continuityFields >= 3 ? 'strong' : continuityFields >= 2 ? 'watch' : 'needs-work',
        detail: continuityFields >= 3 ? 'Continuity notes are ready for consistent panel art.' : 'Add cast, setting, palette, and style notes before final art.',
      },
    ];
    const issuePenalty = (
      missingCaptionPanels.length * 12 +
      missingDirectionPanels.length * 6 +
      missingTransitionPanels.length * 4 +
      missingThumbnailPanels.length * 3 +
      missingPageTurns.length * 4 +
      unsafeLetteringPanels.length * 4 +
      gutterRiskPanels.length * 4 +
      (bleedReady ? 0 : 3) +
      missingImagePanels.length * 4 +
      heavyBubblePanels.length * 5 +
      (shotSet.size <= 1 && total > 2 ? 10 : 0) +
      (transitionSet.size <= 1 && total > 3 ? 6 : 0) +
      (continuityFields < 2 ? 8 : 0)
    );
    const score = Math.max(0, Math.min(100, 100 - issuePenalty));
    const localSuggestions = [];
    if (missingCaptionPanels.length) localSuggestions.push({ panel: missingCaptionPanels[0], issue: 'Missing caption', suggestion: 'Add one short narration caption that tells the reader what changes in this panel.', priority: 'high' });
    if (missingDirectionPanels.length) localSuggestions.push({ panel: missingDirectionPanels[0], issue: 'Missing direction', suggestion: 'Choose a shot, angle, and mood so the art prompt has a clear camera plan.', priority: 'high' });
    if (missingTransitionPanels.length) localSuggestions.push({ panel: missingTransitionPanels[0], issue: 'Missing pacing move', suggestion: 'Pick whether this panel establishes, advances action, shows a reaction, reveals information, turns the scene, or resolves the beat.', priority: 'medium' });
    if (missingThumbnailPanels.length) localSuggestions.push({ panel: missingThumbnailPanels[0], issue: 'Missing thumbnail rough', suggestion: 'Add a focal point, composition note, and reserved lettering space before final art.', priority: 'medium' });
    if (missingPageTurns.length) localSuggestions.push({ panel: null, issue: `Page ${missingPageTurns[0]} turn is unset`, suggestion: 'Mark what the reader should feel at this page break: continue, reveal, cliffhanger, quiet pause, action surge, or resolve.', priority: 'medium' });
    if (unsafeLetteringPanels.length) localSuggestions.push({ panel: unsafeLetteringPanels[0], issue: 'Unsafe lettering area', suggestion: 'Reserve a top, side, or corner lettering space so bubbles stay inside the readable page area.', priority: 'medium' });
    if (gutterRiskPanels.length) localSuggestions.push({ panel: gutterRiskPanels[0], issue: 'Gutter risk', suggestion: 'Move the bubble away from the binding edge or use a different panel layout for this page.', priority: 'medium' });
    if (!bleedReady) localSuggestions.push({ panel: null, issue: 'Bleed marks off', suggestion: 'Enable bleed marks before final print export, especially for full-page or edge-to-edge art.', priority: 'low' });
    if (shotSet.size <= 1 && total > 2) localSuggestions.push({ panel: null, issue: 'Repeated camera distance', suggestion: 'Use a wide shot to establish place, a close-up for emotion, and a detail shot for an important object or clue.', priority: 'medium' });
    if (transitionSet.size <= 1 && total > 3) localSuggestions.push({ panel: null, issue: 'Flat pacing pattern', suggestion: 'Vary panel moves: establish the scene, push action forward, pause for reaction, then reveal or resolve something.', priority: 'medium' });
    if (heavyBubblePanels.length) localSuggestions.push({ panel: heavyBubblePanels[0], issue: 'Bubble crowding', suggestion: 'Split the dialogue across panels or trim the bubble to one strong line.', priority: 'medium' });
    if (missingImagePanels.length) localSuggestions.push({ panel: missingImagePanels[0], issue: 'Missing art', suggestion: 'Generate or preview the image prompt once the caption and direction feel final.', priority: 'medium' });
    return {
      score,
      summary: score >= 85 ? 'Comic flow is production-ready with only minor polish.' : score >= 65 ? 'Comic flow is close, with a few production notes to tighten.' : 'Comic flow needs another pass before final export.',
      metrics: {
        panels: panelRows.length,
        pages: pageRows.length,
        pageTurns: pageRows.filter(p => p.turn).length,
        layoutFrames: framedPanels.length,
        printFormat: getComicPrintFormatLabel(printSafety.format),
        gutterRisks: gutterRiskPanels.length,
        safeLetteringRisks: unsafeLetteringPanels.length,
        bleedReady,
        captions: count(p => p.hasCaption),
        images: count(p => p.hasImage),
        directions: count(p => p.hasDirection),
        thumbnailRoughs: count(p => p.hasThumbnailRough),
        shotTypes: shotSet.size,
        transitionTypes: transitionSet.size,
        bubblePanels: count(p => p.hasBubble),
        continuityFields,
      },
      checks,
      panelRows,
      pageRows,
      suggestions: localSuggestions,
      strengths: checks.filter(c => c.status === 'strong').map(c => c.label),
    };
  };

  const analyzeComicFlow = async () => {
    if (layoutMode !== 'comic') return;
    setComicFlowLoading(true);
    const snapshot = buildComicFlowSnapshot();
    if (!onCallGemini) {
      setComicFlowReport(snapshot);
      setComicFlowLoading(false);
      return;
    }
    try {
      const result = await onCallGemini(
        `You are a professional comic editor reviewing a student's short comic production board.
Use the local production checks, but add concise craft judgment about pacing, page clarity, visual rhythm, and lettering.

Production snapshot:
${JSON.stringify(snapshot, null, 2)}

Return ONLY JSON:
{
  "summary": "<one encouraging but specific overview>",
  "score": 0,
  "strengths": ["<specific strength>", "<specific strength>"],
  "globalSuggestions": ["<whole-comic revision suggestion>", "<whole-comic revision suggestion>"],
  "panelNotes": [
    { "panel": 1, "issue": "<short issue>", "suggestion": "<specific fix>", "priority": "high|medium|low" }
  ]
}`,
        true
      );
      const data = JSON.parse(cleanJson(result));
      const cleanScore = Number.isFinite(Number(data.score)) ? Math.max(0, Math.min(100, Number(data.score))) : snapshot.score;
      setComicFlowReport({
        ...snapshot,
        score: cleanScore,
        summary: typeof data.summary === 'string' && data.summary.trim() ? data.summary.slice(0, 500) : snapshot.summary,
        strengths: Array.isArray(data.strengths) ? data.strengths.slice(0, 4).map(s => String(s).slice(0, 180)) : snapshot.strengths,
        globalSuggestions: Array.isArray(data.globalSuggestions) ? data.globalSuggestions.slice(0, 4).map(s => String(s).slice(0, 240)) : [],
        panelNotes: Array.isArray(data.panelNotes) ? data.panelNotes.slice(0, 6).map(n => ({
          panel: Number(n.panel) || null,
          issue: String(n.issue || '').slice(0, 140),
          suggestion: String(n.suggestion || '').slice(0, 260),
          priority: ['high', 'medium', 'low'].includes(n.priority) ? n.priority : 'medium',
        })).filter(n => n.issue || n.suggestion) : [],
      });
      awardXP(5, 'Audited comic flow');
      if (addToast) addToast('Comic flow audit ready.', 'success');
      sfAnnounce('Comic flow audit ready');
    } catch (err) {
      console.warn('Comic flow audit failed:', err);
      setComicFlowReport(snapshot);
      if (addToast) addToast('AI comic audit failed, so local production checks were shown.', 'info');
    } finally {
      setComicFlowLoading(false);
    }
  };

  const synthesizeRevisionPlan = async () => {
    if (!onCallGemini) return;
    setRevisionPlanLoading(true);
    try {
      const fullText = paragraphs.map((p, i) => `[Paragraph ${i + 1}] ${p.text.trim()}`).filter(Boolean).join('\n\n');
      // Compact the helper outputs to keep the prompt small.
      const helperContext = [];
      if (sensesResult && !sensesResult.error) {
        helperContext.push(`SENSES CHECK:\n  strongest: ${sensesResult.strongest || 'unknown'}\n  missing: ${sensesResult.missing || 'unknown'}\n  suggestion: ${sensesResult.suggestion || ''}`);
      }
      if (showTellResult && (showTellResult.tellings || []).length > 0) {
        const top = showTellResult.tellings.slice(0, 3).map(t => `  - "${t.telling}" → "${t.showing}"`).join('\n');
        helperContext.push(`SHOW vs TELL:\n${top}`);
      }
      if (arcReport && (arcReport.characters || []).length > 0) {
        const top = arcReport.characters.slice(0, 3).map(c => {
          const weak = Object.entries(c.beats || {}).filter(([, v]) => v.status !== 'strong').map(([k]) => k).join(', ');
          return `  - ${c.name}: weakest beats: ${weak || 'none'} | suggestion: ${c.suggestion || ''}`;
        }).join('\n');
        helperContext.push(`CHARACTER ARCS:\n${top}`);
      }
      if (mentorMatch && !mentorMatch.error && mentorMatch.craftToBorrow) {
        helperContext.push(`MENTOR MATCH:\n  reading: ${mentorMatch.mentor?.title || 'unknown'} by ${mentorMatch.mentor?.author || 'unknown'}\n  craft to borrow: ${mentorMatch.craftToBorrow}`);
      }
      if (dialogueReport && (dialogueReport.issues || []).length > 0) {
        const top = dialogueReport.issues.slice(0, 3).map(i => `  - ${i.type}: "${i.line}" → ${i.suggestion}`).join('\n');
        helperContext.push(`DIALOGUE TUNE-UP:\n  overused tag: ${dialogueReport.overusedTag || 'none'}\n${top}`);
      }
      if (comicFlowReport && layoutMode === 'comic') {
        const top = (comicFlowReport.panelNotes || comicFlowReport.suggestions || []).slice(0, 3).map(n => `  - ${n.panel ? `Panel ${n.panel}: ` : ''}${n.issue || 'Comic flow'} -> ${n.suggestion || ''}`).join('\n');
        helperContext.push(`COMIC FLOW AUDIT:\n  score: ${comicFlowReport.score || 'n/a'}/100\n  summary: ${comicFlowReport.summary || ''}\n${top}`);
      }
      if (selfAssessmentSubmitted && Object.keys(selfAssessment).length > 0) {
        const lowest = Object.entries(selfAssessment).sort((a, b) => a[1] - b[1]).slice(0, 2);
        helperContext.push(`STUDENT SELF-ASSESSMENT (lowest ratings):\n${lowest.map(([k, v]) => `  - ${k}: ${v}/5`).join('\n')}`);
      }
      const helpersBlock = helperContext.length > 0
        ? `\n\nHelpers the student has already run:\n${helperContext.join('\n\n')}`
        : '';

      const targetGrade = gradeLevel || '5th grade';
      const prompt = `You are a kind, specific writing coach helping a ${targetGrade} student plan their next revision pass.

Story:
"""
${fullText}
"""${helpersBlock}

Build a prioritized revision plan with EXACTLY 3 tasks. Each task should:
- Be small enough to do in a single revision session.
- Be specific (name a paragraph, character, or sentence when possible).
- Pull from the helper outputs above when relevant — don't repeat what the helpers said, *synthesize* across them.
- Be ranked by impact (most-impactful first).
- Include a one-sentence "why" so the student understands the craft reason.

Tone: warm, concrete, never scolding. Treat the student as a capable writer who's iterating, not a beginner being corrected.

Return ONLY JSON:
{
  "tasks": [
    { "title": "<short imperative title, e.g. 'Add a smell to paragraph 3'>", "detail": "<one or two specific sentences on what to do>", "why": "<one short sentence on the craft reason>", "source": "<which helper this builds on, or 'overall'>" }
  ],
  "encouragement": "<one short, specific compliment on something the draft is already doing well>"
}`;

      const result = await onCallGemini(prompt, true);
      const data = JSON.parse(cleanJson(result));
      setRevisionPlan(data);
      if (addToast) addToast(t('toasts.revision_plan_ready'), 'success');
      sfAnnounce(`Revision plan ready with ${(data.tasks || []).length} prioritized tasks.`);
      awardXP(10, 'Built a revision plan');
    } catch (err) {
      console.warn('Revision plan synthesis failed:', err);
      if (addToast) addToast(t('toasts.revision_plan_failed_try_again'), 'error');
    }
    setRevisionPlanLoading(false);
  };

  // True when the student has at least 2 helper outputs available to synthesize.
  const helpersAvailableForPlan = () => {
    let n = 0;
    if (sensesResult && !sensesResult.error) n++;
    if (showTellResult && Array.isArray(showTellResult.tellings)) n++;
    if (arcReport && Array.isArray(arcReport.characters)) n++;
    if (mentorMatch && !mentorMatch.error) n++;
    if (dialogueReport && Array.isArray(dialogueReport.issues)) n++;
    if (comicFlowReport && layoutMode === 'comic') n++;
    if (selfAssessmentSubmitted && Object.keys(selfAssessment).length > 0) n++;
    return n >= 2;
  };

  // Pull criteria names out of the rubric markdown table; fall back to defaults.
  const getRubricCriteria = () => {
    const fallback = ['Vocabulary Usage', 'Story Structure', 'Creativity & Detail', 'Grammar & Mechanics'];
    const text = rubricText || '';
    if (!text.trim()) return fallback;
    const rows = text.split('\n').filter(l => l.includes('|') && !/^\s*\|?\s*-{3,}/.test(l));
    const names = rows
      .map(r => r.split('|').map(s => s.trim()).filter(Boolean)[0])
      .filter(n => n && n.toLowerCase() !== 'criteria' && !/^[-:]+$/.test(n));
    return names.length >= 2 ? names.slice(0, 6) : fallback;
  };

  // Tolerant lookup of a student's self-rating for an AI-named criterion. The model often
  // rewords a rubric criterion (e.g. "Story Structure" → "Structure" or "Plot & Structure"),
  // which made an exact selfAssessment[s.criteria] lookup silently return undefined and drop
  // the You-vs-AI comparison. Try exact, then case/space-normalized, then loose token overlap.
  const lookupSelfScore = (aiCriteria) => {
    if (aiCriteria == null) return null;
    if (selfAssessment[aiCriteria] != null) return selfAssessment[aiCriteria];
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const target = norm(aiCriteria);
    if (!target) return null;
    const keys = Object.keys(selfAssessment);
    let hit = keys.find(k => norm(k) === target);
    if (hit) return selfAssessment[hit];
    const targetTokens = new Set(target.split(' ').filter(w => w.length > 2));
    if (targetTokens.size > 0) {
      hit = keys.find(k => {
        const kt = norm(k).split(' ').filter(w => w.length > 2);
        return kt.some(w => targetTokens.has(w));
      });
      if (hit) return selfAssessment[hit];
    }
    return null;
  };

  // ═══════════════════════════════════════════════════════════
  // EXPORT PHASE FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const exportStorybook = async () => {
    // FERPA reminder: the storybook is de-identified (codename, never a real name), but it
    // bundles the student's full story and — if they recorded it — their VOICE narration in a
    // single downloadable file, so a local download is a confirmed, informed action (mirrors
    // the exportDraftJSON gate below).
    if (!(await requestExportConsent({ title: 'Export storybook?', message: 'This de-identified file uses the student codename, but it contains the complete story and any recorded voice narration. Save it only to a school-approved location and follow district student-records policy.', confirmLabel: 'Export storybook' }))) return;
    const title = escapeHtml(storyTitle || storyPrompt || sourceTopic || 'My Story');
    const author = escapeHtml(authorName || 'A Creative Student');
    const date = new Date().toLocaleDateString();
    const styleDesc = getStyleDesc();

    setHasExported(true);
    awardXP(20, 'Exported storybook');

    let chaptersHtml = '';
    const isComic = layoutMode === 'comic';
    const comicLayout = COMIC_PAGE_LAYOUTS[comicPageLayout] ? comicPageLayout : 'grid';
    const storybookPrintSafety = sanitizeComicPrintSafety(comicPrintSafety);
    const exportedComicPages = isComic ? buildComicPageGroups(paragraphs, comicPageComposer, comicLayout) : [];
    if (isComic) {
      const firstPage = exportedComicPages[0] || { page: 1, startPanel: 1, endPanel: paragraphs.length, layout: comicLayout, turn: '', note: '' };
      const firstGutter = getComicPageGutterSide(firstPage.page, firstPage.layout, storybookPrintSafety);
      chaptersHtml += `<section class="comic-page comic-print-${storybookPrintSafety.format} ${storybookPrintSafety.showGuides ? 'comic-print-guides' : ''} comic-gutter-${firstGutter || 'none'} ${storybookPrintSafety.includeBleed ? 'comic-bleed-on' : 'comic-bleed-off'}" aria-label="Comic page ${firstPage.page}">`;
      chaptersHtml += `<header class="comic-page-heading"><span>Page ${firstPage.page}</span><strong>${escapeHtml(getComicPageLayoutLabel(firstPage.layout))}</strong><em>Panels ${firstPage.startPanel}-${firstPage.endPanel} · ${escapeHtml(getComicPrintFormatLabel(storybookPrintSafety.format))}</em></header>`;
      chaptersHtml += `<div class="comic-reading-guide">${escapeHtml(getComicReadingOrderLabel(firstPage.layout))} · Follow the numbered panels</div>`;
      chaptersHtml += `<div class="comic-grid comic-layout-${firstPage.layout}">`;
    }
    paragraphs.forEach((p, idx) => {
      if (isComic && idx > 0) {
        const nextPage = exportedComicPages.find(page => page.startPanel === idx + 1);
        if (nextPage) {
          const prevPage = exportedComicPages.find(page => page.endPanel === idx);
          chaptersHtml += `</div>`;
          if (prevPage) {
            const prevTurnLabel = getComicPageTurnLabel(prevPage.turn);
            const prevNote = prevPage.note ? escapeHtml(prevPage.note) : '';
            if (prevTurnLabel || prevNote) {
              chaptersHtml += `<div class="comic-page-turn"><strong>Page turn:</strong> ${prevTurnLabel ? escapeHtml(prevTurnLabel) : 'Production note'}${prevNote ? ` · ${prevNote}` : ''}</div>`;
            }
          }
          chaptersHtml += `</section>`;
          const nextGutter = getComicPageGutterSide(nextPage.page, nextPage.layout, storybookPrintSafety);
          chaptersHtml += `<section class="comic-page comic-print-${storybookPrintSafety.format} ${storybookPrintSafety.showGuides ? 'comic-print-guides' : ''} comic-gutter-${nextGutter || 'none'} ${storybookPrintSafety.includeBleed ? 'comic-bleed-on' : 'comic-bleed-off'}" aria-label="Comic page ${nextPage.page}">`;
          chaptersHtml += `<header class="comic-page-heading"><span>Page ${nextPage.page}</span><strong>${escapeHtml(getComicPageLayoutLabel(nextPage.layout))}</strong><em>Panels ${nextPage.startPanel}-${nextPage.endPanel} · ${escapeHtml(getComicPrintFormatLabel(storybookPrintSafety.format))}</em></header>`;
          chaptersHtml += `<div class="comic-reading-guide">${escapeHtml(getComicReadingOrderLabel(nextPage.layout))} · Follow the numbered panels</div>`;
          chaptersHtml += `<div class="comic-grid comic-layout-${nextPage.layout}">`;
        }
      }
      const img = illustrations[p.id]?.imageUrl;
      const audio = audioSegments[p.id];
      const safeText = escapeHtml(isComic ? (p.text || p.scaffoldFrame || '') : p.text);
      if (isComic) {
        // Pull dialogue/sticker overlay data — these were rendered in-app but previously dropped on export.
        const panel = panelDialogue[p.id] || {};
        const safeSpeaker = panel.speaker ? escapeHtml(panel.speaker) : '';
        const safeSpeech = panel.speech ? escapeHtml(panel.speech) : '';
        const safeThought = panel.thought ? escapeHtml(panel.thought) : '';
        const safeSfx = panel.sfx ? escapeHtml(panel.sfx) : '';
        const rough = panelThumbnails[p.id] || {};
        const panelLayout = panelLayouts[p.id] || {};
        const panelPage = exportedComicPages.find(page => idx + 1 >= page.startPanel && idx + 1 <= page.endPanel);
        const panelPageLayout = panelPage?.layout || comicLayout;
        const panelPageIndex = panelPage ? idx - (panelPage.startPanel - 1) : idx;
        const letteringSpace = normalizeComicLetteringSpace(rough.letteringSpace);
        const spaceClass = getComicLetteringSpaceClass(letteringSpace);
        const hasOverlayBubble = Boolean(img && safeSpeech && letteringSpace && letteringSpace !== 'none');
        const customLetteringPosition = hasComicLetteringPosition(rough);
        const customLetteringWidth = hasComicLetteringWidth(rough);
        const customLetteringStyle = `${customLetteringPosition ? getComicLetteringPositionStyleText(rough, letteringSpace) : ''}${customLetteringWidth ? getComicLetteringWidthStyleText(rough) : ''}`;
        const sticker = panelStickers[p.id] || '';
        chaptersHtml += `<article class="panel ${escapeHtml(getComicPanelFrameClass(panelLayout.frame))}" style="${escapeHtml(getComicPanelGridStyleText(panelLayout, panelPageLayout, panelPageIndex))}" aria-label="${escapeHtml(t("a11y.comic_panel", { n: idx + 1 }))}">`;
        chaptersHtml += `<span class="panel-order-badge" aria-hidden="true">${idx + 1}</span>`;
        if (img) chaptersHtml += `<div class="panel-img-wrap ${escapeHtml(spaceClass)}">`;
        if (img) chaptersHtml += `<img src="${escapeHtml(img)}" class="panel-img" loading="lazy" alt="Comic panel ${idx + 1} illustration" />`;
        if (img && safeSfx) chaptersHtml += `<span class="sfx-tag" aria-label="${escapeHtml(t("a11y.sound_effect", { fx: panel.sfx }))}">${safeSfx}</span>`;
        if (img && sticker) chaptersHtml += `<span class="panel-sticker" aria-hidden="true">${escapeHtml(sticker)}</span>`;
        if (hasOverlayBubble) {
          chaptersHtml += `<div class="lettering-overlay${customLetteringPosition ? ' lettering-overlay-custom' : ''}"><div class="dialogue-bubble overlay-bubble"${customLetteringStyle ? ` style="${escapeHtml(customLetteringStyle)}"` : ''}>`;
          if (safeSpeaker) chaptersHtml += `<div class="dialogue-speaker">${safeSpeaker}:</div>`;
          chaptersHtml += `<div class="dialogue-speech">${safeSpeech}</div></div></div>`;
        }
        if (img) chaptersHtml += `</div>`;
        if (safeSpeech && !hasOverlayBubble) {
          chaptersHtml += `<div class="dialogue-bubble">`;
          if (safeSpeaker) chaptersHtml += `<div class="dialogue-speaker">${safeSpeaker}:</div>`;
          chaptersHtml += `<div class="dialogue-speech">${safeSpeech}</div>`;
          chaptersHtml += `</div>`;
        }
        if (safeThought) chaptersHtml += `<div class="thought-bubble" aria-label="Inner thought">💭 ${safeThought}</div>`;
        chaptersHtml += `<div class="speech-bubble panel-caption">${safeText.replace(/\n/g, '<br/>')}</div>`;
        chaptersHtml += `</article>`;
      } else {
        chaptersHtml += `<article class="chapter" aria-label="${escapeHtml(t("a11y.paragraph_n", { n: idx + 1 }))}">`;
        if (img) chaptersHtml += `<img src="${escapeHtml(img)}" class="scene-img" loading="lazy" alt="Illustration for paragraph ${idx + 1}" />`;
        const beatLabel = (PLOT_BEATS.find(b => b.value === p.plotBeat) || {}).label;
        if (beatLabel && p.plotBeat) {
          chaptersHtml += `<div class="beat-label" aria-label="${escapeHtml(t("a11y.narrative_beat", { label: beatLabel }))}">${escapeHtml(beatLabel)}</div>`;
        }
        chaptersHtml += `<p class="story-text">${safeText.replace(/\n/g, '<br/>')}</p>`;
        if (audio?.studentAudioBase64) {
          chaptersHtml += `<audio controls src="data:audio/webm;base64,${audio.studentAudioBase64}" style="width:100%;margin-top:8px;" aria-label="${escapeHtml(t("a11y.audio_narration_paragraph", { n: idx + 1 }))}"></audio>`;
        }
        chaptersHtml += `</article>`;
        if (idx < paragraphs.length - 1) chaptersHtml += `<div class="separator" aria-hidden="true">&mdash;</div>`;
      }
    });
    if (isComic) {
      const lastPage = exportedComicPages[exportedComicPages.length - 1];
      chaptersHtml += '</div>';
      if (lastPage) {
        const lastTurnLabel = getComicPageTurnLabel(lastPage.turn);
        const lastNote = lastPage.note ? escapeHtml(lastPage.note) : '';
        if (lastTurnLabel || lastNote) {
          chaptersHtml += `<div class="comic-page-turn"><strong>Page note:</strong> ${lastTurnLabel ? escapeHtml(lastTurnLabel) : 'Production note'}${lastNote ? ` · ${lastNote}` : ''}</div>`;
        }
      }
      chaptersHtml += '</section>';
    }

    let vocabHtml = `<div class="vocab-section"><h2 id="vocab-heading">${escapeHtml(t("ui_common.vocab_terms_used"))}</h2><div class="vocab-grid">`;
    vocabTerms.forEach(v => {
      const used = vocabUsage[v.term];
      vocabHtml += `<div class="vocab-chip ${used ? 'used' : 'unused'}">${used ? '✓' : '✗'} ${escapeHtml(v.term)}</div>`;
    });
    vocabHtml += '</div></div>';

    let feedbackHtml = '';
    if (gradingResult) {
      feedbackHtml = `<div class="feedback-section">
        <h2 id="feedback-heading">Feedback (AI-generated draft — not a final grade)</h2>
        <div class="score-badge" aria-label="${escapeHtml(t("a11y.score_n", { score: gradingResult.totalScore || '' }))}" title="AI-generated estimate, not a final grade">${escapeHtml(gradingResult.totalScore || '')}</div>
        <div class="glow-grow">
          <div class="glow"><strong>✨ Glow:</strong> ${escapeHtml(gradingResult.feedback?.glow || '')}</div>
          <div class="grow"><strong>🌱 Grow:</strong> ${escapeHtml(gradingResult.feedback?.grow || '')}</div>
        </div>
      </div>`;
    }

    const dirAttr = isRtl(langBcp47) ? 'rtl' : 'ltr';
    const html = `<!DOCTYPE html><html lang="${langBcp47}" dir="${dirAttr}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<meta name="author" content="${author}">
<meta name="description" content="A storybook by ${author}, made with StoryForge.">
<style>
*{margin:0;padding:0;box-sizing:border-box}
.skip-link{position:absolute;left:-9999px;top:0;padding:8px 14px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700}
.skip-link:focus{left:0;top:0;z-index:1000}
body{font-family:Georgia,'Times New Roman',serif;line-height:1.8;color:#1e293b;max-width:800px;margin:0 auto;padding:40px 20px;background:#fefce8}
main{display:block}
.cover{text-align:center;padding:60px 20px;border:4px double #d4af37;border-radius:12px;margin-bottom:40px;background:linear-gradient(135deg,#fffbeb,#fef3c7)}
.cover h1{font-size:2.5em;color:#92400e;margin-bottom:8px}
.cover .meta{color:#78716c;font-size:0.9em;font-style:italic}
.chapter{margin:30px 0;padding:20px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #d4af37}
.scene-img{width:100%;max-width:600px;display:block;margin:0 auto 16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1)}
.story-text{font-size:1.1em;text-indent:2em}
.beat-label{display:inline-block;font-size:0.7em;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#4338ca;background:#eef2ff;border:1px solid #c7d2fe;padding:3px 10px;border-radius:999px;margin-bottom:10px}
.separator{text-align:center;color:#d4af37;font-size:1.5em;margin:20px 0}
.vocab-section{margin-top:40px;padding:20px;background:#f0fdf4;border-radius:12px;border:2px solid #bbf7d0}
.vocab-section h3{color:#166534;margin-bottom:12px}
.vocab-grid{display:flex;flex-wrap:wrap;gap:8px}
.vocab-chip{padding:4px 12px;border-radius:20px;font-size:0.85em;font-weight:bold}
.vocab-chip.used{background:#dcfce7;color:#166534;border:1px solid #86efac}
.vocab-chip.unused{background:#fef2f2;color:#991b1b;border:1px solid #fca5a5}
.feedback-section{margin-top:30px;padding:20px;background:#eff6ff;border-radius:12px;border:2px solid #bfdbfe}
.feedback-section h3{color:#1e40af;margin-bottom:12px}
.score-badge{display:inline-block;background:#4f46e5;color:white;padding:4px 16px;border-radius:20px;font-weight:bold;margin-bottom:12px}
.glow-grow{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.glow{background:#f0fdf4;padding:12px;border-radius:8px;border:1px solid #bbf7d0;font-size:0.9em}
.grow{background:#fffbeb;padding:12px;border-radius:8px;border:1px solid #fde68a;font-size:0.9em}
.colophon{text-align:center;margin-top:40px;color:#475569;font-size:0.8em;padding-top:20px;border-top:1px solid #e5e7eb}
.print-btn{position:fixed;top:16px;right:16px;padding:8px 20px;background:#4f46e5;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:0.9em;box-shadow:0 2px 8px rgba(79,70,229,0.3);z-index:100}
.print-btn:hover{background:#4338ca}
.print-btn:focus{outline:3px solid #fbbf24;outline-offset:2px}
.comic-page{margin:28px 0;break-inside:avoid}
.comic-page-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f8fafc;border:2px solid #0f172a;border-bottom:0;border-radius:8px 8px 0 0;padding:8px 12px;font-family:Arial,Helvetica,sans-serif}
.comic-page-heading span{font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#0f172a;font-size:.78em}
.comic-page-heading strong{font-size:.86em;color:#1d4ed8}
.comic-page-heading em{font-style:normal;color:#64748b;font-size:.78em;font-weight:800}
.comic-reading-guide{background:#0f172a;color:white;border-radius:8px 8px 0 0;padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:.78em;font-weight:900;text-transform:uppercase;letter-spacing:.06em;text-align:center}
.comic-page-heading + .comic-reading-guide{border-radius:0}
.comic-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:20px;background:#1e293b;border-radius:8px}
.comic-reading-guide + .comic-grid{border-radius:0 0 8px 8px}
.comic-page-turn{border:2px solid #0f172a;border-top:0;background:#fffbeb;color:#713f12;border-radius:0 0 8px 8px;padding:8px 12px;font-family:Arial,Helvetica,sans-serif;font-size:.82em;line-height:1.35}
.comic-layout-strip{grid-template-columns:1fr}
.comic-layout-strip .panel-img{aspect-ratio:16/9}
.comic-layout-splash .panel:first-child{grid-column:1/-1}
.comic-layout-splash .panel:first-child .panel-img{aspect-ratio:16/9}
.comic-layout-manga{direction:rtl}
.comic-layout-manga .panel{direction:ltr}
.panel{background:white;border:3px solid #0f172a;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;position:relative}
.panel-frame-wide,.panel-frame-full{grid-column:1/-1}
.panel-frame-tall{grid-row:span 2}
.panel-frame-inset{margin:10px;box-shadow:0 0 0 2px rgba(255,255,255,.7)}
.panel-frame-wide .panel-img,.panel-frame-full .panel-img{aspect-ratio:16/9}
.comic-print-guides .panel::after{content:"";position:absolute;inset:10px;border:1px dashed rgba(16,185,129,.85);border-radius:6px;pointer-events:none;z-index:5}
.comic-print-guides.comic-bleed-on .panel{box-shadow:inset 0 0 0 4px rgba(251,191,36,.22)}
.comic-print-guides.comic-gutter-left .panel::before,.comic-print-guides.comic-gutter-right .panel::before{content:"";position:absolute;top:0;bottom:0;width:10px;background:rgba(244,63,94,.22);pointer-events:none;z-index:5}
.comic-print-guides.comic-gutter-left .panel::before{left:0}
.comic-print-guides.comic-gutter-right .panel::before{right:0}
.panel-order-badge{position:absolute;top:8px;left:8px;z-index:6;width:26px;height:26px;border-radius:999px;background:#0f172a;color:white;border:2px solid white;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;font-weight:900;font-size:.8em;box-shadow:0 2px 6px rgba(15,23,42,.35)}
.comic-layout-manga .panel-order-badge{left:auto;right:8px}
.panel-img-wrap{position:relative}
.panel-img{width:100%;aspect-ratio:1;object-fit:cover;display:block}
.lettering-overlay{position:absolute;left:8px;right:8px;top:8px;bottom:8px;display:flex;pointer-events:none;z-index:3}
.lettering-overlay .overlay-bubble{max-width:72%;margin:0;box-shadow:0 2px 8px rgba(15,23,42,.18)}
.lettering-overlay-custom{display:block}
.lettering-overlay-custom .overlay-bubble{position:absolute;max-width:72%}
.lettering-space-top .lettering-overlay{align-items:flex-start;justify-content:center}
.lettering-space-bottom .lettering-overlay{align-items:flex-end;justify-content:center}
.lettering-space-left .lettering-overlay{align-items:center;justify-content:flex-start}
.lettering-space-right .lettering-overlay{align-items:center;justify-content:flex-end}
.lettering-space-top-left .lettering-overlay{align-items:flex-start;justify-content:flex-start}
.lettering-space-top-right .lettering-overlay{align-items:flex-start;justify-content:flex-end}
.lettering-space-bottom-left .lettering-overlay{align-items:flex-end;justify-content:flex-start}
.lettering-space-bottom-right .lettering-overlay{align-items:flex-end;justify-content:flex-end}
.sfx-tag{position:absolute;top:8px;right:8px;background:#fbbf24;color:#7c2d12;font-weight:900;font-style:italic;padding:4px 12px;border-radius:8px;border:2px solid #7c2d12;font-family:'Comic Sans MS','Marker Felt',sans-serif;font-size:0.95em;transform:rotate(-6deg);box-shadow:2px 2px 0 #7c2d12;text-transform:uppercase;letter-spacing:0.05em}
.comic-layout-manga .sfx-tag{top:42px}
.panel-sticker{position:absolute;bottom:8px;left:8px;font-size:2em;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))}
.dialogue-bubble{margin:8px;padding:10px 14px;background:#fff;border:2px solid #1e293b;border-radius:14px;font-size:0.92em;line-height:1.4;position:relative;overflow-wrap:anywhere}
.dialogue-speaker{font-weight:bold;color:#1d4ed8;font-size:0.78em;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px}
.dialogue-speech{color:#1e293b}
.thought-bubble{margin:8px;padding:8px 12px;background:#f0f9ff;border:2px dashed #7c3aed;border-radius:14px;color:#5b21b6;font-style:italic;font-size:0.88em;line-height:1.4}
.panel-caption{font-size:0.85em;color:#475569;font-style:italic}
.speech-bubble{padding:12px;font-size:0.95em;line-height:1.5;border-top:2px solid #e2e8f0;position:relative;background:#fff}
@media (max-width:700px){.comic-grid{grid-template-columns:1fr}.comic-layout-splash .panel:first-child{grid-column:auto}}
@media print{.skip-link,.print-btn{display:none}.chapter,.panel{break-inside:avoid}body{background:#fff !important}.cover{background:#fffbeb !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.comic-grid{background:#1e293b !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
@media (prefers-reduced-motion:reduce){*{transition:none !important;animation:none !important}}
</style></head><body>
<a class="skip-link" href="#story-content">${escapeHtml(t("ui_common.skip_to_story"))}</a>
<button type="button" class="print-btn" onclick="window.print()" aria-label="${escapeHtml(t("a11y.story_print"))}">🖨️¨ï¸ Print</button>
<header class="cover" role="banner">
  ${coverArt ? `<img src="${escapeHtml(coverArt)}" style="max-width:300px;border-radius:12px;margin:0 auto 16px;display:block;box-shadow:0 4px 16px rgba(0,0,0,0.15)" alt="Cover illustration for ${title}" />` : ''}
  <h1 id="story-title">${title}</h1>
  <p class="meta">Written by ${author}</p>
  <p class="meta">${escapeHtml(date)} · ${escapeHtml(GENRE_TEMPLATES[genre]?.label || 'Creative Writing')} · Art style: ${escapeHtml(artStyle)}${isComic ? ` · Layout: ${escapeHtml(COMIC_PAGE_LAYOUTS[comicLayout]?.label || 'Grid')} · Pages: ${escapeHtml(exportedComicPages.length || 1)} · Print: ${escapeHtml(getComicPrintFormatLabel(storybookPrintSafety.format))} · ${escapeHtml(getComicReadingOrderLabel(comicLayout))}` : ''}</p>
</header>
<main id="story-content" role="main" aria-labelledby="story-title">
${chaptersHtml}
</main>
<aside class="vocab-aside" aria-labelledby="vocab-heading">
${vocabHtml}
</aside>
${feedbackHtml ? `<aside class="feedback-aside" aria-label="Teacher feedback">${feedbackHtml}</aside>` : ''}
<footer class="colophon" role="contentinfo">Created with StoryForge · AlloFlow</footer>
</body></html>`;

    try {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
      else if (addToast) addToast(t('toasts.pop_up_blocked_allow_pop_3'), 'error');
    } catch (e) {
      if (addToast) addToast(t('toasts.export_failed_2'), 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // SLIDESHOW EXPORT
  // ═══════════════════════════════════════════════════════════

  const exportComicScript = async () => {
    if (layoutMode !== 'comic') return;
    if (!(await requestExportConsent({ title: 'Export comic script?', message: 'This de-identified file uses the student codename, but it contains all panel captions and dialogue. Save it only to a school-approved location and follow district student-records policy.', confirmLabel: 'Export comic script' }))) return;
    const title = escapeHtml(storyTitle || storyPrompt || sourceTopic || 'My Comic');
    const author = escapeHtml(authorName || 'A Creative Student');
    const comicLayout = COMIC_PAGE_LAYOUTS[comicPageLayout] ? comicPageLayout : 'grid';
    const layoutLabel = escapeHtml(COMIC_PAGE_LAYOUTS[comicLayout]?.label || 'Grid');
    const scriptPrintSafety = sanitizeComicPrintSafety(comicPrintSafety);
    const continuity = sanitizeComicContinuity(comicContinuity);
    const continuityRows = [
      ['Cast', continuity.cast],
      ['Setting', continuity.setting],
      ['Palette', continuity.palette],
      ['Style Rules', continuity.styleNotes],
    ].filter(([, value]) => value && value.trim());
    const continuityHtml = continuityRows.length
      ? `<section class="continuity-sheet"><h2>Continuity Sheet</h2><dl>${continuityRows.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value).replace(/\n/g, '<br/>')}</dd>`).join('')}</dl></section>`
      : '';
    const scriptPages = buildComicPageGroups(paragraphs, comicPageComposer, comicLayout);
    const pagePlanHtml = `<section class="page-plan"><h2>Page Composer</h2>${scriptPages.map((page) => {
      const turnLabel = getComicPageTurnLabel(page.turn);
      return `<div class="page-row">
        <strong>Page ${page.page}</strong>
        <span>${escapeHtml(getComicPageLayoutLabel(page.layout))} · Panels ${page.startPanel}-${page.endPanel}</span>
        <em>${turnLabel ? escapeHtml(turnLabel) : (page.page < scriptPages.length ? 'Turn unset' : 'Final page')}${page.note ? ` · ${escapeHtml(page.note)}` : ''}</em>
      </div>`;
    }).join('')}</section>`;
    const panelsHtml = paragraphs.map((p, idx) => {
      const panel = panelDialogue[p.id] || {};
      const direction = panelDirections[p.id] || {};
      const rough = panelThumbnails[p.id] || {};
      const layoutFrame = panelLayouts[p.id] || {};
      const panelPage = scriptPages.find(page => idx + 1 >= page.startPanel && idx + 1 <= page.endPanel);
      const panelPageIndex = panelPage ? idx - (panelPage.startPanel - 1) : idx;
      const beatLabel = (PLOT_BEATS.find(b => b.value === p.plotBeat) || {}).label || '';
      const caption = p.text || p.scaffoldFrame || '';
      const imagePrompt = illustrations[p.id]?.prompt || '';
      const lettering = getComicLetteringStats(panel);
      const directionText = [
        direction.shot ? `Shot: ${getComicDirectionLabel('shot', direction.shot)}` : '',
        direction.angle ? `Angle: ${getComicDirectionLabel('angle', direction.angle)}` : '',
        direction.mood ? `Mood: ${getComicDirectionLabel('mood', direction.mood)}` : '',
        direction.transition ? `Move: ${getComicDirectionLabel('transition', direction.transition)}` : '',
      ].filter(Boolean).join(' / ');
      return `<section class="script-panel">
        <header><h2>Panel ${idx + 1}</h2>${beatLabel ? `<span>${escapeHtml(beatLabel)}</span>` : ''}</header>
        <dl>
          <dt>Caption</dt><dd>${escapeHtml(caption).replace(/\n/g, '<br/>') || '<em>Not written yet</em>'}</dd>
          <dt>Frame</dt><dd>${escapeHtml(getComicPanelFrameLabel(layoutFrame.frame))} · ${escapeHtml(getComicPanelSpanLabel(layoutFrame, panelPage?.layout || comicLayout, panelPageIndex))}</dd>
          <dt>Visual Direction</dt><dd>${directionText ? escapeHtml(directionText) : '<em>None</em>'}</dd>
          <dt>Thumbnail Rough</dt><dd>${rough.focalPoint || rough.composition || rough.letteringSpace || rough.sketchNote ? [
            rough.focalPoint ? `Focal point: ${rough.focalPoint}` : '',
            rough.composition ? `Composition: ${rough.composition}` : '',
            rough.letteringSpace ? `Lettering space: ${getComicLetteringSpaceLabel(rough.letteringSpace)}` : '',
            rough.sketchNote ? `Sketch note: ${rough.sketchNote}` : '',
          ].filter(Boolean).map(escapeHtml).join('<br/>') : '<em>None</em>'}</dd>
          <dt>Speech</dt><dd>${panel.speech ? `${panel.speaker ? `<strong>${escapeHtml(panel.speaker)}:</strong> ` : ''}${escapeHtml(panel.speech)}` : '<em>None</em>'}</dd>
          <dt>Thought</dt><dd>${panel.thought ? escapeHtml(panel.thought) : '<em>None</em>'}</dd>
          <dt>SFX</dt><dd>${panel.sfx ? escapeHtml(panel.sfx) : '<em>None</em>'}</dd>
          <dt>Lettering</dt><dd>${lettering.words}/${lettering.limit} words (${escapeHtml(lettering.label)})</dd>
          <dt>Image Prompt</dt><dd>${imagePrompt ? escapeHtml(imagePrompt) : '<em>No illustration prompt yet</em>'}</dd>
        </dl>
      </section>`;
    }).join('');
    const html = `<!DOCTYPE html><html lang="${langBcp47}" dir="${isRtl(langBcp47) ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Comic Script</title>
<style>
*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111827;max-width:900px;margin:0 auto;padding:32px 20px;background:#f8fafc}h1{font-size:2rem;margin:0 0 4px}.meta{color:#475569;font-size:.9rem;margin-bottom:24px}.continuity-sheet,.page-plan{background:#f5f3ff;border:2px solid #c4b5fd;border-radius:8px;margin:16px 0 20px;overflow:hidden}.continuity-sheet h2,.page-plan h2{font-size:1rem;margin:0;padding:8px 12px;background:#4c1d95;color:white}.page-row{display:grid;grid-template-columns:90px 1fr 1.2fr;gap:8px;padding:8px 12px;border-top:1px solid #ddd6fe;background:white}.page-row strong{color:#111827}.page-row span{color:#1d4ed8;font-weight:800}.page-row em{font-style:normal}.script-panel{background:white;border:2px solid #111827;border-radius:8px;margin:16px 0;break-inside:avoid;overflow:hidden}.script-panel header{display:flex;align-items:center;justify-content:space-between;background:#111827;color:white;padding:8px 12px}.script-panel h2{font-size:1rem;margin:0}.script-panel header span{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:#fde68a}dl{display:grid;grid-template-columns:120px 1fr;margin:0}dt{font-weight:800;background:#f1f5f9;border-top:1px solid #e2e8f0;padding:8px 10px}dd{margin:0;border-top:1px solid #e2e8f0;padding:8px 10px}em{color:#64748b}.print-btn{position:fixed;top:16px;right:16px;padding:8px 16px;background:#111827;color:white;border:0;border-radius:8px;font-weight:800;cursor:pointer}@media print{body{background:white}.print-btn{display:none}.script-panel,.continuity-sheet,.page-plan{break-inside:avoid}}
.page-plan-row{display:grid;grid-template-columns:90px 1fr 110px 1.4fr;gap:8px;align-items:start;border:1px solid #dbeafe;background:#eff6ff;border-radius:8px;padding:9px 10px;margin:8px 0}.page-plan-row strong{color:#0f172a}.page-plan-row span{font-weight:800;color:#1d4ed8}.page-plan-row em{font-style:normal;color:#475569}@media(max-width:760px){.page-plan-row{grid-template-columns:1fr}}
</style></head><body>
<button type="button" class="print-btn" onclick="window.print()">Print</button>
<h1>${title}</h1>
<div class="meta">Comic script by ${author} · Layout: ${layoutLabel} · Pages: ${escapeHtml(scriptPages.length || 1)} · Print: ${escapeHtml(getComicPrintFormatLabel(scriptPrintSafety.format))} · ${escapeHtml(getComicReadingOrderLabel(comicLayout))} · ${escapeHtml(new Date().toLocaleDateString())}</div>
${continuityHtml}
${pagePlanHtml}
${panelsHtml}
</body></html>`;
    try {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
      else if (addToast) addToast(t('toasts.pop_up_blocked_allow_pop_3'), 'error');
    } catch (e) {
      if (addToast) addToast(t('toasts.export_failed_2'), 'error');
    }
  };

  const exportComicProductionPack = async () => {
    if (layoutMode !== 'comic') return;
    if (!(await requestExportConsent({ title: 'Export production pack?', message: 'This de-identified file contains the full comic, bubbles, art prompts, continuity notes, and production status. Save it only to a school-approved location and follow district student-records policy.', confirmLabel: 'Export production pack' }))) return;
    const title = escapeHtml(storyTitle || storyPrompt || sourceTopic || 'My Comic');
    const author = escapeHtml(authorName || 'A Creative Student');
    const comicLayout = COMIC_PAGE_LAYOUTS[comicPageLayout] ? comicPageLayout : 'grid';
    const layoutLabel = COMIC_PAGE_LAYOUTS[comicLayout]?.label || 'Grid';
    const continuity = sanitizeComicContinuity(comicContinuity);
    const snapshot = buildComicFlowSnapshot();
    const report = comicFlowReport && layoutMode === 'comic'
      ? { ...snapshot, ...comicFlowReport, metrics: { ...(snapshot.metrics || {}), ...(comicFlowReport.metrics || {}) }, checks: comicFlowReport.checks || snapshot.checks }
      : snapshot;
    const packPrintSafety = sanitizeComicPrintSafety(comicPrintSafety);
    const packPages = buildComicPageGroups(paragraphs, comicPageComposer, comicLayout);
    const pagePlanHtml = packPages.map((page) => {
      const turnLabel = getComicPageTurnLabel(page.turn);
      const gutterSide = getComicPageGutterSide(page.page, page.layout, packPrintSafety);
      return `<div class="page-plan-row">
        <strong>Page ${page.page}</strong>
        <span>${escapeHtml(getComicPageLayoutLabel(page.layout))}</span>
        <span>Panels ${page.startPanel}-${page.endPanel}${gutterSide ? ` - ${escapeHtml(gutterSide)} gutter` : ''}</span>
        <em>${turnLabel ? escapeHtml(turnLabel) : (page.page < packPages.length ? 'Turn unset' : 'Final page')}${page.note ? ` - ${escapeHtml(page.note)}` : ''}</em>
      </div>`;
    }).join('');
    const printSafetyHtml = `
      <div class="field filled"><strong>Format</strong><span>${escapeHtml(getComicPrintFormatLabel(packPrintSafety.format))} - ${escapeHtml(COMIC_PRINT_FORMATS[packPrintSafety.format]?.trim || 'Screen')}</span></div>
      <div class="field filled"><strong>Safe Text Zone</strong><span>${escapeHtml(COMIC_PRINT_FORMATS[packPrintSafety.format]?.safe || 'Safe area')}</span></div>
      <div class="field filled"><strong>Gutter</strong><span>${escapeHtml(getComicPrintGutterLabel(packPrintSafety.gutter))}${COMIC_PRINT_GUTTERS[packPrintSafety.gutter]?.width !== 'none' ? ` - ${escapeHtml(COMIC_PRINT_GUTTERS[packPrintSafety.gutter].width)}` : ''}</span></div>
      <div class="field ${packPrintSafety.format === 'digital' || packPrintSafety.includeBleed ? 'filled' : 'missing'}"><strong>Bleed</strong><span>${packPrintSafety.format === 'digital' ? 'Not needed for digital' : (packPrintSafety.includeBleed ? 'Bleed marks enabled' : 'Bleed marks off')}</span></div>
    `;
    const continuityRows = [
      ['Cast', continuity.cast],
      ['Setting', continuity.setting],
      ['Palette', continuity.palette],
      ['Style Rules', continuity.styleNotes],
    ];
    const continuityHtml = continuityRows.map(([label, value]) => `
      <div class="field ${value && value.trim() ? 'filled' : 'missing'}">
        <strong>${escapeHtml(label)}</strong>
        <span>${value && value.trim() ? escapeHtml(value).replace(/\n/g, '<br/>') : 'Missing'}</span>
      </div>
    `).join('');
    const checksHtml = (report.checks || []).map((check) => `
      <div class="check ${escapeHtml(check.status || 'watch')}">
        <strong>${escapeHtml(check.label || 'Check')}</strong>
        <span>${escapeHtml(check.value || '')}</span>
        <p>${escapeHtml(check.detail || '')}</p>
      </div>
    `).join('');
    const suggestions = (report.panelNotes && report.panelNotes.length > 0 ? report.panelNotes : report.suggestions || []).slice(0, 8);
    const suggestionsHtml = suggestions.length ? suggestions.map((note) => `
      <li>
        <strong>${note.panel ? `Panel ${escapeHtml(note.panel)}` : 'Whole comic'}:</strong>
        ${escapeHtml(note.issue || 'Production note')}
        ${note.suggestion ? `<span>${escapeHtml(note.suggestion)}</span>` : ''}
      </li>
    `).join('') : '<li>No major production notes yet.</li>';
    const globalHtml = (report.globalSuggestions || []).length ? `
      <section class="pack-section">
        <h2>Whole-Comic Notes</h2>
        <ul>${report.globalSuggestions.slice(0, 6).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
      </section>
    ` : '';
    const panelsHtml = paragraphs.map((p, idx) => {
      const panel = panelDialogue[p.id] || {};
      const direction = panelDirections[p.id] || {};
      const rough = panelThumbnails[p.id] || {};
      const layoutFrame = panelLayouts[p.id] || {};
      const panelPage = packPages.find(page => idx + 1 >= page.startPanel && idx + 1 <= page.endPanel);
      const panelPageIndex = panelPage ? idx - (panelPage.startPanel - 1) : idx;
      const caption = p.text || p.scaffoldFrame || '';
      const lettering = getComicLetteringStats(panel);
      const image = illustrations[p.id] || {};
      const beatLabel = (PLOT_BEATS.find(b => b.value === p.plotBeat) || {}).label || '';
      const directionRows = [
        ['Move', getComicDirectionLabel('transition', direction.transition)],
        ['Shot', getComicDirectionLabel('shot', direction.shot)],
        ['Angle', getComicDirectionLabel('angle', direction.angle)],
        ['Mood', getComicDirectionLabel('mood', direction.mood)],
      ];
      const missing = [];
      if (!caption.trim()) missing.push('caption');
      if (!direction.shot || !direction.angle || !direction.mood || !direction.transition) missing.push('direction');
      if (!rough.focalPoint || !rough.composition || !rough.letteringSpace) missing.push('rough');
      if (lettering.level === 'crowded') missing.push('lettering trim');
      if (!image.imageUrl) missing.push('art');
      const status = missing.length ? `Needs ${missing.join(', ')}` : 'Ready for production';
      const artBrief = getIllustrationSourceText(p).slice(0, 1100);
      return `
        <section class="panel-card">
          <header>
            <div>
              <h2>Panel ${idx + 1}</h2>
              ${beatLabel ? `<span class="beat">${escapeHtml(beatLabel)}</span>` : ''}
            </div>
            <span class="status ${missing.length ? 'needs' : 'ready'}">${escapeHtml(status)}</span>
          </header>
          <div class="panel-grid">
            <div class="thumb">
              ${image.imageUrl ? `<img src="${escapeHtml(image.imageUrl)}" alt="Panel ${idx + 1} illustration" />` : '<div class="empty-art">No art yet</div>'}
            </div>
            <dl>
              <dt>Caption</dt><dd>${caption ? escapeHtml(caption).replace(/\n/g, '<br/>') : '<em>Not written yet</em>'}</dd>
              <dt>Frame</dt><dd>${escapeHtml(getComicPanelFrameLabel(layoutFrame.frame))} · ${escapeHtml(getComicPanelSpanLabel(layoutFrame, panelPage?.layout || comicLayout, panelPageIndex))}</dd>
              <dt>Direction</dt><dd>${directionRows.map(([label, value]) => `<span class="dir-chip">${escapeHtml(label)}: ${value ? escapeHtml(value) : 'Unset'}</span>`).join('')}</dd>
              <dt>Thumbnail Rough</dt><dd>${rough.focalPoint || rough.composition || rough.letteringSpace || rough.sketchNote ? [
                rough.focalPoint ? `Focal point: ${rough.focalPoint}` : '',
                rough.composition ? `Composition: ${rough.composition}` : '',
                rough.letteringSpace ? `Lettering space: ${getComicLetteringSpaceLabel(rough.letteringSpace)}` : '',
                rough.sketchNote ? `Sketch note: ${rough.sketchNote}` : '',
              ].filter(Boolean).map(escapeHtml).join('<br/>') : '<em>No thumbnail rough yet</em>'}</dd>
              <dt>Speech</dt><dd>${panel.speech ? `${panel.speaker ? `<strong>${escapeHtml(panel.speaker)}:</strong> ` : ''}${escapeHtml(panel.speech)}` : '<em>None</em>'}</dd>
              <dt>Thought</dt><dd>${panel.thought ? escapeHtml(panel.thought) : '<em>None</em>'}</dd>
              <dt>SFX</dt><dd>${panel.sfx ? escapeHtml(panel.sfx) : '<em>None</em>'}</dd>
              <dt>Lettering</dt><dd>${lettering.words}/${lettering.limit} words - ${escapeHtml(lettering.label)}. ${escapeHtml(lettering.detail)}</dd>
              <dt>Art Brief</dt><dd>${artBrief ? escapeHtml(artBrief).replace(/\n/g, '<br/>') : '<em>No art brief yet</em>'}</dd>
              <dt>Final Prompt</dt><dd>${image.prompt ? escapeHtml(image.prompt) : '<em>No generated prompt yet</em>'}</dd>
            </dl>
          </div>
        </section>
      `;
    }).join('');
    const html = `<!DOCTYPE html><html lang="${langBcp47}" dir="${isRtl(langBcp47) ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} - Comic Production Pack</title>
<style>
*{box-sizing:border-box}body{font-family:Inter,Arial,Helvetica,sans-serif;line-height:1.45;color:#0f172a;max-width:1100px;margin:0 auto;padding:32px 20px;background:#f8fafc}h1{font-size:2rem;margin:0 0 6px}.meta{color:#475569;font-size:.92rem;margin-bottom:22px}.print-btn{position:fixed;top:16px;right:16px;padding:8px 16px;background:#0f172a;color:white;border:0;border-radius:8px;font-weight:800;cursor:pointer;z-index:10}.pack-section{background:white;border:2px solid #e2e8f0;border-radius:10px;margin:16px 0;padding:16px;break-inside:avoid}.pack-section h2{font-size:1rem;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;color:#1d4ed8}.summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}.metric{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px}.metric strong{display:block;font-size:1.45rem;color:#1e40af}.metric span{font-size:.78rem;color:#475569;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.field{border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#f8fafc}.field strong{display:block;margin-bottom:5px}.field.missing span{color:#991b1b;font-style:italic}.checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.check{border-radius:8px;padding:10px;border:1px solid #e2e8f0;background:#f8fafc}.check strong{display:block}.check span{font-weight:900;color:#0f172a}.check p{margin:5px 0 0;color:#475569;font-size:.86rem}.check.strong{border-color:#86efac;background:#f0fdf4}.check.watch{border-color:#fcd34d;background:#fffbeb}.check.needs-work{border-color:#fca5a5;background:#fef2f2}ul{margin:0;padding-left:20px}li{margin:7px 0}li span{display:block;color:#475569}.panel-card{background:white;border:2px solid #0f172a;border-radius:10px;margin:16px 0;overflow:hidden;break-inside:avoid}.panel-card header{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#0f172a;color:white;padding:10px 14px}.panel-card h2{font-size:1rem;margin:0}.beat{display:inline-block;color:#fde68a;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em}.status{font-size:.75rem;font-weight:900;border-radius:999px;padding:4px 10px;background:#e2e8f0;color:#0f172a}.status.ready{background:#bbf7d0;color:#14532d}.status.needs{background:#fed7aa;color:#7c2d12}.panel-grid{display:grid;grid-template-columns:220px 1fr;gap:0}.thumb{background:#f1f5f9;min-height:180px;display:flex;align-items:center;justify-content:center;border-right:1px solid #e2e8f0}.thumb img{width:100%;height:100%;max-height:260px;object-fit:cover;display:block}.empty-art{color:#64748b;font-weight:800;text-transform:uppercase;font-size:.8rem}dl{display:grid;grid-template-columns:120px 1fr;margin:0}dt{font-weight:900;background:#f8fafc;border-top:1px solid #e2e8f0;padding:8px 10px}dd{margin:0;border-top:1px solid #e2e8f0;padding:8px 10px}.dir-chip{display:inline-block;margin:0 5px 5px 0;padding:3px 8px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:.78rem;font-weight:800}em{color:#64748b}.footer{color:#64748b;text-align:center;font-size:.8rem;margin:28px 0 4px}@media(max-width:760px){.panel-grid{grid-template-columns:1fr}.thumb{border-right:0;border-bottom:1px solid #e2e8f0}.panel-card header{align-items:flex-start;flex-direction:column}dl{grid-template-columns:1fr}dt{padding-bottom:2px}dd{padding-top:2px}}@media print{body{background:white}.print-btn{display:none}.pack-section,.panel-card{break-inside:avoid}}
</style></head><body>
<style>.page-plan-row{display:grid;grid-template-columns:90px 1fr 110px 1.4fr;gap:8px;align-items:start;border:1px solid #dbeafe;background:#eff6ff;border-radius:8px;padding:9px 10px;margin:8px 0}.page-plan-row strong{color:#0f172a}.page-plan-row span{font-weight:800;color:#1d4ed8}.page-plan-row em{font-style:normal;color:#475569}@media(max-width:760px){.page-plan-row{grid-template-columns:1fr}}</style>
<button type="button" class="print-btn" onclick="window.print()">Print</button>
<h1>${title}</h1>
<div class="meta">Comic production pack by ${author} - Layout: ${escapeHtml(layoutLabel)} - Pages: ${escapeHtml(packPages.length || 1)} - Print: ${escapeHtml(getComicPrintFormatLabel(packPrintSafety.format))} - ${escapeHtml(getComicReadingOrderLabel(comicLayout))} - ${escapeHtml(new Date().toLocaleDateString())}</div>
<section class="pack-section">
  <h2>Production Snapshot</h2>
  <div class="summary-grid">
    <div class="metric"><strong>${Math.round(Number(report.score) || 0)}</strong><span>Flow score</span></div>
    <div class="metric"><strong>${escapeHtml(report.metrics?.pages || packPages.length || 1)}</strong><span>Pages</span></div>
    <div class="metric"><strong>${escapeHtml(report.metrics?.pageTurns || 0)}</strong><span>Page turns</span></div>
    <div class="metric"><strong>${escapeHtml(report.metrics?.layoutFrames || 0)}</strong><span>Custom layouts</span></div>
    <div class="metric"><strong>${escapeHtml(report.metrics?.safeLetteringRisks || 0)}</strong><span>Safe-zone risks</span></div>
    <div class="metric"><strong>${escapeHtml(report.metrics?.gutterRisks || 0)}</strong><span>Gutter risks</span></div>
    <div class="metric"><strong>${escapeHtml(report.metrics?.panels || paragraphs.length)}</strong><span>Panels</span></div>
    <div class="metric"><strong>${escapeHtml(report.metrics?.directions || 0)}</strong><span>Directed</span></div>
    <div class="metric"><strong>${escapeHtml(report.metrics?.thumbnailRoughs || 0)}</strong><span>Roughed</span></div>
    <div class="metric"><strong>${escapeHtml(report.metrics?.images || 0)}</strong><span>With art</span></div>
    <div class="metric"><strong>${escapeHtml(report.metrics?.bubblePanels || 0)}</strong><span>With bubbles</span></div>
  </div>
  <p>${escapeHtml(report.summary || snapshot.summary || '')}</p>
</section>
<section class="pack-section">
  <h2>Page Composer</h2>
  ${pagePlanHtml || '<p>No page plan yet.</p>'}
</section>
<section class="pack-section">
  <h2>Print Safety</h2>
  <div class="fields">${printSafetyHtml}</div>
</section>
<section class="pack-section">
  <h2>Continuity Sheet</h2>
  <div class="fields">${continuityHtml}</div>
</section>
<section class="pack-section">
  <h2>Production Checks</h2>
  <div class="checks">${checksHtml}</div>
</section>
${globalHtml}
<section class="pack-section">
  <h2>Priority Notes</h2>
  <ul>${suggestionsHtml}</ul>
</section>
${panelsHtml}
<div class="footer">Created with StoryForge - AlloFlow</div>
</body></html>`;
    try {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
      else if (addToast) addToast(t('toasts.pop_up_blocked_allow_pop_3'), 'error');
      setHasExported(true);
      awardXP(15, 'Exported comic production pack');
      sfAnnounce('Comic production pack opened');
    } catch (e) {
      if (addToast) addToast(t('toasts.export_failed_2'), 'error');
    }
  };

  const exportSlideshow = () => {
    const title = escapeHtml(storyTitle || storyPrompt || sourceTopic || 'My Story');
    const author = escapeHtml(authorName || 'A Creative Student');
    let slidesHtml = '';

    setHasExported(true);

    // Title slide
    slidesHtml += `<div class="slide title-slide">
      ${coverArt ? `<img src="${escapeHtml(coverArt)}" class="cover-img" alt="Cover" />` : ''}
      <h1>${title}</h1>
      <p class="author">By ${author}</p>
    </div>`;

    // Content slides
    paragraphs.forEach((p, idx) => {
      const img = illustrations[p.id]?.imageUrl;
      const beatLabel = (PLOT_BEATS.find(b => b.value === p.plotBeat) || {}).label;
      const beatHtml = (beatLabel && p.plotBeat)
        ? `<div class="beat-label" aria-label="${escapeHtml(t("a11y.narrative_beat", { label: beatLabel }))}">${escapeHtml(beatLabel)}</div>`
        : '';
      slidesHtml += `<div class="slide">
        ${img ? `<img src="${escapeHtml(img)}" class="slide-img" alt="Scene ${idx + 1}" />` : ''}
        ${beatHtml}
        <div class="slide-text">${escapeHtml(p.text).replace(/\n/g, '<br/>')}</div>
        <div class="slide-num">${idx + 1} / ${paragraphs.length}</div>
      </div>`;
    });

    // Vocab slide
    slidesHtml += `<div class="slide vocab-slide"><h2>${escapeHtml(t("ui_common.vocabulary_used"))}</h2><div class="vocab-flex">`;
    vocabTerms.forEach(v => {
      const used = vocabUsage[v.term];
      slidesHtml += `<span class="v-chip ${used ? 'used' : ''}">${used ? '✓' : '✗'} ${escapeHtml(v.term)}</span>`;
    });
    slidesHtml += `</div></div>`;

    if (gradingResult) {
      slidesHtml += `<div class="slide feedback-slide">
        <h2>Feedback (AI-generated draft — not a final grade)</h2>
        <div class="score" title="AI-generated estimate, not a final grade">${escapeHtml(gradingResult.totalScore || '')}</div>
        <div class="fb-grid">
          <div class="fb-glow">✨ ${escapeHtml(gradingResult.feedback?.glow || '')}</div>
          <div class="fb-grow">🌱 ${escapeHtml(gradingResult.feedback?.grow || '')}</div>
        </div>
      </div>`;
    }

    const dirAttr = isRtl(langBcp47) ? 'rtl' : 'ltr';
    const html = `<!DOCTYPE html><html lang="${langBcp47}" dir="${dirAttr}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Slideshow</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f172a;color:white;overflow:hidden;height:100vh}
.slide{display:none;flex-direction:column;align-items:center;justify-content:center;height:100vh;padding:40px 60px;text-align:center;animation:fadeIn 0.5s}
.slide.active{display:flex}
@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.title-slide h1{font-size:3em;margin:16px 0 8px}
.title-slide .author{font-size:1.2em;color:#94a3b8;font-style:italic}
.cover-img{max-width:300px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.4)}
.slide-img{max-height:50vh;max-width:80%;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.3);margin-bottom:24px}
.slide-text{font-size:1.4em;line-height:1.8;max-width:700px;text-indent:2em;text-align:left}
.beat-label{display:inline-block;font-size:0.75em;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#fde68a;background:rgba(67,56,202,0.5);border:1px solid #a78bfa;padding:4px 14px;border-radius:999px;margin-bottom:12px}
.slide-num{position:absolute;bottom:20px;right:30px;color:#cbd5e1;font-size:0.8em}
.vocab-slide h2,.feedback-slide h2{font-size:2em;margin-bottom:24px;color:#fbbf24}
.vocab-flex{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.v-chip{padding:8px 20px;border-radius:30px;font-weight:bold;background:#334155;border:2px solid #475569}
.v-chip.used{background:#166534;border-color:#22c55e;color:#bbf7d0}
.score{font-size:3em;font-weight:900;color:#a78bfa;margin-bottom:20px}
.fb-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:700px}
.fb-glow{background:#14532d;padding:20px;border-radius:12px;text-align:left;font-size:1.1em;line-height:1.6}
.fb-grow{background:#713f12;padding:20px;border-radius:12px;text-align:left;font-size:1.1em;line-height:1.6}
.nav{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:12px;z-index:10}
.nav button{padding:10px 24px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:1em}
.nav .prev{background:#334155;color:white}
.nav .next{background:#e11d48;color:white}
.nav button:hover{outline:2px solid #fbbf24;outline-offset:2px}
.nav button:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}
</style></head><body>
${slidesHtml}
<div class="nav">
  <button type="button" class="prev" onclick="go(-1)">← Back</button>
  <button type="button" class="next" onclick="go(1)">Next →</button>
</div>
<script>
var slides=document.querySelectorAll('.slide'),idx=0;
function show(){slides.forEach(function(s,i){s.classList.toggle('active',i===idx);})}
function go(d){idx=Math.max(0,Math.min(slides.length-1,idx+d));show();}
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key===' ')go(1);if(e.key==='ArrowLeft')go(-1);});
show();
</script></body></html>`;

    try {
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
      else if (addToast) addToast(t('toasts.pop_up_blocked_allow_pop_4'), 'error');
    } catch (e) {
      if (addToast) addToast(t('toasts.slideshow_export_failed'), 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // SHARE TO TEACHER DASHBOARD
  // ═══════════════════════════════════════════════════════════

  const shareToSession = async () => {
    if (!liveSession || !liveSession.push) return;
    if (isCanvasEnv) {
      if (addToast) addToast(t('toasts.sharing_disabled_canvas_environment_ferpa'), 'error');
      return;
    }
    try {
      const title = storyTitle || storyPrompt || sourceTopic || 'My Story';
      const safePanelDialogue = sanitizePanelDialogue(panelDialogue);
      const safePanelDirections = sanitizePanelDirections(panelDirections);
      const safePanelThumbnails = sanitizePanelThumbnails(panelThumbnails);
      const safePanelLayouts = sanitizePanelLayouts(panelLayouts);
      const safePanelStickers = sanitizePanelStickers(panelStickers);
      await liveSession.push({
        type: 'storyforge',
        title,
        author: authorName || 'Student',
        genre: GENRE_TEMPLATES[genre]?.label || 'Creative Writing',
        layoutMode,
        comicPageLayout,
        comicPageComposer: sanitizeComicPageComposer(comicPageComposer),
        comicPrintSafety: sanitizeComicPrintSafety(comicPrintSafety),
        comicContinuity: sanitizeComicContinuity(comicContinuity),
        comicFlowScore: layoutMode === 'comic' ? (comicFlowReport?.score || null) : null,
        paragraphCount: paragraphs.length,
        wordCount: totalWords,
        vocabUsed: vocabUsedCount,
        vocabTotal: vocabTerms.length,
        coverArt: coverArt || null,
        preview: paragraphs[0]?.text?.substring(0, 200) || '',
        // Portfolio gallery data
        fullStory: paragraphs.map(p => ({
          text: p.text.substring(0, 500),
          illustration: illustrations[p.id]?.imageUrl || null,
          panelDialogue: safePanelDialogue[p.id] || null,
          panelDirection: safePanelDirections[p.id] || null,
          panelThumbnail: safePanelThumbnails[p.id] || null,
          panelLayout: safePanelLayouts[p.id] || null,
          panelSticker: safePanelStickers[p.id] || null,
        })),
        gradingScore: gradingResult?.totalScore || null,
        readingGrade: readingLevel?.grade || null,
        draftCount,
      });
      if (addToast) addToast(t('toasts.storybook_shared_class'), 'success');
      awardXP(10, 'Shared to class');
    } catch (err) {
      console.warn('Share failed:', err);
      if (addToast) addToast(t('toasts.failed_share_try_again'), 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // COLLABORATIVE JSON SAVE / LOAD ("Pass the Torch")
  // ═══════════════════════════════════════════════════════════

  const exportDraftJSON = async () => {
    // FERPA reminder: this draft is de-identified (codename, never a real name), but it still
    // carries the student's full writing, the AI feedback/grade, and progress analytics — so a
    // local download is a confirmed, informed action. (Network egress stays gated in shareToSession.)
    if (!(await requestExportConsent({ title: 'Export full draft?', message: 'This de-identified file uses the student codename, but it contains complete writing, AI feedback or grades, and progress analytics. Save it only to a school-approved location and follow district student-records policy.', confirmLabel: 'Export full draft' }))) return;
    const draft = {
      _storyForgeVersion: 2,
      // ── Story content ──
      storyTitle, codename: authorName, genre, language, vocabTerms, artStyle, customArtStyle,
      storyPrompt, rubricText, paragraphs, scaffoldsGenerated, draftCount, storyShape, valenceByPara,
      layoutMode, comicPageLayout,
      comicPageComposer: sanitizeComicPageComposer(comicPageComposer),
      comicPrintSafety: sanitizeComicPrintSafety(comicPrintSafety),
      comicContinuity: sanitizeComicContinuity(comicContinuity),
      comicFlowReport: layoutMode === 'comic' ? comicFlowReport : null,
      panelDialogue: sanitizePanelDialogue(panelDialogue),
      panelDirections: sanitizePanelDirections(panelDirections),
      panelThumbnails: sanitizePanelThumbnails(panelThumbnails),
      panelLayouts: sanitizePanelLayouts(panelLayouts),
      panelStickers: sanitizePanelStickers(panelStickers),
      illustrations: Object.fromEntries(
        Object.entries(illustrations).filter(([, v]) => v?.imageUrl).map(([k, v]) => [k, { imageUrl: v.imageUrl, prompt: v.prompt }])
      ),
      coverArt,
      // ── Progress & analytics data (for teacher review) ──
      gradingResult,
      analytics: {
        totalWords,
        vocabUsedCount,
        vocabTotal: vocabTerms.length,
        vocabUsage: Object.fromEntries(vocabTerms.map(v => [v.term, vocabUsage[v.term] || false])),
        readingLevel: readingLevel ? { grade: readingLevel.grade, sentences: readingLevel.sentences, words: readingLevel.words, avgWordsPerSentence: readingLevel.avgWordsPerSentence } : null,
        paragraphStats: paragraphStats.map((ps, i) => ({ paragraph: i + 1, ...ps })),
        wordFrequency: wordFrequency.slice(0, 10),
        overusedWords,
        sentenceVariety: sentenceVariety.map((sv, i) => ({ paragraph: i + 1, varied: sv.varied, issues: sv.issues })),
        characterIssues: characterIssues.length > 0 ? characterIssues : null,
        characters: characters.length > 0 ? characters : null,
      },
      // ── Achievement & XP data ──
      achievements: achievements.map(a => ({ id: a.id, name: a.name, earned: a.earned })),
      xp: { totalXP: xpData.totalXP, level: currentLevel.name, streak: xpData.streak },
      // ── Narration status ──
      narration: {
        aiNarratedCount: Object.values(audioSegments).filter(s => s?.aiAudioUrl).length,
        studentRecordedCount: Object.values(audioSegments).filter(s => s?.studentAudioUrl).length,
        narratorVoice,
      },
      // ── Grammar check results (if any) ──
      grammarResults: Object.keys(grammarResults).length > 1 ? grammarResults : null,
      // ── Export metadata ──
      exportedAt: new Date().toISOString(),
      exportedBy: authorName || 'Student',
    };
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(storyTitle || 'story').replace(/[^a-zA-Z0-9]/g, '_')}_draft.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (addToast) addToast(t('toasts.draft_exported_as_json_share'), 'success');
  };

  const importDraftJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.setAttribute('aria-label', 'Import Story Forge draft file');
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const d = JSON.parse(ev.target.result);
          if (!d._storyForgeVersion) { if (addToast) addToast(t('toasts.invalid_storyforge_file'), 'error'); return; }
          if (d.storyTitle) setStoryTitle(d.storyTitle);
          // authorName derived from codename prop — no need to restore
          if (d.genre) setGenre(d.genre);
          if (d.language) setLanguage(d.language);
          { const cv = sanitizeVocabTerms(d.vocabTerms); if (cv) setVocabTerms(cv); }
          if (typeof d.artStyle === 'string') setArtStyle(d.artStyle);
          if (typeof d.customArtStyle === 'string') setCustomArtStyle(d.customArtStyle);
          if (typeof d.storyPrompt === 'string') setStoryPrompt(d.storyPrompt);
          if (typeof d.rubricText === 'string') setRubricText(d.rubricText);
          if (d.layoutMode && LAYOUT_MODES[d.layoutMode]) setLayoutMode(d.layoutMode);
          if (d.comicPageLayout && COMIC_PAGE_LAYOUTS[d.comicPageLayout]) setComicPageLayout(d.comicPageLayout);
          setComicPageComposer(sanitizeComicPageComposer(d.comicPageComposer));
          setComicPrintSafety(sanitizeComicPrintSafety(d.comicPrintSafety));
          setComicContinuity(sanitizeComicContinuity(d.comicContinuity));
          if (d.comicFlowReport && typeof d.comicFlowReport === 'object') setComicFlowReport(d.comicFlowReport);
          setPanelDialogue(sanitizePanelDialogue(d.panelDialogue));
          setPanelDirections(sanitizePanelDirections(d.panelDirections));
          setPanelThumbnails(sanitizePanelThumbnails(d.panelThumbnails));
          setPanelLayouts(sanitizePanelLayouts(d.panelLayouts));
          setPanelStickers(sanitizePanelStickers(d.panelStickers));
          { const cp = sanitizeParagraphs(d.paragraphs); if (cp) setParagraphs(cp); }
          if (d.scaffoldsGenerated) setScaffoldsGenerated(true);
          if (typeof d.draftCount === 'number') setDraftCount(d.draftCount);
          if (d.illustrations) setIllustrations(sanitizeIllustrations(d.illustrations));
          if (d.coverArt) { const cov = safeImageUrl(d.coverArt); if (cov) setCoverArt(cov); }
          if (d.gradingResult) setGradingResult(d.gradingResult);
          if (d.grammarResults) setGrammarResults(d.grammarResults);
          if (d.characters) setCharacters(d.characters);
          if (d.storyShape) setStoryShape(d.storyShape);
          if (d.valenceByPara && typeof d.valenceByPara === 'object') setValenceByPara(d.valenceByPara);
          // If this is a v2 file with analytics, go to review phase so teacher can see progress
          if (d._storyForgeVersion >= 2 && d.analytics) {
            setPhase('review');
            if (addToast) addToast(`Student progress loaded from ${d.exportedBy || 'student'} — review their work!`, 'success');
          } else {
            setPhase('write');
            if (addToast) addToast(`Draft loaded from ${d.exportedBy || 'classmate'} — keep writing!`, 'success');
          }
        } catch (err) {
          if (addToast) addToast(t('toasts.could_read_file'), 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ═══════════════════════════════════════════════════════════
  // ACHIEVEMENT BADGES
  // ═══════════════════════════════════════════════════════════

  const achievements = useMemo(() => {
    const illustratedCount = Object.values(illustrations).filter(ill => ill?.imageUrl).length;
    const narratedCount = Object.values(audioSegments).filter(seg => seg?.aiAudioUrl || seg?.studentAudioUrl).length;
    const recordedCount = Object.values(audioSegments).filter(seg => seg?.studentAudioUrl).length;
    return [
      { id: 'first_words', name: 'First Words', icon: '✏️', desc: 'Write 50+ words', earned: totalWords >= 50 },
      { id: 'storyteller', name: 'Storyteller', icon: '📖', desc: 'Write 200+ words', earned: totalWords >= 200 },
      { id: 'novelist', name: 'Novelist', icon: '📚', desc: 'Write 500+ words', earned: totalWords >= 500 },
      { id: 'vocab_star', name: 'Vocab Star', icon: '⭐', desc: 'Use all vocabulary terms', earned: vocabTerms.length > 0 && vocabUsedCount === vocabTerms.length },
      { id: 'illustrator', name: 'Illustrator', icon: '🎨', desc: 'Generate an illustration', earned: illustratedCount > 0 },
      { id: 'gallery', name: 'Full Gallery', icon: '🖼️¼ï¸', desc: 'Illustrate every paragraph', earned: illustratedCount >= paragraphs.length && paragraphs.length > 0 },
      { id: 'narrator', name: 'Narrator', icon: '🎙️¸', desc: 'Narrate a paragraph', earned: narratedCount > 0 },
      { id: 'voice_actor', name: 'Voice Actor', icon: '🎤', desc: 'Record your own voice', earned: recordedCount > 0 },
      { id: 'reviser', name: 'Reviser', icon: '🔄', desc: 'Write multiple drafts', earned: draftCount >= 2 },
      { id: 'published', name: 'Published Author', icon: '🏆†', desc: 'Export your storybook', earned: hasExported },
    ];
  }, [totalWords, vocabUsedCount, vocabTerms.length, illustrations, audioSegments, paragraphs.length, draftCount, hasExported]);

  const earnedCount = useMemo(() => achievements.filter(a => a.earned).length, [achievements]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (!isOpen) return null;

  const phaseIcons = [Sparkles, Type, ImageIcon, Volume2, Star, Download];
  const renderComicPreviewPanel = (p, idx, previewLayout = comicPageLayout, pageIndex = idx, pageForPanel = null) => {
    const layoutFrame = panelLayouts[p.id] || {};
    const resizingPanel = panelResizeDrag?.pId === p.id;
    const mangaFlow = previewLayout === 'manga';
    const printSafety = sanitizeComicPrintSafety(comicPrintSafety);
    const gutterSide = pageForPanel ? getComicPageGutterSide(pageForPanel.page, previewLayout, printSafety) : '';
    return (
      <div key={p.id} className={`sf-comic-page-panel bg-white rounded-lg overflow-hidden shadow-md relative ${getComicPanelFramePreviewClass(layoutFrame.frame)} ${!normalizeComicPanelFrame(layoutFrame.frame) && previewLayout === 'splash' && pageIndex === 0 ? 'col-span-2' : ''}`} style={{ ...getComicPanelGridStyle(layoutFrame, previewLayout, pageIndex), border: '3px solid #1e293b', direction: 'ltr' }}>
        <div className={`absolute top-2 ${mangaFlow ? 'right-2' : 'left-2'} z-20 w-7 h-7 rounded-full bg-slate-950 text-white border-2 border-white shadow-md flex items-center justify-center text-xs font-black`}>
          {idx + 1}
        </div>
        {printSafety.showGuides && (
          <>
            {printSafety.includeBleed && printSafety.format !== 'digital' && (
              <div className="absolute inset-0 z-10 border-4 border-amber-300/30 pointer-events-none" aria-hidden="true" />
            )}
            <div className="absolute inset-3 z-10 rounded-md border border-dashed border-emerald-300/90 pointer-events-none" aria-hidden="true" />
            {gutterSide && (
              <div className={`absolute top-0 bottom-0 ${gutterSide === 'left' ? 'left-0' : 'right-0'} z-10 w-3 bg-rose-400/25 pointer-events-none`} aria-hidden="true" />
            )}
          </>
        )}
        {illustrations[p.id]?.imageUrl && (() => {
          const dialogue = panelDialogue[p.id] || {};
          const rough = panelThumbnails[p.id] || {};
          const space = normalizeComicLetteringSpace(rough.letteringSpace);
          const showPlacedSpeech = Boolean(dialogue.speech && space && space !== 'none');
          const customLetteringPosition = hasComicLetteringPosition(rough);
          const customLetteringWidth = hasComicLetteringWidth(rough);
          const bubbleDragMode = bubbleDrag?.pId === p.id ? bubbleDrag.mode : '';
          const resizeBehavior = getBubbleResizeBehavior(rough, space);
          const speechBubble = showPlacedSpeech ? (
            <div
              className={`sf-bubble-drag-target ${customLetteringPosition ? 'absolute' : 'relative'} max-w-[72%] break-words bg-white border-2 border-slate-900 rounded-2xl p-2 text-xs text-slate-800 leading-relaxed shadow-lg ${bubbleDragMode === 'move' ? 'ring-4 ring-fuchsia-300' : bubbleDragMode === 'resize' ? 'ring-4 ring-teal-300' : ''}`}
              style={{ ...(customLetteringPosition ? getComicLetteringPositionStyle(rough, space) : {}), ...getComicLetteringWidthStyle(rough) }}
              data-sf-bubble-width={customLetteringWidth ? clampComicLetteringWidth(rough.letteringWidth) : 'auto'}
            >
              {dialogue.speaker && <div className="text-[10px] font-bold text-blue-600 mb-0.5">{dialogue.speaker}:</div>}
              {dialogue.speech}
              <button
                type="button"
                onPointerDown={(e) => startBubbleDrag(e, p.id)}
                onPointerMove={updateBubbleDrag}
                onPointerUp={endBubbleDrag}
                onPointerCancel={endBubbleDrag}
                onKeyDown={(e) => handleBubbleControlKeyDown(e, p.id, 'move')}
                className={`sf-bubble-drag-handle sf-bubble-move-handle absolute ${resizeBehavior.resizeFromLeft ? '-bottom-3 -right-3' : '-bottom-3 -left-3'} pointer-events-auto w-7 h-7 flex items-center justify-center rounded-full border-2 border-slate-900 bg-white text-slate-900 shadow-md cursor-move touch-none`}
                title="Move bubble"
                aria-label={`Move speech bubble for panel ${idx + 1}. Use arrow keys for precise movement.`}
                data-sf-bubble-control="move"
                data-sf-focusable
              >
                <Move size={13} aria-hidden="true" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => startBubbleResize(e, p.id)}
                onPointerMove={updateBubbleResize}
                onPointerUp={endBubbleResize}
                onPointerCancel={endBubbleResize}
                onKeyDown={(e) => handleBubbleControlKeyDown(e, p.id, 'resize')}
                className={`sf-bubble-drag-handle sf-bubble-resize-handle absolute ${resizeBehavior.resizeFromLeft ? '-bottom-3 -left-3' : '-bottom-3 -right-3'} pointer-events-auto w-7 h-7 flex items-center justify-center rounded-full border-2 border-slate-900 bg-white text-slate-900 shadow-md cursor-ew-resize touch-none`}
                title="Resize bubble"
                aria-label={`Resize speech bubble for panel ${idx + 1}. Use left and right arrow keys for precise sizing.`}
                data-sf-bubble-control="resize"
                data-sf-focusable
              >
                <Maximize2 size={13} aria-hidden="true" />
              </button>
            </div>
          ) : null;
          return (
            <div className="relative" data-sf-comic-art-layer="true">
              <img src={illustrations[p.id].imageUrl} alt={`Panel ${idx + 1}`} className={`w-full object-cover ${isComicPanelWideFrame(layoutFrame, previewLayout, pageIndex) ? 'aspect-video' : 'aspect-square'}`} />
              {showPlacedSpeech && (
                customLetteringPosition ? (
                  <div className="absolute inset-2 z-10 pointer-events-none">{speechBubble}</div>
                ) : (
                  <div className={`absolute inset-2 z-10 flex pointer-events-none ${getComicLetteringPreviewFlexClass(space)}`}>{speechBubble}</div>
                )
              )}
              {space && !dialogue.speech && (
                <div className={`absolute inset-2 z-10 flex pointer-events-none ${getComicLetteringPreviewFlexClass(space)}`}>
                  <div className="border-2 border-dashed border-teal-300 bg-white/70 text-teal-700 rounded-xl px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                    Bubble space
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {panelStickers[p.id] && (
          <div className={`absolute ${mangaFlow ? 'top-11 right-2' : 'top-2 right-2'} text-3xl drop-shadow-lg select-none pointer-events-none`} style={{ transform: 'rotate(12deg)' }}>
            {panelStickers[p.id]}
          </div>
        )}
        {(panelDialogue[p.id] || {}).sfx && (
          <div className={`absolute ${mangaFlow ? 'top-3 left-3' : 'top-11 left-3'} font-black text-red-500 text-lg drop-shadow-lg select-none pointer-events-none`} style={{ transform: 'rotate(-8deg)', textShadow: '2px 2px 0 #fff, -1px -1px 0 #fff' }}>
            {panelDialogue[p.id].sfx}
          </div>
        )}
        <button
          type="button"
          onPointerDown={(e) => startPanelResizeDrag(e, p.id, idx, previewLayout, pageIndex)}
          onPointerMove={updatePanelResizeDrag}
          onPointerUp={endPanelResizeDrag}
          onPointerCancel={endPanelResizeDrag}
          className={`sf-resize-handle absolute bottom-2 right-2 z-30 w-8 h-8 rounded-lg border-2 border-slate-900 bg-white/95 text-slate-900 shadow-lg flex items-center justify-center text-base font-black cursor-nwse-resize touch-none transition-transform ${resizingPanel ? 'scale-110 ring-4 ring-fuchsia-300' : 'hover:scale-105'}`}
          title="Resize panel"
          aria-label={`Resize panel ${idx + 1}`}
          data-sf-focusable
        >
          <Maximize2 size={15} aria-hidden="true" />
        </button>
        <div className="p-2.5 relative space-y-1.5">
          {(p.text || p.scaffoldFrame || '').trim() && (
            <div className="bg-amber-50 border border-amber-200 rounded-md px-2 py-1 text-[11px] text-amber-800 italic leading-snug">
              {smartTruncate(p.text || p.scaffoldFrame, 200)}
            </div>
          )}
          {(panelDialogue[p.id] || {}).speech && (!illustrations[p.id]?.imageUrl || !normalizeComicLetteringSpace((panelThumbnails[p.id] || {}).letteringSpace) || normalizeComicLetteringSpace((panelThumbnails[p.id] || {}).letteringSpace) === 'none') && (
            <div className="relative">
              {(panelDialogue[p.id] || {}).speaker && (
                <div className="text-[11px] font-bold text-blue-600 mb-0.5">{panelDialogue[p.id].speaker}:</div>
              )}
              <div className="bg-white border-2 border-slate-800 rounded-2xl p-2 text-xs text-slate-800 leading-relaxed" style={{ borderRadius: '18px' }}>
                {panelDialogue[p.id].speech}
              </div>
              <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white border-b-2 border-r-2 border-slate-800" style={{ transform: 'rotate(45deg)' }} />
            </div>
          )}
          {(panelDialogue[p.id] || {}).thought && (
            <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-2 text-[11px] text-purple-700 italic leading-relaxed" style={{ borderRadius: '20px', borderStyle: 'dashed' }}>
              💭 {panelDialogue[p.id].thought}
            </div>
          )}
          <div className="flex items-center justify-between mt-1">
            <div className="flex gap-0.5">
              {['💥', '❤️', '⭐', '😂', '😱', '🔥', '💀', '🌟'].map(emoji => (
                <button type="button" key={emoji} onClick={() => setPanelStickers(prev => ({ ...prev, [p.id]: prev[p.id] === emoji ? null : emoji }))} className={`text-sm hover:scale-125 transition-transform ${panelStickers[p.id] === emoji ? 'scale-125' : 'opacity-50 hover:opacity-100'}`} title={`Add ${emoji} sticker`}>{emoji}</button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500 font-bold">Panel {idx + 1}</span>
          </div>
        </div>
      </div>
    );
  };

  // Canvas is theme-aware (2026-07-05, maintainer report "light mode = too much dark background"):
  // the header/stepper/footer chrome is already light, but the content canvas was hardcoded
  // bg-slate-900/95 — so light mode showed white bars sandwiching a near-black canvas, and the
  // phase headings (text-slate-800, directly on the canvas) were dark-on-dark. Light ('default')
  // now gets a soft slate-100 canvas; dark/contrast keep the dark canvas (host remap handles text).
  return (
    <div ref={modalRootRef} tabIndex={-1} className={`sf-modal-root theme-${hostTheme} fixed inset-0 z-[200] ${hostTheme === 'default' ? 'bg-slate-100/95' : 'bg-slate-900/95'} backdrop-blur-sm flex flex-col ${animClass}`} role="dialog" aria-modal="true" aria-label={t("a11y.story_forge_studio")}>
      <div className="allo-docsuite" style={{ display: 'contents' }}>
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />
      {/* Screen reader playback announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {playbackIdx >= 0 && paragraphs[playbackIdx] ? (
          `Now reading paragraph ${playbackIdx + 1}${audioSegments[paragraphs[playbackIdx].id]?.sentences?.[sentenceIdx] ? ': ' + audioSegments[paragraphs[playbackIdx].id].sentences[sentenceIdx] : ''}`
        ) : ''}
      </div>
      {/* WCAG 4.1.3 — top-level announcer for ephemeral status messages (sfAnnounce target) */}
      <div id="allo-live-storyforge" aria-live="polite" aria-atomic="true" className="sr-only" />
      {/* WCAG 2.3.3 — reduced-motion safety net: kills persistent animations within StoryForge under prefers-reduced-motion */}
      <style>{`
        .sf-modal-root button{min-width:24px;min-height:24px}
        @media (prefers-reduced-motion: reduce){ .sf-modal-root .animate-pulse,.sf-modal-root .animate-spin,.sf-modal-root .animate-bounce,.sf-modal-root .animate-in{animation:none!important}.sf-modal-root [class*="transition-"]{transition:none!important} }
        .sf-modal-root.theme-dark .sf-dialog-card{background:#1e293b!important;color:#e2e8f0!important;border:1px solid #475569}
        .sf-modal-root.theme-dark .sf-dialog-card h3,.sf-modal-root.theme-dark .sf-dialog-card p{color:#e2e8f0!important}
        .sf-modal-root.theme-dark .sf-comic-preview-shell{background:#0f172a!important;border-color:#475569!important}
        .sf-modal-root.theme-dark .sf-comic-tool-card{box-shadow:0 18px 40px rgba(2,6,23,.22)}
        .sf-modal-root.theme-dark .sf-comic-layout-row{background:#1e1b4b!important;border-color:#7e22ce!important}
        .sf-modal-root.theme-dark .sf-comic-layout-row select{background:#0f172a!important;color:#f8fafc!important;border-color:#a21caf!important}
        .sf-modal-root.theme-dark .sf-comic-layout-row .text-slate-800,.sf-modal-root.theme-dark .sf-comic-layout-row .text-slate-700,.sf-modal-root.theme-dark .sf-comic-layout-row .text-slate-600,.sf-modal-root.theme-dark .sf-comic-layout-row .text-slate-500{color:#e2e8f0!important}
        .sf-modal-root.theme-dark .sf-comic-page-row{background:#172554!important;border-color:#2563eb!important}
        .sf-modal-root.theme-dark .sf-comic-page-row select,.sf-modal-root.theme-dark .sf-comic-page-row input{background:#0f172a!important;color:#f8fafc!important;border-color:#2563eb!important}
        .sf-modal-root.theme-dark .sf-comic-page-row .text-slate-800,.sf-modal-root.theme-dark .sf-comic-page-row .text-slate-700,.sf-modal-root.theme-dark .sf-comic-page-row .text-slate-600,.sf-modal-root.theme-dark .sf-comic-page-row .text-slate-500{color:#e2e8f0!important}
        .sf-modal-root.theme-dark .sf-comic-toolbar{background:rgba(15,23,42,.72)!important;border:1px solid #7e22ce!important;border-radius:10px;padding:4px}
        .sf-modal-root.theme-dark .sf-comic-action{background:#0f172a!important;color:#f8fafc!important;border-color:#7e22ce!important}
        .sf-modal-root.theme-dark .sf-comic-status-pill{background:#0f172a!important;color:#f5d0fe!important;border-color:#7e22ce!important}
        .sf-modal-root.theme-dark .sf-comic-frame-choice{background:#0f172a!important;color:#f8fafc!important;border-color:#7e22ce!important}
        .sf-modal-root.theme-dark .sf-comic-frame-choice-active{background:#a21caf!important;color:#fff!important;border-color:#f0abfc!important}
        .sf-modal-root.theme-dark .sf-comic-page-panel{background:#f8fafc!important;color:#0f172a!important;border-color:#0f172a!important}
        .sf-modal-root.theme-dark .sf-comic-page-panel .bg-white,.sf-modal-root.theme-dark .sf-comic-page-panel [class~="bg-white/70"],.sf-modal-root.theme-dark .sf-comic-page-panel [class~="bg-white/95"]{background:#fff!important}
        .sf-modal-root.theme-dark .sf-comic-page-panel .bg-amber-50{background:#fffbeb!important}
        .sf-modal-root.theme-dark .sf-comic-page-panel .bg-purple-50{background:#faf5ff!important}
        .sf-modal-root.theme-dark .sf-comic-page-panel .text-slate-800,.sf-modal-root.theme-dark .sf-comic-page-panel .text-slate-700,.sf-modal-root.theme-dark .sf-comic-page-panel .text-slate-600,.sf-modal-root.theme-dark .sf-comic-page-panel .text-slate-500{color:#0f172a!important}
        .sf-modal-root.theme-dark .sf-comic-page-panel .text-amber-800{color:#92400e!important}
        .sf-modal-root.theme-dark .sf-comic-page-panel .text-purple-700{color:#7e22ce!important}
        .sf-modal-root.theme-dark .sf-comic-page-panel .text-blue-600{color:#2563eb!important}
        .sf-modal-root.theme-dark .sf-resize-handle{background:#f8fafc!important;color:#0f172a!important;border-color:#0f172a!important}
        .sf-modal-root.theme-dark .sf-bubble-drag-handle{background:#f8fafc!important;color:#0f172a!important;border-color:#0f172a!important}
        .sf-modal-root.theme-dark .sf-bubble-width-slider{accent-color:#d946ef}
        .sf-modal-root.theme-contrast .sf-dialog-card{background:#000!important;color:#ff0!important;border:2px solid #ff0!important}
        .sf-modal-root.theme-contrast .sf-comic-preview-shell,.sf-modal-root.theme-contrast .sf-comic-tool-card,.sf-modal-root.theme-contrast .sf-comic-layout-row,.sf-modal-root.theme-contrast .sf-comic-page-row{background:#000!important;color:#ff0!important;border-color:#ff0!important}
        .sf-modal-root.theme-contrast .sf-comic-layout-row select{background:#000!important;color:#ff0!important;border-color:#ff0!important}
        .sf-modal-root.theme-contrast .sf-comic-layout-row .text-slate-800,.sf-modal-root.theme-contrast .sf-comic-layout-row .text-slate-700,.sf-modal-root.theme-contrast .sf-comic-layout-row .text-slate-600,.sf-modal-root.theme-contrast .sf-comic-layout-row .text-slate-500{color:#ff0!important}
        .sf-modal-root.theme-contrast .sf-comic-toolbar{background:#000!important;border:2px solid #ff0!important;border-radius:10px;padding:4px}
        .sf-modal-root.theme-contrast .sf-comic-page-row select,.sf-modal-root.theme-contrast .sf-comic-page-row input{background:#000!important;color:#ff0!important;border-color:#ff0!important}
        .sf-modal-root.theme-contrast .sf-comic-action,.sf-modal-root.theme-contrast .sf-comic-frame-choice,.sf-modal-root.theme-contrast .sf-resize-handle,.sf-modal-root.theme-contrast .sf-bubble-drag-handle{background:#000!important;color:#0f0!important;border-color:#0f0!important;box-shadow:none!important}
        .sf-modal-root.theme-contrast .sf-comic-status-pill,.sf-modal-root.theme-contrast .sf-comic-frame-choice-active{background:#000!important;color:#ff0!important;border-color:#ff0!important}
        .sf-modal-root.theme-contrast .sf-bubble-width-slider{accent-color:#0f0}
      `}</style>

      {/* ── Restore Draft Prompt ── */}
      {showRestorePrompt && (
        <div ref={restorePromptDialogRef} tabIndex={-1} className="fixed inset-0 z-[210] bg-black/60 flex items-center justify-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200" role="dialog" aria-modal="true" aria-labelledby="sf-restore-title" aria-describedby="sf-restore-description">
          <div className="sf-dialog-card bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl text-center">
            <div className="text-3xl mb-3" aria-hidden="true">📖</div>
            <h3 id="sf-restore-title" className="text-lg font-black text-slate-800 mb-2">{t("ui_common.continue_where_left")}</h3>
            <p id="sf-restore-description" className="text-sm text-slate-600 mb-4">A saved draft was found. Would you like to restore it?</p>
            <div className="flex gap-3 justify-center">
              <button type="button" data-sf-focusable onClick={discardDraft} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors">{t("ui_common.start_fresh")}</button>
              <button type="button" data-sf-focusable onClick={restoreDraft} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors">{t("ui_common.restore_draft")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unsaved changes confirmation ── */}
      {showCloseConfirm && (
        <div ref={closeConfirmDialogRef} tabIndex={-1} className="fixed inset-0 z-[210] bg-black/60 flex items-center justify-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200" role="dialog" aria-modal="true" aria-labelledby="sf-close-confirm-title" aria-describedby="sf-close-confirm-description">
          <div className="sf-dialog-card bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl text-center">
            <div className="text-3xl mb-3">{'\u270F\uFE0F'}</div>
            <h3 id="sf-close-confirm-title" className="text-lg font-black text-slate-800 mb-2">{t("ui_common.unsaved_changes")}</h3>
            <p id="sf-close-confirm-description" className="text-sm text-slate-600 mb-4">Your story progress hasn't been exported or saved. Are you sure you want to close?</p>
            <div className="flex gap-3 justify-center">
              <button type="button" data-sf-focusable onClick={() => setShowCloseConfirm(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors">{t("ui_common.keep_working")}</button>
              <button type="button" data-sf-focusable onClick={() => { setShowCloseConfirm(false); try { localStorage.setItem(SAVE_KEY, JSON.stringify(createDraftSnapshot())); } catch(e) {} onClose(); }} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors">{t("ui_common.save_draft_close")}</button>
              <button type="button" data-sf-focusable onClick={() => { setShowCloseConfirm(false); try { localStorage.removeItem(SAVE_KEY); } catch(e) {} onClose(); }} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors">{t("ui_common.close_anyway")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible export consent */}
      {exportConsent && (
        <div role="presentation" className="fixed inset-0 z-[230] bg-black/70 flex items-center justify-center p-4">
          <div ref={exportConsentDialogRef} role="alertdialog" aria-modal="true" aria-labelledby="sf-export-consent-title" aria-describedby="sf-export-consent-message" tabIndex={-1} className="sf-dialog-card w-full max-w-lg rounded-2xl border-2 border-cyan-300 bg-white p-6 shadow-2xl">
            <h3 id="sf-export-consent-title" className="text-lg font-black text-slate-900">{exportConsent.title}</h3>
            <p id="sf-export-consent-message" className="mt-2 text-sm leading-relaxed text-slate-700">{exportConsent.message}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" data-sf-focusable onClick={() => finishExportConsent(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" data-sf-focusable onClick={() => finishExportConsent(true)} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800">{exportConsent.confirmLabel || 'Export file'}</button>
            </div>
          </div>
        </div>
      )}
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-4 text-white flex justify-between items-center shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen size={24} />
          <div>
            <h2 className="text-xl font-black">{t("headings.story_forge")}</h2>
            <p className="text-rose-200 text-xs font-medium">{t("ui_common.creative_writing_studio")}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* XP / Level badge */}
          <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2" title={`${xpData.totalXP} XP · ${currentLevel.name}${xpData.streak > 1 ? ` · ${xpData.streak}-day streak` : ''}`}>
            <span>{currentLevel.emoji} {currentLevel.name}</span>
            <span className="text-rose-200">{xpData.totalXP} XP</span>
            {xpData.streak > 1 && <span className="text-amber-700">🔥{xpData.streak}</span>}
            {nextLevel && (
              <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-amber-300 rounded-full transition-all" style={{ width: `${Math.min(100, ((xpData.totalXP - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)}%` }} />
              </div>
            )}
          </div>
          {totalWords > 0 && (
            <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
              <span>{totalWords} words</span>
              <span>·</span>
              <span>{vocabUsedCount}/{vocabTerms.length} terms</span>
              {readingLevel && <><span>·</span><span>Grade {readingLevel.grade}</span></>}
            </div>
          )}
          <button type="button"
            data-sf-focusable
            onClick={() => { if (typeof window.AlloToggleTheme === 'function') window.AlloToggleTheme(); }}
            className="hover:bg-white/20 p-2 rounded-full transition-colors flex items-center gap-1"
            aria-label={t("a11y.toggle_theme")}
            title={(() => { try { return document.querySelector('.theme-contrast') ? 'High Contrast' : document.querySelector('.theme-dark') ? 'Dark Mode' : 'Light Mode'; } catch(e) { return 'Toggle theme'; } })()}
          >
            <span className="text-sm">{(() => { try { return document.querySelector('.theme-contrast') ? '\uD83D\uDC41' : document.querySelector('.theme-dark') ? '\uD83C\uDF19' : '\u2600\uFE0F'; } catch(e) { return '\u2600\uFE0F'; } })()}</span>
          </button>
          <button type="button" data-sf-focusable onClick={safeClose} className="hover:bg-white/20 p-2 rounded-full transition-colors" aria-label={t("a11y.close_story_forge")}>
            <X size={24} />
          </button>
        </div>
      </div>

      {/* ── Stepper ── */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-center gap-1 shrink-0 overflow-x-auto" role="navigation" aria-label={t("a11y.story_creation_phases")}>
        {PHASES.map((p, i) => {
          const Icon = phaseIcons[i];
          const isCurrent = i === phaseIdx;
          const isDone = i < phaseIdx;
          return (
            <React.Fragment key={p}>
              {i > 0 && <div className={`w-8 h-0.5 ${isDone ? 'bg-rose-400' : 'bg-slate-200'}`} aria-hidden="true" />}
              <button type="button"
                data-sf-focusable
                onClick={() => { if (isDone || isCurrent) changePhase(p); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isCurrent ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' :
                  isDone ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' :
                  'bg-slate-100 text-slate-600'
                }`}
                disabled={!isDone && !isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${PHASE_LABELS[i]}${isDone ? ' (completed)' : isCurrent ? ' (current step)' : ''}`}
              >
                <Icon size={14} aria-hidden="true" />
                <span className="hidden sm:inline">{PHASE_LABELS[i]}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* ── Phase Content ── */}
      <div className="flex-grow overflow-y-auto" ref={phaseContentRef} tabIndex={-1} role="region" aria-label={`${PHASE_LABELS[phaseIdx]} phase`}>
        <div className="max-w-4xl mx-auto p-6">

          {/* ═══ CONFIGURE PHASE ═══ */}
          {phase === 'configure' && (
            <div className={`space-y-6 ${animClass}`}>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-slate-800">{t("ui_common.set_up_story")}</h3>
                <p className="text-slate-600 text-sm mt-1">Name your story, choose a genre, and set your vocabulary ingredients</p>
                <div className="flex gap-2 justify-center mt-2 flex-wrap">
                  <button type="button" onClick={importDraftJSON} className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-[11px] font-bold hover:bg-cyan-200 transition-colors inline-flex items-center gap-1">
                    <Plus size={10} /> Import classmate's draft
                  </button>
                  {onSaveConfig && (
                    <button type="button" onClick={saveAsConfig} disabled={vocabTerms.length === 0} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[11px] font-bold hover:bg-indigo-200 transition-colors inline-flex items-center gap-1 disabled:opacity-40">
                      <Download size={10} /> Save as Assignment
                    </button>
                  )}
                </div>
              </div>

              {/* ── Import from Lesson Resources ── */}
              {lessonResources && lessonResources.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border-2 border-indigo-200 rounded-2xl p-4">
                  <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <BookOpen size={12} /> Import from Lesson Resources
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {lessonResources.filter(r => ['glossary', 'simplified', 'sentence-frames', 'lesson-plan', 'timeline'].includes(r.type)).map((r, ri) => (
                      <button type="button"
                        key={ri}
                        onClick={() => importFromResource(r)}
                        className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                      >
                        {r.type === 'glossary' ? '📖' : r.type === 'simplified' ? '📄' : r.type === 'sentence-frames' ? '✏️' : r.type === 'lesson-plan' ? '📋' : '📅'}
                        {r.title || r.type}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-indigo-400 mt-1.5">Click to auto-fill vocabulary, prompts, or scaffolds from your lesson</p>
                </div>
              )}

              {/* Title & Author */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="sf-title" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{t("ui_common.story_title_label")}</label>
                    <input
                      id="sf-title"
                      type="text" value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)}
                      placeholder={t("placeholders.story_title")}
                      className="w-full text-sm p-2.5 border border-slate-400 rounded-lg focus:ring-2 focus:ring-rose-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{t("labels.pen_name")}</label>
                    <div className="w-full text-sm p-2.5 border border-slate-400 rounded-lg bg-slate-50 font-bold text-slate-700 flex items-center gap-2">
                      <span className="text-base">✍️</span> {authorName}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Your codename is your pen name — it keeps your identity private</p>
                  </div>
                </div>
              </div>

              {/* Genre Picker */}
              <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BookOpen size={16} /> Genre
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(GENRE_TEMPLATES).map(([key, g]) => (
                    <button type="button"
                      key={key}
                      onClick={() => setGenre(key)}
                      className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                        genre === key ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' : 'border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {g.emoji}<br/>{g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format Picker */}
              <div className="bg-white rounded-2xl border-2 border-blue-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Type size={16} /> Format
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(LAYOUT_MODES).map(([key, m]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLayoutMode(key)}
                      aria-pressed={layoutMode === key}
                      aria-label={m.desc}
                      title={m.desc}
                      className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                        layoutMode === key ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      {m.emoji}<br/>{m.label}
                    </button>
                  ))}
                </div>
                {layoutMode === 'comic' && (
                  <div className="mt-4 pt-4 border-t border-blue-100">
                    <div className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-2">Comic Page Layout</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(COMIC_PAGE_LAYOUTS).map(([key, item]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setComicPageLayout(key)}
                          aria-pressed={comicPageLayout === key}
                          title={item.desc}
                          className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                            comicPageLayout === key ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' : 'border-slate-200 text-slate-600 hover:border-blue-300'
                          }`}
                        >
                          <div className="text-xs font-black">{item.label}</div>
                          <div className="text-[10px] leading-snug opacity-75 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Story Shape Picker — Vonnegut-style emotional shapes (optional craft lens) */}
              <div className="bg-white rounded-2xl border-2 border-violet-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-violet-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Sparkles size={16} /> Story Shape <span className="text-[10px] font-medium text-slate-500 normal-case tracking-normal">(optional — the emotional ups &amp; downs)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">Pick the shape of your character's fortune over time — a lens to play with. Great stories bend the rules!</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(STORY_SHAPES).map(([key, sh]) => {
                    const active = storyShape === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        data-sf-focusable
                        onClick={() => setStoryShape(active ? '' : key)}
                        aria-pressed={active}
                        aria-label={`Story shape: ${sh.label}. ${sh.desc}`}
                        className={`p-2.5 rounded-xl border-2 text-left transition-all ${active ? 'border-violet-500 bg-violet-50 shadow-md' : 'border-slate-200 hover:border-violet-300'}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`text-xs font-bold ${active ? 'text-violet-700' : 'text-slate-600'}`}>{sh.emoji} {sh.label}</span>
                          <svg viewBox="0 0 48 18" width="48" height="18" aria-hidden="true" className="shrink-0">
                            <polyline fill="none" stroke={active ? '#7c3aed' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              points={sh.curve.map((v, i) => `${(i / (sh.curve.length - 1)) * 46 + 1},${(1 - v) * 14 + 2}`).join(' ')} />
                          </svg>
                        </div>
                        <div className="text-[10px] text-slate-500 leading-snug">{sh.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vocab Terms */}
              <div className="bg-white rounded-2xl border-2 border-rose-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BookOpen size={16} /> Story Ingredients ({vocabTerms.length} terms)
                </h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {vocabTerms.map((v, i) => (
                    <div key={i} className="bg-rose-50 border border-rose-200 rounded-full px-3 py-1 text-sm font-bold text-rose-800 flex items-center gap-2 group">
                      <span>{v.term}</span>
                      <button type="button" onClick={() => removeVocabTerm(i)} className="text-rose-700 hover:text-rose-600 opacity-60 group-hover:opacity-100 focus:opacity-100 transition-opacity" aria-label={`Remove ${v.term}`}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {vocabTerms.length === 0 && (
                    <p className="text-slate-500 text-sm italic">No vocabulary terms yet — add some below or they'll come from your glossary</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text" value={newTerm} onChange={(e) => setNewTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addVocabTerm()}
                    placeholder={t("placeholders.add_a_term")}
                    aria-label={t("a11y.vocabulary_term")}
                    className="flex-1 text-sm p-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-rose-300"
                  />
                  <input
                    type="text" value={newDef} onChange={(e) => setNewDef(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addVocabTerm()}
                    placeholder={t("placeholders.definition_optional")}
                    aria-label={t("a11y.term_definition")}
                    className="flex-1 text-sm p-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-rose-300"
                  />
                  <button type="button" onClick={addVocabTerm} disabled={!newTerm.trim()} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center gap-1">
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <button type="button"
                onClick={() => setShowAdvancedConfig(prev => !prev)}
                className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                aria-expanded={showAdvancedConfig}
              >
                <span className="flex items-center gap-2"><Palette size={16} /> Advanced Settings</span>
                <span className={`transition-transform ${showAdvancedConfig ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {showAdvancedConfig && (
              <div className="space-y-6">

              {/* Art Style */}
              <div className="bg-white rounded-2xl border-2 border-purple-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Palette size={16} /> Art Style
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.keys(ART_STYLE_MAP).map(style => (
                    <button type="button"
                      key={style}
                      onClick={() => setArtStyle(style)}
                      className={`p-3 rounded-xl border-2 text-center text-xs font-bold capitalize transition-all ${
                        artStyle === style ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md' : 'border-slate-200 text-slate-600 hover:border-purple-300'
                      }`}
                    >
                      {style === 'storybook' ? '📚' : style === 'pixel' ? '👾' : style === 'cinematic' ? '🎬' : style === 'anime' ? '✨' : '🖍️ï¸'}<br/>{style}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => setArtStyle('custom')}
                    className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                      artStyle === 'custom' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md' : 'border-slate-200 text-slate-600 hover:border-purple-300'
                    }`}
                  >
                    🎨<br/>Custom
                  </button>
                </div>
                {artStyle === 'custom' && (
                  <input
                    type="text" value={customArtStyle} onChange={(e) => setCustomArtStyle(e.target.value)}
                    placeholder={t("placeholders.custom_art_style")}
                    aria-label={t("a11y.custom_art_style")}
                    className="mt-3 w-full text-sm p-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-purple-300"
                  />
                )}
              </div>

              {/* Language */}
              <div className="bg-white rounded-2xl border-2 border-teal-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Type size={16} /> Writing Language
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {LANG_OPTIONS.map(l => (
                    <button type="button"
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={`p-2.5 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                        language === l.code ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md' : 'border-slate-200 text-slate-600 hover:border-teal-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
                {language === 'other' && (
                  <input
                    type="text" value={customLanguage} onChange={(e) => setCustomLanguage(e.target.value)}
                    placeholder={t("placeholders.type_your_language")}
                    aria-label={t("a11y.custom_writing_language")}
                    className="mt-3 w-full text-sm p-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-teal-300"
                  />
                )}
                {language !== 'en' && <p className="mt-2 text-[11px] text-teal-500 font-medium">AI scaffolds, coaching, grading, and dictation will use {langLabel}</p>}
              </div>

              {/* Story Prompt */}
              <div className="bg-white rounded-2xl border-2 border-amber-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles size={16} /> Story Prompt (Optional)
                </h4>
                <textarea
                  value={storyPrompt} onChange={(e) => setStoryPrompt(e.target.value)}
                  placeholder="Give your students a theme or starting scenario... e.g., 'Write about a scientist who discovers something unexpected'"
                  aria-label={t("a11y.story_prompt")}
                  className="w-full text-sm p-3 border border-slate-400 rounded-lg focus:ring-2 focus:ring-amber-300 resize-none h-20"
                />

                {/* Story Starters */}
                {genre !== 'free' && STORY_STARTERS[genre] && (
                  <div className="mt-3 pt-3 border-t border-amber-100">
                    <div className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-2">💡 {GENRE_TEMPLATES[genre]?.label} Story Starters — click to use</div>
                    <div className="space-y-2">
                      {STORY_STARTERS[genre].map((starter, si) => (
                        <button type="button"
                          key={si}
                          onClick={() => setStoryPrompt(starter)}
                          className={`w-full text-left text-xs p-2.5 rounded-lg border transition-all ${
                            storyPrompt === starter ? 'bg-amber-100 border-amber-400 text-amber-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'
                          }`}
                        >
                          "{starter}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Rubric */}
              <div className="bg-white rounded-2xl border-2 border-emerald-100 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Star size={16} /> Custom Rubric (Optional)
                </h4>
                <p className="text-xs text-slate-600 mb-2">Paste a custom grading rubric. If empty, the default 4-criteria rubric is used.</p>
                <textarea
                  id="sf-rubric"
                  value={rubricText} onChange={(e) => setRubricText(e.target.value)}
                  placeholder={"| Criteria | 1 - Beginning | 3 - Developing | 5 - Exemplary |\n|----------|---------------|----------------|---------------|\n| Vocabulary | Few terms used | Some terms used | All terms used correctly |"}
                  className="w-full text-xs p-3 border border-slate-400 rounded-lg focus:ring-2 focus:ring-emerald-300 resize-none h-24 font-mono"
                  aria-label={t("a11y.custom_grading_rubric")}
                />
              </div>

              </div>
              )}

            </div>
          )}

          {/* ═══ WRITE PHASE ═══ */}
          {phase === 'write' && (
            <div className={`space-y-4 ${animClass}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{t("ui_common.write_your_story")}</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Use your vocabulary ingredients in each paragraph
                    {revisionSnapshot && <span className="text-indigo-500 ml-2">Draft #{draftCount} — revising!</span>}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {/* Writing timer */}
                  {timerActive ? (
                    <div className="flex items-center gap-2 bg-rose-100 border border-rose-300 rounded-full px-3 py-1">
                      <span className={`text-xs font-black tabular-nums ${timerDuration - timerSeconds <= 30 ? 'text-red-600 animate-pulse motion-reduce:animate-none' : 'text-rose-700'}`}>{formatTime(timerSeconds)}</span>
                      <button type="button" onClick={() => { setTimerActive(false); clearTimeout(timerRef.current); }} className="text-[11px] font-bold text-rose-500 hover:text-rose-700">{t("ui_common.stop")}</button>
                    </div>
                  ) : (
                    <div className="flex bg-slate-100 rounded-full p-0.5">
                      {[3, 5, 10].map(min => (
                        <button type="button" key={min} onClick={() => startTimer(min)} className="px-2 py-1 rounded-full text-[11px] font-bold text-slate-600 hover:text-rose-600 hover:bg-white transition-all" title={`${min}-minute writing sprint`}>
                          {min}m
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Layout toggle */}
                  <div className="flex bg-slate-100 rounded-full p-0.5">
                    {Object.entries(LAYOUT_MODES).map(([key, m]) => (
                      <button type="button"
                        key={key}
                        onClick={() => setLayoutMode(key)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                          layoutMode === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-700'
                        }`}
                        aria-label={m.desc}
                        title={m.desc}
                      >
                        {m.emoji} {m.label}
                      </button>
                    ))}
                  </div>
                  {layoutMode === 'comic' && onCallGemini && (
                    <button type="button"
                      onClick={() => draftComicBubbles()}
                      disabled={isProcessing || !paragraphs.some(p => (p.text || p.scaffoldFrame || '').trim().length > 0)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-xs font-bold hover:bg-blue-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                      title="Draft speech, thought, and SFX bubbles from the panel captions"
                    >
                      <Sparkles size={14} /> Draft Bubbles
                    </button>
                  )}
                  {layoutMode === 'comic' && onCallGemini && (
                    <button type="button"
                      onClick={() => draftComicCameraPass()}
                      disabled={isProcessing || !paragraphs.some(p => (p.text || p.scaffoldFrame || '').trim().length > 0)}
                      className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold hover:bg-cyan-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                      title="Plan shot, angle, mood, and pacing moves across the comic"
                    >
                      <Sparkles size={14} /> Camera Pass
                    </button>
                  )}
                  {layoutMode === 'comic' && onCallGemini && (
                    <button type="button"
                      onClick={() => draftComicThumbnailPass()}
                      disabled={isProcessing || !paragraphs.some(p => (p.text || p.scaffoldFrame || '').trim().length > 0)}
                      className="px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-xs font-bold hover:bg-teal-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                      title="Draft thumbnail roughs with focal point, composition, and lettering space"
                    >
                      <Sparkles size={14} /> Thumbnail Pass
                    </button>
                  )}
                  {layoutMode === 'comic' && onCallGemini && (
                    <button type="button"
                      onClick={() => tightenComicBubbles()}
                      disabled={isProcessing || !paragraphs.some(p => getComicLetteringStats(panelDialogue[p.id] || {}).words > COMIC_BUBBLE_WORD_WARNING)}
                      className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-xs font-bold hover:bg-amber-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                      title="Tighten crowded comic bubbles without changing the panel beat"
                    >
                      <Sparkles size={14} /> Tighten Bubbles
                    </button>
                  )}
                  <button type="button"
                    onClick={generateScaffolds}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-rose-100 text-rose-700 rounded-full text-xs font-bold hover:bg-rose-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles size={14} /> {layoutMode === 'comic'
                      ? (scaffoldsGenerated ? 'Regenerate Panel Plan' : 'Generate Panel Plan')
                      : (scaffoldsGenerated ? 'Regenerate Scaffolds' : 'Generate Scaffolds')}
                  </button>
                  {/* Focus Mode Toggle — write one paragraph at a time */}
                  <button type="button"
                    onClick={() => { setFocusMode(!focusMode); setFocusParagraphIdx(0); }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2 ${
                      focusMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
                    }`}
                    title={focusMode ? 'Show all paragraphs at once' : 'Focus on one paragraph at a time — less overwhelming!'}
                  >
                    <Target size={14} /> {focusMode ? 'Focus ON' : 'Focus Mode'}
                  </button>
                  {totalWords >= 30 && (
                    <button type="button"
                      onClick={checkGrammarAndStyle}
                      disabled={grammarLoading || isProcessing}
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold hover:bg-emerald-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> {grammarLoading ? 'Checking...' : 'Check Writing'}
                    </button>
                  )}
                </div>
              </div>

              {/* Grammar overall tip */}
              {grammarResults._overallTip && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2">
                  <Sparkles size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">{t("ui_common.writing_coach_tip")}</div>
                    <p className="text-xs text-emerald-800 mt-0.5">{grammarResults._overallTip}</p>
                  </div>
                  <button type="button" onClick={() => setGrammarResults({})} className="text-emerald-700 hover:text-emerald-600 ml-auto shrink-0"><X size={14} /></button>
                </div>
              )}

              {/* Vocab Ingredients Bar — STICKY so it's always visible while writing */}
              <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-3 sticky top-0 z-30 shadow-sm" style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,241,242,0.92)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Story Ingredients — click to copy</div>
                  <div className="text-[11px] font-bold text-rose-700">
                    {vocabTerms.filter(v => vocabUsage[v.term]).length}/{vocabTerms.length} used
                  </div>
                </div>
                {/* Progress bar showing vocab completion */}
                <div className="w-full h-1.5 bg-rose-100 rounded-full mb-2 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: vocabTerms.length > 0 ? Math.round((vocabTerms.filter(v => vocabUsage[v.term]).length / vocabTerms.length) * 100) + '%' : '0%',
                    background: vocabTerms.filter(v => vocabUsage[v.term]).length === vocabTerms.length ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #f43f5e, #e11d48)'
                  }} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {vocabTerms.map((v, i) => {
                    const used = vocabUsage[v.term];
                    return (
                      <div key={i} className="relative group">
                        <button
                          type="button"
                          data-sf-focusable
                          aria-describedby={`sf-vocab-tip-${i}`}
                          aria-label={`${v.term}${used ? ' — used' : ' — not yet used'}. ${t("a11y.copy_vocab_term") || 'Copy term to paste into your story'}`}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border-2 transition-all cursor-pointer select-none ${
                            used ? 'bg-green-100 border-green-400 text-green-800 shadow-sm' : 'bg-white border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-400'
                          }`}
                          onClick={async () => {
                            if (!navigator.clipboard?.writeText) { if (addToast) addToast(`Copy "${v.term}" manually — clipboard unavailable`, 'error'); return; }
                            try { const ok = window.alloCopyText ? await window.alloCopyText(v.term) : false; if (!ok) throw new Error('copy unavailable'); if (addToast) addToast(`"${v.term}" copied — paste into your story!`, 'success'); }
                            catch (err) { console.warn('Clipboard write failed:', err); if (addToast) addToast(`Couldn't copy — please copy "${v.term}" manually`, 'error'); }
                          }}
                        >
                          {used ? <CheckCircle2 size={11} className="inline mr-1" /> : <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-rose-300 mr-1.5" />}
                          {v.term}
                        </button>
                        {/* Word-bank definition — revealed on hover AND keyboard focus */}
                        <div id={`sf-vocab-tip-${i}`} role="tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 text-white rounded-xl p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all z-50 pointer-events-none">
                          <div className="text-xs font-bold text-amber-300 mb-1">{v.term}</div>
                          {v.definition && <div className="text-[11px] text-slate-200 leading-relaxed mb-1">{v.definition}</div>}
                          <div className="text-[11px] text-slate-300 italic">Click to copy · Paste into your paragraph</div>
                          <div aria-hidden="true" className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-800" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {layoutMode === 'comic' && (
                <div className="sf-comic-tool-card bg-white border-2 border-blue-100 rounded-2xl p-4 shadow-sm">
                  {(() => {
                    const panelSummaries = paragraphs.map((p, idx) => {
                      const direction = panelDirections[p.id] || {};
                      const dialogue = panelDialogue[p.id] || {};
                      const rough = panelThumbnails[p.id] || {};
                      const lettering = getComicLetteringStats(dialogue);
                      const hasCaption = Boolean((p.text || p.scaffoldFrame || '').trim());
                      const hasDirection = Boolean(direction.shot && direction.angle && direction.mood && direction.transition);
                      const hasRough = Boolean(rough.focalPoint && rough.composition && rough.letteringSpace);
                      const hasBubble = Boolean(dialogue.speech || dialogue.thought || dialogue.sfx);
                      const hasImage = Boolean(illustrations[p.id]?.imageUrl);
                      const ready = hasCaption && hasDirection && hasRough && lettering.level !== 'crowded';
                      return { p, idx, direction, lettering, hasCaption, hasDirection, hasRough, hasBubble, hasImage, ready };
                    });
                    const readyCount = panelSummaries.filter(s => s.ready).length;
                    return (
                      <>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <div className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Storyboard Board</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Panel pacing, camera, bubbles, and readiness at a glance</div>
                          </div>
                          <div className="text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                            {readyCount}/{paragraphs.length} production-ready
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          {panelSummaries.map(({ p, idx, direction, lettering, hasCaption, hasDirection, hasRough, hasBubble, hasImage, ready }) => {
                            const status = !hasCaption ? 'Needs caption' : lettering.level === 'crowded' ? 'Crowded' : !hasDirection ? 'Needs direction' : !hasRough ? 'Needs rough' : ready ? 'Ready' : 'Draft';
                            const statusClass = ready ? 'bg-green-100 text-green-700 border-green-200' : lettering.level === 'crowded' ? 'bg-red-100 text-red-700 border-red-200' : hasCaption ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200';
                            const jumpToPanel = () => {
                              setFocusParagraphIdx(idx);
                              setTimeout(() => {
                                const el = document.getElementById('sf-para-' + p.id);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 0);
                            };
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={jumpToPanel}
                                className={`text-left rounded-xl border-2 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/50 ${focusMode && focusParagraphIdx === idx ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50/50'}`}
                                aria-label={`Jump to comic panel ${idx + 1}`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="text-xs font-black text-slate-800">Panel {idx + 1}</span>
                                  <span className={`text-[10px] font-black rounded-full border px-2 py-0.5 ${statusClass}`}>{status}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[10px] font-bold text-slate-600">
                                  <span className="truncate">Move: {getComicDirectionLabel('transition', direction.transition) || 'Unset'}</span>
                                  <span className="truncate">Shot: {getComicDirectionLabel('shot', direction.shot) || 'Unset'}</span>
                                  <span className="truncate">Mood: {getComicDirectionLabel('mood', direction.mood) || 'Unset'}</span>
                                  <span className={lettering.level === 'crowded' ? 'text-red-600' : lettering.level === 'watch' ? 'text-amber-600' : 'text-green-600'}>Words: {lettering.words}/{lettering.limit}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {[
                                    ['Caption', hasCaption],
                                    ['Direction', hasDirection],
                                    ['Rough', hasRough],
                                    ['Bubble', hasBubble],
                                    ['Art', hasImage],
                                  ].map(([label, ok]) => (
                                    <span key={label} className={`text-[9px] font-black rounded-full px-1.5 py-0.5 ${ok ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>{label}</span>
                                  ))}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Focus Mode Navigation Bar */}
              {focusMode && (
                <div className="flex items-center justify-between bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3">
                  <button type="button"
                    onClick={() => setFocusParagraphIdx(Math.max(0, focusParagraphIdx - 1))}
                    disabled={focusParagraphIdx === 0}
                    className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-30 transition-colors flex items-center gap-1"
                  >
                    ← Previous
                  </button>
                  <div className="text-center">
                    <div className="text-xs font-bold text-indigo-700">Paragraph {focusParagraphIdx + 1} of {paragraphs.length}</div>
                    <div className="text-[11px] text-indigo-400 mt-0.5">
                      {paragraphs[focusParagraphIdx]?.scaffoldFrame ? paragraphs[focusParagraphIdx].scaffoldFrame.substring(0, 60) + (paragraphs[focusParagraphIdx].scaffoldFrame.length > 60 ? '...' : '') : 'Free write'}
                    </div>
                    {/* Mini progress dots */}
                    <div className="flex justify-center gap-1 mt-1.5">
                      {paragraphs.map((pp, pi) => (
                        <button type="button"
                          key={pi}
                          onClick={() => setFocusParagraphIdx(pi)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            pi === focusParagraphIdx ? 'bg-indigo-600 scale-125' : pp.text.trim().length > 10 ? 'bg-green-400' : 'bg-slate-300'
                          }`}
                          title={`Jump to paragraph ${pi + 1}${pp.text.trim().length > 10 ? ' (written)' : ' (empty)'}`}
                          aria-label={`Jump to paragraph ${pi + 1}${pp.text.trim().length > 10 ? ' (written)' : ' (empty)'}`}
                          aria-current={pi === focusParagraphIdx ? 'true' : undefined}
                        />
                      ))}
                    </div>
                  </div>
                  <button type="button"
                    onClick={() => {
                      if (focusParagraphIdx >= paragraphs.length - 1) {
                        // Add new paragraph if at end
                        if (paragraphs.length < maxParagraphs) { addParagraph(); setFocusParagraphIdx(paragraphs.length); }
                      } else {
                        setFocusParagraphIdx(focusParagraphIdx + 1);
                      }
                    }}
                    className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                  >
                    {focusParagraphIdx >= paragraphs.length - 1 ? '+ New ¶' : 'Next →'}
                  </button>
                </div>
              )}

              {/* Paragraph Cards */}
              {paragraphs.map((p, idx) => (
                focusMode && idx !== focusParagraphIdx ? null :
                <React.Fragment key={p.id}>
                <div id={'sf-para-' + p.id} className={`rounded-2xl border-2 shadow-sm overflow-hidden transition-colors ${
                  focusMode ? 'border-indigo-300 shadow-lg ring-2 ring-indigo-100' :
                  layoutMode === 'dark' ? 'bg-slate-800 border-slate-600 text-slate-100' :
                  layoutMode === 'journal' ? 'bg-amber-50 border-amber-200' :
                  'bg-white border-slate-200 hover:border-rose-200'
                }`}>
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Paragraph {idx + 1}</span>
                      {/* Reorder buttons */}
                      <div className="flex gap-0.5">
                        <button type="button" onClick={() => moveParagraph(idx, -1)} disabled={idx === 0} className="text-slate-500 hover:text-slate-700 disabled:opacity-20 p-0.5 rounded text-[11px] font-bold transition-colors" aria-label={t("a11y.move_paragraph_up")} title={t("ui_common.move_up")}>▲</button>
                        <button type="button" onClick={() => moveParagraph(idx, 1)} disabled={idx === paragraphs.length - 1} className="text-slate-500 hover:text-slate-700 disabled:opacity-20 p-0.5 rounded text-[11px] font-bold transition-colors" aria-label={t("a11y.move_paragraph_down")} title={t("ui_common.move_down")}>▼</button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="button"
                        onClick={() => toggleDictation(idx)}
                        disabled={language === 'other'}
                        title={language === 'other' ? 'Voice typing works only with the listed languages (it would otherwise transcribe in English). Pick a language from the list to use it.' : 'Start dictation'}
                        className={`text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors ${
                          language === 'other'
                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                            : dictation.isDictating && dictatingParagraphIdx === idx
                            ? 'bg-red-100 border-red-300 text-red-600 animate-pulse motion-reduce:animate-none'
                            : 'bg-blue-50 border-blue-200/50 text-blue-500 hover:bg-blue-100 hover:text-blue-700'
                        }`}
                        aria-label={language === 'other' ? 'Voice typing unavailable for a custom language' : (dictation.isDictating && dictatingParagraphIdx === idx ? 'Stop dictation' : 'Start dictation')}
                      >
                        <Mic size={10} /> {dictation.isDictating && dictatingParagraphIdx === idx ? 'Stop' : 'Dictate'}
                      </button>
                      <button type="button"
                        onClick={() => helpMeWrite(idx)}
                        disabled={isProcessing}
                        className="text-amber-500 hover:text-amber-700 text-[11px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/50 transition-colors disabled:opacity-40"
                        aria-label={t("a11y.get_writing_suggestions")}
                      >
                        <Sparkles size={10} /> Help Me
                      </button>
                      {paragraphs.length > 1 && (
                        <button type="button" onClick={() => removeParagraph(idx)} className="text-slate-500 hover:text-red-500 focus:text-red-500 p-1 rounded transition-colors" aria-label={`Remove paragraph ${idx + 1}`}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {p.scaffoldFrame && (
                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 italic flex items-center gap-2">
                      <HelpCircle size={12} className="shrink-0" /> {p.scaffoldFrame}
                    </div>
                  )}
                  {/* ── Plot Structure beat (optional narrative-arc tag) ── */}
                  {genre !== 'free' && (
                    <div className="px-4 py-2 bg-indigo-50/60 border-b border-indigo-100 flex items-center gap-2">
                      <label htmlFor={`sf-beat-${p.id}`} className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest shrink-0">
                        📍 Plot Beat
                      </label>
                      <select
                        id={`sf-beat-${p.id}`}
                        value={p.plotBeat || ''}
                        onChange={(e) => updateParagraphBeat(idx, e.target.value)}
                        className="text-xs px-2 py-1 rounded-md border border-indigo-200 bg-white text-indigo-800 font-medium focus:border-indigo-500"
                        aria-label={`Plot beat for paragraph ${idx + 1} (optional)`}
                      >
                        {PLOT_BEATS.map(b => (
                          <option key={b.value || 'none'} value={b.value}>{b.label}</option>
                        ))}
                      </select>
                      {p.plotBeat && (
                        <span className="text-[11px] text-indigo-600 italic">tagged</span>
                      )}
                    </div>
                  )}
                  {/* Help Me Write suggestions */}
                  {helpMeParagraphIdx === idx && helpMeResult && (
                    <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
                      <div className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1"><Sparkles size={10} /> Writing Coach Suggestions</div>
                      <div className="space-y-1.5">
                        {helpMeResult.map((s, si) => (
                          <div key={si} className="text-xs text-amber-800 flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">💡</span>
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => { setHelpMeParagraphIdx(-1); setHelpMeResult(null); }} className="mt-2 text-[11px] text-amber-500 hover:text-amber-700 font-bold">{t("ui_common.dismiss")}</button>
                    </div>
                  )}
                  {layoutMode === 'comic' ? (
                    /* ── Comic Panel Writing Mode — dialogue, thought, narration fields ── */
                    <div className="p-3 space-y-2 bg-gradient-to-b from-slate-50 to-white">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Panel {idx + 1} Bubbles</div>
                        {onCallGemini && (
                          <button
                            type="button"
                            onClick={() => draftComicBubbles(idx)}
                            disabled={isProcessing || !(p.text || p.scaffoldFrame || '').trim()}
                            className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
                            title="Draft this panel's speech, thought, and SFX bubbles"
                          >
                            <Sparkles size={10} /> Draft
                          </button>
                        )}
                      </div>
                      {/* Narration caption — top yellow bar */}
                      <div className="rounded-lg border border-slate-200 bg-white p-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Panel Direction</div>
                          {onCallGemini && (
                            <button
                              type="button"
                              onClick={() => draftComicCameraPass(idx)}
                              disabled={isProcessing || !(p.text || p.scaffoldFrame || '').trim()}
                              className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 disabled:opacity-40 transition-colors"
                              title="Suggest camera direction for this panel"
                            >
                              Direct
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          {[
                            { field: 'shot', label: 'Shot', options: COMIC_SHOT_OPTIONS },
                            { field: 'angle', label: 'Angle', options: COMIC_ANGLE_OPTIONS },
                            { field: 'mood', label: 'Mood', options: COMIC_MOOD_OPTIONS },
                            { field: 'transition', label: 'Move', options: COMIC_TRANSITION_OPTIONS },
                          ].map(({ field, label, options }) => (
                            <label key={field} className="min-w-0">
                              <span className="sr-only">{label}</span>
                              <select
                                value={(panelDirections[p.id] || {})[field] || ''}
                                onChange={(e) => updatePanelDirection(p.id, field, e.target.value)}
                                className="w-full px-2 py-1.5 text-[11px] rounded-md border border-slate-200 bg-slate-50 text-slate-700 font-bold focus:border-blue-400"
                                aria-label={`Panel ${idx + 1} ${label.toLowerCase()}`}
                              >
                                {options.map(opt => (
                                  <option key={opt.value || `${field}-none`} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-2">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="text-[10px] font-black text-teal-700 uppercase tracking-widest">Thumbnail Rough</div>
                          {onCallGemini && (
                            <button
                              type="button"
                              onClick={() => draftComicThumbnailPass(idx)}
                              disabled={isProcessing || !(p.text || p.scaffoldFrame || '').trim()}
                              className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-teal-700 border border-teal-200 hover:bg-teal-100 disabled:opacity-40 transition-colors"
                              title="Suggest a thumbnail rough for this panel"
                            >
                              Rough
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={(panelThumbnails[p.id] || {}).focalPoint || ''}
                            onChange={(e) => updatePanelThumbnail(p.id, 'focalPoint', e.target.value)}
                            className="w-full px-2 py-1.5 text-[11px] rounded-md border border-teal-100 bg-white text-slate-700 focus:border-teal-400"
                            placeholder="Focal point"
                            aria-label={`Panel ${idx + 1} focal point`}
                          />
                          <select
                            value={(panelThumbnails[p.id] || {}).letteringSpace || ''}
                            onChange={(e) => updatePanelThumbnail(p.id, 'letteringSpace', e.target.value)}
                            className="w-full px-2 py-1.5 text-[11px] rounded-md border border-teal-100 bg-white text-slate-700 font-bold focus:border-teal-400"
                            aria-label={`Panel ${idx + 1} lettering space`}
                          >
                            {COMIC_LETTERING_SPACE_OPTIONS.map(opt => (
                              <option key={opt.value || 'lettering-space-none'} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          value={(panelThumbnails[p.id] || {}).composition || ''}
                          onChange={(e) => updatePanelThumbnail(p.id, 'composition', e.target.value)}
                          className="mt-2 w-full p-2 text-[11px] resize-none border border-teal-100 rounded-lg bg-white focus:border-teal-400"
                          style={{ minHeight: '38px' }}
                          placeholder="Composition: foreground/background, negative space, character placement..."
                          aria-label={`Panel ${idx + 1} composition rough`}
                        />
                        <textarea
                          value={(panelThumbnails[p.id] || {}).sketchNote || ''}
                          onChange={(e) => updatePanelThumbnail(p.id, 'sketchNote', e.target.value)}
                          className="mt-2 w-full p-2 text-[11px] resize-none border border-teal-100 rounded-lg bg-white focus:border-teal-400"
                          style={{ minHeight: '34px' }}
                          placeholder="Sketch note: silhouette, motion, important prop, or staging reminder..."
                          aria-label={`Panel ${idx + 1} thumbnail sketch note`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                          📖 Narration Caption
                        </label>
                        <textarea
                          value={p.text}
                          onChange={(e) => updateParagraph(idx, e.target.value)}
                          className="w-full p-2.5 text-xs resize-none border-2 border-amber-200 rounded-lg bg-amber-50 focus:border-amber-400 transition-colors italic"
                          style={{ minHeight: '50px' }}
                          placeholder={t("placeholders.panel_narrator")}
                          aria-label={`Panel ${idx + 1} narration`}
                        />
                      </div>
                      {/* Speech bubble */}
                      <div>
                        <label className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                          💬 Speech Bubble
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={(panelDialogue[p.id] || {}).speaker || ''}
                            onChange={(e) => updatePanelDialogue(p.id, 'speaker', e.target.value)}
                            className="w-20 p-1.5 text-[11px] border border-blue-200 rounded-lg focus:border-blue-400 font-bold text-blue-700"
                            placeholder={t("placeholders.who_speaker")}
                            aria-label={`Panel ${idx + 1} speaker name`}
                          />
                          <textarea
                            value={(panelDialogue[p.id] || {}).speech || ''}
                            onChange={(e) => updatePanelDialogue(p.id, 'speech', e.target.value)}
                            className="flex-1 p-2 text-xs resize-none border-2 border-blue-200 rounded-xl bg-white focus:border-blue-400 transition-colors"
                            style={{ minHeight: '36px', borderRadius: '16px' }}
                            placeholder={'"What the character says out loud..."'}
                            aria-label={`Panel ${idx + 1} speech`}
                          />
                        </div>
                      </div>
                      {/* Thought bubble */}
                      <div>
                        <label className="text-[11px] font-bold text-purple-600 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                          💭 Thought Bubble
                        </label>
                        <textarea
                          value={(panelDialogue[p.id] || {}).thought || ''}
                          onChange={(e) => updatePanelDialogue(p.id, 'thought', e.target.value)}
                          className="w-full p-2 text-xs resize-none border-2 border-purple-200 rounded-xl bg-purple-50/30 focus:border-purple-400 transition-colors italic"
                          style={{ minHeight: '30px', borderRadius: '20px', borderStyle: 'dashed' }}
                          placeholder={t("placeholders.character_thinking")}
                          aria-label={`Panel ${idx + 1} thought`}
                        />
                      </div>
                      {/* Sound effect */}
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-red-500 uppercase tracking-widest">💥 SFX</label>
                        <input
                          type="text"
                          value={(panelDialogue[p.id] || {}).sfx || ''}
                          onChange={(e) => updatePanelDialogue(p.id, 'sfx', e.target.value)}
                          className="flex-1 p-1.5 text-xs border border-red-200 rounded-lg focus:border-red-400 font-black text-red-600 uppercase"
                          placeholder={t("placeholders.sound_effect_example")}
                          aria-label={`Panel ${idx + 1} sound effect`}
                        />
                      </div>
                      {(() => {
                        const lettering = getComicLetteringStats(panelDialogue[p.id] || {});
                        const pct = Math.min(100, Math.round((lettering.words / lettering.limit) * 100));
                        const color = lettering.level === 'crowded' ? 'bg-red-500' : lettering.level === 'watch' ? 'bg-amber-400' : 'bg-green-500';
                        const textColor = lettering.level === 'crowded' ? 'text-red-700' : lettering.level === 'watch' ? 'text-amber-700' : 'text-green-700';
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white p-2" aria-label={`Panel ${idx + 1} lettering budget`}>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Lettering Budget</span>
                              {onCallGemini && lettering.words > COMIC_BUBBLE_WORD_WARNING && (
                                <button
                                  type="button"
                                  onClick={() => tightenComicBubbles(idx)}
                                  disabled={isProcessing}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 transition-colors"
                                  title="Tighten this panel's bubbles"
                                >
                                  Tighten
                                </button>
                              )}
                              <span className={`text-[10px] font-black ${textColor}`}>{lettering.words}/{lettering.limit} words · {lettering.label}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                            </div>
                            {lettering.words > 0 && (
                              <p className="mt-1 text-[10px] text-slate-500 leading-snug">{lettering.detail}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    /* ── Prose / Journal / Dark Writing Mode — styled textarea ── */
                    <textarea
                      value={p.text}
                      onChange={(e) => updateParagraph(idx, e.target.value)}
                      dir="auto"
                      className={`w-full p-4 text-sm resize-none transition-colors ${
                        layoutMode === 'dark' ? 'bg-slate-800 text-slate-100 placeholder:text-slate-600 focus:bg-slate-700 caret-cyan-400' :
                        layoutMode === 'journal' ? 'bg-amber-50 text-amber-900 placeholder:text-amber-600 focus:bg-amber-100/50' :
                        'focus:bg-rose-50/30'
                      }`}
                      style={{
                        minHeight: '120px',
                        fontFamily: layoutMode === 'journal' ? "'Georgia', 'Times New Roman', serif" : 'inherit',
                        fontSize: layoutMode === 'journal' ? '14px' : undefined,
                        lineHeight: layoutMode === 'journal' ? '2.0' : undefined,
                        backgroundImage: layoutMode === 'journal' ? 'repeating-linear-gradient(transparent, transparent 27px, #d4a574 27px, #d4a574 28px)' : undefined,
                        backgroundPosition: layoutMode === 'journal' ? '0 8px' : undefined,
                      }}
                      placeholder={p.scaffoldFrame ? "Continue from the scaffold above..." : layoutMode === 'journal' ? "Dear diary..." : layoutMode === 'dark' ? "Begin your story..." : "Write your paragraph here..."}
                      aria-label={`Paragraph ${idx + 1} text`}
                    />
                  )}
                  {/* ── Handwriting Capture Row ── */}
                  {onCallGeminiVision && (
                    <div className={`px-4 py-1.5 border-t flex items-center gap-2 flex-wrap ${
                      layoutMode === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'
                    }`}>
                      <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-dashed rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        hwLoading && hwTargetParagraph === idx ? 'opacity-50 pointer-events-none' : ''
                      } ${
                        layoutMode === 'dark' ? 'border-cyan-700 text-cyan-400 hover:bg-cyan-900/30' : 'border-violet-300 text-violet-600 hover:bg-violet-50 hover:border-violet-400'
                      }`}
                        aria-label={`Snap or upload handwriting for paragraph ${idx + 1}`}
                      >
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          capture="environment"
                          onChange={(e) => handleHandwritingCapture(e, idx)}
                          className="sr-only"
                          disabled={hwLoading}
                          aria-hidden="true"
                        />
                        {hwLoading && hwTargetParagraph === idx ? <span className="animate-spin motion-reduce:animate-none">⏳</span> : '📷'}
                        {hwLoading && hwTargetParagraph === idx ? ' Reading...' : ' Snap Your Writing'}
                      </label>
                      <button type="button"
                        onClick={() => setHwPenmanshipOn(!hwPenmanshipOn)}
                        aria-label={`${hwPenmanshipOn ? 'Disable' : 'Enable'} penmanship feedback`}
                        aria-pressed={hwPenmanshipOn}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                          hwPenmanshipOn
                            ? (layoutMode === 'dark' ? 'bg-cyan-900 border-cyan-600 text-cyan-300' : 'bg-violet-100 border-violet-300 text-violet-700')
                            : (layoutMode === 'dark' ? 'bg-slate-800 border-slate-600 text-slate-300 hover:border-cyan-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-500')
                        }`}
                      >
                        ✏️ Penmanship Tips {hwPenmanshipOn ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  )}
                  {/* Penmanship Feedback Card */}
                  {hwResult?.penmanship && hwTargetParagraph === idx && (() => {
                    const pm = hwResult.penmanship;
                    const bandColor = pm.band === 'Strong' ? '#16a34a' : pm.band === 'On track' ? '#7c3aed' : pm.band === 'Developing' ? '#2563eb' : '#64748b';
                    return (
                    <div className={`px-4 py-3 border-t ${
                      layoutMode === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-gradient-to-r from-violet-50 to-fuchsia-50 border-violet-200'
                    }`} role="region" aria-label="Penmanship feedback">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${layoutMode === 'dark' ? 'text-cyan-400' : 'text-violet-600'}`}>✏️ Penmanship Feedback</span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full text-white" style={{ background: bandColor }}>{pm.band}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-2">
                        {pm.auditorCount > 1
                          ? `AI estimate · ~${pm.score}/100 (likely ${pm.ci[0]}–${pm.ci[1]}) · averaged across ${pm.auditorCount} reviewers · ${pm.agreement} agreement`
                          : `AI estimate · ~${pm.score}/100 (single pass)`}
                      </p>
                      <div className="flex gap-2 mb-2">
                        {[['letterFormation', 'Letters'], ['spacing', 'Spacing'], ['alignment', 'Alignment'], ['neatness', 'Neatness']].map(([key, label]) => (
                          <div key={key} className="flex-1 text-center">
                            <div className={`text-sm font-black ${(pm[key] || 0) >= 18 ? 'text-green-600' : (pm[key] || 0) >= 12 ? 'text-amber-600' : 'text-slate-600'}`}>
                              {pm[key] || 0}<span className="text-[11px] opacity-60">/25</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-bold uppercase">{label}</div>
                          </div>
                        ))}
                      </div>
                      {pm.strengths && <p className="text-xs text-green-700 font-medium mb-1">💪 {pm.strengths}</p>}
                      {pm.tips && <p className={`text-xs font-medium ${layoutMode === 'dark' ? 'text-cyan-400' : 'text-violet-600'}`}>💡 {pm.tips}</p>}
                      <p className="text-[10px] text-slate-500 italic mt-1">Formative AI feedback to guide practice — not a graded or normed score.</p>
                      <button type="button" onClick={() => setHwResult(null)} className="text-[11px] text-slate-500 hover:text-slate-600 font-bold mt-1" aria-label={t("a11y.dismiss_penmanship_feedback")}>{t("ui_common.dismiss")}</button>
                    </div>
                    );
                  })()}
                  {/* Per-paragraph strength indicator + vocab reminder */}
                  {p.text.length > 0 && (
                    <div className={`px-4 py-1.5 border-t flex flex-wrap items-center gap-3 text-[11px] font-medium ${
                      layoutMode === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-500'
                    }`}>
                      <span>{paragraphStats[idx]?.wordCount || 0} words</span>
                      <span>·</span>
                      <span>{paragraphStats[idx]?.sentenceCount || 0} sentences</span>
                      <span>·</span>
                      <span className={paragraphStats[idx]?.vocabUsed > 0 ? 'text-green-500' : 'text-slate-500'}>{paragraphStats[idx]?.vocabUsed || 0} vocab terms</span>
                      {overusedWords.length > 0 && p.text.toLowerCase().split(/\s+/).some(w => overusedWords.includes(w.replace(/[^a-z'-]/g, ''))) && (
                        <span className="text-amber-500" title={`Overused: ${overusedWords.join(', ')}`}>· Repeated words</span>
                      )}
                      {sentenceVariety[idx] && !sentenceVariety[idx].varied && (
                        <span className="text-orange-500" title={sentenceVariety[idx].issues.join('; ')}>· Vary sentences</span>
                      )}
                    </div>
                  )}
                  {/* Vocab still needed — shows unused terms as a gentle reminder */}
                  {vocabTerms.length > 0 && (() => {
                    const allText = paragraphs.map(pp => pp.text).join(' ');
                    const unused = vocabTerms.filter(v => !termUsed(allText, v.term));
                    if (unused.length === 0 || unused.length === vocabTerms.length) return null;
                    return (
                      <div className={`px-4 py-1.5 border-t text-[11px] ${
                        layoutMode === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-rose-50/50 border-rose-100 text-rose-700'
                      }`}>
                        <span className="font-bold">Still needed: </span>
                        {unused.map((v, vi) => (
                          <span key={vi}>
                            <button type="button"
                              onClick={async () => {
                                if (!navigator.clipboard?.writeText) { if (addToast) addToast(`Copy "${v.term}" manually — clipboard unavailable`, 'error'); return; }
                                try { const ok = window.alloCopyText ? await window.alloCopyText(v.term) : false; if (!ok) throw new Error('copy unavailable'); if (addToast) addToast(`"${v.term}" copied!`, 'success'); }
                                catch (err) { console.warn('Clipboard write failed:', err); if (addToast) addToast(`Couldn't copy — please copy "${v.term}" manually`, 'error'); }
                              }}
                              className={`font-bold underline decoration-dotted cursor-pointer ${layoutMode === 'dark' ? 'text-cyan-500 hover:text-cyan-300' : 'text-rose-600 hover:text-rose-800'}`}
                              title={v.definition || 'Click to copy'}
                            >{v.term}</button>
                            {vi < unused.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  {/* Grammar/Style results */}
                  {grammarResults[p.id] && grammarResults[p.id].length > 0 && (
                    <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 space-y-1.5">
                      {grammarResults[p.id].map((issue, gi) => (
                        <div key={gi} className="flex items-start gap-2 text-[11px]">
                          <span className={`shrink-0 px-1.5 py-0.5 rounded font-bold uppercase ${
                            issue.type === 'grammar' ? 'bg-red-100 text-red-700' :
                            issue.type === 'show_dont_tell' ? 'bg-purple-100 text-purple-700' :
                            issue.type === 'weak_verb' ? 'bg-amber-100 text-amber-700' :
                            issue.type === 'passive' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{issue.type === 'show_dont_tell' ? 'show' : issue.type?.replace('_', ' ') || 'tip'}</span>
                          <div className="flex-1">
                            {issue.original && <span className="line-through text-slate-500 mr-1">"{issue.original}"</span>}
                            {issue.suggestion && <span className="text-emerald-700 font-bold">→ "{issue.suggestion}"</span>}
                            {issue.tip && <div className="text-slate-600 mt-0.5">{issue.tip}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transition suggestion */}
                {idx < paragraphs.length - 1 && suggestTransition(idx + 1) && (
                  <div className="flex items-center justify-center py-1">
                    <button type="button"
                      onClick={() => updateParagraph(idx + 1, suggestTransition(idx + 1) + ' ')}
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium hover:bg-indigo-50 px-3 py-1 rounded-full transition-colors"
                      title={t("ui_common.click_to_insert")}
                    >
                      Tip: Start next paragraph with "{suggestTransition(idx + 1)}"
                    </button>
                  </div>
                )}
                </React.Fragment>
              ))}

              {!focusMode && paragraphs.length < maxParagraphs && (
                <button type="button" onClick={addParagraph} className="w-full p-3 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold text-sm hover:border-rose-400 hover:text-rose-500 transition-colors flex items-center justify-center gap-2">
                  <Plus size={16} /> Add Paragraph
                </button>
              )}
            </div>
          )}

          {/* ═══ ILLUSTRATE PHASE ═══ */}
          {phase === 'illustrate' && (
            <div className={`space-y-4 ${animClass}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{t("ui_common.illustrate_story")}</h3>
                  <p className="text-slate-600 text-sm mt-1">{layoutMode === 'comic' ? 'AI will create consistent artwork for each panel' : 'AI will create artwork for each paragraph'}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button type="button"
                    onClick={generateCoverArt}
                    disabled={isProcessing || coverArtLoading}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-xs font-bold hover:bg-purple-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles size={14} /> {coverArtLoading ? 'Generating...' : coverArt ? 'Redo Cover' : 'Cover Art'}
                  </button>
                  {layoutMode === 'comic' && onCallGemini && (
                    <button type="button"
                      onClick={() => draftComicArtPrompts()}
                      disabled={isProcessing || !paragraphs.some(p => getIllustrationSourceText(p).trim().length >= 20)}
                      className="px-4 py-2 bg-fuchsia-100 text-fuchsia-700 rounded-full text-xs font-bold hover:bg-fuchsia-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                      title="Draft consistent image prompts for every comic panel"
                    >
                      <Sparkles size={14} /> Art Prompt Pass
                    </button>
                  )}
                  <button type="button"
                    onClick={illustrateAll}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-purple-600 text-white rounded-full text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <ImageIcon size={14} /> {isProcessing ? 'Generating...' : 'Illustrate All'}
                  </button>
                </div>
              </div>

              {/* Cover Art Preview */}
              {(coverArt || coverArtLoading) && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-4 text-center">
                  <div className="text-[11px] font-bold text-purple-500 uppercase tracking-widest mb-2">{t("ui_common.book_cover")}</div>
                  {coverArtLoading ? (
                    <div className="w-48 h-48 mx-auto bg-purple-100 rounded-xl flex items-center justify-center border-2 border-dashed border-purple-300">
                      <RefreshCw size={32} className="text-purple-700 animate-spin motion-reduce:animate-none" />
                    </div>
                  ) : coverArt && (
                    <img src={coverArt} alt={t("alts.book_cover")} className="max-w-xs mx-auto rounded-xl shadow-lg border-2 border-purple-200" />
                  )}
                </div>
              )}

              {layoutMode === 'comic' && (
                <div className="bg-white rounded-2xl border-2 border-purple-100 shadow-sm p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-[11px] font-bold text-purple-600 uppercase tracking-widest">Comic Continuity</div>
                    {onCallGemini && (
                      <button type="button"
                        onClick={draftComicContinuity}
                        disabled={isProcessing || !paragraphs.some(p => (p.text || p.scaffoldFrame || '').trim().length > 0)}
                        className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-[11px] font-bold hover:bg-purple-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <Sparkles size={12} /> Draft Notes
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { field: 'cast', label: 'Cast', placeholder: 'Mina: round glasses, red jacket, curious expression' },
                      { field: 'setting', label: 'Setting', placeholder: 'Library lab with teal lamps and brass shelves' },
                      { field: 'palette', label: 'Palette', placeholder: 'Teal, amber, ink black, warm paper white' },
                      { field: 'styleNotes', label: 'Style Rules', placeholder: 'Clean ink lines, consistent outfits, soft rim light' },
                    ].map(({ field, label, placeholder }) => (
                      <label key={field} className="block">
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</span>
                        <textarea
                          value={comicContinuity[field] || ''}
                          onChange={(e) => updateComicContinuity(field, e.target.value)}
                          placeholder={placeholder}
                          className="w-full h-20 p-2 text-xs rounded-lg border border-purple-100 bg-purple-50/40 text-slate-700 focus:border-purple-400 resize-none"
                          aria-label={`Comic continuity ${label.toLowerCase()}`}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Prompt Preview Modal */}
              {promptPreview && (
                <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-5 shadow-lg">
                  <div className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Eye size={14} /> Preview Image Prompt — {layoutMode === 'comic' ? 'Panel' : 'Paragraph'} {promptPreview.idx + 1}
                  </div>
                  <p className="text-[11px] text-slate-600 mb-2">Edit the prompt below before generating, or click Generate to proceed.</p>
                  <textarea
                    value={promptPreview.prompt}
                    onChange={(e) => setPromptPreview(prev => ({ ...prev, prompt: e.target.value }))}
                    className="w-full text-sm p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-300 resize-none h-20"
                    aria-label={t("a11y.image_gen_prompt")}
                  />
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => confirmIllustration()} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-2">
                      <ImageIcon size={14} /> Generate Image
                    </button>
                    <button type="button" onClick={() => setPromptPreview(null)} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {paragraphs.map((p, idx) => (
                <div key={p.id} className="bg-white rounded-2xl border-2 border-purple-100 shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="text-xs font-bold text-purple-600 mb-1">{layoutMode === 'comic' ? 'Panel' : 'Paragraph'} {idx + 1}</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{p.text || p.scaffoldFrame || <span className="italic text-slate-500">{t("ui_common.empty_paragraph")}</span>}</p>
                      {/* Show the prompt used */}
                      {illustrations[p.id]?.prompt && !illustrations[p.id]?.isLoading && (
                        <div className="mt-2 text-[11px] text-purple-700 italic truncate" title={illustrations[p.id].prompt}>
                          Prompt: {illustrations[p.id].prompt.substring(0, 80)}...
                        </div>
                      )}
                      {layoutMode === 'comic' && onCallGemini && (
                        <button
                          type="button"
                          onClick={() => draftComicArtPrompts(idx)}
                          disabled={isProcessing || getIllustrationSourceText(p).trim().length < 20}
                          className="mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 hover:bg-fuchsia-100 disabled:opacity-40 transition-colors inline-flex items-center gap-1"
                          title="Draft a consistent art prompt for this panel"
                        >
                          <Sparkles size={10} /> Draft Art Prompt
                        </button>
                      )}
                    </div>
                    <div className="w-48 shrink-0">
                      {illustrations[p.id]?.isLoading ? (
                        <div className="w-48 h-36 bg-purple-50 rounded-xl flex items-center justify-center border-2 border-dashed border-purple-200">
                          <RefreshCw size={24} className="text-purple-700 animate-spin motion-reduce:animate-none" />
                        </div>
                      ) : illustrations[p.id]?.imageUrl ? (
                        <div className="relative group">
                          <img src={illustrations[p.id].imageUrl} alt={`Illustration ${idx + 1}`} className="w-48 rounded-xl shadow-md border border-purple-100" />
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            {illustrations[p.id]?.previousImageUrl && (
                              <button type="button"
                                onClick={() => undoIllustration(p.id)}
                                className="p-1.5 bg-white/90 rounded-full shadow-md hover:bg-amber-100"
                                title={t("tooltips.undo_illustration")}
                                aria-label={t("a11y.undo_illustration")}
                              >
                                <ArrowLeft size={12} className="text-amber-600" />
                              </button>
                            )}
                            <button type="button"
                              onClick={() => setImageEditState({ paragraphId: p.id, prompt: '' })}
                              className="p-1.5 bg-white/90 rounded-full shadow-md hover:bg-teal-100"
                              title={t("ui_common.edit_illustration")}
                              aria-label={t("a11y.edit_illustration")}
                            >
                              <Sparkles size={12} className="text-teal-600" />
                            </button>
                            <button type="button"
                              onClick={() => regenerateIllustration(p.id, getIllustrationSourceText(p), idx)}
                              disabled={isProcessing}
                              className="p-1.5 bg-white/90 rounded-full shadow-md hover:bg-purple-100"
                              title={t("ui_common.regenerate_illustration")}
                              aria-label={t("a11y.regenerate_illustration")}
                            >
                              <RefreshCw size={12} className="text-purple-600" />
                            </button>
                          </div>
                          {/* Image edit input */}
                          {imageEditState?.paragraphId === p.id && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-2 border-t border-purple-200 rounded-b-xl">
                              <input
                                type="text"
                                value={imageEditState.prompt}
                                onChange={(e) => setImageEditState(prev => ({ ...prev, prompt: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter' && imageEditState.prompt.trim()) refineIllustration(p.id, imageEditState.prompt); }}
                                placeholder="e.g., make sky purple, add a dog..."
                                className="w-full text-[11px] p-1.5 border border-purple-200 rounded-lg focus:ring-1 focus:ring-purple-300"
                                aria-label={t("a11y.describe_illustration_changes")}
                                autoFocus
                              />
                              <div className="flex gap-1 mt-1">
                                <button type="button" onClick={() => { if (imageEditState.prompt.trim()) refineIllustration(p.id, imageEditState.prompt); }} disabled={!imageEditState.prompt.trim()} className="flex-1 text-[11px] font-bold bg-teal-600 text-white rounded py-1 hover:bg-teal-700 disabled:opacity-40">{t("ui_common.apply")}</button>
                                <button type="button" onClick={() => setImageEditState(null)} className="text-[11px] font-bold bg-slate-200 text-slate-600 rounded py-1 px-2 hover:bg-slate-300">{t("ui_common.cancel")}</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : illustrations[p.id]?.error ? (
                        <div className="w-48 h-28 bg-red-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-red-200 gap-1">
                          <span className="text-red-600 text-lg">{'\u26A0\uFE0F'}</span>
                          <span className="text-[11px] font-bold text-red-500">{t("ui_common.generation_failed")}</span>
                          <button type="button"
                            onClick={() => { setIllustrations(prev => ({ ...prev, [p.id]: {} })); illustrateParagraph(p.id, getIllustrationSourceText(p), idx); }}
                            disabled={isProcessing}
                            className="text-[11px] font-bold text-red-600 hover:text-red-800 underline disabled:opacity-40"
                          >
                            Try Again
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button type="button"
                            onClick={() => illustrateParagraph(p.id, getIllustrationSourceText(p), idx)}
                            disabled={getIllustrationSourceText(p).trim().length < 20 || isProcessing}
                            className="w-48 h-28 bg-purple-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-100 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <ImageIcon size={24} className="text-purple-700 mb-1" />
                            <span className="text-xs font-bold text-purple-500">Auto-Generate</span>
                          </button>
                          <button type="button"
                            onClick={() => generateImagePrompt(p.id, getIllustrationSourceText(p), idx)}
                            disabled={getIllustrationSourceText(p).trim().length < 20 || isProcessing}
                            className="w-48 py-1.5 bg-purple-100 rounded-lg text-[11px] font-bold text-purple-600 hover:bg-purple-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
                          >
                            <Eye size={10} /> Preview Prompt First
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ NARRATE PHASE ═══ */}
          {phase === 'narrate' && (
            <div className={`space-y-4 ${animClass}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{t("headings.narrate_story")}</h3>
                  <p className="text-slate-600 text-sm mt-1">AI reads your story aloud — or record your own voice</p>
                </div>
                <div className="flex gap-2 items-center">
                  {/* Voice selector */}
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="sf-voice" className="text-[11px] font-bold text-indigo-500 uppercase">Voice:</label>
                    <select
                      id="sf-voice"
                      value={narratorVoice}
                      onChange={(e) => setNarratorVoice(e.target.value)}
                      className="text-xs p-1 border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-300 font-bold text-indigo-700"
                    >
                      {VOICE_POOL.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  {characters.length === 0 && (
                    <button type="button" onClick={detectCharacters} disabled={isProcessing} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold hover:bg-indigo-200 transition-colors disabled:opacity-50 flex items-center gap-2">
                      <Eye size={14} /> Detect Characters
                    </button>
                  )}
                  <button type="button" onClick={narrateAll} disabled={isProcessing} className="px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    <Volume2 size={14} /> {isProcessing ? 'Narrating...' : 'Narrate All'}
                  </button>
                  <button type="button"
                    onClick={() => { if (playbackIdx === -1) { setSentenceIdx(0); setPlaybackIdx(0); } else { setPlaybackIdx(-1); setSentenceIdx(0); } }}
                    className="px-4 py-2 bg-green-600 text-white rounded-full text-xs font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Play size={14} /> {playbackIdx >= 0 ? 'Stop' : 'Play All'}
                  </button>
                </div>
              </div>

              {/* Characters detected */}
              {characters.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Characters Detected</div>
                  <div className="flex flex-wrap gap-3">
                    {characters.map((c, i) => (
                      <div key={i} className="bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs">
                        <span className="font-bold text-indigo-800">{c.name}</span>
                        <span className="text-slate-500 ml-2">Voice: {c.voice}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {paragraphs.map((p, idx) => {
                const seg = audioSegments[p.id];
                const isCurrentPlayback = playbackIdx === idx;
                const hasSentenceAudio = seg?.sentenceAudios && seg.sentenceAudios.length > 0;
                const displaySentences = hasSentenceAudio ? seg.sentences : splitSentences(p.text);
                return (
                  <div key={p.id} className={`bg-white rounded-2xl border-2 shadow-sm p-5 transition-colors ${isCurrentPlayback ? 'border-green-400 bg-green-50/30' : 'border-indigo-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-600">Paragraph {idx + 1} {isCurrentPlayback && '\u25B6 Playing'}</span>
                      <div className="flex gap-2">
                        {/* AI Narrate button */}
                        {hasSentenceAudio ? (
                          <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> AI Narrated ({seg.sentenceAudios.filter(Boolean).length} sentences)</span>
                        ) : seg?.aiLoading ? (
                          <span className="text-xs text-indigo-400 flex items-center gap-1"><RefreshCw size={12} className="animate-spin motion-reduce:animate-none" /> Generating...</span>
                        ) : (
                          <button type="button" onClick={() => narrateParagraph(p.id, p.text)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                            <Volume2 size={12} /> Narrate
                          </button>
                        )}
                        {/* Play this paragraph */}
                        {hasSentenceAudio && (
                          <button type="button"
                            onClick={() => {
                              if (isCurrentPlayback) { setPlaybackIdx(-1); setSentenceIdx(0); }
                              else { setPlaybackIdx(idx); setSentenceIdx(0); }
                            }}
                            className="text-xs font-bold text-green-600 hover:text-green-800 flex items-center gap-1"
                          >
                            <Play size={12} /> {isCurrentPlayback ? 'Stop' : 'Play'}
                          </button>
                        )}
                        {/* Record button */}
                        <button type="button"
                          onClick={() => recordingParagraphId === p.id ? stopRecordingParagraph() : startRecordingParagraph(p.id)}
                          className={`text-xs font-bold flex items-center gap-1 transition-colors ${
                            recordingParagraphId === p.id ? 'text-red-600 animate-pulse motion-reduce:animate-none' : 'text-rose-500 hover:text-rose-700'
                          }`}
                        >
                          <Mic size={12} /> {recordingParagraphId === p.id ? 'Stop' : seg?.studentAudioUrl ? 'Re-record' : 'Record'}
                        </button>
                        {/* ORF Fluency Reading button */}
                        {onAnalyzeFluency && (
                          <button type="button"
                            onClick={() => fluencyReadingId === p.id ? stopFluencyReading(p.id, p.text) : startFluencyReading(p.id)}
                            className={`text-xs font-bold flex items-center gap-1 transition-colors ${
                              fluencyReadingId === p.id && fluencyRecording ? 'text-orange-600 animate-pulse motion-reduce:animate-none' : 'text-teal-500 hover:text-teal-700'
                            }`}
                            aria-label={fluencyReadingId === p.id ? (t('a11y.stop_fluency_reading') || 'Stop fluency reading') : (t('a11y.read_aloud_fluency_practice') || 'Read aloud for fluency practice')}
                          >
                            <BookOpen size={12} /> {fluencyReadingId === p.id && fluencyRecording ? 'Stop Reading' : '📖 Read Aloud'}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Karaoke-style sentence rendering */}
                    <p className="text-sm leading-relaxed">
                      {displaySentences.map((sentence, sIdx) => {
                        const isActiveSentence = isCurrentPlayback && sentenceIdx === sIdx;
                        return (
                          <span
                            key={sIdx}
                            className={`transition-all duration-300 ${
                              isActiveSentence
                                ? 'bg-yellow-200 text-green-900 font-semibold rounded px-0.5 py-0.5 shadow-sm'
                                : isCurrentPlayback && sIdx < sentenceIdx
                                  ? 'text-green-700/60'
                                  : 'text-slate-700'
                            }`}
                            style={isActiveSentence ? { boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' } : undefined}
                          >
                            {sentence}{' '}
                          </span>
                        );
                      })}
                    </p>
                    {seg?.studentAudioUrl && (
                      <div className="mt-2">
                        <audio controls src={seg.studentAudioUrl} className="w-full h-8" />
                      </div>
                    )}
                    {/* ORF Fluency Results */}
                    {fluencyResult && fluencyResult.paragraphId === p.id && (
                      <div className="mt-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-center">
                            <div className={`text-2xl font-black ${fluencyResult.accuracy >= 90 ? 'text-green-600' : fluencyResult.accuracy >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{fluencyResult.accuracy || 0}%</div>
                            <div className="text-[11px] text-slate-600 font-bold">Accuracy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-black text-indigo-600">{fluencyResult.wcpm || 0}</div>
                            <div className="text-[11px] text-slate-600 font-bold">WCPM</div>
                          </div>
                          {fluencyResult.confidence && (
                            <div className="text-center">
                              <div className={`text-2xl font-black ${fluencyResult.confidence.overall >= 7 ? 'text-green-600' : fluencyResult.confidence.overall >= 4 ? 'text-amber-600' : 'text-red-600'}`}>{fluencyResult.confidence.overall}/10</div>
                              <div className="text-[11px] text-slate-600 font-bold">Confidence</div>
                            </div>
                          )}
                          {fluencyResult.prosody && (
                            <div className="flex gap-2 ml-auto">
                              {[{k:'pacing',l:'Pace'},{k:'expression',l:'Expr'},{k:'phrasing',l:'Phrase'}].map(({k,l}) => (
                                <div key={k} className="text-center">
                                  <div className="text-sm font-bold text-slate-700">{fluencyResult.prosody[k]}/5</div>
                                  <div className="text-[11px] text-slate-500">{l}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 italic mb-1">AI estimate from one read-aloud — practice feedback, not a normed ORF benchmark or a teacher-administered DIBELS score.</div>
                        {/* Word-by-word display */}
                        {fluencyResult.wordData && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {fluencyResult.wordData.map((w, wi) => (
                              <span key={wi} title={w.said ? `Said: "${w.said}"${w.lowConfidence ? ' (⚠ uncertain)' : ''}` : (w.lowConfidence ? '⚠ AI uncertain' : '')}
                                className={`px-1 py-0.5 rounded text-xs font-medium ${w.lowConfidence ? 'ring-1 ring-amber-400 ' : ''}${
                                  w.status === 'correct' ? 'text-green-700 bg-green-100' :
                                  w.status === 'missed' ? 'text-white bg-red-500' :
                                  w.status === 'stumbled' ? 'text-amber-800 bg-amber-100' :
                                  w.status === 'self_corrected' ? 'text-blue-700 bg-blue-100' :
                                  w.status === 'mispronounced' ? 'text-red-700 bg-red-100' : 'text-slate-600'
                                }`}>{w.word}</span>
                            ))}
                          </div>
                        )}
                        {/* Confidence note */}
                        {fluencyResult.confidence?.note && (
                          <div className="mt-2 text-[11px] text-slate-600 italic">{fluencyResult.confidence.note}</div>
                        )}
                        {fluencyResult.confidence?.accentDetected && (
                          <div className="mt-1 text-[11px] text-teal-600 font-medium">🌍 Accent patterns detected — scores adjusted conservatively to respect linguistic diversity.</div>
                        )}
                        {fluencyResult.feedback && (
                          <div className="mt-2 text-xs text-teal-800 bg-white rounded-lg p-2 border border-teal-200">{fluencyResult.feedback}</div>
                        )}
                        <button type="button" onClick={() => setFluencyResult(null)} className="mt-2 text-[11px] text-slate-500 hover:text-slate-600 font-bold">{t("ui_common.dismiss")}</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ REVIEW PHASE ═══ */}
          {phase === 'review' && (
            <div className={`space-y-6 ${animClass}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{t("headings.review_feedback")}</h3>
                  <p className="text-slate-600 text-sm mt-1">Draft #{draftCount} — Get AI feedback on your story</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!gradingResult && (
                    <button type="button" onClick={checkSenses} disabled={sensesLoading || isProcessing} className="px-4 py-2.5 bg-rose-100 text-rose-700 rounded-full text-sm font-bold hover:bg-rose-200 transition-colors disabled:opacity-50 flex items-center gap-2 border border-rose-200" title={t("tooltips.check_sensory")}>
                      🌈 {sensesLoading ? 'Checking...' : 'Senses Check'}
                    </button>
                  )}
                  {!gradingResult && (
                    <button type="button" onClick={findMentorStory} disabled={mentorLoading || isProcessing} className="px-4 py-2.5 bg-fuchsia-100 text-fuchsia-700 rounded-full text-sm font-bold hover:bg-fuchsia-200 transition-colors disabled:opacity-50 flex items-center gap-2 border border-fuchsia-200" title={t("tooltips.find_mentor_story")}>
                      🎓 {mentorLoading ? 'Searching...' : (mentorMatch && !mentorMatch.error ? 'Find another' : 'Mentor Match')}
                    </button>
                  )}
                  {!gradingResult && (
                    <button type="button" onClick={analyzeShowTell} disabled={showTellLoading || isProcessing} className="px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold hover:bg-emerald-200 transition-colors disabled:opacity-50 flex items-center gap-2 border border-emerald-200" title={t("tooltips.find_telling_sentences")}>
                      🎭 {showTellLoading ? 'Analyzing...' : 'Show vs Tell'}
                    </button>
                  )}
                  {!gradingResult && (
                    <button type="button" onClick={analyzeCharacterArcs} disabled={arcLoading || isProcessing} className="px-4 py-2.5 bg-sky-100 text-sky-700 rounded-full text-sm font-bold hover:bg-sky-200 transition-colors disabled:opacity-50 flex items-center gap-2 border border-sky-200" title={t("tooltips.audit_character_arc")}>
                      🎬 {arcLoading ? 'Analyzing...' : 'Character Arcs'}
                    </button>
                  )}
                  {!gradingResult && (
                    <button type="button" onClick={analyzeDialogue} disabled={dialogueLoading || isProcessing} className="px-4 py-2.5 bg-orange-100 text-orange-700 rounded-full text-sm font-bold hover:bg-orange-200 transition-colors disabled:opacity-50 flex items-center gap-2 border border-orange-200" title={t("tooltips.tune_dialogue")}>
                      💬 {dialogueLoading ? 'Analyzing...' : 'Dialogue Tune-Up'}
                    </button>
                  )}
                  {!gradingResult && layoutMode === 'comic' && (
                    <button type="button" onClick={analyzeComicFlow} disabled={comicFlowLoading || isProcessing} className="px-4 py-2.5 bg-blue-100 text-blue-700 rounded-full text-sm font-bold hover:bg-blue-200 transition-colors disabled:opacity-50 flex items-center gap-2 border border-blue-200" title="Audit comic pacing, shot variety, lettering load, and production readiness">
                      <Eye size={14} /> {comicFlowLoading ? 'Auditing...' : 'Comic Flow'}
                    </button>
                  )}
                  {!gradingResult && helpersAvailableForPlan() && (
                    <button type="button" onClick={synthesizeRevisionPlan} disabled={revisionPlanLoading || isProcessing} className="px-4 py-2.5 bg-purple-100 text-purple-700 rounded-full text-sm font-bold hover:bg-purple-200 transition-colors disabled:opacity-50 flex items-center gap-2 border border-purple-200" title={t("tooltips.synthesize_revision_plan")}>
                      🗺️ºï¸ {revisionPlanLoading ? 'Synthesizing...' : 'Revision Plan'}
                    </button>
                  )}
                  {!gradingResult && (
                    <button type="button" onClick={gradeStory} disabled={isProcessing || (!selfAssessmentSubmitted)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-full text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2" title={!selfAssessmentSubmitted ? 'Complete or skip self-assessment first' : 'Get AI feedback'}>
                      <Sparkles size={16} /> {isProcessing ? 'Grading...' : 'Get Feedback'}
                    </button>
                  )}
                  {gradingResult && (
                    <button type="button" onClick={reviseStory} className="px-5 py-2.5 bg-amber-500 text-white rounded-full text-sm font-bold hover:bg-amber-600 transition-colors flex items-center gap-2">
                      <RefreshCw size={16} /> Revise Story
                    </button>
                  )}
                </div>
              </div>

              {/* ═══ Pre-grade Self-Assessment ═══ */}
              {!gradingResult && !selfAssessmentSubmitted && (
                <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-violet-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-base font-black text-violet-800 flex items-center gap-2">
                        <Star size={18} /> Self-Assessment First
                      </h4>
                      <p className="text-xs text-violet-700 mt-1">Rate your own story on each criterion (1-5) before the AI grades it. This builds reflection skills.</p>
                    </div>
                    <button type="button"
                      onClick={() => { setSelfAssessmentSubmitted(true); sfAnnounce('Self-assessment skipped. AI grading is now available.'); }}
                      className="text-[11px] text-violet-500 hover:text-violet-700 font-bold underline shrink-0"
                    >
                      Skip self-assessment
                    </button>
                  </div>
                  <div className="space-y-2">
                    {getRubricCriteria().map((c) => (
                      <div key={c} className="flex items-center gap-3 bg-white border border-violet-100 rounded-xl px-3 py-2">
                        <label htmlFor={`sf-self-${c}`} className="text-xs font-bold text-violet-800 flex-1 min-w-0 truncate">{c}</label>
                        <input
                          id={`sf-self-${c}`}
                          type="range" min="1" max="5" step="1"
                          value={selfAssessment[c] || 3}
                          onChange={(e) => setSelfAssessment(prev => ({ ...prev, [c]: parseInt(e.target.value, 10) }))}
                          className="w-32 accent-violet-600"
                          aria-label={`Self-rating for ${c}: ${selfAssessment[c] || 3} out of 5`}
                        />
                        <div className="bg-violet-100 text-violet-800 text-xs font-black px-2 py-0.5 rounded-full min-w-[2.25rem] text-center">
                          {selfAssessment[c] || 3}/5
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button"
                    onClick={() => {
                      // Fill any unset criteria with 3 (the slider's visual default) so comparison works.
                      const filled = {};
                      getRubricCriteria().forEach(c => { filled[c] = selfAssessment[c] || 3; });
                      setSelfAssessment(filled);
                      setSelfAssessmentSubmitted(true);
                      sfAnnounce('Self-assessment submitted. You can now get AI feedback.');
                      awardXP(8, 'Completed self-assessment');
                    }}
                    className="mt-3 px-4 py-2 bg-violet-600 text-white rounded-full text-xs font-bold hover:bg-violet-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 size={14} /> Submit Self-Assessment
                  </button>
                </div>
              )}

              {/* ═══ Senses Check Result ═══ */}
              {sensesResult && (
                <div className="bg-white border-2 border-rose-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">🌈 Senses & Imagery</h4>
                    <button type="button" onClick={() => setSensesResult(null)} className="text-[11px] text-slate-500 hover:text-slate-700 font-bold" aria-label={t("a11y.dismiss_senses_result")}>{t("ui_common.dismiss")}</button>
                  </div>
                  {(() => {
                    const counts = sensesResult.counts || {};
                    const max = Math.max(1, ...Object.values(counts).map(n => Number(n) || 0));
                    const SENSE_LABELS = { sight: '👁️ï¸ Sight', sound: '👂 Sound', smell: '👃 Smell', taste: '👅 Taste', touch: '✋ Touch', motion: '🏃ƒ Motion', emotion: '💗 Emotion' };
                    return (
                      <div className="space-y-1.5">
                        {Object.entries(SENSE_LABELS).map(([k, label]) => {
                          const n = Number(counts[k]) || 0;
                          const pct = (n / max) * 100;
                          const isStrongest = sensesResult.strongest === k;
                          const isMissing = sensesResult.missing === k;
                          return (
                            <div key={k} className="flex items-center gap-2">
                              <div className="text-xs font-bold text-slate-700 w-24 shrink-0">{label}</div>
                              <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${isStrongest ? 'bg-teal-500' : isMissing ? 'bg-amber-400' : 'bg-rose-300'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <div className="text-xs text-slate-700 font-bold w-8 text-right">{n}</div>
                              {isStrongest && <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-full">strongest</span>}
                              {isMissing && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">missing</span>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {sensesResult.suggestion && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-900 leading-relaxed">
                      <strong>Try this:</strong> {sensesResult.suggestion}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ Mentor Match Result ═══ */}
              {mentorMatch && (
                <div role="region" aria-label={t("a11y.mentor_story_analysis")} className="bg-white border-2 border-fuchsia-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-fuchsia-700 uppercase tracking-wider flex items-center gap-2">🎓 Mentor Match</h4>
                    <button type="button" onClick={() => setMentorMatch(null)} className="text-[11px] text-slate-500 hover:text-slate-700 font-bold" aria-label={t("a11y.dismiss_mentor_match")}>{t("ui_common.dismiss")}</button>
                  </div>
                  {mentorMatch.error && (
                    <p className="text-xs text-red-600 italic">{mentorMatch.error}</p>
                  )}
                  {!mentorMatch.error && (
                    <div className="space-y-3">
                      {mentorMatch.mentor && (
                        <article className="bg-fuchsia-50/40 border border-fuchsia-100 rounded-xl p-4">
                          <div className="mb-2">
                            <h5 className="text-base font-black text-fuchsia-900">{mentorMatch.mentor.title || 'Untitled'}</h5>
                            <p className="text-[11px] text-slate-600 italic mt-0.5">— {mentorMatch.mentor.author || 'Unknown'}{mentorMatch.mentor.year ? `, ${mentorMatch.mentor.year}` : ''} (public domain)</p>
                          </div>
                          {mentorMatch.mentor.uncertain
                            ? <p className="text-xs text-slate-700 italic leading-relaxed">{mentorMatch.mentor.text || 'Excerpt withheld — open the source link to read in context.'}</p>
                            : <pre className="whitespace-pre-wrap font-serif text-sm text-slate-800 leading-relaxed bg-white border border-fuchsia-100 rounded-lg p-3">{mentorMatch.mentor.text || ''}</pre>
                          }
                          {mentorMatch.mentor.sourceUrl && (
                            <p className="text-[11px] mt-2">
                              <a href={mentorMatch.mentor.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-fuchsia-700 hover:text-fuchsia-900 font-bold underline" aria-label={`Open source for ${mentorMatch.mentor.title || 'mentor story'} in a new tab`}>
                                Read the full story ↗
                              </a>
                            </p>
                          )}
                          {mentorMatch._grounding && (
                            <p className="text-[10px] text-slate-500 italic mt-2">
                              {mentorMatch._grounding.searchUsed
                                ? `✓ Verified via web search (${mentorMatch._grounding.resultCount} candidates considered, keywords: "${mentorMatch._grounding.keywords}")`
                                : '⚠ No web search available — recommendation comes from the model\'s memory, please double-check.'}
                            </p>
                          )}
                        </article>
                      )}
                      {mentorMatch.sharedTheme && (
                        <div className="bg-white border border-fuchsia-100 rounded-xl p-3">
                          <div className="text-[11px] font-bold text-fuchsia-600 uppercase tracking-widest mb-1">Shared theme</div>
                          <p className="text-xs text-slate-800 leading-relaxed">{mentorMatch.sharedTheme}</p>
                        </div>
                      )}
                      {mentorMatch.craftToBorrow && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-1">Craft to borrow</div>
                          <p className="text-xs text-amber-900 leading-relaxed">{mentorMatch.craftToBorrow}</p>
                        </div>
                      )}
                      {mentorMatch.studentEcho && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                          <div className="text-[11px] font-bold text-green-700 uppercase tracking-widest mb-1">You're already doing this</div>
                          <p className="text-xs text-green-900 leading-relaxed">{mentorMatch.studentEcho}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ Show vs Tell Result ═══ */}
              {showTellResult && (
                <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">🎭 Show vs Tell</h4>
                    <button type="button" onClick={() => setShowTellResult(null)} className="text-[11px] text-slate-500 hover:text-slate-700 font-bold" aria-label={t("a11y.dismiss_show_vs_tell")}>{t("ui_common.dismiss")}</button>
                  </div>
                  {showTellResult.summary && (
                    <p className="text-xs text-emerald-800 italic mb-3 leading-relaxed">{showTellResult.summary}</p>
                  )}
                  {(showTellResult.tellings || []).length === 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 leading-relaxed">
                      ✨ Strong showing throughout — keep it up!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {showTellResult.tellings.map((t, i) => (
                        <div key={i} className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3">
                          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Telling</div>
                          <p className="text-sm text-slate-800 italic leading-relaxed mb-2">"{t.telling}"</p>
                          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1">Try showing</div>
                          <p className="text-sm text-emerald-900 leading-relaxed">"{t.showing}"</p>
                          {t.why && (
                            <p className="text-[11px] text-slate-600 mt-2 italic">{t.why}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ Character Arc Tracker Result ═══ */}
              {arcReport && (
                <div className="bg-white border-2 border-sky-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-sky-700 uppercase tracking-wider flex items-center gap-2">🎬 Character Arcs</h4>
                    <button type="button" onClick={() => setArcReport(null)} className="text-[11px] text-slate-500 hover:text-slate-700 font-bold" aria-label={t("a11y.dismiss_character_arcs")}>{t("ui_common.dismiss")}</button>
                  </div>
                  {arcReport.summary && (
                    <p className="text-xs text-sky-800 italic mb-3 leading-relaxed">{arcReport.summary}</p>
                  )}
                  {(arcReport.characters || []).length === 0 ? (
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900 leading-relaxed">
                      No named characters yet. If you'd like to track arcs, give your main character a name and try again.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {arcReport.characters.map((c, i) => {
                        const beatOrder = [
                          { key: 'introduction', label: 'Intro' },
                          { key: 'want', label: 'Want' },
                          { key: 'change', label: 'Change' },
                          { key: 'resolution', label: 'Resolution' },
                        ];
                        const beatColor = (status) =>
                          status === 'strong' ? 'bg-green-100 border-green-300 text-green-800'
                          : status === 'partial' ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-slate-100 border-slate-300 text-slate-500';
                        return (
                          <article key={i} className="bg-sky-50/40 border border-sky-100 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <h5 className="text-base font-black text-sky-900 truncate">{c.name}</h5>
                              {c.role && (
                                <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">{c.role}</span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                              {beatOrder.map(({ key, label }) => {
                                const beat = c.beats?.[key] || {};
                                const status = beat.status || 'missing';
                                return (
                                  <div key={key} className={`rounded-lg border-2 p-2 ${beatColor(status)}`} title={beat.evidence || `No ${label.toLowerCase()} evidence found`}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest">{label}</div>
                                    <div className="text-[11px] font-black mt-0.5">{status}</div>
                                    {beat.evidence && (
                                      <div className="text-[10px] mt-1 italic line-clamp-2 opacity-80">"{beat.evidence}"</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {c.suggestion && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-900 leading-relaxed">
                                <strong className="text-amber-700">Try this:</strong> {c.suggestion}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ Dialogue Tune-Up Result ═══ */}
              {dialogueReport && (
                <div className="bg-white border-2 border-orange-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider flex items-center gap-2">💬 Dialogue Tune-Up</h4>
                    <button type="button" onClick={() => setDialogueReport(null)} className="text-[11px] text-slate-500 hover:text-slate-700 font-bold" aria-label={t("a11y.dismiss_dialogue_tuneup")}>{t("ui_common.dismiss")}</button>
                  </div>
                  {dialogueReport.summary && (
                    <p className="text-xs text-orange-800 italic mb-3 leading-relaxed">{dialogueReport.summary}</p>
                  )}
                  {/* Tag count chart */}
                  {dialogueReport.tagCounts && Object.keys(dialogueReport.tagCounts).length > 0 && (
                    <div className="bg-orange-50/40 border border-orange-100 rounded-xl p-3 mb-3">
                      <div className="text-[11px] font-bold text-orange-700 uppercase tracking-widest mb-2">Tag usage</div>
                      <div className="space-y-1.5">
                        {(() => {
                          const entries = Object.entries(dialogueReport.tagCounts).sort((a, b) => b[1] - a[1]);
                          const max = Math.max(1, ...entries.map(([, n]) => n));
                          return entries.map(([tag, n]) => {
                            const pct = (n / max) * 100;
                            const isOverused = dialogueReport.overusedTag === tag;
                            return (
                              <div key={tag} className="flex items-center gap-2">
                                <div className="text-xs font-bold text-slate-700 w-20 shrink-0 truncate">{tag}</div>
                                <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${isOverused ? 'bg-amber-400' : 'bg-orange-300'}`} style={{ width: `${pct}%` }} />
                                </div>
                                <div className="text-xs text-slate-700 font-bold w-8 text-right">{n}</div>
                                {isOverused && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">overused</span>}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                  {/* Issue list */}
                  {(dialogueReport.issues || []).length > 0 ? (
                    <div className="space-y-2">
                      {dialogueReport.issues.map((iss, i) => (
                        <div key={i} className="bg-orange-50/40 border border-orange-100 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
                              {iss.type === 'tag-swap' ? 'Tag swap' : iss.type === 'missing-tag' ? 'Add tag' : iss.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 italic leading-relaxed mb-1.5">"{iss.line}"</p>
                          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Try</div>
                          <p className="text-sm text-emerald-900 leading-relaxed">{iss.suggestion}</p>
                          {iss.why && (
                            <p className="text-[11px] text-slate-600 mt-1 italic">{iss.why}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    !dialogueReport.tagCounts || Object.keys(dialogueReport.tagCounts).length === 0 ? null : (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 leading-relaxed">
                        ✨ Dialogue mechanics look strong — no specific suggestions.
                      </div>
                    )
                  )}
                </div>
              )}

              {/* ═══ Revision Plan Result (synthesis capstone) ═══ */}
              {comicFlowReport && layoutMode === 'comic' && (
                <div className="bg-white border-2 border-blue-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2"><Eye size={14} /> Comic Flow Audit</h4>
                    <button type="button" onClick={() => setComicFlowReport(null)} className="text-[11px] text-slate-500 hover:text-slate-700 font-bold" aria-label="Dismiss comic flow audit">{t("ui_common.dismiss")}</button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="shrink-0 w-24 h-24 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center shadow-md">
                      <div className="text-3xl font-black">{Math.round(Number(comicFlowReport.score) || 0)}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest">Flow</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-blue-900 leading-relaxed font-medium">{comicFlowReport.summary}</p>
                      {comicFlowReport.strengths && comicFlowReport.strengths.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {comicFlowReport.strengths.map((s, i) => (
                            <span key={i} className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {comicFlowReport.metrics && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
                      {[
                        ['Panels', comicFlowReport.metrics.panels],
                        ['Captions', `${comicFlowReport.metrics.captions}/${comicFlowReport.metrics.panels}`],
                        ['Art', `${comicFlowReport.metrics.images}/${comicFlowReport.metrics.panels}`],
                        ['Direction', `${comicFlowReport.metrics.directions}/${comicFlowReport.metrics.panels}`],
                        ['Roughs', `${comicFlowReport.metrics.thumbnailRoughs || 0}/${comicFlowReport.metrics.panels}`],
                        ['Shots', comicFlowReport.metrics.shotTypes],
                        ['Moves', comicFlowReport.metrics.transitionTypes],
                        ['Bubbles', comicFlowReport.metrics.bubblePanels],
                      ].map(([label, value]) => (
                        <div key={label} className="bg-blue-50 border border-blue-100 rounded-xl p-2 text-center">
                          <div className="text-sm font-black text-blue-900">{value}</div>
                          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {(comicFlowReport.checks || []).map((check) => (
                      <div key={check.key || check.label} className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="text-xs font-black text-slate-800">{check.label}</div>
                          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-widest ${
                            check.status === 'strong' ? 'bg-green-100 text-green-700'
                            : check.status === 'watch' ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                          }`}>{check.value}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{check.detail}</p>
                      </div>
                    ))}
                  </div>
                  {comicFlowReport.globalSuggestions && comicFlowReport.globalSuggestions.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-3">
                      <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest mb-2">Whole-comic notes</div>
                      <ul className="space-y-1.5">
                        {comicFlowReport.globalSuggestions.map((s, i) => (
                          <li key={i} className="text-xs text-indigo-900 leading-relaxed">- {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {((comicFlowReport.panelNotes || []).length > 0 || (comicFlowReport.suggestions || []).length > 0) && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-blue-700 uppercase tracking-widest">Panel fixes</div>
                      {(comicFlowReport.panelNotes && comicFlowReport.panelNotes.length > 0 ? comicFlowReport.panelNotes : comicFlowReport.suggestions || []).map((note, i) => (
                        <div key={i} className="bg-white border border-blue-100 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {note.panel && <span className="text-[10px] font-black text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">Panel {note.panel}</span>}
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                              note.priority === 'high' ? 'text-red-600' : note.priority === 'low' ? 'text-slate-500' : 'text-amber-600'
                            }`}>{note.priority || 'medium'}</span>
                          </div>
                          {note.issue && <div className="text-xs font-black text-slate-800 mb-1">{note.issue}</div>}
                          {note.suggestion && <p className="text-xs text-slate-700 leading-relaxed">{note.suggestion}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {revisionPlan && (
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-300 rounded-2xl p-5 shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-black text-purple-800 flex items-center gap-2">🗺️ºï¸ Your Revision Plan</h4>
                    <button type="button" onClick={() => setRevisionPlan(null)} className="text-[11px] text-slate-500 hover:text-slate-700 font-bold" aria-label={t("a11y.dismiss_revision_plan")}>{t("ui_common.dismiss")}</button>
                  </div>
                  {revisionPlan.encouragement && (
                    <div className="bg-white border border-green-200 rounded-xl p-3 mb-4 text-xs text-green-900 leading-relaxed">
                      ✨ {revisionPlan.encouragement}
                    </div>
                  )}
                  <ol className="space-y-3" aria-label={t("a11y.prioritized_revision_tasks")}>
                    {(revisionPlan.tasks || []).map((t, i) => (
                      <li key={i} className="bg-white border-2 border-purple-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="bg-purple-600 text-white rounded-full w-7 h-7 shrink-0 flex items-center justify-center font-black text-sm" aria-hidden="true">{i + 1}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h5 className="text-sm font-black text-purple-900">{t.title}</h5>
                              {t.source && (
                                <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">{t.source}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed mb-1">{t.detail}</p>
                            {t.why && (
                              <p className="text-[11px] text-slate-600 italic">{t.why}</p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Character Name Consistency */}
              {characterIssues.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wider mb-2">{t("headings.character_name_check")}</h4>
                  <div className="space-y-1">
                    {characterIssues.map((issue, i) => (
                      <div key={i} className="text-xs text-orange-800">
                        Did you mean <strong>"{issue.expected}"</strong> instead of <span className="line-through text-orange-500">"{issue.found}"</span>?
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-orange-500 mt-2">Tip: Check your character names are spelled consistently throughout the story</p>
                </div>
              )}

              {/* Revision Delta */}
              {revisionSnapshot && draftCount >= 2 && (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4">
                  <div className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Revision Progress (vs. Draft #{draftCount - 1})</div>
                  <div className="flex flex-wrap gap-3">
                    {(() => {
                      const wordDelta = totalWords - (revisionSnapshot.words || 0);
                      const vocabDelta = vocabUsedCount - (revisionSnapshot.vocabUsed || 0);
                      return (
                        <>
                          <span className={`text-xs font-bold ${wordDelta > 0 ? 'text-green-600' : wordDelta < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                            {wordDelta > 0 ? '+' : ''}{wordDelta} words
                          </span>
                          <span className={`text-xs font-bold ${vocabDelta > 0 ? 'text-green-600' : vocabDelta < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                            {vocabDelta > 0 ? '+' : ''}{vocabDelta} vocab terms
                          </span>
                          {readingLevel && revisionSnapshot.grade && (
                            <span className="text-xs font-bold text-indigo-600">
                              Grade level: {revisionSnapshot.grade} → {readingLevel.grade}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Writing Analytics */}
              <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">{t("headings.writing_analytics")}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-2xl font-black text-slate-800">{totalWords}</div>
                    <div className="text-[11px] text-slate-600 font-bold">Words</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-2xl font-black text-slate-800">{readingLevel?.sentences || 0}</div>
                    <div className="text-[11px] text-slate-600 font-bold">Sentences</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-2xl font-black text-slate-800">{paragraphs.length}</div>
                    <div className="text-[11px] text-slate-600 font-bold">Paragraphs</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className="text-2xl font-black text-slate-800">{vocabUsedCount}/{vocabTerms.length}</div>
                    <div className="text-[11px] text-slate-600 font-bold">Vocab Used</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <div className={`text-2xl font-black ${readingLevel ? 'text-indigo-600' : 'text-slate-300'}`}>
                      {readingLevel ? `${readingLevel.grade}` : '—'}
                    </div>
                    <div className="text-[11px] text-slate-600 font-bold">Reading Grade</div>
                  </div>
                </div>
                {readingLevel && (
                  <div className="mt-3 text-xs text-slate-600">
                    Avg {readingLevel.avgWordsPerSentence} words/sentence · Flesch-Kincaid Grade Level: {readingLevel.grade}
                    {(() => {
                      const target = gradeLevelToNumber(gradeLevel);
                      if (target == null) return null; // unknown grade label — don't show a misleading verdict
                      return <span>{readingLevel.grade <= target + 1 ? ' · ✓ On target' : ' · ⚠ May be above target level'}</span>;
                    })()}
                  </div>
                )}

                {/* Story Arc — emotional fortune curve (Vonnegut shapes) */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Story Arc <span className="normal-case tracking-normal text-slate-500 font-medium">· fortune over time</span></div>
                    {onCallGemini && (
                      <button type="button" data-sf-focusable onClick={suggestValenceArc} disabled={valenceLoading}
                        className="text-[11px] font-bold text-violet-600 hover:text-violet-800 disabled:opacity-50 inline-flex items-center gap-1">
                        {valenceLoading ? <span className="animate-spin motion-reduce:animate-none">⏳</span> : <Sparkles size={12} />} {valenceLoading ? 'Reading…' : 'Suggest arc'}
                      </button>
                    )}
                  </div>
                  {(() => {
                    const n = paragraphs.length;
                    const W = 280, H = 70, pad = 8;
                    const vals = paragraphs.map(p => { const v = valenceByPara[p.id]; return typeof v === 'number' ? v : 0; });
                    const px = (i) => pad + (n <= 1 ? (W - 2 * pad) / 2 : (i / (n - 1)) * (W - 2 * pad));
                    const py = (v) => pad + (1 - (v + 5) / 10) * (H - 2 * pad);
                    const pts = vals.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
                    const norm = vals.map(v => (v + 5) / 10);
                    const anySet = paragraphs.some(p => typeof valenceByPara[p.id] === 'number');
                    const match = anySet ? closestStoryShape(norm) : null;
                    return (
                      <>
                        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Emotional fortune of the story across paragraphs" className="overflow-visible">
                          <line x1={pad} y1={py(0)} x2={W - pad} y2={py(0)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                          <text x={pad} y={py(5) + 2} fontSize="7" fill="#94a3b8">😀 good</text>
                          <text x={pad} y={py(-5)} fontSize="7" fill="#94a3b8">😟 bad</text>
                          <polyline fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
                          {vals.map((v, i) => <circle key={i} cx={px(i)} cy={py(v)} r="3" fill="#7c3aed" />)}
                        </svg>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5"><span>Beginning</span><span>End</span></div>
                        <div className="mt-2 space-y-1">
                          {paragraphs.map((p, i) => {
                            const v = typeof valenceByPara[p.id] === 'number' ? valenceByPara[p.id] : 0;
                            return (
                              <div key={p.id} className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-500 font-bold w-7 shrink-0">P{i + 1}</span>
                                <input type="range" min="-5" max="5" step="1" value={v}
                                  onChange={(e) => { const nv = parseInt(e.target.value, 10); setValenceByPara(prev => ({ ...prev, [p.id]: nv })); }}
                                  aria-label={`Fortune for paragraph ${i + 1}, from -5 (bad) to +5 (good)`}
                                  className="flex-1 accent-violet-600" />
                                <span className="text-[11px] text-slate-500 w-6 text-right tabular-nums">{v > 0 ? '+' + v : v}</span>
                              </div>
                            );
                          })}
                        </div>
                        {anySet && match ? (
                          <div className="mt-2 text-[11px] text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-2 py-1.5">
                            {match.weak ? 'Closest shape (loosely): ' : 'Your story looks like a '}<span className="font-black">{match.emoji} {match.label}</span>{match.weak ? '' : '!'} <span className="text-slate-500 font-medium">— a craft lens, not a rule.</span>
                          </div>
                        ) : (
                          <div className="mt-2 text-[11px] text-slate-500 italic">Drag a point or tap "Suggest arc" to map your story's emotional ups &amp; downs.</div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Word Frequency Analysis */}
              {wordFrequency.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">{t("headings.word_frequency")}</h4>
                  <div className="flex flex-wrap gap-2">
                    {wordFrequency.slice(0, 12).map(([word, count]) => (
                      <div key={word} className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${
                        count >= 4 ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`} title={`"${word}" used ${count} times`}>
                        {word} <span className="text-[11px] opacity-60">×{count}</span>
                      </div>
                    ))}
                  </div>
                  {overusedWords.length > 0 && (
                    <p className="mt-2 text-[11px] text-amber-600 font-medium">
                      Tip: Try varying your word choice — <strong>{overusedWords.join(', ')}</strong> {overusedWords.length === 1 ? 'appears' : 'appear'} 4+ times. Use synonyms for variety!
                    </p>
                  )}
                </div>
              )}

              {!gradingResult && !isProcessing && (
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center">
                  <Star size={48} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-600 font-bold">Click "Get Feedback" to receive AI-powered Glow & Grow feedback on your story</p>
                </div>
              )}

              {isProcessing && (
                <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-12 text-center">
                  <RefreshCw size={48} className="text-indigo-400 mx-auto mb-4 animate-spin motion-reduce:animate-none" />
                  <p className="text-indigo-600 font-bold">Reading your story and preparing feedback...</p>
                </div>
              )}

              {gradingResult && (
                <div className="space-y-4">
                  {/* Score Badge */}
                  <div className="text-center">
                    <div className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-2xl text-2xl font-black shadow-lg" title="AI-generated estimate — draft feedback, not a final grade">
                      {gradingResult.totalScore}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1.5 font-medium">AI estimate · draft feedback, not a final grade</div>
                  </div>

                  {/* Glow / Grow */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5">
                      <h4 className="text-sm font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <CheckCircle2 size={16} /> Glow
                      </h4>
                      <p className="text-sm text-green-800 leading-relaxed">{gradingResult.feedback?.glow}</p>
                    </div>
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                      <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <HelpCircle size={16} /> Grow
                      </h4>
                      <p className="text-sm text-amber-800 leading-relaxed">{gradingResult.feedback?.grow}</p>
                    </div>
                  </div>

                  {/* Per-criteria scores (with optional side-by-side Self vs AI) */}
                  {gradingResult.scores && (
                    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-700">{t("headings.score_breakdown")}</h4>
                        {Object.keys(selfAssessment).length > 0 && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-3">
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-violet-400" /> You</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-indigo-500" /> AI</span>
                          </div>
                        )}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {gradingResult.scores.map((s, i) => {
                          const aiScoreNum = (() => {
                            const m = String(s.score || '').match(/(\d+(?:\.\d+)?)/);
                            return m ? parseFloat(m[1]) : null;
                          })();
                          const selfScore = lookupSelfScore(s.criteria);
                          const showCompare = Object.keys(selfAssessment).length > 0 && selfScore != null && aiScoreNum != null;
                          const delta = showCompare ? (aiScoreNum - selfScore) : null;
                          return (
                            <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-800">{s.criteria}</div>
                                <div className="text-xs text-slate-600">{s.comment}</div>
                              </div>
                              {showCompare ? (
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full text-xs font-bold" title={t("tooltips.your_self_rating")}>{selfScore}/5</div>
                                  <span className="text-slate-500 text-xs">→</span>
                                  <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold" title={t("tooltips.ai_score")}>{s.score}</div>
                                  {Math.abs(delta) >= 1 && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${delta > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`} title={delta > 0 ? 'AI rated higher than you did' : 'AI rated lower than you did'}>
                                      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">{s.score}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Vocab usage */}
                  {gradingResult.vocabScores && (
                    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700">{t("headings.vocab_usage")}</h4>
                      </div>
                      <div className="p-4 flex flex-wrap gap-2">
                        {gradingResult.vocabScores.map((vs, i) => (
                          <div key={i} className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${
                            vs.status === 'correct' ? 'bg-green-100 border-green-300 text-green-800' :
                            vs.status === 'partial' ? 'bg-amber-100 border-amber-300 text-amber-800' :
                            'bg-red-100 border-red-300 text-red-800'
                          }`} title={vs.comment}>
                            {vs.status === 'correct' ? '✓' : vs.status === 'partial' ? '~' : '✗'} {vs.term}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ EXPORT PHASE ═══ */}
          {phase === 'export' && (
            <div className={`space-y-6 ${animClass}`}>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black text-slate-800">{t("headings.storybook_ready")}</h3>
                <p className="text-slate-600 text-sm mt-1">Preview your illustrated story and export it</p>
              </div>

              {/* Layout Toggle */}
              <div className="flex justify-center gap-2 mb-4">
                {Object.entries(LAYOUT_MODES).map(([key, m]) => (
                  <button type="button"
                    key={key}
                    onClick={() => setLayoutMode(key)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      layoutMode === key ? 'bg-amber-600 text-white shadow-md' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
              {layoutMode === 'comic' && (
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {Object.entries(COMIC_PAGE_LAYOUTS).map(([key, item]) => (
                    <button type="button"
                      key={key}
                      onClick={() => setComicPageLayout(key)}
                      title={item.desc}
                      aria-pressed={comicPageLayout === key}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                        comicPageLayout === key ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              {layoutMode === 'comic' && (
                <div className="sf-comic-tool-card bg-white border-2 border-blue-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      <div className="text-[11px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen size={14} /> Page Composer
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{comicPageGroups.length} page{comicPageGroups.length === 1 ? '' : 's'} · {paragraphs.length} panel{paragraphs.length === 1 ? '' : 's'}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Panels/page</span>
                      {COMIC_PANELS_PER_PAGE_OPTIONS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateComicPanelsPerPage(value)}
                          aria-pressed={sanitizeComicPageComposer(comicPageComposer).panelsPerPage === value}
                          className={`w-8 h-8 rounded-full text-xs font-black border transition-all ${
                            sanitizeComicPageComposer(comicPageComposer).panelsPerPage === value ? 'bg-blue-700 border-blue-700 text-white shadow-sm' : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => applyComicLetteringPlacement(comicPageGroups, 'Comic')}
                        className="sf-comic-action px-3 py-1.5 rounded-full text-[11px] font-black border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                        title="Place bubble anchors across comic pages while avoiding binding gutters"
                      >
                        <Sparkles size={12} /> Auto-place lettering
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {comicPageGroups.map((page) => {
                      const pageMeta = sanitizeComicPageComposer(comicPageComposer).pages[String(page.page)] || {};
                      const pageStats = getComicPageProductionStats(page, { panelDialogue, panelThumbnails, panelLayouts, illustrations, comicPrintSafety });
                      return (
                        <div key={page.page} className="sf-comic-page-row border border-blue-100 rounded-lg p-3 bg-blue-50/40">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div>
                              <div className="font-black text-slate-800 text-sm">Page {page.page}</div>
                              <div className="text-[10px] font-bold text-slate-500">Panels {page.startPanel}-{page.endPanel}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <div className={`text-[11px] font-black px-2 py-1 rounded-full border ${pageStats.status === 'Review' ? 'bg-rose-50 border-rose-200 text-rose-700' : pageStats.status === 'Ready' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                {pageStats.status}
                              </div>
                              <div className="text-[11px] font-bold text-blue-700 bg-white border border-blue-100 px-2 py-1 rounded-full">Art {pageStats.artPanels}/{pageStats.total}</div>
                              <div className="text-[11px] font-bold text-fuchsia-700 bg-white border border-fuchsia-100 px-2 py-1 rounded-full">Lettering {pageStats.placedBubbles}/{pageStats.bubblePanels}</div>
                              {pageStats.attention > 0 && (
                                <div className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-1 rounded-full">{pageStats.attention} review</div>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <select
                              value={pageMeta.layout || ''}
                              onChange={(e) => updateComicPageMeta(page.page, 'layout', e.target.value)}
                              className="px-3 py-2 rounded-lg border border-blue-100 bg-white text-xs font-bold text-slate-700 focus:border-blue-400"
                              aria-label={`Page ${page.page} layout`}
                            >
                              <option value="">Use global ({getComicPageLayoutLabel(comicPageLayout)})</option>
                              {Object.entries(COMIC_PAGE_LAYOUTS).map(([key, item]) => (
                                <option key={key} value={key}>{item.label}</option>
                              ))}
                            </select>
                            <select
                              value={pageMeta.turn || ''}
                              onChange={(e) => updateComicPageMeta(page.page, 'turn', e.target.value)}
                              className="px-3 py-2 rounded-lg border border-blue-100 bg-white text-xs font-bold text-slate-700 focus:border-blue-400"
                              aria-label={`Page ${page.page} turn`}
                            >
                              {COMIC_PAGE_TURN_OPTIONS.map((option) => (
                                <option key={option.value || 'unset'} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <input
                              value={pageMeta.note || ''}
                              onChange={(e) => updateComicPageMeta(page.page, 'note', e.target.value)}
                              placeholder="Page note"
                              className="px-3 py-2 rounded-lg border border-blue-100 bg-white text-xs text-slate-700 focus:border-blue-400"
                              aria-label={`Page ${page.page} note`}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[10px] font-bold text-slate-500">
                              {pageStats.bubblePanels ? `${pageStats.placedBubbles} of ${pageStats.bubblePanels} bubble panel${pageStats.bubblePanels === 1 ? '' : 's'} anchored` : 'No bubble panels yet'}
                              {pageStats.crowdedBubbles > 0 ? ` - ${pageStats.crowdedBubbles} crowded` : ''}
                              {pageStats.gutterRiskPanels > 0 ? ` - ${pageStats.gutterRiskPanels} near gutter` : ''}
                            </div>
                            <button
                              type="button"
                              onClick={() => applyComicLetteringPlacement(page, `Page ${page.page}`)}
                              className="sf-comic-action px-3 py-1.5 rounded-full text-[11px] font-black border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 flex items-center gap-1"
                              title={`Place safe bubble anchors for page ${page.page}`}
                            >
                              <Sparkles size={12} /> Auto-place this page
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {layoutMode === 'comic' && (() => {
                const printSafety = sanitizeComicPrintSafety(comicPrintSafety);
                return (
                  <div className="sf-comic-tool-card bg-white border-2 border-emerald-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div>
                        <div className="text-[11px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 size={14} /> Print Safety
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{COMIC_PRINT_FORMATS[printSafety.format]?.trim || 'Screen'} · {COMIC_PRINT_FORMATS[printSafety.format]?.safe || 'Safe area'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateComicPrintSafety('showGuides', !printSafety.showGuides)}
                          aria-pressed={printSafety.showGuides}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${printSafety.showGuides ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                        >
                          Guides {printSafety.showGuides ? 'On' : 'Off'}
                        </button>
                        {printSafety.format !== 'digital' && (
                          <button
                            type="button"
                            onClick={() => updateComicPrintSafety('includeBleed', !printSafety.includeBleed)}
                            aria-pressed={printSafety.includeBleed}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${printSafety.includeBleed ? 'bg-emerald-700 border-emerald-700 text-white' : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'}`}
                          >
                            Bleed {printSafety.includeBleed ? 'On' : 'Off'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Format</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(COMIC_PRINT_FORMATS).map(([key, item]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => updateComicPrintSafety('format', key)}
                              aria-pressed={printSafety.format === key}
                              className={`px-3 py-2 rounded-lg text-xs font-bold border text-left transition-all ${printSafety.format === key ? 'bg-emerald-700 border-emerald-700 text-white shadow-sm' : 'bg-white border-emerald-100 text-slate-700 hover:border-emerald-300'}`}
                              title={`${item.trim} · ${item.safe}`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="block">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Gutter</span>
                        <select
                          value={printSafety.gutter}
                          onChange={(e) => updateComicPrintSafety('gutter', e.target.value)}
                          disabled={printSafety.format === 'digital'}
                          className="w-full px-3 py-2 rounded-lg border border-emerald-100 bg-white text-xs font-bold text-slate-700 focus:border-emerald-400 disabled:opacity-60"
                          aria-label="Comic print gutter"
                        >
                          {Object.entries(COMIC_PRINT_GUTTERS).map(([key, item]) => (
                            <option key={key} value={key}>{item.label} {item.width !== 'none' ? `(${item.width})` : ''}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                );
              })()}
              {layoutMode === 'comic' && (
                <div className="sf-comic-tool-card bg-white border-2 border-fuchsia-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      <div className="text-[11px] font-black text-fuchsia-700 uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon size={14} /> Layout Studio
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{Object.keys(sanitizePanelLayouts(panelLayouts)).length} custom layout{Object.keys(sanitizePanelLayouts(panelLayouts)).length === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {paragraphs.map((p, idx) => {
                      const layoutFrame = panelLayouts[p.id] || {};
                      const frame = layoutFrame.frame || '';
                      const hasCustomSpans = layoutFrame.colSpan !== undefined || layoutFrame.rowSpan !== undefined;
                      const panelThumbnail = panelThumbnails[p.id] || {};
                      const letteringSpace = panelThumbnail.letteringSpace || '';
                      const hasCustomBubblePosition = hasComicLetteringPosition(panelThumbnail);
                      const hasCustomBubbleWidth = hasComicLetteringWidth(panelThumbnail);
                      const customBubbleWidth = hasCustomBubbleWidth ? clampComicLetteringWidth(panelThumbnail.letteringWidth) : 72;
                      return (
                        <div key={p.id} className="sf-comic-layout-row border border-fuchsia-100 rounded-lg p-3 bg-fuchsia-50/40">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                            <div>
                              <div className="font-black text-slate-800 text-sm">Panel {idx + 1}</div>
                              <div className="text-[10px] font-bold text-slate-500">Sequence {idx + 1} of {paragraphs.length}</div>
                            </div>
                            <div className="sf-comic-toolbar flex flex-wrap items-center gap-1.5" role="toolbar" aria-label={`Panel ${idx + 1} layout actions`}>
                              <button
                                type="button"
                                onClick={() => moveParagraph(idx, -1)}
                                disabled={idx === 0}
                                className="sf-comic-action px-2 py-1 rounded-md border border-fuchsia-100 bg-white text-[10px] font-black text-slate-700 hover:border-fuchsia-300 disabled:opacity-40 disabled:hover:border-fuchsia-100 flex items-center gap-1"
                                aria-label={`Move panel ${idx + 1} earlier`}
                                title="Move panel earlier"
                              >
                                <ArrowLeft size={11} /> Earlier
                              </button>
                              <button
                                type="button"
                                onClick={() => moveParagraph(idx, 1)}
                                disabled={idx === paragraphs.length - 1}
                                className="sf-comic-action px-2 py-1 rounded-md border border-fuchsia-100 bg-white text-[10px] font-black text-slate-700 hover:border-fuchsia-300 disabled:opacity-40 disabled:hover:border-fuchsia-100 flex items-center gap-1"
                                aria-label={`Move panel ${idx + 1} later`}
                                title="Move panel later"
                              >
                                Later <ArrowRight size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicatePanelAfter(idx)}
                                disabled={paragraphs.length >= maxParagraphs}
                                className="sf-comic-action px-2 py-1 rounded-md border border-fuchsia-100 bg-white text-[10px] font-black text-fuchsia-700 hover:border-fuchsia-300 disabled:opacity-40 disabled:hover:border-fuchsia-100 flex items-center gap-1"
                                aria-label={`Duplicate panel ${idx + 1}`}
                                title={paragraphs.length >= maxParagraphs ? `Panel limit reached (${maxParagraphs})` : 'Duplicate panel'}
                              >
                                <Plus size={11} /> Duplicate
                              </button>
                              <div className="sf-comic-status-pill text-[11px] font-bold text-fuchsia-700 bg-white border border-fuchsia-100 px-2 py-1 rounded-full">
                                {getComicPanelFrameLabel(frame)} · {getComicPanelSpanLabel(layoutFrame, comicPageLayout, idx)}
                              </div>
                            </div>
                          </div>
                          <div className="sf-comic-frame-group flex flex-wrap gap-1.5 mb-2" role="group" aria-label={`Panel ${idx + 1} frame preset`}>
                            {COMIC_PANEL_FRAME_OPTIONS.map((option) => (
                              <button
                                key={option.value || 'auto'}
                                type="button"
                                onClick={() => updatePanelLayout(p.id, 'frame', option.value)}
                                aria-pressed={frame === option.value}
                                className={`sf-comic-frame-choice px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${frame === option.value ? 'sf-comic-frame-choice-active bg-fuchsia-700 border-fuchsia-700 text-white' : 'bg-white border-fuchsia-100 text-slate-700 hover:border-fuchsia-300'}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="text-[10px] font-bold text-slate-500">Drag the preview corner to resize</div>
                            {hasCustomSpans && (
                              <button
                                type="button"
                                onClick={() => updatePanelLayout(p.id, 'resetSpans')}
                                className="sf-comic-action px-2 py-1 rounded-md border border-fuchsia-100 bg-white text-[10px] font-black text-fuchsia-700 hover:border-fuchsia-300"
                              >
                                Reset size
                              </button>
                            )}
                          </div>
                          <label className="block">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Bubble anchor</span>
                            <select
                              value={letteringSpace}
                              onChange={(e) => updatePanelThumbnail(p.id, 'letteringSpace', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-fuchsia-100 bg-white text-xs font-bold text-slate-700 focus:border-fuchsia-400"
                              aria-label={`Panel ${idx + 1} bubble anchor`}
                            >
                              {COMIC_LETTERING_SPACE_OPTIONS.map((option) => (
                                <option key={option.value || 'unset'} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </label>
                          <label className="mt-3 block">
                            <span className="flex items-center justify-between gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                              <span>Bubble width</span>
                              <span>{hasCustomBubbleWidth ? `${customBubbleWidth}%` : 'Auto'}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="28"
                                max="86"
                                step="1"
                                value={customBubbleWidth}
                                onChange={(e) => updatePanelThumbnail(p.id, 'letteringWidth', e.target.value)}
                                className="sf-bubble-width-slider flex-1 accent-fuchsia-700"
                                aria-label={`Panel ${idx + 1} bubble width`}
                                aria-valuetext={hasCustomBubbleWidth ? `${customBubbleWidth} percent` : 'Auto fit'}
                                data-sf-bubble-width-slider={p.id}
                                data-sf-focusable
                              />
                              {hasCustomBubbleWidth && (
                                <button
                                  type="button"
                                  onClick={() => updatePanelThumbnail(p.id, 'resetLetteringWidth')}
                                  className="sf-comic-action h-8 px-2 rounded-md border border-fuchsia-100 bg-white text-[10px] font-black text-fuchsia-700 hover:border-fuchsia-300 flex items-center gap-1"
                                  title="Reset bubble width to auto"
                                  aria-label={`Reset panel ${idx + 1} bubble width to auto`}
                                  data-sf-focusable
                                >
                                  <RefreshCw size={11} aria-hidden="true" /> Auto
                                </button>
                              )}
                            </div>
                          </label>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-500">
                              {hasCustomBubblePosition ? 'Bubble manually placed in preview' : 'Bubble follows selected anchor'}
                            </span>
                            {hasCustomBubblePosition && (
                              <button
                                type="button"
                                onClick={() => updatePanelThumbnail(p.id, 'resetLetteringPosition')}
                                className="sf-comic-action px-2 py-1 rounded-md border border-fuchsia-100 bg-white text-[10px] font-black text-fuchsia-700 hover:border-fuchsia-300"
                              >
                                Reset bubble position
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="sf-comic-preview-shell bg-gradient-to-b from-amber-50 to-white border-2 border-amber-200 rounded-2xl overflow-hidden shadow-lg">
                <div className="text-center p-8 border-b border-amber-200 bg-gradient-to-r from-amber-100/50 to-rose-100/50">
                  {coverArt && <img src={coverArt} alt={t("alts.book_cover")} className="max-w-[200px] mx-auto rounded-xl shadow-lg mb-4 border-2 border-amber-200" />}
                  <h3 className="text-3xl font-black text-amber-900">{storyTitle || storyPrompt || sourceTopic || 'My Story'}</h3>
                  {authorName && <p className="text-amber-800 text-sm mt-1 font-bold">By {authorName}</p>}
                  <p className="text-amber-700 text-sm mt-1 italic">{GENRE_TEMPLATES[genre]?.label || 'Creative Writing'} · {vocabTerms.length} vocabulary terms</p>
                </div>

                {layoutMode === 'comic' ? (
                  /* Page-aware Comic Preview */
                  <>
                  <div className="bg-slate-950 text-white text-center text-[11px] font-black uppercase tracking-widest py-2">
                    {comicPageGroups.length} page{comicPageGroups.length === 1 ? '' : 's'} · Follow the numbered panels
                  </div>
                  <div className="p-4 space-y-4 bg-slate-900">
                    {comicPageGroups.map((page) => {
                      const printSafety = sanitizeComicPrintSafety(comicPrintSafety);
                      const gutterSide = getComicPageGutterSide(page.page, page.layout, printSafety);
                      const turnLabel = getComicPageTurnLabel(page.turn);
                      const previewPageStats = getComicPageProductionStats(page, { panelDialogue, panelThumbnails, panelLayouts, illustrations, comicPrintSafety });
                      return (
                        <section key={`comic-page-${page.page}`} className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950/75 shadow-lg" aria-label={`Comic page ${page.page}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2 bg-slate-950 text-white border-b border-slate-700">
                            <div>
                              <div className="text-xs font-black uppercase tracking-widest">Page {page.page} · {getComicPageLayoutLabel(page.layout)}</div>
                              <div className="text-[10px] text-slate-300 font-bold">Panels {page.startPanel}-{page.endPanel} · {getComicReadingOrderLabel(page.layout)}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                              <span className={`rounded-full border px-2 py-1 ${previewPageStats.status === 'Review' ? 'border-rose-300/50 bg-rose-400/20 text-rose-100' : previewPageStats.status === 'Ready' ? 'border-emerald-300/50 bg-emerald-400/20 text-emerald-100' : 'border-white/20 bg-white/10 text-white'}`}>{previewPageStats.status}</span>
                              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1">Art {previewPageStats.artPanels}/{previewPageStats.total}</span>
                              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1">Lettering {previewPageStats.placedBubbles}/{previewPageStats.bubblePanels}</span>
                              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1">{getComicPrintFormatLabel(printSafety.format)}</span>
                              {gutterSide && <span className="rounded-full border border-rose-300/40 bg-rose-400/20 px-2 py-1">{gutterSide} gutter</span>}
                            </div>
                          </div>
                          <div className={`p-3 grid gap-3 ${page.layout === 'strip' ? 'grid-cols-1' : 'grid-cols-2'}`} style={{ direction: page.layout === 'manga' ? 'rtl' : 'ltr' }}>
                            {page.panels.map(({ paragraph, idx: panelIdx }, pageIndex) => renderComicPreviewPanel(paragraph, panelIdx, page.layout, pageIndex, page))}
                          </div>
                          {previewPageStats.attention > 0 && (
                            <div className="px-3 py-2 bg-rose-950/40 text-rose-100 border-t border-rose-900/60 text-[11px] font-bold flex flex-wrap gap-x-3 gap-y-1">
                              {previewPageStats.unplacedBubbles > 0 && <span>{previewPageStats.unplacedBubbles} lettering anchor{previewPageStats.unplacedBubbles === 1 ? '' : 's'} needed</span>}
                              {previewPageStats.gutterRiskPanels > 0 && <span>{previewPageStats.gutterRiskPanels} gutter conflict{previewPageStats.gutterRiskPanels === 1 ? '' : 's'}</span>}
                              {previewPageStats.crowdedBubbles > 0 && <span>{previewPageStats.crowdedBubbles} crowded bubble panel{previewPageStats.crowdedBubbles === 1 ? '' : 's'}</span>}
                              {previewPageStats.emptyPanels > 0 && <span>{previewPageStats.emptyPanels} empty panel{previewPageStats.emptyPanels === 1 ? '' : 's'}</span>}
                            </div>
                          )}
                          {(turnLabel || page.note) && (
                            <div className="px-3 py-2 bg-slate-900 text-slate-200 border-t border-slate-700 text-[11px] font-bold">
                              {turnLabel && <span>Page turn: {turnLabel}</span>}
                              {page.note && <span>{turnLabel ? ' · ' : ''}{page.note}</span>}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                  </>
                ) : (
                  /* ── Prose Layout ── */
                  <div className="p-6 space-y-6">
                    {paragraphs.map((p, idx) => (
                      <div key={p.id} className="flex flex-col items-center gap-4">
                        {illustrations[p.id]?.imageUrl && (
                          <img src={illustrations[p.id].imageUrl} alt={`Scene ${idx + 1}`} className="max-w-md rounded-xl shadow-md" />
                        )}
                        <p className="text-sm text-slate-800 leading-relaxed max-w-lg text-center" style={{ textIndent: '2em', textAlign: 'left' }}>{p.text}</p>
                        {idx < paragraphs.length - 1 && <div className="text-amber-400 text-lg">—</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Achievement Badges */}
              <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Star size={16} /> Achievements ({earnedCount}/{achievements.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {achievements.map(a => (
                    <div key={a.id} className={`text-center p-2.5 rounded-xl border-2 transition-all ${
                      a.earned ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-50'
                    }`} title={a.desc}>
                      <div className="text-2xl">{a.icon}</div>
                      <div className="text-[11px] font-bold text-slate-700 mt-1">{a.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                <button type="button"
                  onClick={exportStorybook}
                  className="px-8 py-4 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-2xl text-lg font-black hover:from-rose-700 hover:to-pink-700 transition-all shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-3"
                >
                  <Download size={24} /> Export Storybook
                </button>
                {layoutMode === 'comic' && (
                  <button type="button"
                    onClick={exportComicScript}
                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
                  >
                    <Download size={18} /> Comic Script
                  </button>
                )}
                {layoutMode === 'comic' && (
                  <button type="button"
                    onClick={exportComicProductionPack}
                    className="px-6 py-3 bg-blue-700 text-white rounded-2xl text-sm font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                  >
                    <Download size={18} /> Production Pack
                  </button>
                )}
                <button type="button"
                  onClick={exportSlideshow}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                >
                  <Play size={18} /> Slideshow
                </button>
                {liveSession && !isCanvasEnv && (
                  <button type="button"
                    onClick={shareToSession}
                    className="px-6 py-3 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center gap-2"
                  >
                    <Eye size={18} /> Share to Class
                  </button>
                )}
                {onSaveSubmission && (
                  <button type="button"
                    onClick={saveAsSubmission}
                    className="px-6 py-3 bg-amber-600 text-white rounded-2xl text-sm font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 flex items-center gap-2"
                  >
                    <Star size={18} /> Save to Portfolio
                  </button>
                )}
              </div>
              <p className="text-slate-500 text-xs text-center">Storybook & slideshow open in new tabs — print or save as PDF</p>

              {/* ── Class Portfolio Gallery (teacher view) ── */}
              {liveSession && !isCanvasEnv && (
                <div className="bg-white rounded-2xl border-2 border-violet-200 p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-violet-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Eye size={16} /> Class Portfolio
                  </h4>
                  <p className="text-xs text-slate-600 mb-3">Share your storybook to the class gallery so your teacher and classmates can view it. Teacher sees all shared stories as a gallery wall.</p>
                  <button type="button"
                    onClick={shareToSession}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors flex items-center gap-2"
                  >
                    <Star size={14} /> Publish to Class Gallery
                  </button>
                  <p className="text-[11px] text-violet-700 mt-2">Your cover art, title, word count, and grade will be visible to the class.</p>
                </div>
              )}

              {/* ── Pass the Torch — Collaborative JSON Save/Load ── */}
              <div className="bg-white rounded-2xl border-2 border-cyan-200 p-5 shadow-sm">
                <h4 className="text-sm font-bold text-cyan-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <RefreshCw size={16} /> Pass the Torch
                </h4>
                <p className="text-xs text-slate-600 mb-3">Export your draft as a file and share it with a classmate — they can continue where you left off!</p>
                <div className="flex gap-3">
                  <button type="button" onClick={exportDraftJSON} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 transition-colors flex items-center gap-2">
                    <Download size={14} /> Export Draft (.json)
                  </button>
                  <button type="button" onClick={importDraftJSON} className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg text-xs font-bold hover:bg-cyan-200 transition-colors flex items-center gap-2">
                    <Plus size={14} /> Import Classmate's Draft
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer Navigation ── */}
      <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button type="button"
          onClick={goBack}
          disabled={phaseIdx === 0}
          className="px-5 py-2.5 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30 flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="text-xs text-slate-500 font-medium">
          {PHASE_LABELS[phaseIdx]} · Step {phaseIdx + 1} of {PHASES.length}
        </div>
        {phaseIdx < PHASES.length - 1 ? (
          <button type="button"
            onClick={goNext}
            disabled={!canGoNext()}
            className="px-5 py-2.5 rounded-full text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-rose-200"
          >
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={safeClose} className="px-5 py-2.5 rounded-full text-sm font-bold bg-slate-600 text-white hover:bg-slate-700 transition-colors flex items-center gap-2">
            Done <CheckCircle2 size={16} />
          </button>
        )}
      </div>
      </div>
    </div>
  );
});
