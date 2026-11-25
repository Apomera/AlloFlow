// ═══════════════════════════════════════════════════════════════
// sel_tool_bodystory.js — Body Story
// A body-acceptance and embodiment tool for adolescents. Built on
// Tylka's body appreciation framework, intuitive eating principles
// (Tribole & Resch), media literacy (Beauty Redefined), and
// inclusive body-neutrality work.
//
// Explicitly NOT weight-focused, NOT a screener, NOT diet-adjacent.
// Strong NEDA referral framing. Inclusive of all bodies, all
// genders, disability, race, size.
//
// Registered tool ID: "bodyStory"
// Category: care-of-self
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';
  if (typeof window !== 'object' || !window) return;

  window.SelHub = (window.SelHub && typeof window.SelHub === 'object') ? window.SelHub : {
    _registry: Object.create(null), _order: [],
    registerTool: function(id, config) {
      if (typeof id !== 'string' || !id || id === '__proto__' || id === 'constructor' || id === 'prototype' || !config || typeof config !== 'object') return;
      config.id = id; config.ready = config.ready !== false; this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    isRegistered: function(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(this._registry, id) && !!this._registry[id]; },
    renderTool: function(id, ctx) { var tool = (typeof id === 'string' && Object.prototype.hasOwnProperty.call(this._registry, id)) ? this._registry[id] : null; if (!tool || typeof tool.render !== 'function') return null; return tool.render(ctx); }
  };

  if (window.SelHub.isRegistered && window.SelHub.isRegistered('bodyStory')) return;

  var _bodLocalCrisisRe = /\b(kill\s+myself|end\s+my\s+life|want\s+to\s+die|suicid(?:e|al)|hurt\s+myself|self[\s-]?harm|cut(?:ting)?\s+myself|overdose|no\s+reason\s+to\s+live)\b/i;

  function ensureLiveRegion() {
    if (typeof document !== 'object' || !document || !document.body || typeof document.getElementById !== 'function') return null;
    var existing = document.getElementById('allo-live-body');
    if (existing) return existing;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-body';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
    return liveRegion;
  }
  ensureLiveRegion();

  // The live region above was created at load and never written to. These
  // messages are the only feedback for a button that would otherwise do
  // nothing at all when a field is empty.
  var _bodAnnounce = function(msg) {
    try {
      var lr = ensureLiveRegion();
      if (!lr) return;
      lr.textContent = '';
      setTimeout(function() { try { lr.textContent = String(msg || ''); } catch (_) {} }, 30);
    } catch (e) {}
  };

  function defaultState() {
    return {
      view: 'home',
      // Things my body does for me
      bodyDoes: [],
      // Pressures I notice
      pressures: [],
      // Critical voices (where they come from, what they say)
      criticalVoices: '',
      // Functions I appreciate
      appreciation: '',
      // Media diet audit
      mediaInflows: [],
      mediaCuts: [],
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  // What bodies DO (function-focused, not appearance-focused)
  var BODY_FUNCTIONS = [
    { id: 'breathe',  label: 'Breathing all day without my having to think about it', icon: '🫁' },
    { id: 'walk',     label: 'Walking, running, moving me through the world', icon: '🚶' },
    { id: 'see',      label: 'Letting me see colors, faces, the sky', icon: '👁️' },
    { id: 'hear',     label: 'Letting me hear music, voices I love, laughter', icon: '👂' },
    { id: 'touch',    label: 'Feeling textures, warmth, hugs', icon: '✋' },
    { id: 'eat',      label: 'Tasting food I enjoy', icon: '🍎' },
    { id: 'sleep',    label: 'Recovering during sleep', icon: '🌙' },
    { id: 'heal',     label: 'Healing from injuries and illness', icon: '🩹' },
    { id: 'speak',    label: 'Speaking, singing, expressing what I think', icon: '🗣️' },
    { id: 'create',   label: 'Creating things — art, music, writing, building', icon: '🎨' },
    { id: 'connect',  label: 'Connecting with people I love', icon: '🤝' },
    { id: 'play',     label: 'Playing — sports, dance, games, fun', icon: '⚽' },
    { id: 'learn',    label: 'Learning new things every day', icon: '🧠' },
    { id: 'feel',     label: 'Feeling emotions — joy, sadness, all of them', icon: '💛' },
    { id: 'rest',     label: 'Resting when I need it', icon: '🛋️' },
    { id: 'carry',    label: 'Carrying me through hard times', icon: '🌊' }
  ];

  var PRESSURE_STARTERS = [
    'Social media feeds I scroll',
    'Specific influencers / celebrities',
    'Diet culture / "wellness" content',
    'Comments from family',
    'Comments from peers',
    'Comparing myself to friends',
    'Sports / activity expectations',
    'Clothing not fitting / not available in my size',
    'Medical settings that focus on weight',
    'Photos / mirrors',
    'Performing on stage / video / camera',
    'Gendered expectations about how my body "should" look',
    'Racial / cultural beauty standards that exclude me',
    'Disability not represented in media'
  ];

  window.SelHub.registerTool('bodyStory', {
    icon: '🫂',
    label: 'Body Story',
    desc: 'A body-acceptance and embodiment tool. NOT weight-focused, NOT diet-adjacent, NOT a screener. Built on Tylka body appreciation, intuitive eating principles, and media literacy. Inclusive of all bodies, all genders, all sizes. Strong NEDA referral framing.',
    color: 'rose',
    category: 'care-of-self',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _bodT = (ctx && ctx.theme) || {};
      var _bodHC = !!_bodT.isContrast, _bodL = !_bodHC && !_bodT.isDark;
      var _bod_BGL = {'#0f172a':'#f8fafc','#1e293b':'#ffffff'}, _bod_BGH = {'#0f172a':'#000000','#1e293b':'#000000','#b45309':'#000000','#ef4444':'#000000','#15803d':'#000000','#fff':'#000000','#0ea5e9':'#000000','#a855f7':'#000000','#ec4899':'#000000'};
      var _bod_FGL = {'#cbd5e1':'#334155','#fda4af':'#9f1239','#94a3b8':'#475569','#64748b':'#475569','#fecaca':'#b91c1c','#fca5a5':'#991b1b','#e2e8f0':'#1e293b','#c4b5fd':'#5b21b6','#7dd3fc':'#075985','#fde68a':'#92400e','#e9d5ff':'#581c87','#fbcfe8':'#9d174d','#fcd34d':'#78350f','#fecdd3':'#9f1239','#bae6fd':'#075985','#bbf7d0':'#166534','#0ea5e9':'#0369a1','#f59e0b':'#92400e','#a855f7':'#6d28d9','#ec4899':'#9d174d'}, _bod_FGH = {'#a855f7':'#ffff00','#ec4899':'#ffff00','#f59e0b':'#ffff00','#cbd5e1':'#ffff00','#fda4af':'#ffff00','#94a3b8':'#ffff00','#fecaca':'#ffff00','#fca5a5':'#ffff00','#fecdd3':'#ffff00','#e2e8f0':'#ffff00','#c4b5fd':'#ffff00','#bae6fd':'#ffff00','#0ea5e9':'#ffff00','#7dd3fc':'#ffff00','#fde68a':'#ffff00','#fff':'#ffff00','#e9d5ff':'#ffff00','#bbf7d0':'#ffff00','#fbcfe8':'#ffff00','#fcd34d':'#ffff00','#0f172a':'#ffff00','#64748b':'#ffff00','#475569':'#ffff00'};
      var _bod_BDL = {'#334155':'#e2e8f0','#1e293b':'#e5e7eb','#475569':'#cbd5e1'}, _bod_BDH = {'#334155':'#ffff00','#ef4444':'#ffff00','#1e293b':'#ffff00','#fb7185':'#ffff00','#a855f7':'#ffff00','#0ea5e9':'#ffff00','#f59e0b':'#ffff00','#22c55e':'#ffff00','#ec4899':'#ffff00','#475569':'#ffff00','#cbd5e1':'#ffff00','#be123c':'#ffff00'};
      var _bodBg = function(h){ return _bodHC ? (_bod_BGH[h]||h) : (_bodL ? (_bod_BGL[h]||h) : h); };
      var _bodFg = function(h){ return _bodHC ? (_bod_FGH[h]||h) : (_bodL ? (_bod_FGL[h]||h) : h); };
      var _bodBd = function(h){ return _bodHC ? (_bod_BDH[h]||h) : (_bodL ? (_bod_BDL[h]||h) : h); };
      // white text needs a 700-weight fill (1.4.3)
      var _bodSolid = function(c){ return _bodHC ? c : ({'#0ea5e9':'#0369a1','#38bdf8':'#0369a1','#0284c7':'#0369a1','#f59e0b':'#b45309','#fbbf24':'#b45309','#d97706':'#b45309','#22c55e':'#15803d','#16a34a':'#15803d','#4ade80':'#15803d','#10b981':'#047857','#059669':'#047857','#ef4444':'#b91c1c','#f87171':'#b91c1c','#dc2626':'#b91c1c','#fb7185':'#be123c','#3b82f6':'#1d4ed8','#60a5fa':'#1d4ed8','#6366f1':'#4338ca','#818cf8':'#4338ca','#a855f7':'#7e22ce','#a78bfa':'#6d28d9','#8b5cf6':'#6d28d9','#ec4899':'#be185d','#f472b6':'#be185d','#14b8a6':'#0f766e','#0d9488':'#0f766e','#06b6d4':'#0e7490','#0891b2':'#0e7490','#f97316':'#c2410c'}[String(c).toLowerCase()] || c); };
      if (!ctx || typeof ctx !== 'object' || !ctx.React || typeof ctx.React.createElement !== 'function') return null;
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = (ctx.toolData && typeof ctx.toolData === 'object' && !Array.isArray(ctx.toolData)) ? ctx.toolData : {};
      var setLabToolData = typeof ctx.setToolData === 'function' ? ctx.setToolData : function() {};
      var setSelHubTool = typeof ctx.setSelHubTool === 'function' ? ctx.setSelHubTool : function() {};
      var announceToSR = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : null;
      var onSafetyFlag = typeof ctx.onSafetyFlag === 'function' ? ctx.onSafetyFlag : null;
      var _bodBand = (ctx && ctx.gradeBand) || 'high';
      function safeStr(v) { return typeof v === 'string' ? v : ''; }
      function safeStrList(v) { return Array.isArray(v) ? v.filter(function(item) { return typeof item === 'string'; }) : []; }
      function isImeComposing(e) {
        return !!(e && (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229 || (e.nativeEvent && e.nativeEvent.keyCode === 229)));
      }
      function announceBody(msg) {
        if (typeof announceToSR === 'function') { try { announceToSR(msg); } catch (_) {} }
        _bodAnnounce(msg);
      }

      var rawBod = labToolData.bodyStory;
      var d = (rawBod && typeof rawBod === 'object' && !Array.isArray(rawBod)) ? rawBod : defaultState();
      function setB(patch) {
        setLabToolData(function(prev) {
          var base = (prev && typeof prev === 'object' && !Array.isArray(prev)) ? prev : {};
          var prevRaw = base.bodyStory;
          var prior = (prevRaw && typeof prevRaw === 'object' && !Array.isArray(prevRaw)) ? prevRaw : defaultState();
          var resolved = typeof patch === 'function' ? patch(prior) : patch;
          if (!resolved || typeof resolved !== 'object') return base;
          var next = Object.assign({}, prior, resolved);
          next.lastUpdated = todayISO();
          return Object.assign({}, base, { bodyStory: next });
        });
      }
      function scanBodyText(text) {
        var trimmed = String(text || '').trim();
        if (!trimmed) return false;
        var blocked = false;
        var sh = (typeof window === 'object' && window && window.SelHub) ? window.SelHub : null;
        try {
          if (sh && typeof sh.safeRehearseCheck === 'function') {
            var chk = sh.safeRehearseCheck(trimmed, { toolId: 'bodyStory', onSafetyFlag: onSafetyFlag });
            if (chk && chk.action === 'block') blocked = true;
          }
          if (!blocked && sh && typeof sh.scanForCrisis === 'function') {
            var scan = sh.scanForCrisis(trimmed);
            if (scan && (scan.triggered || scan.hasCrisis)) {
              blocked = true;
              if (typeof onSafetyFlag === 'function') {
                try { onSafetyFlag({ toolId: 'bodyStory', tier: 3, snippet: trimmed.slice(0, 120) }); } catch (_) {}
              }
            }
          }
          if (!blocked && !(sh && (typeof sh.safeRehearseCheck === 'function' || typeof sh.scanForCrisis === 'function')) && _bodLocalCrisisRe.test(trimmed)) {
            blocked = true;
            if (typeof onSafetyFlag === 'function') {
              try { onSafetyFlag({ toolId: 'bodyStory', tier: 3, snippet: trimmed.slice(0, 120) }); } catch (_) {}
            }
          }
          if (blocked) {
            setB({ _crisisTier: 3 });
            if (sh && typeof sh.showCrisisModal === 'function') {
              sh.showCrisisModal({ toolName: 'Body Story', contentSnippet: trimmed });
            }
            announceBody('Support resources are shown on this screen. Call or text 988 or text HOME to 741741.');
          }
        } catch (_) {}
        return blocked;
      }
      var VALID_VIEWS = { home: 1, function: 1, pressures: 1, voices: 1, media: 1, print: 1, about: 1 };
      var view = (d.view && Object.prototype.hasOwnProperty.call(VALID_VIEWS, d.view)) ? d.view : 'home';
      function goto(v) { setB({ view: (v && Object.prototype.hasOwnProperty.call(VALID_VIEWS, v)) ? v : 'home' }); }
      function printNow() { try { if (typeof window === 'object' && window && typeof window.print === 'function') window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { type: 'button', onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: _bodHC ? '#000000' : 'rgba(255,255,255,0.05)', border: '1px solid ' + _bodBd('#334155'), borderRadius: 8, padding: '10px 14px', minHeight: 44, cursor: 'pointer', color: _bodFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _bodFg('#fda4af'), fontSize: 22, fontWeight: 900 } }, '🫂 Body Story'),
            h('div', { style: { fontSize: 12, color: _bodFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'Your body is not a problem to be solved.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Frame', icon: '🫂' },
          { id: 'function', label: 'What my body does', icon: '🌊' },
          { id: 'pressures', label: 'Where the pressure comes from', icon: '🌪️' },
          { id: 'voices', label: 'The critical voice', icon: '💭' },
          { id: 'media', label: 'Media diet', icon: '📺' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Body Story sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t, idx) {
            var active = view === t.id;
            return h('button', { key: t.id, type: 'button', id: 'bod-tab-' + t.id, onClick: function() { goto(t.id); },
              onKeyDown: function(ev) {
                if (isImeComposing(ev) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
                var nextIdx = idx;
                if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') nextIdx = (idx + 1) % tabs.length;
                else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') nextIdx = (idx - 1 + tabs.length) % tabs.length;
                else if (ev.key === 'Home') nextIdx = 0;
                else if (ev.key === 'End') nextIdx = tabs.length - 1;
                else return;
                ev.preventDefault();
                goto(tabs[nextIdx].id);
                setTimeout(function() {
                  try {
                    if (typeof document === 'object' && document && typeof document.getElementById === 'function') {
                      var nextBtn = document.getElementById('bod-tab-' + tabs[nextIdx].id);
                      if (nextBtn && typeof nextBtn.focus === 'function') nextBtn.focus();
                    }
                  } catch (_) {}
                }, 0);
              },
              role: 'tab', 'aria-selected': active, 'aria-controls': 'bod-tab-panel', tabIndex: active ? 0 : -1,
              style: { padding: '10px 14px', minHeight: 44, borderRadius: 8, border: '1px solid ' + (active ? _bodBd('#fb7185') : _bodBd('#334155')),
                background: active ? (_bodHC ? '#000000' : 'rgba(251,113,133,0.18)') : _bodBg('#1e293b'),
                color: active ? _bodFg('#fecdd3') : _bodFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function safetyBanner() {
        return h('div', { style: { padding: 12, borderRadius: 10, background: _bodHC ? '#000000' : 'rgba(239,68,68,0.10)', borderTop: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(239,68,68,0.4)'), borderRight: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(239,68,68,0.4)'), borderBottom: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(239,68,68,0.4)'), borderLeft: '3px solid ' + _bodBd('#ef4444'), marginBottom: 12, fontSize: 12.5, color: _bodFg('#fecaca'), lineHeight: 1.65 } },
          h('strong', null, '🆘 If you are restricting food, purging, exercising compulsively, or thinking constantly about food and your body — please get help. '),
          'These can be life-threatening. Call the National Alliance for Eating Disorders Helpline at 1-866-662-1235 (staffed by licensed clinicians, weekdays). For an immediate crisis, call or text 988, or text HOME to 741741. For information and how to find treatment, see ',
          h('a', { href: 'https://www.nationaleatingdisorders.org/', target: '_blank', rel: 'noopener noreferrer',
            style: { color: _bodFg('#fca5a5'), textDecoration: 'underline', fontWeight: 800 } }, 'nationaleatingdisorders.org ↗'),
          '. Eating disorders are treatable, and the earlier you get help, the better. Tell a trusted adult today.'
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: _bodBg('#0f172a'), border: '1px solid ' + _bodBd('#334155'), fontSize: 11, color: _bodFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'This tool is reflective practice, not therapy. Eating disorders and severe body distress need clinical care. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — the frame
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: _bodHC ? '#000000' : (_bodL ? '#f8fafc' : 'linear-gradient(135deg, rgba(251,113,133,0.16) 0%, rgba(15,23,42,0.4) 60%)'), border: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(251,113,133,0.4)'), marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: _bodFg('#fecdd3'), marginBottom: 4 } }, 'Your body is not a project.'),
            h('p', { style: { margin: '0 0 10px', color: _bodFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.7 } },
              'You live in a culture that has spent billions of dollars convincing you that your body is wrong and that you should fix it. The "wrong" changes with the era — too thin, too thick, too curvy, too flat, too tall, too dark, too pale, too disabled. It is a moving target. It is meant to be a moving target. A body that is permanently insecure is a body that buys products.'
            ),
            h('p', { style: { margin: 0, color: _bodFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.7 } },
              'This tool is built around a different frame: your body is not for looking at. Your body is for LIVING. It is the thing that gets you through your life. It is doing thousands of things right now to keep you alive. The work is not to make it look different. The work is to come back home to it.'
            )
          ),

          // The three traps
          h('div', { style: { padding: 14, borderRadius: 10, background: _bodBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #fb7185', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _bodFg('#fda4af'), marginBottom: 10 } }, '🪤 Three traps to know about'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _bodFg('#e2e8f0'), fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: _bodFg('#fda4af') } }, 'Body positivity '), 'can become its own pressure: "I should love every part of my body all the time." Most people don\'t feel that way about ANYTHING. A neutral relationship with your body — "this is the body I live in; it is doing its job" — is more honest and more sustainable than forced positivity.'),
              h('li', null, h('strong', { style: { color: _bodFg('#fda4af') } }, 'Wellness culture '), 'is often diet culture in different packaging. "Clean eating," "detox," "lifestyle," "wellness." When the underlying logic is "your body needs to be smaller / different / better," the diet industry has just put on a new outfit.'),
              h('li', null, h('strong', { style: { color: _bodFg('#fda4af') } }, 'Body comparison '), 'is built into being on social media. Every scroll trains your brain to compare. The fix is rarely "compare differently"; the fix is often "spend less time in the comparison environment."')
            )
          ),

          // Inclusive frame
          h('div', { style: { padding: 14, borderRadius: 10, background: _bodBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _bodFg('#c4b5fd'), marginBottom: 10 } }, '🌐 Whose body? Inclusive frame'),
            h('p', { style: { margin: '0 0 10px', color: _bodFg('#e2e8f0'), fontSize: 13, lineHeight: 1.7 } },
              'Body distress is shaped by who you are. Different bodies face different pressures:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _bodFg('#cbd5e1'), fontSize: 12.5, lineHeight: 1.8 } },
              h('li', null, 'Fat bodies face fatphobia, both individual and structural (clothes, seats, medical care).'),
              h('li', null, 'Disabled bodies face ableism — being made invisible, made spectacle, or both.'),
              h('li', null, 'Black, brown, and Asian bodies face beauty standards that center whiteness.'),
              h('li', null, 'Trans and non-binary bodies face dysphoria and societal misgendering.'),
              h('li', null, 'Female-coded bodies face a lifetime of objectification from outside.'),
              h('li', null, 'Male-coded bodies face increasing muscle-and-leanness pressure (often invisible to the rest of the family).'),
              h('li', null, 'Athletic bodies face performance demands that can become eating disorder territory.')
            ),
            h('p', { style: { margin: '10px 0 0', color: _bodFg('#cbd5e1'), fontSize: 12.5, lineHeight: 1.7, fontStyle: 'italic' } },
              'The work is not the same for everyone. The frame ("body is for living, not for looking") applies; what makes that hard differs.'
            )
          ),

          // Roadmap
          h('div', { style: { fontSize: 11, color: _bodFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 } }, 'Sections in this tool'),
          stepCard('🌊 What my body does (not how it looks)', 'List the functions your body performs that you actually appreciate. Tylka\'s framework: functional appreciation builds body acceptance.', function() { goto('function'); }, '#0ea5e9'),
          stepCard('🌪️ Where the pressure comes from', 'Inventory the specific sources of body pressure in your life. Naming them takes their power down.', function() { goto('pressures'); }, '#f59e0b'),
          stepCard('💭 The critical voice', 'Whose voice is the harshest in your head about your body? Where did you learn that voice?', function() { goto('voices'); }, '#a855f7'),
          stepCard('📺 Media diet audit', 'What feeds, accounts, content do you let into your eyes daily? What is doing harm? What could you cut?', function() { goto('media'); }, '#ec4899'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { type: 'button', onClick: onClick, 'aria-label': title,
          style: { width: '100%', minHeight: 44, textAlign: 'left', padding: 14, borderRadius: 10, borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: _bodBg('#0f172a'), cursor: 'pointer', marginBottom: 8, color: _bodFg('#e2e8f0') } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: _bodFg(color), marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _bodFg('#94a3b8'), lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // FUNCTION — what my body does
      // ═══════════════════════════════════════════════════════════
      function renderFunction() {
        function toggleFunction(id) {
          setB(function(prior) {
            var list = (Array.isArray(prior.bodyDoes) ? prior.bodyDoes : []).slice();
            var idx = list.indexOf(id);
            if (idx >= 0) list.splice(idx, 1); else list.push(id);
            return { bodyDoes: list };
          });
        }

        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: _bodHC ? '#000000' : 'rgba(14,165,233,0.10)', borderTop: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(14,165,233,0.3)'), borderRight: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(14,165,233,0.3)'), borderBottom: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(14,165,233,0.3)'), borderLeft: '3px solid ' + _bodBd('#0ea5e9'), marginBottom: 14, fontSize: 13, color: _bodFg('#bae6fd'), lineHeight: 1.7 } },
            h('strong', null, '🌊 Tylka\'s functional appreciation framework. '),
            'Research shows that focusing on what your body DOES (function) builds a more durable relationship with your body than trying to feel positive about how it LOOKS. Mark every function your body performs that you actually appreciate, even a little.'
          ),

          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 14 } },
            BODY_FUNCTIONS.map(function(f) {
              var selected = (Array.isArray(d.bodyDoes) ? d.bodyDoes : []).indexOf(f.id) !== -1;
              return h('button', { key: f.id, type: 'button', onClick: function() { toggleFunction(f.id); }, 'aria-pressed': selected, 'aria-label': f.label,
                style: { minHeight: 44, textAlign: 'left', padding: 12, borderRadius: 8, border: '2px solid ' + (selected ? _bodBd('#0ea5e9') : _bodBd('#1e293b')), background: selected ? (_bodHC ? '#000000' : 'rgba(14,165,233,0.10)') : _bodBg('#0f172a'), cursor: 'pointer', color: _bodFg('#e2e8f0') } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
                  h('span', { style: { fontSize: 18 } }, f.icon),
                  h('span', { style: { fontSize: 12, color: selected ? _bodFg('#7dd3fc') : _bodFg('#cbd5e1'), lineHeight: 1.5 } }, f.label),
                  selected ? h('span', { style: { marginLeft: 'auto', fontSize: 12, color: _bodFg('#0ea5e9') } }, '✓') : null
                )
              );
            })
          ),

          // Open reflection
          h('div', { style: { padding: 14, borderRadius: 10, background: _bodBg('#0f172a'), borderTop: '1px solid ' + _bodBd('#1e293b'), borderRight: '1px solid ' + _bodBd('#1e293b'), borderBottom: '1px solid ' + _bodBd('#1e293b'), borderLeft: '3px solid ' + _bodBd('#0ea5e9') } },
            h('label', { htmlFor: 'b-appreciation', style: { display: 'block', fontSize: 12, color: _bodFg('#7dd3fc'), fontWeight: 800, marginBottom: 6 } }, 'What else does my body do that I want to name?'),
            h('div', { style: { fontSize: 11, color: _bodFg('#94a3b8'), marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'Be specific. Not vague positivity; concrete functions. "My hands held my friend\'s hand when they were scared." "My legs carried me through a really long bus ride."'),
            h('textarea', { id: 'b-appreciation', value: safeStr(d.appreciation),
              placeholder: 'My body...',
              onChange: function(e) { setB({ appreciation: e.target.value }); },
              onBlur: function(e) { scanBodyText(e.target.value); },
              style: { width: '100%', minHeight: 130, padding: 10, borderRadius: 6, border: '1px solid ' + _bodBd('#334155'), background: _bodBg('#1e293b'), color: _bodFg('#e2e8f0'), fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRESSURES
      // ═══════════════════════════════════════════════════════════
      function renderPressures() {
        var pressuresList = safeStrList(d.pressures);
        function togglePressure(label) {
          var removed = false;
          setB(function(prior) {
            var list = safeStrList(prior.pressures).slice();
            var idx = list.indexOf(label);
            if (idx >= 0) { list.splice(idx, 1); removed = true; } else { list.push(label); removed = false; }
            return { pressures: list };
          });
          announceBody(removed ? 'Removed ' + label + '.' : 'Added ' + label + '.');
        }
        function addCustom() {
          if (typeof document !== 'object' || !document || typeof document.getElementById !== 'function') return;
          var el = document.getElementById('b-pressure-input');
          if (!el || !el.value.trim()) { announceBody('Write something first, then press the button again.'); return; }
          var val = el.value.trim();
          if (scanBodyText(val)) { el.value = ''; return; }
          setB(function(prior) {
            var list = safeStrList(prior.pressures).slice();
            if (list.indexOf(val) === -1) list.push(val);
            return { pressures: list };
          });
          el.value = '';
          announceBody('Pressure source added.');
        }
        function remove(i) {
          setB(function(prior) {
            var list = safeStrList(prior.pressures).slice();
            if (i < 0 || i >= list.length) return prior;
            list.splice(i, 1);
            return { pressures: list };
          });
          announceBody('Pressure source removed.');
        }

        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: _bodHC ? '#000000' : 'rgba(245,158,11,0.10)', borderTop: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(245,158,11,0.3)'), borderRight: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(245,158,11,0.3)'), borderBottom: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(245,158,11,0.3)'), borderLeft: '3px solid ' + _bodBd('#f59e0b'), marginBottom: 14, fontSize: 13, color: _bodFg('#fde68a'), lineHeight: 1.7 } },
            h('strong', null, '🌪️ Naming the pressure sources. '),
            'Body distress is rarely random. It comes from specific places. Naming the specific sources is the first step toward deciding which ones you can change, which ones you can\'t, and which ones you can at least see for what they are.'
          ),

          // Selected pressures
          pressuresList.length > 0 ? h('div', { style: { padding: 12, borderRadius: 10, background: _bodBg('#0f172a'), borderTop: '1px solid ' + _bodBd('#1e293b'), borderRight: '1px solid ' + _bodBd('#1e293b'), borderBottom: '1px solid ' + _bodBd('#1e293b'), borderLeft: '3px solid ' + _bodBd('#f59e0b'), marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _bodFg('#fde68a'), fontWeight: 800, marginBottom: 8 } }, 'My pressure sources (' + pressuresList.length + ')'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              pressuresList.map(function(p, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px 2px 12px', borderRadius: 22, background: _bodBg('#1e293b'), border: '1px solid #f59e0b66', fontSize: 12, color: _bodFg('#e2e8f0') } },
                  h('span', null, p),
                  h('button', { type: 'button', onClick: function() { remove(i); }, 'aria-label': 'Remove ' + p,
                    style: { minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: _bodFg('#94a3b8'), cursor: 'pointer', fontSize: 12 } }, '✕')
                );
              })
            )
          ) : null,

          // Add custom
          h('div', { style: { padding: 14, borderRadius: 10, background: _bodBg('#0f172a'), borderTop: '1px solid ' + _bodBd('#1e293b'), borderRight: '1px solid ' + _bodBd('#1e293b'), borderBottom: '1px solid ' + _bodBd('#1e293b'), borderLeft: '3px solid ' + _bodBd('#f59e0b'), marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: _bodFg('#fde68a'), fontWeight: 800, marginBottom: 8 } }, '+ Add a pressure source'),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'b-pressure-input', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add pressure source'),
              h('input', { id: 'b-pressure-input', type: 'text', placeholder: 'Be specific...',
                onBlur: function(e) { scanBodyText(e.target.value); },
                onKeyDown: function(e) {
                  if (isImeComposing(e)) return;
                  if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
                  else if (e.key === 'Escape' && e.currentTarget && e.currentTarget.value) { e.preventDefault(); e.currentTarget.value = ''; }
                },
                style: { flex: 1, minWidth: 200, minHeight: 44, padding: 8, borderRadius: 6, border: '1px solid ' + _bodBd('#334155'), background: _bodBg('#1e293b'), color: _bodFg('#e2e8f0'), fontSize: 13 } }),
              h('button', { type: 'button', onClick: addCustom, 'aria-label': 'Add pressure',
                style: { padding: '10px 16px', minHeight: 44, borderRadius: 6, border: _bodHC ? '1px solid #ffff00' : 'none', cursor: 'pointer', background: _bodBg('#b45309'), color: _bodFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Add')
            )
          ),

          // Starter list
          h('div', { style: { padding: 12, borderRadius: 10, background: _bodBg('#0f172a'), border: '1px solid ' + _bodBd('#1e293b') } },
            h('div', { style: { fontSize: 12, color: _bodFg('#94a3b8'), fontWeight: 700, marginBottom: 10 } }, 'Common pressure sources (tap to select)'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              PRESSURE_STARTERS.map(function(p, i) {
                var selected = pressuresList.indexOf(p) !== -1;
                return h('button', { key: i, type: 'button', onClick: function() { togglePressure(p); }, 'aria-pressed': selected, 'aria-label': 'Toggle: ' + p,
                  style: { padding: '8px 12px', minHeight: 44, borderRadius: 22, border: '1px solid ' + (_bodHC ? '#ffff00' : '#f59e0b66'), background: selected ? (_bodHC ? '#000000' : 'rgba(245,158,11,0.18)') : _bodBg('#0f172a'), color: selected ? _bodFg('#fde68a') : _bodFg('#cbd5e1'), cursor: 'pointer', fontSize: 12 } },
                  (selected ? '✓ ' : '+ ') + p);
              })
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // VOICES
      // ═══════════════════════════════════════════════════════════
      function renderVoices() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 13, color: _bodFg('#e9d5ff'), lineHeight: 1.7 } },
            h('strong', null, '💭 The critical voice in your head is not yours. '),
            'It was put there. By comments, by ads, by feeds, by a family member, by a coach, by years of cumulative exposure. The voice feels like yours because it lives in your head, but you can trace where it came from. That tracing is part of how it gets quieter.'
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _bodBg('#0f172a'), borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7' } },
            h('label', { htmlFor: 'b-voices', style: { display: 'block', fontSize: 12, color: _bodFg('#c4b5fd'), fontWeight: 800, marginBottom: 6 } }, 'The critical voice about my body'),
            h('div', { style: { fontSize: 11, color: _bodFg('#94a3b8'), marginBottom: 8, lineHeight: 1.6, fontStyle: 'italic' } }, 'Try this structure: WHO does the voice sound like? (A specific person? A composite of media?) WHAT does it say? WHEN did you start hearing it? WHERE did it come from?'),
            h('textarea', { id: 'b-voices', value: safeStr(d.criticalVoices),
              placeholder: 'The voice sounds like... It says... I started hearing it when... It came from...',
              onChange: function(e) { setB({ criticalVoices: e.target.value }); },
              onBlur: function(e) { scanBodyText(e.target.value); },
              style: { width: '100%', minHeight: 180, padding: 10, borderRadius: 6, border: '1px solid ' + _bodBd('#334155'), background: _bodBg('#1e293b'), color: _bodFg('#e2e8f0'), fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical' } })
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: _bodHC ? '#000000' : 'rgba(34,197,94,0.10)', borderTop: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(34,197,94,0.3)'), borderRight: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(34,197,94,0.3)'), borderBottom: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(34,197,94,0.3)'), borderLeft: '3px solid ' + _bodBd('#22c55e'), marginTop: 14, fontSize: 13, color: _bodFg('#bbf7d0'), lineHeight: 1.7 } },
            h('strong', null, '💡 What helps: '),
            'naming the voice externalizes it. ("That\'s the diet-culture voice." "That\'s my mom\'s voice from when I was 10." "That\'s the voice that started after the comment in 8th grade gym class.") When the voice fires, you can name it instead of obeying it. The Compassion & Self-Talk tool in this SEL Hub helps with the next step: building a kinder inner voice.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // MEDIA — diet audit
      // ═══════════════════════════════════════════════════════════
      function renderMedia() {
        var inflowsList = safeStrList(d.mediaInflows);
        var cutsList = safeStrList(d.mediaCuts);
        function addInflow() {
          if (typeof document !== 'object' || !document || typeof document.getElementById !== 'function') return;
          var el = document.getElementById('b-media-in');
          if (!el || !el.value.trim()) { announceBody('Write something first, then press the button again.'); return; }
          var val = el.value.trim();
          if (scanBodyText(val)) { el.value = ''; return; }
          setB(function(prior) {
            var list = safeStrList(prior.mediaInflows).slice();
            list.push(val);
            return { mediaInflows: list };
          });
          el.value = '';
          announceBody('Media inflow added.');
        }
        function addCut() {
          if (typeof document !== 'object' || !document || typeof document.getElementById !== 'function') return;
          var el = document.getElementById('b-media-cut');
          if (!el || !el.value.trim()) { announceBody('Write something first, then press the button again.'); return; }
          var val = el.value.trim();
          if (scanBodyText(val)) { el.value = ''; return; }
          setB(function(prior) {
            var list = safeStrList(prior.mediaCuts).slice();
            list.push(val);
            return { mediaCuts: list };
          });
          el.value = '';
          announceBody('Media cut added.');
        }
        function removeInflow(i) {
          setB(function(prior) {
            var list = safeStrList(prior.mediaInflows).slice();
            if (i < 0 || i >= list.length) return prior;
            list.splice(i, 1);
            return { mediaInflows: list };
          });
          announceBody('Media inflow removed.');
        }
        function removeCut(i) {
          setB(function(prior) {
            var list = safeStrList(prior.mediaCuts).slice();
            if (i < 0 || i >= list.length) return prior;
            list.splice(i, 1);
            return { mediaCuts: list };
          });
          announceBody('Media cut removed.');
        }

        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: _bodHC ? '#000000' : 'rgba(236,72,153,0.10)', borderTop: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(236,72,153,0.3)'), borderRight: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(236,72,153,0.3)'), borderBottom: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(236,72,153,0.3)'), borderLeft: '3px solid ' + _bodBd('#ec4899'), marginBottom: 14, fontSize: 13, color: _bodFg('#fbcfe8'), lineHeight: 1.7 } },
            h('strong', null, '📺 Your eyes have a diet. '),
            'Every account you follow, every show you watch, every feed you scroll is feeding you images and ideas about bodies. Some of it is neutral. Some of it is actively harming you. An audit makes the harm visible so you can decide what to cut.'
          ),

          // Inflows
          h('div', { style: { padding: 14, borderRadius: 10, background: _bodBg('#0f172a'), borderTop: '1px solid ' + _bodBd('#1e293b'), borderRight: '1px solid ' + _bodBd('#1e293b'), borderBottom: '1px solid ' + _bodBd('#1e293b'), borderLeft: '3px solid ' + _bodBd('#ef4444'), marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _bodFg('#fca5a5'), marginBottom: 6 } }, '📥 What I currently let in (be honest)'),
            h('div', { style: { fontSize: 11, color: _bodFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, 'Apps, accounts, shows, magazines, specific influencers. The stuff you actually look at.'),
            inflowsList.length > 0 ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              inflowsList.map(function(item, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px 2px 12px', borderRadius: 22, background: _bodBg('#1e293b'), border: '1px solid rgba(239,68,68,0.4)', fontSize: 12, color: _bodFg('#fecaca') } },
                  h('span', null, item),
                  h('button', { type: 'button', onClick: function() { removeInflow(i); }, 'aria-label': 'Remove ' + item,
                    style: { minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: _bodFg('#94a3b8'), cursor: 'pointer', fontSize: 12 } }, '✕'));
              })
            ) : null,
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'b-media-in', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add to inflows'),
              h('input', { id: 'b-media-in', type: 'text', placeholder: 'Specific account, show, app, person',
                onBlur: function(e) { scanBodyText(e.target.value); },
                onKeyDown: function(e) {
                  if (isImeComposing(e)) return;
                  if (e.key === 'Enter') { e.preventDefault(); addInflow(); }
                  else if (e.key === 'Escape' && e.currentTarget && e.currentTarget.value) { e.preventDefault(); e.currentTarget.value = ''; }
                },
                style: { flex: 1, minWidth: 200, minHeight: 44, padding: 8, borderRadius: 6, border: '1px solid ' + _bodBd('#334155'), background: _bodBg('#1e293b'), color: _bodFg('#e2e8f0'), fontSize: 13 } }),
              h('button', { type: 'button', onClick: addInflow, 'aria-label': 'Add media inflow',
                style: { padding: '10px 16px', minHeight: 44, borderRadius: 6, border: _bodHC ? '1px solid #ffff00' : 'none', cursor: 'pointer', background: _bodBg(_bodSolid('#ef4444')), color: _bodFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Add')
            )
          ),

          // Cuts
          h('div', { style: { padding: 14, borderRadius: 10, background: _bodBg('#0f172a'), borderTop: '1px solid ' + _bodBd('#1e293b'), borderRight: '1px solid ' + _bodBd('#1e293b'), borderBottom: '1px solid ' + _bodBd('#1e293b'), borderLeft: '3px solid ' + _bodBd('#22c55e'), marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _bodFg('#bbf7d0'), marginBottom: 6 } }, '✂ What I will cut, mute, or unfollow'),
            h('div', { style: { fontSize: 11, color: _bodFg('#94a3b8'), marginBottom: 10, lineHeight: 1.55, fontStyle: 'italic' } }, 'For each thing you let in, ask: is this helping me come home to my body, or is it telling me I am wrong? If it is telling you you are wrong: unfollow, mute, delete, leave. The relief comes within days.'),
            cutsList.length > 0 ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              cutsList.map(function(item, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px 2px 12px', borderRadius: 22, background: _bodBg('#1e293b'), border: '1px solid rgba(34,197,94,0.4)', fontSize: 12, color: _bodFg('#bbf7d0') } },
                  h('span', null, '✂ ' + item),
                  h('button', { type: 'button', onClick: function() { removeCut(i); }, 'aria-label': 'Remove ' + item,
                    style: { minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: _bodFg('#94a3b8'), cursor: 'pointer', fontSize: 12 } }, '✕'));
              })
            ) : null,
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('label', { htmlFor: 'b-media-cut', className: 'sr-only', style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 } }, 'Add to cuts'),
              h('input', { id: 'b-media-cut', type: 'text', placeholder: 'What I will unfollow / mute / leave',
                onBlur: function(e) { scanBodyText(e.target.value); },
                onKeyDown: function(e) {
                  if (isImeComposing(e)) return;
                  if (e.key === 'Enter') { e.preventDefault(); addCut(); }
                  else if (e.key === 'Escape' && e.currentTarget && e.currentTarget.value) { e.preventDefault(); e.currentTarget.value = ''; }
                },
                style: { flex: 1, minWidth: 200, minHeight: 44, padding: 8, borderRadius: 6, border: '1px solid ' + _bodBd('#334155'), background: _bodBg('#1e293b'), color: _bodFg('#e2e8f0'), fontSize: 13 } }),
              h('button', { type: 'button', onClick: addCut, 'aria-label': 'Add media to cut',
                style: { padding: '10px 16px', minHeight: 44, borderRadius: 6, border: _bodHC ? '1px solid #ffff00' : 'none', cursor: 'pointer', background: _bodBg('#15803d'), color: _bodFg('#fff'), fontWeight: 700, fontSize: 12 } }, '+ Add')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', fontSize: 12.5, color: _bodFg('#e9d5ff'), lineHeight: 1.65 } },
            h('strong', null, '🌐 Replacement matters too: '),
            'cutting harmful content leaves an empty feed. Fill it with accounts that show varied bodies doing actual things: athletes of every size, disabled creators, transitioned folks who are at home in themselves, your own friends doing things they love. Beauty Redefined, NEDA, ASDAH, and individual creators like @nourishandeat, @bodyposipanda, @virgietovar, @sonyareneetaylor have all done this work publicly.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (typeof window === 'object' && window && window.SelHubStandards && typeof window.SelHubStandards.render === 'function' ? window.SelHubStandards.render('bodyStory', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.4)', borderRight: '1px solid rgba(239,68,68,0.4)', borderBottom: '1px solid rgba(239,68,68,0.4)', borderLeft: '4px solid #ef4444', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: _bodFg('#fca5a5'), fontSize: 16 } }, '🆘 If you are struggling with food and your body — please read this'),
            h('p', { style: { margin: '0 0 8px', color: _bodFg('#fecaca'), fontSize: 13.5, lineHeight: 1.7 } },
              'Eating disorders are serious mental illnesses with the second highest mortality rate of any psychiatric disorder. They are also TREATABLE — especially when caught early. Signs to take seriously:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: _bodFg('#fecaca'), fontSize: 13, lineHeight: 1.8 } },
              h('li', null, 'Restricting food intake, skipping meals systematically, severe calorie counting.'),
              h('li', null, 'Binge eating followed by guilt and shame.'),
              h('li', null, 'Purging (vomiting, laxatives, compulsive exercise).'),
              h('li', null, 'Thinking about food, weight, or your body for hours every day.'),
              h('li', null, 'Withdrawing from social eating, avoiding meals with family or friends.'),
              h('li', null, 'Significant weight change in either direction.'),
              h('li', null, 'Body checking constantly (mirrors, scales, photos).')
            ),
            h('p', { style: { margin: '8px 0 0', color: _bodFg('#fecaca'), fontSize: 13.5, lineHeight: 1.7 } },
              h('strong', null, 'Eating disorders affect every body, every gender, every race, every size. '),
              'They are NOT just a "thin white girl" problem. Black, brown, fat, masculine, and disabled people often go undiagnosed BECAUSE of stereotypes. If you are struggling, you are not alone, and you deserve help.'),
            h('p', { style: { margin: '8px 0 0', color: _bodFg('#fecaca'), fontSize: 13.5, lineHeight: 1.7 } },
              h('strong', null, 'Get help: '),
              'National Alliance for Eating Disorders Helpline 1-866-662-1235 (licensed clinicians, weekdays). Immediate crisis: call or text 988, or text HOME to 741741. Information and treatment finder at ',
              h('a', { href: 'https://www.nationaleatingdisorders.org/', target: '_blank', rel: 'noopener noreferrer',
                style: { color: _bodFg('#fca5a5'), textDecoration: 'underline', fontWeight: 800 } }, 'nationaleatingdisorders.org ↗'),
              '. Tell a school counselor today.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _bodBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _bodFg('#fda4af'), fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: _bodFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'A reflective tool built on body appreciation and intuitive eating principles, NOT on weight loss or body change. The frame is: your body is not a problem to be solved; it is the thing that gets you through your life. The work is to come back home to it.'
            ),
            h('p', { style: { margin: 0, color: _bodFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'This tool deliberately does NOT include a body image screener, body satisfaction scale, or any quantitative body assessment. Surfacing body distress without offering treatment is not helpful. If you are in real distress about your body, a staffed eating-disorder helpline (National Alliance for Eating Disorders, 1-866-662-1235) is the right next step.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _bodBg('#0f172a'), border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _bodFg('#fda4af'), fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Tylka, T. L. and Wood-Barcalow, N. L. (2015)', '"The Body Appreciation Scale-2," Body Image, 12, 53-67', 'The validated measure of body appreciation. Tylka\'s framework underlies this tool.', null),
            sourceCard('Tribole, E. and Resch, E. (2020)', 'Intuitive Eating: A Revolutionary Anti-Diet Approach (4th ed.), St. Martin\'s Essentials', 'The intuitive eating framework. Anti-diet, pro-body. Widely used in eating disorder recovery.', null),
            sourceCard('NEDA (National Eating Disorders Association)', 'nationaleatingdisorders.org', 'US clearinghouse for eating disorder education, screening (clinical), and treatment referral.', 'https://www.nationaleatingdisorders.org/'),
            sourceCard('ASDAH (Association for Size Diversity and Health)', 'asdah.org', 'Home of the Health at Every Size (HAES) framework. Anti-fatphobia, weight-inclusive health.', 'https://asdah.org/'),
            sourceCard('Taylor, S. R. (2018)', 'The Body Is Not an Apology: The Power of Radical Self-Love, Berrett-Koehler', 'Foundational text in body justice, written by a Black queer disabled author. Wide reach.', null),
            sourceCard('Tovar, V. (2018)', 'You Have the Right to Remain Fat, The Feminist Press', 'Critical and personal text on fatphobia, intersectional approach.', null),
            sourceCard('Beauty Redefined', 'beautyredefined.org', 'Media literacy + body image research-based education. Excellent resources.', 'https://beautyredefined.org/'),
            sourceCard('Project HEAL', 'theprojectheal.org', 'Eating disorder treatment access for those who cannot afford care.', 'https://www.theprojectheal.org/')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _bodFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _bodFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'Body neutrality and appreciation work helps with everyday body distress and the cumulative effects of media. It is NOT a treatment for eating disorders or body dysmorphic disorder. Those need clinical care.'),
              h('li', null, 'You cannot solve fatphobia, ableism, transphobia, or racism by changing your individual relationship to your body. Those are systems and they require systemic responses. Individual body acceptance is part of the work, not all of it.'),
              h('li', null, 'For students with gender dysphoria, the relationship to the body is more complicated than this tool addresses. Affirming care from clinicians who specialize in trans youth is the right path.'),
              h('li', null, '"Just love yourself" is not advice. The pressure to "love your body" can become another form of pressure. This tool aims for neutrality and function-based appreciation, not forced positivity.'),
              h('li', null, 'The media diet audit assumes you have some control over what you consume. For students in shared family situations (everyone watching the same shows, scrolling near family who comments), the work is harder. Do what you can.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(251,113,133,0.10)', borderTop: '1px solid rgba(251,113,133,0.3)', borderRight: '1px solid rgba(251,113,133,0.3)', borderBottom: '1px solid rgba(251,113,133,0.3)', borderLeft: '3px solid #fb7185', fontSize: 12.5, color: _bodFg('#fecdd3'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Do NOT use this tool as a class activity that requires sharing. Body distress is intimate. Make the tool available; let students use it privately. For class content on body image, the media literacy angle (Beauty Redefined material) is the safest entry point. Be alert to signs of eating disorders in students; they are common, often hidden, and often missed in marginalized students (boys, athletes, fat students, students of color, trans students). Pair this tool with Compassion & Self-Talk and Sensory Regulation.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _bodBg('#1e293b'), border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: _bodFg('#fda4af'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _bodFg('#fecdd3'), fontWeight: 700, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', minHeight: 44, marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _bodFg('#fecdd3'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _bodFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT — body story summary, useful for therapy / journaling
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var doneFunctions = (Array.isArray(d.bodyDoes) ? d.bodyDoes : []).map(function(id) {
          var f = BODY_FUNCTIONS.find(function(x) { return x.id === id; });
          return f ? f.label : null;
        }).filter(Boolean);
        var printPressures = safeStrList(d.pressures);
        var printInflows = safeStrList(d.mediaInflows);
        var printCuts = safeStrList(d.mediaCuts);
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: _bodHC ? '#000000' : 'rgba(251,113,133,0.10)', borderRadius: 8, border: '1px solid ' + (_bodHC ? '#ffff00' : 'rgba(251,113,133,0.3)') } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _bodFg('#fecdd3'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Body Story summary — private work; print only for yourself or a therapist conversation.'),
            h('button', { type: 'button', onClick: printNow, style: { padding: '10px 18px', minHeight: 44, borderRadius: 8, border: _bodHC ? '1px solid #ffff00' : 'none', cursor: 'pointer', background: _bodHC ? '#000000' : 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)', color: _bodFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { type: 'button', onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '10px 18px', minHeight: 44, borderRadius: 8, border: '1px solid ' + _bodBd('#475569'), background: _bodBg('#1e293b'), color: _bodFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'body-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _bodBg('#fff'), color: _bodFg('#0f172a'), borderRadius: 8, border: '1px solid ' + _bodBd('#cbd5e1'), fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#body-print-region, #body-print-region * { visibility: visible !important; } ' +
              '#body-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
              '#body-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid ' + _bodBd('#be123c') } },
              h('div', { style: { fontSize: 10, color: _bodFg('#64748b'), textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Body Story'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My body story'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: _bodFg('#475569'), marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            doneFunctions.length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _bodBg(_bodSolid('#0ea5e9')), color: _bodFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🌊 What my body does (function appreciation)'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _bodFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                doneFunctions.map(function(label, i) { return h('li', { key: i }, label); })
              )
            ) : null,

            safeStr(d.appreciation) ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 10, color: _bodFg('#64748b'), textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 4 } }, 'My specific appreciations'),
              h('p', { style: { margin: '0 0 0 12px', color: _bodFg('#0f172a'), fontSize: 12.5, lineHeight: 1.75, whiteSpace: 'pre-wrap' } }, safeStr(d.appreciation))
            ) : null,

            printPressures.length > 0 ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _bodBg('#b45309'), color: _bodFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🌪️ Pressure sources I have named'),
              h('ul', { style: { margin: 0, padding: '0 0 0 24px', color: _bodFg('#0f172a'), fontSize: 12.5, lineHeight: 1.8 } },
                printPressures.map(function(p, i) { return h('li', { key: i }, p); })
              )
            ) : null,

            safeStr(d.criticalVoices) ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _bodBg(_bodSolid('#a855f7')), color: _bodFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '💭 The critical voice'),
              h('p', { style: { margin: '0 0 0 12px', color: _bodFg('#0f172a'), fontSize: 12.5, lineHeight: 1.75, whiteSpace: 'pre-wrap' } }, safeStr(d.criticalVoices))
            ) : null,

            (printInflows.length > 0 || printCuts.length > 0) ? h('div', { style: { marginBottom: 14, pageBreakInside: 'avoid' } },
              h('div', { style: { background: _bodBg(_bodSolid('#ec4899')), color: _bodFg('#fff'), padding: '6px 12px', borderRadius: 4, marginBottom: 6, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 } }, '📺 Media diet'),
              printInflows.length > 0 ? h('div', { style: { marginBottom: 8, padding: '0 12px' } },
                h('div', { style: { fontSize: 10, color: _bodFg('#64748b'), textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'Currently letting in'),
                h('div', { style: { fontSize: 12, color: _bodFg('#0f172a'), lineHeight: 1.7 } }, printInflows.join('  ·  '))
              ) : null,
              printCuts.length > 0 ? h('div', { style: { padding: '0 12px' } },
                h('div', { style: { fontSize: 10, color: _bodFg('#64748b'), textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 } }, 'Cutting / muting / unfollowing'),
                h('div', { style: { fontSize: 12, color: _bodFg('#0f172a'), lineHeight: 1.7 } }, printCuts.join('  ·  '))
              ) : null
            ) : null,

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid ' + _bodBd('#cbd5e1'), fontSize: 9, color: _bodFg('#475569'), textAlign: 'center', lineHeight: 1.5 } },
              'Tylka body appreciation framework · Intuitive Eating · Help: National Alliance for Eating Disorders 1-866-662-1235; crisis 988 or text HOME to 741741. ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      var body;
      if (view === 'function') body = renderFunction();
      else if (view === 'pressures') body = renderPressures();
      else if (view === 'voices') body = renderVoices();
      else if (view === 'media') body = renderMedia();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Body Story' },
        header(),
        navTabs(),
        d._crisisTier >= 3
          ? ((typeof window === 'object' && window && window.SelHub && typeof window.SelHub.renderCrisisResources === 'function')
              ? window.SelHub.renderCrisisResources(h, _bodBand)
              : h('div', { role: 'alert', style: { marginBottom: 12, padding: 12, borderRadius: 10, background: _bodHC ? '#000000' : 'rgba(239,68,68,0.12)', border: '1px solid ' + (_bodHC ? '#ffff00' : '#ef4444'), color: _bodFg('#fecaca'), fontSize: 13, lineHeight: 1.6 } },
                  'You do not have to carry this alone. Call or text 988 (Suicide and Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or call 911 in immediate danger.'))
          : null,
        h('div', { id: 'bod-tab-panel', role: 'tabpanel', 'aria-labelledby': 'bod-tab-' + view }, body)
      );
    }
  });

})();
