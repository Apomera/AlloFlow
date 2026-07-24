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
 *     (optional), setInputText(text) (optional), onPracticeLanguage(selection)
 *     (optional), isTeacherMode (optional).
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
  // base serves the per-book files too. Prefer the catalog bundled with the
  // running AlloFlow build so a stale external mirror can never hide newly
  // imported entries. Remote mirrors remain resilient fallbacks.
  var DATA_BASES = [
    './reading_library/',
    'https://alloflow-cdn.pages.dev/reading_library/',
    'https://raw.githubusercontent.com/Apomera/AlloFlow/main/reading_library/',
  ];
  var VISIBLE_BOOK_BATCH = 240;

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
    bloom: 'Bloom Library',
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
      sourceLine: 'StoryWeaver & Bloom Library picture books',
      summary: 'Leveled picture books for early and multilingual readers.',
      sourceIds: ['storyweaver', 'bloom'],
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
      sourceLine: 'OpenStax chapters & CK-12 FlexBook links',
      summary: 'Accessible open-textbook chapters plus curated course-aligned study links.',
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
    if (raw.indexOf('bloomlibrary') !== -1 || raw.indexOf('bloom library') !== -1) return 'bloom';
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
  var READER_PREFS_DEFAULTS = { font: 'default', textScale: 1, lineHeight: 0, letterSpacing: 0, wordSpacing: 0, theme: 'default', ruler: false };
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

  // Per-book reading position (resume where you left off) and bookmarks. Keyed
  // by slug in small localStorage maps; both degrade to no-ops if storage is
  // unavailable. Position is only tracked for long-form texts (picture books
  // are short enough to just reopen at the start).
  var READER_POS_KEY = 'allo_reading_lib_pos';
  var READER_BM_KEY = 'allo_reading_lib_bookmarks';
  function readMap(key) {
    try { var m = JSON.parse(localStorage.getItem(key) || '{}'); return (m && typeof m === 'object') ? m : {}; } catch (_) { return {}; }
  }
  function writeMap(key, m) { try { localStorage.setItem(key, JSON.stringify(m)); } catch (_) {} }
  function loadReadingPos(slug) {
    var v = readMap(READER_POS_KEY)[slug];
    return (typeof v === 'number' && isFinite(v) && v > 0) ? Math.floor(v) : 0;
  }
  function loadAllReadingPos() { return readMap(READER_POS_KEY); }

  // Self-serve "find more books" import requests. The persistent catalog is
  // static JSON on the CDN, so a browser can't add a book itself; instead a
  // teacher's picks are collected here and handed to the maintainer as a
  // ready-to-run command (reusing import_gutenberg_full_texts.js).
  var READER_REQ_KEY = 'allo_reading_lib_import_requests';
  function loadImportRequests() {
    try { var a = JSON.parse(localStorage.getItem(READER_REQ_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (_) { return []; }
  }
  function saveImportRequests(list) {
    try { localStorage.setItem(READER_REQ_KEY, JSON.stringify(list || [])); } catch (_) {}
  }
  // A Gutendex record has a real in-app-importable text when it exposes a
  // UTF-8 .txt that is not a LibriVox/readme record (matches the importer).
  function gutendexHasText(formats) {
    return Object.keys(formats || {}).some(function (m) {
      var u = String(formats[m] || '');
      return /text\/plain/i.test(m) && /\.txt(\.utf-8)?($|\?|$)/i.test(u) && !/readme/i.test(u);
    });
  }
  function gutenbergIdOf(book) {
    var m = /gutenberg\.org\/ebooks\/(\d+)/.exec((book && book.source && book.source.url) || '');
    return m ? Number(m[1]) : null;
  }

  // One-click import endpoint — a deployed reading_library/import_worker.js
  // (Cloudflare Worker). Set this to your Worker URL to turn "Request import"
  // into an instant "Add now"; leave '' and only the request-list handoff
  // shows. window.__alloReadingImportEndpoint overrides at runtime.
  var GUTENBERG_IMPORT_ENDPOINT = '';
  function importEndpoint() {
    try { if (window.__alloReadingImportEndpoint) return String(window.__alloReadingImportEndpoint); } catch (_) {}
    return GUTENBERG_IMPORT_ENDPOINT || '';
  }

  // Per-device imported books: a small localStorage card index for the browse
  // shelf + the full book bodies in IndexedDB (a novel can be several MB). All
  // storage degrades to no-ops when unavailable (e.g. jsdom in tests).
  var LOCAL_INDEX_KEY = 'allo_reading_lib_local_index';
  var IMPORT_DB = 'alloReadingImports';
  var IMPORT_STORE = 'books';
  function loadLocalIndex() {
    try { var a = JSON.parse(localStorage.getItem(LOCAL_INDEX_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (_) { return []; }
  }
  function saveLocalIndex(list) { try { localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(list || [])); } catch (_) {} }
  function localCardFromBook(b) {
    return {
      slug: b.slug, title: b.title, language: b.language, langCode: b.langCode, level: b.level,
      isRtl: !!b.isRtl, authors: b.authors || [], hasAudio: !!b.audio, contentType: b.contentType,
      wordCount: (b.stats && b.stats.words) || 0, source: b.source || null, license: b.license,
      licenseUrl: b.licenseUrl, cover: null, local: true, file: 'local:' + b.slug,
    };
  }
  function idbOpen() {
    return new Promise(function (res, rej) {
      try {
        if (!window.indexedDB) { rej(new Error('no idb')); return; }
        var req = window.indexedDB.open(IMPORT_DB, 1);
        req.onupgradeneeded = function () { try { req.result.createObjectStore(IMPORT_STORE); } catch (_) {} };
        req.onsuccess = function () { res(req.result); };
        req.onerror = function () { rej(req.error || new Error('idb')); };
      } catch (e) { rej(e); }
    });
  }
  function idbPut(slug, book) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(IMPORT_STORE, 'readwrite');
        tx.objectStore(IMPORT_STORE).put(book, slug);
        tx.oncomplete = function () { res(true); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function idbGet(slug) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(IMPORT_STORE, 'readonly');
        var g = tx.objectStore(IMPORT_STORE).get(slug);
        g.onsuccess = function () { res(g.result || null); };
        g.onerror = function () { rej(g.error); };
      });
    });
  }
  function idbDel(slug) {
    return idbOpen().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction(IMPORT_STORE, 'readwrite');
        tx.objectStore(IMPORT_STORE).delete(slug);
        tx.oncomplete = function () { res(true); };
        tx.onerror = function () { res(false); };
      });
    }).catch(function () { return false; });
  }
  function saveReadingPos(slug, idx) {
    if (!slug) return;
    var m = readMap(READER_POS_KEY);
    if (idx > 0) m[slug] = idx; else delete m[slug];
    writeMap(READER_POS_KEY, m);
  }
  function loadBookmarks(slug) {
    var v = readMap(READER_BM_KEY)[slug];
    return Array.isArray(v) ? v.filter(function (n) { return typeof n === 'number' && n >= 0; }).sort(function (a, b) { return a - b; }) : [];
  }
  function saveBookmarks(slug, list) {
    if (!slug) return;
    var m = readMap(READER_BM_KEY);
    if (list && list.length) m[slug] = list.slice().sort(function (a, b) { return a - b; }); else delete m[slug];
    writeMap(READER_BM_KEY, m);
  }

  // Personal word bank — every word a reader looks up in Define mode is
  // worth keeping (the lookup IS the vocabulary-collection moment). Stored on
  // this device only, like reading positions and bookmarks; nothing leaves
  // the browser. Newest first; deduped per word+language; capped small.
  var WORD_BANK_KEY = 'allo_reading_lib_words';
  var WORD_BANK_CAP = 200;
  function loadWordBank() {
    try {
      var v = JSON.parse(localStorage.getItem(WORD_BANK_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (_) { return []; }
  }
  function saveWordBank(list) {
    try { localStorage.setItem(WORD_BANK_KEY, JSON.stringify((list || []).slice(0, WORD_BANK_CAP))); } catch (_) {}
  }
  function addToWordBank(entry) {
    var list = loadWordBank().filter(function (w) {
      return !(w && w.word === entry.word && w.language === entry.language);
    });
    list.unshift(entry);
    saveWordBank(list);
    return loadWordBank();
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
    { id: 'andika', label: 'Andika', cssClass: 'font-andika' },
    { id: 'serif', label: 'Serif', cssClass: 'font-readserif' },
  ];

  // The reader ships its own accessibility fonts so its picker never advertises
  // a font the host build didn't actually load. OpenDyslexic's @font-face is
  // installed globally by the host; Atkinson Hyperlegible, Lexend, Andika, and a
  // reading serif (Gentium Book Plus) previously fell back to system sans-serif
  // because no webface was loaded for them. Inject them once, and map the
  // reader font classes to the real families — scoped to .allo-docsuite so the
  // rest of the app is untouched. Offline (School Box) the CDN load simply
  // fails and the classes fall back to system fonts, exactly as before.
  function ensureReaderFonts() {
    try {
      if (typeof document === 'undefined' || !document.head) return;
      if (!document.getElementById('allo-reader-fonts-link')) {
        var link = document.createElement('link');
        link.id = 'allo-reader-fonts-link';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible&family=Lexend:wght@400;600&family=Andika&family=Gentium+Book+Plus&display=swap';
        document.head.appendChild(link);
      }
      if (!document.getElementById('allo-reader-fonts-css')) {
        var style = document.createElement('style');
        style.id = 'allo-reader-fonts-css';
        style.textContent = [
          '.allo-docsuite .font-opendyslexic,.allo-docsuite .font-opendyslexic *{font-family:"OpenDyslexic","Comic Sans MS",system-ui,sans-serif !important;}',
          '.allo-docsuite .font-atkinson,.allo-docsuite .font-atkinson *{font-family:"Atkinson Hyperlegible",system-ui,sans-serif !important;}',
          '.allo-docsuite .font-lexend,.allo-docsuite .font-lexend *{font-family:"Lexend",system-ui,sans-serif !important;}',
          '.allo-docsuite .font-andika,.allo-docsuite .font-andika *{font-family:"Andika","Segoe UI",system-ui,sans-serif !important;}',
          '.allo-docsuite .font-readserif,.allo-docsuite .font-readserif *{font-family:"Gentium Book Plus",Georgia,"Times New Roman",serif !important;}'
        ].join('\n');
        document.head.appendChild(style);
      }
    } catch (_) {}
  }

  // Whole-modal theming. The page surface is themed inline; the CHROME (toolbar,
  // pager, menus, browse cards, inputs) is a wall of light Tailwind tokens, so
  // we override the specific tokens the reader uses — scoped to a per-theme
  // class on the modal card (.rl-theme-<id>) so nothing outside the reader is
  // touched. Dark and High contrast are the ones that were jarring; the light
  // tints (sepia/warm/blue) get a matching frame too for consistency.
  var CHROME_THEMES = {
    dark: { card: '#0f172a', surf: '#1e293b', surf2: '#334155', surf3: '#475569', fg: '#e2e8f0', mut: '#94a3b8', border: '#334155', link: '#93c5fd' },
    highContrast: { card: '#000000', surf: '#000000', surf2: '#000000', surf3: '#111111', fg: '#ffffff', mut: '#ffffff', border: '#ffffff', link: '#ffff00', bw: '3px' },
    sepia: { card: '#f4ecd8', surf: '#efe6cf', surf2: '#e6dcc0', surf3: '#dccfae', fg: '#5b4636', mut: '#7a6a55', border: '#d8cbaa', link: '#8a5a2b' },
    warm: { card: '#fdf6e3', surf: '#f7efd8', surf2: '#efe6cf', surf3: '#e6dcc0', fg: '#433422', mut: '#6b5a45', border: '#e6dcc0', link: '#8a5a2b' },
    blue: { card: '#e8f0fe', surf: '#dbe7fb', surf2: '#cddcf6', surf3: '#bcd0f2', fg: '#1e293b', mut: '#475569', border: '#c7d7f0', link: '#1d4ed8' },
  };
  function chromeThemeClass(themeId) {
    return CHROME_THEMES[themeId] ? 'rl-theme-' + themeId : '';
  }
  function ensureReaderThemes() {
    try {
      if (typeof document === 'undefined' || !document.head) return;
      if (document.getElementById('allo-reader-themes-css')) return;
      var rules = [];
      Object.keys(CHROME_THEMES).forEach(function (id) {
        var t = CHROME_THEMES[id];
        var s = '.rl-theme-' + id;
        var bw = t.bw || '1px';
        rules.push(s + '{background:' + t.card + ' !important;color:' + t.fg + ';}');
        rules.push(s + ' .bg-white{background:' + t.surf + ' !important;}');
        rules.push(s + ' .bg-slate-50,' + s + ' .bg-slate-100{background:' + t.surf2 + ' !important;}');
        rules.push(s + ' .bg-slate-200{background:' + t.surf3 + ' !important;}');
        rules.push(s + ' .text-slate-900,' + s + ' .text-slate-800,' + s + ' .text-slate-700{color:' + t.fg + ' !important;}');
        rules.push(s + ' .text-slate-600,' + s + ' .text-slate-500,' + s + ' .text-slate-400{color:' + t.mut + ' !important;}');
        rules.push(s + ' .border-slate-100,' + s + ' .border-slate-200,' + s + ' .border-slate-300{border-color:' + t.border + ' !important;}');
        rules.push(s + ' input,' + s + ' select,' + s + ' textarea{background:' + t.surf + ' !important;color:' + t.fg + ' !important;border:' + bw + ' solid ' + t.border + ' !important;}');
        rules.push(s + ' a{color:' + t.link + ' !important;}');
        // The narration/read buttons keep their emerald identity; just make sure
        // their text stays legible on the themed surface for the darkest themes.
        if (id === 'dark' || id === 'highContrast') {
          rules.push(s + ' .hover\\:bg-slate-100:hover,' + s + ' .hover\\:bg-slate-200:hover{background:' + t.surf3 + ' !important;}');
        }
        if (t.bw) { // high contrast: thicker, fully visible control borders
          rules.push(s + ' button{border-color:' + t.border + ';}');
        }
      });
      var style = document.createElement('style');
      style.id = 'allo-reader-themes-css';
      style.textContent = rules.join('\n');
      document.head.appendChild(style);
    } catch (_) {}
  }
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

  // Provider rights are data-driven on full book records. The source-based
  // fallbacks also protect older/stale indexes that predate usagePolicy.
  function bookUsagePolicy(book) {
    if (book && book.usagePolicy && typeof book.usagePolicy === 'object') return book.usagePolicy;
    var source = bookSourceId(book);
    if (source === 'ck12') return { access: 'link-only', mirror: false, adapt: false, ai: false, commercial: false };
    if (source === 'openstax') return { access: isCardContent(book) ? 'link-out' : 'mirrored', mirror: true, adapt: true, ai: false, commercial: false, attributionRequired: true, shareAlike: true, aiPermissionRequired: true };
    return { access: isCardContent(book) ? 'link-out' : 'mirrored', ai: true };
  }

  function bookAllowsAi(book) {
    return bookUsagePolicy(book).ai !== false;
  }

  // Bloom talking books: the ordered clip URLs recorded for one page.
  function pageAudioClips(page) {
    return ((page && page.audio) || []).map(function (c) { return c && c.src; }).filter(Boolean);
  }

  // Multilingual Bloom records share one instanceId, and mirrored editions
  // share the slug prefix 'bloom-<inst8>-'. Returns the OTHER readable
  // language editions of the same work — a bilingual family's bridge.
  function bloomEditionsFor(slug, indexBooks) {
    var m = /^bloom-(?!card-)([a-z0-9]{8})-/.exec(String(slug || ''));
    if (!m) return [];
    var prefix = 'bloom-' + m[1] + '-';
    return (indexBooks || []).filter(function (b) {
      return b && b.slug !== slug && String(b.slug).indexOf(prefix) === 0 && !/card/.test(b.contentType || '');
    });
  }

  // "More by this author" — surface other books that share a real, personal
  // author, so finishing Anne of Green Gables offers Anne of Avonlea and a
  // prolific StoryWeaver author's other titles are one tap away. The catalog's
  // author field is noisy: Gutenberg's placeholder, and Bloom/StoryWeaver
  // collective credits (translator orgs, education projects) would each match
  // dozens of unrelated books, so those are filtered out and only genuine
  // personal names are matched.
  var GENERIC_AUTHOR_RE = /^(project gutenberg|unknown|anonymous|various|n a|multiple authors|editor|editors|staff)$/i;
  var ORG_AUTHOR_RE = /community|\bproject\b|translators|\beducation\b|cooperation|ministerio|usaid|foundation|council|initiative|\bteam\b|network|\bprogram\b|committee|association|enabling writers|world education|\bicc\b|\bntc\b|rbtt|jala|books$|library$|comunidad|colectivo|storyweaver|pratham|without ?borders/i;
  function normAuthor(a) {
    return String(a || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function isPersonalAuthor(a) {
    var n = normAuthor(a);
    return !!n && !GENERIC_AUTHOR_RE.test(n) && !ORG_AUTHOR_RE.test(String(a)) && n.split(' ').length <= 5;
  }
  function moreByAuthor(book, indexBooks, excludeSlugs, limit) {
    if (!book) return [];
    var mine = {};
    (book.authors || []).forEach(function (a) { if (isPersonalAuthor(a)) mine[normAuthor(a)] = true; });
    if (!Object.keys(mine).length) return [];
    var skip = excludeSlugs || {};
    var out = (indexBooks || []).filter(function (b) {
      if (!b || b.slug === book.slug || skip[b.slug]) return false;
      if (/card/.test(b.contentType || '')) return false;
      return (b.authors || []).some(function (a) { return mine[normAuthor(a)]; });
    });
    // Same-language titles first (a bilingual family still reaches the others
    // if fewer than `limit` share the reading language), then alphabetical.
    out.sort(function (a, b) {
      var la = a.language === book.language ? 0 : 1;
      var lb = b.language === book.language ? 0 : 1;
      if (la !== lb) return la - lb;
      return String(a.title || '').localeCompare(String(b.title || ''));
    });
    return out.slice(0, limit || 8);
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

  function bookPlainText(book, options) {
    if (!book) return '';
    // Book-aware extraction is the public pipeline boundary. Providers that
    // prohibit generative-AI ingestion return no text unless the caller
    // explicitly identifies a local, non-AI accessibility rendering.
    if (!bookAllowsAi(book) && !(options && options.localAccessibility === true)) return '';
    return bookPlainTextFromPages(book.title, book.pages);
  }

  function countWords(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Estimated reading time from the word count and a level-appropriate silent
  // reading rate (early readers are slower). Returns '' when we have no honest
  // word count (e.g. link-out source cards). Kept deliberately approximate —
  // labelled with "~" so it reads as a guide, not a promise.
  var LEVEL_WPM = { 1: 55, 2: 80, 3: 110, 4: 140, 5: 170, 6: 190 };
  function bookWordCount(book) {
    if (!book) return 0;
    if (typeof book.wordCount === 'number' && book.wordCount > 0) return book.wordCount;
    if (book.stats && typeof book.stats.words === 'number' && book.stats.words > 0) return book.stats.words;
    return 0;
  }
  function readingTimeLabel(book) {
    if (!book || isCardContent(book)) return '';
    var words = bookWordCount(book);
    if (!words) return '';
    var wpm = LEVEL_WPM[Number(book.level)] || 140;
    var mins = Math.max(1, Math.round(words / wpm));
    if (mins < 60) return '~' + mins + ' ' + tr('readinglib_min', 'min');
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return '~' + h + ' ' + tr('readinglib_hr', 'hr') + (m ? ' ' + m + ' ' + tr('readinglib_min', 'min') : '');
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
    // Clamp to the viewport on both axes so a word near the right edge or the
    // bottom of the page doesn't push the popup off-screen (it used to only
    // clamp X). Flip above the word when there isn't room below.
    var vw = window.innerWidth || 800;
    var vh = window.innerHeight || 600;
    var estH = d.loading ? 90 : 150;
    var below = d.y + 12;
    var top = (below + estH > vh - 8) ? Math.max(8, d.y - estH - 8) : below;
    var style = {
      position: 'fixed',
      left: Math.max(8, Math.min(d.x, vw - 280)) + 'px',
      top: top + 'px',
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
    // Resume where the reader left off — long-form texts only (picture books
    // are short enough to just reopen at the start, and this keeps their
    // behavior unchanged). Lazy initializer runs once per mounted book.
    var _pg = useState(function () {
      var p = book.pages || [];
      if (!isLongFormBook(book, p)) return 0;
      return clampIndex(loadReadingPos(book.slug), 0, Math.max(0, p.length - 1));
    });
    var pageIdx = _pg[0]; var setPageIdx = _pg[1];
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
    // Bilingual side-by-side: show the ORIGINAL page next to the translation
    // (dual-language families read together; ELL students check line by line).
    // Only meaningful while a translation is ready; ephemeral like it.
    var _bi = useState(false); var bilingual = _bi[0]; var setBilingual = _bi[1];
    // Reading supports: persisted text/display prefs + overlay launchers.
    var _prefs = useState(loadReaderPrefs); var readerPrefs = _prefs[0]; var setReaderPrefsState = _prefs[1];
    var _aa = useState(false); var aaOpen = _aa[0]; var setAaOpen = _aa[1];
    var _tools = useState(false); var toolsOpen = _tools[0]; var setToolsOpen = _tools[1];
    var _ovl = useState(null); var overlay = _ovl[0]; var setOverlay = _ovl[1]; // 'focus' | 'karaoke' | 'crawl'
    var _ry = useState(null); var rulerY = _ry[0]; var setRulerY = _ry[1];
    var _rate = useState(1); var narrationRate = _rate[0]; var setNarrationRate = _rate[1];
    // Continuous read-aloud (auto page-turn) for text-only books; bookmarks;
    // and the editable jump-to-page field.
    var _auto = useState(false); var autoRead = _auto[0]; var setAutoRead = _auto[1];
    var _bm = useState(function () { return loadBookmarks(book.slug); }); var bookmarks = _bm[0]; var setBookmarks = _bm[1];
    // Word bank: Define-mode lookups saved for review (device-local).
    var _wb = useState(loadWordBank); var wordBank = _wb[0]; var setWordBank = _wb[1];
    var _wbo = useState(false); var wordsOpen = _wbo[0]; var setWordsOpen = _wbo[1];
    var _ji = useState('1'); var jumpInput = _ji[0]; var setJumpInput = _ji[1];
    var autoReadRef = useRef(false);
    var pageIdxRef = useRef(pageIdx);
    var setReaderPrefs = function (patch) {
      setReaderPrefsState(function (prev) {
        var next = Object.assign({}, prev, patch);
        saveReaderPrefs(next);
        return next;
      });
      // Let the modal chrome follow the page-color theme.
      if (patch && Object.prototype.hasOwnProperty.call(patch, 'theme') && typeof props.onThemeChange === 'function') {
        props.onThemeChange(patch.theme);
      }
    };
    var audioRef = useRef(null);
    var fbAtRef = useRef(0); // debounce narration→TTS fallback (play-reject + onError can both fire)
    var clipIdxRef = useRef(0); // per-page clip queue position (Bloom talking books)
    var clipErrAtRef = useRef(0); // debounce clip-skip (play-reject + onError can both fire)
    var pageAudioContinueRef = useRef(false); // auto page-turn should resume narration

    var pages = book.pages || [];
    var page = pages[pageIdx] || null;
    // Two independent capabilities. A book can have the human-narration mp3
    // but NO cue timings — StoryWeaver serves the audio publicly yet some VTT
    // cue files 403 on their bucket. In that case we still play the real
    // narration; we just can't word-highlight or auto-turn pages. Downgrading
    // the whole feature to robotic TTS (the old behavior) threw away real audio.
    var hasAudioTrack = !!(book.audio && book.audio.src);
    var hasCues = !!(book.audio && book.audio.cues && book.audio.cues.length);
    // Bloom talking books have no whole-book mp3; each page carries an
    // ordered list of recorded clips (page.audio = [{src,dur}…]) played as a
    // queue through the same <audio> element, auto-turning at page end. This
    // is real human narration for languages that often have NO TTS voice.
    var hasPageAudio = !!(book.audio && book.audio.mode === 'perPage');

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
      : bookPlainText(book, { localAccessibility: true });
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
    var bookAttributionUrl = (book.source && book.source.attributionUrl) || bookSourceUrl;
    var pageSourceUrl = (page && page.sourceUrl) || bookSourceUrl;
    var pageSourceHref = pageSourceUrl && pageSourceUrl !== '#' ? pageSourceUrl : '';
    var usagePolicy = bookUsagePolicy(book);
    var allowsAi = bookAllowsAi(book);
    var externalSourceText = allowsAi ? selectedSource.text : '';
    var linkOnly = usagePolicy.access === 'link-only';
    var isMirroredOpenStax = bookSourceId(book) === 'openstax' && !isCardContent(book);

    // Reading-support derivations. Theme colors go on the page area + text;
    // font class re-applies the accessibility font inside this fixed modal.
    var pageTheme = readerTheme(readerPrefs.theme);
    var fontClass = readerFontClass(readerPrefs.font);
    var textStyle = {};
    if (readerPrefs.textScale && readerPrefs.textScale !== 1) textStyle.fontSize = readerPrefs.textScale + 'em';
    if (readerPrefs.lineHeight) textStyle.lineHeight = readerPrefs.lineHeight;
    if (readerPrefs.letterSpacing) textStyle.letterSpacing = readerPrefs.letterSpacing + 'em';
    if (readerPrefs.wordSpacing) textStyle.wordSpacing = readerPrefs.wordSpacing + 'em';
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
      setBookmarks(loadBookmarks(book.slug));
    }, [book.slug]);

    // Mirror the page index into a ref (the speech listener reads it without
    // re-subscribing) and persist the reading position for long-form texts.
    useEffect(function () {
      pageIdxRef.current = pageIdx;
      if (isLongFormBook(book, pages)) saveReadingPos(book.slug, pageIdx);
      setJumpInput(String(pageIdx + 1));
    }, [pageIdx, book.slug]);

    // Per-page narration continues across its own auto page-turn (manual
    // navigation goes through go() → stopAll, which clears the flag).
    useEffect(function () {
      if (!pageAudioContinueRef.current) return;
      pageAudioContinueRef.current = false;
      startPageClips(pages[pageIdx] || null);
    }, [pageIdx]);

    var lines = useMemo(function () {
      if (!page) return [];
      // Translated view has no cue timings — tokens render un-highlightable.
      if (txReady) return assignCues(displayPageText, null);
      return assignCues(displayPageText, page.words);
    }, [page, txReady, displayPageText]);

    var stopAll = useCallback(function () {
      autoReadRef.current = false;
      pageAudioContinueRef.current = false;
      setAutoRead(false);
      stopSpeech();
      var a = audioRef.current;
      if (a) { try { a.pause(); } catch (_) {} }
      setNarrating(false);
      setActiveCue(null);
    }, []);

    useEffect(function () { return stopAll; }, [stopAll]);
    useEffect(function () { setPopup(null); }, [pageIdx]);

    // Continuous read-aloud for text-only books: when a page's TTS finishes
    // (AlloSpeechPlayer emits 'allo-speech-state' with isPlaying=false), turn
    // to the next non-empty page and read on. Manual navigation clears
    // autoReadRef via stopAll, so a user page-turn cleanly stops the chain.
    var speakPageText = function (idx) {
      var src = sourcePages[idx];
      var text = txReady ? cleanReadingText((src && src.text) || '') : pageTextForPipeline(src);
      if (!text) return false;
      return speak(text, displayLanguage);
    };
    useEffect(function () {
      var onSpeechState = function (ev) {
        if (!autoReadRef.current) return;
        var st = ev && ev.detail;
        if (!st || st.isPlaying) return; // only act on a genuine finish
        var next = pageIdxRef.current + 1;
        var max = sourcePages.length - 1;
        while (next <= max) {
          var src = sourcePages[next];
          var text = txReady ? cleanReadingText((src && src.text) || '') : pageTextForPipeline(src);
          if (text) break;
          next++;
        }
        if (next > max) { autoReadRef.current = false; setAutoRead(false); return; }
        setPageIdx(next);
        if (!speakPageText(next)) { autoReadRef.current = false; setAutoRead(false); }
      };
      window.addEventListener('allo-speech-state', onSpeechState);
      return function () { window.removeEventListener('allo-speech-state', onSpeechState); };
    }, [sourcePages, txReady, displayLanguage]);

    var toggleAutoRead = function () {
      if (autoReadRef.current) { stopAll(); return; }
      // Start from the current page; stop narration mp3 without clearing the
      // auto flag (stopAll would).
      stopSpeech();
      var a = audioRef.current;
      if (a) { try { a.pause(); } catch (_) {} }
      setNarrating(false); setActiveCue(null); setPopup(null);
      autoReadRef.current = true; setAutoRead(true);
      if (!speakPageText(pageIdx)) {
        autoReadRef.current = false; setAutoRead(false);
        props.addToast && props.addToast(tr('readinglib_tts_unavailable', 'Read-aloud is not available right now.'), 'error');
      }
    };

    var goTo = useCallback(function (idx) {
      stopAll();
      setPageIdx(function () { return clampIndex(idx, 0, (book.pages || []).length - 1); });
    }, [book.pages, stopAll]);

    var toggleBookmark = function () {
      var has = bookmarks.indexOf(pageIdx) !== -1;
      var next = has ? bookmarks.filter(function (n) { return n !== pageIdx; }) : bookmarks.concat([pageIdx]);
      next.sort(function (a, b) { return a - b; });
      setBookmarks(next);
      saveBookmarks(book.slug, next);
    };

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

    // ---- Per-page clip queue (Bloom talking books) ----
    var startPageClips = function (targetPage) {
      var clips = pageAudioClips(targetPage);
      var a = audioRef.current;
      if (!a || !clips.length) { setNarrating(false); return; }
      clipIdxRef.current = 0;
      a.src = clips[0];
      try { a.playbackRate = narrationRate; } catch (_) {}
      a.play().then(function () { setNarrating(true); }).catch(function () { handleClipError(); });
    };
    var advanceClip = function () {
      var clips = pageAudioClips(page);
      var next = clipIdxRef.current + 1;
      var a = audioRef.current;
      if (a && next < clips.length) {
        clipIdxRef.current = next;
        a.src = clips[next];
        try { a.playbackRate = narrationRate; } catch (_) {}
        a.play().catch(function () { handleClipError(); });
        return;
      }
      // Page finished — continue onto the next page that has narration.
      for (var i = pageIdx + 1; i < pages.length; i++) {
        if (pageAudioClips(pages[i]).length) {
          pageAudioContinueRef.current = true;
          setPageIdx(i);
          return;
        }
      }
      setNarrating(false);
    };
    // A dead clip URL should skip forward, not kill the reading (these
    // languages usually have no TTS to fall back to). Debounced because a
    // failed play() rejects AND fires the element's error event.
    var handleClipError = function () {
      var now = Date.now();
      if (now - clipErrAtRef.current < 400) return;
      clipErrAtRef.current = now;
      advanceClip();
    };

    var toggleNarration = function () {
      var a = audioRef.current;
      if (!a) { narrationFallback(); return; }
      if (narrating) { a.pause(); pageAudioContinueRef.current = false; setNarrating(false); return; }
      stopSpeech();
      if (hasPageAudio) { startPageClips(page); return; }
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
        if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey) return;
        var tag = (ev.target && ev.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        var next = displayRtl ? -1 : 1;
        if (ev.key === 'ArrowRight') { go(next); }
        else if (ev.key === 'ArrowLeft') { go(-next); }
        else if (ev.key === 'Home') { ev.preventDefault(); goTo(0); }
        else if (ev.key === 'End') { ev.preventDefault(); goTo((book.pages || []).length - 1); }
        else if (ev.key === 'b' || ev.key === 'B') { toggleBookmark(); }
      };
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [go, goTo, displayRtl, book.pages, bookmarks, pageIdx]);

    // Toolbar dropdowns (Aa, Reading tools, Translate, Create) dismiss on an
    // outside click or Escape.
    var closeMenus = function () { setAaOpen(false); setToolsOpen(false); setGenOpen(false); setTxMenuOpen(false); };
    useEffect(function () {
      if (!(aaOpen || toolsOpen || genOpen || txMenuOpen)) return;
      var onDown = function (ev) {
        var t = ev.target;
        if (!t || !t.closest || !t.closest('[data-rl-menu]')) closeMenus();
      };
      var onEsc = function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); closeMenus(); } };
      document.addEventListener('mousedown', onDown, true);
      document.addEventListener('keydown', onEsc, true);
      return function () {
        document.removeEventListener('mousedown', onDown, true);
        document.removeEventListener('keydown', onEsc, true);
      };
    }, [aaOpen, toolsOpen, genOpen, txMenuOpen]);

    // Mouse click and keyboard (Enter/Space) both route here; keyboard passes
    // the word element's rectangle so the popup anchors under the focused word.
    var onWordClick = function (word, ev) {
      if (mode === 'read') return;
      var x = 40, y = 40;
      if (ev && typeof ev.clientX === 'number' && (ev.clientX || ev.clientY)) { x = ev.clientX; y = ev.clientY; }
      else if (ev && ev.currentTarget && ev.currentTarget.getBoundingClientRect) {
        var r = ev.currentTarget.getBoundingClientRect(); x = r.left; y = r.bottom;
      }
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
          var textClean = String(res || '').trim();
          setPopup(function (p) { return p && p.word === clean ? { type: 'define', word: clean, x: x, y: y, loading: false, text: textClean } : p; });
          // A successful lookup joins the personal word bank for later review.
          if (textClean) {
            setWordBank(addToWordBank({
              word: clean, text: textClean, language: displayLanguage,
              bookTitle: displayTitle, slug: book.slug, ts: Date.now(),
            }));
          }
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
      if (!allowsAi) {
        props.addToast && props.addToast(tr('readinglib_provider_ai_blocked', 'This provider requires permission for generative-AI use, so Extract to Source and AI handoffs are blocked.'), 'info');
        return;
      }
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
        if (typeof props.setInputText === 'function') props.setInputText(externalSourceText);
        if (typeof props.onSaveToLesson === 'function') props.onSaveToLesson(bookRef());
        props.handleGenerate(type, langOverride, false, externalSourceText);
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
      if (!allowsAi) {
        props.addToast && props.addToast(tr('readinglib_provider_ai_blocked', 'This provider requires permission for generative-AI use, so Extract to Source and AI handoffs are blocked.'), 'info');
        return;
      }
      if (typeof props.setInputText !== 'function') {
        props.addToast && props.addToast(tr('readinglib_generate_unavailable', 'Generation is not available right now.'), 'error');
        return;
      }
      props.setInputText(externalSourceText);
      props.addToast && props.addToast('"' + displayTitle + '" (' + selectedSource.label + ') ' + tr('readinglib_loaded_doc', 'is loaded as your source text - all the create tools can use it now.'), 'success');
      props.onExit && props.onExit(true);
    };

    // Full displayed text (translation-aware) as [title, ...page texts]. Used
    // by both Print and Download so the two stay in lockstep with what's on
    // screen (original or AI translation).
    var exportPageTexts = function () {
      return sourcePages.map(function (p) {
        return txReady ? cleanReadingText((p && p.text) || '') : pageTextForPipeline(p);
      }).filter(Boolean);
    };

    // Print a clean, reader-friendly copy of the whole book (a teacher handout
    // or a paper reading). Opens a print window; pop-up blockers are handled.
    var printBook = function () {
      setGenOpen(false);
      var w;
      try { w = window.open('', '_blank'); } catch (_) { w = null; }
      if (!w || !w.document) {
        props.addToast && props.addToast(tr('readinglib_print_blocked', 'Your browser blocked the print window — allow pop-ups and try again.'), 'error');
        return;
      }
      var paras = exportPageTexts().map(function (t) {
        return t.split(/\n{2,}/).map(function (par) {
          return '<p>' + escapeHtml(par).replace(/\n/g, '<br>') + '</p>';
        }).join('');
      }).join('');
      var srcLine = escapeHtml(bookSourceName) + ' — ' + escapeHtml(book.license || 'CC BY 4.0') +
        (isMirroredOpenStax ? '<br>Access for free at ' + escapeHtml(bookAttributionUrl) : '');
      var aiNote = txReady ? '<p class="ai">🤖 ' + escapeHtml(tr('readinglib_attr_ai_translated', 'AI-translated into') + ' ' + translation.language + ' — ' + tr('readinglib_print_ai_note', 'AI translation, not reviewed by the publisher.')) + '</p>' : '';
      var html = '<!doctype html><html' + (displayRtl ? ' dir="rtl"' : '') + '><head><meta charset="utf-8"><title>' + escapeHtml(displayTitle) + '</title>' +
        '<style>body{font-family:Georgia,"Times New Roman",serif;max-width:720px;margin:32px auto;padding:0 20px;line-height:1.65;color:#111}' +
        'h1{font-size:1.6rem;margin:0 0 .3em}p{margin:0 0 .8em}.attr{color:#555;font-size:.85rem}.foot{color:#555;font-size:.8rem;border-top:1px solid #ccc;margin-top:24px;padding-top:8px}' +
        '.ai{color:#92400e;background:#fef3c7;padding:8px 10px;border-radius:6px;font-size:.85rem;margin:8px 0}@media print{body{margin:0}}</style></head><body>' +
        '<h1>' + escapeHtml(displayTitle) + '</h1>' +
        (attributionLine(book) ? '<p class="attr">' + escapeHtml(attributionLine(book)) + '</p>' : '') +
        aiNote + paras +
        '<p class="foot">' + srcLine + '</p></body></html>';
      try {
        w.document.open(); w.document.write(html); w.document.close(); w.focus();
        setTimeout(function () { try { w.print(); } catch (_) {} }, 350);
      } catch (_) {
        props.addToast && props.addToast(tr('readinglib_print_failed', 'Could not open the print view.'), 'error');
      }
    };

    // Download the displayed book as a plain-text file.
    var downloadText = function () {
      setGenOpen(false);
      try {
        var parts = [displayTitle];
        if (attributionLine(book)) parts.push(attributionLine(book));
        exportPageTexts().forEach(function (t) { parts.push(t); });
        parts.push('— ' + bookSourceName + ' (' + (book.license || 'CC BY 4.0') + ')' + (txReady ? ' · AI-translated into ' + translation.language : ''));
        if (isMirroredOpenStax) parts.push('Access for free at ' + bookAttributionUrl);
        var blob = new Blob([parts.join('\n\n')], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = (book.slug || 'reading-library-text') + (txReady ? '-' + String(translation.language).toLowerCase().replace(/[^a-z0-9]+/g, '-') : '') + '.txt';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
        props.addToast && props.addToast(tr('readinglib_downloaded', 'Saved the book text to your device.'), 'success');
      } catch (_) {
        props.addToast && props.addToast(tr('readinglib_download_failed', 'Could not download the text.'), 'error');
      }
    };

    // Open the displayed scope directly in Lingua Practice. The host owns the
    // cross-tool transition; Reading Library only emits clean text + context.
    var openInLingua = function () {
      if (!allowsAi) {
        props.addToast && props.addToast(tr('readinglib_provider_ai_blocked', 'This provider requires permission for generative-AI use, so Extract to Source and AI handoffs are blocked.'), 'info');
        return;
      }
      if (typeof props.onPracticeLanguage !== 'function') return;
      props.onPracticeLanguage({
        text: externalSourceText,
        title: displayTitle,
        selectionLabel: selectedSource.label,
        language: displayLanguage || book.language || '',
      });
      props.addToast && props.addToast('"' + displayTitle + '" is ready in Lingua Practice.', 'success');
      props.onExit && props.onExit(true);
    };

    // AI-translate the whole book in one call (consistent names/terms across
    // pages). Page count must round-trip exactly so page turns stay aligned
    // with the artwork; parseTranslation rejects anything else.
    var translateBook = function (target) {
      if (!allowsAi) {
        props.addToast && props.addToast(tr('readinglib_provider_ai_blocked', 'This provider requires permission for generative-AI use, so Extract to Source and AI handoffs are blocked.'), 'info');
        return;
      }
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
        cover: typeof book.cover === 'string' ? book.cover : (book.cover && book.cover.card) || null,
        hasAudio: !!book.audio,
        pageCount: (book.pages || []).length,
        description: book.description || '',
        attribution: attributionLine(book),
        sourceId: bookSourceId(book),
        sourceName: sourceLabel(bookSourceId(book)),
        license: book.license || '',
        usagePolicy: usagePolicy,
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
        pageSourceHref ? e('a', {
          className: 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100',
          href: pageSourceHref,
          target: '_blank',
          rel: 'noopener noreferrer',
          title: tr('readinglib_open_original_hint', 'Open the official source page for this section'),
        }, tr('readinglib_open_original', 'Open original')) : null,
        (hasAudioTrack || hasPageAudio) && !txReady ? e('button', {
          className: 'px-3 py-1.5 rounded-lg text-sm font-semibold ' + (narrating ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'),
          onClick: toggleNarration,
          'aria-pressed': narrating,
          title: hasCues ? undefined : tr('readinglib_audio_no_sync', 'Human narration (no word-by-word highlighting for this book)'),
        }, narrating ? '⏸ ' + tr('readinglib_pause', 'Pause') : '🔊 ' + tr('readinglib_read_to_me', 'Read to me')) : e('button', {
          className: 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
          onClick: readPageTts,
        }, '🔊 ' + tr('readinglib_read_page', 'Read this page')),
        (hasAudioTrack || hasPageAudio) && !txReady ? e('button', {
          className: 'px-2 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 tabular-nums',
          onClick: function () { setNarrationRate(narrationRate === 1 ? 1.25 : narrationRate === 1.25 ? 0.75 : 1); },
          title: tr('readinglib_narration_speed', 'Narration speed'),
          'aria-label': tr('readinglib_narration_speed', 'Narration speed') + ': ' + narrationRate + '×',
        }, narrationRate + '×') : null,
        // Continuous read-aloud with auto page-turn — for text-only books (full
        // texts have no narration mp3) and AI translations (cues can't map). The
        // pre-recorded narration path already auto-advances, so skip it there.
        (sourcePages.length > 1 && (!(hasAudioTrack || hasPageAudio) || txReady)) ? e('button', {
          className: 'px-2 py-1.5 rounded-lg text-sm font-semibold border ' +
            (autoRead ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'),
          onClick: toggleAutoRead,
          'aria-pressed': autoRead,
          title: tr('readinglib_read_aloud_hint', 'Read the book aloud and turn the pages automatically'),
        }, autoRead ? '⏸ ' + tr('readinglib_stop_reading', 'Stop') : '▶ ' + tr('readinglib_read_aloud', 'Read aloud')) : null,
        allowsAi ? modeBtn('define', '📖', tr('readinglib_mode_define', 'Define')) : null,
        allowsAi ? modeBtn('phonics', '🔤', tr('readinglib_mode_phonics', 'Sounds')) : null,
        e('button', {
          className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-white text-slate-700 border-slate-200 hover:bg-slate-100',
          onClick: function () { setWordsOpen(true); setPopup(null); },
          title: tr('readinglib_words_hint', 'Words you looked up, saved on this device'),
        }, '📒 ' + tr('readinglib_my_words', 'My words') + (wordBank.length ? ' (' + wordBank.length + ')' : '')),
        // Aa — reading supports (font, size, spacing, page color, ruler).
        e('div', { className: 'relative', 'data-rl-menu': 'aa' },
          e('button', {
            className: 'px-2 py-1 rounded-lg text-sm font-bold border ' +
              (aaOpen ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
            onClick: function () { var v = !aaOpen; closeMenus(); setAaOpen(v); },
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
            e('div', null,
              e('div', { className: 'text-[11px] font-bold uppercase text-slate-500 mb-1' }, tr('readinglib_aa_word', 'Word spacing')),
              e('div', { className: 'flex gap-1' }, [[0, tr('readinglib_aa_normal', 'Normal')], [0.16, tr('readinglib_aa_wide', 'Wide')], [0.32, tr('readinglib_aa_wider', 'Wider')]].map(function (opt) {
                return e('button', {
                  key: String(opt[0]),
                  className: 'px-2 py-1 rounded-lg text-xs font-semibold border ' +
                    (readerPrefs.wordSpacing === opt[0] ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
                  onClick: function () { setReaderPrefs({ wordSpacing: opt[0] }); },
                  'aria-pressed': readerPrefs.wordSpacing === opt[0],
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
              onClick: function () { setReaderPrefsState(function () { saveReaderPrefs(READER_PREFS_DEFAULTS); return Object.assign({}, READER_PREFS_DEFAULTS); }); if (typeof props.onThemeChange === 'function') props.onThemeChange(READER_PREFS_DEFAULTS.theme); },
            }, tr('readinglib_aa_reset', 'Reset to defaults'))
          ) : null
        ),
        // Reading tools — hand this book's text to the app's immersive overlays.
        (window.AlloModules && (window.AlloModules.FocusReaderOverlay || window.AlloModules.KaraokeReaderOverlay)) ? e('div', { className: 'relative', 'data-rl-menu': 'tools' },
          e('button', {
            className: 'px-2 py-1 rounded-lg text-sm font-semibold border ' +
              (toolsOpen ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
            onClick: function () { var v = !toolsOpen; closeMenus(); setToolsOpen(v); },
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
        allowsAi ? e('div', { className: 'relative', 'data-rl-menu': 'tx' },
          e('button', {
            className: 'px-2 py-1 rounded-lg text-sm font-semibold border ' +
              (txReady ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
            onClick: function () { var v = !txMenuOpen; closeMenus(); setTxMenuOpen(v); },
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
        ) : null,
        allowsAi ? e('button', {
          className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-white text-slate-700 border-slate-200 hover:bg-slate-100',
          onClick: function () { setShowPractice(!showPractice); },
          'aria-pressed': showPractice,
        }, '🎙️ ' + tr('readinglib_practice', 'Practice')) : null,
        allowsAi && typeof props.onPracticeLanguage === 'function' ? e('button', {
          className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100',
          onClick: openInLingua,
          title: tr('readinglib_lingua_hint', 'Practice this reading with vocabulary, speaking, and conversation activities'),
        }, 'A/文 ' + tr('readinglib_lingua', 'Lingua Practice')) : null,
        props.isTeacherMode && typeof props.onSaveToLesson === 'function' ? e('button', {
          className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
          onClick: saveToLesson,
          title: tr('readinglib_save_lesson_hint', 'Students who load this lesson can open the book from Resources'),
        }, '📌 ' + tr('readinglib_save_lesson', 'Save to lesson')) : null,
        allowsAi ? e('div', { className: 'relative', 'data-rl-menu': 'create' },
          e('button', {
            className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
            onClick: function () { var v = !genOpen; closeMenus(); setGenOpen(v); },
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
            }, tr('readinglib_open_as_doc', 'Use as source text…')),
            // Document Builder hand-off: the selected scope becomes an
            // editable reading-passage section (with full attribution — the
            // CC-BY credit travels INTO the distributed handout) and the
            // builder opens with every export format available. Teacher-gated
            // like save-to-lesson; hidden when the host doesn't wire it
            // (Canvas load order, older hosts).
            (props.isTeacherMode && typeof props.onOpenInDocBuilder === 'function' && !isCardContent(book)) ? e('button', {
              role: 'menuitem',
              className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-indigo-50',
              title: tr('readinglib_docbuilder_hint', 'Turn this selection into an editable, exportable handout in the Document Builder'),
              onClick: function () {
                setGenOpen(false);
                props.onOpenInDocBuilder({
                  slug: book.slug,
                  title: displayTitle,
                  text: externalSourceText,
                  scopeLabel: selectedSource.label,
                  attribution: [
                    attributionLine(book),
                    bookSourceName,
                    book.license || 'CC BY 4.0',
                    (bookSourceUrl && bookSourceUrl !== '#') ? bookSourceUrl : null,
                    txReady ? ('🤖 ' + tr('readinglib_attr_ai_translated', 'AI-translated into') + ' ' + translation.language) : null,
                  ].filter(Boolean).join(' · '),
                  language: displayLanguage,
                });
              },
            }, '📄 ' + tr('readinglib_open_docbuilder', 'Open in Document Builder…')) : null,
            !isCardContent(book) ? e('button', {
              role: 'menuitem',
              className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-indigo-50',
              title: tr('readinglib_print_hint', 'Open a clean, printable copy of the whole book'),
              onClick: printBook,
            }, '🖨 ' + tr('readinglib_print', 'Print…')) : null,
            !isCardContent(book) ? e('button', {
              role: 'menuitem',
              className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-indigo-50',
              title: tr('readinglib_download_hint', 'Save the book text as a plain-text file'),
              onClick: downloadText,
            }, '⤓ ' + tr('readinglib_download_txt', 'Download text (.txt)')) : null
          ) : null
        ) : linkOnly ? e('span', {
          className: 'px-2 py-1 rounded-lg text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-300',
          title: tr('readinglib_link_only_hint', 'Open the official provider site to use this material. Mirroring and AI tools are disabled for this source.')
        }, '↗ ' + tr('readinglib_link_only', 'Link only · AI off')) : e('div', { className: 'relative', 'data-rl-menu': 'export' },
          e('button', {
            className: 'px-2 py-1 rounded-lg text-sm font-semibold border bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
            onClick: function () { var v = !genOpen; closeMenus(); setGenOpen(v); },
            'aria-expanded': genOpen,
            title: tr('readinglib_export_hint', 'Print or download this non-AI accessible copy')
          }, '⤓ ' + tr('readinglib_export', 'Export') + ' ▾'),
          genOpen ? e('div', { className: 'absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-20' },
            e('div', { className: 'px-3 py-2 text-[11px] text-slate-600 bg-slate-50 rounded-lg mb-1' },
              tr('readinglib_openstax_ai_off', 'OpenStax AI handoffs are off; non-AI accessibility and export remain available.')),
            e('button', { role: 'menuitem', className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-indigo-50', onClick: printBook },
              '🖨 ' + tr('readinglib_print', 'Print…')),
            e('button', { role: 'menuitem', className: 'block w-full text-left px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-indigo-50', onClick: downloadText },
              '⤓ ' + tr('readinglib_download_txt', 'Download text (.txt)'))
          ) : null
        )
      ),
      (hasAudioTrack || hasPageAudio) && !txReady ? e('audio', {
        ref: audioRef, src: hasAudioTrack ? book.audio.src : undefined, preload: 'none',
        onTimeUpdate: hasCues ? onTimeUpdate : undefined,
        onEnded: function () {
          if (hasPageAudio && narrating) { advanceClip(); return; }
          setNarrating(false); setActiveCue(null);
        },
        // Some browsers resolve play() then fire 'error' on a dead media URL;
        // whole-book narration falls back to TTS, per-page clips skip forward
        // (both debounced against play()'s own reject).
        onError: function () { if (hasPageAudio) { handleClipError(); return; } narrationFallback(); },
      }) : null,
      showPractice ? e(PracticePanel, { book: book, refText: displayPlainText, onClose: function () { setShowPractice(false); } }) : null,
      // My words — review panel for the personal word bank. allo-docsuite on
      // the fixed backdrop keeps host dark-theme rules applying (see docsuite
      // theme-reactivity convention for overlays outside the main modal).
      wordsOpen ? e('div', {
        className: 'allo-docsuite fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-3',
        onClick: function (ev) { if (ev.target === ev.currentTarget) setWordsOpen(false); },
      },
        e('div', {
          className: 'bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col p-4',
          role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('readinglib_my_words', 'My words'),
          'data-testid': 'word-bank',
        },
          e('div', { className: 'flex items-center justify-between gap-2 pb-2 border-b border-slate-200' },
            e('div', { className: 'font-bold text-slate-800' }, '📒 ' + tr('readinglib_my_words', 'My words') + ' · ' + wordBank.length),
            e('div', { className: 'flex gap-1.5' },
              // Vocabulary handout: the word bank rides the same Document
              // Builder bridge as book passages — a markdown list becomes an
              // editable 'simplified' section, no extra host wiring needed.
              (allowsAi && wordBank.length && props.isTeacherMode && typeof props.onOpenInDocBuilder === 'function') ? e('button', {
                className: 'px-2 py-1 rounded-lg text-[12px] font-semibold text-teal-700 border border-teal-200 hover:bg-teal-50',
                title: tr('readinglib_words_handout_hint', 'Turn these words into an editable vocabulary handout in the Document Builder'),
                onClick: function () {
                  setWordsOpen(false);
                  props.onOpenInDocBuilder({
                    slug: 'word-bank',
                    title: tr('readinglib_words_handout_title', 'My words — vocabulary list'),
                    text: wordBank.map(function (w) {
                      return '- **' + w.word + '**' + (w.text ? ' — ' + w.text : '') +
                        (w.bookTitle ? ' *(' + w.bookTitle + ')*' : '');
                    }).join('\n'),
                    scopeLabel: String(wordBank.length) + ' ' + tr('readinglib_words', 'words'),
                    attribution: '',
                    language: displayLanguage,
                  });
                },
              }, '📄 ' + tr('readinglib_words_handout', 'Make a handout')) : null,
              wordBank.length ? e('button', {
                className: 'px-2 py-1 rounded-lg text-[12px] font-semibold text-red-700 border border-red-200 hover:bg-red-50',
                onClick: function () { saveWordBank([]); setWordBank([]); },
              }, tr('readinglib_words_clear', 'Clear all')) : null,
              e('button', {
                className: 'px-2 py-1 rounded-lg text-[12px] font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100',
                onClick: function () { setWordsOpen(false); },
              }, tr('readinglib_close', 'Close')))),
          e('div', { className: 'text-[11px] text-slate-500 py-1' },
            tr('readinglib_words_note', 'Words you look up in Define mode are saved here — on this device only.')),
          e('div', { className: 'flex-1 min-h-0 overflow-y-auto' },
            wordBank.length === 0 ? e('div', { className: 'text-sm text-slate-500 italic py-4 text-center' },
              tr('readinglib_words_empty', 'No words yet — turn on Define mode and tap any word in a book.')) :
            wordBank.map(function (w, i) {
              return e('div', { key: (w.word || '') + '|' + (w.language || '') + '|' + i, className: 'py-2 border-b border-slate-100 flex items-start gap-2' },
                e('button', {
                  className: 'px-1.5 py-0.5 rounded-lg text-sm border border-slate-200 hover:bg-indigo-50',
                  onClick: function () { speak(w.word, w.language); },
                  'aria-label': tr('readinglib_speak_word', 'Say this word'), title: tr('readinglib_speak_word', 'Say this word'),
                }, '🔊'),
                e('div', { className: 'flex-1 min-w-0' },
                  e('div', { className: 'font-bold text-slate-800', dir: 'auto' },
                    w.word + (w.language && w.language !== book.language ? ' · ' + w.language : '')),
                  w.text ? e('div', { className: 'text-sm text-slate-600', dir: 'auto' }, w.text) : null,
                  w.bookTitle ? e('div', { className: 'text-[11px] text-slate-400 truncate' }, w.bookTitle) : null),
                e('button', {
                  className: 'px-1.5 py-0.5 rounded-lg text-[12px] text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent',
                  onClick: function () {
                    var next = wordBank.filter(function (x, xi) { return xi !== i; });
                    saveWordBank(next); setWordBank(next);
                  },
                  'aria-label': tr('readinglib_words_remove', 'Remove word'), title: tr('readinglib_words_remove', 'Remove word'),
                }, '✕'));
            })))) : null,
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
          linkOnly ? e('div', { className: 'mb-3 mx-auto max-w-xl text-[12px] text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-center' },
            '↗ ' + tr('readinglib_link_only_notice', 'CK-12 remains link-only under its current terms. This card contains an AlloFlow-authored overview; open the official source to read or assign the curriculum. AI and mirroring are disabled.')) :
          isCardContent(book) ? e('div', { className: 'mb-3 mx-auto max-w-xl text-[12px] text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-center' },
            '🔗 ' + tr('readinglib_card_notice', 'This is a source card — a short overview with a link to the real thing. Use “Open original” above to read the full text at the source.')) :
          isMirroredOpenStax ? e('div', { className: 'mb-3 mx-auto max-w-xl text-[12px] text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-center' },
            '✓ ' + tr('readinglib_openstax_mirror_notice', 'Accessibility-ready OpenStax chapter mirror · CC BY-NC-SA 4.0 · reading and non-AI accessibility stay available · Extract to Source and generative-AI handoffs are blocked unless OpenStax grants permission.')) : null,
          // Same work, other languages (multilingual Bloom records) — one tap
          // switches editions, so a family can read in both languages.
          (props.editions && props.editions.length) ? e('div', { className: 'mb-3 mx-auto max-w-xl flex flex-wrap items-center justify-center gap-1 text-[12px]' },
            e('span', { className: 'text-slate-500 font-semibold' }, '🌐 ' + tr('readinglib_editions', 'Also in:')),
            props.editions.map(function (ed) {
              return e('button', {
                key: ed.slug,
                className: 'px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold hover:bg-indigo-100',
                onClick: function () { if (props.onOpenEdition) props.onOpenEdition(ed); },
                title: tr('readinglib_editions_hint', 'Open this same book in another language'),
              }, ed.language + (ed.hasAudio ? ' 🔊' : ''));
            })) : null,
          // "More by this author" — only on the final page (the natural
          // what-to-read-next moment), so it never competes with the story.
          (props.sameAuthor && props.sameAuthor.length && pageIdx === pages.length - 1) ? e('div', {
            className: 'mb-3 mx-auto max-w-xl flex flex-wrap items-center justify-center gap-1 text-[12px]',
            'data-testid': 'more-by-author',
          },
            e('span', { className: 'text-slate-500 font-semibold' }, '✍️ ' + tr('readinglib_more_by_author', 'More by this author:')),
            props.sameAuthor.map(function (rel) {
              return e('button', {
                key: rel.slug,
                className: 'px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold hover:bg-emerald-100',
                onClick: function () { if (props.onOpenEdition) props.onOpenEdition(rel); },
                title: tr('readinglib_more_by_author_hint', 'Open this book'),
              }, rel.title + (rel.hasAudio ? ' 🔊' : ''));
            })) : null,
          page.img ? e('img', {
            src: page.img,
            // A real caption (Gutenberg figure captions travel with the image
            // as page.imgCaption) beats the generic label for screen readers.
            alt: page.imgCaption || (tr('readinglib_page_illustration', 'Illustration from') + ' "' + book.title + '", ' + tr('readinglib_page', 'page') + ' ' + page.n),
            className: 'block mx-auto w-auto max-w-full max-h-[48vh] rounded-xl',
            loading: 'lazy',
          }) : null,
          page.img && page.imgCaption ? e('div', {
            className: 'mt-1 mx-auto max-w-xl text-center text-[12px] italic text-slate-500',
          }, page.imgCaption) : null,
          translation && translation.status === 'loading' ? e('div', { className: 'mt-6 text-center text-slate-500 italic' },
            '🌐 ' + tr('readinglib_translating_into', 'Translating into') + ' ' + translation.language + '…') : null,
          txReady ? e('div', { className: 'mt-3 mx-auto max-w-xl text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 flex items-center justify-center gap-2 flex-wrap text-center' },
            e('span', null, '🤖 ' + tr('readinglib_translate_caveat', 'AI translation') + ' (' + translation.language + ') — ' +
              tr('readinglib_translate_caveat_body', 'created by AI, not reviewed by the publisher. Word-by-word narration is only available on the original.')),
            // Side-by-side: keep the original visible next to the translation
            // (a dual-language family reads together; an ELL student checks
            // meaning line by line).
            e('button', {
              className: 'px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ' +
                (bilingual ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'),
              onClick: function () { setBilingual(!bilingual); },
              'aria-pressed': bilingual,
              title: tr('readinglib_bilingual_hint', 'Show the original text next to the translation'),
            }, '◫ ' + tr('readinglib_bilingual', 'Side by side'))) : null,
          e('div', { className: (txReady && bilingual) ? 'lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start lg:max-w-4xl lg:mx-auto' : '' },
          // Original text panel (bilingual mode). Plain paragraphs in the
          // book's own direction/language — define/karaoke stay on the
          // translation side, which remains the "displayed" text for every
          // downstream feature (TTS, export, generate).
          (txReady && bilingual) ? e('div', {
            className: 'mt-4 mx-auto lg:mx-0 max-w-xl leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2' + (fontClass ? ' ' + fontClass : ''),
            dir: book.isRtl ? 'rtl' : 'auto',
            lang: book.langCode || undefined,
            'data-testid': 'bilingual-original',
          },
            e('div', { className: 'text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-1' },
              book.language + ' · ' + tr('readinglib_original', 'Original')),
            pageTextForPipeline(page).split(/\n{2,}/).map(function (par, pi) {
              return e('p', { key: pi, className: 'mb-2 whitespace-pre-line' }, par);
            })) : null,
          e('div', {
            className: 'mt-4 mx-auto ' + ((txReady && bilingual) ? 'lg:mx-0 ' : '') + 'max-w-xl leading-relaxed text-slate-800 ' + textLayoutClass(book.level, displayPageText) + (mode !== 'read' ? ' cursor-pointer' : '') + (fontClass ? ' ' + fontClass : ''),
            style: Object.keys(textStyle).length ? textStyle : undefined,
            dir: displayRtl ? 'rtl' : 'auto',
            lang: (txReady ? translation.langCode : book.langCode) || undefined,
          }, lines.map(function (line, li) {
            return e('p', { key: li, className: 'mb-2' }, line.map(function (tok, ti) {
              var hot = tok.cue != null && tok.cue === activeCue;
              var lookupOn = mode !== 'read';
              // In Define/Sounds mode words become focusable buttons so keyboard
              // and screen-reader users can look them up (Enter/Space), not just
              // mouse users. In read mode they're plain, non-focusable spans.
              return e('span', {
                key: ti,
                className: (hot ? 'bg-amber-200 rounded ' : '') + (lookupOn ? 'hover:bg-indigo-100 focus:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded cursor-pointer ' : ''),
                onClick: lookupOn ? function (ev) { onWordClick(tok.w, ev); } : undefined,
                role: lookupOn ? 'button' : undefined,
                tabIndex: lookupOn ? 0 : undefined,
                'aria-label': lookupOn ? (mode === 'define' ? tr('readinglib_define', 'Define') : tr('readinglib_sounds', 'Sounds')) + ': ' + tok.w : undefined,
                onKeyDown: lookupOn ? function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onWordClick(tok.w, ev); } } : undefined,
              }, tok.w + (ti < line.length - 1 ? ' ' : ''));
            }));
          }))
          ) // bilingual wrapper (single-column grid-less div when not bilingual)
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
        // Progress through the book — a thin bar (the page count announces the
        // exact position for screen readers, so the bar is decorative).
        pages.length > 1 ? e('div', {
          className: 'h-1 w-full rounded-full bg-slate-200 mb-2 overflow-hidden', 'aria-hidden': true,
        }, e('div', {
          className: 'h-full bg-indigo-500 rounded-full transition-all',
          style: { width: Math.round(((pageIdx + 1) / pages.length) * 100) + '%' },
        })) : null,
        e('div', { className: 'flex items-center justify-center gap-2 flex-wrap' },
          // Chapter jump for long texts (sections detected from the pages).
          sourceSections.length > 1 ? e('select', {
            className: 'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 max-w-[45vw] sm:max-w-xs',
            value: currentSection ? String(currentSection.start) : '',
            onChange: function (ev) { if (ev.target.value !== '') goTo(Number(ev.target.value)); },
            'aria-label': tr('readinglib_chapter', 'Chapter'),
            title: tr('readinglib_chapter', 'Chapter'),
          }, [currentSection ? null : e('option', { key: '_', value: '' }, tr('readinglib_jump_chapter', 'Jump to chapter…'))].concat(
            sourceSections.map(function (s) {
              return e('option', { key: s.start, value: String(s.start) }, s.title + ' (' + pageRangeLabel(s.start, s.end) + ')');
            })
          )) : null,
          e('button', {
            className: 'px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-40',
            disabled: pageIdx === 0, onClick: function () { go(-1); },
            'aria-label': tr('readinglib_prev_page', 'Previous page'),
          }, '‹'),
          // Editable jump-to-page — clicking hundreds of times to reach a page
          // in a full novel is not navigation. Enter or blur commits.
          e('div', { className: 'flex items-center gap-1 text-sm text-slate-600 tabular-nums' },
            e('input', {
              type: 'number', min: 1, max: pages.length, value: jumpInput,
              className: 'w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-center text-slate-700',
              onChange: function (ev) { setJumpInput(ev.target.value); },
              onKeyDown: function (ev) {
                if (ev.key === 'Enter') { var n = parseInt(jumpInput, 10); if (n >= 1 && n <= pages.length) goTo(n - 1); else setJumpInput(String(pageIdx + 1)); }
              },
              onBlur: function () { var n = parseInt(jumpInput, 10); if (n >= 1 && n <= pages.length) { if (n - 1 !== pageIdx) goTo(n - 1); } else setJumpInput(String(pageIdx + 1)); },
              'aria-label': tr('readinglib_go_to_page', 'Go to page'),
            }),
            e('span', { role: 'status', 'aria-live': 'polite', 'aria-label': tr('readinglib_page', 'page') + ' ' + (pageIdx + 1) + ' ' + tr('readinglib_of', 'of') + ' ' + pages.length }, '/ ' + pages.length)
          ),
          e('button', {
            className: 'px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-40',
            disabled: pageIdx >= pages.length - 1, onClick: function () { go(1); },
            'aria-label': tr('readinglib_next_page', 'Next page'),
          }, '›'),
          // Bookmark the current page.
          e('button', {
            className: 'px-2 py-1.5 rounded-lg text-sm font-semibold border ' +
              (bookmarks.indexOf(pageIdx) !== -1 ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
            onClick: toggleBookmark,
            'aria-pressed': bookmarks.indexOf(pageIdx) !== -1,
            title: tr('readinglib_bookmark_hint', 'Bookmark this page'),
            'aria-label': tr('readinglib_bookmark', 'Bookmark this page'),
          }, bookmarks.indexOf(pageIdx) !== -1 ? '🔖' : '🔖')
        ),
        // Saved bookmarks — jump chips with a remove (✕).
        bookmarks.length ? e('div', { className: 'flex items-center justify-center gap-1 flex-wrap mt-1.5' },
          e('span', { className: 'text-[11px] font-semibold text-slate-400' }, tr('readinglib_bookmarks', 'Bookmarks') + ':'),
          bookmarks.map(function (bmIdx) {
            return e('span', { key: bmIdx, className: 'inline-flex items-center rounded-full border border-amber-200 bg-amber-50 overflow-hidden' },
              e('button', {
                className: 'px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 tabular-nums',
                onClick: function () { goTo(bmIdx); },
                title: tr('readinglib_go_to_page', 'Go to page') + ' ' + (bmIdx + 1),
              }, '🔖 ' + (bmIdx + 1)),
              e('button', {
                className: 'px-1.5 py-0.5 text-[11px] text-amber-500 hover:text-amber-800 hover:bg-amber-100',
                onClick: function () { var next = bookmarks.filter(function (n) { return n !== bmIdx; }); setBookmarks(next); saveBookmarks(book.slug, next); },
                'aria-label': tr('readinglib_remove_bookmark', 'Remove bookmark') + ' ' + (bmIdx + 1),
              }, '✕')
            );
          })
        ) : null,
        e('p', { className: 'text-[11px] text-slate-500 text-center mt-1.5' },
          attributionLine(book) + (txReady ? ' · 🤖 ' + tr('readinglib_attr_ai_translated', 'AI-translated into') + ' ' + translation.language : '') + ' · ',
          e('a', { href: pageSourceUrl, target: '_blank', rel: 'noopener noreferrer', className: 'underline hover:text-indigo-700' },
            bookSourceName),
          ' · ',
          e('a', { href: book.licenseUrl || 'https://creativecommons.org/licenses/by/4.0/', target: '_blank', rel: 'noopener noreferrer', className: 'underline hover:text-indigo-700' },
            book.license || 'CC BY 4.0'),
          isMirroredOpenStax ? e('span', null, ' · Access for free at ',
            e('a', { href: bookAttributionUrl, target: '_blank', rel: 'noopener noreferrer', className: 'underline hover:text-indigo-700' }, bookAttributionUrl)) : null,
          readingTimeLabel(book) ? ' · ⏱ ' + readingTimeLabel(book) + ' ' + tr('readinglib_read_time', 'read') : ''
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
    var busy = !!props.busy;
    var timeLabel = readingTimeLabel(b);
    var resumePage = props.resumePage || 0; // 1-based page to resume at, if any
    // Gutendex cover thumbnails are generated files that can 404; fall back
    // to the placeholder tile instead of a broken-image icon.
    var _cf = useState(false);
    var coverFailed = _cf[0], setCoverFailed = _cf[1];
    // MARC subjects carry " -- " qualifiers ("Epic poetry -- History and
    // criticism"); the head noun is what a browsing teacher needs.
    var subjectChips = (b.subjects || []).map(function (s) { return String(s).split(' -- ')[0].trim().slice(0, 40); })
      .filter(function (s, i, arr) { return s && arr.indexOf(s) === i; })
      .slice(0, 3);
    return e('button', {
      className: 'relative text-left bg-white border border-slate-200 rounded-2xl p-3 hover:border-indigo-300 hover:shadow-md transition-shadow flex flex-col gap-2 ' +
        (busy ? 'opacity-70 pointer-events-none' : ''),
      onClick: function () { props.onOpen(b); },
      disabled: busy,
      'aria-busy': busy,
    },
      (b.cover && !coverFailed) ? e('img', {
        src: b.cover, alt: '', loading: 'lazy',
        onError: function () { setCoverFailed(true); },
        className: 'w-full h-36 object-cover rounded-xl bg-slate-100',
      }) : e('div', { className: 'w-full h-36 rounded-xl bg-indigo-50 flex items-center justify-center text-4xl' }, '📖'),
      busy ? e('div', { className: 'absolute inset-0 rounded-2xl bg-white/60 flex items-center justify-center' },
        e('div', { className: 'px-3 py-1.5 rounded-lg bg-white shadow text-xs font-semibold text-indigo-700' },
          tr('readinglib_opening', 'Opening book…'))) : null,
      e('div', { className: 'font-bold text-slate-800 leading-snug', dir: 'auto' }, b.title),
      e('div', { className: 'flex flex-wrap gap-1' },
        bookSourceId(b) !== 'storyweaver' ? e('span', { className: 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold' },
          sourceLabel(bookSourceId(b))) : null,
        bookSourceId(b) === 'openstax' && !isCardContent(b) ? e('span', { className: 'px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-semibold' },
          '✓ ' + tr('readinglib_mirrored_chapter', 'Mirrored chapter')) : null,
        bookSourceId(b) === 'openstax' ? e('span', { className: 'px-2 py-0.5 rounded-full bg-slate-50 border border-slate-300 text-slate-700 text-[11px] font-semibold' },
          'AI off') : null,
        bookSourceId(b) === 'ck12' ? e('span', { className: 'px-2 py-0.5 rounded-full bg-slate-50 border border-slate-300 text-slate-700 text-[11px] font-semibold' },
          '↗ ' + tr('readinglib_link_only', 'Link only · AI off')) : null,
        // Source cards carry a hardcoded audience level with no text behind
        // it — showing a Level chip there implies a measurement we never
        // made. The 🔗 Source card badge already says what these are.
        !isCardContent(b) ? e('span', { className: 'px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold' },
          tr('readinglib_level', 'Level') + ' ' + b.level) : null,
        e('span', { className: 'px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-semibold' }, b.language),
        b.hasAudio ? e('span', { className: 'px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold' },
          '🔊 ' + tr('readinglib_narrated', 'Narrated')) : null,
        timeLabel ? e('span', { className: 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold' },
          '⏱ ' + timeLabel) : null,
        resumePage ? e('span', { className: 'px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-semibold' },
          '▶ ' + tr('readinglib_resume_page', 'Resume p.') + resumePage) : null,
        isCardContent(b) ? e('span', {
          className: 'px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-semibold',
          title: tr('readinglib_card_badge_hint', 'A short overview that links out to the full text at the source'),
        }, '🔗 ' + tr('readinglib_card_badge', 'Source card')) : null
      ),
      subjectChips.length ? e('div', { className: 'flex flex-wrap gap-1' },
        subjectChips.map(function (s, i) {
          return e('span', { key: 'subj-' + i, className: 'px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px]' }, s);
        })) : null,
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

  // --------------------------------------------- find more books (Gutendex)
  // Self-serve search over Project Gutenberg's ~75k public-domain books via the
  // keyless, CORS-enabled Gutendex API. A browser can search and link out, but
  // gutenberg.org's text files have no CORS header, so it cannot fetch the full
  // text to import it into the static catalog directly — picks are collected as
  // a maintainer request instead (same shape the importer already consumes).
  function GutenbergSearchModal(props) {
    var _q = useState(''); var query = _q[0]; var setQuery = _q[1];
    var _st = useState('idle'); var status = _st[0]; var setStatus = _st[1];
    var _res = useState([]); var results = _res[0]; var setResults = _res[1];
    var _err = useState(''); var error = _err[0]; var setError = _err[1];
    var _next = useState(null); var nextUrl = _next[0]; var setNextUrl = _next[1];
    var _topic = useState(''); var topic = _topic[0]; var setTopic = _topic[1];
    var _sort = useState('relevance'); var sortMode = _sort[0]; var setSortMode = _sort[1];
    var _lang = useState('en'); var lang = _lang[0]; var setLang = _lang[1];
    var _req = useState(function () { return loadImportRequests(); }); var requests = _req[0]; var setRequests = _req[1];
    var reqSeq = useRef(0);

    // Project Gutenberg has public-domain books in many languages; let teachers
    // search them (import derives the book's language from the record).
    var SEARCH_LANGS = [
      { code: 'en', label: tr('lang_english', 'English') },
      { code: 'es', label: tr('lang_spanish', 'Spanish') },
      { code: 'fr', label: tr('lang_french', 'French') },
      { code: 'de', label: tr('lang_german', 'German') },
      { code: 'it', label: tr('lang_italian', 'Italian') },
      { code: 'pt', label: tr('lang_portuguese', 'Portuguese') },
      { code: 'nl', label: tr('lang_dutch', 'Dutch') },
      { code: 'ru', label: tr('lang_russian', 'Russian') },
      { code: 'la', label: tr('lang_latin', 'Latin') },
      { code: 'zh', label: tr('lang_chinese', 'Chinese') },
      { code: '', label: tr('readinglib_all_languages', 'All languages') },
    ];

    var haveIds = useMemo(function () {
      var s = {};
      (props.libraryBooks || []).forEach(function (b) { var id = gutenbergIdOf(b); if (id) s[id] = true; });
      return s;
    }, [props.libraryBooks]);
    var _local = useState(function () {
      var s = {}; loadLocalIndex().forEach(function (c) { var id = gutenbergIdOf(c); if (id) s[id] = true; }); return s;
    }); var localIds = _local[0]; var setLocalIds = _local[1];
    var _adding = useState(0); var adding = _adding[0]; var setAdding = _adding[1];
    var endpoint = importEndpoint();

    // Import one book via the Worker: fetch cleaned JSON, store the body in
    // IndexedDB + a card in the local index. Returns the stored book (or throws).
    var importOne = function (r) {
      var ep = importEndpoint();
      return fetch(ep + (ep.indexOf('?') === -1 ? '?' : '&') + 'id=' + r.id)
        .then(function (res) { return res.json().then(function (d) { if (!res.ok) throw new Error((d && d.error) || ('HTTP ' + res.status)); return d; }); })
        .then(function (data) {
          var book = data && data.book;
          if (!book || !book.slug || !Array.isArray(book.pages) || !book.pages.length) throw new Error((data && data.error) || 'empty book');
          return idbPut(book.slug, book).then(function () {
            var idx = loadLocalIndex();
            if (!idx.some(function (c) { return c.slug === book.slug; })) { idx.push(localCardFromBook(book)); saveLocalIndex(idx); }
            setLocalIds(function (prev) { var n = Object.assign({}, prev); n[r.id] = true; return n; });
            return book;
          });
        });
    };

    // One-click import (single result) — opens the book immediately. No
    // endpoint → fall back to the maintainer request list.
    var addNow = function (r) {
      if (!importEndpoint()) { addRequest(r); return; }
      setAdding(r.id);
      importOne(r).then(function (book) {
        setAdding(0);
        props.addToast && props.addToast('"' + book.title + '" ' + tr('readinglib_added_now', 'added to your library.'), 'success');
        props.onImported && props.onImported(book);
      }).catch(function (err) {
        setAdding(0);
        props.addToast && props.addToast(tr('readinglib_add_now_failed', 'Could not import that book right now.') + (err && err.message ? ' (' + err.message + ')' : ''), 'error');
      });
    };

    // Bulk import every importable result on the current view, one at a time so
    // the Worker isn't hammered. Skips books already in the library.
    var addAll = function () {
      if (!importEndpoint()) return;
      var todo = results.filter(function (r) { return r.hasText && !haveIds[r.id] && !localIds[r.id]; });
      if (!todo.length) return;
      setAdding(-1); // -1 = bulk in progress
      var ok = 0; var fail = 0; var i = 0;
      var step = function () {
        if (i >= todo.length) {
          setAdding(0);
          props.addToast && props.addToast(ok + ' ' + tr('readinglib_added_count', 'books added to your library.') + (fail ? ' (' + fail + ' ' + tr('readinglib_failed_count', 'failed') + ')' : ''), fail && !ok ? 'error' : 'success');
          if (ok) { props.onImportedBulk && props.onImportedBulk(); }
          return;
        }
        importOne(todo[i++]).then(function () { ok++; step(); }, function () { fail++; step(); });
      };
      step();
    };

    var TOPICS = [
      { label: tr('readinglib_topic_adventure', 'Adventure'), topic: 'adventure' },
      { label: tr('readinglib_topic_children', "Children's"), topic: 'children' },
      { label: tr('readinglib_topic_fairy', 'Fairy tales'), topic: 'fairy tales' },
      { label: tr('readinglib_topic_science', 'Science'), topic: 'science' },
      { label: tr('readinglib_topic_history', 'History'), topic: 'history' },
      { label: tr('readinglib_topic_poetry', 'Poetry'), topic: 'poetry' },
      { label: tr('readinglib_topic_myth', 'Mythology'), topic: 'mythology' },
      { label: tr('readinglib_topic_drama', 'Drama'), topic: 'drama' },
    ];

    var buildUrl = function (q, topicVal, sortVal, langVal) {
      var p = [];
      if (langVal) p.push('languages=' + encodeURIComponent(langVal));
      if (q) p.push('search=' + encodeURIComponent(q));
      if (topicVal) p.push('topic=' + encodeURIComponent(topicVal));
      if (sortVal === 'popular') p.push('sort=popular');
      return 'https://gutendex.com/books/?' + p.join('&');
    };
    var mapResult = function (b) {
      return {
        id: b.id,
        title: String(b.title || '').replace(/\s*:\s*\$[a-z]\s*/gi, ': ').trim(),
        authors: (b.authors || []).map(function (a) { return a.name; }),
        subjects: (b.subjects || []).slice(0, 3),
        downloads: b.download_count || 0,
        hasText: gutendexHasText(b.formats),
        cover: (b.formats && (b.formats['image/jpeg'] || b.formats['image/png'])) || null,
      };
    };
    var doFetch = function (url, append) {
      var seq = ++reqSeq.current;
      setStatus(append ? 'loadingMore' : 'loading'); setError('');
      fetch(url)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) {
          if (seq !== reqSeq.current) return;
          var list = (data.results || []).filter(function (b) { return b.copyright === false; }).map(mapResult);
          setResults(function (prev) { return append ? prev.concat(list) : list; });
          setNextUrl(data.next || null);
          setStatus('ok');
        })
        .catch(function (err) {
          if (seq !== reqSeq.current) return;
          setStatus('error'); setError(String((err && err.message) || err));
        });
    };
    var runSearch = function (q, topicVal, sortVal, langVal) {
      var qq = String((q == null ? query : q) || '').trim();
      var tt = topicVal == null ? topic : topicVal;
      var ss = sortVal == null ? sortMode : sortVal;
      var ll = langVal == null ? lang : langVal;
      if (!qq && !tt) return;
      doFetch(buildUrl(qq, tt, ss, ll), false);
    };
    var loadMore = function () { if (nextUrl) doFetch(nextUrl, true); };
    var pickTopic = function (t) {
      var next = (topic === t) ? '' : t;
      setTopic(next);
      if (next || query.trim()) runSearch(query, next, sortMode, lang);
    };
    var toggleSort = function () {
      var next = sortMode === 'popular' ? 'relevance' : 'popular';
      setSortMode(next);
      if (query.trim() || topic) runSearch(query, topic, next, lang);
    };
    var pickLang = function (code) {
      setLang(code);
      if (query.trim() || topic) runSearch(query, topic, sortMode, code);
    };

    var addRequest = function (r) {
      if (requests.some(function (x) { return x.id === r.id; })) return;
      var next = requests.concat([{ id: r.id, title: r.title }]);
      setRequests(next); saveImportRequests(next);
      props.addToast && props.addToast('"' + r.title + '" ' + tr('readinglib_req_added', 'added to your import request list.'), 'success');
    };
    var removeRequest = function (id) {
      var next = requests.filter(function (x) { return x.id !== id; });
      setRequests(next); saveImportRequests(next);
    };
    var buildRequestText = function () {
      var ids = requests.map(function (r) { return r.id; }).join(',');
      var lines = requests.map(function (r) { return '- ' + r.title + ' (Project Gutenberg #' + r.id + ') https://www.gutenberg.org/ebooks/' + r.id; });
      return tr('readinglib_req_intro', 'Please add these public-domain books to the AlloFlow reading library:') + '\n' +
        lines.join('\n') + '\n\n' + tr('readinglib_req_cmd', 'Maintainer command:') + '\n' +
        'node reading_library/import_gutenberg_full_texts.js --ids ' + ids + '\n' +
        'node reading_library/assign_levels.js && node reading_library/mirror_books.js --fetch';
    };
    var copyRequests = function () {
      if (!requests.length) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(buildRequestText());
          props.addToast && props.addToast(tr('readinglib_req_copied', 'Copied the request list — send it to your AlloFlow maintainer.'), 'success');
          return;
        }
      } catch (_) {}
      props.addToast && props.addToast(tr('readinglib_req_saved', 'Your request list is saved in this browser.'), 'info');
    };
    var downloadRequests = function () {
      if (!requests.length) return;
      try {
        var blob = new Blob([buildRequestText()], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'alloflow-book-requests.txt';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
      } catch (_) {
        props.addToast && props.addToast(tr('readinglib_download_failed', 'Could not download the text.'), 'error');
      }
    };
    var emailRequests = function () {
      if (!requests.length) return;
      try {
        window.open('mailto:?subject=' + encodeURIComponent(tr('readinglib_req_subject', 'AlloFlow reading library — book import requests')) +
          '&body=' + encodeURIComponent(buildRequestText()), '_blank');
      } catch (_) {}
    };

    return e('div', {
      className: 'absolute inset-0 z-30 bg-black/30 flex items-center justify-center p-4 rounded-2xl',
      onMouseDown: function (ev) { if (ev.target === ev.currentTarget) props.onClose(); },
    },
      e('div', { className: 'bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-4 max-h-full overflow-y-auto flex flex-col', role: 'dialog', 'aria-modal': 'true', 'aria-label': tr('readinglib_find_more', 'Find more books') },
        e('div', { className: 'flex items-center justify-between gap-2 mb-1' },
          e('h3', { className: 'font-extrabold text-slate-800' }, '🔎 ' + tr('readinglib_find_more_title', 'Find more public-domain books')),
          e('button', { className: 'text-slate-400 hover:text-slate-600 px-1', onClick: props.onClose, 'aria-label': tr('readinglib_close', 'Close') }, '✕')
        ),
        e('p', { className: 'text-xs text-slate-500 mb-2' },
          tr('readinglib_find_more_note', 'Search Project Gutenberg (75,000+ public-domain books). Open any at the source now; request the ones you want added to this library and share the list with your AlloFlow maintainer.')),
        e('div', { className: 'flex gap-2' },
          e('input', {
            className: 'flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700',
            placeholder: tr('readinglib_find_more_ph', 'Title, author, or subject…'),
            value: query,
            onChange: function (ev) { setQuery(ev.target.value); },
            onKeyDown: function (ev) { if (ev.key === 'Enter') runSearch(); },
            'aria-label': tr('readinglib_find_more', 'Find more books'),
          }),
          e('select', {
            className: 'rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700',
            value: lang,
            onChange: function (ev) { pickLang(ev.target.value); },
            'aria-label': tr('readinglib_find_more_lang', 'Search language'),
          }, SEARCH_LANGS.map(function (l) { return e('option', { key: l.code || 'all', value: l.code }, l.label); })),
          e('button', {
            className: 'px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700',
            onClick: function () { runSearch(); },
          }, tr('readinglib_search', 'Search'))
        ),
        // Topic chips (browse by subject) + popularity sort.
        e('div', { className: 'flex flex-wrap items-center gap-1 mt-2' },
          TOPICS.map(function (t) {
            return e('button', {
              key: t.topic,
              className: 'px-2.5 py-1 rounded-full text-xs font-semibold border ' +
                (topic === t.topic ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'),
              onClick: function () { pickTopic(t.topic); },
              'aria-pressed': topic === t.topic,
            }, t.label);
          }),
          e('span', { className: 'flex-1' }),
          e('button', {
            className: 'px-2.5 py-1 rounded-full text-xs font-semibold border ' +
              (sortMode === 'popular' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'),
            onClick: toggleSort,
            'aria-pressed': sortMode === 'popular',
            title: tr('readinglib_sort_popular_hint', 'Show the most-downloaded books first'),
          }, '⬇ ' + tr('readinglib_sort_popular', 'Most popular'))
        ),
        status === 'loading' ? e('div', { className: 'text-sm text-slate-500 italic py-3' }, tr('readinglib_searching', 'Searching Project Gutenberg…')) : null,
        status === 'error' ? e('div', { className: 'text-sm text-red-600 py-3' },
          tr('readinglib_find_more_err', 'Could not reach Project Gutenberg search right now.') + (error ? ' (' + error + ')' : '')) : null,
        status === 'ok' && !results.length ? e('div', { className: 'text-sm text-slate-500 py-3' }, tr('readinglib_find_more_empty', 'No public-domain matches. Try a different title or author.')) : null,
        // Bulk import bar (only when a Worker endpoint is configured).
        (endpoint && (status === 'ok' || status === 'loadingMore') && results.length) ? (function () {
          var importable = results.filter(function (r) { return r.hasText && !haveIds[r.id] && !localIds[r.id]; }).length;
          return e('div', { className: 'flex items-center justify-between gap-2 mt-2' },
            e('div', { className: 'text-[11px] text-slate-500' }, results.length + ' ' + tr('readinglib_results', 'results')),
            importable ? e('button', {
              className: 'px-3 py-1 rounded-lg text-xs font-semibold ' + (adding === -1 ? 'bg-emerald-300 text-white cursor-wait' : 'bg-emerald-600 text-white hover:bg-emerald-700'),
              onClick: adding === -1 ? undefined : addAll,
              disabled: adding === -1,
            }, adding === -1 ? tr('readinglib_adding', 'Adding…') : '＋ ' + tr('readinglib_add_all', 'Add all') + ' (' + importable + ')') : null
          );
        })() : null,
        (status === 'ok' || status === 'loadingMore') && results.length ? e('div', { className: 'mt-2 space-y-2' }, results.map(function (r) {
          var inLibrary = !!haveIds[r.id] || !!localIds[r.id];
          var requested = requests.some(function (x) { return x.id === r.id; });
          var isAdding = adding === r.id;
          return e('div', { key: r.id, className: 'border border-slate-200 rounded-xl p-2.5 flex gap-2.5' },
            r.cover ? e('img', { src: r.cover, alt: '', loading: 'lazy', className: 'w-12 h-16 object-cover rounded bg-slate-100 flex-shrink-0' })
              : e('div', { className: 'w-12 h-16 rounded bg-indigo-50 flex items-center justify-center text-xl flex-shrink-0' }, '📖'),
            e('div', { className: 'min-w-0 flex-1' },
              e('div', { className: 'font-bold text-slate-800 text-sm leading-snug' }, r.title),
              r.authors.length ? e('div', { className: 'text-[11px] text-slate-500' }, r.authors.join(', ')) : null,
              e('div', { className: 'flex flex-wrap gap-1 mt-1' },
                r.subjects.map(function (s, i) { return e('span', { key: i, className: 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]' }, String(s).slice(0, 40)); }),
                e('span', { className: 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]' }, '⬇ ' + r.downloads.toLocaleString())
              ),
              e('div', { className: 'flex flex-wrap items-center gap-2 mt-2' },
                e('a', {
                  className: 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100',
                  href: 'https://www.gutenberg.org/ebooks/' + r.id, target: '_blank', rel: 'noopener noreferrer',
                }, tr('readinglib_open_at_gutenberg', 'Open at Gutenberg')),
                inLibrary ? e('span', { className: 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200' },
                  '✓ ' + tr('readinglib_in_library', 'In your library')) :
                !r.hasText ? e('span', { className: 'text-[11px] text-slate-400 italic' }, tr('readinglib_no_inapp_text', 'No in-app text (audio/scan only)')) :
                isAdding ? e('span', { className: 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200' },
                  tr('readinglib_adding', 'Adding…')) :
                endpoint ? e('button', {
                  className: 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700',
                  onClick: function () { addNow(r); },
                  title: tr('readinglib_add_now_hint', 'Import this book into your library now'),
                }, '＋ ' + tr('readinglib_add_now', 'Add now')) :
                requested ? e('span', { className: 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200' },
                  '✓ ' + tr('readinglib_requested', 'Requested')) :
                e('button', {
                  className: 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700',
                  onClick: function () { addRequest(r); },
                }, '＋ ' + tr('readinglib_request_import', 'Request import'))
              )
            )
          );
        })) : null,
        status === 'ok' && nextUrl ? e('div', { className: 'flex justify-center py-2' },
          e('button', {
            className: 'px-4 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-sm font-bold text-indigo-800 hover:bg-indigo-100',
            onClick: loadMore,
          }, tr('readinglib_load_more', 'Load more results'))) : null,
        status === 'loadingMore' ? e('div', { className: 'text-sm text-slate-500 italic py-2 text-center' }, tr('readinglib_loading_more', 'Loading more…')) : null,
        requests.length ? e('div', { className: 'mt-3 pt-2 border-t border-slate-200' },
          e('div', { className: 'flex items-center justify-between gap-2 mb-1' },
            e('div', { className: 'text-sm font-bold text-slate-700' }, '📋 ' + requests.length + ' ' + tr('readinglib_req_count', 'books requested')),
            e('div', { className: 'flex flex-wrap gap-1.5' },
              e('button', { className: 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700', onClick: copyRequests },
                '📋 ' + tr('readinglib_req_copy', 'Copy for maintainer')),
              e('button', { className: 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-indigo-800 border border-indigo-200 hover:bg-indigo-50', onClick: emailRequests },
                '✉ ' + tr('readinglib_req_email', 'Email')),
              e('button', { className: 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-indigo-800 border border-indigo-200 hover:bg-indigo-50', onClick: downloadRequests },
                '⤓ ' + tr('readinglib_req_download', 'Download')),
              e('button', { className: 'px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100', onClick: function () { setRequests([]); saveImportRequests([]); } },
                tr('readinglib_req_clear', 'Clear'))
            )
          ),
          e('div', { className: 'flex flex-wrap gap-1' }, requests.map(function (r) {
            return e('span', { key: r.id, className: 'inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 overflow-hidden' },
              e('span', { className: 'px-2 py-0.5 text-[11px] text-indigo-800' }, r.title.slice(0, 32)),
              e('button', { className: 'px-1.5 py-0.5 text-[11px] text-indigo-500 hover:text-indigo-800 hover:bg-indigo-100', onClick: function () { removeRequest(r.id); }, 'aria-label': tr('readinglib_req_remove', 'Remove request') }, '✕')
            );
          }))
        ) : null
      )
    );
  }

  function ReadingLibrary(props) {
    if (!props.isOpen) return null;

    var _idx = useState({ status: 'loading', data: null, base: null, error: null });
    var index = _idx[0]; var setIndex = _idx[1];
    var _f = useState({ language: 'English', level: '', search: '', audio: false, fullOnly: false, sort: 'level', source: '', searchAll: false });
    var filters = _f[0]; var setFilters = _f[1];
    var _open = useState(null); var openBook = _open[0]; var setOpenBook = _open[1];
    var _loadingBook = useState(null); var loadingBook = _loadingBook[0]; var setLoadingBook = _loadingBook[1];
    var _opt = useState(false); var optionsOpen = _opt[0]; var setOptionsOpen = _opt[1];
    var _fm = useState(false); var findMoreOpen = _fm[0]; var setFindMoreOpen = _fm[1];
    var _collection = useState(null); var selectedCollectionId = _collection[0]; var setSelectedCollectionId = _collection[1];
    var _visible = useState(VISIBLE_BOOK_BATCH); var visibleLimit = _visible[0]; var setVisibleLimit = _visible[1];
    // Lazy catalog cards: the core index omits the ~895 Gutenberg link-out
    // stubs; they are fetched from index.cardsFile only when a card-bearing
    // view needs them (History / All shelves, or any search). extraCards holds
    // them once loaded; cardsStatus gates the one-shot fetch.
    var _cards = useState(null); var extraCards = _cards[0]; var setExtraCards = _cards[1];
    var _cardsStatus = useState('unloaded'); var cardsStatus = _cardsStatus[0]; var setCardsStatus = _cardsStatus[1];
    // Reader page-color theme, lifted here so the whole modal (not just the
    // reading surface) can wear it. Seeded from the persisted pref; the reader's
    // Aa panel keeps it in sync via onThemeChange.
    var _th = useState(function () { return loadReaderPrefs().theme; }); var readerThemeId = _th[0]; var setReaderThemeId = _th[1];
    var containerRef = useRef(null);

    useEffect(function () {
      ensureReaderFonts();
      ensureReaderThemes();
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

    var books = useMemo(function () {
      var core = (index.data && index.data.books) || [];
      return extraCards && extraCards.length ? core.concat(extraCards) : core;
    }, [index.data, extraCards]);

    // Fetch the lazy card index once, merging its books into the browse list.
    var loadCards = useCallback(function () {
      if (cardsStatus !== 'unloaded' || !index.data || index.status !== 'ok') return;
      var file = index.data.cardsFile;
      if (!file) { setCardsStatus('loaded'); return; } // old single-file index
      setCardsStatus('loading');
      var base = index.base || DATA_BASES[0];
      var bust = base.indexOf('http') === 0 ? '?t=' + Date.now() : '';
      fetch(base + file + bust)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) {
          setExtraCards((data && Array.isArray(data.books)) ? data.books : []);
          setCardsStatus('loaded');
        })
        .catch(function () { setCardsStatus('unloaded'); }); // stay retryable
    }, [cardsStatus, index.data, index.status, index.base]);

    // The catalog cards only appear on the History and All shelves, and in any
    // search (searches always span the whole library so a stub is findable by
    // subject). Pull them in the moment the reader enters such a view.
    var viewNeedsCards = selectedCollectionId === 'history' || selectedCollectionId === 'all' ||
      filters.searchAll || filters.search.trim() !== '';
    useEffect(function () {
      if (viewNeedsCards && cardsStatus === 'unloaded' && index.status === 'ok') loadCards();
    }, [viewNeedsCards, cardsStatus, index.status, loadCards]);

    var selectedCollection = collectionById(selectedCollectionId);
    var collectionBooks = useMemo(function () {
      if (!selectedCollection) return books;
      return books.filter(function (b) { return bookMatchesCollection(b, selectedCollection); });
    }, [books, selectedCollectionId]);

    var filtered = useMemo(function () {
      var q = filters.search.trim().toLowerCase();
      // "All collections" search widens the base to the whole library while a
      // query is active, so a title that lives on another shelf (e.g. a
      // Shakespeare play from History searched while on the Stories shelf) is
      // still findable. Without a query it stays scoped to the collection.
      var base = (filters.searchAll && q) ? books : collectionBooks;
      var list = base.filter(function (b) {
        if (filters.source && bookSourceId(b) !== filters.source) return false;
        if (filters.language && b.language !== filters.language) return false;
        if (filters.level && String(b.level) !== filters.level) return false;
        if (filters.audio && !b.hasAudio) return false;
        if (filters.fullOnly && isCardContent(b)) return false;
        if (q) {
          // Subjects matter most for Gutenberg catalog cards: their
          // descriptions are one generic boilerplate line, so topic searches
          // ("astronomy", "naval history") only work via the MARC subjects.
          var hay = (b.title + ' ' + (b.authors || []).join(' ') + ' ' + (b.description || '') + ' ' + (b.subjects || []).join(' ')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
      // Default order (raw index) groups by language then interleaves the
      // narration top-up, which reads as jumbled. Sort for a predictable
      // browse: by level (easiest→hardest) unless the teacher picks otherwise.
      var byTitle = function (a, b) { return String(a.title).localeCompare(String(b.title)); };
      // Within a level, readable-in-app texts come before link-out source
      // cards — on the History shelf cards outnumber full texts ~5:1, and a
      // wall of stubs buried the readable books.
      var byCard = function (a, b) { return (isCardContent(a) ? 1 : 0) - (isCardContent(b) ? 1 : 0); };
      var byLevel = function (a, b) { return (Number(a.level) - Number(b.level)) || byCard(a, b) || byTitle(a, b); };
      var sorters = {
        level: byLevel,
        title: byTitle,
        audio: function (a, b) { return (b.hasAudio ? 1 : 0) - (a.hasAudio ? 1 : 0) || byLevel(a, b); },
        language: function (a, b) { return String(a.language).localeCompare(String(b.language)) || byLevel(a, b); },
      };
      return list.sort(sorters[filters.sort] || byLevel);
    }, [collectionBooks, books, filters]);
    useEffect(function () { setVisibleLimit(VISIBLE_BOOK_BATCH); }, [selectedCollectionId, filters]);
    var visibleBooks = filtered.length > visibleLimit ? filtered.slice(0, visibleLimit) : filtered;

    var languages = useMemo(function () {
      var source = selectedCollection ? collectionBooks : books;
      var counts = {};
      source.forEach(function (b) { counts[b.language] = (counts[b.language] || 0) + 1; });
      return Object.keys(counts).sort(function (a, b) { return a.localeCompare(b); }).map(function (name) {
        return { name: name, count: counts[name] };
      });
    }, [index.data, selectedCollectionId, collectionBooks]);

    // One-tap chips for the best-stocked home languages on this shelf, so a
    // family finds books in their language without hunting the 59-entry
    // dropdown. Data-driven (top non-English by count), so it self-maintains
    // as the catalog grows and only appears where the shelf is multilingual.
    var homeLanguages = useMemo(function () {
      return languages
        .filter(function (l) { return l.name !== 'English'; })
        .sort(function (a, b) { return b.count - a.count; })
        .slice(0, 10);
    }, [languages]);

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

    // Only offer reading levels that actually exist in this collection (the
    // History shelf has no Level 1, etc.) — an empty level filter is a dead end.
    var availableLevels = useMemo(function () {
      var present = {};
      collectionBooks.forEach(function (b) { present[String(b.level)] = true; });
      return ['1', '2', '3', '4', '5', '6'].filter(function (lv) { return present[lv]; });
    }, [collectionBooks]);

    // Only shelves that mix link-out source cards with readable texts need
    // the "Readable in app" toggle (Stories is all readable; on History the
    // cards outnumber full texts ~5:1).
    var hasCards = useMemo(function () {
      return collectionBooks.some(isCardContent);
    }, [collectionBooks]);

    // "Continue reading" — books with a saved position. Re-read localStorage
    // whenever we're back on the browse (openBook toggles), so a book just
    // closed shows up immediately. Only long-form texts persist a position.
    var resumeList = useMemo(function () {
      if (openBook) return [];
      var posMap = loadAllReadingPos();
      var slugs = Object.keys(posMap);
      if (!slugs.length) return [];
      var wanted = collectionBooks.filter(function (b) { return posMap[b.slug] > 0; });
      return wanted.map(function (b) { return { book: b, page: Math.floor(posMap[b.slug]) + 1 }; }).slice(0, 12);
    }, [collectionBooks, openBook]);

    var chooseCollection = function (collection) {
      setSelectedCollectionId(collection.id);
      setFilters({
        language: collection.defaultLanguage || '',
        level: '',
        search: '',
        audio: false,
        fullOnly: false,
        sort: 'level',
        source: '',
        searchAll: false,
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

    // Per-device imported books ("Add now"). The card index is synchronous;
    // book bodies come from IndexedDB on open. localVer bumps to refresh after
    // an import or a removal.
    var _lv = useState(0); var localVer = _lv[0]; var setLocalVer = _lv[1];
    var localImports = useMemo(function () { return openBook ? [] : loadLocalIndex(); }, [openBook, localVer]);
    var openLocalBook = function (card) {
      setLoadingBook(card.slug);
      idbGet(card.slug).then(function (book) {
        setLoadingBook(null);
        if (book) { stopSpeech(); setOpenBook(book); }
        else props.addToast && props.addToast(tr('readinglib_local_missing', 'That imported book is no longer stored on this device.'), 'info');
      }).catch(function () {
        setLoadingBook(null);
        props.addToast && props.addToast(tr('readinglib_book_failed', 'Could not open that book right now.'), 'error');
      });
    };
    var removeLocalBook = function (slug) {
      idbDel(slug);
      saveLocalIndex(loadLocalIndex().filter(function (c) { return c.slug !== slug; }));
      setLocalVer(function (n) { return n + 1; });
    };

    // "My imports" live only on this device; export/restore lets a teacher move
    // their imported library to another device or share it with a colleague.
    var restoreInputRef = useRef(null);
    var exportImports = function () {
      var cards = loadLocalIndex();
      if (!cards.length) return;
      Promise.all(cards.map(function (c) { return idbGet(c.slug).catch(function () { return null; }); }))
        .then(function (books) {
          var payload = { schema: 'allo-reading-imports@1', exportedFrom: 'AlloFlow Reading Library', books: books.filter(Boolean) };
          try {
            var blob = new Blob([JSON.stringify(payload)], { type: 'application/json;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = 'alloflow-my-imports.json';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
          } catch (_) {
            props.addToast && props.addToast(tr('readinglib_export_failed', 'Could not export your imports.'), 'error');
          }
        });
    };
    var restoreImports = function (file) {
      if (!file) return;
      var read = file.text ? file.text() : new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result || '')); }; fr.onerror = rej; fr.readAsText(file); });
      read.then(function (txt) {
        var data = JSON.parse(txt);
        var books = (data && Array.isArray(data.books)) ? data.books : [];
        var valid = books.filter(function (b) { return b && b.slug && Array.isArray(b.pages) && b.pages.length; });
        if (!valid.length) { props.addToast && props.addToast(tr('readinglib_restore_empty', 'No imported books found in that file.'), 'info'); return; }
        return Promise.all(valid.map(function (b) { return idbPut(b.slug, b).catch(function () { return null; }); })).then(function () {
          var idx = loadLocalIndex();
          valid.forEach(function (b) { if (!idx.some(function (c) { return c.slug === b.slug; })) idx.push(localCardFromBook(b)); });
          saveLocalIndex(idx);
          setLocalVer(function (n) { return n + 1; });
          props.addToast && props.addToast(valid.length + ' ' + tr('readinglib_restored_count', 'imported books restored to this device.'), 'success');
        });
      }).catch(function () {
        props.addToast && props.addToast(tr('readinglib_restore_failed', 'That file is not a valid AlloFlow imports export.'), 'error');
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
        editions: bloomEditionsFor(openBook.slug, books),
        sameAuthor: (function () {
          var eds = bloomEditionsFor(openBook.slug, books);
          var skip = {}; eds.forEach(function (ed) { skip[ed.slug] = true; });
          return moreByAuthor(openBook, books, skip);
        })(),
        onOpenEdition: openBookBySlug,
        onExit: onExitReader,
        addToast: props.addToast,
        callGemini: props.callGemini,
        handleGenerate: props.handleGenerate,
        setInputText: props.setInputText,
        isTeacherMode: props.isTeacherMode,
        onSaveToLesson: props.onSaveToLesson,
        onPracticeLanguage: props.onPracticeLanguage,
        onThemeChange: setReaderThemeId,
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
        e('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2 pb-3' },
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
            availableLevels.map(function (lv) { return e('option', { key: lv, value: lv }, LEVEL_LABELS[lv] || ('Level ' + lv)); })
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
            placeholder: tr('readinglib_search_ph', 'Search titles, authors, topics…'),
            value: filters.search,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { search: ev.target.value })); },
            'aria-label': tr('readinglib_search', 'Search'),
          }),
          e('button', {
            className: 'rounded-lg border px-3 py-2 text-sm font-semibold text-left ' +
              (filters.audio ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
            onClick: function () { setFilters(Object.assign({}, filters, { audio: !filters.audio })); },
            'aria-pressed': filters.audio,
          }, '🔊 ' + tr('readinglib_narrated_only', 'Narrated only')),
          // Hide link-out source cards so only in-app readable texts remain.
          hasCards ? e('button', {
            className: 'rounded-lg border px-3 py-2 text-sm font-semibold text-left ' +
              (filters.fullOnly ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
            onClick: function () { setFilters(Object.assign({}, filters, { fullOnly: !filters.fullOnly })); },
            'aria-pressed': filters.fullOnly,
            title: tr('readinglib_full_only_hint', 'Hide source cards that link out to other sites; show only texts you can read inside AlloFlow'),
          }, '📖 ' + tr('readinglib_full_only', 'Readable in app')) : null,
          // Widen a search to the whole library (books on other shelves are
          // otherwise invisible from inside one collection).
          e('button', {
            className: 'rounded-lg border px-3 py-2 text-sm font-semibold text-left ' +
              (filters.searchAll ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'),
            onClick: function () { setFilters(Object.assign({}, filters, { searchAll: !filters.searchAll })); },
            'aria-pressed': filters.searchAll,
            title: tr('readinglib_search_all_hint', 'Include books from every collection in search results'),
          }, '🔎 ' + tr('readinglib_search_all', 'All collections'))
        ),
        // Home-language quick picks — only on multilingual shelves (2+ non-
        // English languages), so English-only shelves (History/Study) stay clean.
        homeLanguages.length >= 2 ? e('div', {
          className: 'flex flex-wrap items-center gap-1.5 pb-3',
          'data-testid': 'home-languages',
        },
          e('span', { className: 'text-[12px] font-semibold text-slate-500 mr-0.5' }, '🌍 ' + tr('readinglib_home_languages', 'Home languages:')),
          e('button', {
            className: 'px-2.5 py-1 rounded-full text-[12px] font-semibold border ' +
              (!filters.language ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'),
            onClick: function () { setFilters(Object.assign({}, filters, { language: '' })); },
            'aria-pressed': !filters.language,
          }, tr('readinglib_all_languages', 'All languages')),
          homeLanguages.map(function (l) {
            var active = filters.language === l.name;
            return e('button', {
              key: l.name,
              className: 'px-2.5 py-1 rounded-full text-[12px] font-semibold border ' +
                (active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'),
              onClick: function () { setFilters(Object.assign({}, filters, { language: active ? '' : l.name })); },
              'aria-pressed': active,
            }, l.name + ' · ' + l.count);
          })) : null,
        // status
        e('div', { className: 'text-sm text-slate-500 pb-2' },
          index.status === 'loading' ? tr('readinglib_loading', 'Loading the library…') :
          index.status === 'error' ? e('span', { className: 'text-red-600' },
            tr('readinglib_load_error', 'Could not load the library:') + ' ' + index.error) :
          // Empty view while the lazy catalog cards are still in flight — say
          // "loading" rather than a false "no matches" (a subject search may
          // only hit stubs). A non-empty view keeps its normal count; the
          // cards merge in silently when they arrive.
          (filtered.length === 0 && viewNeedsCards && cardsStatus === 'loading') ? ('⏳ ' + tr('readinglib_loading_more', 'Loading more…')) :
          filtered.length === 0 ? tr('readinglib_empty', 'No books match those filters yet.') :
          (function () {
            var searchingAll = filters.searchAll && filters.search.trim();
            var denom = searchingAll ? books.length : collectionBooks.length;
            var scope = searchingAll ? ' ' + tr('readinglib_across_all', '(all collections)') : '';
            return visibleBooks.length < filtered.length
              ? visibleBooks.length + ' ' + tr('readinglib_shown_of', 'shown of') + ' ' + filtered.length + ' ' + tr('readinglib_matches', 'matches') + scope + ' · ' + denom + ' ' + tr('readinglib_books', 'books')
              : filtered.length + ' ' + tr('readinglib_of', 'of') + ' ' + denom + ' ' + tr('readinglib_books', 'books') + scope;
          })()),
        // grid
        e('div', { className: 'flex-1 min-h-0 overflow-y-auto' },
          // My imports — books added on-device via "Add now" (not in the shared
          // catalog). Shown while browsing, opened straight from IndexedDB.
          (localImports.length && !filters.search) ? e('div', { className: 'mb-3' },
            e('div', { className: 'flex items-center justify-between gap-2 mb-1' },
              e('div', { className: 'text-[11px] uppercase tracking-wide font-bold text-emerald-600' },
                '📥 ' + tr('readinglib_my_imports', 'My imports') + ' · ' + tr('readinglib_my_imports_note', 'on this device')),
              props.isTeacherMode ? e('div', { className: 'flex gap-1.5' },
                e('button', { className: 'px-2 py-0.5 rounded-lg text-[11px] font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-50', onClick: exportImports, title: tr('readinglib_export_hint', 'Save your imported books to a file (to move to another device)') },
                  '⤓ ' + tr('readinglib_export', 'Back up')),
                e('button', { className: 'px-2 py-0.5 rounded-lg text-[11px] font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-50', onClick: function () { if (restoreInputRef.current) restoreInputRef.current.click(); }, title: tr('readinglib_restore_hint', 'Restore imported books from a backup file') },
                  '⤒ ' + tr('readinglib_restore', 'Restore')),
                e('input', { ref: restoreInputRef, type: 'file', accept: 'application/json,.json', className: 'hidden', 'aria-hidden': true,
                  onChange: function (ev) { var f = ev.target.files && ev.target.files[0]; restoreImports(f); ev.target.value = ''; } })
              ) : null
            ),
            e('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' },
              localImports.map(function (c) {
                return e('div', { key: 'local-' + c.slug, className: 'relative' },
                  e(BookCard, { book: c, onOpen: function () { openLocalBook(c); }, busy: loadingBook === c.slug }),
                  e('button', {
                    className: 'absolute top-1 right-1 z-10 px-1.5 py-0.5 rounded-full bg-white/90 border border-slate-200 text-[11px] text-slate-500 hover:text-red-600 hover:bg-white shadow',
                    onClick: function (ev) { ev.stopPropagation(); removeLocalBook(c.slug); },
                    'aria-label': tr('readinglib_remove_import', 'Remove from my imports') + ': ' + c.title,
                    title: tr('readinglib_remove_import', 'Remove from my imports'),
                  }, '✕')
                );
              })
            ),
            e('div', { className: 'border-b border-slate-200 mt-3' })
          ) : null,
          // Continue reading — books with a saved position, surfaced when
          // browsing (hidden during a search so it doesn't crowd results).
          (resumeList.length && !filters.search) ? e('div', { className: 'mb-3' },
            e('div', { className: 'text-[11px] uppercase tracking-wide font-bold text-indigo-500 mb-1' },
              '▶ ' + tr('readinglib_continue_reading', 'Continue reading')),
            e('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' },
              resumeList.map(function (r) {
                return e(BookCard, { key: 'resume-' + r.book.slug, book: r.book, onOpen: openBookBySlug, resumePage: r.page, busy: loadingBook === r.book.slug });
              })
            ),
            e('div', { className: 'border-b border-slate-200 mt-3' })
          ) : null,
          e('div', { className: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-2' },
            visibleBooks.map(function (b) {
              return e(BookCard, { key: b.slug, book: b, onOpen: openBookBySlug, busy: loadingBook === b.slug });
            })
          ),
          visibleBooks.length < filtered.length ? e('div', { className: 'flex justify-center py-3' },
            e('button', {
              className: 'rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-100',
              onClick: function () { setVisibleLimit(function (n) { return n + VISIBLE_BOOK_BATCH; }); },
              'aria-label': tr('readinglib_show_more_aria', 'Show more reading catalog entries'),
            }, tr('readinglib_show_more', 'Show more') + ' (' + (filtered.length - visibleBooks.length) + ' ' + tr('readinglib_remaining', 'remaining') + ')')
          ) : null,
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
        className: 'relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col p-4 ' + chromeThemeClass(readerThemeId),
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
              onClick: function () { setFindMoreOpen(true); },
              title: tr('readinglib_find_more_hint', 'Search Project Gutenberg and request books to add'),
            }, '🔎 ' + tr('readinglib_find_more', 'Find more books')) : null,
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
        findMoreOpen ? e(GutenbergSearchModal, {
          onClose: function () { setFindMoreOpen(false); },
          addToast: props.addToast,
          libraryBooks: books.concat(localImports),
          onImported: function (book) { setFindMoreOpen(false); setLocalVer(function (n) { return n + 1; }); stopSpeech(); setOpenBook(book); },
          onImportedBulk: function () { setLocalVer(function (n) { return n + 1; }); },
        }) : null,
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
  ReadingLibrary._pageAudioClips = pageAudioClips;
  ReadingLibrary._bloomEditionsFor = bloomEditionsFor;
  ReadingLibrary._moreByAuthor = moreByAuthor;
  ReadingLibrary._pageCueRange = pageCueRange;
  ReadingLibrary._cleanReadingText = cleanReadingText;
  ReadingLibrary._pageTextForPipeline = pageTextForPipeline;
  ReadingLibrary._bookPlainTextFromPages = bookPlainTextFromPages;
  ReadingLibrary._detectReadingSections = detectReadingSections;
  ReadingLibrary._sectionForPage = sectionForPage;
  ReadingLibrary._isLongFormBook = isLongFormBook;
  ReadingLibrary._bookPlainTextForScope = bookPlainTextForScope;
  ReadingLibrary._bookPlainText = bookPlainText;
  ReadingLibrary._bookPlainTextForLocalAccessibility = function (book) {
    return bookPlainText(book, { localAccessibility: true });
  };
  ReadingLibrary._textLayoutClass = textLayoutClass;
  ReadingLibrary._chromeThemeClass = chromeThemeClass;
  ReadingLibrary._readingTimeLabel = readingTimeLabel;
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
