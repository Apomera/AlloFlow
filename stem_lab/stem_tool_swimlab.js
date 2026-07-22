// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════════════════════════════════════
// stem_tool_watersafety.js — SwimLab
// Education-only water safety, drowning prevention, and aquatic emergency response.
// 8 modules + Resources tab covering: cold water shock + 1-1-10 rule, rip currents,
// reach/throw/row/don't go bystander rescue, life jackets (PFDs), ice safety + self-
// rescue, hypothermia recognition, pool drain entrapment, and autism + water safety
// (a population at ~160x higher drowning risk per AAP / National Autism Association).
//
// All concrete claims cite primary sources: CDC, USCG, AAP, NAA, ASAN, DAN, NOAA,
// US Lifesaving Association, Cold Water Boot Camp / Mario Vittone, Maine Department
// of Inland Fisheries & Wildlife, CPSC (Pool Safely), Virginia Graeme Baker Act,
// USA Swimming Foundation, Special Olympics, NOLS Wilderness First Aid.
//
// EDUCATIONAL ONLY. Does NOT teach swimming. For swim instruction find a certified
// Water Safety Instructor (WSI) at your local Red Cross or YMCA. In a real emergency:
// call 911 (text 911 in Maine).
//
// Framing: "Whoever saves a single soul, scripture considers it as if they saved
// an entire world." (Mishnah Sanhedrin 4:5 / Pirkei Avot)
// ═══════════════════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('swimLab'))) {

(function() {
  'use strict';

  // Print stylesheet — teachers print modules as classroom handouts. Hide UI
  // chrome (back/print buttons, "Try again", AI input controls); print white
  // background. Note: scenario answers stay hidden if not revealed before
  // printing — that is acceptable since the bulk of each module (key points,
  // callouts, sources) prints as a clean handout. Discussion-style scenarios
  // are then run live in class.
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('swimlab-print-css')) return;
    var st = document.createElement('style');
    st.id = 'swimlab-print-css';
    st.textContent = [
      '@media print {',
      '  .swimlab-no-print { display: none !important; }',
      '  body { background: white !important; }',
      // Force-expand teacher notes on print so handouts include standards,
      // discussion questions, and misconceptions even if the user did not
      // expand the <details> block on screen.
      '  details.swimlab-teacher-notes { display: block !important; }',
      '  details.swimlab-teacher-notes > summary { list-style: none; cursor: default; }',
      '  details.swimlab-teacher-notes[open] > *,',
      '  details.swimlab-teacher-notes > * { display: block !important; }',
      '}'
    ].join('\n');
    if (document.head) document.head.appendChild(st);
  })();

  if (typeof document !== 'undefined' && !document.getElementById('swimlab-readiness-css')) {
    var swimReadinessStyle = document.createElement('style');
    swimReadinessStyle.id = 'swimlab-readiness-css';
    swimReadinessStyle.textContent = [
      '.swimlab-menu-shell{width:min(100%,1080px);margin:0 auto;padding:8px;color:#e6f4ff;display:grid;gap:14px;}',
      '.swimlab-menu-shell *{box-sizing:border-box;}',
      '.swimlab-command{padding:20px;border:1px solid rgba(56,189,248,.42);border-radius:20px;background:radial-gradient(circle at 90% 10%,rgba(14,165,233,.24),transparent 34%),linear-gradient(135deg,rgba(7,89,133,.72),rgba(2,6,23,.98) 66%);box-shadow:0 18px 44px rgba(2,6,23,.28);}',
      '.swimlab-command-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}',
      '.swimlab-eyebrow{margin:0 0 7px;color:#7dd3fc;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;}',
      '.swimlab-title{margin:0;color:#f8fafc;font-size:clamp(22px,3vw,31px);line-height:1.12;}',
      '.swimlab-subtitle{max-width:720px;margin:8px 0 0;color:#dbeafe;font-size:13px;line-height:1.55;}',
      '.swimlab-status{flex:0 0 auto;padding:8px 11px;border:1px solid rgba(125,211,252,.34);border-radius:999rem;background:rgba(2,6,23,.62);color:#bae6fd;font-size:10px;font-weight:800;white-space:nowrap;}',
      '.swimlab-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:17px;}',
      '.swimlab-metric{min-width:0;padding:10px;border:1px solid rgba(148,163,184,.18);border-radius:12px;background:rgba(15,23,42,.7);}',
      '.swimlab-metric-label{display:block;color:#94a3b8;font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;}',
      '.swimlab-metric-value{display:block;margin-top:3px;color:#f8fafc;font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '.swimlab-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:15px;}',
      '.swimlab-primary{min-height:44px;padding:10px 16px;border:1px solid rgba(224,242,254,.4);border-radius:12px;background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 10px 24px rgba(2,132,199,.23);transition:transform .18s,box-shadow .18s;}',
      '.swimlab-primary:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(2,132,199,.3);}',
      '.swimlab-action-note{color:#bae6fd;font-size:10px;line-height:1.4;}',
      '.swimlab-section{padding:16px;border:1px solid #334155;border-radius:16px;background:rgba(15,23,42,.65);}',
      '.swimlab-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:10px;}',
      '.swimlab-section-head h3{margin:0;color:#f8fafc;font-size:15px;}',
      '.swimlab-section-head p{margin:3px 0 0;color:#94a3b8;font-size:11px;line-height:1.45;}',
      '.swimlab-essential-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;}',
      '.swimlab-tile-wrap{min-width:0;}',
      '.swimlab-menu-tile{width:100%;height:100%;min-height:132px;transition:transform .18s,border-color .18s,box-shadow .18s;}',
      '.swimlab-menu-tile:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(2,6,23,.24);}',
      '.swimlab-menu-tile--compact{min-height:108px;}',
      '.swimlab-catalog{border:1px solid #334155;border-radius:16px;background:rgba(15,23,42,.72);overflow:hidden;}',
      '.swimlab-catalog summary{min-height:50px;padding:14px 16px;cursor:pointer;color:#e0f2fe;font-size:12px;font-weight:900;}',
      '.swimlab-catalog-body{display:grid;gap:16px;padding:0 14px 14px;}',
      '.swimlab-catalog-section h3{margin:0 0 4px;color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:.06em;}',
      '.swimlab-catalog-section p{margin:0 0 9px;color:#94a3b8;font-size:10px;line-height:1.45;}',
      '.swimlab-catalog-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;}',
      '.swimlab-badges{padding:13px;border:1px solid #334155;border-radius:14px;background:#0f172a;}',
      '.swimlab-quote{padding:13px 15px;border-left:3px solid #38bdf8;border-radius:0 12px 12px 0;background:rgba(14,165,233,.07);color:#94a3b8;font-size:12px;font-style:italic;line-height:1.55;}',
      '@media(max-width:820px){.swimlab-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}.swimlab-essential-grid,.swimlab-catalog-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}',
      '@media(max-width:560px){.swimlab-menu-shell{padding:0;}.swimlab-command{padding:14px;border-radius:16px;}.swimlab-command-top{flex-direction:column;}.swimlab-status{white-space:normal;}.swimlab-essential-grid,.swimlab-catalog-grid{grid-template-columns:1fr;}.swimlab-primary{width:100%;}.swimlab-actions{align-items:stretch;}.swimlab-action-note{width:100%;}.swimlab-menu-tile{min-height:100px;}}',
      '@media(prefers-reduced-motion:reduce){.swimlab-primary,.swimlab-menu-tile{transition:none;}.swimlab-primary:hover,.swimlab-menu-tile:hover{transform:none;}}',
      '.theme-contrast .swimlab-command,.theme-contrast .swimlab-section,.theme-contrast .swimlab-catalog,.theme-contrast .swimlab-badges{box-shadow:none;border-width:2px;}'
    ].join('\n');
    if (document.head) document.head.appendChild(swimReadinessStyle);
  }

  window.StemLab.registerTool('swimLab', {
    name: 'SwimLab',
    icon: '🏊',
    category: 'life-skills',
    description: 'How swimming works (stroke physics + survival skills) plus what every swimmer should know about cold water, rip currents, ice, life jackets, and rescue. Visual stroke breakdowns, the science of buoyancy and propulsion, and the survival skills (back float, eggbeater, HELP, huddle) that actually save lives. Sources cited inline (CDC, USCG, AAP, NAA, ASAN, NOAA, USA Swimming, Cold Water Boot Camp). Educational only — find a Water Safety Instructor for actual swim training.',
    tags: ['swim', 'swimming', 'stroke-physics', 'buoyancy', 'survival-swim', 'cold-water', 'rip-currents', 'ice-safety', 'pfd', 'autism-water', 'maine', 'life-skills'],

    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      try {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;
      var useRef = React.useRef;

      // State persistence via ctx.toolData (system-managed; survives reload).
      var d = (ctx.toolData && ctx.toolData['swimLab']) || {};
      var upd = function(key, val) { ctx.update('swimLab', key, val); };
      var updMulti = function(obj) {
        if (ctx.updateMulti) ctx.updateMulti('swimLab', obj);
        else Object.keys(obj).forEach(function(k) { upd(k, obj[k]); });
      };
      var addToast = ctx.addToast || function(msg) { console.log('[SwimLab]', msg); };
      var callGemini = ctx.callGemini || null;

      var gradeBand = (ctx.gradeBand || 'g68').toLowerCase();
      if (['k2','g35','g68','g912'].indexOf(gradeBand) === -1) gradeBand = 'g68';

      // ── State schema ──
      // No entry consent gate. Modules with heavier content (cold water, ice, autism)
      // surface their own inline content notes. Default view is the menu.
      var view = d.view || 'menu';
      var consentAccepted = true;  // retained as a no-op flag for compatibility with old saved state
      var modulesVisited = d.modulesVisited || {};
      var quizResults = d.quizResults || {};
      var badges = d.badges || {};
      var bigQuizState = d.bigQuizState || { idx: 0, score: 0, answered: false, lastChoice: null, picks: {} };

      // ── Hydration: window slot → localStorage → host state ──
      var _wsHydrated = useRef(false);
      if (!_wsHydrated.current) {
        _wsHydrated.current = true;
        try {
          var winState = (typeof window !== 'undefined' && window.__alloflowSwimLab) || null;
          var lsState = null;
          try { lsState = JSON.parse(localStorage.getItem('swimLab.state.v1') || 'null'); } catch (e) {}
          var seed = winState || lsState || null;
          if (seed && typeof seed === 'object') {
            var merge = {};
            if (seed.consentAccepted && d.consentAccepted === undefined) merge.consentAccepted = seed.consentAccepted;
            if (seed.badges && d.badges === undefined) merge.badges = seed.badges;
            if (seed.modulesVisited && d.modulesVisited === undefined) merge.modulesVisited = seed.modulesVisited;
            if (seed.quizResults && d.quizResults === undefined) merge.quizResults = seed.quizResults;
            if (Object.keys(merge).length > 0) updMulti(merge);
          }
        } catch (e) {}
      }

      // Persist on change
      useEffect(function() {
        try {
          var snap = {
            consentAccepted: !!d.consentAccepted,
            badges: d.badges || {},
            modulesVisited: d.modulesVisited || {},
            quizResults: d.quizResults || {}
          };
          window.__alloflowSwimLab = snap;
          localStorage.setItem('swimLab.state.v1', JSON.stringify(snap));
        } catch (e) {}
      }, [d.consentAccepted, d.badges, d.modulesVisited, d.quizResults]);

      // ── SR live region ──
      var _wsLiveRef = useRef(null);
      function wsAnnounce(msg) {
        if (_wsLiveRef.current) {
          _wsLiveRef.current.textContent = '';
          setTimeout(function() { if (_wsLiveRef.current) _wsLiveRef.current.textContent = msg; }, 30);
        }
      }

      function awardBadge(id, label) {
        if (badges[id]) return;
        var next = Object.assign({}, badges);
        next[id] = { label: label, earnedAt: new Date().toISOString() };
        upd('badges', next);
        addToast('🏅 Badge earned: ' + label, 'success');
      }

      function markVisited(modId) {
        if (modulesVisited[modId]) return;
        var nextVisited = Object.assign({}, modulesVisited);
        nextVisited[modId] = new Date().toISOString();
        upd('modulesVisited', nextVisited);
      }

      // ── Theme (deep-water palette) ──
      var isContrast = !!ctx.isContrast;
      var isDark = !!ctx.isDark;
      var T = isContrast ? {
        bg: '#000000', card: '#000000', cardAlt: '#0a0a0a', border: '#fbbf24',
        text: '#ffffff', muted: '#ffffff', dim: '#ffffff',
        accent: '#fbbf24', accentHi: '#ffff00', ok: '#00ff66',
        warn: '#ffff00', danger: '#ff6b6b', link: '#00ffff',
        water: '#00ffff', ice: '#ffffff', sand: '#ffff00'
      } : isDark ? {
        bg: '#0c2233', card: '#163a52', cardAlt: '#0a1d2e', border: '#234d6e',
        text: '#f0f9ff', muted: '#cbd5e1', dim: '#94a3b8',
        accent: '#0ea5e9', accentHi: '#7dd3fc', ok: '#22c55e',
        warn: '#f59e0b', danger: '#ef4444', link: '#bae6fd',
        water: '#0284c7', ice: '#cffafe', sand: '#fde68a'
      } : {
        bg: '#f0f9ff', card: '#ffffff', cardAlt: '#e0f2fe', border: '#52748c',
        text: '#082f49', muted: '#334155', dim: '#475569',
        accent: '#0369a1', accentHi: '#075985', ok: '#047857',
        warn: '#b45309', danger: '#b91c1c', link: '#075985',
        water: '#0369a1', ice: '#cffafe', sand: '#a16207'
      };

      function btn(extra) {
        return Object.assign({
          padding: '10px 16px', borderRadius: 10, border: '1px solid ' + T.border,
          background: T.card, color: T.text, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', textAlign: 'left'
        }, extra || {});
      }
      function btnPrimary(extra) {
        return Object.assign(btn({ background: T.accent, color: '#0c2233', border: '1px solid ' + T.accent }), extra || {});
      }

      // ── Persistent emergency banner ──
      function emergencyBanner() {
        return h('div', { role: 'region', 'aria-label': __alloT('stem.swimlab.emergency_reminder', 'Emergency reminder'),
          style: { margin: '0 0 14px', padding: '10px 14px', borderRadius: 10, background: '#7f1d1d', border: '1px solid #dc2626', color: '#fde2e2', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
          h('span', { 'aria-hidden': 'true' }, '🚑'),
          h('span', null,
            h('strong', null, __alloT('stem.swimlab.in_a_real_emergency_call_911', 'In a real emergency: call 911')),
            __alloT('stem.swimlab.in_maine_you_can_text_911_this_tool_is', ' — in Maine you can text 911. This tool is educational only and does not teach swimming.'))
        );
      }

      function disclaimerFooter() {
        return h('div', { role: 'contentinfo', 'aria-label': __alloT('stem.swimlab.educational_disclaimer', 'Educational disclaimer'),
          style: { marginTop: 18, padding: '10px 14px', borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.border, color: T.dim, fontSize: 11, textAlign: 'center', lineHeight: 1.55 } },
          __alloT('stem.swimlab.educational_only_to_learn_to_swim_find', 'Educational only. To learn to swim, find a certified Water Safety Instructor at '),
          h('a', { href: 'https://www.redcross.org/take-a-class/swimming', target: '_blank', rel: 'noopener', style: { color: T.link } }, __alloT('stem.swimlab.red_cross', 'Red Cross')),
          __alloT('stem.swimlab.or_your_local_ymca_real_emergencies', ' or your local YMCA. Real emergencies → '),
          h('strong', { style: { color: T.accentHi } }, '911'),
          '.'
        );
      }

      // ─────────────────────────────────────────
      // CONSENT SCREEN — one-time gate with content note
      // ─────────────────────────────────────────
      function renderConsent() {
        return h('div', { style: { padding: 24, maxWidth: 760, margin: '0 auto', color: T.text } },
          h('div', { role: 'region', 'aria-label': __alloT('stem.swimlab.swimlab_consent_and_educational_scope', 'SwimLab consent and educational scope'),
            style: { background: '#082f49', border: '1px solid ' + T.water, borderRadius: 14, padding: 24 } },
            h('h2', { style: { margin: '0 0 12px', fontSize: 22, color: T.accentHi } },
              __alloT('stem.swimlab.swimlab_is_an_educational_tool', '🛟 SwimLab is an EDUCATIONAL tool.')),
            h('p', { style: { margin: '0 0 12px', lineHeight: 1.55 } },
              __alloT('stem.swimlab.it_teaches_you_to', 'It teaches you to '),
              h('strong', null, 'recognize'),
              __alloT('stem.swimlab.water_hazards', ' water hazards, '),
              h('strong', null, 'respond'),
              __alloT('stem.swimlab.to_aquatic_emergencies_and_reduce_drow', ' to aquatic emergencies, and reduce drowning risk. It is '),
              h('strong', null, 'NOT'),
              __alloT('stem.swimlab.a_way_to_learn_how_to_swim_watching_a_', ' a way to learn how to swim. Watching a screen cannot teach you to float, breathe, or move through water. Those skills only come from time in the water with a qualified instructor.')),
            h('p', { style: { margin: '0 0 12px', lineHeight: 1.55 } },
              __alloT('stem.swimlab.to_learn_to_swim_or_get_certified_find', 'To learn to swim or get certified, find a Water Safety Instructor (WSI) at the '),
              h('a', { href: 'https://www.redcross.org/take-a-class/swimming', target: '_blank', rel: 'noopener', style: { color: T.accentHi, fontWeight: 700 } }, __alloT('stem.swimlab.american_red_cross', 'American Red Cross')),
              __alloT('stem.swimlab.your_local', ', your local '),
              h('a', { href: 'https://www.ymca.org/what-we-do/healthy-living/swimming-aquatics', target: '_blank', rel: 'noopener', style: { color: T.accentHi, fontWeight: 700 } }, 'YMCA'),
              __alloT('stem.swimlab.or_community_pool_the', ', or community pool. The '),
              h('a', { href: 'https://www.usaswimming.org/foundation', target: '_blank', rel: 'noopener', style: { color: T.accentHi, fontWeight: 700 } }, __alloT('stem.swimlab.usa_swimming_foundation', 'USA Swimming Foundation')),
              __alloT('stem.swimlab.offers_scholarships_for_families_who_c', ' offers scholarships for families who cannot afford lessons.')),
            h('div', { style: { background: '#7c2d12', border: '1px solid #c2410c', borderRadius: 8, padding: 12, margin: '14px 0', color: '#fed7aa' } },
              h('strong', null, __alloT('stem.swimlab.content_note', '⚠️ Content note: ')),
              __alloT('stem.swimlab.this_tool_talks_about_drowning_near_dr', 'This tool talks about drowning, near-drowning, and cold water emergencies. The content is matter-of-fact, not graphic, but the topic is serious. If you have lost someone to a water emergency, this material may bring difficult feelings up. You can step away at any point.')),
            h('p', { style: { margin: '0 0 12px', lineHeight: 1.55 } },
              h('strong', null, __alloT('stem.swimlab.in_a_real_emergency_call_911_2', 'In a real emergency, call 911.')),
              __alloT('stem.swimlab.in_maine_you_can', ' In Maine, you can '),
              h('strong', null, __alloT('stem.swimlab.text_911', 'text 911')),
              __alloT('stem.swimlab.if_you_cannot_speak', ' if you cannot speak.')),
            h('div', { style: { margin: '16px 0', padding: '12px 14px', borderLeft: '3px solid ' + T.accent, background: 'rgba(14,165,233,0.06)', fontSize: 13, fontStyle: 'italic', color: T.muted, lineHeight: 1.55 } },
              __alloT('stem.swimlab.whoever_saves_a_single_soul_scripture_', '"Whoever saves a single soul, scripture considers it as if they saved an entire world."'),
              h('br'),
              h('span', { style: { fontSize: 11, color: T.dim, fontStyle: 'normal' } }, __alloT('stem.swimlab.mishnah_sanhedrin_4_5_pirkei_avot', '— Mishnah Sanhedrin 4:5 (Pirkei Avot)'))
            ),
            h('button', {
              'aria-label': __alloT('stem.swimlab.i_understand_show_me_the_lab', 'I understand. Show me the lab.'),
              onClick: function() {
                updMulti({ consentAccepted: true, consentDate: new Date().toISOString(), view: 'menu' });
                awardBadge('swimlab_starter', 'SwimLab Starter');
                wsAnnounce('Consent accepted. Welcome to SwimLab.');
              },
              style: { padding: '12px 22px', borderRadius: 10, border: 'none', background: T.accent, color: '#0c2233', fontSize: 15, fontWeight: 700, cursor: 'pointer' }
            }, __alloT('stem.swimlab.i_understand_show_me_the_lab_2', 'I understand — show me the lab'))
          ),
          h('p', { style: { marginTop: 14, fontSize: 12, color: T.dim, fontStyle: 'italic' } },
            __alloT('stem.swimlab.acknowledging_this_screen_is_a_one_tim', 'Acknowledging this screen is a one-time gate. Your acknowledgment is saved with your profile so you do not see it again.'))
        );
      }

      // ─────────────────────────────────────────
      // BACK BUTTON
      // ─────────────────────────────────────────
      function backBar(title) {
        return h('div', { className: 'swimlab-back-bar', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
          h('button', {
            className: 'swimlab-no-print',
            'aria-label': __alloT('stem.swimlab.back_to_swimlab_menu', 'Back to SwimLab menu'),
            onClick: function() { upd('view', 'menu'); wsAnnounce('Back to menu'); },
            style: btn({ padding: '6px 12px', fontSize: 12 })
          }, __alloT('stem.swimlab.menu', '← Menu')),
          h('h2', { style: { margin: 0, fontSize: 18, color: T.text, flex: 1 } }, title),
          h('button', {
            className: 'swimlab-no-print',
            'aria-label': __alloT('stem.swimlab.print_this_module_as_a_classroom_hando', 'Print this module as a classroom handout'),
            onClick: function() { try { window.print(); } catch (_) {} },
            style: btn({ padding: '6px 12px', fontSize: 12 })
          }, __alloT('stem.swimlab.print', '🖨️ Print'))
        );
      }

      // ─────────────────────────────────────────
      // MENU
      // ─────────────────────────────────────────
      // Tiles carry a `section` field so the menu can group them. Picking the
      // right starting modules matters for a topic where one teacher session
      // may be all the exposure a student gets in a year. The "start" lane is
      // the three modules statistically most likely to actually save a life
      // (cold water shock per Mario Vittone / Cold Water Boot Camp; PFDs per
      // USCG 86% statistic; bystander rescue per US Lifesaving Association
      // would-be rescuer death data). Order within section is the order shown.
      var MENU_TILES = [
        // Start Here — life-saving fundamentals
        { id: 'coldShock',    icon: '🥶', label: __alloT('stem.swimlab.cold_water_survival', 'Cold Water Survival'),         section: 'start',     desc: __alloT('stem.swimlab.the_gasp_reflex_the_mammalian_dive_res', 'The gasp reflex, the mammalian dive response, and the 1-1-10 timeline that beats panic.'), ready: true },
        { id: 'pfd',          icon: '🦺', label: __alloT('stem.swimlab.why_life_jackets_work', 'Why Life Jackets Work'),       section: 'start',     desc: __alloT('stem.swimlab.the_physics_of_buoyancy_five_pfd_types', 'The physics of buoyancy. Five PFD types. Fit check that actually works. The 86% statistic.'), ready: true },
        { id: 'reachThrow',   icon: '🪢', label: __alloT('stem.swimlab.help_without_drowning_yourself', 'Help Without Drowning Yourself'), section: 'start',  desc: __alloT('stem.swimlab.reach_throw_row_don_t_go_why_untrained', 'Reach / Throw / Row / Don\'t Go. Why untrained rescuers die. Bystander effect cuts.'), ready: true },
        // Modules — the deeper content
        { id: 'howSwimming',  icon: '🏊', label: __alloT('stem.swimlab.how_swimming_works', 'How Swimming Works'),          section: 'modules',   desc: __alloT('stem.swimlab.the_physics_of_every_major_stroke_plus', 'The physics of every major stroke, plus the survival skills (back float, eggbeater, HELP, huddle) that actually save lives.'), ready: true },
        { id: 'ripCurrents',  icon: '🌊', label: __alloT('stem.swimlab.rip_currents', 'Rip Currents'),                section: 'modules',   desc: __alloT('stem.swimlab.spot_them_from_shore_the_parallel_to_s', 'Spot them from shore. The parallel-to-shore escape. Why fighting the current kills.'), ready: true },
        { id: 'iceSafety',    icon: '🧊', label: __alloT('stem.swimlab.falling_through_ice', 'Falling Through Ice'),         section: 'modules',   desc: __alloT('stem.swimlab.the_swim_and_roll_self_rescue_picks_of', 'The swim-and-roll self-rescue. Picks of Life. Maine ice color cues. Snowmobile through-ice.'), ready: true },
        { id: 'hypothermia',  icon: '🌡️', label: __alloT('stem.swimlab.cold_body_cold_brain', 'Cold Body, Cold Brain'),       section: 'modules',   desc: __alloT('stem.swimlab.how_the_body_fails_in_cold_the_umbles_', 'How the body fails in cold. The UMBLES rule. What NOT to do. Why "not dead until warm and dead."'), ready: true },
        { id: 'drainEntrap',  icon: '🌀', label: __alloT('stem.swimlab.pool_drain_risks', 'Pool Drain Risks'),            section: 'modules',   desc: __alloT('stem.swimlab.the_virginia_graeme_baker_act_five_ent', 'The Virginia Graeme Baker Act. Five entrapment types. The emergency shut-off.'), ready: true },
        { id: 'autismWater',  icon: '♾️', label: __alloT('stem.swimlab.autism_water', 'Autism + Water'),              section: 'modules',   desc: __alloT('stem.swimlab.the_160x_drowning_risk_defense_in_dept', 'The 160x drowning risk. Defense-in-depth prevention. Adapted swim instruction. Swimsuit color visibility.'), ready: true },
        // Practice
        { id: 'cumulative',   icon: '🎯', label: __alloT('stem.swimlab.cumulative_quiz', 'Cumulative Quiz'),             section: 'practice',  desc: __alloT('stem.swimlab.15_questions_across_all_nine_modules_m', '15 questions across all nine modules. Missed answers link you straight back to the module you need to review.'), ready: true },
        { id: 'askLifeguard', icon: '🤖', label: __alloT('stem.swimlab.ask_the_lifeguard_ai', 'Ask the Lifeguard (AI)'),      section: 'practice',  desc: __alloT('stem.swimlab.type_a_swimming_or_water_question_ai_r', 'Type a swimming or water question; AI returns a sourced answer. Educational only.'), ready: true },
        // Resources
        { id: 'resources',    icon: '📚', label: __alloT('stem.swimlab.resources', 'Resources'),                   section: 'resources', desc: __alloT('stem.swimlab.every_org_cited_in_this_tool_plus_adap', 'Every org cited in this tool, plus adaptive swim programs and Maine-specific links.'), ready: true }
      ];

      // Section metadata. Order in this array is render order. The "start"
      // section gets a heavier treatment to draw the eye for first-time users.
      var MENU_SECTIONS = [
        { id: 'start',     label: __alloT('stem.swimlab.start_here', 'Start here'),        emoji: '🆘', blurb: 'If you only do three modules, do these. Each one addresses the cause of a large share of real US drowning deaths.', accent: T.danger, emphasized: true },
        { id: 'modules',   label: __alloT('stem.swimlab.modules', 'Modules'),           emoji: '📖', blurb: 'The full lab. Take them in any order, or follow the cumulative quiz back to whichever ones you want to revisit.', accent: T.accent },
        { id: 'practice',  label: __alloT('stem.swimlab.practice_and_ask', 'Practice and ask'),  emoji: '🎯', blurb: 'Test your understanding, or ask the AI lifeguard a sourced question.', accent: T.accent },
        { id: 'resources', label: __alloT('stem.swimlab.resources_2', 'Resources'),         emoji: '📚', blurb: 'Where to learn to actually swim, find an adaptive program, or look up the source on any cited claim.', accent: T.accent }
      ];

      function renderMenu() {
        var educationalTiles = MENU_TILES.filter(function(tile) { return tile.section === 'start' || tile.section === 'modules'; });
        var safetyTiles = MENU_TILES.filter(function(tile) { return tile.section === 'start'; });
        var catalogSections = MENU_SECTIONS.filter(function(section) { return section.id !== 'start'; });
        var visitedCount = educationalTiles.filter(function(tile) { return !!modulesVisited[tile.id]; }).length;
        var safetyCompleted = safetyTiles.filter(function(tile) { return !!modulesVisited[tile.id]; }).length;
        var nextTile = safetyTiles.filter(function(tile) { return !modulesVisited[tile.id]; })[0]
          || educationalTiles.filter(function(tile) { return !modulesVisited[tile.id]; })[0]
          || MENU_TILES.filter(function(tile) { return tile.id === 'cumulative'; })[0];

        function openTile(tile) {
          if (!tile) return;
          upd('view', tile.id);
          markVisited(tile.id);
          wsAnnounce('Opening ' + tile.label);
        }

        function metric(label, value) {
          return h('div', { className: 'swimlab-metric', role: 'listitem' },
            h('span', { className: 'swimlab-metric-label' }, label),
            h('strong', { className: 'swimlab-metric-value' }, value));
        }

        function renderTile(tile, emphasized, compact) {
          var visited = !!modulesVisited[tile.id];
          var borderColor = visited ? T.ok : (emphasized ? T.danger : T.border);
          return h('div', { key: tile.id, role: 'listitem', className: 'swimlab-tile-wrap' },
            h('button', {
              type: 'button',
              className: 'swimlab-menu-tile' + (compact ? ' swimlab-menu-tile--compact' : ''),
              'aria-label': tile.label + (visited ? ' (visited)' : '') + (emphasized ? ' - start here' : ''),
              onClick: function() { openTile(tile); },
              style: btn({
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                padding: 14, background: emphasized ? '#0a1d2e' : T.card,
                borderColor: borderColor, borderWidth: emphasized ? 2 : 1, borderStyle: 'solid'
              })
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, tile.icon),
                h('span', { style: { fontWeight: 700, fontSize: compact ? 13 : 15, flex: 1, color: T.text } }, tile.label),
                visited && h('span', { 'aria-hidden': 'true', style: { color: T.ok, fontSize: 14 } }, '\u2713')),
              h('div', { style: { fontSize: compact ? 11 : 12, color: T.muted, lineHeight: 1.45 } }, tile.desc)
            )
          );
        }

        return h('main', { className: 'swimlab-menu-shell', 'data-swimlab-readiness': 'true' },
          h('header', { className: 'swimlab-command' },
            h('div', { className: 'swimlab-command-top' },
              h('div', null,
                h('p', { className: 'swimlab-eyebrow' }, __alloT('stem.swimlab.readiness_label', 'Water safety readiness')),
                h('h2', { className: 'swimlab-title' }, __alloT('stem.swimlab.swimlab', 'SwimLab')),
                h('p', { className: 'swimlab-subtitle' }, __alloT('stem.swimlab.readiness_blurb', 'Learn the physiology, physics, and decisions behind safer swimming, cold-water survival, and bystander rescue.'))),
              h('div', { className: 'swimlab-status', role: 'status' }, __alloT('stem.swimlab.education_status', 'Education only - in an emergency, call 911'))),
            h('div', { className: 'swimlab-metrics', role: 'list', 'aria-label': __alloT('stem.swimlab.progress_label', 'SwimLab progress') },
              metric(__alloT('stem.swimlab.safety_essentials', 'Safety essentials'), safetyCompleted + ' / ' + safetyTiles.length),
              metric(__alloT('stem.swimlab.modules_explored', 'Modules explored'), visitedCount + ' / ' + educationalTiles.length),
              metric(__alloT('stem.swimlab.badges', 'Badges'), String(Object.keys(badges).length)),
              metric(__alloT('stem.swimlab.recommended_next', 'Recommended next'), nextTile ? nextTile.label : __alloT('stem.swimlab.review', 'Review'))),
            h('div', { className: 'swimlab-actions' },
              h('button', { type: 'button', className: 'swimlab-primary', onClick: function() { openTile(nextTile); } },
                safetyCompleted < safetyTiles.length ? __alloT('stem.swimlab.continue_essentials', 'Continue safety essentials') : __alloT('stem.swimlab.continue_learning', 'Continue learning')),
              h('span', { className: 'swimlab-action-note' }, nextTile ? nextTile.label : __alloT('stem.swimlab.choose_review', 'Choose a module to review')))),

          h('section', { className: 'swimlab-section', 'aria-labelledby': 'swimlab-essential-heading' },
            h('div', { className: 'swimlab-section-head' },
              h('div', null,
                h('h3', { id: 'swimlab-essential-heading' }, __alloT('stem.swimlab.essential_route', 'Three life-saving essentials')),
                h('p', null, __alloT('stem.swimlab.essential_route_blurb', 'Start with the modules most likely to change a real-world decision.'))),
              h('span', { className: 'swimlab-action-note' }, safetyCompleted + ' / ' + safetyTiles.length)),
            h('div', { className: 'swimlab-essential-grid', role: 'list' },
              safetyTiles.map(function(tile) { return renderTile(tile, true, false); }))),

          h('details', { className: 'swimlab-catalog', open: safetyCompleted === safetyTiles.length },
            h('summary', null, __alloT('stem.swimlab.full_catalog', 'Explore all modules, practice, and resources') + ' (' + (MENU_TILES.length - safetyTiles.length) + ')'),
            h('div', { className: 'swimlab-catalog-body' },
              catalogSections.map(function(section) {
                var sectionTiles = MENU_TILES.filter(function(tile) { return tile.section === section.id; });
                if (!sectionTiles.length) return null;
                return h('section', { key: section.id, className: 'swimlab-catalog-section', 'aria-label': section.label },
                  h('h3', null, h('span', { 'aria-hidden': 'true' }, section.emoji + ' '), section.label),
                  section.blurb && h('p', null, section.blurb),
                  h('div', { className: 'swimlab-catalog-grid', role: 'list' },
                    sectionTiles.map(function(tile) { return renderTile(tile, false, true); })));
              }))),

          Object.keys(badges).length > 0 && h('section', { className: 'swimlab-badges', 'aria-label': __alloT('stem.swimlab.badges_earned', 'Badges earned') },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 } }, __alloT('stem.swimlab.badges_earned', 'Badges earned')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              Object.keys(badges).map(function(bid) {
                return h('span', { key: bid, style: { fontSize: 11, padding: '4px 10px', borderRadius: '999rem', background: '#075985', color: '#e0f2fe', border: '1px solid ' + T.water } }, badges[bid].label || bid);
              }))),

          h('div', { className: 'swimlab-quote' },
            __alloT('stem.swimlab.whoever_saves_a_single_soul_scripture__2', '"Whoever saves a single soul, scripture considers it as if they saved an entire world."'),
            h('br'),
            h('span', { style: { fontSize: 10, fontStyle: 'normal' } }, __alloT('stem.swimlab.mishnah_sanhedrin_4_5_pirkei_avot_2', '- Mishnah Sanhedrin 4:5 (Pirkei Avot)'))),
          disclaimerFooter()
        );
      }

      // Shared module components
      function sectionHeader(emoji, title) {
        return h('h3', { style: { margin: '18px 0 8px', fontSize: 15, color: T.accentHi, display: 'flex', alignItems: 'center', gap: 6 } },
          h('span', { 'aria-hidden': 'true' }, emoji), title);
      }

      function keyPointBlock(intro, points) {
        return h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
          intro && h('p', { style: { margin: '0 0 10px', color: T.text, lineHeight: 1.55, fontSize: 14 } }, intro),
          h('ul', { style: { margin: 0, paddingLeft: 18, color: T.muted, fontSize: 13, lineHeight: 1.7 } },
            points.map(function(p, i) {
              return h('li', { key: i }, typeof p === 'string' ? p : (
                h(React.Fragment, null,
                  h('strong', { style: { color: T.text } }, p.k + ': '),
                  p.v
                )
              ));
            })
          )
        );
      }

      function calloutBox(kind, title, body) {
        var palette = {
          warn: { bg: '#7c2d12', border: '#c2410c', fg: '#fed7aa', label: '⚠️' },
          info: { bg: '#075985', border: T.water, fg: '#e0f2fe', label: 'ℹ️' },
          danger: { bg: '#7f1d1d', border: '#dc2626', fg: '#fde2e2', label: '🚨' },
          ok: { bg: '#14532d', border: '#16a34a', fg: '#bbf7d0', label: '✅' }
        }[kind] || { bg: T.cardAlt, border: T.border, fg: T.text, label: '•' };
        return h('div', { style: { background: palette.bg, border: '1px solid ' + palette.border, borderRadius: 10, padding: 12, margin: '12px 0', color: palette.fg, fontSize: 13, lineHeight: 1.55 } },
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-start' } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 16 } }, palette.label),
            h('div', null,
              title && h('strong', { style: { display: 'block', marginBottom: 4 } }, title),
              body
            )
          )
        );
      }

      function scenarioCard(modId, idx, scenario) {
        var key = modId + '-scn-' + idx;
        var stateKey = '_scnState_' + modId + '_' + idx;
        var localStateRaw = useState(null);
        var localState = localStateRaw[0], setLocalState = localStateRaw[1];
        var revealed = !!localState;
        return h('div', { key: key, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 10, padding: 14, marginBottom: 10 } },
          h('div', { style: { fontSize: 12, color: T.dim, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' } }, '🎭 Scenario ' + (idx + 1)),
          h('p', { style: { margin: '0 0 12px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, scenario.prompt),
          !revealed && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
            scenario.choices.map(function(c, ci) {
              return h('button', { key: ci,
                onClick: function() { setLocalState({ choice: ci }); wsAnnounce('Choice selected. ' + (ci === scenario.correct ? 'Correct.' : 'See explanation.')); },
                style: btn({ padding: '8px 12px', fontSize: 12 }) }, c);
            })
          ),
          revealed && h('div', null,
            h('div', { style: { fontSize: 12, color: localState.choice === scenario.correct ? T.ok : T.warn, marginBottom: 8 } },
              localState.choice === scenario.correct ? '✓ Correct.' : '✗ Reconsider — see why below.'),
            h('p', { style: { margin: '0 0 6px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', null, __alloT('stem.swimlab.right_answer', 'Right answer: ')),
              scenario.choices[scenario.correct]),
            h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.55 } }, scenario.explain),
            h('button', {
              onClick: function() { setLocalState(null); },
              style: btn({ padding: '6px 10px', fontSize: 11, marginTop: 6 }) }, __alloT('stem.swimlab.try_again', 'Try again'))
          )
        );
      }

      function miniQuizBlock(modId, questions) {
        var keyPrefix = 'miniquiz_' + modId + '_';
        var qIdxRaw = useState(0);
        var qIdx = qIdxRaw[0], setQIdx = qIdxRaw[1];
        var resultsRaw = useState({});
        var results = resultsRaw[0], setResults = resultsRaw[1];
        var done = qIdx >= questions.length;
        var correct = Object.keys(results).filter(function(k) { return results[k] === true; }).length;
        var pct = questions.length ? Math.round((correct / questions.length) * 100) : 0;
        // Award the per-module mastery badge once on completion at ≥80%. This useEffect MUST be
        // called unconditionally (Rules of Hooks): it was nested inside if(done){if(pct>=80){…}}, so
        // the hook count dropped on Retry/Retake → React "rendered fewer hooks" crash.
        useEffect(function() {
          if (done && pct >= 80) {
            var bid = 'mod_' + modId;
            if (!badges[bid]) awardBadge(bid, 'Module: ' + modId);
          }
        }, [done, pct]);
        if (done) {
          return h('div', { style: { background: T.card, border: '1px solid ' + (pct >= 80 ? T.ok : T.warn), borderRadius: 12, padding: 14, marginTop: 12 } },
            h('div', { style: { fontSize: 14, fontWeight: 700, color: pct >= 80 ? T.ok : T.warn, marginBottom: 6 } },
              pct >= 80 ? '🏅 Mastery' : '📖 Review recommended'),
            h('p', { style: { margin: 0, color: T.text, fontSize: 13 } },
              'Score: ', h('strong', null, correct + ' / ' + questions.length + ' (' + pct + '%)')),
            h('button', { onClick: function() { setQIdx(0); setResults({}); }, style: btn({ marginTop: 10, padding: '6px 12px', fontSize: 12 }) }, __alloT('stem.swimlab.retry', 'Retry'))
          );
        }
        var q = questions[qIdx];
        var answered = results[qIdx] !== undefined;
        return h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 14, marginTop: 12 } },
          h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 6 } }, 'Mini-quiz · ' + (qIdx + 1) + ' / ' + questions.length),
          h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 14, fontWeight: 600 } }, q.q),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            q.opts.map(function(opt, oi) {
              var isCorrect = oi === q.ans;
              var picked = answered && results[qIdx + '_pick'] === oi;
              var style = btn({ padding: '8px 12px', fontSize: 13 });
              if (answered) {
                if (isCorrect) style = Object.assign({}, style, { background: '#14532d', borderColor: T.ok, color: '#bbf7d0' });
                else if (picked) style = Object.assign({}, style, { background: '#7f1d1d', borderColor: T.danger, color: '#fde2e2' });
              }
              return h('button', { key: oi, disabled: answered,
                onClick: function() {
                  var newResults = Object.assign({}, results);
                  newResults[qIdx] = (oi === q.ans);
                  newResults[qIdx + '_pick'] = oi;
                  setResults(newResults);
                  wsAnnounce(oi === q.ans ? 'Correct.' : 'Incorrect. The correct answer is shown.');
                }, style: style }, opt);
            })
          ),
          answered && h('div', { style: { marginTop: 10, padding: 10, background: T.cardAlt, borderRadius: 8, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.text } }, 'Why: '), q.explain),
          // Action row: "Try again" (clears the result for THIS question so
          // the user can re-pick) is only shown for wrong answers — there's
          // nothing to retry on a correct one. "Next →" advances regardless.
          answered && h('div', { style: { marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' } },
            results[qIdx] === false && h('button', {
              onClick: function() {
                var nr = Object.assign({}, results);
                delete nr[qIdx];
                delete nr[qIdx + '_pick'];
                setResults(nr);
                wsAnnounce('Question reset. Try again.');
              },
              style: btn({ padding: '8px 14px', fontSize: 13 }) }, __alloT('stem.swimlab.try_again_2', '↺ Try again')),
            h('button', {
              onClick: function() { setQIdx(qIdx + 1); },
              style: btnPrimary({ padding: '8px 14px', fontSize: 13 }) },
              qIdx + 1 < questions.length ? 'Next →' : 'See score')
          )
        );
      }

      function sourcesBlock(sources) {
        return h('div', { style: { marginTop: 14, padding: 12, background: T.cardAlt, border: '1px dashed ' + T.border, borderRadius: 8 } },
          h('div', { style: { fontSize: 11, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, __alloT('stem.swimlab.sources', '📖 Sources')),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 11, color: T.muted, lineHeight: 1.6 } },
            sources.map(function(src, i) {
              return h('li', { key: i },
                src.url ? h('a', { href: src.url, target: '_blank', rel: 'noopener', style: { color: T.link } }, src.label) : src.label,
                src.note ? ' — ' + src.note : ''
              );
            })
          )
        );
      }

      // ─────────────────────────────────────────
      // TEACHER NOTES — per-module standards, discussion prompts,
      // misconceptions, and extension activity. Collapsed by default
      // (students see a single line); expands on click and force-expands
      // on print so a teacher gets a usable handout. Standards lean on
      // the National Health Education Standards (NHES) since water
      // safety is primarily a health-education domain; physics/biology
      // modules also cite NGSS where relevant.
      // ─────────────────────────────────────────
      function TeacherNotes(props) {
        return h('details', { className: 'swimlab-teacher-notes',
          style: { background: '#3b2a08', border: '2px solid #d97706', borderRadius: 12, padding: 14, marginTop: 14 } },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fed7aa', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
            'aria-label': __alloT('stem.swimlab.teacher_notes_for_this_module', 'Teacher Notes for this module')
          },
            h('span', null, __alloT('stem.swimlab.teacher_notes_click_to_expand', '🍎 Teacher Notes — click to expand')),
            h('span', {
              className: 'swimlab-no-print',
              role: 'button', tabIndex: 0,
              'aria-label': __alloT('stem.swimlab.print_this_module_page', 'Print this module page'),
              onClick: function(e) { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} },
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); try { window.print(); } catch (_) {} } },
              style: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: '#fef3c7', color: '#7c2d12', border: '1px solid #d97706' }
            }, __alloT('stem.swimlab.print_2', '🖨️ Print'))
          ),
          h('div', { style: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 } },
            props.standards && h('div', null,
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, __alloT('stem.swimlab.aligned_standards', 'Aligned standards')),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                props.standards.map(function(s, i) {
                  return h('span', { key: i, style: { fontSize: 11, padding: '3px 8px', background: '#fef3c7', color: '#7c2d12', border: '1px solid #d97706', borderRadius: 6, fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace', fontWeight: 600 } }, s);
                })
              )
            ),
            props.discussion && h('div', null,
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, __alloT('stem.swimlab.discussion_questions', 'Discussion questions')),
              h('ol', { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: '#fde68a', lineHeight: 1.65 } },
                props.discussion.map(function(q, i) { return h('li', { key: i, style: { marginBottom: 4 } }, q); })
              )
            ),
            props.misconceptions && h('div', null,
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, __alloT('stem.swimlab.common_misconceptions', 'Common misconceptions')),
              h('ul', { style: { margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 } },
                props.misconceptions.map(function(m, i) {
                  return h('li', { key: i, style: { fontSize: 13, color: '#fde68a', lineHeight: 1.55, display: 'flex', gap: 8, alignItems: 'flex-start' } },
                    h('span', { 'aria-hidden': 'true', style: { color: '#dc2626', fontWeight: 800, flex: 'none' } }, '⚠'),
                    h('span', null,
                      h('em', null, m.wrong),
                      ' — ',
                      m.right
                    )
                  );
                })
              )
            ),
            props.extension && h('div', null,
              h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, __alloT('stem.swimlab.extension_activity', 'Extension activity')),
              h('div', { style: { fontSize: 13, color: '#fde68a', fontStyle: 'italic', lineHeight: 1.55 } }, props.extension)
            )
          )
        );
      }

      // Per-module teacher-notes content. NHES = National Health Education
      // Standards; NGSS = Next Generation Science Standards; CEC = Council
      // for Exceptional Children Special Education Standards (autism module).
      // Discussion questions favor "why" over "what" because the recall is
      // already in the module body — what the conversation needs is the
      // physics, the physiology, the policy reasoning behind the rules.
      var TEACHER_NOTES = {
        howSwimming: {
          standards: ['NHES 1.8.1', 'NHES 7.8.1', 'NGSS MS-PS2-2', 'NGSS MS-LS1-3'],
          discussion: [
            'Why does back float work physically? Tie the answer to Archimedes\' principle, lung air density, and the body\'s buoyant center.',
            'Drag-based propulsion (paddling) versus lift-based propulsion (S-shaped pull). Which one matters more in slow strokes vs fast strokes?',
            'Body composition affects floating. What does this mean for swim instruction with body-diverse students, and how would you talk about it without weight stigma?'
          ],
          misconceptions: [
            { wrong: 'Strong swimmers do not drown.', right: 'About 50% of US drowning victims could swim. Cold water, rip currents, panic, and exhaustion close the gap fast.' },
            { wrong: 'Take heavy clothes off so you can swim better.', right: 'In cold water, wet clothes trap insulating air and slow heat loss. Keep them on. The exception is heavy boots that are pulling you vertical.' },
            { wrong: 'Treading water is the safest survival posture.', right: 'Floating is. Treading burns calories and heat fast; floating uses lung air as built-in flotation and costs nothing.' }
          ],
          extension: 'Time the eggbeater kick versus the flutter kick in a pool. Have students measure how long they can hold a vertical position with each. Connect the difference back to Newton\'s third law and the geometry of the leg sweep.'
        },
        coldShock: {
          standards: ['NHES 1.8.1', 'NHES 7.8.2', 'NGSS MS-LS1-3'],
          discussion: [
            'Why does the gasp reflex exist evolutionarily, and why does the same reflex that protects mammals from suffocation become deadly when triggered by cold water on the human face?',
            'The mammalian dive response slows the heart and shunts blood to the brain. Why is this protective in near-drowning, and why is it stronger in children?',
            'Why is "I will just swim to shore" the most dangerous response to falling in cold water?'
          ],
          misconceptions: [
            { wrong: 'People die from drowning, not cold.', right: 'Drowning is the cause of death, but the gasp reflex from cold shock is what often makes them inhale water. Cold shock kills more cold-water victims than slow hypothermia does.' },
            { wrong: 'Hypothermia kills you within minutes.', right: 'In 50°F water, unconsciousness is roughly an hour out. Cold incapacitation arrives faster (~10 min) and is what disables rescue self-help. Knowing the timeline fights panic.' },
            { wrong: 'Swim hard to keep yourself warm.', right: 'Movement burns heat faster than it generates in cold water. Float, breathe through the gasp reflex, then move purposefully if you have a destination.' }
          ],
          extension: 'Watch the Cold Water Boot Camp video series with Mario Vittone. Have students log the timeline of cold shock effects on the volunteer subjects. Discuss why this kind of demonstration only works with safety divers in attendance.'
        },
        ripCurrents: {
          standards: ['NHES 1.8.1', 'NHES 5.8.3', 'NGSS MS-ESS2-2', 'NGSS MS-PS2-2'],
          discussion: [
            'How does a rip current form? Tie the answer to wave-driven shoreward water flow, the bathymetry of sand bars, and the pressure gradient that pushes the return flow seaward through gaps.',
            'The parallel-to-shore escape works because rip currents are narrow channels. How would you sketch this on a chalkboard for a student who has never seen one?',
            'Why do drowning rates spike on holiday weekends? What does that say about the role of crowds, alcohol, and unfamiliar beaches?'
          ],
          misconceptions: [
            { wrong: 'Rip tides pull you under the water.', right: 'Rip currents pull you out, not down. The danger is exhaustion from fighting the current, not being dragged below the surface. (And "rip tide" is a misnomer — they are not tidal.)' },
            { wrong: 'A strong swimmer can fight a rip current head-on.', right: 'No human swims faster than a typical rip current (1-2 ft/s, with extremes much higher). The escape is geometric, not athletic.' },
            { wrong: 'Calm water in the surf zone is safer than the breaking waves.', right: 'Calm water in a surf zone is a textbook sign of a rip current. The waves break where there is sand below; the calm is where the water is funneling back out.' }
          ],
          extension: 'Have students draw a top-down beach diagram with sand bars, rip channels, and feeder currents. Add the parallel-escape vector. Optional: pair with a NOAA rip-current statement from the local forecast office.'
        },
        iceSafety: {
          standards: ['NHES 1.8.1', 'NHES 7.8.2', 'Maine Learning Results — Health Education D'],
          discussion: [
            'Why is white "snow" ice weaker than clear blue ice? Tie the answer to the crystal structure formed during slow refreezing of slush versus slow lake-water freezing.',
            'Inlets, outlets, and underwater springs keep ice thinner even in cold weather. What does this mean for ice fishers, snowmobilers, and kids exploring a frozen pond?',
            'Why is "swim and roll out" better than "stand up and walk away" once you are back on the ice?'
          ],
          misconceptions: [
            { wrong: 'Cold water under the ice will kill you in minutes.', right: 'The 1-1-10 rule applies. You have a minute to control breathing, ten minutes of useful arm strength, and roughly an hour before unconsciousness in 35°F water.' },
            { wrong: 'Heavy winter clothing will drag you down.', right: 'Wet winter clothing actually traps air and provides insulation. Removing it during ice self-rescue removes both buoyancy and warmth.' },
            { wrong: 'Once the ice breaks, you cannot get back on it.', right: 'You usually can — if you turn back the way you came (the ice that just held you), get horizontal, kick hard, and slide out. Ice picks make this dramatically easier.' }
          ],
          extension: 'Invite a Maine Warden Service game warden as a guest speaker on ice safety and through-ice rescue. Many wardens will visit schools by appointment. Pair with a Picks of Life demonstration.'
        },
        hypothermia: {
          standards: ['NHES 1.8.1', 'NHES 7.8.1', 'NGSS MS-LS1-3', 'NGSS HS-PS3-3'],
          discussion: [
            'Why is "not dead until WARM and dead" medically true? Discuss documented cold-water full-recovery cases (Anna Bagenholm, Michelle Funk). What does this tell us about the brain\'s metabolic response to cold?',
            'Severe hypothermia patients can have an extremely slow pulse that is hard to detect. Why does this matter for the no-CPR-if-pulse rule?',
            'After-drop: rewarming the surface of a severely hypothermic patient too fast can drop core temperature further and trigger cardiac arrest. Why does this happen, and what does it imply for first-responder protocols?'
          ],
          misconceptions: [
            { wrong: 'Rub the skin and limbs to warm a hypothermic person.', right: 'Do not rub. Rubbing pushes cold peripheral blood toward the core, which can drop core temperature and induce cardiac arrest (after-drop).' },
            { wrong: 'Give them coffee or alcohol to warm up.', right: 'Both are vasodilators that move warm blood to the cold periphery, accelerating heat loss. Alcohol is also cardiotoxic in this context. Warm sweet fluids are okay only if the patient is fully alert.' },
            { wrong: 'A patient with no pulse and no breathing in cold water is dead.', right: 'Cold dramatically protects the brain. Continue CPR through transport and rewarming. People have recovered from hour-plus cardiac arrests at very low core temperatures.' }
          ],
          extension: 'Have students research the recovery of Anna Bagenholm (Norwegian skier resuscitated from 13.7°C / 56.7°F core temperature in 2000). Discuss what made her recovery possible and what the case taught wilderness medicine.'
        },
        pfd: {
          standards: ['NHES 1.8.1', 'NHES 7.8.2', 'NGSS MS-PS2-2', 'USCG 33 CFR 175 Subpart B'],
          discussion: [
            'A Type II PFD is rated for "calm inland waters" and a Type I for "rough open ocean." What is the buoyancy and turning-from-face-down difference between them, and why does it matter?',
            'Why does fit matter as much as type? Tie the answer to the lift test (does it ride up over the chin?) and what happens to a poorly-fitted PFD when the wearer hits the water hard.',
            'Per USCG data, ~86% of boating drowning victims had a PFD on the boat but were not wearing it. What does that tell us about the gap between "having safety equipment" and "using it"?'
          ],
          misconceptions: [
            { wrong: 'I am a strong swimmer, so a PFD is optional.', right: 'About half of US drowning victims could swim. PFDs save the strong swimmers who get cold, panicked, knocked out, or trapped under a hull.' },
            { wrong: 'Modern inflatable PFDs are unreliable.', right: 'Modern inflatables are USCG-approved, very reliable, and far more comfortable than foam vests. They require manual or auto inflation and need an annual check.' },
            { wrong: 'Adult PFDs work fine for kids if you tighten the straps.', right: 'Adult PFDs ride up over a child\'s head in water and trap the airway under the buoyancy. Children must wear PFDs sized for their current weight, replaced as they grow.' }
          ],
          extension: 'Have students inspect their family\'s or school\'s PFDs against the USCG checklist (intact straps, no faded fabric, working buckles, correct size, USCG-approved label). Recommend replacement of any PFD that fails.'
        },
        reachThrow: {
          standards: ['NHES 1.8.1', 'NHES 4.8.3', 'NHES 7.8.1', 'CASEL — Responsible Decision-Making'],
          discussion: [
            'Why does the bystander effect happen, and why does pointing at one specific person and saying "YOU. CALL 911." cut through it?',
            'The four-step ladder ends with "Don\'t Go" instead of "Go bravely." Why is bravery the wrong frame for water rescue, and how do you teach that to students who want to be heroes?',
            'A drowning person\'s nervous system has one priority: get above water. Why does this make them dangerous to an untrained rescuer, and how do trained lifeguards handle the approach differently?'
          ],
          misconceptions: [
            { wrong: 'Drowning looks like the movies — yelling, waving, splashing.', right: 'Drowning is silent and vertical. Mario Vittone\'s Instinctive Drowning Response: head low, mouth at water level, eyes empty, arms pressing down on the surface, no kick. The whole event lasts 20-60 seconds.' },
            { wrong: 'A strong swimmer can rescue anyone.', right: 'Untrained rescuers are the leading category of would-be-rescue deaths. Approximately 1 in 4 drowning incidents involves a second victim from a rescue attempt.' },
            { wrong: 'Calling 911 wastes time you should spend rescuing.', right: 'Professional rescue takes time to arrive. The clock starts the moment you recognize the emergency. Have someone else call while you reach or throw — both happen in parallel.' }
          ],
          extension: 'Practice the REACH technique with a pool noodle in pairs (dry land first, then waist-deep pool with a lifeguard present). Have one student play the panicked victim and grab whatever the rescuer extends. Debrief on how it felt to be anchored.'
        },
        drainEntrap: {
          standards: ['NHES 1.8.1', 'NHES 7.8.2', 'CPSC 16 CFR Part 1450', 'Virginia Graeme Baker Pool & Spa Safety Act'],
          discussion: [
            'Why was the Virginia Graeme Baker Act needed? What gap in pool safety did it address, and why was Graeme Baker\'s death the catalyst?',
            'How does an anti-vortex (multi-functional) drain cover work physically? Why is a flat single drain so much more dangerous?',
            'Why is the emergency pump shut-off the first action in a drain entrapment, not 911? What does this say about the mechanics of suction versus rescue physiology?'
          ],
          misconceptions: [
            { wrong: 'Drains can only catch hair.', right: 'Five entrapment types: hair, body, limb, evisceration, mechanical. Each requires different prevention. Body and evisceration are the deadliest.' },
            { wrong: 'All US pools are now VGBA-compliant.', right: 'VGBA covers commercial pools and spas. Many residential pools have not been retrofitted. A residential inspection is on the family.' },
            { wrong: 'You can pull someone off a drain by hand.', right: 'Active drain suction can exceed 500 lbs of force. Pulling against it can cause serious injury or evisceration. The shut-off switch is the rescue.' }
          ],
          extension: 'Have students audit a community pool against the VGBA checklist (anti-vortex covers visible, emergency shut-off labeled and accessible, no missing covers). Bring findings to the pool manager.'
        },
        autismWater: {
          standards: ['NHES 1.8.1', 'CEC Special Education Standards 1, 2, 6', 'IDEA — IEP planning', 'CASEL — Self-Awareness, Relationship Skills'],
          discussion: [
            'The 160x drowning-risk statistic is alarming. Why is it actionable rather than fatalistic? What does layered prevention look like in concrete IEP terms?',
            'How would you adapt swim instruction for an autistic student with sensory regulation challenges (cold water, drain noise, deep-end pressure changes)? What accommodations are reasonable and what should be in the lesson plan?',
            'Identity-first language ("autistic student") versus person-first ("student with autism") — what does the autistic-community research say (Bury 2020, Kenny 2016, Taboas 2023), and why does language choice matter for trust with families?'
          ],
          misconceptions: [
            { wrong: 'Autistic students cannot learn to swim.', right: 'They can. Many autistic students become competent swimmers and some compete (Special Olympics, mainstream swim teams). The pace and accommodations differ; the outcome is achievable.' },
            { wrong: 'Standard supervision is enough; no need for a special plan.', right: 'For an autistic student with elopement history, defense-in-depth (fence + alarm + adapted swim + bright suit + GPS + community awareness) is what reduces risk. No single layer is sufficient.' },
            { wrong: 'Bringing this up will scare the family.', right: 'Most families want this conversation and are relieved when the school initiates it. The 160x statistic is well-known in the autism parenting community; what families often need is a partner in planning, not protection from the data.' }
          ],
          extension: 'Have students draft an IEP water-safety addendum for a hypothetical autistic 8-year-old with elopement history living near a small pond. Optional: interview a Special Olympics aquatics coach or an adaptive swim instructor about real practice.'
        }
      };

      // ─────────────────────────────────────────
      // SVG STROKE DIAGRAM HELPERS
      // ─────────────────────────────────────────
      // Each stroke gets a small SVG showing one cycle as 4 phase frames.
      // Stick-figure side-view; arrows for force vectors; water surface as
      // a wavy line. Designed to be readable in a 720px-wide card.
      function svgFrame(opts) {
        // opts: { phase, body: [{type, ...}], arrows: [{x1,y1,x2,y2,color,label}], caption }
        var W = 160, H = 90;
        var children = [];
        // Water surface
        children.push(h('path', { key: 'wave',
          d: 'M0,' + (H * 0.55) + ' Q' + (W * 0.25) + ',' + (H * 0.5) + ' ' + (W * 0.5) + ',' + (H * 0.55) + ' T' + W + ',' + (H * 0.55),
          stroke: '#0284c7', strokeWidth: 1, fill: 'none', opacity: 0.6, style: { filter: 'drop-shadow(0 0 2px rgba(56,189,248,0.9))' } }));
        children.push(h('rect', { key: 'water', x: 0, y: H * 0.55, width: W, height: H * 0.45, fill: '#0c4a6e', opacity: 0.18 }));
        // Body parts
        (opts.body || []).forEach(function(b, bi) {
          if (b.type === 'line') children.push(h('line', { key: 'b' + bi, x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, stroke: b.color || '#f0f9ff', strokeWidth: b.width || 2.5, strokeLinecap: 'round' }));
          else if (b.type === 'circle') children.push(h('circle', { key: 'b' + bi, cx: b.cx, cy: b.cy, r: b.r, fill: b.color || '#f0f9ff', stroke: b.stroke || 'none', strokeWidth: b.strokeWidth || 0 }));
          else if (b.type === 'ellipse') children.push(h('ellipse', { key: 'b' + bi, cx: b.cx, cy: b.cy, rx: b.rx, ry: b.ry, fill: b.color || '#f0f9ff', stroke: b.stroke || 'none', strokeWidth: b.strokeWidth || 0, transform: b.transform || '' }));
          else if (b.type === 'path') children.push(h('path', { key: 'b' + bi, d: b.d, stroke: b.color || '#f0f9ff', strokeWidth: b.width || 2.5, fill: b.fill || 'none', strokeLinecap: 'round' }));
        });
        // Arrows
        (opts.arrows || []).forEach(function(a, ai) {
          children.push(h('line', { key: 'a' + ai, x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, stroke: a.color || '#fbbf24', strokeWidth: 1.5, markerEnd: 'url(#wsArrow)' }));
          if (a.label) children.push(h('text', { key: 'al' + ai, x: (a.x1 + a.x2) / 2 + (a.labelDx || 4), y: (a.y1 + a.y2) / 2 + (a.labelDy || -3), fontSize: 7, fill: a.color || '#fbbf24', fontFamily: 'system-ui, sans-serif' }, a.label));
        });
        return h('div', { style: { textAlign: 'center' } },
          h('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: { background: 'linear-gradient(180deg, #10283c 0%, #0a1d2e 55%, #06141f 100%)', borderRadius: 6, border: '1px solid ' + T.border } },
            h('defs', null,
              h('marker', { id: 'wsArrow', markerWidth: 6, markerHeight: 6, refX: 5, refY: 3, orient: 'auto', markerUnits: 'strokeWidth' },
                h('path', { d: 'M0,0 L0,6 L6,3 z', fill: '#fbbf24' }))
            ),
            children
          ),
          h('div', { style: { fontSize: 10, color: T.dim, marginTop: 4, fontStyle: 'italic' } }, opts.caption)
        );
      }

      function strokeCard(opts) {
        // opts: { id, emoji, name, intro, frames: [svgFrame opts], physics: 'string', takeaway: 'string', survival?: bool }
        return h('div', { key: opts.id, style: { background: T.card, border: '1px solid ' + (opts.survival ? T.ok : T.border), borderRadius: 12, padding: 14, marginBottom: 14 } },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, opts.emoji),
            h('h4', { style: { margin: 0, fontSize: 16, fontWeight: 800, color: T.text } }, opts.name),
            opts.survival && h('span', { style: { fontSize: 10, fontWeight: 700, padding: '2px 8px', background: '#14532d', color: '#bbf7d0', borderRadius: 999, border: '1px solid ' + T.ok } }, __alloT('stem.swimlab.survival_skill', 'SURVIVAL SKILL'))
          ),
          h('p', { style: { margin: '0 0 10px', fontSize: 13, color: T.muted, lineHeight: 1.55 } }, opts.intro),
          opts.frames && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 10 } },
            opts.frames.map(function(fr, fi) { return h('div', { key: fi }, svgFrame(fr)); })
          ),
          h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.55, padding: '8px 10px', background: T.cardAlt, borderRadius: 6, marginBottom: 8 } },
            h('strong', { style: { color: T.accentHi } }, __alloT('stem.swimlab.physics', '⚙ Physics: ')), opts.physics),
          h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.55, padding: '8px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: 6, borderLeft: '3px solid ' + T.ok } },
            h('strong', { style: { color: T.ok } }, __alloT('stem.swimlab.key_takeaway', '🎯 Key takeaway: ')), opts.takeaway),
          opts.crossRef && h('div', { className: 'swimlab-no-print', style: { marginTop: 8, fontSize: 12, lineHeight: 1.5 } },
            h('button', {
              onClick: function() { upd('view', opts.crossRef.id); markVisited(opts.crossRef.id); wsAnnounce('Opening cross-referenced module'); },
              style: { background: 'none', border: 'none', padding: 0, color: T.accentHi, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }
            }, opts.crossRef.label)
          )
        );
      }

      // ─────────────────────────────────────────
      // MODULE — HOW SWIMMING WORKS (stroke physics + survival skills)
      // ─────────────────────────────────────────
      function renderHowSwimming() {
        // Survival skills (lead with these — they save lives)
        var survivalCards = [
          {
            id: 'backFloat', emoji: '🛌', name: __alloT('stem.swimlab.back_float', 'Back Float'), survival: true,
            intro: __alloT('stem.swimlab.the_single_most_life_saving_skill_in_c', 'The single most life-saving skill in cold water. Lungs full of air make you naturally buoyant. Tilting the head back keeps the airway out of the water without effort. Costs no energy, can be held for hours, and beats panicking every single time.'),
            frames: [
              {
                phase: 'Float position',
                body: [
                  // Side-view person on back, ears in water, face up
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 6, color: '#fde68a' }, // body horizontal
                  { type: 'circle', cx: 50, cy: 48, r: 5, color: '#fde68a' }, // head tilted back
                  { type: 'line', x1: 105, y1: 51, x2: 122, y2: 53, color: '#fde68a', width: 3 }, // legs
                  { type: 'line', x1: 75, y1: 50, x2: 85, y2: 45, color: '#fde68a', width: 2 }, // arms relaxed at sides
                ],
                arrows: [
                  { x1: 80, y1: 70, x2: 80, y2: 56, color: '#22c55e', label: __alloT('stem.swimlab.buoyant_force', 'Buoyant force') }
                ],
                caption: __alloT('stem.swimlab.lungs_full_head_back_arms_relaxed', 'Lungs full · head back · arms relaxed')
              }
            ],
            physics: 'Archimedes\' principle: an object floats when displaced water weighs more than the object. Lung air is less dense than water, so a relaxed body with full lungs has average density just below 1.0 g/mL — barely positive buoyancy. Tilting the head back pivots the body around the chest (the buoyant center), which lifts the face out of the water without muscular effort.',
            takeaway: 'The first 60 seconds in cold water are about NOT fighting your body. Float on your back, tilt your head back, breathe through the gasp reflex. Then think about what comes next.',
            crossRef: { id: 'coldShock', label: __alloT('stem.swimlab.see_why_this_is_the_1_cold_water_survi', 'See why this is the #1 cold-water survival skill →') }
          },
          {
            id: 'eggbeater', emoji: '🥚', name: __alloT('stem.swimlab.eggbeater_kick_treading_water', 'Eggbeater Kick (Treading Water)'),  survival: true,
            intro: __alloT('stem.swimlab.used_by_water_polo_players_lifeguards_', 'Used by water polo players, lifeguards, and anyone needing to stay vertical in deep water for a long time. Each leg traces a circle in the opposite direction, generating continuous upward thrust without the up-and-down bobbing of a flutter kick.'),
            frames: [
              {
                phase: 'Right leg sweeps clockwise, left leg counter-clockwise',
                body: [
                  // Vertical figure, head above water, arms sculling at sides
                  { type: 'circle', cx: 80, cy: 30, r: 5, color: '#fde68a' }, // head
                  { type: 'line', x1: 80, y1: 35, x2: 80, y2: 56, color: '#fde68a', width: 4 }, // torso
                  { type: 'line', x1: 80, y1: 42, x2: 70, y2: 50, color: '#fde68a', width: 2 }, // arm L sculling
                  { type: 'line', x1: 80, y1: 42, x2: 90, y2: 50, color: '#fde68a', width: 2 }, // arm R
                  { type: 'path', d: 'M80,56 Q70,65 75,75', color: '#fde68a', width: 3 }, // leg L circling
                  { type: 'path', d: 'M80,56 Q90,65 85,75', color: '#fde68a', width: 3 }, // leg R circling opposite
                ],
                arrows: [
                  { x1: 70, y1: 68, x2: 75, y2: 80, color: '#fbbf24', label: '↻' },
                  { x1: 90, y1: 68, x2: 85, y2: 80, color: '#fbbf24', label: '↺' },
                  { x1: 80, y1: 25, x2: 80, y2: 18, color: '#22c55e', label: __alloT('stem.swimlab.lift', 'Lift') }
                ],
                caption: __alloT('stem.swimlab.counter_rotating_legs_constant_lift', 'Counter-rotating legs · constant lift')
              }
            ],
            physics: 'Each leg sweep displaces water downward via drag. Newton\'s third law: the water pushes you up with equal force. By alternating directions, the two legs are always in different parts of their cycle, so net upward thrust is constant rather than pulsed (unlike a flutter kick where both legs work in phase). The energy efficiency of an eggbeater is roughly double that of a flutter kick for the same vertical-position task.',
            takeaway: 'When you need to stay vertical in deep water for a long time (treading until rescue, holding a victim above water), eggbeater is the sustainable choice. Flutter kicking exhausts you fast.'
          },
          {
            id: 'help', emoji: '🤗', name: __alloT('stem.swimlab.help_position_heat_escape_lessening_po', 'HELP Position (Heat Escape Lessening Posture)'), survival: true,
            intro: __alloT('stem.swimlab.for_solo_cold_water_survival_while_wea', 'For solo cold-water survival while wearing a life jacket. Knees pulled to chest, arms crossed over chest, body curled. Reduces heat loss through the body\'s biggest blood-flow zones (groin, armpits, sides of chest).'),
            frames: [
              {
                phase: 'HELP position (life jacket required)',
                body: [
                  // Curled fetal-ish position floating
                  { type: 'circle', cx: 70, cy: 45, r: 5, color: '#fde68a' }, // head
                  { type: 'ellipse', cx: 80, cy: 52, rx: 10, ry: 7, color: '#fbbf24', transform: '' }, // PFD bulk on chest
                  { type: 'line', x1: 75, y1: 52, x2: 90, y2: 56, color: '#fde68a', width: 3 }, // torso
                  { type: 'path', d: 'M88,55 Q98,55 95,46 Q88,42 82,48', color: '#fde68a', width: 2.5, fill: 'none' }, // knees pulled up
                  { type: 'line', x1: 78, y1: 50, x2: 86, y2: 56, color: '#fde68a', width: 2 }, // arms crossed across chest
                ],
                arrows: [
                  { x1: 105, y1: 45, x2: 96, y2: 50, color: '#dc2626', label: __alloT('stem.swimlab.heat_loss', '−Heat loss') }
                ],
                caption: __alloT('stem.swimlab.knees_up_arms_crossed_groin_armpit_clo', 'Knees up · arms crossed · groin/armpit closed off')
              }
            ],
            physics: 'About 50% of body heat loss in cold water is through the head, sides of the chest, groin, and armpits — areas with high blood flow near the surface. Curling the body closes off three of those four zones. Heat loss in HELP position drops by roughly 50% compared to swimming or treading. Survival time in 50°F water can extend from ~1 hour to ~2-3 hours with HELP + a life jacket.',
            takeaway: 'If you are alone in cold water with a life jacket and no immediate way out, get into HELP position. Conserve heat. Wait for rescue. Movement burns heat faster than it generates.'
          },
          {
            id: 'huddle', emoji: '👥', name: __alloT('stem.swimlab.group_huddle', 'Group Huddle'), survival: true,
            intro: __alloT('stem.swimlab.multiple_people_in_cold_water_with_lif', 'Multiple people in cold water with life jackets cluster chest-to-chest, arms around each other. Children go in the middle. The group functions as a single warmer body and is much more visible to rescuers than scattered individuals.'),
            frames: [
              {
                phase: '3 people huddled (top-down view)',
                body: [
                  { type: 'circle', cx: 60, cy: 50, r: 8, color: '#fbbf24' },
                  { type: 'circle', cx: 80, cy: 45, r: 8, color: '#fbbf24' },
                  { type: 'circle', cx: 100, cy: 50, r: 8, color: '#fbbf24' },
                  { type: 'circle', cx: 80, cy: 55, r: 5, color: '#fde68a' } // child in middle
                ],
                arrows: [
                  { x1: 80, y1: 25, x2: 80, y2: 35, color: '#22c55e', label: '+Warmth' }
                ],
                caption: __alloT('stem.swimlab.adults_around_children_in_middle_facin', 'Adults around · children in middle · facing in')
              }
            ],
            physics: 'Multiple bodies share warmth at their points of contact (chest-to-chest). Combined surface area exposed to cold water drops per-person; combined visible silhouette to rescuers grows. Children placed in the center benefit most because they have higher surface-area-to-body-mass ratios and lose heat faster.',
            takeaway: 'If multiple people end up in cold water together, huddle. Everyone in life jackets, chest to chest, kids in the middle, faces in toward each other to retain breath warmth. Wait for rescue.'
          }
        ];

        // Competitive strokes (physics demos)
        var strokeCards = [
          {
            id: 'freestyle', emoji: '🏊', name: __alloT('stem.swimlab.freestyle_front_crawl', 'Freestyle (Front Crawl)'),
            intro: __alloT('stem.swimlab.the_fastest_stroke_long_axis_rotation_', 'The fastest stroke. Long-axis rotation: the body rolls 30-45° per arm cycle to reduce frontal cross-section and let the recovering arm clear the water. Bilateral breathing alternates breath sides every 3 strokes.'),
            frames: [
              {
                phase: '1. Catch',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 110, cy: 49, r: 4, color: '#fde68a' },
                  { type: 'line', x1: 80, y1: 48, x2: 50, y2: 40, color: '#fde68a', width: 2.5 }, // lead arm extended forward
                  { type: 'line', x1: 80, y1: 52, x2: 100, y2: 60, color: '#fde68a', width: 2 } // recovering arm under
                ],
                arrows: [{ x1: 50, y1: 45, x2: 50, y2: 55, color: '#fbbf24', label: '↓' }],
                caption: __alloT('stem.swimlab.hand_enters_water_forearm_sets_vertica', 'Hand enters water · forearm sets vertical')
              },
              {
                phase: '2. Pull',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 110, cy: 49, r: 4, color: '#fde68a' },
                  { type: 'line', x1: 60, y1: 50, x2: 70, y2: 60, color: '#fde68a', width: 2.5 } // arm pulling under body
                ],
                arrows: [{ x1: 70, y1: 60, x2: 95, y2: 60, color: '#22c55e', label: __alloT('stem.swimlab.thrust', 'Thrust →') }],
                caption: __alloT('stem.swimlab.arm_pulls_water_back_body_moves_forwar', 'Arm pulls water back · body moves forward')
              },
              {
                phase: '3. Push',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 110, cy: 49, r: 4, color: '#fde68a' },
                  { type: 'line', x1: 80, y1: 52, x2: 100, y2: 65, color: '#fde68a', width: 2.5 } // arm finishing push at hip
                ],
                arrows: [{ x1: 100, y1: 65, x2: 115, y2: 65, color: '#22c55e', label: '→' }],
                caption: __alloT('stem.swimlab.hand_pushes_past_hip_maximum_thrust', 'Hand pushes past hip · maximum thrust')
              },
              {
                phase: '4. Recovery',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 110, cy: 49, r: 4, color: '#fde68a' },
                  { type: 'path', d: 'M105,50 Q90,30 70,38', color: '#fde68a', width: 2.5, fill: 'none' } // arm over water
                ],
                arrows: [],
                caption: __alloT('stem.swimlab.arm_over_water_body_rolls_to_opposite_', 'Arm over water · body rolls to opposite side')
              }
            ],
            physics: 'Most propulsion comes from the PULL phase under the body (Newton\'s third law: pushing water backward propels you forward). Body roll reduces frontal drag — a flat body presents ~60% more cross-section to the water than a body rolled 30°. The "high elbow catch" lets the forearm act as a paddle through the most water; dropping the elbow loses propulsion.',
            takeaway: 'Freestyle speed comes from streamlining as much as from strength. Elite swimmers spend more energy on body position than on pulling harder.'
          },
          {
            id: 'backstroke', emoji: '🛌', name: __alloT('stem.swimlab.backstroke', 'Backstroke'),
            intro: __alloT('stem.swimlab.freestyle_inverted_same_long_axis_rota', 'Freestyle inverted — same long-axis rotation, alternating arms, flutter kick. The single most important detail: head position. A neutral head with ears in the water and eyes up keeps the hips up and the body streamlined. Looking down sinks the hips and doubles drag.'),
            frames: [
              {
                phase: 'Pull phase (one arm under, one arm over)',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 50, cy: 49, r: 4, color: '#fde68a' }, // head
                  { type: 'line', x1: 80, y1: 52, x2: 100, y2: 62, color: '#fde68a', width: 2.5 }, // arm pulling under
                  { type: 'path', d: 'M80,48 Q90,30 105,38', color: '#fde68a', width: 2.5, fill: 'none' } // arm over (recovery)
                ],
                arrows: [{ x1: 100, y1: 62, x2: 75, y2: 62, color: '#22c55e', label: __alloT('stem.swimlab.thrust_2', '← thrust') }],
                caption: __alloT('stem.swimlab.pinky_enters_first_s_shaped_pull', 'Pinky enters first · S-shaped pull')
              }
            ],
            physics: 'Same propulsion mechanics as freestyle but inverted. Head position is everything: tilting the chin to the chest sinks the hips, increasing wetted surface area and drag dramatically. Elite backstrokers keep their ears just below the surface and eyes pointed straight up.',
            takeaway: 'In any survival situation where you can swim on your back, keeping your head neutral (ears down, eyes up) makes the difference between making progress and exhausting yourself.'
          },
          {
            id: 'breaststroke', emoji: '🐸', name: __alloT('stem.swimlab.breaststroke', 'Breaststroke'),
            intro: __alloT('stem.swimlab.the_oldest_competitive_stroke_and_the_', 'The oldest competitive stroke and the slowest of the four. Symmetric arm pull and frog-kick legs separated by a long glide phase. Visible head out of water makes it good for staying oriented.'),
            frames: [
              {
                phase: '1. Pull (heart-shaped sweep)',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 110, cy: 47, r: 4, color: '#fde68a' },
                  { type: 'path', d: 'M70,48 Q60,55 70,60', color: '#fde68a', width: 2.5, fill: 'none' },
                  { type: 'path', d: 'M70,48 Q60,55 70,60', color: '#fde68a', width: 2.5, fill: 'none', transform: 'translate(20 0) scale(-1 1) translate(-160 0)' }
                ],
                arrows: [{ x1: 50, y1: 60, x2: 70, y2: 55, color: '#22c55e', label: __alloT('stem.swimlab.pull', 'Pull') }],
                caption: __alloT('stem.swimlab.arms_sweep_heart_shape_head_lifts_to_b', 'Arms sweep heart-shape · head lifts to breathe')
              },
              {
                phase: '2. Kick + Glide',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 50, cy: 49, r: 4, color: '#fde68a' },
                  { type: 'line', x1: 110, y1: 50, x2: 122, y2: 47, color: '#fde68a', width: 2 },
                  { type: 'line', x1: 110, y1: 52, x2: 122, y2: 55, color: '#fde68a', width: 2 }
                ],
                arrows: [{ x1: 122, y1: 51, x2: 135, y2: 51, color: '#fbbf24', label: __alloT('stem.swimlab.frog_kick', '↺ frog kick') }],
                caption: __alloT('stem.swimlab.frog_kick_long_glide_streamlined', 'Frog kick · long glide · streamlined')
              }
            ],
            physics: 'Propulsion is concentrated in two short pulses (the pull and the kick) separated by a long glide. Most of the cycle is spent in the glide, where the body decelerates from drag. Optimal breaststroke maximizes glide distance per kick — you propel hard, then minimize losses while coasting.',
            takeaway: 'Breaststroke is the easiest stroke to learn and the slowest to swim. The visible head makes it useful for situational awareness (looking around for boats, the shore, or a rescuer).'
          },
          {
            id: 'butterfly', emoji: '🦋', name: __alloT('stem.swimlab.butterfly', 'Butterfly'),
            intro: __alloT('stem.swimlab.the_most_physically_demanding_competit', 'The most physically demanding competitive stroke. Symmetric over-water arm recovery, dolphin kick (legs together undulating), and a body undulation that drives propulsion through the chest and hips.'),
            frames: [
              {
                phase: 'Body undulation (side view)',
                body: [
                  { type: 'path', d: 'M40,55 Q60,45 80,55 Q100,65 120,55', color: '#fde68a', width: 4, fill: 'none' }, // wave-shaped body
                  { type: 'circle', cx: 35, cy: 55, r: 4, color: '#fde68a' }, // head
                  { type: 'line', x1: 60, y1: 48, x2: 50, y2: 35, color: '#fde68a', width: 2 }, // arm reaching forward
                  { type: 'line', x1: 60, y1: 48, x2: 70, y2: 35, color: '#fde68a', width: 2 }, // other arm
                  { type: 'line', x1: 120, y1: 55, x2: 130, y2: 60, color: '#fde68a', width: 2 } // feet
                ],
                arrows: [{ x1: 130, y1: 60, x2: 130, y2: 50, color: '#fbbf24', label: __alloT('stem.swimlab.dolphin', '↕ dolphin') }],
                caption: __alloT('stem.swimlab.body_undulates_arms_recover_symmetric_', 'Body undulates · arms recover symmetric · feet whip')
              }
            ],
            physics: 'The dolphin kick is a traveling wave from chest to feet. Each undulation pushes a packet of water backward (Newton\'s third law again), so propulsion is continuous through the kick rather than pulsed. The double-arm symmetric pull adds a powerful but brief thrust burst. Butterfly is fast but oxygen-expensive — most competitive butterflyers can only sustain it for ~50-100 meters at racing speed.',
            takeaway: 'Butterfly is the closest a human gets to dolphin-style swimming. The undulation IS the propulsion; the arms add to it but the wave through the body is the engine.'
          },
          {
            id: 'sidestroke', emoji: '🚤', name: __alloT('stem.swimlab.sidestroke', 'Sidestroke'),
            intro: __alloT('stem.swimlab.historically_the_rescue_stroke_one_arm', 'Historically THE rescue stroke. One arm free for towing a victim, head above water, scissor kick, slow but sustainable. Not raced today but taught in lifeguard certification.'),
            frames: [
              {
                phase: 'Side position with scissor kick',
                body: [
                  { type: 'ellipse', cx: 80, cy: 50, rx: 32, ry: 5, color: '#fde68a' },
                  { type: 'circle', cx: 50, cy: 48, r: 4, color: '#fde68a' }, // head turned up
                  { type: 'line', x1: 50, y1: 50, x2: 35, y2: 50, color: '#fde68a', width: 2.5 }, // lead arm extended
                  { type: 'line', x1: 100, y1: 52, x2: 90, y2: 60, color: '#fde68a', width: 2 }, // trailing arm pulling at side
                  { type: 'line', x1: 110, y1: 50, x2: 125, y2: 45, color: '#fde68a', width: 2 }, // top leg up
                  { type: 'line', x1: 110, y1: 52, x2: 125, y2: 60, color: '#fde68a', width: 2 } // bottom leg down
                ],
                arrows: [{ x1: 125, y1: 53, x2: 110, y2: 53, color: '#fbbf24', label: __alloT('stem.swimlab.scissor_close', 'Scissor close') }],
                caption: __alloT('stem.swimlab.side_position_scissor_kick_head_out_on', 'Side position · scissor kick · head out · one arm free')
              }
            ],
            physics: 'Less efficient than freestyle but vastly more sustainable because the head stays out of water (no breathing rhythm to manage) and one arm can hold a victim or float. The scissor kick (open then snap closed) generates propulsion when the legs come back together — the closing motion accelerates a column of water rearward.',
            takeaway: 'If you ever take a lifeguard course, you will learn sidestroke first. It is what every rescue tow uses because it leaves an arm free and the head up.'
          }
        ];

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🏊 How Swimming Works'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 16px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.swimming_is_applied_physics_buoyancy_p', 'Swimming is applied physics: buoyancy + propulsion + drag, modulated by body position. This module breaks each stroke into phases with the physics labeled, then explains the underlying forces. '),
            h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.reading_this_is_not_a_substitute_for_s', 'Reading this is not a substitute for swim instruction. ')),
            __alloT('stem.swimlab.you_cannot_learn_to_swim_from_a_screen', 'You cannot learn to swim from a screen. Find a Water Safety Instructor at Red Cross or YMCA.')),

          sectionHeader('🆘', 'Survival skills (these actually save lives)'),
          h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.swimlab.these_four_are_the_highest_leverage_sk', 'These four are the highest-leverage skills in the whole module. They cost no athletic talent. They have saved more lives than fancy strokes ever will.')),
          survivalCards.map(strokeCard),

          sectionHeader('🏊', 'The competitive strokes (physics demos)'),
          h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.swimlab.these_are_taught_in_swim_lessons_and_u', 'These are taught in swim lessons and used in racing. Reading the physics will help you understand what your instructor is asking you to do, but it does NOT replace time in the water.')),
          strokeCards.map(strokeCard),

          sectionHeader('🔬', 'The underlying physics'),
          keyPointBlock(
            'Three forces govern every moment in water: buoyancy (up), drag (against motion), and propulsion (whatever you generate to move forward). Strokes are different ways to optimize the relationship between these three.',
            [
              { k: 'Buoyancy (Archimedes)', v: 'You float when the water you displace weighs more than you do. Lung volume is the biggest variable a person can change in real time. Full lungs add roughly 4-6 liters of displaced water = 4-6 kg of upward force, enough to make almost anyone positively buoyant. This is why "take a deep breath and float" works.' },
              { k: 'Drag (3 types)', v: 'Form drag (your body\'s shape pushing through water — minimized by streamlining), friction drag (skin against water — small for humans), and wave drag (energy lost making waves at the surface — why elite swimmers swim deep underwater after pushoffs). At human swimming speeds, form drag dominates; streamlining matters more than strength.' },
              { k: 'Propulsion (Newton\'s third law)', v: 'Every stroke moves water backward; the water pushes you forward by an equal force. The most efficient strokes use the WHOLE forearm as a paddle (not just the hand), pull water as far as possible, and avoid letting water "slip" past the limb without being moved.' },
              { k: 'Lift theory', v: 'Modern stroke instruction adds lift forces (similar to airplane wings) generated by the hand sculling at angles. The hand acts like a hydrofoil — moving through water generates perpendicular force, not just drag. This is why the "S-shaped pull" came into freestyle in the 1970s.' },
              { k: 'Reynolds number at human scale', v: 'Reynolds number describes whether flow is smooth (laminar) or chaotic (turbulent). A swimmer\'s Reynolds number is high — flow around the body is turbulent. This is why elite swimmers wear smooth-textured suits (reduces friction drag in turbulent flow) and why holding the body straight matters (broken posture creates extra turbulence).' },
              { k: 'Body composition', v: 'Body fat is less dense than water; muscle and bone are denser. Lean swimmers naturally sink without active flotation; people with higher body fat float more easily. This is biology, not effort. Lean swimmers compensate with constant motion or air in the lungs.' }
            ]
          ),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('howSwimming', 0, {
            prompt: 'You fall into a Maine lake in October (water ~55°F). You are wearing jeans and a t-shirt. You can swim a little. The shore is about 50 feet away. What is the survival-physics-best play?',
            choices: [
              'Try to swim freestyle to shore as fast as possible.',
              'Float on your back, control breathing for ~60 seconds, then swim slowly with sidestroke or breaststroke (head out, sustainable) toward shore.',
              'Take off the wet jeans and swim in just shirt and underwear.',
              'Tread water until someone notices.'
            ],
            correct: 1,
            explain: 'Float-and-breathe first (gasp reflex passes). Then move slowly with a head-out stroke so you can see, breathe, and conserve energy. Wet clothes trap insulating air; do not remove them. Swimming hard exhausts you and triggers cold incapacitation faster. Sidestroke or slow breaststroke is the survival pace.'
          }),
          scenarioCard('howSwimming', 1, {
            prompt: 'You are tested on a swim lesson and asked to demonstrate a survival skill that lets you stay vertical for 10+ minutes without exhausting yourself. Which kick do you use?',
            choices: [
              'Flutter kick (alternating up-down)',
              'Eggbeater kick (legs trace counter-rotating circles)',
              'Dolphin kick (both legs together, undulating)',
              'No kick, just arms'
            ],
            correct: 1,
            explain: 'Eggbeater. The counter-rotating circles produce continuous lift rather than pulsed lift, so you do not bob up and down. Roughly 2x as efficient as flutter kicking for staying in one vertical spot. This is what water polo players and lifeguards use.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('howSwimming', [
            { q: 'The most life-saving skill in cold water is:', opts: ['Freestyle to shore', 'Back float', 'Treading water indefinitely', 'Diving underwater'], ans: 1, explain: 'Back float costs no energy and keeps your face out of the water through the gasp reflex. It works for almost anyone and can be held for hours. Freestyle exhausts you fast in cold water; treading is harder than floating.' },
            { q: 'Eggbeater kick is more efficient than flutter kick for staying vertical because:', opts: ['It looks fancier', 'Counter-rotating legs produce constant lift instead of pulsed lift', 'It uses less leg muscle', 'It is faster forward'], ans: 1, explain: 'Each leg is in a different part of its circular cycle, so net upward force is continuous rather than pulsed. Roughly 2x the energy efficiency of flutter kicking for the vertical-position task.' },
            { q: 'In freestyle, the body roll (rotating 30-45° per stroke) primarily reduces:', opts: ['Friction drag', 'Form drag (frontal cross-section)', 'Wave drag', 'Buoyancy'], ans: 1, explain: 'A flat body presents the largest cross-section to the water. Rolling 30-45° narrows the silhouette, dropping form drag substantially. Body roll is one of the biggest drag-reduction techniques in competitive swimming.' },
            { q: 'Why do people with higher body fat float more easily?', opts: ['Body fat has lower density than water', 'They have more muscle', 'They have larger lungs', 'It is unrelated'], ans: 0, explain: 'Body fat has density ~0.9 g/mL (less than water at 1.0 g/mL); muscle and bone are denser than water. Higher fat percentage means lower average body density, which translates to easier floating. This is physics, not effort or fitness.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.usa_swimming_foundation_2', 'USA Swimming Foundation'), url: 'https://www.usaswimming.org/foundation' },
            { label: __alloT('stem.swimlab.american_red_cross_swim_water_safety', 'American Red Cross — Swim & Water Safety'), url: 'https://www.redcross.org/take-a-class/swimming' },
            { label: __alloT('stem.swimlab.ymca_aquatics_programs', 'YMCA — Aquatics Programs'), url: 'https://www.ymca.org/what-we-do/healthy-living/swimming-aquatics' },
            { label: __alloT('stem.swimlab.cold_water_boot_camp_help_and_huddle', 'Cold Water Boot Camp — HELP and Huddle'), url: 'https://coldwaterbootcamp.com' },
            { label: __alloT('stem.swimlab.counsilman_counsilman_the_science_of_s', 'Counsilman & Counsilman, "The Science of Swimming" (classic reference for stroke biomechanics)') },
            { label: __alloT('stem.swimlab.maglischo_swimming_fastest_modern_stro', 'Maglischo, "Swimming Fastest" (modern stroke physics)') }
          ]),
          h(TeacherNotes, TEACHER_NOTES.howSwimming),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 1 — COLD WATER SHOCK & 1-1-10
      // ─────────────────────────────────────────
      function renderColdShock() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🥶 Cold Water Survival'),
          emergencyBanner(),
          h('div', { role: 'note', style: { padding: '10px 14px', background: T.cardAlt, border: '1px dashed ' + T.warn, borderRadius: 8, fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 12 } },
            h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.heads_up', 'Heads up: ')),
            __alloT('stem.swimlab.this_module_talks_about_drowning_and_n', 'this module talks about drowning and near-drowning matter-of-factly. If you have lost someone to a water emergency, the content may bring difficult feelings up. You can step away or skip ahead at any time.')),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.most_cold_water_deaths_happen_in_the_f', 'Most cold water deaths happen in the first 60 seconds — not from drowning by inability to swim, but from involuntary breathing and panic. This module teaches the physiology and the response that saves lives.')),

          sectionHeader('🫁', 'What happens to your body in cold water'),
          keyPointBlock(
            'Your body has automatic, hard-wired reactions to sudden cold water. Knowing them lets you ride them out instead of fighting them.',
            [
              { k: 'Cold shock response (0-60 seconds)', v: 'A massive involuntary gasp followed by 1-3 minutes of hyperventilation. This is the gasp reflex. If your face goes under during the gasp, you inhale water.' },
              { k: 'Mammalian dive response', v: 'Cold water on the face triggers slowed heart rate (bradycardia) and shunts blood to brain and heart. This protective reflex is stronger in children and can sometimes preserve neurological function during near-drowning.' },
              { k: 'Cold incapacitation (3-30 minutes)', v: 'Your hands and arms lose strength and coordination. Even strong swimmers cannot swim or hold a rope after about 10 minutes in 50°F water.' },
              { k: 'Hypothermia (30-60 minutes)', v: 'Core body temperature drops below 95°F. This is what eventually kills if you are still in the water, but it is much slower than people think.' }
            ]
          ),

          sectionHeader('⏱️', 'The 1-1-10 Rule'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.water, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 10px', color: T.text, lineHeight: 1.55, fontSize: 14, fontWeight: 600 } },
              __alloT('stem.swimlab.if_you_fall_into_cold_water_you_have', 'If you fall into cold water, you have:')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 10 } },
              [
                { num: '1', unit: 'minute', label: __alloT('stem.swimlab.to_control_your_breathing', 'to control your breathing'), detail: __alloT('stem.swimlab.do_nothing_else_float_on_your_back_let', 'Do nothing else. Float on your back. Let the gasp reflex pass. Do not try to swim yet.') },
                { num: '10', unit: 'minutes', label: __alloT('stem.swimlab.of_meaningful_movement', 'of meaningful movement'), detail: __alloT('stem.swimlab.after_the_gasp_passes_you_have_10_minu', 'After the gasp passes, you have ~10 minutes of useful arm/hand strength to swim to safety, climb out, or signal for help.') },
                { num: '1', unit: 'hour', label: __alloT('stem.swimlab.before_unconsciousness', 'before unconsciousness'), detail: __alloT('stem.swimlab.hypothermia_takes_about_an_hour_to_mak', 'Hypothermia takes about an hour to make you unconscious in 50°F water. This means rescuers have time. People who appear "drowned" from cold water can sometimes be revived.') }
              ].map(function(stage, i) {
                return h('div', { key: i, style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 10, padding: 12 } },
                  h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6 } },
                    h('span', { style: { fontSize: 28, fontWeight: 800, color: T.accentHi } }, stage.num),
                    h('span', { style: { fontSize: 13, color: T.muted } }, stage.unit)),
                  h('div', { style: { fontSize: 13, fontWeight: 600, color: T.text, marginTop: 4 } }, stage.label),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5, marginTop: 6 } }, stage.detail)
                );
              })
            )
          ),

          calloutBox('warn', 'Why this matters in Maine',
            'Maine surface water is below 60°F most months of the year, including parts of summer. Even on warm July days, lake temperatures at depth and ocean temperatures everywhere on the coast trigger cold water shock. Cold water kills people who could swim a mile in a heated pool.'),

          calloutBox('info', 'The float-on-your-back trick',
            h(React.Fragment, null,
              __alloT('stem.swimlab.when_you_fall_in_cold_water_the_worst_', 'When you fall in cold water, the worst thing is to try to swim immediately. Tilt your head back, fill your lungs, and float. Your gasp reflex will pass in 60 seconds or so. Then you can swim or signal. This single instruction has saved thousands of lives. '),
              h('button', {
                className: 'swimlab-no-print',
                onClick: function() { upd('view', 'howSwimming'); markVisited('howSwimming'); wsAnnounce('Opening How Swimming Works'); },
                style: { background: 'none', border: 'none', padding: 0, color: T.accentHi, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }
              }, __alloT('stem.swimlab.see_the_back_float_physics_in_how_swim', 'See the Back Float physics in How Swimming Works →'))
            )),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('coldShock', 0, {
            prompt: 'You are walking next to a frozen lake in February. The ice gives way and you fall through. The water is about 35°F. You can swim in a pool. What do you do FIRST?',
            choices: [
              'Swim hard for the nearest shore.',
              'Float on your back, tilt head back, and breathe through the gasp reflex for one minute.',
              'Try to take off your jacket and boots so you can swim faster.',
              'Yell for help while treading water.'
            ],
            correct: 1,
            explain: 'The gasp reflex makes you inhale uncontrollably for the first ~60 seconds. If you try to swim or yell during that window, you will likely inhale water and drown. Floating on your back keeps your face out of the water until the gasp passes. THEN you can think about swimming or self-rescue. Heavy clothes (jackets, boots) actually trap insulating air in cold water — taking them off makes you colder and exhausts you. Keep them on until you are out of the water.'
          }),
          scenarioCard('coldShock', 1, {
            prompt: __alloT('stem.swimlab.a_friend_falls_off_a_kayak_into_a_main', 'A friend falls off a kayak into a Maine lake in October (water ~55°F). They are wearing a life jacket. They start swimming hard for shore about 200 feet away. What is the biggest risk?'),
            choices: [
              'Their life jacket will fail.',
              'They will get hypothermia in the next 5 minutes.',
              'Cold incapacitation will kill their arm strength before they reach shore.',
              'A boat will hit them.'
            ],
            correct: 2,
            explain: 'In 55°F water, most people lose useful arm/hand strength within 5-15 minutes (cold incapacitation). 200 feet is a long swim once your arms stop working. The life jacket keeps them floating once they tire — that is exactly its purpose. The better choice is often to stay with the kayak (it floats and is visible), signal, and wait for rescue rather than swim a marginal distance.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('coldShock', [
            { q: 'What is the FIRST physiological reaction when you fall in cold water?', opts: ['Hypothermia', 'A massive involuntary gasp', 'Loss of consciousness', 'Cardiac arrest'], ans: 1, explain: 'The cold shock response is an involuntary gasp followed by 1-3 minutes of hyperventilation. If your face is underwater during the gasp, you inhale water. Floating face-up for the first minute is the highest-leverage thing you can do.' },
            { q: 'In the 1-1-10 rule, the "10" stands for:', opts: ['10 seconds before drowning', '10 minutes of meaningful arm/hand strength', '10°F drop in body temperature', '10 strokes to safety'], ans: 1, explain: 'After the gasp reflex passes (~1 minute), you have roughly 10 minutes of useful arm and hand function before cold incapacitation makes meaningful movement impossible. Use that window deliberately.' },
            { q: 'Why should you NOT remove a heavy jacket if you fall in cold water?', opts: ['It is illegal to undress in public', 'The jacket traps insulating air and slows heat loss', 'You cannot swim with one arm', 'It will float away'], ans: 1, explain: 'Wet clothes (especially jackets and wool layers) trap a small amount of insulating water and air against your skin. Taking them off accelerates heat loss and exhausts you. Keep them on until you are out of the water.' },
            { q: 'A child falls into cold water and is pulled out 15 minutes later, apparently lifeless. What is the medically appropriate response?', opts: ['Pronounce dead at scene', 'Begin CPR and continue until medical professionals arrive — children have been revived after long cold-water immersion', 'Wait for rigor mortis to confirm', 'Wrap warmly and let them recover'], ans: 1, explain: 'The mammalian dive response is stronger in children. There are documented cases of full neurological recovery after 30+ minutes of cold-water submersion. The medical maxim is: "Not dead until WARM and dead." Begin CPR immediately and continue until medical professionals take over.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.cold_water_boot_camp_mario_vittone', 'Cold Water Boot Camp (Mario Vittone)'), url: 'https://coldwaterbootcamp.com', note: __alloT('stem.swimlab.the_1_1_10_rule_mammalian_dive_respons', 'The 1-1-10 rule, mammalian dive response, cold incapacitation timelines') },
            { label: __alloT('stem.swimlab.cdc_drowning_prevention', 'CDC: Drowning prevention'), url: 'https://www.cdc.gov/drowning' },
            { label: __alloT('stem.swimlab.national_drowning_prevention_alliance_', 'National Drowning Prevention Alliance (NDPA)'), url: 'https://ndpa.org' },
            { label: __alloT('stem.swimlab.mario_vittone_if_a_child_is_drowning', 'Mario Vittone — "If a child is drowning"'), url: 'https://mariovittone.com' },
            { label: __alloT('stem.swimlab.aap_policy_statement_prevention_of_dro', 'AAP Policy Statement: Prevention of Drowning (2019, reaffirmed)'), url: 'https://publications.aap.org/pediatrics/article/143/5/e20190850/76998' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.coldShock),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 2 — RIP CURRENTS
      // ─────────────────────────────────────────
      function renderRipCurrents() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🌊 Rip Currents'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.rip_currents_pull_thousands_of_beachgo', 'Rip currents pull thousands of beachgoers out to sea every year on US coasts, including Maine. The escape technique is counterintuitive — most people get it wrong because they panic.')),

          sectionHeader('❓', 'What is a rip current?'),
          keyPointBlock(
            'A rip current is a narrow, fast-moving channel of water flowing AWAY from shore through the surf zone. It forms when waves pile water on the beach and that water finds a low spot to escape back to deeper water.',
            [
              { k: 'Speed', v: 'Up to 8 feet per second (5 mph) — faster than an Olympic swimmer can sprint.' },
              { k: 'Width', v: 'Usually 10 to 30 feet wide. They are narrow.' },
              { k: 'Length', v: 'Most rip currents end just past the breaking waves (50-100 yards offshore). They do NOT pull you "out to sea" forever.' },
              { k: 'Frequency', v: 'Cause about 80% of beach lifeguard rescues per the US Lifesaving Association (USLA).' }
            ]
          ),

          sectionHeader('👁️', 'How to spot one from shore'),
          keyPointBlock(
            'Look for breaks in the wave pattern. A rip current shows up as a quiet patch in an otherwise breaking line of waves.',
            [
              'A noticeable gap or channel of darker water cutting through the line of breaking waves',
              'Foam, seaweed, or sand visibly moving away from shore in a single line',
              'Water that looks calmer than the water on either side (deceptive — it looks "safer")',
              'Discolored water (sand churned up) extending past the surf line'
            ]
          ),

          calloutBox('warn', 'The deceptive calm',
            'A rip current looks like a peaceful break in the surf. Many people deliberately swim into one because it looks like the easy spot. This is exactly backwards. Calm water in a surf zone is suspicious water.'),

          sectionHeader('🆘', 'If you are caught in one'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.water, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('ol', { style: { margin: 0, paddingLeft: 20, color: T.text, lineHeight: 1.7, fontSize: 14 } },
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, 'Do NOT swim against the current.'),
                __alloT('stem.swimlab.you_will_exhaust_yourself_and_drown_th', ' You will exhaust yourself and drown. The current is faster than you can swim.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.stay_calm_float_if_you_need_to', 'Stay calm. Float if you need to.')),
                __alloT('stem.swimlab.the_current_will_not_pull_you_under_on', ' The current will not pull you under, only out. You can float through the whole thing if you have to.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.swim_parallel_to_the_shore', 'Swim PARALLEL to the shore.')),
                __alloT('stem.swimlab.rip_currents_are_narrow_after_30_100_f', ' Rip currents are narrow. After 30-100 feet of parallel swimming you will be in normal water and can swim back to shore at an angle.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.if_you_cannot_escape_signal_and_float', 'If you cannot escape, signal and float.')),
                __alloT('stem.swimlab.wave_one_arm_and_yell_a_lifeguard_or_b', ' Wave one arm and yell. A lifeguard or bystander can throw a flotation device. The current will eventually weaken (rip currents end past the breakers).')),
              h('li', null,
                h('strong', null, __alloT('stem.swimlab.if_you_see_someone_else_in_a_rip', 'If you see someone else in a rip:')),
                __alloT('stem.swimlab.do_not_swim_out_to_them_throw_flotatio', ' do NOT swim out to them. Throw flotation, alert lifeguards, call 911. Untrained rescuers drown in rip currents at high rates trying to save someone.'))
            )
          ),

          calloutBox('info', 'In Maine specifically',
            'Maine beaches with notable rip current history include Old Orchard Beach, Wells Beach, Higgins Beach, Reid State Park, and Popham Beach. The National Weather Service Caribou and Gray offices issue rip current risk forecasts. Check the surf forecast before going to the beach.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('ripCurrents', 0, {
            prompt: 'You are at a Maine beach. You notice a strip of water about 20 feet wide that looks calmer than the water around it, with foam moving steadily away from shore. A friend says "let\'s swim out there, the waves look smaller." What do you say?',
            choices: [
              '"Sure, less waves means easier swimming."',
              '"That looks like a rip current. The calm is the channel where water is flowing back to sea. Let\'s swim somewhere else."',
              '"Let\'s race out and back."',
              '"It probably is fine, lifeguards would have warned us."'
            ],
            correct: 1,
            explain: 'A noticeably calm strip of water in an otherwise breaking surf zone, with foam or debris moving seaward, is a textbook rip current. It looks safer because there are no breaking waves on top of it — that "calm" is the surface of a fast outflow channel. Swim in the breaking-wave zones on either side instead, or pick a different beach entry point.'
          }),
          scenarioCard('ripCurrents', 1, {
            prompt: 'You are caught in a rip current. You have been swimming hard toward shore for 30 seconds and have not moved. What is the right next move?',
            choices: [
              'Swim harder.',
              'Stop swimming, float, then swim parallel to shore.',
              'Yell for help and tread water until rescued.',
              'Take a deep breath and dive under the current.'
            ],
            correct: 1,
            explain: 'Swimming harder against a current that is faster than you can sprint is how people drown from exhaustion. Stop. Float to recover energy. Then swim parallel to the shore (left or right, whichever feels easier) until you are out of the narrow rip channel. Then angle back to shore. Diving under does not work — the current is the entire water column, not a surface flow.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('ripCurrents', [
            { q: 'Roughly what fraction of US beach lifeguard rescues involve rip currents?', opts: ['About 10%', 'About 30%', 'About 80%', 'Almost none'], ans: 2, explain: 'The US Lifesaving Association (USLA) reports rip currents cause approximately 80% of all beach rescues. They are by far the dominant beach hazard.' },
            { q: 'You are caught in a rip current. What direction should you swim?', opts: ['Straight back to shore as fast as possible', 'Diagonally toward shore at a 45-degree angle', 'Parallel to the shore until you are out of the narrow channel', 'Straight out to sea so you can come around'], ans: 2, explain: 'Rip currents are narrow (10-30 feet wide). Swimming parallel to the shore for 30-100 feet gets you out of the channel and into water you can swim through. Then angle back to shore.' },
            { q: 'A rip current LOOKS like:', opts: ['A wave taller than the others', 'A calm-looking channel of water that breaks the line of breaking waves', 'A patch of bright blue water', 'Whitecaps moving toward shore'], ans: 1, explain: 'The deceptive feature of a rip current is that it looks SAFER than the water around it — calm, often darker, with foam or debris moving away from shore. Do not swim into the calm patch. Calm water in a surf zone is the warning sign.' },
            { q: 'You see someone caught in a rip. What should you do?', opts: ['Swim out to grab them', 'Throw flotation, alert lifeguards, call 911 — do not swim out', 'Wait and see if they make it on their own', 'Run for help and assume someone else will rescue them'], ans: 1, explain: 'Untrained would-be rescuers drown in rip currents at high rates. Reach / Throw / Row / DON\'T GO. Throw a flotation device, get a lifeguard or trained rescuer, call 911. The next module covers this in depth.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.noaa_rip_current_safety', 'NOAA Rip Current Safety'), url: 'https://www.weather.gov/safety/ripcurrent' },
            { label: __alloT('stem.swimlab.us_lifesaving_association_usla_rip_cur', 'US Lifesaving Association (USLA) — Rip Currents'), url: 'https://www.usla.org/page/RIPCURRENTS' },
            { label: __alloT('stem.swimlab.nws_gray_maine_forecast_office_beach_h', 'NWS Gray (Maine forecast office) — Beach Hazards'), url: 'https://www.weather.gov/gyx/' },
            { label: __alloT('stem.swimlab.cdc_drowning_prevention_2', 'CDC: Drowning prevention'), url: 'https://www.cdc.gov/drowning' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.ripCurrents),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 3 — REACH / THROW / ROW / DON'T GO
      // ─────────────────────────────────────────
      function renderReachThrow() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🪢 How to Help Without Drowning Yourself'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.you_cannot_help_someone_you_do_not_rea', 'You cannot help someone you do not realize is drowning. And once you realize it, the strongest urge is to jump in. Both of those instincts are wrong. This module covers '),
            h('strong', { style: { color: T.text } }, 'recognizing'),
            __alloT('stem.swimlab.drowning_it_does_not_look_like_the_mov', ' drowning (it does not look like the movies) and '),
            h('strong', { style: { color: T.text } }, 'helping'),
            __alloT('stem.swimlab.without_becoming_the_second_victim', ' without becoming the second victim.')),

          // ── Drowning recognition (Mario Vittone framework) ──
          // This is the single most-cited piece of public-facing water safety
          // writing of the past 20 years. Vittone's "Drowning doesn't look
          // like drowning" article (originally On Scene magazine, 2006) is
          // referenced by USCG, US Lifesaving Association, and the CDC. The
          // "instinctive drowning response" framework — silent, vertical,
          // 20-60 second window, no waving, no yelling — has saved an
          // unknowable number of lives by teaching people what to look for
          // BEFORE the head goes under.
          sectionHeader('👀', 'Drowning does not look like drowning'),
          calloutBox('danger', 'Drowning is silent.',
            h(React.Fragment, null,
              __alloT('stem.swimlab.real_drowning_looks_almost_nothing_lik', 'Real drowning looks almost nothing like the movies. There is no yelling for help. There is no waving of arms. There is no thrashing. A drowning person\'s body is doing one thing: trying to keep the airway above water. Speech is secondary to breathing — they cannot call out. Arms are pressing instinctively down on the surface to lift the head — they cannot wave. The whole event lasts only '),
              h('strong', null, __alloT('stem.swimlab.20_to_60_seconds', '20 to 60 seconds')),
              __alloT('stem.swimlab.before_submersion_if_you_do_not_know_w', ' before submersion. If you do not know what to look for, you will miss it standing 10 feet away.'))),
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('div', { style: { fontSize: 14, fontWeight: 700, color: T.accentHi, marginBottom: 10 } },
              __alloT('stem.swimlab.the_instinctive_drowning_response_five', 'The Instinctive Drowning Response — five visible signs (Mario Vittone)')),
            h('ol', { style: { margin: 0, paddingLeft: 20, color: T.text, lineHeight: 1.7, fontSize: 13 } },
              h('li', { style: { marginBottom: 6 } },
                h('strong', null, __alloT('stem.swimlab.head_low_in_the_water_mouth_at_water_l', 'Head low in the water, mouth at water level. ')),
                __alloT('stem.swimlab.often_tilted_back_with_the_mouth_open_', 'Often tilted back with the mouth open. The person looks like they are trying to drink the water.')),
              h('li', { style: { marginBottom: 6 } },
                h('strong', null, __alloT('stem.swimlab.eyes_are_glassy_and_empty_or_closed', 'Eyes are glassy and empty, or closed. ')),
                __alloT('stem.swimlab.they_cannot_focus_a_person_with_eyes_c', 'They cannot focus. A person with eyes closed in the water who is not playing a game is in trouble.')),
              h('li', { style: { marginBottom: 6 } },
                h('strong', null, __alloT('stem.swimlab.hair_may_be_over_the_forehead_or_eyes', 'Hair may be over the forehead or eyes. ')),
                __alloT('stem.swimlab.they_will_not_push_it_away_their_hands', 'They will not push it away — their hands are needed elsewhere.')),
              h('li', { style: { marginBottom: 6 } },
                h('strong', null, __alloT('stem.swimlab.body_is_vertical_in_the_water_no_kick', 'Body is vertical in the water, no kick. ')),
                __alloT('stem.swimlab.swimmers_move_horizontally_drowning_pe', 'Swimmers move horizontally. Drowning people are upright, treading silently and ineffectively.')),
              h('li', null,
                h('strong', null, __alloT('stem.swimlab.ladder_climbing_pressing_down_on_the_s', '"Ladder climbing" — pressing down on the surface. ')),
                __alloT('stem.swimlab.arms_extend_laterally_and_press_down_i', 'Arms extend laterally and press down, instinctively trying to leverage the body up out of the water. From shore this looks like "playing in the water." It is not.'))
            )
          ),
          calloutBox('warn', 'What "aquatic distress" looks like (the warning sign before drowning)',
            'Aquatic distress is the precursor: a swimmer who CAN still call for help, wave, and grab a rescue device. This is the moment to throw flotation. Within 20-60 seconds it can become silent, vertical drowning. If you see someone in distress, act now — do not wait to see if it gets worse.'),
          calloutBox('info', 'Lifeguard\'s test: "Are you okay?"',
            'If you are unsure whether someone in the water is in trouble, call out to them. A normal swimmer answers, jokes, asks why. A drowning person cannot. Silence is the answer.'),

          sectionHeader('🪜', 'The four-step ladder'),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 14 } },
            [
              { step: 'REACH', icon: '🤲', desc: __alloT('stem.swimlab.lie_or_kneel_on_a_stable_surface_dock_', 'Lie or kneel on a stable surface (dock, shore, edge of pool). Extend a pole, branch, oar, towel, shirt, or even your leg. Stay anchored — do not let the victim pull you in. Pull them to safety hand-over-hand.'), when: 'Victim is within arm or pole reach of solid ground.' },
              { step: 'THROW', icon: '🎯', desc: __alloT('stem.swimlab.throw_a_flotation_device_life_ring_thr', 'Throw a flotation device — life ring, throw bag, cooler, empty milk jug with cap, even a tied-off plastic trash bag with air. Aim slightly past the victim and drag it back to them. Yell instructions: "GRAB THIS, KICK YOUR FEET, I AM PULLING YOU IN."'), when: 'Victim is too far to reach but within throw distance.' },
              { step: 'ROW', icon: '🚣', desc: __alloT('stem.swimlab.use_a_boat_kayak_canoe_paddleboard_row', 'Use a boat — kayak, canoe, paddleboard, rowboat. Approach with the bow toward the victim. Have them grab the back, not the side. NEVER let them climb in over the side — they will flip you. Tow them to shore.'), when: 'Victim is too far to throw to but a boat is available.' },
              { step: "DON'T GO", icon: '🚫', desc: __alloT('stem.swimlab.do_not_enter_the_water_unless_you_are_', 'Do not enter the water unless you are a trained lifeguard or rescue swimmer. Panicked drowning victims grab anything that floats — including you — and push it under. The leading cause of death in would-be rescuers is being drowned by the person they tried to save.'), when: 'No reach, no throw, no boat, and you are not a trained rescuer.' }
            ].map(function(s, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + (i === 3 ? T.danger : T.border), borderRadius: 10, padding: 14 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 24 } }, s.icon),
                  h('div', { style: { fontSize: 18, fontWeight: 800, color: i === 3 ? T.accentHi : T.text, letterSpacing: '0.05em' } }, s.step)),
                h('p', { style: { margin: '0 0 6px', fontSize: 13, color: T.text, lineHeight: 1.55 } }, s.desc),
                h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Use when: ' + s.when)
              );
            })
          ),

          calloutBox('danger', 'Why "Don\'t Go" is on the list',
            'A drowning person is not thinking clearly. Their nervous system has one priority: get above water. They will climb whatever is closest, including you. They can push a fully grown adult underwater and hold them there. Lifeguards are trained to approach with flotation between themselves and the victim, and to break holds. Without that training, you become victim number two. Approximately 1 in 4 drowning victims die during a rescue attempt by an untrained bystander (CDC data on rescue-related drownings).'),

          sectionHeader('📞', 'Always: call 911 first or have someone else call'),
          keyPointBlock(
            'The first action in any water emergency is activating professional rescue. Even if you have a clear reach or throw, call 911 (or have a bystander call) before or during the rescue. Lifeguards, paramedics, dive teams take time to arrive. Start that clock the moment you recognize the emergency.',
            [
              'In Maine you can text 911 if you cannot speak (cold, water, communication disability)',
              'Tell the dispatcher: WHERE (specific location), WHAT (drowning, ice break-through, etc.), WHO (how many people, ages if known)',
              'Stay on the line until told to hang up — they may give you instructions',
              'If you are coordinating multiple bystanders, point at one specific person and say "YOU. CALL 911 NOW." Bystander effect happens; named instructions cut through it.'
            ]
          ),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('reachThrow', 0, {
            prompt: 'You are walking past a public pool. A child has fallen in and is panicking near the edge — about 4 feet from where you are standing. There is no lifeguard visible. What do you do FIRST?',
            choices: [
              'Jump in and grab them.',
              'Lie flat on the deck, anchor yourself, extend a hand or pool noodle, and pull them out.',
              'Run to find a lifeguard.',
              'Yell at them to swim to the edge.'
            ],
            correct: 1,
            explain: 'REACH first when the victim is within reach. Lie or kneel on the deck so you cannot be pulled in. Extend whatever you have. Yell at someone else to call 911 and find a lifeguard. Do not jump in unless you have no other option AND you are trained.'
          }),
          scenarioCard('reachThrow', 1, {
            prompt: __alloT('stem.swimlab.a_teenager_is_struggling_about_30_feet', 'A teenager is struggling about 30 feet from shore in a Maine lake. There is a kayak with a paddle nearby on the beach. You can swim, but you have never done a water rescue. What is the right play?'),
            choices: [
              'Swim out and tow them back.',
              'Push out the kayak, paddle to them, have them grab the BACK of the kayak (not the side), and tow them to shore. Have someone call 911.',
              'Wait for help.',
              'Throw a sandal at them.'
            ],
            correct: 1,
            explain: 'ROW. The kayak gives you flotation between you and the panicked victim, lets you cover distance fast, and keeps both of you safe. Approach with the bow toward them, have them grab the back end, paddle them to shore. Never let a panicking victim climb in over the side of a small boat — they will flip you both.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('reachThrow', [
            { q: 'A real drowning person typically:', opts: ['Yells loudly and waves their arms', 'Is silent and vertical in the water, with arms pressing down on the surface', 'Splashes wildly like in the movies', 'Calls a specific lifeguard by name'], ans: 1, explain: 'The Instinctive Drowning Response is silent. Speech is secondary to breathing — a drowning person cannot call out. Arms press down on the surface to lift the head, so they cannot wave. The whole event lasts 20-60 seconds before submersion. If you do not know what to look for, you will miss it standing 10 feet away (Mario Vittone).' },
            { q: 'What is the LAST step in the bystander rescue ladder?', opts: ['Reach', 'Throw', 'Row', "Don't Go (only enter the water if trained)"], ans: 3, explain: 'Reach, Throw, Row, then DON\'T GO. Entering the water as an untrained rescuer is the most dangerous option and is the leading cause of death in would-be rescuers.' },
            { q: 'When throwing a flotation device, where should you aim?', opts: ['Directly at the victim\'s head', 'Past the victim, then drag it to them', 'Three feet short of the victim', 'Toward the lifeguard'], ans: 1, explain: 'Aim slightly past the victim. If you throw short, you have to retrieve and re-throw. If you throw long and drag it back across them, they grab it as it passes. Yell clear instructions: GRAB THIS, KICK YOUR FEET.' },
            { q: 'A panicked drowning person who climbs onto a rescuer typically:', opts: ['Calms down once they have something to hold', 'Pushes the rescuer underwater while trying to get above the surface', 'Lets the rescuer take over', 'Floats peacefully'], ans: 1, explain: 'A drowning person\'s nervous system has one priority: get above water. They will climb anything floating — including a person — and push it under. This is why entering the water without training is so dangerous.' },
            { q: 'You see a water emergency unfolding. What is the first thing you should do (or have someone else do)?', opts: ['Take a video so there is a record', 'Call 911', 'Swim out to investigate', 'Wait to see if it resolves'], ans: 1, explain: 'Call 911 (or text 911 in Maine) immediately, or point at a specific bystander and tell them to call. Professional rescue takes time to arrive. Start that clock the moment you recognize the emergency.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.mario_vittone_drowning_doesn_t_look_li', 'Mario Vittone — "Drowning Doesn\'t Look Like Drowning"'), url: 'https://mariovittone.com/2010/05/154/', note: __alloT('stem.swimlab.the_canonical_public_facing_essay_on_t', 'The canonical public-facing essay on the Instinctive Drowning Response. Originally published in On Scene magazine (2006) by Dr. Francesco A. Pia and refined by Vittone.') },
            { label: __alloT('stem.swimlab.american_red_cross_water_safety', 'American Red Cross — Water Safety'), url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/water-safety.html' },
            { label: __alloT('stem.swimlab.ymca_aquatic_standards', 'YMCA Aquatic Standards'), url: 'https://www.ymca.org/what-we-do/healthy-living/swimming-aquatics' },
            { label: __alloT('stem.swimlab.cdc_unintentional_drowning_statistics', 'CDC: Unintentional Drowning Statistics'), url: 'https://www.cdc.gov/drowning/data-research/index.html' },
            { label: __alloT('stem.swimlab.dan_divers_alert_network_in_water_resc', 'DAN (Divers Alert Network) — In-water Rescue Principles'), url: 'https://dan.org' },
            { label: __alloT('stem.swimlab.us_lifesaving_association_usla', 'US Lifesaving Association (USLA)'), url: 'https://www.usla.org' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.reachThrow),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 4 — LIFE JACKETS (PFDs)
      // ─────────────────────────────────────────
      function renderPfd() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🦺 Why Life Jackets Work'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.a_properly_fitted_us_coast_guard_appro', 'A properly fitted, US Coast Guard-approved Personal Flotation Device (PFD) is the single highest-leverage piece of safety equipment in any boat or near any open water. The numbers are stark.')),

          calloutBox('danger', 'The 86% statistic',
            'Per US Coast Guard recreational boating data, approximately 86% of boating-related drowning victims were not wearing a life jacket at the time of death. The single intervention that would have most likely saved them was wearing the PFD they probably had on the boat.'),

          sectionHeader('🦺', 'The five PFD types'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { type: 'I', name: __alloT('stem.swimlab.offshore', 'Offshore'), use: 'Open ocean, far from shore. Highest buoyancy. Will turn most unconscious wearers face-up.' },
              { type: 'II', name: __alloT('stem.swimlab.near_shore_buoyant_vest', 'Near-shore Buoyant Vest'), use: 'Calm inland water with quick rescue likely. Will turn SOME unconscious wearers face-up.' },
              { type: 'III', name: __alloT('stem.swimlab.flotation_aid', 'Flotation Aid'), use: 'Most recreational boating, kayaking, water skiing. Will NOT turn unconscious wearers face-up. Conscious wearer must position themselves.' },
              { type: 'IV', name: __alloT('stem.swimlab.throwable', 'Throwable'), use: 'Ring buoy, horseshoe buoy, throwable cushion. NOT worn — thrown to a victim. Required as backup on most boats.' },
              { type: 'V', name: __alloT('stem.swimlab.special_use', 'Special Use'), use: 'Inflatable, work vest, sailboard harness, etc. Type V only counts if worn and used as the label specifies.' }
            ].map(function(p, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 12 } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 } },
                  h('span', { style: { fontSize: 20, fontWeight: 800, color: T.accentHi } }, 'Type ' + p.type),
                  h('span', { style: { fontSize: 12, color: T.muted, fontWeight: 600 } }, p.name)),
                h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.5 } }, p.use)
              );
            })
          ),

          sectionHeader('✋', 'The fit check that actually works'),
          keyPointBlock(
            'A life jacket that does not fit can be worse than no life jacket — it rides up over your face when you hit the water and can hold you head-down. Use this 4-step check every time, especially with kids:',
            [
              { k: 'Snug', v: 'Fasten all straps. The jacket should feel firmly hugged to your torso, not loose.' },
              { k: 'Lift test', v: 'Have someone lift the jacket straight up at the shoulders. If it rides up over your chin or ears, it is too big or too loose.' },
              { k: 'Mobility', v: 'Raise your arms over your head. Twist side to side. The jacket should move with you, not slide up.' },
              { k: 'In-water check (best)', v: 'Try the jacket in shallow water. It should keep your chin above the surface without you treading water. If it does not, the size or buoyancy is wrong.' }
            ]
          ),

          calloutBox('warn', 'Kid-specific: do not buy "to grow into"',
            'Children\'s life jackets must fit RIGHT NOW. A jacket that is too big rides up over the head in water. Buy by weight range printed on the label, replace as the child grows. Inflatable PFDs are NOT US Coast Guard approved for children under 16 (or under 80 lbs depending on model). Use Type II or III inherent foam jackets sized for the child.'),

          sectionHeader('⚖️', 'Maine boating law (the basics)'),
          keyPointBlock(
            h(React.Fragment, null,
              __alloT('stem.swimlab.per_maine_title_12_inland_fisheries_wi', 'Per Maine Title 12 (Inland Fisheries & Wildlife) and applicable federal USCG rules. '),
              h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.always_check_the_current_statute_at_th', 'Always check the current statute at the Maine IFW link in the Sources block')),
              __alloT('stem.swimlab.boating_law_gets_updated_and_a_tool_pu', ' — boating law gets updated, and a tool published in one year is not a substitute for the current rule.')),
            [
              'Every person on board needs a US Coast Guard-approved PFD in serviceable condition, of appropriate size for the wearer (Type I, II, III, or appropriate Type V) — 12 MRS §13056',
              'Children 10 and under must WEAR a properly-fitting USCG-approved PFD whenever the watercraft is underway (12 MRS §13056-A) — applies to any watercraft, not just small boats',
              'Boats 16 feet and longer must also carry an additional throwable Type IV device (USCG 33 CFR 175.15) — Maine adopts the federal rule',
              'Personal watercraft (jet skis, wave runners): EVERY person aboard must wear a USCG-approved PFD, regardless of age — 12 MRS §13068-A',
              'Anyone being towed (water skiing, tubing, wakeboarding) must wear a USCG-approved PFD',
              'PFDs stuffed in a bow compartment "for emergencies" do not count as worn — boats can be cited if PFDs are not readily accessible',
              'Maine Game Wardens (Maine Warden Service) have enforcement authority — they can stop a boat for a safety inspection, and noncompliance carries fines'
            ]
          ),

          calloutBox('info', 'What if the water is calm and you can swim?',
            'The most common boating fatality scenario is: experienced swimmer, calm water, short trip, PFD on the boat but not worn. Then something unexpected happens (collision, capsize, person overboard). They never get to the PFD. Wear it. Always. Every time. Adults model this for kids; if you take it off "because you can swim," every kid on the boat learns the same.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('pfd', 0, {
            prompt: 'You are taking your 8-year-old cousin out in a kayak on a Maine lake. They have a life jacket but say "it\'s annoying." What is the right call, both legally and as their grown-up?',
            choices: [
              'Skip the PFD since the lake is calm.',
              'PFD must be ON. Maine law requires it for any child 10 or under whenever the watercraft is underway. And it is the right call regardless.',
              'Loosen all the straps so it is more comfortable.',
              'Let them decide.'
            ],
            correct: 1,
            explain: 'Maine 12 MRS §13056-A requires children 10 and under to wear a USCG-approved PFD whenever the watercraft is underway — there is no boat-size exception (you are in a kayak, which counts). It is also the right call regardless of law. Kids learn boating culture from the adult on the boat. If you wear yours and theirs is on tight (lift test it before you launch), the trip will be fine and the habit is set.'
          }),
          scenarioCard('pfd', 1, {
            prompt: __alloT('stem.swimlab.you_buy_a_child_s_life_jacket_you_do_t', 'You buy a child\'s life jacket. You do the lift test on shore: when you lift at the shoulders, the jacket comes up to the child\'s ears. The salesperson says it will be fine in the water and the child will "grow into it." What do you do?'),
            choices: [
              'Trust the salesperson.',
              'Return it. A jacket that rides up to the ears in a lift test will go over the head in the water. Get a smaller size, even if it means the child outgrows it next year.',
              'Tighten the straps and try again.',
              'Use it but only in shallow water.'
            ],
            correct: 1,
            explain: 'A PFD that fails the lift test fails in the water. It can hold a child face-down. Get the right size for the current weight. Buying "to grow into" is a documented contributor to drowning deaths.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('pfd', [
            { q: 'Approximately what percentage of boating drowning victims were NOT wearing a life jacket?', opts: ['About 20%', 'About 50%', 'About 86%', 'Almost none'], ans: 2, explain: 'US Coast Guard data: ~86% of boating-related drowning victims were not wearing a PFD. The PFD was usually on the boat. Wear it from the moment you launch.' },
            { q: 'A "Type IV" PFD is:', opts: ['Worn at all times', 'A throwable device (ring, cushion) — backup, not worn', 'Only for kids', 'Inflatable'], ans: 1, explain: 'Type IV = throwable. It is required as a backup on most boats, but it is NOT worn. The wearable PFDs are Types I, II, III, and V.' },
            { q: 'You do a lift test on a child\'s PFD by lifting at the shoulders. The jacket rides up to their ears. What does this mean?', opts: ['Perfect fit', 'Too tight', 'Too loose or too big — get a different size', 'Defective'], ans: 2, explain: 'The lift test simulates what happens when the child hits the water. If it rides up to the ears on land, it will go over the head in the water. Wrong size — get a smaller one, sized to current weight.' },
            { q: 'Under Maine law, a child of what age must WEAR a PFD whenever a watercraft is underway?', opts: ['Under 6', '10 and under', 'Under 13', 'Only on personal watercraft'], ans: 1, explain: '12 MRS §13056-A: any child age 10 or younger must wear a properly-fitting USCG-approved PFD whenever the watercraft is underway. There is no boat-size exception. On personal watercraft (jet skis), 12 MRS §13068-A requires EVERY person aboard to wear a PFD, regardless of age.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.us_coast_guard_recreational_boating_st', 'US Coast Guard — Recreational Boating Statistics'), url: 'https://www.uscgboating.org/statistics/accident_statistics.php' },
            { label: __alloT('stem.swimlab.us_coast_guard_life_jacket_wear_inform', 'US Coast Guard — Life Jacket Wear Information'), url: 'https://www.uscgboating.org/recreational-boaters/life-jacket-wear.php' },
            { label: __alloT('stem.swimlab.maine_department_of_inland_fisheries_w', 'Maine Department of Inland Fisheries & Wildlife — Boating Laws'), url: 'https://www.maine.gov/ifw/programs-resources/boating-snowmobile-atv-laws-rules.html', note: __alloT('stem.swimlab.authoritative_source_for_current_maine', 'Authoritative source for current Maine boating PFD law; check here before relying on summaries.') },
            { label: __alloT('stem.swimlab.maine_revised_statutes_title_12_inland', 'Maine Revised Statutes Title 12 (Inland Fisheries & Wildlife)'), url: 'https://legislature.maine.gov/statutes/12/title12sec13056-A.html', note: __alloT('stem.swimlab.13056_a_children_under_10_13056_pfds_a', '§13056-A (children under 10), §13056 (PFDs aboard), §13068-A (personal watercraft).') },
            { label: __alloT('stem.swimlab.uscg_33_cfr_part_175_equipment_require', 'USCG 33 CFR Part 175 — Equipment requirements'), url: 'https://www.ecfr.gov/current/title-33/chapter-I/subchapter-S/part-175' },
            { label: __alloT('stem.swimlab.safe_kids_worldwide_life_jacket_safety', 'Safe Kids Worldwide — Life Jacket Safety'), url: 'https://www.safekids.org/safetytips/field_risks/water-safety' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.pfd),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 5 — ICE SAFETY + SELF-RESCUE (Maine-relevant)
      // ─────────────────────────────────────────
      function renderIceSafety() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🧊 Falling Through Ice'),
          emergencyBanner(),
          h('div', { role: 'note', style: { padding: '10px 14px', background: T.cardAlt, border: '1px dashed ' + T.warn, borderRadius: 8, fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 12 } },
            h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.heads_up_2', 'Heads up: ')),
            __alloT('stem.swimlab.this_module_covers_ice_break_through_s', 'this module covers ice break-through scenarios including snowmobile incidents. Content is practical, not graphic, but the topic is serious.')),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.maine_has_more_frozen_surface_water_in', 'Maine has more frozen surface water in winter than almost any state in the lower 48. Every year, people fall through ice on lakes, ponds, and rivers — ice fishers, snowmobilers, kids playing, dogs and the people who chase them. The good news: cold water self-rescue is teachable, and the survival timeline is longer than people think.')),

          sectionHeader('🎨', 'Ice color and clarity tells you almost everything'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { color: 'Clear blue or black ice', strength: 'STRONGEST. Formed slowly from clear lake water. Trust this ice the most.', bg: '#1e3a8a' },
              { color: 'White or "snow" ice', strength: 'Half-strength. Formed from refrozen slush or compacted snow. Treat thickness rules as DOUBLE the requirement.', bg: '#cbd5e1', fg: '#0c2233' },
              { color: 'Gray ice', strength: 'WEAK. Indicates water is present in the ice. Stay off.', bg: '#475569' },
              { color: 'Dark spots or running water', strength: 'NO. Inlets, outlets, springs, and current keep ice thin even in cold weather.', bg: '#7f1d1d' }
            ].map(function(c, i) {
              return h('div', { key: i, style: { background: c.bg, border: '1px solid ' + T.border, borderRadius: 10, padding: 12, color: c.fg || T.text } },
                h('div', { style: { fontSize: 13, fontWeight: 700, marginBottom: 4 } }, c.color),
                h('div', { style: { fontSize: 12, lineHeight: 1.5, opacity: 0.95 } }, c.strength)
              );
            })
          ),

          sectionHeader('📏', 'Thickness rules (clear blue ice; double for white ice)'),
          keyPointBlock(
            'Per Maine Department of Inland Fisheries & Wildlife and Vermont Fish & Wildlife guidance for clear blue ice. Always test thickness yourself — drill or chisel test holes as you go.',
            [
              { k: 'Under 4 inches', v: 'STAY OFF. No exceptions.' },
              { k: '4 inches', v: 'Walking, ice fishing on foot.' },
              { k: '5-7 inches', v: 'Snowmobile or ATV.' },
              { k: '8-12 inches', v: 'Small car or pickup.' },
              { k: '12-15 inches', v: 'Medium truck.' },
              'White or "snow" ice: DOUBLE all of the above.',
              'Ice strength varies across a single body of water. Inlets, outlets, springs, current, and structures (bridges, docks) make ice thinner. Test as you go.'
            ]
          ),

          sectionHeader('🆘', 'If you fall through: the swim-and-roll'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.water, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 10px', color: T.text, lineHeight: 1.55, fontSize: 14, fontWeight: 600 } },
              __alloT('stem.swimlab.you_have_time_the_1_1_10_rule_applies_', 'You have time. The 1-1-10 rule applies (1 minute to control breathing, 10 minutes of useful arm strength, 1 hour before unconsciousness). Use that first minute deliberately.')),
            h('ol', { style: { margin: 0, paddingLeft: 20, color: T.text, lineHeight: 1.7, fontSize: 14 } },
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.do_not_panic_float_face_up', 'Do not panic. Float face-up. ')),
                __alloT('stem.swimlab.the_gasp_reflex_will_pass_in_60_second', 'The gasp reflex will pass in 60 seconds. Do not try to scramble out yet. Get your breathing under control.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.turn_back_the_way_you_came', 'Turn back the way you came. ')),
                __alloT('stem.swimlab.the_ice_you_walked_on_held_you_the_ice', 'The ice you walked on held you. The ice ahead just failed. Face the direction you came from.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.get_your_forearms_flat_on_the_ice', 'Get your forearms flat on the ice. ')),
                __alloT('stem.swimlab.spread_your_weight_if_you_have_ice_pic', 'Spread your weight. If you have ice picks (Picks of Life), use them now to get traction.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.kick_hard_horizontally', 'Kick HARD horizontally. ')),
                __alloT('stem.swimlab.get_your_body_horizontal_in_the_water_', 'Get your body horizontal in the water — like you are swimming. Kick hard with your legs while pulling yourself up onto the ice. Your goal is to slide out, not climb out.')),
              h('li', { style: { marginBottom: 8 } },
                h('strong', null, __alloT('stem.swimlab.roll_away_do_not_stand', 'Roll away. Do not stand. ')),
                __alloT('stem.swimlab.once_on_the_ice_roll_away_from_the_hol', 'Once on the ice, ROLL away from the hole, do not stand. Standing concentrates your weight at one point and you may break through again. Roll until you are on ice you know is solid.')),
              h('li', null,
                h('strong', null, __alloT('stem.swimlab.get_warm_immediately', 'Get warm immediately. ')),
                __alloT('stem.swimlab.cold_incapacitation_continues_out_of_t', 'Cold incapacitation continues out of the water. Get to shelter. Change into dry clothes. Warm core (chest, neck, groin) before extremities. See the Hypothermia module.'))
            )
          ),

          sectionHeader('🪛', 'Ice picks ("Picks of Life")'),
          keyPointBlock(
            'Two short wooden handles with a sharp metal pick on the end of each, connected by a cord that runs through your sleeves. They cost about $15. They are the difference between getting out of an ice break-through and not.',
            [
              'Wear them around your neck, threaded through your sleeves, EVERY TIME you go on ice',
              'Hands and arms lose strength fast in cold water. Without picks, your fingers cannot grip wet ice',
              'With picks, you stab the ice in front of you and pull yourself out',
              'Available at any Maine sporting-goods store; cheap; lightweight; no excuses',
              'Carry a whistle on the same lanyard for signaling rescuers'
            ]
          ),

          calloutBox('warn', 'Snowmobile through-ice — different problem',
            'A snowmobile that goes through ice sinks fast. The rider is best off being THROWN clear of the machine. If you go in with the snowmobile, the principles are the same as any ice break-through: don\'t panic, breathe, get horizontal, kick out. Snowmobile retrieval is a job for professional dive teams; do not try to recover the machine yourself. The Maine Warden Service has dive teams. Call 911.'),

          calloutBox('danger', 'Helping someone who fell through',
            'Same Reach/Throw/Row/Don\'t Go ladder. From shore: throw a rope or branch. From a boat or sled: drive close but do not put your weight near the hole. Lying flat distributes your weight if you must approach on the ice. Call 911 first. Untrained ice rescuers fall through too.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('iceSafety', 0, {
            prompt: 'You are walking across a Maine pond on a January day. You fall through. You are wearing winter clothes and a backpack. You are NOT wearing ice picks. What is your FIRST action?',
            choices: [
              'Try to climb out immediately before the cold hits.',
              'Float on your back, control your breathing for about 60 seconds while the gasp reflex passes.',
              'Take off your jacket and boots so you can swim.',
              'Yell as loud as you can.'
            ],
            correct: 1,
            explain: 'Float and breathe. The gasp reflex will make you inhale water if you try to scramble out in the first 60 seconds. Heavy clothes actually trap insulating air; do not remove them. After the gasp passes, turn back the way you came (the ice that held you is behind you), get horizontal, kick HARD, and try to slide out onto the ice. Roll away from the hole once on ice. Without picks, your hands cannot grip wet ice; your kicks have to do all the work.'
          }),
          scenarioCard('iceSafety', 1, {
            prompt: __alloT('stem.swimlab.you_see_a_person_fall_through_ice_on_a', 'You see a person fall through ice on a pond about 100 feet from shore. There is a long rope in your truck. You can ice skate. Two strangers are nearby. What is your best move?'),
            choices: [
              'Skate out to them quickly.',
              'Point at one stranger, say "CALL 911 NOW." Then go to your truck for the rope. Throw it from the edge of solid ice — do not approach the hole.',
              'Wait for help.',
              'Go onto the ice carefully and try to pull them out by hand.'
            ],
            correct: 1,
            explain: 'Point at one specific person and tell them to call 911 — bystander effect kills response time. Then fetch the rope. Throw from solid ice; the ice near the hole has just demonstrated it cannot hold weight. If you must approach, lie flat to distribute weight. Reach/Throw/Row/Don\'t Go applies on ice the same as in open water.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('iceSafety', [
            { q: 'You see clear blue ice on a Maine lake. The minimum thickness for safely walking on it is:', opts: ['2 inches', '4 inches', '8 inches', '12 inches'], ans: 1, explain: '4 inches of clear blue ice for walking, per Maine IFW. Double that for white "snow" ice. Always test thickness as you go — ice strength varies across a single lake.' },
            { q: 'You fall through ice. After 60 seconds of floating to control your breathing, your next action is:', opts: ['Climb straight up', 'Turn the direction you came from, get horizontal, and kick hard to slide onto the ice', 'Wait for someone to find you', 'Take off your boots'], ans: 1, explain: 'Turn back toward where you came from — that ice held you. Get horizontal in the water. Kick hard while your forearms are flat on the ice; goal is to slide out, not climb out. Then roll away from the hole. Standing concentrates your weight and you may break through again.' },
            { q: 'Ice picks ("Picks of Life") are:', opts: ['Decorative', 'A pair of sharp picks on cords worn around the neck for self-rescue from ice', 'Required by Maine law', 'Only for ice climbers'], ans: 1, explain: 'Two short picks connected by a cord run through your sleeves. They give you grip on wet ice when your hands have lost strength to cold. Cheap (~$15), light, no excuses. Wear them every time you are on ice.' },
            { q: 'A snowmobile goes through ice with rider aboard. Best chance of survival comes from:', opts: ['Holding tight to the snowmobile', 'Being thrown clear and applying ice self-rescue principles', 'Trying to float the snowmobile', 'Steering it back up'], ans: 1, explain: 'A snowmobile sinks fast. The rider\'s best chance is being clear of the machine and applying the same swim-and-roll self-rescue. Snowmobile recovery is a professional dive team job; call 911.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.maine_department_of_inland_fisheries_w_2', 'Maine Department of Inland Fisheries & Wildlife — Ice Safety'), url: 'https://www.maine.gov/ifw/programs-resources/boating-snowmobile-atv-laws-rules.html' },
            { label: __alloT('stem.swimlab.cold_water_safety_coldwatersafety_org', 'Cold Water Safety (coldwatersafety.org)'), url: 'https://www.coldwatersafety.org' },
            { label: __alloT('stem.swimlab.vermont_fish_wildlife_ice_safety_guide', 'Vermont Fish & Wildlife — Ice Safety Guidelines'), url: 'https://vtfishandwildlife.com' },
            { label: __alloT('stem.swimlab.cold_water_boot_camp_mario_vittone_2', 'Cold Water Boot Camp (Mario Vittone)'), url: 'https://coldwaterbootcamp.com' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.iceSafety),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 6 — HYPOTHERMIA RECOGNITION
      // ─────────────────────────────────────────
      function renderHypothermia() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🌡️ Cold Body, Cold Brain'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.hypothermia_is_core_body_temperature_d', 'Hypothermia is core body temperature dropping below 95°F (35°C). It does not require ice or even cold weather — it can happen in 60°F water in summer or 50°F air in spring rain. Recognizing it early and treating it correctly is the difference between a story and a tragedy.')),

          sectionHeader('🧠', 'The UMBLES rule (early warning signs)'),
          keyPointBlock(
            'Watch for someone (or yourself) starting to:',
            [
              { k: 'Stumbles', v: 'Loss of coordination, clumsy movement, dropping things.' },
              { k: 'Mumbles', v: 'Slurred speech, hard to understand.' },
              { k: 'Fumbles', v: 'Cannot work zippers, buttons, fine motor tasks.' },
              { k: 'Grumbles', v: 'Withdrawal, irritability, "I just want to lie down for a minute."' },
              'When you see any UMBLES, treat as hypothermia and act. Early treatment is dramatically more effective than late treatment.'
            ]
          ),

          sectionHeader('📊', 'The three stages'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { stage: 'MILD', temp: '90-95°F (32-35°C)', signs: 'Shivering, cold extremities, still oriented but starting to be clumsy. UMBLES showing up.', care: 'Get out of cold/wet. Dry clothes. Warm fluids if conscious. Light physical activity.', color: T.warn },
              { stage: 'MODERATE', temp: '82-90°F (28-32°C)', signs: 'Violent shivering OR shivering may stop. Confused thinking. Slurred speech. Clumsy.', care: 'Medical emergency. Call 911. Active rewarming with warm packs to chest/neck/groin (NOT extremities). Do NOT rub. Do NOT give alcohol.', color: T.danger },
              { stage: 'SEVERE', temp: 'Below 82°F (28°C)', signs: 'Shivering stops entirely. Unconscious or barely responsive. Slow weak pulse. Skin blue/gray.', care: 'Life-threatening. 911. Handle GENTLY — rough handling can trigger cardiac arrest. CPR if no pulse. "Not dead until WARM and dead" — continue resuscitation through transport.', color: '#7f1d1d' }
            ].map(function(s, i) {
              return h('div', { key: i, style: { background: T.card, border: '2px solid ' + s.color, borderRadius: 12, padding: 12 } },
                h('div', { style: { fontSize: 14, fontWeight: 800, color: s.color, marginBottom: 4 } }, s.stage),
                h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 8 } }, s.temp),
                h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.5, marginBottom: 8 } }, h('strong', null, 'Signs: '), s.signs),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } }, h('strong', { style: { color: T.text } }, 'Care: '), s.care)
              );
            })
          ),

          sectionHeader('❌', "What NOT to do"),
          calloutBox('danger', 'Common mistakes that make hypothermia worse',
            h('ul', { style: { margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 } },
              h('li', null, h('strong', null, 'Do NOT rub extremities. '), __alloT('stem.swimlab.rubbing_pushes_cold_blood_from_the_arm', 'Rubbing pushes cold blood from the arms and legs back to the warming core. This "afterdrop" can cause cardiac arrest.')),
              h('li', null, h('strong', null, 'Do NOT give alcohol. '), __alloT('stem.swimlab.alcohol_dilates_skin_blood_vessels_and', 'Alcohol dilates skin blood vessels and accelerates heat loss. Folk wisdom is wrong here.')),
              h('li', null, h('strong', null, 'Do NOT put a severe-hypothermia patient in a hot bath. '), __alloT('stem.swimlab.sudden_warming_of_cold_extremities_ret', 'Sudden warming of cold extremities returns cold blood to the core too fast. Slow rewarming with warm packs to chest, neck, and groin is correct.')),
              h('li', null, h('strong', null, 'Do NOT rough-handle severely hypothermic patients. '), __alloT('stem.swimlab.a_cold_heart_is_electrically_unstable_', 'A cold heart is electrically unstable. Bumping, jostling, or rough handling can trigger ventricular fibrillation. Move them gently.')),
              h('li', null, h('strong', null, 'Do NOT assume they are dead because they are cold and unresponsive. '), __alloT('stem.swimlab.the_maxim_is_not_dead_until_warm_and_d', 'The maxim is "not dead until warm and dead." Continue CPR through transport. There are documented full recoveries from core temperatures below 60°F.'))
            )
          ),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('hypothermia', 0, {
            prompt: 'You are hiking in Maine in October. Your friend who has been quiet for the last mile suddenly says "I\'m fine, just need to sit down for a minute" and starts fumbling with their jacket zipper. They are mumbling and seem irritable. What is going on and what do you do?',
            choices: [
              'They are just tired. Let them rest.',
              'UMBLES. They are entering hypothermia. Get them out of wind/wet, into dry layers, warm fluids if they can hold a cup, and head for shelter or call for help.',
              'Have them keep hiking to warm up.',
              'Wait until they actually shiver.'
            ],
            correct: 1,
            explain: 'Stumbles + mumbles + fumbles + grumbles is mild hypothermia, not tiredness. Acting now (dry, sheltered, warm fluids, gentle movement) reverses it easily. Letting them "rest" — especially lying down — accelerates the drop. Hypothermia in the 50-65°F temperature range is the most common kind in temperate climates because nobody expects it.'
          }),
          scenarioCard('hypothermia', 1, {
            prompt: __alloT('stem.swimlab.a_person_is_pulled_from_cold_water_unc', 'A person is pulled from cold water unconscious, not breathing, no pulse. Their core temperature is estimated below 82°F. What is the right approach?'),
            choices: [
              'Pronounce death at scene.',
              'Begin CPR. Handle gently. Continue CPR through transport. Cold patients can recover from longer arrests because cold protects the brain.',
              'Wrap warmly and wait.',
              'Put them in a hot bath.'
            ],
            correct: 1,
            explain: 'The maxim is "not dead until WARM and dead." Severely hypothermic patients have been resuscitated after long arrests because cold dramatically slows brain damage. Begin CPR. Handle GENTLY (rough handling can cause cardiac arrest in a cold heart). Do NOT rapidly rewarm. Continue resuscitation through transport. This is one of the most under-appreciated facts in emergency medicine.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('hypothermia', [
            { q: 'The UMBLES rule is for recognizing:', opts: ['Stroke', 'Early hypothermia', 'Heart attack', 'Allergic reaction'], ans: 1, explain: 'Stumbles, Mumbles, Fumbles, Grumbles = early signs of hypothermia. Coordination loss, slurred speech, fine-motor failure, withdrawal/irritability. Catch it here and treatment is easy.' },
            { q: 'Why should you NOT rub the arms and legs of a hypothermic person?', opts: ['It is uncomfortable', 'It pushes cold blood back to the core ("afterdrop") and can cause cardiac arrest', 'It is illegal', 'It does not help'], ans: 1, explain: 'Cold extremities have very cold blood pooled in them. Rubbing or sudden warming returns that cold blood to the warming core, which can cause "afterdrop" — a sudden secondary core temperature drop and potential cardiac arrest. Warm the core first; let the extremities catch up slowly.' },
            { q: 'A severely hypothermic person is unresponsive with no detectable pulse. What does the medical maxim say?', opts: ['Pronounce dead immediately', 'Wait 30 minutes then declare death', '"Not dead until WARM and dead" — continue CPR through transport and rewarming', 'Hypothermia patients cannot be revived'], ans: 2, explain: 'Cold dramatically protects the brain. There are documented full recoveries after hour-plus arrests at very low core temperatures. Continue CPR. Handle gently. Do not pronounce death until the patient is rewarmed and still does not respond.' },
            { q: 'You suspect someone has mild hypothermia. They are still conscious and can swallow. What can they have?', opts: ['Strong coffee with brandy', 'A warm sweet drink (hot chocolate, sweetened tea)', 'Ice water', 'Nothing by mouth'], ans: 1, explain: 'Warm sweet drinks (hot chocolate, sweetened tea, soup) provide both heat and quick energy. NEVER alcohol — it dilates blood vessels and accelerates heat loss. Caffeine is also debatable for borderline cases. If the person is severely hypothermic or unconscious, give nothing by mouth.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.wilderness_medical_society_practice_gu', 'Wilderness Medical Society — Practice Guidelines for Hypothermia'), url: 'https://wms.org' },
            { label: __alloT('stem.swimlab.nols_wilderness_medicine_hypothermia', 'NOLS Wilderness Medicine — Hypothermia'), url: 'https://www.nols.edu/en/wilderness-medicine/' },
            { label: __alloT('stem.swimlab.aha_cold_emergencies', 'AHA — Cold Emergencies'), url: 'https://cpr.heart.org' },
            { label: __alloT('stem.swimlab.cold_water_boot_camp', 'Cold Water Boot Camp'), url: 'https://coldwaterbootcamp.com' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.hypothermia),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 7 — POOL DRAIN ENTRAPMENT
      // ─────────────────────────────────────────
      function renderDrainEntrapment() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('🌀 Pool Drain Risks'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.pool_drain_entrapment_is_rare_but_cata', 'Pool drain entrapment is rare but catastrophic. A pool pump can generate suction strong enough to hold an adult underwater. Federal law has specific requirements for drain covers since 2008, but old pools, broken covers, and home pools may not be compliant. This module teaches what to look for and what to do.')),

          sectionHeader('📜', 'The Virginia Graeme Baker Pool & Spa Safety Act (2008)'),
          keyPointBlock(
            'Named for Virginia Graeme Baker, a 7-year-old who drowned in 2002 when she was held to a hot tub drain by suction. Her grandfather, James Baker III, championed the legislation that bears her name. The law requires:',
            [
              'Anti-entrapment drain covers on all public pools and spas in the US',
              'VGB-compliant covers must be domed (not flat) and break suction if blocked',
              'Single main drains must have a secondary safety vacuum release system (SVRS) or be split into multiple drains',
              'Pool operators must maintain compliance — covers crack and need replacement'
            ]
          ),

          sectionHeader('⚠️', 'Five types of entrapment'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 } },
            [
              { type: 'Hair entrapment', desc: __alloT('stem.swimlab.long_hair_drawn_into_the_drain_by_suct', 'Long hair drawn into the drain by suction and tangled. Common in girls and women.') },
              { type: 'Limb entrapment', desc: __alloT('stem.swimlab.arm_leg_or_finger_pulled_into_the_drai', 'Arm, leg, or finger pulled into the drain opening. Suction can break bones during extraction.') },
              { type: 'Body entrapment', desc: __alloT('stem.swimlab.torso_held_against_the_drain_by_suctio', 'Torso held against the drain by suction. The most lethal type — adult-strength forces.') },
              { type: 'Evisceration', desc: __alloT('stem.swimlab.suction_pulls_intestines_through_the_a', 'Suction pulls intestines through the anus. Catastrophic injury. Specific to flat drain covers and small bodies.') },
              { type: 'Mechanical', desc: __alloT('stem.swimlab.jewelry_swimsuit_strings_etc_caught_in', 'Jewelry, swimsuit strings, etc. caught in drain hardware.') }
            ].map(function(t, i) {
              return h('div', { key: i, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 12 } },
                h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, t.type),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } }, t.desc)
              );
            })
          ),

          sectionHeader('👀', 'What to look for in a pool or spa'),
          keyPointBlock(
            'Before you or a child enters any pool, hot tub, or spa:',
            [
              { k: 'Drain cover present and intact', v: 'No missing cover. No cracks. No flat covers in old hot tubs (those should have been replaced).' },
              { k: 'Cover shape', v: 'Domed or anti-vortex shape, not flat. Flat covers are the entrapment risk.' },
              { k: 'Emergency shut-off', v: 'Public pools are required to have a clearly marked emergency shut-off switch for pump suction. Know where it is.' },
              { k: 'Tie up long hair', v: 'Swim caps or hair ties dramatically reduce hair entrapment risk.' },
              { k: 'Avoid sitting on drains', v: 'Teach kids not to sit on or play with pool drains, even covered ones.' }
            ]
          ),

          calloutBox('warn', 'If someone is trapped on a drain',
            'Hit the emergency pump shut-off immediately if available — this releases suction. If no shut-off is reachable, several adults working together may be needed to break the seal by inserting an object between the body and the drain to introduce air. Call 911 immediately. Do not try to forcibly pull a person off a drain — suction force is enormous and can cause severe injury during extraction.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('drainEntrap', 0, {
            prompt: 'You are at a backyard pool. The hot tub drain cover is cracked and partially missing. The owner says "it\'s fine, no one ever sits on it." What do you do?',
            choices: [
              'Trust the owner.',
              'Decline to use the hot tub. Encourage owner to replace the cover before next use. The risk is small but the consequence is fatal, especially for kids.',
              'Cover it with a towel.',
              'Just stay on the other side.'
            ],
            correct: 1,
            explain: 'Broken or missing drain covers are the single biggest entrapment risk. Pool/spa pumps generate enormous suction. A child, an adult sitting wrong, long hair drifting near the drain — any of these can lead to entrapment. VGB-compliant replacement covers are inexpensive and required by law for public pools (and recommended for private). Skip the spa until it is fixed.'
          }),
          scenarioCard('drainEntrap', 1, {
            prompt: 'A child is pinned to a pool drain by suction, underwater. You are the adult on scene. What is the FIRST thing you do?',
            choices: [
              'Pull the child off the drain.',
              'Find and hit the emergency pump shut-off switch — this releases the suction.',
              'Dive in and cover the drain with your hands.',
              'Call the lifeguard.'
            ],
            correct: 1,
            explain: 'The shut-off releases the suction that is holding them. Public pools are required to have a clearly marked emergency shut-off; locate it during your first 60 seconds at any pool. Yell for someone to call 911 simultaneously. Pulling a child off an active drain by force can cause serious injury (broken bones, evisceration) — break the suction first.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('drainEntrap', [
            { q: 'The Virginia Graeme Baker Pool & Spa Safety Act (2008) requires:', opts: ['Lifeguards at all public pools', 'Anti-entrapment drain covers and either secondary release systems or multiple drains', 'Mandatory swim lessons', 'Insurance for pool owners'], ans: 1, explain: 'VGB Act requires anti-entrapment (domed) drain covers on public pools and spas, plus a Safety Vacuum Release System (SVRS) or multiple drains for single-main-drain pools. The goal is to make hard suction-to-body seals impossible.' },
            { q: 'A child is held to a pool drain by suction. The single most important first action is:', opts: ['Pull them off', 'Hit the emergency pump shut-off switch', 'Wait for the lifeguard', 'Call 911 first before doing anything'], ans: 1, explain: 'Releasing the suction (via the pump shut-off) is the action that resolves the entrapment. Yell for someone else to call 911 simultaneously. Forcibly pulling against active suction can cause serious injury.' },
            { q: 'Long hair in a pool can:', opts: ['Be pulled into a drain and tangled, causing hair entrapment', 'Cause itching only', 'Damage the pool filter', 'No risk'], ans: 0, explain: 'Hair entrapment is one of five recognized entrapment types. Tying up long hair or wearing a swim cap dramatically reduces risk, especially around floor drains.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.pool_safely_cpsc', 'Pool Safely (CPSC)'), url: 'https://www.poolsafely.gov' },
            { label: __alloT('stem.swimlab.cpsc_virginia_graeme_baker_pool_and_sp', 'CPSC — Virginia Graeme Baker Pool and Spa Safety Act'), url: 'https://www.cpsc.gov/Regulations-Laws--Standards/Statutes/The-Virginia-Graeme-Baker-Pool-and-Spa-Safety-Act' },
            { label: __alloT('stem.swimlab.cdc_drowning_prevention_3', 'CDC — Drowning Prevention'), url: 'https://www.cdc.gov/drowning' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.drainEntrap),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MODULE 8 — AUTISM + WATER SAFETY (highest-stakes module)
      // ─────────────────────────────────────────
      function renderAutismWater() {
        return h('div', { style: { padding: 20, maxWidth: 860, margin: '0 auto', color: T.text } },
          backBar('♾️ Autism + Water'),
          emergencyBanner(),
          h('div', { role: 'note', style: { padding: '10px 14px', background: T.cardAlt, border: '1px dashed ' + T.warn, borderRadius: 8, fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 12 } },
            h('strong', { style: { color: T.text } }, __alloT('stem.swimlab.heads_up_3', 'Heads up: ')),
            __alloT('stem.swimlab.this_module_discusses_elevated_drownin', 'this module discusses elevated drowning risk in autistic children and prevention strategies. Content is matter-of-fact and oriented toward action; no blame language toward families.')),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.this_module_is_shorter_than_the_others', 'This module is shorter than the others but covers the highest-stakes content. Autistic children drown at dramatically higher rates than the general pediatric population. Most schools and many parents have never heard the numbers. The intervention is layered prevention, not blame.')),

          calloutBox('danger', 'The number that should change your practice',
            'Autistic children are approximately 160 times more likely to die from drowning than children in the general pediatric population (NAA / Autism Speaks Lifespan Mortality Data; AAP referenced). Drowning is the leading cause of death in autistic children who elope (wander). For autistic students with elopement risk, water safety is not optional curriculum — it is life safety.'),

          sectionHeader('❓', 'Why the risk is so much higher'),
          keyPointBlock(
            'Multiple factors compound. None of them are anyone\'s fault.',
            [
              { k: 'Water attraction', v: 'Many autistic children are powerfully drawn to water for sensory reasons (visual, auditory, vestibular). This is well-documented and not something to "fix" — it is part of how their nervous system works.' },
              { k: 'Elopement', v: 'Roughly half of autistic children wander/elope at some point. Water sources (ponds, pools, rivers, fountains) are common destinations.' },
              { k: 'Communication delays', v: 'May not call for help, may not respond to verbal warnings, may not recognize "danger" labels.' },
              { k: 'Risk perception differences', v: 'May not perceive depth, current, cold, or distance the way neurotypical risk-assessment expects.' },
              { k: 'Comorbid seizure disorders', v: 'Some autistic children also have epilepsy. A seizure in water is rapidly fatal.' },
              { k: 'Sensory regulation', v: 'Cold water shock, drain noise, deep-end pressure changes can be overwhelming and trigger panic or shutdown.' }
            ]
          ),

          sectionHeader('🛡️', 'Defense in depth (layered prevention)'),
          h('div', { style: { background: T.card, border: '1px solid ' + T.water, borderRadius: 12, padding: 16, marginBottom: 14 } },
            h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              __alloT('stem.swimlab.no_single_layer_is_sufficient_stack_mu', 'No single layer is sufficient. Stack multiple layers. If one fails, the others catch.')),
            h('ol', { style: { margin: 0, paddingLeft: 20, color: T.text, lineHeight: 1.7, fontSize: 13 } },
              h('li', null, h('strong', null, __alloT('stem.swimlab.physical_barriers', 'Physical barriers. ')), __alloT('stem.swimlab.pool_fences_with_self_closing_self_lat', 'Pool fences with self-closing, self-latching gates (height per local code, typically 4 ft minimum). Door alarms on every door leading outside. Pool covers when not in use. For at-risk students, additional gate locks at heights beyond the child\'s reach.')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.electronic_alarms', 'Electronic alarms. ')), __alloT('stem.swimlab.door_alarms_cheap_10_20_pool_surface_a', 'Door alarms (cheap, $10-20). Pool surface alarms (motion sensors floating on the pool surface). GPS tracking devices for high-elopement-risk students (Project Lifesaver, AngelSense, similar).')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.adapted_swim_instruction', 'Adapted swim instruction. ')), __alloT('stem.swimlab.survival_swim_training_adapted_for_sen', 'Survival swim training adapted for sensory needs. The goal is not "competitive swimmer" — the goal is "can roll onto back, breathe, and stay afloat for several minutes." Programs like Infant Swimming Resource (ISR) and many YMCAs offer adaptive sessions.')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.bright_colored_swimsuits', 'Bright-colored swimsuits. ')), __alloT('stem.swimlab.use_neon_yellow_orange_or_pink_never_b', 'Use NEON YELLOW, ORANGE, or PINK. NEVER blue, green, white, or gray — those colors are nearly invisible against pool bottoms or lake water. This single change can mean the difference between a lifeguard spotting a submerged child in 5 seconds vs 50.')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.id_jewelry_clothing', 'ID jewelry / clothing. ')), __alloT('stem.swimlab.wearable_id_with_name_diagnosis_family', 'Wearable ID with name, diagnosis, family contact. Important if the child elopes and is found by strangers who may misinterpret behavior as defiance, intoxication, or hostility.')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.constant_supervision_near_water', 'Constant supervision near water. ')), __alloT('stem.swimlab.touch_supervision_within_arm_s_reach_f', 'Touch supervision (within arm\'s reach) for any child who cannot self-rescue. No phones, no looking away, no relying on other children to "watch."')),
              h('li', null, h('strong', null, __alloT('stem.swimlab.family_neighbor_school_awareness', 'Family + neighbor + school awareness. ')), __alloT('stem.swimlab.tell_neighbors_so_they_know_to_call_yo', 'Tell neighbors so they know to call you immediately if they see the child. Tell school staff. Tell first responders. The more people who know, the faster the response if the child elopes.'))
            )
          ),

          calloutBox('info', 'Identity-first language',
            'The autistic community broadly prefers "autistic person" or "autistic child" over "person/child with autism." Research from Bury et al. 2020, Kenny et al. 2016, and Taboas et al. 2023 documents this preference among autistic adults and the broader community. Identity-first language treats autism as an inherent part of the person, not something to be separated from them. Honor individual preference when known.'),

          sectionHeader('🏊', 'Adapted swim instruction — what to look for'),
          keyPointBlock(
            'A good adaptive swim program for autistic students:',
            [
              'Instructor is trained in autism-specific accommodations (sensory regulation, communication adaptation, gradual exposure)',
              'Allows non-traditional pacing (some students need 20 sessions to do what neurotypical kids do in 4)',
              'Permits accommodations like tinted goggles for light sensitivity, ear plugs for sound, slower verbal pacing',
              'Focuses first on water comfort and survival skills (back float, calm breathing, edge crawl), not stroke mechanics',
              'Communicates with family about the child\'s sensory profile and triggers',
              'Has a 1:1 or low ratio (NOT a group class with 12 kids)',
              'Local Maine options: YMCA (Casco Bay, Greater Portland, Bath, others), Special Olympics Maine, private adaptive instructors. Cost can be a barrier — USA Swimming Foundation scholarships and some YMCAs offer subsidies.'
            ]
          ),

          calloutBox('ok', 'For families and educators: this is preventable',
            'The 160x statistic is alarming, but it is also actionable. Families who layer prevention (fence + alarm + adapted swim + bright suit + supervision + community awareness) reduce the risk dramatically. Schools that include water safety in IEP planning for at-risk autistic students do real life-safety work. This is not abstract curriculum — it is the kind of work where individual decisions save individual lives.'),

          sectionHeader('🎭', 'Scenarios'),
          scenarioCard('autismWater', 0, {
            prompt: 'You are a school psychologist meeting with a family of a 6-year-old autistic student with documented elopement history. They live near a small pond. The IEP team is reviewing safety planning. What recommendations do you bring to the table?',
            choices: [
              'Standard safety checklist; no special accommodations needed.',
              'Defense in depth: door alarms, GPS device (Project Lifesaver), neighbor notification, fence around the pond if feasible, adapted swim instruction starting now, bright-colored clothing, ID jewelry, and an emergency response plan if the child is missing (water sources searched FIRST).',
              'The student should be kept indoors.',
              'Wait until the next IEP cycle.'
            ],
            correct: 1,
            explain: 'Defense in depth. No single layer is enough; stack them. The "search water sources first" instruction is from NAA — when an autistic child elopes, water is statistically the most dangerous destination, so first responders search nearby water immediately, even if the child has shown no prior interest in that body of water. Time is everything.'
          }),
          scenarioCard('autismWater', 1, {
            prompt: __alloT('stem.swimlab.a_family_is_buying_their_autistic_chil', 'A family is buying their autistic child their first swimsuit for summer. The child loves blue and wants a blue one. The store has yellow, orange, pink, white, and blue available. What do you suggest?'),
            choices: [
              'Get the blue one since the child wants it.',
              'Suggest yellow, neon orange, or hot pink. Blue and white are nearly invisible against pool bottoms and lake water. Visibility from a safety standpoint matters more than preference here, and there are ways to honor preference partially (blue rash guard under a high-vis suit, blue swim shorts with a neon top, etc.).',
              'Get white because it is cooler.',
              'It does not matter.'
            ],
            correct: 1,
            explain: 'Swim suit color visibility is one of the easiest and cheapest safety interventions. Tests by Alive Solutions document that blue, white, and gray suits become nearly invisible underwater within seconds. Neon yellow, orange, and pink stay visible. For a child at higher drowning risk, this is not a minor cosmetic choice. Where possible, find a creative compromise that honors the child\'s preference (blue accents, beloved character on a high-vis background, etc.) while keeping the primary visible color in the safe range.'
          }),

          sectionHeader('🧠', 'Mini-quiz'),
          miniQuizBlock('autismWater', [
            { q: 'Approximately how much higher is the drowning risk for autistic children compared to the general pediatric population?', opts: ['About 2x', 'About 20x', 'About 160x', 'No difference'], ans: 2, explain: '~160x per NAA / AAP referenced data. Drowning is the leading cause of death in autistic children who elope. The intervention is layered prevention.' },
            { q: 'Which swimsuit color is BEST for visibility from a safety standpoint?', opts: ['Light blue', 'White', 'Neon yellow or hot pink', 'Pale gray'], ans: 2, explain: 'Neon colors stay visible underwater. Blue, white, and gray become nearly invisible against pool bottoms and lake water. Visibility helps lifeguards and supervising adults spot a submerged child in seconds, which is the entire window for a successful save.' },
            { q: 'When an autistic child with elopement history goes missing, first responders should search:', opts: ['Roads first', 'Water sources first, even if the child has shown no prior interest in water', 'The child\'s bedroom', 'Schools'], ans: 1, explain: 'Per NAA guidance, water is the statistically most dangerous destination for autistic elopement and the most time-sensitive search target. First responders should search nearby water sources immediately, regardless of whether the child has historically been drawn to water.' },
            { q: 'For an autistic student at high drowning risk, the IEP team should:', opts: ['Avoid discussing it to not stigmatize', 'Develop a layered safety plan including adapted swim instruction, GPS tracking if appropriate, family + neighbor + first-responder notification, and emergency response protocols', 'Recommend the family keep the child indoors', 'Defer to the family entirely'], ans: 1, explain: 'Defense in depth, with the school as one of multiple layers. This is exactly the kind of life-safety planning that belongs in IEP discussions for at-risk students. The conversation honors family expertise while bringing professional resources to the table.' }
          ]),

          sourcesBlock([
            { label: __alloT('stem.swimlab.national_autism_association_autism_saf', 'National Autism Association — Autism Safety Toolkit'), url: 'https://nationalautismassociation.org/resources/autism-safety-facts/' },
            { label: __alloT('stem.swimlab.aap_prevention_of_drowning_policy_stat', 'AAP — Prevention of Drowning Policy Statement'), url: 'https://publications.aap.org/pediatrics/article/143/5/e20190850/76998' },
            { label: __alloT('stem.swimlab.autistic_self_advocacy_network_asan', 'Autistic Self-Advocacy Network (ASAN)'), url: 'https://autisticadvocacy.org' },
            { label: __alloT('stem.swimlab.project_lifesaver_international_gps_tr', 'Project Lifesaver International (GPS tracking for elopement risk)'), url: 'https://projectlifesaver.org' },
            { label: __alloT('stem.swimlab.infant_swimming_resource_isr_self_resc', 'Infant Swimming Resource (ISR) — Self-Rescue'), url: 'https://infantswim.com' },
            { label: __alloT('stem.swimlab.special_olympics_aquatics', 'Special Olympics — Aquatics'), url: 'https://www.specialolympics.org/our-work/sports/aquatics' },
            { label: __alloT('stem.swimlab.alive_solutions_swimsuit_color_visibil', 'Alive Solutions — Swimsuit Color Visibility Tests'), url: 'https://alivesolutions.com' },
            { label: __alloT('stem.swimlab.usa_swimming_foundation_make_a_splash_', 'USA Swimming Foundation — Make a Splash (scholarships)'), url: 'https://www.usaswimming.org/foundation/make-a-splash' }
          ]),
          h(TeacherNotes, TEACHER_NOTES.autismWater),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // CUMULATIVE QUIZ — 15 questions across all 9 modules
      // ─────────────────────────────────────────
      // Each question carries a `module` field naming the SwimLab module it
      // tests, so the result page can hand a student a specific "go review
      // this" jump-link instead of generic "review recommended" feedback.
      // For water safety specifically, knowing your exact knowledge gap
      // matters: a missed PFD question and a missed ice-safety question
      // need different remediation, not the same "go back to the menu."
      var CUMULATIVE_QUESTIONS = [
        { module: 'howSwimming', q: 'In cold water with no life jacket, your single most valuable survival skill is:', opts: ['Swimming hard for shore', 'Calmly floating on your back with head tilted back and lungs full of air', 'Removing heavy clothing so you can swim better', 'Treading water until rescue'], ans: 1, explain: 'Back float costs no energy and uses your lungs as built-in flotation (Archimedes\' principle). Head tilted back lifts the face clear of the water without muscular effort. Swimming and treading burn heat fast in cold water. Heavy clothing actually traps insulating air — keep it on. Float, breathe through the gasp reflex, then plan.' },
        { module: 'howSwimming', q: 'You are in 50°F water wearing a life jacket, alone, rescue ~30 minutes away. The position that most extends your survival time is:', opts: ['Swimming slowly to keep blood circulating', 'Treading water with a flutter kick', 'HELP position: knees pulled to chest, arms crossed, body curled', 'Floating with arms and legs spread out for visibility'], ans: 2, explain: 'HELP (Heat Escape Lessening Posture) reduces body-heat loss by roughly 50% by closing off the major blood-flow zones (groin, sides of chest, armpits). Movement burns heat faster than it generates in cold water. With a PFD and HELP, survival time in 50°F water can extend from ~1 hour to ~2-3 hours — often long enough for rescue to arrive.' },
        { module: 'iceSafety',   q: 'You fall through ice into a Maine pond in February. Your FIRST action is to:', opts: ['Climb out immediately', 'Float face-up for ~60 seconds while the gasp reflex passes', 'Take off your jacket', 'Yell as loud as you can'], ans: 1, explain: 'Cold water shock makes you involuntarily gasp for ~60 seconds. Floating face-up keeps your airway out of the water until the reflex passes. THEN turn back the way you came, get horizontal, kick HARD to slide onto the ice, and roll away.' },
        { module: 'coldShock',   q: 'In the 1-1-10 rule, the "10" stands for:', opts: ['10 seconds before drowning', '10 minutes of meaningful arm strength after the gasp passes', '10°F core temperature drop', '10 strokes to safety'], ans: 1, explain: 'Roughly 10 minutes of useful arm/hand function before cold incapacitation. The "1 hour" follows for unconsciousness. People have hours of survival time in cold water — knowing this fights panic.' },
        { module: 'ripCurrents', q: 'A rip current looks like:', opts: ['A taller wave', 'A calm channel cutting through breaking waves with foam moving away from shore', 'Discolored shallow water', 'Whitecaps'], ans: 1, explain: 'The deceptive feature is the apparent calm. Calm water in a surf zone is suspicious. Foam, debris, or sand moving steadily seaward is the giveaway.' },
        { module: 'ripCurrents', q: 'You are caught in a rip current. Swim:', opts: ['Hard for shore', 'Parallel to shore until out of the channel', 'Out to sea to escape', 'Diagonally at 45°'], ans: 1, explain: 'Rip currents are narrow (10-30 ft). Parallel-to-shore swimming for 30-100 ft gets you out, then angle back. Fighting the current head-on exhausts you.' },
        { module: 'reachThrow',  q: 'Bystander rescue ladder is:', opts: ['Reach, Throw, Row, Don\'t Go (only enter water if trained)', 'Jump in, Help, Swim back', 'Call 911 then enter water', 'Wait for professionals'], ans: 0, explain: 'Reach with a pole/branch first. Throw flotation if too far. Row a boat if too far to throw. Do NOT enter the water unless trained — leading cause of would-be rescuer death.' },
        { module: 'reachThrow',  q: 'A real drowning person looks like:', opts: ['A person yelling and waving for help', 'A silent, vertical figure with mouth at water level and arms pressing down on the surface', 'A swimmer thrashing dramatically', 'A person calling out a lifeguard\'s name'], ans: 1, explain: 'The Instinctive Drowning Response (Mario Vittone) is silent and vertical. Speech is secondary to breathing — they cannot call out. Arms press down on the surface trying to lift the head — they cannot wave. The window from "in trouble" to submersion is 20-60 seconds. Recognition is the prerequisite for everything else in this lab.' },
        { module: 'pfd',         q: 'Approximately what fraction of boating drowning victims were NOT wearing a life jacket?', opts: ['10%', '50%', '86%', 'All wore one'], ans: 2, explain: '~86% per USCG. The single intervention most likely to have saved them was the PFD usually present on the boat but not worn.' },
        { module: 'pfd',         q: 'A child\'s life jacket fits properly when:', opts: ['It rides up to the ears in a lift test', 'It fits snug, lift test does not let it ride above the chin/ears', 'It is loose for comfort', 'They can grow into it'], ans: 1, explain: 'Lift at the shoulders. Should NOT ride up over the chin or ears. If it does, it will go over their head in water. Right size for current weight, replace as the child grows.' },
        { module: 'iceSafety',   q: 'Minimum thickness of clear blue ice for safely walking on:', opts: ['2 inches', '4 inches', '8 inches', '12 inches'], ans: 1, explain: '4 inches clear blue ice for walking, per Maine IFW. Double for white "snow" ice. Always test as you go.' },
        { module: 'hypothermia', q: 'The UMBLES rule (stumbles, mumbles, fumbles, grumbles) signals:', opts: ['Heart attack', 'Early hypothermia', 'Stroke', 'Anaphylaxis'], ans: 1, explain: 'Loss of coordination, slurred speech, fine-motor failure, withdrawal/irritability. Catch hypothermia here and treatment is dry-warm-fluids-shelter. Wait, and it gets harder fast.' },
        { module: 'hypothermia', q: 'A severely hypothermic patient is unresponsive with no detectable pulse. The medical maxim is:', opts: ['Pronounce dead immediately', '"Not dead until WARM and dead" — continue CPR through transport and rewarming', 'Try once then stop', 'Wait 30 minutes'], ans: 1, explain: 'Cold dramatically protects the brain. Documented full recoveries from hour-plus arrests at very low core temperatures. Continue CPR through transport. Handle gently — cold hearts are electrically unstable.' },
        { module: 'drainEntrap', q: 'A child is held to a pool drain by suction. The single most important first action is:', opts: ['Pull them off', 'Hit the emergency pump shut-off switch (releases the suction)', 'Wait for help', 'Call 911 first'], ans: 1, explain: 'Releasing the suction is what resolves the entrapment. Yell for someone else to call 911 simultaneously. Pulling against active suction can cause serious injury.' },
        { module: 'autismWater', q: 'For an autistic child at high drowning risk, the right intervention is:', opts: ['No special accommodations needed', 'Layered prevention: fences, alarms, adapted swim instruction, bright-colored swimwear, GPS if appropriate, community awareness, and water-search-first protocols if elopement happens', 'Keep them indoors', 'Wait until they are older'], ans: 1, explain: 'Defense in depth. No single layer is enough. The 160x risk comes from multiple compounding factors (water attraction, elopement, communication, risk perception); the response stacks multiple protective factors. Belongs in IEP planning for at-risk students.' }
      ];

      // Module id → display label, used in the targeted-feedback "Go to..."
      // jump-links on the result page. Kept inline (not in MENU_TILES) so a
      // future menu refactor doesn't quietly break the labels.
      var MODULE_LABELS = {
        howSwimming: 'How Swimming Works',
        coldShock:   'Cold Water Survival',
        ripCurrents: 'Rip Currents',
        iceSafety:   'Falling Through Ice',
        hypothermia: 'Cold Body, Cold Brain',
        pfd:         'Why Life Jackets Work',
        reachThrow:  'Help Without Drowning Yourself',
        drainEntrap: 'Pool Drain Risks',
        autismWater: 'Autism + Water'
      };

      function renderCumulative() {
        var st = bigQuizState;
        // bigQuizState now also carries `picks: { qIdx: chosenOptionIdx }` so
        // the result page can show each missed question with the user's
        // wrong choice + the right one + a jump-link to the relevant module.
        // Older saved state (pre-results-tracking) doesn't have `picks`;
        // default to {} so the result page still renders without it.
        var picks = st.picks || {};
        var done = st.idx >= CUMULATIVE_QUESTIONS.length;
        var pct = CUMULATIVE_QUESTIONS.length ? Math.round((st.score / CUMULATIVE_QUESTIONS.length) * 100) : 0;
        var earned = pct >= 80;
        // Unconditional useEffect (Rules of Hooks) — was nested inside if(done){if(earned&&…){…}},
        // so the hook count dropped on Retake → React "rendered fewer hooks" crash.
        useEffect(function() {
          if (done && earned && !badges['cumulative_pass']) awardBadge('cumulative_pass', 'SwimLab Mastery');
        }, [done, earned]);
        if (done) {
          // Identify the missed questions, group by module so a student who
          // missed two PFD questions sees one "Review Why Life Jackets Work"
          // card rather than two separate ones.
          var missedByModule = {};
          CUMULATIVE_QUESTIONS.forEach(function(qi, i) {
            var pick = picks[i];
            if (pick !== undefined && pick !== qi.ans) {
              if (!missedByModule[qi.module]) missedByModule[qi.module] = [];
              missedByModule[qi.module].push({ qIdx: i, q: qi });
            }
          });
          var missedModuleIds = Object.keys(missedByModule);
          return h('div', { style: { padding: 20, maxWidth: 760, margin: '0 auto', color: T.text } },
            backBar('🎯 Cumulative Quiz Result'),
            h('div', { style: { background: T.card, border: '2px solid ' + (earned ? T.ok : T.warn), borderRadius: 14, padding: 24, textAlign: 'center' } },
              h('div', { style: { fontSize: 48, marginBottom: 6 } }, earned ? '🏅' : '📖'),
              h('h2', { style: { margin: '0 0 8px', fontSize: 22 } }, earned ? 'Mastery achieved' : 'Review recommended'),
              h('p', { style: { margin: '0 0 14px', fontSize: 16, color: T.text } },
                'Score: ', h('strong', null, st.score + ' / ' + CUMULATIVE_QUESTIONS.length + ' (' + pct + '%)')),
              h('p', { style: { margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
                earned
                  ? 'You have demonstrated mastery across the nine SwimLab modules. The skills you have just rehearsed have saved real lives.'
                  : 'Below 80% on a cumulative water safety quiz means there are concepts worth revisiting. The cards below show exactly what you missed and where to review. The goal is not the score; the goal is the muscle memory.'),
              h('div', { className: 'swimlab-no-print', style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
                h('button', { onClick: function() {
                  upd('bigQuizState', { idx: 0, score: 0, answered: false, lastChoice: null, picks: {} });
                }, style: btn({ padding: '8px 14px', fontSize: 13 }) }, __alloT('stem.swimlab.retake_quiz', 'Retake quiz')),
                h('button', { onClick: function() { upd('view', 'menu'); }, style: btnPrimary({ padding: '8px 14px', fontSize: 13 }) }, __alloT('stem.swimlab.back_to_menu', '← Back to menu'))
              )
            ),
            // Targeted feedback — per-module cards listing the user's missed
            // questions, with a jump-link to that module. Only shown if there
            // are misses; a perfect score sees only the celebration above.
            missedModuleIds.length > 0 && h('div', { style: { marginTop: 18 } },
              h('h3', { style: { margin: '0 0 10px', fontSize: 16, color: T.accentHi } },
                __alloT('stem.swimlab.review_these_specific_gaps', '📍 Review these specific gaps')),
              h('p', { style: { margin: '0 0 12px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                __alloT('stem.swimlab.you_missed', 'You missed '), h('strong', { style: { color: T.text } }, Object.keys(picks).filter(function(k) { return picks[k] !== CUMULATIVE_QUESTIONS[k].ans; }).length + ' question' + (Object.keys(picks).filter(function(k) { return picks[k] !== CUMULATIVE_QUESTIONS[k].ans; }).length === 1 ? '' : 's')),
                ' across ', h('strong', { style: { color: T.text } }, missedModuleIds.length + ' module' + (missedModuleIds.length === 1 ? '' : 's')),
                __alloT('stem.swimlab.each_card_below_names_the_module_that_', '. Each card below names the module that covers that gap.')),
              missedModuleIds.map(function(modId) {
                var moduleMisses = missedByModule[modId];
                var modLabel = MODULE_LABELS[modId] || modId;
                return h('div', { key: modId, style: { background: T.card, border: '1px solid ' + T.warn, borderRadius: 10, padding: 14, marginBottom: 10 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' } },
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: 11, fontWeight: 700, color: T.warn, textTransform: 'uppercase', letterSpacing: '0.05em' } }, __alloT('stem.swimlab.module', 'Module')),
                      h('div', { style: { fontSize: 15, fontWeight: 700, color: T.text } }, modLabel)),
                    h('button', {
                      className: 'swimlab-no-print',
                      onClick: function() { upd('view', modId); markVisited(modId); wsAnnounce('Opening ' + modLabel); },
                      'aria-label': 'Open ' + modLabel + ' module to review',
                      style: btnPrimary({ padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap' })
                    }, __alloT('stem.swimlab.review', 'Review →'))
                  ),
                  moduleMisses.map(function(m, mi) {
                    return h('div', { key: mi, style: { padding: 10, background: T.cardAlt, borderRadius: 8, marginTop: 6, fontSize: 12, lineHeight: 1.55 } },
                      h('div', { style: { color: T.text, marginBottom: 4 } },
                        h('strong', null, 'Q' + (m.qIdx + 1) + ': '), m.q.q),
                      h('div', { style: { color: T.danger } },
                        h('span', { style: { fontWeight: 700 } }, __alloT('stem.swimlab.your_answer', 'Your answer: ')),
                        m.q.opts[picks[m.qIdx]]),
                      h('div', { style: { color: T.ok, marginTop: 2 } },
                        h('span', { style: { fontWeight: 700 } }, __alloT('stem.swimlab.right_answer_2', 'Right answer: ')),
                        m.q.opts[m.q.ans]),
                      h('div', { style: { color: T.muted, marginTop: 6, fontStyle: 'italic' } }, m.q.explain)
                    );
                  })
                );
              })
            )
          );
        }
        var q = CUMULATIVE_QUESTIONS[st.idx];
        return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto', color: T.text } },
          backBar('🎯 Cumulative SwimLab Quiz'),
          h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 8 } },
            __alloT('stem.swimlab.question', 'Question '), h('strong', null, (st.idx + 1)), ' of ' + CUMULATIVE_QUESTIONS.length,
            __alloT('stem.swimlab.score', ' · score '), h('strong', null, st.score)),
          h('div', { style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 12, padding: 18 } },
            h('p', { style: { margin: '0 0 14px', fontSize: 15, color: T.text, fontWeight: 600, lineHeight: 1.5 } }, q.q),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              q.opts.map(function(opt, oi) {
                var picked = st.answered && st.lastChoice === oi;
                var isCorrect = oi === q.ans;
                var style = btn({ padding: '10px 14px', fontSize: 14 });
                if (st.answered) {
                  if (isCorrect) style = Object.assign({}, style, { background: '#14532d', borderColor: T.ok, color: '#bbf7d0' });
                  else if (picked) style = Object.assign({}, style, { background: '#7f1d1d', borderColor: T.danger, color: '#fde2e2' });
                }
                return h('button', { key: oi, disabled: st.answered,
                  onClick: function() {
                    var nextPicks = Object.assign({}, picks);
                    nextPicks[st.idx] = oi;
                    var nxt = Object.assign({}, st, { answered: true, lastChoice: oi, picks: nextPicks });
                    if (oi === q.ans) nxt.score = st.score + 1;
                    upd('bigQuizState', nxt);
                    wsAnnounce(oi === q.ans ? 'Correct.' : 'Incorrect.');
                  },
                  style: style }, opt);
              })
            ),
            st.answered && h('div', { style: { marginTop: 12, padding: 12, background: T.cardAlt, borderRadius: 8, fontSize: 13, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, 'Why: '), q.explain),
            // Action row mirrors mini-quiz: "Try again" only shown on wrong
            // answers. Resets answered state for THIS question and removes
            // the recorded pick so it doesn't show up in the missed-cards
            // section on the result page. Score is decremented only if the
            // user originally got it right (rare on a Try-again path) so
            // re-picking can't inflate the score.
            st.answered && h('div', { style: { marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' } },
              st.lastChoice !== q.ans && h('button', {
                onClick: function() {
                  var nextPicks = Object.assign({}, picks);
                  delete nextPicks[st.idx];
                  upd('bigQuizState', Object.assign({}, st, { answered: false, lastChoice: null, picks: nextPicks }));
                  wsAnnounce('Question reset. Try again.');
                },
                style: btn({ padding: '10px 16px', fontSize: 14 }) }, __alloT('stem.swimlab.try_again_3', '↺ Try again')),
              h('button', {
                onClick: function() {
                  upd('bigQuizState', Object.assign({}, st, { idx: st.idx + 1, answered: false, lastChoice: null }));
                },
                style: btnPrimary({ padding: '10px 16px', fontSize: 14 }) },
                st.idx + 1 < CUMULATIVE_QUESTIONS.length ? 'Next →' : 'See results')
            )
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // ASK THE LIFEGUARD (AI) — sourced answer with disclaimer
      // ─────────────────────────────────────────
      function renderAskLifeguard() {
        var qRaw = useState('');
        var q = qRaw[0], setQ = qRaw[1];
        var ansRaw = useState(null);
        var ans = ansRaw[0], setAns = ansRaw[1];
        var loadingRaw = useState(false);
        var loading = loadingRaw[0], setLoading = loadingRaw[1];
        // Persistent answer history. Stored in toolData (not local state) so
        // it survives navigating away to a module and back, and so it
        // persists across reloads via the same hydration path the rest of
        // SwimLab uses. Cap at 5 entries; newest first.
        var askHistory = d.askHistory || [];
        var ASK_HISTORY_MAX = 5;

        function ask() {
          if (!q.trim()) return;
          if (!callGemini) {
            setAns({ error: true, text: __alloT('stem.swimlab.ai_tutor_is_not_available_in_this_buil', 'AI tutor is not available in this build. Try the modules or Resources tab.') });
            return;
          }
          var question = q.trim();
          setLoading(true);
          setAns(null);
          var prompt = 'You are a water safety educator answering a question for a US student or teacher. ' +
            'Ground your answer in: CDC, USCG, AAP, AHA, NAA, ASAN, NOAA, US Lifesaving Association, Cold Water Boot Camp, ' +
            'Maine Department of Inland Fisheries & Wildlife, CPSC (Pool Safely / Virginia Graeme Baker Act), and Wilderness Medical Society. ' +
            'Cite source organizations inline. Use concrete numbers when known. NEVER claim to teach swimming — refer to ' +
            'Red Cross, YMCA, or a Water Safety Instructor (WSI). End every answer with "In a real emergency: call 911."  ' +
            'Use identity-first language for autistic people ("autistic students" not "students with autism"). ' +
            'Keep the answer under 250 words. ' +
            'Question: ' + question;
          callGemini(prompt, { maxOutputTokens: 500 })
            .then(function(resp) {
              setLoading(false);
              var text = (resp && (resp.text || resp.content || (typeof resp === 'string' ? resp : ''))) || 'No response.';
              setAns({ error: false, text: text });
              // Save successful answers to history (newest first, capped).
              var entry = { q: question, text: text, ts: Date.now() };
              var nextHistory = [entry].concat(askHistory).slice(0, ASK_HISTORY_MAX);
              upd('askHistory', nextHistory);
            })
            .catch(function(err) {
              setLoading(false);
              setAns({ error: true, text: 'Could not reach the AI tutor: ' + (err && err.message || 'unknown error') });
            });
        }

        function fmtAge(ts) {
          var diff = Date.now() - ts;
          var min = Math.floor(diff / 60000);
          if (min < 1) return 'just now';
          if (min < 60) return min + ' min ago';
          var hr = Math.floor(min / 60);
          if (hr < 24) return hr + ' hr ago';
          var day = Math.floor(hr / 24);
          return day + ' day' + (day === 1 ? '' : 's') + ' ago';
        }

        return h('div', { style: { padding: 20, maxWidth: 760, margin: '0 auto', color: T.text } },
          backBar('🤖 Ask the Lifeguard (AI)'),
          emergencyBanner(),
          h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 14, lineHeight: 1.55 } },
            __alloT('stem.swimlab.type_a_water_safety_question_the_ai_gr', 'Type a water safety question. The AI grounds its answer in CDC, USCG, AAP, NOAA, NAA, ASAN, and other primary sources cited throughout this lab. '),
            h('strong', null, __alloT('stem.swimlab.educational_only', 'Educational only.')),
            __alloT('stem.swimlab.real_emergencies_need_911_not_a_chatbo', ' Real emergencies need 911, not a chatbot.')),
          h('label', { htmlFor: 'wsQ', style: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 } }, __alloT('stem.swimlab.your_question', 'Your question:')),
          h('textarea', { id: 'wsQ', value: q, onChange: function(e) { setQ(e.target.value); }, rows: 3,
            placeholder: __alloT('stem.swimlab.e_g_how_long_can_a_person_survive_in_5', 'e.g. "How long can a person survive in 50°F water?" or "What\'s the safest swim suit color for my non-verbal son?"'),
            style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.cardAlt, color: T.text, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } }),
          h('div', { className: 'swimlab-no-print', style: { marginTop: 10, display: 'flex', gap: 8 } },
            h('button', { onClick: ask, disabled: loading || !q.trim(),
              style: btnPrimary({ padding: '10px 18px', fontSize: 14, opacity: (loading || !q.trim()) ? 0.5 : 1 }) },
              loading ? 'Thinking…' : 'Ask'),
            h('button', { onClick: function() { setQ(''); setAns(null); }, style: btn({ padding: '10px 14px', fontSize: 14 }) }, __alloT('stem.swimlab.clear', 'Clear'))
          ),
          ans && h('div', { style: { marginTop: 16, padding: 14, background: T.card, border: '1px solid ' + (ans.error ? T.warn : T.water), borderRadius: 10, fontSize: 14, color: T.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' } },
            ans.text
          ),
          // Recent-answers history. Persists across navigation + reload.
          // Each entry collapsed by default; click the question to expand.
          // Tagged swimlab-no-print so the print handout shows just the
          // current Q&A, not the user's full session history.
          askHistory.length > 0 && h('div', { className: 'swimlab-no-print', style: { marginTop: 18 } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' } },
              h('h3', { style: { margin: 0, fontSize: 13, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' } },
                '🕒 Recent answers (last ' + askHistory.length + ')'),
              h('button', {
                onClick: function() {
                  if (typeof window !== 'undefined' && window.confirm && !window.confirm('Clear all saved AI answers? This cannot be undone.')) return;
                  upd('askHistory', []);
                  wsAnnounce('History cleared');
                },
                'aria-label': __alloT('stem.swimlab.clear_all_saved_ai_answers', 'Clear all saved AI answers'),
                style: btn({ padding: '4px 10px', fontSize: 11 })
              }, __alloT('stem.swimlab.clear_history', 'Clear history'))
            ),
            askHistory.map(function(entry, i) {
              return h('details', { key: entry.ts + '-' + i,
                style: { background: T.cardAlt, border: '1px solid ' + T.border, borderRadius: 8, padding: 10, marginBottom: 6 } },
                h('summary', { style: { cursor: 'pointer', fontSize: 13, color: T.text, fontWeight: 600, listStyle: 'revert', display: 'flex', alignItems: 'baseline', gap: 8 } },
                  h('span', { style: { flex: 1, lineHeight: 1.4 } }, entry.q),
                  h('span', { style: { fontSize: 11, color: T.dim, fontWeight: 400, whiteSpace: 'nowrap' } }, fmtAge(entry.ts))
                ),
                h('div', { style: { marginTop: 8, padding: 10, background: T.bg, borderRadius: 6, fontSize: 13, color: T.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap' } },
                  entry.text
                )
              );
            })
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // RESOURCES TAB
      // ─────────────────────────────────────────
      function renderResources() {
        var groups = [
          { name: __alloT('stem.swimlab.get_certified_learn_to_swim', 'Get certified / learn to swim'), items: [
            { label: __alloT('stem.swimlab.american_red_cross_swimming_water_safe', 'American Red Cross — Swimming & Water Safety classes'), url: 'https://www.redcross.org/take-a-class/swimming' },
            { label: __alloT('stem.swimlab.ymca_aquatics_programs_2', 'YMCA — Aquatics programs'), url: 'https://www.ymca.org/what-we-do/healthy-living/swimming-aquatics' },
            { label: __alloT('stem.swimlab.usa_swimming_foundation_make_a_splash__2', 'USA Swimming Foundation — Make a Splash (scholarships, find lessons)'), url: 'https://www.usaswimming.org/foundation/make-a-splash' },
            { label: __alloT('stem.swimlab.infant_swimming_resource_isr_self_resc_2', 'Infant Swimming Resource (ISR) — Self-Rescue'), url: 'https://infantswim.com' }
          ] },
          { name: __alloT('stem.swimlab.drowning_prevention_authorities', 'Drowning prevention authorities'), items: [
            { label: __alloT('stem.swimlab.cdc_drowning_prevention_4', 'CDC — Drowning Prevention'), url: 'https://www.cdc.gov/drowning' },
            { label: __alloT('stem.swimlab.national_drowning_prevention_alliance__2', 'National Drowning Prevention Alliance (NDPA)'), url: 'https://ndpa.org' },
            { label: __alloT('stem.swimlab.stop_drowning_now', 'Stop Drowning Now'), url: 'https://stopdrowningnow.org' },
            { label: __alloT('stem.swimlab.aap_policy_statement_prevention_of_dro_2', 'AAP Policy Statement — Prevention of Drowning'), url: 'https://publications.aap.org/pediatrics/article/143/5/e20190850/76998' },
            { label: __alloT('stem.swimlab.mario_vittone_drowning_doesn_t_look_li_2', 'Mario Vittone — "Drowning Doesn\'t Look Like Drowning"'), url: 'https://mariovittone.com/2010/05/154/' }
          ] },
          { name: __alloT('stem.swimlab.cold_water_ice_safety', 'Cold water + ice safety'), items: [
            { label: __alloT('stem.swimlab.cold_water_boot_camp_mario_vittone_3', 'Cold Water Boot Camp (Mario Vittone)'), url: 'https://coldwaterbootcamp.com' },
            { label: __alloT('stem.swimlab.cold_water_safety', 'Cold Water Safety'), url: 'https://www.coldwatersafety.org' },
            { label: __alloT('stem.swimlab.maine_department_of_inland_fisheries_w_3', 'Maine Department of Inland Fisheries & Wildlife — Ice Safety'), url: 'https://www.maine.gov/ifw/programs-resources/boating-snowmobile-atv-laws-rules.html' }
          ] },
          { name: __alloT('stem.swimlab.beach_open_water', 'Beach + open water'), items: [
            { label: __alloT('stem.swimlab.noaa_rip_current_safety_2', 'NOAA Rip Current Safety'), url: 'https://www.weather.gov/safety/ripcurrent' },
            { label: __alloT('stem.swimlab.us_lifesaving_association_usla_2', 'US Lifesaving Association (USLA)'), url: 'https://www.usla.org' },
            { label: __alloT('stem.swimlab.nws_gray_maine_beach_hazards', 'NWS Gray (Maine) — Beach Hazards'), url: 'https://www.weather.gov/gyx/' }
          ] },
          { name: __alloT('stem.swimlab.boating_pfds', 'Boating + PFDs'), items: [
            { label: __alloT('stem.swimlab.us_coast_guard_recreational_boating_sa', 'US Coast Guard — Recreational Boating Safety'), url: 'https://www.uscgboating.org' },
            { label: __alloT('stem.swimlab.maine_ifw_boating_laws', 'Maine IFW — Boating Laws'), url: 'https://www.maine.gov/ifw/programs-resources/boating-snowmobile-atv-laws-rules.html' },
            { label: __alloT('stem.swimlab.safe_kids_worldwide_water_safety', 'Safe Kids Worldwide — Water Safety'), url: 'https://www.safekids.org/safetytips/field_risks/water-safety' }
          ] },
          { name: __alloT('stem.swimlab.pool_spa_safety', 'Pool + spa safety'), items: [
            { label: __alloT('stem.swimlab.pool_safely_cpsc_2', 'Pool Safely (CPSC)'), url: 'https://www.poolsafely.gov' },
            { label: __alloT('stem.swimlab.virginia_graeme_baker_pool_spa_safety_', 'Virginia Graeme Baker Pool & Spa Safety Act'), url: 'https://www.cpsc.gov/Regulations-Laws--Standards/Statutes/The-Virginia-Graeme-Baker-Pool-and-Spa-Safety-Act' }
          ] },
          { name: __alloT('stem.swimlab.hypothermia_wilderness_medicine', 'Hypothermia / wilderness medicine'), items: [
            { label: __alloT('stem.swimlab.wilderness_medical_society', 'Wilderness Medical Society'), url: 'https://wms.org' },
            { label: __alloT('stem.swimlab.nols_wilderness_medicine', 'NOLS Wilderness Medicine'), url: 'https://www.nols.edu/en/wilderness-medicine/' },
            { label: __alloT('stem.swimlab.aha_cold_emergencies_2', 'AHA — Cold Emergencies'), url: 'https://cpr.heart.org' }
          ] },
          { name: __alloT('stem.swimlab.autism_water_safety', 'Autism + water safety'), items: [
            { label: __alloT('stem.swimlab.national_autism_association_autism_saf_2', 'National Autism Association — Autism Safety Toolkit'), url: 'https://nationalautismassociation.org/resources/autism-safety-facts/' },
            { label: __alloT('stem.swimlab.autistic_self_advocacy_network_asan_2', 'Autistic Self-Advocacy Network (ASAN)'), url: 'https://autisticadvocacy.org' },
            { label: __alloT('stem.swimlab.project_lifesaver_international_gps_fo', 'Project Lifesaver International (GPS for elopement)'), url: 'https://projectlifesaver.org' },
            { label: __alloT('stem.swimlab.angelsense_gps_tracking', 'AngelSense (GPS tracking)'), url: 'https://www.angelsense.com' },
            { label: __alloT('stem.swimlab.special_olympics_aquatics_2', 'Special Olympics — Aquatics'), url: 'https://www.specialolympics.org/our-work/sports/aquatics' },
            { label: __alloT('stem.swimlab.alive_solutions_swimsuit_color_visibil_2', 'Alive Solutions — Swimsuit Color Visibility Tests'), url: 'https://alivesolutions.com' }
          ] },
          { name: 'Maine-specific', items: [
            { label: __alloT('stem.swimlab.maine_ymca_chapters_find_a_pool', 'Maine YMCA chapters (find a pool)'), url: 'https://www.ymainemaine.org' },
            { label: __alloT('stem.swimlab.maine_warden_service_911_for_water_eme', 'Maine Warden Service (911 for water emergencies)'), url: 'https://www.maine.gov/ifw/about-us/warden-service.html' },
            { label: __alloT('stem.swimlab.maine_marine_patrol', 'Maine Marine Patrol'), url: 'https://www.maine.gov/dmr/marine-patrol' }
          ] }
        ];
        return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
          backBar('📚 Resources'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            __alloT('stem.swimlab.every_organization_cited_in_this_lab_p', 'Every organization cited in this lab, plus adaptive swim resources and Maine-specific links. Bookmark the Make a Splash scholarship link if cost is a barrier to lessons.')),
          groups.map(function(g, gi) {
            return h('div', { key: gi, style: { background: T.card, border: '1px solid ' + T.border, borderRadius: 10, padding: 14, marginBottom: 12 } },
              h('h3', { style: { margin: '0 0 10px', fontSize: 14, color: T.accentHi } }, g.name),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 } },
                g.items.map(function(it, ii) {
                  return h('li', { key: ii },
                    h('a', { href: it.url, target: '_blank', rel: 'noopener', style: { color: T.link } }, it.label)
                  );
                })
              )
            );
          }),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // VIEW DISPATCH
      // ─────────────────────────────────────────
      var content;
      if (view === 'menu') content = renderMenu();
      else if (view === 'howSwimming') content = renderHowSwimming();
      else if (view === 'coldShock') content = renderColdShock();
      else if (view === 'ripCurrents') content = renderRipCurrents();
      else if (view === 'reachThrow') content = renderReachThrow();
      else if (view === 'pfd') content = renderPfd();
      else if (view === 'iceSafety') content = renderIceSafety();
      else if (view === 'hypothermia') content = renderHypothermia();
      else if (view === 'drainEntrap') content = renderDrainEntrapment();
      else if (view === 'autismWater') content = renderAutismWater();
      else if (view === 'cumulative') content = renderCumulative();
      else if (view === 'askLifeguard') content = renderAskLifeguard();
      else if (view === 'resources') content = renderResources();
      else if (view === 'strokeHunt') content = (function() {
        var iq = d.strokeHunt || { rate: 50, length: 50, kick: 50, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
        function setIQ(patch) { upd('strokeHunt', Object.assign({}, iq, patch)); }
        var efficiency = iq.length * 0.5 + iq.kick * 0.3 - Math.abs(iq.rate - 50) * 0.4;
        var state;
        if (efficiency > 50) state = 'elite';
        else if (efficiency > 30) state = 'efficient';
        else if (efficiency > 10) state = 'recreational';
        else state = 'inefficient';
        var sm = {
          elite:        { label: __alloT('stem.swimlab.elite_efficiency', '🏊 Elite efficiency'), color: '#059669', bg: '#ecfdf5', border: '#86efac', desc: __alloT('stem.swimlab.high_distance_per_stroke_balanced_kick', 'High distance per stroke, balanced kick, optimal rate.') },
          efficient:    { label: __alloT('stem.swimlab.efficient_stroke', '🟢 Efficient stroke'), color: '#0891b2', bg: '#ecfeff', border: '#67e8f9', desc: __alloT('stem.swimlab.good_fundamentals_sustainable_for_dist', 'Good fundamentals. Sustainable for distance.') },
          recreational: { label: __alloT('stem.swimlab.recreational', '🟡 Recreational'), color: '#d97706', bg: '#fffbeb', border: '#fcd34d', desc: __alloT('stem.swimlab.casual_swimming_tires_sooner', 'Casual swimming. Tires sooner.') },
          inefficient:  { label: __alloT('stem.swimlab.inefficient_stroke', '🔴 Inefficient stroke'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', desc: __alloT('stem.swimlab.wasted_energy_suboptimal_length_or_kic', 'Wasted energy. Suboptimal length or kick.') }
        }[state];
        return h('div', { style: { padding: 20, maxWidth: 900, margin: '0 auto' } },
          h('div', { style: { padding: 16, background: T.bg2 || '#0f172a', borderRadius: 10, color: T.text, border: '1px solid #0891b2' } },
            h('h3', { style: { fontSize: 14, fontWeight: 800, color: '#67e8f9' } }, __alloT('stem.swimlab.stroke_efficiency_discovery', '🏊 Stroke efficiency discovery')),
            h('p', { style: { fontSize: 12, marginBottom: 10 } }, __alloT('stem.swimlab.sliders_for_stroke_rate_length_per_str', 'Sliders for stroke rate, length per stroke, kick intensity. Discrete 4-state efficiency. No score, no reveal.')),
            h('div', { style: { padding: 12, borderRadius: 8, textAlign: 'center', background: sm.bg, border: '2px solid ' + sm.border, marginBottom: 10 } },
              h('div', { style: { fontSize: 14, fontWeight: 900, color: sm.color } }, sm.label),
              h('div', { style: { fontSize: 11, color: '#475569', marginTop: 4 } }, sm.desc)
            ),
            // Efficiency-vs-stroke-rate curve: efficiency = length·0.5 + kick·0.3 − |rate−50|·0.4,
            // a tent peaking at rate ≈ 50. Holding length+kick at the current sliders, sweep rate so
            // the optimum is visible — the "faster isn't better; lengthen the pull" insight made visual.
            (function() {
              var L = iq.length, K = iq.kick;
              var effAt = function(r) { return L * 0.5 + K * 0.3 - Math.abs(r - 50) * 0.4; };
              var W = 300, Hc = 110, padL = 26, padR = 10, padT = 14, padB = 22;
              var maxE = L * 0.5 + K * 0.3, minE = maxE - 20, span = Math.max(1, maxE - minE);
              var px = function(r) { return padL + (r / 100) * (W - padL - padR); };
              var py = function(e) { return padT + (1 - (e - minE) / span) * (Hc - padT - padB); };
              var pts = [];
              for (var r = 0; r <= 100; r += 5) pts.push(px(r).toFixed(1) + ',' + py(effAt(r)).toFixed(1));
              var curE = effAt(iq.rate);
              return h('svg', { viewBox: '0 0 ' + W + ' ' + Hc, width: '100%', style: { maxWidth: 340, display: 'block', margin: '0 auto 10px', background: '#0b1220', borderRadius: 8, border: '1px solid rgba(8,145,178,0.35)' }, role: 'img', 'aria-label': __alloT('stem.swimlab.efficiency_versus_stroke_rate_with_you', 'Efficiency versus stroke rate. With your current length and kick, efficiency peaks at a moderate stroke rate near 50, not at the fastest rate.') },
                h('line', { x1: padL, y1: padT, x2: padL, y2: Hc - padB, stroke: '#334155', strokeWidth: 1 }),
                h('line', { x1: padL, y1: Hc - padB, x2: W - padR, y2: Hc - padB, stroke: '#334155', strokeWidth: 1 }),
                h('line', { x1: px(50), y1: padT, x2: px(50), y2: Hc - padB, stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.7 }),
                h('text', { x: px(50), y: padT - 4, fill: '#22c55e', fontSize: 8, textAnchor: 'middle' }, __alloT('stem.swimlab.optimal_rate', 'optimal rate')),
                h('polyline', { points: pts.join(' '), fill: 'none', stroke: '#67e8f9', strokeWidth: 2 }),
                h('circle', { cx: px(iq.rate), cy: py(curE), r: 4, fill: '#fbbf24', stroke: '#0b1220', strokeWidth: 1 }),
                h('text', { x: px(iq.rate), y: py(curE) - 7, fill: '#fbbf24', fontSize: 8, textAnchor: 'middle', fontWeight: 'bold' }, 'you'),
                h('text', { x: (padL + W - padR) / 2, y: Hc - 5, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, __alloT('stem.swimlab.stroke_rate', 'Stroke rate →')),
                h('text', { x: 4, y: padT + 4, fill: '#94a3b8', fontSize: 8 }, 'eff')
              );
            })(),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 } },
              [{ k: 'rate', l: 'Stroke rate' }, { k: 'length', l: 'Length per stroke' }, { k: 'kick', l: 'Kick intensity' }].map(function(s) {
                return h('div', { key: s.k },
                  h('label', { htmlFor: 'sh-' + s.k, style: { display: 'block', fontSize: 11, fontWeight: 'bold' } }, s.l + ': ', h('span', { style: { fontFamily: 'monospace', color: '#67e8f9' } }, iq[s.k])),
                  h('input', { id: 'sh-' + s.k, type: 'range', min: 0, max: 100, step: 5, value: iq[s.k],
                    onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                    style: { width: '100%' }, 'aria-label': s.l }));
              })
            ),
            h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 } },
              h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ r: iq.rate, l: iq.length, k: iq.kick, st: state }]).slice(-8) }); }, style: { padding: '4px 10px', background: '#1e293b', color: '#cbd5e1', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 4, fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, __alloT('stem.swimlab.log', '📋 Log')),
              h('button', { onClick: function() { setIQ({ rate: 50, length: 50, kick: 50, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, style: { padding: '4px 10px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 4, fontSize: 11, cursor: 'pointer' } }, __alloT('stem.swimlab.reset', '↺ Reset'))
            ),
            h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.swimlab.hypothesis_rate_vs_length_which_matter', 'Hypothesis: Rate vs length — which matters more?'),
              style: { width: '100%', minHeight: 50, padding: 6, background: '#1e293b', color: '#e2e8f0', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', marginBottom: 8 }, rows: 2 }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '4px 10px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.5)', borderRadius: 4, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', marginBottom: 8 } }, __alloT('stem.swimlab.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
            iq.stuckRevealed && h('div', { style: { padding: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, fontSize: 11, color: '#cbd5e1', marginBottom: 8 } },
              h('ul', { style: { margin: 0, paddingLeft: 18 } },
                h('li', null, __alloT('stem.swimlab.elite_swimmers_use_slower_stroke_rate_', 'Elite swimmers use slower stroke rate, longer pulls. Why?')),
                h('li', null, __alloT('stem.swimlab.what_happens_with_super_fast_rate_but_', 'What happens with super-fast rate but tiny length?')))),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 'bold', color: '#34d399', cursor: 'pointer' } },
              h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }), __alloT('stem.swimlab.i_understand_explain_in_own_words', 'I understand — explain in own words')),
            iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.swimlab.explain_stroke_efficiency_physics', 'Explain stroke efficiency physics.'),
              style: { width: '100%', minHeight: 60, padding: 6, background: '#1e293b', color: '#e2e8f0', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', marginTop: 6 }, rows: 3 }),
            h('div', { style: { marginTop: 8, fontSize: 10, fontStyle: 'italic', color: '#64748b' } }, __alloT('stem.swimlab.design_note_discrete_4_state_stroke_ma', 'Design note: discrete 4-state stroke marker; no time score; no reveal — by design.'))
          )
        );
      })();
      else content = renderMenu();

      return h('div', { style: { background: T.bg, minHeight: '100%', color: T.text, fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' } },
        // SR live region (visually hidden)
        h('div', { ref: _wsLiveRef, 'aria-live': 'polite', 'aria-atomic': 'true',
          style: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 } }),
        content
      );

      } catch (err) {
        console.error('[SwimLab] render error', err);
        var React2 = (ctx && ctx.React) || window.React;
        if (!React2) return null;
        return React2.createElement('div', { style: { padding: 20, color: '#fde2e2', background: '#7f1d1d', borderRadius: 10, margin: 20 } },
          React2.createElement('strong', null, __alloT('stem.swimlab.swimlab_error', 'SwimLab error: ')),
          String(err && err.message || err)
        );
      }
    }
  });

})();

}
