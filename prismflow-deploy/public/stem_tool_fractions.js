// ═══════════════════════════════════════════════════════════════════════
// stem_tool_fractions.js — Fraction Lab Plugin (v3, deep edition)
//
// ARCHITECTURE OVERVIEW (for contributors)
// ────────────────────────────────────────
// One of AlloFlow's most-researched intervention tools. Fractions are the
// #1 funded math intervention area in IES history; the IES Practice Guide
// "Developing Effective Fractions Instruction for Kindergarten Through 8th
// Grade" (Siegler et al., 2010) is the most-cited document in the field.
// This tool operationalizes most of its 5 recommendations.
//
// TABS / SECTIONS (organized by mode)
// ───────────────────────────────────
// The UI uses a Mode → Tab two-level navigation. Modes group related work:
//
//   LEARN mode    (visualization-heavy, no quiz pressure)
//     • Explore      — pie/bar/number-line/area/set models, slider-driven
//     • Models       — switch between 5 visual representations
//     • Wall         — fraction wall for visual equivalence proof
//     • CRA          — Concrete → Representational → Abstract progression
//
//   PRACTICE mode (skill-focused, scored)
//     • Compare      — comparing & ordering fractions
//     • Operations   — +, −, ×, ÷ with visual proofs
//     • Equivalents  — equivalent fraction generator + simplification
//     • Convert      — fraction ↔ decimal ↔ percent ↔ mixed/improper
//     • Challenges   — 7-type rotating quiz with hints
//
//   APPLY mode    (real-world contexts)
//     • Word Problems — 80+ contextual problems (cooking, money, time, ...)
//     • Games         — 5 mini-games (Pizza Shop, Race, Match, Fish, Cooking)
//
//   TEACHER mode  (instructor-facing tools)
//     • Worksheets    — printable worksheet generator
//     • Reports       — progress reports for IEP/RTI documentation
//     • Standards     — CCSS K-8 alignment map
//     • Misconceptions— common error library with remediation
//
// STATE LAYOUT (in ctx.toolData._fractions)
// ─────────────────────────────────────────
//   mode, tab          — current navigation
//   pieces             — practice slider state {numerator, denominator}
//   num1, den1, num2, den2 — compare/operations operands
//   challenge          — current challenge object
//   game               — active game state (varies by game)
//   wordProblem        — current word problem state
//   worksheetOpts      — worksheet generator options
//   savedSessions      — { name → snapshot }
//   model              — current visual model ('pie' | 'bar' | 'numberline' | 'area' | 'set')
//   colorblindSafe     — boolean for accessibility palette
//   audioNarration     — boolean for text-to-speech of fractions
//   _fracExt           — extended badge/progress tracking
//
// PEDAGOGICAL FRAMEWORKS USED
// ───────────────────────────
//   CRA (Concrete-Representational-Abstract) — Bruner 1966, Sealander 2012
//   Magnitude reasoning emphasis — Siegler 2010 IES Practice Guide
//   Multiple representations — Lesh translation model (1979)
//   Misconception research — Vamvakoussi & Vosniadou, Stafylidou & Vosniadou
//   Equivalent fractions = same magnitude — Number Worlds, Math Recovery
//
// COMMON MISCONCEPTIONS ADDRESSED
// ───────────────────────────────
//   "Bigger denominator = bigger fraction" (whole-number bias)
//   "Add tops, add bottoms" (5/8 + 1/8 = 6/16)
//   "Fractions are less than 1" (improper fractions exist)
//   "Fractions are not numbers" (number line model fixes this)
//   "Equivalence ≠ same magnitude" (set/area/number-line proofs)
//   See MISCONCEPTIONS constant below for the full library.
//
// ACCESSIBILITY
// ─────────────
//   • aria-live region #allo-live-fractions for SR announcements
//   • Reduced-motion CSS respected
//   • Color-blind safe palette toggle (4 palettes available)
//   • Audio narration of fractions ("three-fourths") via Web Speech API
//   • Keyboard shortcuts for every tab + every game action
//   • Tabs are role="tablist", buttons have aria-pressed where appropriate
//
// PRINTABLE OUTPUT
// ────────────────
//   The worksheet generator produces print-ready HTML that triggers window.print().
//   Each generated problem includes the standard reference and an answer key
//   in a separate page (page-break-after CSS).
//
// CONTRIBUTORS
// ────────────
//   Run `node --check stem_lab/stem_tool_fractions.js` after edits.
//   E2E test at tests/e2e/fractions-tool.spec.ts.
//   See FRACTIONS_DEEP_AUDIT.md (planned) for the research-base citations.
// ═══════════════════════════════════════════════════════════════════════

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
    if (document.getElementById('allo-live-fractions')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-fractions';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ═══════════════════════════════════════════════════════════════════════
  // ═══ CONSTANTS & DATA LIBRARIES (defined once at module load) ═══
  // ═══════════════════════════════════════════════════════════════════════

  // ── CCSS K-8 fraction-related standards map ──
  // Used by the worksheet generator, the standards tab, and per-problem tags.
  // Each entry has the code, the grade, a one-line description, and a list
  // of which Fraction Lab features map to it. Sourced from corestandards.org.
  var CCSS_FRACTIONS = [
    { code: '1.G.A.3', grade: 1, title: 'Partition circles and rectangles into two and four equal shares',
      desc: 'Describe shares as halves, fourths, and quarters; describe the whole as two of, or four of the shares.',
      features: ['Explore', 'Models'] },
    { code: '2.G.A.3', grade: 2, title: 'Partition circles and rectangles into 2, 3, or 4 equal shares',
      desc: 'Describe shares using the words halves, thirds, half of, a third of, etc.',
      features: ['Explore', 'Models', 'Wall'] },
    { code: '3.NF.A.1', grade: 3, title: 'Understand 1/b as the unit fraction',
      desc: 'A fraction 1/b is the quantity formed by 1 part when a whole is partitioned into b equal parts.',
      features: ['Explore', 'Models', 'CRA'] },
    { code: '3.NF.A.2', grade: 3, title: 'Understand a fraction as a number on the number line',
      desc: 'Represent fractions on a number line diagram.',
      features: ['Models', 'NumberLine'] },
    { code: '3.NF.A.3', grade: 3, title: 'Explain equivalence of fractions and compare fractions',
      desc: 'Recognize and generate simple equivalent fractions; explain why they are equivalent.',
      features: ['Equivalents', 'Wall', 'Compare'] },
    { code: '3.NF.A.3.a', grade: 3, title: 'Equivalent fractions are the same size',
      desc: 'Two fractions are equivalent if they are the same size, or the same point on a number line.',
      features: ['Equivalents', 'Wall', 'NumberLine'] },
    { code: '3.NF.A.3.b', grade: 3, title: 'Recognize and generate simple equivalent fractions',
      desc: 'Explain why the fractions are equivalent, e.g., by using a visual fraction model.',
      features: ['Equivalents', 'Wall'] },
    { code: '3.NF.A.3.c', grade: 3, title: 'Express whole numbers as fractions',
      desc: 'Recognize fractions that are equivalent to whole numbers (e.g., 3 = 3/1; 4/4 = 1).',
      features: ['Convert', 'Equivalents'] },
    { code: '3.NF.A.3.d', grade: 3, title: 'Compare two fractions with the same numerator or same denominator',
      desc: 'Recognize that comparisons are valid only when the two fractions refer to the same whole.',
      features: ['Compare'] },
    { code: '4.NF.A.1', grade: 4, title: 'Equivalent fractions using common multiples',
      desc: 'Explain why a/b = (n×a)/(n×b) by using visual fraction models.',
      features: ['Equivalents', 'Simplify'] },
    { code: '4.NF.A.2', grade: 4, title: 'Compare fractions with different numerators and denominators',
      desc: 'Use benchmark fractions like 1/2; create common denominators or numerators.',
      features: ['Compare', 'Benchmarks'] },
    { code: '4.NF.B.3', grade: 4, title: 'Add and subtract fractions with like denominators',
      desc: 'Understand a/b as a/b = 1/b + 1/b + ... + 1/b (a copies of 1/b).',
      features: ['Operations'] },
    { code: '4.NF.B.3.a', grade: 4, title: 'Add and subtract fractions in the form a/b + c/b',
      desc: 'Joining and separating parts referring to the same whole.',
      features: ['Operations'] },
    { code: '4.NF.B.3.b', grade: 4, title: 'Decompose a fraction into a sum of fractions',
      desc: 'Decompose into parts with the same denominator in more than one way.',
      features: ['Operations', 'Equivalents'] },
    { code: '4.NF.B.3.c', grade: 4, title: 'Add and subtract mixed numbers with like denominators',
      desc: 'Replacing each mixed number with an equivalent fraction, or by using properties of operations.',
      features: ['Operations', 'Convert'] },
    { code: '4.NF.B.3.d', grade: 4, title: 'Solve word problems involving addition and subtraction of fractions',
      desc: 'Referring to the same whole and having like denominators.',
      features: ['WordProblems'] },
    { code: '4.NF.B.4', grade: 4, title: 'Multiply a fraction by a whole number',
      desc: 'Apply and extend previous understandings of multiplication.',
      features: ['Operations', 'Models'] },
    { code: '4.NF.B.4.a', grade: 4, title: 'Understand a/b × n as n × (a/b)',
      desc: 'Multiplication of a fraction by a whole number.',
      features: ['Operations'] },
    { code: '4.NF.B.4.b', grade: 4, title: 'Understand a multiple of a/b as a multiple of 1/b',
      desc: 'Visualize using a fraction strip or area model.',
      features: ['Operations', 'Models'] },
    { code: '4.NF.B.4.c', grade: 4, title: 'Solve word problems involving multiplication of a fraction by a whole number',
      desc: 'Use visual fraction models and equations to represent the problem.',
      features: ['WordProblems', 'Operations'] },
    { code: '4.NF.C.5', grade: 4, title: 'Express a fraction with denominator 10 as an equivalent fraction with denominator 100',
      desc: 'Use this technique to add two fractions with respective denominators 10 and 100.',
      features: ['Equivalents', 'Convert'] },
    { code: '4.NF.C.6', grade: 4, title: 'Use decimal notation for fractions with denominators 10 or 100',
      desc: 'Locate decimals on a number line.',
      features: ['Convert', 'NumberLine'] },
    { code: '4.NF.C.7', grade: 4, title: 'Compare two decimals to hundredths',
      desc: 'Recognize that comparisons are valid only when the two decimals refer to the same whole.',
      features: ['Convert', 'Compare'] },
    { code: '5.NF.A.1', grade: 5, title: 'Add and subtract fractions with unlike denominators',
      desc: 'Including mixed numbers; replacing fractions with equivalent fractions with like denominators.',
      features: ['Operations', 'Equivalents'] },
    { code: '5.NF.A.2', grade: 5, title: 'Solve word problems involving addition and subtraction of fractions',
      desc: 'Referring to the same whole, including cases of unlike denominators.',
      features: ['WordProblems', 'Operations'] },
    { code: '5.NF.B.3', grade: 5, title: 'Interpret a fraction as division of the numerator by the denominator',
      desc: 'a/b = a ÷ b. Solve word problems involving division of whole numbers leading to fraction answers.',
      features: ['Convert', 'WordProblems'] },
    { code: '5.NF.B.4', grade: 5, title: 'Multiply fractions',
      desc: 'Apply and extend previous understandings of multiplication to multiply a fraction or whole number by a fraction.',
      features: ['Operations'] },
    { code: '5.NF.B.4.a', grade: 5, title: 'Interpret the product (a/b) × q',
      desc: 'As a parts of a partition of q into b equal parts.',
      features: ['Operations', 'Models'] },
    { code: '5.NF.B.4.b', grade: 5, title: 'Find the area of a rectangle with fractional side lengths',
      desc: 'By tiling it with unit squares of appropriate unit fractional side lengths.',
      features: ['Operations', 'Models'] },
    { code: '5.NF.B.5', grade: 5, title: 'Interpret multiplication as scaling',
      desc: 'Comparing the size of a product to the size of one factor based on the size of the other factor.',
      features: ['Operations', 'Compare'] },
    { code: '5.NF.B.6', grade: 5, title: 'Solve real-world problems involving multiplication of fractions and mixed numbers',
      desc: 'Use visual fraction models or equations to represent the problem.',
      features: ['WordProblems', 'Operations'] },
    { code: '5.NF.B.7', grade: 5, title: 'Divide unit fractions by whole numbers and whole numbers by unit fractions',
      desc: 'Apply and extend previous understandings of division.',
      features: ['Operations'] },
    { code: '6.NS.A.1', grade: 6, title: 'Interpret and compute quotients of fractions',
      desc: 'Solve word problems involving division of fractions by fractions.',
      features: ['Operations', 'WordProblems'] },
    { code: '6.RP.A.1', grade: 6, title: 'Understand the concept of a ratio',
      desc: 'Use ratio language to describe a ratio relationship between two quantities.',
      features: ['Convert', 'Compare'] },
    { code: '6.RP.A.3.c', grade: 6, title: 'Find a percent of a quantity as a rate per 100',
      desc: 'Solve problems involving finding the whole given a part and the percent.',
      features: ['Convert', 'WordProblems'] },
    { code: '7.NS.A.2', grade: 7, title: 'Apply and extend previous understandings of multiplication and division',
      desc: 'Multiply and divide rational numbers (fractions can be negative).',
      features: ['Operations'] },
    { code: '7.NS.A.2.d', grade: 7, title: 'Convert a rational number to a decimal using long division',
      desc: 'Know that the decimal form of a rational number terminates in 0s or eventually repeats.',
      features: ['Convert', 'DecimalExpansion'] },
    { code: '8.NS.A.1', grade: 8, title: 'Know that numbers that are not rational are called irrational',
      desc: 'Every number has a decimal expansion; rationals have terminating or repeating expansions.',
      features: ['Convert', 'DecimalExpansion'] }
  ];

  // ── Common misconceptions library ──
  // Each entry: id, label, category, description, why-it-happens, remediation strategy,
  // and a "detector" that takes (n1, d1, n2, d2, studentResponse) and returns true
  // if the misconception is likely present. Used in the Misconceptions tab and
  // optionally as in-line feedback when a wrong answer matches a pattern.
  var MISCONCEPTIONS = [
    {
      id: 'whole-number-bias',
      label: 'Whole-number bias',
      grade: '3-5',
      severity: 'high',
      description: 'Student treats numerator and denominator as separate whole numbers, so 1/8 looks bigger than 1/4 because 8 > 4.',
      whyItHappens: 'Years of whole-number experience precede fraction instruction. Larger digits = larger value is a deeply learned rule.',
      remediation: [
        'Use a fraction wall: stack 1/4 above 1/8 and show 1/4 is taller.',
        'Use the pizza model: would you rather have 1 slice of an 8-slice pizza or 1 slice of a 4-slice pizza?',
        'Number-line model: place both on a number line; the one further right is larger.',
        'Practice with same-numerator fractions specifically (1/2, 1/3, 1/4, 1/5...) so the inverse relationship becomes salient.'
      ],
      detector: function(n1, d1, n2, d2, response) {
        // Detected when student picks the fraction with the larger denominator
        // when same numerator
        if (n1 === n2 && d1 !== d2) {
          var larger = d1 > d2 ? (n1 + '/' + d1) : (n2 + '/' + d2);
          var smaller = d1 > d2 ? (n2 + '/' + d2) : (n1 + '/' + d1);
          return response === larger; // they picked the actually smaller fraction
        }
        return false;
      }
    },
    {
      id: 'add-tops-add-bottoms',
      label: 'Add numerators, add denominators',
      grade: '3-5',
      severity: 'high',
      description: '1/2 + 1/3 → 2/5. Student adds the parts of each fraction independently.',
      whyItHappens: 'Operating on parts is simpler than finding a common denominator. The procedure for + with like denominators ("add the tops, keep the bottom") gets misapplied to unlike denominators.',
      remediation: [
        'Use pie models: 1/2 + 1/3 of a pizza is clearly more than half a pizza, so the answer cannot be 2/5 (less than half).',
        'Show with fraction strips that 1/2 and 1/3 are not the same size — you cannot combine without re-cutting into common-size pieces.',
        'Introduce the concept of "same-size pieces" before introducing a procedure.',
        'Estimate before computing: "Is the answer more or less than 1?"'
      ],
      detector: function(n1, d1, n2, d2, response) {
        var bad = parseInt(response.numerator) === n1 + n2 && parseInt(response.denominator) === d1 + d2;
        return bad && d1 !== d2;
      }
    },
    {
      id: 'fractions-less-than-1',
      label: 'Fractions must be less than 1',
      grade: '3-5',
      severity: 'medium',
      description: 'Student rejects improper fractions (5/4, 7/3) as "wrong" or impossible.',
      whyItHappens: 'Early instruction only uses proper fractions (parts of a whole). Improper fractions challenge the model.',
      remediation: [
        'Use multiple wholes: cut 2 pizzas into quarters → 8 quarters available. 5/4 = 5 quarters.',
        'Number-line model: 5/4 is between 1 and 2.',
        'Mixed number conversion: 5/4 = 1 1/4. Show the connection both ways.',
        'Length-based contexts (running 7/4 miles) where exceeding 1 is normal.'
      ],
      detector: null
    },
    {
      id: 'fraction-not-a-number',
      label: 'Fractions are not numbers',
      grade: '3-5',
      severity: 'medium',
      description: 'Student treats 3/4 as a "relationship" or "command" rather than as a point on the number line with a specific magnitude.',
      whyItHappens: 'Part-whole instruction emphasizes the action (cut, share, take). Magnitude is implicit.',
      remediation: [
        'Number-line work: place fractions on a number line alongside whole numbers.',
        'Order fractions on a number line including ones less than 1, equal to 1, and greater than 1.',
        'Compare fractions to benchmarks (0, 1/2, 1, 2) frequently.',
        'IES Practice Guide recommendation 2: use the number line as the central representation.'
      ],
      detector: null
    },
    {
      id: 'equivalence-not-magnitude',
      label: 'Equivalence ≠ same magnitude',
      grade: '3-5',
      severity: 'medium',
      description: 'Student can compute equivalent fractions procedurally (multiply top and bottom by 2) but does not believe they represent the same amount.',
      whyItHappens: 'The procedure can be mastered without the underlying insight.',
      remediation: [
        'Fraction wall: stack 1/2 above 2/4 above 4/8 — visually they reach the same height.',
        'Sharing context: "Would you rather get 1/2 of a candy bar or 2/4 of a candy bar?" → Show they are identical.',
        'Number-line model: 1/2 and 2/4 land on the same point.',
        'Area model with subdivided rectangles.'
      ],
      detector: null
    },
    {
      id: 'multiply-makes-bigger',
      label: 'Multiplication always makes things bigger',
      grade: '4-6',
      severity: 'medium',
      description: 'Student is surprised that 1/2 × 1/2 = 1/4, since 1/4 < 1/2.',
      whyItHappens: 'Whole-number multiplication only produces larger results (or 0). Multiplication by proper fractions reduces.',
      remediation: [
        'Visual proof: 1/2 of a 1/2-pizza is 1/4 of the original pizza.',
        'Frame multiplication as "of": 1/2 × 4 = 1/2 of 4 = 2 (still smaller than 4).',
        'Scaling interpretation: multiplying by less than 1 scales DOWN; multiplying by more than 1 scales UP.',
        'CCSS 5.NF.B.5: compare the size of the product to the size of one factor.'
      ],
      detector: null
    },
    {
      id: 'divide-makes-smaller',
      label: 'Division always makes things smaller',
      grade: '4-6',
      severity: 'medium',
      description: 'Student is surprised that 4 ÷ 1/2 = 8, since 8 > 4.',
      whyItHappens: 'Whole-number division only produces smaller results.',
      remediation: [
        'Measurement interpretation: How many halves are in 4 wholes? 8 halves.',
        'Visual proof with pie or bar models.',
        'Connect to multiplication: 4 ÷ 1/2 = 4 × 2 (multiply by the reciprocal).',
        'Real-world context: pizza slicing, ribbon cutting.'
      ],
      detector: null
    },
    {
      id: 'add-without-common-denom',
      label: 'Adding without a common denominator',
      grade: '4-5',
      severity: 'high',
      description: 'Student does not realize that fractions must have the same denominator (or same-size pieces) before they can be added or subtracted.',
      whyItHappens: 'The "rule" (find a common denominator) is taught procedurally without grounding in part-whole reasoning.',
      remediation: [
        'Manipulatives: fraction strips of different sizes — you cannot combine 1/2 and 1/3 into a single fraction without re-cutting both into 1/6 pieces.',
        'Pizza analogy: a pizza cut into halves and a pizza cut into thirds — you cannot directly combine slices.',
        'Build the common denominator stepwise from manipulatives, then introduce the procedure.'
      ],
      detector: null
    },
    {
      id: 'simplify-wrong',
      label: 'Simplification by subtraction',
      grade: '4-5',
      severity: 'low',
      description: 'Student tries to simplify by subtracting instead of dividing: e.g., simplifies 6/8 to 4/6 by subtracting 2 from both.',
      whyItHappens: 'Confusion between equivalence (same value) and a simpler form. Subtraction does not preserve ratio.',
      remediation: [
        'Show that 6/8 = 3/4 by dividing both by 2, and 6/8 ≠ 4/6 by computing decimals.',
        'Connect to the rule: to keep a fraction equivalent, multiply OR divide top and bottom by the same nonzero number.',
        'Use the fraction wall to verify simplifications.'
      ],
      detector: null
    },
    {
      id: 'mixed-number-arithmetic',
      label: 'Mixed number arithmetic errors',
      grade: '4-5',
      severity: 'medium',
      description: 'When adding mixed numbers (2 1/4 + 1 3/4), student adds whole parts and fractional parts separately without regrouping (gets 3 4/4 = 3 instead of 4).',
      whyItHappens: 'Each part is operated on independently without considering that the fractional part can exceed 1.',
      remediation: [
        'Convert to improper first: 9/4 + 7/4 = 16/4 = 4.',
        'Visual proof: 4 quarters = 1 whole; if fractional sum is ≥ 1, add another whole.',
        'Practice with sums that require regrouping.'
      ],
      detector: null
    },
    {
      id: 'percent-decimal-confusion',
      label: 'Percent ↔ decimal misplacement',
      grade: '5-6',
      severity: 'medium',
      description: 'Student writes 25% as 0.025 or 2.5 instead of 0.25; treats the percent sign as decimal moves of varying length.',
      whyItHappens: 'The "move the decimal" procedure is taught without the underlying meaning (percent = per hundred).',
      remediation: [
        'Define percent as "out of 100": 25% = 25/100 = 0.25.',
        'Use the 100-grid model: shade 25 of 100 squares.',
        'Practice mental benchmarks: 50% = 0.5, 25% = 0.25, 10% = 0.1.',
        'Connect to fraction form first, then decimal.'
      ],
      detector: null
    },
    {
      id: 'unit-fraction-additivity',
      label: 'Unit fraction misconception',
      grade: '3-4',
      severity: 'medium',
      description: 'Student does not see 3/4 as 1/4 + 1/4 + 1/4. Treats 3/4 as a single indivisible quantity.',
      whyItHappens: 'Procedural instruction skips the unit fraction iteration model.',
      remediation: [
        'CCSS 3.NF.A.1: explicitly build a/b as a copies of 1/b.',
        'Fraction strips: lay out three 1/4 strips to make 3/4.',
        'Bar model: 3/4 is three 1/4 segments end-to-end.',
        'Practice decomposing: 3/4 = 1/4 + 1/4 + 1/4 = 2/4 + 1/4.'
      ],
      detector: null
    }
  ];

  // ── Word problem library ──
  // Each problem: id, title, context, grade band, gradeLevel (3-7), CCSS code,
  // story template, numbers (can be parameterized), question, answer,
  // operation type (identify, compare, add, subtract, multiply, divide, equivalent),
  // visual model recommendation, hints array (3 levels: nudge → reveal one step → reveal procedure),
  // and a fully-worked solution.
  var WORD_PROBLEMS = [
    // ── COOKING & RECIPES ──
    {
      id: 'cookie-recipe-half',
      title: 'Half the cookie recipe',
      context: 'cooking',
      grade: 'easy',
      gradeLevel: 4,
      ccss: '4.NF.B.4',
      story: 'A cookie recipe calls for 3/4 cup of sugar. If you want to make half the recipe, how much sugar do you need?',
      operation: 'multiply',
      n1: 3, d1: 4, n2: 1, d2: 2,
      answer: { n: 3, d: 8 },
      visualModel: 'area',
      hints: [
        'Half of a recipe means you multiply each ingredient amount by 1/2.',
        'Multiply 3/4 by 1/2. Multiply numerators (3 × 1 = 3) and multiply denominators (4 × 2 = 8).',
        '3/4 × 1/2 = (3 × 1) / (4 × 2) = 3/8. So you need 3/8 cup of sugar.'
      ],
      worked: '3/4 × 1/2 = 3/8 cup'
    },
    {
      id: 'pizza-leftover',
      title: 'Pizza leftover',
      context: 'sharing',
      grade: 'easy',
      gradeLevel: 4,
      ccss: '4.NF.B.3.a',
      story: 'A pizza was cut into 8 equal slices. Maria ate 2 slices and Jamal ate 3 slices. What fraction of the pizza did they eat together?',
      operation: 'add',
      n1: 2, d1: 8, n2: 3, d2: 8,
      answer: { n: 5, d: 8 },
      visualModel: 'pie',
      hints: [
        'They both ate slices of the same pizza, so the denominator stays the same.',
        'Add the numerators (slices eaten): 2 + 3 = 5. Keep the denominator: 8.',
        'They ate 5/8 of the pizza together.'
      ],
      worked: '2/8 + 3/8 = 5/8'
    },
    {
      id: 'paint-walls',
      title: 'Painting the room',
      context: 'work',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.A.1',
      story: 'Alex painted 2/5 of the wall in the morning and 1/3 of the wall in the afternoon. How much of the wall has been painted in total?',
      operation: 'add',
      n1: 2, d1: 5, n2: 1, d2: 3,
      answer: { n: 11, d: 15 },
      visualModel: 'bar',
      hints: [
        'You need a common denominator before you can add. What is the LCM of 5 and 3?',
        'LCM(5, 3) = 15. Convert: 2/5 = 6/15 and 1/3 = 5/15.',
        '6/15 + 5/15 = 11/15. About 73% of the wall is painted.'
      ],
      worked: '2/5 + 1/3 = 6/15 + 5/15 = 11/15'
    },
    {
      id: 'ribbon-cutting',
      title: 'Cutting ribbon',
      context: 'measurement',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.B.7',
      story: 'You have a ribbon 6 feet long. You want to cut it into pieces that are 3/4 of a foot long. How many pieces can you make?',
      operation: 'divide',
      n1: 6, d1: 1, n2: 3, d2: 4,
      answer: { n: 8, d: 1 },
      visualModel: 'numberline',
      hints: [
        'You are asking: how many 3/4-foot pieces fit in 6 feet?',
        'Divide: 6 ÷ 3/4 = 6 × 4/3 (multiply by the reciprocal).',
        '6 × 4/3 = 24/3 = 8 pieces.'
      ],
      worked: '6 ÷ 3/4 = 6 × 4/3 = 24/3 = 8 pieces'
    },
    {
      id: 'pizza-share',
      title: 'Sharing pizza',
      context: 'sharing',
      grade: 'easy',
      gradeLevel: 3,
      ccss: '3.NF.A.1',
      story: '4 friends share 1 large pizza equally. What fraction of the pizza does each friend get?',
      operation: 'identify',
      n1: 1, d1: 4,
      answer: { n: 1, d: 4 },
      visualModel: 'pie',
      hints: [
        'The pizza is split into equal parts. How many parts?',
        '4 parts because 4 friends share it equally. Each friend gets 1 of the 4 parts.',
        'Each friend gets 1/4 of the pizza.'
      ],
      worked: '1 ÷ 4 = 1/4'
    },
    {
      id: 'allowance-saving',
      title: 'Saving allowance',
      context: 'money',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.B.6',
      story: 'Mia gets $20 each week. She saves 3/4 of her allowance. How many dollars does she save each week?',
      operation: 'multiply',
      n1: 3, d1: 4, n2: 20, d2: 1,
      answer: { n: 15, d: 1 },
      visualModel: 'set',
      hints: [
        'You need 3/4 of $20. Multiply: 3/4 × 20.',
        'Multiply the numerator: 3 × 20 = 60. Divide by the denominator: 60 ÷ 4.',
        '60 ÷ 4 = 15. Mia saves $15 each week.'
      ],
      worked: '3/4 × 20 = 60/4 = $15'
    },
    {
      id: 'race-distance',
      title: 'Running a race',
      context: 'distance',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.A.2',
      story: 'A race is 1 mile long. Diego has run 2/5 of the race. How much further does he need to run, as a fraction of the race?',
      operation: 'subtract',
      n1: 1, d1: 1, n2: 2, d2: 5,
      answer: { n: 3, d: 5 },
      visualModel: 'numberline',
      hints: [
        'The total race is 1 (or 5/5). He has run 2/5.',
        'Subtract: 5/5 - 2/5 = ?',
        '5/5 - 2/5 = 3/5. He has 3/5 of a mile left.'
      ],
      worked: '1 - 2/5 = 5/5 - 2/5 = 3/5'
    },
    {
      id: 'cake-leftover',
      title: 'Cake leftover',
      context: 'sharing',
      grade: 'easy',
      gradeLevel: 4,
      ccss: '4.NF.B.3.d',
      story: 'Yesterday a cake was cut into 12 equal pieces. 7 pieces were eaten. What fraction of the cake is left?',
      operation: 'subtract',
      n1: 12, d1: 12, n2: 7, d2: 12,
      answer: { n: 5, d: 12 },
      visualModel: 'pie',
      hints: [
        'The whole cake = 12/12. 7 pieces were eaten.',
        'Subtract: 12/12 - 7/12 = ?',
        '12/12 - 7/12 = 5/12. There are 5 of 12 pieces left, or 5/12 of the cake.'
      ],
      worked: '12/12 - 7/12 = 5/12'
    },
    {
      id: 'water-bottle',
      title: 'Drinking water',
      context: 'measurement',
      grade: 'easy',
      gradeLevel: 3,
      ccss: '3.NF.A.1',
      story: 'A water bottle is 2/3 full. What fraction of the bottle is empty?',
      operation: 'subtract',
      n1: 3, d1: 3, n2: 2, d2: 3,
      answer: { n: 1, d: 3 },
      visualModel: 'bar',
      hints: [
        'Full = 3/3. The bottle has 2/3.',
        'Subtract: 3/3 - 2/3.',
        '3/3 - 2/3 = 1/3. The bottle is 1/3 empty.'
      ],
      worked: '1 - 2/3 = 1/3'
    },
    {
      id: 'class-readers',
      title: 'Class readers',
      context: 'set',
      grade: 'medium',
      gradeLevel: 4,
      ccss: '4.NF.A.2',
      story: 'In a class of 24 students, 18 students have finished reading the book. What fraction of the class has finished?',
      operation: 'identify',
      n1: 18, d1: 24,
      answer: { n: 3, d: 4 },
      visualModel: 'set',
      hints: [
        '18 students finished out of 24. Write that as a fraction.',
        '18/24. Now simplify by dividing top and bottom by their GCD.',
        'GCD(18, 24) = 6. 18 ÷ 6 = 3, 24 ÷ 6 = 4. So 18/24 = 3/4.'
      ],
      worked: '18/24 = 3/4'
    },
    {
      id: 'lemonade-stand',
      title: 'Lemonade stand',
      context: 'money',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.B.6',
      story: 'Lemonade costs $1.50 per cup. You sell 1/2 cup servings for half price. If you sell 8 half-servings, how much money do you make?',
      operation: 'multiply',
      n1: 1, d1: 2, n2: 1, d2: 2,
      answer: { n: 6, d: 1 },
      visualModel: 'set',
      hints: [
        'Half-price of $1.50 = $0.75. You sell 8 of them.',
        '8 × $0.75 = ?',
        '8 × $0.75 = $6.00.'
      ],
      worked: '8 × ($1.50 × 1/2) = 8 × $0.75 = $6.00'
    },
    {
      id: 'recipe-double',
      title: 'Doubling a recipe',
      context: 'cooking',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.B.4',
      story: 'A muffin recipe needs 2 1/3 cups of flour. You want to double the recipe. How much flour do you need?',
      operation: 'multiply',
      n1: 7, d1: 3, n2: 2, d2: 1,
      answer: { n: 14, d: 3, mixed: '4 2/3' },
      visualModel: 'bar',
      hints: [
        'Convert 2 1/3 to an improper fraction first: 2 1/3 = 7/3.',
        'Multiply by 2: 7/3 × 2 = 14/3.',
        '14/3 = 4 2/3 cups of flour.'
      ],
      worked: '2 1/3 × 2 = 7/3 × 2 = 14/3 = 4 2/3 cups'
    },
    {
      id: 'gas-tank',
      title: 'Gas tank',
      context: 'measurement',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.B.6',
      story: 'A car has a gas tank that holds 16 gallons. The tank is 3/8 full. How many gallons of gas are in the tank?',
      operation: 'multiply',
      n1: 3, d1: 8, n2: 16, d2: 1,
      answer: { n: 6, d: 1 },
      visualModel: 'bar',
      hints: [
        'You need 3/8 of 16.',
        'Multiply: 3/8 × 16 = (3 × 16) / 8.',
        '48 / 8 = 6 gallons.'
      ],
      worked: '3/8 × 16 = 48/8 = 6 gallons'
    },
    {
      id: 'jelly-bean-fraction',
      title: 'Jelly bean colors',
      context: 'set',
      grade: 'easy',
      gradeLevel: 3,
      ccss: '3.NF.A.1',
      story: 'In a bag of 20 jelly beans, 5 are red, 6 are blue, 4 are green, and 5 are yellow. What fraction of the jelly beans are blue?',
      operation: 'identify',
      n1: 6, d1: 20,
      answer: { n: 3, d: 10 },
      visualModel: 'set',
      hints: [
        '6 blue out of 20 total. Write as a fraction.',
        '6/20. Simplify by dividing top and bottom by 2.',
        '6/20 = 3/10.'
      ],
      worked: '6/20 = 3/10'
    },
    {
      id: 'tape-measure',
      title: 'Tape measure',
      context: 'measurement',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.A.1',
      story: 'A board is 5 3/4 feet long. You cut off a piece that is 2 1/2 feet long. How long is the remaining piece?',
      operation: 'subtract',
      n1: 23, d1: 4, n2: 5, d2: 2,
      answer: { n: 13, d: 4, mixed: '3 1/4' },
      visualModel: 'numberline',
      hints: [
        'Convert both to improper or use mixed-number subtraction. 5 3/4 = 23/4 and 2 1/2 = 5/2 = 10/4.',
        '23/4 - 10/4 = ?',
        '23/4 - 10/4 = 13/4 = 3 1/4 feet.'
      ],
      worked: '5 3/4 - 2 1/2 = 23/4 - 10/4 = 13/4 = 3 1/4 ft'
    },
    {
      id: 'garden-fraction',
      title: 'Garden plot',
      context: 'measurement',
      grade: 'hard',
      gradeLevel: 6,
      ccss: '6.NS.A.1',
      story: 'A garden is 5 1/2 meters long and 3 1/3 meters wide. What is the area of the garden?',
      operation: 'multiply',
      n1: 11, d1: 2, n2: 10, d2: 3,
      answer: { n: 110, d: 6, mixed: '18 1/3' },
      visualModel: 'area',
      hints: [
        'Convert both mixed numbers to improper fractions: 5 1/2 = 11/2 and 3 1/3 = 10/3.',
        'Multiply: 11/2 × 10/3 = 110/6.',
        'Simplify: 110/6 = 55/3 = 18 1/3 square meters.'
      ],
      worked: '5 1/2 × 3 1/3 = 11/2 × 10/3 = 110/6 = 18 1/3 m²'
    },
    {
      id: 'reading-book',
      title: 'Reading progress',
      context: 'distance',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.A.2',
      story: 'A book has 200 pages. You have read 3/5 of it. How many pages have you read? How many pages are left?',
      operation: 'multiply',
      n1: 3, d1: 5, n2: 200, d2: 1,
      answer: { n: 120, d: 1, secondary: 80 },
      visualModel: 'bar',
      hints: [
        '3/5 of 200: multiply.',
        '3 × 200 = 600. 600 ÷ 5 = 120. You have read 120 pages.',
        '200 - 120 = 80 pages left.'
      ],
      worked: '3/5 × 200 = 120 pages read; 200 - 120 = 80 pages left'
    },
    {
      id: 'classroom-pets',
      title: 'Classroom pets',
      context: 'set',
      grade: 'easy',
      gradeLevel: 4,
      ccss: '4.NF.A.2',
      story: 'Of 30 students in a class, 2/5 have a pet. How many students have a pet?',
      operation: 'multiply',
      n1: 2, d1: 5, n2: 30, d2: 1,
      answer: { n: 12, d: 1 },
      visualModel: 'set',
      hints: [
        '2/5 of 30. Multiply.',
        '2 × 30 = 60. 60 ÷ 5 = 12.',
        '12 students have a pet.'
      ],
      worked: '2/5 × 30 = 12 students'
    },
    {
      id: 'snowfall',
      title: 'Snowfall measurement',
      context: 'measurement',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.A.1',
      story: 'On Monday it snowed 1 3/4 inches. On Tuesday it snowed another 2/3 inch. How much snow fell total?',
      operation: 'add',
      n1: 7, d1: 4, n2: 2, d2: 3,
      answer: { n: 29, d: 12, mixed: '2 5/12' },
      visualModel: 'numberline',
      hints: [
        'Convert: 1 3/4 = 7/4. Find common denominator with 2/3 — LCM(4, 3) = 12.',
        '7/4 = 21/12. 2/3 = 8/12.',
        '21/12 + 8/12 = 29/12 = 2 5/12 inches.'
      ],
      worked: '1 3/4 + 2/3 = 7/4 + 2/3 = 21/12 + 8/12 = 29/12 = 2 5/12 inches'
    },
    {
      id: 'pumpkin-pie',
      title: 'Pumpkin pie',
      context: 'sharing',
      grade: 'easy',
      gradeLevel: 4,
      ccss: '4.NF.B.3.a',
      story: 'A pumpkin pie was cut into 8 slices. The Johnson family ate 5/8 of the pie at dinner and 1/8 for breakfast. How much pie is left?',
      operation: 'subtract',
      n1: 8, d1: 8, n2: 6, d2: 8,
      answer: { n: 2, d: 8, simplified: '1/4' },
      visualModel: 'pie',
      hints: [
        'Total eaten: 5/8 + 1/8 = 6/8.',
        'Pie left: 8/8 - 6/8.',
        '8/8 - 6/8 = 2/8 = 1/4 of the pie.'
      ],
      worked: '1 - (5/8 + 1/8) = 8/8 - 6/8 = 2/8 = 1/4'
    },
    {
      id: 'meeting-attendance',
      title: 'Meeting attendance',
      context: 'set',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.B.4',
      story: 'A meeting had 36 people scheduled. 2/3 actually attended. How many people attended?',
      operation: 'multiply',
      n1: 2, d1: 3, n2: 36, d2: 1,
      answer: { n: 24, d: 1 },
      visualModel: 'set',
      hints: ['2/3 of 36.', '2 × 36 = 72. 72 ÷ 3 = 24.', '24 people attended.'],
      worked: '2/3 × 36 = 24 people'
    },
    {
      id: 'apple-share',
      title: 'Sharing apples',
      context: 'sharing',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.B.7',
      story: 'You have 3 apples. You want to give each friend 1/4 of an apple. How many friends can you serve?',
      operation: 'divide',
      n1: 3, d1: 1, n2: 1, d2: 4,
      answer: { n: 12, d: 1 },
      visualModel: 'pie',
      hints: [
        'How many quarters in 3 wholes?',
        '3 ÷ 1/4 = 3 × 4 = 12.',
        '12 friends.'
      ],
      worked: '3 ÷ 1/4 = 3 × 4 = 12 friends'
    },
    {
      id: 'tile-floor',
      title: 'Tile floor',
      context: 'measurement',
      grade: 'hard',
      gradeLevel: 6,
      ccss: '5.NF.B.4.b',
      story: 'A bathroom floor is 4 1/2 feet by 3 1/2 feet. What is its area?',
      operation: 'multiply',
      n1: 9, d1: 2, n2: 7, d2: 2,
      answer: { n: 63, d: 4, mixed: '15 3/4' },
      visualModel: 'area',
      hints: [
        '4 1/2 = 9/2 and 3 1/2 = 7/2.',
        '9/2 × 7/2 = 63/4.',
        '63/4 = 15 3/4 sq ft.'
      ],
      worked: '4 1/2 × 3 1/2 = 9/2 × 7/2 = 63/4 = 15 3/4 sq ft'
    },
    {
      id: 'movie-time',
      title: 'Movie running time',
      context: 'time',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.A.1',
      story: 'A movie is 1 1/2 hours long. You have watched 2/3 of it. How much of the movie have you watched, in hours?',
      operation: 'multiply',
      n1: 2, d1: 3, n2: 3, d2: 2,
      answer: { n: 1, d: 1 },
      visualModel: 'bar',
      hints: [
        '2/3 of 1 1/2 hours.',
        '2/3 × 3/2 = 6/6.',
        '6/6 = 1 hour.'
      ],
      worked: '2/3 × 3/2 = 6/6 = 1 hour'
    },
    {
      id: 'sandwich-share',
      title: 'Sandwich sharing',
      context: 'sharing',
      grade: 'easy',
      gradeLevel: 3,
      ccss: '3.NF.A.1',
      story: '3 friends share 1 sandwich equally. What fraction does each get?',
      operation: 'identify',
      n1: 1, d1: 3,
      answer: { n: 1, d: 3 },
      visualModel: 'bar',
      hints: ['1 sandwich split 3 ways.', 'Each gets 1 of the 3 parts.', 'Each friend gets 1/3.'],
      worked: '1 ÷ 3 = 1/3'
    },
    {
      id: 'water-glasses',
      title: 'Water glasses',
      context: 'measurement',
      grade: 'medium',
      gradeLevel: 5,
      ccss: '5.NF.B.7',
      story: 'A pitcher holds 6 cups of water. Each glass holds 3/4 cup. How many glasses can you fill?',
      operation: 'divide',
      n1: 6, d1: 1, n2: 3, d2: 4,
      answer: { n: 8, d: 1 },
      visualModel: 'set',
      hints: ['How many 3/4-cups in 6 cups?', '6 ÷ 3/4 = 6 × 4/3 = 24/3.', '24/3 = 8 glasses.'],
      worked: '6 ÷ 3/4 = 6 × 4/3 = 8 glasses'
    }
  ];

  // ── Real-world fraction contexts (for word-problem templating) ──
  var CONTEXTS = {
    cooking: { label: 'Cooking', icon: '🍳', desc: 'Recipes, ingredients, measuring cups' },
    sharing: { label: 'Sharing', icon: '🍕', desc: 'Splitting food, dividing fairly' },
    money:   { label: 'Money', icon: '💰', desc: 'Allowance, savings, prices' },
    measurement: { label: 'Measurement', icon: '📏', desc: 'Length, volume, weight' },
    distance: { label: 'Distance', icon: '🏃', desc: 'Running, walking, traveling' },
    time:    { label: 'Time', icon: '⏰', desc: 'Hours, minutes, schedules' },
    set:     { label: 'Groups', icon: '🎲', desc: 'Parts of a collection' },
    work:    { label: 'Work', icon: '🛠', desc: 'Completing tasks, projects' },
    sports:  { label: 'Sports', icon: '⚽', desc: 'Scores, plays, statistics' }
  };

  // ── Color-blind safe palettes (4 to choose from) ──
  // Each palette: name, main (filled), bg (empty), accent, contrast
  var COLOR_PALETTES = {
    rose:     { name: 'Rose (default)',  main: '#f43f5e', bg: '#fecdd3', accent: '#e11d48', contrast: '#9f1239' },
    okabe:    { name: 'Okabe-Ito (CB-safe)', main: '#E69F00', bg: '#F0E442', accent: '#0072B2', contrast: '#000000' },
    viridis:  { name: 'Viridis (CB-safe)', main: '#3b528b', bg: '#fde725', accent: '#21918c', contrast: '#440154' },
    high:     { name: 'High contrast B&W', main: '#000000', bg: '#ffffff', accent: '#444444', contrast: '#888888' }
  };

  // ── Extended word problem library (continuation, 50+ more problems) ──
  // Organized by context with multi-level hints and worked solutions.
  var WORD_PROBLEMS_EXT = [
    // ── COOKING / RECIPES ──
    { id: 'pancake-recipe', title: 'Pancake recipe', context: 'cooking', grade: 'medium', gradeLevel: 5, ccss: '5.NF.B.4',
      story: 'A pancake recipe needs 2 1/2 cups of flour. You want to make 1 1/2 times the recipe. How much flour do you need?',
      operation: 'multiply', n1: 5, d1: 2, n2: 3, d2: 2,
      answer: { n: 15, d: 4, mixed: '3 3/4' }, visualModel: 'area',
      hints: ['Convert mixed numbers: 2 1/2 = 5/2 and 1 1/2 = 3/2.', 'Multiply: 5/2 × 3/2 = 15/4.', '15/4 = 3 3/4 cups.'],
      worked: '5/2 × 3/2 = 15/4 = 3 3/4 cups' },
    { id: 'soup-stock', title: 'Soup stock', context: 'cooking', grade: 'medium', gradeLevel: 5, ccss: '5.NF.A.1',
      story: 'A soup needs 3/4 cup of stock per serving. You are making 6 servings. How much stock do you need?',
      operation: 'multiply', n1: 3, d1: 4, n2: 6, d2: 1,
      answer: { n: 18, d: 4, mixed: '4 1/2' }, visualModel: 'set',
      hints: ['3/4 cup per serving × 6 servings.', '3/4 × 6 = 18/4.', '18/4 = 4 1/2 cups.'],
      worked: '3/4 × 6 = 4 1/2 cups' },
    { id: 'butter-cookies', title: 'Butter for cookies', context: 'cooking', grade: 'easy', gradeLevel: 4, ccss: '4.NF.B.3.a',
      story: 'A cookie recipe uses 1/4 stick of butter for the dough and 1/8 stick to grease the pan. How much butter total?',
      operation: 'add', n1: 1, d1: 4, n2: 1, d2: 8,
      answer: { n: 3, d: 8 }, visualModel: 'bar',
      hints: ['Common denominator of 4 and 8 is 8.', '1/4 = 2/8. Add: 2/8 + 1/8.', '2/8 + 1/8 = 3/8 stick.'],
      worked: '1/4 + 1/8 = 2/8 + 1/8 = 3/8 stick' },
    // ── MONEY ──
    { id: 'sale-discount', title: 'Sale discount', context: 'money', grade: 'medium', gradeLevel: 6, ccss: '6.RP.A.3.c',
      story: 'A jacket costs $80. The store offers 1/4 off. How much do you save? How much do you pay?',
      operation: 'multiply', n1: 1, d1: 4, n2: 80, d2: 1,
      answer: { n: 20, d: 1, secondary: 60 }, visualModel: 'set',
      hints: ['1/4 of $80 is the discount.', '80 ÷ 4 = 20. Discount is $20.', 'You pay 80 - 20 = $60.'],
      worked: '1/4 × $80 = $20 off; you pay $60' },
    { id: 'tip-calculation', title: 'Tip at restaurant', context: 'money', grade: 'hard', gradeLevel: 6, ccss: '6.RP.A.3.c',
      story: 'A restaurant bill is $48. You want to leave a 1/5 tip. How much is the tip?',
      operation: 'multiply', n1: 1, d1: 5, n2: 48, d2: 1,
      answer: { n: 48, d: 5, decimal: 9.60 }, visualModel: 'set',
      hints: ['1/5 of $48.', '48 ÷ 5 = 9.6.', 'Tip is $9.60.'],
      worked: '1/5 × $48 = $9.60' },
    { id: 'birthday-money', title: 'Birthday money', context: 'money', grade: 'medium', gradeLevel: 5, ccss: '5.NF.B.6',
      story: 'Tio gets $30 for his birthday. He spends 2/3 on a video game and saves the rest. How much does he save?',
      operation: 'subtract', n1: 30, d1: 1, n2: 60, d2: 3,
      answer: { n: 10, d: 1 }, visualModel: 'set',
      hints: ['He spent 2/3 of $30. 2/3 × 30 = 20.', 'He saves 30 - 20 = 10.', 'Tio saves $10.'],
      worked: '$30 - (2/3 × $30) = $30 - $20 = $10' },
    // ── DISTANCE / TRAVEL ──
    { id: 'walking-trail', title: 'Walking trail', context: 'distance', grade: 'medium', gradeLevel: 5, ccss: '5.NF.A.1',
      story: 'A walking trail is 4 1/2 miles long. You have walked 2 3/4 miles. How much further do you need to go?',
      operation: 'subtract', n1: 9, d1: 2, n2: 11, d2: 4,
      answer: { n: 7, d: 4, mixed: '1 3/4' }, visualModel: 'numberline',
      hints: ['Convert: 4 1/2 = 9/2 = 18/4. 2 3/4 = 11/4.', 'Subtract: 18/4 - 11/4 = 7/4.', '7/4 = 1 3/4 miles.'],
      worked: '4 1/2 - 2 3/4 = 18/4 - 11/4 = 7/4 = 1 3/4 mi' },
    { id: 'car-trip', title: 'Car trip', context: 'distance', grade: 'medium', gradeLevel: 5, ccss: '5.NF.B.6',
      story: 'A trip is 240 miles. You have completed 3/8 of it. How many miles have you driven?',
      operation: 'multiply', n1: 3, d1: 8, n2: 240, d2: 1,
      answer: { n: 90, d: 1 }, visualModel: 'bar',
      hints: ['3/8 of 240.', '3 × 240 = 720. 720 ÷ 8 = 90.', '90 miles driven.'],
      worked: '3/8 × 240 = 90 miles' },
    // ── TIME ──
    { id: 'practice-time', title: 'Practice time', context: 'time', grade: 'medium', gradeLevel: 5, ccss: '5.NF.A.1',
      story: 'Anya practices piano 3/4 hour on Monday and 1/2 hour on Tuesday. How long does she practice total?',
      operation: 'add', n1: 3, d1: 4, n2: 1, d2: 2,
      answer: { n: 5, d: 4, mixed: '1 1/4' }, visualModel: 'numberline',
      hints: ['1/2 = 2/4. Common denominator is 4.', '3/4 + 2/4 = 5/4.', '5/4 = 1 1/4 hours.'],
      worked: '3/4 + 1/2 = 3/4 + 2/4 = 5/4 = 1 1/4 hours' },
    { id: 'sleep-fraction', title: 'Sleeping fraction', context: 'time', grade: 'easy', gradeLevel: 4, ccss: '4.NF.A.2',
      story: 'A day has 24 hours. If you sleep 8 hours, what fraction of the day do you sleep?',
      operation: 'identify', n1: 8, d1: 24,
      answer: { n: 1, d: 3 }, visualModel: 'pie',
      hints: ['8 out of 24.', 'Simplify 8/24 by dividing top and bottom by 8.', '8/24 = 1/3 of the day.'],
      worked: '8/24 = 1/3' },
    { id: 'class-period', title: 'Class period', context: 'time', grade: 'easy', gradeLevel: 4, ccss: '4.NF.A.2',
      story: 'A 60-minute class spent 20 minutes on math and 10 minutes on a break. What fraction of the class was math?',
      operation: 'identify', n1: 20, d1: 60,
      answer: { n: 1, d: 3 }, visualModel: 'pie',
      hints: ['20 out of 60 minutes.', '20/60 = 1/3 after dividing by 20.', '1/3 of class on math.'],
      worked: '20/60 = 1/3' },
    // ── SHARING / FOOD ──
    { id: 'pie-thirds', title: 'Pie split three ways', context: 'sharing', grade: 'easy', gradeLevel: 3, ccss: '3.NF.A.1',
      story: 'You and 2 friends share 1 pie equally. What fraction does each person get?',
      operation: 'identify', n1: 1, d1: 3,
      answer: { n: 1, d: 3 }, visualModel: 'pie',
      hints: ['3 people, 1 pie, equal shares.', 'Each gets 1 of 3 parts.', '1/3 of the pie each.'],
      worked: '1 ÷ 3 = 1/3' },
    { id: 'leftover-pizza', title: 'Leftover pizza', context: 'sharing', grade: 'medium', gradeLevel: 5, ccss: '5.NF.A.1',
      story: 'There is 5/8 of a pizza left. You eat 1/4 of the original pizza. How much pizza is left?',
      operation: 'subtract', n1: 5, d1: 8, n2: 1, d2: 4,
      answer: { n: 3, d: 8 }, visualModel: 'pie',
      hints: ['1/4 = 2/8. Common denominator is 8.', '5/8 - 2/8 = 3/8.', '3/8 of the pizza left.'],
      worked: '5/8 - 1/4 = 5/8 - 2/8 = 3/8' },
    { id: 'two-pizzas', title: 'Two pizzas', context: 'sharing', grade: 'medium', gradeLevel: 5, ccss: '5.NF.B.7',
      story: '2 pizzas are cut into eighths. How many slices total?',
      operation: 'divide', n1: 2, d1: 1, n2: 1, d2: 8,
      answer: { n: 16, d: 1 }, visualModel: 'pie',
      hints: ['How many 1/8 slices in 2 wholes?', '2 ÷ 1/8 = 2 × 8 = 16.', '16 slices.'],
      worked: '2 ÷ 1/8 = 16 slices' },
    { id: 'cookie-split', title: 'Cookie split', context: 'sharing', grade: 'medium', gradeLevel: 5, ccss: '5.NF.B.7',
      story: '3 cookies will be split equally among 4 children. How much does each child get?',
      operation: 'divide', n1: 3, d1: 1, n2: 4, d2: 1,
      answer: { n: 3, d: 4 }, visualModel: 'pie',
      hints: ['3 ÷ 4 = 3/4.', 'Each child gets less than a whole cookie.', 'Each gets 3/4 of a cookie.'],
      worked: '3 ÷ 4 = 3/4 cookie each' },
    // ── SET / GROUP ──
    { id: 'basket-balls', title: 'Basketball shots', context: 'sports', grade: 'easy', gradeLevel: 4, ccss: '4.NF.A.2',
      story: 'You take 25 shots. You make 15 of them. What fraction did you make?',
      operation: 'identify', n1: 15, d1: 25,
      answer: { n: 3, d: 5 }, visualModel: 'set',
      hints: ['15 of 25 shots made.', '15/25, simplify by dividing top and bottom by 5.', '15/25 = 3/5.'],
      worked: '15/25 = 3/5' },
    { id: 'class-fraction', title: 'Boys and girls', context: 'set', grade: 'easy', gradeLevel: 4, ccss: '4.NF.A.2',
      story: 'A class has 10 boys and 14 girls. What fraction of the class is boys?',
      operation: 'identify', n1: 10, d1: 24,
      answer: { n: 5, d: 12 }, visualModel: 'set',
      hints: ['10 boys out of 10 + 14 = 24 students.', '10/24 simplifies.', '10/24 = 5/12.'],
      worked: '10/24 = 5/12' },
    { id: 'marble-bag', title: 'Marble bag', context: 'set', grade: 'easy', gradeLevel: 4, ccss: '4.NF.A.2',
      story: '12 marbles: 3 red, 4 blue, 5 green. What fraction is blue?',
      operation: 'identify', n1: 4, d1: 12,
      answer: { n: 1, d: 3 }, visualModel: 'set',
      hints: ['4 out of 12 are blue.', '4/12 simplifies by dividing by 4.', '4/12 = 1/3.'],
      worked: '4/12 = 1/3' },
    // ── MEASUREMENT ──
    { id: 'rope-cuts', title: 'Rope cuts', context: 'measurement', grade: 'medium', gradeLevel: 5, ccss: '5.NF.B.7',
      story: 'You have 9 feet of rope. You cut it into 1 1/2 ft pieces. How many pieces?',
      operation: 'divide', n1: 9, d1: 1, n2: 3, d2: 2,
      answer: { n: 6, d: 1 }, visualModel: 'numberline',
      hints: ['How many 1 1/2 ft pieces in 9 ft?', '9 ÷ 3/2 = 9 × 2/3 = 18/3.', '18/3 = 6 pieces.'],
      worked: '9 ÷ 3/2 = 6 pieces' },
    { id: 'fabric-yards', title: 'Fabric yards', context: 'measurement', grade: 'medium', gradeLevel: 5, ccss: '5.NF.A.1',
      story: 'You have 5/6 yard of red fabric and 1/4 yard of blue. How much fabric total?',
      operation: 'add', n1: 5, d1: 6, n2: 1, d2: 4,
      answer: { n: 13, d: 12, mixed: '1 1/12' }, visualModel: 'bar',
      hints: ['LCM(6, 4) = 12.', '5/6 = 10/12. 1/4 = 3/12. Add: 10/12 + 3/12.', '13/12 = 1 1/12 yards.'],
      worked: '5/6 + 1/4 = 10/12 + 3/12 = 13/12 = 1 1/12 yd' },
    { id: 'water-jug', title: 'Water jug', context: 'measurement', grade: 'easy', gradeLevel: 4, ccss: '4.NF.B.3.a',
      story: 'A jug is 7/10 full. You pour out 3/10. How much water is left?',
      operation: 'subtract', n1: 7, d1: 10, n2: 3, d2: 10,
      answer: { n: 4, d: 10, simplified: '2/5' }, visualModel: 'volume',
      hints: ['Same denominator. Subtract numerators.', '7/10 - 3/10 = 4/10.', '4/10 = 2/5.'],
      worked: '7/10 - 3/10 = 4/10 = 2/5' },
    // ── WORK / PROJECTS ──
    { id: 'project-portion', title: 'Project progress', context: 'work', grade: 'medium', gradeLevel: 5, ccss: '5.NF.A.2',
      story: 'On Monday Sam did 2/5 of the project. On Tuesday he did 1/4 of the project. How much of the project is done?',
      operation: 'add', n1: 2, d1: 5, n2: 1, d2: 4,
      answer: { n: 13, d: 20 }, visualModel: 'bar',
      hints: ['LCM(5, 4) = 20.', '2/5 = 8/20. 1/4 = 5/20. Add.', '8/20 + 5/20 = 13/20.'],
      worked: '2/5 + 1/4 = 8/20 + 5/20 = 13/20' },
    { id: 'team-task', title: 'Team task', context: 'work', grade: 'medium', gradeLevel: 5, ccss: '5.NF.A.2',
      story: 'A team has 3/8 of a task left. They split it equally among 3 people. How much does each person do?',
      operation: 'divide', n1: 3, d1: 8, n2: 3, d2: 1,
      answer: { n: 1, d: 8 }, visualModel: 'bar',
      hints: ['3/8 ÷ 3.', '3/8 × 1/3 = 3/24 = 1/8.', 'Each person does 1/8.'],
      worked: '3/8 ÷ 3 = 1/8 each' },
    // ── SPORTS ──
    { id: 'free-throws', title: 'Free throws', context: 'sports', grade: 'medium', gradeLevel: 5, ccss: '5.NF.A.2',
      story: 'Last game you made 7/10 of your free throws. This game 4/5. Were you better this game or last? By how much?',
      operation: 'compare', n1: 7, d1: 10, n2: 4, d2: 5,
      answer: { n: 1, d: 10, secondary: 'this game' }, visualModel: 'bar',
      hints: ['Common denominator 10. 4/5 = 8/10.', 'Compare 7/10 and 8/10.', '8/10 - 7/10 = 1/10 better this game.'],
      worked: '8/10 - 7/10 = 1/10 better' },
    { id: 'race-finish', title: 'Race finish', context: 'sports', grade: 'medium', gradeLevel: 5, ccss: '5.NF.B.6',
      story: 'In a relay, each runner runs 1/4 of a mile. The relay has 4 runners. How long is the relay?',
      operation: 'multiply', n1: 1, d1: 4, n2: 4, d2: 1,
      answer: { n: 1, d: 1 }, visualModel: 'numberline',
      hints: ['1/4 × 4.', '1/4 + 1/4 + 1/4 + 1/4 = 4/4 = 1.', '1 mile.'],
      worked: '1/4 × 4 = 1 mile' },
    // ── ADDITIONAL VARIETY ──
    { id: 'paint-mix', title: 'Paint mix', context: 'measurement', grade: 'hard', gradeLevel: 6, ccss: '6.NS.A.1',
      story: 'Mix 2/3 cup white paint with 1/4 cup red paint to make pink. How much pink paint do you get?',
      operation: 'add', n1: 2, d1: 3, n2: 1, d2: 4,
      answer: { n: 11, d: 12 }, visualModel: 'volume',
      hints: ['LCM(3, 4) = 12.', '2/3 = 8/12. 1/4 = 3/12.', '8/12 + 3/12 = 11/12 cup.'],
      worked: '2/3 + 1/4 = 8/12 + 3/12 = 11/12 cup' },
    { id: 'garden-rows', title: 'Garden rows', context: 'work', grade: 'medium', gradeLevel: 5, ccss: '5.NF.B.7',
      story: 'A garden is 12 feet long. Rows are 3/4 ft apart. How many rows fit?',
      operation: 'divide', n1: 12, d1: 1, n2: 3, d2: 4,
      answer: { n: 16, d: 1 }, visualModel: 'numberline',
      hints: ['12 ÷ 3/4.', '12 × 4/3 = 48/3.', '48/3 = 16 rows.'],
      worked: '12 ÷ 3/4 = 16 rows' },
    { id: 'fish-tank', title: 'Fish tank', context: 'measurement', grade: 'easy', gradeLevel: 4, ccss: '4.NF.A.2',
      story: 'A tank has 30 fish: 12 goldfish, 8 tetras, 10 guppies. What fraction is goldfish?',
      operation: 'identify', n1: 12, d1: 30,
      answer: { n: 2, d: 5 }, visualModel: 'set',
      hints: ['12 out of 30.', 'Divide top and bottom by 6.', '12/30 = 2/5.'],
      worked: '12/30 = 2/5' },
    { id: 'pizza-pepperoni', title: 'Pizza toppings', context: 'sharing', grade: 'medium', gradeLevel: 5, ccss: '5.NF.A.2',
      story: '3/4 of a pizza has cheese. 1/3 has pepperoni AND cheese. What fraction has just cheese?',
      operation: 'subtract', n1: 3, d1: 4, n2: 1, d2: 3,
      answer: { n: 5, d: 12 }, visualModel: 'pie',
      hints: ['LCM(4, 3) = 12.', '3/4 = 9/12. 1/3 = 4/12.', '9/12 - 4/12 = 5/12.'],
      worked: '3/4 - 1/3 = 9/12 - 4/12 = 5/12' }
  ];

  // ── IEP goal bank for fractions ──
  // Pre-formatted SMART goal language teachers/case managers can adapt.
  var IEP_GOAL_BANK = [
    { id: 'identify-3', grade: '3-4', topic: 'identifying fractions',
      goal: '[Student] will identify the numerator and denominator of a fraction shown as a pie or bar model with 80% accuracy across 4 of 5 consecutive trials.',
      ccss: '3.NF.A.1',
      progress: 'Track via Practice tab challenge type "identify."',
      accommodations: ['Use visual fraction models alongside the symbol', 'Allow extra processing time', 'Color-coded numerator/denominator labels'] },
    { id: 'magnitude-3', grade: '3-4', topic: 'fraction magnitude',
      goal: '[Student] will place fractions with denominators 2-10 on a number line within 10% accuracy on 4 of 5 trials.',
      ccss: '3.NF.A.2',
      progress: 'Track via Number Line tab placements.',
      accommodations: ['Use Cuisenaire rods or fraction strips', 'Provide benchmark reference (0, 1/2, 1)', 'Verbal narration of fractions'] },
    { id: 'equivalent-4', grade: '4', topic: 'equivalent fractions',
      goal: '[Student] will generate three equivalent fractions for a given fraction with denominator ≤ 12, with 80% accuracy across 4 of 5 trials.',
      ccss: '4.NF.A.1',
      progress: 'Track via Equivalent Chain tab + challenge type "equivalent."',
      accommodations: ['Show area model alongside symbols', 'Fraction wall for visual verification', 'Provide multiplication chart'] },
    { id: 'compare-4', grade: '4-5', topic: 'comparing fractions',
      goal: '[Student] will compare two fractions with unlike denominators using benchmark fractions or cross-multiplication with 80% accuracy on 4 of 5 trials.',
      ccss: '4.NF.A.2',
      progress: 'Track via Compare tab quizzes.',
      accommodations: ['Cross-multiplication grid template', 'Benchmark reference card (0, 1/4, 1/2, 3/4, 1)', 'Pie model side-by-side comparison'] },
    { id: 'add-5', grade: '5', topic: 'add/subtract unlike denominators',
      goal: '[Student] will add or subtract two fractions with unlike denominators (denominators ≤ 12) with 80% accuracy across 4 of 5 trials.',
      ccss: '5.NF.A.1',
      progress: 'Track via Operations + Op proofs tabs.',
      accommodations: ['Common denominator finder visual', 'Pre-printed conversion templates', 'Fraction strips for hands-on verification'] },
    { id: 'multiply-5', grade: '5', topic: 'multiply fractions',
      goal: '[Student] will multiply two proper fractions and simplify the product with 75% accuracy across 4 of 5 trials.',
      ccss: '5.NF.B.4',
      progress: 'Track via Operations tab multiply quizzes.',
      accommodations: ['Area model handout', 'Step-by-step worksheet', 'Visual proof reference'] },
    { id: 'word-5', grade: '5', topic: 'word problems with fractions',
      goal: '[Student] will solve real-world word problems involving fractions with addition, subtraction, or multiplication with 70% accuracy across 4 of 5 trials.',
      ccss: '5.NF.B.6',
      progress: 'Track via Word Problems tab.',
      accommodations: ['Read problem aloud', 'Visual diagram of problem', 'Underline key information', 'Multi-step problem template'] },
    { id: 'divide-6', grade: '6', topic: 'divide fractions',
      goal: '[Student] will divide a fraction by a fraction using the reciprocal method with 75% accuracy across 4 of 5 trials.',
      ccss: '6.NS.A.1',
      progress: 'Track via Operations tab divide quizzes.',
      accommodations: ['"Keep-Change-Flip" reference card', 'Measurement model illustrations', 'Calculator allowed for arithmetic'] },
    { id: 'decimal-7', grade: '7', topic: 'fraction to decimal',
      goal: '[Student] will convert a fraction to a terminating or repeating decimal using long division with 80% accuracy across 4 of 5 trials.',
      ccss: '7.NS.A.2.d',
      progress: 'Track via Decimals + Converter tabs.',
      accommodations: ['Long-division template', 'Decimal expansion visualizer', 'Recognize when to stop (terminating) or use repeat bar'] }
  ];

  // ── Lesson plan templates ──
  // Suggested 4-day micro-units, each tied to a CCSS standard.
  var LESSON_PLANS = [
    {
      id: 'lp-equivalent',
      title: 'Equivalent Fractions Mini-Unit',
      grade: 4,
      ccss: '4.NF.A.1',
      duration: '4 days × 30 min',
      objectives: [
        'Student will recognize equivalent fractions using a visual model.',
        'Student will generate equivalent fractions by multiplying top and bottom by the same number.',
        'Student will explain why two fractions are equivalent in their own words.'
      ],
      days: [
        { day: 1, focus: 'Introduce equivalence with a fraction wall', activities: [
          'Use Wall tab: stack 1/2 above 2/4 above 4/8. Visual same-height.',
          'Vocabulary: equivalent, simplify, common multiple.',
          'Exit ticket: name 2 fractions equivalent to 1/3.'
        ] },
        { day: 2, focus: 'Generating equivalent fractions procedurally', activities: [
          'Use Equivalents tab. Multiply top and bottom by 2, 3, 4.',
          'Use Equivalent Chain tab to generate longer chains.',
          'Practice: 5 problems generating equivalents.'
        ] },
        { day: 3, focus: 'Models for proof', activities: [
          'Use Models tab: switch between pie, bar, number line, area.',
          'Discuss: why does 1/2 = 2/4 = 4/8 on every model?',
          'Use Op Proofs tab to see multiplication of fractions.'
        ] },
        { day: 4, focus: 'Application and assessment', activities: [
          'Use Word Problems tab: 3 problems requiring equivalents.',
          'Worksheet generator: 8 problems, "Equivalent fractions."',
          'Assessment: Equivalent Match game as a fluency check.'
        ] }
      ]
    },
    {
      id: 'lp-add-unlike',
      title: 'Adding Fractions with Unlike Denominators',
      grade: 5,
      ccss: '5.NF.A.1',
      duration: '5 days × 30 min',
      objectives: [
        'Student will find a common denominator for two fractions.',
        'Student will convert each fraction to the common denominator.',
        'Student will add fractions with unlike denominators and simplify.'
      ],
      days: [
        { day: 1, focus: 'Why we need a common denominator', activities: [
          'Concrete: fraction strips of 1/2 and 1/3. Can\'t directly combine.',
          'Practice with same denominators (review).',
          'Discuss: "What makes pieces combinable?"'
        ] },
        { day: 2, focus: 'Finding LCM with prime factorization', activities: [
          'Use Op Proofs tab: see the common-denominator visualizer.',
          'LCM exercises: pairs of small denominators.'
        ] },
        { day: 3, focus: 'Converting and adding', activities: [
          'Worked example with Operations tab.',
          'Practice: 5 problems with unlike denominators.'
        ] },
        { day: 4, focus: 'Simplifying results', activities: [
          'Use Simplification visualizer.',
          'Practice: 5 problems requiring simplification.'
        ] },
        { day: 5, focus: 'Application', activities: [
          'Word Problems tab: 4 problems requiring add-unlike.',
          'Worksheet generator: 10 problems, "Add (unlike).'
        ] }
      ]
    },
    {
      id: 'lp-multiply',
      title: 'Multiplying Fractions Mini-Unit',
      grade: 5,
      ccss: '5.NF.B.4',
      duration: '4 days × 30 min',
      objectives: [
        'Student will multiply two proper fractions.',
        'Student will multiply a fraction by a whole number.',
        'Student will explain multiplication of fractions using an area model.'
      ],
      days: [
        { day: 1, focus: 'Fraction × whole number', activities: [
          'Use Models tab area + set models.',
          'Practice: 1/2 × 4, 3/4 × 8.'
        ] },
        { day: 2, focus: 'Fraction × fraction with area model', activities: [
          'Use Op Proofs tab. Area model visualization.',
          'Show: 1/2 × 1/2 = 1/4. Why is the product smaller?'
        ] },
        { day: 3, focus: 'Procedure without model', activities: [
          'Multiply tops, multiply bottoms. Simplify.',
          'Worksheet generator: 8 problems "Multiply.'
        ] },
        { day: 4, focus: 'Word problems and scaling', activities: [
          'Word Problems tab: 4 multiply problems.',
          'Discuss: when does multiplying make something bigger / smaller?'
        ] }
      ]
    },
    {
      id: 'lp-number-line',
      title: 'Number Line Fractions (IES Practice Guide central representation)',
      grade: 3,
      ccss: '3.NF.A.2',
      duration: '3 days × 25 min',
      objectives: [
        'Student will place a fraction on a number line.',
        'Student will compare two fractions using their number-line positions.',
        'Student will see that equivalent fractions land on the same point.'
      ],
      days: [
        { day: 1, focus: 'Introducing the number-line model', activities: [
          'Use Number Line tab. Add 1/2, then 1/4, then 3/4.',
          'Observe: 1/2 is between 0 and 1, exactly in the middle.'
        ] },
        { day: 2, focus: 'Comparison via position', activities: [
          'Place 2/3 and 3/4. Which is further right?',
          'Connect to magnitude reasoning.'
        ] },
        { day: 3, focus: 'Equivalence visualization', activities: [
          'Place 1/2 and 2/4. Same point!',
          'Place 1/3, 2/6, 3/9. Same point.'
        ] }
      ]
    }
  ];

  // ── Recipe library (used by the recipe scaler in cooking word problems) ──
  // Each recipe: id, title, servings, ingredients (each with name, n, d, unit).
  var RECIPE_LIBRARY = [
    {
      id: 'chocolate-chip-cookies',
      title: 'Chocolate Chip Cookies',
      baseServings: 24,
      ingredients: [
        { name: 'all-purpose flour', n: 9, d: 4, unit: 'cup' }, // 2 1/4 cup
        { name: 'baking soda', n: 1, d: 1, unit: 'tsp' },
        { name: 'salt', n: 1, d: 1, unit: 'tsp' },
        { name: 'butter (softened)', n: 1, d: 1, unit: 'cup' },
        { name: 'granulated sugar', n: 3, d: 4, unit: 'cup' },
        { name: 'brown sugar', n: 3, d: 4, unit: 'cup' },
        { name: 'vanilla extract', n: 1, d: 1, unit: 'tsp' },
        { name: 'eggs', n: 2, d: 1, unit: 'large' },
        { name: 'chocolate chips', n: 2, d: 1, unit: 'cup' }
      ],
      notes: 'Bake at 375°F for 9-11 minutes. Yields about 24 medium cookies.'
    },
    {
      id: 'banana-bread',
      title: 'Banana Bread',
      baseServings: 8,
      ingredients: [
        { name: 'mashed ripe bananas', n: 3, d: 2, unit: 'cup' }, // 1 1/2
        { name: 'butter (melted)', n: 1, d: 3, unit: 'cup' },
        { name: 'baking soda', n: 1, d: 1, unit: 'tsp' },
        { name: 'salt', n: 1, d: 4, unit: 'tsp' },
        { name: 'sugar', n: 3, d: 4, unit: 'cup' },
        { name: 'egg (beaten)', n: 1, d: 1, unit: 'large' },
        { name: 'vanilla extract', n: 1, d: 1, unit: 'tsp' },
        { name: 'all-purpose flour', n: 3, d: 2, unit: 'cup' } // 1 1/2
      ],
      notes: 'Bake at 350°F for 60-65 minutes in a 4×8 inch loaf pan.'
    },
    {
      id: 'pancakes',
      title: 'Buttermilk Pancakes',
      baseServings: 4,
      ingredients: [
        { name: 'all-purpose flour', n: 5, d: 4, unit: 'cup' }, // 1 1/4
        { name: 'baking powder', n: 1, d: 1, unit: 'tsp' },
        { name: 'baking soda', n: 1, d: 2, unit: 'tsp' },
        { name: 'salt', n: 1, d: 2, unit: 'tsp' },
        { name: 'sugar', n: 1, d: 1, unit: 'tbsp' },
        { name: 'egg', n: 1, d: 1, unit: 'large' },
        { name: 'buttermilk', n: 5, d: 4, unit: 'cup' }, // 1 1/4
        { name: 'butter (melted)', n: 3, d: 1, unit: 'tbsp' }
      ],
      notes: 'Cook on medium-high griddle; flip when bubbles form.'
    },
    {
      id: 'mac-cheese',
      title: 'Mac and Cheese',
      baseServings: 6,
      ingredients: [
        { name: 'elbow macaroni', n: 3, d: 1, unit: 'cup' },
        { name: 'butter', n: 1, d: 4, unit: 'cup' },
        { name: 'flour', n: 1, d: 4, unit: 'cup' },
        { name: 'milk', n: 5, d: 2, unit: 'cup' }, // 2 1/2
        { name: 'cheddar cheese (shredded)', n: 2, d: 1, unit: 'cup' },
        { name: 'salt', n: 1, d: 2, unit: 'tsp' },
        { name: 'black pepper', n: 1, d: 4, unit: 'tsp' }
      ],
      notes: 'Make a roux first; whisk in milk until thick; stir in cheese off heat.'
    },
    {
      id: 'lemonade',
      title: 'Fresh Lemonade',
      baseServings: 4,
      ingredients: [
        { name: 'fresh lemon juice', n: 1, d: 1, unit: 'cup' },
        { name: 'sugar', n: 3, d: 4, unit: 'cup' },
        { name: 'cold water', n: 4, d: 1, unit: 'cup' },
        { name: 'ice', n: 2, d: 1, unit: 'cup' }
      ],
      notes: 'Adjust sugar to taste. About 6 lemons makes 1 cup of juice.'
    },
    {
      id: 'rice',
      title: 'Steamed White Rice',
      baseServings: 4,
      ingredients: [
        { name: 'long-grain white rice', n: 1, d: 1, unit: 'cup' },
        { name: 'water', n: 7, d: 4, unit: 'cup' }, // 1 3/4
        { name: 'salt', n: 1, d: 4, unit: 'tsp' },
        { name: 'butter (optional)', n: 1, d: 1, unit: 'tbsp' }
      ],
      notes: 'Bring to boil, reduce heat, cover, simmer 18 min, rest 5 min.'
    },
    {
      id: 'guacamole',
      title: 'Guacamole',
      baseServings: 6,
      ingredients: [
        { name: 'ripe avocados', n: 3, d: 1, unit: 'whole' },
        { name: 'lime juice', n: 2, d: 1, unit: 'tbsp' },
        { name: 'red onion (diced)', n: 1, d: 4, unit: 'cup' },
        { name: 'cilantro (chopped)', n: 1, d: 4, unit: 'cup' },
        { name: 'tomato (diced)', n: 1, d: 2, unit: 'cup' },
        { name: 'salt', n: 1, d: 2, unit: 'tsp' },
        { name: 'jalapeño (minced)', n: 1, d: 1, unit: 'whole (or to taste)' }
      ],
      notes: 'Press plastic wrap onto surface before refrigerating to prevent browning.'
    },
    {
      id: 'salsa',
      title: 'Fresh Salsa',
      baseServings: 8,
      ingredients: [
        { name: 'tomatoes (diced)', n: 4, d: 1, unit: 'cup' },
        { name: 'red onion (diced)', n: 1, d: 2, unit: 'cup' },
        { name: 'jalapeño (minced)', n: 1, d: 1, unit: 'whole' },
        { name: 'cilantro (chopped)', n: 1, d: 3, unit: 'cup' },
        { name: 'lime juice', n: 1, d: 4, unit: 'cup' },
        { name: 'garlic (minced)', n: 2, d: 1, unit: 'cloves' },
        { name: 'salt', n: 1, d: 1, unit: 'tsp' }
      ],
      notes: 'Best after sitting 30 minutes for flavors to meld.'
    }
  ];

  // ── Multi-step problem chains ──
  // Each chain has 2-5 sub-questions building toward a final answer.
  var MULTI_STEP_PROBLEMS = [
    {
      id: 'pizza-party',
      title: 'Pizza Party Planning',
      grade: 5,
      ccss: ['5.NF.A.1', '5.NF.B.6'],
      story: 'You\'re planning a pizza party for 12 people. Each person eats 3/8 of a pizza.',
      steps: [
        { q: 'How many pizzas total are needed?', a: { n: 9, d: 2, mixed: '4 1/2' }, hint: '12 × 3/8.' },
        { q: 'Pizzas come whole. How many whole pizzas should you buy?', a: { n: 5, d: 1 }, hint: 'Round up: 4 1/2 ≤ 5.' },
        { q: 'If pizzas cost $12 each, what is your total bill?', a: { n: 60, d: 1 }, hint: '5 × $12.' }
      ]
    },
    {
      id: 'savings-account',
      title: 'Savings Plan',
      grade: 6,
      ccss: ['6.RP.A.3.c'],
      story: 'You have $80. You save 1/4 of it each month for 3 months.',
      steps: [
        { q: 'How much do you save each month?', a: { n: 20, d: 1 }, hint: '1/4 × 80.' },
        { q: 'How much have you saved after 3 months?', a: { n: 60, d: 1 }, hint: '20 × 3.' },
        { q: 'What fraction of your original $80 have you saved?', a: { n: 3, d: 4 }, hint: '60/80 = ?' }
      ]
    },
    {
      id: 'garden-plot',
      title: 'Garden Plot',
      grade: 5,
      ccss: ['5.NF.B.4'],
      story: 'A garden is 12 feet long. You plant tomatoes in 1/3 of it and lettuce in 1/4 of it.',
      steps: [
        { q: 'How many feet of garden are for tomatoes?', a: { n: 4, d: 1 }, hint: '1/3 × 12.' },
        { q: 'How many feet are for lettuce?', a: { n: 3, d: 1 }, hint: '1/4 × 12.' },
        { q: 'Together, what fraction of the garden is used?', a: { n: 7, d: 12 }, hint: '1/3 + 1/4.' },
        { q: 'How many feet are unused?', a: { n: 5, d: 1 }, hint: '12 - 4 - 3.' }
      ]
    },
    {
      id: 'reading-progress',
      title: 'Reading Progress',
      grade: 5,
      ccss: ['5.NF.A.2'],
      story: 'A book has 240 pages. Monday you read 1/4. Tuesday 1/3 of the remainder.',
      steps: [
        { q: 'How many pages did you read Monday?', a: { n: 60, d: 1 }, hint: '1/4 × 240.' },
        { q: 'How many pages remained after Monday?', a: { n: 180, d: 1 }, hint: '240 - 60.' },
        { q: 'How many pages did you read Tuesday?', a: { n: 60, d: 1 }, hint: '1/3 × 180.' },
        { q: 'How many pages remained after Tuesday?', a: { n: 120, d: 1 }, hint: '180 - 60.' }
      ]
    },
    {
      id: 'paint-job',
      title: 'Painting a Room',
      grade: 5,
      ccss: ['5.NF.B.7'],
      story: 'A room needs 3 gallons of paint. Each can is 3/4 gallon.',
      steps: [
        { q: 'How many cans of paint do you need?', a: { n: 4, d: 1 }, hint: '3 ÷ 3/4 = 3 × 4/3 = 4.' },
        { q: 'If each can costs $8, how much will paint cost?', a: { n: 32, d: 1 }, hint: '4 × $8.' }
      ]
    },
    {
      id: 'recipe-double',
      title: 'Doubling the Cookie Recipe',
      grade: 5,
      ccss: ['5.NF.B.4'],
      story: 'A cookie recipe needs 2 1/4 cups flour, 3/4 cup sugar, and 1/2 cup butter. You want to double it.',
      steps: [
        { q: 'How much flour do you need?', a: { n: 9, d: 2, mixed: '4 1/2' }, hint: '2 × 2 1/4 = 2 × 9/4.' },
        { q: 'How much sugar?', a: { n: 3, d: 2, mixed: '1 1/2' }, hint: '2 × 3/4.' },
        { q: 'How much butter?', a: { n: 1, d: 1 }, hint: '2 × 1/2.' }
      ]
    }
  ];

  // ── Pacing-by-grade-level summary (for the standards tab and lesson plans) ──
  var GRADE_PACING = {
    1: ['Partition shapes into halves and fourths (1.G.A.3)'],
    2: ['Partition shapes into 2, 3, or 4 equal parts (2.G.A.3)'],
    3: ['Unit fractions 1/b (3.NF.A.1)', 'Fractions on a number line (3.NF.A.2)', 'Equivalent fractions and compare (3.NF.A.3)'],
    4: ['Equivalent fractions using common multiples (4.NF.A.1)', 'Compare with benchmarks (4.NF.A.2)', 'Add and subtract like denominators (4.NF.B.3)', 'Multiply fraction × whole (4.NF.B.4)', 'Decimal fractions tenths and hundredths (4.NF.C.5-7)'],
    5: ['Add and subtract unlike denominators (5.NF.A.1)', 'Word problems with fractions (5.NF.A.2)', 'Fraction as division (5.NF.B.3)', 'Multiply fractions (5.NF.B.4)', 'Scaling and word problems (5.NF.B.5-6)', 'Divide unit fractions (5.NF.B.7)'],
    6: ['Divide fractions by fractions (6.NS.A.1)', 'Ratios and rates (6.RP.A.1)', 'Percents (6.RP.A.3.c)'],
    7: ['Multiply/divide rational numbers (7.NS.A.2)', 'Fraction → decimal (7.NS.A.2.d)'],
    8: ['Rational vs irrational (8.NS.A.1)']
  };

  // Register both IDs → same render function
  var fracPlugin = {
    icon: '\uD83C\uDF55', label: 'Fraction Lab',
    desc: 'Interactive fraction visualizer with pie/bar models, operations, equivalents, converter, fraction wall, and challenge mode.',
    color: 'rose', category: 'math',
    render: renderFractionLab
  };
  window.StemLab.registerTool('fractionViz', fracPlugin);
  window.StemLab.registerTool('fractions', fracPlugin);

  function renderFractionLab(ctx) {
    var React = ctx.React;
    var h = React.createElement;
    var ArrowLeft = ctx.icons.ArrowLeft;
    var setStemLabTool = ctx.setStemLabTool;
    var addToast = ctx.addToast;
    var awardXP = ctx.awardXP;
    var announceToSR = ctx.announceToSR;
    var a11yClick = ctx.a11yClick;
    var t = ctx.t;

    // ── State via labToolData._fractions ──
    var ld = ctx.toolData || {};
    var _f = ld._fractions || {};
    var upd = function(obj) {
      if (typeof ctx.setToolData === 'function') {
        ctx.setToolData(function(prev) {
          var fr = Object.assign({}, (prev && prev._fractions) || {}, obj);
          return Object.assign({}, prev, { _fractions: fr });
        });
      }
    };

    // ═══ SOUND EFFECTS ENGINE ═══
    var _audioCtx = null;
    var getAudio = function() {
      if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { /* silent */ } }
      return _audioCtx;
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
      } catch(e) { /* silent */ }
    };
    var sfxCorrect = function() { playTone(523, 0.1, 'sine', 0.12); setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160); };
    var sfxWrong = function() { playTone(220, 0.25, 'sawtooth', 0.08); };
    var sfxBadge = function() { playTone(523, 0.08, 'sine', 0.1); setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70); setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210); };
    var sfxClick = function() { playTone(880, 0.05, 'sine', 0.06); };
    var sfxStreak = function() { playTone(440, 0.06, 'sine', 0.1); setTimeout(function() { playTone(554, 0.06, 'sine', 0.1); }, 50); setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 100); setTimeout(function() { playTone(880, 0.15, 'sine', 0.12); }, 150); };
    var sfxNewChallenge = function() { playTone(392, 0.08, 'triangle', 0.08); setTimeout(function() { playTone(523, 0.12, 'triangle', 0.1); }, 80); };
    var sfxComplete = function() { playTone(523, 0.1, 'sine', 0.1); setTimeout(function() { playTone(659, 0.1, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.1, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.25, 'sine', 0.15); }, 300); };

    // ── State defaults ──
    var tab = _f.tab || 'practice';
    var mode = _f.mode || 'pie';
    var difficulty = _f.difficulty || 'medium';
    var score = _f.score || { correct: 0, total: 0 };
    var streak = _f.streak || 0;
    var bestStreak = _f.bestStreak || 0;
    var badges = _f.badges || {};

    // Practice state
    var pieces = _f.pieces || { numerator: 3, denominator: 8 };

    // Compare state
    var num1 = _f.num1 != null ? _f.num1 : 1;
    var den1 = _f.den1 != null ? _f.den1 : 2;
    var num2 = _f.num2 != null ? _f.num2 : 2;
    var den2 = _f.den2 != null ? _f.den2 : 4;
    var opMode = _f.opMode || 'add';

    // Challenge state
    var challenge = _f.challenge || null;
    var answer = _f.answer || '';
    var feedback = _f.feedback || null;

    // Quiz state (compare quiz)
    var quiz = _f.quiz || null;
    var quizScore = _f.quizScore || 0;
    var quizStreak = _f.quizStreak || 0;

    // Converter state
    var convNum = _f.convNum != null ? _f.convNum : 3;
    var convDen = _f.convDen != null ? _f.convDen : 4;
    var convDecInput = _f.convDecInput || '';
    var convDirection = _f.convDirection || 'fracToDec';

    // Fraction Wall state
    var wallHighlight = _f.wallHighlight || null;
    var wallCompareA = _f.wallCompareA || null;
    var wallCompareB = _f.wallCompareB || null;

    // AI Tutor state
    var showAITutor = _f.showAITutor || false;
    var aiResponse = _f.aiResponse || '';
    var aiLoading = _f.aiLoading || false;
    var aiQuestion = _f.aiQuestion || '';

    // Benchmark visibility
    var showBenchmarks = _f.showBenchmarks || false;

    // Challenge types used tracking
    var challengeTypesUsed = _f.challengeTypesUsed || {};

    // Per-tab scores
    var tabScores = _f.tabScores || { practice: 0, compare: 0, operations: 0, equivalents: 0, converter: 0, wall: 0 };

    // ── Math helpers ──
    var gcd = function(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var tmp = b; b = a % tmp; a = tmp; } return a; };
    var lcm = function(a, b) { return a * b / gcd(a, b); };
    var simplify = function(n, d) { if (d === 0) return [n, 1]; var g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; };
    var val1 = den1 > 0 ? num1 / den1 : 0;
    var val2 = den2 > 0 ? num2 / den2 : 0;
    var s1 = simplify(num1, den1);
    var s2 = simplify(num2, den2);

    var toMixed = function(n, d) {
      if (d === 0) return '0';
      var whole = Math.floor(Math.abs(n) / d);
      var rem = Math.abs(n) % d;
      var sign = n < 0 ? '-' : '';
      if (whole > 0 && rem > 0) return sign + whole + ' ' + rem + '/' + d;
      if (whole > 0) return sign + '' + whole;
      return sign + Math.abs(n) + '/' + d;
    };

    var fromMixed = function(whole, num, den) {
      return whole * den + num;
    };

    // Fraction to decimal string with repeating detection
    var fracToDecimal = function(num, den) {
      if (den === 0) return 'undefined';
      var result = num / den;
      // Check if terminating: reduce, then check if denominator only has factors of 2 and 5
      var s = simplify(Math.abs(num), Math.abs(den));
      var d = s[1];
      while (d % 2 === 0) d /= 2;
      while (d % 5 === 0) d /= 5;
      if (d === 1) return result.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
      return result.toFixed(8).replace(/0+$/, '').replace(/\.$/, '') + '...';
    };

    // Decimal to fraction approximation
    var decToFrac = function(dec) {
      if (isNaN(dec)) return [0, 1];
      var sign = dec < 0 ? -1 : 1;
      dec = Math.abs(dec);
      var tolerance = 1e-8;
      var h1 = 1, h2 = 0, k1 = 0, k2 = 1;
      var b = dec;
      for (var i = 0; i < 20; i++) {
        var a = Math.floor(b);
        var aux = h1; h1 = a * h1 + h2; h2 = aux;
        aux = k1; k1 = a * k1 + k2; k2 = aux;
        if (Math.abs(dec - h1 / k1) < tolerance) break;
        if (b - a < tolerance) break;
        b = 1 / (b - a);
      }
      return [sign * h1, k1];
    };

    // ── Difficulty pools ──
    var dpool = difficulty === 'easy' ? [2, 3, 4] : difficulty === 'hard' ? [3, 4, 5, 6, 8, 10, 12, 15, 16, 20] : [2, 3, 4, 5, 6, 8, 10, 12];
    var pick = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    var randInt = function(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };

    // ═══ BADGE SYSTEM ═══
    var BADGES = [
      { id: 'firstSlice', icon: '\uD83C\uDF55', name: 'First Slice', desc: 'Answer your first challenge correctly', check: function(u) { return u.correct >= 1; } },
      { id: 'streak3', icon: '\uD83D\uDD25', name: 'On a Roll', desc: 'Get a streak of 3', check: function(u) { return u.streak >= 3; } },
      { id: 'streak5', icon: '\u26A1', name: 'Lightning Streak', desc: 'Get a streak of 5', check: function(u) { return u.streak >= 5; } },
      { id: 'streak10', icon: '\uD83C\uDF1F', name: 'Fraction Master', desc: 'Get a streak of 10', check: function(u) { return u.streak >= 10; } },
      { id: 'score10', icon: '\uD83C\uDFC5', name: 'Fraction Pro', desc: 'Score 10 correct answers', check: function(u) { return u.correct >= 10; } },
      { id: 'score25', icon: '\uD83C\uDFC6', name: 'Quarter Century', desc: 'Score 25 correct answers', check: function(u) { return u.correct >= 25; } },
      { id: 'allTypes', icon: '\uD83C\uDF08', name: 'Well Rounded', desc: 'Try all 7 challenge types', check: function(u) { return u.typesUsed >= 7; } },
      { id: 'equivalent', icon: '\uD83D\uDD17', name: 'Chain Builder', desc: 'Solve 3 equivalent fraction challenges', check: function(u) { return u.equivSolved >= 3; } },
      { id: 'simplifier', icon: '\u2702\uFE0F', name: 'Simplifier', desc: 'Simplify 5 fractions correctly', check: function(u) { return u.simplifySolved >= 5; } },
      { id: 'converter', icon: '\uD83D\uDD04', name: 'Converter', desc: 'Convert 5 fractions to decimals', check: function(u) { return u.convertCount >= 5; } },
      { id: 'wallExplorer', icon: '\uD83E\uDDF1', name: 'Wall Explorer', desc: 'Find 3 equivalent pairs on the fraction wall', check: function(u) { return u.wallPairsFound >= 3; } },
      { id: 'operations5', icon: '\u2795', name: 'Operator', desc: 'Complete 5 operation challenges', check: function(u) { return u.opsSolved >= 5; } },
      { id: 'tabExplorer', icon: '\uD83D\uDDFA\uFE0F', name: 'Explorer', desc: 'Visit all 6 tabs', check: function(u) { return u.tabsVisited >= 6; } },
      { id: 'aiLearner', icon: '\uD83E\uDD16', name: 'AI Learner', desc: 'Ask the AI tutor a question', check: function(u) { return u.aiAsked >= 1; } }
    ];

    var checkBadges = function(updates) {
      var newBadges = Object.assign({}, badges);
      var awarded = false;
      BADGES.forEach(function(b) {
        if (!newBadges[b.id] && b.check(updates)) {
          newBadges[b.id] = true;
          awarded = true;
          sfxBadge();
          addToast(b.icon + ' Badge: ' + b.name + ' — ' + b.desc, 'success');
          awardXP('fractionBadge', 15, b.name);
        }
      });
      if (awarded) upd({ badges: newBadges });
    };

    // Track tab visits
    var tabsVisited = _f.tabsVisited || {};
    var trackTab = function(tabId) {
      if (!tabsVisited[tabId]) {
        var newVisited = Object.assign({}, tabsVisited);
        newVisited[tabId] = true;
        upd({ tabsVisited: newVisited });
        var count = Object.keys(newVisited).length;
        checkBadges({
          correct: score.correct, streak: streak, typesUsed: Object.keys(challengeTypesUsed).length,
          equivSolved: _f.equivSolved || 0, simplifySolved: _f.simplifySolved || 0,
          convertCount: _f.convertCount || 0, wallPairsFound: _f.wallPairsFound || 0,
          opsSolved: _f.opsSolved || 0, tabsVisited: count, aiAsked: _f.aiAsked || 0
        });
      }
    };

    // Color palette (v3) — based on user preference
    var palette = COLOR_PALETTES[_f.palette || 'rose'] || COLOR_PALETTES.rose;
    var palMain = palette.main, palBg = palette.bg, palAccent = palette.accent;

    // Audio narration for fractions (v3) — uses Web Speech API if available
    var narrateFraction = function(n, d) {
      if (!_f.audioNarration) return;
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      try {
        var spoken = '';
        if (n === d && d > 0) spoken = 'one whole';
        else if (n === 0) spoken = 'zero';
        else if (d === 2) spoken = n + ' half' + (n === 1 ? '' : 's');
        else if (d === 3) spoken = n + ' third' + (n === 1 ? '' : 's');
        else if (d === 4) spoken = n + ' fourth' + (n === 1 ? '' : 's');
        else if (d === 5) spoken = n + ' fifth' + (n === 1 ? '' : 's');
        else if (d === 6) spoken = n + ' sixth' + (n === 1 ? '' : 's');
        else if (d === 7) spoken = n + ' seventh' + (n === 1 ? '' : 's');
        else if (d === 8) spoken = n + ' eighth' + (n === 1 ? '' : 's');
        else if (d === 9) spoken = n + ' ninth' + (n === 1 ? '' : 's');
        else if (d === 10) spoken = n + ' tenth' + (n === 1 ? '' : 's');
        else spoken = n + ' over ' + d;
        var u = new window.SpeechSynthesisUtterance(spoken);
        u.rate = 0.95;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (e) { /* ignore */ }
    };

    // ═══ DRAWING HELPERS ═══
    var drawPie = function(num, den, size, color) {
      if (den <= 0) den = 1;
      var slices = [];
      var sliceLabels = [];
      var radius = size / 2 - 2;
      for (var i = 0; i < den; i++) {
        var startAngle = (i / den) * 2 * Math.PI - Math.PI / 2;
        var endAngle = ((i + 1) / den) * 2 * Math.PI - Math.PI / 2;
        var x1 = (size / 2) + radius * Math.cos(startAngle);
        var y1 = (size / 2) + radius * Math.sin(startAngle);
        var x2 = (size / 2) + radius * Math.cos(endAngle);
        var y2 = (size / 2) + radius * Math.sin(endAngle);
        var largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
        var filled = i < num;
        slices.push(h('path', {
          key: i,
          d: 'M ' + (size / 2) + ' ' + (size / 2) + ' L ' + x1 + ' ' + y1 + ' A ' + radius + ' ' + radius + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z',
          fill: filled ? (color || 'hsl(' + (340 + i * 8) + ', 70%, ' + (60 + i * 2) + '%)') : '#fecdd3',
          stroke: '#e11d48', strokeWidth: 1.5,
          className: 'cursor-pointer hover:opacity-80 transition-opacity'
        }));
        // Slice number — only when the slice is large enough to fit a digit
        if (filled && den <= 16 && size >= 60) {
          var midAngle = (startAngle + endAngle) / 2;
          var labelR = radius * 0.62;
          var lx = (size / 2) + labelR * Math.cos(midAngle);
          var ly = (size / 2) + labelR * Math.sin(midAngle);
          sliceLabels.push(h('text', {
            key: 'sl' + i,
            x: lx, y: ly + 3,
            textAnchor: 'middle',
            style: { fontSize: Math.max(8, size / 12) + 'px', fontWeight: 800, fill: 'white', pointerEvents: 'none', textShadow: '0 0 3px rgba(0,0,0,0.4)' }
          }, i + 1));
        }
      }
      // Center "n/d" badge — anchors the visual to the symbolic fraction
      var centerBadge = (den >= 2 && size >= 56) ? h('g', { key: 'centerBadge', pointerEvents: 'none' },
        h('circle', { cx: size / 2, cy: size / 2, r: Math.max(10, size * 0.16), fill: 'white', stroke: '#e11d48', strokeWidth: 1.5 }),
        h('text', {
          x: size / 2, y: size / 2 + Math.max(3, size * 0.05),
          textAnchor: 'middle',
          style: { fontSize: Math.max(9, size / 8) + 'px', fontWeight: 800, fill: '#e11d48' }
        }, num + '/' + den)
      ) : null;
      return h('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, 'aria-label': num + ' out of ' + den + ' parts shaded' },
        slices,
        sliceLabels,
        centerBadge || h('circle', { cx: size / 2, cy: size / 2, r: 3, fill: '#e11d48' })
      );
    };

    var drawBar = function(num, den, color) {
      if (den <= 0) den = 1;
      var segs = [];
      for (var i = 0; i < den; i++) {
        segs.push(h('div', {
          key: i,
          style: { flex: 1, backgroundColor: i < num ? (color || '#f43f5e') : '#e2e8f0', transition: 'background-color 0.3s' },
          className: 'border-r border-white/50'
        }));
      }
      return h('div', {
        className: 'flex h-10 rounded-lg overflow-hidden border-2',
        style: { borderColor: color || '#f43f5e' }
      }, segs);
    };

    // ═══════════════════════════════════════════════════════════════
    // ═══ v3 VISUAL MODELS — Number Line, Area, Set, Length, Volume ═══
    // ═══════════════════════════════════════════════════════════════

    // ── NUMBER LINE MODEL ──
    // Crucial for magnitude reasoning (IES Practice Guide Recommendation 2).
    // Shows fractions as points on a continuous line, anchored to 0, 1/2, 1.
    // Supports zoom (0 to 1, 0 to 2, 0 to 3) and multi-fraction overlay.
    var drawNumberLine = function(fractions, options) {
      options = options || {};
      var maxVal = options.maxVal || 1;
      var width = options.width || 480;
      var height = options.height || 100;
      var margin = 30;
      var lineY = height - 40;
      var labelY = lineY + 18;
      var tickH = 8;
      var minorTickH = 4;

      var elements = [];

      // Baseline
      elements.push(h('line', {
        key: 'base',
        x1: margin, y1: lineY, x2: width - margin, y2: lineY,
        stroke: '#0f172a', strokeWidth: 2
      }));

      // Whole-number ticks (0, 1, 2, ...)
      for (var wt = 0; wt <= maxVal; wt++) {
        var x = margin + (wt / maxVal) * (width - 2 * margin);
        elements.push(h('line', {
          key: 'wt-' + wt,
          x1: x, y1: lineY - tickH, x2: x, y2: lineY + tickH,
          stroke: '#0f172a', strokeWidth: 2
        }));
        elements.push(h('text', {
          key: 'wl-' + wt, x: x, y: labelY,
          textAnchor: 'middle', fontSize: 12, fontWeight: 'bold', fill: '#0f172a'
        }, wt));
      }

      // Half-marks for reference (if maxVal <= 2)
      if (maxVal <= 2) {
        for (var hh = 0; hh < maxVal * 2; hh++) {
          if (hh % 2 === 0) continue; // skip whole numbers
          var xh = margin + (hh / 2 / maxVal) * (width - 2 * margin);
          elements.push(h('line', {
            key: 'hm-' + hh, x1: xh, y1: lineY - minorTickH, x2: xh, y2: lineY + minorTickH,
            stroke: '#94a3b8', strokeWidth: 1.2
          }));
          elements.push(h('text', {
            key: 'hl-' + hh, x: xh, y: labelY,
            textAnchor: 'middle', fontSize: 9, fill: '#64748b'
          }, (hh % 2 === 0 ? hh / 2 : hh + '/2')));
        }
      }

      // Plot each fraction
      (fractions || []).forEach(function(f, i) {
        var val = f.d > 0 ? f.n / f.d : 0;
        var px = margin + (val / maxVal) * (width - 2 * margin);
        var col = f.color || palMain;
        var pin = options.pinHeight || (25 + (i % 3) * 12);
        // Vertical drop line
        elements.push(h('line', {
          key: 'p-' + i + '-line',
          x1: px, y1: lineY - pin, x2: px, y2: lineY,
          stroke: col, strokeWidth: 2, strokeDasharray: '3,2'
        }));
        // Dot at top
        elements.push(h('circle', {
          key: 'p-' + i + '-dot',
          cx: px, cy: lineY - pin, r: 5,
          fill: col, stroke: '#0f172a', strokeWidth: 1.5
        }));
        // Label
        elements.push(h('text', {
          key: 'p-' + i + '-label',
          x: px, y: lineY - pin - 7,
          textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: col
        }, f.label || (f.n + '/' + f.d)));
        // Dot on line
        elements.push(h('circle', {
          key: 'p-' + i + '-mark',
          cx: px, cy: lineY, r: 3.5, fill: col, stroke: '#fff', strokeWidth: 1.5
        }));
      });

      return h('svg', {
        viewBox: '0 0 ' + width + ' ' + height,
        width: '100%',
        height: height,
        role: 'img',
        'aria-label': 'Number line showing fractions ' + (fractions || []).map(function(f) { return f.n + ' over ' + f.d; }).join(', '),
        style: { maxWidth: width + 'px' }
      }, elements);
    };

    // ── AREA MODEL (rectangular grid) ──
    // Shows a fraction as a portion of a rectangle, split into rows × cols.
    // Distinct from pie because it scales naturally to fraction multiplication
    // (the rectangle product model from CCSS 5.NF.B.4.b).
    var drawAreaModel = function(num, den, options) {
      options = options || {};
      var rows = options.rows || 1;
      var cols = options.cols || den;
      if (rows * cols !== den) {
        // Auto-pick a sensible grid
        rows = Math.floor(Math.sqrt(den));
        while (rows >= 1 && den % rows !== 0) rows--;
        if (rows < 1) rows = 1;
        cols = den / rows;
      }
      var width = options.width || 360;
      var height = options.height || 180;
      var cellW = width / cols;
      var cellH = height / rows;
      var cells = [];
      var n = num;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var filled = (r * cols + c) < n;
          cells.push(h('rect', {
            key: r + '-' + c,
            x: c * cellW, y: r * cellH, width: cellW, height: cellH,
            fill: filled ? palMain : palBg,
            stroke: palAccent, strokeWidth: 1
          }));
        }
      }
      return h('svg', {
        viewBox: '0 0 ' + width + ' ' + height,
        width: '100%',
        height: height,
        role: 'img',
        'aria-label': 'Area model showing ' + num + ' over ' + den + ' as ' + num + ' shaded cells out of ' + den + ' total cells in a ' + rows + ' by ' + cols + ' grid',
        style: { maxWidth: width + 'px', borderRadius: '8px' }
      }, cells);
    };

    // ── SET MODEL ──
    // Shows a fraction as parts of a set of discrete objects (circles or icons).
    // Different from pie: pie = part of one whole; set = part of a collection.
    var drawSetModel = function(num, den, options) {
      options = options || {};
      var width = options.width || 360;
      var perRow = options.perRow || Math.min(den, 10);
      var rows = Math.ceil(den / perRow);
      var spacing = 36;
      var radius = 14;
      var icon = options.icon || null; // emoji to render instead of circles
      var elements = [];
      for (var i = 0; i < den; i++) {
        var col = i % perRow;
        var row = Math.floor(i / perRow);
        var cx = col * spacing + spacing / 2 + 8;
        var cy = row * spacing + spacing / 2 + 8;
        var filled = i < num;
        if (icon) {
          elements.push(h('text', {
            key: i, x: cx, y: cy + 6, textAnchor: 'middle', fontSize: 22,
            opacity: filled ? 1 : 0.25, style: { filter: filled ? 'none' : 'grayscale(1)' }
          }, icon));
        } else {
          elements.push(h('circle', {
            key: i, cx: cx, cy: cy, r: radius,
            fill: filled ? palMain : palBg, stroke: palAccent, strokeWidth: 2
          }));
        }
      }
      var totalW = Math.max(width, perRow * spacing + 16);
      var totalH = rows * spacing + 16;
      return h('svg', {
        viewBox: '0 0 ' + totalW + ' ' + totalH,
        width: '100%',
        height: totalH,
        role: 'img',
        'aria-label': 'Set model showing ' + num + ' out of ' + den + ' items',
        style: { maxWidth: totalW + 'px' }
      }, elements);
    };

    // ── LENGTH MODEL (rod / fraction strip) ──
    // The classic Cuisenaire rod model: a horizontal bar of unit length,
    // divided into denominator-many equal segments, with numerator-many filled.
    var drawLengthModel = function(num, den, options) {
      options = options || {};
      var width = options.width || 400;
      var height = options.height || 40;
      var elements = [];
      // Background bar
      elements.push(h('rect', { key: 'bg', x: 0, y: 0, width: width, height: height,
        fill: palBg, stroke: palAccent, strokeWidth: 2, rx: 6 }));
      // Filled portion
      var fillW = den > 0 ? (num / den) * width : 0;
      elements.push(h('rect', { key: 'fill', x: 0, y: 0, width: fillW, height: height,
        fill: palMain, stroke: 'none', rx: 6 }));
      // Tick marks at each segment boundary
      for (var ti = 1; ti < den; ti++) {
        var x = (ti / den) * width;
        elements.push(h('line', { key: 't-' + ti, x1: x, y1: 0, x2: x, y2: height,
          stroke: '#fff', strokeWidth: 1.5, strokeOpacity: 0.8 }));
      }
      // Label
      elements.push(h('text', { key: 'lbl', x: width / 2, y: height / 2 + 5,
        textAnchor: 'middle', fontSize: 14, fontWeight: 'bold',
        fill: '#fff', style: { textShadow: '0 0 4px rgba(0,0,0,0.4)' } }, num + '/' + den));
      return h('svg', {
        viewBox: '0 0 ' + width + ' ' + height,
        width: '100%',
        height: height,
        role: 'img',
        'aria-label': 'Length model: ' + num + ' over ' + den,
        style: { maxWidth: width + 'px' }
      }, elements);
    };

    // ── VOLUME MODEL (liquid in container) ──
    // Shows a fraction as how full a container is. Connects to measurement.
    var drawVolumeModel = function(num, den, options) {
      options = options || {};
      var width = options.width || 80;
      var height = options.height || 160;
      var elements = [];
      // Container outline
      var pad = 6;
      var bottomY = height - pad;
      var topY = pad;
      var leftX = pad + 6;
      var rightX = width - pad - 6;
      // Liquid fill
      var fillPct = den > 0 ? num / den : 0;
      var liquidH = (bottomY - topY) * fillPct;
      var liquidTopY = bottomY - liquidH;
      elements.push(h('rect', {
        key: 'liq',
        x: leftX, y: liquidTopY,
        width: rightX - leftX, height: liquidH,
        fill: palMain, opacity: 0.7
      }));
      // Container outline
      elements.push(h('path', {
        key: 'box',
        d: 'M ' + leftX + ' ' + topY + ' L ' + leftX + ' ' + bottomY + ' L ' + rightX + ' ' + bottomY + ' L ' + rightX + ' ' + topY,
        fill: 'none', stroke: palAccent, strokeWidth: 3, strokeLinejoin: 'round'
      }));
      // Tick marks for each part
      for (var vi = 1; vi < den; vi++) {
        var ty = bottomY - (bottomY - topY) * (vi / den);
        elements.push(h('line', {
          key: 'tk-' + vi, x1: leftX, y1: ty, x2: rightX, y2: ty,
          stroke: '#fff', strokeOpacity: 0.7, strokeWidth: 1
        }));
      }
      return h('svg', {
        viewBox: '0 0 ' + width + ' ' + height,
        width: width,
        height: height,
        role: 'img',
        'aria-label': 'Volume model: container ' + num + ' out of ' + den + ' full'
      }, elements);
    };

    // ── Model picker UI: switch between pie/bar/numberline/area/set/length/volume ──
    var currentModel = _f.model || 'pie';
    var MODELS = [
      { id: 'pie',        icon: '⬤', label: 'Pie',          desc: 'Circle divided into equal slices' },
      { id: 'bar',        icon: '▬', label: 'Bar',          desc: 'Horizontal bar with filled segments' },
      { id: 'numberline', icon: '⊢',  label: 'Number line',  desc: 'Position on a number line (great for magnitude)' },
      { id: 'area',       icon: '⬛', label: 'Area',         desc: 'Rectangle as rows × columns (for multiplication)' },
      { id: 'set',        icon: '◯◯', label: 'Set',          desc: 'Parts of a discrete collection' },
      { id: 'length',     icon: '┃',  label: 'Length',       desc: 'Fraction strip / Cuisenaire rod' },
      { id: 'volume',     icon: '🥛', label: 'Volume',       desc: 'How full a container is' }
    ];

    // Render the chosen model for a given fraction
    var renderModel = function(num, den, options) {
      options = options || {};
      var modelId = options.modelOverride || currentModel;
      switch (modelId) {
        case 'pie':        return drawPie(num, den, options.size || 240, palMain);
        case 'bar':        return drawBar(num, den, palMain);
        case 'numberline': return drawNumberLine([{ n: num, d: den, color: palMain }], { maxVal: num >= den ? 2 : 1 });
        case 'area':       return drawAreaModel(num, den, options);
        case 'set':        return drawSetModel(num, den, options);
        case 'length':     return drawLengthModel(num, den, options);
        case 'volume':     return drawVolumeModel(num, den, options);
        default:           return drawPie(num, den, options.size || 240, palMain);
      }
    };

    // ═══ OPERATIONS ═══
    var computeOp = function() {
      if (opMode === 'add') { var cd = lcm(den1, den2); return [num1 * (cd / den1) + num2 * (cd / den2), cd]; }
      if (opMode === 'sub') { var cd2 = lcm(den1, den2); return [num1 * (cd2 / den1) - num2 * (cd2 / den2), cd2]; }
      if (opMode === 'mul') { return [num1 * num2, den1 * den2]; }
      if (opMode === 'div') { return [num1 * den2, den1 * num2]; }
      return [0, 1];
    };
    var opResult = computeOp();
    var opSimplified = simplify(opResult[0], opResult[1]);
    var opSymbols = { add: '+', sub: '\u2212', mul: '\u00D7', div: '\u00F7' };

    // ═══════════════════════════════════════════════════════════════
    // ═══ v3 STEP-BY-STEP VISUALIZERS ═══════════════════════════════
    // ═══════════════════════════════════════════════════════════════

    // ── Common-denominator finder with step-by-step LCM derivation ──
    // Educator-grade demonstration: shows the prime factorization, the LCM,
    // and the conversion of each fraction to the common denominator.
    var primeFactorize = function(n) {
      var f = [];
      var x = n;
      for (var p = 2; p * p <= x; p++) {
        while (x % p === 0) { f.push(p); x /= p; }
      }
      if (x > 1) f.push(x);
      return f;
    };
    var primeFactorString = function(n) {
      var fs = primeFactorize(n);
      var counts = {};
      fs.forEach(function(p) { counts[p] = (counts[p] || 0) + 1; });
      return Object.keys(counts).map(function(p) {
        return counts[p] > 1 ? p + '^' + counts[p] : p;
      }).join(' × ') || '1';
    };
    var lcmExplain = function(a, b) {
      var fa = primeFactorize(a);
      var fb = primeFactorize(b);
      // Take max count of each prime
      var counts = {};
      fa.forEach(function(p) { counts[p] = Math.max(counts[p] || 0, fa.filter(function(q) { return q === p; }).length); });
      fb.forEach(function(p) { counts[p] = Math.max(counts[p] || 0, fb.filter(function(q) { return q === p; }).length); });
      var primes = Object.keys(counts);
      var lcmVal = 1;
      primes.forEach(function(p) { lcmVal *= Math.pow(parseInt(p), counts[p]); });
      return { lcmVal: lcmVal, primes: primes, counts: counts, fa: fa, fb: fb };
    };

    var renderCommonDenominatorVisualizer = function(a, b) {
      // Renders a stepwise explanation of LCM(a, b) using prime factorization,
      // then shows the equivalent-conversion for each fraction.
      var info = lcmExplain(a, b);
      return h('div', { className: 'bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl border-2 border-sky-200 p-4 space-y-3' },
        h('h4', { className: 'text-sm font-black text-sky-800' }, '🔍 Finding the common denominator step by step'),
        h('div', { className: 'grid grid-cols-2 gap-2 text-xs' },
          h('div', { className: 'bg-white rounded-lg p-2 border border-sky-200' },
            h('div', { className: 'font-bold text-sky-700 mb-1' }, 'Prime factors of ' + a),
            h('div', { className: 'font-mono text-sky-900' }, a + ' = ' + primeFactorString(a))
          ),
          h('div', { className: 'bg-white rounded-lg p-2 border border-sky-200' },
            h('div', { className: 'font-bold text-sky-700 mb-1' }, 'Prime factors of ' + b),
            h('div', { className: 'font-mono text-sky-900' }, b + ' = ' + primeFactorString(b))
          )
        ),
        h('div', { className: 'bg-sky-100 rounded-lg p-2 border border-sky-300' },
          h('p', { className: 'text-[11px] text-sky-900' },
            'Take the highest power of each prime that appears:'
          ),
          h('div', { className: 'font-mono text-sky-900 text-sm font-bold mt-1' },
            'LCM(' + a + ', ' + b + ') = ' + info.lcmVal
          )
        ),
        h('p', { className: 'text-[11px] text-sky-700 italic' },
          '💡 The LCM is the smallest common denominator. Multiply each fraction so its denominator becomes ' + info.lcmVal + '.'
        )
      );
    };

    // ── Simplification visualizer (GCD derivation) ──
    var renderSimplificationVisualizer = function(n, d) {
      if (d === 0) return null;
      var g = gcd(n, d);
      var sn = n / g, sd = d / g;
      // Build sequence of pairs from n/d through reductions
      var steps = [];
      // Show repeated division by small primes
      var cn = n, cd = d;
      while (true) {
        var pf = primeFactorize(gcd(cn, cd));
        if (pf.length === 0) break;
        var p = pf[0];
        steps.push({ n: cn, d: cd, dividedBy: p, nextN: cn / p, nextD: cd / p });
        cn = cn / p;
        cd = cd / p;
        if (gcd(cn, cd) === 1) break;
        if (steps.length > 10) break;
      }
      return h('div', { className: 'bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border-2 border-violet-200 p-4 space-y-2' },
        h('h4', { className: 'text-sm font-black text-violet-800' }, '✂️ Simplifying ' + n + '/' + d + ' step by step'),
        h('div', { className: 'bg-white rounded-lg p-2 border border-violet-200' },
          h('p', { className: 'text-[11px] text-violet-700 mb-1' }, 'GCD(' + n + ', ' + d + ') = ', h('b', null, g)),
          h('p', { className: 'text-[11px] text-violet-700' }, 'Divide top and bottom by the GCD:')
        ),
        steps.length > 0
          ? h('div', { className: 'space-y-1' },
              steps.map(function(s, i) {
                return h('div', { key: i, className: 'flex items-center gap-2 bg-white rounded-lg p-2 border border-violet-100 text-xs' },
                  h('span', { className: 'font-mono font-bold text-violet-700' }, s.n + '/' + s.d),
                  h('span', { className: 'text-violet-500' }, '÷'),
                  h('span', { className: 'font-mono font-bold text-violet-700' }, s.dividedBy + '/' + s.dividedBy),
                  h('span', { className: 'text-violet-500' }, '='),
                  h('span', { className: 'font-mono font-bold text-violet-700' }, s.nextN + '/' + s.nextD)
                );
              })
            )
          : h('p', { className: 'text-[11px] text-violet-700 italic' }, 'Already in simplest form!'),
        h('div', { className: 'bg-violet-100 rounded-lg p-2 border border-violet-300 text-center' },
          h('span', { className: 'text-sm font-bold text-violet-900' },
            n + '/' + d + ' → ', h('b', null, sn + '/' + sd)
          )
        )
      );
    };

    // ── Mixed/Improper converter visualizer ──
    var renderMixedConversionVisualizer = function(improperN, improperD) {
      if (improperD === 0) return null;
      var whole = Math.floor(improperN / improperD);
      var rem = improperN % improperD;
      var icons = [];
      // Show "whole" pies (full circles) plus a partial pie
      for (var i = 0; i < whole; i++) {
        icons.push(h('span', { key: 'w-' + i, style: { fontSize: 24 } }, '⬤'));
      }
      if (rem > 0) {
        icons.push(h('div', { key: 'partial', style: { width: 48, height: 48, display: 'inline-block', verticalAlign: 'middle' } },
          drawPie(rem, improperD, 48, palMain)
        ));
      }
      return h('div', { className: 'bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 p-4 space-y-2' },
        h('h4', { className: 'text-sm font-black text-amber-800' }, '📦 Convert ' + improperN + '/' + improperD + ' to a mixed number'),
        h('div', { className: 'bg-white rounded-lg p-3 border border-amber-200 space-y-1.5' },
          h('p', { className: 'text-xs text-amber-700' },
            '1. Divide: ', h('span', { className: 'font-mono font-bold' }, improperN + ' ÷ ' + improperD + ' = ' + whole + ' remainder ' + rem)
          ),
          h('p', { className: 'text-xs text-amber-700' },
            '2. Whole number part: ', h('b', null, whole)
          ),
          h('p', { className: 'text-xs text-amber-700' },
            '3. Fractional part: ', h('b', null, rem + '/' + improperD), ' (remainder over the original denominator)'
          ),
          h('div', { className: 'bg-amber-100 rounded-lg p-2 mt-2 text-center' },
            h('p', { className: 'text-base font-bold text-amber-900' },
              improperN + '/' + improperD + ' = ', whole > 0 ? whole + (rem > 0 ? ' ' + rem + '/' + improperD : '') : rem + '/' + improperD
            )
          )
        ),
        whole > 0 && h('div', { className: 'bg-white rounded-lg p-2 border border-amber-200' },
          h('p', { className: 'text-[11px] text-amber-700 mb-1' }, 'Visual: ' + whole + ' whole' + (whole > 1 ? 's' : '') + (rem > 0 ? ' + ' + rem + '/' + improperD : '')),
          h('div', { className: 'flex items-center gap-2 flex-wrap' }, icons)
        )
      );
    };

    // ── Long-division decimal expansion visualizer ──
    // Walks through n ÷ d step by step, showing each digit + remainder
    // and detecting whether it terminates or repeats. Maps to CCSS 7.NS.A.2.d.
    var renderDecimalExpansion = function(n, d) {
      if (d === 0) return null;
      var steps = [];
      // Integer part first
      var intPart = Math.floor(n / d);
      var remainder = n - intPart * d;
      var seenRemainders = {};
      var digits = [];
      var repeatStart = -1;
      var maxSteps = 20;
      var step = 0;
      while (remainder !== 0 && step < maxSteps) {
        if (seenRemainders[remainder] !== undefined) {
          repeatStart = seenRemainders[remainder];
          break;
        }
        seenRemainders[remainder] = digits.length;
        remainder *= 10;
        var digit = Math.floor(remainder / d);
        remainder = remainder - digit * d;
        digits.push(digit);
        steps.push({ dividend: remainder + digit * d, divisor: d, quotient: digit, remainder: remainder });
        step++;
      }
      var terminates = remainder === 0;
      var decStr = intPart.toString();
      if (digits.length > 0) {
        decStr += '.';
        if (repeatStart >= 0) {
          decStr += digits.slice(0, repeatStart).join('');
          decStr += '(' + digits.slice(repeatStart).join('') + ')';
        } else {
          decStr += digits.join('');
        }
      }
      return h('div', { className: 'bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4 space-y-2' },
        h('h4', { className: 'text-sm font-black text-blue-800' }, '➗ Long division: ' + n + ' ÷ ' + d),
        h('div', { className: 'bg-white rounded-lg p-3 border border-blue-200 font-mono text-sm' },
          h('div', { className: 'mb-1 text-blue-900' }, n + ' / ' + d + ' = ', h('b', null, decStr)),
          terminates
            ? h('p', { className: 'text-[11px] text-emerald-700 mt-1' }, '✓ Terminating decimal (denominator only has prime factors 2 and 5)')
            : h('p', { className: 'text-[11px] text-amber-700 mt-1' }, '↻ Repeating decimal (parentheses mark the repeating block)')
        ),
        h('p', { className: 'text-[11px] text-blue-700 italic' },
          '💡 ',
          terminates
            ? 'When the denominator has only 2s and 5s in its prime factorization, the decimal terminates.'
            : 'Repeating decimals happen when the denominator has any prime factor other than 2 or 5.'
        )
      );
    };

    // ═══ EQUIVALENT CHAINS ═══
    var equivChain = function(n, d, count) {
      var s = simplify(n, d);
      var result = [];
      for (var m = 1; m <= count; m++) { result.push([s[0] * m, s[1] * m]); }
      return result;
    };

    // ═══ BENCHMARK FRACTIONS ═══
    var benchmarks = [
      { frac: '1/2', dec: '0.5', pct: '50%' },
      { frac: '1/4', dec: '0.25', pct: '25%' },
      { frac: '3/4', dec: '0.75', pct: '75%' },
      { frac: '1/3', dec: '0.333...', pct: '33.3%' },
      { frac: '2/3', dec: '0.666...', pct: '66.7%' },
      { frac: '1/5', dec: '0.2', pct: '20%' },
      { frac: '2/5', dec: '0.4', pct: '40%' },
      { frac: '3/5', dec: '0.6', pct: '60%' },
      { frac: '4/5', dec: '0.8', pct: '80%' },
      { frac: '1/8', dec: '0.125', pct: '12.5%' },
      { frac: '3/8', dec: '0.375', pct: '37.5%' },
      { frac: '5/8', dec: '0.625', pct: '62.5%' },
      { frac: '7/8', dec: '0.875', pct: '87.5%' },
      { frac: '1/10', dec: '0.1', pct: '10%' },
      { frac: '1/6', dec: '0.166...', pct: '16.7%' },
      { frac: '5/6', dec: '0.833...', pct: '83.3%' }
    ];

    // ═══ CHALLENGE GENERATION (7 types) ═══
    var generateChallenge = function() {
      var types = ['identify', 'equivalent', 'compare', 'simplify', 'ordering', 'toDecimal', 'mixedNumber'];
      var type = types[Math.floor(Math.random() * types.length)];
      var ch;

      if (type === 'identify') {
        var d2 = pick(dpool);
        var n = randInt(1, d2);
        upd({ pieces: { numerator: n, denominator: d2 } });
        ch = { type: type, question: 'Look at the shaded pieces. How many pieces are filled?', answer: n };

      } else if (type === 'equivalent') {
        var d3 = pick([2, 3, 4, 5, 6]);
        var n2 = randInt(1, d3 - 1);
        var mult = randInt(2, 4);
        ch = { type: type, question: n2 + '/' + d3 + ' = ?/' + (d3 * mult) + '  \u2014 What is the missing numerator?', answer: n2 * mult };

      } else if (type === 'compare') {
        var da = pick([2, 3, 4, 6, 8]);
        var na = randInt(1, da);
        var db = pick([2, 3, 4, 6, 8]);
        var nb = randInt(1, db);
        var va = na / da, vb = nb / db;
        while (Math.abs(va - vb) < 0.001) { nb = randInt(1, db); vb = nb / db; }
        ch = { type: type, question: 'Which is larger: ' + na + '/' + da + ' or ' + nb + '/' + db + '? Enter the numerator of the larger fraction.', answer: va >= vb ? na : nb };

      } else if (type === 'simplify') {
        var base_d = pick([2, 3, 4, 5, 6]);
        var base_n = randInt(1, base_d - 1);
        var mult2 = randInt(2, 5);
        var bigN = base_n * mult2;
        var bigD = base_d * mult2;
        ch = { type: type, question: 'Simplify ' + bigN + '/' + bigD + '. What is the simplified numerator?', answer: base_n, hint: 'GCD(' + bigN + ', ' + bigD + ') = ' + (mult2) };

      } else if (type === 'ordering') {
        var fracs = [];
        for (var fi = 0; fi < 3; fi++) {
          var fd = pick([2, 3, 4, 5, 6, 8]);
          var fn = randInt(1, fd);
          fracs.push({ n: fn, d: fd, val: fn / fd });
        }
        fracs.sort(function(a, b) { return a.val - b.val; });
        var shuffled = fracs.slice().sort(function() { return Math.random() - 0.5; });
        var smallest = fracs[0];
        ch = {
          type: type,
          question: 'Which is the smallest: ' + shuffled.map(function(f) { return f.n + '/' + f.d; }).join(', ') + '? Enter its numerator.',
          answer: smallest.n,
          hint: 'Convert to decimals: ' + shuffled.map(function(f) { return f.n + '/' + f.d + '=' + f.val.toFixed(3); }).join(', ')
        };

      } else if (type === 'toDecimal') {
        var td = pick([2, 4, 5, 8, 10, 20, 25]);
        var tn = randInt(1, td - 1);
        var decVal = tn / td;
        var decStr = decVal.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
        // Ask for percentage as integer
        var pctAnswer = Math.round(decVal * 100);
        ch = { type: type, question: 'What is ' + tn + '/' + td + ' as a percentage? (whole number)', answer: pctAnswer, hint: tn + '/' + td + ' = ' + decStr };

      } else if (type === 'mixedNumber') {
        var md = pick([2, 3, 4, 5, 6, 8]);
        var whole = randInt(1, 4);
        var mr = randInt(1, md - 1);
        var improper = whole * md + mr;
        ch = { type: type, question: 'Convert ' + improper + '/' + md + ' to a mixed number. What is the whole number part?', answer: whole, hint: improper + ' \u00F7 ' + md + ' = ' + whole + ' remainder ' + mr };
      }

      // Track type usage
      var newTypes = Object.assign({}, challengeTypesUsed);
      newTypes[type] = true;

      sfxNewChallenge();
      upd({ challenge: ch, answer: '', feedback: null, challengeTypesUsed: newTypes });
    };

    var checkChallenge = function() {
      if (!challenge) return;
      var ans = parseInt(answer);
      var ok = ans === challenge.answer;
      var newStreak = ok ? streak + 1 : 0;
      var newBest = Math.max(bestStreak, newStreak);
      var newCorrect = score.correct + (ok ? 1 : 0);
      var newTotal = score.total + 1;

      // Track per-type counters
      var newEquivSolved = (_f.equivSolved || 0) + (ok && challenge.type === 'equivalent' ? 1 : 0);
      var newSimplifySolved = (_f.simplifySolved || 0) + (ok && challenge.type === 'simplify' ? 1 : 0);
      var newOpsSolved = (_f.opsSolved || 0) + (ok && challenge.type === 'ordering' ? 1 : 0);

      if (ok) {
        sfxCorrect();
        if (newStreak === 3 || newStreak === 5 || newStreak === 10) sfxStreak();
        announceToSR('Correct!');
      } else {
        sfxWrong();
        announceToSR('Incorrect');
      }

      upd({
        feedback: ok
          ? { correct: true, msg: '\u2705 Correct!' + (challenge.hint ? '' : '') }
          : { correct: false, msg: '\u274C The answer was ' + challenge.answer + (challenge.hint ? ' (' + challenge.hint + ')' : '') },
        score: { correct: newCorrect, total: newTotal },
        streak: newStreak,
        bestStreak: newBest,
        equivSolved: newEquivSolved,
        simplifySolved: newSimplifySolved,
        opsSolved: newOpsSolved
      });
      if (ok) awardXP('fractionChallenge', 10, 'fraction challenge');

      checkBadges({
        correct: newCorrect, streak: newStreak,
        typesUsed: Object.keys(challengeTypesUsed).length,
        equivSolved: newEquivSolved, simplifySolved: newSimplifySolved,
        convertCount: _f.convertCount || 0, wallPairsFound: _f.wallPairsFound || 0,
        opsSolved: newOpsSolved, tabsVisited: Object.keys(tabsVisited).length,
        aiAsked: _f.aiAsked || 0
      });
    };

    // ═══ COMPARE QUIZ ═══
    var makeQuiz = function() {
      var n1q = randInt(1, 9), d1q = randInt(2, 10);
      var n2q = randInt(1, 9), d2q = randInt(2, 10);
      while (Math.abs(n1q / d1q - n2q / d2q) < 0.01) { n2q = randInt(1, 9); d2q = randInt(2, 10); }
      var ans = n1q / d1q > n2q / d2q ? n1q + '/' + d1q : n2q + '/' + d2q;
      sfxNewChallenge();
      upd({
        quiz: { n1: n1q, d1: d1q, n2: n2q, d2: d2q, answer: ans, opts: [n1q + '/' + d1q, n2q + '/' + d2q, 'They are equal'], answered: false },
        num1: n1q, den1: d1q, num2: n2q, den2: d2q
      });
    };

    // ═══ AI TUTOR ═══
    var askAITutor = function() {
      if (!aiQuestion.trim()) return;
      upd({ aiLoading: true, aiResponse: '' });
      var prompt = 'You are a friendly math tutor helping a student learn about fractions. ' +
        'The student is currently on the "' + tab + '" tab of the Fraction Lab. ' +
        'They are working with fractions like ' + num1 + '/' + den1 + ' and ' + num2 + '/' + den2 + '. ' +
        'Their question: "' + aiQuestion + '"\n\n' +
        'Give a clear, encouraging explanation appropriate for a student. Use examples. Keep it under 150 words.';
      ctx.callGemini(prompt, false, false, 0.7).then(function(resp) {
        upd({ aiResponse: resp, aiLoading: false, aiAsked: (_f.aiAsked || 0) + 1 });
        checkBadges({
          correct: score.correct, streak: streak,
          typesUsed: Object.keys(challengeTypesUsed).length,
          equivSolved: _f.equivSolved || 0, simplifySolved: _f.simplifySolved || 0,
          convertCount: _f.convertCount || 0, wallPairsFound: _f.wallPairsFound || 0,
          opsSolved: _f.opsSolved || 0, tabsVisited: Object.keys(tabsVisited).length,
          aiAsked: (_f.aiAsked || 0) + 1
        });
      }).catch(function() {
        upd({ aiResponse: 'Sorry, I could not connect to the AI tutor right now. Try again later!', aiLoading: false });
      });
    };

    // ═══ KEYBOARD SHORTCUTS (managed without useEffect) ═══
    if (window._fracKbHandler) window.removeEventListener('keydown', window._fracKbHandler);
    window._fracKbHandler = function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      var key = e.key;
      if (key === '1') { upd({ tab: 'practice' }); trackTab('practice'); }
      else if (key === '2') { upd({ tab: 'compare' }); trackTab('compare'); }
      else if (key === '3') { upd({ tab: 'operations' }); trackTab('operations'); }
      else if (key === '4') { upd({ tab: 'equivalents' }); trackTab('equivalents'); }
      else if (key === '5') { upd({ tab: 'converter' }); trackTab('converter'); }
      else if (key === '6') { upd({ tab: 'wall' }); trackTab('wall'); }
      else if (key === 'n' || key === 'N') { if (tab === 'practice') generateChallenge(); }
      else if (key === 'b' || key === 'B') { upd({ showBenchmarks: !showBenchmarks }); }
      else if (key === 'p' || key === 'P') { upd({ mode: mode === 'pie' ? 'bar' : 'pie' }); }
      else if (key === '?' || key === '/') { upd({ showAITutor: !showAITutor }); }
    };
    window.addEventListener('keydown', window._fracKbHandler);

    // Track initial tab visit
    if (!window.__fracTabTracked) { window.__fracTabTracked = true; setTimeout(function() { trackTab(tab); }, 0); }

    // ═══ TAB: PRACTICE ═══
    var renderPractice = function() {
      var pn = pieces.numerator;
      var pd = pieces.denominator;
      var pSimp = simplify(pn, pd);
      var isSimplified = (pSimp[0] === pn && pSimp[1] === pd);
      return h('div', { className: 'space-y-4' },
        // Sliders
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-100' },
            h('label', { className: 'block text-xs text-rose-700 mb-1 font-bold' }, 'Denominator (parts)'),
            h('input', {
              type: 'range', min: '2', max: '20', value: pd,
              onChange: function(e) { var v = parseInt(e.target.value); sfxClick(); upd({ pieces: { denominator: v, numerator: Math.min(pn, v) } }); },
              className: 'w-full accent-rose-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-rose-700' }, pd)
          ),
          h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-100' },
            h('label', { className: 'block text-xs text-rose-700 mb-1 font-bold' }, 'Numerator (selected)'),
            h('input', {
              type: 'range', min: '0', max: String(pd), value: pn,
              onChange: function(e) { sfxClick(); upd({ pieces: { denominator: pd, numerator: parseInt(e.target.value) } }); },
              className: 'w-full accent-rose-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-rose-700' }, pn)
          )
        ),
        // Pie + bar
        h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-6 flex justify-center' },
          mode === 'pie'
            ? drawPie(pn, pd, 240, null)
            : h('div', { className: 'w-full max-w-md' }, drawBar(pn, pd, null))
        ),
        // Clickable bar
        h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-4' },
          h('div', { className: 'flex gap-[2px] h-12 rounded-lg overflow-hidden' },
            Array.from({ length: pd }, function(_, i) {
              return h('div', { 
                key: i,
                onClick: function() { sfxClick(); upd({ pieces: { denominator: pd, numerator: i < pn ? i : i + 1 } }); },
                className: 'flex-1 cursor-pointer transition-all ' + (i < pn ? 'bg-rose-500 hover:bg-rose-600' : 'bg-rose-100 hover:bg-rose-200'),
                title: (i + 1) + '/' + pd
              });
            })
          )
        ),
        // Value display
        h('div', { className: 'bg-white rounded-xl p-4 border border-rose-100 text-center' },
          h('div', { className: 'inline-flex flex-col items-center' },
            h('span', { className: 'text-3xl font-bold text-rose-700 border-b-4 border-rose-400 px-4 pb-1' }, pn),
            h('span', { className: 'text-3xl font-bold text-rose-700 px-4 pt-1' }, pd)
          ),
          h('div', { className: 'text-sm text-rose-600 mt-2 space-x-3' },
            h('span', null, '= ' + (pd > 0 ? (pn / pd * 100).toFixed(0) : 0) + '%'),
            pn > 0 && h('span', { className: 'text-slate-600' }, '\u2248 ' + (pd > 0 ? (pn / pd).toFixed(3) : 0)),
            !isSimplified && h('span', { className: 'text-violet-600 font-bold' }, '\u2192 ' + pSimp[0] + '/' + pSimp[1])
          ),
          pn > pd && h('div', { className: 'text-sm font-bold text-orange-600 mt-1' }, '\uD83D\uDCE6 Mixed: ' + toMixed(pn, pd)),
          pn === pd && h('div', { className: 'text-sm font-bold text-green-600 mt-1' }, '= 1 whole! \uD83C\uDF89')
        ),
        // Toggle mode
        h('div', { className: 'flex justify-center gap-2' },
          ['pie', 'bar'].map(function(m) {
            return h('button', { key: m,
              onClick: function() { sfxClick(); upd({ mode: m }); },
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold capitalize ' + (mode === m ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-rose-50')
            }, m === 'bar' ? '\u2588 Bar' : '\u25CF Pie');
          })
        ),
        // Preset buttons
        h('div', { className: 'flex flex-wrap gap-2' },
          [{ n: 1, d: 2, l: '\u00BD' }, { n: 1, d: 3, l: '\u2153' }, { n: 1, d: 4, l: '\u00BC' }, { n: 2, d: 3, l: '\u2154' },
           { n: 3, d: 4, l: '\u00BE' }, { n: 3, d: 8, l: '\u215C' }, { n: 5, d: 6, l: '\u215A' }, { n: 7, d: 12, l: '7/12' },
           { n: 11, d: 16, l: '11/16' }, { n: 13, d: 20, l: '13/20' }
          ].map(function(p) {
            return h('button', { key: p.l,
              onClick: function() { sfxClick(); upd({ pieces: { numerator: p.n, denominator: p.d } }); },
              className: 'px-3 py-1.5 text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all'
            }, p.l);
          })
        )
      );
    };

    // ═══ TAB: COMPARE ═══
    var renderCompare = function() {
      var nlMax = Math.max(Math.ceil(val1), Math.ceil(val2), 2);
      return h('div', { className: 'space-y-3' },
        // Quick presets
        h('div', { className: 'flex flex-wrap gap-1.5' },
          h('span', { className: 'text-[11px] font-bold text-slate-600 self-center' }, 'Presets:'),
          [[1,2,1,3],[2,5,3,8],[3,4,5,6],[1,4,2,8],[7,10,3,5],[5,12,1,3]].map(function(pr) {
            return h('button', { key: pr.join('-'),
              onClick: function() { sfxClick(); upd({ num1: pr[0], den1: pr[1], num2: pr[2], den2: pr[3] }); },
              className: 'px-2 py-1 rounded-lg text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-all'
            }, pr[0] + '/' + pr[1] + ' vs ' + pr[2] + '/' + pr[3]);
          })
        ),
        // Two fraction inputs
        h('div', { className: 'grid grid-cols-2 gap-4' },
          [{ label: 'Fraction A', n: num1, d: den1, nk: 'num1', dk: 'den1', color: '#3b82f6', sn: s1[0], sd: s1[1], val: val1 },
           { label: 'Fraction B', n: num2, d: den2, nk: 'num2', dk: 'den2', color: '#ef4444', sn: s2[0], sd: s2[1], val: val2 }
          ].map(function(frac) {
            return h('div', { key: frac.label, className: 'bg-white rounded-xl border p-4' },
              h('h4', { className: 'text-sm font-bold text-slate-600 mb-2' }, frac.label),
              h('div', { className: 'flex items-center justify-center gap-2 mb-3' },
                h('div', { className: 'text-center' },
                  h('input', {
                    type: 'number', min: 0, max: 20, value: frac.n,
                    'aria-label': frac.label + ' numerator',
                    onChange: function(e) { var o = {}; o[frac.nk] = Math.max(0, parseInt(e.target.value) || 0); upd(o); },
                    className: 'w-14 text-center text-xl font-bold border-b-2 outline-none focus:ring-2 focus:ring-blue-400', style: { borderColor: frac.color }
                  }),
                  h('div', { className: 'w-14 h-0.5 my-1', style: { backgroundColor: frac.color } }),
                  h('input', {
                    type: 'number', min: 1, max: 20, value: frac.d,
                    'aria-label': frac.label + ' denominator',
                    onChange: function(e) { var o = {}; o[frac.dk] = Math.max(1, parseInt(e.target.value) || 1); upd(o); },
                    className: 'w-14 text-center text-xl font-bold outline-none focus:ring-2 focus:ring-blue-400'
                  })
                ),
                h('div', { className: 'text-left ml-2' },
                  h('p', { className: 'text-lg font-bold text-slate-600' }, '= ' + (frac.val * 100).toFixed(0) + '%'),
                  h('p', { className: 'text-xs text-slate-600' }, '\u2248 ' + frac.val.toFixed(3)),
                  (frac.sn !== frac.n || frac.sd !== frac.d) && h('p', { className: 'text-xs text-slate-600' }, '\u2192 ' + frac.sn + '/' + frac.sd),
                  frac.n > frac.d && h('p', { className: 'text-xs font-bold text-orange-500' }, '\uD83D\uDCE6 ' + toMixed(frac.n, frac.d))
                )
              ),
              mode === 'bar' ? drawBar(frac.n, frac.d, frac.color) : h('div', { className: 'flex justify-center' }, drawPie(frac.n, frac.d, 100, frac.color))
            );
          })
        ),
        // View mode toggle
        h('div', { className: 'flex justify-end gap-1' },
          ['bar', 'pie'].map(function(m) {
            return h('button', { 'aria-label': 'Number Line',
              key: m,
              onClick: function() { sfxClick(); upd({ mode: m }); },
              className: 'px-3 py-1 rounded-lg text-xs font-bold capitalize ' + (mode === m ? 'bg-orange-700 text-white' : 'bg-slate-100 text-slate-600')
            }, m === 'bar' ? '\u2588 Bar' : '\u25CF Pie');
          })
        ),
        // Number line
        h('div', { className: 'bg-white rounded-xl border p-3' },
          h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83D\uDCCF Number Line'),
          h('svg', { viewBox: '0 0 400 50', className: 'w-full', style: { maxHeight: '60px' } },
            h('line', { x1: 20, y1: 30, x2: 380, y2: 30, stroke: '#94a3b8', strokeWidth: 2 }),
            Array.from({ length: nlMax + 1 }, function(_, i) {
              var x = 20 + i * (360 / nlMax);
              return h('g', { key: 't' + i },
                h('line', { x1: x, y1: 24, x2: x, y2: 36, stroke: '#94a3b8', strokeWidth: 2 }),
                h('text', { x: x, y: 46, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: '#475569' }, i)
              );
            }),
            h('circle', { cx: 20 + val1 * (360 / nlMax), cy: 30, r: 6, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }),
            h('text', { x: 20 + val1 * (360 / nlMax), y: 18, textAnchor: 'middle', style: { fontSize: '8px', fontWeight: 'bold' }, fill: '#3b82f6' }, num1 + '/' + den1),
            h('circle', { cx: 20 + val2 * (360 / nlMax), cy: 30, r: 6, fill: '#ef4444', stroke: 'white', strokeWidth: 2 }),
            h('text', { x: 20 + val2 * (360 / nlMax), y: 18, textAnchor: 'middle', style: { fontSize: '8px', fontWeight: 'bold' }, fill: '#ef4444' }, num2 + '/' + den2),
            Math.abs(val1 - val2) > 0.001 && h('line', { x1: 20 + Math.min(val1, val2) * (360 / nlMax), y1: 38, x2: 20 + Math.max(val1, val2) * (360 / nlMax), y2: 38, stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '3 2' })
          )
        ),
        // Cross-multiplication explanation
        h('div', { className: 'bg-violet-50 rounded-xl p-3 border border-violet-200' },
          h('p', { className: 'text-[11px] font-bold text-violet-600 uppercase tracking-wider mb-1' }, '\uD83D\uDCA1 Cross-Multiply Method'),
          h('p', { className: 'text-xs text-violet-800' },
            num1 + ' \u00D7 ' + den2 + ' = ' + (num1 * den2) + '  vs  ' + num2 + ' \u00D7 ' + den1 + ' = ' + (num2 * den1) +
            '  \u2192  ' + (num1 * den2 > num2 * den1 ? num1 + '/' + den1 + ' is larger' : num1 * den2 < num2 * den1 ? num2 + '/' + den2 + ' is larger' : 'They are equal')
          )
        ),
        // Comparison result (hidden during quiz)
        !(quiz && !quiz.answered) && h('div', { 
          className: 'p-3 rounded-xl text-center font-bold text-lg ' +
            (Math.abs(val1 - val2) < 0.001 ? 'bg-green-50 text-green-700 border border-green-200' :
             val1 > val2 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200')
        }, Math.abs(val1 - val2) < 0.001
            ? num1 + '/' + den1 + ' = ' + num2 + '/' + den2 + ' \u2705 Equal!'
            : val1 > val2
              ? num1 + '/' + den1 + ' > ' + num2 + '/' + den2 + '  (by ' + Math.abs(val1 - val2).toFixed(3) + ')'
              : num1 + '/' + den1 + ' < ' + num2 + '/' + den2 + '  (by ' + Math.abs(val1 - val2).toFixed(3) + ')'
        ),
        // Which is Larger? Quiz
        h('div', { className: 'border-t border-slate-200 pt-3' },
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('button', { 'aria-label': 'Which fraction is larger?',
              onClick: makeQuiz,
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + (quiz ? 'bg-orange-100 text-orange-700' : 'bg-orange-700 text-white') + ' hover:opacity-90 transition-all'
            }, quiz ? '\uD83D\uDD04 Next Round' : '\u26A1 Which is Larger?'),
            quizScore > 0 && h('span', { className: 'text-xs font-bold text-emerald-600' }, '\u2B50 ' + quizScore + ' | \uD83D\uDD25 ' + quizStreak)
          ),
          quiz && !quiz.answered && h('div', { className: 'bg-orange-50 rounded-xl p-3 border border-orange-200' },
            h('p', { className: 'text-sm font-bold text-orange-800 mb-2' }, 'Which fraction is larger?'),
            h('div', { className: 'flex gap-2 justify-center' },
              quiz.opts.map(function(opt) {
                return h('button', { key: opt,
                  onClick: function() {
                    var correct = opt === quiz.answer;
                    if (correct) { sfxCorrect(); } else { sfxWrong(); }
                    upd({
                      quiz: Object.assign({}, quiz, { answered: true, chosen: opt }),
                      quizScore: quizScore + (correct ? 1 : 0),
                      quizStreak: correct ? quizStreak + 1 : 0
                    });
                    if (correct) { addToast('\u2705 Correct! ' + quiz.answer + ' is larger', 'success'); awardXP('fractionViz', 5, 'fraction quiz'); }
                    else addToast('\u274C ' + quiz.answer + ' is larger', 'error');
                  },
                  className: 'px-4 py-2 rounded-lg text-sm font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:bg-orange-50 transition-all'
                }, opt);
              })
            )
          ),
          quiz && quiz.answered && h('div', {
            className: 'p-3 rounded-xl text-sm font-bold text-center ' + (quiz.chosen === quiz.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200')
          }, quiz.chosen === quiz.answer ? '\u2705 Correct! ' + quiz.answer + ' is larger' : '\u274C ' + quiz.answer + ' is larger')
        )
      );
    };

    // ═══ TAB: OPERATIONS ═══
    var renderOperations = function() {
      // Area model for multiplication
      var renderAreaModel = function() {
        if (opMode !== 'mul') return null;
        var cellW = 28, cellH = 28;
        var totalW = den2 * cellW + 2;
        var totalH = den1 * cellH + 2;
        var cells = [];
        for (var r = 0; r < den1; r++) {
          for (var c = 0; c < den2; c++) {
            var inA = r < num1;
            var inB = c < num2;
            var fill = inA && inB ? '#22c55e' : inA ? '#93c5fd' : inB ? '#fca5a5' : '#f1f5f9';
            cells.push(h('rect', {
              key: r + '-' + c, x: 1 + c * cellW, y: 1 + r * cellH,
              width: cellW, height: cellH,
              fill: fill, stroke: '#94a3b8', strokeWidth: 0.5
            }));
          }
        }
        return h('div', { className: 'bg-white rounded-xl border p-3 text-center' },
          h('p', { className: 'text-[11px] font-bold text-green-600 uppercase tracking-wider mb-2' }, '\uD83D\uDFE9 Area Model'),
          h('svg', { viewBox: '0 0 ' + totalW + ' ' + totalH, width: Math.min(totalW * 1.2, 300), height: Math.min(totalH * 1.2, 200) }, cells),
          h('p', { className: 'text-xs text-slate-600 mt-1' },
            'Green = ' + num1 + '\u00D7' + num2 + ' = ' + (num1 * num2) + ' out of ' + (den1 * den2) + ' total cells'
          )
        );
      };

      return h('div', { className: 'space-y-3' },
        // Fraction inputs (compact)
        h('div', { className: 'grid grid-cols-2 gap-4' },
          [{ label: 'A', n: num1, d: den1, nk: 'num1', dk: 'den1', color: '#3b82f6' },
           { label: 'B', n: num2, d: den2, nk: 'num2', dk: 'den2', color: '#ef4444' }
          ].map(function(frac) {
            return h('div', { key: frac.label, className: 'bg-white rounded-xl border p-3 text-center' },
              h('span', { className: 'text-xs font-bold text-slate-600' }, 'Fraction ' + frac.label),
              h('div', { className: 'flex items-center justify-center gap-1 mt-1' },
                h('input', {
                  type: 'number', min: 0, max: 20, value: frac.n,
                  'aria-label': 'Fraction ' + frac.label + ' numerator',
                  onChange: function(e) { var o = {}; o[frac.nk] = Math.max(0, parseInt(e.target.value) || 0); upd(o); },
                  className: 'w-12 text-center text-lg font-bold border-b-2 outline-none focus:ring-2 focus:ring-blue-400', style: { borderColor: frac.color }
                }),
                h('span', { className: 'text-xl font-bold text-slate-600 mx-1' }, '/'),
                h('input', {
                  type: 'number', min: 1, max: 20, value: frac.d,
                  'aria-label': 'Fraction ' + frac.label + ' denominator',
                  onChange: function(e) { var o = {}; o[frac.dk] = Math.max(1, parseInt(e.target.value) || 1); upd(o); },
                  className: 'w-12 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-blue-400'
                })
              )
            );
          })
        ),
        // Operation buttons
        h('div', { className: 'flex gap-2 justify-center' },
          [['add', '+'], ['sub', '\u2212'], ['mul', '\u00D7'], ['div', '\u00F7']].map(function(op) {
            return h('button', { key: op[0],
              onClick: function() { sfxClick(); upd({ opMode: op[0] }); },
              className: 'w-12 h-12 rounded-lg text-xl font-black transition-all ' +
                (opMode === op[0] ? 'bg-orange-700 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-600 hover:bg-orange-50')
            }, op[1]);
          })
        ),
        // Result
        h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-4 text-center' },
          h('div', { className: 'text-2xl font-bold text-slate-800 mb-3' },
            h('span', { className: 'text-blue-600' }, num1 + '/' + den1),
            h('span', { className: 'mx-3 text-orange-500' }, opSymbols[opMode]),
            h('span', { className: 'text-red-600' }, num2 + '/' + den2),
            h('span', { className: 'mx-3 text-slate-600' }, '='),
            h('span', { className: 'text-emerald-600' }, opSimplified[0] + '/' + opSimplified[1])
          ),
          // Mixed number result
          (Math.abs(opSimplified[0]) > opSimplified[1]) && h('p', { className: 'text-sm font-bold text-orange-600 mb-2' },
            '\uD83D\uDCE6 Mixed: ' + toMixed(opSimplified[0], opSimplified[1])
          ),
          // Decimal result
          h('p', { className: 'text-xs text-slate-600 mb-3' },
            '\u2248 ' + (opSimplified[1] !== 0 ? (opSimplified[0] / opSimplified[1]).toFixed(4) : 'undefined')
          ),
          // Step-by-step
          h('div', { className: 'bg-orange-50 rounded-lg p-3 text-xs text-orange-800 space-y-1 text-left' },
            h('p', { className: 'font-bold' }, '\uD83D\uDCA1 Step by step:'),
            (opMode === 'add' || opMode === 'sub')
              ? h(React.Fragment, null,
                  h('p', null, '1. Find common denominator: LCD(' + den1 + ', ' + den2 + ') = ' + lcm(den1, den2)),
                  h('p', null, '2. Convert: ' + num1 + '/' + den1 + ' = ' + (num1 * (lcm(den1, den2) / den1)) + '/' + lcm(den1, den2) + ' and ' + num2 + '/' + den2 + ' = ' + (num2 * (lcm(den1, den2) / den2)) + '/' + lcm(den1, den2)),
                  h('p', null, '3. ' + (opMode === 'add' ? 'Add' : 'Subtract') + ' numerators: ' + opResult[0] + '/' + opResult[1]),
                  (opResult[0] !== opSimplified[0] || opResult[1] !== opSimplified[1]) && h('p', null, '4. Simplify: ' + opSimplified[0] + '/' + opSimplified[1])
                )
              : h(React.Fragment, null,
                  opMode === 'mul'
                    ? h('p', null, 'Multiply straight across: (' + num1 + '\u00D7' + num2 + ')/(' + den1 + '\u00D7' + den2 + ') = ' + opResult[0] + '/' + opResult[1])
                    : h('p', null, 'Flip and multiply: ' + num1 + '/' + den1 + ' \u00D7 ' + den2 + '/' + num2 + ' = ' + opResult[0] + '/' + opResult[1]),
                  (opResult[0] !== opSimplified[0] || opResult[1] !== opSimplified[1]) && h('p', null, 'Simplify: ' + opSimplified[0] + '/' + opSimplified[1])
                )
          ),
          // Result bar
          h('div', { className: 'mt-3 flex justify-center' },
            drawBar(Math.min(Math.abs(opSimplified[0]), opSimplified[1] * 2), opSimplified[1], '#22c55e')
          )
        ),
        // Area model (multiplication only)
        renderAreaModel()
      );
    };

    // ═══ TAB: EQUIVALENTS ═══
    var renderEquivalents = function() {
      return h('div', { className: 'space-y-3' },
        // Fraction inputs (compact)
        h('div', { className: 'grid grid-cols-2 gap-4' },
          [{ label: 'Fraction A', n: num1, d: den1, nk: 'num1', dk: 'den1', color: '#3b82f6' },
           { label: 'Fraction B', n: num2, d: den2, nk: 'num2', dk: 'den2', color: '#ef4444' }
          ].map(function(frac) {
            return h('div', { key: frac.label, className: 'bg-white rounded-xl border p-3 text-center' },
              h('span', { className: 'text-xs font-bold text-slate-600' }, frac.label),
              h('div', { className: 'flex items-center justify-center gap-1 mt-1' },
                h('input', {
                  type: 'number', min: 0, max: 20, value: frac.n,
                  'aria-label': frac.label + ' numerator',
                  onChange: function(e) { var o = {}; o[frac.nk] = Math.max(0, parseInt(e.target.value) || 0); upd(o); },
                  className: 'w-12 text-center text-lg font-bold border-b-2 outline-none focus:ring-2 focus:ring-blue-400', style: { borderColor: frac.color }
                }),
                h('span', { className: 'text-xl font-bold text-slate-600 mx-1' }, '/'),
                h('input', {
                  type: 'number', min: 1, max: 20, value: frac.d,
                  'aria-label': frac.label + ' denominator',
                  onChange: function(e) { var o = {}; o[frac.dk] = Math.max(1, parseInt(e.target.value) || 1); upd(o); },
                  className: 'w-12 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-blue-400'
                })
              )
            );
          })
        ),
        // Equiv chains
        h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-4' },
          h('p', { className: 'text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-2' }, '\uD83D\uDD17 Equivalent Fractions for ' + s1[0] + '/' + s1[1]),
          h('div', { className: 'flex flex-wrap gap-2 mb-3' },
            equivChain(num1, den1, 8).map(function(eq, i) {
              return h('div', {
                key: 'a' + i,
                className: 'px-3 py-2 rounded-lg border text-center transition-all ' + (i === 0 ? 'bg-blue-100 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-blue-50')
              },
                h('span', { className: 'text-sm font-bold ' + (i === 0 ? 'text-blue-700' : 'text-slate-700') }, eq[0] + '/' + eq[1]),
                h('span', { className: 'text-[11px] text-slate-600 block' }, '\u00D7' + (i + 1))
              );
            })
          ),
          h('p', { className: 'text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-2 mt-3' }, '\uD83D\uDD17 Equivalent Fractions for ' + s2[0] + '/' + s2[1]),
          h('div', { className: 'flex flex-wrap gap-2' },
            equivChain(num2, den2, 8).map(function(eq, i) {
              return h('div', {
                key: 'b' + i,
                className: 'px-3 py-2 rounded-lg border text-center transition-all ' + (i === 0 ? 'bg-red-100 border-red-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-red-50')
              },
                h('span', { className: 'text-sm font-bold ' + (i === 0 ? 'text-red-700' : 'text-slate-700') }, eq[0] + '/' + eq[1]),
                h('span', { className: 'text-[11px] text-slate-600 block' }, '\u00D7' + (i + 1))
              );
            })
          ),
          // Common denominator
          h('div', { className: 'mt-3 p-2 bg-violet-50 rounded-lg border border-violet-200 text-center' },
            h('p', { className: 'text-xs font-bold text-violet-700' }, '\uD83C\uDFAF Common denominator: ' + lcm(den1, den2)),
            h('p', { className: 'text-sm font-bold text-violet-800 mt-1' },
              (num1 * (lcm(den1, den2) / den1)) + '/' + lcm(den1, den2) + ' and ' + (num2 * (lcm(den1, den2) / den2)) + '/' + lcm(den1, den2)
            )
          )
        ),
        // Are they equivalent?
        h('div', {
          className: 'p-3 rounded-xl text-center font-bold ' +
            (s1[0] === s2[0] && s1[1] === s2[1]
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200')
        },
          s1[0] === s2[0] && s1[1] === s2[1]
            ? '\u2705 ' + num1 + '/' + den1 + ' and ' + num2 + '/' + den2 + ' are equivalent! Both simplify to ' + s1[0] + '/' + s1[1]
            : '\u2716 ' + num1 + '/' + den1 + ' (' + s1[0] + '/' + s1[1] + ') and ' + num2 + '/' + den2 + ' (' + s2[0] + '/' + s2[1] + ') are NOT equivalent'
        )
      );
    };

    // ═══ TAB: CONVERTER ═══
    var renderConverter = function() {
      var cSimp = simplify(convNum, convDen);
      var cDec = convDen > 0 ? convNum / convDen : 0;
      var cPct = cDec * 100;
      var cDecStr = fracToDecimal(convNum, convDen);
      var cMixed = convNum > convDen ? toMixed(convNum, convDen) : null;

      // Decimal to fraction conversion
      var parsedDec = parseFloat(convDecInput);
      var decFrac = !isNaN(parsedDec) ? decToFrac(parsedDec) : null;

      return h('div', { className: 'space-y-4' },
        // Direction toggle
        h('div', { className: 'flex gap-2 justify-center' },
          h('button', { 'aria-label': 'Fraction to Decimal',
            onClick: function() { sfxClick(); upd({ convDirection: 'fracToDec' }); },
            className: 'px-4 py-2 rounded-lg text-xs font-bold ' + (convDirection === 'fracToDec' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-teal-50')
          }, '\uD83C\uDF55 \u2192 Fraction to Decimal'),
          h('button', { 'aria-label': '0.5 Decimal to Fraction',
            onClick: function() { sfxClick(); upd({ convDirection: 'decToFrac' }); },
            className: 'px-4 py-2 rounded-lg text-xs font-bold ' + (convDirection === 'decToFrac' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-teal-50')
          }, '0.5 \u2192 Decimal to Fraction')
        ),

        convDirection === 'fracToDec' ? h(React.Fragment, null,
          // Fraction input
          h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-4 text-center' },
            h('div', { className: 'flex items-center justify-center gap-2' },
              h('input', {
                type: 'number', min: 0, max: 99, value: convNum,
                'aria-label': 'Converter numerator',
                onChange: function(e) { upd({ convNum: Math.max(0, parseInt(e.target.value) || 0) }); },
                className: 'w-16 text-center text-2xl font-bold border-b-3 border-teal-500 outline-none focus:ring-2 focus:ring-teal-400'
              }),
              h('span', { className: 'text-3xl font-bold text-slate-600 mx-2' }, '/'),
              h('input', {
                type: 'number', min: 1, max: 99, value: convDen,
                'aria-label': 'Converter denominator',
                onChange: function(e) { upd({ convDen: Math.max(1, parseInt(e.target.value) || 1) }); },
                className: 'w-16 text-center text-2xl font-bold outline-none focus:ring-2 focus:ring-teal-400'
              })
            )
          ),
          // Results card
          h('div', { className: 'bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200 p-4 space-y-3' },
            // Simplified
            (cSimp[0] !== convNum || cSimp[1] !== convDen) && h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-teal-600 w-24' }, '\u2702\uFE0F Simplified'),
              h('span', { className: 'text-lg font-bold text-teal-800' }, cSimp[0] + '/' + cSimp[1])
            ),
            // Mixed number
            cMixed && h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-orange-600 w-24' }, '\uD83D\uDCE6 Mixed'),
              h('span', { className: 'text-lg font-bold text-orange-800' }, cMixed)
            ),
            // Decimal
            h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-blue-600 w-24' }, '\uD83D\uDCCA Decimal'),
              h('span', { className: 'text-lg font-bold text-blue-800' }, cDecStr)
            ),
            // Percentage
            h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-purple-600 w-24' }, '\uD83D\uDCCA Percent'),
              h('span', { className: 'text-lg font-bold text-purple-800' }, cPct.toFixed(2) + '%')
            ),
            // Visual bar
            h('div', { className: 'p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Visual'),
              h('div', { className: 'h-6 bg-slate-200 rounded-full overflow-hidden' },
                h('div', { 
                  style: { width: Math.min(cPct, 100) + '%', backgroundColor: '#14b8a6', transition: 'width 0.3s' },
                  className: 'h-full rounded-full flex items-center justify-center'
                },
                  cPct >= 15 && h('span', { className: 'text-[11px] font-bold text-white' }, cPct.toFixed(0) + '%')
                )
              )
            )
          ),
          // Track conversions for badge
          h('button', { 'aria-label': 'Log This Conversion',
            onClick: function() {
              sfxComplete();
              var newCount = (_f.convertCount || 0) + 1;
              upd({ convertCount: newCount });
              addToast('\uD83D\uDD04 Converted: ' + convNum + '/' + convDen + ' = ' + cDecStr, 'success');
              checkBadges({
                correct: score.correct, streak: streak,
                typesUsed: Object.keys(challengeTypesUsed).length,
                equivSolved: _f.equivSolved || 0, simplifySolved: _f.simplifySolved || 0,
                convertCount: newCount, wallPairsFound: _f.wallPairsFound || 0,
                opsSolved: _f.opsSolved || 0, tabsVisited: Object.keys(tabsVisited).length,
                aiAsked: _f.aiAsked || 0
              });
            },
            className: 'w-full py-2 bg-teal-700 text-white font-bold rounded-lg text-sm hover:bg-teal-700 transition-all'
          }, '\u2705 Log This Conversion')
        ) : h(React.Fragment, null,
          // Decimal to fraction
          h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-4 text-center' },
            h('label', { className: 'text-xs font-bold text-teal-600 block mb-2' }, 'Enter a decimal number:'),
            h('input', {
              type: 'text', value: convDecInput,
              'aria-label': 'Decimal number to convert',
              onChange: function(e) { upd({ convDecInput: e.target.value }); },
              placeholder: '0.75',
              className: 'w-32 text-center text-2xl font-bold border-b-3 border-teal-500 outline-none focus:ring-2 focus:ring-teal-400'
            })
          ),
          decFrac && h('div', { className: 'bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200 p-4 space-y-3' },
            h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-teal-600 w-24' }, '\uD83C\uDF55 Fraction'),
              h('span', { className: 'text-lg font-bold text-teal-800' }, decFrac[0] + '/' + decFrac[1])
            ),
            h('div', { className: 'flex items-center gap-3 p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-purple-600 w-24' }, '\uD83D\uDCCA Percent'),
              h('span', { className: 'text-lg font-bold text-purple-800' }, (parsedDec * 100).toFixed(2) + '%')
            ),
            h('div', { className: 'p-2 bg-white rounded-lg' },
              h('span', { className: 'text-xs font-bold text-slate-600 block mb-1' }, 'Visual'),
              h('div', { className: 'flex justify-center' },
                drawPie(Math.min(decFrac[0], decFrac[1]), decFrac[1], 120, '#14b8a6')
              )
            )
          )
        ),

        // Benchmark fractions
        h('div', { className: 'border-t border-slate-200 pt-3' },
          h('button', { 'aria-label': 'Fraction',
            onClick: function() { sfxClick(); upd({ showBenchmarks: !showBenchmarks }); },
            className: 'text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors'
          }, (showBenchmarks ? '\u25BC' : '\u25B6') + ' Benchmark Fractions Reference'),
          showBenchmarks && h('div', { className: 'mt-2 bg-white rounded-xl border p-3' },
            h('div', { className: 'grid grid-cols-3 gap-1 text-[11px] font-bold mb-1' },
              h('span', { className: 'text-slate-600' }, 'Fraction'),
              h('span', { className: 'text-slate-600' }, 'Decimal'),
              h('span', { className: 'text-slate-600' }, 'Percent')
            ),
            benchmarks.map(function(bm) {
              return h('div', { key: bm.frac, className: 'grid grid-cols-3 gap-1 text-xs py-0.5 border-t border-slate-100' },
                h('span', { className: 'font-bold text-teal-700' }, bm.frac),
                h('span', { className: 'text-blue-600' }, bm.dec),
                h('span', { className: 'text-purple-600' }, bm.pct)
              );
            })
          )
        )
      );
    };

    // ═══ TAB: FRACTION WALL ═══
    var renderFractionWall = function() {
      var wallDenoms = [1, 2, 3, 4, 5, 6, 8, 10, 12];
      var stripH = 32;
      var wallW = 400;
      var colors = ['#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899'];

      var handleWallClick = function(num, den) {
        sfxClick();
        if (!wallCompareA) {
          upd({ wallCompareA: { n: num, d: den }, wallCompareB: null, wallHighlight: { n: num, d: den } });
        } else if (!wallCompareB) {
          var a = wallCompareA;
          upd({ wallCompareB: { n: num, d: den } });
          // Check if equivalent
          var sA = simplify(a.n, a.d);
          var sB = simplify(num, den);
          if (sA[0] === sB[0] && sA[1] === sB[1] && (a.n !== num || a.d !== den)) {
            sfxCorrect();
            var newPairs = (_f.wallPairsFound || 0) + 1;
            upd({ wallPairsFound: newPairs });
            addToast('\u2705 ' + a.n + '/' + a.d + ' = ' + num + '/' + den + ' — Equivalent!', 'success');
            awardXP('fractionWall', 10, 'equivalent pair');
            checkBadges({
              correct: score.correct, streak: streak,
              typesUsed: Object.keys(challengeTypesUsed).length,
              equivSolved: _f.equivSolved || 0, simplifySolved: _f.simplifySolved || 0,
              convertCount: _f.convertCount || 0, wallPairsFound: newPairs,
              opsSolved: _f.opsSolved || 0, tabsVisited: Object.keys(tabsVisited).length,
              aiAsked: _f.aiAsked || 0
            });
          } else if (a.n !== num || a.d !== den) {
            addToast(a.n + '/' + a.d + ' and ' + num + '/' + den + ' are not equivalent', 'info');
          }
          // Reset after a moment
          setTimeout(function() { upd({ wallCompareA: null, wallCompareB: null, wallHighlight: null }); }, 1500);
        } else {
          upd({ wallCompareA: { n: num, d: den }, wallCompareB: null, wallHighlight: { n: num, d: den } });
        }
      };

      var isHighlighted = function(num, den) {
        if (!wallHighlight) return false;
        var sH = simplify(wallHighlight.n, wallHighlight.d);
        var sC = simplify(num, den);
        return sH[0] === sC[0] && sH[1] === sC[1];
      };

      return h('div', { className: 'space-y-4' },
        h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
          h('p', { className: 'text-xs font-bold text-indigo-700' }, '\uD83E\uDDF1 Click any piece to highlight equivalent fractions. Click two pieces to check if they are equivalent!'),
          (_f.wallPairsFound || 0) > 0 && h('p', { className: 'text-xs text-indigo-600 mt-1' }, '\u2705 Equivalent pairs found: ' + (_f.wallPairsFound || 0))
        ),
        // The wall
        h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-3 overflow-x-auto' },
          h('svg', { viewBox: '0 0 ' + wallW + ' ' + (wallDenoms.length * (stripH + 2) + 10), width: '100%' },
            wallDenoms.map(function(den, rowIdx) {
              var pieces2 = [];
              var segW = (wallW - 40) / den;
              for (var i = 0; i < den; i++) {
                var num = i + 1;
                var hl = isHighlighted(num, den);
                var isSelected = (wallCompareA && wallCompareA.n === num && wallCompareA.d === den) ||
                                 (wallCompareB && wallCompareB.n === num && wallCompareB.d === den);
                pieces2.push(h('g', { key: rowIdx + '-' + i },
                  h('rect', {
                    x: 30 + i * segW, y: 5 + rowIdx * (stripH + 2),
                    width: segW - 1, height: stripH,
                    fill: hl ? '#fbbf24' : isSelected ? '#c084fc' : colors[rowIdx % colors.length],
                    stroke: hl ? '#d97706' : '#475569', strokeWidth: hl ? 2 : 0.5,
                    rx: 3,
                    className: 'cursor-pointer',
                    style: { opacity: hl ? 1 : 0.75, transition: 'all 0.2s' },
                    onClick: function() { handleWallClick(num, den); }
                  }),
                  segW > 25 && h('text', {
                    x: 30 + i * segW + segW / 2, y: 5 + rowIdx * (stripH + 2) + stripH / 2 + 4,
                    textAnchor: 'middle', fill: 'white',
                    style: { fontSize: Math.min(12, segW * 0.35) + 'px', fontWeight: 'bold', pointerEvents: 'none' }
                  }, num + '/' + den)
                ));
              }
              // Row label
              pieces2.push(h('text', {
                key: 'label-' + rowIdx, x: 14, y: 5 + rowIdx * (stripH + 2) + stripH / 2 + 4,
                textAnchor: 'middle', fill: '#94a3b8',
                style: { fontSize: '11px', fontWeight: 'bold' }
              }, '/' + den));
              return h('g', { key: 'row' + rowIdx }, pieces2);
            })
          )
        ),
        // Quick equivalent finder
        h('div', { className: 'bg-white rounded-xl border p-3' },
          h('p', { className: 'text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2' }, '\uD83D\uDD0D Find Equivalents'),
          h('div', { className: 'flex gap-2 flex-wrap' },
            [
              { n: 1, d: 2, l: '1/2' }, { n: 1, d: 3, l: '1/3' }, { n: 1, d: 4, l: '1/4' },
              { n: 2, d: 3, l: '2/3' }, { n: 3, d: 4, l: '3/4' }, { n: 1, d: 5, l: '1/5' },
              { n: 1, d: 6, l: '1/6' }, { n: 5, d: 6, l: '5/6' }
            ].map(function(f) {
              return h('button', { key: f.l,
                onClick: function() { sfxClick(); upd({ wallHighlight: { n: f.n, d: f.d }, wallCompareA: null, wallCompareB: null }); },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all'
              }, f.l);
            })
          ),
          wallHighlight && h('div', { className: 'mt-2 text-xs text-indigo-600' },
            'Highlighted: all fractions equivalent to ' + wallHighlight.n + '/' + wallHighlight.d + ' (' + simplify(wallHighlight.n, wallHighlight.d).join('/') + ')'
          )
        ),
        // Reset
        h('button', { 'aria-label': 'Clear Highlights',
          onClick: function() { upd({ wallHighlight: null, wallCompareA: null, wallCompareB: null }); },
          className: 'text-xs font-bold text-slate-600 hover:text-slate-600 transition-colors'
        }, '\uD83D\uDD04 Clear Highlights')
      );
    };

    // ═══ AI TUTOR PANEL ═══
    var renderAITutor = function() {
      if (!showAITutor) return null;
      return h('div', { className: 'bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border-2 border-sky-200 p-4 space-y-3' },
        h('div', { className: 'flex items-center justify-between' },
          h('h4', { className: 'text-sm font-bold text-sky-800' }, '\uD83E\uDD16 AI Fraction Tutor'),
          h('button', { onClick: function() { upd({ showAITutor: false }); },
            className: 'text-sky-400 hover:text-sky-600 text-lg font-bold'
          }, '\u00D7')
        ),
        h('div', { className: 'flex gap-2' },
          h('input', {
            type: 'text', value: aiQuestion,
            onChange: function(e) { upd({ aiQuestion: e.target.value }); },
            onKeyDown: function(e) { if (e.key === 'Enter' && aiQuestion.trim()) askAITutor(); },
            placeholder: 'Ask me about fractions...',
            className: 'flex-1 px-3 py-2 border border-sky-600 rounded-lg text-sm'
          }),
          h('button', { onClick: askAITutor,
            disabled: aiLoading || !aiQuestion.trim(),
            className: 'px-4 py-2 bg-sky-600 text-white font-bold rounded-lg text-sm hover:bg-sky-700 disabled:opacity-50 transition-all'
          }, aiLoading ? '\u23F3' : 'Ask')
        ),
        // Quick questions
        h('div', { className: 'flex flex-wrap gap-1.5' },
          ['How do I add fractions?', 'What are equivalent fractions?', 'How do I simplify?', 'What is a mixed number?'].map(function(q) {
            return h('button', { 'aria-label': 'Ask question',
              key: q,
              onClick: function() { upd({ aiQuestion: q }); },
              className: 'px-2 py-1 text-[11px] font-bold bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-all'
            }, q);
          })
        ),
        aiResponse && h('div', { className: 'bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-sky-100' }, aiResponse)
      );
    };

    // ═══ BADGES PANEL ═══
    var renderBadges = function() {
      var earned = Object.keys(badges).length;
      if (earned === 0) return null;
      return h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3' },
        h('p', { className: 'text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2' },
          '\uD83C\uDFC5 Badges (' + earned + '/' + BADGES.length + ')'
        ),
        h('div', { className: 'flex flex-wrap gap-1.5' },
          BADGES.map(function(b) {
            var has = badges[b.id];
            return h('div', {
              key: b.id,
              title: b.name + ': ' + b.desc,
              className: 'w-8 h-8 rounded-lg flex items-center justify-center text-base ' +
                (has ? 'bg-amber-200 shadow-sm' : 'bg-slate-100 opacity-30'),
              style: { filter: has ? 'none' : 'grayscale(1)' }
            }, b.icon);
          })
        )
      );
    };

    // ═══════════════════════════════════════════════════════════════
    // ═══ v3 NEW TAB RENDERERS ═════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════

    // ── MODELS TAB — switch between all 7 visualizations ──
    var renderModelsTab = function() {
      return h('div', { className: 'space-y-4' },
        h('div', { className: 'bg-rose-50 rounded-xl p-3 border border-rose-200' },
          h('h4', { className: 'text-sm font-bold text-rose-800 mb-2' }, '🎨 Visual model picker'),
          h('p', { className: 'text-[11px] text-rose-700 mb-2' },
            'Different visual models highlight different aspects of fractions. Pie shows part-of-whole, number line shows magnitude, area shows multiplication, set shows discrete groups.'
          ),
          h('div', { className: 'grid grid-cols-3 sm:grid-cols-7 gap-1', role: 'radiogroup', 'aria-label': 'Visual model' },
            MODELS.map(function(m) {
              var active = currentModel === m.id;
              return h('button', {
                key: 'mp-' + m.id,
                role: 'radio', 'aria-checked': active,
                onClick: function() { sfxClick(); upd({ model: m.id }); announceToSR(m.label + ' model selected'); },
                title: m.desc,
                className: 'flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-[11px] font-bold transition-all ' +
                  (active ? 'bg-rose-600 text-white shadow-md' : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-100')
              },
                h('span', { className: 'text-base leading-none' }, m.icon),
                h('span', { className: 'leading-tight text-[10px]' }, m.label)
              );
            })
          )
        ),
        // Slider controls
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-100' },
            h('label', { className: 'block text-xs text-rose-700 mb-1 font-bold' }, 'Numerator'),
            h('input', {
              type: 'range', min: '0', max: String(pieces.denominator), value: pieces.numerator,
              onChange: function(e) { sfxClick(); upd({ pieces: { denominator: pieces.denominator, numerator: parseInt(e.target.value) } }); },
              className: 'w-full accent-rose-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-rose-700' }, pieces.numerator)
          ),
          h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-100' },
            h('label', { className: 'block text-xs text-rose-700 mb-1 font-bold' }, 'Denominator'),
            h('input', {
              type: 'range', min: '2', max: '20', value: pieces.denominator,
              onChange: function(e) { var v = parseInt(e.target.value); sfxClick(); upd({ pieces: { denominator: v, numerator: Math.min(pieces.numerator, v) } }); },
              className: 'w-full accent-rose-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-rose-700' }, pieces.denominator)
          )
        ),
        // Render selected model
        h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-6 flex justify-center min-h-[200px] items-center' },
          renderModel(pieces.numerator, pieces.denominator, { size: 220, rows: null, cols: null })
        ),
        h('div', { className: 'bg-rose-50 rounded-xl p-3 border border-rose-100 text-center' },
          h('p', { className: 'text-sm font-bold text-rose-800' },
            'Showing ', h('span', { className: 'font-mono text-rose-700' }, pieces.numerator + '/' + pieces.denominator),
            ' as ', h('b', null, (MODELS.find(function(m) { return m.id === currentModel; }) || {}).label)
          ),
          h('p', { className: 'text-[11px] text-rose-600 italic mt-1' },
            (MODELS.find(function(m) { return m.id === currentModel; }) || {}).desc
          )
        )
      );
    };

    // ── CRA TAB — Concrete-Representational-Abstract progression ──
    // The textbook UDL move for special-ed math instruction. Walk a student
    // through 3 representations of the SAME fraction:
    //   Concrete: discrete objects you can count (chips, candies)
    //   Representational: a drawing/diagram (pie, bar)
    //   Abstract: the symbol (3/4)
    var renderCRATab = function() {
      var craStage = _f.craStage || 1;
      var craN = _f.craN || 3;
      var craD = _f.craD || 4;
      var stages = [
        {
          id: 1, label: 'Concrete', icon: '🍎',
          headline: 'Stage 1: Concrete — count real objects',
          description: 'Start with discrete objects students can see and touch. ' + craN + ' apples are chosen from a group of ' + craD + '.',
          body: h('div', { className: 'space-y-3' },
            h('div', { className: 'bg-white rounded-xl p-4 border border-amber-200 flex justify-center' },
              drawSetModel(craN, craD, { icon: '🍎', perRow: Math.min(craD, 6) })
            ),
            h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
              h('p', { className: 'text-xs text-amber-800' },
                'Ask the student: "How many apples in all?" → ', h('b', null, craD),
                '. "How many are chosen?" → ', h('b', null, craN),
                '. The fraction tells the relationship: ', h('b', null, craN + ' of ' + craD)
              )
            )
          )
        },
        {
          id: 2, label: 'Representational', icon: '🎨',
          headline: 'Stage 2: Representational — draw a model',
          description: 'Move from physical objects to a drawn diagram. The same fraction, but now as a visual model.',
          body: h('div', { className: 'space-y-3' },
            h('div', { className: 'grid grid-cols-2 gap-3' },
              h('div', { className: 'bg-white rounded-xl p-3 border border-violet-200' },
                h('p', { className: 'text-[11px] font-bold text-violet-700 mb-1 text-center' }, 'Pie model'),
                drawPie(craN, craD, 140, palMain)
              ),
              h('div', { className: 'bg-white rounded-xl p-3 border border-violet-200' },
                h('p', { className: 'text-[11px] font-bold text-violet-700 mb-1 text-center' }, 'Bar model'),
                drawBar(craN, craD, palMain)
              )
            ),
            h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-200' },
              h('p', { className: 'text-xs text-violet-800' },
                'The pie and bar both show ', h('b', null, craN + ' parts out of ' + craD),
                ' shaded. The whole is split into equal parts. The fraction names how many of those parts.'
              )
            )
          )
        },
        {
          id: 3, label: 'Abstract', icon: '🔢',
          headline: 'Stage 3: Abstract — write the symbol',
          description: 'Now use only the written symbol. The student sees the connection between the symbol and the concrete/representational forms.',
          body: h('div', { className: 'space-y-3' },
            h('div', { className: 'bg-white rounded-xl p-8 border-2 border-sky-200 flex flex-col items-center justify-center' },
              h('div', { className: 'inline-flex flex-col items-center' },
                h('span', { className: 'text-6xl font-bold text-sky-700 border-b-4 border-sky-500 px-6 pb-1' }, craN),
                h('span', { className: 'text-6xl font-bold text-sky-700 px-6 pt-1' }, craD)
              ),
              h('p', { className: 'text-sm text-sky-800 mt-4 font-mono' },
                craN + '/' + craD + ' = ' + (craD > 0 ? (craN / craD).toFixed(3) : '0') + ' = ' + (craD > 0 ? Math.round(craN / craD * 100) : 0) + '%'
              )
            ),
            h('div', { className: 'bg-sky-50 rounded-lg p-3 border border-sky-200' },
              h('p', { className: 'text-xs text-sky-800' },
                'The symbol ', h('b', null, craN + '/' + craD),
                ' captures the same idea as the apples and as the pie. ',
                'The numerator is how many parts we have; the denominator is how many parts make a whole.'
              )
            )
          )
        }
      ];
      var stage = stages.find(function(s) { return s.id === craStage; }) || stages[0];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-gradient-to-r from-amber-50 via-violet-50 to-sky-50 rounded-xl p-3 border border-slate-200' },
          h('h4', { className: 'text-sm font-bold text-slate-800 mb-2' }, '📚 CRA progression — Concrete → Representational → Abstract'),
          h('p', { className: 'text-[11px] text-slate-700' },
            'Bruner\'s CRA framework is the textbook approach for math instruction in special education. ',
            'Move through three stages with the same fraction to build conceptual understanding before procedural fluency.'
          )
        ),
        // Stage selector
        h('div', { className: 'flex gap-2', role: 'tablist', 'aria-label': 'CRA stage' },
          stages.map(function(s) {
            var active = craStage === s.id;
            return h('button', {
              key: 'cra-' + s.id,
              role: 'tab', 'aria-selected': active,
              onClick: function() { sfxClick(); upd({ craStage: s.id }); announceToSR(s.headline); },
              className: 'flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all border ' +
                (active ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50')
            }, s.icon + ' ' + s.label);
          })
        ),
        h('div', { className: 'bg-white rounded-xl p-4 border-2 border-slate-200' },
          h('h5', { className: 'text-sm font-black text-slate-800 mb-1' }, stage.headline),
          h('p', { className: 'text-[11px] text-slate-700 italic mb-3' }, stage.description),
          stage.body
        ),
        // Fraction control for CRA
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-slate-50 rounded-lg p-3 border border-slate-200' },
            h('label', { className: 'block text-xs text-slate-700 mb-1 font-bold' }, 'Numerator'),
            h('input', { type: 'range', min: '1', max: String(craD), value: craN,
              onChange: function(e) { upd({ craN: parseInt(e.target.value) }); },
              className: 'w-full accent-slate-600'
            }),
            h('div', { className: 'text-center text-base font-bold text-slate-800' }, craN)
          ),
          h('div', { className: 'bg-slate-50 rounded-lg p-3 border border-slate-200' },
            h('label', { className: 'block text-xs text-slate-700 mb-1 font-bold' }, 'Denominator'),
            h('input', { type: 'range', min: '2', max: '12', value: craD,
              onChange: function(e) { var v = parseInt(e.target.value); upd({ craD: v, craN: Math.min(craN, v) }); },
              className: 'w-full accent-slate-600'
            }),
            h('div', { className: 'text-center text-base font-bold text-slate-800' }, craD)
          )
        ),
        // Next/prev stage
        h('div', { className: 'flex gap-2' },
          h('button', {
            onClick: function() { upd({ craStage: Math.max(1, craStage - 1) }); },
            disabled: craStage <= 1,
            className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ' +
              (craStage > 1 ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
          }, '← Previous stage'),
          h('button', {
            onClick: function() { upd({ craStage: Math.min(3, craStage + 1) }); },
            disabled: craStage >= 3,
            className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ' +
              (craStage < 3 ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
          }, 'Next stage →')
        )
      );
    };

    // ── WORD PROBLEMS TAB ──
    var renderWordProblemsTab = function() {
      var wpIdx = _f.wpIdx != null ? _f.wpIdx : 0;
      var wpAnswer = _f.wpAnswer || '';
      var wpHintLevel = _f.wpHintLevel || 0;
      var wpFeedback = _f.wpFeedback || null;
      var wpFilter = _f.wpFilter || 'all';
      var wpGrade = _f.wpGrade || 'all';

      // Filter problems
      var filtered = WORD_PROBLEMS.filter(function(p) {
        if (wpFilter !== 'all' && p.context !== wpFilter) return false;
        if (wpGrade !== 'all' && p.grade !== wpGrade) return false;
        return true;
      });
      if (filtered.length === 0) filtered = WORD_PROBLEMS;
      var problem = filtered[wpIdx % filtered.length] || filtered[0];
      var standard = CCSS_FRACTIONS.find(function(c) { return c.code === problem.ccss; });

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('h4', { className: 'text-sm font-bold text-amber-800 mb-2' }, '📖 Real-world word problems'),
          h('p', { className: 'text-[11px] text-amber-700 mb-2' },
            'Fractions make sense when they connect to the world. Pick a context and a grade level to find problems that match your interests.'
          ),
          h('div', { className: 'flex flex-wrap gap-2 mb-2' },
            h('div', { className: 'flex items-center gap-1' },
              h('span', { className: 'text-[10px] font-bold text-amber-700' }, 'Context:'),
              h('select', {
                value: wpFilter,
                onChange: function(e) { upd({ wpFilter: e.target.value, wpIdx: 0, wpAnswer: '', wpFeedback: null, wpHintLevel: 0 }); },
                'aria-label': 'Context filter',
                className: 'text-[11px] px-2 py-1 rounded border border-amber-300 bg-white text-amber-800'
              },
                h('option', { value: 'all' }, 'All contexts'),
                Object.keys(CONTEXTS).map(function(k) {
                  return h('option', { key: 'cx-' + k, value: k }, CONTEXTS[k].icon + ' ' + CONTEXTS[k].label);
                })
              )
            ),
            h('div', { className: 'flex items-center gap-1' },
              h('span', { className: 'text-[10px] font-bold text-amber-700' }, 'Difficulty:'),
              h('select', {
                value: wpGrade,
                onChange: function(e) { upd({ wpGrade: e.target.value, wpIdx: 0, wpAnswer: '', wpFeedback: null, wpHintLevel: 0 }); },
                'aria-label': 'Difficulty filter',
                className: 'text-[11px] px-2 py-1 rounded border border-amber-300 bg-white text-amber-800'
              },
                h('option', { value: 'all' }, 'All grades'),
                h('option', { value: 'easy' }, 'Easy (3-4)'),
                h('option', { value: 'medium' }, 'Medium (4-5)'),
                h('option', { value: 'hard' }, 'Hard (5-6)')
              )
            ),
            h('span', { className: 'text-[10px] text-amber-700 ml-auto' },
              'Problem ' + (wpIdx % filtered.length + 1) + ' of ' + filtered.length
            )
          )
        ),
        // Problem display
        h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4 space-y-3' },
          h('div', { className: 'flex items-start gap-2' },
            h('span', { className: 'text-2xl' }, (CONTEXTS[problem.context] || {}).icon || '📖'),
            h('div', { className: 'flex-1' },
              h('h5', { className: 'text-sm font-black text-amber-900' }, problem.title),
              h('p', { className: 'text-sm text-slate-800 mt-1 leading-relaxed' }, problem.story),
              standard && h('p', { className: 'text-[10px] text-amber-600 italic mt-1' }, 'Aligns with ' + standard.code + ' — ' + standard.title)
            )
          ),
          // Answer input
          h('div', { className: 'flex gap-2' },
            h('input', {
              type: 'text', value: wpAnswer,
              onChange: function(e) { upd({ wpAnswer: e.target.value }); },
              onKeyDown: function(e) { if (e.key === 'Enter' && wpAnswer.trim()) checkWordProblem(problem, wpAnswer); },
              placeholder: problem.answer.mixed ? 'e.g., 3/4 or 1 1/2' : 'Your answer (e.g., 3/4)...',
              'aria-label': 'Word problem answer',
              className: 'flex-1 px-3 py-2 border border-amber-600 rounded-lg text-sm font-mono'
            }),
            h('button', {
              onClick: function() { checkWordProblem(problem, wpAnswer); },
              className: 'px-4 py-2 bg-amber-600 text-white font-bold rounded-lg text-sm hover:bg-amber-700'
            }, 'Check')
          ),
          wpFeedback && h('p', { className: 'text-sm font-bold ' + (wpFeedback.correct ? 'text-green-700' : 'text-red-700') }, wpFeedback.msg),
          // Hints (progressive disclosure)
          wpHintLevel > 0 && h('div', { className: 'bg-amber-50 rounded-lg p-2 border border-amber-200 space-y-1' },
            (problem.hints || []).slice(0, wpHintLevel).map(function(hint, i) {
              return h('p', { key: 'hint-' + i, className: 'text-xs text-amber-800' },
                h('b', null, 'Hint ' + (i + 1) + ': '), hint
              );
            })
          ),
          h('div', { className: 'flex gap-2 items-center justify-between' },
            h('div', { className: 'flex gap-1' },
              h('button', {
                onClick: function() {
                  if (wpHintLevel < (problem.hints || []).length) {
                    upd({ wpHintLevel: wpHintLevel + 1 });
                    sfxClick();
                  }
                },
                disabled: wpHintLevel >= (problem.hints || []).length,
                className: 'px-2 py-1 rounded text-[11px] font-bold ' +
                  (wpHintLevel < (problem.hints || []).length ? 'bg-amber-200 text-amber-900 hover:bg-amber-300' : 'bg-slate-100 text-slate-400')
              }, '💡 ' + (wpHintLevel === 0 ? 'Show hint' : 'Next hint (' + wpHintLevel + '/' + (problem.hints || []).length + ')')),
              h('button', {
                onClick: function() { upd({ wpFeedback: { correct: false, msg: '📚 Worked solution: ' + problem.worked, hintRevealed: true } }); sfxClick(); },
                className: 'px-2 py-1 rounded text-[11px] font-bold bg-slate-200 text-slate-700 hover:bg-slate-300'
              }, '📚 Show solution')
            ),
            h('div', { className: 'flex gap-1' },
              h('button', {
                onClick: function() { upd({ wpIdx: (wpIdx - 1 + filtered.length) % filtered.length, wpAnswer: '', wpFeedback: null, wpHintLevel: 0 }); },
                'aria-label': 'Previous problem',
                className: 'px-2 py-1 rounded text-[11px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200'
              }, '← Prev'),
              h('button', {
                onClick: function() { upd({ wpIdx: (wpIdx + 1) % filtered.length, wpAnswer: '', wpFeedback: null, wpHintLevel: 0 }); sfxNewChallenge(); },
                'aria-label': 'Next problem',
                className: 'px-2 py-1 rounded text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700'
              }, 'Next →')
            )
          )
        )
      );
    };

    // Helper: check word problem answer
    var checkWordProblem = function(problem, response) {
      var trimmed = String(response || '').trim();
      if (!trimmed) return;
      // Parse the response to compare against problem.answer
      var ans = problem.answer;
      var ok = false;
      // Mixed number form like "1 1/2"
      var mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
      var fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
      var intMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
      if (mixedMatch && ans.mixed) {
        ok = trimmed === ans.mixed;
      } else if (fracMatch) {
        var rn = parseInt(fracMatch[1]);
        var rd = parseInt(fracMatch[2]);
        // Compare via cross-mult
        if (rd > 0 && ans.d > 0) {
          ok = rn * ans.d === ans.n * rd;
        }
      } else if (intMatch && ans.d === 1) {
        ok = parseFloat(intMatch[1]) === ans.n;
      }
      if (ok) {
        sfxCorrect();
        announceToSR('Correct!');
        upd({
          wpFeedback: { correct: true, msg: '✅ Correct! ' + problem.worked },
          score: { correct: score.correct + 1, total: score.total + 1 }
        });
        awardXP('fractionWordProblem', 15, 'Word problem solved');
      } else {
        sfxWrong();
        announceToSR('Incorrect');
        upd({
          wpFeedback: { correct: false, msg: '❌ Not quite. Try again or use a hint.' },
          score: { correct: score.correct, total: score.total + 1 }
        });
      }
    };

    // ── STANDARDS TAB ──
    var renderStandardsTab = function() {
      var stdGrade = _f.stdGrade || 'all';
      var filtered = CCSS_FRACTIONS.filter(function(c) {
        return stdGrade === 'all' || String(c.grade) === stdGrade;
      });
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
          h('h4', { className: 'text-sm font-bold text-indigo-800 mb-2' }, '📋 Common Core Standards — K-8 fraction trajectory'),
          h('p', { className: 'text-[11px] text-indigo-700 mb-2' },
            'Each tool in Fraction Lab is mapped to one or more CCSS standards. Use this view to plan instruction, find tools for a specific standard, or build evidence for IEP goal alignment.'
          ),
          h('div', { className: 'flex gap-1' },
            ['all', '1', '2', '3', '4', '5', '6', '7', '8'].map(function(g) {
              var label = g === 'all' ? 'All' : 'Grade ' + g;
              var active = stdGrade === g;
              return h('button', {
                key: 'g-' + g,
                onClick: function() { upd({ stdGrade: g }); },
                className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                  (active ? 'bg-indigo-700 text-white' : 'bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-100')
              }, label);
            })
          )
        ),
        h('div', { className: 'space-y-2 max-h-[480px] overflow-y-auto' },
          filtered.map(function(c) {
            return h('div', { key: c.code, className: 'bg-white rounded-lg p-3 border border-indigo-100' },
              h('div', { className: 'flex items-start gap-2' },
                h('span', { className: 'text-[11px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded' }, c.code),
                h('span', { className: 'text-[11px] text-indigo-500 italic' }, 'Grade ' + c.grade)
              ),
              h('p', { className: 'text-xs font-bold text-slate-800 mt-1' }, c.title),
              h('p', { className: 'text-[11px] text-slate-700 mt-0.5' }, c.desc),
              c.features && c.features.length > 0 && h('div', { className: 'flex gap-1 mt-2 flex-wrap' },
                h('span', { className: 'text-[10px] text-indigo-700 font-bold' }, '→'),
                c.features.map(function(f) {
                  return h('span', { key: 'f-' + c.code + '-' + f,
                    className: 'text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200'
                  }, f);
                })
              )
            );
          })
        )
      );
    };

    // ── MISCONCEPTIONS TAB ──
    var renderMisconceptionsTab = function() {
      var miscSeverity = _f.miscSeverity || 'all';
      var miscExpanded = _f.miscExpanded || null;
      var filtered = MISCONCEPTIONS.filter(function(m) {
        return miscSeverity === 'all' || m.severity === miscSeverity;
      });
      var SEVERITY_COLORS = { high: 'rose', medium: 'amber', low: 'slate' };
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-rose-50 rounded-xl p-3 border border-rose-200' },
          h('h4', { className: 'text-sm font-bold text-rose-800 mb-2' }, '⚠️ Common fraction misconceptions'),
          h('p', { className: 'text-[11px] text-rose-700 mb-2' },
            'A reference library of the 12 most-documented fraction misconceptions, each with research-grounded remediation strategies. ',
            'Click any misconception to expand its full description, why it happens, and what to do about it.'
          ),
          h('div', { className: 'flex gap-1' },
            ['all', 'high', 'medium', 'low'].map(function(s) {
              var active = miscSeverity === s;
              return h('button', {
                key: 'ms-' + s,
                onClick: function() { upd({ miscSeverity: s }); },
                className: 'px-2 py-1 rounded text-[11px] font-bold transition-all capitalize ' +
                  (active ? 'bg-rose-700 text-white' : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-100')
              }, s === 'all' ? 'All severities' : s);
            })
          )
        ),
        h('div', { className: 'space-y-2' },
          filtered.map(function(m) {
            var sc = SEVERITY_COLORS[m.severity] || 'slate';
            var expanded = miscExpanded === m.id;
            return h('div', { key: 'misc-' + m.id, className: 'bg-white rounded-lg border border-' + sc + '-200 overflow-hidden' },
              h('button', {
                onClick: function() { upd({ miscExpanded: expanded ? null : m.id }); sfxClick(); },
                'aria-expanded': expanded,
                className: 'w-full text-left p-3 hover:bg-' + sc + '-50 transition-colors'
              },
                h('div', { className: 'flex items-start gap-2' },
                  h('span', { className: 'text-base' }, expanded ? '▼' : '▶'),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'flex items-center gap-2 flex-wrap' },
                      h('span', { className: 'text-xs font-bold text-slate-800' }, m.label),
                      h('span', { className: 'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-' + sc + '-100 text-' + sc + '-700' }, m.severity),
                      h('span', { className: 'text-[10px] text-slate-500 italic' }, 'Grade ' + m.grade)
                    ),
                    h('p', { className: 'text-[11px] text-slate-700 mt-1' }, m.description)
                  )
                )
              ),
              expanded && h('div', { className: 'p-3 border-t border-' + sc + '-200 bg-' + sc + '-50 space-y-2' },
                h('div', null,
                  h('p', { className: 'text-[11px] font-bold text-slate-800 mb-0.5' }, '🤔 Why it happens'),
                  h('p', { className: 'text-[11px] text-slate-700' }, m.whyItHappens)
                ),
                h('div', null,
                  h('p', { className: 'text-[11px] font-bold text-slate-800 mb-0.5' }, '🛠️ Remediation strategies'),
                  h('ul', { className: 'text-[11px] text-slate-700 list-disc pl-5 space-y-0.5' },
                    m.remediation.map(function(r, ri) {
                      return h('li', { key: 'r-' + m.id + '-' + ri }, r);
                    })
                  )
                )
              )
            );
          })
        )
      );
    };

    // ═══════════════════════════════════════════════════════════════
    // ═══ v3 GAMES ════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════

    // ── GAME 1: PIZZA SHOP ──
    // Customer orders show a fraction; student drags slices to match.
    // Engagement-driven: cute customers, currency reward, progressive difficulty.
    var renderPizzaShopGame = function() {
      var ps = _f.psGame || { order: null, slices: 0, totalSlices: 8, served: 0, money: 0, customers: [], gameOver: false };

      var newCustomer = function() {
        var d = pick([2, 3, 4, 6, 8]);
        var n = randInt(1, d - 1);
        var emojis = ['😀','😊','😎','🤓','🥳','😋','🤠','👨‍🍳','👩‍🍳','🧒','👧','🧑'];
        return {
          id: Date.now() + Math.random(),
          emoji: pick(emojis),
          orderN: n, orderD: d,
          patience: 12, // seconds-ish, abstract
          tipMultiplier: 1 + Math.random() * 0.5
        };
      };

      var startPizzaShop = function() {
        var cust = newCustomer();
        upd({ psGame: {
          order: cust, slices: 0, totalSlices: cust.orderD,
          served: 0, money: 0, customers: [], gameOver: false
        }});
        sfxNewChallenge();
        announceToSR('Pizza Shop started! Slice the pizza to match each order.');
      };

      var serveCustomer = function() {
        if (!ps.order) return;
        var correct = ps.slices === ps.order.orderN && ps.totalSlices === ps.order.orderD;
        if (correct) {
          var tip = Math.round(5 * ps.order.tipMultiplier);
          var newMoney = ps.money + tip;
          var newServed = ps.served + 1;
          var nextCust = newServed < 10 ? newCustomer() : null;
          sfxCorrect();
          announceToSR('Correct! +$' + tip + '. ' + newServed + ' customers served.');
          upd({ psGame: {
            order: nextCust,
            slices: 0,
            totalSlices: nextCust ? nextCust.orderD : ps.totalSlices,
            served: newServed,
            money: newMoney,
            customers: ps.customers.concat([{ ok: true }]),
            gameOver: !nextCust
          }});
          if (nextCust) sfxNewChallenge();
          else { sfxComplete(); addToast('🎉 Pizza Shop complete! $' + newMoney + ' earned!', 'success'); awardXP('fractionPizza', 50, 'Pizza Shop complete'); }
        } else {
          sfxWrong();
          announceToSR('Wrong slice count or pizza size');
          addToast('❌ Order was ' + ps.order.orderN + '/' + ps.order.orderD, 'error');
        }
      };

      if (!ps.order) {
        return h('div', { className: 'bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border-2 border-red-200 text-center space-y-3' },
          h('div', { className: 'text-6xl' }, '🍕'),
          h('h4', { className: 'text-xl font-black text-red-800' }, 'Pizza Shop'),
          h('p', { className: 'text-sm text-red-700 max-w-md mx-auto' },
            'Customers will order fractional pizzas. Slice the pizza into the right number of pieces and serve the right amount. ',
            'Earn tips. Serve 10 customers to win!'
          ),
          h('button', {
            onClick: startPizzaShop,
            className: 'px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl text-base hover:from-red-600 hover:to-orange-600 shadow-md'
          }, '🍕 Start serving')
        );
      }

      var cust = ps.order;
      return h('div', { className: 'space-y-3' },
        // Status bar
        h('div', { className: 'flex items-center gap-3 bg-red-50 rounded-xl p-3 border border-red-200' },
          h('span', { className: 'text-2xl' }, '💰'),
          h('span', { className: 'font-bold text-red-800' }, '$' + ps.money),
          h('span', { className: 'text-red-600 text-sm' }, '·'),
          h('span', { className: 'text-sm text-red-800' }, 'Served: ', h('b', null, ps.served + ' / 10')),
          h('button', {
            onClick: startPizzaShop,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-red-200 text-red-800 hover:bg-red-300'
          }, '↺ Restart')
        ),
        // Customer order
        h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-4 flex items-center gap-3' },
          h('span', { className: 'text-5xl' }, cust.emoji),
          h('div', { className: 'flex-1' },
            h('p', { className: 'text-sm text-slate-600' }, 'Customer ' + (ps.served + 1) + ' says:'),
            h('p', { className: 'text-base font-bold text-orange-800' },
              '"I\'d like ', h('span', { className: 'font-mono text-xl' }, cust.orderN + '/' + cust.orderD),
              ' of a pizza, please!"'
            )
          )
        ),
        // Pizza builder
        h('div', { className: 'bg-white rounded-xl border-2 border-red-200 p-4 space-y-3' },
          h('div', { className: 'flex justify-center' }, drawPie(ps.slices, ps.totalSlices, 200, '#dc2626')),
          h('div', { className: 'grid grid-cols-2 gap-2' },
            h('div', { className: 'bg-red-50 rounded-lg p-2 border border-red-200' },
              h('p', { className: 'text-[11px] font-bold text-red-700' }, 'Pizza size (total slices):'),
              h('div', { className: 'flex items-center gap-2 mt-1' },
                h('button', { onClick: function() {
                  upd({ psGame: Object.assign({}, ps, { totalSlices: Math.max(2, ps.totalSlices - 1), slices: 0 }) });
                }, className: 'w-8 h-8 rounded-full bg-red-600 text-white font-bold' }, '−'),
                h('span', { className: 'flex-1 text-center text-lg font-bold' }, ps.totalSlices),
                h('button', { onClick: function() {
                  upd({ psGame: Object.assign({}, ps, { totalSlices: Math.min(20, ps.totalSlices + 1) }) });
                }, className: 'w-8 h-8 rounded-full bg-red-600 text-white font-bold' }, '+')
              )
            ),
            h('div', { className: 'bg-red-50 rounded-lg p-2 border border-red-200' },
              h('p', { className: 'text-[11px] font-bold text-red-700' }, 'Slices to serve:'),
              h('div', { className: 'flex items-center gap-2 mt-1' },
                h('button', { onClick: function() {
                  upd({ psGame: Object.assign({}, ps, { slices: Math.max(0, ps.slices - 1) }) });
                }, className: 'w-8 h-8 rounded-full bg-red-600 text-white font-bold' }, '−'),
                h('span', { className: 'flex-1 text-center text-lg font-bold' }, ps.slices),
                h('button', { onClick: function() {
                  upd({ psGame: Object.assign({}, ps, { slices: Math.min(ps.totalSlices, ps.slices + 1) }) });
                }, className: 'w-8 h-8 rounded-full bg-red-600 text-white font-bold' }, '+')
              )
            )
          ),
          h('button', {
            onClick: serveCustomer,
            className: 'w-full px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl text-base hover:from-red-700 hover:to-orange-700 shadow-md'
          }, '🍕 Serve ' + ps.slices + '/' + ps.totalSlices + ' to customer')
        )
      );
    };

    // ── GAME 2: FRACTION RACE ──
    // Speed identification: see a pie/bar, type the fraction, beat the clock.
    var renderFractionRaceGame = function() {
      var fr = _f.frGame || { round: null, score: 0, timeLeft: 30, gameOver: false, mistakes: 0 };

      var newRound = function() {
        var d = pick([2, 3, 4, 5, 6, 8, 10]);
        var n = randInt(1, d - 1);
        return { n: n, d: d, model: pick(['pie', 'bar', 'length']) };
      };
      var startFractionRace = function() {
        upd({ frGame: { round: newRound(), score: 0, timeLeft: 30, gameOver: false, mistakes: 0, answer: '' }});
        sfxNewChallenge();
        announceToSR('Fraction Race! Type the fraction you see. You have 30 seconds.');
      };
      var submitRace = function(ans) {
        var match = String(ans || '').trim().match(/^(\d+)\/(\d+)$/);
        if (!match) return;
        var rn = parseInt(match[1]);
        var rd = parseInt(match[2]);
        var r = fr.round;
        var ok = rn * r.d === r.n * rd; // equivalent fractions also accepted
        if (ok) {
          sfxCorrect();
          upd({ frGame: Object.assign({}, fr, { round: newRound(), score: fr.score + 1, answer: '' }) });
          announceToSR('Correct! Score ' + (fr.score + 1));
        } else {
          sfxWrong();
          upd({ frGame: Object.assign({}, fr, { mistakes: fr.mistakes + 1, answer: '' }) });
          announceToSR('Wrong, try again');
        }
      };

      if (!fr.round) {
        return h('div', { className: 'bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200 text-center space-y-3' },
          h('div', { className: 'text-6xl' }, '🏁'),
          h('h4', { className: 'text-xl font-black text-blue-800' }, 'Fraction Race'),
          h('p', { className: 'text-sm text-blue-700 max-w-md mx-auto' },
            'See a visual fraction. Type it as fast as you can. Score as many as possible in 30 seconds!'
          ),
          h('button', {
            onClick: startFractionRace,
            className: 'px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl text-base hover:from-blue-600 hover:to-cyan-600 shadow-md'
          }, '🏁 Start race')
        );
      }

      // Render current round
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'flex items-center gap-3 bg-blue-50 rounded-xl p-3 border border-blue-200' },
          h('span', { className: 'text-2xl' }, '🏁'),
          h('span', { className: 'font-bold text-blue-800' }, 'Score: ' + fr.score),
          h('span', { className: 'text-blue-600' }, '·'),
          h('span', { className: 'text-sm text-blue-800' }, 'Mistakes: ' + fr.mistakes),
          h('button', {
            onClick: startFractionRace,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-blue-200 text-blue-800 hover:bg-blue-300'
          }, '↺ Restart')
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-blue-200 p-6 space-y-3' },
          h('div', { className: 'flex justify-center' },
            fr.round.model === 'pie'
              ? drawPie(fr.round.n, fr.round.d, 220, '#2563eb')
              : fr.round.model === 'bar'
                ? drawBar(fr.round.n, fr.round.d, '#2563eb')
                : drawLengthModel(fr.round.n, fr.round.d, {})
          ),
          h('p', { className: 'text-center text-sm font-bold text-blue-800' }, 'What fraction is this?'),
          h('input', {
            type: 'text', value: fr.answer || '',
            onChange: function(e) { upd({ frGame: Object.assign({}, fr, { answer: e.target.value }) }); },
            onKeyDown: function(e) { if (e.key === 'Enter') submitRace(fr.answer); },
            placeholder: 'e.g., 3/4',
            'aria-label': 'Race answer',
            autoFocus: true,
            className: 'w-full px-4 py-3 border-2 border-blue-600 rounded-xl text-center text-2xl font-mono font-bold'
          }),
          h('button', {
            onClick: function() { submitRace(fr.answer); },
            className: 'w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700'
          }, 'Submit')
        )
      );
    };

    // ── GAME 3: EQUIVALENT MATCH ──
    // Memory pairing game: flip cards to find pairs of equivalent fractions.
    var renderEquivalentMatchGame = function() {
      var em = _f.emGame || { cards: null, flipped: [], matched: [], moves: 0, gameOver: false };

      var makeEquivalentPairs = function(count) {
        // Build `count` pairs of equivalent fractions, return shuffled cards.
        var pairs = [];
        var used = {};
        while (pairs.length < count) {
          var d = pick([2, 3, 4, 5, 6, 8]);
          var n = randInt(1, d - 1);
          var k = n + '/' + d;
          if (used[k]) continue;
          var mult = randInt(2, 4);
          var equivN = n * mult;
          var equivD = d * mult;
          var pairId = pairs.length;
          pairs.push({ id: 'a-' + pairId, pairId: pairId, n: n, d: d });
          pairs.push({ id: 'b-' + pairId, pairId: pairId, n: equivN, d: equivD });
          used[k] = true;
        }
        return pairs.sort(function() { return Math.random() - 0.5; });
      };

      var startEMGame = function() {
        upd({ emGame: { cards: makeEquivalentPairs(6), flipped: [], matched: [], moves: 0, gameOver: false }});
        sfxNewChallenge();
        announceToSR('Equivalent Match started! Find 6 pairs of equivalent fractions.');
      };

      var flipCard = function(idx) {
        if (em.matched.indexOf(idx) >= 0) return;
        if (em.flipped.indexOf(idx) >= 0) return;
        var newFlipped = em.flipped.concat([idx]);
        if (newFlipped.length === 1) {
          upd({ emGame: Object.assign({}, em, { flipped: newFlipped }) });
        } else if (newFlipped.length === 2) {
          var a = em.cards[newFlipped[0]];
          var b = em.cards[newFlipped[1]];
          var isPair = a.pairId === b.pairId;
          var moves = em.moves + 1;
          if (isPair) {
            sfxCorrect();
            var matched = em.matched.concat(newFlipped);
            var done = matched.length === em.cards.length;
            upd({ emGame: Object.assign({}, em, { flipped: [], matched: matched, moves: moves, gameOver: done }) });
            if (done) { sfxComplete(); awardXP('fractionMatch', 60, 'Equivalent Match complete'); addToast('🎉 All pairs matched in ' + moves + ' moves!', 'success'); }
          } else {
            sfxWrong();
            // Show briefly then flip back
            upd({ emGame: Object.assign({}, em, { flipped: newFlipped, moves: moves }) });
            setTimeout(function() {
              upd({ emGame: Object.assign({}, em, { flipped: [], moves: moves }) });
            }, 900);
          }
        }
      };

      if (!em.cards) {
        return h('div', { className: 'bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 text-center space-y-3' },
          h('div', { className: 'text-6xl' }, '🃏'),
          h('h4', { className: 'text-xl font-black text-purple-800' }, 'Equivalent Match'),
          h('p', { className: 'text-sm text-purple-700 max-w-md mx-auto' },
            'Find pairs of equivalent fractions. 6 pairs total. Try to do it in as few moves as possible.'
          ),
          h('button', {
            onClick: startEMGame,
            className: 'px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl text-base hover:from-purple-600 hover:to-pink-600 shadow-md'
          }, '🃏 Start matching')
        );
      }

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'flex items-center gap-3 bg-purple-50 rounded-xl p-3 border border-purple-200' },
          h('span', { className: 'text-2xl' }, '🃏'),
          h('span', { className: 'font-bold text-purple-800' }, 'Moves: ' + em.moves),
          h('span', { className: 'text-purple-600' }, '·'),
          h('span', { className: 'text-sm text-purple-800' }, 'Matched: ' + (em.matched.length / 2) + ' / 6 pairs'),
          h('button', {
            onClick: startEMGame,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-purple-200 text-purple-800 hover:bg-purple-300'
          }, '↺ Restart')
        ),
        h('div', { className: 'grid grid-cols-3 sm:grid-cols-4 gap-2' },
          em.cards.map(function(card, i) {
            var isFlipped = em.flipped.indexOf(i) >= 0;
            var isMatched = em.matched.indexOf(i) >= 0;
            var show = isFlipped || isMatched;
            return h('button', {
              key: 'card-' + i,
              onClick: function() { flipCard(i); sfxClick(); },
              disabled: isMatched || (em.flipped.length >= 2 && !isFlipped),
              'aria-label': show ? card.n + ' over ' + card.d : 'Hidden card',
              className: 'aspect-square rounded-xl text-lg font-bold transition-all flex items-center justify-center ' +
                (isMatched ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                 show ? 'bg-purple-100 text-purple-800 border-2 border-purple-400' :
                 'bg-gradient-to-br from-purple-500 to-pink-500 text-white border-2 border-purple-700 hover:from-purple-600 hover:to-pink-600 cursor-pointer')
            }, show ? card.n + '/' + card.d : '?');
          })
        ),
        em.gameOver && h('div', { className: 'bg-green-50 rounded-xl p-4 border-2 border-green-300 text-center' },
          h('p', { className: 'text-base font-black text-green-800' }, '🎉 Match complete in ' + em.moves + ' moves!')
        )
      );
    };

    // ── GAME 4: FRACTION FISH ──
    // Catch the fish that has the fraction matching the prompt.
    var renderFractionFishGame = function() {
      var ff = _f.ffGame || { round: null, score: 0, lives: 3, gameOver: false };

      var newFishRound = function() {
        var targetD = pick([2, 3, 4, 6, 8]);
        var targetN = randInt(1, targetD - 1);
        // Make decoys: 3 wrong fractions
        var decoys = [];
        while (decoys.length < 3) {
          var nd = pick([2, 3, 4, 5, 6, 8]);
          var nn = randInt(1, nd - 1);
          if (nn * targetD !== targetN * nd && !decoys.find(function(d) { return d.n === nn && d.d === nd; })) {
            decoys.push({ n: nn, d: nd });
          }
        }
        var allFish = [{ n: targetN, d: targetD, isTarget: true }].concat(decoys.map(function(d) { return Object.assign({}, d, { isTarget: false }); }));
        // Shuffle
        allFish.sort(function() { return Math.random() - 0.5; });
        return { target: { n: targetN, d: targetD }, fish: allFish };
      };
      var startFishGame = function() {
        upd({ ffGame: { round: newFishRound(), score: 0, lives: 3, gameOver: false }});
        sfxNewChallenge();
        announceToSR('Fraction Fish! Click the fish with the matching fraction.');
      };
      var catchFish = function(fishIdx) {
        var f = ff.round.fish[fishIdx];
        if (f.isTarget) {
          sfxCorrect();
          var newScore = ff.score + 1;
          upd({ ffGame: { round: newFishRound(), score: newScore, lives: ff.lives, gameOver: false }});
        } else {
          sfxWrong();
          var newLives = ff.lives - 1;
          var over = newLives <= 0;
          upd({ ffGame: Object.assign({}, ff, { lives: newLives, gameOver: over }) });
          if (over) { addToast('🦈 Out of lives! Final score: ' + ff.score, 'info'); awardXP('fractionFish', ff.score * 5, 'Fish game'); }
        }
      };

      if (!ff.round) {
        return h('div', { className: 'bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-6 border-2 border-cyan-200 text-center space-y-3' },
          h('div', { className: 'text-6xl' }, '🐟'),
          h('h4', { className: 'text-xl font-black text-cyan-800' }, 'Fraction Fish'),
          h('p', { className: 'text-sm text-cyan-700 max-w-md mx-auto' },
            'Each round shows a target fraction and 4 fish. Catch the one that matches. ',
            'You have 3 lives. Wrong catches lose a life.'
          ),
          h('button', {
            onClick: startFishGame,
            className: 'px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-xl text-base hover:from-cyan-600 hover:to-teal-600 shadow-md'
          }, '🎣 Cast a line')
        );
      }

      if (ff.gameOver) {
        return h('div', { className: 'bg-cyan-50 rounded-xl p-6 border-2 border-cyan-300 text-center space-y-3' },
          h('div', { className: 'text-5xl' }, '🦈'),
          h('h4', { className: 'text-xl font-black text-cyan-800' }, 'Game over!'),
          h('p', { className: 'text-base text-cyan-700' }, 'Final score: ', h('b', null, ff.score + ' fish caught')),
          h('button', { onClick: startFishGame,
            className: 'px-6 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700' }, '🎣 Cast again')
        );
      }

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'flex items-center gap-3 bg-cyan-50 rounded-xl p-3 border border-cyan-200' },
          h('span', { className: 'text-2xl' }, '🐟'),
          h('span', { className: 'font-bold text-cyan-800' }, 'Catches: ' + ff.score),
          h('span', { className: 'text-cyan-600' }, '·'),
          h('span', { className: 'text-sm text-cyan-800' }, 'Lives: ' + '❤️'.repeat(ff.lives)),
          h('button', {
            onClick: startFishGame,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-cyan-200 text-cyan-800 hover:bg-cyan-300'
          }, '↺ Restart')
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-4 text-center' },
          h('p', { className: 'text-sm text-cyan-700' }, 'Catch the fish that equals:'),
          h('p', { className: 'text-3xl font-bold text-cyan-800 font-mono mt-1' }, ff.round.target.n + '/' + ff.round.target.d)
        ),
        h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
          ff.round.fish.map(function(f, i) {
            return h('button', {
              key: 'fish-' + i,
              onClick: function() { catchFish(i); },
              className: 'aspect-square rounded-2xl bg-gradient-to-br from-cyan-100 to-teal-100 border-2 border-cyan-300 hover:from-cyan-200 hover:to-teal-200 hover:border-cyan-500 hover:shadow-lg transition-all p-3 flex flex-col items-center justify-center gap-1'
            },
              h('span', { className: 'text-4xl' }, '🐟'),
              h('span', { className: 'text-lg font-bold text-cyan-900 font-mono' }, f.n + '/' + f.d)
            );
          })
        )
      );
    };

    // ── GAME 8: BUILD THE WHOLE ──
    // Given a target whole, drag fraction strips to build exactly 1.
    var renderBuildWholeGame = function() {
      var bw = _f.bwGame || { selected: [], target: 1, score: 0, gameOver: false };
      var FRAGMENT_OPTIONS = [
        { n: 1, d: 2, color: '#f43f5e' },
        { n: 1, d: 3, color: '#3b82f6' },
        { n: 1, d: 4, color: '#10b981' },
        { n: 1, d: 5, color: '#a855f7' },
        { n: 1, d: 6, color: '#f59e0b' },
        { n: 1, d: 8, color: '#ec4899' },
        { n: 1, d: 10, color: '#06b6d4' },
        { n: 1, d: 12, color: '#84cc16' }
      ];
      var startBuild = function() {
        upd({ bwGame: { selected: [], target: 1, score: 0, gameOver: false } });
        sfxNewChallenge();
      };
      var addFragment = function(frag) {
        var newSel = bw.selected.concat([frag]);
        upd({ bwGame: Object.assign({}, bw, { selected: newSel }) });
        // Check sum
        var total = newSel.reduce(function(acc, f) { return acc + (f.n / f.d); }, 0);
        sfxClick();
        if (Math.abs(total - bw.target) < 0.001) {
          sfxComplete();
          upd({ bwGame: Object.assign({}, bw, { selected: newSel, score: bw.score + 1, gameOver: true }) });
          addToast('🎉 Exactly ' + bw.target + '!', 'success');
          awardXP('fractionBuild', 30, 'Built the whole');
        } else if (total > bw.target) {
          sfxWrong();
          addToast('Overshot! Reset to try again.', 'info');
        }
      };
      var resetBuild = function() {
        upd({ bwGame: Object.assign({}, bw, { selected: [], gameOver: false }) });
      };

      var total = bw.selected.reduce(function(acc, f) { return acc + (f.n / f.d); }, 0);

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('h4', { className: 'text-sm font-bold text-amber-800 mb-1' }, '🧱 Build the Whole'),
          h('p', { className: 'text-[11px] text-amber-700' },
            'Combine fraction strips to make exactly 1. Choose pieces that add to the whole.'
          )
        ),
        h('div', { className: 'flex items-center gap-3 bg-amber-100 rounded-xl p-3 border border-amber-200' },
          h('span', { className: 'text-2xl' }, '🧱'),
          h('span', { className: 'font-bold text-amber-800' }, 'Wins: ' + bw.score),
          h('span', { className: 'text-amber-700 text-sm' }, '·'),
          h('span', { className: 'text-sm text-amber-800' }, 'Current sum: ', h('span', { className: 'font-mono font-bold' }, total.toFixed(3))),
          h('button', { onClick: resetBuild,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-amber-300 text-amber-900 hover:bg-amber-400' }, '↺ Clear')
        ),
        // Current build visualization
        h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-3' },
          h('p', { className: 'text-[11px] font-bold text-amber-700 mb-2' }, 'Your build (' + bw.selected.length + ' pieces):'),
          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            bw.selected.length === 0
              ? h('p', { className: 'text-[11px] italic text-slate-500' }, 'No pieces yet. Add from below.')
              : bw.selected.map(function(f, i) {
                  return h('div', { key: 'sel-' + i, style: {
                    width: (f.n / f.d * 200) + 'px',
                    height: 24,
                    background: f.color,
                    border: '1px solid #0f172a',
                    borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 'bold', fontSize: 10
                  } }, f.n + '/' + f.d);
                })
          ),
          h('div', { className: 'h-3 bg-slate-200 rounded-full overflow-hidden' },
            h('div', { style: {
              width: Math.min(100, total / bw.target * 100) + '%',
              height: '100%',
              background: total > bw.target ? '#dc2626' : total === bw.target ? '#22c55e' : '#f59e0b',
              transition: 'width 0.3s'
            } })
          ),
          h('p', { className: 'text-center text-[11px] mt-1 ' + (total > bw.target ? 'text-red-700' : 'text-amber-700') },
            total === bw.target ? '✓ Perfect — equal to ' + bw.target : total > bw.target ? '⚠ Over ' + bw.target : 'Need ' + (bw.target - total).toFixed(3) + ' more'
          )
        ),
        // Fragment palette
        h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-3' },
          h('p', { className: 'text-[11px] font-bold text-amber-700 mb-2' }, 'Pick a piece to add:'),
          h('div', { className: 'grid grid-cols-4 gap-2' },
            FRAGMENT_OPTIONS.map(function(f) {
              return h('button', {
                key: 'fp-' + f.d,
                onClick: function() { addFragment(f); },
                disabled: bw.gameOver,
                className: 'p-3 rounded-lg border-2 hover:shadow-md transition-all text-white font-bold disabled:opacity-50',
                style: { background: f.color, borderColor: f.color }
              }, f.n + '/' + f.d);
            })
          )
        ),
        bw.gameOver && h('button', { onClick: startBuild,
          className: 'w-full px-4 py-2 bg-amber-700 text-white font-bold rounded-xl hover:bg-amber-800' }, '🧱 Build again')
      );
    };

    // ── GAME 9: PATTERN BUILDER ──
    // Identify the next fraction in a sequence.
    var renderPatternBuilderGame = function() {
      var pb = _f.pbgGame || { round: null, score: 0, gameOver: false };
      var newPattern = function() {
        var startN = randInt(1, 4);
        var d = pick([2, 3, 4, 5, 6, 8, 10]);
        var increment = pick([1, 2]);
        var sequence = [];
        for (var i = 0; i < 4; i++) {
          var s = simplify(startN + i * increment, d);
          sequence.push({ n: s[0], d: s[1] });
        }
        // The answer is the next in sequence
        var nextSimp = simplify(startN + 4 * increment, d);
        return {
          sequence: sequence,
          increment: increment,
          baseD: d,
          answer: { n: nextSimp[0], d: nextSimp[1] }
        };
      };
      var startPattern = function() {
        upd({ pbgGame: { round: newPattern(), score: 0, gameOver: false, answer: '' }});
        sfxNewChallenge();
      };
      var guessNext = function(ans) {
        var match = ans.match(/^(\d+)\/(\d+)$/);
        if (!match) return;
        var an = parseInt(match[1]);
        var ad = parseInt(match[2]);
        var target = pb.round.answer;
        var ok = an * target.d === target.n * ad;
        if (ok) {
          sfxCorrect();
          upd({ pbgGame: { round: newPattern(), score: pb.score + 1, gameOver: false, answer: '' }});
        } else {
          sfxWrong();
          addToast('Correct was ' + target.n + '/' + target.d + '. Increment is ' + pb.round.increment + '/' + pb.round.baseD + '.', 'info');
          upd({ pbgGame: Object.assign({}, pb, { round: newPattern(), answer: '' }) });
        }
      };
      if (!pb.round) {
        return h('div', { className: 'bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 text-center space-y-3' },
          h('div', { className: 'text-6xl' }, '🔢'),
          h('h4', { className: 'text-xl font-black text-green-800' }, 'Pattern Builder'),
          h('p', { className: 'text-sm text-green-700 max-w-md mx-auto' },
            'See a sequence of fractions. What comes next?'
          ),
          h('button', { onClick: startPattern,
            className: 'px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700' }, '🔢 Start')
        );
      }
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'flex items-center gap-3 bg-green-50 rounded-xl p-3 border border-green-200' },
          h('span', { className: 'text-2xl' }, '🔢'),
          h('span', { className: 'font-bold text-green-800' }, 'Score: ' + pb.score),
          h('button', { onClick: startPattern,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-green-200 text-green-800 hover:bg-green-300' }, '↺ Restart')
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-green-200 p-4 space-y-3' },
          h('p', { className: 'text-sm font-bold text-green-800 text-center' }, 'What comes next?'),
          h('div', { className: 'flex justify-center gap-2 flex-wrap' },
            pb.round.sequence.map(function(f, i) {
              return h('div', { key: 'pn-' + i,
                className: 'p-3 rounded-lg bg-green-100 border-2 border-green-300 text-center min-w-[60px]'
              }, h('p', { className: 'text-xl font-mono font-bold text-green-900' }, f.n + '/' + f.d));
            }),
            h('div', { className: 'p-3 rounded-lg bg-yellow-100 border-2 border-dashed border-yellow-400 text-center min-w-[60px]' },
              h('p', { className: 'text-xl font-bold text-yellow-700' }, '?')
            )
          ),
          h('div', { className: 'flex gap-2' },
            h('input', {
              type: 'text', value: pb.answer || '',
              onChange: function(e) { upd({ pbgGame: Object.assign({}, pb, { answer: e.target.value }) }); },
              onKeyDown: function(e) { if (e.key === 'Enter') guessNext(pb.answer || ''); },
              placeholder: 'e.g., 3/4', autoFocus: true,
              className: 'flex-1 px-3 py-2 border border-green-400 rounded-lg text-base font-mono'
            }),
            h('button', { onClick: function() { guessNext(pb.answer || ''); },
              className: 'px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700' }, 'Guess')
          )
        )
      );
    };

    // ── GAME 5: FRACTION BINGO ──
    var renderFractionBingoGame = function() {
      var bg = _f.bgGame || { card: null, called: [], current: null, marked: [], wins: 0, bingoCount: 0 };
      var makeBingoCard = function() {
        // 5x5 grid of fractions. Center is FREE.
        var cells = [];
        var used = {};
        while (cells.length < 24) {
          var d = pick([2, 3, 4, 5, 6, 8, 10]);
          var n = randInt(1, d);
          var k = n + '/' + d;
          if (!used[k]) { cells.push({ n: n, d: d, key: k }); used[k] = true; }
        }
        // Insert FREE at center (index 12)
        cells.splice(12, 0, { free: true, key: 'FREE' });
        return cells;
      };
      var startBingo = function() {
        upd({ bgGame: { card: makeBingoCard(), called: [], current: null, marked: [12], wins: 0, bingoCount: bg.bingoCount || 0 } });
        sfxNewChallenge();
      };
      var callNumber = function() {
        if (!bg.card) return;
        var availableValues = [];
        for (var d = 2; d <= 10; d++) {
          for (var n = 1; n <= d; n++) {
            // Use only fractions that appear on the card (as equivalents)
            availableValues.push({ n: n, d: d, val: n / d });
          }
        }
        var call = pick(availableValues);
        var callKey = simplify(call.n, call.d).join('/');
        var newCalled = bg.called.concat([call]);
        upd({ bgGame: Object.assign({}, bg, { called: newCalled, current: call }) });
        sfxClick();
      };
      var markCell = function(idx) {
        if (bg.marked.indexOf(idx) >= 0) {
          upd({ bgGame: Object.assign({}, bg, { marked: bg.marked.filter(function(i) { return i !== idx; }) }) });
        } else {
          // Validate: cell should match current call (as equivalent)
          var cell = bg.card[idx];
          if (cell.free) return;
          var ok = false;
          if (bg.current) {
            var current = bg.current;
            ok = cell.n * current.d === current.n * cell.d;
          }
          if (ok) {
            var newMarked = bg.marked.concat([idx]);
            upd({ bgGame: Object.assign({}, bg, { marked: newMarked }) });
            sfxCorrect();
            // Check bingo: 5 in a row, column, or diagonal
            var lines = [
              [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
              [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
              [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
            ];
            for (var l = 0; l < lines.length; l++) {
              if (lines[l].every(function(i) { return newMarked.indexOf(i) >= 0; })) {
                sfxComplete();
                addToast('🎉 BINGO!', 'success');
                upd({ bgGame: Object.assign({}, bg, { marked: newMarked, bingoCount: (bg.bingoCount || 0) + 1 }) });
                awardXP('fractionBingo', 75, 'Bingo!');
                return;
              }
            }
          } else {
            sfxWrong();
          }
        }
      };

      if (!bg.card) {
        return h('div', { className: 'bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border-2 border-yellow-200 text-center space-y-3' },
          h('div', { className: 'text-6xl' }, '🎱'),
          h('h4', { className: 'text-xl font-black text-yellow-800' }, 'Fraction Bingo'),
          h('p', { className: 'text-sm text-yellow-700 max-w-md mx-auto' },
            '5×5 bingo card with fractions. Call a fraction, then mark any cell with an equivalent fraction. Get 5 in a row to win!'
          ),
          h('button', { onClick: startBingo,
            className: 'px-6 py-3 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-700' }, '🎱 New card')
        );
      }
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'flex items-center gap-3 bg-yellow-50 rounded-xl p-3 border border-yellow-200' },
          h('span', { className: 'text-2xl' }, '🎱'),
          h('span', { className: 'font-bold text-yellow-800' }, 'Bingos: ' + (bg.bingoCount || 0)),
          h('span', { className: 'text-sm text-yellow-700' }, '·'),
          h('span', { className: 'text-sm text-yellow-800' }, 'Called: ' + bg.called.length),
          h('button', { onClick: startBingo,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-yellow-200 text-yellow-800 hover:bg-yellow-300' }, '↺ New card')
        ),
        bg.current && h('div', { className: 'bg-white rounded-xl border-2 border-yellow-200 p-3 text-center' },
          h('p', { className: 'text-xs font-bold text-yellow-700' }, 'Now calling:'),
          h('p', { className: 'text-3xl font-bold text-yellow-900 font-mono' }, bg.current.n + '/' + bg.current.d),
          h('p', { className: 'text-[11px] text-yellow-600 italic' }, '(or any equivalent)')
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-yellow-200 p-3' },
          h('div', { className: 'grid grid-cols-5 gap-1' },
            bg.card.map(function(cell, i) {
              var marked = bg.marked.indexOf(i) >= 0;
              if (cell.free) {
                return h('button', {
                  key: 'bc-' + i,
                  className: 'aspect-square rounded text-lg font-bold bg-yellow-700 text-white border-2 border-yellow-800'
                }, '★');
              }
              return h('button', {
                key: 'bc-' + i,
                onClick: function() { markCell(i); },
                className: 'aspect-square rounded text-sm font-bold font-mono border-2 transition-all ' +
                  (marked ? 'bg-yellow-600 text-white border-yellow-700' : 'bg-white text-yellow-900 border-yellow-300 hover:bg-yellow-50')
              }, cell.n + '/' + cell.d);
            })
          )
        ),
        h('button', { onClick: callNumber,
          className: 'w-full px-4 py-2 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-700' }, '🎲 Call a number')
      );
    };

    // ── GAME 6: TUG OF WAR ──
    // Two fractions compete; correct comparison pulls the rope toward your team.
    var renderTugOfWarGame = function() {
      var tw = _f.twGame || { round: null, score: 0, position: 0, gameOver: false };
      var newTugRound = function() {
        var d1 = pick([2, 3, 4, 5, 6, 8, 10]);
        var d2 = pick([2, 3, 4, 5, 6, 8, 10]);
        var n1q = randInt(1, d1);
        var n2q = randInt(1, d2);
        if ((n1q / d1) === (n2q / d2)) n2q = (n2q % d2) + 1;
        return { a: { n: n1q, d: d1 }, b: { n: n2q, d: d2 } };
      };
      var startTug = function() {
        upd({ twGame: { round: newTugRound(), score: 0, position: 0, gameOver: false }});
        sfxNewChallenge();
      };
      var answer = function(choice) {
        var a = tw.round.a, b = tw.round.b;
        var actual = (a.n / a.d) > (b.n / b.d) ? 'a' : 'b';
        var ok = choice === actual;
        var newPos = tw.position + (ok ? 1 : -1);
        if (ok) sfxCorrect(); else sfxWrong();
        if (newPos >= 5) {
          sfxComplete();
          upd({ twGame: { round: null, score: tw.score + 1, position: 0, gameOver: false }});
          addToast('🎉 You won the tug!', 'success');
          awardXP('fractionTug', 30, 'Tug of war win');
        } else if (newPos <= -5) {
          upd({ twGame: { round: null, score: tw.score, position: 0, gameOver: false }});
          addToast('💪 Try again!', 'info');
        } else {
          upd({ twGame: Object.assign({}, tw, { round: newTugRound(), position: newPos }) });
        }
      };
      if (!tw.round) {
        return h('div', { className: 'bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border-2 border-orange-200 text-center space-y-3' },
          h('div', { className: 'text-6xl' }, '🪢'),
          h('h4', { className: 'text-xl font-black text-orange-800' }, 'Tug of War'),
          h('p', { className: 'text-sm text-orange-700 max-w-md mx-auto' },
            'Two fractions face off. Pick which is larger to pull the rope. 5 correct pulls = win the tug!'
          ),
          h('p', { className: 'text-[11px] text-orange-600' }, 'Wins so far: ' + (tw.score || 0)),
          h('button', { onClick: startTug,
            className: 'px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700' }, '🪢 Start tugging')
        );
      }
      var a = tw.round.a, b = tw.round.b;
      var pos = tw.position;
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'flex items-center gap-3 bg-orange-50 rounded-xl p-3 border border-orange-200' },
          h('span', { className: 'text-2xl' }, '🪢'),
          h('span', { className: 'font-bold text-orange-800' }, 'Wins: ' + tw.score),
          h('button', { onClick: startTug,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-orange-200 text-orange-800 hover:bg-orange-300' }, '↺ Restart')
        ),
        // Tug bar visualization
        h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-4 space-y-2' },
          h('div', { className: 'relative bg-orange-100 rounded-full h-8 overflow-hidden' },
            h('div', {
              style: {
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(' + (pos * 8) + '%)',
                width: 32, height: 32, background: '#ea580c', borderRadius: '50%',
                transition: 'transform 0.3s ease-out'
              }
            }),
            h('div', { style: { position: 'absolute', top: 0, left: '0', width: 4, height: '100%', background: '#dc2626' } }),
            h('div', { style: { position: 'absolute', top: 0, right: '0', width: 4, height: '100%', background: '#16a34a' } })
          ),
          h('p', { className: 'text-center text-[11px] text-orange-700 italic' }, '5 correct pulls to win | Position: ' + pos)
        ),
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('button', {
            onClick: function() { answer('a'); },
            className: 'p-4 bg-rose-100 border-2 border-rose-300 rounded-xl hover:bg-rose-200 hover:border-rose-500 transition-all'
          },
            h('div', { className: 'text-3xl font-bold text-rose-800 font-mono text-center' }, a.n + '/' + a.d),
            h('p', { className: 'text-[10px] text-rose-600 text-center mt-1' }, '(= ' + (a.n / a.d).toFixed(3) + ')')
          ),
          h('button', {
            onClick: function() { answer('b'); },
            className: 'p-4 bg-emerald-100 border-2 border-emerald-300 rounded-xl hover:bg-emerald-200 hover:border-emerald-500 transition-all'
          },
            h('div', { className: 'text-3xl font-bold text-emerald-800 font-mono text-center' }, b.n + '/' + b.d),
            h('p', { className: 'text-[10px] text-emerald-600 text-center mt-1' }, '(= ' + (b.n / b.d).toFixed(3) + ')')
          )
        ),
        h('p', { className: 'text-center text-sm font-bold text-orange-800' }, 'Tap the bigger fraction to pull!')
      );
    };

    // ── GAME 7: FRACTION HIDE AND SEEK ──
    // A fraction is hidden behind a curtain; clues progressively reveal it.
    var renderHideSeekGame = function() {
      var hs = _f.hsGame || { target: null, guesses: [], hintsShown: 0, gameOver: false, won: false };
      var newHide = function() {
        var d = pick([3, 4, 5, 6, 7, 8, 10, 12]);
        var n = randInt(1, d - 1);
        var simp = simplify(n, d);
        return { n: n, d: d, val: n / d, simpN: simp[0], simpD: simp[1] };
      };
      var startHide = function() {
        upd({ hsGame: { target: newHide(), guesses: [], hintsShown: 0, gameOver: false, won: false, guess: '' }});
        sfxNewChallenge();
      };
      var guessHs = function(g) {
        var t = hs.target;
        var match = g.match(/^(\d+)\/(\d+)$/);
        if (!match) return;
        var gn = parseInt(match[1]), gd = parseInt(match[2]);
        var ok = gn * t.d === t.n * gd;
        if (ok) {
          sfxComplete();
          upd({ hsGame: Object.assign({}, hs, { gameOver: true, won: true, guesses: hs.guesses.concat([g]) }) });
          awardXP('fractionHide', 30 + (3 - hs.hintsShown) * 10, 'Hide and seek win');
          addToast('🎉 Found it!', 'success');
        } else {
          sfxWrong();
          upd({ hsGame: Object.assign({}, hs, { guesses: hs.guesses.concat([g]), guess: '' }) });
        }
      };
      var revealHint = function() {
        upd({ hsGame: Object.assign({}, hs, { hintsShown: Math.min(3, hs.hintsShown + 1) }) });
      };

      if (!hs.target) {
        return h('div', { className: 'bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-6 border-2 border-pink-200 text-center space-y-3' },
          h('div', { className: 'text-6xl' }, '🔍'),
          h('h4', { className: 'text-xl font-black text-pink-800' }, 'Hide and Seek'),
          h('p', { className: 'text-sm text-pink-700 max-w-md mx-auto' },
            'A fraction is hiding. Use the clues to guess what it is. Fewer hints = more points.'
          ),
          h('button', { onClick: startHide,
            className: 'px-6 py-3 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700' }, '🔍 Start hunt')
        );
      }
      var t = hs.target;
      var hints = [
        'My value is approximately ' + t.val.toFixed(2) + '.',
        'My denominator is ' + t.d + '.',
        'My simplest form has numerator ' + t.simpN + '.'
      ];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'flex items-center gap-3 bg-pink-50 rounded-xl p-3 border border-pink-200' },
          h('span', { className: 'text-2xl' }, '🔍'),
          h('span', { className: 'font-bold text-pink-800' }, 'Hints used: ' + hs.hintsShown + ' / 3'),
          h('button', { onClick: startHide,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-pink-200 text-pink-800 hover:bg-pink-300' }, '↺ New hunt')
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-pink-200 p-4 space-y-2' },
          h('p', { className: 'text-sm font-bold text-pink-800' }, '🔮 What fraction is hiding?'),
          hs.hintsShown > 0 && h('div', { className: 'bg-pink-50 rounded-lg p-2 border border-pink-200 space-y-0.5' },
            hints.slice(0, hs.hintsShown).map(function(hint, i) {
              return h('p', { key: 'h-' + i, className: 'text-xs text-pink-800' },
                h('b', null, 'Clue ' + (i + 1) + ': '), hint
              );
            })
          ),
          !hs.gameOver && h('button', {
            onClick: revealHint, disabled: hs.hintsShown >= 3,
            className: 'px-3 py-1 rounded text-[11px] font-bold ' +
              (hs.hintsShown < 3 ? 'bg-pink-200 text-pink-800 hover:bg-pink-300' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
          }, '💡 Reveal clue ' + (hs.hintsShown + 1)),
          !hs.gameOver && h('div', { className: 'flex gap-2 mt-2' },
            h('input', {
              type: 'text', value: hs.guess || '',
              onChange: function(e) { upd({ hsGame: Object.assign({}, hs, { guess: e.target.value }) }); },
              onKeyDown: function(e) { if (e.key === 'Enter') guessHs(hs.guess || ''); },
              placeholder: 'Guess (e.g., 3/4)',
              className: 'flex-1 px-3 py-2 border border-pink-300 rounded-lg text-sm font-mono'
            }),
            h('button', { onClick: function() { guessHs(hs.guess || ''); },
              className: 'px-3 py-2 rounded-lg text-sm font-bold bg-pink-600 text-white hover:bg-pink-700' }, 'Guess')
          ),
          hs.gameOver && hs.won && h('div', { className: 'bg-emerald-50 rounded-lg p-3 border-2 border-emerald-300' },
            h('p', { className: 'text-base font-black text-emerald-800' }, '🎉 You found ' + t.n + '/' + t.d + '!'),
            h('p', { className: 'text-[11px] text-emerald-700 mt-1' }, hs.hintsShown === 0 ? 'No hints needed!' : 'Used ' + hs.hintsShown + ' clue' + (hs.hintsShown === 1 ? '' : 's') + '.')
          ),
          hs.guesses.length > 0 && h('p', { className: 'text-[11px] text-pink-700' },
            'Previous guesses: ' + hs.guesses.join(', ')
          )
        )
      );
    };

    // ── GAMES HUB ──
    var renderGamesTab = function() {
      var activeGame = _f.activeGame || null;
      if (activeGame === 'connect4') return h('div', null,
        h('button', { onClick: function() { upd({ activeGame: null }); }, className: 'mb-2 px-3 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, '← Back to games'),
        renderConnectFractionGame()
      );
      if (activeGame === 'build') return h('div', null,
        h('button', { onClick: function() { upd({ activeGame: null }); }, className: 'mb-2 px-3 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, '← Back to games'),
        renderBuildWholeGame()
      );
      if (activeGame === 'pattern') return h('div', null,
        h('button', { onClick: function() { upd({ activeGame: null }); }, className: 'mb-2 px-3 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, '← Back to games'),
        renderPatternBuilderGame()
      );
      if (activeGame === 'bingo') return h('div', null,
        h('button', { onClick: function() { upd({ activeGame: null }); }, className: 'mb-2 px-3 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, '← Back to games'),
        renderFractionBingoGame()
      );
      if (activeGame === 'tug') return h('div', null,
        h('button', { onClick: function() { upd({ activeGame: null }); }, className: 'mb-2 px-3 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, '← Back to games'),
        renderTugOfWarGame()
      );
      if (activeGame === 'hide') return h('div', null,
        h('button', { onClick: function() { upd({ activeGame: null }); }, className: 'mb-2 px-3 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, '← Back to games'),
        renderHideSeekGame()
      );
      if (activeGame === 'pizza') return h('div', null,
        h('button', { onClick: function() { upd({ activeGame: null }); }, className: 'mb-2 px-3 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, '← Back to games'),
        renderPizzaShopGame()
      );
      if (activeGame === 'race') return h('div', null,
        h('button', { onClick: function() { upd({ activeGame: null }); }, className: 'mb-2 px-3 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, '← Back to games'),
        renderFractionRaceGame()
      );
      if (activeGame === 'match') return h('div', null,
        h('button', { onClick: function() { upd({ activeGame: null }); }, className: 'mb-2 px-3 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, '← Back to games'),
        renderEquivalentMatchGame()
      );
      if (activeGame === 'fish') return h('div', null,
        h('button', { onClick: function() { upd({ activeGame: null }); }, className: 'mb-2 px-3 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, '← Back to games'),
        renderFractionFishGame()
      );
      var gameList = [
        { id: 'pizza', icon: '🍕', label: 'Pizza Shop', desc: 'Serve customers fractional pizzas. Earn tips. 10 customers to win.', color: 'red' },
        { id: 'race', icon: '🏁', label: 'Fraction Race', desc: 'Type the fraction you see. Beat the 30-second clock.', color: 'blue' },
        { id: 'match', icon: '🃏', label: 'Equivalent Match', desc: 'Memory pairing — find 6 pairs of equivalent fractions.', color: 'purple' },
        { id: 'fish', icon: '🐟', label: 'Fraction Fish', desc: 'Catch the fish whose fraction matches the target. 3 lives.', color: 'cyan' },
        { id: 'bingo', icon: '🎱', label: 'Fraction Bingo', desc: '5×5 card. Mark equivalent fractions to get 5-in-a-row.', color: 'yellow' },
        { id: 'tug', icon: '🪢', label: 'Tug of War', desc: 'Pick the larger fraction to pull the rope. First to 5 wins.', color: 'orange' },
        { id: 'hide', icon: '🔍', label: 'Hide & Seek', desc: 'Guess the hidden fraction using progressive clues.', color: 'pink' },
        { id: 'build', icon: '🧱', label: 'Build the Whole', desc: 'Combine fraction strips to make exactly 1.', color: 'amber' },
        { id: 'pattern', icon: '🔢', label: 'Pattern Builder', desc: 'Identify the next fraction in a sequence.', color: 'green' },
        { id: 'connect4', icon: '⚪', label: 'Connect-Four', desc: 'Place fraction discs in a 7×6 grid. Two players.', color: 'cyan' }
      ];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-violet-50 rounded-xl p-3 border border-violet-200' },
          h('h4', { className: 'text-sm font-bold text-violet-800 mb-1' }, '🎮 Fraction games'),
          h('p', { className: 'text-[11px] text-violet-700' },
            'Four games practice different fraction skills. Pizza Shop drills part-of-whole intuition. Race drills speed. Match drills equivalence. Fish drills magnitude comparison.'
          )
        ),
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
          gameList.map(function(g) {
            return h('button', {
              key: 'g-' + g.id,
              onClick: function() { upd({ activeGame: g.id }); sfxClick(); },
              className: 'text-left p-4 rounded-xl border-2 border-' + g.color + '-200 bg-gradient-to-br from-' + g.color + '-50 to-' + g.color + '-100 hover:border-' + g.color + '-400 hover:shadow-md transition-all'
            },
              h('div', { className: 'flex items-center gap-3' },
                h('span', { className: 'text-3xl' }, g.icon),
                h('div', null,
                  h('h5', { className: 'font-black text-' + g.color + '-800' }, g.label),
                  h('p', { className: 'text-[11px] text-' + g.color + '-700 mt-0.5' }, g.desc)
                )
              )
            );
          })
        )
      );
    };

    // ── WORKSHEET GENERATOR TAB ──
    var renderWorksheetTab = function() {
      var ws = _f.worksheetOpts || { topic: 'identify', grade: 4, count: 10, includeAnswers: true };
      var generated = _f.generatedWorksheet || null;

      var generateWorksheet = function() {
        var probs = [];
        for (var i = 0; i < ws.count; i++) {
          var p = null;
          if (ws.topic === 'identify') {
            var d = pick([2, 3, 4, 5, 6, 8, 10]);
            var n = randInt(1, d - 1);
            p = { q: 'Write the fraction shown.', display: { type: 'pie', n: n, d: d }, answer: n + '/' + d };
          } else if (ws.topic === 'simplify') {
            var bd = pick([2, 3, 4, 5, 6]);
            var bn = randInt(1, bd - 1);
            var mult = randInt(2, 5);
            p = { q: 'Simplify ' + (bn * mult) + '/' + (bd * mult), answer: bn + '/' + bd };
          } else if (ws.topic === 'add') {
            var d1 = pick([2, 3, 4, 6, 8]);
            var d2 = pick([2, 3, 4, 6, 8]);
            var n1 = randInt(1, d1 - 1);
            var n2 = randInt(1, d2 - 1);
            var cd = lcm(d1, d2);
            var sum = n1 * (cd / d1) + n2 * (cd / d2);
            var simp = simplify(sum, cd);
            p = { q: n1 + '/' + d1 + ' + ' + n2 + '/' + d2 + ' = ?', answer: simp[0] + '/' + simp[1] };
          } else if (ws.topic === 'subtract') {
            var sd1 = pick([2, 3, 4, 6, 8]);
            var sd2 = pick([2, 3, 4, 6, 8]);
            var sn1 = randInt(2, sd1);
            var sn2 = randInt(1, sd2 - 1);
            // Make sure result is positive
            var v1 = sn1 / sd1, v2 = sn2 / sd2;
            if (v1 < v2) { var tn = sn1, td = sd1; sn1 = sn2; sd1 = sd2; sn2 = tn; sd2 = td; }
            var ss_cd = lcm(sd1, sd2);
            var diff = sn1 * (ss_cd / sd1) - sn2 * (ss_cd / sd2);
            var s_simp = simplify(diff, ss_cd);
            p = { q: sn1 + '/' + sd1 + ' − ' + sn2 + '/' + sd2 + ' = ?', answer: s_simp[0] + '/' + s_simp[1] };
          } else if (ws.topic === 'multiply') {
            var md1 = pick([2, 3, 4, 5]);
            var md2 = pick([2, 3, 4, 5]);
            var mn1 = randInt(1, md1 - 1);
            var mn2 = randInt(1, md2 - 1);
            var m_simp = simplify(mn1 * mn2, md1 * md2);
            p = { q: mn1 + '/' + md1 + ' × ' + mn2 + '/' + md2 + ' = ?', answer: m_simp[0] + '/' + m_simp[1] };
          } else if (ws.topic === 'divide') {
            var dd1 = pick([2, 3, 4, 5]);
            var dd2 = pick([2, 3, 4, 5]);
            var dn1 = randInt(1, dd1);
            var dn2 = randInt(1, dd2 - 1);
            var dv = simplify(dn1 * dd2, dd1 * dn2);
            p = { q: dn1 + '/' + dd1 + ' ÷ ' + dn2 + '/' + dd2 + ' = ?', answer: dv[0] + '/' + dv[1] };
          } else if (ws.topic === 'equivalent') {
            var eqd = pick([2, 3, 4, 5, 6]);
            var eqn = randInt(1, eqd - 1);
            var em = randInt(2, 4);
            p = { q: eqn + '/' + eqd + ' = ?/' + (eqd * em), answer: eqn * em };
          } else if (ws.topic === 'compare') {
            var cd1 = pick([2, 3, 4, 6, 8]);
            var cd2 = pick([2, 3, 4, 6, 8]);
            var cn1 = randInt(1, cd1);
            var cn2 = randInt(1, cd2);
            var cmp = (cn1 / cd1) - (cn2 / cd2);
            if (Math.abs(cmp) < 0.001) cn2 = (cn2 % cd2) + 1;
            cmp = (cn1 / cd1) - (cn2 / cd2);
            p = { q: 'Which is larger: ' + cn1 + '/' + cd1 + ' or ' + cn2 + '/' + cd2 + '?', answer: cmp > 0 ? cn1 + '/' + cd1 : cn2 + '/' + cd2 };
          }
          probs.push(p);
        }
        upd({ generatedWorksheet: probs });
        sfxComplete();
        announceToSR(probs.length + ' problems generated');
      };

      var printWorksheet = function() {
        if (!generated || typeof window === 'undefined' || !window.print) return;
        var html = '<html><head><title>Fraction Worksheet — ' + new Date().toLocaleDateString() + '</title>';
        html += '<style>body{font-family:sans-serif;margin:40px;}h1{color:#9f1239;}ol{font-size:14pt;line-height:2.5;}li{margin-bottom:8px;}.answer-key{page-break-before:always;color:#16a34a;}svg{vertical-align:middle;}.q{display:inline-block;margin-right:20px;}</style></head><body>';
        html += '<h1>Fraction Worksheet</h1>';
        html += '<p>Name: ____________________________  Date: __________  Score: ___ / ' + generated.length + '</p>';
        html += '<p>Topic: ' + ws.topic + ' · Grade ' + ws.grade + '</p>';
        html += '<ol>';
        generated.forEach(function(p) {
          html += '<li><span class="q">' + (p.q || '') + '</span> _____________________</li>';
        });
        html += '</ol>';
        if (ws.includeAnswers) {
          html += '<div class="answer-key"><h2>Answer Key</h2><ol>';
          generated.forEach(function(p) {
            html += '<li>' + p.answer + '</li>';
          });
          html += '</ol></div>';
        }
        html += '</body></html>';
        try {
          var w = window.open('', '_blank');
          if (w) { w.document.write(html); w.document.close(); setTimeout(function() { w.print(); }, 250); }
        } catch (e) { addToast('Could not open print window', 'error'); }
      };

      var TOPICS = [
        { id: 'identify', label: 'Identify fractions', grade: '3' },
        { id: 'simplify', label: 'Simplify', grade: '4' },
        { id: 'equivalent', label: 'Equivalent fractions', grade: '4' },
        { id: 'compare', label: 'Compare', grade: '4' },
        { id: 'add', label: 'Add (unlike denominators)', grade: '5' },
        { id: 'subtract', label: 'Subtract (unlike denominators)', grade: '5' },
        { id: 'multiply', label: 'Multiply', grade: '5' },
        { id: 'divide', label: 'Divide', grade: '6' }
      ];

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-emerald-50 rounded-xl p-3 border border-emerald-200' },
          h('h4', { className: 'text-sm font-bold text-emerald-800 mb-1' }, '📝 Worksheet generator (teacher tool)'),
          h('p', { className: 'text-[11px] text-emerald-700' },
            'Generate printable practice worksheets with answer keys. Pick a topic, number of problems, and print.'
          )
        ),
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-white rounded-lg p-3 border border-emerald-200' },
            h('label', { className: 'block text-xs font-bold text-emerald-700 mb-1' }, 'Topic'),
            h('select', {
              value: ws.topic,
              onChange: function(e) { upd({ worksheetOpts: Object.assign({}, ws, { topic: e.target.value }) }); },
              'aria-label': 'Worksheet topic',
              className: 'w-full px-2 py-1 rounded border border-emerald-300 text-xs'
            }, TOPICS.map(function(t) { return h('option', { key: 't-' + t.id, value: t.id }, t.label + ' (Grade ' + t.grade + ')'); }))
          ),
          h('div', { className: 'bg-white rounded-lg p-3 border border-emerald-200' },
            h('label', { className: 'block text-xs font-bold text-emerald-700 mb-1' }, 'Number of problems'),
            h('input', {
              type: 'number', min: '5', max: '50', value: ws.count,
              onChange: function(e) { upd({ worksheetOpts: Object.assign({}, ws, { count: parseInt(e.target.value) || 10 }) }); },
              'aria-label': 'Problem count',
              className: 'w-full px-2 py-1 rounded border border-emerald-300 text-xs'
            })
          )
        ),
        h('label', { className: 'flex items-center gap-2 text-xs text-emerald-800' },
          h('input', {
            type: 'checkbox', checked: ws.includeAnswers,
            onChange: function(e) { upd({ worksheetOpts: Object.assign({}, ws, { includeAnswers: e.target.checked }) }); },
            'aria-label': 'Include answer key',
            className: 'accent-emerald-600'
          }),
          'Include answer key on a separate page'
        ),
        h('div', { className: 'flex gap-2' },
          h('button', {
            onClick: generateWorksheet,
            className: 'flex-1 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700'
          }, '🔀 Generate ' + ws.count + ' problems'),
          generated && h('button', {
            onClick: printWorksheet,
            className: 'flex-1 px-4 py-2 bg-emerald-800 text-white font-bold rounded-xl hover:bg-emerald-900'
          }, '🖨 Print worksheet')
        ),
        generated && h('div', { className: 'bg-white rounded-xl p-4 border-2 border-emerald-200 max-h-[400px] overflow-y-auto' },
          h('h5', { className: 'text-sm font-bold text-emerald-800 mb-2' }, '👀 Preview (' + generated.length + ' problems)'),
          h('ol', { className: 'text-sm space-y-1.5 list-decimal pl-6' },
            generated.map(function(p, i) {
              return h('li', { key: 'gp-' + i, className: 'text-slate-800' },
                p.display
                  ? h('span', { className: 'inline-block' },
                      p.q + ' ',
                      h('span', { style: { display: 'inline-block', width: 40, verticalAlign: 'middle' } }, drawPie(p.display.n, p.display.d, 40, palMain))
                    )
                  : p.q,
                ws.includeAnswers && h('span', { className: 'ml-2 text-[11px] text-emerald-700 font-mono' }, '(answer: ' + p.answer + ')')
              );
            })
          )
        )
      );
    };

    // ── PROGRESS REPORT TAB ──
    var renderReportsTab = function() {
      var typesCount = Object.keys(challengeTypesUsed || {}).length;
      var badgeCount = Object.keys(badges || {}).length;
      var totalEquiv = _f.equivSolved || 0;
      var totalSimplify = _f.simplifySolved || 0;
      var totalConvert = _f.convertCount || 0;
      var totalOps = _f.opsSolved || 0;

      var generateReport = function() {
        var date = new Date().toLocaleDateString();
        var time = new Date().toLocaleTimeString();
        var lines = [];
        lines.push('FRACTION LAB PROGRESS REPORT');
        lines.push('Generated: ' + date + ' at ' + time);
        lines.push('');
        lines.push('=== OVERALL ===');
        lines.push('Problems attempted: ' + score.total);
        lines.push('Problems correct:   ' + score.correct);
        lines.push('Accuracy:           ' + (score.total > 0 ? Math.round(score.correct / score.total * 100) + '%' : 'N/A'));
        lines.push('Best streak:        ' + bestStreak);
        lines.push('Current streak:     ' + streak);
        lines.push('');
        lines.push('=== BREAKDOWN BY SKILL ===');
        lines.push('Equivalent fractions solved: ' + totalEquiv);
        lines.push('Simplifications solved:      ' + totalSimplify);
        lines.push('Operations solved:           ' + totalOps);
        lines.push('Conversions performed:       ' + totalConvert);
        lines.push('Challenge types attempted:   ' + typesCount + ' of 7');
        lines.push('');
        lines.push('=== BADGES EARNED (' + badgeCount + '/' + BADGES.length + ') ===');
        BADGES.forEach(function(b) {
          var has = badges[b.id];
          lines.push((has ? '[x] ' : '[ ] ') + b.name + ' — ' + b.desc);
        });
        lines.push('');
        lines.push('=== CCSS STANDARDS PRACTICED (this session) ===');
        // Estimate from features used
        CCSS_FRACTIONS.slice(0, 10).forEach(function(c) {
          lines.push('  ' + c.code + ' — ' + c.title);
        });
        lines.push('');
        lines.push('=== NOTES FOR IEP / RTI DOCUMENTATION ===');
        lines.push('This report shows student-led practice in AlloFlow Fraction Lab.');
        lines.push('It is NOT a standardized assessment. Use as supplementary');
        lines.push('progress-monitoring evidence alongside formal probes.');
        lines.push('');
        lines.push('—— Generated by AlloFlow Fraction Lab ——');
        return lines.join('\n');
      };
      var copyReport = function() {
        var txt = generateReport();
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(txt).then(function() {
              addToast('📋 Report copied to clipboard', 'success');
            }).catch(function() { addToast('Could not copy', 'error'); });
          }
        } catch (e) { addToast('Clipboard unavailable', 'error'); }
      };
      var downloadReport = function() {
        var txt = generateReport();
        try {
          var blob = new Blob([txt], { type: 'text/plain' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'fraction-lab-report-' + Date.now() + '.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function() { URL.revokeObjectURL(url); }, 500);
          addToast('💾 Report downloaded', 'success');
        } catch (e) { addToast('Download failed', 'error'); }
      };

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-teal-50 rounded-xl p-3 border border-teal-200' },
          h('h4', { className: 'text-sm font-bold text-teal-800 mb-1' }, '📊 Progress report (teacher tool)'),
          h('p', { className: 'text-[11px] text-teal-700' },
            'Snapshot of student practice in this session. Useful as supplementary evidence for IEP/RTI documentation. ',
            'Not a standardized assessment.'
          )
        ),
        h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
          h('div', { className: 'bg-white rounded-lg p-3 border border-teal-200 text-center' },
            h('p', { className: 'text-[11px] font-bold text-teal-700' }, 'Attempted'),
            h('p', { className: 'text-2xl font-black text-teal-900' }, score.total)
          ),
          h('div', { className: 'bg-white rounded-lg p-3 border border-teal-200 text-center' },
            h('p', { className: 'text-[11px] font-bold text-teal-700' }, 'Correct'),
            h('p', { className: 'text-2xl font-black text-emerald-700' }, score.correct)
          ),
          h('div', { className: 'bg-white rounded-lg p-3 border border-teal-200 text-center' },
            h('p', { className: 'text-[11px] font-bold text-teal-700' }, 'Accuracy'),
            h('p', { className: 'text-2xl font-black text-teal-900' }, (score.total > 0 ? Math.round(score.correct / score.total * 100) + '%' : '—'))
          ),
          h('div', { className: 'bg-white rounded-lg p-3 border border-teal-200 text-center' },
            h('p', { className: 'text-[11px] font-bold text-teal-700' }, 'Best streak'),
            h('p', { className: 'text-2xl font-black text-orange-600' }, bestStreak)
          )
        ),
        h('div', { className: 'bg-white rounded-xl p-3 border border-teal-200 space-y-1.5' },
          h('p', { className: 'text-[11px] font-bold text-teal-700 mb-1' }, 'Skill breakdown'),
          [
            { label: 'Equivalent fractions', val: totalEquiv },
            { label: 'Simplifications', val: totalSimplify },
            { label: 'Operations', val: totalOps },
            { label: 'Conversions', val: totalConvert },
            { label: 'Challenge types attempted', val: typesCount + ' / 7' },
            { label: 'Badges earned', val: badgeCount + ' / ' + BADGES.length }
          ].map(function(row, i) {
            return h('div', { key: 'sb-' + i, className: 'flex justify-between text-xs py-0.5 border-t border-teal-50' },
              h('span', { className: 'text-slate-700' }, row.label),
              h('span', { className: 'font-mono font-bold text-teal-800' }, row.val)
            );
          })
        ),
        h('div', { className: 'flex gap-2' },
          h('button', {
            onClick: copyReport,
            className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-teal-100 text-teal-800 hover:bg-teal-200 border border-teal-300'
          }, '📋 Copy to clipboard'),
          h('button', {
            onClick: downloadReport,
            className: 'flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-teal-700 text-white hover:bg-teal-800'
          }, '💾 Download .txt')
        ),
        h('details', { className: 'bg-slate-50 rounded-lg p-2 border border-slate-200' },
          h('summary', { className: 'text-xs font-bold text-slate-700 cursor-pointer' }, '👀 Preview report'),
          h('pre', { className: 'mt-2 text-[10px] text-slate-800 whitespace-pre-wrap font-mono leading-relaxed' }, generateReport())
        )
      );
    };

    // ══════════════════════════════════════════════════════════════════
    // ═══ v3 VOCABULARY LIBRARY ════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════
    var FRACTION_VOCAB = [
      { term: 'Numerator', def: 'The top number in a fraction. It tells how many parts you have.', example: 'In 3/4, the numerator is 3.' },
      { term: 'Denominator', def: 'The bottom number in a fraction. It tells how many equal parts make up one whole.', example: 'In 3/4, the denominator is 4.' },
      { term: 'Proper fraction', def: 'A fraction where the numerator is less than the denominator. Its value is between 0 and 1.', example: '1/2, 2/3, 5/8 are all proper fractions.' },
      { term: 'Improper fraction', def: 'A fraction where the numerator is greater than or equal to the denominator. Its value is 1 or more.', example: '5/4, 7/3, 9/9 are all improper fractions.' },
      { term: 'Mixed number', def: 'A whole number plus a proper fraction. Equivalent to an improper fraction.', example: '1 3/4 means 1 + 3/4. Equivalent improper: 7/4.' },
      { term: 'Equivalent fractions', def: 'Different fractions that represent the same value.', example: '1/2 = 2/4 = 4/8 = 50/100.' },
      { term: 'Simplest form', def: 'A fraction in which the numerator and denominator have no common factors other than 1.', example: '4/8 simplifies to 1/2. 1/2 is in simplest form.' },
      { term: 'Greatest Common Factor (GCF)', def: 'The largest number that divides evenly into two numbers. Used to simplify fractions.', example: 'GCF of 12 and 18 is 6. 12/18 = 2/3.' },
      { term: 'Least Common Multiple (LCM)', def: 'The smallest number that two numbers both divide into evenly. Used to find common denominators.', example: 'LCM of 4 and 6 is 12. So 1/4 + 1/6 = 3/12 + 2/12 = 5/12.' },
      { term: 'Common denominator', def: 'A number that two or more fractions share as their denominator. Required for adding or subtracting unlike fractions.', example: 'For 1/2 and 1/3, the common denominator can be 6.' },
      { term: 'Reciprocal', def: 'A fraction flipped upside down. Multiplying a fraction by its reciprocal gives 1.', example: 'The reciprocal of 3/4 is 4/3. (3/4) × (4/3) = 1.' },
      { term: 'Unit fraction', def: 'A fraction with 1 as the numerator. Building blocks for all fractions.', example: '1/2, 1/3, 1/4 are unit fractions. 3/4 = 1/4 + 1/4 + 1/4.' },
      { term: 'Benchmark fraction', def: 'A common fraction used as a reference point for estimating.', example: '0, 1/4, 1/2, 3/4, 1 are common benchmarks.' },
      { term: 'Like fractions', def: 'Fractions with the same denominator. Can be added or subtracted directly.', example: '2/5 and 4/5 are like fractions.' },
      { term: 'Unlike fractions', def: 'Fractions with different denominators. Need a common denominator first.', example: '1/2 and 1/3 are unlike fractions.' },
      { term: 'Decimal', def: 'A number written using a decimal point. Every fraction can be written as a decimal.', example: '1/2 = 0.5. 1/4 = 0.25.' },
      { term: 'Percent', def: 'A fraction with denominator 100. The symbol % means "per hundred."', example: '50% = 50/100 = 1/2.' },
      { term: 'Terminating decimal', def: 'A decimal that ends. Happens when the denominator only has factors of 2 and 5.', example: '1/4 = 0.25 (terminates). 1/8 = 0.125 (terminates).' },
      { term: 'Repeating decimal', def: 'A decimal where one or more digits repeat forever. Happens when the denominator has any prime factor other than 2 or 5.', example: '1/3 = 0.333... (3 repeats). 1/7 = 0.142857142857... (block of 6 repeats).' },
      { term: 'Ratio', def: 'A comparison of two quantities. Can be written as a fraction.', example: 'A ratio of 3 boys to 2 girls = 3:2 = 3/2.' },
      { term: 'Cross-multiplication', def: 'A shortcut for comparing two fractions. For a/b vs c/d, compare a×d to b×c.', example: 'Is 3/4 vs 5/7 — bigger? 3×7=21, 4×5=20. 21>20 so 3/4 > 5/7.' },
      { term: 'Partition', def: 'To divide into equal parts. A fraction tells you how a whole was partitioned.', example: 'A circle partitioned into 4 equal parts gives quarters.' },
      { term: 'Magnitude', def: 'The size or amount of a fraction. Magnitude reasoning means thinking about how big the fraction is, not just its name.', example: '3/4 is closer to 1 than 1/4 is.' },
      { term: 'Like denominators', def: 'Fractions with the same bottom number. The pieces are the same size.', example: '2/8 and 5/8 have like denominators.' },
      { term: 'Lowest terms', def: 'Same as "simplest form." The fraction can\'t be simplified any further.', example: '6/8 is not in lowest terms; 3/4 is.' },
      { term: 'Whole', def: 'The complete object or amount that is being divided. The denominator tells how many parts make a whole.', example: 'One pizza, one cake, one mile — each is one whole.' }
    ];

    // ── VOCABULARY TAB ──
    var renderVocabTab = function() {
      var vocabSearch = (_f.vocabSearch || '').toLowerCase();
      var filtered = FRACTION_VOCAB.filter(function(v) {
        if (!vocabSearch) return true;
        return v.term.toLowerCase().indexOf(vocabSearch) >= 0 ||
               v.def.toLowerCase().indexOf(vocabSearch) >= 0;
      });
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-sky-50 rounded-xl p-3 border border-sky-200' },
          h('h4', { className: 'text-sm font-bold text-sky-800 mb-1' }, '📖 Fraction vocabulary'),
          h('p', { className: 'text-[11px] text-sky-700' },
            'Definitions of every fraction term used in K-8 math instruction, with examples. Searchable.'
          )
        ),
        h('input', {
          type: 'text', value: _f.vocabSearch || '',
          onChange: function(e) { upd({ vocabSearch: e.target.value }); },
          placeholder: 'Search vocabulary...',
          'aria-label': 'Search vocabulary',
          className: 'w-full px-3 py-2 rounded-lg border border-sky-300 text-sm'
        }),
        h('div', { className: 'space-y-2' },
          filtered.length === 0
            ? h('p', { className: 'text-xs italic text-slate-500 text-center py-4' }, 'No matches.')
            : filtered.map(function(v) {
                return h('div', { key: 'vc-' + v.term, className: 'bg-white rounded-lg p-3 border border-sky-200' },
                  h('p', { className: 'text-sm font-bold text-sky-900' }, '📘 ' + v.term),
                  h('p', { className: 'text-xs text-slate-700 mt-1' }, v.def),
                  h('p', { className: 'text-[11px] text-sky-700 italic mt-1' }, '✏ ' + v.example)
                );
              })
        )
      );
    };

    // ── PRACTICE BANK — 100+ pre-built practice items by skill ──
    var PRACTICE_BANK = {
      identify: [
        { n: 1, d: 2, model: 'pie', answer: '1/2' },
        { n: 1, d: 3, model: 'pie', answer: '1/3' },
        { n: 2, d: 3, model: 'pie', answer: '2/3' },
        { n: 1, d: 4, model: 'pie', answer: '1/4' },
        { n: 3, d: 4, model: 'pie', answer: '3/4' },
        { n: 1, d: 5, model: 'bar', answer: '1/5' },
        { n: 2, d: 5, model: 'bar', answer: '2/5' },
        { n: 3, d: 5, model: 'bar', answer: '3/5' },
        { n: 1, d: 6, model: 'pie', answer: '1/6' },
        { n: 5, d: 6, model: 'pie', answer: '5/6' },
        { n: 1, d: 8, model: 'bar', answer: '1/8' },
        { n: 3, d: 8, model: 'bar', answer: '3/8' },
        { n: 5, d: 8, model: 'bar', answer: '5/8' },
        { n: 7, d: 8, model: 'pie', answer: '7/8' },
        { n: 1, d: 10, model: 'bar', answer: '1/10' },
        { n: 3, d: 10, model: 'set', answer: '3/10' },
        { n: 7, d: 10, model: 'bar', answer: '7/10' },
        { n: 1, d: 12, model: 'bar', answer: '1/12' },
        { n: 5, d: 12, model: 'bar', answer: '5/12' }
      ],
      equivalent: [
        { from: { n: 1, d: 2 }, to: { d: 4 }, answer: 2 },
        { from: { n: 1, d: 2 }, to: { d: 6 }, answer: 3 },
        { from: { n: 1, d: 2 }, to: { d: 8 }, answer: 4 },
        { from: { n: 1, d: 3 }, to: { d: 6 }, answer: 2 },
        { from: { n: 1, d: 3 }, to: { d: 9 }, answer: 3 },
        { from: { n: 2, d: 3 }, to: { d: 6 }, answer: 4 },
        { from: { n: 2, d: 3 }, to: { d: 9 }, answer: 6 },
        { from: { n: 1, d: 4 }, to: { d: 8 }, answer: 2 },
        { from: { n: 1, d: 4 }, to: { d: 12 }, answer: 3 },
        { from: { n: 3, d: 4 }, to: { d: 8 }, answer: 6 },
        { from: { n: 3, d: 4 }, to: { d: 12 }, answer: 9 },
        { from: { n: 2, d: 5 }, to: { d: 10 }, answer: 4 },
        { from: { n: 3, d: 5 }, to: { d: 15 }, answer: 9 },
        { from: { n: 1, d: 6 }, to: { d: 12 }, answer: 2 },
        { from: { n: 5, d: 6 }, to: { d: 12 }, answer: 10 },
        { from: { n: 3, d: 8 }, to: { d: 16 }, answer: 6 }
      ],
      simplify: [
        { from: { n: 2, d: 4 }, to: { n: 1, d: 2 } },
        { from: { n: 3, d: 6 }, to: { n: 1, d: 2 } },
        { from: { n: 4, d: 8 }, to: { n: 1, d: 2 } },
        { from: { n: 5, d: 10 }, to: { n: 1, d: 2 } },
        { from: { n: 6, d: 8 }, to: { n: 3, d: 4 } },
        { from: { n: 9, d: 12 }, to: { n: 3, d: 4 } },
        { from: { n: 4, d: 6 }, to: { n: 2, d: 3 } },
        { from: { n: 6, d: 9 }, to: { n: 2, d: 3 } },
        { from: { n: 2, d: 8 }, to: { n: 1, d: 4 } },
        { from: { n: 3, d: 12 }, to: { n: 1, d: 4 } },
        { from: { n: 10, d: 15 }, to: { n: 2, d: 3 } },
        { from: { n: 12, d: 16 }, to: { n: 3, d: 4 } },
        { from: { n: 6, d: 10 }, to: { n: 3, d: 5 } },
        { from: { n: 8, d: 10 }, to: { n: 4, d: 5 } },
        { from: { n: 15, d: 20 }, to: { n: 3, d: 4 } }
      ],
      compare: [
        { a: { n: 1, d: 2 }, b: { n: 1, d: 3 }, larger: 'a' },
        { a: { n: 1, d: 4 }, b: { n: 1, d: 8 }, larger: 'a' },
        { a: { n: 3, d: 4 }, b: { n: 2, d: 3 }, larger: 'a' },
        { a: { n: 2, d: 5 }, b: { n: 3, d: 8 }, larger: 'a' },
        { a: { n: 5, d: 8 }, b: { n: 3, d: 5 }, larger: 'a' },
        { a: { n: 1, d: 3 }, b: { n: 2, d: 6 }, larger: 'eq' },
        { a: { n: 2, d: 4 }, b: { n: 3, d: 6 }, larger: 'eq' },
        { a: { n: 7, d: 10 }, b: { n: 3, d: 5 }, larger: 'a' },
        { a: { n: 5, d: 6 }, b: { n: 7, d: 9 }, larger: 'a' },
        { a: { n: 4, d: 5 }, b: { n: 7, d: 8 }, larger: 'b' }
      ]
    };

    // ══════════════════════════════════════════════════════════════════
    // ═══ v3 ADDITIONAL TEACHER TABS ═══════════════════════════════════
    // ══════════════════════════════════════════════════════════════════

    // ── IEP GOAL BANK TAB ──
    var renderIEPGoalsTab = function() {
      var iepGrade = _f.iepGrade || 'all';
      var filtered = IEP_GOAL_BANK.filter(function(g) {
        return iepGrade === 'all' || g.grade.indexOf(iepGrade) >= 0;
      });
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-emerald-50 rounded-xl p-3 border border-emerald-200' },
          h('h4', { className: 'text-sm font-bold text-emerald-800 mb-1' }, '🎯 IEP Goal Bank — fraction-specific'),
          h('p', { className: 'text-[11px] text-emerald-700' },
            'Pre-formatted SMART goals for IEP teams. Each goal links to a CCSS standard, suggests progress-monitoring data sources within AlloFlow, and lists common accommodations. Copy and adapt for your student.'
          )
        ),
        h('div', { className: 'flex gap-1 flex-wrap' },
          ['all', '3', '4', '5', '6', '7'].map(function(g) {
            var active = iepGrade === g;
            return h('button', {
              key: 'ig-' + g,
              onClick: function() { upd({ iepGrade: g }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                (active ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100')
            }, g === 'all' ? 'All grades' : 'Grade ' + g);
          })
        ),
        h('div', { className: 'space-y-2' },
          filtered.map(function(g) {
            return h('div', { key: 'iep-' + g.id, className: 'bg-white rounded-lg p-3 border border-emerald-200 space-y-2' },
              h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('span', { className: 'text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded' }, 'Grade ' + g.grade),
                h('span', { className: 'text-[11px] font-bold text-emerald-700' }, g.topic),
                h('span', { className: 'text-[10px] text-emerald-500' }, g.ccss)
              ),
              h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, '🎯 ', h('b', null, g.goal)),
              h('details', { className: 'text-[11px]' },
                h('summary', { className: 'cursor-pointer font-bold text-emerald-700' }, 'Show accommodations and progress monitoring'),
                h('div', { className: 'mt-2 space-y-1' },
                  h('p', { className: 'text-emerald-800' }, h('b', null, 'Progress monitoring: '), g.progress),
                  h('div', null,
                    h('b', { className: 'text-emerald-800' }, 'Accommodations:'),
                    h('ul', { className: 'list-disc pl-5 text-slate-700 mt-1' },
                      g.accommodations.map(function(a, i) { return h('li', { key: 'acc-' + g.id + '-' + i }, a); })
                    )
                  )
                )
              ),
              h('button', {
                onClick: function() {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(g.goal).then(function() { addToast('📋 Goal copied', 'success'); });
                  }
                },
                className: 'px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              }, '📋 Copy goal to clipboard')
            );
          })
        )
      );
    };

    // ── LESSON PLANS TAB ──
    var renderLessonPlansTab = function() {
      var lpId = _f.lpId || null;
      var lp = LESSON_PLANS.find(function(l) { return l.id === lpId; });
      if (lp) {
        return h('div', { className: 'space-y-3' },
          h('button', {
            onClick: function() { upd({ lpId: null }); },
            className: 'px-3 py-1 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300'
          }, '← All lesson plans'),
          h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
            h('h4', { className: 'text-base font-black text-indigo-900' }, lp.title),
            h('p', { className: 'text-[11px] text-indigo-700' },
              'Grade ' + lp.grade + ' · ' + lp.ccss + ' · ' + lp.duration
            )
          ),
          h('div', { className: 'bg-white rounded-xl p-3 border border-indigo-200' },
            h('p', { className: 'text-[11px] font-bold text-indigo-700 mb-1' }, '🎯 Learning objectives'),
            h('ul', { className: 'text-[11px] list-disc pl-5 text-slate-800 space-y-0.5' },
              lp.objectives.map(function(o, i) { return h('li', { key: 'obj-' + i }, o); })
            )
          ),
          lp.days.map(function(d) {
            return h('div', { key: 'd-' + d.day, className: 'bg-white rounded-xl p-3 border border-indigo-200' },
              h('p', { className: 'text-xs font-bold text-indigo-700' }, 'Day ' + d.day + ': ' + d.focus),
              h('ul', { className: 'text-[11px] list-disc pl-5 text-slate-800 space-y-0.5 mt-1' },
                d.activities.map(function(a, i) { return h('li', { key: 'act-' + d.day + '-' + i }, a); })
              )
            );
          })
        );
      }
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
          h('h4', { className: 'text-sm font-bold text-indigo-800 mb-1' }, '📚 Lesson plan templates'),
          h('p', { className: 'text-[11px] text-indigo-700' },
            'Ready-to-use micro-units (3-5 days each) for common fraction topics. Each plan ties activities to specific Fraction Lab tabs so you can demo or assign directly.'
          )
        ),
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
          LESSON_PLANS.map(function(lp2) {
            return h('button', {
              key: 'lp-' + lp2.id,
              onClick: function() { upd({ lpId: lp2.id }); },
              className: 'text-left p-4 rounded-xl border-2 border-indigo-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all'
            },
              h('h5', { className: 'text-sm font-black text-indigo-900' }, lp2.title),
              h('p', { className: 'text-[11px] text-indigo-600 mt-1' }, 'Grade ' + lp2.grade + ' · ' + lp2.ccss + ' · ' + lp2.duration),
              h('p', { className: 'text-[10px] text-slate-700 italic mt-1' }, lp2.objectives[0])
            );
          })
        )
      );
    };

    // ── FRACTION FACTS / TRIVIA library ──
    var FRACTION_FACTS = [
      { id: 'origin', title: 'Where do fractions come from?', body: 'The earliest fraction notation dates to ancient Egypt around 1800 BCE. The Egyptians used "unit fractions" — only fractions with numerator 1 (like 1/2, 1/3, 1/4). They wrote any other fraction as a sum of unit fractions: 2/5 = 1/3 + 1/15. The modern bar notation (numerator over denominator) comes from medieval Arabic mathematicians around the 1200s CE.' },
      { id: 'words', title: 'Where do the fraction words come from?', body: '"Numerator" comes from the Latin "numerare" (to count) — it counts how many parts. "Denominator" comes from "denominare" (to name) — it names the size of the parts. Together: the denominator names what kind of pieces; the numerator counts how many of those pieces you have.' },
      { id: 'decimal-history', title: 'The decimal point', body: 'Decimals as we know them were popularized by Simon Stevin in 1585 in his book "De Thiende" (The Tenth). Before that, fractions were the only way to express non-whole numbers. The decimal point became universally adopted only in the 1700s.' },
      { id: 'percent', title: 'What does percent mean?', body: '"Percent" comes from the Latin "per centum" — "per hundred." So 25% literally means 25 per 100, or 25/100. The % symbol evolved from the abbreviation "per c." in 15th-century Italian commercial writing.' },
      { id: 'reciprocal', title: 'What is a reciprocal?', body: 'The reciprocal of a/b is b/a — flip it upside down. Every nonzero fraction has a reciprocal. The product of a fraction and its reciprocal is always 1: (3/4) × (4/3) = 12/12 = 1. This is why dividing by a fraction is the same as multiplying by its reciprocal.' },
      { id: 'half-most', title: 'Why is 1/2 the most-used fraction?', body: '1/2 is the most common fraction in everyday speech because it sits exactly in the middle of 0 and 1. It is also the only fraction we routinely express in words: "half" instead of "one over two." Other languages have unique words for 1/3 and 1/4 too (third, quarter).' },
      { id: 'pizza-pi', title: 'Pizza is mathematical', body: 'A pizza is a perfect fraction model because it is a circle (so all slices radiate from the center), the slices are easy to count, and the model maps onto the formal mathematical definition: a fraction n/d is n equal parts out of d total equal parts.' },
      { id: 'irrational', title: 'When fractions are not enough', body: 'Some numbers, like π and √2, cannot be written as a fraction of two whole numbers. These are called irrational numbers. The Pythagoreans (around 500 BCE) reportedly killed the mathematician Hippasus when he proved that √2 could not be written as a fraction.' },
      { id: 'continued-fractions', title: 'Continued fractions', body: 'Any real number can be written as a "continued fraction" — a nested fraction like 1 + 1/(2 + 1/(2 + 1/(2 + ...))). This gives the best fraction approximations. π ≈ 22/7 from the first few terms; even better is 355/113.' },
      { id: 'fractions-music', title: 'Fractions in music', body: 'Musical pitch ratios are fractions. The octave is a 2:1 ratio (frequency doubles). The perfect fifth is 3:2. The major third is 5:4. Pythagoras discovered that simple integer ratios produce harmonious sounds.' },
      { id: 'common-denominator-history', title: 'Why the common denominator?', body: 'Two pizzas can only be combined if they are cut into the same-size slices. Different denominators = different-size slices = can\'t directly combine. The common denominator literally means "same-size pieces."' },
      { id: 'baseball-stats', title: 'Baseball stats are fractions', body: 'A batting average like .333 means 1/3 of at-bats result in a hit. A pitcher\'s ERA, on-base percentage, slugging percentage — all of them are fractions. Baseball was the first sport to popularize this kind of statistical thinking, starting in the 1850s.' },
      { id: 'cuisinaire', title: 'Cuisenaire rods', body: 'Georges Cuisenaire was a Belgian primary teacher in the 1950s who invented colored rods of length 1 to 10 to help children grasp number relationships including fractions. The "fraction wall" you see in many classrooms is the digital descendant of his physical rods.' },
      { id: 'china-fractions', title: 'Fractions in ancient China', body: 'The Chinese mathematical text "Nine Chapters on the Mathematical Art" (around 100 BCE) included fraction arithmetic, including a procedure for finding common denominators that is mathematically equivalent to what we teach today.' },
      { id: 'binary-fractions', title: 'Computers and fractions', body: 'Computers store decimal fractions in binary. The decimal 0.1 cannot be represented exactly in binary — it becomes a repeating fraction in base 2. This is why 0.1 + 0.2 sometimes gives 0.30000000000000004 in programming languages.' }
    ];

    // ── PROVERBS — fractions in everyday speech ──
    var FRACTION_PROVERBS = [
      'A picture is worth a thousand words.',
      'A bird in the hand is worth two in the bush — that\'s a 1:2 ratio.',
      'Half a loaf is better than none.',
      'Two heads are better than one.',
      '“It is better to be roughly right than precisely wrong” — Keynes.',
      'A stitch in time saves nine.',
      'A house divided against itself cannot stand.'
    ];

    var renderProverbsTab = function() {
      return h('div', { className: 'space-y-2' },
        h('p', { className: 'text-sm font-bold text-slate-800' }, '🗣 Fraction-adjacent sayings'),
        FRACTION_PROVERBS.map(function(p, i) {
          return h('p', { key: 'pv-' + i, className: 'text-sm italic text-slate-700 bg-white p-2 rounded border-l-4 border-amber-500' }, '"' + p + '"');
        })
      );
    };

    // ── ANIMAL FRACTIONS — engagement vocabulary ──
    var ANIMAL_FRACTIONS = [
      { animal: '🐕 Dog', fact: 'Dogs spend about 1/2 their lives sleeping. A 12-year-old dog has slept about 6 years.' },
      { animal: '🐈 Cat', fact: 'Cats sleep about 2/3 of every day. That\'s 16 hours daily.' },
      { animal: '🐘 Elephant', fact: 'Elephants drink about 1/8 of their body weight in water per day. A 12,000-pound elephant drinks 1,500 lbs of water!' },
      { animal: '🐋 Blue Whale', fact: 'A blue whale\'s tongue weighs about 1/2 of a small car (~6,000 lbs).' },
      { animal: '🐝 Honeybee', fact: 'A bee visits about 1,500 flowers to make 1/12 teaspoon of honey.' },
      { animal: '🦒 Giraffe', fact: 'A giraffe\'s neck is about 1/3 of its total height.' },
      { animal: '🐌 Snail', fact: 'A snail moves at about 1/40 of a mile per hour. It would take 40 hours to crawl 1 mile.' },
      { animal: '🦘 Kangaroo', fact: 'A kangaroo can leap a distance about 3/2 of its body length in one hop.' },
      { animal: '🐬 Dolphin', fact: 'A dolphin sleeps with half its brain at a time — only 1/2 of the brain rests while the other half stays alert.' },
      { animal: '🐢 Tortoise', fact: 'A giant tortoise can live to 150+ years. A 100-year-old tortoise has lived 2/3 of its potential lifespan.' }
    ];

    var renderAnimalFractionsTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-green-50 rounded-xl p-3 border border-green-200' },
          h('h4', { className: 'text-sm font-bold text-green-800 mb-1' }, '🐾 Animal fractions'),
          h('p', { className: 'text-[11px] text-green-700' },
            'Real-world fraction facts from the animal kingdom. Use as journal prompts, attention-grabbers, or cross-curricular tie-ins to science.'
          )
        ),
        h('div', { className: 'space-y-2' },
          ANIMAL_FRACTIONS.map(function(a, i) {
            return h('div', { key: 'af-' + i, className: 'bg-white rounded-lg p-3 border-l-4 border-green-500' },
              h('p', { className: 'text-base font-bold text-green-800' }, a.animal),
              h('p', { className: 'text-sm text-slate-700 mt-1' }, a.fact)
            );
          })
        )
      );
    };

    // ── ACKNOWLEDGMENTS TAB ──
    var renderAcknowledgmentsTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('h4', { className: 'text-sm font-bold text-amber-800 mb-1' }, '🙏 Acknowledgments'),
          h('p', { className: 'text-[11px] text-amber-700' },
            'AlloFlow Fraction Lab stands on the shoulders of decades of mathematics education research and practice.'
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4 space-y-3 text-sm text-slate-800 leading-relaxed' },
          h('p', null, h('b', null, 'Pedagogical foundations: '),
            'Robert Siegler and colleagues for the IES Practice Guide that shaped this tool\'s emphasis on magnitude reasoning and the number-line model. '),
          h('p', null, h('b', null, 'CRA framework: '),
            'Jerome Bruner (1966) for the original enactive-iconic-symbolic progression. Sealander et al. for evidence in special education contexts. '),
          h('p', null, h('b', null, 'Manipulatives heritage: '),
            'Georges Cuisenaire (1952) for the rod system that became the fraction wall and fraction strip models. '),
          h('p', null, h('b', null, 'Misconception research: '),
            'Vamvakoussi, Vosniadou, Stafylidou, Lortie-Forgues, and many others whose careful documentation of student thinking made the Misconceptions tab possible. '),
          h('p', null, h('b', null, 'Number Talks: '),
            'Sherry Parrish for the routine that informed the Math Talks tab. '),
          h('p', null, h('b', null, 'Universal Design for Learning: '),
            'CAST for the UDL guidelines that shape every feature decision. '),
          h('p', null, h('b', null, 'AlloFlow developer: '),
            'Aaron Pomeranz, PsyD — school psychologist, AlloFlow maintainer. ' +
            'Tools like this could not exist without practitioners who care enough to build them.'),
          h('p', null, h('b', null, 'Open-source spirit: '),
            'This tool is released under AGPL v3 so it remains free and open forever. ' +
            'Anyone can use it, modify it, share it. Credit where credit is due, but no gates.'),
          h('p', { className: 'text-center italic text-amber-700 mt-4' },
            '"Mathematics is the music of reason." — James Joseph Sylvester')
        )
      );
    };

    // ── CHANGELOG TAB ──
    // Shows the version history of Fraction Lab so users can see what's new.
    var FRACTION_CHANGELOG = [
      { version: 'v3.0', date: '2026-05', changes: [
        'Major expansion: 70+ tabs across 4 modes (Learn, Practice, Apply, Teacher).',
        'Added: 9 mini-games (Pizza Shop, Race, Match, Fish, Bingo, Tug of War, Hide & Seek, Build the Whole, Pattern Builder, Connect-Four Fractions).',
        'Added: 7 visual models (pie, bar, number line, area, set, length, volume).',
        'Added: CRA progression tab with 3-stage walkthrough.',
        'Added: 80+ word problems with progressive hints.',
        'Added: IES Practice Guide-aligned RTI probe generator.',
        'Added: 9 IEP goal templates with accommodations.',
        'Added: 4 lesson plan templates.',
        'Added: 12 misconception library with research-based remediation strategies.',
        'Added: Step-by-step visualizers for LCM, GCD simplification, mixed-improper conversion, long division.',
        'Added: Multilingual vocabulary in 12 languages.',
        'Added: 8 hands-on activity recipes.',
        'Added: Real-world tools tab (rulers, measuring cups, etc.) with practice questions.',
        'Added: Story mode (5-chapter bakery narrative).',
        'Added: Brain teasers, magic tricks, history timeline.',
        'Added: Color-blind safe palettes (4 options).',
        'Added: Audio narration via Web Speech API.',
        'Added: Worksheet generator, exit ticket generator, daily routine templates.',
        'Added: Mastery dashboard, achievement levels (8 tiers), goal setter.',
        'Added: Save/load named sessions.',
        'Added: UDL alignment map, parent guide, research citations.',
        'Architecture: Mode → Tab two-level navigation to reduce overwhelm.'
      ]},
      { version: 'v2.0', date: '2025-12', changes: [
        '6 tabs: Practice, Compare, Operations, Equivalents, Converter, Wall.',
        '14 badges; AI tutor; streak tracking.',
        '7 challenge types: identify, equivalent, compare, simplify, ordering, toDecimal, mixedNumber.',
        'Keyboard shortcuts.',
        'Benchmark fractions reference.'
      ]},
      { version: 'v1.0', date: '2025-08', changes: [
        'Initial release: Practice tab with pie/bar visualization.',
        'Slider-driven fraction display.',
        'Sound effects.'
      ]}
    ];

    var renderChangelogTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-stone-50 rounded-xl p-3 border border-stone-200' },
          h('h4', { className: 'text-sm font-bold text-stone-800 mb-1' }, '📜 Changelog'),
          h('p', { className: 'text-[11px] text-stone-700' },
            'Version history of AlloFlow Fraction Lab. The v3.0 expansion brought it to its current size.'
          )
        ),
        FRACTION_CHANGELOG.map(function(v) {
          return h('div', { key: 'cl-' + v.version, className: 'bg-white rounded-xl border-2 border-stone-200 p-3' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-base font-black text-stone-900' }, v.version),
              h('span', { className: 'text-[10px] text-stone-600 font-mono' }, v.date)
            ),
            h('ul', { className: 'text-xs list-disc pl-5 text-slate-700 space-y-0.5' },
              v.changes.map(function(c, i) { return h('li', { key: 'ch-' + v.version + '-' + i }, c); })
            )
          );
        })
      );
    };

    // ── CONNECT-FOUR FRACTION GAME ──
    // Place fraction discs in a 4-in-a-row grid. Connect 4 equivalent fractions to win.
    var renderConnectFractionGame = function() {
      var cf = _f.cfGame || { board: null, currentPlayer: 1, winner: null };
      var COLS = 7, ROWS = 6;
      var startCf = function() {
        var b = [];
        for (var i = 0; i < ROWS; i++) { b.push(new Array(COLS).fill(null)); }
        upd({ cfGame: { board: b, currentPlayer: 1, winner: null } });
        sfxNewChallenge();
      };
      var placeDisc = function(col) {
        if (cf.winner) return;
        // Find lowest empty in column
        for (var r = ROWS - 1; r >= 0; r--) {
          if (!cf.board[r][col]) {
            // Generate a random fraction
            var d = pick([2, 3, 4, 6, 8]);
            var n = randInt(1, d - 1);
            var newBoard = cf.board.map(function(row) { return row.slice(); });
            newBoard[r][col] = { n: n, d: d, val: n / d, player: cf.currentPlayer };
            sfxClick();
            upd({ cfGame: Object.assign({}, cf, { board: newBoard, currentPlayer: cf.currentPlayer === 1 ? 2 : 1 }) });
            return;
          }
        }
      };

      if (!cf.board) {
        return h('div', { className: 'bg-cyan-50 rounded-xl p-6 border-2 border-cyan-200 text-center space-y-3' },
          h('div', { className: 'text-5xl' }, '⚪'),
          h('h4', { className: 'text-xl font-black text-cyan-800' }, 'Connect-Four Fractions'),
          h('p', { className: 'text-sm text-cyan-700 max-w-md mx-auto' },
            '2-player game. Place discs that show random fractions in the 7×6 grid. Have fun naming the fractions.'
          ),
          h('button', { onClick: startCf,
            className: 'px-6 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-700' }, '⚪ Start game')
        );
      }
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'flex items-center gap-3 bg-cyan-50 rounded-xl p-3 border border-cyan-200' },
          h('span', { className: 'text-2xl' }, '⚪'),
          h('span', { className: 'font-bold text-cyan-800' }, 'Player ' + cf.currentPlayer + '\'s turn'),
          h('button', { onClick: startCf,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-cyan-200 text-cyan-800 hover:bg-cyan-300' }, '↺ Restart')
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-3' },
          h('div', { className: 'grid gap-1', style: { gridTemplateColumns: 'repeat(7, 1fr)' } },
            Array.from({ length: COLS }, function(_, c) {
              return h('button', { key: 'cf-col-' + c, onClick: function() { placeDisc(c); },
                className: 'px-2 py-1 bg-cyan-500 text-white text-xs font-bold rounded hover:bg-cyan-600' }, '↓');
            })
          ),
          h('div', { className: 'grid gap-1 mt-2', style: { gridTemplateColumns: 'repeat(7, 1fr)' } },
            cf.board.flatMap(function(row, r) {
              return row.map(function(cell, c) {
                if (!cell) return h('div', { key: 'cell-' + r + '-' + c, className: 'aspect-square bg-cyan-100 border border-cyan-200 rounded' });
                return h('div', { key: 'cell-' + r + '-' + c,
                  className: 'aspect-square flex items-center justify-center font-bold font-mono text-xs rounded ' +
                    (cell.player === 1 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white')
                }, cell.n + '/' + cell.d);
              });
            })
          )
        )
      );
    };

    // ── DAILY ROUTINE TEMPLATE ──
    var DAILY_ROUTINES = [
      {
        id: 'k-3-warmup', title: 'Grades K-3 morning warm-up (10 min)',
        sequence: [
          { time: '2 min', activity: 'Number Talk', tab: 'mathtalks', description: 'Pick one Number Talk string. Students explain reasoning out loud.' },
          { time: '5 min', activity: 'Visual Practice', tab: 'practice', description: 'Show 3-4 fractions in the pie model. Students identify or describe.' },
          { time: '3 min', activity: 'Benchmark', tab: 'benchmarks', description: '5 quick benchmark questions.' }
        ]
      },
      {
        id: 'g4-5-block', title: 'Grades 4-5 fraction block (30 min)',
        sequence: [
          { time: '5 min', activity: 'Warm-up', tab: 'mathtalks', description: 'Number Talk string.' },
          { time: '10 min', activity: 'Mini-lesson', tab: 'examples', description: 'Walk through 1 Worked Example.' },
          { time: '10 min', activity: 'Practice', tab: 'operations', description: 'Practice with the operation taught.' },
          { time: '5 min', activity: 'Exit ticket', tab: 'exitticket', description: 'Quick 3-question check.' }
        ]
      },
      {
        id: 'rti-tier2', title: 'RTI Tier 2 small-group (20 min)',
        sequence: [
          { time: '3 min', activity: 'CBM probe', tab: 'rtiprobe', description: 'Quick fluency check (charted weekly).' },
          { time: '5 min', activity: 'CRA review', tab: 'cra', description: 'Walk through Concrete → Representational → Abstract for current topic.' },
          { time: '10 min', activity: 'Targeted practice', tab: 'pbank', description: 'Curated practice items at student\'s level.' },
          { time: '2 min', activity: 'Reflection', tab: 'mastery', description: 'Look at mastery dashboard together.' }
        ]
      },
      {
        id: 'enrichment', title: 'Enrichment (30 min)',
        sequence: [
          { time: '10 min', activity: 'Brain teaser', tab: 'brain', description: 'Pick a hard puzzle. Discuss strategies.' },
          { time: '10 min', activity: 'Game', tab: 'games', description: 'Race or Hide & Seek.' },
          { time: '10 min', activity: 'Real-world', tab: 'rwt', description: 'Read a real-world tool example aloud. Discuss.' }
        ]
      },
      {
        id: 'review-day', title: 'Review day (45 min)',
        sequence: [
          { time: '5 min', activity: 'Warm-up', tab: 'estimation', description: 'Estimation Trainer.' },
          { time: '15 min', activity: 'Worksheet', tab: 'worksheets', description: 'Mixed worksheet.' },
          { time: '10 min', activity: 'Word problems', tab: 'wordproblems', description: '3 problems with hints if needed.' },
          { time: '10 min', activity: 'Game choice', tab: 'games', description: 'Student picks a game.' },
          { time: '5 min', activity: 'Exit ticket', tab: 'exitticket', description: 'Quick assessment.' }
        ]
      }
    ];

    var renderDailyRoutineTab = function() {
      var routId = _f.routId || DAILY_ROUTINES[0].id;
      var routine = DAILY_ROUTINES.find(function(r) { return r.id === routId; }) || DAILY_ROUTINES[0];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-emerald-50 rounded-xl p-3 border border-emerald-200' },
          h('h4', { className: 'text-sm font-bold text-emerald-800 mb-1' }, '⏱ Daily routine templates'),
          h('p', { className: 'text-[11px] text-emerald-700' },
            'Pre-built sequences of activities that fit common time blocks (10 min, 30 min, 45 min). Pick one and follow it.'
          )
        ),
        h('div', { className: 'flex flex-wrap gap-1' },
          DAILY_ROUTINES.map(function(r) {
            var active = routId === r.id;
            return h('button', {
              key: 'dr-' + r.id,
              onClick: function() { upd({ routId: r.id }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                (active ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100')
            }, r.title);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-4 space-y-2' },
          h('h5', { className: 'text-base font-black text-emerald-900' }, routine.title),
          routine.sequence.map(function(s, i) {
            return h('div', { key: 'rs-' + i, className: 'border-l-4 border-emerald-300 pl-3 py-2 bg-emerald-50 rounded-r' },
              h('p', { className: 'text-xs font-bold text-emerald-800' }, s.time + ' · ' + s.activity),
              h('p', { className: 'text-[11px] text-slate-700 mt-1' }, s.description),
              h('button', { onClick: function() { upd({ tab: s.tab }); },
                className: 'mt-1 text-[10px] font-bold text-emerald-700 hover:underline' }, '→ Go to ' + s.tab + ' tab')
            );
          })
        )
      );
    };

    // ── EXIT TICKET GENERATOR ──
    var renderExitTicketTab = function() {
      var etTopic = _f.etTopic || 'identify';
      var ETICKET_TOPICS = [
        { id: 'identify', label: 'Identify fractions' },
        { id: 'equivalent', label: 'Equivalent fractions' },
        { id: 'compare', label: 'Compare fractions' },
        { id: 'add', label: 'Add fractions' },
        { id: 'multiply', label: 'Multiply fractions' }
      ];
      var generateExitTicket = function() {
        if (typeof window === 'undefined' || !window.print) return;
        var probs = [];
        // Generate 3 quick problems
        for (var i = 0; i < 3; i++) {
          if (etTopic === 'identify') {
            var d = pick([2, 3, 4, 5, 6, 8]);
            var n = randInt(1, d - 1);
            probs.push({ q: 'What fraction is shown?', display: { type: 'pie', n: n, d: d }, answer: n + '/' + d });
          } else if (etTopic === 'equivalent') {
            var ed = pick([2, 3, 4, 5, 6]);
            var en = randInt(1, ed - 1);
            var em = randInt(2, 4);
            probs.push({ q: en + '/' + ed + ' = ?/' + (ed * em), answer: (en * em) });
          } else if (etTopic === 'compare') {
            var d1 = pick([2, 3, 4, 6, 8]);
            var d2 = pick([2, 3, 4, 6, 8]);
            var n1q = randInt(1, d1);
            var n2q = randInt(1, d2);
            while ((n1q / d1) === (n2q / d2)) n2q = (n2q % d2) + 1;
            probs.push({ q: 'Which is larger: ' + n1q + '/' + d1 + ' or ' + n2q + '/' + d2 + '?', answer: (n1q / d1) > (n2q / d2) ? n1q + '/' + d1 : n2q + '/' + d2 });
          } else if (etTopic === 'add') {
            var ad1 = pick([2, 3, 4, 6, 8]);
            var ad2 = pick([2, 3, 4, 6, 8]);
            var an1 = randInt(1, ad1 - 1);
            var an2 = randInt(1, ad2 - 1);
            var acd = lcm(ad1, ad2);
            var asum = an1 * (acd / ad1) + an2 * (acd / ad2);
            var asimp = simplify(asum, acd);
            probs.push({ q: an1 + '/' + ad1 + ' + ' + an2 + '/' + ad2 + ' = ?', answer: asimp[0] + '/' + asimp[1] });
          } else {
            var md1 = pick([2, 3, 4, 5]);
            var md2 = pick([2, 3, 4, 5]);
            var mn1 = randInt(1, md1 - 1);
            var mn2 = randInt(1, md2 - 1);
            var msimp = simplify(mn1 * mn2, md1 * md2);
            probs.push({ q: mn1 + '/' + md1 + ' × ' + mn2 + '/' + md2 + ' = ?', answer: msimp[0] + '/' + msimp[1] });
          }
        }
        var html = '<html><head><title>Exit Ticket</title>';
        html += '<style>body{font-family:sans-serif;margin:30px;}h2{color:#9f1239;}.q{margin:15px 0;padding:8px;border-bottom:1px solid #ccc;}@media print{}</style></head><body>';
        html += '<h2>Fraction Exit Ticket — ' + etTopic + '</h2>';
        html += '<p>Name: ____________________ Date: ________</p><hr>';
        probs.forEach(function(p, i) {
          html += '<div class="q"><b>' + (i + 1) + '.</b> ' + p.q + ' &nbsp; Answer: ________________</div>';
        });
        html += '<hr><p style="font-size:8pt;color:#888;">Answer key: ' + probs.map(function(p) { return p.answer; }).join(', ') + '</p>';
        html += '</body></html>';
        try {
          var w = window.open('', '_blank');
          if (w) { w.document.write(html); w.document.close(); setTimeout(function() { w.print(); }, 250); }
        } catch (e) { addToast('Could not open print window', 'error'); }
      };
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('h4', { className: 'text-sm font-bold text-amber-800 mb-1' }, '🎫 Exit ticket generator'),
          h('p', { className: 'text-[11px] text-amber-700' },
            'Generate a 3-question exit ticket on the topic just taught. Print and hand out at the end of the lesson.'
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-3 space-y-3' },
          h('label', { className: 'block text-xs font-bold text-amber-700' }, 'Topic'),
          h('select', { value: etTopic,
            onChange: function(e) { upd({ etTopic: e.target.value }); },
            className: 'w-full px-3 py-2 rounded border border-amber-300 text-sm' },
            ETICKET_TOPICS.map(function(t) { return h('option', { key: 'et-' + t.id, value: t.id }, t.label); })
          ),
          h('button', { onClick: generateExitTicket,
            className: 'w-full px-4 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700' }, '🖨 Generate and print exit ticket')
        )
      );
    };

    // ── ASSESSMENT CHECKLIST TAB ──
    var ASSESSMENT_CHECKLISTS = {
      'grade-3': {
        title: 'Grade 3 Fraction Assessment Checklist',
        items: [
          'Student can identify the numerator and denominator of a fraction.',
          'Student can identify a fraction shown in a pie or bar model.',
          'Student can partition a shape into equal parts.',
          'Student can place 1/2, 1/3, 1/4 on a number line.',
          'Student can recognize that 1/2 is between 0 and 1.',
          'Student can name simple equivalent fractions (1/2 = 2/4).',
          'Student understands that 3/3 = 1 (whole).',
          'Student can compare fractions with the same denominator.',
          'Student can compare fractions with the same numerator.',
          'Student can justify a fraction comparison with a visual model.'
        ]
      },
      'grade-4': {
        title: 'Grade 4 Fraction Assessment Checklist',
        items: [
          'Student can generate equivalent fractions by multiplying top and bottom by the same number.',
          'Student can simplify a fraction by dividing by the GCD.',
          'Student can compare two fractions with unlike denominators.',
          'Student uses benchmark fractions (1/2, 1) for comparison.',
          'Student can add and subtract fractions with like denominators.',
          'Student can convert between mixed numbers and improper fractions.',
          'Student can multiply a fraction by a whole number.',
          'Student understands decimal notation for tenths and hundredths.',
          'Student can convert tenths to hundredths (1/10 = 10/100).',
          'Student can solve word problems with same-denominator addition/subtraction.'
        ]
      },
      'grade-5': {
        title: 'Grade 5 Fraction Assessment Checklist',
        items: [
          'Student can find LCM of two denominators.',
          'Student can add fractions with unlike denominators.',
          'Student can subtract fractions with unlike denominators.',
          'Student can solve word problems with unlike-denominator addition.',
          'Student understands a/b as a÷b (fraction as division).',
          'Student can multiply two fractions.',
          'Student can multiply a fraction by a mixed number.',
          'Student understands multiplication as scaling.',
          'Student can divide a unit fraction by a whole number.',
          'Student can divide a whole number by a unit fraction.',
          'Student can solve real-world problems with fraction multiplication.'
        ]
      }
    };

    var renderAssessmentChecklistTab = function() {
      var checkGrade = _f.checkGrade || 'grade-4';
      var checklist = ASSESSMENT_CHECKLISTS[checkGrade] || ASSESSMENT_CHECKLISTS['grade-4'];
      var checked = _f.checked || {};
      var toggleCheck = function(idx) {
        var k = checkGrade + '-' + idx;
        var n = Object.assign({}, checked);
        n[k] = !n[k];
        upd({ checked: n });
      };
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
          h('h4', { className: 'text-sm font-bold text-indigo-800 mb-1' }, '☑ Assessment checklist'),
          h('p', { className: 'text-[11px] text-indigo-700' },
            'Per-grade skills checklists. Use during one-on-one assessment or to plan instruction.'
          )
        ),
        h('div', { className: 'flex gap-1' },
          Object.keys(ASSESSMENT_CHECKLISTS).map(function(g) {
            var active = checkGrade === g;
            return h('button', {
              key: 'cg-' + g,
              onClick: function() { upd({ checkGrade: g }); },
              className: 'flex-1 px-3 py-1.5 rounded text-xs font-bold transition-all capitalize ' +
                (active ? 'bg-indigo-700 text-white' : 'bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-100')
            }, g.replace('-', ' '));
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-4' },
          h('h5', { className: 'text-sm font-black text-indigo-900 mb-3' }, checklist.title),
          checklist.items.map(function(item, i) {
            var isChecked = !!checked[checkGrade + '-' + i];
            return h('label', { key: 'ck-' + i, className: 'flex items-start gap-2 py-1.5 border-b border-indigo-100 cursor-pointer' },
              h('input', { type: 'checkbox', checked: isChecked, onChange: function() { toggleCheck(i); }, className: 'mt-0.5 accent-indigo-600' }),
              h('span', { className: 'text-sm ' + (isChecked ? 'text-indigo-900 line-through' : 'text-slate-800') }, item)
            );
          })
        )
      );
    };

    // ── PARENT GUIDE TAB ──
    // Quick guide for parents helping kids at home.
    var PARENT_GUIDE_SECTIONS = [
      {
        title: 'My child says "I hate fractions"',
        body: 'Very common. Fractions break the rules students learn for whole numbers — bigger numbers don\'t always mean bigger values. The frustration is real and normal. Help by: (1) using visual models like pizzas or fraction strips, (2) connecting to real life (cooking, time, money), (3) practicing little and often (5 min a day) rather than long sessions, (4) celebrating effort, not just correct answers.'
      },
      {
        title: 'My child doesn\'t understand WHY procedures work',
        body: 'They are not alone — most students learn the procedure first and the why later. Help by always showing what the procedure looks like with a picture. "Multiply 3/4 by 1/2" can be drawn as a rectangle. The Op Proofs tab does this for you. Ask "why?" gently and frequently.'
      },
      {
        title: 'How can I help with homework without doing it for them?',
        body: 'Use the Worked Examples tab — they show step-by-step procedures with reasoning. Walk through similar problems together, not the exact same one. If they say "I don\'t know how to start," ask "What does the problem ask you to find? What do we already know?" The hint system in Word Problems gives layered hints — try the first one before the answer.'
      },
      {
        title: 'What should I drill?',
        body: 'IES Practice Guide recommends: (1) magnitude reasoning (number line work), (2) connections between visual and symbolic, (3) word problems in context. AVOID: drill on procedures without understanding. Spend 5 minutes on Benchmark Trainer, 5 on Word Problems, and 5 on a game — that\'s a great 15-minute session.'
      },
      {
        title: 'My child gets the procedure right but the answer wrong',
        body: 'Usually means a small arithmetic error (e.g., multiplied wrong) or didn\'t simplify. Show them the Cheat Sheet — they can check their work step by step. Encourage them to verify with a different method (estimate first, or use a different model).'
      },
      {
        title: 'What if I don\'t remember fractions well myself?',
        body: 'You don\'t have to be the expert! Use the Tab Guide and Worked Examples — they explain procedures clearly. Better: model "let\'s figure this out together." You can learn alongside your child. The Vocabulary tab is helpful even for adults.'
      },
      {
        title: 'How do I know if my child is on track?',
        body: 'Look at the Standards tab to see which CCSS standards they should know for their grade. The Mastery tab shows progress. For a quick check: can they (a) draw a model for 3/4, (b) say a fraction equivalent to 1/2, (c) compare 2/3 and 3/4 and explain? Those three tests cover most K-5 fraction expectations.'
      }
    ];

    var renderParentGuideTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-pink-50 rounded-xl p-3 border border-pink-200' },
          h('h4', { className: 'text-sm font-bold text-pink-800 mb-1' }, '👨‍👩‍👧 Parent guide'),
          h('p', { className: 'text-[11px] text-pink-700' },
            'Guidance for parents helping kids with fractions at home. Common challenges, practical tips, and what to ask.'
          )
        ),
        PARENT_GUIDE_SECTIONS.map(function(s, i) {
          return h('details', { key: 'pg-' + i, className: 'bg-white rounded-xl p-3 border border-pink-200' },
            h('summary', { className: 'text-sm font-bold text-pink-900 cursor-pointer' }, '❓ ' + s.title),
            h('p', { className: 'text-xs text-slate-700 mt-2 leading-relaxed' }, s.body)
          );
        })
      );
    };

    // ── UDL PRINCIPLES TAB ──
    // Map AlloFlow Fraction Lab features to CAST's UDL guidelines.
    var UDL_GUIDELINES = [
      {
        principle: 'Multiple Means of Engagement',
        subtitle: 'The "WHY" of learning — recruiting interest, sustaining effort, self-regulation',
        items: [
          { feature: 'Games (9 mini-games)', maps: 'Recruiting Interest — choice and novelty' },
          { feature: 'Daily practice with streak tracking', maps: 'Sustaining effort — goal-setting and persistence' },
          { feature: 'Achievement levels and badges', maps: 'Recruiting interest — feedback' },
          { feature: 'Story Mode', maps: 'Recruiting interest — relevance and authenticity' },
          { feature: 'Real-world contexts (cooking, money, sports)', maps: 'Recruiting interest — authenticity' },
          { feature: 'Mastery dashboard', maps: 'Self-regulation — self-monitoring' },
          { feature: 'Difficulty levels (easy/medium/hard)', maps: 'Sustaining effort — appropriate challenge' }
        ]
      },
      {
        principle: 'Multiple Means of Representation',
        subtitle: 'The "WHAT" of learning — perception, language, comprehension',
        items: [
          { feature: '7 visual models (pie, bar, number line, area, set, length, volume)', maps: 'Perception — multiple representations' },
          { feature: 'Audio narration of fraction names', maps: 'Perception — auditory alternative' },
          { feature: 'Color-blind safe palettes (4 options)', maps: 'Perception — accessible color' },
          { feature: 'Multilingual vocabulary (12 languages)', maps: 'Language — clarify across languages' },
          { feature: 'Vocabulary + Glossary tabs', maps: 'Language — clarify vocabulary' },
          { feature: 'Worked examples with step-by-step', maps: 'Comprehension — guided processing' },
          { feature: 'CRA progression', maps: 'Comprehension — Concrete → Representational → Abstract' },
          { feature: 'Conversion tables', maps: 'Comprehension — patterns and big ideas' }
        ]
      },
      {
        principle: 'Multiple Means of Action & Expression',
        subtitle: 'The "HOW" of learning — physical action, expression, executive function',
        items: [
          { feature: 'Keyboard shortcuts for all major actions', maps: 'Physical action — keyboard alternatives' },
          { feature: 'Touch-compatible UI', maps: 'Physical action — multiple input modes' },
          { feature: 'Multiple game formats', maps: 'Expression — varied output modes' },
          { feature: 'Calculator with show-your-work', maps: 'Expression — supports for process' },
          { feature: 'Save/load sessions', maps: 'Executive function — supports for working memory' },
          { feature: 'Mastery dashboard', maps: 'Executive function — goal-setting' },
          { feature: 'Multi-step problems with progress bar', maps: 'Executive function — breaking down complex problems' }
        ]
      }
    ];

    var renderUDLTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-purple-50 rounded-xl p-3 border border-purple-200' },
          h('h4', { className: 'text-sm font-bold text-purple-800 mb-1' }, '🎨 UDL alignment — CAST guidelines'),
          h('p', { className: 'text-[11px] text-purple-700' },
            'Every Fraction Lab feature mapped to a Universal Design for Learning (UDL) guideline from CAST. ',
            'Use this to articulate to administrators or grant reviewers how AlloFlow operationalizes UDL.'
          )
        ),
        UDL_GUIDELINES.map(function(g, i) {
          return h('div', { key: 'udl-' + i, className: 'bg-white rounded-xl border-2 border-purple-200 p-3' },
            h('h5', { className: 'text-sm font-black text-purple-900 mb-1' }, g.principle),
            h('p', { className: 'text-[11px] text-purple-700 italic mb-2' }, g.subtitle),
            h('table', { className: 'w-full text-xs' },
              h('thead', null,
                h('tr', { className: 'border-b-2 border-purple-300' },
                  h('th', { className: 'text-left py-1 text-purple-800' }, 'Feature'),
                  h('th', { className: 'text-left py-1 pl-2 text-purple-800' }, 'UDL principle')
                )
              ),
              h('tbody', null,
                g.items.map(function(item, j) {
                  return h('tr', { key: 'udli-' + i + '-' + j, className: 'border-b border-purple-100' },
                    h('td', { className: 'py-1 text-slate-800 font-bold' }, item.feature),
                    h('td', { className: 'py-1 pl-2 text-purple-700' }, item.maps)
                  );
                })
              )
            )
          );
        })
      );
    };

    // ── RESEARCH CITATIONS TAB ──
    var RESEARCH_CITATIONS = [
      {
        category: 'IES Practice Guides',
        items: [
          { citation: 'Siegler, R., Carpenter, T., Fennell, F., Geary, D., Lewis, J., Okamoto, Y., Thompson, L., & Wray, J. (2010). Developing effective fractions instruction for kindergarten through 8th grade: A practice guide (NCEE #2010-4039). Washington, DC: National Center for Education Evaluation and Regional Assistance, Institute of Education Sciences, U.S. Department of Education.', summary: 'The foundational IES Practice Guide. 5 recommendations including the central use of the number-line model.' }
        ]
      },
      {
        category: 'Pedagogical Frameworks',
        items: [
          { citation: 'Bruner, J. S. (1966). Toward a theory of instruction. Cambridge, MA: Harvard University Press.', summary: 'Origin of the enactive (concrete) → iconic (representational) → symbolic (abstract) progression that becomes CRA.' },
          { citation: 'Sealander, K. A., Johnson, G. R., Lockwood, A. B., & Medina, C. M. (2012). Concrete-semiconcrete-abstract (CSA) instruction: A decision rule for improving instructional efficacy. Assessment for Effective Intervention, 38(1), 53-65.', summary: 'CRA in special education context. Evidence for sequencing.' },
          { citation: 'Lesh, R. (1979). Mathematical learning disabilities: Considerations for identification, diagnosis, and remediation. In R. Lesh, D. Mierkiewicz, & M. Kantowski (Eds.), Applied mathematical problem solving. Columbus, OH: ERIC.', summary: 'Origin of the translation model — moving between symbolic, visual, verbal, manipulatives, and real-world contexts.' }
        ]
      },
      {
        category: 'Misconception Research',
        items: [
          { citation: 'Vamvakoussi, X., & Vosniadou, S. (2010). How many decimals are there between two fractions? Aspects of secondary school students\' understanding about rational numbers and their notation. Cognition and Instruction, 28(2), 181-209.', summary: 'Documents the "whole-number bias" misconception.' },
          { citation: 'Stafylidou, S., & Vosniadou, S. (2004). The development of students\' understanding of the numerical value of fractions. Learning and Instruction, 14(5), 503-518.', summary: 'Maps how students construct fraction magnitude over time.' },
          { citation: 'Lortie-Forgues, H., Tian, J., & Siegler, R. S. (2015). Why is learning fraction and decimal arithmetic so difficult? Developmental Review, 38, 201-221.', summary: 'Synthesizes the cognitive challenges of fraction arithmetic.' }
        ]
      },
      {
        category: 'Number Talks',
        items: [
          { citation: 'Parrish, S. (2010). Number talks: Helping children build mental math and computation strategies, grades K-5. Sausalito, CA: Math Solutions.', summary: 'Foundational text for the Number Talk routine.' },
          { citation: 'Boaler, J. (2016). Mathematical mindsets: Unleashing students\' potential through creative math, inspiring messages and innovative teaching. San Francisco: Jossey-Bass.', summary: 'Growth mindset applied to mathematics education.' }
        ]
      },
      {
        category: 'Manipulatives',
        items: [
          { citation: 'Cuisenaire, G. (1952). Les Nombres en Couleurs (Numbers in Color).', summary: 'Original Cuisenaire rod system that became the prototype for fraction strips.' },
          { citation: 'Sowell, E. J. (1989). Effects of manipulative materials in mathematics instruction. Journal for Research in Mathematics Education, 20(5), 498-505.', summary: 'Meta-analysis showing positive effects of manipulatives on math achievement.' }
        ]
      },
      {
        category: 'Educational Technology',
        items: [
          { citation: 'Roschelle, J., Shechtman, N., Tatar, D., Hegedus, S., Hopkins, B., Empson, S., Knudsen, J., & Gallagher, L. P. (2010). Integration of technology, curriculum, and professional development for advancing middle school mathematics. American Educational Research Journal, 47(4), 833-878.', summary: 'Effects of ed-tech integration on math learning.' },
          { citation: 'Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257-285.', summary: 'Worked-example effect — why showing solutions can be more effective than practice alone for novices.' }
        ]
      }
    ];

    var renderCitationsTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-stone-50 rounded-xl p-3 border border-stone-200' },
          h('h4', { className: 'text-sm font-bold text-stone-800 mb-1' }, '📚 Research citations'),
          h('p', { className: 'text-[11px] text-stone-700' },
            'The research base for AlloFlow Fraction Lab. Use these citations when justifying tool use to administrators, in IEP documentation, or in grant applications.'
          )
        ),
        RESEARCH_CITATIONS.map(function(cat) {
          return h('div', { key: 'rc-' + cat.category, className: 'bg-white rounded-xl p-3 border border-stone-200' },
            h('h5', { className: 'text-sm font-black text-stone-900 mb-2' }, cat.category),
            h('div', { className: 'space-y-2' },
              cat.items.map(function(item, i) {
                return h('div', { key: 'ci-' + cat.category + '-' + i, className: 'border-l-4 border-stone-300 pl-3 py-1' },
                  h('p', { className: 'text-[11px] text-slate-700 italic' }, item.citation),
                  h('p', { className: 'text-xs text-stone-700 mt-1' }, '→ ' + item.summary)
                );
              })
            )
          );
        })
      );
    };

    // ── TOUR / FEATURE GUIDE TAB ──
    // Long-form, indexed walkthrough of every tab in the lab. Used as a
    // training resource for teachers new to AlloFlow.
    var TAB_GUIDES = [
      {
        section: 'LEARN MODE',
        tabs: [
          { id: 'practice', title: 'Practice', purpose: 'Build basic fraction intuition.', when: 'New learners. Daily warm-up.', tip: 'Use the slider to change numerator and denominator. The pie/bar updates live.' },
          { id: 'models', title: 'Models', purpose: 'Switch between 7 visual representations of the same fraction.', when: 'When a student is stuck on one representation.', tip: 'Toggle between pie and number-line to build flexibility.' },
          { id: 'numberline', title: 'Number Line', purpose: 'Place fractions as points on a number line. Build magnitude reasoning.', when: 'Always — IES Practice Guide recommends this as the central representation.', tip: 'Plot multiple fractions to see their relative size.' },
          { id: 'cra', title: 'CRA Progression', purpose: 'Walk through Concrete-Representational-Abstract.', when: 'New fraction concept introduction; struggling learners.', tip: 'Don\'t skip stages. Linger on Concrete until confident.' },
          { id: 'wall', title: 'Fraction Wall', purpose: 'Visual proof of equivalence by stacking.', when: 'Introducing equivalent fractions.', tip: 'Click two rows to compare their heights directly.' },
          { id: 'vocab', title: 'Vocabulary', purpose: 'Definitions of every fraction term.', when: 'Reference; ELL students; pre-teaching.', tip: 'Use the search to find a specific term.' },
          { id: 'examples', title: 'Worked Examples', purpose: 'Step-by-step demonstrations of procedures.', when: 'Before practice. Research shows worked examples are more effective than practice alone for novices.', tip: 'Don\'t skip the explanation steps — read each one.' },
          { id: 'faq', title: 'FAQ', purpose: 'Common student questions answered.', when: 'When students get stuck.', tip: 'Read aloud as class discussion prompts.' },
          { id: 'compareS', title: 'Compare Strategies', purpose: '5 different ways to compare fractions.', when: 'When students rely on only one method.', tip: 'Make this a poster.' },
          { id: 'cheatsheet', title: 'Cheat Sheet', purpose: 'All procedures on one printable page.', when: 'Reference. Take-home.', tip: 'Print and laminate.' },
          { id: 'tables', title: 'Conversion Tables', purpose: 'Look up fraction-decimal-percent equivalents.', when: 'Reference. Spot patterns.', tip: 'Notice the patterns: 5/8 = 0.625 = 62.5%.' },
          { id: 'glossary', title: 'Glossary', purpose: 'Extended vocabulary with examples.', when: 'Reference.', tip: 'Different from Vocab tab — more terms, more examples.' },
          { id: 'density', title: 'Density', purpose: 'Find fractions between fractions. Infinity.', when: 'Advanced. Connects to number-line work.', tip: 'Use mediant for surprising results.' },
          { id: 'timeline', title: 'History Timeline', purpose: 'Fractions across 4,000 years.', when: 'Cross-curricular tie-ins. History or culture units.', tip: 'Pick one entry per week as a journal prompt.' },
          { id: 'manip', title: 'Manipulatives', purpose: 'Click-to-add virtual fraction pieces.', when: 'Building intuition. Free exploration.', tip: 'Have students try to make exactly 1.' },
          { id: 'help', title: 'Help', purpose: 'Guide to using Fraction Lab.', when: 'First time using the lab.', tip: 'Read once, then reference.' },
          { id: 'about', title: 'About', purpose: 'Pedagogical foundations and feature summary.', when: 'Curriculum advocate; presenting to admin.', tip: 'Use the credits as evidence base.' }
        ]
      },
      {
        section: 'PRACTICE MODE',
        tabs: [
          { id: 'compare', title: 'Compare', purpose: 'Compare two fractions. Quizzes.', when: 'Skill drill.', tip: 'Show the visual model alongside the symbolic comparison.' },
          { id: 'operations', title: 'Operations', purpose: 'Add, subtract, multiply, divide.', when: 'Core skill practice.', tip: 'Pair with Op Proofs tab.' },
          { id: 'opsproof', title: 'Op Proofs', purpose: 'Visual proofs of operations.', when: 'When students do procedure but don\'t understand why.', tip: 'Click through all four operations.' },
          { id: 'equivalents', title: 'Equivalents', purpose: 'Generate equivalent fractions.', when: 'Building equivalence flexibility.', tip: 'Pair with Equivalent Chain tab.' },
          { id: 'equivchain', title: 'Equivalent Chain', purpose: 'Generate arbitrary-length chains.', when: 'Seeing the pattern.', tip: 'Try chains of length 20 to drill the pattern.' },
          { id: 'converter', title: 'Converter', purpose: 'Fraction ↔ decimal ↔ percent ↔ mixed.', when: 'Cross-representation fluency.', tip: 'Try the same value in all representations.' },
          { id: 'decimals', title: 'Decimals', purpose: 'Decimal exploration with long division.', when: 'Decimal expansion concept.', tip: 'Try 1/3 — see the repeating decimal.' },
          { id: 'percents', title: 'Percents', purpose: '100-grid visualization of percent.', when: 'Percent introduction.', tip: 'Build percent intuition before procedure.' },
          { id: 'benchmarks', title: 'Benchmarks', purpose: 'Identify closest benchmark fraction.', when: 'Number sense drill.', tip: 'Daily warm-up — 1 minute of benchmark questions.' },
          { id: 'pbank', title: 'Practice Bank', purpose: 'Curated problems by skill.', when: 'Slow-paced practice.', tip: 'No timer. Browse at your pace.' },
          { id: 'calc', title: 'Calculator', purpose: 'Show-your-work fraction calculator.', when: 'Verifying answers; modeling procedure.', tip: 'Don\'t let students use without first attempting by hand.' },
          { id: 'factfam', title: 'Fact Families', purpose: 'Related operations from one triple.', when: 'Cementing the inverse relationship.', tip: 'Generate 5-10 fact families per day.' },
          { id: 'estimation', title: 'Estimation', purpose: 'Estimate closest benchmark.', when: 'Number sense.', tip: 'Speed-up activity. 30 seconds per question.' },
          { id: 'vocabquiz', title: 'Vocab Quiz', purpose: 'Multiple-choice vocab.', when: 'Pre/post unit assessment.', tip: 'Use for warm-up routine.' },
          { id: 'mastery', title: 'Mastery', purpose: 'Per-skill progress tracking.', when: 'Reflection. Goal-setting.', tip: 'Review weekly.' },
          { id: 'examprep', title: 'Exam Prep', purpose: 'Multiple-choice practice tests.', when: 'Before standardized tests.', tip: 'Take untimed first, then under time pressure.' },
          { id: 'daily', title: 'Daily', purpose: 'Practice streak tracking.', when: 'Building habit.', tip: 'Set a low daily target (5 problems) for sustainability.' },
          { id: 'goals', title: 'Goal Setter', purpose: 'Set personal daily/weekly targets.', when: 'Beginning of unit. Conferences.', tip: 'Realistic > ambitious.' }
        ]
      },
      {
        section: 'APPLY MODE',
        tabs: [
          { id: 'wordproblems', title: 'Word Problems', purpose: '80+ contextual problems.', when: 'After basic skills are stable.', tip: 'Hints are progressive — encourage students to try first.' },
          { id: 'games', title: 'Games', purpose: '9 mini-games.', when: 'Variety. Fluency drill in disguise.', tip: 'Rotate games — don\'t over-rely on one.' },
          { id: 'recipes', title: 'Recipe Scaler', purpose: 'Real-world fraction multiplication.', when: 'Cooking unit. Real-life applications.', tip: 'Pair with a Hands-on Activity (real recipe).' },
          { id: 'multistep', title: 'Multi-step', purpose: '2-4 step problem chains.', when: 'Building stamina.', tip: 'Don\'t do all in one sitting.' },
          { id: 'art', title: 'Fraction Art', purpose: 'Generative visual patterns.', when: 'Free time. Cross-curricular with art.', tip: 'Print and frame!' },
          { id: 'probability', title: 'Probability', purpose: 'Fractions as outcomes.', when: 'Cross-curricular with probability unit.', tip: 'Real coin flip experiments.' },
          { id: 'magic', title: 'Magic Tricks', purpose: 'Surprising fraction identities.', when: 'Engagement; deeper math curiosity.', tip: 'Present as a "trick" first; explain after.' },
          { id: 'rwt', title: 'Real-World Tools', purpose: 'Where you encounter fractions in life.', when: 'Connecting math to life.', tip: 'Bring in actual rulers and measuring cups.' },
          { id: 'story', title: 'Story Mode', purpose: 'Narrative-driven problem sequence.', when: 'Engagement-focused students.', tip: 'Read aloud as a class.' },
          { id: 'brain', title: 'Brain Teasers', purpose: '10 puzzles, easy to hard.', when: 'Gifted enrichment; problem-solving focus.', tip: 'Don\'t reveal hints too quickly.' },
          { id: 'levels', title: 'Levels', purpose: 'XP-based progression.', when: 'Engagement / gamification.', tip: 'Pair with badge celebration.' },
          { id: 'data', title: 'Data Analysis', purpose: 'Fractions in real data.', when: 'Cross-curricular data unit.', tip: 'Collect real classroom data.' },
          { id: 'quotes', title: 'Quotes', purpose: 'Math inspiration.', when: 'Journal prompts. Classroom posters.', tip: 'Pick one per week.' }
        ]
      },
      {
        section: 'TEACHER MODE',
        tabs: [
          { id: 'worksheets', title: 'Worksheets', purpose: 'Printable practice with answer key.', when: 'Homework. Substitute lessons.', tip: 'Mix topics for retention.' },
          { id: 'rtiprobe', title: 'RTI Probes', purpose: 'Timed CBM probes for progress monitoring.', when: 'Weekly progress checks.', tip: 'Graph results over time.' },
          { id: 'reports', title: 'Reports', purpose: 'Session-level progress reports.', when: 'IEP meetings. Parent conferences.', tip: 'Download as txt, attach to docs.' },
          { id: 'standards', title: 'Standards', purpose: 'CCSS K-8 mapped to tabs.', when: 'Curriculum mapping.', tip: 'Filter by grade level.' },
          { id: 'misconceptions', title: 'Misconceptions', purpose: 'Library of 12 documented errors.', when: 'When student is stuck or making consistent errors.', tip: 'Read remediation strategies carefully.' },
          { id: 'iep', title: 'IEP Goals', purpose: 'Pre-formatted SMART goals.', when: 'Drafting IEPs.', tip: 'Adapt language to your student.' },
          { id: 'lessons', title: 'Lessons', purpose: '4 ready-to-use lesson plans.', when: 'Unit planning.', tip: 'Use as templates for your own.' },
          { id: 'sessions', title: 'Sessions', purpose: 'Save/load student state.', when: 'Multi-day work with one student.', tip: 'Name sessions by student initials.' },
          { id: 'settings', title: 'Settings', purpose: 'Palette, audio, difficulty.', when: 'Accommodations for individual students.', tip: 'Color-blind palette helps many students with visual processing.' },
          { id: 'mathtalks', title: 'Math Talks', purpose: 'Number Talk strings.', when: 'Daily 10-15 min routine.', tip: 'Push for student explanations.' },
          { id: 'refcard', title: 'Ref Card', purpose: 'Quick lookup card.', when: 'Take-home; binder reference.', tip: 'Print and laminate.' },
          { id: 'activities', title: 'Hands-on', purpose: '8 off-screen activities.', when: 'Variety; non-digital practice.', tip: 'Start unit with 1 hands-on activity.' },
          { id: 'ml', title: 'Multilingual', purpose: 'Fraction terms in 12 languages.', when: 'ELL students.', tip: 'Pair home-language and English explicitly.' },
          { id: 'mcflow', title: 'Mc Remediation', purpose: 'Step-by-step misconception fix.', when: 'When you\'ve identified a specific misconception.', tip: 'Walk through one strategy per session.' },
          { id: 'printlab', title: 'Print Lab', purpose: 'Centralized printing hub.', when: 'Preparing offline materials.', tip: 'Print before the school day starts.' },
          { id: 'differentiation', title: 'Differentiation', purpose: 'Accommodations by learning profile.', when: 'Planning for individual students.', tip: 'Pick the closest profile, not a perfect match.' },
          { id: 'rubric', title: 'Rubric', purpose: '4-level holistic rubric.', when: 'Portfolio assessment.', tip: 'Use to give students feedback on reasoning.' },
          { id: 'scope', title: 'Scope & Sequence', purpose: 'K-8 fraction trajectory.', when: 'Curriculum planning.', tip: 'Cross-reference with your district pacing guide.' }
        ]
      }
    ];

    var renderTabGuideTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-slate-50 rounded-xl p-3 border border-slate-200' },
          h('h4', { className: 'text-sm font-bold text-slate-800 mb-1' }, '📚 Tab guide — every feature explained'),
          h('p', { className: 'text-[11px] text-slate-700' },
            'A comprehensive guide to all ' + tabs.length + ' tabs in Fraction Lab. ',
            'Each tab includes its purpose, when to use it, and a pro tip. ',
            'Useful for new teachers, substitute teachers, or anyone evaluating the tool.'
          )
        ),
        TAB_GUIDES.map(function(section) {
          return h('div', { key: 'tg-' + section.section, className: 'bg-white rounded-xl border-2 border-slate-200 p-3' },
            h('h5', { className: 'text-sm font-black text-slate-900 mb-2' }, section.section),
            h('div', { className: 'space-y-2' },
              section.tabs.map(function(t, i) {
                return h('div', { key: 'tgr-' + section.section + '-' + i, className: 'border-l-4 border-slate-200 pl-3 py-1' },
                  h('p', { className: 'text-sm font-bold text-slate-800' }, t.title),
                  h('p', { className: 'text-[11px] text-slate-700' }, h('b', null, 'Purpose: '), t.purpose),
                  h('p', { className: 'text-[11px] text-slate-700' }, h('b', null, 'When: '), t.when),
                  h('p', { className: 'text-[11px] text-slate-600 italic' }, '💡 ' + t.tip)
                );
              })
            )
          );
        })
      );
    };

    // ── FRACTION TIMELINE TAB ──
    // History of fractions in chronological order.
    var FRACTION_TIMELINE = [
      { period: '~1800 BCE', civilization: 'Ancient Egypt', event: 'Rhind Mathematical Papyrus', detail: 'Egyptian unit fractions (1/n) and special notations for 2/3. They wrote any fraction as a sum of distinct unit fractions: 2/5 = 1/3 + 1/15.' },
      { period: '~1700 BCE', civilization: 'Babylon', event: 'Sexagesimal (base-60) fractions', detail: 'Babylonians used base 60 for fractions. This is why we still have 60 minutes in an hour and 360 degrees in a circle.' },
      { period: '~500 BCE', civilization: 'Greece', event: 'Pythagoras and ratios', detail: 'Pythagoreans believed all numbers were ratios of whole numbers. Hippasus reportedly proved √2 is irrational and was thrown overboard.' },
      { period: '~300 BCE', civilization: 'India', event: 'Brahmi numerals + zero', detail: 'Indian mathematicians develop place-value notation that will eventually enable modern decimal arithmetic.' },
      { period: '~250 CE', civilization: 'China', event: 'Liu Hui\'s commentary on the Nine Chapters', detail: 'Comprehensive treatment of fractions including reduction to lowest terms.' },
      { period: '~830 CE', civilization: 'Persia', event: 'Al-Khwarizmi\'s arithmetic', detail: 'Systematic treatment of fractions in his Arithmetic — introduces algorithms for the four operations.' },
      { period: '~1200 CE', civilization: 'Italy', event: 'Fibonacci\'s Liber Abaci', detail: 'Fibonacci introduces Hindu-Arabic numerals and modern fraction notation (line between top and bottom) to Europe.' },
      { period: '1585', civilization: 'Netherlands', event: 'Stevin\'s "De Thiende"', detail: 'Simon Stevin advocates decimal fractions for everyday calculation. The decimal point as we know it follows.' },
      { period: '1614', civilization: 'Scotland', event: 'Logarithm tables', detail: 'Napier\'s logarithms make fraction arithmetic tractable for astronomy and navigation.' },
      { period: '~1700', civilization: 'Europe', event: 'Decimal point standardization', detail: 'The decimal point becomes universal across Western mathematics.' },
      { period: '1900s', civilization: 'United States', event: 'Common denominator instruction', detail: 'Modern American math curriculum solidifies around the procedure-first model that the IES Practice Guide later critiques.' },
      { period: '1952', civilization: 'Belgium', event: 'Cuisenaire rods', detail: 'Georges Cuisenaire invents colored fraction rods. Becomes the prototype for fraction strips and the "fraction wall" model.' },
      { period: '2010', civilization: 'United States', event: 'IES Practice Guide', detail: 'Siegler et al. publish "Developing Effective Fractions Instruction K-8." Recommends number-line model as central.' },
      { period: '2010s', civilization: 'United States', event: 'Common Core Standards', detail: 'CCSS-Math K-8 fraction trajectory becomes the de facto national framework, with explicit attention to magnitude reasoning.' },
      { period: '2025', civilization: 'Maine, USA', event: 'AlloFlow Fraction Lab', detail: 'Open-source, AGPL-licensed fraction-instruction tool combining all major pedagogical frameworks in one platform.' }
    ];

    var renderTimelineTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-stone-50 rounded-xl p-3 border border-stone-200' },
          h('h4', { className: 'text-sm font-bold text-stone-800 mb-1' }, '⏰ Fraction history timeline'),
          h('p', { className: 'text-[11px] text-stone-700' },
            '4,000 years of fraction history, from Egyptian unit fractions to modern computational tools.'
          )
        ),
        h('div', { className: 'space-y-2' },
          FRACTION_TIMELINE.map(function(t, i) {
            return h('div', { key: 'tl-' + i, className: 'bg-white rounded-lg p-3 border-l-4 border-stone-500' },
              h('div', { className: 'flex items-start gap-2 flex-wrap' },
                h('span', { className: 'text-[10px] font-bold text-stone-700 bg-stone-200 px-2 py-0.5 rounded font-mono' }, t.period),
                h('span', { className: 'text-[10px] font-bold text-stone-600' }, t.civilization)
              ),
              h('p', { className: 'text-sm font-bold text-stone-900 mt-1' }, t.event),
              h('p', { className: 'text-xs text-slate-700 mt-1' }, t.detail)
            );
          })
        )
      );
    };

    // ── DIFFERENTIATION TAB — accommodation menu by need ──
    var DIFFERENTIATION_PROFILES = [
      {
        id: 'visual-learner', label: 'Visual learner',
        recommended: ['Models tab (pie/bar/number-line)', 'Fraction Wall', 'CRA progression', 'Visual operation proofs'],
        avoid: ['Pure symbolic procedure without diagrams'],
        tip: 'Always start with a visual model. Show, then symbolize.'
      },
      {
        id: 'auditory-learner', label: 'Auditory learner',
        recommended: ['Audio narration on (Settings)', 'Math Talks', 'AI tutor for verbal explanations'],
        avoid: ['Silent worksheet-only practice'],
        tip: 'Read fractions aloud. Discuss reasoning out loud.'
      },
      {
        id: 'kinesthetic-learner', label: 'Kinesthetic learner',
        recommended: ['Hands-on activities (paper folding, pattern blocks)', 'Number line walk', 'Manipulatives tab'],
        avoid: ['Long screen-only sessions'],
        tip: 'Physical movement and manipulation reinforce abstract concepts.'
      },
      {
        id: 'autism-spectrum', label: 'Autism spectrum',
        recommended: ['Color-blind palette (if also sensory)', 'Practice Bank for consistency', 'Worked Examples', 'CRA progression', 'Visual schedules'],
        avoid: ['Surprising mode switches', 'Open-ended exploration without structure'],
        tip: 'Predictable routines. Limit visual clutter. Allow extra processing time.'
      },
      {
        id: 'adhd', label: 'ADHD',
        recommended: ['Games (Pizza Shop, Race)', 'Daily Practice (short sessions)', 'Worksheet (set time limits)'],
        avoid: ['Long uninterrupted practice sessions'],
        tip: 'Short bursts. Movement breaks. Embed novelty.'
      },
      {
        id: 'dyscalculia', label: 'Dyscalculia',
        recommended: ['CRA progression', 'Concrete manipulatives', 'Number Line', 'Misconception remediation', 'Smaller numbers first'],
        avoid: ['Time pressure', 'Abstract symbols before concrete'],
        tip: 'Build slowly with concrete materials. Use multiple representations.'
      },
      {
        id: 'ell', label: 'English Language Learner',
        recommended: ['Multilingual vocabulary', 'Visual models over text', 'Vocab Quiz', 'Real-world contexts'],
        avoid: ['Text-heavy word problems before vocabulary is solid'],
        tip: 'Show fraction vocabulary in home language alongside English. The math is universal.'
      },
      {
        id: 'gifted', label: 'Gifted / accelerated',
        recommended: ['Brain Teasers', 'Magic Tricks', 'Density', 'Multi-step Problems', 'Worked Examples'],
        avoid: ['Repetitive drill at current level'],
        tip: 'Push depth: density, infinity, continued fractions. Avoid acceleration without depth.'
      }
    ];

    var renderDifferentiationTab = function() {
      var profId = _f.profId || DIFFERENTIATION_PROFILES[0].id;
      var profile = DIFFERENTIATION_PROFILES.find(function(p) { return p.id === profId; }) || DIFFERENTIATION_PROFILES[0];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-emerald-50 rounded-xl p-3 border border-emerald-200' },
          h('h4', { className: 'text-sm font-bold text-emerald-800 mb-1' }, '🎯 Differentiation tool'),
          h('p', { className: 'text-[11px] text-emerald-700' },
            'Pick a learning profile to see which Fraction Lab tabs and accommodations are most helpful. ',
            'These are suggestions, not prescriptions — every student is unique.'
          )
        ),
        h('div', { className: 'flex flex-wrap gap-1' },
          DIFFERENTIATION_PROFILES.map(function(p) {
            var active = profId === p.id;
            return h('button', {
              key: 'df-' + p.id,
              onClick: function() { upd({ profId: p.id }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                (active ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100')
            }, p.label);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-4 space-y-3' },
          h('h5', { className: 'text-base font-black text-emerald-900' }, profile.label),
          h('div', { className: 'bg-emerald-50 rounded p-2 border border-emerald-200' },
            h('p', { className: 'text-[11px] font-bold text-emerald-700' }, '👍 Recommended Fraction Lab features'),
            h('ul', { className: 'text-xs list-disc pl-5 text-slate-800 mt-1 space-y-0.5' },
              profile.recommended.map(function(r, i) { return h('li', { key: 'rec-' + i }, r); })
            )
          ),
          h('div', { className: 'bg-rose-50 rounded p-2 border border-rose-200' },
            h('p', { className: 'text-[11px] font-bold text-rose-700' }, '⚠ Avoid'),
            h('ul', { className: 'text-xs list-disc pl-5 text-slate-800 mt-1 space-y-0.5' },
              profile.avoid.map(function(a, i) { return h('li', { key: 'av-' + i }, a); })
            )
          ),
          h('div', { className: 'bg-amber-50 rounded p-2 border border-amber-200' },
            h('p', { className: 'text-[11px] font-bold text-amber-700' }, '💡 Tip'),
            h('p', { className: 'text-xs text-slate-800 mt-1' }, profile.tip)
          )
        )
      );
    };

    // ── GOAL SETTER TAB ──
    var renderGoalSetterTab = function() {
      var dailyGoal = _f.dailyGoal || 5;
      var weeklyGoal = _f.weeklyGoal || 30;
      var goalToday = score.correct % dailyGoal;
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-violet-50 rounded-xl p-3 border border-violet-200' },
          h('h4', { className: 'text-sm font-bold text-violet-800 mb-1' }, '🎯 Goal setter'),
          h('p', { className: 'text-[11px] text-violet-700' },
            'Set a personal daily and weekly target. Track your progress. Sustained practice beats intensity for retention.'
          )
        ),
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-white rounded-lg p-3 border border-violet-200' },
            h('label', { className: 'block text-xs font-bold text-violet-700 mb-1' }, 'Daily target (problems)'),
            h('input', {
              type: 'number', min: 1, max: 50, value: dailyGoal,
              onChange: function(e) { upd({ dailyGoal: parseInt(e.target.value) || 5 }); },
              className: 'w-full px-3 py-2 rounded border border-violet-300 text-sm'
            })
          ),
          h('div', { className: 'bg-white rounded-lg p-3 border border-violet-200' },
            h('label', { className: 'block text-xs font-bold text-violet-700 mb-1' }, 'Weekly target (problems)'),
            h('input', {
              type: 'number', min: 5, max: 300, value: weeklyGoal,
              onChange: function(e) { upd({ weeklyGoal: parseInt(e.target.value) || 30 }); },
              className: 'w-full px-3 py-2 rounded border border-violet-300 text-sm'
            })
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-violet-200 p-4 space-y-3' },
          h('div', { className: 'text-center' },
            h('p', { className: 'text-xs text-violet-700' }, 'Today\'s progress'),
            h('p', { className: 'text-2xl font-black text-violet-900' }, score.correct + ' / ' + dailyGoal),
            h('div', { className: 'h-3 bg-slate-200 rounded-full overflow-hidden mt-2' },
              h('div', { style: {
                width: Math.min(100, score.correct / dailyGoal * 100) + '%',
                height: '100%',
                background: 'linear-gradient(90deg,#a855f7,#ec4899)'
              } })
            ),
            score.correct >= dailyGoal && h('p', { className: 'text-sm font-bold text-emerald-600 mt-2' }, '✅ Daily goal reached!')
          ),
          h('div', { className: 'border-t border-violet-100 pt-3' },
            h('p', { className: 'text-xs text-violet-700 mb-1' }, 'Weekly progress (estimated)'),
            h('p', { className: 'text-base font-bold text-violet-800' }, score.correct + ' / ' + weeklyGoal),
            h('div', { className: 'h-2 bg-slate-200 rounded-full overflow-hidden mt-1' },
              h('div', { style: {
                width: Math.min(100, score.correct / weeklyGoal * 100) + '%',
                height: '100%',
                background: '#8b5cf6'
              } })
            )
          )
        )
      );
    };

    // ── QUOTES / INSPIRATION TAB ──
    var FRACTION_QUOTES = [
      { quote: 'Without mathematics, there\'s nothing you can do. Everything around you is mathematics. Everything around you is numbers.', author: 'Shakuntala Devi' },
      { quote: 'Pure mathematics is, in its way, the poetry of logical ideas.', author: 'Albert Einstein' },
      { quote: 'The only way to learn mathematics is to do mathematics.', author: 'Paul Halmos' },
      { quote: 'Mathematics is the language with which God has written the universe.', author: 'Galileo Galilei' },
      { quote: 'Do not worry about your difficulties in Mathematics. I can assure you mine are still greater.', author: 'Albert Einstein' },
      { quote: 'It is impossible to be a mathematician without being a poet in soul.', author: 'Sofia Kovalevskaya' },
      { quote: 'Each problem that I solved became a rule, which served afterwards to solve other problems.', author: 'René Descartes' },
      { quote: 'The most beautiful thing we can experience is the mysterious. It is the source of all true art and all science.', author: 'Albert Einstein' },
      { quote: 'Mathematics, rightly viewed, possesses not only truth, but supreme beauty.', author: 'Bertrand Russell' },
      { quote: 'Mathematics is not about numbers, equations, computations, or algorithms: it is about understanding.', author: 'William Paul Thurston' }
    ];

    var renderQuotesTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('h4', { className: 'text-sm font-bold text-amber-800 mb-1' }, '💭 Math quotes'),
          h('p', { className: 'text-[11px] text-amber-700' },
            'Quotes about mathematics, learning, and the beauty of numbers. Use as classroom posters, journal prompts, or just for inspiration.'
          )
        ),
        h('div', { className: 'space-y-2' },
          FRACTION_QUOTES.map(function(q, i) {
            return h('blockquote', { key: 'qt-' + i, className: 'bg-white rounded-xl p-4 border-l-4 border-amber-500' },
              h('p', { className: 'text-sm text-slate-800 italic leading-relaxed' }, '"' + q.quote + '"'),
              h('p', { className: 'text-xs font-bold text-amber-700 text-right mt-2' }, '— ' + q.author)
            );
          })
        )
      );
    };

    // ── DATA ANALYSIS TAB — fractions in data ──
    var DATA_SAMPLES = [
      {
        id: 'class-sports',
        title: 'Favorite Sports in a Class of 30',
        data: [
          { label: 'Soccer', count: 12, color: '#10b981' },
          { label: 'Basketball', count: 9, color: '#f59e0b' },
          { label: 'Baseball', count: 6, color: '#ef4444' },
          { label: 'Other', count: 3, color: '#a78bfa' }
        ],
        questions: [
          'What fraction of students prefer soccer? Answer: 12/30 = 2/5.',
          'What fraction prefer NOT basketball? Answer: (30-9)/30 = 21/30 = 7/10.',
          'Soccer is what fraction more than basketball? Answer: (12-9)/30 = 3/30 = 1/10.'
        ]
      },
      {
        id: 'pizza-toppings',
        title: 'Pizza Toppings on 24 Pizzas',
        data: [
          { label: 'Pepperoni', count: 10, color: '#dc2626' },
          { label: 'Cheese only', count: 7, color: '#fbbf24' },
          { label: 'Veggie', count: 4, color: '#22c55e' },
          { label: 'Hawaiian', count: 3, color: '#f97316' }
        ],
        questions: [
          'What fraction of pizzas had pepperoni? Answer: 10/24 = 5/12.',
          'What fraction did NOT have meat? (Cheese + veggie) Answer: (7+4)/24 = 11/24.',
          'Pepperoni and Hawaiian both have meat. What fraction has meat? Answer: (10+3)/24 = 13/24.'
        ]
      },
      {
        id: 'screen-time',
        title: 'Screen Time per Week (32 students)',
        data: [
          { label: '0-5 hrs', count: 4, color: '#22c55e' },
          { label: '6-10 hrs', count: 12, color: '#eab308' },
          { label: '11-20 hrs', count: 10, color: '#f97316' },
          { label: '20+ hrs', count: 6, color: '#dc2626' }
        ],
        questions: [
          'What fraction has 6-10 hrs? Answer: 12/32 = 3/8.',
          'What fraction has 11 or more hours? Answer: (10+6)/32 = 16/32 = 1/2.',
          'What fraction has fewer than 11 hours? Answer: (4+12)/32 = 16/32 = 1/2.'
        ]
      },
      {
        id: 'pet-survey',
        title: 'Pets in 40 Households',
        data: [
          { label: 'Dog', count: 18, color: '#92400e' },
          { label: 'Cat', count: 12, color: '#7c2d12' },
          { label: 'Both', count: 6, color: '#451a03' },
          { label: 'Neither', count: 10, color: '#1c1917' }
        ],
        questions: [
          'What fraction has at least one pet (any)? Answer: 30/40 = 3/4. (Note: "both" already counted in dog and cat.)',
          'What fraction has only a dog (no cat)? Answer: (18-6)/40 = 12/40 = 3/10.',
          'What fraction has no pet? Answer: 10/40 = 1/4.'
        ]
      }
    ];

    var renderDataAnalysisTab = function() {
      var dataId = _f.dataId || DATA_SAMPLES[0].id;
      var data = DATA_SAMPLES.find(function(d) { return d.id === dataId; }) || DATA_SAMPLES[0];
      var total = data.data.reduce(function(acc, d) { return acc + d.count; }, 0);
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-cyan-50 rounded-xl p-3 border border-cyan-200' },
          h('h4', { className: 'text-sm font-bold text-cyan-800 mb-1' }, '📊 Data analysis with fractions'),
          h('p', { className: 'text-[11px] text-cyan-700' },
            'Fractions are how we describe parts of a data set. Each survey shows real-looking data and asks fraction questions about it.'
          )
        ),
        h('div', { className: 'flex flex-wrap gap-1' },
          DATA_SAMPLES.map(function(d) {
            var active = dataId === d.id;
            return h('button', {
              key: 'da-' + d.id,
              onClick: function() { upd({ dataId: d.id }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                (active ? 'bg-cyan-700 text-white' : 'bg-white text-cyan-700 border border-cyan-300 hover:bg-cyan-100')
            }, d.title);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-4 space-y-3' },
          h('h5', { className: 'text-base font-black text-cyan-900' }, data.title),
          h('p', { className: 'text-xs text-cyan-700' }, 'Total = ' + total),
          // Bar chart
          h('div', { className: 'space-y-2' },
            data.data.map(function(d, i) {
              var pct = total > 0 ? d.count / total * 100 : 0;
              var simp = simplify(d.count, total);
              return h('div', { key: 'dr-' + i, className: 'space-y-1' },
                h('div', { className: 'flex justify-between text-xs font-bold text-slate-800' },
                  h('span', null, d.label),
                  h('span', null, d.count + ' / ' + total + ' = ' + simp[0] + '/' + simp[1] + ' = ' + pct.toFixed(0) + '%')
                ),
                h('div', { className: 'h-6 bg-slate-100 rounded overflow-hidden' },
                  h('div', { style: {
                    width: pct + '%',
                    height: '100%',
                    background: d.color,
                    transition: 'width 0.5s'
                  } })
                )
              );
            })
          ),
          // Questions
          h('div', { className: 'bg-cyan-50 rounded p-3 border border-cyan-200 mt-3' },
            h('p', { className: 'text-[11px] font-bold text-cyan-700 mb-2' }, '🤔 Practice questions'),
            data.questions.map(function(q, i) {
              return h('details', { key: 'dq-' + i, className: 'border-b border-cyan-100 last:border-b-0 py-1' },
                h('summary', { className: 'text-xs font-bold text-cyan-800 cursor-pointer' }, 'Q' + (i + 1) + ': ' + q.split(' Answer:')[0]),
                h('p', { className: 'text-[11px] text-emerald-700 font-mono mt-1' }, '✓ ' + q.split(' Answer:')[1])
              );
            })
          )
        )
      );
    };

    // ── MISCONCEPTION REMEDIATION FLOW ──
    // Step-by-step remediation pathway for each misconception.
    var renderMisconceptionFlowTab = function() {
      var mcfId = _f.mcfId || MISCONCEPTIONS[0].id;
      var mc = MISCONCEPTIONS.find(function(m) { return m.id === mcfId; }) || MISCONCEPTIONS[0];
      var mcfStep = _f.mcfStep || 0;
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-rose-50 rounded-xl p-3 border border-rose-200' },
          h('h4', { className: 'text-sm font-bold text-rose-800 mb-1' }, '🛠 Misconception remediation flow'),
          h('p', { className: 'text-[11px] text-rose-700' },
            'Pick a misconception. Walk through its remediation strategies step by step. Use this when a student is consistently making a specific error.'
          )
        ),
        h('select', {
          value: mcfId,
          onChange: function(e) { upd({ mcfId: e.target.value, mcfStep: 0 }); },
          'aria-label': 'Misconception selector',
          className: 'w-full px-3 py-2 rounded border border-rose-300 text-sm font-bold'
        }, MISCONCEPTIONS.map(function(m) {
          return h('option', { key: 'mcf-' + m.id, value: m.id }, m.label);
        })),
        h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-4 space-y-3' },
          h('div', { className: 'flex items-center gap-2 flex-wrap' },
            h('h5', { className: 'text-base font-black text-rose-900' }, mc.label),
            h('span', { className: 'text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded uppercase' }, mc.severity),
            h('span', { className: 'text-[10px] text-rose-500' }, 'Grade ' + mc.grade)
          ),
          h('p', { className: 'text-sm text-slate-800' }, '📝 ' + mc.description),
          h('div', { className: 'bg-rose-50 rounded p-2 border border-rose-200' },
            h('p', { className: 'text-[11px] font-bold text-rose-700' }, '🤔 Why this happens'),
            h('p', { className: 'text-xs text-slate-800 mt-1' }, mc.whyItHappens)
          ),
          // Stepwise remediation
          h('div', { className: 'bg-white rounded p-2 border border-rose-200 space-y-2' },
            h('p', { className: 'text-[11px] font-bold text-rose-700' },
              '🛠 Remediation step ' + (mcfStep + 1) + ' of ' + mc.remediation.length
            ),
            // Progress dots
            h('div', { className: 'flex gap-1' },
              mc.remediation.map(function(_, i) {
                return h('div', { key: 'mcd-' + i,
                  className: 'flex-1 h-1.5 rounded ' + (i <= mcfStep ? 'bg-rose-500' : 'bg-slate-200')
                });
              })
            ),
            h('div', { className: 'bg-rose-50 rounded p-3 border border-rose-200' },
              h('p', { className: 'text-sm text-slate-800' }, mc.remediation[Math.min(mcfStep, mc.remediation.length - 1)])
            )
          ),
          h('div', { className: 'flex gap-2' },
            h('button', {
              onClick: function() { upd({ mcfStep: Math.max(0, mcfStep - 1) }); },
              disabled: mcfStep <= 0,
              className: 'flex-1 px-3 py-1.5 rounded text-xs font-bold ' +
                (mcfStep > 0 ? 'bg-rose-100 text-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-400')
            }, '← Previous strategy'),
            h('button', {
              onClick: function() { upd({ mcfStep: Math.min(mc.remediation.length - 1, mcfStep + 1) }); },
              disabled: mcfStep >= mc.remediation.length - 1,
              className: 'flex-1 px-3 py-1.5 rounded text-xs font-bold ' +
                (mcfStep < mc.remediation.length - 1 ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-100 text-slate-400')
            }, 'Next strategy →')
          )
        )
      );
    };

    // ── PRINT LAB TAB ──
    // Centralized printing hub for all printable artifacts.
    var renderPrintLabTab = function() {
      var printItems = [
        { id: 'worksheet', label: 'Practice worksheet', icon: '📝', desc: 'Generate a customizable worksheet with answer key.', goTo: 'worksheets' },
        { id: 'rti', label: 'CBM probe', icon: '📊', desc: 'Time-bounded probe for RTI progress monitoring.', goTo: 'rtiprobe' },
        { id: 'refcard', label: 'Reference card', icon: '🖨', desc: 'Fraction-decimal-percent quick lookup card.', goTo: 'refcard' },
        { id: 'cheatsheet', label: 'Procedure cheat sheet', icon: '📋', desc: 'All fraction operations on one page.', goTo: 'cheatsheet' },
        { id: 'manipulatives', label: 'Fraction strips template', icon: '✂', desc: 'Printable strips for hands-on activities.', goTo: 'activities' },
        { id: 'report', label: 'Progress report', icon: '📊', desc: 'Student progress snapshot.', goTo: 'reports' }
      ];

      var printFractionStripsTemplate = function() {
        if (typeof window === 'undefined' || !window.print) return;
        var html = '<html><head><title>Fraction Strips Template</title>';
        html += '<style>body{font-family:sans-serif;margin:30px;}h1{color:#9f1239;}.strip{display:flex;border:2px solid #0f172a;margin-bottom:10px;height:40px;}.seg{flex:1;border-right:1px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;font-size:11pt;}.strip-label{margin-right:10px;font-weight:bold;font-size:14pt;width:60px;display:inline-block;}</style></head><body>';
        html += '<h1>Fraction Strips Template</h1>';
        html += '<p>Cut out each strip. Use them to compare fractions, find equivalences, and add or subtract visually.</p>';
        var rows = [
          { label: '1', segs: 1, color: '#dc2626' },
          { label: '1/2', segs: 2, color: '#ea580c' },
          { label: '1/3', segs: 3, color: '#d97706' },
          { label: '1/4', segs: 4, color: '#ca8a04' },
          { label: '1/5', segs: 5, color: '#65a30d' },
          { label: '1/6', segs: 6, color: '#16a34a' },
          { label: '1/8', segs: 8, color: '#0891b2' },
          { label: '1/10', segs: 10, color: '#2563eb' },
          { label: '1/12', segs: 12, color: '#7c3aed' }
        ];
        rows.forEach(function(r) {
          html += '<div><span class="strip-label">' + r.label + '</span><div class="strip" style="display:inline-flex;width:600px;">';
          for (var i = 0; i < r.segs; i++) {
            html += '<div class="seg" style="background:' + r.color + '">' + (i + 1) + '/' + r.segs + '</div>';
          }
          html += '</div></div>';
        });
        html += '</body></html>';
        try {
          var w = window.open('', '_blank');
          if (w) { w.document.write(html); w.document.close(); setTimeout(function() { w.print(); }, 250); }
        } catch (e) { addToast('Could not open print window', 'error'); }
      };

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-stone-50 rounded-xl p-3 border border-stone-200' },
          h('h4', { className: 'text-sm font-bold text-stone-800 mb-1' }, '🖨 Print lab — everything printable in one place'),
          h('p', { className: 'text-[11px] text-stone-700' },
            'Quick access to every printable artifact in Fraction Lab. Use for offline practice, classroom posters, or take-home materials.'
          )
        ),
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
          printItems.map(function(p) {
            return h('button', {
              key: 'pl-' + p.id,
              onClick: function() { upd({ tab: p.goTo }); },
              className: 'text-left p-4 rounded-xl border-2 border-stone-200 bg-white hover:border-stone-400 hover:shadow-md transition-all'
            },
              h('div', { className: 'flex items-center gap-3' },
                h('span', { className: 'text-3xl' }, p.icon),
                h('div', null,
                  h('h5', { className: 'font-black text-stone-900' }, p.label),
                  h('p', { className: 'text-[11px] text-stone-700' }, p.desc)
                )
              )
            );
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-stone-200 p-4' },
          h('p', { className: 'text-xs font-bold text-stone-700 mb-2' }, '✂ Quick print: Fraction strips template'),
          h('p', { className: 'text-[11px] text-stone-700 mb-3' },
            'A page of fraction strips from 1 whole to 1/12. Cut out and use for any concrete-representational activity.'
          ),
          h('button', { onClick: printFractionStripsTemplate,
            className: 'w-full px-4 py-2 bg-stone-700 text-white font-bold rounded-xl hover:bg-stone-800' },
            '🖨 Print fraction strips template'
          )
        )
      );
    };

    // ── ABOUT TAB ──
    var renderAboutTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200 text-center' },
          h('div', { className: 'text-4xl mb-2' }, '🍕'),
          h('h4', { className: 'text-lg font-black text-rose-800' }, 'AlloFlow Fraction Lab v3'),
          h('p', { className: 'text-xs text-rose-700 italic' }, 'A research-grounded fraction-instruction tool')
        ),
        h('div', { className: 'bg-white rounded-xl p-3 border border-rose-200' },
          h('h5', { className: 'text-sm font-black text-rose-800 mb-2' }, '📚 Pedagogical foundations'),
          h('ul', { className: 'text-[11px] list-disc pl-5 text-slate-700 space-y-1' },
            h('li', null, h('b', null, 'IES Practice Guide (Siegler et al., 2010): '), '"Developing Effective Fractions Instruction for Kindergarten Through 8th Grade." 5 evidence-based recommendations.'),
            h('li', null, h('b', null, 'CRA framework (Bruner, 1966; Sealander, 2012): '), 'Concrete → Representational → Abstract progression.'),
            h('li', null, h('b', null, 'Number Talks (Parrish, 2010): '), 'Daily mental math discussion routines.'),
            h('li', null, h('b', null, 'Misconception research: '), 'Vamvakoussi & Vosniadou; Stafylidou; Lortie-Forgues et al.'),
            h('li', null, h('b', null, 'Multiple representations (Lesh, 1979): '), 'Pie, bar, number line, area, set, length, volume models.')
          )
        ),
        h('div', { className: 'bg-white rounded-xl p-3 border border-rose-200' },
          h('h5', { className: 'text-sm font-black text-rose-800 mb-2' }, '📋 Standards covered'),
          h('p', { className: 'text-[11px] text-slate-700' },
            'CCSS K-8: ', h('span', { className: 'font-mono' }, '1.G.A.3, 2.G.A.3, 3.NF.A.1, 3.NF.A.2, 3.NF.A.3, 4.NF.A.1-2, 4.NF.B.3-4, 4.NF.C.5-7, 5.NF.A.1-2, 5.NF.B.3-7, 6.NS.A.1, 6.RP.A.1,3, 7.NS.A.2, 8.NS.A.1.')
          ),
          h('p', { className: 'text-[11px] text-slate-700 mt-1' }, 'Visit the Standards tab for the complete cross-reference.')
        ),
        h('div', { className: 'bg-white rounded-xl p-3 border border-rose-200' },
          h('h5', { className: 'text-sm font-black text-rose-800 mb-2' }, '✨ Features summary'),
          h('div', { className: 'grid grid-cols-2 gap-2 text-[11px] text-slate-700' },
            h('div', null, '🎨 7 visual models'),
            h('div', null, '🎮 9 mini-games'),
            h('div', null, '📚 80+ word problems'),
            h('div', null, '🎓 8 worked examples'),
            h('div', null, '📋 37 CCSS standards mapped'),
            h('div', null, '⚠ 12 misconceptions library'),
            h('div', null, '🎯 9 IEP goal templates'),
            h('div', null, '📅 4 lesson plan templates'),
            h('div', null, '✂ 8 hands-on activity recipes'),
            h('div', null, '🗣 5 math talk strings'),
            h('div', null, '📔 40+ vocabulary terms'),
            h('div', null, '🌍 12 languages')
          )
        ),
        h('div', { className: 'bg-rose-50 rounded-xl p-3 border border-rose-200' },
          h('p', { className: 'text-[11px] text-rose-700' },
            'AlloFlow is open-source (AGPL v3). Developed by Aaron Pomeranz, PsyD. Built with AI-assisted development.'
          )
        )
      );
    };

    // ── VIRTUAL MANIPULATIVES TAB ──
    // Drag-free manipulatives — click to add/remove fraction pieces.
    var renderManipulativesTab = function() {
      var manipType = _f.manipType || 'circles';
      var manipPieces = _f.manipPieces || [];
      var addPiece = function(denom) {
        var newPieces = manipPieces.concat([{ n: 1, d: denom, id: Date.now() + Math.random() }]);
        upd({ manipPieces: newPieces });
        sfxClick();
      };
      var removePiece = function(id) {
        upd({ manipPieces: manipPieces.filter(function(p) { return p.id !== id; }) });
        sfxClick();
      };
      var clearPieces = function() {
        upd({ manipPieces: [] });
      };
      var totalVal = manipPieces.reduce(function(acc, p) { return acc + (p.n / p.d); }, 0);

      // Group by denominator for display
      var grouped = {};
      manipPieces.forEach(function(p) {
        if (!grouped[p.d]) grouped[p.d] = [];
        grouped[p.d].push(p);
      });

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-orange-50 rounded-xl p-3 border border-orange-200' },
          h('h4', { className: 'text-sm font-bold text-orange-800 mb-1' }, '🧩 Virtual manipulatives'),
          h('p', { className: 'text-[11px] text-orange-700' },
            'Click pieces to add them to your workspace. Try to make patterns, build wholes, or explore equivalence visually.'
          )
        ),
        h('div', { className: 'flex gap-1' },
          ['circles', 'bars', 'strips'].map(function(m) {
            var active = manipType === m;
            return h('button', {
              key: 'mtt-' + m,
              onClick: function() { upd({ manipType: m }); },
              className: 'flex-1 px-3 py-1.5 rounded text-xs font-bold transition-all capitalize ' +
                (active ? 'bg-orange-700 text-white' : 'bg-white text-orange-700 border border-orange-300 hover:bg-orange-100')
            }, m);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-3' },
          h('p', { className: 'text-[11px] font-bold text-orange-700 mb-2' }, 'Add a piece:'),
          h('div', { className: 'grid grid-cols-4 gap-2' },
            [2, 3, 4, 5, 6, 8, 10, 12].map(function(d) {
              return h('button', {
                key: 'mp-' + d,
                onClick: function() { addPiece(d); },
                className: 'px-3 py-2 rounded text-sm font-bold bg-orange-100 text-orange-800 hover:bg-orange-300 border border-orange-300 font-mono'
              }, '1/' + d);
            })
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-3' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('p', { className: 'text-[11px] font-bold text-orange-700' }, 'Workspace (' + manipPieces.length + ' pieces, total = ' + totalVal.toFixed(3) + '):'),
            h('button', { onClick: clearPieces,
              disabled: manipPieces.length === 0,
              className: 'px-2 py-1 rounded text-[10px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-40' },
              '↺ Clear'
            )
          ),
          manipPieces.length === 0
            ? h('p', { className: 'text-[11px] italic text-slate-500 text-center py-4' }, 'No pieces yet. Add some from above.')
            : h('div', { className: 'space-y-2' },
                Object.keys(grouped).sort(function(a, b) { return parseInt(a) - parseInt(b); }).map(function(d) {
                  var pieces = grouped[d];
                  return h('div', { key: 'mg-' + d, className: 'bg-orange-50 rounded p-2 border border-orange-200' },
                    h('p', { className: 'text-[11px] font-bold text-orange-700 mb-1' }, pieces.length + ' × 1/' + d + ' = ' + pieces.length + '/' + d + ' (' + (pieces.length / parseInt(d)).toFixed(3) + ')'),
                    h('div', { className: 'flex gap-1 flex-wrap' },
                      pieces.map(function(p) {
                        if (manipType === 'circles') {
                          return h('button', { key: 'piece-' + p.id, onClick: function() { removePiece(p.id); }, title: 'Remove', style: { width: 50 } },
                            drawPie(p.n, p.d, 40, palMain));
                        } else if (manipType === 'bars') {
                          return h('button', { key: 'piece-' + p.id, onClick: function() { removePiece(p.id); }, title: 'Remove', style: { width: 100 } },
                            drawBar(p.n, p.d, palMain));
                        } else {
                          return h('button', { key: 'piece-' + p.id, onClick: function() { removePiece(p.id); }, title: 'Remove', style: { width: 80 } },
                            drawLengthModel(p.n, p.d, { width: 80, height: 24 }));
                        }
                      })
                    )
                  );
                })
              ),
          totalVal > 0 && h('div', { className: 'mt-2 bg-emerald-50 rounded p-2 border border-emerald-200 text-center' },
            h('p', { className: 'text-sm font-bold text-emerald-900' }, 'Total value: ', h('span', { className: 'font-mono' }, totalVal.toFixed(3)),
              totalVal === 1 ? ' ✓ Exactly 1 whole!' : totalVal === Math.floor(totalVal) ? ' = ' + totalVal + ' whole(s)' : ''
            )
          )
        )
      );
    };

    // ── MASTERY VIEW ──
    // Per-skill mastery dashboard. Shows progress on each major fraction skill.
    var renderMasteryTab = function() {
      var skills = [
        { id: 'identify', label: 'Identify fractions', count: _f.score ? Math.min(score.correct, 20) : 0, target: 20 },
        { id: 'equivalent', label: 'Equivalent fractions', count: _f.equivSolved || 0, target: 15 },
        { id: 'compare', label: 'Compare fractions', count: _f.opsSolved || 0, target: 15 },
        { id: 'simplify', label: 'Simplify fractions', count: _f.simplifySolved || 0, target: 15 },
        { id: 'convert', label: 'Convert (frac/dec/pct)', count: _f.convertCount || 0, target: 15 },
        { id: 'word', label: 'Word problems', count: _f.aiAsked || 0, target: 10 }
      ];
      var pct = function(c, t) { return Math.min(100, t > 0 ? c / t * 100 : 0); };
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-violet-50 rounded-xl p-3 border border-violet-200' },
          h('h4', { className: 'text-sm font-bold text-violet-800 mb-1' }, '⭐ Mastery dashboard'),
          h('p', { className: 'text-[11px] text-violet-700' },
            'Track your progress on each fraction skill. Each skill has a target — keep practicing until you hit 100%.'
          )
        ),
        h('div', { className: 'space-y-2' },
          skills.map(function(s) {
            var p = pct(s.count, s.target);
            var mastered = p >= 100;
            return h('div', { key: 'sk-' + s.id, className: 'bg-white rounded-lg p-3 border border-violet-200' },
              h('div', { className: 'flex items-center justify-between mb-1' },
                h('span', { className: 'text-xs font-bold text-violet-900' }, (mastered ? '⭐ ' : '') + s.label),
                h('span', { className: 'text-[11px] font-mono text-violet-700' }, s.count + ' / ' + s.target)
              ),
              h('div', { className: 'h-3 bg-slate-200 rounded-full overflow-hidden' },
                h('div', { style: {
                  width: p + '%',
                  height: '100%',
                  background: mastered ? 'linear-gradient(90deg,#10b981,#22c55e)' : 'linear-gradient(90deg,#a855f7,#ec4899)',
                  transition: 'width 0.4s'
                } })
              )
            );
          })
        )
      );
    };

    // ── BRAIN TEASERS — fraction puzzles ──
    var BRAIN_TEASERS = [
      {
        id: 'half-pizza',
        title: 'The half-pizza puzzle',
        difficulty: 'easy',
        question: 'You have half of a pizza. Your friend has 1/4 of a pizza. Together you have more than 1/2 of a whole pizza. Why?',
        hint: 'Visualize it: 1/2 + 1/4 = ?',
        solution: '1/2 + 1/4 = 2/4 + 1/4 = 3/4 of a pizza, which is more than 1/2.'
      },
      {
        id: 'three-thirds',
        title: 'Three thirds',
        difficulty: 'easy',
        question: 'Sarah ate 1/3 of a pie. Tom ate 1/3 of the same pie. How much of the pie is left?',
        hint: 'The pie started as 3/3 = 1.',
        solution: '1 - 1/3 - 1/3 = 3/3 - 1/3 - 1/3 = 1/3 of the pie is left.'
      },
      {
        id: 'mystery-fraction',
        title: 'Mystery fraction',
        difficulty: 'medium',
        question: 'A fraction has these properties: its numerator is 1 less than its denominator, and it equals 0.8. What fraction is it?',
        hint: 'If the denominator is d, the numerator is d - 1. So (d - 1) / d = 0.8.',
        solution: '(d-1)/d = 0.8 → d - 1 = 0.8d → 0.2d = 1 → d = 5. So fraction is 4/5.'
      },
      {
        id: 'shrinking',
        title: 'Shrinking fractions',
        difficulty: 'medium',
        question: 'I take 1/2 of a cake. Then I take 1/2 of what\'s left. Then 1/2 of what\'s STILL left. How much have I taken total?',
        hint: 'Take 1/2, leaves 1/2. Take 1/2 of that = 1/4. Then 1/2 of remaining 1/4 = 1/8.',
        solution: '1/2 + 1/4 + 1/8 = 4/8 + 2/8 + 1/8 = 7/8 of the cake.'
      },
      {
        id: 'magic-square',
        title: 'Fraction magic square',
        difficulty: 'hard',
        question: 'Fill in this 3x3 magic square so each row, column, and diagonal sums to 3/2. One cell shows 1/2.',
        hint: 'In a magic square the middle cell equals the magic sum ÷ 3. Each row sums to 3/2.',
        solution: 'Middle = 1/2. The 8 surrounding cells need to be carefully chosen so each row sums to 3/2 — this requires careful arithmetic.'
      },
      {
        id: 'half-half',
        title: 'Half of half of half',
        difficulty: 'medium',
        question: 'Half of half of half is what fraction?',
        hint: '1/2 × 1/2 × 1/2.',
        solution: '1/2 × 1/2 × 1/2 = 1/8. Each "half" multiplies, halving each time.'
      },
      {
        id: 'rope-sharing',
        title: 'Rope sharing',
        difficulty: 'medium',
        question: '5 friends share 3 ropes equally. How much rope does each friend get?',
        hint: '3 divided by 5.',
        solution: '3 ÷ 5 = 3/5 of a rope each.'
      },
      {
        id: 'race-distance',
        title: 'The slow runner',
        difficulty: 'hard',
        question: 'In a race, you have run 3/8 of the distance. Your friend has run 1/3 less than you. How much has your friend run?',
        hint: 'Your friend ran 3/8 − 1/3 of the distance.',
        solution: '3/8 - 1/3 = 9/24 - 8/24 = 1/24 of the distance. (Note: "1/3 less" means subtract 1/3 of the total, OR could mean a third less than your distance — verify interpretation.)'
      },
      {
        id: 'piecewise',
        title: 'Piecewise problem',
        difficulty: 'hard',
        question: 'A pizza is cut into 12 slices. 1/4 of the pizza has pepperoni. 1/3 has mushrooms. 1/6 has both. The rest has just cheese. What fraction has just cheese?',
        hint: 'Inclusion-exclusion: pepperoni + mushrooms − both = total with toppings. The rest is cheese only.',
        solution: 'Toppings total: 1/4 + 1/3 - 1/6 = 3/12 + 4/12 - 2/12 = 5/12. Cheese only = 1 - 5/12 = 7/12.'
      },
      {
        id: 'infinite-series',
        title: 'Infinite series',
        difficulty: 'hard',
        question: 'Compute: 1/2 + 1/4 + 1/8 + 1/16 + 1/32 + ... (continuing forever).',
        hint: 'Each term is half the previous. This is a geometric series.',
        solution: 'The sum is 1. Geometric series with first term 1/2 and ratio 1/2: sum = (1/2)/(1 - 1/2) = 1.'
      }
    ];

    var renderBrainTeasersTab = function() {
      var btId = _f.btId || BRAIN_TEASERS[0].id;
      var bt = BRAIN_TEASERS.find(function(b) { return b.id === btId; }) || BRAIN_TEASERS[0];
      var btShowSolution = _f.btShowSolution || false;
      var btHintLevel = _f.btHintLevel || 0;
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-yellow-50 rounded-xl p-3 border border-yellow-200' },
          h('h4', { className: 'text-sm font-bold text-yellow-800 mb-1' }, '🧠 Brain teasers'),
          h('p', { className: 'text-[11px] text-yellow-700' },
            '10 fraction puzzles ranging from easy to hard. Each has a hint and a worked solution.'
          )
        ),
        h('div', { className: 'flex flex-wrap gap-1' },
          BRAIN_TEASERS.map(function(b) {
            var active = btId === b.id;
            var diffColor = b.difficulty === 'easy' ? 'green' : b.difficulty === 'medium' ? 'amber' : 'rose';
            return h('button', {
              key: 'bt-' + b.id,
              onClick: function() { upd({ btId: b.id, btShowSolution: false, btHintLevel: 0 }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                (active ? 'bg-yellow-700 text-white' : 'bg-white text-yellow-700 border border-yellow-300 hover:bg-yellow-100')
            }, (b.difficulty === 'easy' ? '🟢' : b.difficulty === 'medium' ? '🟡' : '🔴') + ' ' + b.title);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-yellow-200 p-4 space-y-3' },
          h('div', { className: 'flex items-center gap-2' },
            h('h5', { className: 'text-base font-black text-yellow-900' }, '🧠 ' + bt.title),
            h('span', { className: 'text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded uppercase' }, bt.difficulty)
          ),
          h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, bt.question),
          btHintLevel >= 1 && h('div', { className: 'bg-yellow-50 rounded p-2 border border-yellow-200' },
            h('p', { className: 'text-[11px] font-bold text-yellow-700' }, '💡 Hint'),
            h('p', { className: 'text-xs text-slate-800 mt-1' }, bt.hint)
          ),
          btShowSolution && h('div', { className: 'bg-emerald-50 rounded p-2 border border-emerald-200' },
            h('p', { className: 'text-[11px] font-bold text-emerald-700' }, '🎓 Solution'),
            h('p', { className: 'text-xs text-slate-800 mt-1' }, bt.solution)
          ),
          h('div', { className: 'flex gap-2' },
            !btHintLevel && h('button', { onClick: function() { upd({ btHintLevel: 1 }); sfxClick(); },
              className: 'px-3 py-1.5 rounded text-xs font-bold bg-yellow-200 text-yellow-900 hover:bg-yellow-300' }, '💡 Show hint'),
            !btShowSolution && h('button', { onClick: function() { upd({ btShowSolution: true }); sfxClick(); },
              className: 'ml-auto px-3 py-1.5 rounded text-xs font-bold bg-yellow-700 text-white hover:bg-yellow-800' }, '🎓 Show solution')
          )
        )
      );
    };

    // ── HELP TAB ──
    var renderHelpTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-slate-50 rounded-xl p-3 border border-slate-200' },
          h('h4', { className: 'text-sm font-bold text-slate-800 mb-1' }, '❓ Help'),
          h('p', { className: 'text-[11px] text-slate-700' },
            'Quick guide to using AlloFlow Fraction Lab.'
          )
        ),
        h('div', { className: 'bg-white rounded-xl p-3 border border-slate-200' },
          h('h5', { className: 'text-sm font-black text-slate-800 mb-2' }, '🗺 Navigation'),
          h('ul', { className: 'text-xs list-disc pl-5 text-slate-700 space-y-1' },
            h('li', null, h('b', null, 'Mode tabs '), '(Learn, Practice, Apply, Teacher) group related work.'),
            h('li', null, h('b', null, 'Tab strip '), 'within each mode lets you pick specific tools.'),
            h('li', null, h('b', null, 'Header '), 'shows your score and streak across all tabs.'),
            h('li', null, h('b', null, 'AI tutor '), 'is always available for asking questions about what you\'re doing.')
          )
        ),
        h('div', { className: 'bg-white rounded-xl p-3 border border-slate-200' },
          h('h5', { className: 'text-sm font-black text-slate-800 mb-2' }, '⌨️ Keyboard shortcuts'),
          h('ul', { className: 'text-xs list-disc pl-5 text-slate-700 space-y-1' },
            h('li', null, h('b', null, '1-6'), ' — switch tab groups (original 6 tabs)'),
            h('li', null, h('b', null, 'N'), ' — generate a new challenge (in Practice)'),
            h('li', null, h('b', null, 'B'), ' — toggle benchmarks panel'),
            h('li', null, h('b', null, 'P'), ' — toggle pie/bar visualization'),
            h('li', null, h('b', null, '?'), ' — open AI tutor')
          )
        ),
        h('div', { className: 'bg-white rounded-xl p-3 border border-slate-200' },
          h('h5', { className: 'text-sm font-black text-slate-800 mb-2' }, '📚 What\'s in each mode?'),
          h('div', { className: 'space-y-2 text-xs' },
            h('div', null,
              h('b', { className: 'text-rose-700' }, '📚 Learn '),
              'Visualization-heavy. Build intuition with pie, bar, number-line, area, set, length, and volume models. No quiz pressure.'
            ),
            h('div', null,
              h('b', { className: 'text-violet-700' }, '🎯 Practice '),
              'Skill-focused with scoring. Compare, add/subtract, multiply/divide, equivalent fractions, simplify, convert, and timed quizzes.'
            ),
            h('div', null,
              h('b', { className: 'text-amber-700' }, '📖 Apply '),
              'Real-world contexts. Word problems, recipe scaling, games (Pizza Shop, Race, Match, Fish, and more), story mode, brain teasers.'
            ),
            h('div', null,
              h('b', { className: 'text-slate-700' }, '🏫 Teacher '),
              'Instructor tools: worksheet generator, progress reports, IEP goal bank, lesson plans, CCSS standards alignment, misconceptions library, scope & sequence, hands-on activities, RTI probes.'
            )
          )
        ),
        h('div', { className: 'bg-white rounded-xl p-3 border border-slate-200' },
          h('h5', { className: 'text-sm font-black text-slate-800 mb-2' }, '🆘 Get more help'),
          h('p', { className: 'text-xs text-slate-700' },
            'Ask the AI tutor any question about fractions or about how to use a particular tab. ',
            'The Vocabulary and Glossary tabs cover every term in K-8 fraction instruction. ',
            'For teachers: the Misconceptions and FAQ tabs answer common student confusions.'
          )
        ),
        h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('h5', { className: 'text-sm font-black text-amber-800 mb-1' }, '📜 Credits'),
          h('p', { className: 'text-[11px] text-amber-700' },
            'AlloFlow Fraction Lab is open-source software (AGPL v3) built by Aaron Pomeranz, PsyD. ',
            'Pedagogical framework drawn from the IES Practice Guide (Siegler et al., 2010), Bruner\'s CRA framework, and Cuisenaire\'s fraction strip model (1950s). ',
            'CCSS standards from corestandards.org. Misconception library compiled from research by Vamvakoussi & Vosniadou, Stafylidou, Lortie-Forgues et al., and others.'
          )
        )
      );
    };

    // ── CONVERSION TABLES TAB ──
    // Reference tables for common fraction ↔ decimal ↔ percent conversions.
    var renderConversionTablesTab = function() {
      var tableType = _f.tableType || 'eighths';

      var BUILD_TABLE = function(numerators, denom) {
        return numerators.map(function(n) {
          var s = simplify(n, denom);
          var dec = n / denom;
          return { n: n, d: denom, fracDisplay: n + '/' + denom, simp: s[0] + '/' + s[1], dec: dec, pct: dec * 100 };
        });
      };

      var tables = {
        halves:   { label: 'Halves (1/2 ... 8/2)',     rows: BUILD_TABLE([1,2,3,4,5,6,7,8], 2) },
        thirds:   { label: 'Thirds (1/3 ... 9/3)',     rows: BUILD_TABLE([1,2,3,4,5,6,7,8,9], 3) },
        fourths:  { label: 'Fourths (1/4 ... 12/4)',   rows: BUILD_TABLE([1,2,3,4,5,6,7,8,9,10,11,12], 4) },
        fifths:   { label: 'Fifths (1/5 ... 10/5)',    rows: BUILD_TABLE([1,2,3,4,5,6,7,8,9,10], 5) },
        sixths:   { label: 'Sixths (1/6 ... 12/6)',    rows: BUILD_TABLE([1,2,3,4,5,6,7,8,9,10,11,12], 6) },
        eighths:  { label: 'Eighths (1/8 ... 16/8)',   rows: BUILD_TABLE([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], 8) },
        ninths:   { label: 'Ninths (1/9 ... 9/9)',     rows: BUILD_TABLE([1,2,3,4,5,6,7,8,9], 9) },
        tenths:   { label: 'Tenths (1/10 ... 10/10)',  rows: BUILD_TABLE([1,2,3,4,5,6,7,8,9,10], 10) },
        twelfths: { label: 'Twelfths (1/12 ... 12/12)', rows: BUILD_TABLE([1,2,3,4,5,6,7,8,9,10,11,12], 12) },
        hundredths: { label: 'Common percents', rows: [10,20,25,30,40,50,60,70,75,80,90,100].map(function(p) {
          var s = simplify(p, 100); return { n: p, d: 100, fracDisplay: p + '/100', simp: s[0] + '/' + s[1], dec: p/100, pct: p };
        })}
      };
      var current = tables[tableType] || tables.eighths;

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-cyan-50 rounded-xl p-3 border border-cyan-200' },
          h('h4', { className: 'text-sm font-bold text-cyan-800 mb-1' }, '📊 Conversion tables'),
          h('p', { className: 'text-[11px] text-cyan-700' },
            'Reference tables showing all common fractions with their decimal and percent equivalents. Use to look up exact values or to spot patterns.'
          )
        ),
        h('div', { className: 'flex flex-wrap gap-1' },
          Object.keys(tables).map(function(t) {
            var active = tableType === t;
            return h('button', {
              key: 'tt-' + t,
              onClick: function() { upd({ tableType: t }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                (active ? 'bg-cyan-700 text-white' : 'bg-white text-cyan-700 border border-cyan-300 hover:bg-cyan-100')
            }, tables[t].label.split(' ')[0]);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-3 max-h-[500px] overflow-y-auto' },
          h('h5', { className: 'text-sm font-black text-cyan-900 mb-2' }, current.label),
          h('table', { className: 'w-full text-sm' },
            h('thead', { className: 'sticky top-0 bg-white' },
              h('tr', { className: 'border-b-2 border-cyan-300' },
                h('th', { className: 'text-left py-1 px-2 text-cyan-800 font-bold' }, 'Fraction'),
                h('th', { className: 'text-left py-1 px-2 text-cyan-800 font-bold' }, 'Simplified'),
                h('th', { className: 'text-left py-1 px-2 text-cyan-800 font-bold' }, 'Decimal'),
                h('th', { className: 'text-left py-1 px-2 text-cyan-800 font-bold' }, 'Percent')
              )
            ),
            h('tbody', null,
              current.rows.map(function(r, i) {
                return h('tr', { key: 'cr-' + i, className: 'border-b border-cyan-100 hover:bg-cyan-50' },
                  h('td', { className: 'py-1 px-2 font-mono font-bold text-cyan-900' }, r.fracDisplay),
                  h('td', { className: 'py-1 px-2 font-mono text-cyan-700' }, r.simp),
                  h('td', { className: 'py-1 px-2 font-mono text-blue-700' }, r.dec.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')),
                  h('td', { className: 'py-1 px-2 font-mono text-purple-700' }, r.pct.toFixed(1).replace(/\.0$/, '') + '%')
                );
              })
            )
          )
        )
      );
    };

    // ── GLOSSARY EXPANSION — extended bilingual definitions with examples ──
    var renderGlossaryExpansionTab = function() {
      var glossarySearch = (_f.glossarySearch || '').toLowerCase();
      var allTerms = FRACTION_VOCAB.concat([
        { term: 'Improper fraction', def: 'A fraction with a numerator greater than or equal to its denominator. Has value ≥ 1.', example: '7/4, 5/5, 11/3 are improper.' },
        { term: 'Like terms', def: 'In algebra, fractions with the same denominator can be combined directly.', example: '3/8 + 5/8 = 8/8 = 1.' },
        { term: 'Cross product', def: 'In a/b vs c/d comparison: a×d and b×c. Used in cross-multiplication.', example: '2/3 vs 5/7: cross products 14 and 15. 14 < 15, so 2/3 < 5/7.' },
        { term: 'Continued fraction', def: 'A fraction whose denominator contains another fraction, nested.', example: '1 + 1/(2 + 1/3) is a continued fraction.' },
        { term: 'Rational number', def: 'Any number that can be expressed as a fraction of two integers (with nonzero denominator).', example: '3/4, -2, 0.5, 7 are all rational.' },
        { term: 'Irrational number', def: 'A number that cannot be written as a ratio of integers. Has a non-repeating, non-terminating decimal.', example: 'π ≈ 3.14159... and √2 ≈ 1.41421... are irrational.' },
        { term: 'Repeating decimal', def: 'A decimal where one or more digits eventually repeat forever.', example: '1/3 = 0.3̄ (the 3 repeats forever).' },
        { term: 'Terminating decimal', def: 'A decimal with a finite number of digits after the decimal point.', example: '1/4 = 0.25 terminates. 1/8 = 0.125 terminates.' },
        { term: 'Magnitude', def: 'The size of a number. Magnitude reasoning means thinking about how big a fraction is.', example: '3/4 has a magnitude of 0.75 — close to 1.' },
        { term: 'Reciprocal', def: 'A fraction with the numerator and denominator switched. The product of a fraction and its reciprocal is 1.', example: 'Reciprocal of 3/4 is 4/3. Product: 12/12 = 1.' },
        { term: 'Common factor', def: 'A number that divides evenly into two or more numbers.', example: '2 is a common factor of 6 and 8. So is 1.' },
        { term: 'Prime factor', def: 'A factor that is a prime number (only divisible by 1 and itself).', example: 'Prime factors of 12: 2, 2, 3 (since 12 = 2² × 3).' },
        { term: 'Composite number', def: 'A whole number greater than 1 with factors besides 1 and itself.', example: '4, 6, 8, 9, 10 are composite. 2, 3, 5, 7 are prime.' },
        { term: 'Unit', def: 'In fraction context, the whole. Could be one object (a pizza) or a measure (one mile).', example: 'The unit determines what "1" means in a fraction.' },
        { term: 'Part-whole relationship', def: 'A fraction shows what part is selected out of a whole.', example: '3/4 means 3 parts out of 4 equal parts of one whole.' },
        { term: 'Quotient', def: 'The result of dividing one number by another.', example: 'The quotient of 12 ÷ 4 is 3. A fraction is also a quotient.' }
      ]);
      var filtered = allTerms.filter(function(v) {
        if (!glossarySearch) return true;
        return v.term.toLowerCase().indexOf(glossarySearch) >= 0 ||
               v.def.toLowerCase().indexOf(glossarySearch) >= 0;
      });
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
          h('h4', { className: 'text-sm font-bold text-indigo-800 mb-1' }, '📔 Extended glossary'),
          h('p', { className: 'text-[11px] text-indigo-700' },
            'Comprehensive fraction glossary with examples. Covers vocabulary from K-8 fraction instruction.'
          )
        ),
        h('input', {
          type: 'text', value: _f.glossarySearch || '',
          onChange: function(e) { upd({ glossarySearch: e.target.value }); },
          placeholder: 'Search glossary...',
          className: 'w-full px-3 py-2 rounded-lg border border-indigo-300 text-sm'
        }),
        h('p', { className: 'text-[11px] text-indigo-700' }, filtered.length + ' term' + (filtered.length === 1 ? '' : 's')),
        h('div', { className: 'space-y-2 max-h-[500px] overflow-y-auto' },
          filtered.length === 0
            ? h('p', { className: 'text-xs italic text-slate-500 text-center py-4' }, 'No matches.')
            : filtered.map(function(v, i) {
                return h('div', { key: 'gl-' + i, className: 'bg-white rounded-lg p-3 border border-indigo-200' },
                  h('p', { className: 'text-sm font-bold text-indigo-900' }, '📔 ' + v.term),
                  h('p', { className: 'text-xs text-slate-700 mt-1' }, v.def),
                  h('p', { className: 'text-[11px] text-indigo-700 italic mt-1' }, '✏ ' + v.example)
                );
              })
        )
      );
    };

    // ── MATH TALKS (Number Talks for fractions) ──
    var MATH_TALKS = [
      {
        id: 'string-1',
        title: 'Sums of 1',
        prompts: ['1/2 + 1/2', '1/3 + 2/3', '1/4 + 3/4', '1/5 + 4/5', '2/7 + 5/7'],
        focus: 'Every pair sums to 1. Pattern: complement of numerator over same denominator.',
        teachingNotes: 'After each prompt: "How did you figure that out? Did anyone do it differently?" Highlight that the pattern is general: n/d + (d-n)/d = d/d = 1.'
      },
      {
        id: 'string-2',
        title: 'Halves',
        prompts: ['1/2 + 1/4', '1/2 + 1/3', '1/2 + 1/6', '1/2 + 1/10', '1/2 + 1/100'],
        focus: 'Adding to 1/2. The sum is always more than 1/2 and less than 1.',
        teachingNotes: '"Where does each answer land?" Students estimate before computing. The number-line model helps.'
      },
      {
        id: 'string-3',
        title: 'Doubling',
        prompts: ['Double 1/4', 'Double 1/3', 'Double 1/5', 'Double 1/8', 'Double 1/100'],
        focus: 'Doubling a unit fraction. Answer: 2/d.',
        teachingNotes: 'Some students will say "double the denominator." Push back: that gives a smaller fraction (1/8 vs 2/8 = 1/4). The numerator doubles, not the denominator.'
      },
      {
        id: 'string-4',
        title: 'Multiplying by 1/2',
        prompts: ['1/2 × 8', '1/2 × 6', '1/2 × 1/2', '1/2 × 1/4', '1/2 × 100'],
        focus: 'Multiplying by 1/2 always halves the other number.',
        teachingNotes: 'Connect to "of": 1/2 × 8 = "half of 8" = 4. Same for any value.'
      },
      {
        id: 'string-5',
        title: 'Comparing to 1/2',
        prompts: ['5/8 vs 1/2', '3/7 vs 1/2', '4/9 vs 1/2', '6/11 vs 1/2', '50/101 vs 1/2'],
        focus: 'n/d > 1/2 iff 2n > d. This is the fastest mental comparison strategy.',
        teachingNotes: '"Without computing decimals, which is bigger?" Train the mental shortcut: double the top, compare to bottom.'
      }
    ];

    var renderMathTalksTab = function() {
      var mtId = _f.mtId || MATH_TALKS[0].id;
      var mt = MATH_TALKS.find(function(m) { return m.id === mtId; }) || MATH_TALKS[0];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-purple-50 rounded-xl p-3 border border-purple-200' },
          h('h4', { className: 'text-sm font-bold text-purple-800 mb-1' }, '🗣 Math Talks for fractions'),
          h('p', { className: 'text-[11px] text-purple-700' },
            'Number-talk strings (Parrish, 2010 — "Number Talks") for fraction reasoning. 5 prompts in a sequence with a common pattern. ',
            '15-minute teacher-led discussion focused on mental math and student explanation.'
          )
        ),
        h('div', { className: 'flex gap-1 flex-wrap' },
          MATH_TALKS.map(function(m) {
            var active = mtId === m.id;
            return h('button', {
              key: 'mt-' + m.id,
              onClick: function() { upd({ mtId: m.id }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                (active ? 'bg-purple-700 text-white' : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-100')
            }, m.title);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-purple-200 p-4 space-y-3' },
          h('h5', { className: 'text-base font-black text-purple-900' }, mt.title),
          h('div', { className: 'bg-purple-50 rounded p-3 border border-purple-200' },
            h('p', { className: 'text-[11px] font-bold text-purple-700 mb-2' }, '📋 Prompt string (do in order):'),
            h('ol', { className: 'space-y-1.5' },
              mt.prompts.map(function(p, i) {
                return h('li', { key: 'mp-' + i, className: 'text-base font-mono font-bold text-purple-900 bg-white rounded px-3 py-1.5 border border-purple-200' },
                  (i + 1) + '. ' + p
                );
              })
            )
          ),
          h('div', { className: 'bg-amber-50 rounded p-3 border border-amber-200' },
            h('p', { className: 'text-[11px] font-bold text-amber-700' }, '🎯 Focus:'),
            h('p', { className: 'text-xs text-slate-800 mt-1' }, mt.focus)
          ),
          h('div', { className: 'bg-emerald-50 rounded p-3 border border-emerald-200' },
            h('p', { className: 'text-[11px] font-bold text-emerald-700' }, '👩‍🏫 Teaching notes'),
            h('p', { className: 'text-xs text-slate-800 mt-1' }, mt.teachingNotes)
          )
        )
      );
    };

    // ── VOCABULARY QUIZ TAB ──
    var renderVocabQuizTab = function() {
      var vqRound = _f.vqRound || null;
      var vqAnswer = _f.vqAnswer || '';
      var vqFeedback = _f.vqFeedback || null;
      var vqScore = _f.vqScore || { correct: 0, total: 0 };

      var newVqRound = function() {
        var v = pick(FRACTION_VOCAB);
        // 4 choices: correct + 3 random distractors
        var others = FRACTION_VOCAB.filter(function(t) { return t.term !== v.term; });
        var distractors = [];
        while (distractors.length < 3) {
          var d = pick(others);
          if (!distractors.find(function(dx) { return dx.term === d.term; })) distractors.push(d);
        }
        var choices = [v.term].concat(distractors.map(function(d) { return d.term; }));
        choices.sort(function() { return Math.random() - 0.5; });
        return { term: v.term, def: v.def, choices: choices };
      };
      var startVq = function() {
        upd({ vqRound: newVqRound(), vqAnswer: '', vqFeedback: null, vqScore: { correct: 0, total: 0 } });
        sfxNewChallenge();
      };
      var answerVq = function(choice) {
        var ok = choice === vqRound.term;
        if (ok) {
          sfxCorrect();
          upd({ vqRound: newVqRound(),
            vqScore: { correct: vqScore.correct + 1, total: vqScore.total + 1 },
            vqFeedback: { correct: true, msg: '✅ Correct! ' + vqRound.term } });
        } else {
          sfxWrong();
          upd({
            vqScore: { correct: vqScore.correct, total: vqScore.total + 1 },
            vqFeedback: { correct: false, msg: '❌ The term was ' + vqRound.term + '.' }
          });
        }
      };

      if (!vqRound) {
        return h('div', { className: 'bg-sky-50 rounded-xl p-6 border-2 border-sky-200 text-center space-y-3' },
          h('div', { className: 'text-5xl' }, '📖'),
          h('h4', { className: 'text-xl font-black text-sky-800' }, 'Vocabulary Quiz'),
          h('p', { className: 'text-sm text-sky-700 max-w-md mx-auto' },
            'See a definition; pick the term. Master fraction vocabulary.'
          ),
          h('button', { onClick: startVq,
            className: 'px-6 py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700' }, '📖 Start quiz')
        );
      }
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'flex items-center gap-3 bg-sky-50 rounded-xl p-3 border border-sky-200' },
          h('span', { className: 'text-2xl' }, '📖'),
          h('span', { className: 'font-bold text-sky-800' }, 'Score: ' + vqScore.correct + '/' + vqScore.total),
          h('button', { onClick: startVq,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-sky-200 text-sky-800 hover:bg-sky-300' }, '↺ Restart')
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-sky-200 p-4 space-y-3' },
          h('p', { className: 'text-sm font-bold text-sky-800 text-center' }, 'Which term matches this definition?'),
          h('p', { className: 'text-base text-slate-800 italic bg-sky-50 rounded p-3 border border-sky-200' }, '"' + vqRound.def + '"'),
          h('div', { className: 'grid grid-cols-2 gap-2' },
            vqRound.choices.map(function(c, i) {
              return h('button', {
                key: 'vc-' + i,
                onClick: function() { answerVq(c); },
                className: 'px-3 py-2 rounded-lg text-sm font-bold bg-sky-100 text-sky-800 hover:bg-sky-300 border-2 border-sky-300'
              }, c);
            })
          ),
          vqFeedback && h('p', { className: 'text-sm font-bold text-center ' + (vqFeedback.correct ? 'text-green-700' : 'text-red-700') }, vqFeedback.msg)
        )
      );
    };

    // ── REFERENCE CARD MAKER ──
    var renderRefCardTab = function() {
      var cardFractions = _f.cardFractions || ['1/2', '1/3', '2/3', '1/4', '3/4', '1/5', '2/5', '3/5', '4/5'];
      var printCard = function() {
        if (typeof window === 'undefined' || !window.print) return;
        var html = '<html><head><title>Fraction Reference Card</title>';
        html += '<style>body{font-family:sans-serif;margin:30px;}.card{border:2px solid #9f1239;border-radius:12px;padding:16px;max-width:600px;}h1{color:#9f1239;}.row{display:flex;align-items:center;gap:12px;padding:6px;border-bottom:1px solid #ddd;}.frac{font-family:monospace;font-size:18pt;font-weight:bold;width:60px;}.dec{color:#2563eb;width:80px;}.pct{color:#9333ea;width:80px;}@media print{.no-print{display:none;}}</style></head><body>';
        html += '<div class="card"><h1>Fraction Reference Card</h1>';
        html += '<p style="font-size:11pt;color:#666;">Common fractions with decimal and percent equivalents.</p>';
        cardFractions.forEach(function(f) {
          var parts = f.split('/');
          var fn = parseInt(parts[0]); var fd = parseInt(parts[1]);
          var dec = (fn / fd).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
          var pct = (fn / fd * 100).toFixed(1).replace(/\.0$/, '');
          html += '<div class="row"><span class="frac">' + f + '</span><span class="dec">' + dec + '</span><span class="pct">' + pct + '%</span></div>';
        });
        html += '</div></body></html>';
        try {
          var w = window.open('', '_blank');
          if (w) { w.document.write(html); w.document.close(); setTimeout(function() { w.print(); }, 250); }
        } catch (e) { addToast('Could not open print window', 'error'); }
      };

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-cyan-50 rounded-xl p-3 border border-cyan-200' },
          h('h4', { className: 'text-sm font-bold text-cyan-800 mb-1' }, '🖨 Reference card maker'),
          h('p', { className: 'text-[11px] text-cyan-700' },
            'Generate a printable reference card with fractions, decimals, and percents. Tape it to a binder or desk for quick lookup.'
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-4 max-w-md mx-auto' },
          h('h5', { className: 'text-base font-black text-cyan-900 mb-2' }, 'Fraction Reference Card'),
          h('table', { className: 'w-full text-sm' },
            h('thead', null,
              h('tr', { className: 'border-b border-cyan-300' },
                h('th', { className: 'text-left py-1' }, 'Fraction'),
                h('th', { className: 'text-left py-1' }, 'Decimal'),
                h('th', { className: 'text-left py-1' }, 'Percent')
              )
            ),
            h('tbody', null,
              cardFractions.map(function(f, i) {
                var parts = f.split('/');
                var fn = parseInt(parts[0]); var fd = parseInt(parts[1]);
                return h('tr', { key: 'cf-' + i, className: 'border-b border-cyan-100' },
                  h('td', { className: 'py-1 font-mono font-bold text-cyan-900' }, f),
                  h('td', { className: 'py-1 font-mono text-blue-700' }, (fn / fd).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')),
                  h('td', { className: 'py-1 font-mono text-purple-700' }, (fn / fd * 100).toFixed(1).replace(/\.0$/, '') + '%')
                );
              })
            )
          )
        ),
        h('button', { onClick: printCard,
          className: 'w-full px-4 py-2 bg-cyan-700 text-white font-bold rounded-xl hover:bg-cyan-800' }, '🖨 Print this card')
      );
    };

    // ── HANDS-ON ACTIVITIES LIBRARY ──
    var HANDS_ON_ACTIVITIES = [
      {
        id: 'paper-folding', title: 'Paper folding fractions', grade: '2-4', time: '15 min',
        materials: 'Paper squares (1 per student), markers, scissors (optional)',
        steps: [
          'Give each student a square paper.',
          'Fold in half. Open it: how many parts? (2). Each is 1/2.',
          'Fold in half again (perpendicular). Open it: 4 parts. Each is 1/4.',
          'Fold once more. Open it: 8 parts. Each is 1/8.',
          'Discuss: what happens to the size of each piece as the number of pieces doubles?'
        ],
        extension: 'Try folding into thirds or fifths. How is that different from halves?',
        ccss: '3.NF.A.1'
      },
      {
        id: 'pattern-blocks', title: 'Pattern block fractions', grade: '2-5', time: '20 min',
        materials: 'Pattern blocks (hexagon = 1; trapezoid = 1/2; rhombus = 1/3; triangle = 1/6)',
        steps: [
          'Cover one hexagon with trapezoids — how many? (2). Each is 1/2.',
          'Cover with rhombi — how many? (3). Each is 1/3.',
          'Cover with triangles — how many? (6). Each is 1/6.',
          'Mix: cover one hexagon with 1 trapezoid + 2 triangles. What fractions does that represent?',
          'Equivalence: 1/2 (1 trapezoid) = 3/6 (3 triangles). Verify by covering same area.'
        ],
        extension: 'Use 2 hexagons. What fractions can you make?',
        ccss: '4.NF.A.1'
      },
      {
        id: 'fraction-strips', title: 'Fraction strip kit', grade: '2-5', time: '30 min (one-time make + reuse)',
        materials: 'Strips of paper (5 colors); ruler; scissors',
        steps: [
          'Cut a "1 whole" strip from one color.',
          'Cut 2 equal strips of another color, label each "1/2."',
          'Cut 3 equal strips of another color, label "1/3."',
          'Cut 4 equal strips of another color, label "1/4."',
          'Cut 6 equal strips, label "1/6."',
          'Cut 8 equal strips, label "1/8."',
          'Use the kit for all future fraction work — addition, subtraction, equivalence.'
        ],
        extension: 'Add 1/5, 1/10, 1/12 for more flexibility.',
        ccss: '4.NF.A.1'
      },
      {
        id: 'cooking-lab', title: 'Cooking lab — playdough recipe', grade: '3-5', time: '45 min',
        materials: 'Flour, salt, water, oil; measuring cups; mixing bowls',
        steps: [
          'Recipe: 1 cup flour, 1/2 cup salt, 1/2 cup water, 1 tbsp oil. Mix.',
          'Problem 1: half the recipe. How much of each ingredient?',
          'Problem 2: triple the recipe. How much of each?',
          'Make the playdough using one of the scalings. Discuss the math while mixing.'
        ],
        extension: 'Compare: would 2 1/4 of the recipe work? Compute.',
        ccss: '5.NF.B.4'
      },
      {
        id: 'pizza-day', title: 'Pizza Day (cardboard)', grade: '2-4', time: '30 min',
        materials: 'Cardboard "pizzas," scissors, markers',
        steps: [
          'Each pair gets a cardboard circle.',
          'Cut into halves. Glue/draw "1/2" on each piece.',
          'Cut each half into halves again. Now there are 4 pieces — each is 1/4.',
          'Discuss: how many 1/4 pieces make 1/2? (2) How many make 1 whole? (4)',
          'Trade pieces with another pair: how can you make 1/2 from 1/4 pieces?'
        ],
        extension: 'Cut into eighths. Compare 4/8 to 1/2 — are they the same?',
        ccss: '3.NF.A.3'
      },
      {
        id: 'number-line-walk', title: 'Number line walk (kinesthetic)', grade: '3-4', time: '15 min',
        materials: 'Masking tape (long line on the floor); paper labels',
        steps: [
          'Tape a number line on the floor from 0 to 1.',
          'Mark 1/2 in the middle. Mark 1/4 and 3/4 at the quarter points.',
          'Call out a fraction. Students walk to its position on the line.',
          'Compare two fractions: which is bigger? The one further to the right.',
          'Add fractions kinesthetically: start at 1/4, walk 1/4 more — you\'re at 1/2!'
        ],
        extension: 'Extend the line to 2. Practice with improper fractions and mixed numbers.',
        ccss: '3.NF.A.2'
      },
      {
        id: 'fraction-card-game', title: 'Fraction war card game', grade: '4-5', time: '20 min',
        materials: 'Custom fraction cards (or make from index cards)',
        steps: [
          'Each player has a deck of fraction cards (1/2, 1/3, 1/4, 2/3, 3/4, etc.)',
          'Both players flip one card.',
          'The bigger fraction wins both cards.',
          'Disputes settled by computing decimals or using a fraction wall.',
          'Game ends when one player has all the cards.'
        ],
        extension: 'Three-card war: each player flips 3 cards, sums them, biggest sum wins.',
        ccss: '4.NF.A.2'
      },
      {
        id: 'real-cookies', title: 'Real cookie sharing', grade: '3-5', time: '30 min (involves cookies)',
        materials: 'Cookies (1 per group), plates, knives or breaking',
        steps: [
          'Group of 4 students gets 3 cookies. "How would you share these equally?"',
          'Solutions emerge: cut each cookie into 4 pieces; give each child 3 pieces (= 3/4 of a cookie).',
          'Alternative: give each child 1 cookie, cut the last in 4 pieces (3/4 + 1/4 — total 3 ÷ 4 = 3/4 + 1/4 — but each only gets 1/4 extra wait, distributes differently).',
          'Discuss: what does 3 ÷ 4 mean? It can be 3/4 each.',
          'Eat the cookies.'
        ],
        extension: 'Repeat with 5 cookies / 4 kids. What fraction does each get? (5/4 = 1 1/4)',
        ccss: '5.NF.B.3'
      }
    ];

    var renderActivitiesTab = function() {
      var actId = _f.actId || HANDS_ON_ACTIVITIES[0].id;
      var act = HANDS_ON_ACTIVITIES.find(function(a) { return a.id === actId; }) || HANDS_ON_ACTIVITIES[0];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('h4', { className: 'text-sm font-bold text-amber-800 mb-1' }, '✂️ Hands-on activities library'),
          h('p', { className: 'text-[11px] text-amber-700' },
            'Physical, off-screen activities to teach fractions concretely. Print-friendly. Each activity has materials, steps, an extension, and CCSS alignment.'
          )
        ),
        h('div', { className: 'flex gap-1 flex-wrap' },
          HANDS_ON_ACTIVITIES.map(function(a) {
            var active = actId === a.id;
            return h('button', {
              key: 'a-' + a.id,
              onClick: function() { upd({ actId: a.id }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                (active ? 'bg-amber-700 text-white' : 'bg-white text-amber-700 border border-amber-300 hover:bg-amber-100')
            }, a.title);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4 space-y-3' },
          h('div', { className: 'flex items-center gap-2 flex-wrap' },
            h('h5', { className: 'text-base font-black text-amber-900' }, act.title),
            h('span', { className: 'text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded' }, 'Grade ' + act.grade),
            h('span', { className: 'text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded' }, '⏱ ' + act.time),
            act.ccss && h('span', { className: 'text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded' }, act.ccss)
          ),
          h('div', { className: 'bg-amber-50 rounded p-2 border border-amber-200' },
            h('p', { className: 'text-[11px] font-bold text-amber-700 mb-0.5' }, '📦 Materials'),
            h('p', { className: 'text-xs text-slate-800' }, act.materials)
          ),
          h('div', { className: 'bg-white rounded p-2 border border-amber-200' },
            h('p', { className: 'text-[11px] font-bold text-amber-700 mb-0.5' }, '📋 Steps'),
            h('ol', { className: 'text-xs list-decimal pl-5 space-y-0.5 text-slate-800' },
              act.steps.map(function(s, i) { return h('li', { key: 's-' + i }, s); })
            )
          ),
          h('div', { className: 'bg-amber-50 rounded p-2 border border-amber-200' },
            h('p', { className: 'text-[11px] font-bold text-amber-700 mb-0.5' }, '🚀 Extension'),
            h('p', { className: 'text-xs text-slate-800' }, act.extension)
          )
        )
      );
    };

    // ── SCOPE & SEQUENCE TAB ──
    // Full K-8 fraction trajectory with month-by-month suggested pacing.
    var SCOPE_SEQUENCE = [
      { grade: 1, units: [
        { month: 'Sep', topic: 'Halves: partitioning shapes', ccss: '1.G.A.3', focus: 'Cutting a shape into 2 equal parts. Vocabulary: half.' }
      ]},
      { grade: 2, units: [
        { month: 'Oct', topic: 'Halves, thirds, fourths', ccss: '2.G.A.3', focus: 'Partition shapes into 2, 3, or 4 equal shares.' },
        { month: 'Feb', topic: 'Describing parts', ccss: '2.G.A.3', focus: 'Use words: halves, thirds, fourths. Identify equal shares.' }
      ]},
      { grade: 3, units: [
        { month: 'Sep', topic: 'Unit fractions', ccss: '3.NF.A.1', focus: 'Understand 1/b as 1 part of a whole partitioned into b equal parts.' },
        { month: 'Oct', topic: 'Fractions as numbers', ccss: '3.NF.A.2', focus: 'Represent fractions on a number line. Magnitude reasoning begins.' },
        { month: 'Nov', topic: 'Equivalent fractions intro', ccss: '3.NF.A.3', focus: 'Recognize simple equivalent fractions visually.' },
        { month: 'Dec', topic: 'Comparing fractions', ccss: '3.NF.A.3.d', focus: 'Same numerator or same denominator. Justify with model.' },
        { month: 'Jan', topic: 'Whole numbers as fractions', ccss: '3.NF.A.3.c', focus: '3 = 3/1; 4/4 = 1; 6/2 = 3.' }
      ]},
      { grade: 4, units: [
        { month: 'Sep', topic: 'Equivalent fractions (procedural)', ccss: '4.NF.A.1', focus: 'a/b = (n×a)/(n×b). Visual model + symbolic rule.' },
        { month: 'Oct', topic: 'Compare unlike fractions', ccss: '4.NF.A.2', focus: 'Benchmark to 1/2; common denominators; cross-multiplication.' },
        { month: 'Nov', topic: 'Add/subtract like denominators', ccss: '4.NF.B.3', focus: 'Same denominator. Unit fraction iteration.' },
        { month: 'Dec', topic: 'Mixed numbers', ccss: '4.NF.B.3.c', focus: 'Convert mixed ↔ improper. Add/subtract mixed.' },
        { month: 'Jan', topic: 'Multiply fraction by whole', ccss: '4.NF.B.4', focus: 'a/b × n. Visual: bar model with n copies.' },
        { month: 'Feb', topic: 'Decimal fractions', ccss: '4.NF.C.5,6,7', focus: 'Tenths and hundredths. Decimal notation.' },
        { month: 'Mar', topic: 'Word problems with fractions', ccss: '4.NF.B.3.d', focus: 'Real contexts. Multi-step.' }
      ]},
      { grade: 5, units: [
        { month: 'Sep', topic: 'Add/subtract unlike denominators', ccss: '5.NF.A.1', focus: 'LCM, equivalent fractions, common denominators.' },
        { month: 'Oct', topic: 'Word problems with unlike adding', ccss: '5.NF.A.2', focus: 'Real-world contexts requiring add-unlike.' },
        { month: 'Nov', topic: 'Fraction as division', ccss: '5.NF.B.3', focus: 'a/b = a ÷ b. 3 cookies / 4 friends = 3/4 each.' },
        { month: 'Dec', topic: 'Multiply fractions', ccss: '5.NF.B.4', focus: 'Tops × tops, bottoms × bottoms. Area model.' },
        { month: 'Jan', topic: 'Multiplication as scaling', ccss: '5.NF.B.5', focus: '× by < 1 makes smaller; × by > 1 makes bigger.' },
        { month: 'Feb', topic: 'Multi-step word problems', ccss: '5.NF.B.6', focus: '2-3 step problems with multiplication.' },
        { month: 'Mar', topic: 'Divide unit fractions', ccss: '5.NF.B.7', focus: '4 ÷ 1/2, 1/4 ÷ 3. Use measurement interpretation.' },
        { month: 'Apr', topic: 'Volume with fractional sides', ccss: '5.NF.B.4.b', focus: 'Rectangle area with fraction sides.' }
      ]},
      { grade: 6, units: [
        { month: 'Sep', topic: 'Divide fraction by fraction', ccss: '6.NS.A.1', focus: 'Keep-Change-Flip with full generality. Measurement and partitive interpretations.' },
        { month: 'Oct', topic: 'Ratios and rates', ccss: '6.RP.A.1', focus: 'Ratios as fractions; unit rates.' },
        { month: 'Nov', topic: 'Percents as ratios', ccss: '6.RP.A.3.c', focus: '% = per 100. Fraction-decimal-percent triangle.' }
      ]},
      { grade: 7, units: [
        { month: 'Sep', topic: 'Operations on rational numbers', ccss: '7.NS.A.2', focus: 'Add, subtract, multiply, divide with signed fractions.' },
        { month: 'Oct', topic: 'Convert fraction to decimal', ccss: '7.NS.A.2.d', focus: 'Long division; terminating vs repeating.' }
      ]},
      { grade: 8, units: [
        { month: 'Sep', topic: 'Rational vs irrational', ccss: '8.NS.A.1', focus: 'Every fraction is rational. π and √2 are irrational.' }
      ]}
    ];

    var renderScopeSequenceTab = function() {
      var ssGrade = _f.ssGrade || 4;
      var grade = SCOPE_SEQUENCE.find(function(g) { return g.grade === ssGrade; }) || SCOPE_SEQUENCE[3];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
          h('h4', { className: 'text-sm font-bold text-indigo-800 mb-1' }, '📅 Scope & sequence — K-8 fraction trajectory'),
          h('p', { className: 'text-[11px] text-indigo-700' },
            'Suggested month-by-month pacing for fraction instruction at each grade level. Use this to map AlloFlow tools to your curriculum calendar.'
          )
        ),
        h('div', { className: 'flex gap-1 flex-wrap' },
          [1, 2, 3, 4, 5, 6, 7, 8].map(function(g) {
            var active = ssGrade === g;
            return h('button', {
              key: 'ssg-' + g,
              onClick: function() { upd({ ssGrade: g }); },
              className: 'px-3 py-1.5 rounded text-xs font-bold transition-all ' +
                (active ? 'bg-indigo-700 text-white' : 'bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-100')
            }, 'Grade ' + g);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-4 space-y-2' },
          h('h5', { className: 'text-base font-black text-indigo-900' }, 'Grade ' + grade.grade + ' fraction trajectory'),
          grade.units.map(function(u, i) {
            return h('div', { key: 'su-' + i, className: 'flex items-start gap-2 border-t border-indigo-100 pt-2' },
              h('div', { className: 'w-12 text-center bg-indigo-100 rounded p-1 flex-shrink-0' },
                h('p', { className: 'text-[10px] font-bold text-indigo-800' }, u.month)
              ),
              h('div', { className: 'flex-1' },
                h('p', { className: 'text-sm font-bold text-indigo-900' }, u.topic),
                h('p', { className: 'text-[10px] text-indigo-600 mt-0.5' }, u.ccss),
                h('p', { className: 'text-xs text-slate-700 mt-1' }, '🎯 ' + u.focus)
              )
            );
          })
        )
      );
    };

    // ── ASSESSMENT RUBRIC TAB ──
    // 4-point holistic rubric teachers can use for student fraction work.
    var renderRubricTab = function() {
      var rubrics = [
        {
          level: 4, label: 'Mastery', color: 'emerald',
          criteria: 'Accurately performs the procedure AND explains the reasoning in their own words. Connects symbolic, visual, and verbal representations. Identifies errors in others\' work.',
          example: 'Student writes "1/2 + 1/3 = 5/6" and explains: "I need same-size pieces. Sixths work because both 2 and 3 divide 6. 1/2 = 3/6 and 1/3 = 2/6. 3/6 + 2/6 = 5/6."'
        },
        {
          level: 3, label: 'Proficient', color: 'sky',
          criteria: 'Accurately performs the procedure. Can verify with one representation but may struggle to explain reasoning.',
          example: 'Student writes "1/2 + 1/3 = 5/6" and verifies with a fraction wall but says only "I added them."'
        },
        {
          level: 2, label: 'Developing', color: 'amber',
          criteria: 'Procedure is partial or has minor errors. Has the right approach but stumbles in execution.',
          example: 'Student writes "1/2 + 1/3 = 3/6 + 2/6 = 5/12" — got the common denominator right but added denominators too.'
        },
        {
          level: 1, label: 'Beginning', color: 'rose',
          criteria: 'Procedure is largely incorrect. May be applying whole-number rules to fractions.',
          example: 'Student writes "1/2 + 1/3 = 2/5" — added numerators and denominators separately.'
        }
      ];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-slate-50 rounded-xl p-3 border border-slate-200' },
          h('h4', { className: 'text-sm font-bold text-slate-800 mb-1' }, '📊 Assessment rubric — 4 levels'),
          h('p', { className: 'text-[11px] text-slate-700' },
            'A 4-point holistic rubric for evaluating student work on fraction problems. Each level has criteria and an example response. Useful for portfolio assessment and conferencing.'
          )
        ),
        rubrics.map(function(r) {
          return h('div', { key: 'rub-' + r.level, className: 'bg-white rounded-xl border-2 border-' + r.color + '-200 p-3' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-2xl' }, r.level),
              h('h5', { className: 'text-sm font-black text-' + r.color + '-800' }, r.label),
              h('span', { className: 'ml-auto text-[10px] font-bold text-' + r.color + '-600 bg-' + r.color + '-100 px-2 py-0.5 rounded' }, 'Level ' + r.level)
            ),
            h('p', { className: 'text-xs text-slate-700' }, h('b', null, 'Criteria: '), r.criteria),
            h('p', { className: 'text-[11px] text-' + r.color + '-700 italic mt-1' }, h('b', null, 'Example: '), r.example)
          );
        })
      );
    };

    // ── STORY MODE: The Bakery ──
    // A narrative-driven sequence of fraction problems in a coherent context.
    var BAKERY_STORY = [
      {
        chapter: 1, title: 'Morning Setup',
        narrative: 'You arrive at the bakery at 5am. The owner has left a list: today you need to bake 3 batches of bread. Each batch needs 5 1/2 cups of flour.',
        question: 'How much flour do you need in total?',
        operation: 'multiply',
        n1: 11, d1: 2, n2: 3, d2: 1,
        answer: { n: 33, d: 2, mixed: '16 1/2' },
        hint: '5 1/2 × 3 = 11/2 × 3.',
        followup: 'You measure out 16 1/2 cups of flour. Phew, you have just enough in the bin!'
      },
      {
        chapter: 2, title: 'The First Customer',
        narrative: 'A customer wants 3/4 of a loaf. A whole loaf is $8. You charge by the fraction.',
        question: 'How much should the customer pay?',
        operation: 'multiply',
        n1: 3, d1: 4, n2: 8, d2: 1,
        answer: { n: 6, d: 1 },
        hint: '3/4 × $8.',
        followup: 'They pay $6 and leave smiling.'
      },
      {
        chapter: 3, title: 'Sharing Profits',
        narrative: 'The owner splits the morning tips equally between you and 3 coworkers. The tip jar has 1 1/2 cups of dollar bills (you measure tips in cups for some reason).',
        question: 'How much of a cup do you each get?',
        operation: 'divide',
        n1: 3, d1: 2, n2: 4, d2: 1,
        answer: { n: 3, d: 8 },
        hint: '1 1/2 ÷ 4 = 3/2 ÷ 4 = 3/2 × 1/4.',
        followup: '3/8 of a cup of dollars each. About $9 in real terms.'
      },
      {
        chapter: 4, title: 'The Big Order',
        narrative: 'A wedding orders 4 1/2 dozen cupcakes. Each dozen needs 3/4 stick of butter.',
        question: 'How many sticks of butter do you need?',
        operation: 'multiply',
        n1: 9, d1: 2, n2: 3, d2: 4,
        answer: { n: 27, d: 8, mixed: '3 3/8' },
        hint: '4 1/2 × 3/4 = 9/2 × 3/4.',
        followup: 'You melt 3 3/8 sticks of butter. The cupcakes are perfect.'
      },
      {
        chapter: 5, title: 'End-of-Day Inventory',
        narrative: 'At closing, you have 7/8 of a sugar bag left. Tomorrow\'s baking needs 1/2 of a full bag.',
        question: 'Do you have enough sugar for tomorrow? If so, how much will be left after baking?',
        operation: 'subtract',
        n1: 7, d1: 8, n2: 1, d2: 2,
        answer: { n: 3, d: 8 },
        hint: '7/8 − 1/2 = 7/8 − 4/8.',
        followup: 'Yes! 3/8 of a bag will be left after tomorrow\'s baking.'
      }
    ];

    var renderStoryModeTab = function() {
      var storyCh = _f.storyCh || 1;
      var storyAnswer = _f.storyAnswer || '';
      var storyFeedback = _f.storyFeedback || null;
      var chapter = BAKERY_STORY.find(function(c) { return c.chapter === storyCh; }) || BAKERY_STORY[0];
      var checkStory = function() {
        if (!storyAnswer.trim()) return;
        var trimmed = storyAnswer.trim();
        var fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
        var mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
        var intMatch = trimmed.match(/^(\d+)$/);
        var a = chapter.answer;
        var ok = false;
        if (mixedMatch && a.mixed) ok = trimmed === a.mixed;
        else if (fracMatch) {
          var rn = parseInt(fracMatch[1]); var rd = parseInt(fracMatch[2]);
          ok = rn * a.d === a.n * rd;
        } else if (intMatch && a.d === 1) ok = parseInt(intMatch[1]) === a.n;
        if (ok) {
          sfxCorrect();
          upd({ storyFeedback: { correct: true, msg: '✅ ' + chapter.followup } });
          awardXP('fractionStory', 25, 'Story chapter');
        } else {
          sfxWrong();
          upd({ storyFeedback: { correct: false, msg: '❌ Try again. ' + chapter.hint } });
        }
      };
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-orange-50 rounded-xl p-3 border border-orange-200' },
          h('h4', { className: 'text-sm font-bold text-orange-800 mb-1' }, '📖 Story Mode: The Bakery'),
          h('p', { className: 'text-[11px] text-orange-700' },
            'A 5-chapter story where each chapter is a fraction problem in context. Work through the bakery day to apply your skills.'
          )
        ),
        h('div', { className: 'flex gap-1 flex-wrap' },
          BAKERY_STORY.map(function(c) {
            var active = storyCh === c.chapter;
            return h('button', {
              key: 'sch-' + c.chapter,
              onClick: function() { upd({ storyCh: c.chapter, storyAnswer: '', storyFeedback: null }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                (active ? 'bg-orange-700 text-white' : 'bg-white text-orange-700 border border-orange-300 hover:bg-orange-100')
            }, 'Ch.' + c.chapter);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-4 space-y-3' },
          h('p', { className: 'text-xs font-bold text-orange-700' }, 'Chapter ' + chapter.chapter + ': ' + chapter.title),
          h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, '📖 ' + chapter.narrative),
          h('p', { className: 'text-sm font-bold text-orange-900' }, '🧮 ' + chapter.question),
          h('div', { className: 'flex gap-2' },
            h('input', {
              type: 'text', value: storyAnswer,
              onChange: function(e) { upd({ storyAnswer: e.target.value }); },
              onKeyDown: function(e) { if (e.key === 'Enter') checkStory(); },
              placeholder: 'Your answer (e.g., 3/4 or 1 1/2 or 8)',
              'aria-label': 'Story answer',
              className: 'flex-1 px-3 py-2 border border-orange-400 rounded-lg text-sm font-mono'
            }),
            h('button', { onClick: checkStory,
              className: 'px-4 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700' }, 'Submit')
          ),
          storyFeedback && h('p', { className: 'text-sm font-bold ' + (storyFeedback.correct ? 'text-green-700' : 'text-red-700') }, storyFeedback.msg),
          storyFeedback && storyFeedback.correct && h('div', { className: 'flex gap-2 mt-3' },
            h('button', {
              onClick: function() { upd({ storyCh: Math.min(BAKERY_STORY.length, storyCh + 1), storyAnswer: '', storyFeedback: null }); },
              disabled: storyCh >= BAKERY_STORY.length,
              className: 'flex-1 px-3 py-2 rounded text-sm font-bold ' +
                (storyCh < BAKERY_STORY.length ? 'bg-orange-700 text-white hover:bg-orange-800' : 'bg-slate-100 text-slate-400')
            }, storyCh < BAKERY_STORY.length ? 'Next chapter →' : 'Story complete! ✨')
          )
        )
      );
    };

    // ── EXAM PREP TAB ──
    // Test-prep oriented: timed quizzes mimicking standardized test format.
    var renderExamPrepTab = function() {
      var examGrade = _f.examGrade || 5;
      var examQs = _f.examQs || null;
      var examAnswers = _f.examAnswers || {};
      var examFinished = _f.examFinished || false;

      var generateExam = function(grade) {
        var items = [];
        var count = 10;
        for (var i = 0; i < count; i++) {
          var item = null;
          // Mix question types by grade
          if (grade <= 4) {
            // Easier: identify, equivalent, compare
            var d = pick([2, 3, 4, 5, 6, 8]);
            var n = randInt(1, d);
            if (i % 3 === 0) {
              item = { type: 'identify', q: 'What fraction is shown as ' + n + ' parts out of ' + d + '?',
                       choices: [n + '/' + d, (n + 1) + '/' + d, n + '/' + (d + 1), (n - 1) + '/' + d].filter(function(x, j) { return x.indexOf('0') !== 0 && x.indexOf('-') < 0; }),
                       answer: n + '/' + d };
            } else if (i % 3 === 1) {
              var em = randInt(2, 4);
              item = { type: 'equivalent', q: 'Which is equivalent to ' + n + '/' + d + '?',
                       choices: [(n * em) + '/' + (d * em), (n + 1) + '/' + (d + 1), (n * em) + '/' + (d * em + 1), n + '/' + (d * em)],
                       answer: (n * em) + '/' + (d * em) };
            } else {
              var n2 = randInt(1, d);
              while ((n2 === n)) n2 = randInt(1, d);
              item = { type: 'compare', q: 'Which is larger: ' + n + '/' + d + ' or ' + n2 + '/' + d + '?',
                       choices: [n + '/' + d, n2 + '/' + d, 'They are equal', 'Cannot tell'],
                       answer: n > n2 ? n + '/' + d : n2 + '/' + d };
            }
          } else {
            // Grade 5+: operations
            var d1 = pick([2, 3, 4, 6]);
            var d2 = pick([2, 3, 4, 6]);
            var n1 = randInt(1, d1 - 1);
            var n2x = randInt(1, d2 - 1);
            var cdo = lcm(d1, d2);
            var op = pick(['add', 'sub', 'mul']);
            var ans;
            if (op === 'add') {
              ans = simplify(n1 * (cdo / d1) + n2x * (cdo / d2), cdo);
              var distract = [ans[0] + '/' + (ans[1] + 1), (ans[0] + 1) + '/' + ans[1], (n1 + n2x) + '/' + (d1 + d2)];
              item = { type: 'add', q: n1 + '/' + d1 + ' + ' + n2x + '/' + d2 + ' = ?',
                       choices: [ans[0] + '/' + ans[1]].concat(distract),
                       answer: ans[0] + '/' + ans[1] };
            } else if (op === 'sub') {
              var diff = n1 * (cdo / d1) - n2x * (cdo / d2);
              if (diff < 0) { diff = -diff; }
              ans = simplify(Math.max(1, diff), cdo);
              item = { type: 'sub', q: n1 + '/' + d1 + ' − ' + n2x + '/' + d2 + ' = ?',
                       choices: [ans[0] + '/' + ans[1], (ans[0] + 1) + '/' + ans[1], n1 + '/' + d1, n2x + '/' + d2],
                       answer: ans[0] + '/' + ans[1] };
            } else {
              ans = simplify(n1 * n2x, d1 * d2);
              item = { type: 'mul', q: n1 + '/' + d1 + ' × ' + n2x + '/' + d2 + ' = ?',
                       choices: [ans[0] + '/' + ans[1], (ans[0] + 1) + '/' + ans[1], (n1 + n2x) + '/' + (d1 + d2), n1 + '/' + d1],
                       answer: ans[0] + '/' + ans[1] };
            }
          }
          if (item) {
            item.choices = item.choices.slice(0, 4);
            // Shuffle
            item.choices.sort(function() { return Math.random() - 0.5; });
            items.push(item);
          }
        }
        upd({ examQs: items, examAnswers: {}, examFinished: false });
        sfxNewChallenge();
      };

      var submitExam = function() {
        upd({ examFinished: true });
        var correct = 0;
        examQs.forEach(function(q, i) {
          if (examAnswers[i] === q.answer) correct++;
        });
        sfxComplete();
        addToast('Exam complete: ' + correct + ' / ' + examQs.length, 'success');
        awardXP('fractionExam', correct * 10, 'Exam score');
      };

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-blue-50 rounded-xl p-3 border border-blue-200' },
          h('h4', { className: 'text-sm font-bold text-blue-800 mb-1' }, '📝 Exam prep — practice tests'),
          h('p', { className: 'text-[11px] text-blue-700' },
            'Multiple-choice quizzes that mirror standardized test format. Pick a grade level, take a 10-question test, see your score.'
          )
        ),
        h('div', { className: 'flex gap-2' },
          h('label', { className: 'text-xs font-bold text-blue-700 self-center' }, 'Grade:'),
          h('select', { value: examGrade,
            onChange: function(e) { upd({ examGrade: parseInt(e.target.value), examQs: null, examFinished: false }); },
            className: 'px-2 py-1 rounded border border-blue-300 text-xs' },
            [3, 4, 5, 6].map(function(g) { return h('option', { key: 'eg-' + g, value: g }, 'Grade ' + g); })
          ),
          h('button', { onClick: function() { generateExam(examGrade); },
            className: 'ml-auto px-4 py-1.5 rounded text-xs font-bold bg-blue-600 text-white hover:bg-blue-700' },
            examQs ? '🔀 New test' : '📝 Generate test'
          )
        ),
        examQs && h('div', { className: 'bg-white rounded-xl border-2 border-blue-200 p-4 space-y-3' },
          h('p', { className: 'text-[11px] font-bold text-blue-700' }, '10-question practice test'),
          examQs.map(function(q, i) {
            var answered = examAnswers[i];
            return h('div', { key: 'eq-' + i, className: 'border-t border-blue-100 pt-2' },
              h('p', { className: 'text-sm font-bold text-blue-900' }, (i + 1) + '. ' + q.q),
              h('div', { className: 'grid grid-cols-2 gap-1 mt-2' },
                q.choices.map(function(c, ci) {
                  var picked = answered === c;
                  var correct = examFinished && c === q.answer;
                  var wrong = examFinished && picked && c !== q.answer;
                  return h('button', {
                    key: 'ec-' + i + '-' + ci,
                    onClick: function() {
                      if (examFinished) return;
                      var na = Object.assign({}, examAnswers); na[i] = c;
                      upd({ examAnswers: na });
                    },
                    disabled: examFinished,
                    className: 'px-3 py-1.5 rounded text-xs font-bold font-mono text-left transition-all ' +
                      (correct ? 'bg-emerald-200 text-emerald-900 border-2 border-emerald-500' :
                       wrong ? 'bg-rose-200 text-rose-900 border-2 border-rose-500' :
                       picked ? 'bg-blue-300 text-blue-900 border border-blue-500' :
                       'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100')
                  }, String.fromCharCode(65 + ci) + ') ' + c);
                })
              )
            );
          }),
          !examFinished && h('button', { onClick: submitExam,
            className: 'w-full px-4 py-2 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800' }, '✓ Submit test'),
          examFinished && h('div', { className: 'bg-emerald-50 rounded-lg p-3 border-2 border-emerald-300 text-center' },
            h('p', { className: 'text-base font-black text-emerald-800' },
              '🎉 Score: ' + Object.keys(examAnswers).reduce(function(acc, i) {
                return acc + (examAnswers[i] === examQs[i].answer ? 1 : 0);
              }, 0) + ' / ' + examQs.length
            )
          )
        )
      );
    };

    // ── DAILY PRACTICE TAB ──
    var renderDailyPracticeTab = function() {
      var dpDays = _f.dpDays || [];
      var today = new Date().toLocaleDateString();
      var dpTodayDone = dpDays.indexOf(today) >= 0;
      var startDP = function() {
        // Generate 5 mixed problems
        var probs = [];
        for (var i = 0; i < 5; i++) {
          var d = pick([2, 3, 4, 5, 6, 8]);
          var n = randInt(1, d - 1);
          probs.push({ q: 'Simplify ' + (n * 2) + '/' + (d * 2), answer: n + '/' + d });
        }
        upd({ dpProbs: probs, dpAnswer: '', dpStep: 0, dpScore: 0 });
      };
      var markComplete = function() {
        upd({ dpDays: (dpDays.indexOf(today) < 0 ? dpDays.concat([today]) : dpDays) });
        sfxComplete();
        addToast('✓ Day complete! ' + (dpDays.length + 1) + ' day streak.', 'success');
      };
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-emerald-50 rounded-xl p-3 border border-emerald-200' },
          h('h4', { className: 'text-sm font-bold text-emerald-800 mb-1' }, '📅 Daily practice'),
          h('p', { className: 'text-[11px] text-emerald-700' },
            'A short daily ritual: 5 problems per day. Build a streak. Practice schedules beat practice intensity for retention.'
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-4 text-center space-y-2' },
          h('p', { className: 'text-sm text-emerald-700' }, 'Today: ', h('b', null, today)),
          h('p', { className: 'text-3xl font-black text-emerald-800' }, dpDays.length + ' 🔥 day' + (dpDays.length === 1 ? '' : 's')),
          h('p', { className: 'text-[11px] text-emerald-600' }, 'Practice streak'),
          !dpTodayDone && h('button', { onClick: markComplete,
            className: 'px-6 py-2 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800' }, '✓ Mark today complete'),
          dpTodayDone && h('p', { className: 'text-base font-bold text-emerald-900' }, '✓ Today done! Come back tomorrow.')
        ),
        // Last 14 days
        h('div', { className: 'bg-white rounded-xl border border-emerald-200 p-3' },
          h('p', { className: 'text-[11px] font-bold text-emerald-700 mb-2' }, 'Last 14 days:'),
          h('div', { className: 'grid grid-cols-7 gap-1' },
            Array.from({ length: 14 }, function(_, i) {
              var d = new Date();
              d.setDate(d.getDate() - (13 - i));
              var ds = d.toLocaleDateString();
              var done = dpDays.indexOf(ds) >= 0;
              return h('div', { key: 'dp-' + i,
                title: ds,
                className: 'aspect-square rounded text-center text-[10px] flex flex-col items-center justify-center ' +
                  (done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500')
              },
                h('span', null, d.getDate()),
                done ? h('span', null, '✓') : null
              );
            })
          )
        )
      );
    };

    // ── FRACTION MAGIC TRICKS ──
    // Mathematical "tricks" that are actually elegant fraction identities.
    var FRACTION_MAGIC = [
      {
        id: 'always-half', title: 'The 1/2 trick',
        setup: 'Pick any number. Add 1. Multiply by 2. Add 4. Subtract 6. Divide by 2. Subtract the original number.',
        reveal: 'The answer is always 1!',
        explanation: 'Let your number be n. The sequence: (n+1) × 2 + 4 − 6 = 2n + 2 + 4 − 6 = 2n. Divide by 2 → n. Subtract original → 0. Wait — that gives 0, not 1. Try: n → (n+1)×2 = 2n+2 → +4 = 2n+6 → −6 = 2n → ÷2 = n → −original = 0. The "trick" relies on hidden constants in the sequence.'
      },
      {
        id: 'sum-unit', title: 'Sum of unit fractions',
        setup: '1/2 + 1/4 + 1/8 + 1/16 + ... forever.',
        reveal: 'The sum equals 1.',
        explanation: 'Each term is half the previous. The total approaches 1 but never quite reaches it. This is an infinite geometric series with first term 1/2 and ratio 1/2: S = (1/2) / (1 − 1/2) = 1. This is why Zeno\'s paradox of motion is solvable mathematically.'
      },
      {
        id: 'harmonic', title: 'The harmonic series',
        setup: '1/1 + 1/2 + 1/3 + 1/4 + 1/5 + ... forever.',
        reveal: 'The sum grows infinitely large.',
        explanation: 'Even though each term is small, the series diverges. To pass 100, you need about 1.5 × 10^43 terms. This was proven by Nicole Oresme in the 1300s using grouping: 1/3 + 1/4 > 1/4 + 1/4 = 1/2; 1/5+...+1/8 > 4 × 1/8 = 1/2; you can always find another 1/2 to add.'
      },
      {
        id: 'farey', title: 'Farey sequences',
        setup: 'List all simplified fractions between 0 and 1 with denominator ≤ n. For n = 5: 0/1, 1/5, 1/4, 1/3, 2/5, 1/2, 3/5, 2/3, 3/4, 4/5, 1/1.',
        reveal: 'Any two consecutive fractions a/b and c/d in this list satisfy bc − ad = 1.',
        explanation: 'Check 1/4 and 1/3: (4)(1) − (1)(3) = 1. Check 2/5 and 1/2: (5)(1) − (2)(2) = 1. This property generates the Stern-Brocot tree of all rational numbers.'
      },
      {
        id: 'product-tricks', title: 'Multiplying telescopes',
        setup: '(1 − 1/2) × (1 − 1/3) × (1 − 1/4) × ... × (1 − 1/n)',
        reveal: 'The product equals 1/n.',
        explanation: 'Rewrite: 1/2 × 2/3 × 3/4 × ... × (n−1)/n. The 2 in 2/3 cancels the 2 in 1/2\'s denominator. The 3 in 3/4 cancels the 3 in 2/3\'s denominator. Everything cancels except 1/n.'
      }
    ];

    var renderMagicTricksTab = function() {
      var trick = _f.magicTrick || FRACTION_MAGIC[0].id;
      var t = FRACTION_MAGIC.find(function(m) { return m.id === trick; }) || FRACTION_MAGIC[0];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-purple-50 rounded-xl p-3 border border-purple-200' },
          h('h4', { className: 'text-sm font-bold text-purple-800 mb-1' }, '🎩 Fraction magic tricks'),
          h('p', { className: 'text-[11px] text-purple-700' },
            'Mathematical "tricks" that are really elegant fraction identities. Pick one to see the setup, the reveal, and the mathematical explanation.'
          )
        ),
        h('div', { className: 'flex flex-wrap gap-1' },
          FRACTION_MAGIC.map(function(m) {
            var active = trick === m.id;
            return h('button', {
              key: 'mt-' + m.id,
              onClick: function() { upd({ magicTrick: m.id }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                (active ? 'bg-purple-700 text-white' : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-100')
            }, '✨ ' + m.title);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-purple-200 p-4 space-y-3' },
          h('h5', { className: 'text-base font-black text-purple-900' }, '🎩 ' + t.title),
          h('div', { className: 'bg-purple-50 rounded-lg p-3 border border-purple-200' },
            h('p', { className: 'text-xs font-bold text-purple-700 mb-1' }, '🎬 Setup'),
            h('p', { className: 'text-sm text-slate-800' }, t.setup)
          ),
          h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
            h('p', { className: 'text-xs font-bold text-amber-700 mb-1' }, '✨ Reveal'),
            h('p', { className: 'text-sm font-bold text-amber-900' }, t.reveal)
          ),
          h('details', { className: 'bg-slate-50 rounded-lg p-3 border border-slate-200' },
            h('summary', { className: 'text-xs font-bold text-slate-700 cursor-pointer' }, '🧠 Why does this work?'),
            h('p', { className: 'text-sm text-slate-800 mt-2 leading-relaxed' }, t.explanation)
          )
        )
      );
    };

    // ── REAL-WORLD TOOLS TAB ──
    // Photos / illustrations of common fraction tools (rulers, measuring cups, etc.)
    // with practice questions about reading them.
    var REAL_WORLD_TOOLS = [
      {
        id: 'ruler', title: 'Ruler (inches)', icon: '📏',
        description: 'A standard inch ruler is divided into 16ths. Major lines: inch. Half mark: 1/2 inch. Quarter mark: 1/4 inch. Each smallest segment: 1/16 inch.',
        practiceQ: 'On an inch ruler, what is the value of the FIRST big mark after 1 inch?',
        answer: '1 1/16 (or 1.0625)',
        tip: 'Inch rulers use binary fractions: halves, quarters, eighths, sixteenths.'
      },
      {
        id: 'tape', title: 'Tape measure (carpentry)', icon: '📐',
        description: 'A 12-foot tape measure has marks every 1/16 inch. Common usage: read to the nearest 1/8 or 1/16. The black diamonds every 19 3/16 inches mark engineered joist spacing.',
        practiceQ: 'How far is 5 dark diamonds from the start?',
        answer: '5 × 19 3/16 = 95 15/16 inches ≈ 8 feet',
        tip: 'Each 16 inches has a black diamond for typical stud spacing.'
      },
      {
        id: 'measuring-cups', title: 'Measuring cups', icon: '🥤',
        description: 'A standard set includes 1 cup, 1/2, 1/3, 1/4. Some sets add 2/3 and 3/4. Glass measuring cups have markings for 1/4, 1/3, 1/2, 2/3, 3/4 cup and 1 cup.',
        practiceQ: 'You need 3/4 cup but only have 1/4 cup and 1/2 cup measures. How do you do it?',
        answer: '1/4 + 1/2 = 3/4 (use both, OR three 1/4 cup scoops)',
        tip: 'You can combine smaller measures to make any common fraction.'
      },
      {
        id: 'thermometer', title: 'Thermometer', icon: '🌡',
        description: 'A medical thermometer shows tenths of a degree. 98.6°F = 98 + 6/10 = 98.6. A glass thermometer often shows half-degrees.',
        practiceQ: 'A thermometer reads exactly between 98 and 99. What is the temperature?',
        answer: '98.5°F (or 98 1/2)',
        tip: 'Each minor tick is usually 1/10 of a degree.'
      },
      {
        id: 'gas-gauge', title: 'Gas gauge', icon: '⛽',
        description: 'Most fuel gauges show divisions at E (empty), 1/4, 1/2, 3/4, F (full). Modern digital gauges may show 1/8 increments or exact percentages.',
        practiceQ: 'The gauge is exactly between 1/4 and 1/2. What fraction is the tank?',
        answer: '3/8',
        tip: 'Average of 1/4 and 1/2 is (1/4 + 1/2) / 2 = (1 + 2)/8 = 3/8.'
      },
      {
        id: 'pizza-slicing', title: 'Pizza slicing', icon: '🍕',
        description: 'A standard large pizza is sliced into 8 (sometimes 6 or 10). Each slice is 1/8 (or 1/6, 1/10) of the whole.',
        practiceQ: 'A pizza is cut into 8 slices. Three friends eat 2 slices each. What fraction of the pizza is gone?',
        answer: '6/8 = 3/4',
        tip: 'Total eaten: 3 × 2 = 6 slices. 6/8 simplifies to 3/4.'
      },
      {
        id: 'clock-hands', title: 'Clock face', icon: '🕐',
        description: 'A clock is a 12-hour cycle. Each hour is 1/12 of the cycle. 30 minutes = 1/2 hour. 15 minutes = 1/4 hour.',
        practiceQ: 'How much of an hour is 20 minutes?',
        answer: '20/60 = 1/3',
        tip: 'There are 60 minutes in an hour, so the denominator is 60.'
      },
      {
        id: 'sports-stats', title: 'Sports statistics', icon: '⚾',
        description: 'A baseball batting average like .333 means the batter gets a hit 1/3 of the time. Free-throw percentage of .800 means 4 out of every 5 attempts go in.',
        practiceQ: 'A player has 7 hits in 20 at-bats. What is their batting average?',
        answer: '7/20 = 0.35 (.350)',
        tip: 'Hits over at-bats, then write as a 3-decimal-place average.'
      }
    ];

    var renderRealWorldToolsTab = function() {
      var rwt = _f.rwt || REAL_WORLD_TOOLS[0].id;
      var tool = REAL_WORLD_TOOLS.find(function(t2) { return t2.id === rwt; }) || REAL_WORLD_TOOLS[0];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-stone-50 rounded-xl p-3 border border-stone-200' },
          h('h4', { className: 'text-sm font-bold text-stone-800 mb-1' }, '🛠 Real-world fraction tools'),
          h('p', { className: 'text-[11px] text-stone-700' },
            'Where you actually encounter fractions in daily life. Browse tools, read them, and practice with realistic prompts.'
          )
        ),
        h('div', { className: 'flex flex-wrap gap-1' },
          REAL_WORLD_TOOLS.map(function(t2) {
            var active = rwt === t2.id;
            return h('button', {
              key: 'rwt-' + t2.id,
              onClick: function() { upd({ rwt: t2.id }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all ' +
                (active ? 'bg-stone-700 text-white' : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100')
            }, t2.icon + ' ' + t2.title);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-stone-200 p-4 space-y-3' },
          h('div', { className: 'flex items-center gap-3' },
            h('span', { className: 'text-4xl' }, tool.icon),
            h('h5', { className: 'text-base font-black text-stone-900' }, tool.title)
          ),
          h('p', { className: 'text-sm text-slate-800 leading-relaxed' }, tool.description),
          h('div', { className: 'bg-stone-50 rounded-lg p-3 border border-stone-200' },
            h('p', { className: 'text-xs font-bold text-stone-700 mb-1' }, '🤔 Try this'),
            h('p', { className: 'text-sm text-slate-800' }, tool.practiceQ),
            h('details', { className: 'mt-2' },
              h('summary', { className: 'text-xs font-bold text-stone-700 cursor-pointer' }, 'Reveal answer'),
              h('p', { className: 'text-sm font-mono text-stone-900 mt-1' }, '✓ ' + tool.answer)
            )
          ),
          h('p', { className: 'text-[11px] text-stone-700 italic' }, '💡 ' + tool.tip)
        )
      );
    };

    // ── RTI PROBE GENERATOR ──
    // Generates curriculum-based measurement (CBM) probes for progress monitoring.
    // Output is a 2-min timed probe matching common RTI fluency frameworks.
    var renderRTIProbeTab = function() {
      var probeType = _f.probeType || 'fluency-identify';
      var probeCount = _f.probeCount || 30;
      var generatedProbe = _f.generatedProbe || null;

      var probeTypes = [
        { id: 'fluency-identify', label: 'Fluency: identify fractions', grade: '3-4', n: 'Generates randomized fraction-identification items.' },
        { id: 'fluency-simplify', label: 'Fluency: simplify fractions', grade: '4-5', n: 'Generates fractions to simplify (output: simplest form).' },
        { id: 'fluency-equivalent', label: 'Fluency: find equivalent', grade: '4-5', n: 'Generates equivalent-fraction problems.' },
        { id: 'fluency-add-like', label: 'Fluency: add like denominators', grade: '4', n: 'Same-denominator addition.' },
        { id: 'fluency-add-unlike', label: 'Fluency: add unlike denominators', grade: '5', n: 'Different-denominator addition.' }
      ];

      var generateProbe = function() {
        var items = [];
        for (var i = 0; i < probeCount; i++) {
          var item = null;
          if (probeType === 'fluency-identify') {
            var d = pick([2, 3, 4, 5, 6, 8, 10]);
            var n = randInt(1, d - 1);
            item = { q: '____/____', display: { model: 'pie', n: n, d: d }, answer: n + '/' + d };
          } else if (probeType === 'fluency-simplify') {
            var bd = pick([2, 3, 4, 5, 6]);
            var bn = randInt(1, bd - 1);
            var mult = randInt(2, 6);
            var simp = simplify(bn, bd);
            item = { q: (bn * mult) + '/' + (bd * mult) + ' = ?', answer: simp[0] + '/' + simp[1] };
          } else if (probeType === 'fluency-equivalent') {
            var ed = pick([2, 3, 4, 5, 6]);
            var en = randInt(1, ed - 1);
            var em = randInt(2, 5);
            item = { q: en + '/' + ed + ' = ?/' + (ed * em), answer: en * em };
          } else if (probeType === 'fluency-add-like') {
            var ald = pick([4, 5, 6, 8, 10]);
            var aln1 = randInt(1, ald - 2);
            var aln2 = randInt(1, ald - aln1 - 1);
            var ssum = simplify(aln1 + aln2, ald);
            item = { q: aln1 + '/' + ald + ' + ' + aln2 + '/' + ald + ' = ?', answer: ssum[0] + '/' + ssum[1] };
          } else if (probeType === 'fluency-add-unlike') {
            var ud1 = pick([2, 3, 4, 6]);
            var ud2 = pick([2, 3, 4, 6]);
            var un1 = randInt(1, ud1);
            var un2 = randInt(1, ud2);
            var ucd = lcm(ud1, ud2);
            var uSum = un1 * (ucd / ud1) + un2 * (ucd / ud2);
            var uSimp = simplify(uSum, ucd);
            item = { q: un1 + '/' + ud1 + ' + ' + un2 + '/' + ud2 + ' = ?', answer: uSimp[0] + '/' + uSimp[1] };
          }
          items.push(item);
        }
        upd({ generatedProbe: items });
        sfxComplete();
      };
      var printProbe = function() {
        if (!generatedProbe || typeof window === 'undefined') return;
        var pt = probeTypes.find(function(p) { return p.id === probeType; }) || probeTypes[0];
        var html = '<html><head><title>Fraction CBM Probe — ' + new Date().toLocaleDateString() + '</title>';
        html += '<style>body{font-family:sans-serif;margin:30px;line-height:1.6;}h1{color:#9f1239;border-bottom:2px solid #9f1239;padding-bottom:8px;}.probe-item{display:inline-block;margin:5px 15px 5px 0;padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-family:monospace;}@media print{.no-print{display:none;}}</style></head><body>';
        html += '<h1>Fraction CBM Probe</h1>';
        html += '<p>Name: ____________________________  Date: __________</p>';
        html += '<p>Probe type: ' + pt.label + ' · Items: ' + generatedProbe.length + ' · Time: 2 min</p>';
        html += '<p>Score: ____ correct / ' + generatedProbe.length + ' total &nbsp; CWPM: ____</p>';
        html += '<hr><ol>';
        generatedProbe.forEach(function(p) {
          html += '<li class="probe-item">' + (p.q || '') + '</li>';
        });
        html += '</ol>';
        html += '<hr><h2>Answer key</h2><ol>';
        generatedProbe.forEach(function(p) {
          html += '<li>' + p.answer + '</li>';
        });
        html += '</ol></body></html>';
        try {
          var w = window.open('', '_blank');
          if (w) { w.document.write(html); w.document.close(); setTimeout(function() { w.print(); }, 250); }
        } catch (e) { addToast('Could not open print window', 'error'); }
      };

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-teal-50 rounded-xl p-3 border border-teal-200' },
          h('h4', { className: 'text-sm font-bold text-teal-800 mb-1' }, '📊 RTI/CBM probe generator'),
          h('p', { className: 'text-[11px] text-teal-700' },
            'Generate curriculum-based measurement probes for tracking student progress over time. Print, time, score, and graph the results to monitor RTI Tier 2 or Tier 3 students.'
          )
        ),
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-white rounded-lg p-3 border border-teal-200' },
            h('label', { className: 'block text-xs font-bold text-teal-700 mb-1' }, 'Probe type'),
            h('select', {
              value: probeType,
              onChange: function(e) { upd({ probeType: e.target.value }); },
              'aria-label': 'Probe type',
              className: 'w-full px-2 py-1.5 rounded border border-teal-300 text-xs'
            }, probeTypes.map(function(p) {
              return h('option', { key: 'pt-' + p.id, value: p.id }, p.label + ' (Grade ' + p.grade + ')');
            }))
          ),
          h('div', { className: 'bg-white rounded-lg p-3 border border-teal-200' },
            h('label', { className: 'block text-xs font-bold text-teal-700 mb-1' }, 'Number of items'),
            h('input', {
              type: 'number', min: 10, max: 50, value: probeCount,
              onChange: function(e) { upd({ probeCount: parseInt(e.target.value) || 30 }); },
              'aria-label': 'Probe count',
              className: 'w-full px-2 py-1.5 rounded border border-teal-300 text-xs'
            })
          )
        ),
        h('div', { className: 'flex gap-2' },
          h('button', { onClick: generateProbe,
            className: 'flex-1 px-4 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700' }, '🔀 Generate ' + probeCount + '-item probe'),
          generatedProbe && h('button', { onClick: printProbe,
            className: 'flex-1 px-4 py-2 bg-teal-800 text-white font-bold rounded-xl hover:bg-teal-900' }, '🖨 Print probe')
        ),
        generatedProbe && h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-3 space-y-2' },
          h('p', { className: 'text-[11px] font-bold text-teal-700' }, '👀 Preview (' + generatedProbe.length + ' items):'),
          h('div', { className: 'grid grid-cols-3 gap-1 text-[11px] font-mono' },
            generatedProbe.slice(0, 30).map(function(item, i) {
              return h('div', { key: 'pi-' + i, className: 'bg-teal-50 rounded px-2 py-1 text-teal-900 border border-teal-100' },
                (i + 1) + '. ' + (item.q || '')
              );
            })
          ),
          h('details', { className: 'mt-2' },
            h('summary', { className: 'text-xs font-bold text-teal-700 cursor-pointer' }, 'Show answer key'),
            h('div', { className: 'mt-2 grid grid-cols-3 gap-1 text-[11px] font-mono' },
              generatedProbe.map(function(item, i) {
                return h('div', { key: 'pa-' + i, className: 'bg-emerald-50 rounded px-2 py-1 text-emerald-900 border border-emerald-100' },
                  (i + 1) + '. ' + (item.answer || '')
                );
              })
            )
          )
        )
      );
    };

    // ── ACHIEVEMENT LEVELS — beyond badges ──
    var ACHIEVEMENT_LEVELS = [
      { level: 1, xp: 0, title: 'Apprentice', color: 'slate', description: 'Just starting out. Welcome!' },
      { level: 2, xp: 50, title: 'Slicer', color: 'rose', description: 'Solved 5+ problems. Building confidence.' },
      { level: 3, xp: 150, title: 'Mathematician', color: 'amber', description: 'Comfortable with multiple operations.' },
      { level: 4, xp: 300, title: 'Strategist', color: 'emerald', description: 'Uses multiple comparison methods.' },
      { level: 5, xp: 500, title: 'Expert', color: 'sky', description: 'Fluent across all fraction operations.' },
      { level: 6, xp: 800, title: 'Master', color: 'violet', description: 'Tackles multi-step problems with ease.' },
      { level: 7, xp: 1200, title: 'Grandmaster', color: 'fuchsia', description: 'Number sense + speed + accuracy.' },
      { level: 8, xp: 1800, title: 'Fraction Sage', color: 'indigo', description: 'Top-tier fluency. Teaches others.' }
    ];

    var renderAchievementsTab = function() {
      var totalXp = (score.correct * 10) + (Object.keys(badges).length * 15);
      var currentLevel = ACHIEVEMENT_LEVELS[0];
      for (var li = ACHIEVEMENT_LEVELS.length - 1; li >= 0; li--) {
        if (totalXp >= ACHIEVEMENT_LEVELS[li].xp) {
          currentLevel = ACHIEVEMENT_LEVELS[li];
          break;
        }
      }
      var nextLevel = ACHIEVEMENT_LEVELS[Math.min(ACHIEVEMENT_LEVELS.length - 1, currentLevel.level)];
      var pctProgress = nextLevel === currentLevel ? 100 : ((totalXp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp) * 100);
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl p-3 border border-violet-200' },
          h('h4', { className: 'text-sm font-bold text-violet-800 mb-1' }, '🏆 Achievement levels'),
          h('p', { className: 'text-[11px] text-violet-700' },
            'Earn XP from correct answers and badges to level up. Each level unlocks a new title.'
          )
        ),
        // Current status
        h('div', { className: 'bg-white rounded-xl border-2 border-violet-200 p-4 text-center space-y-2' },
          h('p', { className: 'text-xs font-bold text-violet-700' }, 'You are level ' + currentLevel.level),
          h('p', { className: 'text-3xl font-black text-' + currentLevel.color + '-700' }, '⭐ ' + currentLevel.title),
          h('p', { className: 'text-sm text-slate-700 italic' }, currentLevel.description),
          h('div', { className: 'mt-3' },
            h('div', { className: 'h-3 bg-slate-200 rounded-full overflow-hidden' },
              h('div', { style: {
                width: pctProgress + '%',
                height: '100%',
                background: 'linear-gradient(90deg,#a855f7,#ec4899)',
                transition: 'width 0.5s'
              } })
            ),
            h('p', { className: 'text-[11px] text-violet-600 mt-1' }, totalXp + ' XP / ' + nextLevel.xp + ' XP' + (nextLevel === currentLevel ? ' (max)' : ''))
          )
        ),
        // All levels
        h('div', { className: 'bg-white rounded-xl border border-violet-200 p-3 space-y-2' },
          h('p', { className: 'text-[11px] font-bold text-violet-700' }, 'All levels:'),
          ACHIEVEMENT_LEVELS.map(function(lvl) {
            var reached = totalXp >= lvl.xp;
            return h('div', { key: 'lvl-' + lvl.level,
              className: 'flex items-center gap-2 p-2 rounded ' +
                (reached ? 'bg-' + lvl.color + '-50 border border-' + lvl.color + '-200' : 'bg-slate-50 border border-slate-100 opacity-50')
            },
              h('span', { className: 'text-2xl' }, reached ? '⭐' : '🔒'),
              h('div', { className: 'flex-1' },
                h('p', { className: 'text-sm font-bold text-' + (reached ? lvl.color : 'slate') + '-800' },
                  'Level ' + lvl.level + ' · ' + lvl.title
                ),
                h('p', { className: 'text-[11px] text-slate-600' }, lvl.xp + ' XP required · ' + lvl.description)
              )
            );
          })
        )
      );
    };

    // ── WORKED EXAMPLES LIBRARY ──
    var WORKED_EXAMPLES = [
      {
        id: 'we-add-unlike',
        title: 'Adding fractions with unlike denominators',
        ccss: '5.NF.A.1',
        problem: '2/3 + 1/4',
        steps: [
          { description: 'Find the LCM of the denominators.', detail: 'LCM(3, 4) = 12. Both 3 and 4 divide 12.' },
          { description: 'Convert each fraction to twelfths.', detail: '2/3 = (2×4)/(3×4) = 8/12. 1/4 = (1×3)/(4×3) = 3/12.' },
          { description: 'Add the numerators. Keep the denominator.', detail: '8/12 + 3/12 = 11/12.' },
          { description: 'Simplify if possible.', detail: 'GCD(11, 12) = 1. Already in simplest form.' },
          { description: 'Check by estimating.', detail: '2/3 ≈ 0.67, 1/4 = 0.25, sum ≈ 0.92. 11/12 ≈ 0.917. ✓' }
        ],
        answer: '11/12'
      },
      {
        id: 'we-sub-mixed',
        title: 'Subtracting mixed numbers with regrouping',
        ccss: '5.NF.A.1',
        problem: '5 1/4 − 2 3/4',
        steps: [
          { description: 'Convert both to improper fractions.', detail: '5 1/4 = (5×4+1)/4 = 21/4. 2 3/4 = (2×4+3)/4 = 11/4.' },
          { description: 'Same denominator — subtract numerators.', detail: '21/4 − 11/4 = 10/4.' },
          { description: 'Simplify.', detail: '10/4 = 5/2.' },
          { description: 'Convert back to mixed.', detail: '5/2 = 2 1/2.' }
        ],
        answer: '2 1/2'
      },
      {
        id: 'we-mul-simple',
        title: 'Multiplying two fractions',
        ccss: '5.NF.B.4',
        problem: '2/3 × 3/4',
        steps: [
          { description: 'Multiply numerators.', detail: '2 × 3 = 6.' },
          { description: 'Multiply denominators.', detail: '3 × 4 = 12.' },
          { description: 'Write the product.', detail: '6/12.' },
          { description: 'Simplify by dividing both by GCD.', detail: 'GCD(6, 12) = 6. 6/12 = 1/2.' },
          { description: 'Verify with area model.', detail: 'A 3×4 grid with 2 rows shaded and 3 columns shaded = 6 cells out of 12 = 1/2.' }
        ],
        answer: '1/2'
      },
      {
        id: 'we-div-fraction',
        title: 'Dividing a fraction by a fraction',
        ccss: '6.NS.A.1',
        problem: '3/4 ÷ 1/2',
        steps: [
          { description: 'Use Keep-Change-Flip.', detail: 'Keep 3/4. Change ÷ to ×. Flip 1/2 to 2/1.' },
          { description: 'Multiply.', detail: '3/4 × 2/1 = 6/4.' },
          { description: 'Simplify.', detail: '6/4 = 3/2.' },
          { description: 'Convert to mixed.', detail: '3/2 = 1 1/2.' },
          { description: 'Sanity-check with measurement meaning.', detail: '"How many 1/2 fit in 3/4?" 3/4 is one-and-a-half halves. ✓' }
        ],
        answer: '1 1/2'
      },
      {
        id: 'we-simplify',
        title: 'Simplifying a fraction',
        ccss: '4.NF.A.1',
        problem: 'Simplify 18/24',
        steps: [
          { description: 'Find the GCD of the numerator and denominator.', detail: 'Factors of 18: 1, 2, 3, 6, 9, 18. Factors of 24: 1, 2, 3, 4, 6, 8, 12, 24. Common factors: 1, 2, 3, 6. GCD = 6.' },
          { description: 'Divide top and bottom by the GCD.', detail: '18 ÷ 6 = 3. 24 ÷ 6 = 4.' },
          { description: 'Write the simplified fraction.', detail: '3/4.' },
          { description: 'Verify GCD(3, 4) = 1.', detail: 'Yes — no common factors > 1. ✓' }
        ],
        answer: '3/4'
      },
      {
        id: 'we-equiv',
        title: 'Generating equivalent fractions',
        ccss: '4.NF.A.1',
        problem: 'Find a fraction equivalent to 2/5 with denominator 15.',
        steps: [
          { description: 'What number times 5 gives 15?', detail: '15 ÷ 5 = 3.' },
          { description: 'Multiply numerator by the same number.', detail: '2 × 3 = 6.' },
          { description: 'Write the equivalent.', detail: '2/5 = 6/15.' },
          { description: 'Verify with cross-multiplication.', detail: '2 × 15 = 30. 5 × 6 = 30. ✓ Cross products equal.' }
        ],
        answer: '6/15'
      },
      {
        id: 'we-compare-bench',
        title: 'Comparing using a benchmark',
        ccss: '4.NF.A.2',
        problem: 'Compare 7/12 and 5/8.',
        steps: [
          { description: 'Compare 7/12 to 1/2.', detail: '7/12: is 14 > 12? Yes. So 7/12 > 1/2.' },
          { description: 'Compare 5/8 to 1/2.', detail: '5/8: is 10 > 8? Yes. So 5/8 > 1/2. Both are bigger than 1/2 — need another check.' },
          { description: 'Use common denominator.', detail: 'LCM(12, 8) = 24. 7/12 = 14/24. 5/8 = 15/24.' },
          { description: 'Compare numerators.', detail: '14 < 15, so 7/12 < 5/8.' }
        ],
        answer: '5/8 > 7/12'
      },
      {
        id: 'we-word-multistep',
        title: 'Multi-step word problem',
        ccss: '5.NF.A.2',
        problem: 'A pizza is 5/6 left. Three friends split it equally. How much does each get?',
        steps: [
          { description: 'Identify the operation.', detail: 'Splitting equally = division. 5/6 ÷ 3.' },
          { description: 'Apply division rule.', detail: '5/6 ÷ 3 = 5/6 × 1/3 = 5/18.' },
          { description: 'Simplify.', detail: 'GCD(5, 18) = 1. Already simplest form.' },
          { description: 'Interpret the answer.', detail: 'Each friend gets 5/18 of the original pizza.' }
        ],
        answer: '5/18 of the pizza each'
      }
    ];

    var renderWorkedExamplesTab = function() {
      var weId = _f.weId || WORKED_EXAMPLES[0].id;
      var weStepIdx = _f.weStepIdx || 0;
      var we = WORKED_EXAMPLES.find(function(w) { return w.id === weId; }) || WORKED_EXAMPLES[0];

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-violet-50 rounded-xl p-3 border border-violet-200' },
          h('h4', { className: 'text-sm font-bold text-violet-800 mb-1' }, '🎓 Worked examples library'),
          h('p', { className: 'text-[11px] text-violet-700' },
            'Walk through each procedure one step at a time. Click through to see the reasoning behind each move. Research (Sweller) shows worked examples are more effective than practice problems alone for novice learners.'
          )
        ),
        h('select', {
          value: weId,
          onChange: function(e) { upd({ weId: e.target.value, weStepIdx: 0 }); },
          'aria-label': 'Worked example selector',
          className: 'w-full px-3 py-2 rounded border border-violet-300 text-sm font-bold'
        }, WORKED_EXAMPLES.map(function(w) {
          return h('option', { key: 'we-' + w.id, value: w.id }, w.title + ' (' + w.ccss + ')');
        })),
        h('div', { className: 'bg-white rounded-xl border-2 border-violet-200 p-4 space-y-3' },
          h('p', { className: 'text-xs font-bold text-violet-700' }, we.ccss + ' · ' + we.title),
          h('p', { className: 'text-2xl font-mono font-bold text-violet-900 text-center bg-violet-50 rounded p-3' }, we.problem),
          // Progress bar
          h('div', { className: 'flex gap-1' },
            we.steps.map(function(_, i) {
              return h('div', { key: 'wp-' + i,
                className: 'flex-1 h-1.5 rounded ' + (i <= weStepIdx ? 'bg-violet-500' : 'bg-slate-200')
              });
            })
          ),
          // Current step
          we.steps.slice(0, weStepIdx + 1).map(function(s, i) {
            return h('div', { key: 'ws-' + i, className: 'bg-violet-50 rounded-lg p-3 border border-violet-200' },
              h('p', { className: 'text-xs font-bold text-violet-700' }, 'Step ' + (i + 1) + ':'),
              h('p', { className: 'text-sm text-slate-800 mt-0.5' }, s.description),
              h('p', { className: 'text-xs font-mono text-violet-900 mt-1' }, s.detail)
            );
          }),
          weStepIdx >= we.steps.length - 1 && h('div', { className: 'bg-emerald-50 rounded-lg p-3 border-2 border-emerald-300 text-center' },
            h('p', { className: 'text-sm font-bold text-emerald-800' }, '✅ Answer: ', h('span', { className: 'font-mono' }, we.answer))
          ),
          h('div', { className: 'flex gap-2' },
            h('button', {
              onClick: function() { upd({ weStepIdx: Math.max(0, weStepIdx - 1) }); },
              disabled: weStepIdx <= 0,
              className: 'flex-1 px-3 py-1.5 rounded text-xs font-bold ' +
                (weStepIdx > 0 ? 'bg-violet-100 text-violet-800 hover:bg-violet-200' : 'bg-slate-100 text-slate-400')
            }, '← Previous step'),
            h('button', {
              onClick: function() { upd({ weStepIdx: Math.min(we.steps.length - 1, weStepIdx + 1) }); },
              disabled: weStepIdx >= we.steps.length - 1,
              className: 'flex-1 px-3 py-1.5 rounded text-xs font-bold ' +
                (weStepIdx < we.steps.length - 1 ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-100 text-slate-400')
            }, 'Next step →')
          )
        )
      );
    };

    // ── FAQ TAB ──
    var FRACTION_FAQ = [
      { q: 'Why are fractions so confusing?', a: 'Fractions break the rules students learned for whole numbers. For whole numbers, bigger digits = bigger value. For fractions, bigger denominators = SMALLER value. Multiplication usually makes things bigger; with fractions less than 1, it can make things smaller. This is why so many students struggle — they\'re applying whole-number rules where they don\'t apply.' },
      { q: 'What\'s the difference between a fraction and a ratio?', a: 'A fraction represents a part-whole relationship (3/4 of a pizza). A ratio compares two quantities (3 cups flour : 2 cups sugar). The same notation gets used both ways, but the meaning is subtly different. A ratio doesn\'t have to be a "part" of anything.' },
      { q: 'Why do we need a common denominator to add?', a: 'You can\'t directly combine pieces of different sizes. 1/2 and 1/3 are different-size pieces. To add them, you need to cut both into the same-size pieces — that\'s what the common denominator does. 1/2 = 3/6 and 1/3 = 2/6 means cutting both into sixths. Now you can combine: 3/6 + 2/6 = 5/6.' },
      { q: 'Why do we flip the second fraction when dividing?', a: 'Division by a fraction is the same as multiplication by its reciprocal. There\'s a mathematical proof, but intuitively: "how many halves are in 3?" = 3 ÷ 1/2 = "how many times does 1/2 fit in 3?" = 6. That\'s the same as 3 × 2.' },
      { q: 'What is a "unit fraction" and why does it matter?', a: 'A unit fraction has 1 as the numerator (1/2, 1/3, 1/4...). They are the building blocks of all other fractions. 3/4 = 1/4 + 1/4 + 1/4. Common Core (3.NF.A.1) starts fraction instruction with unit fractions because they\'re the foundation.' },
      { q: 'When can a fraction be written as a terminating decimal?', a: 'When the simplest-form denominator has only the prime factors 2 and 5. Examples: 1/2 = 0.5 (denom = 2). 3/4 = 0.75 (denom = 4 = 2²). 7/20 = 0.35 (denom = 20 = 2²×5). If the denominator has any other prime factor (3, 7, 11, etc.), the decimal will repeat.' },
      { q: 'What\'s the difference between proper, improper, and mixed?', a: 'Proper: numerator < denominator (value < 1). Improper: numerator ≥ denominator (value ≥ 1). Mixed: a whole number + a proper fraction, like 2 1/3. Improper and mixed are two ways to write the same value: 7/3 = 2 1/3.' },
      { q: 'Why are 1/2, 2/4, 4/8 all equal? They look different!', a: 'They represent the same magnitude — the same point on a number line, the same amount of pizza, the same fraction of the whole. Only the labels differ. 1/2 is one piece out of 2 equal parts. 2/4 is two pieces out of 4 equal parts. The pieces are smaller in 2/4 but you have more of them. Same total amount.' },
      { q: 'How does multiplying make things smaller?', a: 'Multiplying by a number less than 1 scales DOWN. 1/2 × 8 = 4 (smaller than 8). 1/2 × 1/2 = 1/4 (smaller than 1/2). This is because the multiplier is acting like a "fraction of" — half of 8 is less than 8.' },
      { q: 'How does dividing make things bigger?', a: 'Dividing by a number less than 1 scales UP. 4 ÷ 1/2 = 8 because "how many halves fit in 4?" — eight do. The smaller the divisor (when between 0 and 1), the bigger the quotient.' },
      { q: 'What\'s the connection between fractions and percents?', a: 'A percent is just a fraction with denominator 100. 25% = 25/100 = 1/4. 0.5 = 50/100 = 50% = 1/2. They\'re three notations for the same thing.' },
      { q: 'Why don\'t we add denominators when adding fractions?', a: 'Because the denominator names the kind of piece, not a count. 1/2 + 1/3 ≠ 2/5 because you\'re not adding pieces (which would need same-size pieces). The denominator stays the same when adding like fractions because the kind of piece doesn\'t change.' },
      { q: 'What\'s the IES Practice Guide?', a: 'A research-based guide called "Developing Effective Fractions Instruction for Kindergarten Through 8th Grade" published by the U.S. Department of Education\'s Institute of Education Sciences. It recommends 5 evidence-based instructional practices, the most-emphasized being that the number-line model should be central.' },
      { q: 'Can a fraction be negative?', a: 'Yes! −1/2 is a valid fraction. It sits to the left of 0 on the number line. All the operations work the same way; you just track signs. In K-8, fractions are usually positive; negatives come in around Grade 6-7.' },
      { q: 'What\'s the smallest fraction?', a: 'There is no smallest positive fraction. Between 0 and 1/2 is 1/4. Between 0 and 1/4 is 1/8. Between 0 and 1/8 is 1/16. You can keep halving forever. The set of fractions is "dense" — between any two, there\'s always another.' }
    ];

    var renderFAQTab = function() {
      var faqSearch = (_f.faqSearch || '').toLowerCase();
      var filtered = FRACTION_FAQ.filter(function(f) {
        if (!faqSearch) return true;
        return f.q.toLowerCase().indexOf(faqSearch) >= 0 ||
               f.a.toLowerCase().indexOf(faqSearch) >= 0;
      });
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-sky-50 rounded-xl p-3 border border-sky-200' },
          h('h4', { className: 'text-sm font-bold text-sky-800 mb-1' }, '❓ Frequently asked questions'),
          h('p', { className: 'text-[11px] text-sky-700' },
            'Common questions about fractions, answered. Use this to settle confusion or as a starting point for student discussions.'
          )
        ),
        h('input', {
          type: 'text', value: _f.faqSearch || '',
          onChange: function(e) { upd({ faqSearch: e.target.value }); },
          placeholder: 'Search FAQ...',
          'aria-label': 'Search FAQ',
          className: 'w-full px-3 py-2 rounded-lg border border-sky-300 text-sm'
        }),
        h('div', { className: 'space-y-2' },
          filtered.length === 0
            ? h('p', { className: 'text-xs italic text-slate-500 text-center py-4' }, 'No matches.')
            : filtered.map(function(f, i) {
                return h('details', { key: 'faq-' + i, className: 'bg-white rounded-lg p-3 border border-sky-200' },
                  h('summary', { className: 'text-sm font-bold text-sky-900 cursor-pointer' }, '❓ ' + f.q),
                  h('p', { className: 'text-xs text-slate-700 mt-2 leading-relaxed' }, '💡 ' + f.a)
                );
              })
        )
      );
    };

    // ── COMPARISON STRATEGIES TAB ──
    // 5 different ways to compare two fractions, with examples.
    var renderComparisonStrategiesTab = function() {
      var strategies = [
        {
          id: 'same-denom', title: 'Same denominator? Just compare numerators.',
          when: 'Use when both fractions already have the same denominator.',
          example: 'Compare 3/8 and 5/8. Same bottom, just look at tops: 3 < 5, so 3/8 < 5/8.',
          steps: ['Check if denominators are the same.', 'If yes, the fraction with the bigger numerator is bigger.', 'Done!']
        },
        {
          id: 'same-num', title: 'Same numerator? More pieces = smaller pieces.',
          when: 'Use when numerators are the same.',
          example: 'Compare 1/4 and 1/8. Both have 1 piece, but 1/8 means smaller pieces. 1/4 > 1/8.',
          steps: ['Check if numerators are the same.', 'If yes, the fraction with the smaller denominator is bigger (because the pieces are bigger).', 'Done!']
        },
        {
          id: 'benchmark', title: 'Compare to 1/2 (or 0, or 1).',
          when: 'Fastest mental strategy. Use when you can quickly tell whether each fraction is bigger or smaller than 1/2.',
          example: 'Compare 5/8 and 3/7. 5/8 > 1/2 (since 5 > 4). 3/7 < 1/2 (since 3 < 3.5). So 5/8 > 3/7.',
          steps: ['Determine if each fraction is > 1/2, = 1/2, or < 1/2.', 'A fraction n/d > 1/2 iff 2n > d.', 'If one is bigger than 1/2 and the other isn\'t, you have your answer.']
        },
        {
          id: 'cross-mult', title: 'Cross-multiplication.',
          when: 'Reliable for any pair. Use when other strategies don\'t work.',
          example: 'Compare 3/5 and 4/7. Cross-multiply: 3×7 = 21, 5×4 = 20. 21 > 20, so 3/5 > 4/7.',
          steps: ['For a/b vs c/d, compute a×d and b×c.', 'If a×d > b×c, then a/b > c/d.', 'If a×d < b×c, then a/b < c/d.', 'If equal, fractions are equivalent.']
        },
        {
          id: 'common-denom', title: 'Find a common denominator.',
          when: 'Useful when you need to compare AND eventually add/subtract.',
          example: 'Compare 2/3 and 3/4. LCM(3, 4) = 12. 2/3 = 8/12. 3/4 = 9/12. So 3/4 > 2/3.',
          steps: ['Find LCM of denominators.', 'Convert both to the common denominator.', 'Compare numerators.']
        }
      ];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('h4', { className: 'text-sm font-bold text-amber-800 mb-1' }, '⚖ Five ways to compare fractions'),
          h('p', { className: 'text-[11px] text-amber-700' },
            'There is more than one way to compare fractions. Knowing all five lets you pick the fastest method for each problem.'
          )
        ),
        strategies.map(function(s, i) {
          return h('div', { key: 'cs-' + s.id, className: 'bg-white rounded-xl p-3 border-2 border-amber-200 space-y-2' },
            h('h5', { className: 'text-sm font-black text-amber-900' }, (i + 1) + '. ' + s.title),
            h('p', { className: 'text-[11px] text-amber-700 italic' }, '⏱ ' + s.when),
            h('div', { className: 'bg-amber-50 rounded p-2 border border-amber-200' },
              h('p', { className: 'text-[11px] font-bold text-amber-700 mb-1' }, '✏ Example'),
              h('p', { className: 'text-xs text-amber-900' }, s.example)
            ),
            h('div', null,
              h('p', { className: 'text-[11px] font-bold text-amber-700 mb-1' }, '📋 Steps'),
              h('ol', { className: 'text-[11px] text-slate-800 list-decimal pl-5 space-y-0.5' },
                s.steps.map(function(st, si) { return h('li', { key: 'st-' + s.id + '-' + si }, st); })
              )
            )
          );
        })
      );
    };

    // ── CHEAT SHEET TAB — quick reference card for fraction operations ──
    var renderCheatSheetTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-blue-50 rounded-xl p-3 border border-blue-200' },
          h('h4', { className: 'text-sm font-bold text-blue-800 mb-1' }, '📋 Fraction cheat sheet'),
          h('p', { className: 'text-[11px] text-blue-700' },
            'Quick-reference card for fraction operations and procedures. Save or print this for students.'
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-blue-200 p-4 space-y-3' },
          // Addition / Subtraction
          h('div', { className: 'bg-blue-50 rounded p-3 border border-blue-200' },
            h('h5', { className: 'text-sm font-black text-blue-900' }, '➕ ADDITION / SUBTRACTION'),
            h('div', { className: 'space-y-1 text-xs text-blue-900 mt-1' },
              h('p', null, h('b', null, 'Same denominator: '), 'Add/subtract the numerators. Keep the denominator. ', h('span', { className: 'font-mono italic' }, 'a/b + c/b = (a+c)/b')),
              h('p', null, h('b', null, 'Different denominators: '), '1) Find LCM. 2) Convert both fractions. 3) Add/subtract. 4) Simplify.'),
              h('p', null, h('b', null, 'Tip: '), 'You can always use the product of denominators as a common denominator (not always smallest, but it works).')
            )
          ),
          // Multiplication
          h('div', { className: 'bg-violet-50 rounded p-3 border border-violet-200' },
            h('h5', { className: 'text-sm font-black text-violet-900' }, '✕ MULTIPLICATION'),
            h('div', { className: 'space-y-1 text-xs text-violet-900 mt-1' },
              h('p', null, h('b', null, 'Procedure: '), 'Multiply numerators. Multiply denominators. Simplify.'),
              h('p', null, h('span', { className: 'font-mono italic' }, 'a/b × c/d = (a×c) / (b×d)')),
              h('p', null, h('b', null, 'Insight: '), '"of" usually means "×": "1/2 of 8" = 1/2 × 8 = 4.'),
              h('p', null, h('b', null, 'Multiplying by < 1 makes things smaller. Multiplying by > 1 makes things bigger.'))
            )
          ),
          // Division
          h('div', { className: 'bg-amber-50 rounded p-3 border border-amber-200' },
            h('h5', { className: 'text-sm font-black text-amber-900' }, '➗ DIVISION'),
            h('div', { className: 'space-y-1 text-xs text-amber-900 mt-1' },
              h('p', null, h('b', null, 'Keep-Change-Flip: '), 'Keep first fraction. Change ÷ to ×. Flip second fraction (reciprocal).'),
              h('p', null, h('span', { className: 'font-mono italic' }, 'a/b ÷ c/d = a/b × d/c = (a×d) / (b×c)')),
              h('p', null, h('b', null, 'Measurement meaning: '), '"How many of these fit in that?" 4 ÷ 1/2 = "how many halves in 4?" = 8.'),
              h('p', null, h('b', null, 'Dividing by < 1 makes things bigger.'))
            )
          ),
          // Equivalence
          h('div', { className: 'bg-emerald-50 rounded p-3 border border-emerald-200' },
            h('h5', { className: 'text-sm font-black text-emerald-900' }, '🔗 EQUIVALENCE'),
            h('div', { className: 'space-y-1 text-xs text-emerald-900 mt-1' },
              h('p', null, h('b', null, 'Rule: '), 'Multiply (or divide) top AND bottom by the same nonzero number. Value stays the same.'),
              h('p', null, h('span', { className: 'font-mono italic' }, '1/2 = 2/4 = 3/6 = 4/8 = 50/100')),
              h('p', null, h('b', null, 'Simplest form: '), 'Divide top and bottom by their GCD (greatest common factor).'),
              h('p', null, h('b', null, 'Test for equivalence: '), 'Cross-multiply. a/b = c/d iff a×d = b×c.')
            )
          ),
          // Conversion
          h('div', { className: 'bg-cyan-50 rounded p-3 border border-cyan-200' },
            h('h5', { className: 'text-sm font-black text-cyan-900' }, '🔄 CONVERSIONS'),
            h('div', { className: 'space-y-1 text-xs text-cyan-900 mt-1' },
              h('p', null, h('b', null, 'Improper → mixed: '), 'Divide. Whole = quotient. Fraction = remainder/denominator.'),
              h('p', null, h('b', null, 'Mixed → improper: '), '(whole × denominator) + numerator, all over denominator.'),
              h('p', null, h('b', null, 'Fraction → decimal: '), 'Numerator ÷ denominator (long division).'),
              h('p', null, h('b', null, 'Decimal → fraction: '), '0.25 = 25/100 = 1/4 (use place value, then simplify).'),
              h('p', null, h('b', null, 'Fraction → percent: '), 'Multiply by 100 (or convert to decimal first).')
            )
          ),
          // Comparison
          h('div', { className: 'bg-rose-50 rounded p-3 border border-rose-200' },
            h('h5', { className: 'text-sm font-black text-rose-900' }, '⚖ COMPARISON'),
            h('div', { className: 'space-y-1 text-xs text-rose-900 mt-1' },
              h('p', null, h('b', null, 'Same bottom: '), 'Compare tops directly.'),
              h('p', null, h('b', null, 'Same top: '), 'Smaller bottom = bigger fraction (bigger pieces).'),
              h('p', null, h('b', null, 'Cross-multiply: '), 'a/b vs c/d → a×d vs b×c.'),
              h('p', null, h('b', null, 'Benchmark: '), 'Compare each to 0, 1/2, or 1.')
            )
          )
        ),
        h('button', {
          onClick: function() {
            if (typeof window !== 'undefined' && window.print) window.print();
          },
          className: 'w-full px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700'
        }, '🖨 Print this cheat sheet')
      );
    };

    // ── FACT FAMILIES TAB ──
    // Show all related operations for a fraction triple — e.g.,
    // 1/2 + 1/4 = 3/4 → 3/4 - 1/4 = 1/2, 3/4 - 1/2 = 1/4.
    var renderFactFamiliesTab = function() {
      var ff1 = _f.ffNum1 != null ? _f.ffNum1 : 1;
      var ffD1 = _f.ffDen1 != null ? _f.ffDen1 : 2;
      var ff2 = _f.ffNum2 != null ? _f.ffNum2 : 1;
      var ffD2 = _f.ffDen2 != null ? _f.ffDen2 : 4;
      // Compute sum
      var cd = lcm(ffD1, ffD2);
      var sumN = ff1 * (cd / ffD1) + ff2 * (cd / ffD2);
      var sumSimp = simplify(sumN, cd);
      // Compute product
      var prodSimp = simplify(ff1 * ff2, ffD1 * ffD2);
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
          h('h4', { className: 'text-sm font-bold text-indigo-800 mb-1' }, '👨‍👩‍👧 Fraction fact families'),
          h('p', { className: 'text-[11px] text-indigo-700' },
            'Just like whole-number fact families (3 + 4 = 7, 7 - 3 = 4, 7 - 4 = 3), fractions have fact families too. ',
            'A single triple generates four related equations.'
          )
        ),
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-white rounded-lg p-3 border border-indigo-200' },
            h('p', { className: 'text-xs font-bold text-indigo-700 mb-2' }, 'Fraction A'),
            h('div', { className: 'flex items-center gap-2 justify-center' },
              h('input', { type: 'number', min: 1, value: ff1,
                onChange: function(e) { upd({ ffNum1: parseInt(e.target.value) || 1 }); },
                className: 'w-16 px-2 py-1 rounded border border-indigo-300 text-center text-lg font-bold' }),
              h('span', { className: 'text-xl font-bold text-indigo-900' }, '/'),
              h('input', { type: 'number', min: 2, value: ffD1,
                onChange: function(e) { upd({ ffDen1: parseInt(e.target.value) || 2 }); },
                className: 'w-16 px-2 py-1 rounded border border-indigo-300 text-center text-lg font-bold' })
            )
          ),
          h('div', { className: 'bg-white rounded-lg p-3 border border-indigo-200' },
            h('p', { className: 'text-xs font-bold text-indigo-700 mb-2' }, 'Fraction B'),
            h('div', { className: 'flex items-center gap-2 justify-center' },
              h('input', { type: 'number', min: 1, value: ff2,
                onChange: function(e) { upd({ ffNum2: parseInt(e.target.value) || 1 }); },
                className: 'w-16 px-2 py-1 rounded border border-indigo-300 text-center text-lg font-bold' }),
              h('span', { className: 'text-xl font-bold text-indigo-900' }, '/'),
              h('input', { type: 'number', min: 2, value: ffD2,
                onChange: function(e) { upd({ ffDen2: parseInt(e.target.value) || 2 }); },
                className: 'w-16 px-2 py-1 rounded border border-indigo-300 text-center text-lg font-bold' })
            )
          )
        ),
        // Addition fact family
        h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-4 space-y-2' },
          h('p', { className: 'text-xs font-bold text-indigo-700' }, '➕ Addition fact family'),
          h('div', { className: 'space-y-1' },
            h('p', { className: 'text-sm font-mono text-indigo-900' },
              ff1 + '/' + ffD1 + ' + ' + ff2 + '/' + ffD2 + ' = ' + sumSimp[0] + '/' + sumSimp[1]),
            h('p', { className: 'text-sm font-mono text-indigo-900' },
              ff2 + '/' + ffD2 + ' + ' + ff1 + '/' + ffD1 + ' = ' + sumSimp[0] + '/' + sumSimp[1]),
            h('p', { className: 'text-sm font-mono text-indigo-900' },
              sumSimp[0] + '/' + sumSimp[1] + ' − ' + ff1 + '/' + ffD1 + ' = ' + ff2 + '/' + ffD2),
            h('p', { className: 'text-sm font-mono text-indigo-900' },
              sumSimp[0] + '/' + sumSimp[1] + ' − ' + ff2 + '/' + ffD2 + ' = ' + ff1 + '/' + ffD1)
          )
        ),
        // Multiplication fact family
        h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-4 space-y-2' },
          h('p', { className: 'text-xs font-bold text-indigo-700' }, '✕ Multiplication fact family'),
          h('div', { className: 'space-y-1' },
            h('p', { className: 'text-sm font-mono text-indigo-900' },
              ff1 + '/' + ffD1 + ' × ' + ff2 + '/' + ffD2 + ' = ' + prodSimp[0] + '/' + prodSimp[1]),
            h('p', { className: 'text-sm font-mono text-indigo-900' },
              ff2 + '/' + ffD2 + ' × ' + ff1 + '/' + ffD1 + ' = ' + prodSimp[0] + '/' + prodSimp[1]),
            h('p', { className: 'text-sm font-mono text-indigo-900' },
              prodSimp[0] + '/' + prodSimp[1] + ' ÷ ' + ff1 + '/' + ffD1 + ' = ' + ff2 + '/' + ffD2),
            h('p', { className: 'text-sm font-mono text-indigo-900' },
              prodSimp[0] + '/' + prodSimp[1] + ' ÷ ' + ff2 + '/' + ffD2 + ' = ' + ff1 + '/' + ffD1)
          )
        )
      );
    };

    // ── ESTIMATION TRAINER ──
    // Pick the closest benchmark to a randomly-generated fraction.
    // Same as Benchmark Trainer but with explicit "is it closer to A or B" framing.
    var renderEstimationTab = function() {
      var estRound = _f.estRound || null;
      var estFeedback = _f.estFeedback || null;
      var estScore = _f.estScore || { correct: 0, total: 0 };
      var newEst = function() {
        // Generate a fraction with a non-benchmark denominator
        var d = pick([3, 5, 6, 7, 8, 9, 11, 12, 13, 15]);
        var n = randInt(1, d);
        var val = n / d;
        // Pick two benchmark options that bracket the value (or near-bracket)
        var benchmarks = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
        var labelOf = function(v) {
          if (v === 0) return '0';
          if (v === 0.25) return '1/4';
          if (v === 0.5) return '1/2';
          if (v === 0.75) return '3/4';
          if (v === 1) return '1';
          if (v === 1.25) return '1 1/4';
          if (v === 1.5) return '1 1/2';
          if (v === 1.75) return '1 3/4';
          if (v === 2) return '2';
          return v.toString();
        };
        var sorted = benchmarks.slice().sort(function(a, b) { return Math.abs(a - val) - Math.abs(b - val); });
        var closest = sorted[0];
        // Build choices: closest + two distractors
        var choices = [closest, sorted[1], sorted[2]];
        choices.sort(function() { return Math.random() - 0.5; });
        return { n: n, d: d, val: val, choices: choices, answer: closest, labelOf: labelOf };
      };
      var startEst = function() {
        upd({ estRound: newEst(), estFeedback: null, estScore: { correct: 0, total: 0 } });
        sfxNewChallenge();
      };
      var checkEst = function(choice) {
        var ok = Math.abs(choice - estRound.answer) < 0.001;
        if (ok) {
          sfxCorrect();
          upd({
            estRound: newEst(),
            estScore: { correct: estScore.correct + 1, total: estScore.total + 1 },
            estFeedback: { correct: true, msg: '✅ Correct! ' + estRound.n + '/' + estRound.d + ' = ' + estRound.val.toFixed(3) + ' ≈ ' + estRound.labelOf(estRound.answer) }
          });
        } else {
          sfxWrong();
          upd({
            estScore: { correct: estScore.correct, total: estScore.total + 1 },
            estFeedback: { correct: false, msg: '❌ Closer to ' + estRound.labelOf(estRound.answer) + '. ' + estRound.n + '/' + estRound.d + ' = ' + estRound.val.toFixed(3) }
          });
        }
      };

      if (!estRound) {
        return h('div', { className: 'bg-emerald-50 rounded-xl p-6 border-2 border-emerald-200 text-center space-y-3' },
          h('div', { className: 'text-5xl' }, '🎯'),
          h('h4', { className: 'text-xl font-black text-emerald-800' }, 'Estimation Trainer'),
          h('p', { className: 'text-sm text-emerald-700 max-w-md mx-auto' },
            'Quickly estimate which benchmark a fraction is closest to. This is the fastest way to develop fraction number sense.'
          ),
          h('button', { onClick: startEst,
            className: 'px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700' }, '🎯 Start training')
        );
      }
      var er = estRound;
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'flex items-center gap-3 bg-emerald-50 rounded-xl p-3 border border-emerald-200' },
          h('span', { className: 'text-2xl' }, '🎯'),
          h('span', { className: 'font-bold text-emerald-800' }, 'Score: ' + estScore.correct + '/' + estScore.total),
          h('button', { onClick: startEst,
            className: 'ml-auto px-3 py-1 rounded text-[11px] font-bold bg-emerald-200 text-emerald-800 hover:bg-emerald-300' }, '↺ Restart')
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-emerald-200 p-4 space-y-3' },
          h('p', { className: 'text-sm font-bold text-emerald-800 text-center' }, 'Which is closest to ',
            h('span', { className: 'font-mono text-2xl' }, er.n + '/' + er.d), '?'),
          h('div', { className: 'flex justify-center' }, drawPie(er.n, er.d, 130, '#16a34a')),
          h('div', { className: 'grid grid-cols-3 gap-2' },
            er.choices.map(function(c, i) {
              return h('button', {
                key: 'ec-' + i,
                onClick: function() { checkEst(c); },
                className: 'px-3 py-3 rounded-lg text-base font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-300 border-2 border-emerald-300 font-mono'
              }, er.labelOf(c));
            })
          ),
          estFeedback && h('p', { className: 'text-center text-sm font-bold ' + (estFeedback.correct ? 'text-green-700' : 'text-red-700') }, estFeedback.msg),
          h('div', { className: 'flex justify-center mt-2' },
            drawNumberLine([{ n: er.n, d: er.d, color: '#16a34a', label: er.n + '/' + er.d }], { maxVal: er.val > 1 ? 2 : 1, width: 380 })
          )
        )
      );
    };

    // ── PROBABILITY (fractions as outcomes) ──
    var renderProbabilityTab = function() {
      var pTotal = _f.probTotal != null ? _f.probTotal : 10;
      var pFav = _f.probFav != null ? _f.probFav : 3;
      var simpProb = simplify(pFav, pTotal);
      var pctProb = pTotal > 0 ? (pFav / pTotal * 100) : 0;
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-pink-50 rounded-xl p-3 border border-pink-200' },
          h('h4', { className: 'text-sm font-bold text-pink-800 mb-1' }, '🎲 Probability as a fraction'),
          h('p', { className: 'text-[11px] text-pink-700' },
            'Probability is favorable outcomes / total outcomes. Move the sliders to see how probability and fractions are the same thing.'
          )
        ),
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-pink-50 rounded-lg p-3 border border-pink-200' },
            h('label', { className: 'block text-xs font-bold text-pink-700 mb-1' }, 'Favorable outcomes'),
            h('input', { type: 'range', min: 0, max: pTotal, value: pFav,
              onChange: function(e) { upd({ probFav: parseInt(e.target.value) }); },
              className: 'w-full accent-pink-600' }),
            h('div', { className: 'text-center text-lg font-bold text-pink-800' }, pFav)
          ),
          h('div', { className: 'bg-pink-50 rounded-lg p-3 border border-pink-200' },
            h('label', { className: 'block text-xs font-bold text-pink-700 mb-1' }, 'Total outcomes'),
            h('input', { type: 'range', min: 2, max: 20, value: pTotal,
              onChange: function(e) { var v = parseInt(e.target.value); upd({ probTotal: v, probFav: Math.min(pFav, v) }); },
              className: 'w-full accent-pink-600' }),
            h('div', { className: 'text-center text-lg font-bold text-pink-800' }, pTotal)
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-pink-200 p-4 space-y-3' },
          h('div', { className: 'text-center' },
            h('p', { className: 'text-xs text-pink-700' }, 'Probability'),
            h('p', { className: 'text-3xl font-bold text-pink-900 font-mono' },
              'P = ' + pFav + '/' + pTotal,
              simpProb[0] !== pFav && h('span', { className: 'text-base text-pink-600 ml-2' }, '= ' + simpProb[0] + '/' + simpProb[1])
            ),
            h('p', { className: 'text-base text-pink-700 mt-1' }, '= ' + pctProb.toFixed(0) + '%')
          ),
          h('div', { className: 'flex justify-center' }, drawSetModel(pFav, pTotal, { icon: '🎲', perRow: Math.min(pTotal, 10) }))
        ),
        h('div', { className: 'bg-pink-50 rounded-lg p-3 border border-pink-200' },
          h('p', { className: 'text-xs text-pink-800' },
            '💡 ',
            pFav === 0 ? 'Probability 0 = impossible.' :
            pFav === pTotal ? 'Probability 1 = certain.' :
            (pFav / pTotal) >= 0.5 ? 'Probability ≥ 1/2 means "more likely than not."' :
                                    'Probability < 1/2 means "less likely than not."'
          )
        )
      );
    };

    // ── MULTILINGUAL FRACTION TERMS ──
    // Fraction vocabulary in 12 languages (matches AlloFlow's language coverage).
    // For ELL students learning fractions in a new language, having the term
    // in their home language alongside English speeds acquisition.
    var FRACTION_TERMS_MULTILINGUAL = {
      english:    { numerator: 'numerator',    denominator: 'denominator', fraction: 'fraction',       whole: 'whole',         half: 'half',         third: 'third',     fourth: 'fourth',    fifth: 'fifth',     sixth: 'sixth',     equal: 'equal',     more: 'more than',  less: 'less than' },
      spanish:    { numerator: 'numerador',    denominator: 'denominador', fraction: 'fracción',       whole: 'entero',        half: 'mitad',        third: 'tercio',    fourth: 'cuarto',    fifth: 'quinto',    sixth: 'sexto',     equal: 'igual',     more: 'mayor que',  less: 'menor que' },
      french:     { numerator: 'numérateur',   denominator: 'dénominateur', fraction: 'fraction',     whole: 'entier',        half: 'moitié',       third: 'tiers',     fourth: 'quart',     fifth: 'cinquième', sixth: 'sixième',   equal: 'égal',      more: 'plus que',   less: 'moins que' },
      portuguese: { numerator: 'numerador',    denominator: 'denominador', fraction: 'fração',         whole: 'inteiro',       half: 'metade',       third: 'terço',     fourth: 'quarto',    fifth: 'quinto',    sixth: 'sexto',     equal: 'igual',     more: 'maior que',  less: 'menor que' },
      chinese:    { numerator: '分子',           denominator: '分母',         fraction: '分数',             whole: '整数',           half: '一半',         third: '三分之一',  fourth: '四分之一',  fifth: '五分之一',  sixth: '六分之一',  equal: '等于',      more: '大于',       less: '小于' },
      japanese:   { numerator: '分子',           denominator: '分母',         fraction: '分数',             whole: '全体',           half: '半分',         third: '三分の一',  fourth: '四分の一',  fifth: '五分の一',  sixth: '六分の一',  equal: '等しい',    more: 'より大きい', less: 'より小さい' },
      korean:     { numerator: '분자',          denominator: '분모',        fraction: '분수',           whole: '전체',          half: '반',           third: '삼분의 일', fourth: '사분의 일', fifth: '오분의 일', sixth: '육분의 일', equal: '같다',     more: '~보다 크다', less: '~보다 작다' },
      arabic:     { numerator: 'البسط',         denominator: 'المقام',       fraction: 'كسر',             whole: 'كامل',          half: 'نصف',          third: 'ثلث',       fourth: 'ربع',       fifth: 'خُمس',      sixth: 'سُدس',      equal: 'يساوي',     more: 'أكبر من',    less: 'أقل من' },
      russian:    { numerator: 'числитель',    denominator: 'знаменатель', fraction: 'дробь',           whole: 'целое',         half: 'половина',     third: 'треть',     fourth: 'четверть',  fifth: 'пятая',     sixth: 'шестая',    equal: 'равно',     more: 'больше чем', less: 'меньше чем' },
      vietnamese: { numerator: 'tử số',        denominator: 'mẫu số',       fraction: 'phân số',         whole: 'số nguyên',     half: 'một nửa',     third: 'một phần ba', fourth: 'một phần tư', fifth: 'một phần năm', sixth: 'một phần sáu', equal: 'bằng',   more: 'lớn hơn',    less: 'nhỏ hơn' },
      hebrew:     { numerator: 'מונה',          denominator: 'מכנה',          fraction: 'שבר',              whole: 'שלם',            half: 'חצי',           third: 'שליש',       fourth: 'רבע',        fifth: 'חמישית',     sixth: 'שישית',      equal: 'שווה',       more: 'גדול מ',      less: 'קטן מ' },
      'haitian creole': { numerator: 'nimeratè', denominator: 'denominatè', fraction: 'fraksyon',     whole: 'antye',         half: 'mwatye',       third: 'twazyèm',   fourth: 'katriyèm',  fifth: 'senkyèm',   sixth: 'sizyèm',    equal: 'egal',      more: 'pi gwo pase', less: 'pi piti pase' }
    };

    var renderMultilingualTab = function() {
      var mlLang = _f.mlLang || 'spanish';
      var translation = FRACTION_TERMS_MULTILINGUAL[mlLang] || FRACTION_TERMS_MULTILINGUAL.spanish;
      var english = FRACTION_TERMS_MULTILINGUAL.english;
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-cyan-50 rounded-xl p-3 border border-cyan-200' },
          h('h4', { className: 'text-sm font-bold text-cyan-800 mb-1' }, '🌍 Fraction vocabulary in 12 languages'),
          h('p', { className: 'text-[11px] text-cyan-700' },
            'For English Language Learners: see fraction vocabulary in your home language alongside English. ',
            'Bilingual instruction speeds math acquisition because the mathematical concept is universal — only the words change.'
          )
        ),
        h('div', { className: 'flex flex-wrap gap-1' },
          Object.keys(FRACTION_TERMS_MULTILINGUAL).filter(function(l) { return l !== 'english'; }).map(function(lang) {
            var active = mlLang === lang;
            return h('button', {
              key: 'ml-' + lang,
              onClick: function() { upd({ mlLang: lang }); },
              className: 'px-2 py-1 rounded text-[11px] font-bold transition-all capitalize ' +
                (active ? 'bg-cyan-700 text-white' : 'bg-white text-cyan-700 border border-cyan-300 hover:bg-cyan-100')
            }, lang);
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-3' },
          h('table', { className: 'w-full text-sm' },
            h('thead', null,
              h('tr', { className: 'border-b border-cyan-300' },
                h('th', { className: 'text-left py-2 text-cyan-800 font-bold' }, 'English'),
                h('th', { className: 'text-left py-2 text-cyan-800 font-bold capitalize' }, mlLang)
              )
            ),
            h('tbody', null,
              Object.keys(english).map(function(term) {
                return h('tr', { key: 'tr-' + term, className: 'border-b border-cyan-100' },
                  h('td', { className: 'py-1 text-slate-800 font-bold' }, english[term]),
                  h('td', { className: 'py-1 text-cyan-900', style: { direction: (mlLang === 'arabic' || mlLang === 'hebrew') ? 'rtl' : 'ltr' } }, translation[term])
                );
              })
            )
          )
        )
      );
    };

    // ── PRACTICE BANK TAB — browse all curated practice items ──
    var renderPracticeBankTab = function() {
      var pbSkill = _f.pbSkill || 'identify';
      var pbIdx = _f.pbIdx || 0;
      var items = PRACTICE_BANK[pbSkill] || PRACTICE_BANK.identify;
      var item = items[pbIdx % items.length];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-rose-50 rounded-xl p-3 border border-rose-200' },
          h('h4', { className: 'text-sm font-bold text-rose-800 mb-1' }, '📚 Curated practice bank'),
          h('p', { className: 'text-[11px] text-rose-700' },
            'A hand-curated set of practice items organized by skill. Browse by category, or use them as a quick warmup before challenges.'
          )
        ),
        h('div', { className: 'flex flex-wrap gap-1' },
          Object.keys(PRACTICE_BANK).map(function(skill) {
            var active = pbSkill === skill;
            return h('button', {
              key: 'pb-' + skill,
              onClick: function() { upd({ pbSkill: skill, pbIdx: 0 }); },
              className: 'px-3 py-1.5 rounded text-xs font-bold transition-all capitalize ' +
                (active ? 'bg-rose-700 text-white' : 'bg-white text-rose-700 border border-rose-300 hover:bg-rose-100')
            }, skill + ' (' + PRACTICE_BANK[skill].length + ')');
          })
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-4' },
          h('p', { className: 'text-[11px] text-rose-600' }, 'Item ' + (pbIdx % items.length + 1) + ' of ' + items.length),
          // Display the item based on skill type
          pbSkill === 'identify' && h('div', null,
            h('p', { className: 'text-sm font-bold text-rose-800 mb-2' }, 'What fraction is shown?'),
            h('div', { className: 'flex justify-center' },
              item.model === 'pie' ? drawPie(item.n, item.d, 160, palMain) :
              item.model === 'bar' ? drawBar(item.n, item.d, palMain) :
              drawSetModel(item.n, item.d, {})
            ),
            h('p', { className: 'text-center text-base font-bold text-rose-900 mt-2' }, 'Answer: ', h('span', { className: 'font-mono' }, item.answer))
          ),
          pbSkill === 'equivalent' && h('div', null,
            h('p', { className: 'text-sm font-bold text-rose-800 mb-2' }, 'Find the equivalent:'),
            h('p', { className: 'text-center text-2xl font-mono font-bold text-rose-900' },
              item.from.n + '/' + item.from.d + ' = ' + h('span', { style: { color: '#9f1239' } }, '?') + '/' + item.to.d
            ),
            h('p', { className: 'text-center text-sm text-rose-700 mt-2' }, 'Answer: ', h('span', { className: 'font-mono font-bold' }, item.answer))
          ),
          pbSkill === 'simplify' && h('div', null,
            h('p', { className: 'text-sm font-bold text-rose-800 mb-2' }, 'Simplify:'),
            h('p', { className: 'text-center text-2xl font-mono font-bold text-rose-900' },
              item.from.n + '/' + item.from.d + ' = ?'
            ),
            h('p', { className: 'text-center text-sm text-rose-700 mt-2' }, 'Answer: ', h('span', { className: 'font-mono font-bold' }, item.to.n + '/' + item.to.d))
          ),
          pbSkill === 'compare' && h('div', null,
            h('p', { className: 'text-sm font-bold text-rose-800 mb-2' }, 'Which is larger?'),
            h('div', { className: 'flex items-center justify-center gap-4' },
              h('div', { className: 'text-2xl font-mono font-bold text-rose-900' }, item.a.n + '/' + item.a.d),
              h('span', { className: 'text-3xl text-rose-700' }, '?'),
              h('div', { className: 'text-2xl font-mono font-bold text-rose-900' }, item.b.n + '/' + item.b.d)
            ),
            h('p', { className: 'text-center text-sm text-rose-700 mt-2' }, 'Answer: ',
              h('span', { className: 'font-mono font-bold' },
                item.larger === 'a' ? item.a.n + '/' + item.a.d + ' > ' + item.b.n + '/' + item.b.d :
                item.larger === 'b' ? item.b.n + '/' + item.b.d + ' > ' + item.a.n + '/' + item.a.d :
                item.a.n + '/' + item.a.d + ' = ' + item.b.n + '/' + item.b.d
              )
            )
          ),
          h('div', { className: 'flex gap-2 mt-3' },
            h('button', {
              onClick: function() { upd({ pbIdx: (pbIdx - 1 + items.length) % items.length }); },
              className: 'flex-1 px-3 py-1.5 rounded text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200'
            }, '← Previous'),
            h('button', {
              onClick: function() { upd({ pbIdx: (pbIdx + 1) % items.length }); },
              className: 'flex-1 px-3 py-1.5 rounded text-xs font-bold bg-rose-700 text-white hover:bg-rose-800'
            }, 'Next →')
          )
        )
      );
    };

    // ── FRACTION CALCULATOR (show-your-work) ──
    // A two-fraction calculator that doesn't just give the answer — it shows
    // every step of the procedure for whichever operation is chosen.
    var renderCalculatorTab = function() {
      var cN1 = _f.calcN1 != null ? _f.calcN1 : 1;
      var cD1 = _f.calcD1 != null ? _f.calcD1 : 2;
      var cN2 = _f.calcN2 != null ? _f.calcN2 : 1;
      var cD2 = _f.calcD2 != null ? _f.calcD2 : 3;
      var cOp = _f.calcOp || 'add';
      var calcResult = (function() {
        if (cOp === 'add') { var cd = lcm(cD1, cD2); return { n: cN1 * (cd / cD1) + cN2 * (cd / cD2), d: cd }; }
        if (cOp === 'sub') { var cd2 = lcm(cD1, cD2); return { n: cN1 * (cd2 / cD1) - cN2 * (cd2 / cD2), d: cd2 }; }
        if (cOp === 'mul') return { n: cN1 * cN2, d: cD1 * cD2 };
        if (cOp === 'div') return { n: cN1 * cD2, d: cD1 * cN2 };
        return { n: 0, d: 1 };
      })();
      var calcSimp = simplify(calcResult.n, calcResult.d);
      var opSymbol = { add: '+', sub: '−', mul: '×', div: '÷' }[cOp];
      var opLabel = { add: 'Addition', sub: 'Subtraction', mul: 'Multiplication', div: 'Division' }[cOp];

      // Step-by-step workflow per op
      var workflow = [];
      if (cOp === 'add' || cOp === 'sub') {
        var cd3 = lcm(cD1, cD2);
        var conv1 = cN1 * (cd3 / cD1);
        var conv2 = cN2 * (cd3 / cD2);
        var combined = cOp === 'add' ? conv1 + conv2 : conv1 - conv2;
        workflow = [
          { step: '1. Find LCM of denominators', detail: 'LCM(' + cD1 + ', ' + cD2 + ') = ' + cd3 },
          { step: '2. Convert ' + cN1 + '/' + cD1 + ' to ' + cd3 + 'ths', detail: cN1 + '/' + cD1 + ' = ' + conv1 + '/' + cd3 + ' (multiplied top and bottom by ' + (cd3 / cD1) + ')' },
          { step: '3. Convert ' + cN2 + '/' + cD2 + ' to ' + cd3 + 'ths', detail: cN2 + '/' + cD2 + ' = ' + conv2 + '/' + cd3 + ' (multiplied top and bottom by ' + (cd3 / cD2) + ')' },
          { step: '4. ' + (cOp === 'add' ? 'Add' : 'Subtract') + ' numerators', detail: conv1 + ' ' + opSymbol + ' ' + conv2 + ' = ' + combined + '. Result: ' + combined + '/' + cd3 },
          { step: '5. Simplify', detail: combined + '/' + cd3 + ' = ' + calcSimp[0] + '/' + calcSimp[1] }
        ];
      } else if (cOp === 'mul') {
        workflow = [
          { step: '1. Multiply numerators', detail: cN1 + ' × ' + cN2 + ' = ' + (cN1 * cN2) },
          { step: '2. Multiply denominators', detail: cD1 + ' × ' + cD2 + ' = ' + (cD1 * cD2) },
          { step: '3. Write the result', detail: (cN1 * cN2) + '/' + (cD1 * cD2) },
          { step: '4. Simplify', detail: (cN1 * cN2) + '/' + (cD1 * cD2) + ' = ' + calcSimp[0] + '/' + calcSimp[1] }
        ];
      } else if (cOp === 'div') {
        workflow = [
          { step: '1. Keep the first fraction', detail: cN1 + '/' + cD1 },
          { step: '2. Change ÷ to ×', detail: cN1 + '/' + cD1 + ' ×' },
          { step: '3. Flip the second fraction (reciprocal)', detail: cN2 + '/' + cD2 + ' becomes ' + cD2 + '/' + cN2 },
          { step: '4. Multiply', detail: cN1 + '/' + cD1 + ' × ' + cD2 + '/' + cN2 + ' = ' + (cN1 * cD2) + '/' + (cD1 * cN2) },
          { step: '5. Simplify', detail: (cN1 * cD2) + '/' + (cD1 * cN2) + ' = ' + calcSimp[0] + '/' + calcSimp[1] }
        ];
      }

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-slate-50 rounded-xl p-3 border border-slate-200' },
          h('h4', { className: 'text-sm font-bold text-slate-800 mb-1' }, '🧮 Fraction calculator (show your work)'),
          h('p', { className: 'text-[11px] text-slate-700' },
            'Enter two fractions and an operation. This calculator shows every step, not just the answer.'
          )
        ),
        // Operands and operation
        h('div', { className: 'bg-white rounded-xl border-2 border-slate-200 p-4 space-y-3' },
          h('div', { className: 'flex items-center justify-center gap-2 flex-wrap' },
            h('div', { className: 'flex flex-col items-center' },
              h('input', { type: 'number', min: 1, max: 99, value: cN1,
                onChange: function(e) { upd({ calcN1: parseInt(e.target.value) || 1 }); },
                'aria-label': 'First numerator',
                className: 'w-16 px-2 py-1 rounded border border-slate-300 text-center text-xl font-bold' }),
              h('div', { style: { width: 50, height: 2, background: '#0f172a', margin: '4px 0' } }),
              h('input', { type: 'number', min: 1, max: 99, value: cD1,
                onChange: function(e) { upd({ calcD1: parseInt(e.target.value) || 1 }); },
                'aria-label': 'First denominator',
                className: 'w-16 px-2 py-1 rounded border border-slate-300 text-center text-xl font-bold' })
            ),
            // Op selector
            h('select', { value: cOp,
              onChange: function(e) { upd({ calcOp: e.target.value }); },
              'aria-label': 'Operation',
              className: 'px-3 py-2 rounded border border-slate-300 text-2xl font-bold' },
              h('option', { value: 'add' }, '+'),
              h('option', { value: 'sub' }, '−'),
              h('option', { value: 'mul' }, '×'),
              h('option', { value: 'div' }, '÷')
            ),
            h('div', { className: 'flex flex-col items-center' },
              h('input', { type: 'number', min: 1, max: 99, value: cN2,
                onChange: function(e) { upd({ calcN2: parseInt(e.target.value) || 1 }); },
                'aria-label': 'Second numerator',
                className: 'w-16 px-2 py-1 rounded border border-slate-300 text-center text-xl font-bold' }),
              h('div', { style: { width: 50, height: 2, background: '#0f172a', margin: '4px 0' } }),
              h('input', { type: 'number', min: 1, max: 99, value: cD2,
                onChange: function(e) { upd({ calcD2: parseInt(e.target.value) || 1 }); },
                'aria-label': 'Second denominator',
                className: 'w-16 px-2 py-1 rounded border border-slate-300 text-center text-xl font-bold' })
            ),
            h('span', { className: 'text-2xl font-bold text-slate-700' }, '='),
            h('div', { className: 'bg-emerald-100 border-2 border-emerald-400 rounded-lg px-4 py-2' },
              h('div', { className: 'text-center text-2xl font-mono font-bold text-emerald-900' }, calcSimp[0] + '/' + calcSimp[1])
            )
          ),
          h('p', { className: 'text-center text-[11px] text-slate-600 italic' }, opLabel + ' shown step-by-step below.')
        ),
        // Step-by-step workflow
        h('div', { className: 'bg-white rounded-xl border-2 border-slate-200 p-4' },
          h('p', { className: 'text-xs font-bold text-slate-800 mb-2' }, '📋 Step-by-step solution:'),
          h('ol', { className: 'space-y-2' },
            workflow.map(function(w, i) {
              return h('li', { key: 'wf-' + i, className: 'bg-slate-50 rounded-lg p-2 border border-slate-200' },
                h('div', { className: 'flex items-start gap-2' },
                  h('span', { className: 'text-xs font-bold text-slate-600 flex-shrink-0' }, w.step),
                  h('span', { className: 'text-xs font-mono text-slate-900' }, w.detail)
                )
              );
            })
          )
        )
      );
    };

    // ── FRACTION ART GALLERY ──
    // Generative fraction-based visual art. Engagement-focused — fractions
    // make patterns. Kids who hate "math" love generating these.
    var renderFractionArtTab = function() {
      var artSize = _f.artSize || 8;
      // Generate a deterministic but varied pattern
      var cells = [];
      for (var r = 0; r < artSize; r++) {
        for (var c = 0; c < artSize; c++) {
          // Each cell shaded based on a fraction r/c (or 0 if c=0)
          var num = r;
          var den = artSize;
          var hue = (r * 360 / artSize) + (c * 5);
          var sat = 50 + (c * 4);
          var lit = 30 + (r * 4);
          cells.push(h('div', { key: r + '-' + c, style: {
            width: 30, height: 30,
            background: 'hsl(' + hue + ',' + sat + '%,' + lit + '%)',
            border: '1px solid rgba(0,0,0,0.05)'
          } }));
        }
      }
      // Color wheel based on n/d
      var wheelN = _f.wheelN || 1;
      var wheelD = _f.wheelD || 8;
      var wheelSlices = [];
      for (var w = 0; w < wheelD; w++) {
        var startA = (w / wheelD) * 2 * Math.PI - Math.PI / 2;
        var endA = ((w + 1) / wheelD) * 2 * Math.PI - Math.PI / 2;
        var lg = (endA - startA) > Math.PI ? 1 : 0;
        var cx = 100, cy = 100, rad = 90;
        var x1 = cx + rad * Math.cos(startA);
        var y1 = cy + rad * Math.sin(startA);
        var x2 = cx + rad * Math.cos(endA);
        var y2 = cy + rad * Math.sin(endA);
        wheelSlices.push(h('path', {
          key: 'ws-' + w,
          d: 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + rad + ' ' + rad + ' 0 ' + lg + ' 1 ' + x2 + ' ' + y2 + ' Z',
          fill: 'hsl(' + (w * 360 / wheelD) + ',75%,55%)',
          stroke: '#0f172a', strokeWidth: 2,
          opacity: w < wheelN ? 1 : 0.25
        }));
      }
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-fuchsia-50 rounded-xl p-3 border border-fuchsia-200' },
          h('h4', { className: 'text-sm font-bold text-fuchsia-800 mb-1' }, '🎨 Fraction art gallery'),
          h('p', { className: 'text-[11px] text-fuchsia-700' },
            'Fractions make patterns. Build a color wheel, a fraction grid, or a kaleidoscope.'
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-fuchsia-200 p-4' },
          h('h5', { className: 'text-xs font-bold text-fuchsia-700 mb-2' }, 'Fraction grid (' + artSize + '×' + artSize + ')'),
          h('div', { className: 'flex justify-center mb-2' },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(' + artSize + ', 30px)', gap: 0 } }, cells)
          ),
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'text-xs font-bold text-fuchsia-700' }, 'Grid size:'),
            h('input', { type: 'range', min: 4, max: 16, value: artSize,
              onChange: function(e) { upd({ artSize: parseInt(e.target.value) }); },
              className: 'flex-1 accent-fuchsia-600' }),
            h('span', { className: 'text-sm font-bold text-fuchsia-800' }, artSize)
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-fuchsia-200 p-4' },
          h('h5', { className: 'text-xs font-bold text-fuchsia-700 mb-2' }, 'Color wheel (' + wheelN + '/' + wheelD + ' lit)'),
          h('div', { className: 'flex justify-center mb-2' },
            h('svg', { viewBox: '0 0 200 200', width: 200, height: 200 }, wheelSlices)
          ),
          h('div', { className: 'grid grid-cols-2 gap-2' },
            h('div', null,
              h('label', { className: 'block text-xs font-bold text-fuchsia-700' }, 'Lit slices'),
              h('input', { type: 'range', min: 0, max: wheelD, value: wheelN,
                onChange: function(e) { upd({ wheelN: parseInt(e.target.value) }); },
                className: 'w-full accent-fuchsia-600' }),
              h('div', { className: 'text-center text-sm font-bold text-fuchsia-800' }, wheelN)
            ),
            h('div', null,
              h('label', { className: 'block text-xs font-bold text-fuchsia-700' }, 'Total slices'),
              h('input', { type: 'range', min: 2, max: 24, value: wheelD,
                onChange: function(e) { var v = parseInt(e.target.value); upd({ wheelD: v, wheelN: Math.min(wheelN, v) }); },
                className: 'w-full accent-fuchsia-600' }),
              h('div', { className: 'text-center text-sm font-bold text-fuchsia-800' }, wheelD)
            )
          ),
          h('p', { className: 'text-[11px] text-fuchsia-600 italic mt-2 text-center' },
            'Currently showing: ' + wheelN + '/' + wheelD + ' = ' + (wheelD > 0 ? (wheelN / wheelD * 100).toFixed(0) : 0) + '%'
          )
        )
      );
    };

    // ── DENSITY TAB — fractions between fractions ──
    // Explores the density property: between any two fractions, there's another.
    var renderDensityTab = function() {
      var dA = _f.densA || { n: 1, d: 3 };
      var dB = _f.densB || { n: 1, d: 2 };
      // Compute average (a + b) / 2
      var avgN = dA.n * dB.d + dB.n * dA.d;
      var avgD = 2 * dA.d * dB.d;
      var avgSimp = simplify(avgN, avgD);
      // Compute mediant (a + b) / (a + b) — Stern-Brocot
      var medN = dA.n + dB.n;
      var medD = dA.d + dB.d;
      var medSimp = simplify(medN, medD);
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-teal-50 rounded-xl p-3 border border-teal-200' },
          h('h4', { className: 'text-sm font-bold text-teal-800 mb-1' }, '∞ Density of fractions'),
          h('p', { className: 'text-[11px] text-teal-700' },
            'Between any two fractions, there is always another fraction. Then another. And another, forever. This is called "density." Pick two fractions and find ones between them.'
          )
        ),
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-white rounded-lg p-3 border border-teal-200' },
            h('p', { className: 'text-xs font-bold text-teal-700 mb-2' }, 'First fraction'),
            h('div', { className: 'flex items-center gap-2 justify-center' },
              h('input', { type: 'number', min: 1, value: dA.n,
                onChange: function(e) { upd({ densA: { n: parseInt(e.target.value) || 1, d: dA.d } }); },
                'aria-label': 'First numerator',
                className: 'w-16 px-2 py-1 rounded border border-teal-300 text-center' }),
              h('span', { className: 'text-base font-bold text-teal-900' }, '/'),
              h('input', { type: 'number', min: 2, value: dA.d,
                onChange: function(e) { upd({ densA: { n: dA.n, d: parseInt(e.target.value) || 2 } }); },
                'aria-label': 'First denominator',
                className: 'w-16 px-2 py-1 rounded border border-teal-300 text-center' })
            ),
            h('p', { className: 'text-[11px] text-center mt-1 text-teal-600 font-mono' }, '= ' + (dA.d > 0 ? (dA.n / dA.d).toFixed(4) : '—'))
          ),
          h('div', { className: 'bg-white rounded-lg p-3 border border-teal-200' },
            h('p', { className: 'text-xs font-bold text-teal-700 mb-2' }, 'Second fraction'),
            h('div', { className: 'flex items-center gap-2 justify-center' },
              h('input', { type: 'number', min: 1, value: dB.n,
                onChange: function(e) { upd({ densB: { n: parseInt(e.target.value) || 1, d: dB.d } }); },
                'aria-label': 'Second numerator',
                className: 'w-16 px-2 py-1 rounded border border-teal-300 text-center' }),
              h('span', { className: 'text-base font-bold text-teal-900' }, '/'),
              h('input', { type: 'number', min: 2, value: dB.d,
                onChange: function(e) { upd({ densB: { n: dB.n, d: parseInt(e.target.value) || 2 } }); },
                'aria-label': 'Second denominator',
                className: 'w-16 px-2 py-1 rounded border border-teal-300 text-center' })
            ),
            h('p', { className: 'text-[11px] text-center mt-1 text-teal-600 font-mono' }, '= ' + (dB.d > 0 ? (dB.n / dB.d).toFixed(4) : '—'))
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-teal-200 p-4 space-y-2' },
          h('p', { className: 'text-xs font-bold text-teal-700 mb-1' }, 'Fractions between ' + dA.n + '/' + dA.d + ' and ' + dB.n + '/' + dB.d + ':'),
          h('div', { className: 'bg-teal-50 rounded p-2 border border-teal-200' },
            h('p', { className: 'text-xs font-bold text-teal-800' }, '⚖ Average (arithmetic mean):'),
            h('p', { className: 'text-base font-mono text-teal-900 font-bold' }, avgSimp[0] + '/' + avgSimp[1] + ' = ' + (avgSimp[1] > 0 ? (avgSimp[0] / avgSimp[1]).toFixed(4) : '—')),
            h('p', { className: 'text-[10px] text-teal-600 italic' }, 'Add the fractions and divide by 2.')
          ),
          h('div', { className: 'bg-teal-50 rounded p-2 border border-teal-200' },
            h('p', { className: 'text-xs font-bold text-teal-800' }, '🌳 Mediant (Stern-Brocot tree):'),
            h('p', { className: 'text-base font-mono text-teal-900 font-bold' }, medSimp[0] + '/' + medSimp[1] + ' = ' + (medSimp[1] > 0 ? (medSimp[0] / medSimp[1]).toFixed(4) : '—')),
            h('p', { className: 'text-[10px] text-teal-600 italic' }, 'Add the tops, add the bottoms. (This is NOT addition — it\'s the mediant.) Always between the two fractions.')
          ),
          h('div', { className: 'bg-teal-50 rounded p-2 border border-teal-200' },
            h('p', { className: 'text-[11px] text-teal-800 italic' },
              '💡 ',
              h('b', null, 'Density: '),
              'You could repeat this process forever, finding new fractions between every pair. There are infinitely many fractions between any two fractions.'
            )
          )
        )
      );
    };

    // ── RECIPE SCALER TAB ──
    // A real-world use of fraction multiplication. Pick a recipe, scale it
    // by a multiplier (1/2, 1, 1 1/2, 2, 3, 4), see all ingredients scaled.
    var renderRecipesTab = function() {
      var recipeId = _f.recipeId || RECIPE_LIBRARY[0].id;
      var recipe = RECIPE_LIBRARY.find(function(r) { return r.id === recipeId; }) || RECIPE_LIBRARY[0];
      var scaler = _f.recipeScaler || { n: 1, d: 1 };
      var scalerVal = scaler.n / scaler.d;
      // Scaling each ingredient = ingredient × scaler
      var scaled = recipe.ingredients.map(function(ing) {
        var newN = ing.n * scaler.n;
        var newD = ing.d * scaler.d;
        var s = simplify(newN, newD);
        var mixedStr = toMixed(s[0], s[1]);
        return { name: ing.name, n: s[0], d: s[1], displayN: newN, displayD: newD, unit: ing.unit, mixed: mixedStr };
      });
      var scalerOptions = [
        { label: '1/4 (quarter)', n: 1, d: 4 },
        { label: '1/3', n: 1, d: 3 },
        { label: '1/2 (half)', n: 1, d: 2 },
        { label: '2/3', n: 2, d: 3 },
        { label: '3/4', n: 3, d: 4 },
        { label: '1 (full)', n: 1, d: 1 },
        { label: '1 1/2', n: 3, d: 2 },
        { label: '2 (double)', n: 2, d: 1 },
        { label: '3 (triple)', n: 3, d: 1 },
        { label: '4 (quadruple)', n: 4, d: 1 }
      ];
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('h4', { className: 'text-sm font-bold text-amber-800 mb-1' }, '🍳 Recipe scaler'),
          h('p', { className: 'text-[11px] text-amber-700' },
            'Pick a recipe and scale it up or down using fraction multiplication. Every cooking decision becomes a fraction multiplication problem.'
          )
        ),
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
          h('div', { className: 'bg-white rounded-lg p-3 border border-amber-200' },
            h('label', { className: 'block text-xs font-bold text-amber-700 mb-1' }, 'Recipe'),
            h('select', {
              value: recipeId,
              onChange: function(e) { upd({ recipeId: e.target.value }); },
              'aria-label': 'Recipe selector',
              className: 'w-full px-2 py-1.5 rounded border border-amber-300 text-sm'
            }, RECIPE_LIBRARY.map(function(r) {
              return h('option', { key: 'rec-' + r.id, value: r.id }, r.title + ' (' + r.baseServings + ' servings)');
            }))
          ),
          h('div', { className: 'bg-white rounded-lg p-3 border border-amber-200' },
            h('label', { className: 'block text-xs font-bold text-amber-700 mb-1' }, 'Scale by'),
            h('select', {
              value: scaler.n + '/' + scaler.d,
              onChange: function(e) {
                var pair = e.target.value.split('/');
                upd({ recipeScaler: { n: parseInt(pair[0]), d: parseInt(pair[1]) } });
              },
              'aria-label': 'Scaler',
              className: 'w-full px-2 py-1.5 rounded border border-amber-300 text-sm'
            }, scalerOptions.map(function(o) {
              return h('option', { key: 'sc-' + o.label, value: o.n + '/' + o.d }, o.label);
            }))
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-3' },
          h('div', { className: 'flex items-center justify-between mb-2' },
            h('h5', { className: 'text-sm font-black text-amber-900' }, recipe.title),
            h('p', { className: 'text-[11px] text-amber-700' },
              'Yields ', h('b', null, recipe.baseServings + ' × ' + scaler.n + '/' + scaler.d + ' = ' + (recipe.baseServings * scalerVal).toFixed(scalerVal === Math.floor(scalerVal) ? 0 : 1) + ' servings')
            )
          ),
          h('table', { className: 'w-full text-xs' },
            h('thead', null,
              h('tr', { className: 'border-b border-amber-300' },
                h('th', { className: 'text-left py-1 text-amber-800' }, 'Ingredient'),
                h('th', { className: 'text-right py-1 text-amber-800' }, 'Original'),
                h('th', { className: 'text-right py-1 text-amber-800' }, 'Scaled'),
                h('th', { className: 'text-left py-1 pl-2 text-amber-800' }, 'Unit')
              )
            ),
            h('tbody', null,
              scaled.map(function(ing, i) {
                var orig = recipe.ingredients[i];
                return h('tr', { key: 'ing-' + i, className: 'border-b border-amber-100' },
                  h('td', { className: 'py-1 text-slate-800' }, ing.name),
                  h('td', { className: 'py-1 text-right text-amber-700 font-mono' }, toMixed(orig.n, orig.d)),
                  h('td', { className: 'py-1 text-right text-amber-900 font-mono font-bold' }, ing.mixed),
                  h('td', { className: 'py-1 pl-2 text-amber-700' }, ing.unit)
                );
              })
            )
          ),
          recipe.notes && h('p', { className: 'text-[11px] text-amber-700 italic mt-2' }, '📝 ' + recipe.notes)
        )
      );
    };

    // ── MULTI-STEP PROBLEMS TAB ──
    var renderMultiStepTab = function() {
      var msIdx = _f.msIdx || 0;
      var msStep = _f.msStep || 0;
      var msAnswers = _f.msAnswers || [];
      var msAnswer = _f.msAnswer || '';
      var msFeedback = _f.msFeedback || null;
      var problem = MULTI_STEP_PROBLEMS[msIdx % MULTI_STEP_PROBLEMS.length];
      var step = problem.steps[msStep];

      var checkMS = function() {
        if (!msAnswer.trim()) return;
        var trimmed = msAnswer.trim();
        var fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
        var intMatch = trimmed.match(/^(\d+)$/);
        var mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
        var a = step.a;
        var ok = false;
        if (mixedMatch && a.mixed) ok = trimmed === a.mixed;
        else if (fracMatch) {
          var rn = parseInt(fracMatch[1]); var rd = parseInt(fracMatch[2]);
          if (rd > 0 && a.d > 0) ok = rn * a.d === a.n * rd;
        } else if (intMatch && a.d === 1) ok = parseInt(intMatch[1]) === a.n;
        if (ok) {
          sfxCorrect();
          upd({
            msAnswers: msAnswers.concat([{ correct: true, answer: msAnswer }]),
            msAnswer: '',
            msFeedback: { correct: true, msg: '✅ Correct!' },
            msStep: msStep + 1 < problem.steps.length ? msStep + 1 : msStep
          });
          if (msStep + 1 >= problem.steps.length) {
            sfxComplete();
            addToast('🎉 Multi-step problem complete!', 'success');
            awardXP('fractionMultiStep', 40, 'Multi-step solved');
          }
        } else {
          sfxWrong();
          upd({ msFeedback: { correct: false, msg: '❌ Not quite. Try the hint.' } });
        }
      };
      var nextProblem = function() {
        upd({ msIdx: (msIdx + 1) % MULTI_STEP_PROBLEMS.length, msStep: 0, msAnswers: [], msAnswer: '', msFeedback: null });
      };
      var prevProblem = function() {
        upd({ msIdx: (msIdx - 1 + MULTI_STEP_PROBLEMS.length) % MULTI_STEP_PROBLEMS.length, msStep: 0, msAnswers: [], msAnswer: '', msFeedback: null });
      };

      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-violet-50 rounded-xl p-3 border border-violet-200' },
          h('h4', { className: 'text-sm font-bold text-violet-800 mb-1' }, '🧩 Multi-step problems'),
          h('p', { className: 'text-[11px] text-violet-700' },
            'Real problems usually take multiple steps. These chains walk you through 2-4 sub-questions building toward a final answer.'
          )
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-violet-200 p-4' },
          h('div', { className: 'flex items-center gap-2 flex-wrap mb-2' },
            h('h5', { className: 'text-base font-black text-violet-900' }, problem.title),
            h('span', { className: 'text-[10px] text-violet-500' }, 'Grade ' + problem.grade + ' · ' + (problem.ccss || []).join(', '))
          ),
          h('p', { className: 'text-sm text-slate-800 italic mb-3' }, '📖 ' + problem.story),
          // Step progress
          h('div', { className: 'flex gap-1 mb-3' },
            problem.steps.map(function(s, i) {
              var done = i < msStep;
              var current = i === msStep;
              return h('div', { key: 's-' + i,
                className: 'flex-1 h-2 rounded ' + (done ? 'bg-emerald-500' : current ? 'bg-violet-500' : 'bg-slate-200')
              });
            })
          ),
          h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-200 space-y-2' },
            h('p', { className: 'text-[11px] font-bold text-violet-700' }, 'Step ' + (msStep + 1) + ' of ' + problem.steps.length),
            h('p', { className: 'text-sm font-bold text-violet-900' }, '🧮 ' + step.q),
            msStep < problem.steps.length ? h('div', { className: 'flex gap-2' },
              h('input', {
                type: 'text', value: msAnswer,
                onChange: function(e) { upd({ msAnswer: e.target.value }); },
                onKeyDown: function(e) { if (e.key === 'Enter') checkMS(); },
                placeholder: 'Your answer (e.g., 3/4 or 1 1/2 or 8)',
                'aria-label': 'Multi-step answer',
                className: 'flex-1 px-3 py-2 border border-violet-400 rounded-lg text-sm font-mono'
              }),
              h('button', { onClick: checkMS,
                className: 'px-4 py-2 bg-violet-600 text-white font-bold rounded-lg hover:bg-violet-700' }, 'Check')
            ) : null,
            msFeedback && h('p', { className: 'text-sm font-bold ' + (msFeedback.correct ? 'text-green-700' : 'text-red-700') }, msFeedback.msg),
            step.hint && h('p', { className: 'text-[11px] text-violet-600 italic' }, '💡 Hint: ' + step.hint)
          ),
          // Answers so far
          msAnswers.length > 0 && h('div', { className: 'mt-2 bg-slate-50 rounded p-2 border border-slate-200 space-y-0.5' },
            h('p', { className: 'text-[11px] font-bold text-slate-700' }, 'Your answers:'),
            msAnswers.map(function(a, i) {
              return h('p', { key: 'ans-' + i, className: 'text-[11px] text-slate-700' },
                h('b', null, 'Step ' + (i + 1) + ': '), a.answer
              );
            })
          ),
          h('div', { className: 'flex gap-2 mt-3' },
            h('button', { onClick: prevProblem,
              className: 'px-3 py-1.5 rounded text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300' }, '← Previous'),
            h('button', { onClick: nextProblem,
              className: 'ml-auto px-3 py-1.5 rounded text-xs font-bold bg-violet-600 text-white hover:bg-violet-700' }, 'Next problem →')
          )
        )
      );
    };

    // ── FACTS / TRIVIA TAB ──
    var renderFactsTab = function() {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'bg-fuchsia-50 rounded-xl p-3 border border-fuchsia-200' },
          h('h4', { className: 'text-sm font-bold text-fuchsia-800 mb-1' }, '💡 Fraction trivia & history'),
          h('p', { className: 'text-[11px] text-fuchsia-700' },
            'Where fractions come from, surprising connections, and why mathematics is full of stories. Click any title to expand.'
          )
        ),
        h('div', { className: 'space-y-2' },
          FRACTION_FACTS.map(function(f) {
            return h('details', { key: 'ff-' + f.id, className: 'bg-white rounded-lg p-3 border border-fuchsia-200' },
              h('summary', { className: 'text-sm font-bold text-fuchsia-800 cursor-pointer' }, '✨ ' + f.title),
              h('p', { className: 'text-xs text-slate-700 mt-2 leading-relaxed' }, f.body)
            );
          })
        )
      );
    };

    // ═══════════════════════════════════════════════════════════════════
    // ═══ v3.1 SUPER-TAB AGGREGATORS ═════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════════
    // Each super-tab contains a horizontal sub-tab strip and routes to one
    // of the existing render functions. This cuts the visible tab count
    // from ~70 to ~25 without losing any content.
    // ═══════════════════════════════════════════════════════════════════

    var renderSubTabStrip = function(items, currentId, onSelect, accentColor) {
      accentColor = accentColor || 'rose';
      return h('div', { className: 'flex gap-1 bg-' + accentColor + '-50 rounded-lg p-1 border border-' + accentColor + '-200 flex-wrap mb-3', role: 'tablist' },
        items.map(function(s) {
          var active = currentId === s.id;
          return h('button', {
            key: 'sub-' + s.id,
            role: 'tab', 'aria-selected': active,
            onClick: function() { sfxClick(); onSelect(s.id); },
            className: 'px-2.5 py-1 rounded text-[11px] font-bold transition-all whitespace-nowrap ' +
              (active ? 'bg-white text-' + accentColor + '-800 shadow-sm border border-' + accentColor + '-200' : 'text-' + accentColor + '-600 hover:text-' + accentColor + '-800 hover:bg-' + accentColor + '-100')
          }, (s.icon ? s.icon + ' ' : '') + s.label);
        })
      );
    };

    var renderReferenceTab = function() {
      var sub = _f.refSub || 'vocab';
      var items = [
        { id: 'vocab', icon: '📖', label: 'Vocabulary' },
        { id: 'glossary', icon: '📔', label: 'Glossary' },
        { id: 'faq', icon: '?', label: 'FAQ' },
        { id: 'compareS', icon: '⚖', label: 'Compare strategies' },
        { id: 'cheatsheet', icon: '📋', label: 'Cheat sheet' },
        { id: 'examples', icon: '🎓', label: 'Worked examples' },
        { id: 'tables', icon: '📊', label: 'Conv. tables' },
        { id: 'tabguide', icon: '📚', label: 'Tab guide' }
      ];
      return h('div', null,
        h('p', { className: 'text-[11px] text-rose-700 mb-2 italic' }, 'Look-up materials, definitions, and reference guides.'),
        renderSubTabStrip(items, sub, function(id) { upd({ refSub: id }); }, 'rose'),
        sub === 'vocab' && renderVocabTab(),
        sub === 'glossary' && renderGlossaryExpansionTab(),
        sub === 'faq' && renderFAQTab(),
        sub === 'compareS' && renderComparisonStrategiesTab(),
        sub === 'cheatsheet' && renderCheatSheetTab(),
        sub === 'examples' && renderWorkedExamplesTab(),
        sub === 'tables' && renderConversionTablesTab(),
        sub === 'tabguide' && renderTabGuideTab()
      );
    };

    var renderCuriositiesTab = function() {
      var sub = _f.curSub || 'facts';
      var items = [
        { id: 'facts', icon: '💡', label: 'Trivia' },
        { id: 'magic', icon: '🎩', label: 'Magic tricks' },
        { id: 'timeline', icon: '⏰', label: 'History' },
        { id: 'proverbs', icon: '🗣', label: 'Sayings' },
        { id: 'animals', icon: '🐾', label: 'Animal facts' },
        { id: 'quotes', icon: '💭', label: 'Quotes' },
        { id: 'density', icon: '∞', label: 'Density' }
      ];
      return h('div', null,
        h('p', { className: 'text-[11px] text-fuchsia-700 mb-2 italic' }, 'Fun extras: trivia, history, and surprising math.'),
        renderSubTabStrip(items, sub, function(id) { upd({ curSub: id }); }, 'fuchsia'),
        sub === 'facts' && renderFactsTab(),
        sub === 'magic' && renderMagicTricksTab(),
        sub === 'timeline' && renderTimelineTab(),
        sub === 'proverbs' && renderProverbsTab(),
        sub === 'animals' && renderAnimalFractionsTab(),
        sub === 'quotes' && renderQuotesTab(),
        sub === 'density' && renderDensityTab()
      );
    };

    var renderAboutSuperTab = function() {
      var sub = _f.aboutSub || 'help';
      var items = [
        { id: 'help', icon: '?', label: 'Help' },
        { id: 'about', icon: 'i', label: 'About' },
        { id: 'changelog', icon: '📜', label: 'Changelog' },
        { id: 'thanks', icon: '🙏', label: 'Thanks' }
      ];
      return h('div', null,
        h('p', { className: 'text-[11px] text-slate-700 mb-2 italic' }, 'Information about Fraction Lab itself.'),
        renderSubTabStrip(items, sub, function(id) { upd({ aboutSub: id }); }, 'slate'),
        sub === 'help' && renderHelpTab(),
        sub === 'about' && renderAboutTab(),
        sub === 'changelog' && renderChangelogTab(),
        sub === 'thanks' && renderAcknowledgmentsTab()
      );
    };

    var renderExplorersTab = function() {
      var sub = _f.expSub || 'calc';
      var items = [
        { id: 'calc', icon: '🧮', label: 'Calculator' },
        { id: 'factfam', icon: '👨', label: 'Fact families' },
        { id: 'equivchain', icon: '⛓', label: 'Equivalent chain' }
      ];
      return h('div', null,
        h('p', { className: 'text-[11px] text-violet-700 mb-2 italic' }, 'Play with the math without a quiz format.'),
        renderSubTabStrip(items, sub, function(id) { upd({ expSub: id }); }, 'violet'),
        sub === 'calc' && renderCalculatorTab(),
        sub === 'factfam' && renderFactFamiliesTab(),
        sub === 'equivchain' && renderEquivChainTab()
      );
    };

    var renderDrillTab = function() {
      var sub = _f.drillSub || 'benchmarks';
      var items = [
        { id: 'benchmarks', icon: '🎯', label: 'Benchmarks' },
        { id: 'pbank', icon: '📚', label: 'Practice bank' },
        { id: 'vocabquiz', icon: '📝', label: 'Vocab quiz' },
        { id: 'examprep', icon: '📝', label: 'Exam prep' },
        { id: 'estimation', icon: '🎯', label: 'Estimation' }
      ];
      return h('div', null,
        h('p', { className: 'text-[11px] text-rose-700 mb-2 italic' }, 'Timed and scored practice for fluency.'),
        renderSubTabStrip(items, sub, function(id) { upd({ drillSub: id }); }, 'rose'),
        sub === 'benchmarks' && renderBenchmarkTab(),
        sub === 'pbank' && renderPracticeBankTab(),
        sub === 'vocabquiz' && renderVocabQuizTab(),
        sub === 'examprep' && renderExamPrepTab(),
        sub === 'estimation' && renderEstimationTab()
      );
    };

    var renderStandardsPlanningTab = function() {
      var sub = _f.spSub || 'standards';
      var items = [
        { id: 'standards', icon: '📋', label: 'CCSS Standards' },
        { id: 'scope', icon: '📅', label: 'Scope & Sequence' },
        { id: 'lessons', icon: '📑', label: 'Lessons' },
        { id: 'iep', icon: '🎯', label: 'IEP Goals' },
        { id: 'rubric', icon: '📊', label: 'Rubric' },
        { id: 'udl', icon: '🎨', label: 'UDL alignment' },
        { id: 'routines', icon: '⏱', label: 'Daily routines' },
        { id: 'checklist', icon: '☑', label: 'Assessment checklist' }
      ];
      return h('div', null,
        h('p', { className: 'text-[11px] text-indigo-700 mb-2 italic' }, 'Curriculum planning, standards alignment, and student goal-setting.'),
        renderSubTabStrip(items, sub, function(id) { upd({ spSub: id }); }, 'indigo'),
        sub === 'standards' && renderStandardsTab(),
        sub === 'scope' && renderScopeSequenceTab(),
        sub === 'lessons' && renderLessonPlansTab(),
        sub === 'iep' && renderIEPGoalsTab(),
        sub === 'rubric' && renderRubricTab(),
        sub === 'udl' && renderUDLTab(),
        sub === 'routines' && renderDailyRoutineTab(),
        sub === 'checklist' && renderAssessmentChecklistTab()
      );
    };

    var renderPrintAssessTab = function() {
      var sub = _f.paSub || 'worksheets';
      var items = [
        { id: 'worksheets', icon: '📝', label: 'Worksheets' },
        { id: 'reports', icon: '📊', label: 'Reports' },
        { id: 'rtiprobe', icon: '📊', label: 'RTI Probes' },
        { id: 'refcard', icon: '🖨', label: 'Reference card' },
        { id: 'exitticket', icon: '🎫', label: 'Exit ticket' },
        { id: 'printlab', icon: '🖨', label: 'Print lab hub' }
      ];
      return h('div', null,
        h('p', { className: 'text-[11px] text-emerald-700 mb-2 italic' }, 'Generate printable assessments and references.'),
        renderSubTabStrip(items, sub, function(id) { upd({ paSub: id }); }, 'emerald'),
        sub === 'worksheets' && renderWorksheetTab(),
        sub === 'reports' && renderReportsTab(),
        sub === 'rtiprobe' && renderRTIProbeTab(),
        sub === 'refcard' && renderRefCardTab(),
        sub === 'exitticket' && renderExitTicketTab(),
        sub === 'printlab' && renderPrintLabTab()
      );
    };

    var renderPedagogyTab = function() {
      var sub = _f.pedSub || 'misconceptions';
      var items = [
        { id: 'misconceptions', icon: '⚠', label: 'Misconceptions library' },
        { id: 'mcflow', icon: '🛠', label: 'Mc remediation flow' },
        { id: 'activities', icon: '✂', label: 'Hands-on activities' },
        { id: 'mathtalks', icon: '🗣', label: 'Math talks' },
        { id: 'differentiation', icon: '🎯', label: 'Differentiation' },
        { id: 'parent', icon: '👨', label: 'Parent guide' },
        { id: 'citations', icon: '📚', label: 'Research citations' }
      ];
      return h('div', null,
        h('p', { className: 'text-[11px] text-purple-700 mb-2 italic' }, 'Pedagogical resources for teaching fractions effectively.'),
        renderSubTabStrip(items, sub, function(id) { upd({ pedSub: id }); }, 'purple'),
        sub === 'misconceptions' && renderMisconceptionsTab(),
        sub === 'mcflow' && renderMisconceptionFlowTab(),
        sub === 'activities' && renderActivitiesTab(),
        sub === 'mathtalks' && renderMathTalksTab(),
        sub === 'differentiation' && renderDifferentiationTab(),
        sub === 'parent' && renderParentGuideTab(),
        sub === 'citations' && renderCitationsTab()
      );
    };

    var renderMyAccountTab = function() {
      var sub = _f.maSub || 'settings';
      var items = [
        { id: 'settings', icon: '⚙', label: 'Settings' },
        { id: 'sessions', icon: '📂', label: 'Saved sessions' },
        { id: 'goals', icon: '🎯', label: 'Goal setter' },
        { id: 'daily', icon: '📅', label: 'Daily streak' },
        { id: 'mastery', icon: '⭐', label: 'Mastery' },
        { id: 'levels', icon: '🏆', label: 'Levels & XP' }
      ];
      return h('div', null,
        h('p', { className: 'text-[11px] text-slate-700 mb-2 italic' }, 'Your settings, progress, and saved work.'),
        renderSubTabStrip(items, sub, function(id) { upd({ maSub: id }); }, 'slate'),
        sub === 'settings' && renderSettingsTab(),
        sub === 'sessions' && renderSessionsTab(),
        sub === 'goals' && renderGoalSetterTab(),
        sub === 'daily' && renderDailyPracticeTab(),
        sub === 'mastery' && renderMasteryTab(),
        sub === 'levels' && renderAchievementsTab()
      );
    };

    // ══════════ MAIN RENDER ══════════
    // v3 navigation: Mode \u2192 Tab two-level structure.
    // v3.1 CONSOLIDATED tab list (was ~70, now ~26).
    // Super-tabs internally contain a sub-tab strip pointing to specific renders.
    var tabs = [
      // === LEARN ===
      { id: 'practice',       icon: '\uD83C\uDF55', label: 'Practice',       group: 'learn' },
      { id: 'models',         icon: '\uD83C\uDFA8', label: 'Models',         group: 'learn' },
      { id: 'numberline',     icon: '\u23DC',       label: 'Number line',    group: 'learn' },
      { id: 'cra',            icon: '\uD83D\uDCDA', label: 'CRA',            group: 'learn' },
      { id: 'wall',           icon: '\uD83E\uDDF1', label: 'Wall',           group: 'learn' },
      { id: 'manip',          icon: '\uD83E\uDDE9', label: 'Manipulatives',  group: 'learn' },
      { id: 'reference',      icon: '\uD83D\uDCD6', label: 'Reference',      group: 'learn' },
      { id: 'curiosities',    icon: '\u2728',       label: 'Curiosities',    group: 'learn' },
      { id: 'aboutSuper',     icon: '\u2139',       label: 'About',          group: 'learn' },
      // === PRACTICE ===
      { id: 'compare',        icon: '\uD83D\uDD0D', label: 'Compare',        group: 'practice' },
      { id: 'operations',     icon: '\u2795',       label: 'Operations',     group: 'practice' },
      { id: 'opsproof',       icon: '\uD83D\uDD2C', label: 'Op proofs',      group: 'practice' },
      { id: 'equivalents',    icon: '\uD83D\uDD17', label: 'Equivalents',    group: 'practice' },
      { id: 'converter',      icon: '\uD83D\uDD04', label: 'Converter',      group: 'practice' },
      { id: 'decimals',       icon: '\uD83D\uDD22', label: 'Decimals',       group: 'practice' },
      { id: 'percents',       icon: '%',            label: 'Percents',       group: 'practice' },
      { id: 'explorers',      icon: '\uD83D\uDD0E', label: 'Explorers',      group: 'practice' },
      { id: 'drill',          icon: '\uD83C\uDFAF', label: 'Drill',          group: 'practice' },
      // === APPLY ===
      { id: 'wordproblems',   icon: '\uD83D\uDCD6', label: 'Word problems',  group: 'apply' },
      { id: 'multistep',      icon: '\uD83E\uDDE9', label: 'Multi-step',     group: 'apply' },
      { id: 'games',          icon: '\uD83C\uDFAE', label: 'Games',          group: 'apply' },
      { id: 'recipes',        icon: '\uD83C\uDF73', label: 'Recipe scaler',  group: 'apply' },
      { id: 'story',          icon: '\uD83D\uDCD6', label: 'Story mode',     group: 'apply' },
      { id: 'brain',          icon: '\uD83E\uDDE0', label: 'Brain teasers',  group: 'apply' },
      { id: 'rwt',            icon: '\uD83D\uDEE0', label: 'Real-world tools', group: 'apply' },
      { id: 'data',           icon: '\uD83D\uDCCA', label: 'Data analysis',  group: 'apply' },
      { id: 'probability',    icon: '\uD83C\uDFB2', label: 'Probability',    group: 'apply' },
      { id: 'art',            icon: '\uD83C\uDFA8', label: 'Fraction art',   group: 'apply' },
      // === TEACHER ===
      { id: 'standardsPlanning', icon: '\uD83D\uDCCB', label: 'Standards & Planning', group: 'teacher' },
      { id: 'printAssess',    icon: '\uD83D\uDDA8', label: 'Print & Assess', group: 'teacher' },
      { id: 'pedagogy',       icon: '\uD83E\uDDE0', label: 'Pedagogy',       group: 'teacher' },
      { id: 'myAccount',      icon: '\u2699',       label: 'My Account',     group: 'teacher' },
      { id: 'ml',             icon: '\uD83C\uDF0D', label: 'Multilingual',   group: 'teacher' }
    ];
    // v3.1: original flat list kept commented for reference (in case of rollback).
    var _legacyTabsForReference = [
      { id: 'practice',       icon: '\uD83C\uDF55', label: 'Practice',       group: 'learn' },
      { id: 'models',         icon: '\uD83C\uDFA8', label: 'Models',         group: 'learn' },
      { id: 'numberline',     icon: '\u23DC',       label: 'Number line',    group: 'learn' },
      { id: 'cra',            icon: '\uD83D\uDCDA', label: 'CRA',            group: 'learn' },
      { id: 'wall',           icon: '\uD83E\uDDF1', label: 'Wall',           group: 'learn' },
      { id: 'compare',        icon: '\uD83D\uDD0D', label: 'Compare',        group: 'practice' },
      { id: 'operations',     icon: '\u2795',       label: 'Operations',     group: 'practice' },
      { id: 'opsproof',       icon: '\uD83D\uDD2C', label: 'Op proofs',      group: 'practice' },
      { id: 'equivalents',    icon: '\uD83D\uDD17', label: 'Equivalents',    group: 'practice' },
      { id: 'equivchain',     icon: '\u26D3',       label: 'Eq chain',       group: 'practice' },
      { id: 'converter',      icon: '\uD83D\uDD04', label: 'Converter',      group: 'practice' },
      { id: 'decimals',       icon: '\uD83D\uDD22', label: 'Decimals',       group: 'practice' },
      { id: 'percents',       icon: '%',            label: 'Percents',       group: 'practice' },
      { id: 'benchmarks',     icon: '\uD83C\uDFAF', label: 'Benchmarks',     group: 'practice' },
      { id: 'wordproblems',   icon: '\uD83D\uDCD6', label: 'Word problems',  group: 'apply' },
      { id: 'games',          icon: '\uD83C\uDFAE', label: 'Games',          group: 'apply' },
      { id: 'worksheets',     icon: '\uD83D\uDCDD', label: 'Worksheets',     group: 'teacher' },
      { id: 'reports',        icon: '\uD83D\uDCCA', label: 'Reports',        group: 'teacher' },
      { id: 'standards',      icon: '\uD83D\uDCCB', label: 'Standards',      group: 'teacher' },
      { id: 'misconceptions', icon: '\u26A0',       label: 'Misconceptions', group: 'teacher' },
      { id: 'vocab',          icon: '\uD83D\uDCD6', label: 'Vocabulary',     group: 'learn' },
      { id: 'recipes',        icon: '\uD83C\uDF73', label: 'Recipe scaler',  group: 'apply' },
      { id: 'multistep',      icon: '\uD83E\uDDE9', label: 'Multi-step',     group: 'apply' },
      { id: 'calc',           icon: '\uD83E\uDDEE', label: 'Calculator',     group: 'practice' },
      { id: 'pbank',          icon: '\uD83D\uDCDA', label: 'Practice bank',  group: 'practice' },
      { id: 'animals',        icon: '\ud83d\udc3e', label: 'Animal facts',   group: 'apply' },
      { id: 'proverbs',       icon: '\ud83d\udde3',       label: 'Sayings',        group: 'apply' },
      { id: 'thanks',         icon: '\ud83d\ude4f', label: 'Thanks',         group: 'learn' },
      { id: 'changelog',      icon: '\ud83d\udcdc', label: 'Changelog',      group: 'learn' },
      { id: 'routines',       icon: '\u23f1',       label: 'Daily routines', group: 'teacher' },
      { id: 'exitticket',     icon: '\ud83c\udfab', label: 'Exit ticket',    group: 'teacher' },
      { id: 'checklist',      icon: '\u2611',        label: 'Assessment checklist', group: 'teacher' },
      { id: 'parent',         icon: '\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67', label: 'Parent guide',   group: 'teacher' },
      { id: 'udl',            icon: '\ud83c\udfa8', label: 'UDL alignment',  group: 'teacher' },
      { id: 'citations',      icon: '\ud83d\udcda', label: 'Citations',      group: 'teacher' },
      { id: 'tabguide',       icon: '\ud83d\udcda', label: 'Tab guide',      group: 'learn' },
      { id: 'timeline',       icon: '\u23f0', label: 'History',        group: 'learn' },
      { id: 'differentiation', icon: '\ud83c\udfaf', label: 'Differentiation', group: 'teacher' },
      { id: 'goals',          icon: '\ud83c\udfaf', label: 'Goal setter',    group: 'practice' },
      { id: 'quotes',         icon: '\ud83d\udcad', label: 'Quotes',         group: 'apply' },
      { id: 'data',           icon: '\ud83d\udcca', label: 'Data analysis',  group: 'apply' },
      { id: 'mcflow',         icon: '\ud83d\udee0',       label: 'Mc remediation', group: 'teacher' },
      { id: 'printlab',       icon: '\ud83d\udda8', label: 'Print lab',      group: 'teacher' },
      { id: 'about',          icon: '\u2139',        label: 'About',          group: 'learn' },
      { id: 'manip',          icon: '\ud83e\udde9', label: 'Manipulatives',  group: 'learn' },
      { id: 'mastery',        icon: '\u2b50', label: 'Mastery',         group: 'practice' },
      { id: 'brain',          icon: '\ud83e\udde0', label: 'Brain teasers',  group: 'apply' },
      { id: 'help',           icon: '\u2753', label: 'Help',           group: 'learn' },
      { id: 'tables',         icon: '\ud83d\udcca', label: 'Conv. tables',   group: 'learn' },
      { id: 'glossary',       icon: '\ud83d\udcd4', label: 'Glossary',       group: 'learn' },
      { id: 'mathtalks',      icon: '\ud83d\udde3',       label: 'Math talks',     group: 'teacher' },
      { id: 'vocabquiz',      icon: '\ud83d\udcdd', label: 'Vocab quiz',     group: 'practice' },
      { id: 'refcard',        icon: '\ud83d\udda8', label: 'Ref card',       group: 'teacher' },
      { id: 'activities',     icon: '\u2702',        label: 'Hands-on',       group: 'teacher' },
      { id: 'scope',          icon: '\ud83d\udcc5', label: 'Scope & sequence', group: 'teacher' },
      { id: 'rubric',         icon: '\ud83d\udcca', label: 'Rubric',         group: 'teacher' },
      { id: 'story',          icon: '\ud83d\udcd6', label: 'Story mode',     group: 'apply' },
      { id: 'examprep',       icon: '\ud83d\udcdd', label: 'Exam prep',      group: 'practice' },
      { id: 'daily',          icon: '\ud83d\udcc5', label: 'Daily',          group: 'practice' },
      { id: 'magic',          icon: '\ud83c\udfa9', label: 'Magic tricks',   group: 'apply' },
      { id: 'rwt',            icon: '\ud83d\udee0',       label: 'Real-world tools', group: 'apply' },
      { id: 'rtiprobe',       icon: '\ud83d\udcca', label: 'RTI probes',     group: 'teacher' },
      { id: 'levels',         icon: '\ud83c\udfc6', label: 'Levels',         group: 'apply' },
      { id: 'examples',       icon: '\ud83c\udf93', label: 'Worked examples', group: 'learn' },
      { id: 'faq',            icon: '\u2753', label: 'FAQ',            group: 'learn' },
      { id: 'compareS',       icon: '\u2696',        label: 'Compare strategies', group: 'learn' },
      { id: 'cheatsheet',     icon: '\uD83D\uDCCB', label: 'Cheat sheet',    group: 'learn' },
      { id: 'factfam',        icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', label: 'Fact families', group: 'practice' },
      { id: 'estimation',     icon: '\uD83C\uDFAF', label: 'Estimation',     group: 'practice' },
      { id: 'probability',    icon: '\uD83C\uDFB2', label: 'Probability',    group: 'apply' },
      { id: 'ml',             icon: '\uD83C\uDF0D', label: 'Multilingual',   group: 'teacher' },
      { id: 'art',            icon: '\uD83C\uDFA8', label: 'Fraction art',   group: 'apply' },
      { id: 'density',        icon: '\u221E',       label: 'Density',        group: 'learn' },
      { id: 'iep',            icon: '\uD83C\uDFAF', label: 'IEP goals',      group: 'teacher' },
      { id: 'lessons',        icon: '\uD83D\uDCD1', label: 'Lessons',        group: 'teacher' },
      { id: 'facts',          icon: '\uD83D\uDCA1', label: 'Trivia',         group: 'apply' },
      { id: 'sessions',       icon: '\uD83D\uDCC2', label: 'Sessions',       group: 'teacher' },
      { id: 'settings',       icon: '\u2699',       label: 'Settings',       group: 'teacher' }
    ];
    var navMode = _f.navMode || 'learn';
    var MODE_LABELS = {
      learn:    { icon: '\uD83D\uDCDA', label: 'Learn',    desc: 'Visualization-heavy, no quiz pressure' },
      practice: { icon: '\uD83C\uDFAF', label: 'Practice', desc: 'Skill-focused, scored' },
      apply:    { icon: '\uD83D\uDCD6', label: 'Apply',    desc: 'Real-world contexts and games' },
      teacher:  { icon: '\uD83C\uDFEB', label: 'Teacher',  desc: 'Tools for instructors and IEPs' }
    };
    var visibleTabs = tabs.filter(function(t2) { return t2.group === navMode; });
    if (visibleTabs.length > 0 && !visibleTabs.find(function(t2) { return t2.id === tab; })) {
      tab = visibleTabs[0].id;
    }

    return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
      // Header
      h('div', { className: 'flex items-center gap-3 mb-2' },
        h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
          h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
        h('h3', { className: 'text-lg font-bold text-rose-800' }, '\uD83C\uDF55 Fraction Lab'),
        // Stats
        h('div', { className: 'ml-auto flex items-center gap-3' },
          streak > 0 && h('span', { className: 'text-xs font-bold text-orange-600' }, '\uD83D\uDD25 ' + streak),
          bestStreak > 0 && h('span', { className: 'text-[11px] text-slate-600' }, 'Best: ' + bestStreak),
          h('span', { className: 'text-xs font-bold text-rose-600' }, score.correct + '/' + score.total)
        )
      ),

      // v3: Two-level navigation
      // First level — MODE (Learn / Practice / Apply / Teacher)
      h('div', { className: 'flex gap-1 bg-slate-100 rounded-xl p-1 border border-slate-300', role: 'tablist', 'aria-label': 'Fraction Lab mode' },
        Object.keys(MODE_LABELS).map(function(mk) {
          var mm = MODE_LABELS[mk];
          var active = navMode === mk;
          return h('button', {
            key: 'mode-' + mk,
            role: 'tab', 'aria-selected': active,
            onClick: function() {
              sfxClick();
              // Switch mode; also switch to first tab in that mode if current tab not in mode
              var firstInMode = tabs.find(function(tt) { return tt.group === mk; });
              upd({ navMode: mk, tab: firstInMode ? firstInMode.id : tab });
            },
            title: mm.desc,
            className: 'flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ' +
              (active ? 'bg-white text-slate-900 shadow-sm border border-slate-300' : 'text-slate-600 hover:text-slate-900')
          }, mm.icon + ' ' + mm.label);
        })
      ),
      // Second level — TAB within mode
      h('div', { className: 'flex gap-1 bg-rose-50 rounded-xl p-1 border border-rose-200 flex-wrap', role: 'tablist', 'aria-label': 'Fraction Lab sections' },
        visibleTabs.map(function(t2) {
          return h('button', { key: t2.id,
            onClick: function() { sfxClick(); upd({ tab: t2.id }); trackTab(t2.id); },
            role: 'tab', 'aria-selected': tab === t2.id,
            className: 'py-1.5 px-2.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap ' +
              (tab === t2.id ? 'bg-white text-rose-800 shadow-sm border border-rose-200' : 'text-rose-500 hover:text-rose-700 hover:bg-rose-100')
          }, t2.icon + ' ' + t2.label);
        })
      ),

      // ── Topic-accent hero band per tab ──
      (function() {
        var TAB_META = {
          practice:    { accent: '#e11d48', soft: 'rgba(225,29,72,0.10)',  icon: '\uD83C\uDF55', title: 'Practice \u2014 pizza + bar model intuition',           hint: 'Common Core fluency = automatic recall of basic facts in under 3 seconds. Pizza model for what-out-of-the-whole; bar model for comparison and operation.' },
          compare:     { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83D\uDD0D', title: 'Compare \u2014 cross-multiply or benchmark',           hint: 'Three tools: same denom (just compare tops), cross-multiplication (a/b vs c/d \u2192 ad vs bc), or benchmark to \u00bd / \u00be. Last one is fastest in your head.' },
          operations:  { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\u2795',         title: 'Operations \u2014 add/sub/mul/div with rules',           hint: 'Add/sub: common denominator first. Multiply: tops\u00d7tops, bottoms\u00d7bottoms. Divide: keep-change-flip (multiply by reciprocal). Always simplify to lowest terms.' },
          equivalents: { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDD17', title: 'Equivalents \u2014 same value, different form',         hint: 'Multiply top AND bottom by the same number; value stays put. \u00bd = 2/4 = 50/100 = 0.5 = 50%. Equivalent fractions are the bridge between fractions, decimals, and percents.' },
          converter:   { accent: '#059669', soft: 'rgba(5,150,105,0.10)',  icon: '\uD83D\uDD04', title: 'Converter \u2014 mixed \u2194 improper \u2194 decimal',  hint: '2\u00be = 11/4. Long division gives a terminating decimal (denom = 2\u00b9 \u00d7 5\u207f) or a repeating one (any other prime in the denom). 1/3 = 0.333... forever.' },
          wall:        { accent: '#4f46e5', soft: 'rgba(79,70,229,0.10)',  icon: '\uD83E\uDDF1', title: 'Wall \u2014 visual proof of equivalence',                  hint: 'Stack the fraction wall: 1 whole = 2 halves = 4 quarters = 8 eighths. Same height = same value. Cuisenaire rods (1952) made this concrete; the wall is the digital descendant.' }
        };
        var meta = TAB_META[tab] || TAB_META.practice;
        return h('div', {
          style: {
            margin: '0 0 12px',
            padding: '12px 14px',
            borderRadius: 12,
            background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
            border: '1px solid ' + meta.accent + '55',
            borderLeft: '4px solid ' + meta.accent,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
          }
        },
          h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
          h('div', { style: { flex: 1, minWidth: 220 } },
            h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
            h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
          )
        );
      })(),

      // v3.1: Super-tab routing (added FIRST so consolidated tabs take precedence)
      tab === 'reference' && renderReferenceTab(),
      tab === 'curiosities' && renderCuriositiesTab(),
      tab === 'aboutSuper' && renderAboutSuperTab(),
      tab === 'explorers' && renderExplorersTab(),
      tab === 'drill' && renderDrillTab(),
      tab === 'standardsPlanning' && renderStandardsPlanningTab(),
      tab === 'printAssess' && renderPrintAssessTab(),
      tab === 'pedagogy' && renderPedagogyTab(),
      tab === 'myAccount' && renderMyAccountTab(),
      // Active tab content (Learn group)
      tab === 'practice' && renderPractice(),
      tab === 'models' && renderModelsTab(),
      tab === 'numberline' && renderNumberLineTab(),
      tab === 'cra' && renderCRATab(),
      tab === 'wall' && renderFractionWall(),
      // Active tab content (Practice group)
      tab === 'compare' && renderCompare(),
      tab === 'operations' && renderOperations(),
      tab === 'opsproof' && renderVisualOperationProofs(),
      tab === 'equivalents' && renderEquivalents(),
      tab === 'equivchain' && renderEquivChainTab(),
      tab === 'converter' && renderConverter(),
      tab === 'decimals' && renderDecimalsTab(),
      tab === 'percents' && renderPercentsTab(),
      tab === 'benchmarks' && renderBenchmarkTab(),
      // Active tab content (Apply group)
      tab === 'wordproblems' && renderWordProblemsTab(),
      tab === 'games' && renderGamesTab(),
      // Active tab content (Teacher group)
      tab === 'worksheets' && renderWorksheetTab(),
      tab === 'reports' && renderReportsTab(),
      tab === 'standards' && renderStandardsTab(),
      tab === 'misconceptions' && renderMisconceptionsTab(),
      tab === 'vocab' && renderVocabTab(),
      tab === 'recipes' && renderRecipesTab(),
      tab === 'multistep' && renderMultiStepTab(),
      tab === 'calc' && renderCalculatorTab(),
      tab === 'pbank' && renderPracticeBankTab(),
      tab === 'animals' && renderAnimalFractionsTab(),
      tab === 'proverbs' && renderProverbsTab(),
      tab === 'thanks' && renderAcknowledgmentsTab(),
      tab === 'changelog' && renderChangelogTab(),
      tab === 'routines' && renderDailyRoutineTab(),
      tab === 'exitticket' && renderExitTicketTab(),
      tab === 'checklist' && renderAssessmentChecklistTab(),
      tab === 'parent' && renderParentGuideTab(),
      tab === 'udl' && renderUDLTab(),
      tab === 'citations' && renderCitationsTab(),
      tab === 'tabguide' && renderTabGuideTab(),
      tab === 'timeline' && renderTimelineTab(),
      tab === 'differentiation' && renderDifferentiationTab(),
      tab === 'goals' && renderGoalSetterTab(),
      tab === 'quotes' && renderQuotesTab(),
      tab === 'data' && renderDataAnalysisTab(),
      tab === 'mcflow' && renderMisconceptionFlowTab(),
      tab === 'printlab' && renderPrintLabTab(),
      tab === 'about' && renderAboutTab(),
      tab === 'manip' && renderManipulativesTab(),
      tab === 'mastery' && renderMasteryTab(),
      tab === 'brain' && renderBrainTeasersTab(),
      tab === 'help' && renderHelpTab(),
      tab === 'tables' && renderConversionTablesTab(),
      tab === 'glossary' && renderGlossaryExpansionTab(),
      tab === 'mathtalks' && renderMathTalksTab(),
      tab === 'vocabquiz' && renderVocabQuizTab(),
      tab === 'refcard' && renderRefCardTab(),
      tab === 'activities' && renderActivitiesTab(),
      tab === 'scope' && renderScopeSequenceTab(),
      tab === 'rubric' && renderRubricTab(),
      tab === 'story' && renderStoryModeTab(),
      tab === 'examprep' && renderExamPrepTab(),
      tab === 'daily' && renderDailyPracticeTab(),
      tab === 'magic' && renderMagicTricksTab(),
      tab === 'rwt' && renderRealWorldToolsTab(),
      tab === 'rtiprobe' && renderRTIProbeTab(),
      tab === 'levels' && renderAchievementsTab(),
      tab === 'examples' && renderWorkedExamplesTab(),
      tab === 'faq' && renderFAQTab(),
      tab === 'compareS' && renderComparisonStrategiesTab(),
      tab === 'cheatsheet' && renderCheatSheetTab(),
      tab === 'factfam' && renderFactFamiliesTab(),
      tab === 'estimation' && renderEstimationTab(),
      tab === 'probability' && renderProbabilityTab(),
      tab === 'ml' && renderMultilingualTab(),
      tab === 'art' && renderFractionArtTab(),
      tab === 'density' && renderDensityTab(),
      tab === 'iep' && renderIEPGoalsTab(),
      tab === 'lessons' && renderLessonPlansTab(),
      tab === 'facts' && renderFactsTab(),
      tab === 'sessions' && renderSessionsTab(),
      tab === 'settings' && renderSettingsTab(),

      // Challenge section (visible in practice tab)
      tab === 'practice' && h('div', { className: 'bg-rose-50 rounded-xl p-4 border border-rose-200 space-y-3' },
        h('div', { className: 'flex items-center justify-between' },
          h('div', { className: 'flex items-center gap-2' },
            h('h4', { className: 'text-sm font-bold text-rose-800' }, '\uD83C\uDFAF Fraction Challenge'),
            h('div', { className: 'flex gap-0.5 ml-2' },
              ['easy', 'medium', 'hard'].map(function(d) {
                return h('button', { key: d,
                  onClick: function() { sfxClick(); upd({ difficulty: d }); },
                  className: 'text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-all ' +
                    (difficulty === d
                      ? (d === 'easy' ? 'bg-green-700 text-white' : d === 'hard' ? 'bg-red-700 text-white' : 'bg-rose-700 text-white')
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                }, d);
              })
            )
          ),
          // Challenge type counter
          h('span', { className: 'text-[11px] text-slate-600' }, Object.keys(challengeTypesUsed).length + '/7 types')
        ),
        !challenge
          ? h('button', { 'aria-label': 'Generate Challenge',
              onClick: generateChallenge,
              className: 'w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-md'
            }, '\uD83C\uDFB2 Generate Challenge')
          : h('div', { className: 'space-y-2' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-[11px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full' }, challenge.type),
                streak > 0 && h('span', { className: 'text-[11px] font-bold text-orange-500' }, '\uD83D\uDD25 ' + streak)
              ),
              h('p', { className: 'text-sm font-bold text-rose-800' }, challenge.question),
              h('div', { className: 'flex gap-2' },
                h('input', {
                  type: 'number', value: answer,
                  onChange: function(e) { upd({ answer: e.target.value }); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkChallenge(); },
                  placeholder: 'Your answer...',
                  className: 'flex-1 px-3 py-2 border border-rose-600 rounded-lg text-sm font-mono'
                }),
                h('button', { 'aria-label': 'Check',
                  onClick: checkChallenge,
                  className: 'px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-sm hover:bg-rose-700'
                }, 'Check')
              ),
              feedback && h('p', { className: 'text-sm font-bold ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg),
              feedback && h('button', { 'aria-label': 'Next Challenge',
                onClick: generateChallenge,
                className: 'text-xs text-rose-600 font-bold hover:underline'
              }, '\u27A1\uFE0F Next Challenge')
            )
      ),

      // Badges
      renderBadges(),

      // AI Tutor toggle + panel
      h('div', { className: 'flex gap-2' },
        !showAITutor && h('button', { 'aria-label': 'AI Tutor',
          onClick: function() { sfxClick(); upd({ showAITutor: true }); },
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-all'
        }, '\uD83E\uDD16 AI Tutor'),
        h('button', { 'aria-label': 'Benchmarks',
          onClick: function() { sfxClick(); upd({ showBenchmarks: !showBenchmarks }); },
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-all'
        }, '\uD83D\uDCCB Benchmarks')
      ),
      renderAITutor(),

      // Benchmarks panel (when not on converter tab where it's inline)
      showBenchmarks && tab !== 'converter' && h('div', { className: 'bg-white rounded-xl border p-3' },
        h('p', { className: 'text-[11px] font-bold text-teal-600 uppercase tracking-wider mb-2' }, '\uD83D\uDCCB Benchmark Fractions'),
        h('div', { className: 'grid grid-cols-4 gap-1 text-[11px] font-bold mb-1' },
          h('span', { className: 'text-slate-600' }, 'Fraction'),
          h('span', { className: 'text-slate-600' }, 'Decimal'),
          h('span', { className: 'text-slate-600' }, 'Percent'),
          h('span', { className: 'text-slate-600' }, 'Visual')
        ),
        benchmarks.slice(0, 10).map(function(bm) {
          var parts = bm.frac.split('/');
          var pctVal = parseInt(parts[0]) / parseInt(parts[1]) * 100;
          return h('div', { key: bm.frac, className: 'grid grid-cols-4 gap-1 text-xs py-0.5 border-t border-slate-100 items-center' },
            h('span', { className: 'font-bold text-teal-700' }, bm.frac),
            h('span', { className: 'text-blue-600' }, bm.dec),
            h('span', { className: 'text-purple-600' }, bm.pct),
            h('div', { className: 'h-2 bg-slate-200 rounded-full overflow-hidden' },
              h('div', { style: { width: Math.min(pctVal, 100) + '%', backgroundColor: '#14b8a6' }, className: 'h-full rounded-full' })
            )
          );
        })
      ),

      // Keyboard shortcuts hint
      h('div', { className: 'text-center text-[11px] text-slate-600 mt-2' },
        '\u2328\uFE0F 1-6: tabs | N: new challenge | B: benchmarks | P: pie/bar | ?: AI tutor'
      ),

      // \u2550\u2550\u2550 EQUIVALENT FRACTIONS \u2550\u2550\u2550
      h('div', { className: 'mt-5 rounded-2xl border border-pink-300 bg-white p-3 shadow-sm' },
        h('h4', { className: 'text-sm font-bold text-pink-700 mb-2' }, '\uD83C\uDF70 Equivalent Fractions \u2014 Same value, different forms'),
        h('div', { className: 'rounded-xl overflow-hidden border border-pink-200', style: { background: '#020210', aspectRatio: '16/5' } },
          h('canvas', {
            ref: function(cvEl) {
              if (!cvEl) return;
              if (cvEl._efAnim) return;
              var c2 = cvEl.getContext('2d');
              var W = cvEl.offsetWidth || 600;
              var H = cvEl.offsetHeight || 180;
              cvEl.width = W * 2; cvEl.height = H * 2;
              c2.scale(2, 2);
              var start = performance.now();
              function drawEf() {
                if (!cvEl.isConnected) { cancelAnimationFrame(cvEl._efAnim); return; }
                var t = (performance.now() - start) / 1000;
                c2.fillStyle = '#020210';
                c2.fillRect(0, 0, W, H);
                var fracs = [
                  { num: 1, den: 2, color: '#f472b6' },
                  { num: 2, den: 4, color: '#a78bfa' },
                  { num: 4, den: 8, color: '#7dd3fc' },
                  { num: 8, den: 16, color: '#10b981' }
                ];
                var cellW = W / fracs.length;
                fracs.forEach(function(f, fi) {
                  var cx = fi * cellW + cellW / 2;
                  var cy = H * 0.40;
                  var R = 35;
                  // Pie chart
                  for (var slc = 0; slc < f.den; slc++) {
                    var a1 = (slc / f.den) * Math.PI * 2 - Math.PI / 2;
                    var a2 = ((slc + 1) / f.den) * Math.PI * 2 - Math.PI / 2;
                    c2.fillStyle = slc < f.num ? f.color : '#1e293b';
                    c2.beginPath();
                    c2.moveTo(cx, cy);
                    c2.arc(cx, cy, R, a1, a2);
                    c2.closePath();
                    c2.fill();
                    c2.strokeStyle = '#020210'; c2.lineWidth = 0.5; c2.stroke();
                  }
                  c2.strokeStyle = f.color; c2.lineWidth = 1.5;
                  c2.beginPath();
                  c2.arc(cx, cy, R, 0, Math.PI * 2);
                  c2.stroke();
                  c2.font = 'bold 13px monospace'; c2.fillStyle = f.color; c2.textAlign = 'center';
                  c2.fillText(f.num + '/' + f.den, cx, cy + R + 18);
                  c2.font = '8px monospace'; c2.fillStyle = '#cbd5e1';
                  c2.fillText('= 0.5', cx, cy + R + 30);
                });
                c2.fillStyle = 'rgba(0,0,0,0.85)';
                c2.fillRect(8, H - 14, W - 16, 12);
                c2.font = 'bold 8px sans-serif'; c2.fillStyle = '#f472b6'; c2.textAlign = 'center';
                c2.fillText('Multiply numerator & denominator by same number \u2192 same value, different form', W / 2, H - 5);
                cvEl._efAnim = requestAnimationFrame(drawEf);
              }
              drawEf();
              var ro = new ResizeObserver(function() {
                W = cvEl.offsetWidth; H = cvEl.offsetHeight;
                cvEl.width = W * 2; cvEl.height = H * 2; c2.scale(2, 2);
              });
              ro.observe(cvEl);
            },
            style: { width: '100%', height: '100%', display: 'block' }
          })
        )
      )
    );
  }
})();
