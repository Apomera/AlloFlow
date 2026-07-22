// ── Reduced motion CSS (WCAG 2.3.3), shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// =================================================================
// stem_tool_rocks.js - Rocks & Minerals + Rock Cycle tools
// Extracted from stem_tool_science.js for modular loading
// =================================================================
(function () {
  // Audio system
  var _rockAC = null;
  function getRockAC() { if (!_rockAC) { try { _rockAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_rockAC && _rockAC.state === 'suspended') { try { _rockAC.resume(); } catch(e) {} } return _rockAC; }
  function rockTone(f,d,tp,v) { var ac = getRockAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxRockCrack() { rockTone(300, 0.08, 'sawtooth', 0.06); if (window._alloHaptic) window._alloHaptic('break'); }
  function sfxRockMelt() { rockTone(150, 0.2, 'sine', 0.05); setTimeout(function() { rockTone(120, 0.15, 'sine', 0.04); }, 100); }
  function sfxRockCool() { rockTone(800, 0.06, 'sine', 0.04); setTimeout(function() { rockTone(600, 0.05, 'sine', 0.03); }, 40); }
  function sfxRockClick() { rockTone(600, 0.03, 'sine', 0.04); }
  function sfxRockCorrect() { rockTone(523, 0.08, 'sine', 0.07); setTimeout(function() { rockTone(659, 0.08, 'sine', 0.07); }, 70); setTimeout(function() { rockTone(784, 0.1, 'sine', 0.08); }, 140); }
  if (!document.getElementById('rock-a11y')) { var _s = document.createElement('style'); _s.id = 'rock-a11y'; _s.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }'; document.head.appendChild(_s); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-rocks')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-rocks';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  if (!window.StemLab) { console.warn("StemLab registry not found"); return; }

  // ═══ 🔬 rocks (rocks) ═══
  window.StemLab.registerTool('rocks', {
    icon: '\uD83E\uDEA8',
    label: 'rocks',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'view_all_types', label: 'View igneous, sedimentary, and metamorphic rocks', icon: '\uD83E\uDEA8', check: function(d) { return Object.keys(d.typesViewed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.typesViewed || {}).length + '/3 types'; } },
      { id: 'quiz_score_5', label: 'Score 5+ on the rock identification quiz', icon: '\uD83E\uDDE0', check: function(d) { return (d.quizScore || 0) >= 5; }, progress: function(d) { return (d.quizScore || 0) + '/5'; } },
      { id: 'explore_5_rocks', label: 'Examine 5 different rock specimens', icon: '\uD83D\uDD2C', check: function(d) { return Object.keys(d.rocksViewed || {}).length >= 5; }, progress: function(d) { return Object.keys(d.rocksViewed || {}).length + '/5 rocks'; } }
    ],
    render: function(ctx) {
      // Aliases: maps ctx properties to original variable names
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
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;

      // ── Tool body (rocks) ──
      return (function() {
const d = labToolData.rocks || {};

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, rocks: { ...prev.rocks, [key]: val } }));

          const updMulti = function(obj) {
            setLabToolData(function(prev) {
              var r = Object.assign({}, (prev && prev.rocks) || {});
              Object.assign(r, obj);
              return Object.assign({}, prev, { rocks: r });
            });
          };

          const mode = d.mode || 'landscape';

          // Auto-track rocks viewed
          if (d.selectedRock) {
            var rv = d.rocksViewed || {};
            var tv = d.typesViewed || {};
            var selRockId = d.selectedRock;
            var ROCKS_REF = [
              { id: 'granite', type: 'igneous' }, { id: 'basalt', type: 'igneous' },
              { id: 'obsidian', type: 'igneous' }, { id: 'pumice', type: 'igneous' },
              { id: 'rhyolite', type: 'igneous' }, { id: 'diorite', type: 'igneous' },
              { id: 'andesite', type: 'igneous' }, { id: 'tuff', type: 'igneous' },
              { id: 'sandstone', type: 'sedimentary' }, { id: 'limestone', type: 'sedimentary' },
              { id: 'shale', type: 'sedimentary' }, { id: 'conglom', type: 'sedimentary' },
              { id: 'chalk', type: 'sedimentary' }, { id: 'travertine', type: 'sedimentary' },
              { id: 'marble', type: 'metamorphic' }, { id: 'slate', type: 'metamorphic' },
              { id: 'quartzite', type: 'metamorphic' }, { id: 'gneiss', type: 'metamorphic' },
              { id: 'schist', type: 'metamorphic' }, { id: 'phyllite', type: 'metamorphic' }
            ];
            var rockItem = ROCKS_REF.find(function(r) { return r.id === selRockId; });
            if (rockItem && (!rv[selRockId] || !tv[rockItem.type])) {
              var newRv = Object.assign({}, rv);
              newRv[selRockId] = true;
              var newTv = Object.assign({}, tv);
              newTv[rockItem.type] = true;
              var nextState = Object.assign({}, d, { rocksViewed: newRv, typesViewed: newTv });
              setTimeout(function() {
                updMulti({ rocksViewed: newRv, typesViewed: newTv });
                setTimeout(function() { checkRocksChallenges(nextState); }, 50);
              }, 0);
            }
          }

          var ROCKS_CHALLENGES = [
            { id: 'types_explored', name: 'Petrologist', desc: 'Examine all 3 rock types (Igneous, Sedimentary, Metamorphic)', icon: '⛰️', rp: 15, check: function(s) { var st = s || d || {}; return Object.keys(st.typesViewed || {}).length >= 3; } },
            { id: 'specimens_examined', name: 'Rock Collector', desc: 'Examine 5+ rock specimens', icon: '🔍', rp: 15, check: function(s) { var st = s || d || {}; return Object.keys(st.rocksViewed || {}).length >= 5; } },
            { id: 'quiz_ace', name: 'Earth Science Ace', desc: 'Correctly answer 3 questions in the quiz', icon: '🎓', rp: 20, check: function(s) { var st = s || d || {}; return (st.quizScore || 0) >= 3; } },
            { id: 'vocab_studied', name: 'Vocabulary Master', desc: 'Study 3 key terminology definitions', icon: '📖', rp: 15, check: function(s) { var st = s || d || {}; return (st.vocabLookedUp || []).length >= 3; } },
            { id: 'cycle_interact', name: 'Cycle Creator', desc: 'Perform 3 operations in the Rock Cycle simulator', icon: '🔄', rp: 20, check: function(s) { var st = s || d || {}; return (st.cycleInteractions || 0) >= 3; } }
          ];

          var ROCKS_VOCAB = {
            'Igneous': 'Rock formed from the cooling and solidification of molten magma or lava.',
            'Sedimentary': 'Rock formed by the accumulation, compaction, and cementation of mineral and organic particles over time.',
            'Metamorphic': 'Rock formed when pre-existing rocks are altered by intense heat and pressure without melting.',
            'Lithification': 'The process of turning loose sediment into solid rock through compaction and cementation.',
            'Foliation': 'The layered or banded texture in metamorphic rocks caused by the alignment of minerals under heat and pressure.',
            'Piezoelectric': 'The property of certain materials (like quartz) to generate an electrical charge when mechanically squeezed.',
            'Evaporite': 'A chemical sedimentary rock formed by the precipitation of minerals as water evaporates from a shallow basin.',
            'Crystallization': 'The process by which atoms arrange into a highly structured crystal lattice as magma cools.',
            'Hardness': 'A measure of a mineral\'s resistance to scratching, rated from 1 to 10 on the Mohs scale.',
            'Streak': 'The color of a mineral in powdered form, tested by rubbing it across an unglazed porcelain plate.',
            'Luster': 'The way light reflects off a mineral\'s surface (metallic, vitreous, pearly, earthy, etc.).'
          };

          var checkRocksChallenges = function(customState) {
            var state = customState || d || {};
            var completed = state.completedChallenges || [];
            var newlyCompleted = [];
            var pointsEarned = 0;

            for (var i = 0; i < ROCKS_CHALLENGES.length; i++) {
              var ch = ROCKS_CHALLENGES[i];
              if (completed.indexOf(ch.id) === -1) {
                if (ch.check(state)) {
                  newlyCompleted.push(ch.id);
                  pointsEarned += ch.rp;
                }
              }
            }

            if (newlyCompleted.length > 0) {
              var updatedCompleted = completed.concat(newlyCompleted);
              var newRP = (state.researchPoints || 0) + pointsEarned;
              var newTotal = (state.totalRP || 0) + pointsEarned;
              
              updMulti({
                completedChallenges: updatedCompleted,
                researchPoints: newRP,
                totalRP: newTotal
              });

              sfxRockCorrect();
              if (typeof addToast === 'function') {
                for (var j = 0; j < newlyCompleted.length; j++) {
                  var finishedId = newlyCompleted[j];
                  // findById is null-safe; if the challenge id was renamed,
                  // fall back to a generic message instead of crashing.
                  var fc = window.StemLab && window.StemLab.findById ? window.StemLab.findById(ROCKS_CHALLENGES, finishedId) : null;
                  var name = fc ? fc.name : finishedId;
                  var rp = fc ? fc.rp : 0;
                  addToast({
                    type: 'success',
                    title: 'Challenge Complete!',
                    message: 'Unlocked: ' + name + ' (+' + rp + ' RP)'
                  });
                }
              }
              if (typeof announceToSR === 'function') {
                announceToSR('Challenges updated. You have completed ' + updatedCompleted.length + ' of ' + ROCKS_CHALLENGES.length + ' challenges. Research points: ' + newRP);
              }
            }
          };

          const askPetrologist = function() {
            var q = d.aiQuestion;
            if (!q || !q.trim()) return;
            var targetName = selRock ? selRock.label : (selMineral ? selMineral.label : 'rocks');
            var prompt = 'You are a friendly Earth Science and geology tutor for a ' + (gradeLevel || 'Middle School') + ' student. '
              + 'Answer this question about the geological specimen "' + targetName + '" in 2-3 clear, educational sentences: ' + q;

            updMulti({ aiLoading: true, aiAnswer: '' });
            var apiKey = (typeof props !== 'undefined' && props && props.geminiKey) || '';
            if (!apiKey) {
              if (typeof callGemini === 'function') {
                callGemini(prompt, false, false, 0.6).then(function(resp) {
                  updMulti({ aiAnswer: resp, aiLoading: false });
                }).catch(function() {
                  updMulti({ aiAnswer: 'Connection error. Please try again.', aiLoading: false });
                });
              } else {
                updMulti({ aiAnswer: 'AI Petrologist is currently offline. Key not configured.', aiLoading: false });
              }
              return;
            }

            fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }).then(function(r) { return r.json(); }).then(function(data) {
              var answer = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || 'I could not generate a response. Try again!';
              updMulti({ aiAnswer: answer, aiLoading: false });
            }).catch(function() {
              updMulti({ aiAnswer: 'Connection error. Please try again.', aiLoading: false });
            });
          };

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('rocks', 'init', {
              first: 'Rocks and Minerals Explorer loaded. ' + (mode === 'landscape' ? 'Interactive landscape view active. Click on the volcano, river delta, or mountain zones to explore rock types.' : 'Current mode: ' + mode + '.'),
              repeat: 'Rocks Explorer, mode: ' + mode + '.',
              terse: 'Rocks Explorer.'
            }, { debounce: 800 });
          }


          // ── Rock type data ──

          const ROCK_TYPES = {

            igneous: { label: t('stem.rocks.igneous'), icon: '🌋', color: '#ef4444', desc: t('stem.rocks.formed_from_cooled_magma_or'), process: 'Cooling & Crystallization' },

            sedimentary: { label: t('stem.rocks.sedimentary'), icon: '🏖️', color: '#f59e0b', desc: t('stem.rocks.formed_from_compressed_layers_of'), process: 'Compaction & Cementation' },

            metamorphic: { label: t('stem.rocks.metamorphic'), icon: '⛰️', color: '#8b5cf6', desc: t('stem.rocks.formed_when_existing_rocks_change'), process: t('stem.rock_cycle.heat_pressure') }

          };



          // ── Rock specimens ──

          const ROCKS = [

            { id: 'granite', type: 'igneous', label: t('stem.rocks.granite'), hardness: 6.5, texture: 'coarse-grained', grainColors: ['#d4d4d8', '#fca5a5', '#1e1e1e', '#fafafa'], desc: 'Intrusive igneous rock with visible quartz, feldspar, and mica crystals. Forms deep underground from slowly cooling magma.', uses: 'Countertops, monuments, building stone' },

            { id: 'basalt', type: 'igneous', label: t('stem.rocks.basalt'), hardness: 6, texture: 'fine-grained', grainColors: ['#374151', '#1f2937', '#4b5563', '#111827'], desc: 'Extrusive igneous rock, the most common volcanic rock. Forms when lava cools quickly at the surface.', uses: 'Road aggregate, construction fill' },

            { id: 'obsidian', type: 'igneous', label: t('stem.rocks.obsidian'), hardness: 5.5, texture: 'glassy', grainColors: ['#0f0f0f', '#1a1a2e', '#16213e', '#0a0a0a'], desc: 'Volcanic glass formed when lava cools extremely rapidly. Conchoidal fracture.', uses: 'Surgical scalpels, jewelry, ancient tools' },

            { id: 'pumice', type: 'igneous', label: t('stem.rocks.pumice'), hardness: 6, texture: 'vesicular', grainColors: ['#d6d3d1', '#e7e5e4', '#a8a29e', '#f5f5f4'], desc: 'Light, porous volcanic rock full of gas bubbles. So light it can float on water!', uses: 'Abrasive cleaning, lightweight aggregate' },

            { id: 'rhyolite', type: 'igneous', label: t('stem.rocks.rhyolite'), hardness: 6, texture: 'fine-grained', grainColors: ['#fca5a5', '#e5e7eb', '#d1d5db', '#fecaca'], desc: 'Extrusive equivalent of granite. Light-colored fine-grained volcanic rock, often with flow banding. Rich in silica (>69%). Erupts explosively due to high viscosity.', uses: 'Aggregate, decorative stone, gemstone (thundereggs)' },

            { id: 'diorite', type: 'igneous', label: t('stem.rocks.diorite'), hardness: 6, texture: 'coarse-grained', grainColors: ['#1e1e1e', '#fafafa', '#4b5563', '#e5e7eb'], desc: 'Intrusive igneous rock with a "salt and pepper" appearance. Intermediate composition between granite and gabbro. Contains plagioclase feldspar and hornblende.', uses: 'Building stone, cobblestones, ancient sculptures (Inca)' },

            { id: 'andesite', type: 'igneous', label: t('stem.rocks.andesite'), hardness: 6, texture: 'fine-grained', grainColors: ['#94a3b8', '#9ca3af', '#4b5563', '#d1d5db'], desc: 'Intermediate volcanic rock named after the Andes Mountains. Common at convergent plate boundaries. Often contains visible phenocrysts in a fine matrix (porphyritic texture).', uses: 'Construction aggregate, monuments' },

            { id: 'tuff', type: 'igneous', label: t('stem.rocks.tuff'), hardness: 4, texture: 'vesicular', grainColors: ['#fde68a', '#d6d3d1', '#a8a29e', '#e7e5e4'], desc: 'Consolidated volcanic ash. Formed when explosive eruptions blast fine particles into the air, which settle and lithify. Can contain pumice fragments and glass shards.', uses: 'Building stone (ancient Rome), lightweight concrete, water filtration' },

            { id: 'sandstone', type: 'sedimentary', label: t('stem.rocks.sandstone'), hardness: 6.5, texture: 'clastic', grainColors: ['#d97706', '#fbbf24', '#b45309', '#f59e0b'], desc: 'Made of sand-sized quartz grains cemented together. Often shows cross-bedding from ancient dunes or rivers.', uses: 'Building stone, flagstone, aquifers' },

            { id: 'limestone', type: 'sedimentary', label: t('stem.rocks.limestone'), hardness: 3, texture: 'bioclastic', grainColors: ['#e5e7eb', '#d1d5db', '#f3f4f6', '#fef9c3'], desc: 'Composed mainly of calcite (CaCO\u2083). Often contains fossils. Fizzes with acid!', uses: 'Cement, lime, building stone, chalk' },

            { id: 'shale', type: 'sedimentary', label: t('stem.rocks.shale'), hardness: 3, texture: 'fine-layered', grainColors: ['#94a3b8', '#4b5563', '#9ca3af', '#374151'], desc: 'Made of compressed clay and silt. Splits into thin layers (fissile). Most common sedimentary rock.', uses: 'Bricks, pottery, oil/gas source rock' },

            { id: 'conglom', type: 'sedimentary', label: t('stem.rocks.conglomerate'), hardness: 6, texture: 'clastic-coarse', grainColors: ['#92400e', '#a16207', '#d4d4d8', '#78716c'], desc: 'Contains large rounded pebbles cemented in a fine matrix. Tells us about ancient fast-flowing rivers.', uses: 'Construction aggregate, decorative stone' },

            { id: 'chalk', type: 'sedimentary', label: t('stem.rocks.chalk'), hardness: 1, texture: 'bioclastic', grainColors: ['#fafafa', '#f5f5f4', '#e5e7eb', '#ffffff'], desc: 'Soft, white limestone made of microscopic plankton shells (coccoliths). The White Cliffs of Dover are chalk. Extremely fine-grained, each grain is a tiny fossil!', uses: 'Blackboard chalk, whiting, soil amendment, toothpaste' },

            { id: 'travertine', type: 'sedimentary', label: t('stem.rocks.travertine'), hardness: 4, texture: 'crystalline', grainColors: ['#fef3c7', '#fde68a', '#fafaf9', '#e7e5e4'], desc: 'Chemical sedimentary rock deposited from mineral-rich hot springs and cave systems. Often has a banded, porous appearance. Forms stalactites and stalagmites in caves.', uses: 'Flooring, countertops, building facades (Colosseum in Rome)' },

            { id: 'marble', type: 'metamorphic', label: t('stem.rocks.marble'), hardness: 3.5, texture: 'crystalline', grainColors: ['#fafafa', '#e5e7eb', '#f3f4f6', '#dbeafe'], desc: 'Metamorphosed limestone. Interlocking calcite crystals give it a sugary texture. Used by sculptors for millennia.', uses: 'Sculpture, flooring, tombstones' },

            { id: 'slate', type: 'metamorphic', label: t('stem.rocks.slate'), hardness: 5.5, texture: 'foliated', grainColors: ['#374151', '#475569', '#334155', '#1e293b'], desc: 'Metamorphosed shale. Excellent foliation, splits into flat, smooth sheets.', uses: 'Roofing tiles, chalkboards, flooring' },

            { id: 'quartzite', type: 'metamorphic', label: t('stem.rocks.quartzite'), hardness: 7, texture: 'non-foliated', grainColors: ['#f5f5f4', '#fafaf9', '#e7e5e4', '#e0f2fe'], desc: 'Metamorphosed sandstone. Extremely hard, even harder than granite. Quartz grains fuse together.', uses: 'Railroad ballast, decorative stone' },

            { id: 'gneiss', type: 'metamorphic', label: t('stem.rocks.gneiss'), hardness: 7, texture: 'banded', grainColors: ['#1e1e1e', '#fafafa', '#94a3b8', '#d4d4d8'], desc: 'Shows distinct light and dark mineral banding. Forms under extreme heat and pressure deep in the crust.', uses: 'Decorative stone, construction' },

            { id: 'schist', type: 'metamorphic', label: t('stem.rocks.schist'), hardness: 5, texture: 'foliated', grainColors: ['#78716c', '#a8a29e', '#57534e', '#d6d3d1'], desc: 'Medium-grade metamorphic rock with visible, aligned mica flakes that give it a sparkly, shiny appearance. Forms from shale under moderate heat and pressure. Named for its tendency to split (Greek "schizein" = to split).', uses: 'Decorative landscaping, flagstone, historical millstones' },

            { id: 'phyllite', type: 'metamorphic', label: t('stem.rocks.phyllite'), hardness: 4, texture: 'foliated', grainColors: ['#4b5563', '#94a3b8', '#374151', '#9ca3af'], desc: 'Between slate and schist in metamorphic grade. Has a distinctive silky, satiny sheen from microscopic mica crystals. Crinkled foliation surface (crenulations). The stepping stone between low and medium metamorphism.', uses: 'Decorative stone, garden paths, grave markers' }

          ];



          // ── Mineral data ──

          const MINERALS = [

            { id: 'quartz', label: t('stem.rocks.quartz'), hardness: 7, streak: 'White', luster: 'Vitreous', crystal: 'Hexagonal', color: '#e0f2fe', formula: 'SiO\u2082', desc: 'The second most abundant mineral in the crust of Earth. Forms distinctive six-sided prismatic crystals with pointed terminations. Extremely resistant to weathering. Comes in many colored varieties: amethyst (purple), citrine (yellow), rose quartz (pink), smoky quartz (brown).', uses: 'Electronics (oscillators, watches), glassmaking, abrasives, gemstones', funFact: 'Quartz is piezoelectric (when squeezed, it generates an electric charge). This property makes quartz watches accurate to within 15 seconds per month!', occurrence: 'Found in virtually all rock types worldwide. Major deposits in Brazil, Arkansas (USA), Madagascar, and the Alps.' },

            { id: 'feldspar', label: t('stem.rocks.feldspar'), hardness: 6, streak: 'White', luster: 'Vitreous', crystal: 'Monoclinic/Triclinic', color: '#fce7f3', formula: 'KAlSi\u2083O\u2088', desc: 'The most abundant mineral group on Earth, making up ~60% of the crust. Two main families: orthoclase (potassium) and plagioclase (sodium-calcium). Shows distinctive cleavage at nearly 90\u00B0 angles. Often pink, white, or gray.', uses: 'Ceramics, glass, porcelain, scouring powders, dental products', funFact: 'The name means "field spar" in Swedish because early miners found it in their fields. Moonstone and labradorite are feldspar gemstones!', occurrence: 'Constituent of granite, gneiss, basalt, and most igneous and metamorphic rocks globally.' },

            { id: 'mica', label: t('stem.rocks.mica_muscovite'), hardness: 2.5, streak: 'White', luster: 'Pearly/Vitreous', crystal: 'Monoclinic', color: '#fef9c3', formula: 'KAl\u2082(Si\u2083Al)O\u2081\u2080(OH)\u2082', desc: 'Sheet silicate that peels into thin, flexible, transparent sheets. The "sparkly" mineral in rocks. Two common types: muscovite (light/clear) and biotite (dark/black). Perfect basal cleavage produces incredibly thin layers.', uses: 'Electrical insulation, cosmetics (shimmer), paint filler, window material (historically)', funFact: 'Before glass windows were common, thin sheets of muscovite mica were used as window panes in medieval Russia, hence "Muscovy glass" \u2192 muscovite!', occurrence: 'Common in granites, schists, pegmatites. Major deposits in India, Brazil, Russia, and the USA.' },

            { id: 'calcite', label: t('stem.rocks.calcite'), hardness: 3, streak: 'White', luster: 'Vitreous', crystal: 'Trigonal (Rhombohedral)', color: '#f0fdf4', formula: 'CaCO\u2083', desc: 'The primary mineral in limestone and marble. Shows perfect rhombohedral cleavage, always breaks into parallelogram-shaped pieces. Fizzes vigorously when dilute acid is applied. Some varieties show double refraction (text appears doubled through clear crystals).', uses: 'Cement/concrete, lime production, optical instruments, antacid tablets (Tums)', funFact: 'Iceland spar (transparent calcite) creates double images! Vikings may have used it as a "sunstone" to navigate on cloudy days by detecting polarized skylight.', occurrence: 'Limestone caves (stalactites/stalagmites), coral reefs, chalk cliffs, marble deposits worldwide.' },

            { id: 'halite', label: t('stem.rocks.halite'), hardness: 2.5, streak: 'White', luster: 'Vitreous', crystal: 'Cubic (Isometric)', color: '#ede9fe', formula: t('stem.periodic.nacl'), desc: 'Common table salt! Forms perfect cubic crystals. Tastes salty (one of the few minerals safe to taste-test). Forms when shallow seas or salt lakes evaporate. Can be colorless, white, pink, blue, or red depending on impurities.', uses: 'Food seasoning/preservation, road de-icing, chemical industry, water softening', funFact: 'Roman soldiers were sometimes paid in salt, the word "salary" comes from the Latin "salarium" (salt money). The phrase "worth your salt" comes from this tradition!', occurrence: 'Evaporite deposits in arid regions: Great Salt Lake, Dead Sea, salt mines in Poland (Wieliczka), Germany, and Louisiana.' },

            { id: 'pyrite', label: t('stem.rocks.pyrite'), hardness: 6.5, streak: 'Greenish-black', luster: 'Metallic', crystal: 'Cubic (Isometric)', color: '#fef3c7', formula: 'FeS\u2082', desc: 'Iron sulfide with a brilliant metallic brass-yellow color. Forms perfect cubes, pyritohedrons, and octahedrons. Produces sparks when struck against steel (name from Greek "pyr" = fire). Commonly mistaken for gold but much harder and lighter.', uses: 'Sulfuric acid production, electronics (early crystal radios), decorative stone, gold indicator mineral', funFact: 'Called "fool\u2019s gold" because miners confused it with real gold. You can tell them apart: gold is soft (scratches with a knife), pyrite is hard. Gold leaves a yellow streak, pyrite leaves a greenish-black streak!', occurrence: 'Found in all rock types. Often found alongside real gold deposits! Common in coal, hydrothermal veins, and sedimentary rocks.' },

            { id: 'talc', label: t('stem.rocks.talc'), hardness: 1, streak: 'White', luster: 'Pearly/Waxy', crystal: 'Monoclinic', color: '#f0fdf4', formula: 'Mg\u2083Si\u2084O\u2081\u2080(OH)\u2082', desc: 'The softest known mineral, number 1 on the Mohs scale. Can be scratched with a fingernail! Has a soapy, greasy feel. Forms flat, foliated masses. Color ranges from white to pale green to gray. Metamorphic mineral formed from magnesium-rich rocks.', uses: 'Talcum powder, ceramics, paint filler, paper coating, cosmetics', funFact: 'Soapstone (used for carving and countertops) is a rock made mostly of talc. It was used by ancient cultures worldwide to carve cooking vessels because it retains heat well!', occurrence: 'Metamorphic rocks (ultramafic environments). Major deposits in China, India, USA (Vermont), France, and Brazil.' },

            { id: 'diamond', label: t('stem.rocks.diamond'), hardness: 10, streak: 'None (too hard)', luster: 'Adamantine', crystal: 'Cubic (Isometric)', color: '#f0f9ff', formula: 'C', desc: 'Pure crystallized carbon, the hardest natural substance on Earth. Forms deep in the mantle (150+ km below surface) under extreme pressure and temperature. Brought to surface by violent volcanic eruptions in kimberlite pipes. High refractive index creates "fire" (rainbow flashes).', uses: 'Gemstones, cutting/grinding tools, drill bits, thermal conductors, optical windows', funFact: 'Diamond and graphite (pencil lead) are both pure carbon! The only difference is how the carbon atoms are arranged. Diamond is the hardest mineral; graphite is one of the softest. Same atoms, completely different properties!', occurrence: 'Kimberlite pipes in South Africa, Russia, Australia, Canada, Botswana. Also found in river gravels (alluvial deposits).' },

            { id: 'magnetite', label: t('stem.rocks.magnetite'), hardness: 5.5, streak: 'Black', luster: 'Metallic/Submetallic', crystal: 'Cubic (Isometric)', color: '#1f2937', formula: 'Fe\u2083O\u2084', desc: 'The most magnetic naturally occurring mineral on Earth. Strongly attracted to magnets and can itself act as a natural magnet ("lodestone"). Black, heavy, and opaque. Important iron ore mineral. Octahedral crystal habit.', uses: 'Iron/steel production, magnetic recording media, heavy concrete, water purification', funFact: 'Lodestone (naturally magnetized magnetite) was the first compass! Ancient Chinese and Greek navigators used floating lodestones to find north. Magnetite crystals have even been found in the brains of pigeons and sea turtles, helping them navigate!', occurrence: 'Igneous and metamorphic rocks worldwide. Major deposits in Sweden (Kiruna), Australia, Brazil, South Africa, and Minnesota (USA).' },

            { id: 'hematite', label: t('stem.rocks.hematite'), hardness: 5.5, streak: 'Red-brown', luster: 'Metallic/Earthy', crystal: 'Trigonal', color: '#991b1b', formula: 'Fe\u2082O\u2083', desc: 'The most important iron ore mineral. Name from Greek "haima" (blood) due to its red streak. Can appear metallic silver-gray (specular hematite) or earthy red-brown. Always produces a distinctive red-brown streak regardless of surface color.', uses: 'Iron/steel production (primary ore), pigment (red ochre), polishing compound (jeweler\u2019s rouge), radiation shielding', funFact: 'The red color of Mars comes from hematite! NASA\u2019s rovers have confirmed that the Martian soil is rich in iron oxide. Hematite was also used by prehistoric humans as the first paint pigment; cave paintings from 40,000 years ago used ground hematite!', occurrence: 'Banded iron formations, volcanic rocks, red soils. Lake Superior region (USA), Minas Gerais (Brazil), Pilbara (Australia), Mars!' },

            { id: 'garnet', label: t('stem.rocks.garnet'), hardness: 7, streak: 'White', luster: 'Vitreous/Resinous', crystal: 'Cubic (Isometric)', color: '#7f1d1d', formula: 'Complex silicates (e.g., Fe\u2083Al\u2082Si\u2083O\u2081\u2082)', desc: 'A group of silicate minerals known for their beautiful dodecahedral crystals (12-sided). Most commonly deep red (almandine), but can be green (tsavorite), orange (spessartine), or even color-changing. Very hard and durable. Excellent for identifying metamorphic grade.', uses: 'Abrasive blasting (sandpaper, waterjet cutting), gemstones, water filtration, indicator mineral in geology', funFact: 'Garnets grow in metamorphic rocks and their size indicates how much heat and pressure the rock experienced. Geologists use garnet composition like a geological thermometer! Some rare garnets change color from blue-green in daylight to purple under incandescent light.', occurrence: 'Schists, gneisses, contact metamorphic zones. Major gem deposits in India, Sri Lanka, Tanzania, Madagascar, and Idaho (USA).' },

            { id: 'olivine', label: t('stem.rocks.olivine'), hardness: 6.5, streak: 'White', luster: 'Vitreous', crystal: 'Orthorhombic', color: '#4d7c0f', formula: '(Mg,Fe)\u2082SiO\u2084', desc: 'Olive-green mineral abundant in the upper mantle of Earth. One of the first minerals to crystallize from cooling magma. Forms small glassy grains in basalt. Gem variety is called peridot. Weathers quickly at the surface, which is why it is rare in sedimentary rocks.', uses: 'Gemstone (peridot), refractory bricks, CO\u2082 capture research, foundry sand', funFact: 'Olivine makes up most of the upper mantle of Earth! There is more olivine inside Earth than any other mineral. The green sand beaches of Hawaii (Papak\u014Dlea Beach) are made of tiny olivine crystals eroded from volcanic rock!', occurrence: 'Basalt, peridotite, meteorites. Hawaii, Canary Islands, Pakistan (peridot gems), mantle xenoliths worldwide.' },

            { id: 'fluorite', label: t('stem.rocks.fluorite'), hardness: 4, streak: 'White', luster: 'Vitreous', crystal: 'Cubic (Isometric)', color: '#7c3aed', formula: 'CaF\u2082', desc: 'Known as the "most colorful mineral in the world", comes in virtually every color: purple, green, blue, yellow, pink, and even colorless. Forms perfect cubic and octahedral crystals. Often fluorescent under UV light (the word "fluorescence" comes from fluorite!). Four directions of perfect cleavage.', uses: 'Steelmaking flux, hydrofluoric acid production, optical lenses, gemstone, decorative carvings', funFact: 'Fluorite literally invented the word "fluorescence"! In 1852, George Stokes described the glow of fluorite under UV light and coined the term from the name of the mineral. The element fluorine is also named after fluorite!', occurrence: 'Hydrothermal veins, limestone cavities. Major deposits in China, Mexico, South Africa, Derbyshire (England, "Blue John"), and Illinois (USA).' },

            { id: 'galena', label: t('stem.rocks.galena'), hardness: 2.5, streak: 'Lead-gray', luster: 'Metallic', crystal: 'Cubic (Isometric)', color: 'var(--allo-stem-text-soft, #94a3b8)', formula: 'PbS', desc: 'Primary ore of lead. Very dense (heavy for its size) with perfect cubic cleavage, fractures into tiny cubes. Bright metallic silver color when fresh, tarnishes to dull gray. Lead-gray streak. Often found with silver as an impurity, making it a source of silver too.', uses: 'Lead production, ammunition, batteries, radiation shielding, early radio crystal detectors', funFact: 'Before transistors were invented, galena crystals were used in "crystal radio" sets! A thin wire ("cat\u2019s whisker") touching a galena crystal could detect radio signals without any battery or electricity. Galena was also used by ancient Egyptians as kohl eyeliner!', occurrence: 'Hydrothermal veins, limestone replacement deposits. Missouri (USA, largest lead deposit), Broken Hill (Australia), Germany, Mexico.' },

            { id: 'gypsum', label: t('stem.rocks.gypsum'), hardness: 2, streak: 'White', luster: 'Vitreous/Silky/Pearly', crystal: 'Monoclinic', color: '#faf5ff', formula: 'CaSO\u2084\u00B72H\u2082O', desc: 'A very soft evaporite mineral (can be scratched with a fingernail). Forms in a variety of habits: tabular crystals (selenite), fibrous masses (satin spar), and granular masses (alabaster). Transparent selenite crystals can be enormous. Contains water in its crystal structure.', uses: 'Drywall/plasterboard, plaster of Paris, cement, fertilizer, alabaster carvings', funFact: 'The Naica Mine in Mexico contains selenite gypsum crystals up to 12 meters (39 feet) long and weighing 55 tons, the largest crystals ever discovered on Earth! The cave is so hot (58\u00B0C/136\u00B0F) that humans can only survive inside for about 10 minutes!', occurrence: 'Evaporite deposits, desert roses (sand-included crystals), cave formations. Major deposits in USA, Mexico, Spain, Italy, and Nova Scotia.' },

            { id: 'sulfur', label: t('stem.periodic.sulfur'), hardness: 2, streak: 'White-yellow', luster: 'Resinous/Adamantine', crystal: 'Orthorhombic', color: '#eab308', formula: 'S', desc: 'Native element with a distinctive bright yellow color and rotten-egg smell when heated. Very light and brittle. Low melting point (115\u00B0C). Burns with a blue flame producing SO\u2082 gas. Associated with volcanic activity and hot springs. One of the few minerals that occurs as a native element.', uses: 'Sulfuric acid (most widely used chemical), gunpowder, rubber vulcanization, fungicides, matches', funFact: 'Sulfur was known to ancient civilizations as "brimstone" (burning stone). It is mentioned in the Bible and in the Odyssey by Homer! The moon Io of Jupiter is covered in sulfur from its 400+ active volcanoes, giving it a bright yellow-orange appearance.', occurrence: 'Volcanic fumaroles, hot springs, evaporite domes (Gulf Coast USA), Sicily, Japan, Indonesia.' },

            { id: 'corundum', label: t('stem.rocks.corundum'), hardness: 9, streak: 'White', luster: 'Adamantine/Vitreous', crystal: 'Trigonal', color: '#1e40af', formula: 'Al\u2082O\u2083', desc: 'Second hardest natural mineral after diamond. Pure corundum is colorless, but trace impurities create spectacular gemstones: chromium makes ruby (red), iron and titanium make sapphire (blue). Can occur in many other colors too. Extremely durable and resistant to chemical weathering.', uses: 'Gemstones (ruby/sapphire), watch bearings, abrasive (emery), laser rods, sandpaper', funFact: 'Ruby and sapphire are the SAME mineral! The only difference is trace element impurities, where 0.01% chromium makes a ruby, while iron+titanium make a sapphire. A "padparadscha" sapphire (pink-orange) is among the rarest gems in the world!', occurrence: 'Metamorphic and igneous rocks. Major ruby deposits in Myanmar, Mozambique. Sapphires from Kashmir, Sri Lanka, Montana (USA), Australia.' },

            { id: 'topaz', label: t('stem.rocks.topaz'), hardness: 8, streak: 'White', luster: 'Vitreous', crystal: 'Orthorhombic', color: '#f97316', formula: 'Al\u2082SiO\u2084(F,OH)\u2082', desc: 'Hard silicate mineral prized as a gemstone. Naturally colorless, yellow, orange, or blue (most blue topaz on the market is heat-treated). Contains fluorine and hydroxyl in its structure. Forms beautiful prismatic crystals with vertical striations. Perfect basal cleavage.', uses: 'Gemstones, Mohs hardness reference (#8), decorative carvings, optical components', funFact: 'The largest uncut topaz crystal ever found (the "El-Dorado Topaz" from Brazil) weighs 6.2 kg (31,000 carats)! Imperial topaz (rare orange-pink variety from Ouro Preto, Brazil) is among the most valuable colored gemstones.', occurrence: 'Granite pegmatites, rhyolite cavities, alluvial deposits. Major sources: Brazil (Minas Gerais), Pakistan, Russia (Ural Mts), Utah (USA).' }

          ];

          // ── Quiz bank ──

          const QUIZ_BANK = [
            {
              q: __alloT('stem.rocks.which_rock_type_forms_from_cooled_magma', 'Which rock type forms from cooled magma?'),
              a: t('stem.rocks.igneous'),
              options: [t('stem.rocks.igneous'), t('stem.rocks.sedimentary'), t('stem.rocks.metamorphic'), 'Organic'],
              concept: 'Igneous',
              wrongFeedback: [
                __alloT('stem.rocks.correct_igneous_rocks_solidify_from_molten_magma', 'Correct! Igneous rocks solidify from molten magma.'),
                __alloT('stem.rocks.incorrect_sedimentary_rocks_form_from_compressed_layers_of', 'Incorrect. Sedimentary rocks form from compressed layers of sediment.'),
                __alloT('stem.rocks.incorrect_metamorphic_rocks_form_from_existing_rocks_changed', 'Incorrect. Metamorphic rocks form from existing rocks changed by heat and pressure.'),
                __alloT('stem.rocks.incorrect_organic_materials_form_coal_but_not_directly', 'Incorrect. Organic materials form coal but not directly from cooled magma.')
              ]
            },
            {
              q: __alloT('stem.rocks.what_process_turns_sediment_into_sedimentary_rock', 'What process turns sediment into sedimentary rock?'),
              a: 'Compaction and cementation',
              options: ['Compaction and cementation', 'Melting', 'Cooling', 'Erosion'],
              concept: 'Lithification',
              wrongFeedback: [
                __alloT('stem.rocks.correct_compaction_and_cementation_bind_sediment_into_rock', 'Correct! Compaction and cementation bind sediment into rock.'),
                __alloT('stem.rocks.incorrect_melting_produces_magma_leading_to_igneous_rocks', 'Incorrect. Melting produces magma, leading to igneous rocks.'),
                __alloT('stem.rocks.incorrect_cooling_solidifies_magma_into_igneous_rocks', 'Incorrect. Cooling solidifies magma into igneous rocks.'),
                __alloT('stem.rocks.incorrect_erosion_breaks_rocks_down_rather_than_building', 'Incorrect. Erosion breaks rocks down rather than building them.')
              ]
            },
            {
              q: __alloT('stem.rocks.marble_is_a_metamorphic_form_of_which_rock', 'Marble is a metamorphic form of which rock?'),
              a: t('stem.rocks.limestone'),
              options: [t('stem.rocks.limestone'), t('stem.rocks.sandstone'), t('stem.rocks.granite'), t('stem.rocks.basalt')],
              concept: 'Metamorphic',
              wrongFeedback: [
                __alloT('stem.rocks.correct_limestone_transforms_into_marble_under_heat_and', 'Correct! Limestone transforms into marble under heat and pressure.'),
                __alloT('stem.rocks.incorrect_sandstone_metamorphoses_into_quartzite', 'Incorrect. Sandstone metamorphoses into quartzite.'),
                __alloT('stem.rocks.incorrect_granite_is_igneous_and_can_metamorphose_into', 'Incorrect. Granite is igneous and can metamorphose into gneiss.'),
                __alloT('stem.rocks.incorrect_basalt_is_volcanic_igneous_and_does_not', 'Incorrect. Basalt is volcanic igneous and does not form marble.')
              ]
            },
            {
              q: __alloT('stem.rocks.which_mineral_is_the_hardest_on_the_mohs', 'Which mineral is the hardest on the Mohs scale?'),
              a: t('stem.rocks.diamond'),
              options: [t('stem.rocks.diamond'), t('stem.rocks.quartz'), t('stem.rocks.corundum'), t('stem.rocks.topaz')],
              concept: 'Hardness',
              wrongFeedback: [
                __alloT('stem.rocks.correct_diamond_is_rated_at_10_on_the', 'Correct! Diamond is rated at 10 on the Mohs hardness scale.'),
                __alloT('stem.rocks.incorrect_quartz_is_hard_7_but_not_the', 'Incorrect. Quartz is hard (7) but not the hardest.'),
                __alloT('stem.rocks.incorrect_corundum_is_very_hard_9_but_softer', 'Incorrect. Corundum is very hard (9) but softer than diamond.'),
                __alloT('stem.rocks.incorrect_topaz_is_hard_8_but_softer_than', 'Incorrect. Topaz is hard (8) but softer than corundum and diamond.')
              ]
            },
            {
              q: __alloT('stem.rocks.what_is_the_softest_mineral', 'What is the softest mineral?'),
              a: t('stem.rocks.talc'),
              options: [t('stem.rocks.talc'), t('stem.rocks.gypsum'), t('stem.rocks.calcite'), t('stem.rocks.halite')],
              concept: 'Hardness',
              wrongFeedback: [
                __alloT('stem.rocks.correct_talc_is_rated_at_1_on_the', 'Correct! Talc is rated at 1 on the Mohs hardness scale.'),
                __alloT('stem.rocks.incorrect_gypsum_is_rated_at_2_which_is', 'Incorrect. Gypsum is rated at 2, which is harder than talc.'),
                __alloT('stem.rocks.incorrect_calcite_is_rated_at_3_which_is', 'Incorrect. Calcite is rated at 3, which is harder than talc and gypsum.'),
                __alloT('stem.rocks.incorrect_halite_is_table_salt_rated_at_2', 'Incorrect. Halite is table salt, rated at 2.5, harder than talc.')
              ]
            },
            {
              q: __alloT('stem.rocks.obsidian_forms_when_lava_cools', 'Obsidian forms when lava cools...'),
              a: 'Very quickly',
              options: ['Very quickly', 'Very slowly', 'Underground', 'Underwater'],
              concept: 'Crystallization',
              wrongFeedback: [
                __alloT('stem.rocks.correct_obsidian_is_volcanic_glass_formed_by_extremely', 'Correct! Obsidian is volcanic glass formed by extremely rapid cooling.'),
                __alloT('stem.rocks.incorrect_slow_cooling_underground_produces_large_coarse_grains', 'Incorrect. Slow cooling underground produces large coarse grains.'),
                __alloT('stem.rocks.incorrect_intrusion_underground_is_slow_while_obsidian_is', 'Incorrect. Intrusion underground is slow, while obsidian is volcanic.'),
                __alloT('stem.rocks.incorrect_underwater_cooling_can_form_pillow_basalt_but', 'Incorrect. Underwater cooling can form pillow basalt, but rapid air/surface cooling forms obsidian.')
              ]
            },
            {
              q: __alloT('stem.rocks.which_rock_can_float_on_water', 'Which rock can float on water?'),
              a: t('stem.rocks.pumice'),
              options: [t('stem.rocks.pumice'), t('stem.rocks.basalt'), t('stem.rocks.marble'), t('stem.rocks.granite')],
              concept: 'Igneous',
              wrongFeedback: [
                __alloT('stem.rocks.correct_pumice_is_filled_with_gas_pockets_vesicles', 'Correct! Pumice is filled with gas pockets (vesicles) and is less dense than water.'),
                __alloT('stem.rocks.incorrect_basalt_is_dense_and_will_sink', 'Incorrect. Basalt is dense and will sink.'),
                __alloT('stem.rocks.incorrect_marble_is_dense_metamorphic_rock_and_will', 'Incorrect. Marble is dense metamorphic rock and will sink.'),
                __alloT('stem.rocks.incorrect_granite_is_dense_intrusive_igneous_rock_and', 'Incorrect. Granite is dense intrusive igneous rock and will sink.')
              ]
            },
            {
              q: __alloT('stem.rocks.what_type_of_rock_is_shale', 'What type of rock is shale?'),
              a: t('stem.rocks.sedimentary'),
              options: [t('stem.rocks.sedimentary'), t('stem.rocks.igneous'), t('stem.rocks.metamorphic'), 'Mineral'],
              concept: 'Sedimentary',
              wrongFeedback: [
                __alloT('stem.rocks.correct_shale_is_a_fine_grained_clastic_sedimentary', 'Correct! Shale is a fine-grained clastic sedimentary rock made of mud and clay.'),
                __alloT('stem.rocks.incorrect_igneous_rocks_form_from_cooled_magma_not', 'Incorrect. Igneous rocks form from cooled magma, not mud deposits.'),
                __alloT('stem.rocks.incorrect_metamorphic_rocks_form_under_heat_and_pressure', 'Incorrect. Metamorphic rocks form under heat and pressure.'),
                __alloT('stem.rocks.incorrect_shale_is_a_rock_composed_of_minerals', 'Incorrect. Shale is a rock composed of minerals, not a single mineral.')
              ]
            },
            {
              q: __alloT('stem.rocks.pyrite_is_also_known_as', 'Pyrite is also known as...'),
              a: "Fool's gold",
              options: ["Fool's gold", "White gold", "Rose gold", "Black gold"],
              concept: 'Luster',
              wrongFeedback: [
                __alloT('stem.rocks.correct_pyrite_has_a_golden_metallic_luster_that', 'Correct! Pyrite has a golden metallic luster that resembles gold.'),
                __alloT('stem.rocks.incorrect_white_gold_is_a_real_gold_alloy', 'Incorrect. White gold is a real gold alloy.'),
                __alloT('stem.rocks.incorrect_rose_gold_is_gold_mixed_with_copper', 'Incorrect. Rose gold is gold mixed with copper.'),
                __alloT('stem.rocks.incorrect_black_gold_refers_to_crude_oil', 'Incorrect. Black gold refers to crude oil.')
              ]
            },
            {
              q: __alloT('stem.rocks.which_rock_shows_distinct_banding', 'Which rock shows distinct banding?'),
              a: t('stem.rocks.gneiss'),
              options: [t('stem.rocks.gneiss'), t('stem.rocks.granite'), t('stem.rocks.basalt'), t('stem.rocks.slate')],
              concept: 'Foliation',
              wrongFeedback: [
                __alloT('stem.rocks.correct_gneiss_displays_prominent_mineral_banding_from_intense', 'Correct! Gneiss displays prominent mineral banding from intense metamorphic heat and pressure.'),
                __alloT('stem.rocks.incorrect_granite_is_massive_and_does_not_show', 'Incorrect. Granite is massive and does not show metamorphic banding.'),
                __alloT('stem.rocks.incorrect_basalt_is_fine_grained_volcanic_rock_without', 'Incorrect. Basalt is fine-grained volcanic rock without layers.'),
                __alloT('stem.rocks.incorrect_slate_is_foliated_but_splits_into_thin', 'Incorrect. Slate is foliated but splits into thin sheets instead of displaying thick bands.')
              ]
            },
            {
              q: __alloT('stem.rocks.limestone_fizzes_when_you_add', 'Limestone fizzes when you add...'),
              a: 'Acid',
              options: ['Acid', t('stem.chem_balance.water'), 'Salt', 'Oil'],
              concept: 'Sedimentary',
              wrongFeedback: [
                __alloT('stem.rocks.correct_hydrochloric_acid_reacts_with_calcium_carbonate_in', 'Correct! Hydrochloric acid reacts with calcium carbonate in limestone to release CO2 gas.'),
                __alloT('stem.rocks.incorrect_water_does_not_react_chemically_to_cause', 'Incorrect. Water does not react chemically to cause limestone to fizz.'),
                __alloT('stem.rocks.incorrect_salt_does_not_react_with_carbonates', 'Incorrect. Salt does not react with carbonates.'),
                __alloT('stem.rocks.incorrect_oil_does_not_react_with_carbonates', 'Incorrect. Oil does not react with carbonates.')
              ]
            },
            {
              q: __alloT('stem.rocks.quartzite_is_metamorphosed', 'Quartzite is metamorphosed...'),
              a: t('stem.rocks.sandstone'),
              options: [t('stem.rocks.sandstone'), t('stem.rocks.limestone'), t('stem.rocks.shale'), t('stem.rocks.granite')],
              concept: 'Metamorphic',
              wrongFeedback: [
                __alloT('stem.rocks.correct_sandstone_fuses_under_heat_and_pressure_into', 'Correct! Sandstone fuses under heat and pressure into quartzite.'),
                __alloT('stem.rocks.incorrect_limestone_metamorphoses_into_marble', 'Incorrect. Limestone metamorphoses into marble.'),
                __alloT('stem.rocks.incorrect_shale_metamorphoses_into_slate', 'Incorrect. Shale metamorphoses into slate.'),
                __alloT('stem.rocks.incorrect_granite_is_igneous_and_does_not_form', 'Incorrect. Granite is igneous and does not form quartzite.')
              ]
            },
            {
              q: __alloT('stem.rocks.rhyolite_is_the_extrusive_equivalent_of', 'Rhyolite is the extrusive equivalent of...'),
              a: t('stem.rocks.granite'),
              options: [t('stem.rocks.granite'), t('stem.rocks.basalt'), 'Gabbro', t('stem.rocks.diorite')],
              concept: 'Igneous',
              wrongFeedback: [
                __alloT('stem.rocks.correct_both_granite_and_rhyolite_are_high_silica', 'Correct! Both granite and rhyolite are high-silica rocks; granite is intrusive, rhyolite is extrusive.'),
                __alloT('stem.rocks.incorrect_basalt_is_extrusive_and_equivalent_to_intrusive', 'Incorrect. Basalt is extrusive and equivalent to intrusive gabbro.'),
                __alloT('stem.rocks.incorrect_gabbro_is_intrusive_and_equivalent_to_extrusive', 'Incorrect. Gabbro is intrusive and equivalent to extrusive basalt.'),
                __alloT('stem.rocks.incorrect_diorite_is_intrusive_and_equivalent_to_extrusive', 'Incorrect. Diorite is intrusive and equivalent to extrusive andesite.')
              ]
            },
            {
              q: __alloT('stem.rocks.which_mineral_is_naturally_magnetic', 'Which mineral is naturally magnetic?'),
              a: t('stem.rocks.magnetite'),
              options: [t('stem.rocks.magnetite'), t('stem.rocks.hematite'), t('stem.rocks.pyrite'), t('stem.rocks.galena')],
              concept: 'Luster',
              wrongFeedback: [
                __alloT('stem.rocks.correct_magnetite_is_a_magnetic_iron_oxide_mineral', 'Correct! Magnetite is a magnetic iron oxide mineral.'),
                __alloT('stem.rocks.incorrect_hematite_contains_iron_but_is_not_strongly', 'Incorrect. Hematite contains iron but is not strongly magnetic.'),
                __alloT('stem.rocks.incorrect_pyrite_is_an_iron_sulfide_and_is', 'Incorrect. Pyrite is an iron sulfide and is not magnetic.'),
                __alloT('stem.rocks.incorrect_galena_is_lead_sulfide_and_is_not', 'Incorrect. Galena is lead sulfide and is not magnetic.')
              ]
            },
            {
              q: __alloT('stem.rocks.ruby_and_sapphire_are_both_varieties_of', 'Ruby and sapphire are both varieties of...'),
              a: t('stem.rocks.corundum'),
              options: [t('stem.rocks.corundum'), t('stem.rocks.quartz'), t('stem.rocks.diamond'), t('stem.rocks.topaz')],
              concept: 'Hardness',
              wrongFeedback: [
                __alloT('stem.rocks.correct_rubies_and_sapphires_are_gemstone_forms_of', 'Correct! Rubies and sapphires are gemstone forms of corundum (hardness 9).'),
                __alloT('stem.rocks.incorrect_quartz_forms_amethyst_and_citrine_not_ruby', 'Incorrect. Quartz forms amethyst and citrine, not ruby.'),
                __alloT('stem.rocks.incorrect_diamond_is_pure_carbon', 'Incorrect. Diamond is pure carbon.'),
                __alloT('stem.rocks.incorrect_topaz_is_silicate_and_has_a_different', 'Incorrect. Topaz is silicate and has a different composition.')
              ]
            },
            {
              q: __alloT('stem.rocks.what_gives_mars_its_red_color', 'What gives Mars its red color?'),
              a: 'Hematite (iron oxide)',
              options: ['Hematite (iron oxide)', 'Rust from water', 'Red sand', 'Volcanic dust'],
              concept: 'Streak',
              wrongFeedback: [
                __alloT('stem.rocks.correct_hematite_dust_covers_the_martian_surface_giving', 'Correct! Hematite dust covers the Martian surface, giving it a rusty red hue.'),
                __alloT('stem.rocks.incorrect_general_rust_is_iron_oxide_but_hematite', 'Incorrect. General rust is iron oxide, but hematite is the specific mineral phase.'),
                __alloT('stem.rocks.incorrect_the_sand_is_red_due_to_hematite', 'Incorrect. The sand is red due to hematite coating.'),
                __alloT('stem.rocks.incorrect_volcanic_dust_on_mars_is_not_the', 'Incorrect. Volcanic dust on Mars is not the primary cause of its color.')
              ]
            },
            {
              q: __alloT('stem.rocks.the_word_fluorescence_comes_from_which_mineral', 'The word "fluorescence" comes from which mineral?'),
              a: t('stem.rocks.fluorite'),
              options: [t('stem.rocks.fluorite'), t('stem.rocks.quartz'), t('stem.rocks.diamond'), t('stem.rocks.calcite')],
              concept: 'Luster',
              wrongFeedback: [
                __alloT('stem.rocks.correct_george_stokes_named_fluorescence_after_studying_fluorite', 'Correct! George Stokes named fluorescence after studying fluorite under ultraviolet light.'),
                __alloT('stem.rocks.incorrect_quartz_does_not_commonly_show_fluorescence', 'Incorrect. Quartz does not commonly show fluorescence.'),
                __alloT('stem.rocks.incorrect_diamond_can_fluoresce_but_was_not_the', 'Incorrect. Diamond can fluoresce but was not the origin of the term.'),
                __alloT('stem.rocks.incorrect_calcite_can_fluoresce_but_was_not_the', 'Incorrect. Calcite can fluoresce but was not the origin of the term.')
              ]
            },
            {
              q: __alloT('stem.rocks.chalk_is_made_of_tiny_shells_from', 'Chalk is made of tiny shells from...'),
              a: 'Microscopic plankton',
              options: ['Microscopic plankton', 'Snails', 'Clams', 'Coral'],
              concept: 'Sedimentary',
              wrongFeedback: [
                __alloT('stem.rocks.correct_chalk_is_composed_of_tiny_coccolith_shells', 'Correct! Chalk is composed of tiny coccolith shells from microscopic marine plankton.'),
                __alloT('stem.rocks.incorrect_snail_shells_are_too_large_and_form', 'Incorrect. Snail shells are too large and form coquina.'),
                __alloT('stem.rocks.incorrect_clam_shells_form_coquina_or_fossiliferous_limestone', 'Incorrect. Clam shells form coquina or fossiliferous limestone.'),
                __alloT('stem.rocks.incorrect_coral_reefs_form_reef_limestone_not_chalk', 'Incorrect. Coral reefs form reef limestone, not chalk.')
              ]
            },
            {
              q: __alloT('stem.rocks.diorite_has_what_distinctive_appearance', 'Diorite has what distinctive appearance?'),
              a: 'Salt and pepper',
              options: ['Salt and pepper', 'Solid black', 'Striped', 'Glassy'],
              concept: 'Igneous',
              wrongFeedback: [
                __alloT('stem.rocks.correct_diorite_is_intrusive_with_a_speckled_salt', 'Correct! Diorite is intrusive with a speckled salt-and-pepper look from light plagioclase and dark hornblende.'),
                __alloT('stem.rocks.incorrect_basalt_is_solid_black', 'Incorrect. Basalt is solid black.'),
                __alloT('stem.rocks.incorrect_gneiss_is_striped', 'Incorrect. Gneiss is striped.'),
                __alloT('stem.rocks.incorrect_obsidian_is_glassy', 'Incorrect. Obsidian is glassy.')
              ]
            },
            {
              q: __alloT('stem.rocks.which_mineral_was_used_in_early_crystal_radios', 'Which mineral was used in early crystal radios?'),
              a: t('stem.rocks.galena'),
              options: [t('stem.rocks.galena'), t('stem.rocks.quartz'), t('stem.rocks.diamond'), t('stem.rocks.pyrite')],
              concept: 'Streak',
              wrongFeedback: [
                __alloT('stem.rocks.correct_galena_was_used_as_a_point_contact', 'Correct! Galena was used as a point-contact semiconductor crystal in early radios.'),
                __alloT('stem.rocks.incorrect_quartz_is_used_for_oscillation_not_crystal', 'Incorrect. Quartz is used for oscillation, not crystal detection.'),
                __alloT('stem.rocks.incorrect_diamond_is_not_a_suitable_semiconductor_for', 'Incorrect. Diamond is not a suitable semiconductor for crystal radios.'),
                __alloT('stem.rocks.incorrect_pyrite_was_not_the_standard_crystal_for', 'Incorrect. Pyrite was not the standard crystal for early radios.')
              ]
            },
            {
              q: __alloT('stem.rocks.the_green_beaches_of_hawaii_are_made_of', 'The green beaches of Hawaii are made of...'),
              a: t('stem.rocks.olivine'),
              options: [t('stem.rocks.olivine'), 'Emerald', 'Jade', 'Green glass'],
              concept: 'Igneous',
              wrongFeedback: [
                __alloT('stem.rocks.correct_olivine_crystals_eroded_from_basaltic_lava_create', 'Correct! Olivine crystals eroded from basaltic lava create green sand beaches.'),
                __alloT('stem.rocks.incorrect_emerald_is_a_rare_beryl_mineral_not', 'Incorrect. Emerald is a rare beryl mineral, not found in beach sand.'),
                __alloT('stem.rocks.incorrect_jade_is_metamorphic_and_does_not_form', 'Incorrect. Jade is metamorphic and does not form Hawaii beaches.'),
                __alloT('stem.rocks.incorrect_the_sand_is_natural_olivine_not_man', 'Incorrect. The sand is natural olivine, not man-made green glass.')
              ]
            },
            {
              q: __alloT('stem.rocks.which_building_was_made_from_travertine', 'Which building was made from travertine?'),
              a: 'The Colosseum',
              options: ['The Colosseum', 'The Pyramids', 'Stonehenge', 'Taj Mahal'],
              concept: 'Sedimentary',
              wrongFeedback: [
                __alloT('stem.rocks.correct_the_colosseum_in_rome_was_constructed_largely', 'Correct! The Colosseum in Rome was constructed largely of travertine limestone.'),
                __alloT('stem.rocks.incorrect_the_pyramids_are_made_of_standard_limestone', 'Incorrect. The Pyramids are made of standard limestone and granite.'),
                __alloT('stem.rocks.incorrect_stonehenge_is_made_of_sarsen_stones_and', 'Incorrect. Stonehenge is made of sarsen stones and bluestones.'),
                __alloT('stem.rocks.incorrect_the_taj_mahal_is_made_of_marble', 'Incorrect. The Taj Mahal is made of marble.')
              ]
            },
            {
              q: __alloT('stem.rocks.schist_gets_its_sparkly_appearance_from', 'Schist gets its sparkly appearance from...'),
              a: 'Aligned mica flakes',
              options: ['Aligned mica flakes', 'Quartz crystals', 'Gold inclusions', 'Diamond dust'],
              concept: 'Foliation',
              wrongFeedback: [
                __alloT('stem.rocks.correct_aligned_muscovite_and_biotite_mica_flakes_reflect', 'Correct! Aligned muscovite and biotite mica flakes reflect light, making schist sparkle.'),
                __alloT('stem.rocks.incorrect_quartz_crystals_are_glassy_but_do_not', 'Incorrect. Quartz crystals are glassy but do not cause the characteristic schist sheen.'),
                __alloT('stem.rocks.incorrect_schist_does_not_contain_gold_inclusions_as', 'Incorrect. Schist does not contain gold inclusions as a rule.'),
                __alloT('stem.rocks.incorrect_diamond_dust_is_not_present_in_schist', 'Incorrect. Diamond dust is not present in schist.')
              ]
            },
            {
              q: __alloT('stem.rocks.what_makes_quartz_watches_accurate', 'What makes quartz watches accurate?'),
              a: 'Piezoelectric effect',
              options: ['Piezoelectric effect', 'Magnetic field', 'Battery power', 'High density'],
              concept: 'Piezoelectric',
              wrongFeedback: [
                __alloT('stem.rocks.correct_squeezing_quartz_generates_an_electric_charge_causing', 'Correct! Squeezing quartz generates an electric charge, causing precise vibrations.'),
                __alloT('stem.rocks.incorrect_magnetic_fields_do_not_drive_quartz_oscillations', 'Incorrect. Magnetic fields do not drive quartz oscillations directly.'),
                __alloT('stem.rocks.incorrect_the_battery_power_is_just_the_source', 'Incorrect. The battery power is just the source, but the quartz crystal regulation provides the accuracy.'),
                __alloT('stem.rocks.incorrect_density_is_not_related_to_timekeeping_accuracy', 'Incorrect. Density is not related to timekeeping accuracy.')
              ]
            },
            {
              q: __alloT('stem.rocks.where_are_the_largest_crystals_ever_found', 'Where are the largest crystals ever found?'),
              a: 'Naica Mine, Mexico',
              options: ['Naica Mine, Mexico', 'Mount Everest', 'Grand Canyon', 'Sahara Desert'],
              concept: 'Crystallization',
              wrongFeedback: [
                __alloT('stem.rocks.correct_gypsum_crystals_up_to_12_meters_long', 'Correct! Gypsum crystals up to 12 meters long grow in the extreme heat of the Naica Mine.'),
                __alloT('stem.rocks.incorrect_mount_everest_does_not_host_giant_caves', 'Incorrect. Mount Everest does not host giant caves of giant crystals.'),
                __alloT('stem.rocks.incorrect_the_grand_canyon_features_stratified_sedimentary_rocks', 'Incorrect. The Grand Canyon features stratified sedimentary rocks.'),
                __alloT('stem.rocks.incorrect_the_sahara_desert_is_sand_covered_rather', 'Incorrect. The Sahara Desert is sand-covered rather than hosting giant gypsum crystal caves.')
              ]
            },
            {
              q: __alloT('stem.rocks.the_word_salary_comes_from_the_latin_word', 'The word "salary" comes from the Latin word for...'),
              a: 'Salt',
              options: ['Salt', t('stem.periodic.silver'), t('stem.periodic.gold'), 'Stone'],
              concept: 'Hardness',
              wrongFeedback: [
                __alloT('stem.rocks.correct_roman_soldiers_were_sometimes_paid_in_salt', 'Correct! Roman soldiers were sometimes paid in salt (halite), the origin of salarium.'),
                __alloT('stem.rocks.incorrect_silver_was_money_but_not_the_root', 'Incorrect. Silver was money but not the root of salary.'),
                __alloT('stem.rocks.incorrect_gold_was_money_but_not_the_root', 'Incorrect. Gold was money but not the root of salary.'),
                __alloT('stem.rocks.incorrect_stone_was_not_the_root_of_salary', 'Incorrect. Stone was not the root of salary.')
              ]
            },
            {
              q: __alloT('stem.rocks.andesite_is_named_after', 'Andesite is named after...'),
              a: 'The Andes Mountains',
              options: ['The Andes Mountains', 'Andean people', 'A scientist named Ande', 'An ancient city'],
              concept: 'Igneous',
              wrongFeedback: [
                __alloT('stem.rocks.correct_andesite_is_volcanic_rock_typical_of_the', 'Correct! Andesite is volcanic rock typical of the Andes subduction zone.'),
                __alloT('stem.rocks.incorrect_it_was_named_after_the_location_rather', 'Incorrect. It was named after the location rather than the people.'),
                __alloT('stem.rocks.incorrect_there_is_no_scientist_named_ande', 'Incorrect. There is no scientist named Ande.'),
                __alloT('stem.rocks.incorrect_it_was_named_after_the_mountain_range', 'Incorrect. It was named after the mountain range.')
              ]
            },
            {
              q: __alloT('stem.rocks.tuff_is_made_from_consolidated', 'Tuff is made from consolidated...'),
              a: 'Volcanic ash',
              options: ['Volcanic ash', 'River sand', 'Coral reef', 'Glacier ice'],
              concept: 'Igneous',
              wrongFeedback: [
                __alloT('stem.rocks.correct_tuff_is_igneous_rock_composed_of_compacted', 'Correct! Tuff is igneous rock composed of compacted volcanic ash.'),
                __alloT('stem.rocks.incorrect_river_sand_forms_sandstone', 'Incorrect. River sand forms sandstone.'),
                __alloT('stem.rocks.incorrect_coral_reefs_form_limestone', 'Incorrect. Coral reefs form limestone.'),
                __alloT('stem.rocks.incorrect_glacier_ice_forms_glacial_till', 'Incorrect. Glacier ice forms glacial till.')
              ]
            },
            {
              q: __alloT('stem.rocks.which_metamorphic_rock_comes_between_slate_and_schist', 'Which metamorphic rock comes between slate and schist?'),
              a: t('stem.rocks.phyllite'),
              options: [t('stem.rocks.phyllite'), t('stem.rocks.marble'), t('stem.rocks.gneiss'), t('stem.rocks.quartzite')],
              concept: 'Metamorphic',
              wrongFeedback: [
                __alloT('stem.rocks.correct_phyllite_represents_low_to_medium_grade_metamorphism', 'Correct! Phyllite represents low-to-medium grade metamorphism, between slate and schist.'),
                __alloT('stem.rocks.incorrect_marble_is_non_foliated_and_forms_from', 'Incorrect. Marble is non-foliated and forms from limestone.'),
                __alloT('stem.rocks.incorrect_gneiss_is_high_grade_metamorphism_occurring_after', 'Incorrect. Gneiss is high-grade metamorphism, occurring after schist.'),
                __alloT('stem.rocks.incorrect_quartzite_is_non_foliated_metamorphosed_sandstone', 'Incorrect. Quartzite is non-foliated metamorphosed sandstone.')
              ]
            },
            {
              q: __alloT('stem.rocks.garnet_crystals_commonly_have_how_many_sides', 'Garnet crystals commonly have how many sides?'),
              a: '12 (dodecahedral)',
              options: ['12 (dodecahedral)', '4 (tetrahedral)', '6 (cubic)', '8 (octahedral)'],
              concept: 'Crystallization',
              wrongFeedback: [
                __alloT('stem.rocks.correct_garnet_crystals_typically_grow_into_12_sided', 'Correct! Garnet crystals typically grow into 12-sided dodecahedrons.'),
                __alloT('stem.rocks.incorrect_tetrahedrons_have_4_sides_not_characteristic_of', 'Incorrect. Tetrahedrons have 4 sides, not characteristic of garnet.'),
                __alloT('stem.rocks.incorrect_cubic_crystals_6_sides_are_typical_of', 'Incorrect. Cubic crystals (6 sides) are typical of halite or pyrite.'),
                __alloT('stem.rocks.incorrect_octahedral_crystals_8_sides_are_typical_of', 'Incorrect. Octahedral crystals (8 sides) are typical of fluorite or diamond.')
              ]
            }
          ];



          const selRock = d.selectedRock ? ROCKS.find(r => r.id === d.selectedRock) : null;

          const selMineral = d.selectedMineral ? MINERALS.find(m => m.id === d.selectedMineral) : null;

          const quizQ = d.quizMode && QUIZ_BANK[d.quizIdx || 0] ? QUIZ_BANK[d.quizIdx || 0] : null;



          // ── Canvas ref for landscape ──

          var _lastRocksCanvas = null;

          const landscapeRef = function (canvasEl) {

            if (!canvasEl) {

              if (_lastRocksCanvas && _lastRocksCanvas._rocksCleanup) { _lastRocksCanvas._rocksCleanup(); _lastRocksCanvas._rocksInit = false; }

              _lastRocksCanvas = null;

              return;

            }

            _lastRocksCanvas = canvasEl;

            if (canvasEl._rocksInit) return;

            canvasEl._rocksInit = true;

            const W = canvasEl.width = canvasEl.offsetWidth * (window.devicePixelRatio || 1);

            const H = canvasEl.height = canvasEl.offsetHeight * (window.devicePixelRatio || 1);

            const ctx = canvasEl.getContext('2d');
            if (!ctx) { canvasEl._rocksInit = false; return; }

            const dpr = window.devicePixelRatio || 1;

            let tick = 0;

            let hoverZone = null;
            let rocksAlive = true;
            let rocksMotionReduced = false;
            try { rocksMotionReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

            function isRocksHidden() {
              return typeof document !== 'undefined' && !!document.hidden;
            }

            function cancelRocksFrame() {
              if (animId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(animId);
              animId = null;
            }

            function scheduleRocksFrame() {
              if (!rocksAlive || rocksMotionReduced || animId || isRocksHidden()) return;
              if (typeof requestAnimationFrame !== 'function') return;
              animId = requestAnimationFrame(loop);
            }

            function onRocksVisibilityChange() {
              if (!rocksAlive) return;
              if (!canvasEl.isConnected) { canvasEl._rocksCleanup(); return; }
              if (isRocksHidden()) cancelRocksFrame();
              else { cancelRocksFrame(); loop(); }
            }



            const zones = [

              { id: 'volcano', label: '🌋 Volcano (Igneous)', x: 0.12, y: 0.15, w: 0.22, h: 0.55, type: 'igneous' },

              { id: 'river', label: '🏖️ River Delta (Sedimentary)', x: 0.5, y: 0.45, w: 0.28, h: 0.35, type: 'sedimentary' },

              { id: 'mountain', label: '⛰️ Mountain Core (Metamorphic)', x: 0.75, y: 0.08, w: 0.22, h: 0.62, type: 'metamorphic' }

            ];



            function drawLandscape() {

              ctx.clearRect(0, 0, W, H);

              // Sky gradient

              const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.5);

              skyGrad.addColorStop(0, '#0c4a6e');

              skyGrad.addColorStop(1, '#7dd3fc');

              ctx.fillStyle = skyGrad;

              ctx.fillRect(0, 0, W, H * 0.5);



              // Underground gradient

              const groundGrad = ctx.createLinearGradient(0, H * 0.5, 0, H);

              groundGrad.addColorStop(0, '#78350f');

              groundGrad.addColorStop(0.3, '#92400e');

              groundGrad.addColorStop(1, '#451a03');

              ctx.fillStyle = groundGrad;

              ctx.fillRect(0, H * 0.5, W, H * 0.5);



              // Ground surface line

              ctx.beginPath();

              ctx.moveTo(0, H * 0.5);

              for (let x = 0; x <= W; x += 5) {

                const wave = Math.sin(x * 0.01 + tick * 0.01) * 3 * dpr;

                ctx.lineTo(x, H * 0.5 + wave);

              }

              ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();

              ctx.fillStyle = '#65a30d';

              ctx.fill();



              // ── Volcano (left) ──

              ctx.beginPath();

              ctx.moveTo(W * 0.02, H * 0.52);

              ctx.lineTo(W * 0.15, H * 0.12);

              ctx.lineTo(W * 0.18, H * 0.08);

              ctx.lineTo(W * 0.21, H * 0.12);

              ctx.lineTo(W * 0.34, H * 0.52);

              ctx.closePath();

              const volcGrad = ctx.createLinearGradient(W * 0.15, H * 0.08, W * 0.15, H * 0.52);

              volcGrad.addColorStop(0, '#7f1d1d');

              volcGrad.addColorStop(0.4, '#991b1b');

              volcGrad.addColorStop(1, '#57534e');

              ctx.fillStyle = volcGrad;

              ctx.fill();



              // Lava flow

              ctx.beginPath();

              ctx.moveTo(W * 0.17, H * 0.1);

              const lavaWave = Math.sin(tick * 0.05) * 5 * dpr;

              ctx.quadraticCurveTo(W * 0.19 + lavaWave, H * 0.25, W * 0.24, H * 0.42);

              ctx.lineTo(W * 0.22, H * 0.42);

              ctx.quadraticCurveTo(W * 0.17 - lavaWave, H * 0.25, W * 0.16, H * 0.1);

              ctx.closePath();

              const lavaGrad = ctx.createLinearGradient(W * 0.17, H * 0.1, W * 0.17, H * 0.42);

              lavaGrad.addColorStop(0, '#fef3c7');
              lavaGrad.addColorStop(0.15, '#fbbf24');

              lavaGrad.addColorStop(0.5, '#f97316');

              lavaGrad.addColorStop(1, '#dc2626');

              ctx.fillStyle = lavaGrad;

              ctx.fill();



              // Lava particles

              for (let i = 0; i < 6; i++) {

                const px = W * 0.17 + Math.sin(tick * 0.08 + i * 1.2) * 12 * dpr;

                const py = H * 0.06 - Math.abs(Math.sin(tick * 0.06 + i * 0.9)) * 20 * dpr;

                ctx.beginPath();

                ctx.arc(px, py, (2 + Math.sin(tick * 0.1 + i)) * dpr, 0, Math.PI * 2);

                ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#f97316';

                ctx.fill();

              }



              // Magma chamber underground

              ctx.beginPath();

              ctx.ellipse(W * 0.18, H * 0.75, W * 0.08, H * 0.12, 0, 0, Math.PI * 2);

              const magmaGrad = ctx.createRadialGradient(W * 0.18, H * 0.75, 0, W * 0.18, H * 0.75, W * 0.08);

              magmaGrad.addColorStop(0, '#fbbf24');

              magmaGrad.addColorStop(0.5, '#ea580c');

              magmaGrad.addColorStop(1, '#7f1d1d');

              ctx.fillStyle = magmaGrad;

              ctx.fill();



              // ── River & sedimentary layers (center) ──

              // River

              ctx.beginPath();

              ctx.moveTo(W * 0.38, H * 0.48);

              ctx.quadraticCurveTo(W * 0.45, H * 0.46 + Math.sin(tick * 0.02) * 3 * dpr, W * 0.55, H * 0.49);

              ctx.quadraticCurveTo(W * 0.62, H * 0.5, W * 0.7, H * 0.48);

              ctx.lineTo(W * 0.7, H * 0.52);

              ctx.quadraticCurveTo(W * 0.62, H * 0.54, W * 0.55, H * 0.53);

              ctx.quadraticCurveTo(W * 0.45, H * 0.5, W * 0.38, H * 0.52);

              ctx.closePath();

              ctx.fillStyle = '#38bdf8';

              ctx.fill();



              // Sedimentary layers underground

              const layerColors = ['#d97706', '#fbbf24', '#92400e', '#b45309', '#78716c'];

              for (let i = 0; i < 5; i++) {

                const ly = H * 0.55 + i * H * 0.08;

                ctx.fillStyle = layerColors[i];

                ctx.fillRect(W * 0.38, ly, W * 0.32, H * 0.07);

                ctx.strokeStyle = 'rgba(0,0,0,0.15)';

                ctx.lineWidth = 0.5 * dpr;

                ctx.strokeRect(W * 0.38, ly, W * 0.32, H * 0.07);

              }



              // Fossil in layer

              ctx.font = (14 * dpr) + 'px serif';

              ctx.fillStyle = 'rgba(255,255,255,0.5)';

              ctx.fillText('🦴', W * 0.5, H * 0.66);

              ctx.fillText('🐚', W * 0.58, H * 0.74);



              // ── Mountain (right, metamorphic) ──

              ctx.beginPath();

              ctx.moveTo(W * 0.62, H * 0.52);

              ctx.lineTo(W * 0.78, H * 0.06);

              ctx.lineTo(W * 0.82, H * 0.02);

              ctx.lineTo(W * 0.86, H * 0.06);

              ctx.lineTo(W * 0.98, H * 0.52);

              ctx.closePath();

              const mtGrad = ctx.createLinearGradient(W * 0.82, H * 0.02, W * 0.82, H * 0.52);

              mtGrad.addColorStop(0, '#fafafa');

              mtGrad.addColorStop(0.2, '#d1d5db');

              mtGrad.addColorStop(0.5, '#94a3b8');

              mtGrad.addColorStop(1, '#374151');

              ctx.fillStyle = mtGrad;

              ctx.fill();



              // Metamorphic layers folded inside mountain underground

              for (let i = 0; i < 4; i++) {

                ctx.beginPath();

                const baseY = H * 0.6 + i * H * 0.08;

                ctx.moveTo(W * 0.65, baseY);

                const fold = Math.sin(i * 0.8 + tick * 0.005) * 8 * dpr;

                ctx.quadraticCurveTo(W * 0.78, baseY - 10 * dpr + fold, W * 0.92, baseY);

                ctx.strokeStyle = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'][i];

                ctx.lineWidth = 3 * dpr;

                ctx.stroke();

              }



              // Pressure arrows

              const arrowAlpha = 0.3 + Math.sin(tick * 0.04) * 0.15;

              ctx.fillStyle = `rgba(139,92,246,${arrowAlpha})`;

              ctx.font = (16 * dpr) + 'px sans-serif';

              ctx.fillText('→', W * 0.63, H * 0.72);

              ctx.fillText('←', W * 0.93, H * 0.72);

              ctx.fillText('↓', W * 0.8, H * 0.56);



              // ── Always-on zone markers + hover highlights ──

              zones.forEach(z => {

                var zx = z.x * W, zy = z.y * H, zw = z.w * W, zh = z.h * H;

                var isHover = hoverZone === z.id;

                var zColor = ROCK_TYPES[z.type].color;



                // Always-on: subtle zone boundary outline

                ctx.save();

                ctx.globalAlpha = isHover ? 0.6 : 0.15 + Math.sin(tick * 0.03) * 0.05;

                ctx.strokeStyle = zColor;

                ctx.lineWidth = (isHover ? 3 : 1.5) * dpr;

                ctx.setLineDash(isHover ? [6 * dpr, 4 * dpr] : [3 * dpr, 6 * dpr]);

                ctx.strokeRect(zx, zy, zw, zh);

                ctx.setLineDash([]);

                ctx.restore();



                // Always-on: pulsing icon marker at zone center

                var iconScale = 1 + Math.sin(tick * 0.04 + z.x * 10) * 0.15;

                var cxZ = zx + zw / 2, cyZ = zy + zh / 2;

                ctx.save();

                ctx.globalAlpha = isHover ? 1.0 : 0.7;

                // Glow behind icon

                ctx.shadowColor = zColor;

                ctx.shadowBlur = (isHover ? 16 : 8) * dpr;

                ctx.fillStyle = 'rgba(0,0,0,0.4)';

                ctx.beginPath();

                ctx.arc(cxZ, cyZ - 2 * dpr, 14 * dpr * iconScale, 0, Math.PI * 2);

                ctx.fill();

                ctx.shadowBlur = 0;

                // Icon emoji

                ctx.font = 'bold ' + Math.round(18 * dpr * iconScale) + 'px sans-serif';

                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

                ctx.fillStyle = '#fff';

                ctx.fillText(z.id === 'volcano' ? '🌋' : z.id === 'river' ? '🏖️' : '⛰️', cxZ, cyZ);

                ctx.restore();



                // Always-on: label below icon

                ctx.save();

                ctx.globalAlpha = isHover ? 0.95 : 0.55;

                ctx.font = 'bold ' + (isHover ? 12 : 10) * dpr + 'px sans-serif';

                ctx.textAlign = 'center'; ctx.textBaseline = 'top';

                // Text background pill

                var labelText = z.id === 'volcano' ? 'Igneous' : z.id === 'river' ? 'Sedimentary' : 'Metamorphic';

                var labelW = ctx.measureText(labelText).width + 12 * dpr;

                ctx.fillStyle = 'rgba(0,0,0,0.45)';

                ctx.beginPath();

                ctx.roundRect(cxZ - labelW / 2, cyZ + 16 * dpr, labelW, 18 * dpr, 6 * dpr);

                ctx.fill();

                ctx.fillStyle = '#fff';

                ctx.fillText(labelText, cxZ, cyZ + 18 * dpr);

                ctx.restore();



                // Hover: "Click to explore" hint

                if (isHover) {

                  ctx.save();

                  ctx.font = (9 * dpr) + 'px sans-serif';

                  ctx.textAlign = 'center'; ctx.textBaseline = 'top';

                  ctx.fillStyle = 'rgba(255,255,255,0.7)';

                  ctx.fillText('Click to explore →', cxZ, cyZ + 36 * dpr);

                  ctx.restore();

                }

              });



              // Rock cycle arrows overlay

              ctx.strokeStyle = 'rgba(255,255,255,0.4)';

              ctx.lineWidth = 2 * dpr;

              ctx.setLineDash([4 * dpr, 4 * dpr]);

              // Igneous → (weathering) → Sedimentary

              ctx.beginPath(); ctx.moveTo(W * 0.32, H * 0.45); ctx.quadraticCurveTo(W * 0.4, H * 0.38, W * 0.48, H * 0.45); ctx.stroke();

              ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = (8 * dpr) + 'px sans-serif';

              ctx.fillText('Weathering', W * 0.36, H * 0.38);

              // Sedimentary → (heat/pressure) → Metamorphic

              ctx.beginPath(); ctx.moveTo(W * 0.66, H * 0.7); ctx.quadraticCurveTo(W * 0.72, H * 0.65, W * 0.76, H * 0.62); ctx.stroke();

              ctx.fillText(t('stem.rock_cycle.heat_pressure'), W * 0.66, H * 0.62);

              // Metamorphic → (melting) → Igneous (magma)

              ctx.beginPath(); ctx.moveTo(W * 0.65, H * 0.85); ctx.quadraticCurveTo(W * 0.45, H * 0.88, W * 0.28, H * 0.78); ctx.stroke();

              ctx.fillText('Melting', W * 0.42, H * 0.9);

              ctx.setLineDash([]);



              // Magnification

              ctx.font = (10 * dpr) + 'px monospace';

              ctx.fillStyle = 'rgba(255,255,255,0.5)';

              ctx.fillText('🪨 Cross-Section View', 8 * dpr, H - 8 * dpr);

            }



            let animId = null;

            function loop() {
              if (!rocksAlive) return;
              animId = null;
              if (!canvasEl.isConnected) { canvasEl._rocksCleanup(); return; }
              if (isRocksHidden()) { cancelRocksFrame(); return; }

              if (!rocksMotionReduced) tick++;

              drawLandscape();

              scheduleRocksFrame();

            }

            loop();



            // Mouse hover for zones

            function onRockMove(e) {

              const rect = canvasEl.getBoundingClientRect();

              const mx = (e.clientX - rect.left) / rect.width;

              const my = (e.clientY - rect.top) / rect.height;

              hoverZone = null;

              zones.forEach(z => {

                if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) hoverZone = z.id;

              });

              canvasEl.style.cursor = hoverZone ? 'pointer' : 'default';
              if (rocksMotionReduced) drawLandscape();

            }



            function onRockClick(e) {

              const rect = canvasEl.getBoundingClientRect();

              const mx = (e.clientX - rect.left) / rect.width;

              const my = (e.clientY - rect.top) / rect.height;

              zones.forEach(z => {

                if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) {

                  const typeRocks = ROCKS.filter(r => r.type === z.type);

                  if (typeRocks.length > 0) {

                    canvasEl._onSelectRock && canvasEl._onSelectRock(typeRocks[0].id, z.type);

                  }

                }

              });

            }

            canvasEl.addEventListener('mousemove', onRockMove);

            canvasEl.addEventListener('click', onRockClick);



            // ── Keyboard zone selector (WCAG 2.1.1) ──

            canvasEl.setAttribute('tabindex', '0');

            canvasEl.setAttribute('role', 'application');

            canvasEl.setAttribute('aria-label', __alloT('stem.rocks.rock_cycle_landscape_aria', 'Rock cycle landscape. Press 1 for volcano igneous rocks, 2 for river delta sedimentary rocks, 3 for mountain core metamorphic rocks.'));

            function onRockKey(e) {

              var zoneIdx = -1;

              if (e.key === '1' || e.key === 'v' || e.key === 'V') zoneIdx = 0;

              else if (e.key === '2' || e.key === 'r' || e.key === 'R') zoneIdx = 1;

              else if (e.key === '3' || e.key === 'm' || e.key === 'M') zoneIdx = 2;

              if (zoneIdx >= 0) {

                e.preventDefault();

                var z = zones[zoneIdx];

                hoverZone = z.id;

                var typeRocks = ROCKS.filter(function (r) { return r.type === z.type; });

                if (typeRocks.length > 0) canvasEl._onSelectRock && canvasEl._onSelectRock(typeRocks[0].id, z.type);
                if (rocksMotionReduced) drawLandscape();

              }

            }

            canvasEl.addEventListener('keydown', onRockKey);



            const ro = new ResizeObserver(function () {

              var newW = canvasEl.offsetWidth * dpr;

              var newH = canvasEl.offsetHeight * dpr;

              if (Math.abs(canvasEl.width - newW) > 1 || Math.abs(canvasEl.height - newH) > 1) {

                canvasEl.width = newW;

                canvasEl.height = newH;
                if (rocksMotionReduced) drawLandscape();

              }

            });

            ro.observe(canvasEl);

            canvasEl._rocksRO = ro;
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onRocksVisibilityChange);

            canvasEl._rocksCleanup = function () {
              rocksAlive = false;

              cancelRocksFrame();

              canvasEl.removeEventListener('mousemove', onRockMove);

              canvasEl.removeEventListener('click', onRockClick);

              canvasEl.removeEventListener('keydown', onRockKey);
              if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onRocksVisibilityChange);

              ro.disconnect();
              canvasEl._rocksRO = null;
              canvasEl._rocksCleanup = null;
              canvasEl._rocksInit = false;

            };

          };



          // ── Rock texture canvas ref ──

          const textureRef = function (canvasEl) {

            if (!canvasEl || !selRock || canvasEl._lastRock === selRock.id) return;

            canvasEl._lastRock = selRock.id;

            const W = canvasEl.width = 200 * (window.devicePixelRatio || 1);

            const H = canvasEl.height = 200 * (window.devicePixelRatio || 1);

            const ctx = canvasEl.getContext('2d');

            const dpr = window.devicePixelRatio || 1;



            // Draw rock texture based on type

            ctx.fillStyle = selRock.grainColors[0];

            ctx.fillRect(0, 0, W, H);



            if (selRock.texture === 'coarse-grained' || selRock.texture === 'clastic-coarse') {

              // Large interlocking crystals/grains

              for (let i = 0; i < 60; i++) {

                ctx.beginPath();

                const x = Math.random() * W, y = Math.random() * H;

                const sz = (8 + Math.random() * 16) * dpr;

                ctx.moveTo(x, y - sz);

                for (let a = 0; a < 6; a++) {

                  const angle = (a / 6) * Math.PI * 2 - Math.PI / 2;

                  ctx.lineTo(x + Math.cos(angle) * sz * (0.7 + Math.random() * 0.3), y + Math.sin(angle) * sz * (0.7 + Math.random() * 0.3));

                }

                ctx.closePath();

                ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];

                ctx.fill();

                ctx.strokeStyle = 'rgba(0,0,0,0.2)';

                ctx.lineWidth = 0.5 * dpr;

                ctx.stroke();

              }

            } else if (selRock.texture === 'fine-grained' || selRock.texture === 'clastic') {

              // Small speckled grains

              for (let i = 0; i < 400; i++) {

                ctx.beginPath();

                ctx.arc(Math.random() * W, Math.random() * H, (1 + Math.random() * 3) * dpr, 0, Math.PI * 2);

                ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];

                ctx.fill();

              }

            } else if (selRock.texture === 'glassy') {

              // Smooth dark with conchoidal fracture lines

              const grad = ctx.createRadialGradient(W * 0.4, H * 0.4, 0, W * 0.5, H * 0.5, W * 0.6);

              grad.addColorStop(0, '#2b2b52');
              grad.addColorStop(0.3, '#1a1a2e');

              grad.addColorStop(1, '#0a0a0a');

              ctx.fillStyle = grad;

              ctx.fillRect(0, 0, W, H);

              for (let i = 0; i < 8; i++) {

                ctx.beginPath();

                ctx.arc(W * 0.3 + i * 8 * dpr, H * 0.5 + Math.sin(i) * 20 * dpr, (15 + i * 5) * dpr, -0.5, 0.5);

                ctx.strokeStyle = 'rgba(100,130,180,0.15)';

                ctx.lineWidth = 1 * dpr;

                ctx.stroke();

              }

            } else if (selRock.texture === 'vesicular') {

              // Light with holes/vesicles

              ctx.fillStyle = '#d6d3d1';

              ctx.fillRect(0, 0, W, H);

              for (let i = 0; i < 50; i++) {

                ctx.beginPath();

                ctx.ellipse(Math.random() * W, Math.random() * H, (3 + Math.random() * 8) * dpr, (2 + Math.random() * 5) * dpr, Math.random() * Math.PI, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(120,113,108,0.3)';

                ctx.fill();

                ctx.strokeStyle = 'rgba(0,0,0,0.15)';

                ctx.lineWidth = 0.5 * dpr;

                ctx.stroke();

              }

            } else if (selRock.texture === 'fine-layered' || selRock.texture === 'foliated') {

              // Thin parallel layers

              for (let y = 0; y < H; y += 4 * dpr) {

                ctx.fillStyle = selRock.grainColors[Math.floor(y / (4 * dpr)) % selRock.grainColors.length];

                ctx.fillRect(0, y, W, 3 * dpr);

                ctx.fillStyle = 'rgba(0,0,0,0.08)';

                ctx.fillRect(0, y + 3 * dpr, W, 1 * dpr);

              }

            } else if (selRock.texture === 'bioclastic') {

              // Light with shell fragments

              ctx.fillStyle = '#e5e7eb';

              ctx.fillRect(0, 0, W, H);

              for (let i = 0; i < 200; i++) {

                ctx.beginPath();

                ctx.arc(Math.random() * W, Math.random() * H, (0.5 + Math.random() * 2) * dpr, 0, Math.PI * 2);

                ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];

                ctx.fill();

              }

              // Shell imprints

              for (let i = 0; i < 5; i++) {

                ctx.beginPath();

                ctx.arc(30 * dpr + Math.random() * (W - 60 * dpr), 30 * dpr + Math.random() * (H - 60 * dpr), (6 + Math.random() * 4) * dpr, 0, Math.PI);

                ctx.strokeStyle = 'rgba(161,161,170,0.4)';

                ctx.lineWidth = 1 * dpr;

                ctx.stroke();

              }

            } else if (selRock.texture === 'crystalline' || selRock.texture === 'non-foliated') {

              // Interlocking crystals

              for (let i = 0; i < 80; i++) {

                ctx.beginPath();

                const x = Math.random() * W, y = Math.random() * H;

                const sz = (4 + Math.random() * 10) * dpr;

                ctx.rect(x - sz / 2, y - sz / 2, sz, sz);

                ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];

                ctx.fill();

                ctx.strokeStyle = 'rgba(0,0,0,0.1)';

                ctx.lineWidth = 0.5 * dpr;

                ctx.stroke();

              }

            } else if (selRock.texture === 'banded') {

              // Alternating light/dark bands (wavy)

              for (let y = 0; y < H; y += 8 * dpr) {

                ctx.beginPath();

                ctx.moveTo(0, y);

                for (let x = 0; x <= W; x += 5) {

                  ctx.lineTo(x, y + Math.sin(x * 0.02 + y * 0.01) * 4 * dpr);

                }

                ctx.lineTo(W, y + 8 * dpr);

                for (let x = W; x >= 0; x -= 5) {

                  ctx.lineTo(x, y + 8 * dpr + Math.sin(x * 0.02 + y * 0.01) * 4 * dpr);

                }

                ctx.closePath();

                ctx.fillStyle = Math.floor(y / (8 * dpr)) % 2 === 0 ? '#1e1e1e' : '#d4d4d8';

                ctx.fill();

              }

            }



            // Border

            ctx.strokeStyle = 'rgba(0,0,0,0.2)';

            ctx.lineWidth = 2 * dpr;

            ctx.strokeRect(0, 0, W, H);

          };



          // Cleanup ref

          const cleanupRef = function (el) {

            if (!el) {

              const old = document.querySelector('[data-rocks-canvas]');

              if (old && old._rocksCleanup) { old._rocksCleanup(); if (old._rocksRO) old._rocksRO.disconnect(); }

            }

          };



          return React.createElement("div", { ref: cleanupRef, className: "max-w-4xl mx-auto animate-in fade-in duration-200" },

            // Header

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: function () { setStemLabTool(null); }, className: "transition-colors p-1.5 hover:bg-slate-100 rounded-lg active:scale-[0.97]", 'aria-label': __alloT('stem.rocks.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800 tracking-tight" }, "\uD83E\uDEA8 " + __alloT('stem.rocks.rocks_minerals_explorer', "Rocks & Minerals Explorer")),

              React.createElement("button", { onClick: function () { setStemLabTool('geologyExplorer'); }, title: __alloT('stem.rocks.open_3d_voxel_cross_section', 'Open the 3D voxel cross-section of the crust'), 'aria-label': __alloT('stem.rocks.open_geology_explorer_3d', 'Open Geology Explorer \u2014 3D voxel cross-section'), className: "transition-colors active:scale-[0.97] text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" }, "\u26F0\uFE0F " + __alloT('stem.rocks.explore_in_3d', "Explore in 3D") + " \u2192"),

              React.createElement("div", { className: "flex gap-1 ml-auto" },

                ['landscape', 'rocks', 'minerals', 'mystery', 'quiz', 'weathHunt'].map(function (m) {

                  const modeLabel = m === 'landscape' ? __alloT('stem.rocks.mode_landscape', 'Landscape') : m === 'rocks' ? __alloT('stem.rocks.mode_rocks', 'Rocks') : m === 'minerals' ? __alloT('stem.rocks.mode_minerals', 'Minerals') : m === 'mystery' ? __alloT('stem.rocks.mystery_rock', 'Mystery Rock') : m === 'weathHunt' ? __alloT('stem.rocks.weathering_lab', 'Weathering Lab') : __alloT('stem.rocks.mode_quiz', 'Quiz');

                  return React.createElement("button", { "aria-label": "Switch to " + modeLabel + " mode",

                    key: m, onClick: function () {

                      upd("mode", m);

                      if (m === 'quiz') { upd("quizMode", true); upd("quizIdx", 0); upd("quizScore", 0); upd("quizFeedback", null); }

                      else { upd("quizMode", false); }

                      if (typeof canvasNarrate === 'function') { canvasNarrate('rocks', 'mode_switch', { first: 'Switched to ' + modeLabel + ' mode.', repeat: modeLabel + ' mode.', terse: m + '.' }, { debounce: 500 }); }

                    }, className: "px-3 py-1 rounded-lg text-xs font-bold capitalize " + (mode === m ? 'bg-amber-700 text-white' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.97]')

                  },

                    m === 'landscape' ? '🗺️ ' + __alloT('stem.rocks.mode_landscape', 'Landscape') : m === 'rocks' ? '🪨 ' + __alloT('stem.rocks.mode_rocks', 'Rocks') : m === 'minerals' ? '💎 ' + __alloT('stem.rocks.mode_minerals', 'Minerals') : m === 'mystery' ? '🔍 ' + __alloT('stem.rocks.mystery', 'Mystery') : m === 'weathHunt' ? '⛏️ ' + __alloT('stem.rocks.weathering', 'Weathering') : '🧠 ' + __alloT('stem.rocks.mode_quiz', 'Quiz'));

                })

              )

            ),

            // Challenges Progress Card
            React.createElement("div", {
              className: "mb-3 rounded-xl p-4 border bg-gradient-to-r from-amber-50 to-orange-50 border-orange-200",
              style: { boxShadow: "0 2px 8px rgba(180,83,9,0.06)" }
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("span", { style: { fontSize: "18px" } }, "⭐"),
                  React.createElement("span", { className: "text-sm font-bold text-amber-700" }, (d.researchPoints || 0) + " RP")
                ),
                React.createElement("span", {
                  className: "text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600"
                }, (d.completedChallenges || []).length + "/" + ROCKS_CHALLENGES.length + " " + __alloT('stem.rocks.challenges', "challenges"))
              ),
              React.createElement("div", { className: "w-full rounded-full h-2.5 bg-orange-100/50", style: { boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)" } },
                React.createElement("div", {
                  className: "bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-500",
                  style: { width: Math.min(100, ((d.completedChallenges || []).length / ROCKS_CHALLENGES.length) * 100) + "%", boxShadow: "0 0 8px rgba(245,158,11,0.4)" }
                })
              ),
              React.createElement("div", { className: "flex flex-wrap gap-2 mt-3" },
                ROCKS_CHALLENGES.map(function(ch) {
                  var done = (d.completedChallenges || []).indexOf(ch.id) !== -1;
                  return React.createElement("div", {
                    key: ch.id, title: ch.name + ": " + ch.desc + " (" + ch.rp + " RP)",
                    className: "text-center cursor-default transition-all " + (done ? "drop-shadow-md" : "opacity-25 grayscale"),
                    style: { fontSize: "18px" }
                  }, ch.icon);
                })
              )
            ),

            // ── Topic-accent hero band per mode ──
            (function() {
              var MODE_META = {
                landscape: { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)', icon: '🗺️', title: __alloT('stem.rocks.hero_landscape_title', 'Landscape, the geology you can SEE'),           hint: __alloT('stem.rocks.hero_landscape_hint', 'Volcano, river delta, mountain face. Surface features tell you what\u2019s underneath. Plate tectonics + erosion + time = every landscape. The Hawaiian volcanoes are 30+ million years old; Mt. Etna is 500K.') },
                rocks:     { accent: '#92400e', soft: 'rgba(146,64,14,0.10)',  icon: '🪨', title: __alloT('stem.rocks.hero_rocks_title', 'Rocks: igneous, sedimentary, metamorphic'),     hint: __alloT('stem.rocks.hero_rocks_hint', 'Igneous (cooled magma: granite, basalt), sedimentary (compressed layers: sandstone, limestone), metamorphic (heat + pressure: marble, slate). The rock cycle moves stones between all three over millions of years.') },
                minerals:  { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '💎', title: __alloT('stem.rocks.hero_minerals_title', 'Minerals, the building blocks of rocks'),         hint: __alloT('stem.rocks.hero_minerals_hint', 'Mohs scale 1-10: talc soft, diamond hardest. Streak, luster, cleavage, hardness, color = the 5 ID tests. Quartz is 12% of Earth\u2019s crust; you carry it in every grain of sand.') },
                mystery:   { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '🔍', title: __alloT('stem.rocks.hero_mystery_title', 'Mystery Rock, detective ID'),                  hint: __alloT('stem.rocks.hero_mystery_hint', 'Real geology workflow: observe (color, crystals, layers), test (hardness, streak, fizz with HCl for carbonate), classify. The fizz test alone separates limestone from a pile of look-alikes.') },
                quiz:      { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '🧠', title: __alloT('stem.rocks.hero_quiz_title', 'Quiz, graded ID + classification'),              hint: __alloT('stem.rocks.hero_quiz_hint', 'NGSS MS-ESS2-1: rock cycle as material system. AP ES practice: matching rocks to environment of formation. Builds the visual library so you can ID a rock at the Grand Canyon by sight.') }
              };
              var meta = MODE_META[mode] || MODE_META.landscape;
              return React.createElement('div', {
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
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),



            // ── Landscape mode ──

            mode === 'landscape' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-2 italic" }, __alloT('stem.rocks.landscape_click_zones_hint', "Click landscape zones to explore rock types. Hover to see labels. Keyboard: Tab to canvas, then 1=Volcano, 2=River, 3=Mountain.")),

              React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-amber-200", style: { height: '520px' } },

                React.createElement("canvas", {

                  role: "img", tabIndex: 0, "aria-label": __alloT('stem.rocks.rock_cycle_diagram_aria', "Rock cycle diagram — click a rock type or process to explore how rocks transform."),
                  "data-rocks-canvas": "true",

                  ref: function (el) {

                    landscapeRef(el);

                    if (el) {

                      el._onSelectRock = function (rockId, type) {

                        upd("selectedRock", rockId);

                        upd("selectedType", type);

                        upd("mode", "rocks");

                        if (typeof canvasNarrate === 'function') { canvasNarrate('rocks', 'zone_select', { first: 'Exploring ' + type + ' rocks. Selected ' + rockId + ' from the ' + (type === 'igneous' ? 'volcano zone' : type === 'sedimentary' ? 'river delta zone' : 'mountain core zone') + '.', repeat: type + ' rock: ' + rockId + '.', terse: rockId + '.' }, { debounce: 500 }); }

                      };

                    }

                  },

                  style: { width: '100%', height: '100%' }

                })

              ),

              // Rock cycle legend

              React.createElement("div", { className: "flex justify-center gap-3 mt-3" },

                Object.values(ROCK_TYPES).map(function (rt) {

                  return React.createElement("div", { key: rt.label, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border text-xs font-bold", style: { borderColor: rt.color, color: rt.color } },

                    rt.icon, " ", rt.label);

                })

              ),

              React.createElement("div", { className: "mt-2 bg-amber-50 rounded-xl border border-amber-200 p-3 text-xs text-slate-600" },

                React.createElement("p", { className: "font-bold text-amber-800 mb-1" }, "🔄 " + __alloT('stem.rocks.the_rock_cycle', "The Rock Cycle")),

                React.createElement("p", null, __alloT('stem.rocks.rock_cycle_explanation', "Rocks continuously transform: Igneous rocks weather into sediment → Sediment compacts into Sedimentary rocks → Heat & pressure create Metamorphic rocks → Melting creates magma → Cooling forms new Igneous rocks. The cycle never stops!"))

              )

            ),



            // ── Rocks mode ──

            mode === 'rocks' && React.createElement("div", null,

              // Type filter

              React.createElement("div", { className: "flex gap-2 mb-3" },

                ['all', 'igneous', 'sedimentary', 'metamorphic'].map(function (t) {

                  return React.createElement("button", { key: t, onClick: function () { upd("selectedType", t === 'all' ? null : t); },

                    className: "px-3 py-1 rounded-full text-xs font-bold transition-all " +

                      ((d.selectedType || null) === (t === 'all' ? null : t) ? 'text-white shadow-md' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.97]'),

                    style: (d.selectedType || null) === (t === 'all' ? null : t) ? { background: t === 'all' ? '#78716c' : ROCK_TYPES[t]?.color || '#78716c' } : {}

                  }, t === 'all' ? '📋 ' + __alloT('stem.rocks.filter_all', 'All') : (ROCK_TYPES[t]?.icon || '') + ' ' + ROCK_TYPES[t]?.label);

                })

              ),

              // Rock grid

              React.createElement("div", { className: "grid grid-cols-4 gap-2 mb-3" },

                ROCKS.filter(function (r) { return !d.selectedType || r.type === d.selectedType; }).map(function (rock) {

                  const rt = ROCK_TYPES[rock.type];

                  return React.createElement("button", { key: rock.id, onClick: function () { upd("selectedRock", d.selectedRock === rock.id ? null : rock.id); upd("selectedMineral", null); },

                    className: "p-2 rounded-lg text-[11px] font-bold border-2 transition-all hover:scale-105 text-center " +

                      (d.selectedRock === rock.id ? 'bg-white shadow-lg' : 'bg-slate-50 border-slate-200'),

                    style: d.selectedRock === rock.id ? { borderColor: rt.color, color: rt.color } : {}

                  },

                    React.createElement("div", { className: "text-lg mb-0.5" }, rt.icon),

                    rock.label);

                })

              ),

              // Selected rock detail card

              selRock && React.createElement("div", { className: "bg-white rounded-xl border-2 p-4 animate-in fade-in", style: { borderColor: ROCK_TYPES[selRock.type].color } },

                React.createElement("div", { className: "flex gap-4" },

                  // Texture canvas

                  React.createElement("canvas", { tabIndex: 0, ref: textureRef, role: "img", "aria-label": __alloT('stem.rocks.rock_texture_close_up', "Rock texture close-up"), style: { width: '100px', height: '100px', borderRadius: '12px', border: '2px solid #e5e7eb' } }),

                  React.createElement("div", { className: "flex-1" },

                    React.createElement("h4", { className: "font-bold text-base mb-1", style: { color: ROCK_TYPES[selRock.type].color } }, ROCK_TYPES[selRock.type].icon + " " + selRock.label),

                    React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold mb-2", style: { background: ROCK_TYPES[selRock.type].color + '20', color: ROCK_TYPES[selRock.type].color } }, ROCK_TYPES[selRock.type].label + " Rock"),

                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, selRock.desc),

                  )

                ),

                // Properties

                React.createElement("div", { className: "grid grid-cols-3 gap-2 mt-3" },

                  [

                    { label: t('stem.rocks.hardness_mohs'), value: selRock.hardness + '/10', icon: '💪' },

                    { label: t('stem.rocks.texture'), value: selRock.texture, icon: '🔍' },

                    { label: t('stem.rocks.uses'), value: selRock.uses, icon: '🏗️' }

                  ].map(function (prop) {

                    return React.createElement("div", { key: prop.label, className: "bg-slate-50 rounded-lg p-2 text-center" },

                      React.createElement("p", { className: "text-[11px] text-slate-600 font-bold" }, prop.icon + " " + prop.label),

                      React.createElement("p", { className: "text-xs font-bold text-slate-700 mt-0.5" }, prop.value));

                  })

                ),

                // Mohs scale bar

                React.createElement("div", { className: "mt-3" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, __alloT('stem.rocks.mohs_hardness_scale', "Mohs Hardness Scale")),

                  React.createElement("div", { className: "flex gap-0.5 items-end" },

                    Array.from({ length: 10 }, function (_, i) {

                      const active = i + 1 <= Math.round(selRock.hardness);

                      return React.createElement("div", {

                        key: i, className: "flex-1 rounded-sm transition-all", style: {

                          height: (8 + i * 3) + 'px',

                          background: active ? ROCK_TYPES[selRock.type].color : '#e5e7eb'

                        }

                      });

                    })

                  ),

                  React.createElement("div", { className: "flex justify-between text-[11px] text-slate-600 mt-0.5" },

                    React.createElement("span", null, __alloT('stem.rocks.mohs_min_talc', "1 (Talc)")),

                    React.createElement("span", null, __alloT('stem.rocks.mohs_max_diamond', "10 (Diamond)")))

                ),

                // Igneous Cooling Rate Simulator
                selRock && selRock.type === 'igneous' && (function() {
                  var coolingSpeed = d.coolingSpeed || 'slow';
                  var animProgress = d.coolingProgress || 0;
                  var isAnimActive = d.coolingAnimActive || false;

                  var coolingRef = function(canvasEl) {
                    if (!canvasEl) return;
                    var ctx = canvasEl.getContext('2d');
                    var W = canvasEl.width = 160 * (window.devicePixelRatio || 1);
                    var H = canvasEl.height = 100 * (window.devicePixelRatio || 1);
                    var dpr = window.devicePixelRatio || 1;

                    ctx.clearRect(0,0,W,H);

                    var progress = animProgress / 100;
                    ctx.fillStyle = 'rgba(239, 68, 68, ' + (1 - progress * 0.9) + ')';
                    ctx.fillRect(0,0,W,H);

                    ctx.save();
                    if (coolingSpeed === 'slow') {
                      var numCrystals = 6;
                      ctx.lineWidth = 1.5 * dpr;
                      for (var i = 0; i < numCrystals; i++) {
                        var cx = W * (0.2 + (i % 3) * 0.3);
                        var cy = H * (0.3 + Math.floor(i / 3) * 0.45);
                        var size = 25 * progress * dpr;
                        if (size > 0) {
                          ctx.beginPath();
                          ctx.moveTo(cx, cy - size * 0.5);
                          ctx.lineTo(cx + size * 0.4, cy - size * 0.2);
                          ctx.lineTo(cx + size * 0.3, cy + size * 0.4);
                          ctx.lineTo(cx - size * 0.4, cy + size * 0.3);
                          ctx.closePath();
                          ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];
                          ctx.fill();
                          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                          ctx.stroke();
                        }
                      }
                    } else if (coolingSpeed === 'medium') {
                      var numCrystals = 15;
                      for (var i = 0; i < numCrystals; i++) {
                        var cx = W * (0.15 + (i % 5) * 0.18);
                        var cy = H * (0.2 + Math.floor(i / 5) * 0.3);
                        var size = 12 * progress * dpr;
                        if (size > 0) {
                          ctx.beginPath();
                          ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
                          ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];
                          ctx.fill();
                        }
                      }
                    } else if (coolingSpeed === 'fast') {
                      var numCrystals = 80;
                      for (var i = 0; i < numCrystals; i++) {
                        var cx = W * (0.05 + (i % 10) * 0.1);
                        var cy = H * (0.08 + Math.floor(i / 10) * 0.11);
                        var size = 4 * progress * dpr;
                        if (size > 0) {
                          ctx.beginPath();
                          ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
                          ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];
                          ctx.fill();
                        }
                      }
                    } else {
                      ctx.fillStyle = 'rgba(15, 15, 15, ' + progress + ')';
                      ctx.fillRect(0,0,W,H);
                      if (progress > 0.5) {
                        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                        ctx.lineWidth = 1 * dpr;
                        ctx.beginPath();
                        ctx.arc(W*0.5, H*0.5, 30*dpr, 0, Math.PI*0.5);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.arc(W*0.6, H*0.4, 40*dpr, Math.PI, Math.PI*1.5);
                        ctx.stroke();
                      }
                    }
                    ctx.restore();

                    if (progress < 1) {
                      ctx.fillStyle = 'rgba(251, 191, 36, ' + (0.3 * (1 - progress) * (1 + 0.2 * Math.sin(Date.now() * 0.005))) + ')';
                      ctx.fillRect(0,0,W,H);
                    }
                  };

                  var startCooling = function() {
                    updMulti({ coolingProgress: 0, coolingAnimActive: true });
                    sfxRockMelt();
                    var p = 0;
                    var interval = setInterval(function() {
                      p += 4;
                      upd("coolingProgress", p);
                      if (p >= 100) {
                        clearInterval(interval);
                        upd("coolingAnimActive", false);
                        sfxRockCool();
                      }
                    }, 50);
                  };

                  var speeds = [
                    { id: 'slow', label: __alloT('stem.rocks.speed_slow_label', 'Slow (Intrusive)'), desc: __alloT('stem.rocks.speed_slow_desc', 'Forms deep underground. Atoms have time to form large, visible crystals (e.g. granite).') },
                    { id: 'medium', label: __alloT('stem.rocks.speed_medium_label', 'Medium'), desc: __alloT('stem.rocks.speed_medium_desc', 'Intermediate depth, moderate cooling and crystal sizing.') },
                    { id: 'fast', label: __alloT('stem.rocks.speed_fast_label', 'Fast (Extrusive)'), desc: __alloT('stem.rocks.speed_fast_desc', 'Cools rapidly at surface. Tiny, fine-grained crystals (e.g. basalt).') },
                    { id: 'rapid', label: __alloT('stem.rocks.speed_rapid_label', 'Rapid (Glassy)'), desc: __alloT('stem.rocks.speed_rapid_desc', 'Instant quenching. Atoms frozen in place, no crystals (e.g. obsidian).') }
                  ];
                  var currentSpeed = speeds.find(function(s) { return s.id === coolingSpeed; });

                  return React.createElement("div", { className: "border-t border-slate-100 pt-3 mt-3" },
                    React.createElement("p", { className: "text-xs font-black text-amber-700 mb-2 flex items-center gap-1.5" },
                      React.createElement("span", null, "🌋"),
                      React.createElement("span", null, __alloT('stem.rocks.magma_cooling_simulator_title', "Magma Cooling & Crystallization Simulator"))
                    ),
                    React.createElement("div", { className: "flex flex-col md:flex-row gap-3 items-center" },
                      React.createElement("div", { className: "w-full md:w-1/3 flex flex-col items-center" },
                        React.createElement("canvas", { ref: coolingRef, role: "img", tabIndex: 0, "aria-label": __alloT('stem.rocks.crystal_cooling_diagram_aria', "Crystal cooling-rate diagram — slower cooling grows larger crystals."), style: { width: '130px', height: '80px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'block', background: '#1e293b' } }),
                        React.createElement("button", {
                          disabled: isAnimActive,
                          onClick: startCooling,
                          className: "transition-colors mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-[10px] shadow-sm disabled:opacity-50 active:scale-[0.97]"
                        }, isAnimActive ? __alloT('stem.rocks.cooling_ellipsis', "Cooling...") : "⚡ " + __alloT('stem.rocks.run_solidification', "Run Solidification"))
                      ),
                      React.createElement("div", { className: "flex-1 w-full" },
                        React.createElement("div", { className: "grid grid-cols-4 gap-1 mb-2" },
                          speeds.map(function(s) {
                            return React.createElement("button", {
                              key: s.id,
                              onClick: function() { updMulti({ coolingSpeed: s.id, coolingProgress: 0, coolingAnimActive: false }); sfxRockClick(); },
                              className: "p-1 rounded text-[10px] font-bold text-center border transition-all " +
                                (coolingSpeed === s.id ? "bg-amber-100 border-amber-500 text-amber-800" : "transition-colors bg-slate-50 border-slate-200 text-slate-600 hover:border-amber-200")
                            }, s.label);
                          })
                        ),
                        React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed font-semibold" }, currentSpeed.desc)
                      )
                    )
                  );
                })(),

                // Acid Fizz Test Lab
                React.createElement("div", { className: "border-t border-slate-100 pt-3 mt-3" },
                  React.createElement("p", { className: "text-xs font-black text-violet-700 mb-2 flex items-center gap-1.5" },
                    React.createElement("span", null, "🧪"),
                    React.createElement("span", null, __alloT('stem.rocks.acid_fizz_test_lab', "Acid Fizz Test Lab"))
                  ),
                  React.createElement("p", { className: "text-[11px] text-slate-600 mb-3" },
                    __alloT('stem.rocks.acid_fizz_intro', "Apply dilute hydrochloric acid (HCl) to test for the presence of carbonate minerals. Carbonates react by fizzing vigorously.")
                  ),
                  React.createElement("div", { className: "flex items-center gap-3" },
                    React.createElement("button", {
                      disabled: d.fizzAnimActive,
                      onClick: function() {
                        upd("fizzAnimActive", true);
                        upd("fizzResult", null);
                        sfxRockMelt();
                        var bubbleSoundCount = 0;
                        var bubbleInterval = setInterval(function() {
                          if (bubbleSoundCount < 3) {
                            sfxRockCool();
                            bubbleSoundCount++;
                          } else {
                            clearInterval(bubbleInterval);
                          }
                        }, 250);

                        setTimeout(function() {
                          var isCarbonate = false;
                          var targetId = selRock.id;
                          if (targetId === 'limestone' || targetId === 'marble' || targetId === 'travertine' || targetId === 'chalk') {
                            isCarbonate = true;
                          }

                          var res = "";
                          if (isCarbonate) {
                            res = "🫧 " + __alloT('stem.rocks.fizz_positive', "Fizz! The acid reacted with calcium carbonate in the specimen, releasing carbon dioxide gas:") + " CaCO3 + 2HCl -> CaCl2 + CO2 (gas) + H2O.";
                          } else {
                            res = __alloT('stem.rocks.fizz_no_reaction', "No reaction. The specimen does not contain carbonate minerals, so the acid simply sits on the surface.");
                          }
                          updMulti({ fizzAnimActive: false, fizzResult: res });
                        }, 1200);
                      },
                      className: "px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-xs transition-all shadow-sm disabled:opacity-50 active:scale-[0.97]"
                    }, d.fizzAnimActive ? "🫧 " + __alloT('stem.rocks.dropping_acid', "Dropping Acid...") : "🧪 " + __alloT('stem.rocks.drop_hcl_acid', "Drop HCl Acid")),
                    d.fizzAnimActive && React.createElement("div", { className: "flex items-center gap-1 animate-pulse" },
                      React.createElement("span", { className: "text-lg" }, "🫧"),
                      React.createElement("span", { className: "text-[10px] text-violet-600 font-bold" }, __alloT('stem.rocks.bubbling_reaction_active', "Bubbling reaction active..."))
                    )
                  ),
                  d.fizzResult && React.createElement("p", { className: "text-xs font-bold text-slate-700 mt-2 leading-relaxed animate-in fade-in" },
                    d.fizzResult
                  )
                ),

                // AI Petrologist panel
                React.createElement("div", { className: "border-t border-slate-100 pt-3 mt-3" },
                  React.createElement("p", { className: "text-xs font-black text-slate-700 mb-1 flex items-center gap-1.5" },
                    React.createElement("span", null, "🧠"),
                    React.createElement("span", null, __alloT('stem.rocks.ask_ai_petrologist', "Ask the AI Petrologist"))
                  ),
                  React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" },
                    __alloT('stem.rocks.query_ai_about_prefix', "Query the AI about ") + selRock.label + __alloT('stem.rocks.query_ai_suffix', "'s geologic origin, chemical properties, or tectonic significance.")
                  ),
                  React.createElement("div", { className: "flex gap-2" },
                    React.createElement("input", {
                      type: "text",
                      placeholder: __alloT('stem.rocks.ask_question_placeholder', "Ask a question (e.g., How does this form?)..."),
                      value: d.aiQuestion || '',
                      onChange: function(e) { upd("aiQuestion", e.target.value); },
                      onKeyDown: function(e) { if (e.key === 'Enter') askPetrologist(); },
                      className: "flex-1 px-3 py-1 text-xs border rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    }),
                    React.createElement("button", {
                      disabled: d.aiLoading,
                      onClick: askPetrologist,
                      className: "px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 transition-all disabled:opacity-50 active:scale-[0.97]"
                    }, d.aiLoading ? __alloT('stem.rocks.thinking_ellipsis', "Thinking...") : __alloT('stem.rocks.ask_button', "Ask"))
                  ),
                  d.aiAnswer && React.createElement("div", { className: "mt-2 p-2.5 bg-slate-50 border rounded-lg animate-in slide-in-from-top-1" },
                    React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed font-medium" }, d.aiAnswer)
                  )
                )

              )

            ),



            // ── Minerals mode ──

            mode === 'minerals' && (() => {

              // ── Mineral cross-section canvas ref ──

              var _lastMineralCanvas = null;

              var mineralCrossSectionRef = function (canvasEl) {

                if (!canvasEl || !selMineral || canvasEl._lastMineral === selMineral.id) return;

                canvasEl._lastMineral = selMineral.id;

                var csW = canvasEl.width = 280 * (window.devicePixelRatio || 1);

                var csH = canvasEl.height = 200 * (window.devicePixelRatio || 1);

                var csCtx = canvasEl.getContext('2d');

                var csDpr = window.devicePixelRatio || 1;



                // Background - dark slate for contrast

                csCtx.fillStyle = '#1e293b';

                csCtx.fillRect(0, 0, csW, csH);



                // Inner region for crystal drawing

                var crystalX = csW * 0.08, crystalY = csH * 0.08;

                var crystalW = csW * 0.6, crystalH = csH * 0.7;

                csCtx.fillStyle = 'rgba(255,255,255,0.04)';

                csCtx.fillRect(crystalX, crystalY, crystalW, crystalH);



                var cx = crystalX + crystalW / 2;

                var cy = crystalY + crystalH / 2;

                var crystalSys = (selMineral.crystal || '').toLowerCase();



                // Parse mineral color for crystal fill

                var mColor = selMineral.color || '#a78bfa';

                var mColorAlpha = mColor.replace('#', '');

                if (mColorAlpha.length === 3) mColorAlpha = mColorAlpha[0]+mColorAlpha[0]+mColorAlpha[1]+mColorAlpha[1]+mColorAlpha[2]+mColorAlpha[2];

                var cr = parseInt(mColorAlpha.substring(0,2),16);

                var cg = parseInt(mColorAlpha.substring(2,4),16);

                var cb = parseInt(mColorAlpha.substring(4,6),16);



                if (crystalSys.indexOf('cubic') >= 0 || crystalSys.indexOf('isometric') >= 0) {

                  // ── Cubic: Draw interlocking 3D cubes ──

                  var cubeSize = 28 * csDpr;

                  var offsets = [[-1,-1],[0,-0.5],[1,-1],[-0.5,0.5],[0.5,0.5],[0,1.2]];

                  offsets.forEach(function(off, idx) {

                    var bx = cx + off[0] * cubeSize * 1.1;

                    var by = cy + off[1] * cubeSize * 0.9;

                    var s = cubeSize * (0.7 + (idx % 3) * 0.15);

                    // Top face

                    csCtx.beginPath();

                    csCtx.moveTo(bx, by - s * 0.5);

                    csCtx.lineTo(bx + s * 0.5, by - s * 0.25);

                    csCtx.lineTo(bx, by);

                    csCtx.lineTo(bx - s * 0.5, by - s * 0.25);

                    csCtx.closePath();

                    csCtx.fillStyle = 'rgba(' + Math.min(255,cr+60) + ',' + Math.min(255,cg+60) + ',' + Math.min(255,cb+60) + ',0.8)';

                    csCtx.fill();

                    csCtx.strokeStyle = 'rgba(255,255,255,0.3)'; csCtx.lineWidth = 1 * csDpr; csCtx.stroke();

                    // Left face

                    csCtx.beginPath();

                    csCtx.moveTo(bx - s * 0.5, by - s * 0.25);

                    csCtx.lineTo(bx, by);

                    csCtx.lineTo(bx, by + s * 0.5);

                    csCtx.lineTo(bx - s * 0.5, by + s * 0.25);

                    csCtx.closePath();

                    csCtx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',0.7)';

                    csCtx.fill();

                    csCtx.strokeStyle = 'rgba(255,255,255,0.2)'; csCtx.stroke();

                    // Right face

                    csCtx.beginPath();

                    csCtx.moveTo(bx + s * 0.5, by - s * 0.25);

                    csCtx.lineTo(bx, by);

                    csCtx.lineTo(bx, by + s * 0.5);

                    csCtx.lineTo(bx + s * 0.5, by + s * 0.25);

                    csCtx.closePath();

                    csCtx.fillStyle = 'rgba(' + Math.max(0,cr-30) + ',' + Math.max(0,cg-30) + ',' + Math.max(0,cb-30) + ',0.65)';

                    csCtx.fill();

                    csCtx.strokeStyle = 'rgba(255,255,255,0.2)'; csCtx.stroke();

                  });

                } else if (crystalSys.indexOf('hexagonal') >= 0) {

                  // ── Hexagonal: Six-sided prism ──

                  var hR = 32 * csDpr;

                  var hH = 50 * csDpr;

                  // Top hexagon

                  csCtx.beginPath();

                  for (var hi = 0; hi < 6; hi++) {

                    var ha = (hi / 6) * Math.PI * 2 - Math.PI / 2;

                    var hx = cx + Math.cos(ha) * hR;

                    var hy = (cy - hH * 0.3) + Math.sin(ha) * hR * 0.35;

                    if (hi === 0) csCtx.moveTo(hx, hy); else csCtx.lineTo(hx, hy);

                  }

                  csCtx.closePath();

                  csCtx.fillStyle = 'rgba(' + Math.min(255,cr+40) + ',' + Math.min(255,cg+40) + ',' + Math.min(255,cb+40) + ',0.7)';

                  csCtx.fill();

                  csCtx.strokeStyle = 'rgba(255,255,255,0.4)'; csCtx.lineWidth = 1.5 * csDpr; csCtx.stroke();

                  // Side faces

                  for (var hsi = 0; hsi < 6; hsi++) {

                    var a1 = (hsi / 6) * Math.PI * 2 - Math.PI / 2;

                    var a2 = ((hsi + 1) / 6) * Math.PI * 2 - Math.PI / 2;

                    if (hsi >= 1 && hsi <= 4) {

                      csCtx.beginPath();

                      csCtx.moveTo(cx + Math.cos(a1) * hR, (cy - hH * 0.3) + Math.sin(a1) * hR * 0.35);

                      csCtx.lineTo(cx + Math.cos(a2) * hR, (cy - hH * 0.3) + Math.sin(a2) * hR * 0.35);

                      csCtx.lineTo(cx + Math.cos(a2) * hR, (cy + hH * 0.3) + Math.sin(a2) * hR * 0.35);

                      csCtx.lineTo(cx + Math.cos(a1) * hR, (cy + hH * 0.3) + Math.sin(a1) * hR * 0.35);

                      csCtx.closePath();

                      var shade = 0.5 + hsi * 0.08;

                      csCtx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + shade + ')';

                      csCtx.fill();

                      csCtx.strokeStyle = 'rgba(255,255,255,0.25)'; csCtx.stroke();

                    }

                  }

                  // Pointed termination (top)

                  csCtx.beginPath();

                  csCtx.moveTo(cx, cy - hH * 0.7);

                  for (var pt = 0; pt < 6; pt++) {

                    var pa = (pt / 6) * Math.PI * 2 - Math.PI / 2;

                    csCtx.lineTo(cx + Math.cos(pa) * hR * 0.85, (cy - hH * 0.3) + Math.sin(pa) * hR * 0.35);

                  }

                  csCtx.closePath();

                  csCtx.fillStyle = 'rgba(' + Math.min(255,cr+80) + ',' + Math.min(255,cg+80) + ',' + Math.min(255,cb+80) + ',0.5)';

                  csCtx.fill();

                  csCtx.strokeStyle = 'rgba(255,255,255,0.35)'; csCtx.stroke();

                } else if (crystalSys.indexOf('monoclinic') >= 0 || crystalSys.indexOf('triclinic') >= 0) {

                  // ── Monoclinic: Oblique prisms / sheet layers ──

                  var layers = 5;

                  var lW = 55 * csDpr, lH2 = 8 * csDpr;

                  var skew = 12 * csDpr;

                  for (var li = 0; li < layers; li++) {

                    var ly = cy - (layers * lH2) / 2 + li * (lH2 + 3 * csDpr);

                    var lx = cx - lW / 2 + li * (skew / layers);

                    csCtx.beginPath();

                    csCtx.moveTo(lx, ly);

                    csCtx.lineTo(lx + lW, ly);

                    csCtx.lineTo(lx + lW + skew / layers, ly + lH2);

                    csCtx.lineTo(lx + skew / layers, ly + lH2);

                    csCtx.closePath();

                    var shade2 = 0.4 + li * 0.1;

                    csCtx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + shade2 + ')';

                    csCtx.fill();

                    csCtx.strokeStyle = 'rgba(255,255,255,0.3)'; csCtx.lineWidth = 1 * csDpr; csCtx.stroke();

                  }

                } else if (crystalSys.indexOf('trigonal') >= 0 || crystalSys.indexOf('rhombohedral') >= 0) {

                  // ── Trigonal/Rhombohedral: Rhomb shapes ──

                  var rW = 30 * csDpr, rH2 = 45 * csDpr;

                  var positions = [[0, 0], [-rW * 0.9, -rH2 * 0.2], [rW * 0.9, -rH2 * 0.2], [0, rH2 * 0.5]];

                  positions.forEach(function(pos, idx2) {

                    var rx = cx + pos[0];

                    var ry = cy + pos[1];

                    csCtx.beginPath();

                    csCtx.moveTo(rx, ry - rH2 * 0.4);

                    csCtx.lineTo(rx + rW * 0.5, ry);

                    csCtx.lineTo(rx, ry + rH2 * 0.4);

                    csCtx.lineTo(rx - rW * 0.5, ry);

                    csCtx.closePath();

                    var shade3 = 0.5 + idx2 * 0.1;

                    csCtx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + shade3 + ')';

                    csCtx.fill();

                    csCtx.strokeStyle = 'rgba(255,255,255,0.3)'; csCtx.lineWidth = 1.5 * csDpr; csCtx.stroke();

                  });

                } else if (crystalSys.indexOf('orthorhombic') >= 0) {

                  // ── Orthorhombic: Rectangular prisms ──

                  var bW = 28 * csDpr, bH2 = 50 * csDpr, bD = 18 * csDpr;

                  // Front face

                  csCtx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',0.7)';

                  csCtx.fillRect(cx - bW / 2, cy - bH2 / 2, bW, bH2);

                  csCtx.strokeStyle = 'rgba(255,255,255,0.3)'; csCtx.lineWidth = 1 * csDpr;

                  csCtx.strokeRect(cx - bW / 2, cy - bH2 / 2, bW, bH2);

                  // Top face

                  csCtx.beginPath();

                  csCtx.moveTo(cx - bW / 2, cy - bH2 / 2);

                  csCtx.lineTo(cx - bW / 2 + bD * 0.7, cy - bH2 / 2 - bD * 0.4);

                  csCtx.lineTo(cx + bW / 2 + bD * 0.7, cy - bH2 / 2 - bD * 0.4);

                  csCtx.lineTo(cx + bW / 2, cy - bH2 / 2);

                  csCtx.closePath();

                  csCtx.fillStyle = 'rgba(' + Math.min(255,cr+50) + ',' + Math.min(255,cg+50) + ',' + Math.min(255,cb+50) + ',0.6)';

                  csCtx.fill();

                  csCtx.strokeStyle = 'rgba(255,255,255,0.3)'; csCtx.stroke();

                  // Right face

                  csCtx.beginPath();

                  csCtx.moveTo(cx + bW / 2, cy - bH2 / 2);

                  csCtx.lineTo(cx + bW / 2 + bD * 0.7, cy - bH2 / 2 - bD * 0.4);

                  csCtx.lineTo(cx + bW / 2 + bD * 0.7, cy + bH2 / 2 - bD * 0.4);

                  csCtx.lineTo(cx + bW / 2, cy + bH2 / 2);

                  csCtx.closePath();

                  csCtx.fillStyle = 'rgba(' + Math.max(0,cr-40) + ',' + Math.max(0,cg-40) + ',' + Math.max(0,cb-40) + ',0.6)';

                  csCtx.fill();

                  csCtx.strokeStyle = 'rgba(255,255,255,0.25)'; csCtx.stroke();

                } else {

                  // ── Default: Generic crystal facets ──

                  var pts = 8;

                  var gR = 35 * csDpr;

                  csCtx.beginPath();

                  for (var gi = 0; gi < pts; gi++) {

                    var ga = (gi / pts) * Math.PI * 2;

                    var gr = gR * (0.7 + Math.sin(gi * 2.3) * 0.3);

                    if (gi === 0) csCtx.moveTo(cx + Math.cos(ga) * gr, cy + Math.sin(ga) * gr);

                    else csCtx.lineTo(cx + Math.cos(ga) * gr, cy + Math.sin(ga) * gr);

                  }

                  csCtx.closePath();

                  csCtx.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',0.6)';

                  csCtx.fill();

                  csCtx.strokeStyle = 'rgba(255,255,255,0.3)'; csCtx.lineWidth = 1.5 * csDpr; csCtx.stroke();

                }



                // ── Cleavage / fracture lines ──

                csCtx.save();

                csCtx.globalAlpha = 0.2;

                csCtx.strokeStyle = '#94a3b8';

                csCtx.lineWidth = 0.5 * csDpr;

                csCtx.setLineDash([3 * csDpr, 4 * csDpr]);

                for (var cli = 0; cli < 4; cli++) {

                  csCtx.beginPath();

                  csCtx.moveTo(crystalX + Math.random() * crystalW * 0.3, crystalY + cli * crystalH * 0.25);

                  csCtx.lineTo(crystalX + crystalW * 0.7 + Math.random() * crystalW * 0.3, crystalY + cli * crystalH * 0.25 + crystalH * 0.15);

                  csCtx.stroke();

                }

                csCtx.setLineDash([]);

                csCtx.restore();



                // ── Right panel: Streak color bar ──

                var panelX = csW * 0.73;

                csCtx.fillStyle = 'rgba(255,255,255,0.08)';

                csCtx.fillRect(panelX, csH * 0.08, csW * 0.24, csH * 0.84);



                // Streak label & bar

                csCtx.font = 'bold ' + (8 * csDpr) + 'px sans-serif';

                csCtx.fillStyle = 'rgba(255,255,255,0.6)';

                csCtx.textAlign = 'center';

                csCtx.fillText('Streak', panelX + csW * 0.12, csH * 0.16);

                var streakColors = { 'White': '#f8fafc', 'Greenish-black': '#1a3a1a', 'Black': '#1e1e1e', 'Red-brown': '#8b3a2a', 'Lead-gray': '#94a3b8', 'White-yellow': '#fef9c3', 'None (too hard)': '#94a3b8' };

                var streakC = streakColors[selMineral.streak] || '#e2e8f0';

                csCtx.fillStyle = streakC;

                csCtx.beginPath();

                csCtx.roundRect(panelX + csW * 0.03, csH * 0.2, csW * 0.18, 12 * csDpr, 3 * csDpr);

                csCtx.fill();

                csCtx.strokeStyle = 'rgba(255,255,255,0.2)'; csCtx.lineWidth = 1; csCtx.stroke();

                csCtx.font = (7 * csDpr) + 'px sans-serif';

                csCtx.fillStyle = 'rgba(255,255,255,0.5)';

                csCtx.fillText(selMineral.streak, panelX + csW * 0.12, csH * 0.2 + 24 * csDpr);



                // Luster indicator

                csCtx.font = 'bold ' + (8 * csDpr) + 'px sans-serif';

                csCtx.fillStyle = 'rgba(255,255,255,0.6)';

                csCtx.fillText('Luster', panelX + csW * 0.12, csH * 0.48);

                var lusterIcons = { 'Vitreous': '✨', 'Metallic': '🪙', 'Pearly': '🫧', 'Adamantine': '💎', 'Resinous': '🍯', 'Waxy': '🕯️', 'Silky': '🧵', 'Earthy': '🏜️', 'Submetallic': '🪙' };

                var matchedLuster = Object.keys(lusterIcons).find(function(k) { return (selMineral.luster || '').indexOf(k) >= 0; });

                csCtx.font = (16 * csDpr) + 'px sans-serif';

                csCtx.fillText(lusterIcons[matchedLuster] || '✨', panelX + csW * 0.12, csH * 0.56);

                csCtx.font = (6 * csDpr) + 'px sans-serif';

                csCtx.fillStyle = 'rgba(255,255,255,0.4)';

                csCtx.fillText(selMineral.luster, panelX + csW * 0.12, csH * 0.64);



                // Mohs hardness pin

                csCtx.font = 'bold ' + (8 * csDpr) + 'px sans-serif';

                csCtx.fillStyle = 'rgba(255,255,255,0.6)';

                csCtx.fillText('Hardness', panelX + csW * 0.12, csH * 0.76);

                // Mini scale

                var scaleY = csH * 0.8;

                var scaleW2 = csW * 0.18;

                var scaleX = panelX + csW * 0.03;

                for (var mi = 0; mi < 10; mi++) {

                  var mActive = mi + 1 <= Math.round(selMineral.hardness);

                  csCtx.fillStyle = mActive ? '#8b5cf6' : 'rgba(255,255,255,0.1)';

                  csCtx.fillRect(scaleX + mi * (scaleW2 / 10), scaleY, scaleW2 / 10 - 1 * csDpr, 6 * csDpr);

                }

                csCtx.font = 'bold ' + (10 * csDpr) + 'px sans-serif';

                csCtx.fillStyle = '#a78bfa';

                csCtx.fillText(selMineral.hardness + '/10', panelX + csW * 0.12, scaleY + 18 * csDpr);



                // Crystal system label at bottom

                csCtx.font = (7 * csDpr) + 'px sans-serif';

                csCtx.fillStyle = 'rgba(255,255,255,0.4)';

                csCtx.textAlign = 'left';

                csCtx.fillText('Crystal System: ' + selMineral.crystal, csW * 0.04, csH * 0.95);



                // Border

                csCtx.strokeStyle = 'rgba(139,92,246,0.3)';

                csCtx.lineWidth = 2 * csDpr;

                csCtx.strokeRect(0, 0, csW, csH);

              };



              // Mineral picker grid + selected detail

              return React.createElement("div", { className: "space-y-3" },

                // Mineral grid
                React.createElement("div", { className: "grid grid-cols-4 gap-2 mb-3" },
                  MINERALS.map(function (mineral) {
                    return React.createElement("button", { key: mineral.id, onClick: function () { upd("selectedMineral", d.selectedMineral === mineral.id ? null : mineral.id); upd("selectedRock", null); },
                      className: "p-2 rounded-lg text-[11px] font-bold border-2 transition-all hover:scale-105 text-center " +
                        (d.selectedMineral === mineral.id ? 'bg-white shadow-lg border-violet-400' : 'transition-colors bg-slate-50 border-slate-200 hover:border-violet-200'),
                      style: d.selectedMineral === mineral.id ? { borderColor: '#8b5cf6', color: '#6d28d9' } : {}
                    },
                      React.createElement("div", { className: "w-5 h-5 rounded-full mx-auto mb-1 border border-slate-400", style: { background: mineral.color } }),
                      mineral.label);
                  })
                ),

                // Selected mineral detail
                selMineral && React.createElement("div", { className: "bg-white rounded-xl border-2 border-violet-300 p-4 animate-in fade-in space-y-3" },

                React.createElement("h4", { className: "font-bold text-base text-violet-700 mb-1" }, "\uD83D\uDC8E " + selMineral.label),

                React.createElement("p", { className: "text-xs text-slate-600 font-mono mb-1" }, __alloT('stem.rocks.formula_label', "Formula: ") + selMineral.formula),

                // Cross-section canvas

                React.createElement("div", { className: "flex gap-3 items-start" },

                  React.createElement("canvas", { tabIndex: 0, ref: mineralCrossSectionRef, role: "img", "aria-label": __alloT('stem.rocks.mineral_cross_section_aria', "Mineral cross-section"), style: { width: '140px', height: '100px', borderRadius: '10px', flexShrink: 0 } }),

                  React.createElement("div", { className: "flex-1 min-w-0" },

                    selMineral.desc && React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, selMineral.desc)

                  )

                ),

                React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                  [

                    { label: t('stem.rocks.hardness'), value: selMineral.hardness + ' / 10', icon: '\uD83D\uDCAA' },

                    { label: t('stem.rocks.streak'), value: selMineral.streak, icon: '\u270F\uFE0F' },

                    { label: t('stem.rocks.luster'), value: selMineral.luster, icon: '\u2728' },

                    { label: __alloT('stem.rocks.crystal_system', 'Crystal System'), value: selMineral.crystal, icon: '\uD83D\uDD37' }

                  ].map(function (prop) {

                    return React.createElement("div", { key: prop.label, className: "rounded-lg p-2.5 text-center", style: { background: selMineral.color } },

                      React.createElement("p", { className: "text-[11px] text-slate-600 font-bold" }, prop.icon + " " + prop.label),

                      React.createElement("p", { className: "text-sm font-bold text-slate-800 mt-0.5" }, prop.value));

                  })

                ),

                selMineral.uses && React.createElement("div", { className: "bg-blue-50 rounded-lg p-2.5" },

                  React.createElement("p", { className: "text-[11px] font-bold text-blue-500 uppercase mb-0.5" }, "\uD83C\uDFD7\uFE0F " + __alloT('stem.rocks.uses_heading', "Uses")),

                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, selMineral.uses)

                ),

                selMineral.funFact && React.createElement("div", { className: "bg-amber-50 rounded-lg p-2.5 border border-amber-200" },

                  React.createElement("p", { className: "text-[11px] font-bold text-amber-600 uppercase mb-0.5" }, "\uD83D\uDCA1 " + __alloT('stem.rocks.fun_fact_heading', "Fun Fact")),

                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed italic" }, selMineral.funFact)

                ),

                selMineral.occurrence && React.createElement("div", { className: "bg-emerald-50 rounded-lg p-2.5" },

                  React.createElement("p", { className: "text-[11px] font-bold text-emerald-600 uppercase mb-0.5" }, "\uD83C\uDF0D " + __alloT('stem.rocks.where_found_heading', "Where Found")),

                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, selMineral.occurrence)

                ),

                // Mohs bar

                React.createElement("div", { className: "mt-1" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, __alloT('stem.rocks.mohs_position', "Mohs Position")),

                  React.createElement("div", { className: "flex gap-0.5 items-end" },

                    Array.from({ length: 10 }, function (_, i) {

                      const active = i + 1 <= Math.round(selMineral.hardness);

                      return React.createElement("div", {

                        key: i, className: "flex-1 rounded-sm transition-all", style: {

                          height: (8 + i * 3) + 'px',

                          background: active ? '#8b5cf6' : '#e5e7eb'

                        }

                      });

                    })

                  ),

                  React.createElement("div", { className: "flex justify-between text-[11px] text-slate-600 mt-0.5" },

                    React.createElement("span", null, __alloT('stem.rocks.mohs_min_talc', "1 (Talc)")),

                    React.createElement("span", null, __alloT('stem.rocks.mohs_max_diamond', "10 (Diamond)")))

                ),

                // Mohs Hardness Scratch Lab
                React.createElement("div", { className: "border-t border-violet-100 pt-3 mt-3" },
                  React.createElement("p", { className: "text-xs font-black text-violet-700 mb-2 flex items-center gap-1.5" },
                    React.createElement("span", null, "💅"),
                    React.createElement("span", null, __alloT('stem.rocks.mohs_scratch_test_lab', "Mohs Hardness Scratch Test Lab"))
                  ),
                  React.createElement("p", { className: "text-[11px] text-slate-600 mb-3" },
                    __alloT('stem.rocks.mohs_scratch_intro', "Select a scratch tool and run the test to see if it can scratch the mineral surface. Minerals can only be scratched by tools with equal or higher hardness.")
                  ),
                  React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3" },
                    [
                      { id: 'fingernail', label: '💅 ' + __alloT('stem.rocks.tool_fingernail', 'Fingernail'), h: 2.5 },
                      { id: 'penny', label: '🪙 ' + __alloT('stem.rocks.tool_copper_penny', 'Copper Penny'), h: 3.5 },
                      { id: 'steel_nail', label: '📌 ' + __alloT('stem.rocks.tool_steel_nail', 'Steel Nail'), h: 5.5 },
                      { id: 'streak_plate', label: '🍽️ ' + __alloT('stem.rocks.tool_streak_plate', 'Streak Plate'), h: 6.5 },
                      { id: 'drill_bit', label: '🪚 ' + __alloT('stem.rocks.tool_masonry_drill', 'Masonry Drill'), h: 8.5 },
                      { id: 'diamond_scribe', label: '💎 ' + __alloT('stem.rocks.tool_diamond_scribe', 'Diamond Scribe'), h: 10.0 }
                    ].map(function(tool) {
                      var isSelected = d.scratchTool === tool.id;
                      return React.createElement("button", {
                        key: tool.id,
                        onClick: function() {
                          updMulti({ scratchTool: tool.id, scratchResult: null, scratchAnimProgress: 0 });
                          sfxRockClick();
                        },
                        className: "p-1.5 rounded-lg border-2 text-[10px] font-bold text-center transition-all " +
                          (isSelected ? "bg-violet-100 border-violet-500 text-violet-800" : "transition-colors bg-slate-50 border-slate-200 text-slate-600 hover:border-violet-200")
                      },
                        React.createElement("div", null, tool.label),
                        React.createElement("div", { className: "text-[10px] text-slate-400 font-mono mt-0.5" }, "H: " + tool.h)
                      );
                    })
                  ),
                  d.scratchTool && (function() {
                    var toolData = [
                      { id: 'fingernail', label: __alloT('stem.rocks.tool_fingernail', 'Fingernail'), h: 2.5 },
                      { id: 'penny', label: __alloT('stem.rocks.tool_copper_penny', 'Copper Penny'), h: 3.5 },
                      { id: 'steel_nail', label: __alloT('stem.rocks.tool_steel_nail', 'Steel Nail'), h: 5.5 },
                      { id: 'streak_plate', label: __alloT('stem.rocks.tool_streak_plate', 'Streak Plate'), h: 6.5 },
                      { id: 'drill_bit', label: __alloT('stem.rocks.tool_masonry_drill', 'Masonry Drill'), h: 8.5 },
                      { id: 'diamond_scribe', label: __alloT('stem.rocks.tool_diamond_scribe', 'Diamond Scribe'), h: 10.0 }
                    ].find(function(t) { return t.id === d.scratchTool; });

                    var runTest = function() {
                      upd("scratchAnimProgress", 1);
                      var p = 0;
                      var interval = setInterval(function() {
                        p += 10;
                        upd("scratchAnimProgress", p);
                        if (p >= 100) {
                          clearInterval(interval);
                          var success = toolData.h >= selMineral.hardness;
                          var text = "";
                          if (success) {
                            text = __alloT('stem.rocks.scratch_success_a', "Result: Scratch created! The ") + toolData.label + " (" + toolData.h + ") " + __alloT('stem.rocks.scratch_success_b', "successfully scratched ") + selMineral.label + " (" + selMineral.hardness + ").";
                            sfxRockCrack();
                          } else {
                            text = __alloT('stem.rocks.scratch_fail_a', "Result: No scratch! The ") + toolData.label + " (" + toolData.h + ") " + __alloT('stem.rocks.scratch_fail_b', "rubbed off on ") + selMineral.label + " (" + selMineral.hardness + ") " + __alloT('stem.rocks.scratch_fail_c', "without leaving a mark.");
                            sfxRockCool();
                          }
                          upd("scratchResult", text);
                        }
                      }, 50);
                    };

                    var animProgress = d.scratchAnimProgress || 0;

                    return React.createElement("div", { className: "bg-slate-50 rounded-lg p-3 border border-slate-200" },
                      React.createElement("div", { className: "flex justify-between items-center mb-2" },
                        React.createElement("span", { className: "text-[11px] font-bold text-slate-700" }, __alloT('stem.rocks.active_tool_label', "Active Tool: ") + toolData.label + " (" + __alloT('stem.rocks.hardness_word', "Hardness") + " " + toolData.h + ")"),
                        animProgress === 0 && React.createElement("button", {
                          onClick: runTest,
                          className: "px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm active:scale-[0.97]"
                        }, "⚡ " + __alloT('stem.rocks.run_scratch_test', "Run Scratch Test"))
                      ),
                      animProgress > 0 && animProgress < 100 && React.createElement("div", { className: "w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-2" },
                        React.createElement("div", {
                          className: "bg-violet-600 h-full transition-all duration-75",
                          style: { width: animProgress + '%' }
                        })
                      ),
                      d.scratchResult && React.createElement("p", { className: "text-xs font-bold text-slate-700 leading-relaxed animate-in fade-in" },
                        d.scratchResult
                      )
                    );
                  })()
                ),

                // Streak Test Lab
                React.createElement("div", { className: "border-t border-violet-100 pt-3 mt-3" },
                  React.createElement("p", { className: "text-xs font-black text-violet-700 mb-2 flex items-center gap-1.5" },
                    React.createElement("span", null, "🍽️"),
                    React.createElement("span", null, __alloT('stem.rocks.streak_plate_test_lab', "Streak Plate Test Lab"))
                  ),
                  React.createElement("p", { className: "text-[11px] text-slate-600 mb-3" },
                    __alloT('stem.rocks.streak_test_intro', "Scratch the mineral across an unglazed porcelain streak plate. The color of the powdered residue left behind is the streak color, which is often different from the mineral's external color.")
                  ),
                  React.createElement("div", { className: "flex items-center gap-4" },
                    React.createElement("button", {
                      disabled: d.streakAnimActive,
                      onClick: function() {
                        upd("streakAnimActive", true);
                        upd("streakResult", null);
                        sfxRockCrack();
                        setTimeout(function() {
                          var res = __alloT('stem.rocks.powder_streak_result', "Powder Streak Result: ") + selMineral.streak;
                          updMulti({ streakAnimActive: false, streakResult: res });
                        }, 800);
                      },
                      className: "px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-xs transition-all shadow-sm disabled:opacity-50 active:scale-[0.97]"
                    }, d.streakAnimActive ? "✏️ " + __alloT('stem.rocks.scratching_plate', "Scratching plate...") : "🍽️ " + __alloT('stem.rocks.perform_streak_test', "Perform Streak Test")),
                    d.streakResult && (function() {
                      var streakColors = { 'White': '#f8fafc', 'Greenish-black': '#1a3a1a', 'Black': '#1e1e1e', 'Red-brown': '#8b3a2a', 'Lead-gray': '#94a3b8', 'White-yellow': '#fef9c3', 'None (too hard)': '#94a3b8' };
                      var c = streakColors[selMineral.streak] || '#e2e8f0';
                      var isNone = selMineral.streak.includes('None');
                      return React.createElement("div", { className: "flex items-center gap-2 animate-in fade-in" },
                        !isNone && React.createElement("div", {
                          style: { backgroundColor: c, border: '1px solid #cbd5e1', width: '40px', height: '14px', borderRadius: '4px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }
                        }),
                        React.createElement("span", { className: "text-xs font-bold text-slate-700" }, d.streakResult)
                      );
                    })()
                  )
                ),

                // Acid Fizz Test Lab
                React.createElement("div", { className: "border-t border-violet-100 pt-3 mt-3" },
                  React.createElement("p", { className: "text-xs font-black text-violet-700 mb-2 flex items-center gap-1.5" },
                    React.createElement("span", null, "🧪"),
                    React.createElement("span", null, __alloT('stem.rocks.acid_fizz_test_lab', "Acid Fizz Test Lab"))
                  ),
                  React.createElement("p", { className: "text-[11px] text-slate-600 mb-3" },
                    __alloT('stem.rocks.acid_fizz_intro', "Apply dilute hydrochloric acid (HCl) to test for the presence of carbonate minerals. Carbonates react by fizzing vigorously.")
                  ),
                  React.createElement("div", { className: "flex items-center gap-3" },
                    React.createElement("button", {
                      disabled: d.fizzAnimActive,
                      onClick: function() {
                        upd("fizzAnimActive", true);
                        upd("fizzResult", null);
                        sfxRockMelt();
                        var bubbleSoundCount = 0;
                        var bubbleInterval = setInterval(function() {
                          if (bubbleSoundCount < 3) {
                            sfxRockCool();
                            bubbleSoundCount++;
                          } else {
                            clearInterval(bubbleInterval);
                          }
                        }, 250);

                        setTimeout(function() {
                          var isCarbonate = false;
                          var targetId = selMineral.id;
                          if (targetId === 'calcite') {
                            isCarbonate = true;
                          }

                          var res = "";
                          if (isCarbonate) {
                            res = "🫧 " + __alloT('stem.rocks.fizz_positive', "Fizz! The acid reacted with calcium carbonate in the specimen, releasing carbon dioxide gas:") + " CaCO3 + 2HCl -> CaCl2 + CO2 (gas) + H2O.";
                          } else {
                            res = __alloT('stem.rocks.fizz_no_reaction', "No reaction. The specimen does not contain carbonate minerals, so the acid simply sits on the surface.");
                          }
                          updMulti({ fizzAnimActive: false, fizzResult: res });
                        }, 1200);
                      },
                      className: "px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-xs transition-all shadow-sm disabled:opacity-50 active:scale-[0.97]"
                    }, d.fizzAnimActive ? "🫧 " + __alloT('stem.rocks.dropping_acid', "Dropping Acid...") : "🧪 " + __alloT('stem.rocks.drop_hcl_acid', "Drop HCl Acid")),
                    d.fizzAnimActive && React.createElement("div", { className: "flex items-center gap-1 animate-pulse" },
                      React.createElement("span", { className: "text-lg" }, "🫧"),
                      React.createElement("span", { className: "text-[10px] text-violet-600 font-bold" }, __alloT('stem.rocks.bubbling_reaction_active', "Bubbling reaction active..."))
                    )
                  ),
                  d.fizzResult && React.createElement("p", { className: "text-xs font-bold text-slate-700 mt-2 leading-relaxed animate-in fade-in" },
                    d.fizzResult
                  )
                ),

                // AI Petrologist panel
                React.createElement("div", { className: "border-t border-slate-100 pt-3 mt-3" },
                  React.createElement("p", { className: "text-xs font-black text-slate-700 mb-1 flex items-center gap-1.5" },
                    React.createElement("span", null, "🧠"),
                    React.createElement("span", null, __alloT('stem.rocks.ask_ai_petrologist', "Ask the AI Petrologist"))
                  ),
                  React.createElement("p", { className: "text-[10px] text-slate-500 mb-2" },
                    __alloT('stem.rocks.query_ai_about_prefix', "Query the AI about ") + selMineral.label + __alloT('stem.rocks.query_ai_suffix', "'s geologic origin, chemical properties, or tectonic significance.")
                  ),
                  React.createElement("div", { className: "flex gap-2" },
                    React.createElement("input", {
                      type: "text",
                      placeholder: __alloT('stem.rocks.ask_question_placeholder', "Ask a question (e.g., How does this form?)..."),
                      value: d.aiQuestion || '',
                      onChange: function(e) { upd("aiQuestion", e.target.value); },
                      onKeyDown: function(e) { if (e.key === 'Enter') askPetrologist(); },
                      className: "flex-1 px-3 py-1 text-xs border rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    }),
                    React.createElement("button", {
                      disabled: d.aiLoading,
                      onClick: askPetrologist,
                      className: "px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 transition-all disabled:opacity-50 active:scale-[0.97]"
                    }, d.aiLoading ? __alloT('stem.rocks.thinking_ellipsis', "Thinking...") : __alloT('stem.rocks.ask_button', "Ask"))
                  ),
                  d.aiAnswer && React.createElement("div", { className: "mt-2 p-2.5 bg-slate-50 border rounded-lg animate-in slide-in-from-top-1" },
                    React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed font-medium" }, d.aiAnswer)
                  )
                )

              )

              )

            })(),



            // ── Mystery Rock mode (AI) ──

            mode === 'mystery' && (function () {

              const myst = d.mystery || {};

              const mysteryRock = myst.rockId ? ROCKS.find(function (r) { return r.id === myst.rockId; }) : null;

              const clues = Array.isArray(myst.clues) ? myst.clues : [];

              const cluesShown = Math.min(Math.max(myst.cluesShown || 0, 0), clues.length);



              function startMystery() {

                if (typeof callGemini !== 'function') {

                  upd("mystery", { error: __alloT('stem.rocks.ai_tutor_unavailable', 'AI tutor is not available. Check back when online.') });

                  return;

                }

                const pick = ROCKS[Math.floor(Math.random() * ROCKS.length)];

                const typeLabels = { igneous: 'igneous', sedimentary: 'sedimentary', metamorphic: 'metamorphic' };

                upd("mystery", { rockId: pick.id, clues: [], cluesShown: 0, revealed: false, solved: false, loading: true, lastGuess: null, error: null });

                const prompt = 'You are giving rock identification clues to a ' + (gradeLevel || '5th Grade') + ' student. The mystery rock is ' + pick.label + ' (' + typeLabels[pick.type] + '). '

                  + 'Produce exactly 3 clues, ordered from subtle to obvious. Do NOT use the rock\'s name, color name, or any word from "' + pick.label + '" in the clues. '

                  + 'Clue 1: vague category hint (formation or environment). '

                  + 'Clue 2: a distinctive property (hardness, texture, or famous use). '

                  + 'Clue 3: a defining giveaway. '

                  + 'Return ONLY the three clues separated by "|||", nothing else. No numbering, no labels.';

                callGemini(prompt, false, false, 0.6).then(function (resp) {

                  const parts = String(resp || '').split('|||').map(function (s) { return s.replace(/^\s*[0-9]+\.?\s*/, '').trim(); }).filter(Boolean);

                  const safeClues = parts.length >= 1 ? parts.slice(0, 3) : [__alloT('stem.rocks.ai_no_clues', 'The AI returned no clues. Try again.')];

                  upd("mystery", { rockId: pick.id, clues: safeClues, cluesShown: 1, revealed: false, solved: false, loading: false, lastGuess: null, error: null });

                  if (typeof announceToSR === 'function') announceToSR('Mystery rock ready. First clue revealed.');

                }).catch(function () {

                  upd("mystery", { rockId: pick.id, clues: [], cluesShown: 0, revealed: false, solved: false, loading: false, lastGuess: null, error: __alloT('stem.rocks.could_not_reach_ai', 'Could not reach AI tutor. Try again in a moment.') });

                });

              }



              function revealNextClue() {

                if (cluesShown < clues.length) {

                  upd("mystery", Object.assign({}, myst, { cluesShown: cluesShown + 1 }));

                  sfxRockClick();

                  if (typeof announceToSR === 'function') announceToSR('Clue ' + (cluesShown + 1) + ' of ' + clues.length + ': ' + clues[cluesShown]);

                }

              }



              function guess(rockId) {

                if (!mysteryRock || myst.solved || myst.revealed) return;

                const correct = rockId === myst.rockId;

                if (correct) {

                  sfxRockCorrect();

                  upd("mystery", Object.assign({}, myst, { solved: true, lastGuess: rockId }));

                  if (typeof awardStemXP === 'function') awardStemXP(15, 'Mystery rock solved!');

                  if (typeof stemCelebrate === 'function') stemCelebrate();

                  if (typeof announceToSR === 'function') announceToSR('Correct! The mystery rock was ' + mysteryRock.label + '.');

                } else {

                  rockTone(200, 0.1, 'sawtooth', 0.05);

                  upd("mystery", Object.assign({}, myst, { lastGuess: rockId, cluesShown: Math.min(cluesShown + 1, clues.length) }));

                  if (typeof announceToSR === 'function') announceToSR('Not quite. Next clue revealed.');

                }

              }



              function giveUp() {

                if (!mysteryRock) return;

                upd("mystery", Object.assign({}, myst, { revealed: true, cluesShown: clues.length }));

                if (typeof announceToSR === 'function') announceToSR('Answer revealed: ' + mysteryRock.label + '.');

              }



              return React.createElement("div", { className: "mt-2", role: "region", "aria-label": __alloT('stem.rocks.mystery_rock_challenge_aria', "Mystery Rock challenge") },

                React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-300 p-4 mb-3" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                    React.createElement("span", { className: "text-2xl" }, "🔍"),

                    React.createElement("h4", { className: "font-bold text-sm text-amber-900" }, __alloT('stem.rocks.mystery_rock_challenge_title', "Mystery Rock Challenge")),

                    React.createElement("span", { className: "ml-auto text-[11px] text-amber-700 font-bold" }, __alloT('stem.rocks.reading_level_label', "Reading level: ") + (gradeLevel || '5th Grade'))

                  ),

                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" },

                    __alloT('stem.rocks.mystery_intro', "The AI tutor picks a rock and gives you 3 clues. Read each clue, then click a rock from the grid below to guess. Wrong guesses reveal the next clue. Earn 15 XP for a correct ID."))

                ),

                !myst.rockId && !myst.loading && React.createElement("div", { className: "flex flex-col items-center gap-2 p-6 bg-white rounded-xl border-2 border-dashed border-amber-300" },

                  React.createElement("p", { className: "text-xs text-slate-600" }, __alloT('stem.rocks.ready_to_test', "Ready to test your rock knowledge?")),

                  React.createElement("button", {

                    onClick: startMystery,

                    "aria-label": __alloT('stem.rocks.start_mystery_aria', "Start Mystery Rock challenge"),

                    className: "px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm rounded-full shadow-md hover:shadow-lg hover:from-amber-700 hover:to-orange-700"

                  }, "🎲 " + __alloT('stem.rocks.start_challenge', "Start Challenge")),

                  myst.error && React.createElement("p", { className: "text-[11px] text-red-600 mt-1", role: "alert" }, myst.error)

                ),

                myst.loading && React.createElement("div", { className: "p-4 bg-white rounded-xl border border-amber-200 text-center text-xs text-slate-600", role: "status", "aria-live": "polite" },

                  "🧠 " + __alloT('stem.rocks.ai_thinking_clues', "AI tutor is thinking up clues...")),

                myst.rockId && !myst.loading && React.createElement("div", null,

                  React.createElement("div", { className: "bg-white rounded-xl border-2 border-amber-200 p-3 mb-3" },

                    React.createElement("p", { className: "text-[11px] font-bold text-amber-700 mb-2" }, __alloT('stem.rocks.clues_label', "Clues") + " (" + cluesShown + "/" + clues.length + ")"),

                    clues.slice(0, cluesShown).map(function (c, i) {

                      return React.createElement("div", { key: i, className: "flex gap-2 mb-1.5 text-xs text-slate-700 leading-relaxed" },

                        React.createElement("span", { className: "font-bold text-amber-700 shrink-0" }, __alloT('stem.rocks.clue_label', "Clue ") + (i + 1) + ":"),

                        React.createElement("span", null, c));

                    }),

                    cluesShown < clues.length && !myst.solved && !myst.revealed && React.createElement("button", {

                      onClick: revealNextClue,

                      "aria-label": __alloT('stem.rocks.reveal_next_clue', "Reveal next clue"),

                      className: "transition-colors mt-1 px-3 py-1 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 active:scale-[0.97]"

                    }, "+ " + __alloT('stem.rocks.reveal_next_clue', "Reveal next clue"))

                  ),

                  (myst.solved || myst.revealed) && mysteryRock && React.createElement("div", {

                    className: "p-3 rounded-xl border-2 mb-3 " + (myst.solved ? "bg-green-50 border-green-300" : "bg-slate-50 border-slate-300"),

                    role: "alert"

                  },

                    React.createElement("p", { className: "text-sm font-bold " + (myst.solved ? "text-green-800" : "text-slate-800") },

                      (myst.solved ? "✅ " + __alloT('stem.rocks.correct_it_was', "Correct! It was ") : "📖 " + __alloT('stem.rocks.the_answer_was', "The answer was ")) + ROCK_TYPES[mysteryRock.type].icon + " " + mysteryRock.label),

                    React.createElement("p", { className: "text-[11px] text-slate-600 mt-1 leading-relaxed" }, mysteryRock.desc),

                    React.createElement("button", {

                      onClick: startMystery,

                      "aria-label": __alloT('stem.rocks.start_new_mystery_aria', "Start a new Mystery Rock challenge"),

                      className: "transition-colors mt-2 px-3 py-1 text-[11px] font-bold bg-amber-700 text-white rounded-lg hover:bg-amber-800 active:scale-[0.97]"

                    }, "🎲 " + __alloT('stem.rocks.new_mystery', "New Mystery"))

                  ),

                  !myst.solved && !myst.revealed && React.createElement("div", null,

                    React.createElement("p", { className: "text-[11px] font-bold text-slate-600 mb-1.5" }, __alloT('stem.rocks.click_rock_matches_clues', "Click the rock you think matches the clues:")),

                    React.createElement("div", { className: "grid grid-cols-4 gap-2 mb-2", role: "group", "aria-label": __alloT('stem.rocks.rock_guess_options_aria', "Rock guess options") },

                      ROCKS.map(function (rock) {

                        const rt = ROCK_TYPES[rock.type];

                        const wasWrong = myst.lastGuess === rock.id && myst.lastGuess !== myst.rockId;

                        return React.createElement("button", {

                          key: rock.id,

                          onClick: function () { guess(rock.id); },

                          "aria-label": __alloT('stem.rocks.guess_label', "Guess ") + rock.label,

                          className: "p-2 rounded-lg text-[11px] font-bold border-2 transition-all hover:scale-105 text-center " +

                            (wasWrong ? "bg-red-50 border-red-600 text-red-700" : "transition-colors bg-slate-50 border-slate-200 text-slate-700 hover:border-amber-400")

                        },

                          React.createElement("div", { className: "text-lg mb-0.5" }, rt.icon),

                          rock.label);

                      })

                    ),

                    React.createElement("button", {

                      onClick: giveUp,

                      "aria-label": __alloT('stem.rocks.give_up_aria', "Give up and reveal the answer"),

                      className: "transition-colors px-3 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 active:scale-[0.97]"

                    }, "🤷 " + __alloT('stem.rocks.give_up_show_answer', "Give up · show answer"))

                  )

                )

              );

            })(),



            // ── Quiz mode ──

            d.quizMode && quizQ && React.createElement("div", {
              className: "mt-3 bg-amber-50 rounded-xl border-2 border-amber-200 p-4 animate-in fade-in outline-none focus:ring-2 focus:ring-amber-400",
              role: "region", "aria-label": __alloT('stem.rocks.quiz_region_aria', "Rock identification quiz. Press 1 through 4 to answer, or N for next."),
              tabIndex: 0,
              ref: function (el) { if (el && !el._rkQuizFocused) { el._rkQuizFocused = true; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } } },
              onKeyDown: function (e) {
                const k = e.key;
                if (k >= '1' && k <= '9') {
                  const idx = parseInt(k, 10) - 1;
                  if (!d.quizFeedback && quizQ.options[idx] !== undefined) {
                    e.preventDefault();
                    const opt = quizQ.options[idx];
                    const correct = opt === quizQ.a;
                    const explanation = quizQ.wrongFeedback ? quizQ.wrongFeedback[idx] : (correct ? __alloT('stem.rocks.correct_exclaim', "Correct!") : __alloT('stem.rocks.incorrect', "Incorrect."));
                    upd("quizFeedback", {
                      correct: correct,
                      chosenIdx: idx,
                      msg: correct ? "✅ " + __alloT('stem.rocks.correct_plus_xp', "Correct! +10 XP") : "❌ " + __alloT('stem.rocks.incorrect', "Incorrect."),
                      explanation: explanation
                    });
                    if (correct) {
                      var newScore = (d.quizScore || 0) + 1;
                      upd("quizScore", newScore);
                      if (typeof awardStemXP === 'function') awardStemXP(10, 'Quiz answer correct!');
                      var nextState = Object.assign({}, d, { quizScore: newScore });
                      setTimeout(function() { checkRocksChallenges(nextState); }, 50);
                    } else {
                      sfxRockCrack();
                    }
                  }
                } else if ((k === 'n' || k === 'N' || k === 'Enter') && d.quizFeedback) {
                  e.preventDefault();
                  const nextIdx = ((d.quizIdx || 0) + 1) % QUIZ_BANK.length;
                  upd("quizIdx", nextIdx); upd("quizFeedback", null);
                }
              }
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("p", { className: "text-xs font-bold text-amber-700" }, "🧠 " + __alloT('stem.rocks.question_label', "Question ") + ((d.quizIdx || 0) + 1) + "/" + QUIZ_BANK.length),
                React.createElement("span", { className: "font-bold text-green-600 text-xs" }, "✔ " + (d.quizScore || 0))
              ),
              React.createElement("p", { className: "text-sm font-bold text-slate-800 mb-3" }, quizQ.q),
              React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                quizQ.options.map(function (opt, i) {
                  const shortcut = (i + 1).toString();
                  const isChosen = d.quizFeedback && d.quizFeedback.chosenIdx === i;
                  return React.createElement("button", { "aria-label": __alloT('stem.rocks.answer_label', "Answer ") + shortcut + ": " + opt,
                    key: opt, onClick: function () {
                      if (d.quizFeedback) return;
                      const correct = opt === quizQ.a;
                      const explanation = quizQ.wrongFeedback ? quizQ.wrongFeedback[i] : (correct ? __alloT('stem.rocks.correct_exclaim', "Correct!") : __alloT('stem.rocks.incorrect', "Incorrect."));
                      upd("quizFeedback", {
                        correct: correct,
                        chosenIdx: i,
                        msg: correct ? "✅ " + __alloT('stem.rocks.correct_plus_xp', "Correct! +10 XP") : "❌ " + __alloT('stem.rocks.incorrect', "Incorrect."),
                        explanation: explanation
                      });
                      if (correct) {
                        var newScore = (d.quizScore || 0) + 1;
                        upd("quizScore", newScore);
                        if (typeof awardStemXP === 'function') awardStemXP(10, 'Quiz answer correct!');
                        var nextState = Object.assign({}, d, { quizScore: newScore });
                        setTimeout(function() { checkRocksChallenges(nextState); }, 50);
                      } else {
                        sfxRockCrack();
                      }
                    }, className: "px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all hover:scale-[1.02] flex items-center gap-2 " +
                      (d.quizFeedback ? (opt === quizQ.a ? "border-green-400 bg-green-50 text-green-700" : isChosen ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-600") : "transition-colors border-amber-200 bg-white text-slate-700 hover:border-amber-400")
                  },
                    React.createElement("span", { className: "inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0", "aria-hidden": "true" }, shortcut),
                    React.createElement("span", null, opt));
                })
              ),
              d.quizFeedback && React.createElement("div", { className: "mt-3 space-y-2" },
                React.createElement("div", { className: "p-3 rounded-lg text-sm " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200") },
                  React.createElement("p", { className: "font-black" }, d.quizFeedback.msg),
                  React.createElement("p", { className: "text-xs mt-1 leading-relaxed text-slate-700" }, d.quizFeedback.explanation)
                ),
                quizQ.concept && ROCKS_VOCAB[quizQ.concept] && (function() {
                  var concept = quizQ.concept;
                  var definition = ROCKS_VOCAB[concept];
                  var studied = (d.vocabLookedUp || []).indexOf(concept) !== -1;
                  return React.createElement("div", { className: "p-3 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in" },
                    React.createElement("div", { className: "flex-1" },
                      React.createElement("p", { className: "text-xs font-bold text-amber-800" }, "🔍 " + __alloT('stem.rocks.concept_focus_label', "Concept Focus: ") + concept),
                      React.createElement("p", { className: "text-[11px] text-slate-600 mt-0.5 leading-relaxed" }, definition)
                    ),
                    !studied && React.createElement("button", {
                      onClick: function() {
                        var list = d.vocabLookedUp || [];
                        var newList = list.concat([concept]);
                        updMulti({ vocabLookedUp: newList });
                        sfxRockClick();
                        if (typeof awardStemXP === 'function') awardStemXP(5, 'Concept studied: ' + concept);
                        if (typeof addToast === 'function') addToast({ type: 'success', title: 'Concept Studied!', message: 'You studied ' + concept + ' (+5 RP)' });
                        var nextState = Object.assign({}, d, { vocabLookedUp: newList });
                        setTimeout(function() { checkRocksChallenges(nextState); }, 50);
                      },
                      className: "px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg text-[10px] shrink-0 self-start sm:self-center transition-all hover:scale-105 active:scale-[0.97]"
                    }, "📖 " + __alloT('stem.rocks.study_term', "Study Term (+5 RP)"))
                  );
                })(),
                React.createElement("div", { className: "flex justify-end" },
                  React.createElement("button", { "aria-label": __alloT('stem.rocks.next_question_aria', "Next question (shortcut: N)"),
                    onClick: function () {
                      const nextIdx = ((d.quizIdx || 0) + 1) % QUIZ_BANK.length;
                      upd("quizIdx", nextIdx); upd("quizFeedback", null);
                    }, className: "px-4 py-1.5 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 transition-all active:scale-[0.97]"
                  }, __alloT('stem.rocks.next_question', "Next Question") + " \u2192 (N)")
                )
              )
            ),

            // === H7b'' inquiry widget: rock weathering ===
            mode === 'weathHunt' && (function() {
              var h = React.createElement;
              var iq = d.weathHunt || { tempSwing: 20, rainfall: 200, pH: 7, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              function setIQ(patch) { upd("weathHunt", Object.assign({}, iq, patch)); }
              var physical = iq.tempSwing / 50;
              var chemical = (iq.rainfall / 500) * (Math.abs(iq.pH - 7) / 4);
              var total = physical + chemical;
              var state;
              if (chemical > physical * 1.5 && chemical > 0.4) state = 'chemDom';
              else if (physical > chemical * 1.5 && physical > 0.4) state = 'physDom';
              else if (total > 0.5) state = 'mixed';
              else state = 'minimal';
              var sm = {
                chemDom: { label: '\ud83e\uddea ' + __alloT('stem.rocks.weath_chem_label', 'Chemical-dominated'), color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', desc: __alloT('stem.rocks.weath_chem_desc', 'Acidic rain dissolves minerals. Karst landscapes form.') },
                physDom: { label: '\ud83d\udd28 ' + __alloT('stem.rocks.weath_phys_label', 'Physical-dominated'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', desc: __alloT('stem.rocks.weath_phys_desc', 'Freeze-thaw cycles fracture rock mechanically.') },
                mixed:   { label: '\u2696\ufe0f ' + __alloT('stem.rocks.weath_mixed_label', 'Mixed weathering'), color: '#0891b2', bg: '#ecfeff', border: '#67e8f9', desc: __alloT('stem.rocks.weath_mixed_desc', 'Both processes active. Typical temperate climate.') },
                minimal: { label: '\ud83d\udfe2 ' + __alloT('stem.rocks.weath_minimal_label', 'Minimal weathering'), color: '#059669', bg: '#ecfdf5', border: '#86efac', desc: __alloT('stem.rocks.weath_minimal_desc', 'Stable conditions. Rock surfaces persist.') }
              }[state];
              return h('div', { className: 'p-4 rounded-xl bg-white border border-amber-300 space-y-3' },
                h('h3', { className: 'text-sm font-black text-amber-700' }, '\u26cf\ufe0f ' + __alloT('stem.rocks.rock_weathering_discovery', 'Rock weathering discovery')),
                h('p', { className: 'text-[12px] text-slate-700 leading-relaxed' }, __alloT('stem.rocks.weathering_intro', 'Adjust temperature swings, rainfall, and rain pH. Widget classifies dominant weathering mode into 4 discrete categories. No score, no reveal.')),
                h('div', { className: 'p-3 rounded-lg text-center', style: { background: sm.bg, border: '2px solid ' + sm.border } },
                  h('div', { className: 'text-base font-black', style: { color: sm.color } }, sm.label),
                  h('div', { className: 'text-[11px] text-slate-700 mt-1' }, sm.desc)
                ),
                h('div', { className: 'grid grid-cols-3 gap-3' },
                  [{ k: 'tempSwing', l: __alloT('stem.rocks.weath_temp_swing', 'Temp swing (\u00b0C)'), mn: 0, mx: 50, st: 1 },
                   { k: 'rainfall', l: __alloT('stem.rocks.weath_rainfall', 'Rainfall (mm/yr)'), mn: 0, mx: 500, st: 10 },
                   { k: 'pH', l: __alloT('stem.rocks.weath_rain_ph', 'Rain pH'), mn: 0, mx: 14, st: 0.1 }].map(function(s) {
                    return h('div', { key: s.k },
                      h('label', { htmlFor: 'wh-' + s.k, className: 'block text-[11px] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-amber-700' }, iq[s.k])),
                      h('input', { id: 'wh-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                        onChange: function(e) { var p = {}; p[s.k] = parseFloat(e.target.value); setIQ(p); },
                        className: 'w-full', 'aria-label': s.l }));
                  })
                ),
                h('div', { className: 'flex gap-2 items-center flex-wrap' },
                  h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ t: iq.tempSwing, r: iq.rainfall, p: iq.pH, st: state }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-300' }, '\ud83d\udccb ' + __alloT('stem.rocks.weath_log', 'Log')),
                  h('button', { onClick: function() { setIQ({ tempSwing: 20, rainfall: 200, pH: 7, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[11px] font-semibold text-slate-600 border border-slate-300' }, '\u21ba ' + __alloT('stem.rocks.weath_reset', 'Reset'))
                ),
                h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.rocks.weath_hypothesis_placeholder', 'Hypothesis: What climate produces chemical vs physical dominance?'),
                  className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
                !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[11px] font-bold text-amber-800 border border-amber-300' }, '\ud83e\udd14 ' + __alloT('stem.rocks.weath_stuck_btn', 'Stuck \u2014 show open prompts')),
                iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700 leading-relaxed' },
                  h('ul', { className: 'list-disc pl-5 space-y-1' },
                    h('li', null, __alloT('stem.rocks.weath_prompt_ph', 'Try pH=4 (acid rain). Does that change the mode?')),
                    h('li', null, __alloT('stem.rocks.weath_prompt_temp', 'Why does temperature swing matter more in arid climates?')))),
                h('div', { className: 'p-3 rounded bg-emerald-50 border border-emerald-200' },
                  h('label', { className: 'flex items-center gap-2 text-[12px] font-bold text-emerald-800 cursor-pointer' },
                    h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                    __alloT('stem.rocks.weath_understand_label', 'I understand \u2014 explain in own words')),
                  iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.rocks.weath_explanation_placeholder', 'Explain how climate selects which weathering mode dominates.'),
                    className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 })),
                h('div', { className: 'text-[10px] italic text-slate-500' }, __alloT('stem.rocks.weath_design_note', 'Design note: discrete 4-state weathering marker; no rate score; no reveal \u2014 by design.'))
              );
            })(),


            // Bottom controls

            React.createElement("div", { className: "flex gap-3 mt-3 items-center" },

              React.createElement("button", { "aria-label": __alloT('stem.rocks.snapshot', "Snapshot"),

                onClick: function () {

                  setToolSnapshots(function (prev) { return prev.concat([{ id: 'rk-' + Date.now(), tool: 'rocks', label: t('stem.rocks.rocks') + (selRock ? ': ' + selRock.label : selMineral ? ': ' + selMineral.label : ''), data: Object.assign({}, d), timestamp: Date.now() }]); });

                  addToast('\uD83D\uDCF8 Snapshot saved!', 'success');

                }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all"

              }, "\uD83D\uDCF8 " + __alloT('stem.rocks.snapshot', "Snapshot"))

            )

          )
      })();
    }
  });

  // ═══ 🔬 rockCycle (rockCycle) ═══
  window.StemLab.registerTool('rockCycle', {
    icon: '🔬',
    label: 'rockCycle',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'view_3_rocks', label: 'Explore all 3 rock families', icon: '🪨', check: function(d) { return Object.keys(d.rcViewed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.rcViewed || {}).length + '/3 families'; } },
      { id: 'try_process', label: 'Inspect a transformation process', icon: '↔️', check: function(d) { return !!d.selectedProcess; }, progress: function(d) { return d.selectedProcess ? 'Done' : 'Pick a process'; } },
      { id: 'run_3_transforms', label: 'Run the Transformation Machine 3 times', icon: '🔄', check: function(d) { return (d.transformsRun || 0) >= 3; }, progress: function(d) { return (d.transformsRun || 0) + '/3 runs'; } }
    ],
    render: function(ctx) {
      // Aliases: maps ctx properties to original variable names
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
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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
      var props = ctx.props;

      // ── Tool body (rockCycle) ──
      return (function() {
const d = labToolData.rockCycle || {};

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, rockCycle: { ...prev.rockCycle, [key]: val } }));

          const ROCKS = [

            {

              id: 'igneous', label: t('stem.rocks.igneous'), emoji: '\uD83C\uDF0B', color: '#ef4444', glow: '#fca5a5',

              desc: 'Formed when magma or lava cools and solidifies. Intrusive igneous rocks (granite) cool slowly underground with large crystals. Extrusive rocks (basalt) cool quickly at the surface with fine grains.',

              examples: 'Granite, Basalt, Obsidian, Pumice, Rhyolite, Gabbro',

              hardness: '6-7 (Mohs)', crystals: 'Visible in intrusive; microscopic in extrusive',

              uses: 'Countertops (granite), road gravel (basalt), surgical blades (obsidian)',

              funFact: 'Obsidian fractures so cleanly it was used for Stone Age scalpels, sharper than modern steel!'

            },

            {

              id: 'sedimentary', label: t('stem.rocks.sedimentary'), emoji: '\uD83C\uDFD6\uFE0F', color: '#eab308', glow: '#fde68a',

              desc: 'Formed from layers of sediment (sand, mud, shells, organic matter) compressed and cemented over millions of years. The only rock type that commonly contains fossils, making it essential for paleontology.',

              examples: 'Sandstone, Limestone, Shale, Chalk, Conglomerate, Coal',

              hardness: '3-6 (Mohs)', crystals: 'Layered grain structure, not crystalline',

              uses: 'Building stone (sandstone), cement (limestone), energy (coal)',

              funFact: 'The White Cliffs of Dover are chalk, made from trillions of microscopic coccolithophore shells!'

            },

            {

              id: 'metamorphic', label: t('stem.rocks.metamorphic'), emoji: '\uD83D\uDC8E', color: '#8b5cf6', glow: '#c4b5fd',

              desc: 'Formed when existing rocks are transformed by extreme heat and/or pressure deep underground. The minerals recrystallize without melting, creating new textures and sometimes foliation (layered banding).',

              examples: 'Marble, Slate, Quartzite, Gneiss, Schist, Phyllite',

              hardness: '6-8 (Mohs)', crystals: 'Recrystallized; often banded (foliated)',

              uses: 'Sculpture (marble), roofing (slate), decorative stone (gneiss)',

              funFact: 'Michelangelo\'s David is carved from Carrara marble, metamorphosed limestone from Tuscany!'

            },

          ];

          const PROCESSES = [

            { from: 'igneous', to: 'sedimentary', label: t('stem.rock_cycle.weathering_erosion'), emoji: '\uD83C\uDF2C\uFE0F', desc: 'Wind, water, ice, and biological activity break igneous rocks into sediments. Rivers carry fragments to basins where they settle in layers.' },

            { from: 'sedimentary', to: 'metamorphic', label: t('stem.rock_cycle.heat_pressure'), emoji: '\uD83D\uDD25', desc: 'Deep burial subjects sedimentary rock to intense heat (200-800°C) and pressure, transforming its mineral structure without melting.' },

            { from: 'metamorphic', to: 'igneous', label: t('stem.rock_cycle.melting_cooling'), emoji: '\uD83C\uDF0B', desc: 'Extreme heat (>800\u00B0C) melts metamorphic rock into magma. When it cools (slowly underground or quickly at the surface), new igneous rock forms.' },

            { from: 'igneous', to: 'metamorphic', label: t('stem.rock_cycle.heat_pressure'), emoji: '\u2B07\uFE0F', desc: 'Igneous rock can be buried deep and subjected to extreme conditions, directly transforming into metamorphic rock.' },

            { from: 'sedimentary', to: 'igneous', label: t('stem.rock_cycle.melting_cooling'), emoji: '\uD83C\uDF0B', desc: 'Under extreme heat, sedimentary rock can melt into magma and re-solidify as igneous rock.' },

            { from: 'metamorphic', to: 'sedimentary', label: t('stem.rock_cycle.weathering_erosion'), emoji: '\uD83C\uDF2C\uFE0F', desc: 'Metamorphic rocks exposed at the surface weather and erode into sediments over time.' },

          ];

          const sel = d.selectedRock ? ROCKS.find(r => r.id === d.selectedRock) : null;



          // ── Animated Canvas2D for Rock Cycle ──

          var _lastRcCanvas = null;

          const canvasRef = function (canvasEl) {

            if (!canvasEl) {

              if (_lastRcCanvas && _lastRcCanvas._rcCleanup) { _lastRcCanvas._rcCleanup(); _lastRcCanvas._rcInit = false; }

              _lastRcCanvas = null;

              return;

            }

            _lastRcCanvas = canvasEl;

            if (canvasEl._rcInit) return;

            canvasEl._rcInit = true;

            var cW = canvasEl.width = canvasEl.offsetWidth * 2;

            var cH = canvasEl.height = canvasEl.offsetHeight * 2;

            var ctx = canvasEl.getContext('2d');
            if (!ctx) { canvasEl._rcInit = false; return; }

            var dpr = 2;

            var tick = 0;
            var rcAlive = true;
            var rcMotionReduced = false;
            try { rcMotionReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

            function isRockCycleHidden() {
              return typeof document !== 'undefined' && !!document.hidden;
            }

            function cancelRockCycleFrame() {
              if (canvasEl._rcAnim && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(canvasEl._rcAnim);
              canvasEl._rcAnim = null;
            }

            function scheduleRockCycleFrame() {
              if (!rcAlive || rcMotionReduced || canvasEl._rcAnim || isRockCycleHidden()) return;
              if (typeof requestAnimationFrame !== 'function') return;
              canvasEl._rcAnim = requestAnimationFrame(draw);
            }

            function cleanupRockCycleCanvas() {
              rcAlive = false;
              cancelRockCycleFrame();
              canvasEl.removeEventListener('click', onRockCycleClick);
              if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onRockCycleVisibilityChange);
              canvasEl._rcCleanup = null;
              canvasEl._rcInit = false;
            }

            function onRockCycleVisibilityChange() {
              if (!rcAlive) return;
              if (!canvasEl.isConnected) { cleanupRockCycleCanvas(); return; }
              if (isRockCycleHidden()) cancelRockCycleFrame();
              else { cancelRockCycleFrame(); draw(); }
            }



            // Rock node positions (in CSS pixels)

            var nodes = {

              igneous: { x: cW * 0.5 / dpr, y: cH * 0.15 / dpr },

              sedimentary: { x: cW * 0.82 / dpr, y: cH * 0.7 / dpr },

              metamorphic: { x: cW * 0.18 / dpr, y: cH * 0.7 / dpr }

            };



            // Lava particles

            var lavaPs = [];

            for (var li = 0; li < 40; li++) {

              lavaPs.push({ x: Math.random() * cW / dpr, y: cH * 0.92 / dpr + Math.random() * cH * 0.08 / dpr, vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 0.8, size: 1.5 + Math.random() * 2.5, life: Math.random() });

            }



            // Process flow particles

            var flowPs = [];

            for (var fi = 0; fi < 60; fi++) {

              var procIdx = fi % 6;

              flowPs.push({ proc: procIdx, t: Math.random(), speed: 0.001 + Math.random() * 0.003, size: 1 + Math.random() * 1.5 });

            }



            // Erosion particles (falling bits)

            var erosionPs = [];

            for (var ei = 0; ei < 25; ei++) {

              erosionPs.push({ x: Math.random() * cW / dpr, y: Math.random() * cH / dpr, vy: 0.2 + Math.random() * 0.5, size: 0.8 + Math.random() * 1.5, phase: Math.random() * Math.PI * 2 });

            }



            function draw() {
              if (!rcAlive) return;
              canvasEl._rcAnim = null;
              if (!canvasEl.isConnected) { cleanupRockCycleCanvas(); return; }
              if (isRockCycleHidden()) { cancelRockCycleFrame(); return; }

              if (!rcMotionReduced) tick++;

              ctx.clearRect(0, 0, cW, cH);



              // ── Background: earth cross-section gradient ──

              var bg = ctx.createLinearGradient(0, 0, 0, cH);

              bg.addColorStop(0, '#1e293b');

              bg.addColorStop(0.5, '#44403c');

              bg.addColorStop(0.75, '#78350f');

              bg.addColorStop(0.88, '#92400e');

              bg.addColorStop(1, '#dc2626');

              ctx.fillStyle = bg;

              ctx.fillRect(0, 0, cW, cH);



              // ── Magma chamber (bottom) ──

              var magmaY = cH * 0.88;

              var magmaGrad = ctx.createRadialGradient(cW / 2, cH, cW * 0.1, cW / 2, cH, cW * 0.5);

              magmaGrad.addColorStop(0, 'rgba(255,100,0,0.8)');

              magmaGrad.addColorStop(0.5, 'rgba(220,38,38,0.5)');

              magmaGrad.addColorStop(1, 'rgba(180,20,0,0)');

              ctx.fillStyle = magmaGrad;

              ctx.fillRect(0, magmaY, cW, cH - magmaY);

              // Magma convection currents (animated flow lines)

              ctx.strokeStyle = 'rgba(255,160,0,0.15)'; ctx.lineWidth = 2 * dpr;

              for (var mci = 0; mci < 4; mci++) {

                var mcOff = ((tick * 0.3 + mci * 60) % 240) - 40;

                var mcXCenter = cW * (0.15 + mci * 0.22);

                ctx.beginPath();

                ctx.moveTo(mcXCenter - 20 * dpr, cH - 5 * dpr);

                ctx.quadraticCurveTo(mcXCenter - 15 * dpr, cH - (20 + mcOff * 0.2) * dpr, mcXCenter, cH - (30 + mcOff * 0.3) * dpr);

                ctx.quadraticCurveTo(mcXCenter + 15 * dpr, cH - (20 + mcOff * 0.2) * dpr, mcXCenter + 20 * dpr, cH - 5 * dpr);

                ctx.stroke();

              }

              // Heat shimmer effect near magma zone

              for (var hsi = 0; hsi < 12; hsi++) {

                var hsX = (hsi / 12) * cW;

                var hsY = magmaY - 5 * dpr + Math.sin(tick * 0.04 + hsi * 1.3) * 4 * dpr;

                var hsAlpha = 0.04 + 0.03 * Math.sin(tick * 0.03 + hsi);

                ctx.fillStyle = 'rgba(255,150,50,' + hsAlpha + ')';

                ctx.beginPath(); ctx.ellipse(hsX, hsY, 10 * dpr, 3 * dpr, 0, 0, Math.PI * 2); ctx.fill();

              }



              // Lava bubbles

              for (var lbi = 0; lbi < lavaPs.length; lbi++) {

                var lp = lavaPs[lbi];

                lp.x += lp.vx;

                lp.y += lp.vy * 0.3;

                lp.life -= 0.005;

                if (lp.life <= 0 || lp.y < magmaY / dpr) {

                  lp.x = Math.random() * cW / dpr;

                  lp.y = cH * 0.92 / dpr + Math.random() * cH * 0.08 / dpr;

                  lp.life = 0.8 + Math.random() * 0.2;

                }

                ctx.beginPath();

                ctx.arc(lp.x * dpr, lp.y * dpr, lp.size * dpr, 0, Math.PI * 2);

                var lpHue = Math.round(lp.life * 60);

                ctx.fillStyle = 'hsla(' + lpHue + ',100%,55%,' + (lp.life * 0.8) + ')';

                ctx.fill();

              }



              // ── Sediment layer bands ──

              var sedLayers = [

                { y: 0.68, h: 0.04, color: 'rgba(194,159,120,0.2)' },  // sandstone

                { y: 0.72, h: 0.03, color: 'rgba(120,100,80,0.15)' },  // clay

                { y: 0.75, h: 0.04, color: 'rgba(180,170,130,0.12)' }, // limestone

                { y: 0.79, h: 0.03, color: 'rgba(100,80,60,0.18)' },   // shale

                { y: 0.82, h: 0.03, color: 'rgba(140,110,90,0.1)' }    // deep sediment

              ];

              for (var sli = 0; sli < sedLayers.length; sli++) {

                var sl = sedLayers[sli];

                ctx.fillStyle = sl.color;

                ctx.beginPath(); ctx.moveTo(0, cH * sl.y);

                for (var slx = 0; slx < cW; slx += 6) {

                  ctx.lineTo(slx, cH * sl.y + Math.sin(slx * 0.012 + sli * 1.5) * 2 * dpr);

                }

                ctx.lineTo(cW, cH * (sl.y + sl.h)); ctx.lineTo(0, cH * (sl.y + sl.h)); ctx.closePath(); ctx.fill();

                // Tiny fossil/grain marks in sedimentary layers

                if (sli < 3) {

                  ctx.fillStyle = 'rgba(200,180,150,0.1)';

                  for (var fmi = 0; fmi < 4; fmi++) {

                    var fmx = cW * (0.15 + fmi * 0.22 + sli * 0.05);

                    var fmy = cH * (sl.y + sl.h * 0.5);

                    ctx.beginPath(); ctx.ellipse(fmx, fmy, 3 * dpr, 1.5 * dpr, fmi * 0.5, 0, Math.PI * 2); ctx.fill();

                  }

                }

              }



              // ── Surface line ──

              ctx.strokeStyle = '#a8a29e';

              ctx.lineWidth = 2 * dpr;

              ctx.beginPath();

              ctx.moveTo(0, cH * 0.65);

              for (var sx = 0; sx < cW; sx += 3) {

                ctx.lineTo(sx, cH * 0.65 + Math.sin(sx * 0.02 + tick * 0.01) * 3 * dpr);

              }

              ctx.stroke();

              // Surface terrain: grass tufts

              for (var gti = 0; gti < 30; gti++) {

                var gtx = gti * cW / 30;

                var gtBase = cH * 0.65 + Math.sin(gtx * 0.02 + tick * 0.01) * 3 * dpr;

                var gtSway = Math.sin(tick * 0.012 + gti * 0.9) * 2 * dpr;

                ctx.strokeStyle = 'rgba(74,222,128,' + (0.25 + gti % 3 * 0.05) + ')'; ctx.lineWidth = 1 * dpr;

                ctx.beginPath(); ctx.moveTo(gtx, gtBase);

                ctx.lineTo(gtx + gtSway, gtBase - (3 + gti % 3) * dpr); ctx.stroke();

                // Second blade

                ctx.beginPath(); ctx.moveTo(gtx + 2 * dpr, gtBase);

                ctx.lineTo(gtx + 2 * dpr - gtSway * 0.8, gtBase - (2.5 + gti % 2) * dpr); ctx.stroke();

              }

              // Surface terrain: small mountain silhouettes

              ctx.fillStyle = 'rgba(100,80,70,0.15)';

              ctx.beginPath(); ctx.moveTo(cW * 0.02, cH * 0.65); ctx.lineTo(cW * 0.08, cH * 0.59); ctx.lineTo(cW * 0.14, cH * 0.65); ctx.fill();

              ctx.beginPath(); ctx.moveTo(cW * 0.88, cH * 0.65); ctx.lineTo(cW * 0.94, cH * 0.60); ctx.lineTo(cW * 0.99, cH * 0.65); ctx.fill();

              // Scattered rock fragments on surface

              ctx.fillStyle = 'rgba(168,162,158,0.25)';

              for (var rfi = 0; rfi < 8; rfi++) {

                var rfx = cW * (0.05 + rfi * 0.12);

                var rfy = cH * 0.65 + 2 * dpr;

                ctx.beginPath(); ctx.ellipse(rfx, rfy, (1.5 + rfi % 3) * dpr, 1 * dpr, rfi * 0.4, 0, Math.PI * 2); ctx.fill();

              }



              // ── Volcano silhouette near igneous node ──

              var volX = cW * 0.5, volBaseY = cH * 0.65, volTopY = cH * 0.28;

              // Volcano body

              ctx.fillStyle = 'rgba(55,48,42,0.5)';

              ctx.beginPath(); ctx.moveTo(volX - 50 * dpr, volBaseY); ctx.lineTo(volX - 10 * dpr, volTopY);

              ctx.lineTo(volX + 10 * dpr, volTopY); ctx.lineTo(volX + 50 * dpr, volBaseY); ctx.closePath(); ctx.fill();

              // Crater rim

              ctx.fillStyle = 'rgba(80,60,50,0.6)';

              ctx.beginPath(); ctx.ellipse(volX, volTopY, 12 * dpr, 4 * dpr, 0, 0, Math.PI * 2); ctx.fill();

              // Inner crater glow

              var craterGlow = ctx.createRadialGradient(volX, volTopY + 2 * dpr, 2 * dpr, volX, volTopY + 2 * dpr, 10 * dpr);

              craterGlow.addColorStop(0, 'rgba(255,100,0,' + (0.5 + Math.sin(tick * 0.04) * 0.15).toFixed(3) + ')'); craterGlow.addColorStop(1, 'rgba(255,50,0,0)');

              ctx.fillStyle = craterGlow;

              ctx.beginPath(); ctx.ellipse(volX, volTopY + 2 * dpr, 8 * dpr, 3 * dpr, 0, 0, Math.PI * 2); ctx.fill();

              // Smoke/ash particles from crater

              for (var vsi = 0; vsi < 6; vsi++) {

                var vsPhase = tick * 0.01 + vsi * 1.1;

                var vsAge = ((tick * 0.5 + vsi * 40) % 120) / 120;

                var vsx = volX + Math.sin(vsPhase) * (5 + vsAge * 15) * dpr;

                var vsy = volTopY - vsAge * 40 * dpr;

                var vsAlpha = (1 - vsAge) * 0.25;

                var vsSize = (2 + vsAge * 4) * dpr;

                ctx.fillStyle = 'rgba(120,110,100,' + vsAlpha + ')';

                ctx.beginPath(); ctx.arc(vsx, vsy, vsSize, 0, Math.PI * 2); ctx.fill();

              }

              // Lava flow streak down one side

              ctx.strokeStyle = 'rgba(255,100,0,0.3)'; ctx.lineWidth = 2.5 * dpr;

              ctx.beginPath(); ctx.moveTo(volX + 5 * dpr, volTopY + 3 * dpr);

              ctx.quadraticCurveTo(volX + 20 * dpr, volTopY + (volBaseY - volTopY) * 0.3, volX + 35 * dpr, volTopY + (volBaseY - volTopY) * 0.6);

              ctx.stroke();

              // Lava glow on flow

              ctx.strokeStyle = 'rgba(255,200,50,0.15)'; ctx.lineWidth = 4 * dpr;

              ctx.stroke();



              // ── Erosion particles ──

              for (var epi = 0; epi < erosionPs.length; epi++) {

                var ep2 = erosionPs[epi];

                ep2.y += ep2.vy;

                ep2.x += Math.sin(ep2.phase + tick * 0.02) * 0.3;

                if (ep2.y > cH * 0.65 / dpr) { ep2.y = cH * 0.05 / dpr; ep2.x = Math.random() * cW / dpr; }

                ctx.beginPath();

                ctx.arc(ep2.x * dpr, ep2.y * dpr, ep2.size * dpr, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(168,162,158,0.3)';

                ctx.fill();

              }



              // ── Process flow particles along arrows ──

              var selRockId = canvasEl.dataset.selectedRock || '';

              for (var fpi = 0; fpi < flowPs.length; fpi++) {

                var fp = flowPs[fpi];

                fp.t += fp.speed;

                if (fp.t > 1) fp.t -= 1;

                var proc = PROCESSES[fp.proc];

                if (!proc) continue;

                var fromN = nodes[proc.from];

                var toN = nodes[proc.to];

                if (!fromN || !toN) continue;

                var midX = (fromN.x + toN.x) / 2 + (toN.y - fromN.y) * 0.2;

                var midY = (fromN.y + toN.y) / 2 - (toN.x - fromN.x) * 0.2;

                var t2 = fp.t;

                var px = (1 - t2) * (1 - t2) * fromN.x + 2 * (1 - t2) * t2 * midX + t2 * t2 * toN.x;

                var py = (1 - t2) * (1 - t2) * fromN.y + 2 * (1 - t2) * t2 * midY + t2 * t2 * toN.y;

                var fpColor = proc.label.includes('Weather') ? '168,162,158' : proc.label.includes('Heat') ? '139,92,246' : '239,68,68';

                var fpAlpha = 0.3 + 0.3 * Math.sin(t2 * Math.PI);

                ctx.beginPath();

                ctx.arc(px * dpr, py * dpr, fp.size * dpr, 0, Math.PI * 2);

                ctx.fillStyle = 'rgba(' + fpColor + ',' + fpAlpha + ')';

                ctx.fill();

              }



              // ── Process arrow curves ──

              // Render ALL 6 process edges — the 3 forward (canonical) cycle steps PLUS the 3
              // "shortcut" reverse edges — so the diagram shows the rock cycle as the BRANCHING
              // network it really is (any rock → any rock), not a one-way circle. Shortcuts arc the
              // opposite way and are de-emphasized; every edge gets a direction arrowhead.
              PROCESSES.forEach(function (proc, i) {
                var fromN = nodes[proc.from];
                var toN = nodes[proc.to];
                var shortcut = i >= 3;
                var bow = shortcut ? -0.34 : 0.2;
                var midX = (fromN.x + toN.x) / 2 + (toN.y - fromN.y) * bow;
                var midY = (fromN.y + toN.y) / 2 - (toN.x - fromN.x) * bow;
                ctx.beginPath();
                ctx.moveTo(fromN.x * dpr, fromN.y * dpr);
                ctx.quadraticCurveTo(midX * dpr, midY * dpr, toN.x * dpr, toN.y * dpr);
                ctx.strokeStyle = shortcut ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.45)';
                ctx.lineWidth = (shortcut ? 1 : 1.5) * dpr;
                ctx.setLineDash([6, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
                // Direction arrowhead at ~80% along the curve (just outside the destination node).
                var tt = 0.8;
                var bx = (1 - tt) * (1 - tt) * fromN.x + 2 * (1 - tt) * tt * midX + tt * tt * toN.x;
                var by = (1 - tt) * (1 - tt) * fromN.y + 2 * (1 - tt) * tt * midY + tt * tt * toN.y;
                var ang = Math.atan2(2 * (1 - tt) * (midY - fromN.y) + 2 * tt * (toN.y - midY), 2 * (1 - tt) * (midX - fromN.x) + 2 * tt * (toN.x - midX));
                var ah = (shortcut ? 5 : 7) * dpr;
                ctx.fillStyle = shortcut ? 'rgba(148,163,184,0.45)' : 'rgba(148,163,184,0.75)';
                ctx.beginPath();
                ctx.moveTo(bx * dpr, by * dpr);
                ctx.lineTo(bx * dpr - ah * Math.cos(ang - 0.42), by * dpr - ah * Math.sin(ang - 0.42));
                ctx.lineTo(bx * dpr - ah * Math.cos(ang + 0.42), by * dpr - ah * Math.sin(ang + 0.42));
                ctx.closePath();
                ctx.fill();
                // Label only the 3 forward edges (the 3 shortcuts repeat the same process names and
                // would clutter the small canvas).
                if (!shortcut) {
                  var labelX = (fromN.x + midX + toN.x) / 3;
                  var labelY = (fromN.y + midY + toN.y) / 3;
                  ctx.font = 'bold ' + (6 * dpr) + 'px sans-serif';
                  ctx.fillStyle = 'rgba(226,232,240,0.78)';
                  ctx.textAlign = 'center';
                  ctx.fillText(proc.label, labelX * dpr, labelY * dpr);
                }
              });



              // ── Rock nodes (with unique textures per type) ──

              ROCKS.forEach(function (rock) {

                var n = nodes[rock.id];

                var isSel = selRockId === rock.id;

                var radius = isSel ? 34 : 28;

                var pulse = 1 + 0.05 * Math.sin(tick * 0.04);

                var glowGrad = ctx.createRadialGradient(n.x * dpr, n.y * dpr, radius * 0.5 * dpr, n.x * dpr, n.y * dpr, radius * 2 * dpr * pulse);

                glowGrad.addColorStop(0, rock.color + '60');

                glowGrad.addColorStop(0.5, rock.color + '20');

                glowGrad.addColorStop(1, rock.color + '00');

                ctx.beginPath();

                ctx.arc(n.x * dpr, n.y * dpr, radius * 2 * dpr * pulse, 0, Math.PI * 2);

                ctx.fillStyle = glowGrad;

                ctx.fill();

                ctx.beginPath();

                ctx.arc(n.x * dpr, n.y * dpr, radius * dpr, 0, Math.PI * 2);

                var innerGrad = ctx.createRadialGradient(n.x * dpr - 5 * dpr, n.y * dpr - 5 * dpr, 2 * dpr, n.x * dpr, n.y * dpr, radius * dpr);

                innerGrad.addColorStop(0, rock.glow);

                innerGrad.addColorStop(1, rock.color);

                ctx.fillStyle = innerGrad;

                ctx.fill();

                ctx.strokeStyle = isSel ? '#ffffff' : rock.glow;

                ctx.lineWidth = (isSel ? 3 : 1.5) * dpr;

                ctx.stroke();

                // Orbiting dashed ring on the selected node — a clear "you are here"
                if (isSel) {
                  ctx.save();
                  ctx.setLineDash([6 * dpr, 5 * dpr]);
                  ctx.lineDashOffset = -tick * 0.6 * dpr;
                  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
                  ctx.lineWidth = 1.5 * dpr;
                  ctx.beginPath();
                  ctx.arc(n.x * dpr, n.y * dpr, (radius + 8) * dpr, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.restore();
                }

                // Rock-type-specific internal textures

                ctx.save();

                ctx.beginPath(); ctx.arc(n.x * dpr, n.y * dpr, radius * dpr, 0, Math.PI * 2); ctx.clip();

                if (rock.id === 'igneous') {

                  // Crystal facets / angular shards

                  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.8 * dpr;

                  for (var ci = 0; ci < 8; ci++) {

                    var ca = ci * Math.PI * 2 / 8 + tick * 0.001;

                    var cr1 = (6 + ci * 2) * dpr;

                    var cr2 = (12 + ci * 1.5) * dpr;

                    ctx.beginPath();

                    ctx.moveTo(n.x * dpr + Math.cos(ca) * cr1, n.y * dpr + Math.sin(ca) * cr1);

                    ctx.lineTo(n.x * dpr + Math.cos(ca + 0.3) * cr2, n.y * dpr + Math.sin(ca + 0.3) * cr2);

                    ctx.lineTo(n.x * dpr + Math.cos(ca + 0.6) * cr1 * 1.3, n.y * dpr + Math.sin(ca + 0.6) * cr1 * 1.3);

                    ctx.stroke();

                  }

                  // Sparkle dots on crystals

                  ctx.save(); ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 5;
                  ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.1 * Math.sin(tick * 0.05)) + ')';

                  for (var spi2 = 0; spi2 < 5; spi2++) {

                    var spa = spi2 * 1.3 + tick * 0.003;

                    ctx.beginPath(); ctx.arc(n.x * dpr + Math.cos(spa) * 10 * dpr, n.y * dpr + Math.sin(spa) * 8 * dpr, 1.2 * dpr, 0, Math.PI * 2); ctx.fill();

                  }
                  ctx.restore();

                } else if (rock.id === 'sedimentary') {

                  // Horizontal strata / layers

                  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1 * dpr;

                  for (var li = -3; li <= 3; li++) {

                    var ly = n.y * dpr + li * 6 * dpr;

                    ctx.beginPath(); ctx.moveTo((n.x - radius) * dpr, ly + Math.sin(li + 1) * 2 * dpr);

                    ctx.lineTo((n.x + radius) * dpr, ly + Math.sin(li + 2) * 2 * dpr); ctx.stroke();

                  }

                  // Tiny fossil shapes

                  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.7 * dpr;

                  // Shell spiral

                  ctx.beginPath();

                  for (var fsa = 0; fsa < Math.PI * 3; fsa += 0.3) {

                    var fsr = 2 + fsa * 1.2;

                    ctx.lineTo(n.x * dpr + 8 * dpr + Math.cos(fsa) * fsr, n.y * dpr - 5 * dpr + Math.sin(fsa) * fsr);

                  }

                  ctx.stroke();

                  // Leaf imprint

                  ctx.beginPath(); ctx.ellipse(n.x * dpr - 8 * dpr, n.y * dpr + 5 * dpr, 5 * dpr, 2.5 * dpr, 0.3, 0, Math.PI * 2); ctx.stroke();

                  ctx.beginPath(); ctx.moveTo((n.x - 11) * dpr, (n.y + 5) * dpr); ctx.lineTo((n.x - 5) * dpr, (n.y + 5) * dpr); ctx.stroke();

                } else if (rock.id === 'metamorphic') {

                  // Wavy foliation bands

                  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.2 * dpr;

                  for (var fi = -2; fi <= 2; fi++) {

                    ctx.beginPath();

                    for (var fx = -radius; fx <= radius; fx += 3) {

                      var fy = fi * 7 + Math.sin(fx * 0.15 + fi * 0.8) * 4;

                      ctx.lineTo((n.x + fx) * dpr, (n.y + fy) * dpr);

                    }

                    ctx.stroke();

                  }

                  // Garnet/mineral dots

                  ctx.fillStyle = 'rgba(200,130,255,0.2)';

                  for (var gdi = 0; gdi < 4; gdi++) {

                    var gda = gdi * Math.PI / 2 + 0.5;

                    ctx.beginPath(); ctx.arc(n.x * dpr + Math.cos(gda) * 12 * dpr, n.y * dpr + Math.sin(gda) * 9 * dpr, 2 * dpr, 0, Math.PI * 2); ctx.fill();

                  }

                }

                ctx.restore();

                // Emoji + label

                ctx.font = (18 * dpr) + 'px sans-serif';

                ctx.textAlign = 'center';

                ctx.fillText(rock.emoji, n.x * dpr, n.y * dpr + 7 * dpr);

                ctx.font = 'bold ' + (8 * dpr) + 'px sans-serif';

                ctx.fillStyle = '#ffffff';

                ctx.fillText(rock.label, n.x * dpr, (n.y + radius + 14) * dpr);

              });



              // ── HUD ──

              ctx.fillStyle = 'rgba(0,0,0,0.5)';

              ctx.fillRect(6 * dpr, 6 * dpr, 100 * dpr, 18 * dpr);

              ctx.font = 'bold ' + (7 * dpr) + 'px sans-serif';

              ctx.textAlign = 'left';

              ctx.fillStyle = 'rgba(226,232,240,0.8)';

              ctx.fillText('\uD83E\uDEA8 Rock Cycle', 12 * dpr, 19 * dpr);

              scheduleRockCycleFrame();

            }

            draw();

            canvasEl._rcCleanup = cleanupRockCycleCanvas;
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onRockCycleVisibilityChange);



            function onRockCycleClick(e) {

              var rect = canvasEl.getBoundingClientRect();

              var mx = (e.clientX - rect.left) / rect.width * (cW / dpr);

              var my = (e.clientY - rect.top) / rect.height * (cH / dpr);

              ROCKS.forEach(function (rock) {

                var n = nodes[rock.id];

                var dist = Math.sqrt((mx - n.x) * (mx - n.x) + (my - n.y) * (my - n.y));

                if (dist < 40) {

                  canvasEl.dataset.selectedRock = rock.id;

                  upd('selectedRock', rock.id);

                  // Track families explored (functional update — this listener's
                  // closure is bound once at canvas init, so `d` here is stale)
                  setLabToolData(function (prev) {
                    var rc = prev.rockCycle || {};
                    var v = Object.assign({}, rc.rcViewed);
                    v[rock.id] = true;
                    return Object.assign({}, prev, { rockCycle: Object.assign({}, rc, { rcViewed: v }) });
                  });
                  if (rcMotionReduced) draw();

                }

              });

            }
            canvasEl.addEventListener('click', onRockCycleClick);

          };


          var viewedFamilies = Object.keys(d.rcViewed || {}).length;
          var transformsRun = d.transformsRun || 0;
          var nextMission = viewedFamilies < 3 ? { icon: '🪨', title: __alloT('stem.rocks.mission_compare_title', 'Compare all three rock families'), detail: __alloT('stem.rocks.mission_compare_detail', 'Select each node and look for evidence of how it formed.') }
            : !d.selectedProcess ? { icon: '↔️', title: __alloT('stem.rocks.mission_trace_title', 'Trace a transformation'), detail: __alloT('stem.rocks.mission_trace_detail', 'Choose an arrow to connect process, energy, and time.') }
            : transformsRun < 3 ? { icon: '🔄', title: __alloT('stem.rocks.mission_test_title', 'Test the transformation machine'), detail: __alloT('stem.rocks.mission_test_detail', 'Run another pathway and compare its inputs and products.') }
            : { icon: '🧠', title: __alloT('stem.rocks.mission_explain_title', 'Explain the branching cycle'), detail: __alloT('stem.rocks.mission_explain_detail', 'Use evidence to show why the rock cycle has many valid paths.') };

          return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { type: 'button', onClick: () => setStemLabTool(null), className: "transition-colors grid h-10 w-10 shrink-0 place-items-center border border-slate-200 hover:bg-slate-100 rounded-xl active:scale-[0.97]", 'aria-label': __alloT('stem.rocks.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800 tracking-tight" }, "\uD83E\uDEA8 " + __alloT('stem.rocks.rock_cycle_title', "Rock Cycle")),

              React.createElement("span", { className: "px-2 py-0.5 bg-orange-100 text-orange-700 text-[11px] font-bold rounded-full" }, __alloT('stem.rocks.animated_badge', "ANIMATED"))

            ),

            React.createElement("section", { "data-rockcycle-command": true, className: "relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-sky-50 p-4 sm:p-5 mb-4", "aria-labelledby": "rockcycle-command-title" },
              React.createElement("div", { className: "absolute -right-6 -top-8 text-8xl opacity-[0.06]", "aria-hidden": true }, "🪨"),
              React.createElement("div", { className: "relative grid gap-4 lg:grid-cols-[1.15fr_.85fr]" },
                React.createElement("div", null,
                  React.createElement("div", { className: "text-[10px] font-black uppercase tracking-[0.15em] text-orange-700" }, __alloT('stem.rocks.earth_systems_mission', "Earth systems mission")),
                  React.createElement("h2", { id: "rockcycle-command-title", className: "mt-2 text-xl sm:text-2xl font-black text-slate-900" }, nextMission.icon + " " + nextMission.title),
                  React.createElement("p", { className: "mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed" }, nextMission.detail),
                  React.createElement("div", { className: "mt-4 grid grid-cols-3 gap-2", "aria-label": __alloT('stem.rocks.mission_progress_aria', "Rock cycle mission progress") },
                    [[viewedFamilies + '/3', __alloT('stem.rocks.metric_families', 'Families')], [d.selectedProcess ? '1/1' : '0/1', __alloT('stem.rocks.metric_process', 'Process')], [transformsRun + '/3', __alloT('stem.rocks.metric_transforms', 'Transforms')]].map(function(metric) { return React.createElement("div", { key: metric[1], className: "rounded-xl border border-orange-100 bg-white/80 p-3 text-center" }, React.createElement("div", { className: "text-lg font-black text-slate-900" }, metric[0]), React.createElement("div", { className: "text-[10px] font-bold text-slate-500" }, metric[1])); })
                  )
                ),
                React.createElement("aside", { className: "rounded-xl border border-sky-200 bg-sky-50/70 p-4", "aria-label": __alloT('stem.rocks.evidence_route_aria', "Rock cycle evidence route") },
                  React.createElement("div", { className: "text-[10px] font-black uppercase tracking-wide text-sky-800" }, __alloT('stem.rocks.evidence_route', "Evidence route")),
                  React.createElement("ol", { className: "mt-2 space-y-2 text-[11px] text-slate-700" }, [__alloT('stem.rocks.evidence_step_observe', 'Observe texture and composition'), __alloT('stem.rocks.evidence_step_connect', 'Connect process to energy and time'), __alloT('stem.rocks.evidence_step_explain', 'Explain more than one valid pathway')].map(function(step, i) { return React.createElement("li", { key: step, className: "flex gap-2" }, React.createElement("span", { className: "font-black text-orange-600" }, (i + 1) + '.'), React.createElement("span", null, step)); }))
                )
              )
            ),

            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-amber-400 shadow-lg mb-3", style: { height: "420px" } },

              React.createElement("canvas", { ref: canvasRef, role: "img", tabIndex: 0, "aria-label": __alloT('stem.rocks.rock_sample_closeup_a', "Rock sample close-up") + (d.selectedRock ? " of " + d.selectedRock : "") + __alloT('stem.rocks.rock_sample_closeup_b', " — click to inspect."), "data-selected-rock": d.selectedRock || '', style: { width: "100%", height: "100%", display: "block", cursor: "pointer" } })

            ),

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },

              ROCKS.map(function (rock) {

                return React.createElement("button", { key: rock.id, onClick: function () { upd('selectedRock', rock.id); setLabToolData(function (prev) { var rc = prev.rockCycle || {}; var v = Object.assign({}, rc.rcViewed); v[rock.id] = true; return Object.assign({}, prev, { rockCycle: Object.assign({}, rc, { rcViewed: v }) }); }); },

                  className: "px-3 py-2 rounded-lg text-xs font-bold transition-all " + (d.selectedRock === rock.id ? 'text-white shadow-md scale-105' : 'border hover:opacity-80'),

                  style: { backgroundColor: d.selectedRock === rock.id ? rock.color : rock.color + '15', borderColor: rock.color, color: d.selectedRock === rock.id ? 'white' : rock.color }

                }, rock.emoji + " " + rock.label);

              })

            ),

            sel && React.createElement("div", { className: "rounded-xl border-2 p-4 animate-in slide-in-from-bottom-2 shadow-md mb-3", style: { borderColor: sel.color, background: 'linear-gradient(135deg, ' + sel.color + '12, ' + sel.color + '05)' } },

              React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                React.createElement("span", { className: "text-3xl", style: { filter: 'drop-shadow(0 0 8px ' + sel.color + ')' } }, sel.emoji),

                React.createElement("div", null,

                  React.createElement("h4", { className: "text-lg font-black tracking-tight", style: { color: sel.color } }, sel.label + " Rocks"),

                  React.createElement("p", { className: "text-[11px] text-slate-600" }, sel.examples)

                )

              ),

              React.createElement("p", { className: "text-sm text-slate-600 leading-relaxed mb-3" }, sel.desc),

              React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3" },

                React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.rocks.hardness_word', "Hardness")),

                  React.createElement("p", { className: "text-xs font-bold", style: { color: sel.color } }, sel.hardness)

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.rocks.crystals_label', "Crystals")),

                  React.createElement("p", { className: "text-xs font-bold", style: { color: sel.color } }, sel.crystals)

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.rocks.real_uses_label', "Real Uses")),

                  React.createElement("p", { className: "text-xs font-bold", style: { color: sel.color } }, sel.uses)

                )

              ),

              React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-200" },

                React.createElement("p", { className: "text-xs text-amber-700 italic" }, "\uD83D\uDCA1 " + sel.funFact)

              )

            ),

            React.createElement("div", { className: "mb-3" },

              React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2" }, "\u2194\uFE0F " + __alloT('stem.rocks.transformation_processes', "Transformation Processes")),

              React.createElement("div", { className: "grid grid-cols-3 gap-2" },

                PROCESSES.slice(0, 3).map(function (proc, i) {

                  var isActive = d.selectedProcess && d.selectedProcess.label === proc.label && d.selectedProcess.from === proc.from;

                  // findById is null-safe \u2014 chained `.find(...).label` was the
                  // single-click-crashes-the-panel pattern the 2026-06-07 audit
                  // flagged. Fallback to the raw id keeps the panel renderable.
                  var fromRock = window.StemLab && window.StemLab.findById ? window.StemLab.findById(ROCKS, proc.from) : null;
                  var toRock = window.StemLab && window.StemLab.findById ? window.StemLab.findById(ROCKS, proc.to) : null;
                  var processFromTo = (fromRock ? fromRock.label : proc.from) + " \u2192 " + (toRock ? toRock.label : proc.to);

                  return React.createElement("button", { key: i, onClick: function () { upd('selectedProcess', proc); },

                    className: "p-2 rounded-lg text-left border transition-all " + (isActive ? 'bg-orange-100 border-orange-400 shadow-md' : 'transition-colors bg-slate-50 border-slate-200 hover:bg-orange-50 active:scale-[0.97]')

                  },

                    React.createElement("p", { className: "text-sm font-bold " + (isActive ? 'text-orange-700' : 'text-slate-600') }, proc.emoji + " " + proc.label),

                    React.createElement("p", { className: "text-[11px] text-slate-600" }, processFromTo)

                  );

                })

              ),

              d.selectedProcess && React.createElement("div", { className: "mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200 animate-in slide-in-from-bottom text-sm text-orange-700" },

                React.createElement("strong", null, d.selectedProcess.emoji + " " + d.selectedProcess.label + ": "), d.selectedProcess.desc

              )

            ),

            // ── Branching-network + common-myths note ──
            React.createElement("div", { className: "mt-3 p-3 rounded-lg border border-violet-200 bg-violet-50 text-[12px] text-violet-900 leading-relaxed" },
              React.createElement("p", { className: "font-bold mb-1" }, "🔀 " + __alloT('stem.rocks.branching_network_title', "A branching network, not a one-way circle")),
              React.createElement("p", { className: "mb-2" }, __alloT('stem.rocks.branching_network_body', "ANY rock can become ANY other rock — the diagram's 6 arrows show every path. Which one happens depends on the process (the geological agent), not on a fixed order.")),
              React.createElement("p", { className: "font-bold mb-1" }, "⚠ " + __alloT('stem.rocks.common_myths', "Common myths")),
              React.createElement("ul", { className: "list-disc pl-4 space-y-0.5" },
                React.createElement("li", null, __alloT('stem.rocks.myth_rocks_never_change', "“Rocks never change.” They change constantly — just over thousands to millions of years.")),
                React.createElement("li", null, __alloT('stem.rocks.myth_one_way', "“The cycle only goes one way.” It can run in any direction (follow the arrows).")),
                React.createElement("li", null, __alloT('stem.rocks.myth_soil_is_rock', "“Soil is a rock.” Soil is weathered rock plus organic matter — not a rock itself.")),
                React.createElement("li", null, __alloT('stem.rocks.myth_lava_magma', "“Lava and magma are the same.” Magma is molten rock UNDERGROUND; once it erupts it's lava."))
              )
            ),

            // Rock Transformation Machine
            React.createElement("div", { className: "mt-4 border-t border-slate-200 pt-3" },
              React.createElement("p", { className: "text-xs font-black text-orange-700 mb-1 flex items-center gap-1.5" },
                React.createElement("span", null, "🔄"),
                React.createElement("span", null, __alloT('stem.rocks.transformation_machine_title', "Rock Transformation Machine"))
              ),
              React.createElement("p", { className: "text-[11px] text-slate-600 mb-3" },
                __alloT('stem.rocks.transformation_machine_intro', "Select a starting rock type, pick a geological agent of change, and run the machine to witness its metamorphic, igneous, or sedimentary transformation!")
              ),
              React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-2 mb-3" },
                React.createElement("div", null,
                  React.createElement("label", { className: "block text-[10px] font-bold text-slate-500 uppercase mb-1" }, __alloT('stem.rocks.starting_rock', "Starting Rock")),
                  React.createElement("select", {
                    value: d.startingRock || 'igneous',
                    onChange: function(e) { upd("startingRock", e.target.value); },
                    className: "w-full p-1.5 text-xs border rounded-lg bg-white font-bold"
                  },
                    [
                      { id: 'igneous', label: __alloT('stem.rocks.igneous', 'Igneous') },
                      { id: 'sedimentary', label: __alloT('stem.rocks.sedimentary', 'Sedimentary') },
                      { id: 'metamorphic', label: __alloT('stem.rocks.metamorphic', 'Metamorphic') }
                    ].map(function(r) {
                      return React.createElement("option", { key: r.id, value: r.id }, r.label);
                    })
                  )
                ),
                React.createElement("div", { className: "col-span-1 md:col-span-2" },
                  React.createElement("label", { className: "block text-[10px] font-bold text-slate-500 uppercase mb-1" }, __alloT('stem.rocks.geological_agent', "Geological Agent")),
                  React.createElement("div", { className: "grid grid-cols-3 gap-1" },
                    [
                      { id: 'melting_cooling', label: '🌋 ' + __alloT('stem.rocks.agent_melt_cool', 'Melt & Cool') },
                      { id: 'heat_pressure', label: '🔥 ' + __alloT('stem.rocks.agent_heat_press', 'Heat & Press') },
                      { id: 'weathering_erosion', label: '🌧️ ' + __alloT('stem.rocks.agent_weather_erode', 'Weather & Erode') }
                    ].map(function(agent) {
                      var isSel = d.geologicalAgent === agent.id;
                      return React.createElement("button", {
                        key: agent.id,
                        onClick: function() { upd("geologicalAgent", agent.id); sfxRockClick(); },
                        className: "p-1 rounded text-[10px] font-black text-center border transition-all " +
                          (isSel ? "bg-orange-100 border-orange-500 text-orange-800" : "transition-colors bg-slate-50 border-slate-200 text-slate-600 hover:border-orange-200")
                      }, agent.label);
                    })
                  )
                ),
                React.createElement("div", { className: "flex items-end" },
                  React.createElement("button", {
                    disabled: d.transformationAnimActive || !d.geologicalAgent,
                    onClick: function() {
                      var agent = d.geologicalAgent;
                      upd("transformationAnimActive", true);
                      upd("transformationResult", null);
                      upd("transformsRun", (d.transformsRun || 0) + 1);

                      if (agent === 'melting_cooling') {
                        sfxRockMelt();
                      } else if (agent === 'heat_pressure') {
                        sfxRockCrack();
                      } else {
                        sfxRockCool();
                      }

                      var p = 0;
                      var interval = setInterval(function() {
                        p += 10;
                        upd("transformationProgress", p);
                        if (p >= 100) {
                          clearInterval(interval);
                          // The geological AGENT determines the result TYPE (any rock can melt →
                          // igneous, be heated/pressed → metamorphic, or weather → sedimentary) —
                          // but the chosen STARTING ROCK now names a real, specific transformation,
                          // so the dropdown actually matters and teaches the named pairings.
                          var startingRock = d.startingRock || 'igneous';
                          var resultId = 'igneous';
                          var description = '';

                          if (agent === 'melting_cooling') {
                            resultId = 'igneous';
                            var mEx = startingRock === 'sedimentary' ? 'sandstone' : startingRock === 'metamorphic' ? 'gneiss' : 'older igneous rock';
                            description = "Extreme heat (>800°C) melted the " + startingRock + " rock (e.g. " + mEx + ") into magma, which cooled and crystallized into a new IGNEOUS rock such as granite or basalt. Any rock can melt, so the result is always igneous.";
                          } else if (agent === 'heat_pressure') {
                            resultId = 'metamorphic';
                            var hEx = startingRock === 'sedimentary' ? 'limestone → marble, or shale → slate' : startingRock === 'igneous' ? 'granite → gneiss' : 'slate → schist → gneiss (a higher grade)';
                            description = "Buried deep, intense heat and pressure recrystallized the " + startingRock + " rock WITHOUT melting it — " + hEx + " — forming METAMORPHIC rock. Any rock can be metamorphosed.";
                          } else {
                            resultId = 'sedimentary';
                            var wEx = startingRock === 'igneous' ? 'granite → sand and clay' : startingRock === 'metamorphic' ? 'marble → sediment grains' : 'older sediment, broken down and re-deposited';
                            description = "Weathering and erosion broke the " + startingRock + " rock into grains (" + wEx + "), which washed into a basin, then compacted and cemented into SEDIMENTARY rock. Any rock at the surface weathers into sediment.";
                          }

                          updMulti({
                            transformationAnimActive: false,
                            transformationResult: { id: resultId, desc: description }
                          });

                          setLabToolData(function(prev) {
                            var r = Object.assign({}, (prev && prev.rocks) || {});
                            var count = (r.cycleInteractions || 0) + 1;
                            r.cycleInteractions = count;

                            var completed = r.completedChallenges || [];
                            var newlyCompleted = [];
                            var pointsEarned = 0;
                            
                            var typesExploredCheck = Object.keys(r.typesViewed || {}).length >= 3;
                            var specimensCheck = Object.keys(r.rocksViewed || {}).length >= 5;
                            var quizCheck = (r.quizScore || 0) >= 3;
                            var vocabCheck = (r.vocabLookedUp || []).length >= 3;
                            var cycleCheck = count >= 3;

                            var challengeChecks = {
                              types_explored: typesExploredCheck,
                              specimens_examined: specimensCheck,
                              quiz_ace: quizCheck,
                              vocab_studied: vocabCheck,
                              cycle_interact: cycleCheck
                            };

                            Object.keys(challengeChecks).forEach(function(cid) {
                              if (completed.indexOf(cid) === -1 && challengeChecks[cid]) {
                                newlyCompleted.push(cid);
                                // findById is null-safe — challenge id drift no
                                // longer crashes the unlock event; renames just
                                // silently skip the rp award for that challenge.
                                var ch = window.StemLab && window.StemLab.findById ? window.StemLab.findById(ROCKS_CHALLENGES, cid) : null;
                                pointsEarned += ch ? (ch.rp || 0) : 0;
                              }
                            });

                            if (newlyCompleted.length > 0) {
                              r.completedChallenges = completed.concat(newlyCompleted);
                              r.researchPoints = (r.researchPoints || 0) + pointsEarned;
                              r.totalRP = (r.totalRP || 0) + pointsEarned;
                              sfxRockCorrect();
                              if (typeof addToast === 'function') {
                                newlyCompleted.forEach(function(finishedId) {
                                  var fchRec = window.StemLab && window.StemLab.findById ? window.StemLab.findById(ROCKS_CHALLENGES, finishedId) : null;
                                  var name = fchRec ? fchRec.name : 'a challenge';
                                  var rp = fchRec ? fchRec.rp : 0;
                                  addToast({ type: 'success', title: 'Challenge Complete!', message: 'Unlocked: ' + name + ' (+' + rp + ' RP)' });
                                });
                              }
                            }
                            return Object.assign({}, prev, { rocks: r });
                          });
                        }
                      }, 100);
                    },
                    className: "w-full py-1.5 bg-orange-700 hover:bg-orange-800 text-white font-bold rounded-lg text-xs transition-all disabled:opacity-50 active:scale-[0.97]"
                  }, d.transformationAnimActive ? __alloT('stem.rocks.transforming_ellipsis', "Transforming...") : "⚡ " + __alloT('stem.rocks.transform_btn', "Transform!"))
                )
              ),
              d.transformationAnimActive && React.createElement("div", { className: "w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-2" },
                React.createElement("div", {
                  className: "bg-orange-600 h-full transition-all duration-75",
                  style: { width: (d.transformationProgress || 0) + '%' }
                })
              ),
              d.transformationResult && (function() {
                var resEmoji = d.transformationResult.id === 'igneous' ? '🌋' : d.transformationResult.id === 'sedimentary' ? '🏖' : '💎';
                return React.createElement("div", { className: "p-3 bg-orange-50 border border-orange-200 rounded-lg animate-in slide-in-from-bottom" },
                  React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },
                    React.createElement("span", { className: "text-2xl" }, resEmoji),
                    React.createElement("span", { className: "text-sm font-bold text-orange-800 capitalize" }, __alloT('stem.rocks.transformed_into', "Transformed into: ") + d.transformationResult.id + __alloT('stem.rocks.rock_suffix', " Rock"))
                  ),
                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, d.transformationResult.desc)
                );
              })()
            ),

            React.createElement("div", { className: "border-t border-slate-200 pt-3 mt-3" },
              React.createElement("button", { "aria-label": __alloT('stem.rocks.start_rock_cycle_quiz_aria', "Start rock cycle quiz"),
                onClick: function () {
                  var RC_QS = [
                    {
                      q: __alloT('stem.rocks.rc_which_rock_type_forms_from_cooled_magma_lava', 'Which rock type forms from cooled magma/lava?'),
                      a: t('stem.rocks.igneous'),
                      opts: [t('stem.rocks.igneous'), t('stem.rocks.sedimentary'), t('stem.rocks.metamorphic')],
                      concept: 'Igneous',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_correct_igneous_rocks_solidify_directly_from_cooled_magma', 'Correct! Igneous rocks solidify directly from cooled magma.'),
                        __alloT('stem.rocks.rc_incorrect_sedimentary_rocks_form_from_accumulated_layer_deposits', 'Incorrect. Sedimentary rocks form from accumulated layer deposits.'),
                        __alloT('stem.rocks.rc_incorrect_metamorphic_rocks_form_from_existing_rocks_altered', 'Incorrect. Metamorphic rocks form from existing rocks altered by heat and pressure.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_which_rock_type_often_contains_fossils', 'Which rock type often contains fossils?'),
                      a: t('stem.rocks.sedimentary'),
                      opts: [t('stem.rocks.igneous'), t('stem.rocks.sedimentary'), t('stem.rocks.metamorphic')],
                      concept: 'Sedimentary',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_incorrect_magma_temperatures_destroy_fossil_evidence_in_igneous', 'Incorrect. Magma temperatures destroy fossil evidence in igneous rocks.'),
                        __alloT('stem.rocks.rc_correct_fossils_are_preserved_in_layers_of_sedimentary', 'Correct! Fossils are preserved in layers of sedimentary rock.'),
                        __alloT('stem.rocks.rc_incorrect_heat_and_pressure_deform_and_destroy_fossils', 'Incorrect. Heat and pressure deform and destroy fossils in metamorphic rocks.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_which_rock_type_forms_under_heat_and_pressure', 'Which rock type forms under heat and pressure?'),
                      a: t('stem.rocks.metamorphic'),
                      opts: [t('stem.rocks.igneous'), t('stem.rocks.sedimentary'), t('stem.rocks.metamorphic')],
                      concept: 'Metamorphic',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_incorrect_igneous_rocks_form_from_cooling_magma_not', 'Incorrect. Igneous rocks form from cooling magma, not solid alteration.'),
                        __alloT('stem.rocks.rc_incorrect_sedimentary_rocks_form_from_compaction_of_loose', 'Incorrect. Sedimentary rocks form from compaction of loose sediment.'),
                        __alloT('stem.rocks.rc_correct_heat_and_pressure_change_pre_existing_rocks', 'Correct! Heat and pressure change pre-existing rocks into metamorphic ones.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_granite_is_an_example_of_which_rock_type', 'Granite is an example of which rock type?'),
                      a: t('stem.rocks.igneous'),
                      opts: [t('stem.rocks.igneous'), t('stem.rocks.sedimentary'), t('stem.rocks.metamorphic')],
                      concept: 'Igneous',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_correct_granite_is_a_coarse_grained_intrusive_igneous', 'Correct! Granite is a coarse-grained intrusive igneous rock.'),
                        __alloT('stem.rocks.rc_incorrect_granite_crystallizes_from_magma_and_is_not', 'Incorrect. Granite crystallizes from magma and is not sedimentary.'),
                        __alloT('stem.rocks.rc_incorrect_granite_is_igneous_its_metamorphic_equivalent_is', 'Incorrect. Granite is igneous; its metamorphic equivalent is gneiss.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_marble_forms_from_which_rock', 'Marble forms from which rock?'),
                      a: 'Limestone (sedimentary)',
                      opts: ['Granite (igneous)', 'Limestone (sedimentary)', 'Basalt (igneous)'],
                      concept: 'Metamorphic',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_incorrect_granite_transforms_into_gneiss', 'Incorrect. Granite transforms into gneiss.'),
                        __alloT('stem.rocks.rc_correct_limestone_transforms_into_marble_under_metamorphism', 'Correct! Limestone transforms into marble under metamorphism.'),
                        __alloT('stem.rocks.rc_incorrect_basalt_transforms_into_greenstone_or_amphibolite', 'Incorrect. Basalt transforms into greenstone or amphibolite.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_what_breaks_rocks_into_sediment', 'What breaks rocks into sediment?'),
                      a: 'Weathering & erosion',
                      opts: ['Heat & pressure', 'Weathering & erosion', 'Melting'],
                      concept: 'Lithification',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_incorrect_heat_and_pressure_trigger_metamorphic_alteration', 'Incorrect. Heat and pressure trigger metamorphic alteration.'),
                        __alloT('stem.rocks.rc_correct_wind_water_and_ice_weather_rocks_down', 'Correct! Wind, water, and ice weather rocks down into sediment particles.'),
                        __alloT('stem.rocks.rc_incorrect_melting_creates_magma_which_forms_igneous_rocks', 'Incorrect. Melting creates magma, which forms igneous rocks.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_what_must_happen_for_metamorphic_rock_to_become', 'What must happen for metamorphic rock to become igneous?'),
                      a: 'It must melt, then cool',
                      opts: ['It must be weathered', 'It must be compressed', 'It must melt, then cool'],
                      concept: 'Crystallization',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_incorrect_weathering_turns_metamorphic_rocks_into_sedimentary_ones', 'Incorrect. Weathering turns metamorphic rocks into sedimentary ones.'),
                        __alloT('stem.rocks.rc_incorrect_compression_leads_to_metamorphism_not_igneous_rock', 'Incorrect. Compression leads to metamorphism, not igneous rock.'),
                        __alloT('stem.rocks.rc_correct_metamorphic_rocks_must_melt_into_magma_then', 'Correct! Metamorphic rocks must melt into magma, then cool and solidify.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_what_is_the_mohs_scale_used_to_measure', 'What is the Mohs scale used to measure?'),
                      a: 'Mineral hardness',
                      opts: ['Rock age', 'Mineral hardness', 'Crystal size'],
                      concept: 'Hardness',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_incorrect_radiometric_dating_measures_rock_age_not_the', 'Incorrect. Radiometric dating measures rock age, not the Mohs scale.'),
                        __alloT('stem.rocks.rc_correct_the_mohs_scale_rates_scratch_resistance_from', 'Correct! The Mohs scale rates scratch resistance from 1 to 10.'),
                        __alloT('stem.rocks.rc_incorrect_crystallization_rate_determines_crystal_size', 'Incorrect. Crystallization rate determines crystal size.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_which_rock_is_used_for_countertops', 'Which rock is used for countertops?'),
                      a: t('stem.rocks.granite'),
                      opts: [t('stem.rocks.sandstone'), t('stem.rocks.granite'), t('stem.rocks.slate')],
                      concept: 'Igneous',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_incorrect_sandstone_is_too_porous_for_durable_countertops', 'Incorrect. Sandstone is too porous for durable countertops.'),
                        __alloT('stem.rocks.rc_correct_granite_is_extremely_hard_heat_resistant_and', 'Correct! Granite is extremely hard, heat-resistant, and durable.'),
                        __alloT('stem.rocks.rc_incorrect_slate_is_used_for_roofing_and_writing', 'Incorrect. Slate is used for roofing and writing boards, not typically heavy kitchen countertops.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_the_white_cliffs_of_dover_are_made_of', 'The White Cliffs of Dover are made of which sedimentary rock?'),
                      a: t('stem.rocks.chalk'),
                      opts: [t('stem.rocks.sandstone'), t('stem.rocks.limestone'), t('stem.rocks.chalk')],
                      concept: 'Sedimentary',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_incorrect_sandstone_is_granular_and_not_white_chalky', 'Incorrect. Sandstone is granular and not white/chalky.'),
                        __alloT('stem.rocks.rc_incorrect_limestone_is_related_but_the_cliffs_are', 'Incorrect. Limestone is related, but the cliffs are specifically soft chalk.'),
                        __alloT('stem.rocks.rc_correct_the_cliffs_are_made_of_chalk_formed', 'Correct! The cliffs are made of chalk, formed from marine micro-fossils.')
                      ]
                    }
                  ];

                  var q = RC_QS[Math.floor(Math.random() * RC_QS.length)];
                  upd('rcQuiz', { q: q.q, a: q.a, opts: q.opts, wrongFeedback: q.wrongFeedback, concept: q.concept, answered: false, score: (d.rcQuiz && d.rcQuiz.score) || 0 });
                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.rcQuiz ? 'bg-orange-100 text-orange-700' : 'bg-orange-700 text-white') + " transition-all"
              }, d.rcQuiz ? "🔄 " + __alloT('stem.rocks.next_question', "Next Question") : "🧠 " + __alloT('stem.rocks.quiz_mode', "Quiz Mode")),

              d.rcQuiz && d.rcQuiz.score > 0 && React.createElement("span", { className: "ml-2 text-xs font-bold text-emerald-600" }, "⭐ " + d.rcQuiz.score + " " + __alloT('stem.rocks.correct_count_suffix', "correct")),

              d.rcQuiz && React.createElement("div", { className: "mt-2 bg-orange-50 rounded-lg p-3 border border-orange-200" },
                React.createElement("p", { className: "text-sm font-bold text-orange-800 mb-2" }, d.rcQuiz.q),
                React.createElement("div", { className: "grid grid-cols-1 gap-2 animate-in fade-in" },
                  d.rcQuiz.opts.map(function (opt, i) {
                    var isCorrect = opt === d.rcQuiz.a;
                    var wasChosen = d.rcQuiz.chosen === opt;
                    var cls = !d.rcQuiz.answered ? 'transition-colors bg-white border-slate-200 hover:border-orange-400' : isCorrect ? 'bg-emerald-100 border-emerald-600 text-emerald-800' : wasChosen ? 'bg-red-100 border-red-600 text-red-800' : 'bg-slate-50 border-slate-200 opacity-50';

                    return React.createElement("button", { "aria-label": __alloT('stem.rocks.select_answer_label', "Select answer: ") + opt,
                      key: opt, disabled: d.rcQuiz.answered, onClick: function () {
                        var correct = opt === d.rcQuiz.a;
                        upd('rcQuiz', Object.assign({}, d.rcQuiz, { answered: true, chosen: opt, chosenIdx: i, score: d.rcQuiz.score + (correct ? 1 : 0) }));
                        if (correct) {
                          sfxRockCorrect();
                        } else {
                          sfxRockCrack();
                        }
                        if (typeof addToast === 'function') {
                          addToast(correct ? '✅ Correct!' : '❌ Incorrect', correct ? 'success' : 'error');
                        }
                      }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls
                    }, opt);
                  })
                ),
                d.rcQuiz.answered && React.createElement("div", { className: "mt-3 space-y-2 animate-in slide-in-from-bottom-1" },
                  React.createElement("div", { className: "p-3 rounded-lg text-xs leading-relaxed bg-white border border-slate-200 text-slate-700" },
                    d.rcQuiz.wrongFeedback ? d.rcQuiz.wrongFeedback[d.rcQuiz.opts.indexOf(d.rcQuiz.chosen)] : (d.rcQuiz.chosen === d.rcQuiz.a ? __alloT('stem.rocks.correct_exclaim', 'Correct!') : __alloT('stem.rocks.incorrect', 'Incorrect.'))
                  ),
                  d.rcQuiz.concept && ROCKS_VOCAB[d.rcQuiz.concept] && (function() {
                    var rState = labToolData.rocks || {};
                    var studied = (rState.vocabLookedUp || []).indexOf(d.rcQuiz.concept) !== -1;
                    return React.createElement("div", { className: "p-2.5 rounded-lg bg-orange-100/50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3" },
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("p", { className: "text-xs font-bold text-orange-800" }, "🔍 " + __alloT('stem.rocks.concept_focus_label', "Concept Focus: ") + d.rcQuiz.concept),
                        React.createElement("p", { className: "text-[10px] text-slate-600 mt-0.5 leading-relaxed" }, ROCKS_VOCAB[d.rcQuiz.concept])
                      ),
                      !studied && React.createElement("button", {
                        onClick: function() {
                          setLabToolData(function(prev) {
                            var r = Object.assign({}, (prev && prev.rocks) || {});
                            var list = r.vocabLookedUp || [];
                            var newList = list.concat([d.rcQuiz.concept]);
                            r.vocabLookedUp = newList;
                            
                            var completed = r.completedChallenges || [];
                            var newlyCompleted = [];
                            var pointsEarned = 0;
                            
                            var typesExploredCheck = Object.keys(r.typesViewed || {}).length >= 3;
                            var specimensCheck = Object.keys(r.rocksViewed || {}).length >= 5;
                            var quizCheck = (r.quizScore || 0) >= 3;
                            var vocabCheck = newList.length >= 3;
                            var cycleCheck = (r.cycleInteractions || 0) >= 3;

                            var challengeChecks = {
                              types_explored: typesExploredCheck,
                              specimens_examined: specimensCheck,
                              quiz_ace: quizCheck,
                              vocab_studied: vocabCheck,
                              cycle_interact: cycleCheck
                            };

                            Object.keys(challengeChecks).forEach(function(cid) {
                              if (completed.indexOf(cid) === -1 && challengeChecks[cid]) {
                                newlyCompleted.push(cid);
                                // findById is null-safe — challenge id drift no
                                // longer crashes the unlock event; renames just
                                // silently skip the rp award for that challenge.
                                var ch = window.StemLab && window.StemLab.findById ? window.StemLab.findById(ROCKS_CHALLENGES, cid) : null;
                                pointsEarned += ch ? (ch.rp || 0) : 0;
                              }
                            });

                            if (newlyCompleted.length > 0) {
                              r.completedChallenges = completed.concat(newlyCompleted);
                              r.researchPoints = (r.researchPoints || 0) + pointsEarned;
                              r.totalRP = (r.totalRP || 0) + pointsEarned;
                              sfxRockCorrect();
                            }
                            return Object.assign({}, prev, { rocks: r });
                          });
                          sfxRockClick();
                          if (typeof awardStemXP === 'function') awardStemXP(5, 'Concept studied: ' + d.rcQuiz.concept);
                          if (typeof addToast === 'function') addToast({ type: 'success', title: 'Concept Studied!', message: 'You studied ' + d.rcQuiz.concept + ' (+5 RP)' });
                        },
                        className: "px-2 py-1 bg-orange-700 hover:bg-orange-800 text-white font-bold rounded text-[10px] shrink-0 self-start sm:self-center transition-all hover:scale-105 active:scale-[0.97]"
                      }, "📖 " + __alloT('stem.rocks.study_term', "Study Term (+5 RP)"))
                    );
                  })()
                )
              )
            ),

            React.createElement("button", { "aria-label": __alloT('stem.rocks.snapshot', "Snapshot"), onClick: () => { setToolSnapshots(prev => [...prev, { id: 'rc-' + Date.now(), tool: 'rockCycle', label: sel ? sel.label : t('stem.tools_menu.rock_cycle'), data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 " + __alloT('stem.rocks.snapshot', "Snapshot"))

          );
      })();
    }
  });

})();
