// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Sim Shelf (PhET simulations + POE coach) launcher + AI bridge
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
      var isAlloHosted = /(^|\.)alloflow/i.test(host) || /(^|\.)web\.app$/i.test(host) || /(^|\.)firebaseapp\.com$/i.test(host);
      if (isDesktopBundled) return new URL(path, loc.href).toString();
      if (isLocalHost || isAlloHosted) return new URL('/' + String(path).replace(/^\/+/, ''), loc.origin).toString();
    } catch (_) {}
    return cdnUrl;
  }
  var SIM_SHELF_URL = companionUrl('sim_shelf/sim_shelf.html?v=1', SIM_SHELF_CDN_URL);

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

  window.StemLab.registerTool('simShelf', {
    icon: '🧪',
    label: 'Sim Shelf',
    desc: 'A shelf of PhET simulations — the most researched sims in education — wrapped in a Predict → Explore → Explain coach. Lock in a guess before you touch anything, experiment freely, then let the coach compare what you predicted with what you saw.',
    color: 'amber',
    category: 'general',
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

      var _win = React.useRef(null);
      var _st = React.useState('idle'); var popupState = _st[0], setPopupState = _st[1];

      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');

      function bumpSlice(key) {
        setLabToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._simShelf) || {});
          cur[key] = (cur[key] || 0) + 1;
          if (key === 'openedCount') cur.opened = true;
          var next = Object.assign({}, prev); next._simShelf = cur; return next;
        });
      }

      // ── AI bridge ──
      React.useEffect(function () {
        function onMsg(ev) {
          var data = ev && ev.data;
          if (!data || typeof data.type !== 'string') return;
          if (data.type === 'allosimshelf-hello') {
            try { if (ev.source) ev.source.postMessage({ type: 'allosimshelf-ready', ai: aiOn }, '*'); } catch (_) {}
            setPopupState('open');
            return;
          }
          if (data.type === 'allosimshelf-closed') { setPopupState('closed'); return; }
          if (data.type === 'allosimshelf-predicted') { bumpSlice('predictedCount'); return; }
          if (data.type !== 'allosimshelf-ai-request' || !data.id) return;
          var replyTo = ev.source || _win.current;
          var respond = function (payload) {
            try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'allosimshelf-ai-response', id: data.id }, payload), '*'); } catch (_) {}
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

      function openShelf() {
        var existing = _win.current;
        if (existing && !existing.closed) { try { existing.focus(); } catch (_) {} return; }
        var lang = (ctx.lang || 'en');
        var w = null;
        try { w = window.open(SIM_SHELF_URL + '&lang=' + encodeURIComponent(lang) + '&theme=' + encodeURIComponent(ctx.theme || 'dark'), 'alloflow-sim-shelf', 'width=1280,height=840'); } catch (_) { w = null; }
        if (!w) {
          setPopupState('blocked');
          if (announceToSR) announceToSR(t('stem.simShelf.popup_blocked', 'The Sim Shelf window was blocked. Allow pop-ups for this page, then try again.'));
          return;
        }
        _win.current = w;
        setPopupState('opening');
        bumpSlice('openedCount');
        if (announceToSR) announceToSR(t('stem.simShelf.opened_sr', 'Opened the Sim Shelf in a new window.'));
      }

      function returnToCatalog() {
        if (typeof setStemLabTool !== 'function') return;
        setStemLabTool(null);
        if (announceToSR) announceToSR(t('stem.simShelf.returned_catalog_sr', 'Returned to the STEM Lab tools.'));
      }

      return h('div', { className: 'flex flex-col gap-4 animate-in fade-in duration-300 max-w-2xl' },
        typeof setStemLabTool === 'function' && h('button', {
          onClick: returnToCatalog,
          className: 'inline-flex w-fit items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800 active:scale-[0.97]',
          'aria-label': t('stem.simShelf.back_to_tools', 'Back to STEM Lab tools')
        },
          ArrowLeft ? h(ArrowLeft, { size: 16 }) : null,
          h('span', null, t('stem.simShelf.back_to_tools', 'Back to STEM Lab tools'))
        ),
        h('h2', { className: 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400' },
          t('stem.simShelf.title', '🧪 Sim Shelf — predict first, then play')),
        h('p', { className: 'text-sm text-slate-300 leading-relaxed' },
          t('stem.simShelf.blurb', 'Sixteen hand-picked PhET simulations — forces, energy, circuits, light, matter, orbits, evolution, fractions, probability and more — each wrapped in a Predict → Explore → Explain coach. You lock in a guess BEFORE touching the sim; afterwards the coach compares your prediction with what you actually saw and asks one good question.')),
        h('div', { className: 'bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-xs text-slate-300 space-y-1.5' },
          h('div', null, '🔬 ' + t('stem.simShelf.note1', 'Predictions and explanations stay in the lab window — nothing is saved or graded.')),
          h('div', null, (aiOn ? '✨ ' + t('stem.simShelf.ai_on', 'AI coach is ON — it will compare your prediction with your observations while this window stays open.')
            : '🌱 ' + t('stem.simShelf.ai_off', 'AI hints are off — the shelf still works, with built-in reflection prompts instead of the AI coach.')))),
        h('button', {
          onClick: openShelf,
          className: 'px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md shadow-amber-600/20 transition-all w-fit',
          'aria-label': t('stem.simShelf.open_title', 'Open the Sim Shelf in a new window (PhET simulations with the Predict-Explore-Explain coach)')
        }, t('stem.simShelf.open', '🧪 Open Sim Shelf')),
        popupState === 'opening' && h('p', { className: 'text-xs text-sky-300' },
          t('stem.simShelf.opening_note', 'Opening Sim Shelf. If it does not appear, check your pop-up settings.')),
        popupState === 'blocked' && h('p', { className: 'text-xs text-amber-300' },
          t('stem.simShelf.blocked_note', 'Pop-up blocked — allow pop-ups for this page and try again.')),
        popupState === 'open' && h('p', { className: 'text-xs text-emerald-300' },
          t('stem.simShelf.open_note', 'Sim Shelf is open. Keep this AlloFlow window open too — it powers the AI coach.')),
        popupState === 'closed' && h('p', { className: 'text-xs text-slate-400' },
          t('stem.simShelf.closed_note', 'Sim Shelf was closed. You can reopen it whenever you are ready.')),
        h('p', { className: 'text-[11px] text-slate-500 leading-relaxed' },
          t('stem.simShelf.credit', 'Simulations by PhET Interactive Simulations, University of Colorado Boulder (phet.colorado.edu) — free and open, used billions of times worldwide. Sims load from PhET, so the shelf needs internet; several include PhET’s own keyboard navigation, spoken descriptions, and sonification.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_simshelf.js loaded — Sim Shelf (PhET + POE coach)');
})();
