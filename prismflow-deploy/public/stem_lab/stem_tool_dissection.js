// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// stem_tool_dissection.js — Virtual Dissection Lab
// Extracted from stem_tool_science.js as a standalone module
// Uses window.StemLab.registerTool() plugin architecture

  // â•â•â• ðŸ”¬ dissection (dissection) â•â•â•
  // ── Dissection Lab Audio System ──
  var _disAC = null;
  function getDisAC() { if (!_disAC) { try { _disAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_disAC && _disAC.state === 'suspended') { try { _disAC.resume(); } catch(e) {} } return _disAC; }
  function disTone(f,d,tp,v) { var ac = getDisAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function disNoise(dur,vol,hz) { var ac = getDisAC(); if (!ac) return; try { var bs = Math.floor(ac.sampleRate*(dur||0.05)); var b = ac.createBuffer(1,bs,ac.sampleRate); var dd = b.getChannelData(0); for(var i=0;i<bs;i++) dd[i]=(Math.random()*2-1)*(1-i/bs); var s = ac.createBufferSource(); s.buffer=b; var f = ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=hz||600; var g = ac.createGain(); g.gain.setValueAtTime(vol||0.04,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(dur||0.05)); s.connect(f); f.connect(g); g.connect(ac.destination); s.start(); } catch(e) {} }
  function sfxDisCut() { disNoise(0.06, 0.05, 800); disTone(300, 0.08, 'sawtooth', 0.05); }
  function sfxDisProbe() { disTone(800, 0.04, 'sine', 0.05); setTimeout(function() { disTone(1000, 0.03, 'sine', 0.04); }, 30); }
  function sfxDisReveal() { disTone(440, 0.06, 'sine', 0.06); setTimeout(function() { disTone(554, 0.06, 'sine', 0.06); }, 50); setTimeout(function() { disTone(659, 0.08, 'sine', 0.07); }, 100); }
  function sfxDisPin() { disTone(1200, 0.03, 'square', 0.04); }
  function sfxDisLabel() { disTone(600, 0.04, 'sine', 0.05); }

  console.log('[Dissection Plugin] Registering dissection tool...');
  window.StemLab.registerTool('dissection', {
    icon: '\uD83D\uDD2C',
    label: 'dissection',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'reveal_3_layers', label: 'Reveal 3 layers of a specimen', icon: '\uD83D\uDD2C', check: function(d) { return Object.keys(d.revealedLayers || {}).length >= 3; }, progress: function(d) { return Object.keys(d.revealedLayers || {}).length + '/3 layers'; } },
      { id: 'complete_guided', label: 'Complete a guided dissection', icon: '\uD83D\uDCDA', check: function(d) { return d.guidedComplete || false; }, progress: function(d) { return d.guidedComplete ? 'Done!' : 'In progress'; } },
      { id: 'quiz_3_correct', label: 'Answer 3+ dissection quiz questions correctly', icon: '\uD83E\uDDE0', check: function(d) { return (d.quizScore || 0) >= 3; }, progress: function(d) { return (d.quizScore || 0) + '/3'; } },
      { id: 'try_2_specimens', label: 'Explore 2 different specimens', icon: '\uD83D\uDC38', check: function(d) { return Object.keys(d.specimensViewed || {}).length >= 2; }, progress: function(d) { return Object.keys(d.specimensViewed || {}).length + '/2'; } }
    ],
    render: function(ctx) {
      console.log('[Dissection Plugin] render() called, has React:', !!ctx.React, 'has toolData:', !!ctx.toolData);
      // Aliases â€” maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var callGemini = ctx.callGemini;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var canvasNarrate = ctx.canvasNarrate;
      var props = ctx.props;

      // â”€â”€ Tool body (dissection) â”€â”€
      return (function() {
var d = labToolData.dissection || {};

          // ── Specimen-specific trivia for "Did You Know?" panel ──
          var SPECIMEN_TRIVIA = {
            frog: [
              'A frog can absorb water through its skin \u2014 it never needs to drink.',
              'The golden poison dart frog has enough toxin to kill 10 adults.',
              'Frogs were the first land animals with true vocal cords.',
              'Wood frogs can survive being frozen solid and thaw back to life.',
              'A group of frogs is called an "army."'
            ],
            earthworm: [
              'Earthworms have 5 pairs of aortic arches that act as hearts.',
              'Charles Darwin studied earthworms for 39 years.',
              'A single acre can contain over 1 million earthworms.',
              'Earthworms can regenerate lost segments in some species.',
              'They eat their own weight in soil every single day.'
            ],
            pig: [
              'Pig organs are so similar to human that pig heart valves are used in surgery.',
              'Porcine insulin treated millions of diabetics before synthetic versions existed.',
              'Pigs have more taste buds (15,000) than humans (9,000).',
              'Fetal pig anatomy is 95% identical to human fetal anatomy.',
              'Pig skin is used as temporary grafts for human burn victims.'
            ],
            perch: [
              'Fish gills extract proportionally more O\u2082 from water than lungs from air.',
              'The swim bladder evolved from the same structure that became lungs in land animals.',
              'Perch scale rings can reveal the fish\u2019s exact age, like tree rings.',
              'A perch\u2019s lateral line can detect prey movement in complete darkness.',
              'Fish have been on Earth for over 500 million years \u2014 before trees existed.'
            ],
            crayfish: [
              'Crayfish can regenerate lost claws over several molts.',
              'Their tail flip escape is one of the fastest movements in the animal kingdom.',
              'A crayfish has teeth inside its stomach (the gastric mill).',
              'They can walk forward but swim backward.',
              'Crayfish establish dominance hierarchies and remember social status.'
            ],
            sheepEye: [
              'The human eye can distinguish about 10 million different colors.',
              'Sheep have a tapetum lucidum \u2014 their eyes literally glow in the dark.',
              'The cornea is the only body part with no blood supply \u2014 it gets oxygen from air.',
              'Your retina contains 120 million rod cells for night vision.',
              'The eye\u2019s lens is made of transparent crystallin proteins that never turn over.'
            ],
            sheepHeart: [
              'Your heart beats about 100,000 times per day \u2014 3 billion times in a lifetime.',
              'The left ventricle wall is 3x thicker than the right.',
              'The heart creates enough pressure to squirt blood 30 feet.',
              'A sheep\u2019s heart is almost identical in size and structure to a human\u2019s.',
              'The SA node fires 60-100 times per minute with zero input from the brain.'
            ]
          };


          var upd = function (k, v) { setLabToolData(function (p) { return Object.assign({}, p, { dissection: Object.assign({}, p.dissection, (function () {
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-dissection')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-dissection';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
 var o = {}; o[k] = v; return o; })()) }); }); };

          // Canvas Narration: Dissection Lab init
          if (typeof canvasNarrate === 'function') canvasNarrate('dissection', 'init', {
            first: 'Virtual Dissection Lab loaded. Choose a specimen such as frog, earthworm, fetal pig, perch, crayfish, sheep eye, or sheep heart. Peel layers to reveal anatomy, click organs for detail, and use study tools for quizzes and flashcards.',
            repeat: 'Dissection Lab ready.',
            terse: 'Dissection Lab ready.'
          });



          // â•â•â•â•â•â•â•â• SPECIMEN DATABASE â•â•â•â•â•â•â•â•

          var SPECIMENS = {

            frog: {

              name: 'Frog (Rana)', icon: '\uD83D\uDC38',

              desc: 'Classic vertebrate â€” 3-chambered heart, cutaneous respiration, metamorphosis.',

              objectives: [
                'Identify the 3-chambered heart and trace blood flow',
                'Compare cutaneous vs pulmonary respiration',
                'Distinguish mesonephric kidneys from mammalian metanephric',
                'Locate the cloaca and explain shared-opening anatomy'
              ],
              specTerms: [
                { term: 'Cutaneous respiration', def: 'Gas exchange through moist, permeable skin.' },
                { term: 'Buccal pumping', def: 'Throat-based breathing mechanism; frogs push air into lungs by raising the floor of the mouth.' },
                { term: 'Mesonephric kidney', def: 'Intermediate kidney type between fish pronephros and mammalian metanephros.' },
                { term: 'Cloaca', def: 'Shared exit chamber for digestive, urinary, and reproductive systems.' },
                { term: 'Nictitating membrane', def: 'Transparent third eyelid that protects the eye underwater.' }
              ],
              bodyShape: 'frog',

              layers: [

                { id: 'skin', name: 'Skin', icon: '\uD83D\uDFE2', color: '#4ade80', accent: '#16a34a', desc: 'Moist permeable integument with chromatophores.' },

                { id: 'muscle', name: 'Muscle', icon: '\uD83D\uDCAA', color: '#f87171', accent: '#dc2626', desc: 'Skeletal muscles for jumping and swimming.' },

                { id: 'organs', name: 'Organs', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Digestive, respiratory, circulatory, and urogenital organs.' },

                { id: 'skeleton', name: 'Skeleton', icon: '\uD83E\uDDB4', color: '#e2e8f0', accent: '#94a3b8', desc: 'Endoskeleton adapted for jumping.' },

                { id: 'nervous', name: 'Nervous', icon: '\u26A1', color: '#c084fc', accent: '#7c3aed', desc: 'CNS and peripheral nerves.' }

              ],

              organs: {

                skin: [

                  { id: 'dorsal_skin', name: 'Dorsal Skin', x: 0.50, y: 0.35, fn: 'Green-brown pigmented surface with chromatophores. Mucous glands keep skin moist for cutaneous respiration (up to 50% of gas exchange).', clinical: 'Chytrid fungus attacks frog skin keratin, causing global amphibian declines.' },

                  { id: 'ventral_skin', name: 'Ventral Skin', x: 0.50, y: 0.65, fn: 'Lighter, thinner ventral surface. Highly vascularized \u2014 frogs absorb water through skin, not by drinking.', clinical: 'Permeable skin makes frogs sensitive bioindicators of environmental pollution.' },

                  { id: 'tympanum', name: 'Tympanic Membrane', x: 0.62, y: 0.18, fn: 'External eardrum behind eye. Transmits sound to columella and inner ear. Size indicates sex (larger = male).', clinical: 'Used for species and sex identification in field studies.' },

                  { id: 'nictitating', name: 'Nictitating Membrane', x: 0.58, y: 0.15, fn: 'Transparent third eyelid protecting eye underwater. Homologous to human plica semilunaris (vestigial).', clinical: 'Present in many vertebrates \u2014 vestigial in humans as plica semilunaris.' }

                ],

                muscle: [

                  { id: 'pectoralis', name: 'Pectoralis', x: 0.50, y: 0.42, fn: 'Chest muscle adducting forelimb. Assists landing absorption after jumps. Homologous to human pectoralis major.', clinical: 'Comparative anatomy: same muscle, different function \u2014 landing in frogs vs pushing in humans.' },

                  { id: 'rectus_abd', name: 'Rectus Abdominis', x: 0.50, y: 0.55, fn: 'Ventral abdominal muscle from sternum to pelvis. Flexes trunk and compresses cavity for buccal pump breathing.', clinical: 'Frogs use buccal pumping (throat) rather than diaphragmatic breathing like mammals.' },

                  { id: 'gastrocnemius', name: 'Gastrocnemius', x: 0.35, y: 0.78, fn: 'Large calf muscle powering jumps. Can generate 2\u00D7 body weight force. Galvani used frog legs to discover bioelectricity (1780s).', clinical: 'Classic muscle for physiology experiments \u2014 Galvani\'s frog leg experiments founded bioelectricity.' },

                  { id: 'triceps_fem', name: 'Triceps Femoris', x: 0.38, y: 0.68, fn: 'Three-headed thigh muscle (homolog of quadriceps). Primary knee extensor during jumping.', clinical: 'Frogs can jump 20\u00D7 body length due to elastic energy storage in tendons.' },

                  { id: 'sartorius', name: 'Sartorius', x: 0.42, y: 0.65, fn: 'Thin strap on medial thigh. Flexes and rotates hip. Assists drawing legs into swimming position.', clinical: 'Longest muscle in both frogs and humans \u2014 a homologous structure across vertebrates.' },

                  { id: 'deltoid', name: 'Deltoideus', x: 0.38, y: 0.38, fn: 'Shoulder muscle elevating/rotating forelimb. Smaller than hindlimb muscles \u2014 frogs are hindlimb-dominant.' }

                ],

                organs: [

                  { id: 'heart', name: 'Heart (3-chamber)', x: 0.50, y: 0.38, fn: '2 atria + 1 ventricle. Spiral valve in conus arteriosus separates blood with ~90% efficiency despite single ventricle.', clinical: 'Frog hearts beat without neural input (myogenic) and can beat in saline for hours \u2014 used in cardiac physiology research.' },

                  { id: 'lungs', name: 'Lungs', x: 0.45, y: 0.40, fn: 'Simple thin-walled sacs (no alveoli). Supplemented by cutaneous respiration. Inflated by buccal pumping \u2014 not diaphragm.', clinical: 'The Bornean flat-headed frog is completely lungless \u2014 breathes entirely through skin.' },

                  { id: 'liver', name: 'Liver (3 lobes)', x: 0.50, y: 0.45, fn: 'Large three-lobed organ. Produces bile, detoxifies blood, stores glycogen. Largest internal organ.', clinical: 'Liver color/size indicates environmental contamination in ecotoxicology studies.' },

                  { id: 'gallbladder', name: 'Gallbladder', x: 0.52, y: 0.47, fn: 'Small green sac between liver lobes. Stores/concentrates bile. Bright green color \u2014 key dissection landmark.', clinical: 'Bright green color makes it one of the easiest organs to identify in dissection.' },

                  { id: 'stomach', name: 'Stomach', x: 0.48, y: 0.50, fn: 'J-shaped muscular organ. Frogs swallow prey whole and use eye retraction to push food down.', clinical: 'Frogs push food into stomach by retracting eyes into mouth roof \u2014 unique swallowing mechanism.' },

                  { id: 'sm_intestine', name: 'Small Intestine', x: 0.50, y: 0.58, fn: 'Coiled tube (duodenum + ileum). Primary nutrient absorption site. Shorter than in herbivorous tadpoles.', clinical: 'Tadpoles (herbivores) have much longer intestines than adult frogs (carnivores) \u2014 diet drives gut length.' },

                  { id: 'lg_intestine', name: 'Large Intestine', x: 0.50, y: 0.65, fn: 'Short wide tube to cloaca. Absorbs water. Opens into cloaca (shared digestive/urinary/reproductive exit).', clinical: 'The cloaca \u2014 shared exit for 3 systems \u2014 is the ancestral vertebrate condition; separate openings evolved later.' },

                  { id: 'spleen', name: 'Spleen', x: 0.46, y: 0.53, fn: 'Small reddish organ near stomach. Filters blood, removes old RBCs, immune function.', clinical: 'Spleen plus antimicrobial skin peptides form a dual immune defense system.' },

                  { id: 'kidneys', name: 'Kidneys', x: 0.50, y: 0.70, fn: 'Elongated, dorsal organs. Mesonephric kidneys \u2014 intermediate between fish and mammal kidney types. Drains to cloaca.', clinical: 'Frog kidneys (mesonephric) are ancestral \u2014 mammals evolved more advanced metanephric kidneys.' },

                  { id: 'fat_bodies', name: 'Fat Bodies', x: 0.48, y: 0.35, fn: 'Yellow finger-like structures on kidneys/gonads. Energy reserves for hibernation and reproduction.', clinical: 'Fat body size indicates nutritional status \u2014 shrunken = environmental stress.' },

                  { id: 'pancreas', name: 'Pancreas', x: 0.53, y: 0.52, fn: 'Thin pale organ between stomach and duodenum. Produces digestive enzymes and insulin/glucagon.', clinical: 'Frog pancreatic islets used in early insulin research.' },

                  { id: 'cloaca', name: 'Cloaca', x: 0.50, y: 0.75, fn: 'Common chamber for digestive, urinary, and reproductive output. Present in amphibians, reptiles, birds.', clinical: 'Represents ancestral vertebrate design \u2014 separate openings evolved independently in mammals.' }

                ],

                skeleton: [

                  { id: 'skull', name: 'Skull', x: 0.50, y: 0.15, fn: 'Broad flat skull with large orbits. Frontoparietal bone fused (unique to frogs). Maxillary + vomerine teeth.', clinical: 'Frogs have teeth on upper jaw only \u2014 toads have no teeth at all.' },

                  { id: 'vertebral_col', name: 'Vertebral Column', x: 0.50, y: 0.40, fn: 'Only 9 presacral vertebrae (mammals have 24+). Short rigid spine for jumping.', clinical: 'Fewest vertebrae of any tetrapod \u2014 extreme spinal reduction for jumping.' },

                  { id: 'urostyle', name: 'Urostyle', x: 0.50, y: 0.55, fn: 'Fused caudal vertebrae forming rod-like tailbone. Absorbs landing shock. Unique to frogs/toads.', clinical: 'The urostyle is found only in anurans \u2014 a defining skeletal feature of frogs and toads.' },

                  { id: 'pelvic_girdle', name: 'Pelvic Girdle', x: 0.50, y: 0.60, fn: 'Elongated ilium creates lever for powerful jumps. Highly modified compared to other vertebrates.', clinical: 'Elongated pelvic girdle is the key anatomical adaptation enabling the frog jump.' },

                  { id: 'pectoral_gird', name: 'Pectoral Girdle', x: 0.50, y: 0.32, fn: 'Supports forelimbs. Acts as shock absorber during landing. Clavicle, coracoid, scapula, suprascapula.', clinical: 'The pectoral girdle absorbs impact forces that would fracture bones in most other animals.' },

                  { id: 'femur', name: 'Femur', x: 0.40, y: 0.65, fn: 'Long thigh bone. Proportionally longer than most vertebrates for jumping leverage.', clinical: 'Frog femur is proportionally longer than human femur relative to body size.' },

                  { id: 'tibiofibula', name: 'Tibio-fibula', x: 0.38, y: 0.75, fn: 'Fused tibia + fibula (single bone). Reduces weight while maintaining strength. 5 digits with webbing.', clinical: 'Bone fusion reduces weight \u2014 an adaptation for efficient jumping.' },

                  { id: 'radioulna', name: 'Radio-ulna', x: 0.30, y: 0.42, fn: 'Fused radius + ulna. 4 digits on forelimb (digit I lost). Simplified limb for landing.', clinical: 'Loss of digit I and bone fusion are weight reduction adaptations.' },

                  { id: 'astragalus', name: 'Elongated Ankle Bones', x: 0.36, y: 0.82, fn: 'Astragalus and calcaneus elongated to add extra leg segment \u2014 increases jump distance. Unique to frogs.', clinical: 'Elongated ankles function as an extra leg segment \u2014 key innovation for saltatory locomotion.' }

                ],

                nervous: [

                  { id: 'brain', name: 'Brain', x: 0.50, y: 0.12, fn: 'Small brain with prominent optic lobes (largest region). Olfactory lobes, cerebrum, cerebellum (small), medulla.', clinical: 'Vision dominates \u2014 classic Lettvin 1959 study: "What the Frog\'s Eye Tells the Frog\'s Brain."' },

                  { id: 'spinal_cord', name: 'Spinal Cord', x: 0.50, y: 0.40, fn: '10 spinal nerve pairs. Ends with filum terminale. Classic spinal frog preparation demonstrates reflexes.', clinical: 'A "spinal frog" (brain destroyed) still shows coordinated reflex responses \u2014 foundational neuroscience.' },

                  { id: 'sciatic_n', name: 'Sciatic Nerve', x: 0.42, y: 0.68, fn: 'Largest nerve. Runs along posterior thigh. Branches from sacral plexus (spinal nerves 8-9).', clinical: 'Frog sciatic nerve was the model system for early electrophysiology experiments.' },

                  { id: 'brachial_n', name: 'Brachial Nerves', x: 0.38, y: 0.35, fn: 'Spinal nerves 2-3 forming brachial plexus for forelimb. Smaller than sciatic due to smaller forelimb.', clinical: 'Smaller brachial vs larger sciatic reflects hindlimb dominance in frogs.' },

                  { id: 'cranial_n', name: 'Cranial Nerves', x: 0.55, y: 0.14, fn: '10 pairs (mammals have 12). Key: optic (II, large), trigeminal (V), vagus (X, viscera).', clinical: 'Frogs have 10 cranial nerve pairs vs 12 in mammals \u2014 lacking spinal accessory (XI) and hypoglossal (XII).' },

                  { id: 'optic_lobe', name: 'Optic Lobes (Tectum)', x: 0.52, y: 0.10, fn: 'Largest brain region processing visual "bug detector" neurons \u2014 respond to small moving dark objects.', clinical: 'Optic tectum "bug detectors" inspired early computer vision and AI motion detection algorithms.' }

                ]

              }

            },



            earthworm: {

              name: 'Earthworm (Lumbricus)', icon: '\uD83E\uDEB1',

              desc: 'Annelid \u2014 segmented body, closed circulation, 5 aortic arches, ventral nerve cord.',

              objectives: [
                'Trace the closed circulatory system through aortic arches',
                'Explain peristaltic locomotion via antagonistic muscles',
                'Identify nephridia and compare to vertebrate kidneys',
                'Describe the role of the clitellum in reproduction'
              ],
              specTerms: [
                { term: 'Peristalsis', def: 'Wave-like contraction of circular and longitudinal muscles for locomotion.' },
                { term: 'Nephridium', def: 'Excretory tubule in each segment; filters coelomic fluid similar to a kidney nephron.' },
                { term: 'Aortic arch', def: 'One of five paired muscular vessels that pump blood; analogous to a heart.' },
                { term: 'Clitellum', def: 'Glandular band that secretes a cocoon for egg deposition.' },
                { term: 'Setae', def: 'Chitinous bristles providing traction during locomotion.' }
              ],
              bodyShape: 'worm',

              layers: [

                { id: 'skin', name: 'Integument', icon: '\uD83D\uDFE4', color: '#a78bfa', accent: '#7c3aed', desc: 'Moist cuticle with setae for locomotion.' },

                { id: 'muscle', name: 'Body Wall', icon: '\uD83D\uDCAA', color: '#f87171', accent: '#dc2626', desc: 'Circular and longitudinal muscles for peristalsis.' },

                { id: 'organs', name: 'Internal Organs', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Digestive tube, aortic arches, nephridia.' },

                { id: 'nervous', name: 'Nervous System', icon: '\u26A1', color: '#c084fc', accent: '#7c3aed', desc: 'Ventral nerve cord with cerebral ganglia.' }

              ],

              organs: {

                skin: [

                  { id: 'cuticle', name: 'Cuticle', x: 0.50, y: 0.30, fn: 'Transparent outer covering. Keeps skin moist for gas exchange \u2014 earthworms breathe through skin.', clinical: 'Earthworms die if skin dries out \u2014 cutaneous respiration requires moisture.' },

                  { id: 'setae', name: 'Setae', x: 0.35, y: 0.55, fn: 'Tiny chitinous bristles (4 pairs/segment). Grip soil during peristaltic locomotion.', clinical: 'Setae are homologous to marine polychaete parapodia.' },

                  { id: 'clitellum', name: 'Clitellum', x: 0.50, y: 0.25, fn: 'Glandular band (segments 32-37). Secretes cocoon for eggs. Indicates sexual maturity.', clinical: 'Clitellum position varies by species \u2014 used for identification.' },

                  { id: 'prostomium', name: 'Prostomium', x: 0.50, y: 0.08, fn: 'Fleshy lip over mouth. Sensory: detects light, chemicals, vibrations. Not a true segment.', clinical: '"Worm grunting" exploits vibration sensitivity to harvest bait worms.' }

                ],

                muscle: [

                  { id: 'circular_m', name: 'Circular Muscles', x: 0.55, y: 0.40, fn: 'Outer layer running around each segment. Contraction = longer/thinner (elongation phase).', clinical: 'Same peristaltic mechanism humans use for intestinal movement.' },

                  { id: 'longitudinal_m', name: 'Longitudinal Muscles', x: 0.45, y: 0.50, fn: 'Inner layer along body length. Contraction = shorter/fatter (anchoring phase). Antagonistic to circular.', clinical: 'Hydrostatic skeleton (fluid-filled coelom) transmits force between the two layers.' },

                  { id: 'septa', name: 'Septa', x: 0.50, y: 0.45, fn: 'Muscular partitions between segments. Each segment = independent hydraulic unit.', clinical: 'Segmentation allows independent control \u2014 damage to one segment doesn\'t disable others.' }

                ],

                organs: [

                  { id: 'pharynx', name: 'Pharynx', x: 0.50, y: 0.12, fn: 'Muscular pump (segments 1-5). Sucks in soil and organic matter.', clinical: 'Earthworms eat their own weight in soil daily, aerating tons of soil per acre.' },

                  { id: 'crop', name: 'Crop', x: 0.50, y: 0.28, fn: 'Thin-walled storage chamber (segments 15-16). Temporary food storage.', clinical: 'Similar function to a bird\'s crop \u2014 convergent evolution of food storage.' },

                  { id: 'gizzard', name: 'Gizzard', x: 0.50, y: 0.33, fn: 'Thick muscular grinder (segments 17-18). Uses sand grains to crush food. No teeth.', clinical: 'Like a bird\'s gizzard \u2014 independent evolution of grit-grinding organs.' },

                  { id: 'intestine', name: 'Intestine', x: 0.50, y: 0.55, fn: 'Straight tube with typhlosole (dorsal fold increasing surface area). Digestion and absorption.', clinical: 'Typhlosole is a simple version of intestinal villi \u2014 same principle, different solution.' },

                  { id: 'aortic_arches', name: 'Aortic Arches (5 Hearts)', x: 0.48, y: 0.22, fn: '5 pairs of contractile vessels (segments 7-11). Pump blood in closed circulatory system.', clinical: 'Often called "5 hearts" \u2014 actually muscular blood vessels. Among first studied for closed circulation.' },

                  { id: 'nephridia', name: 'Nephridia', x: 0.55, y: 0.48, fn: 'Paired excretory organs per segment. Filter coelomic fluid. Equivalent of kidneys.', clinical: 'Segmentally repeated kidneys \u2014 unique annelid design with one pair per segment.' },

                  { id: 'seminal_v', name: 'Seminal Vesicles', x: 0.45, y: 0.20, fn: 'White organs (segments 9-12). Store sperm. Earthworms are hermaphrodites but cross-fertilize.', clinical: 'Despite being hermaphrodites, self-fertilization is rare \u2014 they mate with partners.' }

                ],

                nervous: [

                  { id: 'cerebral_g', name: 'Cerebral Ganglia', x: 0.50, y: 0.08, fn: 'Paired ganglia above pharynx (segment 3). Process sensory input. "Brain."', clinical: 'Very simple \u2014 a headless earthworm can still burrow, eat, and mate.' },

                  { id: 'ventral_cord', name: 'Ventral Nerve Cord', x: 0.50, y: 0.50, fn: 'Runs entire ventral length. Giant fibers enable rapid escape contraction (20-45 m/s).', clinical: 'Giant axons transmit signals fast \u2014 enabling rapid withdrawal when disturbed.' },

                  { id: 'segmental_g', name: 'Segmental Ganglia', x: 0.48, y: 0.40, fn: 'Paired ganglia per segment. Control local reflexes independently.', clinical: 'Each ganglion controls its segment \u2014 why cut segments still move.' }

                ]

              }

            },

            pig: {

              name: 'Fetal Pig (Sus scrofa)', icon: '\uD83D\uDC37',

              desc: 'Mammal \u2014 4-chambered heart, diaphragm, organ systems nearly identical to human.',

              bodyShape: 'pig',
              objectives: ['Compare the 4-chambered pig heart to a human heart','Identify the diaphragm and explain negative-pressure breathing','Trace the fetal circulatory pathway through the umbilical cord','Locate the spiral colon and compare to human large intestine'],
              specTerms: [
                { term: 'Diaphragm', def: 'Dome-shaped respiratory muscle separating thorax from abdomen; mammalian innovation.' },
                { term: 'Umbilical vein', def: 'Carries oxygenated blood from placenta to fetus through the umbilical cord.' },
                { term: 'Spiral colon', def: 'Uniquely porcine coiled large intestine resembling a watch spring.' },
                { term: 'Urachus', def: 'Fetal canal connecting the bladder to the umbilicus; becomes the median umbilical ligament.' },
                { term: 'Xenotransplantation', def: 'Transplanting organs between species; pig organs are closest to human in size and function.' }
              ],

              layers: [

                { id: 'skin', name: 'Skin', icon: '\uD83E\uDDB4', color: '#fda4af', accent: '#e11d48', desc: 'Thin skin with hair follicles and umbilical cord.' },

                { id: 'muscle', name: 'Musculature', icon: '\uD83D\uDCAA', color: '#f87171', accent: '#dc2626', desc: 'Mammalian muscles nearly identical to human.' },

                { id: 'organs', name: 'Visceral Organs', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Complete mammalian organs \u2014 closest lab animal to human.' },

                { id: 'skeleton', name: 'Skeleton', icon: '\uD83E\uDDB4', color: '#e2e8f0', accent: '#94a3b8', desc: 'Largely cartilaginous fetal skeleton.' },

                { id: 'nervous', name: 'Nervous', icon: '\u26A1', color: '#c084fc', accent: '#7c3aed', desc: 'Complex mammalian CNS with cerebral cortex.' }

              ],

              organs: {

                skin: [

                  { id: 'epidermis_p', name: 'Epidermis', x: 0.50, y: 0.35, fn: 'Stratified squamous epithelium. Pig skin is closest animal model to human skin.', clinical: 'Pig skin used in burn treatment research and skin graft studies.' },

                  { id: 'umbilical', name: 'Umbilical Cord', x: 0.50, y: 0.55, fn: '2 umbilical arteries + 1 umbilical vein in Wharton\'s jelly. Same structure as human.', clinical: 'Single umbilical artery may indicate congenital abnormalities in both pigs and humans.' },

                  { id: 'mammary', name: 'Mammary Papillae', x: 0.42, y: 0.60, fn: '6-7 pairs along ventral surface (vs 1 pair in humans). Along embryonic "milk line."', clinical: 'Supernumerary nipples occur in 1-5% of humans along the vestigial milk line.' }

                ],

                muscle: [

                  { id: 'diaphragm_p', name: 'Diaphragm', x: 0.50, y: 0.42, fn: 'Dome separating thorax/abdomen. Primary respiratory muscle. Phrenic nerve (C3-C5). Identical to human.', clinical: 'Diaphragm is a key mammalian innovation \u2014 enables negative-pressure breathing.' },

                  { id: 'masseter_p', name: 'Masseter', x: 0.55, y: 0.12, fn: 'Powerful jaw muscle. Larger than human \u2014 pigs process tough plant material.', clinical: 'Homologous to human masseter \u2014 strongest muscle by weight in both species.' },

                  { id: 'ext_oblique_p', name: 'External Oblique', x: 0.55, y: 0.45, fn: 'Largest abdominal wall muscle. Same function as human external oblique.', clinical: 'Identical innervation pattern to humans \u2014 used in surgical training.' }

                ],

                organs: [

                  { id: 'heart_p', name: 'Heart (4-chamber)', x: 0.50, y: 0.32, fn: '4 chambers identical to human. Complete separation of oxygenated/deoxygenated blood. Coronary arteries present.', clinical: 'Pig heart valves replace human valves in cardiac surgery. Pig-to-human heart xenotransplantation research ongoing.' },

                  { id: 'lungs_p', name: 'Lungs', x: 0.45, y: 0.34, fn: 'Lobed with alveolar structure identical to human. Right: 4 lobes. Left: 2-3 lobes. Pleural membranes.', clinical: 'Pig lungs used for surgical technique practice. Lobation differs slightly from human.' },

                  { id: 'liver_p', name: 'Liver', x: 0.52, y: 0.40, fn: '5 lobes (more lobed than human). Bile production, detoxification, protein synthesis, glycogen storage.', clinical: 'Pig liver studied for xenotransplantation. Functionally identical to human liver.' },

                  { id: 'stomach_p', name: 'Stomach', x: 0.48, y: 0.45, fn: 'Monogastric (simple stomach like human). Cardiac, fundic, pyloric regions. Produces HCl and pepsin.', clinical: 'Unlike ruminants (cows), pigs have simple stomachs like humans \u2014 ideal gastric research model.' },

                  { id: 'sm_int_p', name: 'Small Intestine', x: 0.50, y: 0.55, fn: 'Long (~15m adult). Duodenum, jejunum, ileum. Villi for nutrient absorption.', clinical: 'Proportionally longer than human \u2014 used for surgical anastomosis training.' },

                  { id: 'lg_int_p', name: 'Spiral Colon', x: 0.50, y: 0.62, fn: 'Distinctive spiral colon (coiled). Cecum present. Absorbs water.', clinical: 'Spiral colon is uniquely porcine \u2014 coiled like a watch spring.' },

                  { id: 'kidneys_p', name: 'Kidneys', x: 0.55, y: 0.48, fn: 'Bean-shaped, retroperitoneal. Multipyramidal like human. Filter blood, regulate electrolytes.', clinical: 'Leading xenotransplantation candidates \u2014 closest to human in structure/function.' },

                  { id: 'thymus_p', name: 'Thymus', x: 0.50, y: 0.25, fn: 'Enormous in fetus (much larger than adult). T-cell maturation. Extends from mediastinum into neck.', clinical: 'Fetal thymus demonstrates critical early immune development role.' },

                  { id: 'pancreas_p', name: 'Pancreas', x: 0.52, y: 0.50, fn: 'Exocrine enzymes + endocrine insulin/glucagon. Nearly identical to human.', clinical: 'Porcine insulin treated human diabetes for decades before synthetic insulin.' },

                  { id: 'bladder_p', name: 'Urinary Bladder', x: 0.50, y: 0.68, fn: 'Large distensible organ. Allantoic bladder with urachus in fetus.', clinical: 'Patent urachus is a congenital anomaly in both pigs and humans.' }

                ],

                skeleton: [

                  { id: 'skull_p', name: 'Skull', x: 0.25, y: 0.22, fn: 'Elongated snout. Largely cartilaginous in fetus. Internal anatomy similar to human.', clinical: 'Elongated pig skull vs rounded human skull, but cranial contents are similar.' },

                  { id: 'vert_col_p', name: 'Vertebral Column', x: 0.50, y: 0.38, fn: '7C, 14-15T, 6-7L, 4S, 20-23 caudal. More vertebrae than human. 7 cervical constant across mammals.', clinical: 'Cervical count (7) is constant across nearly all mammals \u2014 giraffe to mouse.' },

                  { id: 'ribs_p', name: 'Ribs', x: 0.55, y: 0.35, fn: '14-15 pairs (vs 12 human). Cartilaginous in fetus. Protect thoracic organs.', clinical: '"Spare ribs" in cooking come from this ventral rib region.' },

                  { id: 'pelvis_p', name: 'Pelvis', x: 0.70, y: 0.42, fn: 'Ilium, ischium, pubis â€” largely cartilaginous in fetus. Same tripartite structure as human pelvis but horizontally oriented for quadrupedal stance.', clinical: 'Pig pelvis is oriented horizontally vs vertically in bipedal humans â€” key comparative anatomy difference.' },

                  { id: 'scapula_p', name: 'Scapula', x: 0.30, y: 0.35, fn: 'Triangular shoulder blade with prominent spine and acromion. Cartilaginous in fetus. Attachment for supraspinatus and infraspinatus muscles.', clinical: 'Pig scapula is more vertically oriented than human â€” adaptation for quadrupedal weight bearing.' },

                  { id: 'humerus_p', name: 'Forelimb Bones', x: 0.35, y: 0.40, fn: 'Humerus (upper), radius and ulna (lower). Articulate with shoulder and carpals. Ulna has prominent olecranon process for triceps attachment.', clinical: 'Pig limb proportions differ from human but bone homology is exact â€” used in orthopedic research.' },

                  { id: 'femur_p', name: 'Hindlimb Bones', x: 0.68, y: 0.42, fn: 'Femur (thigh), tibia and fibula (leg). Terminates in cloven hoof (digits III and IV). Other digits are vestigial dewclaws.', clinical: 'Pig walks on digits III-IV â€” an even-toed ungulate (Artiodactyla). Humans walk on entire foot sole.' },

                  { id: 'sternum_p', name: 'Sternum', x: 0.50, y: 0.40, fn: 'Segmented breastbone with 6-7 sternebrae. Largely cartilaginous in fetus with ossification centers. Ribs articulate laterally.', clinical: 'Segmented pig sternum reveals the fetal ossification process â€” each sternebra starts as cartilage.' }

                ],

                nervous: [

                  { id: 'brain_p', name: 'Brain', x: 0.50, y: 0.08, fn: 'Mammalian brain with sulci/gyri. Large olfactory bulbs. Structure very similar to human.', clinical: 'Pig brains used in neurosurgery training \u2014 closer to human than any common lab animal except primates.' },

                  { id: 'spinal_p', name: 'Spinal Cord', x: 0.50, y: 0.40, fn: 'Full vertebral length in fetus. Cervical/lumbar enlargements. Gray/white matter identical to human.', clinical: 'Spinal cord organization (dorsal sensory, ventral motor) identical to human.' },

                  { id: 'vagus_p', name: 'Vagus Nerve (CN X)', x: 0.48, y: 0.22, fn: 'Longest cranial nerve. Heart, lungs, GI innervation. Runs with carotid/jugular.', clinical: 'Pig vagus nerve studies led to human vagus nerve stimulator implants for epilepsy.' }

                ]

              }

            },



            perch: {

              name: 'Perch (Perca)', icon: '\uD83D\uDC1F',

              desc: 'Bony fish \u2014 gills, swim bladder, lateral line, 2-chambered heart.',

              bodyShape: 'fish',
              objectives: ['Explain countercurrent flow in gill respiration','Trace single-circuit circulation through the 2-chambered heart','Identify the swim bladder and explain buoyancy regulation','Describe the lateral line sensory system'],
              specTerms: [
                { term: 'Operculum', def: 'Bony gill cover that protects gills and actively pumps water for respiration.' },
                { term: 'Countercurrent exchange', def: 'Blood flows opposite to water across gills, maximizing O\u2082 extraction (~80%).' },
                { term: 'Swim bladder', def: 'Gas-filled organ homologous to lungs; provides neutral buoyancy without effort.' },
                { term: 'Lateral line', def: 'Sensory system detecting water pressure changes for navigation and predator detection.' },
                { term: 'Pyloric ceca', def: 'Finger-like pouches at stomach-intestine junction unique to fish; increase absorption area.' }
              ],

              layers: [

                { id: 'skin', name: 'Scales & Skin', icon: '\uD83D\uDFE1', color: '#fde68a', accent: '#d97706', desc: 'Ctenoid scales with mucus coating and lateral line.' },

                { id: 'muscle', name: 'Musculature', icon: '\uD83D\uDCAA', color: '#f87171', accent: '#dc2626', desc: 'W-shaped myomeres for undulatory swimming.' },

                { id: 'organs', name: 'Internal Organs', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Swim bladder, gills, 2-chambered heart, pyloric ceca.' },

                { id: 'skeleton', name: 'Skeleton', icon: '\uD83E\uDDB4', color: '#e2e8f0', accent: '#94a3b8', desc: 'Ossified skeleton with fin rays and operculum.' }

              ],

              organs: {

                skin: [

                  { id: 'scales', name: 'Ctenoid Scales', x: 0.50, y: 0.40, fn: 'Overlapping bony scales with growth rings \u2014 used to determine fish age like tree rings.', clinical: 'Scale annuli counting is the standard method for aging fish in fisheries biology.' },

                  { id: 'lat_line', name: 'Lateral Line', x: 0.50, y: 0.45, fn: 'Sensory system detecting water pressure changes. Enables schooling, predator detection, murky-water navigation.', clinical: 'A "sixth sense" unique to fish/aquatic amphibians \u2014 no equivalent in terrestrial vertebrates.' },

                  { id: 'operculum', name: 'Operculum', x: 0.25, y: 0.35, fn: 'Bony gill cover. Protects gills and pumps water for respiration.', clinical: 'Only bony fish have opercula \u2014 sharks have exposed gill slits.' },

                  { id: 'fins_ext', name: 'Fins (7 types)', x: 0.60, y: 0.25, fn: 'Dorsal (spiny + soft), caudal, anal, pelvic, pectoral. Pectoral/pelvic are homologous to tetrapod limbs.', clinical: 'Fish fins are evolutionary precursors of tetrapod limbs \u2014 pectoral=arms, pelvic=legs.' }

                ],

                muscle: [

                  { id: 'myomeres', name: 'Myomeres', x: 0.50, y: 0.42, fn: 'W-shaped muscle blocks separated by myosepta. Contract in waves for swimming. White (fast) + red (slow) fibers.', clinical: 'Visible as "flakes" in cooked fish \u2014 each flake is one myomere.' },

                  { id: 'epaxial', name: 'Epaxial Muscles', x: 0.50, y: 0.32, fn: 'Dorsal muscle mass above lateral septum. Main swimming power. Bulk of body musculature.', clinical: 'This is the "fillet" \u2014 mostly epaxial muscle, the main edible portion.' }

                ],

                organs: [

                  { id: 'gills', name: 'Gills', x: 0.25, y: 0.38, fn: '4 gill arches with filaments/lamellae. Countercurrent flow extracts 80% of dissolved O\u2082.', clinical: 'Fish gills extract proportionally more oxygen from water than lungs from air.' },

                  { id: 'heart_f', name: 'Heart (2-chamber)', x: 0.22, y: 0.45, fn: '1 atrium + 1 ventricle. Single-circuit circulation: heart\u2192gills\u2192body\u2192heart.', clinical: 'Simplest vertebrate heart. Evolution: 2 (fish) \u2192 3 (amphibian) \u2192 4 (mammal/bird).' },

                  { id: 'swim_bladder', name: 'Swim Bladder', x: 0.50, y: 0.35, fn: 'Gas-filled sac for buoyancy. Closed type \u2014 gas secreted/absorbed via rete mirabile. Neutral buoyancy without effort.', clinical: 'Homologous to the tetrapod lung \u2014 both evolved from pharyngeal outpocketing in ancestral fish.' },

                  { id: 'liver_f', name: 'Liver', x: 0.35, y: 0.42, fn: 'Large lobed organ. Bile production, glycogen/lipid storage.', clinical: 'Fish liver oil is a concentrated energy reserve \u2014 cod liver oil rich in vitamins A and D.' },

                  { id: 'stomach_f', name: 'Stomach', x: 0.40, y: 0.48, fn: 'J-shaped. HCl + pepsin. Expandable for large prey.', clinical: 'Not all fish have stomachs \u2014 carp and minnows lack them entirely.' },

                  { id: 'pyloric_ceca', name: 'Pyloric Ceca', x: 0.42, y: 0.52, fn: 'Finger-like pouches at stomach-intestine junction (3-5 in perch). Increase absorption area.', clinical: 'Unique to fish \u2014 no mammalian homolog. Number used in species identification.' },

                  { id: 'kidneys_f', name: 'Kidneys', x: 0.50, y: 0.30, fn: 'Dark elongated organs along dorsal wall. Head kidney (immune) + trunk kidney (excretion).', clinical: 'Freshwater fish excrete dilute urine \u2014 constantly fighting water influx through gills.' },

                  { id: 'gonads_f', name: 'Gonads', x: 0.50, y: 0.50, fn: 'Paired dorsal organs. External fertilization. Ovaries can be 20-30% of body weight when full.', clinical: 'Enormous reproductive investment \u2014 some fish produce millions of eggs per spawning.' }

                ],

                skeleton: [

                  { id: 'skull_f', name: 'Skull', x: 0.18, y: 0.35, fn: 'Complex with 60+ separate bones \u2014 more than any other vertebrate class.', clinical: 'Fish skulls have the most individual bones of any vertebrate group.' },

                  { id: 'vert_col_f', name: 'Vertebral Column', x: 0.50, y: 0.38, fn: 'Neural arches (spinal cord) + hemal arches (caudal vessels). Trunk + caudal regions only.', clinical: 'No distinct cervical/thoracic/lumbar regions \u2014 the "neck" is a tetrapod innovation.' },

                  { id: 'fin_rays', name: 'Fin Rays', x: 0.55, y: 0.22, fn: 'Spiny (hard, sharp, defense) and soft (segmented, flexible) rays support fin membranes.', clinical: 'Perch spiny rays are sharp enough to puncture skin \u2014 defensive adaptation.' }

                ]

              }

            },

            crayfish: {

              name: 'Crayfish (Cambarus)', icon: '\uD83E\uDD9E',

              desc: 'Crustacean \u2014 exoskeleton, compound eyes, gills, open circulatory system, gastric mill.',

              bodyShape: 'crayfish',
              objectives: ['Compare open circulatory system to closed circulation in vertebrates','Identify the gastric mill and explain post-ingestion grinding','Explain ecdysis (molting) and the role of gastroliths','Describe the compound eye structure and motion detection'],
              specTerms: [
                { term: 'Hemolymph', def: 'Open circulatory fluid combining blood and interstitial fluid; flows through sinuses, not vessels.' },
                { term: 'Ecdysis', def: 'Periodic molting of the exoskeleton to allow growth; animal is vulnerable during hardening.' },
                { term: 'Gastrolith', def: 'Calcium carbonate deposit in the stomach; dissolved during molting to harden new exoskeleton.' },
                { term: 'Ommatidium', def: 'Individual visual unit in compound eyes; ~3,000 per eye, excellent at motion detection.' },
                { term: 'Statocyst', def: 'Balance organ at the base of the antennules containing a sand grain that shifts with gravity.' }
              ],

              layers: [

                { id: 'skin', name: 'Exoskeleton', icon: '\uD83D\uDEE1\uFE0F', color: '#ef4444', accent: '#b91c1c', desc: 'Chitinous shell hardened with calcium carbonate.' },

                { id: 'muscle', name: 'Musculature', icon: '\uD83D\uDCAA', color: '#f87171', accent: '#dc2626', desc: 'Muscles attached inside exoskeleton.' },

                { id: 'organs', name: 'Internal Organs', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Open circulatory system, gastric mill, green glands.' },

                { id: 'nervous', name: 'Nervous System', icon: '\u26A1', color: '#c084fc', accent: '#7c3aed', desc: 'Ventral nerve cord, compound eyes, antennae.' }

              ],

              organs: {

                skin: [

                  { id: 'carapace', name: 'Carapace', x: 0.40, y: 0.32, fn: 'Fused dorsal shell covering cephalothorax. Chitin + CaCO\u2083. Must molt (ecdysis) to grow.', clinical: 'Soft-shell stage after molting makes them vulnerable \u2014 many crustaceans hide while hardening.' },

                  { id: 'telson', name: 'Telson & Uropods', x: 0.80, y: 0.40, fn: 'Tail fan for escape response ("tail flip"). Swims backward at 2 m/s in milliseconds.', clinical: 'Tail flip is one of the fastest animal movements \u2014 mediated by giant nerve fibers.' },

                  { id: 'chelipeds', name: 'Chelipeds (Claws)', x: 0.18, y: 0.42, fn: 'First walking legs modified into pincers. Defense, feeding, territorial displays. Can regenerate if lost.', clinical: 'Lost claws regenerate over several molts \u2014 remarkable crustacean regenerative ability.' },

                  { id: 'compound_eye', name: 'Compound Eyes', x: 0.22, y: 0.30, fn: '~3,000 ommatidia per eye on moveable stalks. Motion detection specialist.', clinical: 'Compound eyes excel at motion detection but have lower resolution than vertebrate eyes.' }

                ],

                muscle: [

                  { id: 'flexor_m', name: 'Abdominal Flexors', x: 0.65, y: 0.42, fn: 'Powerful ventral muscles for escape tail-flip. Among fastest muscle contractions in animal kingdom.', clinical: 'This is the edible "crawfish tail" \u2014 these flexor muscles are the commercial meat.' },

                  { id: 'extensor_m', name: 'Abdominal Extensors', x: 0.65, y: 0.35, fn: 'Dorsal muscles returning abdomen to rest position. Slower than flexors.', clinical: 'Antagonistic flexor/extensor system works same as in vertebrate limbs.' },

                  { id: 'cheliped_m', name: 'Cheliped Muscles', x: 0.22, y: 0.38, fn: 'Closer (adductor) much larger than opener. Crushing force >50N in large specimens.', clinical: 'Claw joint leverages amplify muscle force \u2014 a biological lever system.' }

                ],

                organs: [

                  { id: 'heart_c', name: 'Heart', x: 0.45, y: 0.30, fn: 'Single-chambered dorsal heart. Open circulatory system \u2014 hemolymph flows through sinuses, not vessels.', clinical: 'Low-pressure open circulation limits crustacean maximum body size.' },

                  { id: 'gills_c', name: 'Gills', x: 0.35, y: 0.30, fn: 'Feather-like gills in branchial chamber. Gill bailer creates water current. Attached to leg bases.', clinical: 'Walking legs ventilate gills \u2014 movement and breathing are linked.' },

                  { id: 'gastric_mill', name: 'Gastric Mill', x: 0.32, y: 0.35, fn: '3 calcified teeth (ossicles) inside stomach. Grind food after swallowing. Gastroliths store calcium for molting.', clinical: '"Teeth in the stomach" \u2014 crustaceans chew food after eating it.' },

                  { id: 'green_gland', name: 'Green Glands', x: 0.25, y: 0.32, fn: 'Excretory organs at antenna base. Filter hemolymph, produce urine. Equivalent of kidneys.', clinical: 'Excrete ammonia directly \u2014 possible because aquatic environments flush waste.' },

                  { id: 'hepato', name: 'Hepatopancreas', x: 0.42, y: 0.38, fn: 'Combined liver + pancreas. Digestive enzymes, nutrient absorption, energy storage. Largest internal organ.', clinical: 'Called "tomalley" in lobster cuisine. Accumulates toxins in polluted waters.' },

                  { id: 'gonads_c', name: 'Gonads', x: 0.50, y: 0.35, fn: 'Dorsal to hepatopancreas. Females carry eggs on swimmerets ("berried" females).', clinical: 'Males identified by modified first swimmerets (gonopods) for sperm transfer.' }

                ],

                nervous: [

                  { id: 'brain_c', name: 'Supraesophageal Ganglion', x: 0.25, y: 0.30, fn: 'Fused ganglia above esophagus. Processes eyes, antennae input. Supports learning and social hierarchies.', clinical: 'Simple brain but complex behavior \u2014 crayfish establish dominance hierarchies.' },

                  { id: 'ventral_c', name: 'Ventral Nerve Cord', x: 0.50, y: 0.42, fn: 'Double cord with giant fibers mediating escape. Segmental ganglia control appendages.', clinical: 'Crayfish giant axons were foundational to neuroscience \u2014 among first where action potentials recorded.' },

                  { id: 'antennae_n', name: 'Antennae & Antennules', x: 0.18, y: 0.32, fn: 'Long pair: touch/taste. Short pair: chemoreception + balance (statocyst).', clinical: 'Classic experiment: iron filings in statocyst + magnet = inverted orientation.' }

                ]

              }

            },

            sheepEye: {

              name: 'Sheep Eye', icon: '\uD83D\uDC41\uFE0F',

              desc: 'Organ dissection \u2014 camera-type eye with lens, retina, vitreous humor. Nearly identical to human.',

              bodyShape: 'eye',
              objectives: ['Trace the path of light through the eye from cornea to retina','Explain accommodation and the role of the ciliary body','Compare the tapetum lucidum in sheep to the human eye','Identify the blind spot and explain why it exists'],
              specTerms: [
                { term: 'Accommodation', def: 'Process by which the ciliary muscle changes lens shape to focus on near or far objects.' },
                { term: 'Tapetum lucidum', def: 'Reflective layer behind the retina enhancing night vision; absent in humans.' },
                { term: 'Fovea', def: 'Cone-dense pit in the retina center providing the sharpest central vision.' },
                { term: 'Aqueous humor', def: 'Clear fluid in the anterior chamber; produced by ciliary body, drains via trabecular meshwork.' },
                { term: 'Vitreous humor', def: 'Clear gel filling the posterior 80% of the eye; maintains shape, does not regenerate.' }
              ],

              layers: [

                { id: 'skin', name: 'External', icon: '\uD83D\uDC41\uFE0F', color: '#93c5fd', accent: '#2563eb', desc: 'Outer structures: cornea, sclera, muscles, optic nerve.' },

                { id: 'organs', name: 'Internal', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Internal structures: lens, iris, retina, humors.' }

              ],

              organs: {

                skin: [

                  { id: 'cornea', name: 'Cornea', x: 0.30, y: 0.45, fn: 'Transparent anterior surface. Provides 2/3 of refractive power. Avascular \u2014 nourished by aqueous humor and tears. 5 layers.', clinical: 'LASIK reshapes the cornea with laser. Corneal transplants are the most common transplant surgery worldwide.' },

                  { id: 'sclera', name: 'Sclera', x: 0.70, y: 0.45, fn: 'Tough white outer coat. Dense connective tissue protecting eye contents. Attachment for extraocular muscles. "White of the eye."', clinical: 'Yellow sclera (scleral icterus) = jaundice from liver disease. Blue sclera = osteogenesis imperfecta.' },

                  { id: 'optic_nerve', name: 'Optic Nerve', x: 0.82, y: 0.50, fn: '~1.2 million retinal ganglion cell axons. Exits at optic disc (blind spot). Surrounded by meninges extension.', clinical: 'Optic disc has no photoreceptors = blind spot. Papilledema (optic disc swelling) = increased intracranial pressure.' },

                  { id: 'ext_muscles', name: 'Extraocular Muscles', x: 0.75, y: 0.30, fn: '6 muscles control eye movement: 4 rectus (sup/inf/med/lat) + 2 oblique (sup/inf). Cranial nerves III, IV, VI.', clinical: 'CN III palsy: eye "down and out," ptosis. CN IV: difficulty looking down stairs. CN VI: medial deviation.' },

                  { id: 'conjunctiva', name: 'Conjunctiva', x: 0.35, y: 0.30, fn: 'Thin mucous membrane lining eyelids (palpebral) and covering sclera (bulbar). Produces mucin for tear film.', clinical: 'Conjunctivitis ("pink eye") = inflamed conjunctiva. Subconjunctival hemorrhage looks alarming but is usually benign.' },

                  { id: 'fat_pad', name: 'Orbital Fat', x: 0.70, y: 0.65, fn: 'Cushions and insulates the eye within the orbit. Acts as shock absorber.', clinical: 'Orbital fat atrophy causes sunken eyes (enophthalmos). Graves disease causes fat expansion \u2192 proptosis.' }

                ],

                organs: [

                  { id: 'iris', name: 'Iris & Pupil', x: 0.35, y: 0.45, fn: 'Pigmented muscular diaphragm. Dilator (sympathetic) and sphincter (parasympathetic) muscles control pupil size. Regulates light entry.', clinical: 'Anisocoria (unequal pupils): may indicate CN III palsy, Horner syndrome, or elevated ICP. Iris color from melanin amount.' },

                  { id: 'lens', name: 'Crystalline Lens', x: 0.42, y: 0.45, fn: 'Biconvex, transparent, avascular. Changes shape for focusing (accommodation). Held by zonular fibers attached to ciliary body. Contains crystallin proteins.', clinical: 'Cataracts = lens clouding (most common surgery worldwide). Presbyopia = lens stiffening with age.' },

                  { id: 'ciliary_body', name: 'Ciliary Body', x: 0.38, y: 0.35, fn: 'Ring of muscle + epithelium. Ciliary muscle changes lens shape for focusing. Epithelium produces aqueous humor.', clinical: 'Glaucoma: excess aqueous humor \u2192 increased IOP \u2192 optic nerve damage. Treated with drugs reducing production.' },

                  { id: 'retina', name: 'Retina', x: 0.65, y: 0.45, fn: '10 neural layers. Rods (~120M, light sensitivity) and cones (~6M, color/acuity). Fovea: cone-dense center for sharp vision. Macula: surrounding high-acuity region.', clinical: 'Retinal detachment = surgical emergency. Diabetic retinopathy. Macular degeneration = leading cause of blindness in elderly.' },

                  { id: 'tapetum', name: 'Tapetum Lucidum', x: 0.65, y: 0.55, fn: 'Reflective layer behind retina in sheep (absent in humans). Reflects light back through retina for enhanced night vision. Causes "eyeshine."', clinical: 'Present in many animals (cats, dogs, sheep) but not humans or pigs. This is why animal eyes glow in headlights.' },

                  { id: 'vitreous', name: 'Vitreous Humor', x: 0.55, y: 0.45, fn: 'Clear gel filling posterior 80% of eye. Maintains eye shape. 99% water + collagen + hyaluronic acid. Does not regenerate.', clinical: 'Floaters = collagen clumps in vitreous. Posterior vitreous detachment common with aging.' },

                  { id: 'aqueous', name: 'Aqueous Humor', x: 0.33, y: 0.50, fn: 'Clear fluid in anterior/posterior chambers (in front of lens). Produced by ciliary body, drains via trabecular meshwork at angle.', clinical: 'Blocked drainage \u2192 increased IOP \u2192 glaucoma. Acute angle-closure = emergency.' },

                  { id: 'choroid', name: 'Choroid', x: 0.60, y: 0.35, fn: 'Vascular layer between sclera and retina. Blood supply for outer retina. Heavily pigmented to absorb stray light.', clinical: 'Choroidal melanoma is the most common primary intraocular malignancy in adults.' }

                ]

              }

            },

            sheepHeart: {

              name: 'Sheep Heart', icon: '\u2764\uFE0F',

              desc: 'Organ dissection \u2014 4-chambered mammalian heart. Functionally identical to human heart.',

              bodyShape: 'heart',
              objectives: ['Trace blood flow through all four chambers and valves','Distinguish the coronary arteries and explain myocardial blood supply','Compare wall thickness of left vs right ventricles','Identify the conduction system pathway from SA node to Purkinje fibers'],
              specTerms: [
                { term: 'Chordae tendineae', def: 'Fibrous cords connecting AV valve leaflets to papillary muscles, preventing prolapse.' },
                { term: 'Coronary sinus', def: 'Large venous channel collecting deoxygenated blood from the heart muscle itself.' },
                { term: 'Purkinje fibers', def: 'Specialized conduction cells distributing electrical impulse to ventricular myocardium.' },
                { term: 'Papillary muscle', def: 'Muscular projections anchoring chordae tendineae; contract during systole to keep valves closed.' },
                { term: 'Pericardium', def: 'Double-walled sac enclosing the heart; fibrous outer layer and serous inner layer with lubricating fluid.' }
              ],

              layers: [

                { id: 'skin', name: 'External', icon: '\u2764\uFE0F', color: '#fca5a5', accent: '#dc2626', desc: 'Pericardium, great vessels, coronary arteries, surface anatomy.' },

                { id: 'organs', name: 'Internal', icon: '\uD83E\uDEC1', color: '#fbbf24', accent: '#d97706', desc: 'Chambers, valves, septum, chordae tendineae.' }

              ],

              organs: {

                skin: [

                  { id: 'pericardium', name: 'Pericardium', x: 0.50, y: 0.30, fn: 'Double-walled sac enclosing heart. Fibrous (outer, tough) and serous (inner, 2 layers with fluid). Anchors heart. 15-50mL pericardial fluid reduces friction.', clinical: 'Pericarditis: inflammation causing chest pain. Cardiac tamponade: fluid compresses heart = emergency. Beck triad: hypotension, JVD, muffled sounds.' },

                  { id: 'aorta_h', name: 'Aorta', x: 0.45, y: 0.15, fn: 'Largest artery. Ascending aorta exits LV, curves as aortic arch (brachiocephalic, L carotid, L subclavian), descends as thoracic/abdominal aorta.', clinical: 'Aortic aneurysm: >5.5cm \u2192 surgical repair risk. Aortic dissection: tearing pain, emergency surgery.' },

                  { id: 'pulm_trunk', name: 'Pulmonary Trunk', x: 0.55, y: 0.18, fn: 'Exits RV, bifurcates into R and L pulmonary arteries carrying deoxygenated blood to lungs. Only arteries carrying deoxy blood.', clinical: 'Pulmonary embolism: clot lodges here. Saddle PE across bifurcation is life-threatening.' },

                  { id: 'coronary_aa', name: 'Coronary Arteries', x: 0.40, y: 0.40, fn: 'Left main \u2192 LAD + circumflex. Right coronary artery (RCA). Supply myocardium with oxygenated blood. First aortic branches.', clinical: 'LAD = "widow maker." Coronary artery disease is #1 cause of death. CABG bypasses blockages using vein/artery grafts.' },

                  { id: 'sup_vena_h', name: 'Superior Vena Cava', x: 0.55, y: 0.12, fn: 'Returns deoxygenated blood from upper body to RA. Formed by brachiocephalic veins.', clinical: 'SVC syndrome from lung cancer: facial swelling and dyspnea.' },

                  { id: 'inf_vena_h', name: 'Inferior Vena Cava', x: 0.55, y: 0.70, fn: 'Returns blood from lower body to RA. Largest vein.', clinical: 'IVC filter prevents PE from DVT. Compression in pregnancy causes supine hypotension.' },

                  { id: 'apex', name: 'Apex', x: 0.45, y: 0.75, fn: 'Inferior tip of heart formed by LV. Points left and anterior. PMI (point of maximum impulse) at 5th intercostal space, midclavicular line.', clinical: 'Displaced PMI = ventricular enlargement. PMI palpation is key clinical exam finding.' }

                ],

                organs: [

                  { id: 'ra', name: 'Right Atrium', x: 0.60, y: 0.38, fn: 'Receives deoxygenated blood from SVC (upper body), IVC (lower body), and coronary sinus (heart). Thin-walled. SA node here sets heart rhythm.', clinical: 'SA node = "pacemaker of the heart" \u2014 sets sinus rhythm at 60-100 bpm. Atrial fibrillation: chaotic atrial activity.' },

                  { id: 'rv', name: 'Right Ventricle', x: 0.55, y: 0.55, fn: 'Pumps blood to lungs via pulmonary trunk. Thinner wall than LV (lower pressure: 25/5 mmHg vs 120/80). Crescent shape wraps around LV.', clinical: 'RV failure from pulmonary hypertension or massive PE. RV infarction from RCA occlusion.' },

                  { id: 'la', name: 'Left Atrium', x: 0.45, y: 0.35, fn: 'Receives oxygenated blood from 4 pulmonary veins. Smooth walled. Left atrial appendage is common site of thrombus formation in AFib.', clinical: 'Atrial appendage clots in AFib = stroke risk. Anticoagulation or appendage occlusion devices prevent this.' },

                  { id: 'lv', name: 'Left Ventricle', x: 0.42, y: 0.55, fn: 'Thickest wall (3x RV). Pumps oxygenated blood to entire body via aorta at 120/80 mmHg. Conical shape. Apex formed by LV.', clinical: 'LV hypertrophy from chronic hypertension or aortic stenosis. LV ejection fraction (normal 55-70%) = key cardiac metric.' },

                  { id: 'tricuspid', name: 'Tricuspid Valve', x: 0.58, y: 0.45, fn: 'AV valve with 3 cusps between RA and RV. Chordae tendineae attach to papillary muscles preventing prolapse during systole.', clinical: 'Tricuspid regurgitation: blood leaks backward. Endocarditis in IV drug users often affects tricuspid.' },

                  { id: 'mitral', name: 'Mitral (Bicuspid) Valve', x: 0.43, y: 0.42, fn: 'AV valve with 2 cusps between LA and LV. Most commonly affected valve in rheumatic heart disease. "Bicuspid" = 2 leaflets.', clinical: 'Mitral stenosis from rheumatic fever. Mitral valve prolapse (MVP) in 2-3% of population. "Lub" = AV valves closing.' },

                  { id: 'aortic_v', name: 'Aortic Valve', x: 0.45, y: 0.25, fn: '3 semilunar cusps at LV-aorta junction. Opens during systole for ejection. Coronary ostia just above valve.', clinical: 'Aortic stenosis: calcified valve \u2192 syncope, angina, HF. "Dub" = semilunar valves closing. Bicuspid aortic valve (1-2% prevalence).' },

                  { id: 'pulm_v', name: 'Pulmonary Valve', x: 0.55, y: 0.28, fn: '3 semilunar cusps at RV-pulmonary trunk junction. Prevents backflow into RV during diastole.', clinical: 'Pulmonary stenosis: congenital narrowing (part of Tetralogy of Fallot). Least commonly affected valve.' },

                  { id: 'septum', name: 'Interventricular Septum', x: 0.48, y: 0.52, fn: 'Muscular wall separating L and R ventricles. Thick muscular portion + thin membranous portion. LAD supplies anterior septum.', clinical: 'VSD (ventricular septal defect): most common congenital heart defect. Septal MI from LAD occlusion.' },

                  { id: 'chordae', name: 'Chordae Tendineae', x: 0.50, y: 0.48, fn: '"Heart strings" \u2014 fibrous cords connecting AV valve leaflets to papillary muscles. Prevent valve prolapse during ventricular contraction.', clinical: 'Ruptured chordae = sudden severe valve regurgitation = acute heart failure. Can occur in endocarditis or MI.' },

                  { id: 'conduction', name: 'Conduction System', x: 0.52, y: 0.42, fn: 'SA node (pacemaker, 60-100) \u2192 AV node (delay, 40-60) \u2192 Bundle of His \u2192 R/L bundle branches \u2192 Purkinje fibers. Coordinates cardiac contraction.', clinical: 'Heart blocks: 1st degree (delayed), 2nd degree (dropped beats), 3rd degree (complete dissociation). Pacemaker implantation.' }

                ]

              }

            }

          };





          // â•â•â•â•â•â•â•â• ACTIVE STATE â•â•â•â•â•â•â•â•

          var specimen = d.specimen || 'frog';

          var spec = SPECIMENS[specimen];

          if (!spec) { specimen = 'frog'; spec = SPECIMENS['frog']; }

          var activeLayer = d.activeLayer || (spec.layers[0] || {}).id || 'skin';

          var revealedLayers = d.revealedLayers || {};

          var currentLayerIdx = spec.layers.findIndex(function (l) { return l.id === activeLayer; });

          if (currentLayerIdx < 0) currentLayerIdx = 0;

          var organs = (spec.organs[activeLayer] || []);

          var sel = d.selectedOrgan ? organs.find(function (o) { return o.id === d.selectedOrgan; }) : null;

          var guidedStep = d.guidedStep || 0;

          var guidedMode = d.guidedMode || false;



          // Quiz

          var quizPool = organs.filter(function (o) { return o.fn; });

          var quizQ = d.quizMode && quizPool.length > 0 ? quizPool[(d.quizIdx || 0) % quizPool.length] : null;

          var quizOptions = d._dissQuizOpts || [];

          if (quizQ && d._dissQuizFor !== (specimen + '|' + activeLayer + '|' + d.quizIdx)) {

            var wrong = quizPool.filter(function (o) { return o.id !== quizQ.id; });

            var shuffled = wrong.sort(function () { return Math.random() - 0.5; }).slice(0, 3);

            quizOptions = shuffled.concat([quizQ]).sort(function () { return Math.random() - 0.5; });

            var _qo = quizOptions, _qf = specimen + '|' + activeLayer + '|' + d.quizIdx;

            setTimeout(function () { upd('_dissQuizOpts', _qo); upd('_dissQuizFor', _qf); }, 0);

          }



          function peelCurrentLayer() {

            // Trigger animated incision line before peeling
            sfxDisCut(); // Scalpel cutting sound
            if (window._alloHaptic) window._alloHaptic('break');
            upd('_incisionAnim', { active: true, startTick: Date.now(), layerName: activeLayer });

            // Delay the actual peel so the scalpel cut animation plays first (~500ms)
            setTimeout(function () {
              var newRevealed = Object.assign({}, revealedLayers);
              newRevealed[activeLayer] = true;
              upd('revealedLayers', newRevealed);

              if (currentLayerIdx < spec.layers.length - 1) {
                upd('activeLayer', spec.layers[currentLayerIdx + 1].id);
                upd('selectedOrgan', null);
                if (typeof canvasNarrate === 'function') canvasNarrate('dissection', 'layerPeel', 'Peeled ' + (spec.layers[currentLayerIdx] || {}).name + ' layer. Now viewing ' + spec.layers[currentLayerIdx + 1].name + ' layer with ' + ((spec.organs[spec.layers[currentLayerIdx + 1].id] || []).length) + ' structures.', { debounce: 1000 });
              }

              upd('_incisionAnim', null);
              awardStemXP('dissection', 3, 'Peeled ' + activeLayer + ' layer');
              sfxDisReveal(); // Layer reveal chime
              if (addToast) addToast('\uD83D\uDD2C +3 XP Layer revealed!', 'success');
            }, 500);

          }



          // Canvas renderer

          var canvasRef = function (canvas) {

            if (!canvas) return;

            // Always update zoom/pan on canvas element so animation loop reads latest values

            canvas._zoom = d.canvasZoom || 1;

            canvas._panX = d.canvasPanX || 0;

            canvas._panY = d.canvasPanY || 0;

            // Store all drawing state on canvas so animation loop always has fresh values

            canvas._drawSpec = spec;

            canvas._drawActiveLayer = activeLayer;

            canvas._drawCurrentLayerIdx = currentLayerIdx;

            canvas._drawOrgans = organs;

            canvas._drawRevealedLayers = revealedLayers;

            canvas._drawSel = sel;

            canvas._drawD = d;

            canvas._drawSpecimen = specimen;

            canvas._drawGuidedMode = guidedMode;

            canvas._drawGuidedStep = guidedStep;

            // If animation loop is already running, just update state â€” don't restart

            if (canvas._dissAnim) return;

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var dissTick = 0;

            function drawDissectionFrame() {

              dissTick++;

              // Guard: skip frame if canvas dimensions are not finite or zero

              W = canvas.width; H = canvas.height;

              if (!W || !H || !isFinite(W) || !isFinite(H)) {

                canvas._dissAnim = requestAnimationFrame(drawDissectionFrame);

                return;

              }

              // Read ALL drawing state from canvas element (updated by canvasRef on each React render)

              // This avoids stale closures that caused the specimen to vanish permanently

              spec = canvas._drawSpec || spec;

              activeLayer = canvas._drawActiveLayer || activeLayer;

              currentLayerIdx = canvas._drawCurrentLayerIdx != null ? canvas._drawCurrentLayerIdx : currentLayerIdx;

              organs = canvas._drawOrgans || organs;

              revealedLayers = canvas._drawRevealedLayers || revealedLayers;

              sel = canvas._drawSel;

              d = canvas._drawD || d;

              specimen = canvas._drawSpecimen || specimen;

              guidedMode = canvas._drawGuidedMode;

              guidedStep = canvas._drawGuidedStep || 0;

              try {

              // BULLETPROOF: Reset all canvas state at frame start to prevent leaks

              ctx.setTransform(1, 0, 0, 1, 0, 0);

              ctx.globalAlpha = 1;

              ctx.setLineDash([]);

              ctx.lineDashOffset = 0;

              ctx.shadowBlur = 0;

              ctx.shadowColor = 'transparent';

              ctx.clearRect(0, 0, W, H);

              var cx = W * 0.5, cy = H * 0.45;

              // Read zoom + pan from canvas element (always current, avoids stale closure)

              var zoom = canvas._zoom || 1;

              var panX = canvas._panX || 0;

              var panY = canvas._panY || 0;

              ctx.save();

              ctx.translate(W / 2 + panX, H / 2 + panY);

              ctx.scale(zoom, zoom);

              ctx.translate(-W / 2, -H / 2);

              // Dark dissection tray background

              var isHC = d.highContrast;

              var trayGrad = ctx.createLinearGradient(0, 0, 0, H);

              trayGrad.addColorStop(0, '#1e293b'); trayGrad.addColorStop(1, '#0f172a');

              ctx.fillStyle = trayGrad; ctx.fillRect(0, 0, W, H);

              ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.strokeRect(4, 4, W - 8, H - 8);

              // Faint grid

              ctx.strokeStyle = 'rgba(100,116,139,0.12)'; ctx.lineWidth = 0.5;

              for (var gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }

              for (var gy = 0; gy < H; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

              ctx.lineJoin = 'round'; ctx.lineCap = 'round';

              // Specular highlight for 3D effect

              if (spec.bodyShape !== 'worm') {

                var specGrad = ctx.createRadialGradient(cx - W * 0.05, cy - H * 0.08, 0, cx - W * 0.05, cy - H * 0.08, W * 0.15);

                specGrad.addColorStop(0, 'rgba(255,255,255,0.06)');

                specGrad.addColorStop(1, 'rgba(255,255,255,0)');

                ctx.fillStyle = specGrad;

                ctx.beginPath(); ctx.ellipse(cx - W * 0.05, cy - H * 0.08, W * 0.12, H * 0.08, -0.3, 0, Math.PI * 2);

                ctx.fill();

              } else {

                // Worm gets elongated highlight

                var wSpecGrad = ctx.createRadialGradient(cx - W * 0.01, H * 0.30, 0, cx - W * 0.01, H * 0.30, W * 0.04);

                wSpecGrad.addColorStop(0, 'rgba(255,255,255,0.06)');

                wSpecGrad.addColorStop(1, 'rgba(255,255,255,0)');

                ctx.fillStyle = wSpecGrad;

                ctx.fillRect(cx - W * 0.03, H * 0.08, W * 0.04, H * 0.84);

              }

              // 3D depth shadow under body

              ctx.globalAlpha = 0.08;

              ctx.beginPath();

              if (spec.bodyShape === 'frog') { ctx.ellipse(cx + 3, cy + 5, W * 0.18, H * 0.30, 0, 0, Math.PI * 2); }

              else if (spec.bodyShape === 'pig') { ctx.ellipse(cx + 3, cy + 5, W * 0.30, H * 0.14, 0, 0, Math.PI * 2); }

              else if (spec.bodyShape === 'fish') { ctx.ellipse(cx + 3, cy + 5, W * 0.32, H * 0.10, 0, 0, Math.PI * 2); }

              else if (spec.bodyShape === 'crayfish') { ctx.ellipse(cx + 3, cy + 5, W * 0.32, H * 0.08, 0, 0, Math.PI * 2); }

              else if (spec.bodyShape === 'worm') { ctx.ellipse(cx + 2, H * 0.50 + 5, W * 0.05, H * 0.42, 0, 0, Math.PI * 2); }

              ctx.fillStyle = '#000'; ctx.fill();

              ctx.globalAlpha = 1;

              // Tissue texture overlay (stipple for organic feel)

              if (spec.bodyShape !== 'eye' && spec.bodyShape !== 'heart') {

                ctx.globalAlpha = 0.03;

                for (var stip = 0; stip < 80; stip++) {

                  var sx = cx + (Math.sin(stip * 137.5) * W * 0.25);

                  var sy_t = cy + (Math.cos(stip * 47.3) * H * 0.30);

                  ctx.beginPath(); ctx.arc(sx, sy_t, Math.random() * 2 + 0.5, 0, Math.PI * 2);

                  ctx.fillStyle = stip % 2 === 0 ? '#000' : '#fff'; ctx.fill();

                }

                ctx.globalAlpha = 1;

              }

              // Dissection tools illustration (bottom-right corner)

              ctx.globalAlpha = 0.15;

              // Scalpel

              ctx.beginPath(); ctx.moveTo(W - 60, H - 60); ctx.lineTo(W - 35, H - 35);

              ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();

              ctx.beginPath(); ctx.moveTo(W - 35, H - 35); ctx.lineTo(W - 30, H - 32);

              ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3; ctx.stroke();

              // Forceps

              ctx.beginPath(); ctx.moveTo(W - 80, H - 55); ctx.lineTo(W - 55, H - 40);

              ctx.moveTo(W - 80, H - 48); ctx.lineTo(W - 55, H - 40);

              ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.stroke();

              // Pins

              for (var pi_tool = 0; pi_tool < 3; pi_tool++) {

                ctx.beginPath(); ctx.arc(W - 90 + pi_tool * 8, H - 70, 1.5, 0, Math.PI * 2);

                ctx.fillStyle = '#94a3b8'; ctx.fill();

                ctx.beginPath(); ctx.moveTo(W - 90 + pi_tool * 8, H - 70); ctx.lineTo(W - 90 + pi_tool * 8, H - 62);

                ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.5; ctx.stroke();

              }

              ctx.globalAlpha = 1;



              // Get current layer styling

              var curLayer = spec.layers[currentLayerIdx] || spec.layers[0];

              var layerColor = curLayer.color || '#94a3b8';

              var layerStroke = curLayer.accent || '#94a3b8';

              // cx, cy declared at top of drawDissectionFrame



              // Create body gradient for 3D depth effect

              var bodyGrad = ctx.createRadialGradient(cx - W * 0.05, cy - H * 0.05, 10, cx, cy, W * 0.30);

              bodyGrad.addColorStop(0, layerColor);

              bodyGrad.addColorStop(0.7, layerColor);

              bodyGrad.addColorStop(1, layerStroke);

              // Breathing animation for organic feel

              var breathScale = activeLayer === 'organs' ? (1 + Math.sin(dissTick * 0.025) * 0.012) : (1 + Math.sin(dissTick * 0.02) * 0.005);



              ctx.save();

              ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 12;



              // â”€â”€ Draw specimen body based on bodyShape â”€â”€

              if (spec.bodyShape === 'frog') {

                // â•â• ANATOMICALLY ACCURATE FROG (Rana temporaria) â•â•

                var bS = breathScale;



                // â”€â”€ Hindlimbs (drawn first, behind body) â”€â”€

                [-1, 1].forEach(function (sx) {

                  var hipX = cx + sx * W * 0.13, hipY = cy + H * 0.20;

                  var kneeX = cx + sx * W * 0.26, kneeY = cy + H * 0.18;

                  var ankleX = cx + sx * W * 0.28, ankleY = cy + H * 0.30;

                  var footX = cx + sx * W * 0.22, footY = cy + H * 0.38;

                  // Thigh (femur region â€“ thick)

                  ctx.beginPath();

                  ctx.moveTo(hipX, hipY);

                  ctx.bezierCurveTo(hipX + sx * W * 0.04, hipY - H * 0.02, kneeX - sx * W * 0.02, kneeY - H * 0.04, kneeX, kneeY);

                  ctx.bezierCurveTo(kneeX + sx * W * 0.02, kneeY + H * 0.02, hipX + sx * W * 0.06, hipY + H * 0.06, hipX + sx * W * 0.02, hipY + H * 0.04);

                  ctx.closePath();

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.stroke();

                  // Calf (tibia-fibula â€“ tapers)

                  ctx.beginPath();

                  ctx.moveTo(kneeX, kneeY);

                  ctx.bezierCurveTo(kneeX + sx * W * 0.01, kneeY + H * 0.04, ankleX + sx * W * 0.02, ankleY - H * 0.03, ankleX, ankleY);

                  ctx.bezierCurveTo(ankleX - sx * W * 0.03, ankleY + H * 0.01, kneeX - sx * W * 0.03, kneeY + H * 0.04, kneeX - sx * W * 0.02, kneeY + H * 0.02);

                  ctx.closePath();

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();

                  // Elongated ankle (astragalus/calcaneus â€“ frog adaptation)

                  ctx.beginPath();

                  ctx.moveTo(ankleX, ankleY);

                  ctx.lineTo(footX, footY - H * 0.02);

                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();

                  // Foot with 5 webbed toes

                  var toeAngles = [-0.45, -0.22, 0, 0.22, 0.45];

                  var toeLens = [0.07, 0.09, 0.10, 0.09, 0.06];

                  toeAngles.forEach(function (ang, ti) {

                    var toeEndX = footX + Math.sin(ang + sx * 0.1) * W * toeLens[ti] * sx;

                    var toeEndY = footY + Math.cos(ang) * H * toeLens[ti] * 0.7;

                    ctx.beginPath(); ctx.moveTo(footX, footY - H * 0.02);

                    ctx.lineTo(toeEndX, toeEndY);

                    ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                    // Toe tip bulb

                    ctx.beginPath(); ctx.arc(toeEndX, toeEndY, 1.5, 0, Math.PI * 2);

                    ctx.fillStyle = layerColor; ctx.fill();

                  });

                  // Webbing between toes

                  ctx.globalAlpha = 0.15;

                  ctx.beginPath();

                  ctx.moveTo(footX + Math.sin(toeAngles[0] + sx * 0.1) * W * toeLens[0] * sx, footY + Math.cos(toeAngles[0]) * H * toeLens[0] * 0.7);

                  for (var tw = 1; tw < 5; tw++) {

                    ctx.lineTo(footX + Math.sin(toeAngles[tw] + sx * 0.1) * W * toeLens[tw] * sx, footY + Math.cos(toeAngles[tw]) * H * toeLens[tw] * 0.7);

                  }

                  ctx.lineTo(footX, footY - H * 0.02); ctx.closePath();

                  ctx.fillStyle = layerColor; ctx.fill();

                  ctx.globalAlpha = 1;

                });



                // â”€â”€ Forelimbs (drawn behind body) â”€â”€

                [-1, 1].forEach(function (sx) {

                  var shX = cx + sx * W * 0.15, shY = cy - H * 0.12;

                  var elbX = cx + sx * W * 0.22, elbY = cy - H * 0.06;

                  var wristX = cx + sx * W * 0.24, wristY = cy + H * 0.02;

                  // Upper arm

                  ctx.beginPath();

                  ctx.moveTo(shX, shY);

                  ctx.bezierCurveTo(shX + sx * W * 0.03, shY + H * 0.01, elbX - sx * W * 0.02, elbY - H * 0.02, elbX, elbY);

                  ctx.bezierCurveTo(elbX - sx * W * 0.01, elbY + H * 0.02, shX + sx * W * 0.01, shY + H * 0.04, shX - sx * W * 0.01, shY + H * 0.02);

                  ctx.closePath();

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();

                  // Forearm (radioulna)

                  ctx.beginPath();

                  ctx.moveTo(elbX, elbY);

                  ctx.bezierCurveTo(elbX + sx * W * 0.01, elbY + H * 0.03, wristX, wristY - H * 0.03, wristX, wristY);

                  ctx.bezierCurveTo(wristX - sx * W * 0.02, wristY, elbX - sx * W * 0.02, elbY + H * 0.03, elbX - sx * W * 0.01, elbY + H * 0.01);

                  ctx.closePath();

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                  // 4 digits (digit I lost in frogs)

                  var dAngles = [-0.5, -0.15, 0.15, 0.45];

                  dAngles.forEach(function (da) {

                    var dEndX = wristX + Math.sin(da + sx * 0.2) * W * 0.04 * sx;

                    var dEndY = wristY + Math.cos(da) * H * 0.04;

                    ctx.beginPath(); ctx.moveTo(wristX, wristY);

                    ctx.lineTo(dEndX, dEndY);

                    ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();

                    ctx.beginPath(); ctx.arc(dEndX, dEndY, 1, 0, Math.PI * 2);

                    ctx.fillStyle = layerColor; ctx.fill();

                  });

                });



                // â”€â”€ Main body (Rana dorsal silhouette â€“ BÃ©zier contour) â”€â”€

                ctx.beginPath();

                // Start at anterior (top of body, behind head junction)

                ctx.moveTo(cx, cy - H * 0.20 * bS);

                // Right shoulder curve (wider)

                ctx.bezierCurveTo(cx + W * 0.10, cy - H * 0.20 * bS, cx + W * 0.17 * bS, cy - H * 0.14, cx + W * 0.18 * bS, cy - H * 0.05);

                // Right waist (narrower â€“ amphibian body shape)

                ctx.bezierCurveTo(cx + W * 0.17 * bS, cy + H * 0.05, cx + W * 0.14 * bS, cy + H * 0.10, cx + W * 0.13 * bS, cy + H * 0.12);

                // Right pelvic flare

                ctx.bezierCurveTo(cx + W * 0.15 * bS, cy + H * 0.16, cx + W * 0.16 * bS, cy + H * 0.20, cx + W * 0.14 * bS, cy + H * 0.24 * bS);

                // Posterior (cloaca)

                ctx.bezierCurveTo(cx + W * 0.08, cy + H * 0.26 * bS, cx - W * 0.08, cy + H * 0.26 * bS, cx - W * 0.14 * bS, cy + H * 0.24 * bS);

                // Left pelvic flare

                ctx.bezierCurveTo(cx - W * 0.16 * bS, cy + H * 0.20, cx - W * 0.15 * bS, cy + H * 0.16, cx - W * 0.13 * bS, cy + H * 0.12);

                // Left waist

                ctx.bezierCurveTo(cx - W * 0.14 * bS, cy + H * 0.10, cx - W * 0.17 * bS, cy + H * 0.05, cx - W * 0.18 * bS, cy - H * 0.05);

                // Left shoulder curve

                ctx.bezierCurveTo(cx - W * 0.17 * bS, cy - H * 0.14, cx - W * 0.10, cy - H * 0.20 * bS, cx, cy - H * 0.20 * bS);

                ctx.closePath();

                ctx.fillStyle = bodyGrad; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.shadowBlur = 0;



                // Body highlight (3D volume)

                ctx.beginPath(); ctx.ellipse(cx - W * 0.03, cy - H * 0.06, W * 0.09, H * 0.12, -0.1, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill();



                // â”€â”€ Head (triangular snout, not oval) â”€â”€

                var headCy = cy - H * 0.25;

                var headGrad = ctx.createRadialGradient(cx - W * 0.01, headCy - H * 0.02, 3, cx, headCy, W * 0.13);

                headGrad.addColorStop(0, layerColor); headGrad.addColorStop(1, layerStroke);

                ctx.beginPath();

                // Triangular head: wide behind eyes, narrows to round snout

                ctx.moveTo(cx, headCy - H * 0.07);  // snout tip

                ctx.bezierCurveTo(cx + W * 0.04, headCy - H * 0.07, cx + W * 0.09, headCy - H * 0.04, cx + W * 0.12, headCy);

                ctx.bezierCurveTo(cx + W * 0.13, headCy + H * 0.03, cx + W * 0.10, headCy + H * 0.06, cx + W * 0.05, headCy + H * 0.06);

                ctx.lineTo(cx - W * 0.05, headCy + H * 0.06);

                ctx.bezierCurveTo(cx - W * 0.10, headCy + H * 0.06, cx - W * 0.13, headCy + H * 0.03, cx - W * 0.12, headCy);

                ctx.bezierCurveTo(cx - W * 0.09, headCy - H * 0.04, cx - W * 0.04, headCy - H * 0.07, cx, headCy - H * 0.07);

                ctx.closePath();

                ctx.fillStyle = headGrad; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.stroke();

                // Maxillary ridge (subtle line)

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.10, headCy - H * 0.01);

                ctx.quadraticCurveTo(cx, headCy - H * 0.04, cx + W * 0.10, headCy - H * 0.01);

                ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 0.8; ctx.stroke();

                // Nostrils (pair at snout tip)

                [-1, 1].forEach(function (s) {

                  ctx.beginPath(); ctx.ellipse(cx + s * W * 0.025, headCy - H * 0.06, 2, 1.5, 0, 0, Math.PI * 2);

                  ctx.fillStyle = layerStroke; ctx.fill();

                });



                // â”€â”€ Tympanic membranes (large circular, behind eyes) â”€â”€

                [-1, 1].forEach(function (s) {

                  ctx.beginPath(); ctx.arc(cx + s * W * 0.10, headCy + H * 0.01, W * 0.022, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(139,92,246,0.15)'; ctx.fill();

                  ctx.strokeStyle = 'rgba(139,92,246,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();

                  // Inner detail ring

                  ctx.beginPath(); ctx.arc(cx + s * W * 0.10, headCy + H * 0.01, W * 0.012, 0, Math.PI * 2);

                  ctx.strokeStyle = 'rgba(139,92,246,0.2)'; ctx.lineWidth = 0.4; ctx.stroke();

                });



                // â”€â”€ Eyes (protruding bulbous amphibian eyes) â”€â”€

                [-1, 1].forEach(function (s) {

                  var eyeX = cx + s * W * 0.09, eyeY = headCy - H * 0.04;

                  var eyeR = W * 0.032;

                  // Eye socket shadow

                  ctx.beginPath(); ctx.arc(eyeX, eyeY + 1, eyeR + 2, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();

                  // Eyeball (multicolor iris gradient)

                  var irisGrad = ctx.createRadialGradient(eyeX - 1, eyeY - 1, 0, eyeX, eyeY, eyeR);

                  irisGrad.addColorStop(0, '#d4a017');

                  irisGrad.addColorStop(0.3, '#b8860b');

                  irisGrad.addColorStop(0.6, '#8B6914');

                  irisGrad.addColorStop(0.85, '#5c4a1e');

                  irisGrad.addColorStop(1, '#2d2010');

                  ctx.beginPath(); ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);

                  ctx.fillStyle = irisGrad; ctx.fill();

                  ctx.strokeStyle = '#1a1206'; ctx.lineWidth = 1.2; ctx.stroke();

                  // Horizontal slit pupil (amphibian characteristic)

                  ctx.beginPath();

                  ctx.ellipse(eyeX, eyeY, eyeR * 0.55, eyeR * 0.25, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#0a0a0a'; ctx.fill();

                  // Specular highlight (top-left)

                  ctx.beginPath(); ctx.arc(eyeX - eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.2, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();

                  // Secondary highlight (smaller)

                  ctx.beginPath(); ctx.arc(eyeX + eyeR * 0.2, eyeY + eyeR * 0.15, eyeR * 0.08, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();

                });



                // â”€â”€ Skin layer details â”€â”€

                if (activeLayer === 'skin' && !revealedLayers['skin']) {

                  // Irregular blotch pattern (realistic chromatophore clusters)

                  ctx.globalAlpha = 0.30;

                  var blotchSeeds = [

                    { x: -0.06, y: -0.10, r: 0.035, c: '#14532d' }, { x: 0.08, y: -0.08, r: 0.03, c: '#166534' },

                    { x: -0.03, y: 0.05, r: 0.045, c: '#14532d' }, { x: 0.05, y: 0.02, r: 0.028, c: '#15803d' },

                    { x: -0.10, y: 0.12, r: 0.032, c: '#166534' }, { x: 0.10, y: 0.10, r: 0.038, c: '#14532d' },

                    { x: 0.00, y: 0.15, r: 0.025, c: '#15803d' }, { x: -0.08, y: -0.01, r: 0.022, c: '#166534' },

                    { x: 0.11, y: -0.04, r: 0.020, c: '#14532d' }, { x: -0.04, y: 0.18, r: 0.028, c: '#15803d' },

                    { x: 0.02, y: -0.15, r: 0.018, c: '#166534' }, { x: -0.12, y: 0.05, r: 0.020, c: '#14532d' },

                    { x: 0.07, y: 0.16, r: 0.024, c: '#166534' }, { x: -0.02, y: -0.05, r: 0.030, c: '#15803d' }

                  ];

                  blotchSeeds.forEach(function (b) {

                    var bx = cx + b.x * W, by = cy + b.y * H, br = b.r * W;

                    // Irregular blotch using overlapping ellipses

                    var bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);

                    bg.addColorStop(0, b.c); bg.addColorStop(0.6, b.c); bg.addColorStop(1, 'transparent');

                    ctx.save();

                    ctx.translate(bx, by); ctx.rotate(Math.sin(b.x * 10) * 0.5); ctx.translate(-bx, -by);

                    ctx.beginPath(); ctx.ellipse(bx, by, br, br * 0.7, 0, 0, Math.PI * 2);

                    ctx.fillStyle = bg; ctx.fill();

                    ctx.restore();

                  });

                  ctx.globalAlpha = 1;



                  // Dorsolateral folds (raised ridges running along back)

                  ctx.globalAlpha = 0.18;

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath();

                    ctx.moveTo(cx + s * W * 0.06, cy - H * 0.18);

                    ctx.bezierCurveTo(cx + s * W * 0.07, cy - H * 0.05, cx + s * W * 0.06, cy + H * 0.08, cx + s * W * 0.05, cy + H * 0.20);

                    ctx.strokeStyle = '#15803d'; ctx.lineWidth = 2; ctx.stroke();

                  });

                  ctx.globalAlpha = 1;



                  // Moisture sheen gradient (glistening moist skin)

                  ctx.globalAlpha = 0.06;

                  var sheenGrad = ctx.createLinearGradient(cx - W * 0.15, cy - H * 0.15, cx + W * 0.10, cy + H * 0.10);

                  sheenGrad.addColorStop(0, 'transparent'); sheenGrad.addColorStop(0.4, '#ffffff');

                  sheenGrad.addColorStop(0.6, '#ffffff'); sheenGrad.addColorStop(1, 'transparent');

                  ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.16, H * 0.22, -0.2, 0, Math.PI * 2);

                  ctx.fillStyle = sheenGrad; ctx.fill();

                  ctx.globalAlpha = 1;



                  // Ventral skin indication (lighter belly)

                  ctx.globalAlpha = 0.08;

                  ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.08, W * 0.10, H * 0.12, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#fef9c3'; ctx.fill();

                  ctx.globalAlpha = 1;

                }



                // â”€â”€ Frog layer-specific internal anatomy â”€â”€

                // Muscle layer: animated fiber contraction

                if (activeLayer === 'muscle') {

                  ctx.globalAlpha = 0.25;

                  ctx.strokeStyle = '#991b1b';

                  ctx.lineWidth = 0.6;

                  // Abdominal muscle fibers with contraction wave

                  var contractionWave = Math.sin(dissTick * 0.04);

                  for (var mf = 0; mf < 12; mf++) {

                    var mfy = cy - H * 0.15 + mf * H * 0.035;

                    var mfContract = Math.sin(dissTick * 0.04 + mf * 0.5) * 2;

                    ctx.beginPath();

                    ctx.moveTo(cx - W * 0.10, mfy);

                    ctx.quadraticCurveTo(cx, mfy + mfContract, cx + W * 0.10, mfy);

                    ctx.lineWidth = 0.6 + Math.abs(mfContract) * 0.15;

                    ctx.stroke();

                  }

                  // Muscle tension indicator

                  ctx.globalAlpha = 0.15;

                  var tensionColor = 'rgba(220,38,38,' + (0.1 + Math.abs(contractionWave) * 0.12) + ')';

                  ctx.fillStyle = tensionColor;

                  ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.12, H * 0.20, 0, 0, Math.PI * 2);

                  ctx.fill();

                  // Leg muscle detail

                  [-1, 1].forEach(function (side) {

                    for (var lm = 0; lm < 5; lm++) {

                      ctx.beginPath();

                      ctx.moveTo(cx + side * W * 0.12, cy + H * 0.24 + lm * H * 0.03);

                      ctx.quadraticCurveTo(cx + side * W * 0.18, cy + H * 0.28 + lm * H * 0.02, cx + side * W * 0.20, cy + H * 0.32 + lm * H * 0.01);

                      ctx.stroke();

                    }

                  });

                  ctx.globalAlpha = 1;

                }

                // Organs layer: draw simplified organ shapes inside body

                if (activeLayer === 'organs') {

                  ctx.globalAlpha = 0.55;

                  // Heart (anterior)

                  ctx.beginPath(); ctx.arc(cx, cy - H * 0.08, W * 0.03, 0, Math.PI * 2);

                  ctx.fillStyle = '#dc2626'; ctx.fill();

                  ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 0.8; ctx.stroke();

                  // Aorta line from heart

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.11);

                  ctx.lineTo(cx, cy - H * 0.18);

                  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.stroke();

                  // Lungs (paired)

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.ellipse(cx + s * W * 0.06, cy - H * 0.06, W * 0.03, H * 0.04, 0, 0, Math.PI * 2);

                    ctx.fillStyle = '#fca5a5'; ctx.fill();

                    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.5; ctx.stroke();

                  });

                  // Liver (3 lobes)

                  ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.02, W * 0.10, H * 0.04, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  ctx.strokeStyle = '#78350f'; ctx.lineWidth = 0.6; ctx.stroke();

                  // Gallbladder

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.04, cy + H * 0.03, W * 0.015, H * 0.02, 0.3, 0, Math.PI * 2);

                  ctx.fillStyle = '#22c55e'; ctx.fill(); ctx.strokeStyle = '#15803d'; ctx.lineWidth = 0.5; ctx.stroke();

                  // Stomach

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.03, cy + H * 0.08, W * 0.04, H * 0.025, -0.3, 0, Math.PI * 2);

                  ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 0.5; ctx.stroke();

                  // Small intestine (coiled)

                  ctx.beginPath();

                  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;

                  ctx.moveTo(cx - W * 0.01, cy + H * 0.10);

                  for (var gi = 0; gi < 6; gi++) {

                    ctx.quadraticCurveTo(cx + (gi % 2 ? 1 : -1) * W * 0.06, cy + H * 0.11 + gi * H * 0.015, cx + (gi % 2 ? -1 : 1) * W * 0.02, cy + H * 0.12 + gi * H * 0.015);

                  }

                  ctx.stroke();

                  // Fat bodies (yellow fingers)

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.ellipse(cx + s * W * 0.05, cy - H * 0.10, W * 0.008, H * 0.03, s * 0.3, 0, Math.PI * 2);

                    ctx.fillStyle = '#fbbf24'; ctx.fill();

                  });

                  // Bladder

                  ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.15, W * 0.025, H * 0.018, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(186,230,253,0.4)'; ctx.fill();

                  ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 0.5; ctx.stroke();

                  // Stomach churning animation

                  if (activeLayer === 'organs') {

                    ctx.globalAlpha = 0.12;

                    var churnPhase = Math.sin(dissTick * 0.04);

                    ctx.beginPath();

                    ctx.ellipse(cx - W * 0.02, cy - H * 0.04, W * 0.02 + churnPhase * W * 0.005, H * 0.015 - churnPhase * H * 0.003, 0, 0, Math.PI * 2);

                    ctx.fillStyle = '#fbbf24'; ctx.fill();

                    ctx.globalAlpha = 0.5;

                  }

                  // Spleen (small red organ near stomach)

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.06, cy - H * 0.03, W * 0.012, H * 0.008, 0.3, 0, Math.PI * 2);

                  ctx.fillStyle = '#7f1d1d'; ctx.fill();

                  // Pancreas (thin, yellowish)

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.02, cy - H * 0.04);

                  ctx.quadraticCurveTo(cx + W * 0.05, cy - H * 0.02, cx + W * 0.08, cy - H * 0.01);

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 0.5;

                  // Adrenal glands (on top of kidneys)

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.ellipse(cx + s * W * 0.06, cy + H * 0.07, W * 0.008, H * 0.004, 0, 0, Math.PI * 2);

                    ctx.fillStyle = '#fbbf24'; ctx.fill();

                  });

                  // Peritoneum lining (body cavity membrane)

                  ctx.globalAlpha = 0.04;

                  ctx.beginPath();

                  ctx.ellipse(cx, cy, W * 0.14, H * 0.25, 0, 0, Math.PI * 2);

                  ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]);

                  ctx.globalAlpha = 0.5;

                  ctx.font = '6px Inter, system-ui'; ctx.fillStyle = 'rgba(254,240,138,0.4)';

                  ctx.fillText('Peritoneum', cx + W * 0.12, cy + H * 0.22);

                  // Mesentery (translucent membrane connecting organs)

                  ctx.globalAlpha = 0.06;

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.05, cy - H * 0.08);

                  ctx.quadraticCurveTo(cx + W * 0.08, cy, cx - W * 0.03, cy + H * 0.10);

                  ctx.quadraticCurveTo(cx + W * 0.06, cy + H * 0.05, cx - W * 0.05, cy - H * 0.08);

                  ctx.fillStyle = '#fde68a'; ctx.fill();

                  ctx.globalAlpha = 0.5;

                  // Animated blood flow paths

                  var bloodT = (dissTick * 0.03) % 1;

                  // Arterial flow (red, from heart outward)

                  ctx.setLineDash([4, 8]);

                  ctx.lineDashOffset = -dissTick * 0.5;

                  ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;

                  // Aorta â†’ body

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.11);

                  ctx.quadraticCurveTo(cx + W * 0.03, cy - H * 0.15, cx + W * 0.05, cy - H * 0.18);

                  ctx.stroke();

                  // To legs

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx + s * W * 0.02, cy + H * 0.10);

                    ctx.lineTo(cx + s * W * 0.10, cy + H * 0.30);

                    ctx.stroke();

                  });

                  // Venous return (blue)

                  ctx.strokeStyle = '#3b82f6';

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx + s * W * 0.12, cy + H * 0.32);

                    ctx.quadraticCurveTo(cx + s * W * 0.04, cy + H * 0.15, cx + s * W * 0.01, cy - H * 0.05);

                    ctx.stroke();

                  });

                  ctx.setLineDash([]); ctx.lineDashOffset = 0;

                  ctx.globalAlpha = 1;

                }

                // Skeleton layer: draw bone outlines

                if (activeLayer === 'skeleton') {

                  ctx.globalAlpha = 0.6;

                  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;

                  // Skull

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.25, W * 0.09, H * 0.055, 0, 0, Math.PI * 2);

                  ctx.stroke();

                  // Orbits

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.arc(cx + s * W * 0.05, cy - H * 0.26, W * 0.025, 0, Math.PI * 2);

                    ctx.stroke();

                  });

                  // Vertebral column (9 vertebrae)

                  for (var vi = 0; vi < 9; vi++) {

                    var vy = cy - H * 0.18 + vi * (H * 0.36 / 9);

                    ctx.beginPath(); ctx.ellipse(cx, vy, W * 0.015, H * 0.01, 0, 0, Math.PI * 2);

                    ctx.fillStyle = 'rgba(226,232,240,0.4)'; ctx.fill();

                    ctx.stroke();

                  }

                  // Urostyle

                  ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.15);

                  ctx.lineTo(cx, cy + H * 0.24);

                  ctx.lineWidth = 3; ctx.stroke();

                  // Pelvic girdle

                  ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.16, W * 0.08, H * 0.025, 0, 0, Math.PI * 2);

                  ctx.lineWidth = 1.5; ctx.stroke();

                  // Pectoral girdle

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.16, W * 0.10, H * 0.02, 0, 0, Math.PI * 2);

                  ctx.stroke();

                  // Femur + tibiofibula outlines

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath();

                    ctx.moveTo(cx + s * W * 0.08, cy + H * 0.18);

                    ctx.lineTo(cx + s * W * 0.16, cy + H * 0.26);

                    ctx.lineTo(cx + s * W * 0.18, cy + H * 0.36);

                    ctx.lineWidth = 2.5; ctx.stroke();

                    // Humerus + radioulna

                    ctx.beginPath();

                    ctx.moveTo(cx + s * W * 0.10, cy - H * 0.14);

                    ctx.lineTo(cx + s * W * 0.18, cy - H * 0.08);

                    ctx.lineTo(cx + s * W * 0.20, cy - H * 0.02);

                    ctx.lineWidth = 2; ctx.stroke();

                  });

                  ctx.globalAlpha = 1;

                }

                // Nervous layer: draw nerve pathways

                if (activeLayer === 'nervous') {

                  ctx.globalAlpha = 0.6;

                  // Brain

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.25, W * 0.05, H * 0.03, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(167,139,250,0.4)'; ctx.fill();

                  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.5; ctx.stroke();

                  // Optic lobes

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.28, W * 0.03, H * 0.015, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(196,181,253,0.4)'; ctx.fill(); ctx.stroke();

                  // Spinal cord

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.22); ctx.lineTo(cx, cy + H * 0.18);

                  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 2]); ctx.stroke(); ctx.setLineDash([]);

                  // Spinal nerves (10 pairs)

                  for (var sn = 0; sn < 10; sn++) {

                    var sny = cy - H * 0.18 + sn * (H * 0.36 / 10);

                    [-1, 1].forEach(function (s) {

                      ctx.beginPath(); ctx.moveTo(cx, sny);

                      ctx.lineTo(cx + s * W * 0.08, sny + H * 0.01);

                      ctx.strokeStyle = 'rgba(167,139,250,0.3)'; ctx.lineWidth = 0.8; ctx.stroke();

                    });

                  }

                  // Sciatic nerves

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx + s * W * 0.04, cy + H * 0.15);

                    ctx.quadraticCurveTo(cx + s * W * 0.10, cy + H * 0.25, cx + s * W * 0.16, cy + H * 0.38);

                    ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]);

                  });

                  // Optic nerves to eyes

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx + s * W * 0.03, cy - H * 0.26);

                    ctx.lineTo(cx + s * W * 0.07, cy - H * 0.28);

                    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 1; ctx.stroke();

                  });

                  ctx.globalAlpha = 1;

                }



              } else if (spec.bodyShape === 'worm') {

                // â•â• EARTHWORM (Lumbricus) â€” segmented annelid â•â•

                var wormTop = cy - H * 0.38;

                var wormBot = cy + H * 0.38;

                var ww = W * 0.045;

                // â”€â”€ Body (S-curved) â”€â”€

                ctx.beginPath();

                ctx.moveTo(cx - ww, wormTop);

                ctx.bezierCurveTo(cx - ww - W * 0.02, wormTop + H * 0.20, cx - ww + W * 0.02, wormTop + H * 0.40, cx - ww - W * 0.01, wormBot);

                ctx.quadraticCurveTo(cx, wormBot + H * 0.02, cx + ww + W * 0.01, wormBot);

                ctx.bezierCurveTo(cx + ww + W * 0.02, wormTop + H * 0.40, cx + ww - W * 0.02, wormTop + H * 0.20, cx + ww, wormTop);

                ctx.quadraticCurveTo(cx, wormTop - H * 0.015, cx - ww, wormTop);

                ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.shadowBlur = 0;

                // â”€â”€ Segmentation rings â”€â”€

                ctx.globalAlpha = 0.15;

                var numSegs = 32;

                for (var seg = 1; seg < numSegs; seg++) {

                  var segY = wormTop + seg * (wormBot - wormTop) / numSegs;

                  var xOff = Math.sin(seg * 0.2) * W * 0.008;

                  ctx.beginPath(); ctx.moveTo(cx - ww + xOff, segY); ctx.lineTo(cx + ww + xOff, segY);

                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();

                }

                ctx.globalAlpha = 1;

                // â”€â”€ Prostomium â”€â”€

                ctx.beginPath(); ctx.ellipse(cx, wormTop - H * 0.005, ww * 0.6, H * 0.008, 0, 0, Math.PI * 2);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                // â”€â”€ Clitellum â”€â”€

                var clitTop = wormTop + 12 * (wormBot - wormTop) / numSegs;

                var clitBot = wormTop + 15 * (wormBot - wormTop) / numSegs;

                ctx.beginPath(); ctx.rect(cx - ww - W * 0.005, clitTop, ww * 2 + W * 0.01, clitBot - clitTop);

                ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fill();

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.6; ctx.stroke();

                ctx.beginPath(); ctx.rect(cx - ww * 0.5, clitTop, ww, clitBot - clitTop);

                ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();

                // â”€â”€ Setae â”€â”€

                ctx.globalAlpha = 0.2;

                for (var st = 2; st < numSegs - 1; st++) {

                  var stY = wormTop + st * (wormBot - wormTop) / numSegs + (wormBot - wormTop) / numSegs / 2;

                  var stOff = Math.sin(st * 0.2) * W * 0.008;

                  ctx.beginPath(); ctx.moveTo(cx - ww + stOff, stY);

                  ctx.lineTo(cx - ww - W * 0.008 + stOff, stY - 1); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - ww + stOff, stY);

                  ctx.lineTo(cx - ww - W * 0.008 + stOff, stY + 1); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + ww + stOff, stY);

                  ctx.lineTo(cx + ww + W * 0.008 + stOff, stY - 1); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + ww + stOff, stY);

                  ctx.lineTo(cx + ww + W * 0.008 + stOff, stY + 1); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();

                }

                ctx.globalAlpha = 1;

                // â”€â”€ Moisture sheen â”€â”€

                ctx.globalAlpha = 0.05;

                ctx.beginPath(); ctx.rect(cx - ww * 0.3, wormTop + H * 0.05, ww * 0.4, wormBot - wormTop - H * 0.10);

                ctx.fillStyle = '#fff'; ctx.fill();

                ctx.globalAlpha = 1;

                // â”€â”€ Layer overlays â”€â”€

                if (activeLayer === 'skin') {

                  ctx.globalAlpha = 0.1;

                  for (var mg = 0; mg < 20; mg++) {

                    ctx.beginPath(); ctx.arc(cx - ww * 0.5, wormTop + H * 0.05 + mg * H * 0.035, 1.5, 0, Math.PI * 2);

                    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();

                  }

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'muscle') {

                  ctx.globalAlpha = 0.3;

                  for (var lm = 0; lm < 3; lm++) {

                    ctx.beginPath(); ctx.moveTo(cx - ww * 0.5 + lm * ww * 0.5, wormTop + H * 0.02);

                    ctx.lineTo(cx - ww * 0.5 + lm * ww * 0.5, wormBot - H * 0.02);

                    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1; ctx.stroke();

                  }

                  for (var cm = 0; cm < 15; cm++) {

                    ctx.beginPath(); ctx.moveTo(cx - ww, wormTop + cm * H * 0.05 + H * 0.03);

                    ctx.lineTo(cx + ww, wormTop + cm * H * 0.05 + H * 0.03);

                    ctx.strokeStyle = '#f87171'; ctx.lineWidth = 0.8; ctx.stroke();

                  }

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'organs') {

                  ctx.globalAlpha = 0.5;

                  for (var aa = 0; aa < 5; aa++) {

                    ctx.beginPath(); ctx.arc(cx, wormTop + H * 0.15 + aa * H * 0.04, W * 0.012, 0, Math.PI * 2);

                    ctx.fillStyle = '#dc2626'; ctx.fill();

                  }

                  ctx.beginPath(); ctx.ellipse(cx, wormTop + H * 0.35, ww * 0.6, H * 0.02, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#fde68a'; ctx.fill();

                  ctx.beginPath(); ctx.ellipse(cx, wormTop + H * 0.40, ww * 0.7, H * 0.02, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#a78bfa'; ctx.fill();

                  ctx.beginPath(); ctx.moveTo(cx, wormTop + H * 0.42);

                  ctx.lineTo(cx, wormBot - H * 0.05);

                  ctx.strokeStyle = '#f97316'; ctx.lineWidth = ww * 0.6; ctx.stroke();

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'nervous') {

                  ctx.globalAlpha = 0.6;

                  ctx.beginPath(); ctx.arc(cx, wormTop + H * 0.04, W * 0.012, 0, Math.PI * 2);

                  ctx.fillStyle = '#fbbf24'; ctx.fill();

                  ctx.beginPath(); ctx.moveTo(cx, wormTop + H * 0.04);

                  ctx.lineTo(cx, wormBot - H * 0.02);

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();

                  for (var sg2 = 0; sg2 < 12; sg2++) {

                    ctx.beginPath(); ctx.arc(cx, wormTop + H * 0.08 + sg2 * H * 0.06, 2.5, 0, Math.PI * 2);

                    ctx.fillStyle = '#f59e0b'; ctx.fill();

                  }

                  ctx.globalAlpha = 1;

                }





              } else if (spec.bodyShape === 'pig') {

                // â•â• FETAL PIG (Sus scrofa) â•â•

                // â”€â”€ Body (barrel-shaped torso) â”€â”€

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.18, cy - H * 0.14);

                ctx.bezierCurveTo(cx - W * 0.08, cy - H * 0.18, cx + W * 0.10, cy - H * 0.18, cx + W * 0.20, cy - H * 0.12);

                ctx.bezierCurveTo(cx + W * 0.24, cy - H * 0.06, cx + W * 0.24, cy + H * 0.08, cx + W * 0.20, cy + H * 0.14);

                ctx.bezierCurveTo(cx + W * 0.10, cy + H * 0.18, cx - W * 0.08, cy + H * 0.18, cx - W * 0.18, cy + H * 0.14);

                ctx.bezierCurveTo(cx - W * 0.22, cy + H * 0.08, cx - W * 0.22, cy - H * 0.06, cx - W * 0.18, cy - H * 0.14);

                ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.shadowBlur = 0;

                // Body midline highlight (3D volume)

                ctx.beginPath(); ctx.ellipse(cx - W * 0.02, cy - H * 0.04, W * 0.12, H * 0.08, -0.05, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();



                // â”€â”€ Head (elongated snout) â”€â”€

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.18, cy - H * 0.10);

                ctx.bezierCurveTo(cx - W * 0.22, cy - H * 0.12, cx - W * 0.28, cy - H * 0.10, cx - W * 0.30, cy - H * 0.04);

                ctx.bezierCurveTo(cx - W * 0.32, cy + H * 0.01, cx - W * 0.30, cy + H * 0.06, cx - W * 0.26, cy + H * 0.08);

                ctx.bezierCurveTo(cx - W * 0.22, cy + H * 0.10, cx - W * 0.18, cy + H * 0.08, cx - W * 0.18, cy + H * 0.04);

                ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.stroke();

                // Snout (disk-shaped pig nose)

                ctx.beginPath(); ctx.ellipse(cx - W * 0.31, cy - H * 0.01, W * 0.028, H * 0.035, 0, 0, Math.PI * 2);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.stroke();

                // Nostrils

                ctx.beginPath(); ctx.ellipse(cx - W * 0.32, cy - H * 0.025, 2, 1.5, 0.3, 0, Math.PI * 2);

                ctx.fillStyle = layerStroke; ctx.fill();

                ctx.beginPath(); ctx.ellipse(cx - W * 0.32, cy + H * 0.005, 2, 1.5, -0.3, 0, Math.PI * 2);

                ctx.fillStyle = layerStroke; ctx.fill();

                // Eye

                ctx.beginPath(); ctx.arc(cx - W * 0.24, cy - H * 0.06, 4, 0, Math.PI * 2);

                ctx.fillStyle = '#1a1a1a'; ctx.fill();

                ctx.beginPath(); ctx.arc(cx - W * 0.237, cy - H * 0.065, 1.5, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();

                // Ears (floppy pig ears)

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.22, cy - H * 0.10);

                ctx.bezierCurveTo(cx - W * 0.24, cy - H * 0.16, cx - W * 0.20, cy - H * 0.18, cx - W * 0.17, cy - H * 0.14);

                ctx.bezierCurveTo(cx - W * 0.16, cy - H * 0.12, cx - W * 0.19, cy - H * 0.10, cx - W * 0.20, cy - H * 0.09);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                // Inner ear shading

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.215, cy - H * 0.11);

                ctx.bezierCurveTo(cx - W * 0.23, cy - H * 0.15, cx - W * 0.19, cy - H * 0.16, cx - W * 0.175, cy - H * 0.13);

                ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fill();



                // â”€â”€ Legs (anatomically shaped with joints) â”€â”€

                // Front-left leg

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.14, cy + H * 0.12);

                ctx.bezierCurveTo(cx - W * 0.15, cy + H * 0.16, cx - W * 0.14, cy + H * 0.22, cx - W * 0.135, cy + H * 0.26);

                ctx.bezierCurveTo(cx - W * 0.13, cy + H * 0.28, cx - W * 0.12, cy + H * 0.29, cx - W * 0.115, cy + H * 0.30);

                ctx.lineTo(cx - W * 0.095, cy + H * 0.30);

                ctx.bezierCurveTo(cx - W * 0.09, cy + H * 0.29, cx - W * 0.10, cy + H * 0.28, cx - W * 0.105, cy + H * 0.26);

                ctx.bezierCurveTo(cx - W * 0.11, cy + H * 0.22, cx - W * 0.12, cy + H * 0.16, cx - W * 0.11, cy + H * 0.12);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                // Front-right leg (behind)

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.12, cy + H * 0.12);

                ctx.bezierCurveTo(cx - W * 0.13, cy + H * 0.16, cx - W * 0.12, cy + H * 0.22, cx - W * 0.115, cy + H * 0.26);

                ctx.bezierCurveTo(cx - W * 0.11, cy + H * 0.28, cx - W * 0.10, cy + H * 0.29, cx - W * 0.095, cy + H * 0.30);

                ctx.lineTo(cx - W * 0.075, cy + H * 0.30);

                ctx.bezierCurveTo(cx - W * 0.07, cy + H * 0.29, cx - W * 0.08, cy + H * 0.28, cx - W * 0.085, cy + H * 0.26);

                ctx.bezierCurveTo(cx - W * 0.09, cy + H * 0.22, cx - W * 0.10, cy + H * 0.16, cx - W * 0.09, cy + H * 0.12);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                // Rear-left leg

                ctx.beginPath();

                ctx.moveTo(cx + W * 0.10, cy + H * 0.12);

                ctx.bezierCurveTo(cx + W * 0.09, cy + H * 0.16, cx + W * 0.10, cy + H * 0.22, cx + W * 0.105, cy + H * 0.26);

                ctx.bezierCurveTo(cx + W * 0.11, cy + H * 0.28, cx + W * 0.12, cy + H * 0.29, cx + W * 0.125, cy + H * 0.30);

                ctx.lineTo(cx + W * 0.145, cy + H * 0.30);

                ctx.bezierCurveTo(cx + W * 0.15, cy + H * 0.29, cx + W * 0.14, cy + H * 0.28, cx + W * 0.135, cy + H * 0.26);

                ctx.bezierCurveTo(cx + W * 0.13, cy + H * 0.22, cx + W * 0.12, cy + H * 0.16, cx + W * 0.13, cy + H * 0.12);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                // Rear-right leg (behind)

                ctx.beginPath();

                ctx.moveTo(cx + W * 0.12, cy + H * 0.12);

                ctx.bezierCurveTo(cx + W * 0.11, cy + H * 0.16, cx + W * 0.12, cy + H * 0.22, cx + W * 0.125, cy + H * 0.26);

                ctx.bezierCurveTo(cx + W * 0.13, cy + H * 0.28, cx + W * 0.14, cy + H * 0.29, cx + W * 0.145, cy + H * 0.30);

                ctx.lineTo(cx + W * 0.165, cy + H * 0.30);

                ctx.bezierCurveTo(cx + W * 0.17, cy + H * 0.29, cx + W * 0.16, cy + H * 0.28, cx + W * 0.155, cy + H * 0.26);

                ctx.bezierCurveTo(cx + W * 0.15, cy + H * 0.22, cx + W * 0.14, cy + H * 0.16, cx + W * 0.15, cy + H * 0.12);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();



                // â”€â”€ Hooves (dark, split/cloven) â”€â”€

                // Front hooves

                [cx - W * 0.115, cx - W * 0.095].forEach(function (hx) {

                  ctx.beginPath();

                  ctx.moveTo(hx - W * 0.01, cy + H * 0.30);

                  ctx.lineTo(hx - W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx - W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx, cy + H * 0.31);

                  ctx.lineTo(hx + W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.01, cy + H * 0.30);

                  ctx.closePath();

                  ctx.fillStyle = '#292524'; ctx.fill();

                });

                [cx - W * 0.075].forEach(function (hx) {

                  ctx.beginPath();

                  ctx.moveTo(hx - W * 0.01, cy + H * 0.30);

                  ctx.lineTo(hx - W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx - W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx, cy + H * 0.31);

                  ctx.lineTo(hx + W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.01, cy + H * 0.30);

                  ctx.closePath();

                  ctx.fillStyle = '#292524'; ctx.fill();

                });

                // Rear hooves

                [cx + W * 0.125, cx + W * 0.145, cx + W * 0.165].forEach(function (hx) {

                  ctx.beginPath();

                  ctx.moveTo(hx - W * 0.01, cy + H * 0.30);

                  ctx.lineTo(hx - W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx - W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx, cy + H * 0.31);

                  ctx.lineTo(hx + W * 0.002, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.012, cy + H * 0.33);

                  ctx.lineTo(hx + W * 0.01, cy + H * 0.30);

                  ctx.closePath();

                  ctx.fillStyle = '#292524'; ctx.fill();

                });



                // â”€â”€ Curly tail â”€â”€

                ctx.beginPath();

                ctx.moveTo(cx + W * 0.22, cy - H * 0.02);

                ctx.bezierCurveTo(cx + W * 0.26, cy - H * 0.06, cx + W * 0.28, cy - H * 0.10, cx + W * 0.26, cy - H * 0.12);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();



                // â”€â”€ Skin layer details â”€â”€

                if (activeLayer === 'skin') {

                  ctx.globalAlpha = 0.08;

                  for (var hf = 0; hf < 50; hf++) {

                    var hfx = cx - W * 0.18 + (hf % 10) * W * 0.04;

                    var hfy = cy - H * 0.12 + Math.floor(hf / 10) * H * 0.05;

                    ctx.beginPath(); ctx.moveTo(hfx, hfy);

                    ctx.lineTo(hfx + (Math.sin(hf * 2.7) * 1.5), hfy - 3);

                    ctx.strokeStyle = '#78716c'; ctx.lineWidth = 0.4; ctx.stroke();

                  }

                  ctx.globalAlpha = 1;

                  // Skin folds

                  ctx.globalAlpha = 0.05;

                  for (var sf = 0; sf < 4; sf++) {

                    ctx.beginPath();

                    ctx.moveTo(cx - W * 0.10, cy - H * 0.08 + sf * H * 0.05);

                    ctx.quadraticCurveTo(cx, cy - H * 0.10 + sf * H * 0.05, cx + W * 0.10, cy - H * 0.08 + sf * H * 0.05);

                    ctx.strokeStyle = '#78716c'; ctx.lineWidth = 0.6; ctx.stroke();

                  }

                  ctx.globalAlpha = 1;

                }



                // â”€â”€ Pig layer overlays â”€â”€

                if (activeLayer === 'organs') {

                  ctx.globalAlpha = 0.5;

                  // Heart

                  ctx.beginPath(); ctx.arc(cx - W * 0.04, cy - H * 0.06, W * 0.025, 0, Math.PI * 2);

                  ctx.fillStyle = '#dc2626'; ctx.fill();

                  // Lungs

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.ellipse(cx + s * W * 0.08 - W * 0.04, cy - H * 0.04, W * 0.04, H * 0.06, 0, 0, Math.PI * 2);

                    ctx.fillStyle = '#fca5a5'; ctx.fill(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 0.5; ctx.stroke();

                  });

                  // Liver

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.02, cy + H * 0.02, W * 0.10, H * 0.04, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  // Stomach

                  ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.06, W * 0.06, H * 0.03, 0.2, 0, Math.PI * 2);

                  ctx.fillStyle = '#fde68a'; ctx.fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 0.5; ctx.stroke();

                  // Intestines

                  ctx.beginPath(); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5;

                  ctx.moveTo(cx - W * 0.05, cy + H * 0.08);

                  for (var pi = 0; pi < 5; pi++) {

                    ctx.quadraticCurveTo(cx + (pi % 2 ? 1 : -1) * W * 0.08, cy + H * 0.09 + pi * H * 0.012, cx + (pi % 2 ? -1 : 1) * W * 0.03, cy + H * 0.10 + pi * H * 0.012);

                  }

                  ctx.stroke();

                  // Umbilical cord

                  ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.14);

                  ctx.quadraticCurveTo(cx + W * 0.05, cy + H * 0.20, cx + W * 0.02, cy + H * 0.26);

                  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 3; ctx.stroke();

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'skeleton') {

                  // Use higher opacity and darker colors for visibility

                  ctx.globalAlpha = 0.85;

                  var boneColor = '#94a3b8';

                  var boneFill = 'rgba(148,163,184,0.35)';

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 1.5;

                  // â”€â”€ Skull â”€â”€

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.24, cy - H * 0.02, W * 0.07, H * 0.06, -0.2, 0, Math.PI * 2);

                  ctx.fillStyle = boneFill; ctx.fill(); ctx.stroke();

                  // Eye socket

                  ctx.beginPath(); ctx.arc(cx - W * 0.24, cy - H * 0.05, W * 0.015, 0, Math.PI * 2);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 0.8; ctx.stroke();

                  // Jaw

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.27, cy + H * 0.02);

                  ctx.quadraticCurveTo(cx - W * 0.30, cy + H * 0.01, cx - W * 0.30, cy - H * 0.01);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 1.2; ctx.stroke();

                  // â”€â”€ Spine (vertebral column) â”€â”€

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.17, cy - H * 0.02);

                  ctx.lineTo(cx + W * 0.20, cy - H * 0.02);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 4; ctx.stroke();

                  // Vertebrae marks + neural arches

                  for (var pv = 0; pv < 18; pv++) {

                    var pvx = cx - W * 0.15 + pv * (W * 0.34 / 18);

                    ctx.beginPath(); ctx.moveTo(pvx, cy - H * 0.05); ctx.lineTo(pvx, cy + H * 0.01);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 0.8; ctx.stroke();

                    // Spinous process (dorsal bump)

                    ctx.beginPath(); ctx.arc(pvx, cy - H * 0.055, 1.8, 0, Math.PI * 2);

                    ctx.fillStyle = boneFill; ctx.fill();

                  }

                  // â”€â”€ Ribs (extending from vertebrae down to sternum) â”€â”€

                  for (var pr = 0; pr < 8; pr++) {

                    var prx = cx - W * 0.12 + pr * (W * 0.18 / 8);

                    ctx.beginPath();

                    ctx.moveTo(prx, cy - H * 0.04);

                    ctx.bezierCurveTo(prx - W * 0.015, cy + H * 0.02, prx - W * 0.01, cy + H * 0.06, prx + W * 0.005, cy + H * 0.09);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 1; ctx.stroke();

                  }

                  // â”€â”€ Sternum (connecting rib tips ventrally) â”€â”€

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.10, cy + H * 0.09);

                  ctx.lineTo(cx + W * 0.06, cy + H * 0.09);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 2.5; ctx.stroke();

                  // Sternebrae

                  for (var stb = 0; stb < 6; stb++) {

                    var stbx = cx - W * 0.09 + stb * (W * 0.15 / 6);

                    ctx.beginPath(); ctx.arc(stbx, cy + H * 0.09, 2.5, 0, Math.PI * 2);

                    ctx.fillStyle = boneFill; ctx.fill();

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 0.6; ctx.stroke();

                  }

                  // â”€â”€ Scapula (shoulder blade â€” inside body outline) â”€â”€

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.16, cy - H * 0.04);

                  ctx.lineTo(cx - W * 0.19, cy - H * 0.11);

                  ctx.lineTo(cx - W * 0.12, cy - H * 0.09);

                  ctx.closePath();

                  ctx.fillStyle = boneFill; ctx.fill();

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 1.5; ctx.stroke();

                  // Scapular spine

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.17, cy - H * 0.10);

                  ctx.lineTo(cx - W * 0.14, cy - H * 0.06);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 1; ctx.stroke();

                  // â”€â”€ Pelvis (ilium-ischium-pubis, inside body) â”€â”€

                  ctx.beginPath();

                  ctx.moveTo(cx + W * 0.12, cy - H * 0.04);

                  ctx.bezierCurveTo(cx + W * 0.16, cy - H * 0.08, cx + W * 0.20, cy - H * 0.04, cx + W * 0.18, cy);

                  ctx.bezierCurveTo(cx + W * 0.20, cy + H * 0.04, cx + W * 0.16, cy + H * 0.08, cx + W * 0.12, cy + H * 0.04);

                  ctx.closePath();

                  ctx.fillStyle = boneFill; ctx.fill();

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 1.5; ctx.stroke();

                  // Acetabulum (hip socket)

                  ctx.beginPath(); ctx.arc(cx + W * 0.14, cy + H * 0.01, W * 0.012, 0, Math.PI * 2);

                  ctx.strokeStyle = boneColor; ctx.lineWidth = 0.8; ctx.stroke();

                  // Obturator foramen

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.15, cy + H * 0.03, W * 0.008, H * 0.015, 0, 0, Math.PI * 2);

                  ctx.strokeStyle = 'rgba(200,214,229,0.4)'; ctx.lineWidth = 0.6; ctx.stroke();

                  ctx.strokeStyle = boneColor;

                  // â”€â”€ Forelimb bones â”€â”€

                  // Humerus + radius/ulna for each front leg

                  [[-0.135, -0.005], [-0.105, 0.005]].forEach(function (lp) {

                    var legX = cx + W * lp[0];

                    // Humerus (upper)

                    ctx.beginPath(); ctx.moveTo(legX, cy + H * 0.12);

                    ctx.lineTo(legX - W * 0.005, cy + H * 0.20);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 2.5; ctx.stroke();

                    // Elbow joint

                    ctx.beginPath(); ctx.arc(legX - W * 0.005, cy + H * 0.20, 3, 0, Math.PI * 2);

                    ctx.fillStyle = boneFill; ctx.fill(); ctx.strokeStyle = boneColor; ctx.lineWidth = 0.8; ctx.stroke();

                    // Radius/ulna (lower)

                    ctx.beginPath(); ctx.moveTo(legX - W * 0.005, cy + H * 0.20);

                    ctx.lineTo(legX, cy + H * 0.29);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 2; ctx.stroke();

                  });

                  // â”€â”€ Hindlimb bones â”€â”€

                  // Femur + tibia/fibula for each rear leg

                  [[0.115, -0.005], [0.145, 0.005]].forEach(function (lp) {

                    var legX = cx + W * lp[0];

                    // Femur (upper)

                    ctx.beginPath(); ctx.moveTo(legX, cy + H * 0.12);

                    ctx.lineTo(legX + W * 0.005, cy + H * 0.20);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 2.5; ctx.stroke();

                    // Knee joint

                    ctx.beginPath(); ctx.arc(legX + W * 0.005, cy + H * 0.20, 3, 0, Math.PI * 2);

                    ctx.fillStyle = boneFill; ctx.fill(); ctx.strokeStyle = boneColor; ctx.lineWidth = 0.8; ctx.stroke();

                    // Tibia/fibula (lower)

                    ctx.beginPath(); ctx.moveTo(legX + W * 0.005, cy + H * 0.20);

                    ctx.lineTo(legX, cy + H * 0.29);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 2; ctx.stroke();

                  });

                  // â”€â”€ Hoof bones (distal phalanges) â”€â”€

                  [cx - W * 0.135, cx - W * 0.105, cx + W * 0.115, cx + W * 0.145].forEach(function (hx) {

                    ctx.beginPath();

                    ctx.moveTo(hx - W * 0.008, cy + H * 0.30);

                    ctx.lineTo(hx - W * 0.01, cy + H * 0.32);

                    ctx.lineTo(hx, cy + H * 0.31);

                    ctx.lineTo(hx + W * 0.01, cy + H * 0.32);

                    ctx.lineTo(hx + W * 0.008, cy + H * 0.30);

                    ctx.strokeStyle = boneColor; ctx.lineWidth = 1; ctx.stroke();

                  });

                  ctx.globalAlpha = 1;

                }





              } else if (spec.bodyShape === 'fish') {

                // ══ PERCH (Perca) — fusiform bony fish ══

                // ======== FINS (drawn first so body covers fin bases) ========

                // ── Spiny dorsal fin (behind body) ──
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.10, cy - H * 0.14);
                // Fin rises from dorsal contour — base merges INTO body
                ctx.bezierCurveTo(cx - W * 0.08, cy - H * 0.22, cx - W * 0.01, cy - H * 0.26, cx + W * 0.03, cy - H * 0.24);
                ctx.bezierCurveTo(cx + W * 0.06, cy - H * 0.22, cx + W * 0.08, cy - H * 0.19, cx + W * 0.10, cy - H * 0.13);
                // Return path dips INTO body so body covers it
                ctx.lineTo(cx + W * 0.10, cy - H * 0.10);
                ctx.lineTo(cx - W * 0.10, cy - H * 0.11);
                ctx.closePath();
                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.45; ctx.fill();
                // Only stroke the OUTER edge (not the base that body will cover)
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.10, cy - H * 0.14);
                ctx.bezierCurveTo(cx - W * 0.08, cy - H * 0.22, cx - W * 0.01, cy - H * 0.26, cx + W * 0.03, cy - H * 0.24);
                ctx.bezierCurveTo(cx + W * 0.06, cy - H * 0.22, cx + W * 0.08, cy - H * 0.19, cx + W * 0.10, cy - H * 0.13);
                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
                // Spine rays
                ctx.globalAlpha = 0.35;
                for (var ds = 0; ds < 9; ds++) {
                  var dsP = ds / 8;
                  var dsX = cx - W * 0.10 + dsP * W * 0.20;
                  var dsBaseY = cy - H * 0.14;
                  var dsH = Math.sin(dsP * Math.PI) * H * 0.12 + H * 0.03;
                  ctx.beginPath(); ctx.moveTo(dsX, dsBaseY); ctx.lineTo(dsX, dsBaseY - dsH);
                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.5; ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // ── Soft dorsal fin (behind body) ──
                ctx.beginPath();
                ctx.moveTo(cx + W * 0.14, cy - H * 0.11);
                ctx.bezierCurveTo(cx + W * 0.15, cy - H * 0.17, cx + W * 0.18, cy - H * 0.18, cx + W * 0.21, cy - H * 0.15);
                ctx.bezierCurveTo(cx + W * 0.22, cy - H * 0.13, cx + W * 0.22, cy - H * 0.10, cx + W * 0.22, cy - H * 0.09);
                ctx.lineTo(cx + W * 0.22, cy - H * 0.06);
                ctx.lineTo(cx + W * 0.14, cy - H * 0.08);
                ctx.closePath();
                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.40; ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx + W * 0.14, cy - H * 0.11);
                ctx.bezierCurveTo(cx + W * 0.15, cy - H * 0.17, cx + W * 0.18, cy - H * 0.18, cx + W * 0.21, cy - H * 0.15);
                ctx.bezierCurveTo(cx + W * 0.22, cy - H * 0.13, cx + W * 0.22, cy - H * 0.10, cx + W * 0.22, cy - H * 0.09);
                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
                // Soft rays
                ctx.globalAlpha = 0.25;
                for (var sd = 0; sd < 5; sd++) {
                  var sdP = sd / 4;
                  var sdX = cx + W * (0.14 + sdP * 0.08);
                  ctx.beginPath(); ctx.moveTo(sdX, cy - H * 0.10);
                  ctx.lineTo(sdX, cy - H * (0.10 + Math.sin(sdP * Math.PI) * 0.07 + 0.02));
                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.35; ctx.stroke();
                }
                ctx.globalAlpha = 1;

                // ── Anal fin (behind body) ──
                ctx.beginPath();
                ctx.moveTo(cx + W * 0.12, cy + H * 0.11);
                ctx.bezierCurveTo(cx + W * 0.13, cy + H * 0.17, cx + W * 0.16, cy + H * 0.18, cx + W * 0.18, cy + H * 0.14);
                ctx.lineTo(cx + W * 0.18, cy + H * 0.08);
                ctx.lineTo(cx + W * 0.12, cy + H * 0.08);
                ctx.closePath();
                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.40; ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx + W * 0.12, cy + H * 0.11);
                ctx.bezierCurveTo(cx + W * 0.13, cy + H * 0.17, cx + W * 0.16, cy + H * 0.18, cx + W * 0.18, cy + H * 0.14);
                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.7; ctx.stroke(); ctx.globalAlpha = 1;

                // ── Pelvic fin (behind body) ──
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.06, cy + H * 0.12);
                ctx.bezierCurveTo(cx - W * 0.08, cy + H * 0.16, cx - W * 0.10, cy + H * 0.19, cx - W * 0.08, cy + H * 0.20);
                ctx.bezierCurveTo(cx - W * 0.05, cy + H * 0.19, cx - W * 0.03, cy + H * 0.16, cx - W * 0.02, cy + H * 0.13);
                ctx.lineTo(cx - W * 0.02, cy + H * 0.10);
                ctx.lineTo(cx - W * 0.06, cy + H * 0.10);
                ctx.closePath();
                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.35; ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.06, cy + H * 0.12);
                ctx.bezierCurveTo(cx - W * 0.08, cy + H * 0.16, cx - W * 0.10, cy + H * 0.19, cx - W * 0.08, cy + H * 0.20);
                ctx.bezierCurveTo(cx - W * 0.05, cy + H * 0.19, cx - W * 0.03, cy + H * 0.16, cx - W * 0.02, cy + H * 0.13);
                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.6; ctx.stroke(); ctx.globalAlpha = 1;

                // ── Pectoral fin (behind body) ──
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.16, cy + H * 0.02);
                ctx.bezierCurveTo(cx - W * 0.19, cy + H * 0.06, cx - W * 0.20, cy + H * 0.12, cx - W * 0.17, cy + H * 0.14);
                ctx.bezierCurveTo(cx - W * 0.14, cy + H * 0.12, cx - W * 0.13, cy + H * 0.08, cx - W * 0.14, cy + H * 0.04);
                ctx.lineTo(cx - W * 0.14, cy + H * 0.00);
                ctx.lineTo(cx - W * 0.16, cy + H * 0.00);
                ctx.closePath();
                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.35; ctx.fill();
                ctx.beginPath();
                ctx.moveTo(cx - W * 0.16, cy + H * 0.02);
                ctx.bezierCurveTo(cx - W * 0.19, cy + H * 0.06, cx - W * 0.20, cy + H * 0.12, cx - W * 0.17, cy + H * 0.14);
                ctx.bezierCurveTo(cx - W * 0.14, cy + H * 0.12, cx - W * 0.13, cy + H * 0.08, cx - W * 0.14, cy + H * 0.04);
                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.6; ctx.stroke(); ctx.globalAlpha = 1;

                // ======== BODY (drawn on top, covers fin bases) ========

                // ── Body (streamlined fusiform shape) ──

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.30, cy); // snout tip

                ctx.bezierCurveTo(cx - W * 0.25, cy - H * 0.08, cx - W * 0.18, cy - H * 0.13, cx - W * 0.10, cy - H * 0.14);

                ctx.bezierCurveTo(cx - W * 0.02, cy - H * 0.15, cx + W * 0.08, cy - H * 0.13, cx + W * 0.16, cy - H * 0.10);

                ctx.bezierCurveTo(cx + W * 0.22, cy - H * 0.08, cx + W * 0.25, cy - H * 0.06, cx + W * 0.26, cy - H * 0.04);

                // Caudal peduncle

                ctx.lineTo(cx + W * 0.28, cy - H * 0.03);

                // Caudal fin (forked)

                ctx.lineTo(cx + W * 0.34, cy - H * 0.12);

                ctx.bezierCurveTo(cx + W * 0.33, cy - H * 0.06, cx + W * 0.33, cy + H * 0.06, cx + W * 0.34, cy + H * 0.12);

                ctx.lineTo(cx + W * 0.28, cy + H * 0.03);

                // Ventral contour

                ctx.lineTo(cx + W * 0.26, cy + H * 0.04);

                ctx.bezierCurveTo(cx + W * 0.22, cy + H * 0.08, cx + W * 0.16, cy + H * 0.10, cx + W * 0.08, cy + H * 0.12);

                ctx.bezierCurveTo(cx - W * 0.02, cy + H * 0.14, cx - W * 0.12, cy + H * 0.14, cx - W * 0.20, cy + H * 0.10);

                ctx.bezierCurveTo(cx - W * 0.25, cy + H * 0.07, cx - W * 0.28, cy + H * 0.04, cx - W * 0.30, cy);

                ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.shadowBlur = 0;

                // Dorsal highlight

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.20, cy - H * 0.08);

                ctx.quadraticCurveTo(cx, cy - H * 0.12, cx + W * 0.18, cy - H * 0.06);

                ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 3; ctx.stroke();

                // ── Operculum (gill cover) ──

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.18, cy - H * 0.10);

                ctx.bezierCurveTo(cx - W * 0.16, cy - H * 0.04, cx - W * 0.16, cy + H * 0.04, cx - W * 0.18, cy + H * 0.08);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.stroke();

                // ── Eye ──

                ctx.beginPath(); ctx.arc(cx - W * 0.23, cy - H * 0.02, 6, 0, Math.PI * 2);

                ctx.fillStyle = '#fef9c3'; ctx.fill(); ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 1; ctx.stroke();

                ctx.beginPath(); ctx.arc(cx - W * 0.23, cy - H * 0.02, 3, 0, Math.PI * 2); ctx.fillStyle = '#1a1a1a'; ctx.fill();

                ctx.beginPath(); ctx.arc(cx - W * 0.225, cy - H * 0.03, 1.5, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();

                // ── Mouth ──

                ctx.beginPath(); ctx.moveTo(cx - W * 0.30, cy); ctx.lineTo(cx - W * 0.28, cy + H * 0.02);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();


                // â”€â”€ Scale pattern â”€â”€

                ctx.globalAlpha = 0.12;

                for (var sc = 0; sc < 12; sc++) {

                  for (var sr = 0; sr < 4; sr++) {

                    var scx = cx - W * 0.15 + sc * W * 0.035 + (sr % 2) * W * 0.017;

                    var scy = cy - H * 0.08 + sr * H * 0.04;

                    ctx.beginPath(); ctx.arc(scx, scy, W * 0.012, 0, Math.PI, true);

                    ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.4; ctx.stroke();

                  }

                }

                ctx.globalAlpha = 1;

                // â”€â”€ Caudal fin rays â”€â”€

                ctx.globalAlpha = 0.25;

                for (var cfr = 0; cfr < 7; cfr++) {

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.28, cy);

                  ctx.lineTo(cx + W * 0.34, cy - H * 0.10 + cfr * H * 0.03);

                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.4; ctx.stroke();

                }

                ctx.globalAlpha = 1;

                // â”€â”€ Lateral line â”€â”€

                ctx.globalAlpha = 0.3;

                for (var ll = 0; ll < 18; ll++) {

                  ctx.beginPath(); ctx.arc(cx - W * 0.22 + ll * W * 0.025, cy - H * 0.01, 1, 0, Math.PI * 2);

                  ctx.fillStyle = layerStroke; ctx.fill();

                }

                ctx.globalAlpha = 1;

                // â”€â”€ Perch vertical bars â”€â”€

                ctx.globalAlpha = 0.08;

                for (var pb = 0; pb < 6; pb++) {

                  var pbx = cx - W * 0.10 + pb * W * 0.06;

                  ctx.beginPath(); ctx.moveTo(pbx, cy - H * 0.10); ctx.lineTo(pbx, cy + H * 0.08);

                  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = W * 0.015; ctx.stroke();

                }

                ctx.globalAlpha = 1;

                // â”€â”€ Layer overlays â”€â”€

                if (activeLayer === 'organs') {

                  ctx.globalAlpha = 0.5;

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.04, W * 0.10, H * 0.035, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(219,234,254,0.6)'; ctx.fill();

                  ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 0.8; ctx.stroke();

                  ctx.beginPath(); ctx.arc(cx - W * 0.20, cy + H * 0.04, W * 0.015, 0, Math.PI * 2);

                  ctx.fillStyle = '#dc2626'; ctx.fill();

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.10, cy + H * 0.02, W * 0.05, H * 0.03, 0.2, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.03, cy + H * 0.04, W * 0.04, H * 0.02, -0.1, 0, Math.PI * 2);

                  ctx.fillStyle = '#fde68a'; ctx.fill();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.01, cy + H * 0.04);

                  ctx.quadraticCurveTo(cx + W * 0.08, cy + H * 0.06, cx + W * 0.12, cy + H * 0.04);

                  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.stroke();

                  for (var gf = 0; gf < 5; gf++) {

                    ctx.beginPath(); ctx.moveTo(cx - W * 0.175, cy - H * 0.06 + gf * H * 0.025);

                    ctx.lineTo(cx - W * 0.20, cy - H * 0.06 + gf * H * 0.025);

                    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.stroke();

                  }

                  ctx.beginPath(); ctx.ellipse(cx, cy - H * 0.08, W * 0.12, H * 0.012, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#78350f'; ctx.fill();

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'skeleton') {

                  ctx.globalAlpha = 0.7; var boneC = '#94a3b8';

                  ctx.strokeStyle = boneC; ctx.lineWidth = 1.5;

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.25, cy - H * 0.01, W * 0.06, H * 0.05, 0, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(148,163,184,0.2)'; ctx.fill(); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.28, cy);

                  ctx.lineTo(cx - W * 0.30, cy + H * 0.03); ctx.lineTo(cx - W * 0.24, cy + H * 0.02); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.19, cy - H * 0.02);

                  ctx.lineTo(cx + W * 0.26, cy - H * 0.02); ctx.lineWidth = 3; ctx.stroke();

                  for (var fv = 0; fv < 22; fv++) {

                    var fvx = cx - W * 0.18 + fv * (W * 0.43 / 22);

                    ctx.beginPath(); ctx.moveTo(fvx, cy - H * 0.05); ctx.lineTo(fvx, cy + H * 0.01);

                    ctx.strokeStyle = boneC; ctx.lineWidth = 0.6; ctx.stroke();

                  }

                  for (var rb = 0; rb < 10; rb++) {

                    var rbx = cx - W * 0.15 + rb * W * 0.03;

                    ctx.beginPath(); ctx.moveTo(rbx, cy);

                    ctx.quadraticCurveTo(rbx - W * 0.005, cy + H * 0.06, rbx, cy + H * 0.08);

                    ctx.strokeStyle = boneC; ctx.lineWidth = 0.5; ctx.stroke();

                  }

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.19, cy, W * 0.02, H * 0.06, 0, 0, Math.PI * 2);

                  ctx.strokeStyle = boneC; ctx.lineWidth = 0.8; ctx.stroke();

                  ctx.globalAlpha = 1;

                }





              } else if (spec.bodyShape === 'crayfish') {

                // â•â• CRAYFISH (Cambarus) â€” crustacean â•â•

                // â”€â”€ Cephalothorax â”€â”€

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.18, cy - H * 0.06);

                ctx.bezierCurveTo(cx - W * 0.20, cy - H * 0.10, cx - W * 0.12, cy - H * 0.14, cx - W * 0.02, cy - H * 0.14);

                ctx.bezierCurveTo(cx + W * 0.06, cy - H * 0.14, cx + W * 0.10, cy - H * 0.12, cx + W * 0.12, cy - H * 0.08);

                ctx.bezierCurveTo(cx + W * 0.12, cy - H * 0.04, cx + W * 0.10, cy + H * 0.04, cx + W * 0.12, cy + H * 0.08);

                ctx.bezierCurveTo(cx + W * 0.10, cy + H * 0.12, cx + W * 0.06, cy + H * 0.14, cx - W * 0.02, cy + H * 0.14);

                ctx.bezierCurveTo(cx - W * 0.12, cy + H * 0.14, cx - W * 0.20, cy + H * 0.10, cx - W * 0.18, cy + H * 0.06);

                ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.shadowBlur = 0;

                // Cervical groove

                ctx.beginPath(); ctx.moveTo(cx - W * 0.04, cy - H * 0.13);

                ctx.quadraticCurveTo(cx - W * 0.06, cy, cx - W * 0.04, cy + H * 0.13);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;

                // Carapace texture

                ctx.globalAlpha = 0.06;

                for (var ct = 0; ct < 30; ct++) {

                  ctx.beginPath(); ctx.arc(cx - W * 0.12 + (ct % 6) * W * 0.04, cy - H * 0.10 + Math.floor(ct / 6) * H * 0.04, 1.5, 0, Math.PI * 2);

                  ctx.fillStyle = '#000'; ctx.fill();

                }

                ctx.globalAlpha = 1;

                // â”€â”€ Rostrum â”€â”€

                ctx.beginPath(); ctx.moveTo(cx - W * 0.18, cy - H * 0.04);

                ctx.lineTo(cx - W * 0.26, cy); ctx.lineTo(cx - W * 0.18, cy + H * 0.04);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();

                // â”€â”€ Compound eyes â”€â”€

                ctx.beginPath(); ctx.moveTo(cx - W * 0.18, cy - H * 0.06);

                ctx.lineTo(cx - W * 0.22, cy - H * 0.10);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.beginPath(); ctx.arc(cx - W * 0.22, cy - H * 0.10, 3.5, 0, Math.PI * 2);

                ctx.fillStyle = '#1a1a1a'; ctx.fill();

                ctx.beginPath(); ctx.arc(cx - W * 0.218, cy - H * 0.105, 1.2, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();

                ctx.beginPath(); ctx.moveTo(cx - W * 0.18, cy + H * 0.06);

                ctx.lineTo(cx - W * 0.22, cy + H * 0.10);

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.5; ctx.stroke();

                ctx.beginPath(); ctx.arc(cx - W * 0.22, cy + H * 0.10, 3.5, 0, Math.PI * 2);

                ctx.fillStyle = '#1a1a1a'; ctx.fill();

                // â”€â”€ Antennae â”€â”€

                ctx.strokeStyle = layerStroke; ctx.lineWidth = 1;

                ctx.beginPath(); ctx.moveTo(cx - W * 0.20, cy - H * 0.08);

                ctx.bezierCurveTo(cx - W * 0.28, cy - H * 0.14, cx - W * 0.30, cy - H * 0.08, cx - W * 0.34, cy - H * 0.10);

                ctx.stroke();

                ctx.beginPath(); ctx.moveTo(cx - W * 0.20, cy + H * 0.08);

                ctx.bezierCurveTo(cx - W * 0.28, cy + H * 0.14, cx - W * 0.30, cy + H * 0.08, cx - W * 0.34, cy + H * 0.10);

                ctx.stroke();

                ctx.lineWidth = 0.6;

                ctx.beginPath(); ctx.moveTo(cx - W * 0.22, cy - H * 0.04);

                ctx.lineTo(cx - W * 0.28, cy - H * 0.06); ctx.stroke();

                ctx.beginPath(); ctx.moveTo(cx - W * 0.22, cy + H * 0.04);

                ctx.lineTo(cx - W * 0.28, cy + H * 0.06); ctx.stroke();

                // â”€â”€ Abdomen â”€â”€

                for (var seg = 0; seg < 6; seg++) {

                  var segX = cx + W * 0.12 + seg * W * 0.035;

                  var segH2 = H * (0.10 - seg * 0.008);

                  ctx.beginPath(); ctx.rect(segX, cy - segH2, W * 0.035, segH2 * 2);

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                }

                // â”€â”€ Telson + Uropods â”€â”€

                var tailX = cx + W * 0.33;

                ctx.beginPath(); ctx.moveTo(tailX, cy - H * 0.04);

                ctx.lineTo(tailX + W * 0.06, cy); ctx.lineTo(tailX, cy + H * 0.04); ctx.closePath();

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.8; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(tailX, cy - H * 0.04);

                ctx.bezierCurveTo(tailX + W * 0.03, cy - H * 0.10, tailX + W * 0.06, cy - H * 0.08, tailX + W * 0.05, cy - H * 0.02);

                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.6; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.stroke(); ctx.globalAlpha = 1;

                ctx.beginPath(); ctx.moveTo(tailX, cy + H * 0.04);

                ctx.bezierCurveTo(tailX + W * 0.03, cy + H * 0.10, tailX + W * 0.06, cy + H * 0.08, tailX + W * 0.05, cy + H * 0.02);

                ctx.fillStyle = layerColor; ctx.globalAlpha = 0.6; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.stroke(); ctx.globalAlpha = 1;

                // â”€â”€ Chelipeds (claws) â”€â”€

                [-1, 1].forEach(function (s) {

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.14, cy + s * H * 0.10);

                  ctx.lineTo(cx - W * 0.22, cy + s * H * 0.16);

                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.22, cy + s * H * 0.16);

                  ctx.lineTo(cx - W * 0.28, cy + s * H * 0.20);

                  ctx.strokeStyle = layerStroke; ctx.lineWidth = 2.5; ctx.stroke();

                  // Pincer

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.28, cy + s * H * 0.20);

                  ctx.bezierCurveTo(cx - W * 0.32, cy + s * H * 0.18, cx - W * 0.34, cy + s * H * 0.19, cx - W * 0.34, cy + s * H * 0.20);

                  ctx.bezierCurveTo(cx - W * 0.34, cy + s * H * 0.21, cx - W * 0.32, cy + s * H * 0.22, cx - W * 0.28, cy + s * H * 0.20);

                  ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 1; ctx.stroke();

                });

                // â”€â”€ Walking legs (4 pairs) â”€â”€

                for (var wl = 0; wl < 4; wl++) {

                  [-1, 1].forEach(function (s) {

                    var lx = cx - W * 0.04 + wl * W * 0.04;

                    ctx.beginPath(); ctx.moveTo(lx, cy + s * H * 0.12);

                    ctx.lineTo(lx - W * 0.02, cy + s * H * 0.20);

                    ctx.lineTo(lx - W * 0.04, cy + s * H * 0.26);

                    ctx.strokeStyle = layerStroke; ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.stroke();

                    ctx.beginPath(); ctx.arc(lx - W * 0.02, cy + s * H * 0.20, 1.5, 0, Math.PI * 2);

                    ctx.fillStyle = layerStroke; ctx.fill();

                  });

                }

                // â”€â”€ Swimmerets â”€â”€

                ctx.globalAlpha = 0.3;

                for (var sw = 0; sw < 5; sw++) {

                  var swx = cx + W * 0.14 + sw * W * 0.035;

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(swx, cy + s * H * 0.04);

                    ctx.lineTo(swx + W * 0.01, cy + s * H * 0.08);

                    ctx.strokeStyle = layerStroke; ctx.lineWidth = 0.6; ctx.stroke();

                  });

                }

                ctx.globalAlpha = 1;

                // â”€â”€ Layer overlays â”€â”€

                if (activeLayer === 'organs') {

                  ctx.globalAlpha = 0.5;

                  ctx.beginPath(); ctx.arc(cx + W * 0.04, cy, W * 0.02, 0, Math.PI * 2);

                  ctx.fillStyle = '#dc2626'; ctx.fill();

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.02, cy, W * 0.05, H * 0.06, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  ctx.beginPath(); ctx.arc(cx - W * 0.10, cy, W * 0.018, 0, Math.PI * 2);

                  ctx.fillStyle = '#fde68a'; ctx.fill();

                  for (var cg = 0; cg < 3; cg++) {

                    ctx.beginPath(); ctx.ellipse(cx + W * 0.06, cy + (cg - 1) * H * 0.04, W * 0.015, H * 0.02, 0, 0, Math.PI * 2);

                    ctx.fillStyle = '#fca5a5'; ctx.fill();

                  }

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.02, cy);

                  ctx.lineTo(cx + W * 0.32, cy);

                  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 1.5; ctx.stroke();

                  ctx.globalAlpha = 1;

                }

                if (activeLayer === 'nervous') {

                  ctx.globalAlpha = 0.6;

                  ctx.beginPath(); ctx.arc(cx - W * 0.14, cy, W * 0.018, 0, Math.PI * 2);

                  ctx.fillStyle = '#fbbf24'; ctx.fill();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.12, cy);

                  ctx.lineTo(cx + W * 0.32, cy);

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();

                  for (var ng = 0; ng < 8; ng++) {

                    ctx.beginPath(); ctx.arc(cx - W * 0.10 + ng * W * 0.05, cy, 3, 0, Math.PI * 2);

                    ctx.fillStyle = '#f59e0b'; ctx.fill();

                  }

                  ctx.globalAlpha = 1;

                }





              } else if (spec.bodyShape === 'eye') {

                // Sheep eye â€” cross-section

                ctx.beginPath(); ctx.arc(cx, cy, W * 0.30, 0, Math.PI * 2);

                ctx.fillStyle = '#f1f5f9'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.stroke();

                ctx.shadowBlur = 0;

                // Choroid (dark inner layer)

                ctx.beginPath(); ctx.arc(cx, cy, W * 0.27, 0, Math.PI * 2);

                ctx.fillStyle = '#1e1b4b'; ctx.fill();

                // Retina (inner)

                ctx.beginPath(); ctx.arc(cx, cy, W * 0.25, 0, Math.PI * 2);

                ctx.fillStyle = '#fef3c7'; ctx.fill();

                // Vitreous humor (clear)

                ctx.beginPath(); ctx.arc(cx, cy, W * 0.23, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(219,234,254,0.5)'; ctx.fill();

                // Lens

                ctx.beginPath(); ctx.ellipse(cx - W * 0.12, cy, W * 0.06, H * 0.10, 0, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill(); ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1.5; ctx.stroke();

                // Cornea (front bulge)

                ctx.beginPath(); ctx.arc(cx - W * 0.28, cy, W * 0.08, -Math.PI * 0.4, Math.PI * 0.4);

                ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2.5; ctx.stroke();

                // Iris

                ctx.beginPath(); ctx.arc(cx - W * 0.16, cy, H * 0.08, 0, Math.PI * 2);

                ctx.fillStyle = '#7c3aed'; ctx.globalAlpha = 0.6; ctx.fill(); ctx.globalAlpha = 1;

                ctx.beginPath(); ctx.arc(cx - W * 0.16, cy, H * 0.03, 0, Math.PI * 2);

                ctx.fillStyle = '#0f172a'; ctx.fill(); // pupil

                // Optic nerve with myelin sheath

                ctx.beginPath(); ctx.moveTo(cx + W * 0.30, cy);

                ctx.lineTo(cx + W * 0.38, cy + H * 0.05);

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 6; ctx.stroke();

                ctx.beginPath(); ctx.moveTo(cx + W * 0.30, cy);

                ctx.lineTo(cx + W * 0.38, cy + H * 0.05);

                ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3; ctx.stroke();

                // Blood vessels on retina

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.4;

                ctx.beginPath(); ctx.moveTo(cx + W * 0.10, cy);

                ctx.quadraticCurveTo(cx + W * 0.05, cy - H * 0.10, cx - W * 0.05, cy - H * 0.12); ctx.stroke();

                ctx.beginPath(); ctx.moveTo(cx + W * 0.10, cy);

                ctx.quadraticCurveTo(cx + W * 0.05, cy + H * 0.08, cx - W * 0.05, cy + H * 0.10); ctx.stroke();

                ctx.globalAlpha = 1;

                // Tapetum reflection

                ctx.beginPath(); ctx.arc(cx + W * 0.10, cy, W * 0.08, -0.5, 0.5);

                ctx.strokeStyle = 'rgba(34,211,238,0.3)'; ctx.lineWidth = 8; ctx.stroke();

                // Animated light refraction ray

                var rayPhase = (dissTick * 0.02) % (Math.PI * 2);

                var rayAlpha = 0.3 + Math.sin(rayPhase) * 0.15;

                ctx.globalAlpha = rayAlpha;

                // Incoming ray

                ctx.beginPath(); ctx.moveTo(cx - W * 0.45, cy - H * 0.08);

                ctx.lineTo(cx - W * 0.28, cy); // hits cornea

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();

                // Ray through cornea â†’ aqueous humor â†’ lens (bends)

                ctx.beginPath(); ctx.moveTo(cx - W * 0.28, cy);

                ctx.quadraticCurveTo(cx - W * 0.20, cy + H * 0.01, cx - W * 0.12, cy); // through pupil/lens

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();

                // Ray through vitreous â†’ hits retina (converges)

                ctx.beginPath(); ctx.moveTo(cx - W * 0.12, cy);

                ctx.lineTo(cx + W * 0.10, cy + H * 0.02); // focal point on retina

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke();

                // Focal point glow

                ctx.beginPath(); ctx.arc(cx + W * 0.10, cy + H * 0.02, 4, 0, Math.PI * 2);

                var focalGrad = ctx.createRadialGradient(cx + W * 0.10, cy + H * 0.02, 0, cx + W * 0.10, cy + H * 0.02, 4);

                focalGrad.addColorStop(0, 'rgba(251,191,36,0.8)');

                focalGrad.addColorStop(1, 'rgba(251,191,36,0)');

                ctx.fillStyle = focalGrad; ctx.fill();

                // Ray label

                ctx.font = '8px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                ctx.fillText('Light Ray', cx - W * 0.44, cy - H * 0.10);

                ctx.globalAlpha = 1;

                // Aqueous humor label

                ctx.font = '7px Inter, system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.25)';

                ctx.fillText('Aqueous Humor', cx - W * 0.24, cy + H * 0.06);

                ctx.fillText('Vitreous Humor', cx - W * 0.05, cy + H * 0.10);

                // Ciliary body

                ctx.beginPath(); ctx.arc(cx - W * 0.14, cy - H * 0.08, W * 0.015, 0, Math.PI);

                ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1; ctx.stroke();

                ctx.beginPath(); ctx.arc(cx - W * 0.14, cy + H * 0.08, W * 0.015, Math.PI, Math.PI * 2);

                ctx.strokeStyle = '#a78bfa'; ctx.stroke();

                ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillText('Ciliary Body', cx - W * 0.18, cy - H * 0.11);

                // Suspensory ligaments (zonules)

                ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 0.4;

                for (var zl = 0; zl < 6; zl++) {

                  var za = -0.5 + zl * 0.2;

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.14 + Math.cos(za) * W * 0.015, cy + Math.sin(za) * H * 0.08);

                  ctx.lineTo(cx - W * 0.12 + Math.cos(za) * W * 0.04, cy + Math.sin(za) * H * 0.06);

                  ctx.stroke();

                }

                // Fovea centralis (center of macula)

                ctx.beginPath(); ctx.arc(cx + W * 0.10, cy, 2.5, 0, Math.PI * 2);

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.stroke();

                ctx.fillStyle = 'rgba(251,191,36,0.3)'; ctx.fillText('Fovea', cx + W * 0.12, cy - H * 0.02);

                // Blind spot (optic disc)

                ctx.beginPath(); ctx.arc(cx + W * 0.18, cy + H * 0.03, 3, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(251,191,36,0.4)'; ctx.fill();

                ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillText('Optic Disc', cx + W * 0.20, cy + H * 0.02);

                // Iris sphincter muscle detail

                ctx.globalAlpha = 0.15;

                for (var ism = 0; ism < 12; ism++) {

                  var ismA = (ism / 12) * Math.PI * 2;

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.24 + Math.cos(ismA) * W * 0.06, cy + Math.sin(ismA) * H * 0.04);

                  ctx.lineTo(cx - W * 0.24 + Math.cos(ismA) * W * 0.08, cy + Math.sin(ismA) * H * 0.06);

                  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 0.5; ctx.stroke();

                }

                ctx.globalAlpha = 1;

                // Macula lutea region

                ctx.beginPath(); ctx.ellipse(cx + W * 0.10, cy, W * 0.03, H * 0.02, 0, 0, Math.PI * 2);

                ctx.strokeStyle = 'rgba(251,191,36,0.2)'; ctx.lineWidth = 0.5; ctx.stroke();

                ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillText('Macula', cx + W * 0.12, cy + H * 0.03);

                // Rod and cone cell detail on retina

                ctx.globalAlpha = 0.15;

                for (var rc = 0; rc < 20; rc++) {

                  var rcAngle = Math.PI * 0.65 + rc * Math.PI * 0.02;

                  var rcR = W * 0.28;

                  var rcx = cx + Math.cos(rcAngle) * rcR;

                  var rcy = cy + Math.sin(rcAngle) * rcR;

                  ctx.beginPath();

                  if (rc % 3 === 0) {

                    // Cone cell (triangle shape)

                    ctx.moveTo(rcx, rcy - 1.5); ctx.lineTo(rcx - 1, rcy + 1.5); ctx.lineTo(rcx + 1, rcy + 1.5); ctx.closePath();

                    ctx.fillStyle = '#3b82f6'; ctx.fill();

                  } else {

                    // Rod cell (rectangle shape)

                    ctx.fillStyle = '#94a3b8';

                    ctx.fillRect(rcx - 0.5, rcy - 2, 1, 4);

                  }

                }

                ctx.globalAlpha = 1;

                ctx.font = '5px Inter, system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.15)';

                ctx.fillText('Rods', cx + W * 0.22, cy - H * 0.14);

                ctx.fillStyle = 'rgba(59,130,246,0.15)';

                ctx.fillText('Cones', cx + W * 0.22, cy - H * 0.12);

              } else if (spec.bodyShape === 'heart') {

                // Sheep heart â€” anatomical shape with beating animation

                var heartPhase = (dissTick * 0.04) % (Math.PI * 2);

                var systole = Math.max(0, Math.sin(heartPhase));

                var heartScale = 1 + systole * 0.03;

                ctx.save();

                ctx.translate(cx, cy);

                ctx.scale(heartScale, heartScale);

                ctx.translate(-cx, -cy);

                ctx.beginPath();

                ctx.moveTo(cx, cy - H * 0.25);

                ctx.quadraticCurveTo(cx - W * 0.22, cy - H * 0.30, cx - W * 0.25, cy - H * 0.10);

                ctx.quadraticCurveTo(cx - W * 0.26, cy + H * 0.05, cx - W * 0.15, cy + H * 0.18);

                ctx.quadraticCurveTo(cx - W * 0.05, cy + H * 0.30, cx, cy + H * 0.28);

                ctx.quadraticCurveTo(cx + W * 0.05, cy + H * 0.30, cx + W * 0.15, cy + H * 0.18);

                ctx.quadraticCurveTo(cx + W * 0.26, cy + H * 0.05, cx + W * 0.25, cy - H * 0.10);

                ctx.quadraticCurveTo(cx + W * 0.22, cy - H * 0.30, cx, cy - H * 0.25);

                ctx.fillStyle = layerColor; ctx.fill(); ctx.strokeStyle = layerStroke; ctx.lineWidth = 2; ctx.stroke();

                ctx.shadowBlur = 0;

                // Septum line

                ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.20); ctx.lineTo(cx, cy + H * 0.25);

                ctx.strokeStyle = layerStroke; ctx.globalAlpha = 0.3; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;

                // Great vessels stubs

                ctx.beginPath(); ctx.moveTo(cx - W * 0.08, cy - H * 0.25); ctx.lineTo(cx - W * 0.10, cy - H * 0.35);

                ctx.lineTo(cx - W * 0.04, cy - H * 0.35); ctx.closePath();

                ctx.fillStyle = '#ef4444'; ctx.fill(); // aorta stub

                ctx.beginPath(); ctx.moveTo(cx + W * 0.08, cy - H * 0.25); ctx.lineTo(cx + W * 0.10, cy - H * 0.35);

                ctx.lineTo(cx + W * 0.04, cy - H * 0.35); ctx.closePath();

                ctx.fillStyle = '#3b82f6'; ctx.fill(); // pulm trunk stub

                // Left coronary artery (LAD)

                ctx.beginPath(); ctx.moveTo(cx - W * 0.06, cy - H * 0.18);

                ctx.quadraticCurveTo(cx - W * 0.15, cy, cx - W * 0.10, cy + H * 0.15);

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7; ctx.stroke();

                // Right coronary artery

                ctx.beginPath(); ctx.moveTo(cx + W * 0.06, cy - H * 0.18);

                ctx.quadraticCurveTo(cx + W * 0.18, cy - H * 0.05, cx + W * 0.12, cy + H * 0.10);

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.stroke();

                // Coronary sinus (venous drainage)

                ctx.beginPath(); ctx.moveTo(cx - W * 0.12, cy + H * 0.12);

                ctx.quadraticCurveTo(cx, cy + H * 0.18, cx + W * 0.10, cy + H * 0.12);

                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.stroke();

                // Pericardium outline (outer membrane)

                ctx.beginPath();

                ctx.ellipse(cx, cy, W * 0.28, H * 0.30, 0, 0, Math.PI * 2);

                ctx.strokeStyle = 'rgba(148,163,184,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

                ctx.globalAlpha = 1;

                // ECG waveform display (bottom of canvas)

                var ecgY = H - 35; var ecgW = W * 0.6; var ecgX = (W - ecgW) / 2;

                ctx.fillStyle = 'rgba(15,23,42,0.7)';

                ctx.fillRect(ecgX - 5, ecgY - 20, ecgW + 10, 35);

                ctx.strokeStyle = 'rgba(34,197,94,0.15)'; ctx.lineWidth = 0.3;

                // Grid lines

                for (var eg = 0; eg < 6; eg++) { ctx.beginPath(); ctx.moveTo(ecgX, ecgY - 15 + eg * 5); ctx.lineTo(ecgX + ecgW, ecgY - 15 + eg * 5); ctx.stroke(); }

                // ECG trace

                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5; ctx.beginPath();

                for (var ep = 0; ep < ecgW; ep++) {

                  var et = ((ep + dissTick * 2) % ecgW) / ecgW;

                  var ey = ecgY;

                  // P wave

                  if (et > 0.05 && et < 0.15) ey -= Math.sin((et - 0.05) * 10 * Math.PI) * 4;

                  // QRS complex

                  else if (et > 0.20 && et < 0.22) ey += (et - 0.20) * 200;

                  else if (et > 0.22 && et < 0.26) ey -= 15 - (et - 0.22) * 375;

                  else if (et > 0.26 && et < 0.28) ey += (et - 0.26) * 150;

                  // T wave

                  else if (et > 0.35 && et < 0.50) ey -= Math.sin((et - 0.35) * 6.67 * Math.PI) * 5;

                  ep === 0 ? ctx.moveTo(ecgX + ep, ey) : ctx.lineTo(ecgX + ep, ey);

                }

                ctx.stroke();

                // BPM display

                var bpm = 72 + Math.floor(Math.sin(dissTick * 0.02) * 5);

                ctx.font = 'bold 10px Inter, system-ui'; ctx.fillStyle = '#22c55e';

                ctx.fillText(bpm + ' BPM', ecgX + ecgW + 8, ecgY);

                ctx.font = '6px Inter, system-ui'; ctx.fillStyle = 'rgba(34,197,94,0.5)';

                ctx.fillText('P', ecgX + ecgW * 0.10, ecgY - 18); ctx.fillText('QRS', ecgX + ecgW * 0.23, ecgY - 18); ctx.fillText('T', ecgX + ecgW * 0.42, ecgY - 18);

                // Chamber shading (left side thicker wall)

                ctx.beginPath();

                ctx.moveTo(cx - W * 0.04, cy - H * 0.15);

                ctx.quadraticCurveTo(cx - W * 0.20, cy, cx - W * 0.10, cy + H * 0.20);

                ctx.strokeStyle = 'rgba(239,68,68,0.15)'; ctx.lineWidth = 12; ctx.stroke();

                // Right side (thinner wall)

                ctx.beginPath();

                ctx.moveTo(cx + W * 0.04, cy - H * 0.15);

                ctx.quadraticCurveTo(cx + W * 0.18, cy, cx + W * 0.10, cy + H * 0.18);

                ctx.strokeStyle = 'rgba(59,130,246,0.12)'; ctx.lineWidth = 8; ctx.stroke();

                ctx.restore(); // End heartbeat scale

                // Conduction system animation

                if (activeLayer === 'nervous' || activeLayer === 'conduction') {

                  ctx.globalAlpha = 0.7;

                  var condPhase = (dissTick * 0.03) % 1;

                  // SA Node (pacemaker)

                  var saGlow = Math.max(0, Math.sin(condPhase * Math.PI * 2));

                  ctx.beginPath(); ctx.arc(cx + W * 0.12, cy - H * 0.14, 5 + saGlow * 3, 0, Math.PI * 2);

                  var saGrad = ctx.createRadialGradient(cx + W * 0.12, cy - H * 0.14, 0, cx + W * 0.12, cy - H * 0.14, 5 + saGlow * 3);

                  saGrad.addColorStop(0, 'rgba(251,191,36,' + (0.5 + saGlow * 0.5) + ')');

                  saGrad.addColorStop(1, 'rgba(251,191,36,0)');

                  ctx.fillStyle = saGrad; ctx.fill();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#fbbf24'; ctx.fillText('SA Node', cx + W * 0.13, cy - H * 0.18);

                  // AV Node

                  var avDelay = Math.max(0, Math.sin((condPhase - 0.15) * Math.PI * 2));

                  ctx.beginPath(); ctx.arc(cx, cy - H * 0.04, 4 + avDelay * 2, 0, Math.PI * 2);

                  var avGrad = ctx.createRadialGradient(cx, cy - H * 0.04, 0, cx, cy - H * 0.04, 4 + avDelay * 2);

                  avGrad.addColorStop(0, 'rgba(34,197,94,' + (0.4 + avDelay * 0.5) + ')');

                  avGrad.addColorStop(1, 'rgba(34,197,94,0)');

                  ctx.fillStyle = avGrad; ctx.fill();

                  ctx.fillStyle = '#22c55e'; ctx.fillText('AV Node', cx + W * 0.02, cy - H * 0.06);

                  // Bundle of His

                  var hisPhase = Math.max(0, Math.sin((condPhase - 0.3) * Math.PI * 2));

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.02); ctx.lineTo(cx, cy + H * 0.06);

                  ctx.strokeStyle = 'rgba(59,130,246,' + (0.3 + hisPhase * 0.5) + ')'; ctx.lineWidth = 2; ctx.stroke();

                  ctx.fillStyle = '#3b82f6'; ctx.fillText('Bundle of His', cx + W * 0.02, cy + H * 0.02);

                  // Left and right bundle branches

                  ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.06);

                  ctx.lineTo(cx - W * 0.08, cy + H * 0.18);

                  ctx.strokeStyle = 'rgba(59,130,246,' + (0.2 + hisPhase * 0.4) + ')'; ctx.lineWidth = 1.5; ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.06);

                  ctx.lineTo(cx + W * 0.06, cy + H * 0.16);

                  ctx.stroke();

                  // Purkinje fibers (fan out in ventricles)

                  var purkPhase = Math.max(0, Math.sin((condPhase - 0.5) * Math.PI * 2));

                  ctx.strokeStyle = 'rgba(168,85,247,' + (0.2 + purkPhase * 0.4) + ')'; ctx.lineWidth = 0.8;

                  for (var pk = 0; pk < 5; pk++) {

                    ctx.beginPath(); ctx.moveTo(cx - W * 0.08, cy + H * 0.18);

                    ctx.lineTo(cx - W * 0.12 + pk * W * 0.02, cy + H * 0.22 + pk * H * 0.01);

                    ctx.stroke();

                    ctx.beginPath(); ctx.moveTo(cx + W * 0.06, cy + H * 0.16);

                    ctx.lineTo(cx + W * 0.02 + pk * W * 0.02, cy + H * 0.20 + pk * H * 0.01);

                    ctx.stroke();

                  }

                  ctx.fillStyle = '#a855f7'; ctx.fillText('Purkinje Fibers', cx - W * 0.14, cy + H * 0.24);

                  // Signal propagation indicator

                  var sigY = cy - H * 0.14 + condPhase * H * 0.38;

                  ctx.beginPath(); ctx.arc(cx, sigY, 3, 0, Math.PI * 2);

                  ctx.fillStyle = 'rgba(251,191,36,0.8)'; ctx.fill();

                  ctx.globalAlpha = 1;

                }

                // Internal chambers when on interior/chambers layer

                if (activeLayer === 'chambers' || activeLayer === 'interior') {

                  ctx.globalAlpha = 0.4;

                  // Left atrium

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.10, cy - H * 0.10, W * 0.08, H * 0.06, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#dc2626'; ctx.fill();

                  ctx.font = '8px Inter'; ctx.fillStyle = '#ffffff'; ctx.fillText('LA', cx - W * 0.11, cy - H * 0.09);

                  // Right atrium

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.10, cy - H * 0.10, W * 0.08, H * 0.06, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#3b82f6'; ctx.fill();

                  ctx.fillStyle = '#ffffff'; ctx.fillText('RA', cx + W * 0.09, cy - H * 0.09);

                  // Left ventricle (thicker wall)

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.08, cy + H * 0.08, W * 0.10, H * 0.10, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#b91c1c'; ctx.fill();

                  ctx.fillStyle = '#ffffff'; ctx.fillText('LV', cx - W * 0.09, cy + H * 0.09);

                  // Right ventricle (thinner wall)

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.08, cy + H * 0.08, W * 0.08, H * 0.08, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#2563eb'; ctx.fill();

                  ctx.fillStyle = '#ffffff'; ctx.fillText('RV', cx + W * 0.07, cy + H * 0.09);

                  // Valve lines

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;

                  // Mitral valve

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.15, cy - H * 0.02); ctx.lineTo(cx - W * 0.04, cy - H * 0.02); ctx.stroke();

                  ctx.font = '6px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  // Animated valve movement

                  var valveOpen = Math.sin(dissTick * 0.05);

                  var vOff = Math.max(0, valveOpen) * 3;

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.10, cy - H * 0.02 - vOff); ctx.lineTo(cx - W * 0.10, cy - H * 0.02 + vOff);

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();

                  ctx.fillText('Mitral' + (valveOpen > 0 ? ' ' + 'Open' : ' ' + 'Closed'), cx - W * 0.14, cy - H * 0.035);

                  // Tricuspid valve

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.04, cy - H * 0.02); ctx.lineTo(cx + W * 0.15, cy - H * 0.02); ctx.stroke();

                  ctx.fillText('Tricuspid', cx + W * 0.05, cy - H * 0.035);

                  // Semilunar valves (above ventricles)

                  ctx.beginPath(); ctx.arc(cx - W * 0.08, cy - H * 0.05, 3, 0, Math.PI); ctx.stroke();

                  ctx.fillText('Aortic', cx - W * 0.10, cy - H * 0.07);

                  ctx.beginPath(); ctx.arc(cx + W * 0.06, cy - H * 0.05, 3, 0, Math.PI); ctx.stroke();

                  ctx.fillText('Pulmonary', cx + W * 0.04, cy - H * 0.07);

                  // Papillary muscles (bumps on ventricle walls)

                  ctx.globalAlpha = 0.4;

                  ctx.beginPath(); ctx.ellipse(cx - W * 0.10, cy + H * 0.12, W * 0.008, H * 0.015, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#ef4444'; ctx.fill();

                  ctx.beginPath(); ctx.ellipse(cx + W * 0.08, cy + H * 0.10, W * 0.006, H * 0.012, 0, 0, Math.PI * 2);

                  ctx.fillStyle = '#ef4444'; ctx.fill();

                  // Chordae tendinae (strings connecting papillary to valves)

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 0.4;

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.10, cy + H * 0.105);

                  ctx.lineTo(cx - W * 0.08, cy - H * 0.02); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.10, cy + H * 0.105);

                  ctx.lineTo(cx - W * 0.06, cy - H * 0.02); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.08, cy + H * 0.088);

                  ctx.lineTo(cx + W * 0.06, cy - H * 0.02); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.08, cy + H * 0.088);

                  ctx.lineTo(cx + W * 0.10, cy - H * 0.02); ctx.stroke();

                  ctx.globalAlpha = 0.35;

                  ctx.font = '5px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  ctx.fillText('Chordae', cx - W * 0.14, cy + H * 0.08);

                  ctx.fillText('Papillary', cx - W * 0.14, cy + H * 0.14);

                  ctx.globalAlpha = 0.5;

                  ctx.globalAlpha = 1;

                  // Animated blood flow through chambers

                  ctx.setLineDash([3, 5]); ctx.lineDashOffset = -dissTick * 0.4;

                  ctx.globalAlpha = 0.6;

                  // Deoxygenated flow: RA â†’ RV â†’ lungs

                  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.2;

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.10, cy - H * 0.16);

                  ctx.lineTo(cx + W * 0.10, cy - H * 0.03);

                  ctx.lineTo(cx + W * 0.08, cy + H * 0.05); ctx.stroke();

                  // Oxygenated flow: LA â†’ LV â†’ body

                  ctx.strokeStyle = '#ef4444';

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.10, cy - H * 0.16);

                  ctx.lineTo(cx - W * 0.10, cy - H * 0.03);

                  ctx.lineTo(cx - W * 0.08, cy + H * 0.05); ctx.stroke();

                  ctx.setLineDash([]); ctx.lineDashOffset = 0;

                  ctx.globalAlpha = 1;

                }

              }



              ctx.restore();



              // ── Animated incision line overlay ──
              var _incisionAnim = d._incisionAnim;
              if (_incisionAnim && _incisionAnim.active) {
                var incElapsed = (Date.now() - _incisionAnim.startTick) / 500;
                if (incElapsed <= 1) {
                  ctx.save();
                  ctx.globalAlpha = 0.9;
                  ctx.strokeStyle = '#f8fafc';
                  ctx.lineWidth = 2;
                  ctx.shadowColor = '#fbbf24';
                  ctx.shadowBlur = 8;
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

              // ── Draw organ pins ──

              organs.forEach(function (org, oi) {

                var px = org.x * W, py = org.y * H;

                var isSel = d.selectedOrgan === org.id;

                var isHov = !isSel && d.hoveredOrgan === org.id;

                var pulse = isSel ? 1 + Math.sin(dissTick * 0.06) * 0.3 : 1;

                // Outer glow

                if (isSel) {

                  ctx.beginPath(); ctx.arc(px, py, 18 * pulse, 0, Math.PI * 2);

                  var glowGrad = ctx.createRadialGradient(px, py, 4, px, py, 18 * pulse);

                  glowGrad.addColorStop(0, 'rgba(251,191,36,0.4)');

                  glowGrad.addColorStop(1, 'rgba(251,191,36,0)');

                  ctx.fillStyle = glowGrad; ctx.fill();

                }

                // Pin dot with system color

                var sysCol = layerStroke || '#94a3b8';

                ctx.beginPath(); ctx.arc(px, py, 5 * pulse, 0, Math.PI * 2);

                var pinGrad = ctx.createRadialGradient(px - 1, py - 1, 1, px, py, 5 * pulse);

                pinGrad.addColorStop(0, isSel ? '#fef08a' : isHov ? '#bfdbfe' : '#ffffff');

                pinGrad.addColorStop(1, isSel ? '#f59e0b' : isHov ? '#3b82f6' : sysCol);

                ctx.fillStyle = pinGrad; ctx.fill();

                ctx.strokeStyle = isSel ? '#f59e0b' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();

                // Selection/hover ring

                if (isSel) { ctx.beginPath(); ctx.arc(px, py, 12 * pulse, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(251,191,36,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }

                if (isHov) { ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(59,130,246,0.5)'; ctx.lineWidth = 1.5; ctx.stroke(); }

                ctx.font = '10px Inter, system-ui, sans-serif';

                var tw = ctx.measureText(org.name).width + 10;

                var lx = px + 12, ly = py - 8;

                if (lx + tw > W - 10) lx = px - tw - 12;

                ctx.beginPath(); ctx.moveTo(px + 6, py); ctx.lineTo(lx, ly + 6);

                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.setLineDash([2, 2]); ctx.lineWidth = 0.8; ctx.stroke(); ctx.setLineDash([]);

                if (d.labelMode !== 'hidden' || isSel) {

                  ctx.fillStyle = isSel ? 'rgba(251,191,36,0.9)' : 'rgba(30,41,59,0.85)';

                  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(lx, ly, tw, 16, 4); ctx.fill(); } else { ctx.fillRect(lx, ly, tw, 16); }

                  ctx.strokeStyle = isSel ? '#f59e0b' : 'rgba(148,163,184,0.4)'; ctx.lineWidth = 0.6; ctx.stroke();

                  ctx.fillStyle = isSel ? '#1e293b' : '#e2e8f0'; ctx.fillText(org.name, lx + 5, ly + 11.5);

                } else {

                  // Hidden mode: show numbered markers instead of names

                  var markerNum = String(oi + 1);

                  ctx.fillStyle = 'rgba(30,41,59,0.7)';

                  ctx.beginPath(); ctx.arc(lx + 8, ly + 8, 8, 0, Math.PI * 2); ctx.fill();

                  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px Inter, system-ui';

                  ctx.fillText(markerNum, lx + 8 - ctx.measureText(markerNum).width / 2, ly + 11);

                  ctx.font = '10px Inter, system-ui, sans-serif';

                }

              });

              // Layer label

              var activeLayerDef = spec.layers[currentLayerIdx];

              if (activeLayerDef) { ctx.font = 'bold 13px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText(activeLayerDef.icon + ' ' + activeLayerDef.name + ' Layer', 14, H - 14); }

              // Annotation drawing overlay

              if (d.annotations && d.annotations.length > 0) {

                ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 2; ctx.lineCap = 'round';

                d.annotations.forEach(function (ann) {

                  if (ann.prevX !== undefined) {

                    ctx.beginPath(); ctx.moveTo(ann.prevX, ann.prevY);

                    ctx.lineTo(ann.x, ann.y); ctx.stroke();

                  }

                  ctx.beginPath(); ctx.arc(ann.x, ann.y, 2, 0, Math.PI * 2);

                  ctx.fillStyle = '#ec4899'; ctx.fill();

                });

              }

              // Clear annotations button hint

              if (d.annotateMode && d.annotations && d.annotations.length > 0) {

                ctx.font = '8px Inter, system-ui'; ctx.fillStyle = 'rgba(236,72,153,0.6)';

                ctx.fillText('Double-click to clear', 10, H - 5);

              }

              // Ruler tool overlay

              if (d.rulerMode && d.rulerStart && d.rulerEnd) {

                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.setLineDash([]);

                ctx.beginPath(); ctx.moveTo(d.rulerStart.x, d.rulerStart.y);

                ctx.lineTo(d.rulerEnd.x, d.rulerEnd.y); ctx.stroke();

                // Endpoints

                ctx.beginPath(); ctx.arc(d.rulerStart.x, d.rulerStart.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#fbbf24'; ctx.fill();

                ctx.beginPath(); ctx.arc(d.rulerEnd.x, d.rulerEnd.y, 3, 0, Math.PI * 2); ctx.fill();

                // Distance

                var rdx = d.rulerEnd.x - d.rulerStart.x;

                var rdy = d.rulerEnd.y - d.rulerStart.y;

                var rDist = Math.sqrt(rdx * rdx + rdy * rdy);

                var rCm = (rDist / W * (spec.bodyShape === 'worm' ? 15 : spec.bodyShape === 'pig' ? 25 : spec.bodyShape === 'fish' ? 20 : spec.bodyShape === 'crayfish' ? 12 : spec.bodyShape === 'frog' ? 8 : 3)).toFixed(1);

                ctx.font = 'bold 10px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                ctx.fillText(rCm + ' cm', (d.rulerStart.x + d.rulerEnd.x) / 2 + 5, (d.rulerStart.y + d.rulerEnd.y) / 2 - 5);

              }

              // Scale bar

              ctx.fillStyle = 'rgba(255,255,255,0.25)';

              ctx.fillRect(W - 80, H - 18, 60, 2);

              ctx.font = '8px Inter, system-ui'; ctx.fillText('Scale Bar', W - 72, H - 7);

              // Endocrine system overlay

              if (d.showEndocrine) {

                ctx.globalAlpha = 0.6; ctx.font = '6px Inter, system-ui';

                var glands = [];

                if (spec.bodyShape === 'frog') {

                  glands = [

                    { name: 'pituitary', x: cx, y: cy - H * 0.24, hormone: 'GH, TSH, FSH', color: '#ec4899' },

                    { name: 'thyroid', x: cx - W * 0.03, y: cy - H * 0.18, hormone: 'T3, T4 (metabolism)', color: '#f472b6' },

                    { name: 'parathyroid', x: cx + W * 0.03, y: cy - H * 0.17, hormone: 'PTH (calcium)', color: '#fb7185' },

                    { name: 'adrenals', x: cx + W * 0.06, y: cy + H * 0.07, hormone: 'cortisol, adrenaline', color: '#fbbf24' },

                    { name: 'pancreas (islets)', x: cx + W * 0.04, y: cy - H * 0.02, hormone: 'insulin, glucagon', color: '#34d399' },

                    { name: 'gonads', x: cx, y: cy + H * 0.12, hormone: 'estrogen/testosterone', color: '#a78bfa' }

                  ];

                } else if (spec.bodyShape === 'pig') {

                  glands = [

                    { name: 'pituitary', x: cx - W * 0.26, y: cy - H * 0.06, hormone: 'master gland', color: '#ec4899' },

                    { name: 'thyroid', x: cx - W * 0.16, y: cy - H * 0.06, hormone: 'T3, T4', color: '#f472b6' },

                    { name: 'thymus', x: cx - W * 0.08, y: cy - H * 0.08, hormone: 'thymosin (immunity)', color: '#fbbf24' },

                    { name: 'adrenals', x: cx + W * 0.09, y: cy + H * 0.065, hormone: 'cortisol', color: '#fbbf24' },

                    { name: 'pancreas', x: cx + W * 0.02, y: cy + H * 0.04, hormone: 'insulin', color: '#34d399' }

                  ];

                }

                glands.forEach(function (gl) {

                  // Gland marker (pulsing circle)

                  var glPulse = 1 + Math.sin(dissTick * 0.04) * 0.2;

                  ctx.beginPath(); ctx.arc(gl.x, gl.y, 5 * glPulse, 0, Math.PI * 2);

                  var glGrad = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, 5 * glPulse);

                  glGrad.addColorStop(0, gl.color); glGrad.addColorStop(1, gl.color.slice(0, -1) + ',0)');

                  ctx.fillStyle = glGrad; ctx.fill();

                  // Hormone arrows radiating out

                  ctx.strokeStyle = gl.color; ctx.lineWidth = 0.5;

                  for (var ha = 0; ha < 4; ha++) {

                    var hAngle = ha * Math.PI / 2 + dissTick * 0.02;

                    var hLen = 8 + Math.sin(dissTick * 0.05 + ha) * 3;

                    ctx.beginPath(); ctx.moveTo(gl.x + Math.cos(hAngle) * 6, gl.y + Math.sin(hAngle) * 6);

                    ctx.lineTo(gl.x + Math.cos(hAngle) * hLen, gl.y + Math.sin(hAngle) * hLen);

                    ctx.stroke();

                  }

                  // Labels

                  ctx.fillStyle = gl.color;

                  ctx.fillText(gl.name, gl.x + 8, gl.y - 3);

                  ctx.fillStyle = 'rgba(255,255,255,0.35)';

                  ctx.fillText(gl.hormone, gl.x + 8, gl.y + 5);

                });

                ctx.globalAlpha = 1;

              }

              // Nervous system tracing overlay

              if (d.traceNervous) {

                ctx.setLineDash([3, 5]);

                ctx.lineDashOffset = -dissTick * 0.5;

                ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7;

                if (spec.bodyShape === 'frog') {

                  ctx.strokeStyle = '#a855f7';

                  // Brain â†’ spinal cord

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.25); // brain

                  ctx.lineTo(cx, cy + H * 0.10); // spinal cord

                  ctx.stroke();

                  // Cranial nerves radiating from brain

                  for (var cn = 0; cn < 5; cn++) {

                    var cnAngle = -1.2 + cn * 0.5;

                    ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.24);

                    ctx.lineTo(cx + Math.cos(cnAngle) * W * 0.08, cy - H * 0.24 + Math.sin(cnAngle) * H * 0.06);

                    ctx.stroke();

                  }

                  // Sciatic nerves to legs

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.08);

                    ctx.quadraticCurveTo(cx + s * W * 0.06, cy + H * 0.18, cx + s * W * 0.10, cy + H * 0.35);

                    ctx.stroke();

                  });

                  // Brachial plexus to arms

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.12);

                    ctx.quadraticCurveTo(cx + s * W * 0.08, cy - H * 0.08, cx + s * W * 0.14, cy + H * 0.05);

                    ctx.stroke();

                  });

                  // Signal pulse animation

                  var sigT = (dissTick * 0.01) % 1;

                  var sigY = cy - H * 0.25 + sigT * H * 0.35;

                  ctx.beginPath(); ctx.arc(cx, sigY, 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#e879f9'; ctx.fill();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#a855f7';

                  ctx.fillText('Brain', cx + W * 0.03, cy - H * 0.26);

                  ctx.fillText('Spinal Cord', cx + W * 0.02, cy);

                  ctx.fillText('Sciatic', cx + W * 0.08, cy + H * 0.25);

                  ctx.fillText('Brachial', cx + W * 0.06, cy - H * 0.10);

                } else if (spec.bodyShape === 'worm') {

                  ctx.strokeStyle = '#a855f7';

                  // Ventral nerve cord

                  ctx.beginPath(); ctx.moveTo(cx, H * 0.07); ctx.lineTo(cx, H * 0.93); ctx.stroke();

                  // Segmental ganglia

                  for (var sg = 0; sg < 20; sg++) {

                    var sgY = H * 0.10 + sg * H * 0.04;

                    ctx.beginPath(); ctx.arc(cx, sgY, 2, 0, Math.PI * 2);

                    ctx.fillStyle = '#c084fc'; ctx.fill();

                    // Lateral nerves

                    ctx.beginPath(); ctx.moveTo(cx, sgY);

                    ctx.lineTo(cx - W * 0.04, sgY); ctx.stroke();

                    ctx.beginPath(); ctx.moveTo(cx, sgY);

                    ctx.lineTo(cx + W * 0.04, sgY); ctx.stroke();

                  }

                  var wSigT = (dissTick * 0.008) % 1;

                  ctx.beginPath(); ctx.arc(cx, H * 0.07 + wSigT * H * 0.86, 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#e879f9'; ctx.fill();

                  ctx.font = '6px Inter, system-ui'; ctx.fillStyle = '#a855f7';

                  ctx.fillText('Ventral Nerve Cord', cx + W * 0.05, H * 0.50);

                  ctx.fillText('Segmental Ganglia', cx + W * 0.05, H * 0.52);

                } else if (spec.bodyShape === 'crayfish') {

                  ctx.strokeStyle = '#a855f7';

                  // Brain â†’ ventral cord

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.20, cy); // brain

                  ctx.lineTo(cx + W * 0.25, cy); // ventral cord

                  ctx.stroke();

                  // Ganglia

                  for (var cg = 0; cg < 6; cg++) {

                    ctx.beginPath(); ctx.arc(cx - W * 0.15 + cg * W * 0.08, cy, 2, 0, Math.PI * 2);

                    ctx.fillStyle = '#c084fc'; ctx.fill();

                  }

                  ctx.font = '6px Inter, system-ui'; ctx.fillStyle = '#a855f7';

                  ctx.fillText('Brain', cx - W * 0.22, cy - H * 0.03);

                  ctx.fillText('Ventral Cord', cx + W * 0.05, cy - H * 0.03);

                }

                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                ctx.globalAlpha = 1;

              }

              // Excretory flow tracing overlay

              if (d.traceExcretory && activeLayer === 'organs') {

                ctx.setLineDash([4, 4]);

                ctx.lineDashOffset = -dissTick * 0.4;

                ctx.lineWidth = 2; ctx.globalAlpha = 0.65;

                if (spec.bodyShape === 'frog') {

                  ctx.strokeStyle = '#84cc16';

                  // Kidneys â†’ ureters â†’ bladder â†’ cloaca

                  [-1, 1].forEach(function (s) {

                    ctx.beginPath();

                    ctx.moveTo(cx + s * W * 0.06, cy + H * 0.08); // kidney

                    ctx.quadraticCurveTo(cx + s * W * 0.03, cy + H * 0.12, cx, cy + H * 0.15); // ureter â†’ bladder

                    ctx.stroke();

                  });

                  ctx.beginPath(); ctx.moveTo(cx, cy + H * 0.15); // bladder

                  ctx.lineTo(cx, cy + H * 0.22); // cloaca

                  ctx.stroke();

                  // Filtrate animation

                  var filtT = (dissTick * 0.006) % 1;

                  ctx.beginPath(); ctx.arc(cx + Math.cos(filtT * 6) * W * 0.03, cy + H * 0.08 + filtT * H * 0.14, 2, 0, Math.PI * 2);

                  ctx.fillStyle = '#a3e635'; ctx.fill();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#84cc16';

                  ctx.fillText('Kidneys', cx + W * 0.08, cy + H * 0.09);

                  ctx.fillText('Ureters', cx + W * 0.04, cy + H * 0.13);

                  ctx.fillText('Bladder', cx + W * 0.03, cy + H * 0.16);

                  ctx.fillText('Cloaca', cx + W * 0.02, cy + H * 0.23);

                } else if (spec.bodyShape === 'worm') {

                  ctx.strokeStyle = '#84cc16';

                  // Nephridia along body

                  for (var neph = 0; neph < 8; neph++) {

                    var nephY = H * 0.22 + neph * H * 0.08;

                    ctx.beginPath();

                    ctx.moveTo(cx - W * 0.04, nephY);

                    ctx.quadraticCurveTo(cx - W * 0.05, nephY + H * 0.02, cx - W * 0.045, nephY + H * 0.04);

                    ctx.stroke();

                    // Nephridiopore

                    ctx.beginPath(); ctx.arc(cx - W * 0.045, nephY + H * 0.04, 1.5, 0, Math.PI * 2);

                    ctx.fillStyle = '#84cc16'; ctx.fill();

                  }

                  ctx.font = '6px Inter, system-ui'; ctx.fillStyle = '#84cc16';

                  ctx.fillText('Nephridia', cx - W * 0.09, H * 0.35);

                  ctx.fillText('Nephridiopores', cx - W * 0.10, H * 0.37);

                } else if (spec.bodyShape === 'pig') {

                  ctx.strokeStyle = '#84cc16';

                  ctx.beginPath();

                  ctx.moveTo(cx + W * 0.08, cy + H * 0.08); // kidney

                  ctx.quadraticCurveTo(cx + W * 0.06, cy + H * 0.12, cx + W * 0.04, cy + H * 0.14); // ureter

                  ctx.lineTo(cx, cy + H * 0.16); // bladder

                  ctx.stroke();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#84cc16';

                  ctx.fillText('Kidney', cx + W * 0.09, cy + H * 0.07);

                  ctx.fillText('Ureter', cx + W * 0.07, cy + H * 0.13);

                  ctx.fillText('Bladder', cx + W * 0.01, cy + H * 0.18);

                }

                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                ctx.globalAlpha = 1;

              }

              // Circulatory flow tracing overlay

              if (d.traceCirculation && activeLayer === 'organs') {

                ctx.setLineDash([5, 4]);

                ctx.lineWidth = 2; ctx.globalAlpha = 0.6;

                if (spec.bodyShape === 'frog') {

                  // Heart â†’ Arteries (red, oxygenated)

                  ctx.lineDashOffset = -dissTick * 0.6;

                  ctx.strokeStyle = '#ef4444';

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.12); // heart

                  ctx.quadraticCurveTo(cx - W * 0.08, cy - H * 0.18, cx - W * 0.04, cy - H * 0.24); // carotid â†’ head

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.12);

                  ctx.quadraticCurveTo(cx + W * 0.05, cy - H * 0.05, cx + W * 0.03, cy + H * 0.06); // systemic â†’ body

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.03, cy + H * 0.06);

                  ctx.lineTo(cx + W * 0.12, cy + H * 0.30); // to legs

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.03, cy + H * 0.06);

                  ctx.lineTo(cx - W * 0.12, cy + H * 0.30);

                  ctx.stroke();

                  // Veins (blue, deoxygenated) â†’ back to heart

                  ctx.lineDashOffset = dissTick * 0.6;

                  ctx.strokeStyle = '#3b82f6';

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.12, cy + H * 0.32);

                  ctx.quadraticCurveTo(cx - W * 0.06, cy + H * 0.15, cx - W * 0.02, cy - H * 0.10);

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.12, cy + H * 0.32);

                  ctx.quadraticCurveTo(cx + W * 0.06, cy + H * 0.15, cx + W * 0.02, cy - H * 0.10);

                  ctx.stroke();

                  // Pulmonary loop

                  ctx.strokeStyle = '#a855f7';

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.12);

                  ctx.quadraticCurveTo(cx - W * 0.10, cy - H * 0.10, cx - W * 0.08, cy - H * 0.06);

                  ctx.stroke();

                  // Labels

                  ctx.font = '7px Inter, system-ui';

                  ctx.fillStyle = '#ef4444'; ctx.fillText('Arteries (O₂)', cx - W * 0.12, cy - H * 0.20);

                  ctx.fillStyle = '#3b82f6'; ctx.fillText('Veins (CO₂)', cx + W * 0.06, cy + H * 0.20);

                  ctx.fillStyle = '#a855f7'; ctx.fillText('Pulmonary', cx - W * 0.14, cy - H * 0.08);

                  // Blood cell animation

                  var bcT = (dissTick * 0.008) % 1;

                  ctx.beginPath(); ctx.arc(cx + bcT * W * 0.15, cy - H * 0.12 + (bcT * H * 0.42), 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#ef4444'; ctx.fill();

                } else if (spec.bodyShape === 'heart') {

                  // Through chambers

                  ctx.lineDashOffset = -dissTick * 0.5;

                  ctx.strokeStyle = '#3b82f6'; // deoxygenated

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.15, cy - H * 0.25); // SVC

                  ctx.lineTo(cx + W * 0.10, cy - H * 0.10); // RA

                  ctx.lineTo(cx + W * 0.08, cy + H * 0.05); // RV

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx + W * 0.08, cy + H * 0.05);

                  ctx.quadraticCurveTo(cx + W * 0.15, cy - H * 0.15, cx + W * 0.20, cy - H * 0.25); // pulmonary artery

                  ctx.stroke();

                  ctx.strokeStyle = '#ef4444'; // oxygenated

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.15, cy - H * 0.20); // pulmonary vein

                  ctx.lineTo(cx - W * 0.10, cy - H * 0.10); // LA

                  ctx.lineTo(cx - W * 0.08, cy + H * 0.05); // LV

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.08, cy + H * 0.05);

                  ctx.quadraticCurveTo(cx - W * 0.15, cy, cx, cy - H * 0.28); // aorta

                  ctx.stroke();

                  ctx.font = '7px Inter, system-ui';

                  ctx.fillStyle = '#3b82f6'; ctx.fillText('SVC', cx + W * 0.16, cy - H * 0.26);

                  ctx.fillText('Pulm. Artery', cx + W * 0.16, cy - H * 0.16);

                  ctx.fillStyle = '#ef4444'; ctx.fillText('Pulm. Vein', cx - W * 0.20, cy - H * 0.22);

                  ctx.fillText('Aorta', cx - W * 0.04, cy - H * 0.30);

                }

                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                ctx.globalAlpha = 1;

              }

              // Respiratory flow tracing overlay

              if (d.traceRespiration && activeLayer === 'organs') {

                ctx.setLineDash([4, 5]);

                ctx.lineDashOffset = -dissTick * 0.7;

                ctx.lineWidth = 2; ctx.globalAlpha = 0.7;

                if (spec.bodyShape === 'frog') {

                  ctx.strokeStyle = '#38bdf8';

                  // Air path: nares â†’ glottis â†’ lungs

                  ctx.beginPath();

                  ctx.moveTo(cx, cy - H * 0.28); // nostrils

                  ctx.lineTo(cx, cy - H * 0.20); // pharynx

                  ctx.lineTo(cx, cy - H * 0.15); // glottis

                  ctx.stroke();

                  // Left lung

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.15);

                  ctx.quadraticCurveTo(cx - W * 0.06, cy - H * 0.12, cx - W * 0.08, cy - H * 0.06);

                  ctx.stroke();

                  // Right lung

                  ctx.beginPath(); ctx.moveTo(cx, cy - H * 0.15);

                  ctx.quadraticCurveTo(cx + W * 0.06, cy - H * 0.12, cx + W * 0.08, cy - H * 0.06);

                  ctx.stroke();

                  // Air particles animation

                  for (var ap = 0; ap < 5; ap++) {

                    var apT = ((dissTick * 0.01 + ap * 0.2) % 1);

                    var apY = cy - H * 0.28 + apT * H * 0.22;

                    ctx.beginPath(); ctx.arc(cx + Math.sin(apT * 8) * W * 0.01, apY, 2, 0, Math.PI * 2);

                    ctx.fillStyle = '#38bdf8'; ctx.fill();

                  }

                  // O2/CO2 labels

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#38bdf8';

                  ctx.fillText('O₂ In', cx + W * 0.02, cy - H * 0.26);

                  ctx.fillStyle = '#ef4444';

                  ctx.fillText('CO₂ Out', cx + W * 0.02, cy - H * 0.24);

                  // Cutaneous respiration note

                  ctx.fillStyle = 'rgba(56,189,248,0.4)'; ctx.font = '6px Inter, system-ui';

                  ctx.fillText('Cutaneous', cx + W * 0.10, cy + H * 0.05);

                } else if (spec.bodyShape === 'pig') {

                  ctx.strokeStyle = '#38bdf8';

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.32, cy - H * 0.01); // nostrils

                  ctx.lineTo(cx - W * 0.20, cy - H * 0.02); // trachea

                  ctx.stroke();

                  // Bronchi split

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.20, cy - H * 0.02);

                  ctx.quadraticCurveTo(cx - W * 0.12, cy - H * 0.06, cx - W * 0.06, cy - H * 0.08);

                  ctx.stroke();

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.20, cy - H * 0.02);

                  ctx.quadraticCurveTo(cx - W * 0.12, cy + H * 0.02, cx - W * 0.06, cy + H * 0.02);

                  ctx.stroke();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#38bdf8';

                  ctx.fillText('Trachea', cx - W * 0.22, cy - H * 0.05);

                  ctx.fillText('L. Bronchus', cx - W * 0.10, cy - H * 0.10);

                  ctx.fillText('R. Bronchus', cx - W * 0.10, cy + H * 0.05);

                } else if (spec.bodyShape === 'fish') {

                  ctx.strokeStyle = '#38bdf8';

                  // Water flow through gills

                  ctx.beginPath(); ctx.moveTo(cx - W * 0.35, cy); // mouth intake

                  ctx.lineTo(cx - W * 0.22, cy); // through pharynx

                  ctx.stroke();

                  // Through gills and out operculum

                  for (var gf = 0; gf < 3; gf++) {

                    ctx.beginPath(); ctx.moveTo(cx - W * 0.22, cy - H * 0.02 + gf * H * 0.02);

                    ctx.lineTo(cx - W * 0.28, cy - H * 0.03 + gf * H * 0.02);

                    ctx.stroke();

                  }

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#38bdf8';

                  ctx.fillText('Water In', cx - W * 0.38, cy - H * 0.02);

                  ctx.fillText('O₂ Exchange', cx - W * 0.26, cy - H * 0.06);

                  ctx.fillText('Water Out', cx - W * 0.30, cy + H * 0.06);

                }

                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                ctx.globalAlpha = 1;

              }

              // Digestive tract tracing overlay

              if (d.traceDigestion && activeLayer === 'organs') {

                ctx.setLineDash([6, 4]);

                ctx.lineDashOffset = -dissTick * 0.6;

                ctx.lineWidth = 2.5; ctx.globalAlpha = 0.7;

                if (spec.bodyShape === 'frog') {

                  ctx.strokeStyle = '#f59e0b';

                  ctx.beginPath();

                  ctx.moveTo(cx, cy - H * 0.26); // mouth

                  ctx.lineTo(cx, cy - H * 0.18); // esophagus

                  ctx.quadraticCurveTo(cx + W * 0.02, cy - H * 0.12, cx + W * 0.04, cy - H * 0.05); // stomach

                  ctx.quadraticCurveTo(cx + W * 0.06, cy + H * 0.02, cx + W * 0.03, cy + H * 0.05); // duodenum

                  ctx.quadraticCurveTo(cx - W * 0.02, cy + H * 0.10, cx, cy + H * 0.14); // intestines

                  ctx.quadraticCurveTo(cx + W * 0.03, cy + H * 0.18, cx, cy + H * 0.22); // large intestine

                  ctx.stroke();

                  // Food bolus moving along path

                  var foodT = (dissTick * 0.005) % 1;

                  var foodY = cy - H * 0.26 + foodT * H * 0.48;

                  ctx.beginPath(); ctx.arc(cx + Math.sin(foodT * 10) * W * 0.02, foodY, 4, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1; ctx.stroke();

                  // Labels

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#f59e0b';

                  ctx.fillText('Mouth', cx + W * 0.02, cy - H * 0.27);

                  ctx.fillText('Esophagus', cx + W * 0.04, cy - H * 0.17);

                  ctx.fillText('Stomach', cx + W * 0.07, cy - H * 0.06);

                  ctx.fillText('Sm. Intestine', cx + W * 0.06, cy + H * 0.08);

                  ctx.fillText('Lg. Intestine', cx + W * 0.04, cy + H * 0.18);

                  ctx.fillText('Cloaca', cx + W * 0.02, cy + H * 0.23);

                } else if (spec.bodyShape === 'worm') {

                  ctx.strokeStyle = '#f59e0b';

                  ctx.beginPath();

                  ctx.moveTo(cx, H * 0.06); // mouth

                  ctx.lineTo(cx, H * 0.10); // pharynx

                  ctx.lineTo(cx, H * 0.28); // crop

                  ctx.lineTo(cx, H * 0.33); // gizzard

                  ctx.lineTo(cx, H * 0.88); // intestine

                  ctx.lineTo(cx, H * 0.94); // anus

                  ctx.stroke();

                  var wFoodT = (dissTick * 0.003) % 1;

                  var wFoodY = H * 0.06 + wFoodT * H * 0.88;

                  ctx.beginPath(); ctx.arc(cx, wFoodY, 3, 0, Math.PI * 2);

                  ctx.fillStyle = '#92400e'; ctx.fill();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#f59e0b';

                  ctx.fillText('Mouth', cx + W * 0.05, H * 0.065);

                  ctx.fillText('Pharynx', cx + W * 0.05, H * 0.11);

                  ctx.fillText('Crop', cx + W * 0.05, H * 0.29);

                  ctx.fillText('Gizzard', cx + W * 0.05, H * 0.34);

                  ctx.fillText('Intestine', cx + W * 0.05, H * 0.60);

                  ctx.fillText('Anus', cx + W * 0.05, H * 0.945);

                } else if (spec.bodyShape === 'pig') {

                  ctx.strokeStyle = '#f59e0b';

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.30, cy); // mouth

                  ctx.lineTo(cx - W * 0.20, cy); // esophagus

                  ctx.quadraticCurveTo(cx - W * 0.05, cy - H * 0.02, cx, cy + H * 0.02); // stomach

                  ctx.quadraticCurveTo(cx + W * 0.08, cy + H * 0.06, cx + W * 0.10, cy + H * 0.10); // intestines

                  ctx.quadraticCurveTo(cx + W * 0.12, cy + H * 0.14, cx + W * 0.16, cy + H * 0.12); // rectum

                  ctx.stroke();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#f59e0b';

                  ctx.fillText('Mouth', cx - W * 0.33, cy - H * 0.02);

                  ctx.fillText('Esophagus', cx - W * 0.18, cy - H * 0.03);

                  ctx.fillText('Stomach', cx + W * 0.02, cy - H * 0.01);

                  ctx.fillText('Intestines', cx + W * 0.09, cy + H * 0.13);

                } else if (spec.bodyShape === 'fish') {

                  ctx.strokeStyle = '#f59e0b';

                  ctx.beginPath();

                  ctx.moveTo(cx - W * 0.32, cy); // mouth

                  ctx.lineTo(cx - W * 0.18, cy); // pharynx

                  ctx.quadraticCurveTo(cx - W * 0.08, cy + H * 0.02, cx, cy + H * 0.03); // stomach

                  ctx.lineTo(cx + W * 0.10, cy + H * 0.02); // pyloric caeca

                  ctx.lineTo(cx + W * 0.20, cy + H * 0.04); // intestine

                  ctx.stroke();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = '#f59e0b';

                  ctx.fillText('Mouth', cx - W * 0.35, cy - H * 0.02);

                  ctx.fillText('Stomach', cx - W * 0.04, cy + H * 0.06);

                  ctx.fillText('Intestine', cx + W * 0.12, cy + H * 0.07);

                }

                ctx.setLineDash([]); ctx.lineDashOffset = 0;

                ctx.globalAlpha = 1;

              }

              // Cross-section indicators

              if (activeLayer === 'organs' && (spec.bodyShape === 'frog' || spec.bodyShape === 'pig' || spec.bodyShape === 'fish')) {

                ctx.globalAlpha = 0.15; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.5; ctx.setLineDash([4, 6]);

                // Transverse section lines

                var sectionYs = spec.bodyShape === 'frog' ? [cy - H * 0.12, cy, cy + H * 0.10] :

                  spec.bodyShape === 'pig' ? [cy - H * 0.06, cy + H * 0.04] :

                    [cy - H * 0.04, cy + H * 0.04];

                sectionYs.forEach(function (sy, si) {

                  ctx.beginPath(); ctx.moveTo(10, sy); ctx.lineTo(W - 10, sy); ctx.stroke();

                  ctx.font = '7px Inter, system-ui'; ctx.fillStyle = 'rgba(148,163,184,0.3)';

                  ctx.fillText('Section' + ' ' + String.fromCharCode(65 + si), 12, sy - 3);

                });

                ctx.setLineDash([]); ctx.globalAlpha = 1;

              }

              // Dissection tray corner labels

              ctx.font = '7px Inter, system-ui';

              ctx.fillStyle = 'rgba(100,116,139,0.3)';

              ctx.fillText('Anterior', W / 2 - 20, 14);

              ctx.fillText('Posterior', W / 2 - 20, H - 4);

              ctx.save(); ctx.translate(8, H / 2 + 10); ctx.rotate(-Math.PI / 2);

              ctx.fillText('Left', 0, 0); ctx.restore();

              ctx.save(); ctx.translate(W - 4, H / 2 - 10); ctx.rotate(Math.PI / 2);

              ctx.fillText('Right', 0, 0); ctx.restore();

              // Specimen label

              ctx.font = '11px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)';

              ctx.fillText(spec.icon + ' ' + spec.name + (d.viewAngle === 'dorsal' ? '  ' + '(Dorsal View)' : '  ' + '(Ventral View)'), 14, 20);

              // System color legend (top-right)

              var legendSys = ['circulatory', 'digestive', 'respiratory', 'nervous', 'skeletal', 'muscular', 'excretory', 'reproductive'];

              var sysColors = { circulatory: '#ef4444', digestive: '#f59e0b', respiratory: '#3b82f6', nervous: '#8b5cf6', skeletal: '#e2e8f0', muscular: '#f87171', excretory: '#a78bfa', reproductive: '#ec4899' };

              var legendLabels = ['Circulatory', 'Digestive', 'Respiratory', 'Nervous', 'Skeletal', 'Muscular', 'Excretory', 'Reproductive'];

              ctx.font = '7px Inter, system-ui';

              for (var li = 0; li < legendSys.length; li++) {

                var lx = W - 58, ly = 50 + li * 12;

                ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2);

                ctx.fillStyle = sysColors[legendSys[li]] || '#94a3b8'; ctx.fill();

                ctx.fillStyle = 'rgba(255,255,255,0.4)';

                ctx.fillText(legendLabels[li], lx + 6, ly + 3);

              }

              // Progress bar at top

              if (totalOrgansInSpecimen > 0) {

                var barW = W - 28;

                ctx.fillStyle = 'rgba(30,41,59,0.6)';

                ctx.fillRect(14, 28, barW, 4);

                ctx.fillStyle = progressPct >= 100 ? '#22c55e' : '#3b82f6';

                ctx.fillRect(14, 28, barW * (progressPct / 100), 4);

                ctx.font = '9px Inter, system-ui, sans-serif';

                ctx.fillStyle = 'rgba(255,255,255,0.35)';

                ctx.fillText('Explored'.replace('{count}', exploredCount).replace('{total}', totalOrgansInSpecimen).replace('{pct}', progressPct), 14, 42);

              }

              // Hover tooltip

              var hovOrg = d.hoveredOrgan ? organs.find(function (o) { return o.id === d.hoveredOrgan; }) : null;

              if (hovOrg && d.selectedOrgan !== hovOrg.id) {

                var hpx = hovOrg.x * W, hpy = hovOrg.y * H;

                var hText = hovOrg.name + ': ' + hovOrg.fn.split('.')[0] + '.';

                ctx.font = '10px Inter, system-ui, sans-serif';

                var hLines = [];

                var words = hText.split(' ');

                var line = '';

                for (var wi = 0; wi < words.length; wi++) {

                  var testLine = line + words[wi] + ' ';

                  if (ctx.measureText(testLine).width > 180 && line) { hLines.push(line.trim()); line = words[wi] + ' '; }

                  else { line = testLine; }

                }

                if (line.trim()) hLines.push(line.trim());

                if (hLines.length > 3) hLines = hLines.slice(0, 3);

                var hBoxH = hLines.length * 14 + 10;

                var hBoxW = 196;

                var hbx = Math.min(hpx + 20, W - hBoxW - 10);

                var hby = Math.max(hpy - hBoxH - 10, 50);

                ctx.fillStyle = 'rgba(15,23,42,0.92)';

                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(hbx, hby, hBoxW, hBoxH, 6); ctx.fill(); } else { ctx.fillRect(hbx, hby, hBoxW, hBoxH); }

                ctx.strokeStyle = 'rgba(59,130,246,0.4)'; ctx.lineWidth = 1; ctx.stroke();

                ctx.fillStyle = '#e2e8f0';

                for (var hi = 0; hi < hLines.length; hi++) {

                  ctx.fillText(hLines[hi], hbx + 8, hby + 16 + hi * 14);

                }

              }

              // Guided walkthrough prompt

              if (guidedMode && currentGuided) {

                ctx.fillStyle = 'rgba(147,51,234,0.85)';

                var gpW = W - 28;

                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(14, H - 50, gpW, 32, 6); ctx.fill(); } else { ctx.fillRect(14, H - 50, gpW, 32); }

                ctx.font = 'bold 11px Inter, system-ui, sans-serif';

                ctx.fillStyle = '#ffffff';

                ctx.fillText(currentGuided.prompt, 22, H - 30);

                // Highlight guided organ with arrow

                var gOrg = organs.find(function (o) { return o.id === currentGuided.organId; });

                if (gOrg) {

                  var gx = gOrg.x * W, gy = gOrg.y * H;

                  ctx.beginPath(); ctx.arc(gx, gy, 16 + Math.sin(dissTick * 0.08) * 3, 0, Math.PI * 2);

                  ctx.strokeStyle = 'rgba(147,51,234,0.7)'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);

                }

              }



              ctx.restore(); // End zoom transform

              } catch (e) { console.error('[DissectionLab] render error:', e); try { ctx.restore(); ctx.restore(); } catch (_) {} }

              canvas._dissAnim = requestAnimationFrame(drawDissectionFrame);

            }

            drawDissectionFrame();

          };



          // Auto-save progress to localStorage (non-hook: inline during render)

          try {

            var saveKey = 'dissection_progress_' + (spec ? spec.id : '');

            var saveData = {

              exploredOrgans: d.exploredOrgans || {},

              quizScore: d.quizScore || 0,

              completedObjectives: d.completedObjectives || {},

              currentLayerIdx: d.currentDissLayer || 0,

              timeSpent: d.timeSpent || 0

            };

            localStorage.setItem(saveKey, JSON.stringify(saveData));

          } catch (e) { }

          // Load progress (non-hook: deferred to avoid setState-during-render)

          if (!d._dissLoadedSpec || d._dissLoadedSpec !== (spec ? spec.id : '')) {

            setTimeout(function () {

              var saveKey2 = 'dissection_progress_' + (spec ? spec.id : '');

              try {

                var saved = localStorage.getItem(saveKey2);

                if (saved) {

                  var data = JSON.parse(saved);

                  if (data.exploredOrgans) upd('exploredOrgans', data.exploredOrgans);

                  if (data.quizScore) upd('quizScore', data.quizScore);

                  if (data.completedObjectives) upd('completedObjectives', data.completedObjectives);

                }

              } catch (e) { }

              upd('_dissLoadedSpec', spec ? spec.id : '');

            }, 0);

          }

          // Keyboard shortcuts (non-hook: window global ref for cleanup)

          window._dissectionKeyHandler = function (e) {

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {

              var oi = organs.findIndex(function (o) { return o.id === d.selectedOrgan; });

              if (oi < organs.length - 1) upd('selectedOrgan', organs[oi + 1].id);

            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {

              var oi2 = organs.findIndex(function (o) { return o.id === d.selectedOrgan; });

              if (oi2 > 0) upd('selectedOrgan', organs[oi2 - 1].id);

            } else if (e.key === 'Escape') {

              upd('selectedOrgan', null);

            } else if (e.key === 'r' || e.key === 'R') {

              upd('canvasZoom', 1); upd('canvasPanX', 0); upd('canvasPanY', 0);

            }

          };

          if (!window._dissectionKeyBound) {

            window._dissectionKeyBound = true;

            window.addEventListener('keydown', function (e) { if (window._dissectionKeyHandler) window._dissectionKeyHandler(e); });

          }



          // Simple sound effects via Web Audio API

          var audioCtx = null;

          function playDissectSound(type) {

            try {

              if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

              var osc = audioCtx.createOscillator();

              var gain = audioCtx.createGain();

              osc.connect(gain); gain.connect(audioCtx.destination);

              gain.gain.setValueAtTime(0.05, audioCtx.currentTime);

              if (type === 'pin') { osc.frequency.setValueAtTime(880, audioCtx.currentTime); osc.type = 'sine'; gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1); osc.start(); osc.stop(audioCtx.currentTime + 0.1); }

              else if (type === 'peel') { osc.frequency.setValueAtTime(220, audioCtx.currentTime); osc.frequency.linearRampToValueAtTime(440, audioCtx.currentTime + 0.2); osc.type = 'sawtooth'; gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25); osc.start(); osc.stop(audioCtx.currentTime + 0.25); }

              else if (type === 'success') { osc.frequency.setValueAtTime(523, audioCtx.currentTime); osc.type = 'sine'; gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); osc.start(); osc.stop(audioCtx.currentTime + 0.15); var osc2 = audioCtx.createOscillator(); var g2 = audioCtx.createGain(); osc2.connect(g2); g2.connect(audioCtx.destination); g2.gain.setValueAtTime(0.05, audioCtx.currentTime + 0.12); osc2.frequency.setValueAtTime(659, audioCtx.currentTime + 0.12); osc2.type = 'sine'; g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3); osc2.start(audioCtx.currentTime + 0.12); osc2.stop(audioCtx.currentTime + 0.3); }

            } catch (e) { }

          }



          var canvasClick = function (e) {

            if (e.target._wasPanning) { e.target._wasPanning = false; return; }

            var canvas = e.target; var rect = canvas.getBoundingClientRect();

            var rawX = (e.clientX - rect.left) / rect.width, rawY = (e.clientY - rect.top) / rect.height;

            // Inverse-transform for zoom + pan

            var _z = d.canvasZoom || 1, _px = d.canvasPanX || 0, _py = d.canvasPanY || 0;

            var mx = (rawX - 0.5 - _px / rect.width) / _z + 0.5;

            var my = (rawY - 0.5 - _py / rect.height) / _z + 0.5;

            var hit = null;

            organs.forEach(function (org) { var dx = mx - org.x, dy = my - org.y; if (Math.sqrt(dx * dx + dy * dy) < 0.04) hit = org; });

            upd('selectedOrgan', hit ? (hit.id === d.selectedOrgan ? null : hit.id) : null);

            if (hit) {
              playDissectSound('pin'); sfxDisPin();
              if (window._alloHaptic) window._alloHaptic('click');
              if (typeof canvasNarrate === 'function') canvasNarrate('dissection', 'organSelect', 'Selected ' + hit.name + '. ' + hit.fn.split('.')[0] + '.', { debounce: 500 });
            }

            // Annotation mode: add to drawing

            if (d.annotateMode) {

              var annots = d.annotations || [];

              annots.push({ x: mx, y: my, type: 'dot' });

              upd('annotations', annots);

              if (annots.length > 1) {

                // Connect to previous dot

                annots[annots.length - 1].prevX = annots[annots.length - 2].x;

                annots[annots.length - 1].prevY = annots[annots.length - 2].y;

                upd('annotations', annots.slice());

              }

            }

            // Ruler mode: set start/end points

            if (d.rulerMode) {

              if (!d.rulerStart || d.rulerEnd) {

                upd('rulerStart', { x: mx, y: my });

                upd('rulerEnd', null);

              } else {

                upd('rulerEnd', { x: mx, y: my });

              }

            }

            // Track explored organs for progress

            if (hit) {

              var explored = Object.assign({}, d.exploredOrgans || {});

              explored[specimen + '|' + hit.id] = true;

              upd('exploredOrgans', explored);

              // Advance guided walkthrough if correct organ clicked

              if (guidedMode && currentGuided && hit.id === currentGuided.organId) {

                upd('guidedStep', guidedStep + 1);

                awardStemXP('dissection', 2, 'Found ' + hit.name + ' in guided tour');

                sfxDisProbe(); if (window._alloHaptic) window._alloHaptic('tap');
                if (addToast) addToast('\uD83D\uDCCD ' + 'Found organ!'.replace('{name}', hit.name), 'success');

                if (guidedStep + 1 >= guidedSteps.length) {

                  upd('guidedMode', false);

                  awardStemXP('dissection', 10, 'Completed guided tour');

                  if (addToast) addToast('\uD83C\uDF89 ' + 'Tour Complete!', 'success');

                }

              }

            }

          };



          // Hover handler for canvas tooltips

          var canvasHover = function (e) {

            var canvas = e.target; var rect = canvas.getBoundingClientRect();

            var rawX = (e.clientX - rect.left) / rect.width, rawY = (e.clientY - rect.top) / rect.height;

            // Inverse-transform for zoom + pan

            var _z = d.canvasZoom || 1, _px = d.canvasPanX || 0, _py = d.canvasPanY || 0;

            var mx = (rawX - 0.5 - _px / rect.width) / _z + 0.5;

            var my = (rawY - 0.5 - _py / rect.height) / _z + 0.5;

            var hit = null;

            organs.forEach(function (org) { var dx = mx - org.x, dy = my - org.y; if (Math.sqrt(dx * dx + dy * dy) < 0.04) hit = org; });

            upd('hoveredOrgan', hit ? hit.id : null);

            canvas.style.cursor = hit ? 'pointer' : (canvas._isPanning ? 'grabbing' : ((d.canvasZoom || 1) > 1 ? 'grab' : 'crosshair'));

          };



          // Progress calculation

          var exploredOrgans = d.exploredOrgans || {};

          var totalOrgansInSpecimen = 0;

          var exploredCount = 0;

          spec.layers.forEach(function (layer) {

            var layerOrgans = spec.organs[layer.id] || [];

            totalOrgansInSpecimen += layerOrgans.length;

            layerOrgans.forEach(function (org) {

              if (exploredOrgans[specimen + '|' + org.id]) exploredCount++;

            });

          });

          var progressPct = totalOrgansInSpecimen > 0 ? Math.round((exploredCount / totalOrgansInSpecimen) * 100) : 0;



          // Guided walkthrough data

          var guidedSteps = organs.map(function (org, i) {

            return { organId: org.id, name: org.name, prompt: 'Find the next structure'.replace('{step}', i + 1).replace('{total}', organs.length).replace('{name}', org.name) };

          });

          var currentGuided = guidedMode && guidedSteps[guidedStep % guidedSteps.length];



          var SPEC_KEYS = Object.keys(SPECIMENS);





          // â”€â”€ Render â”€â”€

          return React.createElement("div", { className: "space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-1" },

            // Specimen selector
            React.createElement("div", { className: "flex gap-1 bg-slate-50 rounded-xl p-1 overflow-x-auto" },
              SPEC_KEYS.map(function (sk) {
                var sp = SPECIMENS[sk];
                var isActive = sk === specimen;
                return React.createElement("button", { "aria-label": "Select specimen: " + sp.name,
                  key: sk,
                  onClick: function () {
                    upd('specimen', sk); upd('currentLayer', 0); upd('selectedOrgan', null);
                    if (typeof canvasNarrate === 'function') canvasNarrate('dissection', 'specimenSelect', 'Selected ' + sp.name + '. ' + sp.desc, { debounce: 500 });
                  },
                  className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all " + (isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200')
                }, sp.icon + ' ' + sp.name);
              })
            ),


            // ── Toolbar ── collapsible dropdown groups
            React.createElement("div", { className: "flex flex-wrap items-center gap-1 bg-slate-50 rounded-xl p-1.5 border border-slate-200" },

              // ── View toggle ──
              React.createElement("button", { "aria-label": "Toggle View toolbar",
                onClick: function () { upd('toolbarViewOpen', !d.toolbarViewOpen); upd('toolbarToolsOpen', false); upd('toolbarStudyOpen', false); },
                className: "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.toolbarViewOpen ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-blue-50')
              }, '\uD83D\uDC41 View ' + (d.toolbarViewOpen ? '\u25B2' : '\u25BC')),

              // ── Tools toggle ──
              React.createElement("button", { "aria-label": "Toggle Tools toolbar",
                onClick: function () { upd('toolbarToolsOpen', !d.toolbarToolsOpen); upd('toolbarViewOpen', false); upd('toolbarStudyOpen', false); },
                className: "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.toolbarToolsOpen ? 'bg-emerald-700 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50')
              }, '\uD83D\uDEE0 Tools ' + (d.toolbarToolsOpen ? '\u25B2' : '\u25BC')),

              // ── Study toggle ──
              React.createElement("button", { "aria-label": "Toggle Study toolbar",
                onClick: function () { upd('toolbarStudyOpen', !d.toolbarStudyOpen); upd('toolbarViewOpen', false); upd('toolbarToolsOpen', false); },
                className: "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.toolbarStudyOpen ? 'bg-amber-700 text-white shadow-md' : (d.quizMode || d.flashcardMode || d.guidedMode || d.compareMode || d.practicalMode ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50'))
              }, '\uD83D\uDCDA Study ' + (d.toolbarStudyOpen ? '\u25B2' : '\u25BC'))

            ),

            // ── View group expanded ──
            d.toolbarViewOpen && React.createElement("div", { className: "flex flex-wrap gap-1 bg-blue-50 rounded-xl p-2 border border-blue-200 animate-[fadeIn_0.2s_ease-out]" },

              React.createElement("button", { "aria-label": "Toggle organ name labels",
                onClick: function () { var m = d.labelMode === 'show' ? 'hidden' : 'show'; upd('labelMode', m); },
                title: 'Labels' + ' — Toggle organ name labels on the canvas',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.labelMode !== 'hidden' ? 'bg-blue-600 text-white' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100')
              }, '\uD83C\uDFF7 ' + 'Labels'),

              React.createElement("button", { "aria-label": "Toggle high contrast mode",
                onClick: function () { upd('highContrast', !d.highContrast); },
                title: 'Hi-Con' + ' — Enhance colors for accessibility',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.highContrast ? 'bg-yellow-500 text-black' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100')
              }, '\u2600 ' + 'Hi-Con'),

              React.createElement("button", { "aria-label": "Switch anatomical view: dorsal or ventral",
                onClick: function () { upd('viewDorsal', !d.viewDorsal); },
                title: (d.viewDorsal ? 'Ventral' : 'Dorsal') + ' — Switch anatomical view orientation',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.viewDorsal ? 'bg-indigo-500 text-white' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100')
              }, d.viewDorsal ? '\uD83D\uDD04 Ventral' : '\uD83D\uDD04 Dorsal'),

              React.createElement("button", { "aria-label": "Enter fullscreen canvas mode",
                onClick: function () { try { var c = document.querySelector('[data-diss-canvas]'); if (c && c.requestFullscreen) c.requestFullscreen(); } catch (e) {} },
                title: 'Fullscreen' + ' — Expand canvas to full screen',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all"
              }, '\u26F6 ' + 'Fullscreen'),

              React.createElement("button", { "aria-label": "Animation Speed — Cycle: normal / slow / fast",
                onClick: function () { var s = d.animSpeed === 'fast' ? 'normal' : (d.animSpeed === 'normal' ? 'slow' : 'fast'); upd('animSpeed', s); },
                title: 'Animation Speed — Cycle: normal / slow / fast',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-blue-700 border border-blue-200 hover:bg-blue-100 transition-all"
              }, '\u23E9 ' + (d.animSpeed === 'slow' ? 'Slow' : d.animSpeed === 'fast' ? 'Fast' : 'Normal')),

              React.createElement("button", { "aria-label": "Print",
                onClick: function () { upd('printMode', !d.printMode); },
                title: 'Print / Clean View — Remove UI chrome for printing',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.printMode ? 'bg-slate-700 text-white' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100')
              }, '\uD83D\uDDA8 Print')

            ),

            // ── Tools group expanded ──
            d.toolbarToolsOpen && React.createElement("div", { className: "flex flex-wrap gap-1 bg-emerald-50 rounded-xl p-2 border border-emerald-200 animate-[fadeIn_0.2s_ease-out]" },

              React.createElement("button", { "aria-label": "Ruler",
                onClick: function () { upd('rulerMode', !d.rulerMode); if (!d.rulerMode) upd('annotateMode', false); },
                title: 'Ruler' + ' — Measure distances on the specimen',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.rulerMode ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100')
              }, '\uD83D\uDCCF ' + 'Ruler'),

              React.createElement("button", { "aria-label": "Annotate",
                onClick: function () { upd('annotateMode', !d.annotateMode); if (!d.annotateMode) upd('rulerMode', false); },
                title: 'Annotate' + ' — Draw annotations on the canvas',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.annotateMode ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100')
              }, '\u270F ' + 'Annotate'),

              React.createElement("button", { "aria-label": "Screenshot",
                onClick: function () {
                  try {
                    var c = document.querySelector('[data-diss-canvas]');
                    if (c) { var link = document.createElement('a'); link.download = specimen + '_dissection.png'; link.href = c.toDataURL(); link.click(); if (addToast) addToast('\uD83D\uDCF8 Screenshot saved!', 'success'); }
                  } catch (e) { if (addToast) addToast('Screenshot failed', 'error'); }
                },
                title: 'Screenshot' + ' — Save the current canvas view',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
              }, '\uD83D\uDCF8 ' + 'Screenshot'),

              React.createElement("button", { "aria-label": "Copy lab report to clipboard",
                onClick: function () {
                  var report = '\uD83E\uDD9A Lab Report: ' + spec.name + '\n';
                  report += '\u2500'.repeat(30) + '\n';
                  report += 'Specimen: ' + spec.name + ' (' + spec.kingdom + ', ' + spec.phylum + ')\n';
                  report += 'Layers explored: ' + spec.layers.length + '\n';
                  report += 'Organs examined: ' + exploredCount + '/' + totalOrgansInSpecimen + '\n';
                  report += 'Quiz score: ' + (d.quizScore || 0) + '\n';
                  report += '\u2500'.repeat(30) + '\n';
                  organs.forEach(function (o) { report += '\u2022 ' + o.name + ': ' + o.fn.substring(0, 80) + '\n'; });
                  try { navigator.clipboard.writeText(report); if (addToast) addToast('\uD83D\uDCCB Lab report copied!', 'success'); } catch (e) {}
                },
                title: 'Lab Report' + ' — Generate and copy a summary lab report',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
              }, '\uD83D\uDCCB ' + 'Lab Report'),

              React.createElement("button", { "aria-label": "Reset dissection view",
                onClick: function () {
                  upd('currentLayer', 0); upd('selectedOrgan', null); upd('exploredOrgans', {});
                  upd('canvasZoom', 1); upd('canvasPanX', 0); upd('canvasPanY', 0);
                  upd('traceNervous', false); upd('showEndocrine', false);
                  upd('rulerMode', false); upd('annotateMode', false);
                  upd('labelMode', 'show'); upd('highContrast', false);
                  if (addToast) addToast('\u21BA ' + 'Reset Complete', 'info');
                },
                title: 'Reset' + ' — Reset all settings for this specimen',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-all"
              }, '\u21BA ' + 'Reset')

            ),

            // ── Study group expanded ──
            d.toolbarStudyOpen && React.createElement("div", { className: "flex flex-wrap gap-1 bg-amber-50 rounded-xl p-2 border border-amber-200 animate-[fadeIn_0.2s_ease-out]" },

              React.createElement("button", { "aria-label": "Quiz",
                onClick: function () { upd('quizMode', !d.quizMode); if (!d.quizMode) { upd('quizIdx', 0); upd('quizScore', 0); upd('quizTotal', 0); upd('quizFeedback', null); } },
                title: 'Quiz' + ' — Test your knowledge of organ identification',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.quizMode ? 'bg-amber-700 text-white' : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-100')
              }, '\uD83E\uDDE0 ' + 'Quiz'),

              React.createElement("button", { "aria-label": "Flashcard",
                onClick: function () { upd('flashcardMode', !d.flashcardMode); if (!d.flashcardMode) { upd('flashcardIdx', 0); upd('flashcardFlipped', false); } },
                title: 'Flashcard' + ' — Review organs with flip cards',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.flashcardMode ? 'bg-violet-600 text-white' : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-100')
              }, '\uD83C\uDCCF ' + 'Flashcard'),

              React.createElement("button", { "aria-label": "Guided",
                onClick: function () { upd('guidedMode', !d.guidedMode); if (!d.guidedMode) upd('guidedStep', 0); },
                title: 'Guided' + ' — Follow a step-by-step organ tour',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.guidedMode ? 'bg-teal-700 text-white' : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-100')
              }, '\uD83E\uDDED ' + 'Guided'),

              React.createElement("button", { "aria-label": "Compare",
                onClick: function () { upd('compareMode', !d.compareMode); },
                title: 'Compare' + ' — Compare organs across specimens',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.compareMode ? 'bg-cyan-700 text-white' : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-100')
              }, '\uD83D\uDD0D ' + 'Compare'),

              React.createElement("button", { "aria-label": "Toggle practical exam mode",
                onClick: function () {
                  if (!d.practicalMode) {
                    upd('practicalMode', true);
                    upd('labelMode', 'hidden');
                    upd('quizMode', true);
                    upd('quizIdx', 0);
                    upd('quizScore', 0);
                    upd('quizTotal', 0);
                    upd('quizFeedback', null);
                    upd('practicalTimer', 120);
                    var tmr2 = setInterval(function () {
                      var ct = (d.practicalTimer || 120) - 1;
                      if (ct <= 0) { clearInterval(tmr2); upd('practicalMode', false); upd('labelMode', 'show'); if (addToast) addToast('\u23F0 Time up! Score: ' + (d.quizScore || 0), 'info'); }
                      upd('practicalTimer', ct);
                    }, 1000);
                    upd('_practicalInterval', tmr2);
                  } else {
                    clearInterval(d._practicalInterval);
                    upd('practicalMode', false);
                    upd('labelMode', 'show');
                    upd('quizMode', false);
                  }
                },
                title: 'Practical' + ' — Timed practical exam mode',
                className: "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all " + (d.practicalMode ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-orange-700 border border-orange-200 hover:bg-orange-100')
              }, d.practicalMode ? '\u23F0 ' + Math.floor((d.practicalTimer || 0) / 60) + ':' + String((d.practicalTimer || 0) % 60).padStart(2, '0') : '\u23F1 ' + 'Practical')

            ),


            // Main: Canvas + sidebar

            React.createElement("div", { className: "flex gap-3" },

              // Canvas + peel button

              React.createElement("div", { className: "flex-1" },

                React.createElement("canvas", {

                  ref: canvasRef, onClick: canvasClick,

                  'data-diss-canvas': true,

                  'aria-label': 'Interactive dissection lab specimen visualization', tabIndex: 0,

                  onMouseMove: function (e) {

                    var canvas = e.currentTarget;

                    // Pan via drag when zoomed > 1

                    if (canvas._isPanning) {

                      var dx = e.clientX - canvas._panStartX;

                      var dy = e.clientY - canvas._panStartY;

                      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) canvas._wasPanning = true;

                      var newPanX = (canvas._panOrigX || 0) + dx;
                      var newPanY = (canvas._panOrigY || 0) + dy;
                      upd('canvasPanX', newPanX); upd('canvasPanY', newPanY);
                    }
                    canvasHover(e);
                  },
                  onMouseDown: function (e) {
                    var canvas = e.currentTarget;
                    if ((d.canvasZoom || 1) > 1.01 && !d.annotateMode && !d.rulerMode) {
                      canvas._isPanning = true;
                      canvas._panStartX = e.clientX;
                      canvas._panStartY = e.clientY;
                      canvas._panOrigX = d.canvasPanX || 0;
                      canvas._panOrigY = d.canvasPanY || 0;
                      canvas._wasPanning = false;
                      canvas.style.cursor = 'grabbing';
                      e.preventDefault();
                    }
                  },

                  onMouseUp: function (e) {

                    var canvas = e.currentTarget;

                    canvas._isPanning = false;

                    canvas.style.cursor = (canvas._zoom || 1) > 1.01 ? 'grab' : 'crosshair';

                  },

                  onMouseLeave: function (e) {

                    var canvas = e.currentTarget;

                    canvas._isPanning = false;

                  },

                  width: 500, height: 600,

                  className: "w-full rounded-xl border border-slate-200 cursor-crosshair",

                  style: { aspectRatio: '5/6', background: '#0f172a' }

                }),

                // Zoom control bar
                React.createElement("div", { className: "flex items-center justify-center gap-2 mt-1.5 py-1 px-2 rounded-lg bg-slate-100 border border-slate-200" },
                  React.createElement("button", { "aria-label": "Zoom out canvas",
                    onClick: function () { var z = Math.max(0.5, (d.canvasZoom || 1) - 0.25); upd('canvasZoom', z); },
                    className: "px-2 py-0.5 rounded text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50"
                  }, '\u2796'),
                  React.createElement("span", { className: "text-[11px] font-mono text-slate-600 min-w-[40px] text-center" }, Math.round((d.canvasZoom || 1) * 100) + '%'),
                  React.createElement("button", { "aria-label": "Zoom in canvas",
                    onClick: function () { var z = Math.min(3, (d.canvasZoom || 1) + 0.25); upd('canvasZoom', z); },
                    className: "px-2 py-0.5 rounded text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50"
                  }, '\u2795'),
                  (d.canvasZoom || 1) !== 1 ? React.createElement("button", { "aria-label": "100%",
                    onClick: function () { upd('canvasZoom', 1); upd('canvasPanX', 0); upd('canvasPanY', 0); },
                    className: "px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200"
                  }, '\u21BA 100%') : null
                ),


                React.createElement("button", { "aria-label": "Toggle nervous system trace overlay",

                  onClick: function () { upd('traceNervous', !d.traceNervous); upd('traceDigestion', false); upd('traceRespiration', false); upd('traceCirculation', false); upd('traceExcretory', false); upd('showEndocrine', false); },

                  className: "w-full mt-1 py-2 rounded-xl text-xs font-bold " + (d.traceNervous ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-700 border border-purple-200')

                }, d.traceNervous ? '\u23F9 ' + 'Stop Trace' : '\u26A1 ' + 'Trace Nervous'),

                React.createElement("button", { "aria-label": "Toggle endocrine system overlay",

                  onClick: function () { upd('showEndocrine', !d.showEndocrine); upd('traceNervous', false); upd('traceDigestion', false); upd('traceRespiration', false); upd('traceCirculation', false); upd('traceExcretory', false); },

                  className: "w-full mt-1 py-2 rounded-xl text-xs font-bold " + (d.showEndocrine ? 'bg-pink-700 text-white' : 'bg-pink-50 text-pink-700 border border-pink-200')

                }, d.showEndocrine ? '\u23F9 ' + 'Hide Endocrine' : '\uD83E\uDDE0 ' + 'Show Endocrine')

              ),



              // Flashcard panel

              d.flashcardMode && React.createElement("div", { className: "mt-2 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 p-4" },

                React.createElement("div", { className: "text-center" },

                  React.createElement("div", { 

                    onClick: function () { upd('flashcardFlipped', !d.flashcardFlipped); },

                    className: "cursor-pointer bg-white rounded-xl shadow-lg p-6 min-h-[100px] flex items-center justify-center border-2 border-indigo-200 hover:shadow-xl transition-shadow"

                  },

                    React.createElement("div", null,

                      !d.flashcardFlipped && React.createElement("div", null,

                        React.createElement("p", { className: "text-sm font-bold text-indigo-700" }, organs[d.flashcardIdx || 0] ? organs[d.flashcardIdx || 0].name : 'No organs found'),

                        React.createElement("p", { className: "text-[11px] text-indigo-400 mt-1" }, 'Click to reveal')

                      ),

                      d.flashcardFlipped && React.createElement("div", null,

                        React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, organs[d.flashcardIdx || 0] ? organs[d.flashcardIdx || 0].fn : ''),

                        organs[d.flashcardIdx || 0] && organs[d.flashcardIdx || 0].clinical && React.createElement("p", { className: "text-[11px] text-amber-600 mt-1 italic" }, organs[d.flashcardIdx || 0].clinical)

                      )

                    )

                  ),

                  React.createElement("div", { className: "flex items-center justify-between mt-3" },

                    React.createElement("button", { "aria-label": "Previous flashcard",

                      onClick: function () { upd('flashcardIdx', Math.max(0, (d.flashcardIdx || 0) - 1)); upd('flashcardFlipped', false); },

                      className: "px-3 py-1 rounded-lg text-xs bg-indigo-100 text-indigo-700"

                    }, '\u25C0 ' + 'Prev'),

                    React.createElement("span", { className: "text-[11px] text-indigo-400" }, ((d.flashcardIdx || 0) + 1) + ' / ' + organs.length),

                    React.createElement("button", { "aria-label": "Next",

                      onClick: function () { upd('flashcardIdx', Math.min(organs.length - 1, (d.flashcardIdx || 0) + 1)); upd('flashcardFlipped', false); },

                      className: "px-3 py-1 rounded-lg text-xs bg-indigo-100 text-indigo-700"

                    }, 'Next' + ' \u25B6')

                  )

                )

              ),

              // Comparison panel

              d.compareMode && sel && React.createElement("div", { className: "mt-2 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-3" },

                React.createElement("div", { className: "text-xs font-bold text-cyan-800 mb-2" }, '\uD83D\uDD0D ' + 'Comparing across specimens' + ': ' + sel.name + ' across specimens'),

                React.createElement("div", { className: "space-y-1.5 max-h-48 overflow-y-auto" },

                  SPEC_KEYS.map(function (sk) {

                    var sp = SPECIMENS[sk];

                    // Search for matching organ name in all layers

                    var match = null;

                    sp.layers.forEach(function (layer) {

                      if (match) return;

                      var layerOrgans = sp.organs[layer.id] || [];

                      layerOrgans.forEach(function (org) {

                        if (!match && org.name.toLowerCase() === sel.name.toLowerCase()) match = { organ: org, layer: layer };

                      });

                    });

                    // Also try partial match (e.g. "Heart" matches "3-Chamber Heart")

                    if (!match) {

                      var searchWord = sel.name.split(' ').pop().toLowerCase();

                      sp.layers.forEach(function (layer) {

                        if (match) return;

                        var layerOrgans = sp.organs[layer.id] || [];

                        layerOrgans.forEach(function (org) {

                          if (!match && org.name.toLowerCase().indexOf(searchWord) >= 0) match = { organ: org, layer: layer };

                        });

                      });

                    }

                    if (!match) return null;

                    var isCurrent = sk === specimen;

                    return React.createElement("div", {

                      key: sk,

                      className: "p-2 rounded-lg text-xs " + (isCurrent ? 'bg-cyan-100 border border-cyan-300' : 'bg-white border border-slate-200')

                    },

                      React.createElement("div", { className: "font-bold " + (isCurrent ? 'text-cyan-800' : 'text-slate-700') }, sp.icon + ' ' + sp.name.split('(')[0].trim() + ': ' + match.organ.name),

                      React.createElement("p", { className: "text-[11px] text-slate-600 mt-0.5 leading-relaxed" }, match.organ.fn.substring(0, 120) + (match.organ.fn.length > 120 ? '...' : '')),

                      match.organ.clinical && React.createElement("p", { className: "text-[11px] text-amber-600 mt-0.5 italic" }, '\uD83C\uDFEB ' + match.organ.clinical.substring(0, 80) + '...')

                    );

                  })

                ),

                !sel && React.createElement("p", { className: "text-xs text-cyan-600 italic" }, 'Click organ to compare')

              ),



              // Sidebar

              React.createElement("div", { className: "w-72 space-y-3" },

                // Selected organ detail

                sel && React.createElement("div", { className: "bg-white rounded-xl border p-4" },

                  React.createElement("div", { className: "flex items-center justify-between mb-1" },

                    React.createElement("h4", { className: "text-sm font-bold text-slate-800" }, sel.name),

                    React.createElement("div", { className: "flex gap-1" },

                      React.createElement("button", { "aria-label": "Previous organ",

                        onClick: function () {

                          var idx = organs.findIndex(function (o) { return o.id === sel.id; });

                          if (idx > 0) upd('selectedOrgan', organs[idx - 1].id);

                        },

                        className: "w-6 h-6 rounded bg-slate-100 text-slate-600 text-xs hover:bg-slate-200 flex items-center justify-center"

                      }, '\u25C0'),

                      React.createElement("button", { "aria-label": "Next organ",

                        onClick: function () {

                          var idx = organs.findIndex(function (o) { return o.id === sel.id; });

                          if (idx < organs.length - 1) upd('selectedOrgan', organs[idx + 1].id);

                        },

                        className: "w-6 h-6 rounded bg-slate-100 text-slate-600 text-xs hover:bg-slate-200 flex items-center justify-center"

                      }, '\u25B6')

                    )

                  ),

                  // Embryological origin badge

                  (function () {

                    var devMap = {

                      heart: 'Mesoderm', liver: 'Endoderm', brain: 'Ectoderm', kidney: 'Mesoderm',

                      lung: 'Endoderm', stomach: 'Endoderm', intestine: 'Endoderm', spleen: 'Mesoderm',

                      skin: 'Ectoderm', bone: 'Mesoderm', muscle: 'Mesoderm', nerve: 'Ectoderm',

                      eye: 'Ectoderm (lens) + mesoderm', retina: 'Ectoderm', pancreas: 'Endoderm',

                      blood: 'Mesoderm', thyroid: 'Endoderm'

                    };

                    var sn = sel.name.toLowerCase(); var dev = null;

                    Object.keys(devMap).forEach(function (k) { if (sn.indexOf(k) >= 0) dev = devMap[k]; });

                    var dColors = { Ectoderm: 'bg-blue-50 text-blue-600 border-blue-200', Mesoderm: 'bg-red-50 text-red-600 border-red-200', Endoderm: 'bg-yellow-50 text-yellow-600 border-yellow-200' };

                    var dcKey = dev ? (dev.indexOf('Ecto') >= 0 ? 'Ectoderm' : dev.indexOf('Meso') >= 0 ? 'Mesoderm' : 'Endoderm') : null;

                    return dev ? React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold mr-1 mb-1 border " + (dColors[dcKey] || 'bg-slate-50 text-slate-600 border-slate-200') }, '\uD83E\uDDEC ' + dev) : null;

                  })(),

                  // Tissue type badge

                  (function () {

                    var tissueMap = {

                      heart: 'Cardiac muscle', liver: 'Epithelial', brain: 'Nervous', kidney: 'Epithelial',

                      lung: 'Epithelial', stomach: 'Smooth muscle', intestine: 'Epithelial', spleen: 'Lymphoid',

                      bone: 'Connective', cartilage: 'Connective', skin: 'Epithelial', muscle: 'Skeletal muscle',

                      nerve: 'Nervous', tendon: 'Connective', blood: 'Connective (fluid)', pancreas: 'Glandular',

                      eye: 'Mixed', lens: 'Epithelial', retina: 'Nervous', esophagus: 'Smooth muscle'

                    };

                    var sn = sel.name.toLowerCase(); var tissue = null;

                    Object.keys(tissueMap).forEach(function (k) { if (sn.indexOf(k) >= 0) tissue = tissueMap[k]; });

                    var tColors = {

                      'Cardiac muscle': 'bg-red-100 text-red-600', 'Epithelial': 'bg-emerald-100 text-emerald-600',

                      'Nervous': 'bg-purple-100 text-purple-600', 'Smooth muscle': 'bg-rose-100 text-rose-600',

                      'Lymphoid': 'bg-amber-100 text-amber-600', 'Connective': 'bg-blue-100 text-blue-600',

                      'Skeletal muscle': 'bg-red-100 text-red-600', 'Glandular': 'bg-teal-100 text-teal-600',

                      'Mixed': 'bg-slate-100 text-slate-600', 'Connective (fluid)': 'bg-blue-100 text-blue-600'

                    };

                    return tissue ? React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold mr-1 mb-1 " + (tColors[tissue] || 'bg-slate-100 text-slate-600') }, '\uD83E\uDDA0 ' + tissue) : null;

                  })(),

                  // Organ weight estimate

                  (function () {

                    var weightMap = { heart: '250-350g', liver: '1.4-1.5kg', brain: '1.3-1.4kg', kidney: '120-170g', lung: '0.5-0.6kg', stomach: '150g', spleen: '170g', pancreas: '80g', eye: '7.5g', thyroid: '20-25g', adrenal: '4-5g', gallbladder: '30-50ml' };

                    var w = null; var sn = sel.name.toLowerCase();

                    Object.keys(weightMap).forEach(function (k) { if (sn.indexOf(k) >= 0) w = weightMap[k]; });

                    return w ? React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 mr-1 mb-1" }, '\u2696\uFE0F ' + w + ' ' + 'Human') : null;

                  })(),

                  // System badge

                  (function () {

                    var sn = sel.name.toLowerCase();

                    var sysN = null;

                    var sysBadges = { circulatory: '\u2764\uFE0F Circulatory', digestive: '\uD83C\uDF7D\uFE0F Digestive', respiratory: '\uD83C\uDF2C\uFE0F Respiratory', nervous: '\u26A1 Nervous', skeletal: '\uD83E\uDDB4 Skeletal', muscular: '\uD83D\uDCAA Muscular', excretory: '\uD83D\uDCA7 Excretory', reproductive: '\u2665\uFE0F Reproductive' };

                    var sysCols = { circulatory: 'bg-red-50 text-red-700 border-red-200', digestive: 'bg-amber-50 text-amber-700 border-amber-200', respiratory: 'bg-blue-50 text-blue-700 border-blue-200', nervous: 'bg-purple-50 text-purple-700 border-purple-200', skeletal: 'bg-slate-50 text-slate-700 border-slate-200', muscular: 'bg-red-50 text-red-700 border-red-200', excretory: 'bg-lime-50 text-lime-700 border-lime-200', reproductive: 'bg-pink-50 text-pink-700 border-pink-200' };

                    var sysKW = { circulatory: ['heart', 'aorta', 'artery', 'vein', 'atrium', 'ventricle', 'blood', 'aortic'], digestive: ['stomach', 'liver', 'intestin', 'gizzard', 'crop', 'pancreas', 'gallbladder'], respiratory: ['lung', 'gill', 'trachea', 'swim bladder'], nervous: ['brain', 'nerve', 'spinal', 'eye', 'optic'], skeletal: ['bone', 'skull', 'vertebr', 'femur'], muscular: ['muscle', 'rectus'], excretory: ['kidney', 'nephri'], reproductive: ['gonad', 'ovary', 'testi'] };

                    Object.keys(sysKW).forEach(function (sk) { sysKW[sk].forEach(function (kw) { if (!sysN && sn.indexOf(kw) >= 0) sysN = sk; }); });

                    return sysN ? React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border mb-1 " + sysCols[sysN] }, sysBadges[sysN]) : null;

                  })(),

                  React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed mb-2" }, sel.fn),

                  sel.clinical && React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-200" },

                    React.createElement("span", { className: "text-[11px] font-bold text-amber-700" }, '\uD83C\uDFEB ' + 'Did You Know?'),

                    React.createElement("p", { className: "text-[11px] text-amber-600 leading-relaxed mt-0.5" }, sel.clinical)

                  ),

                  // Position info

                  React.createElement("div", { className: "mt-2 flex gap-2 text-[11px] text-slate-600" },

                    React.createElement("span", null, '\uD83D\uDCCD x:' + Math.round(sel.x * 100) + '% y:' + Math.round(sel.y * 100) + '%'),

                    React.createElement("span", null, '\uD83C\uDFF7 ' + (sel.layer || activeLayer))

                  ),

                  // Clinical correlations

                  (function () {

                    var clinMap = {

                      heart: '\u26A0 Myocardial infarction, arrhythmia, heart murmur',

                      liver: '\u26A0 Hepatitis, cirrhosis, fatty liver disease',

                      lung: '\u26A0 Pneumonia, asthma, COPD, pulmonary embolism',

                      brain: '\u26A0 Stroke (CVA), concussion, meningitis',

                      kidney: '\u26A0 Renal calculi (stones), UTI, nephritis',

                      stomach: '\u26A0 Gastric ulcer, GERD, H. pylori infection',

                      pancreas: '\u26A0 Pancreatitis, diabetes mellitus',

                      spleen: '\u26A0 Splenomegaly, splenic rupture (trauma)',

                      gallbladder: '\u26A0 Cholelithiasis (gallstones), cholecystitis',

                      thyroid: '\u26A0 Hypothyroidism, hyperthyroidism, goiter',

                      eye: '\u26A0 Cataracts, glaucoma, retinal detachment',

                      retina: '\u26A0 Macular degeneration, diabetic retinopathy'

                    };

                    var sn = sel.name.toLowerCase(); var clin = null;

                    Object.keys(clinMap).forEach(function (k) { if (sn.indexOf(k) >= 0) clin = clinMap[k]; });

                    return clin ? React.createElement("div", { className: "text-[11px] text-amber-500 mt-1 italic border-l-2 border-amber-300 pl-2" }, clin) : null;

                  })(),

                  // Related organs info

                  (function () {

                    var relMap = {

                      heart: ['lungs', 'aorta', 'blood vessels'],

                      lungs: ['heart', 'trachea', 'diaphragm'],

                      liver: ['gallbladder', 'stomach', 'intestine'],

                      stomach: ['esophagus', 'liver', 'intestine'],

                      brain: ['spinal cord', 'nerves', 'eyes'],

                      kidneys: ['bladder', 'ureters', 'adrenals']

                    };

                    var sn = sel.name.toLowerCase();

                    var related = null;

                    Object.keys(relMap).forEach(function (k) { if (sn.indexOf(k) >= 0) related = relMap[k]; });

                    return related ? React.createElement("div", { className: "text-[11px] text-slate-600 mt-1" },

                      React.createElement("span", { className: "font-bold" }, '\uD83D\uDD17 ' + 'Related' + ': '),

                      related.join(', ')

                    ) : null;

                  })(),

                  // Action buttons

                  React.createElement("div", { className: "mt-2 flex gap-1" },

                    React.createElement("button", { "aria-label": "Dissection action",

                      onClick: function () {

                        if (typeof callGemini === 'function') {

                          var _aiPrompt = 'Explain the ' + sel.name + ' in a ' + spec.name + ' in simple terms for a biology student. Include: function, location, clinical significance, and one interesting fact.';
                          callGemini(_aiPrompt).then(function(res) {
                            if (addToast) addToast('\uD83E\uDD16 ' + sel.name + ': ' + (res || 'Response received'), 'info', 8000);
                          }).catch(function(err) {
                            if (addToast) addToast('\uD83E\uDD16 AI unavailable: ' + (err.message || err), 'error');
                          });

                        } else if (addToast) {

                          addToast('\uD83E\uDD16 AI not available. ' + sel.name + ': ' + sel.fn.split('.')[0] + '.', 'info');

                        }

                      },

                      className: "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600"

                    }, '\uD83E\uDD16 ' + 'AI Explain'),

                    React.createElement("button", { "aria-label": "Dissection action",

                      onClick: function () {

                        var text = sel.name + '\n' + sel.fn;

                        if (sel.clinical) text += '\n\nFun Fact: ' + sel.clinical;

                        if (navigator.clipboard) navigator.clipboard.writeText(text);

                        if (addToast) addToast('\uD83D\uDCCB ' + 'Copied' + ' ' + sel.name + ' info!', 'success');

                      },

                      className: "px-2 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"

                    }, '\uD83D\uDCCB ' + 'Copy')

                  )

                ),



                // Organ list with search

                !sel && React.createElement("div", { className: "bg-white rounded-xl border p-3" },

                  React.createElement("div", { className: "text-xs font-bold text-slate-700 mb-2" }, (spec.layers[currentLayerIdx] || {}).icon + ' ' + (spec.layers[currentLayerIdx] || {}).name + ' Structures (' + organs.length + ')'),

                  React.createElement("input", {

                    type: "text",

                    placeholder: 'Search organs...',

                    value: d.organSearch || '',

                    onChange: function (e) { upd('organSearch', e.target.value); },

                    className: "w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-blue-400"

                  }),

                  React.createElement("div", { className: "space-y-1 max-h-72 overflow-y-auto" },

                    organs.filter(function (org) {

                      var search = (d.organSearch || '').toLowerCase();

                      if (!search) return true;

                      return org.name.toLowerCase().indexOf(search) >= 0 || org.fn.toLowerCase().indexOf(search) >= 0;

                    }).map(function (org) {

                      var orgSys = null;

                      var orgName = org.name.toLowerCase();

                      var sysKeys = ['circulatory', 'digestive', 'respiratory', 'nervous', 'skeletal', 'muscular', 'excretory', 'reproductive'];

                      var sysKws = { circulatory: ['heart', 'aorta', 'artery', 'vein', 'atrium', 'ventricle', 'blood', 'aortic'], digestive: ['stomach', 'liver', 'intestin', 'gizzard', 'crop', 'pancreas', 'gallbladder'], respiratory: ['lung', 'gill', 'trachea', 'swim bladder'], nervous: ['brain', 'nerve', 'spinal', 'eye', 'optic'], skeletal: ['bone', 'skull', 'vertebr', 'femur'], muscular: ['muscle', 'rectus'], excretory: ['kidney', 'nephri'], reproductive: ['gonad', 'ovary', 'testi', 'oviduct'] };

                      for (var si = 0; si < sysKeys.length; si++) {

                        var kws = sysKws[sysKeys[si]];

                        for (var ki = 0; kws && ki < kws.length; ki++) {

                          if (orgName.indexOf(kws[ki]) >= 0) { orgSys = sysKeys[si]; break; }

                        }

                        if (orgSys) break;

                      }

                      var sysColorsMap = { circulatory: '#ef4444', digestive: '#f59e0b', respiratory: '#3b82f6', nervous: '#8b5cf6', skeletal: '#94a3b8', muscular: '#dc2626', excretory: '#84cc16', reproductive: '#ec4899' };

                      var dotColor = orgSys ? sysColorsMap[orgSys] : '#94a3b8';

                      var isExplored = (d.exploredOrgans || {})[specimen + '|' + org.id];

                      return React.createElement("button", { "aria-label": "Change selected organ",

                        key: org.id,

                        id: 'diss-organ-' + org.id,

                        onClick: function () {
                          upd('selectedOrgan', org.id);
                          if (typeof canvasNarrate === 'function') canvasNarrate('dissection', 'organSelect', 'Selected ' + org.name + '. ' + org.fn.split('.')[0] + '.', { debounce: 500 });
                        },

                        className: "w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-slate-50 transition-all flex items-center gap-1.5 " + (d.selectedOrgan === org.id ? 'bg-amber-50 border border-amber-200 font-bold text-amber-800' : 'text-slate-600')

                      },

                        React.createElement("span", { style: { width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block', flexShrink: 0 } }),

                        React.createElement("span", { className: "flex-1" }, org.name),

                        isExplored && React.createElement("span", { className: "text-[11px] text-green-500" }, '\u2713')

                      );

                    })

                  )

                ),



                // Quiz card

                d.quizMode && quizQ && React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                    React.createElement("span", { className: "text-xs font-bold text-amber-800" }, '\uD83E\uDDE0 ' + 'Identify'),

                    d.quizScore > 0 && React.createElement("span", { className: "text-[11px] font-bold text-green-600 ml-auto" }, '\u2B50 ' + d.quizScore + '/' + (d.quizTotal || 0))

                  ),

                  React.createElement("p", { className: "text-xs text-amber-700 mb-2 italic" }, '"' + quizQ.fn.split('.')[0] + '."'),

                  React.createElement("div", { className: "grid grid-cols-2 gap-1" },

                    quizOptions.map(function (opt) {

                      var fb = d.quizFeedback;

                      var isCorrect = fb && opt.id === quizQ.id;

                      var isChosen = fb && fb.chosen === opt.id;

                      var isWrong = isChosen && !isCorrect;

                      return React.createElement("button", { "aria-label": "Dissection action",

                        key: opt.id, disabled: !!fb,

                        onClick: function () {

                          var correct = opt.id === quizQ.id;

                          upd('quizFeedback', { correct: correct, chosen: opt.id });

                          upd('quizScore', (d.quizScore || 0) + (correct ? 1 : 0));

                          upd('quizTotal', (d.quizTotal || 0) + 1);

                          if (correct) awardStemXP('dissection', 2, 'Correct quiz answer');

                          addToast(correct ? '\u2705 ' + 'Correct!' : '\u274C ' + 'It was' + ' ' + quizQ.name, correct ? 'success' : 'error');
                          upd('quizExplanation', quizQ.fn.split('.').slice(0, 2).join('.') + '.');

                        },

                        className: "px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all " + (isCorrect ? 'border-green-400 bg-green-50 text-green-700' : isWrong ? 'border-red-400 bg-red-50 text-red-600' : fb ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-amber-200 bg-white text-slate-700 hover:border-amber-400')

                      }, opt.name);

                    })

                  ),

                  d.quizFeedback && React.createElement("button", { "aria-label": "Next Question",

                    onClick: function () { upd('quizIdx', (d.quizIdx || 0) + 1); upd('quizFeedback', null); upd('quizExplanation', null); },

                    className: "w-full mt-2 py-1.5 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-700"

                  }, 'Next Question' + ' \u2192'),

                  d.quizExplanation && React.createElement("div", { className: "mt-2 p-2 rounded-lg bg-white border border-amber-200" },
                    React.createElement("span", { className: "text-[11px] font-bold text-amber-600" }, '\uD83D\uDCA1 '),
                    React.createElement("span", { className: "text-[11px] text-slate-600 leading-relaxed" }, d.quizExplanation)
                  )

                ),



                // Layer + specimen info

                React.createElement("div", { className: "bg-slate-50 rounded-xl border p-3" },

                  React.createElement("div", { className: "text-[11px] font-bold text-slate-600 mb-1" }, 'Layer Progress'),

                  spec.layers.map(function (layer) {

                    var done = !!revealedLayers[layer.id];

                    return React.createElement("div", { key: layer.id, className: "flex items-center gap-2 py-0.5" },

                      React.createElement("span", { className: "text-[11px] " + (done ? 'line-through text-slate-600' : 'text-slate-600') }, layer.icon + ' ' + layer.name),

                      done && React.createElement("span", { className: "text-[11px] text-green-500 ml-auto" }, '\u2713')

                    );

                  }),

                  React.createElement("div", { className: "mt-2 pt-2 border-t border-slate-200" },

                    React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed mb-1" }, spec.desc),

                    React.createElement("div", { className: "grid grid-cols-2 gap-1 mt-1" },

                      spec.kingdom && React.createElement("div", null,

                        React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, 'Kingdom'),

                        React.createElement("p", { className: "text-[11px] text-slate-600" }, spec.kingdom)

                      ),

                      spec.phylum && React.createElement("div", null,

                        React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, 'Phylum'),

                        React.createElement("p", { className: "text-[11px] text-slate-600" }, spec.phylum)

                      ),

                      spec.habitat && React.createElement("div", null,

                        React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, 'Habitat'),

                        React.createElement("p", { className: "text-[11px] text-slate-600" }, spec.habitat)

                      ),

                      spec.lifespan && React.createElement("div", null,

                        React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase" }, 'Lifespan'),

                        React.createElement("p", { className: "text-[11px] text-slate-600" }, spec.lifespan)

                      )

                    )

                  )

                ),




                // "Did You Know?" rotating trivia panel
                (function () {
                  var facts = SPECIMEN_TRIVIA[specimen] || [];
                  if (facts.length === 0) return null;
                  var factIdx = Math.floor((Date.now() / 8000)) % facts.length;
                  return React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3" },
                    React.createElement("div", { className: "flex items-center gap-1.5 mb-1" },
                      React.createElement("span", { className: "text-sm" }, '\uD83D\uDCA1'),
                      React.createElement("span", { className: "text-[11px] font-bold text-amber-700" }, 'Did You Know?')
                    ),
                    React.createElement("p", { className: "text-[11px] text-amber-600 leading-relaxed" }, facts[factIdx]),
                    React.createElement("div", { className: "flex gap-0.5 mt-1.5 justify-center" },
                      facts.map(function (_, fi) {
                        return React.createElement("div", {
                          key: fi,
                          className: "w-1 h-1 rounded-full " + (fi === factIdx ? 'bg-amber-500' : 'bg-amber-200')
                        });
                      })
                    )
                  );
                })(),

                // Progress card

                React.createElement("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-3" },

                  React.createElement("div", { className: "flex items-center justify-between mb-1" },

                    React.createElement("span", { className: "text-[11px] font-bold text-blue-700" }, '\uD83D\uDCCA ' + 'Exploration'),

                    React.createElement("span", { className: "text-[11px] font-bold " + (progressPct >= 100 ? 'text-green-600' : 'text-blue-600') }, progressPct + '%')

                  ),

                  React.createElement("div", { className: "w-full h-2 bg-blue-100 rounded-full overflow-hidden" },

                    React.createElement("div", { role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", className: "h-full rounded-full transition-all duration-500 " + (progressPct >= 100 ? 'bg-green-500' : 'bg-blue-500'), style: { width: progressPct + '%' } })

                  ),

                  React.createElement("div", { className: "mt-1 text-[11px] text-blue-500" }, 'Structures Examined'.replace('{count}', exploredCount).replace('{total}', totalOrgansInSpecimen)),

                  progressPct >= 100 && React.createElement("div", { className: "mt-1" },

                    React.createElement("div", { className: "text-[11px] font-bold text-green-600" }, '\u2B50 ' + 'Specimen Complete!'),

                    React.createElement("div", { className: "text-[11px] text-emerald-500 mt-0.5" },

                      '\uD83C\uDFC6 ' + 'Identified'.replace('{count}', Object.keys(d.exploredOrgans || {}).length).replace('{total}', totalOrgansInSpecimen)

                    ),

                    React.createElement("button", { "aria-label": "Generate dissection certificate",

                      onClick: function () {

                        var cert = '\u2728 ' + 'Dissection Certificate' + ' \u2728\n';

                        cert += '\u2500'.repeat(40) + '\n';

                        cert += 'Specimen' + ': ' + spec.icon + ' ' + spec.name + '\n';

                        cert += 'Structures' + ': ' + totalOrgansInSpecimen + '/' + totalOrgansInSpecimen + '\n';

                        cert += 'Layers' + ': ' + spec.layers.length + '\n';

                        cert += 'Quiz Score' + ': ' + (d.quizScore || 0) + '\n';

                        cert += 'Date' + ': ' + new Date().toLocaleDateString() + '\n';

                        cert += '\u2500'.repeat(40) + '\n';

                        cert += 'Verified ✓';

                        if (navigator.clipboard) navigator.clipboard.writeText(cert);

                        if (addToast) addToast('\uD83C\uDF93 ' + 'Certificate copied!', 'success');

                      },

                      className: "mt-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white"

                    }, '\uD83C\uDF93 ' + 'Copy Certificate')

                  )

                ),



                // Specimen stats card

                React.createElement("div", { className: "bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-slate-200 p-3 mb-2" },

                  React.createElement("div", { className: "text-[11px] font-bold text-slate-700 mb-1" }, '\uD83D\uDCC8 ' + 'Specimen Stats'),

                  React.createElement("div", { className: "grid grid-cols-3 gap-2 text-center" },

                    React.createElement("div", null,

                      React.createElement("div", { className: "text-lg font-bold text-blue-600" }, String(totalOrgansInSpecimen)),

                      React.createElement("div", { className: "text-[11px] text-slate-600" }, 'Structures')

                    ),

                    React.createElement("div", null,

                      React.createElement("div", { className: "text-lg font-bold text-emerald-600" }, String(spec.layers.length)),

                      React.createElement("div", { className: "text-[11px] text-slate-600" }, 'Layers')

                    ),

                    React.createElement("div", null,

                      React.createElement("div", { className: "text-lg font-bold text-amber-600" }, String(d.quizScore || 0)),

                      React.createElement("div", { className: "text-[11px] text-slate-600" }, 'Quiz Score')

                    ),

                    React.createElement("div", null,

                      React.createElement("div", { className: "text-lg font-bold text-violet-600" }, (function () {

                        var ts = d.timeSpent || 0;

                        return ts < 60 ? ts + 's' : Math.floor(ts / 60) + 'm';

                      })()),

                      React.createElement("div", { className: "text-[11px] text-slate-600" }, 'Time')

                    )

                  )

                ),

                // Learning Objectives

                React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-3 mb-2" },

                  React.createElement("div", { 

                    className: "text-[11px] font-bold text-emerald-700 mb-1 cursor-pointer",

                    onClick: function () { upd('showObjectives', !d.showObjectives); }

                  }, '\uD83C\uDF93 ' + 'Learning Objectives' + ' ' + (d.showObjectives ? '\u25B2' : '\u25BC')),

                  d.showObjectives && React.createElement("div", { className: "space-y-1" },

                    (spec.objectives || [

                      'Identify major organs and their functions',

                      'Compare organ systems across body layers',

                      'Trace the digestive pathway from ingestion to excretion',

                      'Trace the respiratory pathway and gas exchange',

                      'Locate and name all structures in each layer',

                      'Explain how structure relates to function',

                      'Compare homologous organs across specimens'

                    ]).map(function (obj, oi) {

                      var isComplete = (d.completedObjectives || {})[oi];

                      return React.createElement("div", { 

                        key: oi,

                        onClick: function () {

                          var co = Object.assign({}, d.completedObjectives || {});

                          co[oi] = !co[oi];

                          upd('completedObjectives', co);

                        },

                        className: "flex items-start gap-1.5 text-[11px] cursor-pointer hover:bg-emerald-100 rounded px-1 py-0.5"

                      },

                        React.createElement("span", { className: isComplete ? 'text-emerald-600' : 'text-slate-600' }, isComplete ? '\u2705' : '\u2B1C'),

                        React.createElement("span", { className: isComplete ? 'text-emerald-600 line-through' : 'text-slate-600' }, obj)

                      );

                    })

                  )

                ),

                // Glossary panel

                React.createElement("div", { className: "bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-3" },

                  React.createElement("div", { 

                    className: "text-[11px] font-bold text-violet-700 mb-1 cursor-pointer",

                    onClick: function () { upd('showGlossary', d.showGlossary === false ? true : (d.showGlossary === undefined ? false : !d.showGlossary)); }

                  }, '\uD83D\uDCDA ' + 'Key Terms' + ' ' + (d.showGlossary === false ? '\u25BC' : '\u25B2')),

                  (d.showGlossary !== false) && React.createElement("div", { className: "space-y-1 max-h-40 overflow-y-auto" },

                    [

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

                    ].map(function (g) {

                      return React.createElement("div", { key: g.term, className: "text-[11px]" },

                        React.createElement("span", { className: "font-bold text-violet-700" }, g.term + ': '),

                        React.createElement("span", { className: "text-slate-600" }, g.def)

                      );

                    })

                  )

                )

              )

            )

          );
      })();
    }
  });
