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
      note: 'A component of many trial-supported programs and AAP-endorsed — while heavily contested in popular parenting culture. "Done right" means brief, boring, age-appropriate, and ending in reconnection.' }
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

  // Locked previews for M4-M9 (content pending the spec review gate).
  var LOCKED_MODULES = [
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
      { id: 'pl_read_m1', label: 'Read all five Warmth & Structure cards', icon: '📖', check: function(d) { var m = (d && d.readCards) || {}; return ['two-dials', 'four-corners', 'causation', 'culture', 'so-what'].every(function(id) { return m[id]; }); }, progress: function(d) { var m = (d && d.readCards) || {}; return ['two-dials', 'four-corners', 'causation', 'culture', 'so-what'].filter(function(id) { return m[id]; }).length + '/5 cards'; } },
      { id: 'pl_dials', label: 'Rate 4 vignettes on both dials', icon: '🎛️', check: function(d) { return d && d.dialsDone && Object.keys(d.dialsDone).length >= 4; }, progress: function(d) { return ((d && d.dialsDone && Object.keys(d.dialsDone).length) || 0) + '/4 vignettes'; } },
      { id: 'pl_serves', label: 'Return 4 serves in the Serve & Return studio', icon: '🤝', check: function(d) { return d && d.servesDone && Object.keys(d.servesDone).length >= 4; }, progress: function(d) { return ((d && d.servesDone && Object.keys(d.servesDone).length) || 0) + '/4 serves'; } },
      { id: 'pl_skills', label: 'Tag 5 moves with the right shared skill', icon: '🧪', check: function(d) { return d && d.movesDone && Object.keys(d.movesDone).length >= 5; }, progress: function(d) { return ((d && d.movesDone && Object.keys(d.movesDone).length) || 0) + '/5 moves'; } }
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
                badgeChip(ev.badge, 'sm')
              ),
              h('div', { className: 'px-4 pb-4' },
                h('p', { className: 'text-sm leading-relaxed', style: { color: pal.text } }, c.body),
                h('p', { className: 'text-[11px] mt-2 font-semibold', style: { color: pal.muted } }, __alloT('stem.parentingLab.source', 'Source') + ': ' + ev.source + ' — ' + ev.note)
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

      // ─────────────── M3 — The RCT core ───────────────
      if (view === 'm3') {
        var mv = M3_MOVES[movesCurrent];
        var mvDone = mv && movesDone[mv.id];
        function pickSkill(skillId) {
          if (!mv || mvDone) return;
          var correct = mv.skill === skillId;
          var next = Object.assign({}, movesDone);
          next[mv.id] = { pick: skillId, correct: correct };
          setPL({ movesDone: next });
          if (correct) awardXP(5, 'Skill tagged');
          announceToSR(correct
            ? __alloT('stem.parentingLab.skill_hit_sr', 'Correct tag. Explanation shown below.')
            : __alloT('stem.parentingLab.skill_miss_sr', 'Different tag than intended. Explanation shown below.'));
        }
        return h('div', { className: 'max-w-3xl mx-auto p-4 animate-in fade-in duration-200', style: { color: pal.text } },
          moduleHeader('🧪 ' + __alloT('stem.parentingLab.m3_title', 'M3 — The RCT core')),
          reviewBanner,
          contentCardList(M3_CARDS, 'All RCT core cards read'),
          h('div', { className: 'rounded-2xl p-4', style: { background: pal.card, border: '2px solid ' + pal.border } },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap mb-2' },
              h('h3', { className: 'text-sm font-black', style: { color: pal.text } }, '🏷️ ' + __alloT('stem.parentingLab.moves_title', 'Tag the skill')),
              h('span', { className: 'text-[11px] font-bold', style: { color: pal.muted } }, (movesCurrent + 1) + ' / ' + M3_MOVES.length)
            ),
            h('p', { className: 'text-xs mb-3', style: { color: pal.muted } },
              __alloT('stem.parentingLab.moves_sub', 'Each scene shows one concrete parent move from the trial-supported programs. Which shared skill is it?')),
            mv && h('div', { className: 'rounded-xl p-3 mb-3 text-sm leading-relaxed font-semibold', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, mv.text),
            mv && h('div', { role: 'group', 'aria-label': __alloT('stem.parentingLab.moves_group', 'Choose the skill'), className: 'flex flex-wrap gap-2 mb-3' },
              M3_SKILLS.map(function(s) {
                var picked = mvDone && mvDone.pick === s.id;
                var isAnswer = mv.skill === s.id;
                var style = mvDone
                  ? (isAnswer
                    ? { background: 'rgba(5,150,105,0.15)', borderColor: 'rgba(5,150,105,0.55)', color: pal.text }
                    : (picked ? { background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.5)', color: pal.text } : { background: pal.panel, borderColor: pal.border, color: pal.muted }))
                  : { background: pal.panel, borderColor: pal.border, color: pal.text };
                return h('button', {
                  key: s.id,
                  disabled: !!mvDone,
                  onClick: function() { pickSkill(s.id); },
                  className: 'rounded-lg px-3 py-1.5 text-xs font-bold border-2 transition-colors disabled:cursor-default',
                  style: style
                }, (mvDone && isAnswer ? '✓ ' : '') + s.label);
              })
            ),
            mv && mvDone && h('div', null,
              h('div', { className: 'rounded-xl p-3 text-xs leading-relaxed mb-3', style: { background: pal.panel, border: '1px solid ' + pal.border, color: pal.text } }, mv.why),
              movesCurrent < M3_MOVES.length - 1
                ? h('button', { onClick: function() { setPL({ movesCurrent: movesCurrent + 1 }); }, className: 'rounded-lg px-4 py-2 text-xs font-black text-white', style: { background: pal.btn } }, __alloT('stem.parentingLab.moves_next', 'Next move →'))
                : h('p', { className: 'text-xs font-bold', style: { color: pal.accent } }, __alloT('stem.parentingLab.moves_done', 'All moves tagged. These five skills are the trial-supported core — small, practicable, and learnable by anyone.'))
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
