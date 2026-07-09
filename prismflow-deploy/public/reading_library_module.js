/* =========================================================================
 * AlloFlow Reading Library (CDN module)
 * =========================================================================
 * Browse + read openly licensed texts, including StoryWeaver / Pratham Books
 * picture books (CC BY 4.0) and curated public/open education sources. Mirrored
 * text, metadata, cue timings and attribution ship in reading_library/.
 *
 * Contract (mirrors catalog_module.js):
 *   - Loads via loadModule('ReadingLibrary', ...) + <CDNModuleGate>.
 *   - Exports window.AlloModules.ReadingLibrary — React component.
 *   - Props: isOpen, onClose, addToast(msg, type), t (optional),
 *     callGemini(prompt) (optional), handleGenerate(type, lang, keep, text)
 *     (optional), setInputText(text) (optional), isTeacherMode (optional).
 *   - No bare t() calls (free-t crash class): tr() guards window.__alloT and
 *     falls back to English when the key echoes back untranslated.
 *   - Theme: root carries .allo-docsuite so .theme-dark/.theme-contrast CSS
 *     remaps the light Tailwind tokens used here.
 * ========================================================================= */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  window.AlloModules = window.AlloModules || {};
  if (window.AlloModules.ReadingLibrary) return;

  var React = window.React;
  if (!React) { console.error('[ReadingLibrary] window.React missing'); return; }
  var e = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;
  var useRef = React.useRef;
  var useCallback = React.useCallback;

  // Data bases tried in order; the first index.json that loads wins and its
  // base serves the per-book files too. CDN first (same origin as this
  // script), GitHub raw second (live as soon as main is pushed), relative
  // last (local dev / future School Box vendoring).
  var DATA_BASES = [
    'https://alloflow-cdn.pages.dev/reading_library/',
    'https://raw.githubusercontent.com/Apomera/AlloFlow/main/reading_library/',
    './reading_library/',
  ];
  var MAX_VISIBLE_BOOKS = 240;

  // StoryWeaver reading levels with their approximate grade bands (their own
  // guidance: L1 emergent, L2 early, L3 fluent-ish, L4 confident). Bands are a
  // guide, not a hard grade lock — a newcomer at any grade may start at L1.
  var LEVEL_LABELS = {
    1: 'Level 1 · First words (≈ K–1)',
    2: 'Level 2 · First sentences (≈ Gr 1–2)',
    3: 'Level 3 · Reading on my own (≈ Gr 2–3)',
    4: 'Level 4 · Longer stories (≈ Gr 3–5)',
    5: 'Level 5 · Middle-grade nonfiction (≈ Gr 6–8)',
    6: 'Level 6 · Upper-grade source text (≈ Gr 9–12)',
  };

  var SOURCE_LABELS = {
    storyweaver: 'StoryWeaver',
    frontiers: 'Frontiers for Young Minds',
    nasa: 'NASA',
    noaa: 'NOAA',
    usgs: 'USGS',
    wikisource: 'Wikisource',
    loc: 'Library of Congress',
    gutenberg: 'Project Gutenberg',
    openstax: 'OpenStax',
    libretexts: 'LibreTexts',
    ck12: 'CK-12',
    unknown: 'Other source',
  };

  var LIBRARY_COLLECTIONS = [
    {
      id: 'stories',
      label: 'Stories',
      sourceLine: 'StoryWeaver picture books',
      summary: 'Leveled picture books for early and multilingual readers.',
      sourceIds: ['storyweaver'],
      defaultLanguage: 'English',
      accent: 'emerald',
    },
    {
      id: 'science',
      label: 'Science & nonfiction',
      sourceLine: 'Frontiers for Young Minds, NASA, NOAA, USGS',
      summary: 'Modern science articles and public-domain explainers for older students.',
      sourceIds: ['frontiers', 'nasa', 'noaa', 'usgs'],
      defaultLanguage: 'English',
      accent: 'sky',
    },
    {
      id: 'history',
      label: 'History & primary sources',
      sourceLine: 'Wikisource, Library of Congress, Project Gutenberg',
      summary: 'Historical documents, speeches, essays, and public-domain classics.',
      sourceIds: ['wikisource', 'loc', 'gutenberg'],
      defaultLanguage: 'English',
      accent: 'amber',
    },
    {
      id: 'study',
      label: 'Textbooks & study guides',
      sourceLine: 'OpenStax open textbooks',
      summary: 'Open textbooks and course-aligned chapters for high school and beyond.',
      sourceIds: ['openstax', 'libretexts', 'ck12'],
      defaultLanguage: 'English',
      accent: 'indigo',
    },
    {
      id: 'all',
      label: 'All sources',
      sourceLine: 'Everything currently available',
      summary: 'A teacher-facing shelf for searching across every imported source.',
      sourceIds: null,
      defaultLanguage: 'English',
      accent: 'slate',
    },
  ];

  function sourceLabel(id) {
    return SOURCE_LABELS[id] || id || SOURCE_LABELS.unknown;
  }

  function bookSourceId(book) {
    if (book && book.sourceId) return String(book.sourceId).toLowerCase();
    if (book && book.source && book.source.id) return String(book.source.id).toLowerCase();
    var raw = [
      book && book.source && book.source.name,
      book && book.source && book.source.url,
      book && book.publisher,
    ].join(' ').toLowerCase();
    if (raw.indexOf('storyweaver') !== -1 || raw.indexOf('pratham') !== -1) return 'storyweaver';
    if (raw.indexOf('frontiers') !== -1) return 'frontiers';
    if (raw.indexOf('nasa') !== -1) return 'nasa';
    if (raw.indexOf('noaa') !== -1) return 'noaa';
    if (raw.indexOf('usgs') !== -1) return 'usgs';
    if (raw.indexOf('wikisource') !== -1) return 'wikisource';
    if (raw.indexOf('loc.gov') !== -1 || raw.indexOf('library of congress') !== -1) return 'loc';
    if (raw.indexOf('gutenberg') !== -1) return 'gutenberg';
    if (raw.indexOf('openstax') !== -1) return 'openstax';
    if (raw.indexOf('libretexts') !== -1) return 'libretexts';
    if (raw.indexOf('ck-12') !== -1 || raw.indexOf('ck12') !== -1) return 'ck12';
    if (book && book.file && String(book.file).indexOf('books/') === 0) return 'storyweaver';
    return 'unknown';
  }

  function collectionById(id) {
    return LIBRARY_COLLECTIONS.filter(function (c) { return c.id === id; })[0] || null;
  }

  function collectionForBook(book) {
    var source = bookSourceId(book);
    return LIBRARY_COLLECTIONS.filter(function (c) {
      return c.sourceIds && c.sourceIds.indexOf(source) !== -1;
    })[0] || LIBRARY_COLLECTIONS[0];
  }

  function bookMatchesCollection(book, collection) {
    if (!collection || !collection.sourceIds) return true;
    return collection.sourceIds.indexOf(bookSourceId(book)) !== -1;
  }

  // --- i18n guard (free-t crash class + raw-key echo both handled) --------
  function tr(key, fallback) {
    try {
      if (typeof window.__alloT === 'function') {
        var r = window.__alloT(key);
        if (r && typeof r === 'string' && r !== key) return r;
      }
    } catch (_) {}
    return fallback || key;
  }

  function speak(text, language) {
    try {
      if (window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function') {
        window.AlloSpeechPlayer.speak(text, { language: language });
        return true;
      }
    } catch (_) {}
    return false;
  }

  function stopSpeech() {
    try { if (window.AlloSpeechPlayer) window.AlloSpeechPlayer.stop(); } catch (_) {}
  }

  // --- reader accessibility preferences (per-device, session-to-session) ---
  // Host font/reading-theme classes are applied to the WORKSPACE container and
  // do not cascade into this fixed-position modal (html font-size and the
  // global line-height/letter-spacing overrides DO cascade) — so the reader
  // keeps its own lightweight prefs and also honors the app-wide font choice.
  var READER_PREFS_KEY = 'allo_reading_lib_prefs';
  var READER_PREFS_DEFAULTS = { font: 'default', textScale: 1, lineHeight: 0, letterSpacing: 0, theme: 'default', ruler: false };
  function loadReaderPrefs() {
    try {
      var raw = localStorage.getItem(READER_PREFS_KEY);
      var p = raw ? JSON.parse(raw) : {};
      var out = {};
      for (var k in READER_PREFS_DEFAULTS) out[k] = (p && p[k] != null) ? p[k] : READER_PREFS_DEFAULTS[k];
      return out;
    } catch (_) { return Object.assign({}, READER_PREFS_DEFAULTS); }
  }
  function saveReaderPrefs(p) {
    try { localStorage.setItem(READER_PREFS_KEY, JSON.stringify(p)); } catch (_) {}
  }

  // Page-surface palettes (mirrors the host's reading-theme options; the host
  // map lives in ANTI and only styles the leveled-text area, so the reader
  // carries its own copy). fg applies to the book text, bg to the page area.
  var READER_THEMES = [
    { id: 'default', label: 'Default', bg: '', fg: '' },
    { id: 'warm', label: 'Warm', bg: '#fdf6e3', fg: '#433422' },
    { id: 'sepia', label: 'Sepia', bg: '#f4ecd8', fg: '#5b4636' },
    { id: 'dark', label: 'Dark', bg: '#1e293b', fg: '#e2e8f0' },
    { id: 'highContrast', label: 'High contrast', bg: '#000000', fg: '#ffffff' },
    { id: 'blue', label: 'Blue tint', bg: '#e8f0fe', fg: '#1e293b' },
  ];
  function readerTheme(id) {
    return READER_THEMES.filter(function (t) { return t.id === id; })[0] || READER_THEMES[0];
  }

  // Accessibility font choices. Classes come from the host's UI font library
  // (.font-x, .font-x * { font-family !important }) which is injected app-wide;
  // OpenDyslexic's @font-face is loaded globally by the host style block.
  var READER_FONTS = [
    { id: 'default', label: 'Default', cssClass: '' },
    { id: 'opendyslexic', label: 'OpenDyslexic', cssClass: 'font-opendyslexic' },
    { id: 'atkinson', label: 'Atkinson', cssClass: 'font-atkinson' },
    { id: 'lexend', label: 'Lexend', cssClass: 'font-lexend' },
  ];
  var READER_A11Y_FONT_IDS = ['opendyslexic', 'atkinson', 'lexend', 'andika'];
  function readerFontClass(prefFont) {
    // Reader-local pick wins; otherwise honor an app-wide accessibility font
    // (the workspace class doesn't reach this modal, so re-apply it here).
    var id = prefFont;
    if (!id || id === 'default') {
      try {
        var appFont = localStorage.getItem('allo_selected_font');
        if (appFont && READER_A11Y_FONT_IDS.indexOf(appFont) !== -1) id = appFont;
      } catch (_) {}
    }
    if (!id || id === 'default') return '';
    var own = READER_FONTS.filter(function (f) { return f.id === id; })[0];
    if (own && own.cssClass) return own.cssClass;
    var lib = (window.FONT_OPTIONS || []).filter(function (f) { return f.id === id; })[0];
    return (lib && lib.cssClass) || '';
  }

  // Link-out "source cards" (3 canned pages + Open original) vs readable text.
  function isCardContent(book) {
    return /card/.test(String((book && book.contentType) || ''));
  }

  // Assign narration cue ids to whitespace tokens of the page text by walking
  // both sequences in order (punctuation-insensitive compare). Tokens without
  // a confident match simply get no cue — they still render, just never
  // highlight. Exposed as a static for the harness.
  function assignCues(text, words) {
    var tokens = String(text || '').split(/\n/).map(function (line) {
      return line.split(/\s+/).filter(Boolean);
    });
    if (!words || !words.length) {
      return tokens.map(function (line) {
        return line.map(function (w) { return { w: w, cue: null }; });
      });
    }
    var norm = function (s) {
      return String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    };
    var ptr = 0;
    return tokens.map(function (line) {
      return line.map(function (w) {
        var cue = null;
        if (ptr < words.length) {
          var a = norm(w);
          var b = norm(words[ptr][1]);
          if (a && a === b) { cue = words[ptr][0]; ptr++; }
          else if (ptr + 1 < words.length && a && a === norm(words[ptr + 1][1])) { ptr += 1; cue = words[ptr][0]; ptr++; }
        }
        return { w: w, cue: cue };
      });
    });
  }

  // cues: [[id, startSec, endSec], ...] sorted by start.
  function findActiveCue(cues, tSec) {
    if (!cues || !cues.length) return null;
    var active = null;
    for (var i = 0; i < cues.length; i++) {
      if (cues[i][1] <= tSec) { if (tSec < cues[i][2] + 0.35) active = cues[i][0]; }
      else break;
    }
    return active;
  }

  function pageCueRange(page) {
    if (!page || !page.words || !page.words.length) return null;
    var ids = page.words.map(function (w) { return w[0]; });
    return [Math.min.apply(null, ids), Math.max.apply(null, ids)];
  }

  // Picture-book text layout: short text bursts sit centered under the artwork
  // (the picture-book convention — left-hugging text under a centered image
  // reads as misaligned); longer level-3/4 passages stay start-aligned for
  // readability (also correct for RTL, which 'text-left' would break). Early
  // levels get a larger face.
  function textLayoutClass(level, text) {
    var levelStr = String(level);
    var size = (levelStr === '1' || levelStr === '2') ? 'text-2xl' : (levelStr === '5' || levelStr === '6') ? 'text-base sm:text-lg' : 'text-xl';
    var align = String(text || '').replace(/\s+/g, ' ').length <= 220 ? ' text-center' : '';
    return size + align;
  }

  function cleanReadingText(value) {
    if (value == null) return '';
    if (Array.isArray(value)) {
      value = value.filter(function (v) { return typeof v === 'string' || typeof v === 'number'; }).join('\n');
    }
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    return String(value)
      .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
      .replace(/!\[[^\]]*]\[[^\]]*]/g, ' ')
      .replace(/<figure[\s\S]*?<\/figure>/gi, ' ')
      .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, ' ')
      .replace(/<picture[\s\S]*?<\/picture>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<img\b[^>]*>/gi, ' ')
      .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g, ' ')
      .replace(/\b(?:https?:\/\/|file:\/\/)\S+\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?\S*)?/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  function pageTextForPipeline(page) {
    if (page == null) return '';
    if (typeof page === 'string' || typeof page === 'number' || Array.isArray(page)) return cleanReadingText(page);
    if (typeof page !== 'object') return '';
    if (Object.prototype.hasOwnProperty.call(page, 'text')) return cleanReadingText(page.text);
    return '';
  }

  function bookPlainTextFromPages(title, pages) {
    var parts = [];
    var cleanTitle = cleanReadingText(title);
    if (cleanTitle) parts.push(cleanTitle);
    (Array.isArray(pages) ? pages : []).forEach(function (p) {
      var text = pageTextForPipeline(p);
      if (text) parts.push(text);
    });
    return parts.join('\n\n').trim();
  }

  function bookPlainText(book) {
    if (!book) return '';
    return bookPlainTextFromPages(book.title, book.pages);
  }

  function countWords(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  function clampIndex(n, min, max) {
    n = Number(n);
    if (!Number.isFinite(n)) n = min;
    return Math.max(min, Math.min(max, Math.floor(n)));
  }

  function firstSectionHeading(text) {
    var lines = String(text || '').split(/\n/).map(function (line) {
      return cleanReadingText(line).replace(/\s+/g, ' ').trim();
    }).filter(Boolean).slice(0, 12);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.length > 90) continue;
      if (/^(chapter|section|part|book)\s+([ivxlcdm]+|\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b[\s\S]*$/i.test(line)) return line;
      if (/^(preface|introduction|prologue|epilogue|appendix|contents)$/i.test(line)) return line;
    }
    return '';
  }

  function detectReadingSections(title, pages) {
    pages = Array.isArray(pages) ? pages : [];
    var starts = [];
    pages.forEach(function (page, idx) {
      var heading = firstSectionHeading(pageTextForPipeline(page));
      if (!heading) return;
      var prev = starts[starts.length - 1];
      if (prev && prev.title.toLowerCase() === heading.toLowerCase()) return;
      starts.push({ title: heading, start: idx });
    });
    if (!starts.length) return [];
    var ranges = [];
    if (starts[0].start > 0) ranges.push({ title: 'Opening material', start: 0, end: starts[0].start - 1 });
    starts.forEach(function (section, idx) {
      var next = starts[idx + 1];
      ranges.push({
        title: section.title,
        start: section.start,
        end: next ? next.start - 1 : pages.length - 1,
      });
    });
    return ranges.filter(function (r) { return r.end >= r.start; });
  }

  function sectionForPage(sections, pageIdx) {
    sections = Array.isArray(sections) ? sections : [];
    for (var i = 0; i < sections.length; i++) {
      if (pageIdx >= sections[i].start && pageIdx <= sections[i].end) return sections[i];
    }
    return null;
  }

  function isLongFormBook(book, pages) {
    pages = Array.isArray(pages) ? pages : [];
    var words = book && book.stats && Number(book.stats.words);
    return !!(
      (book && book.contentType === 'public-domain-full-text') ||
      pages.length > 30 ||
      (Number.isFinite(words) && words > 10000)
    );
  }

  function pageRangeLabel(start, end) {
    return start === end ? 'Page ' + (start + 1) : 'Pages ' + (start + 1) + '-' + (end + 1);
  }

  function bookPlainTextForScope(title, pages, scope, pageIdx, rangeStartPage, rangeEndPage, sections) {
    pages = Array.isArray(pages) ? pages : [];
    if (!pages.length) return { text: cleanReadingText(title), label: 'No pages', start: 0, end: 0, wordCount: 0 };
    var max = pages.length - 1;
    var safePage = clampIndex(pageIdx, 0, max);
    var active = scope || 'whole';
    var start = 0;
    var end = max;
    var label = 'Whole text';
    if (active === 'page') {
      start = safePage; end = safePage; label = pageRangeLabel(start, end);
    } else if (active === 'chapter') {
      var section = sectionForPage(sections, safePage);
      if (section) {
        start = clampIndex(section.start, 0, max);
        end = clampIndex(section.end, start, max);
        label = section.title + ' (' + pageRangeLabel(start, end) + ')';
      } else {
        start = safePage; end = safePage; label = pageRangeLabel(start, end);
      }
    } else if (active === 'range') {
      start = clampIndex(Number(rangeStartPage) - 1, 0, max);
      end = clampIndex(Number(rangeEndPage) - 1, start, max);
      label = pageRangeLabel(start, end);
    }
    if (active === 'whole') {
      var whole = bookPlainTextFromPages(title, pages);
      return { text: whole, label: label, start: 0, end: max, wordCount: countWords(whole) };
    }
    var body = bookPlainTextFromPages('', pages.slice(start, end + 1));
    var cleanTitle = cleanReadingText(title);
    var text = [cleanTitle, 'Selection: ' + label, body].filter(Boolean).join('\n\n').trim();
    return { text: text, label: label, start: start, end: end, wordCount: countWords(text) };
  }

  // ------------------------------------------------------- AI translation
  // Instant AI translation fills the languages StoryWeaver doesn't cover
  // (Somali, Ukrainian, …). Trade-offs are shown to the user in-reader:
  // the text is AI-generated (not publisher-reviewed) and word-by-word
  // narration highlighting is unavailable (cue timings only exist for the
  // original narration audio).

  // Quick picks for the translate menu — languages StoryWeaver lacks
  // entirely (verified 2026-07-06) or nearly. Free-text accepts any other.
  var GAP_LANGS = ['Somali', 'Ukrainian', 'Tigrinya', 'Hmong', 'Karen', 'Kurdish', 'Albanian', 'Bosnian', 'Mongolian', 'Uzbek', 'Hebrew', 'Czech', 'Hungarian', 'Swedish'];

  var RTL_TARGETS = ['arabic', 'hebrew', 'farsi', 'persian', 'urdu', 'pashto', 'dari', 'kurdish', 'sorani', 'sindhi', 'uyghur', 'yiddish'];
  function isRtlLanguage(name) {
    var n = String(name || '').toLowerCase();
    return RTL_TARGETS.some(function (l) { return n.indexOf(l) !== -1; });
  }

  // Best-effort BCP47 for the lang attribute (helps screen readers pick a
  // voice); unknown names simply omit the attribute.
  var LANG_CODES = {
    somali: 'so', ukrainian: 'uk', tigrinya: 'ti', hmong: 'hmn', karen: 'kar',
    kurdish: 'ku', albanian: 'sq', bosnian: 'bs', mongolian: 'mn', uzbek: 'uz',
    hebrew: 'he', czech: 'cs', hungarian: 'hu', swedish: 'sv', finnish: 'fi',
    somali_maay: 'so', arabic: 'ar', spanish: 'es', french: 'fr', portuguese: 'pt',
    vietnamese: 'vi', russian: 'ru', german: 'de', english: 'en',
  };
  function langCodeFor(name) {
    return LANG_CODES[String(name || '').toLowerCase().replace(/[^a-z]+/g, '_')] || null;
  }

  // Parse the model's translation JSON. The page count MUST match the
  // original so every page turn still lines up with its artwork; a mismatch
  // rejects the whole translation rather than desyncing the book.
  function parseTranslation(raw, pageCount) {
    var s = String(raw || '');
    var a = s.indexOf('{');
    var b = s.lastIndexOf('}');
    if (a === -1 || b <= a) return null;
    var data = null;
    try { data = JSON.parse(s.slice(a, b + 1)); } catch (_) { return null; }
    if (!data || !Array.isArray(data.pages) || data.pages.length !== pageCount) return null;
    return {
      title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : null,
      pages: data.pages.map(function (p) { return String(p == null ? '' : p); }),
    };
  }

  function attributionLine(book) {
    var bits = [];
    if (book.authors && book.authors.length) bits.push(tr('readinglib_written_by', 'Written by') + ' ' + book.authors.join(', '));
    if (book.illustrators && book.illustrators.length) bits.push(tr('readinglib_illustrated_by', 'Illustrated by') + ' ' + book.illustrators.join(', '));
    if (book.originalAuthors && book.originalAuthors.length && String(book.originalAuthors) !== String(book.authors)) {
      bits.push(tr('readinglib_original_story', 'Original story') + ': ' + book.originalAuthors.join(', '));
    }
    if (book.publisher) bits.push(book.publisher);
    return bits.join(' · ');
  }

  // ------------------------------------------------------------------ fetch
  function fetchIndex(cb) {
    var tryBase = function (i) {
      if (i >= DATA_BASES.length) { cb(new Error(tr('readinglib_err_unreachable', 'Library data not reachable yet')), null, null); return; }
      var bust = DATA_BASES[i].indexOf('http') === 0 ? '?t=' + Date.now() : '';
      fetch(DATA_BASES[i] + 'index.json' + bust)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) {
          if (!data || !Array.isArray(data.books)) throw new Error('bad index shape');
          cb(null, data, DATA_BASES[i]);
        })
        .catch(function () { tryBase(i + 1); });
    };
    tryBase(0);
  }

  // ------------------------------------------------------------ word popups
  function WordPopup(props) {
    var d = props.data;
    if (!d) return null;
    var style = {
      position: 'fixed',
      left: Math.min(d.x, (window.innerWidth || 800) - 280) + 'px',
      top: (d.y + 12) + 'px',
      zIndex: 90,
      maxWidth: '260px',
    };
    var body;
    if (d.loading) {
      body = e('div', { className: 'text-sm text-slate-500 italic' }, tr('readinglib_thinking', 'Thinking…'));
    } else if (d.type === 'phonics' && d.phonics) {
      body = e('div', { className: 'text-sm text-slate-700 space-y-1' },
        d.phonics.syllables ? e('div', null, e('span', { className: 'font-semibold' }, tr('readinglib_syllables', 'Syllables') + ': '), d.phonics.syllables) : null,
        d.phonics.phoneticSpelling ? e('div', null, e('span', { className: 'font-semibold' }, tr('readinglib_sounds_like', 'Sounds like') + ': '), d.phonics.phoneticSpelling) : null,
        d.phonics.ipa ? e('div', { className: 'text-slate-500' }, 'IPA: ' + d.phonics.ipa) : null
      );
    } else {
      body = e('div', { className: 'text-sm text-slate-700' }, d.text || tr('readinglib_no_definition', 'No definition available.'));
    }
    return e('div', { style: style, className: 'bg-white border border-slate-200 rounded-xl shadow-lg p-3', role: 'status' },
      e('div', { className: 'flex items-center justify-between gap-2 mb-1' },
        e('span', { className: 'font-bold text-indigo-700' }, d.word),
        e('button', {
          className: 'text-slate-400 hover:text-slate-600 text-sm px-1',
          onClick: props.onClose,
          'aria-label': tr('readinglib_close', 'Close'),
        }, '✕')
      ),
      body
    );
  }

  // -------------------------------------------------------- practice panel
  function PracticePanel(props) {
    var book = props.book;
    var _s = useState('idle'); var status = _s[0]; var setStatus = _s[1];
    var _r = useState(null); var result = _r[0]; var setResult = _r[1];
    var _err = useState(null); var error = _err[0]; var setError = _err[1];
    var recRef = useRef(null);
    var chunksRef = useRef([]);
    var startedAtRef = useRef(0);

    useEffect(function () {
      return function () {
        try {
          if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
          if (recRef.current && recRef.current.stream) recRef.current.stream.getTracks().forEach(function (t) { t.stop(); });
        } catch (_) {}
      };
    }, []);

    var start = function () {
      setError(null); setResult(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(tr('readinglib_no_mic_api', 'Microphone recording is not available in this browser.'));
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var rec = new MediaRecorder(stream);
        recRef.current = rec;
        chunksRef.current = [];
        rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
        rec.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          analyze(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }));
        };
        startedAtRef.current = Date.now();
        rec.start();
        setStatus('recording');
      }).catch(function () {
        setError(tr('readinglib_mic_denied', 'Could not use the microphone. Check permissions and try again.'));
      });
    };

    var stop = function () {
      if (recRef.current && recRef.current.state !== 'inactive') { setStatus('processing'); recRef.current.stop(); }
    };

    var analyze = function (blob) {
      var seconds = Math.max(1, (Date.now() - startedAtRef.current) / 1000);
      var fl = window.AlloModules && window.AlloModules.Fluency;
      if (!fl || typeof fl.analyzeFluencyWithGemini !== 'function') {
        setStatus('idle');
        setError(tr('readinglib_no_fluency', 'The fluency tools have not loaded yet — try again in a moment.'));
        return;
      }
      var reader = new FileReader();
      reader.onloadend = function () {
        var base64 = String(reader.result || '').split(',')[1] || '';
        var refText = props.refText || bookPlainText(book);
        var refCount = refText.split(/\s+/).filter(Boolean).length;
        fl.analyzeFluencyWithGemini(base64, blob.type || 'audio/webm', refText)
          .then(function (analysis) {
            var metrics = null;
            try {
              if (analysis && analysis.wordData && typeof fl.calculateLocalFluencyMetrics === 'function') {
                metrics = fl.calculateLocalFluencyMetrics(analysis.wordData, seconds, refCount);
              }
            } catch (_) {}
            setResult({ analysis: analysis, metrics: metrics, seconds: Math.round(seconds) });
            setStatus('done');
          })
          .catch(function (err) {
            setStatus('idle');
            setError(tr('readinglib_analyze_failed', 'Could not analyze the recording.') + ' ' + (err && err.message ? err.message : ''));
          });
      };
      reader.readAsDataURL(blob);
    };

    return e('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3' },
      e('div', { className: 'flex items-center justify-between gap-2' },
        e('h4', { className: 'font-bold text-slate-800' }, '🎙️ ' + tr('readinglib_practice_title', 'Practice reading this book')),
        e('button', { className: 'text-slate-500 hover:text-slate-700 text-sm', onClick: props.onClose, 'aria-label': tr('readinglib_close', 'Close') }, '✕')
      ),
      e('p', { className: 'text-xs text-slate-600 mt-1' },
        tr('readinglib_practice_hint', 'Read the whole book out loud, then stop the recording. An AI listens and estimates accuracy — it is practice feedback, not a test score, and nothing is saved.')),
      status === 'idle' ? e('button', {
        className: 'mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700',
        onClick: start,
      }, tr('readinglib_start_recording', 'Start recording')) : null,
      status === 'recording' ? e('button', {
        className: 'mt-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 animate-pulse',
        onClick: stop,
      }, '⏹ ' + tr('readinglib_stop_recording', 'Stop and check')) : null,
      status === 'processing' ? e('div', { className: 'mt-2 text-sm text-slate-600 italic' }, tr('readinglib_listening', 'Listening back…')) : null,
      error ? e('div', { className: 'mt-2 text-sm text-red-700' }, error) : null,
      status === 'done' && result ? e('div', { className: 'mt-2 space-y-1' },
        result.metrics ? e('div', { className: 'flex gap-3 flex-wrap' },
          e('span', { className: 'px-2 py-1 rounded-lg bg-white border border-amber-200 text-sm font-semibold text-slate-800' },
            tr('readinglib_accuracy', 'Accuracy') + ': ' + result.metrics.accuracy + '%'),
          e('span', { className: 'px-2 py-1 rounded-lg bg-white border border-amber-200 text-sm font-semibold text-slate-800' },
            tr('readinglib_wcpm', 'Words correct per minute') + ': ' + result.metrics.wcpm)
        ) : null,
        result.analysis && result.analysis.feedback ? e('p', { className: 'text-sm text-slate-700' }, result.analysis.feedback) : null,
        e('p', { className: 'text-xs text-slate-500 italic' },
          tr('readinglib_practice_caveat', 'AI estimate from one reading — celebrate progress, not the number.'))
      ) : null
    );
  }

  // --------------------------------------------------------------- reader
  function BookReader(props) {
    var book = props.book;
    var _pg = useState(0); var pageIdx = _pg[0]; var setPageIdx = _pg[1];
    var _cue = useState(null); var activeCue = _cue[0]; var setActiveCue = _cue[1];
    var _play = useState(false); var narrating = _play[0]; var setNarrating = _play[1];
    var _mode = useState('read'); var mode = _mode[0]; var setMode = _mode[1];
    var _pop = useState(null); var popup = _pop[0]; var setPopup = _pop[1];
    var _prac = useState(false); var showPractice = _prac[0]; var setShowPractice = _prac[1];
    var _gen = useState(false); var genOpen = _gen[0]; var setGenOpen = _gen[1];
    var _scope = useState('auto'); var sourceScope = _scope[0]; var setSourceScope = _scope[1];
    var _rs = useState(''); var rangeStartInput = _rs[0]; var setRangeStartInput = _rs[1];
    var _re = useState(''); var rangeEndInput = _re[0]; var setRangeEndInput = _re[1];
    // AI translation: null | {status:'loading',language} | {status:'ready',
    // language, title, pages[], isRtl, langCode}. Ephemeral — never persisted.
    var _tx = useState(null); var translation = _tx[0]; var setTranslation = _tx[1];
    var _txm = useState(false); var txMenuOpen = _txm[0]; var setTxMenuOpen = _txm[1];
    var _txi = useState(''); var txInput = _txi[0]; var setTxInput = _txi[1];
    // Reading supports: persisted text/display prefs + overlay launchers.
    var _prefs = useState(loadReaderPrefs); var readerPrefs = _prefs[0]; var setReaderPrefsState = _prefs[1];
    var _aa = useState(false); var aaOpen = _aa[0]; var setAaOpen = _aa[1];
    var _tools = useState(false); var toolsOpen = _tools[0]; var setToolsOpen = _tools[1];
    var _ovl = useState(null); var overlay = _ovl[0]; var setOverlay = _ovl[1]; // 'focus' | 'karaoke' | 'crawl'
    var _ry = useState(null); var rulerY = _ry[0]; var setRulerY = _ry[1];
    var _rate = useState(1); var narrationRate = _rate[0]; var setNarrationRate = _rate[1];
    var setReaderPrefs = function (patch) {
      setReaderPrefsState(function (prev) {
        var next = Object.assign({}, prev, patch);
        saveReaderPrefs(next);
        return next;
      });
    };
    var audioRef = useRef(null);
    var fbAtRef = useRef(0); // debounce narration→TTS fallback (play-reject + onError can both fire)

    var pages = book.pages || [];
    var page = pages[pageIdx] || null;
    // Two independent capabilities. A book can have the human-narration mp3
    // but NO cue timings — StoryWeaver serves the audio publicly yet some VTT
    // cue files 403 on their bucket. In that case we still play the real
    // narration; we just can't word-highlight or auto-turn pages. Downgrading
    // the whole feature to robotic TTS (the old behavior) threw away real audio.
    var hasAudioTrack = !!(book.audio && book.audio.src);
    var hasCues = !!(book.audio && book.audio.cues && book.audio.cues.length);

    // What's on screen: the original book, or its AI translation. Everything
    // downstream (TTS, popups, practice, generate, export) follows the
    // displayed text/language so what you see is what you act on.
    var txReady = !!(translation && translation.status === 'ready');
    var displayTitle = txReady && translation.title ? translation.title : book.title;
    var displayLanguage = txReady ? translation.language : book.language;
    var displayRtl = txReady ? translation.isRtl : book.isRtl;
    var displayPageText = txReady ? cleanReadingText(translation.pages[pageIdx] || '') : pageTextForPipeline(page);
    var displayPlainText = txReady
      ? bookPlainTextFromPages(displayTitle, translation.pages)
      : bookPlainText(book);
    var sourcePages = txReady
      ? translation.pages.map(function (text, idx) { return { n: idx + 1, img: null, text: text }; })
      : pages;
    var sourceSections = useMemo(function () { return detectReadingSections(displayTitle, sourcePages); }, [displayTitle, sourcePages]);
    var longForm = isLongFormBook(book, sourcePages);
    var currentSection = sectionForPage(sourceSections, pageIdx);
    var defaultScope = longForm ? 'page' : 'whole';
    var selectedScopeName = sourceScope === 'auto' ? defaultScope : sourceScope;
    if (selectedScopeName === 'chapter' && !currentSection) selectedScopeName = 'page';
    if (selectedScopeName === 'range' && sourcePages.length <= 1) selectedScopeName = 'page';
    var selectedSource = bookPlainTextForScope(
      displayTitle,
      sourcePages,
      selectedScopeName,
      pageIdx,
      rangeStartInput || (pageIdx + 1),
      rangeEndInput || (pageIdx + 1),
      sourceSections
    );
    var bookSourceName = (book.source && book.source.name) || sourceLabel(bookSourceId(book));
    var bookSourceUrl = (book.source && book.source.url) || '#';
    var bookSourceHref = bookSourceUrl && bookSourceUrl !== '#' ? bookSourceUrl : '';

    // Reading-support derivations. Theme colors go on the page area + text;
    // font class re-applies the accessibility font inside this fixed modal.
    var pageTheme = readerTheme(readerPrefs.theme);
    var fontClass = readerFontClass(readerPrefs.font);
    var textStyle = {};
    if (readerPrefs.textScale && readerPrefs.textScale !== 1) textStyle.fontSize = readerPrefs.textScale + 'em';
    if (readerPrefs.lineHeight) textStyle.lineHeight = readerPrefs.lineHeight;
    if (readerPrefs.letterSpacing) textStyle.letterSpacing = readerPrefs.letterSpacing + 'em';
    if (pageTheme.fg) textStyle.color = pageTheme.fg;
    // What the immersive overlays read: whole book for picture books; current
    // chapter (or page) for long-form texts so RSVP/karaoke stay tractable.
    var overlayText = longForm
      ? (currentSection
          ? bookPlainTextForScope(displayTitle, sourcePages, 'chapter', pageIdx, 1, 1, sourceSections).text
          : displayPageText)
      : displayPlainText;

    // Keep human-narration playback speed in sync with the picker.
    useEffect(function () {
      var a = audioRef.current;
      if (a) { try { a.playbackRate = narrationRate; } catch (_) {} }
    }, [narrationRate, pageIdx]);

    useEffect(function () {
      setTranslation(null);
      setTxMenuOpen(false);
      setSourceScope('auto');
      setRangeStartInput('');
      setRangeEndInput('');
    }, [book.slug]);

    var lines = useMemo(function () {
      if (!page) return [];
      // Translated view has no cue timings — tokens render un-highlightable.
      if (txReady) return assignCues(displayPageText, null);
      return assignCues(displayPageText, page.words);
    }, [page, txReady, displayPageText]);

    var stopAll = useCallback(function () {
      stopSpeech();
      var a = audioRef.current;
      if (a) { try { a.pause(); } catch (_) {} }
      setNarrating(false);
      setActiveCue(null);
    }, []);

    useEffect(function () { return stopAll; }, [stopAll]);
    useEffect(function () { setPopup(null); }, [pageIdx]);

    // Narration: single whole-book mp3; page follows the active cue.
    var onTimeUpdate = function () {
      var a = audioRef.current;
      if (!a || !book.audio || !book.audio.cues) return;
      var cue = findActiveCue(book.audio.cues, a.currentTime);
      setActiveCue(cue);
      if (cue == null) return;
      var range = pageCueRange(pages[pageIdx]);
      if (range && cue > range[1]) {
        for (var i = pageIdx + 1; i < pages.length; i++) {
          var r2 = pageCueRange(pages[i]);
          if (r2 && cue >= r2[0] && cue <= r2[1]) { setPageIdx(i); break; }
        }
      }
    };

    // When the pre-recorded narration mp3 can't play (some StoryWeaver audio
    // objects 403 on their bucket, or the network drops), don't just fail —
    // read the page aloud with Gemini TTS so the child still hears it.
    var narrationFallback = function () {
      var now = Date.now();
      if (now - fbAtRef.current < 1500) return; // play-reject and onError can both fire
      fbAtRef.current = now;
      var a = audioRef.current;
      if (a) { try { a.pause(); } catch (_) {} }
      setNarrating(false);
      setActiveCue(null);
      if (displayPageText && speak(displayPageText, displayLanguage)) {
        props.addToast && props.addToast(tr('readinglib_narration_fallback', 'Narration audio is unavailable — reading this page aloud instead.'), 'info');
      } else {
        props.addToast && props.addToast(tr('readinglib_audio_failed', 'Could not play the audio right now.'), 'error');
      }
    };

    var toggleNarration = function () {
      var a = audioRef.current;
      if (!a) { narrationFallback(); return; }
      if (narrating) { a.pause(); setNarrating(false); return; }
      stopSpeech();
      var range = pageCueRange(page);
      if (range && book.audio.cues) {
        for (var i = 0; i < book.audio.cues.length; i++) {
          if (book.audio.cues[i][0] === range[0]) { a.currentTime = Math.max(0, book.audio.cues[i][1] - 0.15); break; }
        }
      }
      a.play().then(function () { setNarrating(true); }).catch(function () { narrationFallback(); });
    };

    var readPageTts = function () {
      stopAll();
      if (!displayPageText) return;
      if (!speak(displayPageText, displayLanguage)) {
        props.addToast && props.addToast(tr('readinglib_tts_unavailable', 'Read-aloud is not available right now.'), 'error');
      }
    };

    var go = useCallback(function (delta) {
      stopAll();
      setPageIdx(function (i) { return Math.min(pages.length - 1, Math.max(0, i + delta)); });
    }, [pages.length, stopAll]);

    useEffect(function () {
      var onKey = function (ev) {
        if (ev.defaultPrevented) return;
        var tag = (ev.target && ev.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        var next = displayRtl ? -1 : 1;
        if (ev.key === 'ArrowRight') { go(next); }
        else if (ev.key === 'ArrowLeft') { go(-next); }
      };
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [go, displayRtl]);

    var onWordClick = function (word, ev) {
      if (mode === 'read') return;
      var x = ev.clientX || 40; var y = ev.clientY || 40;
      var clean = String(word).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (!clean) return;
      if (!props.callGemini) {
        props.addToast && props.addToast(tr('readinglib_ai_unavailable', 'AI help is not available right now.'), 'info');
        return;
      }
      if (mode === 'define') {
        setPopup({ type: 'define', word: clean, x: x, y: y, loading: true });
        var dPrompt = 'A student is reading a level ' + book.level + ' text written in ' + displayLanguage + '. ' +
          'In ONE short, friendly sentence written in ' + displayLanguage + ', explain what the word "' + clean + '" means in this text\'s context. Answer with only that sentence.';
        props.callGemini(dPrompt).then(function (res) {
          setPopup(function (p) { return p && p.word === clean ? { type: 'define', word: clean, x: x, y: y, loading: false, text: String(res || '').trim() } : p; });
        }).catch(function () {
          setPopup(function (p) { return p && p.word === clean ? { type: 'define', word: clean, x: x, y: y, loading: false, text: null } : p; });
        });
      } else if (mode === 'phonics') {
        setPopup({ type: 'phonics', word: clean, x: x, y: y, loading: true });
        var pPrompt = 'Return ONLY minified JSON, no markdown: {"ipa":string,"phoneticSpelling":string,"syllables":string} ' +
          'for the ' + displayLanguage + ' word "' + clean + '". phoneticSpelling = kid-friendly respelling; syllables = the word split with middle dots (e.g. "won·der·ful").';
        props.callGemini(pPrompt).then(function (res) {
          var data = null;
          try { data = JSON.parse(String(res || '').replace(/^[^{]*/, '').replace(/[^}]*$/, '')); } catch (_) {}
          setPopup(function (p) { return p && p.word === clean ? { type: 'phonics', word: clean, x: x, y: y, loading: false, phonics: data } : p; });
          speak(clean, displayLanguage);
        }).catch(function () {
          setPopup(function (p) { return p && p.word === clean ? { type: 'phonics', word: clean, x: x, y: y, loading: false, phonics: null } : p; });
        });
      }
    };

    // Hand the DISPLAYED text to the main generation pipeline (the AI
    // translation when one is active, the original otherwise). Passing the
    // displayed language as langOverride keeps the material in the language
    // the student is actually reading (default leveledTextLanguage is usually
    // English — an English quiz on an Arabic book would surprise everyone).
    // Teachers who want cross-language material use "Use as source text" +
    // the normal language picker instead.
    var generate = function (type, label) {
      setGenOpen(false);
      if (typeof props.handleGenerate !== 'function') {
        props.addToast && props.addToast(tr('readinglib_generate_unavailable', 'Generation is not available right now.'), 'error');
        return;
      }
      var langOverride = displayLanguage && displayLanguage !== 'English' ? displayLanguage : null;
      try {
        // Also drop the book into the source box so the teacher can spin up
        // more tools from it afterward, and register the book itself as a
        // resource-pack entry (host dedupes by slug) — the generated resource
        // and its source book both live in the lesson.
        if (typeof props.setInputText === 'function') props.setInputText(selectedSource.text);
        if (typeof props.onSaveToLesson === 'function') props.onSaveToLesson(bookRef());
        props.handleGenerate(type, langOverride, false, selectedSource.text);
        props.addToast && props.addToast(tr('readinglib_generating', 'Creating') + ' ' + label + ' - "' + displayTitle + '" (' + selectedSource.label + ')', 'success');
        props.onExit && props.onExit(true);
      } catch (err) {
        props.addToast && props.addToast(tr('readinglib_generate_failed', 'Could not start generation.'), 'error');
      }
    };

    // Load the displayed book text as the app's source text (the host wraps
    // setInputText to also reveal the Source panel), so every pipeline tool —
    // not just the four in this menu — can work from the book.
    var openAsDocument = function () {
      setGenOpen(false);
      if (typeof props.setInputText !== 'function') {
        props.addToast && props.addToast(tr('readinglib_generate_unavailable', 'Generation is not available right now.'), 'error');
        return;
      }
      props.setInputText(selectedSource.text);
      props.addToast && props.addToast('"' + displayTitle + '" (' + selectedSource.label + ') ' + tr('readinglib_loaded_doc', 'is loaded as your source text - all the create tools can use it now.'), 'success');
      props.onExit && props.onExit(true);
    };

    // AI-translate the whole book in one call (consistent names/terms across
    // pages). Page count must round-trip exactly so page turns stay aligned
    // with the artwork; parseTranslation rejects anything else.
    var translateBook = function (target) {
      var lang = String(target || '').trim();
      setTxMenuOpen(false);
      if (!lang) return;
      if (!props.callGemini) {
        props.addToast && props.addToast(tr('readinglib_ai_unavailable', 'AI help is not available right now.'), 'info');
        return;
      }
      stopAll();
      setPopup(null);
      var slug = book.slug;
      var texts = pages.map(function (p) { return pageTextForPipeline(p); });
      setTranslation({ status: 'loading', language: lang });
      var prompt = 'Translate a reading-library text (reading level ' + book.level + ') from ' + book.language + ' into ' + lang + '. ' +
        'Return ONLY minified JSON, no markdown: {"title":string,"pages":string[]} where "pages" has EXACTLY ' + texts.length + ' entries — ' +
        'each entry translating the input page at the same position. Keep empty pages as empty strings. ' +
        'Use simple, natural, age-appropriate wording for young readers; translate meaning faithfully and do not add content. ' +
        'Input title: ' + JSON.stringify(book.title) + '. Input pages: ' + JSON.stringify(texts);
      props.callGemini(prompt).then(function (res) {
        if (book.slug !== slug) return;
        var data = parseTranslation(res, texts.length);
        if (!data) throw new Error('bad translation shape');
        setTranslation({
          status: 'ready', language: lang, title: data.title, pages: data.pages,
          isRtl: isRtlLanguage(lang), langCode: langCodeFor(lang),
        });
      }).catch(function () {
        if (book.slug !== slug) return;
        setTranslation(null);
        props.addToast && props.addToast(tr('readinglib_translate_failed', 'Could not translate this book right now.'), 'error');
      });
    };

    // Compact resource-pack ref for a readingBook history item. Always the
    // ORIGINAL book (an AI translation is ephemeral; the item reopens the real
    // book in the reader). Host dedupes by slug, so calling it more than once
    // for the same book is safe.
    var bookRef = function () {
      return {
        slug: book.slug,
        title: book.title,
        language: book.language,
        langCode: book.langCode,
        level: book.level,
        cover: (book.cover && book.cover.card) || null,
        hasAudio: !!book.audio,
        pageCount: (book.pages || []).length,
        description: book.description || '',
        attribution: attributionLine(book),
        sourceId: bookSourceId(book),
        sourceName: sourceLabel(bookSourceId(book)),
        license: book.license || '',
      };
    };

    // Teacher: pin this book into the lesson history so students who load the
    // lesson (or join the session) can open it from Resources with one click.
    var saveToLesson = function () {
      if (typeof props.onSaveToLesson !== 'function') return;
      props.onSaveToLesson(bookRef());
      props.addToast && props.addToast('"' + book.title + '" ' + tr('readinglib_saved_lesson', 'was added to this lesson’s resources.'), 'success');
    };

    var genTypes = [
      { type: 'quiz', label: tr('readinglib_gen_quiz', 'Quiz') },
      { type: 'glossary', label: tr('readinglib_gen_glossary', 'Glossary') },
      { type: 'simplified', label: tr('readinglib_gen_leveled', 'Leveled version') },
      { type: 'sentence-frames', label: tr('readinglib_gen_frames', 'Sentence frames') },
    ];

    var onScopeChange = function (ev) {
      var next = ev.target.value || 'whole';
      setSourceScope(next);
      if (next === 'range') {
        setRangeStartInput(String(pageIdx + 1));
        setRangeEndInput(String(Math.min(sourcePages.length || 1, pageIdx + 3)));
      }
    };

    var modeBtn = function (m, icon, label) {
      return e('button', {
        className: 'px-2 py-1 rounded-lg text-sm font-semibold border ' +
          (mode === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
        onClick: function () { setMode(mode === m ? 'read' : m); setPopup(null); },
        'aria-pressed': mode === m,
        title: label,
      }, icon + ' ' + label);
    };

    return e('div', { className: 'flex flex-col h-full min-h-0' },
      // toolbar
      e('div', { className: 'flex items-center gap-2 flex-wrap pb-2 border-b border-slate-200' },
        e('button', {
          className: 'px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold',
          onClick: function () { stopAll(); props.onExit && props.onExit(false); },
        }, '← ' + tr('readinglib_back', 'Library')),
        e('div', { className: 'font-bold text-slate-800 truncate flex-1 min-w-0', dir: 'auto', title: displayTitle }, displayTitle),
        bookSourceHref ? e('a', {
          className: 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100',
          href: bookSourceHref,
          target: '_blank',
          rel: 'noopener noreferrer',
          title: tr('readinglib_open_original_hint', 'Open the official source page for this text'),
        }, tr('readinglib_open_original', 'Open original')) : null,
        hasAudioTrack && !txReady ? e('button', {
          className: 'px-3 py-1.5 rounded-lg text-sm font-semibold ' + (narrating ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'),
          onClick: toggleNarration,
          'aria-pressed': narrating,
          title: hasCues ? undefined : tr('readinglib_audio_no_sync', 'Human narration (no word-by-word highlighting for this book)'),
        }, narrating ? '⏸ ' + tr('readinglib_pause', 'Pause') : '🔊 ' + tr('readinglib_read_to_me', 'Read to me')) : e('button', {
          className: 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
          onClick: readPageTts,
        }, '🔊 ' + tr('readinglib_read_page', 'Read this page')),
        hasAudioTrack && !txReady ? e('button', {
          className: 'px-2 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 tabular-nums',
          onClick: function () { setNarrationRate(narrationRate === 1 ? 1.25 : narrationRate === 1.25 ? 0.75 : 1); },
          title: tr('readinglib_narration_speed', 'Narration speed'),
          'aria-label': tr('readinglib_narration_speed', 'Narration speed') + ': ' + narrationRate + '×',
        }, narrationRate + '×') : null,
        modeBtn('define', '📖', tr('readinglib_mode_define', 'Define')),
        modeBtn('phonics', '🔤', tr('readinglib_mode_phonics', 'Sounds')),
        // Aa — reading supports (font, size, spacing, page color, ruler).
        e('div', { className: 'relative' },
          e('button', {
            className: 'px-2 py-1 rounded-lg text-sm font-bold border ' +
              (aaOpen ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
            onClick: function () { setAaOpen(!aaOpen); setToolsOpen(false); },
            'aria-expanded': aaOpen, 'aria-haspopup': 'menu',
            'data-help-key': 'readinglib-aa',
            title: tr('readinglib_aa_hint', 'Reading supports: font, text size, spacing, page color, reading ruler'),
          }, 'Aa ▾'),
          aaOpen ? e('div', { className: 'absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-20 w-72 max-h-[60vh] overflow-y-auto space-y-3', role: 'menu' },
            // font
            e('div', null,
              e('div', { className: 'text-[11px] font-bold uppercase text-slate-500 mb-1' }, tr('readinglib_aa_font', 'Font')),
              e('div', { className: 'flex flex-wrap gap-1' }, READER_FONTS.map(function (f) {
                return e('button', {
                  key: f.id,
                  className: 'px-2 py-1 rounded-lg text-xs font-semibold border ' + (f.cssClass ? f.cssClass + ' ' : '') +
                    (readerPrefs.font === f.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
                  onClick: function () { setReaderPrefs({ font: f.id }); },
                  'aria-pressed': readerPrefs.font === f.id,
                }, f.label);
              }))
            ),
            // text size
            e('div', null,
              e('div', { className: 'text-[11px] font-bold uppercase text-slate-500 mb-1' }, tr('readinglib_aa_size', 'Text size')),
              e('div', { className: 'flex items-center gap-2' },
                e('button', {
                  className: 'px-3 py-1 rounded-lg text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700',
                  onClick: function () { setReaderPrefs({ textScale: Math.max(0.85, Math.round((readerPrefs.textScale - 0.15) * 100) / 100) }); },
                  'aria-label': tr('readinglib_aa_smaller', 'Smaller text'),
                }, 'A−'),
                e('span', { className: 'text-sm text-slate-600 tabular-nums flex-1 text-center' }, Math.round(readerPrefs.textScale * 100) + '%'),
                e('button', {
                  className: 'px-3 py-1 rounded-lg text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700',
                  onClick: function () { setReaderPrefs({ textScale: Math.min(1.75, Math.round((readerPrefs.textScale + 0.15) * 100) / 100) }); },
                  'aria-label': tr('readinglib_aa_bigger', 'Bigger text'),
                }, 'A+')
              )
            ),
            // line + letter spacing
            e('div', null,
              e('div', { className: 'text-[11px] font-bold uppercase text-slate-500 mb-1' }, tr('readinglib_aa_line', 'Line spacing')),
              e('div', { className: 'flex gap-1' }, [[0, tr('readinglib_aa_normal', 'Normal')], [1.9, tr('readinglib_aa_relaxed', 'Relaxed')], [2.3, tr('readinglib_aa_loose', 'Loose')]].map(function (opt) {
                return e('button', {
                  key: String(opt[0]),
                  className: 'px-2 py-1 rounded-lg text-xs font-semibold border ' +
                    (readerPrefs.lineHeight === opt[0] ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
                  onClick: function () { setReaderPrefs({ lineHeight: opt[0] }); },
                  'aria-pressed': readerPrefs.lineHeight === opt[0],
                }, opt[1]);
              }))
            ),
            e('div', null,
              e('div', { className: 'text-[11px] font-bold uppercase text-slate-500 mb-1' }, tr('readinglib_aa_letter', 'Letter spacing')),
              e('div', { className: 'flex gap-1' }, [[0, tr('readinglib_aa_normal', 'Normal')], [0.06, tr('readinglib_aa_wide', 'Wide')], [0.12, tr('readinglib_aa_wider', 'Wider')]].map(function (opt) {
                return e('button', {
                  key: String(opt[0]),
                  className: 'px-2 py-1 rounded-lg text-xs font-semibold border ' +
                    (readerPrefs.letterSpacing === opt[0] ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
                  onClick: function () { setReaderPrefs({ letterSpacing: opt[0] }); },
                  'aria-pressed': readerPrefs.letterSpacing === opt[0],
                }, opt[1]);
              }))
            ),
            // page color
            e('div', null,
              e('div', { className: 'text-[11px] font-bold uppercase text-slate-500 mb-1' }, tr('readinglib_aa_theme', 'Page color')),
              e('div', { className: 'flex flex-wrap gap-1' }, READER_THEMES.map(function (t) {
                return e('button', {
                  key: t.id,
                  className: 'px-2 py-1 rounded-lg text-xs font-semibold border ' +
                    (readerPrefs.theme === t.id ? 'ring-2 ring-teal-500 border-teal-500 ' : 'border-slate-200 hover:bg-slate-100 '),
                  style: t.bg ? { background: t.bg, color: t.fg } : undefined,
                  onClick: function () { setReaderPrefs({ theme: t.id }); },
                  'aria-pressed': readerPrefs.theme === t.id,
                }, tr('readinglib_theme_' + t.id, t.label));
              }))
            ),
            // reading ruler
            e('button', {
              className: 'w-full px-2 py-1.5 rounded-lg text-sm font-semibold border ' +
                (readerPrefs.ruler ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
              onClick: function () { setReaderPrefs({ ruler: !readerPrefs.ruler }); },
              'aria-pressed': readerPrefs.ruler,
              title: tr('readinglib_aa_ruler_hint', 'A focus band that follows your pointer to keep your place'),
            }, '📏 ' + tr('readinglib_aa_ruler', 'Reading ruler') + (readerPrefs.ruler ? ' ✓' : '')),
            e('button', {
              className: 'w-full px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100',
              onClick: function () { setReaderPrefsState(function () { saveReaderPrefs(READER_PREFS_DEFAULTS); return Object.assign({}, READER_PREFS_DEFAULTS); }); },
            }, tr('readinglib_aa_reset', 'Reset to defaults'))
          ) : null
        ),
        // Reading tools — hand this book's text to the app's immersive overlays.
        (window.AlloModules && (window.AlloModules.FocusReaderOverlay || window.AlloModules.KaraokeReaderOverlay)) ? e('div', { className: 'relative' },
          e('button', {
            className: 'px-2 py-1 rounded-lg text-sm font-semibold border ' +
              (toolsOpen ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
            onClick: function () { setToolsOpen(!toolsOpen); setAaOpen(false); },
            'aria-expanded': toolsOpen, 'aria-haspopup': 'menu',
            'data-help-key': 'readinglib-tools',
            title: tr('readinglib_tools_hint', 'Focus reader, bionic reading, and karaoke read-along for this book'),
          }, '🧰 ' + tr('readinglib_tools', 'Reading tools') + ' ▾'),
          toolsOpen ? e('div', { className: 'absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-20 min-w-[230px]', role: 'menu' },
            window.AlloModules.FocusReaderOverlay ? e('button', {
              role: 'menuitem',
              className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-teal-50',
              onClick: function () { setToolsOpen(false); stopAll(); setOverlay('focus'); },
            }, '⚡ ' + tr('readinglib_tool_focus', 'Focus / bionic reader')) : null,
            window.AlloModules.KaraokeReaderOverlay ? e('button', {
              role: 'menuitem',
              className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-teal-50',
              onClick: function () { setToolsOpen(false); stopAll(); setOverlay('karaoke'); },
            }, '🎤 ' + tr('readinglib_tool_karaoke', 'Karaoke read-along')) : null,
            window.AlloModules.PerspectiveCrawlOverlay ? e('button', {
              role: 'menuitem',
              className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-teal-50',
              onClick: function () { setToolsOpen(false); stopAll(); setOverlay('crawl'); },
            }, '🎬 ' + tr('readinglib_tool_crawl', 'Story crawl')) : null,
            longForm ? e('p', { className: 'px-3 py-1 text-[11px] text-slate-500' },
              tr('readinglib_tools_scope_note', 'Long texts open at the current chapter.')) : null
          ) : null
        ) : null,
        // AI translation menu — fills languages StoryWeaver doesn't cover.
        e('div', { className: 'relative' },
          e('button', {
            className: 'px-2 py-1 rounded-lg text-sm font-semibold border ' +
              (txReady ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
            onClick: function () { setTxMenuOpen(!txMenuOpen); },
            'aria-expanded': txMenuOpen, 'aria-haspopup': 'menu',
            title: tr('readinglib_translate_hint', 'AI-translate this book into any language'),
          }, '🌐 ' + (txReady ? translation.language : tr('readinglib_translate', 'Translate')) + ' ▾'),
          txMenuOpen ? e('div', { className: 'absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-20 w-60', role: 'menu' },
            e('p', { className: 'text-[11px] text-slate-500 px-1 pb-1' },
              tr('readinglib_translate_note', 'AI translation — instant, any language, but not publisher-reviewed and without word-by-word narration.')),
            txReady ? e('button', {
              role: 'menuitem',
              className: 'block w-full text-left px-2 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-purple-50',
              onClick: function () { setTxMenuOpen(false); stopAll(); setTranslation(null); },
            }, '↩ ' + tr('readinglib_show_original', 'Show original') + ' (' + book.language + ')') : null,
            translation && translation.status === 'loading' ? e('div', { className: 'text-sm text-slate-500 italic px-2 py-1' },
              tr('readinglib_translating', 'Translating…')) : null,
            e('div', { className: 'max-h-44 overflow-y-auto' },
              GAP_LANGS.filter(function (l) { return !txReady || l !== translation.language; }).map(function (l) {
                return e('button', {
                  key: l, role: 'menuitem',
                  className: 'block w-full text-left px-2 py-1 rounded-lg text-sm text-slate-700 hover:bg-purple-50',
                  onClick: function () { translateBook(l); },
                }, l);
              })
            ),
            e('div', { className: 'flex gap-1 pt-1 border-t border-slate-100 mt-1' },
              e('input', {
                className: 'flex-1 min-w-0 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700',
                placeholder: tr('readinglib_translate_other', 'Any other language…'),
                value: txInput,
                onChange: function (ev) { setTxInput(ev.target.value); },
                onKeyDown: function (ev) { if (ev.key === 'Enter') { translateBook(txInput); setTxInput(''); } },
              }),
              e('button', {
                className: 'px-2 py-1 rounded-lg text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700',
                onClick: function () { translateBook(txInput); setTxInput(''); },
              }, tr('readinglib_go', 'Go'))
            )
          ) : null
        ),
        e('button', {
          className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-white text-slate-700 border-slate-200 hover:bg-slate-100',
          onClick: function () { setShowPractice(!showPractice); },
          'aria-pressed': showPractice,
        }, '🎙️ ' + tr('readinglib_practice', 'Practice')),
        props.isTeacherMode && typeof props.onSaveToLesson === 'function' ? e('button', {
          className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
          onClick: saveToLesson,
          title: tr('readinglib_save_lesson_hint', 'Students who load this lesson can open the book from Resources'),
        }, '📌 ' + tr('readinglib_save_lesson', 'Save to lesson')) : null,
        e('div', { className: 'relative' },
          e('button', {
            className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
            onClick: function () { setGenOpen(!genOpen); },
            'aria-expanded': genOpen, 'aria-haspopup': 'menu',
          }, '✨ ' + tr('readinglib_create', 'Create') + ' ▾'),
          genOpen ? e('div', { className: 'absolute right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1 z-20 min-w-[260px]', role: 'menu' },
            sourcePages.length > 1 ? e('div', { className: 'px-3 py-2 border-b border-slate-100' },
              e('label', { className: 'block text-[11px] font-bold uppercase text-slate-500 mb-1' },
                tr('readinglib_source_scope', 'Source scope')),
              e('select', {
                className: 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700',
                value: selectedScopeName,
                onChange: onScopeChange,
                'aria-label': tr('readinglib_source_scope', 'Source scope'),
              }, [
                e('option', { key: 'page', value: 'page' }, tr('readinglib_scope_page', 'Current page')),
                currentSection ? e('option', { key: 'chapter', value: 'chapter' }, tr('readinglib_scope_chapter', 'Current chapter')) : null,
                e('option', { key: 'range', value: 'range' }, tr('readinglib_scope_range', 'Page range')),
                e('option', { key: 'whole', value: 'whole' }, tr('readinglib_scope_whole', longForm ? 'Whole text' : 'Whole book')),
              ]),
              selectedScopeName === 'range' ? e('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
                e('label', { className: 'text-[11px] text-slate-500' },
                  tr('readinglib_range_from', 'From'),
                  e('input', {
                    className: 'mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700',
                    type: 'number', min: 1, max: sourcePages.length,
                    value: rangeStartInput || String(pageIdx + 1),
                    onChange: function (ev) { setRangeStartInput(ev.target.value); },
                  })
                ),
                e('label', { className: 'text-[11px] text-slate-500' },
                  tr('readinglib_range_to', 'To'),
                  e('input', {
                    className: 'mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700',
                    type: 'number', min: 1, max: sourcePages.length,
                    value: rangeEndInput || String(pageIdx + 1),
                    onChange: function (ev) { setRangeEndInput(ev.target.value); },
                  })
                )
              ) : null,
              e('div', { className: 'mt-1 text-[11px] text-slate-500' },
                selectedSource.label + ' - ' + selectedSource.wordCount + ' ' + tr('readinglib_words', 'words'))
            ) : null,
            genTypes.map(function (g) {
              return e('button', {
                key: g.type, role: 'menuitem',
                className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-indigo-50',
                onClick: function () { generate(g.type, g.label); },
              }, g.label);
            }),
            e('div', { className: 'border-t border-slate-100 my-1' }),
            e('button', {
              role: 'menuitem',
              className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-indigo-50',
              title: tr('readinglib_open_as_doc_hint', 'Loads the book text into the Source panel so any tool can use it'),
              onClick: openAsDocument,
            }, tr('readinglib_open_as_doc', 'Use as source text…'))
          ) : null
        )
      ),
      hasAudioTrack && !txReady ? e('audio', {
        ref: audioRef, src: book.audio.src, preload: 'none',
        onTimeUpdate: onTimeUpdate,
        onEnded: function () { setNarrating(false); setActiveCue(null); },
        // Some browsers resolve play() then fire 'error' on a dead media URL;
        // fall back to TTS here too (debounced against play()'s own reject).
        onError: function () { narrationFallback(); },
      }) : null,
      showPractice ? e(PracticePanel, { book: book, refText: displayPlainText, onClose: function () { setShowPractice(false); } }) : null,
      // page spread — the flex column + m-auto child centers short spreads
      // vertically in the leftover space (justify-center would clip the top
      // of tall pages inside overflow-y-auto; auto margins collapse to 0 and
      // keep them scrollable). The artwork shrink-wraps and centers itself so
      // the rounded frame hugs the picture — no grey letterbox bars on
      // portrait art.
      page ? e('div', {
        className: 'flex-1 min-h-0 relative' + (pageTheme.bg ? ' rounded-xl' : ''),
        style: pageTheme.bg ? { background: pageTheme.bg } : undefined,
        onPointerMove: readerPrefs.ruler ? function (ev) {
          var rect = ev.currentTarget.getBoundingClientRect();
          setRulerY(Math.max(0, ev.clientY - rect.top));
        } : undefined,
        onPointerLeave: readerPrefs.ruler ? function () { setRulerY(null); } : undefined,
      },
      e('div', { className: 'h-full overflow-y-auto py-3 flex flex-col' },
        e('div', { className: 'w-full max-w-3xl m-auto' },
          isCardContent(book) ? e('div', { className: 'mb-3 mx-auto max-w-xl text-[12px] text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-center' },
            '🔗 ' + tr('readinglib_card_notice', 'This is a source card — a short overview with a link to the real thing. Use “Open original” above to read the full text at the source.')) : null,
          page.img ? e('img', {
            src: page.img,
            alt: tr('readinglib_page_illustration', 'Illustration from') + ' "' + book.title + '", ' + tr('readinglib_page', 'page') + ' ' + page.n,
            className: 'block mx-auto w-auto max-w-full max-h-[48vh] rounded-xl',
            loading: 'lazy',
          }) : null,
          translation && translation.status === 'loading' ? e('div', { className: 'mt-6 text-center text-slate-500 italic' },
            '🌐 ' + tr('readinglib_translating_into', 'Translating into') + ' ' + translation.language + '…') : null,
          txReady ? e('div', { className: 'mt-3 mx-auto max-w-xl text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-center' },
            '🤖 ' + tr('readinglib_translate_caveat', 'AI translation') + ' (' + translation.language + ') — ' +
            tr('readinglib_translate_caveat_body', 'created by AI, not reviewed by the publisher. Word-by-word narration is only available on the original.')) : null,
          e('div', {
            className: 'mt-4 mx-auto max-w-xl leading-relaxed text-slate-800 ' + textLayoutClass(book.level, displayPageText) + (mode !== 'read' ? ' cursor-pointer' : '') + (fontClass ? ' ' + fontClass : ''),
            style: Object.keys(textStyle).length ? textStyle : undefined,
            dir: displayRtl ? 'rtl' : 'auto',
            lang: (txReady ? translation.langCode : book.langCode) || undefined,
          }, lines.map(function (line, li) {
            return e('p', { key: li, className: 'mb-2' }, line.map(function (tok, ti) {
              var hot = tok.cue != null && tok.cue === activeCue;
              return e('span', {
                key: ti,
                className: (hot ? 'bg-amber-200 rounded ' : '') + (mode !== 'read' ? 'hover:bg-indigo-100 rounded ' : ''),
                onClick: mode !== 'read' ? function (ev) { onWordClick(tok.w, ev); } : undefined,
              }, tok.w + (ti < line.length - 1 ? ' ' : ''));
            }));
          }))
        )
      ),
      // Reading ruler: a clear band that follows the pointer, with softly
      // dimmed masks above and below. Pointer-events pass through.
      readerPrefs.ruler && rulerY != null ? e(React.Fragment, null,
        e('div', { className: 'absolute left-0 right-0 top-0 pointer-events-none rounded-t-xl', style: { height: Math.max(0, rulerY - 34) + 'px', background: 'rgba(15,23,42,0.28)' }, 'aria-hidden': true }),
        e('div', { className: 'absolute left-0 right-0 pointer-events-none border-y-2 border-amber-400/70', style: { top: Math.max(0, rulerY - 34) + 'px', height: '68px' }, 'aria-hidden': true }),
        e('div', { className: 'absolute left-0 right-0 bottom-0 pointer-events-none rounded-b-xl', style: { top: (rulerY + 34) + 'px', background: 'rgba(15,23,42,0.28)' }, 'aria-hidden': true })
      ) : null
      ) : null,
      // pager + attribution
      e('div', { className: 'pt-2 border-t border-slate-200' },
        e('div', { className: 'flex items-center justify-center gap-3' },
          e('button', {
            className: 'px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-40',
            disabled: pageIdx === 0, onClick: function () { go(-1); },
            'aria-label': tr('readinglib_prev_page', 'Previous page'),
          }, '‹'),
          e('span', {
            className: 'text-sm text-slate-600 tabular-nums',
            role: 'status', 'aria-live': 'polite',
            'aria-label': tr('readinglib_page', 'page') + ' ' + (pageIdx + 1) + ' ' + tr('readinglib_of', 'of') + ' ' + pages.length,
          }, (pageIdx + 1) + ' / ' + pages.length),
          e('button', {
            className: 'px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-40',
            disabled: pageIdx >= pages.length - 1, onClick: function () { go(1); },
            'aria-label': tr('readinglib_next_page', 'Next page'),
          }, '›')
        ),
        e('p', { className: 'text-[11px] text-slate-500 text-center mt-1.5' },
          attributionLine(book) + (txReady ? ' · 🤖 ' + tr('readinglib_attr_ai_translated', 'AI-translated into') + ' ' + translation.language : '') + ' · ',
          e('a', { href: bookSourceUrl, target: '_blank', rel: 'noopener noreferrer', className: 'underline hover:text-indigo-700' },
            bookSourceName),
          ' · ',
          e('a', { href: book.licenseUrl || 'https://creativecommons.org/licenses/by/4.0/', target: '_blank', rel: 'noopener noreferrer', className: 'underline hover:text-indigo-700' },
            book.license || 'CC BY 4.0')
        )
      ),
      popup ? e(WordPopup, { data: popup, onClose: function () { setPopup(null); } }) : null,
      // Immersive overlays (host modules, z-[300] — they cover this modal).
      // Lazy-looked-up at render so Canvas/deploy load order can't null-crash.
      (function () {
        if (!overlay) return null;
        var M = window.AlloModules || {};
        var close = function () { setOverlay(null); };
        try {
          if (overlay === 'focus' && M.FocusReaderOverlay) {
            return e(M.FocusReaderOverlay, { key: 'ovl-focus', isOpen: true, text: overlayText, onClose: close });
          }
          if (overlay === 'karaoke' && M.KaraokeReaderOverlay) {
            return e(M.KaraokeReaderOverlay, {
              key: 'ovl-karaoke', isOpen: true, text: overlayText, onClose: close,
              isTeacher: !!props.isTeacherMode,
              // Store-first (teacher-vetted audio), then Gemini TTS in the
              // displayed language; null → the overlay's browser-voice fallback.
              getAudioUrl: function (sentenceText) {
                try {
                  var st = M.KaraokeAudioStore && M.KaraokeAudioStore.current;
                  var hit = st && st.get && st.get(sentenceText);
                  if (hit) return Promise.resolve(hit);
                  if (typeof window.__alloCallTTS === 'function') {
                    return window.__alloCallTTS(sentenceText, window.__alloSelectedVoice || 'Kore', 1, { language: displayLanguage })
                      .catch(function () { return null; });
                  }
                } catch (_) {}
                return Promise.resolve(null);
              },
            });
          }
          if (overlay === 'crawl' && M.PerspectiveCrawlOverlay) {
            return e(M.PerspectiveCrawlOverlay, { key: 'ovl-crawl', isOpen: true, text: overlayText, onClose: close });
          }
        } catch (_) {}
        return null;
      })()
    );
  }

  // --------------------------------------------------------------- browse
  function BookCard(props) {
    var b = props.book;
    return e('button', {
      className: 'text-left bg-white border border-slate-200 rounded-2xl p-3 hover:border-indigo-300 hover:shadow-md transition-shadow flex flex-col gap-2',
      onClick: function () { props.onOpen(b); },
    },
      b.cover ? e('img', {
        src: b.cover, alt: '', loading: 'lazy',
        className: 'w-full h-36 object-cover rounded-xl bg-slate-100',
      }) : e('div', { className: 'w-full h-36 rounded-xl bg-indigo-50 flex items-center justify-center text-4xl' }, '📖'),
      e('div', { className: 'font-bold text-slate-800 leading-snug', dir: 'auto' }, b.title),
      e('div', { className: 'flex flex-wrap gap-1' },
        bookSourceId(b) !== 'storyweaver' ? e('span', { className: 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold' },
          sourceLabel(bookSourceId(b))) : null,
        e('span', { className: 'px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold' },
          tr('readinglib_level', 'Level') + ' ' + b.level),
        e('span', { className: 'px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-semibold' }, b.language),
        b.hasAudio ? e('span', { className: 'px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold' },
          '🔊 ' + tr('readinglib_narrated', 'Narrated')) : null,
        isCardContent(b) ? e('span', {
          className: 'px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-semibold',
          title: tr('readinglib_card_badge_hint', 'A short overview that links out to the full text at the source'),
        }, '🔗 ' + tr('readinglib_card_badge', 'Source card')) : null
      ),
      b.authors && b.authors.length ? e('div', { className: 'text-[11px] text-slate-500' }, b.authors.join(', ')) : null
    );
  }

  function collectionButtonClass(collection, available) {
    var base = 'text-left rounded-2xl border p-4 transition-shadow flex flex-col gap-2 min-h-[168px] ';
    if (!available) return base + 'bg-slate-50 border-slate-200 text-slate-500 opacity-80 cursor-not-allowed';
    if (collection.accent === 'emerald') return base + 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 hover:shadow-md';
    if (collection.accent === 'sky') return base + 'bg-sky-50 border-sky-200 hover:border-sky-400 hover:shadow-md';
    if (collection.accent === 'amber') return base + 'bg-amber-50 border-amber-200 hover:border-amber-400 hover:shadow-md';
    if (collection.accent === 'indigo') return base + 'bg-indigo-50 border-indigo-200 hover:border-indigo-400 hover:shadow-md';
    return base + 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-md';
  }

  function collectionBadgeClass(collection, available) {
    if (!available) return 'self-start px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500 text-[11px] font-semibold';
    if (collection.accent === 'emerald') return 'self-start px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold';
    if (collection.accent === 'sky') return 'self-start px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-semibold';
    if (collection.accent === 'amber') return 'self-start px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold';
    if (collection.accent === 'indigo') return 'self-start px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-semibold';
    return 'self-start px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold';
  }

  function CollectionChooser(props) {
    var books = props.books || [];
    var counts = {};
    books.forEach(function (b) {
      var id = bookSourceId(b);
      counts[id] = (counts[id] || 0) + 1;
    });
    return e('div', { className: 'h-full min-h-0 overflow-y-auto pb-2' },
      e('div', { className: 'max-w-5xl mx-auto py-3' },
        e('div', { className: 'mb-4' },
          e('div', { className: 'text-sm font-semibold text-indigo-700' }, tr('readinglib_collections_eyebrow', 'Choose a collection')),
          e('h3', { className: 'text-2xl font-extrabold text-slate-900 leading-tight' }, tr('readinglib_collections_title', 'Reading Collections')),
          e('p', { className: 'mt-1 text-sm text-slate-600 max-w-2xl' },
            tr('readinglib_collections_intro', 'Pick the shelf that matches the reading purpose. Stories, science, history, and study texts each keep their own source notes.'))
        ),
        e('div', { className: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3' },
          LIBRARY_COLLECTIONS.map(function (collection) {
            var count = collection.sourceIds
              ? collection.sourceIds.reduce(function (sum, id) { return sum + (counts[id] || 0); }, 0)
              : books.length;
            var available = count > 0;
            var languages = {};
            if (available) {
              books.forEach(function (b) {
                if (bookMatchesCollection(b, collection)) languages[b.language] = true;
              });
            }
            var langCount = Object.keys(languages).length;
            return e('button', {
              key: collection.id,
              className: collectionButtonClass(collection, available),
              onClick: function () { if (available) props.onChoose(collection); },
              disabled: !available,
              'aria-disabled': !available,
            },
              e('span', { className: collectionBadgeClass(collection, available) },
                available ? count + ' ' + tr('readinglib_books', 'books') : tr('readinglib_collection_prepared', 'Prepared shelf')),
              e('div', { className: 'text-lg font-extrabold text-slate-900' }, collection.label),
              e('div', { className: 'text-sm font-semibold text-slate-700' }, collection.sourceLine),
              e('p', { className: 'text-sm text-slate-600 leading-snug flex-1' }, collection.summary),
              e('div', { className: 'text-[11px] font-semibold text-slate-500' },
                available ? langCount + ' ' + tr('readinglib_languages', 'languages') : tr('readinglib_collection_next', 'Ready for a licensed-source import'))
            );
          })
        )
      )
    );
  }

  function ReadingLibrary(props) {
    if (!props.isOpen) return null;

    var _idx = useState({ status: 'loading', data: null, base: null, error: null });
    var index = _idx[0]; var setIndex = _idx[1];
    var _f = useState({ language: 'English', level: '', search: '', audio: false, sort: 'level', source: '' });
    var filters = _f[0]; var setFilters = _f[1];
    var _open = useState(null); var openBook = _open[0]; var setOpenBook = _open[1];
    var _loadingBook = useState(null); var loadingBook = _loadingBook[0]; var setLoadingBook = _loadingBook[1];
    var _opt = useState(false); var optionsOpen = _opt[0]; var setOptionsOpen = _opt[1];
    var _collection = useState(null); var selectedCollectionId = _collection[0]; var setSelectedCollectionId = _collection[1];
    var containerRef = useRef(null);

    useEffect(function () {
      var alive = true;
      fetchIndex(function (err, data, base) {
        if (!alive) return;
        if (err) setIndex({ status: 'error', data: null, base: null, error: err.message });
        else setIndex({ status: 'ok', data: data, base: base, error: null });
      });
      return function () { alive = false; };
    }, []);

    // Escape closes reader first, then the modal; basic focus trap on Tab.
    useEffect(function () {
      var onKey = function (ev) {
        if (ev.key === 'Escape') {
          ev.stopPropagation();
          if (openBook) { stopSpeech(); setOpenBook(null); }
          else if (props.onClose) props.onClose();
        } else if (ev.key === 'Tab' && containerRef.current) {
          var els = containerRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          if (!els.length) return;
          var first = els[0]; var last = els[els.length - 1];
          if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
          else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
        }
      };
      window.addEventListener('keydown', onKey, true);
      return function () { window.removeEventListener('keydown', onKey, true); };
    }, [openBook, props.onClose]);

    var books = (index.data && index.data.books) || [];
    var selectedCollection = collectionById(selectedCollectionId);
    var collectionBooks = useMemo(function () {
      if (!selectedCollection) return books;
      return books.filter(function (b) { return bookMatchesCollection(b, selectedCollection); });
    }, [books, selectedCollectionId]);

    var filtered = useMemo(function () {
      var q = filters.search.trim().toLowerCase();
      var list = collectionBooks.filter(function (b) {
        if (filters.source && bookSourceId(b) !== filters.source) return false;
        if (filters.language && b.language !== filters.language) return false;
        if (filters.level && String(b.level) !== filters.level) return false;
        if (filters.audio && !b.hasAudio) return false;
        if (q) {
          var hay = (b.title + ' ' + (b.authors || []).join(' ') + ' ' + (b.description || '')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
      // Default order (raw index) groups by language then interleaves the
      // narration top-up, which reads as jumbled. Sort for a predictable
      // browse: by level (easiest→hardest) unless the teacher picks otherwise.
      var byTitle = function (a, b) { return String(a.title).localeCompare(String(b.title)); };
      var byLevel = function (a, b) { return (Number(a.level) - Number(b.level)) || byTitle(a, b); };
      var sorters = {
        level: byLevel,
        title: byTitle,
        audio: function (a, b) { return (b.hasAudio ? 1 : 0) - (a.hasAudio ? 1 : 0) || byLevel(a, b); },
        language: function (a, b) { return String(a.language).localeCompare(String(b.language)) || byLevel(a, b); },
      };
      return list.sort(sorters[filters.sort] || byLevel);
    }, [collectionBooks, filters]);
    var visibleBooks = filtered.length > MAX_VISIBLE_BOOKS ? filtered.slice(0, MAX_VISIBLE_BOOKS) : filtered;

    var languages = useMemo(function () {
      var source = selectedCollection ? collectionBooks : books;
      var counts = {};
      source.forEach(function (b) { counts[b.language] = (counts[b.language] || 0) + 1; });
      return Object.keys(counts).sort(function (a, b) { return a.localeCompare(b); }).map(function (name) {
        return { name: name, count: counts[name] };
      });
    }, [index.data, selectedCollectionId, collectionBooks]);

    var sourceOptions = useMemo(function () {
      var counts = {};
      collectionBooks.forEach(function (b) {
        var id = bookSourceId(b);
        counts[id] = (counts[id] || 0) + 1;
      });
      return Object.keys(counts).sort(function (a, b) { return sourceLabel(a).localeCompare(sourceLabel(b)); }).map(function (id) {
        return { id: id, label: sourceLabel(id), count: counts[id] };
      });
    }, [collectionBooks]);

    var chooseCollection = function (collection) {
      setSelectedCollectionId(collection.id);
      setFilters({
        language: collection.defaultLanguage || '',
        level: '',
        search: '',
        audio: false,
        sort: 'level',
        source: '',
      });
    };

    var openBookBySlug = function (b) {
      if (!selectedCollectionId) {
        var bookCollection = collectionForBook(b);
        setSelectedCollectionId(bookCollection.id);
      }
      setLoadingBook(b.slug);
      var base = index.base || DATA_BASES[0];
      var bust = base.indexOf('http') === 0 ? '?t=' + Date.now() : '';
      fetch(base + b.file + bust)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (book) { setLoadingBook(null); stopSpeech(); setOpenBook(book); })
        .catch(function () {
          setLoadingBook(null);
          props.addToast && props.addToast(tr('readinglib_book_failed', 'Could not open that book right now.'), 'error');
        });
    };

    var onExitReader = function (closeAll) {
      stopSpeech();
      setOpenBook(null);
      if (closeAll && props.onClose) props.onClose();
    };

    // Deep-open: a lesson's saved-book item restores through here. When the
    // index is ready and the host handed us a slug, open that book directly.
    useEffect(function () {
      if (!props.initialBookSlug || index.status !== 'ok' || openBook || loadingBook) return;
      var entry = books.filter(function (b) { return b.slug === props.initialBookSlug; })[0];
      if (entry) {
        openBookBySlug(entry);
      } else {
        props.addToast && props.addToast(tr('readinglib_assigned_missing', 'That book is no longer in the library.'), 'info');
      }
      if (typeof props.onInitialBookConsumed === 'function') props.onInitialBookConsumed();
    }, [props.initialBookSlug, index.status]);

    var body;
    if (openBook) {
      body = e(BookReader, {
        book: openBook,
        onExit: onExitReader,
        addToast: props.addToast,
        callGemini: props.callGemini,
        handleGenerate: props.handleGenerate,
        setInputText: props.setInputText,
        isTeacherMode: props.isTeacherMode,
        onSaveToLesson: props.onSaveToLesson,
      });
    } else if (!selectedCollection) {
      body = e('div', { className: 'flex flex-col h-full min-h-0' },
        index.status === 'loading' ? e('div', { className: 'text-sm text-slate-500 p-4' }, tr('readinglib_loading', 'Loading the library…')) :
        index.status === 'error' ? e('div', { className: 'text-sm text-red-600 p-4' },
          tr('readinglib_load_error', 'Could not load the library:') + ' ' + index.error) :
        e(CollectionChooser, { books: books, onChoose: chooseCollection })
      );
    } else {
      body = e('div', { className: 'flex flex-col h-full min-h-0' },
        e('div', { className: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3' },
          e('div', { className: 'min-w-0' },
            e('div', { className: 'text-[11px] uppercase tracking-wide font-bold text-slate-400' }, tr('readinglib_collection_label', 'Collection')),
            e('div', { className: 'text-lg font-extrabold text-slate-900 truncate' }, selectedCollection.label),
            e('div', { className: 'text-sm text-slate-500 truncate' }, selectedCollection.sourceLine)
          ),
          e('button', {
            className: 'self-start sm:self-center px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold',
            onClick: function () { stopSpeech(); setOpenBook(null); setSelectedCollectionId(null); },
          }, tr('readinglib_change_collection', 'Change collection'))
        ),
        // filters
        e('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 pb-3' },
          sourceOptions.length > 1 ? e('select', {
            className: 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700',
            value: filters.source,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { source: ev.target.value })); },
            'aria-label': tr('readinglib_filter_source', 'Source'),
          },
            e('option', { value: '' }, tr('readinglib_all_sources', 'All sources')),
            sourceOptions.map(function (s) { return e('option', { key: s.id, value: s.id }, s.label + ' (' + s.count + ')'); })
          ) : null,
          e('select', {
            className: 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700',
            value: filters.language,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { language: ev.target.value })); },
            'aria-label': tr('readinglib_filter_language', 'Language'),
          },
            e('option', { value: '' }, tr('readinglib_all_languages', 'All languages')),
            languages.map(function (l) { return e('option', { key: l.name, value: l.name }, l.name + ' (' + l.count + ')'); })
          ),
          e('select', {
            className: 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700',
            value: filters.level,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { level: ev.target.value })); },
            'aria-label': tr('readinglib_filter_level', 'Reading level'),
          },
            e('option', { value: '' }, tr('readinglib_all_levels', 'All levels')),
            ['1', '2', '3', '4', '5', '6'].map(function (lv) { return e('option', { key: lv, value: lv }, LEVEL_LABELS[lv] || ('Level ' + lv)); })
          ),
          e('select', {
            className: 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700',
            value: filters.sort,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { sort: ev.target.value })); },
            'aria-label': tr('readinglib_sort', 'Sort by'),
          },
            e('option', { value: 'level' }, tr('readinglib_sort_level', 'Level · easiest first')),
            e('option', { value: 'title' }, tr('readinglib_sort_title', 'Title · A–Z')),
            e('option', { value: 'audio' }, tr('readinglib_sort_audio', 'Narrated first')),
            e('option', { value: 'language' }, tr('readinglib_sort_language', 'Language'))
          ),
          e('input', {
            className: 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700',
            placeholder: tr('readinglib_search_ph', 'Search titles and authors…'),
            value: filters.search,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { search: ev.target.value })); },
            'aria-label': tr('readinglib_search', 'Search'),
          }),
          e('button', {
            className: 'rounded-lg border px-3 py-2 text-sm font-semibold text-left ' +
              (filters.audio ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
            onClick: function () { setFilters(Object.assign({}, filters, { audio: !filters.audio })); },
            'aria-pressed': filters.audio,
          }, '🔊 ' + tr('readinglib_narrated_only', 'Narrated only'))
        ),
        // status
        e('div', { className: 'text-sm text-slate-500 pb-2' },
          index.status === 'loading' ? tr('readinglib_loading', 'Loading the library…') :
          index.status === 'error' ? e('span', { className: 'text-red-600' },
            tr('readinglib_load_error', 'Could not load the library:') + ' ' + index.error) :
          filtered.length === 0 ? tr('readinglib_empty', 'No books match those filters yet.') :
          (visibleBooks.length < filtered.length
            ? visibleBooks.length + ' ' + tr('readinglib_shown_of', 'shown of') + ' ' + filtered.length + ' ' + tr('readinglib_matches', 'matches') + ' · ' + collectionBooks.length + ' ' + tr('readinglib_books', 'books')
            : filtered.length + ' ' + tr('readinglib_of', 'of') + ' ' + collectionBooks.length + ' ' + tr('readinglib_books', 'books'))),
        // grid
        e('div', { className: 'flex-1 min-h-0 overflow-y-auto' },
          e('div', { className: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-2' },
            visibleBooks.map(function (b) {
              return e(BookCard, { key: b.slug, book: b, onOpen: openBookBySlug });
            })
          ),
          loadingBook ? e('div', { className: 'text-sm text-slate-500 italic py-2' }, tr('readinglib_opening', 'Opening book…')) : null
        ),
        index.data && index.data.attribution ? e('p', { className: 'text-[11px] text-slate-500 pt-2 border-t border-slate-200' },
          index.data.attribution.text + ' ',
          e('a', { href: index.data.attribution.url, target: '_blank', rel: 'noopener noreferrer', className: 'underline hover:text-indigo-700' },
            'storyweaver.org.in'),
          ' · ' + tr('readinglib_request_language', 'Missing a language? StoryWeaver publishes in 300+ — more can be added to this library on request.')
        ) : null
      );
    }

    return e('div', {
      className: 'allo-docsuite fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3 sm:p-6',
      role: 'presentation',
      onMouseDown: function (ev) { if (ev.target === ev.currentTarget && props.onClose) props.onClose(); },
    },
      e('div', {
        ref: containerRef,
        className: 'relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col p-4',
        role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('readinglib_title', 'Reading Library'),
      },
        e('div', { className: 'flex items-center justify-between gap-2 pb-2' },
          e('h2', { className: 'text-xl font-extrabold text-slate-800' }, '📚 ' + tr('readinglib_title', 'Reading Library')),
          e('div', { className: 'flex items-center gap-2' },
            selectedCollection && !openBook ? e('button', {
              className: 'px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-slate-200',
              onClick: function () { setSelectedCollectionId(null); },
            }, tr('readinglib_collections_button', 'Collections')) : null,
            props.isTeacherMode && !openBook ? e('button', {
              className: 'px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-sm font-semibold border border-indigo-200',
              onClick: function () { setOptionsOpen(true); },
            }, '🌍 ' + tr('readinglib_lang_options', 'Language options')) : null,
            e('button', {
              className: 'px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold',
              onClick: props.onClose, 'aria-label': tr('readinglib_close', 'Close'),
            }, '✕')
          )
        ),
        e('div', { className: 'flex-1 min-h-0' }, body),
        // Teacher explainer: the three ways to get books in any language.
        optionsOpen ? e('div', {
          className: 'absolute inset-0 z-30 bg-black/30 flex items-center justify-center p-4 rounded-2xl',
          onMouseDown: function (ev) { if (ev.target === ev.currentTarget) setOptionsOpen(false); },
        },
          e('div', { className: 'bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 max-h-full overflow-y-auto', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('readinglib_lang_options', 'Language options') },
            e('div', { className: 'flex items-center justify-between gap-2 mb-2' },
              e('h3', { className: 'font-extrabold text-slate-800' }, '🌍 ' + tr('readinglib_lang_options_title', 'Getting books in any language')),
              e('button', { className: 'text-slate-400 hover:text-slate-600 px-1', onClick: function () { setOptionsOpen(false); }, 'aria-label': tr('readinglib_close', 'Close') }, '✕')
            ),
            e('div', { className: 'space-y-3 text-sm text-slate-700' },
              e('div', { className: 'border border-emerald-200 bg-emerald-50 rounded-xl p-3' },
                e('div', { className: 'font-bold text-emerald-900' }, '📚 ' + tr('readinglib_opt1_title', 'Library books — most trustworthy')),
                e('p', { className: 'mt-1' }, tr('readinglib_opt1_body', 'Authentic StoryWeaver picture books with publisher-verified text. Many are narrated with word-by-word highlighting. Use the language filter above.'))),
              e('div', { className: 'border border-purple-200 bg-purple-50 rounded-xl p-3' },
                e('div', { className: 'font-bold text-purple-900' }, '🌐 ' + tr('readinglib_opt2_title', 'Instant AI translation — any language, right now')),
                e('p', { className: 'mt-1' }, tr('readinglib_opt2_body', 'Open any book and press 🌐 Translate. Works even for languages StoryWeaver does not publish (Somali, Ukrainian, …), and read-aloud still works. The text is AI-generated — not reviewed by the publisher — and word-by-word narration only exists on the original. Best for newcomer support today; pair students with the original when you can.'))),
              e('div', { className: 'border border-sky-200 bg-sky-50 rounded-xl p-3' },
                e('div', { className: 'font-bold text-sky-900' }, '📥 ' + tr('readinglib_opt3_title', 'Request a permanent addition')),
                e('p', { className: 'mt-1' }, tr('readinglib_opt3_body', 'StoryWeaver publishes in 300+ languages. Any of them can be added to this library with verified text (and narration where it exists) in a quick app update — tell your AlloFlow maintainer which language you need.')))
            )
          )
        ) : null
      )
    );
  }

  // statics for the test harness
  ReadingLibrary._tr = tr;
  ReadingLibrary._assignCues = assignCues;
  ReadingLibrary._findActiveCue = findActiveCue;
  ReadingLibrary._pageCueRange = pageCueRange;
  ReadingLibrary._cleanReadingText = cleanReadingText;
  ReadingLibrary._pageTextForPipeline = pageTextForPipeline;
  ReadingLibrary._bookPlainTextFromPages = bookPlainTextFromPages;
  ReadingLibrary._detectReadingSections = detectReadingSections;
  ReadingLibrary._sectionForPage = sectionForPage;
  ReadingLibrary._isLongFormBook = isLongFormBook;
  ReadingLibrary._bookPlainTextForScope = bookPlainTextForScope;
  ReadingLibrary._bookPlainText = bookPlainText;
  ReadingLibrary._textLayoutClass = textLayoutClass;
  ReadingLibrary._attributionLine = attributionLine;
  ReadingLibrary._parseTranslation = parseTranslation;
  ReadingLibrary._isRtlLanguage = isRtlLanguage;
  ReadingLibrary._langCodeFor = langCodeFor;
  ReadingLibrary._gapLangs = GAP_LANGS;
  ReadingLibrary.BookReader = BookReader;
  ReadingLibrary.PracticePanel = PracticePanel;
  ReadingLibrary.BookCard = BookCard;

  window.AlloModules.ReadingLibrary = ReadingLibrary;
  console.log('[CDN] ReadingLibrary loaded');
})();
