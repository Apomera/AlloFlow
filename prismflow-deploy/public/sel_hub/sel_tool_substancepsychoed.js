// ═══════════════════════════════════════════════════════════════
// sel_tool_substancepsychoed.js — Substance Use Psychoeducation
// A harm-reduction-framed psychoeducation tool for adolescents.
// Honest about substances (alcohol, cannabis, nicotine, pills,
// stimulants, opioids), adolescent brain risks, when use becomes
// a problem, harm-reduction strategies for those who are using,
// help for those who want to change.
//
// EXPLICITLY NOT abstinence-only. Evidence is clear: abstinence-
// only messaging fails. Harm reduction + honest information +
// motivational interviewing get better outcomes.
//
// NOT a screener. NOT diagnostic. Strong SAMHSA and harm-reduction
// org referral framing.
//
// Sources: SAMHSA, NIDA, AAP, Drug Policy Alliance, National
// Harm Reduction Coalition, Above the Influence (with critique),
// Casey, Tapert et al. (adolescent brain research).
//
// Registered tool ID: "substancePsychoed"
// Category: self-regulation
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('substancePsychoed'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-substance')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-substance';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Per-substance information
  var SUBSTANCES = [
    { id: 'alcohol', label: 'Alcohol', icon: '🍺', color: '#f59e0b',
      what: 'A depressant (slows the brain). Legal at 21 in the US. The most-used and most-harmful substance for adolescents in measurable terms (deaths, hospitalizations, life disruption).',
      adolescentRisk: 'Adolescent brains are still developing connections in the prefrontal cortex through about age 25. Heavy or regular use during these years has lasting effects on memory, decision-making, and emotional regulation that do NOT show up in adult-onset users. The earlier and heavier the use, the more dramatic.',
      acuteRisks: ['Alcohol poisoning (drinking too much too fast can stop breathing — call 911)', 'Blacking out (no memory but still moving and acting)', 'Sexual assault is dramatically more common when alcohol is involved (for victims AND perpetrators)', 'Drunk driving is the leading cause of teen death', 'Mixing with other substances (especially opioids and benzos) is extremely dangerous', 'Drink spiking is a real risk in social drinking situations'],
      harmReduction: ['If you drink, eat first', 'Drink water between drinks', 'Stay with people you trust', 'Pour your own drinks, do not accept open ones from strangers', 'Watch your drink', 'Set a number BEFORE you start, not during', 'Never drive, never get in a car with someone drunk — use Uber/Lyft/parents (no consequences agreement)', 'Know the signs of alcohol poisoning: unresponsive, slow breathing, blue lips, vomiting while passed out — CALL 911 even if you\'re scared of getting in trouble'] },

    { id: 'cannabis', label: 'Cannabis (weed/THC)', icon: '🌿', color: '#22c55e',
      what: 'Plant containing THC (psychoactive) and CBD (non-psychoactive). Legal status varies by state. Modern cannabis is dramatically more potent than what existed even 10-15 years ago — concentrates can be 80%+ THC.',
      adolescentRisk: 'Same developing-brain concern as alcohol. The research is clearest about heavy and early use: adolescent-onset heavy cannabis use is associated with increased risk of psychosis (especially with family history), lower educational attainment, and persistent memory effects. Edibles, vapes, and concentrates carry much higher dose than flower; dose matters more than people often realize.',
      acuteRisks: ['"Greening out" — too much THC: nausea, severe anxiety / panic, paranoia, vomiting. Usually resolves in hours but feels terrifying', 'Edibles take 60-120 minutes to kick in — people often eat more thinking it isn\'t working, then get overwhelmed', 'Driving impairment is real, similar to alcohol', 'Synthetic cannabinoids (K2/Spice) are NOT cannabis and are much more dangerous'],
      harmReduction: ['Start LOW and go SLOW, especially with edibles', 'Buy from regulated sources where possible (testing matters)', 'Know your tolerance and don\'t share with people who don\'t know theirs', 'For greening out: hydrate, eat sugar, lie down, breathe, it will pass (CBD oil can help)', 'If you have a personal or family history of psychosis, schizophrenia, or bipolar — daily use is meaningfully riskier for you', 'Vaping carries lung risks; flower or edibles are lower-risk delivery methods'] },

    { id: 'nicotine', label: 'Nicotine (vapes, cigarettes)', icon: '💨', color: '#94a3b8',
      what: 'A stimulant. Highly addictive. Modern vape products deliver more nicotine than cigarettes ever did, often without users realizing.',
      adolescentRisk: 'Adolescent brains form nicotine dependence faster and more durably than adult brains. The same exposure that takes an adult to addiction in months takes a teen weeks. Nicotine addiction is harder to break in adolescent-onset users decades later.',
      acuteRisks: ['Vape liquid is sweet-tasting and toxic to young children and pets if swallowed', 'EVALI (vaping-related lung injury) is a real phenomenon, especially with off-brand and THC-vape cartridges', 'Vape devices can deliver enormous amounts of nicotine per puff', 'Nicotine withdrawal is uncomfortable: irritability, anxiety, headaches, cravings'],
      harmReduction: ['If you\'re trying to quit: nicotine replacement (gum, patches) works. So does counseling. Many vapers underestimate how hard quitting will be', 'Cold turkey is hardest; gradual reduction works better for most', 'For under-21: free help at 1-800-QUIT-NOW or smokefree.gov/quit-smoking. No judgment, no consequences', 'Texting "QUIT" to 47848 (Smokefree TXT for teens) is free'] },

    { id: 'opioids', label: 'Opioids (pills, fentanyl)', icon: '💊', color: '#dc2626',
      what: 'Painkillers (Vicodin, Percocet, OxyContin) and synthetic opioids (fentanyl, heroin). EXTREMELY dangerous. Fentanyl is now contaminating the entire street drug supply, including pills sold as Xanax, Adderall, and Percocet — many adolescent overdose deaths are from pills the user did not know contained fentanyl.',
      adolescentRisk: 'Adolescent opioid use has lasting effects on the brain\'s reward system. Adolescent-onset opioid use predicts adult addiction at very high rates. Even a single unknowing exposure to fentanyl can be fatal.',
      acuteRisks: ['OVERDOSE — slowed breathing, blue lips, unresponsive. Call 911. Use naloxone (Narcan) if available — most states allow over-the-counter access', 'Fentanyl contamination is widespread. ANY pill not from a pharmacy could contain fentanyl', 'Mixing with alcohol or benzos dramatically increases OD risk', 'Withdrawal is brutal'],
      harmReduction: ['Carry naloxone (Narcan). Most US states allow OTC purchase. Free or low-cost from many community organizations and pharmacies. It reverses opioid overdose in minutes', 'Never use alone — fentanyl OD requires immediate help', 'Fentanyl test strips are legal in many states and detect fentanyl in seconds', 'If you or someone is unresponsive: call 911, give naloxone, give breaths, stay with them. Good Samaritan laws in most states protect you from drug-related charges when calling for help', 'If you are using regularly, treatment WORKS. Buprenorphine and methadone have decades of evidence. You do not have to "hit rock bottom" first.'] },

    { id: 'stimulants', label: 'Stimulants (Adderall, cocaine)', icon: '⚡', color: '#a855f7',
      what: 'Drugs that speed up the central nervous system. Prescribed (Adderall, Ritalin) for ADHD; non-prescribed use (cocaine, meth, "study drugs") is common in adolescents.',
      adolescentRisk: 'Non-prescribed stimulant use in adolescents is associated with cardiac risks (irregular heartbeat, blood pressure), sleep disruption (which compounds other risks), and dependence. "Study drug" use has limited actual academic benefit and clear risks. Cocaine and methamphetamine are highly addictive and dramatically more dangerous than prescribed stimulants.',
      acuteRisks: ['Stimulant overdose: chest pain, severe anxiety, seizures, stroke — CALL 911', 'Many counterfeit "Adderall" pills now contain methamphetamine or fentanyl', 'Sleep deprivation compounds other risks', 'Cardiac risks are real even at normal doses for some people'],
      harmReduction: ['If you have a prescription, follow it. Do not share. Do not crush or snort (changes absorption)', 'Never combine with other stimulants (energy drinks, caffeine in excess, cocaine, meth)', 'Sleep, eat, hydrate. The cardiac risks scale with not doing these', 'Counterfeit Adderall is a major problem — pharmacy-purchased only', 'If you\'re using to study: address what\'s actually blocking studying (sleep, focus issues, motivation). The Anxiety Toolkit, Sleep & Rest, and ExecFunction tools may help'] },

    { id: 'benzos', label: 'Benzodiazepines (Xanax, etc.)', icon: '💊', color: '#0ea5e9',
      what: 'Prescription anti-anxiety medications (Xanax, Valium, Klonopin, Ativan). Highly addictive. Withdrawal can be life-threatening.',
      adolescentRisk: 'Benzo addiction develops fast. Mixing with alcohol or opioids is one of the leading causes of overdose death. Many counterfeit Xanax pills contain fentanyl.',
      acuteRisks: ['Overdose risk is highest when mixed with alcohol or opioids', 'Benzo withdrawal CAN BE FATAL — never quit cold turkey if you\'re physically dependent. Medical taper required', 'Counterfeit pills are rampant — many adolescent ODs are from "Xanax" that was actually fentanyl'],
      harmReduction: ['If you have a prescription: follow it. Do not share', 'Never mix with alcohol or opioids', 'If you\'re using non-prescription: be very aware that counterfeit pills are common. Get pharmacy-only', 'If you\'re dependent and want to stop: TALK TO A DOCTOR FIRST. Medical taper is required.'] },

    { id: 'hallucinogens', label: 'Hallucinogens / psychedelics', icon: '🌀', color: '#ec4899',
      what: 'LSD, psilocybin, MDMA, ketamine, DMT. Some are gaining clinical research interest for trauma and depression treatment in adults; non-clinical adolescent use is a different thing.',
      adolescentRisk: 'Research on adolescent psychedelic use is thin (because of legal status). What is known: for adolescents with personal or family history of psychosis, schizophrenia, or bipolar, psychedelic use can trigger persistent symptoms. "Set and setting" (your mental state and physical environment) dramatically affect the experience.',
      acuteRisks: ['Bad trips: terror, panic, paranoia, dissociation. Can last hours.', 'HPPD (Hallucinogen Persisting Perception Disorder) — visual disturbances that can persist long after use', 'MDMA causes overheating, dehydration, and electrolyte imbalances — deaths often happen at music festivals from these', 'Mixing with other substances is unpredictable and dangerous'],
      harmReduction: ['If you\'re going to use, "set and setting" matter enormously: stable mental state, safe environment, trusted sober person present', 'Start with low doses', 'Drug-checking kits (reagent tests) exist for verifying what you have', 'Avoid if you have personal or family history of psychosis spectrum', 'Never combine with other substances'] }
  ];

  function defaultState() {
    return {
      view: 'home',
      // MI-aligned reflection
      myRelationship: '',
      importance: 5,
      confidence: 5,
      readiness: 5,
      whyChange: '',
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  window.SelHub.registerTool('substancePsychoed', {
    icon: '⚗️',
    label: 'Substance Use',
    desc: 'Harm-reduction psychoeducation about substances. Honest information about alcohol, cannabis, nicotine, opioids, stimulants, benzos, hallucinogens. Adolescent brain risk facts. Harm-reduction strategies. NOT abstinence-only. NOT a screener. Strong SAMHSA and Naloxone referrals. Includes MI-aligned reflection space.',
    color: 'slate',
    category: 'self-regulation',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;

      var d = labToolData.substancePsychoed || defaultState();
      function setSU(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.substancePsychoed) || defaultState();
          var next = Object.assign({}, prior, patch);
          next.lastUpdated = todayISO();
          return Object.assign({}, prev, { substancePsychoed: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setSU({ view: v }); }

      function header() {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#cbd5e1', fontSize: 22, fontWeight: 900 } }, '⚗️ Substance Use'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Harm-reduction psychoeducation. Honest, not preachy.')
          )
        );
      }

      function printNow() { try { window.print(); } catch (e) {} }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Framework', icon: '⚗️' },
          { id: 'brain', label: 'Adolescent brain', icon: '🧠' },
          { id: 'substances', label: 'By substance', icon: '📚' },
          { id: 'problem', label: 'When use is a problem', icon: '⚠️' },
          { id: 'reflect', label: 'My reflection', icon: '🪞' },
          { id: 'help', label: 'Getting help', icon: '🆘' },
          { id: 'print', label: 'Handout', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { role: 'tablist', 'aria-label': 'Substance Use sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#64748b' : '#334155'),
                background: active ? 'rgba(100,116,139,0.30)' : '#1e293b',
                color: active ? '#e2e8f0' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function safetyBanner() {
        return h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.4)', borderRight: '1px solid rgba(239,68,68,0.4)', borderBottom: '1px solid rgba(239,68,68,0.4)', borderLeft: '3px solid #ef4444', marginBottom: 12, fontSize: 12.5, color: '#fecaca', lineHeight: 1.65 } },
          h('strong', null, '🆘 Overdose? Stop and read: '),
          'unresponsive, slow breathing, blue lips, vomiting while passed out — CALL 911. Give naloxone (Narcan) if available. Most states have Good Samaritan laws that protect callers from drug charges. ',
          h('a', { href: 'https://findtreatment.gov/', target: '_blank', rel: 'noopener noreferrer',
            style: { color: '#fca5a5', textDecoration: 'underline', fontWeight: 800 } }, 'SAMHSA findtreatment.gov ↗'),
          ' · 1-800-662-HELP (4357) — free, confidential, 24/7 treatment referral.'
        );
      }

      function softPointer() {
        return h('div', {
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'This tool is education. It is not therapy and not a screener. Crisis Text Line: text HOME to 741741. For substance use specifically: SAMHSA 1-800-662-HELP.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — framework
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(100,116,139,0.20) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(100,116,139,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#e2e8f0', marginBottom: 4 } }, 'Honest information, not scare tactics.'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'Decades of evaluation research are clear: "Just Say No" and DARE-style abstinence-only programs do not work, and sometimes make things worse. Adolescents are sophisticated consumers of information; when you exaggerate the risks of one substance, they (correctly) discount everything you say about all substances.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'This tool is built differently. The frame: HONEST information about what substances are and what they do, ADOLESCENT-SPECIFIC information about brain development risks, HARM-REDUCTION strategies for people who are using or might, and CLEAR ROUTES to help when use becomes a problem. Your decisions are yours.'
            )
          ),

          // The frame
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #64748b', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#e2e8f0', marginBottom: 10 } }, '🔍 What this tool offers (and does not)'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)' } },
                h('div', { style: { fontSize: 11, color: '#bbf7d0', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '✓ Offers'),
                h('ul', { style: { margin: 0, padding: '0 0 0 18px', color: '#dcfce7', fontSize: 12, lineHeight: 1.65 } },
                  h('li', null, 'Honest facts about substances'),
                  h('li', null, 'Adolescent brain research'),
                  h('li', null, 'Harm reduction strategies'),
                  h('li', null, 'Signs that use is a problem'),
                  h('li', null, 'Routes to help'),
                  h('li', null, 'Naloxone, drug-checking, safer-use information')
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)' } },
                h('div', { style: { fontSize: 11, color: '#fecaca', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '✕ Does NOT'),
                h('ul', { style: { margin: 0, padding: '0 0 0 18px', color: '#fee2e2', fontSize: 12, lineHeight: 1.65 } },
                  h('li', null, 'Screen for substance use disorder'),
                  h('li', null, 'Tell you whether to use'),
                  h('li', null, 'Replace therapy or treatment'),
                  h('li', null, 'Cover every substance in detail'),
                  h('li', null, 'Promote use'),
                  h('li', null, 'Pretend that "safe" use exists for all substances at all doses')
                )
              )
            )
          ),

          // Roadmap
          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 } }, 'Sections'),
          stepCard('🧠 The adolescent brain', 'Why adolescent substance use is different from adult use. The 25-year prefrontal cortex development story.', function() { goto('brain'); }, '#a855f7'),
          stepCard('📚 By substance', 'Honest information per substance: what it is, adolescent-specific risk, acute risks, harm reduction.', function() { goto('substances'); }, '#f59e0b'),
          stepCard('⚠️ When use becomes a problem', 'The line between use and substance use disorder. CRAFFT and the warning signs.', function() { goto('problem'); }, '#ef4444'),
          stepCard('🪞 My reflection (MI-style)', 'A private space to think about your own relationship with substances, MI-aligned: importance / confidence / readiness rulers.', function() { goto('reflect'); }, '#0ea5e9'),
          stepCard('🆘 Getting help', 'Specific help routes: SAMHSA hotline, treatment finder, harm-reduction orgs, Naloxone, telehealth.', function() { goto('help'); }, '#22c55e'),

          softPointer()
        );
      }

      function stepCard(title, blurb, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: '#0f172a', cursor: 'pointer', marginBottom: 8, color: '#e2e8f0' } },
          h('div', { style: { fontSize: 14, fontWeight: 800, color: color, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // BRAIN
      // ═══════════════════════════════════════════════════════════
      function renderBrain() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.3)', borderRight: '1px solid rgba(168,85,247,0.3)', borderBottom: '1px solid rgba(168,85,247,0.3)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.7 } },
            h('strong', null, '🧠 The adolescent brain is still under construction until about age 25. '),
            'This is not a metaphor; it is measurable. The prefrontal cortex (decision-making, impulse control, evaluating long-term consequences) is the LAST region to develop. Adolescent substance use happens to a brain that is still forming its core architecture, and the substances can shape that architecture in lasting ways.'
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 10 } }, 'What the adolescent-brain research has found'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', null, 'Faster addiction. '), 'Adolescent brains form dependence faster than adult brains for nicotine, opioids, and other substances. Same exposure, faster transition to dependence.'),
              h('li', null, h('strong', null, 'Lasting effects on impulse control. '), 'Heavy adolescent use (especially alcohol and cannabis) shapes how the prefrontal cortex develops. Effects can persist into adulthood.'),
              h('li', null, h('strong', null, 'Memory and learning. '), 'Adolescent heavy users show measurable deficits in working memory and learning years later, compared to non-users — even controlling for other factors.'),
              h('li', null, h('strong', null, 'Mental health interactions. '), 'Substances and adolescent mental health are deeply interlocked. Cannabis use can precipitate or worsen psychosis in vulnerable adolescents. Alcohol and stimulant use can worsen anxiety and depression in non-linear ways.'),
              h('li', null, h('strong', null, 'The dose-response curve. '), 'Trying a substance once at age 17 is different from heavy daily use through high school. The body of research is clearest about heavy and early use.')
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 10, fontSize: 13, color: '#fde68a', lineHeight: 1.7 } },
            h('strong', null, '⚖️ Honest about the research limits: '),
            'These are population-level findings. They do not predict individual outcomes perfectly. Many adolescents have used substances and are doing fine. AND: the population effects are real, the risks are real, and the brain biology matters. Both can be true.'
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7' } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 10 } }, '🎯 Why people use substances (the honest part)'),
            h('p', { style: { margin: '0 0 8px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } },
              'People use substances for reasons. The reasons are not stupid or bad. Recognizing them is more useful than pretending they don\'t exist:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, 'To feel different (less anxious, less depressed, less in pain, more focused, more confident)'),
              h('li', null, 'To connect socially'),
              h('li', null, 'For fun, novelty, pleasure'),
              h('li', null, 'To cope with trauma'),
              h('li', null, 'To self-medicate untreated ADHD, anxiety, depression'),
              h('li', null, 'Because everyone around them is')
            ),
            h('p', { style: { margin: '8px 0 0', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' } },
              'The harm-reduction insight: if a substance is meeting a real need (anxiety relief, social connection), abstinence campaigns ignore the need. Better questions: WHAT is the need? Can it be met another way? Can the use be safer?'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // SUBSTANCES — by substance information
      // ═══════════════════════════════════════════════════════════
      function renderSubstances() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '📚 7 substances, honest information. '),
            'Per substance: what it is, adolescent-specific brain risk, the acute risks (the things that can kill you fast), and harm reduction (if you or someone you know is using). NOT a recommendation to use any of these.'
          ),

          SUBSTANCES.map(function(s) {
            return h('div', { key: s.id, style: { padding: 16, borderRadius: 12, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '4px solid ' + s.color, marginBottom: 12 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                h('span', { style: { fontSize: 26 } }, s.icon),
                h('span', { style: { fontSize: 16, fontWeight: 800, color: s.color } }, s.label)
              ),

              h('div', { style: { padding: 10, borderRadius: 6, background: '#1e293b', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What it is'),
                h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } }, s.what)
              ),

              h('div', { style: { padding: 10, borderRadius: 6, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, color: '#c4b5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '🧠 Adolescent-specific risk'),
                h('p', { style: { margin: 0, color: '#e9d5ff', fontSize: 13, lineHeight: 1.7 } }, s.adolescentRisk)
              ),

              h('div', { style: { padding: 10, borderRadius: 6, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, '⚠️ Acute risks (the kill-fast ones)'),
                h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fee2e2', fontSize: 12.5, lineHeight: 1.7 } },
                  s.acuteRisks.map(function(r, i) { return h('li', { key: i, style: { marginBottom: 2 } }, r); })
                )
              ),

              h('div', { style: { padding: 10, borderRadius: 6, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)' } },
                h('div', { style: { fontSize: 11, color: '#bbf7d0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, '🛟 Harm reduction (if used)'),
                h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#dcfce7', fontSize: 12.5, lineHeight: 1.7 } },
                  s.harmReduction.map(function(r, i) { return h('li', { key: i, style: { marginBottom: 2 } }, r); })
                )
              )
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PROBLEM — when use becomes substance use disorder
      // ═══════════════════════════════════════════════════════════
      function renderProblem() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.4)', borderRight: '1px solid rgba(239,68,68,0.4)', borderBottom: '1px solid rgba(239,68,68,0.4)', borderLeft: '3px solid #ef4444', marginBottom: 14, fontSize: 13, color: '#fecaca', lineHeight: 1.7 } },
            h('strong', null, '⚠️ Not all use is a problem. '),
            'But some use is a real problem. Substance use disorder (SUD) is a clinical diagnosis with criteria. This section is psychoeducation, not a self-diagnosis tool. If any of this applies to you, please talk to a counselor or doctor.'
          ),

          // The criteria
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fca5a5', marginBottom: 10 } }, '🚩 Signs use has become a problem'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, fontStyle: 'italic' } }, 'These are simplified from the DSM-5 substance use disorder criteria:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', null, 'Using more than intended. '), 'You meant to have one drink and had six. You meant to vape once and now you can\'t go a class period.'),
              h('li', null, h('strong', null, 'Trying to cut down and failing. '), 'You\'ve told yourself you\'ll stop or cut down, and it keeps not happening.'),
              h('li', null, h('strong', null, 'Spending a lot of time using or recovering. '), 'It takes up real chunks of your day or weekend.'),
              h('li', null, h('strong', null, 'Cravings. '), 'You think about using when you\'re not using.'),
              h('li', null, h('strong', null, 'Use is messing with school, work, or relationships. '), 'Grades dropping, fights with family, friends pulling away.'),
              h('li', null, h('strong', null, 'You keep using even though it\'s causing real problems. '), 'You can see it\'s hurting things you care about and you keep doing it anyway.'),
              h('li', null, h('strong', null, 'You\'ve given up activities for it. '), 'Sports, hobbies, friend groups you used to care about have fallen away.'),
              h('li', null, h('strong', null, 'You use in risky situations. '), 'Driving, before school, in places where you shouldn\'t.'),
              h('li', null, h('strong', null, 'You use even though it\'s causing physical or mental health problems. '), 'Liver damage, breathing problems, panic attacks, depression made worse.'),
              h('li', null, h('strong', null, 'Tolerance. '), 'You need more to get the same effect.'),
              h('li', null, h('strong', null, 'Withdrawal. '), 'When you stop or cut back, you feel physically or mentally bad — and using fixes it.')
            ),
            h('p', { style: { margin: '8px 0 0', color: '#fde68a', fontSize: 13, lineHeight: 1.7 } },
              h('strong', null, 'Clinical thresholds (per DSM-5): '),
              '2-3 of these = mild SUD, 4-5 = moderate, 6+ = severe. You do not have to meet a threshold to want help; you can want help anytime.'
            )
          ),

          // CRAFFT
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7dd3fc', marginBottom: 10 } }, '🔍 CRAFFT screening (used by doctors)'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'CRAFFT is the screening tool most US adolescent doctors use. The 6 questions, simplified:'),
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              h('li', null, h('strong', null, 'C'), ' — Have you ridden in a Car with a driver who was drunk or high?'),
              h('li', null, h('strong', null, 'R'), ' — Do you use substances to Relax, fit in, or feel better?'),
              h('li', null, h('strong', null, 'A'), ' — Do you use Alone?'),
              h('li', null, h('strong', null, 'F'), ' — Do you Forget what you did while using?'),
              h('li', null, h('strong', null, 'F'), ' — Do Family or Friends say you should cut down?'),
              h('li', null, h('strong', null, 'T'), ' — Have you gotten in Trouble while using?')
            ),
            h('p', { style: { margin: '8px 0 0', color: '#bae6fd', fontSize: 13, lineHeight: 1.7 } },
              'Two or more yeses on CRAFFT is the threshold doctors use to recommend further conversation. Not a diagnosis; a conversation starter.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // REFLECT — MI-aligned rulers
      // ═══════════════════════════════════════════════════════════
      function renderReflect() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 14, fontSize: 13, color: '#bae6fd', lineHeight: 1.7 } },
            h('strong', null, '🪞 Private space to think. '),
            'No one sees this. The frame is Motivational Interviewing: importance / confidence / readiness rulers. If you are considering changing something about your use, this is a space to think clearly. The MI tool in this SEL Hub has the full framework.'
          ),

          // What relationship
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('label', { htmlFor: 'su-rel', style: { display: 'block', fontSize: 12, color: '#7dd3fc', fontWeight: 800, marginBottom: 6 } }, 'My relationship with [substance] right now'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'Just describe what is actually going on. No judgment, no future tense. What is your current relationship with whatever you\'re thinking about?'),
            h('textarea', { id: 'su-rel', value: d.myRelationship || '',
              placeholder: 'Right now I...',
              onChange: function(e) { setSU({ myRelationship: e.target.value }); },
              style: { width: '100%', minHeight: 100, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.75, resize: 'vertical' } })
          ),

          // Three MI rulers
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#fde68a', fontWeight: 800, marginBottom: 8 } }, '⭐ Importance (0-10): how important is it to you to change something about your use?'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('input', { type: 'range', min: 0, max: 10, value: d.importance,
                onChange: function(e) { setSU({ importance: parseInt(e.target.value, 10) }); },
                style: { flex: 1 }, 'aria-label': 'Importance' }),
              h('span', { style: { fontSize: 16, fontWeight: 800, color: '#fde68a', minWidth: 50, textAlign: 'right' } }, d.importance + ' / 10')
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#bbf7d0', fontWeight: 800, marginBottom: 8 } }, '💪 Confidence (0-10): if you decided to change, how confident are you that you could?'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('input', { type: 'range', min: 0, max: 10, value: d.confidence,
                onChange: function(e) { setSU({ confidence: parseInt(e.target.value, 10) }); },
                style: { flex: 1 }, 'aria-label': 'Confidence' }),
              h('span', { style: { fontSize: 16, fontWeight: 800, color: '#bbf7d0', minWidth: 50, textAlign: 'right' } }, d.confidence + ' / 10')
            )
          ),

          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #a855f7', marginBottom: 10 } },
            h('div', { style: { fontSize: 12, color: '#e9d5ff', fontWeight: 800, marginBottom: 8 } }, '🚪 Readiness (0-10): how ready are you to actually try changing?'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('input', { type: 'range', min: 0, max: 10, value: d.readiness,
                onChange: function(e) { setSU({ readiness: parseInt(e.target.value, 10) }); },
                style: { flex: 1 }, 'aria-label': 'Readiness' }),
              h('span', { style: { fontSize: 16, fontWeight: 800, color: '#e9d5ff', minWidth: 50, textAlign: 'right' } }, d.readiness + ' / 10')
            )
          ),

          // The MI move
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.10)', borderTop: '1px solid rgba(14,165,233,0.3)', borderRight: '1px solid rgba(14,165,233,0.3)', borderBottom: '1px solid rgba(14,165,233,0.3)', borderLeft: '3px solid #0ea5e9', marginBottom: 10 } },
            h('label', { htmlFor: 'su-why', style: { display: 'block', fontSize: 12, color: '#bae6fd', fontWeight: 800, marginBottom: 6 } }, 'Why a ' + d.importance + ' on importance and not a ' + Math.max(0, d.importance - 2) + '?'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic', lineHeight: 1.5 } }, 'The MI move: what is keeping importance at ' + d.importance + ' instead of lower? This surfaces the reasons FOR change. Those are the reasons that build motivation.'),
            h('textarea', { id: 'su-why', value: d.whyChange || '',
              placeholder: 'It\'s a ' + d.importance + ' and not a ' + Math.max(0, d.importance - 2) + ' because...',
              onChange: function(e) { setSU({ whyChange: e.target.value }); },
              style: { width: '100%', minHeight: 90, padding: 10, borderRadius: 6, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical' } })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HELP
      // ═══════════════════════════════════════════════════════════
      function renderHelp() {
        return h('div', null,
          safetyBanner(),

          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(34,197,94,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(34,197,94,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#bbf7d0', marginBottom: 4 } }, 'Help works. It is not a last resort.'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'You do not need to "hit rock bottom" before getting help. You do not need to be sure you want to stop. You can start with ONE conversation. Treatment for adolescent substance use works, and it works better the earlier it starts. The resources below are free or low-cost, confidential, and non-judgmental.'
            )
          ),

          // Helplines and resources
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#bbf7d0', marginBottom: 10 } }, '📞 Free, 24/7, confidential'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 } },
              resourceCard('SAMHSA National Helpline', 'Call 1-800-662-HELP (4357). Free, confidential, 24/7, English and Spanish. Treatment referral and information.', 'https://www.samhsa.gov/find-help/national-helpline'),
              resourceCard('SAMHSA Treatment Finder', 'findtreatment.gov — searchable directory of US treatment providers, free.', 'https://findtreatment.gov/'),
              resourceCard('1-800-QUIT-NOW', 'Free state-based smoking and vaping cessation help. Counselors, NRT support.', 'https://smokefree.gov/'),
              resourceCard('Smokefree TXT for teens', 'Text "QUIT" to 47848. Free, anonymous, daily support.', 'https://teen.smokefree.gov/'),
              resourceCard('988 Suicide and Crisis Lifeline', 'Call or text 988. Trained counselors. Substance use is welcome topic.', 'https://988lifeline.org/'),
              resourceCard('Crisis Text Line', 'Text HOME to 741741. Free, anonymous, 24/7 text-based crisis support.', 'https://www.crisistextline.org/')
            )
          ),

          // Harm reduction orgs
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a', marginBottom: 10 } }, '🛟 Harm-reduction organizations'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 } },
              resourceCard('National Harm Reduction Coalition', 'Naloxone, syringe access, drug-checking information. Network of local programs.', 'https://harmreduction.org/'),
              resourceCard('NEXT Distro', 'Mail-order Naloxone, syringes, and harm-reduction supplies. Confidential.', 'https://www.nextdistro.org/'),
              resourceCard('DanceSafe', 'Drug-checking and education at music festivals and online. Adolescent-friendly information.', 'https://dancesafe.org/'),
              resourceCard('Drug Policy Alliance', 'Policy, research, and resources. Strong harm-reduction stance.', 'https://drugpolicy.org/')
            )
          ),

          // Naloxone specifically
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.4)', borderRight: '1px solid rgba(239,68,68,0.4)', borderBottom: '1px solid rgba(239,68,68,0.4)', borderLeft: '3px solid #ef4444', marginBottom: 10, fontSize: 13, color: '#fecaca', lineHeight: 1.75 } },
            h('strong', null, '💉 Naloxone (Narcan) saves lives. '),
            'It reverses opioid overdose in 2-5 minutes. Most US states allow over-the-counter purchase. It works on fentanyl. It cannot hurt someone who is not overdosing. Carry it if you or anyone you know uses opioids — including people taking prescription painkillers, including people who use pills they got from friends (which are often fentanyl now). Free or low-cost from: many community pharmacies, public health departments, harm-reduction orgs, NEXT Distro by mail.'
          ),

          // Telehealth
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #0ea5e9' } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7dd3fc', marginBottom: 10 } }, '📱 Telehealth + apps'),
            h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Telehealth has dramatically expanded access to addiction treatment. Buprenorphine (for opioid use disorder) can now be prescribed via telehealth in many states. SAMHSA can help locate options.'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'School-based health centers and federally qualified health centers (FQHCs) provide substance use counseling regardless of insurance. Talk to your school counselor or school psych — they can connect you, often without parental notification depending on state law.')
          ),

          softPointer()
        );
      }

      function resourceCard(name, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b' } },
          h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
            style: { fontSize: 12.5, color: '#e2e8f0', fontWeight: 800, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, name + ' ↗'),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('substancePsychoed', h, ctx) : null),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 16 } }, 'Why this tool is harm-reduction-framed'),
            h('p', { style: { margin: '0 0 10px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'The evidence is clear: abstinence-only and "Just Say No"-style adolescent drug education does not work, and in some cases makes things worse. DARE, which was the dominant US adolescent drug education for decades, was evaluated repeatedly and found to be ineffective or counterproductive. The Office of National Drug Control Policy stopped funding DARE in 2007 for this reason.'
            ),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'Harm-reduction approaches — honest information about substances, adolescent brain science, harm-reduction strategies for those using, and routes to help when use becomes a problem — are now considered best practice. This tool reflects that consensus. It does NOT promote substance use. It treats adolescents as people capable of making informed decisions about their own lives.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 16 } }, '📚 Sources and learn more'),
            sourceCard('SAMHSA', 'samhsa.gov', 'US federal substance use and mental health authority. Treatment finder, helpline, education.', 'https://www.samhsa.gov/'),
            sourceCard('NIDA (National Institute on Drug Abuse)', 'nida.nih.gov', 'Research-based drug education. NIDA for Teens is youth-specific.', 'https://nida.nih.gov/'),
            sourceCard('AAP (American Academy of Pediatrics)', 'Adolescent Substance Use Policy Statements', 'Evidence-based pediatric guidance on adolescent substance use screening and intervention.', 'https://www.aap.org/'),
            sourceCard('Drug Policy Alliance', 'drugpolicy.org', 'Strong harm-reduction policy and education organization.', 'https://drugpolicy.org/'),
            sourceCard('National Harm Reduction Coalition', 'harmreduction.org', 'Practitioner network for harm reduction. Trainings, resources, advocacy.', 'https://harmreduction.org/'),
            sourceCard('CRAFFT', 'crafft.org', 'The standard adolescent substance use screening tool. Free, validated.', 'https://crafft.org/'),
            sourceCard('Casey, B. J. and Tapert, S. F. (2011, 2014)', 'Adolescent brain research', 'Foundational developmental neuroscience on adolescent substance use vulnerability.', null),
            sourceCard('Above the Influence (critique)', '', 'Federal anti-drug media campaigns have been extensively evaluated. The campaigns themselves have weak effectiveness evidence; this tool deliberately does not use that framework.', null)
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)', borderRight: '1px solid rgba(245,158,11,0.3)', borderBottom: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'This tool is psychoeducation. It is NOT diagnosis, not therapy, and not a substitute for professional substance use treatment when SUD has developed.'),
              h('li', null, 'Some substances are not covered in detail (inhalants, MDMA-adjacent club drugs, kratom, designer drugs). The 7 covered are the most common in US adolescents. SAMHSA has more.'),
              h('li', null, 'Adolescent substance use disorder treatment is genuinely effective. It is also genuinely underutilized — about 1 in 10 adolescents who meet criteria get any treatment. Stigma and access are real barriers; talk to a counselor or doctor.'),
              h('li', null, 'Harm reduction does not eliminate risk. The safest use of substances is no use. Harm reduction acknowledges that abstinence is not always the choice people make, and that meeting people where they are produces better outcomes than refusing to engage.'),
              h('li', null, 'Substance use intersects with race, class, and policy in deeply unjust ways. The same use that gets a white student counseling gets a Black student arrested. The criminalization of drug use has done enormous harm. This tool focuses on health framing, not legal framing; that does not mean legal consequences are not real.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(100,116,139,0.10)', borderTop: '1px solid rgba(100,116,139,0.3)', borderRight: '1px solid rgba(100,116,139,0.3)', borderBottom: '1px solid rgba(100,116,139,0.3)', borderLeft: '3px solid #64748b', fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Harm reduction is the evidence-based stance. If your district mandates abstinence-only messaging, your students still benefit from honest information — they will get it from peers and the internet, often inaccurately. For students with active substance use: do not lead with consequences (suspensions, calling parents); lead with care, then connect them with a counselor or school psych who can connect them to treatment. SBIRT (Screening, Brief Intervention, Referral to Treatment) is the evidence-based model for adolescent substance use intervention in schools.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#cbd5e1', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#e2e8f0', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#e2e8f0', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      // ── Print: harm-reduction handout ──
      function renderPrintView() {
        return h('div', null,
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #475569', borderRight: '1px solid #475569', borderBottom: '1px solid #475569', borderLeft: '3px solid #94a3b8', marginBottom: 12, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } },
            h('strong', null, '🖨 Harm-reduction handout. '),
            'A one-page reference for staff, families, peer educators, or yourself. The framework is honest (use exists on a spectrum, not abstinence-or-failure), the safety information is real (overdose response, naloxone, Good Samaritan laws), and the help pathways are open. Not a substitute for clinical assessment.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #475569 0%, #94a3b8 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
          ),
          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#sub-print-region, #sub-print-region * { visibility: visible !important; } ' +
            '#sub-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#sub-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),
          h('div', { id: 'sub-print-region', style: { padding: 18, borderRadius: 12, background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' } }, 'Substance Use · Harm-Reduction Handout'),
              h('div', { style: { fontSize: 11, color: '#475569' } }, 'SAMHSA · NIDA · Drug Policy Alliance')
            ),

            h('div', { style: { padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 14, fontSize: 12, lineHeight: 1.55, color: '#7f1d1d' } },
              h('strong', null, 'OVERDOSE EMERGENCY: '),
              'Unresponsive · slow or stopped breathing · blue lips · vomiting while passed out. Call 911. Give naloxone (Narcan) if available. Stay with the person. Most states have Good Samaritan laws protecting callers from drug charges.'
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'The framework: honest information, not scare tactics'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#0f172a', lineHeight: 1.65 } },
                h('li', { style: { marginBottom: 4 } }, 'Substance use exists on a spectrum: no use, experimental use, occasional use, regular use, risky use, dependence. The shape of the spectrum is more useful than a binary "use vs. abstain."'),
                h('li', { style: { marginBottom: 4 } }, 'Harm reduction recognizes that people use substances for reasons (stress, pain, social connection, curiosity, regulation, trauma). Reducing harm is possible even when use continues.'),
                h('li', { style: { marginBottom: 4 } }, 'The adolescent brain is still developing the prefrontal cortex (planning, impulse control, long-term thinking) into the mid-twenties. Early use during this window has different risks than adult use.'),
                h('li', { style: { marginBottom: 4 } }, 'Use becomes a problem when it interferes with functioning, relationships, school, or safety, OR when stopping feels impossible. The line is functional, not moral.'),
                h('li', null, 'Most teens who use substances do not develop a substance use disorder. Most do not need formal treatment. Some do, and treatment works.')
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Concrete harm-reduction practices'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#0f172a', lineHeight: 1.65 } },
                h('li', { style: { marginBottom: 3 } }, 'Never use alone if any drug is involved that could cause overdose (opioids, benzos, alcohol, fentanyl-contaminated anything). Use the Never Use Alone hotline 1-800-484-3731 if needed.'),
                h('li', { style: { marginBottom: 3 } }, 'Test drugs with fentanyl test strips (legal and free from many harm-reduction orgs).'),
                h('li', { style: { marginBottom: 3 } }, 'Carry naloxone (Narcan) if you or your friends use opioids OR any street drugs (fentanyl contamination is widespread). Free in many states.'),
                h('li', { style: { marginBottom: 3 } }, 'Do not mix CNS depressants (alcohol + benzos + opioids). This is the most common path to fatal overdose.'),
                h('li', { style: { marginBottom: 3 } }, 'Start low and go slow with anything new; tolerance is unpredictable.'),
                h('li', null, 'Hydrate, eat, sleep. Use compounds the impact of all the above.')
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'When use is a problem'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#0f172a', lineHeight: 1.65 } },
                h('li', { style: { marginBottom: 3 } }, 'Using more than intended, more often than intended.'),
                h('li', { style: { marginBottom: 3 } }, 'Trying to cut down and not being able to.'),
                h('li', { style: { marginBottom: 3 } }, 'A lot of time spent obtaining, using, or recovering.'),
                h('li', { style: { marginBottom: 3 } }, 'Cravings or strong urges.'),
                h('li', { style: { marginBottom: 3 } }, 'Use interfering with school, relationships, or commitments.'),
                h('li', { style: { marginBottom: 3 } }, 'Use in physically risky situations (driving, in unsafe places, with unknown people).'),
                h('li', { style: { marginBottom: 3 } }, 'Tolerance going up (needing more for the same effect).'),
                h('li', null, 'Withdrawal symptoms when stopping.')
              ),
              h('div', { style: { marginTop: 8, fontSize: 11.5, color: '#475569', fontStyle: 'italic', lineHeight: 1.55 } }, 'DSM-5 substance use disorder is diagnosed when several of these are present over a 12-month period. A clinician makes that call; this list is for self-reflection.')
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Help, available 24/7, confidential, free'),
              h('div', { style: { fontSize: 12, color: '#0f172a', lineHeight: 1.75 } },
                'SAMHSA National Helpline: 1-800-662-HELP (4357) — treatment referral, mental health and substance use, in English and Spanish', h('br'),
                'SAMHSA findtreatment.gov — search treatment centers near you', h('br'),
                'Never Use Alone: 1-800-484-3731 — peer on the line while you use; calls 911 if you stop responding', h('br'),
                'Naloxone (Narcan) finder: nextdistro.org — free naloxone by mail to most states', h('br'),
                'Al-Anon / Alateen: 1-888-425-2666 — for teens with family members who use', h('br'),
                'Crisis Text Line: text HOME to 741741', h('br'),
                '988 Suicide & Crisis Lifeline: call or text 988'
              )
            ),

            h('div', { style: { padding: 10, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, marginBottom: 12, fontSize: 11.5, color: '#0f172a', lineHeight: 1.6 } },
              h('strong', null, 'For families and educators: '),
              'A teen disclosing substance use is doing something hard. Punitive responses tend to drive use underground. Curiosity, listening, accurate information, and connection to clinical support produce better outcomes. Motivational Interviewing (Miller and Rollnick) is the evidence-based approach.'
            ),

            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: '#475569', lineHeight: 1.5 } },
              'Sources: NIDA (nida.nih.gov) · SAMHSA (samhsa.gov) · Drug Policy Alliance (drugpolicy.org) · Harm Reduction Coalition · Miller, W. R. & Rollnick, S. (2013), Motivational Interviewing (3rd ed.). Printed from AlloFlow SEL Hub.'
            )
          )
        );
      }

      var body;
      if (view === 'brain') body = renderBrain();
      else if (view === 'substances') body = renderSubstances();
      else if (view === 'problem') body = renderProblem();
      else if (view === 'reflect') body = renderReflect();
      else if (view === 'help') body = renderHelp();
      else if (view === 'about') body = renderAbout();
      else if (view === 'print') body = renderPrintView();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Substance Use Psychoeducation' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
