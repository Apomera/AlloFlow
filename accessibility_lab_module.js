/**
 * AlloFlow Accessibility Lab Module
 *
 * Embedded accessibility verification suite for educators. Lets a teacher
 * inspect static accommodation layouts, hand artifacts to the authentic workspace renderer,
 * run live audits, inspect semantic structure, and perform focused visual checks.
 *
 * Module export: window.AlloModules.AccessibilityLab (React component).
 *
 * Phases (each ships independently):
 *   1. Content preview + authentic workspace handoff
 *   2. Keyboard navigation tour
 *   3. Live in-app a11y audit (axe-core)
 *   4. Semantic announcement outline
 *   5. Visual checks + reading-layout and motor guidance
 *
 * Props expected from the monolith host:
 *   isOpen: boolean
 *   onClose: () => void
 *   addToast: (msg, type) => void
 *   history: array of saved history items (lessons + outputs)
 *   callTTS: (text, opts) => Promise (used in Phase 4 + optional Phase 1 read-aloud)
 *   t: (key) => string (i18n)
 *   onOpenAuthenticView: optional function(historyItem) that hands the artifact to the host workspace renderer
 */
(function () {
  'use strict';

  if (window.AlloModules && window.AlloModules.AccessibilityLab) {
    console.log('[CDN] AccessibilityLab already loaded, skipping');
    return;
  }

  var React = window.React;
  var ReactDOM = window.ReactDOM;
  if (!React) {
    console.error('[CDN] AccessibilityLab requires window.React');
    return;
  }
  if (!ReactDOM || typeof ReactDOM.createPortal !== 'function') {
    console.error('[CDN] AccessibilityLab requires window.ReactDOM with createPortal');
    return;
  }
  var e = React.createElement;
  var useState = React.useState;
  var useMemo = React.useMemo;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  // ----- Constants ------------------------------------------------------------

  var TABS = [
    { key: 'preview',      label: 'Content preview',   icon: '👁️',  ready: true },
    { key: 'keyboard',     label: 'Keyboard tour',      icon: '⌨️',  ready: true },
    { key: 'audit',        label: 'Audit',              icon: '🔍', ready: true },
    { key: 'screenreader', label: 'Semantic outline',  icon: '🔊', ready: true },
    { key: 'simulators',   label: 'Simulators',         icon: '👓', ready: true },
  ];

  var PREVIEW_SUPPORTED_TYPES = ['analysis', 'glossary', 'quiz', 'outline', 'sentence-frames', 'word-sounds', 'simplified'];
  var REVIEW_SCORECARD_STORAGE_KEY = 'alloflow_accessibility_review_scorecards_v1';
  var REVIEW_CHECKS = [
    { id: 'keyboard', label: 'Keyboard-only task completion', hint: 'Complete the primary task without a mouse or touch input.' },
    { id: 'focus', label: 'Focus order and visibility', hint: 'Focus stays visible, follows a logical order, and is never trapped.' },
    { id: 'reflow', label: 'Reflow and zoom', hint: 'At narrow width or high zoom, content remains usable without loss or two-axis scrolling.' },
    { id: 'text_spacing', label: 'Text-spacing resilience', hint: 'Increased line, paragraph, word, and letter spacing does not hide or overlap content.' },
    { id: 'errors', label: 'Instructions, errors, and feedback', hint: 'Required input, errors, and feedback are specific, perceivable, and actionable.' },
    { id: 'motion', label: 'Reduced motion', hint: 'The task remains understandable and usable when motion is reduced.' },
    { id: 'media', label: 'Media alternatives and controls', hint: 'Relevant audio or video has accessible controls and equivalent alternatives, or is not applicable.' },
    { id: 'assistive_tech', label: 'Real assistive-technology task', hint: 'Complete the task with an appropriate screen reader or other required assistive technology.' },
  ];

  function reviewItemKey(item) {
    if (!item) return '';
    if (item.id !== undefined && item.id !== null && String(item.id)) return String(item.id);
    return String(item.type || 'artifact') + ':' + String(item.title || 'untitled');
  }

  function emptyReviewChecks() {
    var checks = {};
    REVIEW_CHECKS.forEach(function (check) { checks[check.id] = 'untested'; });
    return checks;
  }

  function normalizeReviewScorecard(raw, item) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var checks = emptyReviewChecks();
    if (raw.checks && typeof raw.checks === 'object') {
      REVIEW_CHECKS.forEach(function (check) {
        var value = raw.checks[check.id];
        if (['untested', 'pass', 'fail', 'not_applicable'].indexOf(value) >= 0) checks[check.id] = value;
      });
    }
    return {
      version: 1,
      artifactId: reviewItemKey(item) || String(raw.artifactId || ''),
      artifactType: item && item.type ? String(item.type) : String(raw.artifactType || ''),
      artifactTitle: item && item.title ? String(item.title) : String(raw.artifactTitle || ''),
      checks: checks,
      notes: typeof raw.notes === 'string' ? raw.notes : '',
      startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : null,
      lastReviewedAt: typeof raw.lastReviewedAt === 'string' ? raw.lastReviewedAt : null,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
      automated: raw.automated && typeof raw.automated === 'object' ? raw.automated : null,
    };
  }

  function summarizeReviewScorecard(card) {
    var counts = { pass: 0, fail: 0, untested: 0, not_applicable: 0, total: REVIEW_CHECKS.length };
    var checks = card && card.checks ? card.checks : {};
    REVIEW_CHECKS.forEach(function (check) {
      var value = checks[check.id];
      if (!Object.prototype.hasOwnProperty.call(counts, value)) value = 'untested';
      counts[value] += 1;
    });
    counts.complete = counts.untested === 0;
    return counts;
  }

  function loadReviewScorecards() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(REVIEW_SCORECARD_STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) { return {}; }
  }

  function persistReviewScorecards(store) {
    try {
      if (window.localStorage) window.localStorage.setItem(REVIEW_SCORECARD_STORAGE_KEY, JSON.stringify(store || {}));
      return true;
    } catch (_) { return false; }
  }
  var FONT_FAMILIES = [
    { value: 'system',   label: 'Default (system)',     css: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
    { value: 'sans',     label: 'Sans-serif',           css: '"Atkinson Hyperlegible", Arial, sans-serif' },
    { value: 'serif',    label: 'Serif',                css: 'Georgia, "Times New Roman", serif' },
    { value: 'dyslexic', label: 'OpenDyslexic',         css: '"OpenDyslexic", "Comic Sans MS", sans-serif' },
  ];

  var FONT_SIZES = [
    { value: 'sm', label: 'Small',       px: 14 },
    { value: 'md', label: 'Normal',      px: 17 },
    { value: 'lg', label: 'Large',       px: 21 },
    { value: 'xl', label: 'Extra Large', px: 26 },
  ];

  var THEMES = [
    { value: 'light',   label: 'Light',         bg: '#ffffff', fg: '#0f172a', sub: '#475569' },
    { value: 'dark',    label: 'Dark',          bg: '#0f172a', fg: '#f1f5f9', sub: '#cbd5e1' },
    { value: 'hc',      label: 'High contrast', bg: '#000000', fg: '#fff700', sub: '#fff700' },
    { value: 'sepia',   label: 'Sepia',         bg: '#f4ecd8', fg: '#3a2f1a', sub: '#5a4a2a' },
  ];

  var LINE_SPACINGS = [
    { value: 'tight',  label: 'Tight',  cssLineHeight: '1.3' },
    { value: 'normal', label: 'Normal', cssLineHeight: '1.6' },
    { value: 'loose',  label: 'Loose',  cssLineHeight: '2.0' },
  ];

  // The app stores letterSpacing as a unitless em multiplier (default 0).
  // Lab buckets cover the common accessibility recommendations.
  var LETTER_SPACINGS = [
    { value: 'normal', label: 'Normal', em: 0 },
    { value: 'wide',   label: 'Wide',   em: 0.05 },
    { value: 'wider',  label: 'Wider',  em: 0.10 },
  ];

  // ----- Live-app <-> Lab settings mapping ------------------------------------
  // The app's accessibility settings (AlloFlowANTI.txt:5885-5951) use a richer
  // enum than the Lab's preview controls. These helpers translate at the
  // boundary so the Lab can read the teacher's current real settings and write
  // a chosen preview combination back to the live app.

  // App readingTheme -> Lab theme. Unmapped app themes return null so the UI
  // can surface a "switch in main settings" note.
  function appThemeToLab(rt) {
    if (rt === 'dark') return 'dark';
    if (rt === 'highContrast') return 'hc';
    if (rt === 'sepia') return 'sepia';
    if (rt === 'default' || !rt) return 'light';
    return null;
  }
  function labThemeToApp(t) {
    if (t === 'dark') return 'dark';
    if (t === 'hc')   return 'highContrast';
    if (t === 'sepia') return 'sepia';
    return 'default';
  }
  // App selectedFont id (FONT_OPTIONS) -> Lab fontFamily value.
  function appFontToLab(id) {
    if (id === 'opendyslexic') return 'dyslexic';
    if (id === 'merriweather' || id === 'gentium' || id === 'lora' || id === 'playfair') return 'serif';
    if (!id || id === 'default') return 'system';
    return 'sans';
  }
  function labFontToApp(v) {
    if (v === 'dyslexic') return 'opendyslexic';
    if (v === 'serif')    return 'merriweather';
    if (v === 'sans')     return 'atkinson';
    return 'default';
  }
  // Round arbitrary numeric baseFontSize to the nearest lab bucket.
  function appSizeToLab(px) {
    var n = typeof px === 'number' ? px : parseFloat(px);
    if (!isFinite(n)) return 'md';
    var best = FONT_SIZES[0], bestDist = Math.abs(n - FONT_SIZES[0].px);
    for (var i = 1; i < FONT_SIZES.length; i++) {
      var d = Math.abs(n - FONT_SIZES[i].px);
      if (d < bestDist) { best = FONT_SIZES[i]; bestDist = d; }
    }
    return best.value;
  }
  function labSizeToApp(v) {
    var found = FONT_SIZES.find(function (s) { return s.value === v; });
    return found ? found.px : 17;
  }
  function appLineHeightToLab(lh) {
    var n = typeof lh === 'number' ? lh : parseFloat(lh);
    if (!isFinite(n)) return 'normal';
    if (n <= 1.45) return 'tight';
    if (n >= 1.8)  return 'loose';
    return 'normal';
  }
  function labLineHeightToApp(v) {
    if (v === 'tight') return 1.3;
    if (v === 'loose') return 2.0;
    return 1.6;
  }
  function appLetterSpacingToLab(ls) {
    var n = typeof ls === 'number' ? ls : parseFloat(ls);
    if (!isFinite(n)) return 'normal';
    if (n >= 0.08) return 'wider';
    if (n >= 0.03) return 'wide';
    return 'normal';
  }
  function labLetterSpacingToApp(v) {
    var found = LETTER_SPACINGS.find(function (s) { return s.value === v; });
    return found ? found.em : 0;
  }

  // ----- Helpers --------------------------------------------------------------

  // Stable, locale-independent selector for excluding the lab from its own
  // scans. The dialog's aria-label is translated, so we use a data attribute
  // instead. Both the portal wrapper and the dialog carry this attribute, so
  // a single querySelector will find one of them, and .contains(el) then
  // catches every focusable/landmark element inside the lab.
  var LAB_EXCLUDE_SELECTOR = '[data-alloflow-a11y-lab]';

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) { return false; }
  }
  function scrollBehavior() {
    return prefersReducedMotion() ? 'auto' : 'smooth';
  }

  // Translator wrapper. The host passes `t` (the app's i18n function); when
  // a key is missing it commonly returns the key back unchanged, so we treat
  // both "no t" and "t returned the key" as a miss and fall back to English.
  function makeTr(t) {
    return function tr(key, fallback) {
      if (typeof t !== 'function') return fallback;
      try {
        var v = t(key);
        if (v && v !== key) return v;
      } catch (_) {}
      return fallback;
    };
  }

  function asString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
  }

  function settingsStyle(settings, theme) {
    var family = FONT_FAMILIES.find(function (f) { return f.value === settings.fontFamily; }) || FONT_FAMILIES[0];
    var size = FONT_SIZES.find(function (s) { return s.value === settings.fontSize; }) || FONT_SIZES[1];
    var spacing = LINE_SPACINGS.find(function (s) { return s.value === settings.lineSpacing; }) || LINE_SPACINGS[1];
    var ls = LETTER_SPACINGS.find(function (s) { return s.value === settings.letterSpacing; }) || LETTER_SPACINGS[0];
    return {
      fontFamily: family.css,
      fontSize: size.px + 'px',
      lineHeight: spacing.cssLineHeight,
      letterSpacing: ls.em + 'em',
      backgroundColor: theme.bg,
      color: theme.fg,
      padding: '20px',
      borderRadius: '8px',
      minHeight: '200px',
    };
  }

  // Strip citation-style markdown links like `[^(1)](https://...)` or
  // `[(1)](https://...)` — these are reference markers that add noise to a
  // student-facing preview. Returns plain text with the parenthesized number
  // preserved (so context like "evaporation [1]" still reads naturally) and
  // the URL discarded.
  function stripCitations(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/\[\^?\((\d+)\)\]\([^)]+\)/g, '[$1]');
  }

  // Render a single history item in a student-friendly layout. Different
  // history types have different data shapes; we pick out the parts that
  // make sense to display in a preview.
  function renderHistoryItemContent(item, theme, renderFormattedText) {
    if (!item || !item.data) {
      return e('p', { style: { color: theme.sub, fontStyle: 'italic' } }, 'No content available for this lesson item.');
    }
    var data = item.data;

    // analysis: source text + concepts.
    // Source text often contains markdown (headings, links, citation refs).
    // Strip citation links (noise in a student preview), then route through
    // the host's renderFormattedText when available so headings/links/lists
    // actually render. Fall back to plain pre-wrap text if the host did not
    // wire renderFormattedText through.
    if (item.type === 'analysis') {
      var cleanedSourceText = stripCitations(asString(data.originalText));
      var sourceBody = (typeof renderFormattedText === 'function')
        ? e('div', { className: 'a11y-rendered-markdown' }, renderFormattedText(cleanedSourceText, false, false))
        : e('p', { style: { whiteSpace: 'pre-wrap' } }, cleanedSourceText);
      return e('div', null,
        data.originalText && e('section', { style: { marginBottom: '24px' } },
          e('h4', { style: { fontWeight: 700, marginBottom: '12px' } }, 'Source text'),
          sourceBody
        ),
        Array.isArray(data.concepts) && data.concepts.length > 0 && e('section', { style: { marginBottom: '24px' } },
          e('h4', { style: { fontWeight: 700, marginBottom: '12px' } }, 'Key concepts'),
          e('ul', { style: { listStyle: 'disc', paddingLeft: '24px' } },
            data.concepts.map(function (c, i) {
              return e('li', { key: i, style: { marginBottom: '6px' } }, asString(c));
            })
          )
        )
      );
    }

    // glossary: array of terms + definitions
    if (item.type === 'glossary' && Array.isArray(data)) {
      return e('div', null,
        e('h4', { style: { fontWeight: 700, marginBottom: '16px' } }, 'Glossary'),
        e('dl', null,
          data.map(function (entry, i) {
            return e('div', { key: i, style: { marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid ' + theme.sub + '40' } },
              e('dt', { style: { fontWeight: 700 } }, asString(entry.term)),
              e('dd', { style: { marginLeft: '0', marginTop: '4px', color: theme.sub } }, asString(entry.definition))
            );
          })
        )
      );
    }

    // quiz: array of questions
    if (item.type === 'quiz' && data.questions && Array.isArray(data.questions)) {
      return e('div', null,
        e('h4', { style: { fontWeight: 700, marginBottom: '16px' } }, 'Quiz'),
        data.questions.map(function (q, i) {
          return e('div', { key: i, style: { marginBottom: '20px' } },
            e('p', { style: { fontWeight: 600, marginBottom: '8px' } }, (i + 1) + '. ' + asString(q.text || q.question)),
            Array.isArray(q.options) && e('ul', { style: { listStyle: 'none', paddingLeft: '0' } },
              q.options.map(function (opt, j) {
                return e('li', {
                  key: j,
                  style: { padding: '6px 12px', marginBottom: '4px', border: '1px solid ' + theme.sub + '60', borderRadius: '4px' }
                }, String.fromCharCode(65 + j) + '. ' + asString(opt));
              })
            )
          );
        })
      );
    }

    // outline / visual organizer
    if (item.type === 'outline') {
      return e('div', null,
        data.main && e('h4', { style: { fontWeight: 700, marginBottom: '12px', fontSize: '1.2em' } }, asString(data.main)),
        Array.isArray(data.branches) && e('ul', { style: { listStyle: 'circle', paddingLeft: '24px' } },
          data.branches.map(function (b, i) {
            return e('li', { key: i, style: { marginBottom: '6px' } }, asString(b));
          })
        ),
        data.challenge && e('p', { style: { fontStyle: 'italic', marginTop: '16px' } }, asString(data.challenge))
      );
    }

    // sentence frames
    if (item.type === 'sentence-frames') {
      var frames = Array.isArray(data) ? data : (data.items || []);
      return e('div', null,
        e('h4', { style: { fontWeight: 700, marginBottom: '12px' } }, 'Sentence frames'),
        e('ul', { style: { listStyle: 'none', paddingLeft: '0' } },
          frames.map(function (f, i) {
            return e('li', {
              key: i,
              style: { padding: '8px 12px', marginBottom: '6px', border: '1px dashed ' + theme.sub + '80', borderRadius: '4px' }
            }, asString(typeof f === 'string' ? f : (f.text || f.frame || JSON.stringify(f))));
          })
        )
      );
    }

    // word-sounds
    if (item.type === 'word-sounds' && Array.isArray(data)) {
      return e('div', null,
        e('h4', { style: { fontWeight: 700, marginBottom: '12px' } }, 'Word sounds'),
        e('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
          data.map(function (w, i) {
            var word = w.targetWord || w.word || w.displayWord || '';
            return e('div', {
              key: i,
              style: { padding: '8px 14px', border: '1px solid ' + theme.sub + '60', borderRadius: '6px', fontWeight: 600 }
            }, asString(word));
          })
        )
      );
    }

    // simplified text
    if (item.type === 'simplified') {
      var text = typeof data === 'string' ? data : (data.text || data.simplifiedText || '');
      return e('div', null,
        e('h4', { style: { fontWeight: 700, marginBottom: '12px' } }, 'Simplified text'),
        e('p', { style: { whiteSpace: 'pre-wrap' } }, asString(text))
      );
    }

    // Unsupported artifacts must be opened in their authentic student view.
    // Raw lesson data is intentionally never presented as a student preview.
    return e('div', {
      style: { padding: '16px', border: '1px solid ' + theme.sub + '60', borderRadius: '6px' }
    },
      e('p', { style: { color: theme.sub, fontStyle: 'italic' } },
        'This content type is not represented by the static accommodation preview. Open it in the real student view to verify its interaction and accessibility.'
      )
    );
  }

  // ----- Phase 1: Content accommodation preview -----------------------------

  function PreviewTab(props) {
    var history = props.history || [];
    var callTTS = props.callTTS;
    var renderFormattedText = props.renderFormattedText;
    var addToast = props.addToast;
    var tr = makeTr(props.t);

    // Whether the host passed setters for the real app's accessibility state.
    // When true, the Preview tab can sync from and write back to the live app.
    var canApplyToApp = (
      typeof props.setReadingTheme === 'function' &&
      typeof props.setBaseFontSize === 'function' &&
      typeof props.setLineHeight    === 'function' &&
      typeof props.setSelectedFont  === 'function'
    );

    function settingsFromApp() {
      var mappedTheme = appThemeToLab(props.readingTheme);
      return {
        fontFamily: appFontToLab(props.selectedFont),
        fontSize:   appSizeToLab(props.baseFontSize),
        theme:      mappedTheme || 'light',
        lineSpacing: appLineHeightToLab(props.lineHeight),
        letterSpacing: appLetterSpacingToLab(props.letterSpacing),
      };
    }

    var sel$ = useState(function () {
      var reviewId = props.reviewSession && props.reviewSession.itemId;
      return reviewId ? (history.find(function (item) { return item && String(item.id) === String(reviewId); }) || null) : null;
    });
    var selectedItem = sel$[0], setSelectedItem = sel$[1];

    var reviewStore$ = useState(loadReviewScorecards);
    var reviewStore = reviewStore$[0], setReviewStore = reviewStore$[1];

    var reviewSessionItemId = props.reviewSession && props.reviewSession.itemId ? String(props.reviewSession.itemId) : '';
    useEffect(function () {
      if (!reviewSessionItemId) return;
      var match = history.find(function (item) { return item && String(item.id) === reviewSessionItemId; });
      if (match && (!selectedItem || String(selectedItem.id) !== reviewSessionItemId)) setSelectedItem(match);
    }, [reviewSessionItemId, history]);

    var settings$ = useState(settingsFromApp);
    var settings = settings$[0], setSettings = settings$[1];

    var theme = useMemo(function () {
      return THEMES.find(function (t) { return t.value === settings.theme; }) || THEMES[0];
    }, [settings.theme]);

    // True when the current app readingTheme has no equivalent in the lab's
    // simplified theme enum (e.g., warm, blue, green, rose, dyslexia overlay).
    var unmappedAppTheme = appThemeToLab(props.readingTheme) === null;

    function update(key, value) {
      var next = {};
      next[key] = value;
      setSettings(Object.assign({}, settings, next));
    }

    function handleApplyToApp() {
      if (!canApplyToApp) return;
      try {
        props.setReadingTheme(labThemeToApp(settings.theme));
        props.setBaseFontSize(labSizeToApp(settings.fontSize));
        props.setLineHeight(labLineHeightToApp(settings.lineSpacing));
        props.setSelectedFont(labFontToApp(settings.fontFamily));
        if (typeof props.setLetterSpacing === 'function') {
          props.setLetterSpacing(labLetterSpacingToApp(settings.letterSpacing));
        }
        addToast && addToast(tr('a11y_lab.preview.apply_success', 'Applied to the live app for all students using this device.'), 'success');
      } catch (err) {
        addToast && addToast(tr('a11y_lab.preview.apply_error', 'Could not apply settings: ') + (err && err.message), 'error');
      }
    }

    function handleResetFromApp() {
      setSettings(settingsFromApp());
      addToast && addToast(tr('a11y_lab.preview.reset_success', 'Reset to the live app\'s current settings.'), 'info');
    }

    function handleReadAloud() {
      if (!callTTS || typeof callTTS !== 'function') {
        addToast && addToast(tr('a11y_lab.preview.read_aloud_unavailable', 'Read aloud is not available in this build.'), 'error');
        return;
      }
      // Read the visible content of the preview pane
      var pane = document.getElementById('alloflow-a11y-preview-pane');
      var text = pane ? pane.innerText : '';
      if (!text || !text.trim()) {
        addToast && addToast(tr('a11y_lab.preview.read_aloud_empty', 'Nothing to read in the current preview.'), 'info');
        return;
      }
      try {
        Promise.resolve(callTTS(text)).catch(function (err) {
          addToast && addToast(tr('a11y_lab.preview.read_aloud_error', 'Could not start read-aloud: ') + (err && err.message), 'error');
        });
      } catch (err) {
        addToast && addToast(tr('a11y_lab.preview.read_aloud_error', 'Could not start read-aloud: ') + (err && err.message), 'error');
      }
    }

    var hasStaticPreview = !!selectedItem && PREVIEW_SUPPORTED_TYPES.indexOf(selectedItem.type) >= 0;
    var authenticViewAvailable = typeof props.onOpenAuthenticView === 'function';
    var selectedReviewKey = reviewItemKey(selectedItem);
    var scorecard = selectedItem ? normalizeReviewScorecard(reviewStore[selectedReviewKey], selectedItem) : null;
    var scoreSummary = summarizeReviewScorecard(scorecard);

    function saveScorecard(nextCard) {
      if (!selectedReviewKey || !nextCard) return;
      var stamped = Object.assign({}, nextCard, { updatedAt: new Date().toISOString() });
      var nextStore = Object.assign({}, reviewStore);
      nextStore[selectedReviewKey] = stamped;
      setReviewStore(nextStore);
      persistReviewScorecards(nextStore);
    }

    function updateReviewStatus(checkId, status) {
      if (!scorecard || ['untested', 'pass', 'fail', 'not_applicable'].indexOf(status) < 0) return;
      var checks = Object.assign({}, scorecard.checks);
      checks[checkId] = status;
      saveScorecard(Object.assign({}, scorecard, {
        checks: checks,
        startedAt: scorecard.startedAt || new Date().toISOString(),
      }));
    }

    function updateReviewNotes(notes) {
      if (!scorecard) return;
      saveScorecard(Object.assign({}, scorecard, {
        notes: String(notes || '').slice(0, 5000),
        startedAt: scorecard.startedAt || new Date().toISOString(),
      }));
    }

    function markReviewComplete() {
      if (!scorecard) return;
      var summary = summarizeReviewScorecard(scorecard);
      if (summary.untested > 0) {
        addToast && addToast(tr('a11y_lab.review.incomplete', 'Complete or mark every check not applicable before finishing the review.'), 'info');
        return;
      }
      saveScorecard(Object.assign({}, scorecard, {
        startedAt: scorecard.startedAt || new Date().toISOString(),
        lastReviewedAt: new Date().toISOString(),
      }));
      addToast && addToast(summary.fail > 0
        ? tr('a11y_lab.review.completed_with_findings', 'Review saved with accessibility findings to address.')
        : tr('a11y_lab.review.completed', 'Accessibility review completed and saved.'), summary.fail > 0 ? 'info' : 'success');
    }

    function handleOpenAuthenticView() {
      if (!selectedItem || !authenticViewAvailable) {
        addToast && addToast(tr('a11y_lab.preview.authentic_unavailable', 'The authentic workspace view is not available in this host.'), 'error');
        return;
      }
      try {
        if (scorecard && !scorecard.startedAt) saveScorecard(Object.assign({}, scorecard, { startedAt: new Date().toISOString() }));
        var openResult = props.onOpenAuthenticView(selectedItem);
        if (openResult && typeof openResult.then === 'function') {
          openResult.catch(function (err) {
            addToast && addToast(tr('a11y_lab.preview.authentic_error', 'Could not open the authentic workspace view: ') + (err && err.message), 'error');
          });
        }
      } catch (err) {
        addToast && addToast(tr('a11y_lab.preview.authentic_error', 'Could not open the authentic workspace view: ') + (err && err.message), 'error');
      }
    }

    if (!selectedItem) {
      // Every saved artifact can be handed to the canonical workspace renderer.
      // A subset also has a faithful static accommodation preview inside the Lab.
      var validHistory = history.filter(function (item) { return item && item.type; });
      var missingReviewSession = props.reviewSession && !validHistory.some(function (item) { return String(item.id) === String(props.reviewSession.itemId); });
      return e('div', { className: 'flex flex-col gap-4' },
        e('div', null,
          e('h3', { className: 'font-bold text-lg text-slate-800' }, tr('a11y_lab.preview.heading_workspace', 'Review saved content accessibility')),
          e('p', { className: 'text-sm text-slate-600 mt-1' },
            tr('a11y_lab.preview.select_intro_workspace', 'Choose any saved artifact. Reading-focused content can be checked here with static accommodations; interactive and specialized artifacts open through the app\'s authentic workspace renderer.'))
        ),
        missingReviewSession && e('div', { className: 'flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-950' },
          e('p', { className: 'flex-1 text-xs' }, tr('a11y_lab.review.missing_artifact', 'The artifact from the active review session is no longer in saved history. End the session or select another artifact.')),
          typeof props.onEndReviewSession === 'function' && e('button', {
            type: 'button',
            onClick: props.onEndReviewSession,
            className: 'px-3 py-2 text-xs font-semibold border border-amber-400 rounded-lg hover:bg-amber-100',
          }, tr('a11y_lab.review.end_session', 'End review session'))
        ),
        validHistory.length === 0
          ? e('div', { className: 'p-8 text-center bg-slate-50 rounded-lg border border-slate-200 text-slate-600' },
              tr('a11y_lab.preview.no_saved_content', 'No saved content yet. Generate or save an artifact first, then return here to review it.'))
          : e('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              validHistory.map(function (item) {
                var supportsStatic = PREVIEW_SUPPORTED_TYPES.indexOf(item.type) >= 0;
                var savedCard = reviewStore[reviewItemKey(item)] ? normalizeReviewScorecard(reviewStore[reviewItemKey(item)], item) : null;
                var savedSummary = savedCard ? summarizeReviewScorecard(savedCard) : null;
                return e('button', {
                  type: 'button',
                  key: item.id,
                  onClick: function () { setSelectedItem(item); },
                  className: 'flex flex-col items-start gap-1 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-500 hover:shadow-sm text-left transition-all',
                },
                  e('div', { className: 'flex items-center gap-2 w-full' },
                    e('span', { className: 'text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800' }, item.type),
                    e('span', { className: 'font-bold text-sm text-slate-800 flex-1' }, asString(item.title) || tr('a11y_lab.preview.untitled', '(untitled)'))
                  ),
                  e('span', {
                    className: 'text-[11px] font-semibold ' + (supportsStatic ? 'text-emerald-700' : 'text-amber-700')
                  }, supportsStatic
                    ? tr('a11y_lab.preview.static_available', 'Static accommodation preview available')
                    : tr('a11y_lab.preview.authentic_required', 'Authentic workspace view required')),
                  savedSummary && e('span', { className: 'text-[11px] text-slate-600' },
                    savedSummary.fail + ' ' + tr('a11y_lab.review.findings_short', 'findings') + ' · ' +
                    savedSummary.pass + ' ' + tr('a11y_lab.review.passed_short', 'passed') + ' · ' +
                    savedSummary.untested + ' ' + tr('a11y_lab.review.untested_short', 'untested')),
                  item.meta && e('span', { className: 'text-xs text-slate-500 truncate w-full' }, asString(item.meta))
                );
              })
            )
      );
    }
    // Preview pane
    return e('div', { className: 'flex flex-col gap-4' },
      e('div', { className: 'flex items-center justify-between' },
        e('button', {
          onClick: function () { setSelectedItem(null); },
          className: 'text-sm text-indigo-700 hover:underline flex items-center gap-1',
        }, tr('a11y_lab.preview.back', '← Back to lesson list')),
        e('div', { className: 'text-xs text-slate-500' },
          tr('a11y_lab.preview.previewing_prefix', 'Previewing: '), e('strong', null, asString(selectedItem.title) || tr('a11y_lab.preview.untitled', '(untitled)')),
          ' (', selectedItem.type, ')'
        )
      ),

      e('div', { className: 'flex flex-col md:flex-row md:items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg' },
        e('div', { className: 'flex-1' },
          e('h4', { className: 'text-sm font-bold text-indigo-950' },
            hasStaticPreview
              ? tr('a11y_lab.preview.static_scope_heading', 'Static accommodation check')
              : tr('a11y_lab.preview.authentic_scope_heading', 'Authentic renderer required')),
          e('p', { className: 'text-xs text-indigo-900 mt-1' },
            hasStaticPreview
              ? tr('a11y_lab.preview.static_scope_body', 'The controls below test reading presentation only. Open the authentic workspace view to verify interactions, focus behavior, feedback, audio, and responsive layout.')
              : tr('a11y_lab.preview.authentic_scope_body', 'This artifact depends on its real application state and interaction model. The Lab will hand it to the canonical workspace renderer instead of approximating it here.'))
        ),
        e('button', {
          type: 'button',
          onClick: handleOpenAuthenticView,
          disabled: !authenticViewAvailable,
          className: 'shrink-0 px-3 py-2 text-xs font-bold bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed',
        }, tr('a11y_lab.preview.open_authentic', 'Open in authentic workspace view'))
      ),

      e('section', { className: 'border border-slate-200 rounded-xl overflow-hidden', 'data-a11y-review-scorecard': selectedReviewKey },
        e('div', { className: 'flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200' },
          e('div', { className: 'flex-1' },
            e('h4', { className: 'font-bold text-sm text-slate-900' }, tr('a11y_lab.review.heading', 'Artifact accessibility scorecard')),
            e('p', { className: 'text-xs text-slate-600 mt-0.5' }, tr('a11y_lab.review.description', 'Record evidence from the authentic task. Untested checks remain visible and are never treated as passes.')),
            scorecard.automated && e('p', { className: 'text-[11px] text-indigo-700 mt-1' },
              tr('a11y_lab.review.automated_prefix', 'Latest automated audit: ') +
              scorecard.automated.violationRules + ' ' + tr('a11y_lab.review.violations_short', 'violations') + ' · ' +
              scorecard.automated.affectedElements + ' ' + tr('a11y_lab.review.elements_short', 'elements') + ' · ' +
              scorecard.automated.needsReview + ' ' + tr('a11y_lab.review.need_review_short', 'need review') +
              ' (' + scorecard.automated.engine + ' ' + scorecard.automated.engineVersion + ')')
          ),
          e('div', { className: 'flex flex-wrap gap-1.5 text-[11px] font-bold', 'aria-live': 'polite' },
            e('span', { className: 'px-2 py-1 rounded bg-emerald-100 text-emerald-800' }, scoreSummary.pass + ' ' + tr('a11y_lab.review.passed_short', 'passed')),
            e('span', { className: 'px-2 py-1 rounded bg-rose-100 text-rose-800' }, scoreSummary.fail + ' ' + tr('a11y_lab.review.findings_short', 'findings')),
            e('span', { className: 'px-2 py-1 rounded bg-slate-200 text-slate-700' }, scoreSummary.untested + ' ' + tr('a11y_lab.review.untested_short', 'untested')),
            scoreSummary.not_applicable > 0 && e('span', { className: 'px-2 py-1 rounded bg-blue-100 text-blue-800' }, scoreSummary.not_applicable + ' ' + tr('a11y_lab.review.na_short', 'N/A'))
          )
        ),
        e('fieldset', { className: 'p-4 space-y-3' },
          e('legend', { className: 'sr-only' }, tr('a11y_lab.review.checks_legend', 'Manual accessibility review checks')),
          REVIEW_CHECKS.map(function (check) {
            var selectId = 'a11y-review-check-' + check.id;
            return e('div', { key: check.id, className: 'grid gap-2 md:grid-cols-[1fr_150px] md:items-center p-3 rounded-lg border border-slate-200 bg-white' },
              e('div', null,
                e('label', { htmlFor: selectId, className: 'block text-sm font-semibold text-slate-800' }, check.label),
                e('p', { className: 'text-xs text-slate-500 mt-0.5' }, check.hint)
              ),
              e('select', {
                id: selectId,
                value: scorecard.checks[check.id],
                onChange: function (ev) { updateReviewStatus(check.id, ev.target.value); },
                className: 'w-full px-2 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white',
              },
                e('option', { value: 'untested' }, tr('a11y_lab.review.status_untested', 'Not tested')),
                e('option', { value: 'pass' }, tr('a11y_lab.review.status_pass', 'Pass')),
                e('option', { value: 'fail' }, tr('a11y_lab.review.status_fail', 'Finding')),
                e('option', { value: 'not_applicable' }, tr('a11y_lab.review.status_na', 'Not applicable'))
              )
            );
          }),
          e('div', { className: 'pt-2' },
            e('label', { htmlFor: 'a11y-review-notes', className: 'block text-sm font-semibold text-slate-800 mb-1' }, tr('a11y_lab.review.notes_label', 'Review notes and evidence')),
            e('textarea', {
              id: 'a11y-review-notes',
              value: scorecard.notes,
              rows: 4,
              maxLength: 5000,
              onChange: function (ev) { updateReviewNotes(ev.target.value); },
              placeholder: tr('a11y_lab.review.notes_placeholder', 'Record the task, assistive technology, browser, observed problem, and reproduction steps.'),
              className: 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-y',
            })
          ),
          e('div', { className: 'flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-200' },
            e('div', { className: 'flex-1 text-xs text-slate-600' },
              scorecard.lastReviewedAt
                ? tr('a11y_lab.review.last_reviewed_prefix', 'Last completed: ') + new Date(scorecard.lastReviewedAt).toLocaleString()
                : tr('a11y_lab.review.not_completed', 'This review has not been completed yet.')),
            props.reviewSession && typeof props.onEndReviewSession === 'function' && e('button', {
              type: 'button',
              onClick: props.onEndReviewSession,
              className: 'px-3 py-2 text-xs font-semibold border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50',
            }, tr('a11y_lab.review.end_session', 'End review session')),
            e('button', {
              type: 'button',
              onClick: markReviewComplete,
              className: 'px-3 py-2 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800',
            }, tr('a11y_lab.review.complete_button', 'Complete and save review'))
          )
        )
      ),

      // Settings strip
      hasStaticPreview && e('div', { className: 'bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3' },
        e('div', null,
          e('label', { htmlFor: 'a11y-lab-preview-font', className: 'block text-xs font-semibold text-slate-700 mb-1' }, tr('a11y_lab.preview.font_label', 'Font')),
          e('select', {
            id: 'a11y-lab-preview-font',
            value: settings.fontFamily,
            onChange: function (ev) { update('fontFamily', ev.target.value); },
            className: 'w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white',
          }, FONT_FAMILIES.map(function (f) { return e('option', { key: f.value, value: f.value }, f.label); }))
        ),
        e('div', null,
          e('label', { htmlFor: 'a11y-lab-preview-size', className: 'block text-xs font-semibold text-slate-700 mb-1' }, tr('a11y_lab.preview.size_label', 'Size')),
          e('select', {
            id: 'a11y-lab-preview-size',
            value: settings.fontSize,
            onChange: function (ev) { update('fontSize', ev.target.value); },
            className: 'w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white',
          }, FONT_SIZES.map(function (s) { return e('option', { key: s.value, value: s.value }, s.label); }))
        ),
        e('div', null,
          e('label', { htmlFor: 'a11y-lab-preview-theme', className: 'block text-xs font-semibold text-slate-700 mb-1' }, tr('a11y_lab.preview.theme_label', 'Theme')),
          e('select', {
            id: 'a11y-lab-preview-theme',
            value: settings.theme,
            onChange: function (ev) { update('theme', ev.target.value); },
            className: 'w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white',
          }, THEMES.map(function (t) { return e('option', { key: t.value, value: t.value }, t.label); }))
        ),
        e('div', null,
          e('label', { htmlFor: 'a11y-lab-preview-line-spacing', className: 'block text-xs font-semibold text-slate-700 mb-1' }, tr('a11y_lab.preview.spacing_label', 'Line spacing')),
          e('select', {
            id: 'a11y-lab-preview-line-spacing',
            value: settings.lineSpacing,
            onChange: function (ev) { update('lineSpacing', ev.target.value); },
            className: 'w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white',
          }, LINE_SPACINGS.map(function (s) { return e('option', { key: s.value, value: s.value }, s.label); }))
        ),
        e('div', null,
          e('label', { htmlFor: 'a11y-lab-preview-letter-spacing', className: 'block text-xs font-semibold text-slate-700 mb-1' }, tr('a11y_lab.preview.letter_spacing_label', 'Letter spacing')),
          e('select', {
            id: 'a11y-lab-preview-letter-spacing',
            value: settings.letterSpacing,
            onChange: function (ev) { update('letterSpacing', ev.target.value); },
            className: 'w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white',
          }, LETTER_SPACINGS.map(function (s) { return e('option', { key: s.value, value: s.value }, s.label); }))
        ),
        e('div', { className: 'flex flex-col justify-end' },
          e('button', {
            onClick: handleReadAloud,
            className: 'w-full px-2 py-1 text-xs font-semibold border border-emerald-600 text-emerald-700 rounded hover:bg-emerald-50',
          }, tr('a11y_lab.preview.read_aloud', '🔊 Read aloud'))
        )
      ),

      // Unmapped-theme note: surfaced when the app's current readingTheme has
      // no equivalent in the lab's simplified theme enum.
      hasStaticPreview && unmappedAppTheme && e('div', { className: 'p-2 text-xs bg-blue-50 border border-blue-200 rounded text-blue-900' },
        tr('a11y_lab.preview.unmapped_theme_note', 'Note: the app is currently using a reading theme (warm, blue, green, rose, or dyslexia overlay) that is not represented in this preview yet. Switch it in the main accessibility settings to preview it accurately.')
      ),

      // Static accommodation preview; interactive behavior belongs to the authentic student view.
      hasStaticPreview && e('div', { id: 'alloflow-a11y-preview-pane', style: settingsStyle(settings, theme), 'aria-label': tr('a11y_lab.preview.pane_accommodations_aria', 'Content accommodation preview pane') },
        renderHistoryItemContent(selectedItem, theme, renderFormattedText)
      ),

      // Apply / Reset buttons (only when host passed the setters)
      hasStaticPreview && canApplyToApp && e('div', { className: 'flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200' },
        e('button', {
          onClick: handleApplyToApp,
          className: 'px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700',
        }, tr('a11y_lab.preview.apply_button', 'Apply these settings to the app')),
        e('button', {
          onClick: handleResetFromApp,
          className: 'px-3 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 rounded hover:bg-slate-50',
        }, tr('a11y_lab.preview.reset_button', 'Reset to app defaults')),
        e('span', { className: 'text-xs text-slate-500' },
          tr('a11y_lab.preview.apply_explanation', 'Applies the font, size, theme, line spacing, and letter spacing above to the live app for all students using this device.')
        )
      ),

      // Hint
      hasStaticPreview && e('div', { className: 'text-xs text-slate-500 italic' },
        tr('a11y_lab.preview.tip_resilience', 'Tip: use high contrast, larger text, and increased spacing to check whether the content remains readable. This is a layout-resilience check, not a simulation of any individual disability.'))
    );
  }

  // ----- Phase 2: Keyboard accessibility audit + tab-order overlay -----------

  // Selectors that capture the standard set of keyboard-focusable elements.
  // Excludes [tabindex="-1"] which is intentionally non-focusable.
  var FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    'iframe',
    'audio[controls]',
    'video[controls]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]:not([contenteditable="false"])',
  ].join(', ');

  function referencedText(el, attrName) {
    var ids = (el.getAttribute(attrName) || '').trim().split(/\s+/).filter(Boolean);
    if (ids.length === 0) return '';
    var doc = el.ownerDocument || document;
    return ids.map(function (id) {
      var ref = doc.getElementById(id);
      return ref ? (ref.textContent || '').trim().replace(/\s+/g, ' ') : '';
    }).filter(Boolean).join(' ');
  }

  function associatedLabelText(el) {
    if (!el) return '';
    try {
      if (el.labels && el.labels.length) {
        return Array.from(el.labels).map(function (label) {
          return (label.textContent || '').trim().replace(/\s+/g, ' ');
        }).filter(Boolean).join(' ');
      }
    } catch (_) {}
    var id = el.getAttribute && el.getAttribute('id');
    if (!id) return '';
    try {
      var doc = el.ownerDocument || document;
      var label = doc.querySelector('label[for="' + CSS.escape(id) + '"]');
      return label ? (label.textContent || '').trim().replace(/\s+/g, ' ') : '';
    } catch (_) { return ''; }
  }

  function getElementLabel(el) {
    var labelledByText = referencedText(el, 'aria-labelledby');
    if (labelledByText) return labelledByText.slice(0, 80);
    var aria = (el.getAttribute('aria-label') || '').trim();
    if (aria) return aria.slice(0, 80);
    var nativeLabel = associatedLabelText(el);
    if (nativeLabel) return nativeLabel.slice(0, 80);
    var tag = el.tagName.toLowerCase();
    if (tag === 'img' || (tag === 'input' && (el.type || '').toLowerCase() === 'image')) {
      var alt = (el.getAttribute('alt') || '').trim();
      if (alt) return alt.slice(0, 80);
    }
    if (tag === 'input' && ['button', 'submit', 'reset'].indexOf((el.type || '').toLowerCase()) >= 0) {
      var value = (el.value || el.getAttribute('value') || '').trim();
      if (value) return value.slice(0, 80);
    }
    var title = el.getAttribute('title');
    if (title) return title;
    var contentNamed = tag === 'button' || tag === 'a' || tag === 'summary' ||
      ['button', 'link', 'menuitem', 'option', 'tab'].indexOf(el.getAttribute('role')) >= 0;
    if (contentNamed) {
      var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (text) return text.slice(0, 80);
    }
    var placeholder = el.getAttribute('placeholder');
    if (placeholder) return '[placeholder=' + placeholder.slice(0, 60) + ']';
    var name = el.getAttribute('name');
    if (name) return '[name=' + name + ']';
    return '<' + el.tagName.toLowerCase() + '>';
  }

  function isElementVisible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    return true;
  }

  function scanKeyboardAccessibility(excludeContainerSelector) {
    var excludeContainer = excludeContainerSelector ? document.querySelector(excludeContainerSelector) : null;

    function isInExcludedContainer(el) {
      return excludeContainer ? excludeContainer.contains(el) : false;
    }

    // Focusable elements
    var allFocusable = Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter(function (el) { return !isInExcludedContainer(el) && isElementVisible(el); });

    // Tab order: positive tabindex first (in order), then DOM order with tabindex 0 or attribute absent
    var withPositive = allFocusable.filter(function (el) { return parseInt(el.getAttribute('tabindex') || '0', 10) > 0; });
    var withZeroOrNone = allFocusable.filter(function (el) { return parseInt(el.getAttribute('tabindex') || '0', 10) <= 0; });
    withPositive.sort(function (a, b) {
      return parseInt(a.getAttribute('tabindex'), 10) - parseInt(b.getAttribute('tabindex'), 10);
    });
    var orderedFocusable = withPositive.concat(withZeroOrNone);

    // Suspicious "fake buttons": div/span with cursor:pointer that aren't keyboard-accessible
    var allClickyDivs = Array.from(document.querySelectorAll('div, span, [onclick], [role="button"], [role="link"], [role="menuitem"]'));
    var suspicious = allClickyDivs.filter(function (el) {
      if (isInExcludedContainer(el) || !isElementVisible(el)) return false;
      var style = window.getComputedStyle(el);
      var interactiveRole = ['button', 'link', 'menuitem'].indexOf(el.getAttribute('role')) >= 0;
      if (style.cursor !== 'pointer' && !el.hasAttribute('onclick') && !interactiveRole) return false;
      if (el.tabIndex >= 0) return false;
      if (el.matches('a[href], button, input, select, textarea, summary')) return false;
      // Skip if a parent is a button/link (probably decorative inside)
      var parent = el.parentElement;
      while (parent && parent !== document.body) {
        if (parent.matches('a, button, [role="button"]')) return false;
        parent = parent.parentElement;
      }
      return true;
    });

    // Positive tabindex (anti-pattern: breaks natural tab order)
    var positiveTabindex = withPositive;

    // Missing accessible name on focusable elements
    var noLabel = orderedFocusable.filter(function (el) {
      var label = getElementLabel(el);
      return !label || label.startsWith('<') || label.startsWith('[placeholder=') || label.startsWith('[name=');
    });

    return {
      total: orderedFocusable.length,
      orderedFocusable: orderedFocusable,
      suspicious: suspicious,
      positiveTabindex: positiveTabindex,
      noLabel: noLabel,
    };
  }

  // Render numbered overlay badges for each focusable element. Returns a
  // cleanup function that removes the overlays.
  function renderTabOrderOverlay(orderedFocusable) {
    var overlayContainer = document.createElement('div');
    overlayContainer.id = 'alloflow-a11y-tab-order-overlay';
    overlayContainer.setAttribute('aria-hidden', 'true');
    overlayContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:55;';
    document.body.appendChild(overlayContainer);

    function position() {
      overlayContainer.innerHTML = '';
      orderedFocusable.forEach(function (el, i) {
        var rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;
        var badge = document.createElement('div');
        badge.style.cssText = [
          'position:absolute',
          'top:' + (rect.top + window.scrollY - 12) + 'px',
          'left:' + (rect.left + window.scrollX - 12) + 'px',
          'min-width:24px',
          'height:24px',
          'padding:0 6px',
          'background:#dc2626',
          'color:#ffffff',
          'border:2px solid #ffffff',
          'border-radius:12px',
          'font:bold 12px system-ui, sans-serif',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'box-shadow:0 2px 6px rgba(0,0,0,0.3)',
          'pointer-events:none',
        ].join(';');
        badge.textContent = String(i + 1);
        overlayContainer.appendChild(badge);

        var outline = document.createElement('div');
        outline.style.cssText = [
          'position:absolute',
          'top:' + (rect.top + window.scrollY - 2) + 'px',
          'left:' + (rect.left + window.scrollX - 2) + 'px',
          'width:' + (rect.width + 4) + 'px',
          'height:' + (rect.height + 4) + 'px',
          'border:2px solid #dc2626',
          'border-radius:4px',
          'pointer-events:none',
          'opacity:0.5',
        ].join(';');
        overlayContainer.appendChild(outline);
      });
    }

    position();
    var resizeListener = function () { position(); };
    window.addEventListener('scroll', resizeListener, true);
    window.addEventListener('resize', resizeListener);

    return function cleanup() {
      window.removeEventListener('scroll', resizeListener, true);
      window.removeEventListener('resize', resizeListener);
      if (overlayContainer.parentNode) overlayContainer.parentNode.removeChild(overlayContainer);
    };
  }

  function KeyboardTab(props) {
    var addToast = props.addToast;
    var tr = makeTr(props.t);

    var scanResult$ = useState(null);
    var scanResult = scanResult$[0], setScanResult = scanResult$[1];

    var showOverlay$ = useState(false);
    var showOverlay = showOverlay$[0], setShowOverlay = showOverlay$[1];

    var cleanupRef = useRef(null);

    // Cleanup overlay when component unmounts or showOverlay flips off
    useEffect(function () {
      return function () {
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
      };
    }, []);

    useEffect(function () {
      if (showOverlay && scanResult && scanResult.orderedFocusable) {
        cleanupRef.current = renderTabOrderOverlay(scanResult.orderedFocusable);
      } else if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      return function () {
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
      };
    }, [showOverlay, scanResult]);

    function handleScan() {
      try {
        // Exclude the lab modal itself from the scan so we audit the
        // underlying app surface, not our own UI.
        var result = scanKeyboardAccessibility(LAB_EXCLUDE_SELECTOR);
        setScanResult(result);
        var issueCount = result.suspicious.length + result.positiveTabindex.length + result.noLabel.length;
        addToast && addToast(
          tr('a11y_lab.keyboard.scan_result_prefix', 'Keyboard scan: ') + result.total +
          tr('a11y_lab.keyboard.scan_result_middle', ' focusable elements, ') + issueCount +
          tr('a11y_lab.keyboard.scan_result_suffix', ' issues'),
          'info'
        );
      } catch (err) {
        addToast && addToast(tr('a11y_lab.keyboard.scan_failed', 'Keyboard scan failed: ') + (err && err.message), 'error');
      }
    }

    function handleFocusElement(el) {
      try {
        el.focus();
        el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
      } catch (err) { /* ignore */ }
    }

    return e('div', { className: 'flex flex-col gap-4' },
      e('div', null,
        e('h3', { className: 'font-bold text-lg text-slate-800' }, tr('a11y_lab.keyboard.heading', 'Keyboard accessibility audit')),
        e('p', { className: 'text-sm text-slate-600 mt-1' },
          tr('a11y_lab.keyboard.description', 'Scan the underlying lesson view for keyboard-accessible elements. Identifies tab order, "fake buttons" (divs with cursor:pointer that aren\'t keyboard-reachable), positive tabindex anti-patterns, and elements missing accessible names.'))
      ),

      // Action buttons
      e('div', { className: 'flex gap-2 flex-wrap' },
        e('button', {
          onClick: handleScan,
          className: 'px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700',
        }, scanResult ? tr('a11y_lab.keyboard.rescan', 'Re-scan') : tr('a11y_lab.keyboard.run_scan', '🔍 Run keyboard scan')),
        scanResult && e('button', {
          onClick: function () { setShowOverlay(!showOverlay); },
          className: 'px-4 py-2 text-sm font-semibold border border-indigo-600 text-indigo-700 rounded hover:bg-indigo-50',
        }, showOverlay ? tr('a11y_lab.keyboard.hide_overlay', '🔢 Hide tab-order overlay') : tr('a11y_lab.keyboard.show_overlay', '🔢 Show tab-order overlay'))
      ),

      showOverlay && e('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900' },
        tr('a11y_lab.keyboard.overlay_active', 'Tab-order overlay is active. Numbered red badges show the tab sequence on the page behind this lab. Close the lab or click the toggle above to hide.')
      ),

      !scanResult && e('div', { className: 'p-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600' },
        tr('a11y_lab.keyboard.idle', 'Click "Run keyboard scan" to audit the current view. The lab modal itself is excluded from the scan; what gets audited is the underlying app surface (the lesson, sidebar, controls, etc. behind the lab).')
      ),

      scanResult && e('div', { className: 'flex flex-col gap-3' },
        // Summary
        e('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
          e('div', { className: 'p-3 bg-slate-50 border border-slate-200 rounded text-center' },
            e('div', { className: 'text-2xl font-bold text-slate-800' }, scanResult.total),
            e('div', { className: 'text-xs text-slate-600' }, tr('a11y_lab.keyboard.summary_focusable', 'Focusable elements'))
          ),
          e('div', {
            className: 'p-3 border rounded text-center ' + (scanResult.suspicious.length > 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300')
          },
            e('div', { className: 'text-2xl font-bold ' + (scanResult.suspicious.length > 0 ? 'text-amber-800' : 'text-emerald-800') }, scanResult.suspicious.length),
            e('div', { className: 'text-xs ' + (scanResult.suspicious.length > 0 ? 'text-amber-700' : 'text-emerald-700') }, tr('a11y_lab.keyboard.summary_fakes', 'Fake buttons'))
          ),
          e('div', {
            className: 'p-3 border rounded text-center ' + (scanResult.positiveTabindex.length > 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300')
          },
            e('div', { className: 'text-2xl font-bold ' + (scanResult.positiveTabindex.length > 0 ? 'text-amber-800' : 'text-emerald-800') }, scanResult.positiveTabindex.length),
            e('div', { className: 'text-xs ' + (scanResult.positiveTabindex.length > 0 ? 'text-amber-700' : 'text-emerald-700') }, tr('a11y_lab.keyboard.summary_pos_tabindex', 'Positive tabindex'))
          ),
          e('div', {
            className: 'p-3 border rounded text-center ' + (scanResult.noLabel.length > 0 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300')
          },
            e('div', { className: 'text-2xl font-bold ' + (scanResult.noLabel.length > 0 ? 'text-rose-800' : 'text-emerald-800') }, scanResult.noLabel.length),
            e('div', { className: 'text-xs ' + (scanResult.noLabel.length > 0 ? 'text-rose-700' : 'text-emerald-700') }, tr('a11y_lab.keyboard.summary_no_label', 'Missing names'))
          )
        ),

        // Tab-order list
        scanResult.total > 0 && e('details', { className: 'bg-slate-50 border border-slate-200 rounded p-3' },
          e('summary', { className: 'cursor-pointer font-semibold text-sm text-slate-800' },
            tr('a11y_lab.keyboard.tab_order_heading', 'Tab order') + ' (' + scanResult.total + ')'),
          e('ol', { className: 'mt-2 max-h-64 overflow-y-auto pl-6 text-xs space-y-1' },
            scanResult.orderedFocusable.map(function (el, i) {
              return e('li', { key: i, className: 'text-slate-700' },
                e('button', {
                  onClick: function () { handleFocusElement(el); },
                  className: 'text-left hover:text-indigo-700 hover:underline',
                }, '<' + el.tagName.toLowerCase() + '> ', e('span', { className: 'text-slate-500' }, getElementLabel(el)))
              );
            })
          )
        ),

        // Issues
        scanResult.suspicious.length > 0 && e('details', { className: 'bg-amber-50 border border-amber-300 rounded p-3' },
          e('summary', { className: 'cursor-pointer font-semibold text-sm text-amber-900' },
            tr('a11y_lab.keyboard.fakes_heading', '⚠ Fake buttons') + ' (' + scanResult.suspicious.length + ')'),
          e('p', { className: 'text-xs text-amber-800 mt-1' },
            tr('a11y_lab.keyboard.fakes_help', 'Elements with cursor:pointer that look clickable but cannot be reached by keyboard. Common cause: a div with onClick instead of a real <button>. Fix: convert to <button>, OR add tabindex="0" + role="button" + keyboard event handlers.')),
          e('ul', { className: 'mt-2 max-h-48 overflow-y-auto pl-5 text-xs list-disc space-y-1' },
            scanResult.suspicious.slice(0, 30).map(function (el, i) {
              return e('li', { key: i, className: 'text-amber-900' },
                e('button', {
                  onClick: function () { handleFocusElement(el); },
                  className: 'text-left hover:underline',
                }, '<' + el.tagName.toLowerCase() + '> ', getElementLabel(el).slice(0, 80))
              );
            })
          )
        ),

        scanResult.positiveTabindex.length > 0 && e('details', { className: 'bg-amber-50 border border-amber-300 rounded p-3' },
          e('summary', { className: 'cursor-pointer font-semibold text-sm text-amber-900' },
            tr('a11y_lab.keyboard.pos_heading', '⚠ Positive tabindex') + ' (' + scanResult.positiveTabindex.length + ')'),
          e('p', { className: 'text-xs text-amber-800 mt-1' },
            tr('a11y_lab.keyboard.pos_help', 'Elements with tabindex > 0 break natural document tab order and confuse keyboard users. Fix: use tabindex="0" (default order) or rely on default focusability for buttons/links.'))
        ),

        scanResult.noLabel.length > 0 && e('details', { className: 'bg-rose-50 border border-rose-300 rounded p-3' },
          e('summary', { className: 'cursor-pointer font-semibold text-sm text-rose-900' },
            tr('a11y_lab.keyboard.no_label_heading', '🔴 Missing accessible names') + ' (' + scanResult.noLabel.length + ')'),
          e('p', { className: 'text-xs text-rose-800 mt-1' },
            tr('a11y_lab.keyboard.no_label_help', 'Focusable elements without text, aria-label, aria-labelledby, or title. Screen reader users would hear only the tag name, e.g., "button" with no context. Fix: add aria-label or visible text.')),
          e('ul', { className: 'mt-2 max-h-48 overflow-y-auto pl-5 text-xs list-disc space-y-1' },
            scanResult.noLabel.slice(0, 30).map(function (el, i) {
              return e('li', { key: i, className: 'text-rose-900' },
                e('button', {
                  onClick: function () { handleFocusElement(el); },
                  className: 'text-left hover:underline',
                }, '<' + el.tagName.toLowerCase() + '>')
              );
            })
          )
        ),

        // Tip
        e('div', { className: 'text-xs text-slate-500 italic mt-2' },
          tr('a11y_lab.keyboard.tip', 'Tip: navigate the page behind the lab using only Tab, Shift+Tab, Enter, and Esc. Click on any element name in the lists above to focus it (the page will scroll if needed).'))
      )
    );
  }

  // ----- Phase 3: Live in-app a11y audit (axe-core) --------------------------

  // Prefer the same-origin vendored build so audits work offline and under a
  // restrictive content-security policy. The CDN remains a fallback for
  // deployments that do not yet publish /vendor/axe-core/axe.min.js.
  var AXE_LOCAL_URLS = ['/vendor/axe-core/axe.min.js', 'vendor/axe-core/axe.min.js'];
  var AXE_CDN_URL = 'https://cdn.jsdelivr.net/npm/axe-core@4.12.1/axe.min.js';
  var axeLoadPromise = null;

  function loadAxeScript(url) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.setAttribute('data-alloflow-axe-source', url);
      if (/^https?:/i.test(url)) script.crossOrigin = 'anonymous';
      script.onload = function () {
        if (window.axe && typeof window.axe.run === 'function') resolve(window.axe);
        else reject(new Error('axe-core loaded but window.axe is missing'));
      };
      script.onerror = function () {
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error('Failed to load axe-core from ' + url));
      };
      document.head.appendChild(script);
    });
  }

  function loadAxeCore() {
    if (window.axe && typeof window.axe.run === 'function') return Promise.resolve(window.axe);
    if (axeLoadPromise) return axeLoadPromise;
    var candidates = AXE_LOCAL_URLS.concat([AXE_CDN_URL]);
    axeLoadPromise = candidates.reduce(function (chain, url) {
      return chain.catch(function () {
        if (window.axe && typeof window.axe.run === 'function') return window.axe;
        return loadAxeScript(url);
      });
    }, Promise.reject(new Error('axe-core not loaded'))).catch(function (err) {
      axeLoadPromise = null;
      throw err;
    });
    return axeLoadPromise;
  }

  // Teacher-friendly translations for the most common axe rule IDs.
  // For unmapped rules we fall back to axe's `help` field at render time.
  var TEACHER_FRIENDLY_RULES = {
    'color-contrast':              'Some text on this page does not have enough contrast against its background. Students with low vision (about 1 in 12 people) would have trouble reading it.',
    'color-contrast-enhanced':     'Some text does not meet the higher AAA contrast standard. AA-level students may still read it; AAA is the stricter target.',
    'image-alt':                   'Some images do not have alt text. Students who use screen readers (blind or low-vision students) will hear nothing or just a filename when this image appears.',
    'input-image-alt':             'An image button is missing alt text. Screen reader users will not know what the button does.',
    'button-name':                 'A button has no name a screen reader can announce. The student would hear only "button" with no context.',
    'link-name':                   'A link has no text or aria-label. Screen reader users will not know where it leads.',
    'label':                       'A form input has no label. Students using screen readers or speech recognition will not know what to enter.',
    'aria-required-attr':          'An element has an ARIA role but is missing required attributes. Screen reader users may get confusing or no information.',
    'aria-roles':                  'An element uses an ARIA role that is not valid. Screen readers may ignore it or behave unexpectedly.',
    'aria-valid-attr':             'An element has an invalid ARIA attribute. The accessibility hint is being ignored.',
    'aria-valid-attr-value':       'An ARIA attribute has an invalid value. The accessibility hint is being ignored.',
    'duplicate-id':                'Two elements share the same id. Screen readers and labels can attach to the wrong one.',
    'duplicate-id-aria':           'Duplicate IDs are interfering with ARIA labeling.',
    'document-title':              'The page has no <title>. Screen readers and tab listings will not identify it.',
    'html-has-lang':               'The page is missing a lang attribute. Screen readers will not know which pronunciation to use.',
    'html-lang-valid':             'The page lang attribute is not a valid language code.',
    'landmark-one-main':           'The page is missing a <main> landmark. Screen reader users have a harder time skipping past navigation to the main content.',
    'region':                      'Some content is not contained in a landmark (header, main, nav, footer). Screen reader users may struggle to navigate.',
    'heading-order':               'Headings on this page skip levels (e.g., h1 jumping to h3). Screen reader navigation by heading levels gets confusing.',
    'page-has-heading-one':        'The page has no <h1> heading. Screen reader users lose orientation about the page topic.',
    'list':                        'A list element (ul/ol) contains items that are not <li>. Screen readers misreport the structure.',
    'listitem':                    'A list item is not inside a list. Screen readers will not announce list semantics.',
    'frame-title':                 'An iframe is missing a title attribute. Screen reader users will not know what is inside it.',
    'meta-viewport':               'The viewport meta tag prevents zooming. Students who need to zoom in will be blocked from doing so.',
    'tabindex':                    'An element has tabindex greater than 0. This breaks natural keyboard tab order.',
    'scrollable-region-focusable': 'A scrollable region cannot be focused with the keyboard. Keyboard-only users cannot scroll it.',
    'autocomplete-valid':          'A form field has an invalid autocomplete value. Some assistive tech relies on these to fill in fields automatically.',
    'role-img-alt':                'An element with role="img" has no accessible name. Screen reader users will hear nothing.',
    'svg-img-alt':                 'An SVG used as an image has no accessible name.',
  };

  var IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'];
  var IMPACT_STYLES = {
    critical: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', label: 'Critical' },
    serious:  { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', label: 'Serious'  },
    moderate: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', label: 'Moderate' },
    minor:    { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569', label: 'Minor'    },
  };

  function teacherFriendly(violation, tr) {
    var english = TEACHER_FRIENDLY_RULES[violation.id];
    if (english) {
      // Convert axe rule id (e.g., 'color-contrast') to a translation key
      // segment ('color_contrast') so translators can localize each one.
      var keySegment = violation.id.replace(/-/g, '_');
      if (tr) return tr('a11y_lab.audit.rules.' + keySegment, english);
      return english;
    }
    return violation.help || violation.description || violation.id;
  }


  function persistAutomatedAuditForReview(reviewSession, axeResult, axeVersion) {
    if (!reviewSession || !reviewSession.itemId || !axeResult) return null;
    var item = {
      id: reviewSession.itemId,
      type: reviewSession.artifactType || '',
      title: reviewSession.artifactTitle || '',
    };
    var key = reviewItemKey(item);
    var store = loadReviewScorecards();
    var card = normalizeReviewScorecard(store[key], item);
    var violations = Array.isArray(axeResult.violations) ? axeResult.violations : [];
    var automated = {
      runAt: new Date().toISOString(),
      engine: 'axe-core',
      engineVersion: String(axeVersion || 'unknown'),
      standard: 'WCAG 2.2 A/AA',
      violationRules: violations.length,
      affectedElements: violations.reduce(function (sum, violation) { return sum + (Array.isArray(violation.nodes) ? violation.nodes.length : 0); }, 0),
      passedRules: Array.isArray(axeResult.passes) ? axeResult.passes.length : 0,
      needsReview: Array.isArray(axeResult.incomplete) ? axeResult.incomplete.length : 0,
      ruleIds: violations.map(function (violation) { return violation && violation.id; }).filter(Boolean).slice(0, 100),
    };
    var next = Object.assign({}, card, {
      automated: automated,
      startedAt: card.startedAt || reviewSession.startedAt || automated.runAt,
      updatedAt: automated.runAt,
    });
    store[key] = next;
    persistReviewScorecards(store);
    return next;
  }
  function AuditTab(props) {
    var addToast = props.addToast;
    var tr = makeTr(props.t);

    var status$ = useState('idle'); // idle | loading | running | done | error
    var status = status$[0], setStatus = status$[1];
    var result$ = useState(null);
    var result = result$[0], setResult = result$[1];
    var error$ = useState(null);
    var error = error$[0], setError = error$[1];
    var lastRun$ = useState(null);
    var lastRun = lastRun$[0], setLastRun = lastRun$[1];

    function handleRunAudit() {
      setStatus('loading');
      setError(null);
      loadAxeCore()
        .then(function (axe) {
          setStatus('running');
          return axe.run(
            { exclude: [[LAB_EXCLUDE_SELECTOR]] },
            {
              runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
              resultTypes: ['violations', 'passes', 'incomplete'],
            }
          );
        })
        .then(function (axeResult) {
          setResult(axeResult);
          setLastRun(new Date());
          setStatus('done');
          persistAutomatedAuditForReview(props.reviewSession, axeResult, window.axe && window.axe.version);
          var totalNodes = (axeResult.violations || []).reduce(function (sum, v) {
            return sum + (v.nodes ? v.nodes.length : 0);
          }, 0);
          addToast && addToast(
            tr('a11y_lab.audit.complete_prefix', 'Audit complete: ') + (axeResult.violations || []).length +
            tr('a11y_lab.audit.complete_violations_middle', ' violations across ') + totalNodes +
            tr('a11y_lab.audit.complete_elements_middle', ' elements; ') + (axeResult.passes || []).length +
            tr('a11y_lab.audit.complete_passes_suffix', ' rules passed.'),
            (axeResult.violations || []).length === 0 ? 'success' : 'info'
          );
        })
        .catch(function (err) {
          setError(err && err.message ? err.message : String(err));
          setStatus('error');
          addToast && addToast(tr('a11y_lab.audit.error_toast_prefix', 'Audit failed: ') + (err && err.message ? err.message : tr('a11y_lab.audit.unknown_error', 'unknown error')), 'error');
        });
    }

    function handleFocusFirstNode(violation) {
      try {
        var firstNode = violation.nodes && violation.nodes[0];
        if (!firstNode) return;
        var selector = firstNode.target && firstNode.target[0];
        if (!selector) return;
        var el = document.querySelector(selector);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
          // Briefly highlight
          var origOutline = el.style.outline;
          var origOffset = el.style.outlineOffset;
          el.style.outline = '3px solid #dc2626';
          el.style.outlineOffset = '2px';
          setTimeout(function () {
            el.style.outline = origOutline;
            el.style.outlineOffset = origOffset;
          }, 2400);
        }
      } catch (err) { /* ignore */ }
    }

    var grouped = useMemo(function () {
      if (!result || !result.violations) return null;
      var byImpact = {};
      IMPACT_ORDER.forEach(function (imp) { byImpact[imp] = []; });
      result.violations.forEach(function (v) {
        var imp = v.impact || 'minor';
        if (!byImpact[imp]) byImpact[imp] = [];
        byImpact[imp].push(v);
      });
      return byImpact;
    }, [result]);

    return e('div', { className: 'flex flex-col gap-4' },
      e('div', null,
        e('h3', { className: 'font-bold text-lg text-slate-800' }, tr('a11y_lab.audit.heading', 'Live in-app accessibility audit')),
        e('p', { className: 'text-sm text-slate-600 mt-1' },
          tr('a11y_lab.audit.description_wcag22', 'Runs axe-core (industry-standard accessibility engine, used by browsers, the Deque team, and many enterprise audits) against the current view. Reports WCAG 2.2 A and AA violations in plain language framed by student impact. The lab modal itself is excluded.'))
      ),

      // Action button + status
      e('div', { className: 'flex gap-2 flex-wrap items-center' },
        e('button', {
          onClick: handleRunAudit,
          disabled: status === 'loading' || status === 'running',
          className: 'px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50',
        }, status === 'loading' ? tr('a11y_lab.audit.loading', 'Loading axe-core...') : status === 'running' ? tr('a11y_lab.audit.running', 'Running audit...') : (result ? tr('a11y_lab.audit.rerun', 'Re-run audit') : tr('a11y_lab.audit.run', '🔍 Run audit'))),
        lastRun && e('span', { className: 'text-xs text-slate-500' },
          tr('a11y_lab.audit.last_run_prefix', 'Last run: ') + lastRun.toLocaleTimeString())
      ),

      status === 'error' && e('div', { className: 'p-3 bg-rose-50 border border-rose-300 rounded text-sm text-rose-900' },
        tr('a11y_lab.audit.error_prefix', 'Audit failed: ') + error + tr('a11y_lab.audit.error_suffix_bundled', '. The bundled audit engine and CDN fallback were both unavailable; check the deployment assets or network connection and try again.')
      ),

      !result && status !== 'error' && status !== 'loading' && status !== 'running' && e('div', { className: 'p-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600' },
        tr('a11y_lab.audit.idle_wcag22', 'Click "Run audit" to scan the current view for WCAG 2.2 A and AA violations. The Lab first tries the bundled same-origin axe-core asset and falls back to the CDN only on older deployments.')
      ),

      result && e('div', { className: 'flex flex-col gap-3' },
        // Top-level summary
        e('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
          e('div', {
            className: 'p-3 border rounded text-center ' + (result.violations.length === 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300')
          },
            e('div', { className: 'text-2xl font-bold ' + (result.violations.length === 0 ? 'text-emerald-800' : 'text-rose-800') }, result.violations.length),
            e('div', { className: 'text-xs ' + (result.violations.length === 0 ? 'text-emerald-700' : 'text-rose-700') }, tr('a11y_lab.audit.summary_violations', 'Violations'))
          ),
          e('div', { className: 'p-3 bg-emerald-50 border border-emerald-300 rounded text-center' },
            e('div', { className: 'text-2xl font-bold text-emerald-800' }, (result.passes || []).length),
            e('div', { className: 'text-xs text-emerald-700' }, tr('a11y_lab.audit.summary_passes', 'Rules passed'))
          ),
          e('div', { className: 'p-3 bg-blue-50 border border-blue-300 rounded text-center' },
            e('div', { className: 'text-2xl font-bold text-blue-800' }, (result.incomplete || []).length),
            e('div', { className: 'text-xs text-blue-700' }, tr('a11y_lab.audit.summary_review', 'Need review'))
          ),
          e('div', { className: 'p-3 bg-slate-50 border border-slate-300 rounded text-center' },
            e('div', { className: 'text-2xl font-bold text-slate-800' },
              (result.violations || []).reduce(function (sum, v) { return sum + (v.nodes ? v.nodes.length : 0); }, 0)),
            e('div', { className: 'text-xs text-slate-700' }, tr('a11y_lab.audit.summary_affected', 'Affected elements'))
          )
        ),

        result.violations.length === 0 && e('div', { className: 'p-4 bg-emerald-50 border border-emerald-300 rounded text-sm text-emerald-900 text-center' },
          tr('a11y_lab.audit.no_violations_wcag22', '✅ No WCAG 2.2 A/AA violations found in the current view by axe-core. (Note: automated audits catch ~30-50% of real accessibility issues. Combine with the keyboard tour, semantic outline, real assistive-technology testing, and manual review.)')
        ),

        // Violations grouped by impact
        result.violations.length > 0 && IMPACT_ORDER.map(function (impact) {
          var rules = (grouped && grouped[impact]) || [];
          if (rules.length === 0) return null;
          var styles = IMPACT_STYLES[impact];
          return e('details', {
            key: impact,
            open: impact === 'critical' || impact === 'serious',
            className: 'rounded p-3 border',
            style: { backgroundColor: styles.bg, borderColor: styles.border },
          },
            e('summary', {
              className: 'cursor-pointer font-semibold text-sm flex items-center gap-2',
              style: { color: styles.text },
            },
              (impact === 'critical' ? tr('a11y_lab.audit.impact.critical_label', 'Critical') :
               impact === 'serious'  ? tr('a11y_lab.audit.impact.serious_label',  'Serious')  :
               impact === 'moderate' ? tr('a11y_lab.audit.impact.moderate_label', 'Moderate') :
                                       tr('a11y_lab.audit.impact.minor_label',    'Minor')) +
              ' (' + rules.length + ' ' + (rules.length === 1 ? tr('a11y_lab.audit.rule_singular', 'rule') : tr('a11y_lab.audit.rule_plural', 'rules')) + ')',
              e('span', {
                className: 'text-xs font-normal opacity-75',
              }, impact === 'critical' ? tr('a11y_lab.audit.impact.critical_desc', 'Blocks access for some users') :
                  impact === 'serious'  ? tr('a11y_lab.audit.impact.serious_desc',  'Significantly degrades the experience') :
                  impact === 'moderate' ? tr('a11y_lab.audit.impact.moderate_desc', 'Causes friction or confusion') :
                                          tr('a11y_lab.audit.impact.minor_desc',    'Minor improvement'))
            ),
            e('div', { className: 'mt-3 flex flex-col gap-2' },
              rules.map(function (v, i) {
                return e('div', {
                  key: v.id,
                  className: 'p-3 bg-white border rounded',
                  style: { borderColor: styles.border },
                },
                  e('div', { className: 'flex items-start justify-between gap-2 mb-1' },
                    e('div', { className: 'font-semibold text-sm', style: { color: styles.text } },
                      v.id, ' ',
                      e('span', { className: 'text-xs font-normal text-slate-500' },
                        '(' + v.nodes.length + ' ' + (v.nodes.length === 1 ? tr('a11y_lab.audit.element_singular', 'element') : tr('a11y_lab.audit.element_plural', 'elements')) + ')')
                    ),
                    e('div', { className: 'flex gap-1' },
                      v.nodes.length > 0 && e('button', {
                        onClick: function () { handleFocusFirstNode(v); },
                        className: 'text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-50',
                      }, tr('a11y_lab.audit.show_me', 'Show me')),
                      v.helpUrl && e('a', {
                        href: v.helpUrl,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        className: 'text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-50',
                      }, tr('a11y_lab.audit.learn_more', 'Learn more ↗'))
                    )
                  ),
                  e('p', { className: 'text-xs text-slate-700' }, teacherFriendly(v, tr)),
                  v.nodes.length > 1 && e('details', { className: 'mt-2' },
                    e('summary', { className: 'text-xs text-slate-500 cursor-pointer hover:text-slate-700' },
                      tr('a11y_lab.audit.affected_heading', 'Affected elements') + ' (' + v.nodes.length + ')'),
                    e('ul', { className: 'mt-1 max-h-40 overflow-y-auto pl-5 text-xs list-disc text-slate-600 space-y-0.5' },
                      v.nodes.slice(0, 50).map(function (node, j) {
                        return e('li', { key: j, className: 'font-mono break-all' },
                          (node.target || []).join(' '));
                      })
                    )
                  )
                );
              })
            )
          );
        }),

        // Incomplete rules (need manual review)
        (result.incomplete || []).length > 0 && e('details', {
          className: 'rounded p-3 border bg-blue-50 border-blue-300',
        },
          e('summary', {
            className: 'cursor-pointer font-semibold text-sm text-blue-900',
          },
            tr('a11y_lab.audit.incomplete_heading', 'Needs manual review') +
            ' (' + result.incomplete.length + ')'
          ),
          e('p', { className: 'text-xs text-blue-800 mt-1 mb-2' },
            tr('a11y_lab.audit.incomplete_help', 'These rules could not be automatically verified by axe-core. They commonly involve things like color contrast on gradient backgrounds, scrolling regions, or color meaning. A human needs to look and decide.')),
          e('div', { className: 'flex flex-col gap-2' },
            result.incomplete.map(function (v) {
              return e('div', {
                key: v.id,
                className: 'p-3 bg-white border border-blue-300 rounded',
              },
                e('div', { className: 'flex items-start justify-between gap-2 mb-1' },
                  e('div', { className: 'font-semibold text-sm text-blue-900' },
                    v.id, ' ',
                    e('span', { className: 'text-xs font-normal text-slate-500' },
                      '(' + (v.nodes || []).length + ' ' +
                      ((v.nodes || []).length === 1 ? tr('a11y_lab.audit.element_singular', 'element') : tr('a11y_lab.audit.element_plural', 'elements')) + ')')
                  ),
                  e('div', { className: 'flex gap-1' },
                    (v.nodes || []).length > 0 && e('button', {
                      onClick: function () { handleFocusFirstNode(v); },
                      className: 'text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-50',
                    }, tr('a11y_lab.audit.show_me', 'Show me')),
                    v.helpUrl && e('a', {
                      href: v.helpUrl,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      className: 'text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-50',
                    }, tr('a11y_lab.audit.learn_more', 'Learn more ↗'))
                  )
                ),
                e('p', { className: 'text-xs text-slate-700' }, teacherFriendly(v, tr))
              );
            })
          )
        ),

        // Tip
        e('div', { className: 'text-xs text-slate-500 italic mt-2' },
          tr('a11y_lab.audit.tip_semantic', 'Tip: critical and serious issues are open by default. Click "Show me" on any rule to highlight the first affected element. Automated checks are only one layer; combine them with the keyboard tour, semantic outline, zoom/reflow checks, and manual assistive-technology testing.'))
      )
    );
  }

  // ----- Phase 4: Semantic announcement outline -------------------------------

  // Map an HTML tag (or role attr) to the role a screen reader would announce.
  // Not exhaustive, but covers the common cases. Falls back to null for
  // semantically-neutral tags (div, span) which we then skip in the walkthrough.
  function getScreenReaderRole(el) {
    var explicit = el.getAttribute('role');
    if (explicit) {
      // Friendlier label for some common ARIA roles
      var aliases = { 'button': 'button', 'link': 'link', 'navigation': 'navigation', 'main': 'main', 'banner': 'banner', 'contentinfo': 'content info', 'complementary': 'complementary', 'region': 'region', 'tab': 'tab', 'tabpanel': 'tab panel', 'tablist': 'tab list', 'dialog': 'dialog', 'alert': 'alert', 'menu': 'menu', 'menuitem': 'menu item', 'progressbar': 'progress bar', 'slider': 'slider' };
      return aliases[explicit] || explicit;
    }
    var tag = el.tagName.toLowerCase();
    if (tag === 'a') return el.hasAttribute('href') ? 'link' : null;
    if (tag === 'button') return 'button';
    if (tag === 'select') return 'combo box';
    if (tag === 'textarea') return 'edit, multi-line';
    if (tag === 'input') {
      var type = (el.type || 'text').toLowerCase();
      var inputRoles = { text: 'edit', email: 'edit, email', password: 'edit, password', search: 'search field', tel: 'edit, telephone', url: 'edit, URL', number: 'spin button', checkbox: 'checkbox', radio: 'radio button', submit: 'button', reset: 'button', button: 'button', range: 'slider', date: 'edit, date', time: 'edit, time' };
      return inputRoles[type] || 'edit';
    }
    if (tag === 'img') {
      var alt = el.getAttribute('alt');
      if (alt === '') return null; // decorative
      return 'graphic';
    }
    if (tag === 'h1') return 'heading level 1';
    if (tag === 'h2') return 'heading level 2';
    if (tag === 'h3') return 'heading level 3';
    if (tag === 'h4') return 'heading level 4';
    if (tag === 'h5') return 'heading level 5';
    if (tag === 'h6') return 'heading level 6';
    if (tag === 'nav') return 'navigation';
    if (tag === 'main') return 'main';
    if (tag === 'header') return 'banner';
    if (tag === 'footer') return 'content info';
    if (tag === 'aside') return 'complementary';
    if (tag === 'section') return el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ? 'region' : null;
    if (tag === 'article') return 'article';
    if (tag === 'table') return 'table';
    if (tag === 'ul' || tag === 'ol') return 'list';
    if (tag === 'li') return 'list item';
    if (tag === 'details') return 'group';
    if (tag === 'summary') return 'button';
    if (tag === 'figure') return 'figure';
    if (tag === 'fieldset') return 'group';
    return null;
  }

  function getScreenReaderName(el) {
    // Follow the high-value portion of accessible-name precedence:
    // aria-labelledby, aria-label, native labels/attributes, then content only
    // for roles that are actually allowed to derive their name from content.
    var labelledByText = referencedText(el, 'aria-labelledby');
    if (labelledByText) return labelledByText.slice(0, 200);
    var ariaLabel = (el.getAttribute('aria-label') || '').trim();
    if (ariaLabel) return ariaLabel.slice(0, 200);
    var tag = el.tagName.toLowerCase();
    var nativeLabel = associatedLabelText(el);
    if (nativeLabel) return nativeLabel.slice(0, 200);
    if (tag === 'img' || (tag === 'input' && (el.type || '').toLowerCase() === 'image')) {
      return (el.getAttribute('alt') || '').trim().slice(0, 200);
    }
    if (tag === 'table') {
      var caption = el.querySelector(':scope > caption');
      if (caption) return (caption.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200);
    }
    if (tag === 'input' && ['button', 'submit', 'reset'].indexOf((el.type || '').toLowerCase()) >= 0) {
      return (el.value || el.getAttribute('value') || '').trim().slice(0, 200);
    }
    var role = el.getAttribute('role');
    var nameFromContent = ['button', 'a', 'summary', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'dt', 'dd', 'th', 'caption'].indexOf(tag) >= 0 ||
      ['button', 'link', 'menuitem', 'option', 'tab', 'heading', 'listitem', 'cell', 'columnheader', 'rowheader'].indexOf(role) >= 0;
    if (nameFromContent) {
      var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (text) return text.slice(0, 200);
    }
    var title = (el.getAttribute('title') || '').trim();
    if (title) return title.slice(0, 200);
    var placeholder = (el.getAttribute('placeholder') || '').trim();
    if (placeholder) return placeholder.slice(0, 180) + ' (placeholder fallback)';
    return '';
  }

  function getScreenReaderDescription(el) {
    var describedBy = referencedText(el, 'aria-describedby');
    if (describedBy) return describedBy.slice(0, 240);
    var ariaDescription = (el.getAttribute('aria-description') || '').trim();
    return ariaDescription ? ariaDescription.slice(0, 240) : '';
  }

  function getScreenReaderState(el) {
    var hidden = el.getAttribute('aria-hidden');
    if (hidden === 'true') return null; // skip aria-hidden elements entirely
    var states = [];
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') states.push('disabled');
    if (el.required || el.getAttribute('aria-required') === 'true') states.push('required');
    if (el.getAttribute('aria-busy') === 'true') states.push('busy');
    var invalid = el.getAttribute('aria-invalid');
    if (invalid === 'true') states.push('invalid');
    else if (invalid === 'grammar' || invalid === 'spelling') states.push('invalid, ' + invalid);
    var current = el.getAttribute('aria-current');
    if (current && current !== 'false') {
      states.push(current === 'true' ? 'current' : 'current ' + current);
    }
    if (el.type === 'checkbox') {
      if (el.indeterminate) states.push('partially checked');
      else if (el.checked) states.push('checked');
      else states.push('not checked');
    } else if (el.type === 'radio') {
      states.push(el.checked ? 'selected' : 'not selected');
    } else if (el.checked) {
      states.push('checked');
    } else {
      var ariaChecked = el.getAttribute('aria-checked');
      if (ariaChecked === 'mixed') states.push('partially checked');
      else if (ariaChecked === 'true') states.push('checked');
      else if (ariaChecked === 'false') states.push('not checked');
    }
    var tag = el.tagName.toLowerCase();
    var type = (el.type || '').toLowerCase();
    if (tag === 'select') {
      var selectedOption = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
      if (selectedOption) states.push('value ' + (selectedOption.textContent || selectedOption.value || '').trim());
    } else if ((tag === 'input' || tag === 'textarea') && ['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'password'].indexOf(type) < 0 && el.value) {
      states.push('value ' + String(el.value).slice(0, 120));
    }
    var valueText = el.getAttribute('aria-valuetext');
    var valueNow = el.getAttribute('aria-valuenow');
    if (valueText) states.push('value ' + valueText);
    else if (valueNow) states.push('value ' + valueNow);
    var expanded = el.getAttribute('aria-expanded');
    if (expanded === 'true') states.push('expanded');
    else if (expanded === 'false') states.push('collapsed');
    var pressed = el.getAttribute('aria-pressed');
    if (pressed === 'true') states.push('pressed');
    else if (pressed === 'false') states.push('not pressed');
    var selected = el.getAttribute('aria-selected');
    if (selected === 'true') states.push('selected');
    else if (selected === 'false' && el.getAttribute('role') === 'tab') states.push('not selected');
    return states.length > 0 ? states.join(', ') : '';
  }

  function composeAnnouncement(el) {
    var role = getScreenReaderRole(el);
    if (!role) return null;
    var state = getScreenReaderState(el);
    if (state === null) return null; // aria-hidden
    var name = getScreenReaderName(el);
    var description = getScreenReaderDescription(el);
    var parts = [];
    if (name) parts.push(name);
    parts.push(role);
    if (state) parts.push(state);
    if (description) parts.push('description: ' + description);
    return parts.join(', ');
  }

  function buildScreenReaderQueue(excludeContainerSelector) {
    var excludeContainer = excludeContainerSelector ? document.querySelector(excludeContainerSelector) : null;
    function inExcluded(el) { return excludeContainer ? excludeContainer.contains(el) : false; }

    // Collect semantic + interactive elements; document order matches reading order.
    var selector = [
      'h1, h2, h3, h4, h5, h6',
      'nav, main, header, footer, aside, article, table, ul, ol, li, details, summary, figure, fieldset',
      'section[aria-label], section[aria-labelledby]',
      '[role="region"], [role="navigation"], [role="main"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="dialog"], [role="alert"], [role="tablist"], [role="tab"], [role="tabpanel"]',
      'a[href]',
      'button',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[contenteditable]:not([contenteditable="false"])',
      'img[alt]:not([alt=""])',
      '[role="img"]',
    ].join(', ');

    var els = Array.from(document.querySelectorAll(selector)).filter(function (el) {
      if (inExcluded(el)) return false;
      if (!isElementVisible(el)) return false;
      // Skip elements inside an aria-hidden ancestor
      var ancestor = el.parentElement;
      while (ancestor && ancestor !== document.body) {
        if (ancestor.getAttribute('aria-hidden') === 'true' || ancestor.hasAttribute('inert')) return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    });

    // Deduplicate (an element might match multiple selectors via role + tag)
    var seen = new Set();
    els = els.filter(function (el) {
      if (seen.has(el)) return false;
      seen.add(el);
      return true;
    });

    return els.map(function (el, i) {
      var text = composeAnnouncement(el);
      var langHost = el.closest && el.closest('[lang]');
      var lang = langHost ? langHost.getAttribute('lang') : (document.documentElement.lang || 'en-US');
      return text ? { index: i, el: el, text: text, tag: el.tagName.toLowerCase(), lang: lang } : null;
    }).filter(Boolean);
  }

  // Highlight an element on the page with a colored outline. Returns a
  // cleanup function that restores the original outline.
  function highlightForScreenReader(el) {
    var origOutline = el.style.outline;
    var origOffset = el.style.outlineOffset;
    el.style.outline = '3px solid #f59e0b';
    el.style.outlineOffset = '2px';
    try { el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' }); } catch (_) {}
    return function unhighlight() {
      el.style.outline = origOutline;
      el.style.outlineOffset = origOffset;
    };
  }

  function ScreenReaderTab(props) {
    var addToast = props.addToast;
    var tr = makeTr(props.t);

    var queue$ = useState(null);
    var queue = queue$[0], setQueue = queue$[1];

    var playingIndex$ = useState(null);
    var playingIndex = playingIndex$[0], setPlayingIndex = playingIndex$[1];

    var rate$ = useState(1.0);
    var rate = rate$[0], setRate = rate$[1];

    // Refs let in-flight playback see the latest rate (mid-play slider
    // changes take effect on the next utterance) and let cleanup find the
    // current highlight + stop function without polluting `window`.
    var rateRef = useRef(rate);
    useEffect(function () { rateRef.current = rate; }, [rate]);
    var unhighlightRef = useRef(null);
    var stopRef = useRef(null);

    function clearHighlight() {
      if (unhighlightRef.current) {
        try { unhighlightRef.current(); } catch (_) {}
        unhighlightRef.current = null;
      }
    }

    // Stop any in-progress announcements and remove residual highlights when
    // the tab unmounts (covers closing the lab mid-playback).
    useEffect(function () {
      return function () {
        if (stopRef.current) {
          try { stopRef.current(); } catch (_) {}
          stopRef.current = null;
        }
        try {
          if (window.speechSynthesis) window.speechSynthesis.cancel();
        } catch (_) {}
        clearHighlight();
      };
    }, []);

    var ttsAvailable = typeof window.speechSynthesis !== 'undefined';

    function buildQueue() {
      try {
        var items = buildScreenReaderQueue(LAB_EXCLUDE_SELECTOR);
        setQueue(items);
        addToast && addToast(tr('a11y_lab.screenreader.queue_built_prefix', 'Built ') + items.length + tr('a11y_lab.screenreader.semantic_queue_built_suffix', ' semantic checkpoints (headings, landmarks, lists, tables, links, controls, and meaningful images).'), 'info');
      } catch (err) {
        addToast && addToast(tr('a11y_lab.screenreader.queue_failed', 'Failed to build queue: ') + (err && err.message), 'error');
      }
    }

    function speakOne(item, onEnd) {
      if (!ttsAvailable) {
        addToast && addToast(tr('a11y_lab.screenreader.tts_unavailable', 'Browser speech synthesis not available.'), 'error');
        onEnd && onEnd();
        return;
      }
      try { window.speechSynthesis.cancel(); } catch (_) {}
      var utter = new SpeechSynthesisUtterance(item.text);
      utter.rate = rateRef.current;
      utter.pitch = 1.0;
      utter.lang = item.lang || document.documentElement.lang || 'en-US';
      utter.onend = onEnd;
      utter.onerror = onEnd;
      window.speechSynthesis.speak(utter);
    }

    function playAll() {
      if (!queue || queue.length === 0) return;
      if (!ttsAvailable) {
        addToast && addToast(tr('a11y_lab.screenreader.tts_unavailable', 'Browser speech synthesis not available.'), 'error');
        return;
      }
      // Clear any leftover state from a previous play session.
      stopAll();
      var i = 0;
      var stopped = false;
      function next() {
        if (stopped || i >= queue.length) {
          clearHighlight();
          setPlayingIndex(null);
          stopRef.current = null;
          return;
        }
        clearHighlight();
        var item = queue[i];
        setPlayingIndex(i);
        unhighlightRef.current = highlightForScreenReader(item.el);
        speakOne(item, function () {
          i++;
          next();
        });
      }
      stopRef.current = function () {
        stopped = true;
        try { window.speechSynthesis.cancel(); } catch (_) {}
        clearHighlight();
        setPlayingIndex(null);
      };
      next();
    }

    function stopAll() {
      if (stopRef.current) {
        try { stopRef.current(); } catch (_) {}
        stopRef.current = null;
      } else {
        try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (_) {}
        clearHighlight();
        setPlayingIndex(null);
      }
    }

    function playOne(i) {
      if (!queue) return;
      stopAll();
      var item = queue[i];
      unhighlightRef.current = highlightForScreenReader(item.el);
      setPlayingIndex(i);
      stopRef.current = function () {
        try { window.speechSynthesis.cancel(); } catch (_) {}
        clearHighlight();
        setPlayingIndex(null);
      };
      speakOne(item, function () {
        clearHighlight();
        setPlayingIndex(null);
        stopRef.current = null;
      });
    }

    return e('div', { className: 'flex flex-col gap-4' },
      e('div', null,
        e('h3', { className: 'font-bold text-lg text-slate-800' }, tr('a11y_lab.screenreader.semantic_heading', 'Semantic announcement outline')),
        e('p', { className: 'text-sm text-slate-600 mt-1' },
          tr('a11y_lab.screenreader.semantic_description', "Build an approximate outline of names, roles, states, values, and descriptions for important page elements, then optionally hear that outline with browser text-to-speech. This is a semantic debugging aid, not a screen-reader emulator; actual announcements vary by browser, operating system, screen reader, settings, and navigation mode."))
      ),

      !ttsAvailable && e('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded text-sm text-amber-900' },
        tr('a11y_lab.screenreader.no_speech_warning', 'Your browser does not expose the Web Speech API. Try Chrome, Edge, or Firefox. The list will still build; you just will not hear the audio.')
      ),

      // Action buttons
      e('div', { className: 'flex gap-2 flex-wrap items-center' },
        e('button', {
          onClick: buildQueue,
          className: 'px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700',
        }, queue ? tr('a11y_lab.screenreader.rescan', 'Re-scan page') : tr('a11y_lab.screenreader.semantic_build', '🔊 Build semantic outline')),
        queue && queue.length > 0 && e('button', {
          onClick: playingIndex !== null ? stopAll : playAll,
          className: 'px-4 py-2 text-sm font-semibold border border-emerald-600 ' +
            (playingIndex !== null ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50') +
            ' rounded',
        }, playingIndex !== null ? tr('a11y_lab.screenreader.stop', '⏹ Stop') : tr('a11y_lab.screenreader.play_all', '▶ Play all')),
        queue && e('label', { className: 'text-xs text-slate-700 flex items-center gap-2' },
          tr('a11y_lab.screenreader.speed_label', 'Speed: '), e('input', {
            type: 'range', min: '0.5', max: '2.0', step: '0.1',
            value: rate, onChange: function (ev) { setRate(parseFloat(ev.target.value)); },
            className: 'w-24',
            'aria-label': tr('a11y_lab.screenreader.speed_aria', 'Playback speed'),
          }), e('span', { className: 'font-mono w-10' }, rate.toFixed(1) + 'x'))
      ),

      !queue && e('div', { className: 'p-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600' },
        tr('a11y_lab.screenreader.semantic_idle', 'Click "Build semantic outline" to inspect headings, landmarks, lists, tables, links, controls, and meaningful images on the selected page surface. You can play the approximate phrases or inspect them as text.')
      ),

      queue && queue.length === 0 && e('div', { className: 'p-6 text-center bg-amber-50 rounded-lg border border-amber-300 text-sm text-amber-900' },
        tr('a11y_lab.screenreader.empty', 'No announceable elements found. The page might be empty, or the visible content is all behind aria-hidden, or all the elements lack both a role and an accessible name. This is itself a problem worth investigating.')
      ),

      queue && queue.length > 0 && e('div', { className: 'flex flex-col gap-2' },
        e('div', { className: 'text-xs text-slate-600 mb-1' },
          queue.length + ' ' + tr('a11y_lab.screenreader.semantic_queue_count_hint', 'semantic checkpoints. Play an item to hear the approximation; the corresponding element is highlighted while it speaks.')),
        e('div', { className: 'border border-slate-200 rounded max-h-96 overflow-y-auto bg-white' },
          queue.map(function (item, i) {
            var isPlaying = playingIndex === i;
            return e('div', {
              key: i,
              className: 'flex items-start gap-2 p-2 border-b border-slate-100 ' + (isPlaying ? 'bg-amber-50' : 'hover:bg-slate-50'),
            },
              e('button', {
                onClick: function () { playOne(i); },
                disabled: !ttsAvailable,
                className: 'shrink-0 w-7 h-7 rounded-full ' + (isPlaying ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300') + ' flex items-center justify-center text-xs font-bold disabled:opacity-50',
                title: tr('a11y_lab.screenreader.play_one_title', 'Play this announcement'),
                'aria-label': tr('a11y_lab.screenreader.play_one_aria', 'Play announcement') + ' ' + (i + 1),
              }, isPlaying ? '▶' : (i + 1)),
              e('div', { className: 'flex-1 min-w-0' },
                e('div', { className: 'text-xs text-slate-500 font-mono' }, '<' + item.tag + '>'),
                e('div', { className: 'text-sm text-slate-800' }, item.text)
              )
            );
          })
        ),
        e('div', { className: 'text-xs text-slate-500 italic mt-2' },
          tr('a11y_lab.screenreader.semantic_tip', 'Use this outline to spot suspicious names, missing states, and structural gaps. For release verification, repeat the task with a real screen reader such as NVDA, VoiceOver, or TalkBack.'))
      )
    );
  }

  // ----- Phase 5: Disability simulators --------------------------------------

  // Standard color-matrix values for simulating different forms of color
  // vision deficiency. Values from Vienot, Brettel & Mollon (1999) and the
  // Brettel Vienot Mollon LMS-confusion model, widely used in accessibility
  // simulation tools.
  var SIM_SVG_FILTERS = '\
<defs>\
  <filter id="alloflow-sim-protanopia" color-interpolation-filters="sRGB">\
    <feColorMatrix type="matrix" values="0.567 0.433 0.000 0 0  0.558 0.442 0.000 0 0  0.000 0.242 0.758 0 0  0 0 0 1 0"/>\
  </filter>\
  <filter id="alloflow-sim-deuteranopia" color-interpolation-filters="sRGB">\
    <feColorMatrix type="matrix" values="0.625 0.375 0.000 0 0  0.700 0.300 0.000 0 0  0.000 0.300 0.700 0 0  0 0 0 1 0"/>\
  </filter>\
  <filter id="alloflow-sim-tritanopia" color-interpolation-filters="sRGB">\
    <feColorMatrix type="matrix" values="0.950 0.050 0.000 0 0  0.000 0.433 0.567 0 0  0.000 0.475 0.525 0 0  0 0 0 1 0"/>\
  </filter>\
  <filter id="alloflow-sim-achromatopsia" color-interpolation-filters="sRGB">\
    <feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0"/>\
  </filter>\
</defs>';

  // CSS rules applied via body class. Excludes the lab modal so the teacher
  // can keep using the Lab UI clearly while the underlying app is filtered.
  // The lab portals itself directly under <body> with
  // data-alloflow-a11y-lab="root", so the :not(...) match works correctly.
  var SIM_EXCLUDE = ':not([data-alloflow-a11y-lab]):not([aria-label="Accessibility Lab"]):not([aria-hidden="true"])';
  var SIM_CSS = '\
:root { --alloflow-sim-blur: 2px; }\
body.alloflow-sim-blur > ' + SIM_EXCLUDE + ' {\
  filter: blur(var(--alloflow-sim-blur, 2px));\
}\
body.alloflow-sim-protanopia > ' + SIM_EXCLUDE + ' {\
  filter: url("#alloflow-sim-protanopia");\
}\
body.alloflow-sim-deuteranopia > ' + SIM_EXCLUDE + ' {\
  filter: url("#alloflow-sim-deuteranopia");\
}\
body.alloflow-sim-tritanopia > ' + SIM_EXCLUDE + ' {\
  filter: url("#alloflow-sim-tritanopia");\
}\
body.alloflow-sim-achromatopsia > ' + SIM_EXCLUDE + ' {\
  filter: url("#alloflow-sim-achromatopsia");\
}\
body.alloflow-sim-reading-stress > ' + SIM_EXCLUDE + ' {\
  letter-spacing: 0.08em;\
  word-spacing: 0.16em;\
}\
body.alloflow-sim-reading-stress > ' + SIM_EXCLUDE + ' p,\
body.alloflow-sim-reading-stress > ' + SIM_EXCLUDE + ' li {\
  line-height: 1.8 !important;\
  max-width: 70ch;\
}';

  function ensureSimulatorAssetsLoaded() {
    if (!document.getElementById('alloflow-sim-svg-defs')) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'alloflow-sim-svg-defs';
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
      svg.innerHTML = SIM_SVG_FILTERS;
      document.body.appendChild(svg);
    }
    if (!document.getElementById('alloflow-sim-styles')) {
      var style = document.createElement('style');
      style.id = 'alloflow-sim-styles';
      style.textContent = SIM_CSS;
      document.head.appendChild(style);
    }
  }

  var SIM_CLASSES = [
    'alloflow-sim-blur',
    'alloflow-sim-protanopia',
    'alloflow-sim-deuteranopia',
    'alloflow-sim-tritanopia',
    'alloflow-sim-achromatopsia',
    'alloflow-sim-reading-stress',
    'alloflow-sim-dyslexia', // cleanup for sessions opened before this upgrade
  ];

  function applySimulator(activeKey, blurPx) {
    ensureSimulatorAssetsLoaded();
    var body = document.body;
    SIM_CLASSES.forEach(function (c) { body.classList.remove(c); });
    if (activeKey && activeKey !== 'none' && activeKey !== 'motor-info') {
      body.classList.add('alloflow-sim-' + activeKey);
    }
    if (typeof blurPx === 'number') {
      body.style.setProperty('--alloflow-sim-blur', blurPx + 'px');
    }
  }

  function clearAllSimulators() {
    var body = document.body;
    SIM_CLASSES.forEach(function (c) { body.classList.remove(c); });
  }

  // Translatable simulators list. Built per-render because labels and
  // descriptions go through the host's t() function.
  function buildSimulators(tr) {
    return [
      {
        key: 'blur',
        label: tr('a11y_lab.simulators.items.blur_label', 'Low-vision blur'),
        icon: '🔭',
        description: tr('a11y_lab.simulators.items.blur_desc', 'Approximates uncorrected low vision (visual acuity worse than 20/40). Roughly 4% of the population has uncorrected refractive error or other low-vision conditions; this share is much higher among older adults and students with visual impairments.'),
        hasSlider: true,
      },
      {
        key: 'protanopia',
        label: tr('a11y_lab.simulators.items.protanopia_label', 'Protanopia (red-blind)'),
        icon: '🔴',
        description: tr('a11y_lab.simulators.items.protanopia_desc', 'Severe red-green color vision deficiency, missing the L-cone. About 1% of males and very rare in females. Reds appear darker; reds and greens are confused.'),
      },
      {
        key: 'deuteranopia',
        label: tr('a11y_lab.simulators.items.deuteranopia_label', 'Deuteranopia (green-blind)'),
        icon: '🟢',
        description: tr('a11y_lab.simulators.items.deuteranopia_desc', 'The most common form of color blindness, missing the M-cone. About 6% of males. Reds and greens appear similar; the most common form of red-green color vision deficiency.'),
      },
      {
        key: 'tritanopia',
        label: tr('a11y_lab.simulators.items.tritanopia_label', 'Tritanopia (blue-blind)'),
        icon: '🔵',
        description: tr('a11y_lab.simulators.items.tritanopia_desc', 'Rare form, missing the S-cone. About 0.01% of the population. Blues appear greenish; yellow-blue distinctions are lost.'),
      },
      {
        key: 'achromatopsia',
        label: tr('a11y_lab.simulators.items.achromatopsia_label', 'Achromatopsia (no color)'),
        icon: '⚫',
        description: tr('a11y_lab.simulators.items.achromatopsia_desc', 'Complete absence of color vision. Affects roughly 0.003% of the population (about 1 in 30,000). The world appears in shades of grey.'),
      },
      {
        key: 'reading-stress',
        label: tr('a11y_lab.simulators.items.reading_stress_label', 'Reading-layout stress test'),
        icon: '📖',
        description: tr('a11y_lab.simulators.items.reading_stress_desc', 'Tests whether content remains usable with generous letter, word, and line spacing and a readable line length. This does not simulate dyslexia or any individual reader; it is a layout-resilience check.'),
      },
      {
        key: 'motor-info',
        label: tr('a11y_lab.simulators.items.motor_label', 'Motor impairments'),
        icon: '🖱️',
        description: tr('a11y_lab.simulators.items.motor_desc', 'Motor impairments resist visual simulation. The most authentic test is to use the OS-level tools real students use: Windows Sticky Keys, macOS Slow Keys, dwell-click software, switch access (e.g., the iOS Switch Control or Android Switch Access). Try completing a lesson using only one hand, only the keyboard, or only one finger.'),
        isInfo: true,
      },
    ];
  }

  function SimulatorsTab(props) {
    var addToast = props.addToast;
    var tr = makeTr(props.t);
    var SIMULATORS = buildSimulators(tr);

    var active$ = useState('none');
    var active = active$[0], setActive = active$[1];

    var blurPx$ = useState(2);
    var blurPx = blurPx$[0], setBlurPx = blurPx$[1];

    // Apply when active changes. Don't clear on unmount; the simulator
    // should persist across tab switches inside the lab. The lab as a whole
    // clears all simulators on close (see AccessibilityLab's useEffect).
    useEffect(function () {
      applySimulator(active, blurPx);
    }, [active, blurPx]);

    function handleSelect(key) {
      if (active === key) {
        setActive('none');
      } else {
        setActive(key);
        if (key === 'motor-info') {
          addToast && addToast(tr('a11y_lab.simulators.motor_toast', 'Motor impairment simulation: see the info card.'), 'info');
        }
      }
    }

    return e('div', { className: 'flex flex-col gap-4' },
      e('div', null,
        e('h3', { className: 'font-bold text-lg text-slate-800' }, tr('a11y_lab.simulators.heading', 'Disability simulators')),
        e('p', { className: 'text-sm text-slate-600 mt-1' },
          tr('a11y_lab.simulators.description', 'Toggle a simulator to apply a CSS filter to the page behind this lab. The lab itself stays unfiltered so you can keep using these controls. Click a tile to enable; click again to disable. Only one simulator runs at a time.'))
      ),

      // Honest framing card
      e('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900' },
        e('strong', null, tr('a11y_lab.simulators.framing_strong', 'Important framing: ')),
        tr('a11y_lab.simulators.framing_body', 'simulators are imperfect approximations. They are useful for empathy-building and quick checks, NOT for verifying compliance. A protanopia filter is NOT the same as protanopia. Real users have lived with their condition; you are seeing it for 60 seconds. Use simulators to surface obvious problems (color-only information, low contrast, illegible text), then test with real users when stakes matter.')
      ),

      // Simulator tiles
      e('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' },
        SIMULATORS.map(function (sim) {
          var isActive = active === sim.key;
          return e('button', {
            key: sim.key,
            onClick: function () { handleSelect(sim.key); },
            className: 'flex items-start gap-3 p-3 rounded-lg border text-left transition-all ' +
              (isActive
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-sm text-slate-800'),
            'aria-pressed': isActive,
          },
            e('span', { className: 'text-2xl shrink-0', 'aria-hidden': 'true' }, sim.icon),
            e('div', null,
              e('div', { className: 'font-bold text-sm flex items-center gap-2' },
                sim.label,
                isActive && !sim.isInfo && e('span', { className: 'text-xs font-normal opacity-80' }, tr('a11y_lab.simulators.active_suffix', '· active')),
                isActive && sim.isInfo && e('span', { className: 'text-xs font-normal opacity-80' }, tr('a11y_lab.simulators.info_suffix', '· info'))
              ),
              e('p', { className: 'text-xs mt-1 ' + (isActive ? 'opacity-95' : 'text-slate-600') },
                sim.description)
            )
          );
        })
      ),

      // Blur slider when blur is active
      active === 'blur' && e('div', { className: 'p-3 bg-slate-50 border border-slate-200 rounded' },
        e('label', { className: 'block text-xs font-semibold text-slate-700 mb-2' },
          tr('a11y_lab.simulators.blur_amount_label', 'Blur amount: '), e('span', { className: 'font-mono' }, blurPx + 'px'),
          ' ', e('span', { className: 'font-normal text-slate-500' }, tr('a11y_lab.simulators.blur_amount_hint', '(2px ≈ mild low vision; 5-8px ≈ severe)'))),
        e('input', {
          type: 'range', min: '0', max: '8', step: '0.5',
          value: blurPx,
          onChange: function (ev) { setBlurPx(parseFloat(ev.target.value)); },
          className: 'w-full',
          'aria-label': tr('a11y_lab.simulators.blur_amount_aria', 'Blur amount in pixels'),
        })
      ),

      // Stop button when any simulator active
      active !== 'none' && active !== 'motor-info' && e('div', { className: 'flex justify-center' },
        e('button', {
          onClick: function () { setActive('none'); },
          className: 'px-4 py-2 text-sm font-semibold border border-slate-400 text-slate-700 rounded hover:bg-slate-50',
        }, tr('a11y_lab.simulators.stop', 'Stop simulator'))
      ),

      // Helpful tips
      e('div', { className: 'text-xs text-slate-500 italic' },
        tr('a11y_lab.simulators.tip', 'Tip: try the color-blindness simulators on a lesson that uses red/green to convey meaning (correct/incorrect, warning/safe). If the meaning is lost in the simulation, the original design is failing students with that condition. Add icons, labels, or patterns alongside color.'))
    );
  }

  // ----- Top-level component --------------------------------------------------

  function AccessibilityLab(props) {
    if (!props.isOpen) return null;

    var tr = makeTr(props.t);
    var tabLabels = {
      preview:      tr('a11y_lab.tabs.content_preview', 'Content preview'),
      keyboard:     tr('a11y_lab.tabs.keyboard',     'Keyboard tour'),
      audit:        tr('a11y_lab.tabs.audit',        'Audit'),
      screenreader: tr('a11y_lab.tabs.semantic_outline', 'Semantic outline'),
      simulators:   tr('a11y_lab.tabs.simulators',   'Simulators'),
    };

    var tab$ = useState('preview');
    var tab = tab$[0], setTab = tab$[1];

    var closeBtnRef = useRef(null);
    var previousFocusRef = useRef(null);
    var dialogRef = useRef(null);
    var tabRefs = useRef({});

    // Clear any active simulator when the lab is closed.
    // (Simulators persist across tab switches; only a full close resets them.)
    // Also: capture the previously-focused element on mount and restore focus
    // to it on unmount, so closing the lab returns the teacher to the Educator
    // Hub button that opened it.
    useEffect(function () {
      previousFocusRef.current = document.activeElement;
      if (closeBtnRef.current && typeof closeBtnRef.current.focus === 'function') {
        try { closeBtnRef.current.focus(); } catch (_) {}
      }
      return function () {
        clearAllSimulators();
        var prev = previousFocusRef.current;
        if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
          try { prev.focus(); } catch (_) {}
        }
      };
    }, []);

    // Escape closes the lab.
    useEffect(function () {
      function onKey(ev) {
        if (ev.key === 'Escape') {
          ev.stopPropagation();
          props.onClose();
        }
      }
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('keydown', onKey); };
    }, [props.onClose]);

    function tabBtn(tab_) {
      var active = tab === tab_.key;
      var disabled = !tab_.ready;
      return e('button', {
        key: tab_.key,
        ref: function (el) { tabRefs.current[tab_.key] = el; },
        role: 'tab',
        id: 'a11y-lab-tab-' + tab_.key,
        'aria-selected': active,
        'aria-controls': 'a11y-lab-panel-' + tab_.key,
        // Roving tabindex: only the active tab is in the document tab order;
        // arrow keys on the tablist move between siblings.
        tabIndex: active ? 0 : -1,
        onClick: function () { if (tab_.ready) setTab(tab_.key); },
        disabled: disabled,
        title: disabled ? tr('a11y_lab.dialog.coming_soon', 'Coming in a future phase') : null,
        className: 'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 ' +
          (active ? 'bg-indigo-600 text-white' :
           disabled ? 'text-slate-400 bg-slate-100 cursor-not-allowed' :
           'text-slate-700 hover:bg-slate-100'),
      }, e('span', { 'aria-hidden': 'true' }, tab_.icon), tabLabels[tab_.key] || tab_.label);
    }

    function handleTablistKeyDown(ev) {
      var readyTabs = TABS.filter(function (t) { return t.ready; });
      if (readyTabs.length === 0) return;
      var idx = readyTabs.findIndex(function (t) { return t.key === tab; });
      if (idx < 0) return;
      var nextIdx = idx;
      if (ev.key === 'ArrowRight') nextIdx = (idx + 1) % readyTabs.length;
      else if (ev.key === 'ArrowLeft') nextIdx = (idx - 1 + readyTabs.length) % readyTabs.length;
      else if (ev.key === 'Home') nextIdx = 0;
      else if (ev.key === 'End')  nextIdx = readyTabs.length - 1;
      else return;
      ev.preventDefault();
      var nextKey = readyTabs[nextIdx].key;
      setTab(nextKey);
      var nextEl = tabRefs.current[nextKey];
      if (nextEl && typeof nextEl.focus === 'function') {
        try { nextEl.focus(); } catch (_) {}
      }
    }

    function handleDialogKeyDown(ev) {
      if (ev.key !== 'Tab' || !dialogRef.current) return;
      var nodes = Array.prototype.slice.call(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter(function (el) {
          if (el.disabled) return false;
          if (el.getAttribute('tabindex') === '-1') return false;
          // Tab buttons use roving tabindex; only the active one is reachable.
          if (el.getAttribute('role') === 'tab' && el.tabIndex !== 0) return false;
          var rect = el.getBoundingClientRect();
          return rect.width > 0 || rect.height > 0;
        });
      if (nodes.length === 0) return;
      var first = nodes[0], last = nodes[nodes.length - 1];
      var activeEl = document.activeElement;
      if (ev.shiftKey && activeEl === first) {
        ev.preventDefault();
        try { last.focus(); } catch (_) {}
      } else if (!ev.shiftKey && activeEl === last) {
        ev.preventDefault();
        try { first.focus(); } catch (_) {}
      }
    }

    var modal = e('div', {
      className: 'fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4',
      'data-alloflow-a11y-lab': 'root',
      onClick: function (ev) { if (ev.target === ev.currentTarget) props.onClose(); },
    },
      e('div', {
        ref: dialogRef,
        className: 'bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'a11y-lab-title',
        // Stable data attribute (locale-independent) used by lab-exclusion
        // selectors in scan/audit/screen-reader queue builders.
        'data-alloflow-a11y-lab': 'dialog',
        onKeyDown: handleDialogKeyDown,
      },
        // Header
        e('div', { className: 'flex items-center justify-between px-5 py-4 border-b border-slate-200' },
          e('div', { className: 'flex items-center gap-3' },
            e('span', { className: 'text-2xl', 'aria-hidden': 'true' }, '🔍'),
            e('div', null,
              e('h2', { id: 'a11y-lab-title', className: 'font-bold text-lg text-slate-800' }, tr('a11y_lab.dialog.title', 'Accessibility Lab')),
              e('p', { className: 'text-xs text-slate-500' }, tr('a11y_lab.dialog.subtitle', 'Verify the student experience: preview, audit, listen, simulate.'))
            )
          ),
          e('button', {
            ref: closeBtnRef,
            className: 'px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900',
            onClick: props.onClose,
            'aria-label': tr('a11y_lab.dialog.close_aria', 'Close Accessibility Lab'),
          }, tr('a11y_lab.dialog.close', 'Close'))
        ),

        // Tab strip
        e('div', {
          className: 'flex items-center gap-1 px-5 py-2 border-b border-slate-200 overflow-x-auto',
          role: 'tablist',
          'aria-label': tr('a11y_lab.dialog.tablist_aria', 'Lab sections'),
          onKeyDown: handleTablistKeyDown,
        },
          TABS.map(tabBtn)
        ),

        // Body (tabpanel)
        e('div', {
          className: 'flex-1 overflow-y-auto px-5 py-4',
          role: 'tabpanel',
          id: 'a11y-lab-panel-' + tab,
          'aria-labelledby': 'a11y-lab-tab-' + tab,
          tabIndex: 0,
        },
          tab === 'preview'      ? e(PreviewTab, props) :
          tab === 'keyboard'     ? e(KeyboardTab, props) :
          tab === 'audit'        ? e(AuditTab, props) :
          tab === 'screenreader' ? e(ScreenReaderTab, props) :
          e(SimulatorsTab, props)
        )
      )
    );

    // Portal to body so the simulator CSS selector
    //   body.alloflow-sim-* > *:not([aria-label="Accessibility Lab"])
    // can correctly exclude the lab. Also avoids the ancestor-`filter`
    // containing-block trap that would otherwise re-anchor this fixed modal
    // when a simulator is toggled.
    return ReactDOM.createPortal(modal, document.body);
  }

  // ----- Register -------------------------------------------------------------

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AccessibilityLab = AccessibilityLab;
  // Test seam (read-only): expose the pure screen-reader-simulation helpers for
  // characterization tests (tests/accessibility_lab_golden.test.js). Zero behavior change.
  window.AlloModules.AccessibilityLabInternals = {
    composeAnnouncement: composeAnnouncement, getScreenReaderRole: getScreenReaderRole,
    getScreenReaderName: getScreenReaderName, getScreenReaderState: getScreenReaderState,
    getScreenReaderDescription: getScreenReaderDescription,
    getElementLabel: getElementLabel, scanKeyboardAccessibility: scanKeyboardAccessibility,
    buildScreenReaderQueue: buildScreenReaderQueue,
    reviewItemKey: reviewItemKey, normalizeReviewScorecard: normalizeReviewScorecard,
    summarizeReviewScorecard: summarizeReviewScorecard, loadReviewScorecards: loadReviewScorecards,
    persistAutomatedAuditForReview: persistAutomatedAuditForReview,
  };
  console.log('[CDN] AccessibilityLab loaded');
})();
