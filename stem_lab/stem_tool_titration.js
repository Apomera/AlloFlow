// ── Titration Lab Plugin v2.0 ──
// Enhanced: 7 reaction types, lab incident simulator, safety challenge quiz,
// equipment technique guide, dilution calculator, GHS hazards for all chemicals
window.StemLab.registerTool('titrationLab', {
  label: 'Titration Lab',
  icon: '\uD83E\uDDEA',
  desc: 'Virtual titration lab with S-curve graphing, safety drills, incident simulator, equipment guide, and dilution calculator.',
  category: 'science',
  render: function(ctx) {
    var React = ctx.React;
    var labToolData = ctx.toolData;
    var setLabToolData = function(fn) {
      var prev = ctx.toolData;
      var next = fn(prev);
      if (next && next.titrationLab) {
        ctx.updateMulti('titrationLab', next.titrationLab);
      }
    };
    var setStemLabTool = ctx.setStemLabTool;
    var awardStemXP = ctx.awardXP;
    var setToolSnapshots = ctx.setToolSnapshots;
    var addToast = ctx.addToast;

var d = (labToolData && labToolData.titrationLab) || {};

var upd = function (k, v) {

  setLabToolData(function (p) {

    var tl = Object.assign({}, (p && p.titrationLab) || {});

    tl[k] = v;

    return Object.assign({}, p, { titrationLab: tl });

  });

};

var updMulti = function (obj) {

  setLabToolData(function (p) {

    var tl = Object.assign({}, (p && p.titrationLab) || {}, obj);

    return Object.assign({}, p, { titrationLab: tl });

  });

};



var glass = { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' };



// ── Presets ──

var presets = [

  { id: 'sa_sb', label: 'HCl + NaOH', icon: '\u2697\uFE0F', desc: 'Strong acid + Strong base', color: '#f87171',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: null, Kb: null, acidName: 'HCl (0.1 M)', baseName: 'NaOH (0.1 M)' },

  { id: 'wa_sb', label: 'CH\u2083COOH + NaOH', icon: '\uD83E\uDDEA', desc: 'Weak acid + Strong base', color: '#60a5fa',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: 1.8e-5, Kb: null, acidName: 'Acetic Acid (0.1 M)', baseName: 'NaOH (0.1 M)' },

  { id: 'sa_wb', label: 'HCl + NH\u2083', icon: '\uD83D\uDC9C', desc: 'Strong acid + Weak base', color: '#a855f7',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: null, Kb: 1.8e-5, acidName: 'HCl (0.1 M)', baseName: 'NH\u2083 (0.1 M)' },

  { id: 'wa_wb', label: 'CH\u2083COOH + NH\u2083', icon: '\uD83D\uDC9A', desc: 'Both weak', color: '#34d399',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: 1.8e-5, Kb: 1.8e-5, acidName: 'Acetic Acid (0.1 M)', baseName: 'NH\u2083 (0.1 M)' },

  { id: 'poly_h3po4', label: 'H\u2083PO\u2084 + NaOH', icon: '\uD83D\uDD2C', desc: 'Polyprotic acid (3 equiv pts)', color: '#06b6d4',
    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: 7.5e-3, Kb: null, polyprotic: [7.5e-3, 6.2e-8, 4.8e-13], acidName: 'Phosphoric Acid (0.1 M)', baseName: 'NaOH (0.1 M)' },

  { id: 'redox_kmno4', label: 'Fe\u00B2\u207A + KMnO\u2084', icon: '\uD83D\uDCAB', desc: 'Redox titration', color: '#c026d3',
    concAcid: 0.02, volAcid: 25, concBase: 0.02, Ka: null, Kb: null, redox: true, acidName: 'FeSO\u2084 (0.02 M)', baseName: 'KMnO\u2084 (0.02 M)' },

  { id: 'back_antacid', label: 'Antacid (back)', icon: '\uD83D\uDC8A', desc: 'Back-titration of antacid', color: '#f472b6',
    concAcid: 0.1, volAcid: 50, concBase: 0.1, Ka: null, Kb: null, backTitration: true, excessAcidMoles: 0.003, acidName: 'Excess HCl after antacid', baseName: 'NaOH (0.1 M)' }

];



// ── Indicators ──

var indicators = [

  { id: 'phenolphthalein', label: 'Phenolphthalein', low: 8.2, high: 10.0,

    colorLow: 'rgba(255,255,255,0.15)', colorHigh: '#ec4899', colorMid: '#f9a8d4' },

  { id: 'methylOrange', label: 'Methyl Orange', low: 3.1, high: 4.4,

    colorLow: '#ef4444', colorHigh: '#eab308', colorMid: '#f97316' },

  { id: 'bromothymolBlue', label: 'Bromothymol Blue', low: 6.0, high: 7.6,

    colorLow: '#eab308', colorHigh: '#3b82f6', colorMid: '#22c55e' },

  { id: 'universal', label: 'Universal', low: 0, high: 14,

    colorLow: '#ef4444', colorHigh: '#7c3aed', colorMid: '#22c55e' }

];


// ── GHS Chemical Hazard Data ──
var chemHazards = {
  'HCl': { name: 'Hydrochloric Acid', ghs: ['\u2620\uFE0F GHS05 Corrosive', '\u26A0\uFE0F GHS07 Irritant'], signal: 'Danger', color: '#ef4444',
    hazards: ['H290: May be corrosive to metals', 'H314: Causes severe skin burns and eye damage', 'H335: May cause respiratory irritation'],
    firstAid: 'Skin: Remove clothing, wash 15+ min. Eyes: Rinse 15+ min, seek medical attention. Inhalation: Move to fresh air.',
    disposal: 'Neutralize with sodium bicarbonate, dilute, pour down drain with excess water.' },
  'NaOH': { name: 'Sodium Hydroxide', ghs: ['\u2620\uFE0F GHS05 Corrosive'], signal: 'Danger', color: '#3b82f6',
    hazards: ['H290: May be corrosive to metals', 'H314: Causes severe skin burns and eye damage'],
    firstAid: 'Skin: Remove clothing, wash 15+ min. Eyes: Rinse 15+ min, remove contacts. Ingestion: Rinse mouth, do NOT induce vomiting.',
    disposal: 'Neutralize with dilute acid, dilute, pour down drain with excess water.' },
  'CH\u2083COOH': { name: 'Acetic Acid', ghs: ['\uD83D\uDD25 GHS02 Flammable', '\u26A0\uFE0F GHS07 Irritant'], signal: 'Warning', color: '#f59e0b',
    hazards: ['H226: Flammable liquid and vapor', 'H302: Harmful if swallowed', 'H312: Harmful in contact with skin', 'H332: Harmful if inhaled'],
    firstAid: 'Skin: Wash with soap and water. Eyes: Rinse 15+ min. Inhalation: Move to fresh air. Keep away from ignition sources.',
    disposal: 'Dilute with water, neutralize, pour down drain.' },
  'NH\u2083': { name: 'Ammonia', ghs: ['\u2620\uFE0F GHS05 Corrosive', '\u2623\uFE0F GHS06 Toxic', '\uD83C\uDF0D GHS09 Environment'], signal: 'Danger', color: '#a855f7',
    hazards: ['H221: Flammable gas', 'H314: Causes severe skin burns and eye damage', 'H331: Toxic if inhaled', 'H400: Very toxic to aquatic life'],
    firstAid: 'Inhalation: Move to fresh air IMMEDIATELY. Skin: Flush with water 15+ min. Eyes: Rinse 15+ min. Call Poison Control.',
    disposal: 'Neutralize with dilute acid in fume hood. Never mix with bleach!' },
  'H\u2083PO\u2084': { name: 'Phosphoric Acid', ghs: ['\u2620\uFE0F GHS05 Corrosive'], signal: 'Danger', color: '#06b6d4',
    hazards: ['H290: May be corrosive to metals', 'H314: Causes severe skin burns and eye damage'],
    firstAid: 'Skin: Flush with water 15+ min. Eyes: Rinse 15+ min, remove contacts. Ingestion: Rinse mouth, do NOT induce vomiting.',
    disposal: 'Neutralize with sodium bicarbonate, dilute, pour down drain with excess water.' },
  'KMnO\u2084': { name: 'Potassium Permanganate', ghs: ['\uD83D\uDD25 GHS03 Oxidizer', '\u2620\uFE0F GHS05 Corrosive', '\u2623\uFE0F GHS06 Toxic', '\uD83C\uDF0D GHS09 Environment'], signal: 'Danger', color: '#c026d3',
    hazards: ['H272: May intensify fire; oxidizer', 'H302: Harmful if swallowed', 'H314: Causes severe skin burns', 'H410: Very toxic to aquatic life'],
    firstAid: 'Skin: Stains brown \u2014 wash with dilute H\u2082SO\u2083 then water. Eyes: Rinse 15+ min. NEVER use with flammable organics!',
    disposal: 'Reduce with sodium bisulfite, then neutralize. Do NOT pour down drain \u2014 heavy metal waste.' },
  'FeSO\u2084': { name: 'Ferrous Sulfate', ghs: ['\u26A0\uFE0F GHS07 Irritant'], signal: 'Warning', color: '#65a30d',
    hazards: ['H302: Harmful if swallowed', 'H315: Causes skin irritation', 'H319: Causes serious eye irritation'],
    firstAid: 'Skin: Wash with soap and water. Eyes: Rinse 10+ min. Ingestion: Rinse mouth.',
    disposal: 'Dissolve in water, precipitate as Fe(OH)\u2083 with NaOH, filter, dispose of solid as chemical waste.' },
  'Antacid': { name: 'Antacid Tablet (CaCO\u2083/Mg(OH)\u2082)', ghs: ['\u26A0\uFE0F GHS07 Irritant'], signal: 'Warning', color: '#f472b6',
    hazards: ['H319: Causes eye irritation in powder form', 'Generally safe but excess may cause alkalosis'],
    firstAid: 'Eyes: Rinse with water. Low toxicity but handle dissolved solution with normal lab precautions.',
    disposal: 'Neutralized solution is safe for drain disposal with excess water.' }
};

var presetHazardKeys = {
  'sa_sb': ['HCl', 'NaOH'], 'wa_sb': ['CH\u2083COOH', 'NaOH'],
  'sa_wb': ['HCl', 'NH\u2083'], 'wa_wb': ['CH\u2083COOH', 'NH\u2083'],
  'poly_h3po4': ['H\u2083PO\u2084', 'NaOH'], 'redox_kmno4': ['FeSO\u2084', 'KMnO\u2084'],
  'back_antacid': ['Antacid', 'HCl', 'NaOH']
};

// ── Safety Checklist Items ──
var safetyItems = [
  { id: 'goggles', icon: '\uD83E\uDD7D', label: 'Safety goggles on', desc: 'Splash-proof chemical safety goggles \u2014 not regular glasses' },
  { id: 'gloves', icon: '\uD83E\uDDE4', label: 'Nitrile gloves worn', desc: 'Protects skin from corrosive acids and bases' },
  { id: 'coat', icon: '\uD83E\uDD7C', label: 'Lab coat on', desc: 'Button it up \u2014 protects clothing and skin from splashes' },
  { id: 'shoes', icon: '\uD83D\uDC5F', label: 'Closed-toe shoes', desc: 'No sandals or open-toed shoes in the chemistry lab' },
  { id: 'eyewash', icon: '\uD83D\uDEBF', label: 'Eyewash station located', desc: 'Know where it is BEFORE you start \u2014 you have 10 seconds if splashed' },
  { id: 'extinguisher', icon: '\uD83E\uDDEF', label: 'Fire extinguisher located', desc: 'Acetic acid is flammable \u2014 know your nearest extinguisher' },
  { id: 'sds', icon: '\uD83D\uDCCB', label: 'SDS reviewed for chemicals', desc: 'Safety Data Sheets list all hazards, PPE, and emergency procedures' }
];

// ── Contextual Safety Tips ──
var safetyTips = {
  firstDrip: { icon: '\uD83D\uDCA7', text: 'Always add titrant slowly near the expected endpoint. A single drop can change the pH dramatically!', color: '#38bdf8' },
  nearEquiv: { icon: '\u26A0\uFE0F', text: 'The pH is changing rapidly! In a real lab, switch to drop-by-drop addition and swirl after each drop.', color: '#f59e0b' },
  overshot: { icon: '\u274C', text: 'You overshot the equivalence point! In a real lab, you would need to restart with a fresh sample.', color: '#ef4444' },
  reset: { icon: '\u267B\uFE0F', text: 'Good lab practice: always rinse the burette with distilled water, then with titrant solution before refilling.', color: '#22c55e' },
  halfEquiv: { icon: '\uD83E\uDDEA', text: 'At the half-equivalence point, pH = pKa. This is the center of the buffer region!', color: '#a78bfa' },
  redoxWarning: { icon: '\uD83D\uDCAB', text: 'KMnO\u2084 is a strong oxidizer! In a real lab, keep away from organic solvents and use a fume hood. Purple \u2192 colorless = endpoint.', color: '#c026d3' },
  polyprotic: { icon: '\uD83D\uDD2C', text: 'Polyprotic acids have multiple equivalence points! Watch for the S-curve to flatten between each one (buffer regions).', color: '#06b6d4' },
  backTitration: { icon: '\uD83D\uDC8A', text: 'In a back-titration, you add EXCESS acid first, then titrate the leftover acid. This works for insoluble analytes like CaCO\u2083.', color: '#f472b6' },
  acidToWater: { icon: '\uD83D\uDCA5', text: 'NEVER add water to concentrated acid! Always add acid TO water. "Do as you oughta \u2014 add acid to water." The exothermic reaction can cause dangerous splashing.', color: '#ef4444' },
  fumeHood: { icon: '\uD83C\uDF2C\uFE0F', text: 'When using volatile reagents like NH\u2083 or HCl (conc.), always work in a fume hood. Breathing acid/base fumes damages lung tissue.', color: '#a855f7' },
  meniscus: { icon: '\uD83D\uDC41\uFE0F', text: 'Read the burette at the BOTTOM of the meniscus, with your eye level at the liquid surface. Parallax errors affect accuracy!', color: '#38bdf8' }
};

// ── Lab Incident Scenarios ──
var incidentScenarios = [
  { id: 'acid_splash', title: 'Acid Splash on Skin!', icon: '\uD83D\uDCA6', desc: 'While pouring HCl, some splashes on your forearm.', urgency: 'high',
    correct: 'rinse', options: [
      { id: 'rinse', label: 'Remove clothing, rinse under running water for 15+ minutes', icon: '\uD83D\uDEB0', correct: true, feedback: 'Correct! Immediate and prolonged rinsing is critical. The 15-minute rule saves tissue damage.' },
      { id: 'wipe', label: 'Wipe it off with a paper towel', icon: '\uD83E\uDDF4', correct: false, feedback: 'WRONG! Wiping can spread the acid and push it into your skin. You need running water immediately.' },
      { id: 'neutralize', label: 'Apply baking soda paste directly to skin', icon: '\uD83E\uDDEA', correct: false, feedback: 'Not recommended! The neutralization reaction generates heat (exothermic) which can cause additional burns. Water is always the first response.' },
      { id: 'ignore', label: 'It\'s dilute, just keep working', icon: '\uD83E\uDD37', correct: false, feedback: 'DANGEROUS! Even dilute acids can cause burns over time. Always treat chemical contact immediately.' }
    ]
  },
  { id: 'eye_contact', title: 'Chemical Splash in Eyes!', icon: '\uD83D\uDC41\uFE0F', desc: 'NaOH solution splashes into your eyes while swirling the flask.', urgency: 'critical',
    correct: 'eyewash', options: [
      { id: 'eyewash', label: 'Go to eyewash station immediately, rinse 15+ min, hold eyelids open', icon: '\uD83D\uDEBF', correct: true, feedback: 'Correct! Speed is everything \u2014 you have about 10 seconds before serious damage starts. Hold eyelids open and tilt head to prevent cross-contamination to the other eye.' },
      { id: 'rub', label: 'Rub your eyes and blink rapidly', icon: '\uD83D\uDE23', correct: false, feedback: 'NEVER rub! This spreads the chemical across more of the eye surface and can scratch the cornea.' },
      { id: 'drops', label: 'Use eye drops from the first aid kit', icon: '\uD83D\uDC8A', correct: false, feedback: 'Eye drops are insufficient! You need high-volume flushing for 15+ minutes. Eye drops cannot provide that.' },
      { id: 'wait', label: 'Finish the experiment first, then wash', icon: '\u23F0', correct: false, feedback: 'EXTREMELY DANGEROUS! NaOH causes alkali burns that penetrate deeper over time. Every second counts. Chemical eye injuries are the #1 cause of lab blindness.' }
    ]
  },
  { id: 'spill_bench', title: 'Large Acid Spill on Bench!', icon: '\uD83E\uDDEA', desc: 'You knock over the beaker of 0.1M HCl, spilling ~200 mL across the bench.', urgency: 'medium',
    correct: 'contain', options: [
      { id: 'contain', label: 'Alert others, contain with absorbent, neutralize with NaHCO\u2083, clean with water', icon: '\u2705', correct: true, feedback: 'Perfect procedure! (1) Alert nearby students, (2) contain the spread with absorbent pads, (3) sprinkle sodium bicarbonate to neutralize, (4) clean with water, (5) dispose of waste properly.' },
      { id: 'water', label: 'Just flood it with lots of water', icon: '\uD83D\uDCA7', correct: false, feedback: 'Partially right but incomplete. Flooding spreads the acid further and doesn\'t neutralize it. Always contain first, then neutralize, then rinse.' },
      { id: 'leave', label: 'Tell the teacher and don\'t touch it', icon: '\uD83D\uDDE3\uFE0F', correct: false, feedback: 'Telling the teacher is good, but at 0.1M this is manageable. You should start containment immediately while someone alerts the instructor. Don\'t let it reach the edge of the bench.' },
      { id: 'paper', label: 'Soak it up with paper towels', icon: '\uD83E\uDDF4', correct: false, feedback: 'Paper towels are not appropriate for acid spills! They don\'t neutralize the acid and you\'ll be handling acid-soaked material. Use proper spill kits.' }
    ]
  },
  { id: 'gas_release', title: 'Mysterious Fumes Rising!', icon: '\uD83C\uDF2B\uFE0F', desc: 'While working with ammonia (NH\u2083), you notice a strong smell and your eyes start watering.', urgency: 'high',
    correct: 'fume_hood', options: [
      { id: 'fume_hood', label: 'Move the experiment to the fume hood immediately, ventilate the area', icon: '\uD83C\uDF2C\uFE0F', correct: true, feedback: 'Correct! Volatile chemicals like NH\u2083 must be handled in a fume hood. If you smell it, you\'re breathing it. Open windows and move to fresh air if the fume hood is far away.' },
      { id: 'mask', label: 'Put on a face mask and continue', icon: '\uD83D\uDE37', correct: false, feedback: 'A regular face mask does NOT protect against chemical fumes! You need proper respiratory protection (not available in most teaching labs) or a fume hood.' },
      { id: 'fan', label: 'Fan the fumes away with your hand', icon: '\uD83D\uDC4B', correct: false, feedback: 'Fanning is for WAFTING to detect odors (gently directing air toward your nose). It does NOT remove hazardous fumes from the area. You need ventilation!' },
      { id: 'continue', label: 'It\'s just a little smell, keep going', icon: '\uD83E\uDD37', correct: false, feedback: 'DANGEROUS! If you can smell NH\u2083, the concentration may exceed safe limits (25 ppm). Prolonged exposure causes chemical burns to airways. NH\u2083 at >300 ppm can be fatal.' }
    ]
  },
  { id: 'mix_bleach', title: 'Someone Brought Bleach!', icon: '\u2623\uFE0F', desc: 'A classmate suggests cleaning the bench with bleach while you still have ammonia solution open.', urgency: 'critical',
    correct: 'stop', options: [
      { id: 'stop', label: 'STOP them immediately! Bleach + ammonia = toxic chloramine gas', icon: '\uD83D\uDED1', correct: true, feedback: 'LIFE-SAVING action! NaOCl + 2NH\u2083 \u2192 2NH\u2082Cl (chloramine) \u2014 a toxic gas that causes severe respiratory damage. This is one of the most dangerous accidental mixings in a lab. Always neutralize and remove all chemicals before using any cleaning agents.' },
      { id: 'ok', label: 'Sure, bleach is a disinfectant, it should be fine', icon: '\uD83D\uDC4D', correct: false, feedback: 'EXTREMELY DANGEROUS! Mixing bleach (NaOCl) with ammonia produces toxic chloramine gas. This has caused deaths in laboratories and homes. NEVER mix bleach with any other chemical.' },
      { id: 'dilute', label: 'It should be fine if the ammonia is diluted', icon: '\uD83E\uDDEA', correct: false, feedback: 'WRONG! Even dilute ammonia reacts with bleach to produce toxic chloramine gas. The reaction occurs at ANY concentration. There is no safe dilution for mixing these chemicals.' },
      { id: 'outside', label: 'Just open a window and it will be fine', icon: '\uD83C\uDF2C\uFE0F', correct: false, feedback: 'Ventilation does NOT make it safe to generate toxic gas! Chloramine causes immediate respiratory distress. Prevention is the only acceptable approach.' }
    ]
  }
];

// ── Lab Equipment Guide Data ──
var labEquipment = [
  { id: 'burette', name: 'Burette', icon: '\uD83E\uDDEA', desc: 'Delivers precise volumes of titrant.',
    technique: 'Rinse with distilled water, then with titrant solution. Fill above 0 mL mark, drain to 0. Read at meniscus bottom. Control stopcock with left hand, swirl flask with right.',
    errors: ['Parallax error: eye not level with meniscus', 'Air bubbles in tip', 'Not pre-rinsing with titrant', 'Reading at top of meniscus instead of bottom'],
    safetyNote: 'Clamp securely! A falling burette with acid/base is a serious splash hazard.' },
  { id: 'erlenmeyer', name: 'Erlenmeyer Flask', icon: '\u2697\uFE0F', desc: 'Holds the analyte solution being titrated.',
    technique: 'Swirl gently (don\'t shake!) after each addition. A white tile underneath helps detect color changes. Rinse walls with distilled water from a wash bottle to ensure all analyte reacts.',
    errors: ['Violent shaking (splashes analyte out)', 'Not rinsing walls (loses analyte)', 'Using a beaker instead (harder to swirl, easier to spill)'],
    safetyNote: 'Hot glass looks the same as cold glass. Always use tongs for heated flasks.' },
  { id: 'pipette', name: 'Volumetric Pipette', icon: '\uD83E\uDDEA', desc: 'Measures exact volumes of analyte.',
    technique: 'Use a pipette filler (NEVER mouth pipette!). Rinse with the solution to be measured. Drain to the line, touch tip to flask wall to remove the hanging drop. Do NOT blow out the last drop.',
    errors: ['Mouth pipetting (extremely dangerous!)', 'Not rinsing with solution first', 'Blowing out the last drop', 'Air bubbles in the pipette'],
    safetyNote: '\u26D4 NEVER mouth pipette. This is the #1 lab safety violation. Even "safe" solutions may be contaminated. Always use a pipette filler or bulb.' },
  { id: 'indicator', name: 'pH Indicator', icon: '\uD83C\uDFA8', desc: 'Changes color to signal the endpoint.',
    technique: 'Add only 2-3 drops. Too much indicator acts as a weak acid/base itself and shifts the endpoint! Choose an indicator whose transition range includes the equivalence pH.',
    errors: ['Adding too much indicator', 'Choosing wrong indicator for the titration type', 'Confusing endpoint with equivalence point'],
    safetyNote: 'Some indicators stain skin and clothing permanently. Wear gloves and a lab coat.' },
  { id: 'washbottle', name: 'Wash Bottle', icon: '\uD83D\uDCA7', desc: 'Contains distilled water for rinsing.',
    technique: 'Use to rinse burette tip and flask walls during titration. This ensures all titrant enters the reaction and no analyte clings to the walls. Always label the bottle.',
    errors: ['Using tap water instead of distilled (introduces ions)', 'Adding too much rinse water (dilutes but doesn\'t affect moles)'],
    safetyNote: 'Never store anything other than distilled water in a wash bottle. Label everything!' }
];

// ── Titration Challenge Questions ──
var challengeQuestions = [
  { q: 'What PPE is ALWAYS required in a titration lab?', opts: ['Just goggles', 'Goggles, gloves, and lab coat', 'A face shield only', 'No PPE for dilute solutions'], answer: 'Goggles, gloves, and lab coat', xp: 10, category: 'safety',
    feedback: 'All three are mandatory: goggles protect eyes from splashes, gloves protect hands from corrosives, and the lab coat protects clothing and skin.' },
  { q: 'You spill acid on your skin. What is your FIRST action?', opts: ['Apply baking soda', 'Rinse with running water for 15+ min', 'Wipe with a dry cloth', 'Apply burn cream'], answer: 'Rinse with running water for 15+ min', xp: 15, category: 'safety',
    feedback: 'Water first, always! The 15-minute rinse is critical. Neutralizers can cause exothermic reactions on skin.' },
  { q: 'What is the equivalence point?', opts: ['Where the indicator changes color', 'Where moles of acid = moles of base', 'Where pH = 7', 'Where you stop adding titrant'], answer: 'Where moles of acid = moles of base', xp: 10, category: 'theory',
    feedback: 'The equivalence point is the stoichiometric point. The pH at equivalence depends on acid/base strength \u2014 it\'s only pH 7 for strong acid + strong base.' },
  { q: 'Why do we add acid TO water, never water to acid?', opts: ['It\'s just tradition', 'Water is denser than acid', 'The exothermic reaction can cause violent boiling and splashing', 'It doesn\'t matter with dilute solutions'], answer: 'The exothermic reaction can cause violent boiling and splashing', xp: 15, category: 'safety',
    feedback: 'When water hits concentrated acid, the heat released can boil the water instantly, causing a violent splash of hot acid. Adding acid to water spreads the heat through a larger water volume.' },
  { q: 'For a weak acid + strong base titration, the equivalence pH is:', opts: ['Exactly 7', 'Below 7', 'Above 7', 'Cannot be determined'], answer: 'Above 7', xp: 10, category: 'theory',
    feedback: 'At equivalence, only the conjugate base (A\u207B) remains. Conjugate bases of weak acids are themselves weak bases, making the solution basic (pH > 7).' },
  { q: 'Phenolphthalein is best for which titration type?', opts: ['Strong acid + Strong base or Weak acid + Strong base', 'Strong acid + Weak base', 'Both weak', 'Redox titrations'], answer: 'Strong acid + Strong base or Weak acid + Strong base', xp: 10, category: 'theory',
    feedback: 'Phenolphthalein transitions at pH 8.2-10.0, which matches the basic equivalence pH of weak acid + strong base titrations. It also works for SA+SB since the sharp jump crosses its range.' },
  { q: 'What should you NEVER mix with bleach?', opts: ['Water', 'Ammonia or acids', 'Sodium bicarbonate', 'Ethanol'], answer: 'Ammonia or acids', xp: 20, category: 'safety',
    feedback: 'Bleach + ammonia = chloramine gas (toxic). Bleach + acid = chlorine gas (toxic). Both can cause severe respiratory injury or death. NEVER combine bleach with any chemical.' },
  { q: 'A burette reading of 23.45 mL has how many significant figures?', opts: ['2', '3', '4', '5'], answer: '4', xp: 10, category: 'technique',
    feedback: '23.45 has 4 significant figures. The last digit (5) is estimated between the graduations. Burettes are precise to \u00B10.05 mL.' },
  { q: 'What happens at the half-equivalence point of a weak acid titration?', opts: ['pH = 7', 'pH = pKa', 'pH = pKb', 'The indicator changes'], answer: 'pH = pKa', xp: 15, category: 'theory',
    feedback: 'At half-equivalence, [HA] = [A\u207B], so Henderson\u2013Hasselbalch gives pH = pKa + log(1) = pKa. This is the center of the buffer region.' },
  { q: 'When should you wear a face shield instead of just goggles?', opts: ['Never, goggles are enough', 'When handling >1M concentrated acids or bases', 'Only for organic solvents', 'Only if you wear glasses'], answer: 'When handling >1M concentrated acids or bases', xp: 15, category: 'safety',
    feedback: 'Face shields provide splash protection for the entire face. Required for concentrated (>1M) corrosives, heating operations, and any procedure with splash risk beyond the eye area.' }
];

// ── State with defaults ──

var presetId = d.presetId || 'sa_sb';

var preset = presets.find(function (p) { return p.id === presetId; }) || presets[0];

var indicatorId = d.indicator || 'phenolphthalein';

var indicator = indicators.find(function (ind) { return ind.id === indicatorId; }) || indicators[0];

var volumeAdded = d.volumeAdded != null ? d.volumeAdded : 0;

var safetyChecked = d.safetyChecked || false;
var safetyChecks = d.safetyChecks || {};
var showSafetyRef = d.showSafetyRef || false;
var showHazards = d.showHazards || false;
var allSafetyChecked = safetyItems.every(function(item) { return safetyChecks[item.id]; });
var prevVolume = d._prevVolume || 0;
var labTab = d.labTab || 'titrate'; // titrate | challenge | incidents | equipment | molarity
var incidentIdx = d.incidentIdx != null ? d.incidentIdx : 0;
var incidentAnswer = d.incidentAnswer || null;
var incidentScore = d.incidentScore || 0;
var incidentCompleted = d.incidentCompleted || {};
var challengeIdx = d.challengeIdx != null ? d.challengeIdx : 0;
var challengeAnswer = d.challengeAnswer || null;
var challengeScore = d.challengeScore || 0;
var challengeStreak = d.challengeStreak || 0;
var showEquipGuide = d.showEquipGuide || false;
var selectedEquip = d.selectedEquip || null;
var molarityCalcC1 = d.molarityC1 != null ? d.molarityC1 : 1.0;
var molarityCalcV1 = d.molarityV1 != null ? d.molarityV1 : 10;
var molarityCalcC2 = d.molarityC2 != null ? d.molarityC2 : 0.1;
var accuracyLog = d.accuracyLog || [];

// Determine active safety tip
var activeTip = null;
if (safetyChecked && labTab === 'titrate') {
  if (preset.redox && volumeAdded < 1) activeTip = safetyTips.redoxWarning;
  else if (preset.polyprotic && volumeAdded < 1) activeTip = safetyTips.polyprotic;
  else if (preset.backTitration && volumeAdded < 1) activeTip = safetyTips.backTitration;
  else if (volumeAdded > 0 && volumeAdded <= 0.5 && prevVolume === 0) activeTip = safetyTips.firstDrip;
  else if ((presetId === 'sa_wb' || presetId === 'wa_wb') && volumeAdded > 1 && volumeAdded < 3) activeTip = safetyTips.fumeHood;
  else if (volumeAdded > 5 && volumeAdded < 7) activeTip = safetyTips.meniscus;
  else if (preset.Ka && Math.abs(volumeAdded - Veq/2) < 1) activeTip = safetyTips.halfEquiv;
  else if (volumeAdded > Veq - 2 && volumeAdded < Veq + 0.5) activeTip = safetyTips.nearEquiv;
  else if (volumeAdded > Veq + 3) activeTip = safetyTips.overshot;
}

var maxVol = 50;

var Veq = (preset.concAcid * preset.volAcid) / preset.concBase;

var Kw = 1e-14;



// ── pH Calculation Engine ──

function calcPH(vol) {

  // Handle back-titration (excess acid after antacid reaction)
  if (preset.backTitration) {
    var excessMoles = preset.excessAcidMoles || 0.003;
    var molesNaOH = preset.concBase * vol / 1000;
    var totalV = (preset.volAcid + vol) / 1000;
    var remaining = excessMoles - molesNaOH;
    if (remaining > 1e-7) return Math.max(0, Math.min(14, -Math.log10(remaining / totalV)));
    if (remaining > -1e-7) return 7;
    return Math.max(0, Math.min(14, 14 + Math.log10(-remaining / totalV)));
  }

  // Handle redox titration (approximated as endpoint detection)
  if (preset.redox) {
    var molesFe = preset.concAcid * preset.volAcid / 1000;
    var molesKMnO4 = preset.concBase * vol / 1000;
    var stoichFe = molesKMnO4 * 5; // 1 KMnO4 reacts with 5 Fe2+
    var totalVL = (preset.volAcid + vol) / 1000;
    // pH mainly affected by H2SO4 medium (stays acidic)
    var basePH = 1.5; // acidic medium
    if (stoichFe < molesFe) return basePH + 0.5 * (stoichFe / molesFe);
    if (Math.abs(stoichFe - molesFe) < 1e-7) return 3.0; // equivalence
    return Math.min(7, 3.0 + 2 * (stoichFe - molesFe) / (molesFe * 0.5)); // post-equiv, higher "potential"
  }

  // Handle polyprotic acid (simplified 3-stage for H3PO4)
  if (preset.polyprotic) {
    var Kas = preset.polyprotic;
    var CaP = preset.concAcid, VaP = preset.volAcid, CbP = preset.concBase;
    var molesAcidP = CaP * VaP / 1000;
    var molesBaseP = CbP * vol / 1000;
    var totalVP = (VaP + vol) / 1000;
    var ratio = molesBaseP / molesAcidP;
    if (ratio < 0.001) return Math.max(0, -Math.log10(Math.sqrt(Kas[0] * CaP)));
    if (ratio < 1) { var pKa1 = -Math.log10(Kas[0]); return Math.max(0, Math.min(14, pKa1 + Math.log10(ratio / (1 - ratio)))); }
    if (Math.abs(ratio - 1) < 0.02) return (-Math.log10(Kas[0]) + (-Math.log10(Kas[1]))) / 2;
    if (ratio < 2) { var pKa2 = -Math.log10(Kas[1]); return Math.max(0, Math.min(14, pKa2 + Math.log10((ratio - 1) / (2 - ratio)))); }
    if (Math.abs(ratio - 2) < 0.02) return (-Math.log10(Kas[1]) + (-Math.log10(Kas[2]))) / 2;
    if (ratio < 3) { var pKa3 = -Math.log10(Kas[2]); return Math.max(0, Math.min(14, pKa3 + Math.log10((ratio - 2) / (3 - ratio)))); }
    if (Math.abs(ratio - 3) < 0.02) return Math.min(14, 14 + Math.log10(Math.sqrt(Kw / Kas[2] * CaP / (totalVP * 1000))));
    var excessB = molesBaseP - 3 * molesAcidP;
    return Math.max(0, Math.min(14, 14 + Math.log10(excessB / totalVP)));
  }

  var Ca = preset.concAcid, Va = preset.volAcid, Cb = preset.concBase, Vb = vol;

  var Ka = preset.Ka, Kb = preset.Kb;

  var molesAcid = Ca * Va / 1000;

  var molesBase = Cb * Vb / 1000;

  var totalVolL = (Va + Vb) / 1000;

  if (Vb <= 0.001) {

    if (Ka) return Math.max(0, Math.min(14, -Math.log10(Math.sqrt(Ka * Ca))));

    return Math.max(0, Math.min(14, -Math.log10(Ca)));

  }

  var excess = molesAcid - molesBase;

  if (excess > 1e-7) {

    // Before equivalence: excess acid

    if (!Ka && !Kb) return Math.max(0, Math.min(14, -Math.log10(excess / totalVolL)));

    if (Ka) {

      if (molesBase < 1e-7) return Math.max(0, Math.min(14, -Math.log10(Math.sqrt(Ka * (excess / totalVolL)))));

      var pKa = -Math.log10(Ka);

      return Math.max(0, Math.min(14, pKa + Math.log10(molesBase / excess)));

    }

    return Math.max(0, Math.min(14, -Math.log10(excess / totalVolL)));

  }

  if (excess > -1e-7) {

    // At equivalence

    if (!Ka && !Kb) return 7;

    if (Ka && !Kb) { var CbC = molesAcid / totalVolL; return Math.max(0, Math.min(14, 14 + Math.log10(Math.sqrt((Kw / Ka) * CbC)))); }

    if (!Ka && Kb) { var CaC = molesAcid / totalVolL; return Math.max(0, Math.min(14, -Math.log10(Math.sqrt((Kw / Kb) * CaC)))); }

    return Math.max(0, Math.min(14, 7 + 0.5 * (-Math.log10(Ka) + Math.log10(Kb))));

  }

  // After equivalence: excess base

  var excessBase = -excess;

  if (!Kb) return Math.max(0, Math.min(14, 14 + Math.log10(excessBase / totalVolL)));

  var pKb = -Math.log10(Kb);

  var pOH = pKb + Math.log10(molesAcid / excessBase);

  return Math.max(0, Math.min(14, 14 - pOH));

}



// ── Indicator Color ──

function getIndicatorColor(pH) {

  if (indicatorId === 'universal') {

    var hue = pH <= 7 ? (pH * 120 / 7) : (120 + (pH - 7) * 160 / 7);

    return 'hsl(' + Math.round(hue) + ', 75%, 50%)';

  }

  if (pH <= indicator.low) return indicator.colorLow;

  if (pH >= indicator.high) return indicator.colorHigh;

  return indicator.colorMid;

}



function getFlaskColor(pH) {

  if (indicatorId === 'phenolphthalein' && pH < indicator.low) return 'rgba(200,220,255,0.25)';

  return getIndicatorColor(pH);

}



// ── Generate Titration Curve ──

var curveData = [];

for (var v = 0; v <= maxVol; v += 0.2) {

  curveData.push({ vol: Math.round(v * 100) / 100, pH: calcPH(v) });

}

var currentPH = calcPH(volumeAdded);

var currentColor = getFlaskColor(currentPH);

var pastEquivalence = volumeAdded >= Veq - 0.3;

var equivPH = calcPH(Veq);

var indicatorStatus = currentPH < indicator.low ? 'Before endpoint' :

  currentPH > indicator.high ? 'Past endpoint' : 'At endpoint';



// ── XP Awards (window-level flag prevents re-render loop) ──

if (!window._titrationXPFlags) window._titrationXPFlags = {};

if (!d._firstRun && !window._titrationXPFlags[presetId + '_first']) {

  window._titrationXPFlags[presetId + '_first'] = true;

  setTimeout(function () {

    upd('_firstRun', true);

    if (typeof awardStemXP === 'function') awardStemXP('titrationLab', 5, 'First titration');

  }, 0);

}

if (pastEquivalence && !d._reachedEquiv && !window._titrationXPFlags[presetId + '_equiv']) {

  window._titrationXPFlags[presetId + '_equiv'] = true;

  setTimeout(function () {

    upd('_reachedEquiv', true);

    if (typeof awardStemXP === 'function') awardStemXP('titrationLab', 5, 'Reached equivalence point');

  }, 0);

}



// ── SVG Chart Dimensions ──

var svgW = 700, svgH = 300;

var pad = { top: 20, right: 20, bottom: 40, left: 50 };

var chartW = svgW - pad.left - pad.right;

var chartH = svgH - pad.top - pad.bottom;

var xScale = function (v) { return pad.left + (v / maxVol) * chartW; };

var yScale = function (pH) { return pad.top + chartH - (pH / 14) * chartH; };



// Build SVG path for full curve and current progress curve

var fullPath = '', currentPath = '';

curveData.forEach(function (pt, i) {

  var x = xScale(pt.vol).toFixed(1);

  var y = yScale(pt.pH).toFixed(1);

  var cmd = i === 0 ? 'M' : 'L';

  fullPath += cmd + x + ' ' + y + ' ';

  if (pt.vol <= volumeAdded + 0.1) currentPath += cmd + x + ' ' + y + ' ';

});



// Indicator transition zone on chart

var zoneY1 = yScale(indicator.high);

var zoneY2 = yScale(indicator.low);

var zoneH = zoneY2 - zoneY1;



// Burette dimensions

var buretteH = 260, buretteW = 36;

var liquidPct = Math.max(0, (maxVol - volumeAdded) / maxVol);

var liquidH = Math.round(liquidPct * buretteH);



// ── Render ──

// ── Safety Checklist Gate ──
if (!safetyChecked) {
  return React.createElement("div", { className: "space-y-4 max-w-2xl mx-auto animate-in fade-in duration-300" },

    // Back button
    React.createElement("button", {
      onClick: function () { setStemLabTool(null); },
      className: "text-xs font-bold text-cyan-400 hover:text-white transition-colors"
    }, "\u2190 Back"),

    // Safety gate card
    React.createElement("div", {
      className: "rounded-2xl border overflow-hidden",
      style: { background: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #92400e 100%)', borderColor: 'rgba(251,191,36,0.4)' }
    },
      // Header
      React.createElement("div", { className: "px-6 py-4 border-b", style: { borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(0,0,0,0.3)' } },
        React.createElement("h2", { className: "text-xl font-black text-amber-300 text-center" }, "\u26A0\uFE0F Lab Safety Briefing"),
        React.createElement("p", { className: "text-xs text-amber-200/70 text-center mt-1" },
          "You must complete this safety checklist before entering the Virtual Titration Lab")
      ),

      // Checklist
      React.createElement("div", { className: "p-5 space-y-2" },
        safetyItems.map(function (item) {
          var checked = safetyChecks[item.id] || false;
          return React.createElement("button", {
            key: item.id,
            onClick: function () {
              var next = Object.assign({}, safetyChecks);
              next[item.id] = !checked;
              upd('safetyChecks', next);
            },
            className: "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all " +
              (checked ? "bg-emerald-900/40 border-2 border-emerald-500/50" : "bg-black/20 border-2 border-amber-800/30 hover:border-amber-500/50")
          },
            React.createElement("div", {
              className: "w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0 " +
                (checked ? "bg-emerald-500 text-white" : "bg-amber-900/50 text-amber-600 border border-amber-700")
            }, checked ? "\u2714" : ""),
            React.createElement("span", { className: "text-lg" }, item.icon),
            React.createElement("div", { className: "flex-1 min-w-0" },
              React.createElement("div", { className: "text-sm font-bold " + (checked ? "text-emerald-300" : "text-amber-200") }, item.label),
              React.createElement("div", { className: "text-[10px] " + (checked ? "text-emerald-400/60" : "text-amber-300/50") }, item.desc)
            )
          );
        })
      ),

      // Chemical hazards for selected preset
      React.createElement("div", { className: "px-5 pb-4" },
        React.createElement("div", { className: "text-[10px] font-bold text-amber-400/70 mb-2 uppercase tracking-wider" }, "Chemicals in this experiment:"),
        React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
          (presetHazardKeys[presetId] || []).map(function (chem) {
            var h = chemHazards[chem];
            if (!h) return null;
            return React.createElement("div", {
              key: chem,
              className: "rounded-lg p-3 border",
              style: { background: 'rgba(0,0,0,0.3)', borderColor: h.color + '40' }
            },
              React.createElement("div", { className: "text-xs font-black mb-1", style: { color: h.color } }, h.name),
              React.createElement("div", { className: "text-[10px] font-bold text-red-300 mb-1" }, h.ghs.join('  ')),
              React.createElement("div", { className: "text-[9px] text-amber-200/60" }, "Signal: " + h.signal)
            );
          })
        )
      ),

      // Enter button
      React.createElement("div", { className: "px-5 pb-5" },
        React.createElement("button", {
          disabled: !allSafetyChecked,
          onClick: function () { upd('safetyChecked', true); },
          className: "w-full py-3 rounded-xl text-sm font-black transition-all " +
            (allSafetyChecked
              ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02]"
              : "bg-slate-800 text-slate-500 cursor-not-allowed")
        }, allSafetyChecked ? "\uD83E\uDDEA Enter Lab \u2014 Safety Confirmed" : "\u26A0\uFE0F Check all " + safetyItems.length + " items to continue (" + Object.keys(safetyChecks).filter(function(k) { return safetyChecks[k]; }).length + "/" + safetyItems.length + ")")
      )
    )
  );
}

// ── Main Lab Render (after safety check passed) ──
return React.createElement("div", { className: "space-y-4 max-w-4xl mx-auto animate-in fade-in duration-300" },


  // ── Persistent Safety Banner ──
  React.createElement("div", {
    className: "flex items-center gap-3 px-4 py-2 rounded-xl border",
    style: { background: 'linear-gradient(90deg, rgba(251,191,36,0.1) 0%, rgba(251,191,36,0.05) 100%)', borderColor: 'rgba(251,191,36,0.25)' }
  },
    React.createElement("div", { className: "flex items-center gap-1 text-base" }, "\uD83E\uDD7D\uD83E\uDDE4\uD83E\uDD7C"),
    React.createElement("span", { className: "text-[10px] font-bold text-amber-400/80 flex-1" }, "PPE Active \u2022 Lab Safety Verified"),
    React.createElement("button", {
      onClick: function () { upd('showSafetyRef', !showSafetyRef); },
      className: "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all " +
        (showSafetyRef ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40" : "text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10")
    }, "\u26A0\uFE0F Safety Info"),
    React.createElement("button", {
      onClick: function () { upd('showHazards', !showHazards); },
      className: "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all " +
        (showHazards ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/40" : "text-red-500/60 hover:text-red-400 hover:bg-red-500/10")
    }, "\u2623\uFE0F Hazards")
  ),

  // ── Safety Reference Panel (toggled) ──
  showSafetyRef && React.createElement("div", {
    className: "rounded-xl p-4 border space-y-2 animate-in slide-in-from-top duration-200",
    style: Object.assign({}, glass, { background: 'rgba(120,53,15,0.3)', borderColor: 'rgba(251,191,36,0.2)' })
  },
    React.createElement("div", { className: "text-xs font-black text-amber-400 mb-2" }, "\u26A0\uFE0F Quick Safety Reference"),
    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" },
      safetyItems.slice(0, 4).map(function (item) {
        return React.createElement("div", { key: item.id, className: "flex items-center gap-2 text-[10px] text-amber-200/70" },
          React.createElement("span", null, item.icon), React.createElement("span", null, item.label)
        );
      })
    ),
    React.createElement("div", { className: "text-[10px] text-amber-300/50 mt-1" },
      "\uD83D\uDEBF Eyewash: 10-second rule \u2022 \uD83E\uDDEF Fire extinguisher located \u2022 \uD83D\uDCCB SDS reviewed")
  ),

  // ── Chemical Hazards Panel (toggled) ──
  showHazards && React.createElement("div", {
    className: "rounded-xl p-4 border space-y-3 animate-in slide-in-from-top duration-200",
    style: Object.assign({}, glass, { background: 'rgba(127,29,29,0.15)', borderColor: 'rgba(248,113,113,0.2)' })
  },
    React.createElement("div", { className: "text-xs font-black text-red-400 mb-1" }, "\u2623\uFE0F Chemical Hazard Information"),
    (presetHazardKeys[presetId] || []).map(function (chem) {
      var h = chemHazards[chem];
      if (!h) return null;
      return React.createElement("div", {
        key: chem, className: "rounded-lg p-3 border",
        style: { background: 'rgba(0,0,0,0.2)', borderColor: h.color + '30' }
      },
        React.createElement("div", { className: "flex items-center justify-between mb-1" },
          React.createElement("span", { className: "text-sm font-black", style: { color: h.color } }, h.name),
          React.createElement("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full", style: { background: h.signal === 'Danger' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: h.signal === 'Danger' ? '#fca5a5' : '#fcd34d' } }, h.signal)
        ),
        React.createElement("div", { className: "text-[10px] font-bold text-red-300/80 mb-1" }, h.ghs.join('  \u2022  ')),
        React.createElement("div", { className: "space-y-0.5" },
          h.hazards.map(function (hz) { return React.createElement("div", { key: hz, className: "text-[9px] text-slate-400" }, hz); })
        ),
        React.createElement("div", { className: "mt-2 text-[9px]" },
          React.createElement("span", { className: "font-bold text-emerald-400" }, "First Aid: "),
          React.createElement("span", { className: "text-slate-400" }, h.firstAid)
        ),
        React.createElement("div", { className: "mt-1 text-[9px]" },
          React.createElement("span", { className: "font-bold text-cyan-400" }, "Disposal: "),
          React.createElement("span", { className: "text-slate-400" }, h.disposal)
        )
      );
    })
  ),

  // ── Contextual Safety Tip ──
  activeTip && React.createElement("div", {
    className: "flex items-start gap-3 px-4 py-3 rounded-xl border animate-in fade-in duration-300",
    style: { background: 'rgba(15,23,42,0.7)', borderColor: activeTip.color + '40' }
  },
    React.createElement("span", { className: "text-lg shrink-0" }, activeTip.icon),
    React.createElement("div", null,
      React.createElement("div", { className: "text-[10px] font-black uppercase tracking-wider mb-0.5", style: { color: activeTip.color } }, "Safety Tip"),
      React.createElement("div", { className: "text-[11px] text-slate-300 leading-relaxed" }, activeTip.text)
    )
  ),


  // ── Header ──

  React.createElement("div", {

    className: "rounded-2xl p-5 border",

    style: Object.assign({}, glass, { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderColor: 'rgba(56,189,248,0.2)' })

  },

    React.createElement("div", { className: "flex items-center justify-between mb-2" },

      React.createElement("button", {

        onClick: function () { setStemLabTool(null); },

        className: "text-xs font-bold text-cyan-400 hover:text-white transition-colors"

      }, "\u2190 Back"),

      React.createElement("h3", { className: "text-lg font-black text-white" }, "\uD83E\uDDEA Virtual Titration Lab"),
      React.createElement("span", { className: "text-[10px] text-slate-600 ml-1" }, "v2.0")

    ),

    React.createElement("p", { className: "text-xs text-slate-400 text-center" },

      "Flask: ", preset.acidName, " (", preset.volAcid, " mL)  \u2022  Burette: ", preset.baseName

    )

  ),

  // ── Tab Navigation ──
  React.createElement("div", { className: "flex gap-1 justify-center border-b border-slate-700 pb-2", role: "tablist" },
    [
      { id: 'titrate', label: '\uD83E\uDDEA Titrate', color: '#38bdf8' },
      { id: 'challenge', label: '\uD83C\uDFC6 Challenge', color: '#f59e0b' },
      { id: 'incidents', label: '\uD83D\uDEA8 Safety Drills', color: '#ef4444' },
      { id: 'equipment', label: '\uD83D\uDD2C Equipment', color: '#22c55e' },
      { id: 'molarity', label: '\uD83E\uDDEE Dilution Calc', color: '#a78bfa' }
    ].map(function(tab) {
      var active = labTab === tab.id;
      return React.createElement("button", {
        key: tab.id,
        role: "tab",
        'aria-selected': active,
        onClick: function() { upd('labTab', tab.id); },
        className: "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all " +
          (active ? "text-white shadow-lg scale-105" : "text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700"),
        style: active ? { background: tab.color, boxShadow: '0 0 12px ' + tab.color + '40' } : {}
      }, tab.label);
    })
  ),



  // ── Preset Buttons (visible on titrate tab) ──

  labTab === 'titrate' && React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },

    presets.map(function (p) {

      var active = p.id === presetId;

      return React.createElement("button", {

        key: p.id,

        onClick: function () {

          updMulti({ presetId: p.id, volumeAdded: 0, _reachedEquiv: false });

          if (typeof awardStemXP === 'function') awardStemXP('titrationLab', 3, 'Preset loaded');

        },

        className: "px-3 py-1.5 rounded-full text-xs font-bold transition-all " +

          (active ? "text-white shadow-lg scale-105" : "text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-slate-600"),

        style: active ? { background: p.color, boxShadow: '0 0 12px ' + p.color + '60' } : {}

      }, p.icon + " " + p.label);

    })

  ),



  // ── Indicator Selector ──

  labTab === 'titrate' && React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },

    React.createElement("span", { className: "text-[10px] text-slate-400 font-bold self-center mr-1" }, "INDICATOR:"),

    indicators.map(function (ind) {

      var active = ind.id === indicatorId;

      return React.createElement("button", {

        key: ind.id,

        onClick: function () { upd('indicator', ind.id); },

        className: "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all " +

          (active ? "text-white bg-slate-700 ring-2 ring-cyan-400" : "text-slate-400 bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700")

      }, ind.label);

    })

  ),



  // ── Volume Controls ──

  labTab === 'titrate' && React.createElement("div", {

    className: "rounded-xl p-3 border",

    style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: 'rgba(100,116,139,0.3)' })

  },

    React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },

      React.createElement("span", { className: "text-[10px] text-slate-400 font-bold" }, "TITRANT VOLUME:"),

      React.createElement("input", {

        type: "range", min: 0, max: maxVol, step: 0.1, value: volumeAdded,

        onChange: function (e) { updMulti({ volumeAdded: parseFloat(e.target.value), _prevVolume: volumeAdded }); },

        className: "flex-1 min-w-[120px] accent-cyan-400",

        style: { height: '6px' }

      }),

      React.createElement("span", {

        className: "text-sm font-black tabular-nums min-w-[70px] text-right",

        style: { color: pastEquivalence ? '#f87171' : '#38bdf8' }

      }, volumeAdded.toFixed(1) + " mL"),

      // Drip buttons

      [0.1, 0.5, 1, 5].map(function (amt) {
        var dropIcon = amt <= 0.1 ? '💧' : amt <= 1 ? '💧💧' : '🌊';
        return React.createElement("button", {
          key: amt,
          onClick: function () { updMulti({ volumeAdded: Math.min(maxVol, Math.round((volumeAdded + amt) * 10) / 10), _prevVolume: volumeAdded }); },
          className: "px-2 py-1 rounded-lg text-[10px] font-bold text-cyan-300 bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-800/40 transition-all hover:scale-105",
          title: amt <= 0.5 ? 'Drop-by-drop (precise)' : 'Stream (fast)'
        }, dropIcon + " +" + amt);
      }),

      React.createElement("button", {
        onClick: function () { updMulti({ volumeAdded: 0, _reachedEquiv: false, _prevVolume: 0 }); if (addToast) addToast('♻️ ' + safetyTips.reset.text, 'info'); },
        className: "px-2 py-1 rounded-lg text-[10px] font-bold text-amber-300 bg-amber-900/30 hover:bg-amber-800/50 border border-amber-800/40 transition-all hover:scale-105"
      }, "↺ Reset")

    )

  ),



  // ── Main Layout: Burette/Flask + SVG Chart ──

  labTab === 'titrate' && React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4" },



    // ── Left: Burette & Flask Visual ──

    React.createElement("div", {

      className: "rounded-2xl p-4 border flex flex-col items-center",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(100,116,139,0.3)' })

    },

      React.createElement("div", { className: "text-[10px] font-bold text-slate-400 mb-2" }, "BURETTE & FLASK"),



      // Burette container

      React.createElement("div", { style: { position: 'relative', width: buretteW + 40 + 'px', height: buretteH + 120 + 'px' } },



        // Scale markings

        [0, 10, 20, 30, 40, 50].map(function (ml) {

          var yPos = (ml / maxVol) * buretteH;

          return React.createElement("div", { key: ml, style: { position: 'absolute', left: '0px', top: yPos + 'px', display: 'flex', alignItems: 'center', gap: '2px' } },

            React.createElement("span", { style: { fontSize: '8px', color: '#94a3b8', width: '16px', textAlign: 'right', fontFamily: 'monospace' } }, ml),

            React.createElement("div", { style: { width: '4px', height: '1px', background: '#475569' } })

          );

        }),



        // Burette tube
        React.createElement("div", {
          style: { position: 'absolute', left: '20px', top: '0px', width: buretteW + 'px', height: buretteH + 'px',
            border: '2px solid rgba(148,163,184,0.4)', borderRadius: '4px 4px 2px 2px',
            background: 'rgba(15,23,42,0.5)', overflow: 'hidden' }
        },
          // Liquid fill (from top down)
          React.createElement("div", {
            style: { position: 'absolute', top: '0px', left: '0px', right: '0px', height: liquidH + 'px',
              background: 'linear-gradient(180deg, rgba(56,189,248,0.6) 0%, rgba(56,189,248,0.3) 100%)',
              borderBottom: '2px solid rgba(56,189,248,0.5)', transition: 'height 0.3s ease' }
          }),
          // Meniscus line
          React.createElement("div", {
            style: { position: 'absolute', top: liquidH + 'px', left: '2px', right: '2px', height: '3px',
              background: 'rgba(56,189,248,0.8)', borderRadius: '0 0 50% 50%', transition: 'top 0.3s ease' }
          }),
          // Glass shine
          React.createElement("div", {
            style: { position: 'absolute', top: 0, left: '2px', width: '4px', height: '100%',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)',
              borderRadius: '2px' }
          })
        ),


        // Stopcock with handle
        React.createElement("div", {
          style: { position: 'absolute', left: (20 + buretteW / 2 - 3) + 'px', top: buretteH + 'px',
            width: '6px', height: '15px', background: 'rgba(148,163,184,0.5)', borderRadius: '0 0 2px 2px' }
        }),
        // Stopcock handle
        React.createElement("div", {
          style: { position: 'absolute', left: (20 + buretteW / 2 - 10) + 'px', top: (buretteH + 4) + 'px',
            width: '20px', height: '5px', background: 'rgba(148,163,184,0.3)', borderRadius: '2px',
            transform: volumeAdded > 0 ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.3s ease' }
        }),


        // Animated drip (CSS animation via inline keyframes)
        volumeAdded > 0 && React.createElement("div", {
          style: { position: 'absolute', left: (20 + buretteW / 2 - 2) + 'px', top: buretteH + 16 + 'px',
            width: '4px', height: '6px', background: 'rgba(56,189,248,0.8)',
            borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
            animation: 'titrationDrip 0.8s infinite ease-in',
            filter: 'drop-shadow(0 0 3px rgba(56,189,248,0.5))' }
        }),

        // Drip CSS keyframes (injected once)
        React.createElement("style", null,
          '@keyframes titrationDrip { 0% { opacity:1; transform:translateY(0); } 70% { opacity:1; transform:translateY(12px); } 100% { opacity:0; transform:translateY(16px) scale(1.5); } } ' +
          '@keyframes stirSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } ' +
          '@keyframes bubbleRise { 0% { opacity:0.7; transform: translateY(0) scale(1); } 100% { opacity:0; transform: translateY(-20px) scale(0.3); } }'
        ),


        // Flask (Erlenmeyer shape via SVG) — Enhanced
        React.createElement("svg", {
          width: buretteW + 40, height: 90,
          style: { position: 'absolute', left: '0px', top: buretteH + 30 + 'px' }
        },
          // Flask glow when near equivalence
          pastEquivalence && React.createElement("ellipse", {
            cx: (buretteW + 40) / 2, cy: 70, rx: 30, ry: 10,
            fill: currentColor, opacity: 0.15, style: { filter: 'blur(8px)' }
          }),

          // Flask outline
          React.createElement("path", {
            d: 'M' + (buretteW / 2 + 10) + ' 0 L' + (buretteW / 2 + 14) + ' 0 L' + (buretteW / 2 + 14) + ' 20 L' + (buretteW + 35) + ' 72 L' + (buretteW + 35) + ' 78 Q' + (buretteW + 35) + ' 82 ' + (buretteW + 31) + ' 82 L5 82 Q1 82 1 78 L1 72 L' + (buretteW / 2 + 10) + ' 20 Z',
            fill: 'none', stroke: 'rgba(148,163,184,0.4)', strokeWidth: '1.5'
          }),

          // Flask liquid fill with gradient
          React.createElement("defs", null,
            React.createElement("linearGradient", { id: "flaskLiquid", x1: "0", y1: "0", x2: "0", y2: "1" },
              React.createElement("stop", { offset: "0%", stopColor: currentColor, stopOpacity: "0.5" }),
              React.createElement("stop", { offset: "100%", stopColor: currentColor, stopOpacity: "0.85" })
            )
          ),
          React.createElement("path", {
            d: 'M' + (buretteW / 2 + 14) + ' 25 L' + (buretteW + 32) + ' 72 L' + (buretteW + 32) + ' 78 Q' + (buretteW + 32) + ' 80 ' + (buretteW + 28) + ' 80 L8 80 Q4 80 4 78 L4 72 L' + (buretteW / 2 + 10) + ' 25 Z',
            fill: 'url(#flaskLiquid)', style: { transition: 'fill 0.5s ease' }
          }),

          // Glass shine on flask
          React.createElement("path", {
            d: 'M' + (buretteW / 2 + 11) + ' 5 L' + (buretteW / 2 + 12) + ' 20 L8 72',
            fill: 'none', stroke: 'rgba(255,255,255,0.12)', strokeWidth: '1.5'
          }),

          // Stir bar at bottom
          React.createElement("ellipse", {
            cx: (buretteW + 40) / 2, cy: 77, rx: 8, ry: 2.5,
            fill: '#1e293b', stroke: 'rgba(255,255,255,0.2)', strokeWidth: '0.5',
            style: { animation: volumeAdded > prevVolume ? 'stirSpin 0.5s ease-out' : 'none' }
          }),

          // Bubbles at drip entry point
          volumeAdded > 0 && volumeAdded > prevVolume && [0, 1, 2].map(function (i) {
            return React.createElement("circle", {
              key: 'b' + i,
              cx: (buretteW + 40) / 2 + (i - 1) * 4, cy: 35 + i * 5, r: 1.5 - i * 0.3,
              fill: 'rgba(56,189,248,0.4)',
              style: { animation: 'bubbleRise 1s ease-out ' + (i * 0.2) + 's infinite' }
            });
          })
        )

      ),



      // pH display below flask

      React.createElement("div", {

        className: "mt-2 text-center rounded-lg px-4 py-2 border",

        style: { background: 'rgba(15,23,42,0.6)', borderColor: currentColor, borderWidth: '2px', transition: 'border-color 0.5s ease' }

      },

        React.createElement("span", { className: "text-[10px] text-slate-400 font-bold block" }, "CURRENT pH"),

        React.createElement("span", {

          className: "text-2xl font-black tabular-nums",

          style: { color: currentColor, transition: 'color 0.5s ease' }

        }, currentPH.toFixed(2))

      )

    ),



    // ── Right: SVG Titration Curve (2 cols wide) ──

    React.createElement("div", {

      className: "lg:col-span-2 rounded-2xl p-4 border",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(100,116,139,0.3)' })

    },

      React.createElement("div", { className: "text-[10px] font-bold text-slate-400 mb-2" }, "TITRATION CURVE"),

      React.createElement("svg", {

        viewBox: '0 0 ' + svgW + ' ' + svgH, className: "w-full", preserveAspectRatio: "xMidYMid meet",

        style: { maxHeight: '340px' }

      },

        // Background

        React.createElement("rect", { x: pad.left, y: pad.top, width: chartW, height: chartH, fill: 'rgba(15,23,42,0.4)', rx: 4 }),



        // Indicator transition zone

        indicatorId !== 'universal' && React.createElement("rect", {

          x: pad.left, y: zoneY1, width: chartW, height: Math.max(0, zoneH),

          fill: indicator.colorMid, opacity: 0.12, rx: 2

        }),

        indicatorId !== 'universal' && React.createElement("text", {

          x: pad.left + 4, y: zoneY1 + 12, fill: indicator.colorMid, fontSize: '9', fontWeight: 'bold', opacity: 0.6

        }, indicator.label + ' zone'),



        // Grid lines (pH)

        [0, 2, 4, 6, 7, 8, 10, 12, 14].map(function (pH) {

          return React.createElement("line", {

            key: 'g' + pH, x1: pad.left, y1: yScale(pH), x2: pad.left + chartW, y2: yScale(pH),

            stroke: pH === 7 ? 'rgba(74,222,128,0.3)' : 'rgba(100,116,139,0.15)', strokeWidth: pH === 7 ? 1.5 : 0.5,

            strokeDasharray: pH === 7 ? '' : '3,3'

          });

        }),

        // pH 7 label

        React.createElement("text", { x: pad.left + chartW + 4, y: yScale(7) + 3, fill: '#4ade80', fontSize: '9', fontWeight: 'bold' }, 'pH 7'),



        // Y-axis labels

        [0, 2, 4, 6, 8, 10, 12, 14].map(function (pH) {

          return React.createElement("text", {

            key: 'y' + pH, x: pad.left - 6, y: yScale(pH) + 3,

            fill: '#94a3b8', fontSize: '9', textAnchor: 'end', fontFamily: 'monospace'

          }, pH);

        }),



        // X-axis labels

        [0, 10, 20, 25, 30, 40, 50].map(function (ml) {

          return React.createElement("text", {

            key: 'x' + ml, x: xScale(ml), y: pad.top + chartH + 16,

            fill: ml === Math.round(Veq) ? '#f87171' : '#94a3b8', fontSize: '9', textAnchor: 'middle',

            fontWeight: ml === Math.round(Veq) ? 'bold' : 'normal', fontFamily: 'monospace'

          }, ml + (ml === Math.round(Veq) ? ' (V\u2091)' : ''));

        }),



        // Axis labels

        React.createElement("text", { x: pad.left + chartW / 2, y: svgH - 4, fill: '#94a3b8', fontSize: '10', textAnchor: 'middle', fontWeight: 'bold' }, 'Volume of Titrant (mL)'),

        React.createElement("text", {

          x: 12, y: pad.top + chartH / 2, fill: '#94a3b8', fontSize: '10', textAnchor: 'middle', fontWeight: 'bold',

          transform: 'rotate(-90, 12, ' + (pad.top + chartH / 2) + ')'

        }, 'pH'),



        // Equivalence point vertical line

        React.createElement("line", {

          x1: xScale(Veq), y1: pad.top, x2: xScale(Veq), y2: pad.top + chartH,

          stroke: '#f87171', strokeWidth: 1.5, strokeDasharray: '5,3', opacity: 0.7

        }),



        // Full curve (faded preview)

        React.createElement("path", {

          d: fullPath, fill: 'none', stroke: 'rgba(56,189,248,0.15)', strokeWidth: 2

        }),



        // Active curve (bright, up to current volume)

        currentPath && React.createElement("path", {

          d: currentPath, fill: 'none', stroke: '#38bdf8', strokeWidth: 2.5,

          strokeLinecap: 'round', strokeLinejoin: 'round',

          style: { filter: 'drop-shadow(0 0 4px rgba(56,189,248,0.5))' }

        }),



        // Current position dot

        volumeAdded > 0 && React.createElement("circle", {

          cx: xScale(volumeAdded), cy: yScale(currentPH), r: 5,

          fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2,

          style: { filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.7))' }

        }),



        // Equivalence point marker

        React.createElement("circle", {

          cx: xScale(Veq), cy: yScale(equivPH), r: 4,

          fill: 'none', stroke: '#f87171', strokeWidth: 1.5, strokeDasharray: '2,2'

        })

      )

    )

  ),



  // ── Stats Panel ──

  labTab === 'titrate' && React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },

    // Current pH

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: 'rgba(56,189,248,0.2)' })

    },

      React.createElement("div", { className: "text-[9px] font-bold text-slate-400 mb-1" }, "CURRENT pH"),

      React.createElement("div", { className: "text-xl font-black tabular-nums", style: { color: currentColor } }, currentPH.toFixed(2)),

      React.createElement("div", {

        className: "mt-1 h-1.5 rounded-full",

        style: { background: 'linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6, #7c3aed)', position: 'relative' }

      },

        React.createElement("div", {

          style: { position: 'absolute', left: (currentPH / 14 * 100) + '%', top: '-2px',

            width: '6px', height: '10px', background: 'white', borderRadius: '3px',

            transform: 'translateX(-3px)', boxShadow: '0 0 4px rgba(0,0,0,0.5)', transition: 'left 0.3s ease' }

        })

      )

    ),

    // Volume Added

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-[9px] font-bold text-slate-400 mb-1" }, "VOLUME ADDED"),

      React.createElement("div", { className: "text-xl font-black tabular-nums text-cyan-400" }, volumeAdded.toFixed(1) + " mL"),

      React.createElement("div", { className: "text-[10px] text-slate-500 mt-1" }, "V\u2091 = " + Veq.toFixed(1) + " mL")

    ),

    // Equivalence Point

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: pastEquivalence ? 'rgba(248,113,113,0.3)' : 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-[9px] font-bold text-slate-400 mb-1" }, "EQUIVALENCE POINT"),

      React.createElement("div", { className: "text-lg font-black tabular-nums " + (pastEquivalence ? 'text-red-400' : 'text-slate-300') },

        "pH " + equivPH.toFixed(2)

      ),

      React.createElement("div", { className: "text-[10px] mt-1 " + (pastEquivalence ? 'text-red-400' : 'text-slate-500') },

        pastEquivalence ? '\u2714 Reached!' : 'Not yet reached'

      )

    ),

    // Indicator Status

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-[9px] font-bold text-slate-400 mb-1" }, "INDICATOR"),

      React.createElement("div", {

        className: "w-6 h-6 rounded-full mx-auto mb-1 border border-white/20",

        style: { background: currentColor, boxShadow: '0 0 8px ' + currentColor, transition: 'background 0.5s ease, box-shadow 0.5s ease' }

      }),

      React.createElement("div", { className: "text-[10px] font-bold text-slate-300" }, indicator.label),

      React.createElement("div", { className: "text-[9px] text-slate-500" }, indicatorStatus)

    )

  ),



  // ── Educational Panel ──

  labTab === 'titrate' && React.createElement("details", {

    className: "rounded-xl border overflow-hidden",

    style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: 'rgba(100,116,139,0.2)' })

  },

    React.createElement("summary", {

      className: "px-4 py-3 cursor-pointer text-sm font-bold text-slate-300 hover:text-white transition-colors"

    }, "\uD83D\uDCD6 Titration Science"),

    React.createElement("div", { className: "px-4 pb-4 space-y-3" },

      React.createElement("div", {

        className: "rounded-lg p-3 border border-cyan-800/30 bg-cyan-950/30"

      },

        React.createElement("h5", { className: "text-xs font-bold text-cyan-400 mb-1" }, "What is Titration?"),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" },

          "Titration is a technique to determine the concentration of an unknown solution by reacting it with a solution of known concentration (the titrant). " +

          "The titrant is added from a burette until the reaction reaches the equivalence point \u2014 where the moles of acid equal the moles of base."

        )

      ),

      React.createElement("div", {

        className: "rounded-lg p-3 border border-amber-800/30 bg-amber-950/30"

      },

        React.createElement("h5", { className: "text-xs font-bold text-amber-400 mb-1" }, "Henderson\u2013Hasselbalch Equation"),

        React.createElement("p", { className: "text-sm font-mono text-amber-200 text-center my-2" },

          "pH = pK\u2090 + log([A\u207B] / [HA])"

        ),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" },

          "This equation relates pH to the ratio of conjugate base [A\u207B] to weak acid [HA] concentrations. " +

          "At the half-equivalence point, [A\u207B] = [HA], so pH = pK\u2090."

        )

      ),

      React.createElement("div", {

        className: "rounded-lg p-3 border border-emerald-800/30 bg-emerald-950/30"

      },

        React.createElement("h5", { className: "text-xs font-bold text-emerald-400 mb-2" }, "Key Concepts"),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed mb-1" },

          React.createElement("span", { className: "font-bold text-cyan-400" }, "Equivalence Point"), " \u2014 Where moles of acid = moles of base. The pH at this point depends on the acid/base strength."

        ),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed mb-1" },

          React.createElement("span", { className: "font-bold text-pink-400" }, "Endpoint"), " \u2014 Where the indicator changes color. Ideally chosen so the endpoint \u2248 equivalence point."

        ),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed mb-1" },

          React.createElement("span", { className: "font-bold text-amber-400" }, "Buffer Region"), " \u2014 The flat part of a weak acid/base curve where pH resists change (Henderson\u2013Hasselbalch applies)."

        ),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" },

          React.createElement("span", { className: "font-bold text-emerald-400" }, "Indicators"), " \u2014 Weak acids/bases that change color at specific pH ranges. Choose one whose transition range includes the equivalence pH."

        )

      ),

      // ── Lab Safety Best Practices ──
      React.createElement("div", {
        className: "rounded-lg p-3 border border-red-800/30 bg-red-950/20"
      },
        React.createElement("h5", { className: "text-xs font-bold text-red-400 mb-2" }, "\u26A0\uFE0F Lab Safety Best Practices"),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed mb-1" },
          React.createElement("span", { className: "font-bold text-red-400" }, "\uD83E\uDDEA Spill Response"), " \u2014 Acid spill: neutralize with sodium bicarbonate, then rinse. Base spill: neutralize with dilute citric acid. Always alert others in the lab."
        ),
        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed mb-1" },
          React.createElement("span", { className: "font-bold text-amber-400" }, "\u274C Never Mix"), " \u2014 Never mix bleach with ammonia (toxic chloramine gas). Never add water to concentrated acid (exothermic splash risk \u2014 always add acid to water)."
        ),
        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed mb-1" },
          React.createElement("span", { className: "font-bold text-cyan-400" }, "\uD83E\uDDEA Equipment"), " \u2014 Rinse the burette with the titrant solution before filling. Swirl the flask gently after each addition. Read the burette at the meniscus bottom."
        ),
        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" },
          React.createElement("span", { className: "font-bold text-emerald-400" }, "\u267B\uFE0F Waste Disposal"), " \u2014 Neutralized acid/base solutions (pH 6\u20138) can go down the drain with excess water. Check your institution's chemical waste policy for concentrated solutions."
        )
      )

    )

  ),



  // ══════════════════════════════════════════════
  // CHALLENGE TAB — Safety & Theory Quiz
  // ══════════════════════════════════════════════
  labTab === 'challenge' && React.createElement("div", {
    className: "rounded-2xl p-5 border space-y-4",
    style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(245,158,11,0.3)' })
  },
    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("h3", { className: "text-sm font-black text-amber-400" }, "\uD83C\uDFC6 Lab Safety & Chemistry Challenge"),
      React.createElement("div", { className: "flex gap-2" },
        React.createElement("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400" }, "Score: " + challengeScore),
        challengeStreak >= 3 && React.createElement("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900/30 text-red-400" }, "\uD83D\uDD25 Streak: " + challengeStreak)
      )
    ),
    // Current question
    (function() {
      var cq = challengeQuestions[challengeIdx % challengeQuestions.length];
      return React.createElement("div", null,
        React.createElement("div", { className: "flex items-center gap-2 mb-2" },
          React.createElement("span", {
            className: "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider " +
              (cq.category === 'safety' ? 'bg-red-900/30 text-red-400' : cq.category === 'technique' ? 'bg-cyan-900/30 text-cyan-400' : 'bg-indigo-900/30 text-indigo-400')
          }, cq.category),
          React.createElement("span", { className: "text-[10px] text-slate-500" }, "Q" + (challengeIdx + 1) + " of " + challengeQuestions.length)
        ),
        React.createElement("p", { className: "text-sm font-semibold text-white mb-3" }, cq.q),
        React.createElement("div", { className: "flex flex-col gap-2" },
          cq.opts.map(function(opt) {
            var showResult = challengeAnswer !== null;
            var isSelected = challengeAnswer === opt;
            var isCorrect = opt === cq.answer;
            var cls = "px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ";
            if (showResult && isSelected && isCorrect) cls += "bg-emerald-600 text-white ring-2 ring-emerald-400";
            else if (showResult && isSelected && !isCorrect) cls += "bg-red-600 text-white";
            else if (showResult && isCorrect) cls += "bg-emerald-600/20 text-emerald-300 border border-emerald-500";
            else cls += "bg-slate-800/60 text-slate-200 hover:bg-slate-700/80 border border-slate-600 hover:border-slate-400";
            return React.createElement("button", {
              key: opt, disabled: showResult,
              onClick: function() {
                var correct = opt === cq.answer;
                updMulti({
                  challengeAnswer: opt,
                  challengeScore: correct ? challengeScore + cq.xp : challengeScore,
                  challengeStreak: correct ? challengeStreak + 1 : 0
                });
                if (correct && typeof awardStemXP === 'function') awardStemXP('titration-ch-' + challengeIdx, cq.xp, 'Challenge: ' + cq.q.substring(0, 30) + '...');
              },
              className: cls
            }, opt);
          })
        ),
        // Feedback
        challengeAnswer && React.createElement("div", { className: "mt-3 p-3 rounded-xl border " + (challengeAnswer === cq.answer ? "bg-emerald-900/20 border-emerald-700" : "bg-red-900/20 border-red-700") },
          React.createElement("p", { className: "text-xs font-bold mb-1 " + (challengeAnswer === cq.answer ? "text-emerald-400" : "text-red-400") },
            challengeAnswer === cq.answer ? "\u2705 Correct! +" + cq.xp + " XP" + (challengeStreak >= 3 ? " \uD83D\uDD25 Streak bonus!" : "") : "\u274C Incorrect"
          ),
          React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" }, cq.feedback),
          React.createElement("div", { className: "mt-2" },
            React.createElement("button", {
              onClick: function() {
                updMulti({ challengeIdx: (challengeIdx + 1) % challengeQuestions.length, challengeAnswer: null });
              },
              className: "px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all"
            }, "Next Question \u2192")
          )
        )
      );
    })()
  ),

  // ══════════════════════════════════════════════
  // LAB INCIDENT SIMULATOR TAB
  // ══════════════════════════════════════════════
  labTab === 'incidents' && React.createElement("div", {
    className: "rounded-2xl p-5 border space-y-4",
    style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(239,68,68,0.3)' })
  },
    React.createElement("div", { className: "flex items-center justify-between" },
      React.createElement("h3", { className: "text-sm font-black text-red-400" }, "\uD83D\uDEA8 Lab Safety Incident Simulator"),
      React.createElement("div", { className: "flex gap-2" },
        React.createElement("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400" },
          Object.keys(incidentCompleted).filter(function(k) { return incidentCompleted[k]; }).length + "/" + incidentScenarios.length + " completed"),
        React.createElement("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900/30 text-red-400" }, "Score: " + incidentScore)
      )
    ),
    React.createElement("p", { className: "text-xs text-slate-400 leading-relaxed" },
      "Practice responding to real lab emergencies. Choose the correct response to each scenario. These drills could save your life in a real lab!"
    ),
    // Scenario selector dots
    React.createElement("div", { className: "flex gap-2 justify-center" },
      incidentScenarios.map(function(sc, i) {
        var completed = incidentCompleted[sc.id];
        return React.createElement("button", {
          key: sc.id,
          onClick: function() { updMulti({ incidentIdx: i, incidentAnswer: null }); },
          className: "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all " +
            (i === incidentIdx ? "ring-2 ring-offset-1 ring-offset-slate-900 ring-red-400 " : "") +
            (completed ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 border border-slate-600 hover:border-slate-400"),
          title: sc.title
        }, completed ? "\u2714" : sc.icon);
      })
    ),
    // Current scenario
    (function() {
      var scenario = incidentScenarios[incidentIdx] || incidentScenarios[0];
      return React.createElement("div", {
        className: "rounded-xl p-4 border",
        style: { background: scenario.urgency === 'critical' ? 'rgba(127,29,29,0.2)' : scenario.urgency === 'high' ? 'rgba(120,53,15,0.2)' : 'rgba(30,41,59,0.5)', borderColor: scenario.urgency === 'critical' ? 'rgba(248,113,113,0.4)' : scenario.urgency === 'high' ? 'rgba(251,191,36,0.3)' : 'rgba(100,116,139,0.3)' }
      },
        React.createElement("div", { className: "flex items-center gap-2 mb-2" },
          React.createElement("span", { className: "text-2xl" }, scenario.icon),
          React.createElement("div", null,
            React.createElement("h4", { className: "text-sm font-black text-white" }, scenario.title),
            React.createElement("span", {
              className: "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider " +
                (scenario.urgency === 'critical' ? 'bg-red-600 text-white' : scenario.urgency === 'high' ? 'bg-amber-600 text-white' : 'bg-slate-600 text-slate-200')
            }, scenario.urgency + " urgency")
          )
        ),
        React.createElement("p", { className: "text-xs text-slate-300 mb-3 leading-relaxed" }, scenario.desc),
        React.createElement("div", { className: "text-[10px] font-bold text-red-400 mb-2" }, "What do you do?"),
        React.createElement("div", { className: "flex flex-col gap-2" },
          scenario.options.map(function(opt) {
            var showResult = incidentAnswer !== null;
            var isSelected = incidentAnswer === opt.id;
            var cls = "px-4 py-3 rounded-xl text-xs font-semibold text-left transition-all flex items-start gap-2 ";
            if (showResult && isSelected && opt.correct) cls += "bg-emerald-600 text-white ring-2 ring-emerald-400";
            else if (showResult && isSelected && !opt.correct) cls += "bg-red-600 text-white";
            else if (showResult && opt.correct) cls += "bg-emerald-600/20 text-emerald-300 border border-emerald-500";
            else cls += "bg-slate-800/60 text-slate-200 hover:bg-slate-700/80 border border-slate-600 hover:border-slate-400";
            return React.createElement("button", {
              key: opt.id, disabled: showResult,
              onClick: function() {
                var newCompleted = Object.assign({}, incidentCompleted);
                newCompleted[scenario.id] = true;
                updMulti({
                  incidentAnswer: opt.id,
                  incidentScore: opt.correct ? incidentScore + 20 : incidentScore,
                  incidentCompleted: newCompleted
                });
                if (opt.correct && typeof awardStemXP === 'function') awardStemXP('incident-' + scenario.id, 20, 'Correct safety response: ' + scenario.title);
              },
              className: cls
            },
              React.createElement("span", { className: "text-base shrink-0" }, opt.icon),
              React.createElement("span", null, opt.label)
            );
          })
        ),
        // Feedback
        incidentAnswer && (function() {
          var selected = scenario.options.find(function(o) { return o.id === incidentAnswer; });
          return React.createElement("div", {
            className: "mt-3 p-3 rounded-xl border " + (selected.correct ? "bg-emerald-900/20 border-emerald-700" : "bg-red-900/20 border-red-700")
          },
            React.createElement("p", { className: "text-xs font-bold mb-1 " + (selected.correct ? "text-emerald-400" : "text-red-400") },
              selected.correct ? "\u2705 Correct Response! +20 XP" : "\u274C Not the best response"
            ),
            React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" }, selected.feedback),
            incidentIdx < incidentScenarios.length - 1 && React.createElement("button", {
              onClick: function() { updMulti({ incidentIdx: incidentIdx + 1, incidentAnswer: null }); },
              className: "mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all"
            }, "Next Scenario \u2192")
          );
        })()
      );
    })()
  ),

  // ══════════════════════════════════════════════
  // EQUIPMENT GUIDE TAB
  // ══════════════════════════════════════════════
  labTab === 'equipment' && React.createElement("div", {
    className: "rounded-2xl p-5 border space-y-4",
    style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(34,197,94,0.3)' })
  },
    React.createElement("h3", { className: "text-sm font-black text-emerald-400 mb-2" }, "\uD83D\uDD2C Lab Equipment & Proper Technique"),
    React.createElement("p", { className: "text-xs text-slate-400 mb-3" }, "Master the correct technique for each piece of equipment. Good technique = accurate results + safe lab work."),
    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
      labEquipment.map(function(eq) {
        var isSelected = selectedEquip === eq.id;
        return React.createElement("button", {
          key: eq.id,
          onClick: function() { upd('selectedEquip', isSelected ? null : eq.id); if (!isSelected && typeof awardStemXP === 'function') awardStemXP('equip-' + eq.id, 5, 'Studied ' + eq.name); },
          className: "text-left p-3 rounded-xl border transition-all " +
            (isSelected ? "bg-emerald-900/30 border-emerald-500/50 ring-1 ring-emerald-500/30" : "bg-slate-800/40 border-slate-700 hover:border-slate-500")
        },
          React.createElement("div", { className: "flex items-center gap-2 mb-1" },
            React.createElement("span", { className: "text-lg" }, eq.icon),
            React.createElement("span", { className: "text-xs font-bold " + (isSelected ? "text-emerald-400" : "text-white") }, eq.name)
          ),
          React.createElement("p", { className: "text-[10px] text-slate-400" }, eq.desc)
        );
      })
    ),
    // Selected equipment detail
    selectedEquip && (function() {
      var eq = labEquipment.find(function(e) { return e.id === selectedEquip; });
      if (!eq) return null;
      return React.createElement("div", { className: "space-y-3 animate-in fade-in duration-200" },
        // Technique
        React.createElement("div", { className: "rounded-xl p-4 border border-emerald-800/30 bg-emerald-950/20" },
          React.createElement("h5", { className: "text-xs font-bold text-emerald-400 mb-2" }, "\u2705 Correct Technique"),
          React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" }, eq.technique)
        ),
        // Common errors
        React.createElement("div", { className: "rounded-xl p-4 border border-amber-800/30 bg-amber-950/20" },
          React.createElement("h5", { className: "text-xs font-bold text-amber-400 mb-2" }, "\u26A0\uFE0F Common Errors"),
          React.createElement("ul", { className: "space-y-1" },
            eq.errors.map(function(err, i) {
              return React.createElement("li", { key: i, className: "text-[10px] text-slate-300 flex items-start gap-1.5" },
                React.createElement("span", { className: "text-red-400 shrink-0" }, "\u2022"),
                err
              );
            })
          )
        ),
        // Safety note
        React.createElement("div", { className: "rounded-xl p-4 border border-red-800/30 bg-red-950/20" },
          React.createElement("h5", { className: "text-xs font-bold text-red-400 mb-1" }, "\uD83D\uDEE1\uFE0F Safety Note"),
          React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" }, eq.safetyNote)
        )
      );
    })()
  ),

  // ══════════════════════════════════════════════
  // DILUTION & MOLARITY CALCULATOR TAB
  // ══════════════════════════════════════════════
  labTab === 'molarity' && React.createElement("div", {
    className: "rounded-2xl p-5 border space-y-4",
    style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(167,139,250,0.3)' })
  },
    React.createElement("h3", { className: "text-sm font-black text-violet-400 mb-1" }, "\uD83E\uDDEE Dilution & Molarity Calculator"),
    React.createElement("p", { className: "text-xs text-slate-400 mb-3" }, "C\u2081V\u2081 = C\u2082V\u2082 \u2014 Calculate how to dilute a stock solution to a target concentration."),

    // Safety warning
    React.createElement("div", {
      className: "flex items-start gap-2 px-3 py-2 rounded-xl border",
      style: { background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }
    },
      React.createElement("span", { className: "text-base shrink-0" }, "\u26A0\uFE0F"),
      React.createElement("div", null,
        React.createElement("p", { className: "text-[10px] font-bold text-red-400" }, "CRITICAL SAFETY REMINDER"),
        React.createElement("p", { className: "text-[10px] text-red-300/70" }, "Always add acid TO water, never water to acid. Exothermic mixing can cause violent boiling and splash concentrated acid.")
      )
    ),

    // Calculator inputs
    React.createElement("div", { className: "grid grid-cols-2 gap-4" },
      // Stock solution (C1)
      React.createElement("div", { className: "rounded-xl p-3 border border-violet-800/30 bg-violet-950/20" },
        React.createElement("div", { className: "text-[9px] font-bold text-violet-400 mb-2 uppercase tracking-wider" }, "Stock Solution"),
        React.createElement("label", { className: "block mb-2" },
          React.createElement("span", { className: "text-[10px] text-slate-400" }, "C\u2081 (Concentration)"),
          React.createElement("div", { className: "flex items-center gap-1 mt-1" },
            React.createElement("input", {
              type: "range", min: 0.01, max: 18, step: 0.01, value: molarityCalcC1,
              onChange: function(e) { upd('molarityC1', parseFloat(e.target.value)); },
              className: "flex-1 accent-violet-500", style: { height: '4px' }
            }),
            React.createElement("span", { className: "text-xs font-mono font-bold text-violet-300 w-16 text-right" }, molarityCalcC1.toFixed(2) + " M")
          )
        ),
        React.createElement("label", { className: "block" },
          React.createElement("span", { className: "text-[10px] text-slate-400" }, "V\u2081 (Volume needed)"),
          React.createElement("div", { className: "text-lg font-black text-violet-300 mt-1" },
            (molarityCalcC2 * molarityCalcV1 / molarityCalcC1).toFixed(2) + " mL"
          ),
          React.createElement("span", { className: "text-[9px] text-slate-500" }, "Calculated from C\u2082V\u2082/C\u2081")
        )
      ),
      // Desired solution (C2, V2)
      React.createElement("div", { className: "rounded-xl p-3 border border-cyan-800/30 bg-cyan-950/20" },
        React.createElement("div", { className: "text-[9px] font-bold text-cyan-400 mb-2 uppercase tracking-wider" }, "Desired Solution"),
        React.createElement("label", { className: "block mb-2" },
          React.createElement("span", { className: "text-[10px] text-slate-400" }, "C\u2082 (Target concentration)"),
          React.createElement("div", { className: "flex items-center gap-1 mt-1" },
            React.createElement("input", {
              type: "range", min: 0.001, max: molarityCalcC1, step: 0.001, value: Math.min(molarityCalcC2, molarityCalcC1),
              onChange: function(e) { upd('molarityC2', parseFloat(e.target.value)); },
              className: "flex-1 accent-cyan-500", style: { height: '4px' }
            }),
            React.createElement("span", { className: "text-xs font-mono font-bold text-cyan-300 w-16 text-right" }, molarityCalcC2.toFixed(3) + " M")
          )
        ),
        React.createElement("label", { className: "block" },
          React.createElement("span", { className: "text-[10px] text-slate-400" }, "V\u2082 (Final volume)"),
          React.createElement("div", { className: "flex items-center gap-1 mt-1" },
            React.createElement("input", {
              type: "range", min: 1, max: 1000, step: 1, value: molarityCalcV1,
              onChange: function(e) { upd('molarityV1', parseFloat(e.target.value)); },
              className: "flex-1 accent-cyan-500", style: { height: '4px' }
            }),
            React.createElement("span", { className: "text-xs font-mono font-bold text-cyan-300 w-16 text-right" }, molarityCalcV1.toFixed(0) + " mL")
          )
        )
      )
    ),

    // Dilution procedure
    React.createElement("div", { className: "rounded-xl p-4 border border-slate-700 bg-slate-800/40" },
      React.createElement("div", { className: "text-[10px] font-bold text-white mb-2" }, "\uD83D\uDCD0 Dilution Procedure"),
      React.createElement("div", { className: "space-y-2" },
        [
          { step: 1, text: "Calculate V\u2081 = C\u2082 \u00D7 V\u2082 / C\u2081 = " + molarityCalcC2.toFixed(3) + " \u00D7 " + molarityCalcV1.toFixed(0) + " / " + molarityCalcC1.toFixed(2) + " = " + (molarityCalcC2 * molarityCalcV1 / molarityCalcC1).toFixed(2) + " mL", icon: "\uD83E\uDDEE" },
          { step: 2, text: "Add ~" + Math.round(molarityCalcV1 * 0.6) + " mL of distilled water to your volumetric flask first", icon: "\uD83D\uDCA7" },
          { step: 3, text: "Carefully measure " + (molarityCalcC2 * molarityCalcV1 / molarityCalcC1).toFixed(2) + " mL of stock solution with a pipette", icon: "\uD83E\uDDEA" },
          { step: 4, text: "Add the stock solution TO the water (never water to acid!)", icon: "\u26A0\uFE0F" },
          { step: 5, text: "Swirl gently, then fill to the " + molarityCalcV1.toFixed(0) + " mL mark with distilled water", icon: "\uD83C\uDFAF" },
          { step: 6, text: "Stopper and invert 10 times to mix thoroughly", icon: "\uD83D\uDD04" }
        ].map(function(s) {
          return React.createElement("div", { key: s.step, className: "flex items-start gap-2" },
            React.createElement("span", { className: "text-xs shrink-0" }, s.icon),
            React.createElement("span", { className: "text-[10px] text-slate-300" },
              React.createElement("span", { className: "font-bold text-white" }, "Step " + s.step + ": "), s.text
            )
          );
        })
      )
    ),

    // Dilution factor
    React.createElement("div", { className: "flex gap-3 justify-center" },
      React.createElement("div", { className: "rounded-lg px-4 py-2 text-center border border-violet-800/30 bg-violet-950/20" },
        React.createElement("div", { className: "text-[9px] text-slate-400 font-bold" }, "Dilution Factor"),
        React.createElement("div", { className: "text-sm font-black text-violet-400" }, "1:" + (molarityCalcC1 / molarityCalcC2).toFixed(1))
      ),
      React.createElement("div", { className: "rounded-lg px-4 py-2 text-center border border-cyan-800/30 bg-cyan-950/20" },
        React.createElement("div", { className: "text-[9px] text-slate-400 font-bold" }, "Water to Add"),
        React.createElement("div", { className: "text-sm font-black text-cyan-400" }, (molarityCalcV1 - molarityCalcC2 * molarityCalcV1 / molarityCalcC1).toFixed(1) + " mL")
      ),
      React.createElement("div", { className: "rounded-lg px-4 py-2 text-center border border-emerald-800/30 bg-emerald-950/20" },
        React.createElement("div", { className: "text-[9px] text-slate-400 font-bold" }, "Moles Solute"),
        React.createElement("div", { className: "text-sm font-black text-emerald-400" }, (molarityCalcC2 * molarityCalcV1 / 1000).toExponential(2) + " mol")
      )
    )
  ),

  // ── Snapshot Button ──

  React.createElement("div", { className: "flex justify-end" },

    React.createElement("button", {

      onClick: function () {

        if (typeof setToolSnapshots === 'function') {

          setToolSnapshots(function (prev) {

            return prev.concat([{

              id: 'titr-' + Date.now(), tool: 'titrationLab', label: 'Titration Lab',

              data: { presetId: presetId, indicator: indicatorId, volumeAdded: volumeAdded, pH: currentPH },

              timestamp: Date.now()

            }]);

          });

          if (addToast) addToast('\uD83D\uDCF8 Snapshot saved!', 'success');

        }

      },

      className: "px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full hover:from-cyan-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"

    }, "\uD83D\uDCF8 Snapshot")

  )

);
  }
});
