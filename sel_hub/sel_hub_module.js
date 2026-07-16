// sel_hub_module.js — v1.0.0
// SEL Hub (Social-Emotional Learning) — plugin-only architecture
// All tools load as separate CDN-hashed files via window.SelHub.registerTool()
// Modeled after stem_lab_module.js but designed plugin-first (no inline tools).
(function () {
  if (window.AlloModules && window.AlloModules.SelHub) { console.log('[CDN] SelHub already loaded, skipping duplicate'); } else {
  // WCAG 2.4.3: Focus management for modal dialogs
  var _alloFocusTrigger = null;
  var _alloLastToolCardId = null;
  function alloSaveFocus() { _alloFocusTrigger = document.activeElement; }
  function alloRestoreFocus() {
    if (_alloFocusTrigger && typeof _alloFocusTrigger.focus === 'function') {
      try { _alloFocusTrigger.focus(); _alloFocusTrigger = null; return true; } catch(e) {}
    }
    _alloFocusTrigger = null;
    return false;
  }
  function alloFocusSelHubStart() {
    try {
      var target = document.querySelector('[aria-label="For Educators: how to use this Hub responsibly"]')
        || document.querySelector('[aria-label="Toggle theme (light / dark / high contrast)"]')
        || document.querySelector('[aria-label="Close SEL Hub"]');
      if (target && target.focus) target.focus();
    } catch (e) {}
  }
  function alloRestoreOrFocusSelHubStart() {
    setTimeout(function() {
      if (!alloRestoreFocus()) alloFocusSelHubStart();
    }, 0);
  }
  function alloFocusStationNameInput() {
    setTimeout(function() {
      try {
        var input = document.getElementById('sel-station-name-input');
        if (input && input.focus) input.focus();
      } catch (e) {}
    }, 50);
  }
  function alloFocusToolStart() {
    setTimeout(function() {
      try {
        var target = document.querySelector('[aria-label="Back to SEL tools"]')
          || document.querySelector('[aria-label="Back to tools"]')
          || document.querySelector('[aria-label="Back to Tools"]');
        if (target && target.focus) target.focus();
      } catch (e) {}
    }, 60);
  }
  function alloFocusToolCard(toolId) {
    setTimeout(function() {
      try {
        var id = toolId || _alloLastToolCardId;
        var target = null;
        if (id) {
          var cards = document.querySelectorAll('[data-sel-tool-card-id]');
          for (var i = 0; i < cards.length; i++) {
            if (cards[i].getAttribute('data-sel-tool-card-id') === id) { target = cards[i]; break; }
          }
        }
        if (!target) target = document.querySelector('[aria-label="Search SEL tools"]');
        if (target && target.focus) target.focus();
      } catch (e) {}
    }, 80);
  }


    // ── SelHub Plugin Registry ──
    // Initialize before plugins load so they can register immediately.
    // Plugins (sel_tool_*.js) call window.SelHub.registerTool(id, config)
    if (!window.SelHub) {
      window.SelHub = {
        _registry: {},
        _order: [],
        _standardShellTools: {
          zones: {
            time: '5-8 min',
            purpose: 'Name your current zone and choose a regulation strategy that fits.',
            next: 'Check your zone, choose one strategy, then save if you want to revisit it.'
          },
          coping: {
            time: '3-10 min',
            purpose: 'Choose a coping strategy and practice it once with a clear stopping point.',
            next: 'Pick one body-based or grounding strategy, try it, then notice whether it helped.'
          },
          journal: {
            time: '5-12 min',
            purpose: 'Write a private reflection and notice patterns you may want to keep.',
            next: 'Choose a prompt, write honestly, and save or export before closing.'
          },
          emotions: {
            time: '4-8 min',
            purpose: 'Build emotional vocabulary and name what you are feeling with more precision.',
            next: 'Pick a feeling, rate its intensity, then choose one word that fits best.'
          },
          mindfulness: {
            time: '2-10 min',
            purpose: 'Pause, breathe, and practice attention without needing to write anything.',
            next: 'Choose one short practice, follow it through, then notice what changed.'
          },
          thoughtRecord: {
            time: '8-15 min',
            purpose: 'Slow down a difficult thought and look for a more balanced view.',
            next: 'Name the situation, rate the feeling, then test the thought against evidence.'
          },
          anxietyToolkit: {
            time: '5-12 min',
            purpose: 'Sort worry, reduce anxiety intensity, and choose a practical next step.',
            next: 'Pick the worry that is loudest, try one strategy, then save the plan if it helps.'
          },
          sleep: {
            time: '4-10 min',
            purpose: 'Notice sleep barriers and choose one rest habit to try next.',
            next: 'Check what is getting in the way, choose one small change, then revisit later.'
          },
          goals: {
            time: '5-10 min',
            purpose: 'Turn an intention into a concrete, realistic next action.',
            next: 'Write one goal, choose a first step, and save the plan before closing.'
          },
          friendship: {
            time: '5-10 min',
            purpose: 'Think through friendship needs, belonging, and peer choices.',
            next: 'Choose one friendship situation and identify one kind next move.'
          },
          conflict: {
            time: '6-12 min',
            purpose: 'Understand a conflict and prepare a repair-focused response.',
            next: 'Name what happened, consider both sides, then choose one repair action.'
          },
          safety: {
            time: '8-15 min',
            purpose: 'Create a practical safety plan and identify trusted supports.',
            next: 'Add warning signs, coping steps, and people to contact; save before closing.'
          },
          crisiscompanion: {
            time: '3-10 min',
            purpose: 'Use a structured support path when emotions feel urgent or unsafe.',
            next: 'Choose the closest support option and involve a trusted adult or crisis service when needed.'
          }
        },
        registerTool: function(id, config) {
          config.id = id;
          config.ready = config.ready !== false;
          // Normalize legacy field-name aliases + defaults (see stem_lab_module.js for rationale)
          if (!config.label) config.label = config.title || config.name || id;
          if (!config.desc) config.desc = config.description || '';
          if (!config.color) config.color = 'slate';
          if (!config.category) config.category = 'general';
          this._registry[id] = config;
          if (this._order.indexOf(id) === -1) this._order.push(id);
          console.log('[SelHub] Registered tool: ' + id);
        },
        getRegisteredTools: function() {
          var self = this;
          return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
        },
        isRegistered: function(id) { return !!this._registry[id]; },
        _wrapStandardToolShell: function(id, tool, content, ctx) {
          if (!ctx || !ctx.React) return content;
          var h = ctx.React.createElement;
          var meta = (this._standardShellTools && this._standardShellTools[id]) || {};
          var palette = (ctx.theme && ctx.theme.palette) || ctx.themePalette || {};
          var isDark = !!((ctx.theme && ctx.theme.isDark) || ctx.isDark);
          var isContrast = !!((ctx.theme && ctx.theme.isContrast) || ctx.isContrast);
          var title = tool.label || tool.title || tool.name || id;
          var icon = tool.icon || '*';
          var category = tool.category ? String(tool.category).replace(/[-_]/g, ' ') : 'SEL practice';
          category = category.charAt(0).toUpperCase() + category.slice(1);
          var surface = isContrast ? '#000000' : (isDark ? '#111827' : '#f8fafc');
          var headerBg = isContrast ? '#000000' : (isDark ? '#0f172a' : '#ffffff');
          var border = palette.border || (isContrast ? '#ffff00' : (isDark ? '#334155' : '#e2e8f0'));
          var text = palette.text || (isContrast ? '#ffff00' : (isDark ? '#f8fafc' : '#0f172a'));
          var muted = palette.textMuted || (isContrast ? '#ffff00' : (isDark ? '#cbd5e1' : '#64748b'));
          var accent = palette.accent || '#7c3aed';
          var accentText = palette.accentText || (isContrast ? '#000000' : '#ffffff');
          var purpose = meta.purpose || tool.desc || tool.description || 'Practice one SEL skill with care.';
          if (purpose.length > 180) purpose = purpose.slice(0, 177).replace(/\s+\S*$/, '') + '...';
          var nextStep = meta.next || 'Complete one small step, then decide whether to save.';
          var savePolicy = (typeof ctx.getSavePolicy === 'function') ? ctx.getSavePolicy(id) : {
            checkpointLabel: 'Private checkpoint',
            sharePacketLabel: 'Share Packet eligible'
          };

          function requestSave() {
            if (ctx.props && typeof ctx.props.onExportRequested === 'function') {
              try { ctx.props.onExportRequested(); } catch (e) {}
            } else {
              try { window.dispatchEvent(new CustomEvent('alloflow-sel-export-requested', { detail: { source: 'sel-tool-shell', toolId: id } })); } catch (e) {}
            }
            if (typeof ctx.addToast === 'function') ctx.addToast('Preparing to save your SEL work...', 'info');
            if (typeof ctx.announceToSR === 'function') ctx.announceToSR('Save requested for ' + title);
          }

          function goBack() {
            if (typeof ctx.setSelHubTool === 'function') ctx.setSelHubTool(null);
            if (typeof ctx.announceToSR === 'function') ctx.announceToSR('Returned to tool grid');
            alloFocusToolCard(id);
          }

          function pill(label) {
            return h('span', {
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 28,
                padding: '5px 9px',
                borderRadius: 8,
                border: '1px solid ' + border,
                color: muted,
                background: isContrast ? '#000000' : (isDark ? '#0b1120' : '#f8fafc'),
                fontSize: 12,
                fontWeight: 800,
                whiteSpace: 'nowrap'
              }
            }, label);
          }

          return h('section', {
            'data-sel-standard-shell': id,
            style: {
              background: surface,
              color: text,
              minHeight: '100%',
              display: 'flex',
              flexDirection: 'column'
            }
          },
            h('div', {
              style: {
                background: headerBg,
                borderBottom: '1px solid ' + border,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap'
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 300px' } },
                h('button', {
                  type: 'button',
                  onClick: goBack,
                  'aria-label': 'Back to SEL tools',
                  style: {
                    minWidth: 40,
                    height: 40,
                    borderRadius: 8,
                    border: '1px solid ' + border,
                    background: isContrast ? '#000000' : (isDark ? '#111827' : '#ffffff'),
                    color: text,
                    cursor: 'pointer',
                    fontSize: 18,
                    fontWeight: 900
                  }
                }, '\u2190'),
                h('div', {
                  'aria-hidden': 'true',
                  style: {
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: accent,
                    color: accentText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flex: '0 0 auto'
                  }
                }, icon),
                h('div', { style: { minWidth: 0 } },
                  h('div', { style: { color: muted, fontSize: 12, fontWeight: 800, marginBottom: 2 } }, category),
                  h('h3', { style: { margin: 0, color: text, fontSize: 20, lineHeight: 1.2, fontWeight: 900 } }, title)
                )
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
                pill(meta.time || 'SEL practice'),
                pill(savePolicy.checkpointLabel || 'Private checkpoint'),
                pill(savePolicy.sharePacketLabel || 'Share Packet eligible'),
                h('button', {
                  type: 'button',
                  onClick: requestSave,
                  'aria-label': 'Export SEL project file now',
                  style: {
                    minHeight: 36,
                    borderRadius: 8,
                    border: '1px solid ' + accent,
                    background: accent,
                    color: accentText,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 900,
                    padding: '7px 12px'
                  }
                }, 'Export now')
              )
            ),
            h('div', {
              style: {
                padding: '10px 16px',
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
                borderBottom: '1px solid ' + border,
                background: isContrast ? '#000000' : (isDark ? '#111827' : '#f8fafc')
              }
            },
              h('p', { style: { margin: 0, flex: '1 1 260px', color: text, fontSize: 13, lineHeight: 1.5 } },
                h('strong', { style: { color: muted, marginRight: 6 } }, 'Purpose'),
                purpose
              ),
              h('p', { style: { margin: 0, flex: '1 1 260px', color: text, fontSize: 13, lineHeight: 1.5 } },
                h('strong', { style: { color: muted, marginRight: 6 } }, 'Next step'),
                nextStep
              ),
              h('p', { style: { margin: 0, flex: '1 1 260px', color: text, fontSize: 13, lineHeight: 1.5 } },
                h('strong', { style: { color: muted, marginRight: 6 } }, 'Saved work'),
                'Tool checkpoints stay private here unless you choose them for a Share Packet.'
              )
            ),
            h('div', { style: { padding: 16, minWidth: 0, flex: '1 1 auto' } }, content)
          );
        },
        renderTool: function(id, ctx) {
          var tool = this._registry[id];
          if (!tool || !tool.render) return null;
          var hasReact = ctx && ctx.React;
          var useStandardShell = hasReact && tool.standardShell !== false;
          var needsDarkShell = tool.lightBackground !== true && hasReact;
          var renderCtx = ctx;
          if (needsDarkShell && ctx) {
            var shellTheme = Object.assign({}, ctx.theme || {}, { isDark: true });
            renderCtx = Object.assign({}, ctx, { isDark: true, theme: shellTheme });
          }
          var rendered;
          try { rendered = tool.render(renderCtx); }
          catch(e) { console.error('[SelHub] Error rendering ' + id, e); return null; }
          if (rendered == null) return null;
          var body = rendered;
          // ── WCAG dark-shell auto-wrap ──
          // Same vulnerability + fix as STEM Lab's host-level wrap. 69 of 70
          // SEL tools (audit May 2026) hardcode dark-mode text colors that
          // would fail WCAG AA on the default light SEL Hub host page
          // (#86efac on white = 1.6:1, need 4.5:1).
          //
          // Zero of the 70 tools use the _t theme palette this module provides
          // (audit confirmed). Migration to theme-aware would be 70 tools ×
          // dozens of color refs each = thousands of edits. A single host-
          // level dark shell achieves the same fix in one place.
          //
          // Opt out by setting `lightBackground: true` in registerTool config
          // (intended for any future tool that genuinely needs a light surface).
          if (needsDarkShell) {
            body = ctx.React.createElement('div', {
              style: {
                background: '#0f172a',
                color: '#e2e8f0',
                borderRadius: useStandardShell ? 8 : 12,
                minHeight: useStandardShell ? 520 : 'calc(100vh - 32px)',
                overflow: 'hidden'
              },
              'data-sel-tool-shell': id
            }, rendered);
          }
          if (useStandardShell) return this._wrapStandardToolShell(id, tool, body, ctx);
          return body;
        }
      };
    }

    // ── SelToolDataManager ──
    // Bridge for individual sel_tool_*.js plugins that previously only
    // wrote to localStorage and ctx.toolData. localStorage is wiped between
    // Canvas sessions; ctx.toolData lives in React state and dies with the
    // hub unmount. Neither survives a project save→load round-trip on its
    // own. The manager mirrors per-tool state into window.__alloflowSelToolData
    // so the host's executeSaveFile can serialize it into the project JSON
    // (which DOES survive Canvas), and re-hydrates from that slot on
    // 'alloflow-sel-tooldata-restored' so tools refresh after a load.
    //
    // Existing tools keep working: ctx.update() / ctx.updateMulti() in
    // sel_hub_module.js already feed selToolData → window.__alloflowSelToolData
    // via the React.useEffect mirror below. The manager exposes a flatter API
    // for tools that want explicit get/set without going through ctx, and
    // optionally mirrors a per-tool localStorage key so legacy code paths
    // that read localStorage directly still see restored values.
    if (!window.SelToolDataManager) {
      window.SelToolDataManager = {
        // Get the full slice for a tool, or {} if missing. Reads from the
        // window slot (populated by hub state on every change), so this is
        // safe to call before the hub mounts.
        get: function (toolId) {
          try {
            var all = window.__alloflowSelToolData || {};
            return (all && all[toolId]) || {};
          } catch (e) { return {}; }
        },
        // Set one key for one tool. Writes to the window slot AND fires an
        // event the hub uses to sync its React state. Tools should still
        // prefer ctx.update() when they have a ctx in scope — this is the
        // fallback for tools that need to persist outside a render.
        set: function (toolId, key, val) {
          try {
            var all = window.__alloflowSelToolData || {};
            var slot = Object.assign({}, all[toolId] || {});
            slot[key] = val;
            var patch = {}; patch[toolId] = slot;
            window.__alloflowSelToolData = Object.assign({}, all, patch);
            window.dispatchEvent(new CustomEvent('alloflow-sel-tooldata-changed', { detail: { toolId: toolId, key: key } }));
          } catch (e) {}
        },
        // Same as set() but for a batch of keys.
        merge: function (toolId, obj) {
          try {
            var all = window.__alloflowSelToolData || {};
            var slot = Object.assign({}, all[toolId] || {}, obj || {});
            var patch = {}; patch[toolId] = slot;
            window.__alloflowSelToolData = Object.assign({}, all, patch);
            window.dispatchEvent(new CustomEvent('alloflow-sel-tooldata-changed', { detail: { toolId: toolId, key: '*' } }));
          } catch (e) {}
        },
        // Register a legacy localStorage key for a tool. The host's load
        // handler uses _lsKey on each tool slot to mirror restored values
        // back to localStorage, so tools that read localStorage on mount
        // (e.g. sel_tool_voicedetective.js STORAGE_KEY = 'alloSelVoiceDetective')
        // still see the restored state.
        bindLegacyKey: function (toolId, lsKey) {
          try {
            var all = window.__alloflowSelToolData || {};
            var slot = Object.assign({}, all[toolId] || {});
            slot._lsKey = lsKey;
            // On bind, snapshot the current localStorage value so the next
            // save picks it up even if the tool hasn't dirtied state yet.
            try { slot._lsValue = JSON.parse(localStorage.getItem(lsKey) || 'null'); } catch (e) {}
            var patch = {}; patch[toolId] = slot;
            window.__alloflowSelToolData = Object.assign({}, all, patch);
          } catch (e) {}
        }
      };
    }

    // ── Dev-only diagnostic ──
    // Gated behind window.DEBUG. Logs which SEL persistence keys are wired
    // into the host save pipeline (i.e. have a window.__alloflow* slot the
    // host's executeSaveFile reads) versus which only live in localStorage
    // and will be silently lost in Canvas. Call from console:
    //   window.DEBUG = true; alloflowSelSaveDiagnostic();
    if (typeof window.alloflowSelSaveDiagnostic !== 'function') {
      window.alloflowSelSaveDiagnostic = function () {
        if (!window.DEBUG) return;
        var checks = [
          { label: 'SEL engagement (streak + toolUsage)', winSlot: '__alloflowSelEngagement', lsKeys: ['alloflow_sel_streak', 'alloflow_sel_tool_usage'] },
          { label: 'SEL stations',                       winSlot: '__alloflowSelStations',   lsKeys: ['alloflow_sel_stations'] },
          { label: 'SEL quest progress',                 winSlot: '__alloflowSelProgress',   lsKeys: ['alloflow_sel_station_progress'] },
          { label: 'SEL per-tool data',                  winSlot: '__alloflowSelToolData',   lsKeys: [] }
        ];
        var rows = checks.map(function (c) {
          var hasWin  = typeof window[c.winSlot] !== 'undefined' && window[c.winSlot] !== null;
          var lsState = c.lsKeys.map(function (k) {
            var v = null; try { v = localStorage.getItem(k); } catch (e) {}
            return { key: k, present: v !== null && v !== '' };
          });
          return {
            slot: c.label,
            windowSlot: c.winSlot,
            inSavePayload: hasWin ? 'YES' : 'NO  (host save will skip)',
            localStorageKeys: lsState
          };
        });
        try { console.group('[alloflowSelSaveDiagnostic]'); } catch (e) {}
        try { console.table(rows.map(function (r) { return { slot: r.slot, inSave: r.inSavePayload, winSlot: r.windowSlot }; })); } catch (e) { console.log(rows); }
        rows.forEach(function (r) {
          try { console.log(r.slot + ' localStorage:', r.localStorageKeys); } catch (e) {}
        });
        try { console.groupEnd(); } catch (e) {}
        return rows;
      };
    }

    // ── WCAG 2.1 AA: Accessibility CSS ──
    if (!document.getElementById('sel-a11y-css')) {
      var selA11yStyle = document.createElement('style');
      selA11yStyle.id = 'sel-a11y-css';
      selA11yStyle.textContent = [
        '@media (prefers-reduced-motion: reduce) { .fixed.inset-0 *, .fixed.inset-0 *::before, .fixed.inset-0 *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
        '.fixed.inset-0 button:focus-visible, .fixed.inset-0 input:focus-visible, .fixed.inset-0 textarea:focus-visible, .fixed.inset-0 select:focus-visible, .fixed.inset-0 [tabindex]:focus-visible { outline: 2px solid #8b5cf6 !important; outline-offset: 2px !important; border-radius: 4px; }',
      ].join('\n');
      document.head.appendChild(selA11yStyle);
    }

    // ── CASEL 5 Competency Categories ──
    // Tools are organized into categories that draw on CASEL but expand
    // beyond it. CASEL's "Self-Management" has been split into more
    // pedagogically precise framings (Self-Regulation for arousal/emotion
    // work; Self-Direction for agency/goal work), and three additional
    // categories have been added (Inner Work, Care of Self, Stewardship)
    // to make room for contemplative, relational, and community-oriented
    // tools without forcing them into the individualist-managerial frame.
    var SEL_CATEGORIES = [
      { id: 'self-awareness',             label: 'Self-Awareness',             icon: '\uD83E\uDDE0', desc: 'Recognizing emotions, strengths, and areas for growth' },
      { id: 'self-regulation',            label: 'Self-Regulation',            icon: '\uD83C\uDFAF', desc: 'Regulating emotions, arousal, attention; coping practice' },
      { id: 'self-direction',             label: 'Self-Direction',             icon: '\uD83E\uDDED', desc: 'Goal-setting, agency, executive function, growth mindset' },
      { id: 'inner-work',                 label: 'Inner Work',                 icon: '\uD83E\uDDD8', desc: 'Contemplative and reflective practices' },
      { id: 'care-of-self',               label: 'Care of Self',               icon: '\uD83E\uDD7A', desc: 'Self-compassion, relational self-care' },
      { id: 'social-awareness',           label: 'Social Awareness',           icon: '\uD83E\uDD1D', desc: 'Empathy, perspective-taking, and appreciating diversity' },
      { id: 'relationship-skills',        label: 'Relationship Skills',        icon: '\uD83D\uDCAC', desc: 'Communication, teamwork, and conflict resolution' },
      { id: 'responsible-decision-making', label: 'Responsible Decision-Making', icon: '\u2696\uFE0F', desc: 'Ethical choices, evaluating consequences, and problem-solving' },
      { id: 'stewardship',                label: 'Stewardship',                icon: '\uD83C\uDF31', desc: 'Caring for community, justice, land, and the future' }
    ];

    // ── SEL Pathways (Curated Learning Sequences — equivalent to STEM Lab Stations) ──
    // Teachers can use these presets or create custom ones.
    // Each pathway filters the tool grid to show only relevant tools.
    var SEL_PATHWAYS = [
      { id: 'morning_check', name: 'Morning Check-In', icon: '\uD83C\uDF05', desc: 'Start the day with a mood check, breathing, and goal setting', tools: ['zones', 'mindfulness', 'goals', 'journal'], casel: 'self-awareness' },
      { id: 'calm_down', name: 'Calm Down Corner', icon: '\uD83E\uDDD8', desc: 'Regulation strategies for when emotions run high', tools: ['zones', 'coping', 'mindfulness'], casel: 'self-management' },
      { id: 'conflict_unit', name: 'Conflict Resolution Unit', icon: '\u2696\uFE0F', desc: 'Practice resolving disagreements and building repair skills', tools: ['conflict', 'conflicttheater', 'perspective', 'social', 'restorativeCircle'], casel: 'relationship-skills' },
      { id: 'empathy_week', name: 'Empathy & Perspective Week', icon: '\uD83D\uDC53', desc: 'Build empathy through perspective-taking and cultural awareness', tools: ['perspective', 'emotions', 'community', 'cultureExplorer'], casel: 'social-awareness' },
      { id: 'decision_making', name: 'Decision-Making Deep Dive', icon: '\uD83E\uDD14', desc: 'Practice ethical reasoning and responsible choices', tools: ['decisions', 'ethicalReasoning', 'safety'], casel: 'responsible-decision-making' },
      { id: 'self_discovery', name: 'Self-Discovery Journey', icon: '\u2728', desc: 'Explore who you are — strengths, emotions, and growth mindset', tools: ['strengths', 'emotions', 'growthmindset', 'compassion', 'advocacy'], casel: 'self-awareness' },
      { id: 'friendship', name: 'Friendship & Social Skills', icon: '\uD83E\uDD1D', desc: 'Build healthy friendships and communication skills', tools: ['social', 'friendship', 'teamwork', 'peersupport'], casel: 'relationship-skills' },
      { id: 'transitions', name: 'Navigating Change', icon: '\uD83C\uDF31', desc: 'Support students through life transitions and new experiences', tools: ['transitions', 'coping', 'journal', 'goals'], casel: 'self-management' },
    ];

    var SEL_TEACHER_TOOL_META = {
      zones: { time: '5-8 min', format: 'Solo or group', cue: 'Useful first check-in before any sharing.' },
      emotions: { time: '5-8 min', format: 'Solo or pair', cue: 'Good vocabulary warm-up.' },
      coping: { time: '3-10 min', format: 'Solo or group', cue: 'Best for a regulation reset.' },
      mindfulness: { time: '2-10 min', format: 'Whole class', cue: 'Low-writing regulation option.' },
      journal: { time: '5-12 min', format: 'Solo', cue: 'Private reflection. Sharing should be optional.' },
      goals: { time: '5-10 min', format: 'Solo or advisory', cue: 'Good closing step after reflection.' },
      conflict: { time: '8-12 min', format: 'Pair or small group', cue: 'Preview norms before role-play.' },
      restorativeCircle: { time: '15-30 min', format: 'Circle', cue: 'Use with established circle norms.' },
      peersupport: { time: '8-15 min', format: 'Pair practice', cue: 'Strong for listening-skills rehearsal.' },
      perspective: { time: '6-12 min', format: 'Pair or group', cue: 'Good empathy bridge before discussion.' },
      digitalWellbeing: { time: '8-15 min', format: 'Solo or advisory', cue: 'Useful before phone or AI norms.' },
      sleep: { time: '5-10 min', format: 'Solo', cue: 'Good for health advisory units.' },
      safety: { time: '8-15 min', format: 'Solo', cue: 'Preview first; avoid forced disclosure.', sensitive: true },
      crisiscompanion: { time: '3-10 min', format: 'Solo', cue: 'For urgent support skills, not a class assignment.', sensitive: true },
      griefLoss: { time: '10-20 min', format: 'Solo', cue: 'Preview first; use opt-out alternatives.', sensitive: true },
      identitySupport: { time: '8-15 min', format: 'Solo', cue: 'Use with privacy and opt-out care.', sensitive: true }
    };

    var SEL_TEACHER_LAUNCH_PLANS = [
      {
        id: 'advisory_checkin',
        name: 'Morning advisory check-in',
        icon: '\uD83C\uDF05',
        time: '10-15 min',
        format: 'Whole class',
        focus: 'Mood, breath, one next step',
        studentView: 'Students privately check their zone, try a regulation option, then choose one need for the day or pass.',
        teacherMove: 'Model the pass option first. Invite one-word or color sharing only after private practice.',
        privacyBoundary: 'No journal text is collected; students decide later whether any checkpoint enters a Share Packet.',
        tools: ['zones', 'mindfulness', 'goals', 'journal'],
        note: 'Begin with a private zone check, then offer breathing or goal-setting. Students may share one word, a color, or pass.',
        quests: [
          { type: 'manualComplete', toolRef: 'first', label: 'Complete a private check-in', params: {} },
          { type: 'freeResponse', toolId: null, label: 'Name one thing you need today', params: { prompt: 'What is one thing that would help you have a steadier day?', minLength: 30 } }
        ]
      },
      {
        id: 'calm_reset',
        name: 'Five-minute calm reset',
        icon: '\uD83E\uDDD8',
        time: '5-8 min',
        format: 'Whole class or calm corner',
        focus: 'Body regulation',
        studentView: 'Students notice their current body state and choose one calm-body practice.',
        teacherMove: 'Keep the routine low-talk and time-boxed. Offer movement, breathing, or quiet alternatives.',
        privacyBoundary: 'Students can save a checkpoint for themselves; no one has to explain why they needed a reset.',
        tools: ['zones', 'coping', 'mindfulness'],
        note: 'Keep this low-talk. Students choose one regulation practice and notice what changed.',
        quests: [
          { type: 'manualComplete', toolRef: 'first', label: 'Check your current zone', params: {} },
          { type: 'manualComplete', toolRef: 'last', label: 'Try one calm-body practice', params: {} }
        ]
      },
      {
        id: 'repair_routine',
        name: 'Post-conflict repair routine',
        icon: '\u2696\uFE0F',
        time: '15-25 min',
        format: 'Small group or advisory',
        focus: 'Perspective, repair, next action',
        studentView: 'Students can use a real, hypothetical, or teacher-provided scenario to practice repair language.',
        teacherMove: 'Set repair norms first and avoid public confession. Pause if the situation needs adult mediation.',
        privacyBoundary: 'Students choose what to share; private conflict reflections should not become class evidence.',
        tools: ['conflict', 'perspective', 'restorativeCircle', 'peersupport'],
        note: 'Use after norms are set. Keep focus on repair language, not public confession.',
        quests: [
          { type: 'manualComplete', toolRef: 'first', label: 'Map the conflict or perspective', params: {} },
          { type: 'freeResponse', toolId: null, label: 'Draft a repair statement', params: { prompt: 'Write a repair statement using an "I" statement, one impact you understand, and one next action.', minLength: 70 } }
        ]
      },
      {
        id: 'digital_reset',
        name: 'Digital wellbeing mini-lesson',
        icon: '\uD83D\uDCF1',
        time: '12-20 min',
        format: 'Advisory or health',
        focus: 'Phone, sleep, AI and boundaries',
        studentView: 'Students review habits, choose one boundary to test, and keep the reason private if they want.',
        teacherMove: 'Frame as habit design, not a phone audit. Avoid asking students to disclose screenshots or usage data.',
        privacyBoundary: 'Students can share a boundary goal, but personal sleep, phone, or AI details stay optional.',
        tools: ['digitalWellbeing', 'sleep', 'mindfulness'],
        note: 'Frame as habit design, not a phone audit. Students choose one boundary to try.',
        quests: [
          { type: 'manualComplete', toolRef: 'first', label: 'Choose one digital habit to adjust', params: {} },
          { type: 'freeResponse', toolId: null, label: 'Name one boundary to test', params: { prompt: 'What is one phone, sleep, or AI boundary you want to test this week?', minLength: 40 } }
        ]
      }
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

    // ── For-Educators content (inlined from FOR_EDUCATORS.md) ──
    // Inlined because Gemini Canvas blocks window.fetch() to relative paths;
    // the file at sel_hub/FOR_EDUCATORS.md is the canonical source and this
    // const must be kept in sync when that file is edited. See CHANGE 3.
    var FOR_EDUCATORS_MD = [
      '# For Educators: Using the SEL Hub Responsibly',
      '',
      'A practical guide to what this tool is, how student data flows through it, and what you need to set up before you hand it to a class.',
      '',
      '---',
      '',
      '## 1. What this Hub is — and what it isn\'t',
      '',
      '**What it is:**',
      '- A **formative practice space** for social-emotional skills: noticing emotions, naming them, practicing regulation strategies, reflecting on choices.',
      '- A **conversation starter** between you and a student, or between a student and a caregiver.',
      '- A **low-stakes sandbox** where students can rehearse before situations get hard.',
      '',
      '**What it is not:**',
      '- Not a validated **assessment instrument**. The activities aren\'t normed, scored against a reference population, or psychometrically reliable.',
      '- Not a **clinical screener** for depression, anxiety, ADHD, trauma, suicidality, or anything else. Nothing a student does here should appear in a referral, an IEP present-levels statement, or a tiered-intervention decision as evidence.',
      '- Not a **counseling substitute**. If a student needs a counselor, they need a counselor.',
      '- Not a **behavior surveillance tool**. There is no teacher dashboard tracking who clicked what.',
      '',
      'If a colleague treats Hub activity as data for a high-stakes decision, gently push back. The tool isn\'t built for that, and pretending it is harms students.',
      '',
      '---',
      '',
      '## 2. How student data works',
      '',
      'The Hub is designed for the **Canvas runtime** — meaning the app lives inside a chat-style canvas while the student is using it, and **vanishes when the canvas closes**. Read that sentence twice. It is the most important fact on this page.',
      '',
      '**Ephemeral by default:**',
      '- While a student is using the Hub, their answers, reflections, and progress live in the browser tab\'s memory.',
      '- When they close the tab, refresh, or end the session, **everything is gone**. There is no server-side database storing student work. There is no account, no login, no profile tied to a real identity.',
      '- You, as the educator, **cannot retrieve** a student\'s session after the fact. Neither can IT. Neither can the vendor. It doesn\'t exist anywhere to retrieve.',
      '',
      '**The sneakernet save/load pattern:**',
      '- If a student wants to keep their work, they click **Export** (or **Save Progress**). The Hub generates a **JSON file** and downloads it to the student\'s own device.',
      '- That file lives in their Downloads folder — or wherever they save it — on their personal or school-issued device. It does not get uploaded anywhere.',
      '- To resume later, the student opens the Hub fresh and clicks **Import**, then selects the JSON file from their device. The Hub reads it back into memory and they pick up where they left off.',
      '- This is called "sneakernet" because the data moves only when a human physically carries it (on a USB stick, a Drive folder they choose, an email attachment, etc.). The Hub itself never transports it.',
      '',
      '**What gets saved into the JSON:**',
      '- Reflections the student typed.',
      '- Activity progress and choices.',
      '- Any tags or check-ins the student created during the session.',
      '',
      '**What is NOT saved:**',
      '- The student\'s name (unless they typed it themselves into a reflection).',
      '- Their device ID, IP, location, or any browser fingerprint.',
      '- Time-on-task analytics or behavioral telemetry.',
      '',
      '**Practical implication for you:**',
      '- If a student says "I lost my work," and they didn\'t Export, it\'s genuinely gone. Frame this expectation upfront.',
      '- If a student emails you their JSON, treat it like any other student-generated document under your district\'s records policies. You are now the custodian of that file.',
      '',
      '---',
      '',
      '## 3. AI features and student safety',
      '',
      'Some Hub activities can use a generative AI helper for things like rephrasing a reflection, suggesting coping strategies, or generating a practice scenario. This piece needs careful setup.',
      '',
      '**The runtime context:**',
      '- The Hub is built to run inside a Google Workspace EDU environment with Gemini Canvas. That means AI calls inherit your domain\'s Workspace data-handling terms — student prompts are **not** used to train consumer models, and the data stays inside the EDU tenant\'s contract boundary.',
      '',
      '**The 18+ default — and the nuance:**',
      '- Google\'s default policy restricts Gemini for users under 18.',
      '- **However**, Workspace EDU admins can enable Gemini for under-18 users in their domain, typically with documented parent consent. If your IT department has done this, AI features work for your students. If they haven\'t, students under 18 will see AI features disabled or get an access error.',
      '- **You cannot bypass this from inside the Hub.** It\'s an admin-level setting on the Workspace tenant, not a Hub toggle.',
      '',
      '**What gets sent to the AI model when a student uses an AI feature:**',
      '- The specific prompt the activity generates (e.g., "rephrase this reflection in a calmer tone: [student text]").',
      '- The student\'s free-text input for that prompt.',
      '',
      '**What is NOT sent:**',
      '- The student\'s name or identity (the Hub doesn\'t know it).',
      '- Previous session history.',
      '- Other students\' work.',
      '- Anything from outside the current activity.',
      '',
      '**Practical guidance:**',
      '- Tell students explicitly: "When you use the AI helper, it sees what you type into that box. Don\'t put your full name, address, phone number, or anyone else\'s private information in there."',
      '- Model this yourself in the first session.',
      '',
      '---',
      '',
      '## 4. Crisis-flag handling',
      '',
      'The Hub has a **safety layer** that watches for language suggesting a student may be in crisis — self-harm, suicidal ideation, abuse disclosures, severe distress.',
      '',
      '**What the student sees when the safety layer fires:**',
      '- The current activity pauses.',
      '- A modal appears with **988** (Suicide & Crisis Lifeline, call or text) and **741741** (Crisis Text Line, text HOME).',
      '- A short message encourages them to talk to a trusted adult and lists generic supports.',
      '- The student can dismiss the modal and return to the activity, or close the Hub entirely.',
      '',
      '**What you, the teacher, can and cannot do:**',
      '- You **cannot** retrieve a transcript of what triggered the modal. Nothing is logged. Nothing is sent to you, to administrators, or to the vendor.',
      '- You **cannot** get a list of which students saw the modal.',
      '- This is by design — students need to be able to express distress in a practice space without a paper trail following them.',
      '',
      '**What you should do:**',
      '- If a student tells you the modal appeared, treat that as a disclosure and follow your building\'s standard crisis-response protocol — typically: stay with the student, contact the counselor or designated mental health staff, do not leave them alone, document per your district\'s reporting requirements.',
      '- Do **not** rely on the Hub to surface at-risk students for you. It won\'t. Your eyes, your relationship with the student, and your colleagues\' observations are still the actual safety net.',
      '- Before launching the Hub with a class, confirm you know who to call when a student is in crisis and how fast they can respond.',
      '',
      '---',
      '',
      '## 5. Parent notification',
      '',
      'Even though the Hub keeps no student data on a server (no account, no database), parents deserve to know their child is using it. Norms vary by district — here is a starting template.',
      '',
      '**Sample parent letter (copy and adapt):**',
      '',
      '> Dear families,',
      '>',
      '> This year, our class will occasionally use an online tool called the SEL Hub. It offers short activities to help students notice their feelings, practice coping strategies, and reflect on social situations.',
      '>',
      '> A few things to know:',
      '>',
      '> - **It is not a test or assessment.** Nothing students do in the Hub is graded or recorded in their school file.',
      '> - **No accounts, nothing sent to a server.** The Hub does not create a login for your child, and their work is not stored on any server. When they close the activity, their work disappears — unless they save a file to their own device. A saved file can include details they entered (for example, a name, family relationships from a mapping activity, or a short voice recording), so please treat any saved file as a confidential record.',
      '> - **Optional AI helper.** Some activities offer an AI helper to suggest words or coping ideas. This runs inside our school\'s Google Workspace for Education environment, which means student input is not used to train outside AI models. [If your district has not enabled Gemini for under-18 users, delete this paragraph or note that AI features are turned off.]',
      '> - **Safety support built in.** If a student writes about being in crisis, the activity pauses and shows the 988 Suicide & Crisis Lifeline (call or text 988) and Crisis Text Line (text HOME to 741741), along with a reminder to talk to a trusted adult.',
      '>',
      '> If you\'d prefer your child opt out of Hub activities, or if you have questions, please reach out. I\'m happy to walk you through what students will see.',
      '',
      '**Add to your AUP / class syllabus:**',
      '- A line naming the SEL Hub as a tool used in class.',
      '- A statement that it is formative, not assessed, not a screener.',
      '- A pointer to the parent contact for opt-out.',
      '',
      '**Suggested timing:**',
      '- Send the notice **before** the first session, not after.',
      '- Re-send or link it at the start of any term where you reintroduce the tool.',
      '- Keep the opt-out easy and ungated — no form fees, no required meeting.',
      '',
      '---',
      '',
      '## 6. Verification checklist',
      '',
      'Before you use the Hub with students, walk through this list:',
      '',
      '- [ ] **AUP check.** Confirm your district\'s Acceptable Use Policy permits classroom use of third-party SEL tools, and that this tool is covered (either by name or by category).',
      '- [ ] **IT confirmation on Gemini.** Ask your IT or Workspace admin whether Gemini is enabled for under-18 users in your Organizational Unit. If yes, AI features will work; if no, plan to use the Hub without AI features (most activities still function).',
      '- [ ] **Parent notice sent.** Either the letter above (adapted) or your district\'s standard family-communication channel — sent before students start.',
      '- [ ] **Opt-out path clear.** You know how a parent can decline, and you have a non-tech alternative activity ready.',
      '- [ ] **Crisis-response protocol ready.** You know who to contact, how fast they respond, and where the student should be while you wait.',
      '- [ ] **Student orientation done.** Students know (a) their work disappears unless they Export, (b) the AI helper sees what they type, and (c) the 988/741741 modal exists and how to use it.',
      '- [ ] **Your own boundaries set.** You\'ve decided what you will and won\'t ask students to share in reflections, and what you\'ll do with any JSONs they send you.',
      '',
      '---',
      '',
      '## 7. Limitations to be honest about',
      '',
      'The Hub is genuinely useful for what it\'s designed for. It is also genuinely limited. Tell students and colleagues the truth:',
      '',
      '- **It does not replace counseling.** A student working through grief, trauma, or chronic anxiety needs a trained mental-health professional, not a web activity.',
      '- **It does not screen for anything.** It cannot tell you which students are depressed, suicidal, anxious, neurodivergent, abused, or anything else. Activities that look diagnostic are practice scaffolds, not instruments.',
      '- **It does not produce IEP-quality data.** Nothing from a Hub session belongs in present-levels, goal-progress monitoring, or evaluation reports. If you need progress data, use validated tools.',
      '- **It cannot verify a student\'s emotional state.** A student can click "I feel great" while feeling terrible, or vice versa. Treat self-report as one data point among many — and a weak one.',
      '- **It is not a substitute for relationships.** The reason SEL works in schools is that adults notice, name, and respond to what kids are going through. The Hub can rehearse vocabulary. It cannot care about your students. You can.',
      '',
      'If you keep that frame, the Hub is a useful piece of a thoughtful SEL practice. If you let it drift into "assessment," "screener," or "early-warning system," it will quietly cause harm. Use it like a journal prompt or a role-play card — supportive, formative, low-stakes — and it will earn its place in your room.'
    ].join('\n');

    // ── Minimal markdown-to-HTML-element converter ──
    // Handles: headers (#, ##, ###), bold (**...**), italics (*...*),
    // unordered lists (- ...), blockquotes (> ...), horizontal rules (---),
    // checklist items (- [ ]), and paragraph wrapping. Renders as React
    // elements (no dangerouslySetInnerHTML — XSS-safe by construction).
    function _selRenderMarkdown(React, md) {
      var h = React.createElement;
      var lines = String(md || '').split('\n');
      var blocks = [];
      var i = 0;
      function renderInline(text) {
        // Split on **bold** then *italic*; return an array of strings + elements.
        var parts = [text];
        // Bold
        var nextParts = [];
        parts.forEach(function(part) {
          if (typeof part !== 'string') { nextParts.push(part); return; }
          var pieces = part.split(/(\*\*[^*]+\*\*)/g);
          pieces.forEach(function(p) {
            if (/^\*\*[^*]+\*\*$/.test(p)) {
              nextParts.push(h('strong', { key: 'b' + nextParts.length }, p.slice(2, -2)));
            } else if (p) {
              nextParts.push(p);
            }
          });
        });
        parts = nextParts;
        // Italics (single *)
        nextParts = [];
        parts.forEach(function(part) {
          if (typeof part !== 'string') { nextParts.push(part); return; }
          var pieces = part.split(/(\*[^*]+\*)/g);
          pieces.forEach(function(p) {
            if (/^\*[^*]+\*$/.test(p)) {
              nextParts.push(h('em', { key: 'i' + nextParts.length }, p.slice(1, -1)));
            } else if (p) {
              nextParts.push(p);
            }
          });
        });
        return nextParts;
      }
      while (i < lines.length) {
        var line = lines[i];
        // Horizontal rule
        if (/^---+\s*$/.test(line)) {
          blocks.push(h('hr', { key: 'b' + blocks.length, style: { border: 'none', borderTop: '1px solid #cbd5e1', margin: '16px 0' } }));
          i++; continue;
        }
        // Headers
        var hMatch = /^(#{1,6})\s+(.+)$/.exec(line);
        if (hMatch) {
          var level = hMatch[1].length;
          var sizes = [0, 22, 18, 16, 15, 14, 13];
          var weights = [0, 800, 800, 700, 700, 700, 700];
          var marginTops = [0, 20, 18, 14, 12, 10, 8];
          blocks.push(h('h' + Math.min(level, 6), {
            key: 'b' + blocks.length,
            style: { fontSize: sizes[level], fontWeight: weights[level], marginTop: marginTops[level], marginBottom: 8 }
          }, renderInline(hMatch[2])));
          i++; continue;
        }
        // Blockquote (consume consecutive > lines)
        if (/^>\s?/.test(line)) {
          var quoteLines = [];
          while (i < lines.length && /^>\s?/.test(lines[i])) {
            quoteLines.push(lines[i].replace(/^>\s?/, ''));
            i++;
          }
          blocks.push(h('blockquote', {
            key: 'b' + blocks.length,
            style: { borderLeft: '3px solid #94a3b8', paddingLeft: 12, margin: '12px 0', color: '#475569', fontStyle: 'italic' }
          }, quoteLines.map(function(ql, qi) {
            if (!ql.trim()) return h('br', { key: 'qbr' + qi });
            return h('div', { key: 'qln' + qi, style: { marginBottom: 4 } }, renderInline(ql));
          })));
          continue;
        }
        // Unordered list (consume consecutive - lines)
        if (/^-\s+/.test(line)) {
          var listItems = [];
          while (i < lines.length && /^-\s+/.test(lines[i])) {
            var raw = lines[i].replace(/^-\s+/, '');
            // Checklist item: "[ ] text" or "[x] text"
            var checkMatch = /^\[([ xX])\]\s+(.*)$/.exec(raw);
            if (checkMatch) {
              var checked = checkMatch[1].toLowerCase() === 'x';
              listItems.push(h('li', {
                key: 'li' + listItems.length,
                style: { listStyle: 'none', marginBottom: 4 }
              }, h('span', { 'aria-hidden': 'true', style: { marginRight: 6 } }, checked ? '☑' : '☐'), renderInline(checkMatch[2])));
            } else {
              listItems.push(h('li', {
                key: 'li' + listItems.length,
                style: { marginBottom: 4 }
              }, renderInline(raw)));
            }
            i++;
          }
          blocks.push(h('ul', {
            key: 'b' + blocks.length,
            style: { paddingLeft: 22, margin: '8px 0' }
          }, listItems));
          continue;
        }
        // Blank line
        if (!line.trim()) {
          i++; continue;
        }
        // Paragraph (consume consecutive non-blank, non-special lines)
        var paraLines = [];
        while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>\s?|-\s+|---+\s*$)/.test(lines[i])) {
          paraLines.push(lines[i]);
          i++;
        }
        if (paraLines.length > 0) {
          blocks.push(h('p', {
            key: 'b' + blocks.length,
            style: { margin: '8px 0', lineHeight: 1.55 }
          }, renderInline(paraLines.join(' '))));
        }
      }
      return blocks;
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
      var selectedVoice   = props.selectedVoice || null;
      // Drives renderSafetyDisclosure: tells AI-coach intros whether the
      // conversation is truly private (solo) or visible to a hosting
      // teacher (live session). No surveillance happens in solo mode.
      var activeSessionCode = props.activeSessionCode || null;
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
      var _selSnapshots = React.useState(function () {
        try {
          if (typeof window !== 'undefined' && Array.isArray(window.__alloflowSelSnapshots)) {
            return window.__alloflowSelSnapshots;
          }
        } catch (e) {}
        try {
          var raw = JSON.parse(localStorage.getItem('alloflow_sel_snapshots') || '[]');
          return Array.isArray(raw) ? raw : [];
        } catch (e) { return []; }
      });
      var selSnapshots  = _selSnapshots[0];
      var setSelSnapshots = _selSnapshots[1];

      function _readStudentArtifacts() {
        try {
          if (typeof window !== 'undefined' && Array.isArray(window.__alloflowStudentArtifacts)) {
            return window.__alloflowStudentArtifacts;
          }
        } catch (e) {}
        try {
          var rawArtifacts = JSON.parse(localStorage.getItem('alloflow_student_artifacts') || '[]');
          return Array.isArray(rawArtifacts) ? rawArtifacts : [];
        } catch (e) { return []; }
      }
      var _studentArtifacts = React.useState(_readStudentArtifacts);
      var studentArtifacts = _studentArtifacts[0];
      var setStudentArtifacts = _studentArtifacts[1];

      // XP system
      var _selXp = React.useState(0);
      var selXp  = _selXp[0];
      var setSelXp = _selXp[1];

      // Plugin-load progress tick — bumped by the allo-plugins-changed event the
      // lazy-loader fires after each sel_tool_*.js script finishes registering.
      // Forces the tile grid to re-render as plugins stream in on first hub-open.
      var _pluginProgress = React.useState(0);
      var _setPluginProgressTick = _pluginProgress[1];
      React.useEffect(function() {
        var handler = function(e) {
          if (e && e.detail && e.detail.label !== 'Sel') return;
          // Defer out of any in-progress React render (dispatchEvent runs
          // listeners synchronously): a direct setState here during a host
          // render trips "Cannot update a component while rendering". The tick
          // only refreshes the tile grid as plugins stream in — a microtask
          // defer is imperceptible and render-safe. Mirrors the StemLab fix.
          Promise.resolve().then(function() { _setPluginProgressTick(function(t) { return t + 1; }); });
        };
        window.addEventListener('allo-plugins-changed', handler);
        return function() { window.removeEventListener('allo-plugins-changed', handler); };
      }, []);

      var _viewportWidthState = React.useState(function() {
        try { return window.innerWidth || 1024; } catch (e) { return 1024; }
      });
      var viewportWidth = _viewportWidthState[0];
      var setViewportWidth = _viewportWidthState[1];
      React.useEffect(function() {
        function onResize() {
          try { setViewportWidth(window.innerWidth || 1024); } catch (e) {}
        }
        window.addEventListener('resize', onResize);
        return function() { window.removeEventListener('resize', onResize); };
      }, []);
      var isCompact = viewportWidth < 720;
      var isMidWidth = viewportWidth < 980;

      // ── CHANGE 1: Ephemerality explainer state ──
      // Surfaces a first-run modal explaining that work is lost without Export.
      // Re-shows after 20 min of active use with no export. SessionStorage
      // tracks whether the user has dismissed it this session; an activity
      // timestamp ref + 60-sec interval handles the re-prompt.
      var _showEphemeralExplainer = React.useState(false);
      var showEphemeralExplainer = _showEphemeralExplainer[0];
      var setShowEphemeralExplainer = _showEphemeralExplainer[1];
      var _lastActivityRef = React.useRef(Date.now());
      var _lastExportRef = React.useRef(0);

      // ── CHANGE 2: Unsaved-changes indicator state ──
      // True when any tool/snapshot/xp/usage state has changed since the last
      // export. Cleared on alloflow-sel-exported event. Suppressed for the
      // first render so a fresh hub-open doesn't immediately flag dirty.
      var _isDirty = React.useState(false);
      var isDirty = _isDirty[0];
      var setIsDirty = _isDirty[1];
      var _showDirtyTooltip = React.useState(false);
      var showDirtyTooltip = _showDirtyTooltip[0];
      var setShowDirtyTooltip = _showDirtyTooltip[1];
      var _firstRenderRef = React.useRef(true);

      // ── CHANGE 3: For-Educators modal state ──
      var _showForEducators = React.useState(false);
      var showForEducators = _showForEducators[0];
      var setShowForEducators = _showForEducators[1];
      var _showClearSelConfirm = React.useState(false);
      var showClearSelConfirm = _showClearSelConfirm[0];
      var setShowClearSelConfirm = _showClearSelConfirm[1];
      function closeClearSelConfirm() {
        setShowClearSelConfirm(false);
        setTimeout(function() {
          var clearButton = document.getElementById('sel-clear-all-data-button');
          if (clearButton && clearButton.focus) clearButton.focus();
        }, 0);
      }
      var _showSharePacket = React.useState(false);
      var showSharePacket = _showSharePacket[0];
      var setShowSharePacket = _showSharePacket[1];
      var _packetSelections = React.useState({});
      var packetSelections = _packetSelections[0];
      var setPacketSelections = _packetSelections[1];
      var _packetSavedNotice = React.useState('');
      var packetSavedNotice = _packetSavedNotice[0];
      var setPacketSavedNotice = _packetSavedNotice[1];
      var _activeSharePacketArtifactId = React.useState(null);
      var activeSharePacketArtifactId = _activeSharePacketArtifactId[0];
      var setActiveSharePacketArtifactId = _activeSharePacketArtifactId[1];

      // Listen for export events fired by either the parent app or our own
      // Export-now CTA. Clears dirty + resets the 20-min idle-export timer.
      React.useEffect(function() {
        function onExported() {
          setIsDirty(false);
          _lastExportRef.current = Date.now();
          try { sessionStorage.setItem('alloflow_sel_last_export_at', String(Date.now())); } catch (e) {}
        }
        window.addEventListener('alloflow-sel-exported', onExported);
        // Also treat the host's project-save event as an export.
        window.addEventListener('alloflow-project-saved', onExported);
        return function() {
          window.removeEventListener('alloflow-sel-exported', onExported);
          window.removeEventListener('alloflow-project-saved', onExported);
        };
      }, []);

      // First-run ephemeral explainer: show on hub open if never seen.
      React.useEffect(function() {
        if (!showSelHub) return;
        var seen = false;
        try { seen = sessionStorage.getItem('alloflow_sel_seen_ephemeral_explainer') === '1'; } catch (e) {}
        if (!seen) setShowEphemeralExplainer(true);
      }, [showSelHub]);

      // Track user activity (pointer / key / touch) so the 20-min idle
      // check measures *active* use, not wall-clock time.
      React.useEffect(function() {
        if (!showSelHub) return;
        function bump() { _lastActivityRef.current = Date.now(); }
        window.addEventListener('pointerdown', bump, { passive: true });
        window.addEventListener('keydown', bump, { passive: true });
        window.addEventListener('touchstart', bump, { passive: true });
        return function() {
          window.removeEventListener('pointerdown', bump);
          window.removeEventListener('keydown', bump);
          window.removeEventListener('touchstart', bump);
        };
      }, [showSelHub]);

      // 60-sec interval: if 20+ min of active use has elapsed with no export
      // and the explainer isn't already open, re-surface it.
      React.useEffect(function() {
        if (!showSelHub) return;
        var TWENTY_MIN = 20 * 60 * 1000;
        var interval = setInterval(function() {
          if (showEphemeralExplainer) return;
          var now = Date.now();
          var sinceActivity = now - _lastActivityRef.current;
          var sinceExport = now - (_lastExportRef.current || 0);
          // Active in the last 60 sec AND no export in 20 min
          if (sinceActivity < 60000 && sinceExport > TWENTY_MIN) {
            setShowEphemeralExplainer(true);
          }
        }, 60000);
        return function() { clearInterval(interval); };
      }, [showSelHub, showEphemeralExplainer]);

      // Tab-trap + ESC for the ephemeral explainer, For-Educators modal, and share packet builder.
      React.useEffect(function() {
        if (!showEphemeralExplainer && !showForEducators && !showClearSelConfirm && !showSharePacket) return;
        function onKey(e) {
          if (e.key === 'Escape') {
            if (showClearSelConfirm) { closeClearSelConfirm(); }
            else if (showSharePacket) { setShowSharePacket(false); alloRestoreOrFocusSelHubStart(); }
            else if (showForEducators) { setShowForEducators(false); alloRestoreOrFocusSelHubStart(); }
            else if (showEphemeralExplainer) {
              setShowEphemeralExplainer(false);
              try { sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1'); } catch (err) {}
              alloRestoreOrFocusSelHubStart();
            }
            return;
          }
          if (e.key === 'Tab') {
            var modalId = showClearSelConfirm ? 'sel-clear-data-confirm-modal' : (showSharePacket ? 'sel-share-packet-modal' : (showForEducators ? 'sel-for-educators-modal' : 'sel-ephemeral-explainer-modal'));
            var modal = document.getElementById(modalId);
            if (!modal) return;
            var focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return;
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        }
        document.addEventListener('keydown', onKey);
        // Focus the primary action on open.
        setTimeout(function() {
          var modalId = showClearSelConfirm ? 'sel-clear-data-confirm-modal' : (showSharePacket ? 'sel-share-packet-modal' : (showForEducators ? 'sel-for-educators-modal' : 'sel-ephemeral-explainer-modal'));
          var modal = document.getElementById(modalId);
          if (modal) {
            var primary = modal.querySelector('[data-primary-action]') || modal.querySelector('button');
            if (primary) { try { primary.focus(); } catch (e2) {} }
          }
        }, 50);
        return function() { document.removeEventListener('keydown', onKey); };
      }, [showEphemeralExplainer, showForEducators, showClearSelConfirm, showSharePacket]);

      function awardSelXP(amount) {
        var pts = amount || 5;
        setSelXp(function(prev) { return prev + pts; });
        if (typeof addToast === 'function') addToast('+' + pts + ' SEL XP!', 'success');
      }

      function getSelXP() { return selXp; }

      // ── SEL Stations (custom teacher-authored bundles, parallel to STEM Lab Stations) ──
      // Pulls from props.activeStation when parent passes one (e.g. clicked from sidebar).
      // Otherwise reads/writes localStorage 'alloflow_sel_stations'.
      var SEL_QUEST_TYPES = [
        { id: 'xpThreshold',    label: 'Earn SEL XP',     icon: '⭐', paramLabel: 'XP Target', defaultVal: 30, unit: 'XP' },
        { id: 'timeSpent',      label: 'Spend Time',      icon: '⏱', paramLabel: 'Minutes',   defaultVal: 5,  unit: 'min' },
        { id: 'freeResponse',   label: 'Reflection',      icon: '✍️', paramLabel: 'Min Characters', defaultVal: 30, unit: 'chars' },
        { id: 'manualComplete', label: 'Mark Complete',   icon: '✅', paramLabel: '',          defaultVal: '', unit: '' }
      ];

      var _savedStations = React.useState(function () {
        try { return JSON.parse(localStorage.getItem('alloflow_sel_stations') || '[]'); } catch (e) { return []; }
      });
      var savedStations = _savedStations[0]; var setSavedStations = _savedStations[1];

      // ── Engagement state: daily streak + per-tool usage counts ──
      // Persistence model:
      //   1. localStorage works in normal browsers AND within a single
      //      Canvas session — but Canvas wipes localStorage between sessions.
      //   2. The host's executeSaveFile / handleLoadProject pipeline picks up
      //      `window.__alloflowSelEngagement` and serializes it into the
      //      project JSON, which IS preserved across Canvas sessions.
      //   3. On mount we prefer the window slot (means a project was just
      //      loaded), then fall back to localStorage. We mirror every change
      //      back to both so the next save round-trip and the next session
      //      both work.
      function _selReadInitial() {
        try {
          if (typeof window !== 'undefined' && window.__alloflowSelEngagement) {
            return window.__alloflowSelEngagement;
          }
        } catch (e) {}
        var streak = { count: 0, longest: 0, lastDate: null };
        var toolUsage = {};
        try {
          var rawS = JSON.parse(localStorage.getItem('alloflow_sel_streak') || '{}');
          streak = { count: rawS.count || 0, longest: rawS.longest || 0, lastDate: rawS.lastDate || null };
        } catch (e) {}
        try {
          toolUsage = JSON.parse(localStorage.getItem('alloflow_sel_tool_usage') || '{}') || {};
        } catch (e) {}
        return { streak: streak, toolUsage: toolUsage };
      }
      var _selInitial = _selReadInitial();
      var _selStreak = React.useState(_selInitial.streak || { count: 0, longest: 0, lastDate: null });
      var selStreak = _selStreak[0]; var setSelStreak = _selStreak[1];

      var _selToolUsage = React.useState(_selInitial.toolUsage || {});
      var selToolUsage = _selToolUsage[0]; var setSelToolUsage = _selToolUsage[1];

      // Mark dirty when any persisted tool state changes (after first render).
      React.useEffect(function() {
        if (_firstRenderRef.current) {
          _firstRenderRef.current = false;
          return;
        }
        setIsDirty(true);
      }, [selToolData, selSnapshots, studentArtifacts, selXp, selToolUsage]);

      // Mirror state changes to the window slot so the host save flow can
      // serialize it into the project JSON. The _ts stamp lets the host
      // skip emitting a SEL block when nothing has changed.
      React.useEffect(function () {
        try {
          window.__alloflowSelEngagement = { streak: selStreak, toolUsage: selToolUsage, _ts: Date.now() };
        } catch (e) {}
      }, [selStreak, selToolUsage]);

      // Persist tool snapshots locally and mirror them to the host save slot.
      React.useEffect(function () {
        try { localStorage.setItem('alloflow_sel_snapshots', JSON.stringify(selSnapshots || [])); } catch (e) {}
        try { window.__alloflowSelSnapshots = Array.isArray(selSnapshots) ? selSnapshots : []; } catch (e) {}
      }, [selSnapshots]);

      // Shared student-authored artifacts registry. SEL writes share packets;
      // AlloHaven reads the registry as a read-only portfolio shelf.
      React.useEffect(function () {
        var artifacts = Array.isArray(studentArtifacts) ? studentArtifacts : [];
        try { localStorage.setItem('alloflow_student_artifacts', JSON.stringify(artifacts)); } catch (e) {}
        try {
          window.__alloflowStudentArtifacts = artifacts;
          window.dispatchEvent(new CustomEvent('alloflow-student-artifacts-changed', { detail: { source: 'sel_hub' } }));
        } catch (e) {}
      }, [studentArtifacts]);

      // Hot-reload from a project JSON load mid-session: misc_handlers
      // dispatches this event after writing window.__alloflowSelEngagement.
      React.useEffect(function () {
        function onRestore() {
          try {
            var w = window.__alloflowSelEngagement || {};
            if (w.streak) setSelStreak(w.streak);
            if (w.toolUsage) setSelToolUsage(w.toolUsage);
          } catch (e) {}
        }
        window.addEventListener('alloflow-sel-engagement-restored', onRestore);
        return function () { window.removeEventListener('alloflow-sel-engagement-restored', onRestore); };
      }, []);

      // Same hot-reload path for saved tool snapshots.
      React.useEffect(function () {
        function onSnapshotRestore() {
          try {
            var w = window.__alloflowSelSnapshots;
            if (Array.isArray(w)) setSelSnapshots(w);
          } catch (e) {}
        }
        window.addEventListener('alloflow-sel-snapshots-restored', onSnapshotRestore);
        return function () { window.removeEventListener('alloflow-sel-snapshots-restored', onSnapshotRestore); };
      }, []);

      React.useEffect(function () {
        function onStudentArtifactsRestore() {
          try {
            var w = window.__alloflowStudentArtifacts;
            if (Array.isArray(w)) setStudentArtifacts(w);
          } catch (e) {}
        }
        window.addEventListener('alloflow-student-artifacts-restored', onStudentArtifactsRestore);
        window.addEventListener('alloflow-student-artifacts-changed', onStudentArtifactsRestore);
        return function () {
          window.removeEventListener('alloflow-student-artifacts-restored', onStudentArtifactsRestore);
          window.removeEventListener('alloflow-student-artifacts-changed', onStudentArtifactsRestore);
        };
      }, []);

      var _activeStationId = React.useState(null);
      var activeStationId = _activeStationId[0]; var setActiveStationId = _activeStationId[1];
      var activeStation = (function () {
        if (!activeStationId) return null;
        return savedStations.find(function (s) { return s.id === activeStationId; }) || null;
      })();

      var _questProgress = React.useState(function () {
        try { return JSON.parse(localStorage.getItem('alloflow_sel_station_progress') || '{}'); } catch (e) { return {}; }
      });
      var questProgress = _questProgress[0]; var setQuestProgress = _questProgress[1];

      // Builder state — only used in teacher mode
      var _builderOpen = React.useState(false);
      var builderOpen = _builderOpen[0]; var setBuilderOpen = _builderOpen[1];
      var _builderName = React.useState('');
      var builderName = _builderName[0]; var setBuilderName = _builderName[1];
      var _builderNote = React.useState('');
      var builderNote = _builderNote[0]; var setBuilderNote = _builderNote[1];
      var _builderTools = React.useState({});
      var builderTools = _builderTools[0]; var setBuilderTools = _builderTools[1];
      var _builderQuests = React.useState([]);
      var builderQuests = _builderQuests[0]; var setBuilderQuests = _builderQuests[1];

      // Persist saved stations to localStorage AND to the window slot the
      // host save pipeline reads. Without the window mirror, executeSaveFile
      // can't include stations in the project JSON, so they vanish whenever
      // Canvas wipes localStorage between sessions.
      React.useEffect(function () {
        try { localStorage.setItem('alloflow_sel_stations', JSON.stringify(savedStations)); } catch (e) {}
        try { window.__alloflowSelStations = savedStations; } catch (e) {}
      }, [savedStations]);

      // Persist quest progress to localStorage AND to the window slot. Same
      // Canvas-survival reason as savedStations above.
      React.useEffect(function () {
        try { localStorage.setItem('alloflow_sel_station_progress', JSON.stringify(questProgress)); } catch (e) {}
        try { window.__alloflowSelProgress = questProgress; } catch (e) {}
      }, [questProgress]);

      // Hot-reload from a project JSON load mid-session for SEL stations:
      // misc_handlers dispatches this after writing window.__alloflowSelStations.
      React.useEffect(function () {
        function onStationsRestore() {
          try {
            var w = window.__alloflowSelStations;
            if (Array.isArray(w)) setSavedStations(w);
          } catch (e) {}
        }
        window.addEventListener('alloflow-sel-stations-restored', onStationsRestore);
        return function () { window.removeEventListener('alloflow-sel-stations-restored', onStationsRestore); };
      }, []);

      // Same hot-reload for quest progress.
      React.useEffect(function () {
        function onProgressRestore() {
          try {
            var w = window.__alloflowSelProgress;
            if (w && typeof w === 'object') setQuestProgress(w);
          } catch (e) {}
        }
        window.addEventListener('alloflow-sel-progress-restored', onProgressRestore);
        return function () { window.removeEventListener('alloflow-sel-progress-restored', onProgressRestore); };
      }, []);

      // Hot-reload for per-tool state. The hub keeps an aggregate selToolData
      // state object that gets pushed into ctx.toolData for each tool render.
      // When a project loads, window.__alloflowSelToolData has the full map
      // keyed by toolId — pull it into React state so the next render of any
      // open tool sees its restored slice.
      React.useEffect(function () {
        function onToolDataRestore() {
          try {
            var w = window.__alloflowSelToolData;
            if (w && typeof w === 'object') setSelToolData(w);
          } catch (e) {}
        }
        window.addEventListener('alloflow-sel-tooldata-restored', onToolDataRestore);
        return function () { window.removeEventListener('alloflow-sel-tooldata-restored', onToolDataRestore); };
      }, []);

      // Mirror the hub's aggregate per-tool state into the window slot the
      // host save pipeline reads. Same Canvas-survival pattern as the
      // engagement / stations / progress mirrors above.
      React.useEffect(function () {
        try { window.__alloflowSelToolData = selToolData; } catch (e) {}
      }, [selToolData]);

      // ── Daily streak tick ──
      // When the SEL Hub opens on a new calendar day, increment the streak
      // (or reset to 1 if the gap is > 1 day). Same-day re-opens are no-ops.
      React.useEffect(function () {
        if (!showSelHub) return;
        var today = new Date().toDateString();
        if (selStreak.lastDate === today) return;
        var newCount = 1;
        if (selStreak.lastDate) {
          var diffMs = new Date(today).getTime() - new Date(selStreak.lastDate).getTime();
          var diffDays = Math.round(diffMs / 86400000);
          if (diffDays === 1) newCount = (selStreak.count || 0) + 1;
        }
        var next = { count: newCount, longest: Math.max(newCount, selStreak.longest || 0), lastDate: today };
        setSelStreak(next);
        try { localStorage.setItem('alloflow_sel_streak', JSON.stringify(next)); } catch (e) {}
      }, [showSelHub]);

      // Helper: record a tool-open event so we can surface "Continue" and
      // "New" indicators. Called from the tool-card click handler.
      function trackToolOpen(toolId) {
        if (!toolId) return;
        setSelToolUsage(function (prev) {
          var prior = prev[toolId] || { count: 0 };
          var next = Object.assign({}, prev);
          next[toolId] = { count: (prior.count || 0) + 1, lastUsed: Date.now() };
          try { localStorage.setItem('alloflow_sel_tool_usage', JSON.stringify(next)); } catch (e) {}
          return next;
        });
      }

      function openSelToolById(toolId, label) {
        if (!toolId) return;
        if (window.SelHub && window.SelHub.isRegistered(toolId)) {
          _alloLastToolCardId = toolId;
          trackToolOpen(toolId);
          setSelHubTool(toolId);
          announceToSR('Opened ' + (label || toolId));
          alloFocusToolStart();
          if (activePathway && activePathway.tools && activePathway.tools.indexOf(toolId) >= 0) {
            setPathwayProgress(function(prev) {
              var n = Object.assign({}, prev);
              n[toolId] = true;
              return n;
            });
          }
        } else if (typeof addToast === 'function') {
          addToast((label || 'This SEL tool') + ' is loading...', 'info');
        }
      }

      // Sync activeStation prop from parent (e.g. resource-history click).
      React.useEffect(function () {
        if (props.activeStation && props.activeStation.id) {
          setActiveStationId(props.activeStation.id);
          // If parent passed a station we don't have in localStorage, persist it.
          var existing = savedStations.find(function (s) { return s.id === props.activeStation.id; });
          if (!existing) setSavedStations(savedStations.concat([props.activeStation]));
        }
      }, [props.activeStation && props.activeStation.id]);

      // Tick a "time spent" timer every 30s while a tool is active (for timeSpent quests).
      React.useEffect(function () {
        if (!activeStation || !selHubTool) return;
        var timeQuests = (activeStation.quests || []).filter(function (q) { return q.type === 'timeSpent' && q.toolId === selHubTool; });
        if (timeQuests.length === 0) return;
        var interval = setInterval(function () {
          setQuestProgress(function (prev) {
            var next = Object.assign({}, prev);
            var sp = Object.assign({}, next[activeStation.id] || {});
            timeQuests.forEach(function (q) {
              var qp = Object.assign({}, sp[q.qid] || {});
              qp.timeAccumMs = (qp.timeAccumMs || 0) + 30000;
              sp[q.qid] = qp;
            });
            next[activeStation.id] = sp;
            return next;
          });
        }, 30000);
        return function () { clearInterval(interval); };
        // activeStation is in deps so a teacher-edit to the quest list refreshes
        // the captured timeQuests instead of relying on a stale closure.
      }, [selHubTool, activeStationId, activeStation]);

      // Auto-evaluate xpThreshold + timeSpent quests on relevant changes.
      React.useEffect(function () {
        if (!activeStation || !activeStation.quests) return;
        setQuestProgress(function (prev) {
          var sp = Object.assign({}, prev[activeStation.id] || {});
          var changed = false;
          activeStation.quests.forEach(function (q) {
            var qp = Object.assign({}, sp[q.qid] || {});
            if (qp.complete) return;
            var done = false;
            if (q.type === 'xpThreshold') {
              done = selXp >= (q.params && q.params.threshold || 30);
            } else if (q.type === 'timeSpent') {
              done = (qp.timeAccumMs || 0) >= (q.params && q.params.minutes || 5) * 60000;
            } else if (q.type === 'freeResponse') {
              done = (qp.response || '').length >= (q.params && q.params.minLength || 30);
            } else if (q.type === 'manualComplete') {
              done = !!qp.markedComplete;
            }
            if (done && !qp.complete) {
              qp.complete = true;
              qp.completedAt = new Date().toISOString();
              sp[q.qid] = qp;
              changed = true;
            }
          });
          if (!changed) return prev;
          var next = Object.assign({}, prev);
          next[activeStation.id] = sp;
          return next;
        });
      }, [selXp, activeStationId, questProgress]);

      function _selQuestAutoLabel(type, toolId, params) {
        var toolName = 'this hub';
        if (toolId && window.SelHub && window.SelHub._registry && window.SelHub._registry[toolId]) {
          toolName = window.SelHub._registry[toolId].name || toolId;
        }
        switch (type) {
          case 'xpThreshold':    return 'Earn ' + ((params && params.threshold) || 30) + ' SEL XP overall';
          case 'timeSpent':      return 'Spend ' + ((params && params.minutes) || 5) + ' minutes in ' + toolName;
          case 'freeResponse':   return (params && params.prompt) || 'Write a reflection';
          case 'manualComplete': return 'Complete the activity in ' + toolName;
          default: return 'Complete a quest';
        }
      }

      // Re-entrancy guard: a fast double-click on Save would otherwise create
      // two stations with different Date.now() ids but identical content.
      var _savingStation = React.useRef(false);
      function _saveBuilderAsStation() {
        if (_savingStation.current) return;
        var selectedToolIds = Object.keys(builderTools).filter(function (k) { return builderTools[k]; });
        if (selectedToolIds.length === 0) {
          if (typeof addToast === 'function') addToast('Pick at least one tool first', 'info');
          return;
        }
        _savingStation.current = true;
        try {
          var station = {
            id: 'sel_station_' + Date.now(),
            name: (builderName.trim() || 'Custom SEL Station'),
            tools: selectedToolIds,
            teacherNote: builderNote,
            quests: builderQuests.map(function (q, i) {
              return Object.assign({}, q, { qid: q.qid || ('q_' + i + '_' + Date.now()) });
            }),
            createdAt: new Date().toISOString(),
            source: 'sel-hub-builder'
          };
          setSavedStations(savedStations.concat([station]));
          setActiveStationId(station.id);
          // Reset builder
          setBuilderName(''); setBuilderNote(''); setBuilderTools({}); setBuilderQuests([]);
          setBuilderOpen(false);
          if (typeof addToast === 'function') addToast('SEL Station saved!', 'success');
          announceToSR('Custom SEL Station saved and activated.');
          // Surface to parent so the resource sidebar can show it.
          if (typeof props.onSaveStation === 'function') props.onSaveStation(station);
        } finally {
          _savingStation.current = false;
        }
      }

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
            if (selHubTool) { setSelHubTool(null); announceToSR('Returned to tool grid'); alloFocusToolCard(selHubTool); }
            else { setShowSelHub(false); }
          }
          if (e.altKey) {
            if (e.key === 'Backspace' || e.key === 'b') { e.preventDefault(); var fromTool = selHubTool; setSelHubTool(null); announceToSR('Returned to tool grid'); alloFocusToolCard(fromTool); }
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
        border:   isContrast ? '#ffff00' : isDark ? '#64748b' : '#94a3b8',
        text:     isContrast ? '#ffff00' : isDark ? '#f1f5f9' : '#0f172a',
        textMuted:isContrast ? '#ffff00' : isDark ? '#94a3b8' : '#64748b',
        headerBg: isContrast ? '#000000' : isDark ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        headerText: isContrast ? '#ffff00' : '#f1f5f9',
        btnBg:    isContrast ? '#000000' : isDark ? '#334155' : '#e2e8f0',
        btnText:  isContrast ? '#00ff00' : isDark ? '#f1f5f9' : '#334155',
        btnBorder:isContrast ? '2px solid #00ff00' : isDark ? 'none' : 'none',
        accent:   isContrast ? '#00ff00' : '#7c3aed',
        accentText: isContrast ? '#000000' : '#ffffff',
        bgSoft:   isContrast ? '#000000' : isDark ? '#111827' : '#f8fafc',
        bgRaised: isContrast ? '#000000' : isDark ? '#111827' : '#ffffff',
        bgDisabled: isContrast ? '#000000' : isDark ? '#172033' : '#f1f5f9',
        accentSoftBg: isContrast ? '#000000' : isDark ? 'rgba(124,58,237,0.2)' : '#f5f3ff',
        accentSoftText: isContrast ? '#00ff00' : isDark ? '#ddd6fe' : '#6d28d9',
        successText: isContrast ? '#00ff00' : '#0f766e',
        dangerText: isContrast ? '#ff6b6b' : '#b91c1c',
        warningText: isContrast ? '#ffff00' : isDark ? '#fbbf24' : '#92400e',
        pinkAccent: isContrast ? '#ff7ab6' : '#db2777',
        pinkText: isContrast ? '#ff7ab6' : '#be185d',
        onPink: isContrast ? '#000000' : '#ffffff'
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
        { id: 'viaStrengths', icon: '\uD83C\uDF1F', label: 'VIA Strengths',     desc: 'A simplified self-sort of the 24 VIA Character Strengths (Peterson and Seligman, 2004), with 6 virtues and identification of signature strengths. For the authoritative free survey, go to viacharacter.org. Reflective practice, not psychometric.', color: 'amber', recommendedRange: '5-12' },
        { id: 'wheelOfLife', icon: '\uD83D\uDEDE', label: 'Wheel of Life',      desc: 'Spider chart of 8 life domains, each rated 1 to 10. A self-portrait of where life is full and where it is thin right now. From the coaching tradition (Meyer 1960s; Co-Active Coaching). Heuristic; not a validated psychometric.', color: 'amber', recommendedRange: '5-12' },
        { id: 'perma',       icon: '\uD83C\uDF3B', label: 'PERMA Wellbeing',    desc: 'Self-check on the five (six) domains of human flourishing: Positive emotion, Engagement, Relationships, Meaning, Accomplishment, Health. 24 items, bar-chart result, per-domain reflection. From Seligman; pairs with VIA Strengths.', color: 'amber', recommendedRange: '5-12' },

        // Self-Regulation (was Self-Management; split to give arousal/emotion tools their own home)
        { id: '_cat_SelfRegulation', icon: '\uD83C\uDFAF', label: 'Self-Regulation', desc: '', color: 'slate', category: true },
        { id: 'coping',      icon: '\uD83E\uDDE8', label: 'Coping Toolkit',      desc: 'Explore and practice coping strategies — breathing, grounding, movement, and more.', color: 'teal', recommendedRange: 'K-12' },
        { id: 'windowOfTolerance', icon: '\uD83E\uDE9F', label: 'Window of Tolerance', desc: 'Trauma-informed self-awareness visual. Three arousal zones (hyperarousal, window, hypoarousal). Map your personal signs of each zone, your triggers, and the practices that bring you back. Based on Siegel (1999); standard in trauma-informed schools.', color: 'teal', recommendedRange: '5-12' },
        { id: 'stressBucket', icon: '\uD83E\uDEA3', label: 'Stress Bucket',        desc: 'A capacity visual. Stressors pour in; coping practices drain out. See whether your inflow and outflow are balanced. CBT-tradition tool (Brabban and Turkington 2002), used across NHS IAPT and Mind UK. Honest about structural stressors.', color: 'teal', recommendedRange: '5-12' },
        { id: 'tipp',        icon: '\uD83C\uDD98', label: 'TIPP',                desc: 'Four DBT crisis-survival skills (Temperature, Intense exercise, Paced breathing, Paired muscle relaxation) for ACUTE distress. Down-regulates the body in 30 seconds to 10 minutes before you try to think your way out. Foundational DBT Distress Tolerance skill (Linehan).', color: 'red', recommendedRange: '5-12' },
        { id: 'anxietyToolkit', icon: '\uD83E\uDEE7', label: 'Anxiety Toolkit', desc: 'CBT-based skills for working with anxiety: psychoeducation, the worry tree (productive vs unproductive worry), scheduled worry time, decatastrophizing, grounding skills, and a personal patterns inventory. From Beck Institute, AACAP, ADAA. Pairs with Window of Tolerance and Stress Bucket.', color: 'cyan', recommendedRange: '5-12' },
        { id: 'sleep',       icon: '\uD83D\uDE34', label: 'Sleep & Rest',        desc: 'Adolescent sleep is a public-health crisis. AAP-recommended 8-10 hours is rarely met. Psychoeducation, self-check, 8 common barriers + what works for each, and a sleep diary. From AAP, CDC, NSF, Carskadon research.', color: 'indigo', recommendedRange: '5-12' },
        { id: 'sensoryRegulation', icon: '\uD83C\uDF08', label: 'Sensory Regulation', desc: 'Neurodiversity-affirming tool for understanding your own sensory processing across the 8 sensory systems. Build a personal profile, plan a sensory diet, identify school accommodations. Identity-first language; built on Ayres / Dunn / autistic-led scholarship.', color: 'orange', recommendedRange: '3-12' },
        { id: 'bigFeelings', icon: '\uD83D\uDD25', label: 'Big Feelings (Anger)', desc: 'Anger-specific psychoeducation and skill-building. Anger as information, not the problem; reactive aggression as the trap. Built on Lochman\'s Coping Power tradition + the CBT-for-anger evidence base. Hassle log, trigger inventory, the choice point, personalized cool-downs.', color: 'orange', recommendedRange: '5-12' },
        { id: 'substancePsychoed', icon: '\u2697\uFE0F', label: 'Substance Use', desc: 'Harm-reduction psychoeducation about substances (alcohol, cannabis, nicotine, opioids, stimulants, benzos, hallucinogens). Adolescent brain risks. Naloxone education. NOT a screener, NOT abstinence-only. Strong SAMHSA referral. MI-aligned reflection space.', color: 'slate', recommendedRange: '6-12' },
        { id: 'behavioralActivation', icon: '\uD83D\uDCC5', label: 'Behavioral Activation', desc: 'Plan small activities, do them, rate them for mastery (felt competent) and pleasure (enjoyed). Mood follows action more than action follows mood. One of the most evidence-supported treatments for low mood and depression. From Lewinsohn, Jacobson, Martell.', color: 'emerald', recommendedRange: '5-12' },
        // Inner Work (contemplative + reflective practice)
        { id: '_cat_InnerWork', icon: '\uD83E\uDDD8', label: 'Inner Work', desc: '', color: 'slate', category: true },
        { id: 'mindfulness', icon: '\uD83E\uDDD8', label: 'Mindfulness Corner',  desc: 'Guided breathing exercises, body scans, and mindfulness activities.', color: 'purple', recommendedRange: 'K-12' },
        { id: 'quietQuestions', icon: '\uD83C\uDF12', label: 'Quiet Questions',  desc: 'Weekly inner inquiry practice. Sit with one open-ended question for a full week. 20 rotating queries across attention, longing, difficulty, connection, and becoming. Inspired by Quaker query tradition; secular and non-prescriptive.', color: 'purple', recommendedRange: '5-12' },
        { id: 'orientations', icon: '\uD83E\uDDED', label: 'Orientations',      desc: 'Ways of Living, Compared. Eight philosophical traditions (Daoism, Zen, Stoicism, Existentialism, Confucian ethics, Ubuntu, Indigenous relationality, Care Ethics) compared on big life questions. Non-prescriptive; each tradition has an honest "what it cannot do well" panel.', color: 'purple', recommendedRange: '6-12' },
        { id: 'thoughtRecord', icon: '\uD83D\uDCD3', label: 'CBT Thought Record', desc: 'The 7-column thought record from Cognitive Behavioral Therapy. Walk through a hard moment: situation, emotion, automatic thought, evidence for and against, balanced thought, emotion re-rating. Saves entries over time. From Beck, Burns, Padesky.', color: 'purple', recommendedRange: '5-12' },
        { id: 'costBenefit', icon: '\u2696\uFE0F', label: 'Cost-Benefit Grid',  desc: 'A 2x2 decision-making grid from Dialectical Behavior Therapy. Short-term and long-term pros and cons of a decision, side by side. Useful when emotion is pushing for one option. From Linehan.', color: 'purple', recommendedRange: '5-12' },
        { id: 'sfbt',        icon: '\uD83D\uDD2D', label: 'Solution-Focused',   desc: 'Solution-Focused Brief Therapy: the Miracle Question, Scaling, Exception-finding, and Compliments. Looks forward instead of backward, asks what is already working. The most-used technique in US school counseling. From de Shazer and Berg.', color: 'purple', recommendedRange: '5-12' },
        // Care of Self (self-compassion, relational self-care)
        { id: '_cat_CareOfSelf', icon: '\uD83E\uDD7A', label: 'Care of Self', desc: '', color: 'slate', category: true },
        { id: 'careConstellations', icon: '\uD83C\uDF0C', label: 'Care Constellations', desc: 'A relational map of who cares for you and who you care for. Refuses the individualist or consumerist "self-care" frame. Includes a substantive philosophical view on Care of Self vs Self-Care (Foucault, Greek epimeleia heautou, Audre Lorde, eudaimonic vs hedonic).', color: 'rose', recommendedRange: '5-12' },
        { id: 'ecomap',      icon: '\uD83D\uDD78\uFE0F', label: 'Ecomap',              desc: 'Person-in-environment relationship map. You at the center; the 12 major life systems around you. Each connection rated for strength, stress, and energy direction. Standard social-work tool since Hartman (1978); used in IEPs, family assessment, and personal life inventory.', color: 'rose', recommendedRange: '5-12' },
        { id: 'circlesOfSupport', icon: '\uD83C\uDFAF', label: 'Circles of Support', desc: 'Four concentric rings of relationship: Intimacy, Friendship, Participation, Exchange (paid). Makes visible who is actually close, including when paid people fill the inner rings. From Forest and Snow at Inclusion Press.', color: 'rose', recommendedRange: '3-12' },
        { id: 'genogram',    icon: '\uD83C\uDF33', label: 'Genogram',            desc: 'Three-generation family map using standard family-systems symbols. For personal self-understanding only (NOT clinical assessment). Based on Bowen family systems theory and McGoldrick-Gerson-Petry notation. Includes prominent safe-framing guidance.', color: 'rose', recommendedRange: '5-12' },
        { id: 'griefLoss',   icon: '\uD83D\uDD6F\uFE0F', label: 'Grief & Loss',         desc: 'A guided self-companion for grief. Death of a person or pet, family changes, friend losses, identity losses, ambiguous loss \u2014 all count. Walk through Worden\'s four tasks of mourning, write a letter, plan rituals. Strong safety framing pointing to Crisis Companion / 988 for severe or complicated grief.', color: 'rose', recommendedRange: '5-12' },
        { id: 'traumaPsychoed', icon: '\uD83C\uDF3F', label: 'Understanding Trauma', desc: 'Psychoeducation only (NOT a screener). What trauma is and is not, neurobiology in plain English, common responses reframed as adaptations, SAMHSA\'s 6 principles, evidence-based treatments. For students and educators. Includes prominent safety framing about why screening without follow-up is unsafe.', color: 'emerald', recommendedRange: '6-12' },
        { id: 'bodyStory',   icon: '\uD83E\uDEC2', label: 'Body Story',           desc: 'Body-acceptance and embodiment tool. NOT weight-focused, NOT diet-adjacent, NOT a screener. Built on Tylka body appreciation, intuitive eating principles, and media literacy. Inclusive of all bodies, all genders, all sizes. Strong NEDA referral framing for eating disorders.', color: 'rose', recommendedRange: '6-12' },
        { id: 'sourcesOfStrength', icon: '\uD83C\uDF1F', label: 'Sources of Strength', desc: 'Map your 8 protective factors. The strongest evidence-based upstream youth suicide prevention framework (Wyman et al.). Builds protective factors BEFORE crisis hits. Complements Crisis Companion on the protective side.', color: 'amber', recommendedRange: '6-12' },
        { id: 'crisiscompanion', icon: '\uD83E\uDEC2', label: 'Crisis Companion', desc: 'Peer support and suicide-prevention skills: what to do if you or a friend is depressed, in crisis, or thinking about self-harm \u2014 recognizing the signs, what to say (and not say), telling a trusted adult, plus 988 and a personal safety plan. Content-warning gated. Aligned with NEDA, AFSP, Sources of Strength, and 988. The acute-support counterpart to Sources of Strength.', color: 'teal', recommendedRange: '6-12' },
        { id: 'identitySupport', icon: '\uD83C\uDF08', label: 'Identity Support', desc: 'Inclusive, affirming space for gender identity, sexual orientation, romantic orientation, and broader identity questions. Vocabulary, identity development, finding community, safety for trans youth, ally guidance. Built on Trevor Project, GLSEN, PFLAG.', color: 'pink', recommendedRange: '5-12' },
        { id: 'disabilityVoices', icon: '\uD83C\uDFA4', label: 'Disability Voices', desc: 'Real autistic and disabled advocates whose work shaped, and critiqued, disability practice. Quotes, context, and a curated reading list. Built so the people the field has been done TO are centered, not relegated to a sidebar in a behavior-science tool. Ari Ne\'eman, Temple Grandin, Damian Milton, Henny Kupferstein, Kassiane Asasumasu, Mel Baggs, Lydia X. Z. Brown, Patty Berne.', color: 'pink', recommendedRange: '6-12' },
        // Self-Direction (agency, goal-setting, executive function)
        { id: '_cat_SelfDirection', icon: '\uD83E\uDDED', label: 'Self-Direction', desc: '', color: 'slate', category: true },
        { id: 'goals',       icon: '\uD83D\uDCCB', label: 'Goal Setter',         desc: 'Set SMART goals, track progress, and celebrate milestones.', color: 'indigo', recommendedRange: '3-12' },
        { id: 'howlTracker', icon: '\uD83E\uDDED', label: 'HOWL Tracker',        desc: 'Habits of Work and Learning self-assessment for Crew time. Weekly check-ins, quarterly goals, trend chart, Crew conversation prompts. Aligned with EL Education\'s HOWL framework.', color: 'indigo', recommendedRange: '3-12' },
        { id: 'onePageProfile', icon: '\uD83D\uDCC4', label: 'One-Page Profile', desc: 'Portable, printable profile that fits on one page. Three sections: what people like and admire about me, what is important to me, how best to support me. Person-centered planning artifact for IEP meetings, transitions, substitutes, or Crew. Based on Helen Sanderson Associates format.', color: 'indigo', recommendedRange: '3-12' },
        { id: 'maps',        icon: '\uD83D\uDDFA\uFE0F', label: 'MAPS',         desc: 'Making Action Plans. Eight prompts in sequence (My Story, Dream, Nightmare, Who I Am, Gifts, Needs, Action Plan, First Steps). Person-centered visual from Pearpoint, O\'Brien, and Forest at Inclusion Press; widely used for transition planning.', color: 'indigo', recommendedRange: '5-12' },
        { id: 'path',        icon: '\uD83E\uDDED', label: 'PATH',                desc: 'Planning Alternative Tomorrows with Hope. Futures-planning visual: eight stages from your long-horizon North Star backward to first steps in two weeks. Pearpoint, O\'Brien, and Forest at Inclusion Press; pairs with MAPS.', color: 'indigo', recommendedRange: '5-12' },
        { id: 'valuesCommittedAction', icon: '\uD83E\uDDED', label: 'Values & Action', desc: 'Sort what matters, name your top values, and turn each into a small concrete action this week. From Acceptance and Commitment Therapy (Hayes); adolescent DNA-V framing. The ACT distinction between values (directions) and goals (destinations).', color: 'indigo', recommendedRange: '5-12' },
        { id: 'careerCompass', icon: '\uD83E\uDDED', label: 'Career Compass', desc: 'Explore careers through your interests. 36-item RIASEC self-check gives a top-three Holland code; browse careers, the 16 federal Career Clusters, and concrete next steps (shadow days, info interviews, CTE, apprenticeships). Built on Holland\'s framework; points to the authoritative O*NET Interest Profiler at mynextmove.org.', color: 'indigo', recommendedRange: '5-12' },

        // ── Social Awareness ──
        { id: '_cat_SocialAwareness', icon: '\uD83E\uDD1D', label: 'Social Awareness', desc: '', color: 'slate', category: true },
        { id: 'perspective', icon: '\uD83D\uDC53', label: 'Perspective Lens',    desc: 'See situations from different viewpoints — practice empathy and perspective-taking.', color: 'rose', recommendedRange: '2-12' },
        { id: 'community',   icon: '\uD83C\uDF0D', label: 'Community & Culture', desc: 'Explore diversity, cultural awareness, and community belonging.', color: 'cyan', recommendedRange: 'K-12' },

        // ── Relationship Skills ──
        { id: '_cat_RelationshipSkills', icon: '\uD83D\uDCAC', label: 'Relationship Skills', desc: '', color: 'slate', category: true },
        { id: 'conflict',    icon: '\u2696\uFE0F', label: 'Conflict Resolution', desc: 'Practice resolving conflicts with role-play scenarios and I-statements.', color: 'orange', recommendedRange: '2-12' },
        { id: 'social',      icon: '\uD83D\uDDE3\uFE0F', label: 'Social Skills Lab',  desc: 'Practice conversation skills, active listening, body language, and cooperation.', color: 'sky', recommendedRange: 'K-8' },
        { id: 'teamwork',    icon: '\uD83E\uDD1C\uD83E\uDD1B', label: 'Teamwork Builder', desc: 'Collaborative challenges and team role exploration.', color: 'lime', recommendedRange: 'K-12' },
        { id: 'dearMan',     icon: '\uD83D\uDDE3\uFE0F', label: 'DEAR MAN',          desc: 'Build a script for a hard ask in seven steps: Describe, Express, Assert, Reinforce, Mindful, Appear confident, Negotiate. From DBT Interpersonal Effectiveness (Linehan); the most-used assertive-communication script in school counseling. Pairs with Self-Advocacy.', color: 'blue', recommendedRange: '5-12' },
        { id: 'motivationalInterviewing', icon: '\uD83D\uDC42', label: 'Motivational Interviewing', desc: 'A conversation framework for helping someone (or yourself) think through a change. Learn OARS skills (Open questions, Affirmations, Reflections, Summaries), the three rulers, and Change Talk. From Miller and Rollnick; foundation of school counseling and peer-support work.', color: 'blue', recommendedRange: '6-12' },
        { id: 'crewProtocols', icon: '\uD83E\uDE91', label: 'Crew Protocols', desc: 'A library of structured group formats for Crew time, advisory, or homeroom: community builders, openings, closings, restorative circles, reflection protocols, celebration formats, and hard-conversation guides. Plus a roll-up of all Crew prompts from across the SEL Hub. Built on EL Education Crew, Restorative Practices, Tribes, Responsive Classroom.', color: 'sky', recommendedRange: '3-12' },
        { id: 'healthyRelationships', icon: '\uD83D\uDC9E', label: 'Healthy Relationships', desc: 'The spectrum (healthy / unhealthy / abusive) across 8 dimensions of any close relationship. Consent in detail, dating-violence prevention, safety + helplines. Built on the Loveisrespect / NDVH framework. Inclusive of queer, neurodivergent, and disabled folks.', color: 'pink', recommendedRange: '6-12' },

        // ── Responsible Decision-Making ──
        { id: '_cat_DecisionMaking', icon: '\u2696\uFE0F', label: 'Responsible Decision-Making', desc: '', color: 'slate', category: true },
        { id: 'decisions',   icon: '\uD83E\uDD14', label: 'Decision Lab',        desc: 'Work through real-life scenarios using stop-think-act frameworks.', color: 'violet', recommendedRange: '3-12' },
        { id: 'journal',     icon: '\uD83D\uDCD3', label: 'Feelings Journal',    desc: 'Daily check-in journal — log moods, triggers, and reflections over time.', color: 'pink', recommendedRange: 'K-12' },
        { id: 'safety',      icon: '\uD83D\uDEE1\uFE0F', label: 'Safety & Boundaries', desc: 'Learn about personal boundaries, trusted adults, and safe vs. unsafe situations.', color: 'red', recommendedRange: 'K-8' },

        // Stewardship (community, justice, land, and the future)
        { id: '_cat_Stewardship', icon: '\uD83C\uDF31', label: 'Stewardship', desc: '', color: 'slate', category: true },
        { id: 'landPlace',   icon: '\uD83C\uDF31', label: 'Land & Place',         desc: 'Stewardship Studio for ongoing relationship with the land you live on. Three threads (history, ecology, present), critical reflection on land acknowledgment as practice rather than performance, Wabanaki-led organizations as authoritative voices, and a private reflection journal.', color: 'emerald', recommendedRange: '5-12' }
      ];
      // Append dynamically registered tools into the correct category positions
      var _dynamicTools = [
        { id: 'restorativeCircle', icon: '\uD83E\uDEB6', label: 'Restorative Circle', desc: 'Facilitate restorative and community-building circles. Explore talking pieces and Indigenous roots.', color: 'amber', recommendedRange: '3-12', _cat: 'relationship-skills' },
        { id: 'compassion', icon: '\uD83E\uDD7A', label: 'Compassion & Self-Talk', desc: 'Practice self-compassion, reframe inner critic, and build a kinder inner voice.', color: 'rose', recommendedRange: 'K-12', _cat: 'care-of-self' },
        { id: 'friendship', icon: '\uD83E\uDD1D', label: 'Friendship Builder', desc: 'Explore friendship styles, repair strategies, and healthy relationship patterns.', color: 'amber', recommendedRange: 'K-12', _cat: 'relationship-skills' },
        { id: 'transitions', icon: '\uD83C\uDF31', label: 'Life Transitions', desc: 'Navigate changes like moving, new schools, and growing up.', color: 'emerald', recommendedRange: 'K-12', _cat: 'self-regulation' },
        { id: 'upstander', icon: '\uD83E\uDDB8', label: 'Upstander Training', desc: 'Learn to stand up for others safely — bystander to upstander skills.', color: 'red', recommendedRange: '2-12', _cat: 'social-awareness' },
        { id: 'growthmindset', icon: '\uD83E\uDDE0', label: 'Growth Mindset', desc: 'Brain science, reframing challenges, and building resilience.', color: 'violet', recommendedRange: 'K-12', _cat: 'self-direction' },
        { id: 'execfunction', icon: '\uD83E\uDDE0', label: 'Executive Function', desc: 'Strategies for the harder parts of getting things done: starting tasks, holding focus, planning ahead, and tracking time.', color: 'cyan', recommendedRange: '3-12', _cat: 'self-direction' },
        { id: 'advocacy', icon: '\uD83D\uDCE2', label: 'Self-Advocacy', desc: 'Learn to speak up for your needs, rights, and goals.', color: 'blue', recommendedRange: '3-12', _cat: 'self-awareness' },
        { id: 'civicAction', icon: '\u270A', label: 'Civic Action & Hope', desc: 'Process hard feelings about injustice, build civic agency, and cultivate hope through action.', color: 'teal', recommendedRange: '3-12', _cat: 'stewardship' },
        { id: 'ethicalReasoning', icon: '\u2696\uFE0F', label: 'Ethical Reasoning Lab', desc: 'Explore contemporary ethical dilemmas through multiple frameworks and AI Socratic dialogue.', color: 'slate', recommendedRange: '5-12', _cat: 'responsible-decision-making' },
        { id: 'cultureExplorer', icon: '\uD83C\uDF0D', label: 'Culture Explorer', desc: 'Take AI-powered deep dives into world cultures with illustrations and audio.', color: 'cyan', recommendedRange: 'K-12', _cat: 'social-awareness' },
        { id: 'voicedetective', icon: '\uD83D\uDD0A', label: 'Voice Detective', desc: 'Listen to voices and identify emotions from tone.', color: 'purple', recommendedRange: 'K-12', _cat: 'social-awareness' },
        { id: 'sociallab', icon: '\uD83C\uDFAD', label: 'Social Skills Roleplay', desc: 'Practice social scenarios and AI peer roleplay with branching dialogue.', color: 'indigo', recommendedRange: 'K-12', _cat: 'relationship-skills' },
        { id: 'peersupport', icon: '\uD83E\uDD1D', label: 'Peer Support Coach', desc: 'Learn OARS listening skills and when to get adult help.', color: 'emerald', recommendedRange: '3-12', _cat: 'relationship-skills' },
        { id: 'conflicttheater', icon: '\uD83C\uDFAD', label: 'Conflict Theater', desc: 'Mediate a real conflict with two AI characters who have personalities, moods, and reasons of their own. Practice restorative principles in an immersive scene.', color: 'amber', recommendedRange: '5-12', _cat: 'relationship-skills' },
        { id: 'digitalWellbeing', icon: '\uD83D\uDCF1', label: 'Digital Wellbeing Studio', desc: 'Self-check your relationship with social media and AI chatbots, build healthier phone habits, recover from cyberbullying, spot manipulation in the feed, navigate chatbot relationships safely, and find help when you need it.', color: 'cyan', recommendedRange: '5-12', _cat: 'self-regulation' },
      ];
      // Insert each dynamic tool after its category header
      var _catPositions = {
        'self-awareness': '_cat_SelfAwareness',
        'self-regulation': '_cat_SelfRegulation',
        'self-direction': '_cat_SelfDirection',
        'inner-work': '_cat_InnerWork',
        'care-of-self': '_cat_CareOfSelf',
        'social-awareness': '_cat_SocialAwareness',
        'relationship-skills': '_cat_RelationshipSkills',
        'responsible-decision-making': '_cat_DecisionMaking',
        'stewardship': '_cat_Stewardship',
        // Backwards-compat: tools that still tag themselves 'self-management'
        // fall into Self-Regulation by default (the closest equivalent).
        'self-management': '_cat_SelfRegulation'
      };
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
      // ── Evidence-base convention ──
      // A per-tool honesty signal, distinct from the evidence-TRADITION
      // pill on each card (which names the framework, e.g. CASEL / DBT).
      // This one rates how strong the empirical backing actually is, so
      // the hub never implies a reflective heuristic is settled science.
      //   strong    = well-replicated empirical support
      //   emerging  = promising but limited / mixed evidence
      //   contested = popular but scientifically disputed (use as metaphor)
      //   practice  = a structured practice or heuristic, not an empirical claim
      // To tune a rating, edit the single map below. Tools absent from the
      // map show no badge. `note` (optional) surfaces the nuance on hover
      // and to screen readers. This table is meant to be reviewed as a whole.
      // ══════════════════════════════════════════════════════════════
      var _evidenceTiers = {
        strong:    { label: 'Strong evidence',     color: '#15803d', bg: '#dcfce7', title: 'Well-replicated empirical support' },
        emerging:  { label: 'Emerging evidence',   color: '#a16207', bg: '#fef9c3', title: 'Promising but limited or mixed evidence' },
        contested: { label: 'Contested model',     color: '#c2410c', bg: '#ffedd5', title: 'Popular but scientifically disputed; best used as metaphor, not mechanism' },
        practice:  { label: 'Reflective practice', color: '#475569', bg: '#f1f5f9', title: 'A structured practice or heuristic, not an empirical efficacy claim' }
      };
      var _evidenceBase = {
        // Strong: CBT / DBT / ACT skills and replicated prevention programs
        thoughtRecord: { tier: 'strong' },
        anxietyToolkit: { tier: 'strong' },
        tipp: { tier: 'strong' },
        dearMan: { tier: 'strong' },
        costBenefit: { tier: 'strong' },
        behavioralActivation: { tier: 'strong' },
        motivationalInterviewing: { tier: 'strong' },
        valuesCommittedAction: { tier: 'strong', note: 'From Acceptance and Commitment Therapy, a well-supported approach.' },
        sourcesOfStrength: { tier: 'strong', note: 'Upstream suicide-prevention program with randomized-trial support (Wyman et al.).' },
        bigFeelings: { tier: 'strong', note: "Built on Lochman's Coping Power, a well-supported anger program." },
        identitySupport: { tier: 'strong', note: 'Family and school acceptance is strongly linked to better outcomes for LGBTQ+ youth (Ryan; Trevor Project).' },
        // Emerging: real but limited or mixed evidence
        zones: { tier: 'emerging', note: 'Draws on adjacent research; the Zones curriculum itself has limited outcome studies (the tool says so in its own limitations).' },
        emotions: { tier: 'emerging', note: 'Emotional granularity has empirical support (Barrett); specific neuro explanations are framed as models.' },
        coping: { tier: 'emerging', note: 'Core CBT/DBT/somatic coping skills are well supported; the "Nervous System States" polyvagal framing is popular but scientifically contested (Grossman, 2023) and is flagged as such in the tool.' },
        mindfulness: { tier: 'emerging', note: 'Benefits are modest and context-dependent; trauma-informed cautions apply.' },
        windowOfTolerance: { tier: 'emerging', note: 'Widely used clinical heuristic (Siegel); the polyvagal framing it is often paired with is scientifically contested, which this tool flags.' },
        stressBucket: { tier: 'emerging', note: 'CBT-tradition heuristic (Brabban and Turkington), widely used in NHS IAPT.' },
        sleep: { tier: 'emerging', note: 'Sleep-health guidance is well grounded; behavior-change effects vary.' },
        sensoryRegulation: { tier: 'emerging', note: "Sensory-profile self-understanding (Dunn) is reasonable; classic 'sensory diet' / Ayres Sensory Integration efficacy claims are weakly supported." },
        substancePsychoed: { tier: 'emerging' },
        traumaPsychoed: { tier: 'emerging', note: "SAMHSA's principles are expert consensus more than trial-tested protocol." },
        bodyStory: { tier: 'emerging', note: 'Body-appreciation and intuitive-eating evidence is growing.' },
        healthyRelationships: { tier: 'emerging' },
        safety: { tier: 'emerging' },
        sfbt: { tier: 'emerging' },
        careerCompass: { tier: 'emerging', note: "Holland's RIASEC is well validated; this is a brief self-check, not the full O*NET inventory." },
        compassion: { tier: 'emerging', note: 'Self-compassion has a growing evidence base (Neff).' },
        social: { tier: 'emerging' },
        sociallab: { tier: 'emerging' },
        peersupport: { tier: 'emerging' },
        upstander: { tier: 'emerging' },
        crewProtocols: { tier: 'emerging', note: 'Restorative and Crew practices have growing but mixed evidence.' },
        restorativeCircle: { tier: 'emerging', note: 'Restorative practices have growing but mixed evidence.' },
        digitalWellbeing: { tier: 'emerging' },
        griefLoss: { tier: 'emerging', note: "Worden's tasks-of-mourning is a widely used clinical heuristic." },
        perspective: { tier: 'emerging' },
        conflict: { tier: 'emerging' },
        conflicttheater: { tier: 'emerging' },
        // (No tool is currently rated 'contested'; the tier stays reserved for
        // mechanisms that are popular but scientifically disputed.)
        growthmindset: { tier: 'emerging', note: 'Mindset interventions are popular; effects are real but small and debated (Sisk et al. 2018 meta-analysis; Yeager et al. 2019 found small, targeted effects).' },
        execfunction: { tier: 'emerging', note: 'Executive-function strategy instruction has real but modest, mixed support (Dawson & Guare; Barkley); this is a structured scaffold, not a clinical intervention.' },
        // Practice: structured practice / heuristic, not an empirical efficacy claim
        strengths: { tier: 'practice' },
        viaStrengths: { tier: 'practice', note: 'Reflective self-sort, not the validated VIA survey at viacharacter.org.' },
        wheelOfLife: { tier: 'practice', note: 'Coaching heuristic, not a validated psychometric.' },
        perma: { tier: 'practice', note: 'Reflective self-check drawn from positive psychology (Seligman).' },
        quietQuestions: { tier: 'practice' },
        orientations: { tier: 'practice' },
        careConstellations: { tier: 'practice' },
        ecomap: { tier: 'practice', note: 'Standard social-work mapping tool (Hartman), used for reflection, not assessment.' },
        circlesOfSupport: { tier: 'practice' },
        genogram: { tier: 'practice', note: 'For self-understanding only, not clinical assessment.' },
        goals: { tier: 'practice' },
        howlTracker: { tier: 'practice' },
        onePageProfile: { tier: 'practice' },
        maps: { tier: 'practice', note: 'Person-centered planning artifact.' },
        path: { tier: 'practice', note: 'Person-centered planning artifact.' },
        journal: { tier: 'practice' },
        decisions: { tier: 'practice' },
        ethicalReasoning: { tier: 'practice' },
        cultureExplorer: { tier: 'practice' },
        community: { tier: 'practice' },
        teamwork: { tier: 'practice' },
        friendship: { tier: 'practice' },
        advocacy: { tier: 'practice' },
        crisiscompanion: { tier: 'practice', note: 'Structured peer-support and crisis-coping scaffold aligned with 988 / AFSP / NEDA guidance; not a clinical assessment or treatment.' },
        civicAction: { tier: 'practice' },
        voicedetective: { tier: 'practice' },
        transitions: { tier: 'practice' },
        landPlace: { tier: 'practice' },
        disabilityVoices: { tier: 'practice' }
      };

      function _selShortDesc(tool) {
        var desc = (tool && tool.desc) ? String(tool.desc).trim() : '';
        if (!desc) return '';
        var firstSentence = desc.match(/^.{1,150}?[.!?](?:\s|$)/);
        if (firstSentence && firstSentence[0]) return firstSentence[0].trim();
        if (desc.length <= 150) return desc;
        return desc.slice(0, 147).replace(/\s+\S*$/, '') + '...';
      }

      var _selSearchAliasMap = {
        zones: 'feeling feelings emotion emotions mood mad angry sad worried nervous calm red yellow green blue dysregulated overwhelmed',
        emotions: 'feeling feelings emotion emotions mood identify name vocabulary faces sad mad worried happy',
        coping: 'calm breathe breathing grounding panic anxious anxiety worried stress overwhelmed regulate body',
        mindfulness: 'calm breathe breathing body scan mindful still focus quiet attention',
        journal: 'write writing private reflect reflection feelings diary think process',
        thoughtRecord: 'thought thoughts thinking worry anxious anxiety stuck evidence balanced reframe',
        anxietyToolkit: 'anxiety anxious worry worried panic nervous fear calm',
        sleep: 'sleep tired rest exhausted bedtime phone night stress',
        stressBucket: 'stress stressed pressure overwhelmed busy load capacity',
        tipp: 'panic crisis intense emotion emergency calm body temperature breathing',
        bigFeelings: 'anger angry mad rage upset conflict cool down',
        sensoryRegulation: 'sensory noise light texture overload neurodivergent regulation',
        friendship: 'friend friends lonely friendship peer belong',
        conflict: 'conflict fight argument repair friend apologize',
        conflicttheater: 'conflict fight argument repair friend mediation',
        restorativeCircle: 'repair conflict harm apology restore relationship',
        peersupport: 'listen listening friend help support peer adult',
        sociallab: 'social roleplay conversation practice friend peer',
        goals: 'goal goals plan motivation future',
        decisions: 'decision decide choice choices problem solve',
        ethicalReasoning: 'decision ethics right wrong dilemma values',
        valuesCommittedAction: 'values purpose decision action committed',
        advocacy: 'ask help need accommodation self advocate',
        safety: 'safe safety plan help trusted adult',
        crisiscompanion: 'crisis urgent unsafe self harm suicide help',
        griefLoss: 'grief loss death missing sad',
        digitalWellbeing: 'phone social media cyberbullying screen online chatbot'
      };

      function _selToolSearchText(tool) {
        if (!tool) return '';
        return [
          tool.label || '',
          tool.desc || '',
          tool.recommendedRange || '',
          _selSearchAliasMap[tool.id] || ''
        ].join(' ').toLowerCase();
      }

      function _selToolMatchesSearch(tool, query) {
        var q = String(query || '').toLowerCase().trim();
        if (!q) return true;
        var text = _selToolSearchText(tool);
        if (text.indexOf(q) !== -1) return true;
        var terms = q.split(/\s+/).filter(function(term) { return term.length > 1; });
        if (terms.length === 0) return true;
        var matches = 0;
        terms.forEach(function(term) {
          if (text.indexOf(term) !== -1) matches++;
        });
        return matches > 0 && matches >= Math.ceil(Math.min(terms.length, 3) / 2);
      }

      function _selGradePick() {
        var band = gradeBand(gradeLevel);
        var ids = band === 'elementary'
          ? ['zones', 'emotions', 'coping', 'friendship']
          : band === 'middle'
            ? ['coping', 'journal', 'perspective', 'goals']
            : ['thoughtRecord', 'valuesCommittedAction', 'advocacy', 'sleep'];
        for (var i = 0; i < ids.length; i++) {
          var found = _allSelTools.find(function(t) { return t.id === ids[i] && !t.category; });
          if (found) return found;
        }
        return _allSelTools.find(function(t) { return t && !t.category; }) || null;
      }

      function _selToolById(toolId) {
        if (!toolId) return null;
        return _allSelTools.find(function(t) { return t.id === toolId && !t.category; }) || null;
      }

      function _teacherToolCue(toolId) {
        return (SEL_TEACHER_TOOL_META && SEL_TEACHER_TOOL_META[toolId]) || null;
      }

      function _teacherPlanCatalogTools(plan) {
        if (!plan || !Array.isArray(plan.tools)) return [];
        return plan.tools.filter(function(toolId) {
          return !!_selToolById(toolId);
        });
      }

      function _teacherPlanToolLabels(plan) {
        return _teacherPlanCatalogTools(plan).map(function(toolId) {
          var tool = _selToolById(toolId);
          return tool ? tool.label : toolId;
        });
      }

      function _teacherPlanPendingLabels(plan) {
        return _teacherPlanCatalogTools(plan).filter(function(toolId) {
          return !(window.SelHub && window.SelHub.isRegistered(toolId));
        }).map(function(toolId) {
          var tool = _selToolById(toolId);
          return tool ? tool.label : toolId;
        });
      }

      function _teacherPlanSensitiveLabels(plan) {
        return _teacherPlanCatalogTools(plan).filter(function(toolId) {
          var cue = _teacherToolCue(toolId);
          return cue && cue.sensitive;
        }).map(function(toolId) {
          var tool = _selToolById(toolId);
          return tool ? tool.label : toolId;
        });
      }

      function _teacherPlanBuilderNote(plan) {
        var parts = [];
        if (plan && plan.studentView) parts.push('Student view: ' + plan.studentView);
        if (plan && plan.teacherMove) parts.push('Teacher move: ' + plan.teacherMove);
        if (plan && plan.privacyBoundary) parts.push('Sharing boundary: ' + plan.privacyBoundary);
        if (plan && plan.note) parts.push('Teacher note: ' + plan.note);
        return parts.join('\n');
      }

      function _teacherPlanQuests(plan, selectedToolIds) {
        return (plan && Array.isArray(plan.quests) ? plan.quests : []).map(function(q) {
          var copy = Object.assign({}, q, { params: Object.assign({}, q.params || {}) });
          if (copy.toolRef === 'first') copy.toolId = selectedToolIds[0] || null;
          if (copy.toolRef === 'last') copy.toolId = selectedToolIds[selectedToolIds.length - 1] || null;
          delete copy.toolRef;
          return copy;
        });
      }

      function _applyTeacherLaunchPlan(plan) {
        var selectedToolIds = _teacherPlanCatalogTools(plan);
        var pendingLabels = _teacherPlanPendingLabels(plan);
        if (selectedToolIds.length === 0 || pendingLabels.length) {
          if (typeof addToast === 'function') addToast('Teacher launch tools are still loading. Try again in a moment.', 'info');
          announceToSR('Teacher launch tools are still loading.');
          return;
        }
        var nextTools = {};
        selectedToolIds.forEach(function(toolId) { nextTools[toolId] = true; });
        setBuilderName(plan.name || 'SEL classroom routine');
        setBuilderNote(_teacherPlanBuilderNote(plan));
        setBuilderTools(nextTools);
        setBuilderQuests(_teacherPlanQuests(plan, selectedToolIds));
        setBuilderOpen(true);
        setActivePathway(null);
        setActiveStationId(null);
        setSelCategoryFilter(null);
        setSelToolSearch('');
        announceToSR('Teacher launch plan loaded into the station builder: ' + (plan.name || 'SEL routine'));
        if (typeof addToast === 'function') addToast('Teacher launch plan loaded into Station Builder.', 'success');
        alloFocusStationNameInput();
      }

      function _selRelativeTime(ts) {
        var n = Number(ts || 0);
        if (!n) return '';
        var diff = Math.max(0, Date.now() - n);
        var mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + ' min ago';
        var hours = Math.floor(mins / 60);
        if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
        var days = Math.floor(hours / 24);
        if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago');
        try { return new Date(n).toLocaleDateString(); } catch (e) { return ''; }
      }

      function _selRecentWorkItems() {
        var items = [];
        (Array.isArray(selSnapshots) ? selSnapshots : []).forEach(function(snap) {
          if (!snap) return;
          var toolId = snap.tool || snap.toolId;
          var tool = _selToolById(toolId);
          items.push({
            key: 'snap-' + (snap.id || toolId || items.length),
            kind: 'Saved',
            toolId: toolId,
            icon: tool ? tool.icon : '\uD83D\uDCBE',
            title: snap.label || (tool ? tool.label : 'Saved SEL work'),
            detail: tool ? tool.label : 'SEL snapshot',
            ts: snap.ts || snap.timestamp || 0
          });
        });
        Object.keys(selToolUsage || {}).forEach(function(toolId) {
          var usage = selToolUsage[toolId] || {};
          var tool = _selToolById(toolId);
          if (!tool || !usage.lastUsed) return;
          items.push({
            key: 'use-' + toolId,
            kind: 'Opened',
            toolId: toolId,
            icon: tool.icon,
            title: tool.label,
            detail: (usage.count || 1) + ((usage.count || 1) === 1 ? ' visit' : ' visits'),
            ts: usage.lastUsed || 0
          });
        });
        items.sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); });
        var seen = {};
        var out = [];
        items.forEach(function(item) {
          var dedupeKey = item.kind + ':' + (item.toolId || item.title);
          if (seen[dedupeKey] || out.length >= 4) return;
          seen[dedupeKey] = true;
          out.push(item);
        });
        return out;
      }

      // ══════════════════════════════════════════════════════════════
      // ── RENDER ──
      // ══════════════════════════════════════════════════════════════
      function _selPacketPrivacyChoices() {
        return [
          { id: 'summary', label: 'Share summary only' },
          { id: 'full', label: 'Share full saved text' },
          { id: 'followup', label: 'Ask adult to follow up' },
          { id: 'private', label: 'Keep private' }
        ];
      }

      function _selPacketPrivacyLabel(mode) {
        var match = _selPacketPrivacyChoices().filter(function(choice) { return choice.id === mode; })[0];
        return match ? match.label : 'Share summary only';
      }

      function _selPacketEscape(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
          return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
      }

      function _selPacketTextFromValue(value, depth) {
        if (value == null || depth > 3) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (Array.isArray(value)) {
          return value.map(function(part) { return _selPacketTextFromValue(part, depth + 1); }).filter(Boolean).join(' ');
        }
        if (typeof value === 'object') {
          var preferred = ['reflection', 'response', 'summary', 'text', 'entry', 'note', 'body', 'plan', 'strategy', 'goal', 'name'];
          var best = '';
          preferred.forEach(function(key) {
            if (value[key] !== undefined) {
              var text = _selPacketTextFromValue(value[key], depth + 1);
              if (text && text.length > best.length) best = text;
            }
          });
          if (best) return best;
          Object.keys(value).forEach(function(key) {
            if (/^(id|ts|timestamp|createdAt|updatedAt|tool|toolId|icon)$/i.test(key)) return;
            var text = _selPacketTextFromValue(value[key], depth + 1);
            if (text && text.length > best.length) best = text;
          });
          return best;
        }
        return '';
      }

      function _selPacketCleanText(value, maxLen) {
        var text = String(value || '').replace(/\s+/g, ' ').trim();
        if (!text) return '';
        if (maxLen && text.length > maxLen) return text.slice(0, maxLen - 1).trim() + '...';
        return text;
      }

      function _selCheckpointSavePolicy(toolId) {
        var tool = _selToolById(toolId);
        return {
          checkpointLabel: 'Private checkpoint',
          confirmation: 'Checkpoint saved privately.',
          privacy: 'student-controlled',
          privacyLabel: 'Private on this device',
          sharePacketEligible: true,
          sharePacketLabel: 'Share Packet eligible',
          sharePacketDefaultPrivacy: 'summary',
          sharePacketPrivacyLabel: 'Defaults to summary only',
          sharePacketHint: 'It can appear in a Share Packet only if the student chooses it.',
          sourceLabel: tool ? tool.label : 'SEL Hub'
        };
      }

      function _normalizeSelCheckpoint(toolId, label, data, options) {
        options = options || {};
        if (toolId && typeof toolId === 'object') {
          options = toolId;
          toolId = options.toolId || options.tool || selHubTool || 'sel';
          label = options.label || options.title;
          data = options.data || options.value || options.snapshot || {};
        }
        toolId = toolId || selHubTool || 'sel';
        var tool = _selToolById(toolId);
        var ts = options.ts || Date.now();
        var policy = _selCheckpointSavePolicy(toolId);
        var eligible = options.sharePacketEligible === false ? false : policy.sharePacketEligible;
        return {
          id: options.id || (toolId + '-' + ts),
          type: 'sel-checkpoint',
          kind: 'sel-checkpoint',
          source: 'sel_hub',
          sourceLabel: 'SEL Hub',
          tool: toolId,
          toolId: toolId,
          toolLabel: options.toolLabel || (tool ? tool.label : policy.sourceLabel),
          label: label || options.title || (tool ? tool.label + ' checkpoint' : 'SEL checkpoint'),
          title: label || options.title || (tool ? tool.label + ' checkpoint' : 'SEL checkpoint'),
          data: data || {},
          ts: ts,
          createdAt: new Date(ts).toISOString(),
          privacy: options.privacy || policy.privacy,
          privacyLabel: options.privacyLabel || policy.privacyLabel,
          saveConfirmation: options.confirmation || policy.confirmation,
          sharePacketEligible: eligible,
          sharePacketLabel: eligible ? policy.sharePacketLabel : 'Not included in Share Packets',
          sharePacketDefaultPrivacy: options.sharePacketDefaultPrivacy || policy.sharePacketDefaultPrivacy,
          sharePacketPrivacyLabel: options.sharePacketPrivacyLabel || policy.sharePacketPrivacyLabel,
          sharePacketHint: options.sharePacketHint || policy.sharePacketHint
        };
      }

      function _saveSelCheckpoint(toolId, label, data, options) {
        var checkpoint = _normalizeSelCheckpoint(toolId, label, data, options);
        setSelSnapshots(function(prev) {
          var next = (prev || []).concat([checkpoint]);
          next.sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); });
          return next.slice(0, 30);
        });
        if (typeof addToast === 'function') addToast(checkpoint.saveConfirmation + ' You choose later if it joins a Share Packet.', 'success');
        if (announceToSR) announceToSR(checkpoint.saveConfirmation + ' It remains private unless selected for a Share Packet.');
        return checkpoint;
      }

      function _selArtifactPacket(artifact) {
        if (!artifact || typeof artifact !== 'object') return {};
        if (artifact.artifact && typeof artifact.artifact === 'object') return artifact.artifact;
        if (artifact.packet && typeof artifact.packet === 'object') return artifact.packet;
        if (artifact.data && typeof artifact.data === 'object') return artifact.data;
        return artifact;
      }

      function _selSavedSharePacketArtifacts() {
        return (Array.isArray(studentArtifacts) ? studentArtifacts : []).filter(function(artifact) {
          if (!artifact || typeof artifact !== 'object') return false;
          var packet = _selArtifactPacket(artifact);
          return artifact.type === 'sel-share-packet'
            || packet.type === 'sel-share-packet'
            || artifact.kindLabel === 'SEL Share Packet'
            || packet.kindLabel === 'SEL Share Packet';
        }).sort(function(a, b) {
          return Date.parse((b && (b.updatedAt || b.createdAt)) || (_selArtifactPacket(b).updatedAt || _selArtifactPacket(b).createdAt) || 0)
            - Date.parse((a && (a.updatedAt || a.createdAt)) || (_selArtifactPacket(a).updatedAt || _selArtifactPacket(a).createdAt) || 0);
        });
      }

      function _selActiveSharePacketArtifact() {
        if (!activeSharePacketArtifactId) return null;
        var saved = _selSavedSharePacketArtifacts();
        for (var i = 0; i < saved.length; i++) {
          var packet = _selArtifactPacket(saved[i]);
          if (saved[i].id === activeSharePacketArtifactId || packet.id === activeSharePacketArtifactId) return saved[i];
        }
        return null;
      }

      function _selSharePacketItems() {
        var items = (Array.isArray(selSnapshots) ? selSnapshots : []).map(function(snap, idx) {
          if (!snap) return null;
          if (snap.sharePacketEligible === false) return null;
          var toolId = snap.tool || snap.toolId;
          var tool = _selToolById(toolId);
          var title = snap.label || (tool ? tool.label : 'Saved SEL work');
          var text = _selPacketCleanText(_selPacketTextFromValue(snap.data || snap, 0), 1800);
          return {
            id: String(snap.id || ('sel-snapshot-' + (snap.ts || snap.timestamp || idx))),
            raw: snap,
            toolId: toolId,
            toolLabel: tool ? tool.label : 'SEL Hub',
            icon: tool ? tool.icon : '\uD83D\uDCBE',
            title: title,
            text: text,
            summary: text ? _selPacketCleanText(text, 220) : ('Saved checkpoint from ' + (tool ? tool.label : 'SEL Hub') + '.'),
            ts: snap.ts || snap.timestamp || 0,
            privacyLabel: snap.privacyLabel || 'Private on this device',
            sharePacketLabel: snap.sharePacketLabel || 'Share Packet eligible',
            sharePacketDefaultPrivacy: snap.sharePacketDefaultPrivacy || 'summary',
            sharePacketPrivacyLabel: snap.sharePacketPrivacyLabel || 'Defaults to summary only',
            sharePacketHint: snap.sharePacketHint || 'It can appear in a Share Packet only if the student chooses it.'
          };
        }).filter(Boolean);
        var seen = {};
        items.forEach(function(item) { seen[item.id] = true; });
        var activeArtifact = _selActiveSharePacketArtifact();
        var activePacket = activeArtifact ? _selArtifactPacket(activeArtifact) : null;
        if (activePacket && Array.isArray(activePacket.items)) {
          activePacket.items.forEach(function(savedItem, idx) {
            if (!savedItem) return;
            var savedId = String(savedItem.id || ('saved-packet-item-' + idx));
            if (seen[savedId]) return;
            var savedText = _selPacketCleanText(savedItem.text || savedItem.summary || '', 1800);
            items.push({
              id: savedId,
              raw: savedItem,
              toolId: savedItem.toolId || null,
              toolLabel: savedItem.toolLabel || 'SEL Hub',
              icon: '\uD83D\uDCC4',
              title: savedItem.title || 'Saved packet item',
              text: savedText,
              summary: savedItem.summary || _selPacketCleanText(savedText, 220) || 'Saved in the previous packet.',
              ts: Date.parse(savedItem.savedAt || activePacket.updatedAt || activePacket.createdAt || 0) || 0,
              fromSavedPacket: true
            });
            seen[savedId] = true;
          });
        }
        return items.sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); });
      }

      function _buildSelSharePacket(ts, baseArtifact) {
        var packetTs = ts || Date.now();
        var basePacket = baseArtifact ? _selArtifactPacket(baseArtifact) : null;
        var createdAt = (baseArtifact && baseArtifact.createdAt) || (basePacket && basePacket.createdAt) || new Date(packetTs).toISOString();
        var updatedAt = new Date(packetTs).toISOString();
        var selected = _selSharePacketItems().filter(function(item) {
          return !!(packetSelections && packetSelections[item.id]);
        });
        var items = selected.map(function(item) {
          var privacy = (packetSelections && packetSelections[item.id]) || 'summary';
          var shared = {
            id: item.id,
            title: item.title,
            toolId: item.toolId || null,
            toolLabel: item.toolLabel,
            privacy: privacy,
            privacyLabel: _selPacketPrivacyLabel(privacy),
            savedAt: item.ts ? new Date(item.ts).toISOString() : null
          };
          if (privacy === 'full') {
            shared.text = item.text || item.summary;
          } else if (privacy === 'followup') {
            shared.summary = item.summary;
            shared.followUpRequested = true;
          } else if (privacy === 'private') {
            shared.summary = 'Kept private by student choice.';
          } else {
            shared.summary = item.summary;
          }
          return shared;
        });
        return {
          id: (baseArtifact && baseArtifact.id) || (basePacket && basePacket.id) || ('sel-share-packet-' + String(packetTs)),
          type: 'sel-share-packet',
          source: 'sel_hub',
          sourceLabel: 'SEL Hub',
          kindLabel: 'SEL Share Packet',
          title: (basePacket && basePacket.title) || 'SEL Share Packet',
          summary: 'Student-controlled SEL packet with ' + items.length + (items.length === 1 ? ' selected checkpoint' : ' selected checkpoints'),
          privacy: 'student-controlled',
          privacySummary: 'Student-controlled. Only selected checkpoint details appear in AlloHaven.',
          sourceSummary: 'Saved from SEL Hub Share Packet',
          audience: 'student-selected',
          sharingModel: 'item-level-privacy',
          exportKinds: ['text', 'print', 'allohaven'],
          createdAt: createdAt,
          updatedAt: updatedAt,
          itemCount: items.length,
          lifecycleStatus: baseArtifact ? 'revised' : 'saved',
          items: items
        };
      }

      function _selPacketPlainText(packet) {
        var lines = [
          packet.title || 'SEL Share Packet',
          'Created: ' + (packet.createdAt ? new Date(packet.createdAt).toLocaleString() : new Date().toLocaleString()),
          'Privacy: student-selected',
          ''
        ];
        (packet.items || []).forEach(function(item, idx) {
          lines.push(String(idx + 1) + '. ' + (item.title || 'SEL checkpoint'));
          lines.push('Tool: ' + (item.toolLabel || 'SEL Hub'));
          lines.push('Sharing choice: ' + (item.privacyLabel || _selPacketPrivacyLabel(item.privacy)));
          if (item.followUpRequested) lines.push('Follow-up requested.');
          lines.push(item.text || item.summary || 'No reflection text shared.');
          lines.push('');
        });
        return lines.join('\n');
      }

      function _downloadSelSharePacket() {
        var packet = _buildSelSharePacket(Date.now());
        if (!packet.items.length) {
          setPacketSavedNotice('Choose at least one saved checkpoint first.');
          return;
        }
        try {
          var blob = new Blob([_selPacketPlainText(packet)], { type: 'text/plain;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'sel-share-packet.txt';
          document.body.appendChild(a);
          a.click();
          setTimeout(function() {
            try { document.body.removeChild(a); } catch (e) {}
            try { URL.revokeObjectURL(url); } catch (e2) {}
          }, 0);
          setPacketSavedNotice('Downloaded a text copy of this packet.');
        } catch (e) {
          setPacketSavedNotice('Download was not available in this browser.');
        }
      }

      function _printSelSharePacket() {
        var packet = _buildSelSharePacket(Date.now());
        if (!packet.items.length) {
          setPacketSavedNotice('Choose at least one saved checkpoint first.');
          return;
        }
        var body = (packet.items || []).map(function(item, idx) {
          var sharedText = item.text || item.summary || 'No reflection text shared.';
          return '<section style="border:1px solid #cbd5e1;border-radius:10px;padding:14px;margin:0 0 12px;">'
            + '<h2 style="font-size:16px;margin:0 0 4px;">' + (idx + 1) + '. ' + _selPacketEscape(item.title || 'SEL checkpoint') + '</h2>'
            + '<p style="margin:0 0 8px;color:#475569;font-size:12px;">' + _selPacketEscape(item.toolLabel || 'SEL Hub') + ' | ' + _selPacketEscape(item.privacyLabel || _selPacketPrivacyLabel(item.privacy)) + '</p>'
            + (item.followUpRequested ? '<p style="font-weight:700;color:#92400e;">Follow-up requested.</p>' : '')
            + '<p style="white-space:pre-wrap;line-height:1.55;margin:0;">' + _selPacketEscape(sharedText) + '</p>'
            + '</section>';
        }).join('');
        var html = '<!doctype html><html><head><meta charset="utf-8"><title>SEL Share Packet</title></head>'
          + '<body style="font-family:Arial,sans-serif;color:#0f172a;margin:28px;">'
          + '<h1 style="margin:0 0 4px;">SEL Share Packet</h1>'
          + '<p style="margin:0 0 16px;color:#475569;">Student-selected sharing choices. Created ' + _selPacketEscape(new Date(packet.createdAt).toLocaleString()) + '.</p>'
          + body
          + '<script>window.onload=function(){setTimeout(function(){window.print();},80);};<\/script>'
          + '</body></html>';
        var win = null;
        try { win = window.open('', '_blank'); } catch (e) {}
        if (!win) {
          setPacketSavedNotice('Print was blocked by the browser. Try Download text instead.');
          return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
      }

      function _saveSelSharePacketToPortfolio(replaceExisting) {
        var ts = Date.now();
        var existingArtifact = replaceExisting ? _selActiveSharePacketArtifact() : null;
        var packet = _buildSelSharePacket(ts, existingArtifact);
        if (!packet.items.length) {
          setPacketSavedNotice('Choose at least one saved checkpoint first.');
          return;
        }
        var previousVersion = existingArtifact ? Number(existingArtifact.version || _selArtifactPacket(existingArtifact).version || 1) : 0;
        var artifact = {
          id: packet.id,
          type: 'sel-share-packet',
          source: 'sel_hub',
          sourceLabel: 'SEL Hub',
          kindLabel: 'SEL Share Packet',
          title: packet.title,
          summary: packet.summary,
          privacy: packet.privacy,
          privacySummary: packet.privacySummary,
          sourceSummary: packet.sourceSummary,
          audience: packet.audience,
          sharingModel: packet.sharingModel,
          exportKinds: packet.exportKinds,
          createdAt: packet.createdAt,
          updatedAt: packet.updatedAt,
          lifecycleStatus: packet.lifecycleStatus,
          version: existingArtifact ? previousVersion + 1 : 1,
          itemCount: packet.itemCount,
          artifact: packet
        };
        setStudentArtifacts(function(prev) {
          var artifactStore = window.AlloModules && window.AlloModules.StudentArtifactStore;
          if (artifactStore && typeof artifactStore.save === 'function') {
            return artifactStore.save(artifact, { source: 'sel_hub', replaceExisting: !!existingArtifact, limit: 80 });
          }
          var existingMatched = false;
          var next = Array.isArray(prev) ? prev.slice() : [];
          if (existingArtifact) {
            next = next.map(function(candidate) {
              var candidatePacket = _selArtifactPacket(candidate);
              if (candidate && (candidate.id === artifact.id || candidatePacket.id === artifact.id)) {
                existingMatched = true;
                return artifact;
              }
              return candidate;
            });
          }
          if (!existingMatched) next = [artifact].concat(next);
          next.sort(function(a, b) {
            return Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0);
          });
          next = next.slice(0, 80);
          try {
            window.__alloflowStudentArtifacts = next;
            localStorage.setItem('alloflow_student_artifacts', JSON.stringify(next));
            window.dispatchEvent(new CustomEvent('alloflow-student-artifacts-changed', { detail: { source: 'sel_hub' } }));
          } catch (e) {}
          return next;
        });
        setActiveSharePacketArtifactId(artifact.id);
        var receipt = existingArtifact
          ? 'Updated existing student-controlled SEL Hub packet in AlloHaven Portfolio.'
          : 'Saved new student-controlled SEL Hub packet to AlloHaven Portfolio.';
        setPacketSavedNotice(receipt + ' Open AlloHaven > Portfolio to view it.');
        if (typeof addToast === 'function') addToast(receipt, 'success');
        if (announceToSR) announceToSR(receipt);
      }

      function _startNewSelSharePacketDraft() {
        var packetItems = _selSharePacketItems().filter(function(item) { return !item.fromSavedPacket; });
        var nextSelections = {};
        packetItems.slice(0, Math.min(4, packetItems.length)).forEach(function(item) {
          nextSelections[item.id] = item.sharePacketDefaultPrivacy || 'summary';
        });
        setActiveSharePacketArtifactId(null);
        setPacketSelections(nextSelections);
        setPacketSavedNotice('');
      }

      function _loadSelSharePacketDraft(artifact) {
        var packet = _selArtifactPacket(artifact);
        var nextSelections = {};
        (Array.isArray(packet.items) ? packet.items : []).forEach(function(item) {
          if (!item) return;
          nextSelections[String(item.id || item.title || Object.keys(nextSelections).length)] = item.privacy || 'summary';
        });
        setActiveSharePacketArtifactId((artifact && artifact.id) || packet.id || null);
        setPacketSelections(nextSelections);
        setPacketSavedNotice('Loaded saved packet as a draft. Review choices before updating or saving a new copy.');
        if (announceToSR) announceToSR('Saved SEL Share Packet loaded as draft.');
      }

      function _openSelSharePacketBuilder() {
        _startNewSelSharePacketDraft();
        alloSaveFocus();
        setShowSharePacket(true);
        if (announceToSR) announceToSR('Create SEL Share Packet opened.');
      }

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
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: isCompact ? 'wrap' : 'nowrap', padding: isCompact ? '12px 12px' : '16px 20px', borderBottom: '1px solid ' + _t.border, background: _t.headerBg }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: isCompact ? 8 : 12, minWidth: 0 } },
          selHubTool && h('button', {
            onClick: function() { var fromTool = selHubTool; setSelHubTool(null); announceToSR('Returned to tool grid'); alloFocusToolCard(fromTool); },
            'aria-label': 'Back to tools',
            style: { background: 'none', border: 'none', color: _t.headerText, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }
          }, ArrowLeft ? h(ArrowLeft, { size: 20 }) : '\u2190'),
          h('h2', { style: { margin: 0, fontSize: isCompact ? 18 : 20, fontWeight: 800, color: _t.headerText, whiteSpace: 'nowrap' } },
            '\u2764\uFE0F\u200D\uD83D\uDD25 SEL Hub'
          ),
          h('span', {
            style: { display: isCompact ? 'none' : 'inline', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginLeft: 8 }
          }, gradeBand(gradeLevel) === 'elementary' ? 'Elementary' : gradeBand(gradeLevel) === 'middle' ? 'Middle School' : 'High School')
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: isCompact ? 6 : 8, position: 'relative', flexWrap: 'wrap', justifyContent: isCompact ? 'flex-end' : 'flex-start', marginLeft: 'auto' } },
          // CHANGE 2: Unsaved-changes badge \u2014 dot only when dirty
          isDirty && h('div', { style: { position: 'relative' } },
            h('button', {
              onClick: function() { setShowDirtyTooltip(function(v) { return !v; }); },
              'aria-label': 'You have unsaved changes',
              title: 'Unsaved changes',
              style: { background: 'rgba(239, 68, 68, 0.18)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fecaca', cursor: 'pointer', padding: isCompact ? '4px 8px' : '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }
            },
              h('span', { 'aria-hidden': 'true', style: { width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' } }),
              h('span', null, 'Unsaved')
            ),
            showDirtyTooltip && h('div', {
              role: 'tooltip',
              style: { position: 'absolute', top: '110%', right: 0, marginTop: 6, background: '#0f172a', color: '#f1f5f9', border: '1px solid #475569', borderRadius: 8, padding: 12, fontSize: 12, width: isCompact ? 220 : 260, zIndex: 10000, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }
            },
              h('div', { style: { marginBottom: 8 } }, 'You have unsaved changes \u2014 tap Export now to save them'),
              h('button', {
                onClick: function() {
                  setShowDirtyTooltip(false);
                  // Prefer parent-supplied export handler; otherwise dispatch
                  // a window event that the host app can listen for.
                  if (typeof props.onExportRequested === 'function') {
                    try { props.onExportRequested(); } catch (e) {}
                  } else {
                    try { window.dispatchEvent(new CustomEvent('alloflow-sel-export-requested')); } catch (e) {}
                  }
                  // Optimistically clear dirty (host will confirm with
                  // alloflow-sel-exported if/when the file actually writes).
                  if (typeof addToast === 'function') addToast('Exporting your work\u2026', 'info');
                },
                style: { padding: '6px 12px', borderRadius: 8, border: 'none', background: _t.accent, color: _t.accentText, fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }
              }, '\uD83D\uDCBE Export now')
            )
          ),
          // CHANGE 3: For-Educators link
          h('button', {
            onClick: function() { alloSaveFocus(); setShowForEducators(true); announceToSR('For Educators guide opened'); },
            'aria-label': 'For Educators: how to use this Hub responsibly',
            title: 'For Educators',
            style: { background: 'rgba(255,255,255,0.12)', border: 'none', color: _t.headerText, cursor: 'pointer', padding: isCompact ? '6px 8px' : '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, minHeight: isCompact ? 36 : 'auto' }
          }, '\uD83C\uDF93 ', h('span', { style: { display: isCompact ? 'none' : 'inline' } }, 'For Educators')),
          // Theme toggle button
          h('button', {
            onClick: function() { if (typeof window.AlloToggleTheme === 'function') { window.AlloToggleTheme(); setTimeout(function() { setSelToolData(function(p) { return Object.assign({}, p); }); }, 50); } },
            'aria-label': 'Toggle theme (light / dark / high contrast)',
            title: isContrast ? 'High Contrast' : isDark ? 'Dark Mode' : 'Light Mode',
            style: { background: 'rgba(255,255,255,0.12)', border: 'none', color: _t.headerText, cursor: 'pointer', padding: isCompact ? '6px 8px' : '4px 10px', borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, minHeight: isCompact ? 36 : 'auto' }
          }, isContrast ? '\uD83D\uDC41' : isDark ? '\uD83C\uDF19' : '\u2600\uFE0F', h('span', { style: { display: isCompact ? 'none' : 'inline', fontSize: 10, fontWeight: 700 } }, isContrast ? 'Hi-Con' : isDark ? 'Dark' : 'Light')),
          // XP badge (fixed: removed bogus role=button from display-only element)
          h('div', {
            'aria-label': selXp + ' SEL experience points',
            style: { background: _t.accent, color: _t.accentText, borderRadius: 20, padding: isCompact ? '6px 10px' : '4px 14px', fontSize: 12, fontWeight: 700, minHeight: isCompact ? 24 : 'auto' }
          }, '\u2728 ' + selXp + ' XP'),
          // Close button
          h('button', {
            onClick: function() { setShowSelHub(false); },
            'aria-label': 'Close SEL Hub',
            style: { background: 'none', border: 'none', color: _t.headerText, cursor: 'pointer', padding: 4 }
          }, X ? h(X, { size: 20 }) : '\u2715')
        )
      );

      // \u2500\u2500 CHANGE 1: Ephemerality explainer modal \u2500\u2500
      var ephemeralExplainerModal = showEphemeralExplainer && h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'sel-ephemeral-title',
        id: 'sel-ephemeral-explainer-modal',
        style: { position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
      },
        h('div', {
          style: { background: _t.bgCard, color: _t.text, borderRadius: 14, border: '1px solid ' + _t.border, maxWidth: 480, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }
        },
          h('div', { 'aria-hidden': 'true', style: { fontSize: 36, marginBottom: 12, textAlign: 'center' } }, '\uD83D\uDCBE'),
          h('h2', { id: 'sel-ephemeral-title', style: { margin: 0, fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 12 } }, 'Your work is not auto-saved'),
          h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.55, marginBottom: 20, textAlign: 'center' } },
            'Close this tab and your work is gone unless you Export. Export saves a file to your computer. Re-open it later with Import. Tap Got it to start.'
          ),
          h('div', { style: { display: 'flex', justifyContent: 'center' } },
            h('button', {
              'data-primary-action': 'true',
              onClick: function() {
                setShowEphemeralExplainer(false);
                try { sessionStorage.setItem('alloflow_sel_seen_ephemeral_explainer', '1'); } catch (e) {}
                // Reset the activity timer so the 20-min re-prompt
                // measures from this dismissal.
                _lastActivityRef.current = Date.now();
                _lastExportRef.current = Date.now();
                alloRestoreOrFocusSelHubStart();
              },
              'aria-label': 'Got it, start using the SEL Hub',
              style: { padding: '10px 28px', minHeight: 44, borderRadius: 10, border: 'none', background: _t.accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
            }, 'Got it')
          )
        )
      );

      // \u2500\u2500 CHANGE 3: For-Educators modal \u2500\u2500
      // SEL-PRIV-7: right-to-delete affordance — permanently clear all SEL data
      // (journal entries, reflections, safety plan, streak, stations, progress)
      // from this device. FERPA-positive; destructive, so confirm-gated.
      var clearAllSelData = function() {
        setShowClearSelConfirm(false);
        // Remove every SEL-namespaced localStorage key (hub keys, legacy per-tool
        // keys, and per-session crisiscompanion namespaced keys) via a scan so no
        // variant is missed.
        try {
          var toRemove = [];
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && /^(alloflow_sel_|alloSel|crisisCompanion\.)/.test(k)) toRemove.push(k);
          }
          toRemove.forEach(function(k) { try { localStorage.removeItem(k); } catch (e) {} });
        } catch (e) {}
        // Reset in-memory hub state.
        try { setSelToolData({}); } catch (e) {}
        try { setSavedStations([]); } catch (e) {}
        try { setQuestProgress({}); } catch (e) {}
        try { setSelStreak({ count: 0, longest: 0, lastDate: null }); } catch (e) {}
        try { setSelToolUsage({}); } catch (e) {}
        try { setSelXp(0); } catch (e) {}
        try { setSelSnapshots([]); } catch (e) {}
        try {
          setStudentArtifacts(function(prev) {
            return (Array.isArray(prev) ? prev : []).filter(function(a) {
              return !(a && a.source === 'sel_hub');
            });
          });
        } catch (e) {}
        // Clear the window mirror slots so a subsequent host project-save does not
        // re-serialize the deleted data back into the file.
        try {
          if (typeof window !== 'undefined') {
            var keptArtifacts = (Array.isArray(window.__alloflowStudentArtifacts) ? window.__alloflowStudentArtifacts : []).filter(function(a) {
              return !(a && a.source === 'sel_hub');
            });
            window.__alloflowSelToolData = {};
            window.__alloflowSelEngagement = null;
            window.__alloflowSelStations = null;
            window.__alloflowSelProgress = null;
            window.__alloflowSelSnapshots = [];
            window.__alloflowStudentArtifacts = keptArtifacts;
            try { localStorage.setItem('alloflow_student_artifacts', JSON.stringify(keptArtifacts)); } catch (e2) {}
            try { window.dispatchEvent(new CustomEvent('alloflow-student-artifacts-changed', { detail: { source: 'sel_hub-clear' } })); } catch (e3) {}
          }
        } catch (e) {}
        setShowForEducators(false);
        alloRestoreOrFocusSelHubStart();
        if (typeof addToast === 'function') addToast('Your SEL data has been cleared from this device.', 'success');
        if (announceToSR) announceToSR('Your SEL data has been cleared from this device.');
      };
      var clearSelDataConfirmModal = showClearSelConfirm && h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'sel-clear-data-confirm-title',
        'aria-describedby': 'sel-clear-data-confirm-description',
        id: 'sel-clear-data-confirm-modal',
        style: { position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
      },
        h('div', { style: { background: _t.bgCard, color: _t.text, borderRadius: 14, border: '1px solid ' + _t.border, maxWidth: 520, width: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.45)' } },
          h('h2', { id: 'sel-clear-data-confirm-title', style: { margin: '0 0 10px', fontSize: 18, fontWeight: 900 } }, 'Permanently clear all SEL data?'),
          h('p', { id: 'sel-clear-data-confirm-description', style: { margin: '0 0 18px', color: _t.textMuted, fontSize: 13, lineHeight: 1.6 } }, 'This deletes journal entries, reflections, your safety plan, streak, stations, and progress from this device. This cannot be undone.'),
          h('div', { style: { display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 } },
            h('button', {
              'data-primary-action': 'true',
              onClick: closeClearSelConfirm,
              style: { minHeight: 44, padding: '9px 16px', borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgSoft, color: _t.text, fontSize: 13, fontWeight: 700, cursor: 'pointer' }
            }, 'Cancel'),
            h('button', {
              onClick: clearAllSelData,
              style: { minHeight: 44, padding: '9px 16px', borderRadius: 8, border: '1px solid ' + _t.dangerText, background: isContrast ? '#000000' : 'rgba(220,38,38,0.12)', color: _t.dangerText, fontSize: 13, fontWeight: 800, cursor: 'pointer' }
            }, 'Permanently delete all SEL data')
          )
        )
      );
      var forEducatorsModal = showForEducators && !showClearSelConfirm && h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'sel-for-educators-title',
        id: 'sel-for-educators-modal',
        style: { position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
      },
        h('div', {
          style: { background: _t.bgCard, color: _t.text, borderRadius: 14, border: '1px solid ' + _t.border, maxWidth: 760, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid ' + _t.border } },
            h('h2', { id: 'sel-for-educators-title', style: { margin: 0, fontSize: 16, fontWeight: 800 } }, '\uD83C\uDF93 For Educators'),
            h('button', {
              'data-primary-action': 'true',
              onClick: function() { setShowForEducators(false); alloRestoreOrFocusSelHubStart(); },
              'aria-label': 'Close For Educators guide',
              style: { background: 'none', border: 'none', color: _t.text, cursor: 'pointer', fontSize: 18, padding: 4 }
            }, '\u2715')
          ),
          h('div', { style: { flex: 1, overflow: 'auto', padding: '16px 24px', fontSize: 13, color: _t.text } },
            h('div', { style: { marginBottom: 16, padding: 12, borderRadius: 10, border: '1px solid ' + _t.border, background: _t.bgSoft } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 14, fontWeight: 900, color: _t.text } }, 'Classroom launch frame'),
              h('div', { style: { display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 } },
                [
                  { label: 'Before', body: 'Confirm parent notice, opt-out path, and crisis-response contact.' },
                  { label: 'During', body: 'Keep sharing optional. Frame tools as practice, not assessment.' },
                  { label: 'After', body: 'Save only when students choose to export or hand you a file.' }
                ].map(function(item) {
                  return h('div', { key: item.label, style: { padding: 10, borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgCard } },
                    h('div', { style: { fontSize: 11, fontWeight: 900, color: _t.successText, textTransform: 'uppercase', marginBottom: 4 } }, item.label),
                    h('div', { style: { fontSize: 12, color: _t.textMuted, lineHeight: 1.45 } }, item.body)
                  );
                })
              )
            ),
            _selRenderMarkdown(React, FOR_EDUCATORS_MD),
            h('div', { style: { marginTop: 20, paddingTop: 16, borderTop: '1px solid ' + _t.border } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: _t.text } }, 'Data & privacy'),
              h('p', { style: { margin: '0 0 10px', fontSize: 12, color: _t.textMuted, lineHeight: 1.5 } },
                'SEL work (journal entries, reflections, safety plan, streak, stations, and progress) is stored on this device and can be included when a project file is saved. This permanently deletes all of it from this device.'),
              h('button', {
                id: 'sel-clear-all-data-button',
                onClick: function() { setShowClearSelConfirm(true); },
                'aria-label': 'Clear all my SEL data from this device',
                style: { padding: '8px 14px', borderRadius: 8, border: '1px solid ' + _t.dangerText, background: isContrast ? '#000000' : 'rgba(220,38,38,0.08)', color: _t.dangerText, fontSize: 12, fontWeight: 700, cursor: 'pointer' }
              }, '🗑️ Clear my SEL data')
            )
          )
        )
      );

      // ══════════════════════════════════════════════════════════════
      // ── Tool Grid (when no tool is selected) ──
      // ══════════════════════════════════════════════════════════════
      var sharePacketModal = showSharePacket && (function() {
        var packetItems = _selSharePacketItems();
        var savedSharePacketArtifacts = _selSavedSharePacketArtifacts();
        var activeSharePacketArtifact = _selActiveSharePacketArtifact();
        var activePacket = activeSharePacketArtifact ? _selArtifactPacket(activeSharePacketArtifact) : null;
        var previewPacket = _buildSelSharePacket(Date.now(), activeSharePacketArtifact);
        var selectedCount = previewPacket.items.length;
        var privacyChoices = _selPacketPrivacyChoices();
        var actionDisabledStyle = selectedCount ? {} : { opacity: 0.55, cursor: 'not-allowed' };
        return h('div', {
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'sel-share-packet-title',
          id: 'sel-share-packet-modal',
          style: { position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
        },
          h('div', {
            style: { background: _t.bgCard, color: _t.text, borderRadius: 14, border: '1px solid ' + _t.border, maxWidth: 860, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }
          },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '14px 20px', borderBottom: '1px solid ' + _t.border } },
              h('div', { style: { minWidth: 0 } },
                h('h2', { id: 'sel-share-packet-title', style: { margin: 0, fontSize: 17, fontWeight: 900, color: _t.text } }, 'Create SEL Share Packet'),
                h('p', { style: { margin: '4px 0 0', fontSize: 12, lineHeight: 1.45, color: _t.textMuted } },
                  'Choose saved checkpoints and what each one can share. AlloHaven will only show the details selected here.')
              ),
              h('button', {
                'data-primary-action': 'true',
                onClick: function() { setShowSharePacket(false); alloRestoreOrFocusSelHubStart(); },
                'aria-label': 'Close SEL Share Packet builder',
                style: { background: 'none', border: 'none', color: _t.text, cursor: 'pointer', fontSize: 18, padding: 4 }
              }, '\u2715')
            ),
            h('div', { style: { flex: 1, overflow: 'auto', padding: isCompact ? '14px' : '18px 20px' } },
              h('div', {
                role: 'note',
                style: {
                  marginBottom: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid ' + _t.border,
                  background: _t.bgSoft,
                  color: _t.textMuted,
                  fontSize: 11.5,
                  lineHeight: 1.45
                }
              },
                h('strong', { style: { color: _t.text } }, 'Student-controlled packet. '),
                'Choose what appears, then set the sharing label for each checkpoint. Private entries appear only as private labels.'
              ),
              h('div', {
                role: 'status',
                'aria-live': 'polite',
                style: {
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                  padding: '9px 11px',
                  borderRadius: 8,
                  border: '1px solid ' + (activeSharePacketArtifact ? _t.successText : _t.border),
                  background: activeSharePacketArtifact ? (isContrast ? '#000000' : 'rgba(15,118,110,0.08)') : _t.bgSoft,
                  color: _t.textMuted,
                  fontSize: 11.5,
                  lineHeight: 1.4
                }
              },
                h('span', null,
                  activeSharePacketArtifact
                    ? 'Draft loaded from saved packet: ' + ((activePacket && activePacket.title) || 'SEL Share Packet') + '. Updating keeps the same AlloHaven portfolio item.'
                    : 'New packet draft. Save it to AlloHaven when the sharing choices look right.'
                ),
                activeSharePacketArtifact && h('button', {
                  type: 'button',
                  onClick: _startNewSelSharePacketDraft,
                  'aria-label': 'Start a new SEL Share Packet draft',
                  style: { minHeight: 32, borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgCard, color: _t.text, cursor: 'pointer', fontSize: 11, fontWeight: 900, padding: '5px 10px' }
                }, 'Start new')
              ),
              savedSharePacketArtifacts.length ? h('section', {
                'aria-label': 'Saved SEL Share Packets',
                style: {
                  marginBottom: 12,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid ' + _t.border,
                  background: _t.bgSoft
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 } },
                  h('h3', { style: { margin: 0, fontSize: 13, fontWeight: 900, color: _t.text } }, 'Saved Packets'),
                  h('span', { style: { fontSize: 11, color: _t.textMuted } }, savedSharePacketArtifacts.length + (savedSharePacketArtifacts.length === 1 ? ' packet' : ' packets') + ' in AlloHaven')
                ),
                h('div', { style: { display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 } },
                  savedSharePacketArtifacts.slice(0, 4).map(function(artifact) {
                    var packet = _selArtifactPacket(artifact);
                    var updated = Date.parse(artifact.updatedAt || packet.updatedAt || artifact.createdAt || packet.createdAt || 0) || 0;
                    var isActivePacket = !!(activeSharePacketArtifactId && (artifact.id === activeSharePacketArtifactId || packet.id === activeSharePacketArtifactId));
                    var itemCount = Number(artifact.itemCount || packet.itemCount || (Array.isArray(packet.items) ? packet.items.length : 0));
                    return h('div', {
                      key: artifact.id || packet.id || ('saved-share-packet-' + updated),
                      style: { border: '1px solid ' + (isActivePacket ? _t.successText : _t.border), borderRadius: 8, background: _t.bgCard, padding: 10, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }
                    },
                      h('div', { style: { minWidth: 0 } },
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 } },
                          h('strong', { style: { fontSize: 12, color: _t.text, overflowWrap: 'anywhere' } }, packet.title || artifact.title || 'SEL Share Packet'),
                          isActivePacket && h('span', { style: { fontSize: 9.5, fontWeight: 900, color: _t.successText, textTransform: 'uppercase' } }, 'current draft')
                        ),
                        h('div', { style: { fontSize: 10.5, color: _t.textMuted, lineHeight: 1.35 } },
                          (itemCount || 0) + ((itemCount || 0) === 1 ? ' checkpoint' : ' checkpoints') + (updated ? ' | updated ' + _selRelativeTime(updated) : '')
                        )
                      ),
                      h('button', {
                        type: 'button',
                        onClick: function() { _loadSelSharePacketDraft(artifact); },
                        'aria-label': 'Reopen saved SEL Share Packet as draft: ' + (packet.title || artifact.title || 'SEL Share Packet'),
                        style: { alignSelf: 'flex-start', minHeight: 32, borderRadius: 8, border: '1px solid ' + _t.accent, background: isActivePacket ? _t.accent : _t.accentSoftBg, color: isActivePacket ? _t.accentText : _t.accentSoftText, cursor: 'pointer', fontSize: 11, fontWeight: 900, padding: '5px 10px' }
                      }, isActivePacket ? 'Reload draft' : 'Reopen')
                    );
                  })
                )
              ) : null,
              packetItems.length ? h('div', {
                style: { display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'minmax(0, 1.15fr) minmax(280px, 0.85fr)', gap: 14, alignItems: 'start' }
              },
                h('section', { 'aria-label': 'Saved SEL checkpoints', style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' } },
                    h('h3', { style: { margin: 0, fontSize: 13, fontWeight: 900, color: _t.text } }, 'Saved Checkpoints'),
                    h('span', { style: { fontSize: 11, color: _t.textMuted } }, selectedCount + ' selected')
                  ),
                  packetItems.slice(0, 12).map(function(item) {
                    var selected = !!(packetSelections && packetSelections[item.id]);
                    var privacy = selected ? (packetSelections[item.id] || 'summary') : 'summary';
                    return h('div', {
                      key: 'packet-item-' + item.id,
                      style: { border: '1px solid ' + _t.border, borderRadius: 8, background: _t.bgRaised, padding: 10, display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 10, alignItems: 'start' }
                    },
                      h('input', {
                        type: 'checkbox',
                        checked: selected,
                        'aria-label': (selected ? 'Remove ' : 'Add ') + item.title + ' from SEL Share Packet',
                        onChange: function(e) {
                          var next = Object.assign({}, packetSelections || {});
                          if (e.target.checked) next[item.id] = next[item.id] || item.sharePacketDefaultPrivacy || 'summary';
                          else delete next[item.id];
                          setPacketSelections(next);
                          setPacketSavedNotice('');
                        },
                        style: { width: 18, height: 18, marginTop: 2, accentColor: '#7c3aed' }
                      }),
                      h('div', { style: { minWidth: 0 } },
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, marginBottom: 4 } },
                          h('span', { 'aria-hidden': 'true', style: { fontSize: 18, flexShrink: 0 } }, item.icon || '\uD83D\uDCBE'),
                          h('div', { style: { minWidth: 0 } },
                            h('div', { style: { fontSize: 12, fontWeight: 900, color: _t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.title),
                            h('div', { style: { fontSize: 10.5, color: _t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.toolLabel + (_selRelativeTime(item.ts) ? ' | ' + _selRelativeTime(item.ts) : ''))
                          )
                        ),
                        h('p', { style: { margin: '0 0 8px', fontSize: 11, lineHeight: 1.4, color: _t.textMuted } }, item.summary),
                        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 } },
                          [item.privacyLabel || 'Private on this device', item.sharePacketPrivacyLabel || 'Defaults to summary only'].map(function(label) {
                            return h('span', {
                              key: label,
                              style: { border: '1px solid ' + _t.border, borderRadius: 999, padding: '2px 7px', color: _t.textMuted, background: _t.bgSoft, fontSize: 10, fontWeight: 800 }
                            }, label);
                          })
                        ),
                        h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 10.5, fontWeight: 800, color: _t.textMuted } },
                          'Sharing choice',
                          h('select', {
                            disabled: !selected,
                            value: privacy,
                            onChange: function(e) {
                              var next = Object.assign({}, packetSelections || {});
                              next[item.id] = e.target.value;
                              setPacketSelections(next);
                              setPacketSavedNotice('');
                            },
                            'aria-label': 'Sharing choice for ' + item.title,
                            style: { width: '100%', minHeight: 34, borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgInput, color: _t.text, padding: '6px 8px', fontSize: 12, boxSizing: 'border-box', opacity: selected ? 1 : 0.6 }
                          },
                            privacyChoices.map(function(choice) {
                              return h('option', { key: choice.id, value: choice.id }, choice.label);
                            })
                          )
                        )
                      )
                    );
                  })
                ),
                h('section', { 'aria-label': 'SEL Share Packet preview', style: { border: '1px solid ' + _t.border, borderRadius: 8, background: _t.bgSoft, padding: 12 } },
                  h('h3', { style: { margin: '0 0 6px', fontSize: 13, fontWeight: 900, color: _t.text } }, 'Preview'),
                  h('p', { style: { margin: '0 0 10px', fontSize: 11.5, color: _t.textMuted, lineHeight: 1.45 } },
                    selectedCount ? 'This is the version that will print, download, and appear in AlloHaven.' : 'Select at least one checkpoint to build a packet.'),
                  selectedCount ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                    previewPacket.items.map(function(item, idx) {
                      return h('div', {
                        key: 'packet-preview-' + item.id + '-' + idx,
                        style: { border: '1px solid ' + _t.border, borderRadius: 8, background: _t.bgCard, padding: 10 }
                      },
                        h('div', { style: { fontSize: 11, fontWeight: 900, color: _t.text, marginBottom: 4 } }, String(idx + 1) + '. ' + item.title),
                        h('div', { style: { fontSize: 10.5, color: item.privacy === 'private' ? _t.dangerText : _t.successText, fontWeight: 900, marginBottom: 5 } }, item.privacyLabel),
                        item.followUpRequested ? h('div', { style: { fontSize: 11, color: _t.warningText, fontWeight: 800, marginBottom: 5 } }, 'Follow-up requested.') : null,
                        h('p', { style: { margin: 0, fontSize: 11.5, lineHeight: 1.45, color: _t.textMuted } }, item.text || item.summary || 'No reflection text shared.')
                      );
                    })
                  ) : null
                )
              ) : h('div', { style: { padding: 18, border: '1px solid ' + _t.border, borderRadius: 8, background: _t.bgSoft, color: _t.textMuted, fontSize: 13, lineHeight: 1.5 } },
                'No saved SEL checkpoints yet. Open an SEL tool and use its save/checkpoint action, then return here to create a packet.')
            ),
            h('div', { style: { borderTop: '1px solid ' + _t.border, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } },
              h('div', { role: 'status', 'aria-live': 'polite', style: { minHeight: 18, fontSize: 11, color: packetSavedNotice ? _t.successText : _t.textMuted, fontWeight: packetSavedNotice ? 800 : 500 } },
                packetSavedNotice || 'Private items stay private; summary-only items keep full text out of the portfolio.'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
                h('button', {
                  type: 'button',
                  disabled: !selectedCount,
                  onClick: _downloadSelSharePacket,
                  'aria-label': 'Download this SEL Share Packet as text',
                  style: Object.assign({ minHeight: 36, borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgCard, color: _t.text, cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: '7px 12px' }, actionDisabledStyle)
                }, 'Download text'),
                h('button', {
                  type: 'button',
                  disabled: !selectedCount,
                  onClick: _printSelSharePacket,
                  'aria-label': 'Print or save this SEL Share Packet as a PDF',
                  style: Object.assign({ minHeight: 36, borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgCard, color: _t.text, cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: '7px 12px' }, actionDisabledStyle)
                }, 'Print / Save PDF'),
                activeSharePacketArtifact && h('button', {
                  type: 'button',
                  disabled: !selectedCount,
                  onClick: function() { _saveSelSharePacketToPortfolio(true); },
                  'aria-label': 'Update this saved SEL Share Packet in AlloHaven',
                  style: Object.assign({ minHeight: 36, borderRadius: 8, border: '1px solid ' + _t.successText, background: isContrast ? '#000000' : 'rgba(15,118,110,0.10)', color: _t.successText, cursor: 'pointer', fontSize: 12, fontWeight: 900, padding: '7px 12px' }, actionDisabledStyle)
                }, 'Update saved copy'),
                h('button', {
                  type: 'button',
                  disabled: !selectedCount,
                  onClick: function() { _saveSelSharePacketToPortfolio(false); },
                  'aria-label': activeSharePacketArtifact ? 'Save this SEL Share Packet as a new AlloHaven copy' : 'Save this SEL Share Packet to AlloHaven',
                  style: Object.assign({ minHeight: 36, borderRadius: 8, border: 'none', background: _t.accent, color: _t.accentText, cursor: 'pointer', fontSize: 12, fontWeight: 900, padding: '7px 14px' }, actionDisabledStyle)
                }, activeSharePacketArtifact ? 'Save as new copy' : 'Save to AlloHaven')
              )
            )
          )
        );
      })();

      var toolGrid = null;
      if (!selHubTool) {
        var _recentSelTool = null;
        if (!activePathway && !activeStation) {
          var bestId = null; var bestTime = 0; var weekAgo = Date.now() - 7 * 86400000;
          Object.keys(selToolUsage || {}).forEach(function(k) {
            var u = selToolUsage[k];
            if (u && u.lastUsed && u.lastUsed > bestTime && u.lastUsed > weekAgo) { bestTime = u.lastUsed; bestId = k; }
          });
          if (bestId) _recentSelTool = _allSelTools.find(function(t) { return t.id === bestId && !t.category; }) || null;
        }
        var _gradePick = _selGradePick();
        var _startHereCards = [
          { key: 'continue', icon: _recentSelTool ? _recentSelTool.icon : '\u21A9', label: 'Continue', desc: _recentSelTool ? _recentSelTool.label : 'Resume the last SEL tool you opened.', tool: _recentSelTool, disabled: !_recentSelTool },
          { key: 'recommended', icon: _gradePick ? _gradePick.icon : '\u2728', label: 'Recommended', desc: _gradePick ? _gradePick.label + ' fits this grade band.' : 'Open a grade-friendly starting point.', tool: _gradePick, disabled: !_gradePick },
          { key: 'calm', icon: '\uD83E\uDDD8', label: 'Calm Down', desc: 'Try a quick regulation practice.', tool: _allSelTools.find(function(t) { return t.id === 'coping'; }) || _allSelTools.find(function(t) { return t.id === 'mindfulness'; }) },
          { key: 'journal', icon: '\uD83D\uDCD3', label: 'Journal', desc: 'Write a private reflection.', tool: _allSelTools.find(function(t) { return t.id === 'journal'; }) },
          { key: 'browse', icon: '\uD83D\uDD0D', label: 'Browse All', desc: 'Search or filter the full catalog.', browse: true, disabled: false }
        ];
        var _selNeedChips = [
          { key: 'calm', icon: '\uD83E\uDDD8', label: 'Calm my body', query: 'calm' },
          { key: 'feelings', icon: '\uD83D\uDCAC', label: 'Name feelings', query: 'feelings' },
          { key: 'stress', icon: '\uD83C\uDF2A', label: 'Stress or worry', query: 'stress worry' },
          { key: 'friend', icon: '\uD83E\uDD1D', label: 'Friend conflict', query: 'friend conflict' },
          { key: 'write', icon: '\uD83D\uDCD3', label: 'Write it out', query: 'write' },
          { key: 'decision', icon: '\u2696\uFE0F', label: 'Make a decision', query: 'decision' },
          { key: 'sleep', icon: '\uD83D\uDE34', label: 'Sleep or tired', query: 'sleep tired' }
        ];
        var _recentWorkItems = (!activePathway && !activeStation) ? _selRecentWorkItems() : [];
        var _shareableSnapshotCount = (!activePathway && !activeStation) ? _selSharePacketItems().length : 0;
        var _savedSharePacketCount = (!activePathway && !activeStation) ? _selSavedSharePacketArtifacts().length : 0;
        // Search filter
        var _searchLower = selToolSearch.toLowerCase().trim();
        var _filteredTools = _searchLower ? _allSelTools.filter(function(tool) {
          if (tool.category) {
            // Keep category if any tool in its section matches
            var catIdx = _allSelTools.indexOf(tool);
            for (var j = catIdx + 1; j < _allSelTools.length; j++) {
              if (_allSelTools[j].category) break;
              if (_selToolMatchesSearch(_allSelTools[j], _searchLower)) return true;
            }
            return false;
          }
          return _selToolMatchesSearch(tool, _searchLower);
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

        // If a custom Station is active, filter to its tools only (parallel to pathway filtering)
        if (activeStation && activeStation.tools && activeStation.tools.length > 0) {
          var _stTools = activeStation.tools;
          _filteredTools = _filteredTools.filter(function (t2) {
            if (t2.category) return true;
            return _stTools.indexOf(t2.id) >= 0;
          });
          _filteredTools = _filteredTools.filter(function (t2, i, arr) {
            if (!t2.category) return true;
            for (var j = i + 1; j < arr.length; j++) {
              if (arr[j].category) return false;
              return true;
            }
            return false;
          });
        }

        toolGrid = h('div', { role: 'main', 'aria-label': 'SEL Hub tool selection', style: { padding: isCompact ? 12 : 20 } },
          // Active pathway banner
          activePathway && h('div', {
            style: { marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: _t.bgSoft, border: '1px solid ' + _t.accent, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }
          },
            h('div', null,
              h('div', { style: { fontSize: 13, fontWeight: 800, color: _t.accentSoftText } }, '\uD83D\uDEE4\uFE0F ' + activePathway.name),
              h('div', { style: { fontSize: 11, color: _t.textMuted, marginTop: 2 } }, activePathway.tools.length + ' tools \u2022 ' + Object.keys(pathwayProgress).filter(function(k) { return pathwayProgress[k]; }).length + '/' + activePathway.tools.length + ' completed')
            ),
            h('button', {
              onClick: function() { setActivePathway(null); setPathwayProgress({}); announceToSR('Pathway cleared'); },
              'aria-label': 'Exit pathway mode',
              style: { background: 'none', border: '1px solid ' + _t.accent, borderRadius: 8, padding: '4px 10px', color: _t.accentSoftText, fontSize: 11, fontWeight: 700, cursor: 'pointer' }
            }, '\u2715 Exit Pathway')
          ),
          // Active station banner (mutually exclusive with active pathway in practice)
          activeStation && (function () {
            var stationProg = questProgress[activeStation.id] || {};
            var totalQ = (activeStation.quests || []).length;
            var doneQ = (activeStation.quests || []).filter(function (q) { return (stationProg[q.qid] || {}).complete; }).length;
            return h('div', {
              role: 'region', 'aria-label': 'Active SEL Station: ' + activeStation.name,
              style: { marginBottom: 16, padding: '12px 16px', borderRadius: 8, background: _t.bgSoft, border: '1px solid ' + _t.pinkAccent }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } },
                h('div', { style: { minWidth: 0, flex: 1 } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: _t.pinkText } }, '\ud83d\udccc ' + activeStation.name),
                  h('div', { style: { fontSize: 11, color: _t.textMuted, marginTop: 2 } },
                    (activeStation.tools || []).length + ' tools' + (totalQ > 0 ? ' \u2022 ' + doneQ + '/' + totalQ + ' quests done' : '')
                  ),
                  activeStation.teacherNote && h('div', { style: { fontSize: 11, color: _t.textMuted, marginTop: 6, fontStyle: 'italic', padding: '6px 8px', background: _t.bgCard, borderRadius: 6, borderLeft: '3px solid #ec4899' } }, '\ud83d\udcac ' + activeStation.teacherNote)
                ),
                h('button', {
                  onClick: function () { setActiveStationId(null); announceToSR('Station cleared'); },
                  'aria-label': 'Exit station mode',
              style: { background: 'none', border: '1px solid ' + _t.pinkAccent, borderRadius: 8, padding: '4px 10px', color: _t.pinkText, fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                }, '\u2715 Exit Station')
              ),
              totalQ > 0 && h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 } },
                (activeStation.quests || []).map(function (q) {
                  var qp = stationProg[q.qid] || {};
                  var done = !!qp.complete;
                  var qIcon = (SEL_QUEST_TYPES.find(function (qt) { return qt.id === q.type; }) || {}).icon || '\ud83c\udfaf';
                  return h('div', { key: q.qid, style: { background: done ? (isContrast ? '#000000' : '#dcfce7') : _t.bgCard, border: '1px solid ' + (done ? _t.successText : _t.border), borderRadius: 8, padding: '6px 10px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 14 } }, done ? '\u2705' : qIcon),
                      h('span', { style: { fontSize: 12, fontWeight: 600, color: done ? _t.successText : _t.text, flex: 1, textDecoration: done ? 'line-through' : 'none' } }, q.label),
                      !done && q.type === 'xpThreshold' && h('span', { style: { fontSize: 10, color: _t.textMuted } }, selXp + ' / ' + ((q.params && q.params.threshold) || 30)),
                      !done && q.type === 'timeSpent' && h('span', { style: { fontSize: 10, color: _t.textMuted } }, Math.floor(((qp.timeAccumMs || 0) / 60000)) + ' / ' + ((q.params && q.params.minutes) || 5) + ' min'),
                      !done && q.type === 'manualComplete' && h('button', {
                        onClick: function () {
                          setQuestProgress(function (prev) {
                            var next = Object.assign({}, prev);
                            var sp = Object.assign({}, next[activeStation.id] || {});
                            sp[q.qid] = Object.assign({}, sp[q.qid] || {}, { markedComplete: true });
                            next[activeStation.id] = sp;
                            return next;
                          });
                          announceToSR('Quest marked complete: ' + q.label);
                        },
                        'aria-label': 'Mark "' + q.label + '" as complete',
                        style: { fontSize: 11, fontWeight: 700, padding: '8px 14px', minHeight: 36, borderRadius: 6, border: '1px solid ' + _t.pinkAccent, background: _t.bgCard, color: _t.pinkText, cursor: 'pointer' }
                      }, 'Mark complete')
                    ),
                    !done && q.type === 'freeResponse' && h('textarea', { 'aria-label': 'Reflection for ' + q.label,
                      value: qp.response || '',
                      onChange: function (ev) {
                        var v = ev.target.value;
                        setQuestProgress(function (prev) {
                          var next = Object.assign({}, prev);
                          var sp = Object.assign({}, next[activeStation.id] || {});
                          sp[q.qid] = Object.assign({}, sp[q.qid] || {}, { response: v });
                          next[activeStation.id] = sp;
                          return next;
                        });
                      },
                      placeholder: (q.params && q.params.prompt) || 'Write a reflection...',
                      rows: 2,
                      style: { width: '100%', marginTop: 6, padding: '6px 8px', borderRadius: 6, border: '1px solid ' + _t.border, background: _t.bgInput, color: _t.text, fontSize: 11, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }
                    })
                  );
                })
              )
            );
          })(),
          !activePathway && !activeStation && h('section', {
            'aria-label': 'Start here',
            style: { marginBottom: 14 }
          },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 } },
              h('h3', { style: { margin: 0, fontSize: 13, fontWeight: 800, color: _t.text } }, 'Start here'),
              h('span', { style: { fontSize: 11, color: _t.textMuted } }, 'Pick a quick route, or browse below.')
            ),
            h('div', {
              style: {
                display: 'grid',
                gridTemplateColumns: isCompact ? '1fr' : (isMidWidth ? 'repeat(3, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))'),
                gap: 8
              }
            },
              _startHereCards.map(function(card) {
                var disabled = card.disabled || (!card.browse && !card.tool);
                return h('button', {
                  key: card.key,
                  disabled: disabled,
                  onClick: function() {
                    if (card.browse) {
                      setActivePathway(null);
                      setActiveStationId(null);
                      setSelCategoryFilter(null);
                      setSelToolSearch('');
                      announceToSR('Browsing all SEL tools');
                      setTimeout(function() {
                        var searchInput = document.getElementById('sel-tool-search-input');
                        if (searchInput && searchInput.focus) searchInput.focus();
                      }, 50);
                    } else if (card.tool) {
                      openSelToolById(card.tool.id, card.tool.label);
                    }
                  },
                  'aria-label': card.label + ': ' + card.desc,
                  style: {
                    textAlign: 'left',
                    padding: isCompact ? '10px 12px' : '12px',
                    minHeight: isCompact ? 68 : 86,
                    borderRadius: 8,
                    border: '1px solid ' + _t.border,
                    background: disabled ? _t.bgDisabled : _t.bgCard,
                    color: _t.text,
                    opacity: disabled ? 0.55 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: isCompact ? 'row' : 'column',
                    alignItems: isCompact ? 'center' : 'flex-start',
                    gap: isCompact ? 10 : 6,
                    boxSizing: 'border-box'
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: isCompact ? 20 : 22, flexShrink: 0 } }, card.icon),
                  h('span', { style: { minWidth: 0 } },
                    h('span', { style: { display: 'block', fontSize: 12, fontWeight: 800, color: _t.text, marginBottom: 2 } }, card.label),
                    h('span', { style: { display: 'block', fontSize: 10.5, lineHeight: 1.35, color: _t.textMuted } }, card.desc)
                  )
                );
              })
            ),
            h('div', {
              role: 'note',
              style: { marginTop: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgSoft, color: _t.textMuted, fontSize: 11, lineHeight: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }
            },
              h('span', null, 'Private on this device. Save or export before closing if you want to keep your work.'),
              h('button', {
                onClick: function() {
                  if (typeof props.onExportRequested === 'function') {
                    try { props.onExportRequested(); } catch (e) {}
                  } else {
                    try { window.dispatchEvent(new CustomEvent('alloflow-sel-export-requested')); } catch (e) {}
                  }
                  if (typeof addToast === 'function') addToast('Preparing to save your SEL work...', 'info');
                },
                'aria-label': 'Save or export SEL work now',
                style: { border: '1px solid ' + _t.accent, background: _t.accent, color: _t.accentText, borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer', minHeight: 32 }
              }, 'Save now')
            )
          ),
          !activePathway && !activeStation && h('details', {
            'aria-label': 'Teacher launch routines',
            style: { marginBottom: 14, borderRadius: 8, border: '1px solid ' + _t.border, overflow: 'hidden', background: _t.bgCard }
          },
            h('summary', {
              style: { padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 800, color: _t.text, background: _t.bgCard, display: 'flex', alignItems: 'center', gap: 8 }
            }, h('span', { 'aria-hidden': 'true' }, '\uD83C\uDF93'), 'Teacher launch'),
            h('div', { style: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid ' + _t.border } },
              h('div', {
                role: 'note',
                style: { padding: '8px 10px', borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgSoft, color: _t.textMuted, fontSize: 11, lineHeight: 1.45 }
              }, 'Class routines stay formative: no grades, no forced sharing, no teacher dashboard of private reflections. Students save or share only when you ask them to choose a file.'),
              h('div', {
                role: 'list',
                'aria-label': 'Teacher launch guardrails',
                style: { display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }
              },
                [
                  { label: 'Set the boundary', body: 'Say what is private, what is optional, and how students can pass.' },
                  { label: 'Run the routine', body: 'Use the tools as practice. Keep reflection formative and ungraded.' },
                  { label: 'Close with choice', body: 'Students decide whether to save, export, or include a checkpoint later.' }
                ].map(function(step) {
                  return h('div', {
                    key: step.label,
                    role: 'listitem',
                    style: { border: '1px solid ' + _t.border, borderRadius: 8, background: _t.bgCard, padding: 9, minWidth: 0 }
                  },
                    h('div', { style: { color: _t.text, fontSize: 11, fontWeight: 900, marginBottom: 3 } }, step.label),
                    h('div', { style: { color: _t.textMuted, fontSize: 10.5, lineHeight: 1.4 } }, step.body)
                  );
                })
              ),
              h('div', {
                style: { display: 'grid', gridTemplateColumns: isCompact ? '1fr' : (isMidWidth ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))'), gap: 8 }
              },
                SEL_TEACHER_LAUNCH_PLANS.map(function(plan) {
                  var labels = _teacherPlanToolLabels(plan);
                  var pendingLabels = _teacherPlanPendingLabels(plan);
                  var sensitiveLabels = _teacherPlanSensitiveLabels(plan);
                  var catalogTools = _teacherPlanCatalogTools(plan);
                  var disabled = catalogTools.length === 0 || pendingLabels.length > 0;
                  return h('div', {
                    key: plan.id,
                    style: { border: '1px solid ' + _t.border, borderRadius: 8, background: _t.bgRaised, padding: 10, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8 } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 18, flex: '0 0 auto' } }, plan.icon),
                      h('div', { style: { minWidth: 0 } },
                        h('div', { style: { fontSize: 12, fontWeight: 900, color: _t.text, lineHeight: 1.25 } }, plan.name),
                        h('div', { style: { fontSize: 10.5, color: _t.textMuted, lineHeight: 1.35, marginTop: 2 } }, plan.time + ' | ' + plan.format)
                      )
                    ),
                    h('div', { style: { fontSize: 10.5, color: _t.textMuted, lineHeight: 1.4 } }, plan.focus),
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 5, padding: '7px 8px', borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgSoft } },
                      [
                        { label: 'Student sees', body: plan.studentView || 'Students complete a private SEL routine and choose what to share.' },
                        { label: 'Teacher move', body: plan.teacherMove || 'Frame this as practice, not assessment.' },
                        { label: 'Sharing boundary', body: plan.privacyBoundary || 'Sharing remains student-controlled.' }
                      ].map(function(row) {
                        return h('div', { key: row.label, style: { minWidth: 0 } },
                          h('span', { style: { display: 'block', color: _t.text, fontSize: 9.5, fontWeight: 900, textTransform: 'uppercase', marginBottom: 1 } }, row.label),
                          h('span', { style: { display: 'block', color: _t.textMuted, fontSize: 10.5, lineHeight: 1.35, overflowWrap: 'anywhere' } }, row.body)
                        );
                      })
                    ),
                    h('div', { style: { fontSize: 10, color: _t.textMuted, lineHeight: 1.35, minHeight: 28 } },
                      labels.length ? labels.join(', ') : 'Tools loading...',
                      pendingLabels.length ? h('span', { style: { display: 'block', marginTop: 2, color: _t.warningText, fontWeight: 800 } }, 'Still loading: ' + pendingLabels.join(', ')) : null
                    ),
                    sensitiveLabels.length ? h('div', { style: { fontSize: 10, color: _t.warningText, fontWeight: 900, lineHeight: 1.35 } },
                      'Preview sensitive tools first: ' + sensitiveLabels.join(', ')
                    ) : null,
                    h('button', {
                      type: 'button',
                      disabled: disabled,
                      onClick: function() { _applyTeacherLaunchPlan(plan); },
                      'aria-label': 'Load teacher launch plan: ' + plan.name,
                      style: { marginTop: 'auto', minHeight: 34, borderRadius: 8, border: disabled ? '1px solid ' + _t.border : '1px solid ' + _t.successText, background: disabled ? _t.bgCard : _t.successText, color: disabled ? _t.textMuted : (isContrast ? '#000000' : '#ffffff'), cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 900, padding: '6px 10px' }
                    }, pendingLabels.length ? 'Waiting for tools' : disabled ? 'Loading' : 'Load into Station Builder')
                  );
                })
              )
            )
          ),
          !activePathway && !activeStation && _recentWorkItems.length > 0 && h('section', {
            'aria-label': 'Recent SEL work',
            style: { marginBottom: 14 }
          },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
              h('h3', { style: { margin: 0, fontSize: 13, fontWeight: 800, color: _t.text } }, 'Recent SEL work'),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
                h('span', { style: { fontSize: 11, color: _t.textMuted } }, 'Saved here. Export to keep it after closing.'),
                (_shareableSnapshotCount > 0 || _savedSharePacketCount > 0) && h('button', {
                  type: 'button',
                  onClick: _openSelSharePacketBuilder,
                  'aria-label': _shareableSnapshotCount > 0 ? 'Create SEL Share Packet from saved checkpoints' : 'Review saved SEL Share Packets',
                  style: { minHeight: 32, borderRadius: 8, border: '1px solid ' + _t.accent, background: _t.accentSoftBg, color: _t.accentSoftText, cursor: 'pointer', fontSize: 11, fontWeight: 900, padding: '6px 10px' }
                }, _shareableSnapshotCount > 0 ? 'Create Share Packet' : 'Review Share Packets')
              )
            ),
            h('div', {
              style: {
                display: 'grid',
                gridTemplateColumns: isCompact ? '1fr' : (isMidWidth ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))'),
                gap: 8
              }
            },
              _recentWorkItems.map(function(item) {
                var canOpen = item.toolId && window.SelHub && window.SelHub.isRegistered(item.toolId);
                var when = _selRelativeTime(item.ts);
                return h('button', {
                  key: item.key,
                  disabled: !canOpen,
                  onClick: function() {
                    if (canOpen) openSelToolById(item.toolId, item.title);
                  },
                  'aria-label': item.kind + ' SEL work: ' + item.title + (when ? ', ' + when : '') + '. ' + (canOpen ? 'Open related tool.' : 'Related tool is still loading.'),
                  title: item.detail || item.title,
                  style: {
                    minHeight: 72,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid ' + _t.border,
                    background: _t.bgCard,
                    color: _t.text,
                    cursor: canOpen ? 'pointer' : 'default',
                    opacity: canOpen ? 1 : 0.55,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    boxSizing: 'border-box'
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 22, flexShrink: 0 } }, item.icon || '\uD83D\uDCBE'),
                  h('span', { style: { minWidth: 0, flex: 1 } },
                    h('span', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, minWidth: 0 } },
                      h('span', { style: { fontSize: 10, fontWeight: 900, color: _t.accentSoftText, textTransform: 'uppercase', flexShrink: 0 } }, item.kind),
                      when && h('span', { style: { fontSize: 10, color: _t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, when)
                    ),
                    h('span', { style: { display: 'block', fontSize: 12, lineHeight: 1.25, fontWeight: 800, color: _t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.title),
                    h('span', { style: { display: 'block', fontSize: 10.5, lineHeight: 1.3, color: _t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 } }, item.detail)
                  )
                );
              })
            )
          ),
          // \u2500\u2500 Daily Streak \u2500\u2500
          // Pulls from localStorage-backed selStreak / selToolUsage.
          // Streak chip surfaces only when count >= 2 (avoids "1-day streak"
          // noise on first visit). Continue now lives in the Start here cards.
          (function () {
            var showStreak = (selStreak.count || 0) >= 2;
            if (!showStreak) return null;
            return h('div', {
              style: { marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #f59e0b15, #ec489915)', border: '1px solid #f59e0b33', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
                showStreak && h('div', {
                  role: 'status',
                  'aria-label': selStreak.count + '-day SEL streak. Longest: ' + (selStreak.longest || selStreak.count) + ' days.',
                  style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 16, background: '#fff7ed', border: '1px solid #fed7aa' }
                },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 14 } }, '\uD83D\uDD25'),
                  h('span', { style: { fontSize: 12, fontWeight: 800, color: '#c2410c' } }, selStreak.count + '-day streak'),
                  (selStreak.longest > selStreak.count) && h('span', { style: { fontSize: 10, color: '#9a3412', fontWeight: 600 } }, '\u00B7 best ' + selStreak.longest)
                )
              )
            );
          })(),
          // Search bar
          h('div', { style: { marginBottom: 12 } },
            h('input', {
              id: 'sel-tool-search-input',
              type: 'text',
              placeholder: '\uD83D\uDD0D Search feelings, friends, stress, goals...',
              value: selToolSearch,
              onChange: function(e) { setSelToolSearch(e.target.value); },
              'aria-label': 'Search SEL tools',
              style: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgInput, color: _t.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
              onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #8b5cf6'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }
            })
          ),
          !activePathway && !activeStation && h('div', {
            role: 'group',
            'aria-label': 'Find SEL tools by need',
            style: { marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 11, fontWeight: 800, color: _t.textMuted } }, 'I need...'),
              _searchLower && h('button', {
                onClick: function() { setSelToolSearch(''); setSelCategoryFilter(null); announceToSR('Cleared SEL search'); },
                'aria-label': 'Clear SEL search',
                style: { border: 'none', background: 'transparent', color: _t.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '4px 2px' }
              }, 'Clear')
            ),
            h('div', { style: { display: 'flex', gap: 6, overflowX: isCompact ? 'auto' : 'visible', flexWrap: isCompact ? 'nowrap' : 'wrap', paddingBottom: isCompact ? 4 : 0, WebkitOverflowScrolling: 'touch' } },
              _selNeedChips.map(function(chip) {
                var activeNeed = _searchLower === chip.query;
                return h('button', {
                  key: chip.key,
                  onClick: function() {
                    setActivePathway(null);
                    setActiveStationId(null);
                    setSelCategoryFilter(null);
                    setSelToolSearch(activeNeed ? '' : chip.query);
                    announceToSR(activeNeed ? 'Cleared SEL need filter' : 'Showing SEL tools for ' + chip.label);
                  },
                  'aria-label': (activeNeed ? 'Clear need filter: ' : 'Find tools for: ') + chip.label,
                  'aria-pressed': activeNeed ? 'true' : 'false',
                  style: {
                    minHeight: 34,
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: '1px solid ' + (activeNeed ? _t.accent : _t.border),
                    background: activeNeed ? _t.accent : _t.bgCard,
                    color: activeNeed ? _t.accentText : _t.text,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }
                },
                  h('span', { 'aria-hidden': 'true' }, chip.icon),
                  chip.label
                );
              })
            )
          ),
          // CASEL category filter chips
          h('div', { role: 'group', 'aria-label': 'Filter SEL tools by category', style: { display: 'flex', flexWrap: isCompact ? 'nowrap' : 'wrap', gap: 6, marginBottom: 16, overflowX: isCompact ? 'auto' : 'visible', paddingBottom: isCompact ? 4 : 0, WebkitOverflowScrolling: 'touch' } },
            h('button', {
              onClick: function() { setSelCategoryFilter(null); announceToSR('Showing all categories'); },
              'aria-label': 'Show all categories',
              'aria-pressed': selCategoryFilter === null ? 'true' : 'false',
              style: { padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (selCategoryFilter === null ? _t.accent : _t.border), background: selCategoryFilter === null ? _t.accent : _t.bgCard, color: selCategoryFilter === null ? _t.accentText : _t.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }
            }, 'All'),
            SEL_CATEGORIES.map(function(cat) {
              var isActive = selCategoryFilter === cat.id;
              return h('button', {
                key: cat.id,
                onClick: function() { setSelCategoryFilter(isActive ? null : cat.id); announceToSR(isActive ? 'Showing all categories' : 'Filtered to ' + cat.label); },
                'aria-label': 'Filter: ' + cat.label,
                'aria-pressed': isActive ? 'true' : 'false',
                style: { padding: '5px 12px', borderRadius: 20, border: '1px solid ' + (isActive ? _t.accent : _t.border), background: isActive ? _t.accent : _t.bgCard, color: isActive ? _t.accentText : _t.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0 }
              }, cat.icon + ' ' + cat.label);
            })
          ),
          // SEL Pathways — curated learning sequences (collapsed by default)
          !activePathway && h('details', {
            style: { marginBottom: 16, borderRadius: 8, border: '1px solid ' + _t.border, overflow: 'hidden' }
          },
            h('summary', {
              style: { padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: _t.textMuted, background: _t.bgCard, display: 'flex', alignItems: 'center', gap: 6 }
            }, '\uD83D\uDEE4\uFE0F SEL Pathways \u2014 Curated Learning Sequences'),
            h('div', { style: { padding: '8px 12px', display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 } },
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
                  style: { textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgCard, cursor: 'pointer', transition: 'all 0.15s' }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                    h('span', { style: { fontSize: 16 } }, pw.icon),
                    h('span', { style: { fontSize: 12, fontWeight: 700, color: _t.text } }, pw.name)
                  ),
                  h('div', { style: { fontSize: 10, color: _t.textMuted, lineHeight: 1.4 } }, pw.desc),
                  h('div', { style: { fontSize: 9, color: _t.accentSoftText, fontWeight: 600, marginTop: 4 } }, pw.tools.length + ' activities')
                );
              })
            )
          ),
          // Custom SEL Stations — teacher-authored bundles (parallel to STEM Lab Stations)
          !activeStation && !activePathway && h('details', {
            open: builderOpen || savedStations.length > 0,
            style: { marginBottom: 16, borderRadius: 8, border: '1px solid ' + _t.border, overflow: 'hidden' }
          },
            h('summary', {
              style: { padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: _t.textMuted, background: _t.bgCard, display: 'flex', alignItems: 'center', gap: 6 }
            }, '📌 Custom SEL Stations — teacher-authored bundles'),
            h('div', { style: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 } },
              // Saved stations list
              savedStations.length > 0 && h('div', { style: { display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 } },
                savedStations.map(function (st) {
                  return h('div', { key: st.id, style: { padding: '10px 12px', borderRadius: 10, border: '1px solid ' + _t.border, background: _t.bgCard, display: 'flex', flexDirection: 'column', gap: 4 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 } },
                      h('div', { style: { fontSize: 12, fontWeight: 700, color: _t.text, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, '📌 ' + st.name),
                      h('button', {
                        onClick: function () {
                          var keep = savedStations.filter(function (s) { return s.id !== st.id; });
                          setSavedStations(keep);
                          if (activeStationId === st.id) setActiveStationId(null);
                          if (typeof addToast === 'function') addToast('Station removed', 'info');
                        },
                        'aria-label': 'Delete station ' + st.name,
                        style: { background: 'none', border: 'none', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '8px 12px', minWidth: 36, minHeight: 36 }
                      }, '✕')
                    ),
                    h('div', { style: { fontSize: 10, color: _t.textMuted } }, (st.tools || []).length + ' tools' + ((st.quests || []).length > 0 ? ' • ' + st.quests.length + ' quests' : '')),
                    st.teacherNote && h('div', { style: { fontSize: 10.5, color: _t.textMuted, lineHeight: 1.4, padding: '6px 8px', borderRadius: 8, background: _t.bgSoft, border: '1px solid ' + _t.border } }, st.teacherNote),
                    h('button', {
                      onClick: function () {
                        setActiveStationId(st.id);
                        setActivePathway(null); setPathwayProgress({});
                        setSelToolSearch(''); setSelCategoryFilter(null);
                        announceToSR('Activated SEL Station: ' + st.name);
                        if (typeof addToast === 'function') addToast('📌 ' + st.name + ' started!', 'success');
                      },
                      'aria-label': 'Activate station ' + st.name,
                      style: { marginTop: 4, padding: '4px 10px', borderRadius: 8, border: 'none', background: _t.pinkAccent, color: _t.onPink, fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                    }, 'Start station')
                  );
                })
              ),
              // Open builder button
              !builderOpen && h('button', {
                onClick: function () { alloSaveFocus(); setBuilderOpen(true); announceToSR('Station builder opened'); alloFocusStationNameInput(); },
                'aria-label': 'Build a new custom SEL Station',
                style: { padding: '8px 14px', borderRadius: 10, border: '1px dashed ' + _t.pinkAccent, background: isContrast ? '#000000' : 'rgba(236, 72, 153, 0.05)', color: _t.pinkText, fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }
              }, '+ Build a Custom Station'),
              // Inline builder
              builderOpen && (function () {
                var registry = (window.SelHub && window.SelHub.getRegisteredTools) ? window.SelHub.getRegisteredTools() : [];
                // Station Builder hardening: only offer tools that actually have a grid
                // card. A registered-but-uncarded tool (e.g. a deprecated duplicate) would
                // otherwise be saveable into a Station and then silently fail to render in
                // the card-filtered grid; excluding it here keeps custom Stations reachable
                // end-to-end and is robust to future registry drift.
                var _cardedIds = {};
                _allSelTools.forEach(function (t) { if (t && t.id && !t.category) _cardedIds[t.id] = true; });
                registry = registry.filter(function (tool) { return _cardedIds[tool.id]; });
                var selectedBuilderToolIds = Object.keys(builderTools).filter(function (k) { return builderTools[k]; });
                selectedBuilderToolIds.forEach(function(toolId) {
                  if (!_cardedIds[toolId]) return;
                  if (registry.some(function(tool) { return tool.id === toolId; })) return;
                  var catalogTool = _selToolById(toolId);
                  if (!catalogTool) return;
                  registry.push(Object.assign({}, catalogTool, {
                    name: catalogTool.name || catalogTool.label || catalogTool.id,
                    pendingRegistration: true
                  }));
                });
                var builderEstimatedMinutes = selectedBuilderToolIds.length ? Math.max(5, (selectedBuilderToolIds.length * 4) + (builderQuests.length * 2)) : 0;
                var selectedBuilderToolLabels = selectedBuilderToolIds.map(function(toolId) {
                  var found = registry.filter(function(tool) { return tool.id === toolId; })[0] || _selToolById(toolId);
                  return found ? (found.name || found.label || found.id) : toolId;
                }).filter(Boolean);
                function builderNoteLine(prefix, fallback) {
                  var text = String(builderNote || '');
                  var match = text.match(new RegExp(prefix + ':\\s*([^\\n]+)', 'i'));
                  return match ? match[1] : fallback;
                }
                var QUEST_PRESETS = [
                  { name: 'Daily Check-In', icon: '🌅', desc: 'Quick reflection + XP', build: function () {
                    var picked = Object.keys(builderTools).filter(function (k) { return builderTools[k]; });
                    return [
                      { type: 'xpThreshold', toolId: null, label: 'Earn 20 SEL XP today', params: { threshold: 20 } },
                      { type: 'freeResponse', toolId: null, label: 'How are you feeling right now?', params: { prompt: 'How are you feeling right now? What is one thing on your mind?', minLength: 30 } },
                      { type: 'manualComplete', toolId: picked[0] || null, label: 'Complete one SEL activity', params: {} }
                    ];
                  } },
                  { name: 'Reflection Deep Dive', icon: '🔍', desc: 'Time + reflection + XP', build: function () {
                    var picked = Object.keys(builderTools).filter(function (k) { return builderTools[k]; });
                    return [
                      { type: 'xpThreshold', toolId: null, label: 'Earn 60 SEL XP', params: { threshold: 60 } },
                      { type: 'timeSpent', toolId: picked[0] || null, label: 'Spend 8 minutes here', params: { minutes: 8 } },
                      { type: 'freeResponse', toolId: null, label: 'What did you learn about yourself?', params: { prompt: 'What did you learn about yourself today? What is one thing you might do differently next time?', minLength: 60 } }
                    ];
                  } },
                  { name: 'Repair Pack', icon: '🤝', desc: 'After-conflict repair', build: function () {
                    var picked = Object.keys(builderTools).filter(function (k) { return builderTools[k]; });
                    return [
                      { type: 'manualComplete', toolId: picked[0] || null, label: 'Use the first tool to plan a repair', params: {} },
                      { type: 'freeResponse', toolId: null, label: 'Write a repair statement', params: { prompt: 'Write what you would say to repair the relationship. Use "I" statements and name a specific action you can take.', minLength: 80 } },
                      { type: 'manualComplete', toolId: null, label: 'Talk it through with a trusted adult', params: {} }
                    ];
                  } }
                ];
                return h('div', { role: 'region', 'aria-label': 'Station Builder', style: { padding: '12px 14px', borderRadius: 10, border: '1px solid ' + _t.pinkAccent, background: isContrast ? '#000000' : 'rgba(236, 72, 153, 0.04)', display: 'flex', flexDirection: 'column', gap: 10 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: _t.pinkText } }, '🧑‍🏫 Station Builder'),
                    h('button', {
                      onClick: function () { setBuilderOpen(false); setBuilderName(''); setBuilderNote(''); setBuilderTools({}); setBuilderQuests([]); alloRestoreOrFocusSelHubStart(); },
                      'aria-label': 'Cancel station builder',
                      style: { fontSize: 11, fontWeight: 700, color: _t.textMuted, background: 'none', border: 'none', cursor: 'pointer' }
                    }, '✕ Cancel')
                  ),
                  h('div', {
                    role: 'note',
                    'aria-label': 'Student view preview for this station',
                    style: {
                      display: 'grid',
                      gridTemplateColumns: isCompact ? '1fr' : 'minmax(0, 1fr) minmax(160px, 0.45fr)',
                      gap: 8,
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: '1px solid ' + _t.border,
                      background: _t.bgSoft,
                      color: _t.textMuted,
                      fontSize: 11,
                      lineHeight: 1.4
                    }
                  },
                    h('div', { style: { minWidth: 0 } },
                      h('div', { style: { color: _t.text, fontWeight: 900, marginBottom: 2 } }, 'Student view preview'),
                      h('div', { style: { overflowWrap: 'anywhere' } },
                        builderNoteLine('Student view', selectedBuilderToolLabels.length ? selectedBuilderToolLabels.slice(0, 5).join(', ') + (selectedBuilderToolLabels.length > 5 ? ' +' + (selectedBuilderToolLabels.length - 5) + ' more' : '') : 'No tools selected yet.'))
                    ),
                    h('div', { style: { minWidth: 0 } },
                      h('div', { style: { color: _t.text, fontWeight: 900, marginBottom: 2 } }, 'Sharing boundary'),
                      h('div', null, builderNoteLine('Sharing boundary', 'Student saves and share packets stay student-controlled.'))
                    )
                  ),
                  // Name
                  h('input', {
                    id: 'sel-station-name-input',
                    type: 'text', value: builderName,
                    onChange: function (ev) { setBuilderName(ev.target.value); },
                    placeholder: 'Station name (e.g. "Friday SEL Routine")',
                    'aria-label': 'Station name',
                    style: { padding: '7px 10px', borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgInput, color: _t.text, fontSize: 12, boxSizing: 'border-box' }
                  }),
                  // Teacher note
                  h('textarea', { 'aria-label': 'Teacher note',
                    value: builderNote,
                    onChange: function (ev) { setBuilderNote(ev.target.value); },
                    placeholder: 'Optional teacher note (instructions students see when they activate this station)',
                    rows: 4,
                    style: { padding: '7px 10px', borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgInput, color: _t.text, fontSize: 11, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }
                  }),
                  h('div', {
                    role: 'status',
                    'aria-live': 'polite',
                    style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '7px 9px', borderRadius: 8, border: '1px solid ' + _t.border, background: _t.bgSoft, color: _t.textMuted, fontSize: 11, lineHeight: 1.35 }
                  },
                    h('span', null, selectedBuilderToolIds.length + (selectedBuilderToolIds.length === 1 ? ' tool' : ' tools') + ' selected'),
                    h('span', { 'aria-hidden': 'true' }, '|'),
                    h('span', null, builderQuests.length + (builderQuests.length === 1 ? ' quest' : ' quests')),
                    builderEstimatedMinutes > 0 && h('span', null, '| about ' + builderEstimatedMinutes + ' min')
                  ),
                  // Tool picker
                  h('div', null,
                    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 } },
                      h('div', { style: { fontSize: 11, fontWeight: 700, color: _t.text } }, 'Pick tools to include:'),
                      selectedBuilderToolIds.length > 0 && h('button', {
                        type: 'button',
                        onClick: function () { setBuilderTools({}); },
                        'aria-label': 'Clear selected station tools',
                        style: { border: 'none', background: 'none', color: _t.textMuted, cursor: 'pointer', fontSize: 10, fontWeight: 800, textDecoration: 'underline' }
                      }, 'Clear')
                    ),
                    registry.length === 0
                      ? h('div', { style: { fontSize: 11, color: _t.textMuted, fontStyle: 'italic' } }, 'No SEL tools registered yet. Open the hub once so plugins load, then return here.')
                        : h('div', { style: { display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 4, maxHeight: 180, overflowY: 'auto', padding: 4, border: '1px solid ' + _t.border, borderRadius: 8, background: _t.bgCard } },
                          registry.map(function (tool) {
                            var checked = !!builderTools[tool.id];
                            var pending = !!tool.pendingRegistration;
                            return h('label', { key: tool.id, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6, cursor: 'pointer', background: checked ? (isContrast ? '#000000' : (isDark ? '#3b1026' : '#fce7f3')) : 'transparent', border: checked ? '1px solid ' + _t.pinkAccent : '1px solid transparent', fontSize: 11, color: _t.text } },
                              h('input', {
                                type: 'checkbox', checked: checked,
                                onChange: function () {
                                  setBuilderTools(function (prev) { var n = Object.assign({}, prev); n[tool.id] = !checked; return n; });
                                },
                                'aria-label': 'Include ' + (tool.name || tool.label || tool.id) + ' in this station' + (pending ? '. Tool is still loading.' : '')
                              }),
                              h('span', { 'aria-hidden': 'true' }, tool.icon || '🔧'),
                              h('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, tool.name || tool.label || tool.id),
                              pending && h('span', { style: { marginLeft: 'auto', flex: '0 0 auto', fontSize: 9, fontWeight: 800, color: _t.warningText } }, 'loading')
                            );
                          })
                        )
                  ),
                  // Quest presets + manual quest add
                  h('div', null,
                    h('div', { style: { fontSize: 11, fontWeight: 700, color: _t.text, marginBottom: 4 } }, 'Quests (optional):'),
                    builderQuests.length === 0 && h('div', { style: { display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 6, marginBottom: 6 } },
                      QUEST_PRESETS.map(function (preset) {
                        return h('button', {
                          key: preset.name,
                          onClick: function () {
                            var picked = Object.keys(builderTools).filter(function (k) { return builderTools[k]; });
                            if (picked.length === 0) {
                              if (typeof addToast === 'function') addToast('Pick tools first, then add quests', 'info');
                              return;
                            }
                            setBuilderQuests(preset.build());
                            if (typeof addToast === 'function') addToast('Applied "' + preset.name + '" quest preset!', 'success');
                          },
                          'aria-label': 'Apply preset: ' + preset.name + '. ' + preset.desc,
                          style: { background: _t.bgCard, border: '1px solid ' + _t.border, borderRadius: 8, padding: '6px 4px', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: _t.text, textAlign: 'center' }
                        },
                          h('div', { style: { fontSize: 16 } }, preset.icon),
                          h('div', { style: { fontWeight: 700 } }, preset.name),
                          h('div', { style: { fontSize: 9, color: _t.textMuted, marginTop: 2 } }, preset.desc)
                        );
                      })
                    ),
                    builderQuests.length > 0 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                      builderQuests.map(function (q, qi) {
                        var qIcon = (SEL_QUEST_TYPES.find(function (qt) { return qt.id === q.type; }) || {}).icon || '🎯';
                        return h('div', { key: qi, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6, background: _t.bgCard, border: '1px solid ' + _t.border, fontSize: 11, color: _t.text } },
                          h('span', { 'aria-hidden': 'true', style: { fontSize: 13 } }, qIcon),
                          h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, q.label),
                          h('button', {
                            onClick: function () { setBuilderQuests(function (prev) { return prev.filter(function (_, i) { return i !== qi; }); }); },
                            'aria-label': 'Remove quest "' + q.label + '"',
                            style: { background: 'none', border: 'none', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                          }, '✕')
                        );
                      }),
                      h('button', {
                        onClick: function () { setBuilderQuests([]); },
                        'aria-label': 'Clear all quests',
                        style: { fontSize: 10, color: _t.textMuted, background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', textDecoration: 'underline' }
                      }, 'Clear all quests')
                    )
                  ),
                  // Save button
                  h('button', {
                    type: 'button',
                    disabled: selectedBuilderToolIds.length === 0,
                    onClick: _saveBuilderAsStation,
                    'aria-label': 'Save this station',
                    style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: selectedBuilderToolIds.length === 0 ? _t.btnBg : _t.pinkAccent, color: selectedBuilderToolIds.length === 0 ? _t.textMuted : _t.onPink, fontSize: 12, fontWeight: 700, cursor: selectedBuilderToolIds.length === 0 ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }
                  }, '💾 Save Station')
                );
              })()
            )
          ),
          // Grid
          h('div', { style: { display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: isCompact ? 10 : 16 } },
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
              var shortDesc = _selShortDesc(tool);
              var teacherCue = _teacherToolCue(tool.id);

              return h('button', {
                key: tool.id,
                'data-sel-tool-card-id': tool.id,
                onClick: function() {
                  openSelToolById(tool.id, tool.label);
                },
                'aria-label': tool.label + (tool.recommendedRange ? ' (Grades ' + tool.recommendedRange + ')' : '') + (shortDesc ? '. ' + shortDesc : '') + (teacherCue ? '. Teacher cue: ' + teacherCue.time + ', ' + teacherCue.format + '. ' + teacherCue.cue : ''),
                title: tool.desc || tool.label,
                style: {
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  padding: isCompact ? 14 : 16, borderRadius: 8, border: '1px solid ' + _t.border,
                  background: _t.bgCard,
                  cursor: isRegistered ? 'pointer' : 'default',
                  opacity: isRegistered ? 1 : 0.5,
                  textAlign: 'left', transition: 'transform 0.15s, box-shadow 0.15s',
                  position: 'relative'
                },
                onMouseEnter: function(e) { if (isRegistered) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px ' + cardColor + '33'; } },
                onMouseLeave: function(e) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; },
                onTouchStart: function(e) { if (isRegistered) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 20px ' + cardColor + '33'; } },
                onTouchEnd: function(e) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 24 } }, tool.icon),
                  h('span', { style: { fontSize: 14, fontWeight: 700, color: _t.text, flex: 1 } }, tool.label),
                  // Usage indicator: dot count / star for tools already visited.
                  // Hidden from SR (already in aria-label of the card if needed).
                  isRegistered && (function () {
                    var u = selToolUsage[tool.id];
                    if (!u || !u.count) {
                      return null;
                    }
                    if (u.count >= 5) {
                      return h('span', { 'aria-hidden': 'true', title: u.count + ' visits', style: { fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: cardColor + '22', color: cardColor } }, '★');
                    }
                    return h('span', { 'aria-hidden': 'true', title: u.count + (u.count === 1 ? ' visit' : ' visits'), style: { fontSize: 9, color: cardColor, letterSpacing: '1px' } }, '•'.repeat(Math.min(u.count, 4)));
                  })()
                ),
                h('p', { style: { margin: 0, fontSize: 11, color: _t.textMuted, lineHeight: 1.4 } }, shortDesc),
                teacherCue && h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 2 } },
                  h('span', { style: { fontSize: 10, color: _t.textMuted, fontWeight: 800 } }, teacherCue.time + ' | ' + teacherCue.format),
                  teacherCue.sensitive && h('span', {
                    style: { fontSize: 9, fontWeight: 900, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase' }
                  }, 'Preview first')
                ),
                // Evidence-tradition pill (sourced from sel_standards_alignment.js)
                (function() {
                  if (!window.SelHubStandards || !window.SelHubStandards.alignments) return null;
                  var align = window.SelHubStandards.alignments[tool.id];
                  if (!align) return null;
                  var tag = null;
                  if (align.other && align.other.length > 0) {
                    tag = align.other[0].framework;
                  } else if (align.casel && align.casel.length > 0) {
                    tag = 'CASEL';
                  }
                  if (!tag) return null;
                  return h('span', {
                    'aria-label': 'Evidence tradition: ' + tag,
                    style: { display: 'inline-block', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: cardColor + '22', color: cardColor, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 4, alignSelf: 'flex-start' }
                  }, tag);
                })(),
                // Evidence-base badge (honesty signal; see _evidenceBase above)
                (function() {
                  var ev = _evidenceBase[tool.id];
                  if (!ev) return null;
                  var tierMeta = _evidenceTiers[ev.tier];
                  if (!tierMeta) return null;
                  var srText = 'Evidence base: ' + tierMeta.label + '. ' + tierMeta.title + (ev.note ? '. ' + ev.note : '') + '.';
                  return h('span', {
                    'aria-label': srText,
                    title: srText,
                    style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: tierMeta.bg, color: tierMeta.color, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 4, alignSelf: 'flex-start' }
                  },
                    h('span', { 'aria-hidden': 'true', style: { width: 6, height: 6, borderRadius: '50%', background: tierMeta.color, display: 'inline-block', flexShrink: 0 } }),
                    tierMeta.label
                  );
                })(),
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
            h('p', { style: { fontSize: 12 } }, 'Try calm, feelings, stress, friend, write, decision, or sleep.')
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

          // ── Theme (host light / dark / high-contrast + reduced motion) ──
          // The hub already detects these; this exposes them to tools so they
          // no longer have to hardcode a single palette. theme.palette mirrors
          // the hub's _t tokens (bg, bgCard, bgInput, text, textMuted, border,
          // headerBg, headerText, btnBg, btnText, accent). isContrast is the
          // WCAG high-contrast case; reduceMotion gates animation. Tools opt in
          // by reading ctx.theme; absent that, they keep their current look.
          theme: {
            isDark: isDark,
            isContrast: isContrast,
            reduceMotion: _reduceMotion,
            palette: _t
          },

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
          selectedVoice: selectedVoice,
          activeSessionCode: activeSessionCode,

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
          saveSnapshot: _saveSelCheckpoint,
          saveCheckpoint: _saveSelCheckpoint,
          getSavePolicy: _selCheckpointSavePolicy,
          savePolicy: _selCheckpointSavePolicy(selHubTool),

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
          themePalette: _t,

          // ── Full props passthrough ──
          props: props || {}
        };

        console.log('[SelHub] Rendering plugin: ' + selHubTool);
        try {
          // Wrap plugin render in a stable React component per tool so hooks are isolated.
          if (!window.__selPluginComponents) window.__selPluginComponents = {};
          if (!window.__selPluginComponents[selHubTool]) {
            window.__selPluginComponents[selHubTool] = function SelPluginBridge(props) {
              // On unmount (or toolId change), invoke the registered tool's
              // cleanup if it defined one. Opt-in: tools without `cleanup` are
              // unaffected. Used by tools with module-scope timers (e.g.
              // mindfulness breath pacer, coping PMR/movement) to clear
              // intervals so they don't keep firing after a tool switch.
              React.useEffect(function() {
                return function() {
                  var entry = window.SelHub && window.SelHub._registry && window.SelHub._registry[props._toolId];
                  if (entry && typeof entry.cleanup === 'function') {
                    try { entry.cleanup(); } catch (e) { console.warn('[SelHub] cleanup error for ' + props._toolId, e); }
                  }
                };
              }, [props._toolId]);
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
            h('button', { 'aria-label': 'Back to Tools',
              onClick: function() { var fromTool = selHubTool; setSelHubTool(null); alloFocusToolCard(fromTool); },
              style: { padding: '8px 20px', borderRadius: 8, background: _t.accent, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }
            }, '\u2190 Back to Tools')
          );
        }
      }

      // ── Loading state (tool selected but plugin not yet loaded) ──
      if (selHubTool && !toolContent) {
        toolContent = h('div', { style: { padding: 60, textAlign: 'center', color: _t.textMuted } },
          h('div', { 'aria-hidden': 'true',
            style: {
              fontSize: 40, marginBottom: 16,
              animation: _reduceMotion ? 'none' : 'pulse 2s ease-in-out infinite'
            }
          }, '\u2764\uFE0F\u200D\uD83D\uDD25'),
          h('p', { style: { fontWeight: 700, fontSize: 16, marginBottom: 4, color: _t.text } }, 'Loading tool...'),
          h('p', { style: { fontSize: 12 } }, 'The plugin file is still being fetched.'),
          h('button', {
            onClick: function() { var fromTool = selHubTool; setSelHubTool(null); alloFocusToolCard(fromTool); },
            style: { marginTop: 16, padding: '8px 20px', borderRadius: 8, background: _t.btnBg, color: _t.btnText, fontWeight: 600, border: _t.btnBorder, cursor: 'pointer' }
          }, '\u2190 Back to Tools')
        );
      }

      // ── Full-screen modal shell ──
      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': 'SEL Hub',
        // allo-docsuite = the generated theme-remap scope (gen_docsuite_theme.cjs).
        // It themes the 4 Tailwind-className tools (civicaction/cultureexplorer/
        // ethicalreasoning/selfadvocacy); the 66 inline-hex tools carry their own
        // _xxC remaps and are untouched by class-based CSS.
        className: 'allo-docsuite',
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
        ),
        // CHANGE 1 + CHANGE 3: stacked above the hub modal via zIndex
        ephemeralExplainerModal,
        forEducatorsModal,
        clearSelDataConfirmModal,
        sharePacketModal
      );
    };
  }
})();
