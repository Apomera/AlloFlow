// ═══════════════════════════════════════════════════════════════
// stem_tool_applab.js — AppLab: AI Mini-App Generator (v1.0)
// Freeform AI-powered app creation — describe what you want,
// AI generates a complete interactive HTML/CSS/JS mini-app.
// Science demos, interactive visualizations, educational tools.
// Registered tool ID: "appLab"
// Category: technology
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

(function() {
  'use strict';

  // ── Audio (auto-injected) ──
  var _applabAC = null;
  function getApplabAC() { if (!_applabAC) { try { _applabAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_applabAC && _applabAC.state === "suspended") { try { _applabAC.resume(); } catch(e) {} } return _applabAC; }
  function applabTone(f,d,tp,v) { var ac = getApplabAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxApplabClick() { applabTone(600, 0.03, "sine", 0.04); }


  // ── WCAG Live Region ──
  (function() {
    if (document.getElementById('allo-live-applab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-applab'; lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  var STORAGE_GALLERY = 'alloAppLabGallery';

  var TEMPLATES = [
    { cat: 'Physics', items: [
      { title: 'Projectile Motion', prompt: 'Interactive projectile motion simulator with adjustable angle, velocity, and gravity. Show trajectory path, max height, and range. Include a launch button and real-time animation.' },
      { title: 'Pendulum Lab', prompt: 'Simple pendulum simulation with adjustable length and mass. Show period calculation, energy bar (kinetic vs potential), and real-time swinging animation on a canvas.' },
      { title: 'Wave Interference', prompt: 'Two-source wave interference pattern visualizer. Adjustable frequency and wavelength sliders. Show constructive and destructive interference with color-coded amplitude map.' },
    ]},
    { cat: 'Chemistry', items: [
      { title: 'pH Scale Explorer', prompt: 'Interactive pH scale (0-14) with common substances. Click a substance to see its pH, color indicator, and whether it is acidic, neutral, or basic. Include litmus paper color change animation.' },
      { title: 'Reaction Rate Lab', prompt: 'Chemical reaction rate simulator. Adjustable temperature, concentration, and surface area sliders. Show particle collision animation and rate graph updating in real-time.' },
    ]},
    { cat: 'Biology', items: [
      { title: 'Cell Division', prompt: 'Animated mitosis visualization showing all phases: Interphase, Prophase, Metaphase, Anaphase, Telophase, Cytokinesis. Step-by-step with labels, play/pause, and descriptions of each phase.' },
      { title: 'Food Web Builder', prompt: 'Interactive food web diagram where users can click organisms to see what they eat and what eats them. Include at least 10 organisms across producers, primary consumers, secondary consumers, and decomposers. Arrows show energy flow.' },
    ]},
    { cat: 'Math', items: [
      { title: 'Function Grapher', prompt: 'Interactive function grapher where users type a math function (like y=sin(x), y=x^2, y=2x+1) and see it plotted on a coordinate grid. Support zoom, pan, and multiple functions in different colors.' },
      { title: 'Fractal Explorer', prompt: 'Mandelbrot set fractal viewer with click-to-zoom. Color palette selector. Show coordinates and zoom level. Canvas-based rendering with smooth color gradients.' },
    ]},
    { cat: 'Earth Science', items: [
      { title: 'Plate Tectonics', prompt: 'Interactive plate tectonics diagram showing convergent, divergent, and transform boundaries. Click each type to see animated cross-section with labels for subduction, rift valleys, and earthquakes.' },
      { title: 'Water Cycle', prompt: 'Animated water cycle diagram with evaporation, condensation, precipitation, and collection. Click each stage to learn about it. Include temperature and humidity indicators.' },
    ]},
    { cat: 'General', items: [
      { title: 'Quiz Builder', prompt: 'A simple quiz app where users can add questions with 4 multiple choice answers, mark the correct one, and then take the quiz with scoring and review.' },
      { title: 'Interactive Timer', prompt: 'A beautiful countdown timer and stopwatch with customizable colors, alarm sound, lap tracking, and full-screen mode. Include preset buttons for common times (1min, 5min, 10min).' },
    ]},
  ];

  window.StemLab.registerTool('appLab', {
    title: 'AppLab',
    icon: '\uD83D\uDCA1',
    description: 'Describe an app or science demo and AI builds it instantly. Edit the code, iterate, and export.',
    category: 'technology',
    gradeRange: 'K-12',
    questHooks: [
      { id: 'first_app', label: 'Generate your first app', icon: '\uD83D\uDE80', check: function(d) { return (d.appsGenerated || 0) >= 1; }, progress: function(d) { return (d.appsGenerated || 0) >= 1 ? 'Created!' : 'Not yet'; } },
      { id: 'three_apps', label: 'Create 3 different apps', icon: '\uD83C\uDFC6', check: function(d) { return (d.appsGenerated || 0) >= 3; }, progress: function(d) { return (d.appsGenerated || 0) + '/3'; } },
      { id: 'edit_code', label: 'Edit the source code of an app', icon: '\u270F\uFE0F', check: function(d) { return !!d.hasEditedCode; }, progress: function(d) { return d.hasEditedCode ? 'Edited!' : 'Not yet'; } },
      { id: 'iterate', label: 'Use "Enhance" to modify an app', icon: '\u2728', check: function(d) { return (d.enhanceCount || 0) >= 1; }, progress: function(d) { return (d.enhanceCount || 0) >= 1 ? 'Enhanced!' : 'Not yet'; } },
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useCallback = React.useCallback;
      var useRef = React.useRef;
      var d = (ctx.toolData && ctx.toolData.appLab) || {};
      var upd = function(key, val) { ctx.setToolData(function(prev) { var td = Object.assign({}, (prev && prev.appLab) || {}); td[key] = val; var patch = {}; patch.appLab = td; return Object.assign({}, prev, patch); }); };
      var callGemini = ctx.callGemini;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var gradeLevel = ctx.gradeLevel || '5th Grade';
      var announceToSR = ctx.announceToSR;
      var ArrowLeft = ctx.icons.ArrowLeft;

      // ── Pipeline Agent Definitions (configurable) ──
      var PIPELINE_AGENTS = [
        { id: 'architect', name: 'Architect', icon: '\uD83C\uDFD7\uFE0F', color: '#818cf8',
          desc: 'Plans the app structure, features, and accessibility requirements before any code is written.',
          learnMore: 'In software engineering, architects design systems before developers write code. This separation of "thinking" from "doing" produces better results because planning prevents structural mistakes that are expensive to fix later.',
          required: false, defaultOn: true },
        { id: 'builder', name: 'Builder', icon: '\uD83D\uDD28', color: '#34d399',
          desc: 'Writes the actual HTML, CSS, and JavaScript code based on the plan (or from scratch if Architect is off).',
          learnMore: 'The Builder agent uses a Large Language Model (LLM) that has been trained on billions of lines of code. It understands programming patterns, HTML structure, CSS styling, and JavaScript logic. When given a plan, it produces higher quality code than when improvising.',
          required: true, defaultOn: true },
        { id: 'reviewer', name: 'Reviewer', icon: '\uD83D\uDD0D', color: '#fbbf24',
          desc: 'A separate AI reads the code with fresh eyes to find bugs, accessibility issues, and UX problems.',
          learnMore: 'Code review is a standard practice in professional software development. A different person (or AI) reviewing code catches mistakes the original author missed. This works because of "fresh eyes" — the reviewer has no assumptions about what the code should do.',
          required: false, defaultOn: true },
        { id: 'fixer', name: 'Fixer', icon: '\uD83D\uDD27', color: '#f87171',
          desc: 'Takes the Reviewer\'s feedback and applies targeted fixes. Only runs if issues were found.',
          learnMore: 'The Fixer receives a specific list of bugs to fix, not a vague "make it better" request. This targeted approach is more reliable than asking an AI to find AND fix issues simultaneously — a principle called "separation of concerns."',
          required: false, defaultOn: true }
      ];

      // State
      var _pipelineConfig = useState(function() {
        try { var saved = JSON.parse(localStorage.getItem('alloAppLabPipeline') || 'null'); if (saved) return saved; } catch(e) {}
        return PIPELINE_AGENTS.map(function(a) { return { id: a.id, enabled: a.defaultOn }; });
      });
      var pipelineConfig = _pipelineConfig[0]; var setPipelineConfig = _pipelineConfig[1];
      var _showPipelineConfig = useState(false); var showPipelineConfig = _showPipelineConfig[0]; var setShowPipelineConfig = _showPipelineConfig[1];
      var _pipelineLive = useState(null); var pipelineLive = _pipelineLive[0]; var setPipelineLive = _pipelineLive[1]; // which agent is currently running

      function toggleAgent(agentId) {
        var agent = PIPELINE_AGENTS.find(function(a) { return a.id === agentId; });
        if (agent && agent.required) return; // can't disable required agents
        var updated = pipelineConfig.map(function(c) {
          return c.id === agentId ? { id: c.id, enabled: !c.enabled } : c;
        });
        setPipelineConfig(updated);
        try { localStorage.setItem('alloAppLabPipeline', JSON.stringify(updated)); } catch(e) {}
      }
      function moveAgent(agentId, direction) {
        var idx = pipelineConfig.findIndex(function(c) { return c.id === agentId; });
        if (idx < 0) return;
        var newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= pipelineConfig.length) return;
        var updated = pipelineConfig.slice();
        var temp = updated[idx]; updated[idx] = updated[newIdx]; updated[newIdx] = temp;
        setPipelineConfig(updated);
        try { localStorage.setItem('alloAppLabPipeline', JSON.stringify(updated)); } catch(e) {}
      }

      var _prompt = useState(''); var prompt = _prompt[0]; var setPrompt = _prompt[1];
      var _html = useState(''); var html = _html[0]; var setHtml = _html[1];
      var _editHtml = useState(''); var editHtml = _editHtml[0]; var setEditHtml = _editHtml[1];
      var _isGenerating = useState(false); var isGenerating = _isGenerating[0]; var setIsGenerating = _isGenerating[1];
      var _genStep = useState(''); var genStep = _genStep[0]; var setGenStep = _genStep[1];
      var _showCode = useState(false); var showCode = _showCode[0]; var setShowCode = _showCode[1];
      var _enhancePrompt = useState(''); var enhancePrompt = _enhancePrompt[0]; var setEnhancePrompt = _enhancePrompt[1];
      var _history = useState([]); var history = _history[0]; var setHistory = _history[1];
      var _historyIdx = useState(-1); var historyIdx = _historyIdx[0]; var setHistoryIdx = _historyIdx[1];
      var _gallery = useState(function() { try { return JSON.parse(localStorage.getItem(STORAGE_GALLERY) || '[]'); } catch(e) { return []; } });
      var gallery = _gallery[0]; var setGallery = _gallery[1];
      var _showGallery = useState(false); var showGallery = _showGallery[0]; var setShowGallery = _showGallery[1];
      var _showSuggestions = useState(false); var showSuggestions = _showSuggestions[0]; var setShowSuggestions = _showSuggestions[1];
      var _suggestions = useState([]); var suggestions = _suggestions[0]; var setSuggestions = _suggestions[1];
      var _sugLoading = useState(false); var sugLoading = _sugLoading[0]; var setSugLoading = _sugLoading[1];
      var _fullscreen = useState(false); var fullscreen = _fullscreen[0]; var setFullscreen = _fullscreen[1];
      var _iframeErrors = useState([]); var iframeErrors = _iframeErrors[0]; var setIframeErrors = _iframeErrors[1];
      var iframeRef = useRef(null);

      // ── Clean AI HTML response ──
      function cleanHtmlResponse(result) {
        var cleaned = (result || '').replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
        if (!cleaned.toLowerCase().startsWith('<!doctype') && !cleaned.toLowerCase().startsWith('<html')) {
          var htmlIdx = cleaned.toLowerCase().indexOf('<!doctype');
          if (htmlIdx === -1) htmlIdx = cleaned.toLowerCase().indexOf('<html');
          if (htmlIdx > 0) cleaned = cleaned.substring(htmlIdx);
        }
        return cleaned;
      }

      // ── Multi-Agent Generate App (configurable pipeline) ──
      var generateApp = useCallback(async function(userPrompt) {
        if (!callGemini || !userPrompt.trim()) return;
        setIsGenerating(true);
        setShowCode(false);
        try {
          var isElem = /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel);
          var gradeCtx = 'Grade level: ' + gradeLevel + (isElem ? ' (use simple language, large buttons, bright colors)' : '');
          var pipelineLog = [];
          var enabledIds = pipelineConfig.filter(function(c) { return c.enabled; }).map(function(c) { return c.id; });
          var step = 0;
          var totalSteps = enabledIds.length;
          function nextStep(icon, name) { step++; setPipelineLive(name.toLowerCase()); setGenStep(icon + ' ' + name + ' (' + step + '/' + totalSteps + ')...'); }

          // ═══ ARCHITECT ═══
          var plan = '';
          if (enabledIds.indexOf('architect') >= 0) {
            nextStep('\uD83C\uDFD7\uFE0F', 'Architecting');
            plan = await callGemini('You are a software architect planning an educational mini-app.\n\nApp request: "' + userPrompt.trim() + '"\n' + gradeCtx + '\n\nCreate a concise technical plan:\n1. Key features (3-5 bullet points)\n2. UI layout (sections, controls, displays)\n3. Core logic (algorithms, data structures)\n4. Accessibility: keyboard nav, aria-labels, 4.5:1 contrast\n5. Edge cases to handle\n\nBe specific and concise. Under 300 words.', false);
            pipelineLog.push({ agent: 'Architect', icon: '\uD83C\uDFD7\uFE0F', result: (plan || '').substring(0, 200).replace(/\n/g, ' ') });
          } else {
            pipelineLog.push({ agent: 'Architect', icon: '\u23ED', result: 'Skipped (disabled in pipeline config)' });
          }

          // ═══ BUILDER (required) ═══
          nextStep('\uD83D\uDD28', 'Building');
          var buildPrompt = 'You are an expert web developer building an educational mini-app.\n\n'
            + 'APP REQUEST: "' + userPrompt.trim() + '"\n' + gradeCtx + '\n\n'
            + (plan ? 'ARCHITECTURE PLAN:\n' + plan.substring(0, 2000) + '\n\n' : '')
            + 'REQUIREMENTS:\n'
            + '- Single HTML file, ALL CSS/JS inline, NO external deps/CDN\n'
            + '- Interactive: sliders, buttons, animations, user input\n'
            + '- Modern CSS: flexbox, gradients, rounded corners, shadows, custom properties\n'
            + '- HTML5 Canvas for simulations/visualizations where appropriate\n'
            + '- WCAG 2.1 AA: aria-labels, 4.5:1 contrast, keyboard nav, semantic HTML, prefers-reduced-motion\n'
            + '- Mobile-friendly responsive layout\n'
            + '- Educational: clear labels, explanations, tooltips\n'
            + '- Error handling: graceful fallbacks\n\n'
            + 'Return ONLY the complete HTML document. No markdown.';
          var builtHtml = cleanHtmlResponse(await callGemini(buildPrompt, false));
          if (!builtHtml || builtHtml.length < 100) throw new Error('Builder produced empty output');
          pipelineLog.push({ agent: 'Builder', icon: '\uD83D\uDD28', result: builtHtml.length + ' chars generated' });

          // ═══ REVIEWER ═══
          var issues = [];
          var currentCode = builtHtml;
          if (enabledIds.indexOf('reviewer') >= 0) {
            nextStep('\uD83D\uDD0D', 'Reviewing');
            var reviewPrompt = 'Review this educational HTML mini-app for issues.\n\nCheck for:\n1. JavaScript errors\n2. CSS/layout issues\n3. Accessibility gaps (aria-labels, contrast, keyboard)\n4. UX problems\n5. Educational quality\n\nCODE:\n```html\n' + builtHtml.substring(0, 12000) + '\n```\n\nReturn JSON array: [{"type":"error|warning|a11y","description":"...","fix":"..."}]\nIf perfect, return []. ONLY JSON.';
            try {
              var rr = await callGemini(reviewPrompt, true);
              rr = (typeof rr === 'string' ? rr : JSON.stringify(rr)).replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
              try { issues = JSON.parse(rr); } catch(e) {}
              if (!Array.isArray(issues)) issues = [];
            } catch(e) { issues = []; }
            pipelineLog.push({ agent: 'Reviewer', icon: '\uD83D\uDD0D', result: issues.length === 0 ? 'No issues found \u2705' : issues.length + ' issue(s) found' });

            // Conditional rebuild for structural errors
            var structErrors = issues.filter(function(i2) { return i2.type === 'error'; });
            if (structErrors.length > 0 && enabledIds.indexOf('builder') >= 0) {
              nextStep('\uD83D\uDD04', 'Rebuilding');
              totalSteps += 2; // rebuild + re-review
              var rebuilt = cleanHtmlResponse(await callGemini('Rebuild this mini-app. Original request: "' + userPrompt.trim() + '"\n' + gradeCtx + '\n\nPrevious issues:\n' + structErrors.map(function(e2, i2) { return (i2+1) + '. ' + e2.description; }).join('\n') + '\n\nFix ALL issues. Return ONLY complete HTML.', false));
              if (rebuilt && rebuilt.length > 100) {
                currentCode = rebuilt;
                pipelineLog.push({ agent: 'Rebuild', icon: '\uD83D\uDD04', result: 'Rebuilt ' + rebuilt.length + ' chars' });
                // Re-review
                try {
                  var rr2 = await callGemini(reviewPrompt.replace(builtHtml.substring(0, 12000), rebuilt.substring(0, 12000)), true);
                  rr2 = (typeof rr2 === 'string' ? rr2 : JSON.stringify(rr2)).replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                  try { issues = JSON.parse(rr2); } catch(e3) { issues = []; }
                  if (!Array.isArray(issues)) issues = [];
                } catch(e4) { issues = []; }
                pipelineLog.push({ agent: 'Re-Review', icon: '\uD83D\uDD0D', result: issues.length === 0 ? 'Passed!' : issues.length + ' remaining' });
              }
            }
          } else {
            pipelineLog.push({ agent: 'Reviewer', icon: '\u23ED', result: 'Skipped (disabled)' });
          }

          // ═══ FIXER ═══
          var finalHtml = currentCode;
          if (enabledIds.indexOf('fixer') >= 0 && issues.length > 0) {
            nextStep('\uD83D\uDD27', 'Fixing');
            var issueList = issues.map(function(iss, i) { return (i+1) + '. [' + (iss.type||'issue') + '] ' + (iss.description||'') + ' \u2192 ' + (iss.fix||''); }).join('\n');
            var fixed = cleanHtmlResponse(await callGemini('Fix these issues precisely.\n\nISSUES:\n' + issueList + '\n\nCODE:\n```html\n' + currentCode.substring(0, 15000) + '\n```\n\nReturn COMPLETE fixed HTML. No markdown.', false));
            if (fixed && fixed.length > currentCode.length * 0.5) finalHtml = fixed;
            pipelineLog.push({ agent: 'Fixer', icon: '\uD83D\uDD27', result: 'Fixed ' + issues.length + ' issue(s)' });
          } else if (enabledIds.indexOf('fixer') >= 0) {
            pipelineLog.push({ agent: 'Fixer', icon: '\u2705', result: 'No issues to fix' });
          } else {
            pipelineLog.push({ agent: 'Fixer', icon: '\u23ED', result: 'Skipped (disabled)' });
          }

          setPipelineLive(null);
          setHtml(finalHtml);
          setEditHtml(finalHtml);
          setHistory(function(prev) { return prev.concat([finalHtml]); });
          setHistoryIdx(function(prev) { return prev + 1; });
          upd('appsGenerated', (d.appsGenerated || 0) + 1);
          upd('lastPipelineLog', pipelineLog);
          if (awardXP) awardXP('appLab', 15);
          var activeAgents = pipelineLog.filter(function(p) { return p.result.indexOf('Skipped') < 0; });
          addToast && addToast('\u2705 ' + activeAgents.length + '-agent pipeline: ' + activeAgents.map(function(p) { return p.agent; }).join(' \u2192 '), 'success');
        } catch(err) {
          addToast && addToast('Generation failed: ' + err.message, 'error');
        }
        setPipelineLive(null);
        setIsGenerating(false);
        setGenStep('');
      }, [callGemini, gradeLevel, addToast, awardXP, announceToSR, d, pipelineConfig]);

      // ── Enhance (iterate) ──
      var enhanceApp = useCallback(async function() {
        if (!callGemini || !enhancePrompt.trim() || !html) return;
        setIsGenerating(true);
        setGenStep('Enhancing your app...');
        try {
          var ePrompt = 'You are modifying an existing HTML mini-app. Here is the current code:\n\n'
            + '```html\n' + html.substring(0, 15000) + '\n```\n\n'
            + 'Modification requested: "' + enhancePrompt.trim() + '"\n\n'
            + 'Apply the modification and return the COMPLETE updated HTML document.\n'
            + 'Keep all existing functionality intact. Only add/change what was requested.\n'
            + 'Return ONLY the HTML — no markdown, no explanation.';
          var result = await callGemini(ePrompt, false);
          var cleaned = (result || '').replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
          if (!cleaned.toLowerCase().startsWith('<!doctype') && !cleaned.toLowerCase().startsWith('<html')) {
            var idx = cleaned.toLowerCase().indexOf('<!doctype');
            if (idx === -1) idx = cleaned.toLowerCase().indexOf('<html');
            if (idx > 0) cleaned = cleaned.substring(idx);
          }
          if (cleaned.length > 100) {
            setHtml(cleaned);
            setEditHtml(cleaned);
            setHistory(function(prev) { return prev.concat([cleaned]); });
            setHistoryIdx(function(prev) { return prev + 1; });
            setEnhancePrompt('');
            upd('enhanceCount', (d.enhanceCount || 0) + 1);
            if (awardXP) awardXP('appLab', 10);
            addToast && addToast('App enhanced!', 'success');
          } else {
            addToast && addToast('Enhancement failed. Try again.', 'error');
          }
        } catch(err) {
          addToast && addToast('Enhancement failed: ' + err.message, 'error');
        }
        setIsGenerating(false);
        setGenStep('');
      }, [callGemini, html, enhancePrompt, addToast, awardXP, d]);

      // ── Suggest Ideas ──
      var suggestIdeas = useCallback(async function() {
        if (!callGemini) return;
        setSugLoading(true);
        setShowSuggestions(true);
        try {
          var topic = ctx.sourceTopic || 'general science and technology';
          var sPrompt = 'Generate 6 ideas for interactive mini-apps or science demos that a ' + gradeLevel + ' student could create.\n'
            + 'Topic context: ' + topic + '\n\n'
            + 'Each idea should be a self-contained interactive web app (HTML/CSS/JS) that teaches a concept.\n'
            + 'Return ONLY a JSON array:\n'
            + '[{"title":"App Title","description":"What it does and what concept it teaches","difficulty":"Beginner|Intermediate|Advanced","prompt":"The exact prompt to generate this app"}]';
          var result = await callGemini(sPrompt, true);
          var parsed = JSON.parse((result || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim());
          if (Array.isArray(parsed)) setSuggestions(parsed);
        } catch(err) {
          addToast && addToast('Could not generate suggestions.', 'error');
        }
        setSugLoading(false);
      }, [callGemini, gradeLevel, ctx.sourceTopic, addToast]);

      // ── Save to Gallery ──
      var saveToGallery = useCallback(function() {
        if (!html) return;
        var title = prompt || 'Untitled App';
        // Extract title from HTML if available
        var titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) title = titleMatch[1];
        var entry = { id: Date.now().toString(36), title: title, html: html, prompt: prompt, created: new Date().toISOString() };
        var updated = [entry].concat(gallery.slice(0, 19));
        setGallery(updated);
        try { localStorage.setItem(STORAGE_GALLERY, JSON.stringify(updated)); } catch(e) {}
        addToast && addToast('Saved to gallery!', 'success');
      }, [html, prompt, gallery, addToast]);

      // ── Export as HTML file ──
      var exportHtml = useCallback(function() {
        if (!html) return;
        var blob = new Blob([html], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = 'applab_' + Date.now() + '.html'; a.click();
        URL.revokeObjectURL(url);
        addToast && addToast('HTML file exported!', 'success');
      }, [html, addToast]);

      // ── Import HTML file ──
      var importHtml = useCallback(function(file) {
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
          var content = ev.target.result;
          if (content && content.length > 50) {
            setHtml(content);
            setEditHtml(content);
            setHistory(function(prev) { return prev.concat([content]); });
            setHistoryIdx(function(prev) { return prev + 1; });
            setPrompt(file.name.replace(/\.html?$/i, ''));
            addToast && addToast('Imported ' + file.name + '!', 'success');
          }
        };
        reader.readAsText(file);
      }, [addToast]);

      // ── Apply code edits ──
      var applyCodeEdit = useCallback(function() {
        if (editHtml !== html) {
          setHtml(editHtml);
          setHistory(function(prev) { return prev.concat([editHtml]); });
          setHistoryIdx(function(prev) { return prev + 1; });
          upd('hasEditedCode', true);
          addToast && addToast('Code changes applied!', 'success');
        }
      }, [editHtml, html, addToast]);

      // ── Undo/Redo ──
      var canUndo = historyIdx > 0;
      var canRedo = historyIdx < history.length - 1;
      var undo = function() { if (canUndo) { var prev = history[historyIdx - 1]; setHtml(prev); setEditHtml(prev); setHistoryIdx(historyIdx - 1); } };
      var redo = function() { if (canRedo) { var next = history[historyIdx + 1]; setHtml(next); setEditHtml(next); setHistoryIdx(historyIdx + 1); } };

      // ── Styles ──
      var PURPLE = '#7c3aed';
      var btn = function(bg, fg, dis) { return { padding: '8px 16px', background: dis ? '#e5e7eb' : bg, color: dis ? '#9ca3af' : fg, border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '12px', cursor: dis ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }; };
      var card = { background: '#fff', borderRadius: '14px', padding: '16px', border: '1px solid #e5e7eb', marginBottom: '12px' };

      // ═══ RENDER ═══
      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' } },

        // ── Header / Back ──
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 } },
          h('button', { onClick: function() { ctx.setStemLabTool(null); }, 'aria-label': 'Back to STEM Lab', style: btn('#f1f5f9', '#374151', false) }, h(ArrowLeft, { size: 14 })),
          h('h2', { style: { fontSize: '18px', fontWeight: 900, color: '#1e293b', margin: 0 } }, '\uD83D\uDCA1 AppLab'),
          h('span', { style: { fontSize: '11px', color: '#6b7280' } }, 'AI Mini-App Generator'),
          html && h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '4px' } },
            h('button', { onClick: undo, disabled: !canUndo, style: btn('#f1f5f9', '#374151', !canUndo), 'aria-label': 'Undo', title: 'Undo' }, '↩'),
            h('button', { onClick: redo, disabled: !canRedo, style: btn('#f1f5f9', '#374151', !canRedo), 'aria-label': 'Redo', title: 'Redo' }, '↪'),
            h('button', { onClick: function() { setShowCode(!showCode); }, style: btn(showCode ? PURPLE : '#f1f5f9', showCode ? '#fff' : '#374151', false), 'aria-label': 'Toggle code view' }, showCode ? '</> Hide Code' : '</> View Code'),
            h('button', { onClick: saveToGallery, style: btn('#f1f5f9', '#374151', false), title: 'Save to gallery', 'aria-label': 'Save to gallery' }, '💾'),
            h('button', { onClick: exportHtml, style: btn('#f1f5f9', '#374151', false), title: 'Export as HTML file', 'aria-label': 'Export as HTML file' }, '📥'),
            h('label', { style: Object.assign({}, btn('#f1f5f9', '#374151', false), { cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }), title: 'Import HTML file', 'aria-label': 'Import HTML file' },
              '📂',
              h('input', { type: 'file', accept: '.html,.htm', style: { display: 'none' }, onChange: function(ev) { if (ev.target.files && ev.target.files[0]) importHtml(ev.target.files[0]); ev.target.value = ''; } })
            ),
            h('button', { onClick: function() { setFullscreen(!fullscreen); }, style: btn('#f1f5f9', '#374151', false), 'aria-label': 'Toggle fullscreen' }, fullscreen ? '🗗' : '⛶')
          )
        ),

        // ── No app yet: show prompt input ──
        !html && h('div', { style: { maxWidth: '700px', margin: '0 auto', width: '100%' } },

          // ── Visual Pipeline Configurator ──
          h('details', { open: showPipelineConfig, style: { marginBottom: '12px', background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' } },
            h('summary', { onClick: function(e) { e.preventDefault(); setShowPipelineConfig(!showPipelineConfig); },
              style: { padding: '10px 14px', color: '#c4b5fd', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', listStyle: 'none' } },
              h('span', null, '\u2699\uFE0F AI Pipeline Configuration'),
              h('span', { style: { fontSize: '10px', color: '#818cf8', background: 'rgba(129,140,248,0.1)', padding: '2px 8px', borderRadius: '10px' } },
                pipelineConfig.filter(function(c) { return c.enabled; }).length + '/' + PIPELINE_AGENTS.length + ' agents active')
            ),
            showPipelineConfig && h('div', { style: { padding: '12px 14px', paddingTop: 0 } },
              h('p', { style: { fontSize: '10px', color: '#94a3b8', marginBottom: '12px', lineHeight: 1.5 } },
                'Configure which AI agents run when generating an app. Toggle agents on/off and reorder them to see how it affects output quality. Each agent specializes in a different aspect of software development.'
              ),

              // Pipeline flow diagram
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', paddingBottom: '8px' },
                role: 'list', 'aria-label': 'AI agent pipeline — drag to reorder, click to toggle' },

                // Input node
                h('div', { style: { background: '#1e293b', border: '2px solid #475569', borderRadius: '10px', padding: '6px 10px', textAlign: 'center', flexShrink: 0 } },
                  h('div', { style: { fontSize: '16px' } }, '\uD83D\uDCDD'),
                  h('div', { style: { fontSize: '8px', color: '#94a3b8', fontWeight: 600 } }, 'Your Prompt')
                ),

                // Arrow
                h('div', { style: { color: '#4f46e5', fontSize: '14px', flexShrink: 0 } }, '\u2192'),

                // Agent nodes
                pipelineConfig.map(function(cfg, ci) {
                  var agent = PIPELINE_AGENTS.find(function(a) { return a.id === cfg.id; });
                  if (!agent) return null;
                  var isLive = pipelineLive === cfg.id;
                  var isOn = cfg.enabled;
                  return h(React.Fragment, { key: cfg.id },
                    h('div', { role: 'listitem', style: {
                      background: isLive ? 'rgba(129,140,248,0.2)' : isOn ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)',
                      border: '2px solid ' + (isLive ? '#818cf8' : isOn ? agent.color + '60' : '#334155'),
                      borderRadius: '10px', padding: '8px', textAlign: 'center', minWidth: '80px', flexShrink: 0,
                      opacity: isOn ? 1 : 0.4, transition: 'all 0.2s', position: 'relative',
                      boxShadow: isLive ? '0 0 12px ' + agent.color + '40' : 'none'
                    } },
                      // Live indicator
                      isLive && h('div', { style: { position: 'absolute', top: -3, right: -3, width: 8, height: 8, background: '#22c55e', borderRadius: '50%', border: '2px solid #0f172a' } }),

                      // Reorder buttons
                      h('div', { style: { display: 'flex', justifyContent: 'center', gap: '2px', marginBottom: '4px' } },
                        ci > 0 && h('button', { onClick: function() { moveAgent(cfg.id, -1); },
                          'aria-label': 'Move ' + agent.name + ' left',
                          style: { background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '10px', padding: '0 2px' } }, '\u25C0'),
                        ci < pipelineConfig.length - 1 && h('button', { onClick: function() { moveAgent(cfg.id, 1); },
                          'aria-label': 'Move ' + agent.name + ' right',
                          style: { background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '10px', padding: '0 2px' } }, '\u25B6')
                      ),

                      h('div', { style: { fontSize: '18px', marginBottom: '2px' } }, agent.icon),
                      h('div', { style: { fontSize: '9px', fontWeight: 700, color: isOn ? agent.color : '#64748b' } }, agent.name),

                      // Toggle
                      !agent.required && h('button', {
                        onClick: function() { toggleAgent(cfg.id); },
                        'aria-label': (isOn ? 'Disable ' : 'Enable ') + agent.name,
                        style: { marginTop: '4px', padding: '2px 8px', borderRadius: '6px', border: '1px solid ' + (isOn ? '#22c55e' : '#dc2626'),
                          background: isOn ? 'rgba(34,197,94,0.1)' : 'rgba(220,38,38,0.1)',
                          color: isOn ? '#22c55e' : '#dc2626', fontSize: '8px', fontWeight: 700, cursor: 'pointer' }
                      }, isOn ? 'ON' : 'OFF'),
                      agent.required && h('div', { style: { marginTop: '4px', fontSize: '8px', color: '#64748b' } }, 'Required')
                    ),

                    // Arrow between agents
                    ci < pipelineConfig.length - 1 && h('div', { style: { color: '#4f46e5', fontSize: '14px', flexShrink: 0 } }, '\u2192')
                  );
                }),

                // Arrow to output
                h('div', { style: { color: '#4f46e5', fontSize: '14px', flexShrink: 0 } }, '\u2192'),

                // Output node
                h('div', { style: { background: '#1e293b', border: '2px solid #22c55e', borderRadius: '10px', padding: '6px 10px', textAlign: 'center', flexShrink: 0 } },
                  h('div', { style: { fontSize: '16px' } }, '\u2705'),
                  h('div', { style: { fontSize: '8px', color: '#22c55e', fontWeight: 600 } }, 'Your App')
                )
              ),

              // Educational description for selected agent
              h('div', { style: { marginTop: '8px' } },
                pipelineConfig.map(function(cfg) {
                  var agent = PIPELINE_AGENTS.find(function(a) { return a.id === cfg.id; });
                  if (!agent) return null;
                  return h('details', { key: cfg.id, style: { marginBottom: '4px' } },
                    h('summary', { style: { fontSize: '10px', color: agent.color, cursor: 'pointer', fontWeight: 600 } }, agent.icon + ' ' + agent.name + ': ' + agent.desc),
                    h('p', { style: { fontSize: '9px', color: '#94a3b8', padding: '4px 0 4px 16px', lineHeight: 1.5 } }, agent.learnMore)
                  );
                })
              ),

              h('div', { style: { marginTop: '8px', padding: '6px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)' } },
                h('p', { style: { fontSize: '9px', color: '#a5b4fc', lineHeight: 1.5 } },
                  '\uD83D\uDCA1 Experiment: Try disabling the Reviewer to see what happens when code isn\'t checked. Or disable the Architect to see how the Builder does without a plan. This teaches how software quality depends on process, not just skill.'
                )
              )
            )
          ),

          // Prompt input
          h('div', { style: card },
            h('label', { style: { fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', display: 'block' } }, 'What do you want to build?'),
            h('textarea', { value: prompt, onChange: function(ev) { setPrompt(ev.target.value); },
              placeholder: 'Describe an interactive app, simulation, or visualization...\n\nExamples:\n• "Interactive solar system with orbiting planets and info on click"\n• "Color mixing tool where you combine primary colors"\n• "Simple calculator with history"',
              rows: 4, style: { width: '100%', padding: '10px 14px', border: '2px solid #d1d5db', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', outline: 'none' },
              'aria-label': 'App description prompt' }),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } },
              h('button', { onClick: function() { generateApp(prompt); }, disabled: isGenerating || !prompt.trim(),
                style: Object.assign({}, btn(PURPLE, '#fff', isGenerating || !prompt.trim()), { padding: '10px 24px', fontSize: '14px' })
              }, isGenerating ? '\u23F3 ' + genStep : '\uD83D\uDE80 Generate App'),
              h('button', { onClick: suggestIdeas, disabled: sugLoading,
                style: btn('#f1f5f9', '#374151', sugLoading) }, sugLoading ? '\u23F3 Thinking...' : '\u2728 Suggest Ideas'),
              h('button', { onClick: function() { setShowGallery(!showGallery); },
                style: btn('#f1f5f9', '#374151', false) }, '\uD83D\uDCC2 Gallery (' + gallery.length + ')')
            )
          ),

          // Suggestions
          showSuggestions && suggestions.length > 0 && h('div', { style: card },
            h('h3', { style: { fontSize: '14px', fontWeight: 700, color: PURPLE, marginBottom: '8px' } }, '\u2728 Suggested Projects'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' } },
              suggestions.map(function(s, i) {
                return h('button', { key: i, onClick: function() { setPrompt(s.prompt || s.description); setShowSuggestions(false); },
                  style: { padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '11px' }
                },
                  h('div', { style: { fontWeight: 700, color: '#1e293b', marginBottom: '2px' } }, s.title),
                  h('div', { style: { color: '#6b7280', fontSize: '10px', lineHeight: 1.4 } }, s.description),
                  s.difficulty && h('span', { style: { fontSize: '9px', background: s.difficulty === 'Beginner' ? '#dcfce7' : s.difficulty === 'Advanced' ? '#fee2e2' : '#fef3c7', color: s.difficulty === 'Beginner' ? '#166534' : s.difficulty === 'Advanced' ? '#991b1b' : '#92400e', padding: '1px 6px', borderRadius: '6px', marginTop: '4px', display: 'inline-block' } }, s.difficulty)
                );
              })
            )
          ),

          // Templates
          h('div', { style: card },
            h('h3', { style: { fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, '\uD83D\uDCCB Quick Templates'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              TEMPLATES.map(function(cat) {
                return h('div', { key: cat.cat },
                  h('div', { style: { fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' } }, cat.cat),
                  h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' } },
                    cat.items.map(function(t) {
                      return h('button', { key: t.title, onClick: function() { setPrompt(t.prompt); },
                        style: { padding: '4px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#374151' }
                      }, t.title);
                    })
                  )
                );
              })
            )
          ),

          // Gallery
          showGallery && gallery.length > 0 && h('div', { style: card },
            h('h3', { style: { fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '8px' } }, '\uD83D\uDCC2 Saved Apps'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' } },
              gallery.map(function(app) {
                return h('div', { key: app.id, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' } },
                  h('div', null,
                    h('div', { style: { fontWeight: 600, fontSize: '12px', color: '#1e293b' } }, app.title),
                    h('div', { style: { fontSize: '10px', color: '#9ca3af' } }, new Date(app.created).toLocaleDateString())
                  ),
                  h('div', { style: { display: 'flex', gap: '4px' } },
                    h('button', { onClick: function() { setHtml(app.html); setEditHtml(app.html); setPrompt(app.prompt || ''); setHistory([app.html]); setHistoryIdx(0); setShowGallery(false); },
                      style: btn('#f1f5f9', '#374151', false) }, 'Load'),
                    h('button', { onClick: function() {
                      var updated = gallery.filter(function(g) { return g.id !== app.id; });
                      setGallery(updated);
                      try { localStorage.setItem(STORAGE_GALLERY, JSON.stringify(updated)); } catch(e) {}
                    }, style: btn('#fee2e2', '#991b1b', false) }, '✕')
                  )
                );
              })
            )
          )
        ),

        // ── Behind the Scenes: Agent Pipeline Visualizer ──
        d.lastPipelineLog && d.lastPipelineLog.length > 0 && h('details', { style: { background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: '12px', border: '1px solid #4338ca', overflow: 'hidden' } },
          h('summary', { style: { padding: '10px 14px', color: '#c4b5fd', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' } },
            '\uD83E\uDD16 Behind the Scenes — How AI Built This App'
          ),
          h('div', { style: { padding: '12px 14px', paddingTop: 0 } },
            h('p', { style: { fontSize: '10px', color: '#a5b4fc', marginBottom: '10px', lineHeight: 1.6 } },
              'This app was built by a team of AI agents working together \u2014 each specializing in a different aspect of software development. This is called "agentic AI" or "multi-agent orchestration." Each agent has a specific role and passes its work to the next agent in the pipeline.'
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              d.lastPipelineLog.map(function(step, si) {
                var colors = { Architect: '#818cf8', Builder: '#34d399', Reviewer: '#fbbf24', Fixer: '#f87171', Rebuild: '#f97316', 'Re-Review': '#fbbf24' };
                var descs = {
                  Architect: 'Plans the app structure, features, and accessibility requirements before any code is written. Like a blueprint for a building.',
                  Builder: 'Writes the actual HTML, CSS, and JavaScript code based on the Architect\'s plan. Creates the working app.',
                  Reviewer: 'Reads the code with fresh eyes to find bugs, accessibility issues, and UX problems. Like a code review at a software company.',
                  Fixer: 'Takes the Reviewer\'s feedback and applies targeted fixes. Only runs if the Reviewer found issues.',
                  Rebuild: 'When the Reviewer finds fundamental structural problems, the Builder runs again with the feedback to create a better version.',
                  'Re-Review': 'Checks the rebuilt code to make sure the structural issues were actually fixed.'
                };
                return h('div', { key: si, style: { display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '3px solid ' + (colors[step.agent] || '#818cf8') } },
                  h('div', { style: { fontSize: '18px', flexShrink: 0 } }, step.icon),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                      h('span', { style: { fontSize: '11px', fontWeight: 700, color: colors[step.agent] || '#c4b5fd' } }, 'Agent ' + (si + 1) + ': ' + step.agent),
                      si < d.lastPipelineLog.length - 1 && h('span', { style: { fontSize: '9px', color: '#6366f1' } }, '\u2192')
                    ),
                    h('p', { style: { fontSize: '9px', color: '#94a3b8', margin: '2px 0 4px', lineHeight: 1.4 } }, descs[step.agent] || ''),
                    h('p', { style: { fontSize: '10px', color: '#e2e8f0', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' } }, step.result)
                  )
                );
              })
            ),
            h('div', { style: { marginTop: '10px', padding: '8px 10px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)' } },
              h('p', { style: { fontSize: '10px', color: '#a5b4fc', fontWeight: 600, marginBottom: '4px' } }, '\uD83D\uDCA1 How does this relate to real software engineering?'),
              h('p', { style: { fontSize: '9px', color: '#94a3b8', lineHeight: 1.5 } },
                'Professional software teams follow a similar pattern: architects design systems, developers write code, QA engineers test for bugs, and developers fix issues found in review. '
                + 'Large Language Models (LLMs) like Gemini can play each of these roles because they understand both natural language instructions and programming code. '
                + 'By giving each AI agent a specific, focused task instead of asking one agent to do everything, the overall quality improves \u2014 just like how a team of specialists outperforms a single generalist.'
              )
            )
          )
        ),

        // ── App loaded: show preview + controls ──
        html && h('div', { style: { flex: 1, display: 'flex', flexDirection: showCode ? 'row' : 'column', gap: '8px', minHeight: 0 } },

          // Code editor (left panel when visible)
          showCode && h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
              h('span', { style: { fontSize: '11px', fontWeight: 700, color: '#6b7280' } }, '</> Source Code'),
              h('div', { style: { display: 'flex', gap: '4px' } },
                h('button', { onClick: applyCodeEdit, disabled: editHtml === html,
                  style: btn(editHtml !== html ? '#22c55e' : '#e5e7eb', editHtml !== html ? '#fff' : '#9ca3af', editHtml === html) }, '▶ Apply Changes'),
                h('button', { onClick: function() { setEditHtml(html); }, style: btn('#f1f5f9', '#374151', false) }, '↩ Reset')
              )
            ),
            h('textarea', { value: editHtml, onChange: function(ev) { setEditHtml(ev.target.value); },
              style: { flex: 1, fontFamily: 'Consolas, Monaco, monospace', fontSize: '11px', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', resize: 'none', background: '#1e293b', color: '#e2e8f0', outline: 'none', tabSize: 2, lineHeight: 1.5 },
              spellCheck: false, 'aria-label': 'HTML source code editor' })
          ),

          // Preview iframe with error capture
          h('div', { style: { flex: showCode ? 1 : 1, display: 'flex', flexDirection: 'column', minHeight: fullscreen ? '80vh' : '300px', position: 'relative' } },
            h('iframe', {
              ref: iframeRef,
              srcDoc: html,
              sandbox: 'allow-scripts',
              title: 'AppLab preview',
              'aria-label': 'Interactive app preview: ' + (prompt || 'generated app'),
              style: { flex: 1, border: '2px solid #e5e7eb', borderRadius: '12px', background: '#fff', width: '100%' },
              onLoad: function() {
                // Inject error listener into iframe to capture runtime errors
                setIframeErrors([]);
                try {
                  var iDoc = iframeRef.current && iframeRef.current.contentWindow;
                  if (iDoc) {
                    iDoc.onerror = function(msg, src, line, col) {
                      setIframeErrors(function(prev) { return prev.concat([{ msg: msg, line: line, col: col }]).slice(-5); });
                      return true; // prevent default
                    };
                  }
                } catch(e) { /* sandbox may block */ }
              }
            }),
            // Error overlay (shows runtime errors from generated app)
            iframeErrors.length > 0 && h('div', { style: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(220,38,38,0.95)', color: '#fff', padding: '8px 12px', borderRadius: '0 0 12px 12px', fontSize: '11px', fontFamily: 'monospace', maxHeight: '80px', overflowY: 'auto', zIndex: 10 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
                h('span', { style: { fontWeight: 'bold' } }, '\u26A0\uFE0F ' + iframeErrors.length + ' error(s) in generated app'),
                h('button', { onClick: function() { setIframeErrors([]); }, style: { background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' } }, '\u2715')
              ),
              iframeErrors.map(function(err, i) {
                return h('div', { key: i, style: { fontSize: '10px', opacity: 0.9 } }, 'Line ' + (err.line || '?') + ': ' + (err.msg || 'Unknown error'));
              })
            ),
            // Enhance bar (below preview)
            h('div', { style: { display: 'flex', gap: '6px', marginTop: '6px', flexShrink: 0 } },
              h('input', { type: 'text', value: enhancePrompt, onChange: function(ev) { setEnhancePrompt(ev.target.value); },
                onKeyDown: function(ev) { if (ev.key === 'Enter' && enhancePrompt.trim() && !isGenerating) enhanceApp(); },
                placeholder: 'Enhance: "add a dark mode toggle" or "make the particles bigger"...',
                style: { flex: 1, padding: '8px 14px', border: '2px solid #d1d5db', borderRadius: '10px', fontSize: '12px', outline: 'none' },
                disabled: isGenerating, 'aria-label': 'Enhancement prompt' }),
              h('button', { onClick: enhanceApp, disabled: !enhancePrompt.trim() || isGenerating,
                style: btn(PURPLE, '#fff', !enhancePrompt.trim() || isGenerating) }, isGenerating ? '\u23F3' : '\u2728 Enhance'),
              h('button', { onClick: function() { setHtml(''); setEditHtml(''); setPrompt(''); setHistory([]); setHistoryIdx(-1); },
                style: btn('#fee2e2', '#991b1b', false), title: 'Start over' }, '\uD83D\uDDD1\uFE0F New')
            )
          )
        ),

        // Loading overlay
        isGenerating && !html && h('div', { style: { textAlign: 'center', padding: '40px', color: '#6b7280' } },
          h('div', { style: { fontSize: '48px', marginBottom: '12px', animation: 'pulse 1.5s infinite' } }, '\uD83D\uDCA1'),
          h('p', { style: { fontSize: '14px', fontWeight: 600 } }, genStep || 'Generating your app...'),
          h('p', { style: { fontSize: '11px', color: '#9ca3af' } }, 'This usually takes 5-15 seconds')
        )
      );
    }
  });

  console.log('[StemLab] stem_tool_applab.js v1.0 loaded');
})();
