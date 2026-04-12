// sel_hub_module.js — v1.0.0
// SEL Hub (Social-Emotional Learning) — plugin-only architecture
// All tools load as separate CDN-hashed files via window.SelHub.registerTool()
// Modeled after stem_lab_module.js but designed plugin-first (no inline tools).
(function () {
  if (window.AlloModules && window.AlloModules.SelHub) { console.log('[CDN] SelHub already loaded, skipping duplicate'); } else {
  // WCAG 2.4.3: Focus management for modal dialogs
  var _alloFocusTrigger = null;
  function alloSaveFocus() { _alloFocusTrigger = document.activeElement; }
  function alloRestoreFocus() { if (_alloFocusTrigger && typeof _alloFocusTrigger.focus === 'function') { try { _alloFocusTrigger.focus(); } catch(e) {} _alloFocusTrigger = null; } }


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

    // ── WCAG 2.1 AA: Accessibility CSS ──
    if (!document.getElementById('sel-a11y-css')) {
      var selA11yStyle = document.createElement('style');
      selA11yStyle.id = 'sel-a11y-css';
      selA11yStyle.textContent = [
        '@media (prefers-reduced-motion: reduce) { .fixed.inset-0 *, .fixed.inset-0 *::before, .fixed.inset-0 *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
        '.fixed.inset-0 button:focus-visible, .fixed.inset-0 input:focus-visible, .fixed.inset-0 select:focus-visible, .fixed.inset-0 [tabindex]:focus-visible { outline: 2px solid #8b5cf6 !important; outline-offset: 2px !important; border-radius: 4px; }',
        '.fixed.inset-0 :focus:not(:focus-visible) { outline: none !important; }'
      ].join('\n');
      document.head.appendChild(selA11yStyle);
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

    // ── SEL Pathways (Curated Learning Sequences — equivalent to STEM Lab Stations) ──
    // Teachers can use these presets or create custom ones.
    // Each pathway filters the tool grid to show only relevant tools.
    var SEL_PATHWAYS = [
      { id: 'morning_check', name: 'Morning Check-In', icon: '\uD83C\uDF05', desc: 'Start the day with a mood check, breathing, and goal setting', tools: ['zones', 'mindfulness', 'goals', 'journal'], casel: 'self-awareness' },
      { id: 'calm_down', name: 'Calm Down Corner', icon: '\uD83E\uDDD8', desc: 'Regulation strategies for when emotions run high', tools: ['zones', 'coping', 'mindfulness'], casel: 'self-management' },
      { id: 'conflict_unit', name: 'Conflict Resolution Unit', icon: '\u2696\uFE0F', desc: 'Practice resolving disagreements and building repair skills', tools: ['conflict', 'perspective', 'social', 'restorativeCircle'], casel: 'relationship-skills' },
      { id: 'empathy_week', name: 'Empathy & Perspective Week', icon: '\uD83D\uDC53', desc: 'Build empathy through perspective-taking and cultural awareness', tools: ['perspective', 'emotions', 'community', 'cultureExplorer'], casel: 'social-awareness' },
      { id: 'decision_making', name: 'Decision-Making Deep Dive', icon: '\uD83E\uDD14', desc: 'Practice ethical reasoning and responsible choices', tools: ['decisions', 'ethicalReasoning', 'safety'], casel: 'responsible-decision-making' },
      { id: 'self_discovery', name: 'Self-Discovery Journey', icon: '\u2728', desc: 'Explore who you are — strengths, emotions, and growth mindset', tools: ['strengths', 'emotions', 'growthmindset', 'compassion', 'advocacy'], casel: 'self-awareness' },
      { id: 'friendship', name: 'Friendship & Social Skills', icon: '\uD83E\uDD1D', desc: 'Build healthy friendships and communication skills', tools: ['social', 'friendship', 'teamwork', 'peersupport'], casel: 'relationship-skills' },
      { id: 'transitions', name: 'Navigating Change', icon: '\uD83C\uDF31', desc: 'Support students through life transitions and new experiences', tools: ['transitions', 'coping', 'journal', 'goals'], casel: 'self-management' },
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
      var onSafetyFlag    = props.onSafetyFlag || null; // connects to main app's handleAiSafetyFlag
      var studentCodename = props.studentCodename || 'student';
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

      // Category filter (CASEL competencies)
      var _selCategoryFilter = React.useState(null); // null = show all
      var selCategoryFilter = _selCategoryFilter[0];
      var setSelCategoryFilter = _selCategoryFilter[1];

      // SEL Pathway state (teacher-configured curated sequences)
      var _selPathway = React.useState(null); // { name, tools[], objectives[] }
      var activePathway = _selPathway[0];
      var setActivePathway = _selPathway[1];
      var _selPathwayProgress = React.useState({});
      var pathwayProgress = _selPathwayProgress[0];
      var setPathwayProgress = _selPathwayProgress[1];

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
        textMuted:isContrast ? '#ffff00' : isDark ? '#cbd5e1' : '#64748b',
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
      ];
      // Append dynamically registered tools into the correct category positions
      var _dynamicTools = [
        { id: 'restorativeCircle', icon: '\uD83E\uDEB6', label: 'Restorative Circle', desc: 'Facilitate restorative and community-building circles. Explore talking pieces and Indigenous roots.', color: 'amber', recommendedRange: '3-12', _cat: 'relationship-skills' },
        { id: 'compassion', icon: '\uD83E\uDD7A', label: 'Compassion & Self-Talk', desc: 'Practice self-compassion, reframe inner critic, and build a kinder inner voice.', color: 'rose', recommendedRange: 'K-12', _cat: 'self-awareness' },
        { id: 'friendship', icon: '\uD83E\uDD1D', label: 'Friendship Builder', desc: 'Explore friendship styles, repair strategies, and healthy relationship patterns.', color: 'amber', recommendedRange: 'K-12', _cat: 'relationship-skills' },
        { id: 'transitions', icon: '\uD83C\uDF31', label: 'Life Transitions', desc: 'Navigate changes like moving, new schools, and growing up.', color: 'emerald', recommendedRange: 'K-12', _cat: 'self-management' },
        { id: 'upstander', icon: '\uD83E\uDDB8', label: 'Upstander Training', desc: 'Learn to stand up for others safely — bystander to upstander skills.', color: 'red', recommendedRange: '2-12', _cat: 'social-awareness' },
        { id: 'growthmindset', icon: '\uD83E\uDDE0', label: 'Growth Mindset', desc: 'Brain science, reframing challenges, and building resilience.', color: 'violet', recommendedRange: 'K-12', _cat: 'self-management' },
        { id: 'advocacy', icon: '\uD83D\uDCE2', label: 'Self-Advocacy', desc: 'Learn to speak up for your needs, rights, and goals.', color: 'blue', recommendedRange: '3-12', _cat: 'self-awareness' },
        { id: 'civicAction', icon: '\u270A', label: 'Civic Action & Hope', desc: 'Process hard feelings about injustice, build civic agency, and cultivate hope through action.', color: 'teal', recommendedRange: '3-12', _cat: 'responsible-decision-making' },
        { id: 'ethicalReasoning', icon: '\u2696\uFE0F', label: 'Ethical Reasoning Lab', desc: 'Explore contemporary ethical dilemmas through multiple frameworks and AI Socratic dialogue.', color: 'slate', recommendedRange: '5-12', _cat: 'responsible-decision-making' },
        { id: 'cultureExplorer', icon: '\uD83C\uDF0D', label: 'Culture Explorer', desc: 'Take AI-powered deep dives into world cultures with illustrations and audio.', color: 'cyan', recommendedRange: 'K-12', _cat: 'social-awareness' },
        { id: 'voicedetective', icon: '\uD83D\uDD0A', label: 'Voice Detective', desc: 'Listen to voices and identify emotions from tone.', color: 'purple', recommendedRange: 'K-12', _cat: 'social-awareness' },
        { id: 'sociallab', icon: '\uD83C\uDFAD', label: 'Social Skills Lab', desc: 'Practice social scenarios and AI peer roleplay.', color: 'indigo', recommendedRange: 'K-12', _cat: 'relationship-skills' },
        { id: 'peersupport', icon: '\uD83E\uDD1D', label: 'Peer Support Coach', desc: 'Learn OARS listening skills and when to get adult help.', color: 'emerald', recommendedRange: '3-12', _cat: 'relationship-skills' },
      ];
      // Insert each dynamic tool after its category header
      var _catPositions = { 'self-awareness': '_cat_SelfAwareness', 'self-management': '_cat_SelfManagement', 'social-awareness': '_cat_SocialAwareness', 'relationship-skills': '_cat_RelationshipSkills', 'responsible-decision-making': '_cat_DecisionMaking' };
      _dynamicTools.forEach(function(dt) {
        // Only add if the tool is actually registered in SelHub
        if (!window.SelHub || !window.SelHub.isRegistered(dt.id)) return;
        // Don't duplicate if already in the static list
        if (_allSelTools.some(function(t) { return t.id === dt.id; })) return;
        var catHeaderId = _catPositions[dt._cat];
        if (catHeaderId) {
          // Find the last tool in this category section
          var catIdx = _allSelTools.findIndex(function(t) { return t.id === catHeaderId; });
          if (catIdx >= 0) {
            var insertIdx = catIdx + 1;
            while (insertIdx < _allSelTools.length && !_allSelTools[insertIdx].category) insertIdx++;
            _allSelTools.splice(insertIdx, 0, dt);
            return;
          }
        }
        // Fallback: append at end
        _allSelTools.push(dt);
      });

      // ══════════════════════════════════════════════════════════════
      // ── RENDER ──
      // ══════════════════════════════════════════════════════════════
      if (!showSelHub) return null;

      // ── Screen reader live region (fixed: removed bogus role=button) ──
      var srLive = h('div', {
        id: 'sel-sr-announce',
        'aria-live': 'polite',
        'aria-atomic': 'true',
        role: 'status',
        style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0, padding: 0, margin: '-1px' }
      });

      // ── Header bar (fixed: removed bogus role=button from non-interactive containers) ──
      var header = h('div', {
        role: 'banner',
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
          // XP badge (fixed: removed bogus role=button from display-only element)
          h('div', {
            'aria-label': selXp + ' SEL experience points',
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

        // Map tool ids to their CASEL category
        var _toolCategoryMap = {};
        var _currentCat = null;
        _allSelTools.forEach(function(t2) {
          if (t2.category) { _currentCat = t2.id; }
          else { _toolCategoryMap[t2.id] = _currentCat; }
        });

        // Apply category filter on top of search
        if (selCategoryFilter) {
          var catHeaderId = '_cat_' + selCategoryFilter.replace(/[-\s]/g, '');
          // Find the matching category header
          var matchHeader = _allSelTools.find(function(t2) {
            return t2.category && t2.id.toLowerCase().indexOf(selCategoryFilter.replace(/[-\s]/g, '').toLowerCase()) >= 0;
          });
          if (matchHeader) {
            _filteredTools = _filteredTools.filter(function(t2) {
              if (t2.category) return t2.id === matchHeader.id;
              return _toolCategoryMap[t2.id] === matchHeader.id;
            });
          }
        }

        // If a pathway is active, filter to pathway tools only
        if (activePathway && activePathway.tools && activePathway.tools.length > 0) {
          var _pathTools = activePathway.tools;
          _filteredTools = _filteredTools.filter(function(t2) {
            if (t2.category) return true;
            return _pathTools.indexOf(t2.id) >= 0;
          });
          // Remove empty category headers
          _filteredTools = _filteredTools.filter(function(t2, i, arr) {
            if (!t2.category) return true;
            for (var j = i + 1; j < arr.length; j++) {
              if (arr[j].category) return false;
              return true;
            }
            return false;
          });
        }

        toolGrid = h('div', { role: 'main', 'aria-label': 'SEL Hub tool selection', style: { padding: 20 } },
          // Active pathway banner
          activePathway && h('div', {
            style: { marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed15, #6366f115)', border: '1px solid #7c3aed33', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
          },
            h('div', null,
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7c3aed' } }, '\uD83D\uDEE4\uFE0F ' + activePathway.name),
              h('div', { style: { fontSize: 11, color: _t.textMuted, marginTop: 2 } }, activePathway.tools.length + ' tools \u2022 ' + Object.keys(pathwayProgress).filter(function(k) { return pathwayProgress[k]; }).length + '/' + activePathway.tools.length + ' completed')
            ),
            h('button', {
              onClick: function() { setActivePathway(null); setPathwayProgress({}); announceToSR('Pathway cleared'); },
              'aria-label': 'Exit pathway mode',
              style: { background: 'none', border: '1px solid #7c3aed44', borderRadius: 8, padding: '4px 10px', color: '#7c3aed', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
            }, '\u2715 Exit Pathway')
          ),
          // Search bar
          h('div', { style: { marginBottom: 12 } },
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
          // CASEL category filter chips
          h('div', { role: 'group', 'aria-label': 'Filter by CASEL competency', style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 } },
            h('button', {
              onClick: function() { setSelCategoryFilter(null); announceToSR('Showing all categories'); },
              'aria-label': 'Show all categories',
              'aria-pressed': selCategoryFilter === null ? 'true' : 'false',
              style: { padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (selCategoryFilter === null ? '#7c3aed' : _t.border), background: selCategoryFilter === null ? '#7c3aed' : _t.bgCard, color: selCategoryFilter === null ? '#fff' : _t.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }
            }, 'All'),
            SEL_CATEGORIES.map(function(cat) {
              var isActive = selCategoryFilter === cat.id;
              return h('button', {
                key: cat.id,
                onClick: function() { setSelCategoryFilter(isActive ? null : cat.id); announceToSR(isActive ? 'Showing all categories' : 'Filtered to ' + cat.label); },
                'aria-label': 'Filter: ' + cat.label,
                'aria-pressed': isActive ? 'true' : 'false',
                style: { padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (isActive ? '#7c3aed' : _t.border), background: isActive ? '#7c3aed' : _t.bgCard, color: isActive ? '#fff' : _t.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4 }
              }, cat.icon + ' ' + cat.label);
            })
          ),
          // SEL Pathways — curated learning sequences (collapsed by default)
          !activePathway && h('details', {
            style: { marginBottom: 16, borderRadius: 12, border: '1px solid ' + _t.border, overflow: 'hidden' }
          },
            h('summary', {
              style: { padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: _t.textMuted, background: _t.bgCard, display: 'flex', alignItems: 'center', gap: 6 }
            }, '\uD83D\uDEE4\uFE0F SEL Pathways \u2014 Curated Learning Sequences'),
            h('div', { style: { padding: '8px 12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 } },
              SEL_PATHWAYS.map(function(pw) {
                return h('button', {
                  key: pw.id,
                  onClick: function() {
                    setActivePathway(pw);
                    setPathwayProgress({});
                    setSelCategoryFilter(null);
                    setSelToolSearch('');
                    announceToSR('Started pathway: ' + pw.name);
                    if (typeof addToast === 'function') addToast('\uD83D\uDEE4\uFE0F ' + pw.name + ' pathway started!', 'success');
                  },
                  'aria-label': pw.name + ': ' + pw.desc,
                  style: { textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + _t.border, background: _t.bgCard, cursor: 'pointer', transition: 'all 0.15s' }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                    h('span', { style: { fontSize: 16 } }, pw.icon),
                    h('span', { style: { fontSize: 12, fontWeight: 700, color: _t.text } }, pw.name)
                  ),
                  h('div', { style: { fontSize: 10, color: _t.textMuted, lineHeight: 1.4 } }, pw.desc),
                  h('div', { style: { fontSize: 9, color: '#7c3aed', fontWeight: 600, marginTop: 4 } }, pw.tools.length + ' activities')
                );
              })
            )
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
                    // Track pathway progress
                    if (activePathway && activePathway.tools.indexOf(tool.id) >= 0) {
                      setPathwayProgress(function(prev) { var n = Object.assign({}, prev); n[tool.id] = true; return n; });
                    }
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
          callTTS: typeof callTTS === 'function' ? function selSpeakTTS(text, voice, speed) {
            return callTTS(text, voice, speed).then(function(url) {
              if (url) { var a = new Audio(url); a.play().catch(function() {}); }
              return url;
            }).catch(function(e) { console.warn('[SEL TTS]', e && e.message); return null; });
          } : null,
          callImagen: typeof callImagen === 'function' ? callImagen : null,
          callGeminiVision: typeof callGeminiVision === 'function' ? callGeminiVision : null,
          onSafetyFlag: onSafetyFlag,
          studentCodename: studentCodename,

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
          toolContent = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 40, textAlign: 'center', color: '#ef4444' } },
            h('p', { style: { fontSize: 32, marginBottom: 12 } }, '\u26A0\uFE0F'),
            h('p', { style: { fontWeight: 700, marginBottom: 8 } }, 'Error loading ' + selHubTool),
            h('p', { style: { fontSize: 12, color: _t.textMuted, marginBottom: 16 } }, e.message || 'Unknown error'),
            h('button', { 'aria-label': 'Back to Tools',
              onClick: function() { setSelHubTool(null); },
              style: { padding: '8px 20px', borderRadius: 8, background: _t.accent, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }
            }, '\u2190 Back to Tools')
          );
        }
      }

      // ── Loading state (tool selected but plugin not yet loaded) ──
      if (selHubTool && !toolContent) {
        toolContent = h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { padding: 60, textAlign: 'center', color: _t.textMuted } },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
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
