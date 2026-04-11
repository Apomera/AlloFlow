// ── Titration Lab Plugin v2.0 ──
// Enhanced: 7 reaction types, lab incident simulator, safety challenge quiz,
// equipment technique guide, dilution calculator, GHS hazards for all chemicals

  // ── Audio + WCAG (auto-injected) ──
  var _titrAC = null;
  function getTitrAC() { if (!_titrAC) { try { _titrAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_titrAC && _titrAC.state==="suspended") { try { _titrAC.resume(); } catch(e) {} } return _titrAC; }
  function titrTone(f,d,tp,v) { var ac=getTitrAC(); if(!ac) return; try { var o=ac.createOscillator(); var g=ac.createGain(); o.type=tp||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v||0.07,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxTitrClick() { titrTone(600,0.03,"sine",0.04); }
  function sfxTitrSuccess() { titrTone(523,0.08,"sine",0.07); setTimeout(function(){titrTone(659,0.08,"sine",0.07);},70); setTimeout(function(){titrTone(784,0.1,"sine",0.08);},140); }
  if(!document.getElementById("titr-a11y")){var _s=document.createElement("style");_s.id="titr-a11y";_s.textContent="@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}.text-slate-400{color:#64748b!important}";document.head.appendChild(_s);}

window.StemLab.registerTool('titrationLab', {
  label: 'Titration Lab',
  icon: '\uD83E\uDDEA',
  desc: 'Virtual titration lab with S-curve graphing, safety drills, incident simulator, equipment guide, and dilution calculator.',
  category: 'science',
    questHooks: [
      { id: 'safety_check', label: 'Complete safety checklist', icon: '🧪', check: function(d) { return d.safetyChecked || false; }, progress: function(d) { return d.safetyChecked ? 'Done!' : 'Complete checklist'; } },
      { id: 'try_2_setups', label: 'Try 2 titration setups', icon: '🔬', check: function(d) { return Object.keys(d.presetsUsed || {}).length >= 2; }, progress: function(d) { return Object.keys(d.presetsUsed || {}).length + '/2'; } }
    ],
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
    var announceToSR = ctx.announceToSR;
    var a11yClick = ctx.a11yClick;

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
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-titration')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-titration';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


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

// ── Immersive Safety Walkthrough Gate ──
if (!safetyChecked) {
  var safetyStation = d.safetyStation || 1;
  var labMapFound = d.labMapFound || {};
  var chemsReviewed = d.chemsReviewed || {};
  var drillActive = d.drillActive || false;
  var drillStartTime = d.drillStartTime || 0;
  var drillAnswer = d.drillAnswer || null;
  var drillResult = d.drillResult || null;
  var mapTooltip = d.mapTooltip || null;
  var enterAnim = d.enterAnim || false;

  var ppeItems = safetyItems.slice(0, 4);
  var mapEquip = safetyItems.slice(4);
  var ppeComplete = ppeItems.every(function(it) { return safetyChecks[it.id]; });
  var mapComplete = mapEquip.every(function(it) { return labMapFound[it.id]; });
  var presChems = presetHazardKeys[presetId] || [];
  var chemsComplete = presChems.length > 0 && presChems.every(function(c) { return chemsReviewed[c]; });

  var drillForPreset = { 'sa_sb':0, 'wa_sb':2, 'sa_wb':3, 'wa_wb':4, 'poly_h3po4':0, 'redox_kmno4':1, 'back_antacid':2 };
  var drillIdx = drillForPreset[presetId] != null ? drillForPreset[presetId] : 0;
  var drillScenario = incidentScenarios[drillIdx];
  var drillComplete = drillResult !== null;

  var drillDuration = 15;
  var drillTimeLeft = drillDuration;
  if (drillActive && drillStartTime) {
    drillTimeLeft = Math.max(0, Math.ceil(drillDuration - (Date.now() - drillStartTime) / 1000));
    if (drillTimeLeft <= 0 && !drillResult) {
      setTimeout(function() { updMulti({ drillResult: 'timeout', drillActive: false }); }, 0);
    }
    if (!window._titrationDrillTimer && drillTimeLeft > 0) {
      window._titrationDrillTimer = setInterval(function() { upd('_drillTick', Date.now()); }, 200);
    }
  }
  if ((!drillActive || drillTimeLeft <= 0) && window._titrationDrillTimer) {
    clearInterval(window._titrationDrillTimer);
    window._titrationDrillTimer = null;
  }

  var allStationsComplete = ppeComplete && mapComplete && chemsComplete && drillComplete;
  var ppeCount = ppeItems.filter(function(it) { return safetyChecks[it.id]; }).length;
  var mapCount = mapEquip.filter(function(it) { return labMapFound[it.id]; }).length;
  var chemsCount = presChems.filter(function(c) { return chemsReviewed[c]; }).length;

  var stationDefs = [
    { id: 1, label: 'Suit Up', icon: '\uD83E\uDDFA', color: '#f59e0b', complete: ppeComplete, progress: ppeCount + '/' + ppeItems.length },
    { id: 2, label: 'Lab Scan', icon: '\uD83D\uDD2C', color: '#38bdf8', complete: mapComplete, progress: mapCount + '/' + mapEquip.length },
    { id: 3, label: 'Chemicals', icon: '\u2623\uFE0F', color: '#ef4444', complete: chemsComplete, progress: chemsCount + '/' + presChems.length },
    { id: 4, label: 'Safety Drill', icon: '\uD83D\uDEA8', color: '#f97316', complete: drillComplete, progress: drillComplete ? '1/1' : '0/1' }
  ];

  function canGoStation(n) {
    if (n === 1) return true;
    return stationDefs[n - 2].complete;
  }

  // ── PPE consequence data ──
  var ppeConsequences = {
    goggles: { risk: 'Chemical splash blindness', detail: 'NaOH causes alkali burns that penetrate the eye within 10 seconds. Without goggles, a single splash can cause permanent vision loss.', severity: 'critical' },
    gloves: { risk: 'Chemical burns on hands', detail: 'Concentrated HCl dissolves skin on contact. Even dilute acids cause irritation. Your hands are closest to the chemicals.', severity: 'high' },
    coat: { risk: 'Skin burns and ruined clothing', detail: 'A splash of acid or base will burn through clothing and skin. Lab coats provide a removable barrier layer.', severity: 'high' },
    shoes: { risk: 'Foot burns from spills', detail: 'A dropped beaker sends glass and chemicals across the floor. Open-toed shoes mean acid on bare feet.', severity: 'medium' }
  };

  // ── Immersive CSS ──
  var safetyCSSText = '@keyframes safetyEquipGlow { 0% { opacity:0; transform:scale(0.3) rotate(-10deg); } 60% { opacity:1; transform:scale(1.1) rotate(2deg); } 100% { opacity:1; transform:scale(1) rotate(0); } } ' +
    '@keyframes safetyPulseRing { 0%,100% { box-shadow:0 0 0 0 rgba(56,189,248,0.6); } 50% { box-shadow:0 0 0 14px rgba(56,189,248,0); } } ' +
    '@keyframes safetyPulseGlow { 0%,100% { filter:drop-shadow(0 0 4px currentColor); } 50% { filter:drop-shadow(0 0 18px currentColor); } } ' +
    '@keyframes safetyFlipIn { 0% { transform:perspective(800px) rotateY(90deg); opacity:0; } 100% { transform:perspective(800px) rotateY(0); opacity:1; } } ' +
    '@keyframes safetyUrgencyPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.08); } } ' +
    '@keyframes safetyShake { 0%,100% { transform:translateX(0); } 10%,30%,50%,70%,90% { transform:translateX(-8px); } 20%,40%,60%,80% { transform:translateX(8px); } } ' +
    '@keyframes safetyFireGlow { 0%,100% { text-shadow:0 0 8px #ff4500, 0 0 16px #ff4500; } 50% { text-shadow:0 0 16px #ff6700, 0 0 32px #ff4500, 0 0 48px #832; } } ' +
    '@keyframes safetyScanline { 0% { top:-20%; } 100% { top:120%; } } ' +
    '@keyframes safetyHeartbeat { 0%,100% { transform:scale(1); } 15% { transform:scale(1.18); } 30% { transform:scale(1); } 45% { transform:scale(1.12); } } ' +
    '@keyframes safetyDoorOpen { 0% { clip-path:inset(0 50% 0 50%); opacity:0; filter:brightness(3); } 50% { clip-path:inset(0 10% 0 10%); opacity:0.7; filter:brightness(1.5); } 100% { clip-path:inset(0); opacity:1; filter:brightness(1); } } ' +
    '@keyframes safetyFadeUp { 0% { opacity:0; transform:translateY(24px); } 100% { opacity:1; transform:translateY(0); } } ' +
    '@keyframes safetyCheckPop { 0% { transform:scale(0); } 50% { transform:scale(1.4); } 100% { transform:scale(1); } } ' +
    '@keyframes safetyConsequence { 0% { background:rgba(239,68,68,0); } 15% { background:rgba(239,68,68,0.35); } 100% { background:rgba(239,68,68,0); } } ' +
    '@keyframes safetyTimerWarn { 0%,100% { color:#ef4444; } 50% { color:#fbbf24; } } ' +
    '@keyframes safetyParticle { 0% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-60px) scale(0); } } ' +
    '@keyframes safetyStationEnter { 0% { opacity:0; transform:translateX(30px); } 100% { opacity:1; transform:translateX(0); } } ' +
    '@keyframes safetyGaugeShine { 0% { left:-100%; } 100% { left:200%; } } ' +
    '@keyframes safetyBreathe { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.02); } } ' +
    '@keyframes safetyRipple { 0% { box-shadow:0 0 0 0 currentColor; opacity:0.6; } 100% { box-shadow:0 0 0 20px transparent; opacity:0; } } ' +
    '.ppe-card-unequipped:hover { transform:translateY(-3px) scale(1.02); border-color:rgba(251,191,36,0.5) !important; box-shadow:0 8px 25px rgba(245,158,11,0.2) !important; } ' +
    '.ppe-card-unequipped { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease !important; } ';

  // ── Station theme backgrounds ──
  var stationBGs = {
    1: 'linear-gradient(135deg, #1a0f00 0%, #2d1600 30%, #3d1f00 60%, #291400 100%)',
    2: 'linear-gradient(135deg, #001a2e 0%, #002240 30%, #001830 60%, #00162e 100%)',
    3: 'linear-gradient(135deg, #2a0a0a 0%, #3d0f0f 30%, #2e0808 60%, #1f0505 100%)',
    4: 'linear-gradient(135deg, #2a1500 0%, #3d2000 30%, #2e1800 60%, #1f1000 100%)'
  };
  var stationBorders = { 1: 'rgba(251,191,36,0.35)', 2: 'rgba(56,189,248,0.35)', 3: 'rgba(239,68,68,0.35)', 4: 'rgba(249,115,22,0.35)' };

  // ── Enter Lab transition ──
  if (enterAnim) {
    var particleEmojis = ['\uD83E\uDDEA', '\u2697\uFE0F', '\uD83D\uDD2C', '\uD83E\uDDEC', '\uD83E\uDD7D', '\uD83E\uDDE4', '\uD83E\uDD7C', '\u269B\uFE0F', '\uD83D\uDCA7', '\u2B50'];
    return React.createElement("div", {
      style: { position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center',
        background:'linear-gradient(135deg, #001a1a 0%, #002e2e 50%, #003838 100%)',
        animation: 'safetyDoorOpen 1.5s ease-out forwards', overflow:'hidden' }
    },
      React.createElement("style", null, safetyCSSText),
      // Floating particles
      particleEmojis.map(function(emoji, i) {
        var xPos = 5 + (i * 9.5);
        var delay = i * 0.15;
        var duration = 2 + (i % 3) * 0.5;
        return React.createElement("div", { key:'p'+i, style: {
          position:'absolute', left: xPos + '%', bottom:'-20px', fontSize: (16 + (i % 4) * 6) + 'px',
          animation: 'safetyParticle ' + duration + 's ease ' + delay + 's both', opacity:0.6
        } }, emoji);
      }),
      // Center content
      React.createElement("div", { style: { textAlign:'center', animation:'safetyFadeUp 0.8s ease 0.5s both', position:'relative', zIndex:1 } },
        React.createElement("div", { style: { fontSize:'80px', marginBottom:'16px', animation:'safetyHeartbeat 1s ease infinite',
          filter:'drop-shadow(0 0 20px rgba(52,211,153,0.4))' } }, "\uD83E\uDDEA"),
        React.createElement("div", { style: { fontSize:'28px', fontWeight:900, color:'#34d399', letterSpacing:'3px', textTransform:'uppercase',
          textShadow:'0 0 30px rgba(52,211,153,0.3)' } }, "Lab Access Granted"),
        React.createElement("div", { style: { fontSize:'12px', color:'#6ee7b7', marginTop:'12px', opacity:0.8, letterSpacing:'1px' } },
          "All safety protocols confirmed"),
        // PPE status badges
        React.createElement("div", { style: { display:'flex', gap:'8px', justifyContent:'center', marginTop:'16px', animation:'safetyFadeUp 0.5s ease 1s both' } },
          ['\uD83E\uDD7D Goggles', '\uD83E\uDDE4 Gloves', '\uD83E\uDD7C Coat', '\uD83D\uDC5F Shoes'].map(function(label, i) {
            return React.createElement("div", { key:i, style: {
              padding:'4px 10px', borderRadius:'20px', fontSize:'9px', fontWeight:700, color:'#34d399',
              background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)',
              animation:'safetyFadeUp 0.3s ease ' + (1.2 + i * 0.1) + 's both'
            } }, '\u2714 ' + label);
          })
        )
      )
    );
  }

  return React.createElement("div", {
    className: "space-y-4 max-w-2xl mx-auto",
    style: { animation: 'safetyFadeUp 0.4s ease' }
  },
    React.createElement("style", null, safetyCSSText),

    // Back button
    React.createElement("button", { "aria-label": "Back",
      onClick: function() { setStemLabTool(null); },
      className: "text-xs font-bold text-cyan-400 hover:text-white transition-colors"
    }, "\u2190 Back"),

    // ── Header ──
    React.createElement("div", {
      className: "rounded-2xl border overflow-hidden",
      style: { background: stationBGs[safetyStation], borderColor: stationBorders[safetyStation], transition:'background 0.5s ease, border-color 0.5s ease' }
    },
      React.createElement("div", {
        className: "px-6 py-4 text-center",
        style: { background:'rgba(0,0,0,0.4)', borderBottom:'1px solid ' + stationBorders[safetyStation] }
      },
        React.createElement("div", { style: { fontSize:'28px', marginBottom:'4px' } }, "\u26A0\uFE0F"),
        React.createElement("h2", { className: "text-xl font-black", style: { color: stationDefs[safetyStation-1].color } }, "Lab Safety Briefing"),
        React.createElement("p", { className: "text-[11px] mt-1", style: { color: 'rgba(255,255,255,0.5)' } },
          "Complete all 4 safety stations before entering the Virtual " + preset.acidName.split(' ')[0] + " Lab")
      ),

      // ── Progress Stepper ──
      React.createElement("div", {
        className: "flex items-center justify-center gap-1 px-4 py-3",
        style: { background:'rgba(0,0,0,0.25)' }
      },
        stationDefs.map(function(st, i) {
          var isCurrent = safetyStation === st.id;
          var canAccess = canGoStation(st.id);
          return React.createElement("div", { key: st.id, className: "flex items-center" },
            React.createElement("button", {
              "aria-label": "Go to " + st.label + " station",
              disabled: !canAccess,
              onClick: function() { if (canAccess) upd('safetyStation', st.id); },
              className: "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all " +
                (isCurrent ? "scale-110" : canAccess ? "opacity-70 hover:opacity-100 cursor-pointer" : "opacity-30 cursor-not-allowed"),
              style: isCurrent ? { background: st.color + '25', boxShadow: '0 0 20px ' + st.color + '30' } : {}
            },
              React.createElement("div", {
                style: {
                  width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'14px', fontWeight:900, border: '2px solid ' + (st.complete ? '#10b981' : isCurrent ? st.color : 'rgba(255,255,255,0.2)'),
                  background: st.complete ? 'rgba(16,185,129,0.2)' : isCurrent ? st.color + '20' : 'rgba(0,0,0,0.3)',
                  animation: st.complete ? 'safetyCheckPop 0.4s ease' : isCurrent ? 'safetyPulseGlow 2s ease infinite' : 'none',
                  color: st.complete ? '#10b981' : st.color
                }
              }, st.complete ? "\u2714" : st.icon),
              React.createElement("span", {
                style: { fontSize:'9px', fontWeight:700, color: isCurrent ? st.color : 'rgba(255,255,255,0.5)', whiteSpace:'nowrap' }
              }, st.label),
              React.createElement("span", {
                style: { fontSize:'8px', color: st.complete ? '#10b981' : 'rgba(255,255,255,0.3)' }
              }, st.progress)
            ),
            i < 3 ? React.createElement("div", {
              style: { width:'24px', height:'2px', background: stationDefs[i].complete ? '#10b981' : 'rgba(255,255,255,0.1)', borderRadius:'1px', transition:'background 0.3s' }
            }) : null
          );
        })
      ),

      // ══════════════════════════════════════
      // STATION 1: SUIT UP (PPE)
      // ══════════════════════════════════════
      safetyStation === 1 && React.createElement("div", {
        className: "p-5 space-y-3",
        style: { animation: 'safetyStationEnter 0.4s ease' }
      },
        React.createElement("div", { className: "text-center mb-2" },
          React.createElement("div", { style: { fontSize:'14px', fontWeight:900, color:'#fbbf24', letterSpacing:'2px', textTransform:'uppercase' } }, "\uD83D\uDEE1\uFE0F Personal Protective Equipment"),
          React.createElement("p", { style: { fontSize:'11px', color:'rgba(251,191,36,0.6)', marginTop:'4px' } }, "Equip each piece of PPE before proceeding. In a real lab, you cannot touch chemicals without full protection.")
        ),

        // PPE readiness gauge
        React.createElement("div", { style: { position:'relative', height:'8px', borderRadius:'4px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(251,191,36,0.2)', overflow:'hidden' } },
          React.createElement("div", {
            style: { height:'100%', borderRadius:'4px', transition:'width 0.5s ease',
              width: (ppeCount / ppeItems.length * 100) + '%',
              background: ppeComplete ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              boxShadow: ppeComplete ? '0 0 12px rgba(16,185,129,0.5)' : '0 0 12px rgba(245,158,11,0.3)' }
          }),
          React.createElement("div", {
            style: { position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', fontSize:'7px', fontWeight:900,
              color: ppeComplete ? '#10b981' : '#fbbf24' }
          }, ppeComplete ? "\u2714 PROTECTED" : ppeCount + '/' + ppeItems.length + ' EQUIPPED')
        ),

        // PPE Grid (2x2) with consequence warnings
        React.createElement("div", { className: "grid grid-cols-2 gap-3" },
          ppeItems.map(function(item, idx) {
            var checked = safetyChecks[item.id] || false;
            var consequence = ppeConsequences[item.id];
            return React.createElement("button", {
              key: item.id,
              "aria-label": "Equip " + item.label,
              onClick: function() {
                var next = Object.assign({}, safetyChecks);
                next[item.id] = !checked;
                upd('safetyChecks', next);
              },
              className: "relative text-left p-4 rounded-xl border-2 " + (checked ? '' : 'ppe-card-unequipped'),
              style: {
                background: checked ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.3)',
                borderColor: checked ? 'rgba(16,185,129,0.5)' : 'rgba(251,191,36,0.2)',
                boxShadow: checked ? '0 0 20px rgba(16,185,129,0.15), inset 0 0 20px rgba(16,185,129,0.05)' : 'none',
                animation: checked ? 'safetyEquipGlow 0.5s ease' : 'safetyBreathe 3s ease ' + (idx * 0.5) + 's infinite',
                cursor: 'pointer'
              }
            },
              // Icon
              React.createElement("div", { style: { fontSize:'40px', textAlign:'center', marginBottom:'6px',
                filter: checked ? 'drop-shadow(0 0 10px rgba(16,185,129,0.7))' : 'grayscale(0.4) opacity(0.7)',
                transition: 'filter 0.4s ease, transform 0.4s ease', transform: checked ? 'scale(1.05)' : 'scale(0.85)' }
              }, item.icon),
              // Label
              React.createElement("div", { style: { fontSize:'13px', fontWeight:800, color: checked ? '#34d399' : '#fbbf24', textAlign:'center', transition:'color 0.3s' } }, item.label),
              // Description
              React.createElement("div", { style: { fontSize:'9px', color: checked ? 'rgba(52,211,153,0.7)' : 'rgba(251,191,36,0.45)', textAlign:'center', marginTop:'3px', lineHeight:'1.3' } }, item.desc),
              // Consequence warning (only when NOT equipped)
              !checked && consequence && React.createElement("div", {
                style: { marginTop:'8px', padding:'5px 8px', borderRadius:'6px', textAlign:'center',
                  background: consequence.severity === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.1)',
                  border: '1px solid ' + (consequence.severity === 'critical' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.2)') }
              },
                React.createElement("div", { style: { fontSize:'8px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.5px',
                  color: consequence.severity === 'critical' ? '#fca5a5' : '#fcd34d' } },
                  (consequence.severity === 'critical' ? '\u26A0\uFE0F ' : '') + 'Without this: ' + consequence.risk)
              ),
              // Equipped checkmark badge
              checked && React.createElement("div", {
                style: { position:'absolute', top:'6px', right:'6px', width:'22px', height:'22px', borderRadius:'50%',
                  background:'linear-gradient(135deg, #10b981, #059669)', display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'12px', color:'white', fontWeight:900, animation:'safetyCheckPop 0.3s ease',
                  boxShadow:'0 0 8px rgba(16,185,129,0.4)' }
              }, "\u2714"),
              // Equipped status line
              checked && React.createElement("div", {
                style: { marginTop:'8px', padding:'4px', borderRadius:'6px', textAlign:'center',
                  background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)' }
              },
                React.createElement("span", { style: { fontSize:'8px', fontWeight:700, color:'#34d399' } }, "\u2714 EQUIPPED \u2014 Protected")
              )
            );
          })
        ),

        // Next station button
        ppeComplete && React.createElement("button", {
          "aria-label": "Continue to Lab Scan station",
          onClick: function() { upd('safetyStation', 2); },
          className: "w-full py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02]",
          style: { background:'linear-gradient(90deg, #f59e0b, #d97706)', boxShadow:'0 0 20px rgba(245,158,11,0.3)', animation:'safetyFadeUp 0.4s ease' }
        }, "\uD83D\uDD2C Continue to Lab Scan \u2192")
      ),

      // ══════════════════════════════════════
      // STATION 2: LAB SCAN (Emergency Equipment)
      // ══════════════════════════════════════
      safetyStation === 2 && React.createElement("div", {
        className: "p-5 space-y-3",
        style: { animation: 'safetyStationEnter 0.4s ease' }
      },
        React.createElement("div", { className: "text-center mb-2" },
          React.createElement("div", { style: { fontSize:'14px', fontWeight:900, color:'#38bdf8', letterSpacing:'2px', textTransform:'uppercase' } }, "\uD83D\uDD0D Locate Emergency Equipment"),
          React.createElement("p", { style: { fontSize:'11px', color:'rgba(56,189,248,0.6)', marginTop:'4px' } }, "Find each piece of safety equipment on the lab map. In a real emergency, seconds matter \u2014 you must know where everything is BEFORE you start.")
        ),

        // Lab Map SVG
        React.createElement("div", {
          style: { position:'relative', borderRadius:'12px', border:'2px solid rgba(56,189,248,0.25)', overflow:'hidden', background:'rgba(0,0,0,0.4)' }
        },
          React.createElement("svg", { viewBox: "0 0 400 280", className: "w-full", style: { display:'block' } },
            // Floor
            React.createElement("rect", { x:0, y:0, width:400, height:280, fill:'#0a1929', rx:8 }),

            // Grid pattern
            [40,80,120,160,200,240,280,320,360].map(function(x) {
              return React.createElement("line", { key:'gx'+x, x1:x, y1:0, x2:x, y2:280, stroke:'rgba(56,189,248,0.05)', strokeWidth:0.5 });
            }),
            [40,80,120,160,200,240].map(function(y) {
              return React.createElement("line", { key:'gy'+y, x1:0, y1:y, x2:400, y2:y, stroke:'rgba(56,189,248,0.05)', strokeWidth:0.5 });
            }),

            // Fume hood (top)
            React.createElement("rect", { x:20, y:10, width:120, height:35, fill:'rgba(56,189,248,0.08)', stroke:'rgba(56,189,248,0.2)', strokeWidth:1, rx:3 }),
            React.createElement("text", { x:80, y:32, fill:'rgba(56,189,248,0.4)', fontSize:8, textAnchor:'middle', fontWeight:'bold' }, "FUME HOOD"),

            // Lab benches with equipment
            React.createElement("rect", { x:40, y:80, width:140, height:30, fill:'rgba(148,163,184,0.1)', stroke:'rgba(148,163,184,0.2)', strokeWidth:1, rx:2 }),
            React.createElement("rect", { x:220, y:80, width:140, height:30, fill:'rgba(148,163,184,0.1)', stroke:'rgba(148,163,184,0.2)', strokeWidth:1, rx:2 }),
            React.createElement("rect", { x:40, y:150, width:140, height:30, fill:'rgba(148,163,184,0.1)', stroke:'rgba(148,163,184,0.2)', strokeWidth:1, rx:2 }),
            React.createElement("rect", { x:220, y:150, width:140, height:30, fill:'rgba(148,163,184,0.1)', stroke:'rgba(148,163,184,0.2)', strokeWidth:1, rx:2 }),
            React.createElement("text", { x:110, y:98, fill:'rgba(148,163,184,0.3)', fontSize:7, textAnchor:'middle' }, "Bench 1"),
            React.createElement("text", { x:290, y:98, fill:'rgba(148,163,184,0.3)', fontSize:7, textAnchor:'middle' }, "Bench 2"),
            React.createElement("text", { x:110, y:168, fill:'rgba(148,163,184,0.3)', fontSize:7, textAnchor:'middle' }, "Bench 3"),

            // Tiny equipment on benches (beakers, flasks)
            React.createElement("text", { x:65, y:93, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\u2697\uFE0F"),
            React.createElement("text", { x:95, y:93, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\uD83E\uDDEA"),
            React.createElement("text", { x:130, y:93, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\uD83D\uDD2C"),
            React.createElement("text", { x:245, y:93, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\uD83E\uDDEA"),
            React.createElement("text", { x:310, y:93, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\u2697\uFE0F"),
            React.createElement("text", { x:65, y:163, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\uD83D\uDCA7"),
            React.createElement("text", { x:130, y:163, fill:'rgba(56,189,248,0.25)', fontSize:10 }, "\uD83E\uDDEA"),

            // Student position marker ("You are here")
            React.createElement("circle", { cx:200, cy:210, r:10, fill:'rgba(16,185,129,0.2)', stroke:'#10b981', strokeWidth:1.5 }),
            React.createElement("circle", { cx:200, cy:210, r:5, fill:'#10b981' }),
            React.createElement("circle", { cx:200, cy:210, r:16, fill:'transparent', stroke:'rgba(16,185,129,0.3)', strokeWidth:1,
              style: { animation:'safetyRipple 2s ease infinite' } }),
            React.createElement("text", { x:200, y:230, fill:'#10b981', fontSize:7, textAnchor:'middle', fontWeight:'bold' }, "YOU ARE HERE"),

            // Safety path lines (connect found equipment to student)
            labMapFound['eyewash'] && React.createElement("line", { x1:200, y1:210, x2:60, y2:240, stroke:'#10b981', strokeWidth:1, strokeDasharray:'4,3', opacity:0.4 }),
            labMapFound['extinguisher'] && React.createElement("line", { x1:200, y1:210, x2:370, y2:160, stroke:'#10b981', strokeWidth:1, strokeDasharray:'4,3', opacity:0.4 }),
            labMapFound['sds'] && React.createElement("line", { x1:200, y1:210, x2:250, y2:30, stroke:'#10b981', strokeWidth:1, strokeDasharray:'4,3', opacity:0.4 }),

            // Door
            React.createElement("rect", { x:370, y:240, width:25, height:35, fill:'rgba(148,163,184,0.08)', stroke:'rgba(148,163,184,0.25)', strokeWidth:1, rx:2 }),
            React.createElement("text", { x:382, y:262, fill:'rgba(148,163,184,0.4)', fontSize:7, textAnchor:'middle' }, "EXIT"),

            // Sink
            React.createElement("rect", { x:330, y:10, width:50, height:25, fill:'rgba(56,189,248,0.05)', stroke:'rgba(56,189,248,0.15)', strokeWidth:1, rx:2 }),
            React.createElement("text", { x:355, y:26, fill:'rgba(56,189,248,0.3)', fontSize:7, textAnchor:'middle' }, "Sink"),

            // Scanline animation overlay
            !mapComplete && React.createElement("rect", {
              x:0, y:0, width:400, height:40, fill:'url(#scanGrad)',
              style: { animation: 'safetyScanline 3s linear infinite' }
            }),
            React.createElement("defs", null,
              React.createElement("linearGradient", { id:'scanGrad', x1:0, y1:0, x2:0, y2:1 },
                React.createElement("stop", { offset:'0%', stopColor:'rgba(56,189,248,0)', stopOpacity:0 }),
                React.createElement("stop", { offset:'50%', stopColor:'rgba(56,189,248,0.08)', stopOpacity:1 }),
                React.createElement("stop", { offset:'100%', stopColor:'rgba(56,189,248,0)', stopOpacity:0 })
              )
            ),

            // Equipment hotspots
            // Eyewash (bottom-left area, near sink)
            !labMapFound['eyewash'] && React.createElement("g", null,
              React.createElement("circle", { cx:60, cy:240, r:16, fill:'transparent', stroke:'#38bdf8', strokeWidth:2, style: { animation:'safetyPulseRing 1.5s ease infinite' } }),
              React.createElement("circle", { cx:60, cy:240, r:8, fill:'rgba(56,189,248,0.15)', stroke:'rgba(56,189,248,0.4)', strokeWidth:1 }),
              React.createElement("text", { x:60, y:244, fill:'#38bdf8', fontSize:10, textAnchor:'middle', fontWeight:'bold' }, "?")
            ),
            labMapFound['eyewash'] && React.createElement("g", null,
              React.createElement("circle", { cx:60, cy:240, r:14, fill:'rgba(16,185,129,0.2)', stroke:'#10b981', strokeWidth:2 }),
              React.createElement("text", { x:60, y:237, fill:'white', fontSize:14, textAnchor:'middle' }, "\uD83D\uDEBF"),
              React.createElement("text", { x:60, y:254, fill:'#10b981', fontSize:6, textAnchor:'middle', fontWeight:'bold' }, "EYEWASH")
            ),

            // Fire extinguisher (right side, near door)
            !labMapFound['extinguisher'] && React.createElement("g", null,
              React.createElement("circle", { cx:370, cy:160, r:16, fill:'transparent', stroke:'#f97316', strokeWidth:2, style: { animation:'safetyPulseRing 1.5s ease 0.5s infinite' } }),
              React.createElement("circle", { cx:370, cy:160, r:8, fill:'rgba(249,115,22,0.15)', stroke:'rgba(249,115,22,0.4)', strokeWidth:1 }),
              React.createElement("text", { x:370, y:164, fill:'#f97316', fontSize:10, textAnchor:'middle', fontWeight:'bold' }, "?")
            ),
            labMapFound['extinguisher'] && React.createElement("g", null,
              React.createElement("circle", { cx:370, cy:160, r:14, fill:'rgba(16,185,129,0.2)', stroke:'#10b981', strokeWidth:2 }),
              React.createElement("text", { x:370, y:157, fill:'white', fontSize:14, textAnchor:'middle' }, "\uD83E\uDDEF"),
              React.createElement("text", { x:370, y:174, fill:'#10b981', fontSize:6, textAnchor:'middle', fontWeight:'bold' }, "FIRE EXT.")
            ),

            // SDS binder (teacher's area, top-right)
            !labMapFound['sds'] && React.createElement("g", null,
              React.createElement("circle", { cx:250, cy:30, r:16, fill:'transparent', stroke:'#a78bfa', strokeWidth:2, style: { animation:'safetyPulseRing 1.5s ease 1s infinite' } }),
              React.createElement("circle", { cx:250, cy:30, r:8, fill:'rgba(167,139,250,0.15)', stroke:'rgba(167,139,250,0.4)', strokeWidth:1 }),
              React.createElement("text", { x:250, y:34, fill:'#a78bfa', fontSize:10, textAnchor:'middle', fontWeight:'bold' }, "?")
            ),
            labMapFound['sds'] && React.createElement("g", null,
              React.createElement("circle", { cx:250, cy:30, r:14, fill:'rgba(16,185,129,0.2)', stroke:'#10b981', strokeWidth:2 }),
              React.createElement("text", { x:250, y:27, fill:'white', fontSize:14, textAnchor:'middle' }, "\uD83D\uDCCB"),
              React.createElement("text", { x:250, y:44, fill:'#10b981', fontSize:6, textAnchor:'middle', fontWeight:'bold' }, "SDS BINDER")
            )
          ),

          // Clickable overlay zones (positioned absolutely over SVG)
          React.createElement("div", { style: { position:'absolute', inset:0 } },
            // Eyewash click zone
            React.createElement("button", {
              "aria-label": "Locate eyewash station",
              style: { position:'absolute', left:'10%', top:'80%', width:'12%', height:'14%', background:'transparent', border:'none', cursor:'pointer', borderRadius:'50%' },
              onClick: function() {
                var next = Object.assign({}, labMapFound);
                next['eyewash'] = true;
                upd('labMapFound', next);
                upd('mapTooltip', 'eyewash');
                setTimeout(function() { upd('mapTooltip', null); }, 4000);
              }
            }),
            // Fire ext click zone
            React.createElement("button", {
              "aria-label": "Locate fire extinguisher",
              style: { position:'absolute', left:'86%', top:'50%', width:'12%', height:'14%', background:'transparent', border:'none', cursor:'pointer', borderRadius:'50%' },
              onClick: function() {
                var next = Object.assign({}, labMapFound);
                next['extinguisher'] = true;
                upd('labMapFound', next);
                upd('mapTooltip', 'extinguisher');
                setTimeout(function() { upd('mapTooltip', null); }, 4000);
              }
            }),
            // SDS click zone
            React.createElement("button", {
              "aria-label": "Locate SDS binder",
              style: { position:'absolute', left:'57%', top:'4%', width:'12%', height:'14%', background:'transparent', border:'none', cursor:'pointer', borderRadius:'50%' },
              onClick: function() {
                var next = Object.assign({}, labMapFound);
                next['sds'] = true;
                upd('labMapFound', next);
                upd('mapTooltip', 'sds');
                setTimeout(function() { upd('mapTooltip', null); }, 4000);
              }
            })
          )
        ),

        // Map tooltips
        mapTooltip === 'eyewash' && React.createElement("div", {
          className: "rounded-xl p-3 border",
          style: { background:'rgba(56,189,248,0.1)', borderColor:'rgba(56,189,248,0.3)', animation:'safetyFadeUp 0.3s ease' }
        },
          React.createElement("div", { style: { fontSize:'11px', fontWeight:800, color:'#38bdf8' } }, "\uD83D\uDEBF Eyewash Station Located!"),
          React.createElement("div", { style: { fontSize:'10px', color:'rgba(255,255,255,0.6)', marginTop:'4px' } }, "THE 10-SECOND RULE: If chemicals splash in your eyes, you have approximately 10 seconds to reach the eyewash before permanent damage begins. Hold eyelids open and rinse for 15+ minutes.")
        ),
        mapTooltip === 'extinguisher' && React.createElement("div", {
          className: "rounded-xl p-3 border",
          style: { background:'rgba(249,115,22,0.1)', borderColor:'rgba(249,115,22,0.3)', animation:'safetyFadeUp 0.3s ease' }
        },
          React.createElement("div", { style: { fontSize:'11px', fontWeight:800, color:'#f97316' } }, "\uD83E\uDDEF Fire Extinguisher Located!"),
          React.createElement("div", { style: { fontSize:'10px', color:'rgba(255,255,255,0.6)', marginTop:'4px' } }, "Remember P.A.S.S.: Pull the pin, Aim at base of fire, Squeeze handle, Sweep side to side. Acetic acid and some solvents are flammable \u2014 know this location before you begin.")
        ),
        mapTooltip === 'sds' && React.createElement("div", {
          className: "rounded-xl p-3 border",
          style: { background:'rgba(167,139,250,0.1)', borderColor:'rgba(167,139,250,0.3)', animation:'safetyFadeUp 0.3s ease' }
        },
          React.createElement("div", { style: { fontSize:'11px', fontWeight:800, color:'#a78bfa' } }, "\uD83D\uDCCB Safety Data Sheets Located!"),
          React.createElement("div", { style: { fontSize:'10px', color:'rgba(255,255,255,0.6)', marginTop:'4px' } }, "SDS documents list ALL hazards, required PPE, first aid procedures, and emergency contacts for every chemical in the lab. Review them BEFORE handling any substance.")
        ),

        // Equipment status grid
        React.createElement("div", { className: "grid grid-cols-3 gap-2" },
          [
            { id:'eyewash', icon:'\uD83D\uDEBF', label:'Eyewash', color:'#38bdf8', time:'~3 sec away' },
            { id:'extinguisher', icon:'\uD83E\uDDEF', label:'Fire Ext.', color:'#f97316', time:'~5 sec away' },
            { id:'sds', icon:'\uD83D\uDCCB', label:'SDS Binder', color:'#a78bfa', time:'~4 sec away' }
          ].map(function(eq) {
            var found = labMapFound[eq.id];
            return React.createElement("div", {
              key: eq.id,
              style: { padding:'8px', borderRadius:'8px', textAlign:'center', transition:'all 0.3s ease',
                background: found ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.3)',
                border: '1px solid ' + (found ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)') }
            },
              React.createElement("div", { style: { fontSize:'18px', marginBottom:'2px',
                filter: found ? 'none' : 'grayscale(1) opacity(0.3)', transition:'filter 0.3s' } }, eq.icon),
              React.createElement("div", { style: { fontSize:'9px', fontWeight:700, color: found ? '#34d399' : 'rgba(255,255,255,0.3)' } },
                found ? '\u2714 ' + eq.label : '? ? ?'),
              found && React.createElement("div", { style: { fontSize:'7px', color:'rgba(16,185,129,0.6)', marginTop:'2px' } }, eq.time)
            );
          })
        ),

        // Map complete celebration
        mapComplete && React.createElement("div", {
          style: { textAlign:'center', padding:'12px', borderRadius:'12px',
            background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)',
            animation:'safetyFadeUp 0.4s ease' }
        },
          React.createElement("div", { style: { fontSize:'13px', fontWeight:900, color:'#34d399' } }, "\uD83D\uDDFA\uFE0F Lab Safety Map Complete!"),
          React.createElement("div", { style: { fontSize:'10px', color:'rgba(16,185,129,0.6)', marginTop:'4px' } },
            "You can now locate all emergency equipment from your bench. In an emergency, every second counts \u2014 this knowledge could save a life.")
        ),

        // Navigation
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", {
            "aria-label": "Back to PPE station",
            onClick: function() { upd('safetyStation', 1); },
            className: "px-4 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-white bg-black/30 border border-slate-700 hover:border-slate-500 transition-all"
          }, "\u2190 PPE"),
          mapComplete && React.createElement("button", {
            "aria-label": "Continue to Chemical Briefing",
            onClick: function() { upd('safetyStation', 3); },
            className: "flex-1 py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02]",
            style: { background:'linear-gradient(90deg, #38bdf8, #0ea5e9)', boxShadow:'0 0 20px rgba(56,189,248,0.3)', animation:'safetyFadeUp 0.4s ease' }
          }, "\u2623\uFE0F Continue to Chemical Briefing \u2192")
        )
      ),

      // ══════════════════════════════════════
      // STATION 3: CHEMICAL HAZARD BRIEFING
      // ══════════════════════════════════════
      safetyStation === 3 && React.createElement("div", {
        className: "p-5 space-y-3",
        style: { animation: 'safetyStationEnter 0.4s ease' }
      },
        React.createElement("div", { className: "text-center mb-2" },
          React.createElement("div", { style: { fontSize:'14px', fontWeight:900, color:'#ef4444', letterSpacing:'2px', textTransform:'uppercase' } }, "\u2623\uFE0F Chemical Hazard Briefing"),
          React.createElement("p", { style: { fontSize:'11px', color:'rgba(239,68,68,0.6)', marginTop:'4px' } }, "Review EVERY chemical you will handle today. Tap each card to acknowledge you understand the hazards.")
        ),

        // Chemical cards
        React.createElement("div", { className: "space-y-3" },
          presChems.map(function(chem, ci) {
            var h = chemHazards[chem];
            if (!h) return null;
            var reviewed = chemsReviewed[chem] || false;
            return React.createElement("div", {
              key: chem,
              style: { animation: 'safetyFlipIn 0.4s ease ' + (ci * 0.1) + 's both' }
            },
              React.createElement("button", {
                "aria-label": "Review hazards for " + h.name,
                onClick: function() {
                  var next = Object.assign({}, chemsReviewed);
                  next[chem] = true;
                  upd('chemsReviewed', next);
                },
                className: "w-full text-left rounded-xl border-2 overflow-hidden transition-all",
                style: {
                  borderColor: reviewed ? 'rgba(16,185,129,0.5)' : h.color + '50',
                  background: reviewed ? 'rgba(16,185,129,0.08)' : 'rgba(0,0,0,0.3)',
                  cursor: reviewed ? 'default' : 'pointer'
                }
              },
                // Card header
                React.createElement("div", {
                  className: "flex items-center gap-3 px-4 py-3",
                  style: { borderBottom: '1px solid ' + (reviewed ? 'rgba(16,185,129,0.2)' : h.color + '20') }
                },
                  React.createElement("div", {
                    style: { width:'40px', height:'40px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center',
                      background: h.signal === 'Danger' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                      border: '2px solid ' + (h.signal === 'Danger' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'),
                      fontSize: '11px', fontWeight: 900, color: h.signal === 'Danger' ? '#fca5a5' : '#fcd34d',
                      animation: !reviewed && h.signal === 'Danger' ? 'safetyUrgencyPulse 1.5s ease infinite' : 'none' }
                  }, h.signal === 'Danger' ? '\u2620\uFE0F' : '\u26A0\uFE0F'),
                  React.createElement("div", { className: "flex-1" },
                    React.createElement("div", { style: { fontSize:'13px', fontWeight:800, color: reviewed ? '#34d399' : h.color } }, h.name),
                    React.createElement("div", { style: { fontSize:'9px', color:'rgba(255,255,255,0.4)', marginTop:'2px' } }, h.ghs.join('  \u2022  '))
                  ),
                  React.createElement("div", {
                    style: { padding:'4px 10px', borderRadius:'6px', fontSize:'9px', fontWeight:800,
                      background: h.signal === 'Danger' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                      color: h.signal === 'Danger' ? '#fca5a5' : '#fcd34d',
                      animation: !reviewed && h.signal === 'Danger' ? 'safetyUrgencyPulse 2s ease infinite' : 'none' }
                  }, h.signal.toUpperCase()),
                  reviewed && React.createElement("div", {
                    style: { width:'22px', height:'22px', borderRadius:'50%', background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'12px', color:'white', fontWeight:900, animation:'safetyCheckPop 0.3s ease' }
                  }, "\u2714")
                ),
                // Card body (hazards + first aid)
                React.createElement("div", { className: "px-4 py-3 space-y-2" },
                  React.createElement("div", null,
                    h.hazards.map(function(hz, hi) {
                      return React.createElement("div", { key: hi, style: { fontSize:'10px', color:'rgba(255,255,255,0.5)', marginBottom:'2px', paddingLeft:'8px', borderLeft:'2px solid ' + h.color + '30' } }, hz);
                    })
                  ),
                  React.createElement("div", { style: { fontSize:'10px' } },
                    React.createElement("span", { style: { fontWeight:800, color:'#10b981' } }, "\uD83C\uDFE5 First Aid: "),
                    React.createElement("span", { style: { color:'rgba(255,255,255,0.5)' } }, h.firstAid)
                  ),
                  !reviewed && React.createElement("div", {
                    style: { textAlign:'center', padding:'6px', borderRadius:'8px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)',
                      fontSize:'10px', fontWeight:700, color:'#fca5a5', marginTop:'4px' }
                  }, "\u261D Tap to acknowledge you\u2019ve reviewed this chemical")
                )
              )
            );
          })
        ),

        // Navigation
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", {
            "aria-label": "Back to Lab Scan",
            onClick: function() { upd('safetyStation', 2); },
            className: "px-4 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-white bg-black/30 border border-slate-700 hover:border-slate-500 transition-all"
          }, "\u2190 Lab Scan"),
          chemsComplete && React.createElement("button", {
            "aria-label": "Continue to Safety Drill",
            onClick: function() { upd('safetyStation', 4); },
            className: "flex-1 py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02]",
            style: { background:'linear-gradient(90deg, #ef4444, #dc2626)', boxShadow:'0 0 20px rgba(239,68,68,0.3)', animation:'safetyFadeUp 0.4s ease' }
          }, "\uD83D\uDEA8 Continue to Safety Drill \u2192")
        )
      ),

      // ══════════════════════════════════════
      // STATION 4: TIMED SAFETY DRILL
      // ══════════════════════════════════════
      safetyStation === 4 && React.createElement("div", {
        className: "p-5 space-y-3",
        style: { animation: drillResult === 'wrong' ? 'safetyShake 0.5s ease, safetyConsequence 1.5s ease' : 'safetyStationEnter 0.4s ease' }
      },
        React.createElement("div", { className: "text-center mb-2" },
          React.createElement("div", { style: { fontSize:'14px', fontWeight:900, color:'#f97316', letterSpacing:'2px', textTransform:'uppercase',
            animation: drillActive && drillTimeLeft <= 5 ? 'safetyTimerWarn 0.5s ease infinite' : 'none' } }, "\uD83D\uDEA8 Emergency Response Drill"),
          React.createElement("p", { style: { fontSize:'11px', color:'rgba(249,115,22,0.6)', marginTop:'4px' } },
            drillResult ? "Drill complete \u2014 review the outcome below." :
            drillActive ? "MAKE YOUR DECISION! Time is running out!" :
            "A simulated emergency will test your safety knowledge. You have " + drillDuration + " seconds to respond.")
        ),

        // Countdown timer (circular SVG)
        drillActive && !drillResult && React.createElement("div", { style: { display:'flex', justifyContent:'center' } },
          React.createElement("div", { style: { position:'relative', width:'80px', height:'80px' } },
            React.createElement("svg", { viewBox:"0 0 100 100", style: { transform:'rotate(-90deg)', width:'100%', height:'100%' } },
              React.createElement("circle", { cx:50, cy:50, r:45, fill:'none', stroke:'rgba(255,255,255,0.1)', strokeWidth:6 }),
              React.createElement("circle", { cx:50, cy:50, r:45, fill:'none',
                stroke: drillTimeLeft <= 5 ? '#ef4444' : drillTimeLeft <= 10 ? '#f59e0b' : '#22c55e',
                strokeWidth:6, strokeLinecap:'round',
                strokeDasharray: (2 * Math.PI * 45).toFixed(0),
                strokeDashoffset: ((1 - drillTimeLeft / drillDuration) * 2 * Math.PI * 45).toFixed(0),
                style: { transition:'stroke-dashoffset 0.2s linear, stroke 0.3s ease' }
              })
            ),
            React.createElement("div", {
              style: { position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'24px', fontWeight:900, fontFamily:'monospace',
                color: drillTimeLeft <= 5 ? '#ef4444' : drillTimeLeft <= 10 ? '#f59e0b' : '#22c55e',
                animation: drillTimeLeft <= 5 ? 'safetyHeartbeat 0.5s ease infinite' : 'none' }
            }, drillTimeLeft)
          )
        ),

        // Scenario
        !drillActive && !drillResult && React.createElement("button", {
          "aria-label": "Begin safety drill",
          onClick: function() { updMulti({ drillActive: true, drillStartTime: Date.now(), drillAnswer: null, drillResult: null }); },
          className: "w-full py-4 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02]",
          style: { background:'linear-gradient(90deg, #f97316, #ea580c)', boxShadow:'0 0 25px rgba(249,115,22,0.4)', animation:'safetyUrgencyPulse 2s ease infinite' }
        }, "\uD83D\uDEA8 Begin Emergency Drill"),

        // Scenario content
        (drillActive || drillResult) && React.createElement("div", {
          className: "rounded-xl p-4 border-2",
          style: {
            background: drillScenario.urgency === 'critical' ? 'rgba(127,29,29,0.3)' : 'rgba(120,53,15,0.2)',
            borderColor: drillScenario.urgency === 'critical' ? 'rgba(248,113,113,0.5)' : 'rgba(251,191,36,0.4)',
            animation: drillActive && !drillResult ? 'safetyUrgencyPulse 3s ease infinite' : 'none'
          }
        },
          React.createElement("div", { className: "flex items-center gap-2 mb-2" },
            React.createElement("span", { style: { fontSize:'28px', animation: drillActive && !drillResult ? 'safetyHeartbeat 1s ease infinite' : 'none' } }, drillScenario.icon),
            React.createElement("div", null,
              React.createElement("h4", { style: { fontSize:'14px', fontWeight:900, color:'#fca5a5',
                animation: drillActive && !drillResult && drillScenario.urgency === 'critical' ? 'safetyFireGlow 1s ease infinite' : 'none' } }, drillScenario.title),
              React.createElement("span", {
                style: { fontSize:'9px', fontWeight:700, padding:'2px 8px', borderRadius:'4px', textTransform:'uppercase',
                  background: drillScenario.urgency === 'critical' ? '#dc2626' : '#d97706', color:'white' }
              }, drillScenario.urgency + " URGENCY")
            )
          ),
          React.createElement("p", { style: { fontSize:'12px', color:'rgba(255,255,255,0.7)', marginBottom:'12px', lineHeight:'1.5' } }, drillScenario.desc),

          // Answer options
          React.createElement("div", { className: "space-y-2" },
            drillScenario.options.map(function(opt) {
              var isSelected = drillAnswer === opt.id;
              var showResult = drillResult !== null;
              var bgStyle = {};
              if (showResult && isSelected && opt.correct) bgStyle = { background:'rgba(16,185,129,0.3)', borderColor:'#10b981' };
              else if (showResult && isSelected && !opt.correct) bgStyle = { background:'rgba(239,68,68,0.3)', borderColor:'#ef4444' };
              else if (showResult && opt.correct) bgStyle = { background:'rgba(16,185,129,0.15)', borderColor:'#10b981' };
              else bgStyle = { background:'rgba(0,0,0,0.3)', borderColor:'rgba(255,255,255,0.15)' };
              return React.createElement("button", {
                key: opt.id,
                "aria-label": "Select response: " + opt.label,
                disabled: showResult,
                onClick: function() {
                  var result = opt.correct ? 'correct' : 'wrong';
                  updMulti({ drillAnswer: opt.id, drillResult: result, drillActive: false });
                  if (opt.correct && typeof awardStemXP === 'function') awardStemXP('safety-drill-' + drillScenario.id, 25, 'Safety drill: ' + drillScenario.title);
                },
                className: "w-full flex items-start gap-2 px-4 py-3 rounded-xl border-2 text-left transition-all",
                style: Object.assign({ cursor: showResult ? 'default' : 'pointer' }, bgStyle)
              },
                React.createElement("span", { style: { fontSize:'16px', shrink:0 } }, opt.icon),
                React.createElement("span", { style: { fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.8)' } }, opt.label)
              );
            })
          ),

          // Result feedback
          drillResult && (function() {
            var selected = drillScenario.options.find(function(o) { return o.id === drillAnswer; });
            var isTimeout = drillResult === 'timeout';
            var isCorrect = drillResult === 'correct';
            return React.createElement("div", {
              className: "mt-3 p-4 rounded-xl border-2",
              style: {
                background: isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                borderColor: isCorrect ? '#10b981' : '#ef4444',
                animation: 'safetyFadeUp 0.4s ease'
              }
            },
              React.createElement("div", { style: { fontSize:'13px', fontWeight:900, color: isCorrect ? '#34d399' : '#fca5a5', marginBottom:'8px' } },
                isCorrect ? "\u2705 CORRECT! You saved the day! +25 XP" :
                isTimeout ? "\u23F0 TIME\u2019S UP! In a real emergency, hesitation costs lives." :
                "\u274C WRONG RESPONSE! This could cause serious injury."
              ),
              !isTimeout && selected && React.createElement("p", { style: { fontSize:'11px', color:'rgba(255,255,255,0.6)', lineHeight:'1.5' } }, selected.feedback),
              isTimeout && React.createElement("p", { style: { fontSize:'11px', color:'rgba(255,255,255,0.6)', lineHeight:'1.5' } },
                "The correct response was: " + drillScenario.options.find(function(o) { return o.correct; }).label),
              !isCorrect && React.createElement("div", {
                style: { marginTop:'8px', padding:'8px', borderRadius:'8px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)' }
              },
                React.createElement("div", { style: { fontSize:'10px', fontWeight:800, color:'#34d399', marginBottom:'4px' } }, "\u2705 Correct response:"),
                React.createElement("div", { style: { fontSize:'10px', color:'rgba(255,255,255,0.6)' } },
                  drillScenario.options.find(function(o) { return o.correct; }).label),
                React.createElement("div", { style: { fontSize:'10px', color:'rgba(255,255,255,0.5)', marginTop:'4px' } },
                  drillScenario.options.find(function(o) { return o.correct; }).feedback)
              )
            );
          })()
        ),

        // Navigation / Enter Lab
        React.createElement("div", { className: "flex gap-2" },
          React.createElement("button", {
            "aria-label": "Back to Chemical Briefing",
            onClick: function() { upd('safetyStation', 3); },
            className: "px-4 py-2 rounded-xl text-[11px] font-bold text-slate-400 hover:text-white bg-black/30 border border-slate-700 hover:border-slate-500 transition-all"
          }, "\u2190 Chemicals"),
          drillResult && !allStationsComplete && React.createElement("button", {
            "aria-label": "Retry drill",
            onClick: function() { updMulti({ drillActive: false, drillStartTime: 0, drillAnswer: null, drillResult: null }); },
            className: "px-4 py-2 rounded-xl text-[11px] font-bold text-amber-400 bg-amber-900/30 border border-amber-700 hover:border-amber-500 transition-all"
          }, "\u21BA Retry Drill")
        ),

        // ── ENTER THE LAB ──
        allStationsComplete && React.createElement("button", {
          "aria-label": "Enter lab \u2014 safety confirmed",
          onClick: function() {
            upd('enterAnim', true);
            var allChecks = {};
            safetyItems.forEach(function(item) { allChecks[item.id] = true; });
            setTimeout(function() {
              updMulti({ safetyChecked: true, safetyChecks: allChecks, enterAnim: false });
            }, 2000);
          },
          className: "w-full py-4 rounded-xl text-base font-black text-white transition-all hover:scale-[1.02]",
          style: {
            background: 'linear-gradient(90deg, #10b981, #059669, #0d9488)',
            boxShadow: '0 0 30px rgba(16,185,129,0.4), 0 0 60px rgba(16,185,129,0.15)',
            animation: 'safetyFadeUp 0.5s ease, safetyPulseGlow 2s ease infinite',
            color: '#10b981'
          }
        },
          React.createElement("span", { style: { color:'white' } }, "\uD83E\uDDEA Lab Safety Confirmed \u2014 Enter Virtual Lab")
        )
      )
    )
  );
}

// ── Main Lab Render (after safety check passed) ──
return React.createElement("div", { className: "space-y-4 max-w-4xl mx-auto", style: { animation:'safetyFadeUp 0.4s ease' } },

  // Global lab CSS animations
  React.createElement("style", null,
    '@keyframes safetyFadeUp { 0% { opacity:0; transform:translateY(16px); } 100% { opacity:1; transform:translateY(0); } } ' +
    '@keyframes safetyPulseGlow { 0%,100% { filter:drop-shadow(0 0 4px currentColor); } 50% { filter:drop-shadow(0 0 18px currentColor); } } ' +
    '@keyframes labGlow { 0%,100% { opacity:0.3; } 50% { opacity:0.6; } } '
  ),


  // ── Persistent Safety Banner ──
  React.createElement("div", {
    className: "flex items-center gap-3 px-4 py-2 rounded-xl border",
    style: { background: 'linear-gradient(90deg, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.08) 100%)', borderColor: 'rgba(16,185,129,0.3)' }
  },
    React.createElement("div", { className: "flex items-center gap-1 text-base" }, "\uD83E\uDD7D\uD83E\uDDE4\uD83E\uDD7C"),
    React.createElement("span", { className: "text-[10px] font-bold text-amber-400/80 flex-1" }, "PPE Active \u2022 Lab Safety Verified"),
    React.createElement("button", { "aria-label": "Safety Info",
      onClick: function () { upd('showSafetyRef', !showSafetyRef); },
      className: "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all " +
        (showSafetyRef ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40" : "text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10")
    }, "\u26A0\uFE0F Safety Info"),
    React.createElement("button", { "aria-label": "Hazards",
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
          h.hazards.map(function (hz) { return React.createElement("div", { key: hz, className: "text-[11px] text-slate-400" }, hz); })
        ),
        React.createElement("div", { className: "mt-2 text-[11px]" },
          React.createElement("span", { className: "font-bold text-emerald-400" }, "First Aid: "),
          React.createElement("span", { className: "text-slate-400" }, h.firstAid)
        ),
        React.createElement("div", { className: "mt-1 text-[11px]" },
          React.createElement("span", { className: "font-bold text-cyan-400" }, "Disposal: "),
          React.createElement("span", { className: "text-slate-400" }, h.disposal)
        )
      );
    })
  ),

  // ── Contextual Safety Tip ──
  activeTip && React.createElement("div", {
    className: "flex items-start gap-3 px-4 py-3 rounded-xl border animate-in fade-in duration-300",
    style: { background: 'rgba(5,30,45,0.75)', borderColor: activeTip.color + '40' }
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

    style: Object.assign({}, glass, { background: 'linear-gradient(135deg, #021a2b 0%, #0a2540 50%, #0c1e35 100%)', borderColor: 'rgba(6,182,212,0.25)' })

  },

    React.createElement("div", { className: "flex items-center justify-between mb-2" },

      React.createElement("button", { "aria-label": "Back",

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
      return React.createElement("button", { "aria-label": "Switch to " + tab.label + " tab",
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

      return React.createElement("button", { "aria-label": "Select titration preset: " + p.label,

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

      return React.createElement("button", { "aria-label": "Select indicator: " + ind.label,

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

    style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: 'rgba(100,116,139,0.3)' })

  },

    React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },

      React.createElement("span", { className: "text-[10px] text-slate-400 font-bold" }, "TITRANT VOLUME:"),

      React.createElement("input", {

        type: "range", min: 0, max: maxVol, step: 0.1, value: volumeAdded,

        onChange: function (e) { updMulti({ volumeAdded: parseFloat(e.target.value), _prevVolume: volumeAdded }); },

        'aria-label': 'Titrant volume',

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
        return React.createElement("button", { "aria-label": "Add " + amt + " milliliters of titrant",
          key: amt,
          onClick: function () { updMulti({ volumeAdded: Math.min(maxVol, Math.round((volumeAdded + amt) * 10) / 10), _prevVolume: volumeAdded }); },
          className: "px-2 py-1 rounded-lg text-[10px] font-bold text-cyan-300 bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-800/40 transition-all hover:scale-105",
          title: amt <= 0.5 ? 'Drop-by-drop (precise)' : 'Stream (fast)'
        }, dropIcon + " +" + amt);
      }),

      React.createElement("button", { "aria-label": "Reset titration volume to zero",
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

      style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(100,116,139,0.3)' })

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

      style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(100,116,139,0.3)' })

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

      style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: 'rgba(56,189,248,0.2)' })

    },

      React.createElement("div", { className: "text-[11px] font-bold text-slate-400 mb-1" }, "CURRENT pH"),

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

      style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-[11px] font-bold text-slate-400 mb-1" }, "VOLUME ADDED"),

      React.createElement("div", { className: "text-xl font-black tabular-nums text-cyan-400" }, volumeAdded.toFixed(1) + " mL"),

      React.createElement("div", { className: "text-[10px] text-slate-500 mt-1" }, "V\u2091 = " + Veq.toFixed(1) + " mL")

    ),

    // Equivalence Point

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: pastEquivalence ? 'rgba(248,113,113,0.3)' : 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-[11px] font-bold text-slate-400 mb-1" }, "EQUIVALENCE POINT"),

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

      style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-[11px] font-bold text-slate-400 mb-1" }, "INDICATOR"),

      React.createElement("div", {

        className: "w-6 h-6 rounded-full mx-auto mb-1 border border-white/20",

        style: { background: currentColor, boxShadow: '0 0 8px ' + currentColor, transition: 'background 0.5s ease, box-shadow 0.5s ease' }

      }),

      React.createElement("div", { className: "text-[10px] font-bold text-slate-300" }, indicator.label),

      React.createElement("div", { className: "text-[11px] text-slate-500" }, indicatorStatus)

    )

  ),



  // ── Educational Panel ──

  labTab === 'titrate' && React.createElement("details", {

    className: "rounded-xl border overflow-hidden",

    style: Object.assign({}, glass, { background: 'rgba(5,30,45,0.75)', borderColor: 'rgba(100,116,139,0.2)' })

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
    style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(245,158,11,0.3)' })
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
            className: "text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider " +
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
            if (showResult && isSelected && isCorrect) cls += "bg-emerald-700 text-white ring-2 ring-emerald-400";
            else if (showResult && isSelected && !isCorrect) cls += "bg-red-600 text-white";
            else if (showResult && isCorrect) cls += "bg-emerald-600/20 text-emerald-300 border border-emerald-500";
            else cls += "bg-slate-800/60 text-slate-200 hover:bg-slate-700/80 border border-slate-600 hover:border-slate-400";
            return React.createElement("button", { "aria-label": "Select answer: " + opt,
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
            React.createElement("button", { "aria-label": "Next Question",
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
    style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(239,68,68,0.3)' })
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
        return React.createElement("button", { "aria-label": "Select incident scenario: " + sc.title,
          key: sc.id,
          onClick: function() { updMulti({ incidentIdx: i, incidentAnswer: null }); },
          className: "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all " +
            (i === incidentIdx ? "ring-2 ring-offset-1 ring-offset-slate-900 ring-red-400 " : "") +
            (completed ? "bg-emerald-700 text-white" : "bg-slate-800 text-slate-400 border border-slate-600 hover:border-slate-400"),
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
              className: "text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider " +
                (scenario.urgency === 'critical' ? 'bg-red-600 text-white' : scenario.urgency === 'high' ? 'bg-amber-700 text-white' : 'bg-slate-600 text-slate-200')
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
            if (showResult && isSelected && opt.correct) cls += "bg-emerald-700 text-white ring-2 ring-emerald-400";
            else if (showResult && isSelected && !opt.correct) cls += "bg-red-600 text-white";
            else if (showResult && opt.correct) cls += "bg-emerald-600/20 text-emerald-300 border border-emerald-500";
            else cls += "bg-slate-800/60 text-slate-200 hover:bg-slate-700/80 border border-slate-600 hover:border-slate-400";
            return React.createElement("button", { "aria-label": "Select emergency response: " + opt.label,
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
            incidentIdx < incidentScenarios.length - 1 && React.createElement("button", { "aria-label": "Next Scenario",
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
    style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(34,197,94,0.3)' })
  },
    React.createElement("h3", { className: "text-sm font-black text-emerald-400 mb-2" }, "\uD83D\uDD2C Lab Equipment & Proper Technique"),
    React.createElement("p", { className: "text-xs text-slate-400 mb-3" }, "Master the correct technique for each piece of equipment. Good technique = accurate results + safe lab work."),
    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
      labEquipment.map(function(eq) {
        var isSelected = selectedEquip === eq.id;
        return React.createElement("button", { "aria-label": "View equipment: " + eq.name,
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
    style: Object.assign({}, glass, { background: 'rgba(3,25,40,0.85)', borderColor: 'rgba(167,139,250,0.3)' })
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
        React.createElement("div", { className: "text-[11px] font-bold text-violet-400 mb-2 uppercase tracking-wider" }, "Stock Solution"),
        React.createElement("label", { className: "block mb-2" },
          React.createElement("span", { className: "text-[10px] text-slate-400" }, "C\u2081 (Concentration)"),
          React.createElement("div", { className: "flex items-center gap-1 mt-1" },
            React.createElement("input", {
              type: "range", min: 0.01, max: 18, step: 0.01, value: molarityCalcC1,
              onChange: function(e) { upd('molarityC1', parseFloat(e.target.value)); },
              'aria-label': 'Stock solution concentration',
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
          React.createElement("span", { className: "text-[11px] text-slate-500" }, "Calculated from C\u2082V\u2082/C\u2081")
        )
      ),
      // Desired solution (C2, V2)
      React.createElement("div", { className: "rounded-xl p-3 border border-cyan-800/30 bg-cyan-950/20" },
        React.createElement("div", { className: "text-[11px] font-bold text-cyan-400 mb-2 uppercase tracking-wider" }, "Desired Solution"),
        React.createElement("label", { className: "block mb-2" },
          React.createElement("span", { className: "text-[10px] text-slate-400" }, "C\u2082 (Target concentration)"),
          React.createElement("div", { className: "flex items-center gap-1 mt-1" },
            React.createElement("input", {
              type: "range", min: 0.001, max: molarityCalcC1, step: 0.001, value: Math.min(molarityCalcC2, molarityCalcC1),
              onChange: function(e) { upd('molarityC2', parseFloat(e.target.value)); },
              'aria-label': 'Target concentration',
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
              'aria-label': 'Final volume',
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
        React.createElement("div", { className: "text-[11px] text-slate-400 font-bold" }, "Dilution Factor"),
        React.createElement("div", { className: "text-sm font-black text-violet-400" }, "1:" + (molarityCalcC1 / molarityCalcC2).toFixed(1))
      ),
      React.createElement("div", { className: "rounded-lg px-4 py-2 text-center border border-cyan-800/30 bg-cyan-950/20" },
        React.createElement("div", { className: "text-[11px] text-slate-400 font-bold" }, "Water to Add"),
        React.createElement("div", { className: "text-sm font-black text-cyan-400" }, (molarityCalcV1 - molarityCalcC2 * molarityCalcV1 / molarityCalcC1).toFixed(1) + " mL")
      ),
      React.createElement("div", { className: "rounded-lg px-4 py-2 text-center border border-emerald-800/30 bg-emerald-950/20" },
        React.createElement("div", { className: "text-[11px] text-slate-400 font-bold" }, "Moles Solute"),
        React.createElement("div", { className: "text-sm font-black text-emerald-400" }, (molarityCalcC2 * molarityCalcV1 / 1000).toExponential(2) + " mol")
      )
    )
  ),

  // ── Snapshot Button ──

  React.createElement("div", { className: "flex justify-end" },

    React.createElement("button", { "aria-label": "Save titration snapshot",

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
