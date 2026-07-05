// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Data Lab (CODAP + Socratic tutor) launcher + AI bridge
//
// The Data Lab itself is a COMPANION WINDOW (data_lab/data_lab.html, the
// Video-Studio / Access-Lens / Immersive-Geometry escape-hatch pattern): a
// top-level page hosting the Concord Consortium's CODAP workspace (MIT,
// codap.concord.org — credit to Concord) plus an AlloFlow Socratic tutor
// panel. A tiny "tutor link" plugin rides inside CODAP (?di=) and reports the
// SHAPE of the student's work — dataset/collection/column names + case
// counts, NEVER cell values.
//
// This tool is the launcher and the AI bridge:
//   popup ── allodatalab-hello ──────────▶ here (replies -ready {ai})
//   popup ── allodatalab-ai-request ─────▶ here ── ctx.callGemini ──▶ Gemini
//   popup ◀─ allodatalab-ai-response ──── here
//
// House rules honored:
//   - ZERO AI traffic unless ctx.aiHintsEnabled AND the student pressed Ask.
//   - Socratic prompt: the tutor asks questions; it does not pronounce
//     conclusions or do the analysis for the student.
//   - Quest slice '_dataLab' persists booleans/counters only. The tutor
//     conversation itself is never persisted anywhere.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var DATA_LAB_URL = 'https://alloflow-cdn.pages.dev/data_lab/data_lab.html?v=1';

  function buildTutorPrompt(question, snapshot, history) {
    var lines = [
      'You are a warm, Socratic DATA-SCIENCE THINKING PARTNER for a K-12 student working in CODAP (a data table + graph workspace).',
      'RULES:',
      '- Ask, don’t tell: respond with at most 3 sentences that end in ONE genuine question nudging the student to observe, compare, predict, or question the data.',
      '- Never state the conclusion, pattern, or answer for them. Never do the analysis.',
      '- If they ask for a definition, give it in one plain sentence, then ask a question that applies it to THEIR data.',
      '- Reference their actual dataset/column names when available. Grade-appropriate, encouraging, no jargon walls.',
      '- If they seem stuck or frustrated, shrink the step: ask about one column or one case.'
    ];
    if (snapshot && snapshot.contexts && snapshot.contexts.length) {
      lines.push('THE SHAPE OF THEIR WORKSPACE RIGHT NOW (names and counts only — you cannot see values):');
      lines.push(JSON.stringify(snapshot).slice(0, 2500));
    } else {
      lines.push('You cannot see their workspace right now — ask what they are working with.');
    }
    var hist = Array.isArray(history) ? history.slice(-6) : [];
    if (hist.length) {
      lines.push('RECENT CONVERSATION:');
      hist.forEach(function (turn) {
        lines.push((turn.role === 'student' ? 'Student: ' : 'Tutor: ') + String(turn.text || '').slice(0, 300));
      });
    }
    lines.push('Student says: ' + String(question || '').slice(0, 400));
    lines.push('Reply with plain text only (no JSON, no markdown headings).');
    return lines.join('\n');
  }

  window.StemLab.registerTool('dataLab', {
    icon: '📊',
    label: 'Data Lab',
    desc: 'Real data science in CODAP — the Concord Consortium’s open data workspace — with an AlloFlow Socratic tutor beside it that asks questions about YOUR data instead of giving answers.',
    color: 'indigo',
    category: 'general',
    questHooks: [
      { id: 'dl_open', label: 'Open the Data Lab', icon: '📊',
        check: function (d) { return !!(d && d.opened); } },
      { id: 'dl_ask', label: 'Ask the tutor about your data', icon: '🤔',
        check: function (d) { return !!(d && (d.askedCount || 0) >= 1); } },
      { id: 'dl_ask3', label: 'Keep the conversation going (3 questions)', icon: '💬',
        check: function (d) { return !!(d && (d.askedCount || 0) >= 3); } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR;
      var setLabToolData = ctx.setToolData;
      var labToolData = ctx.toolData || {};
      var slice = labToolData._dataLab || {};

      var _win = React.useRef(null);
      var _st = React.useState('idle'); var popupState = _st[0], setPopupState = _st[1];

      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');

      function updSlice(patch) {
        setLabToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._dataLab) || {});
          Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
          var next = Object.assign({}, prev); next._dataLab = cur; return next;
        });
      }

      // ── AI bridge (popup ⇄ this tool ⇄ Gemini) ──
      React.useEffect(function () {
        function onMsg(ev) {
          var data = ev && ev.data;
          if (!data || typeof data.type !== 'string') return;
          if (data.type === 'allodatalab-hello') {
            try { if (ev.source) ev.source.postMessage({ type: 'allodatalab-ready', ai: aiOn }, '*'); } catch (_) {}
            setPopupState('open');
            return;
          }
          if (data.type === 'allodatalab-closed') { setPopupState('closed'); return; }
          if (data.type !== 'allodatalab-ai-request' || !data.id) return;
          var replyTo = ev.source || _win.current;
          var respond = function (payload) {
            try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'allodatalab-ai-response', id: data.id }, payload), '*'); } catch (_) {}
          };
          if (!aiOn) { respond({ error: 'ai-disabled' }); return; }
          // Functional update — the closure's slice can be stale mid-conversation.
          setLabToolData(function (prev) {
            var cur = Object.assign({}, (prev && prev._dataLab) || {});
            cur.askedCount = (cur.askedCount || 0) + 1;
            var next = Object.assign({}, prev); next._dataLab = cur; return next;
          });
          var prompt = buildTutorPrompt(data.question, data.snapshot, data.history);
          Promise.resolve().then(function () {
            return ctx.callGemini(prompt, false, false, 0.7);
          }).then(function (resp) {
            var text = (typeof resp === 'string') ? resp : ((resp && (resp.text || resp.output || resp.response)) || '');
            respond({ text: String(text || '').slice(0, 1200) });
          }).catch(function (e) {
            respond({ error: String((e && e.message) || e).slice(0, 120) });
          });
        }
        window.addEventListener('message', onMsg);
        return function () { window.removeEventListener('message', onMsg); };
      }, [aiOn]);

      function openDataLab() {
        var existing = _win.current;
        if (existing && !existing.closed) { try { existing.focus(); } catch (_) {} return; }
        var w = null;
        try { w = window.open(DATA_LAB_URL, 'alloflow-data-lab', 'width=1280,height=840'); } catch (_) { w = null; }
        if (!w) {
          setPopupState('blocked');
          if (announceToSR) announceToSR(t('stem.dataLab.popup_blocked', 'The Data Lab window was blocked. Allow pop-ups for this page, then try again.'));
          return;
        }
        _win.current = w;
        setPopupState('opening');
        updSlice({ opened: true, openedCount: (slice.openedCount || 0) + 1 });
        if (announceToSR) announceToSR(t('stem.dataLab.opened_sr', 'Opened the Data Lab in a new window.'));
      }

      return h('div', { className: 'flex flex-col gap-4 animate-in fade-in duration-300 max-w-2xl' },
        h('h2', { className: 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400' },
          t('stem.dataLab.title', '📊 Data Lab — real data science, Socratic style')),
        h('p', { className: 'text-sm text-slate-300 leading-relaxed' },
          t('stem.dataLab.blurb', 'Build tables, drag out graphs, and explore real datasets in CODAP — the Concord Consortium’s open data workspace used in classrooms worldwide. An AlloFlow thinking partner sits beside it: it can see the SHAPE of your work (column names and counts — never your values) and asks you questions instead of giving answers.')),
        h('div', { className: 'bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-xs text-slate-300 space-y-1.5' },
          h('div', null, '🔒 ' + t('stem.dataLab.privacy1', 'Your data values never leave the workspace — the tutor only sees names and counts.')),
          h('div', null, '💬 ' + t('stem.dataLab.privacy2', 'Tutor chats are not saved anywhere.')),
          h('div', null, (aiOn ? '✨ ' + t('stem.dataLab.ai_on', 'AI tutor is ON — it will answer through this window while it stays open.')
            : '🌱 ' + t('stem.dataLab.ai_off', 'AI hints are off — the Data Lab still works, with built-in thinking prompts instead of the AI tutor.')))),
        h('button', {
          onClick: openDataLab,
          className: 'px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 shadow-md shadow-indigo-600/20 transition-all w-fit',
          'aria-label': t('stem.dataLab.open_title', 'Open the Data Lab in a new window (CODAP workspace with the AlloFlow tutor)')
        }, t('stem.dataLab.open', '📊 Open Data Lab')),
        popupState === 'blocked' && h('p', { className: 'text-xs text-amber-300' },
          t('stem.dataLab.blocked_note', 'Pop-up blocked — allow pop-ups for this page and try again.')),
        popupState === 'open' && h('p', { className: 'text-xs text-emerald-300' },
          t('stem.dataLab.open_note', 'Data Lab is open. Keep this AlloFlow window open too — it powers the AI tutor.')),
        h('p', { className: 'text-[11px] text-slate-500 leading-relaxed' },
          t('stem.dataLab.credit', 'CODAP is free and open source (MIT) from the Concord Consortium. The workspace loads from codap.concord.org, so the Data Lab needs internet; an offline School Box copy is on the roadmap.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_datalab.js loaded — Data Lab (CODAP + Socratic tutor)');
})();
