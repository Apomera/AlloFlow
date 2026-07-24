// ═══════════════════════════════════════════════════════════════
// sel_standards_alignment.js — Standards alignment data + helper
//
// Each SEL Hub tool can register a "Standards alignment" callout
// in its About view by calling:
//   window.SelHubStandards.render(toolId, h)
//
// The callout has three layers (designed to be useful at three
// different reading depths):
//   1. Construct headline — what habit or skill this tool builds.
//      Always visible. Useful for any reader.
//   2. CASEL alignment — primary CASEL competency and subcompetency.
//      Inside an expandable panel. Useful for SEL coordinators and
//      curriculum coordinators in CASEL-aligned districts.
//   3. Other framework parentheticals (EL Education HOWL, DBT, CBT,
//      MTSS tier, IDEA / IEP-504 use, trauma-informed practice).
//      Inside the same expandable. Useful where the school uses
//      that framework; invisible noise if not.
//
// The helper renders nothing if the toolId has no alignment data.
// Tools register their alignment in the ALIGNMENTS object below.
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ── Alignment data ──────────────────────────────────────────
  // Per-tool alignment to evidence-based SEL frameworks.
  //
  // Schema per tool:
  //   construct  : short headline phrase (universal habit / skill)
  //   casel      : [{ area, sub }]  // CASEL competency + subcompetency
  //   howl       : [{ area, note }] // EL Education HOWL where this fits
  //   other      : [{ framework, area, note }]  // DBT, CBT, MTSS, etc.
  //   crewPrompt : optional one-line Crew-time prompt
  var ALIGNMENTS = {

    // ═════════════════════════════════════════════════════════
    // SELF-AWARENESS
    // ═════════════════════════════════════════════════════════
    'zones': {
      construct: 'Identifying and naming your current emotional state.',
      casel: [{ area: 'Self-Awareness', sub: 'identifying emotions' }],
      howl: [{ area: 'Habits of Mind', note: 'noticing internal state' }],
      other: [
        { framework: 'Zones of Regulation', area: 'Kuypers framework' },
        { framework: 'MTSS', area: 'Tier 1 universal' }
      ],
      crewPrompt: 'Start of Crew: each student names their current zone in one word.',
      pairsWith: [
        { id: 'emotions', why: 'Zones name a coarse band; the feeling words add precision' },
        { id: 'coping', why: 'once you know the zone, pick a tool to shift it' },
        { id: 'windowOfTolerance', why: 'Zones for younger students; Window of Tolerance for trauma-informed framing' }
      ]
    },
    'emotions': {
      construct: 'Building emotional vocabulary so feelings become more nameable.',
      casel: [{ area: 'Self-Awareness', sub: 'identifying emotions' }],
      howl: [{ area: 'Habits of Mind', note: 'self-knowledge' }],
      other: [{ framework: 'MTSS', area: 'Tier 1 universal' }],
      pairsWith: [
        { id: 'zones', why: 'Zones are coarse bands; emotion words are the fine grain' },
        { id: 'thoughtRecord', why: 'a precise feeling word is column two of a CBT thought record' },
        { id: 'journal', why: 'reflective writing benefits from specific feeling words' }
      ],
      crewPrompt: 'Open Crew with one feeling word. Each student picks from the wheel; no explanations required.'
    },
    'strengths': {
      construct: 'Recognizing personal strengths and growth areas.',
      casel: [{ area: 'Self-Awareness', sub: 'recognizing strengths, self-confidence' }],
      howl: [{ area: 'Habits of Mind', note: 'accurate self-perception' }],
      pairsWith: [
        { id: 'viaStrengths', why: 'the lighter version; VIA is the full 24-strengths frame' },
        { id: 'onePageProfile', why: 'strengths populate "what people like and admire about me"' },
        { id: 'growthmindset', why: 'pairs strength-recognition with growth-edge naming' }
      ],
      crewPrompt: 'Each student names one strength they used this week. Crew responds with a quiet snap or nod.'
    },
    'viaStrengths': {
      construct: 'Identifying signature character strengths and using them on purpose.',
      casel: [{ area: 'Self-Awareness', sub: 'recognizing strengths, self-efficacy' }],
      howl: [{ area: 'Habits of Mind', note: 'self-knowledge' }],
      other: [
        { framework: 'Positive Psychology', area: 'VIA Classification (Peterson and Seligman, 2004)' }
      ],
      crewPrompt: 'Each student shares one signature strength and a recent moment they used it.',
      pairsWith: [
        { id: 'perma', why: 'same author tradition; using signature strengths raises PERMA' },
        { id: 'careerCompass', why: 'signature strengths often map to fitting work environments' },
        { id: 'onePageProfile', why: 'strengths belong on "what people like and admire about me"' }
      ]
    },
    'wheelOfLife': {
      construct: 'Honest self-portrait of where life is full and where it is thin.',
      casel: [{ area: 'Self-Awareness', sub: 'accurate self-perception' }],
      howl: [{ area: 'Habits of Mind', note: 'self-assessment' }],
      other: [{ framework: 'Coaching tradition', area: 'Co-Active Coaching' }],
      pairsWith: [
        { id: 'perma', why: 'similar life-domain map at a different granularity' },
        { id: 'sourcesOfStrength', why: 'thin domains often correlate with thin protective sources' }
      ],
      crewPrompt: 'Each student names one domain that feels full and one that feels thin. No fixing; Crew just witnesses.'
    },

    // ═════════════════════════════════════════════════════════
    // SELF-REGULATION
    // ═════════════════════════════════════════════════════════
    'coping': {
      construct: 'Building a portable toolkit of coping practices.',
      casel: [{ area: 'Self-Management', sub: 'stress management, impulse control' }],
      howl: [{ area: 'Active Engagement', note: 'staying regulated enough to engage' }],
      other: [{ framework: 'MTSS', area: 'Tier 1 / Tier 2' }],
      pairsWith: [
        { id: 'tipp', why: 'TIPP is the body-first emergency coping move' },
        { id: 'zones', why: 'name your zone, then pick a coping tool to shift it' },
        { id: 'windowOfTolerance', why: 'coping practices double as return-to-window practices' }
      ],
      crewPrompt: 'Each student names one coping practice they actually used this week. The collection becomes Crew\'s shared menu.'
    },
    'windowOfTolerance': {
      construct: 'Knowing your arousal zones and what brings you back to the window.',
      casel: [
        { area: 'Self-Awareness', sub: 'identifying emotions, body awareness' },
        { area: 'Self-Management', sub: 'stress management' }
      ],
      howl: [{ area: 'Active Engagement', note: 'students cannot actively engage outside their window' }],
      other: [
        { framework: 'Trauma-Informed', area: 'Siegel, 1999; standard at NCTSN' },
        { framework: 'MTSS', area: 'Tier 1 / Tier 2' }
      ],
      crewPrompt: 'Norm-setting: "If I am out of my window, I can ask for a 2-minute reset." Crew agrees.',
      pairsWith: [
        { id: 'tipp', why: 'TIPP is the body-first crisis skill when you\'re outside the window' },
        { id: 'stressBucket', why: 'Stress Bucket explains the accumulating load that narrows the window' },
        { id: 'sensoryRegulation', why: 'sensory profile reveals personal window-narrowing triggers' },
        { id: 'anxietyToolkit', why: 'anxiety pushes you above the window; tools to come back' }
      ]
    },
    'stressBucket': {
      construct: 'Naming what is filling your capacity and what is draining it.',
      casel: [
        { area: 'Self-Awareness', sub: 'accurate self-perception' },
        { area: 'Self-Management', sub: 'stress management' }
      ],
      howl: [{ area: 'Habits of Mind', note: 'self-assessment of capacity' }],
      other: [
        { framework: 'CBT', area: 'Brabban and Turkington, 2002; NHS IAPT' },
        { framework: 'MTSS', area: 'Tier 1 / Tier 2' }
      ],
      pairsWith: [
        { id: 'windowOfTolerance', why: 'overflowing bucket narrows the window over time' },
        { id: 'sleep', why: 'sleep is one of the most reliable taps draining the bucket' },
        { id: 'anxietyToolkit', why: 'when stressors are mostly worry, anxiety tools help drain the bucket' }
      ],
      crewPrompt: 'Round-robin: name one thing filling your bucket and one tap that is draining it. Names only.'
    },
    'transitions': {
      construct: 'Navigating change with skills, not just survival.',
      casel: [{ area: 'Self-Management', sub: 'stress management, self-discipline' }],
      howl: [{ area: 'Effective Effort', note: 'persistence through change' }],
      pairsWith: [
        { id: 'onePageProfile', why: 'a portable profile is invaluable at every transition point' },
        { id: 'griefLoss', why: 'some transitions involve real loss; grief work belongs alongside' },
        { id: 'path', why: 'PATH gives transitions a hopeful long-horizon shape' }
      ],
      crewPrompt: 'Each student names a transition they are inside right now, large or small. The naming is the work.'
    },
    'digitalWellbeing': {
      construct: 'Building a healthy relationship with screens, feeds, and chatbots.',
      casel: [
        { area: 'Self-Awareness', sub: 'self-perception, identifying emotions' },
        { area: 'Responsible Decision-Making', sub: 'evaluating consequences' }
      ],
      howl: [{ area: 'Habits of Mind', note: 'metacognition about attention' }],
      other: [{ framework: 'Media Literacy', area: 'Common Sense Media frameworks' }],
      pairsWith: [
        { id: 'safety', why: 'online safety planning belongs alongside digital wellbeing' },
        { id: 'sleep', why: 'phones and sleep are tightly coupled; one belongs in the other' },
        { id: 'mindfulness', why: 'attention is the muscle digital wellbeing protects' }
      ],
      crewPrompt: 'Each student names one digital habit they want to grow and one they want to shrink.'
    },

    // ═════════════════════════════════════════════════════════
    // INNER WORK
    // ═════════════════════════════════════════════════════════
    'mindfulness': {
      construct: 'Practicing present-moment awareness through breath and body.',
      casel: [{ area: 'Self-Awareness', sub: 'self-perception, identifying emotions' }],
      howl: [{ area: 'Habits of Mind', note: 'metacognitive attention' }],
      other: [
        { framework: 'Contemplative', area: 'MBSR / secular mindfulness' },
        { framework: 'MTSS', area: 'Tier 1 universal' }
      ],
      pairsWith: [
        { id: 'windowOfTolerance', why: 'mindfulness is the underlying skill of staying in the window' },
        { id: 'quietQuestions', why: 'mindfulness as a daily practice; Quiet Questions as a weekly contemplative practice' },
        { id: 'anxietyToolkit', why: 'grounding skills are mindfulness applied to acute anxiety' }
      ],
      crewPrompt: 'Three minutes of breath together. End with one word naming what you noticed.'
    },
    'quietQuestions': {
      construct: 'Sitting with one open-ended question for a week, without forcing an answer.',
      casel: [{ area: 'Self-Awareness', sub: 'self-reflection, accurate self-perception' }],
      howl: [{ area: 'Habits of Mind', note: 'sustained inquiry' }],
      other: [{ framework: 'Contemplative', area: 'Quaker query tradition (adapted secularly)' }],
      crewPrompt: 'Read this week\'s query aloud. Three minutes of silence. Optional pair-share.',
      pairsWith: [
        { id: 'journal', why: 'a query without writing often stays abstract; the journal holds the residue' },
        { id: 'orientations', why: 'wisdom traditions are the source of many of the queries' },
        { id: 'mindfulness', why: 'mindfulness is the daily practice; Quiet Questions the weekly one' }
      ]
    },
    'orientations': {
      construct: 'Comparing wisdom traditions on questions of life, suffering, and action.',
      casel: [{ area: 'Self-Awareness', sub: 'self-perception, examining values' }],
      howl: [{ area: 'Habits of Mind', note: 'comparative reasoning' }],
      other: [{ framework: 'Philosophy / Ethics', area: 'Cross-cultural wisdom traditions' }],
      pairsWith: [
        { id: 'valuesCommittedAction', why: 'orientations surface candidate values; ACT helps you commit and act on them' },
        { id: 'ethicalReasoning', why: 'ethical frameworks anchor what each tradition recommends' },
        { id: 'quietQuestions', why: 'each tradition\'s queries can become a week\'s contemplation' }
      ],
      crewPrompt: 'Read a one-sentence teaching from a tradition aloud. Two minutes of silence; one word each in response.'
    },
    'thoughtRecord': {
      construct: 'Catching automatic thoughts, testing them against evidence, arriving at a fair-minded read.',
      casel: [
        { area: 'Self-Awareness', sub: 'identifying emotions, self-reflection' },
        { area: 'Self-Management', sub: 'managing emotions' }
      ],
      howl: [{ area: 'Habits of Mind', note: 'metacognitive monitoring' }],
      other: [
        { framework: 'CBT', area: 'Beck, Burns, Padesky' },
        { framework: 'MTSS', area: 'Tier 2 targeted' }
      ],
      pairsWith: [
        { id: 'anxietyToolkit', why: 'thought records are core CBT-for-anxiety work' },
        { id: 'costBenefit', why: 'cost-benefit grid for decisions; thought record for thoughts' },
        { id: 'compassion', why: 'after challenging a thought, kinder self-talk is the next move' }
      ],
      crewPrompt: 'Each student names one recurring thought they have noticed lately. Naming alone makes it less sticky.'
    },
    'costBenefit': {
      construct: 'Widening the frame on a hard decision so emotion does not get the last word.',
      casel: [{ area: 'Responsible Decision-Making', sub: 'analyzing situations, evaluating consequences' }],
      howl: [{ area: 'Habits of Mind', note: 'deliberation under emotional pressure' }],
      other: [
        { framework: 'DBT', area: 'Distress Tolerance · pros and cons skill (Linehan)' },
        { framework: 'MTSS', area: 'Tier 1 / Tier 2' }
      ],
      pairsWith: [
        { id: 'thoughtRecord', why: 'thought record for distorted thinking; cost-benefit for actual decisions' },
        { id: 'bigFeelings', why: 'cost-benefit widens the choice point when angry' },
        { id: 'sfbt', why: 'when stuck on a decision, scaling questions and the miracle question add a different angle' }
      ],
      crewPrompt: 'Each student names a small decision they are sitting with. Crew offers one short-term and one long-term consideration, no advice.'
    },

    // ═════════════════════════════════════════════════════════
    // CARE OF SELF
    // ═════════════════════════════════════════════════════════
    'careConstellations': {
      construct: 'A relational map of who cares for you and who you care for.',
      casel: [
        { area: 'Self-Awareness', sub: 'self-perception in relationship' },
        { area: 'Relationship Skills', sub: 'developing positive relationships' }
      ],
      howl: [{ area: 'Crew Membership', note: 'awareness of belonging and contribution' }],
      other: [{ framework: 'Philosophy / Ethics', area: 'Care Ethics (Noddings); Foucault on care of the self' }],
      pairsWith: [
        { id: 'circlesOfSupport', why: 'similar relational map with different framing (rings of intimacy)' },
        { id: 'ecomap', why: 'systems-level view of the same network' },
        { id: 'sourcesOfStrength', why: 'Family + Friends + Mentors sources show up directly in your constellation' }
      ],
      crewPrompt: 'Each student names one person on their constellation they want to thank this week. The thanking is optional; the noticing is the practice.'
    },
    'ecomap': {
      construct: 'Seeing yourself in your environment: the systems that drain and fill you.',
      casel: [{ area: 'Self-Awareness', sub: 'self-perception in context' }],
      howl: [{ area: 'Habits of Mind', note: 'systems thinking about self' }],
      other: [
        { framework: 'Social Work', area: 'Hartman, 1978; NASW practice standard' },
        { framework: 'MTSS', area: 'Tier 2 / Tier 3 assessment' }
      ],
      pairsWith: [
        { id: 'careConstellations', why: 'similar map with a more poetic relational frame' },
        { id: 'circlesOfSupport', why: 'after mapping systems, ring-of-intimacy view reveals different patterns' },
        { id: 'stressBucket', why: 'the most draining systems on the ecomap are the heaviest stressors' }
      ],
      crewPrompt: 'Each student names one system that is draining them and one that is filling them.'
    },
    'circlesOfSupport': {
      construct: 'Seeing who is actually close, including when paid people fill the inner rings.',
      casel: [{ area: 'Relationship Skills', sub: 'developing positive relationships' }],
      howl: [{ area: 'Crew Membership', note: 'community as foundation' }],
      other: [{ framework: 'Person-Centered Planning', area: 'Forest and Snow, Inclusion Press' }],
      pairsWith: [
        { id: 'careConstellations', why: 'companion mapping tool with relational ethics framing' },
        { id: 'ecomap', why: 'systems view of similar territory' },
        { id: 'sourcesOfStrength', why: 'circles directly correspond to protective relational sources' }
      ],
      crewPrompt: 'Each student names one person in their inner circle and one in their friend circle. Pure naming.'
    },
    'genogram': {
      construct: 'A three-generation family map for personal self-understanding.',
      casel: [{ area: 'Self-Awareness', sub: 'self-perception in family context' }],
      howl: [{ area: 'Habits of Mind', note: 'understanding origins' }],
      other: [
        { framework: 'Family Systems', area: 'Bowen, 1978; McGoldrick-Gerson-Petry' },
        { framework: 'MTSS', area: 'Tier 3, with clinician' }
      ],
      pairsWith: [
        { id: 'ecomap', why: 'the social-work pair: genogram for family, ecomap for environment' },
        { id: 'circlesOfSupport', why: 'who is actually close, separate from biological family' },
        { id: 'careConstellations', why: 'the relational-ethics companion to family-systems mapping' }
      ],
      crewPrompt: 'Each student names one trait they think they inherited and one they have chosen. Family work is private; the noticing is shared.'
    },
    'compassion': {
      construct: 'Talking to yourself the way a wise friend would.',
      casel: [{ area: 'Self-Awareness', sub: 'self-perception, self-confidence' }],
      howl: [{ area: 'Habits of Mind', note: 'inner relationship' }],
      other: [{ framework: 'Positive Psychology', area: 'Self-Compassion (Neff)' }],
      pairsWith: [
        { id: 'thoughtRecord', why: 'after challenging a distorted thought, kinder self-talk is the next move' },
        { id: 'bodyStory', why: 'body image work surfaces the inner critic; self-compassion addresses it' }
      ],
      crewPrompt: 'Pair-share: what would a wise friend say to you about your hardest week so far? Two minutes each.'
    },

    // ═════════════════════════════════════════════════════════
    // SELF-DIRECTION
    // ═════════════════════════════════════════════════════════
    'goals': {
      construct: 'Setting concrete goals and tracking progress.',
      casel: [{ area: 'Self-Management', sub: 'goal-setting, self-motivation' }],
      howl: [{ area: 'Effective Effort', note: 'persistence toward a named target' }],
      pairsWith: [
        { id: 'path', why: 'PATH provides the long-horizon vision goals serve' },
        { id: 'execfunction', why: 'goals need executive function to actually move' },
        { id: 'howlTracker', why: 'HOWL growth areas convert directly into goals' }
      ],
      crewPrompt: 'Each student names one goal and one first step. Crew responds only with "I heard you," no advice.'
    },
    'howlTracker': {
      construct: 'Self-assessing the Habits of Work and Learning over time.',
      casel: [
        { area: 'Self-Awareness', sub: 'self-reflection' },
        { area: 'Self-Management', sub: 'self-discipline, goal-setting' }
      ],
      howl: [
        { area: 'Active Engagement', note: 'rated directly' },
        { area: 'Effective Effort', note: 'rated directly' },
        { area: 'Crew Membership', note: 'rated directly' },
        { area: 'Habits of Mind', note: 'rated directly' }
      ],
      other: [{ framework: 'EL Education', area: 'Designed to support Crew check-ins and HOWL grading' }],
      crewPrompt: 'Weekly: one strength and one growth area from your HOWL ratings.',
      pairsWith: [
        { id: 'goals', why: 'HOWL growth areas naturally turn into SMART goals' },
        { id: 'valuesCommittedAction', why: 'effective effort in service of named values' },
        { id: 'crewProtocols', why: 'Crew is the home of HOWL conversation' }
      ]
    },
    'onePageProfile': {
      construct: 'A portable self-portrait that helps adults support you well.',
      casel: [
        { area: 'Self-Awareness', sub: 'recognizing strengths, self-perception' },
        { area: 'Self-Management', sub: 'self-advocacy' }
      ],
      howl: [{ area: 'Crew Membership', note: 'sharing how you can be supported' }],
      other: [
        { framework: 'Person-Centered Planning', area: 'Helen Sanderson Associates' },
        { framework: 'IDEA / 504', area: 'Strengths-first companion to IEP / 504' },
        { framework: 'MTSS', area: 'Tier 2 / Tier 3 support planning' }
      ],
      crewPrompt: 'Each student shares one item from "How best to support me" with Crew.',
      pairsWith: [
        { id: 'selfAdvocacy', why: 'use One-Page Profile in IEP meetings; Self-Advocacy Studio scripts the asking' },
        { id: 'careerCompass', why: 'IEP transition planning often references both' },
        { id: 'maps', why: 'MAPS extends One-Page Profile with story + dream + first steps' }
      ]
    },
    'maps': {
      construct: 'Mapping who you are, where you have come from, and what you need.',
      casel: [
        { area: 'Self-Awareness', sub: 'recognizing strengths, self-perception' },
        { area: 'Self-Management', sub: 'goal-setting' }
      ],
      howl: [{ area: 'Habits of Mind', note: 'integrating story, gifts, and direction' }],
      other: [
        { framework: 'Person-Centered Planning', area: 'Pearpoint, O\'Brien, Forest (Inclusion Press)' },
        { framework: 'IDEA / 504', area: 'Transition planning' }
      ],
      pairsWith: [
        { id: 'path', why: 'MAPS describes who you are; PATH describes where you\'re going' },
        { id: 'onePageProfile', why: 'shorter portable version of similar person-centered work' },
        { id: 'careerCompass', why: 'gifts + needs sections often surface career direction' }
      ],
      crewPrompt: 'Pair-share: one minute on "who I am," one minute on "what I dream." Switch.'
    },
    'path': {
      construct: 'A hopeful long-horizon vision worked backward to first steps.',
      casel: [{ area: 'Self-Management', sub: 'goal-setting, self-motivation, organizational skills' }],
      howl: [{ area: 'Effective Effort', note: 'sustained action toward a named future' }],
      other: [
        { framework: 'Person-Centered Planning', area: 'Pearpoint, O\'Brien, Forest (Inclusion Press)' },
        { framework: 'IDEA / 504', area: 'Transition planning (especially HS to post-secondary)' }
      ],
      crewPrompt: 'In pairs: name your North Star in one sentence; partner names back what they heard.',
      pairsWith: [
        { id: 'maps', why: 'MAPS describes where you are; PATH describes where you\'re going' },
        { id: 'valuesCommittedAction', why: 'values clarification feeds the North Star' },
        { id: 'careerCompass', why: 'PATH is naturally a career-direction tool' }
      ]
    },
    'growthmindset': {
      construct: 'Reframing challenge as a brain that is being built.',
      casel: [{ area: 'Self-Management', sub: 'self-motivation, self-discipline' }],
      howl: [{ area: 'Effective Effort', note: 'persistence framed as growth' }],
      other: [{ framework: 'Positive Psychology', area: 'Growth Mindset (Dweck)' }],
      pairsWith: [
        { id: 'strengths', why: 'pairs strength-recognition with naming the growth edge honestly' },
        { id: 'thoughtRecord', why: 'a fixed-mindset thought is a thought you can challenge' },
        { id: 'compassion', why: 'growth mindset works best when paired with self-compassion, not self-attack' }
      ],
      crewPrompt: 'Each student names something they cannot do yet. The "yet" is the practice.'
    },
    'advocacy': {
      construct: 'Speaking up clearly for your needs, rights, and goals.',
      casel: [
        { area: 'Self-Awareness', sub: 'self-efficacy' },
        { area: 'Relationship Skills', sub: 'communication' }
      ],
      howl: [{ area: 'Crew Membership', note: 'voicing what you need in community' }],
      other: [
        { framework: 'Self-Determination Theory', area: 'Deci and Ryan' },
        { framework: 'IDEA / 504', area: 'Student-led IEP movement' }
      ],
      pairsWith: [
        { id: 'dearMan', why: 'self-advocacy framework + assertive script' },
        { id: 'onePageProfile', why: 'profile becomes the artifact you advocate with' },
        { id: 'sensoryRegulation', why: 'sensory profile feeds directly into accommodation asks' }
      ],
      crewPrompt: 'Each student names one need or right they want to speak up about. Crew witnesses; no action required today.'
    },
    'selfAdvocacy': {
      construct: 'Knowing your needs, your rights, and how to ask for accommodations.',
      casel: [
        { area: 'Self-Awareness', sub: 'self-efficacy, recognizing strengths and needs' },
        { area: 'Relationship Skills', sub: 'communication' },
        { area: 'Responsible Decision-Making', sub: 'identifying problems, asking for help' }
      ],
      howl: [
        { area: 'Crew Membership', note: 'asking for what you need is community work' },
        { area: 'Habits of Mind', note: 'self-knowledge as a foundation' }
      ],
      other: [
        { framework: 'Self-Determination Theory', area: 'Deci and Ryan' },
        { framework: 'IDEA / 504', area: 'Student-led IEP and accommodation requests' },
        { framework: 'Disability Justice', area: 'Naming disability identity on your own terms' }
      ],
      pairsWith: [
        { id: 'dearMan', why: 'Self-Advocacy gives the frame; DEAR MAN gives the script' },
        { id: 'onePageProfile', why: 'the artifact you bring to IEP meetings' },
        { id: 'sensoryRegulation', why: 'sensory profile is a top accommodation-driver' }
      ],
      crewPrompt: 'Each student names one accommodation that has helped, or one they think might. The collection normalizes asking.'
    },
    'execfunction': {
      construct: 'Building scaffolds for starting, holding, planning, and timing.',
      casel: [{ area: 'Self-Management', sub: 'self-discipline, organizational skills' }],
      howl: [
        { area: 'Effective Effort', note: 'maintaining work over time' },
        { area: 'Habits of Mind', note: 'planning and metacognition' }
      ],
      other: [
        { framework: 'Executive Function', area: 'Dawson and Guare' },
        { framework: 'MTSS', area: 'Tier 2 targeted (especially ADHD)' }
      ],
      pairsWith: [
        { id: 'goals', why: 'goals fail without the executive scaffolding to start and hold them' },
        { id: 'behavioralActivation', why: 'starting tiny defeats the activation gap that exec function struggles with' },
        { id: 'selfAdvocacy', why: 'accommodations for exec-function differences are often the missing piece' }
      ],
      crewPrompt: 'Each student names one task they are stuck on. Crew offers no advice; the naming is the first step.'
    },

    // ═════════════════════════════════════════════════════════
    // SOCIAL AWARENESS
    // ═════════════════════════════════════════════════════════
    'perspective': {
      construct: 'Seeing a situation from inside another person.',
      casel: [{ area: 'Social Awareness', sub: 'perspective-taking, empathy' }],
      howl: [{ area: 'Crew Membership', note: 'taking the other seriously' }],
      pairsWith: [
        { id: 'compassion', why: 'perspective-taking outward; self-compassion inward' },
        { id: 'conflict', why: 'conflict resolution starts with perspective-taking' },
        { id: 'ethicalReasoning', why: 'ethical reasoning is perspective-taking applied to harm' }
      ],
      crewPrompt: 'Read a two-sentence scenario. Each student names what one character might be feeling; no judgment of the answer.'
    },
    'community': {
      construct: 'Recognizing cultural identity and the community you belong to.',
      casel: [{ area: 'Social Awareness', sub: 'appreciating diversity, respect for others' }],
      howl: [{ area: 'Crew Membership', note: 'belonging in a wider community' }],
      pairsWith: [
        { id: 'cultureExplorer', why: 'community is the wider frame; culture explorer goes deep on specific traditions' },
        { id: 'identitySupport', why: 'identity belongs to community, and community shapes identity' },
        { id: 'civicAction', why: 'community is the unit that civic action acts within and for' }
      ],
      crewPrompt: 'Each student names one community they belong to that someone in Crew might not know about.'
    },
    'upstander': {
      construct: 'Stepping in safely when someone is being hurt.',
      casel: [
        { area: 'Social Awareness', sub: 'empathy, respect for others' },
        { area: 'Responsible Decision-Making', sub: 'ethical responsibility' }
      ],
      howl: [{ area: 'Crew Membership', note: 'showing up for the community' }],
      other: [{ framework: 'Bystander Intervention', area: 'Standard anti-bullying curricula' }],
      pairsWith: [
        { id: 'friendship', why: 'most bystander moments happen between friends' },
        { id: 'safety', why: 'upstander work needs a clear sense of when to escalate to adults' },
        { id: 'civicAction', why: 'upstanding is the personal scale of civic-action courage' }
      ],
      crewPrompt: 'Each student shares one moment they witnessed someone being kind or brave this week. Just witnessing the witnessing.'
    },
    'cultureExplorer': {
      construct: 'Learning from cultures beyond your own.',
      casel: [{ area: 'Social Awareness', sub: 'appreciating diversity' }],
      howl: [{ area: 'Habits of Mind', note: 'curiosity beyond the familiar' }],
      pairsWith: [
        { id: 'community', why: 'belonging in your community pairs with curiosity about other communities' },
        { id: 'identitySupport', why: 'identity work and cross-cultural learning reinforce each other' },
        { id: 'orientations', why: 'wisdom traditions are one of the deepest layers of culture' }
      ],
      crewPrompt: 'Each student names one cultural practice from a tradition other than their own that they have learned about and respect.'
    },
    'voicedetective': {
      construct: 'Reading emotion in tone of voice.',
      casel: [{ area: 'Social Awareness', sub: 'empathy, perspective-taking' }],
      howl: [{ area: 'Crew Membership', note: 'tuning in to each other' }],
      pairsWith: [
        { id: 'emotions', why: 'naming the feeling in your own voice + naming it in someone else\'s' },
        { id: 'perspective', why: 'tone is one of the most reliable channels for perspective-taking' },
        { id: 'sociallab', why: 'practice tone-reading in low-stakes simulated conversations' }
      ],
      crewPrompt: 'Listen to one short audio clip together. Each student names one emotion they hear in the tone; disagreement is welcome.'
    },

    // ═════════════════════════════════════════════════════════
    // RELATIONSHIP SKILLS
    // ═════════════════════════════════════════════════════════
    'conflict': {
      construct: 'Resolving conflict without escalating it.',
      casel: [{ area: 'Relationship Skills', sub: 'communication, conflict resolution' }],
      howl: [{ area: 'Crew Membership', note: 'repair as part of belonging' }],
      other: [{ framework: 'Restorative Practices', area: 'IIRP framework' }],
      pairsWith: [
        { id: 'dearMan', why: 'DEAR MAN gives you the assertive script to ask for what you need in conflict' },
        { id: 'perspective', why: 'perspective-taking is the precondition for de-escalation' },
        { id: 'restorativeCircle', why: 'restorative circle is the school-wide version of conflict repair' }
      ],
      crewPrompt: 'Each student names a low-stakes conflict from this week in one sentence. No resolution; just naming.'
    },
    'social': {
      construct: 'Practicing conversation, listening, and cooperation.',
      casel: [{ area: 'Relationship Skills', sub: 'communication, social engagement' }],
      howl: [{ area: 'Crew Membership', note: 'baseline community skills' }],
      pairsWith: [
        { id: 'sociallab', why: 'practice space for the conversation skills introduced here' },
        { id: 'friendship', why: 'friendship is where social skills get tested over time' },
        { id: 'voicedetective', why: 'reading tone is half of every conversation' }
      ],
      crewPrompt: 'Pair-share: what makes conversation feel easy with this person? One minute, then switch.'
    },
    'sociallab': {
      construct: 'Rehearsing real social situations in a low-stakes simulation.',
      casel: [
        { area: 'Relationship Skills', sub: 'communication, social engagement' },
        { area: 'Social Awareness', sub: 'perspective-taking' }
      ],
      howl: [{ area: 'Crew Membership', note: 'low-stakes rehearsal builds the muscle for real Crew' }],
      other: [{ framework: 'MTSS', area: 'Tier 1 / Tier 2 practice space' }],
      pairsWith: [
        { id: 'social', why: 'Social Skills introduces the moves; Social Skills Lab rehearses them' },
        { id: 'voicedetective', why: 'tone-reading skill is built in the same low-stakes practice space' },
        { id: 'conflicttheater', why: 'similar rehearsal frame applied to conflict moments specifically' }
      ],
      crewPrompt: 'Pick one scenario together. Two volunteers play it out; Crew names one thing the listener did well and one move that could have landed differently.'
    },
    'teamwork': {
      construct: 'Working well as part of a team, even with people you did not pick.',
      casel: [{ area: 'Relationship Skills', sub: 'teamwork, cooperative problem-solving' }],
      howl: [{ area: 'Crew Membership', note: 'contributing to the collective' }],
      pairsWith: [
        { id: 'crewProtocols', why: 'Crew is the EL Education home of teamwork practice' },
        { id: 'conflict', why: 'every team eventually needs conflict-repair skills' },
        { id: 'dearMan', why: 'team disagreements often need assertive direct asks' }
      ],
      crewPrompt: 'Each student names one role they play well on a team and one they want to grow into.'
    },
    'restorativeCircle': {
      construct: 'Building community and repairing harm through circle process.',
      casel: [
        { area: 'Relationship Skills', sub: 'communication, conflict resolution' },
        { area: 'Social Awareness', sub: 'respect for others' }
      ],
      howl: [{ area: 'Crew Membership', note: 'collective accountability and care' }],
      other: [
        { framework: 'Restorative Practices', area: 'Indigenous lineage; IIRP' },
        { framework: 'EL Education', area: 'Crew protocols draw heavily from circle practice' }
      ],
      pairsWith: [
        { id: 'crewProtocols', why: 'Crew uses circle practice as its core protocol' },
        { id: 'conflict', why: 'restorative circle is the community-level conflict-repair process' },
        { id: 'landPlace', why: 'circle practice has deep Indigenous roots tied to land and place' }
      ],
      crewPrompt: 'Use a talking piece. Round one: a moment of belonging this week. Round two: a moment that needed repair. Silence between rounds.'
    },
    'friendship': {
      construct: 'Recognizing healthy friendship and repairing when it frays.',
      casel: [{ area: 'Relationship Skills', sub: 'developing positive relationships' }],
      howl: [{ area: 'Crew Membership', note: 'one-on-one bonds within community' }],
      pairsWith: [
        { id: 'healthyRelationships', why: 'same skill family extended to dating + romantic relationships' },
        { id: 'conflict', why: 'most friendships eventually need conflict-repair skills' },
        { id: 'peersupport', why: 'friends are the first peer-support role most students hold' }
      ],
      crewPrompt: 'Each student names one quality they look for in a friend. The collection reveals what Crew values.'
    },
    'peersupport': {
      construct: 'Listening well to a peer in a hard moment, knowing when to get help.',
      casel: [
        { area: 'Social Awareness', sub: 'empathy' },
        { area: 'Relationship Skills', sub: 'communication' }
      ],
      howl: [{ area: 'Crew Membership', note: 'mutual support in community' }],
      other: [{ framework: 'Motivational Interviewing', area: 'OARS listening skills' }],
      pairsWith: [
        { id: 'sourcesOfStrength', why: 'the trained-peer-helper tradition this skill set serves' },
        { id: 'motivationalInterviewing', why: 'MI gives you the listening skills (OARS) peer support draws from' },
        { id: 'crisiscompanion', why: 'knowing when peer support is not enough and adult help is needed' }
      ],
      crewPrompt: 'Practice OARS: each student asks the person to their left one open question, then reflects back what they heard. No fixing.'
    },
    'conflicttheater': {
      construct: 'Practicing conflict in a low-stakes simulation before facing it in life.',
      casel: [{ area: 'Relationship Skills', sub: 'conflict resolution' }],
      howl: [{ area: 'Crew Membership', note: 'rehearsal as preparation for community' }],
      pairsWith: [
        { id: 'conflict', why: 'same skills; conflict tool teaches the frame, conflict theater rehearses it' },
        { id: 'dearMan', why: 'rehearse the DEAR MAN script in low stakes before the real conversation' },
        { id: 'restorativeCircle', why: 'rehearsal builds the muscle to take real circle work seriously' }
      ],
      crewPrompt: 'Pick a low-stakes scenario. Two volunteers role-play; Crew names what they noticed about each character\'s needs.'
    },

    // ═════════════════════════════════════════════════════════
    // RESPONSIBLE DECISION-MAKING
    // ═════════════════════════════════════════════════════════
    'decisions': {
      construct: 'Pausing to think before acting on impulse.',
      casel: [{ area: 'Responsible Decision-Making', sub: 'identifying problems, analyzing situations' }],
      howl: [{ area: 'Habits of Mind', note: 'deliberation' }],
      pairsWith: [
        { id: 'costBenefit', why: 'the DBT pros-and-cons grid is the structured version of this skill' },
        { id: 'ethicalReasoning', why: 'when a decision is also a moral question, frameworks help' },
        { id: 'valuesCommittedAction', why: 'values-anchored deciding is the ACT version of this skill' }
      ],
      crewPrompt: 'Each student names a small decision they are sitting with. Crew responds with "I heard you," not advice.'
    },
    'journal': {
      construct: 'Daily check-in to track moods, triggers, and reflections.',
      casel: [{ area: 'Self-Awareness', sub: 'identifying emotions, self-reflection' }],
      howl: [{ area: 'Habits of Mind', note: 'sustained self-tracking' }],
      pairsWith: [
        { id: 'emotions', why: 'feeling-word vocabulary makes journaling sharper' },
        { id: 'quietQuestions', why: 'a structured weekly inquiry alongside the daily check-in' },
        { id: 'thoughtRecord', why: 'when the journal surfaces a stuck thought, a CBT thought record can work on it' }
      ],
      crewPrompt: 'Two minutes of silent writing on one prompt. No sharing required; the writing is the practice.'
    },
    'safety': {
      construct: 'Knowing your boundaries and your trusted adults.',
      casel: [
        { area: 'Self-Awareness', sub: 'recognizing limits' },
        { area: 'Responsible Decision-Making', sub: 'identifying problems' }
      ],
      howl: [{ area: 'Crew Membership', note: 'asking for help is community work' }],
      pairsWith: [
        { id: 'crisiscompanion', why: 'the emergency-arm of the same skill, when safety is acutely threatened' },
        { id: 'healthyRelationships', why: 'relational safety is a core part of safety planning' },
        { id: 'digitalWellbeing', why: 'online safety is increasingly the most common safety question' }
      ],
      crewPrompt: 'Each student names one trusted adult they could ask for help. Crew witnesses the naming.'
    },
    'ethicalReasoning': {
      construct: 'Thinking through hard moral questions across multiple frameworks.',
      casel: [{ area: 'Responsible Decision-Making', sub: 'ethical responsibility, reflecting' }],
      howl: [{ area: 'Habits of Mind', note: 'principled reasoning' }],
      other: [{ framework: 'Philosophy / Ethics', area: 'Deontology, consequentialism, virtue, care' }],
      pairsWith: [
        { id: 'decisions', why: 'ethical reasoning is decision-making applied to moral questions' },
        { id: 'civicAction', why: 'public ethics is the basis of principled dissent' },
        { id: 'orientations', why: 'wisdom traditions offer the deepest ethical frameworks' }
      ],
      crewPrompt: 'Read a one-paragraph dilemma. Each student names which value matters most to them in that situation. Disagreement is welcome.'
    },

    // ═════════════════════════════════════════════════════════
    // STEWARDSHIP
    // ═════════════════════════════════════════════════════════
    'landPlace': {
      construct: 'Building an ongoing, honest relationship with the land you live on.',
      casel: [
        { area: 'Social Awareness', sub: 'appreciating diversity, respect for others' },
        { area: 'Responsible Decision-Making', sub: 'ethical responsibility' }
      ],
      howl: [{ area: 'Crew Membership', note: 'crew extends to land and ancestors' }],
      other: [{ framework: 'Place-Based Education', area: 'Indigenous-led; Sobel' }],
      pairsWith: [
        { id: 'careConstellations', why: 'care ethics extends beyond people to land and place' },
        { id: 'restorativeCircle', why: 'circle practice has Indigenous lineage rooted in land' },
        { id: 'civicAction', why: 'stewardship of place is a civic act' }
      ],
      crewPrompt: 'Each student names one detail about the land outside the school they have noticed this week. Pure noticing.'
    },
    'civicAction': {
      construct: 'Processing hard feelings about injustice and building civic agency.',
      casel: [
        { area: 'Social Awareness', sub: 'appreciating diversity, respect for others' },
        { area: 'Responsible Decision-Making', sub: 'ethical responsibility' }
      ],
      howl: [{ area: 'Crew Membership', note: 'community extends to civic life' }],
      pairsWith: [
        { id: 'ethicalReasoning', why: 'principled ethics anchors principled dissent' },
        { id: 'community', why: 'civic action is community work scaled to public life' },
        { id: 'upstander', why: 'upstanding at the personal scale; civic action at the public scale' }
      ],
      crewPrompt: 'Each student names one issue they care about in their community. Crew witnesses; no debate today.'
    },

    // ═════════════════════════════════════════════════════════
    // DBT / ACT NEW TOOLS
    // ═════════════════════════════════════════════════════════
    'tipp': {
      construct: 'Resetting acute distress in the body before talking your way out of it.',
      casel: [{ area: 'Self-Management', sub: 'stress management, impulse control' }],
      howl: [{ area: 'Active Engagement', note: 'crisis-grade regulation makes engagement possible again' }],
      other: [
        { framework: 'DBT', area: 'Distress Tolerance · TIPP (Linehan)' },
        { framework: 'MTSS', area: 'Tier 2 / Tier 3 crisis-survival skills' },
        { framework: 'Trauma-Informed', area: 'Body-first regulation' }
      ],
      crewPrompt: 'Walk through one TIPP skill (paced breathing is classroom-safe) so students have practiced before they need it.',
      pairsWith: [
        { id: 'windowOfTolerance', why: 'TIPP is HOW you come back when you\'re outside the window' },
        { id: 'bigFeelings', why: 'TIPP is the body-first move for hyperarousal anger' },
        { id: 'crisiscompanion', why: 'TIPP for the body; Crisis Companion for the next 30 minutes' }
      ]
    },
    'dearMan': {
      construct: 'Scripting a hard ask so the words are there when you need them.',
      casel: [
        { area: 'Relationship Skills', sub: 'communication, conflict resolution' },
        { area: 'Self-Awareness', sub: 'self-efficacy' }
      ],
      howl: [{ area: 'Crew Membership', note: 'asking and being asked for what is needed' }],
      other: [
        { framework: 'DBT', area: 'Interpersonal Effectiveness · DEAR MAN (Linehan)' },
        { framework: 'Self-Determination Theory', area: 'Agency in interpersonal context' },
        { framework: 'IDEA / 504', area: 'Student-led accommodation requests' }
      ],
      crewPrompt: 'Each student picks a real low-stakes ask, builds the script, then pair-practices with a partner playing the listener.',
      pairsWith: [
        { id: 'selfAdvocacy', why: 'Self-Advocacy Studio gives the framework; DEAR MAN gives the script' },
        { id: 'sensoryRegulation', why: 'use DEAR MAN to ask for sensory accommodations identified in your profile' },
        { id: 'healthyRelationships', why: 'DEAR MAN is the assertive-communication backbone of healthy relationships' },
        { id: 'onePageProfile', why: 'after building your profile, DEAR MAN helps you walk it into IEP meetings' }
      ]
    },
    'valuesCommittedAction': {
      construct: 'Naming what you actually care about, then doing the next small thing in service of it.',
      casel: [
        { area: 'Self-Awareness', sub: 'recognizing values, self-reflection' },
        { area: 'Self-Management', sub: 'goal-setting, self-motivation' }
      ],
      howl: [
        { area: 'Effective Effort', note: 'persistence in service of values' },
        { area: 'Habits of Mind', note: 'self-knowledge of what matters' }
      ],
      other: [
        { framework: 'ACT', area: 'Acceptance and Commitment Therapy (Hayes, Strosahl, Wilson)' },
        { framework: 'ACT', area: 'DNA-V adolescent framework (Hayes, Ciarrochi, Bailey)' },
        { framework: 'Self-Determination Theory', area: 'Intrinsic motivation through values' }
      ],
      crewPrompt: 'Each student names one top value and one committed action for the week. Next Crew: what got in the way?',
      pairsWith: [
        { id: 'careerCompass', why: 'values point toward careers more reliably than interests alone' },
        { id: 'path', why: 'values are the North Star; PATH walks you back to first steps' },
        { id: 'goals', why: 'values are directions; goals are concrete destinations along them' },
        { id: 'howlTracker', why: 'effective effort in service of named values' }
      ]
    },

    // ═════════════════════════════════════════════════════════
    // SUBSTANCE USE / IDENTITY SUPPORT
    // ═════════════════════════════════════════════════════════
    'substancePsychoed': {
      construct: 'Honest, harm-reduction-framed information about substances. Treating adolescents as capable of informed decisions.',
      casel: [
        { area: 'Self-Awareness', sub: 'understanding the body and consequences' },
        { area: 'Responsible Decision-Making', sub: 'analyzing situations, evaluating consequences, safety' }
      ],
      howl: [{ area: 'Habits of Mind', note: 'critical thinking about substances vs. moralistic framing' }],
      other: [
        { framework: 'Harm Reduction', area: 'National Harm Reduction Coalition framework' },
        { framework: 'SAMHSA', area: 'US federal substance use and mental health authority' },
        { framework: 'NIDA', area: 'National Institute on Drug Abuse adolescent research' },
        { framework: 'CRAFFT', area: 'Standard adolescent substance use screening tool' },
        { framework: 'MTSS', area: 'Tier 1 universal psychoeducation; Tier 2/3 SBIRT and treatment' }
      ],
      crewPrompt: 'Walk students through the adolescent-brain section as content (NOT screening for use). Pair with Motivational Interviewing tool — adolescents respond to MI-style conversations far better than to lecture or scare tactics.',
      pairsWith: [
        { id: 'motivationalInterviewing', why: 'MI is the evidence-based framework for substance-use behavior change' },
        { id: 'crisiscompanion', why: 'for acute crisis with substance involvement' },
        { id: 'behavioralActivation', why: 'BA addresses some underlying mood drivers of substance use' }
      ]
    },
    'identitySupport': {
      construct: 'A supportive, identity-affirming space for adolescents exploring gender, orientation, and broader identity.',
      casel: [
        { area: 'Self-Awareness', sub: 'self-perception, recognizing identity' },
        { area: 'Social Awareness', sub: 'appreciating diversity, respect for others' },
        { area: 'Relationship Skills', sub: 'developing positive relationships across difference' }
      ],
      howl: [
        { area: 'Habits of Mind', note: 'curiosity about self and others' },
        { area: 'Crew Membership', note: 'belonging across identity differences' }
      ],
      other: [
        { framework: 'Trevor Project', area: 'Primary LGBTQ+ youth mental health and crisis support framework' },
        { framework: 'GLSEN', area: 'School-focused LGBTQ+ student support' },
        { framework: 'PFLAG', area: 'Family-focused LGBTQ+ support' },
        { framework: 'Gender Spectrum', area: 'Trans and gender-expansive youth resources' },
        { framework: 'MTSS', area: 'Tier 1 universal inclusion; Tier 3 crisis support via Trevor Project' }
      ],
      crewPrompt: 'Run the vocabulary section as group content (NOT outing or pressuring anyone). Make pronouns part of class norms (name + pronoun in introductions, on emails). Have Trevor Project info visible.',
      pairsWith: [
        { id: 'crisiscompanion', why: 'LGBTQ+ youth face elevated suicide risk; Crisis Companion is critical' },
        { id: 'sourcesOfStrength', why: 'identity-affirming community is a major protective factor' },
        { id: 'careConstellations', why: 'mapping affirming relationships is core identity-support work' },
        { id: 'bodyStory', why: 'gender identity and body are interwoven; both deserve affirming work' }
      ]
    },

    // ═════════════════════════════════════════════════════════
    // BIG FEELINGS / HEALTHY RELATIONSHIPS
    // ═════════════════════════════════════════════════════════
    'bigFeelings': {
      construct: 'Anger is information, not a problem. Reactive aggression is the trap. The work is widening the gap between feeling and action.',
      casel: [
        { area: 'Self-Awareness', sub: 'identifying emotions, body awareness' },
        { area: 'Self-Management', sub: 'impulse control, stress management, managing emotions' }
      ],
      howl: [{ area: 'Habits of Mind', note: 'metacognitive awareness of the choice point' }],
      other: [
        { framework: 'CBT', area: 'Cognitive Behavioral Therapy for anger (Beck, Novaco, Deffenbacher)' },
        { framework: 'Coping Power Program', area: 'Lochman adolescent group-based intervention' },
        { framework: 'MTSS', area: 'Tier 1 universal psychoeducation; Tier 2/3 targeted aggression intervention' }
      ],
      crewPrompt: 'Each student names ONE recent trigger and ONE body sign they noticed. Practice the choice-point language as group vocabulary. No incident-reporting; just the framework.',
      pairsWith: [
        { id: 'tipp', why: 'TIPP is the body-first move when anger is acute' },
        { id: 'costBenefit', why: 'when angry, the cost-benefit grid widens the choice point' },
        { id: 'dearMan', why: 'channel anger into clear assertive ask instead of aggression' }
      ]
    },
    'healthyRelationships': {
      construct: 'The spectrum of healthy / unhealthy / abusive across 8 dimensions, plus consent and dating-violence prevention.',
      casel: [
        { area: 'Relationship Skills', sub: 'developing positive relationships, communication' },
        { area: 'Social Awareness', sub: 'respect for others, recognizing harm' },
        { area: 'Responsible Decision-Making', sub: 'identifying problems, ethical responsibility, safety' }
      ],
      howl: [{ area: 'Crew Membership', note: 'community norms about respect and consent' }],
      other: [
        { framework: 'Loveisrespect / NDVH', area: 'National Domestic Violence Hotline framework' },
        { framework: 'RAINN', area: 'Rape, Abuse & Incest National Network resources' },
        { framework: 'CDC Dating Matters', area: 'Evidence-based teen dating violence prevention curriculum' },
        { framework: 'MTSS', area: 'Tier 1 universal education; Tier 3 individual safety planning' }
      ],
      crewPrompt: 'Walk through the 8 dimensions and the consent principles as CONTENT (not personal disclosure). Pair with the Conflict Resolution and DEAR MAN tools for skill-building. Have hotline numbers visible.',
      pairsWith: [
        { id: 'dearMan', why: 'the assertive-ask backbone of healthy communication and consent' },
        { id: 'conflict', why: 'conflict resolution skills as part of relationship maintenance' },
        { id: 'identitySupport', why: 'queer and trans youth face specific relationship and dating-violence risks' }
      ]
    },

    // ═════════════════════════════════════════════════════════
    // BODY STORY / SOURCES OF STRENGTH
    // ═════════════════════════════════════════════════════════
    'bodyStory': {
      construct: 'Coming back home to your body. NOT weight or appearance; function, appreciation, and naming the cultural pressure.',
      casel: [
        { area: 'Self-Awareness', sub: 'self-perception, body awareness' },
        { area: 'Self-Management', sub: 'managing internalized pressure' }
      ],
      howl: [{ area: 'Habits of Mind', note: 'media literacy about body messaging' }],
      other: [
        { framework: 'Body Appreciation', area: 'Tylka and Wood-Barcalow framework' },
        { framework: 'Intuitive Eating', area: 'Tribole and Resch anti-diet framework' },
        { framework: 'Health at Every Size', area: 'ASDAH weight-inclusive framework' },
        { framework: 'NEDA', area: 'Eating disorder education and helpline referral' },
        { framework: 'MTSS', area: 'Tier 1 universal media literacy; clinical eating disorder treatment is Tier 3' }
      ],
      crewPrompt: 'Group activity: each student names one specific thing their body DID for them this week (not how it looked). The functional appreciation frame.',
      pairsWith: [
        { id: 'compassion', why: 'self-compassion practice works on the inner critic that body image often surfaces' },
        { id: 'identitySupport', why: 'body and gender identity are interwoven for many students' },
        { id: 'sensoryRegulation', why: 'a body-affirming sensory profile complements body-acceptance work' }
      ]
    },
    'sourcesOfStrength': {
      construct: 'Building protective factors upstream so crisis is less likely. Knowing your 8 sources, building the thin ones over time.',
      casel: [
        { area: 'Self-Awareness', sub: 'recognizing supports and resources' },
        { area: 'Relationship Skills', sub: 'developing positive relationships' },
        { area: 'Responsible Decision-Making', sub: 'identifying problems early; asking for help' }
      ],
      howl: [
        { area: 'Crew Membership', note: 'protective factors are largely relational' },
        { area: 'Habits of Mind', note: 'knowing your resources before crisis hits' }
      ],
      other: [
        { framework: 'Sources of Strength', area: 'Wyman et al. evidence-based youth suicide prevention' },
        { framework: 'AFSP', area: 'American Foundation for Suicide Prevention upstream-prevention framework' },
        { framework: 'MTSS', area: 'Tier 1 universal protective-factor building; complements Tier 3 crisis response' }
      ],
      crewPrompt: 'Each student names ONE of their strongest sources and ONE that is thin. No fixing; just naming. Builds the muscle of knowing your supports before you need them.',
      pairsWith: [
        { id: 'crisiscompanion', why: 'Sources of Strength is the upstream protective side; Crisis Companion is downstream' },
        { id: 'careConstellations', why: 'Friends + Family + Mentors sources translate into Care Constellations' },
        { id: 'identitySupport', why: 'identity-affirming community is a strong protective factor for LGBTQ+ youth' }
      ]
    },

    // ═════════════════════════════════════════════════════════
    // SENSORY / TRAUMA NEW TOOLS
    // ═════════════════════════════════════════════════════════
    'sensoryRegulation': {
      construct: 'Mapping your own sensory processing across the 8 sensory systems; planning regulating input on purpose.',
      casel: [
        { area: 'Self-Awareness', sub: 'body awareness, recognizing patterns and needs' },
        { area: 'Self-Management', sub: 'stress management, self-regulation' }
      ],
      howl: [{ area: 'Habits of Mind', note: 'self-knowledge about how I process the world' }],
      other: [
        { framework: 'Occupational Therapy', area: 'Ayres sensory integration; Dunn quadrants' },
        { framework: 'Neurodiversity', area: 'Identity-first framework (Singer, Walker, ASAN, Bogdashina)' },
        { framework: 'IDEA / 504', area: 'Accommodation planning for autistic, ADHD, and sensory-different students' },
        { framework: 'MTSS', area: 'Tier 2 / Tier 3, often OT-supported' }
      ],
      crewPrompt: 'Walk students through the 8 sensory systems as content (not screening). Each student names ONE system where they think they\'re a strong seeker or avoider. No more than that — invite, don\'t pry.',
      pairsWith: [
        { id: 'selfAdvocacy', why: 'sensory profile feeds directly into accommodation requests' },
        { id: 'dearMan', why: 'use DEAR MAN to script the accommodation ask' },
        { id: 'windowOfTolerance', why: 'sensory overload pushes you outside your window' },
        { id: 'onePageProfile', why: 'sensory profile belongs on the "how best to support me" section' }
      ]
    },
    'traumaPsychoed': {
      construct: 'Understanding what trauma is, what it does to the body and brain, and what trauma-informed care actually means. NOT a screening tool.',
      casel: [
        { area: 'Self-Awareness', sub: 'understanding the body and emotions' },
        { area: 'Social Awareness', sub: 'understanding what others may be carrying' }
      ],
      howl: [{ area: 'Habits of Mind', note: 'understanding the neurobiology of human responses' }],
      other: [
        { framework: 'Trauma-Informed', area: 'SAMHSA 6 principles framework' },
        { framework: 'NCTSN', area: 'National Child Traumatic Stress Network — gold standard for adolescent trauma work' },
        { framework: 'Trauma-Informed', area: 'Herman three-stage model (Safety, Remembrance, Reconnection)' },
        { framework: 'MTSS', area: 'Tier 1 universal psychoeducation; clinical work is Tier 3' }
      ],
      crewPrompt: 'Teach the neurobiology + SAMHSA 6 as content, not as an invitation to disclose. Students may approach an adult afterward; honor that as a sign of trust, not as something to extract.',
      pairsWith: [
        { id: 'windowOfTolerance', why: 'the Window framework is core trauma-informed practice' },
        { id: 'crisiscompanion', why: 'for students who recognize their experience in this material' },
        { id: 'griefLoss', why: 'trauma + grief often layered, especially after sudden loss' }
      ]
    },

    // ═════════════════════════════════════════════════════════
    // ANXIETY / SLEEP NEW TOOLS
    // ═════════════════════════════════════════════════════════
    'anxietyToolkit': {
      construct: 'Working with anxiety using evidence-based CBT skills, not against it.',
      casel: [
        { area: 'Self-Awareness', sub: 'identifying emotions, body awareness' },
        { area: 'Self-Management', sub: 'stress management, impulse control' }
      ],
      howl: [
        { area: 'Habits of Mind', note: 'metacognitive awareness of worry patterns' },
        { area: 'Active Engagement', note: 'staying engaged when anxiety wants to pull you out' }
      ],
      other: [
        { framework: 'CBT', area: 'Cognitive Behavioral Therapy for anxiety (Beck, Padesky)' },
        { framework: 'AACAP', area: 'American Academy of Child & Adolescent Psychiatry guidelines' },
        { framework: 'MTSS', area: 'Tier 1 universal psychoeducation; Tier 2 targeted skills' }
      ],
      crewPrompt: 'Walk students through the worry tree on a low-stakes group worry (e.g., "an unexpected fire drill happens during a test"). Practice the actionable/not-actionable fork before students need it.',
      pairsWith: [
        { id: 'thoughtRecord', why: 'CBT thought records work the underlying cognitive piece' },
        { id: 'windowOfTolerance', why: 'anxiety pushes you above the window; grounding brings you back' },
        { id: 'stressBucket', why: 'chronic anxiety often correlates with overflowing bucket' },
        { id: 'sleep', why: 'sleep deprivation worsens anxiety; anxiety worsens sleep' }
      ]
    },
    'sleep': {
      construct: 'Treating sleep as foundational health, not as optional. Identifying YOUR specific barriers.',
      casel: [
        { area: 'Self-Awareness', sub: 'noticing the body\'s state' },
        { area: 'Self-Management', sub: 'self-discipline, health habits' }
      ],
      howl: [
        { area: 'Active Engagement', note: 'you cannot actively engage on insufficient sleep' },
        { area: 'Effective Effort', note: 'sleep makes effort possible' }
      ],
      other: [
        { framework: 'AAP', area: 'American Academy of Pediatrics adolescent sleep guidelines (8-10 hours)' },
        { framework: 'CDC', area: 'CDC sleep recommendations and school start time research' },
        { framework: 'National Sleep Foundation', area: 'Evidence-based sleep hygiene' },
        { framework: 'MTSS', area: 'Tier 1 universal — affects everything else' }
      ],
      crewPrompt: 'One-week sleep diary as a group: each student commits to logging for 7 days. Next Crew: share what surprised you, no judgment. Patterns become visible quickly.',
      pairsWith: [
        { id: 'stressBucket', why: 'sleep is one of the foundational taps that drain the bucket' },
        { id: 'anxietyToolkit', why: 'anxious thoughts that prevent sleep have specific CBT-I-adjacent moves' },
        { id: 'behavioralActivation', why: 'low mood + poor sleep often respond to BA + sleep hygiene together' }
      ]
    },

    // ═════════════════════════════════════════════════════════
    // CREW PROTOCOLS / GRIEF & LOSS
    // ═════════════════════════════════════════════════════════
    'crewProtocols': {
      construct: 'Building community through structured group rituals practiced over time.',
      casel: [
        { area: 'Relationship Skills', sub: 'communication, social engagement, teamwork' },
        { area: 'Social Awareness', sub: 'respect for others, appreciating diversity' }
      ],
      howl: [{ area: 'Crew Membership', note: 'Crew is literally the EL Education core practice this tool collects' }],
      other: [
        { framework: 'EL Education', area: 'Crew protocols are the foundational community-building practice of EL schools' },
        { framework: 'Restorative Practices', area: 'IIRP circle traditions' },
        { framework: 'Tribes Learning Communities', area: 'Gibbs framework' },
        { framework: 'Responsive Classroom', area: 'Morning Meeting structure' },
        { framework: 'MTSS', area: 'Tier 1 universal community-building' }
      ],
      crewPrompt: 'For a new Crew: Week 1 = Community Agreement; Weeks 2-3 = daily One-Word Check-in; Week 4+ = add appreciations and deeper protocols.',
      pairsWith: [
        { id: 'howlTracker', why: 'Crew is the home of HOWL conversation' },
        { id: 'restorativeCircle', why: 'restorative circle is a deeper Crew protocol' },
        { id: 'griefLoss', why: 'community Crew is where collective grief work happens' }
      ]
    },
    'griefLoss': {
      construct: 'Companioning grief: naming the loss, working the tasks of mourning, finding ways to carry what was loved.',
      casel: [
        { area: 'Self-Awareness', sub: 'identifying emotions, self-perception' },
        { area: 'Self-Management', sub: 'managing emotions over time' }
      ],
      howl: [{ area: 'Habits of Mind', note: 'integrating loss into self-understanding' }],
      other: [
        { framework: 'Grief Counseling', area: 'Worden\'s Tasks of Mourning (1991, 2018 4th ed.)' },
        { framework: 'Grief Counseling', area: 'Dual Process Model (Stroebe and Schut, 1999)' },
        { framework: 'Grief Counseling', area: 'Ambiguous Loss framework (Boss, 1999)' },
        { framework: 'MTSS', area: 'Tier 2 / Tier 3, often paired with a counselor' }
      ],
      crewPrompt: 'After a community loss: name what happened factually, acknowledge all feelings are valid, ask what students need today (silence / conversation / different subject). See the Heavy News Day Crew protocol.',
      pairsWith: [
        { id: 'crisiscompanion', why: 'if grief stirs ideation or unsafe feelings — Crisis Companion is the next step' },
        { id: 'careConstellations', why: 'after loss, mapping who is still in your circle helps' },
        { id: 'crewProtocols', why: 'the Heavy News Day Crew protocol is built for community grief' }
      ]
    },

    // ═════════════════════════════════════════════════════════
    // PERMA / MI NEW TOOLS
    // ═════════════════════════════════════════════════════════
    'perma': {
      construct: 'A self-portrait of human flourishing across the five (six) PERMA domains.',
      casel: [
        { area: 'Self-Awareness', sub: 'accurate self-perception, recognizing strengths' }
      ],
      howl: [{ area: 'Habits of Mind', note: 'multi-dimensional self-assessment' }],
      other: [
        { framework: 'Positive Psychology', area: 'PERMA wellbeing model (Seligman, 2011)' },
        { framework: 'Positive Psychology', area: 'PERMA-Profiler measurement (Butler and Kern, 2016)' }
      ],
      crewPrompt: 'Each student names one PERMA domain that\'s going well and one that\'s going thin this week. No fixing, just naming.',
      pairsWith: [
        { id: 'viaStrengths', why: 'same author (Seligman); using signature strengths in new ways raises PERMA scores' },
        { id: 'wheelOfLife', why: 'similar self-portrait at a different granularity' },
        { id: 'behavioralActivation', why: 'low Positive Emotion / Engagement scores often respond to BA' }
      ]
    },
    'motivationalInterviewing': {
      construct: 'Helping someone (or yourself) think through a change by listening rather than persuading.',
      casel: [
        { area: 'Social Awareness', sub: 'empathy, perspective-taking' },
        { area: 'Relationship Skills', sub: 'communication, active listening' }
      ],
      howl: [{ area: 'Crew Membership', note: 'supporting peers without directing them' }],
      other: [
        { framework: 'Motivational Interviewing', area: 'Miller and Rollnick framework; ~hundreds of RCTs across health behaviors' },
        { framework: 'School Counseling', area: 'Widely used in school counseling practice and peer-helper training' },
        { framework: 'MTSS', area: 'Tier 1 / Tier 2 peer-support and counseling skill' }
      ],
      crewPrompt: 'In pairs, one student names a small change they\'re considering; the partner uses only Open questions and Reflections for 5 minutes — no advice.',
      pairsWith: [
        { id: 'peersupport', why: 'OARS is the foundational peer-helper skill' },
        { id: 'substancePsychoed', why: 'MI is the evidence-based framework for substance-use behavior change' },
        { id: 'sfbt', why: 'SFBT and MI are complementary brief-intervention approaches' }
      ]
    },

    // ═════════════════════════════════════════════════════════
    // CAREER EXPLORATION
    // ═════════════════════════════════════════════════════════
    'careerCompass': {
      construct: 'Exploring what kind of work might fit you, starting with interests rather than job titles.',
      casel: [
        { area: 'Self-Awareness', sub: 'recognizing strengths and interests, self-perception' },
        { area: 'Self-Management', sub: 'goal-setting, self-motivation' },
        { area: 'Responsible Decision-Making', sub: 'analyzing situations, evaluating options' }
      ],
      howl: [
        { area: 'Habits of Mind', note: 'self-knowledge oriented toward future work' },
        { area: 'Effective Effort', note: 'concrete next steps build career direction over time' }
      ],
      other: [
        { framework: 'Holland RIASEC', area: 'Vocational interest framework (Holland, 1959-1997)' },
        { framework: 'O*NET', area: 'US Department of Labor career database; Interest Profiler validated assessment' },
        { framework: 'Career Clusters', area: 'US Department of Education 16-cluster framework; CTE pathway alignment' },
        { framework: 'IDEA / 504', area: 'Transition planning (especially for students 14+ with IEPs)' }
      ],
      crewPrompt: 'Each student shares their Holland code + one career they want to know more about. Group up by Cluster for a 5-minute "what would you ask someone in this field" brainstorm.',
      pairsWith: [
        { id: 'valuesCommittedAction', why: 'careers that fit your values, not just your interests' },
        { id: 'viaStrengths', why: 'signature strengths often map to specific work environments' },
        { id: 'path', why: 'after picking a direction, PATH plans the first steps' },
        { id: 'onePageProfile', why: 'bring your code to IEP transition planning conversations' }
      ]
    },

    // ═════════════════════════════════════════════════════════
    // SFBT / BA NEW TOOLS
    // ═════════════════════════════════════════════════════════
    'sfbt': {
      construct: 'Looking forward instead of backward: what would better look like, and what is already working?',
      casel: [
        { area: 'Self-Awareness', sub: 'self-reflection, recognizing strengths' },
        { area: 'Responsible Decision-Making', sub: 'identifying problems, analyzing situations' }
      ],
      howl: [
        { area: 'Habits of Mind', note: 'solution-oriented thinking' },
        { area: 'Effective Effort', note: 'naming a half-point step builds momentum' }
      ],
      other: [
        { framework: 'SFBT', area: 'Solution-Focused Brief Therapy (de Shazer, Berg)' },
        { framework: 'School Counseling', area: 'Standard technique in US school counseling practice' },
        { framework: 'MTSS', area: 'Tier 1 / Tier 2 brief counseling' }
      ],
      crewPrompt: 'Each student names one thing they want to be different by Friday, scales where they are now, names one small step.',
      pairsWith: [
        { id: 'motivationalInterviewing', why: 'SFBT and MI are complementary brief-intervention approaches' },
        { id: 'costBenefit', why: 'when stuck on a decision, scaling questions add a different angle' },
        { id: 'goals', why: 'the "smallest half-point step" is a SFBT-flavored goal' }
      ]
    },
    'behavioralActivation': {
      construct: 'Acting first, even when mood is low; mood follows action more reliably than action follows mood.',
      casel: [
        { area: 'Self-Management', sub: 'self-discipline, goal-setting, self-motivation' },
        { area: 'Self-Awareness', sub: 'identifying patterns in mood and activity' }
      ],
      howl: [
        { area: 'Active Engagement', note: 'small actions build re-engagement' },
        { area: 'Effective Effort', note: 'persistence through low motivation' }
      ],
      other: [
        { framework: 'CBT', area: 'Behavioral Activation (Lewinsohn, Jacobson, Martell)' },
        { framework: 'MTSS', area: 'Tier 2 / Tier 3 for low mood and depression' }
      ],
      crewPrompt: 'Each student picks one small activity from each of the 5 categories for the week; next Crew, report back what surprised you.',
      pairsWith: [
        { id: 'perma', why: 'BA directly raises Positive Emotion and Engagement scores' },
        { id: 'sleep', why: 'low mood + poor sleep often need BA + sleep hygiene together' },
        { id: 'anxietyToolkit', why: 'avoidance is a maintaining factor for both depression and anxiety' }
      ]
    },

    // ═════════════════════════════════════════════════════════
    // CRISIS COMPANION
    // ═════════════════════════════════════════════════════════
    'crisiscompanion': {
      construct: 'Naming a hard moment and finding the next safe step.',
      casel: [
        { area: 'Self-Awareness', sub: 'identifying emotions, recognizing limits' },
        { area: 'Responsible Decision-Making', sub: 'identifying problems, asking for help' }
      ],
      howl: [{ area: 'Crew Membership', note: 'asking for help is community work' }],
      other: [
        { framework: 'Suicide Prevention', area: 'AFSP, SAMHSA, Sources of Strength, QPR' },
        { framework: 'MTSS', area: 'Tier 3, paired with adult support' }
      ],
      pairsWith: [
        { id: 'sourcesOfStrength', why: 'Crisis Companion is downstream; Sources of Strength builds the upstream protective side' },
        { id: 'tipp', why: 'TIPP for the body-first crisis move; Crisis Companion for the next 30 minutes' },
        { id: 'griefLoss', why: 'when grief crosses into ideation or unsafe feelings' },
        { id: 'identitySupport', why: 'Trevor Project + identity-affirming resources for LGBTQ+ youth crisis' }
      ],
      crewPrompt: 'Show Crew where Crisis Companion lives. Each student bookmarks it on their device. The practice is making the door findable before anyone needs it.'
    }
  };

  // ── Helper: render the standards alignment callout ───────────
  // ctx is optional; when present and ctx.setSelHubTool exists, the
  // pairsWith items become clickable navigation buttons that jump to
  // the paired tool. Without ctx, pairsWith renders as text only.
  function render(toolId, h, ctx) {
    var data = ALIGNMENTS[toolId];
    if (!data || !h) return null;

    // The "Universal construct" headline is always visible.
    var headline = h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #1e293b', borderRight: '1px solid #1e293b', borderBottom: '1px solid #1e293b', borderLeft: '3px solid #64748b', marginBottom: 0 } },
      h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Strengthens'),
      h('div', { style: { fontSize: 13.5, color: '#e2e8f0', lineHeight: 1.6, fontWeight: 600 } }, data.construct)
    );

    // Build the framework rows (collapsed by default).
    var rows = [];
    if (data.casel && data.casel.length) {
      data.casel.forEach(function(c, i) {
        rows.push(h('div', { key: 'casel_' + i, style: rowStyle('#6366f1') },
          h('span', { style: tagStyle('#6366f1') }, 'CASEL'),
          h('span', { style: areaStyle() }, c.area),
          c.sub ? h('span', { style: subStyle() }, ' · ' + c.sub) : null
        ));
      });
    }
    if (data.howl && data.howl.length) {
      data.howl.forEach(function(h2, i) {
        rows.push(h('div', { key: 'howl_' + i, style: rowStyle('#10b981') },
          h('span', { style: tagStyle('#10b981') }, 'EL HOWL'),
          h('span', { style: areaStyle() }, h2.area),
          h2.note ? h('span', { style: subStyle() }, ' · ' + h2.note) : null
        ));
      });
    }
    if (data.other && data.other.length) {
      data.other.forEach(function(o, i) {
        rows.push(h('div', { key: 'other_' + i, style: rowStyle('#a78bfa') },
          h('span', { style: tagStyle('#a78bfa') }, o.framework),
          h('span', { style: areaStyle() }, o.area),
          o.note ? h('span', { style: subStyle() }, ' · ' + o.note) : null
        ));
      });
    }

    var expandable = h('details', { style: { marginTop: 6 } },
      h('summary', { style: { cursor: 'pointer', fontSize: 11, color: '#94a3b8', userSelect: 'none', padding: '4px 0' } },
        '📐 Standards alignment'),
      h('div', { style: { marginTop: 6, padding: 10, borderRadius: 8, background: '#1e293b', display: 'flex', flexDirection: 'column', gap: 4 } },
        rows.length > 0 ? rows : h('div', { style: { fontSize: 11, color: '#64748b', fontStyle: 'italic' } }, '(no framework codes yet)'),
        data.crewPrompt ? h('div', { style: { marginTop: 8, padding: 8, borderRadius: 6, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 11.5, color: '#a7f3d0', lineHeight: 1.5 } },
          h('strong', { style: { color: '#10b981' } }, 'Crew prompt: '), data.crewPrompt) : null
      )
    );

    // ── Pairs naturally with ──────────────────────────────────
    // pairsWith is an array of { id: 'toolId', why: 'short reason' }.
    // Renders a small panel below the headline naming related tools so
    // the 90+ tool suite feels like a connected system, not a list.
    var pairsPanel = null;
    if (data.pairsWith && data.pairsWith.length) {
      var canNavigate = !!(ctx && typeof ctx.setSelHubTool === 'function');
      pairsPanel = h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', borderTop: '1px solid rgba(99,102,241,0.3)', borderRight: '1px solid rgba(99,102,241,0.3)', borderBottom: '1px solid rgba(99,102,241,0.3)', borderLeft: '3px solid #6366f1' } },
        h('div', { style: { fontSize: 10, color: '#a5b4fc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 } }, '🔗 Pairs naturally with'),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          data.pairsWith.map(function(p, i) {
            var label = p.id;
            var toolExists = false;
            if (window.SelHub && window.SelHub._registry && window.SelHub._registry[p.id]) {
              toolExists = true;
              if (window.SelHub._registry[p.id].label) {
                label = window.SelHub._registry[p.id].label;
              }
            }
            var nameNode = h('strong', { style: { color: '#c7d2fe' } }, label);
            var whyNode = p.why ? h('span', { style: { color: '#94a3b8' } }, ' · ' + p.why) : null;

            if (canNavigate && toolExists) {
              return h('button', {
                key: i,
                type: 'button',
                onClick: function() {
                  try { ctx.setSelHubTool(p.id); } catch (e) {}
                  if (ctx.announceToSR) {
                    try { ctx.announceToSR('Opened ' + label); } catch (e2) {}
                  }
                },
                'aria-label': 'Open ' + label + (p.why ? '. ' + p.why : ''),
                style: {
                  textAlign: 'left',
                  display: 'block',
                  width: '100%',
                  fontSize: 12,
                  color: '#cbd5e1',
                  lineHeight: 1.55,
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: 6,
                  padding: '7px 9px',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }
              },
                h('span', { 'aria-hidden': 'true', style: { marginRight: 6, color: '#818cf8' } }, '→'),
                nameNode,
                whyNode
              );
            }

            return h('div', { key: i, style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } },
              nameNode,
              whyNode
            );
          })
        )
      );
    }

    return h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
      headline,
      pairsPanel,
      expandable
    );
  }

  function rowStyle(color) {
    return { display: 'flex', alignItems: 'baseline', gap: 4, fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.55, flexWrap: 'wrap' };
  }
  function tagStyle(color) {
    return { display: 'inline-block', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: color + '22', color: color, letterSpacing: 0.5, textTransform: 'uppercase', minWidth: 50, textAlign: 'center' };
  }
  function areaStyle() {
    return { fontWeight: 700, color: '#e2e8f0' };
  }
  function subStyle() {
    return { color: '#94a3b8' };
  }

  // ── Expose globally ──────────────────────────────────────────
  window.SelHubStandards = {
    alignments: ALIGNMENTS,
    render: render
  };
})();
