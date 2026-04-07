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

      // State
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
      var iframeRef = useRef(null);

      // ── Generate App ──
      var generateApp = useCallback(async function(userPrompt) {
        if (!callGemini || !userPrompt.trim()) return;
        setIsGenerating(true);
        setGenStep('Designing your app...');
        setShowCode(false);
        try {
          var isElem = /k|1st|2nd|3rd|4th|5th/i.test(gradeLevel);
          var sysPrompt = 'You are an expert web developer creating educational interactive mini-apps.\n\n'
            + 'Create a complete, self-contained HTML document for: "' + userPrompt.trim() + '"\n\n'
            + 'Requirements:\n'
            + '- Grade level: ' + gradeLevel + (isElem ? ' (use simple language, large buttons, bright colors)' : '') + '\n'
            + '- MUST be a single HTML file with ALL CSS and JavaScript inline (no external dependencies, no CDN links)\n'
            + '- Make it interactive — sliders, buttons, animations, or user input\n'
            + '- Use modern CSS (flexbox, gradients, rounded corners, shadows) for a polished look\n'
            + '- Use HTML5 Canvas for simulations/visualizations where appropriate\n'
            + '- Include clear labels and educational explanations\n'
            + '- Mobile-friendly (responsive layout)\n'
            + '- Use a clean, modern color scheme (not default browser styles)\n'
            + '- Add a title at the top of the page\n\n'
            + 'Return ONLY the complete HTML document starting with <!DOCTYPE html> and ending with </html>.\n'
            + 'Do NOT wrap in markdown code blocks. Do NOT include any explanation text outside the HTML.';

          // Check if prompt is long enough to need chunking
          var result = await callGemini(sysPrompt, false);

          // Clean the result — strip any markdown wrapper
          var cleaned = result || '';
          cleaned = cleaned.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();
          // Ensure it starts with doctype or html tag
          if (!cleaned.toLowerCase().startsWith('<!doctype') && !cleaned.toLowerCase().startsWith('<html')) {
            var htmlIdx = cleaned.toLowerCase().indexOf('<!doctype');
            if (htmlIdx === -1) htmlIdx = cleaned.toLowerCase().indexOf('<html');
            if (htmlIdx > 0) cleaned = cleaned.substring(htmlIdx);
          }

          if (cleaned.length > 100) {
            setHtml(cleaned);
            setEditHtml(cleaned);
            // Save to history for undo
            setHistory(function(prev) { return prev.concat([cleaned]); });
            setHistoryIdx(function(prev) { return prev + 1; });
            upd('appsGenerated', (d.appsGenerated || 0) + 1);
            if (awardXP) awardXP('appLab', 15);
            if (announceToSR) announceToSR('App generated successfully!');
            addToast && addToast('App created! Interact with it below.', 'success');
          } else {
            addToast && addToast('Generation failed — response too short. Try again.', 'error');
          }
        } catch(err) {
          addToast && addToast('Generation failed: ' + err.message, 'error');
        }
        setIsGenerating(false);
        setGenStep('');
      }, [callGemini, gradeLevel, addToast, awardXP, announceToSR, d]);

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
            h('button', { onClick: saveToGallery, style: btn('#f1f5f9', '#374151', false), title: 'Save to gallery' }, '💾'),
            h('button', { onClick: exportHtml, style: btn('#f1f5f9', '#374151', false), title: 'Export as HTML file' }, '📥'),
            h('button', { onClick: function() { setFullscreen(!fullscreen); }, style: btn('#f1f5f9', '#374151', false), 'aria-label': 'Toggle fullscreen' }, fullscreen ? '🗗' : '⛶')
          )
        ),

        // ── No app yet: show prompt input ──
        !html && h('div', { style: { maxWidth: '700px', margin: '0 auto', width: '100%' } },
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

          // Preview iframe
          h('div', { style: { flex: showCode ? 1 : 1, display: 'flex', flexDirection: 'column', minHeight: fullscreen ? '80vh' : '300px', position: 'relative' } },
            h('iframe', {
              ref: iframeRef,
              srcDoc: html,
              sandbox: 'allow-scripts',
              title: 'AppLab preview',
              'aria-label': 'Interactive app preview: ' + (prompt || 'generated app'),
              style: { flex: 1, border: '2px solid #e5e7eb', borderRadius: '12px', background: '#fff', width: '100%' }
            }),
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
