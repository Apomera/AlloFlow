// ═══════════════════════════════════════════
// stem_tool_punnett.js — Punnett Square Lab v3.0
// 8 sub-tools: Punnett Cross, Pedigree Builder,
// Population Genetics, Trait Explorer, DNA→Protein,
// Challenge Mode, Gene Defense Battle, Learn Tab
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-punnett')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-punnett';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ── Grade band helpers ──
  var getGradeBand = function(ctx) {
    var g = parseInt(ctx.gradeLevel, 10);
    if (isNaN(g) || g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  };
  var gradeText = function(k2, g35, g68, g912) {
    return function(band) {
      if (band === 'k2') return k2;
      if (band === 'g35') return g35;
      if (band === 'g68') return g68;
      return g912;
    };
  };

  // ── Sub-tools ──
  var SUBTOOLS = [
    { id: 'cross', icon: '\uD83E\uDDEC', label: 'Punnett Cross', desc: 'Predict offspring with 4 inheritance modes' },
    { id: 'pedigree', icon: '\uD83D\uDC6A', label: 'Pedigree', desc: 'Build family trees & trace inheritance' },
    { id: 'population', icon: '\uD83D\uDCCA', label: 'Population', desc: 'Hardy-Weinberg equilibrium simulator' },
    { id: 'traits', icon: '\uD83D\uDD2C', label: 'Trait Explorer', desc: 'Real genetic traits catalog' },
    { id: 'dna2protein', icon: '\uD83E\uDDEA', label: 'DNA\u2192Protein', desc: 'Codon table & translation' },
    { id: 'challenge', icon: '\uD83C\uDFC6', label: 'Challenge', desc: 'Test your genetics knowledge' },
    { id: 'battle', icon: '\u2694\uFE0F', label: 'Gene Defense', desc: 'Battle with genetics questions' },
    { id: 'learn', icon: '\uD83D\uDCD6', label: 'Learn', desc: 'Genetics concepts by grade' }
  ];

  // ── Badge definitions (14 total) ──
  var BADGES = [
    { id: 'firstCross', icon: '\uD83E\uDDEC', name: 'First Cross', desc: 'Complete your first Punnett cross', check: function(u) { return u.crossCount >= 1; } },
    { id: 'allModes', icon: '\uD83C\uDF08', name: 'All Modes', desc: 'Try all 4 inheritance modes', check: function(u) { return Object.keys(u.modesUsed).length >= 4; } },
    { id: 'presetExplorer', icon: '\uD83D\uDD2C', name: 'Preset Explorer', desc: 'Use 5 different presets', check: function(u) { return u.presetsUsed >= 5; } },
    { id: 'mendel', icon: '\uD83C\uDF31', name: 'Mendel', desc: 'Observe the classic 3:1 ratio', check: function(u) { return u.crossCount >= 3; } },
    { id: 'testCross', icon: '\uD83D\uDCA0', name: 'Test Crosser', desc: 'Perform a test cross (Bb x bb)', check: function(u) { return u.testCrossDone; } },
    { id: 'geneticist', icon: '\uD83E\uDDD1\u200D\uD83D\uDD2C', name: 'Geneticist', desc: 'Complete 10 crosses', check: function(u) { return u.crossCount >= 10; } },
    { id: 'quizAce', icon: '\uD83C\uDFC6', name: 'Quiz Ace', desc: 'Score 6+ on genetics quiz', check: function(u) { return u.quizCorrect >= 6; } },
    { id: 'sexLinkedPro', icon: '\u2640\u2642', name: 'Sex-Linked Pro', desc: 'Complete a sex-linked cross', check: function(u) { return u.sexLinkedDone; } },
    { id: 'pedigreeReader', icon: '\uD83D\uDC6A', name: 'Pedigree Reader', desc: 'Solve a pedigree analysis', check: function(u) { return u.pedigreeSolved; } },
    { id: 'populationPro', icon: '\uD83D\uDCCA', name: 'Population Pro', desc: 'Run a Hardy-Weinberg simulation', check: function(u) { return u.popSimDone; } },
    { id: 'translator', icon: '\uD83E\uDDEA', name: 'Translator', desc: 'Translate a DNA sequence to protein', check: function(u) { return u.dnaDone; } },
    { id: 'challengeChamp', icon: '\uD83E\uDD47', name: 'Challenge Champ', desc: 'Score 18+ in Challenge mode', check: function(u) { return u.challengeTotal >= 18; } },
    { id: 'geneDefender', icon: '\u2694\uFE0F', name: 'Gene Defender', desc: 'Win a Gene Defense battle', check: function(u) { return u.battleWon; } },
    { id: 'allSubtools', icon: '\u2B50', name: 'Explorer', desc: 'Visit all 8 sub-tools', check: function(u) { return Object.keys(u.visited || {}).length >= 8; } },
    { id: 'dihybridPro', icon: '\uD83E\uDDEE', name: 'Dihybrid Pro', desc: 'Complete a dihybrid cross (4\u00D74 grid)', check: function(u) { return u.diCrossCount >= 1; } },
    { id: 'mutationHunter', icon: '\u2622\uFE0F', name: 'Mutation Hunter', desc: 'Try all 3 mutation types in the simulator', check: function(u) { return u.mutTypesUsed >= 3; } }
  ];

  // ── Inheritance mode info ──
  var MODE_INFO = {
    complete: { icon: '\uD83E\uDDEC', label: 'Complete Dominance', desc: 'One allele fully masks the other. Heterozygotes look like the dominant homozygote.' },
    incomplete: { icon: '\uD83C\uDF38', label: 'Incomplete Dominance', desc: 'Neither allele fully dominates. Heterozygotes show a blended intermediate phenotype.' },
    codominant: { icon: '\uD83E\uDE78', label: 'Codominance', desc: 'Both alleles are fully expressed. Heterozygotes show both traits simultaneously.' },
    sexLinked: { icon: '\u2640\u2642', label: 'Sex-Linked (X-Linked)', desc: 'Trait is carried on the X chromosome. Males (XY) need only one copy to express.' }
  };

  // ── Trait presets by mode ──
  var PRESETS_BY_MODE = {
    complete: [
      { label: '\uD83C\uDF31 Peas (Tt \u00D7 Tt)', p1: ['T', 't'], p2: ['T', 't'], trait: 'Tall vs Short', domEmoji: '\uD83C\uDF31', recEmoji: '\uD83C\uDF3F', domLabel: 'Tall', recLabel: 'Short', tip: 'Mendel\'s classic 3:1 ratio of tall to short pea plants' },
      { label: '\uD83C\uDF38 Flower (Rr \u00D7 Rr)', p1: ['R', 'r'], p2: ['R', 'r'], trait: 'Red vs White', domEmoji: '\uD83C\uDF39', recEmoji: '\uD83E\uDEB7', domLabel: 'Red', recLabel: 'White', tip: 'Red flower color is dominant over white' },
      { label: '\uD83D\uDFE4 Eyes (Bb \u00D7 Bb)', p1: ['B', 'b'], p2: ['B', 'b'], trait: 'Brown vs Blue', domEmoji: '\uD83D\uDFE4', recEmoji: '\uD83D\uDD35', domLabel: 'Brown', recLabel: 'Blue', tip: 'Brown eye color is dominant over blue (simplified)' },
      { label: '\uD83D\uDCA0 Test Cross (Bb \u00D7 bb)', p1: ['B', 'b'], p2: ['b', 'b'], trait: 'Test cross', domEmoji: '\uD83D\uDFE4', recEmoji: '\uD83D\uDD35', domLabel: 'Dominant', recLabel: 'Recessive', tip: 'Test cross reveals heterozygosity \u2014 1:1 ratio' },
      { label: '\uD83E\uDD47 BB \u00D7 bb (All Hetero)', p1: ['B', 'B'], p2: ['b', 'b'], trait: 'Pure cross', domEmoji: '\uD83D\uDFE2', recEmoji: '\uD83D\uDD34', domLabel: 'Dominant', recLabel: 'Recessive', tip: 'F1 generation: 100% heterozygous, all dominant' }
    ],
    incomplete: [
      { label: '\uD83C\uDF3A Snapdragon (Rr \u00D7 Rr)', p1: ['R', 'r'], p2: ['R', 'r'], trait: 'Flower color', domEmoji: '\uD83D\uDD34', recEmoji: '\u26AA', blendEmoji: '\uD83C\uDF38', domLabel: 'Red', recLabel: 'White', blendLabel: 'Pink', tip: 'Classic incomplete dominance: red \u00D7 white = pink heterozygotes' },
      { label: '\uD83D\uDC14 Andalusian (Bb \u00D7 Bb)', p1: ['B', 'b'], p2: ['B', 'b'], trait: 'Feather color', domEmoji: '\u2B1B', recEmoji: '\u2B1C', blendEmoji: '\uD83D\uDD35', domLabel: 'Black', recLabel: 'White', blendLabel: 'Blue', tip: 'Andalusian fowl: black \u00D7 white = blue feathers' },
      { label: '\uD83D\uDC34 Palomino (Cc \u00D7 Cc)', p1: ['C', 'c'], p2: ['C', 'c'], trait: 'Coat color', domEmoji: '\uD83D\uDFE4', recEmoji: '\uD83E\uDDD1', blendEmoji: '\uD83D\uDFE1', domLabel: 'Chestnut', recLabel: 'Cremello', blendLabel: 'Palomino', tip: 'Horse coat: chestnut \u00D7 cremello = palomino' }
    ],
    codominant: [
      { label: '\uD83E\uDE78 Blood Type (AB \u00D7 AB)', p1: ['A', 'B'], p2: ['A', 'B'], trait: 'ABO blood type', domEmoji: '\uD83C\uDD70', recEmoji: '\uD83C\uDD71', blendEmoji: '\uD83C\uDD8E', domLabel: 'Type A', recLabel: 'Type B', blendLabel: 'Type AB', tip: 'A and B alleles are codominant \u2014 both expressed in AB blood type' },
      { label: '\uD83E\uDE78 Blood (Ai \u00D7 Bi)', p1: ['A', 'i'], p2: ['B', 'i'], trait: 'Blood type', domEmoji: '\uD83C\uDD70', recEmoji: '\uD83C\uDD71', blendEmoji: '\uD83C\uDD8E', domLabel: 'Type A', recLabel: 'Type B', blendLabel: 'Type AB', tip: 'Carrier cross: possible A, B, AB, or O children' },
      { label: '\uD83D\uDC04 Roan Cattle (Rr \u00D7 Rr)', p1: ['R', 'r'], p2: ['R', 'r'], trait: 'Coat pattern', domEmoji: '\uD83D\uDD34', recEmoji: '\u26AA', blendEmoji: '\uD83D\uDD35', domLabel: 'Red', recLabel: 'White', blendLabel: 'Roan (mixed)', tip: 'Roan cattle show both red and white hairs together' }
    ],
    sexLinked: [
      { label: '\uD83D\uDC41 Color Vision (Cc \u00D7 cY)', p1: ['C', 'c'], p2: ['C', 'Y'], trait: 'Color vision', domEmoji: '\uD83D\uDC41', recEmoji: '\uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F', domLabel: 'Normal', recLabel: 'Colorblind', tip: 'Carrier mother \u00D7 normal father: 50% sons affected' },
      { label: '\uD83E\uDE78 Hemophilia (Hh \u00D7 hY)', p1: ['H', 'h'], p2: ['H', 'Y'], trait: 'Blood clotting', domEmoji: '\uD83E\uDE78', recEmoji: '\uD83E\uDE79', domLabel: 'Normal', recLabel: 'Hemophilia', tip: 'X-linked recessive: carrier mother can produce affected sons' }
    ]
  };

  // ── Dihybrid cross presets ──
  var DIHYBRID_PRESETS = [
    { label: '\uD83C\uDF31 Peas (RrYy \u00D7 RrYy)', g1: ['R','r'], g2: ['Y','y'], trait: 'Seed Shape & Color', desc: 'Mendel\'s classic dihybrid: round/wrinkled \u00D7 yellow/green. Expect 9:3:3:1 ratio.', t1name: 'Shape', t2name: 'Color', domLabel1: 'Round', recLabel1: 'Wrinkled', domLabel2: 'Yellow', recLabel2: 'Green' },
    { label: '\uD83D\uDC36 Dog Coat (BbSs \u00D7 BbSs)', g1: ['B','b'], g2: ['S','s'], trait: 'Color & Spotting', desc: 'Black/brown coat with solid/spotted pattern. Two independent genes.', t1name: 'Color', t2name: 'Pattern', domLabel1: 'Black', recLabel1: 'Brown', domLabel2: 'Solid', recLabel2: 'Spotted' },
    { label: '\uD83C\uDF3D Corn (CcSs \u00D7 ccss)', g1: ['C','c'], g2: ['S','s'], trait: 'Color & Starch', desc: 'Test cross: dihybrid \u00D7 double recessive reveals gamete ratios. Expect 1:1:1:1.', t1name: 'Color', t2name: 'Starch', domLabel1: 'Colored', recLabel1: 'Colorless', domLabel2: 'Smooth', recLabel2: 'Shrunken' },
    { label: '\uD83C\uDF38 Flower (AaBb \u00D7 AaBb)', g1: ['A','a'], g2: ['B','b'], trait: 'Color & Height', desc: 'Two traits segregating independently. Classic 9:3:3:1 phenotype ratio.', t1name: 'Color', t2name: 'Height', domLabel1: 'Purple', recLabel1: 'White', domLabel2: 'Tall', recLabel2: 'Short' }
  ];

  // ── Pedigree preset data ──
  var PEDIGREE_PRESETS = [
    {
      id: 'ad', label: 'Autosomal Dominant',
      example: 'Huntington\'s Disease',
      answer: 'autosomal_dominant',
      explanation: 'Affected individuals appear in every generation. Affected father can pass trait to sons AND daughters equally. Unaffected parents never have affected children.',
      members: [
        { id: 1, sex: 'M', x: 140, y: 35, affected: true, carrier: false, genotype: 'Aa', label: 'I-1' },
        { id: 2, sex: 'F', x: 220, y: 35, affected: false, carrier: false, genotype: 'aa', label: 'I-2' },
        { id: 3, sex: 'M', x: 80, y: 130, affected: false, carrier: false, genotype: 'aa', label: 'II-1' },
        { id: 4, sex: 'F', x: 180, y: 130, affected: true, carrier: false, genotype: 'Aa', label: 'II-2' },
        { id: 5, sex: 'M', x: 280, y: 130, affected: false, carrier: false, genotype: 'aa', label: 'II-3' },
        { id: 6, sex: 'M', x: 140, y: 225, affected: true, carrier: false, genotype: 'Aa', label: 'III-1' },
        { id: 7, sex: 'F', x: 220, y: 225, affected: false, carrier: false, genotype: 'aa', label: 'III-2' },
        { id: 8, sex: 'M', x: 300, y: 225, affected: false, carrier: false, genotype: 'aa', label: 'III-3' }
      ],
      couples: [[1,2],[4,5]],
      sibGroups: [
        { parents: [1,2], children: [3,4] },
        { parents: [4,5], children: [6,7,8] }
      ]
    },
    {
      id: 'ar', label: 'Autosomal Recessive',
      example: 'Cystic Fibrosis',
      answer: 'autosomal_recessive',
      explanation: 'Trait skips generations. Both parents of an affected child are carriers (unaffected). Males and females are affected equally.',
      members: [
        { id: 1, sex: 'M', x: 140, y: 35, affected: false, carrier: true, genotype: 'Cc', label: 'I-1' },
        { id: 2, sex: 'F', x: 220, y: 35, affected: false, carrier: true, genotype: 'Cc', label: 'I-2' },
        { id: 3, sex: 'F', x: 80, y: 130, affected: false, carrier: false, genotype: 'CC', label: 'II-1' },
        { id: 4, sex: 'M', x: 180, y: 130, affected: false, carrier: true, genotype: 'Cc', label: 'II-2' },
        { id: 5, sex: 'F', x: 280, y: 130, affected: true, carrier: false, genotype: 'cc', label: 'II-3' },
        { id: 6, sex: 'F', x: 80, y: 225, affected: false, carrier: false, genotype: 'Cc', label: 'III-1' },
        { id: 7, sex: 'M', x: 180, y: 225, affected: true, carrier: false, genotype: 'cc', label: 'III-2' }
      ],
      couples: [[1,2],[3,4]],
      sibGroups: [
        { parents: [1,2], children: [3,4,5] },
        { parents: [3,4], children: [6,7] }
      ]
    },
    {
      id: 'xr', label: 'X-Linked Recessive',
      example: 'Hemophilia',
      answer: 'x_linked_recessive',
      explanation: 'More males are affected than females. Affected males get the allele from their carrier mothers. Carrier females pass the trait to ~50% of sons.',
      members: [
        { id: 1, sex: 'M', x: 140, y: 35, affected: false, carrier: false, genotype: 'X\u1D34Y', label: 'I-1' },
        { id: 2, sex: 'F', x: 220, y: 35, affected: false, carrier: true, genotype: 'X\u1D34X\u02B0', label: 'I-2' },
        { id: 3, sex: 'M', x: 80, y: 130, affected: true, carrier: false, genotype: 'X\u02B0Y', label: 'II-1' },
        { id: 4, sex: 'F', x: 180, y: 130, affected: false, carrier: true, genotype: 'X\u1D34X\u02B0', label: 'II-2' },
        { id: 5, sex: 'M', x: 280, y: 130, affected: false, carrier: false, genotype: 'X\u1D34Y', label: 'II-3' },
        { id: 6, sex: 'M', x: 140, y: 225, affected: true, carrier: false, genotype: 'X\u02B0Y', label: 'III-1' },
        { id: 7, sex: 'F', x: 220, y: 225, affected: false, carrier: false, genotype: 'X\u1D34X\u1D34', label: 'III-2' },
        { id: 8, sex: 'M', x: 300, y: 225, affected: false, carrier: false, genotype: 'X\u1D34Y', label: 'III-3' }
      ],
      couples: [[1,2],[4,5]],
      sibGroups: [
        { parents: [1,2], children: [3,4] },
        { parents: [4,5], children: [6,7,8] }
      ]
    },
    {
      id: 'sc', label: 'Codominant / Carrier Visible',
      example: 'Sickle Cell Trait',
      answer: 'codominant',
      explanation: 'Carriers show a distinct intermediate phenotype (sickle cell trait). Both alleles are partially expressed in heterozygotes. Three distinct phenotypes are visible: normal, trait (carrier), and disease.',
      members: [
        { id: 1, sex: 'M', x: 140, y: 35, affected: false, carrier: true, genotype: 'AS', label: 'I-1' },
        { id: 2, sex: 'F', x: 220, y: 35, affected: false, carrier: true, genotype: 'AS', label: 'I-2' },
        { id: 3, sex: 'M', x: 80, y: 130, affected: false, carrier: false, genotype: 'AA', label: 'II-1' },
        { id: 4, sex: 'F', x: 180, y: 130, affected: false, carrier: true, genotype: 'AS', label: 'II-2' },
        { id: 5, sex: 'M', x: 280, y: 130, affected: true, carrier: false, genotype: 'SS', label: 'II-3' }
      ],
      couples: [[1,2]],
      sibGroups: [
        { parents: [1,2], children: [3,4,5] }
      ]
    },
    {
      id: 'mt', label: 'Mitochondrial Inheritance',
      example: 'Leber Optic Neuropathy',
      answer: 'mitochondrial',
      explanation: 'Mitochondrial DNA is inherited exclusively from the mother. ALL children of an affected mother are affected. An affected father NEVER passes the trait to children. No male-to-child transmission.',
      members: [
        { id: 1, sex: 'M', x: 140, y: 35, affected: false, carrier: false, genotype: 'Normal', label: 'I-1' },
        { id: 2, sex: 'F', x: 220, y: 35, affected: true, carrier: false, genotype: 'mt-mut', label: 'I-2' },
        { id: 3, sex: 'M', x: 60, y: 130, affected: true, carrier: false, genotype: 'mt-mut', label: 'II-1' },
        { id: 4, sex: 'F', x: 160, y: 130, affected: true, carrier: false, genotype: 'mt-mut', label: 'II-2' },
        { id: 5, sex: 'M', x: 260, y: 130, affected: true, carrier: false, genotype: 'mt-mut', label: 'II-3' },
        { id: 6, sex: 'F', x: 340, y: 130, affected: false, carrier: false, genotype: 'Normal', label: 'II-4' },
        { id: 7, sex: 'F', x: 100, y: 225, affected: true, carrier: false, genotype: 'mt-mut', label: 'III-1' },
        { id: 8, sex: 'M', x: 200, y: 225, affected: true, carrier: false, genotype: 'mt-mut', label: 'III-2' },
        { id: 9, sex: 'M', x: 310, y: 225, affected: false, carrier: false, genotype: 'Normal', label: 'III-3' }
      ],
      couples: [[1,2],[4,3],[5,6]],
      sibGroups: [
        { parents: [1,2], children: [3,4,5] },
        { parents: [4,3], children: [7,8] },
        { parents: [5,6], children: [9] }
      ]
    },
    {
      id: 'yl', label: 'Y-Linked Inheritance',
      example: 'Hairy Ear Rims (Hypertrichosis pinnae)',
      answer: 'y_linked',
      explanation: 'Y-linked traits pass exclusively from father to ALL sons. No daughters are ever affected. Every affected male has an affected father. The trait appears in every generation through the male line.',
      members: [
        { id: 1, sex: 'M', x: 140, y: 35, affected: true, carrier: false, genotype: 'X Y*', label: 'I-1' },
        { id: 2, sex: 'F', x: 220, y: 35, affected: false, carrier: false, genotype: 'XX', label: 'I-2' },
        { id: 3, sex: 'M', x: 80, y: 130, affected: true, carrier: false, genotype: 'X Y*', label: 'II-1' },
        { id: 4, sex: 'F', x: 180, y: 130, affected: false, carrier: false, genotype: 'XX', label: 'II-2' },
        { id: 5, sex: 'F', x: 280, y: 130, affected: false, carrier: false, genotype: 'XX', label: 'II-3' },
        { id: 6, sex: 'M', x: 120, y: 225, affected: true, carrier: false, genotype: 'X Y*', label: 'III-1' },
        { id: 7, sex: 'F', x: 200, y: 225, affected: false, carrier: false, genotype: 'XX', label: 'III-2' },
        { id: 8, sex: 'M', x: 280, y: 225, affected: true, carrier: false, genotype: 'X Y*', label: 'III-3' }
      ],
      couples: [[1,2],[3,4]],
      sibGroups: [
        { parents: [1,2], children: [3,4,5] },
        { parents: [3,4], children: [6,7,8] }
      ]
    }
  ];

  // ── Trait catalog ──
  var TRAIT_CATALOG = [
    { name: 'Tongue Rolling', mode: 'complete', dom: 'Can roll', rec: 'Cannot roll', icon: '\uD83D\uDC45', freq: '~65-81% can roll', desc: 'Ability to curl the tongue into a tube shape. Once thought to be simple Mendelian, now known to be influenced by environment too.' },
    { name: 'Widow\'s Peak', mode: 'complete', dom: 'Widow\'s peak', rec: 'Straight hairline', icon: '\uD83D\uDC71', freq: '~35% have peak', desc: 'A V-shaped point in the hairline at the center of the forehead. Dominant over straight hairline.' },
    { name: 'Hitchhiker\'s Thumb', mode: 'complete', dom: 'Straight thumb', rec: 'Hitchhiker (>50\u00B0 bend)', icon: '\uD83D\uDC4D', freq: '~25% hitchhiker', desc: 'Ability to bend the thumb backwards more than 50 degrees. The straight version is dominant.' },
    { name: 'Polydactyly', mode: 'complete', dom: 'Extra digits', rec: 'Normal (5)', icon: '\u270B', freq: '~1 in 500-1000', desc: 'Having extra fingers or toes. Autosomal dominant with variable expressivity and reduced penetrance.' },
    { name: 'Huntington\'s Disease', mode: 'complete', dom: 'Affected', rec: 'Normal', icon: '\uD83E\uDDE0', freq: '~1 in 10,000', desc: 'Progressive neurological disorder caused by CAG repeat expansion on chromosome 4. Autosomal dominant with late onset.' },
    { name: 'Cystic Fibrosis', mode: 'recessive', dom: 'Normal/Carrier', rec: 'Affected', icon: '\uD83E\uDEC1', freq: '~1 in 3,500 (Caucasian)', desc: 'Thick mucus production affecting lungs and pancreas. Caused by mutations in the CFTR gene on chromosome 7.' },
    { name: 'Sickle Cell Anemia', mode: 'codominant', dom: 'Normal RBC', rec: 'Sickle-shaped RBC', icon: '\uD83E\uDE78', freq: '~1 in 365 (African American)', desc: 'Hemoglobin S mutation causes red blood cells to sickle. Carriers (AS) have sickle cell trait \u2014 partial protection from malaria.' },
    { name: 'ABO Blood Type', mode: 'codominant', dom: 'A or B antigen', rec: 'No antigen (O)', icon: '\uD83C\uDD8E', freq: 'O: 44%, A: 42%, B: 10%, AB: 4%', desc: 'Three alleles (I\u1D2C, I\u1D2E, i) control blood type. I\u1D2C and I\u1D2E are codominant; both dominant over i.' },
    { name: 'Snapdragon Flower Color', mode: 'incomplete', dom: 'Red', rec: 'White', icon: '\uD83C\uDF3A', freq: 'n/a (plant)', desc: 'Classic incomplete dominance. Red (RR) \u00D7 White (rr) = Pink (Rr). The 1:2:1 ratio produces red, pink, and white flowers.' },
    { name: 'Color Blindness', mode: 'x_linked', dom: 'Normal vision', rec: 'Color blind', icon: '\uD83D\uDC41', freq: '~8% males, ~0.5% females', desc: 'Red-green color blindness is X-linked recessive. Males need only one copy; females need two. Carrier females have normal vision.' },
    { name: 'Hemophilia A', mode: 'x_linked', dom: 'Normal clotting', rec: 'Hemophilia', icon: '\uD83E\uDE79', freq: '~1 in 5,000 males', desc: 'Blood clotting factor VIII deficiency. X-linked recessive. Famous in European royal families descended from Queen Victoria.' },
    { name: 'Duchenne Muscular Dystrophy', mode: 'x_linked', dom: 'Normal', rec: 'Affected', icon: '\uD83E\uDDBE', freq: '~1 in 3,500 males', desc: 'Progressive muscle degeneration caused by dystrophin gene mutations on the X chromosome. Primarily affects boys.' },
    { name: 'Skin Color', mode: 'polygenic', dom: '-', rec: '-', icon: '\uD83C\uDF0D', freq: 'Continuous range', desc: 'Determined by multiple genes (at least 15) that additively affect melanin production. Classic example of polygenic inheritance.' },
    { name: 'Height', mode: 'polygenic', dom: '-', rec: '-', icon: '\uD83D\uDCCF', freq: 'Bell curve distribution', desc: 'Influenced by hundreds of genes plus environmental factors (nutrition, health). Shows continuous variation in populations.' },
    { name: 'Albinism', mode: 'recessive', dom: 'Normal pigment', rec: 'No pigment', icon: '\uD83E\uDDD1', freq: '~1 in 20,000', desc: 'Lack of melanin production due to mutations in genes controlling melanin synthesis pathway. Multiple types exist.' },
    { name: 'PKU (Phenylketonuria)', mode: 'recessive', dom: 'Normal', rec: 'PKU', icon: '\uD83E\uDDEA', freq: '~1 in 10,000', desc: 'Cannot metabolize phenylalanine. Treatable with diet. Newborn screening catches it early. Autosomal recessive on chromosome 12.' },
    { name: 'Tay-Sachs Disease', mode: 'recessive', dom: 'Normal', rec: 'Tay-Sachs', icon: '\uD83E\uDDE0', freq: '~1 in 3,600 (Ashkenazi Jewish)', desc: 'Fatal lysosomal storage disorder. Missing hexosaminidase A enzyme causes lipid buildup in neurons. Autosomal recessive on chromosome 15.' },
    { name: 'Marfan Syndrome', mode: 'complete', dom: 'Affected', rec: 'Normal', icon: '\uD83E\uDDBF', freq: '~1 in 5,000', desc: 'Connective tissue disorder caused by mutations in the fibrillin-1 gene (FBN1). Autosomal dominant with variable expressivity. Affects heart, eyes, skeleton.' },
    { name: 'Rh Blood Factor', mode: 'complete', dom: 'Rh+ (D antigen)', rec: 'Rh\u2212 (no D)', icon: '\uD83E\uDE78', freq: 'Rh+: ~85%, Rh\u2212: ~15%', desc: 'Rh factor is determined by the RHD gene. Rh+ is dominant. Important in pregnancy: Rh\u2212 mother with Rh+ fetus can develop antibodies (erythroblastosis fetalis).' },
    { name: 'Ear Lobe Shape', mode: 'complete', dom: 'Free (detached)', rec: 'Attached', icon: '\uD83D\uDC42', freq: '~64% free lobes', desc: 'Free (detached) earlobes are dominant over attached earlobes. A classic example used in introductory genetics, though actually influenced by multiple genes.' }
  ];

  // ── Codon table ──
  var CODON_TABLE = {
    UUU:'Phe',UUC:'Phe',UUA:'Leu',UUG:'Leu',CUU:'Leu',CUC:'Leu',CUA:'Leu',CUG:'Leu',
    AUU:'Ile',AUC:'Ile',AUA:'Ile',AUG:'Met',GUU:'Val',GUC:'Val',GUA:'Val',GUG:'Val',
    UCU:'Ser',UCC:'Ser',UCA:'Ser',UCG:'Ser',CCU:'Pro',CCC:'Pro',CCA:'Pro',CCG:'Pro',
    ACU:'Thr',ACC:'Thr',ACA:'Thr',ACG:'Thr',GCU:'Ala',GCC:'Ala',GCA:'Ala',GCG:'Ala',
    UAU:'Tyr',UAC:'Tyr',UAA:'Stop',UAG:'Stop',CAU:'His',CAC:'His',CAA:'Gln',CAG:'Gln',
    AAU:'Asn',AAC:'Asn',AAA:'Lys',AAG:'Lys',GAU:'Asp',GAC:'Asp',GAA:'Glu',GAG:'Glu',
    UGU:'Cys',UGC:'Cys',UGA:'Stop',UGG:'Trp',CGU:'Arg',CGC:'Arg',CGA:'Arg',CGG:'Arg',
    AGU:'Ser',AGC:'Ser',AGA:'Arg',AGG:'Arg',GGU:'Gly',GGC:'Gly',GGA:'Gly',GGG:'Gly'
  };
  var AMINO_CAT = {
    Phe:'nonpolar',Leu:'nonpolar',Ile:'nonpolar',Met:'start',Val:'nonpolar',
    Ser:'polar',Pro:'nonpolar',Thr:'polar',Ala:'nonpolar',
    Tyr:'polar',His:'positive',Gln:'polar',Asn:'polar',Lys:'positive',
    Asp:'negative',Glu:'negative',Cys:'polar',Trp:'nonpolar',
    Arg:'positive',Gly:'nonpolar',Stop:'stop'
  };
  var AMINO_COLORS = { nonpolar:'#3b82f6', polar:'#22c55e', positive:'#ef4444', negative:'#a855f7', start:'#f59e0b', stop:'#dc2626' };
  var AMINO_FULL = {
    Phe:'Phenylalanine',Leu:'Leucine',Ile:'Isoleucine',Met:'Methionine (START)',Val:'Valine',
    Ser:'Serine',Pro:'Proline',Thr:'Threonine',Ala:'Alanine',Tyr:'Tyrosine',
    His:'Histidine',Gln:'Glutamine',Asn:'Asparagine',Lys:'Lysine',
    Asp:'Aspartate',Glu:'Glutamate',Cys:'Cysteine',Trp:'Tryptophan',
    Arg:'Arginine',Gly:'Glycine',Stop:'STOP'
  };

  // ── Challenge questions (3 tiers × 8) ──
  var CHALLENGE_QS = {
    easy: [
      { q: 'What is a genotype?', a: ['The genetic makeup of an organism', 'The physical appearance', 'A type of protein', 'A chromosome number'], correct: 0 },
      { q: 'What does "heterozygous" mean?', a: ['Two identical alleles', 'Two different alleles', 'No alleles', 'Three alleles'], correct: 1 },
      { q: 'In complete dominance, Bb shows which phenotype?', a: ['Recessive', 'Blended', 'Dominant', 'Codominant'], correct: 2 },
      { q: 'What is the phenotype ratio of Bb \u00D7 Bb?', a: ['1:1', '1:2:1', '3:1', '4:0'], correct: 2 },
      { q: 'Who is the father of genetics?', a: ['Darwin', 'Mendel', 'Watson', 'Crick'], correct: 1 },
      { q: 'What molecule carries genetic information?', a: ['RNA', 'Protein', 'DNA', 'Lipid'], correct: 2 },
      { q: 'What are different versions of a gene called?', a: ['Chromosomes', 'Alleles', 'Phenotypes', 'Codons'], correct: 1 },
      { q: 'How many chromosomes do humans have?', a: ['23', '46', '44', '48'], correct: 1 },
      { q: 'Where is DNA found in a cell?', a: ['Cell wall', 'Cytoplasm', 'Nucleus', 'Ribosome'], correct: 2 },
      { q: 'A "purebred" organism is also called:', a: ['Heterozygous', 'Homozygous', 'Hybrid', 'Mutant'], correct: 1 },
      { q: 'Which scientist discovered the structure of DNA?', a: ['Mendel', 'Watson & Crick', 'Darwin', 'Pasteur'], correct: 1 },
      { q: 'What does DNA stand for?', a: ['Deoxyribose Nucleic Acid', 'Deoxyribonucleic Acid', 'Dinitrogen Acid', 'Dynamic Nuclear Acid'], correct: 1 }
    ],
    medium: [
      { q: 'In incomplete dominance, the heterozygote looks:', a: ['Like the dominant parent', 'Like the recessive parent', 'An intermediate blend', 'Both traits equally'], correct: 2 },
      { q: 'Why are X-linked recessive traits more common in males?', a: ['Males have two X chromosomes', 'Males need only one copy on X', 'Y chromosome is dominant', 'Males have stronger alleles'], correct: 1 },
      { q: 'What is codominance?', a: ['One allele masks the other', 'Neither is expressed', 'Both alleles fully expressed', 'Alleles blend together'], correct: 2 },
      { q: 'A test cross uses which parent genotype?', a: ['Homozygous dominant', 'Heterozygous', 'Homozygous recessive', 'Codominant'], correct: 2 },
      { q: 'Bb \u00D7 bb produces what ratio?', a: ['3:1', '1:1', '1:2:1', '4:0'], correct: 1 },
      { q: 'What separates during meiosis I?', a: ['Sister chromatids', 'Homologous chromosomes', 'Centromeres', 'Nucleotides'], correct: 1 },
      { q: 'What is a pedigree chart used for?', a: ['Making DNA', 'Tracking traits in families', 'Counting chromosomes', 'Cloning organisms'], correct: 1 },
      { q: 'Blood type AB is an example of:', a: ['Complete dominance', 'Incomplete dominance', 'Codominance', 'Epistasis'], correct: 2 },
      { q: 'A carrier of a recessive disorder is:', a: ['Homozygous dominant', 'Heterozygous', 'Homozygous recessive', 'Affected'], correct: 1 },
      { q: 'Crossing over happens during:', a: ['Mitosis', 'Meiosis I', 'Meiosis II', 'Interphase'], correct: 1 },
      { q: 'Which parent determines the sex of offspring?', a: ['Mother (XX)', 'Father (XY)', 'Both equally', 'Neither'], correct: 1 },
      { q: 'A dihybrid cross involves how many genes?', a: ['1', '2', '3', '4'], correct: 1 }
    ],
    hard: [
      { q: 'In Hardy-Weinberg, if q = 0.3, what is 2pq?', a: ['0.42', '0.49', '0.09', '0.21'], correct: 0 },
      { q: 'Epistasis occurs when:', a: ['Genes are linked', 'One gene masks another gene', 'Alleles blend', 'Mutations accumulate'], correct: 1 },
      { q: 'Which is NOT a Hardy-Weinberg assumption?', a: ['No mutation', 'Random mating', 'Natural selection occurs', 'Large population'], correct: 2 },
      { q: 'Crossing over increases:', a: ['Mutation rate', 'Genetic variation', 'Chromosome number', 'Gene expression'], correct: 1 },
      { q: 'A dihybrid cross (AaBb \u00D7 AaBb) ratio is:', a: ['3:1', '1:2:1', '9:3:3:1', '1:1:1:1'], correct: 2 },
      { q: 'The codon AUG codes for:', a: ['Stop', 'Leucine', 'Methionine (Start)', 'Alanine'], correct: 2 },
      { q: 'Polygenic inheritance produces:', a: ['Discrete ratios', 'Continuous variation', 'Sex-linked traits', 'Lethal alleles'], correct: 1 },
      { q: 'What percentage of children from Cc \u00D7 Cc have CF?', a: ['50%', '75%', '25%', '0%'], correct: 2 },
      { q: 'A frameshift mutation is caused by:', a: ['Substitution', 'Insertion or deletion', 'Translocation', 'Inversion'], correct: 1 },
      { q: 'Mitochondrial DNA is inherited from:', a: ['Father only', 'Both parents', 'Mother only', 'Neither'], correct: 2 },
      { q: 'If p=0.6 in Hardy-Weinberg, what is q?', a: ['0.6', '0.36', '0.4', '0.16'], correct: 2 },
      { q: 'Epigenetic changes alter gene expression by:', a: ['Changing DNA sequence', 'Modifying chromatin/methylation', 'Deleting genes', 'Adding chromosomes'], correct: 1 }
    ]
  };

  // ── Battle questions ──
  var BATTLE_QS = [
    { q: 'A homozygous dominant parent is:', a: ['AA', 'Aa', 'aa', 'AaBb'], correct: 0, dmg: 15 },
    { q: 'Gametes are produced by:', a: ['Mitosis', 'Meiosis', 'Binary fission', 'Budding'], correct: 1, dmg: 15 },
    { q: 'What is the probability of Bb from Bb \u00D7 Bb?', a: ['25%', '50%', '75%', '100%'], correct: 1, dmg: 20 },
    { q: 'Sickle cell carriers are protected from:', a: ['Cancer', 'Diabetes', 'Malaria', 'Flu'], correct: 2, dmg: 20 },
    { q: 'DNA is made of units called:', a: ['Amino acids', 'Nucleotides', 'Lipids', 'Sugars'], correct: 1, dmg: 15 },
    { q: 'How many bases form a codon?', a: ['1', '2', '3', '4'], correct: 2, dmg: 20 },
    { q: 'Which is a stop codon?', a: ['AUG', 'UAA', 'GCA', 'CUG'], correct: 1, dmg: 25 },
    { q: 'Gregor Mendel studied:', a: ['Fruit flies', 'Pea plants', 'Bacteria', 'Mice'], correct: 1, dmg: 15 },
    { q: 'Females have which sex chromosomes?', a: ['XY', 'XX', 'YY', 'XO'], correct: 1, dmg: 15 },
    { q: 'Phenotype is determined by genotype and:', a: ['Blood type', 'Environment', 'Age only', 'Gender only'], correct: 1, dmg: 20 },
    { q: 'What does a Punnett square predict?', a: ['Exact offspring', 'Offspring probabilities', 'Parent age', 'Mutation rate'], correct: 1, dmg: 15 },
    { q: 'Incomplete dominance produces:', a: ['3:1 ratio', '1:2:1 ratio', '9:3:3:1 ratio', '1:1 ratio'], correct: 1, dmg: 20 },
    { q: 'Which organelle has its own DNA?', a: ['Ribosome', 'Mitochondria', 'Golgi body', 'Lysosome'], correct: 1, dmg: 20 },
    { q: 'A nonsense mutation creates a:', a: ['New amino acid', 'Premature stop codon', 'Stronger protein', 'Frameshift'], correct: 1, dmg: 25 },
    { q: 'The law of segregation says:', a: ['Genes are linked', 'Alleles separate in meiosis', 'DNA never changes', 'Cells divide equally'], correct: 1, dmg: 15 },
    { q: 'A karyotype shows:', a: ['DNA sequence', 'Chromosome pairs arranged by size', 'Protein structure', 'Cell organelles'], correct: 1, dmg: 20 },
    { q: 'What is genetic drift?', a: ['Planned breeding', 'Random allele frequency change', 'Mutation accumulation', 'Natural selection'], correct: 1, dmg: 20 },
    { q: 'CRISPR-Cas9 is used for:', a: ['X-ray imaging', 'Gene editing', 'Blood typing', 'PCR amplification'], correct: 1, dmg: 25 },
    { q: 'Trisomy 21 causes:', a: ['Turner syndrome', 'Down syndrome', 'Klinefelter syndrome', 'Cri du chat'], correct: 1, dmg: 20 }
  ];

  // ── Learn topics ──
  var LEARN_TOPICS = [
    {
      title: 'What is DNA?', icon: '\uD83E\uDDEC',
      k2: 'DNA is like a recipe book inside every cell in your body! It tells your body how to grow, what color your eyes should be, and even how tall you might get. DNA looks like a twisted ladder called a double helix.',
      g35: 'DNA (deoxyribonucleic acid) is a molecule found in the nucleus of every cell. It contains instructions for building proteins, which do most of the work in your body. DNA is made of four chemical bases: Adenine (A), Thymine (T), Guanine (G), and Cytosine (C). A always pairs with T, and G always pairs with C.',
      g68: 'DNA is a double-stranded polymer of nucleotides arranged in a double helix. Each nucleotide contains a phosphate group, deoxyribose sugar, and one of four nitrogenous bases (A, T, G, C). Complementary base pairing (A-T, G-C) via hydrogen bonds holds the strands together. The sequence of bases encodes genetic information that is transcribed to mRNA and translated to proteins.',
      g912: 'DNA structure consists of antiparallel polynucleotide chains running 5\' to 3\'. The double helix has major and minor grooves important for protein binding. DNA replication is semiconservative, using DNA polymerase III (prokaryotes) or polymerase \u03B4/\u03B5 (eukaryotes). Replication forks, Okazaki fragments, and the leading/lagging strand mechanism ensure accurate duplication. Telomeres, repetitive sequences at chromosome ends, shorten with each division.'
    },
    {
      title: 'Genes & Alleles', icon: '\uD83C\uDFAF',
      k2: 'Genes are small sections of DNA that tell your body to make specific things, like blue eyes or curly hair. You get one copy from your mom and one from your dad! Different versions of a gene are called alleles.',
      g35: 'A gene is a segment of DNA that codes for a specific protein or trait. You inherit two copies (alleles) of each gene \u2014 one from each parent. If both alleles are the same, you\'re homozygous (BB or bb). If they\'re different, you\'re heterozygous (Bb). The allele combination is your genotype; what you actually look like is your phenotype.',
      g68: 'Genes occupy specific positions (loci) on chromosomes. Humans have ~20,000 protein-coding genes across 23 chromosome pairs. Alleles arise from mutations creating different DNA sequences at the same locus. Dominant alleles produce their phenotype with just one copy; recessive alleles need two copies. Some genes show incomplete dominance, codominance, or multiple alleles (like ABO blood type with three alleles: I\u1D2C, I\u1D2E, i).',
      g912: 'Gene expression involves transcription (DNA \u2192 mRNA by RNA polymerase) and translation (mRNA \u2192 protein by ribosomes). Regulatory elements (promoters, enhancers, silencers) control when and where genes are expressed. Epigenetic modifications (DNA methylation, histone acetylation) alter gene expression without changing the DNA sequence. Pleiotropy (one gene, many effects) and polygenic inheritance (many genes, one trait) add complexity beyond simple Mendelian genetics.'
    },
    {
      title: 'Inheritance Patterns', icon: '\uD83D\uDCCA',
      k2: 'Some traits are "stronger" than others! If you get a "strong" (dominant) gene from one parent and a "weak" (recessive) gene from the other, you\'ll show the strong trait. That\'s why brown eyes are more common than blue eyes!',
      g35: 'Mendel discovered three laws: (1) Law of Dominance \u2014 one allele can mask another. (2) Law of Segregation \u2014 allele pairs separate during gamete formation. (3) Law of Independent Assortment \u2014 genes on different chromosomes sort independently. A Punnett square predicts offspring ratios: Bb \u00D7 Bb gives a 3:1 dominant:recessive ratio.',
      g68: 'Beyond simple dominance, inheritance patterns include: Incomplete dominance (red \u00D7 white = pink snapdragons), Codominance (AB blood type), Sex-linked (hemophilia on X chromosome), and Polygenic (height, skin color). Linked genes on the same chromosome violate independent assortment but recombination during crossing over creates new combinations. Pedigree charts trace traits through generations.',
      g912: 'Complex inheritance includes epistasis (gene interaction where one gene modifies another\'s expression), penetrance (% showing phenotype), and expressivity (degree of expression). Quantitative trait loci (QTL) analysis maps polygenic traits. Mitochondrial inheritance is maternal. Genomic imprinting means some genes are expressed only from the maternal or paternal copy. Genetic linkage and recombination frequencies are used to map gene positions on chromosomes.'
    },
    {
      title: 'Mutations & Evolution', icon: '\uD83D\uDD2C',
      k2: 'Sometimes the DNA recipe has a small change \u2014 that\'s a mutation! Most mutations don\'t do anything, but some give animals special abilities that help them survive, like a rabbit with white fur in the snow.',
      g35: 'Mutations are changes in the DNA sequence. They can be caused by errors during DNA copying, radiation, or chemicals. Some mutations are harmful (sickle cell disease), some are neutral, and rarely some are helpful (antibiotic resistance in bacteria). Mutations create new alleles, providing the raw material for evolution.',
      g68: 'Point mutations include substitutions (silent, missense, nonsense), insertions, and deletions. Frameshift mutations (insertions/deletions not divisible by 3) change the entire downstream amino acid sequence. Chromosomal mutations include deletions, duplications, inversions, and translocations. Natural selection acts on phenotypic variation: individuals with advantageous traits survive and reproduce more, changing allele frequencies over generations.',
      g912: 'Mutation types at the molecular level: transitions (purine\u2192purine), transversions (purine\u2192pyrimidine), trinucleotide repeat expansions (Huntington\'s, Fragile X). Mutagens include UV light (thymine dimers), benzene (insertions), and reactive oxygen species. The neutral theory of molecular evolution (Kimura) proposes most mutations are selectively neutral. Population genetics combines mutation, selection, drift, migration, and non-random mating to model allele frequency changes.'
    },
    {
      title: 'Epigenetics', icon: '\uD83D\uDD11',
      k2: 'Even though your DNA stays the same, your body can turn genes ON or OFF, like switches! Eating healthy food and getting sleep helps keep your gene switches working well.',
      g35: 'Epigenetics means "above genetics." Your cells can add chemical tags to DNA that turn genes on or off without changing the DNA letters. Things like diet, stress, and exercise can change these tags. Identical twins have the same DNA but can look different because of epigenetics!',
      g68: 'Epigenetic modifications include DNA methylation (adding CH\u2083 groups to cytosine) and histone modification (acetylation, methylation of histone proteins). These changes alter gene expression without changing the nucleotide sequence. Methylation of promoter regions typically silences genes. Some epigenetic marks can be inherited across cell divisions and even across generations (transgenerational epigenetics).',
      g912: 'Key epigenetic mechanisms: (1) DNA methylation by DNMTs at CpG islands silences transcription. (2) Histone modifications (H3K4me3 = activation, H3K27me3 = repression) alter chromatin structure between euchromatin and heterochromatin. (3) Non-coding RNAs (miRNA, lncRNA) regulate post-transcriptional gene expression. X-inactivation in females (Barr body formation) is an epigenetic process. Genomic imprinting causes parent-of-origin expression patterns (e.g., IGF2 expressed from paternal allele only). Environmental exposures during critical windows can cause lasting epigenetic changes.'
    },
    {
      title: 'CRISPR & Gene Editing', icon: '\u2702\uFE0F',
      k2: 'Scientists have found a way to fix spelling mistakes in DNA, like using a special eraser and pencil! This might help cure diseases in the future. It is called CRISPR.',
      g35: 'CRISPR is like a pair of molecular scissors that can cut DNA at a specific spot. Scientists use a guide (made of RNA) to tell the scissors exactly where to cut. Once cut, the cell can fix the DNA \u2014 and scientists can add, remove, or change genes. It was inspired by how bacteria defend against viruses!',
      g68: 'CRISPR-Cas9 is a gene editing tool adapted from bacterial immune systems. Bacteria store snippets of viral DNA (CRISPR arrays) to recognize future invaders. Scientists engineered this into a tool: a guide RNA (gRNA) directs the Cas9 enzyme to a specific DNA sequence, creating a double-strand break. The cell repairs it via NHEJ (error-prone, can disable genes) or HDR (precise, can insert new sequences). Applications include disease treatment, agriculture, and research.',
      g912: 'CRISPR-Cas9 mechanism: The gRNA (crRNA + tracrRNA, or synthetic sgRNA) forms a complex with Cas9 endonuclease. PAM sequence (NGG for SpCas9) recognition enables R-loop formation and double-strand cleavage. Beyond Cas9: Cas12a (Cpf1) for staggered cuts, Cas13 for RNA editing, base editors (CBE/ABE) for single-nucleotide changes without DSBs, and prime editing for precise insertions/deletions. Ethical considerations include germline editing (He Jiankui controversy), gene drives in ecology, and off-target effects. Current clinical trials target sickle cell disease (Casgevy/Exa-cel), beta-thalassemia, and certain cancers.'
    }
  ];

  // ═══════════════════════════════════════════════════
  // REGISTER TOOL
  // ═══════════════════════════════════════════════════
  window.StemLab.registerTool('punnett', {
    icon: '\uD83E\uDDEC', label: 'Punnett Square Lab',
    desc: 'Genetics lab: crosses, pedigrees, population genetics, DNA translation',
    color: 'violet', category: 'science',
    questHooks: [
      { id: 'do_3_crosses', label: 'Perform 3 genetic crosses', icon: '🧬', check: function(d) { return (d._crossCount || 0) >= 3; }, progress: function(d) { return (d._crossCount || 0) + '/3'; } },
      { id: 'use_2_presets', label: 'Try 2 genetics presets', icon: '🔬', check: function(d) { return (d._presetsUsed || 0) >= 2; }, progress: function(d) { return (d._presetsUsed || 0) + '/2'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;

      if (!this._PunnettComponent) {
        this._PunnettComponent = function PunnettLab(props) {
          var ctx = props.ctx;
          var React = ctx.React;
          var h = React.createElement;
          var labToolData = ctx.toolData;
          var setLabToolData = ctx.setToolData;
          var setStemLabTool = ctx.setStemLabTool;
          var addToast = ctx.addToast;
          var ArrowLeft = ctx.icons.ArrowLeft;
          var announceToSR = ctx.announceToSR;
          var a11yClick = ctx.a11yClick;
          var awardXP = ctx.awardXP;
          var setToolSnapshots = ctx.setToolSnapshots;
          var band = getGradeBand(ctx);

          // ── State ──
          var d = labToolData.punnett || {};
          var upd = function(key, val) {
            setLabToolData(function(prev) {
              var p = prev || {};
              var pun = Object.assign({}, p.punnett || {});
              pun[key] = val;
              return Object.assign({}, p, { punnett: pun });
            });
          };
          var updMulti = function(obj) {
            setLabToolData(function(prev) {
              var p = prev || {};
              var pun = Object.assign({}, p.punnett || {}, obj);
              return Object.assign({}, p, { punnett: pun });
            });
          };

          var subtool = d.subtool || 'cross';

          // Track visited sub-tools for badge
          React.useEffect(function() {
            var vis = Object.assign({}, d._visited || {});
            if (!vis[subtool]) {
              vis[subtool] = true;
              upd('_visited', vis);
            }
          }, [subtool]);

          // ═══ SOUND EFFECTS ═══
          var _audioCtx = React.useRef(null);
          var getAudio = function() {
            if (!_audioCtx.current) { try { _audioCtx.current = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
            return _audioCtx.current;
          };
          var playTone = function(freq, dur, type, vol) {
            var ac = getAudio(); if (!ac) return;
            try {
              var osc = ac.createOscillator();
              var gain = ac.createGain();
              osc.type = type || 'sine';
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
              osc.connect(gain); gain.connect(ac.destination);
              osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
            } catch(e) {}
          };

          var punnettSound = function(type) {
            if (type === 'allele') {
              playTone(440, 0.08, 'sine', 0.08);
              setTimeout(function() { playTone(554, 0.1, 'sine', 0.1); }, 60);
            } else if (type === 'preset') {
              playTone(523, 0.1, 'sine', 0.1);
              setTimeout(function() { playTone(659, 0.1, 'sine', 0.1); }, 80);
              setTimeout(function() { playTone(784, 0.12, 'sine', 0.12); }, 160);
            } else if (type === 'mode') {
              playTone(392, 0.08, 'triangle', 0.08);
              setTimeout(function() { playTone(523, 0.12, 'triangle', 0.1); }, 80);
            } else if (type === 'correct') {
              playTone(523, 0.1, 'sine', 0.12);
              setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80);
              setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160);
            } else if (type === 'wrong') {
              playTone(220, 0.25, 'sawtooth', 0.08);
            } else if (type === 'badge') {
              playTone(523, 0.08, 'sine', 0.1);
              setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70);
              setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140);
              setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210);
            } else if (type === 'streak') {
              playTone(440, 0.06, 'sine', 0.1);
              setTimeout(function() { playTone(554, 0.06, 'sine', 0.1); }, 50);
              setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 100);
              setTimeout(function() { playTone(880, 0.15, 'sine', 0.12); }, 150);
            } else if (type === 'evolve') {
              playTone(330, 0.06, 'sine', 0.06);
              setTimeout(function() { playTone(440, 0.08, 'triangle', 0.08); }, 60);
            } else if (type === 'translate') {
              playTone(660, 0.06, 'sine', 0.08);
              setTimeout(function() { playTone(880, 0.08, 'sine', 0.1); }, 50);
            } else if (type === 'battle') {
              playTone(196, 0.1, 'square', 0.08);
              setTimeout(function() { playTone(262, 0.1, 'square', 0.08); }, 80);
              setTimeout(function() { playTone(330, 0.12, 'square', 0.1); }, 160);
            } else if (type === 'damage') {
              playTone(150, 0.2, 'sawtooth', 0.1);
            } else if (type === 'victory') {
              playTone(523, 0.1, 'sine', 0.12);
              setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 100);
              setTimeout(function() { playTone(784, 0.1, 'sine', 0.12); }, 200);
              setTimeout(function() { playTone(1047, 0.25, 'sine', 0.15); }, 300);
            }
          };

          // ═══ BADGE SYSTEM (14 badges) ═══
          var badges = d._badges || {};
          var crossCount = d._crossCount || 0;
          var presetsUsed = d._presetsUsed || 0;
          var modesUsed = d._modesUsed || {};

          var getBadgeState = function() {
            return {
              crossCount: crossCount,
              presetsUsed: presetsUsed,
              modesUsed: modesUsed,
              testCrossDone: d._testCrossDone || false,
              sexLinkedDone: d._sexLinkedDone || false,
              quizCorrect: d._genScore || 0,
              pedigreeSolved: d._pedigreeSolved || false,
              popSimDone: d._popSimDone || false,
              dnaDone: d._dnaDone || false,
              challengeTotal: d._chalTotalScore || 0,
              battleWon: d._battleWon || false,
              visited: d._visited || {},
              diCrossCount: d._diCrossCount || 0,
              mutTypesUsed: Object.keys(d._mutTypesUsed || {}).length
            };
          };

          var checkBadges = function(updates) {
            var newBadges = Object.assign({}, badges);
            var awarded = false;
            BADGES.forEach(function(b) {
              if (!newBadges[b.id] && b.check(updates)) {
                newBadges[b.id] = true;
                awarded = true;
                punnettSound('badge');
                addToast(b.icon + ' Badge: ' + b.name + ' \u2014 ' + b.desc, 'success');
                awardXP('punnettBadge_' + b.id, 15, b.name);
              }
            });
            if (awarded) upd('_badges', newBadges);
          };

          // Check badges on state changes
          React.useEffect(function() {
            checkBadges(getBadgeState());
          }, [crossCount, presetsUsed, d._testCrossDone, d._sexLinkedDone, d._genScore, d._pedigreeSolved, d._popSimDone, d._dnaDone, d._chalTotalScore, d._battleWon, d._visited, d._diCrossCount, d._mutTypesUsed]);

          // ═══ AI TUTOR ═══
          var showAI = d._showAI || false;
          var aiResponse = d._aiResponse || '';
          var aiLoading = d._aiLoading || false;
          var aiQuestion = d._aiQuestion || '';

          var askAI = function() {
            if (!aiQuestion.trim()) return;
            updMulti({ _aiLoading: true, _aiResponse: '' });
            var prompt = 'You are a friendly genetics tutor helping a student learn about genetics and Punnett squares. ' +
              'They are in the "' + subtool + '" section of the Punnett Square Lab. ' +
              'Their question: "' + aiQuestion + '"\n\n' +
              'Give a clear, encouraging explanation appropriate for grade level (' + band + '). Use genetics examples. Keep it under 150 words.';
            ctx.callGemini(prompt, false, false, 0.7).then(function(resp) {
              updMulti({ _aiResponse: resp, _aiLoading: false });
            }).catch(function() {
              updMulti({ _aiResponse: 'Sorry, I could not connect to the AI tutor right now.', _aiLoading: false });
            });
          };

          var showBadgePanel = d._showBadgePanel || false;

          // ═══════════════════════════════════════
          // CROSS SUB-TOOL (existing logic)
          // ═══════════════════════════════════════
          var inheritMode = d.inheritMode || 'complete';
          var isSexLinked = inheritMode === 'sexLinked';
          var parent1 = d.parent1 || ['A', 'a'];
          var parent2 = d.parent2 || ['A', 'a'];
          var grid, activePreset = d._activePreset || null;

          if (isSexLinked) {
            var momAlleles = [parent1[0], parent1[1]];
            var dadXAllele = parent2[0];
            grid = [
              ['X' + momAlleles[0] + 'X' + dadXAllele, 'X' + momAlleles[0] + 'Y'],
              ['X' + momAlleles[1] + 'X' + dadXAllele, 'X' + momAlleles[1] + 'Y']
            ];
          } else {
            grid = [
              [parent1[0] + parent2[0], parent1[0] + parent2[1]],
              [parent1[1] + parent2[0], parent1[1] + parent2[1]]
            ];
          }

          // Mode-aware phenotype function
          var phenotype;
          if (inheritMode === 'incomplete') {
            phenotype = function(g) {
              if (isSexLinked) return 'Dominant';
              var upper = g[0].toUpperCase();
              if (g[0] === g[1] && g[0] === upper) return 'Dominant';
              if (g[0] === g[1]) return 'Recessive';
              return 'Blended';
            };
          } else if (inheritMode === 'codominant') {
            phenotype = function(g) {
              if (isSexLinked) return 'Dominant';
              var upper = g[0].toUpperCase();
              if (g[0] === g[1] && g[0] === upper) return 'Dominant';
              if (g[0] === g[1]) return 'Recessive';
              return 'Codominant';
            };
          } else if (isSexLinked) {
            phenotype = function(g) {
              if (g.indexOf('Y') !== -1) {
                var xA = g.replace('Y', '').replace('X', '');
                return xA === xA.toUpperCase() ? 'Dominant' : 'Recessive';
              }
              var alleles = g.split('X').filter(Boolean);
              var hasDom = false;
              for (var i = 0; i < alleles.length; i++) {
                if (alleles[i] === alleles[i].toUpperCase()) { hasDom = true; break; }
              }
              return hasDom ? 'Dominant' : 'Recessive';
            };
          } else {
            phenotype = function(g) { return g.indexOf(g[0].toUpperCase()) !== -1 ? 'Dominant' : 'Recessive'; };
          }

          var flatGrid = grid[0].concat(grid[1]);
          var counts = {};
          flatGrid.forEach(function(g) { counts[g] = (counts[g] || 0) + 1; });
          var domCount = flatGrid.filter(function(g) { return phenotype(g) === 'Dominant'; }).length;
          var recCount = flatGrid.filter(function(g) { return phenotype(g) === 'Recessive'; }).length;
          var blendCount = flatGrid.filter(function(g) { return phenotype(g) === 'Blended' || phenotype(g) === 'Codominant'; }).length;
          var homoD = isSexLinked ? 0 : flatGrid.filter(function(g) { return g[0] === g[1] && g[0] === g[0].toUpperCase(); }).length;
          var hetero = isSexLinked ? 0 : flatGrid.filter(function(g) { return g[0] !== g[1]; }).length;
          var homoR = isSexLinked ? 0 : flatGrid.filter(function(g) { return g[0] === g[1] && g[0] === g[0].toLowerCase(); }).length;

          var phenoColor = function(p) {
            if (p === 'Dominant') return { bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-400', border: 'border-emerald-300' };
            if (p === 'Recessive') return { bg: 'bg-amber-50', text: 'text-amber-700', sub: 'text-amber-400', border: 'border-amber-300' };
            if (p === 'Blended') return { bg: 'bg-pink-50', text: 'text-pink-700', sub: 'text-pink-400', border: 'border-pink-300' };
            return { bg: 'bg-purple-50', text: 'text-purple-700', sub: 'text-purple-400', border: 'border-purple-300' };
          };

          function pieSlice(cx, cy, r, startAngle, endAngle) {
            var x1 = cx + r * Math.cos(startAngle);
            var y1 = cy + r * Math.sin(startAngle);
            var x2 = cx + r * Math.cos(endAngle);
            var y2 = cy + r * Math.sin(endAngle);
            var largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
            return 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z';
          }

          var trackCross = function() {
            var newCount = crossCount + 1;
            upd('_crossCount', newCount);
            var newModes = Object.assign({}, modesUsed);
            newModes[inheritMode] = true;
            upd('_modesUsed', newModes);
            var isTestCross = (parent1[0] !== parent1[1]) && (parent2[0] === parent2[1]) && (parent2[0] === parent2[0].toLowerCase());
            if (isTestCross) upd('_testCrossDone', true);
            if (isSexLinked) upd('_sexLinkedDone', true);
          };

          var countKeys = Object.keys(counts);
          var countEntries = countKeys.map(function(k) { return k + ': ' + counts[k] + '/4'; });
          var genotypeRatioStr = 'Genotype Ratios: ' + countEntries.join(' | ');
          var modeInfo = MODE_INFO[inheritMode];

          // ═══════════════════════════════════════
          // DIHYBRID CROSS LOGIC
          // ═══════════════════════════════════════
          var isDihybrid = d._isDihybrid || false;
          var diParent1Gene1 = d._diP1G1 || ['A', 'a'];
          var diParent1Gene2 = d._diP1G2 || ['B', 'b'];
          var diParent2Gene1 = d._diP2G1 || ['A', 'a'];
          var diParent2Gene2 = d._diP2G2 || ['B', 'b'];
          var diPreset = d._diPreset || null;

          // Generate gametes for dihybrid: each parent produces 4 gamete types
          var diGametes1 = [
            diParent1Gene1[0] + diParent1Gene2[0],
            diParent1Gene1[0] + diParent1Gene2[1],
            diParent1Gene1[1] + diParent1Gene2[0],
            diParent1Gene1[1] + diParent1Gene2[1]
          ];
          var diGametes2 = [
            diParent2Gene1[0] + diParent2Gene2[0],
            diParent2Gene1[0] + diParent2Gene2[1],
            diParent2Gene1[1] + diParent2Gene2[0],
            diParent2Gene1[1] + diParent2Gene2[1]
          ];

          // Build 4x4 dihybrid grid
          var diGrid = [];
          var diFlatGrid = [];
          for (var dr = 0; dr < 4; dr++) {
            diGrid[dr] = [];
            for (var dc = 0; dc < 4; dc++) {
              var g1a = diGametes1[dr][0]; // gene1 allele from parent1
              var g1b = diGametes2[dc][0]; // gene1 allele from parent2
              var g2a = diGametes1[dr][1]; // gene2 allele from parent1
              var g2b = diGametes2[dc][1]; // gene2 allele from parent2
              // Sort each gene pair: uppercase first
              var pair1 = g1a <= g1b ? g1a + g1b : g1b + g1a;
              var pair2 = g2a <= g2b ? g2a + g2b : g2b + g2a;
              var cellGeno = pair1 + pair2;
              diGrid[dr][dc] = cellGeno;
              diFlatGrid.push(cellGeno);
            }
          }

          // Dihybrid phenotype: check each gene pair for dominance
          var diPhenotype = function(geno) {
            // geno is 4 chars: gene1allele1 + gene1allele2 + gene2allele1 + gene2allele2
            var hasG1Dom = geno[0] !== geno[0].toLowerCase() || geno[1] !== geno[1].toLowerCase();
            var hasG2Dom = geno[2] !== geno[2].toLowerCase() || geno[3] !== geno[3].toLowerCase();
            if (hasG1Dom && hasG2Dom) return 'DomDom';
            if (hasG1Dom && !hasG2Dom) return 'DomRec';
            if (!hasG1Dom && hasG2Dom) return 'RecDom';
            return 'RecRec';
          };

          // Count dihybrid phenotype classes
          var diPhenoCounts = { DomDom: 0, DomRec: 0, RecDom: 0, RecRec: 0 };
          diFlatGrid.forEach(function(g) { diPhenoCounts[diPhenotype(g)]++; });

          var diPhenoColor = function(p) {
            if (p === 'DomDom') return { bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-500' };
            if (p === 'DomRec') return { bg: 'bg-sky-50', text: 'text-sky-700', sub: 'text-sky-500' };
            if (p === 'RecDom') return { bg: 'bg-amber-50', text: 'text-amber-700', sub: 'text-amber-500' };
            return { bg: 'bg-red-50', text: 'text-red-700', sub: 'text-red-500' };
          };

          var diPhenoLabel = function(p) {
            var dp = diPreset;
            if (!dp) {
              if (p === 'DomDom') return 'Dom/Dom';
              if (p === 'DomRec') return 'Dom/Rec';
              if (p === 'RecDom') return 'Rec/Dom';
              return 'Rec/Rec';
            }
            if (p === 'DomDom') return dp.domLabel1 + ' + ' + dp.domLabel2;
            if (p === 'DomRec') return dp.domLabel1 + ' + ' + dp.recLabel2;
            if (p === 'RecDom') return dp.recLabel1 + ' + ' + dp.domLabel2;
            return dp.recLabel1 + ' + ' + dp.recLabel2;
          };

          // ═══════════════════════════════════════
          // POPULATION GENETICS (Hardy-Weinberg)
          // ═══════════════════════════════════════
          var popFreqA = d.popFreqA != null ? d.popFreqA : 0.5;
          var popSize = d.popSize || 200;
          var popGens = d.popGens || 30;
          var popSelection = d.popSelection || 0;
          var popDrift = d.popDrift || false;
          var popMutation = d.popMutation || 0;
          var popRunning = d.popRunning || false;
          var popHistory = d.popHistory || null;

          React.useEffect(function() {
            if (!popRunning || !popHistory) return;
            if (popHistory.length > popGens) {
              upd('popRunning', false);
              return;
            }
            var timer = setTimeout(function() {
              var p = popHistory[popHistory.length - 1];
              var q = 1 - p;
              // Selection (against recessive)
              if (popSelection !== 0) {
                var wAA = 1, wAa = 1, waa = 1 - popSelection;
                var wBar = p * p * wAA + 2 * p * q * wAa + q * q * waa;
                if (wBar > 0.001) {
                  p = (p * p * wAA + p * q * wAa) / wBar;
                }
              }
              // Mutation (symmetric for simplicity)
              if (popMutation > 0) {
                p = p * (1 - popMutation) + (1 - p) * popMutation;
              }
              // Genetic drift (binomial sampling)
              if (popDrift) {
                var count = 0;
                var n2 = 2 * Math.min(popSize, 500);
                for (var i = 0; i < n2; i++) {
                  if (Math.random() < p) count++;
                }
                p = count / n2;
              }
              p = Math.max(0, Math.min(1, p));
              var newHist = popHistory.concat([p]);
              upd('popHistory', newHist);
              punnettSound('evolve');
            }, 150);
            return function() { clearTimeout(timer); };
          }, [popRunning, popHistory ? popHistory.length : 0]);

          // ═══════════════════════════════════════
          // CHALLENGE MODE
          // ═══════════════════════════════════════
          var chalDiff = d._chalDiff || 'easy';
          var chalIdx = d._chalIdx || 0;
          var chalScore = d._chalScore || 0;
          var chalStreak = d._chalStreak || 0;
          var chalFeedback = d._chalFeedback || null;
          var chalQuestions = CHALLENGE_QS[chalDiff] || CHALLENGE_QS.easy;

          // ═══════════════════════════════════════
          // BATTLE MODE
          // ═══════════════════════════════════════
          var battleActive = d._battleActive || false;
          var battleRound = d._battleRound || 0;
          var battleHP = d._battleHP != null ? d._battleHP : 100;
          var battleEnemyHP = d._battleEnemyHP != null ? d._battleEnemyHP : 100;
          var battleFeedback = d._battleFeedback || null;
          var battleScore = d._battleScore || 0;
          var battleResult = d._battleResult || null; // 'won' | 'lost' | null

          // ═══════════════════════════════════════
          // PEDIGREE state
          // ═══════════════════════════════════════
          var pedPreset = d._pedPreset || 0;
          var pedSolveMode = d._pedSolveMode || false;
          var pedSolveAnswer = d._pedSolveAnswer || '';
          var pedSolveFeedback = d._pedSolveFeedback || null;
          var pedShowGeno = d._pedShowGeno != null ? d._pedShowGeno : true;
          var currentPed = PEDIGREE_PRESETS[pedPreset] || PEDIGREE_PRESETS[0];

          // Helper to find pedigree member
          var findMem = function(id) {
            for (var i = 0; i < currentPed.members.length; i++) {
              if (currentPed.members[i].id === id) return currentPed.members[i];
            }
            return null;
          };

          // ═══════════════════════════════════════
          // DNA-to-Protein state
          // ═══════════════════════════════════════
          var dnaSeq = d._dnaSeq || 'ATGCGTACCTGA';
          var dnaShowSteps = d._dnaShowSteps || false;

          var transcribe = function(dna) {
            return dna.toUpperCase().replace(/[^ATCG]/g, '').replace(/T/g, 'U');
          };
          var translate = function(mRNA) {
            var codons = [];
            var aminos = [];
            for (var i = 0; i + 2 < mRNA.length; i += 3) {
              var codon = mRNA.substring(i, i + 3);
              codons.push(codon);
              var aa = CODON_TABLE[codon] || '???';
              aminos.push(aa);
              if (aa === 'Stop') break;
            }
            return { codons: codons, aminos: aminos };
          };

          // ═══════════════════════════════════════
          // MUTATION SIMULATOR state
          // ═══════════════════════════════════════
          var mutOriginalDna = d._mutOriginal || '';
          var mutType = d._mutType || null;
          var BASES = ['A', 'T', 'C', 'G'];

          var applyMutation = function(type) {
            var seq = dnaSeq;
            if (seq.length < 3) return;
            // Save original if not already saved
            if (!mutOriginalDna) upd('_mutOriginal', seq);
            var pos = Math.floor(Math.random() * seq.length);
            var newSeq = seq;

            if (type === 'point') {
              // Substitute with a different base
              var origBase = seq[pos];
              var otherBases = BASES.filter(function(b) { return b !== origBase; });
              var newBase = otherBases[Math.floor(Math.random() * otherBases.length)];
              newSeq = seq.substring(0, pos) + newBase + seq.substring(pos + 1);
            } else if (type === 'insertion') {
              var insBase = BASES[Math.floor(Math.random() * 4)];
              newSeq = seq.substring(0, pos) + insBase + seq.substring(pos);
            } else if (type === 'deletion') {
              if (seq.length <= 3) return;
              newSeq = seq.substring(0, pos) + seq.substring(pos + 1);
            }

            punnettSound('damage');
            var usedTypes = Object.assign({}, d._mutTypesUsed || {});
            usedTypes[type] = true;
            updMulti({ _dnaSeq: newSeq, _mutType: type, _mutTypesUsed: usedTypes });
          };

          var revertMutation = function() {
            if (mutOriginalDna) {
              punnettSound('correct');
              updMulti({ _dnaSeq: mutOriginalDna, _mutOriginal: '', _mutType: null, _mutPos: -1 });
            }
          };

          // ═══════════════════════════════════════
          // TRAIT EXPLORER state
          // ═══════════════════════════════════════
          var traitFilter = d._traitFilter || 'all';
          var traitSelected = d._traitSelected != null ? d._traitSelected : -1;

          // ═══════════════════════════════════════
          // LEARN state
          // ═══════════════════════════════════════
          var learnTopic = d._learnTopic != null ? d._learnTopic : -1;

          // ═══════════════════════════════════════
          // SNAPSHOT HELPER
          // ═══════════════════════════════════════
          var takeSnapshot = function() {
            var label = '';
            if (subtool === 'cross') label = parent1.join('') + ' \u00D7 ' + parent2.join('');
            else if (subtool === 'pedigree') label = 'Pedigree: ' + currentPed.label;
            else if (subtool === 'population') label = 'Pop: p=' + popFreqA.toFixed(2);
            else if (subtool === 'dna2protein') label = 'DNA: ' + dnaSeq.substring(0, 12);
            else {
              for (var si = 0; si < SUBTOOLS.length; si++) {
                if (SUBTOOLS[si].id === subtool) { label = SUBTOOLS[si].label; break; }
              }
            }
            setToolSnapshots(function(prev) {
              return (prev || []).concat([{
                id: 'pn-' + Date.now(),
                tool: 'punnett',
                label: label,
                data: Object.assign({}, d),
                timestamp: Date.now()
              }]);
            });
            addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
          };

          // ════════════════════════════════════════
          // RENDER
          // ════════════════════════════════════════
          return h('div', { className: 'max-w-2xl mx-auto animate-in fade-in duration-200' },

            // ── Header ──
            h('div', { className: 'flex items-center gap-3 mb-3' },
              h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back to tools' },
                h(ArrowLeft, { size: 18, className: 'text-slate-600' })
              ),
              h('h3', { className: 'text-lg font-bold text-slate-800' }, '\uD83E\uDDEC Punnett Square Lab'),
              h('span', { className: 'px-2 py-0.5 bg-violet-100 text-violet-700 text-[11px] font-bold rounded-full' }, 'GENETICS v3'),
              h('button', {
                onClick: function() { upd('_showBadgePanel', !showBadgePanel); },
                className: 'ml-auto px-2 py-1 text-[11px] font-bold rounded-lg border ' + (showBadgePanel ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-slate-50 text-slate-600 border-slate-200'),
                'aria-label': 'Toggle badges'
              }, '\uD83C\uDFC5 ' + Object.keys(badges).length + '/' + BADGES.length),
              h('button', {
                onClick: function() { upd('_showAI', !showAI); },
                className: 'px-2 py-1 text-[11px] font-bold rounded-lg border ' + (showAI ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-slate-50 text-slate-600 border-slate-200'),
                'aria-label': 'Toggle AI tutor'
              }, '\uD83E\uDD16 AI')
            ),

            // ── Sub-tool Navigation ──
            h('div', { className: 'flex flex-wrap gap-1 mb-4' },
              SUBTOOLS.map(function(st) {
                var isActive = subtool === st.id;
                return h('button', { 'aria-label': 'Change subtool',
                  key: st.id,
                  onClick: function() { upd('subtool', st.id); announceToSR('Switched to ' + st.label); },
                  className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all border ' +
                    (isActive ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:bg-violet-50'),
                  title: st.desc
                }, st.icon + ' ' + st.label);
              })
            ),

            // ── Badge Panel ──
            showBadgePanel && h('div', { className: 'mb-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200' },
              h('p', { className: 'text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2' }, '\uD83C\uDFC5 Badges'),
              h('div', { className: 'grid grid-cols-7 gap-1.5' },
                BADGES.map(function(b) {
                  var earned = !!badges[b.id];
                  return h('div', { key: b.id, className: 'text-center p-1.5 rounded-lg border ' + (earned ? 'bg-white border-amber-300' : 'bg-slate-50 border-slate-200 opacity-50'), title: b.desc },
                    h('span', { className: 'text-lg block' }, earned ? b.icon : '\uD83D\uDD12'),
                    h('span', { className: 'text-[11px] font-bold block ' + (earned ? 'text-amber-700' : 'text-slate-600') }, b.name)
                  );
                })
              )
            ),

            // ── AI Tutor Panel ──
            showAI && h('div', { className: 'mb-4 bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-3 border border-sky-200' },
              h('p', { className: 'text-[11px] font-bold text-sky-600 uppercase tracking-wider mb-2' }, '\uD83E\uDD16 AI Genetics Tutor'),
              h('div', { className: 'flex gap-2 mb-2' },
                h('input', {
                  type: 'text', value: aiQuestion,
                  onChange: function(e) { upd('_aiQuestion', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && aiQuestion.trim()) askAI(); },
                  placeholder: 'Ask about genetics, inheritance, alleles...',
                  'aria-label': 'Ask the genetics tutor',
                  className: 'flex-1 px-3 py-1.5 text-sm border border-sky-200 rounded-lg focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-300'
                }),
                h('button', { onClick: askAI,
                  disabled: aiLoading || !aiQuestion.trim(),
                  className: 'px-3 py-1.5 text-xs font-bold text-white bg-sky-500 rounded-lg hover:bg-sky-600 disabled:opacity-50'
                }, aiLoading ? 'Thinking...' : 'Ask')
              ),
              aiResponse && h('div', { className: 'bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-sky-100' }, aiResponse)
            ),

            // ════════════════════════════════════════
            // CROSS SUB-TOOL
            // ════════════════════════════════════════
            subtool === 'cross' && h('div', null,
              // Inheritance Mode Selector
              h('div', { className: 'mb-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-3 border border-violet-200' },
                h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83E\uDDEC Inheritance Mode'),
                h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
                  ['complete', 'incomplete', 'codominant', 'sexLinked'].map(function(mode) {
                    var info = MODE_INFO[mode];
                    var isActive = inheritMode === mode;
                    return h('button', { 'aria-label': 'Punnett Sound',
                      key: mode,
                      onClick: function() {
                        punnettSound('mode');
                        upd('inheritMode', mode);
                        upd('_activePreset', null);
                        trackCross();
                      },
                      className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border-2 ' + (isActive ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300')
                    }, info.icon + ' ' + info.label);
                  })
                ),
                h('p', { className: 'text-[11px] text-slate-600 italic leading-relaxed' }, modeInfo.desc)
              ),

              // Parent allele selectors
              h('div', { className: 'flex gap-6 mb-4 justify-center' },
                [[isSexLinked ? 'Mother (XX)' : 'Parent 1', 'parent1', 'violet'], [isSexLinked ? 'Father (XY)' : 'Parent 2', 'parent2', 'blue']].map(function(_ref) {
                  var label = _ref[0], key = _ref[1], color = _ref[2];
                  var selectorCount = isSexLinked && key === 'parent2' ? 1 : 2;
                  return h('div', { key: key, className: 'text-center' },
                    h('label', { className: 'text-sm font-bold text-' + color + '-700 mb-2 block' }, label),
                    h('div', { className: 'flex gap-2 items-center justify-center' },
                      Array.from({ length: selectorCount }).map(function(_, i) {
                        return h('select', {
                          key: i,
                          value: (d[key] && d[key][i]) || 'A',
                          onChange: function(e) {
                            punnettSound('allele');
                            var na = (d[key] || ['A', 'a']).slice();
                            na[i] = e.target.value;
                            upd(key, na);
                            trackCross();
                          },
                          className: 'px-3 py-2 border-2 border-' + color + '-200 rounded-lg font-bold text-lg text-center',
                          'aria-label': label + ' allele ' + (i + 1)
                        },
                          ['A', 'a', 'B', 'b', 'C', 'c', 'R', 'r', 'T', 't', 'H', 'h', 'i'].map(function(a) { return h('option', { key: a, value: a }, a); })
                        );
                      }),
                      isSexLinked && key === 'parent2' && h('span', { className: 'px-3 py-2 bg-slate-200 rounded-lg font-bold text-lg text-slate-600' }, 'Y')
                    )
                  );
                })
              ),

              // Punnett Grid
              h('div', { className: 'bg-white rounded-xl border border-violet-200 p-4 inline-block mx-auto', style: { display: 'flex', justifyContent: 'center' } },
                h('table', { className: 'border-collapse' },
                  h('caption', { className: 'sr-only' }, 'punnett data table'), h('thead', null, h('tr', null,
                    h('th', { scope: 'col', className: 'w-16 h-16' }),
                    isSexLinked
                      ? [h('th', { scope: 'col', key: 0, className: 'w-16 h-16 text-center text-lg font-bold text-blue-600 bg-blue-50 border border-blue-200' }, 'X' + parent2[0]), h('th', { key: 1, className: 'w-16 h-16 text-center text-lg font-bold text-slate-600 bg-slate-100 border border-slate-200' }, 'Y')]
                      : parent2.map(function(a, i) { return h('th', { scope: 'col', key: i, className: 'w-16 h-16 text-center text-lg font-bold text-blue-600 bg-blue-50 border border-blue-200' }, a); })
                  )),
                  h('tbody', null, parent1.map(function(a, r) {
                    var rowLabel = isSexLinked ? 'X' + a : a;
                    return h('tr', { key: r },
                      h('td', { className: 'w-16 h-16 text-center text-lg font-bold text-violet-600 bg-violet-50 border border-violet-200' }, rowLabel),
                      grid[r].map(function(g, c) {
                        var p = phenotype(g);
                        var pc = phenoColor(p);
                        var cellLabel = isSexLinked ? (g.indexOf('Y') !== -1 ? '\u2642 Male' : '\u2640 Female') : (p === 'Blended' ? 'Blended' : p === 'Codominant' ? 'Both' : (g[0] === g[1] ? (p === 'Dominant' ? 'Homo D' : 'Homo R') : 'Hetero'));
                        var cellEmoji = activePreset ? (p === 'Blended' || p === 'Codominant' ? (activePreset.blendEmoji || activePreset.domEmoji) : (p === 'Dominant' ? activePreset.domEmoji : activePreset.recEmoji)) : null;
                        return h('td', { key: c, className: 'w-16 h-16 text-center border border-slate-200 relative ' + pc.bg },
                          h('span', { className: 'text-lg font-bold ' + pc.text }, g),
                          h('span', { className: 'block text-[11px] ' + pc.sub }, cellLabel),
                          cellEmoji && h('span', { className: 'text-[11px] absolute top-0.5 right-0.5' }, cellEmoji)
                        );
                      })
                    );
                  }))
                )
              ),

              // Genotype ratios
              h('div', { className: 'mt-4 bg-slate-50 rounded-lg p-3 text-center' },
                h('p', { className: 'text-sm font-bold text-slate-600' }, genotypeRatioStr),
                h('p', { className: 'text-xs text-slate-600 mt-1' },
                  blendCount > 0
                    ? 'Phenotype: ' + domCount + '/4 Dominant, ' + blendCount + '/4 ' + (inheritMode === 'incomplete' ? 'Blended' : 'Codominant') + ', ' + recCount + '/4 Recessive'
                    : 'Phenotype: ' + domCount + '/4 Dominant, ' + recCount + '/4 Recessive'
                )
              ),

              // Pie Chart + Bar Chart
              h('div', { className: 'mt-3 grid grid-cols-2 gap-3' },
                h('div', { className: 'bg-white rounded-xl border p-3 text-center' },
                  h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83E\uDD67 Phenotype Pie'),
                  h('svg', { viewBox: '0 0 120 120', className: 'w-24 h-24 mx-auto' },
                    (function() {
                      var slices = [];
                      var total = domCount + blendCount + recCount;
                      if (total === 0) return h('circle', { cx: 60, cy: 60, r: 50, fill: '#94a3b8', stroke: '#ffffff', strokeWidth: 2 });
                      var angle = -Math.PI / 2;
                      if (domCount > 0 && domCount < total) {
                        var a2 = angle + (domCount / total) * Math.PI * 2;
                        slices.push(h('path', { key: 'dom', d: pieSlice(60, 60, 50, angle, a2), fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }));
                        angle = a2;
                      }
                      if (blendCount > 0 && blendCount < total) {
                        var a3 = angle + (blendCount / total) * Math.PI * 2;
                        slices.push(h('path', { key: 'blend', d: pieSlice(60, 60, 50, angle, a3), fill: inheritMode === 'incomplete' ? '#ec4899' : '#a855f7', stroke: '#fff', strokeWidth: 2 }));
                        angle = a3;
                      }
                      if (recCount > 0 && recCount < total) {
                        var a4 = angle + (recCount / total) * Math.PI * 2;
                        slices.push(h('path', { key: 'rec', d: pieSlice(60, 60, 50, angle, a4), fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }));
                      }
                      if (slices.length === 0) {
                        var col = domCount === total ? '#22c55e' : blendCount === total ? (inheritMode === 'incomplete' ? '#ec4899' : '#a855f7') : '#f59e0b';
                        slices.push(h('circle', { key: 'full', cx: 60, cy: 60, r: 50, fill: col, stroke: '#fff', strokeWidth: 2 }));
                      }
                      slices.push(h('text', { key: 't1', x: 60, y: 56, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: '#1e293b' }, (domCount * 25) + '% D'));
                      if (blendCount > 0) slices.push(h('text', { key: 't2', x: 60, y: 68, textAnchor: 'middle', style: { fontSize: '8px', fontWeight: 'bold' }, fill: '#1e293b' }, (blendCount * 25) + '% ' + (inheritMode === 'incomplete' ? 'B' : 'Co')));
                      slices.push(h('text', { key: 't3', x: 60, y: blendCount > 0 ? 80 : 72, textAnchor: 'middle', style: { fontSize: '11px' }, fill: '#94a3b8' }, (recCount * 25) + '% R'));
                      return slices;
                    })()
                  )
                ),
                h('div', { className: 'bg-white rounded-xl border p-3' },
                  h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83E\uDDEC Genotype Breakdown'),
                  h('div', { className: 'space-y-1.5' },
                    h('div', { className: 'flex items-center gap-2' },
                      h('div', { className: 'w-full bg-slate-100 rounded-full h-3 overflow-hidden flex' },
                        homoD > 0 && h('div', { className: 'bg-emerald-500 h-full transition-all', style: { width: (homoD * 25) + '%' } }),
                        hetero > 0 && h('div', { className: 'bg-sky-400 h-full transition-all', style: { width: (hetero * 25) + '%' } }),
                        homoR > 0 && h('div', { className: 'bg-amber-400 h-full transition-all', style: { width: (homoR * 25) + '%' } })
                      )
                    ),
                    h('div', { className: 'flex justify-between text-[11px] font-bold' },
                      h('span', { className: 'text-emerald-600' }, 'Homo D: ' + (homoD * 25) + '%'),
                      h('span', { className: 'text-sky-600' }, 'Hetero: ' + (hetero * 25) + '%'),
                      h('span', { className: 'text-amber-600' }, 'Homo R: ' + (homoR * 25) + '%')
                    )
                  ),
                  h('div', { className: 'mt-2 text-[11px] text-slate-600 space-y-0.5' },
                    h('p', null, '\uD83D\uDFE2 Homozygous Dominant (e.g. BB)'),
                    h('p', null, '\uD83D\uDD35 Heterozygous (e.g. Bb)'),
                    h('p', null, '\uD83D\uDFE1 Homozygous Recessive (e.g. bb)')
                  )
                )
              ),

              // Quick Crosses
              h('div', { className: 'mt-3 border-t border-slate-200 pt-3' },
                h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83E\uDDEC Quick Crosses'),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  (PRESETS_BY_MODE[inheritMode] || []).map(function(preset) {
                    return h('button', { 'aria-label': 'Punnett Sound',
                      key: preset.label,
                      onClick: function() {
                        punnettSound('preset');
                        updMulti({ parent1: preset.p1, parent2: preset.p2, _activePreset: preset });
                        var newPresets = presetsUsed + 1;
                        upd('_presetsUsed', newPresets);
                        trackCross();
                        addToast('\uD83E\uDDEC ' + preset.tip, 'success');
                      },
                      className: 'px-2 py-1 rounded-lg text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-all'
                    }, preset.label);
                  })
                )
              ),

              // Phenotype Visual
              activePreset && h('div', { className: 'mt-3 bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl border border-violet-200 p-3' },
                h('p', { className: 'text-[11px] font-bold text-violet-600 uppercase tracking-wider mb-2' }, '\uD83D\uDC40 Offspring Phenotypes \u2014 ' + activePreset.trait),
                h('div', { className: 'flex justify-center gap-2' },
                  flatGrid.map(function(g, i) {
                    var p = phenotype(g);
                    var pc = phenoColor(p);
                    var emoji = (p === 'Blended' || p === 'Codominant') ? (activePreset.blendEmoji || activePreset.domEmoji) : (p === 'Dominant' ? activePreset.domEmoji : activePreset.recEmoji);
                    var label = (p === 'Blended' || p === 'Codominant') ? (activePreset.blendLabel || 'Mixed') : (p === 'Dominant' ? activePreset.domLabel : activePreset.recLabel);
                    return h('div', { key: i, className: 'text-center p-2 rounded-lg border-2 transition-all ' + pc.bg + ' ' + pc.border, style: { minWidth: '60px' } },
                      h('span', { className: 'text-2xl block mb-1' }, emoji),
                      h('span', { className: 'text-[11px] font-bold block ' + pc.text }, g),
                      h('span', { className: 'text-[11px] block ' + pc.sub }, label)
                    );
                  })
                )
              ),

              // Educational Callout
              !isDihybrid && h('p', { className: 'mt-3 text-xs text-slate-600 italic' },
                (function() {
                  if (inheritMode === 'incomplete') {
                    if (blendCount === 4) return '\uD83D\uDCA1 100% blended phenotype! Both parents are heterozygous \u2014 classic incomplete dominance 1:2:1 ratio.';
                    if (blendCount === 2) return '\uD83D\uDCA1 50% blended. Some offspring express intermediate traits!';
                    return '\uD83D\uDCA1 Incomplete dominance: heterozygotes show a blend of both parental traits.';
                  }
                  if (inheritMode === 'codominant') {
                    if (blendCount > 0) return '\uD83D\uDCA1 ' + (blendCount * 25) + '% of offspring express both alleles simultaneously \u2014 that\u2019s codominance!';
                    return '\uD83D\uDCA1 No heterozygotes in this cross. Try crossing different alleles to see codominance.';
                  }
                  if (isSexLinked) {
                    var malesAffected = flatGrid.filter(function(g) { return g.indexOf('Y') !== -1 && phenotype(g) === 'Recessive'; }).length;
                    var femalesCarrier = flatGrid.filter(function(g) { return g.indexOf('Y') === -1 && g.split('X').filter(Boolean).length === 2 && g.split('X').filter(Boolean)[0] !== g.split('X').filter(Boolean)[1]; }).length;
                    return '\uD83D\uDCA1 X-linked: ' + (malesAffected > 0 ? malesAffected + '/2 sons affected' : 'no sons affected') + '. ' + (femalesCarrier > 0 ? femalesCarrier + '/2 daughters are carriers.' : 'Daughters are not carriers.');
                  }
                  if (domCount === 4) return '\uD83D\uDCA1 100% dominant phenotype. At least one parent must be homozygous dominant (BB).';
                  if (domCount === 3) return '\uD83D\uDCA1 Classic 3:1 ratio! Both parents are heterozygous (Bb) \u2014 this is Mendel\u2019s foundational ratio.';
                  if (domCount === 2) return '\uD83D\uDCA1 1:1 ratio. This is a test cross \u2014 one parent is heterozygous, the other recessive.';
                  if (domCount === 1) return '\uD83D\uDCA1 Only 25% dominant. This is unusual \u2014 check your allele assignments!';
                  return '\uD83D\uDCA1 100% recessive. Both parents must be homozygous recessive (bb).';
                })()
              ),

              // ═══════════════════════════════════════
              // DIHYBRID CROSS SECTION
              // ═══════════════════════════════════════
              h('div', { className: 'mt-4 border-t border-slate-200 pt-3' },
                h('div', { className: 'flex items-center gap-2 mb-3' },
                  h('button', { 'aria-label': 'Punnett Sound',
                    onClick: function() {
                      punnettSound('mode');
                      upd('_isDihybrid', !isDihybrid);
                      if (!isDihybrid) {
                        upd('_diCrossCount', (d._diCrossCount || 0) + 1);
                        awardXP('dihybridFirst', 15, 'Dihybrid Cross');
                      }
                    },
                    className: 'px-3 py-1.5 text-[11px] font-bold rounded-lg border-2 transition-all ' +
                      (isDihybrid ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300')
                  }, isDihybrid ? '\uD83E\uDDEC Dihybrid ON (4\u00D74)' : '\uD83E\uDDEC Dihybrid Cross (4\u00D74)'),
                  isDihybrid && h('span', { className: 'text-[11px] text-slate-600' }, 'Two genes, 16 offspring combinations')
                ),

                isDihybrid && h('div', null,
                  // Dihybrid info
                  h('p', { className: 'text-xs text-slate-600 italic mb-3' },
                    gradeText(
                      'Two traits at the same time! Watch how they mix together.',
                      'A dihybrid cross tracks TWO genes at once. Each parent passes one allele for each gene.',
                      'Dihybrid crosses test independent assortment. With complete dominance, AaBb \u00D7 AaBb yields a 9:3:3:1 phenotype ratio.',
                      'Dihybrid crosses demonstrate Mendel\'s Law of Independent Assortment. Deviations from 9:3:3:1 suggest linked genes or epistasis.'
                    )(band)
                  ),

                  // Parent allele selectors (2 genes per parent)
                  h('div', { className: 'grid grid-cols-2 gap-4 mb-3' },
                    // Parent 1
                    h('div', { className: 'bg-violet-50 rounded-xl p-2 border border-violet-200' },
                      h('p', { className: 'text-[11px] font-bold text-violet-600 mb-2 text-center' }, 'Parent 1'),
                      h('div', { className: 'flex gap-2 items-center justify-center mb-1' },
                        h('span', { className: 'text-[11px] font-bold text-slate-600 w-12' }, 'Gene 1:'),
                        [0, 1].map(function(i) {
                          return h('select', {
                            key: 'p1g1_' + i,
                            value: diParent1Gene1[i],
                            onChange: function(e) {
                              var na = diParent1Gene1.slice();
                              na[i] = e.target.value;
                              upd('_diP1G1', na);
                              punnettSound('allele');
                            },
                            'aria-label': 'Parent 1 Gene 1 allele ' + (i + 1),
                            className: 'px-2 py-1 border border-violet-200 rounded font-bold text-sm text-center'
                          },
                            ['A','a','B','b','C','c','R','r','T','t'].map(function(a) { return h('option', { key: a, value: a }, a); })
                          );
                        })
                      ),
                      h('div', { className: 'flex gap-2 items-center justify-center' },
                        h('span', { className: 'text-[11px] font-bold text-slate-600 w-12' }, 'Gene 2:'),
                        [0, 1].map(function(i) {
                          return h('select', {
                            key: 'p1g2_' + i,
                            value: diParent1Gene2[i],
                            onChange: function(e) {
                              var na = diParent1Gene2.slice();
                              na[i] = e.target.value;
                              upd('_diP1G2', na);
                              punnettSound('allele');
                            },
                            'aria-label': 'Parent 1 Gene 2 allele ' + (i + 1),
                            className: 'px-2 py-1 border border-violet-200 rounded font-bold text-sm text-center'
                          },
                            ['A','a','B','b','C','c','R','r','T','t'].map(function(a) { return h('option', { key: a, value: a }, a); })
                          );
                        })
                      )
                    ),
                    // Parent 2
                    h('div', { className: 'bg-blue-50 rounded-xl p-2 border border-blue-200' },
                      h('p', { className: 'text-[11px] font-bold text-blue-600 mb-2 text-center' }, 'Parent 2'),
                      h('div', { className: 'flex gap-2 items-center justify-center mb-1' },
                        h('span', { className: 'text-[11px] font-bold text-slate-600 w-12' }, 'Gene 1:'),
                        [0, 1].map(function(i) {
                          return h('select', {
                            key: 'p2g1_' + i,
                            value: diParent2Gene1[i],
                            onChange: function(e) {
                              var na = diParent2Gene1.slice();
                              na[i] = e.target.value;
                              upd('_diP2G1', na);
                              punnettSound('allele');
                            },
                            className: 'px-2 py-1 border border-blue-200 rounded font-bold text-sm text-center'
                          },
                            ['A','a','B','b','C','c','R','r','T','t'].map(function(a) { return h('option', { key: a, value: a }, a); })
                          );
                        })
                      ),
                      h('div', { className: 'flex gap-2 items-center justify-center' },
                        h('span', { className: 'text-[11px] font-bold text-slate-600 w-12' }, 'Gene 2:'),
                        [0, 1].map(function(i) {
                          return h('select', {
                            key: 'p2g2_' + i,
                            value: diParent2Gene2[i],
                            onChange: function(e) {
                              var na = diParent2Gene2.slice();
                              na[i] = e.target.value;
                              upd('_diP2G2', na);
                              punnettSound('allele');
                            },
                            className: 'px-2 py-1 border border-blue-200 rounded font-bold text-sm text-center'
                          },
                            ['A','a','B','b','C','c','R','r','T','t'].map(function(a) { return h('option', { key: a, value: a }, a); })
                          );
                        })
                      )
                    )
                  ),

                  // 4x4 Punnett Grid
                  h('div', { className: 'bg-white rounded-xl border border-indigo-200 p-3 overflow-x-auto', style: { display: 'flex', justifyContent: 'center' } },
                    h('table', { className: 'border-collapse' },
                      h('caption', { className: 'sr-only' }, 'punnett data table'), h('thead', null, h('tr', null,
                        h('th', { scope: 'col', className: 'w-14 h-10' }),
                        diGametes2.map(function(gam, ci) {
                          return h('th', { scope: 'col', key: ci, className: 'w-14 h-10 text-center text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200' }, gam);
                        })
                      )),
                      h('tbody', null, diGametes1.map(function(gam, ri) {
                        return h('tr', { key: ri },
                          h('td', { className: 'w-14 h-14 text-center text-xs font-bold text-violet-600 bg-violet-50 border border-violet-200' }, gam),
                          diGrid[ri].map(function(geno, ci) {
                            var dp = diPhenotype(geno);
                            var dpc = diPhenoColor(dp);
                            return h('td', { key: ci, className: 'w-14 h-14 text-center border border-slate-200 ' + dpc.bg },
                              h('span', { className: 'text-[11px] font-bold block ' + dpc.text }, geno.substring(0, 2)),
                              h('span', { className: 'text-[11px] font-bold block ' + dpc.text }, geno.substring(2)),
                              h('span', { className: 'text-[11px] block ' + dpc.sub }, diPhenoLabel(dp).split(' + ')[0])
                            );
                          })
                        );
                      }))
                    )
                  ),

                  // Phenotype ratios
                  h('div', { className: 'mt-3 bg-slate-50 rounded-lg p-3' },
                    h('p', { className: 'text-sm font-bold text-slate-600 text-center mb-2' }, 'Phenotype Ratios (out of 16)'),
                    h('div', { className: 'grid grid-cols-4 gap-2' },
                      [
                        { key: 'DomDom', color: 'emerald', icon: '\uD83D\uDFE2' },
                        { key: 'DomRec', color: 'sky', icon: '\uD83D\uDD35' },
                        { key: 'RecDom', color: 'amber', icon: '\uD83D\uDFE1' },
                        { key: 'RecRec', color: 'red', icon: '\uD83D\uDD34' }
                      ].map(function(cat) {
                        return h('div', { key: cat.key, className: 'bg-' + cat.color + '-50 rounded-lg p-2 text-center border border-' + cat.color + '-200' },
                          h('p', { className: 'text-lg font-bold text-' + cat.color + '-700' }, diPhenoCounts[cat.key] + '/16'),
                          h('p', { className: 'text-[11px] font-bold text-' + cat.color + '-600' }, diPhenoLabel(cat.key)),
                          h('p', { className: 'text-[11px] text-slate-600' }, (diPhenoCounts[cat.key] / 16 * 100).toFixed(1) + '%')
                        );
                      })
                    ),
                    // Classic ratio check
                    diPhenoCounts.DomDom === 9 && diPhenoCounts.DomRec === 3 && diPhenoCounts.RecDom === 3 && diPhenoCounts.RecRec === 1
                      ? h('p', { className: 'mt-2 text-xs text-emerald-600 font-bold text-center' }, '\uD83C\uDF1F Classic 9:3:3:1 ratio! This is Mendel\'s signature dihybrid ratio from independent assortment.')
                      : diPhenoCounts.DomDom === 4 && diPhenoCounts.DomRec === 4 && diPhenoCounts.RecDom === 4 && diPhenoCounts.RecRec === 4
                        ? h('p', { className: 'mt-2 text-xs text-sky-600 font-bold text-center' }, '\uD83D\uDCA1 1:1:1:1 ratio! This is a dihybrid test cross (double heterozygote \u00D7 double recessive).')
                        : h('p', { className: 'mt-2 text-xs text-slate-600 italic text-center' }, '\uD83D\uDCA1 Try AaBb \u00D7 AaBb for the classic 9:3:3:1 ratio, or AaBb \u00D7 aabb for a 1:1:1:1 test cross.')
                  ),

                  // Dihybrid Quick Crosses
                  h('div', { className: 'mt-3 border-t border-slate-200 pt-3' },
                    h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83E\uDDEC Dihybrid Quick Crosses'),
                    h('div', { className: 'flex flex-wrap gap-1.5' },
                      DIHYBRID_PRESETS.map(function(dp) {
                        return h('button', { 'aria-label': 'Punnett Sound',
                          key: dp.label,
                          onClick: function() {
                            punnettSound('preset');
                            updMulti({
                              _diP1G1: dp.g1.slice(), _diP1G2: dp.g2.slice(),
                              _diP2G1: dp.g1.slice(), _diP2G2: dp.g2.slice(),
                              _diPreset: dp
                            });
                            // For test cross presets, set parent2 to double recessive
                            if (dp.label.indexOf('ccss') !== -1 || dp.label.indexOf('aabb') !== -1) {
                              updMulti({
                                _diP2G1: [dp.g1[1], dp.g1[1]],
                                _diP2G2: [dp.g2[1], dp.g2[1]]
                              });
                            }
                            addToast('\uD83E\uDDEC ' + dp.desc, 'success');
                            var newPresets = presetsUsed + 1;
                            upd('_presetsUsed', newPresets);
                          },
                          className: 'px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all'
                        }, dp.label);
                      })
                    )
                  ),

                  // Dihybrid educational callout
                  h('p', { className: 'mt-3 text-xs text-slate-600 italic' },
                    diPreset
                      ? '\uD83D\uDCA1 ' + diPreset.t1name + ' (' + diPreset.domLabel1 + '/' + diPreset.recLabel1 + ') and ' + diPreset.t2name + ' (' + diPreset.domLabel2 + '/' + diPreset.recLabel2 + ') are inherited independently.'
                      : '\uD83D\uDCA1 In dihybrid crosses, each parent forms 4 gamete types. The 4\u00D74 grid shows all 16 possible offspring combinations.'
                  )
                )
              )
            ),

            // ════════════════════════════════════════
            // PEDIGREE SUB-TOOL
            // ════════════════════════════════════════
            subtool === 'pedigree' && h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' },
                gradeText(
                  'Family trees show how traits pass from parents to children!',
                  'Pedigree charts trace inheritance patterns through generations. Can you figure out the pattern?',
                  'Analyze pedigree charts to determine the mode of inheritance. Look for patterns in affected individuals.',
                  'Pedigree analysis: determine inheritance mode from affected/unaffected status, carrier identification, and sex ratios.'
                )(band)
              ),

              // Preset selector
              h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
                PEDIGREE_PRESETS.map(function(ped, idx) {
                  var isActive = pedPreset === idx;
                  return h('button', { key: ped.id,
                    onClick: function() { updMulti({ _pedPreset: idx, _pedSolveAnswer: '', _pedSolveFeedback: null }); punnettSound('preset'); },
                    className: 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border ' +
                      (isActive ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300')
                  }, ped.label);
                })
              ),

              // Controls
              h('div', { className: 'flex gap-2 mb-3' },
                h('button', { onClick: function() { upd('_pedShowGeno', !pedShowGeno); },
                  className: 'px-2 py-1 text-[11px] font-bold rounded-lg border ' + (pedShowGeno ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-600 border-slate-200')
                }, pedShowGeno ? '\uD83D\uDC41 Hide Genotypes' : '\uD83D\uDC41 Show Genotypes'),
                h('button', { 'aria-label': 'Toggle pedigree solve mode',
                  onClick: function() { updMulti({ _pedSolveMode: !pedSolveMode, _pedSolveAnswer: '', _pedSolveFeedback: null, _pedShowGeno: pedSolveMode }); },
                  className: 'px-2 py-1 text-[11px] font-bold rounded-lg border ' + (pedSolveMode ? 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300' : 'bg-slate-50 text-slate-600 border-slate-200')
                }, pedSolveMode ? '\uD83E\uDDE9 Solve Mode ON' : '\uD83E\uDDE9 Solve Mode')
              ),

              // Pedigree SVG
              h('div', { className: 'bg-white rounded-xl border border-violet-200 p-3' },
                h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' },
                  pedSolveMode ? '\uD83E\uDDE9 What inheritance pattern is this?' : currentPed.label + ' (' + currentPed.example + ')'
                ),
                h('svg', { viewBox: '0 0 380 280', className: 'w-full max-w-md mx-auto', style: { background: '#fafafa', borderRadius: '8px' } },
                  // Legend
                  h('rect', { x: 5, y: 5, width: 12, height: 12, fill: 'white', stroke: '#1e293b', strokeWidth: 1.5 }),
                  h('text', { x: 22, y: 14, style: { fontSize: '8px', fill: '#94a3b8' } }, 'Unaffected'),
                  h('rect', { x: 85, y: 5, width: 12, height: 12, fill: '#7c3aed', stroke: '#1e293b', strokeWidth: 1.5 }),
                  h('text', { x: 102, y: 14, style: { fontSize: '8px', fill: '#94a3b8' } }, 'Affected'),
                  h('circle', { cx: 175, cy: 11, r: 6, fill: 'white', stroke: '#1e293b', strokeWidth: 1.5 }),
                  h('path', { d: 'M 175 5 A 6 6 0 0 0 175 17 Z', fill: '#c4b5fd' }),
                  h('circle', { cx: 175, cy: 11, r: 6, fill: 'none', stroke: '#1e293b', strokeWidth: 1.5 }),
                  h('text', { x: 186, y: 14, style: { fontSize: '8px', fill: '#94a3b8' } }, 'Carrier'),
                  h('text', { x: 240, y: 14, style: { fontSize: '8px', fill: '#94a3b8' } }, '\u25A1 = Male  \u25CB = Female'),

                  // Connection lines
                  (function() {
                    var lines = [];
                    // Couple lines
                    currentPed.couples.forEach(function(pair, ci) {
                      var m1 = findMem(pair[0]);
                      var m2 = findMem(pair[1]);
                      if (m1 && m2) {
                        lines.push(h('line', { key: 'c' + ci, x1: m1.x + 16, y1: m1.y, x2: m2.x - 16, y2: m2.y, stroke: '#94a3b8', strokeWidth: 2 }));
                      }
                    });
                    // Descent lines
                    currentPed.sibGroups.forEach(function(sg, gi) {
                      var p1 = findMem(sg.parents[0]);
                      var p2 = findMem(sg.parents[1]);
                      if (!p1 || !p2) return;
                      var midX = (p1.x + p2.x) / 2;
                      var midY = p1.y;
                      var firstChild = findMem(sg.children[0]);
                      var lastChild = findMem(sg.children[sg.children.length - 1]);
                      if (!firstChild) return;
                      var sibY = midY + 45;
                      // Vertical from couple
                      lines.push(h('line', { key: 'v' + gi, x1: midX, y1: midY, x2: midX, y2: sibY, stroke: '#94a3b8', strokeWidth: 2 }));
                      // Horizontal sibling bar
                      lines.push(h('line', { key: 's' + gi, x1: firstChild.x, y1: sibY, x2: lastChild.x, y2: sibY, stroke: '#94a3b8', strokeWidth: 2 }));
                      // Vertical to each child
                      sg.children.forEach(function(cid, ci) {
                        var child = findMem(cid);
                        if (child) {
                          lines.push(h('line', { key: 'k' + gi + '_' + ci, x1: child.x, y1: sibY, x2: child.x, y2: child.y - 16, stroke: '#94a3b8', strokeWidth: 2 }));
                        }
                      });
                    });
                    return lines;
                  })(),

                  // Members
                  currentPed.members.map(function(m) {
                    var els = [];
                    var showGeno = pedShowGeno && !pedSolveMode;
                    if (m.sex === 'M') {
                      // Square
                      if (m.carrier) {
                        els.push(h('rect', { key: m.id + 'bg', x: m.x - 15, y: m.y - 15, width: 30, height: 30, fill: 'white', stroke: 'none' }));
                        els.push(h('rect', { key: m.id + 'car', x: m.x - 15, y: m.y - 15, width: 15, height: 30, fill: '#c4b5fd', stroke: 'none' }));
                        els.push(h('rect', { key: m.id + 'brd', x: m.x - 15, y: m.y - 15, width: 30, height: 30, fill: 'none', stroke: '#1e293b', strokeWidth: 2 }));
                      } else {
                        els.push(h('rect', { key: m.id + 's', x: m.x - 15, y: m.y - 15, width: 30, height: 30, fill: m.affected ? '#7c3aed' : 'white', stroke: '#1e293b', strokeWidth: 2 }));
                      }
                    } else {
                      // Circle
                      if (m.carrier) {
                        els.push(h('circle', { key: m.id + 'bg', cx: m.x, cy: m.y, r: 15, fill: 'white', stroke: 'none' }));
                        els.push(h('path', { key: m.id + 'car', d: 'M ' + m.x + ' ' + (m.y - 15) + ' A 15 15 0 0 0 ' + m.x + ' ' + (m.y + 15) + ' Z', fill: '#c4b5fd' }));
                        els.push(h('circle', { key: m.id + 'brd', cx: m.x, cy: m.y, r: 15, fill: 'none', stroke: '#1e293b', strokeWidth: 2 }));
                      } else {
                        els.push(h('circle', { key: m.id + 's', cx: m.x, cy: m.y, r: 15, fill: m.affected ? '#7c3aed' : 'white', stroke: '#1e293b', strokeWidth: 2 }));
                      }
                    }
                    // Label below
                    els.push(h('text', { key: m.id + 'l', x: m.x, y: m.y + 30, textAnchor: 'middle', style: { fontSize: '11px', fill: '#94a3b8' } }, m.label));
                    // Genotype inside
                    if (showGeno) {
                      els.push(h('text', { key: m.id + 'g', x: m.x, y: m.y + 4, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold', fill: m.affected ? 'white' : '#1e293b' } }, m.genotype));
                    }
                    return els;
                  })
                )
              ),

              // Solve mode interface
              pedSolveMode && h('div', { className: 'mt-3 bg-fuchsia-50 rounded-xl p-3 border border-fuchsia-200' },
                h('p', { className: 'text-xs font-bold text-fuchsia-700 mb-2' }, 'What inheritance pattern does this pedigree show?'),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  [
                    { val: 'autosomal_dominant', label: 'Autosomal Dominant' },
                    { val: 'autosomal_recessive', label: 'Autosomal Recessive' },
                    { val: 'x_linked_recessive', label: 'X-Linked Recessive' },
                    { val: 'codominant', label: 'Codominant' },
                    { val: 'mitochondrial', label: 'Mitochondrial' },
                    { val: 'y_linked', label: 'Y-Linked' }
                  ].map(function(opt) {
                    var isSelected = pedSolveAnswer === opt.val;
                    return h('button', { key: opt.val,
                      onClick: function() {
                        upd('_pedSolveAnswer', opt.val);
                        var correct = opt.val === currentPed.answer;
                        if (correct) {
                          punnettSound('correct');
                          upd('_pedSolveFeedback', '\u2705 Correct! ' + currentPed.explanation);
                          upd('_pedigreeSolved', true);
                          awardXP('pedigreeSolve', 20, 'Pedigree Analysis');
                        } else {
                          punnettSound('wrong');
                          upd('_pedSolveFeedback', '\u274C Not quite. Look at: affected in every generation? More males? Carriers visible? Try again!');
                        }
                      },
                      className: 'px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ' +
                        (isSelected ? (pedSolveFeedback && pedSolveFeedback.indexOf('\u2705') !== -1 ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-red-100 text-red-700 border-red-300') : 'bg-white text-slate-600 border-slate-200 hover:border-fuchsia-300')
                    }, opt.label);
                  })
                ),
                pedSolveFeedback && h('p', { className: 'mt-2 text-xs font-bold ' + (pedSolveFeedback.indexOf('\u2705') !== -1 ? 'text-emerald-600' : 'text-red-500') }, pedSolveFeedback)
              ),

              // Explanation (non-solve mode)
              !pedSolveMode && h('div', { className: 'mt-3 bg-violet-50 rounded-xl p-3 border border-violet-200' },
                h('p', { className: 'text-[11px] font-bold text-violet-600 uppercase tracking-wider mb-1' }, '\uD83D\uDCA1 Pattern Explanation'),
                h('p', { className: 'text-xs text-slate-600' }, currentPed.explanation)
              )
            ),

            // ════════════════════════════════════════
            // POPULATION GENETICS SUB-TOOL
            // ════════════════════════════════════════
            subtool === 'population' && h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' },
                gradeText(
                  'Watch how animal colors change in a group over time!',
                  'See how traits become more or less common in a population. Change the sliders to see what happens!',
                  'The Hardy-Weinberg equation (p\u00B2 + 2pq + q\u00B2 = 1) predicts genotype frequencies. Explore what happens when equilibrium conditions are violated.',
                  'Model allele frequency dynamics under selection, drift, and mutation. Observe how violations of Hardy-Weinberg assumptions drive microevolution.'
                )(band)
              ),

              // Controls
              h('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-200 mb-3' },
                h('p', { className: 'text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-2' }, '\uD83D\uDCCA Hardy-Weinberg Controls'),

                // Allele frequency
                h('div', { className: 'mb-2' },
                  h('label', { className: 'text-[11px] font-bold text-slate-600 block mb-1' }, 'Allele Frequency (p = ' + popFreqA.toFixed(2) + ', q = ' + (1 - popFreqA).toFixed(2) + ')'),
                  h('input', {
                    type: 'range', 'aria-label': 'pop freq a', min: '0.01', max: '0.99', step: '0.01', value: popFreqA,
                    onChange: function(e) { upd('popFreqA', parseFloat(e.target.value)); },
                    className: 'w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer'
                  })
                ),

                // Population size
                h('div', { className: 'mb-2' },
                  h('label', { className: 'text-[11px] font-bold text-slate-600 block mb-1' }, 'Population Size: ' + popSize),
                  h('input', {
                    type: 'range', 'aria-label': 'pop size', min: '10', max: '1000', step: '10', value: popSize,
                    onChange: function(e) { upd('popSize', parseInt(e.target.value, 10)); },
                    className: 'w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer'
                  })
                ),

                // Generations
                h('div', { className: 'mb-2' },
                  h('label', { className: 'text-[11px] font-bold text-slate-600 block mb-1' }, 'Generations: ' + popGens),
                  h('input', {
                    type: 'range', 'aria-label': 'pop gens', min: '10', max: '100', step: '5', value: popGens,
                    onChange: function(e) { upd('popGens', parseInt(e.target.value, 10)); },
                    className: 'w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer'
                  })
                ),

                // Selection coefficient
                (band === 'g68' || band === 'g912') && h('div', { className: 'mb-2' },
                  h('label', { className: 'text-[11px] font-bold text-slate-600 block mb-1' }, 'Selection Against Recessive (s = ' + popSelection.toFixed(2) + ')'),
                  h('input', {
                    type: 'range', 'aria-label': 'pop selection', min: '0', max: '1', step: '0.05', value: popSelection,
                    onChange: function(e) { upd('popSelection', parseFloat(e.target.value)); },
                    className: 'w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer'
                  })
                ),

                // Mutation rate
                band === 'g912' && h('div', { className: 'mb-2' },
                  h('label', { className: 'text-[11px] font-bold text-slate-600 block mb-1' }, 'Mutation Rate (\u03BC = ' + popMutation.toFixed(4) + ')'),
                  h('input', {
                    type: 'range',  min: '0', max: '0.01', step: '0.0005', value: popMutation,
                    onChange: function(e) { upd('popMutation', parseFloat(e.target.value)); },
                    className: 'w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer'
                  })
                ),

                // Drift toggle
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('button', { 'aria-label': 'Random genetic drift (stronger in small populations)',
                    onClick: function() { upd('popDrift', !popDrift); },
                    className: 'px-2 py-1 text-[11px] font-bold rounded-lg border ' + (popDrift ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-slate-50 text-slate-600 border-slate-200')
                  }, popDrift ? '\uD83C\uDFB2 Drift ON' : '\uD83C\uDFB2 Drift OFF'),
                  h('span', { className: 'text-[11px] text-slate-600' }, 'Random genetic drift (stronger in small populations)')
                ),

                // Run / Reset buttons
                h('div', { className: 'flex gap-2' },
                  h('button', { 'aria-label': 'Change pop running',
                    onClick: function() {
                      if (popRunning) {
                        upd('popRunning', false);
                      } else {
                        updMulti({ popHistory: [popFreqA], popRunning: true });
                        upd('_popSimDone', true);
                        awardXP('popSim', 10, 'Population Simulation');
                      }
                    },
                    className: 'px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-all ' + (popRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-700 hover:bg-emerald-800')
                  }, popRunning ? '\u23F8 Pause' : '\u25B6 Simulate'),
                  h('button', { 'aria-label': 'Reset',
                    onClick: function() { updMulti({ popHistory: null, popRunning: false }); },
                    className: 'px-4 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200'
                  }, '\u21BA Reset')
                )
              ),

              // HW Equilibrium display
              h('div', { className: 'grid grid-cols-3 gap-2 mb-3' },
                h('div', { className: 'bg-emerald-50 rounded-xl p-2 text-center border border-emerald-200' },
                  h('p', { className: 'text-[11px] font-bold text-emerald-600' }, 'AA (p\u00B2)'),
                  h('p', { className: 'text-lg font-bold text-emerald-700' }, (popFreqA * popFreqA * 100).toFixed(1) + '%'),
                  h('p', { className: 'text-[11px] text-emerald-500' }, 'Homozygous Dom')
                ),
                h('div', { className: 'bg-sky-50 rounded-xl p-2 text-center border border-sky-200' },
                  h('p', { className: 'text-[11px] font-bold text-sky-600' }, 'Aa (2pq)'),
                  h('p', { className: 'text-lg font-bold text-sky-700' }, (2 * popFreqA * (1 - popFreqA) * 100).toFixed(1) + '%'),
                  h('p', { className: 'text-[11px] text-sky-500' }, 'Heterozygous')
                ),
                h('div', { className: 'bg-amber-50 rounded-xl p-2 text-center border border-amber-200' },
                  h('p', { className: 'text-[11px] font-bold text-amber-600' }, 'aa (q\u00B2)'),
                  h('p', { className: 'text-lg font-bold text-amber-700' }, ((1 - popFreqA) * (1 - popFreqA) * 100).toFixed(1) + '%'),
                  h('p', { className: 'text-[11px] text-amber-500' }, 'Homozygous Rec')
                )
              ),

              // Population visualization (dot field)
              h('div', { className: 'bg-white rounded-xl border p-3 mb-3' },
                h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83D\uDC65 Population Sample (n=' + Math.min(popSize, 100) + ')'),
                h('svg', { viewBox: '0 0 300 60', className: 'w-full' },
                  (function() {
                    var dots = [];
                    var p = popHistory && popHistory.length > 0 ? popHistory[popHistory.length - 1] : popFreqA;
                    var q = 1 - p;
                    var n = Math.min(popSize, 100);
                    var cols = 20;
                    for (var i = 0; i < n; i++) {
                      var rand = Math.random();
                      var color = rand < p * p ? '#22c55e' : rand < p * p + 2 * p * q ? '#38bdf8' : '#f59e0b';
                      var cx = 10 + (i % cols) * 14.5;
                      var cy = 8 + Math.floor(i / cols) * 12;
                      dots.push(h('circle', { key: i, cx: cx, cy: cy, r: 4.5, fill: color, opacity: 0.85 }));
                    }
                    return dots;
                  })()
                ),
                h('div', { className: 'flex justify-center gap-4 mt-1 text-[11px] font-bold' },
                  h('span', { className: 'text-emerald-600' }, '\u25CF AA'),
                  h('span', { className: 'text-sky-500' }, '\u25CF Aa'),
                  h('span', { className: 'text-amber-500' }, '\u25CF aa')
                )
              ),

              // Allele frequency graph
              popHistory && popHistory.length > 1 && h('div', { className: 'bg-white rounded-xl border p-3' },
                h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83D\uDCC8 Allele Frequency Over Generations'),
                h('svg', { viewBox: '0 0 340 160', className: 'w-full' },
                  // Grid
                  h('line', { x1: 30, y1: 10, x2: 30, y2: 140, stroke: '#e2e8f0', strokeWidth: 1 }),
                  h('line', { x1: 30, y1: 140, x2: 330, y2: 140, stroke: '#e2e8f0', strokeWidth: 1 }),
                  h('line', { x1: 30, y1: 75, x2: 330, y2: 75, stroke: '#e2e8f0', strokeWidth: 0.5, strokeDasharray: '4' }),
                  h('line', { x1: 30, y1: 10, x2: 330, y2: 10, stroke: '#e2e8f0', strokeWidth: 0.5, strokeDasharray: '4' }),
                  // Y-axis labels
                  h('text', { x: 2, y: 14, style: { fontSize: '8px', fill: '#94a3b8' } }, '1.0'),
                  h('text', { x: 2, y: 79, style: { fontSize: '8px', fill: '#94a3b8' } }, '0.5'),
                  h('text', { x: 2, y: 144, style: { fontSize: '8px', fill: '#94a3b8' } }, '0.0'),
                  h('text', { x: 165, y: 156, textAnchor: 'middle', style: { fontSize: '8px', fill: '#94a3b8' } }, 'Generation'),
                  // p line
                  h('polyline', {
                    fill: 'none', stroke: '#22c55e', strokeWidth: 2,
                    points: popHistory.map(function(pVal, i) {
                      var x = 30 + (i / Math.max(popGens, popHistory.length - 1)) * 300;
                      var y = 140 - pVal * 130;
                      return x + ',' + y;
                    }).join(' ')
                  }),
                  // q line
                  h('polyline', {
                    fill: 'none', stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4',
                    points: popHistory.map(function(pVal, i) {
                      var x = 30 + (i / Math.max(popGens, popHistory.length - 1)) * 300;
                      var y = 140 - (1 - pVal) * 130;
                      return x + ',' + y;
                    }).join(' ')
                  }),
                  // Labels
                  h('text', { x: 335, y: 140 - popHistory[popHistory.length - 1] * 130, style: { fontSize: '11px', fontWeight: 'bold', fill: '#22c55e' } }, 'p'),
                  h('text', { x: 335, y: 140 - (1 - popHistory[popHistory.length - 1]) * 130, style: { fontSize: '11px', fontWeight: 'bold', fill: '#f59e0b' } }, 'q')
                ),
                h('p', { className: 'text-[11px] text-slate-600 mt-1 text-center' },
                  'Gen ' + (popHistory.length - 1) + ': p = ' + popHistory[popHistory.length - 1].toFixed(4) + ', q = ' + (1 - popHistory[popHistory.length - 1]).toFixed(4)
                )
              )
            ),

            // ════════════════════════════════════════
            // TRAIT EXPLORER SUB-TOOL
            // ════════════════════════════════════════
            subtool === 'traits' && h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' },
                gradeText(
                  'Look at all these cool traits that get passed down in families!',
                  'Explore real genetic traits and how they are inherited. Click on a trait to learn more!',
                  'Browse a catalog of genetic traits organized by inheritance pattern. Understand how each follows specific Mendelian or non-Mendelian rules.',
                  'Analyze inheritance patterns of real genetic conditions including autosomal, sex-linked, codominant, and polygenic traits.'
                )(band)
              ),

              // Filter buttons
              h('div', { className: 'flex flex-wrap gap-1 mb-3' },
                [
                  { val: 'all', label: 'All Traits' },
                  { val: 'complete', label: 'Dominant/Rec' },
                  { val: 'recessive', label: 'Recessive' },
                  { val: 'codominant', label: 'Codominant' },
                  { val: 'incomplete', label: 'Incomplete' },
                  { val: 'x_linked', label: 'X-Linked' },
                  { val: 'polygenic', label: 'Polygenic' }
                ].map(function(f) {
                  return h('button', { key: f.val,
                    onClick: function() { upd('_traitFilter', f.val); },
                    className: 'px-2 py-1 text-[11px] font-bold rounded-lg border ' +
                      (traitFilter === f.val ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300')
                  }, f.label);
                })
              ),

              // Trait cards
              h('div', { className: 'grid grid-cols-2 gap-2' },
                TRAIT_CATALOG.filter(function(t) {
                  return traitFilter === 'all' || t.mode === traitFilter;
                }).map(function(t, idx) {
                  var globalIdx = TRAIT_CATALOG.indexOf(t);
                  var isSelected = traitSelected === globalIdx;
                  var modeColors = {
                    complete: 'emerald', recessive: 'amber', codominant: 'purple',
                    incomplete: 'pink', x_linked: 'blue', polygenic: 'teal'
                  };
                  var mc = modeColors[t.mode] || 'slate';
                  return h('div', { 
                    key: idx,
                    onClick: function() { upd('_traitSelected', isSelected ? -1 : globalIdx); punnettSound('preset'); },
                    className: 'p-2.5 rounded-xl border cursor-pointer transition-all ' +
                      (isSelected ? 'bg-' + mc + '-50 border-' + mc + '-300 shadow-md' : 'bg-white border-slate-200 hover:border-' + mc + '-200')
                  },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { className: 'text-xl' }, t.icon),
                      h('span', { className: 'text-xs font-bold text-slate-700' }, t.name)
                    ),
                    h('span', { className: 'px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-' + mc + '-100 text-' + mc + '-700' },
                      t.mode === 'complete' ? 'Dominant' : t.mode === 'recessive' ? 'Recessive' : t.mode === 'codominant' ? 'Codominant' : t.mode === 'incomplete' ? 'Incomplete' : t.mode === 'x_linked' ? 'X-Linked' : 'Polygenic'
                    ),
                    isSelected && h('div', { className: 'mt-2 pt-2 border-t border-' + mc + '-200' },
                      h('p', { className: 'text-[11px] text-slate-600 mb-1' }, t.desc),
                      h('p', { className: 'text-[11px] text-slate-600' }, '\uD83D\uDFE2 Dominant: ' + t.dom + ' | \uD83D\uDFE1 Recessive: ' + t.rec),
                      h('p', { className: 'text-[11px] text-slate-600' }, '\uD83D\uDCCA Frequency: ' + t.freq)
                    )
                  );
                })
              )
            ),

            // ════════════════════════════════════════
            // DNA → PROTEIN SUB-TOOL
            // ════════════════════════════════════════
            subtool === 'dna2protein' && h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' },
                gradeText(
                  'DNA has a secret code that tells cells how to build things! Type some letters to see the code.',
                  'DNA is read in groups of 3 letters called codons. Each codon tells the cell to add a specific building block (amino acid) to a protein.',
                  'The Central Dogma: DNA \u2192 mRNA (transcription) \u2192 Protein (translation). Enter a DNA sequence to see each step.',
                  'Explore the Central Dogma of molecular biology. Analyze reading frames, codon usage, and amino acid properties.'
                )(band)
              ),

              // DNA input
              h('div', { className: 'bg-gradient-to-r from-fuchsia-50 to-purple-50 rounded-xl p-3 border border-fuchsia-200 mb-3' },
                h('label', { className: 'text-[11px] font-bold text-fuchsia-600 uppercase tracking-wider block mb-1' }, '\uD83E\uDDEC Enter DNA Template Strand (5\'\u21923\')'),
                h('input', {
                  type: 'text', value: dnaSeq,
                  onChange: function(e) { upd('_dnaSeq', e.target.value.toUpperCase().replace(/[^ATCG]/g, '')); },
                  placeholder: 'e.g. ATGCGTACCTGA',
                  'aria-label': 'DNA template strand sequence',
                  className: 'w-full px-3 py-2 text-sm font-mono font-bold border border-fuchsia-200 rounded-lg focus:outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-300 tracking-widest'
                }),
                h('div', { className: 'flex gap-2 mt-2' },
                  h('button', { 'aria-label': 'Sample 1',
                    onClick: function() { upd('_dnaShowSteps', !dnaShowSteps); },
                    className: 'px-2 py-1 text-[11px] font-bold rounded-lg border ' + (dnaShowSteps ? 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300' : 'bg-white text-slate-600 border-slate-200')
                  }, dnaShowSteps ? '\uD83D\uDC41 Hide Steps' : '\uD83D\uDC41 Show Steps'),
                  // Quick presets
                  h('button', { 'aria-label': 'Sample 1',
                    onClick: function() { upd('_dnaSeq', 'ATGAAAGCTTTTCGATGA'); punnettSound('translate'); },
                    className: 'px-2 py-1 text-[11px] font-bold rounded-lg bg-white text-slate-600 border border-slate-200 hover:border-fuchsia-300'
                  }, '\uD83E\uDDEA Sample 1'),
                  h('button', { 'aria-label': 'Sample 2',
                    onClick: function() { upd('_dnaSeq', 'ATGTGCCCGAACGTTTACTGA'); punnettSound('translate'); },
                    className: 'px-2 py-1 text-[11px] font-bold rounded-lg bg-white text-slate-600 border border-slate-200 hover:border-fuchsia-300'
                  }, '\uD83E\uDDEA Sample 2'),
                  h('button', { 'aria-label': 'Translate',
                    onClick: function() {
                      if (!d._dnaDone) { upd('_dnaDone', true); awardXP('dnaTranslate', 15, 'DNA Translation'); }
                      punnettSound('translate');
                    },
                    className: 'ml-auto px-3 py-1 text-[11px] font-bold text-white bg-fuchsia-700 rounded-lg hover:bg-fuchsia-600'
                  }, '\u25B6 Translate')
                )
              ),

              // Translation steps
              dnaSeq.length >= 3 && (function() {
                var mRNA = transcribe(dnaSeq);
                var result = translate(mRNA);
                var codons = result.codons;
                var aminos = result.aminos;
                return h('div', null,
                  // Step display
                  dnaShowSteps && h('div', { className: 'bg-white rounded-xl border p-3 mb-3 space-y-2' },
                    h('div', null,
                      h('p', { className: 'text-[11px] font-bold text-blue-600' }, '1\uFE0F\u20E3 DNA Template (3\'\u21925\')'),
                      h('p', { className: 'font-mono text-sm font-bold text-blue-700 tracking-widest' }, dnaSeq)
                    ),
                    h('div', null,
                      h('p', { className: 'text-[11px] font-bold text-emerald-600' }, '2\uFE0F\u20E3 mRNA (5\'\u21923\') — Transcription'),
                      h('p', { className: 'font-mono text-sm font-bold text-emerald-700 tracking-widest' }, mRNA)
                    ),
                    h('div', null,
                      h('p', { className: 'text-[11px] font-bold text-fuchsia-600' }, '3\uFE0F\u20E3 Codons'),
                      h('div', { className: 'flex flex-wrap gap-1' },
                        codons.map(function(c, i) {
                          var aa = aminos[i];
                          var cat = AMINO_CAT[aa] || 'nonpolar';
                          return h('span', {
                            key: i,
                            className: 'px-1.5 py-0.5 rounded font-mono text-xs font-bold text-white',
                            style: { background: AMINO_COLORS[cat] || '#94a3b8' }
                          }, c);
                        })
                      )
                    )
                  ),

                  // Amino acid chain
                  h('div', { className: 'bg-white rounded-xl border p-3 mb-3' },
                    h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83E\uDDEA Protein (Amino Acid Chain)'),
                    h('div', { className: 'flex flex-wrap gap-1' },
                      aminos.map(function(aa, i) {
                        var cat = AMINO_CAT[aa] || 'nonpolar';
                        return h('div', {
                          key: i,
                          className: 'text-center p-1.5 rounded-lg border-2 min-w-[48px]',
                          style: { borderColor: AMINO_COLORS[cat] || '#94a3b8', background: (AMINO_COLORS[cat] || '#94a3b8') + '15' },
                          title: AMINO_FULL[aa] || aa
                        },
                          h('span', { className: 'text-xs font-bold block', style: { color: AMINO_COLORS[cat] || '#94a3b8' } }, aa),
                          h('span', { className: 'text-[11px] text-slate-600 block' }, codons[i]),
                          i < aminos.length - 1 && aa !== 'Stop' ? h('span', { className: 'text-[11px] text-slate-600' }, '\u2192') : null
                        );
                      })
                    ),
                    h('p', { className: 'text-[11px] text-slate-600 mt-2' }, 'Protein length: ' + aminos.filter(function(a) { return a !== 'Stop'; }).length + ' amino acids')
                  ),

                  // Color legend
                  h('div', { className: 'bg-slate-50 rounded-xl p-2 mb-3' },
                    h('p', { className: 'text-[11px] font-bold text-slate-600 mb-1' }, 'Amino Acid Properties'),
                    h('div', { className: 'flex flex-wrap gap-2' },
                      [
                        { cat: 'nonpolar', label: 'Nonpolar (hydrophobic)' },
                        { cat: 'polar', label: 'Polar (hydrophilic)' },
                        { cat: 'positive', label: 'Positive charge' },
                        { cat: 'negative', label: 'Negative charge' },
                        { cat: 'start', label: 'Start codon (Met)' },
                        { cat: 'stop', label: 'Stop codon' }
                      ].map(function(c) {
                        return h('span', { key: c.cat, className: 'text-[11px] font-bold', style: { color: AMINO_COLORS[c.cat] } }, '\u25CF ' + c.label);
                      })
                    )
                  ),

                  // ═══ MUTATION SIMULATOR ═══
                  h('div', { className: 'bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-3 border border-red-200' },
                    h('p', { className: 'text-[11px] font-bold text-red-600 uppercase tracking-wider mb-2' }, '\u2622\uFE0F Mutation Simulator'),
                    h('p', { className: 'text-[11px] text-slate-600 mb-2' },
                      gradeText(
                        'Press a button to change the DNA and see what happens to the protein!',
                        'Mutations are changes in DNA. Try each type and watch how the protein changes!',
                        'Point mutations change one base. Insertions and deletions cause frameshifts that alter every downstream amino acid.',
                        'Explore substitution (transition/transversion), insertion, and deletion mutations. Frameshifts from indels are typically more deleterious than point mutations.'
                      )(band)
                    ),
                    h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
                      h('button', { 'aria-label': 'Point Mutation',
                        onClick: function() { applyMutation('point'); },
                        className: 'px-2.5 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-orange-700 border-orange-200 hover:bg-orange-50 transition-all'
                      }, '\uD83D\uDD00 Point Mutation'),
                      h('button', { 'aria-label': 'Insertion',
                        onClick: function() { applyMutation('insertion'); },
                        className: 'px-2.5 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-red-700 border-red-200 hover:bg-red-50 transition-all'
                      }, '\u2795 Insertion'),
                      h('button', { 'aria-label': 'Deletion',
                        onClick: function() { applyMutation('deletion'); },
                        className: 'px-2.5 py-1.5 text-[11px] font-bold rounded-lg border bg-white text-red-700 border-red-200 hover:bg-red-50 transition-all'
                      }, '\u2796 Deletion'),
                      mutOriginalDna && h('button', { 'aria-label': 'Revert to Original',
                        onClick: revertMutation,
                        className: 'px-2.5 py-1.5 text-[11px] font-bold rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 transition-all'
                      }, '\u21BA Revert to Original')
                    ),

                    // Side-by-side comparison when mutated
                    mutOriginalDna && (function() {
                      var origMRNA = transcribe(mutOriginalDna);
                      var origResult = translate(origMRNA);
                      var origAminos = origResult.aminos;
                      var mutMRNA = transcribe(dnaSeq);
                      var mutResult = translate(mutMRNA);
                      var mutAminos = mutResult.aminos;
                      var changes = 0;
                      var maxLen = Math.max(origAminos.length, mutAminos.length);
                      for (var ci = 0; ci < maxLen; ci++) {
                        if (origAminos[ci] !== mutAminos[ci]) changes++;
                      }

                      return h('div', { className: 'bg-white rounded-lg p-2 border border-red-100' },
                        h('div', { className: 'grid grid-cols-2 gap-2 mb-2' },
                          h('div', null,
                            h('p', { className: 'text-[11px] font-bold text-emerald-600 mb-1' }, 'Original DNA'),
                            h('p', { className: 'font-mono text-[11px] text-emerald-700 break-all' }, mutOriginalDna)
                          ),
                          h('div', null,
                            h('p', { className: 'text-[11px] font-bold text-red-600 mb-1' }, 'Mutated DNA' + (mutType ? ' (' + mutType + ')' : '')),
                            h('p', { className: 'font-mono text-[11px] text-red-700 break-all' }, dnaSeq)
                          )
                        ),
                        h('p', { className: 'text-[11px] font-bold mb-1 ' + (changes > 0 ? 'text-red-600' : 'text-emerald-600') },
                          changes === 0
                            ? '\u2705 Silent mutation \u2014 protein unchanged!'
                            : '\u26A0\uFE0F ' + changes + ' amino acid' + (changes > 1 ? 's' : '') + ' changed' + (mutType === 'insertion' || mutType === 'deletion' ? ' (frameshift!)' : '')
                        ),
                        h('div', { className: 'flex flex-wrap gap-0.5' },
                          (function() {
                            var items = [];
                            for (var ai = 0; ai < maxLen; ai++) {
                              var origAA = origAminos[ai] || '\u2014';
                              var mutAA = mutAminos[ai] || '\u2014';
                              var changed = origAA !== mutAA;
                              items.push(h('div', {
                                key: ai,
                                className: 'text-center px-1 py-0.5 rounded text-[11px] font-bold min-w-[32px] border ' +
                                  (changed ? 'bg-red-100 border-red-300 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600')
                              },
                                h('span', { className: 'block' }, origAA),
                                changed && h('span', { className: 'block text-[11px]' }, '\u2193'),
                                changed && h('span', { className: 'block text-red-600' }, mutAA)
                              ));
                            }
                            return items;
                          })()
                        ),
                        (mutType === 'insertion' || mutType === 'deletion') && h('p', { className: 'text-[11px] text-red-500 mt-1 italic' },
                          '\uD83D\uDCA1 ' + (mutType === 'insertion' ? 'Insertion' : 'Deletion') + ' shifts the reading frame \u2014 all downstream codons change! This is called a frameshift mutation.'
                        ),
                        mutType === 'point' && changes === 0 && h('p', { className: 'text-[11px] text-emerald-500 mt-1 italic' },
                          '\uD83D\uDCA1 This is a silent (synonymous) mutation. The codon changed, but it still codes for the same amino acid due to redundancy in the genetic code.'
                        ),
                        mutType === 'point' && changes === 1 && mutAminos[mutAminos.length - 1] === 'Stop' && origAminos[origAminos.length - 1] !== 'Stop' && h('p', { className: 'text-[11px] text-red-500 mt-1 italic' },
                          '\uD83D\uDCA1 This is a nonsense mutation \u2014 it created a premature stop codon, producing a shorter (truncated) protein!'
                        ),
                        mutType === 'point' && changes === 1 && !(mutAminos[mutAminos.length - 1] === 'Stop' && origAminos[origAminos.length - 1] !== 'Stop') && h('p', { className: 'text-[11px] text-orange-500 mt-1 italic' },
                          '\uD83D\uDCA1 This is a missense mutation \u2014 one amino acid changed. The effect depends on whether the new amino acid has similar properties.'
                        )
                      );
                    })(),

                    !mutOriginalDna && h('p', { className: 'text-[11px] text-slate-600 italic' },
                      'Click a mutation button to see how DNA changes affect the protein. Try all three types!'
                    )
                  )
                );
              })()
            ),

            // ════════════════════════════════════════
            // CHALLENGE SUB-TOOL
            // ════════════════════════════════════════
            subtool === 'challenge' && h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'Test your genetics knowledge across 3 difficulty levels!'),

              // Difficulty selector
              h('div', { className: 'flex gap-2 mb-3' },
                ['easy', 'medium', 'hard'].map(function(diff) {
                  var labels = { easy: '\uD83C\uDF31 Beginner', medium: '\uD83D\uDD2C Intermediate', hard: '\uD83E\uDDE0 Advanced' };
                  var colors = { easy: 'emerald', medium: 'amber', hard: 'red' };
                  return h('button', { 'aria-label': 'Select challenge difficulty',
                    key: diff,
                    onClick: function() { updMulti({ _chalDiff: diff, _chalIdx: 0, _chalScore: 0, _chalStreak: 0, _chalFeedback: null }); },
                    className: 'px-3 py-1.5 text-[11px] font-bold rounded-lg border-2 transition-all ' +
                      (chalDiff === diff ? 'bg-' + colors[diff] + '-500 text-white border-' + colors[diff] + '-500 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-' + colors[diff] + '-300')
                  }, labels[diff]);
                })
              ),

              // Score bar
              h('div', { className: 'flex items-center gap-3 mb-3 bg-slate-50 rounded-lg p-2' },
                h('span', { className: 'text-xs font-bold text-slate-600' }, 'Q ' + (chalIdx + 1) + '/' + chalQuestions.length),
                h('span', { className: 'text-xs font-bold text-emerald-600' }, '\u2705 ' + chalScore),
                h('span', { className: 'text-xs font-bold text-amber-600' }, '\uD83D\uDD25 Streak: ' + chalStreak),
                chalStreak >= 3 && h('span', { className: 'text-[11px] font-bold text-fuchsia-600 animate-pulse' }, '\u2B50 BONUS!')
              ),

              // Question
              chalIdx < chalQuestions.length ? h('div', { className: 'bg-white rounded-xl border p-4' },
                h('p', { className: 'text-sm font-bold text-slate-700 mb-3' }, chalQuestions[chalIdx].q),
                h('div', { className: 'grid grid-cols-2 gap-2' },
                  chalQuestions[chalIdx].a.map(function(opt, i) {
                    return h('button', { key: i,
                      onClick: function() {
                        if (chalFeedback) return;
                        var isCorrect = i === chalQuestions[chalIdx].correct;
                        var newScore = chalScore + (isCorrect ? 1 : 0);
                        var newStreak = isCorrect ? chalStreak + 1 : 0;
                        var bonusXP = isCorrect ? (newStreak >= 3 ? 15 : 10) : 0;
                        if (isCorrect) {
                          punnettSound('correct');
                          if (newStreak >= 3) punnettSound('streak');
                          awardXP('chalQ_' + chalDiff + '_' + chalIdx, bonusXP, 'Challenge ' + chalDiff);
                        } else {
                          punnettSound('wrong');
                        }
                        updMulti({
                          _chalScore: newScore,
                          _chalStreak: newStreak,
                          _chalFeedback: isCorrect ? '\u2705 Correct!' + (newStreak >= 3 ? ' \u2B50 Streak bonus!' : '') : '\u274C Incorrect. Answer: ' + chalQuestions[chalIdx].a[chalQuestions[chalIdx].correct]
                        });
                        setTimeout(function() {
                          var nextIdx = chalIdx + 1;
                          if (nextIdx < chalQuestions.length) {
                            updMulti({ _chalIdx: nextIdx, _chalFeedback: null });
                          } else {
                            var total = (d._chalTotalScore || 0) + newScore;
                            updMulti({ _chalFeedback: '\uD83C\uDFC6 Complete! Score: ' + newScore + '/' + chalQuestions.length, _chalTotalScore: total });
                          }
                        }, 1500);
                      },
                      className: 'px-3 py-2 text-xs font-bold rounded-lg border transition-all ' +
                        (chalFeedback ? (i === chalQuestions[chalIdx].correct ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-600 border-slate-200') : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-violet-50')
                    }, opt);
                  })
                ),
                chalFeedback && h('p', { className: 'mt-2 text-xs font-bold text-center ' + (chalFeedback.indexOf('\u2705') !== -1 ? 'text-emerald-600' : 'text-red-500') }, chalFeedback)
              ) : h('div', { className: 'bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200 p-4 text-center' },
                h('p', { className: 'text-2xl mb-2' }, '\uD83C\uDFC6'),
                h('p', { className: 'text-sm font-bold text-violet-700' }, 'Challenge Complete!'),
                h('p', { className: 'text-lg font-bold text-fuchsia-600' }, chalScore + '/' + chalQuestions.length),
                chalFeedback && h('p', { className: 'text-xs text-slate-600 mt-1' }, chalFeedback),
                h('button', { 'aria-label': 'Retry',
                  onClick: function() { updMulti({ _chalIdx: 0, _chalScore: 0, _chalStreak: 0, _chalFeedback: null }); },
                  className: 'mt-3 px-4 py-1.5 text-xs font-bold text-white bg-violet-700 rounded-lg hover:bg-violet-600'
                }, '\u21BA Retry ' + chalDiff.charAt(0).toUpperCase() + chalDiff.slice(1))
              )
            ),

            // ════════════════════════════════════════
            // BATTLE SUB-TOOL (Gene Defense)
            // ════════════════════════════════════════
            subtool === 'battle' && h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'A mutation virus is attacking the cell! Answer genetics questions to defend the genome!'),

              !battleActive && !battleResult && h('div', { className: 'text-center bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 p-6' },
                h('p', { className: 'text-4xl mb-3' }, '\u2694\uFE0F'),
                h('p', { className: 'text-lg font-bold text-red-700 mb-1' }, 'Gene Defense'),
                h('p', { className: 'text-xs text-slate-600 mb-4' }, 'Battle the Mutation Virus! Answer correctly to deal damage. Wrong answers let the virus attack!'),
                h('button', { 'aria-label': 'Start Battle',
                  onClick: function() {
                    punnettSound('battle');
                    updMulti({
                      _battleActive: true, _battleRound: 0, _battleHP: 100,
                      _battleEnemyHP: 100, _battleFeedback: null, _battleScore: 0, _battleResult: null
                    });
                  },
                  className: 'px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-lg hover:from-red-600 hover:to-orange-600 shadow-lg'
                }, '\u2694\uFE0F Start Battle')
              ),

              battleActive && battleRound < BATTLE_QS.length && h('div', null,
                // HP bars
                h('div', { className: 'grid grid-cols-2 gap-3 mb-3' },
                  h('div', { className: 'bg-emerald-50 rounded-xl p-2 border border-emerald-200' },
                    h('p', { className: 'text-[11px] font-bold text-emerald-600 mb-1' }, '\uD83E\uDDEC Your Cell'),
                    h('div', { className: 'w-full bg-slate-200 rounded-full h-3 overflow-hidden' },
                      h('div', { className: 'h-full rounded-full transition-all duration-500', style: { width: Math.max(0, battleHP) + '%', background: battleHP > 50 ? '#22c55e' : battleHP > 25 ? '#f59e0b' : '#ef4444' } })
                    ),
                    h('p', { className: 'text-[11px] font-bold text-emerald-700 mt-0.5' }, battleHP + ' HP')
                  ),
                  h('div', { className: 'bg-red-50 rounded-xl p-2 border border-red-200' },
                    h('p', { className: 'text-[11px] font-bold text-red-600 mb-1' }, '\uD83E\uDDA0 Mutation Virus'),
                    h('div', { className: 'w-full bg-slate-200 rounded-full h-3 overflow-hidden' },
                      h('div', { className: 'bg-red-500 h-full rounded-full transition-all duration-500', style: { width: Math.max(0, battleEnemyHP) + '%' } })
                    ),
                    h('p', { className: 'text-[11px] font-bold text-red-700 mt-0.5' }, battleEnemyHP + ' HP')
                  )
                ),

                // Round indicator
                h('p', { className: 'text-[11px] font-bold text-slate-600 text-center mb-2' }, 'Round ' + (battleRound + 1) + '/' + BATTLE_QS.length + ' \u2014 Score: ' + battleScore),

                // Question
                h('div', { className: 'bg-white rounded-xl border p-4' },
                  h('p', { className: 'text-sm font-bold text-slate-700 mb-3' }, BATTLE_QS[battleRound].q),
                  h('div', { className: 'grid grid-cols-2 gap-2' },
                    BATTLE_QS[battleRound].a.map(function(opt, i) {
                      return h('button', { key: i,
                        onClick: function() {
                          if (battleFeedback) return;
                          var bq = BATTLE_QS[battleRound];
                          var isCorrect = i === bq.correct;
                          var newEHP = battleEnemyHP;
                          var newHP = battleHP;
                          var newScore = battleScore;
                          if (isCorrect) {
                            punnettSound('correct');
                            newEHP = Math.max(0, battleEnemyHP - bq.dmg);
                            newScore = battleScore + 1;
                          } else {
                            punnettSound('damage');
                            newHP = Math.max(0, battleHP - 15);
                          }
                          var fb = isCorrect ? '\u2705 Hit! -' + bq.dmg + ' HP to virus!' : '\u274C Virus attacks! -15 HP! Answer: ' + bq.a[bq.correct];
                          updMulti({ _battleEnemyHP: newEHP, _battleHP: newHP, _battleScore: newScore, _battleFeedback: fb });

                          setTimeout(function() {
                            // Check win/lose
                            if (newEHP <= 0) {
                              punnettSound('victory');
                              updMulti({ _battleActive: false, _battleResult: 'won', _battleWon: true, _battleFeedback: null });
                              awardXP('battleWin', 30, 'Gene Defense Victory');
                            } else if (newHP <= 0) {
                              punnettSound('damage');
                              updMulti({ _battleActive: false, _battleResult: 'lost', _battleFeedback: null });
                            } else {
                              updMulti({ _battleRound: battleRound + 1, _battleFeedback: null });
                            }
                          }, 1500);
                        },
                        className: 'px-3 py-2 text-xs font-bold rounded-lg border transition-all ' +
                          (battleFeedback ? (i === BATTLE_QS[battleRound].correct ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-600 border-slate-200') : 'bg-white text-slate-700 border-slate-200 hover:border-red-300 hover:bg-red-50')
                      }, opt);
                    })
                  ),
                  battleFeedback && h('p', { className: 'mt-2 text-xs font-bold text-center ' + (battleFeedback.indexOf('\u2705') !== -1 ? 'text-emerald-600' : 'text-red-500') }, battleFeedback)
                )
              ),

              // Battle result
              battleResult && h('div', { className: 'text-center bg-gradient-to-r ' + (battleResult === 'won' ? 'from-emerald-50 to-teal-50 border-emerald-200' : 'from-red-50 to-orange-50 border-red-200') + ' rounded-xl border p-6' },
                h('p', { className: 'text-4xl mb-2' }, battleResult === 'won' ? '\uD83C\uDFC6' : '\uD83D\uDCA5'),
                h('p', { className: 'text-lg font-bold ' + (battleResult === 'won' ? 'text-emerald-700' : 'text-red-700') }, battleResult === 'won' ? 'Victory! Genome Defended!' : 'Defeated! The mutation spread...'),
                h('p', { className: 'text-xs text-slate-600 mt-1 mb-3' }, 'Score: ' + battleScore + '/' + BATTLE_QS.length + ' | HP remaining: ' + battleHP),
                h('button', { 'aria-label': 'Battle Again',
                  onClick: function() {
                    punnettSound('battle');
                    updMulti({
                      _battleActive: true, _battleRound: 0, _battleHP: 100,
                      _battleEnemyHP: 100, _battleFeedback: null, _battleScore: 0, _battleResult: null
                    });
                  },
                  className: 'px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-lg hover:from-red-600 hover:to-orange-600'
                }, '\u2694\uFE0F Battle Again')
              ),

              // Ran out of questions without KO
              battleActive && battleRound >= BATTLE_QS.length && h('div', { className: 'text-center bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-6' },
                h('p', { className: 'text-4xl mb-2' }, '\u23F0'),
                h('p', { className: 'text-lg font-bold text-amber-700' }, 'Battle Over \u2014 Time Ran Out!'),
                h('p', { className: 'text-xs text-slate-600 mt-1 mb-3' }, 'Score: ' + battleScore + '/' + BATTLE_QS.length + ' | Your HP: ' + battleHP + ' | Virus HP: ' + battleEnemyHP),
                h('button', { 'aria-label': 'Try Again',
                  onClick: function() {
                    punnettSound('battle');
                    updMulti({
                      _battleActive: true, _battleRound: 0, _battleHP: 100,
                      _battleEnemyHP: 100, _battleFeedback: null, _battleScore: 0, _battleResult: null
                    });
                  },
                  className: 'px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg'
                }, '\u2694\uFE0F Try Again')
              )
            ),

            // ════════════════════════════════════════
            // LEARN SUB-TOOL
            // ════════════════════════════════════════
            subtool === 'learn' && h('div', null,
              h('p', { className: 'text-xs text-slate-600 italic mb-3' }, 'Explore genetics concepts at your level. Content adapts to grade band: ' + band.toUpperCase()),

              // Topic cards
              h('div', { className: 'space-y-2' },
                LEARN_TOPICS.map(function(topic, idx) {
                  var isOpen = learnTopic === idx;
                  var content = topic[band] || topic.g35;
                  return h('div', { key: idx, className: 'bg-white rounded-xl border ' + (isOpen ? 'border-violet-300 shadow-md' : 'border-slate-200') },
                    h('button', { onClick: function() { upd('_learnTopic', isOpen ? -1 : idx); },
                      className: 'w-full flex items-center gap-2 p-3 text-left'
                    },
                      h('span', { className: 'text-xl' }, topic.icon),
                      h('span', { className: 'text-sm font-bold text-slate-700 flex-1' }, topic.title),
                      h('span', { className: 'text-xs text-slate-600' }, isOpen ? '\u25B2' : '\u25BC')
                    ),
                    isOpen && h('div', { className: 'px-3 pb-3' },
                      h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-100' },
                        h('p', { className: 'text-[11px] font-bold text-violet-600 uppercase tracking-wider mb-1' }, band.toUpperCase() + ' Level'),
                        h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, content)
                      ),
                      // "Try it" links
                      idx === 0 && h('button', { 'aria-label': 'Try DNAProtein',
                        onClick: function() { upd('subtool', 'dna2protein'); },
                        className: 'mt-2 px-3 py-1 text-[11px] font-bold text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-200 rounded-lg hover:bg-fuchsia-100'
                      }, '\u2192 Try DNA\u2192Protein'),
                      idx === 1 && h('button', { 'aria-label': 'Try Punnett Cross',
                        onClick: function() { upd('subtool', 'cross'); },
                        className: 'mt-2 px-3 py-1 text-[11px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100'
                      }, '\u2192 Try Punnett Cross'),
                      idx === 2 && h('button', { 'aria-label': 'Try Pedigree Builder',
                        onClick: function() { upd('subtool', 'pedigree'); },
                        className: 'mt-2 px-3 py-1 text-[11px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100'
                      }, '\u2192 Try Pedigree Builder'),
                      idx === 3 && h('button', { 'aria-label': 'Try Population Genetics',
                        onClick: function() { upd('subtool', 'population'); },
                        className: 'mt-2 px-3 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100'
                      }, '\u2192 Try Population Genetics')
                    )
                  );
                })
              ),

              // Read-aloud
              h('div', { className: 'mt-3' },
                h('button', { 'aria-label': 'Read Aloud',
                  onClick: function() {
                    if (learnTopic >= 0 && LEARN_TOPICS[learnTopic]) {
                      var content = LEARN_TOPICS[learnTopic][band] || LEARN_TOPICS[learnTopic].g35;
                      if (ctx.callTTS) ctx.callTTS(content);
                    }
                  },
                  disabled: learnTopic < 0,
                  className: 'px-3 py-1.5 text-[11px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-40'
                }, '\uD83D\uDD0A Read Aloud')
              )
            ),

            // ── Footer ──
            h('div', { className: 'flex gap-2 mt-4 pt-3 border-t border-slate-200' },
              h('button', {
                onClick: function() { setStemLabTool('dnaLab'); announceToSR('Opening DNA Lab'); },
                className: 'px-3 py-1.5 text-xs font-bold text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-200 rounded-full hover:bg-fuchsia-100 transition-all',
                
              }, '\uD83E\uDDEC DNA Lab \u2192'),
              h('button', { 'aria-label': 'Snapshot',
                onClick: takeSnapshot,
                className: 'ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all'
              }, '\uD83D\uDCF8 Snapshot')
            )
          );
        };
      }
      return h(this._PunnettComponent, { ctx: ctx });
    }
  });
})();
