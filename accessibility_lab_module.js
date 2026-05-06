/**
 * AlloFlow Accessibility Lab Module
 *
 * Embedded accessibility verification suite for educators. Lets a teacher
 * preview lessons as their students would experience them, run live audits,
 * hear what a screen reader would announce, and simulate common disabilities.
 *
 * Module export: window.AlloModules.AccessibilityLab (React component).
 *
 * Phases (each ships independently):
 *   1. Preview as my student   (this ship)
 *   2. Keyboard navigation tour
 *   3. Live in-app a11y audit (axe-core)
 *   4. Screen-reader announcement preview
 *   5. Disability simulators (low-vision, color-blindness, dyslexia, motor)
 *
 * Props expected from the monolith host:
 *   isOpen: boolean
 *   onClose: () => void
 *   addToast: (msg, type) => void
 *   history: array of saved history items (lessons + outputs)
 *   callTTS: (text, opts) => Promise (used in Phase 4 + optional Phase 1 read-aloud)
 *   t: (key) => string (i18n)
 */
(function () {
  'use strict';

  if (window.AlloModules && window.AlloModules.AccessibilityLab) {
    console.log('[CDN] AccessibilityLab already loaded, skipping');
    return;
  }

  var React = window.React;
  if (!React) {
    console.error('[CDN] AccessibilityLab requires window.React');
    return;
  }
  var e = React.createElement;
  var useState = React.useState;
  var useMemo = React.useMemo;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  // ----- Constants ------------------------------------------------------------

  var TABS = [
    { key: 'preview',      label: 'Preview as student', icon: '👁️',  ready: true  },
    { key: 'keyboard',     label: 'Keyboard tour',      icon: '⌨️',  ready: true  },
    { key: 'audit',        label: 'Audit',              icon: '🔍', ready: false },
    { key: 'screenreader', label: 'Screen reader',      icon: '🔊', ready: false },
    { key: 'simulators',   label: 'Simulators',         icon: '👓', ready: false },
  ];

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

  // ----- Helpers --------------------------------------------------------------

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
    return {
      fontFamily: family.css,
      fontSize: size.px + 'px',
      lineHeight: spacing.cssLineHeight,
      backgroundColor: theme.bg,
      color: theme.fg,
      padding: '20px',
      borderRadius: '8px',
      minHeight: '200px',
    };
  }

  // Render a single history item in a student-friendly layout. Different
  // history types have different data shapes; we pick out the parts that
  // make sense to display in a preview.
  function renderHistoryItemContent(item, theme) {
    if (!item || !item.data) {
      return e('p', { style: { color: theme.sub, fontStyle: 'italic' } }, 'No content available for this lesson item.');
    }
    var data = item.data;

    // analysis: source text + concepts
    if (item.type === 'analysis') {
      return e('div', null,
        data.originalText && e('section', { style: { marginBottom: '24px' } },
          e('h4', { style: { fontWeight: 700, marginBottom: '12px' } }, 'Source text'),
          e('p', { style: { whiteSpace: 'pre-wrap' } }, asString(data.originalText))
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

    // fallback: dump JSON in a code block
    return e('div', null,
      e('p', { style: { color: theme.sub, fontStyle: 'italic', marginBottom: '8px' } }, 'Preview not yet specialized for type "' + asString(item.type) + '". Showing raw data:'),
      e('pre', {
        style: { fontSize: '0.85em', backgroundColor: theme.bg === '#ffffff' ? '#f1f5f9' : '#1e293b', padding: '12px', borderRadius: '4px', overflow: 'auto', maxHeight: '300px' }
      }, JSON.stringify(data, null, 2))
    );
  }

  // ----- Phase 1: Preview as student -----------------------------------------

  function PreviewTab(props) {
    var history = props.history || [];
    var callTTS = props.callTTS;
    var addToast = props.addToast;

    var sel$ = useState(null);
    var selectedItem = sel$[0], setSelectedItem = sel$[1];

    var settings$ = useState({
      fontSize: 'md',
      fontFamily: 'system',
      theme: 'light',
      lineSpacing: 'normal',
    });
    var settings = settings$[0], setSettings = settings$[1];

    var theme = useMemo(function () {
      return THEMES.find(function (t) { return t.value === settings.theme; }) || THEMES[0];
    }, [settings.theme]);

    function update(key, value) {
      var next = {};
      next[key] = value;
      setSettings(Object.assign({}, settings, next));
    }

    function handleReadAloud() {
      if (!callTTS || typeof callTTS !== 'function') {
        addToast && addToast('Read aloud is not available in this build.', 'error');
        return;
      }
      // Read the visible content of the preview pane
      var pane = document.getElementById('alloflow-a11y-preview-pane');
      var text = pane ? pane.innerText : '';
      if (!text || !text.trim()) {
        addToast && addToast('Nothing to read in the current preview.', 'info');
        return;
      }
      try {
        callTTS(text);
      } catch (err) {
        addToast && addToast('Could not start read-aloud: ' + (err && err.message), 'error');
      }
    }

    if (!selectedItem) {
      // Lesson selection screen
      var validHistory = history.filter(function (item) { return item && item.type && item.type !== 'image'; });
      return e('div', { className: 'flex flex-col gap-4' },
        e('div', null,
          e('h3', { className: 'font-bold text-lg text-slate-800' }, 'Preview a lesson as your student'),
          e('p', { className: 'text-sm text-slate-600 mt-1' },
            'Choose a saved lesson to preview with student accessibility settings applied (font, size, contrast, line spacing). This shows you what the content looks like for students using accommodations.')
        ),
        validHistory.length === 0
          ? e('div', { className: 'p-8 text-center bg-slate-50 rounded-lg border border-slate-200 text-slate-600' },
              'No saved lessons yet. Generate a lesson in Teacher Mode first, then come back to preview it.')
          : e('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
              validHistory.map(function (item) {
                return e('button', {
                  key: item.id,
                  onClick: function () { setSelectedItem(item); },
                  className: 'flex flex-col items-start gap-1 p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-500 hover:shadow-sm text-left transition-all',
                },
                  e('div', { className: 'flex items-center gap-2' },
                    e('span', { className: 'text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800' }, item.type),
                    e('span', { className: 'font-bold text-sm text-slate-800' }, asString(item.title) || '(untitled)')
                  ),
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
        }, '← Back to lesson list'),
        e('div', { className: 'text-xs text-slate-500' },
          'Previewing: ', e('strong', null, asString(selectedItem.title) || '(untitled)'),
          ' (', selectedItem.type, ')'
        )
      ),

      // Settings strip
      e('div', { className: 'bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 md:grid-cols-5 gap-3' },
        e('div', null,
          e('label', { className: 'block text-xs font-semibold text-slate-700 mb-1' }, 'Font'),
          e('select', {
            value: settings.fontFamily,
            onChange: function (ev) { update('fontFamily', ev.target.value); },
            className: 'w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white',
          }, FONT_FAMILIES.map(function (f) { return e('option', { key: f.value, value: f.value }, f.label); }))
        ),
        e('div', null,
          e('label', { className: 'block text-xs font-semibold text-slate-700 mb-1' }, 'Size'),
          e('select', {
            value: settings.fontSize,
            onChange: function (ev) { update('fontSize', ev.target.value); },
            className: 'w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white',
          }, FONT_SIZES.map(function (s) { return e('option', { key: s.value, value: s.value }, s.label); }))
        ),
        e('div', null,
          e('label', { className: 'block text-xs font-semibold text-slate-700 mb-1' }, 'Theme'),
          e('select', {
            value: settings.theme,
            onChange: function (ev) { update('theme', ev.target.value); },
            className: 'w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white',
          }, THEMES.map(function (t) { return e('option', { key: t.value, value: t.value }, t.label); }))
        ),
        e('div', null,
          e('label', { className: 'block text-xs font-semibold text-slate-700 mb-1' }, 'Line spacing'),
          e('select', {
            value: settings.lineSpacing,
            onChange: function (ev) { update('lineSpacing', ev.target.value); },
            className: 'w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white',
          }, LINE_SPACINGS.map(function (s) { return e('option', { key: s.value, value: s.value }, s.label); }))
        ),
        e('div', { className: 'flex flex-col justify-end' },
          e('button', {
            onClick: handleReadAloud,
            className: 'w-full px-2 py-1 text-xs font-semibold border border-emerald-600 text-emerald-700 rounded hover:bg-emerald-50',
          }, '🔊 Read aloud')
        )
      ),

      // Preview pane (the actual student-eye view)
      e('div', { id: 'alloflow-a11y-preview-pane', style: settingsStyle(settings, theme), 'aria-label': 'Student preview pane' },
        renderHistoryItemContent(selectedItem, theme)
      ),

      // Hint
      e('div', { className: 'text-xs text-slate-500 italic' },
        'Tip: switch the theme to High contrast and try Extra Large font to simulate low-vision usage. Switch the font to OpenDyslexic to simulate a dyslexia-friendly view.')
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
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  function getElementLabel(el) {
    var aria = el.getAttribute('aria-label');
    if (aria) return aria;
    var labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      var labelEl = document.getElementById(labelledBy);
      if (labelEl) return labelEl.textContent.trim().slice(0, 80);
    }
    var title = el.getAttribute('title');
    if (title) return title;
    var text = (el.textContent || '').trim().replace(/\s+/g, ' ');
    if (text) return text.slice(0, 80);
    var placeholder = el.getAttribute('placeholder');
    if (placeholder) return '[' + placeholder + ']';
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
    var allClickyDivs = Array.from(document.querySelectorAll('div, span'));
    var suspicious = allClickyDivs.filter(function (el) {
      if (isInExcludedContainer(el) || !isElementVisible(el)) return false;
      var style = window.getComputedStyle(el);
      if (style.cursor !== 'pointer') return false;
      if (el.tabIndex >= 0) return false;
      if (el.matches('a, button, [role="button"]')) return false;
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
      return !label || label.startsWith('<') || label === '[name=]';
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
        var result = scanKeyboardAccessibility('[aria-label="Accessibility Lab"]');
        setScanResult(result);
        addToast && addToast(
          'Keyboard scan: ' + result.total + ' focusable elements, ' +
          (result.suspicious.length + result.positiveTabindex.length + result.noLabel.length) + ' issues',
          'info'
        );
      } catch (err) {
        addToast && addToast('Keyboard scan failed: ' + (err && err.message), 'error');
      }
    }

    function handleFocusElement(el) {
      try {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) { /* ignore */ }
    }

    return e('div', { className: 'flex flex-col gap-4' },
      e('div', null,
        e('h3', { className: 'font-bold text-lg text-slate-800' }, 'Keyboard accessibility audit'),
        e('p', { className: 'text-sm text-slate-600 mt-1' },
          'Scan the underlying lesson view for keyboard-accessible elements. Identifies tab order, "fake buttons" (divs with cursor:pointer that aren\'t keyboard-reachable), positive tabindex anti-patterns, and elements missing accessible names.')
      ),

      // Action buttons
      e('div', { className: 'flex gap-2 flex-wrap' },
        e('button', {
          onClick: handleScan,
          className: 'px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700',
        }, scanResult ? 'Re-scan' : '🔍 Run keyboard scan'),
        scanResult && e('button', {
          onClick: function () { setShowOverlay(!showOverlay); },
          className: 'px-4 py-2 text-sm font-semibold border border-indigo-600 text-indigo-700 rounded hover:bg-indigo-50',
        }, showOverlay ? '🔢 Hide tab-order overlay' : '🔢 Show tab-order overlay')
      ),

      showOverlay && e('div', { className: 'p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900' },
        'Tab-order overlay is active. Numbered red badges show the tab sequence on the page behind this lab. Close the lab or click the toggle above to hide.'
      ),

      !scanResult && e('div', { className: 'p-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600' },
        'Click "Run keyboard scan" to audit the current view. The lab modal itself is excluded from the scan; what gets audited is the underlying app surface (the lesson, sidebar, controls, etc. behind the lab).'
      ),

      scanResult && e('div', { className: 'flex flex-col gap-3' },
        // Summary
        e('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
          e('div', { className: 'p-3 bg-slate-50 border border-slate-200 rounded text-center' },
            e('div', { className: 'text-2xl font-bold text-slate-800' }, scanResult.total),
            e('div', { className: 'text-xs text-slate-600' }, 'Focusable elements')
          ),
          e('div', {
            className: 'p-3 border rounded text-center ' + (scanResult.suspicious.length > 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300')
          },
            e('div', { className: 'text-2xl font-bold ' + (scanResult.suspicious.length > 0 ? 'text-amber-800' : 'text-emerald-800') }, scanResult.suspicious.length),
            e('div', { className: 'text-xs ' + (scanResult.suspicious.length > 0 ? 'text-amber-700' : 'text-emerald-700') }, 'Fake buttons')
          ),
          e('div', {
            className: 'p-3 border rounded text-center ' + (scanResult.positiveTabindex.length > 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300')
          },
            e('div', { className: 'text-2xl font-bold ' + (scanResult.positiveTabindex.length > 0 ? 'text-amber-800' : 'text-emerald-800') }, scanResult.positiveTabindex.length),
            e('div', { className: 'text-xs ' + (scanResult.positiveTabindex.length > 0 ? 'text-amber-700' : 'text-emerald-700') }, 'Positive tabindex')
          ),
          e('div', {
            className: 'p-3 border rounded text-center ' + (scanResult.noLabel.length > 0 ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-300')
          },
            e('div', { className: 'text-2xl font-bold ' + (scanResult.noLabel.length > 0 ? 'text-rose-800' : 'text-emerald-800') }, scanResult.noLabel.length),
            e('div', { className: 'text-xs ' + (scanResult.noLabel.length > 0 ? 'text-rose-700' : 'text-emerald-700') }, 'Missing names')
          )
        ),

        // Tab-order list
        scanResult.total > 0 && e('details', { className: 'bg-slate-50 border border-slate-200 rounded p-3' },
          e('summary', { className: 'cursor-pointer font-semibold text-sm text-slate-800' },
            'Tab order (' + scanResult.total + ' elements)'),
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
            '⚠ Fake buttons (' + scanResult.suspicious.length + ')'),
          e('p', { className: 'text-xs text-amber-800 mt-1' },
            'Elements with cursor:pointer that look clickable but cannot be reached by keyboard. Common cause: a div with onClick instead of a real <button>. Fix: convert to <button>, OR add tabindex="0" + role="button" + keyboard event handlers.'),
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
            '⚠ Positive tabindex (' + scanResult.positiveTabindex.length + ')'),
          e('p', { className: 'text-xs text-amber-800 mt-1' },
            'Elements with tabindex > 0 break natural document tab order and confuse keyboard users. Fix: use tabindex="0" (default order) or rely on default focusability for buttons/links.')
        ),

        scanResult.noLabel.length > 0 && e('details', { className: 'bg-rose-50 border border-rose-300 rounded p-3' },
          e('summary', { className: 'cursor-pointer font-semibold text-sm text-rose-900' },
            '🔴 Missing accessible names (' + scanResult.noLabel.length + ')'),
          e('p', { className: 'text-xs text-rose-800 mt-1' },
            'Focusable elements without text, aria-label, aria-labelledby, or title. Screen reader users would hear only the tag name, e.g., "button" with no context. Fix: add aria-label or visible text.'),
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
          'Tip: navigate the page behind the lab using only Tab, Shift+Tab, Enter, and Esc. Click on any element name in the lists above to focus it (the page will scroll if needed).')
      )
    );
  }

  // ----- Coming-soon stub for phases 3-5 -------------------------------------

  function ComingSoon(props) {
    return e('div', { className: 'p-10 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300' },
      e('div', { className: 'text-5xl mb-3' }, props.icon || '🚧'),
      e('h3', { className: 'font-bold text-lg text-slate-800 mb-2' }, props.title),
      e('p', { className: 'text-sm text-slate-600 max-w-md mx-auto' }, props.description)
    );
  }

  // ----- Top-level component --------------------------------------------------

  function AccessibilityLab(props) {
    if (!props.isOpen) return null;

    var tab$ = useState('preview');
    var tab = tab$[0], setTab = tab$[1];

    function tabBtn(t) {
      var active = tab === t.key;
      var disabled = !t.ready;
      return e('button', {
        key: t.key,
        onClick: function () { if (t.ready) setTab(t.key); },
        disabled: disabled,
        title: disabled ? 'Coming in a future phase' : null,
        className: 'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ' +
          (active ? 'bg-indigo-600 text-white' :
           disabled ? 'text-slate-400 bg-slate-100 cursor-not-allowed' :
           'text-slate-700 hover:bg-slate-100'),
      }, e('span', { 'aria-hidden': 'true' }, t.icon), t.label);
    }

    return e('div', {
      className: 'fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4',
      onClick: function (ev) { if (ev.target === ev.currentTarget) props.onClose(); },
    },
      e('div', {
        className: 'bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col',
        role: 'dialog',
        'aria-label': 'Accessibility Lab',
      },
        // Header
        e('div', { className: 'flex items-center justify-between px-5 py-4 border-b border-slate-200' },
          e('div', { className: 'flex items-center gap-3' },
            e('span', { className: 'text-2xl', 'aria-hidden': 'true' }, '🔍'),
            e('div', null,
              e('h2', { className: 'font-bold text-lg text-slate-800' }, 'Accessibility Lab'),
              e('p', { className: 'text-xs text-slate-500' }, 'Verify the student experience: preview, audit, listen, simulate.')
            )
          ),
          e('button', {
            className: 'px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900',
            onClick: props.onClose,
            'aria-label': 'Close Accessibility Lab',
          }, 'Close')
        ),

        // Tab strip
        e('div', { className: 'flex items-center gap-1 px-5 py-2 border-b border-slate-200 overflow-x-auto', role: 'tablist' },
          TABS.map(tabBtn)
        ),

        // Body
        e('div', { className: 'flex-1 overflow-y-auto px-5 py-4' },
          tab === 'preview'      ? e(PreviewTab, props) :
          tab === 'keyboard'     ? e(KeyboardTab, props) :
          tab === 'audit'        ? e(ComingSoon, { icon: '🔍', title: 'Live in-app accessibility audit', description: 'Runs axe-core against the current view and surfaces violations in plain language framed by student impact, with teacher-friendly fix suggestions. Coming in Phase 3.' }) :
          tab === 'screenreader' ? e(ComingSoon, { icon: '🔊', title: 'Screen-reader announcement preview', description: "Plays back exactly what a screen reader would announce while a student worked through the lesson, using AlloFlow's text-to-speech. Coming in Phase 4." }) :
          e(ComingSoon, { icon: '👓', title: 'Disability simulators', description: 'Toggleable filters for low-vision blur, color-blindness (deutan/protan/tritan), dyslexia simulation, and motor-impairment delay. Each with a teacher-friendly explainer of who experiences this. Coming in Phase 5.' })
        )
      )
    );
  }

  // ----- Register -------------------------------------------------------------

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AccessibilityLab = AccessibilityLab;
  console.log('[CDN] AccessibilityLab loaded (Phase 1 active; Phases 2-5 stubbed)');
})();
