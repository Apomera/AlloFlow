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
  if (!document.getElementById('rock-a11y')) { var _s = document.createElement('style'); _s.id = 'rock-a11y'; _s.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-400 { color: #64748b !important; }'; document.head.appendChild(_s); }

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
      // Aliases — maps ctx properties to original variable names
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

          const mode = d.mode || 'landscape';

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

            { id: 'basalt', type: 'igneous', label: t('stem.rocks.basalt'), hardness: 6, texture: 'fine-grained', grainColors: ['#374151', '#1f2937', '#4b5563', '#111827'], desc: 'Extrusive igneous rock \u2014 the most common volcanic rock. Forms when lava cools quickly at the surface.', uses: 'Road aggregate, construction fill' },

            { id: 'obsidian', type: 'igneous', label: t('stem.rocks.obsidian'), hardness: 5.5, texture: 'glassy', grainColors: ['#0f0f0f', '#1a1a2e', '#16213e', '#0a0a0a'], desc: 'Volcanic glass formed when lava cools extremely rapidly. Conchoidal fracture.', uses: 'Surgical scalpels, jewelry, ancient tools' },

            { id: 'pumice', type: 'igneous', label: t('stem.rocks.pumice'), hardness: 6, texture: 'vesicular', grainColors: ['#d6d3d1', '#e7e5e4', '#a8a29e', '#f5f5f4'], desc: 'Light, porous volcanic rock full of gas bubbles. So light it can float on water!', uses: 'Abrasive cleaning, lightweight aggregate' },

            { id: 'rhyolite', type: 'igneous', label: t('stem.rocks.rhyolite'), hardness: 6, texture: 'fine-grained', grainColors: ['#fca5a5', '#e5e7eb', '#d1d5db', '#fecaca'], desc: 'Extrusive equivalent of granite. Light-colored fine-grained volcanic rock, often with flow banding. Rich in silica (>69%). Erupts explosively due to high viscosity.', uses: 'Aggregate, decorative stone, gemstone (thundereggs)' },

            { id: 'diorite', type: 'igneous', label: t('stem.rocks.diorite'), hardness: 6, texture: 'coarse-grained', grainColors: ['#1e1e1e', '#fafafa', '#4b5563', '#e5e7eb'], desc: 'Intrusive igneous rock with a "salt and pepper" appearance. Intermediate composition between granite and gabbro. Contains plagioclase feldspar and hornblende.', uses: 'Building stone, cobblestones, ancient sculptures (Inca)' },

            { id: 'andesite', type: 'igneous', label: t('stem.rocks.andesite'), hardness: 6, texture: 'fine-grained', grainColors: ['#6b7280', '#9ca3af', '#4b5563', '#d1d5db'], desc: 'Intermediate volcanic rock named after the Andes Mountains. Common at convergent plate boundaries. Often contains visible phenocrysts in a fine matrix (porphyritic texture).', uses: 'Construction aggregate, monuments' },

            { id: 'tuff', type: 'igneous', label: t('stem.rocks.tuff'), hardness: 4, texture: 'vesicular', grainColors: ['#fde68a', '#d6d3d1', '#a8a29e', '#e7e5e4'], desc: 'Consolidated volcanic ash. Formed when explosive eruptions blast fine particles into the air, which settle and lithify. Can contain pumice fragments and glass shards.', uses: 'Building stone (ancient Rome), lightweight concrete, water filtration' },

            { id: 'sandstone', type: 'sedimentary', label: t('stem.rocks.sandstone'), hardness: 6.5, texture: 'clastic', grainColors: ['#d97706', '#fbbf24', '#b45309', '#f59e0b'], desc: 'Made of sand-sized quartz grains cemented together. Often shows cross-bedding from ancient dunes or rivers.', uses: 'Building stone, flagstone, aquifers' },

            { id: 'limestone', type: 'sedimentary', label: t('stem.rocks.limestone'), hardness: 3, texture: 'bioclastic', grainColors: ['#e5e7eb', '#d1d5db', '#f3f4f6', '#fef9c3'], desc: 'Composed mainly of calcite (CaCO\u2083). Often contains fossils. Fizzes with acid!', uses: 'Cement, lime, building stone, chalk' },

            { id: 'shale', type: 'sedimentary', label: t('stem.rocks.shale'), hardness: 3, texture: 'fine-layered', grainColors: ['#6b7280', '#4b5563', '#9ca3af', '#374151'], desc: 'Made of compressed clay and silt. Splits into thin layers (fissile). Most common sedimentary rock.', uses: 'Bricks, pottery, oil/gas source rock' },

            { id: 'conglom', type: 'sedimentary', label: t('stem.rocks.conglomerate'), hardness: 6, texture: 'clastic-coarse', grainColors: ['#92400e', '#a16207', '#d4d4d8', '#78716c'], desc: 'Contains large rounded pebbles cemented in a fine matrix. Tells us about ancient fast-flowing rivers.', uses: 'Construction aggregate, decorative stone' },

            { id: 'chalk', type: 'sedimentary', label: t('stem.rocks.chalk'), hardness: 1, texture: 'bioclastic', grainColors: ['#fafafa', '#f5f5f4', '#e5e7eb', '#ffffff'], desc: 'Soft, white limestone made of microscopic plankton shells (coccoliths). The White Cliffs of Dover are chalk. Extremely fine-grained \u2014 each grain is a tiny fossil!', uses: 'Blackboard chalk, whiting, soil amendment, toothpaste' },

            { id: 'travertine', type: 'sedimentary', label: t('stem.rocks.travertine'), hardness: 4, texture: 'crystalline', grainColors: ['#fef3c7', '#fde68a', '#fafaf9', '#e7e5e4'], desc: 'Chemical sedimentary rock deposited from mineral-rich hot springs and cave systems. Often has a banded, porous appearance. Forms stalactites and stalagmites in caves.', uses: 'Flooring, countertops, building facades (Colosseum in Rome)' },

            { id: 'marble', type: 'metamorphic', label: t('stem.rocks.marble'), hardness: 3.5, texture: 'crystalline', grainColors: ['#fafafa', '#e5e7eb', '#f3f4f6', '#dbeafe'], desc: 'Metamorphosed limestone. Interlocking calcite crystals give it a sugary texture. Used by sculptors for millennia.', uses: 'Sculpture, flooring, tombstones' },

            { id: 'slate', type: 'metamorphic', label: t('stem.rocks.slate'), hardness: 5.5, texture: 'foliated', grainColors: ['#374151', '#475569', '#334155', '#1e293b'], desc: 'Metamorphosed shale. Excellent foliation \u2014 splits into flat, smooth sheets.', uses: 'Roofing tiles, chalkboards, flooring' },

            { id: 'quartzite', type: 'metamorphic', label: t('stem.rocks.quartzite'), hardness: 7, texture: 'non-foliated', grainColors: ['#f5f5f4', '#fafaf9', '#e7e5e4', '#e0f2fe'], desc: 'Metamorphosed sandstone. Extremely hard \u2014 even harder than granite. Quartz grains fuse together.', uses: 'Railroad ballast, decorative stone' },

            { id: 'gneiss', type: 'metamorphic', label: t('stem.rocks.gneiss'), hardness: 7, texture: 'banded', grainColors: ['#1e1e1e', '#fafafa', '#6b7280', '#d4d4d8'], desc: 'Shows distinct light and dark mineral banding. Forms under extreme heat and pressure deep in the crust.', uses: 'Decorative stone, construction' },

            { id: 'schist', type: 'metamorphic', label: t('stem.rocks.schist'), hardness: 5, texture: 'foliated', grainColors: ['#78716c', '#a8a29e', '#57534e', '#d6d3d1'], desc: 'Medium-grade metamorphic rock with visible, aligned mica flakes that give it a sparkly, shiny appearance. Forms from shale under moderate heat and pressure. Named for its tendency to split (Greek "schizein" = to split).', uses: 'Decorative landscaping, flagstone, historical millstones' },

            { id: 'phyllite', type: 'metamorphic', label: t('stem.rocks.phyllite'), hardness: 4, texture: 'foliated', grainColors: ['#4b5563', '#6b7280', '#374151', '#9ca3af'], desc: 'Between slate and schist in metamorphic grade. Has a distinctive silky, satiny sheen from microscopic mica crystals. Crinkled foliation surface (crenulations). The stepping stone between low and medium metamorphism.', uses: 'Decorative stone, garden paths, grave markers' }

          ];



          // ── Mineral data ──

          const MINERALS = [

            { id: 'quartz', label: t('stem.rocks.quartz'), hardness: 7, streak: 'White', luster: 'Vitreous', crystal: 'Hexagonal', color: '#e0f2fe', formula: 'SiO\u2082', desc: 'The second most abundant mineral in the crust of Earth. Forms distinctive six-sided prismatic crystals with pointed terminations. Extremely resistant to weathering. Comes in many colored varieties: amethyst (purple), citrine (yellow), rose quartz (pink), smoky quartz (brown).', uses: 'Electronics (oscillators, watches), glassmaking, abrasives, gemstones', funFact: 'Quartz is piezoelectric \u2014 when squeezed, it generates an electric charge. This property makes quartz watches accurate to within 15 seconds per month!', occurrence: 'Found in virtually all rock types worldwide. Major deposits in Brazil, Arkansas (USA), Madagascar, and the Alps.' },

            { id: 'feldspar', label: t('stem.rocks.feldspar'), hardness: 6, streak: 'White', luster: 'Vitreous', crystal: 'Monoclinic/Triclinic', color: '#fce7f3', formula: 'KAlSi\u2083O\u2088', desc: 'The most abundant mineral group on Earth, making up ~60% of the crust. Two main families: orthoclase (potassium) and plagioclase (sodium-calcium). Shows distinctive cleavage at nearly 90\u00B0 angles. Often pink, white, or gray.', uses: 'Ceramics, glass, porcelain, scouring powders, dental products', funFact: 'The name means "field spar" in Swedish because early miners found it in their fields. Moonstone and labradorite are feldspar gemstones!', occurrence: 'Constituent of granite, gneiss, basalt, and most igneous and metamorphic rocks globally.' },

            { id: 'mica', label: t('stem.rocks.mica_muscovite'), hardness: 2.5, streak: 'White', luster: 'Pearly/Vitreous', crystal: 'Monoclinic', color: '#fef9c3', formula: 'KAl\u2082(Si\u2083Al)O\u2081\u2080(OH)\u2082', desc: 'Sheet silicate that peels into thin, flexible, transparent sheets. The "sparkly" mineral in rocks. Two common types: muscovite (light/clear) and biotite (dark/black). Perfect basal cleavage produces incredibly thin layers.', uses: 'Electrical insulation, cosmetics (shimmer), paint filler, window material (historically)', funFact: 'Before glass windows were common, thin sheets of muscovite mica were used as window panes in medieval Russia \u2014 hence "Muscovy glass" \u2192 muscovite!', occurrence: 'Common in granites, schists, pegmatites. Major deposits in India, Brazil, Russia, and the USA.' },

            { id: 'calcite', label: t('stem.rocks.calcite'), hardness: 3, streak: 'White', luster: 'Vitreous', crystal: 'Trigonal (Rhombohedral)', color: '#f0fdf4', formula: 'CaCO\u2083', desc: 'The primary mineral in limestone and marble. Shows perfect rhombohedral cleavage \u2014 always breaks into parallelogram-shaped pieces. Fizzes vigorously when dilute acid is applied. Some varieties show double refraction (text appears doubled through clear crystals).', uses: 'Cement/concrete, lime production, optical instruments, antacid tablets (Tums)', funFact: 'Iceland spar (transparent calcite) creates double images! Vikings may have used it as a "sunstone" to navigate on cloudy days by detecting polarized skylight.', occurrence: 'Limestone caves (stalactites/stalagmites), coral reefs, chalk cliffs, marble deposits worldwide.' },

            { id: 'halite', label: t('stem.rocks.halite'), hardness: 2.5, streak: 'White', luster: 'Vitreous', crystal: 'Cubic (Isometric)', color: '#ede9fe', formula: t('stem.periodic.nacl'), desc: 'Common table salt! Forms perfect cubic crystals. Tastes salty (one of the few minerals safe to taste-test). Forms when shallow seas or salt lakes evaporate. Can be colorless, white, pink, blue, or red depending on impurities.', uses: 'Food seasoning/preservation, road de-icing, chemical industry, water softening', funFact: 'Roman soldiers were sometimes paid in salt \u2014 the word "salary" comes from the Latin "salarium" (salt money). The phrase "worth your salt" comes from this tradition!', occurrence: 'Evaporite deposits in arid regions: Great Salt Lake, Dead Sea, salt mines in Poland (Wieliczka), Germany, and Louisiana.' },

            { id: 'pyrite', label: t('stem.rocks.pyrite'), hardness: 6.5, streak: 'Greenish-black', luster: 'Metallic', crystal: 'Cubic (Isometric)', color: '#fef3c7', formula: 'FeS\u2082', desc: 'Iron sulfide with a brilliant metallic brass-yellow color. Forms perfect cubes, pyritohedrons, and octahedrons. Produces sparks when struck against steel (name from Greek "pyr" = fire). Commonly mistaken for gold but much harder and lighter.', uses: 'Sulfuric acid production, electronics (early crystal radios), decorative stone, gold indicator mineral', funFact: 'Called "fool\u2019s gold" because miners confused it with real gold. You can tell them apart: gold is soft (scratches with a knife), pyrite is hard. Gold leaves a yellow streak, pyrite leaves a greenish-black streak!', occurrence: 'Found in all rock types. Often found alongside real gold deposits! Common in coal, hydrothermal veins, and sedimentary rocks.' },

            { id: 'talc', label: t('stem.rocks.talc'), hardness: 1, streak: 'White', luster: 'Pearly/Waxy', crystal: 'Monoclinic', color: '#f0fdf4', formula: 'Mg\u2083Si\u2084O\u2081\u2080(OH)\u2082', desc: 'The softest known mineral \u2014 #1 on the Mohs scale. Can be scratched with a fingernail! Has a soapy, greasy feel. Forms flat, foliated masses. Color ranges from white to pale green to gray. Metamorphic mineral formed from magnesium-rich rocks.', uses: 'Talcum powder, ceramics, paint filler, paper coating, cosmetics', funFact: 'Soapstone (used for carving and countertops) is a rock made mostly of talc. It was used by ancient cultures worldwide to carve cooking vessels because it retains heat well!', occurrence: 'Metamorphic rocks (ultramafic environments). Major deposits in China, India, USA (Vermont), France, and Brazil.' },

            { id: 'diamond', label: t('stem.rocks.diamond'), hardness: 10, streak: 'None (too hard)', luster: 'Adamantine', crystal: 'Cubic (Isometric)', color: '#f0f9ff', formula: 'C', desc: 'Pure crystallized carbon \u2014 the hardest natural substance on Earth. Forms deep in the mantle (150+ km below surface) under extreme pressure and temperature. Brought to surface by violent volcanic eruptions in kimberlite pipes. High refractive index creates "fire" (rainbow flashes).', uses: 'Gemstones, cutting/grinding tools, drill bits, thermal conductors, optical windows', funFact: 'Diamond and graphite (pencil lead) are both pure carbon! The only difference is how the carbon atoms are arranged. Diamond is the hardest mineral; graphite is one of the softest. Same atoms, completely different properties!', occurrence: 'Kimberlite pipes in South Africa, Russia, Australia, Canada, Botswana. Also found in river gravels (alluvial deposits).' },

            { id: 'magnetite', label: t('stem.rocks.magnetite'), hardness: 5.5, streak: 'Black', luster: 'Metallic/Submetallic', crystal: 'Cubic (Isometric)', color: '#1f2937', formula: 'Fe\u2083O\u2084', desc: 'The most magnetic naturally occurring mineral on Earth. Strongly attracted to magnets and can itself act as a natural magnet ("lodestone"). Black, heavy, and opaque. Important iron ore mineral. Octahedral crystal habit.', uses: 'Iron/steel production, magnetic recording media, heavy concrete, water purification', funFact: 'Lodestone (naturally magnetized magnetite) was the first compass! Ancient Chinese and Greek navigators used floating lodestones to find north. Magnetite crystals have even been found in the brains of pigeons and sea turtles, helping them navigate!', occurrence: 'Igneous and metamorphic rocks worldwide. Major deposits in Sweden (Kiruna), Australia, Brazil, South Africa, and Minnesota (USA).' },

            { id: 'hematite', label: t('stem.rocks.hematite'), hardness: 5.5, streak: 'Red-brown', luster: 'Metallic/Earthy', crystal: 'Trigonal', color: '#991b1b', formula: 'Fe\u2082O\u2083', desc: 'The most important iron ore mineral. Name from Greek "haima" (blood) due to its red streak. Can appear metallic silver-gray (specular hematite) or earthy red-brown. Always produces a distinctive red-brown streak regardless of surface color.', uses: 'Iron/steel production (primary ore), pigment (red ochre), polishing compound (jeweler\u2019s rouge), radiation shielding', funFact: 'The red color of Mars comes from hematite! NASA\u2019s rovers have confirmed that the Martian soil is rich in iron oxide. Hematite was also used by prehistoric humans as the first paint pigment \u2014 cave paintings from 40,000 years ago used ground hematite!', occurrence: 'Banded iron formations, volcanic rocks, red soils. Lake Superior region (USA), Minas Gerais (Brazil), Pilbara (Australia), Mars!' },

            { id: 'garnet', label: t('stem.rocks.garnet'), hardness: 7, streak: 'White', luster: 'Vitreous/Resinous', crystal: 'Cubic (Isometric)', color: '#7f1d1d', formula: 'Complex silicates (e.g., Fe\u2083Al\u2082Si\u2083O\u2081\u2082)', desc: 'A group of silicate minerals known for their beautiful dodecahedral crystals (12-sided). Most commonly deep red (almandine), but can be green (tsavorite), orange (spessartine), or even color-changing. Very hard and durable. Excellent for identifying metamorphic grade.', uses: 'Abrasive blasting (sandpaper, waterjet cutting), gemstones, water filtration, indicator mineral in geology', funFact: 'Garnets grow in metamorphic rocks and their size indicates how much heat and pressure the rock experienced. Geologists use garnet composition like a geological thermometer! Some rare garnets change color from blue-green in daylight to purple under incandescent light.', occurrence: 'Schists, gneisses, contact metamorphic zones. Major gem deposits in India, Sri Lanka, Tanzania, Madagascar, and Idaho (USA).' },

            { id: 'olivine', label: t('stem.rocks.olivine'), hardness: 6.5, streak: 'White', luster: 'Vitreous', crystal: 'Orthorhombic', color: '#4d7c0f', formula: '(Mg,Fe)\u2082SiO\u2084', desc: 'Olive-green mineral abundant in the upper mantle of Earth. One of the first minerals to crystallize from cooling magma. Forms small glassy grains in basalt. Gem variety is called peridot. Weathers quickly at the surface, which is why it is rare in sedimentary rocks.', uses: 'Gemstone (peridot), refractory bricks, CO\u2082 capture research, foundry sand', funFact: 'Olivine makes up most of the upper mantle of Earth! There is more olivine inside Earth than any other mineral. The green sand beaches of Hawaii (Papak\u014Dlea Beach) are made of tiny olivine crystals eroded from volcanic rock!', occurrence: 'Basalt, peridotite, meteorites. Hawaii, Canary Islands, Pakistan (peridot gems), mantle xenoliths worldwide.' },

            { id: 'fluorite', label: t('stem.rocks.fluorite'), hardness: 4, streak: 'White', luster: 'Vitreous', crystal: 'Cubic (Isometric)', color: '#7c3aed', formula: 'CaF\u2082', desc: 'Known as the "most colorful mineral in the world" \u2014 comes in virtually every color: purple, green, blue, yellow, pink, and even colorless. Forms perfect cubic and octahedral crystals. Often fluorescent under UV light (the word "fluorescence" comes from fluorite!). Four directions of perfect cleavage.', uses: 'Steelmaking flux, hydrofluoric acid production, optical lenses, gemstone, decorative carvings', funFact: 'Fluorite literally invented the word "fluorescence"! In 1852, George Stokes described the glow of fluorite under UV light and coined the term from the name of the mineral. The element fluorine is also named after fluorite!', occurrence: 'Hydrothermal veins, limestone cavities. Major deposits in China, Mexico, South Africa, Derbyshire (England \u2014 "Blue John"), and Illinois (USA).' },

            { id: 'galena', label: t('stem.rocks.galena'), hardness: 2.5, streak: 'Lead-gray', luster: 'Metallic', crystal: 'Cubic (Isometric)', color: '#6b7280', formula: 'PbS', desc: 'Primary ore of lead. Very dense (heavy for its size) with perfect cubic cleavage \u2014 fractures into tiny cubes. Bright metallic silver color when fresh, tarnishes to dull gray. Lead-gray streak. Often found with silver as an impurity, making it a source of silver too.', uses: 'Lead production, ammunition, batteries, radiation shielding, early radio crystal detectors', funFact: 'Before transistors were invented, galena crystals were used in "crystal radio" sets! A thin wire ("cat\u2019s whisker") touching a galena crystal could detect radio signals without any battery or electricity. Galena was also used by ancient Egyptians as kohl eyeliner!', occurrence: 'Hydrothermal veins, limestone replacement deposits. Missouri (USA \u2014 largest lead deposit), Broken Hill (Australia), Germany, Mexico.' },

            { id: 'gypsum', label: t('stem.rocks.gypsum'), hardness: 2, streak: 'White', luster: 'Vitreous/Silky/Pearly', crystal: 'Monoclinic', color: '#faf5ff', formula: 'CaSO\u2084\u00B72H\u2082O', desc: 'A very soft evaporite mineral (can be scratched with a fingernail). Forms in a variety of habits: tabular crystals (selenite), fibrous masses (satin spar), and granular masses (alabaster). Transparent selenite crystals can be enormous. Contains water in its crystal structure.', uses: 'Drywall/plasterboard, plaster of Paris, cement, fertilizer, alabaster carvings', funFact: 'The Naica Mine in Mexico contains selenite gypsum crystals up to 12 meters (39 feet) long and weighing 55 tons \u2014 the largest crystals ever discovered on Earth! The cave is so hot (58\u00B0C/136\u00B0F) that humans can only survive inside for about 10 minutes!', occurrence: 'Evaporite deposits, desert roses (sand-included crystals), cave formations. Major deposits in USA, Mexico, Spain, Italy, and Nova Scotia.' },

            { id: 'sulfur', label: t('stem.periodic.sulfur'), hardness: 2, streak: 'White-yellow', luster: 'Resinous/Adamantine', crystal: 'Orthorhombic', color: '#eab308', formula: 'S', desc: 'Native element with a distinctive bright yellow color and rotten-egg smell when heated. Very light and brittle. Low melting point (115\u00B0C). Burns with a blue flame producing SO\u2082 gas. Associated with volcanic activity and hot springs. One of the few minerals that occurs as a native element.', uses: 'Sulfuric acid (most widely used chemical), gunpowder, rubber vulcanization, fungicides, matches', funFact: 'Sulfur was known to ancient civilizations as "brimstone" (burning stone). It is mentioned in the Bible and in the Odyssey by Homer! The moon Io of Jupiter is covered in sulfur from its 400+ active volcanoes, giving it a bright yellow-orange appearance.', occurrence: 'Volcanic fumaroles, hot springs, evaporite domes (Gulf Coast USA), Sicily, Japan, Indonesia.' },

            { id: 'corundum', label: t('stem.rocks.corundum'), hardness: 9, streak: 'White', luster: 'Adamantine/Vitreous', crystal: 'Trigonal', color: '#1e40af', formula: 'Al\u2082O\u2083', desc: 'Second hardest natural mineral after diamond. Pure corundum is colorless, but trace impurities create spectacular gemstones: chromium makes ruby (red), iron and titanium make sapphire (blue). Can occur in many other colors too. Extremely durable and resistant to chemical weathering.', uses: 'Gemstones (ruby/sapphire), watch bearings, abrasive (emery), laser rods, sandpaper', funFact: 'Ruby and sapphire are the SAME mineral! The only difference is trace element impurities \u2014 0.01% chromium makes a ruby, while iron+titanium make a sapphire. A "padparadscha" sapphire (pink-orange) is among the rarest gems in the world!', occurrence: 'Metamorphic and igneous rocks. Major ruby deposits in Myanmar, Mozambique. Sapphires from Kashmir, Sri Lanka, Montana (USA), Australia.' },

            { id: 'topaz', label: t('stem.rocks.topaz'), hardness: 8, streak: 'White', luster: 'Vitreous', crystal: 'Orthorhombic', color: '#f97316', formula: 'Al\u2082SiO\u2084(F,OH)\u2082', desc: 'Hard silicate mineral prized as a gemstone. Naturally colorless, yellow, orange, or blue (most blue topaz on the market is heat-treated). Contains fluorine and hydroxyl in its structure. Forms beautiful prismatic crystals with vertical striations. Perfect basal cleavage.', uses: 'Gemstones, Mohs hardness reference (#8), decorative carvings, optical components', funFact: 'The largest uncut topaz crystal ever found (the "El-Dorado Topaz" from Brazil) weighs 6.2 kg (31,000 carats)! Imperial topaz (rare orange-pink variety from Ouro Preto, Brazil) is among the most valuable colored gemstones.', occurrence: 'Granite pegmatites, rhyolite cavities, alluvial deposits. Major sources: Brazil (Minas Gerais), Pakistan, Russia (Ural Mts), Utah (USA).' }

          ];

          // ── Quiz bank ──

          const QUIZ_BANK = [

            { q: 'Which rock type forms from cooled magma?', a: t('stem.rocks.igneous'), options: [t('stem.rocks.igneous'), t('stem.rocks.sedimentary'), t('stem.rocks.metamorphic'), 'Organic'] },

            { q: 'What process turns sediment into sedimentary rock?', a: 'Compaction and cementation', options: ['Compaction and cementation', 'Melting', 'Cooling', 'Erosion'] },

            { q: 'Marble is a metamorphic form of which rock?', a: t('stem.rocks.limestone'), options: [t('stem.rocks.limestone'), t('stem.rocks.sandstone'), t('stem.rocks.granite'), t('stem.rocks.basalt')] },

            { q: 'Which mineral is the hardest on the Mohs scale?', a: t('stem.rocks.diamond'), options: [t('stem.rocks.diamond'), t('stem.rocks.quartz'), t('stem.rocks.corundum'), t('stem.rocks.topaz')] },

            { q: 'What is the softest mineral?', a: t('stem.rocks.talc'), options: [t('stem.rocks.talc'), t('stem.rocks.gypsum'), t('stem.rocks.calcite'), t('stem.rocks.halite')] },

            { q: 'Obsidian forms when lava cools...', a: 'Very quickly', options: ['Very quickly', 'Very slowly', 'Underground', 'Underwater'] },

            { q: 'Which rock can float on water?', a: t('stem.rocks.pumice'), options: [t('stem.rocks.pumice'), t('stem.rocks.basalt'), t('stem.rocks.marble'), t('stem.rocks.granite')] },

            { q: 'What type of rock is shale?', a: t('stem.rocks.sedimentary'), options: [t('stem.rocks.sedimentary'), t('stem.rocks.igneous'), t('stem.rocks.metamorphic'), 'Mineral'] },

            { q: 'Pyrite is also known as...', a: "Fool's gold", options: ["Fool's gold", "White gold", "Rose gold", "Black gold"] },

            { q: 'Which rock shows distinct banding?', a: t('stem.rocks.gneiss'), options: [t('stem.rocks.gneiss'), t('stem.rocks.granite'), t('stem.rocks.basalt'), t('stem.rocks.slate')] },

            { q: 'Limestone fizzes when you add...', a: 'Acid', options: ['Acid', t('stem.chem_balance.water'), 'Salt', 'Oil'] },

            { q: 'Quartzite is metamorphosed...', a: t('stem.rocks.sandstone'), options: [t('stem.rocks.sandstone'), t('stem.rocks.limestone'), t('stem.rocks.shale'), t('stem.rocks.granite')] },

            { q: 'Rhyolite is the extrusive equivalent of...', a: t('stem.rocks.granite'), options: [t('stem.rocks.granite'), t('stem.rocks.basalt'), 'Gabbro', t('stem.rocks.diorite')] },

            { q: 'Which mineral is naturally magnetic?', a: t('stem.rocks.magnetite'), options: [t('stem.rocks.magnetite'), t('stem.rocks.hematite'), t('stem.rocks.pyrite'), t('stem.rocks.galena')] },

            { q: 'Ruby and sapphire are both varieties of...', a: t('stem.rocks.corundum'), options: [t('stem.rocks.corundum'), t('stem.rocks.quartz'), t('stem.rocks.diamond'), t('stem.rocks.topaz')] },

            { q: 'What gives Mars its red color?', a: 'Hematite (iron oxide)', options: ['Hematite (iron oxide)', 'Rust from water', 'Red sand', 'Volcanic dust'] },

            { q: 'The word "fluorescence" comes from which mineral?', a: t('stem.rocks.fluorite'), options: [t('stem.rocks.fluorite'), t('stem.rocks.quartz'), t('stem.rocks.diamond'), t('stem.rocks.calcite')] },

            { q: 'Chalk is made of tiny shells from...', a: 'Microscopic plankton', options: ['Microscopic plankton', 'Snails', 'Clams', 'Coral'] },

            { q: 'Diorite has what distinctive appearance?', a: 'Salt and pepper', options: ['Salt and pepper', 'Solid black', 'Striped', 'Glassy'] },

            { q: 'Which mineral was used in early crystal radios?', a: t('stem.rocks.galena'), options: [t('stem.rocks.galena'), t('stem.rocks.quartz'), t('stem.rocks.diamond'), t('stem.rocks.pyrite')] },

            { q: 'The green beaches of Hawaii are made of...', a: t('stem.rocks.olivine'), options: [t('stem.rocks.olivine'), 'Emerald', 'Jade', 'Green glass'] },

            { q: 'Which building was made from travertine?', a: 'The Colosseum', options: ['The Colosseum', 'The Pyramids', 'Stonehenge', 'Taj Mahal'] },

            { q: 'Schist gets its sparkly appearance from...', a: 'Aligned mica flakes', options: ['Aligned mica flakes', 'Quartz crystals', 'Gold inclusions', 'Diamond dust'] },

            { q: 'What makes quartz watches accurate?', a: 'Piezoelectric effect', options: ['Piezoelectric effect', 'Magnetic field', 'Battery power', 'High density'] },

            { q: 'Where are the largest crystals ever found?', a: 'Naica Mine, Mexico', options: ['Naica Mine, Mexico', 'Mount Everest', 'Grand Canyon', 'Sahara Desert'] },

            { q: 'The word "salary" comes from the Latin word for...', a: 'Salt', options: ['Salt', t('stem.periodic.silver'), t('stem.periodic.gold'), 'Stone'] },

            { q: 'Andesite is named after...', a: 'The Andes Mountains', options: ['The Andes Mountains', 'Andean people', 'A scientist named Ande', 'An ancient city'] },

            { q: 'Tuff is made from consolidated...', a: 'Volcanic ash', options: ['Volcanic ash', 'River sand', 'Coral reef', 'Glacier ice'] },

            { q: 'Which metamorphic rock comes between slate and schist?', a: t('stem.rocks.phyllite'), options: [t('stem.rocks.phyllite'), t('stem.rocks.marble'), t('stem.rocks.gneiss'), t('stem.rocks.quartzite')] },

            { q: 'Garnet crystals commonly have how many sides?', a: '12 (dodecahedral)', options: ['12 (dodecahedral)', '4 (tetrahedral)', '6 (cubic)', '8 (octahedral)'] }

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

            const dpr = window.devicePixelRatio || 1;

            let tick = 0;

            let hoverZone = null;



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

              lavaGrad.addColorStop(0, '#fbbf24');

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



              // ── Mountain (right — metamorphic) ──

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

              mtGrad.addColorStop(0.5, '#6b7280');

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

              tick++;

              drawLandscape();

              animId = requestAnimationFrame(loop);

            }

            animId = requestAnimationFrame(loop);



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



            const ro = new ResizeObserver(function () {

              var newW = canvasEl.offsetWidth * dpr;

              var newH = canvasEl.offsetHeight * dpr;

              if (Math.abs(canvasEl.width - newW) > 1 || Math.abs(canvasEl.height - newH) > 1) {

                canvasEl.width = newW;

                canvasEl.height = newH;

              }

            });

            ro.observe(canvasEl);

            canvasEl._rocksRO = ro;

            canvasEl._rocksCleanup = function () {

              if (animId) cancelAnimationFrame(animId);

              canvasEl.removeEventListener('mousemove', onRockMove);

              canvasEl.removeEventListener('click', onRockClick);

              ro.disconnect();

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

              grad.addColorStop(0, '#1a1a2e');

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

              React.createElement("button", { onClick: function () { setStemLabTool(null); }, className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDEA8 Rocks & Minerals Explorer"),

              React.createElement("div", { className: "flex gap-1 ml-auto" },

                ['landscape', 'rocks', 'minerals', 'quiz'].map(function (m) {

                  return React.createElement("button", { "aria-label": "Change mode",

                    key: m, onClick: function () {

                      upd("mode", m);

                      if (m === 'quiz') { upd("quizMode", true); upd("quizIdx", 0); upd("quizScore", 0); upd("quizFeedback", null); }

                      else { upd("quizMode", false); }

                      if (typeof canvasNarrate === 'function') { canvasNarrate('rocks', 'mode_switch', { first: 'Switched to ' + (m === 'landscape' ? 'Landscape' : m === 'rocks' ? 'Rocks' : m === 'minerals' ? 'Minerals' : 'Quiz') + ' mode.', repeat: (m === 'landscape' ? 'Landscape' : m === 'rocks' ? 'Rocks' : m === 'minerals' ? 'Minerals' : 'Quiz') + ' mode.', terse: m + '.' }, { debounce: 500 }); }

                    }, className: "px-3 py-1 rounded-lg text-xs font-bold capitalize " + (mode === m ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')

                  },

                    m === 'landscape' ? '🗺️ Landscape' : m === 'rocks' ? '🪨 Rocks' : m === 'minerals' ? '💎 Minerals' : '🧠 Quiz');

                })

              )

            ),



            // ── Landscape mode ──

            mode === 'landscape' && React.createElement("div", null,

              React.createElement("p", { className: "text-xs text-slate-600 mb-2 italic" }, "Click landscape zones to explore rock types. Hover to see labels."),

              React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-amber-200", style: { height: '520px' } },

                React.createElement("canvas", {

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

                React.createElement("p", { className: "font-bold text-amber-800 mb-1" }, "🔄 The Rock Cycle"),

                React.createElement("p", null, "Rocks continuously transform: Igneous rocks weather into sediment → Sediment compacts into Sedimentary rocks → Heat & pressure create Metamorphic rocks → Melting creates magma → Cooling forms new Igneous rocks. The cycle never stops!")

              )

            ),



            // ── Rocks mode ──

            mode === 'rocks' && React.createElement("div", null,

              // Type filter

              React.createElement("div", { className: "flex gap-2 mb-3" },

                ['all', 'igneous', 'sedimentary', 'metamorphic'].map(function (t) {

                  return React.createElement("button", { "aria-label": "Change selected type",

                    key: t, onClick: function () { upd("selectedType", t === 'all' ? null : t); },

                    className: "px-3 py-1 rounded-full text-xs font-bold transition-all " +

                      ((d.selectedType || null) === (t === 'all' ? null : t) ? 'text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'),

                    style: (d.selectedType || null) === (t === 'all' ? null : t) ? { background: t === 'all' ? '#78716c' : ROCK_TYPES[t]?.color || '#78716c' } : {}

                  }, t === 'all' ? '📋 All' : (ROCK_TYPES[t]?.icon || '') + ' ' + ROCK_TYPES[t]?.label);

                })

              ),

              // Rock grid

              React.createElement("div", { className: "grid grid-cols-4 gap-2 mb-3" },

                ROCKS.filter(function (r) { return !d.selectedType || r.type === d.selectedType; }).map(function (rock) {

                  const rt = ROCK_TYPES[rock.type];

                  return React.createElement("button", { "aria-label": "Change selected rock",

                    key: rock.id, onClick: function () { upd("selectedRock", d.selectedRock === rock.id ? null : rock.id); upd("selectedMineral", null); },

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

                  React.createElement("canvas", { ref: textureRef, role: "img", "aria-label": "Rock texture close-up", style: { width: '100px', height: '100px', borderRadius: '12px', border: '2px solid #e5e7eb' } }),

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

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, "Mohs Hardness Scale"),

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

                    React.createElement("span", null, "1 (Talc)"),

                    React.createElement("span", null, "10 (Diamond)"))

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

                var streakColors = { 'White': '#f8fafc', 'Greenish-black': '#1a3a1a', 'Black': '#1e1e1e', 'Red-brown': '#8b3a2a', 'Lead-gray': '#6b7280', 'White-yellow': '#fef9c3', 'None (too hard)': '#94a3b8' };

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
                    return React.createElement("button", { "aria-label": "Change selected mineral",
                      key: mineral.id, onClick: function () { upd("selectedMineral", d.selectedMineral === mineral.id ? null : mineral.id); upd("selectedRock", null); },
                      className: "p-2 rounded-lg text-[11px] font-bold border-2 transition-all hover:scale-105 text-center " +
                        (d.selectedMineral === mineral.id ? 'bg-white shadow-lg border-violet-400' : 'bg-slate-50 border-slate-200 hover:border-violet-200'),
                      style: d.selectedMineral === mineral.id ? { borderColor: '#8b5cf6', color: '#6d28d9' } : {}
                    },
                      React.createElement("div", { className: "w-5 h-5 rounded-full mx-auto mb-1 border border-slate-200", style: { background: mineral.color } }),
                      mineral.label);
                  })
                ),

                // Selected mineral detail
                selMineral && React.createElement("div", { className: "bg-white rounded-xl border-2 border-violet-300 p-4 animate-in fade-in space-y-3" },

                React.createElement("h4", { className: "font-bold text-base text-violet-700 mb-1" }, "\uD83D\uDC8E " + selMineral.label),

                React.createElement("p", { className: "text-xs text-slate-600 font-mono mb-1" }, "Formula: " + selMineral.formula),

                // Cross-section canvas

                React.createElement("div", { className: "flex gap-3 items-start" },

                  React.createElement("canvas", { ref: mineralCrossSectionRef, role: "img", "aria-label": "Mineral cross-section", style: { width: '140px', height: '100px', borderRadius: '10px', flexShrink: 0 } }),

                  React.createElement("div", { className: "flex-1 min-w-0" },

                    selMineral.desc && React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, selMineral.desc)

                  )

                ),

                React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                  [

                    { label: t('stem.rocks.hardness'), value: selMineral.hardness + ' / 10', icon: '\uD83D\uDCAA' },

                    { label: t('stem.rocks.streak'), value: selMineral.streak, icon: '\u270F\uFE0F' },

                    { label: t('stem.rocks.luster'), value: selMineral.luster, icon: '\u2728' },

                    { label: 'Crystal System', value: selMineral.crystal, icon: '\uD83D\uDD37' }

                  ].map(function (prop) {

                    return React.createElement("div", { key: prop.label, className: "rounded-lg p-2.5 text-center", style: { background: selMineral.color } },

                      React.createElement("p", { className: "text-[11px] text-slate-600 font-bold" }, prop.icon + " " + prop.label),

                      React.createElement("p", { className: "text-sm font-bold text-slate-800 mt-0.5" }, prop.value));

                  })

                ),

                selMineral.uses && React.createElement("div", { className: "bg-blue-50 rounded-lg p-2.5" },

                  React.createElement("p", { className: "text-[11px] font-bold text-blue-500 uppercase mb-0.5" }, "\uD83C\uDFD7\uFE0F Uses"),

                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, selMineral.uses)

                ),

                selMineral.funFact && React.createElement("div", { className: "bg-amber-50 rounded-lg p-2.5 border border-amber-200" },

                  React.createElement("p", { className: "text-[11px] font-bold text-amber-600 uppercase mb-0.5" }, "\uD83D\uDCA1 Fun Fact"),

                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed italic" }, selMineral.funFact)

                ),

                selMineral.occurrence && React.createElement("div", { className: "bg-emerald-50 rounded-lg p-2.5" },

                  React.createElement("p", { className: "text-[11px] font-bold text-emerald-600 uppercase mb-0.5" }, "\uD83C\uDF0D Where Found"),

                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, selMineral.occurrence)

                ),

                // Mohs bar

                React.createElement("div", { className: "mt-1" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, "Mohs Position"),

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

                    React.createElement("span", null, "1 (Talc)"),

                    React.createElement("span", null, "10 (Diamond)"))

                )

              )

              )

            })(),



            // ── Quiz mode ──

            d.quizMode && quizQ && React.createElement("div", { className: "mt-3 bg-amber-50 rounded-xl border-2 border-amber-200 p-4 animate-in fade-in" },

              React.createElement("div", { className: "flex items-center justify-between mb-2" },

                React.createElement("p", { className: "text-xs font-bold text-amber-700" }, "\uD83E\uDDE0 Question " + ((d.quizIdx || 0) + 1) + "/" + QUIZ_BANK.length),

                React.createElement("span", { className: "font-bold text-green-600 text-xs" }, "\u2714 " + (d.quizScore || 0))

              ),

              React.createElement("p", { className: "text-sm font-bold text-slate-800 mb-3" }, quizQ.q),

              React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                quizQ.options.map(function (opt) {

                  return React.createElement("button", { "aria-label": "Select answer: " + opt,

                    key: opt, onClick: function () {

                      const correct = opt === quizQ.a;

                      upd("quizFeedback", { correct: correct, msg: correct ? "\u2705 Correct! +10 XP" : "\u274C Not quite. The answer is: " + quizQ.a });

                      if (correct) upd("quizScore", (d.quizScore || 0) + 1);

                    }, className: "px-3 py-2 text-xs font-bold rounded-lg border-2 transition-all hover:scale-[1.02] " +

                      (d.quizFeedback ? (opt === quizQ.a ? "border-green-400 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-600") : "border-amber-200 bg-white text-slate-700 hover:border-amber-400")

                  }, opt);

                })

              ),

              d.quizFeedback && React.createElement("div", { className: "mt-2 p-2 rounded-lg text-center text-sm font-bold " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200") },

                d.quizFeedback.msg,

                React.createElement("button", { "aria-label": "Next",

                  onClick: function () {

                    const nextIdx = ((d.quizIdx || 0) + 1) % QUIZ_BANK.length;

                    upd("quizIdx", nextIdx); upd("quizFeedback", null);

                  }, className: "ml-3 px-2 py-0.5 bg-amber-700 text-white rounded text-xs"

                }, "Next \u2192")

              )

            ),



            // Bottom controls

            React.createElement("div", { className: "flex gap-3 mt-3 items-center" },

              React.createElement("button", { "aria-label": "Snapshot",

                onClick: function () {

                  setToolSnapshots(function (prev) { return prev.concat([{ id: 'rk-' + Date.now(), tool: 'rocks', label: t('stem.rocks.rocks') + (selRock ? ': ' + selRock.label : selMineral ? ': ' + selMineral.label : ''), data: Object.assign({}, d), timestamp: Date.now() }]); });

                  addToast('\uD83D\uDCF8 Snapshot saved!', 'success');

                }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-full hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg transition-all"

              }, "\uD83D\uDCF8 Snapshot")

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
    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
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
const d = labToolData.rockCycle;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, rockCycle: { ...prev.rockCycle, [key]: val } }));

          const ROCKS = [

            {

              id: 'igneous', label: t('stem.rocks.igneous'), emoji: '\uD83C\uDF0B', color: '#ef4444', glow: '#fca5a5',

              desc: 'Formed when magma or lava cools and solidifies. Intrusive igneous rocks (granite) cool slowly underground with large crystals. Extrusive rocks (basalt) cool quickly at the surface with fine grains.',

              examples: 'Granite, Basalt, Obsidian, Pumice, Rhyolite, Gabbro',

              hardness: '6\u20137 (Mohs)', crystals: 'Visible in intrusive; microscopic in extrusive',

              uses: 'Countertops (granite), road gravel (basalt), surgical blades (obsidian)',

              funFact: 'Obsidian fractures so cleanly it was used for Stone Age scalpels \u2014 sharper than modern steel!'

            },

            {

              id: 'sedimentary', label: t('stem.rocks.sedimentary'), emoji: '\uD83C\uDFD6\uFE0F', color: '#eab308', glow: '#fde68a',

              desc: 'Formed from layers of sediment (sand, mud, shells, organic matter) compressed and cemented over millions of years. The only rock type that commonly contains fossils, making it essential for paleontology.',

              examples: 'Sandstone, Limestone, Shale, Chalk, Conglomerate, Coal',

              hardness: '3\u20136 (Mohs)', crystals: 'Layered grain structure, not crystalline',

              uses: 'Building stone (sandstone), cement (limestone), energy (coal)',

              funFact: 'The White Cliffs of Dover are chalk \u2014 made from trillions of microscopic coccolithophore shells!'

            },

            {

              id: 'metamorphic', label: t('stem.rocks.metamorphic'), emoji: '\uD83D\uDC8E', color: '#8b5cf6', glow: '#c4b5fd',

              desc: 'Formed when existing rocks are transformed by extreme heat and/or pressure deep underground. The minerals recrystallize without melting, creating new textures and sometimes foliation (layered banding).',

              examples: 'Marble, Slate, Quartzite, Gneiss, Schist, Phyllite',

              hardness: '6\u20138 (Mohs)', crystals: 'Recrystallized; often banded (foliated)',

              uses: 'Sculpture (marble), roofing (slate), decorative stone (gneiss)',

              funFact: 'Michelangelo\'s David is carved from Carrara marble \u2014 metamorphosed limestone from Tuscany!'

            },

          ];

          const PROCESSES = [

            { from: 'igneous', to: 'sedimentary', label: t('stem.rock_cycle.weathering_erosion'), emoji: '\uD83C\uDF2C\uFE0F', desc: 'Wind, water, ice, and biological activity break igneous rocks into sediments. Rivers carry fragments to basins where they settle in layers.' },

            { from: 'sedimentary', to: 'metamorphic', label: t('stem.rock_cycle.heat_pressure'), emoji: '\uD83D\uDD25', desc: 'Deep burial subjects sedimentary rock to intense heat (200\u2013800\u00B0C) and pressure, transforming its mineral structure without melting.' },

            { from: 'metamorphic', to: 'igneous', label: t('stem.rock_cycle.melting_cooling'), emoji: '\uD83C\uDF0B', desc: 'Extreme heat (>800\u00B0C) melts metamorphic rock into magma. When it cools \u2014 slowly underground or quickly at the surface \u2014 new igneous rock forms.' },

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

            var dpr = 2;

            var tick = 0;



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

              tick++;

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

              craterGlow.addColorStop(0, 'rgba(255,100,0,0.6)'); craterGlow.addColorStop(1, 'rgba(255,50,0,0)');

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

              PROCESSES.slice(0, 3).forEach(function (proc, i) {

                var fromN = nodes[proc.from];

                var toN = nodes[proc.to];

                var midX = (fromN.x + toN.x) / 2 + (toN.y - fromN.y) * 0.2;

                var midY = (fromN.y + toN.y) / 2 - (toN.x - fromN.x) * 0.2;

                ctx.beginPath();

                ctx.moveTo(fromN.x * dpr, fromN.y * dpr);

                ctx.quadraticCurveTo(midX * dpr, midY * dpr, toN.x * dpr, toN.y * dpr);

                ctx.strokeStyle = 'rgba(148,163,184,0.4)';

                ctx.lineWidth = 1.5 * dpr;

                ctx.setLineDash([6, 4]);

                ctx.stroke();

                ctx.setLineDash([]);

                var labelX = (fromN.x + midX + toN.x) / 3;

                var labelY = (fromN.y + midY + toN.y) / 3;

                ctx.font = 'bold ' + (6 * dpr) + 'px sans-serif';

                ctx.fillStyle = 'rgba(226,232,240,0.7)';

                ctx.textAlign = 'center';

                ctx.fillText(proc.label, labelX * dpr, labelY * dpr);

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

                  ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.1 * Math.sin(tick * 0.05)) + ')';

                  for (var spi2 = 0; spi2 < 5; spi2++) {

                    var spa = spi2 * 1.3 + tick * 0.003;

                    ctx.beginPath(); ctx.arc(n.x * dpr + Math.cos(spa) * 10 * dpr, n.y * dpr + Math.sin(spa) * 8 * dpr, 1.2 * dpr, 0, Math.PI * 2); ctx.fill();

                  }

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

              canvasEl._rcAnim = requestAnimationFrame(draw);

            }

            canvasEl._rcAnim = requestAnimationFrame(draw);

            canvasEl._rcCleanup = function () { if (canvasEl._rcAnim) cancelAnimationFrame(canvasEl._rcAnim); };



            canvasEl.addEventListener('click', function (e) {

              var rect = canvasEl.getBoundingClientRect();

              var mx = (e.clientX - rect.left) / rect.width * (cW / dpr);

              var my = (e.clientY - rect.top) / rect.height * (cH / dpr);

              ROCKS.forEach(function (rock) {

                var n = nodes[rock.id];

                var dist = Math.sqrt((mx - n.x) * (mx - n.x) + (my - n.y) * (my - n.y));

                if (dist < 40) {

                  canvasEl.dataset.selectedRock = rock.id;

                  upd('selectedRock', rock.id);

                }

              });

            });

          };



          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83E\uDEA8 Rock Cycle"),

              React.createElement("span", { className: "px-2 py-0.5 bg-orange-100 text-orange-700 text-[11px] font-bold rounded-full" }, "ANIMATED")

            ),

            React.createElement("p", { className: "text-xs text-slate-600 mb-2" }, "Click a rock type on the diagram to explore. Watch particles flow through the cycle!"),

            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-amber-400 shadow-lg mb-3", style: { height: "420px" } },

              React.createElement("canvas", { ref: canvasRef, "data-selected-rock": d.selectedRock || '', style: { width: "100%", height: "100%", display: "block", cursor: "pointer" } })

            ),

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },

              ROCKS.map(function (rock) {

                return React.createElement("button", { "aria-label": "Change selected rock",

                  key: rock.id, onClick: function () { upd('selectedRock', rock.id); },

                  className: "px-3 py-2 rounded-lg text-xs font-bold transition-all " + (d.selectedRock === rock.id ? 'text-white shadow-md scale-105' : 'border hover:opacity-80'),

                  style: { backgroundColor: d.selectedRock === rock.id ? rock.color : rock.color + '15', borderColor: rock.color, color: d.selectedRock === rock.id ? 'white' : rock.color }

                }, rock.emoji + " " + rock.label);

              })

            ),

            sel && React.createElement("div", { className: "rounded-xl border-2 p-4 animate-in slide-in-from-bottom-2 shadow-md mb-3", style: { borderColor: sel.color, background: 'linear-gradient(135deg, ' + sel.color + '12, ' + sel.color + '05)' } },

              React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                React.createElement("span", { className: "text-3xl", style: { filter: 'drop-shadow(0 0 8px ' + sel.color + ')' } }, sel.emoji),

                React.createElement("div", null,

                  React.createElement("h4", { className: "text-lg font-black", style: { color: sel.color } }, sel.label + " Rocks"),

                  React.createElement("p", { className: "text-[11px] text-slate-600" }, sel.examples)

                )

              ),

              React.createElement("p", { className: "text-sm text-slate-600 leading-relaxed mb-3" }, sel.desc),

              React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3" },

                React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Hardness"),

                  React.createElement("p", { className: "text-xs font-bold", style: { color: sel.color } }, sel.hardness)

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Crystals"),

                  React.createElement("p", { className: "text-xs font-bold", style: { color: sel.color } }, sel.crystals)

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Real Uses"),

                  React.createElement("p", { className: "text-xs font-bold", style: { color: sel.color } }, sel.uses)

                )

              ),

              React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-200" },

                React.createElement("p", { className: "text-xs text-amber-700 italic" }, "\uD83D\uDCA1 " + sel.funFact)

              )

            ),

            React.createElement("div", { className: "mb-3" },

              React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2" }, "\u2194\uFE0F Transformation Processes"),

              React.createElement("div", { className: "grid grid-cols-3 gap-2" },

                PROCESSES.slice(0, 3).map(function (proc, i) {

                  var isActive = d.selectedProcess && d.selectedProcess.label === proc.label && d.selectedProcess.from === proc.from;

                  return React.createElement("button", { "aria-label": "Change selected process",

                    key: i, onClick: function () { upd('selectedProcess', proc); },

                    className: "p-2 rounded-lg text-left border transition-all " + (isActive ? 'bg-orange-100 border-orange-400 shadow-md' : 'bg-slate-50 border-slate-200 hover:bg-orange-50')

                  },

                    React.createElement("p", { className: "text-sm font-bold " + (isActive ? 'text-orange-700' : 'text-slate-600') }, proc.emoji + " " + proc.label),

                    React.createElement("p", { className: "text-[11px] text-slate-600" }, ROCKS.find(function (r) { return r.id === proc.from; }).label + " \u2192 " + ROCKS.find(function (r) { return r.id === proc.to; }).label)

                  );

                })

              ),

              d.selectedProcess && React.createElement("div", { className: "mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200 animate-in slide-in-from-bottom text-sm text-orange-700" },

                React.createElement("strong", null, d.selectedProcess.emoji + " " + d.selectedProcess.label + ": "), d.selectedProcess.desc

              )

            ),

            React.createElement("div", { className: "border-t border-slate-200 pt-3" },

              React.createElement("button", { "aria-label": "Start rock cycle quiz",

                onClick: function () {

                  var RC_QS = [

                    { q: 'Which rock type forms from cooled magma/lava?', a: t('stem.rocks.igneous'), opts: [t('stem.rocks.igneous'), t('stem.rocks.sedimentary'), t('stem.rocks.metamorphic')] },

                    { q: 'Which rock type often contains fossils?', a: t('stem.rocks.sedimentary'), opts: [t('stem.rocks.igneous'), t('stem.rocks.sedimentary'), t('stem.rocks.metamorphic')] },

                    { q: 'Which rock type forms under heat and pressure?', a: t('stem.rocks.metamorphic'), opts: [t('stem.rocks.igneous'), t('stem.rocks.sedimentary'), t('stem.rocks.metamorphic')] },

                    { q: 'Granite is an example of which rock type?', a: t('stem.rocks.igneous'), opts: [t('stem.rocks.igneous'), t('stem.rocks.sedimentary'), t('stem.rocks.metamorphic')] },

                    { q: 'Marble forms from which rock?', a: 'Limestone (sedimentary)', opts: ['Granite (igneous)', 'Limestone (sedimentary)', 'Basalt (igneous)'] },

                    { q: 'What breaks rocks into sediment?', a: 'Weathering & erosion', opts: ['Heat & pressure', 'Weathering & erosion', 'Melting'] },

                    { q: 'What must happen for metamorphic rock to become igneous?', a: 'It must melt, then cool', opts: ['It must be weathered', 'It must be compressed', 'It must melt, then cool'] },

                    { q: 'What is the Mohs scale used to measure?', a: 'Mineral hardness', opts: ['Rock age', 'Mineral hardness', 'Crystal size'] },

                    { q: 'Which rock is used for countertops?', a: t('stem.rocks.granite'), opts: [t('stem.rocks.sandstone'), t('stem.rocks.granite'), t('stem.rocks.slate')] },

                    { q: 'The White Cliffs of Dover are made of which sedimentary rock?', a: t('stem.rocks.chalk'), opts: [t('stem.rocks.sandstone'), t('stem.rocks.limestone'), t('stem.rocks.chalk')] },

                  ];

                  var q = RC_QS[Math.floor(Math.random() * RC_QS.length)];

                  upd('rcQuiz', { q: q.q, a: q.a, opts: q.opts, answered: false, score: (d.rcQuiz && d.rcQuiz.score) || 0 });

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.rcQuiz ? 'bg-orange-100 text-orange-700' : 'bg-orange-700 text-white') + " transition-all"

              }, d.rcQuiz ? "\uD83D\uDD04 Next Question" : "\uD83E\uDDE0 Quiz Mode"),

              d.rcQuiz && d.rcQuiz.score > 0 && React.createElement("span", { className: "ml-2 text-xs font-bold text-emerald-600" }, "\u2B50 " + d.rcQuiz.score + " correct"),

              d.rcQuiz && React.createElement("div", { className: "mt-2 bg-orange-50 rounded-lg p-3 border border-orange-200" },

                React.createElement("p", { className: "text-sm font-bold text-orange-800 mb-2" }, d.rcQuiz.q),

                React.createElement("div", { className: "grid grid-cols-1 gap-2" },

                  d.rcQuiz.opts.map(function (opt) {

                    var isCorrect = opt === d.rcQuiz.a;

                    var wasChosen = d.rcQuiz.chosen === opt;

                    var cls = !d.rcQuiz.answered ? 'bg-white border-slate-200 hover:border-orange-400' : isCorrect ? 'bg-emerald-100 border-emerald-300' : wasChosen ? 'bg-red-100 border-red-300' : 'bg-slate-50 border-slate-200 opacity-50';

                    return React.createElement("button", { "aria-label": "Select answer: " + opt,

                      key: opt, disabled: d.rcQuiz.answered, onClick: function () {

                        var correct = opt === d.rcQuiz.a;

                        upd('rcQuiz', Object.assign({}, d.rcQuiz, { answered: true, chosen: opt, score: d.rcQuiz.score + (correct ? 1 : 0) }));

                        addToast(correct ? '\u2705 Correct!' : '\u274C The answer is ' + d.rcQuiz.a, correct ? 'success' : 'error');

                      }, className: "px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all " + cls

                    }, opt);

                  })

                )

              )

            ),

            React.createElement("button", { "aria-label": "Snapshot", onClick: () => { setToolSnapshots(prev => [...prev, { id: 'rc-' + Date.now(), tool: 'rockCycle', label: sel ? sel.label : t('stem.tools_menu.rock_cycle'), data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          );
      })();
    }
  });

})();
