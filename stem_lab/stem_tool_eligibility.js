// ═══════════════════════════════════════════════════════════════
// stem_tool_eligibility.js — Diagnosis vs. Eligibility
//
// The most consequential confusion in school psychology: a DSM
// diagnosis is NOT IDEA eligibility. A child with an ADHD
// diagnosis is not automatically eligible; a child can qualify
// under IDEA with no diagnosis at all. Parents arrive at meetings
// believing the doctor's letter settles it, and staff often
// believe the same.
//
// ★★ WHY THIS TOOL EXISTS AND NOT A "DSM NAVIGATOR" ★★
// DSM-5-TR is copyrighted by the American Psychiatric Association
// and sold commercially. There is no lawful way to reproduce its
// criteria here, so this tool never tries: it explains what a
// diagnostic manual is FOR in our own words, and quotes the
// EDUCATIONAL side verbatim from law_corpus/ (34 CFR § 300.8),
// which is public. See LAW_NAV_AND_DSM_SCOPING.md.
//
// ★★ NEVER DECIDES ELIGIBILITY ★★
// The interactive asks which QUESTION a team still has to answer.
// It never returns "eligible" or "not eligible" — that is a team
// determination about a real child, and a tool that simulated it
// would be wrong in exactly the cases that matter most.
// (Same discipline as the Dispro Analyzer never declaring a finding.)
//
// Registered tool ID: "diagnosisEligibility"
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('diagnosisEligibility'))) {

(function() {
  'use strict';

  var CDN_BASE = 'https://alloflow-cdn.pages.dev/';
  function corpusUrl(path) {
    try {
      var loc = window.location || {};
      var host = loc.hostname || '', pathname = loc.pathname || '';
      var isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(host);
      var isDesktopBundled = !!window._isDesktopBundledApp || (isLocalHost && pathname.indexOf('/app/') === 0);
      var isAlloHosted = /(^|\.)alloflow/i.test(host) || /(^|\.)web\.app$/i.test(host) || /(^|\.)firebaseapp\.com$/i.test(host);
      if (isDesktopBundled) return new URL(path, loc.href).toString();
      if (isLocalHost || isAlloHosted) return new URL('/' + String(path).replace(/^\/+/, ''), loc.origin).toString();
    } catch (_) {}
    return CDN_BASE + String(path).replace(/^\/+/, '');
  }

  // The educational half of the comparison is quoted from the corpus, never
  // restated from memory. Shared module-scope cache, like the Law Navigator.
  var _idea = null, _ideaPending = null, _ideaErr = '';
  function loadIdea() {
    if (_idea) return Promise.resolve(_idea);
    if (_ideaPending) return _ideaPending;
    _ideaPending = fetch(corpusUrl('law_corpus/idea-part-b.json'), { cache: 'no-cache' })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(j) { _idea = j; return j; })
      .catch(function(e) { _ideaPending = null; _ideaErr = String(e.message || e); throw e; });
    return _ideaPending;
  }
  function section(num) {
    if (!_idea) return null;
    for (var i = 0; i < _idea.sections.length; i++) if (_idea.sections[i].number === num) return _idea.sections[i];
    return null;
  }
  // Pull the 13 category definitions out of § 300.8(c) as PUBLISHED. Each
  // reads "(N) <Name> means ...", so the name is taken from the text itself
  // rather than from a hardcoded list that could drift from the law.
  function categoriesFromCorpus() {
    var s = section('300.8');
    if (!s) return [];
    var out = [], seen = {};
    s.paragraphs.forEach(function(p) {
      // Category paragraphs open with "(N)" — but the name does not always sit
      // immediately after it. Three of the thirteen carry sub-markers:
      //   "(1)(i) Autism means …"
      //   "(4)(i) Emotional disturbance means …"
      //   "(10) Specific learning disability—(i) General. Specific learning
      //    disability means …"
      // Requiring "(N) Name means" found only 10 of 13. So: take the number
      // from the opening marker, then find the first "<Name> means" phrase.
      var num = p.match(/^\((\d{1,2})\)/);
      if (!num || seen[num[1]]) return;
      var nm = p.slice(0, 220).match(/([A-Z][A-Za-z\-' ]{2,44}?)\s+means\b/);
      if (!nm) return;
      seen[num[1]] = true;
      out.push({ n: num[1], name: nm[1].trim(), text: p });
    });
    return out;
  }

  // ── Framing content: our own words about how the two systems differ.
  //    No DSM text, no criteria, no diagnostic guidance.
  var FRAMING = [
    {
      id: 'two-questions',
      title: 'Two systems asking different questions',
      body: 'A clinician asks: does this child\'s presentation match a recognized pattern, and what treatment follows? A school team asks something narrower and more practical: does this child have a disability that gets in the way of learning, AND do they need specially designed instruction because of it? Those questions have different owners, different evidence, and different consequences. A diagnosis can inform the school\'s question. It cannot answer it, because it was never asked for that purpose.'
    },
    {
      id: 'two-prong',
      title: 'The part almost everyone misses: it takes BOTH',
      body: 'Federal law defines an eligible child in two joined pieces: the child has a disability in one of the listed categories, AND — "by reason thereof" — needs special education and related services. Both, not either. This is why a real, correct diagnosis can still end in "not eligible": if a child is thriving academically and socially without specialized instruction, the second prong is not met. It is also why the reverse happens: a team can find a child eligible with no clinical diagnosis at all, because the categories are educational definitions applied by a team, not clinical ones applied by a doctor.'
    },
    {
      id: 'who-decides',
      title: 'Who actually decides',
      body: 'Eligibility is decided by a team that includes the parent, using multiple sources of information. No single person on that team — and no one outside it — holds a veto or a trump card. That includes an outside evaluator: a private evaluation must be CONSIDERED, but the district is not required to adopt its conclusions. It also includes the school: a district cannot decline to evaluate simply because a child is passing, or because a support program is already being tried.'
    },
    {
      id: 'not-a-lesser-plan',
      title: '504 is not a consolation prize',
      body: 'When a child does not need specially designed instruction, the answer is often a 504 plan: accommodations that change HOW a child accesses learning. It is a different statute answering a different question, not a downgrade. Some children are better served by it. What matters is which question actually fits the child, and that the family understands which one is being answered.'
    },
    {
      id: 'what-to-bring',
      title: 'What a diagnosis is genuinely good for here',
      body: 'A clinical evaluation earns its place by describing FUNCTION: what the child can do, under what conditions, with what support, and what gets in the way. That is the evidence a school team can actually use. A letter that states a diagnosis and asks for services, with no functional detail, gives the team very little — while a report that documents how attention breaks down during independent written work speaks directly to both prongs.'
    }
  ];

  // ── Scenarios. Every "answer" is a QUESTION THE TEAM STILL OWES,
  //    never an eligibility determination.
  var QUESTIONS = [
    { id: 'q_cat', label: 'Which educational category might apply?' },
    { id: 'q_need', label: 'Does the child need specially designed instruction?' },
    { id: 'q_data', label: 'What evidence is still missing?' }
  ];
  var SCENARIOS = [
    {
      id: 's1',
      text: 'A seventh grader has a new ADHD diagnosis from her pediatrician. She earns As and Bs, has friends, and turns work in on time. Her parents bring the letter and ask for an IEP.',
      answer: 'q_need',
      why: 'The category question may well be satisfiable — but the second prong is the live one here. Grades and functioning suggest she may not need specially designed instruction, which is a real possible outcome and not a dismissal of the diagnosis. A 504 plan may fit the accommodations she does need. The team still has to ask the question rather than assume either way.'
    },
    {
      id: 's2',
      text: 'A second grader has no diagnosis of any kind. He is two years behind in reading, has had targeted intervention for a year, and is making little progress.',
      answer: 'q_cat',
      why: 'No diagnosis is required to be eligible. The open question is which educational category the team\'s own evaluation supports — and a district may not delay or deny an evaluation because intervention is under way. The absence of a doctor\'s letter is not the obstacle people assume.'
    },
    {
      id: 's3',
      text: 'A family brings a private neuropsychological report recommending specific services. The district\'s own evaluation reached different conclusions.',
      answer: 'q_data',
      why: 'A private evaluation must be considered; it does not bind the team, and neither does the district\'s report end the conversation. What is owed here is reconciliation of the evidence: where the two disagree, why, and what additional information would settle it. Parents who disagree with the district evaluation may also request an independent one.'
    },
    {
      id: 's4',
      text: 'A ninth grader with an autism diagnosis is passing every class but has not spoken to a peer all year and eats lunch alone in the library.',
      answer: 'q_need',
      why: 'Passing grades do not close the second prong. "Educational performance" is broader than the report card, and needs in the social and communication domain can require specially designed instruction. This is the mirror image of the first scenario, which is exactly why the question has to be asked rather than inferred from grades.'
    }
  ];

  function srLive(msg) {
    try { var el = document.getElementById('allo-live-elig'); if (el) { el.textContent = ''; el.textContent = msg; } } catch (_) {}
  }
  (function() {
    if (typeof document === 'undefined' || document.getElementById('allo-live-elig')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-elig';
    lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  window.StemLab.registerTool('diagnosisEligibility', {
    icon: '🧩',
    label: 'Diagnosis vs. Eligibility',
    desc: 'Why a diagnosis does not equal an IEP — and why a child can qualify with no diagnosis at all. The two-prong federal test, the 13 eligibility categories quoted verbatim from 34 CFR 300.8, worked cases, and what a private evaluation can and cannot do. Never decides eligibility: that is the team\'s job.',
    color: 'violet',
    category: 'applied',
    questHooks: [
      { id: 'de_read', label: 'Read all five framing cards', icon: '📖', check: function(d) { return d && d.read && Object.keys(d.read).length >= 5; }, progress: function(d) { return ((d && d.read && Object.keys(d.read).length) || 0) + '/5'; } },
      { id: 'de_cases', label: 'Work through 3 case scenarios', icon: '🧩', check: function(d) { return d && d.done && Object.keys(d.done).length >= 3; }, progress: function(d) { return ((d && d.done && Object.keys(d.done).length) || 0) + '/3'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React, h = React.createElement;
      var setStemLabTool = ctx.setStemLabTool;
      var announceToSR = (typeof ctx.announceToSR === 'function') ? ctx.announceToSR : srLive;
      var isDark = !!ctx.isDark || !!ctx.isContrast;
      var setLabToolData = ctx.setToolData;
      var d = (ctx.toolData && ctx.toolData.diagnosisEligibility) || {};

      var tick = React.useState(0);
      var setTick = tick[1];
      React.useEffect(function() {
        if (_idea) return;
        var cancelled = false;
        loadIdea().then(function() { if (!cancelled) setTick(function(n) { return n + 1; }); })
          .catch(function() { if (!cancelled) setTick(function(n) { return n + 1; }); });
        return function() { cancelled = true; };
      }, []);

      function setDE(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.diagnosisEligibility) || {};
          return Object.assign({}, prev, { diagnosisEligibility: Object.assign({}, prior, patch) });
        });
      }
      var pal = isDark
        ? { text: '#ede9fe', muted: '#a5b4fc', panel: 'rgba(15,23,42,0.65)', card: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.30)', accent: '#c4b5fd', btn: '#6d28d9' }
        : { text: '#1e293b', muted: '#475569', panel: '#ffffff', card: 'rgba(139,92,246,0.06)', border: 'rgba(139,92,246,0.25)', accent: '#6d28d9', btn: '#6d28d9' };

      var read = d.read || {}, done = d.done || {}, cur = d.cur || 0;
      var backBtn = h('button', {
        onClick: function() { if (typeof setStemLabTool === 'function') setStemLabTool(null); },
        className: 'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold border',
        style: { background: pal.panel, borderColor: pal.border, color: pal.text },
        'aria-label': __alloT('stem.elig.back', 'Back to STEM Lab tools')
      }, '← ' + __alloT('stem.elig.tools', 'Tools'));

      var cats = categoriesFromCorpus();
      var sc = SCENARIOS[cur];
      var scDone = sc && done[sc.id];

      return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
        h('div', { className: 'flex items-center gap-3 flex-wrap mb-2' }, backBtn,
          h('h2', { className: 'text-xl font-black' }, '🧩 ' + __alloT('stem.elig.title', 'Diagnosis vs. Eligibility'))),
        h('p', { className: 'text-sm mb-3', style: { color: pal.muted } },
          __alloT('stem.elig.intro', 'A diagnosis and an IEP answer different questions. This explains how, quotes the federal categories in full, and never decides eligibility — that belongs to the team, with the family in the room.')),

        // Framing cards
        h('div', { className: 'space-y-2 mb-5' },
          FRAMING.map(function(c) {
            var open = !!read[c.id];
            return h('details', {
              key: c.id, open: open || undefined,
              className: 'rounded-2xl overflow-hidden', style: { background: pal.panel, border: '1px solid ' + pal.border },
              onToggle: function(e) {
                if (!e.target.open || read[c.id]) return;
                var next = Object.assign({}, read); next[c.id] = true; setDE({ read: next });
              }
            },
              h('summary', { className: 'cursor-pointer px-4 py-3 font-bold text-sm', style: { color: pal.text } }, (open ? '✓ ' : '') + c.title),
              h('div', { className: 'px-4 pb-4' }, h('p', { className: 'text-sm leading-relaxed' }, c.body))
            );
          })
        ),

        // The 13 categories, quoted from the corpus
        h('div', { className: 'rounded-2xl p-4 mb-5', style: { background: pal.card, border: '1px solid ' + pal.border } },
          h('h3', { className: 'text-sm font-black mb-1' }, '📜 ' + __alloT('stem.elig.cats', 'The eligibility categories, in the law\'s own words')),
          !_idea ? h('p', { className: 'text-xs', style: { color: pal.muted } },
            _ideaErr
              ? __alloT('stem.elig.cats_err', 'The official text could not be loaded, so no categories are shown. This tool quotes 34 CFR 300.8 rather than restating it from memory.')
              : __alloT('stem.elig.cats_loading', 'Loading the official text…'))
          : h('div', null,
            h('p', { className: 'text-[11px] mb-2', style: { color: pal.muted } },
              __alloT('stem.elig.cats_src', 'Quoted verbatim from') + ' 34 CFR § 300.8 — ' + (_idea.currentAsOf ? __alloT('stem.elig.current', 'current as of') + ' ' + _idea.currentAsOf : '') ),
            h('div', { className: 'flex flex-col gap-1.5' },
              cats.map(function(c) {
                var open = d.openCat === c.n;
                return h('div', { key: c.n },
                  h('button', {
                    onClick: function() { setDE({ openCat: open ? null : c.n }); },
                    'aria-expanded': open,
                    className: 'w-full text-left rounded-lg px-3 py-1.5 text-xs font-bold border',
                    style: open ? { background: pal.btn, color: '#fff', borderColor: pal.btn } : { background: pal.panel, color: pal.text, borderColor: pal.border }
                  }, c.name),
                  open ? h('p', { className: 'text-[12px] leading-relaxed px-3 py-2', style: { color: pal.text } }, c.text) : null
                );
              })
            ),
            h('p', { className: 'text-[11px] mt-2', style: { color: pal.muted } },
              __alloT('stem.elig.cats_note', 'These are EDUCATIONAL definitions applied by a team — not clinical criteria, and not the same words a clinician uses.'))
          )
        ),

        // Scenarios — which question does the team still owe?
        h('div', { className: 'rounded-2xl p-4', style: { background: pal.card, border: '2px solid ' + pal.border } },
          h('div', { className: 'flex items-center justify-between gap-2 flex-wrap mb-1' },
            h('h3', { className: 'text-sm font-black' }, '🧩 ' + __alloT('stem.elig.cases', 'Which question does the team still owe?')),
            h('span', { className: 'text-[11px] font-bold', style: { color: pal.muted } }, (cur + 1) + ' / ' + SCENARIOS.length)),
          h('p', { className: 'text-xs mb-3', style: { color: pal.muted } },
            __alloT('stem.elig.cases_sub', 'None of these has an "eligible" or "not eligible" answer — that is a team decision about a real child. The skill is naming the question that is actually open.')),
          sc ? h('div', { className: 'rounded-xl p-3 mb-3 text-sm leading-relaxed', style: { background: pal.panel, border: '1px solid ' + pal.border } }, sc.text) : null,
          sc ? h('div', { className: 'flex flex-wrap gap-2 mb-3', role: 'group', 'aria-label': __alloT('stem.elig.pick', 'Choose the open question') },
            QUESTIONS.map(function(q) {
              var picked = scDone && scDone.pick === q.id;
              var isAns = sc.answer === q.id;
              var style = scDone
                ? (isAns ? { background: 'rgba(5,150,105,0.15)', borderColor: 'rgba(5,150,105,0.55)', color: pal.text }
                  : (picked ? { background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.5)', color: pal.text } : { background: pal.panel, borderColor: pal.border, color: pal.muted }))
                : { background: pal.panel, borderColor: pal.border, color: pal.text };
              return h('button', {
                key: q.id, disabled: !!scDone,
                onClick: function() {
                  if (scDone) return;
                  var next = Object.assign({}, done); next[sc.id] = { pick: q.id, correct: isAns };
                  setDE({ done: next });
                  if (isAns && ctx.awardXP) ctx.awardXP('diagnosisEligibility', 5, 'Case worked');
                  announceToSR(__alloT('stem.elig.revealed', 'Explanation shown below.'));
                },
                className: 'rounded-lg px-3 py-1.5 text-xs font-bold border-2 disabled:cursor-default',
                style: style
              }, (scDone && isAns ? '✓ ' : '') + q.label);
            })
          ) : null,
          sc && scDone ? h('div', null,
            h('div', { className: 'rounded-xl p-3 text-xs leading-relaxed mb-3', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, sc.why),
            cur < SCENARIOS.length - 1
              ? h('button', { onClick: function() { setDE({ cur: cur + 1 }); }, className: 'rounded-lg px-4 py-2 text-xs font-black text-white', style: { background: pal.btn } }, __alloT('stem.elig.next', 'Next case →'))
              : h('p', { className: 'text-xs font-bold', style: { color: pal.accent } }, __alloT('stem.elig.done', 'All cases worked. Every one turned on a question, not a label — which is the whole point.'))
          ) : null
        ),

        h('p', { className: 'text-[11px] mt-3 leading-snug', style: { color: pal.muted } },
          __alloT('stem.elig.disclaimer', 'Educational information, not legal or clinical advice. Eligibility is determined by a team, and state and district procedures vary. To read the underlying rules yourself, open the Education Law Navigator; for the rights that attach to this process, see the Science of Parenting Lab.'))
      );
    }
  });

})();

}
