// sel_hub_module.js — v1.0.0
// SEL Hub (Social-Emotional Learning) — plugin-only architecture
// All tools load as separate CDN-hashed files via window.SelHub.registerTool()
// Modeled after stem_lab_module.js but designed plugin-first (no inline tools).
(function () {
  if (window.AlloModules && window.AlloModules.SelHub) { console.log('[CDN] SelHub already loaded, skipping duplicate'); } else {

    // ── SelHub Plugin Registry ──
    // Initialize before plugins load so they can register immediately.
    // Plugins (sel_tool_*.js) call window.SelHub.registerTool(id, config)
    if (!window.SelHub) {
      window.SelHub = {
        _registry: {},
        _order: [],
        registerTool: function(id, config) {
          config.id = id;
          config.ready = config.ready !== false;
          this._registry[id] = config;
          if (this._order.indexOf(id) === -1) this._order.push(id);
          console.log('[SelHub] Registered tool: ' + id);
        },
        getRegisteredTools: function() {
          var self = this;
          return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
        },
        isRegistered: function(id) { return !!this._registry[id]; },
        renderTool: function(id, ctx) {
          var tool = this._registry[id];
          if (!tool || !tool.render) return null;
          try { return tool.render(ctx); } catch(e) { console.error('[SelHub] Error rendering ' + id, e); return null; }
        }
      };
    }

    // ── CASEL 5 Competency Categories ──
    // Tools are organized by the CASEL framework competencies.
    // Each tool declares its category; the hub groups them under these headers.
    var SEL_CATEGORIES = [
      { id: 'self-awareness',             label: 'Self-Awareness',             icon: '\uD83E\uDDE0', desc: 'Recognizing emotions, strengths, and areas for growth' },
      { id: 'self-management',            label: 'Self-Management',            icon: '\uD83C\uDFAF', desc: 'Regulating emotions, setting goals, and self-discipline' },
      { id: 'social-awareness',           label: 'Social Awareness',           icon: '\uD83E\uDD1D', desc: 'Empathy, perspective-taking, and appreciating diversity' },
      { id: 'relationship-skills',        label: 'Relationship Skills',        icon: '\uD83D\uDCAC', desc: 'Communication, teamwork, and conflict resolution' },
      { id: 'responsible-decision-making', label: 'Responsible Decision-Making', icon: '\u2696\uFE0F', desc: 'Ethical choices, evaluating consequences, and problem-solving' }
    ];

    // ── Grade-Level Complexity Helpers ──
    // Tools call these to adapt vocabulary, scenario depth, and abstraction.
    // gradeLevel comes from the parent app (e.g. "K", "3rd Grade", "6-8", "9-12").
    function gradeBand(gradeLevel) {
      if (!gradeLevel) return 'elementary';
      var g = String(gradeLevel).toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (/^[k012]|pre|kinder/.test(g)) return 'elementary';
      if (/^[345]/.test(g))             return 'elementary';
      if (/^[678]|middle|6-8/.test(g))  return 'middle';
      return 'high'; // 9-12, high, etc.
    }

    window.AlloModules = window.AlloModules || {};
    window.AlloModules.SelHub = function SelHubModal(props) {
      var React = (typeof window !== 'undefined' && window.React) || require('react');
      var h = React.createElement;

      // ── Props from parent app ──
      var showSelHub      = props.showSelHub;
      var setShowSelHub   = props.setShowSelHub;
      var selHubTab       = props.selHubTab || 'explore';
      var setSelHubTab    = props.setSelHubTab;
      var selHubTool      = props.selHubTool || null;
      var setSelHubTool   = props.setSelHubTool;
      var addToast        = props.addToast;
      var gradeLevel      = props.gradeLevel || '5th Grade';
      var callGemini      = props.callGemini;
      var callTTS         = props.callTTS;
      var callImagen      = props.callImagen;
      var callGeminiVision = props.callGeminiVision;
      var t               = props.t || function(k) { return k; };

      // Lucide icons from parent
      var ArrowLeft    = props.ArrowLeft;
      var X            = props.X;
      var Sparkles     = props.Sparkles;
      var Heart        = props.Heart;
      var GripVertical = props.GripVertical;

      // ── Hub-Level State ──
      var _selToolData  = React.useState({});
      var selToolData   = _selToolData[0];
      var setSelToolData = _selToolData[1];

      var _selToolSearch  = React.useState('');
      var selToolSearch   = _selToolSearch[0];
      var setSelToolSearch = _selToolSearch[1];

      // Tool snapshots (save/load)
      var _selSnapshots = React.useState([]);
      var selSnapshots  = _selSnapshots[0];
      var setSelSnapshots = _selSnapshots[1];

      // XP system
      var _selXp = React.useState(0);
      var selXp  = _selXp[0];
      var setSelXp = _selXp[1];

      function awardSelXP(amount) {
        var pts = amount || 5;
        setSelXp(function(prev) { return prev + pts; });
        if (typeof addToast === 'function') addToast('+' + pts + ' SEL XP!', 'success');
      }

      function getSelXP() { return selXp; }

      // ── Accessibility Helpers ──
      function announceToSR(msg) {
        var el = document.getElementById('sel-sr-announce');
        if (el) { el.textContent = msg; }
      }

      // Sound helper
      var _selAudioCtx = null;
      function selBeep(freq, dur, vol) {
        try {
          if (!_selAudioCtx) _selAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
          var osc = _selAudioCtx.createOscillator();
          var gain = _selAudioCtx.createGain();
          osc.connect(gain); gain.connect(_selAudioCtx.destination);
          osc.frequency.value = freq; osc.type = 'sine';
          gain.gain.value = vol || 0.12;
          gain.gain.exponentialRampToValueAtTime(0.001, _selAudioCtx.currentTime + (dur || 0.15));
          osc.start(); osc.stop(_selAudioCtx.currentTime + (dur || 0.15));
        } catch (e) { }
      }
      function selCelebrate() {
        selBeep(523, 0.15, 0.14);
        setTimeout(function() { selBeep(659, 0.15, 0.14); }, 100);
        setTimeout(function() { selBeep(784, 0.25, 0.16); }, 200);
      }

      // ── Keyboard Navigation ──
      React.useEffect(function() {
        function handleKeyDown(e) {
          if (!showSelHub) return;
          if (e.key === 'Escape') {
            if (selHubTool) { setSelHubTool(null); announceToSR('Returned to tool grid'); }
            else { setShowSelHub(false); }
          }
          if (e.altKey) {
            if (e.key === 'Backspace' || e.key === 'b') { e.preventDefault(); setSelHubTool(null); announceToSR('Returned to tool grid'); }
          }
        }
        document.addEventListener('keydown', handleKeyDown);
        return function() { document.removeEventListener('keydown', handleKeyDown); };
      });

      // ── Reduced motion preference ──
      var _reduceMotion = false;
      try { _reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e) {}

      // ── Theme detection (reads parent app's CSS class) ──
      var isDark = false, isContrast = false;
      try {
        isDark = !!document.querySelector('.theme-dark');
        isContrast = !!document.querySelector('.theme-contrast');
      } catch(e) {}
      var _t = {
        bg:       isContrast ? '#000000' : isDark ? '#0f172a' : '#f8fafc',
        bgCard:   isContrast ? '#000000' : isDark ? '#1e293b' : '#ffffff',
        bgInput:  isContrast ? '#000000' : isDark ? '#1e293b' : '#ffffff',
        border:   isContrast ? '#ffff00' : isDark ? '#334155' : '#e2e8f0',
        text:     isContrast ? '#ffff00' : isDark ? '#f1f5f9' : '#0f172a',
        textMuted:isContrast ? '#ffff00' : isDark ? '#94a3b8' : '#64748b',
        headerBg: isContrast ? '#000000' : isDark ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        headerText: isContrast ? '#ffff00' : '#f1f5f9',
        btnBg:    isContrast ? '#000000' : isDark ? '#334155' : '#e2e8f0',
        btnText:  isContrast ? '#00ff00' : isDark ? '#f1f5f9' : '#334155',
        btnBorder:isContrast ? '2px solid #00ff00' : isDark ? 'none' : 'none',
        accent:   '#7c3aed'
      };

      // ══════════════════════════════════════════════════════════════
      // ── Tool Catalog ──
      // All SEL tools are defined here for the grid display.
      // The actual rendering is handled by the plugin registry.
      // Category headers use { category: true } like STEM Lab.
      // ══════════════════════════════════════════════════════════════
      var _allSelTools = [
        // ── Self-Awareness ──
        { id: '_cat_SelfAwareness', icon: '\uD83E\uDDE0', label: 'Self-Awareness', desc: '', color: 'slate', category: true },
        { id: 'zones',       icon: '\uD83D\uDEA6', label: 'Emotion Zones', desc: 'Identify your zone (blue, green, yellow, red) and explore strategies to self-regulate.', color: 'emerald', recommendedRange: 'K-12' },
        { id: 'emotions',    icon: '\uD83D\uDE0A', label: 'Emotion Explorer',    desc: 'Build emotional vocabulary — identify, name, and rate the intensity of feelings.', color: 'blue', recommendedRange: 'K-8' },
        { id: 'strengths',   icon: '\u2B50',       label: 'Strengths Finder',    desc: 'Discover and reflect on personal strengths, talents, and growth areas.', color: 'amber', recommendedRange: 'K-12' },

        // ── Self-Management ──
        { id: '_cat_SelfManagement', icon: '\uD83C\uDFAF', label: 'Self-Management', desc: '', color: 'slate', category: true },
        { id: 'coping',      icon: '\uD83E\uDDE8', label: 'Coping Toolkit',      desc: 'Explore and practice coping strategies — breathing, grounding, movement, and more.', color: 'teal', recommendedRange: 'K-12' },
        { id: 'mindfulness', icon: '\uD83E\uDDD8', label: 'Mindfulness Corner',  desc: 'Guided breathing exercises, body scans, and mindfulness activities.', color: 'purple', recommendedRange: 'K-12' },
        { id: 'goals',       icon: '\uD83D\uDCCB', label: 'Goal Setter',         desc: 'Set SMART goals, track progress, and celebrate milestones.', color: 'indigo', recommendedRange: '3-12' },

        // ── Social Awareness ──
        { id: '_cat_SocialAwareness', icon: '\uD83E\uDD1D', label: 'Social Awareness', desc: '', color: 'slate', category: true },
        { id: 'perspective', icon: '\uD83D\uDC53', label: 'Perspective Lens',    desc: 'See situations from different viewpoints — practice empathy and perspective-taking.', color: 'rose', recommendedRange: '2-12' },
        { id: 'community',   icon: '\uD83C\uDF0D', label: 'Community & Culture', desc: 'Explore diversity, cultural awareness, and community belonging.', color: 'cyan', recommendedRange: 'K-12' },

        // ── Relationship Skills ──
        { id: '_cat_RelationshipSkills', icon: '\uD83D\uDCAC', label: 'Relationship Skills', desc: '', color: 'slate', category: true },
        { id: 'conflict',    icon: '\u2696\uFE0F', label: 'Conflict Resolution', desc: 'Practice resolving conflicts with role-play scenarios and I-statements.', color: 'orange', recommendedRange: '2-12' },
        { id: 'social',      icon: '\uD83D\uDDE3\uFE0F', label: 'Social Skills Lab',  desc: 'Practice conversation skills, active listening, body language, and cooperation.', color: 'sky', recommendedRange: 'K-8' },
        { id: 'teamwork',    icon: '\uD83E\uDD1C\uD83E\uDD1B', label: 'Teamwork Builder', desc: 'Collaborative challenges and team role exploration.', color: 'lime', recommendedRange: 'K-12' },

        // ── Responsible Decision-Making ──
        { id: '_cat_DecisionMaking', icon: '\u2696\uFE0F', label: 'Responsible Decision-Making', desc: '', color: 'slate', category: true },
        { id: 'decisions',   icon: '\uD83E\uDD14', label: 'Decision Lab',        desc: 'Work through real-life scenarios using stop-think-act frameworks.', color: 'violet', recommendedRange: '3-12' },
        { id: 'journal',     icon: '\uD83D\uDCD3', label: 'Feelings Journal',    desc: 'Daily check-in journal — log moods, triggers, and reflections over time.', color: 'pink', recommendedRange: 'K-12' },
        { id: 'safety',      icon: '\uD83D\uDEE1\uFE0F', label: 'Safety & Boundaries', desc: 'Learn about personal boundaries, trusted adults, and safe vs. unsafe situations.', color: 'red', recommendedRange: 'K-8' },
        { id: 'restorativeCircle', icon: '\uD83E\uDEB6', label: 'Restorative Circle', desc: 'Facilitate restorative and community-building circles. Explore talking pieces and Indigenous roots.', color: 'amber', recommendedRange: '3-12', category: 'relationship-skills' },
        { id: 'civicAction', icon: '\u270A', label: 'Civic Action & Hope', desc: 'Process hard feelings about injustice, build civic agency, and cultivate hope through action.', color: 'teal', recommendedRange: '3-12', category: 'responsible-decision-making' },
        { id: 'ethicalReasoning', icon: '\u2696\uFE0F', label: 'Ethical Reasoning Lab', desc: 'Explore contemporary ethical dilemmas through multiple frameworks, stakeholder mapping, and AI Socratic dialogue.', color: 'slate', recommendedRange: '5-12', category: 'responsible-decision-making' },
        { id: 'cultureExplorer', icon: '\uD83C\uDF0D', label: 'Culture Explorer', desc: 'Take AI-powered deep dives into world cultures with illustrations, audio, and respectful engagement.', color: 'cyan', recommendedRange: 'K-12', category: 'social-awareness' }
      ];

      // ══════════════════════════════════════════════════════════════
      // ── RENDER ──
      // ══════════════════════════════════════════════════════════════
      if (!showSelHub) return null;

      // ── Screen reader live region ──
      var srLive = h('div', {
        id: 'sel-sr-announce',
        'aria-live': 'polite',
        'aria-atomic': 'true',
        className: 'sr-only',
        style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }
      });

      // ── Header bar ──
      var header = h('div', {
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid ' + _t.border, background: _t.headerBg }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          selHubTool && h('button', {
            onClick: function() { setSelHubTool(null); announceToSR('Returned to tool grid'); },
            'aria-label': 'Back to tools',
            style: { background: 'none', border: 'none', color: _t.headerText, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }
          }, ArrowLeft ? h(ArrowLeft, { size: 20 }) : '\u2190'),
          h('h2', { style: { margin: 0, fontSize: 20, fontWeight: 800, color: _t.headerText } },
            '\u2764\uFE0F\u200D\uD83D\uDD25 SEL Hub'
          ),
          h('span', {
            style: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 8 }
          }, gradeBand(gradeLevel) === 'elementary' ? 'Elementary' : gradeBand(gradeLevel) === 'middle' ? 'Middle School' : 'High School')
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          // Theme toggle button
          h('button', {
            onClick: function() { if (typeof window.AlloToggleTheme === 'function') { window.AlloToggleTheme(); setTimeout(function() { setSelToolData(function(p) { return Object.assign({}, p); }); }, 50); } },
            'aria-label': 'Toggle theme (light / dark / high contrast)',
            title: isContrast ? 'High Contrast' : isDark ? 'Dark Mode' : 'Light Mode',
            style: { background: 'rgba(255,255,255,0.12)', border: 'none', color: _t.headerText, cursor: 'pointer', padding: '4px 10px', borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }
          }, isContrast ? '\uD83D\uDC41' : isDark ? '\uD83C\uDF19' : '\u2600\uFE0F', h('span', { style: { fontSize: 10, fontWeight: 700 } }, isContrast ? 'Hi-Con' : isDark ? 'Dark' : 'Light')),
          // XP badge
          h('div', {
            style: { background: _t.accent, color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700 }
          }, '\u2728 ' + selXp + ' XP'),
          // Close button
          h('button', {
            onClick: function() { setShowSelHub(false); },
            'aria-label': 'Close SEL Hub',
            style: { background: 'none', border: 'none', color: _t.headerText, cursor: 'pointer', padding: 4 }
          }, X ? h(X, { size: 20 }) : '\u2715')
        )
      );

      // ══════════════════════════════════════════════════════════════
      // ── Tool Grid (when no tool is selected) ──
      // ══════════════════════════════════════════════════════════════
      var toolGrid = null;
      if (!selHubTool) {
        // Search filter
        var _searchLower = selToolSearch.toLowerCase().trim();
        var _filteredTools = _searchLower ? _allSelTools.filter(function(tool) {
          if (tool.category) {
            // Keep category if any tool in its section matches
            var catIdx = _allSelTools.indexOf(tool);
            for (var j = catIdx + 1; j < _allSelTools.length; j++) {
              if (_allSelTools[j].category) break;
              if (_allSelTools[j].label.toLowerCase().indexOf(_searchLower) !== -1 ||
                  _allSelTools[j].desc.toLowerCase().indexOf(_searchLower) !== -1) return true;
            }
            return false;
          }
          return tool.label.toLowerCase().indexOf(_searchLower) !== -1 ||
                 tool.desc.toLowerCase().indexOf(_searchLower) !== -1;
        }) : _allSelTools;

        // Remove orphan category headers
        if (_searchLower) {
          _filteredTools = _filteredTools.filter(function(tool, i, arr) {
            if (!tool.category) return true;
            for (var j = i + 1; j < arr.length; j++) {
              if (arr[j].category) return false;
              return true;
            }
            return false;
          });
        }

        toolGrid = h('div', { style: { padding: 20 } },
          // Search bar
          h('div', { style: { marginBottom: 16 } },
            h('input', {
              type: 'text',
              placeholder: '\uD83D\uDD0D Search SEL tools...',
              value: selToolSearch,
              onChange: function(e) { setSelToolSearch(e.target.value); },
              'aria-label': 'Search SEL tools',
              style: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid ' + _t.border, background: _t.bgInput, color: _t.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
              onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #8b5cf6'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }
            })
          ),
          // Grid
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 } },
            _filteredTools.map(function(tool) {
              // Category header
              if (tool.category) {
                return h('div', {
                  key: tool.id,
                  style: { gridColumn: '1 / -1', marginTop: 12, marginBottom: 4 }
                },
                  h('h3', { style: { margin: 0, fontSize: 13, fontWeight: 700, color: _t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', null, tool.icon), ' ', tool.label
                  )
                );
              }

              // Tool card
              var isRegistered = window.SelHub && window.SelHub.isRegistered(tool.id);
              var colorMap = {
                emerald: '#10b981', blue: '#3b82f6', amber: '#f59e0b', teal: '#14b8a6',
                purple: '#8b5cf6', indigo: '#6366f1', rose: '#f43f5e', cyan: '#06b6d4',
                orange: '#f97316', sky: '#0ea5e9', lime: '#84cc16', violet: '#7c3aed',
                pink: '#ec4899', red: '#ef4444'
              };
              var cardColor = colorMap[tool.color] || '#3b82f6';

              return h('button', {
                key: tool.id,
                onClick: function() {
                  if (isRegistered) {
                    setSelHubTool(tool.id);
                    announceToSR('Opened ' + tool.label);
                  } else {
                    if (typeof addToast === 'function') addToast(tool.label + ' is loading...', 'info');
                  }
                },
                'aria-label': tool.label + (tool.recommendedRange ? ' (Grades ' + tool.recommendedRange + ')' : ''),
                style: {
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  padding: 16, borderRadius: 14, border: '1px solid ' + _t.border,
                  background: _t.bgCard,
                  cursor: isRegistered ? 'pointer' : 'default',
                  opacity: isRegistered ? 1 : 0.5,
                  textAlign: 'left', transition: 'transform 0.15s, box-shadow 0.15s',
                  position: 'relative'
                },
                onMouseEnter: function(e) { if (isRegistered) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px ' + cardColor + '33'; } },
                onMouseLeave: function(e) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
                  h('span', { style: { fontSize: 24 } }, tool.icon),
                  h('span', { style: { fontSize: 14, fontWeight: 700, color: _t.text } }, tool.label)
                ),
                h('p', { style: { margin: 0, fontSize: 11, color: _t.textMuted, lineHeight: 1.4 } }, tool.desc),
                tool.recommendedRange && h('span', {
                  style: { fontSize: 10, color: cardColor, fontWeight: 600, marginTop: 4 }
                }, 'Grades ' + tool.recommendedRange),
                // Left accent bar
                h('div', { style: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: cardColor } })
              );
            })
          ),
          // No results
          _searchLower && _filteredTools.length === 0 && h('div', { style: { textAlign: 'center', padding: '48px 0', color: _t.textMuted } },
            h('div', { style: { fontSize: 32, marginBottom: 8 } }, '\uD83D\uDD0D'),
            h('p', { style: { fontSize: 14, fontWeight: 700, color: _t.text } }, 'No tools match "' + selToolSearch + '"'),
            h('p', { style: { fontSize: 12 } }, 'Try a different search term')
          )
        );
      }

      // ══════════════════════════════════════════════════════════════
      // ── Plugin Fallback Renderer ──
      // Bridges hub state into the plugin's ctx object, then calls
      // window.SelHub.renderTool(toolId, ctx).
      // ══════════════════════════════════════════════════════════════
      var toolContent = null;
      if (selHubTool && window.SelHub && window.SelHub.isRegistered(selHubTool)) {
        var _ctx = {
          React: React,

          // ── State management ──
          toolData: selToolData,
          setToolData: setSelToolData,
          update: function(toolId, key, val) {
            setSelToolData(function(prev) {
              var toolState = Object.assign({}, (prev && prev[toolId]) || {});
              toolState[key] = val;
              var patch = {}; patch[toolId] = toolState;
              return Object.assign({}, prev, patch);
            });
          },
          updateMulti: function(toolId, obj) {
            setSelToolData(function(prev) {
              var toolState = Object.assign({}, (prev && prev[toolId]) || {}, obj);
              var patch = {}; patch[toolId] = toolState;
              return Object.assign({}, prev, patch);
            });
          },

          // ── Navigation ──
          setSelHubTool: setSelHubTool,
          setSelHubTab: setSelHubTab,
          selHubTab: selHubTab,
          selHubTool: selHubTool,

          // ── Utilities ──
          addToast: addToast,
          awardXP: awardSelXP,
          getXP: getSelXP,
          announceToSR: announceToSR,
          celebrate: selCelebrate,
          beep: selBeep,
          t: t,

          // ── AI integration ──
          callGemini: typeof callGemini === 'function' ? callGemini : null,
          callTTS: typeof callTTS === 'function' ? callTTS : null,
          callImagen: typeof callImagen === 'function' ? callImagen : null,
          callGeminiVision: typeof callGeminiVision === 'function' ? callGeminiVision : null,

          // ── Icons ──
          icons: {
            ArrowLeft: ArrowLeft,
            X: X,
            Sparkles: Sparkles,
            Heart: Heart,
            GripVertical: GripVertical
          },

          // ── Grade / complexity ──
          gradeLevel: gradeLevel,
          gradeBand: gradeBand(gradeLevel), // 'elementary', 'middle', or 'high'

          // ── Snapshots ──
          toolSnapshots: selSnapshots,
          setToolSnapshots: setSelSnapshots,
          saveSnapshot: function(toolId, label, data) {
            setSelSnapshots(function(prev) {
              return (prev || []).concat([{ id: toolId + '-' + Date.now(), tool: toolId, label: label, data: data, ts: Date.now() }]);
            });
          },

          // ── Accessibility helpers ──
          srOnly: function(text) { return h('span', { className: 'sr-only' }, text); },
          a11yClick: function(handler) {
            return {
              onClick: handler,
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); } },
              role: 'button',
              tabIndex: 0
            };
          },

          // ── Theme ──
          isDark: isDark,
          isContrast: isContrast,
          theme: _t,

          // ── Full props passthrough ──
          props: props || {}
        };

        console.log('[SelHub] Rendering plugin: ' + selHubTool);
        try {
          // Wrap plugin render in a stable React component per tool so hooks are isolated.
          if (!window.__selPluginComponents) window.__selPluginComponents = {};
          if (!window.__selPluginComponents[selHubTool]) {
            window.__selPluginComponents[selHubTool] = function SelPluginBridge(props) {
              return window.SelHub.renderTool(props._toolId, props._ctx);
            };
          }
          toolContent = React.createElement(window.__selPluginComponents[selHubTool], { key: 'sel-plugin-' + selHubTool, _toolId: selHubTool, _ctx: _ctx });
        } catch(e) {
          console.error('[SelHub] Plugin render error for ' + selHubTool, e);
          toolContent = h('div', { style: { padding: 40, textAlign: 'center', color: '#ef4444' } },
            h('p', { style: { fontSize: 32, marginBottom: 12 } }, '\u26A0\uFE0F'),
            h('p', { style: { fontWeight: 700, marginBottom: 8 } }, 'Error loading ' + selHubTool),
            h('p', { style: { fontSize: 12, color: _t.textMuted, marginBottom: 16 } }, e.message || 'Unknown error'),
            h('button', {
              onClick: function() { setSelHubTool(null); },
              style: { padding: '8px 20px', borderRadius: 8, background: _t.accent, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }
            }, '\u2190 Back to Tools')
          );
        }
      }

      // ── Loading state (tool selected but plugin not yet loaded) ──
      if (selHubTool && !toolContent) {
        toolContent = h('div', { style: { padding: 60, textAlign: 'center', color: _t.textMuted } },
          h('div', {
            style: {
              fontSize: 40, marginBottom: 16,
              animation: _reduceMotion ? 'none' : 'pulse 2s ease-in-out infinite'
            }
          }, '\u2764\uFE0F\u200D\uD83D\uDD25'),
          h('p', { style: { fontWeight: 700, fontSize: 16, marginBottom: 4, color: _t.text } }, 'Loading tool...'),
          h('p', { style: { fontSize: 12 } }, 'The plugin file is still being fetched.'),
          h('button', {
            onClick: function() { setSelHubTool(null); },
            style: { marginTop: 16, padding: '8px 20px', borderRadius: 8, background: _t.btnBg, color: _t.btnText, fontWeight: 600, border: _t.btnBorder, cursor: 'pointer' }
          }, '\u2190 Back to Tools')
        );
      }

      // ── Full-screen modal shell ──
      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'SEL Hub',
        style: {
          position: 'fixed', inset: 0, zIndex: 9999,
          background: _t.bg, color: _t.text,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }
      },
        srLive,
        header,
        h('div', {
          style: { flex: 1, overflow: 'auto', position: 'relative' }
        },
          toolGrid,
          toolContent
        )
      );
    };
  }
})();
