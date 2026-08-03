// ═══════════════════════════════════════════════════════════════
// stem_tool_parentinglab.js — Science of Parenting Lab
//
// Completes the behavioral set: BehaviorLab teaches the operant
// science, SchoolBehaviorToolkit teaches K-12 school practice,
// LearningLab teaches how learning works — this tool teaches what
// the PARENTING literature actually says, and (the differentiator)
// how to tell its strongest claims from its weakest.
//
// Every content card carries one of four strength-of-evidence
// badges. The badge system IS the product: the tool's job is not
// covering parenting but teaching readers to distinguish the RCT
// core (PCIT / IY / PMT) from correlational findings (styles,
// attachment stability) from lifestyle brands (attachment
// parenting ≠ attachment theory).
//
// House rules (PARENTING_LAB_SPEC.md):
//  - Strengths-based, never diagnostic. A student may open this.
//    Nothing here scores or judges the reader's own family.
//  - Non-clinical: psychoeducation only.
//  - CONTENT REVIEW GATE: modules ship only after Aaron's (SME)
//    markup of the spec. This build: shell + badge system + M1.
//    M2-M9 render as locked previews on purpose.
//
// Registered tool ID: "parentingLab"
// Category: Learning & Behavioral Science (applied chip)
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('parentingLab'))) {

(function() {
  'use strict';

  // ─────────────────────────────────────────────────────────
  // Evidence badges — the four tiers, used on every card.
  // ─────────────────────────────────────────────────────────
  var BADGES = {
    rct:      { key: 'rct',      label: 'RCT-supported',            short: 'RCT',      color: '#059669', bg: 'rgba(5,150,105,0.12)',  border: 'rgba(5,150,105,0.45)',
                meaning: 'Randomized controlled trials, replicated. The strongest tier this literature has.' },
    meta:     { key: 'meta',     label: 'Meta-analytic association', short: 'Assoc.',  color: '#2563eb', bg: 'rgba(37,99,235,0.12)',  border: 'rgba(37,99,235,0.45)',
                meaning: 'Robust correlations across many studies. Causation is genuinely contested — children shape parenting too, and genes travel with both.' },
    cultural: { key: 'cultural', label: 'Culturally moderated',      short: 'Cultural', color: '#b45309', bg: 'rgba(180,83,9,0.12)',  border: 'rgba(180,83,9,0.45)',
                meaning: 'The direction or size of the effect changes across cultural contexts. A finding from one population is not a law of nature.' },
    popular:  { key: 'popular',  label: 'Popular, not supported',    short: 'Myth-ish', color: '#be123c', bg: 'rgba(190,18,60,0.12)', border: 'rgba(190,18,60,0.45)',
                meaning: 'Widely believed; the literature says otherwise, or says much less than the claim.' }
  };

  // ─────────────────────────────────────────────────────────
  // EVIDENCE — the claims register. Every card cites into this
  // table so the audit trail survives in code. Sources were
  // drafted by the spec and reviewed per module before shipping
  // (PARENTING_LAB_SPEC.md review protocol).
  // ─────────────────────────────────────────────────────────
  var EVIDENCE = {
    dims: { source: 'Baumrind (1966); Maccoby & Martin (1983)', badge: 'meta',
      note: 'Warmth (responsiveness) and structure (demandingness) as separable dimensions; the familiar styles are one way of cutting them.' },
    stylesOutcomes: { source: 'Meta-analytic tradition on styles and child outcomes', badge: 'meta',
      note: 'Authoritative patterns correlate with better average outcomes. Effect sizes are modest; these are group averages, not verdicts on any family.' },
    childEffects: { source: 'Bell (1968) reinterpretation; twin/adoption designs (behavior genetics)', badge: 'meta',
      note: 'Parenting is partly a RESPONSE to the child, and genetic confounds shrink the causal share of style-outcome correlations.' },
    guan: { source: 'Chao (1994)', badge: 'cultural',
      note: 'The "authoritarian" label mismeasures Chinese-American guan (training/devotion) parenting; outcome patterns differ across cultural contexts.' },
    crossCultural: { source: 'Multi-country parenting research (e.g., Lansford and colleagues)', badge: 'cultural',
      note: 'How a practice lands depends on what it means in context — the same behavior reads as care in one setting and as harshness in another.' }
  };

  // ─────────────────────────────────────────────────────────
  // M1 — Warmth & Structure: the two dials
  // ─────────────────────────────────────────────────────────
  var M1_CARDS = [
    {
      id: 'two-dials',
      title: 'Two dials, not four boxes',
      evidence: 'dims',
      body: 'Most of what the styles literature measures comes down to two separable dials: WARMTH (responsiveness — noticing, accepting, and responding to your child) and STRUCTURE (demandingness — expectations, follow-through, and limits). The famous four styles are just the corners you get when you set each dial high or low. Thinking in dials beats thinking in boxes: real parenting moves around the space, and the dials are things you can actually adjust.'
    },
    {
      id: 'four-corners',
      title: 'The four corners (and what they are not)',
      evidence: 'stylesOutcomes',
      body: 'High warmth + high structure is usually called authoritative; high structure + low warmth, authoritarian; high warmth + low structure, permissive; low + low, uninvolved. On average, across many studies, the authoritative corner correlates with better outcomes. Three honest qualifiers: the effects are modest, they are averages over thousands of families, and a style label describes a pattern — it is not a diagnosis of a parent or a prediction about a child.'
    },
    {
      id: 'causation',
      title: 'Why "correlates with" is doing heavy lifting',
      evidence: 'childEffects',
      body: 'Style-outcome links are correlational. Two big reasons to hold the causal story loosely: children shape parenting (an easygoing child makes calm consistency easier; a struggling child pulls for control — the arrow points both ways), and genes travel with both parenting and outcomes, so twin and adoption designs consistently shrink the share of the correlation that parenting style itself explains. The takeaway is not "parenting does not matter" — it is that the SPECIFIC SKILLS with trial evidence (see the RCT core module) are a better bet than chasing a style label.'
    },
    {
      id: 'culture',
      title: 'The dials mean different things in different places',
      evidence: 'guan',
      body: 'The styles framework grew out of research on mostly white, middle-class American families. Chao (1994) showed that what the "authoritarian" scale picks up in many Chinese-American families is guan — a tradition of training and devoted involvement — and that the outcome patterns do not transfer. Cross-cultural work keeps finding versions of this: the same practice can mean protection in one context and harshness in another. A style score without cultural context is a number without units.'
    },
    {
      id: 'so-what',
      title: 'So what do I do with this?',
      evidence: 'stylesOutcomes',
      body: 'Use the dials as a reflection tool, not a report card. Warmth and structure are both skills with learnable components — specific praise, predictable routines, calm follow-through — and those components (not the labels) are where the strongest evidence lives. The RCT core module picks up exactly there.'
    }
  ];

  // The Two Dials interactive: rate each vignette on BOTH dials
  // separately. The point is dimensional thinking — the same scene
  // can be high-warmth AND high-structure at once.
  var M1_VIGNETTES = [
    {
      id: 'v1',
      text: 'Bedtime. Dad sits on the bed: "Two more pages, then lights out — same as every night. Which two pages?"',
      warmth: 'high', structure: 'high',
      why: 'Connection (sitting close, offering a real choice) AND a held limit (two pages, same routine nightly). High on both dials at once — this is the combination the styles literature keeps associating with good average outcomes.'
    },
    {
      id: 'v2',
      text: 'Homework meltdown. Mom: "It is done when I say it is done. Go back to the table." No discussion, no acknowledgment of the frustration.',
      warmth: 'low', structure: 'high',
      why: 'The limit is clear and enforced (high structure) but the child\'s state is not acknowledged (low warmth as displayed here). One scene is not a style — but this PATTERN, repeated, is what the authoritarian corner describes.'
    },
    {
      id: 'v3',
      text: 'Checkout line. Child grabs candy; parent sighs, "Fine, just this once" — the fourth "just this once" this week.',
      warmth: 'high', structure: 'low',
      why: 'Warm and responsive in the moment, but the stated limit does not hold (low structure). The ABC module shows exactly what the fourth "just this once" teaches — and why it makes the fifth one louder.'
    },
    {
      id: 'v4',
      text: 'A teen mentions a bad day. Parent, without looking up: "Mm. Did you take the trash out?"',
      warmth: 'low', structure: 'low',
      why: 'A missed serve-and-return (low warmth in this moment) and the only engagement is a chore reminder without follow-through (low structure). Everyone has moments like this; the dials describe patterns, not moments.'
    },
    {
      id: 'v5',
      text: 'New rule after a rough week: phone parks in the kitchen at 9pm. Parent to teen: "I know you hate this. Tell me what feels unfair about it and we will look at it together in two weeks — but for two weeks, it parks."',
      warmth: 'high', structure: 'high',
      why: 'Acknowledges the teen\'s view and offers a real review point (warmth, autonomy support) while the limit actually holds for the trial period (structure). Note this is not a negotiation of the limit — it is warmth ABOUT the limit.'
    },
    {
      id: 'v6',
      text: 'Grandmother insists the toddler finish every bite, spoon-feeding him herself at age four, and sleeps beside him every night.',
      warmth: 'depends', structure: 'depends',
      why: 'Deliberately unratable without context. In some cultural frames this is devoted, expected care; in the styles framework\'s home culture it might get scored as intrusive. This is the Chao point: the dials are read through culture, and a score without context is a number without units.'
    }
  ];

  // Locked previews for M2-M9 (content pending the spec review gate).
  var LOCKED_MODULES = [
    { id: 'm2', icon: '🤝', title: 'Attachment: the theory vs. the brand', teaser: 'Bowlby and Ainsworth vs. the lifestyle brand that borrowed their name.' },
    { id: 'm3', icon: '🧪', title: 'The RCT core', teaser: 'PCIT, Incredible Years, PMT — and the skills they all share.' },
    { id: 'm4', icon: '🗣️', title: 'PRIDE Skills Studio', teaser: 'Practice the play-session skills, utterance by utterance.' },
    { id: 'm5', icon: '🔁', title: 'ABC at Home', teaser: 'The checkout-line tantrum, analyzed — and the extinction burst.' },
    { id: 'm6', icon: '⚖️', title: 'Discipline: what the evidence says', teaser: 'Spanking meta-analyses, time-out honestly, consistency over severity.' },
    { id: 'm7', icon: '🔍', title: 'Myths vs. literature', teaser: 'Praise junkies, screen-time panic, birth order — badge them yourself.' },
    { id: 'm8', icon: '🧭', title: 'Adolescents: autonomy and staying in the room', teaser: 'Why snooping fails and disclosure is a relationship outcome.' },
    { id: 'm9', icon: '🤲', title: 'When to seek help + partnering with school', teaser: 'Red flags, therapy names decoded, and how IEP meetings actually work.' }
  ];

  function srAnnounce(msg) {
    try {
      var lr = document.getElementById('allo-live-parentinglab');
      if (lr) { lr.textContent = ''; lr.textContent = msg; }
    } catch (_) {}
  }

  (function() {
    if (typeof document === 'undefined' || document.getElementById('allo-live-parentinglab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-parentinglab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  window.StemLab.registerTool('parentingLab', {
    icon: '🫂',
    label: 'Science of Parenting Lab',
    desc: 'What the parenting literature actually says — and how to tell its strongest claims from its weakest. Warmth and structure as two dials (not four boxes), with a strength-of-evidence badge on every claim: RCT-supported, meta-analytic association, culturally moderated, or popular-but-not-supported. Strengths-based and non-diagnostic. Sister tool to BehaviorLab and Learning Lab.',
    color: 'rose',
    category: 'science',
    questHooks: [
      { id: 'pl_read_m1', label: 'Read all five Warmth & Structure cards', icon: '📖', check: function(d) { return d && d.readCards && Object.keys(d.readCards).length >= 5; }, progress: function(d) { return ((d && d.readCards && Object.keys(d.readCards).length) || 0) + '/5 cards'; } },
      { id: 'pl_dials', label: 'Rate 4 vignettes on both dials', icon: '🎛️', check: function(d) { return d && d.dialsDone && Object.keys(d.dialsDone).length >= 4; }, progress: function(d) { return ((d && d.dialsDone && Object.keys(d.dialsDone).length) || 0) + '/4 vignettes'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var announceToSR = (typeof ctx.announceToSR === 'function') ? ctx.announceToSR : srAnnounce;
      var awardXP = function(n, why) { if (ctx.awardXP) ctx.awardXP('parentingLab', n, why); };
      var isDark = !!ctx.isDark || !!ctx.isContrast;

      var d = labToolData.parentingLab || {};
      function setPL(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.parentingLab) || {};
          return Object.assign({}, prev, { parentingLab: Object.assign({}, prior, patch) });
        });
      }

      var view = d.view || 'menu';           // 'menu' | 'm1'
      var readCards = d.readCards || {};      // cardId -> true
      var dialsDone = d.dialsDone || {};      // vignetteId -> { warmth, structure, correct }
      var dialsCurrent = d.dialsCurrent || 0; // index into M1_VIGNETTES
      var dialsPick = d.dialsPick || {};      // in-progress { warmth, structure }

      // Palette — calm, warm; readable in dark and light hosts.
      var pal = isDark
        ? { text: '#f1f5f9', muted: '#94a3b8', card: 'rgba(244,63,94,0.07)', border: 'rgba(244,63,94,0.25)', panel: 'rgba(15,23,42,0.6)', accent: '#fb7185', btn: '#be123c' }
        : { text: '#1e293b', muted: '#475569', card: 'rgba(244,63,94,0.05)', border: 'rgba(244,63,94,0.25)', panel: '#ffffff', accent: '#be123c', btn: '#be123c' };

      function badgeChip(key, size) {
        var b = BADGES[key]; if (!b) return null;
        return h('span', {
          className: 'inline-flex items-center gap-1 rounded-full font-bold',
          style: { color: b.color, background: b.bg, border: '1px solid ' + b.border, padding: size === 'sm' ? '2px 8px' : '3px 10px', fontSize: size === 'sm' ? '10px' : '11px' },
          title: b.meaning
        }, b.label);
      }

      // ── Review-gate banner: visible until the SME pass clears it ──
      var reviewBanner = h('div', {
        role: 'note',
        className: 'rounded-xl px-4 py-2.5 mb-4 text-xs font-bold',
        style: { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', color: isDark ? '#fcd34d' : '#92400e' }
      }, __alloT('stem.parentingLab.review_banner', 'Preview build — module 1 of 9. Content ships module-by-module after expert review (PARENTING_LAB_SPEC.md).'));

      var backBtn = h('button', {
        onClick: function() {
          if (view === 'menu') { if (typeof setStemLabTool === 'function') setStemLabTool(null); }
          else { setPL({ view: 'menu' }); announceToSR(__alloT('stem.parentingLab.back_menu_sr', 'Back to the Parenting Lab menu.')); }
        },
        className: 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold border transition-colors',
        style: { background: pal.panel, borderColor: pal.border, color: pal.text },
        'aria-label': view === 'menu' ? __alloT('stem.parentingLab.back_tools', 'Back to STEM Lab tools') : __alloT('stem.parentingLab.back_menu', 'Back to Parenting Lab menu')
      }, view === 'menu' ? '← ' + __alloT('stem.parentingLab.tools', 'Tools') : '← ' + __alloT('stem.parentingLab.menu', 'Menu'));

      // ── The badge legend — teachable on its own ──
      function badgeLegend() {
        return h('div', { className: 'rounded-2xl p-4 mb-4', style: { background: pal.card, border: '1px solid ' + pal.border } },
          h('h3', { className: 'text-sm font-black mb-1', style: { color: pal.text } }, __alloT('stem.parentingLab.legend_title', 'How to read the badges')),
          h('p', { className: 'text-xs mb-3', style: { color: pal.muted } }, __alloT('stem.parentingLab.legend_sub', 'Every claim in this lab carries one. Parenting advice rarely tells you which tier it comes from — that is the skill this tool teaches.')),
          h('div', { className: 'grid gap-2 sm:grid-cols-2' },
            Object.keys(BADGES).map(function(k) {
              var b = BADGES[k];
              return h('div', { key: k, className: 'flex flex-col gap-1 rounded-xl p-3', style: { background: pal.panel, border: '1px solid ' + pal.border } },
                badgeChip(k),
                h('span', { className: 'text-[11px] leading-snug', style: { color: pal.muted } }, b.meaning)
              );
            })
          )
        );
      }

      // ─────────────── MENU ───────────────
      if (view === 'menu') {
        var m1Done = Object.keys(readCards).length >= M1_CARDS.length && Object.keys(dialsDone).length >= 4;
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
          h('div', { className: 'flex items-center gap-3 flex-wrap mb-3' },
            backBtn,
            h('h2', { className: 'text-xl font-black' }, '🫂 ' + __alloT('stem.parentingLab.title', 'Science of Parenting Lab')),
            m1Done && h('span', { className: 'text-[11px] font-bold rounded-full px-2 py-0.5', style: { background: 'rgba(5,150,105,0.15)', color: '#059669', border: '1px solid rgba(5,150,105,0.4)' } }, __alloT('stem.parentingLab.m1_done', 'Module 1 complete'))
          ),
          h('p', { className: 'text-sm mb-4', style: { color: pal.muted } },
            __alloT('stem.parentingLab.intro', 'What the parenting literature actually says, with the strength of each claim labeled honestly. Built to be strengths-based: nothing here diagnoses or scores your family.')),
          reviewBanner,
          badgeLegend(),
          h('button', {
            onClick: function() { setPL({ view: 'm1' }); announceToSR(__alloT('stem.parentingLab.m1_open_sr', 'Opened module one: warmth and structure.')); },
            className: 'w-full text-left rounded-2xl p-4 mb-3 transition-all hover:shadow-md',
            style: { background: pal.panel, border: '2px solid ' + pal.border, color: pal.text }
          },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('span', { className: 'font-black text-base' }, '🎛️ ' + __alloT('stem.parentingLab.m1_title', 'M1 — Warmth & Structure: the two dials')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.accent } },
                Object.keys(readCards).length + '/' + M1_CARDS.length + ' ' + __alloT('stem.parentingLab.cards', 'cards') + ' · ' + Object.keys(dialsDone).length + '/' + M1_VIGNETTES.length + ' ' + __alloT('stem.parentingLab.vignettes', 'vignettes'))
            ),
            h('p', { className: 'text-xs mt-1', style: { color: pal.muted } },
              __alloT('stem.parentingLab.m1_teaser', 'The two dimensions under the famous four styles — and why "correlates with" is doing heavy lifting.'))
          ),
          h('div', { className: 'grid gap-2 sm:grid-cols-2' },
            LOCKED_MODULES.map(function(m) {
              return h('div', {
                key: m.id,
                className: 'rounded-2xl p-3 opacity-70',
                style: { background: pal.card, border: '1px dashed ' + pal.border },
                'aria-label': m.title + ' — ' + __alloT('stem.parentingLab.locked', 'coming after content review')
              },
                h('div', { className: 'text-sm font-bold', style: { color: pal.text } }, m.icon + ' ' + m.title),
                h('div', { className: 'text-[11px] mt-0.5', style: { color: pal.muted } }, m.teaser),
                h('div', { className: 'text-[10px] font-bold mt-1.5 uppercase tracking-wider', style: { color: pal.accent } }, '🔒 ' + __alloT('stem.parentingLab.locked_short', 'In expert review'))
              );
            })
          )
        );
      }

      // ─────────────── M1 ───────────────
      function markCardRead(cardId) {
        if (readCards[cardId]) return;
        var next = Object.assign({}, readCards); next[cardId] = true;
        setPL({ readCards: next });
        if (Object.keys(next).length === M1_CARDS.length) {
          awardXP(10, 'All Warmth & Structure cards read');
          announceToSR(__alloT('stem.parentingLab.cards_done_sr', 'All five cards read.'));
        }
      }

      function pickDial(dial, value) {
        var next = Object.assign({}, dialsPick); next[dial] = value;
        setPL({ dialsPick: next });
      }

      function submitVignette() {
        var v = M1_VIGNETTES[dialsCurrent]; if (!v) return;
        if (!dialsPick.warmth || !dialsPick.structure) return;
        var correct = (v.warmth === 'depends')
          ? (dialsPick.warmth === 'depends' && dialsPick.structure === 'depends')
          : (dialsPick.warmth === v.warmth && dialsPick.structure === v.structure);
        var next = Object.assign({}, dialsDone);
        next[v.id] = { warmth: dialsPick.warmth, structure: dialsPick.structure, correct: correct };
        setPL({ dialsDone: next, dialsRevealed: true });
        if (correct) awardXP(5, 'Two Dials vignette');
        announceToSR(correct
          ? __alloT('stem.parentingLab.dials_match_sr', 'Your ratings match the intended reading. Explanation shown below.')
          : __alloT('stem.parentingLab.dials_differ_sr', 'Your ratings differ from the intended reading. Explanation shown below.'));
      }

      function nextVignette() {
        setPL({ dialsCurrent: Math.min(dialsCurrent + 1, M1_VIGNETTES.length - 1), dialsPick: {}, dialsRevealed: false });
      }

      function dialPicker(dialKey, dialLabel) {
        var options = [
          { v: 'high', label: __alloT('stem.parentingLab.dial_high', 'High') },
          { v: 'low', label: __alloT('stem.parentingLab.dial_low', 'Low') },
          { v: 'depends', label: __alloT('stem.parentingLab.dial_depends', 'Depends on context') }
        ];
        return h('div', { role: 'radiogroup', 'aria-label': dialLabel, className: 'flex flex-col gap-1.5' },
          h('div', { className: 'text-xs font-black uppercase tracking-wider', style: { color: pal.accent } }, dialLabel),
          h('div', { className: 'flex gap-1.5 flex-wrap' },
            options.map(function(o) {
              var on = dialsPick[dialKey] === o.v;
              return h('button', {
                key: o.v,
                role: 'radio', 'aria-checked': on,
                onClick: function() { pickDial(dialKey, o.v); },
                onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickDial(dialKey, o.v); } },
                className: 'rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors',
                style: on
                  ? { background: pal.btn, color: '#fff', borderColor: pal.btn }
                  : { background: pal.panel, color: pal.text, borderColor: pal.border }
              }, o.label);
            })
          )
        );
      }

      var v = M1_VIGNETTES[dialsCurrent];
      var vDone = v && dialsDone[v.id];
      var revealed = !!d.dialsRevealed && vDone;

      return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
        h('div', { className: 'flex items-center gap-3 flex-wrap mb-3' },
          backBtn,
          h('h2', { className: 'text-lg font-black' }, '🎛️ ' + __alloT('stem.parentingLab.m1_title', 'M1 — Warmth & Structure: the two dials'))
        ),
        reviewBanner,

        // Content cards
        h('div', { className: 'space-y-3 mb-6' },
          M1_CARDS.map(function(c) {
            var open = !!readCards[c.id];
            var ev = EVIDENCE[c.evidence] || {};
            return h('details', {
              key: c.id,
              open: open || undefined,
              className: 'rounded-2xl overflow-hidden',
              style: { background: pal.panel, border: '1px solid ' + pal.border },
              onToggle: function(e) { if (e.target.open) markCardRead(c.id); }
            },
              h('summary', { className: 'cursor-pointer px-4 py-3 flex items-center justify-between gap-2 flex-wrap font-bold text-sm', style: { color: pal.text } },
                h('span', null, (open ? '✓ ' : '') + c.title),
                badgeChip(ev.badge, 'sm')
              ),
              h('div', { className: 'px-4 pb-4' },
                h('p', { className: 'text-sm leading-relaxed', style: { color: pal.text } }, c.body),
                h('p', { className: 'text-[11px] mt-2 font-semibold', style: { color: pal.muted } }, __alloT('stem.parentingLab.source', 'Source') + ': ' + ev.source + ' — ' + ev.note)
              )
            );
          })
        ),

        // Two Dials interactive
        h('div', { className: 'rounded-2xl p-4', style: { background: pal.card, border: '2px solid ' + pal.border } },
          h('div', { className: 'flex items-center justify-between gap-2 flex-wrap mb-2' },
            h('h3', { className: 'text-sm font-black', style: { color: pal.text } }, '🎛️ ' + __alloT('stem.parentingLab.dials_title', 'The Two Dials — rate each scene')),
            h('span', { className: 'text-[11px] font-bold', style: { color: pal.muted } }, (dialsCurrent + 1) + ' / ' + M1_VIGNETTES.length)
          ),
          h('p', { className: 'text-xs mb-3', style: { color: pal.muted } },
            __alloT('stem.parentingLab.dials_sub', 'Rate warmth and structure separately. The same scene can be high on both — that is the whole point of dials over boxes. One scene is a moment, not a style.')),
          v && h('div', { className: 'rounded-xl p-3 mb-3 text-sm leading-relaxed', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, v.text),
          v && !revealed && h('div', { className: 'flex flex-col gap-3' },
            dialPicker('warmth', __alloT('stem.parentingLab.dial_warmth', 'Warmth (responsiveness)')),
            dialPicker('structure', __alloT('stem.parentingLab.dial_structure', 'Structure (demandingness)')),
            h('button', {
              onClick: submitVignette,
              disabled: !dialsPick.warmth || !dialsPick.structure,
              className: 'self-start rounded-lg px-4 py-2 text-xs font-black text-white disabled:opacity-50',
              style: { background: pal.btn }
            }, __alloT('stem.parentingLab.dials_check', 'Check my reading'))
          ),
          v && revealed && h('div', null,
            h('div', { className: 'rounded-xl p-3 text-xs leading-relaxed mb-3', style: { background: vDone.correct ? 'rgba(5,150,105,0.1)' : 'rgba(245,158,11,0.1)', border: '1px solid ' + (vDone.correct ? 'rgba(5,150,105,0.4)' : 'rgba(245,158,11,0.4)'), color: pal.text } },
              h('div', { className: 'font-black mb-1' }, vDone.correct
                ? __alloT('stem.parentingLab.dials_match', 'Your reading matches the intended one.')
                : __alloT('stem.parentingLab.dials_differ', 'A different reading — which is fine. Here is the intended one:')),
              v.why
            ),
            dialsCurrent < M1_VIGNETTES.length - 1
              ? h('button', { onClick: nextVignette, className: 'rounded-lg px-4 py-2 text-xs font-black text-white', style: { background: pal.btn } }, __alloT('stem.parentingLab.dials_next', 'Next scene →'))
              : h('p', { className: 'text-xs font-bold', style: { color: pal.accent } }, __alloT('stem.parentingLab.dials_done', 'All scenes rated. The RCT core module (in expert review) picks up where the dials leave off: the specific skills with trial evidence.'))
          )
        )
      );
    }
  });

})();

}
