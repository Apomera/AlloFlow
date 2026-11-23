// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEAM Lab — Circuit Shelf (Falstad CircuitJS1 + Predict-Explore-Explain coach)
//
// The shelf itself is a COMPANION WINDOW (circuit_shelf/circuit_shelf.html):
// Paul Falstad & Iain Sharp's CircuitJS1 — the browser electronic-circuit
// simulator (GPLv2, github.com/pfalstad/circuitjs1 / sharpie7/circuitjs1) —
// wrapped in an AlloFlow PREDICT → EXPLORE → EXPLAIN coach. The simulator is
// a sealed box to us, so the coach BRACKETS it with a set of build-it
// challenges: commit a prediction first, build & run, then explain — and the
// AI (when enabled) Socratically compares prediction vs. observation.
//
// This is the "bracket tutor" pattern shared with the Sim Shelf (PhET) and
// Data Lab's observing tutor. Bridge protocol mirrors Sim Shelf exactly,
// renamed alloccircuit-* :
//   popup ── alloccircuit-hello ──────────▶ here (replies -ready {ai})
//   popup ── alloccircuit-ai-request ─────▶ here ── ctx.callGemini ──▶ Gemini
//   popup ◀─ alloccircuit-ai-response ──── here
//
// House rules: zero AI traffic unless ctx.aiHintsEnabled AND the student
// pressed the debrief button; nothing persisted except quest-slice counters
// in '_circuitShelf'.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  // WCAG 1.4.3 high contrast: host buttons go black with green ink; drop the gradient painted over that black
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-circuitshelf-hc-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-circuitshelf-hc-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"circuitShelf\"] button[class*=\"bg-gradient\"]{background-image:none!important}";
    document.head.appendChild(st);
  })();

  // Scoped GPU-composited schematic live motion
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-circuitshelf-motion-css')) return;
    var mst = document.createElement('style');
    mst.id = 'allo-circuitshelf-motion-css';
    mst.textContent = [
      '@keyframes csCurrentFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-24}}',
      '@keyframes csScopeTrace{from{stroke-dashoffset:0}to{stroke-dashoffset:-18}}',
      '@keyframes csNodeBeacon{0%,100%{transform:scale(.86);opacity:.18}50%{transform:scale(1.38);opacity:.48}}',
      '@keyframes csCopperSheen{0%,100%{transform:translateX(-92px);opacity:0}18%{opacity:.2}50%{transform:translateX(632px);opacity:.28}82%{opacity:0}}',
      '.cs-current-trace{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:5 19;animation:csCurrentFlow 2.6s linear infinite;pointer-events:none;}',
      '.cs-scope-trace{animation:csScopeTrace 2.8s linear infinite;pointer-events:none;}',
      '.cs-node-halo{transform-box:fill-box;transform-origin:center;animation:csNodeBeacon 3.1s ease-in-out infinite;pointer-events:none;}',
      '.cs-pcb-sheen{animation:csCopperSheen 6.6s ease-in-out infinite;pointer-events:none;}',
      '@media(prefers-reduced-motion:reduce){.cs-current-trace,.cs-scope-trace,.cs-node-halo,.cs-pcb-sheen{animation:none!important;}}',
      '.theme-contrast [data-stem-tool-shell="circuitShelf"] .cs-node-halo,.theme-contrast [data-stem-tool-shell="circuitShelf"] .cs-pcb-sheen{display:none!important;}',
      '.theme-contrast [data-stem-tool-shell="circuitShelf"] .cs-current-trace,.theme-contrast [data-stem-tool-shell="circuitShelf"] .cs-scope-trace{animation:none!important;}',
      '@media(forced-colors:active){.cs-node-halo,.cs-pcb-sheen{display:none!important;}.cs-current-trace,.cs-scope-trace{animation:none!important;}}'
    ].join('\n');
    document.head.appendChild(mst);
  })();

  var CIRCUIT_SHELF_CDN_URL = 'https://alloflow-cdn.pages.dev/circuit_shelf/circuit_shelf.html?v=1';
  function companionUrl(path, cdnUrl) {
    try {
      var loc = window.location || {};
      var host = loc.hostname || '';
      var pathname = loc.pathname || '';
      var isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(host);
      var isDesktopBundled = !!window._isDesktopBundledApp || (isLocalHost && pathname.indexOf('/app/') === 0);
      var isAlloHosted = /^alloflow-cdn\.pages\.dev$/i.test(host) || /^(?:(?:www|app|cdn)\.)?alloflow\.org$/i.test(host);
      if (isDesktopBundled) return new URL(path, loc.href).toString();
      if (isLocalHost || isAlloHosted) return new URL('/' + String(path).replace(/^\/+/, ''), loc.origin).toString();
    } catch (_) {}
    return cdnUrl;
  }
  var CIRCUIT_SHELF_URL = companionUrl('circuit_shelf/circuit_shelf.html?v=1', CIRCUIT_SHELF_CDN_URL);
  // Bridge trust: only the pop-up this tool opened, at the companion's own origin,
  // may drive the bridge. Opaque origins (file://) report "null", which postMessage
  // rejects as a target, so those fall back to '*' and rely on the source check.
  var CIRCUIT_SHELF_ORIGIN = (function () {
    try { var o = new URL(CIRCUIT_SHELF_URL, (window.location && window.location.href) || undefined).origin; return (o && o !== 'null') ? o : '*'; } catch (_) { return '*'; }
  })();
  var _circuitshelfPopup = null; // module scope: a still-open pop-up keeps working after a remount
  function _circuitshelfBridgeTrusted(ev, win) {
    var src = ev && ev.source;
    if (!src || (src !== win && src !== _circuitshelfPopup)) return false;
    return CIRCUIT_SHELF_ORIGIN === '*' || ev.origin === CIRCUIT_SHELF_ORIGIN;
  }

  function buildDebriefPrompt(challenge, prediction, explanation) {
    return [
      'You are a warm, Socratic ELECTRONICS LAB COACH for a K-12 student working in the CircuitJS circuit simulator on the challenge "' + String(challenge || '').slice(0, 100) + '".',
      'Before building they PREDICTED:',
      '"' + String(prediction || '(no prediction)').slice(0, 600) + '"',
      'After building and running the circuit they EXPLAINED what they observed:',
      '"' + String(explanation || '').slice(0, 800) + '"',
      'RULES:',
      '- At most 4 sentences, ending in exactly ONE question.',
      '- First, name specifically where their prediction and observation agree or part ways — quote their own words back briefly.',
      '- Never lecture, never deliver the textbook explanation (Ohm’s law, series/parallel rules). Nudge them to run one more targeted measurement or sharpen one claim.',
      '- If their explanation is vague, ask them to read ONE concrete value off the simulator (a current, a voltage, a bulb brightness) and reason from it.',
      '- Warm, grade-appropriate, jargon-free. Plain text only.'
    ].join('\n');
  }

  var CIRCUIT_STARTERS = [
    { id: '', label: 'All 6 Builds', topic: 'Full Bench', grades: 'Gr 5–12', mode: 'bench',
      cue: 'Choose from six real CircuitJS build-and-measure challenges with a Predict → Explore → Explain coach.' },
    { id: 'series-parallel', label: 'Series vs. Parallel', topic: 'Lamp Brightness', grades: 'Gr 5–10', mode: 'series-parallel',
      cue: 'Compare single-loop and branched bulb layouts — predict brightness and what happens if one lamp opens.' },
    { id: 'ohms-law', label: 'Ohm’s Law', topic: 'V, I, R Meter Loop', grades: 'Gr 7–12', mode: 'ohms-law',
      cue: 'Wire a voltage source, resistor, and ammeter to test how changing resistance shifts loop current.' },
    { id: 'rc-charging', label: 'RC Charging', topic: 'Time Constant', grades: 'Gr 9–12', mode: 'rc-charging',
      cue: 'Probe capacitor voltage on the scope after closing the switch and observe how R shapes the curve.' },
    { id: 'voltage-divider', label: 'Voltage Divider', topic: 'Series Tap Node', grades: 'Gr 8–12', mode: 'voltage-divider',
      cue: 'Tap the midpoint between two resistors to investigate how resistance ratio splits supply voltage.' },
    { id: 'logic-gates', label: 'Logic Gates', topic: 'Digital AND / OR', grades: 'Gr 9–12', mode: 'logic-gates',
      cue: 'Toggle digital inputs A and B to test gate outputs and verify truth-table behavior live.' },
    { id: 'short-circuit', label: 'Short Circuit', topic: 'Low-R Bypass', grades: 'Gr 6–10', mode: 'short-circuit',
      cue: 'Compare normal load current against an unintended low-resistance path and see why fuses matter.' }
  ];

  window.StemLab.registerTool('circuitShelf', {
    icon: '\uD83D\uDD0B',
    label: 'Circuit Shelf',
    desc: 'Build and run real electronic circuits in CircuitJS — Paul Falstad’s open-source simulator — wrapped in a Predict → Explore → Explain coach. Pick a challenge, lock in a guess before you wire anything, build it, then let the coach compare what you predicted with what the meters actually read.',
    color: 'amber',
    category: 'engineering',
    aliases: ['circuits', 'CircuitJS', 'electronics', 'Ohm law'],
    questHooks: [
      { id: 'cc_open', label: 'Open the circuit simulator', icon: '🔌',
        check: function (d) { return !!(d && d.opened); } },
      { id: 'cc_predict', label: 'Lock in a prediction before building', icon: '🔮',
        check: function (d) { return !!(d && (d.predictedCount || 0) >= 1); } },
      { id: 'cc_debrief', label: 'Compare a prediction with what the meters read', icon: '📝',
        check: function (d) { return !!(d && (d.debriefCount || 0) >= 1); } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;

      var theme = (ctx.isContrast || ctx.theme === 'contrast') ? 'contrast' : (ctx.theme === 'light' ? 'light' : ((ctx.isDark || ctx.theme === 'dark') ? 'dark' : 'dark'));
      var isLight = theme === 'light';
      var isContrast = theme === 'contrast';

      var shelfData = (ctx.toolData && typeof ctx.toolData === 'object' && ctx.toolData._circuitShelf && typeof ctx.toolData._circuitShelf === 'object')
        ? ctx.toolData._circuitShelf : {};
      var returnTool = shelfData.returnTool === 'circuit' ? 'circuit' : null;
      var openedCount = Math.max(0, Math.floor(Number(shelfData.openedCount) || (shelfData.opened ? 1 : 0)));
      var predictedCount = Math.max(0, Math.floor(Number(shelfData.predictedCount) || 0));
      var debriefCount = Math.max(0, Math.floor(Number(shelfData.debriefCount) || 0));

      var _win = React.useRef((_circuitshelfPopup && !_circuitshelfPopup.closed) ? _circuitshelfPopup : null);

      React.useEffect(function () {
        var popup = (_win.current && !_win.current.closed) ? _win.current : ((_circuitshelfPopup && !_circuitshelfPopup.closed) ? _circuitshelfPopup : null);
        if (!popup || popup.closed) return;
        _win.current = popup;
        var activeTheme = (ctx.isContrast || ctx.theme === 'contrast') ? 'contrast' : (ctx.theme === 'light' ? 'light' : 'dark');
        try { popup.postMessage({ type: 'alloflow-theme-change', theme: activeTheme }, CIRCUIT_SHELF_ORIGIN); } catch (_) {}
      }, [ctx.theme]);
      var _st = React.useState('idle'); var popupState = _st[0], setPopupState = _st[1];
      var _sel = React.useState(''); var selectedId = _sel[0], setSelectedId = _sel[1];

      var selectedStarter = CIRCUIT_STARTERS[0];
      for (var ci = 0; ci < CIRCUIT_STARTERS.length; ci++) {
        if (CIRCUIT_STARTERS[ci].id === selectedId) { selectedStarter = CIRCUIT_STARTERS[ci]; break; }
      }

      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');
      var presetsLocked = !!(ctx.quizMode || ctx.teacherLock || (ctx.toolData && typeof ctx.toolData === 'object' && ctx.toolData._teacherLocked));

      function bumpSlice(key) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function (prev) {
          var base = (prev && typeof prev === 'object') ? prev : {};
          var cur = Object.assign({}, (base._circuitShelf && typeof base._circuitShelf === 'object') ? base._circuitShelf : {});
          cur[key] = (Number(cur[key]) || 0) + 1;
          if (key === 'openedCount') cur.opened = true;
          var next = Object.assign({}, base); next._circuitShelf = cur; return next;
        });
      }

      // ── AI bridge ──
      var _onMsgRef = React.useRef(null);
      _onMsgRef.current = function (ev) {
        var data = ev && ev.data;
        if (!data || typeof data.type !== 'string') return;
        var activePopup = (_win.current && !_win.current.closed) ? _win.current : ((_circuitshelfPopup && !_circuitshelfPopup.closed) ? _circuitshelfPopup : null);
        if (activePopup && !_win.current) _win.current = activePopup;
        if (!_circuitshelfBridgeTrusted(ev, activePopup)) return;
        if (data.type === 'alloccircuit-hello') {
          try { if (ev.source) ev.source.postMessage({ type: 'alloccircuit-ready', ai: aiOn }, CIRCUIT_SHELF_ORIGIN); } catch (_) {}
          setPopupState('open');
          return;
        }
        if (data.type === 'alloccircuit-closed') { setPopupState('closed'); return; }
        if (data.type === 'alloccircuit-predicted') { bumpSlice('predictedCount'); return; }
        if (data.type !== 'alloccircuit-ai-request' || !data.id) return;
        var replyTo = ev.source || activePopup;
        var respond = function (payload) {
          try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'alloccircuit-ai-response', id: data.id }, payload), CIRCUIT_SHELF_ORIGIN); } catch (_) {}
        };
        if (!aiOn) { respond({ error: 'ai-disabled' }); return; }
        bumpSlice('debriefCount');
        var prompt = buildDebriefPrompt(data.challenge, data.prediction, data.explanation);
        Promise.resolve().then(function () {
          return ctx.callGemini(prompt, false, false, 0.7);
        }).then(function (resp) {
          var text = (typeof resp === 'string') ? resp : ((resp && (resp.text || resp.output || resp.response)) || '');
          respond({ text: String(text || '').slice(0, 1000) });
        }).catch(function (e) {
          respond({ error: String((e && e.message) || e).slice(0, 120) });
        });
      };
      React.useEffect(function () {
        function onMsg(ev) { if (_onMsgRef.current) _onMsgRef.current(ev); }
        window.addEventListener('message', onMsg);
        return function () { window.removeEventListener('message', onMsg); };
      }, [aiOn]);

      function openShelf(overrideId) {
        var idToOpen = typeof overrideId === 'string' ? overrideId : selectedId;
        var existing = (_win.current && !_win.current.closed) ? _win.current : ((_circuitshelfPopup && !_circuitshelfPopup.closed) ? _circuitshelfPopup : null);
        if (existing && !existing.closed && !idToOpen) { _win.current = existing; try { existing.focus(); } catch (_) {} return; }
        var lang = (ctx.lang || 'en');
        var url = CIRCUIT_SHELF_URL + '&lang=' + encodeURIComponent(lang) + '&theme=' + encodeURIComponent(ctx.theme || 'dark');
        if (idToOpen) url += '&challenge=' + encodeURIComponent(idToOpen);
        var w = null;
        try { w = window.open(url, 'alloflow-circuit-shelf', 'width=1280,height=860'); } catch (_) { w = null; }
        if (!w) {
          setPopupState('blocked');
          if (announceToSR) announceToSR(t('stem.circuitShelf.popup_blocked', 'The Circuit Shelf window was blocked. Allow pop-ups for this page, then try again.'));
          return;
        }
        _win.current = w;
        _circuitshelfPopup = w;
        setPopupState('opening');
        bumpSlice('openedCount');
        if (announceToSR) announceToSR(t('stem.circuitShelf.opened_sr', 'Opened the Circuit Shelf in a new window.'));
      }

      function returnToLab() {
        if (typeof setStemLabTool !== 'function') return;
        setStemLabTool(returnTool || null);
        if (announceToSR) announceToSR(returnTool ? t('stem.circuitShelf.returned_sr', 'Returned to Circuit Builder.') : t('stem.circuitShelf.returned_catalog_sr', 'Returned to the STEAM Lab tools.'));
      }

      var pal = isContrast ? {
        shellBg: '#000000', shellBorder: '#ffff00',
        heroBg: '#000000', heroBorder: '#ffff00',
        cardBg: '#000000', cardBorder: '#ffffff',
        subBg: '#000000', subBorder: '#ffff00',
        ink: '#ffffff', muted: '#e5e7eb', accentText: '#ffff00',
        pillBg: '#000000', pillText: '#ffff00', pillBorder: '#ffff00',
        ctaBg: '#000000', ctaText: '#ffff00', ctaBorder: '#ffff00',
        chipBg: '#000000', chipText: '#ffffff', chipBorder: '#ffffff',
        chipActiveBg: '#000000', chipActiveText: '#00ff00', chipActiveBorder: '#ffff00',
        stageBg: '#000000', wire: '#00ffff', accent: '#ffff00', ok: '#66ff66', grid: '#333333'
      } : isLight ? {
        shellBg: '#ffffff', shellBorder: '#cbd5e1',
        heroBg: 'linear-gradient(128deg, #0f172a 0%, #134e4a 52%, #9a3412 100%)', heroBorder: '#f59e0b',
        cardBg: '#f8fafc', cardBorder: '#cbd5e1',
        subBg: '#fff7ed', subBorder: '#fdba74',
        ink: '#0f172a', muted: '#334155', accentText: '#9a3412',
        pillBg: 'rgba(15,23,42,0.74)', pillText: '#fde68a', pillBorder: 'rgba(253,230,138,0.45)',
        ctaBg: '#c2410c', ctaText: '#ffffff', ctaBorder: '#9a3412',
        chipBg: '#ffffff', chipText: '#0f172a', chipBorder: '#94a3b8',
        chipActiveBg: '#9a3412', chipActiveText: '#ffffff', chipActiveBorder: '#7c2d12',
        stageBg: '#09151c', wire: '#38bdf8', accent: '#fbbf24', ok: '#34d399', grid: 'rgba(56,189,248,0.14)'
      } : {
        shellBg: '#0f172a', shellBorder: '#334155',
        heroBg: 'linear-gradient(128deg, #09151c 0%, #134e4a 50%, #7c2d12 100%)', heroBorder: 'rgba(251,191,36,0.38)',
        cardBg: '#1e293b', cardBorder: '#334155',
        subBg: '#172033', subBorder: '#475569',
        ink: '#f8fafc', muted: '#cbd5e1', accentText: '#fdba74',
        pillBg: 'rgba(15,23,42,0.78)', pillText: '#fde68a', pillBorder: 'rgba(251,191,36,0.38)',
        ctaBg: '#c2410c', ctaText: '#ffffff', ctaBorder: '#fb923c',
        chipBg: '#0f172a', chipText: '#e2e8f0', chipBorder: '#475569',
        chipActiveBg: '#c2410c', chipActiveText: '#ffffff', chipActiveBorder: '#fed7aa',
        stageBg: '#071117', wire: '#38bdf8', accent: '#fbbf24', ok: '#34d399', grid: 'rgba(56,189,248,0.14)'
      };

      var statusMeta = popupState === 'open'
        ? { color: isContrast ? '#66ff66' : (isLight ? '#047857' : '#6ee7b7'), dot: '#10b981', text: t('stem.circuitShelf.open_note', 'Circuit Shelf is open. Keep this AlloFlow window open too — it powers the AI coach.') }
        : popupState === 'opening'
          ? { color: isContrast ? '#00ffff' : (isLight ? '#0369a1' : '#7dd3fc'), dot: '#38bdf8', text: t('stem.circuitShelf.opening_note', 'Opening Circuit Shelf. If it does not appear, check your pop-up settings.') }
          : popupState === 'blocked'
            ? { color: isContrast ? '#ffff00' : (isLight ? '#b45309' : '#fcd34d'), dot: '#f59e0b', text: t('stem.circuitShelf.blocked_note', 'Pop-up blocked — allow pop-ups for this page and try again.') }
            : popupState === 'closed'
              ? { color: pal.muted, dot: '#94a3b8', text: t('stem.circuitShelf.closed_note', 'Circuit Shelf was closed. You can reopen it whenever you are ready.') }
              : { color: pal.muted, dot: aiOn ? '#fbbf24' : '#94a3b8', text: t('stem.circuitShelf.ready_note', 'Ready to wire — choose a challenge schematic below or launch the full bench.') };

      // Build schematic preview SVG elements tailored to the selected CircuitJS challenge (zero answer spoilers!)
      var mode = selectedStarter.mode;
      var schematicNodes = [];
      var pinPad = function (k, x, y, col, delayIdx) {
        var delayStyle = delayIdx ? { animationDelay: (delayIdx * 0.45) + 's' } : undefined;
        return h('g', { key: k },
          !isContrast && h('circle', { className: 'cs-node-halo', cx: x, cy: y, r: 6.4, fill: col || pal.accent, opacity: 0.24, style: delayStyle }),
          h('circle', { cx: x, cy: y, r: 3.1, fill: isContrast ? '#000000' : '#0b1922', stroke: col || pal.accent, strokeWidth: 1.5 })
        );
      };
      // Common DC Battery on left with dual-pass luminous copper trace & solder pads
      schematicNodes.push(
        !isContrast && h('line', { key: 'b1g', x1: 66, y1: 36, x2: 66, y2: 64, stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
        h('line', { key: 'b1', x1: 66, y1: 36, x2: 66, y2: 64, stroke: pal.wire, strokeWidth: 2 }),
        !isContrast && h('line', { key: 'b2g', x1: 50, y1: 64, x2: 82, y2: 64, stroke: pal.accent, strokeWidth: 7, opacity: 0.24, strokeLinecap: 'round' }),
        h('line', { key: 'b2', x1: 50, y1: 64, x2: 82, y2: 64, stroke: pal.accent, strokeWidth: 3, strokeLinecap: 'round' }),
        h('line', { key: 'b3', x1: 57, y1: 74, x2: 75, y2: 74, stroke: pal.accent, strokeWidth: 2, strokeLinecap: 'round' }),
        !isContrast && h('line', { key: 'b4g', x1: 66, y1: 74, x2: 66, y2: 112, stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
        h('line', { key: 'b4', x1: 66, y1: 74, x2: 66, y2: 112, stroke: pal.wire, strokeWidth: 2 }),
        pinPad('bp1', 66, 36, pal.wire, 0),
        pinPad('bp2', 66, 112, pal.wire, 1),
        h('text', { key: 'bt', x: 34, y: 74, fill: '#f8fafc', fontSize: 11, fontWeight: 700 }, 'V')
      );
      if (mode === 'rc-charging') {
        schematicNodes.push(
          !isContrast && h('polyline', { key: 'rcwg', points: '66,36 120,36 128,26 138,46 148,26 158,46 168,26 176,36 250,36 250,62', fill: 'none', stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
          h('polyline', { key: 'rcw', points: '66,36 120,36 128,26 138,46 148,26 158,46 168,26 176,36 250,36 250,62', fill: 'none', stroke: pal.wire, strokeWidth: 2 }),
          !isContrast && h('polyline', { key: 'rcwf', className: 'cs-current-trace', points: '66,36 120,36 128,26 138,46 148,26 158,46 168,26 176,36 250,36 250,62', stroke: '#bae6fd', strokeWidth: 1.8 }),
          !isContrast && h('line', { key: 'c1g', x1: 234, y1: 62, x2: 266, y2: 62, stroke: pal.accent, strokeWidth: 7, opacity: 0.24, strokeLinecap: 'round' }),
          h('line', { key: 'c1', x1: 234, y1: 62, x2: 266, y2: 62, stroke: pal.accent, strokeWidth: 3, strokeLinecap: 'round' }),
          h('line', { key: 'c2', x1: 234, y1: 74, x2: 266, y2: 74, stroke: pal.accent, strokeWidth: 3, strokeLinecap: 'round' }),
          !isContrast && h('polyline', { key: 'rcbg', points: '250,74 250,112 66,112', fill: 'none', stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
          h('polyline', { key: 'rcb', points: '250,74 250,112 66,112', fill: 'none', stroke: pal.wire, strokeWidth: 2 }),
          !isContrast && h('polyline', { key: 'rcbf', className: 'cs-current-trace', points: '250,74 250,112 66,112', stroke: '#bae6fd', strokeWidth: 1.8 }),
          pinPad('rcp1', 250, 36, pal.accent, 2),
          pinPad('rcp2', 250, 112, pal.wire, 3),
          h('text', { key: 'rl', x: 148, y: 20, textAnchor: 'middle', fill: pal.accent, fontSize: 11, fontWeight: 700 }, 'R'),
          h('text', { key: 'cl', x: 274, y: 72, fill: pal.accent, fontSize: 11, fontWeight: 700 }, 'C'),
          // Scope preview panel (dotted inquiry curve — no spoiler label)
          h('rect', { key: 'scb', x: 332, y: 22, width: 286, height: 96, rx: 8, fill: isContrast ? '#000000' : 'url(#cs-scope-bg)', stroke: pal.ok, strokeWidth: 1.4 }),
          h('line', { key: 'scg', x1: 348, y1: 98, x2: 602, y2: 98, stroke: '#475569', strokeWidth: 1 }),
          !isContrast && h('path', { key: 'sccg', d: 'M352 96 Q410 46 594 40', fill: 'none', stroke: pal.ok, strokeWidth: 6, opacity: 0.22 }),
          h('path', { key: 'scc', className: 'cs-scope-trace', d: 'M352 96 Q410 46 594 40', fill: 'none', stroke: pal.ok, strokeWidth: 2, strokeDasharray: '5 4' }),
          h('text', { key: 'sct', x: 350, y: 38, fill: '#e2e8f0', fontSize: 11, fontWeight: 700 }, t('stem.circuitShelf.svg_scope_rc', 'SCOPE: Vc(t) = ?'))
        );
      } else if (mode === 'voltage-divider') {
        schematicNodes.push(
          !isContrast && h('polyline', { key: 'vd1g', points: '66,36 220,36 220,48 210,54 230,62 210,70 220,76 220,84 210,90 230,98 210,104 220,112 66,112', fill: 'none', stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
          h('polyline', { key: 'vd1', points: '66,36 220,36 220,48 210,54 230,62 210,70 220,76 220,84 210,90 230,98 210,104 220,112 66,112', fill: 'none', stroke: pal.wire, strokeWidth: 2 }),
          !isContrast && h('polyline', { key: 'vd1f', className: 'cs-current-trace', points: '66,36 220,36 220,48 210,54 230,62 210,70 220,76 220,84 210,90 230,98 210,104 220,112 66,112', stroke: '#bae6fd', strokeWidth: 1.8 }),
          !isContrast && h('line', { key: 'vdtg', x1: 220, y1: 78, x2: 292, y2: 78, stroke: pal.accent, strokeWidth: 6, opacity: 0.24 }),
          h('line', { key: 'vdt', x1: 220, y1: 78, x2: 292, y2: 78, stroke: pal.accent, strokeWidth: 2 }),
          !isContrast && h('line', { key: 'vdtf', className: 'cs-current-trace', x1: 220, y1: 78, x2: 292, y2: 78, stroke: '#fef08a', strokeWidth: 1.6 }),
          pinPad('vdp', 220, 78, pal.accent, 2),
          !isContrast && h('circle', { key: 'vdmg', className: 'cs-node-halo', cx: 312, cy: 78, r: 21, fill: pal.accent, opacity: 0.18 }),
          h('circle', { key: 'vdm', cx: 312, cy: 78, r: 16, fill: isContrast ? '#000000' : '#0f212b', stroke: pal.accent, strokeWidth: 1.8 }),
          h('text', { key: 'vdl', x: 312, y: 82, textAnchor: 'middle', fill: pal.accent, fontSize: 11, fontWeight: 800 }, 'V?'),
          h('text', { key: 'r1t', x: 194, y: 65, fill: '#f8fafc', fontSize: 11, fontWeight: 700 }, 'R1'),
          h('text', { key: 'r2t', x: 194, y: 100, fill: '#f8fafc', fontSize: 11, fontWeight: 700 }, 'R2'),
          h('text', { key: 'vdt2', x: 344, y: 74, fill: '#e2e8f0', fontSize: 11, fontWeight: 700 }, t('stem.circuitShelf.svg_vout', 'Tap node Vout')),
          h('text', { key: 'vdt3', x: 344, y: 92, fill: '#cbd5e1', fontSize: 11 }, t('stem.circuitShelf.svg_vout_sub', 'Measure & compare ratio'))
        );
      } else if (mode === 'logic-gates') {
        schematicNodes.push(
          !isContrast && h('line', { key: 'lag', x1: 110, y1: 50, x2: 185, y2: 50, stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
          h('line', { key: 'la', x1: 110, y1: 50, x2: 185, y2: 50, stroke: pal.wire, strokeWidth: 2 }),
          !isContrast && h('line', { key: 'laf', className: 'cs-current-trace', x1: 110, y1: 50, x2: 185, y2: 50, stroke: '#bae6fd', strokeWidth: 1.6 }),
          !isContrast && h('line', { key: 'lbg', x1: 110, y1: 92, x2: 185, y2: 92, stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
          h('line', { key: 'lb', x1: 110, y1: 92, x2: 185, y2: 92, stroke: pal.wire, strokeWidth: 2 }),
          !isContrast && h('line', { key: 'lbf', className: 'cs-current-trace', x1: 110, y1: 92, x2: 185, y2: 92, stroke: '#bae6fd', strokeWidth: 1.6, style: { animationDelay: '-1.1s' } }),
          pinPad('lp1', 110, 50, pal.accent, 2),
          pinPad('lp2', 110, 92, pal.accent, 3),
          h('text', { key: 'lat', x: 96, y: 54, fill: pal.accent, fontSize: 12, fontWeight: 700 }, 'A'),
          h('text', { key: 'lbt', x: 96, y: 96, fill: pal.accent, fontSize: 12, fontWeight: 700 }, 'B'),
          !isContrast && h('path', { key: 'lgg', d: 'M185 36 L225 36 A35 35 0 0 1 225 106 L185 106 Z', fill: 'none', stroke: pal.ok, strokeWidth: 6, opacity: 0.2 }),
          h('path', { key: 'lg', d: 'M185 36 L225 36 A35 35 0 0 1 225 106 L185 106 Z', fill: isContrast ? '#000000' : '#0f212b', stroke: pal.ok, strokeWidth: 2 }),
          h('text', { key: 'lgt', x: 218, y: 75, textAnchor: 'middle', fill: '#ffffff', fontSize: 11, fontWeight: 800 }, 'AND/OR'),
          !isContrast && h('line', { key: 'lqg', x1: 260, y1: 71, x2: 316, y2: 71, stroke: pal.ok, strokeWidth: 6, opacity: 0.24 }),
          h('line', { key: 'lq', x1: 260, y1: 71, x2: 316, y2: 71, stroke: pal.ok, strokeWidth: 2 }),
          !isContrast && h('line', { key: 'lqf', className: 'cs-current-trace', x1: 260, y1: 71, x2: 316, y2: 71, stroke: '#a7f3d0', strokeWidth: 1.7 }),
          !isContrast && h('circle', { key: 'lqcg', className: 'cs-node-halo', cx: 332, cy: 71, r: 19, fill: pal.accent, opacity: 0.18 }),
          h('circle', { key: 'lqc', cx: 332, cy: 71, r: 14, fill: isContrast ? '#000000' : '#0f212b', stroke: pal.accent, strokeWidth: 2 }),
          h('text', { key: 'lqt', x: 332, y: 75, textAnchor: 'middle', fill: pal.accent, fontSize: 11, fontWeight: 800 }, 'Q?'),
          h('text', { key: 'lgd', x: 368, y: 66, fill: '#e2e8f0', fontSize: 11, fontWeight: 700 }, t('stem.circuitShelf.svg_logic', 'Truth-Table Probe')),
          h('text', { key: 'lgd2', x: 368, y: 84, fill: '#cbd5e1', fontSize: 11 }, t('stem.circuitShelf.svg_logic_sub', 'Toggle inputs (0 / 1)'))
        );
      } else if (mode === 'short-circuit') {
        schematicNodes.push(
          !isContrast && h('polyline', { key: 'sc1g', points: '66,36 270,36 270,58', fill: 'none', stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
          h('polyline', { key: 'sc1', points: '66,36 270,36 270,58', fill: 'none', stroke: pal.wire, strokeWidth: 2 }),
          !isContrast && h('polyline', { key: 'sc1f', className: 'cs-current-trace', points: '66,36 270,36 270,58', stroke: '#bae6fd', strokeWidth: 1.7 }),
          h('circle', { key: 'scl', cx: 270, cy: 74, r: 15, fill: isContrast ? '#000000' : '#0f212b', stroke: pal.wire, strokeWidth: 2 }),
          h('text', { key: 'sclt', x: 270, y: 78, textAnchor: 'middle', fill: '#f8fafc', fontSize: 11, fontWeight: 700 }, 'R'),
          !isContrast && h('polyline', { key: 'sc2g', points: '270,89 270,112 66,112', fill: 'none', stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
          h('polyline', { key: 'sc2', points: '270,89 270,112 66,112', fill: 'none', stroke: pal.wire, strokeWidth: 2 }),
          !isContrast && h('polyline', { key: 'sc2f', className: 'cs-current-trace', points: '270,89 270,112 66,112', stroke: '#bae6fd', strokeWidth: 1.7 }),
          !isContrast && h('line', { key: 'scbg', x1: 168, y1: 36, x2: 168, y2: 112, stroke: pal.accent, strokeWidth: 7, opacity: 0.24 }),
          h('line', { key: 'scb', className: 'cs-scope-trace', x1: 168, y1: 36, x2: 168, y2: 112, stroke: pal.accent, strokeWidth: 2.5, strokeDasharray: '6 4' }),
          pinPad('scp1', 168, 36, pal.accent, 2),
          pinPad('scp2', 168, 112, pal.accent, 3),
          h('text', { key: 'sct1', x: 178, y: 78, fill: pal.accent, fontSize: 11, fontWeight: 800 }, 'Bypass ?'),
          h('text', { key: 'sct2', x: 320, y: 64, fill: '#e2e8f0', fontSize: 11, fontWeight: 700 }, t('stem.circuitShelf.svg_short', 'Compare branch current')),
          h('text', { key: 'sct3', x: 320, y: 82, fill: '#cbd5e1', fontSize: 11 }, t('stem.circuitShelf.svg_short_sub', 'Predict meter spike I = ?'))
        );
      } else {
        // Default / Series-Parallel / Ohm's Law interactive loop + meter bench
        schematicNodes.push(
          !isContrast && h('polyline', { key: 'df1g', points: '66,36 150,36', fill: 'none', stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
          h('polyline', { key: 'df1', points: '66,36 150,36', fill: 'none', stroke: pal.wire, strokeWidth: 2 }),
          !isContrast && h('polyline', { key: 'df1f', className: 'cs-current-trace', points: '66,36 150,36', stroke: '#bae6fd', strokeWidth: 1.8 }),
          !isContrast && h('circle', { key: 'dfag', className: 'cs-node-halo', cx: 168, cy: 36, r: 20, fill: pal.ok, opacity: 0.18 }),
          h('circle', { key: 'dfa', cx: 168, cy: 36, r: 15, fill: isContrast ? '#000000' : '#0f212b', stroke: pal.ok, strokeWidth: 2 }),
          h('text', { key: 'dfat', x: 168, y: 40, textAnchor: 'middle', fill: pal.ok, fontSize: 11, fontWeight: 800 }, 'A?'),
          !isContrast && h('polyline', { key: 'df2g', points: '183,36 270,36 270,58', fill: 'none', stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
          h('polyline', { key: 'df2', points: '183,36 270,36 270,58', fill: 'none', stroke: pal.wire, strokeWidth: 2 }),
          !isContrast && h('polyline', { key: 'df2f', className: 'cs-current-trace', points: '183,36 270,36 270,58', stroke: '#bae6fd', strokeWidth: 1.8 }),
          !isContrast && h('circle', { key: 'dflg', className: 'cs-node-halo', cx: 270, cy: 74, r: 21, fill: pal.accent, opacity: 0.2, style: { animationDelay: '-1.5s' } }),
          h('circle', { key: 'dfl', cx: 270, cy: 74, r: 15, fill: isContrast ? '#000000' : '#0f212b', stroke: pal.accent, strokeWidth: 2 }),
          h('line', { key: 'dfx1', x1: 261, y1: 65, x2: 279, y2: 83, stroke: pal.accent, strokeWidth: 1.6 }),
          h('line', { key: 'dfx2', x1: 279, y1: 65, x2: 261, y2: 83, stroke: pal.accent, strokeWidth: 1.6 }),
          !isContrast && h('polyline', { key: 'df3g', points: '270,89 270,112 66,112', fill: 'none', stroke: pal.wire, strokeWidth: 6, opacity: 0.2 }),
          h('polyline', { key: 'df3', points: '270,89 270,112 66,112', fill: 'none', stroke: pal.wire, strokeWidth: 2 }),
          !isContrast && h('polyline', { key: 'df3f', className: 'cs-current-trace', points: '270,89 270,112 66,112', stroke: '#bae6fd', strokeWidth: 1.8 }),
          pinPad('dfp1', 270, 36, pal.wire, 2),
          pinPad('dfp2', 270, 112, pal.wire, 3),
          // Bench POE readouts on right
          h('rect', { key: 'p1', x: 326, y: 24, width: 294, height: 92, rx: 10, fill: isContrast ? '#000000' : 'url(#cs-scope-bg)', stroke: isContrast ? '#ffff00' : 'rgba(56,189,248,0.34)', strokeWidth: 1.4 }),
          !isContrast && h('line', { key: 'p1sh', x1: 336, y1: 25.5, x2: 610, y2: 25.5, stroke: '#bae6fd', strokeWidth: 0.9, opacity: 0.3 }),
          h('text', { key: 'p1t', x: 344, y: 46, fill: pal.accent, fontSize: 11, fontWeight: 800 }, '1. PREDICT  →  2. WIRE  →  3. MEASURE'),
          h('text', { key: 'p1a', x: 344, y: 69, fill: '#f8fafc', fontSize: 11 }, t('stem.circuitShelf.svg_bench_line1', 'Commit your prediction before wiring.')),
          h('text', { key: 'p1b', x: 344, y: 89, fill: '#cbd5e1', fontSize: 11 }, t('stem.circuitShelf.svg_bench_line2', 'Hover parts or open Scope to read V & I.'))
        );
      }

      return h('div', {
        'data-circuitshelf-workbench': 'true',
        className: 'flex flex-col gap-4 animate-in fade-in duration-300 w-full max-w-3xl mx-auto',
        style: {
          backgroundColor: pal.shellBg,
          border: (isContrast ? '2px' : '1px') + ' solid ' + pal.shellBorder,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: isContrast ? 'none' : '0 14px 32px -12px rgba(15, 23, 42, 0.35)'
        }
      },
        // ── Hero Workbench Header ──
        h('div', {
          className: 'px-4 py-4 sm:px-5',
          style: {
            backgroundColor: isContrast ? '#000000' : '#0f172a',
            backgroundImage: isContrast ? 'none' : pal.heroBg,
            borderBottom: (isContrast ? '2px' : '1px') + ' solid ' + pal.heroBorder,
            color: '#ffffff'
          }
        },
          h('div', { className: 'flex flex-wrap items-center gap-3' },
            typeof setStemLabTool === 'function' && h('button', {
              type: 'button',
              onClick: returnToLab,
              className: 'inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-[0.98]',
              style: {
                backgroundColor: isContrast ? '#000000' : 'rgba(15,23,42,0.74)',
                color: isContrast ? '#ffff00' : '#ffffff',
                border: '1px solid ' + (isContrast ? '#ffff00' : 'rgba(253,230,138,0.4)')
              },
              'aria-label': returnTool ? t('stem.circuitShelf.back_to_builder', 'Back to Circuit Builder') : t('stem.circuitShelf.back_to_tools', 'Back to STEAM Lab tools')
            },
              ArrowLeft ? h(ArrowLeft, { size: 16 }) : null,
              h('span', null, returnTool ? t('stem.circuitShelf.back_to_builder', 'Back to Circuit Builder') : t('stem.circuitShelf.back_to_tools', 'Back to STEAM Lab tools'))
            ),
            h('div', { className: 'flex flex-wrap items-center gap-2 ml-auto', style: { minWidth: 0 } },
              h('span', {
                className: 'rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
                style: { backgroundColor: pal.pillBg, color: pal.pillText, border: '1px solid ' + pal.pillBorder }
              }, t('stem.circuitShelf.pill_builds', '6 CircuitJS Builds')),
              h('span', {
                className: 'rounded-full px-2.5 py-1 text-xs font-bold',
                style: { backgroundColor: pal.pillBg, color: isContrast ? '#ffffff' : (aiOn ? '#6ee7b7' : '#e2e8f0'), border: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(255,255,255,0.28)') }
              }, aiOn ? t('stem.circuitShelf.pill_ai_on', 'AI Coach Ready') : t('stem.circuitShelf.pill_ai_off', 'Self-Guided Prompts'))
            )
          ),
          h('div', { className: 'mt-3.5 flex items-start gap-3.5' },
            // Bespoke inline SVG PCB / resistor / scope emblem
            h('svg', { width: 48, height: 48, viewBox: '0 0 48 48', 'aria-hidden': 'true', style: { flexShrink: 0 } },
              h('defs', null,
                h('radialGradient', { id: 'cs-emb-bg', cx: '35%', cy: '30%', r: '72%' },
                  h('stop', { offset: '0%', stopColor: '#134e4a' }),
                  h('stop', { offset: '55%', stopColor: '#09151c' }),
                  h('stop', { offset: '100%', stopColor: '#020617' })
                )
              ),
              h('rect', { x: 2, y: 2, width: 44, height: 44, rx: 12, fill: isContrast ? '#000000' : 'url(#cs-emb-bg)', stroke: isContrast ? '#ffff00' : '#fb923c', strokeWidth: 1.6 }),
              !isContrast && h('path', { d: 'M10 5.5 H38', stroke: '#fed7aa', strokeWidth: 0.9, opacity: 0.4, strokeLinecap: 'round' }),
              !isContrast && h('polyline', { points: '8,24 14,24 17,15 22,33 27,15 32,33 35,24 40,24', fill: 'none', stroke: '#fbbf24', strokeWidth: 5.5, opacity: 0.24, strokeLinejoin: 'round', strokeLinecap: 'round' }),
              h('polyline', { points: '8,24 14,24 17,15 22,33 27,15 32,33 35,24 40,24', fill: 'none', stroke: isContrast ? '#ffff00' : '#fbbf24', strokeWidth: 2.2, strokeLinejoin: 'round', strokeLinecap: 'round' }),
              !isContrast && h('polyline', { className: 'cs-current-trace', points: '8,24 14,24 17,15 22,33 27,15 32,33 35,24 40,24', stroke: '#fef08a', strokeWidth: 1.4 }),
              !isContrast && h('circle', { className: 'cs-node-halo', cx: 10, cy: 12, r: 5.5, fill: '#38bdf8', opacity: 0.24 }),
              h('circle', { cx: 10, cy: 12, r: 2.8, fill: isContrast ? '#00ffff' : '#38bdf8', stroke: '#ffffff', strokeWidth: 0.8 }),
              !isContrast && h('circle', { className: 'cs-node-halo', cx: 38, cy: 36, r: 5.5, fill: '#34d399', opacity: 0.24, style: { animationDelay: '-1.5s' } }),
              h('circle', { cx: 38, cy: 36, r: 2.8, fill: isContrast ? '#66ff66' : '#34d399', stroke: '#ffffff', strokeWidth: 0.8 }),
              h('path', { d: 'M13 12 L22 12 M26 36 L35 36', stroke: isContrast ? '#00ffff' : '#38bdf8', strokeWidth: 1.4, strokeLinecap: 'round' })
            ),
            h('div', { className: 'min-w-0 flex-1' },
              h('span', {
                className: 'inline-block rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider',
                style: { backgroundColor: isContrast ? '#000000' : 'rgba(234,88,12,0.28)', color: isContrast ? '#ffff00' : '#ffedd5', border: '1px solid ' + (isContrast ? '#ffff00' : 'rgba(253,186,116,0.45)') }
              }, t('stem.circuitShelf.subject_badge', 'Electronics · CircuitJS1 Workbench')),
              h('h2', { className: 'mt-1 text-lg sm:text-xl font-extrabold tracking-tight text-white' },
                t('stem.circuitShelf.title', '🔌 Circuit Shelf — predict first, then wire it up')),
              h('p', { className: 'mt-1 text-xs sm:text-sm leading-relaxed', style: { color: isContrast ? '#ffffff' : '#ffedd5' } },
                t('stem.circuitShelf.blurb', 'Build working electronic circuits in CircuitJS — Paul Falstad’s open-source simulator, used in classrooms worldwide — with a set of Predict → Explore → Explain challenges: series vs. parallel bulbs, Ohm’s law, RC charging, voltage dividers, logic gates and more. You lock in a guess BEFORE you wire anything; afterwards the coach compares your prediction with what the meters actually read and asks one good question.'))
            )
          )
        ),

        // ── Body Workbench Content ──
        h('div', { className: 'px-4 pb-5 sm:px-5 flex flex-col gap-4', style: { minWidth: 0 } },

          // Visual Stage: Interactive Schematic & Scope Preview SVG
          h('div', {
            className: 'rounded-xl p-3 sm:p-4',
            style: { backgroundColor: pal.stageBg, border: '1px solid ' + (isContrast ? '#ffff00' : '#1e3a4c') }
          },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-2.5' },
              h('span', { className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : '#fdba74' } },
                t('stem.circuitShelf.stage_heading', 'Schematic Topology Preview') + ' · ' + selectedStarter.label),
              h('span', { className: 'text-xs font-semibold tabular-nums', style: { color: '#e2e8f0' } },
                t('stem.circuitShelf.telemetry_open', 'Opened: ') + openedCount + ' · ' +
                t('stem.circuitShelf.telemetry_pred', 'Predicted: ') + predictedCount + ' · ' +
                t('stem.circuitShelf.telemetry_debrief', 'Debriefed: ') + debriefCount)
            ),
            h('svg', {
              viewBox: '0 0 640 144',
              className: 'w-full h-auto block',
              role: 'img',
              'aria-label': t('stem.circuitShelf.stage_svg_aria', 'Schematic circuit preview diagram for the selected electronics build challenge')
            },
              h('defs', null,
                h('radialGradient', { id: 'cs-pcb-bg', cx: '32%', cy: '50%', r: '66%' },
                  h('stop', { offset: '0%', stopColor: '#0e2934' }),
                  h('stop', { offset: '65%', stopColor: '#081720' }),
                  h('stop', { offset: '100%', stopColor: '#040b11' })
                ),
                h('linearGradient', { id: 'cs-scope-bg', x1: '0', y1: '0', x2: '0', y2: '1' },
                  h('stop', { offset: '0%', stopColor: '#0c2430' }),
                  h('stop', { offset: '100%', stopColor: '#07151e' })
                ),
                h('linearGradient', { id: 'cs-copper-sheen', x1: '0', y1: '0', x2: '1', y2: '0' },
                  h('stop', { offset: '0%', stopColor: '#38bdf8', stopOpacity: 0 }),
                  h('stop', { offset: '50%', stopColor: '#fed7aa', stopOpacity: 0.45 }),
                  h('stop', { offset: '100%', stopColor: '#38bdf8', stopOpacity: 0 })
                ),
                h('clipPath', { id: 'cs-pcb-clip' },
                  h('rect', { x: 4, y: 4, width: 632, height: 136, rx: 10 })
                )
              ),
              // Crisp PCB/blueprint schematic backdrop + copper sheen + drafting grid
              !isContrast && h('rect', { x: 4, y: 4, width: 632, height: 136, rx: 10, fill: 'url(#cs-pcb-bg)', stroke: 'rgba(56,189,248,0.22)', strokeWidth: 1 }),
              !isContrast && h('g', { clipPath: 'url(#cs-pcb-clip)' },
                h('rect', { className: 'cs-pcb-sheen', x: 4, y: 4, width: 92, height: 136, fill: 'url(#cs-copper-sheen)' })
              ),
              !isContrast && [80, 160, 240, 320, 400, 480, 560].map(function (gx) {
                return h('line', { key: 'cgx-' + gx, x1: gx, y1: 16, x2: gx, y2: 128, stroke: 'rgba(56,189,248,0.08)', strokeWidth: 1 });
              }),
              !isContrast && [44, 72, 100].map(function (gy) {
                return h('line', { key: 'cgy-' + gy, x1: 16, y1: gy, x2: 624, y2: gy, stroke: 'rgba(56,189,248,0.08)', strokeWidth: 1 });
              }),
              h('line', { x1: 16, y1: 128, x2: 624, y2: 128, stroke: pal.grid, strokeWidth: 1 }),
              h('line', { x1: 16, y1: 16, x2: 624, y2: 16, stroke: pal.grid, strokeWidth: 1, strokeDasharray: '4 4' }),
              schematicNodes,
              h('text', { x: 20, y: 140, fill: isContrast ? '#ffff00' : '#fdba74', fontSize: 11, fontWeight: 600 },
                selectedStarter.topic + ' · ' + selectedStarter.grades + ' — ' + t('stem.circuitShelf.svg_footer', 'Predict meter readings before running'))
            )
          ),

          // Starter Challenge Chips
          !presetsLocked && h('div', { className: 'flex flex-col gap-2', style: { minWidth: 0 } },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
              h('span', { className: 'text-xs font-bold uppercase tracking-wider', style: { color: pal.accentText } },
                t('stem.circuitShelf.starters_label', 'Choose a Starter Build Challenge')),
              h('span', { className: 'text-xs', style: { color: pal.muted } },
                selectedStarter.topic + ' · ' + selectedStarter.grades)
            ),
            h('div', {
              role: 'group',
              'aria-label': t('stem.circuitShelf.starters_group_aria', 'Circuit build challenge presets'),
              className: 'flex flex-wrap gap-2'
            },
              CIRCUIT_STARTERS.map(function (item) {
                var active = item.id === selectedId;
                return h('button', {
                  key: item.id || 'all',
                  type: 'button',
                  'aria-pressed': active ? 'true' : 'false',
                  onClick: function () { setSelectedId(item.id); },
                  className: 'min-h-11 rounded-xl px-3 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                  style: {
                    backgroundColor: active ? pal.chipActiveBg : pal.chipBg,
                    color: active ? pal.chipActiveText : pal.chipText,
                    border: (active && isContrast ? '2px solid ' : '1px solid ') + (active ? pal.chipActiveBorder : pal.chipBorder),
                    textDecoration: active && isContrast ? 'underline' : undefined
                  }
                }, item.label);
              })
            ),
            h('p', {
              className: 'rounded-xl px-3.5 py-2.5 text-xs leading-relaxed',
              style: { backgroundColor: pal.subBg, color: pal.ink, border: '1px solid ' + pal.subBorder }
            },
              h('strong', { style: { color: pal.accentText } }, selectedStarter.label + ': '),
              selectedStarter.cue
            )
          ),

          // Launch Action Bar + Live Status
          h('div', {
            className: 'flex flex-wrap items-center gap-3 rounded-xl p-3.5',
            style: { backgroundColor: pal.cardBg, border: '1px solid ' + pal.cardBorder }
          },
            h('button', {
              type: 'button',
              onClick: function () { openShelf(); },
              className: 'min-h-11 px-5 py-3 rounded-xl text-sm font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-[0.98]',
              style: {
                backgroundColor: pal.ctaBg,
                color: pal.ctaText,
                border: (isContrast ? '2px' : '1px') + ' solid ' + pal.ctaBorder,
                boxShadow: isContrast ? 'none' : '0 6px 16px -4px rgba(194, 65, 12, 0.45)'
              },
              title: t('stem.circuitShelf.open_title', 'Open the Circuit Shelf in a new window (CircuitJS simulator with the Predict-Explore-Explain coach)')
            }, selectedId
              ? (t('stem.circuitShelf.open_selected_prefix', '🔌 Launch Build: ') + selectedStarter.label)
              : t('stem.circuitShelf.open', '🔌 Open Circuit Shelf')),
            h('div', {
              role: 'status',
              'aria-live': 'polite',
              className: 'flex items-center gap-2 text-xs font-medium flex-1',
              style: { minWidth: 180, color: statusMeta.color }
            },
              h('span', {
                'aria-hidden': 'true',
                style: { width: 9, height: 9, borderRadius: '50%', backgroundColor: statusMeta.dot, flexShrink: 0, display: 'inline-block' }
              }),
              h('span', null, statusMeta.text)
            )
          ),

          // Privacy & AI Coach Cards
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            h('div', {
              className: 'rounded-xl p-3 text-xs leading-relaxed',
              style: { backgroundColor: pal.cardBg, border: '1px solid ' + pal.cardBorder, color: pal.muted }
            },
              h('div', { className: 'font-bold mb-1', style: { color: pal.ink } }, t('stem.circuitShelf.privacy_heading', '🔬 Private Lab Notebook')),
              t('stem.circuitShelf.note1', 'Predictions and explanations stay in the lab window — nothing is saved or graded.')
            ),
            h('div', {
              className: 'rounded-xl p-3 text-xs leading-relaxed',
              style: { backgroundColor: pal.cardBg, border: '1px solid ' + pal.cardBorder, color: pal.muted }
            },
              h('div', { className: 'font-bold mb-1', style: { color: pal.ink } }, aiOn ? t('stem.circuitShelf.coach_heading_on', '✨ Socratic Electronics Coach') : t('stem.circuitShelf.coach_heading_off', '🌱 Built-in Reflection Prompts')),
              aiOn
                ? t('stem.circuitShelf.ai_on', 'AI coach is ON — it will compare your prediction with your observations while this window stays open.')
                : t('stem.circuitShelf.ai_off', 'AI hints are off — the shelf still works, with built-in reflection prompts instead of the AI coach.')
            )
          ),

          // Attribution Footer
          h('p', { className: 'text-xs leading-relaxed', style: { color: pal.muted } },
            t('stem.circuitShelf.credit', 'Circuit simulator: CircuitJS1 by Paul Falstad and Iain Sharp (github.com/pfalstad/circuitjs1), free and open source under the GPL. The simulator loads from its host, so the shelf needs internet; offline use for School Box is on the roadmap (the GPL permits it).'))
        )
      );
    }
  });
  console.log('[StemLab] stem_tool_circuitshelf.js loaded — Circuit Shelf (CircuitJS1 + POE coach)');
})();
