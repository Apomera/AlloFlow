// Remixable OER Starter Packet Library for offline student packets.
// Plain UMD script for browser pages (window.AlloPacketStarterPacks) and Node (module.exports).
// Curated catalog of 25 open-source, offline-first starter packets spanning every Packets domain.
// Zero network, zero cookies, zero markup strings, deterministic output.
(function (root) {
  'use strict';

  var VERSION = 1;

  var SUBJECTS = [
    'Literacy',
    'Math',
    'Science',
    'STEM',
    'Life Skills',
    'AAC & Access',
    'SEL & Focus',
    'Unit Playlist',
  ];

  var GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12', 'K-12'];

  var FEATURES = [
    'Practice',
    'Check',
    'Bilingual Family Kit',
    'Switch-Accessible',
    'Print-Ready',
    'UDL Choice',
    'Non-Scored Support',
  ];

  var PACKS = [
    {
      id: 'oer_phonics_cvc_k2',
      title: 'Short Vowel CVC Word Sounds',
      subject: 'Literacy',
      gradeBand: 'K-2',
      standards: 'CCSS RF.K-1.2-3',
      features: ['Practice', 'Print-Ready'],
      summary: 'Ten foundational short-vowel CVC words ready to pair with classroom recordings or speech in the Word Sounds maker.',
      makerName: 'Word Sounds',
      makerHref: 'packets-make.html',
      directDownload: false,
      handoffReason: 'Opens in Word Sounds so you can attach spoken voice recordings and optional picture cards.',
      draft: {
        kind: 'word_sounds',
        title: 'Short Vowel CVC Word Sounds',
        lang: 'en',
        pattern: 'Short vowel CVC',
        words: ['cat', 'map', 'bed', 'pen', 'pig', 'sit', 'dog', 'hop', 'bug', 'sun'],
      },
    },
    {
      id: 'oer_vocab_tier2_g35',
      title: 'Tier 2 Academic Vocabulary',
      subject: 'Literacy',
      gradeBand: '3-5',
      standards: 'CCSS L.3-5.6',
      features: ['Practice', 'Bilingual Family Kit'],
      summary: 'Eight high-utility academic words (analyze, compare, evidence, observe, predict, classify, summary, solution) with plain meanings and examples.',
      makerName: 'Vocabulary',
      makerHref: 'packets-vocab.html',
      directDownload: false,
      handoffReason: 'Opens in Vocabulary so you can add audio pronunciation, home-language notes, or custom pictures.',
      draft: {
        kind: 'vocab',
        title: 'Tier 2 Academic Vocabulary',
        lang: 'en',
        entries: [
          { word: 'analyze', meaning: 'Look closely at the parts of something to understand how it works.', example: 'We can analyze the chart to see which plant grew fastest.', pos: 'verb', tier: 'Tier 2' },
          { word: 'compare', meaning: 'Tell how two or more things are alike and different.', example: 'Compare the two maps before writing your answer.', pos: 'verb', tier: 'Tier 2' },
          { word: 'evidence', meaning: 'Facts or details that help show an idea is true.', example: 'Underline one sentence of evidence from the passage.', pos: 'noun', tier: 'Tier 2' },
          { word: 'observe', meaning: 'Notice details carefully using your senses or tools.', example: 'Observe what happens when warm water cools down.', pos: 'verb', tier: 'Tier 2' },
          { word: 'predict', meaning: 'Say what you think will happen next based on clues.', example: 'Predict whether the bulb will light when the switch closes.', pos: 'verb', tier: 'Tier 2' },
          { word: 'classify', meaning: 'Sort items into groups that share a common feature.', example: 'Classify each object as a solid, liquid, or gas.', pos: 'verb', tier: 'Tier 2' },
          { word: 'summary', meaning: 'A short statement of the most important ideas in order.', example: 'Write a two-sentence summary of the chapter.', pos: 'noun', tier: 'Tier 2' },
          { word: 'solution', meaning: 'A way to solve a problem or answer a question.', example: 'Check your math solution using a number line.', pos: 'noun', tier: 'Tier 2' },
        ],
      },
    },
    {
      id: 'oer_math_facts_make10_k2',
      title: 'Make 10 Addition Fact Fluency',
      subject: 'Math',
      gradeBand: 'K-2',
      features: ['Practice', 'Print-Ready'],
      summary: 'Cover, Copy, Compare practice for Make-10 addition facts with gentle immediate feedback and zero timer pressure.',
      makerName: 'Math Fact Practice',
      makerHref: 'packets-math-practice.html',
      directDownload: true,
      buildKind: 'math_practice',
      buildConfig: {
        mode: 'ccc',
        factSet: 'add-make-10',
        title: 'Make 10 Addition Practice',
      },
    },
    {
      id: 'oer_math_facts_mul3_g35',
      title: 'Times 3 Multiplication Fact Fluency',
      subject: 'Math',
      gradeBand: '3-5',
      features: ['Practice', 'Print-Ready'],
      summary: 'Structured Cover, Copy, Compare practice for times-3 multiplication facts, ready to run offline on any device.',
      makerName: 'Math Fact Practice',
      makerHref: 'packets-math-practice.html',
      directDownload: true,
      buildKind: 'math_practice',
      buildConfig: {
        mode: 'ccc',
        factSet: 'mul-3',
        title: 'Times 3 Math Facts Practice',
      },
    },
    {
      id: 'oer_manip_fractions_g45',
      title: 'Equivalent Fractions Visual Bars',
      subject: 'Math',
      gradeBand: '3-5',
      features: ['Practice', 'Check', 'Print-Ready'],
      summary: 'Interactive denominator strips where students shade equivalent fractions with deterministic mastery hints.',
      makerName: 'Visual Math Manipulatives',
      makerHref: 'packets-manipulatives.html',
      directDownload: true,
      buildKind: 'manipulatives',
      buildConfig: {
        starterId: 'frac_equiv_g4',
        title: 'Equivalent Fractions Visual Bars',
        adaptiveScaffold: true,
      },
    },
    {
      id: 'oer_manip_balance_g68',
      title: 'One-Step Equations Balance Scale',
      subject: 'Math',
      gradeBand: '6-8',
      features: ['Practice', 'Check', 'Print-Ready'],
      summary: 'Two-pan algebraic balance scale where students add or remove unit tiles on both sides to isolate x.',
      makerName: 'Visual Math Manipulatives',
      makerHref: 'packets-manipulatives.html',
      directDownload: true,
      buildKind: 'manipulatives',
      buildConfig: {
        starterId: 'bal_one_step_g6',
        title: 'One-Step Equations Balance Scale',
        adaptiveScaffold: true,
      },
    },
    {
      id: 'oer_maze_reading_g45',
      title: 'CBM-Maze Reading Practice: Monarch Journey',
      subject: 'Literacy',
      gradeBand: '3-5',
      standards: 'CCSS RI.4-5 / CBM-Maze',
      features: ['Practice', 'Check', 'Print-Ready'],
      summary: 'Deterministic 3-choice Maze reading comprehension passage about monarch migration, usable offline in Practice or timed Check mode.',
      makerName: 'Maze Reading',
      makerHref: 'packets-maze.html',
      directDownload: true,
      buildKind: 'maze',
      buildConfig: {
        passageId: 'g4_5_monarch_journey',
        mode: 'practice',
      },
    },
    {
      id: 'oer_maze_bench_g45_a',
      title: 'Reading Progress Check: Monarch Journey (Form A)',
      subject: 'Literacy',
      gradeBand: '3-5',
      standards: 'CCSS RI.4-5 · Canonical Benchmark',
      canonicalBenchmark: { id: 'maze-reading-g4-5', form: 'A', band: '4-5' },
      features: ['Check', 'Print-Ready'],
      summary: '3-minute CBM-Maze Form A benchmark check (grade-free student title; canonical ID maze-reading-g4-5 pairs with Forms B and C in Add up results).',
      makerName: 'Maze Reading',
      makerHref: 'packets-maze.html',
      directDownload: true,
      buildKind: 'maze',
      buildConfig: {
        passageId: 'g4_5_monarch_journey',
        mode: 'probe',
        form: 'A',
      },
    },
    {
      id: 'oer_maze_bench_g45_b',
      title: 'Reading Progress Check: Beaver Wetlands (Form B)',
      subject: 'Literacy',
      gradeBand: '3-5',
      standards: 'CCSS RI.4-5 · Canonical Benchmark',
      canonicalBenchmark: { id: 'maze-reading-g4-5', form: 'B', band: '4-5' },
      features: ['Check', 'Print-Ready'],
      summary: 'Parallel 3-minute CBM-Maze Form B check matched to Form A so Add up results charts reading comprehension growth on one line.',
      makerName: 'Maze Reading',
      makerHref: 'packets-maze.html',
      directDownload: true,
      buildKind: 'maze',
      buildConfig: {
        passageId: 'g4_5_beaver_wetlands',
        mode: 'probe',
        form: 'B',
      },
    },
    {
      id: 'oer_maze_bench_g45_c',
      title: 'Reading Progress Check: Weather Balloons (Form C)',
      subject: 'Literacy',
      gradeBand: '3-5',
      standards: 'CCSS RI.4-5 · Canonical Benchmark',
      canonicalBenchmark: { id: 'maze-reading-g4-5', form: 'C', band: '4-5' },
      features: ['Check', 'Print-Ready'],
      summary: 'Parallel 3-minute CBM-Maze Form C check completing the Fall, Winter, and Spring progress-monitoring set for local group norms.',
      makerName: 'Maze Reading',
      makerHref: 'packets-maze.html',
      directDownload: true,
      buildKind: 'maze',
      buildConfig: {
        passageId: 'g4_5_weather_balloons',
        mode: 'probe',
        form: 'C',
      },
    },
    {
      id: 'oer_choice_ecosystems_g35',
      title: 'Ecosystems UDL Choice Board',
      subject: 'Science',
      gradeBand: '3-5',
      features: ['Practice', 'UDL Choice', 'Print-Ready'],
      summary: 'Three equivalent UDL pathways (Sort, Sequence, or Writing Frame) so students choose how to demonstrate ecosystem knowledge.',
      makerName: 'Choice, Sort & Write',
      makerHref: 'packets-choice.html',
      directDownload: true,
      buildKind: 'choice',
      buildConfig: {
        templateId: 'sci_ecosystems_choice',
        mode: 'practice',
      },
    },
    {
      id: 'oer_writing_cer_g68',
      title: 'Claim, Evidence & Reasoning Writing Studio',
      subject: 'Literacy',
      gradeBand: '6-8',
      features: ['Practice', 'UDL Choice', 'Print-Ready'],
      summary: 'Tiered sentence frames (High, Medium, and Open independence) with a clickable academic word bank and live word counter.',
      makerName: 'Choice, Sort & Write',
      makerHref: 'packets-choice.html',
      directDownload: true,
      buildKind: 'choice',
      buildConfig: {
        templateId: 'ela_claim_evidence_write',
        mode: 'practice',
      },
    },
    {
      id: 'oer_stem_circuits_g46',
      title: 'Series Circuit Exploration Lab',
      subject: 'STEM',
      gradeBand: '3-5',
      features: ['Practice', 'Check', 'Print-Ready'],
      summary: 'Deterministic offline circuit simulator with batteries, switches, bulbs, and live brightness feedback.',
      makerName: 'STEM Labs',
      makerHref: 'packets-stem-lab.html',
      directDownload: true,
      buildKind: 'stem_lab',
      buildConfig: {
        starterId: 'circuit_series_basics',
        adaptiveScaffold: true,
      },
    },
    {
      id: 'oer_stem_data_g68',
      title: 'Ramp Speed Data & Graph Explorer',
      subject: 'STEM',
      gradeBand: '6-8',
      features: ['Practice', 'Check', 'Print-Ready'],
      summary: 'Inspect a real classroom ramp dataset with sortable tables, bar charts, and mean, median, and range checks.',
      makerName: 'STEM Labs',
      makerHref: 'packets-stem-lab.html',
      directDownload: true,
      buildKind: 'stem_lab',
      buildConfig: {
        starterId: 'data_ramp_speed',
        adaptiveScaffold: true,
      },
    },
    {
      id: 'oer_life_skills_transition',
      title: 'Community & Daily Transition Simulation Pack',
      subject: 'Life Skills',
      gradeBand: '9-12',
      features: ['Practice', 'Check', 'Bilingual Family Kit', 'Print-Ready'],
      summary: 'Five practical transition simulations (US money, transit schedules, kitchen safety, laundry sorting, community signs) with Spanish toggle.',
      makerName: 'Life Skills & Transition',
      makerHref: 'packets-life-skills.html',
      directDownload: true,
      buildKind: 'life_skills',
      buildConfig: {
        starterId: 'ls_community_mix',
        homeLanguages: ['es'],
        adaptiveScaffold: true,
      },
    },
    {
      id: 'oer_aac_core_16',
      title: 'Bilingual Core AAC & Home-Carryover Board (EN / ES)',
      subject: 'AAC & Access',
      gradeBand: 'K-12',
      features: ['Practice', 'Switch-Accessible', 'Print-Ready', 'Bilingual Family Kit', 'Non-Scored Support'],
      summary: 'Fitzgerald-key Core and Fringe communication board with 1-switch and 2-switch scanning, local-only voice, and printable paper backup.',
      makerName: 'AAC Boards',
      makerHref: 'packets-aac.html',
      directDownload: true,
      buildKind: 'aac',
      buildConfig: {
        starterId: 'bilingual_core_en_es',
        homeLanguages: ['es'],
      },
    },
    {
      id: 'oer_sel_ef_toolkit',
      title: 'Private Daily Focus, First-Then & UDL Toolkit',
      subject: 'SEL & Focus',
      gradeBand: 'K-12',
      features: ['Practice', 'Print-Ready', 'Non-Scored Support'],
      summary: 'Non-scored First-Then checklist, visual focus timer, calm-down cards, and UDL reflection where notes stay private by default.',
      makerName: 'Focus & UDL Toolkits',
      makerHref: 'packets-sel.html',
      directDownload: true,
      buildKind: 'sel',
      buildConfig: {
        starterId: 'sel_daily_toolkit_mix',
      },
    },
    {
      id: 'oer_multilingual_family_kit',
      title: 'Multilingual Family Home-Practice Kit (6 Languages)',
      subject: 'Science',
      gradeBand: '3-5',
      features: ['Practice', 'Bilingual Family Kit', 'Print-Ready'],
      summary: 'States of Matter concept sort bundled with curated offline family directions and glossary in Spanish, Portuguese, French, Arabic (RTL), Vietnamese, and Simplified Chinese.',
      makerName: 'Choice, Sort & Write',
      makerHref: 'packets-choice.html',
      directDownload: true,
      buildKind: 'choice',
      buildConfig: {
        templateId: 'sci_states_matter_sort',
        title: 'States of Matter Family Practice Kit',
        mode: 'practice',
        homeLanguages: ['es', 'pt', 'fr', 'ar', 'vi', 'zh'],
        bilingualGlossary: {
          Solid: { es: 'S\u00f3lido', pt: 'S\u00f3lido', fr: 'Solide', ar: '\u0635\u0644\u0628', vi: 'Ch\u1ea5t r\u1eafn', zh: '\u56fa\u4f53' },
          Liquid: { es: 'L\u00edquido', pt: 'L\u00edquido', fr: 'Liquide', ar: '\u0633\u0627\u0626\u0644', vi: 'Ch\u1ea5t l\u1ecfng', zh: '\u6db2\u4f53' },
          Gas: { es: 'Gas', pt: 'G\u00e1s', fr: 'Gaz', ar: '\u063a\u0627\u0632', vi: 'Ch\u1ea5t kh\u00ed', zh: '\u6c14\u4f53' },
        },
      },
    },
    {
      id: 'oer_unit_playlist_sci_lit',
      title: 'Science & Literacy 3-Stage Unit Playlist',
      subject: 'Unit Playlist',
      gradeBand: '3-5',
      standards: 'NGSS 3-5-PS1 / UDL Arc',
      features: ['Practice', 'Bilingual Family Kit', 'UDL Choice', 'Print-Ready'],
      summary: 'Multi-stage offline unit arc combining States of Matter Sort, Plant Growth Data Lab, and UDL Reflection with adaptive hints.',
      makerName: 'Unit Playlists',
      makerHref: 'packets-playlist.html',
      directDownload: true,
      buildKind: 'playlist',
      buildConfig: {
        arcId: 'arc_sci_lit_g35',
        adaptiveScaffold: true,
        homeLanguages: ['es'],
      },
      draft: {
        kind: 'playlist',
        arcId: 'arc_sci_lit_g35',
        title: 'Science & Literacy Unit Arc',
        adaptiveScaffold: true,
        homeLanguages: ['es'],
      },
    },
    {
      id: 'oer_civics_branches_g68',
      title: 'Branches of Government UDL Choice Board',
      subject: 'Literacy',
      gradeBand: '6-8',
      standards: 'CCSS RH.6-8.2 · Civics',
      features: ['Practice', 'UDL Choice', 'Bilingual Family Kit', 'Print-Ready'],
      summary: 'Three equivalent UDL pathways (Sort, Sequence, or Writing Frame) exploring separation of powers with Spanish and Vietnamese directions.',
      makerName: 'Choice, Sort & Write',
      makerHref: 'packets-choice.html',
      directDownload: true,
      buildKind: 'choice',
      buildConfig: {
        templateId: 'ss_civic_branches_choice',
        mode: 'practice',
        homeLanguages: ['es', 'vi'],
      },
    },
    {
      id: 'oer_bill_to_law_g68',
      title: 'How a Bill Becomes a Law Timeline Sequence',
      subject: 'Literacy',
      gradeBand: '6-8',
      standards: 'CCSS RH.6-8.3 · Civics',
      features: ['Practice', 'Check', 'Print-Ready'],
      summary: 'Order key legislative milestones with keyboard-friendly step cards and a matching printable timeline backup.',
      makerName: 'Choice, Sort & Write',
      makerHref: 'packets-choice.html',
      directDownload: true,
      buildKind: 'choice',
      buildConfig: {
        templateId: 'ss_bill_to_law_seq',
        mode: 'practice',
      },
    },
    {
      id: 'oer_stem_geometry_g68',
      title: 'Angles & Triangles Interactive Geometry Lab',
      subject: 'STEM',
      gradeBand: '6-8',
      standards: 'CCSS 7.G.B.5 · Geometry',
      features: ['Practice', 'Check', 'Print-Ready'],
      summary: 'Classify acute, right, obtuse, and straight angles and verify triangle angle sums with an offline visual grid and printable recording sheet.',
      makerName: 'STEM Labs',
      makerHref: 'packets-stem-lab.html',
      directDownload: true,
      buildKind: 'stem_lab',
      buildConfig: {
        starterId: 'geom_angles_triangles',
        adaptiveScaffold: true,
      },
    },
    {
      id: 'oer_stem_parallel_g912',
      title: 'Parallel Circuits & Ohm Law Physics Lab',
      subject: 'STEM',
      gradeBand: '9-12',
      standards: 'NGSS HS-PS3-3 · Physics',
      features: ['Practice', 'Check', 'Print-Ready'],
      summary: 'Compare parallel branch currents, test individual bulb switches, and check equivalent resistance completely offline.',
      makerName: 'STEM Labs',
      makerHref: 'packets-stem-lab.html',
      directDownload: true,
      buildKind: 'stem_lab',
      buildConfig: {
        starterId: 'circuit_parallel_lab',
        adaptiveScaffold: true,
      },
    },
    {
      id: 'oer_maze_bench_g912_a',
      title: 'CBM-Maze Reading Check: Urban Canopy (Form A)',
      subject: 'Literacy',
      gradeBand: '9-12',
      standards: 'CBM-Maze · CCSS RI.9-12',
      features: ['Check', 'Print-Ready'],
      summary: 'Three-minute high school CBM-Maze reading comprehension check (Form A) with warm-up items, net scoring, and paper backup.',
      makerName: 'CBM-Maze Reading',
      makerHref: 'packets-maze.html',
      directDownload: true,
      buildKind: 'maze',
      buildConfig: {
        passageId: 'g9_12_urban_canopy',
        mode: 'probe',
        form: 'A',
      },
    },
    {
      id: 'oer_playlist_civics_g68',
      title: 'Evidence & Civics 3-Stage Unit Playlist',
      subject: 'Unit Playlist',
      gradeBand: '6-8',
      standards: 'CCSS W.6-8.1 · RH.6-8 · UDL Arc',
      features: ['Practice', 'Bilingual Family Kit', 'UDL Choice', 'Print-Ready'],
      summary: 'Multi-stage middle school arc pairing Bill-to-Law Sequencing, Claim-Evidence-Reasoning Writing, and UDL Reflection with Spanish and Arabic (RTL) directions.',
      makerName: 'Unit Playlists',
      makerHref: 'packets-playlist.html',
      directDownload: true,
      buildKind: 'playlist',
      buildConfig: {
        arcId: 'arc_evidence_civics_g68',
        adaptiveScaffold: true,
        homeLanguages: ['es', 'ar'],
      },
      draft: {
        kind: 'playlist',
        arcId: 'arc_evidence_civics_g68',
        title: 'Evidence & Civics Unit Arc',
        adaptiveScaffold: true,
        homeLanguages: ['es', 'ar'],
      },
    },
  ];

  // Teacher-facing suggested scope-and-sequence pathways (never shown as grade labels inside student files).
  var SCOPE_PATHWAYS = [
    {
      id: 'path_k2',
      gradeBand: 'K-2',
      label: 'Early Elementary (Typical K-2)',
      focus: 'Foundational phonics (CVC), Make-10 addition fluency, parallel early reading checks, and visual communication supports.',
      standards: 'CCSS RF.K-1 · 1.OA.C.6 · UDL Access',
      packIds: ['oer_phonics_cvc_k2', 'oer_math_facts_make10_k2', 'oer_aac_core_16', 'oer_sel_ef_toolkit'],
      benchmarkLink: { href: 'packets-check.html', label: 'Math Checks (Forms A-C)' },
    },
    {
      id: 'path_35',
      gradeBand: '3-5',
      label: 'Upper Elementary (Typical 3-5)',
      focus: 'Tier 2 vocabulary, multiplication facts, visual equivalent fractions, Ecosystems UDL Choice Board, Series Circuits, and parallel CBM-Maze Forms A-C.',
      standards: 'CCSS L.3-5 · 4.NF.A.1 · RI.4-5 · NGSS 4-PS3',
      packIds: ['oer_vocab_tier2_g35', 'oer_math_facts_mul3_g35', 'oer_manip_fractions_g45', 'oer_maze_bench_g45_a', 'oer_maze_bench_g45_b', 'oer_maze_bench_g45_c', 'oer_choice_ecosystems_g35', 'oer_stem_circuits_g46', 'oer_unit_playlist_sci_lit'],
      benchmarkLink: { href: 'packets-maze.html', label: 'CBM-Maze Checks (Forms A-C)' },
    },
    {
      id: 'path_68',
      gradeBand: '6-8',
      label: 'Middle School (Typical 6-8)',
      focus: 'Balance-scale algebraic equations, Angles & Triangles Geometry, Civics Choice & Bill-to-Law sequencing, Claim-Evidence-Reasoning writing, Ramp Speed data analysis, and Evidence & Civics Unit Playlist.',
      standards: 'CCSS 6.EE.B.7 · 7.G.B.5 · W.6-8.1 · RH.6-8',
      packIds: ['oer_manip_balance_g68', 'oer_stem_geometry_g68', 'oer_civics_branches_g68', 'oer_bill_to_law_g68', 'oer_writing_cer_g68', 'oer_stem_data_g68', 'oer_playlist_civics_g68'],
      benchmarkLink: { href: 'packets-maze.html', label: 'Middle School CBM-Maze (Forms A-C)' },
    },
    {
      id: 'path_912',
      gradeBand: '9-12',
      label: 'High School & Transition (Typical 9-12)',
      focus: 'Parallel Circuits & Ohm Law physics, community transition simulations, High School CBM-Maze checks (Forms A-C), and executive function tools.',
      standards: 'NGSS HS-PS3 · IDEA Transition · CCSS RI.9-12',
      packIds: ['oer_stem_parallel_g912', 'oer_maze_bench_g912_a', 'oer_life_skills_transition', 'oer_sel_ef_toolkit', 'oer_aac_core_16'],
      benchmarkLink: { href: 'packets-maze.html', label: 'High School CBM-Maze (Forms A-C)' },
    },
  ];

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function packById(id) {
    for (var i = 0; i < PACKS.length; i++) {
      if (PACKS[i].id === id) return PACKS[i];
    }
    return null;
  }

  function filterPacks(filters) {
    var f = filters && typeof filters === 'object' ? filters : {};
    var subject = typeof f.subject === 'string' && f.subject && f.subject !== 'All' ? f.subject : '';
    var grade = typeof f.gradeBand === 'string' && f.gradeBand && f.gradeBand !== 'All' ? f.gradeBand : '';
    var reqFeatures = Array.isArray(f.features) ? f.features.filter(Boolean) : [];
    var q = typeof f.query === 'string' ? f.query.trim().toLowerCase() : '';

    return PACKS.filter(function (p) {
      if (subject && p.subject !== subject) return false;
      if (grade && p.gradeBand !== grade && p.gradeBand !== 'K-12') return false;
      if (reqFeatures.length) {
        for (var i = 0; i < reqFeatures.length; i++) {
          if (p.features.indexOf(reqFeatures[i]) < 0) return false;
        }
      }
      if (q) {
        var hay = (p.title + ' ' + p.subject + ' ' + p.gradeBand + ' ' + (p.standards || '') + ' ' + p.summary + ' ' + p.makerName + ' ' + p.features.join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function resolveDeps(given) {
    var g = given && typeof given === 'object' ? given : {};
    return {
      loader: g.loader || root.AlloWordSoundsTakeHome || null,
      stationBilingual: g.stationBilingual || root.AlloPacketStationBilingual || null,
      mathPractice: g.mathPractice || root.AlloPacketMathPractice || null,
      sortWrite: g.sortWrite || root.AlloPacketSortWriteAdapters || null,
      choice: g.choice || root.AlloPacketChoice || null,
      maze: g.maze || root.AlloPacketMaze || null,
      manipulatives: g.manipulatives || root.AlloPacketManipulatives || null,
      stemLab: g.stemLab || root.AlloPacketStemLab || null,
      lifeSkills: g.lifeSkills || root.AlloPacketLifeSkills || null,
      aac: g.aac || root.AlloPacketAac || null,
      sel: g.sel || root.AlloPacketSel || null,
      playlist: g.playlist || root.AlloPacketPlaylist || null,
    };
  }

  function buildPackFile(packOrId, depsInput) {
    var pack = typeof packOrId === 'string' ? packById(packOrId) : packOrId;
    if (!pack) throw new Error('Unknown starter pack.');
    if (!pack.directDownload) {
      throw new Error(pack.handoffReason || 'Open this pack in its maker page to attach audio or customize it.');
    }
    var deps = resolveDeps(depsInput);
    if (!deps.loader || typeof deps.loader.buildHtml !== 'function') {
      throw new Error('The offline packet builder did not load. Load the page again.');
    }
    var cfg = clone(pack.buildConfig || {});
    var kind = pack.buildKind;
    var res = null;

    if (kind === 'math_practice') {
      if (!deps.mathPractice) throw new Error('Math Fact Practice builder is not loaded.');
      var mpLesson = deps.mathPractice.lessonFromMathPractice(Object.assign({}, cfg, {
        loader: deps.loader,
      }));
      res = deps.mathPractice.buildMathPracticePacket({
        loader: deps.loader,
        lesson: mpLesson,
      });
    } else if (kind === 'manipulatives') {
      if (!deps.manipulatives) throw new Error('Visual Math Manipulatives builder is not loaded.');
      res = deps.manipulatives.buildManipulativePacket(Object.assign({}, cfg, {
        loader: deps.loader,
        stationBilingual: deps.stationBilingual,
      }));
    } else if (kind === 'maze') {
      if (!deps.maze) throw new Error('Maze Reading builder is not loaded.');
      var psg = deps.maze.passageById(cfg.passageId);
      if (!psg) throw new Error('Unknown Maze passage: ' + cfg.passageId);
      res = deps.maze.buildMazePacket({
        loader: deps.loader,
        title: cfg.title || psg.title,
        passage: psg.passage,
        everyN: psg.everyN,
        mode: cfg.mode || 'practice',
        form: cfg.form || psg.form,
        stationBilingual: deps.stationBilingual,
      });
    } else if (kind === 'choice') {
      if (!deps.choice || !deps.sortWrite) throw new Error('Choice, Sort & Write builder is not loaded.');
      var tpl = deps.choice.templateById(cfg.templateId);
      if (!tpl) throw new Error('Unknown Choice template: ' + cfg.templateId);
      res = deps.choice.buildChoicePacket({
        loader: deps.loader,
        adapters: deps.sortWrite,
        activity: tpl.activity,
        title: cfg.title || tpl.title,
        items: [tpl.item],
        mode: cfg.mode || 'practice',
        homeLanguages: cfg.homeLanguages,
        bilingualGlossary: cfg.bilingualGlossary,
        stationBilingual: deps.stationBilingual,
      });
    } else if (kind === 'stem_lab') {
      if (!deps.stemLab) throw new Error('STEM Lab builder is not loaded.');
      var st = deps.stemLab.starterById(cfg.starterId);
      if (!st) throw new Error('Unknown STEM starter: ' + cfg.starterId);
      res = deps.stemLab.buildStemLabPacket({
        loader: deps.loader,
        activity: st.activity,
        title: cfg.title || st.title,
        items: st.items,
        datasetCsv: st.datasetCsv,
        datasetTitle: st.datasetTitle,
        unit: st.unit,
        stretchItems: st.stretchItems,
        adaptiveScaffold: cfg.adaptiveScaffold !== false,
        stationBilingual: deps.stationBilingual,
      });
    } else if (kind === 'life_skills') {
      if (!deps.lifeSkills) throw new Error('Life Skills builder is not loaded.');
      res = deps.lifeSkills.buildLifeSkillsPacket(Object.assign({}, cfg, {
        loader: deps.loader,
        stationBilingual: deps.stationBilingual,
      }));
    } else if (kind === 'aac') {
      if (!deps.aac) throw new Error('AAC builder is not loaded.');
      var aacSt = deps.aac.starterById(cfg.starterId);
      if (!aacSt) throw new Error('Unknown AAC starter: ' + cfg.starterId);
      res = deps.aac.buildAacPacket({
        loader: deps.loader,
        title: cfg.title || aacSt.title,
        gridLayout: aacSt.gridLayout,
        lang: aacSt.lang,
        folders: aacSt.folders,
        homeLanguages: cfg.homeLanguages || aacSt.defaultHomeLanguages,
        stationBilingual: deps.stationBilingual,
      });
    } else if (kind === 'sel') {
      if (!deps.sel) throw new Error('SEL & UDL Toolkit builder is not loaded.');
      res = deps.sel.buildSelPacket(Object.assign({}, cfg, {
        loader: deps.loader,
        stationBilingual: deps.stationBilingual,
      }));
    } else if (kind === 'playlist') {
      if (!deps.playlist) throw new Error('Unit Playlist builder is not loaded.');
      res = deps.playlist.buildPlaylistPacket(Object.assign({}, cfg, {
        loader: deps.loader,
        builders: {
          choice: deps.choice,
          sortWrite: deps.sortWrite,
          maze: deps.maze,
          manipulatives: deps.manipulatives,
          stemLab: deps.stemLab,
          lifeSkills: deps.lifeSkills,
          sel: deps.sel,
        },
        stationBilingual: deps.stationBilingual,
      }));
    } else {
      throw new Error('Unsupported starter pack kind: ' + kind);
    }

    var slugName = pack.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 44) || pack.id;
    var fname = (res && res.name) ? res.name : (slugName + '.html');
    var bytes = res && res.bytes ? res.bytes : (typeof TextEncoder === 'function' ? new TextEncoder().encode(res.html).length : res.html.length);
    return {
      packId: pack.id,
      title: pack.title,
      name: fname,
      bytes: bytes,
      html: res.html,
    };
  }

  var api = {
    VERSION: VERSION,
    SUBJECTS: SUBJECTS,
    GRADE_BANDS: GRADE_BANDS,
    FEATURES: FEATURES,
    PACKS: PACKS,
    SCOPE_PATHWAYS: SCOPE_PATHWAYS,
    packById: packById,
    filterPacks: filterPacks,
    buildPackFile: buildPackFile,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AlloPacketStarterPacks = api;
})(typeof window !== 'undefined' ? window : globalThis);
