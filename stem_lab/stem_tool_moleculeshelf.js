// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEAM Lab — Molecule Shelf (Mol* viewer + Notice-Wonder coach)
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
  if (typeof window === 'undefined' || !window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  (function () {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-moleculeshelf-motion-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-moleculeshelf-motion-css';
    st.textContent = [
      '@keyframes msOrbitDrift{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@keyframes msOrbitCounter{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}',
      '@keyframes msBondPulse{0%{stroke-dashoffset:0;opacity:.22}50%{stroke-dashoffset:-36;opacity:.78}100%{stroke-dashoffset:-72;opacity:.22}}',
      '@keyframes msDashDrift{from{stroke-dashoffset:0}to{stroke-dashoffset:-24}}',
      '@keyframes msCatchlight{0%,100%{opacity:.58;transform:scale(.88)}50%{opacity:1;transform:scale(1.18)}}',
      '@keyframes msAtomAura{0%,100%{opacity:.14;transform:scale(.92)}50%{opacity:.34;transform:scale(1.18)}}',
      '.ms-orbit-spin{transform-box:fill-box;transform-origin:center;animation:msOrbitDrift 26s linear infinite;pointer-events:none;}',
      '.ms-orbit-spin-rev{transform-box:fill-box;transform-origin:center;animation:msOrbitCounter 18s linear infinite;pointer-events:none;}',
      '.ms-bond-glint{fill:none;stroke:#e0f2fe;stroke-linecap:round;stroke-dasharray:18 54;animation:msBondPulse 4.4s ease-in-out infinite;pointer-events:none;}',
      '.ms-dash-drift{animation:msDashDrift 4.8s linear infinite;}',
      '.ms-catchlight{transform-box:fill-box;transform-origin:center;animation:msCatchlight 3.4s ease-in-out infinite;pointer-events:none;}',
      '.ms-atom-aura{transform-box:fill-box;transform-origin:center;animation:msAtomAura 3.8s ease-in-out infinite;pointer-events:none;}',
      '@media(prefers-reduced-motion:reduce){.ms-orbit-spin,.ms-orbit-spin-rev,.ms-bond-glint,.ms-dash-drift,.ms-catchlight,.ms-atom-aura{animation:none!important;}}',
      '.theme-contrast .ms-orbit-spin,.theme-contrast .ms-orbit-spin-rev,.theme-contrast .ms-bond-glint,.theme-contrast .ms-catchlight,.theme-contrast .ms-atom-aura{display:none!important;}',
      '.theme-contrast .ms-dash-drift{animation:none!important;}',
      '@media(forced-colors:active){.ms-orbit-spin,.ms-orbit-spin-rev,.ms-bond-glint,.ms-catchlight,.ms-atom-aura{display:none!important;}.ms-dash-drift{animation:none!important;}}'
    ].join('\n');
    document.head.appendChild(st);
  })();

  var MOLECULE_SHELF_CDN_URL = 'https://alloflow-cdn.pages.dev/molecule_shelf/molecule_shelf.html?v=1';
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
  var MOLECULE_SHELF_URL = companionUrl('molecule_shelf/molecule_shelf.html?v=1', MOLECULE_SHELF_CDN_URL);
  // Bridge trust: only the pop-up this tool opened, at the companion's own origin,
  // may drive the bridge. Opaque origins (file://) report "null", which postMessage
  // rejects as a target, so those fall back to '*' and rely on the source check.
  var MOLECULE_SHELF_ORIGIN = (function () {
    try { var o = new URL(MOLECULE_SHELF_URL, (window.location && window.location.href) || undefined).origin; return (o && o !== 'null') ? o : '*'; } catch (_) { return '*'; }
  })();
  var _moleculeshelfPopup = null; // module scope: a still-open pop-up keeps working after a remount
  function _moleculeshelfBridgeTrusted(ev, win) {
    var src = ev && ev.source;
    if (!src || (src !== win && src !== _moleculeshelfPopup)) return false;
    return MOLECULE_SHELF_ORIGIN === '*' || ev.origin === MOLECULE_SHELF_ORIGIN;
  }

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

  var MOLECULE_STARTERS = [
    { pdb: '', label: 'Browse All 13', family: 'PDB Gallery', shape: 'gallery',
      cue: 'Explore 13 real X-ray and cryo-EM macromolecules from the Protein Data Bank with Notice → Wonder prompts.' },
    { pdb: '1CRN', label: 'Crambin', family: 'Plant Protein', shape: 'helix',
      cue: 'Compact starter fold — spot alpha-helices and flat beta-sheets packed into a tiny crystal structure.' },
    { pdb: '1BNA', label: 'B-DNA Helix', family: 'Nucleic Acid', shape: 'dna',
      cue: 'Inspect the classic double helix — trace the twin backbones, base-pair rungs, and major vs. minor grooves.' },
    { pdb: '4HHB', label: 'Hemoglobin', family: 'Tetramer', shape: 'tetramer',
      cue: 'Count the four repeating protein subunits and locate the small flat heme groups tucked inside.' },
    { pdb: '2LYZ', label: 'Lysozyme', family: 'Enzyme', shape: 'pocket',
      cue: 'Rotate the surface and cartoon views to trace the deep catalytic cleft running across the protein.' },
    { pdb: '1IGY', label: 'Antibody', family: 'Immune Complex', shape: 'antibody',
      cue: 'Observe the symmetric Y-shaped architecture and compare its identical outer arms.' },
    { pdb: '6VXX', label: 'Spike Trimer', family: 'Viral Glycoprotein', shape: 'trimer',
      cue: 'Inspect three-fold rotational symmetry across the closed-state trimeric crown assembly.' },
    { pdb: '1EMA', label: 'GFP Barrel', family: 'Fluorescent Protein', shape: 'barrel',
      cue: 'Look straight down the hollow beta-barrel cylinder to spot the central chromophore.' },
    { pdb: '1BL8', label: 'K+ Channel', family: 'Membrane Pore', shape: 'pore',
      cue: 'Examine the narrow central selectivity tunnel formed by symmetric transmembrane helices.' }
  ];

  window.StemLab.registerTool('moleculeShelf', {
    icon: '\uD83D\uDD17',
    label: 'Molecule Shelf',
    desc: 'Explore real 3D molecular structures in Mol* — the viewer used by the world’s Protein Data Bank — from crambin and B-DNA to hemoglobin, an antibody, and the coronavirus spike. Rotate, zoom, and switch representations, with a Notice → Wonder observation coach beside it.',
    color: 'indigo',
    category: 'chemistry',
    aliases: ['molecules', '3D structures', 'Mol*', 'Protein Data Bank'],
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

      var theme = (ctx.isContrast || ctx.theme === 'contrast') ? 'contrast' : (ctx.theme === 'light' ? 'light' : ((ctx.isDark || ctx.theme === 'dark') ? 'dark' : 'dark'));
      var isLight = theme === 'light';
      var isContrast = theme === 'contrast';

      var shelfData = (ctx.toolData && typeof ctx.toolData === 'object' && ctx.toolData._moleculeShelf && typeof ctx.toolData._moleculeShelf === 'object')
        ? ctx.toolData._moleculeShelf : {};
      var returnTool = shelfData.returnTool === 'molecule' ? 'molecule' : null;
      var openedCount = Math.max(0, Math.floor(Number(shelfData.openedCount) || (shelfData.opened ? 1 : 0)));
      var noticedCount = Math.max(0, Math.floor(Number(shelfData.noticedCount) || 0));
      var coachCount = Math.max(0, Math.floor(Number(shelfData.coachCount) || 0));

      var _win = React.useRef((_moleculeshelfPopup && !_moleculeshelfPopup.closed) ? _moleculeshelfPopup : null);

      React.useEffect(function () {
        var popup = (_win.current && !_win.current.closed) ? _win.current : ((_moleculeshelfPopup && !_moleculeshelfPopup.closed) ? _moleculeshelfPopup : null);
        if (!popup || popup.closed) return;
        _win.current = popup;
        var activeTheme = (ctx.isContrast || ctx.theme === 'contrast') ? 'contrast' : (ctx.theme === 'light' ? 'light' : 'dark');
        try { popup.postMessage({ type: 'alloflow-theme-change', theme: activeTheme }, MOLECULE_SHELF_ORIGIN); } catch (_) {}
      }, [ctx.theme]);
      var _st = React.useState('idle'); var popupState = _st[0], setPopupState = _st[1];
      var _sel = React.useState(''); var selectedPdb = _sel[0], setSelectedPdb = _sel[1];

      var selectedStarter = MOLECULE_STARTERS[0];
      for (var mi = 0; mi < MOLECULE_STARTERS.length; mi++) {
        if (MOLECULE_STARTERS[mi].pdb === selectedPdb) { selectedStarter = MOLECULE_STARTERS[mi]; break; }
      }

      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');
      var visionOn = !!(aiOn && typeof ctx.callGeminiVision === 'function');
      var presetsLocked = !!(ctx.quizMode || ctx.teacherLock || (ctx.toolData && typeof ctx.toolData === 'object' && ctx.toolData._teacherLocked));

      function bumpSlice(key) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function (prev) {
          var base = (prev && typeof prev === 'object') ? prev : {};
          var cur = Object.assign({}, (base._moleculeShelf && typeof base._moleculeShelf === 'object') ? base._moleculeShelf : {});
          cur[key] = (Number(cur[key]) || 0) + 1;
          if (key === 'openedCount') cur.opened = true;
          var next = Object.assign({}, base); next._moleculeShelf = cur; return next;
        });
      }

      // ── AI bridge ──
      var _onMsgRef = React.useRef(null);
      _onMsgRef.current = function (ev) {
        var data = ev && ev.data;
        if (!data || typeof data.type !== 'string') return;
        var activePopup = (_win.current && !_win.current.closed) ? _win.current : ((_moleculeshelfPopup && !_moleculeshelfPopup.closed) ? _moleculeshelfPopup : null);
        if (activePopup && !_win.current) _win.current = activePopup;
        if (!_moleculeshelfBridgeTrusted(ev, activePopup)) return;
        if (data.type === 'allocmol-hello') {
          try { if (ev.source) ev.source.postMessage({ type: 'allocmol-ready', ai: aiOn, vision: visionOn }, MOLECULE_SHELF_ORIGIN); } catch (_) {}
          setPopupState('open');
          return;
        }
        if (data.type === 'allocmol-closed') { setPopupState('closed'); return; }
        if (data.type === 'allocmol-noticed') { bumpSlice('noticedCount'); return; }
        if (data.type !== 'allocmol-ai-request' || !data.id) return;
        var replyTo = ev.source || activePopup;
        var respond = function (payload) {
          try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'allocmol-ai-response', id: data.id }, payload), MOLECULE_SHELF_ORIGIN); } catch (_) {}
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
          var hasImg = visionOn && typeof data.image === 'string' && data.image.length > 100 && data.image.length <= 6000000;
          var dprompt = buildDescribePrompt(data.structure, data.pdb, data.meta, data.question, hasImg);
          Promise.resolve().then(function () {
            return hasImg
              ? ctx.callGeminiVision(dprompt, data.image, data.mime && /^image\/(png|jpeg|webp)$/i.test(data.mime) ? data.mime : 'image/png')
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
      };
      React.useEffect(function () {
        function onMsg(ev) { if (_onMsgRef.current) _onMsgRef.current(ev); }
        window.addEventListener('message', onMsg);
        return function () { window.removeEventListener('message', onMsg); };
      }, [aiOn]);

      function openShelf(overridePdb) {
        var pdbToOpen = typeof overridePdb === 'string' ? overridePdb : selectedPdb;
        var existing = (_win.current && !_win.current.closed) ? _win.current : ((_moleculeshelfPopup && !_moleculeshelfPopup.closed) ? _moleculeshelfPopup : null);
        if (existing && !existing.closed && !pdbToOpen) { _win.current = existing; try { existing.focus(); } catch (_) {} return; }
        var lang = (ctx.lang || 'en');
        var url = MOLECULE_SHELF_URL + '&lang=' + encodeURIComponent(lang) + '&theme=' + encodeURIComponent(ctx.theme || 'dark');
        if (pdbToOpen) url += '&pdb=' + encodeURIComponent(pdbToOpen);
        var w = null;
        try { w = window.open(url, 'alloflow-molecule-shelf', 'width=1280,height=860'); } catch (_) { w = null; }
        if (!w) {
          setPopupState('blocked');
          if (announceToSR) announceToSR(t('stem.moleculeShelf.popup_blocked', 'The Molecule Shelf window was blocked. Allow pop-ups for this page, then try again.'));
          return;
        }
        _win.current = w;
        _moleculeshelfPopup = w;
        setPopupState('opening');
        bumpSlice('openedCount');
        if (announceToSR) announceToSR(t('stem.moleculeShelf.opened_sr', 'Opened the Molecule Shelf in a new window.'));
      }

      function returnToLab() {
        if (typeof setStemLabTool !== 'function') return;
        setStemLabTool(returnTool || null);
        if (announceToSR) announceToSR(returnTool ? t('stem.moleculeShelf.returned_sr', 'Returned to Molecule Lab.') : t('stem.moleculeShelf.returned_catalog_sr', 'Returned to the STEAM Lab tools.'));
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
        stageBg: '#000000', ribbonA: '#00ffff', ribbonB: '#ffff00', accent: '#66ff66', grid: '#333333'
      } : isLight ? {
        shellBg: '#ffffff', shellBorder: '#cbd5e1',
        heroBg: 'linear-gradient(128deg, #1e1b4b 0%, #3730a3 55%, #5b21b6 100%)', heroBorder: '#818cf8',
        cardBg: '#f8fafc', cardBorder: '#cbd5e1',
        subBg: '#eef2ff', subBorder: '#a5b4fc',
        ink: '#0f172a', muted: '#334155', accentText: '#3730a3',
        pillBg: 'rgba(15,23,42,0.72)', pillText: '#e0e7ff', pillBorder: 'rgba(199,210,254,0.45)',
        ctaBg: '#4338ca', ctaText: '#ffffff', ctaBorder: '#312e81',
        chipBg: '#ffffff', chipText: '#0f172a', chipBorder: '#94a3b8',
        chipActiveBg: '#4338ca', chipActiveText: '#ffffff', chipActiveBorder: '#312e81',
        stageBg: '#0c1026', ribbonA: '#38bdf8', ribbonB: '#a78bfa', accent: '#34d399', grid: 'rgba(165,180,252,0.16)'
      } : {
        shellBg: '#0f172a', shellBorder: '#334155',
        heroBg: 'linear-gradient(128deg, #0f172a 0%, #312e81 55%, #4c1d95 100%)', heroBorder: 'rgba(165,180,252,0.38)',
        cardBg: '#1e293b', cardBorder: '#334155',
        subBg: '#171d36', subBorder: '#475569',
        ink: '#f8fafc', muted: '#cbd5e1', accentText: '#c4b5fd',
        pillBg: 'rgba(15,23,42,0.78)', pillText: '#e0e7ff', pillBorder: 'rgba(165,180,252,0.38)',
        ctaBg: '#4f46e5', ctaText: '#ffffff', ctaBorder: '#818cf8',
        chipBg: '#0f172a', chipText: '#e2e8f0', chipBorder: '#475569',
        chipActiveBg: '#4f46e5', chipActiveText: '#ffffff', chipActiveBorder: '#c7d2fe',
        stageBg: '#090d1f', ribbonA: '#38bdf8', ribbonB: '#c084fc', accent: '#34d399', grid: 'rgba(165,180,252,0.16)'
      };

      var statusMeta = popupState === 'open'
        ? { color: isContrast ? '#66ff66' : (isLight ? '#047857' : '#6ee7b7'), dot: '#10b981', text: t('stem.moleculeShelf.open_note', 'Molecule Shelf is open. Keep this AlloFlow window open too — it powers the AI coach.') }
        : popupState === 'opening'
          ? { color: isContrast ? '#00ffff' : (isLight ? '#0369a1' : '#7dd3fc'), dot: '#38bdf8', text: t('stem.moleculeShelf.opening_note', 'Opening Molecule Shelf. If it does not appear, check your pop-up settings.') }
          : popupState === 'blocked'
            ? { color: isContrast ? '#ffff00' : (isLight ? '#b45309' : '#fcd34d'), dot: '#f59e0b', text: t('stem.moleculeShelf.blocked_note', 'Pop-up blocked — allow pop-ups for this page and try again.') }
            : popupState === 'closed'
              ? { color: pal.muted, dot: '#94a3b8', text: t('stem.moleculeShelf.closed_note', 'Molecule Shelf was closed. You can reopen it whenever you are ready.') }
              : { color: pal.muted, dot: aiOn ? '#a78bfa' : '#94a3b8', text: t('stem.moleculeShelf.ready_note', 'Ready to inspect — choose a PDB specimen below or open all 13 structures.') };

      // Structural motif SVG tailored to selected PDB specimen (radial 3D CPK atom spheres & specular bonds, zero textbook spoiler)
      var shape = selectedStarter.shape;
      var cpkSphere = function (k, cx, cy, r, gradId, fallbackCol, delayIdx) {
        var delayStyle = delayIdx ? { animationDelay: (delayIdx * 0.42) + 's' } : undefined;
        return h('g', { key: k },
          !isContrast && h('circle', { className: 'ms-atom-aura', cx: cx, cy: cy, r: r + 3.8, fill: fallbackCol, opacity: 0.22, style: delayStyle }),
          h('circle', { cx: cx, cy: cy, r: r, fill: isContrast ? fallbackCol : ('url(#' + gradId + ')'), stroke: isContrast ? '#000000' : '#ffffff', strokeWidth: 0.9, strokeOpacity: isContrast ? 1 : 0.72 }),
          !isContrast && h('circle', { className: 'ms-catchlight', cx: cx - r * 0.3, cy: cy - r * 0.3, r: Math.max(1.15, r * 0.29), fill: '#ffffff', opacity: 0.86, style: delayStyle })
        );
      };
      var motifNodes = [];
      if (shape === 'dna') {
        motifNodes.push(
          !isContrast && h('path', { key: 'd1g', d: 'M40 44 C78 20, 114 114, 152 44 C190 20, 226 114, 264 44', fill: 'none', stroke: pal.ribbonA, strokeWidth: 8, opacity: 0.2, strokeLinecap: 'round' }),
          h('path', { key: 'd1', d: 'M40 44 C78 20, 114 114, 152 44 C190 20, 226 114, 264 44', fill: 'none', stroke: pal.ribbonA, strokeWidth: 3.5, strokeLinecap: 'round' }),
          !isContrast && h('path', { key: 'd1s', className: 'ms-bond-glint', d: 'M40 44 C78 20, 114 114, 152 44 C190 20, 226 114, 264 44', strokeWidth: 1.5 }),
          !isContrast && h('path', { key: 'd2g', d: 'M40 96 C78 120, 114 26, 152 96 C190 120, 226 26, 264 96', fill: 'none', stroke: pal.ribbonB, strokeWidth: 8, opacity: 0.2, strokeLinecap: 'round' }),
          h('path', { key: 'd2', d: 'M40 96 C78 120, 114 26, 152 96 C190 120, 226 26, 264 96', fill: 'none', stroke: pal.ribbonB, strokeWidth: 3.5, strokeLinecap: 'round' }),
          !isContrast && h('path', { key: 'd2s', className: 'ms-bond-glint', d: 'M40 96 C78 120, 114 26, 152 96 C190 120, 226 26, 264 96', strokeWidth: 1.5, style: { animationDelay: '-2.2s' } }),
          h('line', { key: 'r1', x1: 68, y1: 42, x2: 68, y2: 98, stroke: pal.accent, strokeWidth: 2.2 }),
          h('line', { key: 'r2', x1: 112, y1: 68, x2: 112, y2: 72, stroke: pal.accent, strokeWidth: 2.2 }),
          h('line', { key: 'r3', x1: 152, y1: 46, x2: 152, y2: 94, stroke: pal.accent, strokeWidth: 2.2 }),
          h('line', { key: 'r4', x1: 224, y1: 46, x2: 224, y2: 94, stroke: pal.accent, strokeWidth: 2.2 }),
          cpkSphere('da1', 68, 42, 4.4, 'ms-cpk-a', pal.ribbonA, 0),
          cpkSphere('da2', 68, 98, 4.4, 'ms-cpk-b', pal.ribbonB, 1),
          cpkSphere('da3', 152, 46, 4.4, 'ms-cpk-a', pal.ribbonA, 2),
          cpkSphere('da4', 152, 94, 4.4, 'ms-cpk-b', pal.ribbonB, 3),
          cpkSphere('da5', 224, 46, 4.4, 'ms-cpk-a', pal.ribbonA, 4),
          cpkSphere('da6', 224, 94, 4.4, 'ms-cpk-b', pal.ribbonB, 5)
        );
      } else if (shape === 'tetramer') {
        motifNodes.push(
          !isContrast && h('circle', { key: 't1g', cx: 118, cy: 52, r: 22, fill: 'none', stroke: pal.ribbonA, strokeWidth: 7, opacity: 0.18 }),
          h('circle', { key: 't1', cx: 118, cy: 52, r: 22, fill: isContrast ? 'none' : 'rgba(56,189,248,0.1)', stroke: pal.ribbonA, strokeWidth: 3 }),
          !isContrast && h('circle', { key: 't1s', className: 'ms-bond-glint', cx: 118, cy: 52, r: 22, strokeWidth: 1.4 }),
          !isContrast && h('circle', { key: 't2g', cx: 178, cy: 52, r: 22, fill: 'none', stroke: pal.ribbonB, strokeWidth: 7, opacity: 0.18 }),
          h('circle', { key: 't2', cx: 178, cy: 52, r: 22, fill: isContrast ? 'none' : 'rgba(192,132,252,0.1)', stroke: pal.ribbonB, strokeWidth: 3 }),
          !isContrast && h('circle', { key: 't2s', className: 'ms-bond-glint', cx: 178, cy: 52, r: 22, strokeWidth: 1.4, style: { animationDelay: '-1.1s' } }),
          h('circle', { key: 't3', cx: 118, cy: 90, r: 22, fill: isContrast ? 'none' : 'rgba(192,132,252,0.1)', stroke: pal.ribbonB, strokeWidth: 3 }),
          h('circle', { key: 't4', cx: 178, cy: 90, r: 22, fill: isContrast ? 'none' : 'rgba(56,189,248,0.1)', stroke: pal.ribbonA, strokeWidth: 3 }),
          cpkSphere('h1', 118, 52, 6.2, 'ms-cpk-c', pal.accent, 0),
          cpkSphere('h2', 178, 52, 6.2, 'ms-cpk-c', pal.accent, 1),
          cpkSphere('h3', 118, 90, 6.2, 'ms-cpk-c', pal.accent, 2),
          cpkSphere('h4', 178, 90, 6.2, 'ms-cpk-c', pal.accent, 3)
        );
      } else if (shape === 'antibody') {
        motifNodes.push(
          !isContrast && h('path', { key: 'ab1g', d: 'M148 112 L148 70 L98 34', fill: 'none', stroke: pal.ribbonA, strokeWidth: 9.5, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.2 }),
          h('path', { key: 'ab1', d: 'M148 112 L148 70 L98 34', fill: 'none', stroke: pal.ribbonA, strokeWidth: 5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
          !isContrast && h('path', { key: 'ab1s', className: 'ms-bond-glint', d: 'M148 112 L148 70 L98 34', strokeWidth: 1.6 }),
          !isContrast && h('path', { key: 'ab2g', d: 'M148 70 L198 34', fill: 'none', stroke: pal.ribbonA, strokeWidth: 9.5, strokeLinecap: 'round', opacity: 0.2 }),
          h('path', { key: 'ab2', d: 'M148 70 L198 34', fill: 'none', stroke: pal.ribbonA, strokeWidth: 5, strokeLinecap: 'round' }),
          !isContrast && h('path', { key: 'ab2s', className: 'ms-bond-glint', d: 'M148 70 L198 34', strokeWidth: 1.6, style: { animationDelay: '-1.5s' } }),
          h('line', { key: 'ab3', x1: 112, y1: 60, x2: 88, y2: 43, stroke: pal.ribbonB, strokeWidth: 4, strokeLinecap: 'round' }),
          h('line', { key: 'ab4', x1: 184, y1: 60, x2: 208, y2: 43, stroke: pal.ribbonB, strokeWidth: 4, strokeLinecap: 'round' }),
          cpkSphere('ab5', 98, 34, 5.8, 'ms-cpk-c', pal.accent, 0),
          cpkSphere('ab6', 198, 34, 5.8, 'ms-cpk-c', pal.accent, 2),
          cpkSphere('ab7', 148, 70, 5.2, 'ms-cpk-a', pal.ribbonA, 1)
        );
      } else if (shape === 'barrel' || shape === 'pore') {
        motifNodes.push(
          !isContrast && h('ellipse', { key: 'bp1g', cx: 150, cy: 70, rx: 46, ry: 34, fill: 'none', stroke: pal.ribbonA, strokeWidth: 8, opacity: 0.2 }),
          h('ellipse', { key: 'bp1', cx: 150, cy: 70, rx: 46, ry: 34, fill: isContrast ? 'none' : 'rgba(56,189,248,0.08)', stroke: pal.ribbonA, strokeWidth: 3.5 }),
          !isContrast && h('ellipse', { key: 'bp1s', className: 'ms-bond-glint', cx: 150, cy: 70, rx: 46, ry: 34, strokeWidth: 1.5 }),
          h('ellipse', { key: 'bp2', className: 'ms-dash-drift', cx: 150, cy: 70, rx: 28, ry: 20, fill: 'none', stroke: pal.ribbonB, strokeWidth: 2.5, strokeDasharray: '6 4' }),
          cpkSphere('bp3', 150, 70, 8.5, 'ms-cpk-c', pal.accent, 1)
        );
      } else if (shape === 'trimer') {
        motifNodes.push(
          h('polygon', { key: 'tr1', className: 'ms-dash-drift', points: '150,38 186,94 114,94', fill: isContrast ? 'none' : 'rgba(192,132,252,0.08)', stroke: pal.ribbonB, strokeWidth: 2.4, strokeDasharray: '4 3' }),
          !isContrast && h('circle', { key: 'tr2g', cx: 150, cy: 38, r: 16, fill: 'none', stroke: pal.ribbonA, strokeWidth: 6.5, opacity: 0.18 }),
          h('circle', { key: 'tr2', cx: 150, cy: 38, r: 16, fill: 'none', stroke: pal.ribbonA, strokeWidth: 3 }),
          h('circle', { key: 'tr3', cx: 186, cy: 94, r: 16, fill: 'none', stroke: pal.ribbonA, strokeWidth: 3 }),
          h('circle', { key: 'tr4', cx: 114, cy: 94, r: 16, fill: 'none', stroke: pal.ribbonA, strokeWidth: 3 }),
          cpkSphere('tr2c', 150, 38, 5, 'ms-cpk-a', pal.ribbonA, 0),
          cpkSphere('tr3c', 186, 94, 5, 'ms-cpk-a', pal.ribbonA, 1),
          cpkSphere('tr4c', 114, 94, 5, 'ms-cpk-a', pal.ribbonA, 2),
          cpkSphere('tr5', 150, 74, 6.5, 'ms-cpk-c', pal.accent, 3)
        );
      } else {
        // Default / Crambin / Lysozyme specular ribbon + beta-arrow fold + 3D CPK terminal spheres
        motifNodes.push(
          !isContrast && h('path', { key: 'f1g', d: 'M54 88 C68 38, 92 38, 106 88 C120 118, 144 38, 158 68 C172 98, 198 98, 224 54', fill: 'none', stroke: pal.ribbonA, strokeWidth: 9, strokeLinecap: 'round', opacity: 0.22 }),
          h('path', { key: 'f1', d: 'M54 88 C68 38, 92 38, 106 88 C120 118, 144 38, 158 68 C172 98, 198 98, 224 54', fill: 'none', stroke: pal.ribbonA, strokeWidth: 4, strokeLinecap: 'round' }),
          !isContrast && h('path', { key: 'f1sh', className: 'ms-bond-glint', d: 'M54 87 C68 37, 92 37, 106 87 C120 117, 144 37, 158 67 C172 97, 198 97, 224 53', strokeWidth: 1.6 }),
          !isContrast && h('path', { key: 'f2g', d: 'M92 98 L194 98', stroke: pal.ribbonB, strokeWidth: 9, opacity: 0.22 }),
          h('path', { key: 'f2', d: 'M92 98 L194 98', stroke: pal.ribbonB, strokeWidth: 5 }),
          !isContrast && h('path', { key: 'f2sh', className: 'ms-bond-glint', d: 'M92 98 L194 98', strokeWidth: 1.4, style: { animationDelay: '-1.8s' } }),
          h('polygon', { key: 'f3', points: '192,90 212,98 192,106', fill: pal.ribbonB }),
          cpkSphere('f4', 224, 54, 6.5, 'ms-cpk-c', pal.accent, 0),
          cpkSphere('f5', 54, 88, 5.5, 'ms-cpk-b', pal.ribbonB, 1),
          cpkSphere('f6', 158, 68, 4.8, 'ms-cpk-a', pal.ribbonA, 2)
        );
      }

      return h('div', {
        'data-moleculeshelf-workbench': 'true',
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
            backgroundColor: isContrast ? '#000000' : '#1e1b4b',
            backgroundImage: isContrast ? 'none' : pal.heroBg,
            borderBottom: (isContrast ? '2px' : '1px') + ' solid ' + pal.heroBorder,
            color: '#ffffff'
          }
        },
          h('div', { className: 'flex flex-wrap items-center gap-3' },
            typeof setStemLabTool === 'function' && h('button', {
              type: 'button',
              onClick: returnToLab,
              className: 'inline-flex min-h-11 w-fit items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 active:scale-[0.98]',
              style: {
                backgroundColor: isContrast ? '#000000' : 'rgba(15,23,42,0.74)',
                color: isContrast ? '#ffff00' : '#ffffff',
                border: '1px solid ' + (isContrast ? '#ffff00' : 'rgba(199,210,254,0.45)')
              },
              'aria-label': returnTool ? t('stem.moleculeShelf.back_to_lab', 'Back to Molecule Lab') : t('stem.moleculeShelf.back_to_tools', 'Back to STEAM Lab tools')
            },
              ArrowLeft ? h(ArrowLeft, { size: 16 }) : null,
              h('span', null, returnTool ? t('stem.moleculeShelf.back_to_lab', 'Back to Molecule Lab') : t('stem.moleculeShelf.back_to_tools', 'Back to STEAM Lab tools'))
            ),
            h('div', { className: 'flex flex-wrap items-center gap-2 ml-auto', style: { minWidth: 0 } },
              h('span', {
                className: 'rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
                style: { backgroundColor: pal.pillBg, color: pal.pillText, border: '1px solid ' + pal.pillBorder }
              }, t('stem.moleculeShelf.pill_pdb', '13 PDB Structures')),
              h('span', {
                className: 'rounded-full px-2.5 py-1 text-xs font-bold',
                style: { backgroundColor: pal.pillBg, color: isContrast ? '#ffffff' : (visionOn ? '#6ee7b7' : (aiOn ? '#c4b5fd' : '#e2e8f0')), border: '1px solid ' + (isContrast ? '#ffffff' : 'rgba(255,255,255,0.28)') }
              }, visionOn
                ? t('stem.moleculeShelf.pill_vision', 'AI Coach + 3D Describe')
                : (aiOn ? t('stem.moleculeShelf.pill_ai_on', 'AI Coach Ready') : t('stem.moleculeShelf.pill_ai_off', 'Self-Guided Prompts')))
            )
          ),
          h('div', { className: 'mt-3.5 flex items-start gap-3.5' },
            // Bespoke inline SVG structural biology emblem with 3D CPK radial spheres & specular bond cylinders
            h('svg', { width: 48, height: 48, viewBox: '0 0 48 48', 'aria-hidden': 'true', style: { flexShrink: 0 } },
              h('defs', null,
                h('radialGradient', { id: 'ms-emb-bg', cx: '35%', cy: '28%', r: '72%' },
                  h('stop', { offset: '0%', stopColor: '#312e81' }),
                  h('stop', { offset: '58%', stopColor: '#0c1026' }),
                  h('stop', { offset: '100%', stopColor: '#020617' })
                ),
                h('radialGradient', { id: 'ms-emb-a', cx: '32%', cy: '28%', r: '68%' },
                  h('stop', { offset: '0%', stopColor: '#e0f2fe' }),
                  h('stop', { offset: '48%', stopColor: '#38bdf8' }),
                  h('stop', { offset: '100%', stopColor: '#0369a1' })
                ),
                h('radialGradient', { id: 'ms-emb-b', cx: '32%', cy: '28%', r: '68%' },
                  h('stop', { offset: '0%', stopColor: '#f3e8ff' }),
                  h('stop', { offset: '48%', stopColor: '#c084fc' }),
                  h('stop', { offset: '100%', stopColor: '#6b21a8' })
                ),
                h('radialGradient', { id: 'ms-emb-c', cx: '32%', cy: '28%', r: '68%' },
                  h('stop', { offset: '0%', stopColor: '#d1fae5' }),
                  h('stop', { offset: '48%', stopColor: '#34d399' }),
                  h('stop', { offset: '100%', stopColor: '#047857' })
                )
              ),
              h('rect', { x: 2, y: 2, width: 44, height: 44, rx: 12, fill: isContrast ? '#000000' : 'url(#ms-emb-bg)', stroke: isContrast ? '#ffff00' : '#a78bfa', strokeWidth: 1.6 }),
              !isContrast && h('path', { d: 'M10 5.5 H38', stroke: '#e0e7ff', strokeWidth: 0.9, opacity: 0.4, strokeLinecap: 'round' }),
              !isContrast && h('g', { className: 'ms-orbit-spin-rev' },
                h('circle', { cx: 24, cy: 24, r: 16.5, fill: 'none', stroke: 'rgba(165,180,252,0.28)', strokeWidth: 0.9, strokeDasharray: '4 6' }),
                h('circle', { cx: 40.5, cy: 24, r: 1.6, fill: '#7dd3fc' })
              ),
              !isContrast && h('path', { d: 'M12 14 C22 14, 26 34, 36 34', fill: 'none', stroke: '#38bdf8', strokeWidth: 5.5, opacity: 0.22, strokeLinecap: 'round' }),
              h('path', { d: 'M12 14 C22 14, 26 34, 36 34', fill: 'none', stroke: isContrast ? '#00ffff' : '#38bdf8', strokeWidth: 2.5, strokeLinecap: 'round' }),
              !isContrast && h('path', { className: 'ms-bond-glint', d: 'M12 14 C22 14, 26 34, 36 34', strokeWidth: 1.2 }),
              !isContrast && h('path', { d: 'M12 34 C22 34, 26 14, 36 14', fill: 'none', stroke: '#c084fc', strokeWidth: 5.5, opacity: 0.22, strokeLinecap: 'round' }),
              h('path', { d: 'M12 34 C22 34, 26 14, 36 14', fill: 'none', stroke: isContrast ? '#ffff00' : '#c084fc', strokeWidth: 2.5, strokeLinecap: 'round' }),
              !isContrast && h('path', { className: 'ms-bond-glint', d: 'M12 34 C22 34, 26 14, 36 14', strokeWidth: 1.2, style: { animationDelay: '-2.2s' } }),
              h('circle', { cx: 12, cy: 14, r: 3.4, fill: isContrast ? '#00ffff' : 'url(#ms-emb-a)', stroke: '#ffffff', strokeWidth: 0.7 }),
              h('circle', { cx: 36, cy: 14, r: 3.4, fill: isContrast ? '#ffff00' : 'url(#ms-emb-b)', stroke: '#ffffff', strokeWidth: 0.7 }),
              h('circle', { cx: 12, cy: 34, r: 3.4, fill: isContrast ? '#ffff00' : 'url(#ms-emb-b)', stroke: '#ffffff', strokeWidth: 0.7 }),
              h('circle', { cx: 36, cy: 34, r: 3.4, fill: isContrast ? '#00ffff' : 'url(#ms-emb-a)', stroke: '#ffffff', strokeWidth: 0.7 }),
              !isContrast && h('circle', { className: 'ms-atom-aura', cx: 24, cy: 24, r: 7.2, fill: '#34d399', opacity: 0.22 }),
              h('circle', { cx: 24, cy: 24, r: 4.1, fill: isContrast ? '#66ff66' : 'url(#ms-emb-c)', stroke: '#ffffff', strokeWidth: 0.8 }),
              !isContrast && h('circle', { className: 'ms-catchlight', cx: 22.8, cy: 22.8, r: 1.15, fill: '#ffffff', opacity: 0.88 })
            ),
            h('div', { className: 'min-w-0 flex-1' },
              h('span', {
                className: 'inline-block rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider',
                style: { backgroundColor: isContrast ? '#000000' : 'rgba(99,102,241,0.32)', color: isContrast ? '#ffff00' : '#e0e7ff', border: '1px solid ' + (isContrast ? '#ffff00' : 'rgba(199,210,254,0.45)') }
              }, t('stem.moleculeShelf.subject_badge', 'Structural Biology · Mol* 3D Viewer')),
              h('h2', { className: 'mt-1 text-lg sm:text-xl font-extrabold tracking-tight text-white' },
                t('stem.moleculeShelf.title', '🧬 Molecule Shelf — real 3D structures, up close')),
              h('p', { className: 'mt-1 text-xs sm:text-sm leading-relaxed', style: { color: isContrast ? '#ffffff' : '#e0e7ff' } },
                t('stem.moleculeShelf.blurb', 'Open real molecular structures in Mol* — the same viewer scientists use at the Protein Data Bank — and rotate, zoom, and re-color them in 3D: crambin, the DNA double helix, hemoglobin, an enzyme, an antibody, and the coronavirus spike. A Notice → Wonder coach sits beside the viewer: you record what you see and what it makes you curious about, and the coach asks a question back.'))
            )
          )
        ),

        // ── Body Workbench Content ──
        h('div', { className: 'px-4 pb-5 sm:px-5 flex flex-col gap-4', style: { minWidth: 0 } },

          // Visual Stage: Structural Motif & Notice → Wonder Observatory SVG
          h('div', {
            className: 'rounded-xl p-3 sm:p-4',
            style: { backgroundColor: pal.stageBg, border: '1px solid ' + (isContrast ? '#ffff00' : '#312e81') }
          },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-2.5' },
              h('span', { className: 'text-xs font-bold uppercase tracking-wider', style: { color: isContrast ? '#ffff00' : '#c4b5fd' } },
                t('stem.moleculeShelf.stage_heading', '3D Specimen Preview') + ' · ' + (selectedPdb ? ('PDB ' + selectedPdb + ' — ') : '') + selectedStarter.label),
              h('span', { className: 'text-xs font-semibold tabular-nums', style: { color: '#e2e8f0' } },
                t('stem.moleculeShelf.telemetry_open', 'Opened: ') + openedCount + ' · ' +
                t('stem.moleculeShelf.telemetry_notice', 'Noticed: ') + noticedCount + ' · ' +
                t('stem.moleculeShelf.telemetry_coach', 'Coached: ') + coachCount)
            ),
            h('svg', {
              viewBox: '0 0 640 144',
              className: 'w-full h-auto block',
              role: 'img',
              'aria-label': t('stem.moleculeShelf.stage_svg_aria', 'Structural motif preview and Notice-Wonder observation protocol diagram')
            },
              h('defs', null,
                h('radialGradient', { id: 'ms-stage-bg', cx: '26%', cy: '50%', r: '62%' },
                  h('stop', { offset: '0%', stopColor: '#1e1b4b' }),
                  h('stop', { offset: '55%', stopColor: '#0c1026' }),
                  h('stop', { offset: '100%', stopColor: '#050814' })
                ),
                h('radialGradient', { id: 'ms-cpk-a', cx: '32%', cy: '28%', r: '68%' },
                  h('stop', { offset: '0%', stopColor: '#e0f2fe' }),
                  h('stop', { offset: '45%', stopColor: '#38bdf8' }),
                  h('stop', { offset: '100%', stopColor: '#0369a1' })
                ),
                h('radialGradient', { id: 'ms-cpk-b', cx: '32%', cy: '28%', r: '68%' },
                  h('stop', { offset: '0%', stopColor: '#f3e8ff' }),
                  h('stop', { offset: '45%', stopColor: '#c084fc' }),
                  h('stop', { offset: '100%', stopColor: '#6b21a8' })
                ),
                h('radialGradient', { id: 'ms-cpk-c', cx: '32%', cy: '28%', r: '68%' },
                  h('stop', { offset: '0%', stopColor: '#d1fae5' }),
                  h('stop', { offset: '45%', stopColor: '#34d399' }),
                  h('stop', { offset: '100%', stopColor: '#047857' })
                ),
                h('linearGradient', { id: 'ms-obs-bg', x1: '0', y1: '0', x2: '0', y2: '1' },
                  h('stop', { offset: '0%', stopColor: '#1e1b4b' }),
                  h('stop', { offset: '100%', stopColor: '#0f132e' })
                )
              ),
              // Recessed lab-slate framing & optical spotlight with gentle orbital electron ring
              !isContrast && h('rect', { x: 4, y: 4, width: 632, height: 136, rx: 10, fill: 'url(#ms-stage-bg)', stroke: 'rgba(165,180,252,0.22)', strokeWidth: 1 }),
              !isContrast && h('g', { className: 'ms-orbit-spin' },
                h('circle', { cx: 150, cy: 70, r: 58, fill: 'none', stroke: 'rgba(165,180,252,0.18)', strokeWidth: 1, strokeDasharray: '4 6' }),
                h('circle', { cx: 208, cy: 70, r: 2.3, fill: '#7dd3fc', opacity: 0.9 }),
                h('circle', { cx: 92, cy: 70, r: 1.8, fill: '#c084fc', opacity: 0.78 })
              ),
              h('line', { x1: 16, y1: 126, x2: 624, y2: 126, stroke: pal.grid, strokeWidth: 1 }),
              h('line', { x1: 16, y1: 18, x2: 624, y2: 18, stroke: pal.grid, strokeWidth: 1, strokeDasharray: '4 4' }),
              motifNodes,
              // Notice -> Wonder Observatory Panel
              h('rect', { x: 296, y: 24, width: 324, height: 92, rx: 10, fill: isContrast ? '#000000' : 'url(#ms-obs-bg)', stroke: isContrast ? '#ffff00' : '#6366f1', strokeWidth: 1.4 }),
              !isContrast && h('line', { x1: 306, y1: 25.5, x2: 610, y2: 25.5, stroke: '#e0e7ff', strokeWidth: 0.9, opacity: 0.35 }),
              h('text', { x: 314, y: 46, fill: isContrast ? '#ffff00' : '#c4b5fd', fontSize: 11, fontWeight: 800 }, '1. ROTATE 3D  →  2. NOTICE  →  3. WONDER'),
              h('text', { x: 314, y: 68, fill: '#f8fafc', fontSize: 11 }, t('stem.moleculeShelf.svg_obs1', 'Views: Cartoon ribbons · Ball & Stick · Surface')),
              h('text', { x: 314, y: 88, fill: '#cbd5e1', fontSize: 11 }, visionOn
                ? t('stem.moleculeShelf.svg_obs2_vis', 'Accessible 3D spatial view description enabled.')
                : t('stem.moleculeShelf.svg_obs2_std', 'Record concrete shapes, pockets, and symmetry.')),
              h('text', { x: 20, y: 139, fill: isContrast ? '#ffff00' : '#c4b5fd', fontSize: 11, fontWeight: 600 },
                (selectedPdb ? ('PDB ' + selectedPdb + ' · ') : '13 Verified PDB IDs · ') + selectedStarter.family + ' — ' + selectedStarter.label)
            )
          ),

          // Starter PDB Specimen Chips
          !presetsLocked && h('div', { className: 'flex flex-col gap-2', style: { minWidth: 0 } },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
              h('span', { className: 'text-xs font-bold uppercase tracking-wider', style: { color: pal.accentText } },
                t('stem.moleculeShelf.starters_label', 'Quick-Launch PDB Specimens')),
              h('span', { className: 'text-xs', style: { color: pal.muted } },
                (selectedPdb ? ('PDB ' + selectedPdb + ' · ') : '') + selectedStarter.family)
            ),
            h('div', {
              role: 'group',
              'aria-label': t('stem.moleculeShelf.starters_group_aria', 'Featured Protein Data Bank structure presets'),
              className: 'flex flex-wrap gap-2'
            },
              MOLECULE_STARTERS.map(function (item) {
                var active = item.pdb === selectedPdb;
                return h('button', {
                  key: item.pdb || 'all',
                  type: 'button',
                  'aria-pressed': active ? 'true' : 'false',
                  onClick: function () { setSelectedPdb(item.pdb); },
                  className: 'min-h-11 rounded-xl px-3 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                  style: {
                    backgroundColor: active ? pal.chipActiveBg : pal.chipBg,
                    color: active ? pal.chipActiveText : pal.chipText,
                    border: (active && isContrast ? '2px solid ' : '1px solid ') + (active ? pal.chipActiveBorder : pal.chipBorder),
                    textDecoration: active && isContrast ? 'underline' : undefined
                  }
                }, item.pdb ? (item.pdb + ' · ' + item.label) : item.label);
              })
            ),
            h('p', {
              className: 'rounded-xl px-3.5 py-2.5 text-xs leading-relaxed',
              style: { backgroundColor: pal.subBg, color: pal.ink, border: '1px solid ' + pal.subBorder }
            },
              h('strong', { style: { color: pal.accentText } }, (selectedPdb ? ('PDB ' + selectedPdb + ' — ') : '') + selectedStarter.label + ': '),
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
              className: 'min-h-11 px-5 py-3 rounded-xl text-sm font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 active:scale-[0.98]',
              style: {
                backgroundColor: pal.ctaBg,
                color: pal.ctaText,
                border: (isContrast ? '2px' : '1px') + ' solid ' + pal.ctaBorder,
                boxShadow: isContrast ? 'none' : '0 6px 16px -4px rgba(79, 70, 229, 0.45)'
              },
              title: t('stem.moleculeShelf.open_title', 'Open the Molecule Shelf in a new window (Mol* viewer with the Notice-Wonder coach)')
            }, selectedPdb
              ? (t('stem.moleculeShelf.open_selected_prefix', '🧬 Inspect in 3D: ') + selectedStarter.label + ' (' + selectedPdb + ')')
              : t('stem.moleculeShelf.open', '🧬 Open Molecule Shelf')),
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

          // Privacy & AI Coach / Accessibility Cards
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            h('div', {
              className: 'rounded-xl p-3 text-xs leading-relaxed',
              style: { backgroundColor: pal.cardBg, border: '1px solid ' + pal.cardBorder, color: pal.muted }
            },
              h('div', { className: 'font-bold mb-1', style: { color: pal.ink } }, t('stem.moleculeShelf.privacy_heading', '🔬 Private Observation Notes')),
              t('stem.moleculeShelf.note1', 'Your notes stay in the lab window — nothing is saved or graded.')
            ),
            h('div', {
              className: 'rounded-xl p-3 text-xs leading-relaxed',
              style: { backgroundColor: pal.cardBg, border: '1px solid ' + pal.cardBorder, color: pal.muted }
            },
              h('div', { className: 'font-bold mb-1', style: { color: pal.ink } }, aiOn ? t('stem.moleculeShelf.coach_heading_on', '✨ Observing Coach + Spatial Audio') : t('stem.moleculeShelf.coach_heading_off', '🌱 Built-in Observation Prompts')),
              aiOn
                ? t('stem.moleculeShelf.ai_on', 'AI coach is ON — it will build on what you notice while this window stays open.')
                : t('stem.moleculeShelf.ai_off', 'AI hints are off — the shelf still works, with built-in observation prompts instead of the AI coach.')
            )
          ),

          // Attribution Footer
          h('p', { className: 'text-xs leading-relaxed', style: { color: pal.muted } },
            t('stem.moleculeShelf.credit', 'Molecular viewer: Mol* (molstar.org), free and open source under the MIT license — the viewer used by the RCSB Protein Data Bank and PDBe. Structures are fetched from the PDB by ID. The viewer and structures load from the web, so the shelf needs internet.'))
        )
      );
    }
  });
  console.log('[StemLab] stem_tool_moleculeshelf.js loaded — Molecule Shelf (Mol* + Notice-Wonder coach)');
})();
