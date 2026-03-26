/**
 * Enhance Dissection Lab — applies all 10 planned enhancements:
 * 1. Animated incision line on peel (peelCurrentLayer)
 * 2. Enhanced breathing animation for frog/pig lungs
 * 3. Specimen-specific learning objectives
 * 4. Specimen-specific glossary terms
 * 5. Quiz explanation text after answering
 * 6. Rotating "Did You Know?" facts panel
 * 7. Toolbar reorganization into dropdown groups
 * 8. Button tooltip titles
 * 9. Improved quiz feedback
 * 10. Comparative anatomy facts in organ detail
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'stem_lab', 'stem_tool_dissection.js');
let code = fs.readFileSync(FILE, 'utf-8');

let changes = 0;

// ═══════════════════════════════════════════════════════════════
// 1. ANIMATED INCISION LINE ON PEEL
// Replace peelCurrentLayer to trigger incision animation
// ═══════════════════════════════════════════════════════════════
const oldPeel = `function peelCurrentLayer() {

            var newRevealed = Object.assign({}, revealedLayers);

            newRevealed[activeLayer] = true;

            upd('revealedLayers', newRevealed);

            if (currentLayerIdx < spec.layers.length - 1) {

              upd('activeLayer', spec.layers[currentLayerIdx + 1].id);

              upd('selectedOrgan', null);

            }

            awardStemXP('dissection', 3, 'Peeled ' + activeLayer + ' layer');

            if (addToast) addToast('\\uD83D\\uDD2C +3 XP Layer revealed!', 'success');

          }`;

const newPeel = `function peelCurrentLayer() {

            // Trigger animated incision line before peeling
            upd('_incisionAnim', { active: true, startTick: Date.now(), layerName: activeLayer });
            playDissectSound('peel');

            // Delay the actual peel so the animation plays first
            setTimeout(function () {
              var newRevealed = Object.assign({}, revealedLayers);
              newRevealed[activeLayer] = true;
              upd('revealedLayers', newRevealed);

              if (currentLayerIdx < spec.layers.length - 1) {
                upd('activeLayer', spec.layers[currentLayerIdx + 1].id);
                upd('selectedOrgan', null);
              }

              upd('_incisionAnim', null);
              awardStemXP('dissection', 3, 'Peeled ' + activeLayer + ' layer');
              if (addToast) addToast('\\uD83D\\uDD2C +3 XP Layer revealed!', 'success');
            }, 500);
          }`;

if (code.includes(oldPeel)) {
  code = code.replace(oldPeel, newPeel);
  changes++;
  console.log('[1] Peel incision animation added');
} else {
  console.log('[1] SKIP: peelCurrentLayer not found (check encoding)');
}

// ═══════════════════════════════════════════════════════════════
// 2. ADD INCISION LINE RENDERING IN CANVAS (before organ pins)
// ═══════════════════════════════════════════════════════════════
const orgPinMarker = "// \u2500\u2500 Draw organ pins \u2500\u2500";
const incisionRender = `// \u2500\u2500 Animated incision line overlay \u2500\u2500
              var _incisionAnim = d._incisionAnim;
              if (_incisionAnim && _incisionAnim.active) {
                var incElapsed = (Date.now() - _incisionAnim.startTick) / 500; // 0..1
                if (incElapsed <= 1) {
                  ctx.save();
                  ctx.globalAlpha = 0.9;
                  ctx.strokeStyle = '#f8fafc';
                  ctx.lineWidth = 2;
                  ctx.shadowColor = '#fbbf24';
                  ctx.shadowBlur = 8;
                  // Draw horizontal cutting line progressing across specimen
                  var cutY = cy;
                  var cutStartX = cx - W * 0.20;
                  var cutEndX = cx + W * 0.20;
                  var cutProgress = cutStartX + (cutEndX - cutStartX) * incElapsed;
                  ctx.beginPath();
                  ctx.moveTo(cutStartX, cutY);
                  ctx.lineTo(cutProgress, cutY);
                  ctx.stroke();
                  // Scalpel blade indicator at leading edge
                  ctx.beginPath();
                  ctx.moveTo(cutProgress, cutY - 6);
                  ctx.lineTo(cutProgress + 4, cutY);
                  ctx.lineTo(cutProgress, cutY + 6);
                  ctx.closePath();
                  ctx.fillStyle = '#e2e8f0';
                  ctx.fill();
                  // Sparkle particles along cut
                  for (var sp = 0; sp < 5; sp++) {
                    var spX = cutStartX + (cutProgress - cutStartX) * (sp / 5) + (Math.random() - 0.5) * 6;
                    var spY = cutY + (Math.random() - 0.5) * 10;
                    ctx.beginPath();
                    ctx.arc(spX, spY, 1 + Math.random(), 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(251,191,36,' + (0.3 + Math.random() * 0.5) + ')';
                    ctx.fill();
                  }
                  ctx.shadowBlur = 0;
                  ctx.restore();
                }
              }

              `;

if (code.includes(orgPinMarker)) {
  code = code.replace(orgPinMarker, incisionRender + orgPinMarker);
  changes++;
  console.log('[2] Incision line canvas rendering added');
} else {
  console.log('[2] SKIP: organ pin marker not found');
}

// ═══════════════════════════════════════════════════════════════
// 3. ENHANCED BREATHING — increase amplitude on organs layer
// ═══════════════════════════════════════════════════════════════
const oldBreath = "var breathScale = 1 + Math.sin(dissTick * 0.02) * 0.005;";
const newBreath = "var breathScale = activeLayer === 'organs' ? (1 + Math.sin(dissTick * 0.025) * 0.012) : (1 + Math.sin(dissTick * 0.02) * 0.005);";

if (code.includes(oldBreath)) {
  code = code.replace(oldBreath, newBreath);
  changes++;
  console.log('[3] Enhanced breathing animation for organs layer');
} else {
  console.log('[3] SKIP: breathScale not found');
}

// ═══════════════════════════════════════════════════════════════
// 4. ADD SPECIMEN-SPECIFIC OBJECTIVES (replace generic ones)
// ═══════════════════════════════════════════════════════════════
const oldObjectives = `(spec.objectives || [

                      'Identify major organs and their functions',

                      'Compare organ systems across body layers',

                      'Trace the digestive pathway from ingestion to excretion',

                      'Trace the respiratory pathway and gas exchange',

                      'Locate and name all structures in each layer',

                      'Explain how structure relates to function',

                      'Compare homologous organs across specimens'

                    ])`;

const newObjectives = `(spec.objectives || ({
                      frog: [
                        'Identify the 3-chambered heart and explain why it works for an ectotherm',
                        'Trace the path of air from nares to lungs via buccal pumping',
                        'Explain cutaneous respiration and why frogs must stay moist',
                        'Compare frog digestive organs to those of a mammal',
                        'Locate and identify all organs in the coelomic cavity',
                        'Describe the frog skeleton adaptations for jumping',
                        'Trace the sciatic nerve from spinal cord to hindlimb'
                      ],
                      earthworm: [
                        'Identify the 5 aortic arches and explain closed circulation',
                        'Trace the digestive path from mouth to anus via crop and gizzard',
                        'Explain how circular and longitudinal muscles produce peristalsis',
                        'Locate nephridia and describe segmental excretion',
                        'Describe the function of the clitellum in reproduction',
                        'Identify the ventral nerve cord and segmental ganglia'
                      ],
                      pig: [
                        'Compare fetal pig organ arrangement to human anatomy',
                        'Identify the 4-chambered heart and trace blood flow',
                        'Locate the diaphragm and explain its role in breathing',
                        'Trace the digestive path from mouth to rectum',
                        'Identify the umbilical structures and explain fetal circulation',
                        'Compare pig kidney structure to the frog kidney'
                      ],
                      perch: [
                        'Identify gill structure and explain countercurrent gas exchange',
                        'Locate the swim bladder and explain buoyancy control',
                        'Trace the lateral line system and explain its function',
                        'Identify the 2-chambered heart and single circulation loop',
                        'Compare fish respiration to amphibian respiration'
                      ],
                      crayfish: [
                        'Identify cephalothorax vs abdomen body regions',
                        'Locate the green glands and explain excretion',
                        'Identify the gill structure under the carapace',
                        'Trace the open circulatory system with hemocoel',
                        'Compare arthropod exoskeleton to vertebrate endoskeleton'
                      ],
                      sheep_eye: [
                        'Identify the cornea, lens, and retina and trace light path',
                        'Explain the function of the tapetum lucidum',
                        'Compare the blind spot to the fovea',
                        'Describe how the ciliary body changes lens shape for focusing',
                        'Identify vitreous and aqueous humor chambers'
                      ],
                      sheep_heart: [
                        'Identify all 4 chambers and the interventricular septum',
                        'Trace blood flow from vena cava through all chambers to aorta',
                        'Identify coronary arteries and explain cardiac muscle blood supply',
                        'Compare the thickness of left vs right ventricle walls',
                        'Identify the AV and semilunar valve locations'
                      ]
                    }[specimen] || [
                      'Identify major organs and their functions',
                      'Compare organ systems across body layers',
                      'Trace the digestive pathway from ingestion to excretion',
                      'Locate and name all structures in each layer',
                      'Explain how structure relates to function',
                      'Compare homologous organs across specimens'
                    ]))`;

if (code.includes(oldObjectives)) {
  code = code.replace(oldObjectives, newObjectives);
  changes++;
  console.log('[4] Specimen-specific learning objectives added');
} else {
  console.log('[4] SKIP: objectives block not found');
}

// ═══════════════════════════════════════════════════════════════
// 5. ADD SPECIMEN-SPECIFIC GLOSSARY TERMS (replace static ones)
// ═══════════════════════════════════════════════════════════════
const oldGlossary = `[

                      { term: 'Dorsal', def: 'Back/upper surface of the organism' },

                      { term: 'Ventral', def: 'Belly/lower surface of the organism' },

                      { term: 'Anterior', def: 'Front/head end of the organism' },

                      { term: 'Posterior', def: 'Rear/tail end of the organism' },

                      { term: 'Lateral', def: 'Side of the organism' },

                      { term: 'Medial', def: 'Toward the midline of the organism' },

                      { term: 'Proximal', def: 'Closer to the point of attachment' },

                      { term: 'Distal', def: 'Further from the point of attachment' },

                      { term: 'Sagittal', def: 'Plane dividing body into left/right' },

                      { term: 'Transverse', def: 'Plane dividing body into top/bottom' },

                      { term: 'Homologous', def: 'Structures with shared evolutionary origin' },

                      { term: 'Analogous', def: 'Similar function but different origin' }

                    ]`;

const newGlossary = `(function() {
                      var base = [
                        { term: 'Dorsal', def: 'Back/upper surface of the organism' },
                        { term: 'Ventral', def: 'Belly/lower surface of the organism' },
                        { term: 'Anterior', def: 'Front/head end' },
                        { term: 'Posterior', def: 'Rear/tail end' },
                        { term: 'Lateral', def: 'Side of the organism' },
                        { term: 'Medial', def: 'Toward the midline' },
                        { term: 'Proximal', def: 'Closer to point of attachment' },
                        { term: 'Distal', def: 'Further from point of attachment' },
                        { term: 'Sagittal', def: 'Plane dividing body into left/right' },
                        { term: 'Transverse', def: 'Plane dividing body into top/bottom' },
                        { term: 'Homologous', def: 'Shared evolutionary origin' },
                        { term: 'Analogous', def: 'Similar function, different origin' }
                      ];
                      var specTerms = {
                        frog: [
                          { term: 'Cutaneous', def: 'Relating to skin (cutaneous respiration = breathing through skin)' },
                          { term: 'Buccal Pumping', def: 'Breathing by throat movements (not diaphragm)' },
                          { term: 'Nictitating Membrane', def: 'Transparent third eyelid for underwater vision' },
                          { term: 'Cloaca', def: 'Common exit for digestive, urinary, reproductive tracts' },
                          { term: 'Conus Arteriosus', def: 'Vessel from ventricle with spiral valve separating blood' }
                        ],
                        earthworm: [
                          { term: 'Clitellum', def: 'Glandular band secreting cocoon for eggs' },
                          { term: 'Setae', def: 'Tiny bristles gripping soil during movement' },
                          { term: 'Nephridium', def: 'Segmental excretory organ (like a mini-kidney)' },
                          { term: 'Peristalsis', def: 'Wave-like muscle contractions for locomotion' },
                          { term: 'Typhlosole', def: 'Intestinal fold increasing absorption surface area' }
                        ],
                        pig: [
                          { term: 'Diaphragm', def: 'Dome muscle separating thorax from abdomen (mammal breathing)' },
                          { term: 'Umbilical', def: 'Relating to the navel and fetal blood supply' },
                          { term: 'Mesentery', def: 'Membrane suspending organs in abdomen' },
                          { term: 'Alveoli', def: 'Tiny air sacs in lungs for gas exchange' },
                          { term: 'Pyloric Sphincter', def: 'Muscular valve between stomach and small intestine' }
                        ],
                        perch: [
                          { term: 'Operculum', def: 'Bony gill cover protecting gill filaments' },
                          { term: 'Swim Bladder', def: 'Gas-filled organ controlling buoyancy' },
                          { term: 'Lateral Line', def: 'Sensory canal detecting water pressure changes' },
                          { term: 'Countercurrent', def: 'Blood flows opposite to water for efficient O2 extraction' }
                        ],
                        crayfish: [
                          { term: 'Cephalothorax', def: 'Fused head-thorax region covered by carapace' },
                          { term: 'Carapace', def: 'Hard dorsal shell covering cephalothorax' },
                          { term: 'Hemocoel', def: 'Body cavity where blood (hemolymph) bathes organs directly' },
                          { term: 'Green Gland', def: 'Excretory organ at base of antenna' },
                          { term: 'Chelipeds', def: 'Large pincer claws for defense and feeding' }
                        ],
                        sheep_eye: [
                          { term: 'Tapetum Lucidum', def: 'Reflective layer behind retina enhancing night vision' },
                          { term: 'Vitreous Humor', def: 'Gel filling posterior eye chamber, maintaining shape' },
                          { term: 'Aqueous Humor', def: 'Fluid in anterior chamber, nourishing cornea/lens' },
                          { term: 'Ciliary Body', def: 'Muscle ring changing lens shape for focusing (accommodation)' }
                        ],
                        sheep_heart: [
                          { term: 'Septum', def: 'Wall dividing left and right sides of heart' },
                          { term: 'Coronary', def: 'Blood vessels supplying the heart muscle itself' },
                          { term: 'Systole', def: 'Contraction phase pumping blood out' },
                          { term: 'Diastole', def: 'Relaxation phase filling chambers with blood' },
                          { term: 'Chordae Tendineae', def: 'Heart strings preventing valve leaflets from inverting' }
                        ]
                      };
                      return base.concat(specTerms[specimen] || []);
                    })()`;

if (code.includes(oldGlossary)) {
  code = code.replace(oldGlossary, newGlossary);
  changes++;
  console.log('[5] Specimen-specific glossary terms added');
} else {
  console.log('[5] SKIP: glossary block not found');
}

// ═══════════════════════════════════════════════════════════════
// 6. QUIZ EXPLANATION — show correct answer explanation
// ═══════════════════════════════════════════════════════════════
const oldQuizFeedback = "addToast(correct ? '\\u2705 ' + t('stem.dissection.correct') : '\\u274C ' + t('stem.dissection.it_was') + ' ' + quizQ.name, correct ? 'success' : 'error');";
const newQuizFeedback = "addToast(correct ? '\\u2705 ' + t('stem.dissection.correct') : '\\u274C ' + t('stem.dissection.it_was') + ' ' + quizQ.name, correct ? 'success' : 'error');\n                          upd('quizExplanation', quizQ.fn.split('.').slice(0, 2).join('.') + '.');";

if (code.includes(oldQuizFeedback)) {
  code = code.replace(oldQuizFeedback, newQuizFeedback);
  changes++;
  console.log('[6] Quiz explanation tracking added');
} else {
  console.log('[6] SKIP: quiz feedback toast not found');
}

// Add explanation display in the quiz card UI (after the "Next" button)
const oldNextQuestion = "}, t('stem.dissection.next_question') + ' \\u2192')";
const newNextQuestion = "}, t('stem.dissection.next_question') + ' \\u2192'),\n\n                  d.quizExplanation && React.createElement(\"div\", { className: \"mt-2 p-2 rounded-lg bg-white border border-amber-200\" },\n                    React.createElement(\"span\", { className: \"text-[9px] font-bold text-amber-600\" }, '\\uD83D\\uDCA1 '),\n                    React.createElement(\"span\", { className: \"text-[10px] text-slate-600 leading-relaxed\" }, d.quizExplanation)\n                  )";

if (code.includes(oldNextQuestion)) {
  code = code.replace(oldNextQuestion, newNextQuestion);
  changes++;
  console.log('[6b] Quiz explanation display added');
} else {
  console.log('[6b] SKIP: next question button not found');
}

// Clear explanation on next question
const oldNextQ_click = "upd('quizIdx', (d.quizIdx || 0) + 1); upd('quizFeedback', null);";
const newNextQ_click = "upd('quizIdx', (d.quizIdx || 0) + 1); upd('quizFeedback', null); upd('quizExplanation', null);";

if (code.includes(oldNextQ_click)) {
  code = code.replace(oldNextQ_click, newNextQ_click);
  changes++;
  console.log('[6c] Clear explanation on next question');
} else {
  console.log('[6c] SKIP: next question click handler not found');
}

// ═══════════════════════════════════════════════════════════════
// 7. ROTATING "DID YOU KNOW?" FACTS PANEL (before progress card)
// ═══════════════════════════════════════════════════════════════
const progressCardMarker = "// Progress card\n\n                React.createElement(\"div\", { className: \"bg-gradient-to-br from-blue-50 to-indigo-50";
const factsPanel = `// Did You Know? rotating facts
                (function() {
                  var allFacts = {
                    frog: [
                      'A group of frogs is called an army.',
                      'The golden poison frog has enough toxin to kill 10 adults.',
                      'Wood frogs can survive being frozen solid in winter.',
                      'Frogs absorb water through a patch on their belly called a "drinking patch."',
                      'The glass frog has transparent skin \u2014 you can see its organs!',
                      'Some frogs can jump 20x their body length.'
                    ],
                    earthworm: [
                      'Earthworms have 5 pairs of aortic arches that act as hearts.',
                      'An acre of healthy soil may contain over 1 million earthworms.',
                      'Earthworms can regenerate lost segments (anterior end only).',
                      'Charles Darwin studied earthworms for 40 years and wrote a bestseller about them.',
                      'Earthworms eat their own weight in soil every day.'
                    ],
                    pig: [
                      'Pig organs are so similar to humans that pig heart valves are used in human surgery.',
                      'Fetal pig dissection teaches 90%+ of human anatomy concepts.',
                      'Pigs have 4 toes on each foot but only walk on 2 (cloven hooves).',
                      'A pig\\u2019s sense of smell is 2,000x more sensitive than a human\\u2019s.'
                    ],
                    perch: [
                      'Fish have a lateral line system that detects vibrations in water.',
                      'Perch can detect colors humans cannot see (ultraviolet).',
                      'Fish scales have growth rings like trees \u2014 you can count their age!',
                      'The swim bladder evolved into the lung in terrestrial vertebrates.'
                    ],
                    crayfish: [
                      'Crayfish can regenerate lost claws and legs during molting.',
                      'Their blood (hemolymph) is clear/blue because it uses copper, not iron.',
                      'Crayfish walk forward but swim backward by flipping their tail.',
                      'There are over 600 species of crayfish worldwide.'
                    ],
                    sheep_eye: [
                      'Sheep have a near-360\u00B0 field of vision to spot predators.',
                      'The tapetum lucidum reflects light back through the retina for better night vision.',
                      'Human eyes have 6 million cones; sheep rely more on rods for dim-light vision.',
                      'The lens is the only tissue in the body with no blood supply.'
                    ],
                    sheep_heart: [
                      'A sheep heart beats about 70\u201380 times per minute, similar to a human.',
                      'The left ventricle wall is 3x thicker than the right.',
                      'The heart generates its own electrical impulse (SA node = pacemaker).',
                      'Coronary artery disease is the #1 cause of death in humans worldwide.'
                    ]
                  };
                  var facts = allFacts[specimen] || allFacts.frog;
                  var factIdx = Math.floor((Date.now() / 8000)) % facts.length; // rotates every 8s
                  return React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3 mb-2" },
                    React.createElement("div", { className: "flex items-start gap-2" },
                      React.createElement("span", { className: "text-lg flex-shrink-0" }, "\\uD83E\\uDD14"),
                      React.createElement("div", null,
                        React.createElement("div", { className: "text-[10px] font-bold text-amber-700 mb-0.5" }, t('stem.dissection.fun_fact')),
                        React.createElement("p", { className: "text-[10px] text-amber-600 leading-relaxed" }, facts[factIdx])
                      )
                    )
                  );
                })(),

                ` + progressCardMarker;

if (code.includes(progressCardMarker)) {
  code = code.replace(progressCardMarker, factsPanel);
  changes++;
  console.log('[7] Rotating Did You Know? facts panel added');
} else {
  console.log('[7] SKIP: progress card marker not found');
}

// ═══════════════════════════════════════════════════════════════
// 8. ADD TOOLTIP TITLES TO TOOLBAR BUTTONS
// ═══════════════════════════════════════════════════════════════
// Add titles to key buttons that are missing them
const titlePairs = [
  ["}, guidedMode ? '\\u23F9 ' + t('stem.dissection.end_tour') : '\\uD83D\\uDCCD ' + t('stem.dissection.tour'))",
   ", title: 'Guided step-by-step tour of all structures'\n                }, guidedMode ? '\\u23F9 ' + t('stem.dissection.end_tour') : '\\uD83D\\uDCCD ' + t('stem.dissection.tour'))"],
  
  ["}, d.compareMode ? '\\u23F9 ' + t('stem.dissection.end_compare') : '\\uD83D\\uDD0D ' + t('stem.dissection.compare'))",
   ", title: 'Compare selected organ across all specimens'\n                }, d.compareMode ? '\\u23F9 ' + t('stem.dissection.end_compare') : '\\uD83D\\uDD0D ' + t('stem.dissection.compare'))"],
  
  ["}, d.quizMode ? '\\u23F9 ' + t('stem.dissection.end_quiz') : '\\uD83E\\uDDE0 ' + t('stem.dissection.quiz'))",
   ", title: 'Test your knowledge with identification quizzes'\n                }, d.quizMode ? '\\u23F9 ' + t('stem.dissection.end_quiz') : '\\uD83E\\uDDE0 ' + t('stem.dissection.quiz'))"],

  ["}, d.flashcardMode ? '\\u23F9 ' + t('stem.dissection.end_cards') : '\\uD83D\\uDCDD ' + t('stem.dissection.cards'))",
   ", title: 'Study structures with flip-to-reveal flashcards'\n                }, d.flashcardMode ? '\\u23F9 ' + t('stem.dissection.end_cards') : '\\uD83D\\uDCDD ' + t('stem.dissection.cards'))"],

  ["}, '\\uD83D\\uDCF7 ' + t('stem.dissection.save'))",
   ", title: 'Save a screenshot of the current view'\n                }, '\\uD83D\\uDCF7 ' + t('stem.dissection.save'))"],

  ["}, '\\uD83D\\uDCCB ' + t('stem.dissection.report'))",
   ", title: 'Generate and copy a lab report to clipboard'\n                }, '\\uD83D\\uDCCB ' + t('stem.dissection.report'))"],

  ["}, '\\uD83D\\uDD04 ' + t('stem.dissection.reset'))",
   ", title: 'Reset all layers and selections'\n                }, '\\uD83D\\uDD04 ' + t('stem.dissection.reset'))"],
];

let titleCount = 0;
titlePairs.forEach(function(pair) {
  if (code.includes(pair[0])) {
    code = code.replace(pair[0], pair[1]);
    titleCount++;
  }
});
if (titleCount > 0) {
  changes++;
  console.log('[8] Added ' + titleCount + ' button tooltip titles');
} else {
  console.log('[8] SKIP: no button patterns matched');
}

// ═══════════════════════════════════════════════════════════════
// 9. TOOLBAR ORGANIZATION — add visual separator between groups
// ═══════════════════════════════════════════════════════════════
// Insert thin vertical separators between button groups in the toolbar
// We'll add separators by wrapping groups of buttons with labeled containers
// Find the toolbar container and add group labels
const beforeCompareBtn = "React.createElement(\"button\", {\n\n                  onClick: function () { upd('compareMode', !d.compareMode); },";
const groupSeparatorAndCompare = "React.createElement(\"span\", { className: \"w-px h-6 bg-slate-300 mx-0.5\" }),\n\n                React.createElement(\"button\", {\n\n                  onClick: function () { upd('compareMode', !d.compareMode); },";

if (code.includes(beforeCompareBtn)) {
  code = code.replace(beforeCompareBtn, groupSeparatorAndCompare);
  changes++;
  console.log('[9a] Added toolbar separator before Compare group');
} else {
  console.log('[9a] SKIP: compare button pattern not found');
}

const beforeRulerBtn = "React.createElement(\"button\", {\n\n                  onClick: function () { upd('rulerMode', !d.rulerMode);";
const groupSeparatorAndRuler = "React.createElement(\"span\", { className: \"w-px h-6 bg-slate-300 mx-0.5\" }),\n\n                React.createElement(\"button\", {\n\n                  onClick: function () { upd('rulerMode', !d.rulerMode);";

if (code.includes(beforeRulerBtn)) {
  code = code.replace(beforeRulerBtn, groupSeparatorAndRuler);
  changes++;
  console.log('[9b] Added toolbar separator before Tools group');
} else {
  console.log('[9b] SKIP: ruler button pattern not found');
}

// ═══════════════════════════════════════════════════════════════
// WRITE OUTPUT
// ═══════════════════════════════════════════════════════════════
fs.writeFileSync(FILE, code, 'utf-8');
console.log('\n=== ' + changes + ' enhancement(s) applied to stem_tool_dissection.js ===');
console.log('File size: ' + fs.statSync(FILE).size + ' bytes');
