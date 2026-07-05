// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Circuit Shelf (Falstad CircuitJS1 + Predict-Explore-Explain coach)
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
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var CIRCUIT_SHELF_URL = 'https://alloflow-cdn.pages.dev/circuit_shelf/circuit_shelf.html?v=1';

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

  window.StemLab.registerTool('circuitShelf', {
    icon: '🔌',
    label: 'Circuit Shelf',
    desc: 'Build and run real electronic circuits in CircuitJS — Paul Falstad’s open-source simulator — wrapped in a Predict → Explore → Explain coach. Pick a challenge, lock in a guess before you wire anything, build it, then let the coach compare what you predicted with what the meters actually read.',
    color: 'amber',
    category: 'general',
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

      var _win = React.useRef(null);
      var _st = React.useState('idle'); var popupState = _st[0], setPopupState = _st[1];

      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');

      function bumpSlice(key) {
        setLabToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._circuitShelf) || {});
          cur[key] = (cur[key] || 0) + 1;
          if (key === 'openedCount') cur.opened = true;
          var next = Object.assign({}, prev); next._circuitShelf = cur; return next;
        });
      }

      // ── AI bridge ──
      React.useEffect(function () {
        function onMsg(ev) {
          var data = ev && ev.data;
          if (!data || typeof data.type !== 'string') return;
          if (data.type === 'alloccircuit-hello') {
            try { if (ev.source) ev.source.postMessage({ type: 'alloccircuit-ready', ai: aiOn }, '*'); } catch (_) {}
            setPopupState('open');
            return;
          }
          if (data.type === 'alloccircuit-closed') { setPopupState('closed'); return; }
          if (data.type === 'alloccircuit-predicted') { bumpSlice('predictedCount'); return; }
          if (data.type !== 'alloccircuit-ai-request' || !data.id) return;
          var replyTo = ev.source || _win.current;
          var respond = function (payload) {
            try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'alloccircuit-ai-response', id: data.id }, payload), '*'); } catch (_) {}
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
        }
        window.addEventListener('message', onMsg);
        return function () { window.removeEventListener('message', onMsg); };
      }, [aiOn]);

      function openShelf() {
        var existing = _win.current;
        if (existing && !existing.closed) { try { existing.focus(); } catch (_) {} return; }
        var lang = (ctx.lang || 'en');
        var w = null;
        try { w = window.open(CIRCUIT_SHELF_URL + '&lang=' + encodeURIComponent(lang), 'alloflow-circuit-shelf', 'width=1280,height=860'); } catch (_) { w = null; }
        if (!w) {
          setPopupState('blocked');
          if (announceToSR) announceToSR(t('stem.circuitShelf.popup_blocked', 'The Circuit Shelf window was blocked. Allow pop-ups for this page, then try again.'));
          return;
        }
        _win.current = w;
        setPopupState('opening');
        bumpSlice('openedCount');
        if (announceToSR) announceToSR(t('stem.circuitShelf.opened_sr', 'Opened the Circuit Shelf in a new window.'));
      }

      return h('div', { className: 'flex flex-col gap-4 animate-in fade-in duration-300 max-w-2xl' },
        h('h2', { className: 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400' },
          t('stem.circuitShelf.title', '🔌 Circuit Shelf — predict first, then wire it up')),
        h('p', { className: 'text-sm text-slate-300 leading-relaxed' },
          t('stem.circuitShelf.blurb', 'Build working electronic circuits in CircuitJS — Paul Falstad’s open-source simulator, used in classrooms worldwide — with a set of Predict → Explore → Explain challenges: series vs. parallel bulbs, Ohm’s law, RC charging, voltage dividers, logic gates and more. You lock in a guess BEFORE you wire anything; afterwards the coach compares your prediction with what the meters actually read and asks one good question.')),
        h('div', { className: 'bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-xs text-slate-300 space-y-1.5' },
          h('div', null, '🔬 ' + t('stem.circuitShelf.note1', 'Predictions and explanations stay in the lab window — nothing is saved or graded.')),
          h('div', null, (aiOn ? '✨ ' + t('stem.circuitShelf.ai_on', 'AI coach is ON — it will compare your prediction with your observations while this window stays open.')
            : '🌱 ' + t('stem.circuitShelf.ai_off', 'AI hints are off — the shelf still works, with built-in reflection prompts instead of the AI coach.')))),
        h('button', {
          onClick: openShelf,
          className: 'px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md shadow-amber-600/20 transition-all w-fit',
          'aria-label': t('stem.circuitShelf.open_title', 'Open the Circuit Shelf in a new window (CircuitJS simulator with the Predict-Explore-Explain coach)')
        }, t('stem.circuitShelf.open', '🔌 Open Circuit Shelf')),
        popupState === 'blocked' && h('p', { className: 'text-xs text-amber-300' },
          t('stem.circuitShelf.blocked_note', 'Pop-up blocked — allow pop-ups for this page and try again.')),
        popupState === 'open' && h('p', { className: 'text-xs text-emerald-300' },
          t('stem.circuitShelf.open_note', 'Circuit Shelf is open. Keep this AlloFlow window open too — it powers the AI coach.')),
        h('p', { className: 'text-[11px] text-slate-500 leading-relaxed' },
          t('stem.circuitShelf.credit', 'Circuit simulator: CircuitJS1 by Paul Falstad and Iain Sharp (github.com/pfalstad/circuitjs1), free and open source under the GPL. The simulator loads from its host, so the shelf needs internet; offline use for School Box is on the roadmap (the GPL permits it).'))
      );
    }
  });
  console.log('[StemLab] stem_tool_circuitshelf.js loaded — Circuit Shelf (CircuitJS1 + POE coach)');
})();
