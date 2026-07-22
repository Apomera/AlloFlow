// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Molecule Shelf (Mol* viewer + Notice-Wonder coach)
//
// The shelf itself is a COMPANION WINDOW (molecule_shelf/molecule_shelf.html):
// Mol* (molstar.org, MIT) — the WebGL molecular-structure viewer used by the
// RCSB Protein Data Bank and PDBe — showing real 3D structures fetched from
// the PDB (crambin, B-DNA, hemoglobin, lysozyme, ubiquitin, antibody, the
// SARS-CoV-2 spike). It complements the atom/orbital tools: those own small-
// molecule pedagogy; Mol* takes over where they can't go — proteins, DNA,
// viruses.
//
// This tool is the launcher + AI bridge. Unlike the Sim/Circuit shelves
// (Predict→Explore→Explain), a static structure isn't something you "predict"
// then experiment on, so the coach here is an OBSERVING tutor in the Data Lab
// spirit: NOTICE → WONDER. The student records what they notice and what they
// wonder; the AI (when enabled) responds Socratically — never lectures the
// structure's function. Bridge protocol mirrors the shelves, renamed
// allocmol-* :
//   popup ── allocmol-hello ──────────▶ here (replies -ready {ai})
//   popup ── allocmol-ai-request ─────▶ here ── ctx.callGemini ──▶ Gemini
//   popup ◀─ allocmol-ai-response ──── here
//
// House rules: zero AI traffic unless ctx.aiHintsEnabled AND the student
// pressed the coach button; nothing persisted except quest-slice counters in
// '_moleculeShelf'.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var MOLECULE_SHELF_CDN_URL = 'https://alloflow-cdn.pages.dev/molecule_shelf/molecule_shelf.html?v=1';
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
  var MOLECULE_SHELF_URL = companionUrl('molecule_shelf/molecule_shelf.html?v=1', MOLECULE_SHELF_CDN_URL);

  function buildCoachPrompt(structure, notice, wonder) {
    return [
      'You are a warm, Socratic STRUCTURAL-BIOLOGY COACH for a K-12 student looking at the 3D molecular structure "' + String(structure || '').slice(0, 100) + '" in the Mol* viewer.',
      'They wrote what they NOTICE:',
      '"' + String(notice || '(nothing yet)').slice(0, 600) + '"',
      'And what they WONDER:',
      '"' + String(wonder || '').slice(0, 600) + '"',
      'RULES:',
      '- At most 4 sentences, ending in exactly ONE question.',
      '- Build on their OWN observation — quote a few of their words back.',
      '- Never deliver the textbook explanation of what the molecule does. Point them to look at a specific feature (a helix, a pocket, a repeated subunit, the overall symmetry) and reason about it.',
      '- If their notice is vague, ask them to describe ONE concrete shape they can see and where it sits.',
      '- Warm, grade-appropriate, jargon-free. Plain text only.'
    ].join('\n');
  }

  // Described-view prompt: an accessible, spatial description of what is on
  // screen RIGHT NOW, for a learner who cannot see the WebGL canvas. Grounded
  // in the known molecule so the vision model describes the real view instead
  // of guessing the identity.
  function buildDescribePrompt(structure, pdb, meta, question, hasImage) {
    var lines = [
      'You are describing a 3-D molecular structure to a K-12 student who CANNOT SEE the screen (screen-reader user).',
      'The structure is "' + String(structure || '').slice(0, 100) + '"' + (pdb ? ' (PDB ' + String(pdb).slice(0, 8) + ')' : '') + (meta ? ' — ' + String(meta).slice(0, 160) : '') + '.',
      hasImage
        ? 'The attached image is the EXACT current on-screen view (a specific angle, zoom, and representation). Describe what is visible in THIS view.'
        : 'No image is available; describe the structure from what is well established about it.',
      'Write 3-5 short, concrete sentences a student can picture from sound alone:',
      '- overall shape and how big/compact it looks;',
      '- major features you can make out (coils/helices, flat sheets/arrows, strands, separate subunits, pockets or grooves, any small highlighted groups);',
      '- colors and what they seem to group or distinguish;',
      '- spatial layout — left/right/center, top/bottom, and any symmetry.',
      'Be specific and spatial. Do NOT invent detail you cannot see. Plain language, no jargon, no markdown.'
    ];
    if (question) {
      lines.push('The student then asks about this view: "' + String(question).slice(0, 200) + '"');
      lines.push('Answer their question directly and briefly, still grounded only in what is visible.');
    }
    return lines.join('\n');
  }

  window.StemLab.registerTool('moleculeShelf', {
    icon: '🧬',
    label: 'Molecule Shelf',
    desc: 'Explore real 3D molecular structures in Mol* — the viewer used by the world’s Protein Data Bank — from crambin and B-DNA to hemoglobin, an antibody, and the coronavirus spike. Rotate, zoom, and switch representations, with a Notice → Wonder observation coach beside it.',
    color: 'indigo',
    category: 'general',
    questHooks: [
      { id: 'mol_open', label: 'Open a molecular structure', icon: '🧬',
        check: function (d) { return !!(d && d.opened); } },
      { id: 'mol_notice', label: 'Record what you notice about a structure', icon: '🔍',
        check: function (d) { return !!(d && (d.noticedCount || 0) >= 1); } },
      { id: 'mol_coach', label: 'Take your observation to the coach', icon: '💬',
        check: function (d) { return !!(d && (d.coachCount || 0) >= 1); } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var shelfData = (ctx.toolData && ctx.toolData._moleculeShelf) || {};
      var returnTool = shelfData.returnTool === 'molecule' ? 'molecule' : null;

      var _win = React.useRef(null);
      var _st = React.useState('idle'); var popupState = _st[0], setPopupState = _st[1];

      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');
      var visionOn = !!(aiOn && typeof ctx.callGeminiVision === 'function');

      function bumpSlice(key) {
        setLabToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._moleculeShelf) || {});
          cur[key] = (cur[key] || 0) + 1;
          if (key === 'openedCount') cur.opened = true;
          var next = Object.assign({}, prev); next._moleculeShelf = cur; return next;
        });
      }

      // ── AI bridge ──
      React.useEffect(function () {
        function onMsg(ev) {
          var data = ev && ev.data;
          if (!data || typeof data.type !== 'string') return;
          if (data.type === 'allocmol-hello') {
            try { if (ev.source) ev.source.postMessage({ type: 'allocmol-ready', ai: aiOn, vision: visionOn }, '*'); } catch (_) {}
            setPopupState('open');
            return;
          }
          if (data.type === 'allocmol-closed') { setPopupState('closed'); return; }
          if (data.type === 'allocmol-noticed') { bumpSlice('noticedCount'); return; }
          if (data.type !== 'allocmol-ai-request' || !data.id) return;
          var replyTo = ev.source || _win.current;
          var respond = function (payload) {
            try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'allocmol-ai-response', id: data.id }, payload), '*'); } catch (_) {}
          };
          if (!aiOn) { respond({ error: 'ai-disabled' }); return; }
          var toText = function (resp) {
            return (typeof resp === 'string') ? resp : ((resp && (resp.text || resp.output || resp.response)) || '');
          };
          // Described-view request: describe the current 3-D view aloud. Uses
          // the vision model on the captured image when available; otherwise
          // falls back to a facts-based description via the text model.
          if (data.mode === 'describe') {
            bumpSlice('describeCount');
            var hasImg = visionOn && typeof data.image === 'string' && data.image.length > 100;
            var dprompt = buildDescribePrompt(data.structure, data.pdb, data.meta, data.question, hasImg);
            Promise.resolve().then(function () {
              return hasImg
                ? ctx.callGeminiVision(dprompt, data.image, data.mime || 'image/png')
                : ctx.callGemini(dprompt, false, false, 0.4);
            }).then(function (resp) {
              respond({ text: String(toText(resp) || '').slice(0, 1200), grounded: hasImg ? 'vision' : 'facts' });
            }).catch(function (e) {
              respond({ error: String((e && e.message) || e).slice(0, 120) });
            });
            return;
          }
          bumpSlice('coachCount');
          var prompt = buildCoachPrompt(data.structure, data.notice, data.wonder);
          Promise.resolve().then(function () {
            return ctx.callGemini(prompt, false, false, 0.7);
          }).then(function (resp) {
            respond({ text: String(toText(resp) || '').slice(0, 1000) });
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
        try { w = window.open(MOLECULE_SHELF_URL + '&lang=' + encodeURIComponent(lang) + '&theme=' + encodeURIComponent(ctx.theme || 'dark'), 'alloflow-molecule-shelf', 'width=1280,height=860'); } catch (_) { w = null; }
        if (!w) {
          setPopupState('blocked');
          if (announceToSR) announceToSR(t('stem.moleculeShelf.popup_blocked', 'The Molecule Shelf window was blocked. Allow pop-ups for this page, then try again.'));
          return;
        }
        _win.current = w;
        setPopupState('opening');
        bumpSlice('openedCount');
        if (announceToSR) announceToSR(t('stem.moleculeShelf.opened_sr', 'Opened the Molecule Shelf in a new window.'));
      }

      function returnToLab() {
        if (typeof setStemLabTool !== 'function') return;
        setStemLabTool(returnTool || null);
        if (announceToSR) announceToSR(returnTool ? t('stem.moleculeShelf.returned_sr', 'Returned to Molecule Lab.') : t('stem.moleculeShelf.returned_catalog_sr', 'Returned to the STEM Lab tools.'));
      }

      return h('div', { className: 'flex flex-col gap-4 animate-in fade-in duration-300 max-w-2xl' },
        typeof setStemLabTool === 'function' && h('button', {
          onClick: returnToLab,
          className: 'inline-flex w-fit items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-800 active:scale-[0.97]',
          'aria-label': returnTool ? t('stem.moleculeShelf.back_to_lab', 'Back to Molecule Lab') : t('stem.moleculeShelf.back_to_tools', 'Back to STEM Lab tools')
        },
          ArrowLeft ? h(ArrowLeft, { size: 16 }) : null,
          h('span', null, returnTool ? t('stem.moleculeShelf.back_to_lab', 'Back to Molecule Lab') : t('stem.moleculeShelf.back_to_tools', 'Back to STEM Lab tools'))
        ),
        h('h2', { className: 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400' },
          t('stem.moleculeShelf.title', '🧬 Molecule Shelf — real 3D structures, up close')),
        h('p', { className: 'text-sm text-slate-300 leading-relaxed' },
          t('stem.moleculeShelf.blurb', 'Open real molecular structures in Mol* — the same viewer scientists use at the Protein Data Bank — and rotate, zoom, and re-color them in 3D: crambin, the DNA double helix, hemoglobin, an enzyme, an antibody, and the coronavirus spike. A Notice → Wonder coach sits beside the viewer: you record what you see and what it makes you curious about, and the coach asks a question back.')),
        h('div', { className: 'bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-xs text-slate-300 space-y-1.5' },
          h('div', null, '🔬 ' + t('stem.moleculeShelf.note1', 'Your notes stay in the lab window — nothing is saved or graded.')),
          h('div', null, (aiOn ? '✨ ' + t('stem.moleculeShelf.ai_on', 'AI coach is ON — it will build on what you notice while this window stays open.')
            : '🌱 ' + t('stem.moleculeShelf.ai_off', 'AI hints are off — the shelf still works, with built-in observation prompts instead of the AI coach.')))),
        h('button', {
          onClick: openShelf,
          className: 'px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-600/20 transition-all w-fit',
          'aria-label': t('stem.moleculeShelf.open_title', 'Open the Molecule Shelf in a new window (Mol* viewer with the Notice-Wonder coach)')
        }, t('stem.moleculeShelf.open', '🧬 Open Molecule Shelf')),
        popupState === 'opening' && h('p', { className: 'text-xs text-sky-300' },
          t('stem.moleculeShelf.opening_note', 'Opening Molecule Shelf. If it does not appear, check your pop-up settings.')),
        popupState === 'blocked' && h('p', { className: 'text-xs text-amber-300' },
          t('stem.moleculeShelf.blocked_note', 'Pop-up blocked — allow pop-ups for this page and try again.')),
        popupState === 'open' && h('p', { className: 'text-xs text-emerald-300' },
          t('stem.moleculeShelf.open_note', 'Molecule Shelf is open. Keep this AlloFlow window open too — it powers the AI coach.')),
        popupState === 'closed' && h('p', { className: 'text-xs text-slate-400' },
          t('stem.moleculeShelf.closed_note', 'Molecule Shelf was closed. You can reopen it whenever you are ready.')),
        h('p', { className: 'text-[11px] text-slate-500 leading-relaxed' },
          t('stem.moleculeShelf.credit', 'Molecular viewer: Mol* (molstar.org), free and open source under the MIT license — the viewer used by the RCSB Protein Data Bank and PDBe. Structures are fetched from the PDB by ID. The viewer and structures load from the web, so the shelf needs internet.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_moleculeshelf.js loaded — Molecule Shelf (Mol* + Notice-Wonder coach)');
})();
