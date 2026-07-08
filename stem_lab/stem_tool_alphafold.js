// AlloFlow STEM Lab - AlphaFold Explorer launcher + AI bridge
//
// The explorer itself is a companion window:
//   alphafold_explorer/alphafold_explorer.html
//
// It uses the same Canvas escape-hatch pattern as Molecule Shelf/Data Lab:
// open a top-level browser window, keep AlloFlow as the AI bridge, and avoid
// submitting anything automatically to AlphaFold Server. Students can inspect
// public AlphaFold DB structures, import downloaded result files, and prepare
// AlphaFold Server or AlphaFold 3 local-code JSON for teacher-approved,
// non-sensitive classroom sequences.
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var ALPHAFOLD_CDN_URL = 'https://alloflow-cdn.pages.dev/alphafold_explorer/alphafold_explorer.html?v=1';

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

  var ALPHAFOLD_URL = companionUrl('alphafold_explorer/alphafold_explorer.html?v=1', ALPHAFOLD_CDN_URL);

  function safeClip(value, limit) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit || 300);
  }

  function buildCoachPrompt(payload) {
    var meta = payload && payload.meta ? payload.meta : {};
    var lines = [
      'You are a warm, Socratic STRUCTURAL-BIOLOGY COACH for a K-12 student using an AlphaFold explorer.',
      'The tool is for public, synthetic, or classroom sample proteins only. Do not discuss diagnosis, treatment, ancestry, personal genetic risk, or patient-specific interpretation.',
      'RULES:',
      '- At most 4 sentences.',
      '- End with exactly one question.',
      '- Ask the student to inspect the structure, confidence, domain layout, or a visible pocket/surface feature.',
      '- Do not overstate AlphaFold predictions; remind them that predictions are hypotheses when needed.',
      '- Do not request or repeat personal/family genetic or medical information.',
      'CURRENT PUBLIC/LOCAL STRUCTURE CONTEXT:',
      'Name: ' + safeClip(meta.name || meta.description || 'unknown protein', 160),
      'Accession/source: ' + safeClip(meta.accession || meta.source || 'unknown', 120),
      'Organism: ' + safeClip(meta.organism || 'unknown', 120),
      'Length: ' + safeClip(meta.length || 'unknown', 40),
      'Confidence summary: ' + safeClip(meta.confidence || 'not shown', 180),
      'Student observation: ' + safeClip(payload && payload.note, 700),
      'Reply with plain text only.'
    ];
    return lines.join('\n');
  }

  window.StemLab.registerTool('alphaFoldExplorer', {
    icon: '\u03b1',
    label: 'AlphaFold Explorer',
    desc: 'Look up public AlphaFold DB protein structures by UniProt/accession, view them in Mol*, import downloaded AlphaFold result files, prepare AlphaFold Server or AlphaFold 3 local-code JSON, and guide students through cautious claim-evidence-limit reasoning without automatic submission.',
    color: 'teal',
    category: 'science',
    questHooks: [
      { id: 'af_open', label: 'Open AlphaFold Explorer', icon: '\u03b1',
        check: function (d) { return !!(d && d.opened); } },
      { id: 'af_lookup', label: 'Load a public AlphaFold DB structure', icon: 'AF',
        check: function (d) { return !!(d && (d.lookupCount || 0) >= 1); } },
      { id: 'af_prepare', label: 'Prepare safe AlphaFold Server input', icon: '{}',
        check: function (d) { return !!(d && (d.sequencePreparedCount || 0) >= 1); } },
      { id: 'af_coach', label: 'Ask one structure-inspection question', icon: '?',
        check: function (d) { return !!(d && (d.coachCount || 0) >= 1); } }
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
          var cur = Object.assign({}, (prev && prev._alphaFoldExplorer) || {});
          cur[key] = (cur[key] || 0) + 1;
          if (key === 'openedCount') cur.opened = true;
          var next = Object.assign({}, prev); next._alphaFoldExplorer = cur; return next;
        });
      }

      React.useEffect(function () {
        function onMsg(ev) {
          var data = ev && ev.data;
          if (!data || typeof data.type !== 'string') return;
          if (data.type === 'allocaf-hello') {
            try { if (ev.source) ev.source.postMessage({ type: 'allocaf-ready', ai: aiOn }, '*'); } catch (_) {}
            setPopupState('open');
            return;
          }
          if (data.type === 'allocaf-closed') { setPopupState('closed'); return; }
          if (data.type === 'allocaf-db-hit') { bumpSlice('lookupCount'); return; }
          if (data.type === 'allocaf-file-imported') { bumpSlice('fileImportCount'); return; }
          if (data.type === 'allocaf-sequence-prepared') { bumpSlice('sequencePreparedCount'); return; }
          if (data.type !== 'allocaf-ai-request' || !data.id) return;
          var replyTo = ev.source || _win.current;
          var respond = function (payload) {
            try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'allocaf-ai-response', id: data.id }, payload), '*'); } catch (_) {}
          };
          if (!aiOn) { respond({ error: 'ai-disabled' }); return; }
          bumpSlice('coachCount');
          Promise.resolve().then(function () {
            return ctx.callGemini(buildCoachPrompt(data), false, false, 0.7);
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

      function openExplorer() {
        var existing = _win.current;
        if (existing && !existing.closed) { try { existing.focus(); } catch (_) {} return; }
        var lang = (ctx.lang || 'en');
        var w = null;
        try { w = window.open(ALPHAFOLD_URL + '&lang=' + encodeURIComponent(lang), 'alloflow-alphafold-explorer', 'width=1360,height=900'); } catch (_) { w = null; }
        if (!w) {
          setPopupState('blocked');
          if (announceToSR) announceToSR(t('stem.alphaFold.popup_blocked', 'The AlphaFold Explorer window was blocked. Allow pop-ups for this page, then try again.'));
          return;
        }
        _win.current = w;
        setPopupState('opening');
        bumpSlice('openedCount');
        if (announceToSR) announceToSR(t('stem.alphaFold.opened_sr', 'Opened AlphaFold Explorer in a new window.'));
      }

      return h('div', { className: 'flex flex-col gap-4 animate-in fade-in duration-300 max-w-2xl' },
        h('h2', { className: 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-sky-400' },
          t('stem.alphaFold.title', 'AlphaFold Explorer - public protein structures')),
        h('p', { className: 'text-sm text-slate-300 leading-relaxed' },
          t('stem.alphaFold.blurb', 'Look up public AlphaFold DB predictions by UniProt/accession, inspect structures in Mol*, import downloaded result files, prepare AlphaFold Server or AlphaFold 3 local-code JSON, and use a guided claim-evidence-limit scaffold. The tool does not automatically submit sequences anywhere; students use public, synthetic, or teacher-approved classroom samples only.')),
        h('div', { className: 'bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-xs text-slate-300 space-y-1.5' },
          h('div', null, t('stem.alphaFold.guardrail1', 'Guardrail: do not enter sequences from yourself, classmates, family members, patients, private genetic tests, or medical reports.')),
          h('div', null, aiOn
            ? t('stem.alphaFold.ai_on', 'AI coach is on. It receives structure metadata and observations, not full protein sequences.')
            : t('stem.alphaFold.ai_off', 'AI hints are off. The explorer still works with built-in inspection prompts.'))),
        h('button', {
          onClick: openExplorer,
          className: 'px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 shadow-md shadow-teal-600/20 transition-all w-fit',
          'aria-label': t('stem.alphaFold.open_title', 'Open AlphaFold Explorer in a new window')
        }, t('stem.alphaFold.open', 'Open AlphaFold Explorer')),
        popupState === 'blocked' && h('p', { className: 'text-xs text-amber-300' },
          t('stem.alphaFold.blocked_note', 'Pop-up blocked - allow pop-ups for this page and try again.')),
        popupState === 'open' && h('p', { className: 'text-xs text-emerald-300' },
          t('stem.alphaFold.open_note', 'AlphaFold Explorer is open. Keep this AlloFlow window open too - it powers the optional AI coach.')),
        h('p', { className: 'text-[11px] text-slate-500 leading-relaxed' },
          t('stem.alphaFold.credit', 'Data/viewing: AlphaFold Protein Structure Database by Google DeepMind and EMBL-EBI; Mol* viewer under MIT license. AlphaFold Server opens separately for non-commercial research workflows. Internet is required for database lookup and web viewing.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_alphafold.js loaded - AlphaFold Explorer launcher');
})();
