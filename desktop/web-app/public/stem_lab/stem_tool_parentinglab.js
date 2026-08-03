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
      note: 'How a practice lands depends on what it means in context — the same behavior reads as care in one setting and as harshness in another.' },
    // ── M2: attachment ──
    attachTheory: { source: 'Bowlby (1969); Ainsworth et al. (1978)', badge: 'meta',
      note: 'Attachment as an evolved system: the child uses a familiar caregiver as a secure base for exploring and a safe haven under threat.' },
    strangeSituation: { source: 'Ainsworth et al. (1978), the Strange Situation procedure', badge: 'meta',
      note: 'A structured LAB method for classifying reunion behavior. A research instrument — not a home test, and not a verdict on a family.' },
    serveReturn: { source: 'Responsive-caregiving literature; Harvard Center on the Developing Child framing', badge: 'meta',
      note: 'Back-and-forth responsive interaction as the everyday engine of security. Coaching programs built on responsiveness have randomized-trial support.' },
    notDestiny: { source: 'Longitudinal attachment research (van IJzendoorn and colleagues)', badge: 'meta',
      note: 'Classifications are moderately stable and shift with life circumstances. Predictions to later outcomes are probabilistic and modest — a start, not a sentence.' },
    apBrand: { source: 'Definitional: Sears "attachment parenting" vs. the attachment literature', badge: 'popular',
      note: 'Co-sleeping, babywearing, and extended nursing are lifestyle choices — fine if chosen, but not what attachment security is made of.' },
    // ── M3: the RCT core ──
    programs: { source: 'PCIT, Incredible Years, and Parent Management Training trial literatures; Triple P (see dissemination note)', badge: 'rct',
      note: 'Parent-focused programs tested in randomized trials, replicated across teams. Triple P is the most widely disseminated and has drawn publication-bias critiques from independent reviewers — the honest read is "supported, with a wider error bar."' },
    sharedSkills: { source: 'Common components across the program trial literature', badge: 'rct',
      note: 'Child-led attending time, specific labeled praise, planned ignoring of minor misbehavior, clear one-step instructions, calm consistent follow-through.' },
    timeoutEv: { source: 'Component analyses within program trials; AAP guidance', badge: 'rct',
      note: 'A component of many trial-supported programs and AAP-endorsed — while heavily contested in popular parenting culture. "Done right" means brief, boring, age-appropriate, and ending in reconnection.' },
    // ── M4: PRIDE ──
    pride: { source: 'PCIT child-directed interaction (Eyberg tradition)', badge: 'rct',
      note: 'The PRIDE skills are the coached core of PCIT\'s first phase, and close cousins appear across the trial-supported programs.' },
    specialTime: { source: 'Common component across PCIT / Incredible Years / PMT trials', badge: 'rct',
      note: 'A short daily dose of child-led play with the skills on and the "avoids" off. The dose is small on purpose: five minutes a day that actually happen beat an hour that does not.' },
    // ── M5: ABC at home ──
    abcFrame: { source: 'Applied behavior-analytic literature (antecedent-behavior-consequence)', badge: 'meta',
      note: 'A framework with deep applied roots: behavior does a job, and consequences teach. The parent-training skills derived from it carry randomized-trial support (see the RCT core).' },
    functionsHome: { source: 'Functional assessment literature (attention / escape / tangible / sensory)', badge: 'meta',
      note: 'The four common jobs a behavior can be doing. Knowing the job predicts what will and will not work — and a function is a description, never by itself a mandate to intervene.' },
    burst: { source: 'Extinction literature, laboratory and applied', badge: 'meta',
      note: 'When a behavior stops paying, it typically gets louder before it fades — which is exactly when most people give in, teaching the louder version.' },
    coercion: { source: 'Patterson, coercive family process', badge: 'meta',
      note: 'An escalation loop that trains BOTH sides: the child learns that escalating works, the parent learns that giving in ends the noise. The exit is warmth plus boring consistency, not bigger consequences.' },
    // ── M6: discipline ──
    spanking: { source: 'Gershoff & Grogan-Kaylor (2016) meta-analysis; AAP (2018); APA (2019)', badge: 'meta',
      note: 'Across dozens of studies: associations with worse outcomes in every domain examined, and no evidence of benefits. Causal inference has limits — and the professional consensus does not: every major pediatric and psychological body advises against it.' },
    discCulture: { source: 'Cross-cultural discipline research (incl. normativeness moderation, e.g., Lansford)', badge: 'cultural',
      note: 'Where physical discipline is culturally normative, some associated harms attenuate — they do not disappear. Outcomes research is about practices, never a judgment of parents or communities.' },
    alternatives: { source: 'Program trial literature (time-out, planned ignoring, response cost)', badge: 'rct',
      note: 'The trial-supported reduction tools: brief boring time-out, planned ignoring for minor behavior, briefly losing a privilege. Calm, small, predictable — teaching without modeling aggression.' },
    tokens: { source: 'Token-economy and reward-chart applied literature', badge: 'rct',
      note: 'Deep applied evidence when rewards are immediate, specific, achievable, and faded over time. One honest caveat: for behaviors a child already loves, added rewards can backfire; use them for behaviors a child avoids.' },
    ratio: { source: 'Coaching heuristic across parent-training programs', badge: 'meta',
      note: 'Programs commonly coach several warm interactions for every correction. The specific numbers (4:1, 5:1) are rules of thumb, not laws — the direction is what carries evidence.' },
    natConsequences: { source: 'Popular framework (Dreikurs tradition); limited direct trials', badge: 'popular',
      note: 'A sensible-sounding framework with thinner direct evidence than its reputation. What demonstrably makes any consequence work: immediacy, consistency, and calm — not size or cleverness.' },
    // ── M7: myths ──
    processPraise: { source: 'Process-praise research (Dweck tradition), WITH replication qualifiers', badge: 'meta',
      note: 'Praise the effort, strategy, or specific behavior rather than "you\'re so smart." The lab effects are real but smaller and less universal than the bestseller version; labeled praise carries its own trial support regardless.' },
    screens: { source: 'Large-sample association studies (Orben & Przybylski 2019)', badge: 'meta',
      note: 'Screen-time associations with wellbeing are small. Quality and context beat minutes: what is watched, with whom, and whether anyone talks about it afterward.' },
    selfEsteem: { source: 'Self-esteem movement literature and its reappraisals', badge: 'popular',
      note: 'A plausible idea that outran its evidence: raising self-esteem directly does not cause achievement; competence tends to come first.' },
    birthOrder: { source: 'Rohrer et al. (2015), large-sample analyses', badge: 'popular',
      note: 'Large studies find essentially no reliable birth-order effects on personality. A very sticky myth.' },
    // ── M8: adolescents ──
    disclosure: { source: 'Stattin & Kerr (2000) and the monitoring-reinterpretation literature', badge: 'meta',
      note: 'What looked like "monitoring works" is largely "teens who feel close TELL their parents things." Knowledge flows from the relationship; surveillance without relationship produces evasion, not information.' },
    autonomy: { source: 'Self-determination theory research on autonomy support', badge: 'meta',
      note: 'Autonomy support — real choices, rationales for rules, acknowledging the teen\'s view — associates with better adjustment than either control or disengagement.' },
    // ── M9: help + school ──
    therapyNames: { source: 'Child-therapy trial literatures (PCIT, PMT, CBT)', badge: 'rct',
      note: 'The names on the door that carry randomized-trial support for common child and family concerns.' }
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

  // ─────────────────────────────────────────────────────────
  // M2 — Attachment: the theory vs. the brand
  // ─────────────────────────────────────────────────────────
  var M2_CARDS = [
    {
      id: 'secure-base',
      title: 'A secure base, not a personality type',
      evidence: 'attachTheory',
      body: 'Attachment is an evolved system, not a parenting philosophy. A young child uses a familiar caregiver as a SECURE BASE to explore from and a SAFE HAVEN to return to when the world gets scary. Security is not about how much a child needs you — every child does — it is about whether, in this relationship, the child has learned that reaching out works. That learning comes from ordinary, repeated experiences, not from any single practice or product.'
    },
    {
      id: 'strange-situation',
      title: 'What the Strange Situation actually is',
      evidence: 'strangeSituation',
      body: 'The famous secure/insecure classifications come from a twenty-minute structured LAB procedure: separations and reunions with a stranger present, coded by trained observers, mostly around twelve months of age. It is a research instrument that made attachment measurable — and it was never designed as a home test, a checklist, or a way to score a family. If an article implies you can classify your own child from everyday behavior, it has left the science behind.'
    },
    {
      id: 'serve-return',
      title: 'Serve and return: the everyday engine',
      evidence: 'serveReturn',
      body: 'The practical core of the responsiveness literature fits in one loop: a child SERVES (a look, a babble, a "watch this!", a question), and the caregiver RETURNS it — noticing, responding, and building on it. Misses happen constantly in every family, and that is fine; the research points at patterns, not perfection. Repair — coming back after a miss — is itself part of the pattern. Programs that coach exactly this loop have randomized-trial support.'
    },
    {
      id: 'not-destiny',
      title: 'Not destiny',
      evidence: 'notDestiny',
      body: 'Early classifications are moderately stable, and they shift when life circumstances shift — for better and for worse. Links from infant attachment to later outcomes are real but probabilistic and modest. Two honest conclusions follow: early relationships matter, and no early classification is a sentence. A rough first year is a reason for support, not a verdict on a child or a parent.'
    },
    {
      id: 'the-brand',
      title: 'The brand that borrowed the name',
      evidence: 'apBrand',
      body: '"Attachment parenting" (the Sears brand) prescribes practices: co-sleeping, babywearing, extended nursing, constant physical closeness. Those are lifestyle choices families are free to make — but they are not what attachment security is made of, and the attachment literature does not require any of them. Secure attachment is built from responsive patterns, which exist on every continent, on every work schedule, in every feeding method. The brand borrowed the theory\'s name; do not let it borrow the theory\'s evidence.'
    }
  ];

  // Serve & Return interactive: each item is a child's serve plus three
  // possible responses; exactly one is a genuine return. Misses are framed
  // gently — the module's own content says misses are universal.
  var M2_SERVES = [
    {
      id: 's1',
      serve: 'Toddler points out the window: "Da! Da!" (a dog is passing)',
      options: [
        { id: 'a', text: '"Yes — a dog! A big brown dog. Where did he go?"', kind: 'return' },
        { id: 'b', text: 'Keep pushing the stroller a little faster; there is a schedule.', kind: 'miss' },
        { id: 'c', text: '"Say DOG. D-O-G. Can you say dog properly?"', kind: 'redirect' }
      ],
      why: 'The return notices the serve, names what the child is excited about, and builds on it with a turn the child can take. The drill response redirects the child\'s serve into the adult\'s agenda — well-meant, but it ends the rally instead of extending it.'
    },
    {
      id: 's2',
      serve: 'Eight-year-old, at pickup: "Nobody would let me join the game at recess."',
      options: [
        { id: 'a', text: '"Well, did you ask nicely? You have to ask nicely."', kind: 'redirect' },
        { id: 'b', text: '"That sounds lonely. What happened?"', kind: 'return' },
        { id: 'c', text: '"You are fine. Get in the car, we are late for practice."', kind: 'miss' }
      ],
      why: 'The return receives the feeling first and invites more. Jumping straight to advice or blame ("did you ask nicely?") answers a question the child did not ask — and teaches them to stop serving hard things.'
    },
    {
      id: 's3',
      serve: 'Baby drops the spoon off the high chair. Again. While looking right at you.',
      options: [
        { id: 'a', text: 'Take the spoon away without a word.', kind: 'miss' },
        { id: 'b', text: 'Sigh loudly and check your phone.', kind: 'miss' },
        { id: 'c', text: 'Pick it up, hand it back with raised eyebrows: "Oh no! Where did it GO?"', kind: 'return' }
      ],
      why: 'The drop-and-look IS the serve — a turn-taking game and an early physics experiment at once. Returning it a few times costs little and is exactly the loop the literature keeps pointing at. (And yes, you are allowed to end the game eventually.)'
    },
    {
      id: 's4',
      serve: 'Teen, from the doorway, at 10:40pm: "Did you ever mess up a friendship really badly?"',
      options: [
        { id: 'a', text: 'Put the phone down: "Yeah. More than once. Want the worst one?"', kind: 'return' },
        { id: 'b', text: '"It is almost eleven. We can talk tomorrow."', kind: 'miss' },
        { id: 'c', text: '"Who did you fight with? Was it Maya? What did you do?"', kind: 'redirect' }
      ],
      why: 'Teen serves often come sideways, late, and disguised as small questions. The return accepts the serve on the teen\'s terms — a story, not an interrogation. The interrogation response turns a door-opener into a door-closer. (Module 8 is entirely about this.)'
    },
    {
      id: 's5',
      serve: 'You snapped at your six-year-old this morning and you both know it.',
      options: [
        { id: 'a', text: 'Act extra cheerful and pretend it did not happen.', kind: 'miss' },
        { id: 'b', text: '"I would not have yelled if you had been ready on time."', kind: 'redirect' },
        { id: 'c', text: '"I was grumpy this morning and I was unfair to you. I am sorry. Fresh start?"', kind: 'return' }
      ],
      why: 'Repair is a return served late — and the literature treats it as part of a secure pattern, not an admission of failure. The blame version teaches that reaching out after a rupture gets you a second rupture.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // M3 — The RCT core
  // ─────────────────────────────────────────────────────────
  var M3_CARDS = [
    {
      id: 'where-evidence',
      title: 'Where the strongest evidence lives',
      evidence: 'programs',
      body: 'The strongest tier of this whole literature is a family of parent-coaching programs tested in randomized trials: Parent-Child Interaction Therapy (PCIT), Incredible Years, and parent management training in the Kazdin tradition, among others. Triple P deserves both halves of its sentence: widely disseminated and trial-supported, AND critiqued by independent reviewers for publication bias in its evidence base — so read it as "supported, with a wider error bar." None of these are styles. All of them are skills.'
    },
    {
      id: 'shared-skills',
      title: 'The five skills they all share',
      evidence: 'sharedSkills',
      body: 'Strip the branding and the trial-supported programs teach overlapping cores: (1) child-led attending time — a few minutes daily where the child leads and you narrate; (2) SPECIFIC labeled praise — "you put every block back in the bin" beats "good job"; (3) planned ignoring of minor attention-seeking misbehavior — paired with warm attention the moment behavior turns; (4) clear, one-step, tell-not-ask instructions; (5) calm, consistent, boring follow-through. Small skills, learnable by anyone, carrying most of the freight.'
    },
    {
      id: 'timeout-honest',
      title: 'Time-out, said honestly',
      evidence: 'timeoutEv',
      body: 'Time-out is a component of many of the trial-supported programs and is endorsed by the American Academy of Pediatrics — and it is one of the most attacked techniques in popular parenting culture. Both facts belong in the same paragraph. What the evidence supports is specific: brief (minutes, not moods), boring rather than frightening, used for a small set of pre-named behaviors, and always followed by reconnection. "Time-in" — connecting during calm — is not a rival; the programs teach both. What the evidence does not support is time-out as exile, humiliation, or surprise.'
    },
    {
      id: 'skills-beat-styles',
      title: 'Skills beat styles',
      evidence: 'programs',
      body: 'Module 1 ended with a promise: the specific skills with trial evidence are a better bet than chasing a style label. This is that bet, cashed out. You cannot practice "being authoritative" on Tuesday afternoon — but you can practice one labeled praise, one clear instruction, and five minutes of child-led time, and those are the components the trials actually moved. If the styles literature describes the weather, these skills are what you can do with your hands.'
    }
  ];

  // Tag the Skill interactive: concrete parent moves; which shared skill is it?
  var M3_SKILLS = [
    { id: 'attend', label: 'Child-led attending' },
    { id: 'praise', label: 'Specific labeled praise' },
    { id: 'ignore', label: 'Planned ignoring' },
    { id: 'instruct', label: 'Clear one-step instruction' },
    { id: 'follow', label: 'Consistent follow-through' }
  ];
  var M3_MOVES = [
    { id: 'k1', text: '"You carried your plate to the sink without being asked — that is being responsible."', skill: 'praise',
      why: 'Labeled praise names the exact behavior. "Good job" praises the child in general; this praises the move, which is what makes the move more likely tomorrow.' },
    { id: 'k2', text: 'Child whines theatrically for a cookie. Parent keeps unloading the dishwasher, face neutral — then turns warmly the moment the whining stops: "You asked in a calm voice. Yes, after dinner."', skill: 'ignore',
      why: 'Planned ignoring only works as a PAIR: no reaction for the minor bid, warm attention the instant behavior turns. Alone it is just coldness; paired, it is teaching.' },
    { id: 'k3', text: '"Shoes on, please." (Not: "Okay, are we ready to maybe think about shoes?")', skill: 'instruct',
      why: 'One step, told not asked, phrased so compliance is possible and visible. Question-shaped commands invite "no" — and then punish the child for answering the question you asked.' },
    { id: 'k4', text: 'Ten minutes of blocks. The child builds; the parent narrates like a sportscaster: "A red one on top... it is getting so tall..." No questions, no fixes.', skill: 'attend',
      why: 'Child-led attending is the daily deposit the programs all start with. Narration without questions or takeovers tells the child: what you choose to do is worth my full attention.' },
    { id: 'k5', text: 'Screen time ends at the timer. Today the child protests; the tablet still goes on the shelf — same shelf, same calm voice as yesterday.', skill: 'follow',
      why: 'Consistency is the skill that makes every other skill believable. The calm, boring, predictable follow-through is doing more work than any consequence\'s size.' },
    { id: 'k6', text: '"You used your brave voice with the dentist — you told her which tooth hurt."', skill: 'praise',
      why: 'Labeled praise again, on purpose: it is the highest-frequency skill in the trial programs, and the easiest one to start today.' }
  ];

  // ─────────────────────────────────────────────────────────
  // M4 — PRIDE Skills Studio
  // ─────────────────────────────────────────────────────────
  var M4_CARDS = [
    {
      id: 'pride-what',
      title: 'Five minutes where the child is the boss',
      evidence: 'specialTime',
      body: 'The trial-supported programs mostly begin in the same surprising place: not with discipline, but with a short daily block of child-led play — often called special time. The child picks the activity (hands-on play works best; screens and competitive games fight the format), the parent follows, and for those minutes the parent\'s only job is a set of five skills. The dose is small on purpose. Five minutes that actually happen every day beat the ambitious hour that never does.'
    },
    {
      id: 'pride-skills',
      title: 'The PRIDE skills',
      evidence: 'pride',
      body: 'PRAISE — labeled and specific: "you shared your blocks with me" rather than "good job." REFLECT — say back what the child says, slightly expanded: "Yeah, the truck crashed!" IMITATE — do what they are doing; parallel play is a compliment. DESCRIBE — sportscast their actions: "you are putting the red one on top." ENJOY — warmth out loud; let your face and voice show that being with them is good. Every skill hands the lead back to the child, which is the whole design.'
    },
    {
      id: 'pride-avoids',
      title: 'The three habits to park at the door',
      evidence: 'pride',
      body: 'During special time, three very normal parent moves are deliberately switched off. QUESTIONS ("what color is that?") take over the agenda and turn play into a quiz. COMMANDS ("put it over here") take the lead away outright. CRITICISM ("that is not how it goes") teaches that playing near you costs something. None of these are bad parenting in general — they are just the opposite of this exercise, which is practicing pure following. The quiz habit is the sneakiest: it feels educational while it takes the wheel.'
    },
    {
      id: 'pride-reallife',
      title: 'When special time goes sideways',
      evidence: 'specialTime',
      body: 'The programs plan for reality: if minor misbehavior shows up during special time, the coached response is to withdraw attention briefly — look away, go quiet — and return warmly the instant play resumes. If behavior gets unsafe, special time simply ends, calmly, and tomorrow is a fresh start. No lectures inside the five minutes. The skills you are practicing here are the same attending and planned-ignoring muscles from the RCT core module, in their natural habitat.'
    }
  ];

  // Utterance labeler: a play-session transcript; label each parent line.
  var M4_LABELS = [
    { id: 'praise', label: 'Labeled praise' },
    { id: 'reflect', label: 'Reflection' },
    { id: 'imitate', label: 'Imitate' },
    { id: 'describe', label: 'Describe' },
    { id: 'question', label: 'Question (avoid)' },
    { id: 'command', label: 'Command (avoid)' },
    { id: 'criticism', label: 'Criticism (avoid)' }
  ];
  var M4_UTTERANCES = [
    { id: 'u1', child: 'Child starts stacking blocks into a wobbly tower.', parent: '"You are building it so tall — three blocks already."', answer: 'describe',
      why: 'Sportscasting the child\'s action, no steering. Describe is the workhorse skill: easy to say, keeps the child leading, and shows you are actually watching.' },
    { id: 'u2', child: '"The dragon lives in the tower!"', parent: '"The dragon lives in the TOWER — right at the top!"', answer: 'reflect',
      why: 'A reflection: the child\'s own words, returned slightly expanded. It tells the child their words steer the play.' },
    { id: 'u3', child: 'Child carefully balances the last block.', parent: '"What shape is that block?"', answer: 'question',
      why: 'The quiz habit. It feels educational, but it yanks the agenda from castle-building to shape-naming. In special time, park it — there are 23.9 other hours for shapes.' },
    { id: 'u4', child: 'Child hands the parent a block.', parent: '"Thank you for handing me a block — that was helpful."', answer: 'praise',
      why: 'Labeled praise: it names the exact behavior. Compare "good job", which spends the same breath teaching nothing in particular.' },
    { id: 'u5', child: 'The tower leans badly to the left.', parent: '"Turn that one flat or it will fall."', answer: 'command',
      why: 'A command — it takes the lead, even though it is engineering-correct. In special time the tower is allowed to fall; watching you NOT take over is part of what the child learns.' },
    { id: 'u6', child: 'The tower falls. Child laughs and starts again.', parent: '"You are starting again right away — that is sticking with it."', answer: 'praise',
      why: 'Labeled praise aimed at persistence — catching a behavior worth growing at the exact moment it happens.' },
    { id: 'u7', child: 'Child lines the blocks up in a long row instead.', parent: '"Rows are not really how blocks work, sweetie."', answer: 'criticism',
      why: 'Gentle words, critical function: it tells the child their way of playing is wrong. Rows are exactly how blocks work, if the child says so — that is the special-time contract.' },
    { id: 'u8', child: 'Child pushes a block-car along the rug, making engine noises.', parent: 'Parent picks up a block, pushes it alongside, matching the engine noise.', answer: 'imitate',
      why: 'Imitation — joining the game on the child\'s terms. Parallel play is a compliment the child can feel.' }
  ];

  // ─────────────────────────────────────────────────────────
  // M5 — ABC at Home
  // ─────────────────────────────────────────────────────────
  var M5_CARDS = [
    {
      id: 'abc-frame',
      title: 'Behavior does a job',
      evidence: 'abcFrame',
      body: 'The most useful lens in the applied literature fits on an index card: ANTECEDENT (what set the stage), BEHAVIOR (what the child did), CONSEQUENCE (what happened next — especially what the behavior earned). Consequences teach, whether or not anyone intended a lesson. The checkout-line candy from Module 1 is the classic: the fourth "just this once" is not a lapse, it is a lesson plan — and the lesson is "whining works on the fourth try."'
    },
    {
      id: 'abc-functions',
      title: 'The four jobs',
      evidence: 'functionsHome',
      body: 'Most behavior that worries parents is doing one of four jobs: getting ATTENTION (even scolding is attention), ESCAPING something hard or boring, getting a TANGIBLE thing (the candy, the tablet, five more minutes), or meeting a SENSORY need (movement, sound, pressure — behavior that feels good from the inside). The job predicts the fix: attention-maintained behavior starves without an audience but grows under lectures; escape-maintained behavior grows every time the demand disappears. Same behavior, different job, opposite fix — which is why "what works" advice without a function attached is a coin flip.'
    },
    {
      id: 'abc-burst',
      title: 'It gets worse before it gets better',
      evidence: 'burst',
      body: 'When a behavior that used to pay suddenly stops paying, it does not fade quietly — it gets louder first. The extinction burst is the best-documented trap in this literature, because the burst arrives exactly when a tired parent concludes "this is not working" and gives in — thereby paying out at the new, louder rate. Two practical rules follow: only stop paying a behavior you can outlast, and tell yourself in advance that louder-before-quieter means it IS working. Pick battles you can hold.'
    },
    {
      id: 'abc-coercion',
      title: 'The escalation trap trains everyone',
      evidence: 'coercion',
      body: 'Patterson\'s coercion research mapped a loop many exhausted families will recognize: parent asks, child protests louder, parent escalates, child escalates further — until one side gives in. Whoever folds, both sides learn: the child learns escalation eventually works, the parent learns that giving in (or exploding) ends the noise. Nobody in the loop is bad; the loop itself is the problem. The exit is unglamorous: calmer asks, smaller demands you can actually hold, warmth banked outside the conflict — the special-time deposit from the PRIDE module is exactly that bank.'
    },
    {
      id: 'abc-limits',
      title: 'A function is not a verdict',
      evidence: 'functionsHome',
      body: 'Two honest limits. First: knowing a behavior\'s function does not mean the behavior needs fixing. A child who rocks or flaps when excited is often meeting a sensory need that costs no one anything — understanding it beats extinguishing it, and that judgment matters especially for neurodivergent kids. Second: home ABC-watching is a lens for everyday friction, not a clinical tool. If a behavior is dangerous, escalating, or driving the whole family\'s life, that is what the school team and clinicians are for — Module 9 covers how to ask. BehaviorLab teaches this science with full rigor; the School Behavior Toolkit shows the school side of the same triangle.'
    }
  ];

  var M5_FUNCTIONS = [
    { id: 'attention', label: 'Attention' },
    { id: 'escape', label: 'Escape' },
    { id: 'tangible', label: 'Tangible' },
    { id: 'sensory', label: 'Sensory' }
  ];
  var M5_SCENES = [
    { id: 'f1', text: 'Checkout line. Child whines for candy; last three trips, whining eventually produced candy. A = candy in sight, B = whining, C = ?',
      answer: 'tangible',
      why: 'The behavior earns a THING. Note what the fix is not: a lecture (that adds attention to a tangible-maintained behavior — paying in a second currency). The fix is the boring one: candy stops following whining, and a burst is expected on trip one.' },
    { id: 'f2', text: 'Every night, twenty minutes into homework, a meltdown — and homework gets shelved "until things calm down."',
      answer: 'escape',
      why: 'The meltdown\'s job is making the hard thing disappear, and it works nightly. Escape-maintained behavior grows every time the demand evaporates — the counter-move is shrinking the demand (five problems, then a real break) so staying beats escaping.' },
    { id: 'f3', text: 'The moment a parent starts a phone call, the six-year-old suddenly needs help, has an emergency, or plays the drum solo. The call keeps pausing.',
      answer: 'attention',
      why: 'A parent on the phone is an attention drought; the behavior reliably ends it. The paired fix from the RCT core: attention BEFORE the call ("two minutes, then I talk to Grandma"), boring non-response during, warm attention for waiting.' },
    { id: 'f4', text: 'During long car rides, a nine-year-old hums the same three notes and drums on the window. Nobody reacts either way; she does it alone in her room too.',
      answer: 'sensory',
      why: 'No audience, no escape, no payout — the behavior feels good from the inside. And per the fifth card: this may need no fix at all. Headphones for the rest of the car, maybe. A function is a description, not a verdict.' },
    { id: 'f5', text: 'Toothbrushing time. The four-year-old goes boneless and giggles; the parent chases, negotiates, narrates — a nightly ten-minute show ending in one distracted minute of brushing.',
      answer: 'attention',
      why: 'The chase IS the payoff — ten minutes of undivided, entertaining parent. The coached move flips the schedule: big engagement for steps toward the bathroom, flat minimal response to the boneless act. Same total attention, opposite timing.' }
  ];

  // ─────────────────────────────────────────────────────────
  // M6 — Discipline: what the evidence says
  // ─────────────────────────────────────────────────────────
  var M6_CARDS = [
    {
      id: 'disc-consensus',
      title: 'The consensus on spanking is: don\'t',
      evidence: 'spanking',
      body: 'Here the honest read and the firm read are the same read. The largest meta-analysis (Gershoff & Grogan-Kaylor, 2016) found spanking associated with worse outcomes in every domain examined — behavior, mental health, the parent-child relationship — and no evidence of benefits, including the compliance it is meant to buy. Causal inference from correlational data has limits, and this literature says so. The professional consensus does not hesitate: the American Academy of Pediatrics (2018) and the American Psychological Association (2019) both advise against physical discipline. This lab\'s one directive sentence: there are better tools, and they are the ones with trial evidence.'
    },
    {
      id: 'disc-culture',
      title: 'Culture, history, and zero contempt',
      evidence: 'discCulture',
      body: 'Physical discipline is normative in many communities, used by loving parents raising children they would do anything for — and outcomes research is about practices, never a verdict on parents or cultures. Two honest notes belong here. The cross-cultural literature finds that where a practice is normative, some associated harms attenuate, though they do not reverse. And some scholars trace the prevalence of corporal punishment in certain communities to histories of colonization and slavery rather than to older indigenous traditions — an argument worth knowing, held here as scholarship rather than settled fact. Every culture also carries rich non-physical discipline traditions to build from.'
    },
    {
      id: 'disc-instead',
      title: 'What to use instead — and why it works better',
      evidence: 'alternatives',
      body: 'The trial-supported reduction tools are unglamorous: a brief, boring time-out (M3 covers "done right"); planned ignoring for minor attention-seeking; response cost — briefly losing a privilege, announced in advance, executed calmly. Why do these outperform harsher options? They carry information instead of fear: the child learns exactly which behavior stopped paying, nothing about the parent being dangerous. They do not model aggression as a problem-solving tool. They leave the relationship bank — the warmth that makes every other tool work — undrained. And because they are small, a parent can actually deliver them EVERY time, and consistency is the ingredient doing most of the work.'
    },
    {
      id: 'disc-tokens',
      title: 'Reward charts, done so they work',
      evidence: 'tokens',
      body: 'Sticker charts and token systems have deep applied evidence — when built right. Working versions: the reward is immediate (tokens now, cash-in soon), the target is specific ("shoes on by 7:40," not "be good"), the bar starts where the child can actually reach it, and the system fades once the habit stands on its own. Failing versions: vague targets, delayed payoffs, moving goalposts, and charts that quietly become punishment ledgers. One honest caveat from the research: for things a child already loves doing, adding rewards can dampen the joy — spend charts on behaviors a child avoids, not ones they own.'
    },
    {
      id: 'disc-ratio',
      title: 'The ratio is the strategy',
      evidence: 'ratio',
      body: 'The parent-training programs coach a simple audit: for every correction, several warm interactions — labeled praise, interest, special time. Programs often say four- or five-to-one; treat the numbers as rules of thumb and the direction as the finding. The logic is mechanical, not sentimental: corrections only carry information when they are rare events against a warm background. A child corrected constantly stops hearing corrections; a child praised specifically knows exactly what to do more of. If discipline feels like it is failing, the coached first move is not a bigger consequence — it is checking the ratio.'
    },
    {
      id: 'disc-natural',
      title: '"Natural consequences" — reputation vs. receipts',
      evidence: 'natConsequences',
      body: 'The natural-and-logical-consequences framework sounds airtight: let the missed jacket teach the cold walk. As a whole framework it carries thinner direct trial evidence than its reputation suggests — it is a philosophy that borrowed the confidence of the research next door. What IS demonstrated, across the applied literature: any consequence teaches best when it is immediate, consistent, and delivered calmly, and consequence SIZE matters far less than parents expect. So use natural consequences when they are safe and immediate — they are conveniently pre-built — but the magic ingredient was never the naturalness. It was the consistency.'
    }
  ];

  // M6 interactive: the badge system in action — tier the claims yourself.
  var M6_BADGE_OPTIONS = [
    { id: 'rct', label: 'RCT-supported' },
    { id: 'meta', label: 'Meta-analytic association' },
    { id: 'cultural', label: 'Culturally moderated' },
    { id: 'popular', label: 'Popular, not supported' }
  ];
  var M6_CLAIMS = [
    { id: 'c1', text: '"Spanking improves children\'s long-term behavior."', answer: 'popular',
      why: 'The meta-analytic literature finds no evidence of benefits — not even short-term compliance holds up — and associations with worse outcomes across domains. Professional bodies advise against it.' },
    { id: 'c2', text: '"A brief, calm, boring time-out reduces problem behavior in young children."', answer: 'rct',
      why: 'A component of multiple trial-supported programs, endorsed by the AAP. The adjectives are load-bearing: brief, calm, boring, reconnected afterward.' },
    { id: 'c3', text: '"How physical discipline relates to outcomes depends partly on how normative it is in the surrounding culture."', answer: 'cultural',
      why: 'The normativeness-moderation finding: where a practice is common and expected, some associated harms attenuate. Attenuate — not vanish, not reverse.' },
    { id: 'c4', text: '"Token charts can build new habits when rewards are immediate and specific."', answer: 'rct',
      why: 'Token economies are among the oldest well-evidenced tools in the applied literature — with the design details (immediate, specific, achievable, faded) carrying the effect.' },
    { id: 'c5', text: '"Bigger consequences teach faster than small ones."', answer: 'popular',
      why: 'Size matters far less than immediacy and consistency — and large consequences are harder to deliver every time, which quietly destroys the consistency that was doing the work.' },
    { id: 'c6', text: '"Children in warmer households respond better to correction."', answer: 'meta',
      why: 'Robust association, causally entangled in both directions — and entirely consistent with the ratio logic: correction carries information best against a warm background.' }
  ];

  // ─────────────────────────────────────────────────────────
  // M7 — Myths vs. literature
  // ─────────────────────────────────────────────────────────
  var M7_CARDS = [
    {
      id: 'myth-praise',
      title: 'Praise: the useful version of the mindset story',
      evidence: 'processPraise',
      body: 'The famous studies compared praising the child ("you\'re so smart") with praising the process ("you found a strategy that worked"), and found person-praise made children play it safe while process-praise kept them trying. The honest footnote: replications find the effects smaller and less universal than the bestseller version implied. The practical rule survives the footnote comfortably, because it converges with the trial-supported skill from the RCT core: praise the effort, the strategy, or the specific behavior — not the trait. "You checked your work twice" beats "you\'re a genius" on every tier of the evidence.'
    },
    {
      id: 'myth-screens',
      title: 'Screens: quality beats quantity',
      evidence: 'screens',
      body: 'The moral panic says screen time is driving an epidemic. The large-sample association studies find links to wellbeing that are real but small — in one famous analysis, comparable to the association with eating potatoes. What the literature keeps pointing at instead: WHAT is watched matters more than how long, WITH WHOM matters more than what, and TALKING ABOUT IT afterward matters most of all. Co-viewing, asking what happened in the show, connecting it to the child\'s world — the research word is "active mediation," the plain word is conversation. Worry less about the clock; sit down more often.'
    },
    {
      id: 'myth-selfesteem',
      title: 'The self-esteem detour',
      evidence: 'selfEsteem',
      body: 'For a generation, schools and parenting advice treated self-esteem as the master cause: raise it, and grades, behavior, and happiness follow. The reappraisals found the arrow mostly points the other way — competence builds esteem far more reliably than esteem builds competence, and untethered praise built neither. The rehabilitated version is quieter and better supported: children feel good about themselves when they can DO things, so build skills and let esteem arrive as the receipt, not the down payment.'
    },
    {
      id: 'myth-birthorder',
      title: 'Birth order: astrology with siblings',
      evidence: 'birthOrder',
      body: 'The responsible firstborn, the rebel middle, the charming baby — irresistible, and essentially unsupported. Large-sample analyses (hundreds of thousands of people) find no reliable birth-order effects on personality; a small first-born edge on IQ measures is real but tiny. Why does the myth feel so true at home? Because within a family, birth order is confounded with age: the "responsible firstborn" is mostly just older. This one earns its badge as a calibration exercise — a belief can be vivid, universal, and wrong.'
    }
  ];
  var M7_CLAIMS = [
    { id: 'y1', text: '"Praising children makes them dependent on praise."', answer: 'popular',
      why: 'Labeled, specific praise is a core skill of the trial-supported programs. The kernel of truth: empty person-praise ("so smart!") has real downsides — which is an argument for better praise, not less.' },
    { id: 'y2', text: '"Praising effort and strategy beats praising traits."', answer: 'meta',
      why: 'Supported direction with honest replication qualifiers on size — and it converges with labeled praise, which carries trial support on its own.' },
    { id: 'y3', text: '"Screen time is the main driver of teen mental-health problems."', answer: 'popular',
      why: 'The associations are small — far too small for "main driver." The evidence-supported lever is quality and conversation, not the clock.' },
    { id: 'y4', text: '"Watching a show WITH your child and discussing it changes what the child takes from it."', answer: 'meta',
      why: 'The active-mediation literature: co-viewing plus conversation is where the real leverage lives.' },
    { id: 'y5', text: '"Raising a child\'s self-esteem directly will raise their achievement."', answer: 'popular',
      why: 'The reappraisal literature found the arrow mostly runs from competence to esteem. Build the skill; the feeling follows.' },
    { id: 'y6', text: '"Birth order shapes personality."', answer: 'popular',
      why: 'Large-sample analyses: essentially null for personality. The firstborn in your house is not more responsible because of birth order; they are mostly just older.' },
    { id: 'y7', text: '"A short daily block of child-led play improves behavior over weeks."', answer: 'rct',
      why: 'This one is not a myth — special time is a coached component of the trial-supported programs. Planted here on purpose: the badge skill includes recognizing when a claim is BETTER than it sounds.' },
    { id: 'y8', text: '"Whether teens experience strict rules as caring or controlling differs across cultural contexts."', answer: 'cultural',
      why: 'The cultural-moderation literature again: the meaning a practice carries in its context shapes how it lands. Same rule, different message, different outcome.' }
  ];

  // ─────────────────────────────────────────────────────────
  // M8 — Adolescents
  // ─────────────────────────────────────────────────────────
  var M8_CARDS = [
    {
      id: 'teen-disclosure',
      title: 'The monitoring plot twist',
      evidence: 'disclosure',
      body: 'For decades, "parental monitoring" predicted good outcomes, and the advice wrote itself: track your teen. Then Stattin and Kerr looked at where parents\' knowledge actually came from — and most of it was the TEEN\'S OWN DISCLOSURE. Teens who feel close, respected, and un-pounced-on tell their parents things; teens under surveillance without relationship get better at hiding. The "monitoring effect" was substantially a relationship effect wearing a supervision costume. The practical inversion: the goal is not more tracking, it is being the kind of listener a teen voluntarily talks to. Every serve-and-return deposit from Module 2 is this, ten years later.'
    },
    {
      id: 'teen-autonomy',
      title: 'Autonomy support is not letting go of the wheel',
      evidence: 'autonomy',
      body: 'The self-determination research distinguishes three stances. CONTROL: rules without reasons, decisions without input, love that feels contingent on compliance. ABDICATION: no rules, no interest, "they\'re old enough." AUTONOMY SUPPORT: real choices inside real limits, rationales for the rules that exist, and the teen\'s perspective acknowledged out loud even when the answer is still no. The third stance associates with better adjustment than either extreme. The phone-parks-at-9pm scene from Module 1 was autonomy support wearing work clothes: the limit held, AND the teen\'s objection got a hearing and a review date.'
    },
    {
      id: 'teen-warmth',
      title: 'Conflict is the feature, coldness is the bug',
      evidence: 'autonomy',
      body: 'Adolescent conflict rises in nearly every family — it is developmentally on schedule, the sound of an autonomy system coming online. The literature\'s reassurance: ordinary bickering about chores, curfews, and tone predicts little, as long as the warmth underneath holds. What predicts trouble is the warmth dropping out — fewer meals, fewer laughs, the relationship going cold while everyone tells themselves it is a phase. And the repair skill from Module 2 does not retire: a parent who can say "I handled that badly last night" is teaching the exact skill they most want the teen to have at 25.'
    },
    {
      id: 'teen-safety',
      title: 'When privacy loses the tiebreak',
      evidence: 'disclosure',
      body: 'Honesty requires the exception: the disclosure research describes ordinary life, not emergencies. Signals like talk of self-harm, disappearing money, sudden social collapse, or substances change the calculation — safety outranks privacy, and checking becomes the loving move even at a relationship cost you should expect and repair afterward. The teachable frame is transparency: "I read your messages because I was scared for you" preserves more trust than surveillance discovered by accident. Module 9 covers where to take what you find.'
    }
  ];
  var M8_STANCES = [
    { id: 'support', label: 'Autonomy support' },
    { id: 'control', label: 'Control' },
    { id: 'abdicate', label: 'Abdication' }
  ];
  var M8_SCENES = [
    { id: 't1', text: 'Sixteen-year-old wants to quit piano after eight years. Parent: "Walk me through it. If you still feel this way after the recital, we\'ll end on your terms — what would you want to do with the practice hours?"',
      answer: 'support',
      why: 'A real choice inside a real process: the teen\'s reasoning is heard, the decision genuinely theirs, and the parent stays interested in what comes next rather than defending sunk costs.' },
    { id: 't2', text: '"Because I said so, and while you live under my roof you\'ll play piano. This discussion is over."',
      answer: 'control',
      why: 'A rule without a rationale and a perspective unacknowledged. It may win the evening; the disclosure research says it quietly closes the channel that mattered.' },
    { id: 't3', text: '"Whatever, quit, it\'s your life." Parent goes back to their phone.',
      answer: 'abdicate',
      why: 'Reads as freedom, lands as indifference. Autonomy support requires staying IN the conversation — interest is the part that makes the freedom feel like respect.' },
    { id: 't4', text: 'Curfew broken by an hour, no text. Next morning: "You\'re later than we agreed and I was scared. What happened? ... Okay. The curfew stands, and next time a text buys you flexibility. Fair?"',
      answer: 'support',
      why: 'The limit holds AND the teen\'s account got a genuine hearing, with a workable path offered. Note the parent led with the feeling, not the verdict.' },
    { id: 't5', text: 'Parent installs a hidden tracker after the broken curfew, says nothing, and brings up locations "casually" for weeks.',
      answer: 'control',
      why: 'Covert surveillance is the move the disclosure literature warns about: it produces better hiding, not better information — and its discovery spends trust you cannot easily rebuy. (Safety emergencies change this calculus — openly.)' }
  ];

  // ─────────────────────────────────────────────────────────
  // M9 — When to seek help + partnering with school
  // ─────────────────────────────────────────────────────────
  var M9_CARDS = [
    {
      id: 'help-when',
      title: 'When to ask for help',
      evidence: null,
      body: 'The honest heuristic is not about any single behavior — nearly every behavior in this lab is normal at some age. Clinicians look at four dials: DURATION (weeks and months, not days), INTENSITY (beyond what peers show), SETTINGS (showing up at home AND school AND with friends), and IMPAIRMENT (it is costing the child friendships, learning, sleep, joy). When those dials climb together, asking for help early is the strong move, not the last resort — and asking is assessment, not commitment. Start with the pediatrician or the school; both are doors to everything else.'
    },
    {
      id: 'help-names',
      title: 'Therapy names, decoded',
      evidence: 'therapyNames',
      body: 'Three names carry the deepest trial support for common child and family concerns. PCIT (Parent-Child Interaction Therapy): a coach literally in your ear during play with your young child — the PRIDE module is its opening phase. PMT (parent management training, Kazdin tradition): the ABC module, taught systematically, for defiance and meltdowns. CBT (cognitive behavioral therapy): for anxiety, low mood, and worry loops in school-age kids and teens, with exposure-based versions for anxiety carrying particularly strong support. A fair question for any provider: "what approach do you use, and what is the evidence for it with kids like mine?" Good providers enjoy that question.'
    },
    {
      id: 'help-school',
      title: 'The school side: IEPs, 504s, and how to ask',
      evidence: null,
      body: 'Plain-English version, from the school-psych side of the table. A 504 PLAN provides accommodations — changes to HOW a child learns (extra time, preferential seating, breaks) — for a disability that limits a major life activity. An IEP provides specialized instruction — changes to WHAT and HOW a child is taught — under IDEA, and comes with measurable goals the team must track. You can request an evaluation AT ANY TIME, in writing, to the principal or special-education office; the district must respond within a legally defined timeline (the exact clock varies by state — ask for yours in the same letter). You are a full member of the team, you may bring anyone to the meeting, and you may ask for anything to be explained again in plain language. Procedures vary by state and district; this is orientation, not legal advice.'
    },
    {
      id: 'help-meeting',
      title: 'Walking into the meeting',
      evidence: null,
      body: 'The parents who leave IEP and 504 meetings satisfied tend to arrive the same way: with a one-page picture of their child (strengths first, then concerns, then what helps at home), two or three specific questions written down, and the understanding that the first meeting is a conversation, not a verdict. Use the checklist below to build your own prep list — it saves with this tool, and you can rebuild it before every meeting.'
    },
    {
      id: 'help-crisis',
      title: 'If it is a crisis',
      evidence: null,
      body: 'For thoughts of self-harm or suicide: call or text 988 (Suicide & Crisis Lifeline) — available 24/7. For concerns about abuse: Childhelp National Child Abuse Hotline, 1-800-422-4453. To find state and local services of every kind — food, housing, counseling, respite — dial 211 or visit 211.org; it is the national router to what exists where you live. AlloFlow\'s SEL Hub carries these same crisis lines inside its student-facing activities, on purpose: safety information bears repeating. None of this replaces emergency services — for immediate danger, call 911.'
    }
  ];
  // Meeting-prep checklist: check items off; persists with the tool state.
  var M9_CHECKLIST = [
    { id: 'p1', text: 'One-page snapshot of my child: strengths FIRST, then concerns, then what helps at home' },
    { id: 'p2', text: 'My top 2-3 questions, written down (it is easy to blank in the room)' },
    { id: 'p3', text: 'Copies of anything relevant: report cards, outside evaluations, work samples' },
    { id: 'p4', text: 'My request history: when I asked for what, in writing, and any responses' },
    { id: 'p5', text: 'Asked who will BE at the meeting, and invited anyone I want with me' },
    { id: 'p6', text: 'Decided what a good outcome looks like to me before walking in' },
    { id: 'p7', text: 'Reminder to self: I can ask for plain language, and I can ask for time to think before signing' }
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
      { id: 'pl_read_m1', label: 'Read all five Warmth & Structure cards', icon: '📖', check: function(d) { var m = (d && d.readCards) || {}; return ['two-dials', 'four-corners', 'causation', 'culture', 'so-what'].every(function(id) { return m[id]; }); }, progress: function(d) { var m = (d && d.readCards) || {}; return ['two-dials', 'four-corners', 'causation', 'culture', 'so-what'].filter(function(id) { return m[id]; }).length + '/5 cards'; } },
      { id: 'pl_dials', label: 'Rate 4 vignettes on both dials', icon: '🎛️', check: function(d) { return d && d.dialsDone && Object.keys(d.dialsDone).length >= 4; }, progress: function(d) { return ((d && d.dialsDone && Object.keys(d.dialsDone).length) || 0) + '/4 vignettes'; } },
      { id: 'pl_serves', label: 'Return 4 serves in the Serve & Return studio', icon: '🤝', check: function(d) { return d && d.servesDone && Object.keys(d.servesDone).length >= 4; }, progress: function(d) { return ((d && d.servesDone && Object.keys(d.servesDone).length) || 0) + '/4 serves'; } },
      { id: 'pl_skills', label: 'Tag 5 moves with the right shared skill', icon: '🧪', check: function(d) { return d && d.movesDone && Object.keys(d.movesDone).length >= 5; }, progress: function(d) { return ((d && d.movesDone && Object.keys(d.movesDone).length) || 0) + '/5 moves'; } },
      { id: 'pl_pride', label: 'Label 6 lines of the play-session transcript', icon: '🗣️', check: function(d) { return d && d.prideDone && Object.keys(d.prideDone).length >= 6; }, progress: function(d) { return ((d && d.prideDone && Object.keys(d.prideDone).length) || 0) + '/6 lines'; } },
      { id: 'pl_abc', label: 'Tag the function in 4 home scenes', icon: '🔁', check: function(d) { return d && d.abcDone && Object.keys(d.abcDone).length >= 4; }, progress: function(d) { return ((d && d.abcDone && Object.keys(d.abcDone).length) || 0) + '/4 scenes'; } }
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

      var view = d.view || 'menu';           // 'menu' | 'm1' | 'm2' | 'm3'
      var readCards = d.readCards || {};      // cardId -> true (all modules share the map; ids are unique)
      var dialsDone = d.dialsDone || {};      // vignetteId -> { warmth, structure, correct }
      var dialsCurrent = d.dialsCurrent || 0; // index into M1_VIGNETTES
      var dialsPick = d.dialsPick || {};      // in-progress { warmth, structure }
      var servesDone = d.servesDone || {};    // serveId -> { pick, kind }
      var servesCurrent = d.servesCurrent || 0;
      var movesDone = d.movesDone || {};      // moveId -> { pick, correct }
      var movesCurrent = d.movesCurrent || 0;

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
      }, __alloT('stem.parentingLab.review_banner', 'All nine modules drafted; expert content review in progress (PARENTING_LAB_SPEC.md). The IEP/504 section in Module 9 awaits its final line-edit.'));

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

      // Shared card list — same details/summary markup for every module.
      function markCardReadIn(cards, cardId, xpLabel) {
        if (readCards[cardId]) return;
        var next = Object.assign({}, readCards); next[cardId] = true;
        setPL({ readCards: next });
        var all = cards.every(function(c) { return next[c.id]; });
        if (all) { awardXP(10, xpLabel); announceToSR(__alloT('stem.parentingLab.cards_done_generic_sr', 'All cards in this module read.')); }
      }
      function contentCardList(cards, xpLabel) {
        return h('div', { className: 'space-y-3 mb-6' },
          cards.map(function(c) {
            var open = !!readCards[c.id];
            var ev = EVIDENCE[c.evidence] || {};
            return h('details', {
              key: c.id,
              open: open || undefined,
              className: 'rounded-2xl overflow-hidden',
              style: { background: pal.panel, border: '1px solid ' + pal.border },
              onToggle: function(e) { if (e.target.open) markCardReadIn(cards, c.id, xpLabel); }
            },
              h('summary', { className: 'cursor-pointer px-4 py-3 flex items-center justify-between gap-2 flex-wrap font-bold text-sm', style: { color: pal.text } },
                h('span', null, (open ? '✓ ' : '') + c.title),
                ev.badge ? badgeChip(ev.badge, 'sm') : null
              ),
              h('div', { className: 'px-4 pb-4' },
                h('p', { className: 'text-sm leading-relaxed', style: { color: pal.text } }, c.body),
                // Guidance cards (practical how-to, e.g., meeting prep) carry no
                // evidence entry on purpose — a source line would imply one study
                // "proves" what is really synthesized practice guidance.
                ev.source ? h('p', { className: 'text-[11px] mt-2 font-semibold', style: { color: pal.muted } }, __alloT('stem.parentingLab.source', 'Source') + ': ' + ev.source + ' — ' + ev.note) : null
              )
            );
          })
        );
      }
      function moduleHeader(title) {
        return h('div', { className: 'flex items-center gap-3 flex-wrap mb-3' }, backBtn, h('h2', { className: 'text-lg font-black' }, title));
      }
      function cardsRead(cards) { return cards.filter(function(c) { return readCards[c.id]; }).length; }

      // ─────────────── MENU ───────────────
      if (view === 'menu') {
        var m1Done = cardsRead(M1_CARDS) >= M1_CARDS.length && Object.keys(dialsDone).length >= 4;
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
          h('button', {
            onClick: function() { setPL({ view: 'm2' }); announceToSR(__alloT('stem.parentingLab.m2_open_sr', 'Opened module two: attachment.')); },
            className: 'w-full text-left rounded-2xl p-4 mb-3 transition-all hover:shadow-md',
            style: { background: pal.panel, border: '2px solid ' + pal.border, color: pal.text }
          },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('span', { className: 'font-black text-base' }, '🤝 ' + __alloT('stem.parentingLab.m2_title', 'M2 — Attachment: the theory vs. the brand')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.accent } },
                cardsRead(M2_CARDS) + '/' + M2_CARDS.length + ' ' + __alloT('stem.parentingLab.cards', 'cards') + ' · ' + Object.keys(servesDone).length + '/' + M2_SERVES.length + ' ' + __alloT('stem.parentingLab.serves', 'serves'))
            ),
            h('p', { className: 'text-xs mt-1', style: { color: pal.muted } },
              __alloT('stem.parentingLab.m2_teaser', 'Bowlby and Ainsworth vs. the lifestyle brand that borrowed their name — plus the Serve & Return studio.'))
          ),
          h('button', {
            onClick: function() { setPL({ view: 'm3' }); announceToSR(__alloT('stem.parentingLab.m3_open_sr', 'Opened module three: the R C T core.')); },
            className: 'w-full text-left rounded-2xl p-4 mb-3 transition-all hover:shadow-md',
            style: { background: pal.panel, border: '2px solid ' + pal.border, color: pal.text }
          },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('span', { className: 'font-black text-base' }, '🧪 ' + __alloT('stem.parentingLab.m3_title', 'M3 — The RCT core')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.accent } },
                cardsRead(M3_CARDS) + '/' + M3_CARDS.length + ' ' + __alloT('stem.parentingLab.cards', 'cards') + ' · ' + Object.keys(movesDone).length + '/' + M3_MOVES.length + ' ' + __alloT('stem.parentingLab.moves', 'moves'))
            ),
            h('p', { className: 'text-xs mt-1', style: { color: pal.muted } },
              __alloT('stem.parentingLab.m3_teaser', 'PCIT, Incredible Years, PMT — the five skills they all share, and time-out said honestly.'))
          ),
          h('button', {
            onClick: function() { setPL({ view: 'm4' }); announceToSR(__alloT('stem.parentingLab.m4_open_sr', 'Opened module four: PRIDE skills studio.')); },
            className: 'w-full text-left rounded-2xl p-4 mb-3 transition-all hover:shadow-md',
            style: { background: pal.panel, border: '2px solid ' + pal.border, color: pal.text }
          },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('span', { className: 'font-black text-base' }, '🗣️ ' + __alloT('stem.parentingLab.m4_title', 'M4 — PRIDE Skills Studio')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.accent } },
                cardsRead(M4_CARDS) + '/' + M4_CARDS.length + ' ' + __alloT('stem.parentingLab.cards', 'cards') + ' · ' + Object.keys(d.prideDone || {}).length + '/' + M4_UTTERANCES.length + ' ' + __alloT('stem.parentingLab.lines', 'lines'))
            ),
            h('p', { className: 'text-xs mt-1', style: { color: pal.muted } },
              __alloT('stem.parentingLab.m4_teaser', 'Five minutes where the child is the boss — label a play session line by line.'))
          ),
          h('button', {
            onClick: function() { setPL({ view: 'm5' }); announceToSR(__alloT('stem.parentingLab.m5_open_sr', 'Opened module five: A B C at home.')); },
            className: 'w-full text-left rounded-2xl p-4 mb-3 transition-all hover:shadow-md',
            style: { background: pal.panel, border: '2px solid ' + pal.border, color: pal.text }
          },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('span', { className: 'font-black text-base' }, '🔁 ' + __alloT('stem.parentingLab.m5_title', 'M5 — ABC at Home')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.accent } },
                cardsRead(M5_CARDS) + '/' + M5_CARDS.length + ' ' + __alloT('stem.parentingLab.cards', 'cards') + ' · ' + Object.keys(d.abcDone || {}).length + '/' + M5_SCENES.length + ' ' + __alloT('stem.parentingLab.scenes', 'scenes'))
            ),
            h('p', { className: 'text-xs mt-1', style: { color: pal.muted } },
              __alloT('stem.parentingLab.m5_teaser', 'The checkout-line tantrum analyzed, the extinction burst, and the escalation trap that trains everyone.'))
          ),
          h('button', {
            onClick: function() { setPL({ view: 'm6' }); announceToSR(__alloT('stem.parentingLab.m6_open_sr', 'Opened module six: discipline evidence.')); },
            className: 'w-full text-left rounded-2xl p-4 mb-3 transition-all hover:shadow-md',
            style: { background: pal.panel, border: '2px solid ' + pal.border, color: pal.text }
          },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('span', { className: 'font-black text-base' }, '⚖️ ' + __alloT('stem.parentingLab.m6_title', 'M6 — Discipline: what the evidence says')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.accent } },
                cardsRead(M6_CARDS) + '/' + M6_CARDS.length + ' ' + __alloT('stem.parentingLab.cards', 'cards') + ' · ' + Object.keys(d.claimsDone || {}).length + '/' + M6_CLAIMS.length + ' ' + __alloT('stem.parentingLab.claims', 'claims'))
            ),
            h('p', { className: 'text-xs mt-1', style: { color: pal.muted } },
              __alloT('stem.parentingLab.m6_teaser', 'The spanking consensus, what to use instead, reward charts done right, and the ratio.'))
          ),
          h('button', {
            onClick: function() { setPL({ view: 'm7' }); announceToSR(__alloT('stem.parentingLab.m7_open_sr', 'Opened module seven: myths versus literature.')); },
            className: 'w-full text-left rounded-2xl p-4 mb-3 transition-all hover:shadow-md',
            style: { background: pal.panel, border: '2px solid ' + pal.border, color: pal.text }
          },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('span', { className: 'font-black text-base' }, '🔍 ' + __alloT('stem.parentingLab.m7_title', 'M7 — Myths vs. literature')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.accent } },
                cardsRead(M7_CARDS) + '/' + M7_CARDS.length + ' ' + __alloT('stem.parentingLab.cards', 'cards') + ' · ' + Object.keys(d.mythsDone || {}).length + '/' + M7_CLAIMS.length + ' ' + __alloT('stem.parentingLab.claims', 'claims'))
            ),
            h('p', { className: 'text-xs mt-1', style: { color: pal.muted } },
              __alloT('stem.parentingLab.m7_teaser', 'Praise junkies, screen-time panic, self-esteem, birth order — badge the claims yourself.'))
          ),
          h('button', {
            onClick: function() { setPL({ view: 'm8' }); announceToSR(__alloT('stem.parentingLab.m8_open_sr', 'Opened module eight: adolescents.')); },
            className: 'w-full text-left rounded-2xl p-4 mb-3 transition-all hover:shadow-md',
            style: { background: pal.panel, border: '2px solid ' + pal.border, color: pal.text }
          },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('span', { className: 'font-black text-base' }, '🧭 ' + __alloT('stem.parentingLab.m8_title', 'M8 — Adolescents: autonomy and staying in the room')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.accent } },
                cardsRead(M8_CARDS) + '/' + M8_CARDS.length + ' ' + __alloT('stem.parentingLab.cards', 'cards') + ' · ' + Object.keys(d.stanceDone || {}).length + '/' + M8_SCENES.length + ' ' + __alloT('stem.parentingLab.scenes', 'scenes'))
            ),
            h('p', { className: 'text-xs mt-1', style: { color: pal.muted } },
              __alloT('stem.parentingLab.m8_teaser', 'The monitoring plot twist: knowledge flows from relationship, not surveillance.'))
          ),
          h('button', {
            onClick: function() { setPL({ view: 'm9' }); announceToSR(__alloT('stem.parentingLab.m9_open_sr', 'Opened module nine: getting help and partnering with school.')); },
            className: 'w-full text-left rounded-2xl p-4 mb-3 transition-all hover:shadow-md',
            style: { background: pal.panel, border: '2px solid ' + pal.border, color: pal.text }
          },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('span', { className: 'font-black text-base' }, '🤲 ' + __alloT('stem.parentingLab.m9_title', 'M9 — When to seek help + partnering with school')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.accent } },
                cardsRead(M9_CARDS) + '/' + M9_CARDS.length + ' ' + __alloT('stem.parentingLab.cards', 'cards') + ' · ' + Object.keys(d.prepDone || {}).length + '/' + M9_CHECKLIST.length + ' ' + __alloT('stem.parentingLab.prep', 'prep items'))
            ),
            h('p', { className: 'text-xs mt-1', style: { color: pal.muted } },
              __alloT('stem.parentingLab.m9_teaser', 'Red flags as four dials, therapy names decoded, IEP/504 in plain English, and the meeting-prep checklist.'))
          )
        );
      }

      // ─────────────── M2 — Attachment ───────────────
      if (view === 'm2') {
        var sv = M2_SERVES[servesCurrent];
        var svDone = sv && servesDone[sv.id];
        function pickServe(optId) {
          if (!sv || svDone) return;
          var opt = null;
          for (var i = 0; i < sv.options.length; i++) if (sv.options[i].id === optId) opt = sv.options[i];
          if (!opt) return;
          var next = Object.assign({}, servesDone);
          next[sv.id] = { pick: optId, kind: opt.kind };
          setPL({ servesDone: next });
          if (opt.kind === 'return') awardXP(5, 'Serve returned');
          announceToSR(opt.kind === 'return'
            ? __alloT('stem.parentingLab.serve_return_sr', 'That is a return. Explanation shown below.')
            : __alloT('stem.parentingLab.serve_miss_sr', 'That one ends the rally. Explanation shown below.'));
        }
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
          moduleHeader('🤝 ' + __alloT('stem.parentingLab.m2_title', 'M2 — Attachment: the theory vs. the brand')),
          reviewBanner,
          contentCardList(M2_CARDS, 'All attachment cards read'),
          h('div', { className: 'rounded-2xl p-4', style: { background: pal.card, border: '2px solid ' + pal.border } },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap mb-2' },
              h('h3', { className: 'text-sm font-black', style: { color: pal.text } }, '🤝 ' + __alloT('stem.parentingLab.serves_title', 'Serve & Return studio')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.muted } }, (servesCurrent + 1) + ' / ' + M2_SERVES.length)
            ),
            h('p', { className: 'text-xs mb-3', style: { color: pal.muted } },
              __alloT('stem.parentingLab.serves_sub', 'Each scene is a serve. Pick the response that returns it. Misses are universal in every family — this is practice, not scoring.')),
            sv && h('div', { className: 'rounded-xl p-3 mb-3 text-sm leading-relaxed font-semibold', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, sv.serve),
            sv && h('div', { className: 'flex flex-col gap-2 mb-3' },
              sv.options.map(function(o) {
                var picked = svDone && svDone.pick === o.id;
                var isReturn = o.kind === 'return';
                var revealStyle = svDone
                  ? (isReturn
                    ? { background: 'rgba(5,150,105,0.1)', borderColor: 'rgba(5,150,105,0.5)', color: pal.text }
                    : (picked ? { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.5)', color: pal.text } : { background: pal.panel, borderColor: pal.border, color: pal.muted }))
                  : { background: pal.panel, borderColor: pal.border, color: pal.text };
                return h('button', {
                  key: o.id,
                  disabled: !!svDone,
                  onClick: function() { pickServe(o.id); },
                  className: 'text-left rounded-xl px-3 py-2 text-sm border-2 transition-colors disabled:cursor-default',
                  style: revealStyle
                }, (svDone && isReturn ? '✓ ' : '') + o.text);
              })
            ),
            sv && svDone && h('div', null,
              h('div', { className: 'rounded-xl p-3 text-xs leading-relaxed mb-3', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, sv.why),
              servesCurrent < M2_SERVES.length - 1
                ? h('button', { onClick: function() { setPL({ servesCurrent: servesCurrent + 1 }); }, className: 'rounded-lg px-4 py-2 text-xs font-black text-white', style: { background: pal.btn } }, __alloT('stem.parentingLab.serves_next', 'Next serve →'))
                : h('p', { className: 'text-xs font-bold', style: { color: pal.accent } }, __alloT('stem.parentingLab.serves_done', 'All serves played. Repair counts as a return served late — and the RCT core module turns this loop into daily skills.'))
            )
          )
        );
      }

      // Generic tag-quiz panel — one mechanic serving M3 (skills), M4 (PRIDE
      // labeler) and M5 (function analyzer): a scene, option chips, reveal, next.
      // cfg: { icon, title, sub, groupLabel, items:[{id, prompt, answer, why}],
      //        options:[{id,label}], doneKey, curKey, nextText, doneText, xpLabel }
      function tagQuiz(cfg) {
        var doneMap = d[cfg.doneKey] || {};
        var cur = d[cfg.curKey] || 0;
        var it = cfg.items[cur];
        var itDone = it && doneMap[it.id];
        function pickOpt(optId) {
          if (!it || itDone) return;
          var correct = it.answer === optId;
          var next = Object.assign({}, doneMap);
          next[it.id] = { pick: optId, correct: correct };
          var patch = {}; patch[cfg.doneKey] = next;
          setPL(patch);
          if (correct) awardXP(5, cfg.xpLabel);
          announceToSR(correct
            ? __alloT('stem.parentingLab.tag_hit_sr', 'Correct tag. Explanation shown below.')
            : __alloT('stem.parentingLab.tag_miss_sr', 'Different tag than intended. Explanation shown below.'));
        }
        function nextItem() { var patch = {}; patch[cfg.curKey] = cur + 1; setPL(patch); }
        return h('div', { className: 'rounded-2xl p-4', style: { background: pal.card, border: '2px solid ' + pal.border } },
          h('div', { className: 'flex items-center justify-between gap-2 flex-wrap mb-2' },
            h('h3', { className: 'text-sm font-black', style: { color: pal.text } }, cfg.icon + ' ' + cfg.title),
            h('span', { className: 'text-[11px] font-bold', style: { color: pal.muted } }, (cur + 1) + ' / ' + cfg.items.length)
          ),
          h('p', { className: 'text-xs mb-3', style: { color: pal.muted } }, cfg.sub),
          it && h('div', { className: 'rounded-xl p-3 mb-3 text-sm leading-relaxed', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, it.prompt),
          it && h('div', { role: 'group', 'aria-label': cfg.groupLabel, className: 'flex flex-wrap gap-2 mb-3' },
            cfg.options.map(function(s) {
              var picked = itDone && itDone.pick === s.id;
              var isAnswer = it.answer === s.id;
              var style = itDone
                ? (isAnswer
                  ? { background: 'rgba(5,150,105,0.15)', borderColor: 'rgba(5,150,105,0.55)', color: pal.text }
                  : (picked ? { background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.5)', color: pal.text } : { background: pal.panel, borderColor: pal.border, color: pal.muted }))
                : { background: pal.panel, borderColor: pal.border, color: pal.text };
              return h('button', {
                key: s.id,
                disabled: !!itDone,
                onClick: function() { pickOpt(s.id); },
                className: 'rounded-lg px-3 py-1.5 text-xs font-bold border-2 transition-colors disabled:cursor-default',
                style: style
              }, (itDone && isAnswer ? '✓ ' : '') + s.label);
            })
          ),
          it && itDone && h('div', null,
            h('div', { className: 'rounded-xl p-3 text-xs leading-relaxed mb-3', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, it.why),
            cur < cfg.items.length - 1
              ? h('button', { onClick: nextItem, className: 'rounded-lg px-4 py-2 text-xs font-black text-white', style: { background: pal.btn } }, cfg.nextText)
              : h('p', { className: 'text-xs font-bold', style: { color: pal.accent } }, cfg.doneText)
          )
        );
      }

      // ─────────────── M3 — The RCT core ───────────────
      if (view === 'm3') {
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
          moduleHeader('🧪 ' + __alloT('stem.parentingLab.m3_title', 'M3 — The RCT core')),
          reviewBanner,
          contentCardList(M3_CARDS, 'All RCT core cards read'),
          tagQuiz({
            icon: '🏷️', title: __alloT('stem.parentingLab.moves_title', 'Tag the skill'),
            sub: __alloT('stem.parentingLab.moves_sub', 'Each scene shows one concrete parent move from the trial-supported programs. Which shared skill is it?'),
            groupLabel: __alloT('stem.parentingLab.moves_group', 'Choose the skill'),
            items: M3_MOVES.map(function(m) { return { id: m.id, prompt: m.text, answer: m.skill, why: m.why }; }),
            options: M3_SKILLS, doneKey: 'movesDone', curKey: 'movesCurrent', xpLabel: 'Skill tagged',
            nextText: __alloT('stem.parentingLab.moves_next', 'Next move →'),
            doneText: __alloT('stem.parentingLab.moves_done', 'All moves tagged. These five skills are the trial-supported core — small, practicable, and learnable by anyone.')
          })
        );
      }

      // ─────────────── M4 — PRIDE Skills Studio ───────────────
      if (view === 'm4') {
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
          moduleHeader('🗣️ ' + __alloT('stem.parentingLab.m4_title', 'M4 — PRIDE Skills Studio')),
          reviewBanner,
          contentCardList(M4_CARDS, 'All PRIDE cards read'),
          tagQuiz({
            icon: '🎬', title: __alloT('stem.parentingLab.pride_title', 'Label the play session'),
            sub: __alloT('stem.parentingLab.pride_sub', 'A five-minute block session, one parent line at a time. Tag each line as a PRIDE skill or one of the three avoids. The avoids are normal parenting everywhere else — special time just practices switching them off.'),
            groupLabel: __alloT('stem.parentingLab.pride_group', 'Choose the label'),
            items: M4_UTTERANCES.map(function(u) {
              return { id: u.id, answer: u.answer, why: u.why,
                prompt: h('span', null, h('em', { style: { color: pal.muted } }, u.child + ' '), h('strong', null, u.parent)) };
            }),
            options: M4_LABELS, doneKey: 'prideDone', curKey: 'prideCurrent', xpLabel: 'Utterance labeled',
            nextText: __alloT('stem.parentingLab.pride_next', 'Next line →'),
            doneText: __alloT('stem.parentingLab.pride_done', 'Transcript labeled. Five minutes of this daily is the opening move of the trial-supported programs — and the deposit the ABC module spends.')
          })
        );
      }

      // ─────────────── M5 — ABC at Home ───────────────
      if (view === 'm5') {
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
          moduleHeader('🔁 ' + __alloT('stem.parentingLab.m5_title', 'M5 — ABC at Home')),
          reviewBanner,
          contentCardList(M5_CARDS, 'All ABC cards read'),
          tagQuiz({
            icon: '🔎', title: __alloT('stem.parentingLab.abc_title', 'What job is the behavior doing?'),
            sub: __alloT('stem.parentingLab.abc_sub', 'Read each scene as an ABC: what sets the stage, what the child does, what the behavior earns. Then tag the job. Remember the fifth card: a function is a description, not a verdict.'),
            groupLabel: __alloT('stem.parentingLab.abc_group', 'Choose the function'),
            items: M5_SCENES.map(function(s) { return { id: s.id, prompt: s.text, answer: s.answer, why: s.why }; }),
            options: M5_FUNCTIONS, doneKey: 'abcDone', curKey: 'abcCurrent', xpLabel: 'Function tagged',
            nextText: __alloT('stem.parentingLab.abc_next', 'Next scene →'),
            doneText: __alloT('stem.parentingLab.abc_done', 'All scenes analyzed. BehaviorLab teaches this science with full rigor; the School Behavior Toolkit shows the school side of the same triangle.')
          })
        );
      }

      // ─────────────── M6 — Discipline ───────────────
      if (view === 'm6') {
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
          moduleHeader('⚖️ ' + __alloT('stem.parentingLab.m6_title', 'M6 — Discipline: what the evidence says')),
          reviewBanner,
          contentCardList(M6_CARDS, 'All discipline cards read'),
          tagQuiz({
            icon: '🏅', title: __alloT('stem.parentingLab.claims_title', 'Tier the claims yourself'),
            sub: __alloT('stem.parentingLab.claims_sub', 'This module IS the badge system in action. Place each claim on the evidence tier it deserves.'),
            groupLabel: __alloT('stem.parentingLab.claims_group', 'Choose the evidence tier'),
            items: M6_CLAIMS.map(function(c) { return { id: c.id, prompt: c.text, answer: c.answer, why: c.why }; }),
            options: M6_BADGE_OPTIONS, doneKey: 'claimsDone', curKey: 'claimsCurrent', xpLabel: 'Claim tiered',
            nextText: __alloT('stem.parentingLab.claims_next', 'Next claim →'),
            doneText: __alloT('stem.parentingLab.claims_done', 'All claims tiered. That skill — asking "which tier is this?" before "should I do this?" — is the one this lab most wants to send home.')
          })
        );
      }

      // ─────────────── M7 — Myths vs. literature ───────────────
      if (view === 'm7') {
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
          moduleHeader('🔍 ' + __alloT('stem.parentingLab.m7_title', 'M7 — Myths vs. literature')),
          reviewBanner,
          contentCardList(M7_CARDS, 'All myth cards read'),
          tagQuiz({
            icon: '🃏', title: __alloT('stem.parentingLab.myths_title', 'Badge the claim'),
            sub: __alloT('stem.parentingLab.myths_sub', 'Headlines never carry evidence badges. Practice adding them yourself.'),
            groupLabel: __alloT('stem.parentingLab.myths_group', 'Choose the evidence tier'),
            items: M7_CLAIMS.map(function(c) { return { id: c.id, prompt: c.text, answer: c.answer, why: c.why }; }),
            options: M6_BADGE_OPTIONS, doneKey: 'mythsDone', curKey: 'mythsCurrent', xpLabel: 'Myth badged',
            nextText: __alloT('stem.parentingLab.myths_next', 'Next claim →'),
            doneText: __alloT('stem.parentingLab.myths_done', 'All claims badged. The pattern to keep: vivid and universal is not the same as true.')
          })
        );
      }

      // ─────────────── M8 — Adolescents ───────────────
      if (view === 'm8') {
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
          moduleHeader('🧭 ' + __alloT('stem.parentingLab.m8_title', 'M8 — Adolescents: autonomy and staying in the room')),
          reviewBanner,
          contentCardList(M8_CARDS, 'All adolescent cards read'),
          tagQuiz({
            icon: '🚪', title: __alloT('stem.parentingLab.stance_title', 'Support, control, or abdication?'),
            sub: __alloT('stem.parentingLab.stance_sub', 'Tag each response with the stance it embodies. Autonomy support keeps both the limit AND the relationship.'),
            groupLabel: __alloT('stem.parentingLab.stance_group', 'Choose the stance'),
            items: M8_SCENES.map(function(s) { return { id: s.id, prompt: s.text, answer: s.answer, why: s.why }; }),
            options: M8_STANCES, doneKey: 'stanceDone', curKey: 'stanceCurrent', xpLabel: 'Stance tagged',
            nextText: __alloT('stem.parentingLab.stance_next', 'Next scene →'),
            doneText: __alloT('stem.parentingLab.stance_done', 'All scenes tagged. The through-line since Module 2: the relationship is the channel everything else travels on.')
          })
        );
      }

      // ─────────────── M9 — Help + school ───────────────
      if (view === 'm9') {
        var prepDone = d.prepDone || {};
        function togglePrep(itemId) {
          var next = Object.assign({}, prepDone);
          if (next[itemId]) delete next[itemId]; else next[itemId] = true;
          setPL({ prepDone: next });
          var count = Object.keys(next).length;
          if (count === M9_CHECKLIST.length) { awardXP(10, 'Meeting prep complete'); announceToSR(__alloT('stem.parentingLab.prep_done_sr', 'Every prep item checked. You are ready for the meeting.')); }
        }
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
          moduleHeader('🤲 ' + __alloT('stem.parentingLab.m9_title', 'M9 — When to seek help + partnering with school')),
          reviewBanner,
          contentCardList(M9_CARDS, 'All help-and-school cards read'),
          h('div', { className: 'rounded-2xl p-4', style: { background: pal.card, border: '2px solid ' + pal.border } },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap mb-2' },
              h('h3', { className: 'text-sm font-black', style: { color: pal.text } }, '📋 ' + __alloT('stem.parentingLab.prep_title', 'Meeting-prep checklist')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.muted } }, Object.keys(prepDone).length + ' / ' + M9_CHECKLIST.length)
            ),
            h('p', { className: 'text-xs mb-3', style: { color: pal.muted } },
              __alloT('stem.parentingLab.prep_sub', 'Check items as you prepare. This list saves with the tool — reset it before each new meeting by unchecking.')),
            h('div', { className: 'flex flex-col gap-1.5' },
              M9_CHECKLIST.map(function(item) {
                var on = !!prepDone[item.id];
                return h('button', {
                  key: item.id,
                  role: 'checkbox', 'aria-checked': on,
                  onClick: function() { togglePrep(item.id); },
                  onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePrep(item.id); } },
                  className: 'text-left rounded-xl px-3 py-2 text-sm border-2 transition-colors flex items-start gap-2',
                  style: on
                    ? { background: 'rgba(5,150,105,0.1)', borderColor: 'rgba(5,150,105,0.45)', color: pal.text }
                    : { background: pal.panel, borderColor: pal.border, color: pal.text }
                },
                  h('span', { 'aria-hidden': 'true', className: 'font-black', style: { color: on ? '#059669' : pal.muted } }, on ? '☑' : '☐'),
                  h('span', null, item.text)
                );
              })
            )
          )
        );
      }

      // ─────────────── M1 ───────────────
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
        contentCardList(M1_CARDS, 'All Warmth & Structure cards read'),

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
