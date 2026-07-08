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
    var guide = payload && payload.guide ? payload.guide : {};
    var lines = [
      'You are a warm, Socratic STRUCTURAL-BIOLOGY COACH for a K-12 student using an AlphaFold explorer.',
      'The tool is for public, synthetic, or classroom sample proteins only. Do not discuss diagnosis, treatment, ancestry, personal genetic risk, or patient-specific interpretation.',
      'RULES:',
      '- At most 4 sentences.',
      '- End with exactly one question.',
      '- Ask the student to inspect the structure, confidence, domain layout, or a visible pocket/surface feature.',
      '- Adapt vocabulary, sentence length, and next steps to the selected grade band and tutorial frame.',
      '- Do not overstate AlphaFold predictions; remind them that predictions are hypotheses when needed.',
      '- Do not request or repeat personal/family genetic or medical information.',
      'CURRENT PUBLIC/LOCAL STRUCTURE CONTEXT:',
      'Name: ' + safeClip(meta.name || meta.description || 'unknown protein', 160),
      'Accession/source: ' + safeClip(meta.accession || meta.source || 'unknown', 120),
      'Organism: ' + safeClip(meta.organism || 'unknown', 120),
      'Length: ' + safeClip(meta.length || 'unknown', 40),
      'Confidence summary: ' + safeClip(meta.confidence || 'not shown', 180),
      'Grade band: ' + safeClip(guide.gradeBand || 'not specified', 140),
      'Lesson sequence: ' + safeClip(guide.lessonLength || 'not specified', 120),
      'Biology context: ' + safeClip(guide.biologyContext || 'not specified', 160),
      'Anchor question: ' + safeClip(guide.biologyAnchor || 'not specified', 260),
      'Assignment format: ' + safeClip(guide.assignmentFormat || 'not specified', 120),
      'Learning context: ' + safeClip(guide.learningContext || 'not specified', 120),
      'Accessibility/pedagogy focus: ' + safeClip(guide.accessibilityFocus || 'not specified', 260),
      'Learning route: ' + safeClip(guide.route || 'not specified', 120),
      'Readiness: ' + safeClip(guide.readiness || 'not provided', 220),
      'Local claim review: ' + safeClip(guide.claimReview || 'not provided', 320),
      'Rubric feedback: ' + safeClip(guide.rubric || 'not provided', 420),
      'Student observation: ' + safeClip(payload && payload.note, 700),
      'Reply with plain text only.'
    ];
    return lines.join('\n');
  }

  function buildGuidePrompt(payload) {
    var meta = payload && payload.meta ? payload.meta : {};
    var guide = payload && payload.guide ? payload.guide : {};
    var lines = [
      'You are an AI GUIDANCE LAYER for a K-12 AlphaFold investigation.',
      'Coach the student on scientific reasoning, not on personal genetics, diagnosis, treatment, ancestry, or patient-specific interpretation.',
      'The tool sends structure metadata and student-written notes only. Do not ask for or repeat raw sequences or personal/family medical or genetic information.',
      'RULES:',
      '- Give 3 short bullets.',
      '- Bullet 1: name what is strong or promising in their reasoning.',
      '- Bullet 2: name the most important missing evidence or uncertainty.',
      '- Bullet 3: give one concrete next action in the viewer or lab note.',
      '- Match the selected grade band: use simpler model-literacy language for elementary grades and more technical validation language for AP/advanced students.',
      '- Match the selected lesson sequence: keep launch guidance brief and make investigation guidance more evidence-rich.',
      '- Use the biology context to choose relevant evidence, but do not infer function beyond what the student can support.',
      '- Aim the next action at the selected assignment format, such as an exit ticket, lab note, discussion post, or mini-investigation.',
      '- Use cautious language for AlphaFold predictions; predictions are hypotheses until supported by evidence.',
      '- Do not write a final answer for the student.',
      'CURRENT STRUCTURE CONTEXT:',
      'Name: ' + safeClip(meta.name || meta.description || 'unknown', 160),
      'Source/accession: ' + safeClip(meta.source || meta.accession || 'unknown', 120),
      'Organism: ' + safeClip(meta.organism || 'unknown', 120),
      'Components/length: ' + safeClip(meta.length || 'unknown', 120),
      'Confidence summary: ' + safeClip(meta.confidence || 'not shown', 180),
      'GUIDE STATE:',
      'Current prompt: ' + safeClip(guide.currentPrompt || '', 240),
      'Grade band: ' + safeClip(guide.gradeBand || 'not specified', 140),
      'Grade tutorial: ' + safeClip(guide.gradeTutorial || 'not provided', 900),
      'Lesson sequence: ' + safeClip(guide.lessonLength || 'not specified', 120),
      'Lesson plan: ' + safeClip(guide.lessonSequence || 'not provided', 900),
      'Biology context: ' + safeClip(guide.biologyContext || 'not specified', 160),
      'Suggested public example: ' + safeClip(guide.suggestedExample || 'not specified', 160),
      'Investigation brief: ' + safeClip(guide.investigationBrief || 'not provided', 900),
      'Assignment format: ' + safeClip(guide.assignmentFormat || 'not specified', 120),
      'LMS assignment: ' + safeClip(guide.lmsAssignment || 'not provided', 900),
      'Learning context: ' + safeClip(guide.learningContext || 'not specified', 120),
      'Accessibility/pedagogy focus: ' + safeClip(guide.accessibilityFocus || 'not specified', 260),
      'Context-specific guidance: ' + safeClip(guide.contextGuidance || 'not specified', 260),
      'Learning route: ' + safeClip(guide.route || 'not specified', 120),
      'Readiness: ' + safeClip(guide.readiness || 'not provided', 220),
      'Activity card: ' + safeClip(guide.activityCard || 'not provided', 360),
      'Local claim review: ' + safeClip(guide.claimReview || 'not provided', 480),
      'Rubric feedback: ' + safeClip(guide.rubric || 'not provided', 620),
      'Completed steps: ' + safeClip(guide.completed || 'none', 160),
      'Source confirmed: ' + (guide.sourceConfirmed ? 'yes' : 'no'),
      'Observation: ' + safeClip(guide.observation || '', 700),
      'Cautious claim: ' + safeClip(guide.claim || '', 700),
      'Structure evidence: ' + safeClip(guide.evidence || '', 700),
      'Limit or next test: ' + safeClip(guide.caution || '', 700),
      'Reply with plain text only.'
    ];
    return lines.join('\n');
  }

  window.StemLab.registerTool('alphaFoldExplorer', {
    icon: '\u03b1',
    label: 'AlphaFold Explorer',
    desc: 'Look up public AlphaFold DB protein structures by UniProt/accession, view them in Mol*, import downloaded AlphaFold result files, prepare AlphaFold Server or AlphaFold 3 local-code JSON, and guide students through grade-leveled lessons, biology-context investigation briefs, LMS-ready assignment packets, accessible claim-evidence-limit reasoning, local claim review, rubric feedback, and no automatic submission.',
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
        check: function (d) { return !!(d && (d.coachCount || 0) >= 1); } },
      { id: 'af_ai_guide', label: 'Use AI guidance on a cautious claim', icon: 'AI',
        check: function (d) { return !!(d && (d.guideCount || 0) >= 1); } }
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
          var isCoachRequest = data.type === 'allocaf-ai-request';
          var isGuideRequest = data.type === 'allocaf-ai-guide-request';
          if ((!isCoachRequest && !isGuideRequest) || !data.id) return;
          var replyTo = ev.source || _win.current;
          var respond = function (payload) {
            try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'allocaf-ai-response', id: data.id }, payload), '*'); } catch (_) {}
          };
          if (!aiOn) { respond({ error: 'ai-disabled' }); return; }
          bumpSlice(isGuideRequest ? 'guideCount' : 'coachCount');
          Promise.resolve().then(function () {
            return ctx.callGemini(isGuideRequest ? buildGuidePrompt(data) : buildCoachPrompt(data), false, false, 0.7);
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
          t('stem.alphaFold.blurb', 'Look up public AlphaFold DB predictions by UniProt/accession, inspect structures in Mol*, import downloaded result files, prepare AlphaFold Server or AlphaFold 3 local-code JSON, and use grade-leveled tutorials with copyable lesson sequences, biology-context investigation briefs, LMS-ready assignment packets, route guidance, accessibility lenses, activity cards, local claim review, and rubric feedback. The tool does not automatically submit sequences anywhere; students use public, synthetic, or teacher-approved classroom samples only.')),
        h('div', { className: 'bg-slate-900/50 rounded-xl p-3 border border-teal-800/60 text-xs text-slate-200 leading-relaxed space-y-2' },
          h('div', { className: 'font-bold text-teal-200' },
            t('stem.alphaFold.tutorial_title', 'Quick tutorial')),
          h('ol', { className: 'list-decimal pl-5 space-y-1' },
            h('li', null, t('stem.alphaFold.tutorial_1', 'AlphaFold predicts a protein 3D structure from an amino acid sequence; AlphaFold DB provides public predicted structures.')),
            h('li', null, t('stem.alphaFold.tutorial_2', 'Choose a grade-level tutorial, lesson length, biology context, and assignment format, then apply the recommended route and support lens.')),
            h('li', null, t('stem.alphaFold.tutorial_3', 'Use cautious wording: the model suggests evidence, but it is not final proof by itself.')),
            h('li', null, t('stem.alphaFold.tutorial_4', 'Only prepare JSON for public, synthetic, or teacher-approved classroom samples; the explorer does not automatically submit sequences.')))),
        h('div', { className: 'bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-xs text-slate-300 space-y-1.5' },
          h('div', null, t('stem.alphaFold.guardrail1', 'Guardrail: do not enter sequences from yourself, classmates, family members, patients, private genetic tests, or medical reports.')),
          h('div', null, aiOn
            ? t('stem.alphaFold.ai_on', 'AI coach and guide are on. They receive structure metadata, learner context, and student observations/claims, not full protein sequences.')
            : t('stem.alphaFold.ai_off', 'AI hints are off. The explorer still works with built-in inspection prompts.'))),
        h('button', {
          onClick: openExplorer,
          className: 'px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 shadow-md shadow-teal-600/20 transition-all w-fit',
          'aria-label': t('stem.alphaFold.open_title', 'Open AlphaFold Explorer in a new window')
        }, t('stem.alphaFold.open', 'Open AlphaFold Explorer')),
        popupState === 'blocked' && h('p', { className: 'text-xs text-amber-300' },
          t('stem.alphaFold.blocked_note', 'Pop-up blocked - allow pop-ups for this page and try again.')),
        popupState === 'open' && h('p', { className: 'text-xs text-emerald-300' },
          t('stem.alphaFold.open_note', 'AlphaFold Explorer is open. Keep this AlloFlow window open too - it powers the optional AI coach and guide.')),
        h('p', { className: 'text-[11px] text-slate-500 leading-relaxed' },
          t('stem.alphaFold.credit', 'Data/viewing: AlphaFold Protein Structure Database by Google DeepMind and EMBL-EBI; Mol* viewer under MIT license. AlphaFold Server opens separately for non-commercial research workflows. Internet is required for database lookup and web viewing.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_alphafold.js loaded - AlphaFold Explorer launcher');
})();
