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

  if (typeof document !== 'undefined' && !document.getElementById('alphafold-launcher-css')) {
    var alphaFoldStyle = document.createElement('style');
    alphaFoldStyle.id = 'alphafold-launcher-css';
    alphaFoldStyle.textContent = [
      '.af-launcher{width:min(100%,960px);margin:0 auto;display:grid;gap:14px;color:#e2e8f0;}',
      '.af-launcher *{box-sizing:border-box;}',
      '.af-mission{position:relative;overflow:hidden;padding:22px;border:1px solid rgba(45,212,191,.38);border-radius:20px;background:radial-gradient(circle at 92% 8%,rgba(56,189,248,.2),transparent 34%),linear-gradient(135deg,rgba(15,118,110,.3),rgba(2,6,23,.98) 62%);box-shadow:0 18px 46px rgba(2,6,23,.28);}',
      '.af-mission-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}',
      '.af-eyebrow{margin:0 0 7px;color:#5eead4;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;}',
      '.af-title{margin:0;color:#f8fafc;font-size:clamp(22px,3vw,32px);line-height:1.12;}',
      '.af-subtitle{max-width:700px;margin:9px 0 0;color:#cbd5e1;font-size:13px;line-height:1.6;}',
      '.af-status{flex:0 0 auto;padding:8px 11px;border:1px solid rgba(94,234,212,.3);border-radius:999rem;background:rgba(15,23,42,.72);color:#99f6e4;font-size:11px;font-weight:800;white-space:nowrap;}',
      '.af-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:18px;}',
      '.af-metric{min-width:0;padding:10px;border:1px solid rgba(148,163,184,.18);border-radius:12px;background:rgba(15,23,42,.7);}',
      '.af-metric-label{display:block;color:#94a3b8;font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;}',
      '.af-metric-value{display:block;margin-top:3px;color:#f8fafc;font-size:14px;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.af-metric-note{display:block;margin-top:2px;color:#94a3b8;font-size:9px;line-height:1.35;}',
      '.af-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px;}',
      '.af-confidence-atlas{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(230px,.55fr);gap:10px;margin-top:16px;}',
      '.af-protein-viz{position:relative;min-height:184px;overflow:hidden;border:1px solid rgba(94,234,212,.22);border-radius:16px;background:radial-gradient(circle at 32% 42%,rgba(14,165,233,.18),transparent 34%),linear-gradient(145deg,rgba(15,23,42,.9),rgba(2,6,23,.96));}',
      '.af-protein-viz svg{display:block;width:100%;height:184px;}',
      '.af-fold-shadow{fill:none;stroke:#020617;stroke-width:18;stroke-linecap:round;stroke-linejoin:round;opacity:.72;}',
      '.af-fold-ribbon{fill:none;stroke:url(#af-confidence-gradient);stroke-width:10;stroke-linecap:round;stroke-linejoin:round;filter:url(#af-ribbon-glow);stroke-dasharray:720;stroke-dashoffset:0;animation:afFoldTrace 5.5s ease-in-out infinite alternate;transition:opacity .2s;}',
      '.af-fold-segment{fill:none;stroke-width:13;stroke-linecap:round;stroke-linejoin:round;filter:url(#af-ribbon-glow);opacity:0;transition:opacity .2s,stroke-width .2s;}',
      '.af-protein-viz[data-confidence-band]:not([data-confidence-band="all"]) .af-fold-ribbon{opacity:.18;}',
      '.af-fold-segment[data-active="true"]{opacity:1;stroke-width:15;}',
      '.af-fold-spine{fill:none;stroke:rgba(255,255,255,.72);stroke-width:1.5;stroke-linecap:round;stroke-dasharray:3 7;}',
      '.af-residue-node{stroke:#e0f2fe;stroke-width:1.5;filter:url(#af-ribbon-glow);animation:afResiduePulse 2.8s ease-in-out infinite;}',
      '.af-residue-node:nth-of-type(2n){animation-delay:-1.2s;}',
      '.af-viz-label{position:absolute;left:12px;top:11px;padding:5px 8px;border:1px solid rgba(125,211,252,.22);border-radius:999px;background:rgba(2,6,23,.72);color:#bae6fd;font-size:8px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;backdrop-filter:blur(8px);}',
      '.af-viz-note{position:absolute;right:12px;bottom:10px;color:#94a3b8;font-size:8px;font-weight:700;}',
      '.af-confidence-key{padding:13px;border:1px solid rgba(148,163,184,.2);border-radius:16px;background:rgba(15,23,42,.78);}',
      '.af-confidence-key h3{margin:0;color:#f8fafc;font-size:12px;}',
      '.af-confidence-key>p{margin:4px 0 10px;color:#94a3b8;font-size:9px;line-height:1.45;}',
      '.af-confidence-row{display:grid;width:100%;grid-template-columns:10px 46px 1fr;align-items:center;gap:7px;padding:7px 5px;border:0;border-top:1px solid rgba(148,163,184,.12);background:transparent;text-align:left;cursor:pointer;}',
      '.af-confidence-row:hover{background:rgba(148,163,184,.08);}',
      '.af-confidence-row[aria-pressed="true"]{background:rgba(56,189,248,.12);box-shadow:inset 3px 0 0 currentColor;}',
      '.af-confidence-dot{width:9px;height:9px;border-radius:999px;box-shadow:0 0 10px currentColor;}',
      '.af-confidence-range{color:#e2e8f0;font:800 9px ui-monospace,monospace;}',
      '.af-confidence-name{color:#cbd5e1;font-size:9px;}',
      '.af-confidence-reading{min-height:33px;margin-top:8px;color:#bae6fd;font-size:9px;line-height:1.45;}',
      '.af-confidence-caution{margin-top:8px;padding:8px;border:1px solid rgba(251,191,36,.2);border-radius:9px;background:rgba(120,53,15,.14);color:#fde68a;font-size:8px;line-height:1.45;}',
      '@keyframes afFoldTrace{0%{stroke-dashoffset:0;opacity:.86}100%{stroke-dashoffset:38;opacity:1}}',
      '@keyframes afResiduePulse{0%,100%{opacity:.58;transform:scale(.92);transform-origin:center}50%{opacity:1;transform:scale(1.12);transform-origin:center}}',
      '.af-primary{min-height:46px;padding:11px 17px;border:1px solid rgba(153,246,228,.38);border-radius:12px;background:linear-gradient(135deg,#0d9488,#0284c7);color:#fff;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(8,145,178,.23);transition:transform .18s,box-shadow .18s;}',
      '.af-primary:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(8,145,178,.3);}',
      '.af-action-note{color:#94a3b8;font-size:10px;line-height:1.45;}',
      '.af-section{padding:16px;border:1px solid #334155;border-radius:16px;background:rgba(15,23,42,.62);}',
      '.af-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:11px;}',
      '.af-section h3{margin:0;color:#f8fafc;font-size:15px;}',
      '.af-section-head p{margin:3px 0 0;color:#94a3b8;font-size:11px;}',
      '.af-route{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;}',
      '.af-route-card{min-width:0;padding:13px;border:1px solid #334155;border-radius:13px;background:#0f172a;}',
      '.af-route-card[data-complete="true"]{border-color:rgba(45,212,191,.55);background:linear-gradient(145deg,rgba(13,148,136,.14),#0f172a 70%);}',
      '.af-route-kicker{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#5eead4;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;}',
      '.af-route-card h4{margin:8px 0 5px;color:#f8fafc;font-size:13px;}',
      '.af-route-card p{margin:0;color:#94a3b8;font-size:10px;line-height:1.5;}',
      '.af-route-state{color:#cbd5e1;font-size:9px;}',
      '.af-support-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr);gap:10px;}',
      '.af-details,.af-guardrail{border:1px solid #334155;border-radius:14px;background:#0f172a;overflow:hidden;}',
      '.af-details summary{min-height:48px;padding:14px;cursor:pointer;color:#e2e8f0;font-size:12px;font-weight:900;}',
      '.af-details ol{margin:0;padding:0 20px 15px 34px;color:#cbd5e1;font-size:11px;line-height:1.55;}',
      '.af-details li+li{margin-top:5px;}',
      '.af-guardrail{padding:14px;border-color:rgba(251,191,36,.34);background:linear-gradient(145deg,rgba(120,53,15,.16),#0f172a 72%);}',
      '.af-guardrail h3{margin:0 0 7px;color:#fde68a;font-size:12px;}',
      '.af-guardrail p{margin:0;color:#cbd5e1;font-size:10px;line-height:1.55;}',
      '.af-guardrail p+p{margin-top:7px;}',
      '.af-alert{padding:11px 13px;border:1px solid rgba(251,191,36,.45);border-radius:12px;background:rgba(120,53,15,.2);color:#fde68a;font-size:11px;line-height:1.5;}',
      '.af-alert a{color:#fef3c7;text-decoration:underline;font-weight:800;}',
      '.af-credit{margin:0;padding:0 4px;color:#64748b;font-size:9px;line-height:1.5;}',
      '@media(max-width:760px){.af-confidence-atlas{grid-template-columns:1fr;}.af-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}.af-route{grid-template-columns:1fr;}.af-support-grid{grid-template-columns:1fr;}}',
      '@media(max-width:520px){.af-mission{padding:15px;border-radius:16px;}.af-mission-top{flex-direction:column;}.af-status{white-space:normal;}.af-metrics{grid-template-columns:1fr 1fr;}.af-primary{width:100%;}.af-actions{align-items:stretch;}.af-action-note{width:100%;}}',
      '@media(prefers-reduced-motion:reduce){.af-primary,.af-fold-ribbon,.af-fold-segment{transition:none;}.af-primary:hover{transform:none;}.af-fold-ribbon,.af-residue-node{animation:none;}}',
      '.theme-contrast .af-mission,.theme-contrast .af-section,.theme-contrast .af-route-card,.theme-contrast .af-details,.theme-contrast .af-guardrail{box-shadow:none;border-width:2px;}'
    ].join('\n');
    if (document.head) document.head.appendChild(alphaFoldStyle);
  }

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
      'Learner support: ' + safeClip(guide.scaffoldLevel || 'not specified', 120),
      'Diagnostic summary: ' + safeClip(guide.diagnostic || 'not provided', 420),
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

  function buildVariantPrompt(payload) {
    var meta = payload && payload.meta ? payload.meta : {};
    var variant = payload && payload.variant ? payload.variant : {};
    var mutations = Array.isArray(variant.mutations) ? variant.mutations.map(function (item) { return safeClip(item, 24); }).slice(0, 12) : [];
    var details = Array.isArray(variant.mutationDetails) ? variant.mutationDetails.slice(0, 12).map(function (item) {
      return safeClip(item && item.notation, 24) + ': ' + safeClip(item && item.fromProperty, 60) + ' to ' + safeClip(item && item.toProperty, 60);
    }) : [];
    return [
      'You are a cautious PROTEIN-VARIANT HYPOTHESIS COACH for a K-12 or introductory structural-biology investigation.',
      'The input is public, synthetic, or teacher-approved classroom material. No raw sequence is provided.',
      'Do not provide diagnosis, treatment, pathogenicity classification, personal genetic risk, ancestry interpretation, or patient-specific conclusions.',
      'RULES:',
      '- Reply with exactly 3 short bullets headed Property change, Possible structural hypotheses, and Best next checks.',
      '- Discuss plausible effects on packing, charge, flexibility, interfaces, pockets, or local stability only as hypotheses.',
      '- State that residue position and 3D context matter and that sequence-only reasoning cannot determine the actual effect.',
      '- Recommend comparing original and variant predictions, local confidence and PAE, site burial or interfaces, trusted references, and experiments where appropriate.',
      '- Do not claim AlphaFold predicts function, stability, binding, or clinical impact.',
      'CLASSROOM VARIANT CONTEXT:',
      'Protein/source: ' + safeClip(meta.name || meta.source || 'classroom protein', 160),
      'Length: ' + safeClip(variant.proteinLength || meta.length || 'unknown', 40),
      'Mutations: ' + (mutations.join(', ') || 'none'),
      'Broad property changes: ' + (details.join('; ') || 'not provided'),
      'Grade band: ' + safeClip(variant.gradeBand || 'not specified', 80),
      'Prediction context: ' + safeClip(meta.confidence || 'No variant prediction has been run yet.', 180),
      'Reply with plain text only.'
    ].join('\n');
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
      '- Match the learner-support scaffold: guided means simpler next steps; extension means stronger validation and evidence-hierarchy prompts.',
      '- Use the diagnostic summary to target the highest-priority issue: privacy, overclaiming, missing evidence, missing limit, or validation.',
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
      'Learner support: ' + safeClip(guide.scaffoldLevel || 'not specified', 120),
      'Scaffold support: ' + safeClip(guide.scaffoldSupport || 'not provided', 900),
      'Confidence guide: ' + safeClip(guide.confidenceGuide || 'not provided', 900),
      'Diagnostic summary: ' + safeClip(guide.diagnostic || 'not provided', 600),
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
    desc: 'Look up public AlphaFold DB protein structures by UniProt/accession, view them in Mol*, import downloaded AlphaFold result files, prepare AlphaFold Server or AlphaFold 3 local-code JSON, and guide students through classroom presets, grade-leveled lessons, biology-context investigation briefs, LMS-ready assignment packets, learner-support scaffolds, confidence/PAE interpretation, accessible claim-evidence-limit reasoning, local claim review, rubric feedback, and no automatic submission.',
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
      var _bandState = React.useState('all'); var confidenceBand = _bandState[0], setConfidenceBand = _bandState[1];
      var aiOn = !!(ctx.aiHintsEnabled && typeof ctx.callGemini === 'function');
      var progress = (ctx.toolData && ctx.toolData._alphaFoldExplorer) || {};
      var openedCount = progress.openedCount || (progress.opened ? 1 : 0);
      var lookupCount = progress.lookupCount || 0;
      var preparedCount = progress.sequencePreparedCount || 0;
      var guidanceCount = (progress.coachCount || 0) + (progress.guideCount || 0) + (progress.variantAnalysisCount || 0);
      var confidenceBands = [
        { id: 'very-high', color: '#1d4ed8', range: '>90', name: t('stem.alphaFold.confidence_very_high', 'Very high'), detail: t('stem.alphaFold.confidence_very_high_detail', 'The local backbone is predicted with very high confidence. Still compare it with experimental or biological evidence.') },
        { id: 'confident', color: '#38bdf8', range: '70-90', name: t('stem.alphaFold.confidence_confident', 'Confident'), detail: t('stem.alphaFold.confidence_confident_detail', 'The local fold is generally reliable, though side chains and flexible boundaries may need closer inspection.') },
        { id: 'low', color: '#facc15', range: '50-70', name: t('stem.alphaFold.confidence_low', 'Low'), detail: t('stem.alphaFold.confidence_low_detail', 'Treat this region cautiously. It may be flexible, disordered, or uncertain in this prediction.') },
        { id: 'very-low', color: '#f97316', range: '<50', name: t('stem.alphaFold.confidence_very_low', 'Very low'), detail: t('stem.alphaFold.confidence_very_low_detail', 'This region should not be interpreted as a dependable structure without supporting evidence.') }
      ];
      var selectedBand = confidenceBands.filter(function (band) { return band.id === confidenceBand; })[0];

      function selectConfidenceBand(id) {
        var next = confidenceBand === id ? 'all' : id;
        setConfidenceBand(next);
        if (announceToSR) announceToSR(next === 'all' ? t('stem.alphaFold.confidence_all_sr', 'Showing all prediction confidence bands.') : t('stem.alphaFold.confidence_selected_sr', 'Showing the selected prediction confidence band:') + ' ' + confidenceBands.filter(function (band) { return band.id === next; })[0].name + '.');
      }

      function metric(label, value, note) {
        return h('div', { className: 'af-metric', role: 'listitem' },
          h('span', { className: 'af-metric-label' }, label),
          h('strong', { className: 'af-metric-value' }, value),
          h('span', { className: 'af-metric-note' }, note));
      }

      function routeCard(step, title, body, complete, state) {
        return h('article', { className: 'af-route-card', 'data-complete': complete ? 'true' : 'false' },
          h('div', { className: 'af-route-kicker' },
            h('span', null, 'Step ' + step),
            h('span', { className: 'af-route-state' }, complete ? '\u2713 Complete' : state)),
          h('h4', null, title),
          h('p', null, body));
      }

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
          var isVariantRequest = data.type === 'allocaf-ai-variant-request';
          if ((!isCoachRequest && !isGuideRequest && !isVariantRequest) || !data.id) return;
          var replyTo = ev.source || _win.current;
          var respond = function (payload) {
            try { if (replyTo) replyTo.postMessage(Object.assign({ type: 'allocaf-ai-response', id: data.id }, payload), '*'); } catch (_) {}
          };
          if (!aiOn) { respond({ error: 'ai-disabled' }); return; }
          bumpSlice(isVariantRequest ? 'variantAnalysisCount' : (isGuideRequest ? 'guideCount' : 'coachCount'));
          Promise.resolve().then(function () {
            var prompt = isVariantRequest ? buildVariantPrompt(data) : (isGuideRequest ? buildGuidePrompt(data) : buildCoachPrompt(data));
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

      function openExplorer() {
        var existing = _win.current;
        if (existing && !existing.closed) { try { existing.focus(); } catch (_) {} return; }
        var lang = (ctx.lang || 'en');
        var w = null;
        try { w = window.open(ALPHAFOLD_URL + '&lang=' + encodeURIComponent(lang) + '&theme=' + encodeURIComponent(ctx.theme || 'dark'), 'alloflow-alphafold-explorer', 'width=1360,height=900'); } catch (_) { w = null; }
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

      var statusText = popupState === 'open'
        ? t('stem.alphaFold.status_open', 'Explorer connected')
        : popupState === 'opening'
          ? t('stem.alphaFold.status_opening', 'Opening companion window')
          : popupState === 'blocked'
            ? t('stem.alphaFold.status_blocked', 'Pop-up needs permission')
            : t('stem.alphaFold.status_ready', 'Ready to investigate');

      return h('main', { className: 'af-launcher', 'data-alphafold-mission': 'true' },
        h('header', { className: 'af-mission' },
          h('div', { className: 'af-mission-top' },
            h('div', null,
              h('p', { className: 'af-eyebrow' }, t('stem.alphaFold.mission_label', 'Structural biology mission')),
              h('h2', { className: 'af-title' }, t('stem.alphaFold.title', 'AlphaFold Explorer')),
              h('p', { className: 'af-subtitle' },
                t('stem.alphaFold.mission_blurb', 'Explore a public protein prediction, inspect confidence and shape, then build a cautious claim from visible evidence.'))),
            h('div', { className: 'af-status', role: 'status', 'aria-live': 'polite' }, statusText)),
          h('div', { className: 'af-confidence-atlas' },
            h('figure', { className: 'af-protein-viz', role: 'img', 'data-confidence-band': confidenceBand, 'aria-label': t('stem.alphaFold.confidence_preview_aria', 'Illustrative folded protein ribbon colored by AlphaFold pLDDT confidence: deep blue and cyan are higher confidence, while yellow and orange are lower confidence. This is a teaching illustration, not a loaded protein prediction.') },
              h('span', { className: 'af-viz-label', 'aria-hidden': 'true' }, t('stem.alphaFold.confidence_preview_label', 'Prediction confidence preview')),
              h('svg', { viewBox: '0 0 520 184', 'aria-hidden': 'true', focusable: 'false' },
                h('defs', null,
                  h('linearGradient', { id: 'af-confidence-gradient', x1: '0%', y1: '0%', x2: '100%', y2: '0%' }, h('stop', { offset: '0%', stopColor: '#1d4ed8' }), h('stop', { offset: '33%', stopColor: '#38bdf8' }), h('stop', { offset: '66%', stopColor: '#facc15' }), h('stop', { offset: '100%', stopColor: '#f97316' })),
                  h('filter', { id: 'af-ribbon-glow', x: '-30%', y: '-30%', width: '160%', height: '160%' }, h('feGaussianBlur', { stdDeviation: '3', result: 'blur' }), h('feMerge', null, h('feMergeNode', { in: 'blur' }), h('feMergeNode', { in: 'SourceGraphic' })))),
                h('path', { className: 'af-fold-shadow', d: 'M32 111 C55 45 110 42 135 92 C160 143 214 155 232 99 C250 44 293 28 322 65 C350 101 334 145 380 145 C432 145 423 72 481 62' }),
                h('path', { className: 'af-fold-ribbon', d: 'M32 111 C55 45 110 42 135 92 C160 143 214 155 232 99 C250 44 293 28 322 65 C350 101 334 145 380 145 C432 145 423 72 481 62' }),
                h('path', { className: 'af-fold-segment', 'data-active': confidenceBand === 'very-high' ? 'true' : 'false', d: 'M32 111 C55 45 110 42 135 92', stroke: '#1d4ed8' }),
                h('path', { className: 'af-fold-segment', 'data-active': confidenceBand === 'confident' ? 'true' : 'false', d: 'M135 92 C160 143 214 155 232 99', stroke: '#38bdf8' }),
                h('path', { className: 'af-fold-segment', 'data-active': confidenceBand === 'low' ? 'true' : 'false', d: 'M232 99 C250 44 293 28 322 65', stroke: '#facc15' }),
                h('path', { className: 'af-fold-segment', 'data-active': confidenceBand === 'very-low' ? 'true' : 'false', d: 'M322 65 C350 101 334 145 380 145 C432 145 423 72 481 62', stroke: '#f97316' }),
                h('path', { className: 'af-fold-spine', d: 'M32 111 C55 45 110 42 135 92 C160 143 214 155 232 99 C250 44 293 28 322 65 C350 101 334 145 380 145 C432 145 423 72 481 62' }),
                h('path', { d: 'M92 58 C76 88 80 119 108 139 M283 39 C310 69 305 105 277 127 M390 145 C371 113 379 82 407 68', fill: 'none', stroke: 'rgba(125,211,252,.34)', strokeWidth: 5, strokeLinecap: 'round' }),
                [[52,81,'#1d4ed8'],[113,66,'#0ea5e9'],[173,132,'#38bdf8'],[235,91,'#7dd3fc'],[294,43,'#facc15'],[339,94,'#fde047'],[400,140,'#fb923c'],[463,67,'#f97316']].map(function (node, i) { return h('circle', { key: i, className: 'af-residue-node', cx: node[0], cy: node[1], r: i === 3 ? 5 : 4, fill: node[2] }); })),
              h('span', { className: 'af-viz-note', 'aria-hidden': 'true' }, t('stem.alphaFold.confidence_preview_note', 'Illustrative model | confidence is not correctness'))),
            h('aside', { className: 'af-confidence-key', 'aria-labelledby': 'af-confidence-heading' },
              h('h3', { id: 'af-confidence-heading' }, t('stem.alphaFold.confidence_title', 'Read the confidence colors')),
              h('p', null, t('stem.alphaFold.confidence_intro', 'pLDDT estimates local model confidence for each residue.')),
              confidenceBands.map(function (band) { return h('button', { key: band.id, type: 'button', className: 'af-confidence-row', style: { color: band.color }, 'aria-pressed': confidenceBand === band.id ? 'true' : 'false', onClick: function () { selectConfidenceBand(band.id); } }, h('span', { className: 'af-confidence-dot', style: { color: band.color, backgroundColor: band.color }, 'aria-hidden': 'true' }), h('span', { className: 'af-confidence-range' }, band.range), h('span', { className: 'af-confidence-name' }, band.name)); }),
              h('div', { className: 'af-confidence-reading', role: 'status', 'aria-live': 'polite' }, selectedBand ? selectedBand.detail : t('stem.alphaFold.confidence_overview_detail', 'Select a confidence band to isolate that part of the illustrative fold and learn how cautiously to interpret it.')),
              h('div', { className: 'af-confidence-caution' }, t('stem.alphaFold.confidence_caution', 'High confidence supports the local fold. It does not prove function, binding, or biological relevance.')))),          h('div', { className: 'af-metrics', role: 'list', 'aria-label': t('stem.alphaFold.progress_label', 'AlphaFold investigation progress') },
            metric(t('stem.alphaFold.metric_launches', 'Explorer launches'), String(openedCount), t('stem.alphaFold.metric_launches_note', 'companion-window sessions')),
            metric(t('stem.alphaFold.metric_structures', 'Public structures'), String(lookupCount), t('stem.alphaFold.metric_structures_note', 'database lookups')),
            metric(t('stem.alphaFold.metric_prepared', 'Inputs prepared'), String(preparedCount), t('stem.alphaFold.metric_prepared_note', 'safe classroom samples')),
            metric(t('stem.alphaFold.metric_guidance', 'Reasoning checks'), String(guidanceCount), aiOn ? t('stem.alphaFold.metric_ai_on', 'AI guidance available') : t('stem.alphaFold.metric_ai_off', 'built-in prompts active'))),
          h('div', { className: 'af-actions' },
            h('button', {
              type: 'button',
              onClick: openExplorer,
              className: 'af-primary',
              'aria-label': t('stem.alphaFold.open_title', 'Open AlphaFold Explorer in a new window')
            }, popupState === 'open' ? t('stem.alphaFold.refocus', 'Return to AlphaFold Explorer') : t('stem.alphaFold.open', 'Open AlphaFold Explorer')),
            h('span', { className: 'af-action-note' },
              t('stem.alphaFold.action_note', 'Opens a companion window. Keep AlloFlow open for progress and optional guidance.')))),

        popupState === 'blocked' && h('div', { className: 'af-alert', role: 'alert' },
          t('stem.alphaFold.blocked_note', 'Pop-up blocked - allow pop-ups for this page and try again. '),
          h('a', {
            href: ALPHAFOLD_URL + '&lang=' + encodeURIComponent(ctx.lang || 'en'),
            target: '_blank',
            rel: 'noopener'
          }, t('stem.alphaFold.blocked_link', 'Open AlphaFold Explorer directly'))),

        h('section', { className: 'af-section', 'aria-labelledby': 'af-route-heading' },
          h('div', { className: 'af-section-head' },
            h('div', null,
              h('h3', { id: 'af-route-heading' }, t('stem.alphaFold.route_title', 'Your investigation route')),
              h('p', null, t('stem.alphaFold.route_subtitle', 'Move from model viewing to evidence-based explanation.'))),
            h('span', { className: 'af-route-state' }, (openedCount > 0 ? 1 : 0) + (lookupCount > 0 ? 1 : 0) + (guidanceCount > 0 ? 1 : 0) + ' / 3')),
          h('div', { className: 'af-route' },
            routeCard('01', t('stem.alphaFold.route_launch', 'Launch safely'), t('stem.alphaFold.route_launch_body', 'Use a public, synthetic, or teacher-approved sample—never personal genetic data.'), openedCount > 0, t('stem.alphaFold.route_launch_state', 'Start here')),
            routeCard('02', t('stem.alphaFold.route_inspect', 'Inspect the model'), t('stem.alphaFold.route_inspect_body', 'Compare folds, domains, surfaces, pLDDT confidence, and PAE uncertainty.'), lookupCount > 0, t('stem.alphaFold.route_inspect_state', 'Observe next')),
            routeCard('03', t('stem.alphaFold.route_explain', 'Explain cautiously'), t('stem.alphaFold.route_explain_body', 'Connect one visible feature to evidence, uncertainty, and a useful next test.'), guidanceCount > 0, t('stem.alphaFold.route_explain_state', 'Build a claim')))),

        h('section', { className: 'af-support-grid', 'aria-label': t('stem.alphaFold.support_label', 'Tutorial and classroom data guidance') },
          h('details', { className: 'af-details' },
            h('summary', null, t('stem.alphaFold.tutorial_title', 'How AlphaFold investigations work (4 steps)')),
            h('ol', null,
              h('li', null, t('stem.alphaFold.tutorial_1', 'AlphaFold predicts a protein 3D structure from an amino acid sequence; AlphaFold DB provides public predicted structures.')),
              h('li', null, t('stem.alphaFold.tutorial_2', 'Start from a classroom preset or choose a grade-level tutorial, lesson length, biology context, assignment format, and support level.')),
              h('li', null, t('stem.alphaFold.tutorial_3', 'Use cautious wording: the model suggests evidence, but it is not final proof by itself.')),
              h('li', null, t('stem.alphaFold.tutorial_4', 'Only prepare JSON for public, synthetic, or teacher-approved classroom samples; the explorer does not automatically submit sequences.')))),
          h('aside', { className: 'af-guardrail', 'aria-labelledby': 'af-guardrail-heading' },
            h('h3', { id: 'af-guardrail-heading' }, t('stem.alphaFold.guardrail_title', 'Classroom data boundary')),
            h('p', null, t('stem.alphaFold.guardrail1', 'Do not enter sequences from yourself, classmates, family members, patients, private genetic tests, or medical reports.')),
            h('p', null, aiOn
              ? t('stem.alphaFold.ai_on', 'AI guidance receives structure metadata, learner context, and student observations or claims—not full protein sequences.')
              : t('stem.alphaFold.ai_off', 'AI hints are off. The explorer still works with built-in inspection prompts.')))),

        h('p', { className: 'af-credit' },
          t('stem.alphaFold.credit', 'Data/viewing: AlphaFold Protein Structure Database by Google DeepMind and EMBL-EBI; Mol* viewer under MIT license. AlphaFold Server opens separately for non-commercial research workflows. Internet is required for database lookup and web viewing.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_alphafold.js loaded - AlphaFold Explorer launcher');
})();
