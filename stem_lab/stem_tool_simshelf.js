// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEAM Lab — Sim Shelf (PhET simulations + POE coach) launcher + AI bridge
//
// The shelf itself is a COMPANION WINDOW (sim_shelf/sim_shelf.html): a
// curated set of PhET Interactive Simulations (University of Colorado
// Boulder, phet.colorado.edu — free, open, and the most researched sims in
// education; sims load from PhET's servers) wrapped in an AlloFlow
// PREDICT → EXPLORE → EXPLAIN coach. The sim is a sealed box (no internals),
// so the coach BRACKETS it: commit a prediction first, explore, then explain
// — and the AI (when enabled) Socratically compares prediction vs.
// observation. This is the "bracket tutor" counterpart to the Data Lab's
// observing tutor.
//
// Bridge (Video Studio / Data Lab pattern):
//   popup ── allosimshelf-hello ──────────▶ here (replies -ready {ai})
//   popup ── allosimshelf-ai-request ─────▶ here ── ctx.callGemini ──▶ Gemini
//   popup ◀─ allosimshelf-ai-response ──── here
//
// House rules: zero AI traffic unless ctx.aiHintsEnabled AND the student
// pressed the debrief button; nothing persisted except quest-slice counters
// in '_simShelf'.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var SIM_SHELF_CDN_URL = 'https://alloflow-cdn.pages.dev/sim_shelf/sim_shelf.html?v=1';
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
  var SIM_SHELF_URL = companionUrl('sim_shelf/sim_shelf.html?v=1', SIM_SHELF_CDN_URL);
  // Bridge trust: only the pop-up this tool opened, at the companion's own origin,
  // may drive the bridge. Opaque origins (file://) report "null", which postMessage
  // rejects as a target, so those fall back to '*' and rely on the source check.
  var SIM_SHELF_ORIGIN = (function () {
    try { var o = new URL(SIM_SHELF_URL, (window.location && window.location.href) || undefined).origin; return (o && o !== 'null') ? o : '*'; } catch (_) { return '*'; }
  })();
  var _simshelfPopup = null; // module scope: a still-open pop-up keeps working after a remount
  function _simshelfBridgeTrusted(ev, win) {
    var src = ev && ev.source;
    if (!src || (src !== win && src !== _simshelfPopup)) return false;
    return SIM_SHELF_ORIGIN === '*' || ev.origin === SIM_SHELF_ORIGIN;
  }

  function buildDebriefPrompt(sim, prediction, explanation) {
    return [
      'You are a warm, Socratic LAB COACH for a K-12 student who just ran the PhET simulation "' + String(sim || '').slice(0, 80) + '".',
      'Before exploring they PREDICTED:',
      '"' + String(prediction || '(no prediction)').slice(0, 600) + '"',
      'After exploring they EXPLAINED what they observed:',
      '"' + String(explanation || '').slice(0, 800) + '"',
      'RULES:',
      '- At most 4 sentences, ending in exactly ONE question.',
      '- First, name specifically where their prediction and observation agree or part ways — quote their own words back briefly.',
      '- Never lecture, never deliver the textbook explanation. Nudge them to run one more targeted experiment or sharpen one claim.',
      '- If their explanation is vague, ask them to pin down ONE concrete moment or measurement from the sim.',
      '- Warm, grade-appropriate, jargon-free. Plain text only.'
    ].join('\n');
  }

  var SIM_STARTERS = [
    { slug: '', label: 'Browse All 16', domain: 'All Domains', grades: 'Gr 2–12', accent: '#f59e0b',
      cue: 'Pick any physics, chemistry, biology, or math simulation from the full PhET shelf.' },
    { slug: 'forces-and-motion-basics', label: 'Forces & Motion', domain: 'Mechanics', grades: 'Gr 3–8', accent: '#f97316',
      cue: 'Test balanced vs. unbalanced forces, friction, and net force arrows before running the cart.' },
    { slug: 'energy-skate-park-basics', label: 'Energy Skate Park', domain: 'Energy', grades: 'Gr 4–9', accent: '#eab308',
      cue: 'Predict how kinetic, potential, and thermal energy trade off across ramps and friction.' },
    { slug: 'circuit-construction-kit-dc-virtual-lab', label: 'Circuit Kit (DC)', domain: 'Electricity', grades: 'Gr 5–12', accent: '#38bdf8',
      cue: 'Wire bulbs, switches, and meters to compare voltage and current in real time.' },
    { slug: 'bending-light', label: 'Bending Light', domain: 'Optics', grades: 'Gr 6–12', accent: '#a78bfa',
      cue: 'Aim a laser across glass, water, and prisms to observe reflection and refraction angles.' },
    { slug: 'gravity-and-orbits', label: 'Gravity & Orbits', domain: 'Space', grades: 'Gr 5–10', accent: '#60a5fa',
      cue: 'Adjust planet mass and velocity to predict circular, elliptical, or escape trajectories.' },
    { slug: 'natural-selection', label: 'Natural Selection', domain: 'Biology', grades: 'Gr 6–12', accent: '#34d399',
      cue: 'Introduce traits and environmental pressures to track how populations shift over generations.' },
    { slug: 'fraction-matcher', label: 'Fraction Matcher', domain: 'Math', grades: 'Gr 2–6', accent: '#fb7185',
      cue: 'Match visual area models, number lines, and equivalent fractions across challenge levels.' }
  ];

  window.StemLab.registerTool('simShelf', {
    icon: '\uD83C\uDF9A\uFE0F',
    label: 'Sim Shelf',
    desc: 'A shelf of PhET simulations — the most researched sims in education — wrapped in a Predict → Explore → Explain coach. Lock in a guess before you touch anything, experiment freely, then let the coach compare what you predicted with what you saw.',
    color: 'amber',
    category: 'science',
    aliases: ['PhET', 'simulations', 'physics', 'predict explore explain'],
    questHooks: [
      { id: 'ss_open', label: 'Open a simulation', icon: '🧪',
        check: function (d) { return !!(d && d.opened); } },
      { id: 'ss_predict', label: 'Lock in a prediction before exploring', icon: '🔮',
        check: function (d) { return !!(d && (d.predictedCount || 0) >= 1); } },
      { id: 'ss_debrief', label: 'Compare a prediction with what you saw', icon: '📝',
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

      var theme = ctx.theme === 'light' || ctx.theme === 'contrast' ? ctx.theme : 'dark';
      var isLight = theme === 'light';
      var isContrast = theme === 'contrast';

      var rawShelf = (ctx.toolData && typeof ctx.toolData === 'object' && ctx.toolData._simShelf && typeof ctx.toolData._simShelf === 'object')
        ? ctx.toolData._simShelf : {};
      var openedCount = Math.max(0, Math.floor(Number(rawShelf.openedCount) || (rawShelf.opened ? 1 : 0)));
      var predictedCount = Math.max(0, Math.floor(Number(rawShelf.predictedCount) || 0));
      var debriefCount = Math.max(0, Math.floor(Number(rawShelf.debriefCount) || 0));

      var _win = React.useRef(null);

      React.useEffect(function () {
        var popup = _win.current;
        if (!popup || popup.closed) return;
        var activeTheme = ctx.theme === 'light' || ctx.theme === 'contrast' ? ctx.theme : 'dark';
        try { popup.postMessage({ type: 'alloflow-theme-change', theme: activeTheme }, SIM_SHELF_ORIGIN); } catch (_) {}
      }, [ctx.theme]);
      var _st = React.useState('idle'); var popupState = _st[0], setPopupState = _st[1];
      var _sel = React.useState(''); var selectedSlug = _sel[0], setSelectedSlug = _sel[1];

      var selectedStarter = SIM_STARTERS[0];
      for (var si = 0; si < SIM_STARTERS.length; si++) {
        if (SIM_STARTERS[si].slug === selectedSlug) { selectedStarter = SIM_STARTERS[si]; break; }
      }

      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');
      var presetsLocked = !!(ctx.quizMode || ctx.teacherLock || (ctx.toolData && typeof ctx.toolData === 'object' && ctx.toolData._teacherLocked));

      function bumpSlice(key) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function (prev) {
          var base = (prev && typeof prev === 'object') ? prev : {};
          var cur = Object.assign({}, (base._simShelf && typeof base._simShelf === 'object') ? base._simShelf : {});
          cur[key] = (Number(cur[key]) || 0) + 1;
          if (key === 'openedCount') cur.opened = true;
          var next = Object.assign({}, base); next._simShelf = cur; return next;
        });
      }

      // ── AI bridge ──
      React.useEffect(function () {
        function onMsg(ev) {
          var data = ev && ev.data;
          if (!data || typeof data.type !== 'string') return;
          if (!_simshelfBridgeTrusted(ev, _win.current)) return;
          if (data.type === 'allosimshelf-hello') {
            try { if (ev.source) ev.source.postMessage({ type: 'allosimshelf-ready', ai: aiOn }, SIM_SHELF_ORIGIN); } catch (_) {}
            setPopupState('open');
            return;
          }
          if (data.type === 'allosimshelf-closed') { setPopupState('closed'); return; }
          if (data.type === 'allosimshelf-predicted') { bumpSlice('predictedCount'); return; }
          if (data.type !== 'allosimshelf-ai-request' || !data.id) return;
          var replyTo = ev.source || _win.current;
          var respond = function (payload) {
            try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'allosimshelf-ai-response', id: data.id }, payload), SIM_SHELF_ORIGIN); } catch (_) {}
          };
          if (!aiOn) { respond({ error: 'ai-disabled' }); return; }
          bumpSlice('debriefCount');
          var prompt = buildDebriefPrompt(data.sim, data.prediction, data.explanation);
          Promise.resolve().then(function () {
            return ctx.callGemini(prompt, false, false, 0.7);
          }).then(function (resp) {
            var text = (typeof resp === 'string') ? resp : ((resp && (resp.text || resp.output || resp.response)) || '');
            respond({ text: String(text || '').slice(0, 1000) });
          }).catch(function (e) {
            respond({ error: String((e && e.message) || e).slice(0, 120) });
          });
        }
        window.addEventListener('message', onMsg);
        return function () { window.removeEventListener('message', onMsg); };
      }, [aiOn]);

      function openShelf(overrideSlug) {
        var slugToOpen = typeof overrideSlug === 'string' ? overrideSlug : selectedSlug;
        var existing = _win.current;
        if (existing && !existing.closed && !slugToOpen) { try { existing.focus(); } catch (_) {} return; }
        var lang = (ctx.lang || 'en');
        var url = SIM_SHELF_URL + '&lang=' + encodeURIComponent(lang) + '&theme=' + encodeURIComponent(ctx.theme || 'dark');
        if (slugToOpen) url += '&sim=' + encodeURIComponent(slugToOpen);
        var w = null;
        try { w = window.open(url, 'alloflow-sim-shelf', 'width=1280,height=840'); } catch (_) { w = null; }
        if (!w) {
          setPopupState('blocked');
          if (announceToSR) announceToSR(t('stem.simShelf.popup_blocked', 'The Sim Shelf window was blocked. Allow pop-ups for this page, then try again.'));
          return;
        }
        _win.current = w;
        _simshelfPopup = w;
        setPopupState('opening');
        bumpSlice('openedCount');
        if (announceToSR) announceToSR(t('stem.simShelf.opened_sr', 'Opened the Sim Shelf in a new window.'));
      }

      function returnToCatalog() {
        if (typeof setStemLabTool !== 'function') return;
        setStemLabTool(null);
        if (announceToSR) announceToSR(t('stem.simShelf.returned_catalog_sr', 'Returned to the STEAM Lab tools.'));
      }

      // Theme palette — WCAG 2.2 AA (>=4.5:1 text, >=3:1 controls) in Light, Dark, High-Contrast
      var pal = isContrast ? {
        shellBg: '#000000', shellBorder: '#ffff00',
        heroBg: '#000000', heroBorder: '#ffff00',
        cardBg: '#000000', cardBorder: '#ffffff',
        subBg: '#000000', subBorder: '#ffff00',
        ink: '#ffffff', muted: '#e5e7eb', accentText: '#ffff00',
        pillBg: '#000000', pillText: '#ffff00', pillBorder: '#ffff00',
        ctaBg: '#000000', ctaText: '#ffff00', ctaBorder: '#ffff00',
        chipBg: '#000000', chipText: '#ffffff', chipBorder: '#ffffff',
        chipActiveBg: '#ffff00', chipActiveText: '#000000', chipActiveBorder: '#ffff00',
        stageBg: '#000000', stageGrid: '#333333', stepDone: '#66ff66', stepIdle: '#ffffff', stepAccent: '#ffff00'
      } : isLight ? {
        shellBg: '#ffffff', shellBorder: '#cbd5e1',
        heroBg: 'linear-gradient(130deg, #1e1b4b 0%, #78350f 58%, #9a3412 100%)', heroBorder: '#f59e0b',
        cardBg: '#f8fafc', cardBorder: '#cbd5e1',
        subBg: '#fffbeb', subBorder: '#fcd34d',
        ink: '#0f172a', muted: '#334155', accentText: '#92400e',
        pillBg: 'rgba(15,23,42,0.72)', pillText: '#fef3c7', pillBorder: 'rgba(253,230,138,0.45)',
        ctaBg: '#b45309', ctaText: '#ffffff', ctaBorder: '#92400e',
        chipBg: '#ffffff', chipText: '#0f172a', chipBorder: '#94a3b8',
        chipActiveBg: '#92400e', chipActiveText: '#ffffff', chipActiveBorder: '#78350f',
        stageBg: '#0f172a', stageGrid: 'rgba(148,163,184,0.18)', stepDone: '#34d399', stepIdle: '#94a3b8', stepAccent: '#fbbf24'
      } : {
        shellBg: '#0f172a', shellBorder: '#334155',
        heroBg: 'linear-gradient(130deg, #0f172a 0%, #451a03 58%, #7c2d12 100%)', heroBorder: 'rgba(251,191,36,0.38)',
        cardBg: '#1e293b', cardBorder: '#334155',
        subBg: '#172033', subBorder: '#475569',
        ink: '#f8fafc', muted: '#cbd5e1', accentText: '#fcd34d',
        pillBg: 'rgba(15,23,42,0.76)', pillText: '#fde68a', pillBorder: 'rgba(251,191,36,0.38)',
        ctaBg: '#b45309', ctaText: '#ffffff', ctaBorder: '#f59e0b',
        chipBg: '#0f172a', chipText: '#e2e8f0', chipBorder: '#475569',
        chipActiveBg: '#d97706', chipActiveText: '#0f172a', chipActiveBorder: '#fde68a',
        stageBg: '#090f1d', stageGrid: 'rgba(148,163,184,0.16)', stepDone: '#34d399', stepIdle: '#94a3b8', stepAccent: '#fbbf24'
      };

      var statusMeta = popupState === 'open'
        ? { color: isContrast ? '#66ff66' : (isLight ? '#047857' : '#6ee7b7'), dot: '#10b981', text: t('stem.simShelf.open_note', 'Sim Shelf is open. Keep this AlloFlow window open too — it powers the AI coach.') }
        : popupState === 'opening'
          ? { color: isContrast ? '#00ffff' : (isLight ? '#0369a1' : '#7dd3fc'), dot: '#38bdf8', text: t('stem.simShelf.opening_note', 'Opening Sim Shelf. If it does not appear, check your pop-up settings.') }
          : popupState === 'blocked'
            ? { color: isContrast ? '#ffff00' : (isLight ? '#b45309' : '#fcd34d'), dot: '#f59e0b', text: t('stem.simShelf.blocked_note', 'Pop-up blocked — allow pop-ups for this page and try again.') }
            : popupState === 'closed'
              ? { color: pal.muted, dot: '#94a3b8', text: t('stem.simShelf.closed_note', 'Sim Shelf was closed. You can reopen it whenever you are ready.') }
              : { color: pal.muted, dot: aiOn ? '#fbbf24' : '#94a3b8', text: t('stem.simShelf.ready_note', 'Ready to launch — pick a starter simulation below or open the full 16-sim shelf.') };

      var step1Done = predictedCount >= 1;
      var step2Done = openedCount >= 1;
      var step3Done = debriefCount >= 1;

      return h('div', {
        'data-simshelf-workbench': 'true',
        className: 'flex flex-col gap-4 animate-in fade-in duration-300 w-full max-w-3xl',
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
            backgroundColor: isContrast ? '#000000' : '#451a03',
            backgroundImage: isContrast ? 'none' : pal.heroBg,
            borderBottom: (isContrast ? '2px' : '1px') + ' solid ' + pal.heroBorder,
            color: '#ffffff'
          }
        },
          h('div', { className: 'flex flex-wrap items-center gap-3' },
            typeof setStemLabTool === 'function' && h('button', {
              type: 'button',
              onClick: returnToCatalog,
              className: 'inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-[0.98]',
              style: {
                backgroundColor: isContrast ? '#000000' : 'rgba(15,23,42,0.72)',
                color: isContrast ? '#ffff00' : '#ffffff',
                border: '1px solid ' + (isContrast ? '#ffff00' : 'rgba(253,230,138,0.4)')
              },
              'aria-label': t('stem.simShelf.back_to_tools', 'Back to STEAM Lab tools')
            },
              ArrowLeft ? h(ArrowLeft, { size: 16 }) : null,
              h('span', null, t('stem.simShelf.back_to_tools', 'Back to STEAM Lab tools'))
            ),
            h('div', { className: 'flex flex-wrap items-center gap-2 ml-auto', style: { minWidth: 0 } },
              h('span', {
                className: 'rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
                style: { backgroundColor: pal.pillBg, color: pal.pillText, border: '1px solid ' + pal.pillBorder }
              }, t('stem.simShelf.pill_count', '16 PhET Sims')),
              h('span', {
                className: 'rounded-full px-2.5 py-1 text-xs font-bold',
                style: { backgroundColor: pal.pillBg, color: isContrast ? '#ffffff' : (aiOn ? '#6ee7b7' : '#e2e8f0'), border: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(255,255,255,0.28)') }
              }, aiOn ? t('stem.simShelf.pill_ai_on', 'AI Coach Ready') : t('stem.simShelf.pill_ai_off', 'Self-Guided Prompts'))
            )
          ),
          h('div', { className: 'mt-3.5 flex items-start gap-3.5' },
            // Bespoke inline SVG domain emblem: pendulum + parabolic arc + energy wave
            h('svg', { width: 48, height: 48, viewBox: '0 0 48 48', 'aria-hidden': 'true', style: { flexShrink: 0 } },
              h('defs', null,
                h('radialGradient', { id: 'ss-emb-bg', cx: '35%', cy: '28%', r: '72%' },
                  h('stop', { offset: '0%', stopColor: '#312e81' }),
                  h('stop', { offset: '60%', stopColor: '#1e1b4b' }),
                  h('stop', { offset: '100%', stopColor: '#090d1f' })
                ),
                h('radialGradient', { id: 'ss-emb-bob', cx: '32%', cy: '28%', r: '68%' },
                  h('stop', { offset: '0%', stopColor: '#fef3c7' }),
                  h('stop', { offset: '45%', stopColor: '#f97316' }),
                  h('stop', { offset: '100%', stopColor: '#9a3412' })
                )
              ),
              h('rect', { x: 2, y: 2, width: 44, height: 44, rx: 12, fill: isContrast ? '#000000' : 'url(#ss-emb-bg)', stroke: isContrast ? '#ffff00' : '#fbbf24', strokeWidth: 1.6 }),
              !isContrast && h('path', { d: 'M10 5.5 H38', stroke: '#fef3c7', strokeWidth: 0.9, opacity: 0.4, strokeLinecap: 'round' }),
              !isContrast && h('path', { d: 'M10 34 Q24 10 38 32', fill: 'none', stroke: '#fbbf24', strokeWidth: 5, opacity: 0.2 }),
              h('path', { d: 'M10 34 Q24 10 38 32', fill: 'none', stroke: isContrast ? '#ffff00' : '#fbbf24', strokeWidth: 2, strokeDasharray: '3 2' }),
              h('line', { x1: 24, y1: 9, x2: 33, y2: 26, stroke: isContrast ? '#ffffff' : '#fde68a', strokeWidth: 1.8, strokeLinecap: 'round' }),
              !isContrast && h('circle', { cx: 33, cy: 26, r: 8, fill: '#f97316', opacity: 0.24 }),
              h('circle', { cx: 33, cy: 26, r: 4.8, fill: isContrast ? '#ffff00' : 'url(#ss-emb-bob)', stroke: '#ffffff', strokeWidth: 1.1 }),
              !isContrast && h('circle', { cx: 31.6, cy: 24.5, r: 1.2, fill: '#ffffff', opacity: 0.85 }),
              !isContrast && h('path', { d: 'M10 38 Q17 32 24 38 T38 38', fill: 'none', stroke: '#38bdf8', strokeWidth: 4.8, opacity: 0.22, strokeLinecap: 'round' }),
              h('path', { d: 'M10 38 Q17 32 24 38 T38 38', fill: 'none', stroke: isContrast ? '#00ffff' : '#38bdf8', strokeWidth: 1.8, strokeLinecap: 'round' }),
              h('circle', { cx: 24, cy: 9, r: 2.2, fill: '#ffffff' })
            ),
            h('div', { className: 'min-w-0 flex-1' },
              h('span', {
                className: 'inline-block rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider',
                style: { backgroundColor: isContrast ? '#000000' : 'rgba(245,158,11,0.25)', color: isContrast ? '#ffff00' : '#fef3c7', border: '1px solid ' + (isContrast ? '#ffff00' : 'rgba(253,230,138,0.45)') }
              }, t('stem.simShelf.subject_badge', 'STEM Inquiry · Predict → Explore → Explain')),
              h('h2', { className: 'mt-1 text-lg sm:text-xl font-extrabold tracking-tight text-white' },
                t('stem.simShelf.title', '🧪 Sim Shelf — predict first, then play')),
              h('p', { className: 'mt-1 text-xs sm:text-sm leading-relaxed', style: { color: isContrast ? '#ffffff' : '#fef3c7' } },
                t('stem.simShelf.blurb', 'Sixteen hand-picked PhET simulations — forces, energy, circuits, light, matter, orbits, evolution, fractions, probability and more — each wrapped in a Predict → Explore → Explain coach. You lock in a guess BEFORE touching the sim; afterwards the coach compares your prediction with what you actually saw and asks one good question.'))
            )
          )
        ),

        // ── Body Workbench Content ──
        h('div', { className: 'px-4 pb-5 sm:px-5 flex flex-col gap-4', style: { minWidth: 0 } },

          // Visual Stage: Interactive POE Inquiry Loop Diagram (SVG)
          h('div', {
            className: 'rounded-xl p-3 sm:p-4',
            style: { backgroundColor: pal.stageBg, border: '1px solid ' + (isContrast ? '#ffff00' : '#334155') }
          },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-2.5' },
              h('span', { className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : '#fde68a' } },
                t('stem.simShelf.stage_heading', 'Inquiry Protocol Stage')),
              h('span', { className: 'text-xs font-semibold tabular-nums', style: { color: '#e2e8f0' } },
                t('stem.simShelf.telemetry_line', 'Opened: ') + openedCount + ' · ' +
                t('stem.simShelf.telemetry_pred', 'Predicted: ') + predictedCount + ' · ' +
                t('stem.simShelf.telemetry_debrief', 'Debriefed: ') + debriefCount)
            ),
            h('svg', {
              viewBox: '0 0 640 132',
              className: 'w-full h-auto block',
              role: 'img',
              'aria-label': t('stem.simShelf.stage_svg_aria', 'Predict, Explore, and Explain inquiry workflow diagram showing current session progress')
            },
              h('defs', null,
                h('radialGradient', { id: 'ss-stage-glow', cx: '50%', cy: '45%', r: '62%' },
                  h('stop', { offset: '0%', stopColor: '#1e293b', stopOpacity: 0.72 }),
                  h('stop', { offset: '100%', stopColor: '#020617', stopOpacity: 0.94 })
                ),
                h('linearGradient', { id: 'ss-card-grad', x1: '0', y1: '0', x2: '0', y2: '1' },
                  h('stop', { offset: '0%', stopColor: '#1e293b' }),
                  h('stop', { offset: '100%', stopColor: '#0f172a' })
                )
              ),
              // Recessed studio preview frame & subtle calibration grid
              !isContrast && h('rect', { x: 4, y: 4, width: 632, height: 124, rx: 10, fill: 'url(#ss-stage-glow)', stroke: 'rgba(251,191,36,0.2)', strokeWidth: 1 }),
              !isContrast && h('path', { d: 'M12 18 V12 H18 M628 18 V12 H622 M12 114 V120 H18 M628 114 V120 H622', fill: 'none', stroke: 'rgba(253,230,138,0.35)', strokeWidth: 1 }),
              h('line', { x1: 20, y1: 108, x2: 620, y2: 108, stroke: pal.stageGrid, strokeWidth: 1 }),
              h('line', { x1: 20, y1: 22, x2: 620, y2: 22, stroke: pal.stageGrid, strokeWidth: 1, strokeDasharray: '4 4' }),
              // Dual-pass luminous connecting flow beams
              !isContrast && h('line', { x1: 196, y1: 64, x2: 224, y2: 64, stroke: pal.stepAccent, strokeWidth: 6.5, opacity: 0.24 }),
              h('line', { x1: 196, y1: 64, x2: 224, y2: 64, stroke: pal.stepAccent, strokeWidth: 2 }),
              h('polygon', { points: '222,59 232,64 222,69', fill: pal.stepAccent }),
              !isContrast && h('line', { x1: 412, y1: 64, x2: 440, y2: 64, stroke: pal.stepAccent, strokeWidth: 6.5, opacity: 0.24 }),
              h('line', { x1: 412, y1: 64, x2: 440, y2: 64, stroke: pal.stepAccent, strokeWidth: 2 }),
              h('polygon', { points: '438,59 448,64 438,69', fill: pal.stepAccent }),

              // Step 1: PREDICT
              !isContrast && step1Done && h('rect', { x: 16, y: 28, width: 178, height: 72, rx: 10, fill: 'none', stroke: pal.stepDone, strokeWidth: 5, opacity: 0.2 }),
              h('rect', { x: 16, y: 28, width: 178, height: 72, rx: 10, fill: isContrast ? '#000000' : 'url(#ss-card-grad)', stroke: step1Done ? pal.stepDone : pal.stepAccent, strokeWidth: 1.6 }),
              !isContrast && h('line', { x1: 26, y1: 29.5, x2: 184, y2: 29.5, stroke: '#ffffff', strokeWidth: 0.9, opacity: 0.26 }),
              !isContrast && h('circle', { cx: 36, cy: 48, r: 12.5, fill: step1Done ? pal.stepDone : pal.stepAccent, opacity: 0.22 }),
              h('circle', { cx: 36, cy: 48, r: 9, fill: step1Done ? pal.stepDone : pal.stepAccent }),
              h('text', { x: 36, y: 52, textAnchor: 'middle', fill: '#0f172a', fontSize: 11, fontWeight: 800 }, '1'),
              h('text', { x: 54, y: 52, fill: '#ffffff', fontSize: 12, fontWeight: 700 }, t('stem.simShelf.svg_step1', 'PREDICT FIRST')),
              h('text', { x: 28, y: 74, fill: '#cbd5e1', fontSize: 11 }, t('stem.simShelf.svg_step1_sub', 'Commit a guess before')),
              h('text', { x: 28, y: 89, fill: '#cbd5e1', fontSize: 11 }, t('stem.simShelf.svg_step1_sub2', 'touching controls.')),

              // Step 2: EXPLORE
              !isContrast && step2Done && h('rect', { x: 234, y: 28, width: 176, height: 72, rx: 10, fill: 'none', stroke: pal.stepDone, strokeWidth: 5, opacity: 0.2 }),
              h('rect', { x: 234, y: 28, width: 176, height: 72, rx: 10, fill: isContrast ? '#000000' : 'url(#ss-card-grad)', stroke: step2Done ? pal.stepDone : '#38bdf8', strokeWidth: 1.6 }),
              !isContrast && h('line', { x1: 244, y1: 29.5, x2: 400, y2: 29.5, stroke: '#ffffff', strokeWidth: 0.9, opacity: 0.26 }),
              !isContrast && h('circle', { cx: 254, cy: 48, r: 12.5, fill: step2Done ? pal.stepDone : '#38bdf8', opacity: 0.22 }),
              h('circle', { cx: 254, cy: 48, r: 9, fill: step2Done ? pal.stepDone : '#38bdf8' }),
              h('text', { x: 254, y: 52, textAnchor: 'middle', fill: '#0f172a', fontSize: 11, fontWeight: 800 }, '2'),
              h('text', { x: 272, y: 52, fill: '#ffffff', fontSize: 12, fontWeight: 700 }, t('stem.simShelf.svg_step2', 'EXPLORE SIM')),
              h('text', { x: 246, y: 74, fill: '#cbd5e1', fontSize: 11 }, t('stem.simShelf.svg_step2_sub', 'Test variables live in')),
              h('text', { x: 246, y: 89, fill: '#cbd5e1', fontSize: 11 }, selectedStarter.label.slice(0, 24)),

              // Step 3: EXPLAIN
              !isContrast && step3Done && h('rect', { x: 450, y: 28, width: 174, height: 72, rx: 10, fill: 'none', stroke: pal.stepDone, strokeWidth: 5, opacity: 0.2 }),
              h('rect', { x: 450, y: 28, width: 174, height: 72, rx: 10, fill: isContrast ? '#000000' : 'url(#ss-card-grad)', stroke: step3Done ? pal.stepDone : '#a78bfa', strokeWidth: 1.6 }),
              !isContrast && h('line', { x1: 460, y1: 29.5, x2: 614, y2: 29.5, stroke: '#ffffff', strokeWidth: 0.9, opacity: 0.26 }),
              !isContrast && h('circle', { cx: 470, cy: 48, r: 12.5, fill: step3Done ? pal.stepDone : '#a78bfa', opacity: 0.22 }),
              h('circle', { cx: 470, cy: 48, r: 9, fill: step3Done ? pal.stepDone : '#a78bfa' }),
              h('text', { x: 470, y: 52, textAnchor: 'middle', fill: '#0f172a', fontSize: 11, fontWeight: 800 }, '3'),
              h('text', { x: 488, y: 52, fill: '#ffffff', fontSize: 12, fontWeight: 700 }, t('stem.simShelf.svg_step3', 'EXPLAIN & CHECK')),
              h('text', { x: 462, y: 74, fill: '#cbd5e1', fontSize: 11 }, t('stem.simShelf.svg_step3_sub', 'Compare prediction vs.')),
              h('text', { x: 462, y: 89, fill: '#cbd5e1', fontSize: 11 }, aiOn ? t('stem.simShelf.svg_step3_ai', 'Socratic AI debrief.') : t('stem.simShelf.svg_step3_self', 'reflection prompts.')),

              // Active target caption inside viewBox
              h('text', { x: 20, y: 123, fill: isContrast ? '#ffff00' : '#fde68a', fontSize: 11, fontWeight: 600 },
                selectedStarter.domain + ' · ' + selectedStarter.grades + ' — ' + selectedStarter.label)
            )
          ),

          // Starter Preset Chips (hidden when teacher-locked or quiz mode)
          !presetsLocked && h('div', { className: 'flex flex-col gap-2', style: { minWidth: 0 } },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
              h('span', { className: 'text-xs font-bold uppercase tracking-wider', style: { color: pal.accentText } },
                t('stem.simShelf.starters_label', 'Quick-Launch Starter Simulations')),
              h('span', { className: 'text-xs', style: { color: pal.muted } },
                selectedStarter.domain + ' · ' + selectedStarter.grades)
            ),
            h('div', {
              role: 'group',
              'aria-label': t('stem.simShelf.starters_group_aria', 'Starter simulation presets'),
              className: 'flex flex-wrap gap-2'
            },
              SIM_STARTERS.map(function (item) {
                var active = item.slug === selectedSlug;
                return h('button', {
                  key: item.slug || 'all',
                  type: 'button',
                  'aria-pressed': active ? 'true' : 'false',
                  onClick: function () { setSelectedSlug(item.slug); },
                  className: 'min-h-11 rounded-xl px-3 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                  style: {
                    backgroundColor: active ? pal.chipActiveBg : pal.chipBg,
                    color: active ? pal.chipActiveText : pal.chipText,
                    border: '1px solid ' + (active ? pal.chipActiveBorder : pal.chipBorder)
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

          // Launch Action Bar + Live Bridge Status
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
                boxShadow: isContrast ? 'none' : '0 6px 16px -4px rgba(180, 83, 9, 0.45)'
              },
              'aria-label': t('stem.simShelf.open_title', 'Open the Sim Shelf in a new window (PhET simulations with the Predict-Explore-Explain coach)')
            }, selectedSlug
              ? (t('stem.simShelf.open_selected_prefix', '🧪 Launch: ') + selectedStarter.label)
              : t('stem.simShelf.open', '🧪 Open Sim Shelf')),
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

          // Privacy & AI Coach Notes Grid
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            h('div', {
              className: 'rounded-xl p-3 text-xs leading-relaxed',
              style: { backgroundColor: pal.cardBg, border: '1px solid ' + pal.cardBorder, color: pal.muted }
            },
              h('div', { className: 'font-bold mb-1', style: { color: pal.ink } }, t('stem.simShelf.privacy_heading', '🔬 Private Inquiry Space')),
              t('stem.simShelf.note1', 'Predictions and explanations stay in the lab window — nothing is saved or graded.')
            ),
            h('div', {
              className: 'rounded-xl p-3 text-xs leading-relaxed',
              style: { backgroundColor: pal.cardBg, border: '1px solid ' + pal.cardBorder, color: pal.muted }
            },
              h('div', { className: 'font-bold mb-1', style: { color: pal.ink } }, aiOn ? t('stem.simShelf.coach_heading_on', '✨ Socratic AI Bridge Active') : t('stem.simShelf.coach_heading_off', '🌱 Built-in Reflection Coach')),
              aiOn
                ? t('stem.simShelf.ai_on', 'AI coach is ON — it will compare your prediction with your observations while this window stays open.')
                : t('stem.simShelf.ai_off', 'AI hints are off — the shelf still works, with built-in reflection prompts instead of the AI coach.')
            )
          ),

          // Attribution footer
          h('p', { className: 'text-xs leading-relaxed', style: { color: pal.muted } },
            t('stem.simShelf.credit', 'Simulations by PhET Interactive Simulations, University of Colorado Boulder (phet.colorado.edu) — free and open, used billions of times worldwide. Sims load from PhET, so the shelf needs internet; several include PhET’s own keyboard navigation, spoken descriptions, and sonification.'))
        )
      );
    }
  });
  console.log('[StemLab] stem_tool_simshelf.js loaded — Sim Shelf (PhET + POE coach)');
})();
