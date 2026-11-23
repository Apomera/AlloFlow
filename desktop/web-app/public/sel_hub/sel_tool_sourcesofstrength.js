// ═══════════════════════════════════════════════════════════════
// sel_tool_sourcesofstrength.js — Sources of Strength
// An UPSTREAM youth suicide prevention tool based on the Sources
// of Strength framework (Wyman, LoMurray, etc.). The premise: most
// suicide prevention is downstream (after a student is in crisis).
// Sources of Strength shifts the work UPSTREAM — building eight
// protective factors before crisis hits. The program has the
// strongest evidence base of any school-based youth suicide
// prevention model.
//
// Complements Crisis Companion: SoS is the protective-factors,
// upstream side; Crisis Companion is the in-the-moment downstream
// side.
//
// Registered tool ID: "sourcesOfStrength"
// Category: care-of-self
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';
  if (typeof window === 'undefined') return;

  window.SelHub = window.SelHub || {
    _registry: {}, _order: [],
    registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
    isRegistered: function(id) { return !!this._registry[id]; },
    renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
  };

  if (window.SelHub.isRegistered && window.SelHub.isRegistered('sourcesOfStrength')) return;

  (function() {
    if (typeof document === 'undefined' || !document.body) return;
    if (document.getElementById('allo-live-sos')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-sos';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  (function() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('allo-sos-a11y-css')) return;
    var s = document.createElement('style');
    s.id = 'allo-sos-a11y-css';
    s.textContent =
      '.selh-sos button:focus-visible,.selh-sos a:focus-visible,.selh-sos input:focus-visible,.selh-sos textarea:focus-visible,.selh-sos summary:focus-visible,.selh-sos [tabindex]:focus-visible{outline:3px solid #f59e0b;outline-offset:2px;}' +
      '.selh-sos button{transition:background-color 140ms ease,border-color 140ms ease,color 140ms ease;}' +
      '@media (prefers-reduced-motion: reduce){.selh-sos,.selh-sos *{transition:none !important;animation:none !important;}}' +
      '@media (forced-colors: active){.selh-sos button:focus-visible,.selh-sos a:focus-visible,.selh-sos input:focus-visible,.selh-sos textarea:focus-visible,.selh-sos summary:focus-visible{outline:2px solid Highlight !important;}.selh-sos button,.selh-sos [role="tab"],.selh-sos [role="radio"]{forced-color-adjust:auto;}}';
    document.head.appendChild(s);
  })();

  function isImeComposing(e) {
    return !!(e && (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229 || (e.nativeEvent && e.nativeEvent.keyCode === 229)));
  }

  // The 8 Sources of Strength (Wyman framework)
  var SOURCES = [
    { id: 'family',  label: 'Family support', icon: '🏠', color: '#ec4899',
      what: 'Family in the broad sense: people who claim you, who you can count on, who would show up for you. Biological, chosen, or otherwise.',
      examples: ['A parent or guardian who listens', 'A grandparent, aunt, or uncle who is in your corner', 'A chosen-family member (mentor, godparent, family-friend)', 'An older sibling who has your back'],
      ifLow: 'A thin family-support score is real, and it is one of the hardest of the 8 to build. The other 7 sources can substantially compensate. Friends, mentors, and chosen-family relationships can become primary support over time.' },
    { id: 'friends', label: 'Positive friends', icon: '👥', color: '#0ea5e9',
      what: 'Friends who make you better, not worse. The kind who listen when you are struggling, who do not pressure you toward harmful things, who would notice if you stopped showing up.',
      examples: ['One close friend you can be real with', 'A small group of friends who actually like you', 'Friends who do not require you to perform a different version of yourself'],
      ifLow: 'Friendship can be built — slowly, deliberately, often through shared activities rather than direct attempts to make friends. Joining one club, team, or interest group is often more effective than "trying harder" to be social.' },
    { id: 'mentors', label: 'Mentors', icon: '🤝', color: '#22c55e',
      what: 'A trusted adult outside of your family who knows you, listens, and shows up. Different from a teacher who just teaches: a mentor takes a personal interest.',
      examples: ['A coach who sees you', 'A teacher you can talk to outside of class', 'A neighbor, faith leader, or community member', 'A counselor, therapist, school psych, or social worker'],
      ifLow: 'Mentors are often built into existing roles in your life. The teacher you connect with most. The coach you respect. The school psych or counselor. You do not need many; ONE matters enormously.' },
    { id: 'healthy', label: 'Healthy activities', icon: '⚽', color: '#f59e0b',
      what: 'Activities that are good for you and that you do regularly. Movement, art, music, faith, nature, hobbies — the things that fill you up.',
      examples: ['A sport, team, or physical activity', 'A creative practice (music, art, writing, building)', 'Time in nature or outdoors', 'A regular routine that grounds you'],
      ifLow: 'This is the most controllable source. Adding ONE healthy activity per week — a daily walk, a class, a club, a regular thing — measurably increases protection.' },
    { id: 'generosity', label: 'Generosity / contribution', icon: '🤲', color: '#a855f7',
      what: 'Doing for others. Volunteering, helping, contributing. Research is clear that giving (when it does not become self-sacrifice) is one of the most reliable mood and meaning builders.',
      examples: ['Volunteering for a cause you care about', 'Helping a younger sibling, a neighbor, a peer', 'Contributing to your community', 'Mentoring or teaching someone'],
      ifLow: 'Generosity is built into most communities and faith traditions for a reason — it works as a protective factor. Start small: one act of help a week. This is not about being a perfect person; it is about getting OUT of your own head.' },
    { id: 'spirituality', label: 'Spirituality or sense of purpose', icon: '🌟', color: '#6366f1',
      what: 'Connection to something bigger than yourself. Religious faith, spiritual practice, philosophical sense of purpose, connection to ancestors or nature, ethical commitment. Whatever gives meaning beyond the day-to-day.',
      examples: ['Religious or spiritual community', 'Personal contemplative practice', 'Strong philosophical or ethical commitments', 'Connection to ancestors, lineage, or land', 'A sense of vocation or calling'],
      ifLow: 'This source is private; it is not built by adopting beliefs you do not have. Most people develop a sense of meaning slowly, through experience and reflection. The Orientations and Quiet Questions tools in this SEL Hub support this work.' },
    { id: 'medical', label: 'Medical access', icon: '🏥', color: '#10b981',
      what: 'Being able to see a doctor when you need to. Health insurance. A primary care doctor who knows you. Access to medical care, including for mental health.',
      examples: ['You have a regular doctor', 'You have insurance / Medicaid / school-based access', 'You know how to access care when you need it', 'You feel safe asking medical questions'],
      ifLow: 'Medical access is often a structural issue — not your fault. School-based health centers, federally qualified health centers (FQHCs), and community clinics offer care regardless of insurance. The Crisis Text Line (text HOME to 741741) and 988 (Suicide and Crisis Lifeline) are free regardless of insurance.' },
    { id: 'mental_health', label: 'Mental health access', icon: '💚', color: '#ef4444',
      what: 'Access to counseling, therapy, or psychiatric care when you need it. A school counselor, school psych, or therapist who knows you and you trust.',
      examples: ['You can talk to a school counselor or school psych', 'You have a therapist (or have had one)', 'You know how to ask for mental health help', 'Your family supports mental health care'],
      ifLow: 'School-based mental health is often the easiest path. Talk to your school counselor or school psych — they exist to help connect you to care, including outside the school. Free helplines: 988 (Suicide and Crisis Lifeline), 741741 (Crisis Text Line, text HOME).' }
  ];

  function defaultState() {
    return {
      view: 'home',
      ratings: {},          // sourceId -> 1-5 strength rating
      details: {},          // sourceId -> {who, notes}
      buildPlan: {},        // sourceId -> action they want to take
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('sourcesOfStrength', {
    icon: '🌟',
    label: 'Sources of Strength',
    desc: 'Map your 8 protective factors — Family, Friends, Mentors, Healthy Activities, Generosity, Spirituality, Medical Access, Mental Health Access. Built on the Sources of Strength framework (Wyman et al.), the strongest evidence-based upstream youth suicide prevention program. Complements Crisis Companion on the protective side.',
    color: 'amber',
    category: 'care-of-self',
    render: function(ctx) {
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      if (!ctx || !ctx.React) return null;
      var _souT = (ctx && ctx.theme) || {};
      var _souHC = !!_souT.isContrast, _souL = !_souHC && !_souT.isDark;
      var _sou_BGL = {'#0f172a':'#f8fafc','#1e293b':'#ffffff'}, _sou_BGH = {'#0f172a':'#000000','#1e293b':'#000000','#fff':'#000000','#f8fafc':'#000000'};
      var _sou_FGL = {'#cbd5e1':'#334155','#fcd34d':'#78350f','#94a3b8':'#475569','#fde68a':'#92400e','#e2e8f0':'#1e293b','#bbf7d0':'#166534','#64748b':'#475569'}, _sou_FGH = {'#cbd5e1':'#ffff00','#fcd34d':'#ffff00','#94a3b8':'#ffff00','#fde68a':'#ffff00','#fff':'#ffff00','#e2e8f0':'#ffff00','#bbf7d0':'#ffff00','#0f172a':'#ffff00','#64748b':'#ffff00','#475569':'#ffff00'};
      var _sou_BDL = {'#334155':'#cbd5e1','#1e293b':'#e2e8f0','#475569':'#cbd5e1','#f59e0b':'#d97706','#22c55e':'#16a34a'}, _sou_BDH = {'#334155':'#ffff00','#1e293b':'#ffff00','#475569':'#ffff00','#f59e0b':'#ffff00','#fcd34d':'#ffff00','#22c55e':'#ffff00','#cbd5e1':'#ffff00','#d97706':'#ffff00','#ec4899':'#ffff00','#0ea5e9':'#ffff00','#a855f7':'#ffff00','#6366f1':'#ffff00','#10b981':'#ffff00','#ef4444':'#ffff00'};
      var _souBg = function(h){ return _souHC ? (_sou_BGH[h]||h) : (_souL ? (_sou_BGL[h]||h) : h); };
      // Dark-mode foreground remap. The tool shell is always dark, so these
      // mid-tone accents were rendering below 4.5:1 as TEXT. Each maps to a
      // lighter shade of the SAME hue; backgrounds and borders are untouched.
      var _sou_FGD = {'#6366f1':'#818cf8','#64748b':'#94a3b8'};
      var _souFg = function(h){ return _souHC ? (_sou_FGH[h]||h) : (_souL ? (_sou_FGL[h]||h) : (_sou_FGD[h]||h)); };
      var _souBd = function(h){ return _souHC ? (_sou_BDH[h]||h) : (_souL ? (_sou_BDL[h]||h) : h); };
      // accent text: HC = yellow, Light = 700-weight, Dark = 300/400-weight (1.4.3)
      var _sou_INKL = {'#ec4899':'#be185d','#0ea5e9':'#0369a1','#22c55e':'#15803d','#f59e0b':'#92400e','#a855f7':'#7e22ce','#6366f1':'#4338ca','#10b981':'#047857','#ef4444':'#b91c1c'};
      var _souInk = function(c){ var k = String(c).toLowerCase(); return _souHC ? '#ffff00' : (_souL ? (_sou_INKL[k] || c) : ({'#6366f1':'#818cf8','#4f46e5':'#818cf8','#a855f7':'#c084fc','#9333ea':'#c084fc','#7c3aed':'#a78bfa','#8b5cf6':'#a78bfa','#3b82f6':'#60a5fa','#2563eb':'#60a5fa','#ef4444':'#f87171','#dc2626':'#f87171','#059669':'#34d399','#10b981':'#34d399','#16a34a':'#4ade80','#22c55e':'#4ade80','#0891b2':'#22d3ee','#0284c7':'#38bdf8','#0ea5e9':'#38bdf8','#0d9488':'#2dd4bf','#ec4899':'#f472b6','#db2777':'#f472b6','#64748b':'#94a3b8','#475569':'#94a3b8','#a16207':'#fbbf24','#b45309':'#fbbf24','#f59e0b':'#fbbf24'}[k] || c)); };
      var _souSolid = function(c){ return _souHC ? '#000000' : ({'#ec4899':'#be185d','#0ea5e9':'#0369a1','#22c55e':'#15803d','#f59e0b':'#b45309','#a855f7':'#7e22ce','#6366f1':'#4338ca','#10b981':'#047857','#ef4444':'#b91c1c'}[String(c).toLowerCase()] || c); };
      var _souSoftBg = function(darkTint, lightTint){ return _souHC ? '#000000' : (_souL ? (lightTint || '#f1f5f9') : darkTint); };
      var _souGradBtn = function(grad){ return _souHC ? '#000000' : grad; };
      var _souBtnBd = function(){ return _souHC ? '1px solid #ffff00' : 'none'; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = (ctx.toolData && typeof ctx.toolData === 'object' && !Array.isArray(ctx.toolData)) ? ctx.toolData : {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var announceToSR = ctx.announceToSR;
      var onSafetyFlag = ctx.onSafetyFlag || null;
      var _souBand = (ctx && ctx.gradeBand) || 'high';
      function announceSOS(msg) {
        if (!msg) return;
        if (typeof announceToSR === 'function') { try { announceToSR(msg); return; } catch (_) {} }
        if (typeof document !== 'undefined') {
          var live = document.getElementById('allo-live-sos');
          if (live) {
            live.textContent = '';
            setTimeout(function() { live.textContent = msg; }, 20);
          }
        }
      }

      function safeObj(v) { return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
      function safeStr(v) { return typeof v === 'string' ? v : ''; }
      function safeRating(v) { return (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5) ? v : 0; }

      var d = safeObj(labToolData.sourcesOfStrength);
      if (!Object.keys(d).length) d = defaultState();
      function setSOS(patchOrFn) {
        if (typeof setLabToolData !== 'function') return;
        setLabToolData(function(prev) {
          var base = safeObj(prev);
          var prior = safeObj(base.sourcesOfStrength);
          if (!Object.keys(prior).length) prior = defaultState();
          var patch = typeof patchOrFn === 'function' ? patchOrFn(prior) : patchOrFn;
          if (!patch || typeof patch !== 'object') return base;
          var next = Object.assign({}, prior, patch);
          if (patch.ratings !== undefined || patch.details !== undefined || patch.buildPlan !== undefined) {
            next.lastUpdated = todayISO();
          }
          return Object.assign({}, base, { sourcesOfStrength: next });
        });
      }
      function scanSosText(text) {
        var trimmed = String(text || '').trim();
        if (!trimmed || typeof window === 'undefined' || !window.SelHub) return false;
        var blocked = false;
        if (typeof window.SelHub.safeRehearseCheck === 'function') {
          var chk = window.SelHub.safeRehearseCheck(trimmed, { toolId: 'sourcesOfStrength', onSafetyFlag: onSafetyFlag });
          if (chk && chk.action === 'block') blocked = true;
        }
        if (!blocked && typeof window.SelHub.scanForCrisis === 'function') {
          var scan = window.SelHub.scanForCrisis(trimmed);
          if (scan && scan.triggered) {
            blocked = true;
            if (typeof onSafetyFlag === 'function') {
              try { onSafetyFlag({ toolId: 'sourcesOfStrength', tier: 3, snippet: trimmed.slice(0, 120) }); } catch (_) {}
            }
          }
        }
        if (blocked) {
          setSOS({ _crisisTier: 3 });
          if (typeof window.SelHub.showCrisisModal === 'function') {
            window.SelHub.showCrisisModal({ toolName: 'Sources of Strength', contentSnippet: trimmed });
          }
        }
        return blocked;
      }
      var VALID_VIEWS = ['home', 'map', 'build', 'print', 'about'];
      var view = VALID_VIEWS.indexOf(d.view) !== -1 ? d.view : 'home';
      function goto(v) { setSOS({ view: v }); }
      function printNow() { try { if (typeof window !== 'undefined' && typeof window.print === 'function') window.print(); } catch (e) {} }

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { type: 'button', onClick: function() { if (typeof setSelHubTool === 'function') setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: _souSoftBg('rgba(255,255,255,0.05)', '#f1f5f9'), border: '1px solid ' + _souBd('#334155'), borderRadius: 8, padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: _souFg('#cbd5e1'), fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: _souFg('#fcd34d'), fontSize: 22, fontWeight: 900 } }, '🌟 Sources of Strength'),
            h('div', { style: { fontSize: 12, color: _souFg('#94a3b8'), marginTop: 4, lineHeight: 1.5 } }, 'The protective factors that hold you up.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'The 8 sources', icon: '🌟' },
          { id: 'map', label: 'My map', icon: '🗺️' },
          { id: 'build', label: 'Build a source', icon: '🌱' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        function selectTab(nextTab) {
          goto(nextTab.id);
          announceSOS('Switched to ' + nextTab.label + '.');
          if (typeof document !== 'undefined') {
            setTimeout(function() {
              var el = document.getElementById('sos-tab-' + nextTab.id);
              if (el && typeof el.focus === 'function') el.focus();
            }, 0);
          }
        }
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Sources of Strength sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t, ti) {
            var active = view === t.id;
            return h('button', { key: t.id, id: 'sos-tab-' + t.id, type: 'button', onClick: function() { goto(t.id); announceSOS('Switched to ' + t.label + '.'); },
              role: 'tab', 'aria-selected': active, 'aria-controls': 'sos-panel-' + t.id, tabIndex: active ? 0 : -1,
              onKeyDown: function(e) {
                if (isImeComposing(e)) return;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); selectTab(tabs[(ti + 1) % tabs.length]); }
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); selectTab(tabs[(ti - 1 + tabs.length) % tabs.length]); }
                else if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0]); }
                else if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1]); }
              },
              style: { padding: '10px 14px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _souBd(active ? '#f59e0b' : '#334155'),
                background: active ? _souSoftBg('rgba(245,158,11,0.18)', '#fef3c7') : _souBg('#1e293b'),
                color: active ? _souFg('#fde68a') : _souFg('#cbd5e1'), cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: _souSoftBg('rgba(15,23,42,0.5)', '#f1f5f9'), border: '1px solid ' + _souBd('#334155'), fontSize: 12, color: _souFg('#94a3b8'), lineHeight: 1.5, fontStyle: 'italic' }
        },
          'For acute crisis or thoughts of suicide: call 988 (Suicide and Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or open the Crisis Companion in this SEL Hub. Sources of Strength is for BUILDING the protective side; Crisis Companion is for the moment of crisis.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — the 8 sources
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: _souSoftBg('linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(15,23,42,0.4) 60%)', '#fffbeb'), border: '1px solid ' + _souBd('#f59e0b'), marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: _souFg('#fde68a'), marginBottom: 4 } }, 'Strength is built upstream, not at the cliff.'),
            h('p', { style: { margin: '0 0 10px', color: _souFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.7 } },
              'Sources of Strength is the strongest evidence-based youth suicide prevention model in US schools. Its insight: most suicide prevention happens DOWNSTREAM, after a student is already in crisis. Sources of Strength moves the work UPSTREAM — building eight protective factors over time, before crisis hits.'
            ),
            h('p', { style: { margin: 0, color: _souFg('#cbd5e1'), fontSize: 13.5, lineHeight: 1.7 } },
              'The model is not a screener. It is a MAP. The 8 sources are the supports that hold you up. Most people have some strong sources and some thin ones; the work is to know which is which, and to build the thin ones over time.'
            )
          ),

          h('div', { style: { fontSize: 12, color: _souFg('#94a3b8'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 } }, 'The 8 sources'),

          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
            SOURCES.map(function(s) {
              return h('div', { key: s.id, style: { padding: 14, borderRadius: 10, background: _souBg('#0f172a'), borderTop: '1px solid ' + _souBd('#1e293b'), borderRight: '1px solid ' + _souBd('#1e293b'), borderBottom: '1px solid ' + _souBd('#1e293b'), borderLeft: '4px solid ' + _souBd(s.color) } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { style: { fontSize: 22 }, 'aria-hidden': true }, s.icon),
                  h('span', { style: { fontSize: 14, fontWeight: 800, color: _souInk(s.color) } }, s.label)
                ),
                h('p', { style: { margin: 0, color: _souFg('#cbd5e1'), fontSize: 12.5, lineHeight: 1.65 } }, s.what)
              );
            })
          ),

          h('div', { style: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' } },
            h('button', { type: 'button', onClick: function() { goto('map'); }, 'aria-label': 'Map my sources',
              style: { padding: '10px 22px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 10, border: _souBtnBd(), cursor: 'pointer', background: _souGradBtn('linear-gradient(135deg, #92400e 0%, #b45309 100%)'), color: _souFg('#fff'), fontWeight: 800, fontSize: 14 } },
              '🗺️ Map my sources'),
            h('button', { type: 'button', onClick: function() { goto('build'); }, 'aria-label': 'Build a source',
              style: { padding: '10px 22px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 10, border: '1px solid ' + _souBd('#475569'), background: _souBg('#1e293b'), color: _souFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🌱 Build a source')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // MAP — rate each source 1-5
      // ═══════════════════════════════════════════════════════════
      function renderMap() {
        function setRating(id, value, label) {
          setSOS(function(prior) {
            var r = Object.assign({}, safeObj(prior.ratings));
            r[id] = value;
            return { ratings: r };
          });
          announceSOS((label || id) + ' rated ' + value + ' out of 5.');
        }
        function setDetails(id, field, value) {
          setSOS(function(prior) {
            var details = Object.assign({}, safeObj(prior.details));
            details[id] = Object.assign({}, safeObj(details[id]));
            details[id][field] = value;
            return { details: details };
          });
        }

        var ratings = safeObj(d.ratings);
        var detailsMap = safeObj(d.details);
        var rated = SOURCES.filter(function(s) { return safeRating(ratings[s.id]) > 0; }).length;
        var lowSources = SOURCES.filter(function(s) { var r = safeRating(ratings[s.id]); return r > 0 && r <= 2; });

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: _souSoftBg('rgba(245,158,11,0.10)', '#fffbeb'), borderTop: '1px solid ' + _souBd('#f59e0b'), borderRight: '1px solid ' + _souBd('#f59e0b'), borderBottom: '1px solid ' + _souBd('#f59e0b'), borderLeft: '3px solid ' + _souBd('#f59e0b'), marginBottom: 14, fontSize: 13, color: _souFg('#fde68a'), lineHeight: 1.7 } },
            h('strong', null, '🗺️ Rate each source on 1-5. '),
            '1 = "I don\'t really have this," 5 = "this is strong and reliable." Be honest, not aspirational. The point is to see clearly, not to look good on paper.'
          ),

          SOURCES.map(function(s) {
            var v = safeRating(ratings[s.id]);
            var details = safeObj(detailsMap[s.id]);
            var whoVal = safeStr(details.who);
            return h('div', { key: s.id, style: { padding: 14, borderRadius: 10, background: _souBg('#0f172a'), borderTop: '1px solid ' + _souBd('#1e293b'), borderRight: '1px solid ' + _souBd('#1e293b'), borderBottom: '1px solid ' + _souBd('#1e293b'), borderLeft: '4px solid ' + _souBd(s.color), marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                h('span', { style: { fontSize: 20 }, 'aria-hidden': true }, s.icon),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: _souInk(s.color), flex: 1, minWidth: 140 } }, s.label),
                // 1-5 rating
                h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' }, role: 'radiogroup', 'aria-label': 'Rate ' + s.label },
                  [1, 2, 3, 4, 5].map(function(n) {
                    var active = v === n;
                    var isFocusable = v ? active : (n === 1);
                    return h('button', { key: n, id: 'sos-rate-' + s.id + '-' + n, type: 'button', onClick: function() { setRating(s.id, n, s.label); }, role: 'radio', 'aria-checked': active, tabIndex: isFocusable ? 0 : -1, 'aria-label': 'Rate ' + s.label + ' ' + n + ' out of 5',
                      onKeyDown: function(e) {
                        if (isImeComposing(e)) return;
                        var next = null;
                        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (n % 5) + 1;
                        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = ((n + 3) % 5) + 1;
                        else if (e.key === 'Home') next = 1;
                        else if (e.key === 'End') next = 5;
                        if (next != null) {
                          e.preventDefault();
                          setRating(s.id, next, s.label);
                          if (typeof document !== 'undefined') {
                            setTimeout(function() {
                              var btn = document.getElementById('sos-rate-' + s.id + '-' + next);
                              if (btn && typeof btn.focus === 'function') btn.focus();
                            }, 0);
                          }
                        }
                      },
                      style: { minWidth: 44, minHeight: 44, padding: '6px 10px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid ' + (active ? (_souHC ? '#ffff00' : _souSolid(s.color)) : _souBd('#475569')), background: active ? _souSolid(s.color) : 'transparent', color: active ? _souFg('#fff') : _souInk(s.color), cursor: 'pointer', fontSize: 13, fontWeight: 700 } }, n);
                  })
                )
              ),

              // Examples
              h('details', { style: { marginBottom: 8 } },
                h('summary', { style: { cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', fontSize: 12, color: _souFg('#94a3b8'), fontStyle: 'italic' } }, 'Examples of this source'),
                h('ul', { style: { margin: '6px 0 0', padding: '0 0 0 20px', color: _souFg('#cbd5e1'), fontSize: 12, lineHeight: 1.7 } },
                  s.examples.map(function(ex, i) { return h('li', { key: i }, ex); })
                )
              ),

              // Who / notes
              v ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 4 } },
                h('div', null,
                  h('label', { htmlFor: 'sos-who-' + s.id, style: { display: 'block', fontSize: 12, color: _souFg('#94a3b8'), fontWeight: 700, marginBottom: 2 } }, 'Who / what (specific)'),
                  h('input', { id: 'sos-who-' + s.id, type: 'text', value: whoVal,
                    placeholder: v >= 3 ? 'Name names' : 'Or leave blank',
                    onChange: function(e) { setDetails(s.id, 'who', e.target.value); },
                    onKeyDown: function(e) {
                      if (isImeComposing(e)) return;
                      if (e.key === 'Escape' && whoVal) {
                        e.preventDefault();
                        setDetails(s.id, 'who', '');
                        announceSOS('Cleared details for ' + s.label + '.');
                      }
                    },
                    onBlur: function(e) { scanSosText(e.target.value); },
                    style: { width: '100%', minHeight: 44, padding: '8px 10px', boxSizing: 'border-box', borderRadius: 4, border: '1px solid ' + _souBd('#334155'), background: _souBg('#1e293b'), color: _souFg('#e2e8f0'), fontSize: 12 } })
                )
              ) : null,

              // If low — guidance
              v && v <= 2 ? h('div', { style: { padding: 8, borderRadius: 6, background: _souSoftBg('rgba(245,158,11,0.10)', '#fffbeb'), border: '1px solid ' + _souBd('#f59e0b'), marginTop: 8, fontSize: 12, color: _souFg('#fde68a'), lineHeight: 1.6, fontStyle: 'italic' } },
                h('strong', null, '💡 If this is thin right now: '), s.ifLow
              ) : null
            );
          }),

          // Summary
          rated > 0 ? h('div', { style: { padding: 14, borderRadius: 10, background: _souBg('#0f172a'), borderTop: '1px solid ' + _souBd('#1e293b'), borderRight: '1px solid ' + _souBd('#1e293b'), borderBottom: '1px solid ' + _souBd('#1e293b'), borderLeft: '3px solid ' + _souBd('#fcd34d'), marginTop: 14 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: _souFg('#fcd34d'), marginBottom: 8 } }, '📊 Your map'),
            h('div', { style: { fontSize: 12, color: _souFg('#cbd5e1'), marginBottom: 6, lineHeight: 1.65 } }, rated + ' of 8 sources rated.'),
            lowSources.length > 0 ? h('div', { style: { fontSize: 12, color: _souFg('#fde68a'), lineHeight: 1.7 } },
              h('strong', null, lowSources.length + ' source' + (lowSources.length === 1 ? '' : 's') + ' rated 1-2 (thin): '),
              lowSources.map(function(s) { return s.label; }).join(', '),
              '. These are the work. ',
              h('button', { type: 'button', onClick: function() { goto('build'); }, style: { background: 'transparent', border: 'none', color: _souFg('#fcd34d'), textDecoration: 'underline', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '8px 10px', minHeight: 44, display: 'inline-flex', alignItems: 'center' } }, 'Pick one to build →')
            ) : h('div', { style: { fontSize: 12, color: _souFg('#bbf7d0') } }, 'No sources rated 1-2. That is a strong protective profile.')
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // BUILD — plan to strengthen one source
      // ═══════════════════════════════════════════════════════════
      function renderBuild() {
        function setPlan(id, value) {
          setSOS(function(prior) {
            var bp = Object.assign({}, safeObj(prior.buildPlan));
            bp[id] = value;
            return { buildPlan: bp };
          });
        }
        var planMap = safeObj(d.buildPlan);

        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: _souSoftBg('rgba(34,197,94,0.10)', '#f0fdf4'), borderTop: '1px solid ' + _souBd('#22c55e'), borderRight: '1px solid ' + _souBd('#22c55e'), borderBottom: '1px solid ' + _souBd('#22c55e'), borderLeft: '3px solid ' + _souBd('#22c55e'), marginBottom: 14, fontSize: 13, color: _souFg('#bbf7d0'), lineHeight: 1.7 } },
            h('strong', null, '🌱 Pick ONE source to build. '),
            'Not all 8. ONE. Sources of Strength research is clear: small, sustained moves to strengthen one or two protective factors build the whole structure over time. Trying to build all 8 at once is not how it works.'
          ),

          SOURCES.map(function(s) {
            var plan = safeStr(planMap[s.id]);
            return h('div', { key: s.id, style: { padding: 14, borderRadius: 10, background: _souBg('#0f172a'), borderTop: '1px solid ' + _souBd('#1e293b'), borderRight: '1px solid ' + _souBd('#1e293b'), borderBottom: '1px solid ' + _souBd('#1e293b'), borderLeft: '4px solid ' + _souBd(s.color), marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                h('span', { style: { fontSize: 22 }, 'aria-hidden': true }, s.icon),
                h('span', { style: { fontSize: 14, fontWeight: 800, color: _souInk(s.color) } }, s.label)
              ),
              h('div', { style: { padding: 10, borderRadius: 6, background: _souBg('#1e293b'), marginBottom: 8, fontSize: 12, color: _souFg('#cbd5e1'), lineHeight: 1.65, fontStyle: 'italic' } },
                h('strong', { style: { color: _souInk(s.color) } }, 'How to build this: '), s.ifLow
              ),
              h('label', { htmlFor: 'sos-plan-' + s.id, style: { display: 'block', fontSize: 12, color: _souFg('#94a3b8'), fontWeight: 700, marginBottom: 4 } }, 'My specific move (one small action I will take)'),
              h('textarea', { id: 'sos-plan-' + s.id, value: plan,
                placeholder: 'e.g. "I will ask Coach if I can talk for 15 minutes after practice on Friday." Not vague; specific.',
                onChange: function(e) { setPlan(s.id, e.target.value); },
                onBlur: function(e) { scanSosText(e.target.value); },
                style: { width: '100%', minHeight: 60, padding: 8, boxSizing: 'border-box', borderRadius: 6, border: '1px solid ' + _souBd('#334155'), background: _souBg('#1e293b'), color: _souFg('#e2e8f0'), fontSize: 13, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical' } })
            );
          }),

          h('div', { style: { padding: 12, borderRadius: 10, background: _souSoftBg('rgba(245,158,11,0.10)', '#fffbeb'), borderTop: '1px solid ' + _souBd('#f59e0b'), borderRight: '1px solid ' + _souBd('#f59e0b'), borderBottom: '1px solid ' + _souBd('#f59e0b'), borderLeft: '3px solid ' + _souBd('#f59e0b'), marginTop: 14, fontSize: 12.5, color: _souFg('#fde68a'), lineHeight: 1.65 } },
            h('strong', null, '🎯 The key is follow-through. '),
            'A specific move you do beats a perfect plan you don\'t. Pick the smallest version of the move that you would actually do. If you commit to a 15-minute walk and do it, you have done MORE than committing to a "wellness routine" and doing nothing.'
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        var ratings = safeObj(d.ratings);
        var detailsMap = safeObj(d.details);
        var planMap = safeObj(d.buildPlan);
        var updatedStr = safeStr(d.lastUpdated);
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: _souSoftBg('rgba(245,158,11,0.10)', '#fffbeb'), borderRadius: 8, border: '1px solid ' + _souBd('#f59e0b') } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: _souFg('#fde68a'), lineHeight: 1.55 } },
              h('strong', null, '🖨 Print my Sources map. ')),
            h('button', { type: 'button', onClick: printNow, style: { padding: '10px 18px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: _souBtnBd(), cursor: 'pointer', background: _souGradBtn('linear-gradient(135deg, #92400e 0%, #b45309 100%)'), color: _souFg('#fff'), fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { type: 'button', onClick: function() { goto('map'); }, 'aria-label': 'Back to map',
              style: { padding: '10px 18px', minHeight: 44, display: 'inline-flex', alignItems: 'center', borderRadius: 8, border: '1px solid ' + _souBd('#475569'), background: _souBg('#1e293b'), color: _souFg('#cbd5e1'), cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'sos-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: _souBg('#fff'), color: _souFg('#0f172a'), borderRadius: 8, border: '1px solid ' + _souBd('#cbd5e1'), fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#sos-print-region, #sos-print-region * { visibility: visible !important; } ' +
              '#sos-print-region { position: absolute; left: 0; top: 0; width: 100%; background: #ffffff !important; color: #0f172a !important; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid ' + _souBd('#d97706') } },
              h('div', { style: { fontSize: 12, color: _souHC ? '#ffff00' : '#475569', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Sources of Strength'),
              h('h1', { style: { margin: 0, fontSize: 22, fontWeight: 900 } }, 'My 8 sources of strength'),
              updatedStr ? h('div', { style: { fontSize: 12, color: _souFg('#475569'), marginTop: 4 } }, 'Updated ' + updatedStr) : null
            ),

            SOURCES.map(function(s) {
              var v = safeRating(ratings[s.id]);
              var details = safeObj(detailsMap[s.id]);
              var whoStr = safeStr(details.who);
              var plan = safeStr(planMap[s.id]);
              return h('div', { key: s.id, style: { marginBottom: 14, pageBreakInside: 'avoid', padding: 10, borderLeft: '3px solid ' + _souBd(s.color), background: _souBg('#f8fafc') } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 } },
                  h('strong', { style: { fontSize: 13, color: _souFg('#0f172a') } }, s.icon + ' ' + s.label),
                  v ? h('span', { style: { fontSize: 13, fontWeight: 800, color: _souInk(s.color) } }, v + ' / 5') : h('span', { style: { fontSize: 12, color: _souFg('#475569'), fontStyle: 'italic' } }, '(not rated)')
                ),
                whoStr ? h('div', { style: { fontSize: 12, color: _souFg('#0f172a'), marginBottom: 4 } }, h('strong', null, 'Who/what: '), whoStr) : null,
                plan ? h('div', { style: { fontSize: 12, color: _souFg('#0f172a'), fontStyle: 'italic' } }, h('strong', null, 'My move: '), plan) : null
              );
            }),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid ' + _souBd('#cbd5e1'), fontSize: 12, color: _souFg('#475569'), textAlign: 'center', lineHeight: 1.5 } },
              'Sources of Strength framework (Wyman et al., University of Rochester). ',
              'For acute crisis: 988 Suicide and Crisis Lifeline · 741741 Crisis Text Line (text HOME). ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (typeof window !== 'undefined' && window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('sourcesOfStrength', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: _souBg('#0f172a'), border: '1px solid ' + _souBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _souFg('#fcd34d'), fontSize: 16 } }, 'What Sources of Strength is'),
            h('p', { style: { margin: '0 0 10px', color: _souFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'Sources of Strength is an upstream youth suicide prevention model developed at the University of Rochester (Peter Wyman, Mark LoMurray, and colleagues) starting in the 1990s. The premise: rather than waiting for a student to be in crisis and then intervening, build the eight protective factors that prevent crisis in the first place. The full program uses peer leaders (students trained to spread protective-factor messaging) plus adult advisors. This tool is the self-mapping version, designed for individual students or use in advisory.'
            ),
            h('p', { style: { margin: 0, color: _souFg('#e2e8f0'), fontSize: 13.5, lineHeight: 1.7 } },
              'Sources of Strength has been evaluated in randomized trials and has the strongest evidence base of any school-based youth suicide prevention program. The Wyman et al. (2010) trial in 18 New York high schools showed it changed student attitudes about seeking help, increased the likelihood that students reported referring a suicidal friend to an adult, and shifted school-wide norms.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _souBg('#0f172a'), border: '1px solid ' + _souBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _souFg('#fcd34d'), fontSize: 16 } }, 'How this complements Crisis Companion'),
            h('p', { style: { margin: 0, color: _souFg('#cbd5e1'), fontSize: 13, lineHeight: 1.7 } },
              'Crisis Companion is for the moment of crisis: a student who is currently struggling, who needs to know what to do RIGHT NOW. Sources of Strength is the upstream side: building the protective factors that mean fewer students reach that moment in the first place. Schools that have both are doing the work on both sides. Use them together.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _souBg('#0f172a'), border: '1px solid ' + _souBd('#1e293b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _souFg('#fcd34d'), fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('Sources of Strength (official program)', 'sourcesofstrength.org', 'The official program. School-based training, peer leader curriculum, evidence base. Districts can contract for training.', 'https://sourcesofstrength.org/'),
            sourceCard('Wyman, P. A. et al. (2010)', '"An Outcome Evaluation of the Sources of Strength Suicide Prevention Program Delivered by Adolescent Peer Leaders in High Schools," American Journal of Public Health, 100(9), 1653-1661', 'Landmark RCT of the full program in 18 NY high schools.', null),
            sourceCard('AFSP (American Foundation for Suicide Prevention)', 'afsp.org', 'Major US suicide prevention organization. Resources for youth, schools, families.', 'https://afsp.org/'),
            sourceCard('Suicide Prevention Resource Center', 'sprc.org', 'US federal SAMHSA-funded resource center. Lists evidence-based programs including Sources of Strength.', 'https://sprc.org/'),
            sourceCard('988 Suicide and Crisis Lifeline', '988lifeline.org', 'Free 24/7 phone, text, and chat support. Call or text 988.', 'https://988lifeline.org/'),
            sourceCard('The Trevor Project', 'thetrevorproject.org', 'LGBTQ+ youth-specific crisis support and suicide prevention. Critical resource for queer youth.', 'https://www.thetrevorproject.org/')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: _souSoftBg('rgba(245,158,11,0.08)', '#fffbeb'), borderTop: '1px solid ' + _souBd('#f59e0b'), borderRight: '1px solid ' + _souBd('#f59e0b'), borderBottom: '1px solid ' + _souBd('#f59e0b'), borderLeft: '3px solid ' + _souBd('#f59e0b'), marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: _souFg('#fcd34d'), fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: _souFg('#fde68a'), fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'This tool is the SELF-MAPPING version of the framework. The full Sources of Strength program (with peer leaders, adult advisors, school-wide media campaigns) is far more powerful and is what has the strongest evidence base. If your school is interested, the official program (sourcesofstrength.org) offers training.'),
              h('li', null, 'Building protective factors is sustained work. It is not a 1-session intervention. The shift in protective factors is typically measured over months, not days.'),
              h('li', null, 'Some sources are structural — medical access, mental health access, family support, friend networks are all shaped by where you live, what your family\'s resources are, and who you can reach. Building them is not always about individual effort; sometimes the work is on the structure (school health centers, public mental health services).'),
              h('li', null, 'For youth in acute crisis: this is NOT the right tool. Crisis Companion, 988, the Trevor Project (1-866-488-7386 or text START to 678-678) are the right tools.'),
              h('li', null, 'For LGBTQ+ youth, students of color, disabled students, and others facing identity-based stressors: many "protective factors" feel different. Family support can be complicated when family does not accept you. The Trevor Project and the It Gets Better Project have youth-specific resources that this tool does not replicate.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: _souSoftBg('rgba(245,158,11,0.10)', '#fffbeb'), borderTop: '1px solid ' + _souBd('#f59e0b'), borderRight: '1px solid ' + _souBd('#f59e0b'), borderBottom: '1px solid ' + _souBd('#f59e0b'), borderLeft: '3px solid ' + _souBd('#f59e0b'), fontSize: 12.5, color: _souFg('#fde68a'), lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'For schools serious about adolescent suicide prevention, the OFFICIAL Sources of Strength program is what has the evidence. It is a peer-leader model with adult advisors, school-wide media campaigns, and a multi-year structure. The investment is real but the outcomes are real. Districts can contract through sourcesofstrength.org. This SEL Hub tool is the self-mapping companion, useful between sessions or in advisory, NOT a replacement for the full program.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: _souBg('#1e293b'), border: '1px solid ' + _souBd('#334155'), marginBottom: 8 } },
          h('div', { style: { fontSize: 12, color: _souFg('#fcd34d'), fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: _souFg('#fde68a'), fontWeight: 700, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', minHeight: 44, marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: _souFg('#fde68a'), fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: _souFg('#cbd5e1'), lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'map') body = renderMap();
      else if (view === 'build') body = renderBuild();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { className: 'selh-sos', style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Sources of Strength' },
        header(),
        navTabs(),
        (d._crisisTier >= 3 && typeof window !== 'undefined' && window.SelHub && typeof window.SelHub.renderCrisisResources === 'function')
          ? window.SelHub.renderCrisisResources(h, _souBand) : null,
        h('div', { role: 'tabpanel', id: 'sos-panel-' + view, 'aria-labelledby': 'sos-tab-' + view }, body)
      );
    }
  });

})();
